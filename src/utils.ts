type SparqlResultBindings = {
  [key: string]: {
    value: string;
    type: string;
  };
};

type VoidDict = {
  // [key: string]: {
  [key: string]: {
    [key: string]: string[];
  };
  // }
};

export type ExampleQuery = {
  comment: string;
  query: string;
};

export async function queryEndpoint(query: string, endpoint: string): Promise<SparqlResultBindings[]> {
  // We add `&ac=1` to all the queries to exclude these queries from stats
  const response = await fetch(`${endpoint}?ac=1&query=${encodeURIComponent(query)}`, {
    signal: AbortSignal.timeout(5000),
    headers: {
      Accept: "application/json",
    },
  });
  // console.log(await response.text());
  const json = await response.json();
  return json.results.bindings;
}

export async function getPrefixes(endpoint: string): Promise<{[key: string]: string}> {
  // Get prefixes from the SPARQL endpoint using SHACL
  const prefixes: {[key: string]: string} = {};
  try {
    const queryResults = await queryEndpoint(
      `PREFIX sh: <http://www.w3.org/ns/shacl#>
      SELECT DISTINCT ?prefix ?namespace
      WHERE { [] sh:namespace ?namespace ; sh:prefix ?prefix}
      ORDER BY ?prefix`,
      endpoint,
    );
    queryResults.forEach(b => {
      prefixes[b.prefix.value] = b.namespace.value;
    });
  } catch (error) {
    console.warn(`Error retrieving Prefixes from ${endpoint}:`, error);
  }
  return prefixes;
}

export async function getVoidDescription(endpoint: string): Promise<[VoidDict, string[], string[]]> {
  // Get VoID description to get classes and properties for advanced autocomplete
  const clsSet = new Set<string>();
  const predSet = new Set<string>();
  const voidDescription: VoidDict = {};
  try {
    const queryResults = await queryEndpoint(
      `PREFIX up: <http://purl.uniprot.org/core/>
      PREFIX void: <http://rdfs.org/ns/void#>
      PREFIX void-ext: <http://ldf.fi/void-ext#>
      SELECT DISTINCT ?subjectClass ?prop ?objectClass ?objectDatatype
      WHERE {
        {
          ?cp void:class ?subjectClass ;
              void:propertyPartition ?pp .
          ?pp void:property ?prop .
          OPTIONAL {
              {
                  ?pp  void:classPartition [ void:class ?objectClass ] .
              } UNION {
                  ?pp void-ext:datatypePartition [ void-ext:datatype ?objectDatatype ] .
              }
          }
        } UNION {
          ?ls void:subjectsTarget ?subjectClass ;
              void:linkPredicate ?prop ;
              void:objectsTarget ?objectClass .
        }
      }`,
      endpoint,
    );
    queryResults.forEach(b => {
      clsSet.add(b.subjectClass.value);
      predSet.add(b.prop.value);
      if (!(b.subjectClass.value in voidDescription)) voidDescription[b.subjectClass.value] = {};
      if (!(b.prop.value in voidDescription[b.subjectClass.value]))
        voidDescription[b.subjectClass.value][b.prop.value] = [];
      if ("objectClass" in b) {
        voidDescription[b.subjectClass.value][b.prop.value].push(b.objectClass.value);
        clsSet.add(b.objectClass.value);
      }
      if ("objectDatatype" in b) voidDescription[b.subjectClass.value][b.prop.value].push(b.objectDatatype.value);
    });
  } catch (error) {
    console.warn(`Error retrieving VoID description from ${endpoint} for autocomplete:`, error);
  }
  return [voidDescription, Array.from(clsSet).sort(), Array.from(predSet).sort()];
}

export async function getExampleQueries(endpoint: string): Promise<ExampleQuery[]> {
  // Retrieve example queries from the SPARQL endpoint
  const exampleQueries: ExampleQuery[] = [];
  try {
    const queryResults = await queryEndpoint(
      `PREFIX sh: <http://www.w3.org/ns/shacl#>
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
      SELECT DISTINCT ?sq ?comment ?query
      WHERE {
        ?sq a sh:SPARQLExecutable ;
          rdfs:comment ?comment ;
          sh:select|sh:ask|sh:construct|sh:describe ?query .
      } ORDER BY ?sq`,
      endpoint,
    );
    queryResults.forEach(b => {
      exampleQueries.push({comment: b.comment.value, query: b.query.value});
    });
    // console.log(queryResults);
  } catch (error) {
    console.warn(`Error fetching or processing example queries from ${endpoint}:`, error);
  }
  return exampleQueries;
}

export function extractAllSubjectsAndTypes(query: string): Map<string, Set<string>> {
  // Extract all subjects and their types from a SPARQL query in the process of being written
  const subjectTypeMap = new Map<string, Set<string>>();
  // Remove comments and string literals, and prefixes lines to avoid false matches
  const cleanQuery = query
    .replace(/^#.*$/gm, "")
    .replace(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/^PREFIX\s+.*$/gim, "")
    .replace(/;\s*\n/g, "; ") // Put all triple patterns on a single line
    .replace(/;\s*$/g, "; ");
  // console.log(cleanQuery)
  const typePattern =
    /\s*(\?\w+|<[^>]+>|\w+:\w*).*?\s+(?:a|rdf:type|<http:\/\/www\.w3\.org\/1999\/02\/22-rdf-syntax-ns#type>)\s+([^\s.]+(?:\s*,\s*[^\s.]+)*)\s*(?:;|\.)/g;
  let match;
  while ((match = typePattern.exec(cleanQuery)) !== null) {
    const subject = match[1];
    const types = match[2].split(/\s*,\s*/); // Split types separated by commas
    if (!subjectTypeMap.has(subject)) {
      subjectTypeMap.set(subject, new Set());
    }
    const subjectTypes = subjectTypeMap.get(subject)!;
    types.forEach(type => subjectTypes.add(type));
  }
  return subjectTypeMap;
}

export function getSubjectForCursorPosition(query: string, lineNumber: number, charNumber: number): string | null {
  // Extract the subject relevant to the cursor position from a SPARQL query
  const lines = query.split("\n");
  const currentLine = lines[lineNumber];
  // Extract the part of the line up to the cursor position
  const partOfLine = currentLine.slice(0, charNumber);
  const partialQuery = lines.slice(0, lineNumber).join("\n") + "\n" + partOfLine;
  // Put all triple patterns on a single line
  const cleanQuery = partialQuery.replace(/;\s*\n/g, "; ").replace(/;\s*$/g, "; ");
  const partialLines = cleanQuery.split("\n");
  const lastLine = partialLines[partialLines.length - 1];
  const subjectMatch = lastLine.match(/\s*([?\w]+|<[^>]+>|\w+:\w*)\s+/);
  if (subjectMatch) {
    return subjectMatch[1];
  }
  return null;
}

export type EndpointsMetadata = {
  // Endpoint URL
  [key: string]: {
    void: VoidDict;
    classes: string[];
    predicates: string[];
    prefixes: {[key: string]: string};
    examples: ExampleQuery[];
    retrievedAt?: string;
  };
};

type VoidDict = {
  // Subject class
  [key: string]: {
    [key: string]: string[]; // Predicate: object classes/datatypes
  };
};

type SparqlResultBindings = {
  [key: string]: {
    value: string;
    type: string;
  };
};

type ExampleQuery = {
  comment: string;
  query: string;
};

// Replace the longest prefix in a URI with its corresponding prefix
export function compressUri(prefixes: {[key: string]: string}, uri: string): string | null {
  let longestPrefix = "";
  for (const prefix in prefixes) {
    if (uri.startsWith(prefixes[prefix]) && prefix.length > longestPrefix.length) {
      longestPrefix = prefix;
    }
  }
  if (longestPrefix === "") return null;
  return uri.replace(prefixes[longestPrefix], longestPrefix + ":");
}

export async function queryEndpoint(query: string, endpoint: string): Promise<SparqlResultBindings[]> {
  // We add `ac=1&` to all the queries to exclude these queries from stats of SIB endpoints
  const response = await fetch(`${endpoint}?ac=1&query=${encodeURIComponent(query)}`, {
    signal: AbortSignal.timeout(5000),
    headers: {
      Accept: "application/sparql-results+json",
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

const virtuosoNamespace = "http://www.openlinksw.com/schemas/virtrdf#";
// If no VoID description found we just get the list of classes
export async function getClassesFallback(endpoint: string) {
  try {
    const queryResults = await queryEndpoint(
      `SELECT DISTINCT ?cls
      WHERE { [] a ?cls . }`,
      endpoint,
    );
    return queryResults.filter(b => !b.cls.value.startsWith(virtuosoNamespace)).map(b => b.cls.value);
  } catch (error) {
    console.warn(`Error retrieving classes from ${endpoint} for autocomplete:`, error);
  }
  return [];
}

// If no VoID description found we just get the list of predicates
export async function getPredicatesFallback(endpoint: string) {
  try {
    const queryResults = await queryEndpoint(
      `SELECT DISTINCT ?pred
      WHERE { [] ?pred [] . }`,
      endpoint,
    );
    // Filter out the Virtuoso-specific predicates
    return queryResults.filter(b => !b.pred.value.startsWith(virtuosoNamespace)).map(b => b.pred.value);
  } catch (error) {
    console.warn(`Error retrieving predicates from ${endpoint} for autocomplete:`, error);
  }
  return ["http://www.w3.org/1999/02/22-rdf-syntax-ns#type", "http://www.w3.org/2000/01/rdf-schema#label"];
}

// Retrieve example queries from the SPARQL endpoint
export async function getExampleQueries(endpoint: string): Promise<ExampleQuery[]> {
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

// Extract all subjects and their types from a SPARQL query in the process of being written
export function extractAllSubjectsAndTypes(query: string): Map<string, Set<string>> {
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

// Extract the subject relevant to the cursor position from a SPARQL query
export function getSubjectForCursorPosition(query: string, lineNumber: number, charNumber: number): string | null {
  const lines = query.split("\n");
  // Extract the part of the line up to the cursor position
  const partOfLine = lines[lineNumber].slice(0, charNumber);
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

export function getServiceUriForCursorPosition(query: string, lineNumber: number, charNumber: number): string | null {
  const lines = query.split("\n");
  const partOfLine = lines[lineNumber].slice(0, charNumber);
  const partialQuery = lines.slice(0, lineNumber).join("\n") + "\n" + partOfLine;
  const serviceRegex = /SERVICE\s+<([^>]+)>\s*{/gi;
  let match;
  // Iterate through all SERVICE blocks in the query
  while ((match = serviceRegex.exec(query)) !== null) {
    const serviceUri = match[1];
    const serviceStart = match.index + match[0].length - 1; // Start of the opening brace '{'
    // Find the matching closing brace accounting for nested braces
    let braceDepth = 1;
    let serviceEnd = serviceStart;
    for (let i = serviceStart + 1; i < query.length; i++) {
      if (query[i] === "{") {
        braceDepth++;
      } else if (query[i] === "}") {
        braceDepth--;
        if (braceDepth === 0) {
          serviceEnd = i;
          break;
        }
      }
    }
    // Check if cursor is inside this SERVICE block
    const cursorPosition = partialQuery.length;
    if (cursorPosition >= serviceStart && cursorPosition <= serviceEnd) {
      return serviceUri;
    }
  }
  return null;
}

// Automatically generates a tab label from a query description by removing small words and stopwords
export function generateTabLabel(description: string): string {
  // const stopwords = ['all', 'with', 'and', 'the', 'on', 'of', 'in', 'for', 'a', 'an', 'entries', 'annotated'];
  const ignoreStopwords = [
    "select",
    "that",
    "with",
    "entries",
    "annotated",
    "were",
    "triples",
    "relate",
    "entry",
    "each",
    "using",
    "where",
    "find",
    "list",
    "sometimes",
    "known",
    "their",
    "them",
    "from",
    "these",
  ];
  // Remove HTML tags and parenthesis
  const words = description
    .replace(/<\/?[^>]+(>|$)/g, "")
    .replace(/[(),]/gm, "")
    .split(" ");
  const filteredWords = words.filter(word => !ignoreStopwords.includes(word.toLowerCase()) && word.length > 3);
  const label = filteredWords.slice(0, 3).join(" ");
  const capitalizedLabel = label
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
  return capitalizedLabel;
}

// NOTE: In case we need to store the counts
// type VoidDict2 = {
//   // Subject class
//   [key: string]: {
//     count?: number;
//     predicates: {
//       [key: string]: {
//         count?: number;
//         objectClasses: {
//           [key: string]: number | null;
//         };
//       }
//     }
//   };
// };

// Initialize prefixes with some defaults?
export const defaultPrefixes = {
  rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
  rdfs: "http://www.w3.org/2000/01/rdf-schema#",
  xsd: "http://www.w3.org/2001/XMLSchema#",
  owl: "http://www.w3.org/2002/07/owl#",
  skos: "http://www.w3.org/2004/02/skos/core#",
  foaf: "http://xmlns.com/foaf/0.1/",
  up: "http://purl.uniprot.org/core/",
  keywords: "http://purl.uniprot.org/keywords/",
  uniprotkb: "http://purl.uniprot.org/uniprot/",
  taxon: "http://purl.uniprot.org/taxonomy/",
  ec: "http://purl.uniprot.org/enzyme/",
  bibo: "http://purl.org/ontology/bibo/",
  dc: "http://purl.org/dc/elements/1.1/",
  dct: "http://purl.org/dc/terms/",
  obo: "http://purl.obolibrary.org/obo/",
  faldo: "http://biohackathon.org/resource/faldo#",
  sio: "http://semanticscience.org/resource/",
  sd: "http://www.w3.org/ns/sparql-service-description#",
};

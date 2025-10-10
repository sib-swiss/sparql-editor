import {QueryEngine} from "@comunica/query-sparql";

export type EndpointsMetadata = {
  // Endpoint URL
  [key: string]: {
    void: VoidDict;
    voidQueryBindings: SparqlResultBindings[];
    // clsPredInfos: {[key: string]: ClsPredInfo};
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

/** Results of SPARQL SELECT query */
type SparqlResultBindings = {
  [key: string]: {
    value: string;
    type: string;
  };
};

type ExampleQuery = {
  comment: string;
  query: string;
  index: number;
  iri: string;
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

/** Query the SPARQL endpoint and return the results as an array of bindings.
 *
 * @param query
 * @param endpoint
 */
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

const sparqlEngine = new QueryEngine();

/** Query the SPARQL endpoint or service description for metadata and return the results as an array of bindings.
 *
 * @param query
 * @param endpoint
 */
export async function queryEndpointMeta(query: string, endpoint: string): Promise<SparqlResultBindings[]> {
  try {
    let queryResults = await queryEndpoint(query, endpoint);
    if (queryResults.length > 0) return queryResults;
    // If we're getting an example query (checking if the query contains specific patterns)
    // if (query.includes("sh:SPARQLExecutable") && query.includes("sh:select|sh:ask|sh:construct|sh:describe")) {
    //   console.log("Example query detected, skipping service description query");
    //   return []; // Return empty results rather than attempting service description query
    // }

    // If no results from SPARQL endpoint we try to retrieve from the service description
    // const sparqlEngine = new QueryEngine();
    queryResults = [];
    // console.log("queryEndpointMeta", query, endpoint);

    const abortController = new AbortController();
    const timeout = setTimeout(() => {
      abortController.abort("Timeout querying service description");
    }, 5000); // 5 second timeout for service description query

    try {
      // NOTE: hackity hack to temporarily use a custom VoID description for UniProt
      if (endpoint.startsWith("https://sparql.uniprot.org/")) {
        endpoint =
          "https://raw.githubusercontent.com/sib-swiss/sparql-llm/refs/heads/main/src/sparql-llm/tests/void_uniprot.ttl";
      }
      const result = await sparqlEngine.query(query, {
        sources: [
          // Directly query the service description:
          {type: "file", value: endpoint},
        ],
        signal: abortController.signal,
      });

      // Convert comunica bindings to the same format as fetched SPARQL results
      if (result.resultType === "bindings") {
        const variables = (await result.metadata()).variables;
        for await (const bindings of await result.execute()) {
          const b: any = {};
          for (const variable of variables) {
            if (bindings.get(variable.value)) b[variable.value] = bindings.get(variable.value);
          }
          queryResults.push(b);
        }
      }
    } catch (error: any) {
      console.log(`Error querying service description for ${endpoint}`, error.message || error);
    } finally {
      clearTimeout(timeout);
    }
    return queryResults;
  } catch (error: any) {
    console.log(`Error querying SPARQL endpoint ${endpoint}:`, error.message || error);
  }
  return [];
}

export async function getPrefixes(endpoint: string): Promise<{[key: string]: string}> {
  // Get prefixes from the SPARQL endpoint using SHACL
  const prefixes: {[key: string]: string} = {};
  try {
    const queryResults = await queryEndpointMeta(
      `PREFIX sh: <http://www.w3.org/ns/shacl#>
      SELECT DISTINCT ?prefix ?namespace
      WHERE { [] sh:namespace ?namespace ; sh:prefix ?prefix}
      ORDER BY ?prefix`,
      endpoint,
    );
    queryResults.forEach(b => {
      prefixes[b.prefix.value] = b.namespace.value;
    });
  } catch (error: any) {
    console.log(`Error retrieving Prefixes from ${endpoint}:`, error.message || error);
  }
  return prefixes;
}

// const voidQuery = `PREFIX up: <http://purl.uniprot.org/core/>
// PREFIX void: <http://rdfs.org/ns/void#>
// PREFIX void-ext: <http://ldf.fi/void-ext#>
// SELECT DISTINCT ?subjectClass ?prop ?objectClass ?objectDatatype
// WHERE {
//   {
//     ?cp void:class ?subjectClass ;
//         void:propertyPartition ?pp .
//     ?pp void:property ?prop .
//     OPTIONAL {
//         {
//             ?pp  void:classPartition [ void:class ?objectClass ] .
//         } UNION {
//             ?pp void-ext:datatypePartition [ void-ext:datatype ?objectDatatype ] .
//         }
//     }
//   } UNION {
//     ?ls void:subjectsTarget [ void:class ?subjectClass ] ;
//         void:linkPredicate ?prop ;
//         void:objectsTarget [ void:class ?objectClass ] .
//   }
// }`;

export const voidQuery = `PREFIX owl: <http://www.w3.org/2002/07/owl#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX sh:<http://www.w3.org/ns/shacl#>
PREFIX sd:<http://www.w3.org/ns/sparql-service-description#>
PREFIX void:<http://rdfs.org/ns/void#>
PREFIX void-ext:<http://ldf.fi/void-ext#>
SELECT DISTINCT ?graph ?graphLabel ?subjectClass ?prop ?objectClass ?objectDatatype
?triples ?subjectClassLabel ?objectClassLabel ?subjectClassComment ?objectClassComment ?propLabel ?propComment
WHERE {
      {
        OPTIONAL {
          ?graph sd:graph ?graphDesc .
          OPTIONAL { ?graph rdfs:label ?graphLabel }
          ?graphDesc void:classPartition ?cp .
        }
        ?cp void:class ?subjectClass ;
          void:propertyPartition ?pp .
        OPTIONAL { ?subjectClass rdfs:label ?subjectClassLabel }
        OPTIONAL { ?subjectClass rdfs:comment ?subjectClassComment }

        ?pp void:property ?prop .
        OPTIONAL { ?pp void:triples ?triples }
        OPTIONAL { ?prop rdfs:label ?propLabel }
        OPTIONAL { ?prop rdfs:comment ?propComment }
        OPTIONAL {
          {
            ?pp  void:classPartition [ void:class ?objectClass ] .
            OPTIONAL { ?objectClass rdfs:label ?objectClassLabel }
            OPTIONAL { ?objectClass rdfs:comment ?objectClassComment }
          } UNION {
            ?pp void-ext:datatypePartition [ void-ext:datatype ?objectDatatype ] .
          }
        }
      } UNION {
        ?linkset void:subjectsTarget [ void:class ?subjectClass ] ;
          void:linkPredicate ?prop ;
          void:objectsTarget [ void:class ?objectClass ] .
      }
} ORDER BY ?subjectClass ?objectClass ?objectDatatype ?graph ?triples`;

/** Get VoID description to get classes and properties for advanced autocomplete */
export async function getVoidDescription(
  endpoint: string,
): Promise<[VoidDict, SparqlResultBindings[], string[], string[]]> {
  const clsSet = new Set<string>();
  const predSet = new Set<string>();
  const voidDescription: VoidDict = {};
  try {
    const queryResults = await queryEndpointMeta(voidQuery, endpoint);
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
    return [voidDescription, queryResults, Array.from(clsSet).sort(), Array.from(predSet).sort()];
  } catch (error: any) {
    console.log(`Error retrieving VoID description from ${endpoint} for autocomplete:`, error.message || error);
  }
  return [voidDescription, [], Array.from(clsSet).sort(), Array.from(predSet).sort()];
}

const virtuosoNamespace = "http://www.openlinksw.com/schemas/virtrdf#";
// If no VoID description found we just get the list of classes
export async function getClassesFallback(endpoint: string) {
  try {
    const queryResults = await queryEndpoint(`SELECT DISTINCT ?cls WHERE { [] a ?cls . }`, endpoint);
    return queryResults.filter(b => !b.cls.value.startsWith(virtuosoNamespace)).map(b => b.cls.value);
  } catch (error: any) {
    console.log(`Error retrieving classes from ${endpoint} for autocomplete:`, error.message || error);
  }
  return [];
}

// If no VoID description found we just get the list of predicates
export async function getPredicatesFallback(endpoint: string) {
  try {
    const queryResults = await queryEndpoint(`SELECT DISTINCT ?pred WHERE { [] ?pred [] . }`, endpoint);
    // Filter out the Virtuoso-specific predicates
    return queryResults.filter(b => !b.pred.value.startsWith(virtuosoNamespace)).map(b => b.pred.value);
  } catch (error: any) {
    console.log(`Error retrieving predicates from ${endpoint} for autocomplete:`, error.message || error);
  }
  return ["http://www.w3.org/1999/02/22-rdf-syntax-ns#type", "http://www.w3.org/2000/01/rdf-schema#label"];
}

const DEFAULT_QUERY_GET_EXAMPLES = `PREFIX sh: <http://www.w3.org/ns/shacl#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
SELECT DISTINCT ?sq ?comment ?query
WHERE {
  ?sq a sh:SPARQLExecutable ;
    rdfs:comment ?comment ;
    sh:select|sh:ask|sh:construct|sh:describe ?query .
} ORDER BY ?sq`;

// Retrieve example queries from the SPARQL endpoint
export async function getExampleQueries(
  endpoint: string,
  queryToGetExamples: string = DEFAULT_QUERY_GET_EXAMPLES,
): Promise<ExampleQuery[]> {
  const exampleQueries: ExampleQuery[] = [];
  try {
    const queryResults = await queryEndpointMeta(endpoint, queryToGetExamples);
    queryResults.forEach((b, index) => {
      exampleQueries.push({comment: b.comment.value, query: b.query.value, index: index + 1, iri: b.sq.value});
    });
  } catch (error: any) {
    console.log(`Error fetching or processing example queries from ${endpoint}:`, error.message || error);
  }
  return exampleQueries;
}

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

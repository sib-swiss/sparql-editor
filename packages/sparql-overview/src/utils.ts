import {DEFAULT_EDGE_CURVATURE} from "@sigma/edge-curve";

export type EndpointsMetadata = {
  // Endpoint URL
  [key: string]: {
    void: VoidDict;
    classes: string[];
    predicates: string[];
    prefixes: {[key: string]: string};
    retrievedAt?: Date;
  };
};

type VoidDict = {
  // Subject class
  [key: string]: {
    [key: string]: string[]; // Predicate: object classes/datatypes
  };
};

export type SparqlResultBindings = {
  [key: string]: {
    value: string;
    type: string;
  };
};

// Replace the longest prefix in a URI with its corresponding prefix
export function compressUri(prefixes: {[key: string]: string}, uri: string): string {
  let longestPrefix = "";
  for (const prefix in prefixes) {
    if (uri.startsWith(prefixes[prefix]) && prefix.length > longestPrefix.length) {
      longestPrefix = prefix;
    }
  }
  if (longestPrefix === "") return uri;
  return uri.replace(prefixes[longestPrefix], longestPrefix + ":");
}

export async function queryEndpoint(query: string, endpoint: string): Promise<SparqlResultBindings[]> {
  // We add `&ac=1` to all the queries to exclude these queries from stats
  const response = await fetch(`${endpoint}?ac=1&query=${encodeURIComponent(query)}`, {
    signal: AbortSignal.timeout(12000),
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
          ?ls void:subjectsTarget [ void:class ?subjectClass ] ;
              void:linkPredicate ?prop ;
              void:objectsTarget [ void:class ?objectClass ] .
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

export function getEdgeCurvature(index: number, maxIndex: number): number {
  if (maxIndex <= 0) throw new Error("Invalid maxIndex");
  if (index < 0) return -getEdgeCurvature(-index, maxIndex);
  const amplitude = 3.5;
  const maxCurvature = amplitude * (1 - Math.exp(-maxIndex / amplitude)) * DEFAULT_EDGE_CURVATURE;
  return (maxCurvature * index) / maxIndex;
}

// // Initialize prefixes with some defaults?
// this.prefixes = new Map([
//   ["rdf", "http://www.w3.org/1999/02/22-rdf-syntax-ns#"],
//   ["rdfs", "http://www.w3.org/2000/01/rdf-schema#"],
//   ["xsd", "http://www.w3.org/2001/XMLSchema#"],
//   ["owl", "http://www.w3.org/2002/07/owl#"],
//   ["skos", "http://www.w3.org/2004/02/skos/core#"],
//   ["up", "http://purl.uniprot.org/core/"],
//   ["keywords", "http://purl.uniprot.org/keywords/"],
//   ["uniprotkb", "http://purl.uniprot.org/uniprot/"],
//   ["taxon", "http://purl.uniprot.org/taxonomy/"],
//   ["ec", "http://purl.uniprot.org/enzyme/"],
//   ["bibo", "http://purl.org/ontology/bibo/"],
//   ["dc", "http://purl.org/dc/terms/"],
//   ["faldo", "http://biohackathon.org/resource/faldo#"],
// ]);

export const voidQuery = `PREFIX owl: <http://www.w3.org/2002/07/owl#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX sh:<http://www.w3.org/ns/shacl#>
PREFIX sd:<http://www.w3.org/ns/sparql-service-description#>
PREFIX void:<http://rdfs.org/ns/void#>
PREFIX void-ext:<http://ldf.fi/void-ext#>
SELECT DISTINCT ?subjectClass ?prop ?objectClass ?objectDatatype ?triples
?objectClassTopParent ?objectClassTopParentLabel ?subjectClassTopParent ?subjectClassTopParentLabel
?subjectClassLabel ?objectClassLabel ?subjectClassComment ?objectClassComment ?propLabel ?propComment
WHERE {
  {
    SELECT * WHERE {
      {
        ?s sd:graph ?graph .
        ?graph void:classPartition ?cp .
        ?cp void:class ?subjectClass ;
          void:propertyPartition ?pp .
        OPTIONAL {?subjectClass rdfs:label ?subjectClassLabel }
        OPTIONAL {?subjectClass rdfs:comment ?subjectClassComment }
        OPTIONAL {
          ?subjectClass rdfs:subClassOf* ?subjectClassTopParent .
          OPTIONAL {?subjectClassTopParent rdfs:label ?subjectClassTopParentLabel}
          FILTER(isIRI(?subjectClassTopParent) && ?subjectClassTopParent != owl:Thing && ?subjectClassTopParent != owl:Class)
          MINUS {
            ?subjectClassTopParent rdfs:subClassOf ?intermediateParent .
            FILTER(?intermediateParent != owl:Thing && ?intermediateParent != owl:Class)
          }
        }

        ?pp void:property ?prop ;
          void:triples ?triples .
        OPTIONAL {?prop rdfs:label ?propLabel }
        OPTIONAL {?prop rdfs:comment ?propComment }
        OPTIONAL {
          {
            ?pp  void:classPartition [ void:class ?objectClass ] .
            OPTIONAL {?objectClass rdfs:label ?objectClassLabel }
            OPTIONAL {?objectClass rdfs:comment ?objectClassComment }
            OPTIONAL {
              ?objectClass rdfs:subClassOf* ?objectClassTopParent .
              OPTIONAL {?objectClassTopParent rdfs:label ?objectClassTopParentLabel}
              FILTER(isIRI(?objectClassTopParent) && ?objectClassTopParent != owl:Thing && ?objectClassTopParent != owl:Class)
              MINUS {
                ?objectClassTopParent rdfs:subClassOf ?intermediateParent .
                FILTER(?intermediateParent != owl:Thing && ?intermediateParent != owl:Class)
              }
            }
          } UNION {
            ?pp void-ext:datatypePartition [ void-ext:datatype ?objectDatatype ] .
          }
        }
      } UNION {
        ?linkset void:subjectsTarget [ void:class ?subjectClass ] ;
          void:linkPredicate ?prop ;
          void:objectsTarget [ void:class ?objectClass ] .
      }

    }
  }
} ORDER BY ?subjectClass ?objectClass ?objectDatatype ?graph ?triples`;

// export const voidQuery = `PREFIX owl: <http://www.w3.org/2002/07/owl#>
// PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
// PREFIX sh:<http://www.w3.org/ns/shacl#>
// PREFIX sd:<http://www.w3.org/ns/sparql-service-description#>
// PREFIX void:<http://rdfs.org/ns/void#>
// PREFIX void-ext:<http://ldf.fi/void-ext#>
// SELECT DISTINCT ?subjectClass ?prop ?objectClass ?objectDatatype ?triples
// ?objectClassTopParent ?objectClassTopParentLabel ?subjectClassTopParent ?subjectClassTopParentLabel
// ?subjectClassLabel ?objectClassLabel ?subjectClassComment ?objectClassComment ?propLabel ?propComment
// WHERE {
//   {
//     SELECT * WHERE {
//       {
//         ?s sd:graph ?graph .
//         ?graph void:classPartition ?cp .
//         ?cp void:class ?subjectClass ;
//           void:propertyPartition ?pp .
//         OPTIONAL {?subjectClass rdfs:label ?subjectClassLabel }
//         OPTIONAL {?subjectClass rdfs:comment ?subjectClassComment }
//         OPTIONAL {
//           ?subjectClass rdfs:subClassOf ?subjectClassTopParent .
//           OPTIONAL {?subjectClassTopParent rdfs:label ?subjectClassTopParentLabel}
// #          FILTER(isIRI(?subjectClassTopParent) && ?subjectClassTopParent != owl:Thing && ?subjectClassTopParent != owl:Class)
// #          MINUS {
// #            ?subjectClassTopParent rdfs:subClassOf ?intermediateParent .
// #            FILTER(?intermediateParent != owl:Thing && ?intermediateParent != owl:Class)
// #          }
//         }

//         ?pp void:property ?prop ;
//           void:triples ?triples .
//         OPTIONAL {?prop rdfs:label ?propLabel }
//         OPTIONAL {?prop rdfs:comment ?propComment }
//         OPTIONAL {
//           {
//             ?pp  void:classPartition [ void:class ?objectClass ] .
//             OPTIONAL {?objectClass rdfs:label ?objectClassLabel }
//             OPTIONAL {?objectClass rdfs:comment ?objectClassComment }
//             OPTIONAL {
//               ?objectClass rdfs:subClassOf ?objectClassTopParent .
//               OPTIONAL {?objectClassTopParent rdfs:label ?objectClassTopParentLabel}
// #              FILTER(isIRI(?objectClassTopParent) && ?objectClassTopParent != owl:Thing && ?objectClassTopParent != owl:Class)
// #              MINUS {
// #                ?objectClassTopParent rdfs:subClassOf ?intermediateParent .
// #                FILTER(?intermediateParent != owl:Thing && ?intermediateParent != owl:Class)
// #              }
//             }
//           } UNION {
//             ?pp void-ext:datatypePartition [ void-ext:datatype ?objectDatatype ] .
//           }
//         }
//       } UNION {
//         ?linkset void:subjectsTarget [ void:class ?subjectClass ] ;
//           void:linkPredicate ?prop ;
//           void:objectsTarget [ void:class ?objectClass ] .
//       }

//     }
//   }
// } ORDER BY ?subjectClass ?objectClass ?objectDatatype ?graph ?triples`

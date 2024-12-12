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

// export function generateShade(baseColor, clusterId) {
//   // Convert HEX to HSL
//   const [h, s, l] = hexToHSL(baseColor);
//   const hash = parseInt(clusterId, 36) % 100; // Create a hash for consistent variations
//   const lightness = Math.max(30, Math.min(80, l + (hash % 20 - 10))); // Adjust lightness
//   return hslToHex(h, s, lightness);
// }

//   /**
//    * Convert HEX color to HSL.
//    * @param {string} hex - HEX color.
//    * @returns {Array} - HSL components.
//    */
//   function hexToHSL(hex: string) {
//     const r = parseInt(hex.slice(1, 3), 16) / 255;
//     const g = parseInt(hex.slice(3, 5), 16) / 255;
//     const b = parseInt(hex.slice(5, 7), 16) / 255;
//     const max = Math.max(r, g, b);
//     const min = Math.min(r, g, b);
//     let h, s, l = (max + min) / 2;
//     if (max === min) {
//       h = s = 0; // achromatic
//     } else {
//       const d = max - min;
//       s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
//       switch (max) {
//         case r: h = (g - b) / d + (g < b ? 6 : 0); break;
//         case g: h = (b - r) / d + 2; break;
//         case b: h = (r - g) / d + 4; break;
//       }
//       h /= 6;
//     }
//     return [h * 360, s * 100, l * 100];
//   }

//   /**
//    * Convert HSL color to HEX.
//    * @param {number} h - Hue (0-360).
//    * @param {number} s - Saturation (0-100).
//    * @param {number} l - Lightness (0-100).
//    * @returns {string} - HEX color.
//    */
//   function hslToHex(h: number, s: number, l: number) {
//     s /= 100;
//     l /= 100;
//     const k = n => (n + h / 30) % 12;
//     const a = s * Math.min(l, 1 - l);
//     const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
//     const rgb = [f(0), f(8), f(4)].map(x => Math.round(x * 255));
//     return `#${rgb.map(x => x.toString(16).padStart(2, "0")).join("")}`;
//   }

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

const metadataNamespaces = [
  "http://www.w3.org/ns/shacl#",
  "http://www.w3.org/2002/07/owl#",
  "http://www.w3.org/2000/01/rdf-schema#",
  "http://www.w3.org/ns/sparql-service-description#",
  "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
  "http://rdfs.org/ns/void#",
  "http://purl.org/query/voidext#",
  "http://purl.org/query/bioquery#",
];
export function isMetadataNode(node: string) {
  if (!node) return false;
  if (node === "http://www.w3.org/1999/02/22-rdf-syntax-ns#Statement") return false;
  return metadataNamespaces.some(namespace => node.startsWith(namespace));
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

// export async function getVoidDescription(endpoint: string): Promise<[VoidDict, string[], string[]]> {
//   // Get VoID description to get classes and properties for advanced autocomplete
//   const clsSet = new Set<string>();
//   const predSet = new Set<string>();
//   const voidDescription: VoidDict = {};
//   try {
//     const queryResults = await queryEndpoint(
//       `PREFIX up: <http://purl.uniprot.org/core/>
//       PREFIX void: <http://rdfs.org/ns/void#>
//       PREFIX void-ext: <http://ldf.fi/void-ext#>
//       SELECT DISTINCT ?subjectClass ?prop ?objectClass ?objectDatatype
//       WHERE {
//         {
//           ?cp void:class ?subjectClass ;
//               void:propertyPartition ?pp .
//           ?pp void:property ?prop .
//           OPTIONAL {
//               {
//                   ?pp  void:classPartition [ void:class ?objectClass ] .
//               } UNION {
//                   ?pp void-ext:datatypePartition [ void-ext:datatype ?objectDatatype ] .
//               }
//           }
//         } UNION {
//           ?ls void:subjectsTarget [ void:class ?subjectClass ] ;
//               void:linkPredicate ?prop ;
//               void:objectsTarget [ void:class ?objectClass ] .
//         }
//       }`,
//       endpoint,
//     );
//     queryResults.forEach(b => {
//       clsSet.add(b.subjectClass.value);
//       predSet.add(b.prop.value);
//       if (!(b.subjectClass.value in voidDescription)) voidDescription[b.subjectClass.value] = {};
//       if (!(b.prop.value in voidDescription[b.subjectClass.value]))
//         voidDescription[b.subjectClass.value][b.prop.value] = [];
//       if ("objectClass" in b) {
//         voidDescription[b.subjectClass.value][b.prop.value].push(b.objectClass.value);
//         clsSet.add(b.objectClass.value);
//       }
//       if ("objectDatatype" in b) voidDescription[b.subjectClass.value][b.prop.value].push(b.objectDatatype.value);
//     });
//   } catch (error) {
//     console.warn(`Error retrieving VoID description from ${endpoint} for autocomplete:`, error);
//   }
//   return [voidDescription, Array.from(clsSet).sort(), Array.from(predSet).sort()];
// }

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
// SELECT DISTINCT ?graph ?graphLabel ?subjectClass ?prop ?objectClass ?objectDatatype ?triples
// ?objectClassTopParent ?objectClassTopParentLabel ?subjectClassTopParent ?subjectClassTopParentLabel
// ?subjectClassLabel ?objectClassLabel ?subjectClassComment ?objectClassComment ?propLabel ?propComment
// WHERE {
//   {
//     SELECT * WHERE {
//       {
//         ?s sd:graph ?graph .
//         ?graph rdfs:label ?graphLabel .
//         ?graph void:classPartition ?cp .
//         ?cp void:class ?subjectClass ;
//           void:propertyPartition ?pp .
//         OPTIONAL {?subjectClass rdfs:label ?subjectClassLabel }
//         OPTIONAL {?subjectClass rdfs:comment ?subjectClassComment }
//         OPTIONAL {
//           ?subjectClass rdfs:subClassOf ?subjectClassTopParent .
//           OPTIONAL {?subjectClassTopParent rdfs:label ?subjectClassTopParentLabel}
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
// } ORDER BY ?subjectClass ?objectClass ?objectDatatype ?graph ?triples`;

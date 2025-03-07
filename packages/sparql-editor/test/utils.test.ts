import {describe, it, expect} from "vitest";
import {getVoidDescription, getExampleQueries, getPrefixes} from "../src/utils";
import {QueryEngine} from "@comunica/query-sparql";

const sparqlEngine = new QueryEngine();

describe("SPARQL utils", () => {
  it("Get VoID description for Bgee endpoint", async () => {
    const res = await getVoidDescription("https://www.bgee.org/sparql/");
    // console.log(res)
    expect(res.length).toBeGreaterThan(0);
  });

  it("Get VoID description for UniProt endpoint", async () => {
    const res = await getVoidDescription("https://sparql.uniprot.org/");
    expect(res.length).toBeGreaterThan(0);
  });

  it("Get example queries for Bgee endpoint", async () => {
    const res = await getExampleQueries("https://www.bgee.org/sparql/");
    expect(res.length).toBeGreaterThan(10);
  });

  it("Get prefixes for Bgee endpoint", async () => {
    const res = await getPrefixes("https://www.bgee.org/sparql/");
    expect(Object.keys(res).length).toBeGreaterThan(20);
  });

  it("Get VoID from Service Description for UniProt endpoint", async () => {
    const bindingsStream = await sparqlEngine.queryBindings(
      `
      PREFIX up: <http://purl.uniprot.org/core/>
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
      {
        sources: [
          // Directly query the service description:
          {type: "file", value: "https://sparql.uniprot.org/"},
          // { type: 'sparql', value: 'https://sparql.uniprot.org/' },
        ],
      },
    );
    // // curl -H "Accept: text/turtle" https://sparql.uniprot.org/ | less

    const bindings = await bindingsStream.toArray();
    expect(bindings.length).toBeGreaterThan(10);
    // for await (const b of bindings) {
    //   // console.log(binding.toString());
    //   console.log(b.get('subjectClass')?.value);
    // }

    // const queryResults = bindings.map(b => {
    //   const result: any = {
    //     subjectClass: b.get("subjectClass"),
    //     prop: b.get("prop"),
    //   };
    //   if (b.get("objectClass")) result.objectClass = b.get("objectClass");
    //   if (b.get("objectDatatype")) result.objectDatatype = b.get("objectDatatype");
    //   return result;
    // });

    // queryResults.forEach(b => {
    //   if ("objectClass" in b) console.log("CLS", b.objectClass.value);
    //   if ("objectDatatype" in b) console.log(b.objectDatatype.value);
    // });

    // const bindings = await bindingsStream.toArray();
    // console.log(bindings[0].get('subjectClass').value);
    // console.log(bindings[0].get('s').termType);
    // expect(Object.keys(res).length).toBeGreaterThan(20);
  });
});

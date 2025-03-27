<div align="center">

# 💫 SPARQL overview web component

[![NPM](https://img.shields.io/npm/v/@sib-swiss/sparql-overview)](https://www.npmjs.com/package/@sib-swiss/sparql-overview)
[![Tests](https://github.com/sib-swiss/sparql-editor/actions/workflows/test.yml/badge.svg)](https://github.com/sib-swiss/sparql-v/actions/workflows/test.yml)
[![Deploy demo to GitHub Pages](https://github.com/sib-swiss/sparql-editor/actions/workflows/deploy.yml/badge.svg)](https://github.com/sib-swiss/sparql-editor/actions/workflows/deploy.yml)

</div>

A standard web component to visualize classes and their relations as a network.

The editor retrieves VoID description about the endpoints by directly querying them with SPARQL.

👆️ You can **try it** for a few SPARQL endpoints of the SIB, such as UniProt and Bgee, here: **[sib-swiss.github.io/sparql-editor/overview](https://sib-swiss.github.io/sparql-editor/overview)**

## 🚀 Use

Install with a package manager in your project:

```bash
npm install --save @sib-swiss/sparql-overview
```

Create a `index.html` file with:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>SPARQL overview</title>
    <meta name="description" content="SPARQL overview demo page" />
    <link rel="icon" type="image/png" href="https://upload.wikimedia.org/wikipedia/commons/f/f3/Rdf_logo.svg" />
  </head>

  <body>
    <div style="height: 97vh">
      <div id="sparql-overview"></div>
    </div>
  </body>

  <script type="module">
    import {SparqlOverview} from "@sib-swiss/sparql-overview";

    async function main() {
      const endpointUrl = "https://www.bgee.org/sparql/";

      const prefixes = {
        rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
        rdfs: "http://www.w3.org/2000/01/rdf-schema#",
        owl: "http://www.w3.org/2002/07/owl#",
        up: "http://purl.uniprot.org/core/",
        orth: "http://purl.org/net/orth#",
      };

      const voidQuery = `PREFIX owl: <http://www.w3.org/2002/07/owl#>
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

      // Query SPARQL endpoint to get the VoID description of classes
      const response = await fetch(`${endpointUrl}?query=${encodeURIComponent(voidQuery)}`, {
        signal: AbortSignal.timeout(5000),
        headers: {Accept: "application/sparql-results+json"},
      });
      const json = await response.json();
      const voidDesc = json.results.bindings;

      new SparqlOverview(document.querySelector("#sparql-overview"), {endpointUrl: voidDesc}, prefixes);
    }

    main();
  </script>
</html>
```

Then just open this HTML page in your favorite browser.

You can also start a basic web server with NodeJS or Python (recommended):

```bash
npx http-server
# or
python -m http.server
```

# 🧑‍💻 Contributing

Checkout [CONTRIBUTING.md](https://github.com/sib-swiss/sparql-editor/blob/main/CONTRIBUTING.md) for more details on how to run this in development and make a contribution.

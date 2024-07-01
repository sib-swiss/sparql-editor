<div align="center">

# 💫 SPARQL editor web component

[![Run tests](https://github.com/sib-swiss/sparql-editor/actions/workflows/test.yml/badge.svg)](https://github.com/sib-swiss/sparql-editor/actions/workflows/test.yml)

</div>

A standard web component to easily deploy a SPARQL query editor for a specific SPARQL endpoint using the popular [YASGUI editor](https://github.com/zazuko/Yasgui).

- [x] **Prefixes** are automatically pulled from the endpoint using their definition defined with the [SHACL ontology](https://www.w3.org/TR/shacl/) (`sh:prefix`/`sh:namespace`).
- [x] **Example SPARQL queries** defined using the SHACL ontology are automatically pulled from the endpoint (queries are defined with `sh:select|sh:ask|sh:construct|sh:describe`, and their human readable description with `rdfs:label|rdfs:comment`). Checkout the [`sparql-examples`](https://github.com/sib-swiss/sparql-examples) project for more details.
- [x] **Autocomplete possibilities for properties and classes** are automatically pulled from the endpoint based on VoID description present in the triplestore (`void:linkPredicate|void:property` and `void:class`). Checkout the [`void-generator`](https://github.com/JervenBolleman/void-generator) project to automatically generate VoID description for your endpoint.

## 🚀 Use

> Release on npm coming soon.

```html
<sparql-editor endpoint="https://sparql.uniprot.org/sparql/"></sparql-editor>
```

Customize buttons color:

```html
<sparql-editor
  endpoint="https://www.bgee.org/sparql/"
  examples-on-main-page="10"
  style="--btn-color: white; --btn-bg-color: #00709b;"
></sparql-editor>
```

## 🛠️ Development

> Requirement: [NodeJS](https://nodejs.org/en) installed.

Clone the repository obviously, and get into the repository root folder.

Install:

```bash
npm install
```

Run in development:

```bash
npm run dev
```

Auto format code with prettier:

```bash
npm run fmt
```

Lint with eslint and run basic tests (we recommend to install the [`ESLint`](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) extension on VSCode):

```bash
npm test
```

Build for production in the `dist` folder:

```bash
npm run build
```

Update dependencies to the latest available versions:

```bash
npx npm-check-updates -u
```

## 🤝 Credits

Thanks to:

- [Triply](https://triply.cc) for originally developing the YASGUI editor
- [Zazuko](https://zazuko.com/) for keeping it up-to-date the last few years

<div align="center">

# 💫 SPARQL editor web component

[![NPM](https://img.shields.io/npm/v/@sib-swiss/sparql-editor)](https://www.npmjs.com/package/@sib-swiss/sparql-editor)

</div>

A standard web component to easily deploy a SPARQL query editor for a specific SPARQL endpoint using the popular [YASGUI editor](https://github.com/zazuko/Yasgui).

- **Prefixes** are automatically pulled from the endpoint using their definition defined with the [SHACL ontology](https://www.w3.org/TR/shacl/) (`sh:prefix`/`sh:namespace`).
- **Example SPARQL queries** defined using the SHACL ontology are automatically pulled from the endpoint (queries are defined with `sh:select|sh:ask|sh:construct|sh:describe`, and their human readable description with `rdfs:label|rdfs:comment`). Checkout the [`sparql-examples`](https://github.com/sib-swiss/sparql-examples) project for more details.
- **Autocomplete possibilities for properties and classes** are automatically pulled from the endpoint based on VoID description present in the triplestore (`void:linkPredicate|void:property` and `void:class`). Checkout the [`void-generator`](https://github.com/JervenBolleman/void-generator) project to automatically generate VoID description for your endpoint.

## 🚀 Use

1. Import from CDN

   ```html
   <script type="module" src="https://unpkg.com/@sib-swiss/sparql-editor"></script>
   ```

   Or install with a package manager in your project:

   ```bash
   npm install --save @sib-swiss/sparql-editor
   # or
   pnpm add @sib-swiss/sparql-editor
   ```

2. Use the custom element in your HTML/JSX/TSX code:

   ```html
   <sparql-editor endpoint="https://sparql.uniprot.org/sparql/"></sparql-editor>
   ```

   You can customize the number of examples displayed on the main page and buttons color:

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

Lint with eslint (we recommend to install the [`ESLint`](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) extension on VSCode):

```bash
npm run lint
```

Build for production in the `dist` folder:

```bash
npm run build
```

Update dependencies to the latest available versions:

```bash
npx npm-check-updates -u
```

## 🏷️ Release

To create a new release:

- Login with `npm adduser` if not already done

- Upgrade version in `package.json`

- Run release script:

  ```bash
  npm run release
  ```

- Create release on GitHub

## 🤝 Credits

Thanks to:

- [Triply](https://triply.cc) for originally developing the YASGUI editor
- [Zazuko](https://zazuko.com/) for keeping it up-to-date the last few years

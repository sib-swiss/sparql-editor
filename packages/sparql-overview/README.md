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

1. Import from a CDN:

   ```html
   <script type="module" src="https://unpkg.com/@sib-swiss/sparql-overview"></script>
   ```

   Or install with a package manager in your project:

   ```bash
   npm install --save @sib-swiss/sparql-overview
   # or
   pnpm add @sib-swiss/sparql-overview
   ```

2. Use the custom element in your HTML/JSX/TSX code:

   ```html
   <sparql-overview endpoint="https://sparql.uniprot.org/sparql/"></sparql-overview>
   ```

   You can also pass a list of endpoints URLs separated by commas to enable users to choose from different endpoints:

   ```html
   <sparql-overview endpoint="https://sparql.uniprot.org/sparql/,https://www.bgee.org/sparql/"></sparql-overview>
   ```

> [!WARNING]
>
> Metadata are retrieved by a few lightweight queries sent from client-side JavaScript when the editor is initialized, so your SPARQL **endpoints should accept CORS** (either from \*, which is recommended, or just from the URL where the editor is deployed)

### 📝 Basic example

No need for a complex project you can integrate SPARQL editor in any HTML page by importing from a CDN!

Create a `index.html` file with:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>SPARQL editor dev</title>
    <meta name="description" content="SPARQL editor demo page" />
    <link rel="icon" type="image/png" href="https://upload.wikimedia.org/wikipedia/commons/f/f3/Rdf_logo.svg" />
    <!-- Import the module from a CDN -->
    <script type="module" src="https://unpkg.com/@sib-swiss/sparql-overview"></script>
  </head>

  <body>
    <div>
      <sparql-overview endpoint="https://www.bgee.org/sparql/"></sparql-overview>
    </div>
  </body>
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

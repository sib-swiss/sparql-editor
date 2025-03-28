# 🧑‍💻 Development setup

This page is for if you want to run the package and reusable components in development, and get involved by making a code contribution.

Clone the repository:

```bash
git clone https://github.com/sib-swiss/sparql-editor
cd sparql-editor
```

## 📥️ Install dependencies

> Requirement: [NodeJS](https://nodejs.org/en) installed.

Install dependencies:

```bash
npm i
```

Upgrade dependencies to the latest available versions:

```bash
npm run upgrade
```

## 🛠️ Run in development

Run the `index.html` page in development with auto reload when change to the code:

```bash
npm run dev
```

Run the [demo pages](https://sib-swiss.github.io/sparql-editor) locally:

```bash
npm run demo
```

## 🧪 Run tests

Run linting and basic tests with `vitest`:

```bash
npm test
```

## 🧹 Format and lint

> [!TIP]
>
> This will be done automatically when you commit through a pre-commit hook.

Auto format code with prettier:

```bash
npm run fmt
```

Lint with eslint (we recommend to install the [`ESLint`](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) extension on VSCode):

```bash
npm run lint
```

## 📦️ Build

Build for production in the `dist` folder:

```bash
npm run build
```

## 🏷️ Release

To create a new release, you will need to login on your machine once with `npm adduser` if not already done.

### New release for the sparql-editor

Running the following script will upgrade version in `package.json`, generate changelog, create a tag, and publish the package to NPM:

```sh
cd packages/sparql-editor
npm version patch
# Or minor / major
```

> You will need to go through NPM 2FA to publish.

### New release for the sparql-overview

```sh
cd packages/sparql-overview
npm version patch
```

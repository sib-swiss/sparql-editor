import Yasgui from "@zazuko/yasgui";
import hljs from "highlight.js/lib/core";

import {hljsDefineTurtle, hljsDefineSparql} from "./highlight-sparql";
import {editorCss, yasguiCss, yasguiGripInlineCss, highlightjsCss} from "./styles";
// import { drawSvgStringAsElement } from "@zazuko/yasgui-utils";
// import tooltip from "@zazuko/yasqe/src/tooltip";
// import {warning} from "@zazuko/yasqe/src/imgs";
// import {Parser} from "sparqljs";

import {
  extractAllSubjectsAndTypes,
  getSubjectForCursorPosition,
  getExampleQueries,
  getPrefixes,
  getVoidDescription,
  EndpointsMetadata,
  getServiceUriForCursorPosition,
} from "./utils";

const addSlashAtEnd = (str: any) => (str.endsWith("/") ? str : `${str}/`);
const capitalize = (str: any) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

/**
 * Custom element to create a SPARQL editor for a given endpoint using YASGUI
 * with autocompletion for classes and properties based on VoID description stored in the endpoint
 * and prefixes defined using SHACL in the endpoint
 * @example <sparql-editor endpoint="https://sparql.uniprot.org/sparql/" examples-on-main-page="10"></sparql-editor>
 */
export class SparqlEditor extends HTMLElement {
  examplesOnMainPage: number;
  yasgui: Yasgui | undefined;
  urlParams: any;
  meta: EndpointsMetadata;
  examplesRepo: string | null;
  examplesRepoAddUrl: string | null;
  addLimit: number | null;
  // TODO: make exampleQueries a dict with the query IRI as key, so if the window.location matches a key, it will load the query?

  examplesNamespace(): string {
    return (
      this.getAttribute("examples-namespace") || addSlashAtEnd(this.endpointUrl()) + ".well-known/sparql-examples/"
    );
  }

  constructor() {
    super();
    this.attachShadow({mode: "open"});

    this.meta = this.loadMetaFromLocalStorage();
    // console.log("Loaded metadata from localStorage", this.meta);
    const endpoints = (this.getAttribute("endpoint") || "").split(",");
    endpoints.forEach(endpoint => {
      endpoint = endpoint.trim();
      if (!this.meta[endpoint]) {
        this.meta[endpoint] = {
          void: {},
          classes: [],
          predicates: [],
          prefixes: {},
          examples: [],
        };
      }
    });
    if (endpoints.length === 0)
      throw new Error("No endpoint provided. Please use the 'endpoint' attribute to specify the SPARQL endpoint URL.");

    this.addLimit = Number(this.getAttribute("add-limit")) || null;
    this.examplesOnMainPage = Number(this.getAttribute("examples-on-main-page")) || 10;
    this.examplesRepoAddUrl = this.getAttribute("examples-repo-add-url");
    this.examplesRepo = this.getAttribute("examples-repository");
    if (this.examplesRepoAddUrl && !this.examplesRepo) this.examplesRepo = this.examplesRepoAddUrl.split("/new/")[0];

    const style = document.createElement("style");
    style.textContent = `
      ${yasguiCss}
      ${yasguiGripInlineCss}
      ${highlightjsCss}
      ${editorCss}
		`;
    if (endpoints.length === 1) {
      style.textContent += `.yasgui .controlbar {
  display: none !important;
}`;
    } else {
      Yasgui.defaults.endpointCatalogueOptions = {
        getData: () => {
          return Object.keys(this.meta).map(endpoint => ({
            endpoint: endpoint,
          }));
        },
        keys: [],
        renderItem: (data, source) => {
          const contentDiv = document.createElement("div");
          contentDiv.innerText = data.value.endpoint;
          source.appendChild(contentDiv);
        },
      };
    }
    const container = document.createElement("div");
    container.className = "container";
    container.innerHTML = `
      <div id="sparql-editor">
        <button id="sparql-add-prefixes-btn" class="btn" style="margin-bottom: 0.3em;">Add common prefixes</button>
        <button id="sparql-save-example-btn" class="btn" style="margin-bottom: 0.3em;">Save query as example</button>
        <div id="yasgui"></div>
        <div id="loading-spinner" style="display: flex; justify-content: center; align-items: center; height: 100px; flex-direction: column;">
          <div class="spinner" style="border: 4px solid rgba(0,0,0,0.1); border-left-color: #000; border-radius: 50%; width: 24px; height: 24px; animation: spin 1s linear infinite;"></div>
          <p style="margin-top: 10px; text-align: center;">Loading editor...</p>
        </div>
      </div>
      <div>
        <div id="sparql-examples"></div>
        <slot></slot>
      </div>
    `;
    this.shadowRoot?.appendChild(style);
    this.shadowRoot?.appendChild(container);

    // NOTE: autocompleters get are executed when Yasgui is instantiated
    Yasgui.Yasqe.defaults.autocompleters.splice(Yasgui.Yasqe.defaults.autocompleters.indexOf("prefixes"), 1);
    Yasgui.Yasqe.defaults.autocompleters.splice(Yasgui.Yasqe.defaults.autocompleters.indexOf("class"), 1);
    Yasgui.Yasqe.defaults.autocompleters.splice(Yasgui.Yasqe.defaults.autocompleters.indexOf("property"), 1);
    Yasgui.Yasqe.forkAutocompleter("prefixes", this.prefixesCompleter);
    Yasgui.Yasqe.forkAutocompleter("class", this.voidClassCompleter);
    Yasgui.Yasqe.forkAutocompleter("property", this.voidPropertyCompleter);
    Yasgui.defaults.requestConfig = {
      ...Yasgui.defaults.requestConfig,
      endpoint: endpoints[0],
      method: "GET",
    };

    hljs.registerLanguage("ttl", hljsDefineTurtle);
    hljs.registerLanguage("sparql", hljsDefineSparql);
  }

  loadMetaFromLocalStorage(): EndpointsMetadata {
    const metaString = localStorage.getItem("sparql-editor-metadata");
    return metaString ? JSON.parse(metaString) : {};
  }

  // Function to save metadata to localStorage
  saveMetaToLocalStorage() {
    localStorage.setItem("sparql-editor-metadata", JSON.stringify(this.meta));
  }

  // Get prefixes, VoID and examples
  async getMetadata(endpoint: string | undefined) {
    if (!endpoint) return;
    if (!this.meta[endpoint]) {
      this.meta[endpoint] = {
        void: {},
        classes: [],
        predicates: [],
        prefixes: {},
        examples: [],
      };
    }
    if (!this.meta[endpoint].retrievedAt) {
      // console.log(`Getting metadata for ${endpoint}`);
      [
        this.meta[endpoint].examples,
        this.meta[endpoint].prefixes,
        [this.meta[endpoint].void, this.meta[endpoint].classes, this.meta[endpoint].predicates],
      ] = await Promise.all([getExampleQueries(endpoint), getPrefixes(endpoint), getVoidDescription(endpoint)]);
      this.meta[endpoint].retrievedAt = new Date();
      this.saveMetaToLocalStorage();
    }
  }

  // Load current endpoint in the YASGUI input box
  async loadCurrentEndpoint(endpoint: string | undefined = this.endpointUrl()) {
    // console.log("Switching endpoint", endpoint);
    await this.getMetadata(endpoint);
    await this.showExamples();
    // @ts-ignore set default query when new tab
    this.yasgui.config.yasqe.value =
      this.addPrefixesToQuery(this.currentEndpoint().examples[0]?.query) || Yasgui.Yasqe.defaults.value;
    Yasgui.Yasr.defaults.prefixes = this.meta[endpoint].prefixes;
  }

  // Return the current endpoint URL
  endpointUrl() {
    return this.yasgui?.getTab()?.getEndpoint() || Object.keys(this.meta)[0];
  }

  // Return the object with the current endpoint metadata
  currentEndpoint() {
    return this.meta[this.endpointUrl()];
  }

  async connectedCallback() {
    // Instantiate YASGUI editor
    const editorEl = this.shadowRoot?.getElementById("yasgui") as HTMLElement;
    this.yasgui = new Yasgui(editorEl, {
      copyEndpointOnNewTab: true,
    });
    await this.loadCurrentEndpoint();
    const spinEl = this.shadowRoot?.getElementById("loading-spinner");
    if (spinEl) spinEl.style.display = "none";

    this.yasgui?.on("tabSelect", () => {
      setTimeout(() => this.loadCurrentEndpoint());
    });
    this.yasgui?.on("endpointHistoryChange", () => {
      setTimeout(() => this.loadCurrentEndpoint());
    });

    // Button to add all prefixes to the query
    const addPrefixesBtnEl = this.shadowRoot?.getElementById("sparql-add-prefixes-btn");
    addPrefixesBtnEl?.addEventListener("click", () => {
      const sortedPrefixes: {[key: string]: string} = {};
      for (const key of Object.keys(this.currentEndpoint().prefixes).sort()) {
        sortedPrefixes[key] = this.currentEndpoint().prefixes[key];
      }
      this.yasgui?.getTab()?.getYasqe().addPrefixes(sortedPrefixes);
      this.yasgui?.getTab()?.getYasqe().collapsePrefixes(true);
    });

    this.yasgui.on("queryBefore", (_y, tab) => {
      const ye = tab.getYasqe();
      // TODO: improve prefixes handling
      tab.getYasr().config.prefixes = {...Yasgui.Yasr.defaults.prefixes, ...ye.getPrefixesFromQuery()};

      if (this.addLimit) {
        // Add limit to query if not provided
        const limitPattern = /LIMIT\s+\d+\s*$/i;
        if (
          (ye.getQueryType() === "SELECT" || ye.getQueryType() === "CONSTRUCT") &&
          !limitPattern.test(ye.getValue().trim())
        ) {
          ye.setValue(`${ye.getValue().trim()} LIMIT ${this.addLimit}`);
        }
      }

      // for (let l = 0; l < ye.getDoc().lineCount(); ++l) {
      //   const token = ye.getTokenAt(
      //     {
      //       line: l,
      //       ch: ye.getDoc().getLine(l).length,
      //     },
      //     true
      //   );
      //   console.log(l, token);
      // }

      // // TODO: here is how we can show an error at a specific line
      // const warningEl = drawSvgStringAsElement(warning);
      // warningEl.className = "parseErrorIcon";
      // // @ts-ignore TS is not smart enough to understand that Yasqe and Yasqe are same type...
      // tooltip(ye, warningEl, "Big error!");
      // ye.setGutterMarker(13, "gutterErrorBar", warningEl);
    });

    // TODO: Detect errors in the query and show them in the editor
    // const parser = new Parser();
    // // @ts-ignore TS complains for nothing about args of the event, but the tab is properly passed
    // this.yasgui.getTab()?.getYasqe().on("change", (tab: any) => {
    //   try {
    //     const parsedQuery = parser.parse(tab.getValue());
    //     console.log(parsedQuery);
    //     // TODO: make this a separate function, recursive
    //     // @ts-ignore SparqlQuery type definition is completely wrong, as usual, so we need to ignore
    //     for (const part of parsedQuery.where) {
    //       if (part["type"] === "bgp") {
    //         for (const triple of part["triples"]) {
    //           console.log(triple);
    //           if (!this.predicatesList.includes(triple["predicate"]["value"])) {
    //             console.log(`Predicate not valid: ${triple["predicate"]["value"]}`);
    //           }
    //         }
    //       }
    //     }
    //     // check if the classes/properties are in the 2 lists
    //     // If not, pop an error at the line where it is (do a search to find the line)
    //   } catch {
    //     return;
    //   }
    // })

    // mermaid.initialize({ startOnLoad: false });
    // await mermaid.run({
    //     querySelector: '.language-mermaid',
    // });

    // Hack to add Describe links for IRIs in the results without touching the YASR table plugin
    // But it is lost when we change the tab (user need to rerun the query to get the links back)
    // https://github.com/zazuko/Yasgui/blob/main/packages/yasr/src/plugins/table/index.ts#L76
    // https://datatables.net/extensions/buttons/
    this.yasgui.on("queryResponse", async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
      const iriCells = this.shadowRoot?.querySelectorAll(".dataTable a.iri") as NodeListOf<HTMLAnchorElement>;
      iriCells?.forEach(iriCell => {
        if (iriCell.href.startsWith("http://www.w3.org/2001/XMLSchema#")) return;
        const describeBtn = document.createElement("a");
        describeBtn.href = this.createDescribeUrl(iriCell.href);
        describeBtn.textContent = "🔍️";
        describeBtn.style.marginLeft = "0.3em";
        describeBtn.style.textDecoration = "none";
        iriCell.parentElement?.appendChild(describeBtn);
      });
    });

    // Button to pop a dialog to save the query as an example in a turtle file
    const saveExampleBtnEl = this.shadowRoot?.getElementById("sparql-save-example-btn");
    saveExampleBtnEl?.addEventListener("click", () => {
      this.showSaveExampleDialog();
    });

    // Parse query params from URL and auto run query if provided in URL
    // NOTE: Yasqe already automatically load query param in the editor and run the query
    // But it does not trigger the .on("query") event, so it does not add limit
    this.urlParams = {};
    if (window.location.search) {
      const regex = /[?&]([^=&]+)=([^&]*)/g;
      let match;
      while ((match = regex.exec(window.location.search)) !== null) {
        const key = decodeURIComponent(match[1]);
        const value = decodeURIComponent(match[2]);
        this.urlParams[key] = value;
      }
    }
    if (this.urlParams["query"]) {
      this.addPrefixesToQueryInEditor();
      this.yasgui.getTab()?.getYasqe().query();
    }
  }

  // Original autocompleters: https://github.com/zazuko/Yasgui/blob/main/packages/yasqe/src/autocompleters/classes.ts#L8
  // Fork examples: https://github.com/zazuko/Yasgui/blob/main/webpack/pages/yasqe.html#L61
  prefixesCompleter = {
    name: "shaclPrefixes",
    persistenceId: null,
    bulk: false,
    get: (_yasqe: any, token: any) => {
      const prefixToAutocomplete = token.autocompletionString.split(":")[0];
      if (this.currentEndpoint().prefixes[prefixToAutocomplete]) {
        return [`${prefixToAutocomplete}: <${this.currentEndpoint().prefixes[prefixToAutocomplete]}>`];
      }
      return [];
    },
  };
  voidClassCompleter = {
    name: "voidClass",
    bulk: false,
    get: (_yasqe: any, token: any) => {
      return this.currentEndpoint().classes.filter(iri => iri.indexOf(token.autocompletionString) === 0);
    },
  };
  voidPropertyCompleter = {
    name: "voidProperty",
    bulk: false,
    get: async (yasqe: any, token: any) => {
      const cursor = yasqe.getCursor();
      const subj = getSubjectForCursorPosition(yasqe.getValue(), cursor.line, cursor.ch);
      const subjTypes = extractAllSubjectsAndTypes(yasqe.getValue());
      const cursorEndpoint =
        getServiceUriForCursorPosition(yasqe.getValue(), cursor.line, cursor.ch) || this.endpointUrl();
      // Make sure the metadata is loaded for the service endpoints
      await this.getMetadata(cursorEndpoint);
      // console.log("cursorEndpoint, subj, subjTypes, token", cursorEndpoint, subj, subjTypes, token)
      if (subj && subjTypes.has(subj) && Object.keys(this.meta[cursorEndpoint].void).length > 0) {
        const types = subjTypes.get(subj);
        // console.log("types", types)
        if (types) {
          const suggestPreds = new Set<string>();
          try {
            types.forEach(typeCurie => {
              Object.keys(this.meta[cursorEndpoint].void[this.curieToUri(typeCurie)])
                .filter(prop => prop.indexOf(token.autocompletionString) === 0)
                .forEach(prop => {
                  suggestPreds.add(prop);
                });
            });
          } catch (error) {
            console.warn("Error getting properties for autocomplete:", error);
          }
          // console.log("suggestPreds", suggestPreds)
          if (suggestPreds.size > 0) return Array.from(suggestPreds).sort();
        }
      }
      return this.meta[cursorEndpoint].predicates.filter(iri => iri.indexOf(token.autocompletionString) === 0);
    },
    isValidCompletionPosition: (yasqe: any) => {
      const token = yasqe.getCompleteToken();
      if (token.string[0] === "?" || token.string[0] === "$") return false; // we are typing a var
      if (token.state.possibleCurrent.indexOf("a") >= 0) return true; // predicate pos
      return false;
    },
  };

  showSaveExampleDialog() {
    // Create dialog to save the current query as an example in a turtle file
    const exampleNumberForId = (this.currentEndpoint().examples.length + 1).toString().padStart(3, "0");
    const dialog = document.createElement("dialog");
    dialog.style.maxWidth = "600px";
    dialog.style.padding = "1em";
    dialog.style.borderRadius = "8px";
    dialog.style.borderColor = "#cccccc";
    const exampleRepoLink = this.examplesRepo
      ? `<a href="${this.examplesRepo}" target="_blank">repository</a>`
      : "repository";
    const addToRepoBtn = this.examplesRepoAddUrl
      ? `<button type="button" class="btn" id="add-to-repo-btn">Add example to repository</button>`
      : "";
    dialog.innerHTML = `
      <form id="example-form" method="dialog">
        <h3>Save query as example</h3>
        <p>Download the current query as an example in a turtle file that you can then submit to the ${exampleRepoLink} where all examples are stored.</p>
        <label for="description">Description:</label><br>
        <input type="text" id="description" name="description" required style="width: 100%;" maxlength="200"><br><br>
        <label for="query-uri">Query example filename and URI (no spaces):</label><br>
        <input type="text" id="example-uri" name="example-uri" required pattern="^[a-zA-Z0-9_\\-]+$"
          title="Only alphanumeric characters, underscores, or hyphens are allowed."
          style="width: 100%;" placeholder="Enter a valid filename" value="${exampleNumberForId}"><br><br>
        <label for="keywords">Keywords (optional, comma separated):</label><br>
        <input type="text" id="keywords" name="keywords" style="width: 100%;"><br><br>
        <div align="center">
          <button type="submit" class="btn">Download example file</button>
          ${addToRepoBtn}
          <button type="button" class="btn" id="copy-clipboard-btn">Copy to clipboard</button>
          <button type="button" class="btn" onclick="this.closest('dialog').close()">Cancel</button>
        </div>
      </form>
    `;
    this.shadowRoot?.appendChild(dialog);
    dialog.showModal();
    const descriptionInput = dialog.querySelector("#description") as HTMLInputElement;
    descriptionInput.focus();

    const generateShacl = () => {
      const description = (dialog.querySelector("#description") as HTMLTextAreaElement).value;
      const keywordsStr = (dialog.querySelector("#keywords") as HTMLInputElement).value
        .split(",")
        .map((kw: string) => `"${kw.trim()}"`)
        .join(", ");
      const queryType = capitalize(this.yasgui?.getTab()?.getYasqe().getQueryType());
      const keywordsBit = keywordsStr.length > 2 ? `schema:keyword ${keywordsStr} ;\n    ` : "";
      const exampleUri = (dialog.querySelector("#example-uri") as HTMLInputElement).value;
      return [
        `@prefix ex: <${this.examplesNamespace()}> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix schema: <https://schema.org/> .
@prefix sh: <http://www.w3.org/ns/shacl#> .

ex:${exampleUri} a sh:SPARQLExecutable${
          ["Select", "Construct", "Ask"].includes(queryType)
            ? `,
      sh:SPARQL${queryType}Executable`
            : ""
        } ;
  rdfs:comment "${description}"@en ;
  sh:prefixes _:sparql_examples_prefixes ;
  sh:${queryType.toLowerCase()} """${this.yasgui?.getTab()?.getYasqe().getValue()}""" ;
  ${keywordsBit}schema:target <${this.endpointUrl}> .`,
        exampleUri,
      ];
    };

    const formEl = dialog.querySelector("#example-form") as HTMLFormElement;
    formEl.addEventListener("submit", e => {
      e.preventDefault();
      const [shaclStr, exampleUri] = generateShacl();
      const dataStr = `data:text/turtle;charset=utf-8,${encodeURIComponent(shaclStr)}`;
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `${exampleUri}.ttl`);
      downloadAnchor.click();
      dialog.close();
    });

    dialog.querySelector("#copy-clipboard-btn")?.addEventListener("click", () => {
      if (formEl.checkValidity()) {
        const [shaclStr] = generateShacl();
        navigator.clipboard.writeText(shaclStr);
      } else {
        formEl.reportValidity();
      }
    });

    if (this.examplesRepoAddUrl) {
      dialog.querySelector("#add-to-repo-btn")?.addEventListener("click", () => {
        if (formEl.checkValidity()) {
          const [shaclStr, exampleUri] = generateShacl();
          const uploadExampleUrl = `${this.examplesRepoAddUrl}?filename=${exampleUri}.ttl&value=${encodeURIComponent(shaclStr)}`;
          window.open(uploadExampleUrl, "_blank");
        } else {
          formEl.reportValidity();
        }
      });
    }
  }

  async showExamples() {
    // Display examples on the main page and in a dialog for the currently selected endpoint
    const exampleQueriesEl = this.shadowRoot?.getElementById("sparql-examples") as HTMLElement;
    exampleQueriesEl.innerHTML = "";
    if (this.currentEndpoint().examples.length === 0) return;
    // Add title for examples
    const exQueryTitleDiv = document.createElement("div");
    exQueryTitleDiv.style.textAlign = "center";
    const exQueryTitle = document.createElement("h3");
    exQueryTitle.style.margin = "0.1em";
    exQueryTitle.style.fontWeight = "200";
    exQueryTitle.textContent = "Examples";
    exQueryTitleDiv.appendChild(exQueryTitle);
    exampleQueriesEl.appendChild(exQueryTitleDiv);

    // Create dialog for examples
    const exQueryDialog = document.createElement("dialog");
    // exQueryDialog.style.margin = "1em";
    // exQueryDialog.style.width = "calc(100vw - 8px)";
    exQueryDialog.style.width = "100%";
    exQueryDialog.style.borderColor = "#cccccc";
    exQueryDialog.style.backgroundColor = "#f5f5f5";
    exQueryDialog.style.borderRadius = "10px";

    // Add button to close dialog
    const exDialogCloseBtn = document.createElement("button");
    exDialogCloseBtn.className = "btn closeBtn";
    exDialogCloseBtn.textContent = "Close";
    exDialogCloseBtn.style.position = "fixed";
    exDialogCloseBtn.style.top = "1.5em";
    exDialogCloseBtn.style.right = "2em";
    exQueryDialog.appendChild(exDialogCloseBtn);
    exampleQueriesEl.appendChild(exQueryDialog);

    // Add examples to the main page and dialog
    this.currentEndpoint().examples.forEach(async (example, index) => {
      const exQueryDiv = document.createElement("div");
      const exQueryP = document.createElement("p");
      exQueryP.style.fontSize = "0.9em";
      exQueryP.innerHTML = `${index + 1}. ${example.comment}`;

      // Create use button
      const useBtn = document.createElement("button");
      useBtn.textContent = "Use";
      useBtn.style.marginLeft = "0.5em";
      useBtn.className = "btn sparqlExampleButton";
      useBtn.addEventListener("click", () => {
        this.addTab(example.query, index);
        exQueryDialog.close();
      });
      exQueryP.appendChild(useBtn);
      exQueryDiv.appendChild(exQueryP);
      exQueryDialog.appendChild(exQueryDiv);

      // Add only the first examples to the main page
      if (index < this.examplesOnMainPage) {
        const cloneExQueryDiv = exQueryDiv.cloneNode(true) as HTMLElement;
        cloneExQueryDiv.className = "main-query-example";
        // Cloning does not include click event so we need to redo it :(
        cloneExQueryDiv.lastChild?.lastChild?.addEventListener("click", () => {
          this.addTab(example.query, index);
        });
        exampleQueriesEl.appendChild(cloneExQueryDiv);
      }

      // Add query to dialog using pre/code (super fast)
      const exQueryPre = document.createElement("pre");
      const exQueryCode = document.createElement("code");
      exQueryCode.className = "language-sparql hljs";
      exQueryCode.style.borderRadius = "10px";
      exQueryPre.style.borderRadius = "10px";
      exQueryPre.style.backgroundColor = "#cccccc";
      exQueryPre.style.padding = "0.1em";
      // exQueryCode.textContent = example.query.trim();
      // hljs.highlightAll(); does not work on web component shadow DOM
      exQueryCode.innerHTML = hljs.highlight(example.query.trim(), {language: "sparql"}).value;
      exQueryPre.appendChild(exQueryCode);
      exQueryDiv.appendChild(exQueryPre);

      // // TODO: Add Mermaid diagram for each example in dialog
      // try {
      //   const mermaidCode = document.createElement("code");
      //   mermaidCode.className = "language-mermaid";
      //   const mermaidStr = getMermaidFromQuery(this.addPrefixesToQuery(example.query));
      //   // mermaidCode.textContent = mermaidStr;
      //   const { svg } = await mermaid.render('graphDiv', mermaidStr);
      //   mermaidCode.innerHTML = svg;
      //   exQueryDiv.appendChild(mermaidCode);
      // } catch (error) {
      //   console.warn("Error generating Mermaid diagram:", error);
      //   console.log(this.addPrefixesToQuery(example.query))
      // }

      // Create a YASQE fancy editor for each example in dialog (super slow)
      // const exYasqeDiv = document.createElement("div");
      // exYasqeDiv.id = `exYasqeDiv${index}`;
      // exQueryDialog.appendChild(exYasqeDiv);
      // // https://github.com/zazuko/Yasgui/blob/main/packages/yasqe/src/defaults.ts
      // new Yasqe(exYasqeDiv, {
      // 	value: example.query,
      // 	showQueryButton: false,
      // 	resizeable: false,
      // 	readOnly: true,
      // 	queryingDisabled: true,
      // 	persistent: null,
      // 	editorHeight: `${example.query.split(/\r\n|\r|\n/).length*2.5}ch`,
      // 	syntaxErrorCheck: false,
      // 	createShareableLink: null,
      // 	consumeShareLink: null,
      // });
    });

    // Add button to open dialog
    const openExDialogBtn = document.createElement("button");
    openExDialogBtn.textContent = "See all examples";
    openExDialogBtn.className = "btn";
    exampleQueriesEl.appendChild(openExDialogBtn);

    openExDialogBtn.addEventListener("click", () => {
      exQueryDialog.showModal();
      document.body.style.overflow = "hidden";
      // exQueryDialog.scrollTop = 0;
    });
    exDialogCloseBtn.addEventListener("click", () => {
      exQueryDialog.close();
    });
    exQueryDialog.addEventListener("close", () => {
      document.body.style.overflow = "";
    });
  }

  addPrefixesToQuery(query: string) {
    // Add prefixes to a query without using YASGUI
    // Required to add prefixes to the query before creating the YASGUI editor
    const sortedKeys = Object.keys(this.currentEndpoint().prefixes).sort();
    for (const key of sortedKeys) {
      const value = this.currentEndpoint().prefixes[key];
      const pref: any = {};
      pref[key] = value;
      const prefix = "PREFIX " + key + " ?: ?<" + value;
      if (!new RegExp(prefix, "g").test(query) && new RegExp("[(| |\u00a0|/|^]" + key + ":", "g").test(query)) {
        query = `PREFIX ${key}: <${value}>\n${query}`;
      }
    }
    return query;
  }

  addPrefixesToQueryInEditor() {
    // Add prefixes to the query loaded in the YASGUI editor
    const query = this.yasgui?.getTab()?.getYasqe().getValue();
    const sortedKeys = Object.keys(this.currentEndpoint().prefixes).sort();
    for (const key of sortedKeys) {
      const value = this.currentEndpoint().prefixes[key];
      const pref: any = {};
      pref[key] = value;
      const prefix = "PREFIX " + key + " ?: ?<" + value;
      if (!new RegExp(prefix, "g").test(query) && new RegExp("[(| |\u00a0|/|^]" + key + ":", "g").test(query)) {
        this.yasgui?.getTab()?.getYasqe().addPrefixes(pref);
      }
    }
  }

  addTab(query: string, index: number) {
    this.yasgui?.addTab(true, {
      ...Yasgui.Tab.getDefaults(),
      name: `Query ${index + 1}`,
      yasqe: {value: query},
    });
    this.addPrefixesToQueryInEditor();
  }

  createDescribeUrl(resourceUrl: string) {
    return `?query=${encodeURIComponent(`DESCRIBE <${resourceUrl}>`)}`;
  }

  // Function to convert CURIE to full URI using the prefix map
  curieToUri(curie: string) {
    // if (/^[a-zA-Z][a-zA-Z0-9]*:[a-zA-Z][a-zA-Z0-9_-]*$/.test(curie)) {
    if (/^[a-zA-Z][\w.-]*:[\w.-]+$/.test(curie)) {
      const [prefix, local] = curie.split(":");
      const namespace = this.currentEndpoint().prefixes[prefix];
      return namespace ? `${namespace}${local}` : curie; // Return as-is if prefix not found
    } else {
      // If it's already a full URI, return as-is
      return curie;
    }
  }
}

customElements.define("sparql-editor", SparqlEditor);

// https://github.com/joachimvh/SPARQLAlgebra.js
// https://github.com/sib-swiss/sparql-examples/blob/master/src/main/java/swiss/sib/rdf/sparql/examples/mermaid/Render.java
// function getMermaidFromQuery(query: string) {
//   let mermaidStr = ``;
//   const algebra = translate(query);
//   console.log(algebra);
//   return mermaidStr;
// }

// e.g. https://sib-swiss.github.io/sparql-examples/examples/uniprot/40_human_enzymes_that_metabolize_sphingolipids.html
// graph TD
//   v2("?ca")
//   v4("?chemblEntry"):::projected
//   v3("?protein"):::projected
//   v1("?rhea")
//   a1(("_:a1"))
//   a2(("_:a2"))
//   a3(("_:a3"))
//   a4(("_:a4"))
//   a5(("_:a5"))
//   c16([http://purl.uniprot.org/database/ChEMBL])
//   c13(["taxon:9606"])
//   c3(["rh:Reaction"])
//   c8(["CHEBI:26739"])
// classDef projected fill:lightgreen;
//   subgraph s1["https://sparql.rhea-db.org/sparql"]
//     style s1 stroke-width:4px;
//     v1--"rdfs:subClassOf"--> c3
//     v1--"rh:side"--> a1
//     a1--"rh:contains"--> a2
//     a2--"rh:compound"--> a3
//     a3--"rh:chebi"--> a4
//     a4--"rdfs:subClassOf"--> c8
//   end
//   v2--"up:catalyzedReaction"--> v1
//   v3--"up:annotation"--> a5
//   a5--"up:catalyticActivity"--> v2
//   v3--"up:organism"--> c13
//   v3--"rdfs:seeAlso"--> v4
//   v4--"up:database"--> c16

// e.g. https://sib-swiss.github.io/sparql-examples/examples/uniprot/21_where_are_genetic_disease_related_proteins_in_a_cell.html
// graph TD
//   v5("?cellcmpt"):::projected
//   v4("?disease"):::projected
//   v2("?diseaseAnnotation")
//   v6("?location_inside_cell"):::projected
//   v1("?protein"):::projected
//   v3("?subcellAnnotation")
//   a1(("_:a1"))
//   a2(("_:a2"))
// classDef projected fill:lightgreen;
//   v1--"up:annotation"--> v2
//   v1--"up:annotation"--> v3
//   v2--"up:disease"--> a1
//   a1--"skos:prefLabel"--> v4
//   v3--"up:locatedIn"--> a2
//   a2--"up:cellularComponent"--> v5
//   v5--"skos:prefLabel"--> v6

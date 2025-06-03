import Yasgui from "@zazuko/yasgui";
import {CompleterConfig, AutocompletionToken} from "@zazuko/yasqe/build/ts/src/autocompleters";
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
  compressUri,
  defaultPrefixes,
  generateTabLabel,
  getClassesFallback,
  getPredicatesFallback,
  createUseButton,
} from "./utils";
import {SparqlOverview} from "@sib-swiss/sparql-overview";

type Autocompleter = {name: string} & Partial<CompleterConfig>;
const addSlashAtEnd = (str: string) => (str.endsWith("/") ? str : `${str}/`);
const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

/**
 * Custom element to create a SPARQL editor for a given endpoint using YASGUI
 * with autocompletion for classes and properties based on VoID description stored in the endpoint
 * and prefixes defined using SHACL in the endpoint
 * @example <sparql-editor endpoint="https://sparql.uniprot.org/sparql/" examples-on-main-page="10"></sparql-editor>
 */
export class SparqlEditor extends HTMLElement {
  endpoints: string[] = [];
  examplesOnMainPage: number = 8;
  yasgui: Yasgui | undefined;
  meta: EndpointsMetadata = {};
  examplesRepo: string | undefined;
  examplesRepoAddUrl: string | undefined;
  addLimit: number | undefined;
  dialogElOpen: HTMLDialogElement | undefined;
  // TODO: make exampleQueries a dict with the query IRI as key, so if the window.location matches a key, it will load the query?

  constructor() {
    super();
  }

  examplesNamespace() {
    return (
      this.getAttribute("examples-namespace") || addSlashAtEnd(this.endpointUrl()) + ".well-known/sparql-examples/"
    );
  }

  // Return the current endpoint URL
  endpointUrl() {
    // console.log(this.yasgui?.getTab(), this.endpoints)
    return this.yasgui?.getTab()?.getEndpoint() || this.endpoints[0];
  }

  // Return the object with the current endpoint metadata
  currentEndpoint() {
    return this.meta[this.endpointUrl()];
  }

  // Load and save metadata to localStorage
  loadMetaFromLocalStorage(): EndpointsMetadata {
    const metaString = localStorage.getItem("sparql-editor-metadata");
    try {
      return metaString ? JSON.parse(metaString) : {};
    } catch (error) {
      console.warn("Error parsing metadata from local storage", error);
      localStorage.removeItem("sparql-editor-metadata");
      return {};
    }
  }
  saveMetaToLocalStorage() {
    localStorage.setItem("sparql-editor-metadata", JSON.stringify(this.meta));
  }

  // Get prefixes, VoID and examples
  async getMetadata(endpoint: string | undefined) {
    if (!endpoint) return;
    if (!this.meta[endpoint]) {
      this.meta[endpoint] = {
        void: {},
        voidQueryBindings: [],
        classes: [],
        predicates: [],
        prefixes: {},
        examples: [],
      };
    }
    if (!this.meta[endpoint].retrievedAt) {
      // Run the 3 async queries in parallel
      [
        this.meta[endpoint].examples,
        this.meta[endpoint].prefixes,
        [
          this.meta[endpoint].void,
          this.meta[endpoint].voidQueryBindings,
          this.meta[endpoint].classes,
          this.meta[endpoint].predicates,
        ],
      ] = await Promise.all([getExampleQueries(endpoint), getPrefixes(endpoint), getVoidDescription(endpoint)]);
      this.meta[endpoint].retrievedAt = new Date().toISOString();

      if (Object.keys(this.meta[endpoint].prefixes).length === 0) {
        this.meta[endpoint].prefixes = defaultPrefixes;
      }
      if (Object.keys(this.meta[endpoint].void).length === 0) {
        [this.meta[endpoint].classes, this.meta[endpoint].predicates] = await Promise.all([
          getClassesFallback(endpoint),
          getPredicatesFallback(endpoint),
        ]);
      }
      this.saveMetaToLocalStorage();
    }
  }

  // Load current endpoint in the YASGUI input box
  async loadCurrentEndpoint(endpoint: string = this.endpointUrl()) {
    // console.log("Switching endpoint", endpoint);
    const statusLight = this.querySelector("#status-light") as HTMLElement;
    const statusLink = this.querySelector("#status-link") as HTMLAnchorElement;
    statusLight.style.backgroundColor = "purple";
    statusLink.title = "Loading endpoint metadata...";
    await this.getMetadata(endpoint);
    if (this.yasgui && this.currentEndpoint()) {
      // @ts-ignore set default query when new tab
      this.yasgui.config.yasqe.value =
        this.addPrefixesToQuery(this.currentEndpoint().examples[0]?.query) || Yasgui.Yasqe.defaults.value;
    }
    Yasgui.Yasr.defaults.prefixes = this.meta[endpoint].prefixes;

    // Hide or show the Classes overview button
    const clsOverviewBtn = this.querySelector("#sparql-cls-overview-btn") as HTMLElement;
    if (Object.keys(this.meta[endpoint].void).length > 0) {
      clsOverviewBtn.style.display = "";
    } else {
      clsOverviewBtn.style.display = "none";
    }
    // Update the statusLight
    let metaScore = 0;
    let statusMsg = `📡 Endpoint ${endpoint}\n\n`;
    if (Object.keys(this.meta[endpoint].void).length > 0) {
      metaScore += 1;
      statusMsg += `✅ Found VoID-based autocomplete for ${this.meta[endpoint].classes.length} classes and ${this.meta[endpoint].predicates.length} properties\n`;
    } else {
      statusMsg += `❌ VoID description not found for autocomplete\n`;
      if (this.meta[endpoint].classes.length > 0) {
        statusMsg += `  Found ${this.meta[endpoint].classes.length} classes\n`;
      }
      if (this.meta[endpoint].predicates.length > 2) {
        statusMsg += `  Found ${this.meta[endpoint].predicates.length} predicates\n`;
      }
    }
    if (this.meta[endpoint].examples.length > 0) {
      metaScore += 1;
      statusMsg += `✅ Found ${this.meta[endpoint].examples.length} query examples\n`;
    } else {
      statusMsg += `❌ Query examples not found\n`;
    }

    if (Object.keys(this.meta[endpoint].prefixes).length === Object.keys(defaultPrefixes).length) {
      statusMsg += `⚠️ Using ${Object.keys(this.meta[endpoint].prefixes).length} default prefixes`;
    } else if (Object.keys(this.meta[endpoint].prefixes).length > 0) {
      metaScore += 1;
      statusMsg += `✅ Found ${Object.keys(this.meta[endpoint].prefixes).length} prefixes`;
    } else {
      statusMsg += `❌ Prefixes not found`;
    }
    if (metaScore === 3) statusLight.style.backgroundColor = "green";
    else if (metaScore > 0) statusLight.style.backgroundColor = "orange";
    else statusLight.style.backgroundColor = "red";
    statusLink.title = statusMsg;
    statusLink.href = `https://sib-swiss.github.io/sparql-editor/check?url=${endpoint}`;
  }

  async connectedCallback() {
    this.endpoints = (this.getAttribute("endpoint") || "").split(",").map(e => e.trim());
    this.meta = this.loadMetaFromLocalStorage();

    // NOTE: will need to be removed at some point I guess
    // Check if examples contain the index field, if not reset cache
    if (this.currentEndpoint() && this.currentEndpoint().examples?.some(example => example.iri === undefined)) {
      localStorage.removeItem("sparql-editor-metadata");
      console.warn("Invalid metadata format, resetting cache");
      this.meta = {};
    }

    // console.log("Loaded metadata from localStorage", this.meta);
    if (this.endpoints.length === 0)
      throw new Error("No endpoint provided. Please use the 'endpoint' attribute to specify the SPARQL endpoint URL.");

    this.addLimit = Number(this.getAttribute("add-limit")) || this.addLimit;
    this.examplesOnMainPage = Number(this.getAttribute("examples-on-main-page")) || this.examplesOnMainPage;
    this.examplesRepoAddUrl = this.getAttribute("examples-repo-add-url") || this.examplesRepoAddUrl;
    this.examplesRepo = this.getAttribute("examples-repository") || this.examplesRepo;
    if (this.examplesRepoAddUrl && !this.examplesRepo) this.examplesRepo = this.examplesRepoAddUrl.split("/new/")[0];

    hljs.registerLanguage("ttl", hljsDefineTurtle);
    hljs.registerLanguage("sparql", hljsDefineSparql);

    const defaultMethod = (this.getAttribute("default-method")?.toUpperCase() as "GET" | "POST") || "GET";
    if (!["GET", "POST"].includes(defaultMethod))
      console.warn("Default method is wrong, should be GET or POST", defaultMethod);

    const styleEl = document.createElement("style");
    styleEl.textContent = `
      ${yasguiCss}
      ${yasguiGripInlineCss}
      ${highlightjsCss}
      ${editorCss}
		`;
    if (this.endpoints.length === 1) {
      styleEl.textContent += `.yasgui .controlbar {
  display: none !important;
}`;
    }
    const saveAsExampleBtn = this.examplesRepo
      ? `<button id="sparql-save-example-btn" class="btn top-btn" title="Save the current query as example">
    Save query as example
  </button>`
      : "";
    this.className = "sparql-editor-container";
    this.innerHTML = `
<div style="width: 100%;">
  <a id="status-link" href="" target="_blank" title="Loading..." style="display: inline-flex; width: 16px; height: 16px;">
    <div id="status-light" style="width: 10px; height: 10px; background-color: purple; border-radius: 50%; margin: 0 auto;"></div>
  </a><button id="sparql-add-prefixes-btn" class="btn top-btn" title="Add prefixes commonly used in the selected endpoint to the query">
    Add common prefixes
  </button>${saveAsExampleBtn}<button id="sparql-examples-top-btn" class="btn top-btn" title="Browse examples available for the selected endpoint">
    Browse examples
  </button><button id="sparql-cls-overview-btn" class="btn top-btn" title="Overview of classes and their relations in the endpoint">
    Classes overview
  </button><button id="sparql-clear-cache-btn" class="btn top-btn" title="Refresh and update the endpoints metadata stored in the cache">
    Refresh cache
  </button><button id="sparql-toggle-examples-btn" class="btn top-btn" title="Toggle display of the examples panel">
    Toggle examples
  </button>
  <div id="yasgui"></div>
</div>`;
    this.appendChild(styleEl);
    // TODO: hide `Save query as example` button if examplesRepo is not set
    // // Hide "Save query as example" button if this.examplesRepo is not set
    // const saveExampleBtn = this.querySelector("#sparql-save-example-btn") as HTMLButtonElement;
    // if (!this.examplesRepo) {
    //   saveExampleBtn.style.display = "none";
    // }

    // NOTE: autocompleters are executed when Yasgui is instantiated
    Yasgui.Yasqe.defaults.autocompleters.splice(Yasgui.Yasqe.defaults.autocompleters.indexOf("prefixes"), 1);
    Yasgui.Yasqe.defaults.autocompleters.splice(Yasgui.Yasqe.defaults.autocompleters.indexOf("class"), 1);
    Yasgui.Yasqe.defaults.autocompleters.splice(Yasgui.Yasqe.defaults.autocompleters.indexOf("property"), 1);
    Yasgui.Yasqe.forkAutocompleter("prefixes", this.prefixesCompleter);
    Yasgui.Yasqe.forkAutocompleter("class", this.voidClassCompleter);
    Yasgui.Yasqe.forkAutocompleter("property", this.voidPropertyCompleter);
    Yasgui.defaults.requestConfig = {
      ...Yasgui.defaults.requestConfig,
      endpoint: this.endpoints[0],
      method: defaultMethod,
    };
    Yasgui.defaults.endpointCatalogueOptions = {
      ...Yasgui.defaults.endpointCatalogueOptions,
      getData: () =>
        this.endpoints.map(endpoint => ({
          endpoint: endpoint,
        })),
      renderItem: (data, source) => {
        const contentDiv = document.createElement("div");
        contentDiv.innerText = data.value.endpoint;
        source.appendChild(contentDiv);
      },
    };

    // Instantiate YASGUI editor
    const editorEl = this.querySelector("#yasgui") as HTMLElement;
    this.yasgui = new Yasgui(editorEl, {
      // Prevents conflicts when deploying multiple editors in the same domain:
      persistenceId: `yasgui_${window.location.pathname.replace(/\//g, "")}`,
      copyEndpointOnNewTab: true,
    });
    await this.loadCurrentEndpoint();
    await this.showExamples();
    await this.showOverview();

    // TODO: once https://github.com/zazuko/Yasgui/pull/31 is merged
    // Check if a # param is provided in the URL
    // If a # param is provided, search for an example that matches the IRI, and add a new tab with the query
    // console.log("currentUrl", window.location.href);
    // if (window.location.hash) {
    //   const hash = window.location.hash.substring(1);
    //   console.log(hash)
    //   const example = this.currentEndpoint().examples.find(ex => ex.iri === hash);
    //   if (example) {
    //     this.addTab(example.query, example.comment);
    //   }
    // } else {
    //   console.log("no hash")
    // }

    if (typeof window !== "undefined") {
      // If the dialog is open, close it instead of navigating
      window.addEventListener("popstate", event => {
        if (this.dialogElOpen) {
          this.closeDialog();
          event.preventDefault();
        }
      });
    }

    this.yasgui?.on("tabSelect", () => {
      setTimeout(async () => {
        await this.loadCurrentEndpoint();
        await this.showExamples();
        await this.showOverview();
      });
    });
    this.yasgui?.on("endpointHistoryChange", () => {
      setTimeout(async () => {
        await this.loadCurrentEndpoint();
        await this.showExamples(true);
        await this.showOverview();
      });
    });
    this.yasgui?.on("tabAdd", () => {
      setTimeout(() => {
        this.showExamples();
        this.showOverview();
      });
    });

    // Button to clear and update cache of SPARQL endpoints metadata
    const clearCacheBtnEl = this.querySelector("#sparql-clear-cache-btn");
    clearCacheBtnEl?.addEventListener("click", async () => {
      localStorage.removeItem("sparql-editor-metadata");
      this.meta = {};
      await this.loadCurrentEndpoint();
      await this.showExamples(true);
    });

    // Button to add all prefixes to the query
    const addPrefixesBtnEl = this.querySelector("#sparql-add-prefixes-btn");
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
      const iriCells = this.querySelectorAll(".dataTable a.iri") as NodeListOf<HTMLAnchorElement>;
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
    if (this.examplesRepo) {
      const saveExampleBtnEl = this.querySelector("#sparql-save-example-btn");
      saveExampleBtnEl?.addEventListener("click", () => {
        this.showSaveExampleDialog();
      });
    }

    // NOTE: Yasqe already automatically loads search params from the URL in the editor and run the query
    // But it does not trigger the .on("query") event, so it does not add limit
    // http://localhost:3000/?endpoint=https://sparql.uniprot.org/sparql/&query=select%20*%20where%20{?s%20?p%20?o%20.}
    // if (window.location.search) {
    //   const searchParams = new URLSearchParams(window.location.search);
    //   if (searchParams.get("query")) {
    //     this.addPrefixesToQueryInEditor();
    //     this.yasgui.getTab()?.getYasqe().query();
    //   }
    // }
  }

  // Original autocompleters: https://github.com/zazuko/Yasgui/blob/main/packages/yasqe/src/autocompleters/classes.ts#L8
  // Fork examples: https://github.com/zazuko/Yasgui/blob/main/webpack/pages/yasqe.html#L61
  prefixesCompleter: Autocompleter = {
    name: "shaclPrefixes",
    persistenceId: null,
    bulk: false,
    get: (_yasqe, token) => {
      const prefixToAutocomplete = token?.autocompletionString?.split(":")[0];
      if (prefixToAutocomplete && this.currentEndpoint().prefixes[prefixToAutocomplete]) {
        return [`${prefixToAutocomplete}: <${this.currentEndpoint().prefixes[prefixToAutocomplete]}>`];
      }
      return [];
    },
  };
  voidClassCompleter: Autocompleter = {
    name: "voidClass",
    bulk: false,
    get: (_yasqe, token) => {
      if (token?.autocompletionString !== undefined)
        return this.currentEndpoint().classes.filter(iri => iri.indexOf(token.autocompletionString!) === 0);
      return this.currentEndpoint().classes;
    },
    postProcessSuggestion: (_yasqe, token, suggestedString) => {
      return this.postProcessSuggestion(token, suggestedString);
    },
  };
  voidPropertyCompleter: Autocompleter = {
    name: "voidProperty",
    bulk: false,
    get: async (yasqe, token) => {
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
            if (token?.autocompletionString !== undefined) {
              types.forEach(typeCurie => {
                Object.keys(this.meta[cursorEndpoint].void[this.curieToUri(typeCurie)])
                  .filter(prop => prop.indexOf(token.autocompletionString!) === 0)
                  .forEach(prop => {
                    suggestPreds.add(prop);
                  });
              });
            }
          } catch (error) {
            console.warn("Error getting properties for autocomplete:", error);
          }
          // console.log("suggestPreds", suggestPreds)
          if (suggestPreds.size > 0) return Array.from(suggestPreds).sort();
        }
      }
      if (token?.autocompletionString !== undefined)
        return this.meta[cursorEndpoint].predicates.filter(iri => iri.indexOf(token.autocompletionString!) === 0);
      return this.meta[cursorEndpoint].predicates;
    },
    isValidCompletionPosition: yasqe => {
      const token: any = yasqe.getCompleteToken();
      if (token.string[0] === "?" || token.string[0] === "$") return false; // we are typing a var
      if (token.state.possibleCurrent.indexOf("a") >= 0) return true; // predicate pos
      return false;
    },
    postProcessSuggestion: (_yasqe, token, suggestedString) => {
      return this.postProcessSuggestion(token, suggestedString);
    },
  };

  postProcessSuggestion(token: AutocompletionToken, suggestedString: string) {
    if (token.tokenPrefix && token.autocompletionString && token.tokenPrefixUri) {
      // we need to get the suggested string back to prefixed form
      suggestedString = token.tokenPrefix + suggestedString.substring(token.tokenPrefixUri.length);
    } else {
      // Convert the suggested URI to prefixed form when possible
      suggestedString = compressUri(this.currentEndpoint().prefixes, suggestedString) || "<" + suggestedString + ">";
    }
    return suggestedString;
  }

  openDialog(dialogEl: HTMLDialogElement) {
    dialogEl.showModal();
    this.dialogElOpen = dialogEl;
    history.pushState({dialogOpen: true}, "");
    document.body.style.overflow = "hidden";
  }

  closeDialog() {
    if (this.dialogElOpen) {
      this.dialogElOpen.close();
      this.dialogElOpen = undefined;
      document.body.style.overflow = "";
      // history.back();
    }
  }

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
          <button type="button" class="btn" id="close-save-dialog-btn">Cancel</button>
        </div>
      </form>
    `;
    this.appendChild(dialog);
    this.openDialog(dialog);
    const descriptionInput = dialog.querySelector("#description") as HTMLInputElement;
    descriptionInput.focus();

    dialog.querySelector("#close-save-dialog-btn")?.addEventListener("click", () => {
      this.closeDialog();
    });
    dialog.addEventListener("close", () => {
      this.closeDialog();
    });

    const generateShacl = () => {
      const description = (dialog.querySelector("#description") as HTMLTextAreaElement).value;
      const keywordsStr = (dialog.querySelector("#keywords") as HTMLInputElement).value
        .split(",")
        .map((kw: string) => `"${kw.trim()}"`)
        .join(", ");
      const queryType = capitalize(this.yasgui?.getTab()?.getYasqe().getQueryType() || "Select");
      const keywordsBit = keywordsStr.length > 2 ? `schema:keywords ${keywordsStr} ;\n  ` : "";
      const exampleUri = (dialog.querySelector("#example-uri") as HTMLInputElement).value;
      return [
        `@prefix ex: <${this.examplesNamespace()}> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix schema: <https://schema.org/> .
@prefix sh: <http://www.w3.org/ns/shacl#> .

ex:${exampleUri} a sh:SPARQLExecutable${
          ["Select", "Construct", "Ask"].includes(queryType) ? `, sh:SPARQL${queryType}Executable` : ""
        } ;
  rdfs:comment "${description}"@en ;
  sh:prefixes _:sparql_examples_prefixes ;
  sh:${queryType.toLowerCase()} """${this.yasgui?.getTab()?.getYasqe().getValue()}""" ;
  ${keywordsBit}schema:target <${this.endpointUrl()}> .`,
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
      this.closeDialog();
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

  toggleExamplesVisibility() {
    const exampleQueriesEl = this.querySelector(".active .sparql-examples") as HTMLElement;
    if (exampleQueriesEl) {
      exampleQueriesEl.style.display = exampleQueriesEl.style.display === "none" ? "block" : "none";
    }
  }

  async showOverview() {
    const overviewBtn = this.querySelector("#sparql-cls-overview-btn") as HTMLButtonElement;
    const existingOverviewDialog = this.querySelector("#sparql-cls-overview-dialog") as HTMLDialogElement;
    if (existingOverviewDialog) existingOverviewDialog.remove();
    const overviewDialog = document.createElement("dialog");
    // Create dialog for overview
    overviewDialog.id = "sparql-cls-overview-dialog";
    overviewDialog.style.width = "100%";
    overviewDialog.style.height = "100%";
    // overviewDialog.innerHTML = `<div style="height: 100%;">
    //   <sparql-overview endpoint="${this.endpointUrl()}"></sparql-overview>
    // </div>`;
    overviewDialog.innerHTML = `<div id="sparql-overview" style="height: 100%;"></div>`;
    const overviewEl = overviewDialog.querySelector("#sparql-overview") as HTMLElement;
    new SparqlOverview(
      overviewEl,
      {[this.endpointUrl()]: this.currentEndpoint().voidQueryBindings},
      this.currentEndpoint().prefixes,
      // [this.currentEndpoint().void, this.currentEndpoint().classes, this.currentEndpoint().predicates],
    );

    // Add button to close dialog
    const dialogCloseBtn = document.createElement("button");
    // dialogCloseBtn.className = "btn closeBtn";
    dialogCloseBtn.textContent = "Close";
    dialogCloseBtn.style.position = "fixed";
    dialogCloseBtn.style.top = "1.5em";
    dialogCloseBtn.style.right = "2em";
    overviewDialog.appendChild(dialogCloseBtn);
    this.appendChild(overviewDialog);

    // Remove previous event listeners
    overviewBtn.replaceWith(overviewBtn.cloneNode(true));
    const newOverviewBtn = this.querySelector("#sparql-cls-overview-btn") as HTMLButtonElement;

    newOverviewBtn.addEventListener("click", () => {
      this.openDialog(overviewDialog);
      // Trigger the rendering of the graph to make sure it is properly displayed
      // const overviewEl = overviewDialog.querySelector("sparql-overview") as HTMLElement;
      overviewEl.dispatchEvent(new Event("render"));
    });
    dialogCloseBtn.addEventListener("click", () => {
      this.closeDialog();
    });
    overviewDialog.addEventListener("close", () => {
      this.closeDialog();
    });
  }

  async showExamples(forceReload: boolean = false) {
    // Display examples on the main page and in a dialog for the currently selected endpoint
    const existingExampleQueriesEl = this.querySelector(".active .sparql-examples") as HTMLButtonElement;
    const examplesTopBtnEl = this.querySelector("#sparql-examples-top-btn") as HTMLButtonElement;
    const toggleExamplesBtn = this.querySelector("#sparql-toggle-examples-btn") as HTMLButtonElement;
    const btnTextContent = `Browse ${this.currentEndpoint().examples.length} examples`;
    if (this.currentEndpoint().examples.length === 0) {
      existingExampleQueriesEl?.remove();
      examplesTopBtnEl.style.display = "none";
      toggleExamplesBtn.style.display = "none";
      return;
    } else {
      examplesTopBtnEl.textContent = btnTextContent;
      examplesTopBtnEl.title = `${btnTextContent} available for the selected endpoint`;
      examplesTopBtnEl.style.display = "inline-block";
      toggleExamplesBtn.style.display = "inline-block";
      toggleExamplesBtn.addEventListener("click", () => this.toggleExamplesVisibility());
    }
    if (existingExampleQueriesEl && !forceReload) {
      return;
    }
    if (existingExampleQueriesEl) existingExampleQueriesEl?.remove();
    const yasqeEl = this.querySelector(".active .yasqe") as HTMLElement;
    const yasqeElParent = yasqeEl.parentElement as HTMLElement;

    const exampleQueriesEl = document.createElement("div");
    exampleQueriesEl.className = "sparql-examples";
    exampleQueriesEl.innerHTML = "";
    // TODO: remove title for examples?
    const exQueryTitleDiv = document.createElement("div");
    exQueryTitleDiv.style.textAlign = "center";
    const exQueryTitle = document.createElement("h3");
    exQueryTitle.style.margin = "0.1em";
    exQueryTitle.style.fontWeight = "200";
    exQueryTitle.textContent = "Examples";
    exQueryTitleDiv.appendChild(exQueryTitle);
    exQueryTitleDiv.appendChild(exQueryTitle);
    exampleQueriesEl.appendChild(exQueryTitleDiv);

    // Create dialog for examples
    const exQueryDialog = document.createElement("dialog");
    // exQueryDialog.style.margin = "1em";
    // exQueryDialog.style.width = "calc(100vw - 8px)";
    exQueryDialog.style.width = "100%";
    exQueryDialog.style.height = "100%";
    exQueryDialog.style.borderColor = "#cccccc";
    exQueryDialog.style.backgroundColor = "#f5f5f5";
    exQueryDialog.style.borderRadius = "10px";

    // Add search bar for examples
    const searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.placeholder = "Search examples...";
    searchInput.className = "sparql-search-examples-input";
    exQueryDialog.appendChild(searchInput);

    // Add button to close dialog
    const exDialogCloseBtn = document.createElement("button");
    exDialogCloseBtn.className = "btn closeBtn";
    exDialogCloseBtn.textContent = "Close";
    exDialogCloseBtn.style.position = "fixed";
    exDialogCloseBtn.style.top = "1.5em";
    exDialogCloseBtn.style.right = "2em";
    exQueryDialog.appendChild(exDialogCloseBtn);
    yasqeElParent.appendChild(exQueryDialog);

    // Add examples to the main page
    this.currentEndpoint()
      .examples.slice(0, this.examplesOnMainPage)
      .forEach(example => {
        const exQueryDiv = document.createElement("div");
        exQueryDiv.className = "sparql-main-examples";
        const exQueryP = document.createElement("p");
        exQueryP.style.fontSize = "0.9em";
        exQueryP.innerHTML = `${example.index}. ${example.comment}`;

        // Create use button
        const useBtn = createUseButton();
        useBtn.addEventListener("click", () => {
          this.addTab(example.query, example.comment);
        });
        exQueryP.appendChild(useBtn);
        exQueryDiv.appendChild(exQueryP);
        exampleQueriesEl.appendChild(exQueryDiv);
      });

    // Function to display and filter examples in the dialog
    const displayExamples = (filteredExamples: any[]) => {
      // Clear the dialog content before adding filtered examples
      exQueryDialog.querySelectorAll(".sparql-all-examples").forEach(item => item.remove());

      filteredExamples.forEach(example => {
        const exQueryDiv = document.createElement("div");
        exQueryDiv.className = "sparql-all-examples";
        const exQueryP = document.createElement("p");
        exQueryP.style.fontSize = "0.9em";
        exQueryP.innerHTML = `${example.index}. ${example.comment}`;

        // Create use button
        const useBtn = createUseButton();
        useBtn.addEventListener("click", () => {
          this.addTab(example.query, example.comment);
          this.closeDialog();
        });
        exQueryP.appendChild(useBtn);
        exQueryDiv.appendChild(exQueryP);

        // Add query to dialog using pre/code
        const exQueryPre = document.createElement("pre");
        const exQueryCode = document.createElement("code");
        exQueryCode.className = "language-sparql hljs";
        exQueryCode.style.borderRadius = "10px";
        exQueryPre.style.borderRadius = "10px";
        exQueryPre.style.backgroundColor = "#cccccc";
        exQueryPre.style.padding = "0.1em";
        exQueryCode.innerHTML = hljs.highlight(example.query.trim(), {language: "sparql"}).value;
        exQueryPre.appendChild(exQueryCode);
        exQueryDiv.appendChild(exQueryPre);

        exQueryDialog.appendChild(exQueryDiv);

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
      });
    };

    // Add examples initially
    displayExamples(this.currentEndpoint().examples);

    // Add event listener for search input
    searchInput.addEventListener("input", () => {
      const searchTerm = searchInput.value.toLowerCase();
      const filteredExamples = this.currentEndpoint().examples.filter(example => {
        return example.comment.toLowerCase().includes(searchTerm) || example.query.toLowerCase().includes(searchTerm);
      });
      displayExamples(filteredExamples);
    });

    // Add button to open dialog
    const openExDialogBtn = document.createElement("button");
    openExDialogBtn.textContent = btnTextContent;
    openExDialogBtn.title = `${btnTextContent} available for the selected endpoint`;
    openExDialogBtn.className = "btn";
    exampleQueriesEl.appendChild(openExDialogBtn);

    examplesTopBtnEl.addEventListener("click", () => {
      this.openDialog(exQueryDialog);
    });
    openExDialogBtn.addEventListener("click", () => {
      this.openDialog(exQueryDialog);
      // exQueryDialog.scrollTop = 0;
    });
    exDialogCloseBtn.addEventListener("click", () => {
      this.closeDialog();
    });
    exQueryDialog.addEventListener("close", () => {
      this.closeDialog();
    });

    // Add the examples next to the YASQE editor
    yasqeEl.style.width = "100%";
    exampleQueriesEl.style.width = "50%";
    exampleQueriesEl.style.height = "fit-content";
    yasqeElParent.style.display = "flex";
    yasqeElParent.appendChild(exampleQueriesEl);
    setTimeout(() => {
      if (exampleQueriesEl.offsetHeight > 0) {
        const yasqe = this.yasgui?.getTab()?.getYasqe();
        yasqe?.setSize(null, `${exampleQueriesEl.offsetHeight}px`);
      }
    });
  }

  addPrefixesToQuery(query: string) {
    // Add prefixes to a query without using YASGUI
    // Required to add prefixes to the query before creating the YASGUI editor
    const sortedKeys = Object.keys(this.currentEndpoint()?.prefixes).sort();
    for (const key of sortedKeys) {
      const value = this.currentEndpoint().prefixes[key];
      const pref: {[index: string]: string} = {};
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
      const pref: {[index: string]: string} = {};
      pref[key] = value;
      const prefix = "PREFIX " + key + " ?: ?<" + value;
      if (!new RegExp(prefix, "g").test(query) && new RegExp("[(| |\u00a0|/|^]" + key + ":", "g").test(query)) {
        this.yasgui?.getTab()?.getYasqe().addPrefixes(pref);
      }
    }
  }

  addTab(query: string, label: string) {
    this.yasgui?.addTab(true, {
      ...Yasgui.Tab.getDefaults(),
      name: generateTabLabel(label),
      requestConfig: {
        ...Yasgui.defaults.requestConfig,
        endpoint: this.endpointUrl(),
      },
      yasqe: {value: query},
    });
    this.addPrefixesToQueryInEditor();
  }

  createDescribeUrl(resourceUrl: string) {
    return `?query=${encodeURIComponent(`DESCRIBE <${resourceUrl}>`)}&endpoint=${this.endpointUrl()}`;
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

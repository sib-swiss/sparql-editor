import Yasgui from "@zazuko/yasgui";
import hljs from "highlight.js/lib/core";
// import mermaid from "mermaid";
// import { translate } from "sparqlalgebrajs";
// Or Use SPARQL.js directly?

import {hljsDefineTurtle, hljsDefineSparql} from "./highlight-sparql";
import {editorCss, yasguiCss, yasguiGripInlineCss, highlightjsCss} from "./styles";

type ExampleQuery = {
  comment: string;
  query: string;
};

interface SparqlResultBindings {
  [key: string]: {
    value: string;
    type: string;
  };
}

interface VoidDict {
  [key: string]: {
    [key: string]: string[];
  };
}

/**
 * Custom element to create a SPARQL editor for a given endpoint using YASGUI
 * with autocompletion for classes and properties based on VoID description stored in the endpoint
 * and prefixes defined using SHACL in the endpoint
 * @example <sparql-editor endpoint="https://sparql.uniprot.org/sparql/" examples-on-main-page="10"></sparql-editor>
 */
export class SparqlEditor extends HTMLElement {
  endpointUrl: string;
  examplesOnMainPage: number;
  yasgui: Yasgui | undefined;
  exampleQueries: ExampleQuery[];
  urlParams: any;
  prefixes: Map<string, string>;
  voidDescription: VoidDict;

  constructor() {
    super();
    this.attachShadow({mode: "open"});

    this.endpointUrl = this.getAttribute("endpoint") || "";
    if (this.endpointUrl === "")
      throw new Error("No endpoint provided. Please use the 'endpoint' attribute to specify the SPARQL endpoint URL.");

    this.examplesOnMainPage = Number(this.getAttribute("examples-on-main-page")) || 10;
    this.exampleQueries = [];

    const style = document.createElement("style");
    style.textContent = `
      ${yasguiCss}
      ${yasguiGripInlineCss}
      ${highlightjsCss}
      ${editorCss}
		`;

    const container = document.createElement("div");
    container.className = "container";
    container.innerHTML = `
      <div id="sparql-editor">
        <button id="sparql-add-prefixes-btn" class="btn" style="margin-bottom: 0.3em;">Add common prefixes</button>
        <button id="sparql-save-example-btn" class="btn" style="margin-bottom: 0.3em;">Save query as example</button>
        <div id="yasgui"></div>
      </div>
      <div>
        <div id="sparql-examples"></div>
        <slot></slot>
      </div>
    `;
    this.shadowRoot?.appendChild(style);
    this.shadowRoot?.appendChild(container);

    // Initialize prefixes with some defaults
    this.prefixes = new Map([
      ["rdf", "http://www.w3.org/1999/02/22-rdf-syntax-ns#"],
      ["rdfs", "http://www.w3.org/2000/01/rdf-schema#"],
      ["xsd", "http://www.w3.org/2001/XMLSchema#"],
      ["owl", "http://www.w3.org/2002/07/owl#"],
      ["skos", "http://www.w3.org/2004/02/skos/core#"],
      ["up", "http://purl.uniprot.org/core/"],
      ["keywords", "http://purl.uniprot.org/keywords/"],
      ["uniprotkb", "http://purl.uniprot.org/uniprot/"],
      ["taxon", "http://purl.uniprot.org/taxonomy/"],
      ["ec", "http://purl.uniprot.org/enzyme/"],
      ["bibo", "http://purl.org/ontology/bibo/"],
      ["dc", "http://purl.org/dc/terms/"],
      ["faldo", "http://biohackathon.org/resource/faldo#"],
    ]);
    this.voidDescription = {};

    // NOTE: autocompleters get are executed when Yasgui is instantiated
    Yasgui.Yasqe.defaults.autocompleters.splice(Yasgui.Yasqe.defaults.autocompleters.indexOf("prefixes"), 1);
    Yasgui.Yasqe.forkAutocompleter("prefixes", this.prefixesCompleter);
    Yasgui.Yasqe.forkAutocompleter("class", this.voidClassCompleter);
    Yasgui.Yasqe.forkAutocompleter("property", this.voidPropertyCompleter);
    Yasgui.defaults.requestConfig = {
      ...Yasgui.defaults.requestConfig,
      endpoint: this.endpointUrl,
      method: "GET",
    };
    hljs.registerLanguage("ttl", hljsDefineTurtle);
    hljs.registerLanguage("sparql", hljsDefineSparql);
  }

  async connectedCallback() {
    // Get prefixes and examples, and set default config for YASGUI
    await this.getExampleQueries();
    await this.getPrefixes();
    await this.getVoidDescription();
    Yasgui.Yasqe.defaults.value = this.addPrefixesToQuery(this.exampleQueries[0]?.query) || Yasgui.Yasqe.defaults.value;
    Yasgui.Yasr.defaults.prefixes = Object.fromEntries(this.prefixes);

    // TODO: make exampleQueries a dict with the query IRI as key, so if the window.location matches a key, it will load the query?

    // Instantiate YASGUI editor
    const editorEl = this.shadowRoot?.getElementById("yasgui") as HTMLElement;
    this.yasgui = new Yasgui(editorEl, {
      copyEndpointOnNewTab: true,
    });

    // mermaid.initialize({ startOnLoad: false });
    // await mermaid.run({
    //     querySelector: '.language-mermaid',
    // });

    // Button to add all prefixes to the query
    const addPrefixesBtnEl = this.shadowRoot?.getElementById("sparql-add-prefixes-btn");
    addPrefixesBtnEl?.addEventListener("click", () => {
      const sortedPrefixes: any = {};
      for (const key of [...this.prefixes.keys()].sort()) {
        sortedPrefixes[key] = this.prefixes.get(key);
      }
      this.yasgui?.getTab()?.getYasqe().addPrefixes(sortedPrefixes);
      this.yasgui?.getTab()?.getYasqe().collapsePrefixes(true);
    });

    this.yasgui.on("query", (_y, tab) => {
      const ye = tab.getYasqe();
      tab.getYasr().config.prefixes = {...Yasgui.Yasr.defaults.prefixes, ...ye.getPrefixesFromQuery()};

      // // Add limit to query if not provided
      // const limitPattern = /LIMIT\s+\d+\s*$/i;
      // const trimmedQuery = ye.getValue().trim();
      // if ((ye.getQueryType() === "SELECT" || ye.getQueryType() === "CONSTRUCT") && !limitPattern.test(trimmedQuery)) {
      //   ye.abortQuery();
      //   ye.setValue(trimmedQuery + " LIMIT 1000");
      //   ye.query();
      // }
      // NOTE: aborting the query generates an error in console
      // TODO: it should be handled by an event fired before the query is sent https://github.com/zazuko/Yasgui/pull/16
    });

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
    const addExampleBtnEl = this.shadowRoot?.getElementById("sparql-save-example-btn");
    const capitalize = (str: any) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    addExampleBtnEl?.addEventListener("click", () => {
      const dialog = document.createElement("dialog");
      dialog.style.width = "400px";
      dialog.style.padding = "1em";
      dialog.style.borderRadius = "8px";
      dialog.style.borderColor = "#cccccc";
      // <textarea id="description" name="description" rows="4" style="width: 100%;"></textarea><br><br>
      dialog.innerHTML = `
        <form id="example-form" method="dialog">
          <h3>Save query as example</h3>
          <p>Save the current query as an example in a turtle file that you can then submit to the repository where all examples are stored.</p>
          <label for="description">Description:</label><br>
          <input type="text" id="description" name="description" style="width: 100%;" maxlength="200"><br><br>
          <label for="keywords">Keywords (optional, comma separated):</label><br>
          <input type="text" id="keywords" name="keywords" style="width: 100%;"><br><br>
          <button type="submit" class="btn">Save</button>
          <button type="button" class="btn" onclick="this.closest('dialog').close()">Cancel</button>
        </form>
      `;
      this.shadowRoot?.appendChild(dialog);
      dialog.showModal();
      dialog.querySelector("#example-form")?.addEventListener("submit", (e) => {
        e.preventDefault();
        const description = (dialog.querySelector("#description") as HTMLTextAreaElement).value;
        const keywordsStr = (dialog.querySelector("#keywords") as HTMLInputElement).value.split(",").map((kw: string) => `"${kw.trim()}"`).join(', ');
        const queryType = capitalize(this.yasgui?.getTab()?.getYasqe().getQueryType())
        const endpointUrlWithSlash = this.endpointUrl.endsWith('/') ? this.endpointUrl : `${this.endpointUrl}/`;
        const exampleNumberForId = (this.exampleQueries.length + 1).toString().padStart(3, '0');
        const keywordsBit = keywordsStr.length > 2 ? `schema:keyword ${keywordsStr} ;\n    ` : '';

        const shaclStr = `@prefix ex: <${endpointUrlWithSlash}.well-known/sparql-examples/> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix schema: <https://schema.org/> .
@prefix sh: <http://www.w3.org/ns/shacl#> .

ex:${exampleNumberForId} a sh:SPARQLExecutable${['Select', 'Construct', "Ask"].includes(queryType) ? `,
        sh:SPARQL${queryType}Executable` : ''} ;
    rdfs:comment "${description}"@en ;
    sh:prefixes _:sparql_examples_prefixes ;
    sh:${queryType.toLowerCase()} """${this.yasgui?.getTab()?.getYasqe().getValue()}""" ;
    ${keywordsBit}schema:target <${this.endpointUrl}> .`

        const dataStr = `data:text/turtle;charset=utf-8,${encodeURIComponent(shaclStr)}`;
        const downloadAnchor = document.createElement("a");
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `${exampleNumberForId}.ttl`);
        downloadAnchor.click();
        dialog.close();
      });
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

  // TODO: there is a SUGGESTIONS_LIMIT of 100 on the get. So doing filtering in postProcessHints is not ideal...
  // Best would be to have a way to filter the results in the get method directly
  // (it will also reduce the amount of SPARQL request done!)
  // It ctreates problem with UniProt query3 up:Natural_Variant_Annotation

  // Original autocompleters: https://github.com/zazuko/Yasgui/blob/main/packages/yasqe/src/autocompleters/classes.ts#L8
  // Fork examples: https://github.com/zazuko/Yasgui/blob/main/webpack/pages/yasqe.html#L61
  prefixesCompleter = {
    name: "shaclPrefixes",
    persistenceId: null,
    bulk: true,
    get: async () => {
      const prefixArray: string[] = [];
      this.prefixes.forEach((ns, prefix) => prefixArray.push(`${prefix}: <${ns}>`));
      return prefixArray.sort();
    },
  };
  voidClassCompleter = {
    name: "voidClass",
    bulk: true,
    get: async (yasqe: any) => {
      try {
        const queryResults = await this.queryEndpoint(`PREFIX void: <http://rdfs.org/ns/void#>
          SELECT DISTINCT ?class
          WHERE { [] void:class ?class }
          ORDER BY ?class`);
        const clsList: string[] = [];
        queryResults.forEach(b => {
          clsList.push(b.class.value);
        });
        if (clsList.length > 0) {
          delete yasqe.autocompleters["class"];
        } else {
          console.warn("No classes found in the VoID description");
        }
        return clsList;
      } catch (error) {
        console.warn(`Error retrieving classes for autocomplete from ${this.endpointUrl} VoID description:`, error);
        return [];
      }
    },
  };
  voidPropertyCompleter = {
    name: "voidProperty",
    bulk: true,
    get: async (yasqe: any) => {
      try {
        const queryResults = await this.queryEndpoint(`PREFIX void: <http://rdfs.org/ns/void#>
          SELECT DISTINCT ?property
          WHERE { [] void:linkPredicate|void:property ?property }
          ORDER BY ?property`);
        const propsList: string[] = [];
        queryResults.forEach(b => {
          propsList.push(b.property.value);
        });
        if (propsList.length > 0) {
          delete yasqe.autocompleters["property"];
        } else {
          console.warn("No properties found in the VoID description");
        }
        return propsList;
      } catch (error) {
        console.warn(`Error retrieving properties for autocomplete from ${this.endpointUrl} VoID description:`, error);
        return [];
      }
    },
    postprocessHints: (yasqe: any, hints: any) => {
      // We retrieve the subject at the cursor position and all subjects/types in the query using regex
      // Not perfect, but we can't parse the whole query with SPARQL.js since it's not fully written yet
      // And it would throw an error if the query is not valid
      const cursor = yasqe.getCursor();
      const subj = getSubjectForCursorPosition(yasqe.getValue(), cursor.line, cursor.ch);
      const subjTypes = extractAllSubjectsAndTypes(yasqe.getValue());
      // console.log("subj, subjTypes, unfiltered hints", subj, subjTypes, hints)
      if (subj && subjTypes.has(subj) && Object.keys(this.voidDescription).length > 0) {
        const types = subjTypes.get(subj);
        // console.log("types", types)
        if (types) {
          const filteredHints = new Set();
          types.forEach(typeCurie => {
            const propSet = new Set(Object.keys(this.voidDescription[this.curieToUri(typeCurie)]));
            // console.log("propSet hints", propSet, hints)
            hints
              .filter((obj: any) => {
                // console.log("Filter hints", obj.text, this.curieToUri(obj.text), this.curieToUri(obj.text).replace(/^<|>$/g, ""))
                return propSet.has(this.curieToUri(obj.text).replace(/^<|>$/g, ""));
              })
              .forEach((obj: any) => {
                filteredHints.add(obj);
              });
            // console.log("filtered hints", hints, filteredHints)
          });
          return Array.from(filteredHints);
        }
      }
      return hints;
    },
    isValidCompletionPosition: (yasqe: any) => {
      const token = yasqe.getCompleteToken();
      if (token.string[0] === "?" || token.string[0] === "$") return false; // we are typing a var
      if (token.state.possibleCurrent.indexOf("a") >= 0) return true; // predicate pos
      return false;
    },
  };

  addPrefixesToQuery(query: string) {
    // Add prefixes to a query without using YASGUI
    // Required to add prefixes to the query before creating the YASGUI editor
    const sortedKeys = [...this.prefixes.keys()].sort();
    for (const key of sortedKeys) {
      const value = this.prefixes.get(key);
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
    const sortedKeys = [...this.prefixes.keys()].sort();
    for (const key of sortedKeys) {
      const value = this.prefixes.get(key);
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

  async queryEndpoint(query: string): Promise<SparqlResultBindings[]> {
    // We add `&ac=1` to all the queries to exclude these queries from stats
    const response = await fetch(`${this.endpointUrl}?ac=1&query=${encodeURIComponent(query)}`, {
      signal: AbortSignal.timeout(5000),
      headers: {
        Accept: "application/json",
      },
    });
    // console.log(await response.text());
    const json = await response.json();
    return json.results.bindings;
  }

  async getPrefixes() {
    // Get prefixes from the SPARQL endpoint using SHACL
    try {
      const queryResults = await this.queryEndpoint(`PREFIX sh: <http://www.w3.org/ns/shacl#>
        SELECT DISTINCT ?prefix ?namespace
        WHERE { [] sh:namespace ?namespace ; sh:prefix ?prefix}
        ORDER BY ?prefix`);
      queryResults.forEach(b => {
        this.prefixes.set(b.prefix.value, b.namespace.value);
      });
    } catch (error) {
      console.warn(`Error retrieving Prefixes from ${this.endpointUrl}:`, error);
    }
  }

  async getVoidDescription() {
    // Get VoID description to get classes and properties for advanced autocomplete
    try {
      const queryResults = await this.queryEndpoint(`PREFIX up: <http://purl.uniprot.org/core/>
        PREFIX void: <http://rdfs.org/ns/void#>
        PREFIX void-ext: <http://ldf.fi/void-ext#>
        SELECT DISTINCT ?class1 ?prop ?class2 ?datatype
        WHERE {
            ?cp void:class ?class1 ;
                void:propertyPartition ?pp .
            ?pp void:property ?prop .
            OPTIONAL {
                {
                    ?pp  void:classPartition [ void:class ?class2 ] .
                } UNION {
                    ?pp void-ext:datatypePartition [ void-ext:datatype ?datatype ] .
                }
            }
        }`);
      queryResults.forEach(b => {
        if (!(b.class1.value in this.voidDescription)) this.voidDescription[b.class1.value] = {};
        if (!(b.prop.value in this.voidDescription[b.class1.value]))
          this.voidDescription[b.class1.value][b.prop.value] = [];
        if ("class2" in b) this.voidDescription[b.class1.value][b.prop.value].push(b.class2.value);
        if ("datatype" in b) this.voidDescription[b.class1.value][b.prop.value].push(b.datatype.value);
      });
    } catch (error) {
      console.warn(`Error retrieving VoID description from ${this.endpointUrl} for autocomplete:`, error);
    }
  }

  async getExampleQueries() {
    // Retrieve example queries from the SPARQL endpoint
    const exampleQueriesEl = this.shadowRoot?.getElementById("sparql-examples") as HTMLElement;
    try {
      const queryResults = await this.queryEndpoint(`PREFIX sh: <http://www.w3.org/ns/shacl#>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        SELECT DISTINCT ?sq ?comment ?query
        WHERE {
          ?sq a sh:SPARQLExecutable ;
            rdfs:label|rdfs:comment ?comment ;
            sh:select|sh:ask|sh:construct|sh:describe ?query .
        } ORDER BY ?sq`);
      queryResults.forEach(b => {
        this.exampleQueries.push({comment: b.comment.value, query: b.query.value});
      });
      console.log(queryResults);
      if (this.exampleQueries.length === 0) return;

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
      this.exampleQueries.forEach(async (example, index) => {
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
    } catch (error) {
      console.warn(`Error fetching or processing example queries from ${this.endpointUrl}:`, error);
    }
  }

  // Function to convert CURIE to full URI using the prefix map
  curieToUri(curie: string) {
    // if (/^[a-zA-Z][a-zA-Z0-9]*:[a-zA-Z][a-zA-Z0-9_-]*$/.test(curie)) {
    if (/^[a-zA-Z][\w.-]*:[\w.-]+$/.test(curie)) {
      const [prefix, local] = curie.split(":");
      const namespace = this.prefixes.get(prefix);
      return namespace ? `${namespace}${local}` : curie; // Return as-is if prefix not found
    } else {
      // If it's already a full URI, return as-is
      return curie;
    }
  }



}

function extractAllSubjectsAndTypes(query: string): Map<string, Set<string>> {
  // Extract all subjects and their types from a SPARQL query in the process of being written
  const subjectTypeMap = new Map<string, Set<string>>();
  // Remove comments and string literals, and prefixes lines to avoid false matches
  const cleanQuery = query
    .replace(/^#.*$/gm, "")
    .replace(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/^PREFIX\s+.*$/gim, "")
    .replace(/;\s*\n/g, "; ") // Put all triple patterns on a single line
    .replace(/;\s*$/g, "; ");
  // console.log(cleanQuery)
  const typePattern =
    /\s*(\?\w+|<[^>]+>|\w+:\w*).*?\s+(?:a|rdf:type|<http:\/\/www\.w3\.org\/1999\/02\/22-rdf-syntax-ns#type>)\s+([^\s.]+(?:\s*,\s*[^\s.]+)*)\s*(?:;|\.)/g;
  let match;
  while ((match = typePattern.exec(cleanQuery)) !== null) {
    const subject = match[1];
    const types = match[2].split(/\s*,\s*/); // Split types separated by commas
    if (!subjectTypeMap.has(subject)) {
      subjectTypeMap.set(subject, new Set());
    }
    const subjectTypes = subjectTypeMap.get(subject)!;
    types.forEach(type => subjectTypes.add(type));
  }
  return subjectTypeMap;
}

function getSubjectForCursorPosition(query: string, lineNumber: number, charNumber: number): string | null {
  // Extract the subject relevant to the cursor position from a SPARQL query
  const lines = query.split("\n");
  const currentLine = lines[lineNumber];
  // Extract the part of the line up to the cursor position
  const partOfLine = currentLine.slice(0, charNumber);
  const partialQuery = lines.slice(0, lineNumber).join("\n") + "\n" + partOfLine;
  // Put all triple patterns on a single line
  const cleanQuery = partialQuery.replace(/;\s*\n/g, "; ").replace(/;\s*$/g, "; ");
  const partialLines = cleanQuery.split("\n");
  const lastLine = partialLines[partialLines.length - 1];
  const subjectMatch = lastLine.match(/\s*([?\w]+|<[^>]+>|\w+:\w*)\s+/);
  if (subjectMatch) {
    return subjectMatch[1];
  }
  return null;
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

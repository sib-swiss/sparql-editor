import Yasgui from "@zazuko/yasgui";
import hljs from "highlight.js/lib/core";
// import mermaid from "mermaid";
// import { translate } from "sparqlalgebrajs";

import {hljsDefineTurtle, hljsDefineSparql} from "./highlight-sparql";
import {editorCss, yasguiCss, yasguiGripInlineCss, highlightjsCss} from "./styles";

type ExampleQuery = {
  comment: string;
  query: string;
};

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
				<div id="yasgui"></div>
			</div>
			<div id="sparql-examples"></div>
    `;
    this.shadowRoot?.appendChild(style);
    this.shadowRoot?.appendChild(container);

    // NOTE: Alternative way to create the template. But I find it super ugly to need to clone the template content...
    // const template = document.createElement('template');
    // template.innerHTML = `
    //   <div style="display: flex; flex-direction: row;">
    // 		<div id="sparql-editor" style="flex: 0 0 70%; margin-right: 1em;">
    // 			<button id="sparql-add-prefixes-btn" style="margin-bottom: 0.3em;">Add common prefixes</button>
    // 			<div id="yasgui"></div>
    // 		</div>
    // 		<div id="sparql-examples" style="flex: 1; border-left: 1px solid #ccc; padding-left: 1em;"></div>
    // 	</div>
    // `;
    // this.shadowRoot?.appendChild(template.content.cloneNode(true));

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

    Yasgui.Yasqe.forkAutocompleter("class", this.voidClassCompleter);
    Yasgui.Yasqe.forkAutocompleter("property", this.voidPropertyCompleter);
    // // Remove the original autocompleters for class and property
    // Yasgui.Yasqe.defaults.autocompleters = Yasgui.Yasqe.defaults.autocompleters.filter(
    //   item => !["class", "property"].includes(item),
    // );
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
    Yasgui.Yasqe.defaults.value = this.addPrefixesToQuery(this.exampleQueries[0]?.query) || Yasgui.Yasqe.defaults.value;
    Yasgui.Yasr.defaults.prefixes = Object.fromEntries(this.prefixes);

    // Create YASGUI editor
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

      // Add limit to query if not provided
      const limitPattern = /LIMIT\s+\d+\s*$/i;
      const trimmedQuery = ye.getValue().trim();
      if ((ye.getQueryType() === "SELECT" || ye.getQueryType() === "CONSTRUCT") && !limitPattern.test(trimmedQuery)) {
        ye.abortQuery();
        ye.setValue(trimmedQuery + " LIMIT 1000");
        ye.query();
      }
      // NOTE: aborting the query generates an error in console
      // TODO: We "just" need to move yasqe.emit("query") up a few lines here: https://github.com/zazuko/Yasgui/blob/main/packages/yasqe/src/sparql.ts#L73
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

  // https://github.com/zazuko/Yasgui/blob/main/packages/yasqe/src/autocompleters/classes.ts#L8
  voidClassCompleter = {
    name: "voidClass",
    bulk: true,
    get: async (yasqe: any) => {
      const sparqlQuery =
        "PREFIX void: <http://rdfs.org/ns/void#> SELECT DISTINCT ?class { [] void:class ?class } ORDER BY ?class ";
      return fetch(this.endpointUrl + "?format=csv&ac=1&query=" + encodeURIComponent(sparqlQuery))
        .then(response => response.text())
        .then(text => {
          const data = text.split("\n").filter(item => item !== "");
          data.shift();
          // Remove the original autocompleters for class
          if (data.length > 0) delete yasqe.autocompleters["class"];
          return data;
        })
        .catch(error => {
          console.warn("Error retrieving autocomplete for classes:", error);
          return [];
        });
    },
  };
  voidPropertyCompleter = {
    name: "voidProperty",
    bulk: true,
    get: async (yasqe: any) => {
      const sparqlQuery =
        "PREFIX void: <http://rdfs.org/ns/void#> SELECT DISTINCT ?property { [] void:linkPredicate|void:property ?property } ORDER BY ?property";
      return fetch(this.endpointUrl + "?format=csv&ac=1&query=" + encodeURIComponent(sparqlQuery))
        .then(response => response.text())
        .then(function (text) {
          const data = text.split("\n").filter(item => item !== "");
          data.shift();
          // Remove the original autocompleters for property
          if (data.length > 0) delete yasqe.autocompleters["property"];
          return Promise.resolve(data);
        })
        .catch(error => {
          console.warn("Error retrieving autocomplete for properties:", error);
          return [];
        });
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

  async getPrefixes() {
    const response = await fetch(
      `${this.endpointUrl}?format=json&ac=1&query=PREFIX sh: <http://www.w3.org/ns/shacl%23> SELECT ?prefix ?namespace WHERE { [] sh:namespace ?namespace ; sh:prefix ?prefix} ORDER BY ?prefix`,
    );
    const json = await response.json();
    json.results.bindings.forEach((b: any) => {
      this.prefixes.set(b.prefix.value, b.namespace.value);
    });
  }

  async getExampleQueries() {
    const exampleQueriesEl = this.shadowRoot?.getElementById("sparql-examples") as HTMLElement;
    const getQueryExamples = `PREFIX sh: <http://www.w3.org/ns/shacl#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
SELECT DISTINCT ?comment ?query WHERE {
	?sq a sh:SPARQLExecutable ;
			rdfs:label|rdfs:comment ?comment ;
			sh:select|sh:ask|sh:construct|sh:describe ?query .
} ORDER BY ?sq`;

    try {
      // We add `&ac=1` to all the queries to exclude these queries from stats
      const response = await fetch(
        `${this.endpointUrl}?format=json&ac=1&query=${encodeURIComponent(getQueryExamples)}`,
      );
      const json = await response.json();
      json.results.bindings.forEach((b: any) => {
        this.exampleQueries.push({comment: b.comment.value, query: b.query.value});
      });
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
      console.warn("Error fetching or processing example queries:", error);
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

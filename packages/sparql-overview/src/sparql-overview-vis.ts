import {Network} from "vis-network/peer";
import "vis-network/styles/vis-network.css";

import {getPrefixes, getVoidDescription, EndpointsMetadata, compressUri} from "./utils";

const query = encodeURIComponent(`PREFIX sh:<http://www.w3.org/ns/shacl#>
  PREFIX sd:<http://www.w3.org/ns/sparql-service-description#>
  PREFIX void:<http://rdfs.org/ns/void#>
  PREFIX void-ext:<http://ldf.fi/void-ext#>
  SELECT DISTINCT ?subjectClass ?prop ?objectClass ?objectDatatype ?triples ?graph
  WHERE {
    {
      SELECT * WHERE {
        {
          ?s sd:graph ?graph .
          ?graph void:classPartition ?cp .
          ?cp void:class ?subjectClass ;
            void:propertyPartition ?pp .
          ?pp void:property ?prop ;
            void:triples ?triples .
          OPTIONAL {
            {
              ?pp  void:classPartition [ void:class ?objectClass ] .
            } UNION {
              ?pp void-ext:datatypePartition [ void-ext:datatype ?objectDatatype ] .
            }
          }
        } UNION {
          ?linkset void:subjectsTarget ?subjectClass ;
            void:linkPredicate ?prop ;
            void:objectsTarget ?objectClass .
        }

      }
    }
  } ORDER BY ?subjectClass ?objectClass ?objectDatatype ?graph ?triples`);

const groupColors = ["blue", "green", "red", "yellow", "orange", "purple", "pink", "brown", "gray", "black"];

/**
 * Custom element to create a SPARQL editor for a given endpoint using YASGUI
 * with autocompletion for classes and properties based on VoID description stored in the endpoint
 * and prefixes defined using SHACL in the endpoint
 * @example <sparql-editor endpoint="https://sparql.uniprot.org/sparql/" examples-on-main-page="10"></sparql-editor>
 */
export class SparqlMetamap extends HTMLElement {
  endpoints: {[key: string]: {label?: string; description?: string; graphs: string[]}};
  elems: {nodes: any[]; edges: any[]};
  urlParams: any;
  meta: EndpointsMetadata;
  network: Network | undefined;
  prefixes: {[key: string]: string};

  constructor() {
    super();
    this.elems = {nodes: [], edges: []};
    this.prefixes = {};
    this.meta = this.loadMetaFromLocalStorage();
    console.log("Loaded metadata from localStorage", this.meta);
    const endpointList = (this.getAttribute("endpoints") || "").split(",");
    this.endpoints = {};
    // this.endpoints = endpointList.map(endpoint => {
    endpointList.forEach(endpoint => {
      endpoint = endpoint.trim();
      this.endpoints[endpoint] = {graphs: []};
      if (!this.meta[endpoint]) {
        this.meta[endpoint] = {
          void: {},
          classes: [],
          predicates: [],
          prefixes: {},
        };
      }
    });
    if (Object.keys(this.endpoints).length === 0)
      throw new Error("No endpoint provided. Please use the 'endpoints' attribute to specify the SPARQL endpoint URL.");

    const style = document.createElement("style");
    style.textContent = `
      html, body {
        font: 10pt arial;
      }
      #sparql-metamap {
        height: 100%;
      }

      #metamap-predicate-sidebar {
        float: left;
        min-width: fit-content;
        padding-right: 0.5em;
        overflow-y: auto;
        max-height: 100%;
      }
      #visnetwork {
        width: 100%;
        float: right;
        height: 100%;
        border: 1px solid lightgray;
      }
		`;
    const container = document.createElement("div");
    container.id = "sparql-metamap";
    container.style.display = "flex";
    container.className = "container";
    container.style.height = "100%";
    container.innerHTML = `
      <div id="metamap-predicate-sidebar" >
        <div style="display: flex; justify-content: space-evenly;">
          <button id="metamap-show-all">Show all</button>
          <button id="metamap-hide-all">Hide all</button>
        </div>
        <div id="metamap-predicates-list" style="width: fit-content;"></div>
      </div>
      <div id="visnetwork"></div>
    `;
    this.appendChild(style);
    this.appendChild(container);

    const showAllButton = this.querySelector("#metamap-show-all") as HTMLButtonElement;
    showAllButton.addEventListener("click", () => {
      const checkboxes = this.querySelectorAll("#metamap-predicates-list input[type='checkbox']");
      checkboxes.forEach(checkbox => {
        (checkbox as HTMLInputElement).checked = true;
        this.togglePredicate(checkbox.id, true);
      });
    });
    const hideAllButton = this.querySelector("#metamap-hide-all") as HTMLButtonElement;
    hideAllButton.addEventListener("click", () => {
      const checkboxes = this.querySelectorAll("#metamap-predicates-list input[type='checkbox']");
      checkboxes.forEach(checkbox => {
        (checkbox as HTMLInputElement).checked = false;
        this.togglePredicate(checkbox.id, false);
      });
    });
  }

  async connectedCallback() {
    Object.keys(this.endpoints).forEach(async endpoint => {
      await this.getMetadata(endpoint);
    });
    this.retrieveData(this.endpointUrl());
  }

  getCurie(uri: string) {
    return compressUri(this.prefixes, uri);
  }

  endpointUrl() {
    return Object.keys(this.endpoints)[0];
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
      };
    }
    if (!this.meta[endpoint].retrievedAt) {
      // console.log(`Getting metadata for ${endpoint}`);
      [
        // this.meta[endpoint].examples,
        this.meta[endpoint].prefixes,
        [this.meta[endpoint].void, this.meta[endpoint].classes, this.meta[endpoint].predicates],
      ] = await Promise.all([
        // getExampleQueries(endpoint),
        getPrefixes(endpoint),
        getVoidDescription(endpoint),
      ]);
      this.meta[endpoint].retrievedAt = new Date();
      this.saveMetaToLocalStorage();
    }
    this.prefixes = {...this.prefixes, ...this.meta[endpoint].prefixes};
  }

  retrieveData(endpoint: string) {
    const request = new Request(`${endpoint}?query=${query}&ac=1`);
    request.headers.append("Accept", "application/sparql-results+json");
    fetch(request)
      .then(response => response.json())
      .then(results => {
        console.log("GOT RESULTS", results);
        const nodesMap = new Map();
        const edgesMap = new Map();
        const nodeDatatypesMap = new Map();
        for (const r in results.results.bindings) {
          const row = results.results.bindings[r];

          if (row.objectDatatype) {
            // const fromId = `${row.fromId.value}-${row.graphId.value}`;
            const dtInfo = {
              id: this.getCurie(row.objectDatatype.value),
              dtIri: row.objectDatatype.value,
              predIri: row.prop.value,
              predId: this.getCurie(row.prop.value),
              count: parseInt(row.triples.value),
            };
            if (nodeDatatypesMap.has(row.subjectClass.value)) {
              nodeDatatypesMap.get(row.subjectClass.value).push(dtInfo);
            } else {
              nodeDatatypesMap.set(row.subjectClass.value, [dtInfo]);
            }
          }
        }

        // NOTE: We need to iterate a first time to generate all nodes images
        for (const r in results.results.bindings) {
          const row = results.results.bindings[r];
          if (
            // subjClsId !== "rdf:Statement" &&
            row.prop.value !== "http://www.w3.org/1999/02/22-rdf-syntax-ns#object" &&
            row.prop.value !== "http://www.w3.org/1999/02/22-rdf-syntax-ns#subject" &&
            row.prop.value !== "http://www.w3.org/1999/02/22-rdf-syntax-ns#predicate" &&
            // row.prop.value !== "http://purl.uniprot.org/core/sequence" &&
            // row.prop.value !== "http://purl.uniprot.org/core/annotation" &&
            row.objectClass &&
            !row.objectDatatype
          ) {
            const propId = `${row.subjectClass.value}-${row.prop.value}-${row.objectClass.value}`;
            const count = parseInt(row.triples.value);
            this.addNode(row.subjectClass, row.graph, count, nodesMap, nodeDatatypesMap);
            this.addNode(row.objectClass, row.graph, count, nodesMap, nodeDatatypesMap);

            if (edgesMap.has(propId)) {
              const temp = edgesMap.get(propId);
              temp.value += count;
              temp.title = `${temp.value.toLocaleString()} triples`;
            } else {
              edgesMap.set(propId, {
                id: propId,
                from: row.subjectClass.value,
                to: row.objectClass.value,
                arrows: "to",
                value: count,
                label: this.getCurie(row.prop.value),
                title: `${count.toLocaleString()} triples`,
              });
            }
          }
        }
        const nodes = Array.from(nodesMap.values());
        const edges = Array.from(edgesMap.values());
        console.log(nodes, edges);
        this.draw(nodes, edges);
      });
  }

  draw(nodes: any[], edges: any[]) {
    // Instantiate our network object.
    const container = document.getElementById("visnetwork") as HTMLElement;
    this.elems = {
      nodes: nodes,
      edges: edges,
    };
    this.renderPredicateList();

    const groups: {[key: string]: {color: {background: string; border: string}}} = {};
    Object.keys(this.endpoints).forEach((endpoint, i) => {
      this.endpoints[endpoint].graphs.forEach((g, j) => {
        groups[g] = {
          color: {
            background: groupColors[(i + j) % groupColors.length],
            border: "lightgray",
          },
          // shape: "ellipse",
        };
      });
    });
    const options = {
      nodes: {
        scaling: {
          //   label: {enabled: true},
          //       customScalingFunction: function(min, max, total, value) {
          //	  console.log(value, total, value / total)
          //          const r = value / total;
          //if (r < min) {
          //  return min;
          //} else if (r > max) {
          //return max;
          //}
          //     	  return r;
          //        },
          //        min: 0.1,
          //        max: 1,
        },
        // fixed: {
        //   x: true,
        //   y: true
        // }
      },
      edges: {},
      layout: {
        improvedLayout: false,
      },
      physics: {
        // https://stackoverflow.com/questions/32403578/stop-vis-js-physics-after-nodes-load-but-allow-drag-able-nodes
        solver: "forceAtlas2Based",
        stabilization: {
          enabled: true,
          iterations: 1000,
          updateInterval: 25,
        },
      },
      groups: groups,
    };
    this.network = new Network(container, this.elems, options);
    this.network.on("stabilizationIterationsDone", () => {
      this.network?.setOptions({physics: false});
    });
  }

  addNode(node: any, graphId: any, count: any, nodesMap: any, nodeDatypesMap: any) {
    // const nodeId = `${node.value}-${graphId.value}`;
    const nodeId = node.value;
    // console.log(compressUri(this.meta[this.endpoints[0]].prefixes, node.value), this.meta[this.endpoints[0]].prefixes)
    // const nodeId = compressUri(this.meta[this.endpoints[0]].prefixes, node.value);
    if (nodesMap.has(nodeId)) {
      const prior = nodesMap.get(nodeId);
      prior.value = prior.value + count;
    } else {
      const nodeCurie = this.getCurie(nodeId);
      const url = this.asImage(nodeCurie, nodeDatypesMap.get(nodeId));
      nodesMap.set(nodeId, {
        id: nodeId,
        // label: nodeCurie,
        shape: "image",
        group: graphId.value,
        value: count,
        image: url,
      });
    }
  }

  asImage(nodeId: any, datatypes: any) {
    //console.log(datatypes)
    let nw = nodeId.length * 25 + 30;
    let height = 65;
    let middle = "";
    let maxl = 0;
    if (datatypes !== undefined) {
      height += datatypes.length * 47 + 45;
      middle =
        '<table style="font-size:35px;"><tr><th>predicate</th><th>datatype</th><th>triples</th></tr>' +
        datatypes
          .map(
            (dt: any) =>
              `<tr><td><a href="${dt.predIri}">${dt.predId}</a></td> <td><a href="${dt.dtIri}">${dt.id}</a></td> <td style="text-align:right;">${dt.count.toLocaleString()}</td></tr>`,
          )
          .join(" ") +
        "</table>";
      const longestPred = Math.max(...datatypes.map((dt: any) => dt.predId.length));
      const longestDt = Math.max(...datatypes.map((dt: any) => dt.id.length));
      // 7 is the length of "triples" the table header
      const longestCount = Math.max(7, ...datatypes.map((dt: any) => dt.count.toLocaleString().length));
      maxl = (longestPred + longestDt + longestCount) * 23;
      // maxl = Math.max(...datatypes.map((dt: any) => `${dt.predId}${dt.id}${dt.count.toLocaleString()}`.length * 25));
      nw = Math.max(nw, maxl + 30);
    }
    const start =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${nw}" height="${height}">` +
      '<rect x="0" y="0" width="100%" height="100%" fill="white" stroke-width="20" stroke="black" ></rect>' +
      '<foreignObject x="15" y="10" width="100%" height="100%">' +
      '<div xmlns="http://www.w3.org/1999/xhtml" style="font-family:monospace;">' +
      `<em style='font-size:40px'>${compressUri(this.meta[this.endpointUrl()].prefixes, nodeId)}</em><br/>`;

    const end = "</div>" + "</foreignObject>" + "</svg>";

    const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(start + middle + end);
    //console.log(url)
    return url;
  }

  renderPredicateList() {
    const sidebar = this.querySelector("#metamap-predicates-list") as HTMLElement;
    sidebar.innerHTML = "";
    // const allEdges = Array.from(this.elems.filter(elem => elem.data.source))
    // console.log("allEdges", allEdges)
    const predicateCounts: {[key: string]: number} = {};
    this.elems.edges.forEach(elem => {
      if (predicateCounts[elem.label]) {
        predicateCounts[elem.label] += 1;
      } else {
        predicateCounts[elem.label] = 1;
      }
      // if (predicateCounts[elem.data.label]) {
      //   predicateCounts[elem.data.label] += elem.data.value;
      // } else {
      //   predicateCounts[elem.data.label] = elem.data.value;
      // }
    });
    const sortedPredicates = Object.entries(predicateCounts).sort((a, b) => b[1] - a[1]);

    for (const [predicateLabel, predicateCount] of sortedPredicates) {
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = predicateLabel;
      checkbox.checked = true; // Default to checked
      checkbox.onchange = () => this.togglePredicate(predicateLabel, checkbox.checked);

      const label = document.createElement("label");
      label.htmlFor = predicateLabel;
      label.textContent = `${predicateLabel} (${predicateCount.toLocaleString()})`;

      const container = document.createElement("div");
      container.appendChild(checkbox);
      container.appendChild(label);

      sidebar.appendChild(container);
    }
  }

  togglePredicate(predicateLabel: string, checked: boolean) {
    this.elems.edges
      ?.filter(e => e.label === predicateLabel)
      .forEach(e => {
        this.network?.updateEdge(e.id, {hidden: !checked});
      });
  }
}

customElements.define("sparql-metamap", SparqlMetamap);

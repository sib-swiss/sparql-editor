import Graph from "graphology";
import Sigma from "sigma";
import forceAtlas2 from "graphology-layout-forceatlas2";
import FA2Layout from "graphology-layout-forceatlas2/worker";
import iwanthue from "iwanthue";
import {DEFAULT_EDGE_CURVATURE, EdgeCurvedArrowProgram, indexParallelEdgesIndex} from "@sigma/edge-curve";
import {EdgeArrowProgram} from "sigma/rendering";
import type {Coordinates, EdgeDisplayData, NodeDisplayData} from "sigma/types";

// import { createNodeImageProgram } from "@sigma/node-image";
// import ForceSupervisor from "graphology-layout-force/worker";

import {getPrefixes, compressUri, queryEndpoint, SparqlResultBindings} from "./utils";

const voidQuery = `PREFIX owl: <http://www.w3.org/2002/07/owl#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX sh:<http://www.w3.org/ns/shacl#>
PREFIX sd:<http://www.w3.org/ns/sparql-service-description#>
PREFIX void:<http://rdfs.org/ns/void#>
PREFIX void-ext:<http://ldf.fi/void-ext#>
SELECT DISTINCT ?subjectClass ?prop ?objectClass ?objectDatatype ?triples
?objectClassTopParent ?objectClassTopParentLabel ?subjectClassTopParent ?subjectClassTopParentLabel
?subjectClassLabel ?objectClassLabel ?subjectClassComment ?objectClassComment ?propLabel ?propComment
WHERE {
  {
    SELECT * WHERE {
      {
        ?s sd:graph ?graph .
        ?graph void:classPartition ?cp .
        ?cp void:class ?subjectClass ;
          void:propertyPartition ?pp .
        OPTIONAL {?subjectClass rdfs:label ?subjectClassLabel }
        OPTIONAL {?subjectClass rdfs:comment ?subjectClassComment }
        OPTIONAL {
          ?subjectClass rdfs:subClassOf* ?subjectClassTopParent .
          OPTIONAL {?subjectClassTopParent rdfs:label ?subjectClassTopParentLabel}
          FILTER(isIRI(?subjectClassTopParent) && ?subjectClassTopParent != owl:Thing && ?subjectClassTopParent != owl:Class)
          MINUS {
            ?subjectClassTopParent rdfs:subClassOf ?intermediateParent .
            FILTER(?intermediateParent != owl:Thing && ?intermediateParent != owl:Class)
          }
        }

        ?pp void:property ?prop ;
          void:triples ?triples .
        OPTIONAL {?prop rdfs:label ?propLabel }
        OPTIONAL {?prop rdfs:comment ?propComment }
        OPTIONAL {
          {
            ?pp  void:classPartition [ void:class ?objectClass ] .
            OPTIONAL {?objectClass rdfs:label ?objectClassLabel }
            OPTIONAL {?objectClass rdfs:comment ?objectClassComment }
            OPTIONAL {
              ?objectClass rdfs:subClassOf* ?objectClassTopParent .
              OPTIONAL {?objectClassTopParent rdfs:label ?objectClassTopParentLabel}
              FILTER(isIRI(?objectClassTopParent) && ?objectClassTopParent != owl:Thing && ?objectClassTopParent != owl:Class)
              MINUS {
                ?objectClassTopParent rdfs:subClassOf ?intermediateParent .
                FILTER(?intermediateParent != owl:Thing && ?intermediateParent != owl:Class)
              }
            }
          } UNION {
            ?pp void-ext:datatypePartition [ void-ext:datatype ?objectDatatype ] .
          }
        }
      } UNION {
        ?linkset void:subjectsTarget [ void:class ?subjectClass ] ;
          void:linkPredicate ?prop ;
          void:objectsTarget [ void:class ?objectClass ] .
      }

    }
  }
} ORDER BY ?subjectClass ?objectClass ?objectDatatype ?graph ?triples`;

type Cluster = {
  label: string;
  x?: number;
  y?: number;
  color?: string;
  count: number;
  positions: {x: number; y: number}[];
};

type EndpointInfo = {
  label?: string;
  description?: string;
  graphs?: string[];
  void?: SparqlResultBindings[];
};

const metadataNamespaces = [
  "http://www.w3.org/ns/shacl#",
  "http://www.w3.org/2002/07/owl#",
  "http://www.w3.org/2000/01/rdf-schema#",
  "http://www.w3.org/ns/sparql-service-description#",
  "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
  "http://rdfs.org/ns/void#",
  "http://purl.org/query/voidext#",
  "http://purl.org/query/bioquery#",
];

function isMetadataNode(node: string) {
  if (!node) return false;
  if (node === "http://www.w3.org/1999/02/22-rdf-syntax-ns#Statement") return false;
  return metadataNamespaces.some(namespace => node.startsWith(namespace));
}

/**
 * Custom element to create a SPARQL network overview for a given endpoint classes and predicates
 * @example <sparql-overview endpoint="https://sparql.uniprot.org/sparql/"></sparql-overview>
 */
export class SparqlOverview extends HTMLElement {
  endpoints: {[key: string]: EndpointInfo} = {};
  // meta: EndpointsMetadata;
  // void: {[key: string]: SparqlResultBindings[]} = {};
  prefixes: {[key: string]: string} = {};
  showMetadata: boolean = false;

  hoveredNode?: string;
  searchQuery: string = "";
  // State derived from query:
  selectedNode?: string;
  selectedEdge?: string;
  suggestions?: Set<string>;
  // State derived from hovered node:
  hoveredNeighbors?: Set<string>;

  predicatesCount: {[key: string]: {count: number; label: string}} = {};
  hidePredicates: Set<string> = new Set();
  hideClusters: Set<string> = new Set();

  clusters: {[key: string]: Cluster} = {};

  graph: Graph;
  renderer: Sigma | undefined;
  // https://github.com/jacomyal/sigma.js/issues/197

  constructor() {
    super();
    const endpointList = (this.getAttribute("endpoint") || "").split(",");
    // this.meta = this.loadMetaFromLocalStorage();
    // console.log("Loaded metadata from localStorage", this.meta);
    endpointList.forEach(endpoint => {
      endpoint = endpoint.trim();
      this.endpoints[endpoint] = {};
    });
    if (Object.keys(this.endpoints).length === 0)
      throw new Error("No endpoint provided. Please use the 'endpoints' attribute to specify the SPARQL endpoint URL.");

    const style = document.createElement("style");
    style.textContent = `
      html, body {
        font: 10pt arial;
      }
      #sparql-overview {
        height: 100%;
      }
      #overview-predicate-sidebar {
        float: left;
        // width: fit-content;
        width: 230px;
        padding-right: 0.5em;
        overflow-y: auto;
        height: 100%;
      }
      #overview-predicate-sidebar p, h3, h5 {
        margin: .5em 0;
      }
      #overview-predicate-sidebar a {
        text-decoration: none;
      }
      #network-container {
        width: 100%;
        float: right;
        height: 100%;
        border: 1px solid lightgray;
      }
      #sparql-overview hr {
        width: 80%;
        border: none;
        height: 1px;
        background: lightgrey;
      }
      .clusterLabel {
        // position: absolute;
        // transform: translate(-50%, -50%);
        // font-size: 1.8rem;
        font-family: sans-serif;
        font-variant: small-caps;
        font-weight: 400;
        text-shadow: 2px 2px 1px white, -2px -2px 1px white, -2px 2px 1px white, 2px -2px 1px white;
      }
      #sparql-overview code {
        font-family: 'Fira Code', monospace;
        font-size: 0.95rem;
        border-radius: 6px;
        padding: 0.2em 0.4em;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        border: 1px solid #e0e0e0;
        display: inline-block;
        word-wrap: break-word;
      }
		`;
    const container = document.createElement("div");
    container.id = "sparql-overview";
    container.style.display = "flex";
    container.className = "container";
    container.style.height = "100%";
    container.innerHTML = `
      <div id="overview-predicate-sidebar" style="display: flex; flex-direction: column;">
        <input type="search" id="search-input" list="suggestions" placeholder="Search classes...">
        <datalist id="suggestions"></datalist>
        <div style="display: flex; justify-content: space-evenly; gap: .5em; margin: .5em 0;">
          <button id="overview-show-meta" title="Also show metadata classes (ontology, SHACL, VoID)">Show metadata</button>
        </div>

        <div style="text-align: center;">
          <span>Filter predicates ·</span>
          <button id="overview-show-preds" title="Show all predicates">Show all</button>
          <button id="overview-hide-preds" title="Hide all predicates">Hide all</button>
        </div>
        <div id="overview-predicates-list" style="flex: 1; overflow-y: auto;"></div>

        <hr></hr>
        <div style="text-align: center; ">
          <span>Filter clusters ·</span>
          <button id="overview-show-clusters" title="Show all clusters">Show all</button>
          <button id="overview-hide-clusters" title="Hide all clusters">Hide all</button>
        </div>
        <div id="overview-clusters-list" style="flex: 1; overflow-y: auto;"></div>

        <div id="overview-edge-info" style="overflow-y: auto;"></div>
        <div id="overview-node-info" style="overflow-y: auto;"></div>
      </div>

      <div id="network-container" style="flex: 1; display: flex; position: relative; align-items: center; justify-content: center;">
        <div id="loading-spinner">
          <p style="margin: 0; text-align: center">Loading overview...</p>
        </div>
      </div>
    `;
    this.appendChild(style);
    this.appendChild(container);

    // Add sidebar filtering buttons
    const showAllPredsButton = this.querySelector("#overview-show-preds") as HTMLButtonElement;
    showAllPredsButton.addEventListener("click", () => {
      const checkboxes = this.querySelectorAll("#overview-predicates-list input[type='checkbox']");
      checkboxes.forEach(checkbox => {
        (checkbox as HTMLInputElement).checked = true;
      });
      this.hidePredicates.clear();
      this.renderer?.refresh({skipIndexation: true});
    });
    const hideAllPredsButton = this.querySelector("#overview-hide-preds") as HTMLButtonElement;
    hideAllPredsButton.addEventListener("click", () => {
      const checkboxes = this.querySelectorAll("#overview-predicates-list input[type='checkbox']");
      checkboxes.forEach(checkbox => {
        (checkbox as HTMLInputElement).checked = false;
      });
      this.hidePredicates = new Set(Object.keys(this.predicatesCount));
      this.renderer?.refresh({skipIndexation: true});
    });
    const showMetaButton = this.querySelector("#overview-show-meta") as HTMLButtonElement;
    showMetaButton.addEventListener("click", async () => {
      this.showMetadata = !this.showMetadata;
      if (this.showMetadata) showMetaButton.textContent = "Hide metadata";
      else showMetaButton.textContent = "Show metadata";
      await this.initGraph();
    });

    // Filtering buttons for clusters
    const showAllClustersButton = this.querySelector("#overview-show-clusters") as HTMLButtonElement;
    showAllClustersButton.addEventListener("click", () => {
      const checkboxes = this.querySelectorAll("#overview-clusters-list input[type='checkbox']");
      checkboxes.forEach(checkbox => {
        (checkbox as HTMLInputElement).checked = true;
      });
      this.hideClusters.clear();
      this.renderer?.refresh({skipIndexation: true});
    });
    const hideAllClustersButton = this.querySelector("#overview-hide-clusters") as HTMLButtonElement;
    hideAllClustersButton.addEventListener("click", () => {
      const checkboxes = this.querySelectorAll("#overview-clusters-list input[type='checkbox']");
      checkboxes.forEach(checkbox => {
        (checkbox as HTMLInputElement).checked = false;
      });
      this.hideClusters = new Set(Object.keys(this.clusters));
      this.renderer?.refresh({skipIndexation: true});
    });

    // const palette = iwanthue(Object.keys(countryClusters).length, { seed: "eurSISCountryClusters" });

    this.graph = new Graph({multi: true});
  }

  async connectedCallback() {
    await Promise.all(Object.keys(this.endpoints).map(endpoint => this.fetchEndpointMetadata(endpoint)));
    await this.initGraph();
    const loadingSpinner = this.querySelector("#loading-spinner") as HTMLElement;
    loadingSpinner.style.display = "None";
  }

  async initGraph() {
    // Reinitialize the graph
    this.renderer?.kill();
    this.graph = new Graph({multi: true});
    this.predicatesCount = {};
    this.clusters = {};

    for (const [endpoint, info] of Object.entries(this.endpoints)) {
      if (!info.void) continue;
      for (const row of info.void) {
        // const count = parseInt(row.triples.value);
        if (!this.showMetadata && (isMetadataNode(row.subjectClass.value) || isMetadataNode(row.objectClass?.value)))
          continue;
        const count = 10;

        // Get the cluster for the subject node
        const subjCluster = isMetadataNode(row.subjectClass.value)
          ? "Endpoint Metadata"
          : row.subjectClassTopParentLabel
            ? row.subjectClassTopParentLabel.value
            : row.subjectClassTopParent
              ? this.getCurie(row.subjectClassTopParent.value)
              : row.subjectClass.value.includes("Citation") // quick hack to cluster citations in uniprot
                ? "Citation"
                : "Other";
        // Add subject node
        const subjUri = row.subjectClass.value;
        const subjCurie = this.getCurie(subjUri);
        if (!this.graph.hasNode(subjUri)) {
          this.graph.addNode(subjUri, {
            label: subjCurie,
            curie: subjCurie,
            size: count,
            cluster: subjCluster,
            endpoint: endpoint,
            datatypes: [],
          });
          if (row.subjectClassLabel) {
            this.graph.updateNodeAttribute(subjUri, "displayLabel", () => row.subjectClassLabel.value);
            this.graph.updateNodeAttribute(subjUri, "label", () => row.subjectClassLabel.value);
          }
          if (row.subjectClassComment)
            this.graph.updateNodeAttribute(subjUri, "comment", () => row.subjectClassComment.value);
        }

        // Handle when the object is a datatype (string, integer, etc)
        if (row.objectDatatype) {
          this.graph.updateNodeAttribute(subjUri, "datatypes", datatypes => {
            const exists = datatypes.some(
              (datatype: {[key: string]: string}) =>
                datatype.predUri === row.prop.value && datatype.datatypeUri === row.objectDatatype.value,
            );
            if (!exists) {
              datatypes.push({
                predCurie: this.getCurie(row.prop.value),
                predUri: row.prop.value,
                datatypeCurie: this.getCurie(row.objectDatatype.value),
                datatypeUri: row.objectDatatype.value,
                count: parseInt(row.triples.value),
              });
            }
            return datatypes;
          });
        }

        // Handle when the object is a class
        if (row.objectClass && !row.objectDatatype) {
          // Get the cluster for the object node
          const objCluster = isMetadataNode(row.objectClass.value)
            ? "Endpoint Metadata"
            : row.objectClassTopParentLabel
              ? row.objectClassTopParentLabel.value
              : row.objectClassTopParent
                ? this.getCurie(row.objectClassTopParent.value)
                : row.objectClass.value.includes("Citation") // quick hack to cluster citations in uniprot
                  ? "Citation"
                  : "Other";
          // Add object node
          const objUri = row.objectClass.value;
          if (!this.graph.hasNode(objUri)) {
            const objCurie = this.getCurie(objUri);
            this.graph.addNode(objUri, {
              label: objCurie,
              curie: objCurie,
              size: count,
              cluster: objCluster,
              endpoint: endpoint,
              datatypes: [],
            });
            if (row.objectClassLabel) {
              this.graph.updateNodeAttribute(objUri, "displayLabel", () => row.objectClassLabel.value);
              this.graph.updateNodeAttribute(objUri, "label", () => row.objectClassLabel.value);
            }
            if (row.objectClassComment)
              this.graph.updateNodeAttribute(objUri, "comment", () => row.objectClassComment.value);
          }
          // Add edge
          const predCurie = this.getCurie(row.prop.value);
          let edgeExists = false;
          for (const edge of this.graph.edges(subjUri, objUri)) {
            if (this.graph.getEdgeAttributes(edge).curie === predCurie) {
              edgeExists = true;
              break;
            }
          }
          if (!edgeExists) {
            // Add the edge only if it doesn't already exist
            const edgeAttrs: any = {
              label: predCurie,
              curie: predCurie,
              uri: row.prop.value,
              size: 2,
              // size: count,
              type: "arrow",
            };
            if (row.propLabel) {
              edgeAttrs.curie = edgeAttrs.label;
              edgeAttrs.label = row.propLabel.value;
              edgeAttrs.displayLabel = row.propLabel.value;
            }
            if (row.propComment) edgeAttrs["comment"] = row.propComment.value;
            if (!this.predicatesCount[predCurie]) {
              this.predicatesCount[predCurie] = {count: 1, label: row.propLabel ? row.propLabel.value : predCurie};
            } else {
              this.predicatesCount[predCurie].count += 1;
            }
            this.graph.addEdge(subjUri, objUri, edgeAttrs);
          }
        }
      }
    }

    if (this.graph.nodes().length < 2) {
      console.warn(`No VoID description found in endpoint ${this.endpointUrl()}`);
      return;
    }

    // Create clusters
    this.graph.forEachNode((_node, atts) => {
      if (!this.clusters[atts.cluster]) this.clusters[atts.cluster] = {label: atts.cluster, positions: [], count: 1};
      else this.clusters[atts.cluster].count += 1;
    });
    // create and assign one color by cluster
    const palette = iwanthue(Object.keys(this.clusters).length, {seed: "topClassesClusters"});
    for (const cluster in this.clusters) {
      this.clusters[cluster].color = palette.pop();
    }
    // Identify single-node clusters and create the "Other" cluster
    const otherClusterName = "Other";
    if (!this.clusters[otherClusterName]) {
      this.clusters[otherClusterName] = {label: otherClusterName, positions: [], count: 0};
    }
    this.graph.forEachNode((node, atts) => {
      const cluster = atts.cluster;
      if (this.clusters[cluster].count === 1) {
        // Reassign the node to the "Other" cluster
        this.graph.setNodeAttribute(node, "cluster", otherClusterName);
        this.clusters[otherClusterName].count += 1;
        this.clusters[cluster].count -= 1;
      }
    });
    // Remove empty clusters
    for (const cluster in this.clusters) {
      if (this.clusters[cluster].count === 0 && cluster !== otherClusterName) {
        delete this.clusters[cluster];
      }
    }

    // We need to manually set some x/y coordinates for the nodes
    let i = 1;
    this.graph.forEachNode((_node, atts) => {
      const angle = (i * 2 * Math.PI) / this.graph.order;
      i++;
      atts.x = 100 * Math.cos(angle);
      atts.y = 100 * Math.sin(angle);
      // node color depends on the cluster it belongs to
      atts.color = this.clusters[atts.cluster].color;
      // node size depends on its degree (number of connected edges)
      // atts.size = Math.sqrt(this.graph.degree(node)) / 2;
      this.clusters[atts.cluster].positions.push({x: atts.x, y: atts.y});
    });
    // Calculate the cluster's nodes barycenter to use this as cluster label position
    for (const c in this.clusters) {
      this.clusters[c].x =
        this.clusters[c].positions.reduce((acc, p) => acc + p.x, 0) / this.clusters[c].positions.length;
      this.clusters[c].y =
        this.clusters[c].positions.reduce((acc, p) => acc + p.y, 0) / this.clusters[c].positions.length;
    }
    console.log("clusters!", this.clusters);

    // Curve multi edges between same nodes
    // Use dedicated helper to identify parallel edges:
    indexParallelEdgesIndex(this.graph, {
      edgeIndexAttribute: "parallelIndex",
      edgeMinIndexAttribute: "parallelMinIndex",
      edgeMaxIndexAttribute: "parallelMaxIndex",
    });
    // Adapt types and curvature of parallel edges for rendering:
    this.graph.forEachEdge(
      (
        edge,
        {
          parallelIndex,
          parallelMinIndex,
          parallelMaxIndex,
        }:
          | {parallelIndex: number; parallelMinIndex?: number; parallelMaxIndex: number}
          | {parallelIndex?: null; parallelMinIndex?: null; parallelMaxIndex?: null},
      ) => {
        if (typeof parallelMinIndex === "number") {
          this.graph.mergeEdgeAttributes(edge, {
            type: parallelIndex ? "curved" : "straight",
            curvature: getEdgeCurvature(parallelIndex, parallelMaxIndex),
          });
        } else if (typeof parallelIndex === "number") {
          this.graph.mergeEdgeAttributes(edge, {
            type: "curved",
            curvature: getEdgeCurvature(parallelIndex, parallelMaxIndex),
          });
        } else {
          this.graph.setEdgeAttribute(edge, "type", "straight");
        }
      },
    );

    // Instantiate Sigma.js graph
    const container = this.querySelector("#network-container") as HTMLElement;
    this.renderer = new Sigma(this.graph, container, {
      renderEdgeLabels: true,
      enableEdgeEvents: true,
      allowInvalidContainer: true,
      defaultEdgeType: "straight",
      edgeProgramClasses: {
        straight: EdgeArrowProgram,
        curved: EdgeCurvedArrowProgram,
      },
      // https://www.npmjs.com/package/@sigma/edge-curve
      // edgeProgramClasses: {
      //   curved: EdgeCurveProgram,
      // },
    });
    const inferredLayoutSettings = forceAtlas2.inferSettings(this.graph);
    console.log("inferredLayoutSettings", inferredLayoutSettings);
    const layout = new FA2Layout(this.graph, {
      settings: {
        ...inferredLayoutSettings,
        // https://www.npmjs.com/package/graphology-layout-forceatlas2#settings
        // barnesHutOptimize: true,
        // gravity: 0.1,
        linLogMode: true,
        // slowDown: 4,
        // adjustSizes: true,
        // strongGravityMode: true,
      },
    });
    layout.start();

    // Bind search input interactions:
    const searchInput = this.querySelector("#search-input") as HTMLInputElement;
    searchInput.addEventListener("input", () => {
      this.setSearchQuery(searchInput.value || "");
    });
    // searchInput.addEventListener("blur", () => {
    //   this.setSearchQuery("");
    // });
    // Bind graph interactions:
    this.renderer.on("enterNode", ({node}) => {
      this.setHoveredNode(node);
      if (!this.selectedNode) this.displayNodeInfo(node);
    });
    this.renderer.on("leaveNode", () => {
      this.setHoveredNode(undefined);
      if (!this.selectedNode) this.displayNodeInfo(undefined);
    });
    // TODO: highlight node on click
    this.renderer.on("clickNode", ({node}) => {
      this.selectedNode = node;
      this.displayNodeInfo(node);
    });
    this.renderer.on("clickStage", () => {
      this.selectedNode = undefined;
      this.displayNodeInfo(undefined);
      this.selectedEdge = undefined;
      this.displayEdgeInfo(undefined);
    });
    this.renderer.on("clickEdge", ({edge}) => {
      this.selectedEdge = edge;
      this.displayEdgeInfo(edge);
    });
    this.renderer.on("enterEdge", ({edge}) => {
      if (!this.selectedEdge) this.displayEdgeInfo(edge);
    });
    this.renderer.on("leaveEdge", () => {
      if (!this.selectedEdge) this.displayEdgeInfo(undefined);
    });

    // Render nodes accordingly to the internal state
    this.renderer.setSetting("nodeReducer", (node, data) => {
      const res: Partial<NodeDisplayData> = {...data};
      // Filter clusters
      if (this.hideClusters.size > 0 && this.hideClusters.has(data.cluster)) {
        res.hidden = true;
      }
      // If there is a hovered node, all non-neighbor nodes are greyed
      if (this.hoveredNeighbors && !this.hoveredNeighbors.has(node) && this.hoveredNode !== node) {
        res.hidden = true;
      }
      // If a node is selected, it is highlighted
      if (this.selectedNode === node) {
        res.highlighted = true;
        res.hidden = false;
      } else if (this.suggestions) {
        // If there is query, all non-matching nodes are greyed
        if (this.suggestions.has(node)) {
          res.forceLabel = true;
          res.hidden = false;
        } else {
          res.hidden = true;
        }
      }
      // Highlight nodes at extremity of selected edge
      if (this.selectedEdge && this.graph.hasExtremity(this.selectedEdge, node)) {
        res.highlighted = true;
        res.hidden = false;
      }
      return res;
    });

    // Render edges accordingly to the internal state
    this.renderer.setSetting("edgeReducer", (edge, data) => {
      const res: Partial<EdgeDisplayData> = {...data};
      // If a node is selected, the edge is hidden if it is not connected to the node
      if (this.selectedNode && !this.graph.hasExtremity(edge, this.selectedNode)) {
        res.hidden = true;
      }
      // If a node is hovered, the edge is hidden if it is not connected to the node
      if (this.hoveredNode && !this.graph.hasExtremity(edge, this.hoveredNode)) {
        res.hidden = true;
      }
      if (this.hoveredNode && this.graph.hasExtremity(edge, this.hoveredNode)) {
        res.hidden = false;
      }
      // Show and highlight edge connected to selected node
      if (this.selectedNode && this.graph.hasExtremity(edge, this.selectedNode)) {
        res.zIndex = 9000;
        res.color = "red";
        res.hidden = false;
      }
      if (edge == this.selectedEdge) {
        res.color = "blue";
        res.hidden = false;
      }
      // If there is a search query, the edge is only visible if it connects two suggestions
      if (
        this.suggestions &&
        (!this.suggestions.has(this.graph.source(edge)) || !this.suggestions.has(this.graph.target(edge)))
      ) {
        res.hidden = true;
      }
      if (this.hidePredicates.size > 0 && this.hidePredicates.has(data.curie)) {
        res.hidden = true;
      }
      return res;
    });

    this.renderPredicateList();
    this.renderClusterList();

    // Feed the datalist autocomplete values:
    const searchSuggestions = this.querySelector("#suggestions") as HTMLDataListElement;
    searchSuggestions.innerHTML = this.graph
      .nodes()
      .sort()
      .map(node => `<option value="${this.graph.getNodeAttribute(node, "label")}"></option>`)
      .join("\n");

    // // Create the clustersLabel layer
    // const clustersLayer = document.createElement("div");
    // clustersLayer.id = "clustersLayer";
    // clustersLayer.style.width = "100%";
    // clustersLayer.style.height = "100%";
    // clustersLayer.style.position = "absolute";
    // let clusterLabelsDoms = "";
    // for (const c in this.clusters) {
    //   // for each cluster create a div label
    //   const cluster = this.clusters[c];
    //   // adapt the position to viewport coordinates
    //   const viewportPos = this.renderer.graphToViewport(cluster as Coordinates);
    //   clusterLabelsDoms += `<div id='${cluster.label}' class="clusterLabel" style="top:${viewportPos.y}px;left:${viewportPos.x}px;color:${cluster.color}">${cluster.label}</div>`;
    // }
    // clustersLayer.innerHTML = clusterLabelsDoms;
    // // Insert the layer underneath the hovers layer
    // container.insertBefore(clustersLayer, container.querySelector(".sigma-hovers"));
    // // Clusters labels position needs to be updated on each render
    // this.renderer.on("afterRender", () => {
    //   for (const c in this.clusters) {
    //     const cluster = this.clusters[c];
    //     const clusterLabel = document.getElementById(cluster.label);
    //     if (clusterLabel && this.renderer) {
    //       // update position from the viewport
    //       const viewportPos = this.renderer.graphToViewport(cluster as Coordinates);
    //       clusterLabel.style.top = `${viewportPos.y}px`;
    //       clusterLabel.style.left = `${viewportPos.x}px`;
    //     }
    //   }
    // });

    setTimeout(() => {
      layout.kill();
    }, 3000);
    // console.log(this.graph.getNodeAttributes("http://purl.uniprot.org/core/Protein"));
  }

  displayEdgeInfo(edge: string | undefined) {
    const edgeInfoDiv = this.querySelector("#overview-edge-info") as HTMLElement;
    edgeInfoDiv.innerHTML = "";
    if (edge) {
      const edgeAttrs = this.graph.getEdgeAttributes(edge);
      const connectedNodes = this.graph.extremities(edge);
      edgeInfoDiv.innerHTML = `<hr></hr>`;
      edgeInfoDiv.innerHTML += `<h3><a href="${edgeAttrs.uri}" style="word-break: break-word;" target="_blank">${edgeAttrs.curie}</a></h3>`;
      if (edgeAttrs.displayLabel) edgeInfoDiv.innerHTML += `<p>${edgeAttrs.displayLabel}</p>`;
      if (edgeAttrs.comment) edgeInfoDiv.innerHTML += `<p>${edgeAttrs.comment}</p>`;
      edgeInfoDiv.innerHTML += `<div style="text-align: center">
        <code>${this.getCurie(connectedNodes[0])}</code><br/>⬇️<br/><code>${this.getCurie(connectedNodes[1])}</code>
      </div>`;
    }
    this.renderer?.refresh({skipIndexation: true});
  }

  displayNodeInfo(node: string | undefined) {
    const nodeInfoDiv = this.querySelector("#overview-node-info") as HTMLElement;
    nodeInfoDiv.innerHTML = "";
    if (node) {
      const nodeAttrs = this.graph.getNodeAttributes(node);
      nodeInfoDiv.innerHTML = `<hr></hr>`;
      nodeInfoDiv.innerHTML += `<h3><a href="${node}" style="word-break: break-word;" target="_blank">${nodeAttrs.curie}</a></h3>`;
      if (nodeAttrs.displayLabel) nodeInfoDiv.innerHTML += `<p>${nodeAttrs.displayLabel}</p>`;
      if (nodeAttrs.comment) nodeInfoDiv.innerHTML += `<p>${nodeAttrs.comment}</p>`;
      if (nodeAttrs.cluster)
        nodeInfoDiv.innerHTML += `<p>Cluster: <code style="background-color: ${this.clusters[nodeAttrs.cluster].color}">${nodeAttrs.cluster}</code></p>`;
      if (nodeAttrs.datatypes.length > 0) nodeInfoDiv.innerHTML += '<h5 style="margin: .5em;">Data properties:</h5>';
      for (const dt of nodeAttrs.datatypes) {
        const dtDiv = document.createElement("div");
        dtDiv.innerHTML = `<a href="${dt.predUri}">${dt.predCurie}</a> <a href="${dt.datatypeUri}">${dt.datatypeCurie}</a> (${dt.count.toLocaleString()})`;
        nodeInfoDiv.appendChild(dtDiv);
      }
    }
    this.renderer?.refresh({skipIndexation: true});
  }

  // https://www.sigmajs.org/storybook/?path=/story/use-reducers--story
  setSearchQuery(query: string) {
    this.searchQuery = query;
    const searchInput = this.querySelector("#search-input") as HTMLInputElement;
    if (searchInput.value !== query) searchInput.value = query;
    if (query) {
      const lcQuery = query.toLowerCase();
      const suggestions = this.graph
        .nodes()
        .map(n => ({id: n, label: this.graph.getNodeAttribute(n, "label") as string}))
        .filter(({label}) => label.toLowerCase().includes(lcQuery));
      // If we have a single perfect match, them we remove the suggestions, and consider the user has selected a node
      if (suggestions.length === 1 && suggestions[0].label === query) {
        // this.selectedNode = suggestions[0].id;
        this.selectedNode = suggestions[0].id;
        this.displayNodeInfo(suggestions[0].id);
        this.suggestions = undefined;
        // Move the camera to center it on the selected node:
        const nodePosition = this.renderer?.getNodeDisplayData(this.selectedNode) as Coordinates;
        this.renderer?.getCamera().animate(nodePosition, {duration: 500});
      } else {
        // Else, we display the suggestions list:
        // this.selectedNode = undefined;
        // this.displaySelectedNodeInfo(undefined);
        this.suggestions = new Set(suggestions.map(({id}) => id));
      }
    } else {
      // If the query is empty, then we reset the selectedNode / suggestions state:
      // this.selectedNode = undefined;
      this.suggestions = undefined;
    }
    // Refresh rendering, we don't touch the graph data so we can skip its reindexation
    this.renderer?.refresh({skipIndexation: true});
  }

  setHoveredNode(node?: string) {
    if (node) {
      this.hoveredNode = node;
      this.hoveredNeighbors = new Set(this.graph.neighbors(node));
    }
    // NOTE: hiding node done in the reducer function
    // // Compute the partial that we need to re-render to optimize the refresh
    // const nodes = this.graph.filterNodes(n => n !== this.hoveredNode && !this.hoveredNeighbors?.has(n));
    // // const nodesIndex = new Set(nodes);
    // // const edges = graph.filterEdges((e) => graph.extremities(e).some((n) => nodesIndex.has(n)));
    // const edges = this.graph.filterEdges(e => !this.graph.hasExtremity(e, node));
    if (!node) {
      this.hoveredNode = undefined;
      this.hoveredNeighbors = undefined;
    }
    // Refresh rendering
    this.renderer?.refresh({
      // partialGraph: {
      //   nodes,
      //   edges,
      // },
      // We don't touch the graph data so we can skip its reindexation
      skipIndexation: true,
    });
  }

  getCurie(uri: string) {
    return compressUri(this.prefixes, uri);
  }

  endpointUrl() {
    return Object.keys(this.endpoints)[0];
  }

  // loadMetaFromLocalStorage(): EndpointsMetadata {
  //   const metaString = localStorage.getItem("sparql-editor-metadata");
  //   return metaString ? JSON.parse(metaString) : {};
  // }

  // // Function to save metadata to localStorage
  // saveMetaToLocalStorage() {
  //   localStorage.setItem("sparql-editor-metadata", JSON.stringify(this.meta));
  // }

  // Get prefixes, VoID and examples
  async fetchEndpointMetadata(endpoint: string) {
    // if (!this.meta[endpoint].retrievedAt) {
    // console.log(`Getting metadata for ${endpoint}`);
    const [prefixes, voidInfo] = await Promise.all([getPrefixes(endpoint), queryEndpoint(voidQuery, endpoint)]);
    this.endpoints[endpoint].void = voidInfo;
    // this.prefixes = {...this.prefixes, ...prefixes};
    // Merge prefixes into `this.prefixes` one key at a time to avoid race conditions
    Object.assign(this.prefixes, prefixes);
    // this.meta[endpoint].retrievedAt = new Date();
    // this.saveMetaToLocalStorage();
  }

  renderPredicateList() {
    const sidebar = this.querySelector("#overview-predicates-list") as HTMLElement;
    sidebar.innerHTML = "";
    const sortedPredicates = Object.entries(this.predicatesCount).sort((a, b) => b[1].count - a[1].count);
    for (const [predicateCurie, predicate] of sortedPredicates) {
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = predicateCurie;
      checkbox.checked = true;
      checkbox.onchange = () => this.togglePredicate(predicateCurie, checkbox.checked);

      const label = document.createElement("label");
      label.htmlFor = predicateCurie;
      label.title = predicateCurie;
      label.textContent = `${predicate.label} (${predicate.count.toLocaleString()})`;
      const container = document.createElement("div");
      container.appendChild(checkbox);
      container.appendChild(label);
      sidebar.appendChild(container);
    }
  }

  togglePredicate(predicateLabel: string, checked: boolean) {
    if (!checked) this.hidePredicates.add(predicateLabel);
    else this.hidePredicates.delete(predicateLabel);
    this.renderer?.refresh({skipIndexation: true});
  }

  renderClusterList() {
    const sidebar = this.querySelector("#overview-clusters-list") as HTMLElement;
    sidebar.innerHTML = "";
    const sortedClusters = Object.entries(this.clusters).sort((a, b) => b[1].count - a[1].count);
    for (const [clusterLabel, clusterAttrs] of sortedClusters) {
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = clusterLabel;
      checkbox.checked = true;
      checkbox.onchange = () => this.toggleCluster(clusterLabel, checkbox.checked);

      const label = document.createElement("label");
      if (clusterAttrs.color) label.style.color = clusterAttrs.color;
      label.htmlFor = clusterLabel;
      label.textContent = `${clusterLabel} (${clusterAttrs.count})`;
      const container = document.createElement("div");
      container.appendChild(checkbox);
      container.appendChild(label);
      sidebar.appendChild(container);
    }
  }

  toggleCluster(predicateLabel: string, checked: boolean) {
    if (!checked) this.hideClusters.add(predicateLabel);
    else this.hideClusters.delete(predicateLabel);
    this.renderer?.refresh({skipIndexation: true});
  }
}

function getEdgeCurvature(index: number, maxIndex: number): number {
  if (maxIndex <= 0) throw new Error("Invalid maxIndex");
  if (index < 0) return -getEdgeCurvature(-index, maxIndex);
  const amplitude = 3.5;
  const maxCurvature = amplitude * (1 - Math.exp(-maxIndex / amplitude)) * DEFAULT_EDGE_CURVATURE;
  return (maxCurvature * index) / maxIndex;
}

customElements.define("sparql-overview", SparqlOverview);

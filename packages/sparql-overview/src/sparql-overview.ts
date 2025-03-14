import Graph from "graphology";
import Sigma from "sigma";
import forceAtlas2 from "graphology-layout-forceatlas2";
import FA2Layout from "graphology-layout-forceatlas2/worker";
import iwanthue from "iwanthue";
import {EdgeCurvedArrowProgram, indexParallelEdgesIndex} from "@sigma/edge-curve";
import {EdgeArrowProgram} from "sigma/rendering";
import type {Coordinates, EdgeDisplayData, NodeDisplayData} from "sigma/types";

// import { createNodeImageProgram } from "@sigma/node-image";
// import ForceSupervisor from "graphology-layout-force/worker";

import {getPrefixes, getVoidDescription, compressUri, getEdgeCurvature} from "./utils";
import {componentStyle} from "./styles";

type Cluster = {
  label: string;
  x?: number;
  y?: number;
  color?: string;
  count: number;
  endpoint: string;
  positions: {x: number; y: number}[];
};

type StoredMetadata = {
  [key: string]: {
    graph: any;
    prefixes: {[key: string]: string};
    clusters: {[key: string]: Cluster};
    hidePredicates: string[];
    hideClusters: string[];
  };
};

const metadataClusterLabel = "Endpoint Metadata";
const defaultGraph = "Default";

/**
 * Custom element to create a SPARQL network overview for a given endpoint classes and predicates
 * @example <sparql-overview endpoint="https://sparql.uniprot.org/sparql/"></sparql-overview>
 */
export class SparqlOverview extends HTMLElement {
  endpoints: string[] = [];

  // TODO: DRAG N DROP https://www.sigmajs.org/storybook/?path=/story/mouse-manipulations--story

  // Metadata stored in localStorage
  storedMeta: StoredMetadata = {};

  graph: Graph = new Graph({multi: true});
  prefixes: {[key: string]: string} = {};
  clusters: {[key: string]: Cluster} = {};

  // Used for rendering and filtering
  // https://github.com/jacomyal/sigma.js/issues/197
  renderer?: Sigma;
  predicates: {[key: string]: {count: number; label: string}} = {};
  hidePredicates: Set<string> = new Set();
  hideClusters: Set<string> = new Set();

  // Hovered stuff
  hoveredNode?: string;
  hoveredNeighbors?: Set<string>;
  // Clicked stuff
  selectedNodes: Set<string> = new Set();
  selectedNode?: string;
  selectedEdge?: string;
  // Search classes
  searchQuery: string = "";
  suggestions?: Set<string>;

  dialogElOpen: HTMLDialogElement | null = null;

  constructor() {
    super();
    this.endpoints = (this.getAttribute("endpoint") || "").split(",").map(value => value.trim());
    this.loadGraph();

    if (this.endpoints.length === 0)
      throw new Error("No endpoint provided. Please use the 'endpoint' attribute to specify the SPARQL endpoint URL.");

    const style = document.createElement("style");
    style.textContent = componentStyle;
    const container = document.createElement("div");
    container.id = "sparql-overview";
    container.style.display = "flex";
    container.className = "container";
    container.style.height = "100%";
    let endpointsHtml = "";
    for (const endpoint of this.endpoints) {
      endpointsHtml += `<p><a href="${endpoint}" target="_blank"><code>${endpoint}</code></a></p>`;
    }
    container.innerHTML = `
      <div id="overview-predicate-sidebar" style="display: flex; flex-direction: column;">
        <div style="display: flex; align-self: center; gap: .5em; margin-bottom: .5em;">
          <input type="search" id="search-input" list="suggestions" placeholder="Search classes...">
          <datalist id="suggestions"></datalist>
          <button id="overview-show-info" title="Information about this page">ℹ️</button>
        </div>

        <dialog id="overview-dialog-info" style="text-align: center;">
          <h4>
            Overview of classes and their relations for SPARQL endpoint${this.endpoints.length > 1 ? "s" : ""}
          </h4>
          ${endpointsHtml}
          <p style="margin-top: 1.5em;">
            This visualization uses informations about classes and their relations described using
            <a href="https://www.w3.org/TR/void/" target="_blank">VoID description</a> RDF uploaded to the endpoint, or added to the SPARQL service description.
          <p>
          </p>
            You can easily generate it for your endpoint with the
            <a href="https://github.com/JervenBolleman/void-generator" target="_blank"><code>void-generator</code></a> CLI tool.
          </p>
          <p>
            <a href="https://github.com/sib-swiss/sparql-editor/tree/main/packages/sparql-overview" target="_blank">
              Web component source code available
            </a>
          </p>
          <p style="opacity: 60%; margin: 1.5em 0;">
            💡 <code>shift + left click</code> to select multiple nodes.
          </p>
          <button id="overview-clear-cache" title="Clear and update the endpoints metadata stored in the cache">
            Clear cache
          </button>
          <button id="overview-close-info">Close</button>
        </dialog>

        <div style="text-align: center;">
          <span>Filter predicates ·</span>
          <button id="overview-show-preds" title="Show all predicates">Show all</button>
          <button id="overview-hide-preds" title="Hide all predicates">Hide all</button>
        </div>
        <div id="overview-predicates-list" style="flex: 1; overflow-y: auto;"></div>

        <hr></hr>
        <div style="text-align: center; ">
          <span>Filter graphs ·</span>
          <button id="overview-show-clusters" title="Show all graphs">Show all</button>
          <button id="overview-hide-clusters" title="Hide all graphs">Hide all</button>
        </div>
        <div id="overview-clusters-list" style="flex: 1; overflow-y: auto;"></div>

        <div id="overview-edge-info" style="overflow-y: auto;"></div>
        <div id="overview-node-info" style="overflow-y: auto;"></div>
      </div>

      <div id="loading-msg">
        <p style="margin: 0; text-align: center">Loading overview...</p>
      </div>
      <div id="network-container" width="100%" heigth="100%" style="flex: 1; display: flex; position: relative; align-items: center; justify-content: center; width: 100%; height: 100%;"></div>
    `;
    this.appendChild(style);
    this.appendChild(container);

    // Show info dialog
    const showInfoButton = this.querySelector("#overview-show-info") as HTMLButtonElement;
    const dialogInfo = this.querySelector("#overview-dialog-info") as HTMLDialogElement;
    showInfoButton.addEventListener("click", async () => {
      dialogInfo.showModal();
      this.dialogElOpen = dialogInfo;
      history.pushState({dialogOpen: true}, "");
    });
    const closeInfoButton = this.querySelector("#overview-close-info") as HTMLButtonElement;
    closeInfoButton.addEventListener("click", async () => {
      dialogInfo.close();
    });
    dialogInfo.addEventListener("close", async () => {
      this.dialogElOpen = null;
      // history.back();
    });
    const clearCacheButton = this.querySelector("#overview-clear-cache") as HTMLButtonElement;
    clearCacheButton.addEventListener("click", async () => {
      localStorage.removeItem("sparql-overview-metadata");
      this.renderer?.kill();
      this.storedMeta = {};
      this.graph = new Graph({multi: true});
      this.clusters = {};
      this.predicates = {};
      this.hidePredicates.clear();
      this.hideClusters.clear();
      this.displayMsg("Loading overview...");
      this.connectedCallback();
      dialogInfo.close();
    });

    // A custom event to trigger the rendering of the graph to make sure it is properly displayed, e.g. in dialogs
    // Trigger it with: overviewEl.dispatchEvent(new Event("render"));
    this.addEventListener("render", () => {
      this.renderer?.refresh({skipIndexation: true});
    });

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
      this.hidePredicates = new Set(Object.keys(this.predicates));
      this.renderer?.refresh({skipIndexation: true});
    });

    // Filtering buttons for clusters
    const showAllClustersButton = this.querySelector("#overview-show-clusters") as HTMLButtonElement;
    showAllClustersButton.addEventListener("click", () => {
      const checkboxes = this.querySelectorAll("#overview-clusters-list input[type='checkbox']");
      checkboxes.forEach(checkbox => {
        (checkbox as HTMLInputElement).checked = true;
      });
      this.hideClusters.clear();
      this.renderPredicatesFilter();
      this.renderer?.refresh({skipIndexation: true});
    });
    const hideAllClustersButton = this.querySelector("#overview-hide-clusters") as HTMLButtonElement;
    hideAllClustersButton.addEventListener("click", () => {
      const checkboxes = this.querySelectorAll("#overview-clusters-list input[type='checkbox']");
      checkboxes.forEach(checkbox => {
        (checkbox as HTMLInputElement).checked = false;
      });
      this.hideClusters = new Set(Object.keys(this.clusters));
      this.renderPredicatesFilter();
      this.renderer?.refresh({skipIndexation: true});
    });
  }

  async connectedCallback() {
    if (this.graph.nodes().length < 1) {
      await this.initGraph();
      if (this.graph.nodes().length > 0) this.saveGraph();
    }
    await this.renderGraph();
    const loadingSpinner = this.querySelector("#loading-msg") as HTMLElement;
    if (loadingSpinner.style.color != "red") loadingSpinner.style.display = "none";

    window.addEventListener("popstate", event => {
      if (this.dialogElOpen) {
        // If the dialog is open, close it instead of navigating
        this.dialogElOpen.close();
        this.dialogElOpen = null;
        event.preventDefault();
      }
    });
  }

  // Initialize the graph by retrieving metadata from the SPARQL endpoints
  async initGraph() {
    const defaultNodeSize = 8;
    // let largestNodeCount = 0;
    let largestEdgeCount = 0;
    const {prefixes, metadata} = await this.fetchEndpointsMetadata(this.endpoints);
    this.prefixes = prefixes;

    // Create nodes and edges based on SPARQL query results
    for (const endpoint of this.endpoints) {
      if (metadata[endpoint] && !metadata[endpoint].void) continue;
      for (const row of metadata[endpoint].void) {
        const count = row.triples ? parseInt(row.triples.value) : 5;
        if (largestEdgeCount < count) largestEdgeCount = count;

        const subjUri = row.subjectClass.value;
        // Get the cluster for the subject node
        const graphCluster = row.graphLabel
          ? row.graphLabel.value
          : row.graph
            ? this.getCurie(row.graph.value)
            : defaultGraph;
        // Add subject node
        const subjCurie = this.getCurie(subjUri);
        if (!this.graph.hasNode(subjUri)) {
          this.graph.addNode(subjUri, {
            label: subjCurie,
            curie: subjCurie,
            // count: 1,
            size: defaultNodeSize,
            cluster: graphCluster,
            endpoints: [],
            datatypes: [],
          });
          if (row.subjectClassLabel) {
            this.graph.updateNodeAttribute(subjUri, "displayLabel", () => row.subjectClassLabel.value);
            this.graph.updateNodeAttribute(subjUri, "label", () => row.subjectClassLabel.value);
          }
          if (row.subjectClassComment)
            this.graph.updateNodeAttribute(subjUri, "comment", () => row.subjectClassComment.value);
        }
        if (graphCluster !== defaultGraph) this.graph.updateNodeAttribute(subjUri, "cluster", () => graphCluster);
        this.graph.updateNodeAttribute(subjUri, "count", (value: number) => value + count);
        this.graph.updateNodeAttribute(subjUri, "endpoints", (value: string[]) => {
          if (!value.includes(endpoint)) return [...value, endpoint];
          return value;
        });
        // const subjCount = parseInt(this.graph.getNodeAttribute(subjUri, "count"))
        // if (largestNodeCount < subjCount) largestNodeCount = subjCount;

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
          const objUri = row.objectClass.value;
          // Add object node
          if (!this.graph.hasNode(objUri)) {
            const objCurie = this.getCurie(objUri);
            this.graph.addNode(objUri, {
              label: objCurie,
              curie: objCurie,
              // count: 1,
              size: defaultNodeSize,
              cluster: graphCluster,
              endpoints: [],
              datatypes: [],
            });
            if (row.objectClassLabel) {
              this.graph.updateNodeAttribute(objUri, "displayLabel", () => row.objectClassLabel.value);
              this.graph.updateNodeAttribute(objUri, "label", () => row.objectClassLabel.value);
            }
            if (row.objectClassComment)
              this.graph.updateNodeAttribute(objUri, "comment", () => row.objectClassComment.value);
          }
          this.graph.updateNodeAttribute(objUri, "endpoints", (value: string[]) => {
            if (!value.includes(endpoint)) return [...value, endpoint];
            return value;
          });
          if (graphCluster !== defaultGraph) this.graph.updateNodeAttribute(objUri, "cluster", () => graphCluster);
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
              count: count,
              type: "arrow",
            };
            if (row.triples) edgeAttrs.triples = parseInt(row.triples.value);
            if (row.propLabel) {
              edgeAttrs.curie = edgeAttrs.label;
              edgeAttrs.label = row.propLabel.value;
              edgeAttrs.displayLabel = row.propLabel.value;
            }
            if (row.propComment) edgeAttrs["comment"] = row.propComment.value;
            this.graph.addEdge(subjUri, objUri, edgeAttrs);
          }
        }
      }
      // console.log(this.graph.getNodeAttributes("http://purl.uniprot.org/core/Disease"));
    }

    // TODO: get graph for cluster, if only 1 graph use subClassOf

    if (this.graph.nodes().length < 2) {
      this.displayMsg(`No VoID description found in endpoints ${this.endpoints.join(", ")}`, true);
      return;
    }

    // Create clusters
    this.graph.forEachNode((_node, atts) => {
      if (!this.clusters[atts.cluster])
        this.clusters[atts.cluster] = {label: atts.cluster, positions: [], count: 1, endpoint: [...atts.endpoints][0]};
      else this.clusters[atts.cluster].count += 1;
    });

    // Remove empty clusters
    for (const cluster in this.clusters) {
      if (this.clusters[cluster].count === 0) {
        delete this.clusters[cluster];
      }
    }

    // create and assign one color by cluster
    const palette = iwanthue(Object.keys(this.clusters).length, {seed: "topClassesClusters"});
    for (const cluster in this.clusters) {
      this.clusters[cluster].color = palette.pop();
    }

    // // Create colors per endpoint and clusters
    // // Generate main colors for each endpoint
    // const endpointPalette = iwanthue(this.endpoints.length, { seed: "endpointColors" });
    // const endpointColors: any = {};
    // this.endpoints.forEach((endpoint, idx) => {
    //   endpointColors[endpoint] = endpointPalette[idx];
    // });
    // console.log(endpointColors)
    // // Generate shades for each cluster
    // const clusterColors: any = {};
    // for (const clusterId in this.clusters) {
    //   console.log(clusterId, this.clusters[clusterId])
    //   const endpoint = this.clusters[clusterId].endpoint;
    //   console.log("cluu", endpointColors, endpoint, clusterColors[endpoint])
    //   if (!endpointColors[endpoint]) continue;
    //   // Generate shades for the endpoint's color
    //   if (!clusterColors[endpoint]) {
    //     console.log(clusterId)
    //     clusterColors[endpoint] = iwanthue(
    //       Object.keys(this.clusters).filter(cid => this.clusters[cid].endpoint === endpoint).length,
    //       {
    //           // colorSpace: "lab",
    //           seed: endpointColors[endpoint], // Base color
    //           // lightness: [50, 70],  // Adjust for brightness range
    //           // chroma: [30, 60],     // Adjust for color intensity
    //       }
    //     );
    //     // clusterColors[endpoint] = iwanthue(Object.keys(this.clusters).filter(cid => this.clusters[cid].endpoint === endpoint).length, {
    //     //   seed: `shades-${endpoint}`,
    //     //   colorSpace: endpointColors[endpoint],
    //     // });
    //   }
    //   console.log(clusterColors)
    //   // Assign a color from the generated shades
    //   this.clusters[clusterId].color = clusterColors[endpoint].pop();
    // }

    // Define initial positions of nodes based on their clusters.
    // Comment `layout.start()` to see initial position in dev
    const clusterPositions: {[key: string]: {x: number; y: number}} = {};
    let clusterIndex = 0;
    for (const clusterId in this.clusters) {
      const angle = (clusterIndex * 2 * Math.PI) / Object.keys(this.clusters).length;
      clusterIndex++;
      const radius = 200; // Distance from the center for clusters
      clusterPositions[clusterId] = {
        x: radius * Math.cos(angle),
        y: radius * Math.sin(angle),
      };
    }

    // const largestNodeSize = 20;
    const largestEdgeSize = 5;

    this.graph.forEachEdge((_edge, atts) => {
      atts.size = (atts.count * largestEdgeSize) / largestEdgeCount;
      if (atts.size < 1) atts.size = 1;
    });

    // We need to manually set some x/y coordinates for each node
    this.graph.forEachNode((_node, atts) => {
      const clusterPos = clusterPositions[atts.cluster];
      // Add random offset to spread nodes within the cluster
      const offset = 20;
      const randomAngle = Math.random() * 2 * Math.PI;
      const randomRadius = Math.random() * offset;
      atts.x = clusterPos.x + randomRadius * Math.cos(randomAngle);
      atts.y = clusterPos.y + randomRadius * Math.sin(randomAngle);

      // atts.size = atts.count * largestNodeSize / largestNodeCount;
      // if (atts.size < 1) atts.size = 2;
      // node color depends on the cluster it belongs to
      atts.color = this.clusters[atts.cluster].color;
      // TODO: get largest node size up there, then define node size based on largest node
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
    // console.log("clusters!", this.clusters);

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
  }

  // Render the initialized graph and add all event listeners
  async renderGraph() {
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
    });
    const inferredLayoutSettings = forceAtlas2.inferSettings(this.graph);
    // console.log("inferredLayoutSettings", inferredLayoutSettings);
    const layout = new FA2Layout(this.graph, {
      settings: {
        ...inferredLayoutSettings,
        linLogMode: true,
        // barnesHutOptimize: true,
        // gravity: 0.1,
        // slowDown: 4,
        // adjustSizes: true,
        // strongGravityMode: true,
        // https://www.npmjs.com/package/graphology-layout-forceatlas2#settings
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
    this.renderer.on("clickNode", ({node, event}) => {
      if (event.original.shiftKey) {
        if (this.selectedNodes.has(node)) {
          this.selectedNodes.delete(node);
          return;
        } else this.selectedNodes.add(node);
      } else {
        // Normal click: select the node and display its info
        this.selectedNodes = new Set([node]);
      }
      this.selectedNode = node;
      this.displayNodeInfo(node);
    });
    this.renderer.on("clickStage", () => {
      this.selectedNodes = new Set();
      this.selectedNode = undefined;
      this.displayNodeInfo();
      this.selectedEdge = undefined;
      this.displayEdgeInfo();
    });
    this.renderer.on("clickEdge", ({edge}) => {
      if (this.selectedEdge !== edge) {
        this.selectedEdge = edge;
        this.displayEdgeInfo(edge);
      } else {
        this.selectedEdge = undefined;
        this.displayEdgeInfo();
      }
    });
    this.renderer.on("enterEdge", ({edge}) => {
      if (!this.selectedEdge) this.displayEdgeInfo(edge);
    });
    this.renderer.on("leaveEdge", () => {
      if (!this.selectedEdge) this.displayEdgeInfo();
    });
    // this.renderer.on("beforeClear", () => {
    //   if (!this.selectedEdge) this.displayEdgeInfo();
    // });
    // this.renderer?.refresh({skipIndexation: true});

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
      if (this.selectedNodes.has(node)) {
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

      // If multiple nodes are selected, show edges between selected nodes
      if (this.selectedNodes && this.selectedNodes.size > 0) {
        if (this.selectedNodes.has(this.graph.source(edge)) || this.selectedNodes.has(this.graph.target(edge))) {
          res.hidden = false;
        } else {
          res.hidden = true;
        }
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

    this.renderPredicatesFilter();
    this.renderClustersFilter();

    // Feed the datalist autocomplete values:
    const searchSuggestions = this.querySelector("#suggestions") as HTMLDataListElement;
    searchSuggestions.innerHTML = this.graph
      .nodes()
      .sort()
      .map(node => `<option value="${this.graph.getNodeAttribute(node, "label")}"></option>`)
      .join("\n");

    // // Add clusters labels at their barycenter
    // const clustersLayer = document.createElement("div");
    // clustersLayer.id = "clustersLayer";
    // clustersLayer.style.width = "100%";
    // clustersLayer.style.height = "100%";
    // clustersLayer.style.position = "absolute";
    // let clusterLabelsDoms = "";
    // for (const c in this.clusters) {
    //   const cluster = this.clusters[c];
    //   // For each cluster adapt the position to viewport coordinates
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
      this.renderer?.refresh({skipIndexation: true});
    }, 3000);
    // console.log(this.graph.getNodeAttributes("http://purl.uniprot.org/core/Protein"));
  }

  displayEdgeInfo(edge?: string) {
    const edgeInfoDiv = this.querySelector("#overview-edge-info") as HTMLElement;
    edgeInfoDiv.innerHTML = "";
    if (edge) {
      const edgeAttrs = this.graph.getEdgeAttributes(edge);
      const connectedNodes = this.graph.extremities(edge);
      const triplesCount = edgeAttrs.triples ? `${edgeAttrs.triples.toLocaleString()}<br/>` : "";
      edgeInfoDiv.innerHTML = `<hr></hr>`;
      edgeInfoDiv.innerHTML += `<div style="text-align: center">
        ${triplesCount}
        <code style="word-wrap: anywhere;"><a href="${connectedNodes[0]}" target="_blank">${this.graph.getNodeAttributes(connectedNodes[0]).label}</a></code>
        <br/>⬇️ <b><code><a href="${edgeAttrs.uri}" style="word-break: break-word;" target="_blank">${edgeAttrs.curie}</a></code></b><br/>
        <code style="word-wrap: anywhere;"><a href="${connectedNodes[1]}" target="_blank">${this.graph.getNodeAttributes(connectedNodes[1]).label}</a></code>
      </div>`;
      // TODO: add `triples` counts retrieved from VoID on subjectClass/objectClass relations when possible
      if (edgeAttrs.displayLabel) edgeInfoDiv.innerHTML += `<p>${edgeAttrs.displayLabel}</p>`;
      if (edgeAttrs.comment) edgeInfoDiv.innerHTML += `<p>${edgeAttrs.comment}</p>`;
    }
    this.renderer?.refresh({skipIndexation: true});
  }

  displayNodeInfo(node?: string) {
    const nodeInfoDiv = this.querySelector("#overview-node-info") as HTMLElement;
    if (node) {
      const nodeAttrs = this.graph.getNodeAttributes(node);
      let nodeHtml = "";
      nodeHtml = `<hr></hr>`;
      nodeHtml += `<h3><a href="${node}" style="word-break: break-word;" target="_blank">${nodeAttrs.curie}</a></h3>`;
      if (nodeAttrs.displayLabel) nodeHtml += `<p>${nodeAttrs.displayLabel}</p>`;
      if (nodeAttrs.comment) nodeHtml += `<p>${nodeAttrs.comment}</p>`;
      if (nodeAttrs.cluster)
        nodeHtml += `<p><span title="In this graph" style="display: inline-block; border-radius: 6px; padding: 0.1em 0.3em; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1); background-color: ${this.clusters[nodeAttrs.cluster].color}">
          ${nodeAttrs.cluster}
        </span></p>`;
      if (this.endpoints.length > 1) {
        nodeHtml += "<p>Endpoint:";
        for (const endpoint of nodeAttrs.endpoints) {
          nodeHtml += `<br/><a href="${endpoint}">${endpoint}</a>`;
        }
        nodeHtml += "</p>";
      }
      if (nodeAttrs.datatypes.length > 0) nodeHtml += '<h5 style="margin: .5em;">Data properties:</h5>';
      nodeInfoDiv.innerHTML = nodeHtml;
      for (const dt of nodeAttrs.datatypes) {
        const dtDiv = document.createElement("div");
        dtDiv.innerHTML = `<a href="${dt.predUri}">${dt.predCurie}</a> <a href="${dt.datatypeUri}">${dt.datatypeCurie}</a> (${dt.count.toLocaleString()})`;
        nodeInfoDiv.appendChild(dtDiv);
      }
    } else {
      nodeInfoDiv.innerHTML = "";
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

  displayMsg(msg?: string, isError: boolean = false) {
    const msgEl = this.querySelector("#loading-msg") as HTMLElement;
    if (msg) {
      msgEl.style.color = isError ? "red" : "black";
      msgEl.innerHTML = msg;
      msgEl.style.display = "";
    } else {
      msgEl.style.display = "none";
    }
  }

  // Save graph metadata to localStorage
  saveGraph() {
    this.storedMeta[this.endpoints.join(",")] = {
      prefixes: this.prefixes,
      clusters: this.clusters,
      // NOTE: array/set conversion does not seems to work
      hidePredicates: Array.from(this.hidePredicates),
      hideClusters: Array.from(this.hideClusters),
      graph: this.graph.export(),
    };
    const jsonString = JSON.stringify(this.storedMeta);
    try {
      localStorage.setItem("sparql-overview-metadata", jsonString);
    } catch {
      const sizeInBytes = new Blob([jsonString]).size;
      const sizeInMB = sizeInBytes / (1024 * 1024);
      // console.log(`Data size: ${sizeInMB.toFixed(2)} MB`);
      console.warn(
        `Data exceeds localStorage limit (${sizeInMB.toFixed(2)}/5 MB), will not use cache to store graph metadata.`,
      );
    }
  }

  // Load graph metadata from localStorage
  loadGraph() {
    const metaString = localStorage.getItem("sparql-overview-metadata");
    if (metaString) {
      this.storedMeta = JSON.parse(metaString);
      const meta = this.storedMeta[this.endpoints.join(",")];
      if (meta) {
        // console.log("Loaded SPARQL overview metadata from localStorage", meta);
        this.prefixes = meta.prefixes;
        this.clusters = meta.clusters;
        this.hidePredicates = new Set(meta.hidePredicates);
        this.hideClusters = new Set(meta.hideClusters);
        this.graph.import(meta.graph);
      }
    }
  }

  // Fetch endpoints metadata in parallel (prefixes, VoID)
  async fetchEndpointsMetadata(endpoints: string[]) {
    const prefixes: {[key: string]: string} = {};
    const metadata: any = {};
    // Function to fetch prefixes and VoID data for one endpoint
    const fetchEndpointMetadata = async (endpoint: string) => {
      try {
        const [endpointPrefixes, voidInfo] = await Promise.all([getPrefixes(endpoint), getVoidDescription(endpoint)]);

        // Merge results
        Object.assign(prefixes, endpointPrefixes); // Merge prefixes into shared object
        metadata[endpoint] = {prefixes: endpointPrefixes, void: voidInfo};
      } catch (err) {
        this.displayMsg(`Error fetching metadata for endpoint ${endpoint}: ${err}`, true);
      }
    };
    // Run all endpoint metadata fetches in parallel
    await Promise.all(endpoints.map(fetchEndpointMetadata));
    return {prefixes, metadata};
  }

  renderPredicatesFilter() {
    const sidebar = this.querySelector("#overview-predicates-list") as HTMLElement;
    sidebar.innerHTML = "";

    // Recalculate predicates list for visible edges/nodes
    this.predicates = {};
    this.graph.forEachEdge((_edge, atts, source, target) => {
      // Only take into account edges that not between nodes in hidden clusters
      if (this.hideClusters.has(this.graph.getNodeAttribute(source, "cluster"))) return;
      if (this.hideClusters.has(this.graph.getNodeAttribute(target, "cluster"))) return;
      if (!this.predicates[atts.curie]) {
        this.predicates[atts.curie] = {count: 1, label: atts.label};
      } else {
        this.predicates[atts.curie].count += 1;
      }
    });
    const sortedPredicates = Object.entries(this.predicates).sort((a, b) => b[1].count - a[1].count);

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

  renderClustersFilter() {
    const sidebar = this.querySelector("#overview-clusters-list") as HTMLElement;
    sidebar.innerHTML = "";
    const sortedClusters = Object.entries(this.clusters).sort((a, b) => b[1].count - a[1].count);
    for (const [clusterLabel, clusterAttrs] of sortedClusters) {
      if (clusterAttrs.count === 0) continue; // Skip clusters with 0 entries
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = clusterLabel;
      checkbox.checked = true;
      checkbox.onchange = () => this.toggleCluster(clusterLabel, checkbox.checked);
      const label = document.createElement("label");
      if (clusterAttrs.color) label.style.color = clusterAttrs.color;
      label.htmlFor = clusterLabel;
      label.textContent = `${clusterLabel} (${clusterAttrs.count})`;
      if (this.endpoints.length > 1) label.title = clusterAttrs.endpoint;
      // Special title for endpoint metadata
      if (clusterLabel == metadataClusterLabel) label.title = "Show metadata classes (ontology, SHACL, VoID, examples)";
      const container = document.createElement("div");
      container.appendChild(checkbox);
      container.appendChild(label);
      sidebar.appendChild(container);
    }
  }

  toggleCluster(predicateLabel: string, checked: boolean) {
    if (!checked) this.hideClusters.add(predicateLabel);
    else this.hideClusters.delete(predicateLabel);
    this.renderPredicatesFilter();
    this.renderer?.refresh({skipIndexation: true});
  }

  getCurie(uri: string) {
    return compressUri(this.prefixes, uri);
  }
}

customElements.define("sparql-overview", SparqlOverview);

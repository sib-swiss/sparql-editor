/* eslint-disable */
import cytoscape from "cytoscape";
import fcose from "cytoscape-fcose";
// import COSEBilkent from "cytoscape-cose-bilkent";
// import nodeHtmlLabel from 'cytoscape-node-html-label'
// import elk from 'cytoscape-elk';
// import cola from "cytoscape-cola";

// const nodeHtmlLabel = require('cytoscape-node-html-label');
// import dagre from 'cytoscape-dagre'
// import spread from 'cytoscape-spread'
import {Network} from "vis-network/peer";
import "vis-network/styles/vis-network.css";

import {getPrefixes, EndpointsMetadata, compressUri, queryEndpoint} from "./utils";

// https://github.com/MaastrichtU-IDS/knowledge-collaboratory/blob/main/frontend/package.json
cytoscape.use(fcose);
// cytoscape.use(dagre)
// cytoscape.use(cola)
// spread(cytoscape)
// cytoscape.use(COSEBilkent);
// cytoscape.use(elk);
// cytoscape.use(cola);
// nodeHtmlLabel(cytoscape);
// cytoscape.use(popper)

function getImageDimensions(src: string, callback: any) {
  const img = new Image();
  img.onload = () => callback(img.width, img.height);
  img.src = src;
}

const getVoidQuery = `PREFIX sh:<http://www.w3.org/ns/shacl#>
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
              ?pp void:classPartition [ void:class ?objectClass ] .
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
  } ORDER BY ?subjectClass ?objectClass ?objectDatatype ?graph ?triples`;

// const groupColors = ["blue", "green", "red", "yellow", "orange", "purple", "pink", "brown", "gray", "black"];

/**
 * Custom element to create a SPARQL editor for a given endpoint using YASGUI
 * with autocompletion for classes and properties based on VoID description stored in the endpoint
 * and prefixes defined using SHACL in the endpoint
 * @example <sparql-editor endpoint="https://sparql.uniprot.org/sparql/" examples-on-main-page="10"></sparql-editor>
 */
export class SparqlMetamap extends HTMLElement {
  // endpoints: string[];
  endpoints: {[key: string]: {label?: string; description?: string; graphs: string[]}};
  meta: EndpointsMetadata;
  network: Network | undefined;
  prefixes: {[key: string]: string};
  cy: cytoscape.Core | undefined;
  elems: cytoscape.ElementDefinition[];

  constructor() {
    super();
    this.prefixes = {};
    this.meta = this.loadMetaFromLocalStorage();
    // console.log("Loaded metadata from localStorage", this.meta);
    const endpointList = (this.getAttribute("endpoints") || "").split(",");
    this.endpoints = {};
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
      #cy {
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
      <div id="cy"></div>
    `;

    this.appendChild(style);
    this.appendChild(container);

    const showAllButton = this.querySelector("#metamap-show-all") as HTMLButtonElement;
    const hideAllButton = this.querySelector("#metamap-hide-all") as HTMLButtonElement;

    showAllButton.addEventListener("click", () => {
      const checkboxes = this.querySelectorAll("#metamap-predicates-list input[type='checkbox']");
      checkboxes.forEach(checkbox => {
        (checkbox as HTMLInputElement).checked = true;
        const predicateLabel = checkbox.id;
        this.togglePredicate(predicateLabel, true);
      });
    });

    hideAllButton.addEventListener("click", () => {
      const checkboxes = this.querySelectorAll("#metamap-predicates-list input[type='checkbox']");
      checkboxes.forEach(checkbox => {
        (checkbox as HTMLInputElement).checked = false;
        const predicateLabel = checkbox.id;
        this.togglePredicate(predicateLabel, false);
      });
    });

    this.elems = [];
  }

  async connectedCallback() {
    // Example cytoscape use: https://github.com/MaastrichtU-IDS/knowledge-collaboratory/blob/main/frontend/src/components/CytoscapeRdf.tsx
    // Get elements for endpoints
    for (const endpoint of Object.keys(this.endpoints)) {
      await this.getMetadata(endpoint);
      await this.getCyElements(endpoint);
      // NOTE: Only do 1 endpoint for now
      break;
    }
    console.log("Elems", this.elems);
    const unselectedColor = "black";
    const unselectedEdgesStyle = {
      color: unselectedColor,
      "line-color": unselectedColor,
      "target-arrow-color": unselectedColor,
      "font-size": "14px",
      width: 1,
      "z-index": "1",
    };

    this.cy = cytoscape({
      container: this.querySelector("#cy") as HTMLElement,
      elements: this.elems,
      style: [
        {
          selector: "node",
          style: {
            // "background-image": "data(image)",
            // shape: "rectangle",
            // "background-fit": "contain",
            // "background-color": "white",
            // 'width': '',
            // 'height': '100%',
            // "background-height-relative-to": "inner",
            // 'background-clip': 'node',
            // 'background-fit': 'cover',
            // 'background-image-containment': 'over',
            // 'background-width': '100%',
            // 'background-height': '100%',
            // 'label': 'data(label)',
            // 'background-color': '#60a6db',
            // 'text-valign': 'center',
            // 'text-halign': 'center',
            // 'shape': 'roundrectangle',
            // 'background-width': '100%',
            // 'background-height': '100%',
            // 'padding-top': '5px',
            // 'padding-bottom': '5px',
            // 'padding-left': '5px',
            // 'padding-right': '5px',
            // 'text-wrap': 'wrap',
            // 'width': 'label',
            // 'height': 'label',
            // 'border-radius': '10px',
            // 'text-max-width': '80px',
          },
        },
        {
          selector: "edge",
          // @ts-ignore
          style: {
            label: "data(label)",
            "text-rotation": "autorotate",
            // 'text-margin-y': '-10',
            "text-wrap": "wrap",
            "text-max-width": "80px",
            "curve-style": "bezier",
            "target-arrow-shape": "triangle",
            ...unselectedEdgesStyle,
          },
        },
        {
          selector: "node:selected",
          style: {
            "border-width": "2px",
            "border-color": "red",
          },
        },
        {
          selector: "edge:selected",
          style: {
            "line-color": "blue",
            "target-arrow-color": "blue",
          },
        },
      ],
      layout: layoutsConfig[useLayout],
      // layout: layoutsConfig['fcose'],
      // layout: layoutsConfig['cose-bilkent'],
      // layout: layoutsConfig['cola'],
      // layout: layoutsConfig['elk'],
      // layout: layoutsConfig['dagre'],
      // layout: layoutsConfig['spread'],
    });

    this.cy.$("node").on("tap", (e: any) => {
      this.cy?.edges().style(unselectedEdgesStyle);
      e.target.connectedEdges().style({
        color: "#c62828", // red
        "line-color": "#c62828",
        "target-arrow-color": "#c62828",
        width: 4,
        "font-size": "30px",
        "z-index": "9999",
      });
    });

    this.cy.nodes().forEach(node => {
      const imgSrc = node.data("image");
      getImageDimensions(imgSrc, (width: any, height: any) => {
        node.style({
          width: width,
          height: height,
        });
      });
    });

    // this.cy.nodeHtmlLabel([{
    //     query: '.l1',
    //     valign: "top",
    //     halign: "left",
    //     valignBox: "top",
    //     halignBox: "left",
    //     tpl: function(data: any) {
    //       return `<p><b>${data.label}</b></p>${data.datatypesHtml}`;
    //     }
    //   },
    //   // {
    //   //     query: '.l2',
    //   //     tpl: function(data) {
    //   //         return '<p class="cy-title__p1">' + data.id + '</p>' + '<p  class="cy-title__p2">' + data.name + '</p>';
    //   //     }
    //   // }
    // ]);

    // Show all nodes when zoom in
    // this.cy.on('zoom', function() {
    //   const zoomLevel = cy.zoom();
    //   if (zoomLevel > 2) {
    //     // When zoomed in, replace the Annotation node with detailed annotation nodes
    //     cy.add([
    //       { data: { id: 'Disease_Annotation', label: 'Disease Annotation', parent: 'Annotations' } },
    //       { data: { id: 'Cross_Link_Annotation', label: 'Cross-Link Annotation', parent: 'Annotations' } },
    //       { data: { id: 'Self_Interactions', label: 'Self Interactions', parent: 'Annotations' } },
    //       // Define other detailed nodes here
    //     ]);
    //     cy.remove('node[id="Annotations"]');
    //   } else {
    //     // When zoomed out, show the summarized view again
    //     cy.add({ data: { id: 'Annotations', label: 'Annotations' } });
    //     cy.remove('node[id="Disease_Annotation"], node[id="Cross_Link_Annotation"], node[id="Self_Interactions"]');
    //   }
    // });
  }

  async getCyElements(endpoint: string) {
    const nodesMap = new Map();
    const edgesMap = new Map();
    const nodeDatatypesMap = new Map();
    const queryResults = await queryEndpoint(getVoidQuery, endpoint);

    // NOTE: We need to iterate a first time to generate all nodes images
    queryResults.forEach(row => {
      if (row.objectDatatype) {
        const next = {
          id: this.getCurie(row.objectDatatype.value),
          dtIri: row.objectDatatype.value,
          predIri: row.prop.value,
          predId: this.getCurie(row.prop.value),
          count: parseInt(row.triples.value),
        };
        if (nodeDatatypesMap.has(row.subjectClass.value)) {
          nodeDatatypesMap.get(row.subjectClass.value).push(next);
        } else {
          nodeDatatypesMap.set(row.subjectClass.value, [next]);
        }
      }
    });

    queryResults.forEach(row => {
      // console.log(row);
      if (row.objectClass && !row.objectDatatype) {
        const propId = `${row.subjectClass.value}-${row.prop.value}-${row.objectClass.value}`;
        const count = row.triples ? parseInt(row.triples.value) : 1;
        this.addNode(row.subjectClass, row.graph, count, nodesMap, nodeDatatypesMap);
        this.addNode(row.objectClass, row.graph, count, nodesMap, nodeDatatypesMap);

        if (edgesMap.has(propId)) {
          const temp = edgesMap.get(propId);
          temp.data.value += count;
          temp.data.title = `${temp.data.value.toLocaleString()} triples`;
        } else {
          edgesMap.set(propId, {
            data: {
              id: propId,
              source: row.subjectClass.value,
              target: row.objectClass.value,
              // arrows: "to",
              value: count,
              label: this.getCurie(row.prop.value),
              title: `${count.toLocaleString()} triples`,
            },
          });
        }
      }
    });
    const nodes = Array.from(nodesMap.values());
    const edges = Array.from(edgesMap.values());
    console.log(nodes, edges, this.elems);
    this.elems = [...this.elems, ...nodes, ...edges];
    this.renderPredicateList();
  }

  // https://github.com/kaluginserg/cytoscape-node-html-label/blob/master/src/cytoscape-node-html-label.ts
  // https://github.com/BradyDouthit/cytoscape-html
  // https://github.com/calebchase/cytoscape.js-html-node/blob/main/src/htmlNode.js
  addNode(node: any, graphId: any, count: any, nodesMap: any, nodeDatatypesMap: any) {
    // const nodeId = `${node.value}-${graphId.value}`;
    const nodeId = node.value;
    // console.log(compressUri(this.meta[this.endpoints[0]].prefixes, node.value), this.meta[this.endpoints[0]].prefixes)
    // const nodeId = compressUri(this.meta[this.endpoints[0]].prefixes, node.value);
    if (nodesMap.has(nodeId)) {
      const prior = nodesMap.get(nodeId);
      prior.data.value = prior.data.value + count;
    } else {
      // const svgImg = this.asImage(this.getCurie(nodeId), nodeDatatypesMap.get(nodeId));
      let label = this.getCurie(nodeId);
      const datatypes = nodeDatatypesMap.get(nodeId);
      if (datatypes && datatypes.length > 0) {
        const datatypeLabels = datatypes.map(
          (dt: any) => `${this.getCurie(dt.predId)}: ${this.getCurie(dt.id)} (${dt.count.toLocaleString()})`,
        );
        label += `\n\n${datatypeLabels.join("\n")}`;
      }
      nodesMap.set(nodeId, {
        data: {
          id: nodeId,
          label: label,
          // label: this.getCurie(nodeId),
          // shape: "image",
          // group: graphId.value,
          value: count,
          // datatypes: datatypes,
          // datatypesHtml: datatypesHtml,
          // image: svgImg,
        },
      });
    }
  }

  renderPredicateList() {
    const sidebar = this.querySelector("#metamap-predicates-list") as HTMLElement;
    sidebar.innerHTML = "";
    const allEdges = Array.from(this.elems.filter(elem => elem.data.source));
    console.log("allEdges", allEdges);
    const predicateCounts: {[key: string]: number} = {};
    allEdges.forEach(elem => {
      if (predicateCounts[elem.data.label]) {
        predicateCounts[elem.data.label] += 1;
      } else {
        predicateCounts[elem.data.label] = 1;
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
    // Find edges related to this predicate
    const edges = this.cy?.edges(`[label="${predicateLabel}"]`);
    edges?.style("display", checked ? "element" : "none");
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
      // [
      //   this.meta[endpoint].examples,
      //   this.meta[endpoint].prefixes,
      //   [this.meta[endpoint].void, this.meta[endpoint].classes, this.meta[endpoint].predicates],
      // ] = await Promise.all([getExampleQueries(endpoint), getPrefixes(endpoint), getVoidDescription(endpoint)]);
      this.meta[endpoint].prefixes = await getPrefixes(endpoint);
      this.meta[endpoint].retrievedAt = new Date();
      // this.saveMetaToLocalStorage();
    }
    this.prefixes = {...this.prefixes, ...this.meta[endpoint].prefixes};
  }

  // draw(nodes: any[], edges: any[]) {
  //   // Instantiate our network object.
  //   const container = document.getElementById("visnetwork") as HTMLElement;
  //   const data = {
  //     nodes: nodes,
  //     edges: edges,
  //   };

  //   const groups: {[key: string]: {color: {background: string, border: string}}} = {}
  //   Object.keys(this.endpoints).forEach((endpoint, i) => {
  //     this.endpoints[endpoint].graphs.forEach((g, j) => {
  //       groups[g] = {
  //         color: {
  //           background: groupColors[(i + j) % groupColors.length],
  //           border: "lightgray",
  //         },
  //         // shape: "ellipse",
  //       }
  //     })
  //   })
  //   const options = {
  //     nodes: {
  //       scaling: {
  //         //   label: {enabled: true},
  //         //       customScalingFunction: function(min, max, total, value) {
  //         //	  console.log(value, total, value / total)
  //         //          const r = value / total;
  //         //if (r < min) {
  //         //  return min;
  //         //} else if (r > max) {
  //         //return max;
  //         //}
  //         //     	  return r;
  //         //        },
  //         //        min: 0.1,
  //         //        max: 1,
  //       },
  //     },
  //     edges: {},
  //     layout: {
  //       improvedLayout: false,
  //     },
  //     physics: {
  //       solver: "forceAtlas2Based",
  //     },
  //     groups: groups,
  //   };
  //   this.network = new Network(container, data, options);
  // }

  asImage(nodeCurie: any, datatypes: any) {
    const titleFontSize = 16;
    const textFontSize = 12;

    let nodeWidth = nodeCurie.length * (titleFontSize - 3);
    let height = 40;
    let middle = "";
    let maxWidthLines = 0;
    if (datatypes !== undefined) {
      height += datatypes.length * (textFontSize + 8) + 20;
      middle =
        `<table style="font-size:${textFontSize}px;"><tr><th>predicate</th><th>datatype</th><th>triples</th></tr>` +
        datatypes
          .map(
            (dt: any) =>
              `<tr><td><a href="${dt.predIri}">${dt.predId}</a></td> <td><a href="${dt.dtIri}">${dt.id}</a></td> <td style="text-align:right;">${dt.count.toLocaleString()}</td></tr>`,
          )
          .join(" ") +
        "</table>";
      maxWidthLines = Math.max(
        ...datatypes.map(
          (dt: any) => `${dt.predId}${dt.id}${dt.count.toLocaleString()}`.length * (textFontSize - 2) + 15,
        ),
      );
      nodeWidth = Math.max(nodeWidth, maxWidthLines);
    }
    const start =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${nodeWidth}px" height="${height}px">` +
      '<rect x="0" y="0" width="100%" height="100%" fill="white" stroke-width="20" stroke="black" ></rect>' +
      '<foreignObject x="15" y="10" width="100%" height="100%">' +
      '<div xmlns="http://www.w3.org/1999/xhtml" style="font-family:monospace;">' +
      `<em style='font-size:${titleFontSize}px; text-align: center;'>${nodeCurie}</em><br/>`;

    const end = "</div>" + "</foreignObject>" + "</svg>";

    const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(start + middle + end);
    //console.log(url)
    return url;
  }
}

customElements.define("sparql-metamap", SparqlMetamap);

const layoutsConfig = {
  // https://github.com/iVis-at-Bilkent/cytoscape.js-fcose
  fcose: {
    name: "fcose",
    // 'draft', 'default' or 'proof'
    // - "draft" only applies spectral layout
    // - "default" improves the quality with incremental layout (fast cooling rate)
    // - "proof" improves the quality with incremental layout (slow cooling rate)
    quality: "default",
    // Use random node positions at beginning of layout
    // if this is set to false, then quality option must be "proof"
    randomize: true,
    infinite: false,
    // Whether or not to animate the layout
    animate: false,
    // Duration of animation in ms, if enabled
    animationDuration: 2000,
    // Easing of animation, if enabled
    animationEasing: undefined,
    // Fit the viewport to the repositioned nodes
    fit: true,
    // Padding around layout
    padding: 30,
    // Whether to include labels in node dimensions. Valid in "proof" quality
    nodeDimensionsIncludeLabels: true,
    // Whether or not simple nodes (non-compound nodes) are of uniform dimensions
    uniformNodeDimensions: false,
    // Whether to pack disconnected components - cytoscape-layout-utilities extension should be registered and initialized
    packComponents: false,
    // Layout step - all, transformed, enforced, cose - for debug purpose only
    step: "all",
    // False for random, true for greedy sampling
    samplingType: false,
    // Sample size to construct distance matrix
    sampleSize: 200,
    // Separation amount between nodes
    nodeSeparation: 2000,
    // Power iteration tolerance
    piTol: 0.0000001,
    /* incremental layout options */
    // Node repulsion (non overlapping) multiplier
    nodeRepulsion: (node: any) => 7000,
    // Ideal edge (non nested) length
    idealEdgeLength: (edge: any) => 800,
    // Divisor to compute edge forces
    edgeElasticity: (edge: any) => 0.4,
    // Nesting factor (multiplier) to compute ideal edge length for nested edges
    nestingFactor: 0.1,
    // Maximum number of iterations to perform - this is a suggested value and might be adjusted by the algorithm as required
    numIter: 5000,
    // For enabling tiling
    tile: true,
    // Represents the amount of the vertical space to put between the zero degree members during the tiling operation(can also be a function)
    tilingPaddingVertical: 10,
    // Represents the amount of the horizontal space to put between the zero degree members during the tiling operation(can also be a function)
    tilingPaddingHorizontal: 10,
    // Gravity force (constant)
    gravity: 0.01,
    // Gravity range (constant) for compounds
    gravityRangeCompound: 0.5,
    // Gravity force (constant) for compounds
    gravityCompound: 0.1,
    // Gravity range (constant)
    gravityRange: 0.6,
    // Initial cooling factor for incremental layout
    initialEnergyOnIncremental: 0.3,
    /* constraint options */
    // Fix desired nodes to predefined positions
    // [{nodeId: 'n1', position: {x: 100, y: 200}}, {...}]
    fixedNodeConstraint: undefined,
    // Align desired nodes in vertical/horizontal direction
    // {vertical: [['n1', 'n2'], [...]], horizontal: [['n2', 'n4'], [...]]}
    alignmentConstraint: undefined,
    // Place two nodes relatively in vertical/horizontal direction
    // [{top: 'n1', bottom: 'n2', gap: 100}, {left: 'n3', right: 'n4', gap: 75}, {...}]
    relativePlacementConstraint: undefined,
    /* layout event callbacks */
    // ready: () => {}, // on layoutready
    // stop: () => {} // on layoutstop
  },
  "cose-bilkent": {
    name: "cose-bilkent",
    // Called on `layoutready`
    ready: function () {},
    // Called on `layoutstop`
    stop: function () {},
    // 'draft', 'default' or 'proof"
    // - 'draft' fast cooling rate
    // - 'default' moderate cooling rate
    // - "proof" slow cooling rate
    quality: "default",
    // Whether to include labels in node dimensions. Useful for avoiding label overlap
    nodeDimensionsIncludeLabels: false,
    // number of ticks per frame; higher is faster but more jerky
    refresh: 30,
    // Whether to fit the network view after when done
    fit: true,
    // Padding on fit
    padding: 10,
    // Whether to enable incremental mode
    randomize: true,
    // Node repulsion (non overlapping) multiplier
    nodeRepulsion: 200,
    // Ideal (intra-graph) edge length
    idealEdgeLength: 2000,
    // Divisor to compute edge forces
    edgeElasticity: 0.45,
    // Nesting factor (multiplier) to compute ideal edge length for inter-graph edges
    nestingFactor: 0.01,
    // Gravity force (constant)
    gravity: 0.01,
    // Maximum number of iterations to perform
    numIter: 3000,
    // Whether to tile disconnected nodes
    tile: true,
    // Type of layout animation. The option set is {'during', 'end', false}
    animate: false,
    // Duration for animate:end
    animationDuration: 500,
    // Amount of vertical space to put between degree zero nodes during tiling (can also be a function)
    tilingPaddingVertical: 1000,
    // Amount of horizontal space to put between degree zero nodes during tiling (can also be a function)
    tilingPaddingHorizontal: 1000,
    // Gravity range (constant) for compounds
    gravityRangeCompound: 0.01,
    // Gravity force (constant) for compounds
    gravityCompound: 0.01,
    // Gravity range (constant)
    gravityRange: 0.01,
    // Initial cooling factor for incremental layout
    initialEnergyOnIncremental: 0.5,
  },
  cola: {
    name: "cola",
    // edgeLengthVal: 1000,
    animate: false, // whether to show the layout as it's running
    refresh: 1, // number of ticks per frame; higher is faster but more jerky
    maxSimulationTime: 4000, // max length in ms to run the layout
    ungrabifyWhileSimulating: false, // so you can't drag nodes during layout
    fit: true, // on every layout reposition of nodes, fit the viewport
    padding: 30, // padding around the simulation
    boundingBox: undefined, // constrain layout bounds; { x1, y1, x2, y2 } or { x1, y1, w, h }
    nodeDimensionsIncludeLabels: true, // whether labels should be included in determining the space used by a node
    // positioning options
    randomize: false, // use random node positions at beginning of layout
    avoidOverlap: true, // if true, prevents overlap of node bounding boxes
    handleDisconnected: true, // if true, avoids disconnected components from overlapping
    convergenceThreshold: 0.01, // when the alpha value (system energy) falls below this value, the layout stops
    nodeSpacing: function (node: any) {
      return 120;
    }, // extra spacing around nodes
    flow: undefined, // use DAG/tree flow layout if specified, e.g. { axis: 'y', minSeparation: 30 }
    alignment: undefined, // relative alignment constraints on nodes, e.g. {vertical: [[{node: node1, offset: 0}, {node: node2, offset: 5}]], horizontal: [[{node: node3}, {node: node4}], [{node: node5}, {node: node6}]]}
    gapInequalities: undefined, // list of inequality constraints for the gap between the nodes, e.g. [{"axis":"y", "left":node1, "right":node2, "gap":25}]
    centerGraph: true, // adjusts the node positions initially to center the graph (pass false if you want to start the layout from the current position)
    // different methods of specifying edge length
    // each can be a constant numerical value or a function like `function( edge ){ return 2; }`
    edgeLength: undefined, // sets edge length directly in simulation
    edgeSymDiffLength: undefined, // symmetric diff edge length in simulation
    edgeJaccardLength: undefined, // jaccard edge length in simulation
    // iterations of cola algorithm; uses default values on undefined
    unconstrIter: undefined, // unconstrained initial layout iterations
    userConstIter: undefined, // initial layout iterations with user-specified constraints
    allConstIter: undefined, // initial layout iterations with all constraints including non-overlap
    // layout event callbacks
    ready: function () {}, // on layoutready
    stop: function () {}, // on layoutstop
  },
  elk: {
    nodeDimensionsIncludeLabels: false, // Boolean which changes whether label dimensions are included when calculating node dimensions
    fit: true, // Whether to fit
    padding: 20, // Padding on fit
    animate: false, // Whether to transition the node positions
    animateFilter: function (node: any, i: any) {
      return true;
    }, // Whether to animate specific nodes when animation is on; non-animated nodes immediately go to their final positions
    animationDuration: 500, // Duration of animation in ms if enabled
    animationEasing: undefined, // Easing of animation if enabled
    transform: function (node: any, pos: any) {
      return pos;
    }, // A function that applies a transform to the final node position
    ready: undefined, // Callback on layoutready
    stop: undefined, // Callback on layoutstop
    nodeLayoutOptions: undefined, // Per-node options function
    elk: {
      // All options are available at http://www.eclipse.org/elk/reference.html
      //
      // 'org.eclipse.' can be dropped from the identifier. The subsequent identifier has to be used as property key in quotes.
      // E.g. for 'org.eclipse.elk.direction' use:
      // 'elk.direction'
      //
      // Enums use the name of the enum as string e.g. instead of Direction.DOWN use:
      // 'elk.direction': 'DOWN'
      //
      // The main field to set is `algorithm`, which controls which particular layout algorithm is used.
      // Example (downwards layered layout):
      algorithm: "layered",
      "elk.direction": "DOWN",
    },
    priority: function (edge: any) {
      return null;
    }, // Edges with a non-nil value are skipped when geedy edge cycle breaking is enabled
  },
  // A bit flat layout
  dagre: {
    name: "dagre",
    // dagre algo options, uses default value on undefined
    nodeSep: undefined, // the separation between adjacent nodes in the same rank
    edgeSep: undefined, // the separation between adjacent edges in the same rank
    rankSep: undefined, // the separation between each rank in the layout
    rankDir: "TB", // 'TB' for top to bottom flow, 'LR' for left to right,
    align: "DR", // alignment for rank nodes. Can be 'UL', 'UR', 'DL', or 'DR', where U = up, D = down, L = left, and R = right
    acyclicer: undefined, // If set to 'greedy', uses a greedy heuristic for finding a feedback arc set for a graph.
    // A feedback arc set is a set of edges that can be removed to make a graph acyclic.
    ranker: "network-simplex", // Type of algorithm to assign a rank to each node in the input graph. Possible values: 'network-simplex', 'tight-tree' or 'longest-path'
    minLen: function (edge: any) {
      return 2;
    }, // number of ranks to keep between the source and target of the edge
    edgeWeight: function (edge: any) {
      return 1;
    }, // higher weight edges are generally made shorter and straighter than lower weight edges
    // general layout options
    fit: true, // whether to fit to viewport
    padding: 30, // fit padding
    spacingFactor: 1, // Applies a multiplicative factor (>0) to expand or compress the overall area that the nodes take up
    nodeDimensionsIncludeLabels: true, // whether labels should be included in determining the space used by a node
    animate: false, // whether to transition the node positions
    animateFilter: function (node: any, i: any) {
      return true;
    }, // whether to animate specific nodes when animation is on; non-animated nodes immediately go to their final positions
    animationDuration: 500, // duration of animation in ms if enabled
    animationEasing: undefined, // easing of animation if enabled
    boundingBox: undefined, // constrain layout bounds; { x1, y1, x2, y2 } or { x1, y1, w, h }
    transform: function (node: any, pos: any) {
      return pos;
    }, // a function that applies a transform to the final node position
    ready: function () {}, // on layoutready
    stop: function () {}, // on layoutstop
  },
  // Spread: https://github.com/cytoscape/cytoscape.js-spread
  spread: {
    name: "spread",
    animate: true, // Whether to show the layout as it's running
    ready: undefined, // Callback on layoutready
    stop: undefined, // Callback on layoutstop
    fit: true, // Reset viewport to fit default simulationBounds
    minDist: 20, // Minimum distance between nodes
    padding: 20, // Padding
    expandingFactor: -1.0, // If the network does not satisfy the minDist
    // criterium then it expands the network of this amount
    // If it is set to -1.0 the amount of expansion is automatically
    // calculated based on the minDist, the aspect ratio and the
    // number of nodes
    prelayout: {name: "cose"}, // Layout options for the first phase
    maxExpandIterations: 4, // Maximum number of expanding iterations
    boundingBox: undefined, // Constrain layout bounds; { x1, y1, x2, y2 } or { x1, y1, w, h }
    randomize: false, // Uses random initial node positions on true
  },
};

const useLayout = "fcose";
// const useLayout = 'cose-bilkent';
// const useLayout = "cola";
// const useLayout = 'elk';
// const useLayout = 'dagre';
// const useLayout = 'spread';

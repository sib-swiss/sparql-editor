// Currently we cannot just import the CSS file from the yasgui package, because it is not a module.
// NOTE: in the future we might be able to import CSS files directly https://web.dev/articles/css-module-scripts
// import yasguiCss from '@zazuko/yasgui/build/yasgui.min.css' assert { type: 'css' };

// So we can get the YASGUI and highlight.js CSS manually, and unminify them (https://unminify.com/)

// .yasr .dataTable {
//   font-size: 0.9em;
// }

// Search for SVG icons: https://lucide.dev/icons
const iconSize = 16;

export const saveIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-save-icon lucide-save">
<path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/>
<path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/></svg>`;

export const overviewIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-network-icon lucide-network">
<rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"/><path d="M12 12V8"/></svg>`;

export const reloadIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-rotate-cw-icon lucide-rotate-cw">
<path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>`;

export const sidebarIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-panel-right-close-icon lucide-panel-right-close">
<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M15 3v18"/><path d="m8 9 3 3-3 3"/></svg>`;

export const addPrefixesIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-list-plus-icon lucide-list-plus">
<path d="M11 12H3"/><path d="M16 6H3"/><path d="M16 18H3"/><path d="M18 9v6"/><path d="M21 12h-6"/></svg>`;

export const browseExamplesIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-folder-search-icon lucide-folder-search">
<path d="M10.7 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v4.1"/><path d="m21 21-1.9-1.9"/><circle cx="17" cy="17" r="3"/></svg>`;

export const closeIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x-icon lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`;

export const useIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="${iconSize - 2}" height="${iconSize - 2}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clipboard-copy-icon lucide-clipboard-copy">
<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/><path d="M16 4h2a2 2 0 0 1 2 2v4"/><path d="M21 14H11"/><path d="m15 10-4 4 4 4"/></svg>`;

// Bar arrow:
// export const useIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="${iconSize-2}" height="${iconSize-2}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-left-to-line-icon lucide-arrow-left-to-line"><path d="M3 19V5"/><path d="m13 6-6 6 6 6"/><path d="M7 12h14"/></svg>`

export const editorCss = `.sparql-editor-container {
  --btn-color: #e30613;
  --btn-bg-color: #ffe8e5;
  font-family: Arial, sans-serif;
  display: flex;
  flex-direction: row;

  a {
    text-decoration: none;
    color: #00709b;
  }
  a:hover {
    filter: brightness(60%);
  }
  dialog {
    border-color: #cccccc;
    background-color: #f5f5f5;
    border-radius: 10px;
  }
  .sparql-examples {
    padding-left: 1em;
  }
  input.sparql-search-examples-input {
    width: 300px;
    padding: 0.5em;
    border-radius: 5px;
  }
  .yasr_results {
    overflow-x: auto;
  }

  #status-link {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    border-radius: 50%;
    cursor: pointer;
    padding: 3px;
  }

  button {
    font-size: 0.9em;
    border: none;
    border-radius: 5px;
    padding: 0.3em 0.4em;
  }
  button.btn {
    background-color: var(--btn-bg-color);
    color: var(--btn-color);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    transition: background-color 0.3s ease, box-shadow 0.3s ease;
    display: inline-flex;
    align-items: center;
    gap: 0.5em;
  }
  button.top-btn {
    margin-bottom: 0.3em;
    margin-left: 0.3em;
  }
  button.btn:hover {
    filter: brightness(70%);
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.2); /* Larger shadow on hover */
  }
  button.btn:active {
    filter: brightness(80%);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); /* Reset shadow on click */
  }
  button.btn svg {
    vertical-align: middle;
  }
}


@media (max-width: 600px) {
  .sparql-editor-container {
    flex-direction: column;

    .sparql-examples {
      display: none;
    }
    input.sparql-search-examples-input {
      width: 100%;
    }
  }
}
@media (min-width: 600px) {
  .sparql-editor-container #sparql-examples-top-btn {
    display: none !important;
  }
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

button.yasqe_share {
  display: none !important;
}
.yasr .rowNumber {
  text-align: left;
}

.hljs-variable {
  color: #219;
}
.hljs-symbol {
  color: #f50;
}
.hljs-function {
  color: #708;
}
.hljs-keyword {
  color: #708;
}
.hljs-literal {
  color: #a11;
}
.hljs-builtin {
  color: #000;
}
.hljs-expanded-iri {
  color: #085;
}`;
// ^Similar color scheme as YASGUI

// This CSS was found by inspecting the page generated when setting up YASGUI using the class directly, not in the web component
// This is probably generated by YASGUI, but does not make it through the shadow DOM...
// This is needed for the resize handles in the YASGUI table
export const yasguiGripInlineCss = `.grip-resizable {
  table-layout:fixed;
}
.grip-resizable > tbody > tr > td,
.grip-resizable > tbody > tr > th {
  overflow:hidden
}
.grip-padding > tbody > tr > td,
.grip-padding > tbody > tr > th {
  padding-left:0!important;
  padding-right:0!important;
}
.grip-container {
  height:0px;
  position:relative;
}
.grip-handle {
  margin-left:-5px;
  position:absolute;
  z-index:5;
}
.grip-handle .grip-resizable {
  position:absolute;
  background-color:red;
  filter:alpha(opacity=1);
  opacity:0;
  width:10px;
  height:100%;
  cursor: col-resize;
  top:0px
}
.grip-lastgrip {
  position:absolute;
  width:1px;
}
.grip-drag {
  border-left:1px dotted black;
}
.grip-flex {
  width:auto!important;
}
.grip-handle.grip-disabledgrip .grip-resizable {
  cursor:default;
  display:none;
}
`;

// https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@latest/build/styles/default.min.css
export const highlightjsCss = `pre code.hljs {
    display: block;
    overflow-x: auto;
    padding: 1em;
}
code.hljs {
    padding: 3px 5px;
}
.hljs {
    background: #f3f3f3;
    color: #444;
}
.hljs-comment {
    color: #697070;
}
.hljs-punctuation,
.hljs-tag {
    color: #444a;
}
.hljs-tag .hljs-attr,
.hljs-tag .hljs-name {
    color: #444;
}
.hljs-attribute,
.hljs-doctag,
.hljs-keyword,
.hljs-meta .hljs-keyword,
.hljs-name,
.hljs-selector-tag {
    font-weight: 700;
}
.hljs-deletion,
.hljs-number,
.hljs-quote,
.hljs-selector-class,
.hljs-selector-id,
.hljs-string,
.hljs-template-tag,
.hljs-type {
    color: #800;
}
.hljs-section,
.hljs-title {
    color: #800;
    font-weight: 700;
}
.hljs-link,
.hljs-operator,
.hljs-regexp,
.hljs-selector-attr,
.hljs-selector-pseudo,
.hljs-symbol,
.hljs-template-variable,
.hljs-variable {
    color: #ab5656;
}
.hljs-literal {
    color: #695;
}
.hljs-addition,
.hljs-built_in,
.hljs-bullet,
.hljs-code {
    color: #397300;
}
.hljs-meta {
    color: #1f7199;
}
.hljs-meta .hljs-string {
    color: #38a;
}
.hljs-emphasis {
    font-style: italic;
}
.hljs-strong {
    font-weight: 700;
}
`;

// https://unpkg.com/@zazuko/yasgui@latest/build/yasgui.min.css
// NOTE: you'll need to fix \25BE and \25B8 to \\25BE and \\25B8 (▼ and ▲ in CodeMirror)
// Also replace all :root with .sparql-editor-container
export const yasguiCss = `.yasr .yasr_btn {
    background: inherit;
    border: none;
}
.yasr .svgImg {
    display: flex;
    flex-direction: row;
}
.yasr .svgImg svg {
    align-self: center;
    height: 15px;
    max-height: 100%;
    max-width: 100%;
    width: 15px;
}
.yasr .yasr_btn.yasr_external_ref_btn {
    font-weight: 600;
    -webkit-user-select: none;
    -moz-user-select: none;
    user-select: none;
}
.yasr .yasr_btn.yasr_external_ref_btn:active,
.yasr .yasr_btn.yasr_external_ref_btn:focus {
    color: inherit;
    text-decoration-color: inherit;
}
.yasr .yasr_btn.yasr_external_ref_btn .svgImg svg {
    height: 18px;
    width: 18px;
}
.yasr a {
    color: #428bca;
    text-decoration: none;
}
.yasr a:active,
.yasr a:hover {
    color: #2a6496;
    outline: 0;
    text-decoration: underline;
}
.yasr .yasr_btnGroup {
    display: flex;
    list-style: none;
    margin: 0;
    overflow-x: auto;
    overflow-y: hidden;
    padding: 0;
}
.yasr .yasr_btnGroup .plugin_icon {
    height: 15px;
    margin-right: 5px;
    text-align: center;
    width: 15px;
}
.yasr .yasr_btnGroup .yasr_btn {
    border-bottom: 2px solid transparent;
    margin-left: 6px;
    margin-right: 6px;
    padding-left: 6px;
    padding-right: 6px;
}
.yasr .yasr_btnGroup .yasr_btn.selected {
    border-bottom: 2px solid #337ab7;
}
@media (max-width: 768px) {
    .yasr .yasr_btn span {
        display: none;
    }
    .yasr .yasr_btn .plugin_icon {
        margin-right: 0;
    }
}
.yasr .yasr_header {
    display: flex;
    flex-wrap: wrap;
}
.yasr .yasr_fallback_info:not(:empty) {
    background: #f7f7f7;
    border: 1px solid #d1d1d1;
    margin-top: 5px;
    padding: 0.5rem;
}
.yasr .yasr_fallback_info:not(:empty) p {
    margin: 0;
}
.yasr .yasr_help_variable {
    background: #dff0ff;
    color: #428bca;
}
.yasr .yasr_response_chip {
    align-items: center;
    align-self: center;
    background: #f5f5f5;
    border-radius: 6px;
    box-sizing: border-box;
    color: #505050;
    display: flex;
    font-size: 11pt;
    justify-content: center;
    margin-left: 5px;
    max-height: 16pt;
    overflow: visible;
    padding: 6px;
    white-space: nowrap;
}
.yasr .yasr_response_chip.empty {
    display: none;
}
.yasr .yasr_plugin_control {
    align-items: center;
    display: flex;
    margin-left: auto;
}
.yasr .yasr_plugin_control:empty {
    display: none;
}
.yasr .yasr_btn {
    color: #505050;
    fill: #505050;
    align-items: center;
    box-sizing: border-box;
    cursor: pointer;
    display: flex;
    justify-content: center;
    overflow: visible;
    padding: 6px 12px;
    white-space: nowrap;
}
.yasr .yasr_btn.btn_icon {
    padding: 4px 8px;
}
.yasr .yasr_btn.disabled,
.yasr .yasr_btn[disabled] {
    box-shadow: none;
    cursor: default;
    opacity: 0.5;
}
.yasr .yasr_btn:not(.disabled):hover {
    fill: #000;
    color: #000;
}
.yasr .yasr_btn.selected,
.yasr .yasr_btn:focus {
    color: #337ab7;
    fill: #337ab7;
}
.yasr .space_element {
    flex-grow: 1;
    min-width: 10px;
}
.yasr .tableControls {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    padding: 0 5px 0 0;
}
.yasr .tableControls .tableFilter {
    height: 100%;
    margin-right: 10px;
}
.yasr .tableControls .tableSizer {
    height: 100%;
}
.yasr .tableControls .switch {
    align-items: center;
    display: flex;
    margin-right: 10px;
}
.yasr .dataTable.ellipseTable {
    white-space: nowrap;
}
.yasr .dataTable.ellipseTable div:not(.expanded) {
    overflow: hidden;
    text-overflow: ellipsis;
}
.yasr .dataTable:not(.ellipseTable) div:not(.expanded),
.yasr .expanded {
    word-break: break-all;
}
.yasr .expanded {
    white-space: normal;
}
.yasr .expandable:not(.expanded) {
    cursor: pointer;
}
.yasr .expandable:not(.expanded) a {
    pointer-events: none;
}
.yasr .dataTables_wrapper {
    font-size: 0.9em;
    min-width: 100%;
}
.yasr .dataTables_wrapper .grip-container {
    max-width: 100%;
}
.yasr .dataTables_wrapper .grip-padding > tbody > tr > td,
.yasr .dataTables_wrapper .grip-padding > tbody > tr > th {
    padding-left: 7px !important;
    padding-right: 5px !important;
}
.yasr .dataTables_wrapper .dataTable {
    box-sizing: border-box;
    min-width: 100%;
}
.yasr .dataTables_wrapper .dataTable.no-footer {
    border-bottom: none;
}
.yasr .dataTables_wrapper .dataTable tbody tr:hover {
    background-color: #f9f9f9;
}
.yasr .dataTables_wrapper .dataTable thead tr th {
    border: none;
    font-weight: 700;
    min-width: 28px;
    overflow: hidden;
    padding: 5px 5px 5px 7px;
    text-align: start;
    text-overflow: ellipsis;
    -webkit-user-select: none;
    -moz-user-select: none;
    user-select: none;
}
.yasr .dataTables_wrapper .dataTable thead tr th.sorting {
    min-width: 10px;
    padding-right: 18px;
}
.yasr .dataTables_wrapper .dataTable thead tr th:hover {
    background-color: #f9f9f9;
}
.yasr .dataTables_wrapper .dataTable td {
    padding: 5px;
}
.yasr .dataTables_wrapper .dataTable td > div {
    -webkit-hyphens: auto;
    hyphens: auto;
}
.yasr .dataTables_wrapper .dataTable td > div.rowNumber {
    overflow: visible;
    word-break: keep-all;
}
.yasr .dataTables_wrapper .dataTable td .tableEllipse {
    background-color: #428bca33;
    border-radius: 2px;
    cursor: pointer;
    font-weight: 700;
    margin: 0 3px;
    padding: 0 2px;
}
.yasr .dataTables_wrapper div.dataTables_paginate.paging_simple_numbers a.paginate_button {
    background: transparent;
    border: none;
}
.yasr .dataTables_wrapper div.dataTables_paginate.paging_simple_numbers a.paginate_button .disabled {
    color: #505050;
}
.yasr .dataTables_wrapper div.dataTables_paginate.paging_simple_numbers a.paginate_button.current {
    background: transparent;
    border: none;
    text-decoration: underline !important;
}
.yasr .dataTables_wrapper div.dataTables_paginate.paging_simple_numbers a.paginate_button:hover {
    background: transparent;
    border: none;
}
.yasr .dataTables_wrapper div.dataTables_paginate.paging_simple_numbers a.paginate_button:hover:not(.disabled) {
    color: #000 !important;
}
.yasr .dataTables_wrapper div.dataTables_paginate.paging_simple_numbers a.paginate_button:active {
    box-shadow: none;
}
.sparql-editor-container {
    --dt-row-selected: 13, 110, 253;
    --dt-row-selected-text: 255, 255, 255;
    --dt-row-selected-link: 9, 10, 11;
    --dt-row-stripe: 0, 0, 0;
    --dt-row-hover: 0, 0, 0;
    --dt-column-ordering: 0, 0, 0;
    --dt-html-background: #fff;
}
.sparql-editor-container.dark {
    --dt-html-background: #212529;
}
table.dataTable td.dt-control {
    cursor: pointer;
    text-align: center;
}
table.dataTable td.dt-control:before {
    border-color: transparent transparent transparent rgba(0, 0, 0, 0.5);
    border-style: solid;
    border-width: 5px 0 5px 10px;
    box-sizing: border-box;
    content: "";
    display: inline-block;
}
table.dataTable tr.dt-hasChild td.dt-control:before {
    border-color: rgba(0, 0, 0, 0.5) transparent transparent;
    border-style: solid;
    border-width: 10px 5px 0;
}
.sparql-editor-container[data-bs-theme="dark"] table.dataTable td.dt-control:before,
html.dark table.dataTable td.dt-control:before {
    border-left-color: hsla(0, 0%, 100%, 0.5);
}
.sparql-editor-container[data-bs-theme="dark"] table.dataTable tr.dt-hasChild td.dt-control:before,
html.dark table.dataTable tr.dt-hasChild td.dt-control:before {
    border-left-color: transparent;
    border-top-color: hsla(0, 0%, 100%, 0.5);
}
div.dt-scroll-body tfoot tr,
div.dt-scroll-body thead tr {
    height: 0;
}
div.dt-scroll-body tfoot tr td,
div.dt-scroll-body tfoot tr th,
div.dt-scroll-body thead tr td,
div.dt-scroll-body thead tr th {
    border-bottom-width: 0 !important;
    border-top-width: 0 !important;
    height: 0 !important;
    padding-bottom: 0 !important;
    padding-top: 0 !important;
}
div.dt-scroll-body tfoot tr td div.dt-scroll-sizing,
div.dt-scroll-body tfoot tr th div.dt-scroll-sizing,
div.dt-scroll-body thead tr td div.dt-scroll-sizing,
div.dt-scroll-body thead tr th div.dt-scroll-sizing {
    height: 0 !important;
    overflow: hidden !important;
}
table.dataTable thead > tr > td.dt-orderable-asc span.dt-column-order:before,
table.dataTable thead > tr > td.dt-ordering-asc span.dt-column-order:before,
table.dataTable thead > tr > th.dt-orderable-asc span.dt-column-order:before,
table.dataTable thead > tr > th.dt-ordering-asc span.dt-column-order:before {
    bottom: 50%;
    content: "▲";
    content: "▲"/"";
    display: block;
    position: absolute;
}
table.dataTable thead > tr > td.dt-orderable-desc span.dt-column-order:after,
table.dataTable thead > tr > td.dt-ordering-desc span.dt-column-order:after,
table.dataTable thead > tr > th.dt-orderable-desc span.dt-column-order:after,
table.dataTable thead > tr > th.dt-ordering-desc span.dt-column-order:after {
    content: "▼";
    content: "▼"/"";
    display: block;
    position: absolute;
    top: 50%;
}
table.dataTable thead > tr > td.dt-orderable-asc,
table.dataTable thead > tr > td.dt-orderable-desc,
table.dataTable thead > tr > td.dt-ordering-asc,
table.dataTable thead > tr > td.dt-ordering-desc,
table.dataTable thead > tr > th.dt-orderable-asc,
table.dataTable thead > tr > th.dt-orderable-desc,
table.dataTable thead > tr > th.dt-ordering-asc,
table.dataTable thead > tr > th.dt-ordering-desc {
    padding-right: 30px;
    position: relative;
}
table.dataTable thead > tr > td.dt-orderable-asc span.dt-column-order,
table.dataTable thead > tr > td.dt-orderable-desc span.dt-column-order,
table.dataTable thead > tr > td.dt-ordering-asc span.dt-column-order,
table.dataTable thead > tr > td.dt-ordering-desc span.dt-column-order,
table.dataTable thead > tr > th.dt-orderable-asc span.dt-column-order,
table.dataTable thead > tr > th.dt-orderable-desc span.dt-column-order,
table.dataTable thead > tr > th.dt-ordering-asc span.dt-column-order,
table.dataTable thead > tr > th.dt-ordering-desc span.dt-column-order {
    bottom: 0;
    position: absolute;
    right: 12px;
    top: 0;
    width: 12px;
}
table.dataTable thead > tr > td.dt-orderable-asc span.dt-column-order:after,
table.dataTable thead > tr > td.dt-orderable-asc span.dt-column-order:before,
table.dataTable thead > tr > td.dt-orderable-desc span.dt-column-order:after,
table.dataTable thead > tr > td.dt-orderable-desc span.dt-column-order:before,
table.dataTable thead > tr > td.dt-ordering-asc span.dt-column-order:after,
table.dataTable thead > tr > td.dt-ordering-asc span.dt-column-order:before,
table.dataTable thead > tr > td.dt-ordering-desc span.dt-column-order:after,
table.dataTable thead > tr > td.dt-ordering-desc span.dt-column-order:before,
table.dataTable thead > tr > th.dt-orderable-asc span.dt-column-order:after,
table.dataTable thead > tr > th.dt-orderable-asc span.dt-column-order:before,
table.dataTable thead > tr > th.dt-orderable-desc span.dt-column-order:after,
table.dataTable thead > tr > th.dt-orderable-desc span.dt-column-order:before,
table.dataTable thead > tr > th.dt-ordering-asc span.dt-column-order:after,
table.dataTable thead > tr > th.dt-ordering-asc span.dt-column-order:before,
table.dataTable thead > tr > th.dt-ordering-desc span.dt-column-order:after,
table.dataTable thead > tr > th.dt-ordering-desc span.dt-column-order:before {
    font-size: 0.8em;
    left: 0;
    line-height: 9px;
    opacity: 0.125;
}
table.dataTable thead > tr > td.dt-orderable-asc,
table.dataTable thead > tr > td.dt-orderable-desc,
table.dataTable thead > tr > th.dt-orderable-asc,
table.dataTable thead > tr > th.dt-orderable-desc {
    cursor: pointer;
}
table.dataTable thead > tr > td.dt-orderable-asc:hover,
table.dataTable thead > tr > td.dt-orderable-desc:hover,
table.dataTable thead > tr > th.dt-orderable-asc:hover,
table.dataTable thead > tr > th.dt-orderable-desc:hover {
    outline: 2px solid rgba(0, 0, 0, 0.05);
    outline-offset: -2px;
}
table.dataTable thead > tr > td.dt-ordering-asc span.dt-column-order:before,
table.dataTable thead > tr > td.dt-ordering-desc span.dt-column-order:after,
table.dataTable thead > tr > th.dt-ordering-asc span.dt-column-order:before,
table.dataTable thead > tr > th.dt-ordering-desc span.dt-column-order:after {
    opacity: 0.6;
}
table.dataTable thead > tr > td.sorting_asc_disabled span.dt-column-order:before,
table.dataTable thead > tr > td.sorting_desc_disabled span.dt-column-order:after,
table.dataTable thead > tr > th.sorting_asc_disabled span.dt-column-order:before,
table.dataTable thead > tr > th.sorting_desc_disabled span.dt-column-order:after {
    display: none;
}
table.dataTable thead > tr > td:active,
table.dataTable thead > tr > th:active {
    outline: none;
}
div.dt-scroll-body > table.dataTable > thead > tr > td,
div.dt-scroll-body > table.dataTable > thead > tr > th {
    overflow: hidden;
}
.sparql-editor-container.dark table.dataTable thead > tr > td.dt-orderable-asc:hover,
.sparql-editor-container.dark table.dataTable thead > tr > td.dt-orderable-desc:hover,
.sparql-editor-container.dark table.dataTable thead > tr > th.dt-orderable-asc:hover,
.sparql-editor-container.dark table.dataTable thead > tr > th.dt-orderable-desc:hover,
.sparql-editor-container[data-bs-theme="dark"] table.dataTable thead > tr > td.dt-orderable-asc:hover,
.sparql-editor-container[data-bs-theme="dark"] table.dataTable thead > tr > td.dt-orderable-desc:hover,
.sparql-editor-container[data-bs-theme="dark"] table.dataTable thead > tr > th.dt-orderable-asc:hover,
.sparql-editor-container[data-bs-theme="dark"] table.dataTable thead > tr > th.dt-orderable-desc:hover {
    outline: 2px solid hsla(0, 0%, 100%, 0.05);
}
div.dt-processing {
    left: 50%;
    margin-left: -100px;
    margin-top: -22px;
    padding: 2px;
    position: absolute;
    text-align: center;
    top: 50%;
    width: 200px;
    z-index: 10;
}
div.dt-processing > div:last-child {
    height: 15px;
    margin: 1em auto;
    position: relative;
    width: 80px;
}
div.dt-processing > div:last-child > div {
    animation-timing-function: cubic-bezier(0, 1, 1, 0);
    background: #0d6efd;
    background: rgb(var(--dt-row-selected));
    border-radius: 50%;
    height: 13px;
    position: absolute;
    top: 0;
    width: 13px;
}
div.dt-processing > div:last-child > div:first-child {
    animation: datatables-loader-1 0.6s infinite;
    left: 8px;
}
div.dt-processing > div:last-child > div:nth-child(2) {
    animation: datatables-loader-2 0.6s infinite;
    left: 8px;
}
div.dt-processing > div:last-child > div:nth-child(3) {
    animation: datatables-loader-2 0.6s infinite;
    left: 32px;
}
div.dt-processing > div:last-child > div:nth-child(4) {
    animation: datatables-loader-3 0.6s infinite;
    left: 56px;
}
@keyframes datatables-loader-1 {
    0% {
        transform: scale(0);
    }
    to {
        transform: scale(1);
    }
}
@keyframes datatables-loader-3 {
    0% {
        transform: scale(1);
    }
    to {
        transform: scale(0);
    }
}
@keyframes datatables-loader-2 {
    0% {
        transform: translate(0);
    }
    to {
        transform: translate(24px);
    }
}
table.dataTable.nowrap td,
table.dataTable.nowrap th {
    white-space: nowrap;
}
table.dataTable td,
table.dataTable th {
    box-sizing: border-box;
}
table.dataTable td.dt-left,
table.dataTable th.dt-left {
    text-align: left;
}
table.dataTable td.dt-center,
table.dataTable th.dt-center {
    text-align: center;
}
table.dataTable td.dt-right,
table.dataTable th.dt-right {
    text-align: right;
}
table.dataTable td.dt-justify,
table.dataTable th.dt-justify {
    text-align: justify;
}
table.dataTable td.dt-nowrap,
table.dataTable th.dt-nowrap {
    white-space: nowrap;
}
table.dataTable td.dt-empty,
table.dataTable th.dt-empty {
    text-align: center;
    vertical-align: top;
}
table.dataTable td.dt-type-date,
table.dataTable td.dt-type-numeric,
table.dataTable th.dt-type-date,
table.dataTable th.dt-type-numeric {
    text-align: right;
}
table.dataTable tfoot td,
table.dataTable tfoot td.dt-head-left,
table.dataTable tfoot th,
table.dataTable tfoot th.dt-head-left,
table.dataTable thead td,
table.dataTable thead td.dt-head-left,
table.dataTable thead th,
table.dataTable thead th.dt-head-left {
    text-align: left;
}
table.dataTable tfoot td.dt-head-center,
table.dataTable tfoot th.dt-head-center,
table.dataTable thead td.dt-head-center,
table.dataTable thead th.dt-head-center {
    text-align: center;
}
table.dataTable tfoot td.dt-head-right,
table.dataTable tfoot th.dt-head-right,
table.dataTable thead td.dt-head-right,
table.dataTable thead th.dt-head-right {
    text-align: right;
}
table.dataTable tfoot td.dt-head-justify,
table.dataTable tfoot th.dt-head-justify,
table.dataTable thead td.dt-head-justify,
table.dataTable thead th.dt-head-justify {
    text-align: justify;
}
table.dataTable tfoot td.dt-head-nowrap,
table.dataTable tfoot th.dt-head-nowrap,
table.dataTable thead td.dt-head-nowrap,
table.dataTable thead th.dt-head-nowrap {
    white-space: nowrap;
}
table.dataTable tbody td.dt-body-left,
table.dataTable tbody th.dt-body-left {
    text-align: left;
}
table.dataTable tbody td.dt-body-center,
table.dataTable tbody th.dt-body-center {
    text-align: center;
}
table.dataTable tbody td.dt-body-right,
table.dataTable tbody th.dt-body-right {
    text-align: right;
}
table.dataTable tbody td.dt-body-justify,
table.dataTable tbody th.dt-body-justify {
    text-align: justify;
}
table.dataTable tbody td.dt-body-nowrap,
table.dataTable tbody th.dt-body-nowrap {
    white-space: nowrap;
}
table.dataTable {
    border-spacing: 0;
    margin: 0 auto;
    width: 100%;
}
table.dataTable tfoot th,
table.dataTable thead th {
    font-weight: 700;
}
table.dataTable > thead > tr > td,
table.dataTable > thead > tr > th {
    border-bottom: 1px solid rgba(0, 0, 0, 0.3);
    padding: 10px;
}
table.dataTable > thead > tr > td:active,
table.dataTable > thead > tr > th:active {
    outline: none;
}
table.dataTable > tfoot > tr > td,
table.dataTable > tfoot > tr > th {
    border-top: 1px solid rgba(0, 0, 0, 0.3);
    padding: 10px 10px 6px;
}
table.dataTable > tbody > tr {
    background-color: transparent;
}
table.dataTable > tbody > tr:first-child > * {
    border-top: none;
}
table.dataTable > tbody > tr:last-child > * {
    border-bottom: none;
}
table.dataTable > tbody > tr.selected > * {
    box-shadow: inset 0 0 0 9999px rgba(13, 110, 253, 0.9);
    box-shadow: inset 0 0 0 9999px rgba(var(--dt-row-selected), 0.9);
    color: #fff;
    color: rgb(var(--dt-row-selected-text));
}
table.dataTable > tbody > tr.selected a {
    color: #090a0b;
    color: rgb(var(--dt-row-selected-link));
}
table.dataTable > tbody > tr > td,
table.dataTable > tbody > tr > th {
    padding: 8px 10px;
}
table.dataTable.display > tbody > tr > *,
table.dataTable.row-border > tbody > tr > * {
    border-top: 1px solid rgba(0, 0, 0, 0.15);
}
table.dataTable.display > tbody > tr:first-child > *,
table.dataTable.row-border > tbody > tr:first-child > * {
    border-top: none;
}
table.dataTable.display > tbody > tr.selected + tr.selected > td,
table.dataTable.row-border > tbody > tr.selected + tr.selected > td {
    border-top-color: rgba(13, 110, 253, 0.65);
    border-top-color: rgba(var(--dt-row-selected), 0.65);
}
table.dataTable.cell-border > tbody > tr > * {
    border-right: 1px solid rgba(0, 0, 0, 0.15);
    border-top: 1px solid rgba(0, 0, 0, 0.15);
}
table.dataTable.cell-border > tbody > tr > :first-child {
    border-left: 1px solid rgba(0, 0, 0, 0.15);
}
table.dataTable.cell-border > tbody > tr:first-child > * {
    border-top: 1px solid rgba(0, 0, 0, 0.3);
}
table.dataTable.display > tbody > tr:nth-child(odd) > *,
table.dataTable.stripe > tbody > tr:nth-child(odd) > * {
    box-shadow: inset 0 0 0 9999px rgba(0, 0, 0, 0.023);
    box-shadow: inset 0 0 0 9999px rgba(var(--dt-row-stripe), 0.023);
}
table.dataTable.display > tbody > tr:nth-child(odd).selected > *,
table.dataTable.stripe > tbody > tr:nth-child(odd).selected > * {
    box-shadow: inset 0 0 0 9999px rgba(13, 110, 253, 0.923);
    box-shadow: inset 0 0 0 9999px rgba(var(--dt-row-selected), 0.923);
}
table.dataTable.display > tbody > tr:hover > *,
table.dataTable.hover > tbody > tr:hover > * {
    box-shadow: inset 0 0 0 9999px rgba(0, 0, 0, 0.035);
    box-shadow: inset 0 0 0 9999px rgba(var(--dt-row-hover), 0.035);
}
table.dataTable.display > tbody > tr.selected:hover > *,
table.dataTable.hover > tbody > tr.selected:hover > * {
    box-shadow: inset 0 0 0 9999px #0d6efd !important;
    box-shadow: inset 0 0 0 9999px rgba(var(--dt-row-selected), 1) !important;
}
table.dataTable.display > tbody tr > .sorting_1,
table.dataTable.display > tbody tr > .sorting_2,
table.dataTable.display > tbody tr > .sorting_3,
table.dataTable.order-column > tbody tr > .sorting_1,
table.dataTable.order-column > tbody tr > .sorting_2,
table.dataTable.order-column > tbody tr > .sorting_3 {
    box-shadow: inset 0 0 0 9999px rgba(0, 0, 0, 0.019);
    box-shadow: inset 0 0 0 9999px rgba(var(--dt-column-ordering), 0.019);
}
table.dataTable.display > tbody tr.selected > .sorting_1,
table.dataTable.display > tbody tr.selected > .sorting_2,
table.dataTable.display > tbody tr.selected > .sorting_3,
table.dataTable.order-column > tbody tr.selected > .sorting_1,
table.dataTable.order-column > tbody tr.selected > .sorting_2,
table.dataTable.order-column > tbody tr.selected > .sorting_3 {
    box-shadow: inset 0 0 0 9999px rgba(13, 110, 253, 0.919);
    box-shadow: inset 0 0 0 9999px rgba(var(--dt-row-selected), 0.919);
}
table.dataTable.display > tbody > tr:nth-child(odd) > .sorting_1,
table.dataTable.order-column.stripe > tbody > tr:nth-child(odd) > .sorting_1 {
    box-shadow: inset 0 0 0 9999px rgba(0, 0, 0, 0.054);
    box-shadow: inset 0 0 0 9999px rgba(var(--dt-column-ordering), 0.054);
}
table.dataTable.display > tbody > tr:nth-child(odd) > .sorting_2,
table.dataTable.order-column.stripe > tbody > tr:nth-child(odd) > .sorting_2 {
    box-shadow: inset 0 0 0 9999px rgba(0, 0, 0, 0.047);
    box-shadow: inset 0 0 0 9999px rgba(var(--dt-column-ordering), 0.047);
}
table.dataTable.display > tbody > tr:nth-child(odd) > .sorting_3,
table.dataTable.order-column.stripe > tbody > tr:nth-child(odd) > .sorting_3 {
    box-shadow: inset 0 0 0 9999px rgba(0, 0, 0, 0.039);
    box-shadow: inset 0 0 0 9999px rgba(var(--dt-column-ordering), 0.039);
}
table.dataTable.display > tbody > tr:nth-child(odd).selected > .sorting_1,
table.dataTable.order-column.stripe > tbody > tr:nth-child(odd).selected > .sorting_1 {
    box-shadow: inset 0 0 0 9999px rgba(13, 110, 253, 0.954);
    box-shadow: inset 0 0 0 9999px rgba(var(--dt-row-selected), 0.954);
}
table.dataTable.display > tbody > tr:nth-child(odd).selected > .sorting_2,
table.dataTable.order-column.stripe > tbody > tr:nth-child(odd).selected > .sorting_2 {
    box-shadow: inset 0 0 0 9999px rgba(13, 110, 253, 0.947);
    box-shadow: inset 0 0 0 9999px rgba(var(--dt-row-selected), 0.947);
}
table.dataTable.display > tbody > tr:nth-child(odd).selected > .sorting_3,
table.dataTable.order-column.stripe > tbody > tr:nth-child(odd).selected > .sorting_3 {
    box-shadow: inset 0 0 0 9999px rgba(13, 110, 253, 0.939);
    box-shadow: inset 0 0 0 9999px rgba(var(--dt-row-selected), 0.939);
}
table.dataTable.display > tbody > tr.even > .sorting_1,
table.dataTable.order-column.stripe > tbody > tr.even > .sorting_1 {
    box-shadow: inset 0 0 0 9999px rgba(0, 0, 0, 0.019);
    box-shadow: inset 0 0 0 9999px rgba(var(--dt-column-ordering), 0.019);
}
table.dataTable.display > tbody > tr.even > .sorting_2,
table.dataTable.order-column.stripe > tbody > tr.even > .sorting_2 {
    box-shadow: inset 0 0 0 9999px rgba(0, 0, 0, 0.011);
    box-shadow: inset 0 0 0 9999px rgba(var(--dt-column-ordering), 0.011);
}
table.dataTable.display > tbody > tr.even > .sorting_3,
table.dataTable.order-column.stripe > tbody > tr.even > .sorting_3 {
    box-shadow: inset 0 0 0 9999px rgba(0, 0, 0, 0.003);
    box-shadow: inset 0 0 0 9999px rgba(var(--dt-column-ordering), 0.003);
}
table.dataTable.display > tbody > tr.even.selected > .sorting_1,
table.dataTable.order-column.stripe > tbody > tr.even.selected > .sorting_1 {
    box-shadow: inset 0 0 0 9999px rgba(13, 110, 253, 0.919);
    box-shadow: inset 0 0 0 9999px rgba(var(--dt-row-selected), 0.919);
}
table.dataTable.display > tbody > tr.even.selected > .sorting_2,
table.dataTable.order-column.stripe > tbody > tr.even.selected > .sorting_2 {
    box-shadow: inset 0 0 0 9999px rgba(13, 110, 253, 0.911);
    box-shadow: inset 0 0 0 9999px rgba(var(--dt-row-selected), 0.911);
}
table.dataTable.display > tbody > tr.even.selected > .sorting_3,
table.dataTable.order-column.stripe > tbody > tr.even.selected > .sorting_3 {
    box-shadow: inset 0 0 0 9999px rgba(13, 110, 253, 0.903);
    box-shadow: inset 0 0 0 9999px rgba(var(--dt-row-selected), 0.903);
}
table.dataTable.display tbody tr:hover > .sorting_1,
table.dataTable.order-column.hover tbody tr:hover > .sorting_1 {
    box-shadow: inset 0 0 0 9999px rgba(0, 0, 0, 0.082);
    box-shadow: inset 0 0 0 9999px rgba(var(--dt-row-hover), 0.082);
}
table.dataTable.display tbody tr:hover > .sorting_2,
table.dataTable.order-column.hover tbody tr:hover > .sorting_2 {
    box-shadow: inset 0 0 0 9999px rgba(0, 0, 0, 0.074);
    box-shadow: inset 0 0 0 9999px rgba(var(--dt-row-hover), 0.074);
}
table.dataTable.display tbody tr:hover > .sorting_3,
table.dataTable.order-column.hover tbody tr:hover > .sorting_3 {
    box-shadow: inset 0 0 0 9999px rgba(0, 0, 0, 0.062);
    box-shadow: inset 0 0 0 9999px rgba(var(--dt-row-hover), 0.062);
}
table.dataTable.display tbody tr:hover.selected > .sorting_1,
table.dataTable.order-column.hover tbody tr:hover.selected > .sorting_1 {
    box-shadow: inset 0 0 0 9999px rgba(13, 110, 253, 0.982);
    box-shadow: inset 0 0 0 9999px rgba(var(--dt-row-selected), 0.982);
}
table.dataTable.display tbody tr:hover.selected > .sorting_2,
table.dataTable.order-column.hover tbody tr:hover.selected > .sorting_2 {
    box-shadow: inset 0 0 0 9999px rgba(13, 110, 253, 0.974);
    box-shadow: inset 0 0 0 9999px rgba(var(--dt-row-selected), 0.974);
}
table.dataTable.display tbody tr:hover.selected > .sorting_3,
table.dataTable.order-column.hover tbody tr:hover.selected > .sorting_3 {
    box-shadow: inset 0 0 0 9999px rgba(13, 110, 253, 0.962);
    box-shadow: inset 0 0 0 9999px rgba(var(--dt-row-selected), 0.962);
}
table.dataTable.compact tbody td,
table.dataTable.compact tbody th,
table.dataTable.compact tfoot td,
table.dataTable.compact tfoot th,
table.dataTable.compact thead td,
table.dataTable.compact thead th {
    padding: 4px;
}
div.dt-container {
    clear: both;
    position: relative;
}
div.dt-container div.dt-layout-row {
    clear: both;
    display: table;
    width: 100%;
}
div.dt-container div.dt-layout-row.dt-layout-table,
div.dt-container div.dt-layout-row.dt-layout-table div.dt-layout-cell {
    display: block;
}
div.dt-container div.dt-layout-cell {
    display: table-cell;
    padding: 5px 0;
    vertical-align: middle;
}
div.dt-container div.dt-layout-cell.dt-full {
    text-align: center;
}
div.dt-container div.dt-layout-cell.dt-start {
    text-align: left;
}
div.dt-container div.dt-layout-cell.dt-end {
    text-align: right;
}
div.dt-container div.dt-layout-cell:empty {
    display: none;
}
div.dt-container .dt-search input {
    margin-left: 3px;
}
div.dt-container .dt-input,
div.dt-container .dt-search input {
    background-color: transparent;
    border: 1px solid #aaa;
    border-radius: 3px;
    color: inherit;
    padding: 5px;
}
div.dt-container select.dt-input {
    padding: 4px;
}
div.dt-container .dt-paging .dt-paging-button {
    background: transparent;
    border: 1px solid transparent;
    border-radius: 2px;
    box-sizing: border-box;
    color: inherit !important;
    cursor: pointer;
    display: inline-block;
    margin-left: 2px;
    min-width: 1.5em;
    padding: 0.5em 1em;
    text-align: center;
    text-decoration: none !important;
}
div.dt-container .dt-paging .dt-paging-button.current,
div.dt-container .dt-paging .dt-paging-button.current:hover {
    background-color: rgba(0, 0, 0, 0.05);
    background: -webkit-gradient(linear, left top, left bottom, color-stop(0, hsla(0, 0%, 90%, 0.05)), color-stop(100%, rgba(0, 0, 0, 0.05)));
    background: -webkit-linear-gradient(top, hsla(0, 0%, 90%, 0.05), rgba(0, 0, 0, 0.05));
    background: -moz-linear-gradient(top, hsla(0, 0%, 90%, 0.05) 0, rgba(0, 0, 0, 0.05) 100%);
    background: -ms-linear-gradient(top, hsla(0, 0%, 90%, 0.05) 0, rgba(0, 0, 0, 0.05) 100%);
    background: -o-linear-gradient(top, hsla(0, 0%, 90%, 0.05) 0, rgba(0, 0, 0, 0.05) 100%);
    background: linear-gradient(180deg, hsla(0, 0%, 90%, 0.05) 0, rgba(0, 0, 0, 0.05));
    border: 1px solid rgba(0, 0, 0, 0.3);
    color: inherit !important;
}
div.dt-container .dt-paging .dt-paging-button.disabled,
div.dt-container .dt-paging .dt-paging-button.disabled:active,
div.dt-container .dt-paging .dt-paging-button.disabled:hover {
    background: transparent;
    border: 1px solid transparent;
    box-shadow: none;
    color: rgba(0, 0, 0, 0.5) !important;
    cursor: default;
}
div.dt-container .dt-paging .dt-paging-button:hover {
    background-color: #111;
    background: -webkit-gradient(linear, left top, left bottom, color-stop(0, #585858), color-stop(100%, #111));
    background: -webkit-linear-gradient(top, #585858, #111);
    background: -moz-linear-gradient(top, #585858 0, #111 100%);
    background: -ms-linear-gradient(top, #585858 0, #111 100%);
    background: -o-linear-gradient(top, #585858 0, #111 100%);
    background: linear-gradient(180deg, #585858 0, #111);
    border: 1px solid #111;
    color: #fff !important;
}
div.dt-container .dt-paging .dt-paging-button:active {
    background-color: #0c0c0c;
    background: -webkit-gradient(linear, left top, left bottom, color-stop(0, #2b2b2b), color-stop(100%, #0c0c0c));
    background: -webkit-linear-gradient(top, #2b2b2b, #0c0c0c);
    background: -moz-linear-gradient(top, #2b2b2b 0, #0c0c0c 100%);
    background: -ms-linear-gradient(top, #2b2b2b 0, #0c0c0c 100%);
    background: -o-linear-gradient(top, #2b2b2b 0, #0c0c0c 100%);
    background: linear-gradient(180deg, #2b2b2b 0, #0c0c0c);
    box-shadow: inset 0 0 3px #111;
    outline: none;
}
div.dt-container .dt-paging .ellipsis {
    padding: 0 1em;
}
div.dt-container .dt-info,
div.dt-container .dt-length,
div.dt-container .dt-paging,
div.dt-container .dt-processing,
div.dt-container .dt-search {
    color: inherit;
}
div.dt-container .dataTables_scroll {
    clear: both;
}
div.dt-container .dataTables_scroll div.dt-scroll-body {
    -webkit-overflow-scrolling: touch;
}
div.dt-container .dataTables_scroll div.dt-scroll-body > table > tbody > tr > td,
div.dt-container .dataTables_scroll div.dt-scroll-body > table > tbody > tr > th,
div.dt-container .dataTables_scroll div.dt-scroll-body > table > thead > tr > td,
div.dt-container .dataTables_scroll div.dt-scroll-body > table > thead > tr > th {
    vertical-align: middle;
}
div.dt-container .dataTables_scroll div.dt-scroll-body > table > tbody > tr > td > div.dataTables_sizing,
div.dt-container .dataTables_scroll div.dt-scroll-body > table > tbody > tr > th > div.dataTables_sizing,
div.dt-container .dataTables_scroll div.dt-scroll-body > table > thead > tr > td > div.dataTables_sizing,
div.dt-container .dataTables_scroll div.dt-scroll-body > table > thead > tr > th > div.dataTables_sizing {
    height: 0;
    margin: 0 !important;
    overflow: hidden;
    padding: 0 !important;
}
div.dt-container.dt-empty-footer .dt-scroll-body,
div.dt-container.dt-empty-footer tbody > tr:last-child > * {
    border-bottom: 1px solid rgba(0, 0, 0, 0.3);
}
div.dt-container.dt-empty-footer .dt-scroll-body tbody > tr:last-child > * {
    border-bottom: none;
}
@media screen and (max-width: 767px) {
    div.dt-container div.dt-layout-cell,
    div.dt-container div.dt-layout-row {
        display: block;
    }
    div.dt-container div.dt-layout-cell.dt-end,
    div.dt-container div.dt-layout-cell.dt-full,
    div.dt-container div.dt-layout-cell.dt-start {
        text-align: center;
    }
}
@media screen and (max-width: 640px) {
    .dt-container .dt-length,
    .dt-container .dt-search {
        float: none;
        text-align: center;
    }
    .dt-container .dt-search {
        margin-top: 0.5em;
    }
}
html.dark {
    --dt-row-hover: 255, 255, 255;
    --dt-row-stripe: 255, 255, 255;
    --dt-column-ordering: 255, 255, 255;
}
html.dark table.dataTable > thead > tr > td,
html.dark table.dataTable > thead > tr > th {
    border-bottom: 1px solid #595b5e;
}
html.dark table.dataTable > thead > tr > td:active,
html.dark table.dataTable > thead > tr > th:active {
    outline: none;
}
html.dark table.dataTable > tfoot > tr > td,
html.dark table.dataTable > tfoot > tr > th {
    border-top: 1px solid #595b5e;
}
html.dark table.dataTable.display > tbody > tr > *,
html.dark table.dataTable.row-border > tbody > tr > * {
    border-top: 1px solid #404346;
}
html.dark table.dataTable.display > tbody > tr:first-child > *,
html.dark table.dataTable.row-border > tbody > tr:first-child > * {
    border-top: none;
}
html.dark table.dataTable.display > tbody > tr.selected + tr.selected > td,
html.dark table.dataTable.row-border > tbody > tr.selected + tr.selected > td {
    border-top-color: rgba(13, 110, 253, 0.65);
    border-top-color: rgba(var(--dt-row-selected), 0.65);
}
html.dark table.dataTable.cell-border > tbody > tr > td,
html.dark table.dataTable.cell-border > tbody > tr > th {
    border-right: 1px solid #404346;
    border-top: 1px solid #404346;
}
html.dark table.dataTable.cell-border > tbody > tr > td:first-child,
html.dark table.dataTable.cell-border > tbody > tr > th:first-child {
    border-left: 1px solid #404346;
}
html.dark .dt-container.dt-empty-footer table.dataTable {
    border-bottom: 1px solid #595b5e;
}
html.dark .dt-container .dt-length select,
html.dark .dt-container .dt-search input {
    background-color: var(--dt-html-background);
    border: 1px solid hsla(0, 0%, 100%, 0.2);
}
html.dark .dt-container .dt-paging .dt-paging-button.current,
html.dark .dt-container .dt-paging .dt-paging-button.current:hover {
    background: hsla(0, 0%, 100%, 0.15);
    border: 1px solid #595b5e;
}
html.dark .dt-container .dt-paging .dt-paging-button.disabled,
html.dark .dt-container .dt-paging .dt-paging-button.disabled:active,
html.dark .dt-container .dt-paging .dt-paging-button.disabled:hover {
    color: #666 !important;
}
html.dark .dt-container .dt-paging .dt-paging-button:hover {
    background: #353535;
    border: 1px solid #353535;
}
html.dark .dt-container .dt-paging .dt-paging-button:active {
    background: #3a3a3a;
}
[dir="rtl"] table.dataTable tfoot td,
[dir="rtl"] table.dataTable tfoot th,
[dir="rtl"] table.dataTable thead td,
[dir="rtl"] table.dataTable thead th {
    text-align: right;
}
[dir="rtl"] table.dataTable td.dt-type-date,
[dir="rtl"] table.dataTable td.dt-type-numeric,
[dir="rtl"] table.dataTable th.dt-type-date,
[dir="rtl"] table.dataTable th.dt-type-numeric {
    text-align: left;
}
[dir="rtl"] div.dt-container div.dt-layout-cell.dt-start {
    text-align: right;
}
[dir="rtl"] div.dt-container div.dt-layout-cell.dt-end {
    text-align: left;
}
[dir="rtl"] div.dt-container div.dt-search input {
    margin: 0 3px 0 0;
}
.yasr .booleanResult {
    align-items: center;
    display: flex;
    justify-content: center;
}
.yasr .booleanResult svg {
    margin-bottom: -10px;
    margin-right: 7px;
}
.yasr .yasr_results {
    position: relative;
}
.yasr .yasr_results .CodeMirror {
    border: 1px solid #d1d1d1;
    height: 100%;
    margin-top: 5px;
}
.yasr .yasr_results .CodeMirror.overflow:before {
    background: linear-gradient(transparent, hsla(0, 0%, 100%, 0.667) 75%, #fff);
    content: "";
    height: 100%;
    pointer-events: none;
    position: absolute;
    width: 100%;
    z-index: 1200;
}
.yasr .yasr_results .overlay {
    bottom: 0;
    display: flex;
    pointer-events: none;
    position: absolute;
    width: 100%;
    z-index: 1201;
}
.yasr .yasr_results .overlay:after,
.yasr .yasr_results .overlay:before {
    content: "";
    flex-grow: 1;
}
.yasr .yasr_results .overlay_content {
    align-content: center;
    align-items: center;
    background: #fff;
    background: linear-gradient(90deg, transparent, #fff 5%, #fff 95%, transparent);
    display: flex;
    justify-content: center;
    pointer-events: all;
}
.yasr .yasr_results .yasr_btn.overlay_btn {
    background: #fff;
    border: 1px solid #337ab7;
    color: #337ab7;
    margin: 10px;
    padding: 10px;
}
.yasr .yasr_results .yasr_btn.overlay_btn svg {
    margin-left: 0.5rem;
    fill: #337ab7;
    color: #337ab7;
}
.yasr .yasr_results .yasr_btn.overlay_btn:hover {
    border-color: #337ab7;
    color: #255681;
    fill: #255681;
}
.yasr .yasr_results .yasr_btn.overlay_btn:hover svg {
    color: #255681;
    fill: #255681;
}
.CodeMirror {
    color: #000;
    direction: ltr;
    font-family: monospace;
    height: 300px;
}
.CodeMirror-lines {
    padding: 4px 0;
}
.CodeMirror pre.CodeMirror-line,
.CodeMirror pre.CodeMirror-line-like {
    padding: 0 4px;
}
.CodeMirror-gutter-filler,
.CodeMirror-scrollbar-filler {
    background-color: #fff;
}
.CodeMirror-gutters {
    background-color: #f7f7f7;
    border-right: 1px solid #ddd;
    white-space: nowrap;
}
.CodeMirror-linenumber {
    color: #999;
    min-width: 20px;
    padding: 0 3px 0 5px;
    text-align: right;
    white-space: nowrap;
}
.CodeMirror-guttermarker {
    color: #000;
}
.CodeMirror-guttermarker-subtle {
    color: #999;
}
.CodeMirror-cursor {
    border-left: 1px solid #000;
    border-right: none;
    width: 0;
}
.CodeMirror div.CodeMirror-secondarycursor {
    border-left: 1px solid silver;
}
.cm-fat-cursor .CodeMirror-cursor {
    background: #7e7;
    border: 0 !important;
    width: auto;
}
.cm-fat-cursor div.CodeMirror-cursors {
    z-index: 1;
}
.cm-fat-cursor .CodeMirror-line::selection,
.cm-fat-cursor .CodeMirror-line > span::selection,
.cm-fat-cursor .CodeMirror-line > span > span::selection {
    background: transparent;
}
.cm-fat-cursor .CodeMirror-line::-moz-selection,
.cm-fat-cursor .CodeMirror-line > span::-moz-selection,
.cm-fat-cursor .CodeMirror-line > span > span::-moz-selection {
    background: transparent;
}
.cm-fat-cursor {
    caret-color: transparent;
}
@-moz-keyframes blink {
    50% {
        background-color: transparent;
    }
}
@-webkit-keyframes blink {
    50% {
        background-color: transparent;
    }
}
@keyframes blink {
    50% {
        background-color: transparent;
    }
}
.cm-tab {
    display: inline-block;
    text-decoration: inherit;
}
.CodeMirror-rulers {
    bottom: 0;
    left: 0;
    overflow: hidden;
    position: absolute;
    right: 0;
    top: -50px;
}
.CodeMirror-ruler {
    border-left: 1px solid #ccc;
    bottom: 0;
    position: absolute;
    top: 0;
}
.cm-s-default .cm-header {
    color: blue;
}
.cm-s-default .cm-quote {
    color: #090;
}
.cm-negative {
    color: #d44;
}
.cm-positive {
    color: #292;
}
.cm-header,
.cm-strong {
    font-weight: 700;
}
.cm-em {
    font-style: italic;
}
.cm-link {
    text-decoration: underline;
}
.cm-strikethrough {
    text-decoration: line-through;
}
.cm-s-default .cm-keyword {
    color: #708;
}
.cm-s-default .cm-atom {
    color: #219;
}
.cm-s-default .cm-number {
    color: #164;
}
.cm-s-default .cm-def {
    color: #00f;
}
.cm-s-default .cm-variable-2 {
    color: #05a;
}
.cm-s-default .cm-type,
.cm-s-default .cm-variable-3 {
    color: #085;
}
.cm-s-default .cm-comment {
    color: #a50;
}
.cm-s-default .cm-string {
    color: #a11;
}
.cm-s-default .cm-string-2 {
    color: #f50;
}
.cm-s-default .cm-meta,
.cm-s-default .cm-qualifier {
    color: #555;
}
.cm-s-default .cm-builtin {
    color: #30a;
}
.cm-s-default .cm-bracket {
    color: #997;
}
.cm-s-default .cm-tag {
    color: #170;
}
.cm-s-default .cm-attribute {
    color: #00c;
}
.cm-s-default .cm-hr {
    color: #999;
}
.cm-s-default .cm-link {
    color: #00c;
}
.cm-invalidchar,
.cm-s-default .cm-error {
    color: red;
}
.CodeMirror-composing {
    border-bottom: 2px solid;
}
div.CodeMirror span.CodeMirror-matchingbracket {
    color: #0b0;
}
div.CodeMirror span.CodeMirror-nonmatchingbracket {
    color: #a22;
}
.CodeMirror-matchingtag {
    background: rgba(255, 150, 0, 0.3);
}
.CodeMirror-activeline-background {
    background: #e8f2ff;
}
.CodeMirror {
    background: #fff;
    overflow: hidden;
    position: relative;
}
.CodeMirror-scroll {
    height: 100%;
    margin-bottom: -50px;
    margin-right: -50px;
    outline: none;
    overflow: scroll !important;
    padding-bottom: 50px;
    position: relative;
    z-index: 0;
}
.CodeMirror-sizer {
    border-right: 50px solid transparent;
    position: relative;
}
.CodeMirror-gutter-filler,
.CodeMirror-hscrollbar,
.CodeMirror-scrollbar-filler,
.CodeMirror-vscrollbar {
    display: none;
    outline: none;
    position: absolute;
    z-index: 6;
}
.CodeMirror-vscrollbar {
    overflow-x: hidden;
    overflow-y: scroll;
    right: 0;
    top: 0;
}
.CodeMirror-hscrollbar {
    bottom: 0;
    left: 0;
    overflow-x: scroll;
    overflow-y: hidden;
}
.CodeMirror-scrollbar-filler {
    bottom: 0;
    right: 0;
}
.CodeMirror-gutter-filler {
    bottom: 0;
    left: 0;
}
.CodeMirror-gutters {
    left: 0;
    min-height: 100%;
    position: absolute;
    top: 0;
    z-index: 3;
}
.CodeMirror-gutter {
    display: inline-block;
    height: 100%;
    margin-bottom: -50px;
    vertical-align: top;
    white-space: normal;
}
.CodeMirror-gutter-wrapper {
    background: none !important;
    border: none !important;
    position: absolute;
    z-index: 4;
}
.CodeMirror-gutter-background {
    bottom: 0;
    position: absolute;
    top: 0;
    z-index: 4;
}
.CodeMirror-gutter-elt {
    cursor: default;
    position: absolute;
    z-index: 4;
}
.CodeMirror-gutter-wrapper ::selection {
    background-color: transparent;
}
.CodeMirror-gutter-wrapper ::-moz-selection {
    background-color: transparent;
}
.CodeMirror-lines {
    cursor: text;
    min-height: 1px;
}
.CodeMirror pre.CodeMirror-line,
.CodeMirror pre.CodeMirror-line-like {
    background: transparent;
    -moz-border-radius: 0;
    -webkit-border-radius: 0;
    border-radius: 0;
    border-width: 0;
    font-family: inherit;
    font-size: inherit;
    margin: 0;
    white-space: pre;
    word-wrap: normal;
    color: inherit;
    line-height: inherit;
    overflow: visible;
    position: relative;
    z-index: 2;
    -webkit-tap-highlight-color: transparent;
    -webkit-font-variant-ligatures: contextual;
    font-variant-ligatures: contextual;
}
.CodeMirror-wrap pre.CodeMirror-line,
.CodeMirror-wrap pre.CodeMirror-line-like {
    word-wrap: break-word;
    white-space: pre-wrap;
    word-break: normal;
}
.CodeMirror-linebackground {
    bottom: 0;
    left: 0;
    position: absolute;
    right: 0;
    top: 0;
    z-index: 0;
}
.CodeMirror-linewidget {
    padding: 0.1px;
    position: relative;
    z-index: 2;
}
.CodeMirror-rtl pre {
    direction: rtl;
}
.CodeMirror-code {
    outline: none;
}
.CodeMirror-gutter,
.CodeMirror-gutters,
.CodeMirror-linenumber,
.CodeMirror-scroll,
.CodeMirror-sizer {
    -moz-box-sizing: content-box;
    box-sizing: content-box;
}
.CodeMirror-measure {
    height: 0;
    overflow: hidden;
    position: absolute;
    visibility: hidden;
    width: 100%;
}
.CodeMirror-cursor {
    pointer-events: none;
    position: absolute;
}
.CodeMirror-measure pre {
    position: static;
}
div.CodeMirror-cursors {
    position: relative;
    visibility: hidden;
    z-index: 3;
}
.CodeMirror-focused div.CodeMirror-cursors,
div.CodeMirror-dragcursors {
    visibility: visible;
}
.CodeMirror-selected {
    background: #d9d9d9;
}
.CodeMirror-focused .CodeMirror-selected {
    background: #d7d4f0;
}
.CodeMirror-crosshair {
    cursor: crosshair;
}
.CodeMirror-line::selection,
.CodeMirror-line > span::selection,
.CodeMirror-line > span > span::selection {
    background: #d7d4f0;
}
.CodeMirror-line::-moz-selection,
.CodeMirror-line > span::-moz-selection,
.CodeMirror-line > span > span::-moz-selection {
    background: #d7d4f0;
}
.cm-searching {
    background-color: #ffa;
    background-color: rgba(255, 255, 0, 0.4);
}
.cm-force-border {
    padding-right: 0.1px;
}
@media print {
    .CodeMirror div.CodeMirror-cursors {
        visibility: hidden;
    }
}
.cm-tab-wrap-hack:after {
    content: "";
}
span.CodeMirror-selectedtext {
    background: none;
}
.yasr .errorResult {
    padding: 10px;
}
.yasr .errorResult .errorHeader {
    overflow: hidden;
}
.yasr .errorResult .errorHeader .yasr_tryQuery {
    float: right;
    padding-bottom: 3px;
    padding-top: 3px;
    text-decoration: none;
}
.yasr .errorResult .errorHeader span.status {
    background-color: #dc3545;
    border-radius: 0.25em;
    color: #fff;
    display: inline-block;
    font-size: 75%;
    font-weight: 600;
    line-height: 1.35;
    padding: 0.35em 0.5rem;
    text-align: center;
    vertical-align: baseline;
    white-space: nowrap;
}
.yasr .errorResult .errorMessageContainer {
    display: flex;
}
.yasr .errorResult .errorMessageContainer .errorMessage {
    display: block;
    flex-grow: 1;
    font-size: 13px;
    line-height: 1.42857;
    margin: 10px 0;
    min-width: 100px;
    overflow: auto;
    padding: 10px;
    width: 0;
    word-break: break-all;
    word-wrap: break-word;
    background-color: #f5f5f5;
    border: 1px solid #ccc;
    border-radius: 4px;
    color: #333;
}
.yasr .errorResult .redOutline {
    background-color: #f2dede;
    border: 1px solid #ebccd1;
    border-radius: 4px;
    color: #a94442;
    margin-top: 10px;
    padding: 5px 1em;
}
.yasqe .CodeMirror {
    min-height: 60px;
}
.yasqe .svgImg {
    display: inline-block;
}
.yasqe span.shortlinkErr {
    color: red;
    float: left;
    font-size: small;
    font-weight: 700;
}
.yasqe .CodeMirror-hint {
    max-width: 30em;
}
.yasqe .notificationContainer {
    bottom: 0;
    display: flex;
    justify-content: center;
    position: absolute;
    width: 100%;
}
.yasqe .notification {
    background-color: #eee;
    border-top-left-radius: 2px;
    border-top-right-radius: 2px;
    color: #999;
    font-size: 90%;
    max-height: 0;
    padding: 0 5px;
    text-align: center;
    transition: max-height 0.2s ease-in;
    z-index: 4;
}
.yasqe .notification.active {
    max-height: 3rem;
}
.yasqe .parseErrorIcon {
    height: 13px;
    margin-left: 2px;
    margin-top: 2px;
    width: 13px;
}
.yasqe .parseErrorIcon svg g {
    fill: red;
}
.yasqe .yasqe_tooltip {
    background: #333;
    background: rgba(0, 0, 0, 0.8);
    border-radius: 5px;
    color: #fff;
    margin-top: 5px;
    padding: 5px 15px;
    white-space: pre-wrap;
    white-space: normal;
    width: 220px;
}
.yasqe .notificationLoader {
    height: 18px;
    vertical-align: middle;
    width: 18px;
}
.yasqe .resizeWrapper {
    align-items: center;
    cursor: row-resize;
    display: flex;
    height: 10px;
    justify-content: center;
    width: 100%;
}
.yasqe .resizeChip {
    background-color: #d1d1d1;
    border-radius: 2px;
    height: 4px;
    visibility: hidden;
    width: 20%;
}
.yasqe:hover .resizeChip {
    visibility: visible;
}
.yasqe .yasqe_btn {
    background-color: #fff;
    border: 1px solid #ccc;
    border-radius: 2px;
    box-sizing: border-box;
    color: #333;
    cursor: pointer;
    display: inline-block;
    overflow: visible;
    padding: 6px 12px;
    text-align: center;
    -webkit-user-select: none;
    -moz-user-select: none;
    user-select: none;
    vertical-align: middle;
    white-space: nowrap;
}
.yasqe .yasqe_btn.btn_icon {
    padding: 4px 8px;
}
.yasqe .yasqe_btn.disabled,
.yasqe .yasqe_btn[disabled] {
    box-shadow: none;
    cursor: default;
    filter: alpha(opacity=50);
    opacity: 0.5;
}
.yasqe .yasqe_btn:hover {
    background-color: #ebebeb;
    border-color: #adadad;
    outline: 0;
}
.yasqe .yasqe_btn.selected,
.yasqe .yasqe_btn:focus {
    background-color: #337ab7;
    border-color: #337ab7;
    color: #fff;
    outline: 0;
}
.yasqe .yasqe_btn.btn_icon:focus {
    background-color: #fff;
    border: 1px solid #ccc;
    color: #333;
}
.yasqe .yasqe_btn.yasqe_btn-sm {
    border-radius: 3px;
    font-size: 12px;
    line-height: 1.5;
    padding: 1px 5px;
}
.yasqe .yasqe_buttons {
    position: absolute;
    right: 20px;
    top: 10px;
    z-index: 5;
}
.yasqe .yasqe_buttons svg {
    fill: #505050;
}
.yasqe .yasqe_buttons .yasqe_share {
    background: none;
    border: none;
    cursor: pointer;
    display: inline-block;
    margin-top: 3px;
}
.yasqe .yasqe_buttons .yasqe_share svg {
    height: 25px;
    width: 25px;
}
.yasqe .yasqe_buttons button {
    margin-left: 5px;
    vertical-align: top;
}
.yasqe .yasqe_buttons .yasqe_sharePopup {
    background-color: #fff;
    border: 1px solid #e3e3e3;
    border-radius: 2px;
    box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.05);
    display: flex;
    height: auto;
    margin-left: 0;
    padding: 4px;
    position: absolute;
    width: 600px;
}
.yasqe .yasqe_buttons .yasqe_sharePopup .inputWrapper {
    flex-grow: 100;
}
.yasqe .yasqe_buttons .yasqe_sharePopup input {
    border: 0;
    -ms-box-sizing: border-box;
    -khtml-box-sizing: border-box;
    box-sizing: border-box;
    float: left;
    width: 100%;
}
.yasqe .yasqe_buttons .yasqe_sharePopup button {
    float: right;
    margin-left: 5px;
}
.yasqe .yasqe_buttons .yasqe_sharePopup textarea {
    width: 100%;
}
.yasqe .yasqe_buttons .yasqe_queryButton {
    background: none;
    border: none;
    cursor: pointer;
    display: inline-block;
    height: 40px;
    padding: 0;
    position: relative;
    width: 40px;
}
.yasqe .yasqe_buttons .yasqe_queryButton .queryIcon {
    display: block;
}
.yasqe .yasqe_buttons .yasqe_queryButton .queryIcon svg {
    height: 40px;
    width: 40px;
}
.yasqe .yasqe_buttons .yasqe_queryButton .svgImg {
    height: inherit;
    position: absolute;
    top: 0;
}
.yasqe .yasqe_buttons .yasqe_queryButton.busy svg #loadingIcon {
    stroke-dasharray: 100;
    animation: dash 1.5s linear infinite;
    stroke-width: 8px;
    stroke: #fff;
}
@keyframes dash {
    to {
        stroke-dashoffset: 200;
    }
}
@keyframes rotate {
    to {
        transform: rotate(1turn);
    }
}
.yasqe .yasqe_buttons .yasqe_queryButton .warningIcon {
    display: none;
}
.yasqe .yasqe_buttons .yasqe_queryButton.query_error .warningIcon {
    display: block;
    right: 0;
    top: 5px;
}
.yasqe .yasqe_buttons .yasqe_queryButton.query_error .warningIcon svg {
    height: 15px;
    width: 15px;
}
.yasqe .yasqe_buttons .yasqe_queryButton.query_error .warningIcon svg g {
    fill: red;
}
.yasqe .yasqe_buttons .yasqe_queryButton.query_disabled {
    cursor: not-allowed;
}
.yasqe .yasqe_buttons .yasqe_queryButton.query_disabled .queryIcon {
    filter: alpha(opacity=50);
    opacity: 0.5;
}
.CodeMirror-hints {
    background: #fff;
    border: 1px solid silver;
    border-radius: 3px;
    box-shadow: 2px 3px 5px rgba(0, 0, 0, 0.2);
    font-family: monospace;
    font-size: 90%;
    list-style: none;
    margin: 0;
    max-height: 20em;
    overflow: hidden;
    overflow-y: auto;
    padding: 2px;
    position: absolute;
    z-index: 10;
}
.CodeMirror-hint {
    border-radius: 2px;
    color: #000;
    cursor: pointer;
    margin: 0;
    padding: 0 4px;
    white-space: pre;
}
li.CodeMirror-hint-active {
    background: #08f;
    color: #fff;
}
.CodeMirror-foldmarker {
    color: blue;
    cursor: pointer;
    font-family: arial;
    line-height: 0.3;
    text-shadow: #b9f 1px 1px 2px, #b9f -1px -1px 2px, #b9f 1px -1px 2px, #b9f -1px 1px 2px;
}
.CodeMirror-foldgutter {
    width: 0.7em;
}
.CodeMirror-foldgutter-folded,
.CodeMirror-foldgutter-open {
    cursor: pointer;
}
.CodeMirror-foldgutter-open:after {
    content: "\\25BE";
}
.CodeMirror-foldgutter-folded:after {
    content: "\\25B8";
}
.yasqe .CodeMirror {
    border: 1px solid #d1d1d1;
    font-size: 14px;
    line-height: 1.5em;
}
.yasqe span.cm-error {
    border-bottom: 2px dotted red;
}
.yasqe .gutterErrorBar {
    width: 4px;
}
.yasqe .CodeMirror-foldmarker {
    color: #6e2500;
    font-size: 19px;
    text-shadow: #ff935e 1px 1px 2px, #ff935e -1px -1px 2px, #ff935e 1px -1px 2px, #ff935e -1px 1px 2px;
}
.yasqe .cm-matchhighlight {
    background-color: #dbdeed;
}
.CodeMirror-hints.default {
    max-width: 1000px;
}
.CodeMirror-hints.default li {
    overflow: hidden;
    text-overflow: ellipsis;
}
@media only screen and (max-width: 1000px) {
    .CodeMirror-hints.default {
        max-width: 800px;
    }
}
.yasgui .tabMenu {
    background: #f5f5f5;
    border: 1px solid #ccc;
    left: 0;
    perspective: 1500px;
    perspective-origin: 0 50%;
    position: absolute;
    top: 35px;
    transform: translate3d(-100%, 0, 0) rotateY(90deg);
    transform-origin: 100% 50%;
    transform-style: preserve-3d;
    transition: all 0.5s;
    visibility: hidden;
    width: 600px;
    z-index: 7;
}
.yasgui .tabMenu.open {
    left: 600px;
    transform: translate3d(-100%, 0, 0) rotateY(0deg);
    transition: all 0.5s;
    visibility: visible;
}
@media (-ms-high-contrast: active), (-ms-high-contrast: none) {
    .yasgui .tabMenu.open {
        min-width: 600px;
    }
    .yasgui .tabMenu {
        height: 0;
    }
}
.yasgui .tabMenu .requestConfigWrapper {
    background: #f5f5f5;
    display: flex;
    flex-wrap: nowrap;
    overflow: hidden;
    padding: 10px;
}
.yasgui .tabMenu .requestConfigWrapper .selectorButton {
    background-color: transparent;
    border: none;
    border-bottom: 1px solid #d1d1d1;
    color: #505050;
    cursor: pointer;
    height: 30px;
}
.yasgui .tabMenu .requestConfigWrapper .selectorButton:hover {
    border-color: #000;
    color: #000;
}
.yasgui .tabMenu .requestConfigWrapper .selectorButton.selected {
    border-bottom: 2px solid #337ab7;
    color: #337ab7;
}
.yasgui .tabMenu .requestConfigWrapper .selectorButton:focus {
    outline: none;
}
.yasgui .tabMenu .requestConfigWrapper .selectorButton:focus-visible {
    border-color: #000;
    color: #000;
}
.yasgui .tabMenu .acceptWrapper {
    flex-direction: row;
}
.yasgui .tabMenu .acceptWrapper .acceptLabel {
    justify-self: center;
}
.yasgui .tabMenu .acceptWrapper .selector {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    padding: 2.5px 5px;
    width: 100%;
}
.yasgui .tabMenu .acceptWrapper .selector .selectorLabel {
    align-self: center;
    font-size: small;
    font-weight: 700;
}
.yasgui .tabMenu .textSetting {
    display: flex;
    flex-direction: column;
}
.yasgui .tabMenu .textSetting .label {
    align-self: flex-start;
}
.yasgui .tabMenu .textSetting .graphInput {
    white-space: nowrap;
}
.yasgui .tabMenu .textSetting .textRow {
    flex-direction: row;
    flex-wrap: nowrap;
    white-space: nowrap;
}
.yasgui .tabMenu .textSetting .removeButton {
    background: transparent;
    border: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    user-select: none;
}
.yasgui .tabMenu .textSetting .removeButton:hover {
    background: transparent;
    border-color: #000;
    color: #000;
    cursor: pointer;
}
.yasgui .tabMenu .label {
    align-self: center;
    font-weight: 700;
    padding-right: 5px;
    -webkit-text-decoration: #000;
    text-decoration: #000;
    white-space: nowrap;
}
.yasgui .autocomplete {
    border: 2px solid #ccc;
    box-sizing: border-box;
    margin: 4px 0;
    padding: 3px 6px;
    transition: border-color 0.2s ease-in;
    width: 100%;
}
.yasgui .autocomplete:hover {
    border-color: #bbb;
}
.yasgui .autocomplete:focus {
    background: none;
    border-color: #337ab7;
    outline: none;
}
.yasgui .autocompleteWrapper {
    margin-left: 10px;
    max-width: 700px;
    position: relative;
    width: 100%;
}
.yasgui .autocompleteList {
    background: #fff;
    border: 1px solid #aaa;
    box-sizing: border-box;
    left: 0;
    list-style: none;
    margin: -4px 0 0;
    max-height: 300px;
    overflow-y: auto;
    padding: 0;
    position: absolute;
    right: 0;
    z-index: 6;
}
.yasgui .autocompleteList:hover .autoComplete_result.autoComplete_selected:not(:hover) {
    background: unset;
}
.yasgui .autocompleteList:hover .autoComplete_result.autoComplete_selected:not(:hover) .removeItem {
    visibility: hidden;
}
.yasgui .autocompleteList .autoComplete_result {
    cursor: pointer;
    display: flex;
    margin: 0;
    overflow: hidden;
    padding: 5px 10px;
    transition: background visibility 0.2s ease-in;
}
.yasgui .autocompleteList .autoComplete_result b {
    color: #1f49a3;
}
.yasgui .autocompleteList .autoComplete_result .autoComplete_highlighted {
    font-weight: 700;
}
.yasgui .autocompleteList .autoComplete_result.autoComplete_selected {
    background: #ccc;
}
.yasgui .autocompleteList .autoComplete_result.autoComplete_selected .removeItem {
    visibility: visible;
}
.yasgui .autocompleteList .autoComplete_result:hover {
    background: #ccc;
}
.yasgui .autocompleteList .autoComplete_result:hover .removeItem {
    visibility: visible;
}
.yasgui .autocompleteList .noResults {
    margin: 0;
    padding: 5px 10px;
}
.yasgui .autocompleteList .removeItem {
    background: none;
    border: none;
    color: #000;
    cursor: pointer;
    font-size: 15px;
    font-weight: 700;
    margin-left: auto;
    margin-right: -10px;
    opacity: 0.5;
    padding-right: 20px;
    text-align: end;
    text-shadow: 0 1px 0 #fff;
    visibility: hidden;
}
.yasgui .autocompleteList .removeItem:hover {
    color: #1f49a3;
    opacity: 0.8;
}
.yasgui .autocompleteList:empty {
    display: none;
}
.yasgui .tabPanel {
    display: none;
    position: relative;
}
.yasgui .tabPanel.active {
    display: block;
}
.yasgui .yasr {
    margin-top: 5px;
}
.yasgui .tabContextButton {
    align-self: center;
    background: none;
    border: none;
    color: #505050;
    cursor: pointer;
    padding-left: 10px;
    fill: #505050;
}
.yasgui .tabContextButton .svgImg {
    font-family: initial;
    height: 15px;
    width: 15px;
}
.yasgui .tabContextButton svg {
    max-height: 15px;
    max-width: 15px;
}
.yasgui .tabContextButton:hover {
    color: #000;
    fill: #000;
}
.yasgui .controlbar {
    align-content: center;
    display: flex;
    max-height: 35px;
}
.yasgui.context-menu {
    background: #fff;
    background-clip: padding-box;
    border: 1px solid rgba(0, 0, 0, 0.15);
    border-bottom-left-radius: 4px;
    border-bottom-right-radius: 4px;
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.175);
    font-size: 14px;
    min-width: 160px;
    position: absolute;
    z-index: 10;
}
.yasgui.context-menu hr {
    border: none;
    border-bottom: 1px solid #fff;
    border-top: 1px solid #aaa;
    margin: 8px auto;
}
.yasgui.context-menu .context-menu-list {
    padding: 0;
}
.yasgui.context-menu .context-menu-item {
    clear: both;
    color: #333;
    cursor: pointer;
    display: block;
    font-weight: 400;
    line-height: 1.42857;
    padding: 3px 20px;
    white-space: nowrap;
}
.yasgui.context-menu .context-menu-item:hover {
    background-color: #f5f5f5;
    color: #000;
    text-decoration: none;
}
.yasgui.context-menu .context-menu-item.disabled {
    background-color: #e5e5e5;
    color: gray;
    cursor: not-allowed;
    text-decoration: none;
}
.yasgui .tabsList {
    display: flex;
    flex-wrap: wrap;
}
.yasgui .tabsList .sortable-placeholder {
    border: 2px dotted #888;
    min-height: 35px;
    min-width: 100px;
}
.yasgui .tabsList a {
    align-items: center;
    border-bottom: 2px solid transparent;
    box-sizing: border-box;
    cursor: pointer;
    display: flex;
    justify-content: center;
    min-height: 35px;
}
.yasgui .tabsList .addTab {
    background: inherit;
    border: none;
    color: #337ab7;
    cursor: pointer;
    font-size: 120%;
    font-weight: 800;
    height: 100%;
    margin-left: 15px;
    padding: 0 5px 2px;
}
.yasgui .tabsList .addTab:focus-visible,
.yasgui .tabsList .addTab:hover {
    transform: scale(1.1);
}
.yasgui .tabsList .addTab:focus {
    color: #faa857;
}
.yasgui .tabsList .tab {
    position: relative;
}
.yasgui .tabsList .tab .loader {
    animation-duration: 2s;
    animation-iteration-count: infinite;
    animation-name: slide;
    animation-timing-function: ease;
    background-color: #d5d5d5;
    bottom: 0;
    display: none;
    height: 2px;
    left: 0;
    position: absolute;
    right: 100%;
}
@keyframes slide {
    0% {
        left: 0;
        right: 100%;
    }
    70% {
        left: 0;
        right: 0;
    }
    to {
        left: 100%;
        right: 0;
    }
}
.yasgui .tabsList .tab.active .loader {
    background-color: #9fc4e4;
}
.yasgui .tabsList .tab:hover .loader {
    background-color: #337ab7;
}
.yasgui .tabsList .tab.querying .loader {
    display: block;
}
.yasgui .tabsList .tab.active a {
    border-bottom-color: #337ab7;
    color: #555;
}
.yasgui .tabsList .tab input {
    border: none;
    display: none;
    outline: none;
}
.yasgui .tabsList .tab.renaming .closeTab,
.yasgui .tabsList .tab.renaming span {
    display: none;
}
.yasgui .tabsList .tab.renaming input {
    display: block;
}
.yasgui .tabsList .tab a {
    color: #888;
    font-size: 15px;
    font-weight: 600;
    font-weight: 500;
    line-height: 1.5rem;
    min-width: 120px;
    overflow: hidden;
    padding: 0 24px 0 30px;
    white-space: nowrap;
}
.yasgui .tabsList .tab a:hover {
    border-bottom-color: #9fc4e4;
    color: #555;
}
.yasgui .tabsList .tab a:focus {
    border-bottom-color: #faa857;
    color: #555;
}
.yasgui .tabsList .tab a .closeTab {
    color: #000;
    font-size: 15px;
    font-weight: 700;
    margin-left: 7px;
    opacity: 0.2;
    padding: 2px;
    text-shadow: 0 1px 0 #fff;
}
.yasgui .tabsList .tab a .closeTab:hover {
    opacity: 0.5;
}
.yasgui a {
    color: #337ab7;
    text-decoration: none;
}
.yasgui .yasgui_textfield {
    display: block;
    padding-top: 18.75px;
    position: relative;
}
.yasgui .yasgui_textfield > label {
    color: rgba(0, 0, 0, 0.54);
    display: block;
    font-size: 12px;
    font-weight: 400;
    line-height: 15px;
    overflow-x: hidden;
    position: absolute;
    text-overflow: ellipsis;
    top: 0;
    white-space: nowrap;
    width: 100%;
}
.yasgui .yasgui_textfield > input,
.yasgui .yasgui_textfield > textarea {
    background-image: none;
    border: none;
    border-bottom: 1px solid rgba(0, 0, 0, 0.26);
    border-radius: 0;
    box-shadow: none;
    box-sizing: border-box;
    color: rgba(0, 0, 0, 0.87);
    display: block;
    font-family: inherit;
    font-size: 15px;
    line-height: inherit;
    outline: none;
    padding: 0;
    width: 100%;
}
.yasgui .yasgui_textfield > input:focus,
.yasgui .yasgui_textfield > textarea:focus {
    border-color: #337ab7;
    border-width: 2px;
}
.yasgui .yasgui_textfield > input:focus ~ label,
.yasgui .yasgui_textfield > textarea:focus ~ label {
    color: #337ab7;
}
.modal-dialog.google-visualization-charteditor-dialog {
    margin: inherit;
    width: auto;
    z-index: 11;
}
.modal-dialog.google-visualization-charteditor-dialog .charts-flat-menu-button {
    box-sizing: content-box;
}
`;

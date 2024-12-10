export const componentStyle = `
  html, body {
    font: 10pt arial;
  }
  #sparql-overview {
    height: 100%;

    a {
      text-decoration: none;
    }
    a:hover {
      filter: brightness(60%);
      text-decoration: underline;
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
    #network-container {
      width: 100%;
      float: right;
      height: 100%;
      border: 1px solid lightgray;
      border-radius: 2px;
    }
    hr {
      width: 80%;
      border: none;
      height: 1px;
      background: lightgrey;
    }
    .clusterLabel {
      position: absolute;
      // transform: translate(-50%, -50%);
      font-size: 1.5rem;
      font-family: sans-serif;
      font-variant: small-caps;
      font-weight: 400;
      text-shadow: 2px 2px 1px white, -2px -2px 1px white, -2px 2px 1px white, 2px -2px 1px white;
    }
    code {
      font-family: 'Fira Code', monospace;
      font-size: 0.95rem;
      border-radius: 6px;
      padding: 0.2em 0.4em;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
      border: 1px solid #e0e0e0;
      display: inline-block;
      word-wrap: break-word;
    }
    dialog {
      border-color: #cccccc;
      background-color: #f5f5f5;
      border-radius: 10px;
    }
    button {
      font-size: 0.9em;
      border: none;
      padding: 0.3em 0.4em;
      border-radius: 5px;
      transition: background-color 0.3s ease, box-shadow 0.3s ease;
    }
    button:hover {
      filter: brightness(90%);
    }
    #loading-msg {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 1000;
      background-color: rgba(255, 255, 255, 0.8);
      padding: 1em 2em;
      border: 1px solid #ccc;
      border-radius: 8px;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
      // display: none;
    }
  }
`;

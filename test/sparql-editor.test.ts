import {describe, it, expect, beforeEach, vi} from "vitest";
import "@testing-library/jest-dom";
import "../src/sparql-editor";

// We need to mock some stuff for the tests to work (vitest and jsdom don't support everything yet)
// Puppeteers or Playwright would be better for this, but too heavy to setup

describe("sparql-editor", () => {
  beforeEach(() => {
    document.body.innerHTML = "";

    // Mock getBoundingClientRect for Range
    Range.prototype.getBoundingClientRect = vi.fn(() => ({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      top: 0,
      right: 100,
      bottom: 100,
      left: 0,
      toJSON: () => {},
    }));
    // @ts-ignore Mock getClientRects for Range
    Range.prototype.getClientRects = vi.fn(() => [
      {
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        top: 0,
        right: 100,
        bottom: 100,
        left: 0,
        toJSON: () => {},
      },
    ]);
    // Mock window.focus
    window.focus = vi.fn();
  });

  it("renders as expected for UniProt endpoint", async () => {
    document.body.innerHTML = `
      <sparql-editor
        endpoint="https://sparql.uniprot.org/sparql/"
        examples-on-main-page="10"
      ></sparql-editor>
    `;

    const sparqlEditor = document.querySelector("sparql-editor") as HTMLElement & {shadowRoot: ShadowRoot};
    await customElements.whenDefined("sparql-editor");
    // Wait for the element to pull examples
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check attributes
    expect(sparqlEditor).toBeInTheDocument();
    expect(sparqlEditor?.getAttribute("endpoint")).toBe("https://sparql.uniprot.org/sparql/");
    expect(sparqlEditor?.getAttribute("examples-on-main-page")).toBe("10");

    // Check shadow DOM
    const shadowRoot = sparqlEditor.shadowRoot;
    expect(shadowRoot).not.toBeNull();
    expect(shadowRoot.querySelector("#sparql-editor")).toBeInTheDocument();
    expect(shadowRoot.querySelector("#yasgui")).toBeInTheDocument();

    const button = shadowRoot.querySelector("#sparql-add-prefixes-btn") as HTMLButtonElement;
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent("Add common prefixes");

    // Check YASGUI components. Not working when ran inside GH actions
    // const yasqeEditor = shadowRoot?.querySelectorAll(".yasqe");
    // expect(yasqeEditor?.length).toBe(1);
    // const yasrResult = shadowRoot?.querySelectorAll(".yasr");
    // expect(yasrResult?.length).toBe(1);

    // Check examples pulled successfully
    const examplesOnMainPage = shadowRoot?.querySelectorAll(".main-query-example");
    expect(examplesOnMainPage?.length).toBe(10);

    // @ts-ignore Check the prefixes have been retrieved successfully
    expect(Object.keys(window.Yasr.defaults.prefixes).length).toBeGreaterThan(60);

    // button.click(); // TODO: find a way to check CodeMirror content
  });
});

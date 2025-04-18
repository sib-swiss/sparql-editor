/// <reference types="vitest/config" />
import {defineConfig} from "vite";
import {resolve} from "path";

// https://vitejs.dev/config/
export default defineConfig({
  root: "src",
  base: "/sparql-editor/",
  server: {
    port: 3000,
  },
  build: {
    outDir: "../dist",
    rollupOptions: {
      input: {
        main: resolve(__dirname, "src/index.html"),
        check: resolve(__dirname, "src/check.html"),
        overview: resolve(__dirname, "src/overview.html"),
        bgee: resolve(__dirname, "src/bgee.html"),
        uniprot: resolve(__dirname, "src/uniprot.html"),
        oma: resolve(__dirname, "src/oma.html"),
        metanetx: resolve(__dirname, "src/metanetx.html"),
        rhea: resolve(__dirname, "src/rhea.html"),
        swisslipids: resolve(__dirname, "src/swisslipids.html"),
        hamap: resolve(__dirname, "src/hamap.html"),
        emi: resolve(__dirname, "src/emi.html"),
      },
    },
  },
});

import {defineConfig} from "vite";
import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: 3000,
  },
  build: {
    outDir: "dist",
    target: ["es2015"],
    lib: {
      entry: "src/sparql-editor.ts",
      name: "@swissprot/sparql-editor",
      fileName: "sparql-editor",
    },
    minify: true,
    sourcemap: true,
    cssCodeSplit: true,

    rollupOptions: {
      output: [
        {
          entryFileNames: "[name].js",
          format: "es",
        },
        // UMD is for older systems that don't support ES modules
        {
          entryFileNames: "[name].min.js",
          name: "SparqlEditor",
          format: "umd",
        },
      ],
      plugins: [
        typescript(),
        terser(), // Minify
      ],
      external: [],
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
  },
});

/// <reference types="vitest/config" />
import {defineConfig} from "vite";
import typescript from "@rollup/plugin-typescript";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: 3000,
  },
  build: {
    outDir: "dist",
    target: ["es2015"],
    lib: {
      entry: "src/sparql-metamap.ts",
      name: "@sib-swiss/sparql-metamap",
      fileName: "sparql-metamap",
    },
    sourcemap: true,
    cssCodeSplit: true,
    rollupOptions: {
      plugins: [typescript()],
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
  },
});

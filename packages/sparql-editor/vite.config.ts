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
      entry: "src/sparql-editor.ts",
      name: "@sib-swiss/sparql-editor",
      fileName: "sparql-editor",
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

import { defineConfig } from "vite";
import path from "path";
import wasm from "vite-plugin-wasm";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [wasm(), dts({ bundleTypes: true, tsconfigPath: "./tsconfig.json" })],
  build: {
    lib: {
      entry: {
        index: path.resolve(import.meta.dirname, "src/ts/index.ts"),
        // Apart from the main entry, so the chapters' HTML stays out of client bundles
        reference: path.resolve(import.meta.dirname, "src/ts/reference.ts"),
      },
      name: "MyLibrary",
      fileName: (_format, entryName) => `${entryName}.js`,
      formats: ["es"], // this is important
    },
    minify: false, // for demo purposes
    target: "esnext", // this is important as well
    outDir: "dist",
  },
});

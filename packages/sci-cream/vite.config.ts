import { defineConfig } from "vite";
import path from "path";
import wasm from "vite-plugin-wasm";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [wasm(), dts({ rollupTypes: true, tsconfigPath: "./tsconfig.json" })],
  build: {
    lib: {
      entry: path.resolve(__dirname, "src/ts/index.ts"),
      name: "MyLibrary",
      fileName: "index",
      formats: ["es"], // this is important
    },
    minify: false, // for demo purposes
    target: "esnext", // this is important as well
    outDir: "dist",
  },
});

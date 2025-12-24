import { defineConfig, coverageConfigDefaults } from "vitest/config";

import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

export default defineConfig({
  plugins: [tsconfigPaths(), react(), wasm(), topLevelAwait()],
  test: {
    environment: "jsdom",
    reporters: "verbose",
    coverage: {
      enabled: true,
      include: ["src/ts/**/*.{ts,js}"],
      exclude: [...coverageConfigDefaults.exclude, "*.config.ts", "*.config.mjs"],
    },
  },
});

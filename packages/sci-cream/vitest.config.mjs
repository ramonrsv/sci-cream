import { defineConfig, coverageConfigDefaults } from "vitest/config";

import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "jsdom",
    reporters: "verbose",
    coverage: {
      exclude: [...coverageConfigDefaults.exclude, "*.config.ts", "*.config.mjs"],
    },
  },
});

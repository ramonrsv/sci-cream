import { defineConfig, coverageConfigDefaults, configDefaults } from "vitest/config";

import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "jsdom",
    reporters: "verbose",
    exclude: [
      ...configDefaults.exclude,
      "**/__tests__/e2e/**",
      "**/__tests__/visual/**",
      "**/__benches__/e2e/**",
    ],
    coverage: { exclude: [...coverageConfigDefaults.exclude, "src/db/seed.ts"] },
  },
});

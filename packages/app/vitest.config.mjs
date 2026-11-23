import { defineConfig, coverageConfigDefaults, configDefaults } from "vitest/config";

import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  css: { postcss: {} },
  test: {
    environment: "jsdom",
    reporters: "verbose",
    setupFiles: ["./vitest.setup.ts"],
    exclude: [
      ...configDefaults.exclude,
      "**/__tests__/e2e/**",
      "**/__tests__/visual/**",
      "**/__benches__/e2e/**",
      "dist/**",
      "docs/**",
    ],
    coverage: {
      exclude: [
        ...coverageConfigDefaults.exclude,
        "**/__tests__/**",
        "**/__benches__/**",
        "scripts/seed.ts",
      ],
    },
  },
});

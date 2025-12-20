- After bf248ca (Introduce `MixPropertiesChart`, using chart.j), there is an issue where stderr logs
  are generated from tests, even though they produce no failures. For now, This is being silenced
  with `vitest run --silent`, but it should be further investigated.
- There is a `@ts-ignore` in `packages/sci-cream/vite.config.ts` for a `'vite-plugin-wasm'`. This
  needs to be further investigated, resolved, and the `@ts-ignore` removed.

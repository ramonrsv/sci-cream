window.BENCHMARK_DATA = {
  "lastUpdate": 1768442485140,
  "repoUrl": "https://github.com/ramonrsv/sci-cream",
  "entries": {
    "sci-cream Rust benchmarks": [
      {
        "commit": {
          "author": {
            "email": "ramon@sibello.ca",
            "name": "Ramon Sibello",
            "username": "ramonrsv"
          },
          "committer": {
            "email": "ramon@sibello.ca",
            "name": "Ramon Sibello",
            "username": "ramonrsv"
          },
          "distinct": true,
          "id": "2767da249f2159600b222f1e745b0330b0fbf6c4",
          "message": "Give benchmark CI jobs write permission to repo",
          "timestamp": "2026-01-14T02:15:00-05:00",
          "tree_id": "b11067bb2b3601e9587b2dda86de2af943b1874d",
          "url": "https://github.com/ramonrsv/sci-cream/commit/2767da249f2159600b222f1e745b0330b0fbf6c4"
        },
        "date": 1768374997218,
        "tool": "cargo",
        "benches": [
          {
            "name": "sweetener_spec_into_composition",
            "value": 314,
            "range": "± 11",
            "unit": "ns/iter"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "ramon@sibello.ca",
            "name": "Ramon Sibello",
            "username": "ramonrsv"
          },
          "committer": {
            "email": "ramon@sibello.ca",
            "name": "Ramon Sibello",
            "username": "ramonrsv"
          },
          "distinct": true,
          "id": "960a5b3cbdf2aeaf01676e3213c0f120d2567ba6",
          "message": "Make WASM/JS prerequisites an explicit step\n\nRunning JS tests or benchmarks in sci-cream requires that we first run\n`build:wasm` and `build:js`. These were implicitly run first in all the\n`test:js`, `coverage:js`, `benchmark:js`, etc. scripts. This could\nresult in the prerequisite build steps unnecessarily running multiple\ntimes when running multiple jobs. Now it is an explicit step that must\nbe run before any of those other jobs.\n\nRunning any `app` scripts requires that we first run `build:wasm` and\n`build:js` on the sci-cream crate. That is now encapsulated in a\n`prerequisites` script.\n\nCI now explicitly runs the `prerequisites(:js)` script as needed.",
          "timestamp": "2026-01-14T20:48:19-05:00",
          "tree_id": "4077ea7c5cd328718147c04adb9e88514dbd176e",
          "url": "https://github.com/ramonrsv/sci-cream/commit/960a5b3cbdf2aeaf01676e3213c0f120d2567ba6"
        },
        "date": 1768442484853,
        "tool": "cargo",
        "benches": [
          {
            "name": "sweetener_spec_into_composition",
            "value": 308,
            "range": "± 2",
            "unit": "ns/iter"
          }
        ]
      }
    ],
    "sci-cream JS benchmarks": [
      {
        "commit": {
          "author": {
            "email": "ramon@sibello.ca",
            "name": "Ramon Sibello",
            "username": "ramonrsv"
          },
          "committer": {
            "email": "ramon@sibello.ca",
            "name": "Ramon Sibello",
            "username": "ramonrsv"
          },
          "distinct": true,
          "id": "2767da249f2159600b222f1e745b0330b0fbf6c4",
          "message": "Give benchmark CI jobs write permission to repo",
          "timestamp": "2026-01-14T02:15:00-05:00",
          "tree_id": "b11067bb2b3601e9587b2dda86de2af943b1874d",
          "url": "https://github.com/ramonrsv/sci-cream/commit/2767da249f2159600b222f1e745b0330b0fbf6c4"
        },
        "date": 1768375054852,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "Find by name, first",
            "value": 87687213,
            "range": "±3.06%",
            "unit": "ops/sec",
            "extra": "84 samples"
          },
          {
            "name": "Find by name, last",
            "value": 1819594,
            "range": "±0.25%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "Map to names",
            "value": 1807377,
            "range": "±0.37%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Dark Rum)",
            "value": 47311,
            "range": "±21.97%",
            "unit": "ops/sec",
            "extra": "22 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Whey Isolate)",
            "value": 19277,
            "range": "±4.86%",
            "unit": "ops/sec",
            "extra": "48 samples"
          },
          {
            "name": "into_ingredient_from_spec, multiple",
            "value": 2692,
            "range": "±7.98%",
            "unit": "ops/sec",
            "extra": "21 samples"
          }
        ]
      }
    ]
  }
}
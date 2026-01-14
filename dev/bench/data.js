window.BENCHMARK_DATA = {
  "lastUpdate": 1768375055656,
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
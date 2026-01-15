window.BENCHMARK_DATA = {
  "lastUpdate": 1768454683807,
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
          "id": "2edd6f53dd35520427e9c6a2273c2e1b37478d96",
          "message": "Add benchmarks for the Recipe JS <-> WASM bridge\n\n* These benchmark suite investigates the relative performance of\n  different ways of creating Recipe and RecipeLine instances to bridge\n  between JS and WASM.\n\n* A _VERY IMPORTANT_ finding from these benchmarks is that creating many\n  WASM objects without freeing them can lead to significant performance\n  degracation, hypothesized to be due to accumulation in WASM's linear\n  memory. Careful management of usage pattern and freeing is crucial.\n\n* The benchmarks show that creating new RecipeLine instances from\n  scratch is generally faster (up to ~10x) than cloning existing ones,\n  likely due to the overhead of more JS <-> WASM crossings in the\n  cloning process.\n\n* Using an existing Recipe instance is significantly faster (up to ~10x)\n  than the fastest method of creating a new one from RecipeLines.",
          "timestamp": "2026-01-14T23:25:55-05:00",
          "tree_id": "6ed528bdb334a132e83316a1bd622887ce9ba218",
          "url": "https://github.com/ramonrsv/sci-cream/commit/2edd6f53dd35520427e9c6a2273c2e1b37478d96"
        },
        "date": 1768451496829,
        "tool": "cargo",
        "benches": [
          {
            "name": "sweetener_spec_into_composition",
            "value": 316,
            "range": "± 6",
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
          "id": "a92fbb515974a696d2809a961dbc2b0c8e1e5025",
          "message": "Uncomment accidentally commented out benchmarks",
          "timestamp": "2026-01-14T23:58:26-05:00",
          "tree_id": "6073d78d21b5fc989622e7023d905acaa36f159c",
          "url": "https://github.com/ramonrsv/sci-cream/commit/a92fbb515974a696d2809a961dbc2b0c8e1e5025"
        },
        "date": 1768453555131,
        "tool": "cargo",
        "benches": [
          {
            "name": "sweetener_spec_into_composition",
            "value": 274,
            "range": "± 12",
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
          "id": "9d054f6a74a1986f38df80fa2579c41965c6bcef",
          "message": "Use was_bindgen(js_name ..) to remove _wasm suffix",
          "timestamp": "2026-01-15T00:07:47-05:00",
          "tree_id": "f90c756b4781eed77cfd028dc9e84e90a0b25555",
          "url": "https://github.com/ramonrsv/sci-cream/commit/9d054f6a74a1986f38df80fa2579c41965c6bcef"
        },
        "date": 1768454546035,
        "tool": "cargo",
        "benches": [
          {
            "name": "sweetener_spec_into_composition",
            "value": 314,
            "range": "± 8",
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
        "date": 1768442533967,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "Find by name, first",
            "value": 96851633,
            "range": "±3.81%",
            "unit": "ops/sec",
            "extra": "85 samples"
          },
          {
            "name": "Find by name, last",
            "value": 2111121,
            "range": "±0.43%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "Map to names",
            "value": 1974150,
            "range": "±0.34%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Dark Rum)",
            "value": 57518,
            "range": "±15.63%",
            "unit": "ops/sec",
            "extra": "25 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Whey Isolate)",
            "value": 23338,
            "range": "±6.90%",
            "unit": "ops/sec",
            "extra": "39 samples"
          },
          {
            "name": "into_ingredient_from_spec, multiple",
            "value": 3451,
            "range": "±5.99%",
            "unit": "ops/sec",
            "extra": "32 samples"
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
          "id": "2edd6f53dd35520427e9c6a2273c2e1b37478d96",
          "message": "Add benchmarks for the Recipe JS <-> WASM bridge\n\n* These benchmark suite investigates the relative performance of\n  different ways of creating Recipe and RecipeLine instances to bridge\n  between JS and WASM.\n\n* A _VERY IMPORTANT_ finding from these benchmarks is that creating many\n  WASM objects without freeing them can lead to significant performance\n  degracation, hypothesized to be due to accumulation in WASM's linear\n  memory. Careful management of usage pattern and freeing is crucial.\n\n* The benchmarks show that creating new RecipeLine instances from\n  scratch is generally faster (up to ~10x) than cloning existing ones,\n  likely due to the overhead of more JS <-> WASM crossings in the\n  cloning process.\n\n* Using an existing Recipe instance is significantly faster (up to ~10x)\n  than the fastest method of creating a new one from RecipeLines.",
          "timestamp": "2026-01-14T23:25:55-05:00",
          "tree_id": "6ed528bdb334a132e83316a1bd622887ce9ba218",
          "url": "https://github.com/ramonrsv/sci-cream/commit/2edd6f53dd35520427e9c6a2273c2e1b37478d96"
        },
        "date": 1768451524509,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "into_ingredient_from_spec, single (Dark Rum)",
            "value": 308272,
            "range": "±0.51%",
            "unit": "ops/sec",
            "extra": "87 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Whey Isolate)",
            "value": 110262,
            "range": "±0.47%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec, multiple",
            "value": 33307,
            "range": "±0.36%",
            "unit": "ops/sec",
            "extra": "94 samples"
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
          "id": "a92fbb515974a696d2809a961dbc2b0c8e1e5025",
          "message": "Uncomment accidentally commented out benchmarks",
          "timestamp": "2026-01-14T23:58:26-05:00",
          "tree_id": "6073d78d21b5fc989622e7023d905acaa36f159c",
          "url": "https://github.com/ramonrsv/sci-cream/commit/a92fbb515974a696d2809a961dbc2b0c8e1e5025"
        },
        "date": 1768453682168,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "Find by name, first",
            "value": 85983431,
            "range": "±3.64%",
            "unit": "ops/sec",
            "extra": "85 samples"
          },
          {
            "name": "Find by name, last",
            "value": 1836978,
            "range": "±0.19%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "Map to names",
            "value": 1872587,
            "range": "±0.55%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Dark Rum)",
            "value": 310327,
            "range": "±0.62%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Whey Isolate)",
            "value": 111230,
            "range": "±0.32%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "into_ingredient_from_spec, multiple",
            "value": 33544,
            "range": "±0.40%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "makeRecipeLines",
            "value": 20761,
            "range": "±0.49%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "cloneRecipeLines",
            "value": 5968,
            "range": "±33.39%",
            "unit": "ops/sec",
            "extra": "15 samples"
          },
          {
            "name": "makeRecipeFromMadeLines",
            "value": 18780,
            "range": "±0.52%",
            "unit": "ops/sec",
            "extra": "89 samples"
          },
          {
            "name": "makeRecipeFromClonedLines",
            "value": 2224,
            "range": "±8.91%",
            "unit": "ops/sec",
            "extra": "27 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_composition_wasm",
            "value": 16810,
            "range": "±5.88%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_composition_wasm",
            "value": 1391,
            "range": "±14.68%",
            "unit": "ops/sec",
            "extra": "16 samples"
          },
          {
            "name": "recipe.calculate_composition_wasm",
            "value": 205074,
            "range": "±7.98%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_mix_properties_wasm",
            "value": 14363,
            "range": "±1.57%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_mix_properties_wasm",
            "value": 1177,
            "range": "±10.11%",
            "unit": "ops/sec",
            "extra": "10 samples"
          },
          {
            "name": "recipe.calculate_mix_properties_wasm",
            "value": 60345,
            "range": "±0.18%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "makeRecipeLines",
            "value": 20263,
            "range": "±1.64%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "cloneRecipeLines",
            "value": 1157,
            "range": "±3.51%",
            "unit": "ops/sec",
            "extra": "7 samples"
          },
          {
            "name": "makeRecipeLines, no free",
            "value": 701,
            "range": "±7.03%",
            "unit": "ops/sec",
            "extra": "16 samples"
          },
          {
            "name": "cloneRecipeLines, no free",
            "value": 97.12,
            "range": "±206.24%",
            "unit": "ops/sec",
            "extra": "9 samples"
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
          "id": "9d054f6a74a1986f38df80fa2579c41965c6bcef",
          "message": "Use was_bindgen(js_name ..) to remove _wasm suffix",
          "timestamp": "2026-01-15T00:07:47-05:00",
          "tree_id": "f90c756b4781eed77cfd028dc9e84e90a0b25555",
          "url": "https://github.com/ramonrsv/sci-cream/commit/9d054f6a74a1986f38df80fa2579c41965c6bcef"
        },
        "date": 1768454683551,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "Find by name, first",
            "value": 86379861,
            "range": "±3.51%",
            "unit": "ops/sec",
            "extra": "81 samples"
          },
          {
            "name": "Find by name, last",
            "value": 1823067,
            "range": "±0.38%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "Map to names",
            "value": 1810312,
            "range": "±0.41%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Dark Rum)",
            "value": 313720,
            "range": "±0.45%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Whey Isolate)",
            "value": 112416,
            "range": "±0.39%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "into_ingredient_from_spec, multiple",
            "value": 33585,
            "range": "±0.40%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "makeRecipeLines",
            "value": 20976,
            "range": "±0.62%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "cloneRecipeLines",
            "value": 5119,
            "range": "±34.99%",
            "unit": "ops/sec",
            "extra": "13 samples"
          },
          {
            "name": "makeRecipeFromMadeLines",
            "value": 18920,
            "range": "±2.04%",
            "unit": "ops/sec",
            "extra": "86 samples"
          },
          {
            "name": "makeRecipeFromClonedLines",
            "value": 1737,
            "range": "±10.12%",
            "unit": "ops/sec",
            "extra": "40 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_composition",
            "value": 17417,
            "range": "±5.32%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_composition",
            "value": 1431,
            "range": "±7.00%",
            "unit": "ops/sec",
            "extra": "16 samples"
          },
          {
            "name": "recipe.calculate_composition",
            "value": 210231,
            "range": "±6.92%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_mix_properties",
            "value": 14468,
            "range": "±0.71%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_mix_properties",
            "value": 1153,
            "range": "±9.01%",
            "unit": "ops/sec",
            "extra": "14 samples"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 60701,
            "range": "±0.18%",
            "unit": "ops/sec",
            "extra": "98 samples"
          },
          {
            "name": "makeRecipeLines",
            "value": 20453,
            "range": "±2.94%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "cloneRecipeLines",
            "value": 1168,
            "range": "±9.57%",
            "unit": "ops/sec",
            "extra": "7 samples"
          },
          {
            "name": "makeRecipeLines, no free",
            "value": 763,
            "range": "±9.15%",
            "unit": "ops/sec",
            "extra": "20 samples"
          },
          {
            "name": "cloneRecipeLines, no free",
            "value": 986,
            "range": "±5.38%",
            "unit": "ops/sec",
            "extra": "9 samples"
          }
        ]
      }
    ]
  }
}
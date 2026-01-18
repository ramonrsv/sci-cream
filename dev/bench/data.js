window.BENCHMARK_DATA = {
  "lastUpdate": 1768714385652,
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
          "id": "f307b6acf1b18b5edb447defd1af7fb5af14c4bd",
          "message": "Introduce 'data' feature to embed ingredient specs\n\n* Make `src/tests/data.rs` public as `src/data.rs`, guarded by the\n  'data' feature, to enable embedding ingredient specs data into the\n  library, without the need for an external database.\n\n* This module is also always enabled for tests, which use and verify the\n  ingredient spec data assets.\n\n* If 'data' feature is enabled, the content of the data files under\n  `/data` are embedded into the library code at compile time; they are\n  no longer read from file at runtime. This simplifies deployment,\n  probably speeds things up, and allows this feature to be enabled on\n  WASM targets. These text files are currently ~28KB total, and will\n  grow at most a few times that, so there should be no bin size issues.\n\n* If both 'wasm' and 'data' features are enabled (the new default in\n  package.json), then expose `get_ingredient_spec*` function in WASM.\n\n* Move `findIngredentSpecByName` from `benches/ts/util.ts` to\n  `src/ts/ingredients.ts`.",
          "timestamp": "2026-01-15T16:33:16-05:00",
          "tree_id": "0ab8e300a8cf5348310a986341933c7e902669f9",
          "url": "https://github.com/ramonrsv/sci-cream/commit/f307b6acf1b18b5edb447defd1af7fb5af14c4bd"
        },
        "date": 1768515776414,
        "tool": "cargo",
        "benches": [
          {
            "name": "sweetener_spec_into_composition",
            "value": 304,
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
          "id": "09096735ca189d4a59a2b1050f9812620e33f469",
          "message": "Group all Rust benchmarks in benches/benchmarks.rs\n\nDisable `autobenches` and make all benchmarks modules of a single\n`benchmarks.rs` file where `criterion_main! { ... }` lives, and import\nindividual `benches` groups from each submodule.\n\nThis makes it easier to define new benchmarks, reduces repetition of\n`#![allow(...)]` directives, and produces a cleaner terminal output.",
          "timestamp": "2026-01-15T18:37:54-05:00",
          "tree_id": "5923fbc699d305a8e5d5f141a6615664ba946fbf",
          "url": "https://github.com/ramonrsv/sci-cream/commit/09096735ca189d4a59a2b1050f9812620e33f469"
        },
        "date": 1768521113501,
        "tool": "cargo",
        "benches": [
          {
            "name": "calculate_composition",
            "value": 2528,
            "range": "± 42",
            "unit": "ns/iter"
          },
          {
            "name": "calculate_mix_properties",
            "value": 161182,
            "range": "± 1416",
            "unit": "ns/iter"
          },
          {
            "name": "sweetener_spec_into_composition",
            "value": 307,
            "range": "± 3",
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
          "id": "1820d2c0ad04f0ebada4d043a62215ec5a839d18",
          "message": "Use `set -o pipefail` to catch benchmark errors\n\nWhen running bencharmks in the CI workflow, their output is piped to\n`tee`. Because of that, the return code of the command is tee's, not the\nbenchmarks, so if the benchmark fails it is not caught by the CI\nframework. With `set -o pipefail` we actually get the benchmark's return\ncode if it's non-zero, and the CI framework catches failures again.\n\nFix breakage by calling the new `bench:js` instead of `benchmarks:js`.",
          "timestamp": "2026-01-15T19:02:52-05:00",
          "tree_id": "09a46601ec442c8c5cb8006aba435ee1a30dd907",
          "url": "https://github.com/ramonrsv/sci-cream/commit/1820d2c0ad04f0ebada4d043a62215ec5a839d18"
        },
        "date": 1768522515457,
        "tool": "cargo",
        "benches": [
          {
            "name": "calculate_composition",
            "value": 2606,
            "range": "± 25",
            "unit": "ns/iter"
          },
          {
            "name": "calculate_mix_properties",
            "value": 187820,
            "range": "± 3272",
            "unit": "ns/iter"
          },
          {
            "name": "sweetener_spec_into_composition",
            "value": 367,
            "range": "± 5",
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
          "id": "4d3454f65010ece25960a1f6f502e89e85465ca1",
          "message": "Add 'free' suffix to FreeVsNoFree to make unique\n\nAdd ', free' to the name of some benchmarks in the 'Free vs No-Free'\nsuite in recipe-wasm-bridge.bench.ts, in order to make all the names\nunique, otherwise there are github-action-benchmark report conflicts.",
          "timestamp": "2026-01-15T19:19:26-05:00",
          "tree_id": "76c4f2d9e30f28a6931656ffef310a619ddef7f5",
          "url": "https://github.com/ramonrsv/sci-cream/commit/4d3454f65010ece25960a1f6f502e89e85465ca1"
        },
        "date": 1768523004148,
        "tool": "cargo",
        "benches": [
          {
            "name": "calculate_composition",
            "value": 2306,
            "range": "± 24",
            "unit": "ns/iter"
          },
          {
            "name": "calculate_mix_properties",
            "value": 162142,
            "range": "± 2537",
            "unit": "ns/iter"
          },
          {
            "name": "sweetener_spec_into_composition",
            "value": 307,
            "range": "± 3",
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
          "id": "cd5151e914febaf4ac503852d34fffa13161420d",
          "message": "Implement `IngredientDatabase`, with WASM support\n\n* Introduce `IngredientDatabase` to support in-memory ingredient\n  database functionality. Since ingredient objects are lightweight,\n  in most use cases keeping many or all of them in memory should not\n  be an issue. Holding them in this `IngredientDatabase` greatly\n  simplifies the setup and process of looking up ingredient\n  definitions, obviating the need for lookups from an external\n  database. It should also provide performance improvements. Lastly,\n  and the primary motivation behind this class, it's supported in\n  WASM, where it can provide significant performance improvements\n  if ingredient lookup is done on the WASM side, compared to managing\n  ingredient definitions and lookup on the JS side and bridging them\n  to WASM when requesting operations; JS <-> WASM bridging is very\n  slow, so it's almost always more performant to keep as much as\n  possible on the WASM side. It's still possible to seed the database\n  from the JS side, then subsequent looks can be done within WASM.\n\n* Add benchmarks to compare the different methods of looking up and\n  creating Ingredients on the JS side, including using specs and\n  `into_ingredient_from_sepc`, and with an `IngredientDatabase`.\n\n* Rename exported `allIngredients` to `allIngredientSpecs`",
          "timestamp": "2026-01-16T18:00:37-05:00",
          "tree_id": "9673d7d36d7687c462c38780c32d69740bbbfb83",
          "url": "https://github.com/ramonrsv/sci-cream/commit/cd5151e914febaf4ac503852d34fffa13161420d"
        },
        "date": 1768605020227,
        "tool": "cargo",
        "benches": [
          {
            "name": "calculate_composition",
            "value": 2466,
            "range": "± 35",
            "unit": "ns/iter"
          },
          {
            "name": "calculate_mix_properties",
            "value": 172760,
            "range": "± 5711",
            "unit": "ns/iter"
          },
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
          "id": "f6c34901012bcb64d447f66d2261802a2344f1a9",
          "message": "Implement `wasm::Bridge` to provide WASM bridging\n\nThis struct serves as a bridge between WASM and the Rust backend,\nattempting to keep as much of the on-memory data structures and\noperations on the WASM side to minimize the performance overhead of\nJS <-> WASM bridging. It holds an in-memory ingredient database for\nlooking up ingredient definitions by name, and provides methods for\ncalculating recipe compositions and mix properties from \"light\" recipe\nrepresentations (tuples of ingredient names and amounts).",
          "timestamp": "2026-01-16T19:07:59-05:00",
          "tree_id": "2f919322989afb38e00fb4fa65acf3e34c67c2fb",
          "url": "https://github.com/ramonrsv/sci-cream/commit/f6c34901012bcb64d447f66d2261802a2344f1a9"
        },
        "date": 1768609016788,
        "tool": "cargo",
        "benches": [
          {
            "name": "calculate_composition",
            "value": 2429,
            "range": "± 35",
            "unit": "ns/iter"
          },
          {
            "name": "calculate_mix_properties",
            "value": 163966,
            "range": "± 1218",
            "unit": "ns/iter"
          },
          {
            "name": "sweetener_spec_into_composition",
            "value": 308,
            "range": "± 5",
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
          "id": "473f25ee6129e1f77dcedf6d4b90c30dc3475bb9",
          "message": "Add get_ingredient* to Bridge, forwards to IngDb\n\n* Add the same `get_ingredient*` family of functions interface that\n  `IngredientDatabase` has to `Bridge`, forwarding to the internal\n  database. We cannot expose the `db` field directly because that would\n  require `wasm_bindgen(getter_with_clone)`.\n\n* Add benchmarks to check that there is no performance degradation to\n  the database operation by going through `Bridge`.",
          "timestamp": "2026-01-16T20:57:45-05:00",
          "tree_id": "ec7b998e73cacf98da873fbc902c6c3fa8738040",
          "url": "https://github.com/ramonrsv/sci-cream/commit/473f25ee6129e1f77dcedf6d4b90c30dc3475bb9"
        },
        "date": 1768616634933,
        "tool": "cargo",
        "benches": [
          {
            "name": "calculate_composition",
            "value": 2305,
            "range": "± 57",
            "unit": "ns/iter"
          },
          {
            "name": "calculate_mix_properties",
            "value": 162444,
            "range": "± 3801",
            "unit": "ns/iter"
          },
          {
            "name": "sweetener_spec_into_composition",
            "value": 303,
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
          "id": "344fa5d1c114fc27e6a5ed8a47dd0bc16aea5f88",
          "message": "Add TODO about unresponsive UI when many clicks",
          "timestamp": "2026-01-16T21:32:42-05:00",
          "tree_id": "548e8e2cf446065194b8c9db9705c216244674f9",
          "url": "https://github.com/ramonrsv/sci-cream/commit/344fa5d1c114fc27e6a5ed8a47dd0bc16aea5f88"
        },
        "date": 1768686239792,
        "tool": "cargo",
        "benches": [
          {
            "name": "calculate_composition",
            "value": 2341,
            "range": "± 44",
            "unit": "ns/iter"
          },
          {
            "name": "calculate_mix_properties",
            "value": 161729,
            "range": "± 943",
            "unit": "ns/iter"
          },
          {
            "name": "sweetener_spec_into_composition",
            "value": 315,
            "range": "± 1",
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
          "id": "901942106cb68e68138f491cfb4f445e637e47cd",
          "message": "Implement doBenchmarkMeasurements to do many runs",
          "timestamp": "2026-01-18T00:18:44-05:00",
          "tree_id": "f19e3d0c2607b46d22e942eb164066d5f0392eca",
          "url": "https://github.com/ramonrsv/sci-cream/commit/901942106cb68e68138f491cfb4f445e637e47cd"
        },
        "date": 1768714385234,
        "tool": "cargo",
        "benches": [
          {
            "name": "calculate_composition",
            "value": 2500,
            "range": "± 70",
            "unit": "ns/iter"
          },
          {
            "name": "calculate_mix_properties",
            "value": 162727,
            "range": "± 1564",
            "unit": "ns/iter"
          },
          {
            "name": "sweetener_spec_into_composition",
            "value": 307,
            "range": "± 3",
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
          "id": "f307b6acf1b18b5edb447defd1af7fb5af14c4bd",
          "message": "Introduce 'data' feature to embed ingredient specs\n\n* Make `src/tests/data.rs` public as `src/data.rs`, guarded by the\n  'data' feature, to enable embedding ingredient specs data into the\n  library, without the need for an external database.\n\n* This module is also always enabled for tests, which use and verify the\n  ingredient spec data assets.\n\n* If 'data' feature is enabled, the content of the data files under\n  `/data` are embedded into the library code at compile time; they are\n  no longer read from file at runtime. This simplifies deployment,\n  probably speeds things up, and allows this feature to be enabled on\n  WASM targets. These text files are currently ~28KB total, and will\n  grow at most a few times that, so there should be no bin size issues.\n\n* If both 'wasm' and 'data' features are enabled (the new default in\n  package.json), then expose `get_ingredient_spec*` function in WASM.\n\n* Move `findIngredentSpecByName` from `benches/ts/util.ts` to\n  `src/ts/ingredients.ts`.",
          "timestamp": "2026-01-15T16:33:16-05:00",
          "tree_id": "0ab8e300a8cf5348310a986341933c7e902669f9",
          "url": "https://github.com/ramonrsv/sci-cream/commit/f307b6acf1b18b5edb447defd1af7fb5af14c4bd"
        },
        "date": 1768515915482,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "Find by name, first",
            "value": 83961594,
            "range": "±3.69%",
            "unit": "ops/sec",
            "extra": "82 samples"
          },
          {
            "name": "Find by name, last",
            "value": 1684542,
            "range": "±0.79%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "Map to names",
            "value": 1804680,
            "range": "±0.43%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Dark Rum)",
            "value": 297674,
            "range": "±0.47%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Whey Isolate)",
            "value": 104354,
            "range": "±0.33%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "into_ingredient_from_spec, multiple",
            "value": 31845,
            "range": "±0.36%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "makeRecipeLines",
            "value": 19702,
            "range": "±0.60%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "cloneRecipeLines",
            "value": 5403,
            "range": "±39.26%",
            "unit": "ops/sec",
            "extra": "12 samples"
          },
          {
            "name": "makeRecipeFromMadeLines",
            "value": 18060,
            "range": "±1.03%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "makeRecipeFromClonedLines",
            "value": 2219,
            "range": "±10.55%",
            "unit": "ops/sec",
            "extra": "28 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_composition",
            "value": 16960,
            "range": "±5.75%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_composition",
            "value": 1645,
            "range": "±11.51%",
            "unit": "ops/sec",
            "extra": "10 samples"
          },
          {
            "name": "recipe.calculate_composition",
            "value": 218263,
            "range": "±0.27%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_mix_properties",
            "value": 13402,
            "range": "±1.04%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_mix_properties",
            "value": 1040,
            "range": "±11.00%",
            "unit": "ops/sec",
            "extra": "10 samples"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 50914,
            "range": "±2.05%",
            "unit": "ops/sec",
            "extra": "98 samples"
          },
          {
            "name": "makeRecipeLines",
            "value": 19573,
            "range": "±1.10%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "cloneRecipeLines",
            "value": 1285,
            "range": "±8.88%",
            "unit": "ops/sec",
            "extra": "7 samples"
          },
          {
            "name": "makeRecipeLines, no free",
            "value": 799,
            "range": "±10.35%",
            "unit": "ops/sec",
            "extra": "19 samples"
          },
          {
            "name": "cloneRecipeLines, no free",
            "value": 976,
            "range": "±13.38%",
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
          "id": "1820d2c0ad04f0ebada4d043a62215ec5a839d18",
          "message": "Use `set -o pipefail` to catch benchmark errors\n\nWhen running bencharmks in the CI workflow, their output is piped to\n`tee`. Because of that, the return code of the command is tee's, not the\nbenchmarks, so if the benchmark fails it is not caught by the CI\nframework. With `set -o pipefail` we actually get the benchmark's return\ncode if it's non-zero, and the CI framework catches failures again.\n\nFix breakage by calling the new `bench:js` instead of `benchmarks:js`.",
          "timestamp": "2026-01-15T19:02:52-05:00",
          "tree_id": "09a46601ec442c8c5cb8006aba435ee1a30dd907",
          "url": "https://github.com/ramonrsv/sci-cream/commit/1820d2c0ad04f0ebada4d043a62215ec5a839d18"
        },
        "date": 1768522628558,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "allIngredients.find, first",
            "value": 88576190,
            "range": "±3.41%",
            "unit": "ops/sec",
            "extra": "85 samples"
          },
          {
            "name": "allIngredients.find, last",
            "value": 1596844,
            "range": "±0.45%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "getIngredientSpecByName, first",
            "value": 74775286,
            "range": "±3.92%",
            "unit": "ops/sec",
            "extra": "80 samples"
          },
          {
            "name": "getIngredientSpecByName, last",
            "value": 1816880,
            "range": "±0.35%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, first",
            "value": 545932,
            "range": "±0.58%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, last",
            "value": 513546,
            "range": "±0.62%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Dark Rum)",
            "value": 291814,
            "range": "±0.63%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Whey Isolate)",
            "value": 105730,
            "range": "±0.42%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "into_ingredient_from_spec, multiple",
            "value": 31729,
            "range": "±0.21%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "makeRecipeLines",
            "value": 20036,
            "range": "±0.39%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "cloneRecipeLines",
            "value": 5316,
            "range": "±39.11%",
            "unit": "ops/sec",
            "extra": "13 samples"
          },
          {
            "name": "makeRecipeFromMadeLines",
            "value": 18263,
            "range": "±1.61%",
            "unit": "ops/sec",
            "extra": "87 samples"
          },
          {
            "name": "makeRecipeFromClonedLines",
            "value": 2036,
            "range": "±10.70%",
            "unit": "ops/sec",
            "extra": "14 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_composition",
            "value": 16195,
            "range": "±7.23%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_composition",
            "value": 1543,
            "range": "±6.20%",
            "unit": "ops/sec",
            "extra": "16 samples"
          },
          {
            "name": "recipe.calculate_composition",
            "value": 195599,
            "range": "±7.45%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_mix_properties",
            "value": 13422,
            "range": "±1.57%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_mix_properties",
            "value": 1069,
            "range": "±8.21%",
            "unit": "ops/sec",
            "extra": "10 samples"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 49247,
            "range": "±1.68%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "makeRecipeLines",
            "value": 20023,
            "range": "±0.25%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "cloneRecipeLines",
            "value": 1190,
            "range": "±6.64%",
            "unit": "ops/sec",
            "extra": "9 samples"
          },
          {
            "name": "makeRecipeLines, no free",
            "value": 790,
            "range": "±9.48%",
            "unit": "ops/sec",
            "extra": "17 samples"
          },
          {
            "name": "cloneRecipeLines, no free",
            "value": 1056,
            "range": "±11.11%",
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
          "id": "4d3454f65010ece25960a1f6f502e89e85465ca1",
          "message": "Add 'free' suffix to FreeVsNoFree to make unique\n\nAdd ', free' to the name of some benchmarks in the 'Free vs No-Free'\nsuite in recipe-wasm-bridge.bench.ts, in order to make all the names\nunique, otherwise there are github-action-benchmark report conflicts.",
          "timestamp": "2026-01-15T19:19:26-05:00",
          "tree_id": "76c4f2d9e30f28a6931656ffef310a619ddef7f5",
          "url": "https://github.com/ramonrsv/sci-cream/commit/4d3454f65010ece25960a1f6f502e89e85465ca1"
        },
        "date": 1768523124448,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "allIngredients.find, first",
            "value": 87076970,
            "range": "±3.10%",
            "unit": "ops/sec",
            "extra": "86 samples"
          },
          {
            "name": "allIngredients.find, last",
            "value": 1584347,
            "range": "±0.20%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "getIngredientSpecByName, first",
            "value": 77820619,
            "range": "±2.74%",
            "unit": "ops/sec",
            "extra": "87 samples"
          },
          {
            "name": "getIngredientSpecByName, last",
            "value": 1805872,
            "range": "±0.32%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, first",
            "value": 561729,
            "range": "±0.58%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, last",
            "value": 512447,
            "range": "±0.58%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Dark Rum)",
            "value": 302086,
            "range": "±0.65%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Whey Isolate)",
            "value": 108036,
            "range": "±0.40%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "into_ingredient_from_spec, multiple",
            "value": 32412,
            "range": "±0.38%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "makeRecipeLines",
            "value": 20197,
            "range": "±0.41%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "cloneRecipeLines",
            "value": 4870,
            "range": "±41.34%",
            "unit": "ops/sec",
            "extra": "11 samples"
          },
          {
            "name": "makeRecipeFromMadeLines",
            "value": 18312,
            "range": "±1.34%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "makeRecipeFromClonedLines",
            "value": 1562,
            "range": "±9.81%",
            "unit": "ops/sec",
            "extra": "43 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_composition",
            "value": 16956,
            "range": "±5.10%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_composition",
            "value": 1470,
            "range": "±6.36%",
            "unit": "ops/sec",
            "extra": "10 samples"
          },
          {
            "name": "recipe.calculate_composition",
            "value": 214217,
            "range": "±1.73%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_mix_properties",
            "value": 13193,
            "range": "±1.44%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_mix_properties",
            "value": 1051,
            "range": "±10.36%",
            "unit": "ops/sec",
            "extra": "10 samples"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 49860,
            "range": "±1.68%",
            "unit": "ops/sec",
            "extra": "99 samples"
          },
          {
            "name": "makeRecipeLines, free",
            "value": 19410,
            "range": "±2.01%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "cloneRecipeLines, free",
            "value": 1177,
            "range": "±10.67%",
            "unit": "ops/sec",
            "extra": "11 samples"
          },
          {
            "name": "makeRecipeLines, no free",
            "value": 758,
            "range": "±7.82%",
            "unit": "ops/sec",
            "extra": "20 samples"
          },
          {
            "name": "cloneRecipeLines, no free",
            "value": 1044,
            "range": "±9.33%",
            "unit": "ops/sec",
            "extra": "12 samples"
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
          "id": "cd5151e914febaf4ac503852d34fffa13161420d",
          "message": "Implement `IngredientDatabase`, with WASM support\n\n* Introduce `IngredientDatabase` to support in-memory ingredient\n  database functionality. Since ingredient objects are lightweight,\n  in most use cases keeping many or all of them in memory should not\n  be an issue. Holding them in this `IngredientDatabase` greatly\n  simplifies the setup and process of looking up ingredient\n  definitions, obviating the need for lookups from an external\n  database. It should also provide performance improvements. Lastly,\n  and the primary motivation behind this class, it's supported in\n  WASM, where it can provide significant performance improvements\n  if ingredient lookup is done on the WASM side, compared to managing\n  ingredient definitions and lookup on the JS side and bridging them\n  to WASM when requesting operations; JS <-> WASM bridging is very\n  slow, so it's almost always more performant to keep as much as\n  possible on the WASM side. It's still possible to seed the database\n  from the JS side, then subsequent looks can be done within WASM.\n\n* Add benchmarks to compare the different methods of looking up and\n  creating Ingredients on the JS side, including using specs and\n  `into_ingredient_from_sepc`, and with an `IngredientDatabase`.\n\n* Rename exported `allIngredients` to `allIngredientSpecs`",
          "timestamp": "2026-01-16T18:00:37-05:00",
          "tree_id": "9673d7d36d7687c462c38780c32d69740bbbfb83",
          "url": "https://github.com/ramonrsv/sci-cream/commit/cd5151e914febaf4ac503852d34fffa13161420d"
        },
        "date": 1768605190853,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "allIngredientSpecs.find, first",
            "value": 87914534,
            "range": "±3.34%",
            "unit": "ops/sec",
            "extra": "85 samples"
          },
          {
            "name": "allIngredientSpecs.find, last",
            "value": 1599800,
            "range": "±0.34%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "getIngredientSpecByName, first",
            "value": 78534533,
            "range": "±3.08%",
            "unit": "ops/sec",
            "extra": "87 samples"
          },
          {
            "name": "getIngredientSpecByName, last",
            "value": 1811832,
            "range": "±0.30%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, first",
            "value": 570703,
            "range": "±0.56%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, last",
            "value": 520611,
            "range": "±0.62%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "into_ingredient_from_spec(allIngredientSpecs.find, first)",
            "value": 300531,
            "range": "±0.57%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "into_ingredient_from_spec(allIngredientSpecs.find, last)",
            "value": 234821,
            "range": "±0.46%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, first)",
            "value": 298331,
            "range": "±0.69%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, last)",
            "value": 240864,
            "range": "±0.47%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, first)",
            "value": 171854,
            "range": "±0.93%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, last)",
            "value": 143893,
            "range": "±0.72%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, first",
            "value": 1837454,
            "range": "±0.80%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, last",
            "value": 1723493,
            "range": "±0.91%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Dark Rum)",
            "value": 296688,
            "range": "±0.40%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Whey Isolate)",
            "value": 105399,
            "range": "±0.40%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec, multiple",
            "value": 32215,
            "range": "±0.29%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "makeRecipeLines",
            "value": 20274,
            "range": "±0.32%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "cloneRecipeLines",
            "value": 4872,
            "range": "±39.85%",
            "unit": "ops/sec",
            "extra": "12 samples"
          },
          {
            "name": "makeRecipeFromMadeLines",
            "value": 17930,
            "range": "±3.55%",
            "unit": "ops/sec",
            "extra": "88 samples"
          },
          {
            "name": "makeRecipeFromClonedLines",
            "value": 2041,
            "range": "±7.43%",
            "unit": "ops/sec",
            "extra": "18 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_composition",
            "value": 16998,
            "range": "±0.65%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_composition",
            "value": 1337,
            "range": "±8.98%",
            "unit": "ops/sec",
            "extra": "10 samples"
          },
          {
            "name": "recipe.calculate_composition",
            "value": 206782,
            "range": "±9.13%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_mix_properties",
            "value": 12601,
            "range": "±2.56%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_mix_properties",
            "value": 940,
            "range": "±8.18%",
            "unit": "ops/sec",
            "extra": "13 samples"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 40530,
            "range": "±4.64%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "makeRecipeLines, free",
            "value": 20039,
            "range": "±0.19%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "cloneRecipeLines, free",
            "value": 1151,
            "range": "±11.93%",
            "unit": "ops/sec",
            "extra": "7 samples"
          },
          {
            "name": "makeRecipeLines, no free",
            "value": 783,
            "range": "±10.36%",
            "unit": "ops/sec",
            "extra": "19 samples"
          },
          {
            "name": "cloneRecipeLines, no free",
            "value": 930,
            "range": "±11.55%",
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
          "id": "f6c34901012bcb64d447f66d2261802a2344f1a9",
          "message": "Implement `wasm::Bridge` to provide WASM bridging\n\nThis struct serves as a bridge between WASM and the Rust backend,\nattempting to keep as much of the on-memory data structures and\noperations on the WASM side to minimize the performance overhead of\nJS <-> WASM bridging. It holds an in-memory ingredient database for\nlooking up ingredient definitions by name, and provides methods for\ncalculating recipe compositions and mix properties from \"light\" recipe\nrepresentations (tuples of ingredient names and amounts).",
          "timestamp": "2026-01-16T19:07:59-05:00",
          "tree_id": "2f919322989afb38e00fb4fa65acf3e34c67c2fb",
          "url": "https://github.com/ramonrsv/sci-cream/commit/f6c34901012bcb64d447f66d2261802a2344f1a9"
        },
        "date": 1768609196161,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "allIngredientSpecs.find, first",
            "value": 88551644,
            "range": "±3.11%",
            "unit": "ops/sec",
            "extra": "85 samples"
          },
          {
            "name": "allIngredientSpecs.find, last",
            "value": 1580815,
            "range": "±0.24%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "getIngredientSpecByName, first",
            "value": 78370531,
            "range": "±2.35%",
            "unit": "ops/sec",
            "extra": "85 samples"
          },
          {
            "name": "getIngredientSpecByName, last",
            "value": 1739212,
            "range": "±0.26%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, first",
            "value": 559295,
            "range": "±0.60%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, last",
            "value": 511087,
            "range": "±0.58%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "into_ingredient_from_spec(allIngredientSpecs.find, first)",
            "value": 298490,
            "range": "±0.60%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec(allIngredientSpecs.find, last)",
            "value": 232250,
            "range": "±0.51%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, first)",
            "value": 298139,
            "range": "±0.53%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, last)",
            "value": 239080,
            "range": "±0.57%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, first)",
            "value": 170722,
            "range": "±0.80%",
            "unit": "ops/sec",
            "extra": "89 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, last)",
            "value": 143069,
            "range": "±0.79%",
            "unit": "ops/sec",
            "extra": "89 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, first",
            "value": 1807251,
            "range": "±1.08%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, last",
            "value": 1694278,
            "range": "±1.01%",
            "unit": "ops/sec",
            "extra": "89 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Dark Rum)",
            "value": 292912,
            "range": "±0.41%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Whey Isolate)",
            "value": 104750,
            "range": "±0.41%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "into_ingredient_from_spec, multiple",
            "value": 31759,
            "range": "±0.29%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "cloneRecipeLines",
            "value": 4643,
            "range": "±37.67%",
            "unit": "ops/sec",
            "extra": "11 samples"
          },
          {
            "name": "makeRecipeLines",
            "value": 19438,
            "range": "±0.61%",
            "unit": "ops/sec",
            "extra": "89 samples"
          },
          {
            "name": "makeRecipeFromClonedLines",
            "value": 2087,
            "range": "±8.36%",
            "unit": "ops/sec",
            "extra": "13 samples"
          },
          {
            "name": "makeRecipeFromMadeLines",
            "value": 18268,
            "range": "±1.46%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_composition",
            "value": 1304,
            "range": "±10.19%",
            "unit": "ops/sec",
            "extra": "11 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_composition",
            "value": 16057,
            "range": "±8.92%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "bridge.calculate_recipe_composition",
            "value": 89037,
            "range": "±0.51%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "recipe.calculate_composition",
            "value": 211971,
            "range": "±0.33%",
            "unit": "ops/sec",
            "extra": "98 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_mix_properties",
            "value": 957,
            "range": "±9.55%",
            "unit": "ops/sec",
            "extra": "13 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_mix_properties",
            "value": 12049,
            "range": "±7.68%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "bridge.calculate_recipe_mix_properties",
            "value": 32377,
            "range": "±0.07%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 41175,
            "range": "±0.20%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "makeRecipeLines, free",
            "value": 19515,
            "range": "±1.17%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "cloneRecipeLines, free",
            "value": 1139,
            "range": "±8.63%",
            "unit": "ops/sec",
            "extra": "8 samples"
          },
          {
            "name": "makeRecipeLines, no free",
            "value": 736,
            "range": "±10.98%",
            "unit": "ops/sec",
            "extra": "16 samples"
          },
          {
            "name": "cloneRecipeLines, no free",
            "value": 909,
            "range": "±5.66%",
            "unit": "ops/sec",
            "extra": "11 samples"
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
          "id": "473f25ee6129e1f77dcedf6d4b90c30dc3475bb9",
          "message": "Add get_ingredient* to Bridge, forwards to IngDb\n\n* Add the same `get_ingredient*` family of functions interface that\n  `IngredientDatabase` has to `Bridge`, forwarding to the internal\n  database. We cannot expose the `db` field directly because that would\n  require `wasm_bindgen(getter_with_clone)`.\n\n* Add benchmarks to check that there is no performance degradation to\n  the database operation by going through `Bridge`.",
          "timestamp": "2026-01-16T20:57:45-05:00",
          "tree_id": "ec7b998e73cacf98da873fbc902c6c3fa8738040",
          "url": "https://github.com/ramonrsv/sci-cream/commit/473f25ee6129e1f77dcedf6d4b90c30dc3475bb9"
        },
        "date": 1768616819819,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "allIngredientSpecs.find, first",
            "value": 87722653,
            "range": "±3.11%",
            "unit": "ops/sec",
            "extra": "84 samples"
          },
          {
            "name": "allIngredientSpecs.find, last",
            "value": 1582275,
            "range": "±0.67%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "getIngredientSpecByName, first",
            "value": 77003098,
            "range": "±3.44%",
            "unit": "ops/sec",
            "extra": "82 samples"
          },
          {
            "name": "getIngredientSpecByName, last",
            "value": 1773783,
            "range": "±0.32%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, first",
            "value": 559647,
            "range": "±0.55%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, last",
            "value": 509296,
            "range": "±0.64%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, first)",
            "value": 296411,
            "range": "±0.57%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, last)",
            "value": 240389,
            "range": "±0.52%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, first)",
            "value": 172279,
            "range": "±0.82%",
            "unit": "ops/sec",
            "extra": "89 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, last)",
            "value": 144318,
            "range": "±0.82%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, first)",
            "value": 301313,
            "range": "±0.48%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, last)",
            "value": 290796,
            "range": "±0.42%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, first",
            "value": 1901777,
            "range": "±1.04%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, last",
            "value": 1807131,
            "range": "±0.93%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, first",
            "value": 1951489,
            "range": "±0.79%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, last",
            "value": 1808861,
            "range": "±1.49%",
            "unit": "ops/sec",
            "extra": "89 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Dark Rum)",
            "value": 295343,
            "range": "±0.39%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Whey Isolate)",
            "value": 103674,
            "range": "±0.44%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec, multiple",
            "value": 31794,
            "range": "±0.29%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "cloneRecipeLines",
            "value": 4491,
            "range": "±34.83%",
            "unit": "ops/sec",
            "extra": "11 samples"
          },
          {
            "name": "makeRecipeLines",
            "value": 19038,
            "range": "±1.56%",
            "unit": "ops/sec",
            "extra": "88 samples"
          },
          {
            "name": "makeRecipeFromClonedLines",
            "value": 2026,
            "range": "±8.76%",
            "unit": "ops/sec",
            "extra": "19 samples"
          },
          {
            "name": "makeRecipeFromMadeLines",
            "value": 18104,
            "range": "±2.39%",
            "unit": "ops/sec",
            "extra": "88 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_composition",
            "value": 1493,
            "range": "±5.84%",
            "unit": "ops/sec",
            "extra": "16 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_composition",
            "value": 16624,
            "range": "±0.32%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "bridge.calculate_recipe_composition",
            "value": 88740,
            "range": "±0.79%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "recipe.calculate_composition",
            "value": 216286,
            "range": "±0.29%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_mix_properties",
            "value": 1119,
            "range": "±7.62%",
            "unit": "ops/sec",
            "extra": "12 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_mix_properties",
            "value": 12084,
            "range": "±7.79%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "bridge.calculate_recipe_mix_properties",
            "value": 32710,
            "range": "±0.12%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 41806,
            "range": "±0.15%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "makeRecipeLines, free",
            "value": 19407,
            "range": "±1.03%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "cloneRecipeLines, free",
            "value": 1233,
            "range": "±12.09%",
            "unit": "ops/sec",
            "extra": "7 samples"
          },
          {
            "name": "makeRecipeLines, no free",
            "value": 787,
            "range": "±10.61%",
            "unit": "ops/sec",
            "extra": "20 samples"
          },
          {
            "name": "cloneRecipeLines, no free",
            "value": 915,
            "range": "±11.63%",
            "unit": "ops/sec",
            "extra": "10 samples"
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
          "id": "344fa5d1c114fc27e6a5ed8a47dd0bc16aea5f88",
          "message": "Add TODO about unresponsive UI when many clicks",
          "timestamp": "2026-01-16T21:32:42-05:00",
          "tree_id": "548e8e2cf446065194b8c9db9705c216244674f9",
          "url": "https://github.com/ramonrsv/sci-cream/commit/344fa5d1c114fc27e6a5ed8a47dd0bc16aea5f88"
        },
        "date": 1768686418808,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "allIngredientSpecs.find, first",
            "value": 88030650,
            "range": "±3.02%",
            "unit": "ops/sec",
            "extra": "87 samples"
          },
          {
            "name": "allIngredientSpecs.find, last",
            "value": 1630959,
            "range": "±1.22%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "getIngredientSpecByName, first",
            "value": 75891550,
            "range": "±3.28%",
            "unit": "ops/sec",
            "extra": "85 samples"
          },
          {
            "name": "getIngredientSpecByName, last",
            "value": 1830027,
            "range": "±0.38%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, first",
            "value": 561053,
            "range": "±0.60%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, last",
            "value": 513833,
            "range": "±0.61%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, first)",
            "value": 300254,
            "range": "±0.60%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, last)",
            "value": 241459,
            "range": "±0.59%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, first)",
            "value": 174616,
            "range": "±0.81%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, last)",
            "value": 147872,
            "range": "±0.74%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, first)",
            "value": 305341,
            "range": "±0.41%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, last)",
            "value": 294223,
            "range": "±0.41%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, first",
            "value": 1896193,
            "range": "±0.89%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, last",
            "value": 1755707,
            "range": "±1.08%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, first",
            "value": 1916506,
            "range": "±0.82%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, last",
            "value": 1789787,
            "range": "±0.78%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Dark Rum)",
            "value": 297034,
            "range": "±0.34%",
            "unit": "ops/sec",
            "extra": "98 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Whey Isolate)",
            "value": 104903,
            "range": "±0.36%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "into_ingredient_from_spec, multiple",
            "value": 32307,
            "range": "±0.27%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "cloneRecipeLines",
            "value": 5434,
            "range": "±43.75%",
            "unit": "ops/sec",
            "extra": "12 samples"
          },
          {
            "name": "makeRecipeLines",
            "value": 19526,
            "range": "±1.00%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "makeRecipeFromClonedLines",
            "value": 1753,
            "range": "±8.56%",
            "unit": "ops/sec",
            "extra": "40 samples"
          },
          {
            "name": "makeRecipeFromMadeLines",
            "value": 18073,
            "range": "±5.00%",
            "unit": "ops/sec",
            "extra": "88 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_composition",
            "value": 1599,
            "range": "±8.69%",
            "unit": "ops/sec",
            "extra": "16 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_composition",
            "value": 16779,
            "range": "±0.77%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "bridge.calculate_recipe_composition",
            "value": 86803,
            "range": "±0.42%",
            "unit": "ops/sec",
            "extra": "98 samples"
          },
          {
            "name": "recipe.calculate_composition",
            "value": 216769,
            "range": "±0.36%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_mix_properties",
            "value": 1185,
            "range": "±7.73%",
            "unit": "ops/sec",
            "extra": "14 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_mix_properties",
            "value": 12277,
            "range": "±7.29%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "bridge.calculate_recipe_mix_properties",
            "value": 32632,
            "range": "±0.10%",
            "unit": "ops/sec",
            "extra": "98 samples"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 41208,
            "range": "±0.19%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "makeRecipeLines, free",
            "value": 19693,
            "range": "±1.82%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "cloneRecipeLines, free",
            "value": 1258,
            "range": "±9.46%",
            "unit": "ops/sec",
            "extra": "8 samples"
          },
          {
            "name": "makeRecipeLines, no free",
            "value": 872,
            "range": "±10.74%",
            "unit": "ops/sec",
            "extra": "21 samples"
          },
          {
            "name": "cloneRecipeLines, no free",
            "value": 1014,
            "range": "±12.24%",
            "unit": "ops/sec",
            "extra": "11 samples"
          }
        ]
      }
    ]
  }
}
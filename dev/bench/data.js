window.BENCHMARK_DATA = {
  "lastUpdate": 1769985086225,
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
          "id": "0ba39247a814820828c313942d54681ab8c02f55",
          "message": "Add README.md links to GitHub pages and benchmarks",
          "timestamp": "2026-01-20T21:46:52-05:00",
          "tree_id": "293e979812432f593b3c6900c208a92879ec2e85",
          "url": "https://github.com/ramonrsv/sci-cream/commit/0ba39247a814820828c313942d54681ab8c02f55"
        },
        "date": 1768963718420,
        "tool": "cargo",
        "benches": [
          {
            "name": "recipe.calculate_composition",
            "value": 1923,
            "range": "± 69",
            "unit": "ns/iter"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 130746,
            "range": "± 1982",
            "unit": "ns/iter"
          },
          {
            "name": "sweetener_spec_into_composition",
            "value": 281,
            "range": "± 30",
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
          "id": "feb42eb0469fe7e2ef00c0d0de99e91e0ec6d777",
          "message": "Improve format of app bench logs, remove from test",
          "timestamp": "2026-01-21T01:38:23-05:00",
          "tree_id": "01b0e70a9f85161d5893f2509b3faba9d4675158",
          "url": "https://github.com/ramonrsv/sci-cream/commit/feb42eb0469fe7e2ef00c0d0de99e91e0ec6d777"
        },
        "date": 1768977579015,
        "tool": "cargo",
        "benches": [
          {
            "name": "recipe.calculate_composition",
            "value": 2367,
            "range": "± 32",
            "unit": "ns/iter"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 161659,
            "range": "± 938",
            "unit": "ns/iter"
          },
          {
            "name": "sweetener_spec_into_composition",
            "value": 310,
            "range": "± 4",
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
          "id": "d1916ab1f35752779e2ab4e106b2ef0edf44fc2c",
          "message": "Add App e2e bench for recipe switch in RecipeGrid",
          "timestamp": "2026-01-21T04:25:07-05:00",
          "tree_id": "fc248df690a9c417283f138a01427a672766ed84",
          "url": "https://github.com/ramonrsv/sci-cream/commit/d1916ab1f35752779e2ab4e106b2ef0edf44fc2c"
        },
        "date": 1769034601536,
        "tool": "cargo",
        "benches": [
          {
            "name": "recipe.calculate_composition",
            "value": 2283,
            "range": "± 93",
            "unit": "ns/iter"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 161739,
            "range": "± 2351",
            "unit": "ns/iter"
          },
          {
            "name": "sweetener_spec_into_composition",
            "value": 303,
            "range": "± 10",
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
          "id": "930b83a2eda0cd72894beb767bdc24f36f0ce037",
          "message": "Add App benches for rapid ingredient qty updates",
          "timestamp": "2026-01-21T13:37:27-05:00",
          "tree_id": "3b84020a999964040b742ec916294dd4ebcbd38b",
          "url": "https://github.com/ramonrsv/sci-cream/commit/930b83a2eda0cd72894beb767bdc24f36f0ce037"
        },
        "date": 1769042157510,
        "tool": "cargo",
        "benches": [
          {
            "name": "recipe.calculate_composition",
            "value": 2346,
            "range": "± 22",
            "unit": "ns/iter"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 162091,
            "range": "± 22933",
            "unit": "ns/iter"
          },
          {
            "name": "sweetener_spec_into_composition",
            "value": 309,
            "range": "± 39",
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
          "id": "47235276c0f9486f54eed2b4b925c6e06f0bc447",
          "message": "Remove simulated network latency in db fetches\n\nThis was originally there to make inefficient loading more aparent.\nHowever, now that everything is loaded up front once, this isn't very\nmeaningful anymore, and it greatly slows down benchmark execution setup;\nmost actual performance measurements should be unaffected.",
          "timestamp": "2026-01-21T13:50:49-05:00",
          "tree_id": "2ad54da4b98c3d409bda6ce145277a89f351b016",
          "url": "https://github.com/ramonrsv/sci-cream/commit/47235276c0f9486f54eed2b4b925c6e06f0bc447"
        },
        "date": 1769042649651,
        "tool": "cargo",
        "benches": [
          {
            "name": "recipe.calculate_composition",
            "value": 2488,
            "range": "± 104",
            "unit": "ns/iter"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 162194,
            "range": "± 927",
            "unit": "ns/iter"
          },
          {
            "name": "sweetener_spec_into_composition",
            "value": 311,
            "range": "± 4",
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
          "id": "c1f5a25b345549e2488d009fb0de3f6ce06144fb",
          "message": "Move e2e test assets to __tests__/assets, add more\n\n@todo There seems to be a stability issue when making many ingredient\nquantity updates, uncovered by the new longer list. Investigate and\nuncomment the full list once the issues have been resolved.",
          "timestamp": "2026-01-21T13:51:23-05:00",
          "tree_id": "81863959ffedc2e8553254a32e6fb59974ab40b8",
          "url": "https://github.com/ramonrsv/sci-cream/commit/c1f5a25b345549e2488d009fb0de3f6ce06144fb"
        },
        "date": 1769044158005,
        "tool": "cargo",
        "benches": [
          {
            "name": "recipe.calculate_composition",
            "value": 2293,
            "range": "± 25",
            "unit": "ns/iter"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 161720,
            "range": "± 994",
            "unit": "ns/iter"
          },
          {
            "name": "sweetener_spec_into_composition",
            "value": 307,
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
          "id": "7494de95a354d244a21389afb092461c5db95b64",
          "message": "Use ESLint --max-warnings=0 to treat warn as error",
          "timestamp": "2026-01-21T13:51:23-05:00",
          "tree_id": "8e1df33892b3d27ae855785526d81c166b203ef4",
          "url": "https://github.com/ramonrsv/sci-cream/commit/7494de95a354d244a21389afb092461c5db95b64"
        },
        "date": 1769065363345,
        "tool": "cargo",
        "benches": [
          {
            "name": "recipe.calculate_composition",
            "value": 2361,
            "range": "± 33",
            "unit": "ns/iter"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 161957,
            "range": "± 4078",
            "unit": "ns/iter"
          },
          {
            "name": "sweetener_spec_into_composition",
            "value": 304,
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
          "id": "f685f79353477f217b5e592a6f3f108b5c6b650d",
          "message": "Fix pattern waiting for column headers to contain",
          "timestamp": "2026-01-21T14:59:11-05:00",
          "tree_id": "e37c94bc07c94ddc4578b07d11a176e4aa8cff2a",
          "url": "https://github.com/ramonrsv/sci-cream/commit/f685f79353477f217b5e592a6f3f108b5c6b650d"
        },
        "date": 1769065854356,
        "tool": "cargo",
        "benches": [
          {
            "name": "recipe.calculate_composition",
            "value": 2404,
            "range": "± 11",
            "unit": "ns/iter"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 163155,
            "range": "± 2423",
            "unit": "ns/iter"
          },
          {
            "name": "sweetener_spec_into_composition",
            "value": 312,
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
          "id": "0e383c927f66212dab7510582c33858eb4f46823",
          "message": "Add test to verify UI resilience to slow initial\n\nThis test simulates a slow initial load to ensure that recipe paste\nremains responsive and that the UI updates correctly once the data is\navailable. It should fail if the `useEffect` in `RecipeGrid` to \"Prevent\nstale ingredient rows if pasted quickly whilst... still loading...\" is\nremoved.",
          "timestamp": "2026-01-21T15:58:03-05:00",
          "tree_id": "103ec1568aeb1b80d558d3acf67e87986bd452e6",
          "url": "https://github.com/ramonrsv/sci-cream/commit/0e383c927f66212dab7510582c33858eb4f46823"
        },
        "date": 1769065918990,
        "tool": "cargo",
        "benches": [
          {
            "name": "recipe.calculate_composition",
            "value": 2379,
            "range": "± 39",
            "unit": "ns/iter"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 163850,
            "range": "± 919",
            "unit": "ns/iter"
          },
          {
            "name": "sweetener_spec_into_composition",
            "value": 306,
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
          "id": "d90e14e429d7794804e6a97016c85421b9523ce0",
          "message": "Format e2e benchmark result uploads to 2 decimals",
          "timestamp": "2026-01-22T02:15:46-05:00",
          "tree_id": "afb768f7f4cf98eefd1173be226a842923380490",
          "url": "https://github.com/ramonrsv/sci-cream/commit/d90e14e429d7794804e6a97016c85421b9523ce0"
        },
        "date": 1769066269070,
        "tool": "cargo",
        "benches": [
          {
            "name": "recipe.calculate_composition",
            "value": 2357,
            "range": "± 43",
            "unit": "ns/iter"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 163423,
            "range": "± 1257",
            "unit": "ns/iter"
          },
          {
            "name": "sweetener_spec_into_composition",
            "value": 305,
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
          "id": "21eb5d55eb18ed370bb0359ea40c814a1d60064b",
          "message": "Add 'database' feature for IngredientDatabase\n\n* Add 'database' feature to guard the inclusion of `IngredientDatabase`,\n  separate from 'data' for the inclusion of embedded ingredients data.\n\n* Add new `IngredientDatabase::seeded_from_embedded_data` that is\n  enabled if both 'database' and 'data' features are enabled.",
          "timestamp": "2026-01-26T12:24:59-05:00",
          "tree_id": "db248c3267f86917c0046d69d8fc5460aeb7db4a",
          "url": "https://github.com/ramonrsv/sci-cream/commit/21eb5d55eb18ed370bb0359ea40c814a1d60064b"
        },
        "date": 1769452451514,
        "tool": "cargo",
        "benches": [
          {
            "name": "recipe.calculate_composition",
            "value": 2022,
            "range": "± 39",
            "unit": "ns/iter"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 162192,
            "range": "± 5848",
            "unit": "ns/iter"
          },
          {
            "name": "sweetener_spec_into_composition",
            "value": 309,
            "range": "± 4",
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
          "id": "7d9af8bc7a9740ff545b98d5287aebdb35097995",
          "message": "Add memory usage benches and leak detection tests\n\n* Add peak memory usage benchmarks and memory leak detection tests.\n* Refactor __benches__/e2e and __tests__/e2e files, separating web\n  vitals, UI responsivness, and memory usage benches and tests.\n  Note that this requires the use of 'zzz-output-results.spec.ts`,\n  a hacky solution to collect and output results from multiple files.",
          "timestamp": "2026-01-26T18:08:36-05:00",
          "tree_id": "1ef54eb311adf1f9c84f0c04df75a7dcd16bbc8c",
          "url": "https://github.com/ramonrsv/sci-cream/commit/7d9af8bc7a9740ff545b98d5287aebdb35097995"
        },
        "date": 1769469001246,
        "tool": "cargo",
        "benches": [
          {
            "name": "recipe.calculate_composition",
            "value": 1974,
            "range": "± 36",
            "unit": "ns/iter"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 162143,
            "range": "± 1273",
            "unit": "ns/iter"
          },
          {
            "name": "sweetener_spec_into_composition",
            "value": 313,
            "range": "± 13",
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
          "id": "1c5425dc5b57c23df5731cfb7930f212c4898d08",
          "message": "Resolve stability issues and enable full assets\n\nThe stability issues turned out to be that the 30s test timeout was\nbeing reached, but the error messages were a bit cryptic. Setting a\nlonger timeout on the failing tests resolves the issue, and allows the\nfull set of assets to be enabled.",
          "timestamp": "2026-01-26T18:25:20-05:00",
          "tree_id": "c0c7605091751bd113b5f98e8a05901420ac1cc0",
          "url": "https://github.com/ramonrsv/sci-cream/commit/1c5425dc5b57c23df5731cfb7930f212c4898d08"
        },
        "date": 1769470101970,
        "tool": "cargo",
        "benches": [
          {
            "name": "recipe.calculate_composition",
            "value": 1974,
            "range": "± 13",
            "unit": "ns/iter"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 159843,
            "range": "± 665",
            "unit": "ns/iter"
          },
          {
            "name": "sweetener_spec_into_composition",
            "value": 308,
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
          "id": "926ffb458e621e7d7fad304d5ae78d56c2fcc57c",
          "message": "Use global test.setTimeout for UI Perf Benchmarks",
          "timestamp": "2026-01-26T21:01:28-05:00",
          "tree_id": "27a1422a7b739e5d7130a8200a50d79a83725258",
          "url": "https://github.com/ramonrsv/sci-cream/commit/926ffb458e621e7d7fad304d5ae78d56c2fcc57c"
        },
        "date": 1769479398651,
        "tool": "cargo",
        "benches": [
          {
            "name": "recipe.calculate_composition",
            "value": 2003,
            "range": "± 33",
            "unit": "ns/iter"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 160540,
            "range": "± 1394",
            "unit": "ns/iter"
          },
          {
            "name": "sweetener_spec_into_composition",
            "value": 314,
            "range": "± 4",
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
          "id": "8775e36fdcda6f7dbcdaeab6ca5685f353f8d6bf",
          "message": "Introduce `clean_reports.sh` and remove lock files\n\nIntroduce `scripts/clean_reports.sh` to clean up test, coverage, and\nbenchmark reports generated during development. Also remove `Cargo.lock`\nand `pnpm-lock.yaml` from `scripts/clean_workspace.sh`, now that these\nfiles are tracked in git version control.",
          "timestamp": "2026-01-27T12:05:22-05:00",
          "tree_id": "588d75888e073d6d9555fdcfd8c97c9104d7898a",
          "url": "https://github.com/ramonrsv/sci-cream/commit/8775e36fdcda6f7dbcdaeab6ca5685f353f8d6bf"
        },
        "date": 1769554220831,
        "tool": "cargo",
        "benches": [
          {
            "name": "recipe.calculate_composition",
            "value": 1979,
            "range": "± 32",
            "unit": "ns/iter"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 160387,
            "range": "± 3610",
            "unit": "ns/iter"
          },
          {
            "name": "sweetener_spec_into_composition",
            "value": 309,
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
          "id": "d51c46dddf76c32e822310e23af42d72c05a893d",
          "message": "Separate free-vs-no-free from wasm bridge benches",
          "timestamp": "2026-01-27T12:33:29-05:00",
          "tree_id": "fd5c86f17ea4d07cad50a705b00710f68f0b72ab",
          "url": "https://github.com/ramonrsv/sci-cream/commit/d51c46dddf76c32e822310e23af42d72c05a893d"
        },
        "date": 1769554747702,
        "tool": "cargo",
        "benches": [
          {
            "name": "recipe.calculate_composition",
            "value": 1601,
            "range": "± 41",
            "unit": "ns/iter"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 124168,
            "range": "± 2067",
            "unit": "ns/iter"
          },
          {
            "name": "sweetener_spec_into_composition",
            "value": 281,
            "range": "± 16",
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
          "id": "618fb31a966bc0374ae569c872c96fa40df6e4fb",
          "message": "Add more feature-specific build/test to crate CI\n\n* Clean up, clarify, and add more feature-specific crate CI build and\n  test steps, to catch any issues with specific feature enablement.\n* Clean up and rename package.json scripts for rust build/test and for\n  wasm dependency builds. The Rust script are no longer specific to the\n  'wasm' and pnpm package features, that is captured by 'build:package'.\n  Remove the 'build' script, as it contains many somewhat unrelated\n  steps that there is no clear usage for running them together.\n* Add crate CI builds for wasm32-unknown-unknown target and the 'wasm'\n  feature, which should be a common combination used by wasm-pack.\n* Add default features [\"data\", \"database\"] to sci-cram Cargo.toml.\n  Remove 'test' from #[cfg(any(feature = \"data\"/\"database\", test))];\n  tests should be run with --all-features and there will be no support\n  for test with only some features enabled.",
          "timestamp": "2026-01-27T15:46:46-05:00",
          "tree_id": "f07dd813bbe7f48b8cbb4cf36c37440a7693d92f",
          "url": "https://github.com/ramonrsv/sci-cream/commit/618fb31a966bc0374ae569c872c96fa40df6e4fb"
        },
        "date": 1769555451263,
        "tool": "cargo",
        "benches": [
          {
            "name": "recipe.calculate_composition",
            "value": 1596,
            "range": "± 68",
            "unit": "ns/iter"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 124409,
            "range": "± 2021",
            "unit": "ns/iter"
          },
          {
            "name": "sweetener_spec_into_composition",
            "value": 268,
            "range": "± 19",
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
          "id": "01bce5a83c9a3c213dd61dfb6405a3dba232d7ec",
          "message": "Add playwright setup action explicit additional\n\nAdd support to actions/setup-playwright for explicitly specifying\nadditional non-default browsers to install, e.g. branded Google Chrome\n('chrome'). Add 'with.additional-browsers: chrome' to current uses.",
          "timestamp": "2026-01-27T16:39:29-05:00",
          "tree_id": "e5d54192414344a1aa1c9b4f9e812ba0f1fe87c4",
          "url": "https://github.com/ramonrsv/sci-cream/commit/01bce5a83c9a3c213dd61dfb6405a3dba232d7ec"
        },
        "date": 1769555874634,
        "tool": "cargo",
        "benches": [
          {
            "name": "recipe.calculate_composition",
            "value": 1987,
            "range": "± 28",
            "unit": "ns/iter"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 160193,
            "range": "± 8625",
            "unit": "ns/iter"
          },
          {
            "name": "sweetener_spec_into_composition",
            "value": 309,
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
          "id": "c360865dcd90a3e9889efc86cedded3fa0bd30db",
          "message": "Stop using branded Google Chrome in Playwright e2e\n\nStop using branded Google Chrome browser in Playwright e2e tests and\nbenchmarks; setting up branded chrome takes a lot of time in CI\nworkflows and probably doesn't offer much in extra coverage.",
          "timestamp": "2026-01-27T16:44:15-05:00",
          "tree_id": "8b0bd2334c32e9c13a7efd832807b03665ba4673",
          "url": "https://github.com/ramonrsv/sci-cream/commit/c360865dcd90a3e9889efc86cedded3fa0bd30db"
        },
        "date": 1769557395763,
        "tool": "cargo",
        "benches": [
          {
            "name": "recipe.calculate_composition",
            "value": 1972,
            "range": "± 16",
            "unit": "ns/iter"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 161238,
            "range": "± 2904",
            "unit": "ns/iter"
          },
          {
            "name": "sweetener_spec_into_composition",
            "value": 312,
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
          "id": "1fa9edca759a2abfde7e893bbc257403f111e93b",
          "message": "Upgrade @playwright/test from ^1.57.0 to ^1.58.0",
          "timestamp": "2026-01-27T16:56:15-05:00",
          "tree_id": "058cdf1cce6e9b4f4cafa0de4b8a7f6e3d4968a4",
          "url": "https://github.com/ramonrsv/sci-cream/commit/1fa9edca759a2abfde7e893bbc257403f111e93b"
        },
        "date": 1769557898385,
        "tool": "cargo",
        "benches": [
          {
            "name": "recipe.calculate_composition",
            "value": 1977,
            "range": "± 37",
            "unit": "ns/iter"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 160911,
            "range": "± 2198",
            "unit": "ns/iter"
          },
          {
            "name": "sweetener_spec_into_composition",
            "value": 306,
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
          "id": "5ccb17ba11956cf226dca60ba426c13463e60bc5",
          "message": "Introduce LightRecipe & Recipe::from_light_recipe\n\nAlso make Recipe::name an Option<String>, and change all function\narguments accordingly; most current uses cases do not need a name.",
          "timestamp": "2026-01-27T18:40:42-05:00",
          "tree_id": "0f7e0c60c6e5020dc185bc1140e298d877ec8bcc",
          "url": "https://github.com/ramonrsv/sci-cream/commit/5ccb17ba11956cf226dca60ba426c13463e60bc5"
        },
        "date": 1769558741388,
        "tool": "cargo",
        "benches": [
          {
            "name": "recipe.calculate_composition",
            "value": 2033,
            "range": "± 37",
            "unit": "ns/iter"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 160124,
            "range": "± 8173",
            "unit": "ns/iter"
          },
          {
            "name": "sweetener_spec_into_composition",
            "value": 322,
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
          "id": "560cee861bdee18fb1b4593bbb13100d0970fa46",
          "message": "Add bridge.calculate_recipe_comp/mix_props benches",
          "timestamp": "2026-01-27T19:04:33-05:00",
          "tree_id": "00e520a232b1b9fc087dcee518a00f3d764b5062",
          "url": "https://github.com/ramonrsv/sci-cream/commit/560cee861bdee18fb1b4593bbb13100d0970fa46"
        },
        "date": 1769559141105,
        "tool": "cargo",
        "benches": [
          {
            "name": "bridge.calculate_recipe_composition",
            "value": 3536,
            "range": "± 123",
            "unit": "ns/iter"
          },
          {
            "name": "bridge.calculate_recipe_mix_properties",
            "value": 160821,
            "range": "± 715",
            "unit": "ns/iter"
          },
          {
            "name": "recipe.calculate_composition",
            "value": 1983,
            "range": "± 9",
            "unit": "ns/iter"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 166529,
            "range": "± 6115",
            "unit": "ns/iter"
          },
          {
            "name": "sweetener_spec_into_composition",
            "value": 308,
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
          "id": "74a6b4667bb6d2a8aa4e637c57003a9ccee11f4b",
          "message": "Rename IngredientDatabase WASM constructor methods\n\n  `make_seeded_ingredient_database`\n  `make_seeded_ingredient_database_from_specs`\n  `make_seeded_ingredient_database_from_embedded_data`\n\n    renamed to v\n\n  `new_ingredient_database_seeded`\n  `new_ingredient_database_seeded_from_specs`\n  `new_ingredient_database_seeded_from_embedded_data`",
          "timestamp": "2026-01-27T22:55:22-05:00",
          "tree_id": "2acf6bd804a004cf2410358538fda9cb78055b0d",
          "url": "https://github.com/ramonrsv/sci-cream/commit/74a6b4667bb6d2a8aa4e637c57003a9ccee11f4b"
        },
        "date": 1769572924219,
        "tool": "cargo",
        "benches": [
          {
            "name": "bridge.calculate_recipe_composition",
            "value": 3587,
            "range": "± 34",
            "unit": "ns/iter"
          },
          {
            "name": "bridge.calculate_recipe_mix_properties",
            "value": 162358,
            "range": "± 3908",
            "unit": "ns/iter"
          },
          {
            "name": "recipe.calculate_composition",
            "value": 2084,
            "range": "± 77",
            "unit": "ns/iter"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 160801,
            "range": "± 1249",
            "unit": "ns/iter"
          },
          {
            "name": "sweetener_spec_into_composition",
            "value": 312,
            "range": "± 4",
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
          "id": "838fe94eec5537ad06cb368e6e4f4c588670baea",
          "message": "Add TODO about perf impact of comp/mix_p.get calls",
          "timestamp": "2026-01-28T18:39:01-05:00",
          "tree_id": "fa31a361ba2e45217bdab15201e812d5af758599",
          "url": "https://github.com/ramonrsv/sci-cream/commit/838fe94eec5537ad06cb368e6e4f4c588670baea"
        },
        "date": 1769643688739,
        "tool": "cargo",
        "benches": [
          {
            "name": "bridge.calculate_recipe_composition",
            "value": 3606,
            "range": "± 47",
            "unit": "ns/iter"
          },
          {
            "name": "bridge.calculate_recipe_mix_properties",
            "value": 161859,
            "range": "± 1083",
            "unit": "ns/iter"
          },
          {
            "name": "recipe.calculate_composition",
            "value": 2024,
            "range": "± 30",
            "unit": "ns/iter"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 160183,
            "range": "± 606",
            "unit": "ns/iter"
          },
          {
            "name": "sweetener_spec_into_composition",
            "value": 316,
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
          "id": "a3cc3e2189f94988a0f04f295c94b057d59fbfcd",
          "message": "Check off various TODOs that have been addressed",
          "timestamp": "2026-01-28T18:42:07-05:00",
          "tree_id": "f22b5caa479f4df51dcaf372977376fc64bcc8bb",
          "url": "https://github.com/ramonrsv/sci-cream/commit/a3cc3e2189f94988a0f04f295c94b057d59fbfcd"
        },
        "date": 1769643877489,
        "tool": "cargo",
        "benches": [
          {
            "name": "bridge.calculate_recipe_composition",
            "value": 3464,
            "range": "± 179",
            "unit": "ns/iter"
          },
          {
            "name": "bridge.calculate_recipe_mix_properties",
            "value": 161942,
            "range": "± 886",
            "unit": "ns/iter"
          },
          {
            "name": "recipe.calculate_composition",
            "value": 1962,
            "range": "± 21",
            "unit": "ns/iter"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 159971,
            "range": "± 3474",
            "unit": "ns/iter"
          },
          {
            "name": "sweetener_spec_into_composition",
            "value": 312,
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
          "id": "d4229e48fb78d85f225ee01b08ae13211d186946",
          "message": "Add TODO about comp/prop_key_as_med_str WASM calls",
          "timestamp": "2026-01-28T18:46:25-05:00",
          "tree_id": "e8b00776496ecfe78aec31d59c4fee26cf6c4021",
          "url": "https://github.com/ramonrsv/sci-cream/commit/d4229e48fb78d85f225ee01b08ae13211d186946"
        },
        "date": 1769644111235,
        "tool": "cargo",
        "benches": [
          {
            "name": "bridge.calculate_recipe_composition",
            "value": 3630,
            "range": "± 28",
            "unit": "ns/iter"
          },
          {
            "name": "bridge.calculate_recipe_mix_properties",
            "value": 161813,
            "range": "± 5083",
            "unit": "ns/iter"
          },
          {
            "name": "recipe.calculate_composition",
            "value": 1978,
            "range": "± 19",
            "unit": "ns/iter"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 160430,
            "range": "± 841",
            "unit": "ns/iter"
          },
          {
            "name": "sweetener_spec_into_composition",
            "value": 311,
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
          "id": "7aa3724522f323ba576a76606b3c59f38c7385d9",
          "message": "Add unique label to each dataset line in FpdGraph\n\nThis resolves an issue where the lines for reference recipes jump around\nwhenever updates are made to any recipe, or when the FpdGraph component\nis dragged. According to Clauce Sonnet 4.5, this is because, quote:\n\n  When Chart.js re-renders, it can't distinguish between which dataset\n  belongs to which recipe, causing it to animate/transition between what\n  it thinks are \"different\" datasets, resulting in the jumping behavior.\n\nCheck off the corresponding TODO item, as well as the one for UI\nresponsivness when making many rapid ingredient quantity updates; that\nseems to only be an issue when running `pnpm dev`, it does not happen\nwith a release build `pnpm start`.",
          "timestamp": "2026-01-28T19:17:41-05:00",
          "tree_id": "b61a80920e6e35c5b4f125332f3ab5229263fb0e",
          "url": "https://github.com/ramonrsv/sci-cream/commit/7aa3724522f323ba576a76606b3c59f38c7385d9"
        },
        "date": 1769664112801,
        "tool": "cargo",
        "benches": [
          {
            "name": "bridge.calculate_recipe_composition",
            "value": 3581,
            "range": "± 19",
            "unit": "ns/iter"
          },
          {
            "name": "bridge.calculate_recipe_mix_properties",
            "value": 161050,
            "range": "± 4662",
            "unit": "ns/iter"
          },
          {
            "name": "recipe.calculate_composition",
            "value": 1975,
            "range": "± 15",
            "unit": "ns/iter"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 159488,
            "range": "± 728",
            "unit": "ns/iter"
          },
          {
            "name": "sweetener_spec_into_composition",
            "value": 310,
            "range": "± 7",
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
          "id": "f044fc85070359b094cdc13854d84fc4f8b3a292",
          "message": "Overhaul RecipeContext and updates, use WasmBridge\n\n* Overhaul the design of `RecipeContext`, now splitting it into a\n  a `RecipeContext` that holds only `Recipe`s, and `IngredientResources`\n  that holds `validIngredients` and the new `wasmBridge`; the ingredient\n  cache has been removed in favour of a seeded `WasmBridge`. This change\n  greatly simplifies the process of fetching ingredients and updating\n  the context, and should be more performance according to benchmarks in\n  the `sci-cream` crate - still needs to be confirmed with end-to-end\n  benchmarks and web vitals at the app level. This does force all\n  ingredient definitions to be loaded up-front, but functionality could\n  be added later to continiously seed `WasmBridge`, if necessary.\n\n    - As it turns out, according to the newly introduced end-to-end\n      benchmarks, this change has only a modest performance impact,\n      if any. However, it also has no significant negative impact on\n      initial page load time or memory usage, so the simplicity that\n      it affords is still a significant benefit. Further performance\n      analysis is required to identify areas of concern.\n\n* Refactor `updateRecipe` to take a list of row updates and call\n  `setRecipeContext` only once per update, reducing the number\n  of re-renders and `mixProperties` updates, particularly when updating\n  multiple rows at once, e.g. when pasting a recipe, or on first mount.",
          "timestamp": "2026-01-29T01:55:47-05:00",
          "tree_id": "6b55107dba492bf75aa66e9f808cbe938fa29cbb",
          "url": "https://github.com/ramonrsv/sci-cream/commit/f044fc85070359b094cdc13854d84fc4f8b3a292"
        },
        "date": 1769669860949,
        "tool": "cargo",
        "benches": [
          {
            "name": "bridge.calculate_recipe_composition",
            "value": 3569,
            "range": "± 35",
            "unit": "ns/iter"
          },
          {
            "name": "bridge.calculate_recipe_mix_properties",
            "value": 162157,
            "range": "± 8524",
            "unit": "ns/iter"
          },
          {
            "name": "recipe.calculate_composition",
            "value": 1988,
            "range": "± 25",
            "unit": "ns/iter"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 160523,
            "range": "± 1319",
            "unit": "ns/iter"
          },
          {
            "name": "sweetener_spec_into_composition",
            "value": 309,
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
          "id": "e5bcee9ff23f4f5c1cc84c72425f1bf81de4217b",
          "message": "Introduce *_key_as_str optimizations and benches\n\nOptimization functions to move key lookups from JS <-> WASM boundary to\nJS side, as that can be orders of magnitude more performant for simple\nkey accesses without complex computations.",
          "timestamp": "2026-01-29T11:29:05-05:00",
          "tree_id": "bd8896b44f21debbde857afec24aca0a14e4237e",
          "url": "https://github.com/ramonrsv/sci-cream/commit/e5bcee9ff23f4f5c1cc84c72425f1bf81de4217b"
        },
        "date": 1769724119674,
        "tool": "cargo",
        "benches": [
          {
            "name": "bridge.calculate_recipe_composition",
            "value": 3509,
            "range": "± 33",
            "unit": "ns/iter"
          },
          {
            "name": "bridge.calculate_recipe_mix_properties",
            "value": 162374,
            "range": "± 10885",
            "unit": "ns/iter"
          },
          {
            "name": "recipe.calculate_composition",
            "value": 1960,
            "range": "± 10",
            "unit": "ns/iter"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 161294,
            "range": "± 761",
            "unit": "ns/iter"
          },
          {
            "name": "sweetener_spec_into_composition",
            "value": 310,
            "range": "± 10",
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
          "id": "46d3820eab079d616b47feb3a1f903504bca37c4",
          "message": "Introduce skeleton for benchmark.js App benches\n\nIntroduce skeleton for and some simple App \"unit\" benchmarks using\nbenchmark.js, as opposed to Playwright for end-to-end benchmarks.\nAdd a CI job to run these benchmarks and upload results using\ngithub-action-benchmark, similarly to other repo CI benchmarks.",
          "timestamp": "2026-01-29T16:31:34-05:00",
          "tree_id": "6cb50ddd65ed21e1ea3db286a9c140c1f26e9d97",
          "url": "https://github.com/ramonrsv/sci-cream/commit/46d3820eab079d616b47feb3a1f903504bca37c4"
        },
        "date": 1769724272562,
        "tool": "cargo",
        "benches": [
          {
            "name": "bridge.calculate_recipe_composition",
            "value": 3606,
            "range": "± 28",
            "unit": "ns/iter"
          },
          {
            "name": "bridge.calculate_recipe_mix_properties",
            "value": 161904,
            "range": "± 1137",
            "unit": "ns/iter"
          },
          {
            "name": "recipe.calculate_composition",
            "value": 2002,
            "range": "± 44",
            "unit": "ns/iter"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 160332,
            "range": "± 2068",
            "unit": "ns/iter"
          },
          {
            "name": "sweetener_spec_into_composition",
            "value": 309,
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
          "id": "cf6527f475cb41d237fdbeaae8a786f27d52ff26",
          "message": "Use different server ports for Playwright CI jobs\n\nUse an environment variable `PORT` to configure the `baseURL` and\n`webServer.url` of Playwright tests/benches. CI jobs can now set\ndifferent ports so that they don't conflict with each other when running\nlocally with `act`, and so we can now run the jobs in parallel.",
          "timestamp": "2026-01-29T16:58:08-05:00",
          "tree_id": "72cb1623fa10790cade8f331e6801dbf496af275",
          "url": "https://github.com/ramonrsv/sci-cream/commit/cf6527f475cb41d237fdbeaae8a786f27d52ff26"
        },
        "date": 1769725095551,
        "tool": "cargo",
        "benches": [
          {
            "name": "bridge.calculate_recipe_composition",
            "value": 3525,
            "range": "± 38",
            "unit": "ns/iter"
          },
          {
            "name": "bridge.calculate_recipe_mix_properties",
            "value": 161140,
            "range": "± 632",
            "unit": "ns/iter"
          },
          {
            "name": "recipe.calculate_composition",
            "value": 1972,
            "range": "± 49",
            "unit": "ns/iter"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 159902,
            "range": "± 650",
            "unit": "ns/iter"
          },
          {
            "name": "sweetener_spec_into_composition",
            "value": 313,
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
          "id": "a95abf2a67f4c74f5b7fbe7b0300d95fdfc0d89f",
          "message": "Introduce Comp/Mix key get optimizations and bench\n\nIntroduce `Composition` and `MixProperties` get-by-key optimizations,\ncreating JS maps with all the key values and providing helper functions\nto access these instead of via the WASM functions of `Composition` and\n`MixProperties`. Benchmarks show that this is more performant for key\nlookups. However, the maps have to be built every time that a\n`Composition` or `MixProperties` is updated, which could be every\nrender, so this may not be more performant in real usage scenarios.",
          "timestamp": "2026-01-29T17:11:35-05:00",
          "tree_id": "584d45b421bd60740f6f0fe306f75dc0c857ae22",
          "url": "https://github.com/ramonrsv/sci-cream/commit/a95abf2a67f4c74f5b7fbe7b0300d95fdfc0d89f"
        },
        "date": 1769725932377,
        "tool": "cargo",
        "benches": [
          {
            "name": "bridge.calculate_recipe_composition",
            "value": 3626,
            "range": "± 69",
            "unit": "ns/iter"
          },
          {
            "name": "bridge.calculate_recipe_mix_properties",
            "value": 161147,
            "range": "± 11465",
            "unit": "ns/iter"
          },
          {
            "name": "recipe.calculate_composition",
            "value": 2028,
            "range": "± 40",
            "unit": "ns/iter"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 161249,
            "range": "± 799",
            "unit": "ns/iter"
          },
          {
            "name": "sweetener_spec_into_composition",
            "value": 312,
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
          "id": "9fc8a956e82f2978450cbaacce8b16492a833fd9",
          "message": "Introduce comp-value-as-qty/percent optimizations\n\nThe expecation was that it would be much more performant to replicate\nthe functionality of these functions purely on the JS side than it would\nbe to do WASM calls for such simple calculations, given the cost of\nJS <-> WASM bridging. However, as it turns out, there isn't much of a\ndifference between these two methods; perhaps because there isn't much\nJS <-> WASM overhead for simple number arguments?",
          "timestamp": "2026-01-29T17:37:16-05:00",
          "tree_id": "5d2ae60b48a0fac93f225b7e86d821d9d7c74ed9",
          "url": "https://github.com/ramonrsv/sci-cream/commit/9fc8a956e82f2978450cbaacce8b16492a833fd9"
        },
        "date": 1769726982082,
        "tool": "cargo",
        "benches": [
          {
            "name": "bridge.calculate_recipe_composition",
            "value": 3538,
            "range": "± 50",
            "unit": "ns/iter"
          },
          {
            "name": "bridge.calculate_recipe_mix_properties",
            "value": 161848,
            "range": "± 8532",
            "unit": "ns/iter"
          },
          {
            "name": "recipe.calculate_composition",
            "value": 1963,
            "range": "± 11",
            "unit": "ns/iter"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 160588,
            "range": "± 16836",
            "unit": "ns/iter"
          },
          {
            "name": "sweetener_spec_into_composition",
            "value": 313,
            "range": "± 35",
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
          "id": "1c99169109d056c1254588e6ad4dd3cf9cbd8435",
          "message": "Remove .toBeVisible() calls from e2e benchmarks\n\nIt's unclear if these calls provide any more validation than just\ncalling .toHaveValue(...). In any case, there are e2e tests that\nalready perform this same validation for correctness. For the purposes\nof benchmarks, it is better to lower the overhead of the benchmarks\nthemselves as much as possible, to make the small real performance\nimpact of changes more apparent.",
          "timestamp": "2026-01-29T18:14:06-05:00",
          "tree_id": "4f81bc6005764b8eb26437d4598771bca7afd6f6",
          "url": "https://github.com/ramonrsv/sci-cream/commit/1c99169109d056c1254588e6ad4dd3cf9cbd8435"
        },
        "date": 1769728782561,
        "tool": "cargo",
        "benches": [
          {
            "name": "bridge.calculate_recipe_composition",
            "value": 3541,
            "range": "± 30",
            "unit": "ns/iter"
          },
          {
            "name": "bridge.calculate_recipe_mix_properties",
            "value": 162327,
            "range": "± 3375",
            "unit": "ns/iter"
          },
          {
            "name": "recipe.calculate_composition",
            "value": 2006,
            "range": "± 30",
            "unit": "ns/iter"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 164001,
            "range": "± 6747",
            "unit": "ns/iter"
          },
          {
            "name": "sweetener_spec_into_composition",
            "value": 309,
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
          "id": "f6970504f4cbed3978b788757e8216c40e61b4c5",
          "message": "Add CI caching of downloaded Playwright browsers",
          "timestamp": "2026-01-29T20:42:47-05:00",
          "tree_id": "60fd74e4d9f8ccb6820da35c7255fba968a26759",
          "url": "https://github.com/ramonrsv/sci-cream/commit/f6970504f4cbed3978b788757e8216c40e61b4c5"
        },
        "date": 1769737495759,
        "tool": "cargo",
        "benches": [
          {
            "name": "bridge.calculate_recipe_composition",
            "value": 3213,
            "range": "± 80",
            "unit": "ns/iter"
          },
          {
            "name": "bridge.calculate_recipe_mix_properties",
            "value": 130961,
            "range": "± 1209",
            "unit": "ns/iter"
          },
          {
            "name": "recipe.calculate_composition",
            "value": 1652,
            "range": "± 46",
            "unit": "ns/iter"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 131518,
            "range": "± 2192",
            "unit": "ns/iter"
          },
          {
            "name": "sweetener_spec_into_composition",
            "value": 275,
            "range": "± 14",
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
          "id": "9c2ff566436d29257675915c000e72ffc387e5cf",
          "message": "Add support for `IngCompGrid` to show references\n\n* Add support for `IngredientCompositionGrid` to select and show the\n  composition of reference recipes as well as the main recipe.\n* Create a shared `RecipeSelection` component for the common\n  recipe-selection functionality, also used by `RecipeGrid`.\n* Add custom functionality for the recipe selection component in\n  `IngredientCompositionGrid` to disappear if there are no reference\n  recipes, but to be sticky if a reference recipe is currently selected.\n  This prevents jarring jumps back to the main recipe if a reference is\n  cleared, and having to re-select it if a new ref recipe is pasted.",
          "timestamp": "2026-01-30T13:08:13-05:00",
          "tree_id": "a4011ffdb4a5d0c5e88ab2d0d9c90062dcd842b6",
          "url": "https://github.com/ramonrsv/sci-cream/commit/9c2ff566436d29257675915c000e72ffc387e5cf"
        },
        "date": 1769812435636,
        "tool": "cargo",
        "benches": [
          {
            "name": "bridge.calculate_recipe_composition",
            "value": 3822,
            "range": "± 107",
            "unit": "ns/iter"
          },
          {
            "name": "bridge.calculate_recipe_mix_properties",
            "value": 193415,
            "range": "± 5400",
            "unit": "ns/iter"
          },
          {
            "name": "recipe.calculate_composition",
            "value": 2243,
            "range": "± 28",
            "unit": "ns/iter"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 193983,
            "range": "± 1915",
            "unit": "ns/iter"
          },
          {
            "name": "sweetener_spec_into_composition",
            "value": 369,
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
          "id": "777763be6bf6a52c65b64f59ca1b3864a2b817c7",
          "message": "Add TODO about storing component layout in local",
          "timestamp": "2026-01-30T13:47:26-05:00",
          "tree_id": "d8a46dbf1dae968a1817a419c43cd1cff35333eb",
          "url": "https://github.com/ramonrsv/sci-cream/commit/777763be6bf6a52c65b64f59ca1b3864a2b817c7"
        },
        "date": 1769813565827,
        "tool": "cargo",
        "benches": [
          {
            "name": "bridge.calculate_recipe_composition",
            "value": 3488,
            "range": "± 17",
            "unit": "ns/iter"
          },
          {
            "name": "bridge.calculate_recipe_mix_properties",
            "value": 161569,
            "range": "± 7277",
            "unit": "ns/iter"
          },
          {
            "name": "recipe.calculate_composition",
            "value": 2025,
            "range": "± 8",
            "unit": "ns/iter"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 160555,
            "range": "± 694",
            "unit": "ns/iter"
          },
          {
            "name": "sweetener_spec_into_composition",
            "value": 310,
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
          "id": "b221ee30ab5dcc37854bdce2a8cb29d7e3661bc2",
          "message": "Use non-default ports in CI so no local conflicts",
          "timestamp": "2026-01-30T13:57:42-05:00",
          "tree_id": "4e567cb684afcb8102a6fbb5a9ceb138ea4197b6",
          "url": "https://github.com/ramonrsv/sci-cream/commit/b221ee30ab5dcc37854bdce2a8cb29d7e3661bc2"
        },
        "date": 1769814464523,
        "tool": "cargo",
        "benches": [
          {
            "name": "bridge.calculate_recipe_composition",
            "value": 3585,
            "range": "± 40",
            "unit": "ns/iter"
          },
          {
            "name": "bridge.calculate_recipe_mix_properties",
            "value": 161295,
            "range": "± 958",
            "unit": "ns/iter"
          },
          {
            "name": "recipe.calculate_composition",
            "value": 2033,
            "range": "± 23",
            "unit": "ns/iter"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 160091,
            "range": "± 982",
            "unit": "ns/iter"
          },
          {
            "name": "sweetener_spec_into_composition",
            "value": 326,
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
          "id": "aa83fe395d01924a6b34b6329797e209cea52e60",
          "message": "* Overhaul `RecipeContext` updates, more modular\n\n* Overhaul the helper functions for `RecipeContext` updates to be more\n  modular and flexible; most can now be pulled out `RecipeGrid` as\n  standalone functions, with the only additional dependency being\n  `RecipeResources`. Recipe copy/paste functions are also made more\n  modular, separating the stringifying/parsing, recipe context update,\n  and clipboard interactions elements. These changes are in preparation\n  for adding support to save recipes in local storage, to persist across\n  browser window refreshes.\n* From above, the new `updateRecipes(...: Recipe[])` method is notable.\n  It updates multiple recipes at once, with a single state update. This\n  is necessary when updating multiple recipes at once, e.g. in the\n  useEffect to prevent stale ingredient context, otherwise dependent\n  components may asynchronously try to render stale `Composition` or\n  `MixProperties` objects, which can lead to crashes due to freed WASM\n  memory.\n* Fix a bug in the `useEffect` to prevent stale ingredient context\n  before the recipe resources have been populated. It was previously\n  only refreshing the main recipe; now it refreshes the references as\n  well. End-to-end tests that validate this functionality are updated\n  to also check the reference recipes.",
          "timestamp": "2026-01-30T17:52:26-05:00",
          "tree_id": "45a352a0088b2f5452ea3098d1df25ef3f205e30",
          "url": "https://github.com/ramonrsv/sci-cream/commit/aa83fe395d01924a6b34b6329797e209cea52e60"
        },
        "date": 1769814853981,
        "tool": "cargo",
        "benches": [
          {
            "name": "bridge.calculate_recipe_composition",
            "value": 3550,
            "range": "± 97",
            "unit": "ns/iter"
          },
          {
            "name": "bridge.calculate_recipe_mix_properties",
            "value": 162513,
            "range": "± 1084",
            "unit": "ns/iter"
          },
          {
            "name": "recipe.calculate_composition",
            "value": 1975,
            "range": "± 30",
            "unit": "ns/iter"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 160759,
            "range": "± 1311",
            "unit": "ns/iter"
          },
          {
            "name": "sweetener_spec_into_composition",
            "value": 314,
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
          "id": "7028bada959f97bea8f38ca75ad31c915569aceb",
          "message": "Add support to periodically save recipes in local\n\nAdd support to periodically (every ~2s) save recipes in local storage\nso that the persist across page reloads. Add new end-to-end tests to\nverify this functionality.",
          "timestamp": "2026-01-30T18:27:16-05:00",
          "tree_id": "1980350a1d03d627e4acfb64361d93f4b1ffc03e",
          "url": "https://github.com/ramonrsv/sci-cream/commit/7028bada959f97bea8f38ca75ad31c915569aceb"
        },
        "date": 1769815786261,
        "tool": "cargo",
        "benches": [
          {
            "name": "bridge.calculate_recipe_composition",
            "value": 3531,
            "range": "± 51",
            "unit": "ns/iter"
          },
          {
            "name": "bridge.calculate_recipe_mix_properties",
            "value": 161449,
            "range": "± 1574",
            "unit": "ns/iter"
          },
          {
            "name": "recipe.calculate_composition",
            "value": 1973,
            "range": "± 40",
            "unit": "ns/iter"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 159807,
            "range": "± 772",
            "unit": "ns/iter"
          },
          {
            "name": "sweetener_spec_into_composition",
            "value": 316,
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
          "id": "b552c64fc042faa53f3a05428116f36d81e493fa",
          "message": "Add empty <div></div> around ing composition table\n\nThis is in preparation for the upcoming left-hand-side ingredient and\nquantities table, so clean up the diff affected by indentation.",
          "timestamp": "2026-01-30T23:00:46-05:00",
          "tree_id": "a9c09c14b52f1a361f21be4d15c669b2f0af9499",
          "url": "https://github.com/ramonrsv/sci-cream/commit/b552c64fc042faa53f3a05428116f36d81e493fa"
        },
        "date": 1769832633480,
        "tool": "cargo",
        "benches": [
          {
            "name": "bridge.calculate_recipe_composition",
            "value": 3535,
            "range": "± 62",
            "unit": "ns/iter"
          },
          {
            "name": "bridge.calculate_recipe_mix_properties",
            "value": 161562,
            "range": "± 903",
            "unit": "ns/iter"
          },
          {
            "name": "recipe.calculate_composition",
            "value": 1974,
            "range": "± 76",
            "unit": "ns/iter"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 160567,
            "range": "± 3278",
            "unit": "ns/iter"
          },
          {
            "name": "sweetener_spec_into_composition",
            "value": 313,
            "range": "± 4",
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
          "id": "b4b1b84ad326c723e81d06ab5f2f40ddcdb7cd49",
          "message": "Add ingredient and quanity column to `IngCompGrid`\n\nAdd two left columns to `IngredientCompositionGrid`, to show the\ncorresponding ingredient name and quantity (affected by QtyToggle).\nThese columns are actually a separate table, to which the\noverflow-x-auto does not apply, so it's not affected by a scrollbar.",
          "timestamp": "2026-01-31T00:31:23-05:00",
          "tree_id": "ce243172be9bf41530c16b313c3720838bfad91d",
          "url": "https://github.com/ramonrsv/sci-cream/commit/b4b1b84ad326c723e81d06ab5f2f40ddcdb7cd49"
        },
        "date": 1769837723428,
        "tool": "cargo",
        "benches": [
          {
            "name": "bridge.calculate_recipe_composition",
            "value": 3591,
            "range": "± 46",
            "unit": "ns/iter"
          },
          {
            "name": "bridge.calculate_recipe_mix_properties",
            "value": 162239,
            "range": "± 5465",
            "unit": "ns/iter"
          },
          {
            "name": "recipe.calculate_composition",
            "value": 2020,
            "range": "± 18",
            "unit": "ns/iter"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 161719,
            "range": "± 1115",
            "unit": "ns/iter"
          },
          {
            "name": "sweetener_spec_into_composition",
            "value": 310,
            "range": "± 7",
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
          "id": "0ba39247a814820828c313942d54681ab8c02f55",
          "message": "Add README.md links to GitHub pages and benchmarks",
          "timestamp": "2026-01-20T21:46:52-05:00",
          "tree_id": "293e979812432f593b3c6900c208a92879ec2e85",
          "url": "https://github.com/ramonrsv/sci-cream/commit/0ba39247a814820828c313942d54681ab8c02f55"
        },
        "date": 1768963989334,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "allIngredientSpecs.find, first",
            "value": 90619914,
            "range": "±2.42%",
            "unit": "ops/sec",
            "extra": "88 samples"
          },
          {
            "name": "allIngredientSpecs.find, last",
            "value": 1492019,
            "range": "±1.64%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "getIngredientSpecByName, first",
            "value": 77827264,
            "range": "±2.73%",
            "unit": "ops/sec",
            "extra": "86 samples"
          },
          {
            "name": "getIngredientSpecByName, last",
            "value": 1783982,
            "range": "±0.51%",
            "unit": "ops/sec",
            "extra": "89 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, first",
            "value": 557709,
            "range": "±0.59%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, last",
            "value": 508047,
            "range": "±0.60%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, first)",
            "value": 299908,
            "range": "±0.66%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, last)",
            "value": 241064,
            "range": "±0.59%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, first)",
            "value": 173868,
            "range": "±0.80%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, last)",
            "value": 146095,
            "range": "±0.72%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, first)",
            "value": 305180,
            "range": "±0.44%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, last)",
            "value": 291963,
            "range": "±0.44%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, first",
            "value": 1885138,
            "range": "±0.80%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, last",
            "value": 1756798,
            "range": "±0.92%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, first",
            "value": 1891403,
            "range": "±0.92%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, last",
            "value": 1751288,
            "range": "±0.82%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Dark Rum)",
            "value": 297900,
            "range": "±0.55%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Whey Isolate)",
            "value": 104371,
            "range": "±0.34%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "into_ingredient_from_spec, multiple",
            "value": 31982,
            "range": "±0.26%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "cloneRecipeLines",
            "value": 5402,
            "range": "±38.84%",
            "unit": "ops/sec",
            "extra": "13 samples"
          },
          {
            "name": "makeRecipeLines",
            "value": 19546,
            "range": "±0.82%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "makeRecipeFromClonedLines",
            "value": 2076,
            "range": "±10.40%",
            "unit": "ops/sec",
            "extra": "16 samples"
          },
          {
            "name": "makeRecipeFromMadeLines",
            "value": 18526,
            "range": "±1.41%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_composition",
            "value": 1499,
            "range": "±8.09%",
            "unit": "ops/sec",
            "extra": "11 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_composition",
            "value": 16547,
            "range": "±7.23%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "bridge.calculate_recipe_composition",
            "value": 88374,
            "range": "±0.87%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "recipe.calculate_composition",
            "value": 217405,
            "range": "±0.31%",
            "unit": "ops/sec",
            "extra": "98 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_mix_properties",
            "value": 1092,
            "range": "±9.63%",
            "unit": "ops/sec",
            "extra": "13 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_mix_properties",
            "value": 12165,
            "range": "±7.09%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "bridge.calculate_recipe_mix_properties",
            "value": 32638,
            "range": "±0.12%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 41769,
            "range": "±0.14%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "makeRecipeLines, free",
            "value": 19582,
            "range": "±2.63%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "cloneRecipeLines, free",
            "value": 1195,
            "range": "±5.23%",
            "unit": "ops/sec",
            "extra": "9 samples"
          },
          {
            "name": "makeRecipeLines, no free",
            "value": 796,
            "range": "±8.26%",
            "unit": "ops/sec",
            "extra": "18 samples"
          },
          {
            "name": "cloneRecipeLines, no free",
            "value": 899,
            "range": "±8.94%",
            "unit": "ops/sec",
            "extra": "8 samples"
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
          "id": "feb42eb0469fe7e2ef00c0d0de99e91e0ec6d777",
          "message": "Improve format of app bench logs, remove from test",
          "timestamp": "2026-01-21T01:38:23-05:00",
          "tree_id": "01b0e70a9f85161d5893f2509b3faba9d4675158",
          "url": "https://github.com/ramonrsv/sci-cream/commit/feb42eb0469fe7e2ef00c0d0de99e91e0ec6d777"
        },
        "date": 1768977828632,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "allIngredientSpecs.find, first",
            "value": 95157933,
            "range": "±4.11%",
            "unit": "ops/sec",
            "extra": "83 samples"
          },
          {
            "name": "allIngredientSpecs.find, last",
            "value": 1775477,
            "range": "±1.26%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "getIngredientSpecByName, first",
            "value": 77432444,
            "range": "±2.75%",
            "unit": "ops/sec",
            "extra": "84 samples"
          },
          {
            "name": "getIngredientSpecByName, last",
            "value": 2143178,
            "range": "±0.58%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, first",
            "value": 603541,
            "range": "±0.55%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, last",
            "value": 538701,
            "range": "±0.58%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, first)",
            "value": 301778,
            "range": "±0.59%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, last)",
            "value": 242850,
            "range": "±0.64%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, first)",
            "value": 162457,
            "range": "±0.85%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, last)",
            "value": 137611,
            "range": "±0.84%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, first)",
            "value": 299309,
            "range": "±0.45%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, last)",
            "value": 287451,
            "range": "±0.46%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, first",
            "value": 1947533,
            "range": "±0.98%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, last",
            "value": 1825564,
            "range": "±0.96%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, first",
            "value": 1944061,
            "range": "±0.87%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, last",
            "value": 1830860,
            "range": "±0.84%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Dark Rum)",
            "value": 290987,
            "range": "±0.33%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Whey Isolate)",
            "value": 101018,
            "range": "±0.46%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "into_ingredient_from_spec, multiple",
            "value": 31256,
            "range": "±0.29%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "cloneRecipeLines",
            "value": 6408,
            "range": "±35.93%",
            "unit": "ops/sec",
            "extra": "14 samples"
          },
          {
            "name": "makeRecipeLines",
            "value": 19250,
            "range": "±0.76%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "makeRecipeFromClonedLines",
            "value": 2723,
            "range": "±6.61%",
            "unit": "ops/sec",
            "extra": "23 samples"
          },
          {
            "name": "makeRecipeFromMadeLines",
            "value": 18031,
            "range": "±1.74%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_composition",
            "value": 2050,
            "range": "±11.60%",
            "unit": "ops/sec",
            "extra": "21 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_composition",
            "value": 17065,
            "range": "±0.69%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "bridge.calculate_recipe_composition",
            "value": 93746,
            "range": "±0.71%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "recipe.calculate_composition",
            "value": 252187,
            "range": "±0.30%",
            "unit": "ops/sec",
            "extra": "98 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_mix_properties",
            "value": 1403,
            "range": "±9.15%",
            "unit": "ops/sec",
            "extra": "15 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_mix_properties",
            "value": 12933,
            "range": "±0.40%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "bridge.calculate_recipe_mix_properties",
            "value": 34627,
            "range": "±0.26%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 44482,
            "range": "±0.14%",
            "unit": "ops/sec",
            "extra": "99 samples"
          },
          {
            "name": "makeRecipeLines, free",
            "value": 19365,
            "range": "±1.02%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "cloneRecipeLines, free",
            "value": 1554,
            "range": "±7.08%",
            "unit": "ops/sec",
            "extra": "8 samples"
          },
          {
            "name": "makeRecipeLines, no free",
            "value": 1132,
            "range": "±9.54%",
            "unit": "ops/sec",
            "extra": "24 samples"
          },
          {
            "name": "cloneRecipeLines, no free",
            "value": 1318,
            "range": "±6.02%",
            "unit": "ops/sec",
            "extra": "13 samples"
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
          "id": "d1916ab1f35752779e2ab4e106b2ef0edf44fc2c",
          "message": "Add App e2e bench for recipe switch in RecipeGrid",
          "timestamp": "2026-01-21T04:25:07-05:00",
          "tree_id": "fc248df690a9c417283f138a01427a672766ed84",
          "url": "https://github.com/ramonrsv/sci-cream/commit/d1916ab1f35752779e2ab4e106b2ef0edf44fc2c"
        },
        "date": 1769034852472,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "allIngredientSpecs.find, first",
            "value": 97676496,
            "range": "±3.86%",
            "unit": "ops/sec",
            "extra": "84 samples"
          },
          {
            "name": "allIngredientSpecs.find, last",
            "value": 1768569,
            "range": "±0.51%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "getIngredientSpecByName, first",
            "value": 78622817,
            "range": "±2.98%",
            "unit": "ops/sec",
            "extra": "87 samples"
          },
          {
            "name": "getIngredientSpecByName, last",
            "value": 2116379,
            "range": "±0.28%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, first",
            "value": 600738,
            "range": "±0.58%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, last",
            "value": 545007,
            "range": "±0.55%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, first)",
            "value": 295335,
            "range": "±0.69%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, last)",
            "value": 244172,
            "range": "±0.57%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, first)",
            "value": 164213,
            "range": "±0.78%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, last)",
            "value": 138693,
            "range": "±0.84%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, first)",
            "value": 297163,
            "range": "±0.40%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, last)",
            "value": 288340,
            "range": "±0.46%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, first",
            "value": 1945005,
            "range": "±0.86%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, last",
            "value": 1808105,
            "range": "±0.87%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, first",
            "value": 1960879,
            "range": "±0.86%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, last",
            "value": 1832503,
            "range": "±0.75%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Dark Rum)",
            "value": 292543,
            "range": "±0.42%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Whey Isolate)",
            "value": 103066,
            "range": "±0.31%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "into_ingredient_from_spec, multiple",
            "value": 31750,
            "range": "±0.33%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "cloneRecipeLines",
            "value": 7044,
            "range": "±30.94%",
            "unit": "ops/sec",
            "extra": "15 samples"
          },
          {
            "name": "makeRecipeLines",
            "value": 19121,
            "range": "±1.23%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "makeRecipeFromClonedLines",
            "value": 2851,
            "range": "±7.42%",
            "unit": "ops/sec",
            "extra": "25 samples"
          },
          {
            "name": "makeRecipeFromMadeLines",
            "value": 18324,
            "range": "±0.32%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_composition",
            "value": 2015,
            "range": "±5.81%",
            "unit": "ops/sec",
            "extra": "17 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_composition",
            "value": 16909,
            "range": "±7.06%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "bridge.calculate_recipe_composition",
            "value": 95680,
            "range": "±0.48%",
            "unit": "ops/sec",
            "extra": "99 samples"
          },
          {
            "name": "recipe.calculate_composition",
            "value": 250417,
            "range": "±0.85%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_mix_properties",
            "value": 1391,
            "range": "±8.64%",
            "unit": "ops/sec",
            "extra": "22 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_mix_properties",
            "value": 12809,
            "range": "±5.66%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "bridge.calculate_recipe_mix_properties",
            "value": 34703,
            "range": "±0.11%",
            "unit": "ops/sec",
            "extra": "99 samples"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 44878,
            "range": "±0.05%",
            "unit": "ops/sec",
            "extra": "100 samples"
          },
          {
            "name": "makeRecipeLines, free",
            "value": 19673,
            "range": "±0.91%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "cloneRecipeLines, free",
            "value": 1715,
            "range": "±8.41%",
            "unit": "ops/sec",
            "extra": "14 samples"
          },
          {
            "name": "makeRecipeLines, no free",
            "value": 295,
            "range": "±156.78%",
            "unit": "ops/sec",
            "extra": "23 samples"
          },
          {
            "name": "cloneRecipeLines, no free",
            "value": 1294,
            "range": "±9.04%",
            "unit": "ops/sec",
            "extra": "15 samples"
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
          "id": "930b83a2eda0cd72894beb767bdc24f36f0ce037",
          "message": "Add App benches for rapid ingredient qty updates",
          "timestamp": "2026-01-21T13:37:27-05:00",
          "tree_id": "3b84020a999964040b742ec916294dd4ebcbd38b",
          "url": "https://github.com/ramonrsv/sci-cream/commit/930b83a2eda0cd72894beb767bdc24f36f0ce037"
        },
        "date": 1769042416618,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "allIngredientSpecs.find, first",
            "value": 84369475,
            "range": "±3.64%",
            "unit": "ops/sec",
            "extra": "77 samples"
          },
          {
            "name": "allIngredientSpecs.find, last",
            "value": 1608049,
            "range": "±0.96%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "getIngredientSpecByName, first",
            "value": 75447591,
            "range": "±3.58%",
            "unit": "ops/sec",
            "extra": "84 samples"
          },
          {
            "name": "getIngredientSpecByName, last",
            "value": 1801840,
            "range": "±2.13%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, first",
            "value": 559840,
            "range": "±0.54%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, last",
            "value": 510038,
            "range": "±0.71%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, first)",
            "value": 302535,
            "range": "±0.53%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, last)",
            "value": 243959,
            "range": "±0.53%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, first)",
            "value": 173772,
            "range": "±0.82%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, last)",
            "value": 143762,
            "range": "±0.96%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, first)",
            "value": 307657,
            "range": "±0.51%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, last)",
            "value": 295147,
            "range": "±0.45%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, first",
            "value": 1895529,
            "range": "±0.84%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, last",
            "value": 1785335,
            "range": "±0.99%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, first",
            "value": 1929399,
            "range": "±0.77%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, last",
            "value": 1801392,
            "range": "±0.74%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Dark Rum)",
            "value": 297210,
            "range": "±0.39%",
            "unit": "ops/sec",
            "extra": "98 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Whey Isolate)",
            "value": 104025,
            "range": "±0.53%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "into_ingredient_from_spec, multiple",
            "value": 32101,
            "range": "±0.31%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "cloneRecipeLines",
            "value": 6395,
            "range": "±35.83%",
            "unit": "ops/sec",
            "extra": "15 samples"
          },
          {
            "name": "makeRecipeLines",
            "value": 19424,
            "range": "±1.71%",
            "unit": "ops/sec",
            "extra": "88 samples"
          },
          {
            "name": "makeRecipeFromClonedLines",
            "value": 2235,
            "range": "±10.17%",
            "unit": "ops/sec",
            "extra": "17 samples"
          },
          {
            "name": "makeRecipeFromMadeLines",
            "value": 18602,
            "range": "±0.65%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_composition",
            "value": 1073,
            "range": "±10.27%",
            "unit": "ops/sec",
            "extra": "52 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_composition",
            "value": 16513,
            "range": "±5.87%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "bridge.calculate_recipe_composition",
            "value": 90505,
            "range": "±0.49%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "recipe.calculate_composition",
            "value": 217370,
            "range": "±0.45%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_mix_properties",
            "value": 1090,
            "range": "±8.01%",
            "unit": "ops/sec",
            "extra": "13 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_mix_properties",
            "value": 12444,
            "range": "±4.80%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "bridge.calculate_recipe_mix_properties",
            "value": 32804,
            "range": "±0.09%",
            "unit": "ops/sec",
            "extra": "99 samples"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 41779,
            "range": "±0.06%",
            "unit": "ops/sec",
            "extra": "98 samples"
          },
          {
            "name": "makeRecipeLines, free",
            "value": 19664,
            "range": "±1.07%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "cloneRecipeLines, free",
            "value": 1256,
            "range": "±10.39%",
            "unit": "ops/sec",
            "extra": "7 samples"
          },
          {
            "name": "makeRecipeLines, no free",
            "value": 807,
            "range": "±9.40%",
            "unit": "ops/sec",
            "extra": "21 samples"
          },
          {
            "name": "cloneRecipeLines, no free",
            "value": 729,
            "range": "±22.27%",
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
          "id": "47235276c0f9486f54eed2b4b925c6e06f0bc447",
          "message": "Remove simulated network latency in db fetches\n\nThis was originally there to make inefficient loading more aparent.\nHowever, now that everything is loaded up front once, this isn't very\nmeaningful anymore, and it greatly slows down benchmark execution setup;\nmost actual performance measurements should be unaffected.",
          "timestamp": "2026-01-21T13:50:49-05:00",
          "tree_id": "2ad54da4b98c3d409bda6ce145277a89f351b016",
          "url": "https://github.com/ramonrsv/sci-cream/commit/47235276c0f9486f54eed2b4b925c6e06f0bc447"
        },
        "date": 1769042910389,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "allIngredientSpecs.find, first",
            "value": 85865425,
            "range": "±3.37%",
            "unit": "ops/sec",
            "extra": "81 samples"
          },
          {
            "name": "allIngredientSpecs.find, last",
            "value": 1612690,
            "range": "±0.36%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "getIngredientSpecByName, first",
            "value": 76172465,
            "range": "±3.37%",
            "unit": "ops/sec",
            "extra": "82 samples"
          },
          {
            "name": "getIngredientSpecByName, last",
            "value": 1763436,
            "range": "±0.45%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, first",
            "value": 548425,
            "range": "±0.59%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, last",
            "value": 512486,
            "range": "±0.77%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, first)",
            "value": 298618,
            "range": "±0.66%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, last)",
            "value": 239911,
            "range": "±0.51%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, first)",
            "value": 171688,
            "range": "±0.71%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, last)",
            "value": 144332,
            "range": "±0.77%",
            "unit": "ops/sec",
            "extra": "88 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, first)",
            "value": 302687,
            "range": "±0.86%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, last)",
            "value": 289790,
            "range": "±0.45%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, first",
            "value": 1874177,
            "range": "±0.88%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, last",
            "value": 1739376,
            "range": "±1.28%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, first",
            "value": 1916908,
            "range": "±0.78%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, last",
            "value": 1795553,
            "range": "±0.71%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Dark Rum)",
            "value": 295212,
            "range": "±0.81%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Whey Isolate)",
            "value": 103388,
            "range": "±0.35%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "into_ingredient_from_spec, multiple",
            "value": 31978,
            "range": "±0.21%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "cloneRecipeLines",
            "value": 5187,
            "range": "±43.27%",
            "unit": "ops/sec",
            "extra": "12 samples"
          },
          {
            "name": "makeRecipeLines",
            "value": 19358,
            "range": "±1.19%",
            "unit": "ops/sec",
            "extra": "89 samples"
          },
          {
            "name": "makeRecipeFromClonedLines",
            "value": 1731,
            "range": "±7.97%",
            "unit": "ops/sec",
            "extra": "49 samples"
          },
          {
            "name": "makeRecipeFromMadeLines",
            "value": 17778,
            "range": "±5.25%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_composition",
            "value": 1608,
            "range": "±10.69%",
            "unit": "ops/sec",
            "extra": "19 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_composition",
            "value": 17108,
            "range": "±0.30%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "bridge.calculate_recipe_composition",
            "value": 88657,
            "range": "±1.11%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "recipe.calculate_composition",
            "value": 216289,
            "range": "±0.45%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_mix_properties",
            "value": 1183,
            "range": "±11.56%",
            "unit": "ops/sec",
            "extra": "14 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_mix_properties",
            "value": 12734,
            "range": "±0.18%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "bridge.calculate_recipe_mix_properties",
            "value": 32814,
            "range": "±0.15%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 41326,
            "range": "±0.14%",
            "unit": "ops/sec",
            "extra": "98 samples"
          },
          {
            "name": "makeRecipeLines, free",
            "value": 19526,
            "range": "±2.88%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "cloneRecipeLines, free",
            "value": 1261,
            "range": "±11.02%",
            "unit": "ops/sec",
            "extra": "7 samples"
          },
          {
            "name": "makeRecipeLines, no free",
            "value": 784,
            "range": "±10.72%",
            "unit": "ops/sec",
            "extra": "18 samples"
          },
          {
            "name": "cloneRecipeLines, no free",
            "value": 990,
            "range": "±15.09%",
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
          "id": "c1f5a25b345549e2488d009fb0de3f6ce06144fb",
          "message": "Move e2e test assets to __tests__/assets, add more\n\n@todo There seems to be a stability issue when making many ingredient\nquantity updates, uncovered by the new longer list. Investigate and\nuncomment the full list once the issues have been resolved.",
          "timestamp": "2026-01-21T13:51:23-05:00",
          "tree_id": "81863959ffedc2e8553254a32e6fb59974ab40b8",
          "url": "https://github.com/ramonrsv/sci-cream/commit/c1f5a25b345549e2488d009fb0de3f6ce06144fb"
        },
        "date": 1769044424353,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "allIngredientSpecs.find, first",
            "value": 88775660,
            "range": "±3.07%",
            "unit": "ops/sec",
            "extra": "84 samples"
          },
          {
            "name": "allIngredientSpecs.find, last",
            "value": 1630611,
            "range": "±0.26%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "getIngredientSpecByName, first",
            "value": 76028861,
            "range": "±2.96%",
            "unit": "ops/sec",
            "extra": "80 samples"
          },
          {
            "name": "getIngredientSpecByName, last",
            "value": 1810826,
            "range": "±0.43%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, first",
            "value": 550561,
            "range": "±1.13%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, last",
            "value": 508046,
            "range": "±0.57%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, first)",
            "value": 297045,
            "range": "±0.62%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, last)",
            "value": 239005,
            "range": "±0.52%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, first)",
            "value": 171811,
            "range": "±1.55%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, last)",
            "value": 144834,
            "range": "±0.81%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, first)",
            "value": 302942,
            "range": "±0.59%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, last)",
            "value": 290205,
            "range": "±0.64%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, first",
            "value": 1883580,
            "range": "±0.94%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, last",
            "value": 1754037,
            "range": "±1.05%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, first",
            "value": 1899465,
            "range": "±0.91%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, last",
            "value": 1774827,
            "range": "±0.82%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Dark Rum)",
            "value": 297894,
            "range": "±0.39%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Whey Isolate)",
            "value": 105609,
            "range": "±0.26%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "into_ingredient_from_spec, multiple",
            "value": 32327,
            "range": "±0.32%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "cloneRecipeLines",
            "value": 5072,
            "range": "±36.86%",
            "unit": "ops/sec",
            "extra": "13 samples"
          },
          {
            "name": "makeRecipeLines",
            "value": 19180,
            "range": "±1.76%",
            "unit": "ops/sec",
            "extra": "89 samples"
          },
          {
            "name": "makeRecipeFromClonedLines",
            "value": 1952,
            "range": "±5.63%",
            "unit": "ops/sec",
            "extra": "19 samples"
          },
          {
            "name": "makeRecipeFromMadeLines",
            "value": 18424,
            "range": "±1.54%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_composition",
            "value": 1454,
            "range": "±9.25%",
            "unit": "ops/sec",
            "extra": "15 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_composition",
            "value": 16191,
            "range": "±8.26%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "bridge.calculate_recipe_composition",
            "value": 88972,
            "range": "±0.56%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "recipe.calculate_composition",
            "value": 214385,
            "range": "±0.54%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_mix_properties",
            "value": 1015,
            "range": "±8.90%",
            "unit": "ops/sec",
            "extra": "11 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_mix_properties",
            "value": 12064,
            "range": "±10.20%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "bridge.calculate_recipe_mix_properties",
            "value": 32907,
            "range": "±0.12%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 41819,
            "range": "±0.11%",
            "unit": "ops/sec",
            "extra": "98 samples"
          },
          {
            "name": "makeRecipeLines, free",
            "value": 19443,
            "range": "±3.77%",
            "unit": "ops/sec",
            "extra": "89 samples"
          },
          {
            "name": "cloneRecipeLines, free",
            "value": 1128,
            "range": "±10.80%",
            "unit": "ops/sec",
            "extra": "7 samples"
          },
          {
            "name": "makeRecipeLines, no free",
            "value": 731,
            "range": "±11.18%",
            "unit": "ops/sec",
            "extra": "17 samples"
          },
          {
            "name": "cloneRecipeLines, no free",
            "value": 855,
            "range": "±12.85%",
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
          "id": "7494de95a354d244a21389afb092461c5db95b64",
          "message": "Use ESLint --max-warnings=0 to treat warn as error",
          "timestamp": "2026-01-21T13:51:23-05:00",
          "tree_id": "8e1df33892b3d27ae855785526d81c166b203ef4",
          "url": "https://github.com/ramonrsv/sci-cream/commit/7494de95a354d244a21389afb092461c5db95b64"
        },
        "date": 1769065623306,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "allIngredientSpecs.find, first",
            "value": 99333261,
            "range": "±2.95%",
            "unit": "ops/sec",
            "extra": "86 samples"
          },
          {
            "name": "allIngredientSpecs.find, last",
            "value": 1788813,
            "range": "±1.01%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "getIngredientSpecByName, first",
            "value": 80875446,
            "range": "±2.09%",
            "unit": "ops/sec",
            "extra": "87 samples"
          },
          {
            "name": "getIngredientSpecByName, last",
            "value": 2139056,
            "range": "±0.24%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, first",
            "value": 613711,
            "range": "±0.39%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, last",
            "value": 545237,
            "range": "±0.51%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, first)",
            "value": 299968,
            "range": "±0.52%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, last)",
            "value": 242795,
            "range": "±0.60%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, first)",
            "value": 168434,
            "range": "±0.75%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, last)",
            "value": 139816,
            "range": "±0.74%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, first)",
            "value": 302901,
            "range": "±0.73%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, last)",
            "value": 290663,
            "range": "±0.65%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, first",
            "value": 1955498,
            "range": "±0.92%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, last",
            "value": 1816588,
            "range": "±1.02%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, first",
            "value": 1959524,
            "range": "±1.05%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, last",
            "value": 1828189,
            "range": "±0.84%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Dark Rum)",
            "value": 284986,
            "range": "±0.66%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Whey Isolate)",
            "value": 102860,
            "range": "±0.34%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "into_ingredient_from_spec, multiple",
            "value": 31695,
            "range": "±0.37%",
            "unit": "ops/sec",
            "extra": "99 samples"
          },
          {
            "name": "cloneRecipeLines",
            "value": 5864,
            "range": "±33.38%",
            "unit": "ops/sec",
            "extra": "14 samples"
          },
          {
            "name": "makeRecipeLines",
            "value": 19496,
            "range": "±0.98%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "makeRecipeFromClonedLines",
            "value": 2716,
            "range": "±6.33%",
            "unit": "ops/sec",
            "extra": "23 samples"
          },
          {
            "name": "makeRecipeFromMadeLines",
            "value": 18501,
            "range": "±1.01%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_composition",
            "value": 1986,
            "range": "±7.13%",
            "unit": "ops/sec",
            "extra": "15 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_composition",
            "value": 16251,
            "range": "±7.41%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "bridge.calculate_recipe_composition",
            "value": 93953,
            "range": "±1.03%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "recipe.calculate_composition",
            "value": 252512,
            "range": "±0.30%",
            "unit": "ops/sec",
            "extra": "99 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_mix_properties",
            "value": 1384,
            "range": "±7.28%",
            "unit": "ops/sec",
            "extra": "16 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_mix_properties",
            "value": 12542,
            "range": "±8.43%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "bridge.calculate_recipe_mix_properties",
            "value": 33951,
            "range": "±0.25%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 44912,
            "range": "±0.07%",
            "unit": "ops/sec",
            "extra": "100 samples"
          },
          {
            "name": "makeRecipeLines, free",
            "value": 19317,
            "range": "±2.71%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "cloneRecipeLines, free",
            "value": 1567,
            "range": "±9.05%",
            "unit": "ops/sec",
            "extra": "11 samples"
          },
          {
            "name": "makeRecipeLines, no free",
            "value": 1104,
            "range": "±11.42%",
            "unit": "ops/sec",
            "extra": "29 samples"
          },
          {
            "name": "cloneRecipeLines, no free",
            "value": 1348,
            "range": "±6.73%",
            "unit": "ops/sec",
            "extra": "14 samples"
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
          "id": "f685f79353477f217b5e592a6f3f108b5c6b650d",
          "message": "Fix pattern waiting for column headers to contain",
          "timestamp": "2026-01-21T14:59:11-05:00",
          "tree_id": "e37c94bc07c94ddc4578b07d11a176e4aa8cff2a",
          "url": "https://github.com/ramonrsv/sci-cream/commit/f685f79353477f217b5e592a6f3f108b5c6b650d"
        },
        "date": 1769066115992,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "allIngredientSpecs.find, first",
            "value": 89090080,
            "range": "±3.28%",
            "unit": "ops/sec",
            "extra": "87 samples"
          },
          {
            "name": "allIngredientSpecs.find, last",
            "value": 1615324,
            "range": "±1.63%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "getIngredientSpecByName, first",
            "value": 76963528,
            "range": "±3.14%",
            "unit": "ops/sec",
            "extra": "83 samples"
          },
          {
            "name": "getIngredientSpecByName, last",
            "value": 1832762,
            "range": "±0.51%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, first",
            "value": 555289,
            "range": "±0.55%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, last",
            "value": 509081,
            "range": "±0.60%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, first)",
            "value": 296051,
            "range": "±0.64%",
            "unit": "ops/sec",
            "extra": "89 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, last)",
            "value": 238062,
            "range": "±0.52%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, first)",
            "value": 168227,
            "range": "±0.92%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, last)",
            "value": 140914,
            "range": "±0.80%",
            "unit": "ops/sec",
            "extra": "89 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, first)",
            "value": 303423,
            "range": "±0.46%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, last)",
            "value": 292998,
            "range": "±0.40%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, first",
            "value": 1944404,
            "range": "±0.84%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, last",
            "value": 1778657,
            "range": "±1.00%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, first",
            "value": 1950172,
            "range": "±0.78%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, last",
            "value": 1807928,
            "range": "±0.82%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Dark Rum)",
            "value": 298309,
            "range": "±0.43%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Whey Isolate)",
            "value": 103073,
            "range": "±0.30%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "into_ingredient_from_spec, multiple",
            "value": 31678,
            "range": "±0.29%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "cloneRecipeLines",
            "value": 5046,
            "range": "±39.05%",
            "unit": "ops/sec",
            "extra": "11 samples"
          },
          {
            "name": "makeRecipeLines",
            "value": 19432,
            "range": "±0.29%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "makeRecipeFromClonedLines",
            "value": 2270,
            "range": "±10.77%",
            "unit": "ops/sec",
            "extra": "14 samples"
          },
          {
            "name": "makeRecipeFromMadeLines",
            "value": 17985,
            "range": "±5.70%",
            "unit": "ops/sec",
            "extra": "89 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_composition",
            "value": 1193,
            "range": "±11.46%",
            "unit": "ops/sec",
            "extra": "43 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_composition",
            "value": 16482,
            "range": "±6.56%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "bridge.calculate_recipe_composition",
            "value": 89422,
            "range": "±0.61%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "recipe.calculate_composition",
            "value": 215967,
            "range": "±0.29%",
            "unit": "ops/sec",
            "extra": "98 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_mix_properties",
            "value": 1023,
            "range": "±8.62%",
            "unit": "ops/sec",
            "extra": "12 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_mix_properties",
            "value": 12207,
            "range": "±7.50%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "bridge.calculate_recipe_mix_properties",
            "value": 32534,
            "range": "±0.10%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 41381,
            "range": "±0.05%",
            "unit": "ops/sec",
            "extra": "99 samples"
          },
          {
            "name": "makeRecipeLines, free",
            "value": 19868,
            "range": "±1.01%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "cloneRecipeLines, free",
            "value": 1298,
            "range": "±8.36%",
            "unit": "ops/sec",
            "extra": "7 samples"
          },
          {
            "name": "makeRecipeLines, no free",
            "value": 892,
            "range": "±12.07%",
            "unit": "ops/sec",
            "extra": "20 samples"
          },
          {
            "name": "cloneRecipeLines, no free",
            "value": 921,
            "range": "±10.75%",
            "unit": "ops/sec",
            "extra": "14 samples"
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
          "id": "0e383c927f66212dab7510582c33858eb4f46823",
          "message": "Add test to verify UI resilience to slow initial\n\nThis test simulates a slow initial load to ensure that recipe paste\nremains responsive and that the UI updates correctly once the data is\navailable. It should fail if the `useEffect` in `RecipeGrid` to \"Prevent\nstale ingredient rows if pasted quickly whilst... still loading...\" is\nremoved.",
          "timestamp": "2026-01-21T15:58:03-05:00",
          "tree_id": "103ec1568aeb1b80d558d3acf67e87986bd452e6",
          "url": "https://github.com/ramonrsv/sci-cream/commit/0e383c927f66212dab7510582c33858eb4f46823"
        },
        "date": 1769066181012,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "allIngredientSpecs.find, first",
            "value": 88824076,
            "range": "±2.80%",
            "unit": "ops/sec",
            "extra": "87 samples"
          },
          {
            "name": "allIngredientSpecs.find, last",
            "value": 1566966,
            "range": "±0.89%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "getIngredientSpecByName, first",
            "value": 78883928,
            "range": "±2.61%",
            "unit": "ops/sec",
            "extra": "89 samples"
          },
          {
            "name": "getIngredientSpecByName, last",
            "value": 1742808,
            "range": "±0.60%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, first",
            "value": 560236,
            "range": "±0.53%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, last",
            "value": 509027,
            "range": "±0.77%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, first)",
            "value": 299015,
            "range": "±0.60%",
            "unit": "ops/sec",
            "extra": "87 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, last)",
            "value": 238128,
            "range": "±0.46%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, first)",
            "value": 172714,
            "range": "±0.71%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, last)",
            "value": 144201,
            "range": "±0.69%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, first)",
            "value": 304729,
            "range": "±0.40%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, last)",
            "value": 287664,
            "range": "±0.69%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, first",
            "value": 1920324,
            "range": "±0.86%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, last",
            "value": 1791372,
            "range": "±0.96%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, first",
            "value": 1943211,
            "range": "±0.81%",
            "unit": "ops/sec",
            "extra": "86 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, last",
            "value": 1818951,
            "range": "±0.70%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Dark Rum)",
            "value": 297072,
            "range": "±0.32%",
            "unit": "ops/sec",
            "extra": "98 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Whey Isolate)",
            "value": 105573,
            "range": "±0.36%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "into_ingredient_from_spec, multiple",
            "value": 32249,
            "range": "±0.20%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "cloneRecipeLines",
            "value": 5931,
            "range": "±35.90%",
            "unit": "ops/sec",
            "extra": "15 samples"
          },
          {
            "name": "makeRecipeLines",
            "value": 19010,
            "range": "±3.59%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "makeRecipeFromClonedLines",
            "value": 2005,
            "range": "±8.29%",
            "unit": "ops/sec",
            "extra": "17 samples"
          },
          {
            "name": "makeRecipeFromMadeLines",
            "value": 17692,
            "range": "±6.21%",
            "unit": "ops/sec",
            "extra": "89 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_composition",
            "value": 1483,
            "range": "±6.14%",
            "unit": "ops/sec",
            "extra": "11 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_composition",
            "value": 16416,
            "range": "±7.54%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "bridge.calculate_recipe_composition",
            "value": 87044,
            "range": "±0.52%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "recipe.calculate_composition",
            "value": 198285,
            "range": "±0.27%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_mix_properties",
            "value": 1062,
            "range": "±10.32%",
            "unit": "ops/sec",
            "extra": "17 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_mix_properties",
            "value": 12257,
            "range": "±7.58%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "bridge.calculate_recipe_mix_properties",
            "value": 32559,
            "range": "±0.10%",
            "unit": "ops/sec",
            "extra": "99 samples"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 41164,
            "range": "±0.30%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "makeRecipeLines, free",
            "value": 19590,
            "range": "±3.29%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "cloneRecipeLines, free",
            "value": 1152,
            "range": "±7.38%",
            "unit": "ops/sec",
            "extra": "7 samples"
          },
          {
            "name": "makeRecipeLines, no free",
            "value": 838,
            "range": "±11.22%",
            "unit": "ops/sec",
            "extra": "19 samples"
          },
          {
            "name": "cloneRecipeLines, no free",
            "value": 986,
            "range": "±9.83%",
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
          "id": "d90e14e429d7794804e6a97016c85421b9523ce0",
          "message": "Format e2e benchmark result uploads to 2 decimals",
          "timestamp": "2026-01-22T02:15:46-05:00",
          "tree_id": "afb768f7f4cf98eefd1173be226a842923380490",
          "url": "https://github.com/ramonrsv/sci-cream/commit/d90e14e429d7794804e6a97016c85421b9523ce0"
        },
        "date": 1769066533269,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "allIngredientSpecs.find, first",
            "value": 85315952,
            "range": "±3.26%",
            "unit": "ops/sec",
            "extra": "82 samples"
          },
          {
            "name": "allIngredientSpecs.find, last",
            "value": 1638116,
            "range": "±0.83%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "getIngredientSpecByName, first",
            "value": 75579098,
            "range": "±3.26%",
            "unit": "ops/sec",
            "extra": "83 samples"
          },
          {
            "name": "getIngredientSpecByName, last",
            "value": 1835361,
            "range": "±0.35%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, first",
            "value": 561641,
            "range": "±0.56%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, last",
            "value": 512230,
            "range": "±0.88%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, first)",
            "value": 297054,
            "range": "±0.66%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, last)",
            "value": 237978,
            "range": "±0.51%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, first)",
            "value": 171848,
            "range": "±0.91%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, last)",
            "value": 143973,
            "range": "±0.79%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, first)",
            "value": 301035,
            "range": "±0.53%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, last)",
            "value": 289695,
            "range": "±0.40%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, first",
            "value": 1922395,
            "range": "±0.98%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, last",
            "value": 1778772,
            "range": "±1.11%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, first",
            "value": 1918651,
            "range": "±0.97%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, last",
            "value": 1812096,
            "range": "±0.73%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Dark Rum)",
            "value": 296578,
            "range": "±0.32%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Whey Isolate)",
            "value": 103761,
            "range": "±0.59%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "into_ingredient_from_spec, multiple",
            "value": 31977,
            "range": "±0.25%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "cloneRecipeLines",
            "value": 5145,
            "range": "±38.24%",
            "unit": "ops/sec",
            "extra": "13 samples"
          },
          {
            "name": "makeRecipeLines",
            "value": 18792,
            "range": "±1.11%",
            "unit": "ops/sec",
            "extra": "86 samples"
          },
          {
            "name": "makeRecipeFromClonedLines",
            "value": 1943,
            "range": "±12.38%",
            "unit": "ops/sec",
            "extra": "15 samples"
          },
          {
            "name": "makeRecipeFromMadeLines",
            "value": 17389,
            "range": "±7.34%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_composition",
            "value": 1468,
            "range": "±13.37%",
            "unit": "ops/sec",
            "extra": "11 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_composition",
            "value": 16113,
            "range": "±8.84%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "bridge.calculate_recipe_composition",
            "value": 88069,
            "range": "±2.02%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "recipe.calculate_composition",
            "value": 218421,
            "range": "±0.25%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_mix_properties",
            "value": 984,
            "range": "±8.89%",
            "unit": "ops/sec",
            "extra": "12 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_mix_properties",
            "value": 12091,
            "range": "±9.01%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "bridge.calculate_recipe_mix_properties",
            "value": 32928,
            "range": "±0.13%",
            "unit": "ops/sec",
            "extra": "98 samples"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 42014,
            "range": "±0.14%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "makeRecipeLines, free",
            "value": 19407,
            "range": "±2.90%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "cloneRecipeLines, free",
            "value": 1141,
            "range": "±9.02%",
            "unit": "ops/sec",
            "extra": "7 samples"
          },
          {
            "name": "makeRecipeLines, no free",
            "value": 647,
            "range": "±7.85%",
            "unit": "ops/sec",
            "extra": "17 samples"
          },
          {
            "name": "cloneRecipeLines, no free",
            "value": 837,
            "range": "±15.24%",
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
          "id": "21eb5d55eb18ed370bb0359ea40c814a1d60064b",
          "message": "Add 'database' feature for IngredientDatabase\n\n* Add 'database' feature to guard the inclusion of `IngredientDatabase`,\n  separate from 'data' for the inclusion of embedded ingredients data.\n\n* Add new `IngredientDatabase::seeded_from_embedded_data` that is\n  enabled if both 'database' and 'data' features are enabled.",
          "timestamp": "2026-01-26T12:24:59-05:00",
          "tree_id": "db248c3267f86917c0046d69d8fc5460aeb7db4a",
          "url": "https://github.com/ramonrsv/sci-cream/commit/21eb5d55eb18ed370bb0359ea40c814a1d60064b"
        },
        "date": 1769452660719,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "allIngredientSpecs.find, first",
            "value": 86765836,
            "range": "±3.86%",
            "unit": "ops/sec",
            "extra": "82 samples"
          },
          {
            "name": "allIngredientSpecs.find, last",
            "value": 1567501,
            "range": "±0.89%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "getIngredientSpecByName, first",
            "value": 78879537,
            "range": "±1.96%",
            "unit": "ops/sec",
            "extra": "87 samples"
          },
          {
            "name": "getIngredientSpecByName, last",
            "value": 1819782,
            "range": "±0.37%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, first",
            "value": 550819,
            "range": "±0.84%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, last",
            "value": 509106,
            "range": "±0.60%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, first)",
            "value": 291060,
            "range": "±0.98%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, last)",
            "value": 238270,
            "range": "±0.59%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, first)",
            "value": 168924,
            "range": "±0.92%",
            "unit": "ops/sec",
            "extra": "87 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, last)",
            "value": 143647,
            "range": "±0.84%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, first)",
            "value": 295176,
            "range": "±0.60%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, last)",
            "value": 289802,
            "range": "±0.46%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, first",
            "value": 1819753,
            "range": "±0.93%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, last",
            "value": 1701896,
            "range": "±1.09%",
            "unit": "ops/sec",
            "extra": "89 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, first",
            "value": 1804365,
            "range": "±1.02%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, last",
            "value": 1720356,
            "range": "±1.02%",
            "unit": "ops/sec",
            "extra": "89 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Dark Rum)",
            "value": 292664,
            "range": "±0.46%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Whey Isolate)",
            "value": 103501,
            "range": "±0.31%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "into_ingredient_from_spec, multiple",
            "value": 31514,
            "range": "±0.39%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "cloneRecipeLines",
            "value": 5069,
            "range": "±42.26%",
            "unit": "ops/sec",
            "extra": "12 samples"
          },
          {
            "name": "makeRecipeLines",
            "value": 19173,
            "range": "±1.78%",
            "unit": "ops/sec",
            "extra": "85 samples"
          },
          {
            "name": "makeRecipeFromClonedLines",
            "value": 1816,
            "range": "±8.62%",
            "unit": "ops/sec",
            "extra": "44 samples"
          },
          {
            "name": "makeRecipeFromMadeLines",
            "value": 17315,
            "range": "±8.93%",
            "unit": "ops/sec",
            "extra": "89 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_composition",
            "value": 1601,
            "range": "±8.33%",
            "unit": "ops/sec",
            "extra": "16 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_composition",
            "value": 16848,
            "range": "±0.36%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "bridge.calculate_recipe_composition",
            "value": 93998,
            "range": "±0.69%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "recipe.calculate_composition",
            "value": 243192,
            "range": "±0.51%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_mix_properties",
            "value": 1095,
            "range": "±10.13%",
            "unit": "ops/sec",
            "extra": "15 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_mix_properties",
            "value": 12426,
            "range": "±6.71%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "bridge.calculate_recipe_mix_properties",
            "value": 35116,
            "range": "±0.70%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 45892,
            "range": "±0.13%",
            "unit": "ops/sec",
            "extra": "99 samples"
          },
          {
            "name": "makeRecipeLines, free",
            "value": 19378,
            "range": "±1.56%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "cloneRecipeLines, free",
            "value": 1239,
            "range": "±8.35%",
            "unit": "ops/sec",
            "extra": "8 samples"
          },
          {
            "name": "makeRecipeLines, no free",
            "value": 796,
            "range": "±7.89%",
            "unit": "ops/sec",
            "extra": "21 samples"
          },
          {
            "name": "cloneRecipeLines, no free",
            "value": 1004,
            "range": "±11.49%",
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
          "id": "7d9af8bc7a9740ff545b98d5287aebdb35097995",
          "message": "Add memory usage benches and leak detection tests\n\n* Add peak memory usage benchmarks and memory leak detection tests.\n* Refactor __benches__/e2e and __tests__/e2e files, separating web\n  vitals, UI responsivness, and memory usage benches and tests.\n  Note that this requires the use of 'zzz-output-results.spec.ts`,\n  a hacky solution to collect and output results from multiple files.",
          "timestamp": "2026-01-26T18:08:36-05:00",
          "tree_id": "1ef54eb311adf1f9c84f0c04df75a7dcd16bbc8c",
          "url": "https://github.com/ramonrsv/sci-cream/commit/7d9af8bc7a9740ff545b98d5287aebdb35097995"
        },
        "date": 1769469184928,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "allIngredientSpecs.find, first",
            "value": 86477269,
            "range": "±3.26%",
            "unit": "ops/sec",
            "extra": "86 samples"
          },
          {
            "name": "allIngredientSpecs.find, last",
            "value": 1643893,
            "range": "±0.75%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "getIngredientSpecByName, first",
            "value": 75428426,
            "range": "±3.58%",
            "unit": "ops/sec",
            "extra": "82 samples"
          },
          {
            "name": "getIngredientSpecByName, last",
            "value": 1848015,
            "range": "±0.32%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, first",
            "value": 559165,
            "range": "±0.56%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, last",
            "value": 518749,
            "range": "±0.65%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, first)",
            "value": 298861,
            "range": "±0.80%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, last)",
            "value": 241277,
            "range": "±0.49%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, first)",
            "value": 175392,
            "range": "±0.65%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, last)",
            "value": 148121,
            "range": "±0.67%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, first)",
            "value": 302227,
            "range": "±0.44%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, last)",
            "value": 295054,
            "range": "±0.39%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, first",
            "value": 1819220,
            "range": "±0.76%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, last",
            "value": 1684162,
            "range": "±0.91%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, first",
            "value": 1822697,
            "range": "±0.78%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, last",
            "value": 1711008,
            "range": "±0.77%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Dark Rum)",
            "value": 299231,
            "range": "±0.33%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Whey Isolate)",
            "value": 105674,
            "range": "±0.35%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "into_ingredient_from_spec, multiple",
            "value": 32251,
            "range": "±0.54%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "cloneRecipeLines",
            "value": 6001,
            "range": "±37.86%",
            "unit": "ops/sec",
            "extra": "15 samples"
          },
          {
            "name": "makeRecipeLines",
            "value": 19499,
            "range": "±1.00%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "makeRecipeFromClonedLines",
            "value": 1851,
            "range": "±7.26%",
            "unit": "ops/sec",
            "extra": "43 samples"
          },
          {
            "name": "makeRecipeFromMadeLines",
            "value": 18732,
            "range": "±0.51%",
            "unit": "ops/sec",
            "extra": "98 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_composition",
            "value": 1525,
            "range": "±8.81%",
            "unit": "ops/sec",
            "extra": "18 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_composition",
            "value": 16856,
            "range": "±5.98%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "bridge.calculate_recipe_composition",
            "value": 93836,
            "range": "±1.21%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "recipe.calculate_composition",
            "value": 246997,
            "range": "±0.31%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_mix_properties",
            "value": 1169,
            "range": "±6.78%",
            "unit": "ops/sec",
            "extra": "14 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_mix_properties",
            "value": 12649,
            "range": "±6.37%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "bridge.calculate_recipe_mix_properties",
            "value": 35446,
            "range": "±0.12%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 45847,
            "range": "±0.11%",
            "unit": "ops/sec",
            "extra": "98 samples"
          },
          {
            "name": "makeRecipeLines, free",
            "value": 19877,
            "range": "±1.36%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "cloneRecipeLines, free",
            "value": 1248,
            "range": "±9.13%",
            "unit": "ops/sec",
            "extra": "7 samples"
          },
          {
            "name": "makeRecipeLines, no free",
            "value": 812,
            "range": "±11.74%",
            "unit": "ops/sec",
            "extra": "20 samples"
          },
          {
            "name": "cloneRecipeLines, no free",
            "value": 1025,
            "range": "±10.59%",
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
          "id": "1c5425dc5b57c23df5731cfb7930f212c4898d08",
          "message": "Resolve stability issues and enable full assets\n\nThe stability issues turned out to be that the 30s test timeout was\nbeing reached, but the error messages were a bit cryptic. Setting a\nlonger timeout on the failing tests resolves the issue, and allows the\nfull set of assets to be enabled.",
          "timestamp": "2026-01-26T18:25:20-05:00",
          "tree_id": "c0c7605091751bd113b5f98e8a05901420ac1cc0",
          "url": "https://github.com/ramonrsv/sci-cream/commit/1c5425dc5b57c23df5731cfb7930f212c4898d08"
        },
        "date": 1769470295515,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "allIngredientSpecs.find, first",
            "value": 88318333,
            "range": "±3.55%",
            "unit": "ops/sec",
            "extra": "87 samples"
          },
          {
            "name": "allIngredientSpecs.find, last",
            "value": 1595426,
            "range": "±1.44%",
            "unit": "ops/sec",
            "extra": "87 samples"
          },
          {
            "name": "getIngredientSpecByName, first",
            "value": 76817944,
            "range": "±2.66%",
            "unit": "ops/sec",
            "extra": "85 samples"
          },
          {
            "name": "getIngredientSpecByName, last",
            "value": 1857965,
            "range": "±0.29%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, first",
            "value": 563610,
            "range": "±0.53%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, last",
            "value": 516399,
            "range": "±0.80%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, first)",
            "value": 297334,
            "range": "±0.59%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, last)",
            "value": 244157,
            "range": "±0.57%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, first)",
            "value": 172783,
            "range": "±0.74%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, last)",
            "value": 143625,
            "range": "±0.76%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, first)",
            "value": 302513,
            "range": "±0.45%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, last)",
            "value": 293759,
            "range": "±0.42%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, first",
            "value": 1809185,
            "range": "±0.91%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, last",
            "value": 1697907,
            "range": "±0.97%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, first",
            "value": 1840148,
            "range": "±0.70%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, last",
            "value": 1729506,
            "range": "±0.75%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Dark Rum)",
            "value": 297234,
            "range": "±0.33%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Whey Isolate)",
            "value": 104409,
            "range": "±0.34%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "into_ingredient_from_spec, multiple",
            "value": 31549,
            "range": "±0.94%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "cloneRecipeLines",
            "value": 5875,
            "range": "±38.62%",
            "unit": "ops/sec",
            "extra": "14 samples"
          },
          {
            "name": "makeRecipeLines",
            "value": 19146,
            "range": "±1.67%",
            "unit": "ops/sec",
            "extra": "89 samples"
          },
          {
            "name": "makeRecipeFromClonedLines",
            "value": 1739,
            "range": "±6.22%",
            "unit": "ops/sec",
            "extra": "47 samples"
          },
          {
            "name": "makeRecipeFromMadeLines",
            "value": 17756,
            "range": "±6.55%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_composition",
            "value": 1554,
            "range": "±8.40%",
            "unit": "ops/sec",
            "extra": "19 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_composition",
            "value": 16347,
            "range": "±8.56%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "bridge.calculate_recipe_composition",
            "value": 95050,
            "range": "±0.48%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "recipe.calculate_composition",
            "value": 245500,
            "range": "±0.90%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_mix_properties",
            "value": 1134,
            "range": "±9.64%",
            "unit": "ops/sec",
            "extra": "16 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_mix_properties",
            "value": 12702,
            "range": "±7.16%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "bridge.calculate_recipe_mix_properties",
            "value": 35264,
            "range": "±0.57%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 46021,
            "range": "±0.07%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "makeRecipeLines, free",
            "value": 19556,
            "range": "±1.64%",
            "unit": "ops/sec",
            "extra": "89 samples"
          },
          {
            "name": "cloneRecipeLines, free",
            "value": 1258,
            "range": "±12.82%",
            "unit": "ops/sec",
            "extra": "7 samples"
          },
          {
            "name": "makeRecipeLines, no free",
            "value": 787,
            "range": "±10.19%",
            "unit": "ops/sec",
            "extra": "20 samples"
          },
          {
            "name": "cloneRecipeLines, no free",
            "value": 954,
            "range": "±9.45%",
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
          "id": "926ffb458e621e7d7fad304d5ae78d56c2fcc57c",
          "message": "Use global test.setTimeout for UI Perf Benchmarks",
          "timestamp": "2026-01-26T21:01:28-05:00",
          "tree_id": "27a1422a7b739e5d7130a8200a50d79a83725258",
          "url": "https://github.com/ramonrsv/sci-cream/commit/926ffb458e621e7d7fad304d5ae78d56c2fcc57c"
        },
        "date": 1769479581540,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "allIngredientSpecs.find, first",
            "value": 83471511,
            "range": "±4.44%",
            "unit": "ops/sec",
            "extra": "82 samples"
          },
          {
            "name": "allIngredientSpecs.find, last",
            "value": 1657267,
            "range": "±0.35%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "getIngredientSpecByName, first",
            "value": 76944514,
            "range": "±2.40%",
            "unit": "ops/sec",
            "extra": "87 samples"
          },
          {
            "name": "getIngredientSpecByName, last",
            "value": 1836846,
            "range": "±0.41%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, first",
            "value": 554443,
            "range": "±0.92%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, last",
            "value": 515387,
            "range": "±0.64%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, first)",
            "value": 297675,
            "range": "±0.56%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, last)",
            "value": 237175,
            "range": "±0.54%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, first)",
            "value": 168681,
            "range": "±0.80%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, last)",
            "value": 142860,
            "range": "±1.12%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, first)",
            "value": 301384,
            "range": "±0.43%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, last)",
            "value": 288718,
            "range": "±0.43%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, first",
            "value": 1808348,
            "range": "±0.71%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, last",
            "value": 1693339,
            "range": "±1.49%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, first",
            "value": 1831781,
            "range": "±0.79%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, last",
            "value": 1717418,
            "range": "±0.76%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Dark Rum)",
            "value": 294515,
            "range": "±0.34%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Whey Isolate)",
            "value": 104531,
            "range": "±0.35%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "into_ingredient_from_spec, multiple",
            "value": 32020,
            "range": "±0.29%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "cloneRecipeLines",
            "value": 4814,
            "range": "±36.32%",
            "unit": "ops/sec",
            "extra": "11 samples"
          },
          {
            "name": "makeRecipeLines",
            "value": 19321,
            "range": "±1.25%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "makeRecipeFromClonedLines",
            "value": 2076,
            "range": "±7.19%",
            "unit": "ops/sec",
            "extra": "19 samples"
          },
          {
            "name": "makeRecipeFromMadeLines",
            "value": 17888,
            "range": "±4.78%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_composition",
            "value": 1540,
            "range": "±6.06%",
            "unit": "ops/sec",
            "extra": "12 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_composition",
            "value": 16508,
            "range": "±7.51%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "bridge.calculate_recipe_composition",
            "value": 92078,
            "range": "±0.71%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "recipe.calculate_composition",
            "value": 246956,
            "range": "±0.30%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_mix_properties",
            "value": 945,
            "range": "±8.64%",
            "unit": "ops/sec",
            "extra": "15 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_mix_properties",
            "value": 12416,
            "range": "±9.49%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "bridge.calculate_recipe_mix_properties",
            "value": 34747,
            "range": "±0.15%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 45265,
            "range": "±0.05%",
            "unit": "ops/sec",
            "extra": "98 samples"
          },
          {
            "name": "makeRecipeLines, free",
            "value": 19885,
            "range": "±1.09%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "cloneRecipeLines, free",
            "value": 1144,
            "range": "±6.51%",
            "unit": "ops/sec",
            "extra": "9 samples"
          },
          {
            "name": "makeRecipeLines, no free",
            "value": 761,
            "range": "±9.07%",
            "unit": "ops/sec",
            "extra": "19 samples"
          },
          {
            "name": "cloneRecipeLines, no free",
            "value": 921,
            "range": "±7.87%",
            "unit": "ops/sec",
            "extra": "14 samples"
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
          "id": "8775e36fdcda6f7dbcdaeab6ca5685f353f8d6bf",
          "message": "Introduce `clean_reports.sh` and remove lock files\n\nIntroduce `scripts/clean_reports.sh` to clean up test, coverage, and\nbenchmark reports generated during development. Also remove `Cargo.lock`\nand `pnpm-lock.yaml` from `scripts/clean_workspace.sh`, now that these\nfiles are tracked in git version control.",
          "timestamp": "2026-01-27T12:05:22-05:00",
          "tree_id": "588d75888e073d6d9555fdcfd8c97c9104d7898a",
          "url": "https://github.com/ramonrsv/sci-cream/commit/8775e36fdcda6f7dbcdaeab6ca5685f353f8d6bf"
        },
        "date": 1769554405665,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "allIngredientSpecs.find, first",
            "value": 88607515,
            "range": "±3.23%",
            "unit": "ops/sec",
            "extra": "84 samples"
          },
          {
            "name": "allIngredientSpecs.find, last",
            "value": 1615685,
            "range": "±0.40%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "getIngredientSpecByName, first",
            "value": 75733835,
            "range": "±2.76%",
            "unit": "ops/sec",
            "extra": "82 samples"
          },
          {
            "name": "getIngredientSpecByName, last",
            "value": 1783819,
            "range": "±0.44%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, first",
            "value": 548194,
            "range": "±0.52%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, last",
            "value": 502762,
            "range": "±0.64%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, first)",
            "value": 302832,
            "range": "±0.54%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, last)",
            "value": 243303,
            "range": "±0.46%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, first)",
            "value": 173687,
            "range": "±0.81%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, last)",
            "value": 146108,
            "range": "±0.97%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, first)",
            "value": 307816,
            "range": "±0.43%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, last)",
            "value": 295342,
            "range": "±0.41%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, first",
            "value": 1865728,
            "range": "±0.82%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, last",
            "value": 1737067,
            "range": "±1.18%",
            "unit": "ops/sec",
            "extra": "89 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, first",
            "value": 1876856,
            "range": "±0.73%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, last",
            "value": 1796170,
            "range": "±0.73%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Dark Rum)",
            "value": 301000,
            "range": "±0.33%",
            "unit": "ops/sec",
            "extra": "98 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Whey Isolate)",
            "value": 105457,
            "range": "±0.29%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "into_ingredient_from_spec, multiple",
            "value": 32208,
            "range": "±0.25%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "cloneRecipeLines",
            "value": 5729,
            "range": "±37.61%",
            "unit": "ops/sec",
            "extra": "12 samples"
          },
          {
            "name": "makeRecipeLines",
            "value": 19933,
            "range": "±0.32%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "makeRecipeFromClonedLines",
            "value": 2115,
            "range": "±9.78%",
            "unit": "ops/sec",
            "extra": "13 samples"
          },
          {
            "name": "makeRecipeFromMadeLines",
            "value": 18254,
            "range": "±5.07%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_composition",
            "value": 1421,
            "range": "±10.53%",
            "unit": "ops/sec",
            "extra": "11 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_composition",
            "value": 16777,
            "range": "±7.32%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "bridge.calculate_recipe_composition",
            "value": 95077,
            "range": "±0.42%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "recipe.calculate_composition",
            "value": 245882,
            "range": "±0.69%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_mix_properties",
            "value": 1004,
            "range": "±7.63%",
            "unit": "ops/sec",
            "extra": "19 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_mix_properties",
            "value": 12747,
            "range": "±7.63%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "bridge.calculate_recipe_mix_properties",
            "value": 35308,
            "range": "±0.12%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 46253,
            "range": "±0.07%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "makeRecipeLines, free",
            "value": 19898,
            "range": "±3.16%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "cloneRecipeLines, free",
            "value": 1201,
            "range": "±7.41%",
            "unit": "ops/sec",
            "extra": "7 samples"
          },
          {
            "name": "makeRecipeLines, no free",
            "value": 720,
            "range": "±9.28%",
            "unit": "ops/sec",
            "extra": "16 samples"
          },
          {
            "name": "cloneRecipeLines, no free",
            "value": 975,
            "range": "±11.90%",
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
          "id": "d51c46dddf76c32e822310e23af42d72c05a893d",
          "message": "Separate free-vs-no-free from wasm bridge benches",
          "timestamp": "2026-01-27T12:33:29-05:00",
          "tree_id": "fd5c86f17ea4d07cad50a705b00710f68f0b72ab",
          "url": "https://github.com/ramonrsv/sci-cream/commit/d51c46dddf76c32e822310e23af42d72c05a893d"
        },
        "date": 1769554937637,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "allIngredientSpecs.find, first",
            "value": 88703510,
            "range": "±2.80%",
            "unit": "ops/sec",
            "extra": "88 samples"
          },
          {
            "name": "allIngredientSpecs.find, last",
            "value": 1549463,
            "range": "±1.66%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "getIngredientSpecByName, first",
            "value": 75248658,
            "range": "±3.57%",
            "unit": "ops/sec",
            "extra": "81 samples"
          },
          {
            "name": "getIngredientSpecByName, last",
            "value": 1502130,
            "range": "±0.37%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, first",
            "value": 566980,
            "range": "±0.57%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, last",
            "value": 521776,
            "range": "±0.56%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, first)",
            "value": 297999,
            "range": "±0.71%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, last)",
            "value": 237154,
            "range": "±0.55%",
            "unit": "ops/sec",
            "extra": "89 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, first)",
            "value": 171796,
            "range": "±0.69%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, last)",
            "value": 142861,
            "range": "±0.74%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, first)",
            "value": 302141,
            "range": "±0.41%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, last)",
            "value": 291552,
            "range": "±0.40%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, first",
            "value": 1829322,
            "range": "±0.84%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, last",
            "value": 1727375,
            "range": "±1.05%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, first",
            "value": 1852989,
            "range": "±0.80%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, last",
            "value": 1759921,
            "range": "±0.75%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Dark Rum)",
            "value": 296367,
            "range": "±0.47%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Whey Isolate)",
            "value": 104703,
            "range": "±0.27%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "into_ingredient_from_spec, multiple",
            "value": 32092,
            "range": "±0.27%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "cloneRecipeLines",
            "value": 6261,
            "range": "±37.77%",
            "unit": "ops/sec",
            "extra": "14 samples"
          },
          {
            "name": "makeRecipeLines",
            "value": 19223,
            "range": "±1.80%",
            "unit": "ops/sec",
            "extra": "88 samples"
          },
          {
            "name": "makeRecipeFromClonedLines",
            "value": 2172,
            "range": "±7.94%",
            "unit": "ops/sec",
            "extra": "18 samples"
          },
          {
            "name": "makeRecipeFromMadeLines",
            "value": 17821,
            "range": "±5.35%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_composition",
            "value": 1511,
            "range": "±10.01%",
            "unit": "ops/sec",
            "extra": "18 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_composition",
            "value": 16476,
            "range": "±6.43%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "bridge.calculate_recipe_composition",
            "value": 92910,
            "range": "±0.63%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "recipe.calculate_composition",
            "value": 247034,
            "range": "±0.59%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_mix_properties",
            "value": 1121,
            "range": "±8.89%",
            "unit": "ops/sec",
            "extra": "14 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_mix_properties",
            "value": 12416,
            "range": "±6.89%",
            "unit": "ops/sec",
            "extra": "98 samples"
          },
          {
            "name": "bridge.calculate_recipe_mix_properties",
            "value": 35072,
            "range": "±0.18%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 45654,
            "range": "±0.12%",
            "unit": "ops/sec",
            "extra": "99 samples"
          },
          {
            "name": "makeRecipeLines, free",
            "value": 19769,
            "range": "±1.53%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "cloneRecipeLines, free",
            "value": 1253,
            "range": "±13.25%",
            "unit": "ops/sec",
            "extra": "12 samples"
          },
          {
            "name": "makeRecipeLines, no free",
            "value": 892,
            "range": "±7.77%",
            "unit": "ops/sec",
            "extra": "21 samples"
          },
          {
            "name": "cloneRecipeLines, no free",
            "value": 1022,
            "range": "±11.72%",
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
          "id": "618fb31a966bc0374ae569c872c96fa40df6e4fb",
          "message": "Add more feature-specific build/test to crate CI\n\n* Clean up, clarify, and add more feature-specific crate CI build and\n  test steps, to catch any issues with specific feature enablement.\n* Clean up and rename package.json scripts for rust build/test and for\n  wasm dependency builds. The Rust script are no longer specific to the\n  'wasm' and pnpm package features, that is captured by 'build:package'.\n  Remove the 'build' script, as it contains many somewhat unrelated\n  steps that there is no clear usage for running them together.\n* Add crate CI builds for wasm32-unknown-unknown target and the 'wasm'\n  feature, which should be a common combination used by wasm-pack.\n* Add default features [\"data\", \"database\"] to sci-cram Cargo.toml.\n  Remove 'test' from #[cfg(any(feature = \"data\"/\"database\", test))];\n  tests should be run with --all-features and there will be no support\n  for test with only some features enabled.",
          "timestamp": "2026-01-27T15:46:46-05:00",
          "tree_id": "f07dd813bbe7f48b8cbb4cf36c37440a7693d92f",
          "url": "https://github.com/ramonrsv/sci-cream/commit/618fb31a966bc0374ae569c872c96fa40df6e4fb"
        },
        "date": 1769555633391,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "allIngredientSpecs.find, first",
            "value": 85379856,
            "range": "±3.33%",
            "unit": "ops/sec",
            "extra": "82 samples"
          },
          {
            "name": "allIngredientSpecs.find, last",
            "value": 1601841,
            "range": "±0.46%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "getIngredientSpecByName, first",
            "value": 74932054,
            "range": "±3.61%",
            "unit": "ops/sec",
            "extra": "83 samples"
          },
          {
            "name": "getIngredientSpecByName, last",
            "value": 1742259,
            "range": "±0.33%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, first",
            "value": 560683,
            "range": "±0.55%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, last",
            "value": 512958,
            "range": "±0.71%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, first)",
            "value": 288265,
            "range": "±0.70%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, last)",
            "value": 234020,
            "range": "±0.56%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, first)",
            "value": 166738,
            "range": "±0.87%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, last)",
            "value": 137473,
            "range": "±0.81%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, first)",
            "value": 290240,
            "range": "±0.38%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, last)",
            "value": 279114,
            "range": "±0.43%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, first",
            "value": 1844801,
            "range": "±0.89%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, last",
            "value": 1716709,
            "range": "±0.98%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, first",
            "value": 1856859,
            "range": "±0.67%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, last",
            "value": 1766531,
            "range": "±0.79%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Dark Rum)",
            "value": 294542,
            "range": "±0.38%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Whey Isolate)",
            "value": 102435,
            "range": "±0.43%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec, multiple",
            "value": 29508,
            "range": "±0.20%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "cloneRecipeLines",
            "value": 5869,
            "range": "±37.49%",
            "unit": "ops/sec",
            "extra": "14 samples"
          },
          {
            "name": "makeRecipeLines",
            "value": 19339,
            "range": "±1.96%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "makeRecipeFromClonedLines",
            "value": 2039,
            "range": "±8.75%",
            "unit": "ops/sec",
            "extra": "19 samples"
          },
          {
            "name": "makeRecipeFromMadeLines",
            "value": 18177,
            "range": "±6.77%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_composition",
            "value": 1528,
            "range": "±8.71%",
            "unit": "ops/sec",
            "extra": "16 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_composition",
            "value": 16510,
            "range": "±8.92%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "bridge.calculate_recipe_composition",
            "value": 94507,
            "range": "±0.48%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "recipe.calculate_composition",
            "value": 245256,
            "range": "±0.50%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_mix_properties",
            "value": 1040,
            "range": "±11.17%",
            "unit": "ops/sec",
            "extra": "14 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_mix_properties",
            "value": 12751,
            "range": "±7.97%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "bridge.calculate_recipe_mix_properties",
            "value": 36418,
            "range": "±0.09%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 47704,
            "range": "±0.37%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "makeRecipeLines, free",
            "value": 19696,
            "range": "±3.40%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "cloneRecipeLines, free",
            "value": 1173,
            "range": "±6.40%",
            "unit": "ops/sec",
            "extra": "9 samples"
          },
          {
            "name": "makeRecipeLines, no free",
            "value": 845,
            "range": "±12.53%",
            "unit": "ops/sec",
            "extra": "19 samples"
          },
          {
            "name": "cloneRecipeLines, no free",
            "value": 1022,
            "range": "±7.70%",
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
          "id": "01bce5a83c9a3c213dd61dfb6405a3dba232d7ec",
          "message": "Add playwright setup action explicit additional\n\nAdd support to actions/setup-playwright for explicitly specifying\nadditional non-default browsers to install, e.g. branded Google Chrome\n('chrome'). Add 'with.additional-browsers: chrome' to current uses.",
          "timestamp": "2026-01-27T16:39:29-05:00",
          "tree_id": "e5d54192414344a1aa1c9b4f9e812ba0f1fe87c4",
          "url": "https://github.com/ramonrsv/sci-cream/commit/01bce5a83c9a3c213dd61dfb6405a3dba232d7ec"
        },
        "date": 1769556056088,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "allIngredientSpecs.find, first",
            "value": 85633560,
            "range": "±3.13%",
            "unit": "ops/sec",
            "extra": "84 samples"
          },
          {
            "name": "allIngredientSpecs.find, last",
            "value": 1643191,
            "range": "±0.49%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "getIngredientSpecByName, first",
            "value": 77979804,
            "range": "±2.55%",
            "unit": "ops/sec",
            "extra": "83 samples"
          },
          {
            "name": "getIngredientSpecByName, last",
            "value": 1823591,
            "range": "±0.32%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, first",
            "value": 559921,
            "range": "±0.61%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, last",
            "value": 509734,
            "range": "±0.59%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, first)",
            "value": 295941,
            "range": "±0.53%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, last)",
            "value": 238200,
            "range": "±0.42%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, first)",
            "value": 172533,
            "range": "±0.90%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, last)",
            "value": 145623,
            "range": "±0.74%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, first)",
            "value": 298102,
            "range": "±0.42%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, last)",
            "value": 286812,
            "range": "±0.38%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, first",
            "value": 1839365,
            "range": "±0.89%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, last",
            "value": 1731361,
            "range": "±1.01%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, first",
            "value": 1828352,
            "range": "±0.96%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, last",
            "value": 1734970,
            "range": "±0.86%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Dark Rum)",
            "value": 291208,
            "range": "±0.32%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Whey Isolate)",
            "value": 105713,
            "range": "±0.33%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec, multiple",
            "value": 31931,
            "range": "±0.26%",
            "unit": "ops/sec",
            "extra": "98 samples"
          },
          {
            "name": "cloneRecipeLines",
            "value": 5514,
            "range": "±38.83%",
            "unit": "ops/sec",
            "extra": "12 samples"
          },
          {
            "name": "makeRecipeLines",
            "value": 19253,
            "range": "±0.77%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "makeRecipeFromClonedLines",
            "value": 2136,
            "range": "±7.64%",
            "unit": "ops/sec",
            "extra": "13 samples"
          },
          {
            "name": "makeRecipeFromMadeLines",
            "value": 18699,
            "range": "±0.26%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_composition",
            "value": 1431,
            "range": "±11.10%",
            "unit": "ops/sec",
            "extra": "14 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_composition",
            "value": 17090,
            "range": "±0.17%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "bridge.calculate_recipe_composition",
            "value": 94258,
            "range": "±0.67%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "recipe.calculate_composition",
            "value": 247824,
            "range": "±0.50%",
            "unit": "ops/sec",
            "extra": "98 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_mix_properties",
            "value": 980,
            "range": "±9.38%",
            "unit": "ops/sec",
            "extra": "20 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_mix_properties",
            "value": 12518,
            "range": "±6.33%",
            "unit": "ops/sec",
            "extra": "98 samples"
          },
          {
            "name": "bridge.calculate_recipe_mix_properties",
            "value": 35237,
            "range": "±0.11%",
            "unit": "ops/sec",
            "extra": "99 samples"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 44237,
            "range": "±0.11%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "makeRecipeLines, free",
            "value": 19675,
            "range": "±3.44%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "cloneRecipeLines, free",
            "value": 1283,
            "range": "±7.17%",
            "unit": "ops/sec",
            "extra": "9 samples"
          },
          {
            "name": "makeRecipeLines, no free",
            "value": 763,
            "range": "±9.19%",
            "unit": "ops/sec",
            "extra": "21 samples"
          },
          {
            "name": "cloneRecipeLines, no free",
            "value": 1053,
            "range": "±7.66%",
            "unit": "ops/sec",
            "extra": "13 samples"
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
          "id": "c360865dcd90a3e9889efc86cedded3fa0bd30db",
          "message": "Stop using branded Google Chrome in Playwright e2e\n\nStop using branded Google Chrome browser in Playwright e2e tests and\nbenchmarks; setting up branded chrome takes a lot of time in CI\nworkflows and probably doesn't offer much in extra coverage.",
          "timestamp": "2026-01-27T16:44:15-05:00",
          "tree_id": "8b0bd2334c32e9c13a7efd832807b03665ba4673",
          "url": "https://github.com/ramonrsv/sci-cream/commit/c360865dcd90a3e9889efc86cedded3fa0bd30db"
        },
        "date": 1769557573590,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "allIngredientSpecs.find, first",
            "value": 86333176,
            "range": "±4.01%",
            "unit": "ops/sec",
            "extra": "86 samples"
          },
          {
            "name": "allIngredientSpecs.find, last",
            "value": 1596749,
            "range": "±1.47%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "getIngredientSpecByName, first",
            "value": 75986034,
            "range": "±3.19%",
            "unit": "ops/sec",
            "extra": "84 samples"
          },
          {
            "name": "getIngredientSpecByName, last",
            "value": 1820772,
            "range": "±0.29%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, first",
            "value": 553708,
            "range": "±0.53%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, last",
            "value": 511092,
            "range": "±0.55%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, first)",
            "value": 300946,
            "range": "±0.63%",
            "unit": "ops/sec",
            "extra": "89 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, last)",
            "value": 239295,
            "range": "±0.81%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, first)",
            "value": 175515,
            "range": "±0.72%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, last)",
            "value": 148729,
            "range": "±0.70%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, first)",
            "value": 306474,
            "range": "±0.84%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, last)",
            "value": 296418,
            "range": "±0.46%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, first",
            "value": 1818551,
            "range": "±1.01%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, last",
            "value": 1733667,
            "range": "±1.01%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, first",
            "value": 1874209,
            "range": "±0.85%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, last",
            "value": 1771815,
            "range": "±0.82%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Dark Rum)",
            "value": 301983,
            "range": "±0.39%",
            "unit": "ops/sec",
            "extra": "98 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Whey Isolate)",
            "value": 107324,
            "range": "±0.27%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "into_ingredient_from_spec, multiple",
            "value": 32510,
            "range": "±0.54%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "cloneRecipeLines",
            "value": 5096,
            "range": "±38.53%",
            "unit": "ops/sec",
            "extra": "13 samples"
          },
          {
            "name": "makeRecipeLines",
            "value": 19724,
            "range": "±1.77%",
            "unit": "ops/sec",
            "extra": "88 samples"
          },
          {
            "name": "makeRecipeFromClonedLines",
            "value": 1895,
            "range": "±7.66%",
            "unit": "ops/sec",
            "extra": "12 samples"
          },
          {
            "name": "makeRecipeFromMadeLines",
            "value": 18118,
            "range": "±8.77%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_composition",
            "value": 1381,
            "range": "±10.51%",
            "unit": "ops/sec",
            "extra": "13 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_composition",
            "value": 16820,
            "range": "±8.11%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "bridge.calculate_recipe_composition",
            "value": 94121,
            "range": "±0.60%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "recipe.calculate_composition",
            "value": 244886,
            "range": "±0.33%",
            "unit": "ops/sec",
            "extra": "98 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_mix_properties",
            "value": 971,
            "range": "±6.60%",
            "unit": "ops/sec",
            "extra": "13 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_mix_properties",
            "value": 12742,
            "range": "±8.40%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "bridge.calculate_recipe_mix_properties",
            "value": 35638,
            "range": "±0.09%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 45613,
            "range": "±0.57%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "makeRecipeLines, free",
            "value": 20126,
            "range": "±3.48%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "cloneRecipeLines, free",
            "value": 1304,
            "range": "±9.19%",
            "unit": "ops/sec",
            "extra": "9 samples"
          },
          {
            "name": "makeRecipeLines, no free",
            "value": 759,
            "range": "±6.70%",
            "unit": "ops/sec",
            "extra": "20 samples"
          },
          {
            "name": "cloneRecipeLines, no free",
            "value": 983,
            "range": "±10.05%",
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
          "id": "1fa9edca759a2abfde7e893bbc257403f111e93b",
          "message": "Upgrade @playwright/test from ^1.57.0 to ^1.58.0",
          "timestamp": "2026-01-27T16:56:15-05:00",
          "tree_id": "058cdf1cce6e9b4f4cafa0de4b8a7f6e3d4968a4",
          "url": "https://github.com/ramonrsv/sci-cream/commit/1fa9edca759a2abfde7e893bbc257403f111e93b"
        },
        "date": 1769558079904,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "allIngredientSpecs.find, first",
            "value": 84730056,
            "range": "±3.66%",
            "unit": "ops/sec",
            "extra": "79 samples"
          },
          {
            "name": "allIngredientSpecs.find, last",
            "value": 1600914,
            "range": "±0.97%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "getIngredientSpecByName, first",
            "value": 73653034,
            "range": "±3.09%",
            "unit": "ops/sec",
            "extra": "83 samples"
          },
          {
            "name": "getIngredientSpecByName, last",
            "value": 1757274,
            "range": "±0.40%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, first",
            "value": 549369,
            "range": "±0.57%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, last",
            "value": 510072,
            "range": "±0.59%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, first)",
            "value": 293928,
            "range": "±1.04%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, last)",
            "value": 240821,
            "range": "±0.48%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, first)",
            "value": 168604,
            "range": "±0.76%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, last)",
            "value": 144886,
            "range": "±0.68%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, first)",
            "value": 300052,
            "range": "±0.43%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, last)",
            "value": 292200,
            "range": "±0.37%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, first",
            "value": 1793036,
            "range": "±0.91%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, last",
            "value": 1683945,
            "range": "±0.87%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, first",
            "value": 1802086,
            "range": "±0.73%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, last",
            "value": 1712366,
            "range": "±0.79%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Dark Rum)",
            "value": 296735,
            "range": "±0.36%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Whey Isolate)",
            "value": 104710,
            "range": "±0.28%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "into_ingredient_from_spec, multiple",
            "value": 31912,
            "range": "±0.44%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "cloneRecipeLines",
            "value": 6212,
            "range": "±37.28%",
            "unit": "ops/sec",
            "extra": "14 samples"
          },
          {
            "name": "makeRecipeLines",
            "value": 19140,
            "range": "±1.00%",
            "unit": "ops/sec",
            "extra": "89 samples"
          },
          {
            "name": "makeRecipeFromClonedLines",
            "value": 1896,
            "range": "±8.83%",
            "unit": "ops/sec",
            "extra": "44 samples"
          },
          {
            "name": "makeRecipeFromMadeLines",
            "value": 18092,
            "range": "±5.21%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_composition",
            "value": 1478,
            "range": "±6.63%",
            "unit": "ops/sec",
            "extra": "15 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_composition",
            "value": 17122,
            "range": "±0.24%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "bridge.calculate_recipe_composition",
            "value": 92839,
            "range": "±0.98%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "recipe.calculate_composition",
            "value": 242601,
            "range": "±0.36%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_mix_properties",
            "value": 928,
            "range": "±20.31%",
            "unit": "ops/sec",
            "extra": "17 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_mix_properties",
            "value": 12974,
            "range": "±0.24%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "bridge.calculate_recipe_mix_properties",
            "value": 34648,
            "range": "±0.09%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 44750,
            "range": "±0.14%",
            "unit": "ops/sec",
            "extra": "98 samples"
          },
          {
            "name": "makeRecipeLines, free",
            "value": 19640,
            "range": "±1.94%",
            "unit": "ops/sec",
            "extra": "89 samples"
          },
          {
            "name": "cloneRecipeLines, free",
            "value": 1219,
            "range": "±14.12%",
            "unit": "ops/sec",
            "extra": "10 samples"
          },
          {
            "name": "makeRecipeLines, no free",
            "value": 903,
            "range": "±8.65%",
            "unit": "ops/sec",
            "extra": "21 samples"
          },
          {
            "name": "cloneRecipeLines, no free",
            "value": 1155,
            "range": "±10.31%",
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
          "id": "5ccb17ba11956cf226dca60ba426c13463e60bc5",
          "message": "Introduce LightRecipe & Recipe::from_light_recipe\n\nAlso make Recipe::name an Option<String>, and change all function\narguments accordingly; most current uses cases do not need a name.",
          "timestamp": "2026-01-27T18:40:42-05:00",
          "tree_id": "0f7e0c60c6e5020dc185bc1140e298d877ec8bcc",
          "url": "https://github.com/ramonrsv/sci-cream/commit/5ccb17ba11956cf226dca60ba426c13463e60bc5"
        },
        "date": 1769558926384,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "allIngredientSpecs.find, first",
            "value": 87126372,
            "range": "±3.24%",
            "unit": "ops/sec",
            "extra": "86 samples"
          },
          {
            "name": "allIngredientSpecs.find, last",
            "value": 1649627,
            "range": "±0.87%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "getIngredientSpecByName, first",
            "value": 76944071,
            "range": "±2.44%",
            "unit": "ops/sec",
            "extra": "84 samples"
          },
          {
            "name": "getIngredientSpecByName, last",
            "value": 1856027,
            "range": "±0.32%",
            "unit": "ops/sec",
            "extra": "98 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, first",
            "value": 557401,
            "range": "±0.68%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, last",
            "value": 515574,
            "range": "±0.65%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, first)",
            "value": 299257,
            "range": "±0.61%",
            "unit": "ops/sec",
            "extra": "88 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, last)",
            "value": 244292,
            "range": "±0.52%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, first)",
            "value": 173740,
            "range": "±0.72%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, last)",
            "value": 144835,
            "range": "±0.94%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, first)",
            "value": 307898,
            "range": "±0.44%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, last)",
            "value": 295580,
            "range": "±0.41%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, first",
            "value": 1845339,
            "range": "±1.05%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, last",
            "value": 1728945,
            "range": "±0.90%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, first",
            "value": 1856982,
            "range": "±0.71%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, last",
            "value": 1752507,
            "range": "±0.80%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Dark Rum)",
            "value": 302192,
            "range": "±0.35%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Whey Isolate)",
            "value": 106159,
            "range": "±0.74%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "into_ingredient_from_spec, multiple",
            "value": 32519,
            "range": "±0.32%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "cloneRecipeLines",
            "value": 5822,
            "range": "±37.41%",
            "unit": "ops/sec",
            "extra": "12 samples"
          },
          {
            "name": "makeRecipeLines",
            "value": 19427,
            "range": "±1.35%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "makeRecipeFromClonedLines",
            "value": 2129,
            "range": "±7.95%",
            "unit": "ops/sec",
            "extra": "17 samples"
          },
          {
            "name": "makeRecipeFromMadeLines",
            "value": 17790,
            "range": "±7.02%",
            "unit": "ops/sec",
            "extra": "86 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_composition",
            "value": 1469,
            "range": "±8.07%",
            "unit": "ops/sec",
            "extra": "20 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_composition",
            "value": 17594,
            "range": "±0.43%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "bridge.calculate_recipe_composition",
            "value": 96649,
            "range": "±0.65%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "recipe.calculate_composition",
            "value": 247430,
            "range": "±0.32%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_mix_properties",
            "value": 1111,
            "range": "±9.38%",
            "unit": "ops/sec",
            "extra": "19 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_mix_properties",
            "value": 12999,
            "range": "±4.98%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "bridge.calculate_recipe_mix_properties",
            "value": 35556,
            "range": "±0.08%",
            "unit": "ops/sec",
            "extra": "98 samples"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 45698,
            "range": "±0.10%",
            "unit": "ops/sec",
            "extra": "99 samples"
          },
          {
            "name": "makeRecipeLines, free",
            "value": 20160,
            "range": "±2.17%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "cloneRecipeLines, free",
            "value": 884,
            "range": "±23.00%",
            "unit": "ops/sec",
            "extra": "21 samples"
          },
          {
            "name": "makeRecipeLines, no free",
            "value": 847,
            "range": "±7.98%",
            "unit": "ops/sec",
            "extra": "18 samples"
          },
          {
            "name": "cloneRecipeLines, no free",
            "value": 1004,
            "range": "±12.27%",
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
          "id": "560cee861bdee18fb1b4593bbb13100d0970fa46",
          "message": "Add bridge.calculate_recipe_comp/mix_props benches",
          "timestamp": "2026-01-27T19:04:33-05:00",
          "tree_id": "00e520a232b1b9fc087dcee518a00f3d764b5062",
          "url": "https://github.com/ramonrsv/sci-cream/commit/560cee861bdee18fb1b4593bbb13100d0970fa46"
        },
        "date": 1769559303213,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "allIngredientSpecs.find, first",
            "value": 83886706,
            "range": "±3.62%",
            "unit": "ops/sec",
            "extra": "82 samples"
          },
          {
            "name": "allIngredientSpecs.find, last",
            "value": 1540078,
            "range": "±1.37%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "getIngredientSpecByName, first",
            "value": 75984649,
            "range": "±3.70%",
            "unit": "ops/sec",
            "extra": "83 samples"
          },
          {
            "name": "getIngredientSpecByName, last",
            "value": 1688960,
            "range": "±0.42%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, first",
            "value": 538324,
            "range": "±0.58%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, last",
            "value": 498118,
            "range": "±0.53%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, first)",
            "value": 295717,
            "range": "±0.68%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, last)",
            "value": 237586,
            "range": "±0.44%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, first)",
            "value": 169979,
            "range": "±0.87%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, last)",
            "value": 144064,
            "range": "±0.74%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, first)",
            "value": 298934,
            "range": "±0.44%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, last)",
            "value": 286339,
            "range": "±0.82%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, first",
            "value": 1830882,
            "range": "±0.75%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, last",
            "value": 1719316,
            "range": "±1.00%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, first",
            "value": 1862104,
            "range": "±0.67%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, last",
            "value": 1740866,
            "range": "±0.75%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Dark Rum)",
            "value": 292375,
            "range": "±0.36%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Whey Isolate)",
            "value": 104079,
            "range": "±0.33%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "into_ingredient_from_spec, multiple",
            "value": 31584,
            "range": "±0.35%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "cloneRecipeLines",
            "value": 6392,
            "range": "±35.60%",
            "unit": "ops/sec",
            "extra": "15 samples"
          },
          {
            "name": "makeRecipeLines",
            "value": 19278,
            "range": "±0.82%",
            "unit": "ops/sec",
            "extra": "88 samples"
          },
          {
            "name": "makeRecipeFromClonedLines",
            "value": 2207,
            "range": "±6.34%",
            "unit": "ops/sec",
            "extra": "18 samples"
          },
          {
            "name": "makeRecipeFromMadeLines",
            "value": 18464,
            "range": "±0.28%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_composition",
            "value": 1498,
            "range": "±9.24%",
            "unit": "ops/sec",
            "extra": "11 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_composition",
            "value": 17085,
            "range": "±0.18%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "bridge.calculate_recipe_composition",
            "value": 96307,
            "range": "±0.65%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "recipe.calculate_composition",
            "value": 246140,
            "range": "±0.76%",
            "unit": "ops/sec",
            "extra": "98 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_mix_properties",
            "value": 1031,
            "range": "±7.43%",
            "unit": "ops/sec",
            "extra": "14 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_mix_properties",
            "value": 12470,
            "range": "±6.96%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "bridge.calculate_recipe_mix_properties",
            "value": 35480,
            "range": "±0.12%",
            "unit": "ops/sec",
            "extra": "99 samples"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 45579,
            "range": "±0.07%",
            "unit": "ops/sec",
            "extra": "98 samples"
          },
          {
            "name": "makeRecipeLines, free",
            "value": 19326,
            "range": "±2.52%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "cloneRecipeLines, free",
            "value": 1332,
            "range": "±7.31%",
            "unit": "ops/sec",
            "extra": "9 samples"
          },
          {
            "name": "makeRecipeLines, no free",
            "value": 822,
            "range": "±7.99%",
            "unit": "ops/sec",
            "extra": "18 samples"
          },
          {
            "name": "cloneRecipeLines, no free",
            "value": 1043,
            "range": "±4.46%",
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
          "id": "74a6b4667bb6d2a8aa4e637c57003a9ccee11f4b",
          "message": "Rename IngredientDatabase WASM constructor methods\n\n  `make_seeded_ingredient_database`\n  `make_seeded_ingredient_database_from_specs`\n  `make_seeded_ingredient_database_from_embedded_data`\n\n    renamed to v\n\n  `new_ingredient_database_seeded`\n  `new_ingredient_database_seeded_from_specs`\n  `new_ingredient_database_seeded_from_embedded_data`",
          "timestamp": "2026-01-27T22:55:22-05:00",
          "tree_id": "2acf6bd804a004cf2410358538fda9cb78055b0d",
          "url": "https://github.com/ramonrsv/sci-cream/commit/74a6b4667bb6d2a8aa4e637c57003a9ccee11f4b"
        },
        "date": 1769573076002,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "allIngredientSpecs.find, first",
            "value": 83899738,
            "range": "±3.57%",
            "unit": "ops/sec",
            "extra": "81 samples"
          },
          {
            "name": "allIngredientSpecs.find, last",
            "value": 1613326,
            "range": "±1.23%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "getIngredientSpecByName, first",
            "value": 74977132,
            "range": "±2.68%",
            "unit": "ops/sec",
            "extra": "81 samples"
          },
          {
            "name": "getIngredientSpecByName, last",
            "value": 1808082,
            "range": "±0.43%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, first",
            "value": 548847,
            "range": "±0.96%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, last",
            "value": 516948,
            "range": "±0.53%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, first)",
            "value": 297138,
            "range": "±0.59%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, last)",
            "value": 241766,
            "range": "±0.54%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, first)",
            "value": 169073,
            "range": "±0.83%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, last)",
            "value": 145421,
            "range": "±0.75%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, first)",
            "value": 300593,
            "range": "±0.73%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, last)",
            "value": 290691,
            "range": "±0.42%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, first",
            "value": 1851451,
            "range": "±0.85%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, last",
            "value": 1733060,
            "range": "±0.98%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, first",
            "value": 1869131,
            "range": "±0.83%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, last",
            "value": 1767051,
            "range": "±0.82%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Dark Rum)",
            "value": 297259,
            "range": "±0.40%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Whey Isolate)",
            "value": 104681,
            "range": "±0.47%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "into_ingredient_from_spec, multiple",
            "value": 32158,
            "range": "±0.28%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "cloneRecipeLines",
            "value": 5625,
            "range": "±37.53%",
            "unit": "ops/sec",
            "extra": "14 samples"
          },
          {
            "name": "makeRecipeLines",
            "value": 19139,
            "range": "±4.64%",
            "unit": "ops/sec",
            "extra": "88 samples"
          },
          {
            "name": "makeRecipeFromClonedLines",
            "value": 1739,
            "range": "±8.92%",
            "unit": "ops/sec",
            "extra": "44 samples"
          },
          {
            "name": "makeRecipeFromMadeLines",
            "value": 18178,
            "range": "±5.09%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_composition",
            "value": 1592,
            "range": "±8.50%",
            "unit": "ops/sec",
            "extra": "24 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_composition",
            "value": 16778,
            "range": "±7.48%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "bridge.calculate_recipe_composition",
            "value": 97294,
            "range": "±0.51%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "recipe.calculate_composition",
            "value": 245825,
            "range": "±0.55%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_mix_properties",
            "value": 1169,
            "range": "±5.45%",
            "unit": "ops/sec",
            "extra": "19 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_mix_properties",
            "value": 13218,
            "range": "±0.21%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "bridge.calculate_recipe_mix_properties",
            "value": 35696,
            "range": "±0.11%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 46216,
            "range": "±0.09%",
            "unit": "ops/sec",
            "extra": "99 samples"
          },
          {
            "name": "makeRecipeLines, free",
            "value": 19927,
            "range": "±2.97%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "cloneRecipeLines, free",
            "value": 1489,
            "range": "±10.63%",
            "unit": "ops/sec",
            "extra": "10 samples"
          },
          {
            "name": "makeRecipeLines, no free",
            "value": 908,
            "range": "±9.73%",
            "unit": "ops/sec",
            "extra": "21 samples"
          },
          {
            "name": "cloneRecipeLines, no free",
            "value": 1060,
            "range": "±13.25%",
            "unit": "ops/sec",
            "extra": "13 samples"
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
          "id": "838fe94eec5537ad06cb368e6e4f4c588670baea",
          "message": "Add TODO about perf impact of comp/mix_p.get calls",
          "timestamp": "2026-01-28T18:39:01-05:00",
          "tree_id": "fa31a361ba2e45217bdab15201e812d5af758599",
          "url": "https://github.com/ramonrsv/sci-cream/commit/838fe94eec5537ad06cb368e6e4f4c588670baea"
        },
        "date": 1769643835470,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "allIngredientSpecs.find, first",
            "value": 99766255,
            "range": "±3.48%",
            "unit": "ops/sec",
            "extra": "84 samples"
          },
          {
            "name": "allIngredientSpecs.find, last",
            "value": 1846024,
            "range": "±1.32%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "getIngredientSpecByName, first",
            "value": 81515789,
            "range": "±1.99%",
            "unit": "ops/sec",
            "extra": "87 samples"
          },
          {
            "name": "getIngredientSpecByName, last",
            "value": 2181564,
            "range": "±0.31%",
            "unit": "ops/sec",
            "extra": "98 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, first",
            "value": 528274,
            "range": "±0.61%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, last",
            "value": 491644,
            "range": "±0.54%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, first)",
            "value": 298945,
            "range": "±0.61%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, last)",
            "value": 247574,
            "range": "±0.62%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, first)",
            "value": 167824,
            "range": "±0.70%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, last)",
            "value": 140987,
            "range": "±0.71%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, first)",
            "value": 302841,
            "range": "±0.37%",
            "unit": "ops/sec",
            "extra": "98 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, last)",
            "value": 292369,
            "range": "±0.44%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, first",
            "value": 1822456,
            "range": "±0.83%",
            "unit": "ops/sec",
            "extra": "87 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, last",
            "value": 1708922,
            "range": "±0.97%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, first",
            "value": 1859320,
            "range": "±0.81%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, last",
            "value": 1727935,
            "range": "±0.92%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Dark Rum)",
            "value": 296475,
            "range": "±0.32%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Whey Isolate)",
            "value": 104003,
            "range": "±0.38%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "into_ingredient_from_spec, multiple",
            "value": 32022,
            "range": "±0.39%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "cloneRecipeLines",
            "value": 7050,
            "range": "±29.82%",
            "unit": "ops/sec",
            "extra": "16 samples"
          },
          {
            "name": "makeRecipeLines",
            "value": 19550,
            "range": "±1.17%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "makeRecipeFromClonedLines",
            "value": 2608,
            "range": "±7.53%",
            "unit": "ops/sec",
            "extra": "42 samples"
          },
          {
            "name": "makeRecipeFromMadeLines",
            "value": 19008,
            "range": "±0.23%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_composition",
            "value": 1979,
            "range": "±7.31%",
            "unit": "ops/sec",
            "extra": "43 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_composition",
            "value": 16902,
            "range": "±5.04%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "bridge.calculate_recipe_composition",
            "value": 101304,
            "range": "±0.95%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "recipe.calculate_composition",
            "value": 289414,
            "range": "±1.13%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_mix_properties",
            "value": 1526,
            "range": "±7.44%",
            "unit": "ops/sec",
            "extra": "21 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_mix_properties",
            "value": 13637,
            "range": "±0.30%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "bridge.calculate_recipe_mix_properties",
            "value": 37388,
            "range": "±0.08%",
            "unit": "ops/sec",
            "extra": "100 samples"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 50667,
            "range": "±0.11%",
            "unit": "ops/sec",
            "extra": "99 samples"
          },
          {
            "name": "makeRecipeLines, free",
            "value": 19937,
            "range": "±1.82%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "cloneRecipeLines, free",
            "value": 1888,
            "range": "±5.04%",
            "unit": "ops/sec",
            "extra": "10 samples"
          },
          {
            "name": "makeRecipeLines, no free",
            "value": 1185,
            "range": "±10.07%",
            "unit": "ops/sec",
            "extra": "26 samples"
          },
          {
            "name": "cloneRecipeLines, no free",
            "value": 1288,
            "range": "±6.55%",
            "unit": "ops/sec",
            "extra": "13 samples"
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
          "id": "a3cc3e2189f94988a0f04f295c94b057d59fbfcd",
          "message": "Check off various TODOs that have been addressed",
          "timestamp": "2026-01-28T18:42:07-05:00",
          "tree_id": "f22b5caa479f4df51dcaf372977376fc64bcc8bb",
          "url": "https://github.com/ramonrsv/sci-cream/commit/a3cc3e2189f94988a0f04f295c94b057d59fbfcd"
        },
        "date": 1769644038371,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "allIngredientSpecs.find, first",
            "value": 87278083,
            "range": "±3.20%",
            "unit": "ops/sec",
            "extra": "85 samples"
          },
          {
            "name": "allIngredientSpecs.find, last",
            "value": 1641265,
            "range": "±0.20%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "getIngredientSpecByName, first",
            "value": 77822528,
            "range": "±2.35%",
            "unit": "ops/sec",
            "extra": "86 samples"
          },
          {
            "name": "getIngredientSpecByName, last",
            "value": 1817822,
            "range": "±0.29%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, first",
            "value": 550332,
            "range": "±1.01%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, last",
            "value": 518171,
            "range": "±0.54%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, first)",
            "value": 300004,
            "range": "±0.55%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, last)",
            "value": 240766,
            "range": "±0.53%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, first)",
            "value": 172905,
            "range": "±0.76%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, last)",
            "value": 144625,
            "range": "±0.82%",
            "unit": "ops/sec",
            "extra": "88 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, first)",
            "value": 304382,
            "range": "±0.44%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, last)",
            "value": 294250,
            "range": "±0.44%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, first",
            "value": 1843305,
            "range": "±0.91%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, last",
            "value": 1716030,
            "range": "±0.97%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, first",
            "value": 1853685,
            "range": "±0.81%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, last",
            "value": 1756227,
            "range": "±0.82%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Dark Rum)",
            "value": 298407,
            "range": "±0.61%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Whey Isolate)",
            "value": 104918,
            "range": "±0.25%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "into_ingredient_from_spec, multiple",
            "value": 32021,
            "range": "±0.43%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "cloneRecipeLines",
            "value": 5583,
            "range": "±37.75%",
            "unit": "ops/sec",
            "extra": "13 samples"
          },
          {
            "name": "makeRecipeLines",
            "value": 19663,
            "range": "±0.62%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "makeRecipeFromClonedLines",
            "value": 2159,
            "range": "±9.51%",
            "unit": "ops/sec",
            "extra": "13 samples"
          },
          {
            "name": "makeRecipeFromMadeLines",
            "value": 18784,
            "range": "±0.34%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_composition",
            "value": 1452,
            "range": "±9.16%",
            "unit": "ops/sec",
            "extra": "12 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_composition",
            "value": 17298,
            "range": "±0.29%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "bridge.calculate_recipe_composition",
            "value": 94411,
            "range": "±0.70%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "recipe.calculate_composition",
            "value": 247847,
            "range": "±0.27%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_mix_properties",
            "value": 1029,
            "range": "±6.75%",
            "unit": "ops/sec",
            "extra": "16 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_mix_properties",
            "value": 13152,
            "range": "±0.16%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "bridge.calculate_recipe_mix_properties",
            "value": 35390,
            "range": "±0.10%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 45539,
            "range": "±0.10%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "makeRecipeLines, free",
            "value": 19883,
            "range": "±2.18%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "cloneRecipeLines, free",
            "value": 1305,
            "range": "±10.32%",
            "unit": "ops/sec",
            "extra": "9 samples"
          },
          {
            "name": "makeRecipeLines, no free",
            "value": 809,
            "range": "±6.80%",
            "unit": "ops/sec",
            "extra": "19 samples"
          },
          {
            "name": "cloneRecipeLines, no free",
            "value": 985,
            "range": "±10.63%",
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
          "id": "d4229e48fb78d85f225ee01b08ae13211d186946",
          "message": "Add TODO about comp/prop_key_as_med_str WASM calls",
          "timestamp": "2026-01-28T18:46:25-05:00",
          "tree_id": "e8b00776496ecfe78aec31d59c4fee26cf6c4021",
          "url": "https://github.com/ramonrsv/sci-cream/commit/d4229e48fb78d85f225ee01b08ae13211d186946"
        },
        "date": 1769644266635,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "allIngredientSpecs.find, first",
            "value": 89180502,
            "range": "±2.48%",
            "unit": "ops/sec",
            "extra": "88 samples"
          },
          {
            "name": "allIngredientSpecs.find, last",
            "value": 1545817,
            "range": "±0.39%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "getIngredientSpecByName, first",
            "value": 77478685,
            "range": "±2.66%",
            "unit": "ops/sec",
            "extra": "85 samples"
          },
          {
            "name": "getIngredientSpecByName, last",
            "value": 1772522,
            "range": "±0.25%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, first",
            "value": 558912,
            "range": "±0.64%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, last",
            "value": 524422,
            "range": "±0.55%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, first)",
            "value": 298881,
            "range": "±0.60%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, last)",
            "value": 239390,
            "range": "±0.48%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, first)",
            "value": 171374,
            "range": "±0.81%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, last)",
            "value": 145623,
            "range": "±0.76%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, first)",
            "value": 300252,
            "range": "±0.40%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, last)",
            "value": 290082,
            "range": "±0.47%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, first",
            "value": 1848598,
            "range": "±0.88%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, last",
            "value": 1727179,
            "range": "±0.98%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, first",
            "value": 1862432,
            "range": "±0.79%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, last",
            "value": 1756144,
            "range": "±0.78%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Dark Rum)",
            "value": 296048,
            "range": "±0.35%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Whey Isolate)",
            "value": 105012,
            "range": "±0.26%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "into_ingredient_from_spec, multiple",
            "value": 31919,
            "range": "±0.31%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "cloneRecipeLines",
            "value": 4951,
            "range": "±39.29%",
            "unit": "ops/sec",
            "extra": "12 samples"
          },
          {
            "name": "makeRecipeLines",
            "value": 19224,
            "range": "±3.35%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "makeRecipeFromClonedLines",
            "value": 2040,
            "range": "±8.11%",
            "unit": "ops/sec",
            "extra": "18 samples"
          },
          {
            "name": "makeRecipeFromMadeLines",
            "value": 18317,
            "range": "±0.39%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_composition",
            "value": 1497,
            "range": "±7.60%",
            "unit": "ops/sec",
            "extra": "13 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_composition",
            "value": 16192,
            "range": "±7.57%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "bridge.calculate_recipe_composition",
            "value": 96603,
            "range": "±1.22%",
            "unit": "ops/sec",
            "extra": "87 samples"
          },
          {
            "name": "recipe.calculate_composition",
            "value": 245503,
            "range": "±0.27%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_mix_properties",
            "value": 1094,
            "range": "±9.87%",
            "unit": "ops/sec",
            "extra": "14 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_mix_properties",
            "value": 12428,
            "range": "±6.13%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "bridge.calculate_recipe_mix_properties",
            "value": 35466,
            "range": "±0.09%",
            "unit": "ops/sec",
            "extra": "99 samples"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 45719,
            "range": "±0.10%",
            "unit": "ops/sec",
            "extra": "99 samples"
          },
          {
            "name": "makeRecipeLines, free",
            "value": 19610,
            "range": "±3.12%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "cloneRecipeLines, free",
            "value": 1227,
            "range": "±10.69%",
            "unit": "ops/sec",
            "extra": "8 samples"
          },
          {
            "name": "makeRecipeLines, no free",
            "value": 784,
            "range": "±6.40%",
            "unit": "ops/sec",
            "extra": "20 samples"
          },
          {
            "name": "cloneRecipeLines, no free",
            "value": 1028,
            "range": "±11.10%",
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
          "id": "7aa3724522f323ba576a76606b3c59f38c7385d9",
          "message": "Add unique label to each dataset line in FpdGraph\n\nThis resolves an issue where the lines for reference recipes jump around\nwhenever updates are made to any recipe, or when the FpdGraph component\nis dragged. According to Clauce Sonnet 4.5, this is because, quote:\n\n  When Chart.js re-renders, it can't distinguish between which dataset\n  belongs to which recipe, causing it to animate/transition between what\n  it thinks are \"different\" datasets, resulting in the jumping behavior.\n\nCheck off the corresponding TODO item, as well as the one for UI\nresponsivness when making many rapid ingredient quantity updates; that\nseems to only be an issue when running `pnpm dev`, it does not happen\nwith a release build `pnpm start`.",
          "timestamp": "2026-01-28T19:17:41-05:00",
          "tree_id": "b61a80920e6e35c5b4f125332f3ab5229263fb0e",
          "url": "https://github.com/ramonrsv/sci-cream/commit/7aa3724522f323ba576a76606b3c59f38c7385d9"
        },
        "date": 1769664254296,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "allIngredientSpecs.find, first",
            "value": 83705977,
            "range": "±3.53%",
            "unit": "ops/sec",
            "extra": "81 samples"
          },
          {
            "name": "allIngredientSpecs.find, last",
            "value": 1605001,
            "range": "±0.79%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "getIngredientSpecByName, first",
            "value": 75754314,
            "range": "±3.09%",
            "unit": "ops/sec",
            "extra": "86 samples"
          },
          {
            "name": "getIngredientSpecByName, last",
            "value": 1755050,
            "range": "±0.58%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, first",
            "value": 554334,
            "range": "±1.07%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, last",
            "value": 506864,
            "range": "±0.58%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, first)",
            "value": 295246,
            "range": "±0.58%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, last)",
            "value": 238404,
            "range": "±0.53%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, first)",
            "value": 169596,
            "range": "±0.92%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, last)",
            "value": 143989,
            "range": "±0.68%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, first)",
            "value": 300646,
            "range": "±0.49%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, last)",
            "value": 289167,
            "range": "±0.46%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, first",
            "value": 1830036,
            "range": "±0.86%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, last",
            "value": 1701814,
            "range": "±0.98%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, first",
            "value": 1843832,
            "range": "±0.88%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, last",
            "value": 1741899,
            "range": "±0.74%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Dark Rum)",
            "value": 294425,
            "range": "±0.43%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Whey Isolate)",
            "value": 104866,
            "range": "±0.28%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "into_ingredient_from_spec, multiple",
            "value": 31764,
            "range": "±0.30%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "cloneRecipeLines",
            "value": 5520,
            "range": "±39.91%",
            "unit": "ops/sec",
            "extra": "13 samples"
          },
          {
            "name": "makeRecipeLines",
            "value": 19085,
            "range": "±1.79%",
            "unit": "ops/sec",
            "extra": "86 samples"
          },
          {
            "name": "makeRecipeFromClonedLines",
            "value": 2139,
            "range": "±10.06%",
            "unit": "ops/sec",
            "extra": "17 samples"
          },
          {
            "name": "makeRecipeFromMadeLines",
            "value": 17993,
            "range": "±6.82%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_composition",
            "value": 1597,
            "range": "±9.76%",
            "unit": "ops/sec",
            "extra": "18 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_composition",
            "value": 16363,
            "range": "±7.02%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "bridge.calculate_recipe_composition",
            "value": 96100,
            "range": "±1.82%",
            "unit": "ops/sec",
            "extra": "89 samples"
          },
          {
            "name": "recipe.calculate_composition",
            "value": 247477,
            "range": "±0.32%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_mix_properties",
            "value": 1001,
            "range": "±7.25%",
            "unit": "ops/sec",
            "extra": "14 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_mix_properties",
            "value": 12570,
            "range": "±6.51%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "bridge.calculate_recipe_mix_properties",
            "value": 35284,
            "range": "±0.19%",
            "unit": "ops/sec",
            "extra": "98 samples"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 45189,
            "range": "±0.81%",
            "unit": "ops/sec",
            "extra": "98 samples"
          },
          {
            "name": "makeRecipeLines, free",
            "value": 19899,
            "range": "±0.62%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "cloneRecipeLines, free",
            "value": 1270,
            "range": "±8.23%",
            "unit": "ops/sec",
            "extra": "9 samples"
          },
          {
            "name": "makeRecipeLines, no free",
            "value": 168,
            "range": "±165.89%",
            "unit": "ops/sec",
            "extra": "18 samples"
          },
          {
            "name": "cloneRecipeLines, no free",
            "value": 1031,
            "range": "±7.45%",
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
          "id": "f044fc85070359b094cdc13854d84fc4f8b3a292",
          "message": "Overhaul RecipeContext and updates, use WasmBridge\n\n* Overhaul the design of `RecipeContext`, now splitting it into a\n  a `RecipeContext` that holds only `Recipe`s, and `IngredientResources`\n  that holds `validIngredients` and the new `wasmBridge`; the ingredient\n  cache has been removed in favour of a seeded `WasmBridge`. This change\n  greatly simplifies the process of fetching ingredients and updating\n  the context, and should be more performance according to benchmarks in\n  the `sci-cream` crate - still needs to be confirmed with end-to-end\n  benchmarks and web vitals at the app level. This does force all\n  ingredient definitions to be loaded up-front, but functionality could\n  be added later to continiously seed `WasmBridge`, if necessary.\n\n    - As it turns out, according to the newly introduced end-to-end\n      benchmarks, this change has only a modest performance impact,\n      if any. However, it also has no significant negative impact on\n      initial page load time or memory usage, so the simplicity that\n      it affords is still a significant benefit. Further performance\n      analysis is required to identify areas of concern.\n\n* Refactor `updateRecipe` to take a list of row updates and call\n  `setRecipeContext` only once per update, reducing the number\n  of re-renders and `mixProperties` updates, particularly when updating\n  multiple rows at once, e.g. when pasting a recipe, or on first mount.",
          "timestamp": "2026-01-29T01:55:47-05:00",
          "tree_id": "6b55107dba492bf75aa66e9f808cbe938fa29cbb",
          "url": "https://github.com/ramonrsv/sci-cream/commit/f044fc85070359b094cdc13854d84fc4f8b3a292"
        },
        "date": 1769670029689,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "allIngredientSpecs.find, first",
            "value": 87308583,
            "range": "±3.08%",
            "unit": "ops/sec",
            "extra": "83 samples"
          },
          {
            "name": "allIngredientSpecs.find, last",
            "value": 1635535,
            "range": "±0.49%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "getIngredientSpecByName, first",
            "value": 75214505,
            "range": "±2.65%",
            "unit": "ops/sec",
            "extra": "84 samples"
          },
          {
            "name": "getIngredientSpecByName, last",
            "value": 1818654,
            "range": "±0.46%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, first",
            "value": 553685,
            "range": "±0.60%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, last",
            "value": 509928,
            "range": "±0.71%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, first)",
            "value": 291386,
            "range": "±0.68%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, last)",
            "value": 235489,
            "range": "±0.47%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, first)",
            "value": 168001,
            "range": "±0.79%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, last)",
            "value": 141913,
            "range": "±0.74%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, first)",
            "value": 295714,
            "range": "±0.54%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, last)",
            "value": 283237,
            "range": "±0.65%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, first",
            "value": 1801023,
            "range": "±0.89%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, last",
            "value": 1704896,
            "range": "±1.16%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, first",
            "value": 1814669,
            "range": "±1.03%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, last",
            "value": 1742892,
            "range": "±0.89%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Dark Rum)",
            "value": 292394,
            "range": "±0.40%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Whey Isolate)",
            "value": 102876,
            "range": "±0.36%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "into_ingredient_from_spec, multiple",
            "value": 31043,
            "range": "±0.34%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "cloneRecipeLines",
            "value": 4969,
            "range": "±39.00%",
            "unit": "ops/sec",
            "extra": "13 samples"
          },
          {
            "name": "makeRecipeLines",
            "value": 18984,
            "range": "±1.20%",
            "unit": "ops/sec",
            "extra": "84 samples"
          },
          {
            "name": "makeRecipeFromClonedLines",
            "value": 1579,
            "range": "±9.97%",
            "unit": "ops/sec",
            "extra": "38 samples"
          },
          {
            "name": "makeRecipeFromMadeLines",
            "value": 18125,
            "range": "±1.16%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_composition",
            "value": 1130,
            "range": "±20.38%",
            "unit": "ops/sec",
            "extra": "18 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_composition",
            "value": 16815,
            "range": "±0.28%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "bridge.calculate_recipe_composition",
            "value": 93731,
            "range": "±2.07%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "recipe.calculate_composition",
            "value": 247354,
            "range": "±0.31%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_mix_properties",
            "value": 1165,
            "range": "±8.06%",
            "unit": "ops/sec",
            "extra": "16 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_mix_properties",
            "value": 12754,
            "range": "±0.25%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "bridge.calculate_recipe_mix_properties",
            "value": 33941,
            "range": "±0.18%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 43545,
            "range": "±0.16%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "makeRecipeLines, free",
            "value": 19689,
            "range": "±1.23%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "cloneRecipeLines, free",
            "value": 1358,
            "range": "±6.84%",
            "unit": "ops/sec",
            "extra": "10 samples"
          },
          {
            "name": "makeRecipeLines, no free",
            "value": 861,
            "range": "±9.65%",
            "unit": "ops/sec",
            "extra": "19 samples"
          },
          {
            "name": "cloneRecipeLines, no free",
            "value": 980,
            "range": "±11.97%",
            "unit": "ops/sec",
            "extra": "8 samples"
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
          "id": "e5bcee9ff23f4f5c1cc84c72425f1bf81de4217b",
          "message": "Introduce *_key_as_str optimizations and benches\n\nOptimization functions to move key lookups from JS <-> WASM boundary to\nJS side, as that can be orders of magnitude more performant for simple\nkey accesses without complex computations.",
          "timestamp": "2026-01-29T11:29:05-05:00",
          "tree_id": "bd8896b44f21debbde857afec24aca0a14e4237e",
          "url": "https://github.com/ramonrsv/sci-cream/commit/e5bcee9ff23f4f5c1cc84c72425f1bf81de4217b"
        },
        "date": 1769724304587,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "allIngredientSpecs.find, first",
            "value": 89138340,
            "range": "±3.29%",
            "unit": "ops/sec",
            "extra": "84 samples"
          },
          {
            "name": "allIngredientSpecs.find, last",
            "value": 1631082,
            "range": "±0.29%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "getIngredientSpecByName, first",
            "value": 75680680,
            "range": "±3.53%",
            "unit": "ops/sec",
            "extra": "84 samples"
          },
          {
            "name": "getIngredientSpecByName, last",
            "value": 1751121,
            "range": "±0.76%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, first",
            "value": 552804,
            "range": "±0.60%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, last",
            "value": 514754,
            "range": "±0.61%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, first)",
            "value": 299333,
            "range": "±0.74%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, last)",
            "value": 237364,
            "range": "±0.52%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, first)",
            "value": 172871,
            "range": "±0.71%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, last)",
            "value": 145991,
            "range": "±0.76%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, first)",
            "value": 304068,
            "range": "±0.38%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, last)",
            "value": 290011,
            "range": "±0.50%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, first",
            "value": 1855008,
            "range": "±0.96%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, last",
            "value": 1739227,
            "range": "±1.20%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, first",
            "value": 1882174,
            "range": "±0.81%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, last",
            "value": 1783557,
            "range": "±0.79%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Dark Rum)",
            "value": 298905,
            "range": "±0.38%",
            "unit": "ops/sec",
            "extra": "98 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Whey Isolate)",
            "value": 105907,
            "range": "±0.30%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "into_ingredient_from_spec, multiple",
            "value": 32344,
            "range": "±0.29%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "cloneRecipeLines",
            "value": 5669,
            "range": "±42.12%",
            "unit": "ops/sec",
            "extra": "13 samples"
          },
          {
            "name": "makeRecipeLines",
            "value": 19725,
            "range": "±1.12%",
            "unit": "ops/sec",
            "extra": "85 samples"
          },
          {
            "name": "makeRecipeFromClonedLines",
            "value": 2110,
            "range": "±11.54%",
            "unit": "ops/sec",
            "extra": "18 samples"
          },
          {
            "name": "makeRecipeFromMadeLines",
            "value": 18675,
            "range": "±0.40%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_composition",
            "value": 1554,
            "range": "±10.50%",
            "unit": "ops/sec",
            "extra": "13 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_composition",
            "value": 16167,
            "range": "±5.94%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "bridge.calculate_recipe_composition",
            "value": 95803,
            "range": "±1.10%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "recipe.calculate_composition",
            "value": 246613,
            "range": "±0.27%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_mix_properties",
            "value": 1106,
            "range": "±8.94%",
            "unit": "ops/sec",
            "extra": "14 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_mix_properties",
            "value": 13154,
            "range": "±0.21%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "bridge.calculate_recipe_mix_properties",
            "value": 35518,
            "range": "±0.12%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 45710,
            "range": "±0.04%",
            "unit": "ops/sec",
            "extra": "98 samples"
          },
          {
            "name": "comp_key_as_med_str",
            "value": 75694,
            "range": "±0.73%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "compKeyAsMedStr",
            "value": 740220,
            "range": "±0.34%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "prop_key_as_med_str",
            "value": 10173,
            "range": "±2.02%",
            "unit": "ops/sec",
            "extra": "86 samples"
          },
          {
            "name": "propKeyAsMedStr",
            "value": 606540,
            "range": "±3.31%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "makeRecipeLines, free",
            "value": 19978,
            "range": "±3.02%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "cloneRecipeLines, free",
            "value": 1335,
            "range": "±14.43%",
            "unit": "ops/sec",
            "extra": "9 samples"
          },
          {
            "name": "makeRecipeLines, no free",
            "value": 794,
            "range": "±10.26%",
            "unit": "ops/sec",
            "extra": "20 samples"
          },
          {
            "name": "cloneRecipeLines, no free",
            "value": 1029,
            "range": "±10.70%",
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
          "id": "46d3820eab079d616b47feb3a1f903504bca37c4",
          "message": "Introduce skeleton for benchmark.js App benches\n\nIntroduce skeleton for and some simple App \"unit\" benchmarks using\nbenchmark.js, as opposed to Playwright for end-to-end benchmarks.\nAdd a CI job to run these benchmarks and upload results using\ngithub-action-benchmark, similarly to other repo CI benchmarks.",
          "timestamp": "2026-01-29T16:31:34-05:00",
          "tree_id": "6cb50ddd65ed21e1ea3db286a9c140c1f26e9d97",
          "url": "https://github.com/ramonrsv/sci-cream/commit/46d3820eab079d616b47feb3a1f903504bca37c4"
        },
        "date": 1769724478498,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "allIngredientSpecs.find, first",
            "value": 87532515,
            "range": "±2.80%",
            "unit": "ops/sec",
            "extra": "85 samples"
          },
          {
            "name": "allIngredientSpecs.find, last",
            "value": 1610368,
            "range": "±0.75%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "getIngredientSpecByName, first",
            "value": 77173162,
            "range": "±2.85%",
            "unit": "ops/sec",
            "extra": "85 samples"
          },
          {
            "name": "getIngredientSpecByName, last",
            "value": 1825848,
            "range": "±0.85%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, first",
            "value": 544922,
            "range": "±0.64%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, last",
            "value": 503719,
            "range": "±0.63%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, first)",
            "value": 298523,
            "range": "±0.65%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, last)",
            "value": 237963,
            "range": "±0.50%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, first)",
            "value": 166754,
            "range": "±0.77%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, last)",
            "value": 140605,
            "range": "±0.75%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, first)",
            "value": 303813,
            "range": "±0.51%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, last)",
            "value": 293201,
            "range": "±0.41%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, first",
            "value": 1823235,
            "range": "±0.94%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, last",
            "value": 1721091,
            "range": "±0.97%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, first",
            "value": 1845080,
            "range": "±0.82%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, last",
            "value": 1743234,
            "range": "±0.89%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Dark Rum)",
            "value": 298029,
            "range": "±0.41%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Whey Isolate)",
            "value": 105151,
            "range": "±0.28%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "into_ingredient_from_spec, multiple",
            "value": 32081,
            "range": "±0.23%",
            "unit": "ops/sec",
            "extra": "98 samples"
          },
          {
            "name": "cloneRecipeLines",
            "value": 5605,
            "range": "±39.56%",
            "unit": "ops/sec",
            "extra": "13 samples"
          },
          {
            "name": "makeRecipeLines",
            "value": 19553,
            "range": "±0.90%",
            "unit": "ops/sec",
            "extra": "89 samples"
          },
          {
            "name": "makeRecipeFromClonedLines",
            "value": 2224,
            "range": "±7.02%",
            "unit": "ops/sec",
            "extra": "19 samples"
          },
          {
            "name": "makeRecipeFromMadeLines",
            "value": 18205,
            "range": "±1.18%",
            "unit": "ops/sec",
            "extra": "87 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_composition",
            "value": 1403,
            "range": "±9.21%",
            "unit": "ops/sec",
            "extra": "11 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_composition",
            "value": 16324,
            "range": "±9.25%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "bridge.calculate_recipe_composition",
            "value": 95962,
            "range": "±0.59%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "recipe.calculate_composition",
            "value": 248133,
            "range": "±0.26%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_mix_properties",
            "value": 1146,
            "range": "±8.78%",
            "unit": "ops/sec",
            "extra": "19 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_mix_properties",
            "value": 12577,
            "range": "±7.18%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "bridge.calculate_recipe_mix_properties",
            "value": 35373,
            "range": "±0.13%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 45507,
            "range": "±0.15%",
            "unit": "ops/sec",
            "extra": "98 samples"
          },
          {
            "name": "comp_key_as_med_str",
            "value": 78141,
            "range": "±0.98%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "compKeyAsMedStr",
            "value": 732269,
            "range": "±1.08%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "prop_key_as_med_str",
            "value": 10018,
            "range": "±2.16%",
            "unit": "ops/sec",
            "extra": "84 samples"
          },
          {
            "name": "propKeyAsMedStr",
            "value": 601567,
            "range": "±3.60%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "makeRecipeLines, free",
            "value": 19723,
            "range": "±2.69%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "cloneRecipeLines, free",
            "value": 1287,
            "range": "±12.06%",
            "unit": "ops/sec",
            "extra": "11 samples"
          },
          {
            "name": "makeRecipeLines, no free",
            "value": 696,
            "range": "±12.36%",
            "unit": "ops/sec",
            "extra": "22 samples"
          },
          {
            "name": "cloneRecipeLines, no free",
            "value": 957,
            "range": "±11.14%",
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
          "id": "cf6527f475cb41d237fdbeaae8a786f27d52ff26",
          "message": "Use different server ports for Playwright CI jobs\n\nUse an environment variable `PORT` to configure the `baseURL` and\n`webServer.url` of Playwright tests/benches. CI jobs can now set\ndifferent ports so that they don't conflict with each other when running\nlocally with `act`, and so we can now run the jobs in parallel.",
          "timestamp": "2026-01-29T16:58:08-05:00",
          "tree_id": "72cb1623fa10790cade8f331e6801dbf496af275",
          "url": "https://github.com/ramonrsv/sci-cream/commit/cf6527f475cb41d237fdbeaae8a786f27d52ff26"
        },
        "date": 1769725257995,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "allIngredientSpecs.find, first",
            "value": 84865172,
            "range": "±3.62%",
            "unit": "ops/sec",
            "extra": "82 samples"
          },
          {
            "name": "allIngredientSpecs.find, last",
            "value": 1626532,
            "range": "±0.31%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "getIngredientSpecByName, first",
            "value": 74948537,
            "range": "±2.93%",
            "unit": "ops/sec",
            "extra": "81 samples"
          },
          {
            "name": "getIngredientSpecByName, last",
            "value": 1806763,
            "range": "±0.57%",
            "unit": "ops/sec",
            "extra": "88 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, first",
            "value": 554425,
            "range": "±0.57%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, last",
            "value": 510566,
            "range": "±0.69%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, first)",
            "value": 298067,
            "range": "±0.66%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, last)",
            "value": 241204,
            "range": "±0.59%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, first)",
            "value": 172752,
            "range": "±0.79%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, last)",
            "value": 147378,
            "range": "±0.66%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, first)",
            "value": 303651,
            "range": "±0.46%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, last)",
            "value": 291420,
            "range": "±0.37%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, first",
            "value": 1864451,
            "range": "±0.88%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, last",
            "value": 1744338,
            "range": "±0.93%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, first",
            "value": 1865877,
            "range": "±0.85%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, last",
            "value": 1756417,
            "range": "±0.87%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Dark Rum)",
            "value": 300716,
            "range": "±0.36%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Whey Isolate)",
            "value": 106342,
            "range": "±0.40%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "into_ingredient_from_spec, multiple",
            "value": 32603,
            "range": "±0.24%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "cloneRecipeLines",
            "value": 5849,
            "range": "±40.19%",
            "unit": "ops/sec",
            "extra": "13 samples"
          },
          {
            "name": "makeRecipeLines",
            "value": 19815,
            "range": "±0.61%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "makeRecipeFromClonedLines",
            "value": 2015,
            "range": "±9.47%",
            "unit": "ops/sec",
            "extra": "34 samples"
          },
          {
            "name": "makeRecipeFromMadeLines",
            "value": 18088,
            "range": "±6.32%",
            "unit": "ops/sec",
            "extra": "89 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_composition",
            "value": 1261,
            "range": "±13.50%",
            "unit": "ops/sec",
            "extra": "23 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_composition",
            "value": 17279,
            "range": "±0.33%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "bridge.calculate_recipe_composition",
            "value": 96653,
            "range": "±0.64%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "recipe.calculate_composition",
            "value": 241323,
            "range": "±0.28%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_mix_properties",
            "value": 1212,
            "range": "±8.70%",
            "unit": "ops/sec",
            "extra": "13 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_mix_properties",
            "value": 13113,
            "range": "±0.20%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "bridge.calculate_recipe_mix_properties",
            "value": 35609,
            "range": "±0.12%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 45743,
            "range": "±0.14%",
            "unit": "ops/sec",
            "extra": "99 samples"
          },
          {
            "name": "comp_key_as_med_str",
            "value": 79656,
            "range": "±3.05%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "compKeyAsMedStr",
            "value": 736191,
            "range": "±0.37%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "prop_key_as_med_str",
            "value": 10038,
            "range": "±1.83%",
            "unit": "ops/sec",
            "extra": "85 samples"
          },
          {
            "name": "propKeyAsMedStr",
            "value": 607917,
            "range": "±1.14%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "makeRecipeLines, free",
            "value": 20008,
            "range": "±3.12%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "cloneRecipeLines, free",
            "value": 1328,
            "range": "±10.91%",
            "unit": "ops/sec",
            "extra": "9 samples"
          },
          {
            "name": "makeRecipeLines, no free",
            "value": 868,
            "range": "±11.26%",
            "unit": "ops/sec",
            "extra": "22 samples"
          },
          {
            "name": "cloneRecipeLines, no free",
            "value": 1051,
            "range": "±6.93%",
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
          "id": "a95abf2a67f4c74f5b7fbe7b0300d95fdfc0d89f",
          "message": "Introduce Comp/Mix key get optimizations and bench\n\nIntroduce `Composition` and `MixProperties` get-by-key optimizations,\ncreating JS maps with all the key values and providing helper functions\nto access these instead of via the WASM functions of `Composition` and\n`MixProperties`. Benchmarks show that this is more performant for key\nlookups. However, the maps have to be built every time that a\n`Composition` or `MixProperties` is updated, which could be every\nrender, so this may not be more performant in real usage scenarios.",
          "timestamp": "2026-01-29T17:11:35-05:00",
          "tree_id": "584d45b421bd60740f6f0fe306f75dc0c857ae22",
          "url": "https://github.com/ramonrsv/sci-cream/commit/a95abf2a67f4c74f5b7fbe7b0300d95fdfc0d89f"
        },
        "date": 1769726142647,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "allIngredientSpecs.find, first",
            "value": 85624945,
            "range": "±3.55%",
            "unit": "ops/sec",
            "extra": "85 samples"
          },
          {
            "name": "allIngredientSpecs.find, last",
            "value": 1571203,
            "range": "±0.42%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "getIngredientSpecByName, first",
            "value": 77335894,
            "range": "±2.75%",
            "unit": "ops/sec",
            "extra": "80 samples"
          },
          {
            "name": "getIngredientSpecByName, last",
            "value": 1696846,
            "range": "±0.31%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, first",
            "value": 552758,
            "range": "±0.69%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, last",
            "value": 516876,
            "range": "±0.53%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, first)",
            "value": 298947,
            "range": "±0.62%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, last)",
            "value": 237668,
            "range": "±0.66%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, first)",
            "value": 173388,
            "range": "±0.73%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, last)",
            "value": 145542,
            "range": "±0.80%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, first)",
            "value": 294022,
            "range": "±1.11%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, last)",
            "value": 282688,
            "range": "±0.47%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, first",
            "value": 1851686,
            "range": "±0.98%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, last",
            "value": 1734429,
            "range": "±1.01%",
            "unit": "ops/sec",
            "extra": "88 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, first",
            "value": 1863498,
            "range": "±0.70%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, last",
            "value": 1766500,
            "range": "±0.78%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Dark Rum)",
            "value": 290461,
            "range": "±0.32%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Whey Isolate)",
            "value": 99362,
            "range": "±0.33%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec, multiple",
            "value": 30843,
            "range": "±0.26%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "cloneRecipeLines",
            "value": 5523,
            "range": "±36.32%",
            "unit": "ops/sec",
            "extra": "13 samples"
          },
          {
            "name": "makeRecipeLines",
            "value": 18602,
            "range": "±1.94%",
            "unit": "ops/sec",
            "extra": "87 samples"
          },
          {
            "name": "makeRecipeFromClonedLines",
            "value": 1684,
            "range": "±9.70%",
            "unit": "ops/sec",
            "extra": "40 samples"
          },
          {
            "name": "makeRecipeFromMadeLines",
            "value": 18150,
            "range": "±0.31%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_composition",
            "value": 1484,
            "range": "±8.33%",
            "unit": "ops/sec",
            "extra": "20 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_composition",
            "value": 16924,
            "range": "±0.21%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "bridge.calculate_recipe_composition",
            "value": 94974,
            "range": "±1.03%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "recipe.calculate_composition",
            "value": 246871,
            "range": "±0.35%",
            "unit": "ops/sec",
            "extra": "98 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_mix_properties",
            "value": 1108,
            "range": "±10.90%",
            "unit": "ops/sec",
            "extra": "14 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_mix_properties",
            "value": 12577,
            "range": "±4.82%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "bridge.calculate_recipe_mix_properties",
            "value": 34696,
            "range": "±0.11%",
            "unit": "ops/sec",
            "extra": "98 samples"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 45783,
            "range": "±0.10%",
            "unit": "ops/sec",
            "extra": "99 samples"
          },
          {
            "name": "composition.get",
            "value": 149832,
            "range": "±0.63%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "compValueMap.get",
            "value": 926449,
            "range": "±0.31%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "getMixProperty",
            "value": 192,
            "range": "±9.23%",
            "unit": "ops/sec",
            "extra": "15 samples"
          },
          {
            "name": "mixPropValueMap.get",
            "value": 533781,
            "range": "±31.72%",
            "unit": "ops/sec",
            "extra": "89 samples"
          },
          {
            "name": "makeCompValueMap",
            "value": 108792,
            "range": "±0.50%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "makeMixPropValueMap",
            "value": 223,
            "range": "±5.42%",
            "unit": "ops/sec",
            "extra": "14 samples"
          },
          {
            "name": "comp_key_as_med_str",
            "value": 72474,
            "range": "±11.19%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "compKeyAsMedStr",
            "value": 741195,
            "range": "±0.39%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "prop_key_as_med_str",
            "value": 10965,
            "range": "±1.69%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "propKeyAsMedStr",
            "value": 616383,
            "range": "±0.82%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "makeRecipeLines, free",
            "value": 19545,
            "range": "±0.47%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "cloneRecipeLines, free",
            "value": 1612,
            "range": "±13.30%",
            "unit": "ops/sec",
            "extra": "10 samples"
          },
          {
            "name": "makeRecipeLines, no free",
            "value": 922,
            "range": "±9.26%",
            "unit": "ops/sec",
            "extra": "21 samples"
          },
          {
            "name": "cloneRecipeLines, no free",
            "value": 1021,
            "range": "±13.66%",
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
          "id": "9fc8a956e82f2978450cbaacce8b16492a833fd9",
          "message": "Introduce comp-value-as-qty/percent optimizations\n\nThe expecation was that it would be much more performant to replicate\nthe functionality of these functions purely on the JS side than it would\nbe to do WASM calls for such simple calculations, given the cost of\nJS <-> WASM bridging. However, as it turns out, there isn't much of a\ndifference between these two methods; perhaps because there isn't much\nJS <-> WASM overhead for simple number arguments?",
          "timestamp": "2026-01-29T17:37:16-05:00",
          "tree_id": "5d2ae60b48a0fac93f225b7e86d821d9d7c74ed9",
          "url": "https://github.com/ramonrsv/sci-cream/commit/9fc8a956e82f2978450cbaacce8b16492a833fd9"
        },
        "date": 1769727219099,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "composition_value_as_quantity",
            "value": 605408,
            "range": "±0.89%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "compositionValueAsQuantity",
            "value": 864514,
            "range": "±1.18%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "composition_value_as_percentage",
            "value": 608729,
            "range": "±0.46%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "compositionValueAsPercentage",
            "value": 875082,
            "range": "±0.72%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "allIngredientSpecs.find, first",
            "value": 88841092,
            "range": "±3.34%",
            "unit": "ops/sec",
            "extra": "82 samples"
          },
          {
            "name": "allIngredientSpecs.find, last",
            "value": 1664447,
            "range": "±0.40%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "getIngredientSpecByName, first",
            "value": 78327849,
            "range": "±2.76%",
            "unit": "ops/sec",
            "extra": "87 samples"
          },
          {
            "name": "getIngredientSpecByName, last",
            "value": 1858746,
            "range": "±0.36%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, first",
            "value": 550874,
            "range": "±0.55%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, last",
            "value": 507943,
            "range": "±0.60%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, first)",
            "value": 299295,
            "range": "±0.68%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, last)",
            "value": 240062,
            "range": "±0.53%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, first)",
            "value": 171331,
            "range": "±0.80%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, last)",
            "value": 145380,
            "range": "±0.70%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, first)",
            "value": 298443,
            "range": "±0.55%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, last)",
            "value": 288221,
            "range": "±0.44%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, first",
            "value": 1842896,
            "range": "±1.03%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, last",
            "value": 1750531,
            "range": "±0.88%",
            "unit": "ops/sec",
            "extra": "88 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, first",
            "value": 1850430,
            "range": "±0.81%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, last",
            "value": 1759500,
            "range": "±0.88%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Dark Rum)",
            "value": 294221,
            "range": "±0.32%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Whey Isolate)",
            "value": 104587,
            "range": "±0.26%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "into_ingredient_from_spec, multiple",
            "value": 31858,
            "range": "±0.32%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "cloneRecipeLines",
            "value": 5480,
            "range": "±38.61%",
            "unit": "ops/sec",
            "extra": "13 samples"
          },
          {
            "name": "makeRecipeLines",
            "value": 19209,
            "range": "±1.93%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "makeRecipeFromClonedLines",
            "value": 1996,
            "range": "±7.57%",
            "unit": "ops/sec",
            "extra": "17 samples"
          },
          {
            "name": "makeRecipeFromMadeLines",
            "value": 18330,
            "range": "±1.04%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_composition",
            "value": 1431,
            "range": "±13.21%",
            "unit": "ops/sec",
            "extra": "14 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_composition",
            "value": 17144,
            "range": "±0.24%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "bridge.calculate_recipe_composition",
            "value": 95913,
            "range": "±1.03%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "recipe.calculate_composition",
            "value": 244895,
            "range": "±0.31%",
            "unit": "ops/sec",
            "extra": "98 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_mix_properties",
            "value": 1101,
            "range": "±9.31%",
            "unit": "ops/sec",
            "extra": "14 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_mix_properties",
            "value": 12801,
            "range": "±6.40%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "bridge.calculate_recipe_mix_properties",
            "value": 35607,
            "range": "±0.13%",
            "unit": "ops/sec",
            "extra": "98 samples"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 45843,
            "range": "±0.10%",
            "unit": "ops/sec",
            "extra": "99 samples"
          },
          {
            "name": "composition.get",
            "value": 147760,
            "range": "±0.52%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "compValueMap.get",
            "value": 923598,
            "range": "±0.30%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "getMixProperty",
            "value": 172,
            "range": "±11.78%",
            "unit": "ops/sec",
            "extra": "14 samples"
          },
          {
            "name": "mixPropValueMap.get",
            "value": 547219,
            "range": "±27.10%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "makeCompValueMap",
            "value": 106584,
            "range": "±0.52%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "makeMixPropValueMap",
            "value": 198,
            "range": "±6.91%",
            "unit": "ops/sec",
            "extra": "12 samples"
          },
          {
            "name": "comp_key_as_med_str",
            "value": 74090,
            "range": "±12.09%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "compKeyAsMedStr",
            "value": 736236,
            "range": "±0.36%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "prop_key_as_med_str",
            "value": 11019,
            "range": "±1.65%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "propKeyAsMedStr",
            "value": 613987,
            "range": "±0.69%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "makeRecipeLines, free",
            "value": 20198,
            "range": "±0.24%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "cloneRecipeLines, free",
            "value": 1608,
            "range": "±14.07%",
            "unit": "ops/sec",
            "extra": "10 samples"
          },
          {
            "name": "makeRecipeLines, no free",
            "value": 934,
            "range": "±8.05%",
            "unit": "ops/sec",
            "extra": "22 samples"
          },
          {
            "name": "cloneRecipeLines, no free",
            "value": 919,
            "range": "±11.32%",
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
          "id": "1c99169109d056c1254588e6ad4dd3cf9cbd8435",
          "message": "Remove .toBeVisible() calls from e2e benchmarks\n\nIt's unclear if these calls provide any more validation than just\ncalling .toHaveValue(...). In any case, there are e2e tests that\nalready perform this same validation for correctness. For the purposes\nof benchmarks, it is better to lower the overhead of the benchmarks\nthemselves as much as possible, to make the small real performance\nimpact of changes more apparent.",
          "timestamp": "2026-01-29T18:14:06-05:00",
          "tree_id": "4f81bc6005764b8eb26437d4598771bca7afd6f6",
          "url": "https://github.com/ramonrsv/sci-cream/commit/1c99169109d056c1254588e6ad4dd3cf9cbd8435"
        },
        "date": 1769729036489,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "composition_value_as_quantity",
            "value": 589972,
            "range": "±0.66%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "compositionValueAsQuantity",
            "value": 844192,
            "range": "±1.39%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "composition_value_as_percentage",
            "value": 599951,
            "range": "±0.60%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "compositionValueAsPercentage",
            "value": 874486,
            "range": "±0.41%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "allIngredientSpecs.find, first",
            "value": 89460147,
            "range": "±3.59%",
            "unit": "ops/sec",
            "extra": "87 samples"
          },
          {
            "name": "allIngredientSpecs.find, last",
            "value": 1615353,
            "range": "±0.33%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "getIngredientSpecByName, first",
            "value": 79154390,
            "range": "±2.34%",
            "unit": "ops/sec",
            "extra": "89 samples"
          },
          {
            "name": "getIngredientSpecByName, last",
            "value": 1753770,
            "range": "±0.53%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, first",
            "value": 547185,
            "range": "±0.65%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, last",
            "value": 508211,
            "range": "±0.68%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, first)",
            "value": 295936,
            "range": "±0.64%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, last)",
            "value": 236000,
            "range": "±0.55%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, first)",
            "value": 168189,
            "range": "±0.74%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, last)",
            "value": 139833,
            "range": "±0.81%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, first)",
            "value": 298428,
            "range": "±0.56%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, last)",
            "value": 286936,
            "range": "±0.59%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, first",
            "value": 1811243,
            "range": "±1.02%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, last",
            "value": 1720826,
            "range": "±0.84%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, first",
            "value": 1823007,
            "range": "±0.96%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, last",
            "value": 1710509,
            "range": "±0.84%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Dark Rum)",
            "value": 294283,
            "range": "±0.33%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Whey Isolate)",
            "value": 102698,
            "range": "±0.41%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "into_ingredient_from_spec, multiple",
            "value": 31508,
            "range": "±0.28%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "cloneRecipeLines",
            "value": 5358,
            "range": "±37.41%",
            "unit": "ops/sec",
            "extra": "14 samples"
          },
          {
            "name": "makeRecipeLines",
            "value": 19133,
            "range": "±0.96%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "makeRecipeFromClonedLines",
            "value": 2025,
            "range": "±7.05%",
            "unit": "ops/sec",
            "extra": "13 samples"
          },
          {
            "name": "makeRecipeFromMadeLines",
            "value": 17788,
            "range": "±7.43%",
            "unit": "ops/sec",
            "extra": "89 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_composition",
            "value": 1356,
            "range": "±8.21%",
            "unit": "ops/sec",
            "extra": "11 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_composition",
            "value": 16035,
            "range": "±7.01%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "bridge.calculate_recipe_composition",
            "value": 94545,
            "range": "±1.04%",
            "unit": "ops/sec",
            "extra": "89 samples"
          },
          {
            "name": "recipe.calculate_composition",
            "value": 245810,
            "range": "±0.31%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_mix_properties",
            "value": 1033,
            "range": "±6.53%",
            "unit": "ops/sec",
            "extra": "15 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_mix_properties",
            "value": 12528,
            "range": "±7.94%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "bridge.calculate_recipe_mix_properties",
            "value": 35269,
            "range": "±0.13%",
            "unit": "ops/sec",
            "extra": "99 samples"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 46047,
            "range": "±0.20%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "composition.get",
            "value": 147633,
            "range": "±0.57%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "compValueMap.get",
            "value": 913835,
            "range": "±0.36%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "getMixProperty",
            "value": 160,
            "range": "±16.13%",
            "unit": "ops/sec",
            "extra": "20 samples"
          },
          {
            "name": "mixPropValueMap.get",
            "value": 526008,
            "range": "±31.81%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "makeCompValueMap",
            "value": 106317,
            "range": "±0.69%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "makeMixPropValueMap",
            "value": 194,
            "range": "±7.48%",
            "unit": "ops/sec",
            "extra": "12 samples"
          },
          {
            "name": "comp_key_as_med_str",
            "value": 79010,
            "range": "±0.60%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "compKeyAsMedStr",
            "value": 738414,
            "range": "±0.39%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "prop_key_as_med_str",
            "value": 10971,
            "range": "±1.56%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "propKeyAsMedStr",
            "value": 610910,
            "range": "±0.78%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "makeRecipeLines, free",
            "value": 19686,
            "range": "±0.59%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "cloneRecipeLines, free",
            "value": 1574,
            "range": "±16.00%",
            "unit": "ops/sec",
            "extra": "12 samples"
          },
          {
            "name": "makeRecipeLines, no free",
            "value": 939,
            "range": "±8.39%",
            "unit": "ops/sec",
            "extra": "20 samples"
          },
          {
            "name": "cloneRecipeLines, no free",
            "value": 947,
            "range": "±10.25%",
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
          "id": "f6970504f4cbed3978b788757e8216c40e61b4c5",
          "message": "Add CI caching of downloaded Playwright browsers",
          "timestamp": "2026-01-29T20:42:47-05:00",
          "tree_id": "60fd74e4d9f8ccb6820da35c7255fba968a26759",
          "url": "https://github.com/ramonrsv/sci-cream/commit/f6970504f4cbed3978b788757e8216c40e61b4c5"
        },
        "date": 1769737729213,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "composition_value_as_quantity",
            "value": 573225,
            "range": "±1.37%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "compositionValueAsQuantity",
            "value": 867548,
            "range": "±0.82%",
            "unit": "ops/sec",
            "extra": "89 samples"
          },
          {
            "name": "composition_value_as_percentage",
            "value": 591766,
            "range": "±0.47%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "compositionValueAsPercentage",
            "value": 873787,
            "range": "±0.69%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "allIngredientSpecs.find, first",
            "value": 86923426,
            "range": "±3.36%",
            "unit": "ops/sec",
            "extra": "81 samples"
          },
          {
            "name": "allIngredientSpecs.find, last",
            "value": 1566417,
            "range": "±5.81%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "getIngredientSpecByName, first",
            "value": 76933413,
            "range": "±2.47%",
            "unit": "ops/sec",
            "extra": "85 samples"
          },
          {
            "name": "getIngredientSpecByName, last",
            "value": 1800280,
            "range": "±0.30%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, first",
            "value": 552757,
            "range": "±0.51%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, last",
            "value": 513700,
            "range": "±0.59%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, first)",
            "value": 293868,
            "range": "±0.64%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, last)",
            "value": 235705,
            "range": "±0.56%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, first)",
            "value": 172114,
            "range": "±0.66%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, last)",
            "value": 143182,
            "range": "±0.80%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, first)",
            "value": 295478,
            "range": "±0.65%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, last)",
            "value": 286435,
            "range": "±0.51%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, first",
            "value": 1778031,
            "range": "±0.88%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, last",
            "value": 1672896,
            "range": "±0.84%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, first",
            "value": 1777999,
            "range": "±0.83%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, last",
            "value": 1689137,
            "range": "±0.69%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Dark Rum)",
            "value": 292684,
            "range": "±0.48%",
            "unit": "ops/sec",
            "extra": "98 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Whey Isolate)",
            "value": 105199,
            "range": "±0.39%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "into_ingredient_from_spec, multiple",
            "value": 31766,
            "range": "±0.30%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "cloneRecipeLines",
            "value": 5133,
            "range": "±37.78%",
            "unit": "ops/sec",
            "extra": "12 samples"
          },
          {
            "name": "makeRecipeLines",
            "value": 19363,
            "range": "±1.50%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "makeRecipeFromClonedLines",
            "value": 2027,
            "range": "±8.30%",
            "unit": "ops/sec",
            "extra": "18 samples"
          },
          {
            "name": "makeRecipeFromMadeLines",
            "value": 18593,
            "range": "±0.36%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_composition",
            "value": 1444,
            "range": "±13.35%",
            "unit": "ops/sec",
            "extra": "19 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_composition",
            "value": 17213,
            "range": "±0.38%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "bridge.calculate_recipe_composition",
            "value": 95669,
            "range": "±1.62%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "recipe.calculate_composition",
            "value": 247933,
            "range": "±0.31%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_mix_properties",
            "value": 250,
            "range": "±162.28%",
            "unit": "ops/sec",
            "extra": "21 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_mix_properties",
            "value": 12708,
            "range": "±6.17%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "bridge.calculate_recipe_mix_properties",
            "value": 35888,
            "range": "±0.12%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 45865,
            "range": "±0.10%",
            "unit": "ops/sec",
            "extra": "98 samples"
          },
          {
            "name": "composition.get",
            "value": 148904,
            "range": "±0.83%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "compValueMap.get",
            "value": 916058,
            "range": "±0.33%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "getMixProperty",
            "value": 162,
            "range": "±9.97%",
            "unit": "ops/sec",
            "extra": "14 samples"
          },
          {
            "name": "mixPropValueMap.get",
            "value": 537911,
            "range": "±30.76%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "makeCompValueMap",
            "value": 108568,
            "range": "±0.57%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "makeMixPropValueMap",
            "value": 210,
            "range": "±7.44%",
            "unit": "ops/sec",
            "extra": "15 samples"
          },
          {
            "name": "comp_key_as_med_str",
            "value": 72431,
            "range": "±12.10%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "compKeyAsMedStr",
            "value": 736313,
            "range": "±0.36%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "prop_key_as_med_str",
            "value": 10919,
            "range": "±1.66%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "propKeyAsMedStr",
            "value": 611427,
            "range": "±0.73%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "makeRecipeLines, free",
            "value": 19978,
            "range": "±0.37%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "cloneRecipeLines, free",
            "value": 1463,
            "range": "±9.65%",
            "unit": "ops/sec",
            "extra": "10 samples"
          },
          {
            "name": "makeRecipeLines, no free",
            "value": 1126,
            "range": "±9.55%",
            "unit": "ops/sec",
            "extra": "25 samples"
          },
          {
            "name": "cloneRecipeLines, no free",
            "value": 993,
            "range": "±17.88%",
            "unit": "ops/sec",
            "extra": "13 samples"
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
          "id": "9c2ff566436d29257675915c000e72ffc387e5cf",
          "message": "Add support for `IngCompGrid` to show references\n\n* Add support for `IngredientCompositionGrid` to select and show the\n  composition of reference recipes as well as the main recipe.\n* Create a shared `RecipeSelection` component for the common\n  recipe-selection functionality, also used by `RecipeGrid`.\n* Add custom functionality for the recipe selection component in\n  `IngredientCompositionGrid` to disappear if there are no reference\n  recipes, but to be sticky if a reference recipe is currently selected.\n  This prevents jarring jumps back to the main recipe if a reference is\n  cleared, and having to re-select it if a new ref recipe is pasted.",
          "timestamp": "2026-01-30T13:08:13-05:00",
          "tree_id": "a4011ffdb4a5d0c5e88ab2d0d9c90062dcd842b6",
          "url": "https://github.com/ramonrsv/sci-cream/commit/9c2ff566436d29257675915c000e72ffc387e5cf"
        },
        "date": 1769812683596,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "composition_value_as_quantity",
            "value": 577813,
            "range": "±1.57%",
            "unit": "ops/sec",
            "extra": "88 samples"
          },
          {
            "name": "compositionValueAsQuantity",
            "value": 865736,
            "range": "±0.63%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "composition_value_as_percentage",
            "value": 599958,
            "range": "±0.44%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "compositionValueAsPercentage",
            "value": 870187,
            "range": "±0.37%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "allIngredientSpecs.find, first",
            "value": 87875117,
            "range": "±3.15%",
            "unit": "ops/sec",
            "extra": "87 samples"
          },
          {
            "name": "allIngredientSpecs.find, last",
            "value": 1663856,
            "range": "±0.27%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "getIngredientSpecByName, first",
            "value": 76974605,
            "range": "±3.30%",
            "unit": "ops/sec",
            "extra": "86 samples"
          },
          {
            "name": "getIngredientSpecByName, last",
            "value": 1701995,
            "range": "±0.58%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, first",
            "value": 553348,
            "range": "±0.48%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, last",
            "value": 514380,
            "range": "±0.61%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, first)",
            "value": 295381,
            "range": "±0.59%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, last)",
            "value": 235834,
            "range": "±0.46%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, first)",
            "value": 170902,
            "range": "±0.81%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, last)",
            "value": 142459,
            "range": "±0.90%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, first)",
            "value": 296438,
            "range": "±0.63%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, last)",
            "value": 287379,
            "range": "±0.37%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, first",
            "value": 1852447,
            "range": "±0.94%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, last",
            "value": 1761909,
            "range": "±0.77%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, first",
            "value": 1865755,
            "range": "±0.82%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, last",
            "value": 1776233,
            "range": "±0.80%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Dark Rum)",
            "value": 292152,
            "range": "±0.34%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Whey Isolate)",
            "value": 103180,
            "range": "±0.40%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "into_ingredient_from_spec, multiple",
            "value": 31823,
            "range": "±0.27%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "cloneRecipeLines",
            "value": 5590,
            "range": "±39.30%",
            "unit": "ops/sec",
            "extra": "14 samples"
          },
          {
            "name": "makeRecipeLines",
            "value": 19127,
            "range": "±1.06%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "makeRecipeFromClonedLines",
            "value": 2028,
            "range": "±7.01%",
            "unit": "ops/sec",
            "extra": "12 samples"
          },
          {
            "name": "makeRecipeFromMadeLines",
            "value": 17742,
            "range": "±7.47%",
            "unit": "ops/sec",
            "extra": "98 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_composition",
            "value": 1160,
            "range": "±11.62%",
            "unit": "ops/sec",
            "extra": "36 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_composition",
            "value": 16234,
            "range": "±6.51%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "bridge.calculate_recipe_composition",
            "value": 95105,
            "range": "±0.52%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "recipe.calculate_composition",
            "value": 243529,
            "range": "±0.76%",
            "unit": "ops/sec",
            "extra": "88 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_mix_properties",
            "value": 1060,
            "range": "±9.62%",
            "unit": "ops/sec",
            "extra": "14 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_mix_properties",
            "value": 12339,
            "range": "±7.91%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "bridge.calculate_recipe_mix_properties",
            "value": 35246,
            "range": "±0.13%",
            "unit": "ops/sec",
            "extra": "98 samples"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 45729,
            "range": "±0.22%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "composition.get",
            "value": 149084,
            "range": "±0.50%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "compValueMap.get",
            "value": 922746,
            "range": "±0.36%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "getMixProperty",
            "value": 161,
            "range": "±12.54%",
            "unit": "ops/sec",
            "extra": "14 samples"
          },
          {
            "name": "mixPropValueMap.get",
            "value": 516504,
            "range": "±37.63%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "makeCompValueMap",
            "value": 108850,
            "range": "±0.46%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "makeMixPropValueMap",
            "value": 192,
            "range": "±6.88%",
            "unit": "ops/sec",
            "extra": "12 samples"
          },
          {
            "name": "comp_key_as_med_str",
            "value": 75067,
            "range": "±0.45%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "compKeyAsMedStr",
            "value": 739727,
            "range": "±0.42%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "prop_key_as_med_str",
            "value": 10992,
            "range": "±1.63%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "propKeyAsMedStr",
            "value": 611683,
            "range": "±0.87%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "makeRecipeLines, free",
            "value": 19495,
            "range": "±2.35%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "cloneRecipeLines, free",
            "value": 1632,
            "range": "±11.57%",
            "unit": "ops/sec",
            "extra": "10 samples"
          },
          {
            "name": "makeRecipeLines, no free",
            "value": 996,
            "range": "±11.53%",
            "unit": "ops/sec",
            "extra": "21 samples"
          },
          {
            "name": "cloneRecipeLines, no free",
            "value": 884,
            "range": "±10.60%",
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
          "id": "777763be6bf6a52c65b64f59ca1b3864a2b817c7",
          "message": "Add TODO about storing component layout in local",
          "timestamp": "2026-01-30T13:47:26-05:00",
          "tree_id": "d8a46dbf1dae968a1817a419c43cd1cff35333eb",
          "url": "https://github.com/ramonrsv/sci-cream/commit/777763be6bf6a52c65b64f59ca1b3864a2b817c7"
        },
        "date": 1769813805179,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "composition_value_as_quantity",
            "value": 625822,
            "range": "±0.93%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "compositionValueAsQuantity",
            "value": 900514,
            "range": "±1.57%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "composition_value_as_percentage",
            "value": 620283,
            "range": "±1.06%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "compositionValueAsPercentage",
            "value": 892847,
            "range": "±0.96%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "allIngredientSpecs.find, first",
            "value": 89628697,
            "range": "±3.04%",
            "unit": "ops/sec",
            "extra": "81 samples"
          },
          {
            "name": "allIngredientSpecs.find, last",
            "value": 1641407,
            "range": "±0.51%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "getIngredientSpecByName, first",
            "value": 79074729,
            "range": "±2.98%",
            "unit": "ops/sec",
            "extra": "83 samples"
          },
          {
            "name": "getIngredientSpecByName, last",
            "value": 1818773,
            "range": "±0.37%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, first",
            "value": 564027,
            "range": "±0.59%",
            "unit": "ops/sec",
            "extra": "87 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, last",
            "value": 531551,
            "range": "±0.61%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, first)",
            "value": 300058,
            "range": "±0.54%",
            "unit": "ops/sec",
            "extra": "89 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, last)",
            "value": 245276,
            "range": "±0.68%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, first)",
            "value": 173211,
            "range": "±0.95%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, last)",
            "value": 146603,
            "range": "±0.71%",
            "unit": "ops/sec",
            "extra": "89 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, first)",
            "value": 303412,
            "range": "±0.69%",
            "unit": "ops/sec",
            "extra": "88 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, last)",
            "value": 295003,
            "range": "±0.56%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, first",
            "value": 1881412,
            "range": "±0.97%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, last",
            "value": 1762078,
            "range": "±0.72%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, first",
            "value": 1902072,
            "range": "±0.95%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, last",
            "value": 1819249,
            "range": "±0.87%",
            "unit": "ops/sec",
            "extra": "88 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Dark Rum)",
            "value": 308799,
            "range": "±0.50%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Whey Isolate)",
            "value": 108892,
            "range": "±0.50%",
            "unit": "ops/sec",
            "extra": "89 samples"
          },
          {
            "name": "into_ingredient_from_spec, multiple",
            "value": 32465,
            "range": "±0.40%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "cloneRecipeLines",
            "value": 5728,
            "range": "±35.39%",
            "unit": "ops/sec",
            "extra": "13 samples"
          },
          {
            "name": "makeRecipeLines",
            "value": 19862,
            "range": "±0.85%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "makeRecipeFromClonedLines",
            "value": 2142,
            "range": "±7.71%",
            "unit": "ops/sec",
            "extra": "14 samples"
          },
          {
            "name": "makeRecipeFromMadeLines",
            "value": 18870,
            "range": "±0.41%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_composition",
            "value": 1432,
            "range": "±8.11%",
            "unit": "ops/sec",
            "extra": "16 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_composition",
            "value": 16842,
            "range": "±7.35%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "bridge.calculate_recipe_composition",
            "value": 98139,
            "range": "±1.63%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "recipe.calculate_composition",
            "value": 253720,
            "range": "±0.44%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_mix_properties",
            "value": 1062,
            "range": "±7.38%",
            "unit": "ops/sec",
            "extra": "10 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_mix_properties",
            "value": 12871,
            "range": "±8.52%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "bridge.calculate_recipe_mix_properties",
            "value": 36065,
            "range": "±0.35%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 47162,
            "range": "±0.38%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "composition.get",
            "value": 156184,
            "range": "±0.74%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "compValueMap.get",
            "value": 963796,
            "range": "±0.54%",
            "unit": "ops/sec",
            "extra": "88 samples"
          },
          {
            "name": "getMixProperty",
            "value": 172,
            "range": "±10.36%",
            "unit": "ops/sec",
            "extra": "14 samples"
          },
          {
            "name": "mixPropValueMap.get",
            "value": 536824,
            "range": "±33.94%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "makeCompValueMap",
            "value": 109791,
            "range": "±0.57%",
            "unit": "ops/sec",
            "extra": "89 samples"
          },
          {
            "name": "makeMixPropValueMap",
            "value": 90.25,
            "range": "±116.58%",
            "unit": "ops/sec",
            "extra": "13 samples"
          },
          {
            "name": "comp_key_as_med_str",
            "value": 73577,
            "range": "±11.83%",
            "unit": "ops/sec",
            "extra": "88 samples"
          },
          {
            "name": "compKeyAsMedStr",
            "value": 748794,
            "range": "±0.42%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "prop_key_as_med_str",
            "value": 11093,
            "range": "±1.68%",
            "unit": "ops/sec",
            "extra": "88 samples"
          },
          {
            "name": "propKeyAsMedStr",
            "value": 626168,
            "range": "±0.91%",
            "unit": "ops/sec",
            "extra": "87 samples"
          },
          {
            "name": "makeRecipeLines, free",
            "value": 20894,
            "range": "±0.54%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "cloneRecipeLines, free",
            "value": 1270,
            "range": "±10.54%",
            "unit": "ops/sec",
            "extra": "12 samples"
          },
          {
            "name": "makeRecipeLines, no free",
            "value": 1013,
            "range": "±8.02%",
            "unit": "ops/sec",
            "extra": "19 samples"
          },
          {
            "name": "cloneRecipeLines, no free",
            "value": 1025,
            "range": "±10.35%",
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
          "id": "b221ee30ab5dcc37854bdce2a8cb29d7e3661bc2",
          "message": "Use non-default ports in CI so no local conflicts",
          "timestamp": "2026-01-30T13:57:42-05:00",
          "tree_id": "4e567cb684afcb8102a6fbb5a9ceb138ea4197b6",
          "url": "https://github.com/ramonrsv/sci-cream/commit/b221ee30ab5dcc37854bdce2a8cb29d7e3661bc2"
        },
        "date": 1769814678022,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "composition_value_as_quantity",
            "value": 610111,
            "range": "±0.41%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "compositionValueAsQuantity",
            "value": 865272,
            "range": "±1.29%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "composition_value_as_percentage",
            "value": 596636,
            "range": "±1.02%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "compositionValueAsPercentage",
            "value": 874257,
            "range": "±1.04%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "allIngredientSpecs.find, first",
            "value": 88565245,
            "range": "±3.13%",
            "unit": "ops/sec",
            "extra": "87 samples"
          },
          {
            "name": "allIngredientSpecs.find, last",
            "value": 1605115,
            "range": "±1.39%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "getIngredientSpecByName, first",
            "value": 78043836,
            "range": "±2.44%",
            "unit": "ops/sec",
            "extra": "84 samples"
          },
          {
            "name": "getIngredientSpecByName, last",
            "value": 1737452,
            "range": "±0.27%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, first",
            "value": 558537,
            "range": "±0.56%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, last",
            "value": 512316,
            "range": "±0.74%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, first)",
            "value": 300142,
            "range": "±0.66%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, last)",
            "value": 237306,
            "range": "±0.92%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, first)",
            "value": 173034,
            "range": "±0.69%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, last)",
            "value": 143705,
            "range": "±0.83%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, first)",
            "value": 302547,
            "range": "±0.62%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, last)",
            "value": 287949,
            "range": "±0.42%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, first",
            "value": 1860926,
            "range": "±0.91%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, last",
            "value": 1751996,
            "range": "±0.70%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, first",
            "value": 1843835,
            "range": "±0.86%",
            "unit": "ops/sec",
            "extra": "89 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, last",
            "value": 1756310,
            "range": "±0.78%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Dark Rum)",
            "value": 291836,
            "range": "±0.36%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Whey Isolate)",
            "value": 105510,
            "range": "±0.40%",
            "unit": "ops/sec",
            "extra": "98 samples"
          },
          {
            "name": "into_ingredient_from_spec, multiple",
            "value": 32021,
            "range": "±0.44%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "cloneRecipeLines",
            "value": 5520,
            "range": "±39.66%",
            "unit": "ops/sec",
            "extra": "12 samples"
          },
          {
            "name": "makeRecipeLines",
            "value": 19689,
            "range": "±1.26%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "makeRecipeFromClonedLines",
            "value": 1747,
            "range": "±9.05%",
            "unit": "ops/sec",
            "extra": "38 samples"
          },
          {
            "name": "makeRecipeFromMadeLines",
            "value": 17890,
            "range": "±5.71%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_composition",
            "value": 1578,
            "range": "±6.94%",
            "unit": "ops/sec",
            "extra": "22 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_composition",
            "value": 16739,
            "range": "±7.85%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "bridge.calculate_recipe_composition",
            "value": 97037,
            "range": "±1.09%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "recipe.calculate_composition",
            "value": 247937,
            "range": "±0.33%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_mix_properties",
            "value": 1112,
            "range": "±6.50%",
            "unit": "ops/sec",
            "extra": "14 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_mix_properties",
            "value": 12800,
            "range": "±5.87%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "bridge.calculate_recipe_mix_properties",
            "value": 35791,
            "range": "±0.10%",
            "unit": "ops/sec",
            "extra": "98 samples"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 45757,
            "range": "±0.10%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "composition.get",
            "value": 149044,
            "range": "±0.31%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "compValueMap.get",
            "value": 926333,
            "range": "±0.34%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "getMixProperty",
            "value": 198,
            "range": "±12.14%",
            "unit": "ops/sec",
            "extra": "17 samples"
          },
          {
            "name": "mixPropValueMap.get",
            "value": 517851,
            "range": "±35.06%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "makeCompValueMap",
            "value": 106926,
            "range": "±1.12%",
            "unit": "ops/sec",
            "extra": "88 samples"
          },
          {
            "name": "makeMixPropValueMap",
            "value": 225,
            "range": "±4.70%",
            "unit": "ops/sec",
            "extra": "14 samples"
          },
          {
            "name": "comp_key_as_med_str",
            "value": 73765,
            "range": "±11.09%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "compKeyAsMedStr",
            "value": 737546,
            "range": "±0.37%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "prop_key_as_med_str",
            "value": 10982,
            "range": "±1.62%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "propKeyAsMedStr",
            "value": 615201,
            "range": "±0.68%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "makeRecipeLines, free",
            "value": 20010,
            "range": "±1.19%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "cloneRecipeLines, free",
            "value": 1501,
            "range": "±8.86%",
            "unit": "ops/sec",
            "extra": "11 samples"
          },
          {
            "name": "makeRecipeLines, no free",
            "value": 1042,
            "range": "±11.19%",
            "unit": "ops/sec",
            "extra": "21 samples"
          },
          {
            "name": "cloneRecipeLines, no free",
            "value": 1047,
            "range": "±9.47%",
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
          "id": "aa83fe395d01924a6b34b6329797e209cea52e60",
          "message": "* Overhaul `RecipeContext` updates, more modular\n\n* Overhaul the helper functions for `RecipeContext` updates to be more\n  modular and flexible; most can now be pulled out `RecipeGrid` as\n  standalone functions, with the only additional dependency being\n  `RecipeResources`. Recipe copy/paste functions are also made more\n  modular, separating the stringifying/parsing, recipe context update,\n  and clipboard interactions elements. These changes are in preparation\n  for adding support to save recipes in local storage, to persist across\n  browser window refreshes.\n* From above, the new `updateRecipes(...: Recipe[])` method is notable.\n  It updates multiple recipes at once, with a single state update. This\n  is necessary when updating multiple recipes at once, e.g. in the\n  useEffect to prevent stale ingredient context, otherwise dependent\n  components may asynchronously try to render stale `Composition` or\n  `MixProperties` objects, which can lead to crashes due to freed WASM\n  memory.\n* Fix a bug in the `useEffect` to prevent stale ingredient context\n  before the recipe resources have been populated. It was previously\n  only refreshing the main recipe; now it refreshes the references as\n  well. End-to-end tests that validate this functionality are updated\n  to also check the reference recipes.",
          "timestamp": "2026-01-30T17:52:26-05:00",
          "tree_id": "45a352a0088b2f5452ea3098d1df25ef3f205e30",
          "url": "https://github.com/ramonrsv/sci-cream/commit/aa83fe395d01924a6b34b6329797e209cea52e60"
        },
        "date": 1769815088156,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "composition_value_as_quantity",
            "value": 560456,
            "range": "±4.26%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "compositionValueAsQuantity",
            "value": 870498,
            "range": "±0.71%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "composition_value_as_percentage",
            "value": 558941,
            "range": "±0.39%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "compositionValueAsPercentage",
            "value": 878309,
            "range": "±0.34%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "allIngredientSpecs.find, first",
            "value": 87549712,
            "range": "±3.13%",
            "unit": "ops/sec",
            "extra": "86 samples"
          },
          {
            "name": "allIngredientSpecs.find, last",
            "value": 1647939,
            "range": "±0.19%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "getIngredientSpecByName, first",
            "value": 77740889,
            "range": "±2.99%",
            "unit": "ops/sec",
            "extra": "84 samples"
          },
          {
            "name": "getIngredientSpecByName, last",
            "value": 1816836,
            "range": "±0.27%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, first",
            "value": 552999,
            "range": "±0.57%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, last",
            "value": 513522,
            "range": "±0.52%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, first)",
            "value": 295429,
            "range": "±0.53%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, last)",
            "value": 235152,
            "range": "±0.53%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, first)",
            "value": 167585,
            "range": "±0.74%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, last)",
            "value": 140579,
            "range": "±1.18%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, first)",
            "value": 290221,
            "range": "±0.56%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, last)",
            "value": 280116,
            "range": "±0.40%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, first",
            "value": 1848544,
            "range": "±0.94%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, last",
            "value": 1744920,
            "range": "±0.71%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, first",
            "value": 1849395,
            "range": "±0.94%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, last",
            "value": 1758358,
            "range": "±0.74%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Dark Rum)",
            "value": 287118,
            "range": "±0.33%",
            "unit": "ops/sec",
            "extra": "98 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Whey Isolate)",
            "value": 99218,
            "range": "±0.34%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "into_ingredient_from_spec, multiple",
            "value": 30703,
            "range": "±0.33%",
            "unit": "ops/sec",
            "extra": "99 samples"
          },
          {
            "name": "cloneRecipeLines",
            "value": 6238,
            "range": "±35.69%",
            "unit": "ops/sec",
            "extra": "15 samples"
          },
          {
            "name": "makeRecipeLines",
            "value": 18759,
            "range": "±1.70%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "makeRecipeFromClonedLines",
            "value": 2209,
            "range": "±8.97%",
            "unit": "ops/sec",
            "extra": "19 samples"
          },
          {
            "name": "makeRecipeFromMadeLines",
            "value": 17971,
            "range": "±0.81%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_composition",
            "value": 1097,
            "range": "±10.22%",
            "unit": "ops/sec",
            "extra": "64 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_composition",
            "value": 16413,
            "range": "±5.92%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "bridge.calculate_recipe_composition",
            "value": 94352,
            "range": "±0.60%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "recipe.calculate_composition",
            "value": 245911,
            "range": "±0.38%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_mix_properties",
            "value": 1179,
            "range": "±9.29%",
            "unit": "ops/sec",
            "extra": "20 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_mix_properties",
            "value": 12705,
            "range": "±0.48%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "bridge.calculate_recipe_mix_properties",
            "value": 35154,
            "range": "±0.10%",
            "unit": "ops/sec",
            "extra": "99 samples"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 43828,
            "range": "±0.10%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "composition.get",
            "value": 149818,
            "range": "±0.53%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "compValueMap.get",
            "value": 927611,
            "range": "±0.31%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "getMixProperty",
            "value": 167,
            "range": "±10.81%",
            "unit": "ops/sec",
            "extra": "40 samples"
          },
          {
            "name": "mixPropValueMap.get",
            "value": 579526,
            "range": "±19.80%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "makeCompValueMap",
            "value": 108747,
            "range": "±0.62%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "makeMixPropValueMap",
            "value": 237,
            "range": "±7.44%",
            "unit": "ops/sec",
            "extra": "14 samples"
          },
          {
            "name": "comp_key_as_med_str",
            "value": 72374,
            "range": "±10.09%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "compKeyAsMedStr",
            "value": 742982,
            "range": "±0.32%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "prop_key_as_med_str",
            "value": 11028,
            "range": "±1.66%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "propKeyAsMedStr",
            "value": 620333,
            "range": "±0.74%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "makeRecipeLines, free",
            "value": 19451,
            "range": "±0.38%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "cloneRecipeLines, free",
            "value": 1569,
            "range": "±16.14%",
            "unit": "ops/sec",
            "extra": "10 samples"
          },
          {
            "name": "makeRecipeLines, no free",
            "value": 1102,
            "range": "±10.41%",
            "unit": "ops/sec",
            "extra": "24 samples"
          },
          {
            "name": "cloneRecipeLines, no free",
            "value": 1105,
            "range": "±5.79%",
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
          "id": "7028bada959f97bea8f38ca75ad31c915569aceb",
          "message": "Add support to periodically save recipes in local\n\nAdd support to periodically (every ~2s) save recipes in local storage\nso that the persist across page reloads. Add new end-to-end tests to\nverify this functionality.",
          "timestamp": "2026-01-30T18:27:16-05:00",
          "tree_id": "1980350a1d03d627e4acfb64361d93f4b1ffc03e",
          "url": "https://github.com/ramonrsv/sci-cream/commit/7028bada959f97bea8f38ca75ad31c915569aceb"
        },
        "date": 1769816027599,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "composition_value_as_quantity",
            "value": 591051,
            "range": "±1.01%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "compositionValueAsQuantity",
            "value": 863725,
            "range": "±1.06%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "composition_value_as_percentage",
            "value": 586442,
            "range": "±0.76%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "compositionValueAsPercentage",
            "value": 875241,
            "range": "±0.42%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "allIngredientSpecs.find, first",
            "value": 86866922,
            "range": "±3.63%",
            "unit": "ops/sec",
            "extra": "83 samples"
          },
          {
            "name": "allIngredientSpecs.find, last",
            "value": 1641066,
            "range": "±0.19%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "getIngredientSpecByName, first",
            "value": 77964724,
            "range": "±2.89%",
            "unit": "ops/sec",
            "extra": "85 samples"
          },
          {
            "name": "getIngredientSpecByName, last",
            "value": 1819240,
            "range": "±0.28%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, first",
            "value": 562400,
            "range": "±0.61%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, last",
            "value": 520573,
            "range": "±0.59%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, first)",
            "value": 295821,
            "range": "±0.61%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, last)",
            "value": 236926,
            "range": "±0.55%",
            "unit": "ops/sec",
            "extra": "89 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, first)",
            "value": 170123,
            "range": "±0.81%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, last)",
            "value": 144390,
            "range": "±0.74%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, first)",
            "value": 296182,
            "range": "±0.62%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, last)",
            "value": 286294,
            "range": "±0.73%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, first",
            "value": 1826609,
            "range": "±0.88%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, last",
            "value": 1741488,
            "range": "±0.82%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, first",
            "value": 1850698,
            "range": "±0.82%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, last",
            "value": 1746086,
            "range": "±0.80%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Dark Rum)",
            "value": 292833,
            "range": "±0.42%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Whey Isolate)",
            "value": 104479,
            "range": "±0.31%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "into_ingredient_from_spec, multiple",
            "value": 31763,
            "range": "±0.23%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "cloneRecipeLines",
            "value": 5063,
            "range": "±38.03%",
            "unit": "ops/sec",
            "extra": "13 samples"
          },
          {
            "name": "makeRecipeLines",
            "value": 19302,
            "range": "±0.87%",
            "unit": "ops/sec",
            "extra": "88 samples"
          },
          {
            "name": "makeRecipeFromClonedLines",
            "value": 1755,
            "range": "±8.64%",
            "unit": "ops/sec",
            "extra": "45 samples"
          },
          {
            "name": "makeRecipeFromMadeLines",
            "value": 17831,
            "range": "±6.26%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_composition",
            "value": 1582,
            "range": "±8.81%",
            "unit": "ops/sec",
            "extra": "15 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_composition",
            "value": 16385,
            "range": "±7.10%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "bridge.calculate_recipe_composition",
            "value": 93715,
            "range": "±0.96%",
            "unit": "ops/sec",
            "extra": "89 samples"
          },
          {
            "name": "recipe.calculate_composition",
            "value": 246003,
            "range": "±0.27%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_mix_properties",
            "value": 1143,
            "range": "±7.84%",
            "unit": "ops/sec",
            "extra": "15 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_mix_properties",
            "value": 12507,
            "range": "±6.70%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "bridge.calculate_recipe_mix_properties",
            "value": 35138,
            "range": "±0.13%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 46047,
            "range": "±0.11%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "composition.get",
            "value": 149489,
            "range": "±0.34%",
            "unit": "ops/sec",
            "extra": "98 samples"
          },
          {
            "name": "compValueMap.get",
            "value": 911737,
            "range": "±0.39%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "getMixProperty",
            "value": 161,
            "range": "±11.62%",
            "unit": "ops/sec",
            "extra": "14 samples"
          },
          {
            "name": "mixPropValueMap.get",
            "value": 532735,
            "range": "±28.83%",
            "unit": "ops/sec",
            "extra": "89 samples"
          },
          {
            "name": "makeCompValueMap",
            "value": 108356,
            "range": "±0.52%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "makeMixPropValueMap",
            "value": 219,
            "range": "±6.81%",
            "unit": "ops/sec",
            "extra": "13 samples"
          },
          {
            "name": "comp_key_as_med_str",
            "value": 71052,
            "range": "±13.39%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "compKeyAsMedStr",
            "value": 726238,
            "range": "±0.55%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "prop_key_as_med_str",
            "value": 10758,
            "range": "±1.76%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "propKeyAsMedStr",
            "value": 610713,
            "range": "±0.70%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "makeRecipeLines, free",
            "value": 18913,
            "range": "±8.25%",
            "unit": "ops/sec",
            "extra": "89 samples"
          },
          {
            "name": "cloneRecipeLines, free",
            "value": 1475,
            "range": "±14.85%",
            "unit": "ops/sec",
            "extra": "10 samples"
          },
          {
            "name": "makeRecipeLines, no free",
            "value": 1129,
            "range": "±14.26%",
            "unit": "ops/sec",
            "extra": "26 samples"
          },
          {
            "name": "cloneRecipeLines, no free",
            "value": 1060,
            "range": "±8.44%",
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
          "id": "b552c64fc042faa53f3a05428116f36d81e493fa",
          "message": "Add empty <div></div> around ing composition table\n\nThis is in preparation for the upcoming left-hand-side ingredient and\nquantities table, so clean up the diff affected by indentation.",
          "timestamp": "2026-01-30T23:00:46-05:00",
          "tree_id": "a9c09c14b52f1a361f21be4d15c669b2f0af9499",
          "url": "https://github.com/ramonrsv/sci-cream/commit/b552c64fc042faa53f3a05428116f36d81e493fa"
        },
        "date": 1769832861341,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "composition_value_as_quantity",
            "value": 531719,
            "range": "±0.73%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "compositionValueAsQuantity",
            "value": 736754,
            "range": "±0.74%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "composition_value_as_percentage",
            "value": 525487,
            "range": "±0.48%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "compositionValueAsPercentage",
            "value": 740832,
            "range": "±0.45%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "allIngredientSpecs.find, first",
            "value": 94370033,
            "range": "±4.13%",
            "unit": "ops/sec",
            "extra": "79 samples"
          },
          {
            "name": "allIngredientSpecs.find, last",
            "value": 1826809,
            "range": "±0.44%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "getIngredientSpecByName, first",
            "value": 71790431,
            "range": "±2.24%",
            "unit": "ops/sec",
            "extra": "86 samples"
          },
          {
            "name": "getIngredientSpecByName, last",
            "value": 2151095,
            "range": "±0.38%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, first",
            "value": 563401,
            "range": "±0.69%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, last",
            "value": 507520,
            "range": "±0.61%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, first)",
            "value": 288605,
            "range": "±0.58%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, last)",
            "value": 241597,
            "range": "±0.50%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, first)",
            "value": 167422,
            "range": "±0.81%",
            "unit": "ops/sec",
            "extra": "89 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, last)",
            "value": 138546,
            "range": "±0.74%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, first)",
            "value": 289407,
            "range": "±0.93%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, last)",
            "value": 282119,
            "range": "±0.52%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, first",
            "value": 1847170,
            "range": "±0.99%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, last",
            "value": 1747435,
            "range": "±0.81%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, first",
            "value": 1842585,
            "range": "±0.89%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, last",
            "value": 1750485,
            "range": "±0.89%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Dark Rum)",
            "value": 286483,
            "range": "±0.55%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Whey Isolate)",
            "value": 104190,
            "range": "±0.45%",
            "unit": "ops/sec",
            "extra": "98 samples"
          },
          {
            "name": "into_ingredient_from_spec, multiple",
            "value": 31462,
            "range": "±0.25%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "cloneRecipeLines",
            "value": 5955,
            "range": "±36.39%",
            "unit": "ops/sec",
            "extra": "13 samples"
          },
          {
            "name": "makeRecipeLines",
            "value": 19136,
            "range": "±0.96%",
            "unit": "ops/sec",
            "extra": "86 samples"
          },
          {
            "name": "makeRecipeFromClonedLines",
            "value": 2628,
            "range": "±7.32%",
            "unit": "ops/sec",
            "extra": "16 samples"
          },
          {
            "name": "makeRecipeFromMadeLines",
            "value": 18410,
            "range": "±0.30%",
            "unit": "ops/sec",
            "extra": "98 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_composition",
            "value": 1939,
            "range": "±4.66%",
            "unit": "ops/sec",
            "extra": "15 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_composition",
            "value": 16629,
            "range": "±7.51%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "bridge.calculate_recipe_composition",
            "value": 101906,
            "range": "±0.57%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "recipe.calculate_composition",
            "value": 289039,
            "range": "±1.05%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_mix_properties",
            "value": 1303,
            "range": "±8.65%",
            "unit": "ops/sec",
            "extra": "17 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_mix_properties",
            "value": 12977,
            "range": "±6.66%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "bridge.calculate_recipe_mix_properties",
            "value": 38070,
            "range": "±0.11%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 50734,
            "range": "±0.27%",
            "unit": "ops/sec",
            "extra": "99 samples"
          },
          {
            "name": "composition.get",
            "value": 173427,
            "range": "±0.71%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "compValueMap.get",
            "value": 798237,
            "range": "±0.38%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "getMixProperty",
            "value": 221,
            "range": "±7.18%",
            "unit": "ops/sec",
            "extra": "17 samples"
          },
          {
            "name": "mixPropValueMap.get",
            "value": 498767,
            "range": "±29.67%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "makeCompValueMap",
            "value": 118522,
            "range": "±0.65%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "makeMixPropValueMap",
            "value": 267,
            "range": "±5.57%",
            "unit": "ops/sec",
            "extra": "16 samples"
          },
          {
            "name": "comp_key_as_med_str",
            "value": 77415,
            "range": "±0.58%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "compKeyAsMedStr",
            "value": 639658,
            "range": "±0.36%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "prop_key_as_med_str",
            "value": 10197,
            "range": "±1.17%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "propKeyAsMedStr",
            "value": 563994,
            "range": "±0.62%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "makeRecipeLines, free",
            "value": 19802,
            "range": "±0.21%",
            "unit": "ops/sec",
            "extra": "99 samples"
          },
          {
            "name": "cloneRecipeLines, free",
            "value": 1747,
            "range": "±16.85%",
            "unit": "ops/sec",
            "extra": "10 samples"
          },
          {
            "name": "makeRecipeLines, no free",
            "value": 1163,
            "range": "±12.81%",
            "unit": "ops/sec",
            "extra": "19 samples"
          },
          {
            "name": "cloneRecipeLines, no free",
            "value": 1014,
            "range": "±14.26%",
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
          "id": "b4b1b84ad326c723e81d06ab5f2f40ddcdb7cd49",
          "message": "Add ingredient and quanity column to `IngCompGrid`\n\nAdd two left columns to `IngredientCompositionGrid`, to show the\ncorresponding ingredient name and quantity (affected by QtyToggle).\nThese columns are actually a separate table, to which the\noverflow-x-auto does not apply, so it's not affected by a scrollbar.",
          "timestamp": "2026-01-31T00:31:23-05:00",
          "tree_id": "ce243172be9bf41530c16b313c3720838bfad91d",
          "url": "https://github.com/ramonrsv/sci-cream/commit/b4b1b84ad326c723e81d06ab5f2f40ddcdb7cd49"
        },
        "date": 1769837956753,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "composition_value_as_quantity",
            "value": 590956,
            "range": "±4.53%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "compositionValueAsQuantity",
            "value": 860652,
            "range": "±1.26%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "composition_value_as_percentage",
            "value": 593330,
            "range": "±0.53%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "compositionValueAsPercentage",
            "value": 877270,
            "range": "±0.40%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "allIngredientSpecs.find, first",
            "value": 85000962,
            "range": "±3.24%",
            "unit": "ops/sec",
            "extra": "84 samples"
          },
          {
            "name": "allIngredientSpecs.find, last",
            "value": 1619621,
            "range": "±0.26%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "getIngredientSpecByName, first",
            "value": 74316970,
            "range": "±2.98%",
            "unit": "ops/sec",
            "extra": "83 samples"
          },
          {
            "name": "getIngredientSpecByName, last",
            "value": 1808984,
            "range": "±0.38%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, first",
            "value": 551778,
            "range": "±0.59%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "get_ingredient_spec_by_name, last",
            "value": 510710,
            "range": "±0.62%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, first)",
            "value": 294867,
            "range": "±0.60%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "into_ingredient_from_spec(getIngredientSpecByName, last)",
            "value": 237367,
            "range": "±0.53%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, first)",
            "value": 167308,
            "range": "±0.68%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "into_ingredient_from_spec(get_ingredient_spec_by_name, last)",
            "value": 141818,
            "range": "±0.76%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, first)",
            "value": 296463,
            "range": "±0.60%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "into_ingredient_from_spec(map lookup, last)",
            "value": 285102,
            "range": "±0.51%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, first",
            "value": 1825213,
            "range": "±1.06%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "IngredientDatabase.get_ingredient_by_name, last",
            "value": 1729703,
            "range": "±0.84%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, first",
            "value": 1849462,
            "range": "±0.75%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "Bridge.get_ingredient_by_name, last",
            "value": 1747233,
            "range": "±0.77%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Dark Rum)",
            "value": 292851,
            "range": "±0.39%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "into_ingredient_from_spec, single (Whey Isolate)",
            "value": 103833,
            "range": "±0.41%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "into_ingredient_from_spec, multiple",
            "value": 31430,
            "range": "±0.29%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "cloneRecipeLines",
            "value": 4827,
            "range": "±37.25%",
            "unit": "ops/sec",
            "extra": "12 samples"
          },
          {
            "name": "makeRecipeLines",
            "value": 18809,
            "range": "±4.20%",
            "unit": "ops/sec",
            "extra": "88 samples"
          },
          {
            "name": "makeRecipeFromClonedLines",
            "value": 1728,
            "range": "±7.64%",
            "unit": "ops/sec",
            "extra": "45 samples"
          },
          {
            "name": "makeRecipeFromMadeLines",
            "value": 17599,
            "range": "±5.57%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_composition",
            "value": 1552,
            "range": "±10.40%",
            "unit": "ops/sec",
            "extra": "15 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_composition",
            "value": 16912,
            "range": "±0.27%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "bridge.calculate_recipe_composition",
            "value": 95473,
            "range": "±0.57%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "recipe.calculate_composition",
            "value": 244796,
            "range": "±0.37%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "makeRecipeFromClonedLines.calculate_mix_properties",
            "value": 949,
            "range": "±15.48%",
            "unit": "ops/sec",
            "extra": "18 samples"
          },
          {
            "name": "makeRecipeFromMadeLines.calculate_mix_properties",
            "value": 12720,
            "range": "±5.80%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "bridge.calculate_recipe_mix_properties",
            "value": 35640,
            "range": "±0.09%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "recipe.calculate_mix_properties",
            "value": 46001,
            "range": "±0.29%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "composition.get",
            "value": 112079,
            "range": "±0.64%",
            "unit": "ops/sec",
            "extra": "77 samples"
          },
          {
            "name": "compValueMap.get",
            "value": 916967,
            "range": "±0.37%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "getMixProperty",
            "value": 156,
            "range": "±9.67%",
            "unit": "ops/sec",
            "extra": "33 samples"
          },
          {
            "name": "mixPropValueMap.get",
            "value": 536738,
            "range": "±29.93%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "makeCompValueMap",
            "value": 97023,
            "range": "±0.45%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "makeMixPropValueMap",
            "value": 203,
            "range": "±9.41%",
            "unit": "ops/sec",
            "extra": "13 samples"
          },
          {
            "name": "comp_key_as_med_str",
            "value": 76709,
            "range": "±0.35%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "compKeyAsMedStr",
            "value": 730976,
            "range": "±0.52%",
            "unit": "ops/sec",
            "extra": "95 samples"
          },
          {
            "name": "prop_key_as_med_str",
            "value": 10922,
            "range": "±1.64%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "propKeyAsMedStr",
            "value": 615518,
            "range": "±0.72%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "makeRecipeLines, free",
            "value": 19829,
            "range": "±0.47%",
            "unit": "ops/sec",
            "extra": "89 samples"
          },
          {
            "name": "cloneRecipeLines, free",
            "value": 1622,
            "range": "±15.86%",
            "unit": "ops/sec",
            "extra": "10 samples"
          },
          {
            "name": "makeRecipeLines, no free",
            "value": 1061,
            "range": "±11.33%",
            "unit": "ops/sec",
            "extra": "24 samples"
          },
          {
            "name": "cloneRecipeLines, no free",
            "value": 1023,
            "range": "±9.55%",
            "unit": "ops/sec",
            "extra": "11 samples"
          }
        ]
      }
    ],
    "App UI Benchmarks": [
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
          "id": "0ba39247a814820828c313942d54681ab8c02f55",
          "message": "Add README.md links to GitHub pages and benchmarks",
          "timestamp": "2026-01-20T21:46:52-05:00",
          "tree_id": "293e979812432f593b3c6900c208a92879ec2e85",
          "url": "https://github.com/ramonrsv/sci-cream/commit/0ba39247a814820828c313942d54681ab8c02f55"
        },
        "date": 1768964129963,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Initial page load",
            "value": 1150,
            "range": "41.23",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input",
            "value": 74.1,
            "range": "10.25",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input to composition",
            "value": 80,
            "range": "9.02",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input",
            "value": 53.2,
            "range": "7.08",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input to mix property",
            "value": 44.6,
            "range": "3.14",
            "unit": "ms"
          },
          {
            "name": "Recipe paste",
            "value": 157.9,
            "range": "11.29",
            "unit": "ms"
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
          "id": "feb42eb0469fe7e2ef00c0d0de99e91e0ec6d777",
          "message": "Improve format of app bench logs, remove from test",
          "timestamp": "2026-01-21T01:38:23-05:00",
          "tree_id": "01b0e70a9f85161d5893f2509b3faba9d4675158",
          "url": "https://github.com/ramonrsv/sci-cream/commit/feb42eb0469fe7e2ef00c0d0de99e91e0ec6d777"
        },
        "date": 1768978003006,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Initial page load",
            "value": 1138,
            "range": "47.77",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input",
            "value": 74.4,
            "range": "8.95",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input to composition",
            "value": 77.4,
            "range": "13.12",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input",
            "value": 51.3,
            "range": "7.44",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input to mix property",
            "value": 42.1,
            "range": "2.34",
            "unit": "ms"
          },
          {
            "name": "Recipe paste",
            "value": 153.3,
            "range": "12.68",
            "unit": "ms"
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
          "id": "d1916ab1f35752779e2ab4e106b2ef0edf44fc2c",
          "message": "Add App e2e bench for recipe switch in RecipeGrid",
          "timestamp": "2026-01-21T04:25:07-05:00",
          "tree_id": "fc248df690a9c417283f138a01427a672766ed84",
          "url": "https://github.com/ramonrsv/sci-cream/commit/d1916ab1f35752779e2ab4e106b2ef0edf44fc2c"
        },
        "date": 1769035067199,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Initial page load",
            "value": 1139.1,
            "range": "43.56",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input",
            "value": 75.6,
            "range": "10.15",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input to composition",
            "value": 85.7,
            "range": "19.13",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input",
            "value": 54.3,
            "range": "7.82",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input to mix property",
            "value": 46.2,
            "range": "3.68",
            "unit": "ms"
          },
          {
            "name": "Recipe paste",
            "value": 158.6,
            "range": "16.09",
            "unit": "ms"
          },
          {
            "name": "Recipe switch",
            "value": 62.2,
            "range": "2.32",
            "unit": "ms"
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
          "id": "930b83a2eda0cd72894beb767bdc24f36f0ce037",
          "message": "Add App benches for rapid ingredient qty updates",
          "timestamp": "2026-01-21T13:37:27-05:00",
          "tree_id": "3b84020a999964040b742ec916294dd4ebcbd38b",
          "url": "https://github.com/ramonrsv/sci-cream/commit/930b83a2eda0cd72894beb767bdc24f36f0ce037"
        },
        "date": 1769042691143,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Initial page load",
            "value": 1143.5,
            "range": "44.12",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input",
            "value": 76.5,
            "range": "10.95",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input to composition",
            "value": 79,
            "range": "11.17",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input",
            "value": 52,
            "range": "5.87",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input to mix property",
            "value": 45.1,
            "range": "2.47",
            "unit": "ms"
          },
          {
            "name": "Recipe paste",
            "value": 162.6,
            "range": "13.86",
            "unit": "ms"
          },
          {
            "name": "Recipe switch",
            "value": 62.7,
            "range": "2.69",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, each",
            "value": 68.24545454545455,
            "range": "1.98",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, final",
            "value": 41.60909090909091,
            "range": "1.38",
            "unit": "ms"
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
          "id": "47235276c0f9486f54eed2b4b925c6e06f0bc447",
          "message": "Remove simulated network latency in db fetches\n\nThis was originally there to make inefficient loading more aparent.\nHowever, now that everything is loaded up front once, this isn't very\nmeaningful anymore, and it greatly slows down benchmark execution setup;\nmost actual performance measurements should be unaffected.",
          "timestamp": "2026-01-21T13:50:49-05:00",
          "tree_id": "2ad54da4b98c3d409bda6ce145277a89f351b016",
          "url": "https://github.com/ramonrsv/sci-cream/commit/47235276c0f9486f54eed2b4b925c6e06f0bc447"
        },
        "date": 1769043052949,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Initial page load",
            "value": 678.9,
            "range": "55.08",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input",
            "value": 84,
            "range": "18.21",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input to composition",
            "value": 75.8,
            "range": "7.92",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input",
            "value": 49.2,
            "range": "8.46",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input to mix property",
            "value": 44.5,
            "range": "3.53",
            "unit": "ms"
          },
          {
            "name": "Recipe paste",
            "value": 142.2,
            "range": "13.56",
            "unit": "ms"
          },
          {
            "name": "Recipe switch",
            "value": 58.2,
            "range": "2.14",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, each",
            "value": 61.863636363636374,
            "range": "1.28",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, final",
            "value": 39.800000000000004,
            "range": "1.27",
            "unit": "ms"
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
          "id": "c1f5a25b345549e2488d009fb0de3f6ce06144fb",
          "message": "Move e2e test assets to __tests__/assets, add more\n\n@todo There seems to be a stability issue when making many ingredient\nquantity updates, uncovered by the new longer list. Investigate and\nuncomment the full list once the issues have been resolved.",
          "timestamp": "2026-01-21T13:51:23-05:00",
          "tree_id": "81863959ffedc2e8553254a32e6fb59974ab40b8",
          "url": "https://github.com/ramonrsv/sci-cream/commit/c1f5a25b345549e2488d009fb0de3f6ce06144fb"
        },
        "date": 1769044583728,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Initial page load",
            "value": 681.7,
            "range": "60.69",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input",
            "value": 78,
            "range": "10.16",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input to composition",
            "value": 86.9,
            "range": "18.28",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input",
            "value": 51.9,
            "range": "10.60",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input to mix property",
            "value": 46.7,
            "range": "2.05",
            "unit": "ms"
          },
          {
            "name": "Recipe paste",
            "value": 149,
            "range": "12.15",
            "unit": "ms"
          },
          {
            "name": "Recipe switch",
            "value": 60,
            "range": "3.71",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, each",
            "value": 62.05483870967741,
            "range": "1.02",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, final",
            "value": 35.680645161290315,
            "range": "0.64",
            "unit": "ms"
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
          "id": "7494de95a354d244a21389afb092461c5db95b64",
          "message": "Use ESLint --max-warnings=0 to treat warn as error",
          "timestamp": "2026-01-21T13:51:23-05:00",
          "tree_id": "8e1df33892b3d27ae855785526d81c166b203ef4",
          "url": "https://github.com/ramonrsv/sci-cream/commit/7494de95a354d244a21389afb092461c5db95b64"
        },
        "date": 1769065830539,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Initial page load",
            "value": 688.7,
            "range": "55.37",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input",
            "value": 89.7,
            "range": "15.72",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input to composition",
            "value": 82.6,
            "range": "14.37",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input",
            "value": 49.9,
            "range": "3.78",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input to mix property",
            "value": 46.1,
            "range": "3.33",
            "unit": "ms"
          },
          {
            "name": "Recipe paste",
            "value": 150.6,
            "range": "13.18",
            "unit": "ms"
          },
          {
            "name": "Recipe switch",
            "value": 64.1,
            "range": "2.17",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, each",
            "value": 64.04516129032258,
            "range": "1.43",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, final",
            "value": 36.7741935483871,
            "range": "0.56",
            "unit": "ms"
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
          "id": "f685f79353477f217b5e592a6f3f108b5c6b650d",
          "message": "Fix pattern waiting for column headers to contain",
          "timestamp": "2026-01-21T14:59:11-05:00",
          "tree_id": "e37c94bc07c94ddc4578b07d11a176e4aa8cff2a",
          "url": "https://github.com/ramonrsv/sci-cream/commit/f685f79353477f217b5e592a6f3f108b5c6b650d"
        },
        "date": 1769066300051,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Initial page load",
            "value": 683.5,
            "range": "55.09",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input",
            "value": 72.8,
            "range": "10.01",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input to composition",
            "value": 98.8,
            "range": "9.20",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input",
            "value": 52.4,
            "range": "10.39",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input to mix property",
            "value": 45.7,
            "range": "3.87",
            "unit": "ms"
          },
          {
            "name": "Recipe paste",
            "value": 154.5,
            "range": "14.55",
            "unit": "ms"
          },
          {
            "name": "Recipe switch",
            "value": 66.2,
            "range": "2.60",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, each",
            "value": 67.61290322580643,
            "range": "1.19",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, final",
            "value": 35.60645161290323,
            "range": "0.69",
            "unit": "ms"
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
          "id": "0e383c927f66212dab7510582c33858eb4f46823",
          "message": "Add test to verify UI resilience to slow initial\n\nThis test simulates a slow initial load to ensure that recipe paste\nremains responsive and that the UI updates correctly once the data is\navailable. It should fail if the `useEffect` in `RecipeGrid` to \"Prevent\nstale ingredient rows if pasted quickly whilst... still loading...\" is\nremoved.",
          "timestamp": "2026-01-21T15:58:03-05:00",
          "tree_id": "103ec1568aeb1b80d558d3acf67e87986bd452e6",
          "url": "https://github.com/ramonrsv/sci-cream/commit/0e383c927f66212dab7510582c33858eb4f46823"
        },
        "date": 1769066377648,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Initial page load",
            "value": 704.2,
            "range": "55.45",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input",
            "value": 69.4,
            "range": "7.76",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input to composition",
            "value": 87.5,
            "range": "14.82",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input",
            "value": 51.2,
            "range": "11.18",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input to mix property",
            "value": 44.6,
            "range": "3.88",
            "unit": "ms"
          },
          {
            "name": "Recipe paste",
            "value": 152.4,
            "range": "14.33",
            "unit": "ms"
          },
          {
            "name": "Recipe switch",
            "value": 65.1,
            "range": "3.36",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, each",
            "value": 68.36129032258063,
            "range": "1.84",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, final",
            "value": 36.751612903225805,
            "range": "0.76",
            "unit": "ms"
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
          "id": "d90e14e429d7794804e6a97016c85421b9523ce0",
          "message": "Format e2e benchmark result uploads to 2 decimals",
          "timestamp": "2026-01-22T02:15:46-05:00",
          "tree_id": "afb768f7f4cf98eefd1173be226a842923380490",
          "url": "https://github.com/ramonrsv/sci-cream/commit/d90e14e429d7794804e6a97016c85421b9523ce0"
        },
        "date": 1769066713405,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Initial page load",
            "value": 679.1,
            "range": "46.15",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input",
            "value": 78.4,
            "range": "9.57",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input to composition",
            "value": 84.3,
            "range": "9.98",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input",
            "value": 50.5,
            "range": "9.40",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input to mix property",
            "value": 44.6,
            "range": "5.14",
            "unit": "ms"
          },
          {
            "name": "Recipe paste",
            "value": 143.4,
            "range": "9.78",
            "unit": "ms"
          },
          {
            "name": "Recipe switch",
            "value": 65.3,
            "range": "2.19",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, each",
            "value": 66.57,
            "range": "0.87",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, final",
            "value": 35.94,
            "range": "0.79",
            "unit": "ms"
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
          "id": "21eb5d55eb18ed370bb0359ea40c814a1d60064b",
          "message": "Add 'database' feature for IngredientDatabase\n\n* Add 'database' feature to guard the inclusion of `IngredientDatabase`,\n  separate from 'data' for the inclusion of embedded ingredients data.\n\n* Add new `IngredientDatabase::seeded_from_embedded_data` that is\n  enabled if both 'database' and 'data' features are enabled.",
          "timestamp": "2026-01-26T12:24:59-05:00",
          "tree_id": "db248c3267f86917c0046d69d8fc5460aeb7db4a",
          "url": "https://github.com/ramonrsv/sci-cream/commit/21eb5d55eb18ed370bb0359ea40c814a1d60064b"
        },
        "date": 1769452992552,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Initial page load",
            "value": 677.2,
            "range": "50.37",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input",
            "value": 69.3,
            "range": "8.23",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input to composition",
            "value": 88.5,
            "range": "10.64",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input",
            "value": 53.5,
            "range": "12.59",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input to mix property",
            "value": 43,
            "range": "3.35",
            "unit": "ms"
          },
          {
            "name": "Recipe paste",
            "value": 138.6,
            "range": "12.91",
            "unit": "ms"
          },
          {
            "name": "Recipe switch",
            "value": 62.4,
            "range": "2.06",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, each",
            "value": 61.76,
            "range": "1.47",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, final",
            "value": 34.01,
            "range": "0.35",
            "unit": "ms"
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
          "id": "7d9af8bc7a9740ff545b98d5287aebdb35097995",
          "message": "Add memory usage benches and leak detection tests\n\n* Add peak memory usage benchmarks and memory leak detection tests.\n* Refactor __benches__/e2e and __tests__/e2e files, separating web\n  vitals, UI responsivness, and memory usage benches and tests.\n  Note that this requires the use of 'zzz-output-results.spec.ts`,\n  a hacky solution to collect and output results from multiple files.",
          "timestamp": "2026-01-26T18:08:36-05:00",
          "tree_id": "1ef54eb311adf1f9c84f0c04df75a7dcd16bbc8c",
          "url": "https://github.com/ramonrsv/sci-cream/commit/7d9af8bc7a9740ff545b98d5287aebdb35097995"
        },
        "date": 1769469663117,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Peak memory usage during typical ops",
            "value": 82.365,
            "range": "11.569",
            "unit": "MB"
          },
          {
            "name": "Initial page load",
            "value": 681.7,
            "range": "49.50",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input",
            "value": 68.2,
            "range": "7.82",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input to composition",
            "value": 87.1,
            "range": "9.29",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input",
            "value": 50.8,
            "range": "8.29",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input to mix property",
            "value": 44.5,
            "range": "3.44",
            "unit": "ms"
          },
          {
            "name": "Recipe paste",
            "value": 146.9,
            "range": "15.25",
            "unit": "ms"
          },
          {
            "name": "Recipe switch",
            "value": 61.4,
            "range": "2.46",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, each",
            "value": 67.15,
            "range": "1.40",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, final",
            "value": 36.07,
            "range": "0.51",
            "unit": "ms"
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
          "id": "1c5425dc5b57c23df5731cfb7930f212c4898d08",
          "message": "Resolve stability issues and enable full assets\n\nThe stability issues turned out to be that the 30s test timeout was\nbeing reached, but the error messages were a bit cryptic. Setting a\nlonger timeout on the failing tests resolves the issue, and allows the\nfull set of assets to be enabled.",
          "timestamp": "2026-01-26T18:25:20-05:00",
          "tree_id": "c0c7605091751bd113b5f98e8a05901420ac1cc0",
          "url": "https://github.com/ramonrsv/sci-cream/commit/1c5425dc5b57c23df5731cfb7930f212c4898d08"
        },
        "date": 1769470772645,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Peak memory usage during typical ops",
            "value": 80.029,
            "range": "4.021",
            "unit": "MB"
          },
          {
            "name": "Initial page load",
            "value": 677.3,
            "range": "54.81",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input",
            "value": 70.8,
            "range": "17.01",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input to composition",
            "value": 78.6,
            "range": "11.26",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input",
            "value": 51.5,
            "range": "12.74",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input to mix property",
            "value": 46.1,
            "range": "3.67",
            "unit": "ms"
          },
          {
            "name": "Recipe paste",
            "value": 147.7,
            "range": "16.92",
            "unit": "ms"
          },
          {
            "name": "Recipe switch",
            "value": 61.9,
            "range": "2.43",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, each",
            "value": 64.12,
            "range": "2.76",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, final",
            "value": 34.92,
            "range": "0.85",
            "unit": "ms"
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
          "id": "926ffb458e621e7d7fad304d5ae78d56c2fcc57c",
          "message": "Use global test.setTimeout for UI Perf Benchmarks",
          "timestamp": "2026-01-26T21:01:28-05:00",
          "tree_id": "27a1422a7b739e5d7130a8200a50d79a83725258",
          "url": "https://github.com/ramonrsv/sci-cream/commit/926ffb458e621e7d7fad304d5ae78d56c2fcc57c"
        },
        "date": 1769480087196,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Peak memory usage during typical ops",
            "value": 84.042,
            "range": "5.186",
            "unit": "MB"
          },
          {
            "name": "Initial page load",
            "value": 679.6,
            "range": "49.18",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input",
            "value": 67.3,
            "range": "8.66",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input to composition",
            "value": 79.9,
            "range": "6.38",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input",
            "value": 49.6,
            "range": "8.98",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input to mix property",
            "value": 42.9,
            "range": "3.86",
            "unit": "ms"
          },
          {
            "name": "Recipe paste",
            "value": 142.8,
            "range": "13.88",
            "unit": "ms"
          },
          {
            "name": "Recipe switch",
            "value": 60.3,
            "range": "2.45",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, each",
            "value": 62.44,
            "range": "1.71",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, final",
            "value": 33.75,
            "range": "0.67",
            "unit": "ms"
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
          "id": "8775e36fdcda6f7dbcdaeab6ca5685f353f8d6bf",
          "message": "Introduce `clean_reports.sh` and remove lock files\n\nIntroduce `scripts/clean_reports.sh` to clean up test, coverage, and\nbenchmark reports generated during development. Also remove `Cargo.lock`\nand `pnpm-lock.yaml` from `scripts/clean_workspace.sh`, now that these\nfiles are tracked in git version control.",
          "timestamp": "2026-01-27T12:05:22-05:00",
          "tree_id": "588d75888e073d6d9555fdcfd8c97c9104d7898a",
          "url": "https://github.com/ramonrsv/sci-cream/commit/8775e36fdcda6f7dbcdaeab6ca5685f353f8d6bf"
        },
        "date": 1769554942813,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Peak memory usage during typical ops",
            "value": 81.864,
            "range": "2.708",
            "unit": "MB"
          },
          {
            "name": "Initial page load",
            "value": 680.2,
            "range": "49.34",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input",
            "value": 67.8,
            "range": "8.33",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input to composition",
            "value": 78.8,
            "range": "8.12",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input",
            "value": 51.2,
            "range": "10.98",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input to mix property",
            "value": 44.2,
            "range": "3.54",
            "unit": "ms"
          },
          {
            "name": "Recipe paste",
            "value": 144.5,
            "range": "14.35",
            "unit": "ms"
          },
          {
            "name": "Recipe switch",
            "value": 61.6,
            "range": "2.54",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, each",
            "value": 62.65,
            "range": "1.28",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, final",
            "value": 33.98,
            "range": "0.73",
            "unit": "ms"
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
          "id": "d51c46dddf76c32e822310e23af42d72c05a893d",
          "message": "Separate free-vs-no-free from wasm bridge benches",
          "timestamp": "2026-01-27T12:33:29-05:00",
          "tree_id": "fd5c86f17ea4d07cad50a705b00710f68f0b72ab",
          "url": "https://github.com/ramonrsv/sci-cream/commit/d51c46dddf76c32e822310e23af42d72c05a893d"
        },
        "date": 1769555459795,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Peak memory usage during typical ops",
            "value": 80.206,
            "range": "3.195",
            "unit": "MB"
          },
          {
            "name": "Initial page load",
            "value": 681.1,
            "range": "56.19",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input",
            "value": 70.3,
            "range": "8.71",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input to composition",
            "value": 89.4,
            "range": "13.84",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input",
            "value": 51.2,
            "range": "4.51",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input to mix property",
            "value": 47.9,
            "range": "6.20",
            "unit": "ms"
          },
          {
            "name": "Recipe paste",
            "value": 152,
            "range": "12.03",
            "unit": "ms"
          },
          {
            "name": "Recipe switch",
            "value": 71.8,
            "range": "6.14",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, each",
            "value": 70.48,
            "range": "6.57",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, final",
            "value": 40.23,
            "range": "0.92",
            "unit": "ms"
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
          "id": "618fb31a966bc0374ae569c872c96fa40df6e4fb",
          "message": "Add more feature-specific build/test to crate CI\n\n* Clean up, clarify, and add more feature-specific crate CI build and\n  test steps, to catch any issues with specific feature enablement.\n* Clean up and rename package.json scripts for rust build/test and for\n  wasm dependency builds. The Rust script are no longer specific to the\n  'wasm' and pnpm package features, that is captured by 'build:package'.\n  Remove the 'build' script, as it contains many somewhat unrelated\n  steps that there is no clear usage for running them together.\n* Add crate CI builds for wasm32-unknown-unknown target and the 'wasm'\n  feature, which should be a common combination used by wasm-pack.\n* Add default features [\"data\", \"database\"] to sci-cram Cargo.toml.\n  Remove 'test' from #[cfg(any(feature = \"data\"/\"database\", test))];\n  tests should be run with --all-features and there will be no support\n  for test with only some features enabled.",
          "timestamp": "2026-01-27T15:46:46-05:00",
          "tree_id": "f07dd813bbe7f48b8cbb4cf36c37440a7693d92f",
          "url": "https://github.com/ramonrsv/sci-cream/commit/618fb31a966bc0374ae569c872c96fa40df6e4fb"
        },
        "date": 1769556148150,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Peak memory usage during typical ops",
            "value": 82.319,
            "range": "2.952",
            "unit": "MB"
          },
          {
            "name": "Initial page load",
            "value": 674.2,
            "range": "46.03",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input",
            "value": 69.3,
            "range": "10.84",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input to composition",
            "value": 80.5,
            "range": "9.87",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input",
            "value": 50.9,
            "range": "8.47",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input to mix property",
            "value": 46.8,
            "range": "7.30",
            "unit": "ms"
          },
          {
            "name": "Recipe paste",
            "value": 151.1,
            "range": "14.75",
            "unit": "ms"
          },
          {
            "name": "Recipe switch",
            "value": 67,
            "range": "3.97",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, each",
            "value": 66.3,
            "range": "1.51",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, final",
            "value": 34.78,
            "range": "0.64",
            "unit": "ms"
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
          "id": "01bce5a83c9a3c213dd61dfb6405a3dba232d7ec",
          "message": "Add playwright setup action explicit additional\n\nAdd support to actions/setup-playwright for explicitly specifying\nadditional non-default browsers to install, e.g. branded Google Chrome\n('chrome'). Add 'with.additional-browsers: chrome' to current uses.",
          "timestamp": "2026-01-27T16:39:29-05:00",
          "tree_id": "e5d54192414344a1aa1c9b4f9e812ba0f1fe87c4",
          "url": "https://github.com/ramonrsv/sci-cream/commit/01bce5a83c9a3c213dd61dfb6405a3dba232d7ec"
        },
        "date": 1769556678948,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Peak memory usage during typical ops",
            "value": 80.823,
            "range": "2.852",
            "unit": "MB"
          },
          {
            "name": "Initial page load",
            "value": 677,
            "range": "50.01",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input",
            "value": 67.1,
            "range": "8.42",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input to composition",
            "value": 78.7,
            "range": "8.87",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input",
            "value": 48.1,
            "range": "8.98",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input to mix property",
            "value": 45.1,
            "range": "5.94",
            "unit": "ms"
          },
          {
            "name": "Recipe paste",
            "value": 142,
            "range": "14.56",
            "unit": "ms"
          },
          {
            "name": "Recipe switch",
            "value": 61.4,
            "range": "1.96",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, each",
            "value": 61.28,
            "range": "1.34",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, final",
            "value": 33.23,
            "range": "0.45",
            "unit": "ms"
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
          "id": "c360865dcd90a3e9889efc86cedded3fa0bd30db",
          "message": "Stop using branded Google Chrome in Playwright e2e\n\nStop using branded Google Chrome browser in Playwright e2e tests and\nbenchmarks; setting up branded chrome takes a lot of time in CI\nworkflows and probably doesn't offer much in extra coverage.",
          "timestamp": "2026-01-27T16:44:15-05:00",
          "tree_id": "8b0bd2334c32e9c13a7efd832807b03665ba4673",
          "url": "https://github.com/ramonrsv/sci-cream/commit/c360865dcd90a3e9889efc86cedded3fa0bd30db"
        },
        "date": 1769558008377,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Peak memory usage during typical ops",
            "value": 23.365,
            "range": "0.000",
            "unit": "MB"
          },
          {
            "name": "Initial page load",
            "value": 667.4,
            "range": "47.24",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input",
            "value": 58.1,
            "range": "7.18",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input to composition",
            "value": 69.6,
            "range": "5.41",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input",
            "value": 42.3,
            "range": "11.24",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input to mix property",
            "value": 35.7,
            "range": "1.85",
            "unit": "ms"
          },
          {
            "name": "Recipe paste",
            "value": 149.6,
            "range": "12.15",
            "unit": "ms"
          },
          {
            "name": "Recipe switch",
            "value": 55.1,
            "range": "2.17",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, each",
            "value": 62.83,
            "range": "1.14",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, final",
            "value": 32.39,
            "range": "0.73",
            "unit": "ms"
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
          "id": "1fa9edca759a2abfde7e893bbc257403f111e93b",
          "message": "Upgrade @playwright/test from ^1.57.0 to ^1.58.0",
          "timestamp": "2026-01-27T16:56:15-05:00",
          "tree_id": "058cdf1cce6e9b4f4cafa0de4b8a7f6e3d4968a4",
          "url": "https://github.com/ramonrsv/sci-cream/commit/1fa9edca759a2abfde7e893bbc257403f111e93b"
        },
        "date": 1769558471367,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Peak memory usage during typical ops",
            "value": 20.695,
            "range": "0.000",
            "unit": "MB"
          },
          {
            "name": "Initial page load",
            "value": 668.7,
            "range": "47.94",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input",
            "value": 68.1,
            "range": "18.82",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input to composition",
            "value": 69.9,
            "range": "8.46",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input",
            "value": 40.4,
            "range": "7.39",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input to mix property",
            "value": 37,
            "range": "6.53",
            "unit": "ms"
          },
          {
            "name": "Recipe paste",
            "value": 142.4,
            "range": "14.09",
            "unit": "ms"
          },
          {
            "name": "Recipe switch",
            "value": 62,
            "range": "3.95",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, each",
            "value": 61.19,
            "range": "2.55",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, final",
            "value": 30.53,
            "range": "0.64",
            "unit": "ms"
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
          "id": "5ccb17ba11956cf226dca60ba426c13463e60bc5",
          "message": "Introduce LightRecipe & Recipe::from_light_recipe\n\nAlso make Recipe::name an Option<String>, and change all function\narguments accordingly; most current uses cases do not need a name.",
          "timestamp": "2026-01-27T18:40:42-05:00",
          "tree_id": "0f7e0c60c6e5020dc185bc1140e298d877ec8bcc",
          "url": "https://github.com/ramonrsv/sci-cream/commit/5ccb17ba11956cf226dca60ba426c13463e60bc5"
        },
        "date": 1769559351652,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Peak memory usage during typical ops",
            "value": 20.695,
            "range": "0.000",
            "unit": "MB"
          },
          {
            "name": "Initial page load",
            "value": 677.2,
            "range": "46.82",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input",
            "value": 65.8,
            "range": "15.55",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input to composition",
            "value": 75.8,
            "range": "8.38",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input",
            "value": 43.1,
            "range": "7.23",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input to mix property",
            "value": 39.2,
            "range": "6.76",
            "unit": "ms"
          },
          {
            "name": "Recipe paste",
            "value": 158.8,
            "range": "17.84",
            "unit": "ms"
          },
          {
            "name": "Recipe switch",
            "value": 68.4,
            "range": "2.73",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, each",
            "value": 67.53,
            "range": "1.88",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, final",
            "value": 32.67,
            "range": "0.63",
            "unit": "ms"
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
          "id": "560cee861bdee18fb1b4593bbb13100d0970fa46",
          "message": "Add bridge.calculate_recipe_comp/mix_props benches",
          "timestamp": "2026-01-27T19:04:33-05:00",
          "tree_id": "00e520a232b1b9fc087dcee518a00f3d764b5062",
          "url": "https://github.com/ramonrsv/sci-cream/commit/560cee861bdee18fb1b4593bbb13100d0970fa46"
        },
        "date": 1769559732835,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Peak memory usage during typical ops",
            "value": 22.03,
            "range": "0.000",
            "unit": "MB"
          },
          {
            "name": "Initial page load",
            "value": 669.6,
            "range": "45.30",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input",
            "value": 68.4,
            "range": "17.69",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input to composition",
            "value": 68.1,
            "range": "7.83",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input",
            "value": 41,
            "range": "8.25",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input to mix property",
            "value": 35.7,
            "range": "3.00",
            "unit": "ms"
          },
          {
            "name": "Recipe paste",
            "value": 147.6,
            "range": "19.41",
            "unit": "ms"
          },
          {
            "name": "Recipe switch",
            "value": 58.7,
            "range": "7.35",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, each",
            "value": 58.5,
            "range": "1.08",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, final",
            "value": 30.16,
            "range": "0.46",
            "unit": "ms"
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
          "id": "74a6b4667bb6d2a8aa4e637c57003a9ccee11f4b",
          "message": "Rename IngredientDatabase WASM constructor methods\n\n  `make_seeded_ingredient_database`\n  `make_seeded_ingredient_database_from_specs`\n  `make_seeded_ingredient_database_from_embedded_data`\n\n    renamed to v\n\n  `new_ingredient_database_seeded`\n  `new_ingredient_database_seeded_from_specs`\n  `new_ingredient_database_seeded_from_embedded_data`",
          "timestamp": "2026-01-27T22:55:22-05:00",
          "tree_id": "2acf6bd804a004cf2410358538fda9cb78055b0d",
          "url": "https://github.com/ramonrsv/sci-cream/commit/74a6b4667bb6d2a8aa4e637c57003a9ccee11f4b"
        },
        "date": 1769573493744,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Peak memory usage during typical ops",
            "value": 22.03,
            "range": "0.000",
            "unit": "MB"
          },
          {
            "name": "Initial page load",
            "value": 670.5,
            "range": "47.77",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input",
            "value": 64,
            "range": "9.88",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input to composition",
            "value": 68.7,
            "range": "9.01",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input",
            "value": 43,
            "range": "11.12",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input to mix property",
            "value": 36.7,
            "range": "3.52",
            "unit": "ms"
          },
          {
            "name": "Recipe paste",
            "value": 147,
            "range": "14.30",
            "unit": "ms"
          },
          {
            "name": "Recipe switch",
            "value": 61.8,
            "range": "7.41",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, each",
            "value": 60.28,
            "range": "1.21",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, final",
            "value": 30.69,
            "range": "0.60",
            "unit": "ms"
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
          "id": "838fe94eec5537ad06cb368e6e4f4c588670baea",
          "message": "Add TODO about perf impact of comp/mix_p.get calls",
          "timestamp": "2026-01-28T18:39:01-05:00",
          "tree_id": "fa31a361ba2e45217bdab15201e812d5af758599",
          "url": "https://github.com/ramonrsv/sci-cream/commit/838fe94eec5537ad06cb368e6e4f4c588670baea"
        },
        "date": 1769644242043,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Peak memory usage during typical ops",
            "value": 22.03,
            "range": "0.000",
            "unit": "MB"
          },
          {
            "name": "Initial page load",
            "value": 664.9,
            "range": "47.64",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input",
            "value": 67.5,
            "range": "16.20",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input to composition",
            "value": 69.1,
            "range": "9.68",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input",
            "value": 42.1,
            "range": "6.77",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input to mix property",
            "value": 35.2,
            "range": "2.86",
            "unit": "ms"
          },
          {
            "name": "Recipe paste",
            "value": 142.1,
            "range": "16.85",
            "unit": "ms"
          },
          {
            "name": "Recipe switch",
            "value": 58,
            "range": "2.76",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, each",
            "value": 60.64,
            "range": "1.40",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, final",
            "value": 30.68,
            "range": "0.68",
            "unit": "ms"
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
          "id": "a3cc3e2189f94988a0f04f295c94b057d59fbfcd",
          "message": "Check off various TODOs that have been addressed",
          "timestamp": "2026-01-28T18:42:07-05:00",
          "tree_id": "f22b5caa479f4df51dcaf372977376fc64bcc8bb",
          "url": "https://github.com/ramonrsv/sci-cream/commit/a3cc3e2189f94988a0f04f295c94b057d59fbfcd"
        },
        "date": 1769644422034,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Peak memory usage during typical ops",
            "value": 22.03,
            "range": "0.000",
            "unit": "MB"
          },
          {
            "name": "Initial page load",
            "value": 665.6,
            "range": "46.56",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input",
            "value": 64,
            "range": "14.99",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input to composition",
            "value": 70.4,
            "range": "10.03",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input",
            "value": 40.9,
            "range": "6.49",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input to mix property",
            "value": 34.9,
            "range": "3.05",
            "unit": "ms"
          },
          {
            "name": "Recipe paste",
            "value": 151.6,
            "range": "14.09",
            "unit": "ms"
          },
          {
            "name": "Recipe switch",
            "value": 60.2,
            "range": "2.18",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, each",
            "value": 59.08,
            "range": "1.48",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, final",
            "value": 30.2,
            "range": "0.46",
            "unit": "ms"
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
          "id": "d4229e48fb78d85f225ee01b08ae13211d186946",
          "message": "Add TODO about comp/prop_key_as_med_str WASM calls",
          "timestamp": "2026-01-28T18:46:25-05:00",
          "tree_id": "e8b00776496ecfe78aec31d59c4fee26cf6c4021",
          "url": "https://github.com/ramonrsv/sci-cream/commit/d4229e48fb78d85f225ee01b08ae13211d186946"
        },
        "date": 1769644661283,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Peak memory usage during typical ops",
            "value": 22.03,
            "range": "0.000",
            "unit": "MB"
          },
          {
            "name": "Initial page load",
            "value": 666.1,
            "range": "46.11",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input",
            "value": 64.5,
            "range": "18.41",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input to composition",
            "value": 68.5,
            "range": "8.32",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input",
            "value": 40.5,
            "range": "8.14",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input to mix property",
            "value": 38.1,
            "range": "6.50",
            "unit": "ms"
          },
          {
            "name": "Recipe paste",
            "value": 141.7,
            "range": "10.27",
            "unit": "ms"
          },
          {
            "name": "Recipe switch",
            "value": 55.2,
            "range": "1.78",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, each",
            "value": 58.27,
            "range": "0.89",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, final",
            "value": 29.52,
            "range": "0.57",
            "unit": "ms"
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
          "id": "7aa3724522f323ba576a76606b3c59f38c7385d9",
          "message": "Add unique label to each dataset line in FpdGraph\n\nThis resolves an issue where the lines for reference recipes jump around\nwhenever updates are made to any recipe, or when the FpdGraph component\nis dragged. According to Clauce Sonnet 4.5, this is because, quote:\n\n  When Chart.js re-renders, it can't distinguish between which dataset\n  belongs to which recipe, causing it to animate/transition between what\n  it thinks are \"different\" datasets, resulting in the jumping behavior.\n\nCheck off the corresponding TODO item, as well as the one for UI\nresponsivness when making many rapid ingredient quantity updates; that\nseems to only be an issue when running `pnpm dev`, it does not happen\nwith a release build `pnpm start`.",
          "timestamp": "2026-01-28T19:17:41-05:00",
          "tree_id": "b61a80920e6e35c5b4f125332f3ab5229263fb0e",
          "url": "https://github.com/ramonrsv/sci-cream/commit/7aa3724522f323ba576a76606b3c59f38c7385d9"
        },
        "date": 1769664683662,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Peak memory usage during typical ops",
            "value": 22.03,
            "range": "0.000",
            "unit": "MB"
          },
          {
            "name": "Initial page load",
            "value": 678.5,
            "range": "50.20",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input",
            "value": 67.5,
            "range": "16.01",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input to composition",
            "value": 70.8,
            "range": "7.67",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input",
            "value": 41,
            "range": "6.13",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input to mix property",
            "value": 39.6,
            "range": "7.12",
            "unit": "ms"
          },
          {
            "name": "Recipe paste",
            "value": 150.8,
            "range": "11.45",
            "unit": "ms"
          },
          {
            "name": "Recipe switch",
            "value": 63,
            "range": "8.23",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, each",
            "value": 62.7,
            "range": "1.92",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, final",
            "value": 31.24,
            "range": "0.54",
            "unit": "ms"
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
          "id": "f044fc85070359b094cdc13854d84fc4f8b3a292",
          "message": "Overhaul RecipeContext and updates, use WasmBridge\n\n* Overhaul the design of `RecipeContext`, now splitting it into a\n  a `RecipeContext` that holds only `Recipe`s, and `IngredientResources`\n  that holds `validIngredients` and the new `wasmBridge`; the ingredient\n  cache has been removed in favour of a seeded `WasmBridge`. This change\n  greatly simplifies the process of fetching ingredients and updating\n  the context, and should be more performance according to benchmarks in\n  the `sci-cream` crate - still needs to be confirmed with end-to-end\n  benchmarks and web vitals at the app level. This does force all\n  ingredient definitions to be loaded up-front, but functionality could\n  be added later to continiously seed `WasmBridge`, if necessary.\n\n    - As it turns out, according to the newly introduced end-to-end\n      benchmarks, this change has only a modest performance impact,\n      if any. However, it also has no significant negative impact on\n      initial page load time or memory usage, so the simplicity that\n      it affords is still a significant benefit. Further performance\n      analysis is required to identify areas of concern.\n\n* Refactor `updateRecipe` to take a list of row updates and call\n  `setRecipeContext` only once per update, reducing the number\n  of re-renders and `mixProperties` updates, particularly when updating\n  multiple rows at once, e.g. when pasting a recipe, or on first mount.",
          "timestamp": "2026-01-29T01:55:47-05:00",
          "tree_id": "6b55107dba492bf75aa66e9f808cbe938fa29cbb",
          "url": "https://github.com/ramonrsv/sci-cream/commit/f044fc85070359b094cdc13854d84fc4f8b3a292"
        },
        "date": 1769670434531,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Peak memory usage during typical ops",
            "value": 22.03,
            "range": "0.000",
            "unit": "MB"
          },
          {
            "name": "Initial page load",
            "value": 676.3,
            "range": "57.13",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input",
            "value": 48.7,
            "range": "6.53",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input to composition",
            "value": 58.2,
            "range": "6.49",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input",
            "value": 40.8,
            "range": "7.29",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input to mix property",
            "value": 41.1,
            "range": "9.09",
            "unit": "ms"
          },
          {
            "name": "Recipe paste",
            "value": 148.2,
            "range": "9.39",
            "unit": "ms"
          },
          {
            "name": "Recipe switch",
            "value": 59.3,
            "range": "1.95",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, each",
            "value": 61.72,
            "range": "1.95",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, final",
            "value": 30.93,
            "range": "0.42",
            "unit": "ms"
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
          "id": "e5bcee9ff23f4f5c1cc84c72425f1bf81de4217b",
          "message": "Introduce *_key_as_str optimizations and benches\n\nOptimization functions to move key lookups from JS <-> WASM boundary to\nJS side, as that can be orders of magnitude more performant for simple\nkey accesses without complex computations.",
          "timestamp": "2026-01-29T11:29:05-05:00",
          "tree_id": "bd8896b44f21debbde857afec24aca0a14e4237e",
          "url": "https://github.com/ramonrsv/sci-cream/commit/e5bcee9ff23f4f5c1cc84c72425f1bf81de4217b"
        },
        "date": 1769724716475,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Peak memory usage during typical ops",
            "value": 22.03,
            "range": "0.000",
            "unit": "MB"
          },
          {
            "name": "Initial page load",
            "value": 679.9,
            "range": "55.21",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input",
            "value": 52.4,
            "range": "11.48",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input to composition",
            "value": 58.8,
            "range": "6.16",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input",
            "value": 44.5,
            "range": "11.66",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input to mix property",
            "value": 40,
            "range": "2.14",
            "unit": "ms"
          },
          {
            "name": "Recipe paste",
            "value": 146.9,
            "range": "13.35",
            "unit": "ms"
          },
          {
            "name": "Recipe switch",
            "value": 61.6,
            "range": "3.26",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, each",
            "value": 64.88,
            "range": "1.95",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, final",
            "value": 31.41,
            "range": "0.69",
            "unit": "ms"
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
          "id": "46d3820eab079d616b47feb3a1f903504bca37c4",
          "message": "Introduce skeleton for benchmark.js App benches\n\nIntroduce skeleton for and some simple App \"unit\" benchmarks using\nbenchmark.js, as opposed to Playwright for end-to-end benchmarks.\nAdd a CI job to run these benchmarks and upload results using\ngithub-action-benchmark, similarly to other repo CI benchmarks.",
          "timestamp": "2026-01-29T16:31:34-05:00",
          "tree_id": "6cb50ddd65ed21e1ea3db286a9c140c1f26e9d97",
          "url": "https://github.com/ramonrsv/sci-cream/commit/46d3820eab079d616b47feb3a1f903504bca37c4"
        },
        "date": 1769724878846,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Peak memory usage during typical ops",
            "value": 22.03,
            "range": "0.000",
            "unit": "MB"
          },
          {
            "name": "Initial page load",
            "value": 672.4,
            "range": "46.82",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input",
            "value": 52.4,
            "range": "10.49",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input to composition",
            "value": 56.7,
            "range": "5.80",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input",
            "value": 41.2,
            "range": "6.91",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input to mix property",
            "value": 37.5,
            "range": "3.20",
            "unit": "ms"
          },
          {
            "name": "Recipe paste",
            "value": 146.2,
            "range": "11.71",
            "unit": "ms"
          },
          {
            "name": "Recipe switch",
            "value": 57.9,
            "range": "3.11",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, each",
            "value": 59.35,
            "range": "1.54",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, final",
            "value": 30.23,
            "range": "0.50",
            "unit": "ms"
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
          "id": "cf6527f475cb41d237fdbeaae8a786f27d52ff26",
          "message": "Use different server ports for Playwright CI jobs\n\nUse an environment variable `PORT` to configure the `baseURL` and\n`webServer.url` of Playwright tests/benches. CI jobs can now set\ndifferent ports so that they don't conflict with each other when running\nlocally with `act`, and so we can now run the jobs in parallel.",
          "timestamp": "2026-01-29T16:58:08-05:00",
          "tree_id": "72cb1623fa10790cade8f331e6801dbf496af275",
          "url": "https://github.com/ramonrsv/sci-cream/commit/cf6527f475cb41d237fdbeaae8a786f27d52ff26"
        },
        "date": 1769725359322,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Peak memory usage during typical ops",
            "value": 22.03,
            "range": "0.000",
            "unit": "MB"
          },
          {
            "name": "Initial page load",
            "value": 683.1,
            "range": "52.54",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input",
            "value": 53.4,
            "range": "9.77",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input to composition",
            "value": 63.1,
            "range": "6.77",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input",
            "value": 45.4,
            "range": "10.15",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input to mix property",
            "value": 41,
            "range": "2.24",
            "unit": "ms"
          },
          {
            "name": "Recipe paste",
            "value": 150.1,
            "range": "15.25",
            "unit": "ms"
          },
          {
            "name": "Recipe switch",
            "value": 66.9,
            "range": "8.50",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, each",
            "value": 63.09,
            "range": "1.60",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, final",
            "value": 31.07,
            "range": "0.63",
            "unit": "ms"
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
          "id": "a95abf2a67f4c74f5b7fbe7b0300d95fdfc0d89f",
          "message": "Introduce Comp/Mix key get optimizations and bench\n\nIntroduce `Composition` and `MixProperties` get-by-key optimizations,\ncreating JS maps with all the key values and providing helper functions\nto access these instead of via the WASM functions of `Composition` and\n`MixProperties`. Benchmarks show that this is more performant for key\nlookups. However, the maps have to be built every time that a\n`Composition` or `MixProperties` is updated, which could be every\nrender, so this may not be more performant in real usage scenarios.",
          "timestamp": "2026-01-29T17:11:35-05:00",
          "tree_id": "584d45b421bd60740f6f0fe306f75dc0c857ae22",
          "url": "https://github.com/ramonrsv/sci-cream/commit/a95abf2a67f4c74f5b7fbe7b0300d95fdfc0d89f"
        },
        "date": 1769726226196,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Peak memory usage during typical ops",
            "value": 22.03,
            "range": "0.000",
            "unit": "MB"
          },
          {
            "name": "Initial page load",
            "value": 682.7,
            "range": "57.79",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input",
            "value": 51,
            "range": "7.50",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input to composition",
            "value": 60.4,
            "range": "4.80",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input",
            "value": 44.5,
            "range": "7.94",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input to mix property",
            "value": 44,
            "range": "6.29",
            "unit": "ms"
          },
          {
            "name": "Recipe paste",
            "value": 152.2,
            "range": "14.39",
            "unit": "ms"
          },
          {
            "name": "Recipe switch",
            "value": 65.6,
            "range": "2.11",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, each",
            "value": 67.83,
            "range": "3.30",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, final",
            "value": 32.73,
            "range": "0.92",
            "unit": "ms"
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
          "id": "9fc8a956e82f2978450cbaacce8b16492a833fd9",
          "message": "Introduce comp-value-as-qty/percent optimizations\n\nThe expecation was that it would be much more performant to replicate\nthe functionality of these functions purely on the JS side than it would\nbe to do WASM calls for such simple calculations, given the cost of\nJS <-> WASM bridging. However, as it turns out, there isn't much of a\ndifference between these two methods; perhaps because there isn't much\nJS <-> WASM overhead for simple number arguments?",
          "timestamp": "2026-01-29T17:37:16-05:00",
          "tree_id": "5d2ae60b48a0fac93f225b7e86d821d9d7c74ed9",
          "url": "https://github.com/ramonrsv/sci-cream/commit/9fc8a956e82f2978450cbaacce8b16492a833fd9"
        },
        "date": 1769727245454,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Peak memory usage during typical ops",
            "value": 19.55,
            "range": "0.000",
            "unit": "MB"
          },
          {
            "name": "Initial page load",
            "value": 677.4,
            "range": "47.41",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input",
            "value": 49.4,
            "range": "8.26",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input to composition",
            "value": 57.4,
            "range": "4.92",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input",
            "value": 41.1,
            "range": "8.26",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input to mix property",
            "value": 39.7,
            "range": "5.69",
            "unit": "ms"
          },
          {
            "name": "Recipe paste",
            "value": 139.6,
            "range": "10.08",
            "unit": "ms"
          },
          {
            "name": "Recipe switch",
            "value": 58.1,
            "range": "4.16",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, each",
            "value": 61.08,
            "range": "2.22",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, final",
            "value": 31.78,
            "range": "1.16",
            "unit": "ms"
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
          "id": "1c99169109d056c1254588e6ad4dd3cf9cbd8435",
          "message": "Remove .toBeVisible() calls from e2e benchmarks\n\nIt's unclear if these calls provide any more validation than just\ncalling .toHaveValue(...). In any case, there are e2e tests that\nalready perform this same validation for correctness. For the purposes\nof benchmarks, it is better to lower the overhead of the benchmarks\nthemselves as much as possible, to make the small real performance\nimpact of changes more apparent.",
          "timestamp": "2026-01-29T18:14:06-05:00",
          "tree_id": "4f81bc6005764b8eb26437d4598771bca7afd6f6",
          "url": "https://github.com/ramonrsv/sci-cream/commit/1c99169109d056c1254588e6ad4dd3cf9cbd8435"
        },
        "date": 1769729042331,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Peak memory usage during typical ops",
            "value": 20.695,
            "range": "0.000",
            "unit": "MB"
          },
          {
            "name": "Initial page load",
            "value": 685.6,
            "range": "52.88",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input",
            "value": 48.1,
            "range": "8.81",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input to composition",
            "value": 57.4,
            "range": "5.55",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input",
            "value": 39.7,
            "range": "5.62",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input to mix property",
            "value": 38.8,
            "range": "8.15",
            "unit": "ms"
          },
          {
            "name": "Recipe paste",
            "value": 172.9,
            "range": "10.94",
            "unit": "ms"
          },
          {
            "name": "Recipe switch",
            "value": 47.5,
            "range": "3.47",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, each",
            "value": 51.83,
            "range": "1.19",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, final",
            "value": 31.39,
            "range": "0.92",
            "unit": "ms"
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
          "id": "f6970504f4cbed3978b788757e8216c40e61b4c5",
          "message": "Add CI caching of downloaded Playwright browsers",
          "timestamp": "2026-01-29T20:42:47-05:00",
          "tree_id": "60fd74e4d9f8ccb6820da35c7255fba968a26759",
          "url": "https://github.com/ramonrsv/sci-cream/commit/f6970504f4cbed3978b788757e8216c40e61b4c5"
        },
        "date": 1769737730088,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Peak memory usage during typical ops",
            "value": 22.03,
            "range": "0.000",
            "unit": "MB"
          },
          {
            "name": "Initial page load",
            "value": 671.5,
            "range": "50.59",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input",
            "value": 46.6,
            "range": "7.95",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input to composition",
            "value": 54.5,
            "range": "5.85",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input",
            "value": 38.6,
            "range": "8.60",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input to mix property",
            "value": 34.4,
            "range": "2.80",
            "unit": "ms"
          },
          {
            "name": "Recipe paste",
            "value": 162.3,
            "range": "11.43",
            "unit": "ms"
          },
          {
            "name": "Recipe switch",
            "value": 43.2,
            "range": "2.04",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, each",
            "value": 49.06,
            "range": "0.81",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, final",
            "value": 29.62,
            "range": "0.57",
            "unit": "ms"
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
          "id": "9c2ff566436d29257675915c000e72ffc387e5cf",
          "message": "Add support for `IngCompGrid` to show references\n\n* Add support for `IngredientCompositionGrid` to select and show the\n  composition of reference recipes as well as the main recipe.\n* Create a shared `RecipeSelection` component for the common\n  recipe-selection functionality, also used by `RecipeGrid`.\n* Add custom functionality for the recipe selection component in\n  `IngredientCompositionGrid` to disappear if there are no reference\n  recipes, but to be sticky if a reference recipe is currently selected.\n  This prevents jarring jumps back to the main recipe if a reference is\n  cleared, and having to re-select it if a new ref recipe is pasted.",
          "timestamp": "2026-01-30T13:08:13-05:00",
          "tree_id": "a4011ffdb4a5d0c5e88ab2d0d9c90062dcd842b6",
          "url": "https://github.com/ramonrsv/sci-cream/commit/9c2ff566436d29257675915c000e72ffc387e5cf"
        },
        "date": 1769812656104,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Peak memory usage during typical ops",
            "value": 20.695,
            "range": "0.000",
            "unit": "MB"
          },
          {
            "name": "Initial page load",
            "value": 670.5,
            "range": "52.29",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input",
            "value": 45.3,
            "range": "6.84",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input to composition",
            "value": 55.8,
            "range": "7.10",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input",
            "value": 38.5,
            "range": "6.71",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input to mix property",
            "value": 33.9,
            "range": "3.91",
            "unit": "ms"
          },
          {
            "name": "Recipe paste",
            "value": 168.8,
            "range": "4.77",
            "unit": "ms"
          },
          {
            "name": "Recipe switch",
            "value": 40.9,
            "range": "1.58",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, each",
            "value": 48.87,
            "range": "1.60",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, final",
            "value": 30.44,
            "range": "0.49",
            "unit": "ms"
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
          "id": "777763be6bf6a52c65b64f59ca1b3864a2b817c7",
          "message": "Add TODO about storing component layout in local",
          "timestamp": "2026-01-30T13:47:26-05:00",
          "tree_id": "d8a46dbf1dae968a1817a419c43cd1cff35333eb",
          "url": "https://github.com/ramonrsv/sci-cream/commit/777763be6bf6a52c65b64f59ca1b3864a2b817c7"
        },
        "date": 1769813808841,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Peak memory usage during typical ops",
            "value": 20.695,
            "range": "0.000",
            "unit": "MB"
          },
          {
            "name": "Initial page load",
            "value": 674.6,
            "range": "46.29",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input",
            "value": 45.2,
            "range": "7.64",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input to composition",
            "value": 53.7,
            "range": "5.27",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input",
            "value": 39,
            "range": "7.77",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input to mix property",
            "value": 34.5,
            "range": "3.07",
            "unit": "ms"
          },
          {
            "name": "Recipe paste",
            "value": 168.8,
            "range": "8.76",
            "unit": "ms"
          },
          {
            "name": "Recipe switch",
            "value": 43.1,
            "range": "1.04",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, each",
            "value": 49.16,
            "range": "1.20",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, final",
            "value": 30.36,
            "range": "0.58",
            "unit": "ms"
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
          "id": "b221ee30ab5dcc37854bdce2a8cb29d7e3661bc2",
          "message": "Use non-default ports in CI so no local conflicts",
          "timestamp": "2026-01-30T13:57:42-05:00",
          "tree_id": "4e567cb684afcb8102a6fbb5a9ceb138ea4197b6",
          "url": "https://github.com/ramonrsv/sci-cream/commit/b221ee30ab5dcc37854bdce2a8cb29d7e3661bc2"
        },
        "date": 1769814687207,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Peak memory usage during typical ops",
            "value": 20.695,
            "range": "0.000",
            "unit": "MB"
          },
          {
            "name": "Initial page load",
            "value": 672,
            "range": "46.05",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input",
            "value": 46.5,
            "range": "8.33",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input to composition",
            "value": 57.6,
            "range": "6.64",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input",
            "value": 39.7,
            "range": "7.85",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input to mix property",
            "value": 35.8,
            "range": "2.99",
            "unit": "ms"
          },
          {
            "name": "Recipe paste",
            "value": 169.9,
            "range": "9.09",
            "unit": "ms"
          },
          {
            "name": "Recipe switch",
            "value": 45.5,
            "range": "2.16",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, each",
            "value": 52.45,
            "range": "1.29",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, final",
            "value": 31.95,
            "range": "0.59",
            "unit": "ms"
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
          "id": "aa83fe395d01924a6b34b6329797e209cea52e60",
          "message": "* Overhaul `RecipeContext` updates, more modular\n\n* Overhaul the helper functions for `RecipeContext` updates to be more\n  modular and flexible; most can now be pulled out `RecipeGrid` as\n  standalone functions, with the only additional dependency being\n  `RecipeResources`. Recipe copy/paste functions are also made more\n  modular, separating the stringifying/parsing, recipe context update,\n  and clipboard interactions elements. These changes are in preparation\n  for adding support to save recipes in local storage, to persist across\n  browser window refreshes.\n* From above, the new `updateRecipes(...: Recipe[])` method is notable.\n  It updates multiple recipes at once, with a single state update. This\n  is necessary when updating multiple recipes at once, e.g. in the\n  useEffect to prevent stale ingredient context, otherwise dependent\n  components may asynchronously try to render stale `Composition` or\n  `MixProperties` objects, which can lead to crashes due to freed WASM\n  memory.\n* Fix a bug in the `useEffect` to prevent stale ingredient context\n  before the recipe resources have been populated. It was previously\n  only refreshing the main recipe; now it refreshes the references as\n  well. End-to-end tests that validate this functionality are updated\n  to also check the reference recipes.",
          "timestamp": "2026-01-30T17:52:26-05:00",
          "tree_id": "45a352a0088b2f5452ea3098d1df25ef3f205e30",
          "url": "https://github.com/ramonrsv/sci-cream/commit/aa83fe395d01924a6b34b6329797e209cea52e60"
        },
        "date": 1769815089338,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Peak memory usage during typical ops",
            "value": 20.695,
            "range": "0.000",
            "unit": "MB"
          },
          {
            "name": "Initial page load",
            "value": 677.5,
            "range": "51.52",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input",
            "value": 46.1,
            "range": "8.56",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input to composition",
            "value": 53.8,
            "range": "5.04",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input",
            "value": 40.4,
            "range": "11.76",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input to mix property",
            "value": 38.8,
            "range": "5.78",
            "unit": "ms"
          },
          {
            "name": "Recipe paste",
            "value": 168.9,
            "range": "11.95",
            "unit": "ms"
          },
          {
            "name": "Recipe switch",
            "value": 44.8,
            "range": "4.64",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, each",
            "value": 50.08,
            "range": "0.81",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, final",
            "value": 30.85,
            "range": "0.63",
            "unit": "ms"
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
          "id": "7028bada959f97bea8f38ca75ad31c915569aceb",
          "message": "Add support to periodically save recipes in local\n\nAdd support to periodically (every ~2s) save recipes in local storage\nso that the persist across page reloads. Add new end-to-end tests to\nverify this functionality.",
          "timestamp": "2026-01-30T18:27:16-05:00",
          "tree_id": "1980350a1d03d627e4acfb64361d93f4b1ffc03e",
          "url": "https://github.com/ramonrsv/sci-cream/commit/7028bada959f97bea8f38ca75ad31c915569aceb"
        },
        "date": 1769816006460,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Peak memory usage during typical ops",
            "value": 20.695,
            "range": "0.000",
            "unit": "MB"
          },
          {
            "name": "Initial page load",
            "value": 680.4,
            "range": "50.87",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input",
            "value": 47.5,
            "range": "8.75",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input to composition",
            "value": 55.4,
            "range": "4.88",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input",
            "value": 39.2,
            "range": "9.02",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input to mix property",
            "value": 38.8,
            "range": "7.90",
            "unit": "ms"
          },
          {
            "name": "Recipe paste",
            "value": 167.7,
            "range": "8.97",
            "unit": "ms"
          },
          {
            "name": "Recipe switch",
            "value": 43.7,
            "range": "1.55",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, each",
            "value": 49.45,
            "range": "0.95",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, final",
            "value": 30.56,
            "range": "0.76",
            "unit": "ms"
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
          "id": "b552c64fc042faa53f3a05428116f36d81e493fa",
          "message": "Add empty <div></div> around ing composition table\n\nThis is in preparation for the upcoming left-hand-side ingredient and\nquantities table, so clean up the diff affected by indentation.",
          "timestamp": "2026-01-30T23:00:46-05:00",
          "tree_id": "a9c09c14b52f1a361f21be4d15c669b2f0af9499",
          "url": "https://github.com/ramonrsv/sci-cream/commit/b552c64fc042faa53f3a05428116f36d81e493fa"
        },
        "date": 1769832851359,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Peak memory usage during typical ops",
            "value": 20.695,
            "range": "0.000",
            "unit": "MB"
          },
          {
            "name": "Initial page load",
            "value": 670.5,
            "range": "54.44",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input",
            "value": 45.6,
            "range": "8.39",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input to composition",
            "value": 53.7,
            "range": "5.16",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input",
            "value": 38.7,
            "range": "8.46",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input to mix property",
            "value": 35.2,
            "range": "3.28",
            "unit": "ms"
          },
          {
            "name": "Recipe paste",
            "value": 167.6,
            "range": "9.40",
            "unit": "ms"
          },
          {
            "name": "Recipe switch",
            "value": 43.7,
            "range": "1.73",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, each",
            "value": 48.33,
            "range": "0.75",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, final",
            "value": 29.48,
            "range": "0.60",
            "unit": "ms"
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
          "id": "b4b1b84ad326c723e81d06ab5f2f40ddcdb7cd49",
          "message": "Add ingredient and quanity column to `IngCompGrid`\n\nAdd two left columns to `IngredientCompositionGrid`, to show the\ncorresponding ingredient name and quantity (affected by QtyToggle).\nThese columns are actually a separate table, to which the\noverflow-x-auto does not apply, so it's not affected by a scrollbar.",
          "timestamp": "2026-01-31T00:31:23-05:00",
          "tree_id": "ce243172be9bf41530c16b313c3720838bfad91d",
          "url": "https://github.com/ramonrsv/sci-cream/commit/b4b1b84ad326c723e81d06ab5f2f40ddcdb7cd49"
        },
        "date": 1769837946007,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "Peak memory usage during typical ops",
            "value": 20.695,
            "range": "0.000",
            "unit": "MB"
          },
          {
            "name": "Initial page load",
            "value": 676.3,
            "range": "56.31",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input",
            "value": 45.2,
            "range": "8.01",
            "unit": "ms"
          },
          {
            "name": "Ingredient name input to composition",
            "value": 53.3,
            "range": "4.69",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input",
            "value": 39.3,
            "range": "8.27",
            "unit": "ms"
          },
          {
            "name": "Ingredient quantity input to mix property",
            "value": 36.7,
            "range": "3.32",
            "unit": "ms"
          },
          {
            "name": "Recipe paste",
            "value": 170.4,
            "range": "9.85",
            "unit": "ms"
          },
          {
            "name": "Recipe switch",
            "value": 46.8,
            "range": "3.92",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, each",
            "value": 51.96,
            "range": "1.23",
            "unit": "ms"
          },
          {
            "name": "Rapid ingredient quantity updates, final",
            "value": 30.33,
            "range": "0.64",
            "unit": "ms"
          }
        ]
      }
    ],
    "App JS benchmarks": [
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
          "id": "46d3820eab079d616b47feb3a1f903504bca37c4",
          "message": "Introduce skeleton for benchmark.js App benches\n\nIntroduce skeleton for and some simple App \"unit\" benchmarks using\nbenchmark.js, as opposed to Playwright for end-to-end benchmarks.\nAdd a CI job to run these benchmarks and upload results using\ngithub-action-benchmark, similarly to other repo CI benchmarks.",
          "timestamp": "2026-01-29T16:31:34-05:00",
          "tree_id": "6cb50ddd65ed21e1ea3db286a9c140c1f26e9d97",
          "url": "https://github.com/ramonrsv/sci-cream/commit/46d3820eab079d616b47feb3a1f903504bca37c4"
        },
        "date": 1769724340026,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "comp_key_as_med_str",
            "value": 73099,
            "range": "±1.42%",
            "unit": "ops/sec",
            "extra": "87 samples"
          },
          {
            "name": "compKeyAsMedStr",
            "value": 715530,
            "range": "±0.70%",
            "unit": "ops/sec",
            "extra": "89 samples"
          },
          {
            "name": "prop_key_as_med_str",
            "value": 9956,
            "range": "±2.40%",
            "unit": "ops/sec",
            "extra": "83 samples"
          },
          {
            "name": "propKeyAsMedStr",
            "value": 603846,
            "range": "±0.88%",
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
          "id": "cf6527f475cb41d237fdbeaae8a786f27d52ff26",
          "message": "Use different server ports for Playwright CI jobs\n\nUse an environment variable `PORT` to configure the `baseURL` and\n`webServer.url` of Playwright tests/benches. CI jobs can now set\ndifferent ports so that they don't conflict with each other when running\nlocally with `act`, and so we can now run the jobs in parallel.",
          "timestamp": "2026-01-29T16:58:08-05:00",
          "tree_id": "72cb1623fa10790cade8f331e6801dbf496af275",
          "url": "https://github.com/ramonrsv/sci-cream/commit/cf6527f475cb41d237fdbeaae8a786f27d52ff26"
        },
        "date": 1769725068281,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "comp_key_as_med_str",
            "value": 74661,
            "range": "±0.99%",
            "unit": "ops/sec",
            "extra": "83 samples"
          },
          {
            "name": "compKeyAsMedStr",
            "value": 731966,
            "range": "±0.59%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "prop_key_as_med_str",
            "value": 9824,
            "range": "±2.07%",
            "unit": "ops/sec",
            "extra": "83 samples"
          },
          {
            "name": "propKeyAsMedStr",
            "value": 611361,
            "range": "±0.80%",
            "unit": "ops/sec",
            "extra": "92 samples"
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
          "id": "a95abf2a67f4c74f5b7fbe7b0300d95fdfc0d89f",
          "message": "Introduce Comp/Mix key get optimizations and bench\n\nIntroduce `Composition` and `MixProperties` get-by-key optimizations,\ncreating JS maps with all the key values and providing helper functions\nto access these instead of via the WASM functions of `Composition` and\n`MixProperties`. Benchmarks show that this is more performant for key\nlookups. However, the maps have to be built every time that a\n`Composition` or `MixProperties` is updated, which could be every\nrender, so this may not be more performant in real usage scenarios.",
          "timestamp": "2026-01-29T17:11:35-05:00",
          "tree_id": "584d45b421bd60740f6f0fe306f75dc0c857ae22",
          "url": "https://github.com/ramonrsv/sci-cream/commit/a95abf2a67f4c74f5b7fbe7b0300d95fdfc0d89f"
        },
        "date": 1769725920730,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "comp_key_as_med_str",
            "value": 75987,
            "range": "±1.18%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "compKeyAsMedStr",
            "value": 692642,
            "range": "±1.59%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "prop_key_as_med_str",
            "value": 9942,
            "range": "±1.98%",
            "unit": "ops/sec",
            "extra": "85 samples"
          },
          {
            "name": "propKeyAsMedStr",
            "value": 596995,
            "range": "±0.78%",
            "unit": "ops/sec",
            "extra": "92 samples"
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
          "id": "9fc8a956e82f2978450cbaacce8b16492a833fd9",
          "message": "Introduce comp-value-as-qty/percent optimizations\n\nThe expecation was that it would be much more performant to replicate\nthe functionality of these functions purely on the JS side than it would\nbe to do WASM calls for such simple calculations, given the cost of\nJS <-> WASM bridging. However, as it turns out, there isn't much of a\ndifference between these two methods; perhaps because there isn't much\nJS <-> WASM overhead for simple number arguments?",
          "timestamp": "2026-01-29T17:37:16-05:00",
          "tree_id": "5d2ae60b48a0fac93f225b7e86d821d9d7c74ed9",
          "url": "https://github.com/ramonrsv/sci-cream/commit/9fc8a956e82f2978450cbaacce8b16492a833fd9"
        },
        "date": 1769726956627,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "comp_key_as_med_str",
            "value": 74153,
            "range": "±0.63%",
            "unit": "ops/sec",
            "extra": "87 samples"
          },
          {
            "name": "compKeyAsMedStr",
            "value": 700573,
            "range": "±1.32%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "prop_key_as_med_str",
            "value": 10077,
            "range": "±2.14%",
            "unit": "ops/sec",
            "extra": "86 samples"
          },
          {
            "name": "propKeyAsMedStr",
            "value": 594839,
            "range": "±1.16%",
            "unit": "ops/sec",
            "extra": "93 samples"
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
          "id": "1c99169109d056c1254588e6ad4dd3cf9cbd8435",
          "message": "Remove .toBeVisible() calls from e2e benchmarks\n\nIt's unclear if these calls provide any more validation than just\ncalling .toHaveValue(...). In any case, there are e2e tests that\nalready perform this same validation for correctness. For the purposes\nof benchmarks, it is better to lower the overhead of the benchmarks\nthemselves as much as possible, to make the small real performance\nimpact of changes more apparent.",
          "timestamp": "2026-01-29T18:14:06-05:00",
          "tree_id": "4f81bc6005764b8eb26437d4598771bca7afd6f6",
          "url": "https://github.com/ramonrsv/sci-cream/commit/1c99169109d056c1254588e6ad4dd3cf9cbd8435"
        },
        "date": 1769728768136,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "comp_key_as_med_str",
            "value": 76384,
            "range": "±1.32%",
            "unit": "ops/sec",
            "extra": "89 samples"
          },
          {
            "name": "compKeyAsMedStr",
            "value": 731200,
            "range": "±0.55%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "prop_key_as_med_str",
            "value": 10077,
            "range": "±2.35%",
            "unit": "ops/sec",
            "extra": "84 samples"
          },
          {
            "name": "propKeyAsMedStr",
            "value": 609127,
            "range": "±0.77%",
            "unit": "ops/sec",
            "extra": "91 samples"
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
          "id": "f6970504f4cbed3978b788757e8216c40e61b4c5",
          "message": "Add CI caching of downloaded Playwright browsers",
          "timestamp": "2026-01-29T20:42:47-05:00",
          "tree_id": "60fd74e4d9f8ccb6820da35c7255fba968a26759",
          "url": "https://github.com/ramonrsv/sci-cream/commit/f6970504f4cbed3978b788757e8216c40e61b4c5"
        },
        "date": 1769737472994,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "comp_key_as_med_str",
            "value": 74130,
            "range": "±1.66%",
            "unit": "ops/sec",
            "extra": "87 samples"
          },
          {
            "name": "compKeyAsMedStr",
            "value": 645945,
            "range": "±0.67%",
            "unit": "ops/sec",
            "extra": "97 samples"
          },
          {
            "name": "prop_key_as_med_str",
            "value": 9562,
            "range": "±1.61%",
            "unit": "ops/sec",
            "extra": "88 samples"
          },
          {
            "name": "propKeyAsMedStr",
            "value": 572035,
            "range": "±0.71%",
            "unit": "ops/sec",
            "extra": "96 samples"
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
          "id": "9c2ff566436d29257675915c000e72ffc387e5cf",
          "message": "Add support for `IngCompGrid` to show references\n\n* Add support for `IngredientCompositionGrid` to select and show the\n  composition of reference recipes as well as the main recipe.\n* Create a shared `RecipeSelection` component for the common\n  recipe-selection functionality, also used by `RecipeGrid`.\n* Add custom functionality for the recipe selection component in\n  `IngredientCompositionGrid` to disappear if there are no reference\n  recipes, but to be sticky if a reference recipe is currently selected.\n  This prevents jarring jumps back to the main recipe if a reference is\n  cleared, and having to re-select it if a new ref recipe is pasted.",
          "timestamp": "2026-01-30T13:08:13-05:00",
          "tree_id": "a4011ffdb4a5d0c5e88ab2d0d9c90062dcd842b6",
          "url": "https://github.com/ramonrsv/sci-cream/commit/9c2ff566436d29257675915c000e72ffc387e5cf"
        },
        "date": 1769812421842,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "comp_key_as_med_str",
            "value": 77849,
            "range": "±0.74%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "compKeyAsMedStr",
            "value": 730074,
            "range": "±0.67%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "prop_key_as_med_str",
            "value": 10140,
            "range": "±1.94%",
            "unit": "ops/sec",
            "extra": "85 samples"
          },
          {
            "name": "propKeyAsMedStr",
            "value": 616233,
            "range": "±0.67%",
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
          "id": "777763be6bf6a52c65b64f59ca1b3864a2b817c7",
          "message": "Add TODO about storing component layout in local",
          "timestamp": "2026-01-30T13:47:26-05:00",
          "tree_id": "d8a46dbf1dae968a1817a419c43cd1cff35333eb",
          "url": "https://github.com/ramonrsv/sci-cream/commit/777763be6bf6a52c65b64f59ca1b3864a2b817c7"
        },
        "date": 1769813550896,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "comp_key_as_med_str",
            "value": 75462,
            "range": "±1.42%",
            "unit": "ops/sec",
            "extra": "89 samples"
          },
          {
            "name": "compKeyAsMedStr",
            "value": 720931,
            "range": "±0.58%",
            "unit": "ops/sec",
            "extra": "93 samples"
          },
          {
            "name": "prop_key_as_med_str",
            "value": 9989,
            "range": "±1.89%",
            "unit": "ops/sec",
            "extra": "85 samples"
          },
          {
            "name": "propKeyAsMedStr",
            "value": 599168,
            "range": "±0.67%",
            "unit": "ops/sec",
            "extra": "95 samples"
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
          "id": "b221ee30ab5dcc37854bdce2a8cb29d7e3661bc2",
          "message": "Use non-default ports in CI so no local conflicts",
          "timestamp": "2026-01-30T13:57:42-05:00",
          "tree_id": "4e567cb684afcb8102a6fbb5a9ceb138ea4197b6",
          "url": "https://github.com/ramonrsv/sci-cream/commit/b221ee30ab5dcc37854bdce2a8cb29d7e3661bc2"
        },
        "date": 1769814430527,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "comp_key_as_med_str",
            "value": 76014,
            "range": "±1.79%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "compKeyAsMedStr",
            "value": 727780,
            "range": "±0.54%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "prop_key_as_med_str",
            "value": 10159,
            "range": "±1.93%",
            "unit": "ops/sec",
            "extra": "86 samples"
          },
          {
            "name": "propKeyAsMedStr",
            "value": 598755,
            "range": "±0.93%",
            "unit": "ops/sec",
            "extra": "89 samples"
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
          "id": "aa83fe395d01924a6b34b6329797e209cea52e60",
          "message": "* Overhaul `RecipeContext` updates, more modular\n\n* Overhaul the helper functions for `RecipeContext` updates to be more\n  modular and flexible; most can now be pulled out `RecipeGrid` as\n  standalone functions, with the only additional dependency being\n  `RecipeResources`. Recipe copy/paste functions are also made more\n  modular, separating the stringifying/parsing, recipe context update,\n  and clipboard interactions elements. These changes are in preparation\n  for adding support to save recipes in local storage, to persist across\n  browser window refreshes.\n* From above, the new `updateRecipes(...: Recipe[])` method is notable.\n  It updates multiple recipes at once, with a single state update. This\n  is necessary when updating multiple recipes at once, e.g. in the\n  useEffect to prevent stale ingredient context, otherwise dependent\n  components may asynchronously try to render stale `Composition` or\n  `MixProperties` objects, which can lead to crashes due to freed WASM\n  memory.\n* Fix a bug in the `useEffect` to prevent stale ingredient context\n  before the recipe resources have been populated. It was previously\n  only refreshing the main recipe; now it refreshes the references as\n  well. End-to-end tests that validate this functionality are updated\n  to also check the reference recipes.",
          "timestamp": "2026-01-30T17:52:26-05:00",
          "tree_id": "45a352a0088b2f5452ea3098d1df25ef3f205e30",
          "url": "https://github.com/ramonrsv/sci-cream/commit/aa83fe395d01924a6b34b6329797e209cea52e60"
        },
        "date": 1769814836911,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "comp_key_as_med_str",
            "value": 77387,
            "range": "±0.95%",
            "unit": "ops/sec",
            "extra": "90 samples"
          },
          {
            "name": "compKeyAsMedStr",
            "value": 694529,
            "range": "±2.27%",
            "unit": "ops/sec",
            "extra": "88 samples"
          },
          {
            "name": "prop_key_as_med_str",
            "value": 10150,
            "range": "±1.90%",
            "unit": "ops/sec",
            "extra": "87 samples"
          },
          {
            "name": "propKeyAsMedStr",
            "value": 603766,
            "range": "±0.76%",
            "unit": "ops/sec",
            "extra": "91 samples"
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
          "id": "7028bada959f97bea8f38ca75ad31c915569aceb",
          "message": "Add support to periodically save recipes in local\n\nAdd support to periodically (every ~2s) save recipes in local storage\nso that the persist across page reloads. Add new end-to-end tests to\nverify this functionality.",
          "timestamp": "2026-01-30T18:27:16-05:00",
          "tree_id": "1980350a1d03d627e4acfb64361d93f4b1ffc03e",
          "url": "https://github.com/ramonrsv/sci-cream/commit/7028bada959f97bea8f38ca75ad31c915569aceb"
        },
        "date": 1769815755597,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "comp_key_as_med_str",
            "value": 75569,
            "range": "±1.69%",
            "unit": "ops/sec",
            "extra": "86 samples"
          },
          {
            "name": "compKeyAsMedStr",
            "value": 735001,
            "range": "±0.60%",
            "unit": "ops/sec",
            "extra": "96 samples"
          },
          {
            "name": "prop_key_as_med_str",
            "value": 10208,
            "range": "±1.94%",
            "unit": "ops/sec",
            "extra": "88 samples"
          },
          {
            "name": "propKeyAsMedStr",
            "value": 615176,
            "range": "±0.71%",
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
          "id": "b552c64fc042faa53f3a05428116f36d81e493fa",
          "message": "Add empty <div></div> around ing composition table\n\nThis is in preparation for the upcoming left-hand-side ingredient and\nquantities table, so clean up the diff affected by indentation.",
          "timestamp": "2026-01-30T23:00:46-05:00",
          "tree_id": "a9c09c14b52f1a361f21be4d15c669b2f0af9499",
          "url": "https://github.com/ramonrsv/sci-cream/commit/b552c64fc042faa53f3a05428116f36d81e493fa"
        },
        "date": 1769832612659,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "comp_key_as_med_str",
            "value": 76362,
            "range": "±1.97%",
            "unit": "ops/sec",
            "extra": "91 samples"
          },
          {
            "name": "compKeyAsMedStr",
            "value": 706800,
            "range": "±0.56%",
            "unit": "ops/sec",
            "extra": "94 samples"
          },
          {
            "name": "prop_key_as_med_str",
            "value": 9869,
            "range": "±2.10%",
            "unit": "ops/sec",
            "extra": "84 samples"
          },
          {
            "name": "propKeyAsMedStr",
            "value": 590336,
            "range": "±0.72%",
            "unit": "ops/sec",
            "extra": "93 samples"
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
          "id": "b4b1b84ad326c723e81d06ab5f2f40ddcdb7cd49",
          "message": "Add ingredient and quanity column to `IngCompGrid`\n\nAdd two left columns to `IngredientCompositionGrid`, to show the\ncorresponding ingredient name and quantity (affected by QtyToggle).\nThese columns are actually a separate table, to which the\noverflow-x-auto does not apply, so it's not affected by a scrollbar.",
          "timestamp": "2026-01-31T00:31:23-05:00",
          "tree_id": "ce243172be9bf41530c16b313c3720838bfad91d",
          "url": "https://github.com/ramonrsv/sci-cream/commit/b4b1b84ad326c723e81d06ab5f2f40ddcdb7cd49"
        },
        "date": 1769837686372,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "comp_key_as_med_str",
            "value": 75544,
            "range": "±1.49%",
            "unit": "ops/sec",
            "extra": "87 samples"
          },
          {
            "name": "compKeyAsMedStr",
            "value": 727737,
            "range": "±0.53%",
            "unit": "ops/sec",
            "extra": "92 samples"
          },
          {
            "name": "prop_key_as_med_str",
            "value": 10141,
            "range": "±2.02%",
            "unit": "ops/sec",
            "extra": "86 samples"
          },
          {
            "name": "propKeyAsMedStr",
            "value": 600028,
            "range": "±0.84%",
            "unit": "ops/sec",
            "extra": "90 samples"
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
          "id": "d851ea0c3d861e6b6e5cd1b8bd180185b9cac655",
          "message": "Adjust grid for mobile viewports, stack vertically\n\nAdjust the react-grid-layout for mobile viewports, stacking all the\ncomponents vertically, instead of in a side-by-side grid, and all with\nfull screen width. Also adjust `RecipeGrid` to allow it to fit in narrow\nmobile screens, like the Pixel 5 configured in `playwright.config.ts`.",
          "timestamp": "2026-02-01T17:17:33-05:00",
          "tree_id": "acb8aabd30ddbdd9c1890ffdd9f80eb54f3d3bde",
          "url": "https://github.com/ramonrsv/sci-cream/commit/d851ea0c3d861e6b6e5cd1b8bd180185b9cac655"
        },
        "date": 1769985085528,
        "tool": "benchmarkjs",
        "benches": [
          {
            "name": "comp_key_as_med_str",
            "value": 77092,
            "range": "±0.91%",
            "unit": "ops/sec",
            "extra": "89 samples"
          },
          {
            "name": "compKeyAsMedStr",
            "value": 705256,
            "range": "±1.60%",
            "unit": "ops/sec",
            "extra": "86 samples"
          },
          {
            "name": "prop_key_as_med_str",
            "value": 10203,
            "range": "±2.02%",
            "unit": "ops/sec",
            "extra": "86 samples"
          },
          {
            "name": "propKeyAsMedStr",
            "value": 611281,
            "range": "±0.76%",
            "unit": "ops/sec",
            "extra": "92 samples"
          }
        ]
      }
    ]
  }
}
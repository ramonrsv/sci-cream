window.BENCHMARK_DATA = {
  "lastUpdate": 1769558742006,
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
            "name": "calculate_composition",
            "value": 1923,
            "range": "± 69",
            "unit": "ns/iter"
          },
          {
            "name": "calculate_mix_properties",
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
            "name": "calculate_composition",
            "value": 2367,
            "range": "± 32",
            "unit": "ns/iter"
          },
          {
            "name": "calculate_mix_properties",
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
            "name": "calculate_composition",
            "value": 2283,
            "range": "± 93",
            "unit": "ns/iter"
          },
          {
            "name": "calculate_mix_properties",
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
            "name": "calculate_composition",
            "value": 2346,
            "range": "± 22",
            "unit": "ns/iter"
          },
          {
            "name": "calculate_mix_properties",
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
            "name": "calculate_composition",
            "value": 2488,
            "range": "± 104",
            "unit": "ns/iter"
          },
          {
            "name": "calculate_mix_properties",
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
            "name": "calculate_composition",
            "value": 2293,
            "range": "± 25",
            "unit": "ns/iter"
          },
          {
            "name": "calculate_mix_properties",
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
            "name": "calculate_composition",
            "value": 2361,
            "range": "± 33",
            "unit": "ns/iter"
          },
          {
            "name": "calculate_mix_properties",
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
            "name": "calculate_composition",
            "value": 2404,
            "range": "± 11",
            "unit": "ns/iter"
          },
          {
            "name": "calculate_mix_properties",
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
            "name": "calculate_composition",
            "value": 2379,
            "range": "± 39",
            "unit": "ns/iter"
          },
          {
            "name": "calculate_mix_properties",
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
            "name": "calculate_composition",
            "value": 2357,
            "range": "± 43",
            "unit": "ns/iter"
          },
          {
            "name": "calculate_mix_properties",
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
            "name": "calculate_composition",
            "value": 2022,
            "range": "± 39",
            "unit": "ns/iter"
          },
          {
            "name": "calculate_mix_properties",
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
            "name": "calculate_composition",
            "value": 1974,
            "range": "± 36",
            "unit": "ns/iter"
          },
          {
            "name": "calculate_mix_properties",
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
            "name": "calculate_composition",
            "value": 1974,
            "range": "± 13",
            "unit": "ns/iter"
          },
          {
            "name": "calculate_mix_properties",
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
            "name": "calculate_composition",
            "value": 2003,
            "range": "± 33",
            "unit": "ns/iter"
          },
          {
            "name": "calculate_mix_properties",
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
            "name": "calculate_composition",
            "value": 1979,
            "range": "± 32",
            "unit": "ns/iter"
          },
          {
            "name": "calculate_mix_properties",
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
            "name": "calculate_composition",
            "value": 1601,
            "range": "± 41",
            "unit": "ns/iter"
          },
          {
            "name": "calculate_mix_properties",
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
            "name": "calculate_composition",
            "value": 1596,
            "range": "± 68",
            "unit": "ns/iter"
          },
          {
            "name": "calculate_mix_properties",
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
            "name": "calculate_composition",
            "value": 1987,
            "range": "± 28",
            "unit": "ns/iter"
          },
          {
            "name": "calculate_mix_properties",
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
            "name": "calculate_composition",
            "value": 1972,
            "range": "± 16",
            "unit": "ns/iter"
          },
          {
            "name": "calculate_mix_properties",
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
            "name": "calculate_composition",
            "value": 1977,
            "range": "± 37",
            "unit": "ns/iter"
          },
          {
            "name": "calculate_mix_properties",
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
            "name": "calculate_composition",
            "value": 2033,
            "range": "± 37",
            "unit": "ns/iter"
          },
          {
            "name": "calculate_mix_properties",
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
      }
    ]
  }
}
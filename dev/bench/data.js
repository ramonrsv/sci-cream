window.BENCHMARK_DATA = {
  "lastUpdate": 1769034853314,
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
      }
    ]
  }
}
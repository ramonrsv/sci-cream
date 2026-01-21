window.BENCHMARK_DATA = {
  "lastUpdate": 1768963989855,
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
      }
    ]
  }
}
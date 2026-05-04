import { expect, test } from "vitest";

import {
  CompKey,
  Composition,
  new_ingredient_database_seeded_from_embedded_data,
} from "../../dist/index";

test("Composition NaN values", () => {
  {
    const composition = new Composition();

    expect(composition.get(CompKey.TotalSolids)).toBe(0);
    expect(composition.get(CompKey.Water)).toBe(100);
    expect(composition.get(CompKey.TotalFats)).toBe(0);
    expect(composition.get(CompKey.EmulsifiersPerFat)).toBe(NaN);
    expect(composition.get(CompKey.StabilizersPerWater)).toBe(0);
    expect(composition.get(CompKey.AbsPAC)).toBe(0);
  }

  {
    const db = new_ingredient_database_seeded_from_embedded_data();
    const composition = db.get_ingredient_by_name("Sucrose").composition;

    expect(composition.get(CompKey.TotalSolids)).toBe(100);
    expect(composition.get(CompKey.Water)).toBe(0);
    expect(composition.get(CompKey.TotalFats)).toBe(0);
    expect(composition.get(CompKey.EmulsifiersPerFat)).toBe(NaN);
    expect(composition.get(CompKey.StabilizersPerWater)).toBe(NaN);
    expect(composition.get(CompKey.AbsPAC)).toBe(NaN);
  }
});

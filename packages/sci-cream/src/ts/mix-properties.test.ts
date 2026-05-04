import { expect, test } from "vitest";

import {
  CompKey,
  compToPropKey,
  MixProperties,
  getMixProperty,
  new_ingredient_database_seeded_from_embedded_data,
} from "../../dist/index";

test("MixProperties NaN values", () => {
  {
    const mixProperties = new MixProperties();

    expect(getMixProperty(mixProperties, compToPropKey(CompKey.Water))).toBe(100);
    expect(getMixProperty(mixProperties, compToPropKey(CompKey.TotalSolids))).toBe(0);
    expect(getMixProperty(mixProperties, compToPropKey(CompKey.TotalFats))).toBe(0);
    expect(getMixProperty(mixProperties, compToPropKey(CompKey.EmulsifiersPerFat))).toBe(NaN);
    expect(getMixProperty(mixProperties, compToPropKey(CompKey.StabilizersPerWater))).toBe(0);
    expect(getMixProperty(mixProperties, compToPropKey(CompKey.AbsPAC))).toBe(0);
  }

  {
    const db = new_ingredient_database_seeded_from_embedded_data();
    const mixProperties = new MixProperties();
    mixProperties.composition = db.get_ingredient_by_name("Sucrose").composition;

    expect(getMixProperty(mixProperties, compToPropKey(CompKey.Water))).toBe(0);
    expect(getMixProperty(mixProperties, compToPropKey(CompKey.TotalSolids))).toBe(100);
    expect(getMixProperty(mixProperties, compToPropKey(CompKey.TotalFats))).toBe(0);
    expect(getMixProperty(mixProperties, compToPropKey(CompKey.EmulsifiersPerFat))).toBe(NaN);
    expect(getMixProperty(mixProperties, compToPropKey(CompKey.StabilizersPerWater))).toBe(NaN);
    expect(getMixProperty(mixProperties, compToPropKey(CompKey.AbsPAC))).toBe(NaN);
  }
});

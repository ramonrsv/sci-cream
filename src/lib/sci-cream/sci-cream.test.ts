import { expect, test } from "vitest";

import { Composition, CompositionRecord, Dairy } from "./sci-cream";

test(`Construct Dairy from milk fat only`, () => {
  function constructAndExpectToBe({
    name,
    milkFat,
    lactose,
    msnf,
    milkSNFS,
    solids,
    pod,
    pacSgr,
  }: any) {
    const dairy = new Dairy({ name: name, milkFat: milkFat });

    const expectedComposition: CompositionRecord = {
      [Composition.MILK_FAT]: milkFat,
      [Composition.LACTOSE]: lactose,
      [Composition.MILK_SNF]: msnf,
      [Composition.MILK_SNFS]: milkSNFS,
      [Composition.TOTAL_SOLIDS]: solids,
      [Composition.POD]: pod,
      [Composition.PAC_SGR]: pacSgr,
    };

    expect(dairy.name).toBe(name);
    expect(dairy.composition[Composition.MILK_FAT]).toBe(milkFat);

    Object.values(Composition).forEach((comp) => {
      if (expectedComposition[comp] === undefined) {
        expect(dairy.composition[comp], `${comp}`).toBe(undefined);
      } else {
        expect(dairy.composition[comp]).toBeCloseTo(expectedComposition[comp], 4);
      }
    });
  }

  constructAndExpectToBe({
    name: "Milk 2%",
    milkFat: 2,
    lactose: 4.8069,
    msnf: 8.82,
    milkSNFS: 4.0131,
    solids: 10.82,
    pod: 0.769104,
    pacSgr: 4.8069,
  });
});

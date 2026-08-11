import { describe, expect, test } from "vitest";

import { allSpecEntries, getSpecEntryByName } from "@workspace/sci-cream";

import { specDocLinks, specKindOf } from "@/lib/sci-cream/spec-docs";

/** The labels of an entry's doc links, looked up by ingredient name */
function labelsFor(name: string): string[] {
  return specDocLinks(getSpecEntryByName(name)).map((l) => l.label);
}

describe("specKindOf", () => {
  test("every embedded entry has a recognized spec type with a docs page", () => {
    for (const entry of allSpecEntries) {
      expect(specKindOf(entry)).toBeTypeOf("string");
      // The type page is always first, so a mapped kind means a non-empty link list
      expect(specDocLinks(entry).length).toBeGreaterThan(0);
    }
  });

  test("aliases report AliasSpec", () => {
    expect(specKindOf(getSpecEntryByName("Whole Milk"))).toBe("AliasSpec");
  });

  test("unrecognized shapes yield no links", () => {
    expect(specDocLinks({ name: "x", category: "y" })).toEqual([]);
  });
});

describe("specDocLinks", () => {
  test("the spec type page comes first and points at its rustdoc", () => {
    const [first] = specDocLinks(getSpecEntryByName("Sucrose"));
    expect(first).toEqual({
      label: "SweetenerSpec",
      href: "https://docs.rs/sci-cream/latest/sci_cream/specs/sweetener/struct.SweetenerSpec.html",
    });
  });

  test("kind rules add their chapters", () => {
    expect(labelsFor("70% Dark Chocolate")).toContain("Chocolate");
    expect(labelsFor("Sucrose")).toContain("Sweeteners");
    expect(labelsFor("Sucrose")).toContain("PAC, AFP, FPDF, SE");
  });

  test("field rules distinguish sugars, polyols, artificial sweeteners, and fibers", () => {
    expect(labelsFor("Sucrose")).toContain("Sugars");
    expect(labelsFor("Sucrose")).not.toContain("Polyols");
    expect(labelsFor("Xylitol")).toContain("Polyols");
    expect(labelsFor("Xylitol")).not.toContain("Sugars");
    expect(labelsFor("Splenda (Stevia)")).toContain("Artificial Sweeteners");
    expect(labelsFor("HP Inulin Powder")).toContain("Fibers");
  });

  test("name rules catch glucose syrups and powders", () => {
    expect(labelsFor("Glucose Syrup 42 DE")).toContain("Glucose Syrups");
    expect(labelsFor("High Fructose Corn Syrup 42")).toContain("Glucose Syrups");
    expect(labelsFor("HFCS 42")).toContain("Glucose Syrups");
    expect(labelsFor("Sucrose")).not.toContain("Glucose Syrups");
  });

  test("chapter links target the guide's anchors", () => {
    const chocolate = specDocLinks(getSpecEntryByName("70% Dark Chocolate"));
    expect(chocolate.find((l) => l.label === "Chocolate")?.href).toBe(
      "https://docs.rs/sci-cream/latest/sci_cream/docs/index.html#chocolate",
    );
  });

  test("chapters contributed by more than one rule appear once", () => {
    const labels = labelsFor("Splenda (Stevia)");
    expect(new Set(labels).size).toBe(labels.length);
  });
});

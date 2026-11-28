import { describe, expect, test } from "vitest";

import { REFERENCE_ROOT, referenceChapter, referenceChapters } from "./reference";
import { referenceAnchorUrl } from "./reference-anchors";

describe("reference", () => {
  test("serves its chapters under /docs/reference, each at a slug of its own", () => {
    expect(REFERENCE_ROOT).toBe("/docs/reference");
    const slugs = referenceChapters.map(({ slug }) => slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  test("finds a chapter by its slug", () => {
    expect(referenceChapter("sweeteners/sugars")?.title).toBe("Sugars");
    expect(referenceChapter("sugars")).toBeUndefined();
  });
});

describe("referenceAnchorUrl", () => {
  test("gives an anchor's URL in the chapter that defines it", () => {
    expect(referenceAnchorUrl("pac-afp-fpdf-se")).toBe(
      "/docs/reference/freezing-point-depression#pac-afp-fpdf-se",
    );
  });

  test("gives a chapter's route for its own heading", () => {
    expect(referenceAnchorUrl("sugars")).toBe("/docs/reference/sweeteners/sugars");
  });

  test("gives nothing for an id no chapter defines", () => {
    expect(referenceAnchorUrl("table-of-content")).toBeUndefined();
    expect(referenceAnchorUrl("constructor")).toBeUndefined();
  });
});

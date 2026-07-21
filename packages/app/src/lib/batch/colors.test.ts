import { describe, it, expect, beforeEach } from "vitest";

import { colorForPosition, loadColorSequence, recordColorPick } from "./colors";
import { STORAGE_KEYS, setLocalStorage } from "@/lib/local-storage";
import { CATEGORY_COLORS, CategoryColor } from "@/lib/styles/colors";

/** The stored form: names, as another browser session would find them. */
function storedNames(): unknown {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.makeRecipeColors) ?? "null");
}

describe("loadColorSequence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("falls back to palette order when nothing is stored", () => {
    expect(loadColorSequence()).toEqual([...CATEGORY_COLORS]);
  });

  it("puts stored colors first, then the rest of the palette", () => {
    setLocalStorage(STORAGE_KEYS.makeRecipeColors, ["Black", "Teal"]);
    const sequence = loadColorSequence();

    expect(sequence.slice(0, 2)).toEqual([CategoryColor.Black, CategoryColor.Teal]);
    expect(new Set(sequence)).toEqual(new Set(CATEGORY_COLORS));
    expect(sequence).toHaveLength(CATEGORY_COLORS.length);
  });

  // A short, duplicated or garbled entry must still yield a usable ordering: callers index into it
  // without bounds-checking, so anything less than the full palette would throw at them later.
  it.each([
    ["a stale name", ["Chartreuse", "Teal"]],
    ["a repeat", ["Teal", "Teal"]],
    ["a CSS token instead of a name", [CategoryColor.Teal, "Teal"]],
    ["a wrong type", [7, null, "Teal"]],
    ["not an array at all", { first: "Teal" }],
  ])("normalizes %s to a full palette ordering", (_label, stored) => {
    setLocalStorage(STORAGE_KEYS.makeRecipeColors, stored);
    const sequence = loadColorSequence();

    expect(sequence).toHaveLength(CATEGORY_COLORS.length);
    expect(new Set(sequence)).toEqual(new Set(CATEGORY_COLORS));
  });
});

describe("colorForPosition", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("hands out the stored sequence by position", () => {
    setLocalStorage(STORAGE_KEYS.makeRecipeColors, ["White", "Black"]);
    expect(colorForPosition(0)).toBe(CategoryColor.White);
    expect(colorForPosition(1)).toBe(CategoryColor.Black);
  });

  it("throws past the palette rather than wrapping onto a color already in use", () => {
    expect(() => colorForPosition(CATEGORY_COLORS.length)).toThrow(RangeError);
  });
});

describe("recordColorPick", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("makes the pick the default for that position next time", () => {
    recordColorPick(0, CategoryColor.White);
    expect(colorForPosition(0)).toBe(CategoryColor.White);
  });

  it("stores names, so a token rename cannot strand the sequence", () => {
    recordColorPick(0, CategoryColor.White);
    // Spelled out rather than derived: White and Blue trade seats, everything else holds.
    expect(storedNames()).toEqual([
      "White",
      "Green",
      "Pink",
      "Yellow",
      "Teal",
      "Orange",
      "Purple",
      "Red",
      "Blue",
      "Black",
    ]);
  });

  // Overwriting would drop the displaced color out of the sequence entirely, leaving it
  // unreachable as a default for any position.
  it("swaps, keeping the sequence a permutation of the palette", () => {
    const before = loadColorSequence();
    recordColorPick(0, CategoryColor.Black);
    const after = loadColorSequence();

    expect(new Set(after)).toEqual(new Set(CATEGORY_COLORS));
    expect(after[0]).toBe(CategoryColor.Black);
    // The color it displaced took Black's old seat rather than vanishing
    expect(after[before.indexOf(CategoryColor.Black)]).toBe(before[0]);
  });

  it("leaves every other position alone", () => {
    const before = loadColorSequence();
    recordColorPick(3, CategoryColor.Red);
    const after = loadColorSequence();

    const moved = [3, before.indexOf(CategoryColor.Red)];
    for (let i = 0; i < after.length; i++) {
      if (!moved.includes(i)) expect(after[i]).toBe(before[i]);
    }
  });

  it("is a no-op when the pick is already that position's color", () => {
    const before = loadColorSequence();
    recordColorPick(2, before[2]!);
    expect(loadColorSequence()).toEqual(before);
  });

  it("accumulates across picks, so a whole sequence can be taught", () => {
    recordColorPick(0, CategoryColor.Red);
    recordColorPick(1, CategoryColor.White);
    recordColorPick(2, CategoryColor.Black);

    expect(loadColorSequence().slice(0, 3)).toEqual([
      CategoryColor.Red,
      CategoryColor.White,
      CategoryColor.Black,
    ]);
  });
});

import { describe, it, expect } from "vitest";

import {
  displayVersionName,
  hasVersionNames,
  isValidVersionName,
  nextVersionName,
  validateVersionName,
  type VersionNameSource,
} from "@/lib/recipe/version";

/** Build a version source list from `[version, versionName?]` tuples */
function versions(...entries: [number, string?][]): VersionNameSource[] {
  return entries.map(([version, versionName]) => ({ version, versionName }));
}

describe("isValidVersionName", () => {
  it.each(["3", "3.1", "3-a", "4.2-b", "10.24", "1-abc", "0"])("accepts %s", (name) => {
    expect(isValidVersionName(name)).toBe(true);
  });

  it.each(["my version", "3.1.4.5", "-x", "", "3.", ".1", "3..1", "v3", "3 1", "3-"])(
    "rejects %s",
    (name) => {
      expect(isValidVersionName(name)).toBe(false);
    },
  );

  it("trims surrounding whitespace before matching", () => {
    expect(isValidVersionName("  3.1  ")).toBe(true);
  });
});

describe("validateVersionName", () => {
  it("returns undefined for a valid name", () => {
    expect(validateVersionName("4.2-b")).toBeUndefined();
  });

  it("flags an empty value distinctly from a malformed one", () => {
    expect(validateVersionName("")).toBe("Enter a version");
    expect(validateVersionName("nope")).not.toBe("Enter a version");
    expect(validateVersionName("nope")).toBeTypeOf("string");
  });
});

describe("displayVersionName", () => {
  it("shows the name when present", () => {
    expect(displayVersionName({ version: 3, versionName: "3.1" })).toBe("3.1");
  });

  it("falls back to the integer when unnamed", () => {
    expect(displayVersionName({ version: 3 })).toBe("3");
    expect(displayVersionName({ version: 3, versionName: null })).toBe("3");
  });
});

describe("hasVersionNames", () => {
  it("is true when any version carries a name", () => {
    expect(hasVersionNames(versions([1], [2], [3, "3.1"]))).toBe(true);
  });

  it("is false when every version is unnamed", () => {
    expect(hasVersionNames(versions([1], [2]))).toBe(false);
    expect(hasVersionNames([])).toBe(false);
  });
});

describe("nextVersionName", () => {
  it('yields "1" for an empty list', () => {
    expect(nextVersionName([])).toBe("1");
  });

  it("continues the visible sequence past named versions", () => {
    // Displayed 1, 2, 3.1, 3.2 (internal 1..4) -> next visible major is 4
    expect(nextVersionName(versions([1], [2], [3, "3.1"], [4, "3.2"]))).toBe("4");
  });

  it("uses the max major, not insertion order, so out-of-order names don't duplicate", () => {
    expect(nextVersionName(versions([1, "5"], [2, "2"]))).toBe("6");
  });

  it("parses the major of suffixed names", () => {
    expect(nextVersionName(versions([1, "4.2-b"]))).toBe("5");
    expect(nextVersionName(versions([1, "3-a"]))).toBe("4");
  });

  it("mixes named and unnamed versions by their displayed major", () => {
    expect(nextVersionName(versions([1], [2], [3, "3.1"]))).toBe("4");
  });
});

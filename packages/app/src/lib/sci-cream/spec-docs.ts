import { isSpecEntryAlias, specEntryName, type SpecEntryJson } from "@workspace/sci-cream";

/** Rustdoc root for the crate, tracking the latest published release like the README badge. */
const DOCS_BASE = "https://docs.rs/sci-cream/latest/sci_cream";

/** A documentation link shown beneath an entry's spec */
export interface SpecDocLink {
  /** Link text */
  label: string;
  /** Absolute docs.rs URL */
  href: string;
}

/**
 * Rustdoc page for each spec type, relative to {@link DOCS_BASE}. The paths cannot be templated:
 * `MicroSpec` is an enum, and the `dairy` module hosts two types.
 */
const SPEC_TYPE_PAGES: Readonly<Record<string, string>> = {
  AlcoholSpec: "specs/alcohol/struct.AlcoholSpec.html",
  AliasSpec: "specs/alias/struct.AliasSpec.html",
  ChocolateSpec: "specs/chocolate/struct.ChocolateSpec.html",
  CompositeSpec: "specs/composite/struct.CompositeSpec.html",
  DairyLabelSpec: "specs/dairy/struct.DairyLabelSpec.html",
  DairySimpleSpec: "specs/dairy/struct.DairySimpleSpec.html",
  EggSpec: "specs/egg/struct.EggSpec.html",
  EmulsifierSpec: "specs/emulsifier/struct.EmulsifierSpec.html",
  FruitSpec: "specs/fruit/struct.FruitSpec.html",
  FullSpec: "specs/full/struct.FullSpec.html",
  MicroSpec: "specs/micro/enum.MicroSpec.html",
  NutSpec: "specs/nut/struct.NutSpec.html",
  StabilizerSpec: "specs/stabilizer/struct.StabilizerSpec.html",
  SweetenerSpec: "specs/sweetener/struct.SweetenerSpec.html",
};

/**
 * Chapters of the crate's guide (`sci_cream::docs`), keyed by the anchor rustdoc derives from the
 * heading. Add a chapter here first, then point a {@link SPEC_DOC_RULES} rule at it.
 */
const GUIDE_CHAPTERS = {
  sweeteners: "Sweeteners",
  sugars: "Sugars",
  polyols: "Polyols",
  "artificial-sweeteners": "Artificial Sweeteners",
  fibers: "Fibers",
  "glucose-syrups-and-powders": "Glucose Syrups",
  "freezing-point-depression": "Freezing Point Depression",
  "pac-afp-fpdf-se": "PAC, AFP, FPDF, SE",
  "absolute-pac": "Absolute PAC",
  stabilizers: "Stabilizers",
  emulsifiers: "Emulsifiers",
  chocolate: "Chocolate",
} as const satisfies Record<string, string>;

/** Anchor of a chapter in {@link GUIDE_CHAPTERS} */
type GuideChapter = keyof typeof GUIDE_CHAPTERS;

/** Adds guide chapters to an entry's links when {@link SpecDocRule.when} matches it */
interface SpecDocRule {
  /** `kind` is the entry's spec type name, as keyed in {@link SPEC_TYPE_PAGES} */
  when: (entry: SpecEntryJson, kind: string | undefined) => boolean;
  /** Chapters to link, in order; repeats across matching rules are dropped */
  chapters: readonly GuideChapter[];
}

/** Matches entries of any of the given spec types */
function ofKind(...kinds: string[]): SpecDocRule["when"] {
  return (_entry, kind) => kind !== undefined && kinds.includes(kind);
}

/** Matches entries whose spec body holds a non-empty value at the given dotted path */
function hasPath(path: string): SpecDocRule["when"] {
  const segments = path.split(".");
  return (entry, kind) => {
    let node: unknown = kind === undefined ? undefined : (entry as Record<string, unknown>)[kind];
    for (const segment of segments) {
      if (typeof node !== "object" || node === null) return false;
      node = (node as Record<string, unknown>)[segment];
    }
    if (node === undefined || node === null) return false;
    return typeof node !== "object" || Object.keys(node).length > 0;
  };
}

/** Matches entries whose name matches the pattern */
function nameMatches(pattern: RegExp): SpecDocRule["when"] {
  return (entry) => pattern.test(specEntryName(entry));
}

/**
 * Which guide chapters each entry gets, beyond its spec type's own page. Rules are independent and
 * additive — every match contributes — so a new heuristic is one more entry in this list.
 */
const SPEC_DOC_RULES: readonly SpecDocRule[] = [
  { when: ofKind("ChocolateSpec"), chapters: ["chocolate"] },
  { when: ofKind("SweetenerSpec"), chapters: ["sweeteners", "pac-afp-fpdf-se"] },
  { when: ofKind("StabilizerSpec"), chapters: ["stabilizers"] },
  { when: ofKind("EmulsifierSpec"), chapters: ["emulsifiers"] },
  { when: ofKind("AlcoholSpec"), chapters: ["freezing-point-depression", "absolute-pac"] },
  { when: hasPath("sweeteners.sugars"), chapters: ["sugars"] },
  { when: hasPath("sweeteners.polyols"), chapters: ["polyols"] },
  { when: hasPath("sweeteners.artificial"), chapters: ["artificial-sweeteners"] },
  { when: hasPath("fiber"), chapters: ["fibers"] },
  {
    when: nameMatches(/glucose (syrup|powder)|maltodextrin|hfcs|high fructose corn syrup/i),
    chapters: ["glucose-syrups-and-powders"],
  },
];

/**
 * The entry's spec type name — `AliasSpec` for aliases, otherwise its sole key besides `name`,
 * `category`, and `comments`. `undefined` if the shape is unrecognized.
 */
export function specKindOf(entry: SpecEntryJson): string | undefined {
  if (isSpecEntryAlias(entry)) return "AliasSpec";
  return Object.keys(entry).find((key) => !["name", "category", "comments"].includes(key));
}

/**
 * Documentation links for an entry: its spec type's rustdoc page, then the guide chapters every
 * matching {@link SPEC_DOC_RULES} rule contributes. Empty for an unrecognized spec type.
 */
export function specDocLinks(entry: SpecEntryJson): SpecDocLink[] {
  const kind = specKindOf(entry);
  const page = kind === undefined ? undefined : SPEC_TYPE_PAGES[kind];
  if (kind === undefined || page === undefined) return [];

  const chapters = SPEC_DOC_RULES.filter((rule) => rule.when(entry, kind)).flatMap(
    (rule) => rule.chapters,
  );

  return [
    { label: kind, href: `${DOCS_BASE}/${page}` },
    ...[...new Set(chapters)].map((anchor) => ({
      label: GUIDE_CHAPTERS[anchor],
      href: `${DOCS_BASE}/docs/index.html#${anchor}`,
    })),
  ];
}

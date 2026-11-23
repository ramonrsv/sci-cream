/**
 * Upgrades of older recipe share payloads, so that links from an older app keep loading. A version
 * bump that changes what a payload holds adds its step to {@link upgradeSpecs}.
 */

/**
 * Upgrade the inlined specs of a payload at `version`, no newer than the current one, to the
 * current version's, one version at a time.
 */
export function upgradeSpecs(version: unknown, specs: unknown[]): unknown[] {
  return version === 1 ? upgradeV1Specs(specs) : specs;
}

/** The specs whose `cocoa_solids` field a v1 payload names `cacao_solids`. */
const COCOA_SOLIDS_SPEC_TAGS = ["ChocolateSpec", "CocoaPowderSpec", "ChocolateLabelSpec"];

/**
 * Upgrade a v1 payload's inlined specs, whose chocolate specs name their `cocoa_solids` field
 * `cacao_solids`. Anything else passes through as it is, for seeding to validate.
 */
function upgradeV1Specs(specs: unknown[]): unknown[] {
  return specs.map((entry) => {
    if (!isJsonObject(entry)) return entry;
    const upgraded = { ...entry };
    for (const tag of COCOA_SOLIDS_SPEC_TAGS) {
      const spec = upgraded[tag];
      if (isJsonObject(spec) && "cacao_solids" in spec) {
        const { cacao_solids: cocoaSolids, ...rest } = spec;
        upgraded[tag] = { ...rest, cocoa_solids: cocoaSolids };
      }
    }
    return upgraded;
  });
}

/** Whether `value` is a JSON object, rather than an array, `null`, or a primitive. */
function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

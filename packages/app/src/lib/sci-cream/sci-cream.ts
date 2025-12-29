import { CompKey, PropKey, compToPropKey, isCompKey } from "@workspace/sci-cream";

export const isCompKeyQuantity = (prop_key: CompKey): boolean => {
  return (
    prop_key !== CompKey.AbsPAC &&
    prop_key !== CompKey.EmulsifiersPerFat &&
    prop_key !== CompKey.StabilizersPerWater
  );
};

export const isPropKeyQuantity = (prop_key: PropKey): boolean => {
  return (
    isCompKey(prop_key) &&
    prop_key !== compToPropKey(CompKey.AbsPAC) &&
    prop_key !== compToPropKey(CompKey.EmulsifiersPerFat) &&
    prop_key !== compToPropKey(CompKey.StabilizersPerWater)
  );
};

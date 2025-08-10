import { expect, test } from "vitest";

import {
  test_getFpdFromPacInterpolation_,
  test_getFpdFromPacPolynomial_,
  test_computeFpd_,
  test_computeHardnessAtTemp_,
  test_flattenToAndDecompFromRow_,
  test_expandDairyRange_,
  test_expandSweetnersRange_,
  test_expandAloholicRange_,
  test_expandChocolatesRange_,
  test_expandNutsRange_,
  test_expandFruitsAndVeggiesRange_,
  test_expandEggsRange_,
  test_expandEmulsifiersAndStabilizersRange_,
  test_expandMiscellaneousRange_,
  test_isError_,
  test_isCompositionQuantField_,
  test_linearFindIngredient_,
  test_binaryFindIngredient_,
  test_getIngredientParameters_,
  test_processIngredient_,
  test_computeIngredientQuantities_,
  test_computeRecipeQuantities_,
  test_computeRecipeQuantityTotals_,
  test_computeRecipeProperties_,
  test_computeAndDisplayQuantitiesFull_,
  test_computeAndDisplayQuantitiesFullError_,
  test_computeAndDisplayPropertiesSummary_,
  test_computeAndDisplayPropertiesSummaryEmpty_,
  test_computeAndDisplayPropertiesSummaryError_,
  test_computeAndDisplayFpdCurves_,
  test_computeAndDisplayNewBrixFruits_,
  test_computeAndDisplayNewBrixFruitsEmpty_,
  test_computeAndDisplayNewBrixFruitsErrors_,
  test_computeFruitMedley_,
} from "./sci-cream-legacy";

const allLegacyTestFunctions = [
  test_getFpdFromPacInterpolation_,
  test_getFpdFromPacPolynomial_,
  test_computeFpd_,
  test_computeHardnessAtTemp_,

  test_flattenToAndDecompFromRow_,

  test_expandDairyRange_,
  test_expandSweetnersRange_,
  test_expandAloholicRange_,
  test_expandChocolatesRange_,
  test_expandNutsRange_,
  test_expandFruitsAndVeggiesRange_,
  test_expandEggsRange_,
  test_expandEmulsifiersAndStabilizersRange_,
  test_expandMiscellaneousRange_,

  test_isError_,
  test_isCompositionQuantField_,
  test_linearFindIngredient_,
  test_binaryFindIngredient_,
  test_getIngredientParameters_,
  test_processIngredient_,

  test_computeIngredientQuantities_,
  test_computeRecipeQuantities_,
  test_computeRecipeQuantityTotals_,
  test_computeRecipeProperties_,

  test_computeAndDisplayQuantitiesFull_,
  test_computeAndDisplayQuantitiesFullError_,
  test_computeAndDisplayPropertiesSummary_,
  test_computeAndDisplayPropertiesSummaryEmpty_,
  test_computeAndDisplayPropertiesSummaryError_,
  test_computeAndDisplayFpdCurves_,

  test_computeAndDisplayNewBrixFruits_,
  test_computeAndDisplayNewBrixFruitsEmpty_,
  test_computeAndDisplayNewBrixFruitsErrors_,

  test_computeFruitMedley_,
];

function runAllLegacyTests() {
  for (const legacyTestFunction of allLegacyTestFunctions) {
    test(`${legacyTestFunction.name}`, () => {
      expect(legacyTestFunction()).toBe(true);
    });
  }
}

runAllLegacyTests();

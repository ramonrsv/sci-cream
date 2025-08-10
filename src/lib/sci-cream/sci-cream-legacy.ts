/// --------------- Glossary and Definitions ---------------
/// ========================================================

//
//

/// --------------- Types ---------------
/// =====================================

// Composition component of ingredients
const Composition = Object.freeze({
  NAME: 0,
  MILK_FAT: 1,
  EGG_FAT: 2,
  CACAO_FAT: 3,
  NUT_FAT: 4,
  OTHER_FAT: 5,
  LACTOSE: 6,
  SUGAR: 7,
  MILK_SNF: 8,
  EGG_SNF: 9,
  COCOA_SNF: 10,
  NUT_SNF: 11,
  OTHER_SNF: 12,
  MILK_SNFS: 13,
  EGG_SNFS: 14,
  COCOA_SNFS: 15,
  NUT_SNFS: 16,
  OTHER_SNFS: 17,
  TOTAL_SOLIDS: 18,
  SALT: 19,
  ALCOHOL: 20,
  EMULSIFIERS: 21,
  STABILIZERS: 22,
  POD: 23,
  PAC_SGR: 24,
  PAC_SLT: 25,
  PAC_ALC: 26,
  HF: 27,
  CATEGORY: 28,
  EXTENSION: 29,
});

// Property of a mix
const Property = Object.freeze({
  MIX_TOTAL: 0,
  MILK_FAT: 1,
  EGG_FAT: 2,
  CACAO_FAT: 3,
  NUT_FAT: 4,
  OTHER_FAT: 5,
  TOTAL_FAT: 6,
  LACTOSE: 7,
  SUGAR: 8,
  MILK_SNF: 9,
  EGG_SNF: 10,
  COCOA_SNF: 11,
  NUT_SNF: 12,
  OTHER_SNF: 13,
  TOTAL_SNF: 14,
  MILK_SNFS: 15,
  EGG_SNFS: 16,
  COCOA_SNFS: 17,
  NUT_SNFS: 18,
  OTHER_SNFS: 19,
  TOTAL_SNFS: 20,
  TOTAL_SOLIDS: 21,
  WATER: 22,
  SALT: 23,
  ALCOHOL: 24,
  EMULSIFIERS: 25,
  STABILIZERS: 26,
  ABV: 27,
  EMULS_PER_FAT: 28,
  STABS_PER_WATER: 29,
  POD: 30,
  PAC_SGR: 31,
  PAC_SLT: 32,
  PAC_ALC: 33,
  PAC_TOT: 34,
  ABS_PAC: 35,
  HF: 36,
  FPD: 37,
  SERVING_TEMP: 38,
  HARDNESS_AT_14: 39,
  ERROR: 40,
});

// Composition component of ingredients
const Category = Object.freeze({
  DAIRY: "Dairy",
  SWEETNER: "Sweetner",
  ALCOHOL: "Alcohol",
  CHOCOLATE: "Chocolate",
  NUT: "Nut",
  FRUIT: "Fruit",
  EGG: "Egg",
  EMULSIFIER_STABILIZER: "Emul/Stab",
  MISCELLANEOUS: "Misc.",
});

const C = Composition;
const P = Property;
const CAT = Category;

// Indexes for property value pairs
const QUANT = 0;
const PRCNT = 1;

const COMPOSITION_NON_QUANT_FIELDS = [C.NAME, C.CATEGORY, C.EXTENSION];

const COMPOSITION_QUANT_FIELDS_COUNT =
  Object.values(Composition).length - COMPOSITION_NON_QUANT_FIELDS.length;
const COMPOSITION_QUANT_FIELDS_SLICE = [1, -2];

/// --------------- Constants ---------------
/// =========================================

const ABV_TO_ABW_RATIO = 0.789;

const SUCROSE_POD = 100;
const GLUCOSE_POD = 70;
const FRUCTOSE_POD = 170;
const LACTOSE_POD = 16;

const SUCROSE_PAC = 100;
const GLUCOSE_PAC = 190;
const FRUCTOSE_PAC = 190;
const LACTOSE_PAC = 100;

const SALT_PAC = 585;
const ALCOHOL_PAC = 740;

const CACAO_FAT_HF = 0.9;
const COCOA_SOLIDS_HF = 1.8;
const NUT_FAT_HF = 1.4;

const STANDARD_LACTOSE_IN_MSNF = 0.545;
const FPD_MSNF_FACTOR_FOR_CELSIUS = 2.37;

const PAC_FPD_TABLE_MAX_PAC = 180;
const PAC_FPD_TABLE: { [code: number]: number } = {
  0: 0.0,
  3: 0.18,
  6: 0.35,
  9: 0.53,
  12: 0.72,
  15: 0.9,
  18: 1.1,
  21: 1.29,
  24: 1.47,
  27: 1.67,
  30: 1.86,
  33: 2.03,
  36: 2.21,
  39: 2.4,
  42: 2.6,
  45: 2.78,
  48: 2.99,
  51: 3.2,
  54: 3.42,
  57: 3.63,
  60: 3.85,
  63: 4.1,
  66: 4.33,
  69: 4.54,
  72: 4.77,
  75: 5.0,
  78: 5.26,
  81: 5.53,
  84: 5.77,
  87: 5.99,
  90: 6.23,
  93: 6.5,
  96: 6.8,
  99: 7.04,
  102: 7.32,
  105: 7.56,
  108: 7.8,
  111: 8.04,
  114: 8.33,
  117: 8.62,
  120: 8.92,
  123: 9.19,
  126: 9.45,
  129: 9.71,
  132: 9.96,
  135: 10.22,
  138: 10.47,
  141: 10.72,
  144: 10.97,
  147: 11.19,
  150: 11.41,
  153: 11.63,
  156: 11.88,
  159: 12.14,
  162: 12.4,
  165: 12.67,
  168: 12.88,
  171: 13.08,
  174: 13.28,
  177: 13.48,
  180: 13.68,
};

//const FPD_POLYNOMIAL_FACTORS = [-0.1617229483, 0.0647948043, 0.0000785525]; // not including 184.83: 14.27
const FPD_POLYNOMIAL_FACTORS = [-0.1720419078, 0.0652588455, 0.000075372]; // including 184.83: 14.27

const FPD_CURVE_STEPS = 5;
const SERVING_TEMP_X_AXIS = 75;
const HARDNESS_AT_TEMP_STEP_PRECISION = 1;

const PARAMETRIC_OPEN_CHARACTER = "[";
const PARAMETRIC_REGEX = /([^\[\]]+)( \[([a-zA-Z]+) (\d\d?\.?\d?)\])/;

const ERROR_INVALID_ARGUMENT = "ERROR: INV ARG";
const ERROR_UNKNOWN_INGREDIENT = "ERROR: UNK ING";
const ERROR_INVALID_PARAMETER = "ERROR: INV PAR";

const ERRORS = [ERROR_INVALID_ARGUMENT, ERROR_UNKNOWN_INGREDIENT, ERROR_INVALID_PARAMETER];

/// --------------- Public Functions ---------------
/// ================================================

function decompDairyRow(row: any) {
  let [name, milk_fat, lactose, msnf] = [...row].map(nullIfEmpty_);

  // Milk sugars aren't counted towards Sugar, but they
  // do contribute to MSNF, Solids, POD, PAC, FPD, etc.

  var ret = [];
  ret[C.NAME] = name;
  ret[C.MILK_FAT] = milk_fat;
  ret[C.LACTOSE] = lactose;
  ret[C.MILK_SNF] = msnf;
  ret[C.MILK_SNFS] = msnf - lactose;
  ret[C.TOTAL_SOLIDS] = milk_fat + msnf;
  ret[C.POD] = (LACTOSE_POD * lactose) / 100;
  ret[C.PAC_SGR] = (LACTOSE_PAC * lactose) / 100;
  ret[C.CATEGORY] = CAT.DAIRY;

  return ret;
}

function decompSweetnersRow(row: any) {
  var [name, pod, pac, sugar, solids] = [...row].map(nullIfEmpty_);

  var ret = [];
  ret[C.NAME] = name;
  ret[C.SUGAR] = sugar;
  ret[C.OTHER_SNF] = solids;
  ret[C.OTHER_SNFS] = solids - sugar;
  ret[C.TOTAL_SOLIDS] = solids;
  ret[C.POD] = pod;
  ret[C.PAC_SGR] = pac;
  ret[C.CATEGORY] = CAT.SWEETNER;

  return ret;
}

function decompAlcoholicRow(row: any) {
  var [name, abv, sugar, other_fat, solids, salt] = [...row].map(nullIfEmpty_);

  salt = salt / 10; // ‰ -> %
  var alcohol = abv * ABV_TO_ABW_RATIO;

  var ret = [];
  ret[C.NAME] = name;
  ret[C.OTHER_FAT] = other_fat;
  ret[C.SUGAR] = sugar;
  ret[C.OTHER_SNF] = solids - other_fat;
  ret[C.OTHER_SNFS] = solids - other_fat - sugar;
  ret[C.TOTAL_SOLIDS] = solids;
  ret[C.SALT] = salt;
  ret[C.ALCOHOL] = alcohol;
  ret[C.POD] = sugar;
  ret[C.PAC_SGR] = sugar;
  ret[C.PAC_SLT] = (salt * SALT_PAC) / 100;
  ret[C.PAC_ALC] = (alcohol * ALCOHOL_PAC) / 100;
  ret[C.CATEGORY] = CAT.ALCOHOL;

  return ret;
}

function decompChocolatesRow(row: any) {
  var [name, cacao_fat, sugar, water] = [...row].map(nullIfEmpty_);

  var solids = 100 - water;
  var cocoa_solids = solids - cacao_fat - sugar;

  var ret = [];
  ret[C.NAME] = name;
  ret[C.CACAO_FAT] = cacao_fat;
  ret[C.SUGAR] = sugar;
  ret[C.COCOA_SNF] = solids - cacao_fat;
  ret[C.COCOA_SNFS] = solids - cacao_fat - sugar;
  ret[C.TOTAL_SOLIDS] = solids;
  ret[C.POD] = sugar;
  ret[C.PAC_SGR] = sugar;
  ret[C.HF] = cacao_fat * CACAO_FAT_HF + cocoa_solids * COCOA_SOLIDS_HF;
  ret[C.CATEGORY] = CAT.CHOCOLATE;

  return ret;
}

function decompNutsRow(row: any) {
  var [name, nut_fat, sugar, water] = [...row].map(nullIfEmpty_);

  var solids = 100 - water;

  var ret = [];
  ret[C.NAME] = name;
  ret[C.NUT_FAT] = nut_fat;
  ret[C.SUGAR] = sugar;
  ret[C.NUT_SNF] = solids - nut_fat;
  ret[C.NUT_SNFS] = solids - nut_fat - sugar;
  ret[C.TOTAL_SOLIDS] = solids;
  ret[C.POD] = sugar;
  ret[C.PAC_SGR] = sugar;
  ret[C.HF] = nut_fat * NUT_FAT_HF;
  ret[C.CATEGORY] = CAT.NUT;

  return ret;
}

function decompFruitsAndVeggiesRow(row: any) {
  var [name, water, sucrose, glucose, fructose, other_fat] = [...row].map(nullIfEmpty_);

  var sugar = sucrose + glucose + fructose;
  var solids = 100 - water;

  var ret = [];
  ret[C.NAME] = name;
  ret[C.OTHER_FAT] = other_fat;
  ret[C.SUGAR] = sugar;
  ret[C.OTHER_SNF] = solids - other_fat;
  ret[C.OTHER_SNFS] = solids - other_fat - sugar;
  ret[C.TOTAL_SOLIDS] = solids;
  ret[C.POD] = (SUCROSE_POD * sucrose + GLUCOSE_POD * glucose + FRUCTOSE_POD * fructose) / 100;
  ret[C.PAC_SGR] = (SUCROSE_PAC * sucrose + GLUCOSE_PAC * glucose + FRUCTOSE_PAC * fructose) / 100;
  ret[C.CATEGORY] = CAT.FRUIT;
  ret[C.EXTENSION] = JSON.stringify(row);

  return ret;
}

function decompEggsRow(row: any) {
  var [name, egg_fat, solids, lecithin] = [...row].map(nullIfEmpty_);

  var ret = [];
  ret[C.NAME] = name;
  ret[C.EGG_FAT] = egg_fat;
  ret[C.EGG_SNF] = solids - egg_fat;
  ret[C.EGG_SNFS] = solids - egg_fat;
  ret[C.TOTAL_SOLIDS] = solids;
  ret[C.EMULSIFIERS] = lecithin;
  ret[C.CATEGORY] = CAT.EGG;

  return ret;
}

function decompEmulsifiersAndStabilizersRow(row: any) {
  var [name, emulsifiers, stabilizers, solids] = [...row].map(nullIfEmpty_);

  var ret = [];
  ret[C.NAME] = name;
  ret[C.OTHER_SNF] = solids;
  ret[C.OTHER_SNFS] = solids;
  ret[C.TOTAL_SOLIDS] = solids;
  ret[C.EMULSIFIERS] = emulsifiers;
  ret[C.STABILIZERS] = stabilizers;
  ret[C.CATEGORY] = CAT.EMULSIFIER_STABILIZER;

  return ret;
}

function decompMiscellaneousRow(row: any) {
  var [
    name,
    milk_fat,
    other_fat,
    msnf,
    sugar,
    solids,
    salt,
    abv,
    emulsifiers,
    stabilizers,
    pod,
    pac_sgr,
    hf,
  ] = [...row].map((v) => defaultIfEmpty_(v, null));

  salt = salt / 10; // ‰ -> %
  var alcohol = abv * ABV_TO_ABW_RATIO;
  var lactose = msnf * STANDARD_LACTOSE_IN_MSNF;

  var ret = [];
  ret[C.NAME] = name;
  ret[C.MILK_FAT] = milk_fat;
  ret[C.OTHER_FAT] = other_fat;
  ret[C.LACTOSE] = lactose;
  ret[C.SUGAR] = sugar;
  ret[C.MILK_SNF] = msnf;
  ret[C.MILK_SNFS] = msnf - lactose;
  ret[C.OTHER_SNF] = solids - milk_fat - other_fat - msnf;
  ret[C.OTHER_SNFS] = ret[C.OTHER_SNF] - sugar;
  ret[C.TOTAL_SOLIDS] = solids;
  ret[C.SALT] = salt;
  ret[C.ALCOHOL] = alcohol;
  ret[C.EMULSIFIERS] = emulsifiers;
  ret[C.STABILIZERS] = stabilizers;
  ret[C.POD] = pod + lactose * (LACTOSE_POD / 100);
  ret[C.PAC_SGR] = pac_sgr + lactose * (LACTOSE_PAC / 100);
  ret[C.PAC_SLT] = salt * (SALT_PAC / 100);
  ret[C.PAC_ALC] = alcohol * (ALCOHOL_PAC / 100);
  ret[C.HF] = hf;
  ret[C.CATEGORY] = CAT.MISCELLANEOUS;

  return ret;
}

function expandDairyRange(range: any) {
  return expandRange_(range, decompDairyRow);
}
function expandSweetnersRange(range: any) {
  return expandRange_(range, decompSweetnersRow);
}
function expandAlcoholicRange(range: any) {
  return expandRange_(range, decompAlcoholicRow);
}
function expandChocolatesRange(range: any) {
  return expandRange_(range, decompChocolatesRow);
}
function expandNutsRange(range: any) {
  return expandRange_(range, decompNutsRow);
}
function expandFruitsAndVeggiesRange(range: any) {
  return expandRange_(range, decompFruitsAndVeggiesRow);
}
function expandEggsRange(range: any) {
  return expandRange_(range, decompEggsRow);
}
function expandEmulsifiersAndStabilizersRange(range: any) {
  return expandRange_(range, decompEmulsifiersAndStabilizersRow);
}
function expandMiscellaneousRange(range: any) {
  return expandRange_(range, decompMiscellaneousRow);
}

function expandIngredients(
  dairy: any,
  sweetners: any,
  alcoholic: any,
  chocolates: any,
  nuts: any,
  fruitsAndVeggies: any,
  eggs: any,
  emulsifiersAndStabilizers: any,
  miscellaneous: any
) {
  return []
    .concat(
      expandDairyRange(dairy),
      expandSweetnersRange(sweetners),
      expandAlcoholicRange(alcoholic),
      expandChocolatesRange(chocolates),
      expandNutsRange(nuts),
      expandFruitsAndVeggiesRange(fruitsAndVeggies),
      expandEggsRange(eggs),
      expandEmulsifiersAndStabilizersRange(emulsifiersAndStabilizers),
      expandMiscellaneousRange(miscellaneous)
    )
    .sort(ingredientCompare_);
}

function findIngredient(name: string, ingredients: any) {
  return binaryFindIngredient_(name, ingredients);
}

function isKnownIngredient(name: string, ingredients: any) {
  return !isEmpty_(findIngredient(name, ingredients));
}

function isUnknownIngredient(name: string, ingredients: any) {
  return !isKnownIngredient(name, ingredients);
}

function getFpdFromPacInterpolation(pac: any) {
  if (pac < 0) {
    return null;
  }

  var floor_pac = Math.floor(pac / 3) * 3;
  var ceil_pac = Math.ceil(pac / 3) * 3;

  var get_idx_floor_pac = () => {
    if (ceil_pac <= PAC_FPD_TABLE_MAX_PAC) {
      return floor_pac;
    } else {
      return PAC_FPD_TABLE_MAX_PAC - 3;
    }
  };
  var get_idx_ceil_pac = () => {
    if (ceil_pac <= PAC_FPD_TABLE_MAX_PAC) {
      return ceil_pac;
    } else {
      return PAC_FPD_TABLE_MAX_PAC;
    }
  };

  var floor_fpd = PAC_FPD_TABLE[get_idx_floor_pac()];
  var ceil_fpd = PAC_FPD_TABLE[get_idx_ceil_pac()];

  var run = pac - get_idx_floor_pac();
  var slope = (ceil_fpd - floor_fpd) / 3;
  return floor_fpd + slope * run;
}

function getFpdFromPacPolynomial(pac: any) {
  if (pac < 0) {
    return null;
  }

  return FPD_POLYNOMIAL_FACTORS.reduce((fpd, coeff, deg) => fpd + coeff * pac ** deg, 0);
}

function getFpdFromPacSpline(pac: any) {
  return pac <= PAC_FPD_TABLE_MAX_PAC
    ? getFpdFromPacInterpolation(pac)
    : getFpdFromPacPolynomial(pac);
}

function computeFpd(
  msnf: any,
  solids: any,
  alcohol: any,
  pac_sgr: any,
  pac_slt: any,
  pac_alc: any,
  hf: any,
  frozen_water: any,
  getFpdFromPac = getFpdFromPacInterpolation
) {
  [alcohol, pac_sgr, pac_slt, pac_alc, hf] = [alcohol, pac_sgr, pac_slt, pac_alc, hf].map((val) =>
    defaultIfEmpty_(val, 0)
  );

  var water = (100 - solids - alcohol) * ((100 - frozen_water) / 100);
  var fpd_pac = getFpdFromPac(((pac_sgr + pac_slt + pac_alc - hf) * 100) / water);
  var fpd_slt = (msnf * FPD_MSNF_FACTOR_FOR_CELSIUS) / water;
  return fpd_pac == null ? 0 : -(fpd_pac + fpd_slt);
  //return -(fpd_pac + fpd_slt);
}

function computeFpdAndHfAvg(
  msnf: any,
  solids: any,
  alcohol: any,
  pac_sgr: any,
  pac_slt: any,
  pac_alc: any,
  hf: any,
  frozen_water: any
) {
  return (
    (computeFpd(msnf, solids, alcohol, pac_sgr, pac_slt, pac_alc, 0, frozen_water) +
      computeFpd(msnf, solids, alcohol, pac_sgr, pac_slt, pac_alc, hf, frozen_water)) /
    2
  );
}

function computeHardnessAtTemp(
  msnf: any,
  solids: any,
  alcohol: any,
  pac_sgr: any,
  pac_slt: any,
  pac_alc: any,
  hf: any,
  temp: any
) {
  const fpd_properties: [any, any, any, any, any, any, any] = [
    msnf,
    solids,
    alcohol,
    pac_sgr,
    pac_slt,
    pac_alc,
    hf,
  ];

  const computeTemp = (fw: any) => computeFpdAndHfAvg(...fpd_properties, fw);

  var [low_fw, high_fw] = [0, 100 - HARDNESS_AT_TEMP_STEP_PRECISION];

  var [high_temp, low_temp] = [low_fw, high_fw].map((fw) => computeTemp(fw));

  if (temp > high_temp) {
    return 0;
  } else if (temp < low_temp) {
    return 100;
  }

  while (high_fw - low_fw > HARDNESS_AT_TEMP_STEP_PRECISION) {
    const mid_fw = (low_fw + high_fw) / 2;
    const mid_temp = computeTemp(mid_fw);

    if (temp > mid_temp) {
      high_fw = mid_fw;
    } else if (temp < mid_temp) {
      low_fw = mid_fw;
    }
  }

  [high_temp, low_temp] = [low_fw, high_fw].map((fw) => computeTemp(fw));

  var slope = (high_fw - low_fw) / (low_temp - high_temp);
  return low_fw + slope * (temp - high_temp);
}

function processParametricIngredient(ingredient: any, param: any, val: any) {
  if (param == "Brix") {
    if (ingredient[C.CATEGORY] != CAT.FRUIT || isEmpty_(ingredient[C.EXTENSION])) {
      return ERROR_INVALID_PARAMETER;
    }

    const fruit_row = JSON.parse(ingredient[C.EXTENSION]);
    const new_brix_fruit_row = computeNewBrixFruitFromReference(fruit_row, val);

    return flattenToRow_(decompFruitsAndVeggiesRow(new_brix_fruit_row), Composition).slice(0, -1);
  } else {
    return ERROR_INVALID_PARAMETER;
  }
}

function processIngredient(name: any, ingredients: any) {
  var [name, param, val] = [name, null, null];

  if (name.includes(PARAMETRIC_OPEN_CHARACTER)) {
    var params = getIngredientParameters_(name);
    if (isError_(params)) {
      return params;
    }

    [name, param, val] = [...params];
  }

  var ingredient = findIngredient(name, ingredients);
  if (isEmpty_(ingredient)) {
    return ERROR_UNKNOWN_INGREDIENT;
  }

  return isEmpty_(param) ? ingredient : processParametricIngredient(ingredient, param, val);
}

function processRecipe(recipe: any, ingredients: any) {
  return recipe.map(([name, quantity]: [any, any]) => [
    [name, quantity],
    isEmpty_(name) ? [] : processIngredient(name, ingredients),
  ]);
}

function computeIngredientQuantities(quantity: any, ingredient: any) {
  return Object.values(Composition)
    .filter((key) => isCompositionQuantField_(key))
    .map((key) => (isEmpty_(ingredient[key]) ? null : (ingredient[key] * quantity) / 100));
}

function computeRecipeQuantities(processed_recipe: any) {
  return processed_recipe.map(([[name, quantity], ingredient]: [[any, any], any]) => {
    if (isError_(ingredient)) {
      return ingredient;
    } else if (isEmpty_(name) || isEmpty_(quantity)) {
      return [];
    }

    return computeIngredientQuantities(quantity, ingredient);
  });
}

function computeTotalsFromQuantities(quantities: any) {
  var totals = new Array(COMPOSITION_QUANT_FIELDS_COUNT).fill(0);

  const key_offset = COMPOSITION_QUANT_FIELDS_SLICE[0];

  quantities.forEach((row: any) => {
    if (!isError_(row) && row.length > 0) {
      Object.values(Composition)
        .filter((key) => isCompositionQuantField_(key))
        .forEach((key) => (totals[key - key_offset] += row[key - key_offset]));
    }
  });

  return totals;
}

function computeRecipeQuantityTotals(processed_recipe: any) {
  return computeTotalsFromQuantities(computeRecipeQuantities(processed_recipe));
}

function computeMixTotal(processed_recipe: any) {
  return processed_recipe.reduce(
    (total: any, [[name, quant], ingredient]: [[any, any], any]) =>
      isEmpty_(name) || isEmpty_(quant) || isEmpty_(ingredient) || isError_(ingredient)
        ? total
        : total + quant,
    0
  );
}

function computeRecipeProperties(recipe: any, ingredients: any) {
  const processed_recipe = processRecipe(recipe, ingredients);
  const totals: any[] = ["name"].concat(computeRecipeQuantityTotals(processed_recipe));
  const mix_total = computeMixTotal(processed_recipe);

  const possible_error = processed_recipe.reduce(
    (first_error: any, [_, ingredient]: [any, any]) =>
      isError_(first_error) || !isError_(ingredient) ? first_error : ingredient,
    null
  );

  var properties = new Array(Object.values(Property).length).fill([]);
  properties[P.MIX_TOTAL] = mix_total;
  properties[P.ERROR] = possible_error;

  if (mix_total == 0) {
    properties.forEach((property, idx) => {
      if (idx != P.MIX_TOTAL && idx != P.ERROR) {
        property[QUANT] = null;
        property[PRCNT] = null;
      }
    });

    return properties;
  }

  const percent = (quant: any) => (quant * 100) / mix_total;
  const quant_percent = (quant: any) => [quant, percent(quant)];
  const single_val = (val: any) => [null, val];
  const set_p_from_c = (p: any, c: any) => (properties[p] = quant_percent(totals[c]));
  const sum_totals = (cs: any[]) => cs.reduce((sum: any, c: any) => sum + totals[c], 0);

  const total_fat = sum_totals([C.MILK_FAT, C.EGG_FAT, C.CACAO_FAT, C.NUT_FAT, C.OTHER_FAT]);
  const total_snf = sum_totals([C.MILK_SNF, C.EGG_SNF, C.COCOA_SNF, C.NUT_SNF, C.OTHER_SNF]);
  const total_snfs = sum_totals([C.MILK_SNFS, C.EGG_SNFS, C.COCOA_SNFS, C.NUT_SNFS, C.OTHER_SNFS]);
  const water = mix_total - totals[C.TOTAL_SOLIDS] - totals[C.ALCOHOL];

  const abv = percent(totals[C.ALCOHOL]) / ABV_TO_ABW_RATIO;

  const emuls_per_fat = total_fat > 0 ? (totals[C.EMULSIFIERS] / total_fat) * 100 : null;
  const stabs_per_water = (totals[C.STABILIZERS] / water) * 100;

  const pac_tot = totals[C.PAC_SGR] + totals[C.PAC_SLT] + totals[C.PAC_ALC];
  const abs_pac = (pac_tot / water) * 100;

  const fpd_properties = [
    C.MILK_SNF,
    C.TOTAL_SOLIDS,
    C.ALCOHOL,
    C.PAC_SGR,
    C.PAC_SLT,
    C.PAC_ALC,
  ].map((c) => percent(totals[c]));

  const hf_p = percent(totals[C.HF]);

  const fpd = (<any>computeFpd)(...fpd_properties, 0, 0);
  const serving_temp = (<any>computeFpdAndHfAvg)(...fpd_properties, hf_p, SERVING_TEMP_X_AXIS);
  const hardness_at_14 = (<any>computeHardnessAtTemp)(...fpd_properties, hf_p, -14);

  [
    [P.MILK_FAT, C.MILK_FAT],
    [P.EGG_FAT, C.EGG_FAT],
    [P.CACAO_FAT, C.CACAO_FAT],
    [P.NUT_FAT, C.NUT_FAT],
    [P.OTHER_FAT, C.OTHER_FAT],

    [P.MILK_SNF, C.MILK_SNF],
    [P.EGG_SNF, C.EGG_SNF],
    [P.COCOA_SNF, C.COCOA_SNF],
    [P.NUT_SNF, C.NUT_SNF],
    [P.OTHER_SNF, C.OTHER_SNF],

    [P.MILK_SNFS, C.MILK_SNFS],
    [P.EGG_SNFS, C.EGG_SNFS],
    [P.COCOA_SNFS, C.COCOA_SNFS],
    [P.NUT_SNFS, C.NUT_SNFS],
    [P.OTHER_SNFS, C.OTHER_SNFS],

    [P.LACTOSE, C.LACTOSE],
    [P.SUGAR, C.SUGAR],
    [P.TOTAL_SOLIDS, C.TOTAL_SOLIDS],
    [P.SALT, C.SALT],
    [P.ALCOHOL, C.ALCOHOL],
    [P.EMULSIFIERS, C.EMULSIFIERS],
    [P.STABILIZERS, C.STABILIZERS],
    [P.POD, C.POD],
    [P.PAC_SGR, C.PAC_SGR],
    [P.PAC_SLT, C.PAC_SLT],
    [P.PAC_ALC, C.PAC_ALC],
    [P.HF, C.HF],
  ].forEach(([p, c]) => set_p_from_c(p, c));

  [
    [P.TOTAL_FAT, total_fat],
    [P.TOTAL_SNF, total_snf],
    [P.TOTAL_SNFS, total_snfs],
    [P.WATER, water],
    [P.PAC_TOT, pac_tot],
  ].forEach(([p, quant]) => (properties[p] = quant_percent(quant)));

  [
    [P.ABV, abv],
    [P.EMULS_PER_FAT, emuls_per_fat],
    [P.STABS_PER_WATER, stabs_per_water],
    [P.ABS_PAC, abs_pac],
    [P.FPD, fpd],
    [P.SERVING_TEMP, serving_temp],
    [P.HARDNESS_AT_14, hardness_at_14],
  ].forEach(([p, val]: any[]) => (properties[p] = single_val(val)));

  return properties;
}

function computeFpdCurves(recipe: any, ingredients: any) {
  const processed_recipe = processRecipe(recipe, ingredients);
  const totals = ["name"].concat(computeRecipeQuantityTotals(processed_recipe));
  const mix_total = computeMixTotal(processed_recipe);

  if (mix_total == 0) {
    return [];
  }

  // [Hardness, Frozen Water, HF]
  var curves = [];

  const percent = (quant: any) => (quant * 100) / mix_total;

  const fpd_properties = [
    C.MILK_SNF,
    C.TOTAL_SOLIDS,
    C.ALCOHOL,
    C.PAC_SGR,
    C.PAC_SLT,
    C.PAC_ALC,
  ].map((c) => percent(totals[c]));
  const hf = percent(totals[C.HF]);

  for (var x_axis = 0; x_axis < 100; x_axis += FPD_CURVE_STEPS) {
    var frozen_water = (<any>computeFpd)(...fpd_properties, 0, x_axis);
    var hf_curve = (<any>computeFpd)(...fpd_properties, hf, x_axis);
    var hardness = (frozen_water + hf_curve) / 2;
    curves.push([hardness, frozen_water, hf_curve]);
  }

  return curves;
}

function computeNewBrixFruitFromReference(reference: any, new_brix: any) {
  const [name, water, sucrose, glucose, fructorse, fat] = [...reference].map(nullIfEmpty_);

  const old_brix = sucrose + glucose + fructorse;
  const non_sugar_solids = 100 - water - old_brix;

  const new_name = name + " [Brix " + new_brix + "]";
  const new_water = 100 - non_sugar_solids - new_brix;
  const new_sucrose = nullIfEmpty_((sucrose / old_brix) * new_brix);
  const new_glucose = nullIfEmpty_((glucose / old_brix) * new_brix);
  const new_fructose = nullIfEmpty_((fructorse / old_brix) * new_brix);

  if (isEmpty_(new_brix)) {
    return [];
  } else if (new_brix < 0 || new_brix > 100 - non_sugar_solids) {
    return ERROR_INVALID_ARGUMENT;
  } else return [new_name, new_water, new_sucrose, new_glucose, new_fructose, fat];
}

function computeNewBrixFruits(ref_name: any, new_brixes: any, fruits: any): any[] | any {
  const reference = linearFindIngredient_(ref_name, fruits);

  if (isEmpty_(ref_name)) {
    return [];
  } else if (isEmpty_(reference)) {
    return ERROR_UNKNOWN_INGREDIENT;
  }

  return [reference].concat(
    new_brixes.map((new_brix: any) => computeNewBrixFruitFromReference(reference, new_brix))
  );
}

function processMedleyRecipe(recipe: any, fruits: any) {
  const findFruitOrError = (name: any) => {
    const found_fruit = linearFindIngredient_(name, fruits);
    return isEmpty_(found_fruit) ? ERROR_UNKNOWN_INGREDIENT : found_fruit;
  };

  return recipe.map(([ratio, name]: [any, any]) => [
    [ratio, name],
    isEmpty_(name) ? [] : findFruitOrError(name),
  ]);
}

function computeFruitMedley(recipe: any, fruits: any) {
  const processed_recipe = processMedleyRecipe(recipe, fruits);
  const total_ratio = recipe.reduce(
    (total: any, [ratio, _]: [any, any]) => (isEmpty_(ratio) ? total : total + ratio),
    0
  );

  const possible_error = processed_recipe.reduce(
    (first_error: any, [_, fruit]: [any, any]) =>
      isError_(first_error) || !isError_(fruit) ? first_error : fruit,
    null
  );

  var medley_quants = new Array(5).fill(null);

  processed_recipe
    .filter(([[_], fruit]: [[any], any]) => !isEmpty_(fruit) && !isError_(fruit))
    .forEach(([[ratio, _], fruit]: [[any, any], any]) =>
      fruit
        .slice(1)
        .forEach((quant: any, idx: any) => (medley_quants[idx] += (quant * ratio) / total_ratio))
    );

  return [isError_(possible_error) ? possible_error : medley_quants].concat(
    processed_recipe.map(([[_], quants_or_err]: [[any], any]) =>
      isError_(quants_or_err) ? quants_or_err : quants_or_err.slice(1)
    )
  );
}

/// --------------- Display Constants/Functions ---------------
/// ===========================================================

const COMPOSITION_NAMES_ = decompFromList_([
  [C.NAME, "Name"],
  [C.MILK_FAT, "Milk Fat"],
  [C.EGG_FAT, "Egg Fat"],
  [C.CACAO_FAT, "Cacao Fat"],
  [C.NUT_FAT, "Nut Fat"],
  [C.OTHER_FAT, "Other Fat"],
  [C.LACTOSE, "Lactose"],
  [C.SUGAR, "Sugar"],
  [C.MILK_SNF, "MSNF"],
  [C.EGG_SNF, "Egg SNF"],
  [C.COCOA_SNF, "Cocoa SNF"],
  [C.NUT_SNF, "Nut SNF"],
  [C.OTHER_SNF, "Other SNF"],
  [C.MILK_SNFS, "MSNFS"],
  [C.EGG_SNFS, "Egg SNFS"],
  [C.COCOA_SNFS, "Cocoa SNFS"],
  [C.NUT_SNFS, "Nut SNFS"],
  [C.OTHER_SNFS, "Other SNFS"],
  [C.TOTAL_SOLIDS, "Solids"],
  [C.SALT, "Salt"],
  [C.ALCOHOL, "Alcohol"],
  [C.EMULSIFIERS, "Emulsifiers"],
  [C.STABILIZERS, "Stabilizers"],
  [C.POD, "POD"],
  [C.PAC_SGR, "PACsgr"],
  [C.PAC_SLT, "PACslt"],
  [C.PAC_ALC, "PACalc"],
  [C.HF, "HF"],
  [C.CATEGORY, "Category"],
  [C.EXTENSION, "Extension"],
]);

const PROPERTY_NAMES_ = decompFromList_([
  [P.MIX_TOTAL, "Mix Total"],
  [P.MILK_FAT, "Milk Fat"],
  [P.EGG_FAT, "Egg Fat"],
  [P.CACAO_FAT, "Cacao Fat"],
  [P.NUT_FAT, "Nut Fat"],
  [P.OTHER_FAT, "Other Fat"],
  [P.TOTAL_FAT, "Total Fat"],
  [P.LACTOSE, "Lactose"],
  [P.SUGAR, "Sugar"],
  [P.MILK_SNF, "MSNF"],
  [P.EGG_SNF, "Egg SNF"],
  [P.COCOA_SNF, "Cocoa SNF"],
  [P.NUT_SNF, "Nut SNF"],
  [P.OTHER_SNF, "Other SNF"],
  [P.TOTAL_SNF, "TSNF"],
  [P.MILK_SNFS, "MSNFS"],
  [P.EGG_SNFS, "Egg SNFS"],
  [P.COCOA_SNFS, "Cocoa SNFS"],
  [P.NUT_SNFS, "Nut SNFS"],
  [P.OTHER_SNFS, "Other SNFS"],
  [P.TOTAL_SNFS, "TSNFS"],
  [P.TOTAL_SOLIDS, "Solids"],
  [P.WATER, "Water"],
  [P.SALT, "Salt"],
  [P.ALCOHOL, "Alcohol"],
  [P.EMULSIFIERS, "Emulsifiers"],
  [P.STABILIZERS, "Stabilizers"],
  [P.ABV, "ABV"],
  [P.EMULS_PER_FAT, "Emul./Fat"],
  [P.STABS_PER_WATER, "Stab./Water"],
  [P.POD, "POD"],
  [P.PAC_SGR, "PACsgr"],
  [P.PAC_SLT, "PACslt"],
  [P.PAC_ALC, "PACalc"],
  [P.PAC_TOT, "PAC"],
  [P.ABS_PAC, "Abs.PAC"],
  [P.HF, "HF"],
  [P.FPD, "FPD"],
  [P.SERVING_TEMP, "Serving Temp"],
  [P.HARDNESS_AT_14, "Hardness @ -14°C"],
  [P.ERROR, "ERROR"],
]);

function computeAndDisplayQuantitiesFull(recipe: any, ingredients: any) {
  const processed_recipe = processRecipe(recipe, ingredients);
  var quantities = computeRecipeQuantities(processed_recipe);
  const totals = computeTotalsFromQuantities(quantities);
  const header = Object.values(Composition)
    .map((c) => COMPOSITION_NAMES_[c])
    .slice(...COMPOSITION_QUANT_FIELDS_SLICE);

  quantities.forEach((row: any, index: any) => {
    if (isError_(row)) {
      quantities[index] = ["ERROR"];
    }
  });

  return [header].concat([totals]).concat(quantities);
}

function computeAndDisplayPropertiesSummary(recipe: any, ingredients: any) {
  const properties = computeRecipeProperties(recipe, ingredients);

  const quantRows = (ps: any) =>
    ps.map((p: any) => [properties[p][QUANT], PROPERTY_NAMES_[p], properties[p][PRCNT]]);
  const prcntRows = (ps: any) =>
    ps.map((p: any) => [null, PROPERTY_NAMES_[p], properties[p][PRCNT]]);

  return [
    ["Qty (g)", properties[P.ERROR], "Qty (%)"],
    [properties[P.MIX_TOTAL], "Mix Total", null],
  ]
    .concat(
      quantRows([
        P.MILK_FAT,
        P.TOTAL_FAT,
        P.MILK_SNF,
        P.TOTAL_SNF,
        P.EGG_SNFS,
        P.COCOA_SNFS,
        P.NUT_SNFS,
        P.TOTAL_SOLIDS,
        P.WATER,
        P.LACTOSE,
        P.SUGAR,
        P.SALT,
      ])
    )
    .concat(
      prcntRows([
        P.ABV,
        P.EMULS_PER_FAT,
        P.STABS_PER_WATER,
        P.POD,
        P.HF,
        P.PAC_TOT,
        P.ABS_PAC,
        P.FPD,
        P.SERVING_TEMP,
        P.HARDNESS_AT_14,
      ])
    );
}

function computeAndDisplayPropertiesComposition(recipe: any, ingredients: any) {
  const properties = computeRecipeProperties(recipe, ingredients);

  const quantRows = (ps: any) =>
    ps.map((p: any) => [properties[p][QUANT], PROPERTY_NAMES_[p], properties[p][PRCNT]]);

  return [["Qty (g)", null, "Qty (%)"]].concat(
    quantRows([
      P.MILK_FAT,
      P.MILK_SNF,
      P.MILK_SNFS,
      P.EGG_FAT,
      P.EGG_SNF,
      P.EGG_SNFS,
      P.CACAO_FAT,
      P.COCOA_SNF,
      P.COCOA_SNFS,
      P.NUT_FAT,
      P.NUT_SNF,
      P.NUT_SNFS,
      P.OTHER_FAT,
      P.OTHER_SNF,
      P.OTHER_SNFS,
      P.TOTAL_SNF,
      P.TOTAL_SNFS,
      P.ALCOHOL,
      P.EMULSIFIERS,
      P.STABILIZERS,
      P.PAC_SGR,
      P.PAC_SLT,
      P.PAC_ALC,
    ])
  );
}

function computeAndDisplayFpdCurves(recipe: any, ingredients: any) {
  const curves = computeFpdCurves(recipe, ingredients);

  var range: any[] = [["Hardness", null, "Frozen Water", "HF"]];

  if (curves.length == 0) {
    // These dummy values ensure that the FPD Curve plot has the right color for the
    // reference (orange) line if there is no main recipe (blue), by still containing
    // values but not displaying them - otherwise the reference lines becomes blue.
    return range.concat([[100, 100, 100, 100]]);
  }

  for (var idx = 0; idx < 100 / FPD_CURVE_STEPS; idx++) {
    range.push([
      curves[idx][0],
      idx == SERVING_TEMP_X_AXIS / FPD_CURVE_STEPS ? curves[idx][0] : null,
      curves[idx][1],
      curves[idx][2],
    ]);
  }

  return range;
}

function computeAndDisplayNewBrixFruits(ref_name: any, new_brixes: any, fruits: any) {
  const new_fruits = computeNewBrixFruits(
    ref_name,
    new_brixes.map((row: any) => row[0]),
    fruits
  );

  if (isError_(new_fruits)) {
    return [new_fruits];
  } else {
    return new_fruits.map((row_or_err: any) => (isError_(row_or_err) ? [row_or_err] : row_or_err));
  }
}

function computeAndDisplayFruitMedley(ratios_and_fruits: any, fruits: any) {
  return computeFruitMedley(ratios_and_fruits, fruits).map((row_or_err) =>
    isError_(row_or_err) ? [row_or_err] : row_or_err
  );
}

/// --------------- Helper Functions ---------------
/// ================================================

function isEmpty_(val: any) {
  return val == "" || val == null || val == undefined;
}

function isString_(val: any) {
  return typeof val === "string" || val instanceof String;
}

function isFloat_(val: any) {
  return !Number.isInteger(val) && Number.isFinite(val);
}

function isArray_(val: any) {
  return Array.isArray(val);
}

function isError_(val: any) {
  return ERRORS.some((v) => v === val);
}

function isCompositionQuantField_(val: any) {
  return !COMPOSITION_NON_QUANT_FIELDS.some((v) => v === val);
}

function defaultIfEmpty_(val: any, dflt: any) {
  return isEmpty_(val) ? dflt : val;
}

function nullIfEmpty_(val: any) {
  return defaultIfEmpty_(val, null);
}

function flattenToRow_(dict: any, key_t: any) {
  return Object.values(key_t).map((key: any) => defaultIfEmpty_(dict[key], null));
}

function flattenListToRow_(list: any, key_t: any) {
  var dict: any[] = [];
  list.forEach(([key, value]: [any, any]) => (dict[key] = value));
  return flattenToRow_(dict, key_t);
}

function flattenToColum_(dict: any, key_t: any) {
  return flattenToRow_(dict, key_t).map((elem) => [elem]);
}

function decompFromRow_(row: any, key_t: any) {
  var arr: any[] = [];
  Object.values(key_t)
    .filter((key: any) => !isEmpty_(row[key]))
    .forEach((key: any, _) => (arr[key] = row[key]));
  return arr;
}

function decompFromColumn_(column: any, key_t: any) {
  return decompFromRow_(
    column.map((elem: any) => elem[0]),
    key_t
  );
}

function decompFromList_(list: any) {
  var dict: any[] = [];
  list.forEach(([key, val]: [any, any]) => (dict[key] = val));
  return dict;
}

function expandRange_(range: any, decompFn: any) {
  return range
    .filter((row: any) => !isEmpty_(row[0]))
    .map((row: any) => flattenToRow_(decompFn(row), Composition));
}

function ingredientCompare_(a: any, b: any) {
  return a[0].localeCompare(b[0]);
}

function binaryFindIngredient_(name: any, ingredients: any) {
  if (isEmpty_(name) || !isString_(name)) {
    return undefined;
  }

  let start = 0,
    end = ingredients.length - 1;

  while (start <= end) {
    let mid = Math.floor((start + end) / 2);

    let current: string = ingredients[mid][0];

    if (current == name) {
      return ingredients[mid];
    } else if (isEmpty_(current) || !isString_(current)) {
      end = mid - 1;
    } else if (name.localeCompare(current) > 0) {
      start = mid + 1;
    } else {
      end = mid - 1;
    }
  }

  return undefined;
}

function linearFindIngredient_(name: any, ingredients: any) {
  return isEmpty_(name) || !isString_(name)
    ? undefined
    : ingredients.find((row: any) => row[0] == name);
}

function getIngredientParameters_(name: any) {
  if (!PARAMETRIC_REGEX.test(name)) {
    return ERROR_INVALID_PARAMETER;
  }

  var match = name.match(PARAMETRIC_REGEX);
  return [match[1], match[3], Number(match[4])];
}

/// --------------- TEST Helper Functions ---------------
/// =====================================================

function floatEq_(lhs: any, rhs: any) {
  const sig_fig = 6;
  const mult = 10 * sig_fig;

  var lhs_round = Math.round(lhs * mult);
  var rhs_round = Math.round(rhs * mult);
  var eq = lhs_round === rhs_round;

  if (!eq) {
    console.log(`${lhs} != ${rhs}, within ${sig_fig} decimal sig. figs.`);
  }

  return eq;
}

function valEq_(lhs: any, rhs: any) {
  if (isFloat_(lhs) || isFloat_(rhs)) {
    return floatEq_(lhs, rhs);
  } else {
    var eq = lhs === rhs;

    if (!eq) {
      console.log(`${lhs} != ${rhs}`);
    }

    return eq;
  }
}

function arrEq_(lhs: any, rhs: any): any {
  var eq = true;

  if (lhs.length != rhs.length) {
    console.log(`lhs.length(${lhs.length}) != rhs.length(${rhs.length})`);
    eq = false;
  } else {
    for (var i = 0; i < lhs.length; i++) {
      eq = eq && anyEq_(lhs[i], rhs[i]);
    }
  }

  if (!eq) {
    console.log(`${JSON.stringify(lhs)} != ${JSON.stringify(rhs)}`);
  }
  return eq;
}

function anyEq_(lhs: any, rhs: any) {
  if (isArray_(lhs) || isArray_(rhs)) {
    if (isArray_(lhs) && isArray_(rhs)) {
      return arrEq_(lhs, rhs);
    } else {
      console.log(`Mismatch Array types: lhs ${isArray_(lhs)}, rhs ${isArray_(rhs)}`);
      console.log(`${JSON.stringify(lhs)} != ${JSON.stringify(rhs)}`);
      return false;
    }
  } else {
    return valEq_(lhs, rhs);
  }
}

function assert_(condition: any) {
  if (!condition) {
    console.log("FAIL");
  }
  return condition;
}

function assertEq_(lhs: any, rhs: any) {
  return assert_(anyEq_(lhs, rhs));
}

function didAllSucceed_(results: any) {
  return results.every((v: any) => v === true);
}

function expandCompListsIntoCompRange_(lists: any) {
  return lists.map((list: any) => flattenListToRow_(list, Composition));
}

function expandQuantListsIntoQuantRange_(lists: any) {
  return lists.map((list: any) =>
    flattenListToRow_(list, Composition).slice(...COMPOSITION_QUANT_FIELDS_SLICE)
  );
}

function expandPropListIntoPropRange_(list: any) {
  var properties = new Array(Object.values(Property).length).fill(NaN);
  list.forEach(([p, val]: [any, any]) => (properties[p] = val));
  return properties;
}

/// --------------- TEST Constants ---------------
/// ==============================================

const getFpdFromPacInterpolationExpected_ = [
  [-1, null],
  [0, 0.0],
  [3, 0.18],
  [6, 0.35],
  [93, 6.5],
  [96, 6.8],
  [177, 13.48],
  [180, 13.68],
  [0.5, 0.03],
  [1, 0.06],
  [1.5, 0.09],
  [2, 0.12],
  [2.5, 0.15],
  [93.5, 6.55],
  [94, 6.6],
  [94.5, 6.65],
  [95, 6.7],
  [95.5, 6.75],
  [177.125, 13.488333],
  [181, 13.746666],
  //[147.87, 11.26], [184.83, 14.27]
];

const getFpdFromPacPolynomialExpected_ = [
  [-1, null],
  [0, -0.172], // BAD
  [184.83, 14.465],
];

const computeFpdExpected_ = [
  // Table 6.2, Ice Cream, Goff + Hartel, 1/1000 precision added
  // msnf, solids, alcohol, pac_sgr, pac_slt, pac_alc, hf, frozen_water
  [[12, 40, 0, 22.18, 0, 0, 0, 0], -2.745],
  [[12, 40, 0, 22.18, 0, 0, 0, 10], -3.065],
  [[12, 40, 0, 22.18, 0, 0, 0, 20], -3.457],
  [[12, 40, 0, 22.18, 0, 0, 0, 30], -4.01],
  [[12, 40, 0, 22.18, 0, 0, 0, 40], -4.774],
  [[12, 40, 0, 22.18, 0, 0, 0, 50], -5.866],
  [[12, 40, 0, 22.18, 0, 0, 0, 60], -7.633],
  [[12, 40, 0, 22.18, 0, 0, 0, 70], -10.789],
  [[12, 40, 0, 22.18, 0, 0, 0, 80], -16.372], // BAD, ref is -16.61

  // Additional rows interpolated from Table 6.2
  [[12, 40, 0, 22.18, 0, 0, 0, 65], -8.964],
  [[12, 40, 0, 22.18, 0, 0, 0, 75], -13.15],
  [[12, 40, 0, 22.18, 0, 0, 0, 85], -21.27],
  [[12, 40, 0, 22.18, 0, 0, 0, 90], -31.064],

  // Check odd behavior if pac_slt == "" and pac_alc is a number
  [[12, 40, 0, 22.18, "", 0.1, 0, 10], -3.077],

  // Check alcohol not counted as water/solid
  [[12, 40, 2, 22.18, 0, 14.8, 0, 0], -4.649],
  [[12, 40, 2, 22.18, 0, 14.8, 0, 10], -5.226],
];

const computeHardnessAtTempExpected_ = [
  // msnf, solids, alcohol, pac_sgr, pac_slt, pac_alc, hf
  [[12, 40, 0, 22.18, 0, 0, 0], -3.065, 10],
  [[12, 40, 0, 22.18, 0, 0, 0], -3.457, 20],
  [[12, 40, 0, 22.18, 0, 0, 0], -4.01, 30],
  [[12, 40, 0, 22.18, 0, 0, 0], -4.774, 40],
  [[12, 40, 0, 22.18, 0, 0, 0], -5.866, 50],
  [[12, 40, 0, 22.18, 0, 0, 0], -7.633, 60],
  [[12, 40, 0, 22.18, 0, 0, 0], -8.964, 65],
  [[12, 40, 0, 22.18, 0, 0, 0], -10.789, 70],
  [[12, 40, 0, 22.18, 0, 0, 0], -13.15, 75],
  [[12, 40, 0, 22.18, 0, 0, 0], -16.372, 80],
  [[12, 40, 0, 22.18, 0, 0, 0], -21.27, 85],
  [[12, 40, 0, 22.18, 0, 0, 0], -31.064, 89.99], // BAD, should be 90
];

const quantityExpected_ = 200;

const dairyRange_ = [
  // ...                     fat, sugar, msnf]
  ["2% Milk", 2, 4.6, 8.6],
  ["35% Cream", 35, 3.1, 5.7],
  ["Skimmed Milk Powder", "", 52, 100],
];

const expDairyRange_ = expandCompListsIntoCompRange_([
  [
    [C.NAME, "2% Milk"],
    [C.MILK_FAT, 2],
    [C.MILK_SNF, 8.6],
    [C.MILK_SNFS, 4],
    [C.LACTOSE, 4.6],
    [C.TOTAL_SOLIDS, 10.6],
    [C.POD, 0.736],
    [C.PAC_SGR, 4.6],
    [C.CATEGORY, CAT.DAIRY],
  ],
  [
    [C.NAME, "35% Cream"],
    [C.MILK_FAT, 35],
    [C.MILK_SNF, 5.7],
    [C.MILK_SNFS, 2.6],
    [C.LACTOSE, 3.1],
    [C.TOTAL_SOLIDS, 40.7],
    [C.POD, 0.496],
    [C.PAC_SGR, 3.1],
    [C.CATEGORY, CAT.DAIRY],
  ],
  [
    [C.NAME, "Skimmed Milk Powder"],
    [C.MILK_SNF, 100],
    [C.MILK_SNFS, 48],
    [C.LACTOSE, 52],
    [C.TOTAL_SOLIDS, 100],
    [C.POD, 8.32],
    [C.PAC_SGR, 52],
    [C.CATEGORY, CAT.DAIRY],
  ],
]);

const expDairyRangeQuants_ = expandQuantListsIntoQuantRange_([
  [
    [C.MILK_FAT, 4],
    [C.MILK_SNF, 17.2],
    [C.MILK_SNFS, 8],
    [C.LACTOSE, 9.2],
    [C.TOTAL_SOLIDS, 21.2],
    [C.POD, 1.472],
    [C.PAC_SGR, 9.2],
    [],
  ],
  [
    [C.MILK_FAT, 70],
    [C.MILK_SNF, 11.4],
    [C.MILK_SNFS, 5.2],
    [C.LACTOSE, 6.2],
    [C.TOTAL_SOLIDS, 81.4],
    [C.POD, 0.992],
    [C.PAC_SGR, 6.2],
  ],
  [
    [C.MILK_SNF, 200],
    [C.MILK_SNFS, 96],
    [C.LACTOSE, 104],
    [C.TOTAL_SOLIDS, 200],
    [C.POD, 16.64],
    [C.PAC_SGR, 104],
  ],
]);

const sweetnersRange_ = [
  // ...                    pod, pac, sugar, solids]
  ["Sucrose", 100, 100, 100, 100],
  ["Dextrose", 70, 190, 95, 95],
  ["Invert Syrup", 130, 167, 82.5, 82.5],
  ["Glucose Powder DE 42", 34, 78, 38, 95],
];

const expSweetnersRange_ = expandCompListsIntoCompRange_([
  [
    [C.NAME, "Sucrose"],
    [C.OTHER_SNF, 100],
    [C.SUGAR, 100],
    [C.TOTAL_SOLIDS, 100],
    [C.POD, 100],
    [C.PAC_SGR, 100],
    [C.CATEGORY, CAT.SWEETNER],
  ],
  [
    [C.NAME, "Dextrose"],
    [C.OTHER_SNF, 95],
    [C.SUGAR, 95],
    [C.TOTAL_SOLIDS, 95],
    [C.POD, 70],
    [C.PAC_SGR, 190],
    [C.CATEGORY, CAT.SWEETNER],
  ],
  [
    [C.NAME, "Invert Syrup"],
    [C.OTHER_SNF, 82.5],
    [C.SUGAR, 82.5],
    [C.TOTAL_SOLIDS, 82.5],
    [C.POD, 130],
    [C.PAC_SGR, 167],
    [C.CATEGORY, CAT.SWEETNER],
  ],
  [
    [C.NAME, "Glucose Powder DE 42"],
    [C.OTHER_SNF, 95],
    [C.OTHER_SNFS, 57],
    [C.SUGAR, 38],
    [C.TOTAL_SOLIDS, 95],
    [C.POD, 34],
    [C.PAC_SGR, 78],
    [C.CATEGORY, CAT.SWEETNER],
  ],
]);

const alcoholicRange_ = [
  // ...                   abv, sugar, fat, solids, salt]
  ["Baileys Irish Cream", 17, 18, 13.6, 38.2, 2],
  ["Dark Rum", 40, "", "", "", ""],
];

const expAlcoholicRange_ = expandCompListsIntoCompRange_([
  [
    [C.NAME, "Baileys Irish Cream"],
    [C.OTHER_FAT, 13.6],
    [C.OTHER_SNF, 24.6],
    [C.OTHER_SNFS, 6.6],
    [C.SUGAR, 18],
    [C.TOTAL_SOLIDS, 38.2],
    [C.SALT, 0.2],
    [C.ALCOHOL, 13.413],
    [C.POD, 18],
    [C.PAC_SGR, 18],
    [C.PAC_SLT, 1.17],
    [C.PAC_ALC, 99.2562],
    [C.CATEGORY, CAT.ALCOHOL],
  ],
  [
    [C.NAME, "Dark Rum"],
    [C.ALCOHOL, 31.56],
    [C.PAC_ALC, 233.544],
    [C.CATEGORY, CAT.ALCOHOL],
  ],
]);

const chocolatesRange_ = [
  // ...                            fat, sugar, water]
  ["Hershey's Cocoa Powder", 10, 0, 3],
  ["Baker's Semi-Sweet Chocolate", 33, 47, 1],
];

const expChocolatesRange_ = expandCompListsIntoCompRange_([
  [
    [C.NAME, "Hershey's Cocoa Powder"],
    [C.CACAO_FAT, 10],
    [C.COCOA_SNF, 87],
    [C.COCOA_SNFS, 87],
    [C.TOTAL_SOLIDS, 97],
    [C.HF, 165.6],
    [C.CATEGORY, CAT.CHOCOLATE],
  ],
  [
    [C.NAME, "Baker's Semi-Sweet Chocolate"],
    [C.CACAO_FAT, 33],
    [C.COCOA_SNF, 66],
    [C.COCOA_SNFS, 19],
    [C.SUGAR, 47],
    [C.TOTAL_SOLIDS, 99],
    [C.POD, 47],
    [C.PAC_SGR, 47],
    [C.HF, 63.9],
    [C.CATEGORY, CAT.CHOCOLATE],
  ],
]);

const nutsRange_ = [
  // ...          fat, sugar, water]
  ["Almonds", 50, 4.4, 4.4],
  ["Hazelnuts", 60.8, 4.3, 5.3],
];

const expNutsRange_ = expandCompListsIntoCompRange_([
  [
    [C.NAME, "Almonds"],
    [C.NUT_FAT, 50],
    [C.NUT_SNF, 45.6],
    [C.NUT_SNFS, 41.2],
    [C.SUGAR, 4.4],
    [C.TOTAL_SOLIDS, 95.6],
    [C.POD, 4.4],
    [C.PAC_SGR, 4.4],
    [C.HF, 70],
    [C.CATEGORY, CAT.NUT],
  ],
  [
    [C.NAME, "Hazelnuts"],
    [C.NUT_FAT, 60.8],
    [C.NUT_SNF, 33.9],
    [C.NUT_SNFS, 29.6],
    [C.SUGAR, 4.3],
    [C.TOTAL_SOLIDS, 94.7],
    [C.POD, 4.3],
    [C.PAC_SGR, 4.3],
    [C.HF, 85.12],
    [C.CATEGORY, CAT.NUT],
  ],
]);

const fruitsAndVeggiesRange_: (string | number | null)[][] = [
  // ...             water, sucrose, glucose, fructose, fat]
  ["Apple", 85, 11, "", "", ""],
  ["Avacado", 68, 1, "", "", 24],
  ["Strawberry", 91, 0.47, 1.99, 2.44, 0.3],
  ["Basil", 92.1, "", 0.02, 0.02, 0.64],
  ["Passion Fruit", 72.93, 11.2, "", "", 0.7],
];

const fruitsAndVeggiesExtensions_ = [
  `["Apple",85,11,"","",""]`,
  `["Avacado",68,1,"","",24]`,
  `["Strawberry",91,0.47,1.99,2.44,0.3]`,
  `["Basil",92.1,"",0.02,0.02,0.64]`,
  `["Passion Fruit",72.93,11.2,"","",0.7]`,
];

const expFruitsAndVeggiesRange_ = expandCompListsIntoCompRange_([
  [
    [C.NAME, "Apple"],
    [C.OTHER_SNF, 15],
    [C.OTHER_SNFS, 4],
    [C.SUGAR, 11],
    [C.TOTAL_SOLIDS, 15],
    [C.POD, 11],
    [C.PAC_SGR, 11],
    [C.CATEGORY, CAT.FRUIT],
    [C.EXTENSION, fruitsAndVeggiesExtensions_[0]],
  ],
  [
    [C.NAME, "Avacado"],
    [C.OTHER_FAT, 24],
    [C.OTHER_SNF, 8],
    [C.OTHER_SNFS, 7],
    [C.SUGAR, 1],
    [C.TOTAL_SOLIDS, 32],
    [C.POD, 1],
    [C.PAC_SGR, 1],
    [C.CATEGORY, CAT.FRUIT],
    [C.EXTENSION, fruitsAndVeggiesExtensions_[1]],
  ],
  [
    [C.NAME, "Strawberry"],
    [C.OTHER_FAT, 0.3],
    [C.OTHER_SNF, 8.7],
    [C.OTHER_SNFS, 3.8],
    [C.SUGAR, 4.9],
    [C.TOTAL_SOLIDS, 9],
    [C.POD, 6.011],
    [C.PAC_SGR, 8.887],
    [C.CATEGORY, CAT.FRUIT],
    [C.EXTENSION, fruitsAndVeggiesExtensions_[2]],
  ],
  [
    [C.NAME, "Basil"],
    [C.OTHER_FAT, 0.64],
    [C.OTHER_SNF, 7.26],
    [C.OTHER_SNFS, 7.22],
    [C.SUGAR, 0.04],
    [C.TOTAL_SOLIDS, 7.9],
    [C.POD, 0.048],
    [C.PAC_SGR, 0.076],
    [C.CATEGORY, CAT.FRUIT],
    [C.EXTENSION, fruitsAndVeggiesExtensions_[3]],
  ],
  [
    [C.NAME, "Passion Fruit"],
    [C.OTHER_FAT, 0.7],
    [C.OTHER_SNF, 26.37],
    [C.OTHER_SNFS, 15.17],
    [C.SUGAR, 11.2],
    [C.TOTAL_SOLIDS, 27.07],
    [C.POD, 11.2],
    [C.PAC_SGR, 11.2],
    [C.CATEGORY, CAT.FRUIT],
    [C.EXTENSION, fruitsAndVeggiesExtensions_[4]],
  ],
]);

const eggsRange_ = [
  // ...        fat, solids, lecithin
  ["Egg Yolk", 29, 48, 8.33],
];

const expEggsRange_ = expandCompListsIntoCompRange_([
  [
    [C.NAME, "Egg Yolk"],
    [C.EGG_FAT, 29],
    [C.EGG_SNF, 19],
    [C.EGG_SNFS, 19],
    [C.TOTAL_SOLIDS, 48],
    [C.EMULSIFIERS, 8.33],
    [C.CATEGORY, CAT.EGG],
  ],
]);

const emulsifiersAndStabilizersRange_ = [
  // ...               emulsifiers, stabilizers, solids
  ["Locust Bean Gum", "", 100, 100],
  ["Soy Lecithin", 100, "", 100],
];

const expEmulsifiersAndStabilizersRange_ = expandCompListsIntoCompRange_([
  [
    [C.NAME, "Locust Bean Gum"],
    [C.OTHER_SNF, 100],
    [C.OTHER_SNFS, 100],
    [C.TOTAL_SOLIDS, 100],
    [C.STABILIZERS, 100],
    [C.CATEGORY, CAT.EMULSIFIER_STABILIZER],
  ],
  [
    [C.NAME, "Soy Lecithin"],
    [C.OTHER_SNF, 100],
    [C.OTHER_SNFS, 100],
    [C.TOTAL_SOLIDS, 100],
    [C.EMULSIFIERS, 100],
    [C.CATEGORY, CAT.EMULSIFIER_STABILIZER],
  ],
]);

const miscellaneousRange_ = [
  // ...                          milk_fat, other_fat, msnf, sugar, solids,  salt,   abv, emulsifiers, stabilziers, pod, pac_sgr, hf
  ["Water", "", "", "", "", "", "", "", "", "", "", "", ""],
  ["Salt", "", "", "", "", 100, 1000, "", "", "", "", "", ""],
  ["Micau Liquid Caramel", "", "", "", 42, 78, 0.3, "", "", "", 34, 67, ""],
  ["Hot-Kid Milk Flavored Drink", 2.3, "", 6.5, 5, 13.94, 0.9, "", 0.05, "", 5, 5, ""],
  ["Citric Acid", "", "", "", "", 100, "", "", "", "", "", "", ""],
];

const expMiscellaneousRange_ = expandCompListsIntoCompRange_([
  [
    [C.NAME, "Water"],
    [C.CATEGORY, CAT.MISCELLANEOUS],
  ],
  [
    [C.NAME, "Salt"],
    [C.OTHER_SNF, 100],
    [C.OTHER_SNFS, 100],
    [C.TOTAL_SOLIDS, 100],
    [C.SALT, 100],
    [C.PAC_SLT, 585],
    [C.CATEGORY, CAT.MISCELLANEOUS],
  ],
  [
    [C.NAME, "Micau Liquid Caramel"],
    [C.OTHER_SNF, 78],
    [C.OTHER_SNFS, 36],
    [C.SUGAR, 42],
    [C.TOTAL_SOLIDS, 78],
    [C.SALT, 0.03],
    [C.POD, 34],
    [C.PAC_SGR, 67],
    [C.PAC_SLT, 0.1755],
    [C.CATEGORY, CAT.MISCELLANEOUS],
  ],
  [
    [C.NAME, "Hot-Kid Milk Flavored Drink"],
    [C.MILK_FAT, 2.3],
    [C.MILK_SNF, 6.5],
    [C.MILK_SNFS, 2.958],
    [C.OTHER_SNF, 5.14],
    [C.OTHER_SNFS, 0.14],
    [C.LACTOSE, 3.5425],
    [C.SUGAR, 5],
    [C.TOTAL_SOLIDS, 13.94],
    [C.SALT, 0.09],
    [C.EMULSIFIERS, 0.05],
    [C.POD, 5.5668],
    [C.PAC_SGR, 8.5425],
    [C.PAC_SLT, 0.5265],
    [C.CATEGORY, CAT.MISCELLANEOUS],
  ],
  [
    [C.NAME, "Citric Acid"],
    [C.OTHER_SNF, 100],
    [C.OTHER_SNFS, 100],
    [C.TOTAL_SOLIDS, 100],
    [C.CATEGORY, CAT.MISCELLANEOUS],
  ],
]);

// If `undefined` ingredients rows are not handled correctly, then valid ingredients
// that compare < "undefined", but are close to it, will break the binary search.
const expSearchBreakingIngredients_: any = [
  ["T"].concat(new Array(Object.values(Composition).length - 1).fill(null)),
];

const expEmptyIngredients_: any = [
  [""],
  [null],
  [undefined],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
];

const ingredients_: any[] = []
  .concat(
    expDairyRange_,
    expSweetnersRange_,
    expAlcoholicRange_,
    expChocolatesRange_,
    expNutsRange_,
    expFruitsAndVeggiesRange_,
    expEggsRange_,
    expEmulsifiersAndStabilizersRange_,
    expMiscellaneousRange_,
    expSearchBreakingIngredients_
  )
  .sort(ingredientCompare_)
  // Handle empty rows
  .concat(expEmptyIngredients_);

const nameIngredientPairsExpected_ = [
  ["2% Milk", expDairyRange_[0]],
  ["Dextrose", expSweetnersRange_[1]],
  ["Dark Rum", expAlcoholicRange_[1]],
  ["Baker's Semi-Sweet Chocolate", expChocolatesRange_[1]],
  ["Hazelnuts", expNutsRange_[1]],
  ["Avacado", expFruitsAndVeggiesRange_[1]],
  ["Egg Yolk", expEggsRange_[0]],
  ["Soy Lecithin", expEmulsifiersAndStabilizersRange_[1]],
  ["Salt", expMiscellaneousRange_[1]],
  // Check proper handlig of `undefined` ingredient rows
  ["T", expSearchBreakingIngredients_[0]],
  // Bad recipe names
  ["unknown", undefined],
  ["", undefined],
  [null, undefined],
  [undefined, undefined],
  [, undefined],
];

const recipe_ = [
  ["2% Milk", 200],
  ["35% Cream", 175],
  ["Skimmed Milk Powder", 35],
  ["Sucrose", 55],
  ["Dextrose", 5],
  ["Egg Yolk", 36],
  ["Baileys Irish Cream", 15],
  ["Baker's Semi-Sweet Chocolate", 10],
  ["Hazelnuts", 10],
  ["Avacado", 10],
  ["Locust Bean Gum", 0.6],
  ["Soy Lecithin", 0.2],
  ["Salt", 0.5],
  // Bad recipe lines, should return []
  ["Salt"],
  ["", 1],
  [null, 1],
  [undefined, 1],
  [, 1],
  [,],
  [],
];

const processed_recipe_ = processRecipe(recipe_, ingredients_);

const recipeQuantitiesRangeFull_ = [
  [
    "Milk Fat",
    "Egg Fat",
    "Cacao Fat",
    "Nut Fat",
    "Other Fat",
    "Lactose",
    "Sugar",
    "MSNF",
    "Egg SNF",
    "Cocoa SNF",
    "Nut SNF",
    "Other SNF",
    "MSNFS",
    "Egg SNFS",
    "Cocoa SNFS",
    "Nut SNFS",
    "Other SNFS",
    "Solids",
    "Salt",
    "Alcohol",
    "Emulsifiers",
    "Stabilizers",
    "POD",
    "PACsgr",
    "PACslt",
    "PACalc",
    "HF",
  ],
]
  .concat(
    expandQuantListsIntoQuantRange_([
      [
        // Totals
        [C.MILK_FAT, 65.25],
        [C.EGG_FAT, 10.44],
        [C.CACAO_FAT, 3.3],
        [C.NUT_FAT, 6.08],
        [C.OTHER_FAT, 4.44],
        [C.LACTOSE, 32.825],
        [C.SUGAR, 67.68],
        [C.MILK_SNF, 62.175],
        [C.EGG_SNF, 6.84],
        [C.COCOA_SNF, 6.6],
        [C.NUT_SNF, 3.39],
        [C.OTHER_SNF, 65.54],
        [C.MILK_SNFS, 29.35],
        [C.EGG_SNFS, 6.84],
        [C.COCOA_SNFS, 1.9],
        [C.NUT_SNFS, 2.96],
        [C.OTHER_SNFS, 2.99],
        [C.TOTAL_SOLIDS, 234.055],
        [C.SALT, 0.53],
        [C.ALCOHOL, 2.012],
        [C.EMULSIFIERS, 3.1988],
        [C.STABILIZERS, 0.6],
        [C.POD, 71.682],
        [C.PAC_SGR, 105.255],
        [C.PAC_SLT, 3.1005],
        [C.PAC_ALC, 14.8884],
        [C.HF, 14.902],
      ],
      [
        // 2% Milk, 200
        [C.MILK_FAT, 4.0],
        [C.MILK_SNF, 17.2],
        [C.MILK_SNFS, 8],
        [C.LACTOSE, 9.2],
        [C.TOTAL_SOLIDS, 21.2],
        [C.POD, 1.472],
        [C.PAC_SGR, 9.2],
      ],
      [
        // 35% Cream, 175
        [C.MILK_FAT, 61.25],
        [C.MILK_SNF, 9.975],
        [C.MILK_SNFS, 4.55],
        [C.LACTOSE, 5.425],
        [C.TOTAL_SOLIDS, 71.225],
        [C.POD, 0.868],
        [C.PAC_SGR, 5.425],
      ],
      [
        // Skimmed Milk Powder, 35
        [C.MILK_SNF, 35.0],
        [C.MILK_SNFS, 16.8],
        [C.LACTOSE, 18.2],
        [C.TOTAL_SOLIDS, 35.0],
        [C.POD, 2.912],
        [C.PAC_SGR, 18.2],
      ],
      [
        // Sucrose, 55
        [C.OTHER_SNF, 55.0],
        [C.SUGAR, 55.0],
        [C.TOTAL_SOLIDS, 55.0],
        [C.POD, 55.0],
        [C.PAC_SGR, 55.0],
      ],
      [
        // Dextrose
        [C.OTHER_SNF, 4.75],
        [C.SUGAR, 4.75],
        [C.TOTAL_SOLIDS, 4.75],
        [C.POD, 3.5],
        [C.PAC_SGR, 9.5],
      ],
      [
        // Egg Yolk, 36
        [C.EGG_FAT, 10.44],
        [C.EGG_SNF, 6.84],
        [C.EGG_SNFS, 6.84],
        [C.TOTAL_SOLIDS, 17.28],
        [C.EMULSIFIERS, 2.9988],
      ],
      [
        // Baileys Irish Cream, 15
        [C.OTHER_FAT, 2.04],
        [C.OTHER_SNF, 3.69],
        [C.OTHER_SNFS, 0.99],
        [C.SUGAR, 2.7],
        [C.TOTAL_SOLIDS, 5.73],
        [C.SALT, 0.03],
        [C.ALCOHOL, 2.012],
        [C.POD, 2.7],
        [C.PAC_SGR, 2.7],
        [C.PAC_SLT, 0.1755],
        [C.PAC_ALC, 14.8884],
      ],
      [
        // Baker's Semi-Sweet Chocolate, 10
        [C.CACAO_FAT, 3.3],
        [C.COCOA_SNF, 6.6],
        [C.COCOA_SNFS, 1.9],
        [C.SUGAR, 4.7],
        [C.TOTAL_SOLIDS, 9.9],
        [C.POD, 4.7],
        [C.PAC_SGR, 4.7],
        [C.HF, 6.39],
      ],
      [
        // Hazelnuts, 10
        [C.NUT_FAT, 6.08],
        [C.NUT_SNF, 3.39],
        [C.NUT_SNFS, 2.96],
        [C.SUGAR, 0.43],
        [C.TOTAL_SOLIDS, 9.47],
        [C.POD, 0.43],
        [C.PAC_SGR, 0.43],
        [C.HF, 8.512],
      ],
      [
        // Avocado, 10
        [C.OTHER_FAT, 2.4],
        [C.OTHER_SNF, 0.8],
        [C.OTHER_SNFS, 0.7],
        [C.SUGAR, 0.1],
        [C.TOTAL_SOLIDS, 3.2],
        [C.POD, 0.1],
        [C.PAC_SGR, 0.1],
      ],
      [
        // Locust Bean Gum, 0.6
        [C.OTHER_SNF, 0.6],
        [C.OTHER_SNFS, 0.6],
        [C.TOTAL_SOLIDS, 0.6],
        [C.STABILIZERS, 0.6],
      ],
      [
        // Soy Lecithin, 0.2
        [C.OTHER_SNF, 0.2],
        [C.OTHER_SNFS, 0.2],
        [C.TOTAL_SOLIDS, 0.2],
        [C.EMULSIFIERS, 0.2],
      ],
      [
        // Salt
        [C.OTHER_SNF, 0.5],
        [C.OTHER_SNFS, 0.5],
        [C.TOTAL_SOLIDS, 0.5],
        [C.SALT, 0.5],
        [C.PAC_SLT, 2.925],
      ],
    ])
  )
  .concat([[], [], [], [], [], [], []]);

const recipeProperties_ = expandPropListIntoPropRange_([
  [P.MIX_TOTAL, 552.3],
  [P.MILK_FAT, [65.25, 11.8142]],
  [P.EGG_FAT, [10.44, 1.89]],
  [P.CACAO_FAT, [3.3, 0.598]],
  [P.NUT_FAT, [6.08, 1.101]],
  [P.OTHER_FAT, [4.44, 0.804]],
  [P.TOTAL_FAT, [89.5099, 16.2]],
  [P.LACTOSE, [32.825, 5.9433]],
  [P.SUGAR, [67.68, 12.2542]],
  [P.MILK_SNF, [62.175, 11.25]],
  [P.EGG_SNF, [6.84, 1.2385]],
  [P.COCOA_SNF, [6.6, 1.195]],
  [P.NUT_SNF, [3.39, 0.6138]],
  [P.OTHER_SNF, [65.54, 11.867]],
  [P.TOTAL_SNF, [144.545, 26.1715]],
  [P.MILK_SNFS, [29.35, 5.314]],
  [P.EGG_SNFS, [6.84, 1.2385]],
  [P.COCOA_SNFS, [1.9, 0.344]],
  [P.NUT_SNFS, [2.96, 0.536]],
  [P.OTHER_SNFS, [2.99, 0.541]],
  [P.TOTAL_SNFS, [44.04, 7.974]],
  [P.TOTAL_SOLIDS, [234.055, 42.3782]],
  [P.WATER, [316.233, 57.2575]],
  [P.SALT, [0.53, 0.1]],
  [P.ALCOHOL, [2.012, 0.3643]],
  [P.EMULSIFIERS, [3.2, 0.58]],
  [P.STABILIZERS, [0.6, 0.11]],
  [P.ABV, [null, 0.4617]],
  [P.EMULS_PER_FAT, [null, 3.57]],
  [P.STABS_PER_WATER, [null, 0.19]],
  [P.POD, [71.682, 12.9788]],
  [P.PAC_SGR, [105.255, 19.0576]],
  [P.PAC_SLT, [3.1005, 0.5614]],
  [P.PAC_ALC, [14.8884, 2.7]],
  [P.PAC_TOT, [123.2439, 22.3147]],
  [P.ABS_PAC, [null, 38.97]],
  [P.HF, [14.902, 2.7]],
  [P.FPD, [null, -2.864]],
  [P.SERVING_TEMP, [null, -12.994]],
  [P.HARDNESS_AT_14, [null, 76.68]],
  [P.ERROR, null],
]);

const recipePropertiesRangeSummary = [
  ["Qty (g)", null, "Qty (%)"],
  [552.3, "Mix Total", null],
  [65.25, "Milk Fat", 11.8142],
  [89.5099, "Total Fat", 16.2],
  [62.175, "MSNF", 11.25],
  [144.545, "TSNF", 26.1715],
  [6.84, "Egg SNFS", 1.2385],
  [1.9, "Cocoa SNFS", 0.344],
  [2.96, "Nut SNFS", 0.536],
  [234.055, "Solids", 42.3782],
  [316.233, "Water", 57.2575],
  [32.825, "Lactose", 5.9433],
  [67.68, "Sugar", 12.2542],
  [0.53, "Salt", 0.1],
  [null, "ABV", 0.46],
  [null, "Emul./Fat", 3.57],
  [null, "Stab./Water", 0.19],
  [null, "POD", 12.9788],
  [null, "HF", 2.7],
  [null, "PAC", 22.3147],
  [null, "Abs.PAC", 38.97],
  [null, "FPD", -2.864],
  [null, "Serving Temp", -12.994],
  [null, "Hardness @ -14°C", 76.68],
];

const recipeFpdCurvesRange_ = [
  ["Hardness", null, "Frozen Water", "HF"],
  [-2.7179, null, -2.8642, -2.5715],
  [-2.8649, null, -3.0254, -2.7045],
  [-3.0272, null, -3.1959, -2.8586],
  [-3.2114, null, -3.3876, -3.0352],
  [-3.4272, null, -3.6225, -3.2319],
  [-3.6704, null, -3.8919, -3.4489],
  [-3.9623, null, -4.2029, -3.7216],
  [-4.3029, null, -4.5637, -4.0421],
  [-4.7202, null, -5.0264, -4.4139],
  [-5.2089, null, -5.5297, -4.8881],
  [-5.8127, null, -6.1871, -5.4383],
  [-6.5651, null, -6.9965, -6.1337],
  [-7.5676, null, -8.0794, -7.0559],
  [-8.8437, null, -9.4051, -8.2822],
  [-10.6207, null, -11.3389, -9.9026],
  [-12.9943, -12.9943, -13.7347, -12.2539],
  [-16.2152, null, -17.0006, -15.4298],
  [-21.0603, null, -22.1075, -20.0131],
  [-30.7505, null, -32.3213, -29.1797],
  [-59.8211, null, -62.9627, -56.6795],
];

const strawberryNewBrix_ = [
  // ...                       water   suc    gluc    fruc  fat
  ["Strawberry [Brix 7]", 88.9, 0.6714, 2.8429, 3.4857, 0.3],
  ["Strawberry [Brix 7.5]", 88.4, 0.7194, 3.0459, 3.7347, 0.3],
  ["Strawberry [Brix 8]", 87.9, 0.7673, 3.249, 3.9837, 0.3],
  [],
  ["Strawberry [Brix 8.5]", 87.4, 0.8153, 3.452, 4.2327, 0.3],
  ["Strawberry [Brix 9]", 86.9, 0.8633, 3.6551, 4.4816, 0.3],
  ["Strawberry [Brix 10]", 85.9, 0.9592, 4.0612, 4.9796, 0.3],
  ["Strawberry [Brix 10.5]", 85.4, 1.0071, 4.2643, 5.2286, 0.3],
];

const passionFruitNewBrix_ = [
  // ...                          water  suc   gluc  fruc  fat
  ["Passion Fruit [Brix 7]", 77.13, 7, null, null, 0.7],
  ["Passion Fruit [Brix 7.5]", 76.63, 7.5, null, null, 0.7],
  ["Passion Fruit [Brix 10]", 74.13, 10, null, null, 0.7],
  ["Passion Fruit [Brix 10.5]", 73.63, 10.5, null, null, 0.7],
];

const fruitMedleyRecipe_ = [[50, "Strawberry"], [,], [50, "Basil"]];

const fruitMedleyQuants_ = [
  [91.55, 0.235, 1.005, 1.23, 0.47],
  fruitsAndVeggiesRange_[2].slice(1),
  [],
  fruitsAndVeggiesRange_[3].slice(1),
];

/// --------------- TEST Functions ---------------
/// ==============================================

export function test_getFpdFromPacInterpolation_() {
  return getFpdFromPacInterpolationExpected_.reduce(
    (result, pac_fpd) => result && assertEq_(getFpdFromPacInterpolation(pac_fpd[0]), pac_fpd[1]),
    true
  );
}

export function test_getFpdFromPacPolynomial_() {
  return getFpdFromPacPolynomialExpected_.reduce(
    (result, pac_fpd) => result && assertEq_(getFpdFromPacPolynomial(pac_fpd[0]), pac_fpd[1]),
    true
  );
}

export function test_computeFpd_() {
  return computeFpdExpected_.reduce(
    (result, input_fpd: any) =>
      result && assertEq_((<any>computeFpd)(...input_fpd[0]), input_fpd[1]),
    true
  );
}

export function test_computeHardnessAtTemp_() {
  return computeHardnessAtTempExpected_.reduce(
    (result, [fpd_properties, temp, hardness]: any) =>
      result && assertEq_((<any>computeHardnessAtTemp)(...fpd_properties, temp), hardness),
    true
  );
}

export function test_flattenToAndDecompFromRow_() {
  var ret = [];
  ret[C.NAME] = "name";
  ret[C.SUGAR] = "sugar";

  var results = [];

  var row = flattenToRow_(ret, Composition);
  results.push(assertEq_(row.length, 30));
  results.push(assertEq_(row[C.NAME], "name"));
  results.push(assertEq_(row[C.SUGAR], "sugar"));
  results.push(assertEq_(row[C.HF], null));

  var comp = decompFromRow_(row, Composition);
  results.push(assertEq_(comp[C.NAME], "name"));
  results.push(assertEq_(comp[C.SUGAR], "sugar"));
  results.push(assertEq_(comp[C.HF], undefined));

  return didAllSucceed_(results);
}

export function test_expandDairyRange_() {
  return assertEq_(expandDairyRange(dairyRange_), expDairyRange_);
}
export function test_expandSweetnersRange_() {
  return assertEq_(expandSweetnersRange(sweetnersRange_), expSweetnersRange_);
}
export function test_expandAloholicRange_() {
  return assertEq_(expandAlcoholicRange(alcoholicRange_), expAlcoholicRange_);
}
export function test_expandChocolatesRange_() {
  return assertEq_(expandChocolatesRange(chocolatesRange_), expChocolatesRange_);
}
export function test_expandNutsRange_() {
  return assertEq_(expandNutsRange(nutsRange_), expNutsRange_);
}
export function test_expandFruitsAndVeggiesRange_() {
  return assertEq_(expandFruitsAndVeggiesRange(fruitsAndVeggiesRange_), expFruitsAndVeggiesRange_);
}
export function test_expandEggsRange_() {
  return assertEq_(expandEggsRange(eggsRange_), expEggsRange_);
}
export function test_expandEmulsifiersAndStabilizersRange_() {
  return assertEq_(
    expandEmulsifiersAndStabilizersRange(emulsifiersAndStabilizersRange_),
    expEmulsifiersAndStabilizersRange_
  );
}
export function test_expandMiscellaneousRange_() {
  return assertEq_(expandMiscellaneousRange(miscellaneousRange_), expMiscellaneousRange_);
}

export function test_isError_() {
  return didAllSucceed_(
    [
      [0, false],
      [null, false],
      ["", false],
      [ERROR_UNKNOWN_INGREDIENT, true],
    ].map(([val, expected]) => isError_(val) === expected)
  );
}

export function test_isCompositionQuantField_() {
  return didAllSucceed_(
    [
      [C.NAME, false],
      [C.MILK_FAT, true],
      [C.HF, true],
      [C.CATEGORY, false],
      [C.EXTENSION, false],
    ].map(([val, expected]) => isCompositionQuantField_(val) == expected)
  );
}

export function test_linearFindIngredient_() {
  return nameIngredientPairsExpected_.reduce(
    (result, [name, ingredient]) =>
      result && assertEq_(linearFindIngredient_(name, ingredients_), ingredient),
    true
  );
}

export function test_binaryFindIngredient_() {
  return nameIngredientPairsExpected_.reduce(
    (result, [name, ingredient]) =>
      result && assertEq_(binaryFindIngredient_(name, ingredients_), ingredient),
    true
  );
}

export function test_getIngredientParameters_() {
  return didAllSucceed_([
    assertEq_(
      strawberryNewBrix_
        .slice(0, 3)
        .concat(strawberryNewBrix_.slice(4))
        .map((ingredient) => getIngredientParameters_(ingredient[0])),
      [
        ["Strawberry", "Brix", 7],
        ["Strawberry", "Brix", 7.5],
        ["Strawberry", "Brix", 8],
        ["Strawberry", "Brix", 8.5],
        ["Strawberry", "Brix", 9],
        ["Strawberry", "Brix", 10],
        ["Strawberry", "Brix", 10.5],
      ]
    ),
    assertEq_(
      passionFruitNewBrix_.map((ingredient) => getIngredientParameters_(ingredient[0])),
      [
        ["Passion Fruit", "Brix", 7],
        ["Passion Fruit", "Brix", 7.5],
        ["Passion Fruit", "Brix", 10],
        ["Passion Fruit", "Brix", 10.5],
      ]
    ),
  ]);
}

export function test_processIngredient_() {
  return didAllSucceed_([
    // Parametric ingredients, Brix
    assertEq_(
      strawberryNewBrix_
        .slice(0, 3)
        .map((ingredient) => processIngredient(ingredient[0], ingredients_)),
      expandFruitsAndVeggiesRange(strawberryNewBrix_.slice(0, 3)).map((row: any) =>
        row.slice(0, -1)
      )
    ),
    assertEq_(
      strawberryNewBrix_
        .slice(4)
        .map((ingredient) => processIngredient(ingredient[0], ingredients_)),
      expandFruitsAndVeggiesRange(strawberryNewBrix_.slice(4)).map((row: any) => row.slice(0, -1))
    ),
    assertEq_(
      passionFruitNewBrix_.map((ingredient) => processIngredient(ingredient[0], ingredients_)),
      expandFruitsAndVeggiesRange(passionFruitNewBrix_).map((row: any) => row.slice(0, -1))
    ),
  ]);
}

export function test_computeIngredientQuantities_() {
  return assertEq_(
    expDairyRange_.map((row: any) => computeIngredientQuantities(quantityExpected_, row)),
    expDairyRangeQuants_
  );
}

export function test_computeRecipeQuantities_() {
  var results = [
    assertEq_(
      computeRecipeQuantities(
        processRecipe(
          [
            ["2% Milk", 200],
            ["35% Cream", 200],
            ["Skimmed Milk Powder", 200],
            // Empty ingredient, should return []
            ["Salt"],
            [,],
            [, 10], // TODO: Should this return error?
            // Bad recipe lines, should return [ERROR_UNKNOWN_INGREDIENT]
            ["unknown", 10],
          ],
          ingredients_
        )
      ),
      expDairyRangeQuants_.concat([[], [], [], ERROR_UNKNOWN_INGREDIENT])
    ),
    assertEq_(computeRecipeQuantities(processed_recipe_), recipeQuantitiesRangeFull_.slice(2)),
  ];

  return didAllSucceed_(results);
}

export function test_computeRecipeQuantityTotals_() {
  return assertEq_(computeRecipeQuantityTotals(processed_recipe_), recipeQuantitiesRangeFull_[1]);
}

export function test_computeRecipeProperties_() {
  return assertEq_(computeRecipeProperties(recipe_, ingredients_), recipeProperties_);
}

export function test_computeAndDisplayQuantitiesFull_() {
  return assertEq_(
    computeAndDisplayQuantitiesFull(recipe_, ingredients_),
    recipeQuantitiesRangeFull_
  );
}

export function test_computeAndDisplayQuantitiesFullError_() {
  var quantities = computeAndDisplayQuantitiesFull(
    [["2% Milk", 200], ["unknown"], ["35% Cream", 200], ["unknown", 10]],
    ingredients_
  );

  var milk_line_quants = expDairyRangeQuants_[0];
  var cream_line_quants = expDairyRangeQuants_[1];
  var totals = milk_line_quants.map((val: any, idx: any) => val + cream_line_quants[idx]);
  var header = recipeQuantitiesRangeFull_[0];

  return assertEq_(quantities, [
    header,
    totals,
    milk_line_quants,
    ["ERROR"],
    cream_line_quants,
    ["ERROR"],
  ]);
}

export function test_computeAndDisplayPropertiesSummary_() {
  return assertEq_(
    computeAndDisplayPropertiesSummary(recipe_, ingredients_),
    recipePropertiesRangeSummary
  );
}

export function test_computeAndDisplayPropertiesSummaryEmpty_() {
  var properties = computeAndDisplayPropertiesSummary([], ingredients_);
  var results = [];

  results.push(
    assertEq_(properties[0][0], "Qty (g)") && assertEq_(properties[0][1], null),
    assertEq_(properties[0][2], "Qty (%)")
  );

  results.push(
    properties
      .slice(1)
      .every(
        ([quantity, name, percent]) =>
          (quantity == 0 || quantity == null) &&
          isString_(name) &&
          name.length > 0 &&
          percent == null
      )
  );

  return didAllSucceed_(results);
}

export function test_computeAndDisplayPropertiesSummaryError_() {
  var properties = computeAndDisplayPropertiesSummary(
    [
      ["2% Milk", 200],
      ["unknown", 10],
    ],
    ingredients_
  );

  return assertEq_(properties[0][1], ERROR_UNKNOWN_INGREDIENT);
}

export function test_computeAndDisplayFpdCurves_() {
  return didAllSucceed_([
    assertEq_(computeAndDisplayFpdCurves(recipe_, ingredients_), recipeFpdCurvesRange_),
    assertEq_(computeAndDisplayFpdCurves([], ingredients_), [
      ["Hardness", null, "Frozen Water", "HF"],
      [100, 100, 100, 100],
    ]),
  ]);
}

export function test_computeAndDisplayNewBrixFruits_() {
  return didAllSucceed_([
    assertEq_(
      computeAndDisplayNewBrixFruits(
        "Strawberry",
        [[7], [7.5], [8], [""], [8.5], [9], [10], [10.5]],
        fruitsAndVeggiesRange_
      ),
      [fruitsAndVeggiesRange_[2]].concat(strawberryNewBrix_)
    ),
    assertEq_(
      computeAndDisplayNewBrixFruits(
        "Passion Fruit",
        [[7], [7.5], [10], [10.5]],
        fruitsAndVeggiesRange_
      ),
      [fruitsAndVeggiesRange_[4]].concat(passionFruitNewBrix_)
    ),
  ]);
}

export function test_computeAndDisplayNewBrixFruitsEmpty_() {
  return assertEq_(computeAndDisplayNewBrixFruits("", [], fruitsAndVeggiesRange_), []);
}

export function test_computeAndDisplayNewBrixFruitsErrors_() {
  return didAllSucceed_([
    assertEq_(computeAndDisplayNewBrixFruits("Strawberry", [[100]], fruitsAndVeggiesRange_), [
      fruitsAndVeggiesRange_[2],
      [ERROR_INVALID_ARGUMENT],
    ]),
    assertEq_(computeAndDisplayNewBrixFruits("unknown", [], fruitsAndVeggiesRange_), [
      ERROR_UNKNOWN_INGREDIENT,
    ]),
  ]);
}

export function test_computeFruitMedley_() {
  return assertEq_(
    computeFruitMedley(fruitMedleyRecipe_, fruitsAndVeggiesRange_),
    fruitMedleyQuants_
  );
}

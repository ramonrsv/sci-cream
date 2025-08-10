// Ingredient categories
export enum Category {
  DAIRY = "Dairy",
  SWEETENER = "Sweetener",
  ALCOHOL = "Alcohol",
  CHOCOLATE = "Chocolate",
  NUT = "Nut",
  FRUIT = "Fruit",
  EGG = "Egg",
  STABILIZER = "Stabilizer",
  MISCELLANEOUS = "Miscellaneous",
}

// Composition component of ingredients, usually as a percentage by weight
export enum Composition {
  MILK_FAT = "Milk Fat",
  EGG_FAT = "Egg Fat",
  CACAO_FAT = "Cacao Fat",
  NUT_FAT = "Nut Fat",
  OTHER_FAT = "Other Fats",

  LACTOSE = "Lactose",
  SUGAR = "Sugar",

  MILK_SNF = "Milk SNF",
  EGG_SNF = "Egg SNF",
  COCOA_SNF = "Cocoa SNF",
  NUT_SNF = "Nut SNF",
  OTHER_SNF = "Other SNF",

  MILK_SNFS = "Milk SNFS",
  EGG_SNFS = "Egg SNFS",
  COCOA_SNFS = "Cocoa SNFS",
  NUT_SNFS = "Nut SNFS",
  OTHER_SNFS = "Other SNFS",

  TOTAL_SOLIDS = "Total Solids",

  SALT = "Salt",
  ALCOHOL = "Alcohol",
  EMULSIFIERS = "Emulsifiers",
  STABILIZERS = "Stabilizers",

  POD = "POD",
  PAC_SGR = "PAC sgr",
  PAC_SLT = "PAC slt",
  PAC_ALC = "PAC alc",
  HF = "Hardness Factor",
}

// Property of a mix
export enum Property {
  MIX_TOTAL = "Mix Total",

  MILK_FAT = "Milk Fat",
  EGG_FAT = "Egg Fat",
  CACAO_FAT = "Cacao Fat",
  NUT_FAT = "Nut Fat",
  OTHER_FAT = "Other Fat",
  TOTAL_FAT = "Total Fat",

  LACTOSE = "Lactose",
  SUGAR = "Sugar",

  MILK_SNF = "Milk SNF",
  EGG_SNF = "Egg SNF",
  COCOA_SNF = "Cocoa SNF",
  NUT_SNF = "Nut SNF",
  OTHER_SNF = "Other SNF",
  TOTAL_SNF = "Total SNF",

  MILK_SNFS = "Milk SNFS",
  EGG_SNFS = "Egg SNFS",
  COCOA_SNFS = "Cocoa SNFS",
  NUT_SNFS = "Nut SNFS",
  OTHER_SNFS = "Other SNFS",
  TOTAL_SNFS = "Total SNFS",

  TOTAL_SOLIDS = "Total Solids",
  WATER = "Water",

  SALT = "Salt",
  ALCOHOL = "Alcohol",
  EMULSIFIERS = "Emulsifiers",
  STABILIZERS = "Stabilizers",
  ABV = "ABV",
  EMULS_PER_FAT = "Emulsifiers/Fat",
  STABS_PER_WATER = "Stabilizers/Water",

  POD = "POD",
  PAC_SGR = "PAC sgr",
  PAC_SLT = "PAC slt",
  PAC_ALC = "PAC alc",
  PAC_TOT = "PAC total",
  ABS_PAC = "Abs PAC",
  HF = "Hardness Factor",
  FPD = "FPD",
  SERVING_TEMP = "Serving Temp",
  HARDNESS_AT_14 = "Hardness at 14°C",
}

namespace constants {
  export const ABV_TO_ABW_RATIO = 0.789;

  export const SUCROSE_POD = 100;
  export const GLUCOSE_POD = 70;
  export const FRUCTOSE_POD = 170;
  export const LACTOSE_POD = 16;

  export const SUCROSE_PAC = 100;
  export const GLUCOSE_PAC = 190;
  export const FRUCTOSE_PAC = 190;
  export const LACTOSE_PAC = 100;

  export const SALT_PAC = 585;
  export const ALCOHOL_PAC = 740;

  export const CACAO_FAT_HF = 0.9;
  export const COCOA_SOLIDS_HF = 1.8;
  export const NUT_FAT_HF = 1.4;

  export const STANDARD_MSNF_IN_MILK_SERUM = 0.09;
  export const STANDARD_LACTOSE_IN_MSNF = 0.545;

  export const FPD_MSNF_FACTOR_FOR_CELSIUS = 2.37;
}

const CompositionFats = [
  Composition.MILK_FAT,
  Composition.EGG_FAT,
  Composition.CACAO_FAT,
  Composition.NUT_FAT,
  Composition.OTHER_FAT,
] as const;

const CompositionSNF = [
  Composition.MILK_SNF,
  Composition.EGG_SNF,
  Composition.COCOA_SNF,
  Composition.NUT_SNF,
  Composition.OTHER_SNF,
] as const;

const CompositionSNFS = [
  Composition.MILK_SNFS,
  Composition.EGG_SNFS,
  Composition.COCOA_SNFS,
  Composition.NUT_SNFS,
  Composition.OTHER_SNFS,
] as const;

const CompositionAllPercent = [
  ...CompositionFats,
  ...CompositionSNF,
  ...CompositionSNFS,
  Composition.LACTOSE,
  Composition.SUGAR,
  Composition.TOTAL_SOLIDS,
  Composition.SALT,
  Composition.ALCOHOL,
  Composition.EMULSIFIERS,
  Composition.STABILIZERS,
] as const;

export type CompositionRecord = Partial<Record<Composition, number>>;

export abstract class Ingredient {
  name: string;
  composition: CompositionRecord; // Percentage composition by weight

  private dbValue: {};

  constructor(name: string, composition: CompositionRecord, dbValue: {}) {
    Ingredient.validateComposition(composition);

    this.name = name;
    this.composition = composition;
    this.dbValue = dbValue;
  }

  public abstract category(): Category;

  public toDbValue(): {} {
    return this.dbValue;
  }

  static validateComposition(composition: CompositionRecord) {
    let reduceComps = (comps: readonly Composition[]) =>
      comps.reduce((sum, comp) => sum + (composition[comp] ?? 0), 0);

    const totalFat = reduceComps(CompositionFats);
    const totalSNF = reduceComps(CompositionSNF);
    const totalSNFS = reduceComps(CompositionSNFS);
    const lactose = composition[Composition.LACTOSE] ?? 0;
    const sugar = composition[Composition.SUGAR] ?? 0;
    const totalSolids = composition[Composition.TOTAL_SOLIDS] ?? 0;

    CompositionAllPercent.forEach((comp) => {
      if (composition[comp] != undefined && (composition[comp] < 0 || composition[comp] > 100)) {
        throw new Error(`Invalid composition: ${comp} must be between 0% and 100%`);
      }
    });

    if (totalFat > 100 || totalSNF > 100 || totalSNFS > 100) {
      throw new Error(`Invalid composition: Total Fats, SNF, or SNFS exceeds 100%`);
    }

    if (totalSNFS + totalFat + lactose + sugar != totalSolids) {
      throw new Error(
        `Invalid composition: Total Solids (${totalSolids}%) does not match sum of ` +
          `SNFS (${totalSNFS}%), Fats (${totalFat}%), and Sugar (${sugar}%)`
      );
    }

    if (totalSNF + totalFat != totalSolids) {
      throw new Error(
        `Invalid composition: Total Solids (${totalSolids}%) does not match sum of ` +
          `SNF (${totalSNF}%) and Fats (${totalFat}%)`
      );
    }
  }
}

export class Dairy extends Ingredient {
  public category(): Category {
    return Category.DAIRY;
  }

  constructor({
    name,
    milkFat,
    msnf,
    lactose,
  }: {
    name: string;
    milkFat: number;
    msnf?: number;
    lactose?: number;
  }) {
    msnf = msnf ?? (100 - milkFat) * constants.STANDARD_MSNF_IN_MILK_SERUM;
    lactose = lactose ?? msnf * constants.STANDARD_LACTOSE_IN_MSNF;

    super(
      name,
      {
        [Composition.MILK_FAT]: milkFat,
        [Composition.LACTOSE]: lactose,
        [Composition.MILK_SNF]: msnf,
        [Composition.MILK_SNFS]: msnf - lactose,
        [Composition.TOTAL_SOLIDS]: milkFat + msnf,
        [Composition.POD]: (constants.LACTOSE_POD * lactose) / 100,
        [Composition.PAC_SGR]: (constants.LACTOSE_PAC * lactose) / 100,
      },
      {
        name,
        milkFat,
        msnf,
        lactose,
      }
    );
  }
}

export class Sweetener extends Ingredient {
  public category(): Category {
    return Category.SWEETENER;
  }

  constructor({
    name,
    pod,
    pac,
    sugar,
    solids,
  }: {
    name: string;
    pod: number;
    pac: number;
    sugar: number;
    solids: number;
  }) {
    super(
      name,
      {
        [Composition.SUGAR]: sugar,
        [Composition.OTHER_SNF]: solids,
        [Composition.OTHER_SNFS]: solids - sugar,
        [Composition.TOTAL_SOLIDS]: solids,
        [Composition.POD]: pod,
        [Composition.PAC_SGR]: pac,
      },
      {
        name,
        pod,
        pac,
        sugar,
        solids,
      }
    );
  }
}

export class Alcohol extends Ingredient {
  public category(): Category {
    return Category.ALCOHOL;
  }

  constructor({
    name,
    abv,
    sugar,
    fat,
    solids,
    salt,
  }: {
    name: string;
    abv: number;
    sugar?: number;
    fat?: number;
    solids?: number;
    salt?: number;
  }) {
    const alcohol = abv * constants.ABV_TO_ABW_RATIO;

    let otherSNF = undefined;
    let otherSNFS = undefined;

    if (abv < 0 || abv > 100) {
      throw new Error(`Invalid ABV: ${abv} must be between 0% and 100%`);
    }

    if (sugar != undefined || fat != undefined || salt != undefined) {
      if (solids === undefined || solids < (sugar ?? 0) + (fat ?? 0) + (salt ?? 0)) {
        throw new Error(
          `Invalid composition: Solids (${solids}%) must be at least the sum of ` +
            `Sugar (${sugar ?? 0}%), Fat (${fat ?? 0}%), and Salt (${salt ?? 0}%) ` +
            `for Alcohol ingredient`
        );
      }

      otherSNF = solids - (fat ?? 0);
      otherSNFS = solids - (fat ?? 0) - (sugar ?? 0);
    }

    super(
      name,
      {
        [Composition.OTHER_FAT]: fat,
        [Composition.SUGAR]: sugar,
        [Composition.OTHER_SNF]: otherSNF,
        [Composition.OTHER_SNFS]: otherSNFS,
        [Composition.TOTAL_SOLIDS]: solids,
        [Composition.SALT]: salt,
        [Composition.ALCOHOL]: alcohol,
        [Composition.POD]: sugar,
        [Composition.PAC_SGR]: sugar,
        [Composition.PAC_SLT]: salt ? (salt * constants.SALT_PAC) / 100 : undefined,
        [Composition.PAC_ALC]: (alcohol * constants.ALCOHOL_PAC) / 100,
      },
      {
        name,
        abv,
        sugar,
        fat,
        solids,
        salt,
      }
    );
  }
}

export class Chocolate extends Ingredient {
  public category(): Category {
    return Category.CHOCOLATE;
  }

  constructor({
    name,
    cacaoFat,
    sugar,
    water,
  }: {
    name: string;
    cacaoFat: number;
    sugar?: number;
    water?: number;
  }) {
    const solids = 100 - (water ?? 0);
    const cocoaSolids = solids - cacaoFat - (sugar ?? 0);

    if (cocoaSolids < 0) {
      throw new Error(
        `Invalid composition: Cocoa Solids cannot be negative for Chocolate ingredient`
      );
    }

    super(
      name,
      {
        [Composition.CACAO_FAT]: cacaoFat,
        [Composition.SUGAR]: sugar,
        [Composition.COCOA_SNF]: solids - cacaoFat,
        [Composition.COCOA_SNFS]: cocoaSolids,
        [Composition.TOTAL_SOLIDS]: solids,
        [Composition.POD]: sugar,
        [Composition.PAC_SGR]: sugar,
        [Composition.HF]:
          cacaoFat * constants.CACAO_FAT_HF + cocoaSolids * constants.COCOA_SOLIDS_HF,
      },
      {
        name,
        cacaoFat,
        sugar,
        water,
      }
    );
  }
}

export class Nut extends Ingredient {
  public category(): Category {
    return Category.NUT;
  }

  constructor({
    name,
    nutFat,
    sugar,
    water,
  }: {
    name: string;
    nutFat: number;
    sugar: number;
    water: number;
  }) {
    const solids = 100 - water;
    const nutSolids = solids - nutFat - sugar;

    if (nutSolids < 0) {
      throw new Error(`Invalid composition: Nut Solids cannot be negative for Nut ingredient`);
    }

    super(
      name,
      {
        [Composition.NUT_FAT]: nutFat,
        [Composition.SUGAR]: sugar,
        [Composition.NUT_SNF]: solids - nutFat,
        [Composition.NUT_SNFS]: nutSolids,
        [Composition.TOTAL_SOLIDS]: solids,
        [Composition.POD]: sugar,
        [Composition.PAC_SGR]: sugar,
        [Composition.HF]: nutFat * constants.NUT_FAT_HF,
      },
      {
        name,
        nutFat,
        sugar,
        water,
      }
    );
  }
}

export class Fruit extends Ingredient {
  public category(): Category {
    return Category.FRUIT;
  }

  sucrose?: number;
  glucose?: number;
  fructose?: number;

  constructor({
    name,
    water,
    sucrose,
    glucose,
    fructose,
    fat = 0,
  }: {
    name: string;
    water: number;
    sucrose?: number;
    glucose?: number;
    fructose?: number;
    fat?: number;
  }) {
    const sugar = (sucrose ?? 0) + (glucose ?? 0) + (fructose ?? 0);
    const solids = 100 - water;

    super(
      name,
      {
        [Composition.OTHER_FAT]: fat,
        [Composition.SUGAR]: sugar,
        [Composition.OTHER_SNF]: solids - fat,
        [Composition.OTHER_SNFS]: solids - fat - sugar,
        [Composition.TOTAL_SOLIDS]: solids,
        [Composition.POD]:
          (sucrose ?? 0) * constants.SUCROSE_POD +
          (glucose ?? 0) * constants.GLUCOSE_POD +
          (fructose ?? 0) * constants.FRUCTOSE_POD,
        [Composition.PAC_SGR]:
          (sucrose ?? 0) * constants.SUCROSE_PAC +
          (glucose ?? 0) * constants.GLUCOSE_PAC +
          (fructose ?? 0) * constants.FRUCTOSE_PAC,
      },
      {
        name,
        water,
        sucrose,
        glucose,
        fructose,
        fat,
      }
    );

    this.sucrose = sucrose;
    this.glucose = glucose;
    this.fructose = fructose;
  }
}

export class Egg extends Ingredient {
  public category(): Category {
    return Category.EGG;
  }

  constructor({
    name,
    eggFat,
    solids,
    lecithin,
  }: {
    name: string;
    eggFat: number;
    solids: number;
    lecithin: number;
  }) {
    if (solids < eggFat + lecithin) {
      throw new Error(
        `Invalid composition: Solids (${solids}%) must be at least the sum of ` +
          `Egg Fat (${eggFat}%) and Lecithin (${lecithin}%) for Egg ingredient`
      );
    }

    super(
      name,
      {
        [Composition.EGG_FAT]: eggFat,
        [Composition.EGG_SNF]: solids - eggFat,
        [Composition.EGG_SNFS]: solids - eggFat,
        [Composition.TOTAL_SOLIDS]: solids,
        [Composition.EMULSIFIERS]: lecithin,
      },
      {
        name,
        eggFat,
        solids,
        lecithin,
      }
    );
  }
}

export class Stabilizer extends Ingredient {
  public category(): Category {
    return Category.STABILIZER;
  }

  constructor({
    name,
    emulsifiers,
    stabilizers,
  }: {
    name: string;
    emulsifiers: number;
    stabilizers: number;
  }) {
    super(
      name,
      {
        [Composition.OTHER_SNF]: 100,
        [Composition.OTHER_SNFS]: 100,
        [Composition.TOTAL_SOLIDS]: 100,
        [Composition.EMULSIFIERS]: emulsifiers,
        [Composition.STABILIZERS]: stabilizers,
      },
      {
        name,
        emulsifiers,
        stabilizers,
      }
    );
  }
}

export class Miscellaneous extends Ingredient {
  public category(): Category {
    return Category.MISCELLANEOUS;
  }

  constructor({ name }: { name: string }) {
    super(name, {}, { name });
  }
}

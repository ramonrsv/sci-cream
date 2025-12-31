use std::sync::LazyLock;

use crate::{
    composition::{Composition, PAC, Solids, SolidsBreakdown, Sugars, Sweeteners},
    ingredients::{Category, Ingredient},
    specs::{AlcoholSpec, CompositionBasis, DairySpec, IngredientSpec, MicrosSpec, OneOffSpec, Spec, SweetenersSpec},
};

// Comp Specs
// --------------------------------------------

pub(crate) static SPEC_DAIRY_2_PERCENT: LazyLock<DairySpec> = LazyLock::new(|| DairySpec { fat: 2.0, msnf: None });

pub(crate) static SPEC_SWEETENERS_SUCROSE: LazyLock<SweetenersSpec> = LazyLock::new(|| SweetenersSpec {
    sweeteners: Sweeteners::new().sugars(Sugars::new().sucrose(100.0)),
    other_solids: None,
    basis: CompositionBasis::ByDryWeight { solids: 100.0 },
    pod: None,
    pac: None,
});

pub(crate) static SPEC_SWEETENERS_DEXTROSE: LazyLock<SweetenersSpec> = LazyLock::new(|| SweetenersSpec {
    sweeteners: Sweeteners::new().sugars(Sugars::new().glucose(100.0)),
    other_solids: None,
    basis: CompositionBasis::ByDryWeight { solids: 92.0 },
    pod: None,
    pac: None,
});

pub(crate) static SPEC_SWEETENERS_FRUCTOSE: LazyLock<SweetenersSpec> = LazyLock::new(|| SweetenersSpec {
    sweeteners: Sweeteners::new().sugars(Sugars::new().fructose(100.0)),
    other_solids: None,
    basis: CompositionBasis::ByDryWeight { solids: 100.0 },
    pod: None,
    pac: None,
});

pub(crate) static SPEC_SWEETENERS_INVERT_SUGAR: LazyLock<SweetenersSpec> = LazyLock::new(|| SweetenersSpec {
    sweeteners: Sweeteners::new().sugars(Sugars::new().glucose(42.5).fructose(42.5).sucrose(15.0)),
    other_solids: None,
    basis: CompositionBasis::ByDryWeight { solids: 80.0 },
    pod: None,
    pac: None,
});

pub(crate) static SPEC_SWEETENERS_HONEY: LazyLock<SweetenersSpec> = LazyLock::new(|| SweetenersSpec {
    sweeteners: Sweeteners::new().sugars(
        Sugars::new()
            .glucose(36.0)
            .fructose(41.0)
            .sucrose(2.0)
            .galactose(1.5)
            .maltose(1.5),
    ),
    other_solids: Some(1.0),
    basis: CompositionBasis::ByTotalWeight { water: 17.0 },
    pod: None,
    pac: None,
});

pub(crate) static SPEC_SWEETENERS_HFCS42: LazyLock<SweetenersSpec> = LazyLock::new(|| SweetenersSpec {
    sweeteners: Sweeteners::new()
        .sugars(Sugars::new().fructose(42.0).glucose(53.0))
        .polysaccharide(5.0),
    other_solids: None,
    basis: CompositionBasis::ByDryWeight { solids: 76.0 },
    pod: None,
    pac: None,
});

// Compositions
// --------------------------------------------

pub(crate) static COMP_MILK_2_PERCENT: LazyLock<Composition> = LazyLock::new(|| {
    Composition::new()
        .solids(Solids::new().milk(SolidsBreakdown::new().fats(2.0).sweeteners(4.8069).snfs(4.0131)))
        .sweeteners(Sweeteners::new().sugars(Sugars::new().lactose(4.8069)))
        .pod(0.769104)
        .pac(PAC::new().sugars(4.8069).msnf_ws_salts(3.2405))
});

pub(crate) static COMP_SUCROSE: LazyLock<Composition> = LazyLock::new(|| {
    Composition::new()
        .solids(Solids::new().other(SolidsBreakdown::new().sweeteners(100.0)))
        .sweeteners(Sweeteners::new().sugars(Sugars::new().sucrose(100.0)))
        .pod(100.0)
        .pac(PAC::new().sugars(100.0))
});

pub(crate) static COMP_DEXTROSE: LazyLock<Composition> = LazyLock::new(|| {
    Composition::new()
        .solids(Solids::new().other(SolidsBreakdown::new().sweeteners(92.0)))
        .sweeteners(Sweeteners::new().sugars(Sugars::new().glucose(92.0)))
        .pod(73.968)
        .pac(PAC::new().sugars(174.8))
});

pub(crate) static COMP_FRUCTOSE: LazyLock<Composition> = LazyLock::new(|| {
    Composition::new()
        .solids(Solids::new().other(SolidsBreakdown::new().sweeteners(100.0)))
        .sweeteners(Sweeteners::new().sugars(Sugars::new().fructose(100.0)))
        .pod(173.0)
        .pac(PAC::new().sugars(190.0))
});

// Ingredient specs
// --------------------------------------------

pub(crate) const ING_SPEC_MILK_2_PERCENT_STR: &str = r#"{
  "name": "2% Milk",
  "category": "Dairy",
  "DairySpec": {
    "fat": 2
  }
}"#;

pub(crate) const ING_SPEC_SUCROSE_STR: &str = r#"{
  "name": "Sucrose",
  "category": "Sweetener",
  "SweetenersSpec": {
    "sweeteners": {
      "sugars": {
        "sucrose": 100
      }
    },
    "ByDryWeight": {
      "solids": 100
    }
  }
}"#;

pub(crate) const ING_SPEC_DEXTROSE_STR: &str = r#"{
  "name": "Dextrose",
  "category": "Sweetener",
  "SweetenersSpec": {
    "sweeteners": {
      "sugars": {
        "glucose": 100
      }
    },
    "ByDryWeight": {
      "solids": 92
    }
  }
}"#;

pub(crate) const ING_SPEC_FRUCTOSE_STR: &str = r#"{
  "name": "Fructose",
  "category": "Sweetener",
  "SweetenersSpec": {
    "sweeteners": {
      "sugars": {
        "fructose": 100
      }
    },
    "ByDryWeight": {
      "solids": 100
    }
  }
}"#;

pub(crate) const ING_SPEC_SALT_STR: &str = r#"{
  "name": "Salt",
  "category": "Micro",
  "MicrosSpec": "Salt"
}"#;

pub(crate) const ING_SPEC_LECITHIN_STR: &str = r#"{
  "name": "Lecithin",
  "category": "Micro",
  "MicrosSpec": "Lecithin"
}"#;

pub(crate) const ING_SPEC_STABILIZER_STR: &str = r#"{
  "name": "Rich Ice Cream SB",
  "category": "Micro",
  "MicrosSpec": {
    "Stabilizer": {
      "strength": 100
    }
  }
}"#;

pub(crate) const ING_SPEC_LOUIS_STAB2K_STR: &str = r#"{
  "name": "Louis Francois Stab 2000",
  "category": "Micro",
  "MicrosSpec": {
    "EmulsifierStabilizer": {
      "emulsifier_strength": 100,
      "stabilizer_strength": 40
    }
  }
}"#;

pub(crate) const ING_40_ABV_SPIRITS_STR: &str = r#"{
  "name": "40% ABV Spirit",
  "category": "Alcohol",
  "AlcoholSpec": {
    "abv": 40
  }
}"#;

pub(crate) const ING_BAILEYS_IRISH_CREAM_STR: &str = r#"{
    "name": "Baileys Irish Cream",
    "category": "Alcohol",
    "AlcoholSpec": {
      "abv": 17,
      "sugar": 18,
      "fat": 13.6
    }
}"#;

pub(crate) static ING_SPEC_WATER_STR: &str = r#"{
  "name": "Water",
  "category": "Miscellaneous",
  "OneOffSpec": "Water"
}"#;

pub(crate) static ING_SPEC_MILK_2_PERCENT: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
    name: "2% Milk".to_string(),
    category: Category::Dairy,
    spec: Spec::DairySpec(*SPEC_DAIRY_2_PERCENT),
});

pub(crate) static ING_SPEC_SUCROSE: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
    name: "Sucrose".to_string(),
    category: Category::Sweetener,
    spec: Spec::SweetenersSpec(*SPEC_SWEETENERS_SUCROSE),
});

pub(crate) static ING_SPEC_DEXTROSE: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
    name: "Dextrose".to_string(),
    category: Category::Sweetener,
    spec: Spec::SweetenersSpec(*SPEC_SWEETENERS_DEXTROSE),
});

pub(crate) static ING_SPEC_FRUCTOSE: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
    name: "Fructose".to_string(),
    category: Category::Sweetener,
    spec: Spec::SweetenersSpec(*SPEC_SWEETENERS_FRUCTOSE),
});

pub(crate) static ING_SPEC_INVERT_SUGAR: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
    name: "Invert Sugar".to_string(),
    category: Category::Sweetener,
    spec: Spec::SweetenersSpec(*SPEC_SWEETENERS_INVERT_SUGAR),
});

pub(crate) static ING_SPEC_HONEY: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
    name: "Honey".to_string(),
    category: Category::Sweetener,
    spec: Spec::SweetenersSpec(*SPEC_SWEETENERS_HONEY),
});

pub(crate) static ING_SPEC_HFCS42: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
    name: "HFCS 42".to_string(),
    category: Category::Sweetener,
    spec: Spec::SweetenersSpec(*SPEC_SWEETENERS_HFCS42),
});

pub(crate) static ING_SPEC_SALT: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
    name: "Salt".to_string(),
    category: Category::Micro,
    spec: Spec::MicrosSpec(MicrosSpec::Salt),
});

pub(crate) static ING_SPEC_LECITHIN: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
    name: "Lecithin".to_string(),
    category: Category::Micro,
    spec: Spec::MicrosSpec(MicrosSpec::Lecithin),
});

pub(crate) static ING_SPEC_STABILIZER: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
    name: "Rich Ice Cream SB".to_string(),
    category: Category::Micro,
    spec: Spec::MicrosSpec(MicrosSpec::Stabilizer { strength: 100.0 }),
});

pub(crate) static ING_SPEC_LOUIS_STAB2K: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
    name: "Louis Francois Stab 2000".to_string(),
    category: Category::Micro,
    spec: Spec::MicrosSpec(MicrosSpec::EmulsifierStabilizer {
        emulsifier_strength: 100.0,
        stabilizer_strength: 40.0,
    }),
});

pub(crate) static ING_SPEC_40_ABV_SPIRIT: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
    name: "40% ABV Spirit".to_string(),
    category: Category::Alcohol,
    spec: Spec::AlcoholSpec(AlcoholSpec {
        abv: 40.0,
        sugar: None,
        fat: None,
        solids: None,
    }),
});

pub(crate) static ING_SPEC_BAILEYS_IRISH_CREAM: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
    name: "Baileys Irish Cream".to_string(),
    category: Category::Alcohol,
    spec: Spec::AlcoholSpec(AlcoholSpec {
        abv: 17.0,
        sugar: Some(18.0),
        fat: Some(13.6),
        solids: None,
    }),
});

pub(crate) static ING_SPEC_WATER: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
    name: "Water".to_string(),
    category: Category::Miscellaneous,
    spec: Spec::OneOffSpec(OneOffSpec::Water),
});

// Ingredients
// --------------------------------------------

pub(crate) static ING_MILK_2_PERCENT: LazyLock<Ingredient> = LazyLock::new(|| Ingredient {
    name: "2% Milk".to_string(),
    category: Category::Dairy,
    composition: *COMP_MILK_2_PERCENT,
});

pub(crate) static ING_SUCROSE: LazyLock<Ingredient> = LazyLock::new(|| Ingredient {
    name: "Sucrose".to_string(),
    category: Category::Sweetener,
    composition: *COMP_SUCROSE,
});

pub(crate) static ING_DEXTROSE: LazyLock<Ingredient> = LazyLock::new(|| Ingredient {
    name: "Dextrose".to_string(),
    category: Category::Sweetener,
    composition: *COMP_DEXTROSE,
});

pub(crate) static ING_FRUCTOSE: LazyLock<Ingredient> = LazyLock::new(|| Ingredient {
    name: "Fructose".to_string(),
    category: Category::Sweetener,
    composition: *COMP_FRUCTOSE,
});

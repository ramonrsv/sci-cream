use std::sync::LazyLock;

use crate::{
    composition::{Composition, PAC, Solids, SolidsBreakdown, Sugars, Sweeteners},
    ingredients::{Category, Ingredient},
    specs::{DairySpec, IngredientSpec, Spec, SugarsSpec},
};

// Comp Specs
// --------------------------------------------

pub(crate) static SPEC_DAIRY_2_PERCENT: LazyLock<DairySpec> = LazyLock::new(|| DairySpec {
    fat: 2.0,
    msnf: None,
});

pub(crate) static SPEC_SUGARS_SUCROSE: LazyLock<SugarsSpec> = LazyLock::new(|| SugarsSpec {
    sugars: Sugars::new().sucrose(100.0),
    solids: 100.0,
});

pub(crate) static SPEC_SUGARS_DEXTROSE: LazyLock<SugarsSpec> = LazyLock::new(|| SugarsSpec {
    sugars: Sugars::new().glucose(100.0),
    solids: 100.0,
});

pub(crate) static SPEC_SUGARS_DEXTROSE_50_PERCENT: LazyLock<SugarsSpec> =
    LazyLock::new(|| SugarsSpec {
        sugars: Sugars::new().glucose(100.0),
        solids: 50.0,
    });

// Compositions
// --------------------------------------------

pub(crate) static COMP_MILK_2_PERCENT: LazyLock<Composition> = LazyLock::new(|| {
    Composition::new()
        .solids(
            Solids::new().milk(
                SolidsBreakdown::new()
                    .fats(2.0)
                    .sweeteners(4.8069)
                    .snfs(4.0131),
            ),
        )
        .sweeteners(Sweeteners::new().sugars(Sugars::new().lactose(4.8069)))
        .pod(0.769104)
        .pac(PAC::new().sugars(4.8069))
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
        .solids(Solids::new().other(SolidsBreakdown::new().sweeteners(100.0)))
        .sweeteners(Sweeteners::new().sugars(Sugars::new().glucose(100.0)))
        .pod(70.0)
        .pac(PAC::new().sugars(190.0))
});

pub(crate) static COMP_DEXTROSE_50_PERCENT: LazyLock<Composition> = LazyLock::new(|| {
    Composition::new()
        .solids(Solids::new().other(SolidsBreakdown::new().sweeteners(50.0)))
        .sweeteners(Sweeteners::new().sugars(Sugars::new().glucose(50.0)))
        .pod(35.0)
        .pac(PAC::new().sugars(95.0))
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

pub(crate) const ING_SPEC_SUGARS_SUCROSE_STR: &str = r#"{
  "name": "Sucrose",
  "category": "Sweetener",
  "SugarsSpec": {
    "sugars": {
      "sucrose": 100
    },
    "solids": 100
  }
}"#;

pub(crate) const ING_SPEC_SUGARS_DEXTROSE_STR: &str = r#"{
  "name": "Dextrose",
  "category": "Sweetener",
  "SugarsSpec": {
    "sugars": {
      "glucose": 100
    },
    "solids": 100
  }
}"#;

pub(crate) static ING_SPEC_MILK_2_PERCENT: LazyLock<IngredientSpec> =
    LazyLock::new(|| IngredientSpec {
        name: "2% Milk".to_string(),
        category: Category::Dairy,
        spec: Spec::DairySpec(*SPEC_DAIRY_2_PERCENT),
    });

pub(crate) static ING_SPEC_SUGARS_SUCROSE: LazyLock<IngredientSpec> =
    LazyLock::new(|| IngredientSpec {
        name: "Sucrose".to_string(),
        category: Category::Sweetener,
        spec: Spec::SugarsSpec(*SPEC_SUGARS_SUCROSE),
    });

pub(crate) static ING_SPEC_SUGARS_DEXTROSE: LazyLock<IngredientSpec> =
    LazyLock::new(|| IngredientSpec {
        name: "Dextrose".to_string(),
        category: Category::Sweetener,
        spec: Spec::SugarsSpec(*SPEC_SUGARS_DEXTROSE),
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

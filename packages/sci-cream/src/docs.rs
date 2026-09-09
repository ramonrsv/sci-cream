#![doc = include_str!("../docs/table-of-contents.md")]
#![doc = include_str!("../docs/sweeteners.md")]
#![doc = include_str!("../docs/sugars.md")]
#![doc = include_str!("../docs/polyols.md")]
#![doc = include_str!("../docs/artificial-sweeteners.md")]
#![doc = include_str!("../docs/fibers.md")]
#![doc = include_str!("../docs/glucose-syrup.md")]
#![doc = include_str!("../docs/freezing-point-depression.md")]
#![doc = include_str!("../docs/stabilizers.md")]
#![doc = include_str!("../docs/emulsifiers.md")]
#![doc = include_str!("../docs/chocolate.md")]
// References
#![doc = include_str!("../docs/references/literature.md")]
#![doc = include_str!("../docs/references/index/116.md")]

#[cfg(doc)]
use crate::{
    composition::{ArtificialSweeteners, CompKey, Composition, Emulsifiers, Fibers, Polyols, Stabilizers, Sugars},
    constants::{
        self,
        composition::dairy::{
            STD_CASEIN_PROTEIN_IN_MSNF_PROTEIN, STD_PROTEIN_IN_MSNF, STD_WHEY_PROTEIN_IN_MSNF_PROTEIN,
        },
    },
    specs::ChocolateSpec,
};

/// Asserts for floating point comparisons in doc tests
#[macro_export(local_inner_macros)]
macro_rules! assert_eq_float {
    ($given:expr, $expected:expr) => {
        approx::assert_abs_diff_eq!($given, $expected, epsilon = 0.001)
    };
}

/// Main recipe as `OwnedLightRecipe` for doc tests
#[macro_export]
macro_rules! main_recipe {
    () => {
        [
            ("Whole Milk", 245.0),
            ("Whipping Cream", 215.0),
            ("Cocoa Powder, 17% Fat", 28.0),
            ("Skimmed Milk Powder", 21.0),
            ("Egg Yolk", 18.0),
            ("Dextrose", 45.0),
            ("Fructose", 32.0),
            ("Salt", 0.5),
            ("Stabilizer Blend", 1.25),
            ("Vanilla Extract", 6.0),
        ]
        .map(|(name, amount)| (name.to_string(), amount))
    };
}

/// Sample recipe for balancing in doc tests
#[macro_export]
macro_rules! recipe_for_balancing {
    () => {
        [
            ("Whole Milk", 0.0),
            ("Whipping Cream", 0.0),
            ("Cocoa Powder, 17% Fat", 0.0),
            ("95% Dark Chocolate", 0.0),
            ("Skimmed Milk Powder", 0.0),
            ("Egg Yolk", 0.0),
            ("Dextrose", 0.0),
            ("Fructose", 0.0),
            ("Salt", 0.0),
            ("Stabilizer Blend", 0.0),
            ("Vanilla Extract", 0.0),
        ]
        .map(|(name, amount)| (name.to_string(), amount))
    };
}

// @todo See if it's possible to export only for doc tests
pub use assert_eq_float;
pub use main_recipe;
pub use recipe_for_balancing;

#[expect(clippy::doc_markdown)] // _FoodData_ false positives
pub mod ingredients {
    #![doc = include_str!("../data/ingredients/alcohol.md")]
    #![doc = include_str!("../data/ingredients/chocolates.md")]
    #![doc = include_str!("../data/ingredients/dairy.md")]
    #![doc = include_str!("../data/ingredients/eggs.md")]
    #![doc = include_str!("../data/ingredients/emulsifiers.md")]
    #![doc = include_str!("../data/ingredients/flavourings.md")]
    #![doc = include_str!("../data/ingredients/fruits.md")]
    #![doc = include_str!("../data/ingredients/miscellaneous.md")]
    #![doc = include_str!("../data/ingredients/nuts.md")]
    #![doc = include_str!("../data/ingredients/stabilizers.md")]
    #![doc = include_str!("../data/ingredients/sweeteners.md")]
    // References
    #![doc = include_str!("../docs/references/literature.md")]
    #![doc = include_str!("../docs/references/index/117.md")]
    #![doc = include_str!("../docs/references/index/119.md")]
    #![doc = include_str!("../docs/references/index/122.md")]
    #![doc = include_str!("../docs/references/index/123.md")]
    #![doc = include_str!("../docs/references/index/124.md")]
    #![doc = include_str!("../docs/references/index/125.md")]
    #![doc = include_str!("../docs/references/index/126.md")]

    #[cfg(doc)]
    use crate::{
        constants::composition::dairy::{STD_LACTOSE_IN_MSNF, STD_PROTEIN_IN_MSNF},
        specs::{ChocolateSpec, CompositeSpec, NutSpec},
    };
}

pub mod recipes {
    #![doc = include_str!("../data/recipes/underbelly.md")]
    #![doc = include_str!("../data/recipes/corvitto.md")]
    #![doc = include_str!("../data/recipes/dana-cree.md")]
    #![doc = include_str!("../data/recipes/ice-cream-science.md")]
    // References
    #![doc = include_str!("../docs/references/literature.md")]

    #[cfg(doc)]
    use crate::constants::{
        density,
        fpd::{CORVITTO_PAC_TO_SERVING_TEMP_TABLE, SERVING_TEMP_X_AXIS},
        units,
    };
}

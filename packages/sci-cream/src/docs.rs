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
#![doc = include_str!("../docs/references/literature.md")]
#![doc = include_str!("../docs/references/index/116.md")]

#[cfg(doc)]
use crate::{
    composition::{ArtificialSweeteners, CompKey, Composition, Emulsifiers, Fibers, Polyols, Stabilizers, Sugars},
    constants::{
        self,
        composition::{STD_CASEIN_PROTEIN_IN_MSNF_PROTEIN, STD_PROTEIN_IN_MSNF, STD_WHEY_PROTEIN_IN_MSNF_PROTEIN},
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

// @todo See if it's possible to export only for doc tests
pub use assert_eq_float;
pub use main_recipe;

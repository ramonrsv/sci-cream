use approx::AbsDiffEq;
use serde::{Deserialize, Serialize};
use strum_macros::Display;

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

use crate::composition::Composition;

/// Ingredient categories
#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Display, Hash, Eq, PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
pub enum Category {
    Dairy,
    Sweetener,
    Fruit,
    Chocolate,
    Nut,
    Egg,
    Alcohol,
    Micro,
    Miscellaneous,
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(PartialEq, Serialize, Deserialize, Clone, Debug)]
pub struct Ingredient {
    #[cfg_attr(feature = "wasm", wasm_bindgen(getter_with_clone))]
    pub name: String,
    pub category: Category,
    pub composition: Composition,
}

impl AbsDiffEq for Ingredient {
    type Epsilon = f64;

    fn default_epsilon() -> Self::Epsilon {
        f64::default_epsilon()
    }

    fn abs_diff_eq(&self, other: &Self, epsilon: Self::Epsilon) -> bool {
        self.name.eq(&other.name)
            && self.category.eq(&other.category)
            && self.composition.abs_diff_eq(&other.composition, epsilon)
    }
}

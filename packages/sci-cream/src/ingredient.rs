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

#[cfg_attr(feature = "wasm", wasm_bindgen)]
impl Ingredient {
    #[cfg_attr(feature = "wasm", wasm_bindgen(constructor))]
    pub fn new(name: String, category: Category, composition: Composition) -> Self {
        Self {
            name,
            category,
            composition,
        }
    }
}

#[cfg(feature = "wasm")]
#[cfg_attr(coverage, coverage(off))]
pub mod wasm {
    use wasm_bindgen::prelude::*;

    use super::Ingredient;

    #[wasm_bindgen]
    impl Ingredient {
        /// Clones the Ingredient instance, useful when handling WASM objects in JavaScript.
        ///
        /// @todo This is a temporary workaround until better handling is implemented in app code.
        #[wasm_bindgen(js_name = "clone")]
        #[must_use]
        pub fn clone_wasm(&self) -> Ingredient {
            self.clone()
        }
    }
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

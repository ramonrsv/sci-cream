use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use strum_macros::Display;

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

#[cfg(feature = "backend")]
use diesel::{Queryable, Selectable};

use crate::composition::Composition;

/// Ingredient categories
#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Display, Hash, Eq, PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
pub enum Category {
    Dairy,
    Sweetener,
    Alcohol,
    Chocolate,
    Nut,
    Fruit,
    Egg,
    Stabilizer,
    Miscellaneous,
}

/// Composition component of ingredients, usually as a percentage by weight
#[allow(nonstandard_style)]
#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Hash, Eq, PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
pub enum CompositionEnum {
    Milk_Fat,
    Egg_Fat,
    Cacao_Fat,
    Nut_Fat,
    Other_Fats,

    Lactose,
    Sugar,

    Milk_SNF,
    Egg_SNF,
    Cocoa_SNF,
    Nut_SNF,
    Other_SNF,

    Milk_SNFS,
    Egg_SNFS,
    Cocoa_SNFS,
    Nut_SNFS,
    Other_SNFS,

    Total_Solids,

    Salt,
    Alcohol,
    Emulsifiers,
    Stabilizers,

    POD,
    PAC_sgr,
    PAC_slt,
    PAC_alc,
    Hardness_Factor,
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[cfg_attr(feature = "backend", derive(Queryable, Selectable), diesel(table_name = ingredients))]
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Ingredient {
    #[cfg_attr(feature = "wasm", wasm_bindgen(getter_with_clone))]
    pub name: String,
    pub category: Category,
    pub composition: Composition,
}

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

use crate::{composition::CompKey, fpd::FpdKey, recipe::PropKey};

pub trait KeyAsStrings {
    fn as_med_str(&self) -> &'static str;
}

impl KeyAsStrings for CompKey {
    fn as_med_str(&self) -> &'static str {
        match self {
            CompKey::MilkFat => "Milk Fat",
            CompKey::MSNF => "MSNF",
            CompKey::MilkSNFS => "Milk SNFS",
            CompKey::MilkSolids => "Milk Solids",

            CompKey::CocoaButter => "Cocoa Butter",
            CompKey::CocoaSolids => "Cocoa Solids",
            CompKey::CacaoSolids => "Cacao Solids",

            CompKey::NutFat => "Nut Fat",
            CompKey::NutSNFS => "Nut SNFS",
            CompKey::NutSolids => "Nut Solids",

            CompKey::EggFat => "Egg Fat",
            CompKey::EggSNFS => "Egg SNFS",
            CompKey::EggSolids => "Egg Solids",

            CompKey::OtherFats => "Other Fats",
            CompKey::OtherSNFS => "Other SNFS",

            CompKey::TotalFats => "T. Fats",
            CompKey::TotalSNF => "T. SNF",
            CompKey::TotalSNFS => "T. SNFS",
            CompKey::TotalSolids => "T. Solids",

            CompKey::Water => "Water",

            CompKey::Sugars => "Sugars",
            CompKey::Glucose => "Glucose",
            CompKey::Fructose => "Fructose",
            CompKey::Galactose => "Galactose",
            CompKey::Sucrose => "Sucrose",
            CompKey::Lactose => "Lactose",
            CompKey::Maltose => "Maltose",
            CompKey::Polysaccharides => "Polysaccharides",
            CompKey::ArtificialSweeteners => "Artificial",
            CompKey::TotalSweeteners => "T. Sweeteners",

            CompKey::Alcohol => "Alcohol",
            CompKey::ABV => "ABV",

            CompKey::Salt => "Salt",
            CompKey::Lecithin => "Lecithin",
            CompKey::Emulsifiers => "Emulsifiers",
            CompKey::Stabilizers => "Stabilizers",
            CompKey::EmulsifiersPerFat => "Emul./Fat",
            CompKey::StabilizersPerWater => "Stab./Water",

            CompKey::POD => "POD",

            CompKey::PACsgr => "PACsgr",
            CompKey::PACslt => "PACslt",
            CompKey::PACmlk => "PACmlk",
            CompKey::PACalc => "PACalc",
            CompKey::PACtotal => "PAC",
            CompKey::AbsPAC => "Abs.PAC",
            CompKey::HF => "HF",
        }
    }
}

impl KeyAsStrings for FpdKey {
    fn as_med_str(&self) -> &'static str {
        match self {
            FpdKey::FPD => "FPD",
            FpdKey::ServingTemp => "Serving Temp",
            FpdKey::HardnessAt14C => "Hardness @-14°C",
        }
    }
}

impl KeyAsStrings for PropKey {
    fn as_med_str(&self) -> &'static str {
        match self {
            PropKey::CompKey(comp_key) => comp_key.as_med_str(),
            PropKey::FpdKey(fpd_key) => fpd_key.as_med_str(),
        }
    }
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
pub fn composition_value_as_quantity(comp: f64, qty: f64) -> f64 {
    (comp * qty) / 100.0
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
pub fn composition_value_as_percentage(comp: f64, qty: f64, mix_total: f64) -> f64 {
    (comp * qty) / mix_total
}

#[cfg(feature = "wasm")]
pub mod wasm {
    use super::*;

    #[wasm_bindgen]
    pub fn comp_key_as_med_str(key: CompKey) -> String {
        key.as_med_str().to_string()
    }

    #[wasm_bindgen]
    pub fn fpd_key_as_med_str(key: FpdKey) -> String {
        key.as_med_str().to_string()
    }
}

#[cfg(test)]
mod tests {
    use std::collections::HashSet;

    use strum::IntoEnumIterator;

    use crate::tests::asserts::shadow_asserts::assert_eq;
    #[allow(unused_imports)] // @todo Remove when used.
    use crate::tests::asserts::*;

    use super::*;

    #[test]
    fn comp_keys_as_med_str() {
        let some_expected = vec![
            "Milk Fat",
            "MSNF",
            "Milk SNFS",
            "Milk Solids",
            "Cocoa Butter",
            "Cocoa Solids",
            "Cacao Solids",
            "Nut Fat",
            "Nut SNFS",
            "Nut Solids",
            "Egg Fat",
            "Egg SNFS",
            "Egg Solids",
            "Other Fats",
            "Other SNFS",
            "T. Fats",
            "T. SNF",
            "T. SNFS",
            "T. Solids",
            "Water",
            "Sugars",
            "Glucose",
            "Fructose",
            "Galactose",
            "Sucrose",
            "Lactose",
            "Maltose",
            "Polysaccharides",
            "Artificial",
            "T. Sweeteners",
            "Alcohol",
            "ABV",
            "Salt",
            "Lecithin",
            "Emulsifiers",
            "Stabilizers",
            "Emul./Fat",
            "Stab./Water",
            "POD",
            "PACsgr",
            "PACslt",
            "PACmlk",
            "PACalc",
            "PAC",
            "Abs.PAC",
            "HF",
        ];

        let actual_set: HashSet<&'static str> = CompKey::iter().map(|h| h.as_med_str()).collect();

        for expected in some_expected {
            assert_true!(actual_set.contains(expected));
        }
    }

    #[test]
    fn fpd_keys_as_med_str() {
        let expected_vec = vec!["FPD", "Serving Temp", "Hardness @-14°C"];

        let actual_vec: Vec<&'static str> = FpdKey::iter().map(|h| h.as_med_str()).collect();
        assert_eq!(actual_vec, expected_vec);
    }

    #[test]
    fn prop_keys_as_med_str() {
        assert_eq!(PropKey::CompKey(CompKey::MilkFat).as_med_str(), "Milk Fat");
        assert_eq!(PropKey::FpdKey(FpdKey::FPD).as_med_str(), "FPD");
    }
}

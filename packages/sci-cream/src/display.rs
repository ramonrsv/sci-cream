#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

use crate::composition::CompKey;

impl CompKey {
    pub fn as_med_str(&self) -> &'static str {
        match self {
            CompKey::MilkFat => "Milk Fat",
            CompKey::CacaoFat => "Cacao Fat",
            CompKey::NutFat => "Nut Fat",
            CompKey::EggFat => "Egg Fat",
            CompKey::OtherFat => "Other Fat",
            CompKey::TotalFat => "T. Fat",
            CompKey::Lactose => "Lactose",
            CompKey::Sugars => "Sugars",
            CompKey::ArtificialSweeteners => "Artificial",
            CompKey::MSNF => "MSNF",
            CompKey::MilkSNFS => "Milk SNFS",
            CompKey::CocoaSNFS => "Cocoa SNFS",
            CompKey::NutSNFS => "Nut SNFS",
            CompKey::EggSNFS => "Egg SNFS",
            CompKey::OtherSNFS => "Other SNFS",
            CompKey::TotalSolids => "T. Solids",
            CompKey::Salt => "Salt",
            CompKey::Alcohol => "Alcohol",
            CompKey::Emulsifiers => "Emulsifiers",
            CompKey::Stabilizers => "Stabilizers",
            CompKey::POD => "POD",
            CompKey::PACsgr => "PAC sgr",
            CompKey::PACslt => "PAC slt",
            CompKey::PACalc => "PAC alc",
            CompKey::PACtotal => "PAC",
            CompKey::HF => "HF",
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
pub mod js {
    use super::*;

    #[wasm_bindgen]
    pub fn comp_key_as_med_str_js(key: CompKey) -> String {
        key.as_med_str().to_string()
    }
}

#[cfg(test)]
mod tests {
    use strum::IntoEnumIterator;

    use crate::tests::asserts::shadow_asserts::assert_eq;
    #[allow(unused_imports)] // @todo Remove when used.
    use crate::tests::asserts::*;

    use super::*;

    #[test]
    fn comp_keys_as_med_str() {
        let expected_vec = vec![
            "Milk Fat",
            "Cacao Fat",
            "Nut Fat",
            "Egg Fat",
            "Other Fat",
            "T. Fat",
            "Lactose",
            "Sugars",
            "Artificial",
            "MSNF",
            "Milk SNFS",
            "Cocoa SNFS",
            "Nut SNFS",
            "Egg SNFS",
            "Other SNFS",
            "T. Solids",
            "Salt",
            "Alcohol",
            "Emulsifiers",
            "Stabilizers",
            "POD",
            "PAC sgr",
            "PAC slt",
            "PAC alc",
            "PAC",
            "HF",
        ];

        let actual_vec: Vec<&'static str> = CompKey::iter().map(|h| h.as_med_str()).collect();

        assert_eq!(actual_vec, expected_vec);
    }
}

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

use crate::{composition::CompKey, recipe::PropKey};

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
            CompKey::EmulsifiersPerFat => "Emul./Fat",
            CompKey::StabilizersPerWater => "Stab./Water",
            CompKey::POD => "POD",
            CompKey::PACsgr => "PACsgr",
            CompKey::PACslt => "PACslt",
            CompKey::PACalc => "PACalc",
            CompKey::PACtotal => "PAC",
            CompKey::AbsPAC => "Abs.PAC",
            CompKey::HF => "HF",
        }
    }
}

impl PropKey {
    pub fn as_med_str(&self) -> &'static str {
        match self {
            PropKey::MilkFat => CompKey::MilkFat.as_med_str(),
            PropKey::CacaoFat => CompKey::CacaoFat.as_med_str(),
            PropKey::NutFat => CompKey::NutFat.as_med_str(),
            PropKey::EggFat => CompKey::EggFat.as_med_str(),
            PropKey::OtherFat => CompKey::OtherFat.as_med_str(),
            PropKey::TotalFat => CompKey::TotalFat.as_med_str(),
            PropKey::Lactose => CompKey::Lactose.as_med_str(),
            PropKey::Sugars => CompKey::Sugars.as_med_str(),
            PropKey::ArtificialSweeteners => CompKey::ArtificialSweeteners.as_med_str(),
            PropKey::MSNF => CompKey::MSNF.as_med_str(),
            PropKey::MilkSNFS => CompKey::MilkSNFS.as_med_str(),
            PropKey::CocoaSNFS => CompKey::CocoaSNFS.as_med_str(),
            PropKey::NutSNFS => CompKey::NutSNFS.as_med_str(),
            PropKey::EggSNFS => CompKey::EggSNFS.as_med_str(),
            PropKey::OtherSNFS => CompKey::OtherSNFS.as_med_str(),
            PropKey::TotalSolids => CompKey::TotalSolids.as_med_str(),
            PropKey::Salt => CompKey::Salt.as_med_str(),
            PropKey::Alcohol => CompKey::Alcohol.as_med_str(),
            PropKey::Emulsifiers => CompKey::Emulsifiers.as_med_str(),
            PropKey::Stabilizers => CompKey::Stabilizers.as_med_str(),
            PropKey::EmulsifiersPerFat => CompKey::EmulsifiersPerFat.as_med_str(),
            PropKey::StabilizersPerWater => CompKey::StabilizersPerWater.as_med_str(),
            PropKey::POD => CompKey::POD.as_med_str(),
            PropKey::PACsgr => CompKey::PACsgr.as_med_str(),
            PropKey::PACslt => CompKey::PACslt.as_med_str(),
            PropKey::PACalc => CompKey::PACalc.as_med_str(),
            PropKey::PACtotal => CompKey::PACtotal.as_med_str(),
            PropKey::AbsPAC => CompKey::AbsPAC.as_med_str(),
            PropKey::HF => CompKey::HF.as_med_str(),
            PropKey::FPD => "FPD",
            PropKey::ServingTemp => "Serving Temp",
            PropKey::HardnessAt14C => "Hardness @14C",
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

    #[wasm_bindgen]
    pub fn prop_key_as_med_str_js(key: PropKey) -> String {
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
            "Emul./Fat",
            "Stab./Water",
            "POD",
            "PACsgr",
            "PACslt",
            "PACalc",
            "PAC",
            "Abs.PAC",
            "HF",
        ];

        let actual_vec: Vec<&'static str> = CompKey::iter().map(|h| h.as_med_str()).collect();

        assert_eq!(actual_vec, expected_vec);
    }
}

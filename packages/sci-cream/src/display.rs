use serde::{Deserialize, Serialize};
#[allow(unused_imports)] // false positive
use strum::IntoEnumIterator;
use strum_macros::EnumIter;

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

use crate::composition::Composition;

#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(EnumIter, Hash, PartialEq, Eq, Serialize, Deserialize, Copy, Clone, Debug)]
pub enum FlatHeader {
    MilkFat,
    CacaoFat,
    NutFat,
    EggFat,
    OtherFat,
    TotalFat,
    Lactose,
    Sugars,
    ArtificialSweeteners,
    MSNF,
    MilkSNFS,
    CocoaSNFS,
    NutSNFS,
    EggSNFS,
    OtherSNFS,
    TotalSolids,
    Salt,
    Alcohol,
    Emulsifiers,
    Stabilizers,
    POD,
    PACsgr,
    PACslt,
    PACalc,
    PACtotal,
    HF,
}

impl FlatHeader {
    pub fn as_med_str(&self) -> &'static str {
        match self {
            FlatHeader::MilkFat => "Milk Fat",
            FlatHeader::CacaoFat => "Cacao Fat",
            FlatHeader::NutFat => "Nut Fat",
            FlatHeader::EggFat => "Egg Fat",
            FlatHeader::OtherFat => "Other Fat",
            FlatHeader::TotalFat => "T. Fat",
            FlatHeader::Lactose => "Lactose",
            FlatHeader::Sugars => "Sugars",
            FlatHeader::ArtificialSweeteners => "Artificial",
            FlatHeader::MSNF => "MSNF",
            FlatHeader::MilkSNFS => "Milk SNFS",
            FlatHeader::CocoaSNFS => "Cocoa SNFS",
            FlatHeader::NutSNFS => "Nut SNFS",
            FlatHeader::EggSNFS => "Egg SNFS",
            FlatHeader::OtherSNFS => "Other SNFS",
            FlatHeader::TotalSolids => "T. Solids",
            FlatHeader::Salt => "Salt",
            FlatHeader::Alcohol => "Alcohol",
            FlatHeader::Emulsifiers => "Emulsifiers",
            FlatHeader::Stabilizers => "Stabilizers",
            FlatHeader::POD => "POD",
            FlatHeader::PACsgr => "PAC sgr",
            FlatHeader::PACslt => "PAC slt",
            FlatHeader::PACalc => "PAC alc",
            FlatHeader::PACtotal => "PAC",
            FlatHeader::HF => "HF",
        }
    }
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
impl Composition {
    pub fn get_flat_header_value(&self, header: FlatHeader) -> f64 {
        match header {
            FlatHeader::MilkFat => self.solids.milk.fats,
            FlatHeader::CacaoFat => self.solids.cocoa.fats,
            FlatHeader::NutFat => self.solids.nut.fats,
            FlatHeader::EggFat => self.solids.egg.fats,
            FlatHeader::OtherFat => self.solids.other.fats,
            FlatHeader::TotalFat => self.solids.fats(),
            FlatHeader::Lactose => self.sweeteners.sugars.lactose,
            FlatHeader::Sugars => self.sweeteners.sugars.total(),
            FlatHeader::ArtificialSweeteners => self.sweeteners.artificial,
            FlatHeader::MSNF => self.solids.milk.snf(),
            FlatHeader::MilkSNFS => self.solids.milk.snfs,
            FlatHeader::CocoaSNFS => self.solids.cocoa.snfs,
            FlatHeader::NutSNFS => self.solids.nut.snfs,
            FlatHeader::EggSNFS => self.solids.egg.snfs,
            FlatHeader::OtherSNFS => self.solids.other.snfs,
            FlatHeader::TotalSolids => self.solids.total(),
            FlatHeader::Salt => self.micro.salt,
            FlatHeader::Alcohol => self.alcohol,
            FlatHeader::Emulsifiers => self.micro.emulsifiers,
            FlatHeader::Stabilizers => self.micro.stabilizers,
            FlatHeader::POD => self.pod,
            FlatHeader::PACsgr => self.pac.sugars,
            FlatHeader::PACslt => self.pac.salt,
            FlatHeader::PACalc => self.pac.alcohol,
            FlatHeader::PACtotal => self.pac.total(),
            FlatHeader::HF => self.pac.hardness_factor,
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
    pub fn flat_header_as_med_str_js(header: FlatHeader) -> String {
        header.as_med_str().to_string()
    }
}

#[cfg(test)]
mod tests {
    use std::collections::HashMap;

    use crate::tests::asserts::shadow_asserts::assert_eq;
    #[allow(unused_imports)] // @todo Remove when used.
    use crate::tests::asserts::*;

    use crate::tests::assets::*;

    use super::*;

    #[test]
    fn flat_headers_as_med_str() {
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

        let actual_vec: Vec<&'static str> = FlatHeader::iter().map(|h| h.as_med_str()).collect();

        assert_eq!(actual_vec, expected_vec);
    }

    #[test]
    fn composition_get_flat_header_value() {
        let expected = HashMap::from([
            (FlatHeader::MilkFat, 2.0),
            (FlatHeader::TotalFat, 2.0),
            (FlatHeader::MSNF, 8.82),
            (FlatHeader::MilkSNFS, 4.0131),
            (FlatHeader::Lactose, 4.8069),
            (FlatHeader::Sugars, 4.8069),
            (FlatHeader::ArtificialSweeteners, 0.0),
            (FlatHeader::TotalSolids, 10.82),
            (FlatHeader::POD, 0.769104),
            (FlatHeader::PACsgr, 4.8069),
            (FlatHeader::PACtotal, 4.8069),
        ]);

        FlatHeader::iter().for_each(|header| {
            assert_eq!(
                COMP_MILK_2_PERCENT.get_flat_header_value(header),
                *expected.get(&header).unwrap_or(&0.0),
                "Unexpected for FlatHeader::{:?}",
                header
            )
        });
    }
}

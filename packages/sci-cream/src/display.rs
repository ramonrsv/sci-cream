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
    pub fn contains_flat_header_key(&self, header: FlatHeader) -> bool {
        self.get_flat_header_value(header).is_some()
    }

    pub fn get_flat_header_value(&self, header: FlatHeader) -> Option<f64> {
        match header {
            FlatHeader::MilkFat => self.solids.and_then(|s| s.milk).map(|m| m.fats),
            FlatHeader::CacaoFat => self.solids.and_then(|s| s.cocoa).map(|c| c.fats),
            FlatHeader::NutFat => self.solids.and_then(|s| s.nut).map(|n| n.fats),
            FlatHeader::EggFat => self.solids.and_then(|s| s.egg).map(|e| e.fats),
            FlatHeader::OtherFat => self.solids.and_then(|s| s.other).map(|o| o.fats),
            FlatHeader::TotalFat => self.solids.map(|s| s.fats()),
            FlatHeader::Lactose => self
                .sweeteners
                .and_then(|sw| sw.sugars)
                .and_then(|s| s.lactose),
            FlatHeader::Sugars => self.sweeteners.and_then(|sw| sw.sugars).map(|s| s.total()),
            FlatHeader::ArtificialSweeteners => self.sweeteners.and_then(|sw| sw.artificial),
            FlatHeader::MSNF => self.solids.and_then(|s| s.milk).map(|m| m.snf()),
            FlatHeader::MilkSNFS => self.solids.and_then(|s| s.milk).map(|m| m.snfs),
            FlatHeader::CocoaSNFS => self.solids.and_then(|s| s.cocoa).map(|c| c.snfs),
            FlatHeader::NutSNFS => self.solids.and_then(|s| s.nut).map(|n| n.snfs),
            FlatHeader::EggSNFS => self.solids.and_then(|s| s.egg).map(|e| e.snfs),
            FlatHeader::OtherSNFS => self.solids.and_then(|s| s.other).map(|o| o.snfs),
            FlatHeader::TotalSolids => self.solids.map(|s| s.total()),
            FlatHeader::Salt => self.micro.and_then(|m| m.salt),
            FlatHeader::Alcohol => self.alcohol,
            FlatHeader::Emulsifiers => self.micro.and_then(|m| m.emulsifiers),
            FlatHeader::Stabilizers => self.micro.and_then(|m| m.stabilizers),
            FlatHeader::POD => self.pod,
            FlatHeader::PACsgr => self.pac.and_then(|p| p.sugars),
            FlatHeader::PACslt => self.pac.and_then(|p| p.salt),
            FlatHeader::PACalc => self.pac.and_then(|p| p.alcohol),
            FlatHeader::PACtotal => self.pac.map(|p| p.total()),
            FlatHeader::HF => self.pac.and_then(|p| p.hardness_factor),
        }
    }
}

#[cfg(feature = "wasm")]
pub mod js {
    use super::*;

    #[wasm_bindgen]
    pub fn flat_header_as_med_str_js(header: JsValue) -> String {
        serde_wasm_bindgen::from_value::<FlatHeader>(header)
            .unwrap()
            .as_med_str()
            .to_string()
    }
}

#[cfg(test)]
mod tests {
    use crate::tests::asserts::shadow_asserts::assert_eq;
    #[allow(unused_imports)] // @todo Remove when used.
    use crate::tests::asserts::*;

    use crate::tests::assets::*;

    use super::*;

    #[test]
    fn flat_headers_as_med_str() {
        let expected_vec = vec![
            "Milk Fats",
            "MSNF",
            "Milk SNFS",
            "Lactose",
            "Sugars",
            "Artificial",
            "T. Solids",
            "POD",
            "PAC",
        ];

        let actual_vec: Vec<&'static str> = FlatHeader::iter().map(|h| h.as_med_str()).collect();

        assert_eq!(actual_vec, expected_vec);
    }

    #[test]
    fn composition_get_flat_header_value() {
        let expected_vec = vec![
            (FlatHeader::MilkFat, Some(2f64)),
            (FlatHeader::MSNF, Some(8.82f64)),
            (FlatHeader::MilkSNFS, Some(4.0131)),
            (FlatHeader::Lactose, Some(4.8069f64)),
            (FlatHeader::Sugars, Some(4.8069f64)),
            (FlatHeader::ArtificialSweeteners, None),
            (FlatHeader::TotalSolids, Some(10.82f64)),
            (FlatHeader::POD, Some(0.769104f64)),
            (FlatHeader::PACsgr, Some(4.8069f64)),
        ];

        let actual_vec: Vec<(FlatHeader, Option<f64>)> = FlatHeader::iter()
            .map(|h| (h, COMP_MILK_2_PERCENT.get_flat_header_value(h)))
            .collect();

        assert_eq!(actual_vec, expected_vec);
    }
}

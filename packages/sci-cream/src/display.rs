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
    MilkFats,
    MSNF,
    MilkSNFS,
    Lactose,
    Sugars,
    ArtificialSweeteners,
    TotalSolids,
    POD,
    PAC,
}

impl FlatHeader {
    pub fn as_med_str(&self) -> &'static str {
        match self {
            FlatHeader::MilkFats => "Milk Fats",
            FlatHeader::MSNF => "MSNF",
            FlatHeader::MilkSNFS => "Milk SNFS",
            FlatHeader::Lactose => "Lactose",
            FlatHeader::Sugars => "Sugars",
            FlatHeader::ArtificialSweeteners => "Artificial",
            FlatHeader::TotalSolids => "T. Solids",
            FlatHeader::POD => "POD",
            FlatHeader::PAC => "PAC",
        }
    }
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
impl Composition {
    pub fn contains_flat_header_key(&self, header: FlatHeader) -> bool {
        match header {
            FlatHeader::MilkFats => self.solids.and_then(|s| s.milk).is_some(),
            FlatHeader::MSNF => self.solids.and_then(|s| s.milk).is_some(),
            FlatHeader::MilkSNFS => self.solids.and_then(|s| s.milk).is_some(),
            FlatHeader::Lactose => self
                .sweeteners
                .and_then(|sw| sw.sugars)
                .and_then(|s| s.lactose)
                .is_some(),
            FlatHeader::Sugars => self.sweeteners.and_then(|sw| sw.sugars).is_some(),
            FlatHeader::ArtificialSweeteners => {
                self.sweeteners.and_then(|sw| sw.artificial).is_some()
            }
            FlatHeader::TotalSolids => self.solids.is_some(),
            FlatHeader::POD => self.sweeteners.is_some(),
            FlatHeader::PAC => self.pac.is_some(),
        }
    }

    pub fn get_flat_header_value(&self, header: FlatHeader) -> Option<f64> {
        match header {
            FlatHeader::MilkFats => self.solids.and_then(|s| s.milk).map(|m| m.fats),
            FlatHeader::MSNF => self.solids.and_then(|s| s.milk).map(|m| m.snf()),
            FlatHeader::MilkSNFS => self.solids.and_then(|s| s.milk).map(|m| m.snfs),
            FlatHeader::Lactose => self
                .sweeteners
                .and_then(|sw| sw.sugars)
                .and_then(|s| s.lactose),
            FlatHeader::Sugars => self.sweeteners.and_then(|sw| sw.sugars).map(|s| s.total()),
            FlatHeader::ArtificialSweeteners => self.sweeteners.and_then(|sw| sw.artificial),
            FlatHeader::TotalSolids => self.solids.map(|s| s.total()),
            FlatHeader::POD => self.sweeteners.map(|sw| sw.to_pod()),
            FlatHeader::PAC => self.pac.map(|p| p.total()),
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
            (FlatHeader::MilkFats, Some(2f64)),
            (FlatHeader::MSNF, Some(8.82f64)),
            (FlatHeader::MilkSNFS, Some(4.0131)),
            (FlatHeader::Lactose, Some(4.8069f64)),
            (FlatHeader::Sugars, Some(4.8069f64)),
            (FlatHeader::ArtificialSweeteners, None),
            (FlatHeader::TotalSolids, Some(10.82f64)),
            (FlatHeader::POD, Some(0.769104f64)),
            (FlatHeader::PAC, Some(4.8069f64)),
        ];

        let actual_vec: Vec<(FlatHeader, Option<f64>)> = FlatHeader::iter()
            .map(|h| (h, COMP_MILK_2_PERCENT.get_flat_header_value(h)))
            .collect();

        assert_eq!(actual_vec, expected_vec);
    }
}

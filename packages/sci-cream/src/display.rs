use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use strum::IntoEnumIterator;
use strum_macros::EnumIter;

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

use crate::{
    Sweeteners,
    composition::{Composition, Solids, Sugars},
};

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
    pub fn headers() -> Vec<FlatHeader> {
        Self::iter().collect()
    }

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

impl Composition {
    pub fn to_flat_representation(&self) -> HashMap<FlatHeader, f64> {
        let mut ret = HashMap::new();

        if let Some(solids) = self.solids {
            ret.insert(FlatHeader::TotalSolids, solids.total());

            if let Some(milk) = solids.milk {
                ret.insert(FlatHeader::MilkFats, milk.fats);
                ret.insert(FlatHeader::MSNF, milk.snf());
                ret.insert(FlatHeader::MilkSNFS, milk.snfs);
            }
        };

        if let Some(sweeteners) = self.sweeteners {
            ret.insert(FlatHeader::POD, sweeteners.to_pod());
            ret.insert(FlatHeader::PAC, self.pac.unwrap().total());

            let Sweeteners {
                sugars, artificial, ..
            } = sweeteners;

            if let Some(sugars) = sugars {
                ret.insert(FlatHeader::Sugars, sugars.total());

                if let Some(lactose) = sugars.lactose {
                    ret.insert(FlatHeader::Lactose, lactose);
                }
            }

            if let Some(artificial) = artificial {
                ret.insert(FlatHeader::ArtificialSweeteners, artificial);
            }
        };

        ret
    }
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
impl Composition {
    #[cfg(feature = "wasm")]
    #[wasm_bindgen]
    pub fn to_flat_representation_js(&self) -> JsValue {
        serde_wasm_bindgen::to_value(&self.to_flat_representation()).unwrap()
    }
}

#[cfg(test)]
mod tests {
    use crate::tests::asserts::shadow_asserts::assert_eq;
    use crate::tests::asserts::*;

    use crate::tests::assets::*;

    use super::*;

    #[test]
    fn test_flat_headers() {
        let expected_vec = vec![
            ("Milk Fats", Some(2f64)),
            ("MSNF", Some(8.82f64)),
            ("Milk SNFS", Some(4.0131)),
            ("Lactose", Some(4.8069f64)),
            ("Sugars", Some(4.8069f64)),
            ("Artificial", None),
            ("T. Solids", Some(10.82f64)),
            ("POD", Some(0.769104f64)),
            ("PAC", Some(4.8069f64)),
        ];

        let actual_map = COMP_MILK_2_PERCENT.to_flat_representation();
        let actual_vec: Vec<(&'static str, Option<f64>)> = FlatHeader::headers()
            .into_iter()
            .map(|h| (h.as_med_str(), actual_map.get(&h).copied()))
            .collect();

        assert_eq!(actual_vec, expected_vec);
    }
}

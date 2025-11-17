use serde::{Deserialize, Serialize};

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

use crate::{
    composition::{Composition, Fats, Micro, PAC, Solids, SolidsNFNS, Sugar, Sweeteners},
    constants,
};

#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
pub struct DairySpec {
    pub fat: f64,
    pub msnf: Option<f64>,
}

#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
pub enum Spec {
    Dairy(DairySpec),
}

pub fn expand_dairy_spec(spec: DairySpec) -> Composition {
    let DairySpec { fat, msnf } = spec;

    let calculated_msnf = (100f64 - fat) * constants::STD_MSNF_IN_MILK_SERUM;
    let msnf = msnf.unwrap_or(calculated_msnf);
    let lactose = msnf * constants::STD_LACTOSE_IN_MSNF;

    let fats = Fats {
        milk: Some(fat),
        ..Fats::empty()
    };

    let sweeteners = Sweeteners {
        sugar: Some(Sugar {
            lactose: Some(lactose),
            ..Sugar::empty()
        }),
        ..Sweeteners::empty()
    };

    let solids_nfns = SolidsNFNS {
        milk: Some(msnf),
        ..SolidsNFNS::empty()
    };

    let solids = Solids {
        fats: Some(fats),
        sweeteners: Some(sweeteners),
        snfs: Some(solids_nfns),
    };

    let POD = sweeteners.to_pod();

    let PAC = PAC {
        sugar: Some(sweeteners.to_pac()),
        ..PAC::empty()
    };

    Composition {
        solids: Some(solids),
        micro: None,
        alcohol: None,
        pod: Some(POD),
        pac: Some(PAC),
    }
}

impl Spec {
    pub fn into_composition(self) -> Composition {
        match self {
            Spec::Dairy(spec) => expand_dairy_spec(spec),
        }
    }
}

#[cfg(test)]
mod test {
    use crate::tests::asserts::shadow_asserts::assert_eq;
    use crate::tests::asserts::*;

    use super::*;
    use crate::tests::{assets::*, util::TESTS_EPSILON};

    #[test]
    fn expand_dairy_spec() {
        let spec = DairySpec {
            fat: 2f64,
            msnf: None,
        };

        //assert_eq!(super::expand_dairy_spec(spec), *COMP_MILK_2_PERCENT);
        assert_abs_diff_eq!(
            super::expand_dairy_spec(spec),
            *COMP_MILK_2_PERCENT,
            epsilon = TESTS_EPSILON
        );

        assert_eq!(
            COMP_MILK_2_PERCENT
                .solids
                .unwrap()
                .sweeteners
                .unwrap()
                .sugar
                .unwrap()
                .total(),
            4.8069
        );
    }
}

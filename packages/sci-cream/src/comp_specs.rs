use serde::{Deserialize, Serialize};

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

use crate::{
    composition::{Composition, Fats, Micro, PAC, Solids, SolidsNF, SolidsNFS, Sugar, Sweeteners},
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
    let snfs = msnf - lactose;

    let sweeteners = Sweeteners::new().sugar(Sugar::new().lactose(lactose));
    let pod = sweeteners.to_pod();
    let pad = PAC::new().sugar(sweeteners.to_pac());

    Composition::new()
        .solids(
            Solids::new()
                .fats(Fats::new().milk(fat))
                .snf(SolidsNF::new().milk(msnf))
                .sweeteners(sweeteners)
                .snfs(SolidsNFS::new().milk(snfs)),
        )
        .pod(pod)
        .pac(pad)
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

        assert_abs_diff_eq!(
            super::expand_dairy_spec(spec),
            *COMP_MILK_2_PERCENT,
            epsilon = TESTS_EPSILON
        );

        let Solids {
            fats,
            snf,
            sweeteners,
            snfs,
        } = COMP_MILK_2_PERCENT.solids.unwrap();

        assert_eq!(fats.unwrap().milk.unwrap(), 2f64);
        assert_eq!(snf.unwrap().milk.unwrap(), 8.82);
        assert_eq!(sweeteners.unwrap().sugar.unwrap().lactose.unwrap(), 4.8069);
        assert_eq!(sweeteners.unwrap().sugar.unwrap().total(), 4.8069);
        assert_eq!(snfs.unwrap().milk.unwrap(), 4.0131);
    }
}

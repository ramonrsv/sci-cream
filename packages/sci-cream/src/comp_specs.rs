use serde::{Deserialize, Serialize};

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

use crate::{
    composition::{Composition, PAC, Solids, SolidsBreakdown, Sugars, Sweeteners},
    constants,
};

#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
pub struct DairySpec {
    pub fat: f64,
    pub msnf: Option<f64>,
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
pub struct SugarsSpec {
    pub sugars: Sugars,
    pub solids: f64,
}

#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
pub enum Spec {
    Dairy(DairySpec),
    SugarSpec(SugarsSpec),
}

pub fn expand_dairy_spec(spec: DairySpec) -> Composition {
    let DairySpec { fat, msnf } = spec;

    let calculated_msnf = (100f64 - fat) * constants::STD_MSNF_IN_MILK_SERUM;
    let msnf = msnf.unwrap_or(calculated_msnf);
    let lactose = msnf * constants::STD_LACTOSE_IN_MSNF;
    let snfs = msnf - lactose;

    let sweeteners = Sweeteners::new().sugars(Sugars::new().lactose(lactose));
    let pod = sweeteners.to_pod();
    let pad = PAC::new().sugars(sweeteners.to_pac());

    Composition::new()
        .solids(
            Solids::new().milk(
                SolidsBreakdown::new()
                    .fats(fat)
                    .sweeteners(lactose)
                    .snfs(snfs),
            ),
        )
        .sweeteners(sweeteners)
        .pod(pod)
        .pac(pad)
}

pub fn expand_auto_sweetener_spec(spec: SugarsSpec) -> Composition {
    let SugarsSpec { mut sugars, solids } = spec;

    [
        &mut sugars.glucose,
        &mut sugars.fructose,
        &mut sugars.galactose,
        &mut sugars.sucrose,
        &mut sugars.lactose,
        &mut sugars.maltose,
        &mut sugars.unspecified,
    ]
    .iter_mut()
    .for_each(|sugar| {
        if let Some(value) = sugar.as_mut() {
            *value = *value * solids / 100f64;
        }
    });

    Composition::new()
        .solids(Solids::new().other(SolidsBreakdown::new().sweeteners(sugars.total())))
        .sweeteners(Sweeteners::new().sugars(sugars))
        .pod(sugars.to_pod())
        .pac(PAC::new().sugars(sugars.to_pac()))
}

impl Spec {
    pub fn into_composition(self) -> Composition {
        match self {
            Spec::Dairy(spec) => expand_dairy_spec(spec),
            Spec::SugarSpec(spec) => expand_auto_sweetener_spec(spec),
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
        let Composition {
            solids, sweeteners, ..
        } = COMP_MILK_2_PERCENT.clone();

        let Solids { milk, .. } = solids.unwrap();
        let milk = milk.unwrap();

        assert_eq!(milk.fats, 2f64);
        assert_eq!(milk.sweeteners, 4.8069);
        assert_eq!(milk.snf(), 8.82);
        assert_eq!(milk.snfs, 4.0131);
        assert_eq!(milk.total(), 10.82);
        assert_eq!(milk.water(), 89.18);

        assert_eq!(sweeteners.unwrap().sugars.unwrap().lactose.unwrap(), 4.8069);
        assert_eq!(sweeteners.unwrap().sugars.unwrap().total(), 4.8069);

        assert_abs_diff_eq!(
            super::expand_dairy_spec(*SPEC_DAIRY_2_PERCENT),
            *COMP_MILK_2_PERCENT,
            epsilon = TESTS_EPSILON
        );
    }

    #[test]
    fn expand_auto_sweetener_spec_dextrose() {
        let Composition {
            solids, sweeteners, ..
        } = COMP_DEXTROSE.clone();

        let Solids { other, .. } = solids.unwrap();
        let other = other.unwrap();

        assert_eq!(other.fats, 0f64);
        assert_eq!(other.sweeteners, 100f64);
        assert_eq!(other.snf(), 100f64);
        assert_eq!(other.snfs, 0f64);
        assert_eq!(other.total(), 100f64);
        assert_eq!(other.water(), 0f64);

        assert_eq!(sweeteners.unwrap().sugars.unwrap().glucose.unwrap(), 100f64);
        assert_eq!(sweeteners.unwrap().sugars.unwrap().total(), 100f64);

        assert_abs_diff_eq!(
            super::expand_auto_sweetener_spec(*SPEC_SUGARS_DEXTROSE),
            *COMP_DEXTROSE,
            epsilon = TESTS_EPSILON
        );
    }

    #[test]
    fn expand_auto_sweetener_spec_dextrose_50_percent() {
        let Composition {
            solids, sweeteners, ..
        } = COMP_DEXTROSE_50_PERCENT.clone();

        let Solids { other, .. } = solids.unwrap();
        let other = other.unwrap();

        assert_eq!(other.fats, 0f64);
        assert_eq!(other.sweeteners, 50f64);
        assert_eq!(other.snf(), 50f64);
        assert_eq!(other.snfs, 0f64);
        assert_eq!(other.total(), 50f64);
        assert_eq!(other.water(), 50f64);

        assert_eq!(sweeteners.unwrap().sugars.unwrap().glucose.unwrap(), 50f64);
        assert_eq!(sweeteners.unwrap().sugars.unwrap().total(), 50f64);

        assert_eq!(
            super::expand_auto_sweetener_spec(*SPEC_SUGARS_DEXTROSE_50_PERCENT),
            *COMP_DEXTROSE_50_PERCENT
        );

        assert_abs_diff_eq!(
            super::expand_auto_sweetener_spec(*SPEC_SUGARS_DEXTROSE_50_PERCENT),
            *COMP_DEXTROSE_50_PERCENT,
            epsilon = TESTS_EPSILON
        );
    }
}

use serde::{Deserialize, Serialize};

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

use crate::{
    composition::{Composition, PAC, Solids, SolidsBreakdown, Sugars, Sweeteners},
    constants,
    ingredients::{Category, Ingredient},
};

#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
pub struct DairySpec {
    pub fat: f64,
    pub msnf: Option<f64>,
}

#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
pub struct SugarsSpec {
    pub sugars: Sugars,
    pub solids: f64,
}

#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
pub enum Spec {
    DairySpec(DairySpec),
    SugarsSpec(SugarsSpec),
}

#[derive(PartialEq, Serialize, Deserialize, Clone, Debug)]
pub struct IngredientSpec {
    pub name: String,
    pub category: Category,
    #[serde(flatten)]
    pub spec: Spec,
}

impl Spec {
    pub fn into_composition(self) -> Composition {
        match self {
            Spec::DairySpec(spec) => expand_dairy_spec(spec),
            Spec::SugarsSpec(spec) => expand_sugars_spec(spec),
        }
    }
}

impl IngredientSpec {
    pub fn into_ingredient(self) -> Ingredient {
        Ingredient {
            name: self.name,
            category: self.category,
            composition: self.spec.into_composition(),
        }
    }
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

pub fn expand_sugars_spec(spec: SugarsSpec) -> Composition {
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
    .for_each(|sugar| **sugar *= solids / 100f64);

    Composition::new()
        .solids(Solids::new().other(SolidsBreakdown::new().sweeteners(sugars.total())))
        .sweeteners(Sweeteners::new().sugars(sugars))
        .pod(sugars.to_pod())
        .pac(PAC::new().sugars(sugars.to_pac()))
}

#[cfg(feature = "wasm")]
pub mod js {
    use super::*;

    #[wasm_bindgen]
    pub fn into_ingredient_from_spec_js(spec: JsValue) -> Ingredient {
        serde_wasm_bindgen::from_value::<IngredientSpec>(spec)
            .unwrap()
            .into_ingredient()
    }
}

#[cfg(test)]
mod test {
    use serde_json;

    use crate::tests::asserts::shadow_asserts::assert_eq;
    #[allow(unused_imports)] // @todo Remove when used.
    use crate::tests::asserts::*;

    use super::*;
    use crate::tests::{assets::*, util::TESTS_EPSILON};

    #[test]
    fn expand_dairy_spec() {
        let Composition {
            solids,
            sweeteners,
            micro,
            alcohol,
            pod,
            pac,
        } = COMP_MILK_2_PERCENT.clone();

        assert_eq!(solids.total(), 10.82f64);
        assert_eq!(solids.water(), 89.18f64);

        assert_eq!(micro.salt, 0f64);
        assert_eq!(micro.emulsifiers, 0f64);
        assert_eq!(micro.stabilizers, 0f64);
        assert_eq!(alcohol, 0f64);
        assert_eq!(pod, 0.769104f64);

        let Solids { milk, .. } = solids;

        assert_eq!(milk.fats, 2f64);
        assert_eq!(milk.sweeteners, 4.8069);
        assert_eq!(milk.snf(), 8.82);
        assert_eq!(milk.snfs, 4.0131);
        assert_eq!(milk.total(), 10.82);
        assert_eq!(milk.water(), 89.18);

        assert_eq!(sweeteners.sugars.lactose, 4.8069);
        assert_eq!(sweeteners.sugars.total(), 4.8069);

        assert_eq!(pac.sugars, 4.8069f64);
        assert_eq!(pac.total(), 4.8069f64);

        assert_abs_diff_eq!(
            super::expand_dairy_spec(*SPEC_DAIRY_2_PERCENT),
            *COMP_MILK_2_PERCENT,
            epsilon = TESTS_EPSILON
        );
    }

    #[test]
    fn expand_auto_sweetener_spec_sucrose() {
        let Composition {
            solids, sweeteners, ..
        } = COMP_SUCROSE.clone();

        assert_eq!(solids.total(), 100f64);
        assert_eq!(solids.water(), 0f64);

        let Solids { other, .. } = solids;

        assert_eq!(other.fats, 0f64);
        assert_eq!(other.sweeteners, 100f64);
        assert_eq!(other.snf(), 100f64);
        assert_eq!(other.snfs, 0f64);
        assert_eq!(other.total(), 100f64);
        assert_eq!(other.water(), 0f64);

        assert_eq!(sweeteners.sugars.sucrose, 100f64);
        assert_eq!(sweeteners.sugars.total(), 100f64);

        let pac = COMP_SUCROSE.pac;
        assert_eq!(pac.sugars, 100f64);
        assert_eq!(pac.total(), 100f64);

        assert_abs_diff_eq!(
            super::expand_sugars_spec(*SPEC_SUGARS_DEXTROSE),
            *COMP_DEXTROSE,
            epsilon = TESTS_EPSILON
        );
    }

    #[test]
    fn expand_auto_sweetener_spec_dextrose() {
        let Composition {
            solids, sweeteners, ..
        } = COMP_DEXTROSE.clone();

        assert_eq!(solids.total(), 100f64);
        assert_eq!(solids.water(), 0f64);

        let Solids { other, .. } = solids;

        assert_eq!(other.fats, 0f64);
        assert_eq!(other.sweeteners, 100f64);
        assert_eq!(other.snf(), 100f64);
        assert_eq!(other.snfs, 0f64);
        assert_eq!(other.total(), 100f64);
        assert_eq!(other.water(), 0f64);

        assert_eq!(sweeteners.sugars.glucose, 100f64);
        assert_eq!(sweeteners.sugars.total(), 100f64);

        let pac = COMP_DEXTROSE.pac;
        assert_eq!(pac.sugars, 190f64);
        assert_eq!(pac.total(), 190f64);

        assert_abs_diff_eq!(
            super::expand_sugars_spec(*SPEC_SUGARS_DEXTROSE),
            *COMP_DEXTROSE,
            epsilon = TESTS_EPSILON
        );
    }

    #[test]
    fn expand_auto_sweetener_spec_dextrose_50_percent() {
        let Composition {
            solids, sweeteners, ..
        } = COMP_DEXTROSE_50_PERCENT.clone();

        assert_eq!(solids.total(), 50f64);
        assert_eq!(solids.water(), 50f64);

        let Solids { other, .. } = solids;

        assert_eq!(other.fats, 0f64);
        assert_eq!(other.sweeteners, 50f64);
        assert_eq!(other.snf(), 50f64);
        assert_eq!(other.snfs, 0f64);
        assert_eq!(other.total(), 50f64);
        assert_eq!(other.water(), 50f64);

        assert_eq!(sweeteners.sugars.glucose, 50f64);
        assert_eq!(sweeteners.sugars.total(), 50f64);

        let pac = COMP_DEXTROSE_50_PERCENT.pac;
        assert_eq!(pac.sugars, 95f64);
        assert_eq!(pac.total(), 95f64);

        assert_abs_diff_eq!(
            super::expand_sugars_spec(*SPEC_SUGARS_DEXTROSE_50_PERCENT),
            *COMP_DEXTROSE_50_PERCENT,
            epsilon = TESTS_EPSILON
        );
    }

    #[test]
    fn deserialize_ingredient_spec() {
        [
            (ING_SPEC_MILK_2_PERCENT_STR, ING_SPEC_MILK_2_PERCENT.clone()),
            (ING_SPEC_SUGARS_SUCROSE_STR, ING_SPEC_SUGARS_SUCROSE.clone()),
            (
                ING_SPEC_SUGARS_DEXTROSE_STR,
                ING_SPEC_SUGARS_DEXTROSE.clone(),
            ),
        ]
        .iter()
        .for_each(|(spec_str, spec)| {
            assert_eq!(
                serde_json::from_str::<IngredientSpec>(spec_str).unwrap(),
                *spec
            );
        });
    }

    #[test]
    fn ingredient_spec_into_ingredient() {
        [
            (ING_SPEC_MILK_2_PERCENT.clone(), ING_MILK_2_PERCENT.clone()),
            (ING_SPEC_SUGARS_SUCROSE.clone(), ING_SUCROSE.clone()),
            (ING_SPEC_SUGARS_DEXTROSE.clone(), ING_DEXTROSE.clone()),
        ]
        .iter()
        .for_each(|(spec, ingredient)| {
            assert_abs_diff_eq!(
                spec.clone().into_ingredient(),
                *ingredient,
                epsilon = TESTS_EPSILON
            );
        });
    }
}

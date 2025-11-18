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
    SugarSpec(SugarsSpec),
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
            Spec::SugarSpec(spec) => expand_sugars_spec(spec),
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

#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn into_ingredient_from_spec_js(spec: JsValue) -> Ingredient {
    serde_wasm_bindgen::from_value::<IngredientSpec>(spec)
        .unwrap()
        .into_ingredient()
}

#[cfg(test)]
mod test {
    use serde_json;

    use crate::tests::asserts::shadow_asserts::assert_eq;
    use crate::tests::asserts::*;

    use super::*;
    use crate::tests::{assets::*, util::TESTS_EPSILON};

    #[test]
    fn expand_dairy_spec() {
        let Composition {
            solids, sweeteners, ..
        } = COMP_MILK_2_PERCENT.clone();

        assert_eq!(solids.unwrap().total(), 10.82f64);
        assert_eq!(solids.unwrap().water(), 89.18f64);

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

        let pac = COMP_MILK_2_PERCENT.pac.unwrap();
        assert_eq!(pac.sugars.unwrap(), 4.8069f64);
        assert_eq!(pac.total(), 4.8069f64);

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

        assert_eq!(solids.unwrap().total(), 100f64);
        assert_eq!(solids.unwrap().water(), 0f64);

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

        let pac = COMP_DEXTROSE.pac.unwrap();
        assert_eq!(pac.sugars.unwrap(), 190f64);
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

        assert_eq!(solids.unwrap().total(), 50f64);
        assert_eq!(solids.unwrap().water(), 50f64);

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

        let pac = COMP_DEXTROSE_50_PERCENT.pac.unwrap();
        assert_eq!(pac.sugars.unwrap(), 95f64);
        assert_eq!(pac.total(), 95f64);

        assert_abs_diff_eq!(
            super::expand_sugars_spec(*SPEC_SUGARS_DEXTROSE_50_PERCENT),
            *COMP_DEXTROSE_50_PERCENT,
            epsilon = TESTS_EPSILON
        );
    }

    #[test]
    fn deserialize_ingredient_spec() {
        assert_eq!(
            serde_json::from_str::<IngredientSpec>(ING_SPEC_MILK_2_PERCENT_STR).unwrap(),
            *ING_SPEC_MILK_2_PERCENT
        );
    }

    #[test]
    fn ingredient_spec_into_ingredient() {
        assert_abs_diff_eq!(
            ING_SPEC_MILK_2_PERCENT.clone().into_ingredient(),
            *ING_MILK_2_PERCENT,
            epsilon = TESTS_EPSILON
        );
    }
}

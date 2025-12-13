use serde::{Deserialize, Serialize};

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

#[cfg(feature = "diesel")]
use crate::diesel::ingredients;
#[cfg(feature = "diesel")]
use diesel::{Queryable, Selectable};

use crate::{
    composition::{Composition, PAC, Solids, SolidsBreakdown, Sugars, Sweeteners},
    constants,
    ingredients::{Category, Ingredient},
    recipe::ScaleComponents,
};

pub trait IntoComposition {
    fn into_composition(self) -> Composition;
}

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

#[cfg_attr(feature = "diesel", derive(Queryable, Selectable), diesel(table_name = ingredients))]
#[derive(PartialEq, Serialize, Deserialize, Clone, Debug)]
pub struct IngredientSpec {
    pub name: String,
    pub category: Category,
    #[serde(flatten)]
    pub spec: Spec,
}

impl IntoComposition for Spec {
    fn into_composition(self) -> Composition {
        match self {
            Spec::DairySpec(spec) => spec.into_composition(),
            Spec::SugarsSpec(spec) => spec.into_composition(),
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

impl IntoComposition for DairySpec {
    fn into_composition(self) -> Composition {
        let Self { fat, msnf } = self;

        let calculated_msnf = (100.0 - fat) * constants::STD_MSNF_IN_MILK_SERUM;
        let msnf = msnf.unwrap_or(calculated_msnf);
        let lactose = msnf * constants::STD_LACTOSE_IN_MSNF;
        let snfs = msnf - lactose;

        let sweeteners = Sweeteners::new().sugars(Sugars::new().lactose(lactose));
        let pod = sweeteners.to_pod().unwrap();
        let pad = PAC::new().sugars(sweeteners.to_pac().unwrap());

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
}

impl IntoComposition for SugarsSpec {
    fn into_composition(self) -> Composition {
        let Self { sugars, solids } = self;
        let sugars = sugars.scale(solids / 100.0);

        Composition::new()
            .solids(Solids::new().other(SolidsBreakdown::new().sweeteners(sugars.total())))
            .sweeteners(Sweeteners::new().sugars(sugars))
            .pod(sugars.to_pod())
            .pac(PAC::new().sugars(sugars.to_pac()))
    }
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
    use approx::assert_abs_diff_eq;

    use crate::tests::asserts::shadow_asserts::assert_eq;
    #[allow(unused_imports)] // @todo Remove when used.
    use crate::tests::asserts::*;

    use super::*;
    use crate::tests::{assets::*, util::TESTS_EPSILON};

    #[test]
    fn into_composition_dairy_spec() {
        let Composition {
            solids,
            sweeteners,
            micro,
            alcohol,
            pod,
            pac,
        } = *COMP_MILK_2_PERCENT;

        assert_eq!(solids.total(), 10.82);
        assert_eq!(COMP_MILK_2_PERCENT.water(), 89.18);

        assert_eq!(micro.salt, 0.0);
        assert_eq!(micro.emulsifiers, 0.0);
        assert_eq!(micro.stabilizers, 0.0);
        assert_eq!(alcohol, 0.0);
        assert_eq!(pod, 0.769104);

        let Solids { milk, .. } = solids;

        assert_eq!(milk.fats, 2.0);
        assert_eq!(milk.sweeteners, 4.8069);
        assert_eq!(milk.snf(), 8.82);
        assert_eq!(milk.snfs, 4.0131);
        assert_eq!(milk.total(), 10.82);

        assert_eq!(sweeteners.sugars.lactose, 4.8069);
        assert_eq!(sweeteners.sugars.total(), 4.8069);

        assert_eq!(pac.sugars, 4.8069);
        assert_eq!(pac.total(), 4.8069);

        assert_abs_diff_eq!(
            SPEC_DAIRY_2_PERCENT.into_composition(),
            *COMP_MILK_2_PERCENT,
            epsilon = TESTS_EPSILON
        );
    }

    #[test]
    fn into_composition_sugars_spec_sucrose() {
        let Composition {
            solids, sweeteners, ..
        } = *COMP_SUCROSE;

        assert_eq!(solids.total(), 100.0);
        assert_eq!(COMP_SUCROSE.water(), 0.0);

        let Solids { other, .. } = solids;

        assert_eq!(other.fats, 0.0);
        assert_eq!(other.sweeteners, 100.0);
        assert_eq!(other.snf(), 100.0);
        assert_eq!(other.snfs, 0.0);
        assert_eq!(other.total(), 100.0);

        assert_eq!(sweeteners.sugars.sucrose, 100.0);
        assert_eq!(sweeteners.sugars.total(), 100.0);

        let pac = COMP_SUCROSE.pac;
        assert_eq!(pac.sugars, 100.0);
        assert_eq!(pac.total(), 100.0);

        assert_abs_diff_eq!(
            SPEC_SUGARS_DEXTROSE.into_composition(),
            *COMP_DEXTROSE,
            epsilon = TESTS_EPSILON
        );
    }

    #[test]
    fn into_composition_sugars_spec_dextrose() {
        let Composition {
            solids, sweeteners, ..
        } = *COMP_DEXTROSE;

        assert_eq!(solids.total(), 100.0);
        assert_eq!(COMP_DEXTROSE.water(), 0.0);

        let Solids { other, .. } = solids;

        assert_eq!(other.fats, 0.0);
        assert_eq!(other.sweeteners, 100.0);
        assert_eq!(other.snf(), 100.0);
        assert_eq!(other.snfs, 0.0);
        assert_eq!(other.total(), 100.0);

        assert_eq!(sweeteners.sugars.glucose, 100.0);
        assert_eq!(sweeteners.sugars.total(), 100.0);

        let pac = COMP_DEXTROSE.pac;
        assert_eq!(pac.sugars, 190.0);
        assert_eq!(pac.total(), 190.0);

        assert_abs_diff_eq!(
            SPEC_SUGARS_DEXTROSE.into_composition(),
            *COMP_DEXTROSE,
            epsilon = TESTS_EPSILON
        );
    }

    #[test]
    fn into_composition_sugars_spec_dextrose_50_percent() {
        let Composition {
            solids, sweeteners, ..
        } = *COMP_DEXTROSE_50_PERCENT;

        assert_eq!(solids.total(), 50.0);
        assert_eq!(COMP_DEXTROSE_50_PERCENT.water(), 50.0);

        let Solids { other, .. } = solids;

        assert_eq!(other.fats, 0.0);
        assert_eq!(other.sweeteners, 50.0);
        assert_eq!(other.snf(), 50.0);
        assert_eq!(other.snfs, 0.0);
        assert_eq!(other.total(), 50.0);

        assert_eq!(sweeteners.sugars.glucose, 50.0);
        assert_eq!(sweeteners.sugars.total(), 50.0);

        let pac = COMP_DEXTROSE_50_PERCENT.pac;
        assert_eq!(pac.sugars, 95.0);
        assert_eq!(pac.total(), 95.0);

        assert_abs_diff_eq!(
            SPEC_SUGARS_DEXTROSE_50_PERCENT.into_composition(),
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

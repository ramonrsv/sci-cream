use serde::{Deserialize, Serialize};

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

#[cfg(feature = "diesel")]
use crate::diesel::ingredients;
#[cfg(feature = "diesel")]
use diesel::{Queryable, Selectable};

use crate::{
    composition::{Composition, PAC, ScaleComponents, Solids, SolidsBreakdown, Sugars, Sweeteners},
    constants,
    error::{Error, Result},
    ingredients::{Category, Ingredient},
};

#[cfg(doc)]
use crate::constants::{STD_LACTOSE_IN_MSNF, STD_MSNF_IN_MILK_SERUM};

pub trait IntoComposition {
    fn into_composition(self) -> Result<Composition>;
}

/// Indicates whether composition values for an ingredient are a percentage of dry or total weight.
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
pub enum CompositionBasis {
    /// Composition values are given as percentages of the dry weight (solids) of the ingredient.
    ///
    /// The composition values must add up to 100%, and are then scaled by the `solids` value to get
    /// the actual composition of the ingredient as a whole, equivalent to a `ByTotalWeight` basis.
    ByDryWeight { solids: f64 },
    /// Composition values are given as percentages of the total weight of the ingredient.
    ///
    /// The composition values plus the `water` value must add up to 100%.
    ByTotalWeight { water: f64 },
}

/// Spec for trivial dairy ingredients, e.g. Milk, Cream, Milk Powder, etc.
///
/// For most ingredients it is sufficient to specify the fat content; the rest of the components are
/// calculated from standard values, notably [`STD_MSNF_IN_MILK_SERUM`] and [`STD_LACTOSE_IN_MSNF`].
/// For milk powder ingredients it's necessary to specify the `msnf`, e.g. 97 for Skimmed MIlk
/// Powder - 3% water, no fat, the rest is `msnf`, or 73 for Whole Milk Powder - total less 27% fat.
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct DairySpec {
    pub fat: f64,
    pub msnf: Option<f64>,
}

/// Spec for sweeteners, with a specified [`Sweeteners`] composition and optional POD/PAC values
///
/// If [`basis`](Self::basis) is [`ByDryWeight`](CompositionBasis::ByDryWeight), the values in
/// [`sweeteners`](Self::sweeteners) represent the composition of the sweeteners as a percentage of
/// the dry weight (solids), its total and [`other_solids`](Self::other_solids) adding up to 100.
/// For example, Invert Sugar might be composed of `sugars.glucose = 42.5`, `sugars.fructose =
/// 42.5`, and `sugars.sucrose = 15`, with `ByDryWeight { solids: 80 }`, meaning that 85% of the
/// sucrose was split into glucose/fructose,  with 15% sucrose remaining, and the syrup containing
/// 20% water. If [`basis`](Self::basis) is [`ByTotalWeight`](CompositionBasis::ByTotalWeight), then
/// the values in [`sweeteners`](Self::sweeteners) represent the composition of the sweeteners as a
/// percentage of the total weight of the ingredient, their total plus `other_solids` and `water`
/// adding up to 100. For example, Honey might be composed of `sugars.glucose = 36`,
/// `sugars.fructose = 41`, `sugars.sucrose = 2`, and `other_solids = 1`, with `ByTotalWeight {
/// water = 20 }`.
///
/// [`other_solids`](Self::other_solids) represents any non-sweetener impurities that may be in the
/// ingredient, e.g. minerals, pollen, etc., for example 1% in Honey. This value should rarely be
/// needed, and is assumed to be zero if not specified. This field is also scaled depending on the
/// chosen [`basis`](Self::basis).
///
/// If the POD or PAC value is not specified, then it is automatically calculated based on the
/// composition of known mono- and disaccharides, and in the case of `ByDryWeight` basis it's scaled
/// accordingly to represent the values for the ingredient as a whole. If the values are specified,
/// then they are used as-is, ignoring internal calculations, and without any scaling. For automatic
/// calculations the polysaccharide component is ignored, and it is an error if `sugars.unspecified`
/// or `sweeteners.artificial` are non-zero.
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct SweetenersSpec {
    pub sweeteners: Sweeteners,
    pub other_solids: Option<f64>,
    #[serde(flatten)]
    pub basis: CompositionBasis,
    pub pod: Option<f64>,
    pub pac: Option<f64>,
}

/// Tagged enum for all the supported specs, which is useful for (de)serialization of specs.
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
pub enum Spec {
    DairySpec(DairySpec),
    SweetenersSpec(SweetenersSpec),
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
    fn into_composition(self) -> Result<Composition> {
        match self {
            Spec::DairySpec(spec) => spec.into_composition(),
            Spec::SweetenersSpec(spec) => spec.into_composition(),
        }
    }
}

impl IngredientSpec {
    pub fn into_ingredient(self) -> Ingredient {
        Ingredient {
            name: self.name,
            category: self.category,
            composition: self.spec.into_composition().unwrap(),
        }
    }
}

impl IntoComposition for DairySpec {
    fn into_composition(self) -> Result<Composition> {
        let Self { fat, msnf } = self;

        let calculated_msnf = (100.0 - fat) * constants::STD_MSNF_IN_MILK_SERUM;
        let msnf = msnf.unwrap_or(calculated_msnf);
        let lactose = msnf * constants::STD_LACTOSE_IN_MSNF;
        let snfs = msnf - lactose;

        let sweeteners = Sweeteners::new().sugars(Sugars::new().lactose(lactose));
        let pod = sweeteners.to_pod().unwrap();
        let pad = PAC::new().sugars(sweeteners.to_pac().unwrap());

        Ok(Composition::new()
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
            .pac(pad))
    }
}

impl IntoComposition for SweetenersSpec {
    fn into_composition(self) -> Result<Composition> {
        let Self {
            sweeteners,
            other_solids,
            basis,
            pod,
            pac,
        } = self;

        let other_solids = other_solids.unwrap_or(0.0);

        let mut factor = None;

        match basis {
            CompositionBasis::ByDryWeight { solids } => {
                if sweeteners.total() + other_solids != 100.0 {
                    return Err(Error::CompositionNot100Percent(
                        sweeteners.total() + other_solids,
                    ));
                }

                if !(0.0..=100.0).contains(&solids) {
                    return Err(Error::CompositionNotWithin100Percent(solids));
                }

                factor = Some(solids / 100.0);
            }
            CompositionBasis::ByTotalWeight { water } => {
                if sweeteners.total() + other_solids + water != 100.0 {
                    return Err(Error::CompositionNot100Percent(
                        sweeteners.total() + other_solids + water,
                    ));
                }
            }
        };

        let (sweeteners, other_solids) = if let Some(factor) = factor {
            (sweeteners.scale(factor), other_solids * factor)
        } else {
            (sweeteners, other_solids)
        };

        let ignore_polysaccharides = |s: Sweeteners| Sweeteners {
            polysaccharides: 0.0,
            ..s
        };

        let pod = pod.unwrap_or(ignore_polysaccharides(sweeteners).to_pod().unwrap());
        let pac = pac.unwrap_or(ignore_polysaccharides(sweeteners).to_pac().unwrap());

        Ok(Composition::new()
            .solids(
                Solids::new().other(
                    SolidsBreakdown::new()
                        .sweeteners(sweeteners.total() - sweeteners.polysaccharides)
                        .snfs(sweeteners.polysaccharides + other_solids),
                ),
            )
            .sweeteners(sweeteners)
            .pod(pod)
            .pac(PAC::new().sugars(pac)))
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
            SPEC_DAIRY_2_PERCENT.into_composition().unwrap(),
            *COMP_MILK_2_PERCENT,
            epsilon = TESTS_EPSILON
        );
    }

    #[test]
    fn into_composition_sweeteners_spec_sucrose() {
        let Composition {
            solids,
            sweeteners,
            pod,
            pac,
            ..
        } = SweetenersSpec {
            sweeteners: Sweeteners::new().sugars(Sugars::new().sucrose(100.0)),
            other_solids: None,
            basis: CompositionBasis::ByDryWeight { solids: 100.0 },
            pod: None,
            pac: None,
        }
        .into_composition()
        .unwrap();

        assert_eq!(sweeteners.sugars.sucrose, 100.0);
        assert_eq!(solids.sweeteners(), 100.0);
        assert_eq!(solids.total(), 100.0);
        assert_eq!(pod, 100.0);
        assert_eq!(pac.sugars, 100.0);
    }

    #[test]
    fn into_composition_sweeteners_spec_dextrose() {
        let Composition {
            solids,
            sweeteners,
            pod,
            pac,
            ..
        } = SweetenersSpec {
            sweeteners: Sweeteners::new().sugars(Sugars::new().glucose(100.0)),
            other_solids: None,
            basis: CompositionBasis::ByDryWeight { solids: 92.0 },
            pod: None,
            pac: None,
        }
        .into_composition()
        .unwrap();

        assert_eq!(sweeteners.sugars.glucose, 92.0);
        assert_eq!(solids.sweeteners(), 92.0);
        assert_eq!(solids.total(), 92.0);
        assert_eq!(pod, 73.968);
        assert_eq!(pac.sugars, 174.8);
    }

    #[test]
    fn into_composition_sweeteners_spec_fructose() {
        let Composition {
            solids,
            sweeteners,
            pod,
            pac,
            ..
        } = SweetenersSpec {
            sweeteners: Sweeteners::new().sugars(Sugars::new().fructose(100.0)),
            other_solids: None,
            basis: CompositionBasis::ByDryWeight { solids: 100.0 },
            pod: None,
            pac: None,
        }
        .into_composition()
        .unwrap();

        assert_eq!(sweeteners.sugars.fructose, 100.0);
        assert_eq!(solids.sweeteners(), 100.0);
        assert_eq!(solids.total(), 100.0);
        assert_eq!(pod, 173.0);
        assert_eq!(pac.sugars, 190.0);
    }

    #[test]
    fn into_composition_sugars_spec_invert_sugar() {
        let Composition {
            solids,
            sweeteners,
            pod,
            pac,
            ..
        } = SweetenersSpec {
            sweeteners: Sweeteners::new()
                .sugars(Sugars::new().glucose(42.5).fructose(42.5).sucrose(15.0)),
            other_solids: None,
            basis: CompositionBasis::ByDryWeight { solids: 80.0 },
            pod: None,
            pac: None,
        }
        .into_composition()
        .unwrap();

        assert_eq!(
            sweeteners,
            Sweeteners::new().sugars(Sugars::new().glucose(34.0).fructose(34.0).sucrose(12.0))
        );

        assert_eq!(solids.sweeteners(), 80.0);
        assert_eq!(solids.total(), 80.0);
        assert_eq!(pod, 98.156);
        assert_eq!(pac.sugars, 141.2);
    }

    #[test]
    fn into_composition_sweeteners_spec_honey() {
        let Composition {
            solids,
            sweeteners,
            pod,
            pac,
            ..
        } = SweetenersSpec {
            sweeteners: Sweeteners::new().sugars(
                Sugars::new()
                    .glucose(36.0)
                    .fructose(41.0)
                    .sucrose(2.0)
                    .galactose(1.5)
                    .maltose(1.5),
            ),
            other_solids: Some(1.0),
            basis: CompositionBasis::ByTotalWeight { water: 17.0 },
            pod: None,
            pac: None,
        }
        .into_composition()
        .unwrap();

        assert_eq!(
            sweeteners,
            Sweeteners::new().sugars(
                Sugars::new()
                    .glucose(36.0)
                    .fructose(41.0)
                    .sucrose(2.0)
                    .galactose(1.5)
                    .maltose(1.5)
            )
        );

        assert_eq!(solids.sweeteners(), 82.0);
        assert_eq!(solids.snfs(), 1.0);
        assert_eq!(solids.total(), 83.0);
        assert_eq!(pod, 102.354);
        assert_eq!(pac.sugars, 152.65);
    }

    #[test]
    fn into_composition_sweeteners_spec_hfcs42() {
        let Composition {
            solids,
            sweeteners,
            pod,
            pac,
            ..
        } = SweetenersSpec {
            sweeteners: Sweeteners::new()
                .sugars(Sugars::new().fructose(42.0).glucose(53.0))
                .polysaccharide(5.0),
            other_solids: None,
            basis: CompositionBasis::ByDryWeight { solids: 76.0 },
            pod: None,
            pac: None,
        }
        .into_composition()
        .unwrap();

        assert_eq!(
            sweeteners,
            Sweeteners::new()
                .sugars(Sugars::new().fructose(31.92).glucose(40.28))
                .polysaccharide(3.8)
        );

        assert_eq!(solids.sweeteners(), 72.2);
        assert_eq!(solids.snfs(), 3.8);
        assert_eq!(solids.total(), 76.0);
        assert_eq!(pod, 87.60672000000001);
        assert_eq!(pac.sugars, 137.18);
    }

    #[test]
    fn deserialize_ingredient_spec() {
        [
            (ING_SPEC_MILK_2_PERCENT_STR, ING_SPEC_MILK_2_PERCENT.clone()),
            (ING_SPEC_SUCROSE_STR, ING_SPEC_SUCROSE.clone()),
            (ING_SPEC_DEXTROSE_STR, ING_SPEC_DEXTROSE.clone()),
            (ING_SPEC_FRUCTOSE_STR, ING_SPEC_FRUCTOSE.clone()),
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
            (ING_SPEC_SUCROSE.clone(), ING_SUCROSE.clone()),
            (ING_SPEC_DEXTROSE.clone(), ING_DEXTROSE.clone()),
            (ING_SPEC_FRUCTOSE.clone(), ING_FRUCTOSE.clone()),
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

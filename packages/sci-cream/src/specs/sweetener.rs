//! [`SweetenerSpec`] and associated implementations, for sweetener ingredients like sugars,
//! syrups, polyols, artificial sweeteners, etc.

use serde::{Deserialize, Serialize};

use crate::{
    composition::{
        Carbohydrates, Composition, Fibers, PAC, ScaleComponents, Solids, SolidsBreakdown, Sweeteners, ToComposition,
    },
    constants::molar_mass::pac_from_molar_mass,
    error::{Error, Result},
    specs::units::{CompositionBasis, Scaling, Unit},
    validate::{Validate, verify_are_positive, verify_is_100_percent, verify_is_within_100_percent},
};

#[cfg(doc)]
use crate::{
    composition::{ArtificialSweeteners, Polyols, Sugars},
    constants::density::GRAMS_IN_TEASPOON_OF_SUGAR,
};

/// Spec for sweeteners, with a specified [`Sweeteners`] composition and optional POD/PAC
///
/// If [`basis`](Self::basis) is [`ByDryWeight`](CompositionBasis::ByDryWeight), the values in
/// [`sweeteners`](Self::sweeteners) represent the composition of the sweeteners as a percentage of
/// the dry weight (solids), its total plus [`fiber`](Self::fiber),
/// [`other_carbohydrates`](Self::other_carbohydrates), and [`other_solids`](Self::other_solids)
/// adding up to 100. For example, Invert Sugar might be
/// composed of `sugars.glucose = 42.5`, `sugars.fructose = 42.5`, and `sugars.sucrose = 15`, with
/// `ByDryWeight { solids: 80 }`, meaning that 85% of the sucrose was split into glucose/fructose,
/// with 15% sucrose remaining, and the syrup containing 20% water. If [`basis`](Self::basis) is
/// [`ByTotalWeight`](CompositionBasis::ByTotalWeight), then the values in
/// [`sweeteners`](Self::sweeteners) represent the composition of the sweeteners as a percentage of
/// the total weight of the ingredient, their total plus `fiber`, `other_carbohydrates`,
/// `other_solids`, and `water` adding up to 100. For example, Honey might be composed of
/// `sugars.glucose = 36`, `sugars.fructose = 41`, `sugars.sucrose = 2`, and `other_solids = 1`,
/// with `ByTotalWeight { water = 20 }`.
///
/// [`fiber`](Self::fiber) are any dietary fibers that may be in or similar to sweetener products,
/// e.g. inulin or oligofructose. [`other_carbohydrates`](Self::other_carbohydrates) are any
/// carbohydrates other than mono- and disaccharides, e.g. maltodextrin and oligosaccharides found
/// in glucose/corn syrups. [`other_solids`](Self::other_solids) represents any non-sweetener
/// impurities that may be in the ingredient, e.g. minerals, pollen, etc., for example 1% in Honey.
/// This value should rarely be needed, and is assumed to be zero if not specified. This field is
/// also scaled depending on the chosen [`basis`](Self::basis).
///
/// If the POD or PAC values are not specified, then they are automatically calculated based on the
/// composition of known components, e.g. mono- and disaccharides, polyols, artificial sweeteners,
/// fibers, etg. If the PAC value is in [`Unit::MolarMass`], then it is calculated via
/// [`pac_from_molar_mass`]. If specified, POD and PAC values are scaled based on the [`Scaling`].
/// If [`OfWhole`](Scaling::OfWhole) then they are left as-is, since they are already for the
/// ingredient as a whole. If [`OfSolids`](Scaling::OfSolids), then they are scaled based on the dry
/// solids content. Note that this scaling is independent of the chosen [`basis`](Self::basis).
///
/// For automatic calculations [`fiber.other`](Fibers::other),
/// [`other_carbohydrates`](Self::other_carbohydrates), and [`other_solids`](Self::other_solids)
/// components are ignored, and it is an error if [`sugars.other`](Sugars::other),
/// [`polyols.other`](Polyols::other), or [`artificial.other`](ArtificialSweeteners::other) are
/// non-zero.
///
/// # Examples
///
/// Dextrose (monohydrate), with:
/// - 100% glucose by dry weight
/// - 92% solids
/// - 8% bound water
///
/// ```
/// # fn main() -> Result<(), Box<dyn std::error::Error>> {
/// # use sci_cream::asserts::assert_eq_flt;
/// use sci_cream::{
///     composition::{CompKey, Sugars, Sweeteners, ToComposition},
///     specs::{CompositionBasis, SweetenerSpec},
/// };
///
/// let comp = SweetenerSpec {
///     sweeteners: Sweeteners::new().sugars(Sugars::new().glucose(100.0)),
///     fiber: None,
///     other_carbohydrates: None,
///     other_solids: None,
///     basis: CompositionBasis::ByDryWeight { solids: 92.0 },
///     pod: None,
///     pac: None,
/// }.to_composition()?;
///
/// assert_eq!(comp.get(CompKey::Energy), 368.0);
/// assert_eq!(comp.get(CompKey::Glucose), 92.0);
/// assert_eq!(comp.get(CompKey::TotalSugars), 92.0);
/// assert_eq!(comp.get(CompKey::TotalSweeteners), 92.0);
/// assert_eq!(comp.get(CompKey::TotalCarbohydrates), 92.0);
/// assert_eq!(comp.get(CompKey::TotalSolids), 92.0);
/// assert_eq_flt!(comp.get(CompKey::POD), 73.6);
/// assert_eq!(comp.get(CompKey::PACsgr), 174.8);
/// # Ok(()) }
/// ```
///
/// (USDA, 2018, "Syrup, maple, Canadian")[^514], from _USDA FoodData Central_:
/// - 60% mixed sugars (59% sucrose, 1% glucose/fructose)
/// - 7.5% oligosaccharides
/// - 0.5% minerals
/// - 32% water
///
/// _"These values align with the analysis in _Glucose Syrups: Technology and Applications_ (Hull,
/// 2010, 'Maple Syrup', p. 326)[^15]."_
///
/// ```
/// # fn main() -> Result<(), Box<dyn std::error::Error>> {
/// use sci_cream::{
///     composition::{CompKey, Sugars, Sweeteners, ToComposition},
///     specs::{CompositionBasis, SweetenerSpec},
/// };
///
/// let comp = SweetenerSpec {
///     sweeteners: Sweeteners::new().sugars(
///         Sugars::new().glucose(0.65).fructose(0.35).sucrose(59.0)
///     ),
///     fiber: None,
///     other_carbohydrates: Some(7.5),
///     other_solids: Some(0.5),
///     basis: CompositionBasis::ByTotalWeight { water: 32.0 },
///     pod: None,
///     pac: None,
/// }.to_composition()?;
///
/// assert_eq!(comp.get(CompKey::Energy), 270.0);
/// assert_eq!(comp.get(CompKey::Sucrose), 59.0);
/// assert_eq!(comp.get(CompKey::TotalSugars), 60.0);
/// assert_eq!(comp.get(CompKey::TotalSweeteners), 60.0);
/// assert_eq!(comp.get(CompKey::TotalCarbohydrates), 67.5);
/// assert_eq!(comp.get(CompKey::TotalSolids), 68.0);
/// assert_eq!(comp.get(CompKey::POD), 60.1255);
/// assert_eq!(comp.get(CompKey::PACsgr), 60.9);
/// # Ok(()) }
/// ```
///
/// (Splenda Sweetener Packets)[^515], from the manufacturer:
/// - Bulked with Dextrose and Maltodextrin
/// - Explicitly specified [`POD`](crate::docs#pod) (840)
/// - Explicitly specified [`PAC`](crate::docs#pac-afp-fpdf-se) (112.6g/100g).
///
/// _"POD value taken from the manufacturer's suggested 2tsp:1packet sugar to sweetener conversion,
/// where a teaspoon of granulated sugar is 4.2g (see [`GRAMS_IN_TEASPOON_OF_SUGAR`]) and a packet
/// is 1g (from the manufacturer's packaging and empirically measured with a 0.01g precision scale).
/// The composition is inferred from the ingredient list, assuming 55% dextrose, ~40% maltodextrin,
/// 5% water, and enough sucralose to reach a POD of 840 (works out to ~1.32% using a POD of 11 for
/// maltodextrin). PAC is calculated for 55% dextrose and 40% Maltodextrin 10 DE with a PAC of 18.
/// Energy is calculated internally from the composition."_
///
/// ```
/// # fn main() -> Result<(), Box<dyn std::error::Error>> {
/// # use sci_cream::asserts::assert_eq_flt;
/// use sci_cream::{
///     composition::{ArtificialSweeteners, CompKey, Sugars, Sweeteners, ToComposition},
///     specs::{CompositionBasis, Scaling, SweetenerSpec, Unit},
/// };
///
/// let comp = SweetenerSpec {
///     sweeteners: Sweeteners::new()
///         .sugars(Sugars::new().glucose(55.0))
///         .artificial(ArtificialSweeteners::new().sucralose(1.32)),
///     fiber: None,
///     other_carbohydrates: Some(38.68),
///     other_solids: None,
///     basis: CompositionBasis::ByTotalWeight { water: 5.0 },
///     pod: Some(Scaling::OfWhole(840.0)),
///     pac: Some(Scaling::OfWhole(Unit::Grams(112.6))),
/// }.to_composition()?;
///
/// assert_eq_flt!(comp.get(CompKey::Energy), 374.72);
/// assert_eq!(comp.get(CompKey::Glucose), 55.0);
/// assert_eq_flt!(comp.get(CompKey::TotalSugars), 55.0);
/// assert_eq!(comp.get(CompKey::TotalArtificial), 1.32);
/// assert_eq_flt!(comp.get(CompKey::TotalSweeteners), 56.32);
/// assert_eq!(comp.get(CompKey::TotalCarbohydrates), 93.68);
/// assert_eq!(comp.get(CompKey::TotalSolids), 95.0);
/// assert_eq_flt!(comp.get(CompKey::POD), 840.0);
/// assert_eq_flt!(comp.get(CompKey::PACsgr), 112.6);
/// # Ok(()) }
/// ```
#[doc = include_str!("../../docs/references/index/15.md")]
#[doc = include_str!("../../docs/references/index/514.md")]
#[doc = include_str!("../../docs/references/index/515.md")]
#[allow(clippy::doc_markdown)] // false positive on 'FoodData'
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct SweetenerSpec {
    /// Composition of the sweeteners, including sugars, polyols, and artificial sweeteners.
    pub sweeteners: Sweeteners,
    /// Dietary fibers present in the sweetener, e.g. inulin, oligofructose, etc.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fiber: Option<Fibers>,
    /// Other carbohydrates present in the sweetener, e.g. maltodextrin, oligosaccharides, etc.
    ///
    /// This field should include any carbohydrates that are not tracked as part of
    /// [`sweeteners`](Self::sweeteners) or [`fiber`](Self::fiber). It should rarely be needed, and
    /// is assumed to be zero if not specified.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub other_carbohydrates: Option<f64>,
    /// Other solids present in the sweetener, e.g. minerals, pollen, etc.
    ///
    /// This field should rarely be needed, and is assumed to be zero if not specified.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub other_solids: Option<f64>,
    /// The basis for the composition, either as a percentage of the dry weight (solids) or of the
    /// total weight of the ingredient, which affects the scaling of the composition values.
    #[serde(flatten)]
    pub basis: CompositionBasis,
    /// [Potere Dolcificante (POD)](crate::docs#pod) value and scaling specification.
    ///
    /// See [`SweetenerSpec`] docs for details of how this is calculated and scaled.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pod: Option<Scaling<f64>>,
    /// [Potere Anti-Cariogeno (PAC)](crate::docs#pac) value and scaling specification.
    ///
    /// See [`SweetenerSpec`] docs for details of how this is calculated and scaled.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pac: Option<Scaling<Unit>>,
}

impl ToComposition for SweetenerSpec {
    fn to_composition(&self) -> Result<Composition> {
        let Self {
            sweeteners,
            fiber,
            other_carbohydrates,
            other_solids,
            basis,
            pod,
            pac,
        } = *self;

        let fiber = fiber.unwrap_or_default();
        let other_carbohydrates = other_carbohydrates.unwrap_or(0.0);
        let other_solids = other_solids.unwrap_or(0.0);
        verify_are_positive(&[other_carbohydrates, other_solids])?;

        let mut factor = None;

        match basis {
            CompositionBasis::ByDryWeight { solids } => {
                verify_is_within_100_percent(sweeteners.total() + fiber.total() + other_carbohydrates + other_solids)?;
                verify_is_within_100_percent(solids)?;

                factor = Some(solids / 100.0);
            }
            CompositionBasis::ByTotalWeight { water } => {
                verify_is_100_percent(sweeteners.total() + fiber.total() + other_carbohydrates + other_solids + water)?;
            }
        }

        let (sweeteners, fiber, other_carbohydrates, other_solids) = factor.map_or_else(
            || (sweeteners, fiber, other_carbohydrates, other_solids),
            |factor| {
                (sweeteners.scale(factor), fiber.scale(factor), other_carbohydrates * factor, other_solids * factor)
            },
        );

        let solids = SolidsBreakdown::new()
            .carbohydrates(
                Carbohydrates::new()
                    .fiber(fiber)
                    .sugars(sweeteners.sugars)
                    .polyols(sweeteners.polyols)
                    .others(other_carbohydrates),
            )
            .artificial_sweeteners(sweeteners.artificial)
            .others(other_solids);

        let pod = match pod {
            None => sweeteners.to_pod()? + fiber.to_pod(),
            Some(scaling) => match scaling {
                Scaling::OfWhole(value) => value,
                Scaling::OfSolids(value) => value * (solids.total() / 100.0),
            },
        };

        let pac = match pac {
            None => sweeteners.to_pac()?,
            Some(scaling) => {
                let (unit, factor) = match scaling {
                    Scaling::OfWhole(unit) => (unit, 1.0),
                    Scaling::OfSolids(unit) => (unit, solids.total() / 100.0),
                };

                match unit {
                    Unit::Grams(grams) => grams * factor,
                    Unit::MolarMass(molar_mass) => pac_from_molar_mass(molar_mass) * factor,
                    _ => Err(Error::UnsupportedCompositionUnit(unit))?,
                }
            }
        };

        Composition::new()
            .energy(solids.energy()?)
            .solids(Solids::new().other(solids))
            .pod(pod)
            .pac(PAC::new().sugars(pac))
            .validate_into()
    }
}

#[cfg(test)]
#[cfg_attr(coverage, coverage(off))]
#[allow(clippy::unwrap_used)]
pub(crate) mod tests {
    use std::sync::LazyLock;

    #[expect(unused_imports)]
    use crate::tests::asserts::*;

    use crate::tests::{
        assets::asset_composition,
        util::{AssertKeys, assert_comp_eq_percent},
    };

    use super::*;
    use crate::{
        composition::{ArtificialSweeteners, CompKey, Polyols, Sugars},
        error::Error,
        ingredient::Category,
        specs::IngredientSpec,
    };

    fn clear_pod_in_spec(spec: &mut crate::specs::TaggedSpec) {
        spec.as_sweetener_spec_mut().unwrap().pod = None;
    }

    fn clear_pac_in_spec(spec: &mut crate::specs::TaggedSpec) {
        spec.as_sweetener_spec_mut().unwrap().pac = None;
    }

    pub(crate) const ING_SPEC_SWEETENER_SUCROSE_STR: &str = r#"{
      "name": "Sucrose",
      "category": "Sweetener",
      "SweetenerSpec": {
        "sweeteners": {
          "sugars": {
            "sucrose": 100
          }
        },
        "ByDryWeight": {
          "solids": 100
        }
      }
    }"#;

    pub(crate) static ING_SPEC_SWEETENER_SUCROSE: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Sucrose".to_string(),
        category: Category::Sweetener,
        spec: SweetenerSpec {
            sweeteners: Sweeteners::new().sugars(Sugars::new().sucrose(100.0)),
            fiber: None,
            other_carbohydrates: None,
            other_solids: None,
            basis: CompositionBasis::ByDryWeight { solids: 100.0 },
            pod: None,
            pac: None,
        }
        .into(),
    });

    pub(crate) static COMP_SUCROSE: LazyLock<Composition> =
        LazyLock::new(|| {
            Composition::new()
                .energy(400.0)
                .solids(Solids::new().other(
                    SolidsBreakdown::new().carbohydrates(Carbohydrates::new().sugars(Sugars::new().sucrose(100.0))),
                ))
                .pod(100.0)
                .pac(PAC::new().sugars(100.0))
        });

    #[test]
    fn to_composition_sweetener_spec_sucrose() {
        let comp = asset_composition(&ING_SPEC_SWEETENER_SUCROSE);

        comp.assert_all_keys(&[
            (CompKey::Energy, 400.0),
            (CompKey::TotalSolids, 100.0),
            (CompKey::TotalSNF, 100.0),
            (CompKey::TotalSNFS, 0.0),
            (CompKey::TotalCarbohydrates, 100.0),
            (CompKey::TotalSugars, 100.0),
            (CompKey::Sucrose, 100.0),
            (CompKey::TotalPolyols, 0.0),
            (CompKey::TotalArtificial, 0.0),
            (CompKey::TotalSweeteners, 100.0),
            (CompKey::POD, 100.0),
            (CompKey::NetPAC, 100.0),
            (CompKey::TotalPAC, 100.0),
            (CompKey::PACsgr, 100.0),
        ]);
    }

    pub(crate) const ING_SPEC_SWEETENER_DEXTROSE_STR: &str = r#"{
      "name": "Dextrose",
      "category": "Sweetener",
      "SweetenerSpec": {
        "sweeteners": {
          "sugars": {
            "glucose": 100
          }
        },
        "ByDryWeight": {
          "solids": 92
        }
      }
    }"#;

    pub(crate) static ING_SPEC_SWEETENER_DEXTROSE: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Dextrose".to_string(),
        category: Category::Sweetener,
        spec: SweetenerSpec {
            sweeteners: Sweeteners::new().sugars(Sugars::new().glucose(100.0)),
            fiber: None,
            other_carbohydrates: None,
            other_solids: None,
            basis: CompositionBasis::ByDryWeight { solids: 92.0 },
            pod: None,
            pac: None,
        }
        .into(),
    });

    pub(crate) static COMP_DEXTROSE: LazyLock<Composition> =
        LazyLock::new(|| {
            Composition::new()
                .energy(368.0)
                .solids(Solids::new().other(
                    SolidsBreakdown::new().carbohydrates(Carbohydrates::new().sugars(Sugars::new().glucose(92.0))),
                ))
                .pod(73.6)
                .pac(PAC::new().sugars(174.8))
        });

    #[test]
    fn to_composition_sweetener_spec_dextrose() {
        let comp = asset_composition(&ING_SPEC_SWEETENER_DEXTROSE);

        comp.assert_all_keys(&[
            (CompKey::Energy, 368.0),
            (CompKey::TotalSolids, 92.0),
            (CompKey::TotalSNF, 92.0),
            (CompKey::TotalSNFS, 0.0),
            (CompKey::Water, 8.0),
            (CompKey::TotalCarbohydrates, 92.0),
            (CompKey::TotalSugars, 92.0),
            (CompKey::Glucose, 92.0),
            (CompKey::TotalPolyols, 0.0),
            (CompKey::TotalArtificial, 0.0),
            (CompKey::TotalSweeteners, 92.0),
            (CompKey::POD, 73.6),
            (CompKey::NetPAC, 174.8),
            (CompKey::TotalPAC, 174.8),
            (CompKey::PACsgr, 174.8),
        ]);
    }

    pub(crate) const ING_SPEC_SWEETENER_FRUCTOSE_STR: &str = r#"{
      "name": "Fructose",
      "category": "Sweetener",
      "SweetenerSpec": {
        "sweeteners": {
          "sugars": {
            "fructose": 100
          }
        },
        "ByDryWeight": {
          "solids": 100
        }
      }
    }"#;

    pub(crate) static ING_SPEC_SWEETENER_FRUCTOSE: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Fructose".to_string(),
        category: Category::Sweetener,
        spec: SweetenerSpec {
            sweeteners: Sweeteners::new().sugars(Sugars::new().fructose(100.0)),
            fiber: None,
            other_carbohydrates: None,
            other_solids: None,
            basis: CompositionBasis::ByDryWeight { solids: 100.0 },
            pod: None,
            pac: None,
        }
        .into(),
    });

    pub(crate) static COMP_FRUCTOSE: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(400.0)
            .solids(Solids::new().other(
                SolidsBreakdown::new().carbohydrates(Carbohydrates::new().sugars(Sugars::new().fructose(100.0))),
            ))
            .pod(173.0)
            .pac(PAC::new().sugars(190.0))
    });

    #[test]
    fn to_composition_sweetener_spec_fructose() {
        let comp = asset_composition(&ING_SPEC_SWEETENER_FRUCTOSE);

        comp.assert_all_keys(&[
            (CompKey::Energy, 400.0),
            (CompKey::TotalSolids, 100.0),
            (CompKey::TotalSNF, 100.0),
            (CompKey::TotalSNFS, 0.0),
            (CompKey::TotalCarbohydrates, 100.0),
            (CompKey::TotalSugars, 100.0),
            (CompKey::Fructose, 100.0),
            (CompKey::TotalPolyols, 0.0),
            (CompKey::TotalArtificial, 0.0),
            (CompKey::TotalSweeteners, 100.0),
            (CompKey::POD, 173.0),
            (CompKey::NetPAC, 190.0),
            (CompKey::TotalPAC, 190.0),
            (CompKey::PACsgr, 190.0),
        ]);
    }

    pub(crate) const ING_SPEC_SWEETENER_LACTOSE_STR: &str = r#"{
      "name": "Lactose",
      "category": "Sweetener",
      "SweetenerSpec": {
        "sweeteners": {
          "sugars": {
            "lactose": 100
          }
        },
        "ByDryWeight": {
          "solids": 100
        }
      }
    }"#;

    pub(crate) static ING_SPEC_SWEETENER_LACTOSE: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Lactose".to_string(),
        category: Category::Sweetener,
        spec: SweetenerSpec {
            sweeteners: Sweeteners::new().sugars(Sugars::new().lactose(100.0)),
            fiber: None,
            other_carbohydrates: None,
            other_solids: None,
            basis: CompositionBasis::ByDryWeight { solids: 100.0 },
            pod: None,
            pac: None,
        }
        .into(),
    });

    pub(crate) static COMP_LACTOSE: LazyLock<Composition> =
        LazyLock::new(|| {
            Composition::new()
                .energy(400.0)
                .solids(Solids::new().other(
                    SolidsBreakdown::new().carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(100.0))),
                ))
                .pod(16.0)
                .pac(PAC::new().sugars(100.0))
        });

    #[test]
    fn to_composition_sweetener_spec_lactose() {
        let comp = asset_composition(&ING_SPEC_SWEETENER_LACTOSE);

        comp.assert_all_keys(&[
            (CompKey::Energy, 400.0),
            (CompKey::TotalSolids, 100.0),
            (CompKey::TotalSNF, 100.0),
            (CompKey::TotalSNFS, 0.0),
            (CompKey::TotalCarbohydrates, 100.0),
            (CompKey::TotalSugars, 100.0),
            (CompKey::Lactose, 100.0),
            (CompKey::TotalPolyols, 0.0),
            (CompKey::TotalArtificial, 0.0),
            (CompKey::TotalSweeteners, 100.0),
            (CompKey::POD, 16.0),
            (CompKey::NetPAC, 100.0),
            (CompKey::TotalPAC, 100.0),
            (CompKey::PACsgr, 100.0),
        ]);
    }

    pub(crate) const ING_SPEC_SWEETENER_MALTOSE_STR: &str = r#"{
      "name": "Maltose",
      "category": "Sweetener",
      "SweetenerSpec": {
        "sweeteners": {
          "sugars": {
            "maltose": 100
          }
        },
        "ByDryWeight": {
          "solids": 100
        }
      }
    }"#;

    pub(crate) static ING_SPEC_SWEETENER_MALTOSE: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Maltose".to_string(),
        category: Category::Sweetener,
        spec: SweetenerSpec {
            sweeteners: Sweeteners::new().sugars(Sugars::new().maltose(100.0)),
            fiber: None,
            other_carbohydrates: None,
            other_solids: None,
            basis: CompositionBasis::ByDryWeight { solids: 100.0 },
            pod: None,
            pac: None,
        }
        .into(),
    });

    pub(crate) static COMP_MALTOSE: LazyLock<Composition> =
        LazyLock::new(|| {
            Composition::new()
                .energy(400.0)
                .solids(Solids::new().other(
                    SolidsBreakdown::new().carbohydrates(Carbohydrates::new().sugars(Sugars::new().maltose(100.0))),
                ))
                .pod(32.0)
                .pac(PAC::new().sugars(100.0))
        });

    #[test]
    fn to_composition_sweetener_spec_maltose() {
        let comp = asset_composition(&ING_SPEC_SWEETENER_MALTOSE);

        comp.assert_all_keys(&[
            (CompKey::Energy, 400.0),
            (CompKey::TotalSolids, 100.0),
            (CompKey::TotalSNF, 100.0),
            (CompKey::TotalSNFS, 0.0),
            (CompKey::TotalCarbohydrates, 100.0),
            (CompKey::TotalSugars, 100.0),
            (CompKey::Maltose, 100.0),
            (CompKey::TotalPolyols, 0.0),
            (CompKey::TotalArtificial, 0.0),
            (CompKey::TotalSweeteners, 100.0),
            (CompKey::POD, 32.0),
            (CompKey::NetPAC, 100.0),
            (CompKey::TotalPAC, 100.0),
            (CompKey::PACsgr, 100.0),
        ]);
    }

    pub(crate) const ING_SPEC_SWEETENER_TREHALOSE_STR: &str = r#"{
      "name": "Trehalose",
      "category": "Sweetener",
      "SweetenerSpec": {
        "sweeteners": {
          "sugars": {
            "trehalose": 100
          }
        },
        "ByDryWeight": {
          "solids": 100
        }
      }
    }"#;

    pub(crate) static ING_SPEC_SWEETENER_TREHALOSE: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Trehalose".to_string(),
        category: Category::Sweetener,
        spec: SweetenerSpec {
            sweeteners: Sweeteners::new().sugars(Sugars::new().trehalose(100.0)),
            fiber: None,
            other_carbohydrates: None,
            other_solids: None,
            basis: CompositionBasis::ByDryWeight { solids: 100.0 },
            pod: None,
            pac: None,
        }
        .into(),
    });

    pub(crate) static COMP_TREHALOSE: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(400.0)
            .solids(Solids::new().other(
                SolidsBreakdown::new().carbohydrates(Carbohydrates::new().sugars(Sugars::new().trehalose(100.0))),
            ))
            .pod(45.0)
            .pac(PAC::new().sugars(100.0))
    });

    #[test]
    fn to_composition_sweetener_spec_trehalose() {
        let comp = asset_composition(&ING_SPEC_SWEETENER_TREHALOSE);

        comp.assert_all_keys(&[
            (CompKey::Energy, 400.0),
            (CompKey::TotalSolids, 100.0),
            (CompKey::TotalSNF, 100.0),
            (CompKey::TotalSNFS, 0.0),
            (CompKey::TotalCarbohydrates, 100.0),
            (CompKey::TotalSugars, 100.0),
            (CompKey::Trehalose, 100.0),
            (CompKey::TotalPolyols, 0.0),
            (CompKey::TotalArtificial, 0.0),
            (CompKey::TotalSweeteners, 100.0),
            (CompKey::POD, 45.0),
            (CompKey::NetPAC, 100.0),
            (CompKey::TotalPAC, 100.0),
            (CompKey::PACsgr, 100.0),
        ]);
    }

    pub(crate) const ING_SPEC_SWEETENER_ERYTHRITOL_STR: &str = r#"{
      "name": "Erythritol",
      "category": "Sweetener",
      "SweetenerSpec": {
        "sweeteners": {
          "polyols": {
            "erythritol": 100
          }
        },
        "ByDryWeight": {
          "solids": 100
        }
      }
    }"#;

    pub(crate) static ING_SPEC_SWEETENER_ERYTHRITOL: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Erythritol".to_string(),
        category: Category::Sweetener,
        spec: SweetenerSpec {
            sweeteners: Sweeteners::new().polyols(Polyols::new().erythritol(100.0)),
            fiber: None,
            other_carbohydrates: None,
            other_solids: None,
            basis: CompositionBasis::ByDryWeight { solids: 100.0 },
            pod: None,
            pac: None,
        }
        .into(),
    });

    pub(crate) static COMP_ERYTHRITOL: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(20.0)
            .solids(Solids::new().other(
                SolidsBreakdown::new().carbohydrates(Carbohydrates::new().polyols(Polyols::new().erythritol(100.0))),
            ))
            .pod(70.0)
            // @todo Should PAC for polyols be separate?
            .pac(PAC::new().sugars(280.0))
    });

    #[test]
    fn to_composition_sweetener_spec_erythritol() {
        let comp = asset_composition(&ING_SPEC_SWEETENER_ERYTHRITOL);

        comp.assert_all_keys(&[
            (CompKey::Energy, 20.0),
            (CompKey::OtherSNFS, 100.0),
            (CompKey::TotalSolids, 100.0),
            (CompKey::TotalSNF, 100.0),
            (CompKey::TotalSNFS, 100.0),
            (CompKey::TotalCarbohydrates, 100.0),
            (CompKey::TotalSugars, 0.0),
            (CompKey::TotalPolyols, 100.0),
            (CompKey::Erythritol, 100.0),
            (CompKey::TotalArtificial, 0.0),
            (CompKey::TotalSweeteners, 100.0),
            (CompKey::POD, 70.0),
            (CompKey::NetPAC, 280.0),
            (CompKey::TotalPAC, 280.0),
            (CompKey::PACsgr, 280.0),
        ]);
    }

    pub(crate) const ING_SPEC_SWEETENER_INVERT_SUGAR_STR: &str = r#"{
      "name": "Invert Sugar",
      "category": "Sweetener",
      "SweetenerSpec": {
        "sweeteners": {
          "sugars": {
            "glucose": 42.5,
            "fructose": 42.5,
            "sucrose": 15
          }
        },
        "ByDryWeight": {
          "solids": 80
        }
      }
    }"#;

    pub(crate) static ING_SPEC_SWEETENER_INVERT_SUGAR: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Invert Sugar".to_string(),
        category: Category::Sweetener,
        spec: SweetenerSpec {
            sweeteners: Sweeteners::new().sugars(Sugars::new().glucose(42.5).fructose(42.5).sucrose(15.0)),
            fiber: None,
            other_carbohydrates: None,
            other_solids: None,
            basis: CompositionBasis::ByDryWeight { solids: 80.0 },
            pod: None,
            pac: None,
        }
        .into(),
    });

    #[test]
    fn to_composition_sweetener_spec_invert_sugar() {
        let comp = asset_composition(&ING_SPEC_SWEETENER_INVERT_SUGAR);

        comp.assert_all_keys(&[
            (CompKey::Energy, 320.0),
            (CompKey::TotalSolids, 80.0),
            (CompKey::TotalSNF, 80.0),
            (CompKey::TotalSNFS, 0.0),
            (CompKey::Water, 20.0),
            (CompKey::TotalCarbohydrates, 80.0),
            (CompKey::TotalSugars, 80.0),
            (CompKey::Glucose, 34.0),
            (CompKey::Fructose, 34.0),
            (CompKey::Sucrose, 12.0),
            (CompKey::TotalPolyols, 0.0),
            (CompKey::TotalArtificial, 0.0),
            (CompKey::TotalSweeteners, 80.0),
            (CompKey::POD, 98.02),
            (CompKey::NetPAC, 141.2),
            (CompKey::TotalPAC, 141.2),
            (CompKey::PACsgr, 141.2),
        ]);
    }

    pub(crate) const ING_SPEC_SWEETENER_HONEY_STR: &str = r#"{
      "name": "Honey",
      "category": "Sweetener",
      "SweetenerSpec": {
        "sweeteners": {
          "sugars": {
            "glucose": 36,
            "fructose": 41,
            "sucrose": 2,
            "galactose": 1.5,
            "maltose": 1.5
          }
        },
        "other_solids": 1,
        "ByTotalWeight": {
          "water": 17
        }
      }
    }"#;

    pub(crate) static ING_SPEC_SWEETENER_HONEY: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Honey".to_string(),
        category: Category::Sweetener,
        spec: SweetenerSpec {
            sweeteners: Sweeteners::new().sugars(
                Sugars::new()
                    .glucose(36.0)
                    .fructose(41.0)
                    .sucrose(2.0)
                    .galactose(1.5)
                    .maltose(1.5),
            ),
            fiber: None,
            other_carbohydrates: None,
            other_solids: Some(1.0),
            basis: CompositionBasis::ByTotalWeight { water: 17.0 },
            pod: None,
            pac: None,
        }
        .into(),
    });

    #[test]
    fn to_composition_sweetener_spec_honey() {
        let comp = asset_composition(&ING_SPEC_SWEETENER_HONEY);

        comp.assert_all_keys(&[
            (CompKey::Energy, 328.0),
            (CompKey::OtherSNFS, 1.0),
            (CompKey::TotalSolids, 83.0),
            (CompKey::TotalSNF, 83.0),
            (CompKey::TotalSNFS, 1.0),
            (CompKey::Water, 17.0),
            (CompKey::TotalCarbohydrates, 82.0),
            (CompKey::TotalSugars, 82.0),
            (CompKey::Glucose, 36.0),
            (CompKey::Fructose, 41.0),
            (CompKey::Galactose, 1.5),
            (CompKey::Sucrose, 2.0),
            (CompKey::Maltose, 1.5),
            (CompKey::TotalPolyols, 0.0),
            (CompKey::TotalArtificial, 0.0),
            (CompKey::TotalSweeteners, 82.0),
            (CompKey::POD, 103.185),
            (CompKey::NetPAC, 152.65),
            (CompKey::TotalPAC, 152.65),
            (CompKey::PACsgr, 152.65),
        ]);
    }

    pub(crate) const ING_SPEC_SWEETENER_MAPLE_SYRUP_STR: &str = r#"{
      "name": "Maple Syrup",
      "category": "Sweetener",
      "SweetenerSpec": {
        "sweeteners": {
          "sugars": {
            "glucose": 0.65,
            "fructose": 0.35,
            "sucrose": 59
          }
        },
        "other_carbohydrates": 7.5,
        "other_solids": 0.5,
        "ByTotalWeight": {
          "water": 32
        }
      }
    }"#;

    pub(crate) static ING_SPEC_SWEETENER_MAPLE_SYRUP: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Maple Syrup".to_string(),
        category: Category::Sweetener,
        spec: SweetenerSpec {
            sweeteners: Sweeteners::new().sugars(Sugars::new().glucose(0.65).fructose(0.35).sucrose(59.0)),
            fiber: None,
            other_carbohydrates: Some(7.5),
            other_solids: Some(0.5),
            basis: CompositionBasis::ByTotalWeight { water: 32.0 },
            pod: None,
            pac: None,
        }
        .into(),
    });

    pub(crate) static COMP_MAPLE_SYRUP: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(270.0)
            .solids(
                Solids::new().other(
                    SolidsBreakdown::new()
                        .carbohydrates(
                            Carbohydrates::new()
                                .sugars(Sugars::new().glucose(0.65).fructose(0.35).sucrose(59.0))
                                .others(7.5),
                        )
                        .others(0.5),
                ),
            )
            .pod(60.1255)
            .pac(PAC::new().sugars(60.9))
    });

    #[test]
    fn to_composition_sweetener_spec_maple_syrup() {
        let comp = asset_composition(&ING_SPEC_SWEETENER_MAPLE_SYRUP);

        comp.assert_all_keys(&[
            (CompKey::Energy, 270.0),
            (CompKey::OtherSNFS, 8.0),
            (CompKey::TotalSolids, 68.0),
            (CompKey::TotalSNF, 68.0),
            (CompKey::TotalSNFS, 8.0),
            (CompKey::Water, 32.0),
            (CompKey::TotalCarbohydrates, 67.5),
            (CompKey::TotalSugars, 60.0),
            (CompKey::Glucose, 0.65),
            (CompKey::Fructose, 0.35),
            (CompKey::Sucrose, 59.0),
            (CompKey::TotalPolyols, 0.0),
            (CompKey::TotalArtificial, 0.0),
            (CompKey::TotalSweeteners, 60.0),
            (CompKey::POD, 60.1255),
            (CompKey::NetPAC, 60.9),
            (CompKey::TotalPAC, 60.9),
            (CompKey::PACsgr, 60.9),
        ]);
    }

    pub(crate) const ING_SPEC_SWEETENER_FANCY_MOLASSES_STR: &str = r#"{
      "name": "Fancy Molasses",
      "category": "Sweetener",
      "SweetenerSpec": {
        "sweeteners": {
          "sugars": {
            "glucose": 12,
            "fructose": 12,
            "sucrose": 32
          }
        },
        "other_carbohydrates": 20,
        "other_solids": 4,
        "ByTotalWeight": {
          "water": 20
        }
      }
    }"#;

    pub(crate) static ING_SPEC_SWEETENER_FANCY_MOLASSES: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Fancy Molasses".to_string(),
        category: Category::Sweetener,
        spec: SweetenerSpec {
            sweeteners: Sweeteners::new().sugars(Sugars::new().glucose(12.0).fructose(12.0).sucrose(32.0)),
            fiber: None,
            other_carbohydrates: Some(20.0),
            other_solids: Some(4.0),
            basis: CompositionBasis::ByTotalWeight { water: 20.0 },
            pod: None,
            pac: None,
        }
        .into(),
    });

    pub(crate) static COMP_FANCY_MOLASSES: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(304.0)
            .solids(
                Solids::new().other(
                    SolidsBreakdown::new()
                        .carbohydrates(
                            Carbohydrates::new()
                                .sugars(Sugars::new().glucose(12.0).fructose(12.0).sucrose(32.0))
                                .others(20.0),
                        )
                        .others(4.0),
                ),
            )
            .pod(62.36)
            .pac(PAC::new().sugars(77.6))
    });

    #[test]
    fn to_composition_sweetener_spec_fancy_molasses() {
        let comp = asset_composition(&ING_SPEC_SWEETENER_FANCY_MOLASSES);

        comp.assert_all_keys(&[
            (CompKey::Energy, 304.0),
            (CompKey::OtherSNFS, 24.0),
            (CompKey::TotalSolids, 80.0),
            (CompKey::TotalSNF, 80.0),
            (CompKey::TotalSNFS, 24.0),
            (CompKey::Water, 20.0),
            (CompKey::TotalCarbohydrates, 76.0),
            (CompKey::TotalSugars, 56.0),
            (CompKey::Glucose, 12.0),
            (CompKey::Fructose, 12.0),
            (CompKey::Sucrose, 32.0),
            (CompKey::TotalPolyols, 0.0),
            (CompKey::TotalArtificial, 0.0),
            (CompKey::TotalSweeteners, 56.0),
            (CompKey::POD, 62.36),
            (CompKey::NetPAC, 77.6),
            (CompKey::TotalPAC, 77.6),
            (CompKey::PACsgr, 77.6),
        ]);
    }

    pub(crate) const ING_SPEC_SWEETENER_HFCS42_STR: &str = r#"{
      "name": "High Fructose Corn Syrup 42",
      "category": "Sweetener",
      "SweetenerSpec": {
        "sweeteners": {
          "sugars": {
            "fructose": 42,
            "glucose": 52,
            "maltose": 4
          }
        },
        "other_carbohydrates": 2,
        "ByDryWeight": {
          "solids": 77
        },
        "pod": {
          "OfSolids": 95
        },
        "pac": {
          "OfSolids": {
            "molar_mass": 190
          }
        }
      }
    }"#;

    pub(crate) static ING_SPEC_SWEETENER_HFCS42: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "High Fructose Corn Syrup 42".to_string(),
        category: Category::Sweetener,
        spec: SweetenerSpec {
            sweeteners: Sweeteners::new().sugars(Sugars::new().fructose(42.0).glucose(52.0).maltose(4.0)),
            fiber: None,
            other_carbohydrates: Some(2.0),
            other_solids: None,
            basis: CompositionBasis::ByDryWeight { solids: 77.0 },
            pod: Some(Scaling::OfSolids(95.0)),
            pac: Some(Scaling::OfSolids(Unit::MolarMass(190.0))),
        }
        .into(),
    });

    #[test]
    fn to_composition_sweetener_spec_hfcs42() {
        let comp = asset_composition(&ING_SPEC_SWEETENER_HFCS42);

        comp.assert_all_keys(&[
            // @todo This is a bit higher than reference 281
            (CompKey::Energy, 308.0),
            (CompKey::OtherSNFS, 1.54),
            (CompKey::TotalSolids, 77.0),
            (CompKey::TotalSNF, 77.0),
            (CompKey::TotalSNFS, 1.54),
            (CompKey::Water, 23.0),
            (CompKey::TotalCarbohydrates, 77.0),
            (CompKey::TotalSugars, 75.46),
            (CompKey::Glucose, 40.04),
            (CompKey::Fructose, 32.34),
            (CompKey::Maltose, 3.08),
            (CompKey::TotalPolyols, 0.0),
            (CompKey::TotalArtificial, 0.0),
            (CompKey::TotalSweeteners, 75.46),
            (CompKey::POD, 73.15),
            (CompKey::NetPAC, 138.6),
            (CompKey::TotalPAC, 138.6),
            (CompKey::PACsgr, 138.6),
        ]);
    }

    pub(crate) const ING_SPEC_SWEETENER_MALTODEXTRIN_10_DE_STR: &str = r#"{
      "name": "Maltodextrin 10 DE",
      "category": "Sweetener",
      "SweetenerSpec": {
        "sweeteners": {
          "sugars": {
            "glucose": 0.6,
            "maltose": 2.8
          }
        },
        "other_carbohydrates": 96.6,
        "ByDryWeight": {
          "solids": 95
        },
        "pod": {
          "OfSolids": 11
        },
        "pac": {
          "OfSolids": {
            "molar_mass": 1800
          }
        }
      }
    }"#;

    pub(crate) static ING_SPEC_SWEETENER_MALTODEXTRIN_10_DE: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Maltodextrin 10 DE".to_string(),
            category: Category::Sweetener,
            spec: SweetenerSpec {
                sweeteners: Sweeteners::new().sugars(Sugars::new().glucose(0.6).maltose(2.8)),
                fiber: None,
                other_carbohydrates: Some(96.6),
                other_solids: None,
                basis: CompositionBasis::ByDryWeight { solids: 95.0 },
                pod: Some(Scaling::OfSolids(11.0)),
                pac: Some(Scaling::OfSolids(Unit::MolarMass(1800.0))),
            }
            .into(),
        });

    #[test]
    fn to_composition_sweetener_spec_maltodextrin_10_de() {
        let comp = asset_composition(&ING_SPEC_SWEETENER_MALTODEXTRIN_10_DE);

        comp.assert_all_keys(&[
            (CompKey::Energy, 380.0),
            (CompKey::OtherSNFS, 91.77),
            (CompKey::TotalSolids, 95.0),
            (CompKey::TotalSNF, 95.0),
            (CompKey::TotalSNFS, 91.77),
            (CompKey::Water, 5.0),
            (CompKey::TotalCarbohydrates, 95.0),
            (CompKey::TotalSugars, 3.23),
            (CompKey::Glucose, 0.57),
            (CompKey::Fructose, 0.0),
            (CompKey::Maltose, 2.66),
            (CompKey::TotalPolyols, 0.0),
            (CompKey::TotalSweeteners, 3.23),
            (CompKey::POD, 10.45),
            (CompKey::NetPAC, 18.05),
            (CompKey::TotalPAC, 18.05),
            (CompKey::PACsgr, 18.05),
        ]);
    }

    pub(crate) const ING_SPEC_SWEETENER_GLUCOSE_SYRUP_42_DE_STR: &str = r#"{
      "name": "Glucose Syrup 42 DE",
      "category": "Sweetener",
      "SweetenerSpec": {
        "sweeteners": {
          "sugars": {
            "glucose": 19,
            "maltose": 14
          }
        },
        "other_carbohydrates": 67,
        "ByDryWeight": {
          "solids": 80
        },
        "pod": {
          "OfSolids": 50
        },
        "pac": {
          "OfSolids": {
            "molar_mass": 429
          }
        }
      }
    }"#;

    pub(crate) static ING_SPEC_SWEETENER_GLUCOSE_SYRUP_42_DE: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Glucose Syrup 42 DE".to_string(),
            category: Category::Sweetener,
            spec: SweetenerSpec {
                sweeteners: Sweeteners::new().sugars(Sugars::new().glucose(19.0).maltose(14.0)),
                fiber: None,
                other_carbohydrates: Some(67.0),
                other_solids: None,
                basis: CompositionBasis::ByDryWeight { solids: 80.0 },
                pod: Some(Scaling::OfSolids(50.0)),
                pac: Some(Scaling::OfSolids(Unit::MolarMass(429.0))),
            }
            .into(),
        });

    #[test]
    fn to_composition_sweetener_spec_glucose_syrup_42_de() {
        let comp = asset_composition(&ING_SPEC_SWEETENER_GLUCOSE_SYRUP_42_DE);

        comp.assert_all_keys(&[
            // @todo This is significantly higher than reference 280
            (CompKey::Energy, 320.0),
            (CompKey::OtherSNFS, 53.6),
            (CompKey::TotalSolids, 80.0),
            (CompKey::TotalSNF, 80.0),
            (CompKey::TotalSNFS, 53.6),
            (CompKey::Water, 20.0),
            (CompKey::TotalCarbohydrates, 80.0),
            (CompKey::TotalSugars, 26.4),
            (CompKey::Glucose, 15.2),
            (CompKey::Fructose, 0.0),
            (CompKey::Maltose, 11.2),
            (CompKey::TotalPolyols, 0.0),
            (CompKey::TotalSweeteners, 26.4),
            (CompKey::POD, 40.0),
            (CompKey::NetPAC, 63.2),
            (CompKey::TotalPAC, 63.2),
            (CompKey::PACsgr, 63.2),
        ]);
    }

    pub(crate) const ING_SPEC_SWEETENER_GLUCOSE_POWDER_25_DE_STR: &str = r#"{
      "name": "Glucose Powder 25 DE",
      "category": "Sweetener",
      "SweetenerSpec": {
        "sweeteners": {
          "sugars": {
            "glucose": 2,
            "maltose": 10
          }
        },
        "other_carbohydrates": 88,
        "ByDryWeight": {
          "solids": 95
        },
        "pod": {
          "OfSolids": 28
        },
        "pac": {
          "OfSolids": {
            "molar_mass": 720
          }
        }
      }
    }"#;

    pub(crate) static ING_SPEC_SWEETENER_GLUCOSE_POWDER_25_DE: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Glucose Powder 25 DE".to_string(),
            category: Category::Sweetener,
            spec: SweetenerSpec {
                sweeteners: Sweeteners::new().sugars(Sugars::new().glucose(2.0).maltose(10.0)),
                fiber: None,
                other_carbohydrates: Some(88.0),
                other_solids: None,
                basis: CompositionBasis::ByDryWeight { solids: 95.0 },
                pod: Some(Scaling::OfSolids(28.0)),
                pac: Some(Scaling::OfSolids(Unit::MolarMass(720.0))),
            }
            .into(),
        });

    #[test]
    fn to_composition_sweetener_spec_glucose_powder_25_de() {
        let comp = asset_composition(&ING_SPEC_SWEETENER_GLUCOSE_POWDER_25_DE);

        comp.assert_all_keys(&[
            (CompKey::Energy, 380.0),
            (CompKey::OtherSNFS, 83.6),
            (CompKey::TotalSolids, 95.0),
            (CompKey::TotalSNF, 95.0),
            (CompKey::TotalSNFS, 83.6),
            (CompKey::Water, 5.0),
            (CompKey::TotalCarbohydrates, 95.0),
            (CompKey::TotalSugars, 11.4),
            (CompKey::Glucose, 1.9),
            (CompKey::Fructose, 0.0),
            (CompKey::Maltose, 9.5),
            (CompKey::TotalPolyols, 0.0),
            (CompKey::TotalArtificial, 0.0),
            (CompKey::TotalSweeteners, 11.4),
            (CompKey::POD, 26.6),
            (CompKey::NetPAC, 44.65),
            (CompKey::TotalPAC, 44.65),
            (CompKey::PACsgr, 44.65),
        ]);
    }

    pub(crate) const ING_SPEC_SWEETENER_GLUCOSE_POWDER_42_DE_STR: &str = r#"{
      "name": "Glucose Powder 42 DE",
      "category": "Sweetener",
      "SweetenerSpec": {
        "sweeteners": {
          "sugars": {
            "glucose": 19,
            "maltose": 14
          }
        },
        "other_carbohydrates": 67,
        "ByDryWeight": {
          "solids": 95
        },
        "pod": {
          "OfSolids": 50
        },
        "pac": {
          "OfSolids": {
            "molar_mass": 429
          }
        }
      }
    }"#;

    pub(crate) static ING_SPEC_SWEETENER_GLUCOSE_POWDER_42_DE: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Glucose Powder 42 DE".to_string(),
            category: Category::Sweetener,
            spec: SweetenerSpec {
                sweeteners: Sweeteners::new().sugars(Sugars::new().glucose(19.0).maltose(14.0)),
                fiber: None,
                other_carbohydrates: Some(67.0),
                other_solids: None,
                basis: CompositionBasis::ByDryWeight { solids: 95.0 },
                pod: Some(Scaling::OfSolids(50.0)),
                pac: Some(Scaling::OfSolids(Unit::MolarMass(429.0))),
            }
            .into(),
        });

    #[test]
    fn to_composition_sweetener_spec_glucose_powder_42_de() {
        let comp = asset_composition(&ING_SPEC_SWEETENER_GLUCOSE_POWDER_42_DE);

        comp.assert_all_keys(&[
            (CompKey::Energy, 380.0),
            (CompKey::OtherSNFS, 63.65),
            (CompKey::TotalSolids, 95.0),
            (CompKey::TotalSNF, 95.0),
            (CompKey::TotalSNFS, 63.65),
            (CompKey::Water, 5.0),
            (CompKey::TotalCarbohydrates, 95.0),
            (CompKey::TotalSugars, 31.35),
            (CompKey::Glucose, 18.05),
            (CompKey::Fructose, 0.0),
            (CompKey::Maltose, 13.3),
            (CompKey::TotalPolyols, 0.0),
            (CompKey::TotalArtificial, 0.0),
            (CompKey::TotalSweeteners, 31.35),
            (CompKey::POD, 47.5),
            (CompKey::NetPAC, 75.05),
            (CompKey::TotalPAC, 75.05),
            (CompKey::PACsgr, 75.05),
        ]);
    }

    pub(crate) const ING_SPEC_SWEETENER_INULIN_POWDER_STR: &str = r#"{
      "name": "Inulin Powder",
      "category": "Sweetener",
      "SweetenerSpec": {
        "sweeteners": {
          "sugars": {
            "glucose": 3,
            "fructose": 3,
            "sucrose": 3
          }
        },
        "fiber": {
          "inulin": 91
        },
        "ByDryWeight": {
          "solids": 98
        }
      }
    }"#;

    pub(crate) static ING_SPEC_SWEETENER_INULIN_POWDER: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Inulin Powder".to_string(),
        category: Category::Sweetener,
        spec: SweetenerSpec {
            sweeteners: Sweeteners::new().sugars(Sugars::new().glucose(3.0).fructose(3.0).sucrose(3.0)),
            fiber: Some(Fibers::new().inulin(91.0)),
            other_carbohydrates: None,
            other_solids: None,
            basis: CompositionBasis::ByDryWeight { solids: 98.0 },
            pod: None,
            pac: None,
        }
        .into(),
    });

    pub(crate) static COMP_INULIN_POWDER: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(169.05)
            .solids(
                Solids::new().other(
                    SolidsBreakdown::new().carbohydrates(
                        Carbohydrates::new()
                            .fiber(Fibers::new().inulin(89.18))
                            .sugars(Sugars::new().glucose(2.94).fructose(2.94).sucrose(2.94)),
                    ),
                ),
            )
            .pod(10.3782)
            .pac(PAC::new().sugars(14.112))
    });

    #[test]
    fn to_composition_sweetener_spec_inulin_powder() {
        let comp = asset_composition(&ING_SPEC_SWEETENER_INULIN_POWDER);

        comp.assert_all_keys(&[
            (CompKey::Energy, 169.05),
            (CompKey::OtherSNFS, 89.18),
            (CompKey::TotalSolids, 98.0),
            (CompKey::TotalSNF, 98.0),
            (CompKey::TotalSNFS, 89.18),
            (CompKey::Water, 2.0),
            (CompKey::TotalCarbohydrates, 98.0),
            (CompKey::TotalFiber, 89.18),
            (CompKey::Inulin, 89.18),
            (CompKey::TotalSugars, 8.82),
            (CompKey::Glucose, 2.94),
            (CompKey::Fructose, 2.94),
            (CompKey::Sucrose, 2.94),
            (CompKey::TotalPolyols, 0.0),
            (CompKey::TotalArtificial, 0.0),
            (CompKey::TotalSweeteners, 8.82),
            (CompKey::POD, 10.3782),
            (CompKey::NetPAC, 14.112),
            (CompKey::TotalPAC, 14.112),
            (CompKey::PACsgr, 14.112),
        ]);
    }

    pub(crate) const ING_SPEC_SWEETENER_HP_INULIN_POWDER_STR: &str = r#"{
      "name": "HP Inulin Powder",
      "category": "Sweetener",
      "SweetenerSpec": {
        "sweeteners": {},
        "fiber": {
          "inulin": 100
        },
        "ByDryWeight": {
          "solids": 98
        }
      }
    }"#;

    pub(crate) static ING_SPEC_SWEETENER_HP_INULIN_POWDER: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "HP Inulin Powder".to_string(),
            category: Category::Sweetener,
            spec: SweetenerSpec {
                sweeteners: Sweeteners::new(),
                fiber: Some(Fibers::new().inulin(100.0)),
                other_carbohydrates: None,
                other_solids: None,
                basis: CompositionBasis::ByDryWeight { solids: 98.0 },
                pod: None,
                pac: None,
            }
            .into(),
        });

    pub(crate) static COMP_HP_INULIN_POWDER: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new().energy(147.0).solids(
            Solids::new()
                .other(SolidsBreakdown::new().carbohydrates(Carbohydrates::new().fiber(Fibers::new().inulin(98.0)))),
        )
    });

    #[test]
    fn to_composition_sweetener_spec_hp_inulin_powder() {
        let comp = asset_composition(&ING_SPEC_SWEETENER_HP_INULIN_POWDER);

        comp.assert_all_keys(&[
            (CompKey::Energy, 147.0),
            (CompKey::OtherSNFS, 98.0),
            (CompKey::TotalSolids, 98.0),
            (CompKey::TotalSNF, 98.0),
            (CompKey::TotalSNFS, 98.0),
            (CompKey::Water, 2.0),
            (CompKey::TotalCarbohydrates, 98.0),
            (CompKey::TotalFiber, 98.0),
            (CompKey::Inulin, 98.0),
            (CompKey::TotalSugars, 0.0),
            (CompKey::TotalPolyols, 0.0),
            (CompKey::TotalArtificial, 0.0),
            (CompKey::TotalSweeteners, 0.0),
            (CompKey::POD, 0.0),
            (CompKey::PACsgr, 0.0),
        ]);
    }

    pub(crate) const ING_SPEC_SWEETENER_OLIGOFRUCTOSE_POWDER_STR: &str = r#"{
      "name": "Oligofructose Powder",
      "category": "Sweetener",
      "SweetenerSpec": {
        "sweeteners": {
          "sugars": {
            "glucose": 1.67,
            "fructose": 1.67,
            "sucrose": 1.66
          }
        },
        "fiber": {
          "oligofructose": 95
        },
        "ByDryWeight": {
          "solids": 98
        }
      }
    }"#;

    pub(crate) static ING_SPEC_SWEETENER_OLIGOFRUCTOSE_POWDER: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Oligofructose Powder".to_string(),
            category: Category::Sweetener,
            spec: SweetenerSpec {
                sweeteners: Sweeteners::new().sugars(Sugars::new().glucose(1.67).fructose(1.67).sucrose(1.66)),
                fiber: Some(Fibers::new().oligofructose(95.0)),
                other_carbohydrates: None,
                other_solids: None,
                basis: CompositionBasis::ByDryWeight { solids: 98.0 },
                pod: None,
                pac: None,
            }
            .into(),
        });

    pub(crate) static COMP_OLIGOFRUCTOSE_POWDER: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(159.25)
            .solids(
                Solids::new().other(
                    SolidsBreakdown::new().carbohydrates(
                        Carbohydrates::new()
                            .fiber(Fibers::new().oligofructose(93.1))
                            .sugars(Sugars::new().glucose(1.6366).fructose(1.6366).sucrose(1.6268)),
                    ),
                ),
            )
            .pod(43.0074)
            .pac(PAC::new().sugars(7.8459))
    });

    #[test]
    fn to_composition_sweetener_spec_oligofructose_powder() {
        let comp = asset_composition(&ING_SPEC_SWEETENER_OLIGOFRUCTOSE_POWDER);

        comp.assert_all_keys(&[
            (CompKey::Energy, 159.25),
            (CompKey::OtherSNFS, 93.1),
            (CompKey::TotalSolids, 98.0),
            (CompKey::TotalSNF, 98.0),
            (CompKey::TotalSNFS, 93.1),
            (CompKey::Water, 2.0),
            (CompKey::TotalCarbohydrates, 98.0),
            (CompKey::TotalFiber, 93.1),
            (CompKey::Oligofructose, 93.1),
            (CompKey::TotalSugars, 4.9),
            (CompKey::Glucose, 1.6366),
            (CompKey::Fructose, 1.6366),
            (CompKey::Sucrose, 1.6268),
            (CompKey::TotalPolyols, 0.0),
            (CompKey::TotalArtificial, 0.0),
            (CompKey::TotalSweeteners, 4.9),
            (CompKey::POD, 43.007_398),
            (CompKey::NetPAC, 7.84588),
            (CompKey::TotalPAC, 7.84588),
            (CompKey::PACsgr, 7.84588),
        ]);
    }

    pub(crate) const ING_SPEC_SWEETENER_SPLENDA_SUCRALOSE_STR: &str = r#"{
      "name": "Splenda (Sucralose)",
      "category": "Sweetener",
      "SweetenerSpec": {
        "sweeteners": {
          "sugars": {
            "glucose": 55.0
          },
          "artificial": {
            "sucralose": 1.32
          }
        },
        "other_carbohydrates": 38.68,
        "ByTotalWeight": {
          "water": 5
        },
        "pod": {
          "OfWhole": 840
        },
        "pac": {
          "OfWhole": {
            "grams": 112.6
          }
        }
      }
    }"#;

    pub(crate) static ING_SPEC_SWEETENER_SPLENDA_SUCRALOSE: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Splenda (Sucralose)".to_string(),
            category: Category::Sweetener,
            spec: SweetenerSpec {
                sweeteners: Sweeteners::new()
                    .sugars(Sugars::new().glucose(55.0))
                    .artificial(ArtificialSweeteners::new().sucralose(1.32)),
                fiber: None,
                other_carbohydrates: Some(38.68),
                other_solids: None,
                basis: CompositionBasis::ByTotalWeight { water: 5.0 },
                pod: Some(Scaling::OfWhole(840.0)),
                pac: Some(Scaling::OfWhole(Unit::Grams(112.6))),
            }
            .into(),
        });

    pub(crate) static COMP_SPLENDA_SUCRALOSE: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(374.72)
            .solids(
                Solids::new().other(
                    SolidsBreakdown::new()
                        .carbohydrates(Carbohydrates::new().sugars(Sugars::new().glucose(55.0)).others(38.68))
                        .artificial_sweeteners(ArtificialSweeteners::new().sucralose(1.32)),
                ),
            )
            .pod(840.0)
            .pac(PAC::new().sugars(112.6))
    });

    #[test]
    fn to_composition_sweetener_spec_splenda_sucralose() {
        let comp = asset_composition(&ING_SPEC_SWEETENER_SPLENDA_SUCRALOSE);

        comp.assert_all_keys(&[
            (CompKey::Energy, 374.72),
            (CompKey::OtherSNFS, 40.0),
            (CompKey::TotalSolids, 95.0),
            (CompKey::TotalSNF, 95.0),
            (CompKey::TotalSNFS, 40.0),
            (CompKey::Water, 5.0),
            (CompKey::TotalCarbohydrates, 93.68),
            (CompKey::TotalFiber, 0.0),
            (CompKey::TotalSugars, 55.0),
            (CompKey::Glucose, 55.0),
            (CompKey::TotalPolyols, 0.0),
            (CompKey::TotalArtificial, 1.32),
            (CompKey::Sucralose, 1.32),
            (CompKey::TotalSweeteners, 56.32),
            (CompKey::POD, 840.0),
            (CompKey::NetPAC, 112.6),
            (CompKey::TotalPAC, 112.6),
            (CompKey::PACsgr, 112.6),
        ]);
    }

    #[test]
    fn to_composition_sweetener_spec_splenda_sucralose_manual_vs_calculated_pod_and_pac() {
        let manual_pod_pac_spec = ING_SPEC_SWEETENER_SPLENDA_SUCRALOSE.spec.clone();
        let mut auto_pod_pac_spec = manual_pod_pac_spec.clone();
        clear_pod_in_spec(&mut auto_pod_pac_spec);
        clear_pac_in_spec(&mut auto_pod_pac_spec);

        let comp_auto_pod_pac = auto_pod_pac_spec.to_composition().unwrap();
        let comp_manual_pod_pac = manual_pod_pac_spec.to_composition().unwrap();

        assert_comp_eq_percent(&comp_auto_pod_pac, &comp_manual_pod_pac, CompKey::POD, 0.75);
        assert_comp_eq_percent(&comp_auto_pod_pac, &comp_manual_pod_pac, CompKey::PACsgr, 6.6);
    }

    pub(crate) const ING_SPEC_SWEETENER_SPLENDA_STEVIA_STR: &str = r#"{
      "name": "Splenda (Stevia)",
      "category": "Sweetener",
      "SweetenerSpec": {
        "sweeteners": {
          "polyols": {
            "erythritol": 99.9
          },
          "artificial": {
            "steviosides": 0.1
          }
        },
        "ByDryWeight": {
          "solids": 100
        },
        "pod": {
          "OfWhole": 200
        }
      }
    }"#;

    pub(crate) static ING_SPEC_SWEETENER_SPLENDA_STEVIA: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Splenda (Stevia)".to_string(),
        category: Category::Sweetener,
        spec: SweetenerSpec {
            sweeteners: Sweeteners::new()
                .polyols(Polyols::new().erythritol(99.9))
                .artificial(ArtificialSweeteners::new().steviosides(0.1)),
            fiber: None,
            other_carbohydrates: None,
            other_solids: None,
            basis: CompositionBasis::ByDryWeight { solids: 100.0 },
            pod: Some(Scaling::OfWhole(200.0)),
            pac: None,
        }
        .into(),
    });

    pub(crate) static COMP_SPLENDA_STEVIA: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(19.98)
            .solids(
                Solids::new().other(
                    SolidsBreakdown::new()
                        .carbohydrates(Carbohydrates::new().polyols(Polyols::new().erythritol(99.9)))
                        .artificial_sweeteners(ArtificialSweeteners::new().steviosides(0.1)),
                ),
            )
            .pod(200.0)
            .pac(PAC::new().sugars(279.72))
    });

    #[test]
    fn to_composition_sweetener_spec_splenda_stevia() {
        let comp = asset_composition(&ING_SPEC_SWEETENER_SPLENDA_STEVIA);

        comp.assert_all_keys(&[
            (CompKey::Energy, 19.98),
            (CompKey::OtherSNFS, 100.0),
            (CompKey::TotalSolids, 100.0),
            (CompKey::TotalSNF, 100.0),
            (CompKey::TotalSNFS, 100.0),
            (CompKey::TotalCarbohydrates, 99.9),
            (CompKey::TotalFiber, 0.0),
            (CompKey::TotalSugars, 0.0),
            (CompKey::TotalPolyols, 99.9),
            (CompKey::Erythritol, 99.9),
            (CompKey::TotalArtificial, 0.1),
            (CompKey::Steviosides, 0.1),
            (CompKey::TotalSweeteners, 100.0),
            (CompKey::POD, 200.0),
            (CompKey::NetPAC, 279.72),
            (CompKey::TotalPAC, 279.72),
            (CompKey::PACsgr, 279.72),
        ]);
    }

    pub(crate) const ING_SPEC_SWEETENER_SPLENDA_MONK_FRUIT_STR: &str = r#"{
      "name": "Splenda (Monk Fruit)",
      "category": "Sweetener",
      "SweetenerSpec": {
        "sweeteners": {
          "polyols": {
            "erythritol": 99.9
          },
          "artificial": {
            "mogrosides": 0.1
          }
        },
        "ByDryWeight": {
          "solids": 100
        },
        "pod": {
          "OfWhole": 100
        }
      }
    }"#;

    pub(crate) static ING_SPEC_SWEETENER_SPLENDA_MONK_FRUIT: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Splenda (Monk Fruit)".to_string(),
            category: Category::Sweetener,
            spec: SweetenerSpec {
                sweeteners: Sweeteners::new()
                    .polyols(Polyols::new().erythritol(99.9))
                    .artificial(ArtificialSweeteners::new().mogrosides(0.1)),
                fiber: None,
                other_carbohydrates: None,
                other_solids: None,
                basis: CompositionBasis::ByDryWeight { solids: 100.0 },
                pod: Some(Scaling::OfWhole(100.0)),
                pac: None,
            }
            .into(),
        });

    pub(crate) static COMP_SPLENDA_MONK_FRUIT: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(19.98)
            .solids(
                Solids::new().other(
                    SolidsBreakdown::new()
                        .carbohydrates(Carbohydrates::new().polyols(Polyols::new().erythritol(99.9)))
                        .artificial_sweeteners(ArtificialSweeteners::new().mogrosides(0.1)),
                ),
            )
            .pod(100.0)
            .pac(PAC::new().sugars(279.72))
    });

    #[test]
    fn to_composition_sweetener_spec_splenda_monk_fruit() {
        let comp = asset_composition(&ING_SPEC_SWEETENER_SPLENDA_MONK_FRUIT);

        comp.assert_all_keys(&[
            (CompKey::Energy, 19.98),
            (CompKey::OtherSNFS, 100.0),
            (CompKey::TotalSolids, 100.0),
            (CompKey::TotalSNF, 100.0),
            (CompKey::TotalSNFS, 100.0),
            (CompKey::TotalCarbohydrates, 99.9),
            (CompKey::TotalFiber, 0.0),
            (CompKey::TotalSugars, 0.0),
            (CompKey::TotalPolyols, 99.9),
            (CompKey::Erythritol, 99.9),
            (CompKey::TotalArtificial, 0.1),
            (CompKey::Mogrosides, 0.1),
            (CompKey::TotalSweeteners, 100.0),
            (CompKey::POD, 100.0),
            (CompKey::NetPAC, 279.72),
            (CompKey::TotalPAC, 279.72),
            (CompKey::PACsgr, 279.72),
        ]);
    }

    pub(crate) const ING_SPEC_SWEETENER_SWEETLEAF_STEVIA_STR: &str = r#"{
      "name": "SweetLeaf Stevia",
      "category": "Sweetener",
      "SweetenerSpec": {
        "sweeteners": {
          "sugars": {
            "glucose": 2,
            "fructose": 2,
            "sucrose": 2
         },
          "artificial": {
            "steviosides": 5
          }
        },
        "fiber": { "inulin": 89 },
        "ByDryWeight": {
          "solids": 98
        },
        "pod": {
          "OfWhole": 1050
        }
      }
    }"#;

    pub(crate) static ING_SPEC_SWEETENER_SWEETLEAF_STEVIA: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "SweetLeaf Stevia".to_string(),
            category: Category::Sweetener,
            spec: SweetenerSpec {
                sweeteners: Sweeteners::new()
                    .sugars(Sugars::new().glucose(2.0).fructose(2.0).sucrose(2.0))
                    .artificial(ArtificialSweeteners::new().steviosides(5.0)),
                fiber: Some(Fibers::new().inulin(89.0)),
                other_carbohydrates: None,
                other_solids: None,
                basis: CompositionBasis::ByDryWeight { solids: 98.0 },
                pod: Some(Scaling::OfWhole(1050.0)),
                pac: None,
            }
            .into(),
        });

    pub(crate) static COMP_SWEETLEAF_STEVIA: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(154.35)
            .solids(
                Solids::new().other(
                    SolidsBreakdown::new()
                        .carbohydrates(
                            Carbohydrates::new()
                                .fiber(Fibers::new().inulin(87.22))
                                .sugars(Sugars::new().glucose(1.96).fructose(1.96).sucrose(1.96)),
                        )
                        .artificial_sweeteners(ArtificialSweeteners::new().steviosides(4.9)),
                ),
            )
            .pod(1050.0)
            .pac(PAC::new().sugars(9.408))
    });

    #[test]
    fn to_composition_sweetener_spec_sweetleaf_stevia() {
        let comp = asset_composition(&ING_SPEC_SWEETENER_SWEETLEAF_STEVIA);

        comp.assert_all_keys(&[
            (CompKey::Energy, 154.35),
            (CompKey::OtherSNFS, 92.12),
            (CompKey::TotalSolids, 98.0),
            (CompKey::TotalSNF, 98.0),
            (CompKey::TotalSNFS, 92.12),
            (CompKey::Water, 2.0),
            (CompKey::TotalCarbohydrates, 93.1),
            (CompKey::TotalFiber, 87.22),
            (CompKey::Inulin, 87.22),
            (CompKey::TotalSugars, 5.88),
            (CompKey::Glucose, 1.96),
            (CompKey::Fructose, 1.96),
            (CompKey::Sucrose, 1.96),
            (CompKey::TotalPolyols, 0.0),
            (CompKey::TotalArtificial, 4.9),
            (CompKey::Steviosides, 4.9),
            (CompKey::TotalSweeteners, 10.78),
            (CompKey::POD, 1050.0),
            (CompKey::NetPAC, 9.408),
            (CompKey::TotalPAC, 9.408),
            (CompKey::PACsgr, 9.408),
        ]);
    }

    pub(crate) const ING_SPEC_SWEETENER_SUGAR_TWIN_STR: &str = r#"{
      "name": "Sugar Twin",
      "category": "Sweetener",
      "SweetenerSpec": {
        "sweeteners": {
          "sugars": {
            "glucose": 61
          },
          "artificial": {
            "cyclamate": 33
          }
        },
        "ByTotalWeight": {
          "water": 6
        },
        "pod": {
          "OfWhole": 1050
        }
      }
    }"#;

    pub(crate) static ING_SPEC_SWEETENER_SUGAR_TWIN: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Sugar Twin".to_string(),
        category: Category::Sweetener,
        spec: SweetenerSpec {
            sweeteners: Sweeteners::new()
                .sugars(Sugars::new().glucose(61.0))
                .artificial(ArtificialSweeteners::new().cyclamate(33.0)),
            fiber: None,
            other_carbohydrates: None,
            other_solids: None,
            basis: CompositionBasis::ByTotalWeight { water: 6.0 },
            pod: Some(Scaling::OfWhole(1050.0)),
            pac: None,
        }
        .into(),
    });

    pub(crate) static COMP_SUGAR_TWIN: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(244.0)
            .solids(
                Solids::new().other(
                    SolidsBreakdown::new()
                        .carbohydrates(Carbohydrates::new().sugars(Sugars::new().glucose(61.0)))
                        .artificial_sweeteners(ArtificialSweeteners::new().cyclamate(33.0)),
                ),
            )
            .pod(1050.0)
            .pac(PAC::new().sugars(172.0))
    });

    #[test]
    fn to_composition_sweetener_spec_sugar_twin() {
        let comp = asset_composition(&ING_SPEC_SWEETENER_SUGAR_TWIN);

        comp.assert_all_keys(&[
            (CompKey::Energy, 244.0),
            (CompKey::OtherSNFS, 33.0),
            (CompKey::TotalSolids, 94.0),
            (CompKey::TotalSNF, 94.0),
            (CompKey::TotalSNFS, 33.0),
            (CompKey::Water, 6.0),
            (CompKey::TotalCarbohydrates, 61.0),
            (CompKey::TotalFiber, 0.0),
            (CompKey::TotalSugars, 61.0),
            (CompKey::Glucose, 61.0),
            (CompKey::TotalPolyols, 0.0),
            (CompKey::TotalArtificial, 33.0),
            (CompKey::Cyclamate, 33.0),
            (CompKey::TotalSweeteners, 94.0),
            (CompKey::POD, 1050.0),
            (CompKey::NetPAC, 172.0),
            (CompKey::TotalPAC, 172.0),
            (CompKey::PACsgr, 172.0),
        ]);
    }

    #[test]
    fn to_composition_sweetener_spec_sugar_twin_manual_vs_calculated_pod() {
        let manual_pod_spec = ING_SPEC_SWEETENER_SUGAR_TWIN.spec.clone();
        let mut auto_pod_spec = manual_pod_spec.clone();
        clear_pod_in_spec(&mut auto_pod_spec);

        let comp_auto_pod = auto_pod_spec.to_composition().unwrap();
        let comp_manual_pod = manual_pod_spec.to_composition().unwrap();

        assert_comp_eq_percent(&comp_auto_pod, &comp_manual_pod, CompKey::POD, 1.1);
    }

    pub(crate) const ING_SPEC_SWEETENER_STEVIA_IN_THE_RAW_PACKETS_STR: &str = r#"{
      "name": "Stevia In The Raw (Packets)",
      "category": "Sweetener",
      "SweetenerSpec": {
        "sweeteners": {
          "sugars": {
            "glucose": 89.0
          },
          "artificial": {
            "steviosides": 3.4
          }
        },
        "ByTotalWeight": {
          "water": 7.6
        },
        "pod": {
          "OfWhole": 840
        }
      }
    }"#;

    pub(crate) static ING_SPEC_SWEETENER_STEVIA_IN_THE_RAW_PACKETS: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Stevia In The Raw (Packets)".to_string(),
            category: Category::Sweetener,
            spec: SweetenerSpec {
                sweeteners: Sweeteners::new()
                    .sugars(Sugars::new().glucose(89.0))
                    .artificial(ArtificialSweeteners::new().steviosides(3.4)),
                fiber: None,
                other_carbohydrates: None,
                other_solids: None,
                basis: CompositionBasis::ByTotalWeight { water: 7.6 },
                pod: Some(Scaling::OfWhole(840.0)),
                pac: None,
            }
            .into(),
        });

    pub(crate) static COMP_STEVIA_IN_THE_RAW_PACKETS: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(356.0)
            .solids(
                Solids::new().other(
                    SolidsBreakdown::new()
                        .carbohydrates(Carbohydrates::new().sugars(Sugars::new().glucose(89.0)))
                        .artificial_sweeteners(ArtificialSweeteners::new().steviosides(3.4)),
                ),
            )
            .pod(840.0)
            .pac(PAC::new().sugars(169.1))
    });

    #[test]
    fn to_composition_sweetener_spec_stevia_in_the_raw_packets() {
        let comp = asset_composition(&ING_SPEC_SWEETENER_STEVIA_IN_THE_RAW_PACKETS);

        comp.assert_all_keys(&[
            (CompKey::Energy, 356.0),
            (CompKey::OtherSNFS, 3.4),
            (CompKey::TotalSolids, 92.4),
            (CompKey::TotalSNF, 92.4),
            (CompKey::TotalSNFS, 3.4),
            (CompKey::Water, 7.6),
            (CompKey::TotalCarbohydrates, 89.0),
            (CompKey::TotalFiber, 0.0),
            (CompKey::TotalSugars, 89.0),
            (CompKey::Glucose, 89.0),
            (CompKey::TotalPolyols, 0.0),
            (CompKey::TotalArtificial, 3.4),
            (CompKey::Steviosides, 3.4),
            (CompKey::TotalSweeteners, 92.4),
            (CompKey::POD, 840.0),
            (CompKey::NetPAC, 169.1),
            (CompKey::TotalPAC, 169.1),
            (CompKey::PACsgr, 169.1),
        ]);
    }

    #[test]
    fn to_composition_sweetener_spec_stevia_in_the_raw_packets_manual_vs_calculated_pod() {
        let manual_pod_spec = ING_SPEC_SWEETENER_STEVIA_IN_THE_RAW_PACKETS.spec.clone();
        let mut auto_pod_spec = manual_pod_spec.clone();
        clear_pod_in_spec(&mut auto_pod_spec);

        let comp_auto_pod = auto_pod_spec.to_composition().unwrap();
        let comp_manual_pod = manual_pod_spec.to_composition().unwrap();

        assert_comp_eq_percent(&comp_auto_pod, &comp_manual_pod, CompKey::POD, 0.5);
    }

    pub(crate) const ING_SPEC_SWEETENER_STEVIA_IN_THE_RAW_BAKERS_BAG_STR: &str = r#"{
      "name": "Stevia In The Raw (Bakers Bag)",
      "category": "Sweetener",
      "SweetenerSpec": {
        "sweeteners": {
          "artificial": {
            "steviosides": 3.45
          }
        },
        "other_carbohydrates": 91.55,
        "ByTotalWeight": {
          "water": 5
        },
        "pod": {
          "OfWhole": 775
        },
        "pac": {
          "OfSolids": {
            "molar_mass": 1800
          }
        }
      }
    }"#;

    pub(crate) static ING_SPEC_SWEETENER_STEVIA_IN_THE_RAW_BAKERS_BAG: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Stevia In The Raw (Bakers Bag)".to_string(),
            category: Category::Sweetener,
            spec: SweetenerSpec {
                sweeteners: Sweeteners::new().artificial(ArtificialSweeteners::new().steviosides(3.45)),
                fiber: None,
                other_carbohydrates: Some(91.55),
                other_solids: None,
                basis: CompositionBasis::ByTotalWeight { water: 5.0 },
                pod: Some(Scaling::OfWhole(775.0)),
                pac: Some(Scaling::OfSolids(Unit::MolarMass(1800.0))),
            }
            .into(),
        });

    pub(crate) static COMP_STEVIA_IN_THE_RAW_BAKERS_BAG: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(366.2)
            .solids(
                Solids::new().other(
                    SolidsBreakdown::new()
                        .carbohydrates(Carbohydrates::new().others(91.55))
                        .artificial_sweeteners(ArtificialSweeteners::new().steviosides(3.45)),
                ),
            )
            .pod(775.0)
            .pac(PAC::new().sugars(18.05))
    });

    #[test]
    fn to_composition_sweetener_spec_stevia_in_the_raw_bakers_bag() {
        let comp = asset_composition(&ING_SPEC_SWEETENER_STEVIA_IN_THE_RAW_BAKERS_BAG);

        comp.assert_all_keys(&[
            (CompKey::Energy, 366.2),
            (CompKey::OtherSNFS, 95.0),
            (CompKey::TotalSolids, 95.0),
            (CompKey::TotalSNF, 95.0),
            (CompKey::TotalSNFS, 95.0),
            (CompKey::Water, 5.0),
            (CompKey::TotalCarbohydrates, 91.55),
            (CompKey::TotalFiber, 0.0),
            (CompKey::TotalSugars, 0.0),
            (CompKey::TotalPolyols, 0.0),
            (CompKey::TotalArtificial, 3.45),
            (CompKey::Steviosides, 3.45),
            (CompKey::TotalSweeteners, 3.45),
            (CompKey::POD, 775.0),
            (CompKey::NetPAC, 18.05),
            (CompKey::TotalPAC, 18.05),
            (CompKey::PACsgr, 18.05),
        ]);
    }

    #[test]
    fn to_composition_sweetener_spec_stevia_in_the_raw_bakers_bag_manual_vs_calculated_pod() {
        let manual_pod_spec = ING_SPEC_SWEETENER_STEVIA_IN_THE_RAW_BAKERS_BAG.spec.clone();
        let mut auto_pod_spec = manual_pod_spec.clone();
        clear_pod_in_spec(&mut auto_pod_spec);

        let comp_auto_pod = auto_pod_spec.to_composition().unwrap();
        let comp_manual_pod = manual_pod_spec.to_composition().unwrap();

        assert_comp_eq_percent(&comp_auto_pod, &comp_manual_pod, CompKey::POD, 0.2);
    }

    pub(crate) static INGREDIENT_ASSETS_TABLE_SWEETENER: LazyLock<Vec<(&str, IngredientSpec, Option<Composition>)>> =
        LazyLock::new(|| {
            vec![
                (ING_SPEC_SWEETENER_SUCROSE_STR, ING_SPEC_SWEETENER_SUCROSE.clone(), Some(*COMP_SUCROSE)),
                (ING_SPEC_SWEETENER_DEXTROSE_STR, ING_SPEC_SWEETENER_DEXTROSE.clone(), Some(*COMP_DEXTROSE)),
                (ING_SPEC_SWEETENER_FRUCTOSE_STR, ING_SPEC_SWEETENER_FRUCTOSE.clone(), Some(*COMP_FRUCTOSE)),
                (ING_SPEC_SWEETENER_LACTOSE_STR, ING_SPEC_SWEETENER_LACTOSE.clone(), Some(*COMP_LACTOSE)),
                (ING_SPEC_SWEETENER_MALTOSE_STR, ING_SPEC_SWEETENER_MALTOSE.clone(), Some(*COMP_MALTOSE)),
                (ING_SPEC_SWEETENER_TREHALOSE_STR, ING_SPEC_SWEETENER_TREHALOSE.clone(), Some(*COMP_TREHALOSE)),
                (ING_SPEC_SWEETENER_ERYTHRITOL_STR, ING_SPEC_SWEETENER_ERYTHRITOL.clone(), Some(*COMP_ERYTHRITOL)),
                (ING_SPEC_SWEETENER_INVERT_SUGAR_STR, ING_SPEC_SWEETENER_INVERT_SUGAR.clone(), None),
                (ING_SPEC_SWEETENER_HONEY_STR, ING_SPEC_SWEETENER_HONEY.clone(), None),
                (ING_SPEC_SWEETENER_MAPLE_SYRUP_STR, ING_SPEC_SWEETENER_MAPLE_SYRUP.clone(), Some(*COMP_MAPLE_SYRUP)),
                (
                    ING_SPEC_SWEETENER_FANCY_MOLASSES_STR,
                    ING_SPEC_SWEETENER_FANCY_MOLASSES.clone(),
                    Some(*COMP_FANCY_MOLASSES),
                ),
                (ING_SPEC_SWEETENER_HFCS42_STR, ING_SPEC_SWEETENER_HFCS42.clone(), None),
                (ING_SPEC_SWEETENER_MALTODEXTRIN_10_DE_STR, ING_SPEC_SWEETENER_MALTODEXTRIN_10_DE.clone(), None),
                (ING_SPEC_SWEETENER_GLUCOSE_SYRUP_42_DE_STR, ING_SPEC_SWEETENER_GLUCOSE_SYRUP_42_DE.clone(), None),
                (ING_SPEC_SWEETENER_GLUCOSE_POWDER_25_DE_STR, ING_SPEC_SWEETENER_GLUCOSE_POWDER_25_DE.clone(), None),
                (ING_SPEC_SWEETENER_GLUCOSE_POWDER_42_DE_STR, ING_SPEC_SWEETENER_GLUCOSE_POWDER_42_DE.clone(), None),
                (
                    ING_SPEC_SWEETENER_INULIN_POWDER_STR,
                    ING_SPEC_SWEETENER_INULIN_POWDER.clone(),
                    Some(*COMP_INULIN_POWDER),
                ),
                (
                    ING_SPEC_SWEETENER_HP_INULIN_POWDER_STR,
                    ING_SPEC_SWEETENER_HP_INULIN_POWDER.clone(),
                    Some(*COMP_HP_INULIN_POWDER),
                ),
                (
                    ING_SPEC_SWEETENER_OLIGOFRUCTOSE_POWDER_STR,
                    ING_SPEC_SWEETENER_OLIGOFRUCTOSE_POWDER.clone(),
                    Some(*COMP_OLIGOFRUCTOSE_POWDER),
                ),
                (
                    ING_SPEC_SWEETENER_SPLENDA_SUCRALOSE_STR,
                    ING_SPEC_SWEETENER_SPLENDA_SUCRALOSE.clone(),
                    Some(*COMP_SPLENDA_SUCRALOSE),
                ),
                (
                    ING_SPEC_SWEETENER_SPLENDA_STEVIA_STR,
                    ING_SPEC_SWEETENER_SPLENDA_STEVIA.clone(),
                    Some(*COMP_SPLENDA_STEVIA),
                ),
                (
                    ING_SPEC_SWEETENER_SPLENDA_MONK_FRUIT_STR,
                    ING_SPEC_SWEETENER_SPLENDA_MONK_FRUIT.clone(),
                    Some(*COMP_SPLENDA_MONK_FRUIT),
                ),
                (
                    ING_SPEC_SWEETENER_SWEETLEAF_STEVIA_STR,
                    ING_SPEC_SWEETENER_SWEETLEAF_STEVIA.clone(),
                    Some(*COMP_SWEETLEAF_STEVIA),
                ),
                (ING_SPEC_SWEETENER_SUGAR_TWIN_STR, ING_SPEC_SWEETENER_SUGAR_TWIN.clone(), Some(*COMP_SUGAR_TWIN)),
                (
                    ING_SPEC_SWEETENER_STEVIA_IN_THE_RAW_PACKETS_STR,
                    ING_SPEC_SWEETENER_STEVIA_IN_THE_RAW_PACKETS.clone(),
                    Some(*COMP_STEVIA_IN_THE_RAW_PACKETS),
                ),
                (
                    ING_SPEC_SWEETENER_STEVIA_IN_THE_RAW_BAKERS_BAG_STR,
                    ING_SPEC_SWEETENER_STEVIA_IN_THE_RAW_BAKERS_BAG.clone(),
                    Some(*COMP_STEVIA_IN_THE_RAW_BAKERS_BAG),
                ),
            ]
        });

    #[test]
    fn to_composition_err_on_negative_other_fields() {
        let base = SweetenerSpec {
            sweeteners: Sweeteners::new().sugars(Sugars::new().sucrose(100.0)),
            fiber: None,
            other_carbohydrates: None,
            other_solids: None,
            basis: CompositionBasis::ByDryWeight { solids: 100.0 },
            pod: None,
            pac: None,
        };

        let neg_cases = [
            SweetenerSpec {
                other_carbohydrates: Some(-1.0),
                ..base
            },
            SweetenerSpec {
                other_solids: Some(-1.0),
                ..base
            },
        ];

        for spec in neg_cases {
            assert!(matches!(spec.to_composition(), Err(Error::CompositionNotPositive(_))));
        }
    }

    #[test]
    fn to_composition_err_by_dry_weight_when_components_exceed_100() {
        let spec = SweetenerSpec {
            sweeteners: Sweeteners::new().sugars(Sugars::new().sucrose(105.0)),
            fiber: None,
            other_carbohydrates: None,
            other_solids: None,
            basis: CompositionBasis::ByDryWeight { solids: 80.0 },
            pod: None,
            pac: None,
        };
        assert!(matches!(spec.to_composition(), Err(Error::CompositionNotWithin100Percent(_))));
    }

    #[test]
    fn to_composition_err_by_dry_weight_when_solids_exceed_100() {
        let spec = SweetenerSpec {
            sweeteners: Sweeteners::new().sugars(Sugars::new().sucrose(100.0)),
            fiber: None,
            other_carbohydrates: None,
            other_solids: None,
            basis: CompositionBasis::ByDryWeight { solids: 110.0 },
            pod: None,
            pac: None,
        };
        assert!(matches!(spec.to_composition(), Err(Error::CompositionNotWithin100Percent(_))));
    }

    #[test]
    fn to_composition_err_by_total_weight_when_components_do_not_sum_to_100() {
        let spec = SweetenerSpec {
            sweeteners: Sweeteners::new().sugars(Sugars::new().sucrose(60.0)),
            fiber: None,
            other_carbohydrates: None,
            other_solids: None,
            basis: CompositionBasis::ByTotalWeight { water: 20.0 },
            pod: None,
            pac: None,
        };
        assert!(matches!(spec.to_composition(), Err(Error::CompositionNot100Percent(_))));
    }

    #[test]
    fn to_composition_err_when_pod_cannot_be_computed() {
        let spec = SweetenerSpec {
            sweeteners: Sweeteners::new().sugars(Sugars::new().other(5.0)),
            fiber: None,
            other_carbohydrates: None,
            other_solids: None,
            basis: CompositionBasis::ByDryWeight { solids: 100.0 },
            pod: None,
            pac: None,
        };
        assert!(matches!(spec.to_composition(), Err(Error::CannotComputePOD(_))));
    }

    #[test]
    fn to_composition_err_when_pac_cannot_be_computed() {
        let spec = SweetenerSpec {
            sweeteners: Sweeteners::new().sugars(Sugars::new().other(5.0)),
            fiber: None,
            other_carbohydrates: None,
            other_solids: None,
            basis: CompositionBasis::ByDryWeight { solids: 100.0 },
            pod: Some(Scaling::OfWhole(50.0)), // skip to_pod()
            pac: None,                         // calls to_pac() -> fails
        };
        assert!(matches!(spec.to_composition(), Err(Error::CannotComputePAC(_))));
    }

    #[test]
    fn to_composition_err_on_unsupported_pac_unit() {
        let base = SweetenerSpec {
            sweeteners: Sweeteners::new().sugars(Sugars::new().sucrose(100.0)),
            fiber: None,
            other_carbohydrates: None,
            other_solids: None,
            basis: CompositionBasis::ByDryWeight { solids: 100.0 },
            pod: Some(Scaling::OfWhole(100.0)),
            pac: None,
        };

        let unsupported_cases = [
            SweetenerSpec {
                pac: Some(Scaling::OfWhole(Unit::Milliliters(100.0))),
                ..base
            },
            SweetenerSpec {
                pac: Some(Scaling::OfWhole(Unit::Percent(100.0))),
                ..base
            },
            SweetenerSpec {
                pac: Some(Scaling::OfSolids(Unit::Milliliters(100.0))),
                ..base
            },
            SweetenerSpec {
                pac: Some(Scaling::OfSolids(Unit::Percent(100.0))),
                ..base
            },
        ];
        for spec in unsupported_cases {
            assert!(matches!(spec.to_composition(), Err(Error::UnsupportedCompositionUnit(_))));
        }
    }

    #[test]
    fn to_composition_err_when_energy_cannot_be_computed() {
        // polyols.other != 0 causes energy() to fail;
        // pod/pac provided as Some(...) to bypass to_pod()/to_pac() checks
        let spec = SweetenerSpec {
            sweeteners: Sweeteners::new().polyols(Polyols::new().other(5.0)),
            fiber: None,
            other_carbohydrates: None,
            other_solids: None,
            basis: CompositionBasis::ByTotalWeight { water: 95.0 },
            pod: Some(Scaling::OfWhole(50.0)),
            pac: Some(Scaling::OfWhole(Unit::Grams(50.0))),
        };
        assert!(matches!(spec.to_composition(), Err(Error::CannotComputeEnergy(_))));
    }
}

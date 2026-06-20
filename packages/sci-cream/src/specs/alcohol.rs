//! [`AlcoholSpec`] and associated implementations, for alcohol beverages and other ingredients

use serde::{Deserialize, Serialize};

use crate::{
    composition::{Alcohol, Carbohydrates, Composition, Fats, PAC, Solids, SolidsBreakdown, Sugars, ToComposition},
    error::Result,
    validate::{Validate, verify_are_positive, verify_is_subset, verify_is_within_100_percent},
};

#[cfg(doc)]
use crate::{composition::CompKey, constants};

/// Spec for alcohol beverages and other ingredients, with ABV, optional sugar, fat, and solids
///
/// The composition of spirits is trivial, consisting of only the [`ABV`](Self::abv) ("Alcohol by
/// volume", 2025)[^8]) that is always present on the label, and is internally converted to `ABW`
/// (Alcohol by weight) via [`constants::density::abv_to_abw`]. Liqueurs, creams, and other
/// alcohol ingredients may also contain sugar, fat, and other solids. These can be tricky to find,
/// since nutrition facts tables are not usually mandated for alcoholic beverages. The best approach
/// is to find a nutrition facts table from the manufacturer if available, otherwise to look for
/// unofficial sources online. Aside from `ABV`, the exact composition is not usually critical,
/// since alcohol ingredients are typically used in small amounts in ice cream mixes.
///
/// In the fields below, [`sugars`](Self::sugars) is assumed to be sucrose, zero if not specified,
/// and its contributions to PAC and POD are internally calculated accordingly. [`fat`](Self::fat),
/// zero if not specified, is stored in [`Composition`] accessible via [`CompKey::OtherFats`]. If
/// [`solids`](Self::solids) is not specified, it is calculated as `sugars + fat`. If specified, it
/// is required that `solids >= sugars + fat`. `solids` less `sugars` and `fat` is store in
/// [`Composition`] accessible via [`CompKey::OtherSNFS`]. Overall, `abw` plus `solids` must not
/// exceed 100%, i.e. `abw + solids <= 100%`.
///
/// # Examples
///
/// 40% ABV spirit with no sugars or fats, e.g. vodka:
///
/// ```
/// # fn main() -> Result<(), Box<dyn std::error::Error>> {
/// # use sci_cream::docs::assert_eq_float;
/// use sci_cream::{
///     composition::{CompKey, ToComposition},
///     specs::AlcoholSpec
/// };
///
/// let comp = AlcoholSpec {
///    abv: 40.0,
///    sugars: None,
///    fat: None,
///    solids: None,
/// }.to_composition()?;
///
/// assert_eq_float!(comp.get(CompKey::Energy), 230.7978);
/// assert_eq_float!(comp.get(CompKey::ABV), 40.0);
/// assert_eq_float!(comp.get(CompKey::Alcohol), 33.3042);
/// assert_eq!(comp.get(CompKey::TotalSolids), 0.0);
/// assert_eq_float!(comp.get(CompKey::Water), 66.6959);
/// assert_eq!(comp.get(CompKey::TotalSweeteners), 0.0);
/// assert_eq_float!(comp.get(CompKey::PACalc), 247.4498);
/// # Ok(()) }
/// ```
///
/// Baileys Irish Cream with 17% ABV, 18% sugars, and 13.6% fat:
///
/// ```
/// # fn main() -> Result<(), Box<dyn std::error::Error>> {
/// # use sci_cream::docs::assert_eq_float;
/// # use sci_cream::{
/// #    composition::{CompKey, ToComposition},
/// #    specs::AlcoholSpec
/// # };
/// #
/// let comp = AlcoholSpec {
///    abv: 17.0,
///    sugars: Some(18.0),
///    fat: Some(13.6),
///    solids: None,
/// }.to_composition()?;
///
/// assert_eq_float!(comp.get(CompKey::Energy), 289.605);
/// assert_eq_float!(comp.get(CompKey::ABV), 17.0);
/// assert_eq_float!(comp.get(CompKey::Alcohol), 13.7381);
/// assert_eq_float!(comp.get(CompKey::TotalSolids), 31.6);
/// assert_eq_float!(comp.get(CompKey::Water), 54.6619);
/// assert_eq!(comp.get(CompKey::TotalSweeteners), 18.0);
/// assert_eq!(comp.get(CompKey::POD), 18.0);
/// assert_eq_float!(comp.get(CompKey::PACalc), 102.07403);
/// assert_eq!(comp.get(CompKey::PACsgr), 18.0);
/// assert_eq_float!(comp.get(CompKey::TotalPAC), 120.07403);
/// # Ok(()) }
/// ```
#[doc = include_str!("../../docs/references/index/8.md")]
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct AlcoholSpec {
    /// Alcohol by volume (ABV) (2025)[^8] percentage, e.g. 40% for typical spirits.
    #[doc = include_str!("../../docs/references/index/8.md")]
    pub abv: f64,
    /// Sugars content by weight, typically zero for spirits, and up to ~40% for liqueurs.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sugars: Option<f64>,
    /// Fat content by weight, typically zero for spirits and liqueurs, and up to ~15% for creams.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fat: Option<f64>,
    /// Total solids content by weight, calculated as `sugars + fat` if not specified.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub solids: Option<f64>,
}

impl ToComposition for AlcoholSpec {
    fn to_composition(&self) -> Result<Composition> {
        let Self {
            abv,
            sugars,
            fat,
            solids,
        } = *self;

        let sugars = sugars.unwrap_or(0.0);
        let fat = fat.unwrap_or(0.0);
        let solids = solids.unwrap_or(sugars + fat);
        let alcohol = Alcohol::from_abv(abv);

        verify_are_positive(&[abv, sugars, fat, solids])?;
        verify_is_subset(sugars + fat, solids, "sugars + fat <= solids")?;
        verify_is_within_100_percent(alcohol.by_weight + solids)?;

        let sugars = Sugars::new().sucrose(sugars);

        let solids = SolidsBreakdown::new()
            .fats(Fats::new().total(fat))
            .carbohydrates(Carbohydrates::new().sugars(sugars))
            .others_from_total(solids)?;

        Composition::new()
            .energy(solids.energy()? + alcohol.energy())
            .solids(Solids::new().other(solids))
            .alcohol(alcohol)
            .pod(sugars.to_pod()?)
            .pac(PAC::new().sugars(sugars.to_pac()?).alcohol(alcohol.to_pac()))
            .validate_into()
    }
}

#[cfg(test)]
#[cfg_attr(coverage, coverage(off))]
#[allow(clippy::unwrap_used, clippy::float_cmp)]
pub(crate) mod tests {
    use std::sync::LazyLock;

    use crate::tests::asserts::shadow_asserts::assert_eq;
    use crate::tests::asserts::*;

    use super::*;
    use crate::{composition::CompKey, error::Error, ingredient::Category, specs::IngredientSpec};

    pub(crate) const ING_SPEC_ALCOHOL_40_ABV_SPIRIT_STR: &str = r#"{
      "name": "40% ABV Spirit",
      "category": "Alcohol",
      "AlcoholSpec": {
        "abv": 40
      }
    }"#;

    pub(crate) static ING_SPEC_ALCOHOL_40_ABV_SPIRIT: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "40% ABV Spirit".to_string(),
        category: Category::Alcohol,
        spec: AlcoholSpec {
            abv: 40.0,
            sugars: None,
            fat: None,
            solids: None,
        }
        .into(),
    });

    #[test]
    fn to_composition_alcohol_spec_40_abv_spirit() {
        let comp = ING_SPEC_ALCOHOL_40_ABV_SPIRIT.spec.to_composition().unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Energy), 230.7978);

        assert_eq_flt_test!(comp.get(CompKey::ABV), 40.0);
        assert_eq_flt_test!(comp.get(CompKey::Alcohol), 33.3042);
        assert_eq!(comp.get(CompKey::TotalSolids), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::Water), 66.6959);

        assert_eq!(comp.get(CompKey::TotalSweeteners), 0.0);
        assert_eq!(comp.get(CompKey::POD), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACalc), 247.4498);
        assert_eq_flt_test!(comp.get(CompKey::TotalPAC), 247.4498);

        assert_eq!(comp.alcohol.to_abv(), comp.get(CompKey::ABV));
        assert_eq!(comp.alcohol.by_weight, comp.get(CompKey::Alcohol));
        assert_eq!(comp.alcohol.to_pac(), comp.get(CompKey::PACalc));
    }

    pub(crate) const ING_SPEC_ALCOHOL_BAILEYS_IRISH_CREAM_STR: &str = r#"{
      "name": "Baileys Irish Cream",
      "category": "Alcohol",
      "AlcoholSpec": {
        "abv": 17,
        "sugars": 18,
        "fat": 13.6
      }
    }"#;

    pub(crate) static ING_SPEC_ALCOHOL_BAILEYS_IRISH_CREAM: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Baileys Irish Cream".to_string(),
            category: Category::Alcohol,
            spec: AlcoholSpec {
                abv: 17.0,
                sugars: Some(18.0),
                fat: Some(13.6),
                solids: None,
            }
            .into(),
        });

    #[test]
    fn to_composition_alcohol_spec_baileys_irish_cream() {
        let comp = ING_SPEC_ALCOHOL_BAILEYS_IRISH_CREAM.spec.to_composition().unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Energy), 289.605);

        assert_eq_flt_test!(comp.get(CompKey::Alcohol), 13.7381);
        assert_eq_flt_test!(comp.get(CompKey::TotalSolids), 31.6);
        assert_eq_flt_test!(comp.get(CompKey::Water), 54.6619);

        assert_eq!(comp.get(CompKey::TotalSweeteners), 18.0);
        assert_eq!(comp.get(CompKey::POD), 18.0);
        assert_eq_flt_test!(comp.get(CompKey::PACalc), 102.074);
        assert_eq!(comp.get(CompKey::PACsgr), 18.0);
        assert_eq_flt_test!(comp.get(CompKey::TotalPAC), 120.074);

        assert_eq!(comp.alcohol.to_abv(), comp.get(CompKey::ABV));
        assert_eq!(comp.alcohol.by_weight, comp.get(CompKey::Alcohol));
        assert_eq!(comp.alcohol.to_pac(), comp.get(CompKey::PACalc));
    }

    pub(crate) const ING_SPEC_ALCOHOL_ALMOND_EXTRACT_STR: &str = r#"{
      "name": "Nielsen-Massey Pure Almond Extract",
      "category": "Flavouring",
      "AlcoholSpec": {
        "abv": 90,
        "fat": 5
      }
    }"#;

    pub(crate) static ING_SPEC_ALCOHOL_ALMOND_EXTRACT: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Nielsen-Massey Pure Almond Extract".to_string(),
        category: Category::Flavouring,
        spec: AlcoholSpec {
            abv: 90.0,
            sugars: None,
            fat: Some(5.0),
            solids: None,
        }
        .into(),
    });

    #[test]
    fn to_composition_alcohol_spec_almond_extract() {
        let comp = ING_SPEC_ALCOHOL_ALMOND_EXTRACT.spec.to_composition().unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Energy), 638.6936);

        assert_eq_flt_test!(comp.get(CompKey::ABV), 90.0);
        assert_eq_flt_test!(comp.get(CompKey::Alcohol), 85.67);
        assert_eq_flt_test!(comp.get(CompKey::TotalSolids), 5.0);
        assert_eq!(comp.get(CompKey::TotalFats), 5.0);
        assert_eq_flt_test!(comp.get(CompKey::Water), 9.33);

        assert_eq!(comp.get(CompKey::POD), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACalc), 636.5286);
        assert_eq_flt_test!(comp.get(CompKey::TotalPAC), 636.5286);

        assert_eq!(comp.alcohol.to_abv(), comp.get(CompKey::ABV));
        assert_eq!(comp.alcohol.by_weight, comp.get(CompKey::Alcohol));
        assert_eq!(comp.alcohol.to_pac(), comp.get(CompKey::PACalc));
    }

    #[test]
    fn json_field_null_same_as_missing() {
        let spec_str_with_missing = r#"{
          "name": "40% ABV Spirit",
          "category": "Alcohol",
          "AlcoholSpec": {
            "abv": 40
          }
        }"#;

        let spec_str_with_null = r#"{
          "name": "40% ABV Spirit",
          "category": "Alcohol",
          "AlcoholSpec": {
            "abv": 40,
            "sugars": null,
            "fat": null,
            "solids": null
          }
        }"#;

        let expected_spec = AlcoholSpec {
            abv: 40.0,
            sugars: None,
            fat: None,
            solids: None,
        }
        .into();

        let spec_missing: IngredientSpec = serde_json::from_str(spec_str_with_missing).unwrap();
        let spec_null: IngredientSpec = serde_json::from_str(spec_str_with_null).unwrap();
        assert_eq!(spec_missing, spec_null);
        assert_eq!(spec_missing.spec, expected_spec);
        assert_eq!(spec_null.spec, expected_spec);
    }

    pub(crate) static INGREDIENT_ASSETS_TABLE_ALCOHOL: LazyLock<Vec<(&str, IngredientSpec, Option<Composition>)>> =
        LazyLock::new(|| {
            vec![
                (ING_SPEC_ALCOHOL_40_ABV_SPIRIT_STR, ING_SPEC_ALCOHOL_40_ABV_SPIRIT.clone(), None),
                (ING_SPEC_ALCOHOL_BAILEYS_IRISH_CREAM_STR, ING_SPEC_ALCOHOL_BAILEYS_IRISH_CREAM.clone(), None),
                (ING_SPEC_ALCOHOL_ALMOND_EXTRACT_STR, ING_SPEC_ALCOHOL_ALMOND_EXTRACT.clone(), None),
            ]
        });

    #[test]
    fn to_composition_err_on_negative_field() {
        let neg_specs = [
            AlcoholSpec {
                abv: -1.0,
                sugars: None,
                fat: None,
                solids: None,
            },
            AlcoholSpec {
                abv: 17.0,
                sugars: Some(-1.0),
                fat: None,
                solids: None,
            },
            AlcoholSpec {
                abv: 17.0,
                sugars: None,
                fat: Some(-1.0),
                solids: None,
            },
            AlcoholSpec {
                abv: 17.0,
                sugars: None,
                fat: None,
                solids: Some(-1.0),
            },
        ];

        for spec in neg_specs {
            let result = spec.to_composition();
            assert!(matches!(result, Err(Error::CompositionNotPositive(_))));
        }
    }

    #[test]
    fn to_composition_err_when_sugars_plus_fat_exceeds_solids() {
        let result = AlcoholSpec {
            abv: 17.0,
            sugars: Some(20.0),
            fat: Some(20.0),
            solids: Some(30.0),
        }
        .to_composition();
        assert!(matches!(result, Err(Error::InvalidComposition(_))));
    }

    #[test]
    fn to_composition_err_when_alcohol_plus_solids_exceeds_100() {
        let result = AlcoholSpec {
            abv: 80.0,
            sugars: None,
            fat: None,
            solids: Some(40.0),
        }
        .to_composition();
        assert!(matches!(result, Err(Error::CompositionNotWithin100Percent(_))));
    }
}

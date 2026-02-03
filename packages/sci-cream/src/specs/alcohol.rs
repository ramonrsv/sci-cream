use serde::{Deserialize, Serialize};

use crate::{
    composition::{Alcohol, Carbohydrates, Composition, Fats, IntoComposition, PAC, Solids, SolidsBreakdown, Sugars},
    error::Result,
    validate::{assert_are_positive, assert_is_subset, assert_within_100_percent},
};

#[cfg(doc)]
use crate::{composition::CompKey, constants};

/// Spec for alcohol beverages and other ingredients, with ABV, optional sugar, fat, and solids
///
/// The composition of spirits is trivial, consisting of only the [`ABV`](Self::abv) ("Alcohol by
/// volume", 2025)[^8]) that is always present on the label, and is internally converted to `ABW`
/// (Alcohol by weight) via [`constants::density::ABV_TO_ABW_RATIO`]. Liqueurs, creams, and other
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
#[doc = include_str!("../../docs/bibs/8.md")]
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct AlcoholSpec {
    pub abv: f64,
    pub sugars: Option<f64>,
    pub fat: Option<f64>,
    pub solids: Option<f64>,
}

impl IntoComposition for AlcoholSpec {
    fn into_composition(self) -> Result<Composition> {
        let Self {
            abv,
            sugars,
            fat,
            solids,
        } = self;

        let sugars = sugars.unwrap_or_default();
        let fat = fat.unwrap_or_default();
        let solids = solids.unwrap_or(sugars + fat);
        let alcohol = Alcohol::from_abv(abv);

        assert_are_positive(&[abv, sugars, fat, solids])?;
        assert_is_subset(sugars + fat, solids, "sugars + fat <= solids")?;
        assert_within_100_percent(alcohol.by_weight + solids)?;

        let sugars = Sugars::new().sucrose(sugars);

        let solids = SolidsBreakdown::new()
            .fats(Fats::new().total(fat))
            .carbohydrates(Carbohydrates::new().sugars(sugars))
            .others_from_total(solids)?;

        Ok(Composition::new()
            .energy(solids.energy()? + alcohol.energy())
            .solids(Solids::new().other(solids))
            .alcohol(alcohol)
            .pod(sugars.to_pod()?)
            .pac(PAC::new().sugars(sugars.to_pac()?).alcohol(alcohol.to_pac())))
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
    use crate::{
        composition::CompKey,
        ingredient::Category,
        specs::{IngredientSpec, Spec},
    };

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
        spec: Spec::AlcoholSpec(AlcoholSpec {
            abv: 40.0,
            sugars: None,
            fat: None,
            solids: None,
        }),
    });

    #[test]
    fn into_composition_alcohol_spec_40_abv_spirit() {
        let comp = ING_SPEC_ALCOHOL_40_ABV_SPIRIT.spec.into_composition().unwrap();

        assert_eq!(comp.get(CompKey::Energy), 218.7108);

        assert_eq!(comp.get(CompKey::ABV), 40.0);
        assert_eq_flt_test!(comp.get(CompKey::Alcohol), 31.56);
        assert_eq!(comp.get(CompKey::TotalSolids), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::Water), 68.44);

        assert_eq!(comp.get(CompKey::TotalSweeteners), 0.0);
        assert_eq!(comp.get(CompKey::POD), 0.0);
        assert_eq!(comp.get(CompKey::PACalc), 234.4908);
        assert_eq!(comp.get(CompKey::PACtotal), 234.4908);

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
            spec: Spec::AlcoholSpec(AlcoholSpec {
                abv: 17.0,
                sugars: Some(18.0),
                fat: Some(13.6),
                solids: None,
            }),
        });

    #[test]
    fn into_composition_alcohol_spec_baileys_irish_cream() {
        let comp = ING_SPEC_ALCOHOL_BAILEYS_IRISH_CREAM.spec.into_composition().unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Energy), 287.3521);

        assert_eq_flt_test!(comp.get(CompKey::Alcohol), 13.413);
        assert_eq_flt_test!(comp.get(CompKey::TotalSolids), 31.6);
        assert_eq_flt_test!(comp.get(CompKey::Water), 54.987);

        assert_eq!(comp.get(CompKey::TotalSweeteners), 18.0);
        assert_eq!(comp.get(CompKey::POD), 18.0);
        assert_eq!(comp.get(CompKey::PACalc), 99.65859);
        assert_eq!(comp.get(CompKey::PACsgr), 18.0);
        assert_eq!(comp.get(CompKey::PACtotal), 117.65859);

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

        let expected_spec = Spec::AlcoholSpec(AlcoholSpec {
            abv: 40.0,
            sugars: None,
            fat: None,
            solids: None,
        });

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
            ]
        });
}

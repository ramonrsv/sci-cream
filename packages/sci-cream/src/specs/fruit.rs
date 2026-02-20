//! [`FruitSpec`] and associated implementations, for fruit and fruit puree ingredients

use serde::{Deserialize, Serialize};

use crate::{
    composition::{Carbohydrates, Composition, Fats, Fibers, IntoComposition, PAC, Solids, SolidsBreakdown, Sugars},
    error::Result,
    validate::{assert_are_positive, assert_is_subset, assert_within_100_percent},
};

/// Spec for fruit ingredients, with a specified [`Sugars`] composition and water content
///
/// Fruits are specified by their [`sugar`](Self::sugars) content (glucose, fructose, sucrose,
/// etc.), [`water`](Self::water) content, and optional [`energy`](Self::energy),
/// [`protein`](Self::protein), [`fat`](Self::fat), and [`fiber`](Self::fiber) content. If `energy`
/// is not specified, it is automatically calculated from the rest of the composition. If
/// [`carbohydrate`](Self::carbohydrate) is not specified, then it is equal to `sugars + fiber`. If
/// any other optional values are not specified, they are assumed to be zero. Adding up all the
/// components, any remaining portion up to 100% is assumed to be non-fat, non-sugar solids (snfs).
///
/// The composition for fruit ingredients can usually be found in food composition databases, like
/// [USDA FoodData Central](https://fdc.nal.usda.gov/food-search).
///
/// # Examples
///
/// (Strawberries, raw, 2019)[^101] per 100g:
/// - Water: 91g
/// - Energy: 32 kcal
/// - Protein: 0.67g
/// - Total lipid (fat): 0.3g
/// - Carbohydrate: 7.68g
/// - Fiber: 2g
/// - Sucrose: 0.47g
/// - Glucose: 1.99g
/// - Fructose: 2.44g
///
/// ```
/// # use sci_cream::docs::assert_eq_float;
/// use sci_cream::{
///     composition::{CompKey, IntoComposition, Sugars, Sweeteners},
///     specs::FruitSpec
/// };
///
/// let comp = FruitSpec {
///     water: 91.0,
///     energy: Some(32.0),
///     protein: Some(0.7),
///     fat: Some(0.3),
///     carbohydrate: Some(7.68),
///     fiber: Some(2.0),
///     sugars: Sugars::new().glucose(1.99).fructose(2.44).sucrose(0.47),
/// }.into_composition().unwrap();
///
/// assert_eq!(comp.get(CompKey::Energy), 32.0);
/// assert_eq!(comp.get(CompKey::TotalProteins), 0.7);
/// assert_eq!(comp.get(CompKey::TotalFats), 0.3);
/// assert_eq!(comp.get(CompKey::TotalCarbohydrates), 7.68);
///
/// assert_eq!(comp.get(CompKey::Glucose), 1.99);
/// assert_eq!(comp.get(CompKey::Fructose), 2.44);
/// assert_eq!(comp.get(CompKey::Sucrose), 0.47);
///
/// assert_eq_float!(comp.get(CompKey::POD), 6.28312);
/// assert_eq!(comp.get(CompKey::PACsgr), 8.887);
/// ```
#[allow(clippy::doc_markdown)] // _FoodData_ false positive
#[doc = include_str!("../../docs/bibs/101.md")]
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct FruitSpec {
    /// Water content as percentage of total weight
    pub water: f64,
    /// Energy content in kcal per 100g, optional, automatically calculated if not specified
    pub energy: Option<f64>,
    /// Protein content as percentage of total weight, optional, assumed zero if not specified
    pub protein: Option<f64>,
    /// Fat content as percentage of total weight, optional, assumed zero if not specified
    pub fat: Option<f64>,
    /// Carbohydrate content as percentage of total weight, optional, assumed to be
    /// `fiber + sugars` if not specified.
    pub carbohydrate: Option<f64>,
    /// Fiber content as percentage of total weight, optional, assumed zero if not specified. Fiber
    /// is a subset of carbohydrates.
    pub fiber: Option<f64>,
    /// Composition and detailed breakdown of the sugars present in the fruit, as percentage of
    /// total weight. Sugars are a subset of carbohydrates.
    pub sugars: Sugars,
}

impl IntoComposition for FruitSpec {
    fn into_composition(self) -> Result<Composition> {
        let Self {
            water,
            energy,
            protein,
            fat,
            carbohydrate,
            fiber,
            sugars,
        } = self;

        let protein = protein.unwrap_or(0.0);
        let fat = fat.unwrap_or(0.0);
        let fiber = fiber.unwrap_or(0.0);
        let carbohydrate = carbohydrate.unwrap_or(fiber + sugars.total());

        assert_is_subset(fiber + sugars.total(), carbohydrate, "fiber + sugars <= carbohydrate")?;
        assert_are_positive(&[water, protein, fat, carbohydrate, fiber, sugars.total()])?;
        assert_within_100_percent(water + protein + fat + carbohydrate)?;

        let solids = SolidsBreakdown::new()
            .fats(Fats::new().total(fat))
            .carbohydrates(
                Carbohydrates::new()
                    .sugars(sugars)
                    .fiber(Fibers::new().other(fiber))
                    .others_from_total(carbohydrate)?,
            )
            .proteins(protein)
            .others_from_total(100.0 - water)?;

        let energy = energy.unwrap_or(solids.energy()?);
        assert_are_positive(&[energy])?;

        Ok(Composition::new()
            .energy(energy)
            .solids(Solids::new().other(solids))
            .pod(solids.carbohydrates.to_pod()?)
            .pac(PAC::new().sugars(solids.carbohydrates.to_pac()?)))
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
    use crate::{composition::CompKey, ingredient::Category, specs::IngredientSpec};

    pub(crate) const ING_SPEC_FRUIT_STRAWBERRY_STR: &str = r#"{
      "name": "Strawberry",
      "category": "Fruit",
      "FruitSpec": {
        "water": 91,
        "energy": 32,
        "protein": 0.67,
        "fat": 0.3,
        "carbohydrate": 7.68,
        "fiber": 2,
        "sugars": {
          "glucose": 1.99,
          "fructose": 2.44,
          "sucrose": 0.47
        }
      }
    }"#;

    pub(crate) static ING_SPEC_FRUIT_STRAWBERRY: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Strawberry".to_string(),
        category: Category::Fruit,
        spec: FruitSpec {
            water: 91.0,
            energy: Some(32.0),
            protein: Some(0.67),
            fat: Some(0.3),
            carbohydrate: Some(7.68),
            fiber: Some(2.0),
            sugars: Sugars::new().glucose(1.99).fructose(2.44).sucrose(0.47),
        }
        .into(),
    });

    #[test]
    // false positive, sees 6.2832 as f64::consts::TAU
    #[expect(clippy::approx_constant)]
    fn into_composition_fruit_spec_strawberry() {
        let comp = ING_SPEC_FRUIT_STRAWBERRY.spec.into_composition().unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Energy), 32.0);

        assert_eq!(comp.get(CompKey::TotalFats), 0.3);
        assert_eq!(comp.get(CompKey::TotalProteins), 0.67);
        assert_eq!(comp.get(CompKey::Fiber), 2.0);
        assert_eq!(comp.get(CompKey::Glucose), 1.99);
        assert_eq!(comp.get(CompKey::Fructose), 2.44);
        assert_eq!(comp.get(CompKey::Sucrose), 0.47);
        assert_eq_flt_test!(comp.get(CompKey::TotalSugars), 4.9);
        assert_eq!(comp.get(CompKey::TotalCarbohydrates), 7.68);
        assert_eq_flt_test!(comp.get(CompKey::TotalSweeteners), 4.90);
        assert_eq_flt_test!(comp.get(CompKey::TotalSNFS), 3.8);
        assert_eq_flt_test!(comp.get(CompKey::TotalSolids), 9.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 6.2832);
        assert_eq!(comp.get(CompKey::PACsgr), 8.887);
    }

    pub(crate) const ING_SPEC_FRUIT_NAVEL_ORANGE_AUTO_ENERGY_STR: &str = r#"{
      "name": "Navel Orange",
      "category": "Fruit",
      "FruitSpec": {
        "water": 86.7,
        "protein": 0.91,
        "fat": 0.15,
        "fiber": 2,
        "sugars": {
          "glucose": 2.02,
          "fructose": 2.36,
          "sucrose": 4.19
        }
      }
    }"#;

    pub(crate) static ING_SPEC_FRUIT_NAVEL_ORANGE_AUTO_ENERGY: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Navel Orange".to_string(),
            category: Category::Fruit,
            spec: FruitSpec {
                water: 86.7,
                energy: None,
                protein: Some(0.91),
                fat: Some(0.15),
                carbohydrate: None,
                fiber: Some(2.0),
                sugars: Sugars::new().glucose(2.02).fructose(2.36).sucrose(4.19),
            }
            .into(),
        });

    #[test]
    fn into_composition_fruit_spec_navel_orange_auto_energy() {
        let comp = ING_SPEC_FRUIT_NAVEL_ORANGE_AUTO_ENERGY.spec.into_composition().unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Energy), 39.27);

        assert_eq!(comp.get(CompKey::TotalFats), 0.15);
        assert_eq!(comp.get(CompKey::TotalProteins), 0.91);
        assert_eq!(comp.get(CompKey::Fiber), 2.0);
        assert_eq!(comp.get(CompKey::Glucose), 2.02);
        assert_eq!(comp.get(CompKey::Fructose), 2.36);
        assert_eq!(comp.get(CompKey::Sucrose), 4.19);
        assert_eq_flt_test!(comp.get(CompKey::TotalSugars), 8.57);
        assert_eq!(comp.get(CompKey::TotalCarbohydrates), 10.57);
        assert_eq_flt_test!(comp.get(CompKey::TotalSweeteners), 8.57);
        assert_eq_flt_test!(comp.get(CompKey::TotalSNFS), 4.58);
        assert_eq_flt_test!(comp.get(CompKey::TotalSolids), 13.3);
        assert_eq_flt_test!(comp.get(CompKey::POD), 9.8888);
        assert_eq!(comp.get(CompKey::PACsgr), 12.512);
    }

    pub(crate) static INGREDIENT_ASSETS_TABLE_FRUIT: LazyLock<Vec<(&str, IngredientSpec, Option<Composition>)>> =
        LazyLock::new(|| {
            vec![
                (ING_SPEC_FRUIT_STRAWBERRY_STR, ING_SPEC_FRUIT_STRAWBERRY.clone(), None),
                (ING_SPEC_FRUIT_NAVEL_ORANGE_AUTO_ENERGY_STR, ING_SPEC_FRUIT_NAVEL_ORANGE_AUTO_ENERGY.clone(), None),
            ]
        });
}

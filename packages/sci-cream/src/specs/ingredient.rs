use serde::{Deserialize, Serialize};

#[cfg(feature = "diesel")]
use crate::diesel::ingredients;
#[cfg(feature = "diesel")]
use diesel::{Queryable, Selectable};

use crate::{
    composition::{Composition, IntoComposition},
    error::Result,
    ingredient::{Category, Ingredient},
    specs::{
        AlcoholSpec, ChocolateSpec, DairyFromNutritionSpec, DairySpec, EggSpec, FruitSpec, FullSpec, MicroSpec,
        NutSpec, SweetenerSpec,
    },
};

/// Tagged enum for all the supported specs, which is useful for (de)serialization of specs.
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[allow(clippy::large_enum_variant)] // @todo Deal with this issue later
pub enum Spec {
    DairySpec(DairySpec),
    DairyFromNutritionSpec(DairyFromNutritionSpec),
    SweetenerSpec(SweetenerSpec),
    FruitSpec(FruitSpec),
    ChocolateSpec(ChocolateSpec),
    NutSpec(NutSpec),
    EggSpec(EggSpec),
    AlcoholSpec(AlcoholSpec),
    MicroSpec(MicroSpec),
    FullSpec(FullSpec),
}

impl IntoComposition for Spec {
    fn into_composition(self) -> Result<Composition> {
        match self {
            Spec::DairySpec(spec) => spec.into_composition(),
            Spec::DairyFromNutritionSpec(spec) => spec.into_composition(),
            Spec::SweetenerSpec(spec) => spec.into_composition(),
            Spec::FruitSpec(spec) => spec.into_composition(),
            Spec::ChocolateSpec(spec) => spec.into_composition(),
            Spec::NutSpec(spec) => spec.into_composition(),
            Spec::EggSpec(spec) => spec.into_composition(),
            Spec::AlcoholSpec(spec) => spec.into_composition(),
            Spec::MicroSpec(spec) => spec.into_composition(),
            Spec::FullSpec(spec) => spec.into_composition(),
        }
    }
}

#[cfg_attr(feature = "diesel", derive(Queryable, Selectable), diesel(table_name = ingredients))]
#[derive(PartialEq, Serialize, Deserialize, Clone, Debug)]
pub struct IngredientSpec {
    pub name: String,
    pub category: Category,
    #[serde(flatten)]
    pub spec: Spec,
}

impl IngredientSpec {
    pub fn into_ingredient(self) -> Result<Ingredient> {
        Ok(Ingredient {
            name: self.name,
            category: self.category,
            composition: self.spec.into_composition()?,
        })
    }
}

impl IntoComposition for IngredientSpec {
    fn into_composition(self) -> Result<Composition> {
        self.spec.into_composition()
    }
}

#[cfg(feature = "wasm")]
#[cfg_attr(coverage, coverage(off))]
pub mod wasm {
    use wasm_bindgen::prelude::*;

    use super::{Ingredient, IngredientSpec};

    /// Converts an IngredientSpec JS value into an Ingredient instance
    ///
    /// Enum variants with associated data are not supported by [`mod@wasm_bindgen`], so we cannot
    /// support [`IngredientSpec`] directly. Instead, we have to construct it from a JS value via
    /// [`serde_wasm_bindgen`], and then convert it via [`IngredientSpec::into_ingredient`].
    #[wasm_bindgen]
    pub fn into_ingredient_from_spec(spec: JsValue) -> Result<Ingredient, JsValue> {
        serde_wasm_bindgen::from_value::<IngredientSpec>(spec)?
            .into_ingredient()
            .map_err(Into::into)
    }
}

#[cfg(test)]
#[cfg_attr(coverage, coverage(off))]
#[allow(clippy::unwrap_used)]
pub(crate) mod tests {
    use std::sync::LazyLock;

    use crate::tests::asserts::shadow_asserts::assert_eq;
    use crate::tests::asserts::*;
    use crate::tests::assets::*;

    use super::*;
    use crate::data::get_ingredient_spec_by_name;

    pub(crate) static INGREDIENT_ASSETS_TABLE: LazyLock<Vec<(&str, IngredientSpec, Option<Composition>)>> =
        LazyLock::new(|| {
            [
                INGREDIENT_ASSETS_TABLE_ALCOHOL.as_slice(),
                INGREDIENT_ASSETS_TABLE_CHOCOLATE.as_slice(),
                INGREDIENT_ASSETS_TABLE_DAIRY.as_slice(),
                INGREDIENT_ASSETS_TABLE_EGG.as_slice(),
                INGREDIENT_ASSETS_TABLE_FRUIT.as_slice(),
                INGREDIENT_ASSETS_TABLE_FULL.as_slice(),
                INGREDIENT_ASSETS_TABLE_MICRO.as_slice(),
                INGREDIENT_ASSETS_TABLE_NUT.as_slice(),
                INGREDIENT_ASSETS_TABLE_SWEETENER.as_slice(),
            ]
            .concat()
        });

    #[test]
    fn deserialize_ingredient_spec() {
        INGREDIENT_ASSETS_TABLE.iter().for_each(|(spec_str, spec, _)| {
            assert_eq!(
                serde_json::from_str::<IngredientSpec>(spec_str)
                    .unwrap_or_else(|e| panic!("Failed to deserialize spec '{}': {}", spec.name, e)),
                *spec
            );
        });
    }

    #[test]
    fn ingredient_spec_database_matches_assets() {
        INGREDIENT_ASSETS_TABLE.iter().for_each(|(_, spec, _)| {
            assert_eq!(spec, &get_ingredient_spec_by_name(&spec.name).unwrap());
        });
    }

    #[test]
    fn ingredient_spec_into_composition_matches_assets() {
        INGREDIENT_ASSETS_TABLE.iter().for_each(|(_, spec, expected_comp_opt)| {
            let comp = spec.spec.into_composition().unwrap();
            if let Some(expected_comp) = expected_comp_opt {
                // assert_eq!(&comp, expected_comp);
                // println!("Testing composition for spec: {}", spec.name);
                assert_eq_flt_test!(&comp, expected_comp);
            }
        });
    }
}

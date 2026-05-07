//! WASM compatible alternative [`Ingredient`](RustIngredient) that uses a newtype [`Composition`]
//!
//! This struct includes `wasm_bindgen` support while still allowing downstream direct access to the
//! [`name`](Ingredient::name), [`category`](Ingredient::category), and
//! [`composition`](Ingredient::composition) fields. Also includes a helper function
//! [`into_ingredient_from_spec`] to convert an [`IngredientSpec`] JS value into an [`Ingredient`]
//! instance, since [`IngredientSpec`] cannot be directly supported by `wasm_bindgen`.

use wasm_bindgen::prelude::*;

use crate::{
    composition::Composition as RustComposition,
    ingredient::{Category, Ingredient as RustIngredient, IntoIngredient},
    specs::IngredientSpec,
    wasm::{Composition, JsResult},
};

#[cfg(doc)]
use crate::error::Error;

/// WASM compatible alternative [`Ingredient`](RustIngredient) that uses a newtype [`Composition`]
#[wasm_bindgen]
#[derive(PartialEq, Clone, Debug)]
pub struct Ingredient {
    /// The name of the ingredient, usually required to be unique, e.g. "Whole Milk", "Sucrose"
    #[wasm_bindgen(getter_with_clone)]
    pub name: String,
    /// The category of the ingredient, e.g. [`Category::Dairy`], [`Category::Sweetener`], etc.
    pub category: Category,
    /// The [`Composition`] of the ingredient, holding its properties and data used in calculations
    pub composition: Composition,
}

#[wasm_bindgen]
impl Ingredient {
    /// Creates a new [`Ingredient`] instance with the given name, category, and composition
    #[allow(clippy::missing_const_for_fn)] // wasm_bindgen does not support const
    #[cfg_attr(feature = "wasm", wasm_bindgen(constructor))]
    #[must_use]
    pub fn new(name: String, category: Category, composition: Composition) -> Self {
        Self {
            name,
            category,
            composition,
        }
    }

    /// Clones the `Ingredient` instance, useful when handling WASM objects in JavaScript.
    ///
    /// **Note**: This can be very inefficient depending on the use case, so use with caution.
    /// Consider using [`Bridge`](crate::wasm::Bridge) patterns to avoid excessive cloning.
    #[wasm_bindgen(js_name = "clone")]
    #[must_use]
    pub fn clone_wasm(&self) -> Self {
        self.clone()
    }
}

/// Converts an [`IngredientSpec`] JS value into an [`Ingredient`] instance
///
/// Enum variants with associated data are not supported by [`mod@wasm_bindgen`], so we cannot
/// support [`IngredientSpec`] directly. Instead, we have to construct it from a JS value via
/// [`serde_wasm_bindgen`], and then convert it via [`IngredientSpec::into_ingredient`].
///
/// # Errors
///
/// Returns a `serde::Error` if the input JS value cannot be deserialized into an
/// [`IngredientSpec`], or an [`Error`] if the resulting [`IngredientSpec`] fails to convert
/// into an [`Ingredient`], likely due to invalid values, e.g. negative percentages, etc.
#[wasm_bindgen]
pub fn into_ingredient_from_spec(spec: JsValue) -> JsResult<Ingredient> {
    serde_wasm_bindgen::from_value::<IngredientSpec>(spec)?
        .into_ingredient()
        .map(Ingredient::from)
        .map_err(Into::into)
}

impl From<RustIngredient> for Ingredient {
    fn from(rust_ing: RustIngredient) -> Self {
        Self {
            name: rust_ing.name,
            category: rust_ing.category,
            composition: Composition::from(rust_ing.composition),
        }
    }
}

impl From<Ingredient> for RustIngredient {
    fn from(ing: Ingredient) -> Self {
        Self {
            name: ing.name,
            category: ing.category,
            composition: RustComposition::from(ing.composition),
        }
    }
}

#[cfg(test)]
#[cfg_attr(coverage, coverage(off))]
#[allow(clippy::float_cmp)]
pub(crate) mod tests {
    use std::sync::LazyLock;

    use crate::tests::asserts::shadow_asserts::assert_eq;
    use crate::tests::asserts::*;

    use super::*;
    use crate::{
        composition::{CompKey, Composition as RustComposition},
        ingredient::Category,
        wasm::composition::Composition,
    };

    pub(crate) static WHOLE_MILK_ING: LazyLock<Ingredient> = LazyLock::new(|| Ingredient {
        name: "Whole Milk".to_string(),
        category: Category::Dairy,
        composition: Composition::from(RustComposition::new().energy(42.0)),
    });

    pub(crate) static SUCROSE_ING: LazyLock<Ingredient> = LazyLock::new(|| Ingredient {
        name: "Sucrose".to_string(),
        category: Category::Sweetener,
        composition: Composition::from(RustComposition::new().energy(10.0)),
    });

    static SUCROSE_RUST_ING: LazyLock<RustIngredient> = LazyLock::new(|| RustIngredient {
        name: "Sucrose".to_string(),
        category: Category::Sweetener,
        composition: RustComposition::new().energy(10.0),
    });

    #[test]
    fn new_sets_fields() {
        let ing = Ingredient::new("Whole Milk".to_string(), Category::Dairy, Composition::new());
        assert_eq!(ing.name, "Whole Milk");
        assert_eq!(ing.category, Category::Dairy);
        assert_eq_flt_test!(ing.composition.get(CompKey::Energy), 0.0);
    }

    #[test]
    fn clone_wasm_produces_equal_ingredient() {
        let ing = WHOLE_MILK_ING.clone();
        assert_eq!(ing.clone_wasm(), ing);
    }

    #[test]
    fn from_rust_ingredient_preserves_fields() {
        let wasm_ing = Ingredient::from(SUCROSE_RUST_ING.clone());
        assert_eq!(wasm_ing.name, "Sucrose");
        assert_eq!(wasm_ing.category, Category::Sweetener);
        assert_eq_flt_test!(wasm_ing.composition.get(CompKey::Energy), 10.0);
        assert_eq!(wasm_ing, *SUCROSE_ING);
    }

    #[test]
    fn from_ingredient_into_rust_ingredient_round_trips() {
        let rust_ing = SUCROSE_RUST_ING.clone();
        let back = RustIngredient::from(Ingredient::from(rust_ing.clone()));
        assert_eq!(back, rust_ing);
    }
}

//! [`AliasSpec`] and associated implementations, for defining ingredients as aliases of other
//! ingredients, e.g. "Whole Milk" can be an alias of "3.25% Milk", etc.

use serde::{Deserialize, Serialize};

use crate::{
    composition::{Composition, ResolveComposition},
    error::Result,
    ingredient::{Ingredient, ResolveIntoIngredient},
    resolution::IngredientGetter,
};

/// Alias spec, which allows an ingredient to be defined as an alias of another ingredient, e.g.
/// "Whole Milk" can be an alias of "3.25% Milk", etc.
///
/// The [`alias`](Self::alias) field is the name of the alias ingredient, and the
/// [`for_name`](Self::for_name) field is the name of the ingredient it is an alias for. As with
/// all ingredient names, the [`alias`](Self::alias) must be unique across the collection.
///
/// The [`for_name`](Self::for_name) must correspond to a valid ingredient in the collection, and it
/// must not be an alias itself, to avoid circular references.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
pub struct AliasSpec {
    /// The name of the alias ingredient, i.e. the new name, which should be unique in a collection.
    pub alias: String,
    /// The name of the ingredient that this is an alias for, which must be a valid ingredient in
    /// the collection, and must not be an alias itself.
    #[serde(rename = "for")]
    pub for_name: String,
}

impl ResolveComposition for AliasSpec {
    fn resolve_composition(&self, getter: &dyn IngredientGetter) -> Result<Composition> {
        Ok(getter.get_ingredient_by_name(&self.for_name)?.composition)
    }
}

impl ResolveIntoIngredient for AliasSpec {
    fn resolve_into_ingredient(self, getter: &dyn IngredientGetter) -> Result<Ingredient> {
        let target = getter.get_ingredient_by_name(&self.for_name)?;
        Ok(Ingredient {
            name: self.alias,
            ..target
        })
    }
}

#[cfg(test)]
#[cfg_attr(coverage, coverage(off))]
#[allow(clippy::unwrap_used)]
pub(crate) mod tests {
    use std::sync::LazyLock;

    use crate::tests::asserts::shadow_asserts::assert_eq;
    #[expect(unused_imports)]
    use crate::tests::asserts::*;

    use super::*;
    use crate::database::IngredientDatabase;

    pub(crate) static ALIAS_SPECS: LazyLock<Vec<(&str, AliasSpec)>> = LazyLock::new(|| {
        vec![
            (
                "{\"alias\": \"Whole Milk\", \"for\": \"3.25% Milk\"}",
                AliasSpec {
                    alias: "Whole Milk".to_string(),
                    for_name: "3.25% Milk".to_string(),
                },
            ),
            (
                "{\"alias\": \"Whipping Cream\", \"for\": \"36% Cream\"}",
                AliasSpec {
                    alias: "Whipping Cream".to_string(),
                    for_name: "36% Cream".to_string(),
                },
            ),
        ]
    });

    #[test]
    fn deserialize_alias_spec() {
        ALIAS_SPECS.iter().for_each(|(alias_str, alias_spec)| {
            assert_eq!(
                serde_json::from_str::<AliasSpec>(alias_str).unwrap_or_else(|e| panic!(
                    "Failed to deserialize alias spec '{alias}': {e}",
                    alias = alias_spec.alias
                )),
                *alias_spec
            );
        });
    }

    #[test]
    fn resolve_alias_spec_composition() {
        let db = IngredientDatabase::new_seeded_from_embedded_data();

        ALIAS_SPECS.iter().for_each(|(_, alias_spec)| {
            let expected_comp = db.get_ingredient_by_name(&alias_spec.for_name).unwrap().composition;
            assert_eq!(alias_spec.resolve_composition(&db).unwrap(), expected_comp);
        });
    }

    #[test]
    fn resolve_alias_spec_into_ingredient() {
        let db = IngredientDatabase::new_seeded_from_embedded_data();

        ALIAS_SPECS.iter().for_each(|(_, alias_spec)| {
            let expected_ingredient = db.get_ingredient_by_name(&alias_spec.for_name).unwrap();
            let resolved_ingredient = alias_spec.clone().resolve_into_ingredient(&db).unwrap();
            assert_eq!(resolved_ingredient.name, alias_spec.alias);
            assert_eq!(resolved_ingredient.category, expected_ingredient.category);
            assert_eq!(resolved_ingredient.composition, expected_ingredient.composition);
        });
    }
}

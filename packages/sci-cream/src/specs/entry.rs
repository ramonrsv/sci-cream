//! [`SpecEntry`] enum and associated implementations, for representing either a full ingredient
//! spec or an alias spec in a unified way, which is useful for (de)serialization of specs.

use serde::{Deserialize, Serialize};

use crate::{
    error::Result,
    ingredient::{Ingredient, ResolveIntoIngredient},
    resolution::IngredientGetter,
    specs::{AliasSpec, IngredientSpec},
};

/// Enum for ingredient specs, which can be either a full spec or an alias spec. This is useful for
/// (de)serialization of specs, as it allows both full ingredient definitions and simple aliases.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(untagged)]
#[expect(clippy::large_enum_variant)] // @todo Deal with this issue later
pub enum SpecEntry {
    /// A full ingredient spec, which includes the name, category, and the tagged spec.
    Ingredient(IngredientSpec),
    /// An alias spec, which defines an ingredient as an alias of another ingredient name.
    Alias(AliasSpec),
}

impl SpecEntry {
    /// Returns either the name of the ingredient spec or the alias, depending on the variant.
    #[must_use]
    pub fn name(&self) -> &str {
        match self {
            Self::Ingredient(spec) => &spec.name,
            Self::Alias(alias_spec) => &alias_spec.alias,
        }
    }

    /// Deserializes one [`SpecEntry`] from a raw JSON value, explicitly choosing the variant
    ///
    /// Unlike the derived `#[serde(untagged)]` [`Deserialize`], which collapses any failure to an
    /// opaque "no variant matched", this parses the chosen variant directly and surfaces the
    /// underlying field-level error (a missing or mistyped field, incorrect type, etc.).
    ///
    /// # Errors
    ///
    /// Returns a [`serde_json::Error`] if `value` does not deserialize into the chosen variant.
    #[cfg(feature = "data")]
    pub fn from_json_value(value: serde_json::Value) -> serde_json::Result<Self> {
        if value.get("alias").is_some() {
            serde_json::from_value::<AliasSpec>(value).map(Self::Alias)
        } else {
            serde_json::from_value::<IngredientSpec>(value).map(Self::Ingredient)
        }
    }
}

impl ResolveIntoIngredient for SpecEntry {
    fn resolve_into_ingredient(self, getter: &dyn IngredientGetter) -> Result<Ingredient> {
        match self {
            Self::Ingredient(spec) => spec.resolve_into_ingredient(getter),
            Self::Alias(alias_spec) => alias_spec.resolve_into_ingredient(getter),
        }
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

    use crate::tests::assets::*;

    use super::*;

    pub(crate) static SPEC_ENTRIES: LazyLock<Vec<(&str, SpecEntry)>> = LazyLock::new(|| {
        let ingredients = INGREDIENT_ASSETS_TABLE
            .iter()
            .map(|(spec_str, spec, _)| (*spec_str, SpecEntry::Ingredient(spec.clone())))
            .collect::<Vec<_>>();
        let aliases = ALIAS_SPECS
            .iter()
            .map(|(alias_str, alias_spec)| (*alias_str, SpecEntry::Alias(alias_spec.clone())))
            .collect::<Vec<_>>();
        [ingredients, aliases].concat()
    });

    #[test]
    fn deserialize_spec_entry() {
        SPEC_ENTRIES.iter().for_each(|(entry_str, entry)| {
            assert_eq!(
                serde_json::from_str::<SpecEntry>(entry_str)
                    .unwrap_or_else(|e| panic!("Failed to deserialize spec entry: {e}")),
                *entry
            );
        });
    }

    #[test]
    fn from_json_value_dispatches_to_variant() {
        let ingredient: serde_json::Value =
            serde_json::from_str(r#"{ "name": "0% Milk", "category": "Dairy", "DairySimpleSpec": { "fat": 0 } }"#)
                .unwrap();
        assert!(matches!(SpecEntry::from_json_value(ingredient).unwrap(), SpecEntry::Ingredient(_)));

        let alias: serde_json::Value = serde_json::from_str(r#"{ "alias": "Skim Milk", "for": "0% Milk" }"#).unwrap();
        assert!(matches!(SpecEntry::from_json_value(alias).unwrap(), SpecEntry::Alias(_)));
    }

    #[test]
    fn from_json_value_surfaces_field_level_error() {
        let bad: serde_json::Value =
            serde_json::from_str(r#"{ "name": "Bad", "category": "Dairy", "DairySimpleSpec": { "fat": "lots" } }"#)
                .unwrap();
        let err = SpecEntry::from_json_value(bad).unwrap_err().to_string();
        assert!(!err.contains("no variant matched"));
        assert!(err.contains("lots"));
    }

    #[test]
    fn spec_entry_name_method() {
        SPEC_ENTRIES.iter().for_each(|(_, entry)| {
            let expected_name = match entry {
                SpecEntry::Ingredient(spec) => &spec.name,
                SpecEntry::Alias(alias_spec) => &alias_spec.alias,
            };
            assert_eq!(entry.name(), expected_name);
        });
    }

    #[test]
    fn resolve_spec_entry_into_ingredient() {
        let db = &*EMBEDDED_DB;

        SPEC_ENTRIES.iter().for_each(|(_, entry)| {
            let expected_ingredient = match entry {
                SpecEntry::Ingredient(spec) => db.get_ingredient_by_name(&spec.name).unwrap(),
                SpecEntry::Alias(alias_spec) => db.get_ingredient_by_name(&alias_spec.for_name).unwrap(),
            };
            let resolved_ingredient = entry.clone().resolve_into_ingredient(db).unwrap();
            assert_eq!(resolved_ingredient.name, entry.name());
            assert_eq!(resolved_ingredient.category, expected_ingredient.category);
            assert_eq!(resolved_ingredient.composition, expected_ingredient.composition);
        });
    }
}

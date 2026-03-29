//! [`CompositeSpec`] and associated implementations, for composite ingredients that are defined as
//! a combination of multiple other ingredients, e.g. stabilizer blends, fruit medleys, etc.

use serde::{Deserialize, Serialize};

use crate::{
    composition::{Composition, ResolveComposition},
    error::Result,
    resolution::IngredientGetter,
    validate::{Validate, verify_are_positive, verify_is_100_percent},
};

/// A (name, percentage) tuple representing a component of a composite ingredient.
pub type Component = (String, f64);

/// Specification for composite ingredients, which are defined as a combination of multiple other
/// ingredients, each with a specified percentage by weight.
///
/// The [`components`](Self::components) field is a vector of tuples, where each tuple contains the
/// name of an ingredient and its corresponding percentage by weight in the composite. The
/// percentages must be positive and sum to 100%.
///
/// The ingredient names must correspond to valid ingredients in the collection, and they must not
/// be aliases or composites themselves, to avoid circular references.
//
// @todo: Relaxing the requirements above is possible, but it would require more complex handling,
// possibly involving topological sorting of ingredient dependencies, and careful handling of
// circular references. For now, we enforce these constraints to keep the implementation simple.
#[derive(PartialEq, Serialize, Deserialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct CompositeSpec {
    /// The components of the composite, as a vector of name-percentage tuples.
    pub components: Vec<Component>,
}

impl ResolveComposition for CompositeSpec {
    fn resolve_composition(&self, getter: &dyn IngredientGetter) -> Result<Composition> {
        let component_weights = self.components.iter().map(|c| c.1).collect::<Vec<_>>();
        let total_percentage = component_weights.iter().sum::<f64>();

        verify_are_positive(&component_weights)?;
        verify_is_100_percent(total_percentage)?;

        let resolved_components = self
            .components
            .iter()
            .map(|c| Ok((getter.get_ingredient_by_name(&c.0)?.composition, c.1)))
            .collect::<Result<Vec<_>>>()?;

        Composition::from_combination(&resolved_components)?.validate_into()
    }
}

#[cfg(test)]
#[cfg_attr(coverage, coverage(off))]
#[allow(clippy::unwrap_used, clippy::float_cmp)]
pub(crate) mod tests {
    use std::sync::LazyLock;

    use crate::tests::asserts::shadow_asserts::assert_eq;
    #[expect(unused_imports)]
    use crate::tests::asserts::*;

    use super::*;
    use crate::{
        composition::{CompKey, Composition},
        database::IngredientDatabase,
        ingredient::Category,
        specs::IngredientSpec,
    };

    pub(crate) const ING_SPEC_COMPOSITE_MILK_CREAM_50_50_STR: &str = r#"{
      "name": "Milk-Cream Blend 50-50",
      "category": "Dairy",
      "CompositeSpec": {
        "components": [
            ["2% Milk", 50],
            ["40% Cream", 50]
        ]
      }
    }"#;

    pub(crate) static ING_SPEC_COMPOSITE_MILK_CREAM_50_50: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Milk-Cream Blend 50-50".to_string(),
            category: Category::Dairy,
            spec: CompositeSpec {
                components: vec![("2% Milk".to_string(), 50.0), ("40% Cream".to_string(), 50.0)],
            }
            .into(),
        });

    pub(crate) const ING_SPEC_COMPOSITE_MILK_CREAM_80_20_STR: &str = r#"{
      "name": "Milk-Cream Blend 80-20",
      "category": "Dairy",
      "CompositeSpec": {
        "components": [
            ["2% Milk", 80],
            ["40% Cream", 20]
        ]
      }
    }"#;

    pub(crate) static ING_SPEC_COMPOSITE_MILK_CREAM_80_20: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Milk-Cream Blend 80-20".to_string(),
            category: Category::Dairy,
            spec: CompositeSpec {
                components: vec![("2% Milk".to_string(), 80.0), ("40% Cream".to_string(), 20.0)],
            }
            .into(),
        });

    #[test]
    fn parse_composite_spec_from_json_empty() {
        let spec_from_json: CompositeSpec = serde_json::from_str(r#"{"components": []}"#).unwrap();
        assert_eq!(spec_from_json, CompositeSpec { components: vec![] });
    }

    #[test]
    fn serialize_composite_spec_to_json_empty() {
        let spec = CompositeSpec { components: vec![] };
        let json = serde_json::to_string(&spec).unwrap();
        assert_eq!(json, "{\"components\":[]}");
    }

    #[test]
    fn parse_ingredient_spec_composite_from_json() {
        let spec_from_json: IngredientSpec = serde_json::from_str(ING_SPEC_COMPOSITE_MILK_CREAM_50_50_STR).unwrap();
        assert_eq!(spec_from_json, ING_SPEC_COMPOSITE_MILK_CREAM_50_50.clone());

        let spec_from_json: IngredientSpec = serde_json::from_str(ING_SPEC_COMPOSITE_MILK_CREAM_80_20_STR).unwrap();
        assert_eq!(spec_from_json, ING_SPEC_COMPOSITE_MILK_CREAM_80_20.clone());
    }

    #[test]
    fn serialize_ingredient_spec_composite_to_json() {
        let json = serde_json::to_string(&ING_SPEC_COMPOSITE_MILK_CREAM_50_50.clone()).unwrap();
        assert_eq!(
            json,
            "{\"name\":\"Milk-Cream Blend 50-50\",\"category\":\"Dairy\",\"CompositeSpec\":{\"components\":[[\"2% Milk\",50.0],[\"40% Cream\",50.0]]}}"
        );

        let json = serde_json::to_string(&ING_SPEC_COMPOSITE_MILK_CREAM_80_20.clone()).unwrap();
        assert_eq!(
            json,
            "{\"name\":\"Milk-Cream Blend 80-20\",\"category\":\"Dairy\",\"CompositeSpec\":{\"components\":[[\"2% Milk\",80.0],[\"40% Cream\",20.0]]}}"
        );
    }

    #[test]
    fn resolve_composite_spec() {
        let db = IngredientDatabase::new_seeded_from_embedded_data();

        let milk = db.get_ingredient_by_name("2% Milk").unwrap().composition;
        let cream = db.get_ingredient_by_name("40% Cream").unwrap().composition;

        let composite_comp = ING_SPEC_COMPOSITE_MILK_CREAM_50_50.resolve_composition(&db).unwrap();
        let combined_comp = Composition::from_combination(&[(milk, 50.0), (cream, 50.0)]).unwrap();
        assert_eq!(composite_comp, combined_comp);
        assert_eq!(composite_comp.get(CompKey::MilkFat), 21.0);

        let composite_comp = ING_SPEC_COMPOSITE_MILK_CREAM_80_20.resolve_composition(&db).unwrap();
        let combined_comp = Composition::from_combination(&[(milk, 80.0), (cream, 20.0)]).unwrap();
        assert_eq!(composite_comp, combined_comp);
        assert_eq!(composite_comp.get(CompKey::MilkFat), 9.6);
    }

    #[test]
    fn resolve_composite_spec_err_when_component_not_found() {
        let db = IngredientDatabase::new_seeded_from_embedded_data();

        let spec = CompositeSpec {
            components: vec![("Nonexistent Ingredient".to_string(), 100.0)],
        };

        let err = spec.resolve_composition(&db).unwrap_err();
        assert_eq!(err.to_string(), "Ingredient not found: Nonexistent Ingredient");
    }

    #[test]
    fn resolve_composite_spec_err_negative_percentage() {
        let db = IngredientDatabase::new_seeded_from_embedded_data();

        let spec = CompositeSpec {
            components: vec![("2% Milk".to_string(), -50.0), ("40% Cream".to_string(), 150.0)],
        };

        let err = spec.resolve_composition(&db).unwrap_err();
        assert_eq!(err.to_string(), "Composition value is not positive: -50");
    }

    #[test]
    fn resolve_composite_spec_err_percentage_not_100() {
        let db = IngredientDatabase::new_seeded_from_embedded_data();

        let spec = CompositeSpec {
            components: vec![("2% Milk".to_string(), 30.0), ("40% Cream".to_string(), 50.0)],
        };

        let err = spec.resolve_composition(&db).unwrap_err();
        assert_eq!(err.to_string(), "Composition does not sum to 100%: 80");
    }
}

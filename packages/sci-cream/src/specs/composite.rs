//! [`CompositeSpec`] and associated implementations, for composite ingredients that are defined as
//! a combination of multiple other ingredients, e.g. stabilizer blends, fruit medleys, etc.

use serde::{Deserialize, Serialize};

use crate::{
    composition::{Composition, ResolveComposition},
    error::Result,
    resolution::IngredientGetter,
    validate::{Validate, verify_are_positive, verify_is_100_percent},
};

/// A (name, weight) tuple representing a component of a composite ingredient.
pub type Component = (String, f64);

/// Basis for the component combination weights in a composite ingredient, by percentage or parts.
#[derive(PartialEq, Serialize, Deserialize, Clone, Debug)]
pub enum Basis {
    /// Component weights are given as percentages; the weights must be positive and sum to 100%.
    ByPercentage(Vec<Component>),
    /// Component weights are given as parts, e.g. 4:2:1; the weights must be positive.
    ByParts(Vec<Component>),
}

/// Specification for composite ingredients, which are defined as a combination of multiple other
/// ingredients, each with a specified percentage by weight.
///
/// The [`components`](Self::components) field is a vector of tuples, where each tuple contains the
/// name of an ingredient and its corresponding weight in the composite, and it's tagged to identify
/// the basis of the component combination weights, either by percentage or by parts. The weights
/// must be positive and sum to 100% if specified by percentage.
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
    /// The components of the composite, as a vector of name-weight tuples, tagged with the
    /// basis of the component combination weights, either by percentage or by parts.
    #[serde(flatten)]
    pub components: Basis,
}

impl ResolveComposition for CompositeSpec {
    fn resolve_composition(&self, getter: &dyn IngredientGetter) -> Result<Composition> {
        let components = match &self.components {
            Basis::ByPercentage(components) | Basis::ByParts(components) => components,
        };

        let component_weights = components.iter().map(|c| c.1).collect::<Vec<_>>();
        verify_are_positive(&component_weights)?;

        if let Basis::ByPercentage(_) = self.components {
            let total_percentage = component_weights.iter().sum::<f64>();
            verify_is_100_percent(total_percentage)?;
        }

        let resolved_components = components
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

    // --- ByPercentage ---

    const ING_SPEC_COMPOSITE_MILK_CREAM_50_50_STR: &str = r#"{
      "name": "Milk-Cream Blend 50-50",
      "category": "Dairy",
      "CompositeSpec": {
        "ByPercentage": [
          ["2% Milk", 50],
          ["40% Cream", 50]
        ]
      }
    }"#;

    static ING_SPEC_COMPOSITE_MILK_CREAM_50_50: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Milk-Cream Blend 50-50".to_string(),
        category: Category::Dairy,
        spec: CompositeSpec {
            components: Basis::ByPercentage(vec![("2% Milk".to_string(), 50.0), ("40% Cream".to_string(), 50.0)]),
        }
        .into(),
    });

    const ING_SPEC_COMPOSITE_MILK_CREAM_80_20_STR: &str = r#"{
      "name": "Milk-Cream Blend 80-20",
      "category": "Dairy",
      "CompositeSpec": {
        "ByPercentage": [
          ["2% Milk", 80],
          ["40% Cream", 20]
        ]
      }
    }"#;

    static ING_SPEC_COMPOSITE_MILK_CREAM_80_20: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Milk-Cream Blend 80-20".to_string(),
        category: Category::Dairy,
        spec: CompositeSpec {
            components: Basis::ByPercentage(vec![("2% Milk".to_string(), 80.0), ("40% Cream".to_string(), 20.0)]),
        }
        .into(),
    });

    #[test]
    fn parse_composite_spec_from_json_empty() {
        let spec_from_json: CompositeSpec = serde_json::from_str(r#"{"ByPercentage": []}"#).unwrap();
        assert_eq!(
            spec_from_json,
            CompositeSpec {
                components: Basis::ByPercentage(vec![])
            }
        );
    }

    #[test]
    fn serialize_composite_spec_to_json_empty() {
        let spec = CompositeSpec {
            components: Basis::ByPercentage(vec![]),
        };
        let json = serde_json::to_string(&spec).unwrap();
        assert_eq!(json, "{\"ByPercentage\":[]}");
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
            "{\"name\":\"Milk-Cream Blend 50-50\",\"category\":\"Dairy\",\"CompositeSpec\":{\"ByPercentage\":[[\"2% Milk\",50.0],[\"40% Cream\",50.0]]}}"
        );

        let json = serde_json::to_string(&ING_SPEC_COMPOSITE_MILK_CREAM_80_20.clone()).unwrap();
        assert_eq!(
            json,
            "{\"name\":\"Milk-Cream Blend 80-20\",\"category\":\"Dairy\",\"CompositeSpec\":{\"ByPercentage\":[[\"2% Milk\",80.0],[\"40% Cream\",20.0]]}}"
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
            components: Basis::ByPercentage(vec![("Nonexistent Ingredient".to_string(), 100.0)]),
        };

        let err = spec.resolve_composition(&db).unwrap_err();
        assert_eq!(err.to_string(), "Ingredient not found: Nonexistent Ingredient");
    }

    #[test]
    fn resolve_composite_spec_err_negative_percentage() {
        let db = IngredientDatabase::new_seeded_from_embedded_data();

        let spec = CompositeSpec {
            components: Basis::ByPercentage(vec![("2% Milk".to_string(), -50.0), ("40% Cream".to_string(), 150.0)]),
        };

        let err = spec.resolve_composition(&db).unwrap_err();
        assert_eq!(err.to_string(), "Composition value is not positive: -50");
    }

    #[test]
    fn resolve_composite_spec_err_percentage_not_100() {
        let db = IngredientDatabase::new_seeded_from_embedded_data();

        let spec = CompositeSpec {
            components: Basis::ByPercentage(vec![("2% Milk".to_string(), 30.0), ("40% Cream".to_string(), 50.0)]),
        };

        let err = spec.resolve_composition(&db).unwrap_err();
        assert_eq!(err.to_string(), "Composition does not sum to 100%: 80");
    }

    // --- ByParts ---

    const ING_SPEC_COMPOSITE_MILK_CREAM_1_1_PARTS_STR: &str = r#"{
      "name": "Milk-Cream Blend 1:1 Parts",
      "category": "Dairy",
      "CompositeSpec": {
        "ByParts": [
          ["2% Milk", 1],
          ["40% Cream", 1]
        ]
      }
    }"#;

    static ING_SPEC_COMPOSITE_MILK_CREAM_1_1_PARTS: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Milk-Cream Blend 1:1 Parts".to_string(),
        category: Category::Dairy,
        spec: CompositeSpec {
            components: Basis::ByParts(vec![("2% Milk".to_string(), 1.0), ("40% Cream".to_string(), 1.0)]),
        }
        .into(),
    });

    const ING_SPEC_COMPOSITE_MILK_CREAM_4_1_PARTS_STR: &str = r#"{
      "name": "Milk-Cream Blend 4:1 Parts",
      "category": "Dairy",
      "CompositeSpec": {
        "ByParts": [
          ["2% Milk", 4],
          ["40% Cream", 1]
        ]
      }
    }"#;

    static ING_SPEC_COMPOSITE_MILK_CREAM_4_1_PARTS: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Milk-Cream Blend 4:1 Parts".to_string(),
        category: Category::Dairy,
        spec: CompositeSpec {
            components: Basis::ByParts(vec![("2% Milk".to_string(), 4.0), ("40% Cream".to_string(), 1.0)]),
        }
        .into(),
    });

    #[test]
    fn parse_composite_spec_from_json_by_parts() {
        let spec_from_json: CompositeSpec = serde_json::from_str(r#"{"ByParts": []}"#).unwrap();
        assert_eq!(
            spec_from_json,
            CompositeSpec {
                components: Basis::ByParts(vec![])
            }
        );
    }

    #[test]
    fn serialize_composite_spec_to_json_by_parts() {
        let spec = CompositeSpec {
            components: Basis::ByParts(vec![]),
        };
        let json = serde_json::to_string(&spec).unwrap();
        assert_eq!(json, "{\"ByParts\":[]}");
    }

    #[test]
    fn parse_ingredient_spec_composite_by_parts_from_json() {
        let spec_from_json: IngredientSpec = serde_json::from_str(ING_SPEC_COMPOSITE_MILK_CREAM_1_1_PARTS_STR).unwrap();
        assert_eq!(spec_from_json, ING_SPEC_COMPOSITE_MILK_CREAM_1_1_PARTS.clone());

        let spec_from_json: IngredientSpec = serde_json::from_str(ING_SPEC_COMPOSITE_MILK_CREAM_4_1_PARTS_STR).unwrap();
        assert_eq!(spec_from_json, ING_SPEC_COMPOSITE_MILK_CREAM_4_1_PARTS.clone());
    }

    #[test]
    fn serialize_ingredient_spec_composite_by_parts_to_json() {
        let json = serde_json::to_string(&ING_SPEC_COMPOSITE_MILK_CREAM_1_1_PARTS.clone()).unwrap();
        assert_eq!(
            json,
            "{\"name\":\"Milk-Cream Blend 1:1 Parts\",\"category\":\"Dairy\",\"CompositeSpec\":{\"ByParts\":[[\"2% Milk\",1.0],[\"40% Cream\",1.0]]}}"
        );

        let json = serde_json::to_string(&ING_SPEC_COMPOSITE_MILK_CREAM_4_1_PARTS.clone()).unwrap();
        assert_eq!(
            json,
            "{\"name\":\"Milk-Cream Blend 4:1 Parts\",\"category\":\"Dairy\",\"CompositeSpec\":{\"ByParts\":[[\"2% Milk\",4.0],[\"40% Cream\",1.0]]}}"
        );
    }

    #[test]
    fn resolve_composite_spec_by_parts() {
        let db = IngredientDatabase::new_seeded_from_embedded_data();

        let milk = db.get_ingredient_by_name("2% Milk").unwrap().composition;
        let cream = db.get_ingredient_by_name("40% Cream").unwrap().composition;

        // parts 1:1 should normalize to the same result as a 50%:50% split
        let parts_comp = ING_SPEC_COMPOSITE_MILK_CREAM_1_1_PARTS
            .resolve_composition(&db)
            .unwrap();
        let combined_comp = Composition::from_combination(&[(milk, 50.0), (cream, 50.0)]).unwrap();
        assert_eq!(parts_comp, combined_comp);
        assert_eq!(parts_comp.get(CompKey::MilkFat), 21.0);

        // parts 4:1 should normalize to the same result as an 80%:20% split
        let parts_comp = ING_SPEC_COMPOSITE_MILK_CREAM_4_1_PARTS
            .resolve_composition(&db)
            .unwrap();
        let combined_comp = Composition::from_combination(&[(milk, 80.0), (cream, 20.0)]).unwrap();
        assert_eq!(parts_comp, combined_comp);
        assert_eq!(parts_comp.get(CompKey::MilkFat), 9.6);
    }

    #[test]
    fn resolve_composite_spec_by_parts_does_not_require_sum_to_100() {
        let db = IngredientDatabase::new_seeded_from_embedded_data();

        // ByParts [2, 1] sums to 3, not 100, but should resolve successfully unlike ByPercentage
        let spec = CompositeSpec {
            components: Basis::ByParts(vec![("2% Milk".to_string(), 2.0), ("40% Cream".to_string(), 1.0)]),
        };
        assert!(spec.resolve_composition(&db).is_ok());

        let pct_spec = CompositeSpec {
            components: Basis::ByPercentage(vec![("2% Milk".to_string(), 2.0), ("40% Cream".to_string(), 1.0)]),
        };
        assert!(pct_spec.resolve_composition(&db).is_err());
    }

    #[test]
    fn resolve_composite_spec_by_parts_err_negative_weight() {
        let db = IngredientDatabase::new_seeded_from_embedded_data();

        let spec = CompositeSpec {
            components: Basis::ByParts(vec![("2% Milk".to_string(), -1.0), ("40% Cream".to_string(), 2.0)]),
        };
        let err = spec.resolve_composition(&db).unwrap_err();
        assert_eq!(err.to_string(), "Composition value is not positive: -1");
    }

    #[test]
    fn resolve_composite_spec_by_parts_err_component_not_found() {
        let db = IngredientDatabase::new_seeded_from_embedded_data();

        let spec = CompositeSpec {
            components: Basis::ByParts(vec![("Nonexistent Ingredient".to_string(), 1.0)]),
        };
        let err = spec.resolve_composition(&db).unwrap_err();
        assert_eq!(err.to_string(), "Ingredient not found: Nonexistent Ingredient");
    }

    // --- Real Assets ---

    pub(crate) const ING_SPEC_COMPOSITE_UNDERBELLY_GP_SB_STR: &str = r#"{
      "name": "Underbelly General Purpose Stabilizer Blend",
      "category": "Stabilizer",
      "CompositeSpec": {
        "ByParts": [
          ["Locust Bean Gum", 4],
          ["Guar Gum", 2],
          ["Lambda Carrageenan", 1]
        ]
      }
    }"#;

    pub(crate) static ING_SPEC_COMPOSITE_UNDERBELLY_GP_SB: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Underbelly General Purpose Stabilizer Blend".to_string(),
            category: Category::Stabilizer,
            spec: CompositeSpec {
                components: Basis::ByParts(vec![
                    ("Locust Bean Gum".to_string(), 4.0),
                    ("Guar Gum".to_string(), 2.0),
                    ("Lambda Carrageenan".to_string(), 1.0),
                ]),
            }
            .into(),
        });

    #[test]
    fn resolve_composition_composite_spec_underbelly_gp_sb() {
        let db = IngredientDatabase::new_seeded_from_embedded_data();

        let combo = [
            ("Locust Bean Gum".to_string(), 4.0 / 7.0 * 100.0),
            ("Guar Gum".to_string(), 2.0 / 7.0 * 100.0),
            ("Lambda Carrageenan".to_string(), 1.0 / 7.0 * 100.0),
        ]
        .map(|(name, weight)| (db.get_ingredient_by_name(&name).unwrap().composition, weight))
        .to_vec();

        let composite_comp = ING_SPEC_COMPOSITE_UNDERBELLY_GP_SB.resolve_composition(&db).unwrap();
        let combined_comp = Composition::from_combination(&combo).unwrap();
        assert_eq!(composite_comp, combined_comp);

        assert_eq!(composite_comp.get(CompKey::Fiber), 100.0);
        assert_eq!(composite_comp.get(CompKey::TotalSolids), 100.0);
        assert_eq!(composite_comp.get(CompKey::Stabilizers), 100.0);
    }

    pub(crate) static INGREDIENT_ASSETS_TABLE_COMPOSITE: LazyLock<Vec<(&str, IngredientSpec, Option<Composition>)>> =
        LazyLock::new(|| {
            vec![(ING_SPEC_COMPOSITE_UNDERBELLY_GP_SB_STR, ING_SPEC_COMPOSITE_UNDERBELLY_GP_SB.clone(), None)]
        });
}

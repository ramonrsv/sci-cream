//! [`CompositeSpec`] and associated implementations, for composite ingredients that are defined as
//! a combination of multiple other ingredients, e.g. stabilizer blends, fruit medleys, etc.

use serde::{Deserialize, Serialize};

use crate::{
    composition::{Composition, ResolveComposition, ToComposition},
    error::Result,
    resolution::IngredientGetter,
    specs::TaggedSpec,
    validate::{Validate, verify_are_positive, verify_is_100_percent},
};

/// The source of a composite component: either a reference to a named ingredient in the
/// collection, or an inline spec resolved directly without a lookup.
#[derive(PartialEq, Serialize, Deserialize, Clone, Debug)]
#[serde(untagged)]
pub enum ComponentSource {
    /// Reference to an ingredient by name, looked up via the [`IngredientGetter`].
    Named(String),
    /// An inline spec, converted to a composition directly without a database lookup.
    Inline(Box<TaggedSpec>),
}

/// A (component, weight) tuple representing a component line of a composite ingredient.
///
/// The component source can be a named reference, requiring lookup from a [`IngredientGetter`], or
/// an inline spec; the weight's meaning depends on the [`Basis`], either by percentage or by parts.
pub type ComponentLine = (ComponentSource, f64);

/// Basis for the component combination weights in a composite ingredient, by percentage or parts.
#[derive(PartialEq, Serialize, Deserialize, Clone, Debug)]
pub enum Basis {
    /// Component weights are given as percentages; the weights must be positive and sum to 100%.
    ByPercentage(Vec<ComponentLine>),
    /// Component weights are given as parts, e.g. 4:2:1; the weights must be positive.
    ByParts(Vec<ComponentLine>),
}

/// Specification for composite ingredients, which are defined as a combination of multiple other
/// ingredients, each with a specified percentage by weight.
///
/// The [`components`](Self::components) field is a vector of tuples, where each tuple contains the
/// [source](ComponentSource) of an ingredient and its corresponding weight in the composite, and
/// it's tagged to identify the basis of the component combination weights, either by percentage or
/// by parts. The weights must be positive and sum to 100% if specified by percentage.
///
/// A component source is either a [named](ComponentSource::Named) reference or an
/// [inline](ComponentSource::Inline) spec. Components must not be aliases or composites themselves,
/// to avoid circular references. Named references must correspond to valid ingredients in the
/// collection; inline specs are resolved directly without a lookup.
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
            .map(|(source, weight)| {
                let composition = match source {
                    ComponentSource::Named(name) => getter.get_ingredient_by_name(name)?.composition,
                    ComponentSource::Inline(spec) => spec.to_composition()?,
                };
                Ok((composition, *weight))
            })
            .collect::<Result<Vec<_>>>()?;

        Composition::from_combination(&resolved_components)?.validate_into()
    }
}

impl From<String> for ComponentSource {
    fn from(name: String) -> Self {
        Self::Named(name)
    }
}

impl From<&str> for ComponentSource {
    fn from(name: &str) -> Self {
        Self::Named(name.to_string())
    }
}

impl From<TaggedSpec> for ComponentSource {
    fn from(spec: TaggedSpec) -> Self {
        Self::Inline(Box::new(spec))
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
        error::Error,
        ingredient::Category,
        specs::{DairySimpleSpec, IngredientSpec},
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
            components: Basis::ByPercentage(vec![("2% Milk".into(), 50.0), ("40% Cream".into(), 50.0)]),
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
            components: Basis::ByPercentage(vec![("2% Milk".into(), 80.0), ("40% Cream".into(), 20.0)]),
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
            components: Basis::ByPercentage(vec![("Nonexistent Ingredient".into(), 100.0)]),
        };

        let err = spec.resolve_composition(&db).unwrap_err();
        assert_eq!(err.to_string(), "Ingredient not found: Nonexistent Ingredient");
    }

    #[test]
    fn resolve_composite_spec_err_negative_percentage() {
        let db = IngredientDatabase::new_seeded_from_embedded_data();

        let spec = CompositeSpec {
            components: Basis::ByPercentage(vec![("2% Milk".into(), -50.0), ("40% Cream".into(), 150.0)]),
        };

        let err = spec.resolve_composition(&db).unwrap_err();
        assert_eq!(err.to_string(), "Composition value is not positive: -50");
    }

    #[test]
    fn resolve_composite_spec_err_percentage_not_100() {
        let db = IngredientDatabase::new_seeded_from_embedded_data();

        let spec = CompositeSpec {
            components: Basis::ByPercentage(vec![("2% Milk".into(), 30.0), ("40% Cream".into(), 50.0)]),
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
            components: Basis::ByParts(vec![("2% Milk".into(), 1.0), ("40% Cream".into(), 1.0)]),
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
            components: Basis::ByParts(vec![("2% Milk".into(), 4.0), ("40% Cream".into(), 1.0)]),
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
            components: Basis::ByParts(vec![("2% Milk".into(), 2.0), ("40% Cream".into(), 1.0)]),
        };
        assert!(spec.resolve_composition(&db).is_ok());

        let pct_spec = CompositeSpec {
            components: Basis::ByPercentage(vec![("2% Milk".into(), 2.0), ("40% Cream".into(), 1.0)]),
        };
        assert!(pct_spec.resolve_composition(&db).is_err());
    }

    #[test]
    fn resolve_composite_spec_by_parts_err_negative_weight() {
        let db = IngredientDatabase::new_seeded_from_embedded_data();

        let spec = CompositeSpec {
            components: Basis::ByParts(vec![("2% Milk".into(), -1.0), ("40% Cream".into(), 2.0)]),
        };
        let err = spec.resolve_composition(&db).unwrap_err();
        assert_eq!(err.to_string(), "Composition value is not positive: -1");
    }

    #[test]
    fn resolve_composite_spec_by_parts_err_component_not_found() {
        let db = IngredientDatabase::new_seeded_from_embedded_data();

        let spec = CompositeSpec {
            components: Basis::ByParts(vec![("Nonexistent Ingredient".into(), 1.0)]),
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
                    ("Locust Bean Gum".into(), 4.0),
                    ("Guar Gum".into(), 2.0),
                    ("Lambda Carrageenan".into(), 1.0),
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

        assert_eq!(composite_comp.get(CompKey::TotalFiber), 100.0);
        assert_eq!(composite_comp.get(CompKey::TotalSolids), 100.0);
        assert_eq!(composite_comp.get(CompKey::TotalStabilizers), 100.0);
    }

    pub(crate) static INGREDIENT_ASSETS_TABLE_COMPOSITE: LazyLock<Vec<(&str, IngredientSpec, Option<Composition>)>> =
        LazyLock::new(|| {
            vec![(ING_SPEC_COMPOSITE_UNDERBELLY_GP_SB_STR, ING_SPEC_COMPOSITE_UNDERBELLY_GP_SB.clone(), None)]
        });

    // --- Inline components ---

    const ING_SPEC_COMPOSITE_INLINE_CREAM_BLEND_STR: &str = r#"{
      "name": "Inline Cream Blend",
      "category": "Dairy",
      "CompositeSpec": {
        "ByParts": [
          ["2% Milk", 4],
          [{ "DairySimpleSpec": { "fat": 40 } }, 1]
        ]
      }
    }"#;

    static ING_SPEC_COMPOSITE_INLINE_CREAM_BLEND: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Inline Cream Blend".to_string(),
        category: Category::Dairy,
        spec: CompositeSpec {
            components: Basis::ByParts(vec![
                ("2% Milk".into(), 4.0),
                (
                    TaggedSpec::from(DairySimpleSpec {
                        fat: 40.0,
                        msnf: None,
                        protein: None,
                        lactose_free: None,
                        solids_source: None,
                    })
                    .into(),
                    1.0,
                ),
            ]),
        }
        .into(),
    });

    #[test]
    fn parse_ingredient_spec_composite_inline_from_json() {
        let spec_from_json: IngredientSpec = serde_json::from_str(ING_SPEC_COMPOSITE_INLINE_CREAM_BLEND_STR).unwrap();
        assert_eq!(spec_from_json, ING_SPEC_COMPOSITE_INLINE_CREAM_BLEND.clone());
    }

    #[test]
    fn serialize_ingredient_spec_composite_inline_to_json() {
        let json = serde_json::to_string(&ING_SPEC_COMPOSITE_INLINE_CREAM_BLEND.clone()).unwrap();
        assert_eq!(
            json,
            "{\"name\":\"Inline Cream Blend\",\"category\":\"Dairy\",\"CompositeSpec\":{\"ByParts\":[[\"2% Milk\",4.0],[{\"DairySimpleSpec\":{\"fat\":40.0}},1.0]]}}"
        );
    }

    #[test]
    fn resolve_composite_spec_inline_only_needs_no_lookup() {
        // An empty database — inline components must resolve without any ingredient lookup.
        let db = IngredientDatabase::new();

        let milk_spec: TaggedSpec = DairySimpleSpec {
            fat: 2.0,
            msnf: None,
            protein: None,
            lactose_free: None,
            solids_source: None,
        }
        .into();

        let cream_spec: TaggedSpec = DairySimpleSpec {
            fat: 40.0,
            msnf: None,
            protein: None,
            lactose_free: None,
            solids_source: None,
        }
        .into();

        let spec = CompositeSpec {
            components: Basis::ByPercentage(vec![(milk_spec.clone().into(), 50.0), (cream_spec.clone().into(), 50.0)]),
        };

        let resolved = spec.resolve_composition(&db).unwrap();
        let expected = Composition::from_combination(&[
            (milk_spec.to_composition().unwrap(), 50.0),
            (cream_spec.to_composition().unwrap(), 50.0),
        ])
        .unwrap();
        assert_eq!(resolved, expected);
    }

    #[test]
    fn resolve_composite_spec_mixed_named_and_inline() {
        let db = IngredientDatabase::new_seeded_from_embedded_data();

        let milk = db.get_ingredient_by_name("2% Milk").unwrap().composition;
        let cream_spec = DairySimpleSpec {
            fat: 40.0,
            msnf: None,
            protein: None,
            lactose_free: None,
            solids_source: None,
        };

        // ByParts [4, 1] normalizes to an 80%:20% split of the named milk and the inline cream.
        let resolved = ING_SPEC_COMPOSITE_INLINE_CREAM_BLEND.resolve_composition(&db).unwrap();
        let expected =
            Composition::from_combination(&[(milk, 80.0), (cream_spec.to_composition().unwrap(), 20.0)]).unwrap();
        assert_eq!(resolved, expected);
    }

    #[test]
    fn resolve_composite_spec_err_inline_nested_composite() {
        let db = IngredientDatabase::new_seeded_from_embedded_data();

        // An inline component may not itself be a CompositeSpec (flat only).
        let nested: TaggedSpec = CompositeSpec {
            components: Basis::ByParts(vec![("2% Milk".into(), 1.0)]),
        }
        .into();

        let spec = CompositeSpec {
            components: Basis::ByPercentage(vec![(nested.into(), 100.0)]),
        };

        let err = spec.resolve_composition(&db).unwrap_err();
        assert!(matches!(err, Error::UnsupportedSpec(_)));
    }

    #[test]
    fn resolve_composite_spec_err_inline_spec_invalid() {
        let db = IngredientDatabase::new();

        // A dairy spec whose fat alone exceeds 100% cannot be converted to a composition;
        // the error from the inline spec must surface through resolution.
        let spec = CompositeSpec {
            components: Basis::ByPercentage(vec![(
                TaggedSpec::from(DairySimpleSpec {
                    fat: 200.0,
                    msnf: None,
                    protein: None,
                    lactose_free: None,
                    solids_source: None,
                })
                .into(),
                100.0,
            )]),
        };

        assert!(spec.resolve_composition(&db).is_err());
    }
}

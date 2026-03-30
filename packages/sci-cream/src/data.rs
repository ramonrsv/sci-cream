//! Inclusion and access of embedded ingredient specification data
//!
//! If feature `data` is enabled, this module embeds the ingredient specifications from
//! `data/ingredients/*.json` at compile time and provides functions to retrieve them.
//!
//! Note the distinction and differing handling of "independent" and "dependent" specs. Independent
//! specs are those that can be directly converted into [`Composition`]s or [`Ingredient`]s without
//! needing to resolve dependencies on other specs, i.e. they are not [`AliasSpec`]s or
//! [`CompositeSpec`]s. The functions [`get_all_independent_ingredient_specs`] and
//! [`get_independent_ingredient_spec_by_name`] are provided to retrieve only these independent
//! ingredient specs. [`AliasSpec`]s and [`CompositeSpec`]s are considered dependent specs, as they
//! reference other specs and require resolution of their dependencies to obtain the full
//! composition. The functions [`get_all_spec_entries`] and [`get_spec_entry_by_name`] retrieve all
//! specs, including both independent and dependent ones, and return them as [`SpecEntry`]s. See
//! [`ResolveComposition`] and [`ResolveIntoIngredient`] traits for more on how dependent specs.

use std::collections::HashMap;
use std::sync::LazyLock;

use crate::{
    error::{Error, Result},
    specs::{IngredientSpec, SpecEntry, TaggedSpec},
};

#[cfg(doc)]
use crate::{
    composition::{Composition, ResolveComposition},
    ingredient::{Ingredient, ResolveIntoIngredient},
    specs::{AliasSpec, CompositeSpec},
};

const EMBEDDED_JSON_DATA_FILES_CONTENT: &[(&str, &str)] = &[
    ("dairy.json", include_str!("../data/ingredients/dairy.json")),
    ("sweeteners.json", include_str!("../data/ingredients/sweeteners.json")),
    ("fruits.json", include_str!("../data/ingredients/fruits.json")),
    ("chocolates.json", include_str!("../data/ingredients/chocolates.json")),
    ("nuts.json", include_str!("../data/ingredients/nuts.json")),
    ("eggs.json", include_str!("../data/ingredients/eggs.json")),
    ("alcohol.json", include_str!("../data/ingredients/alcohol.json")),
    ("micros.json", include_str!("../data/ingredients/micros.json")),
    ("miscellaneous.json", include_str!("../data/ingredients/miscellaneous.json")),
];

/// Parses a JSON string of spec entries into a map of ingredient names or aliases to their spec
///
/// # Errors
///
/// Returns a [`serde_json::Error`] if the JSON string cannot be parsed into the expected format.
pub fn parse_spec_entries_from_json_string(
    file_content: &str,
) -> std::result::Result<HashMap<String, SpecEntry>, serde_json::Error> {
    let specs = serde_json::from_str::<Vec<serde_json::Value>>(file_content)?;

    specs
        .into_iter()
        .map(|spec_serde| serde_json::from_value(spec_serde).map(|spec: SpecEntry| (spec.name().to_string(), spec)))
        .collect()
}

/// Lazy static init of the embedded spec entries, parsed from the JSON strings at compile time.
static PARSED_EMBEDDED_SPEC_ENTRIES: LazyLock<HashMap<String, SpecEntry>> = LazyLock::new(|| {
    let mut specs = HashMap::new();

    for (filename, file_content) in EMBEDDED_JSON_DATA_FILES_CONTENT {
        let parsed_specs = parse_spec_entries_from_json_string(file_content)
            .unwrap_or_else(|e| panic!("Failed to parse spec entry from file '{filename}': {e}"));

        for spec in parsed_specs.into_values() {
            assert!(
                specs.insert(spec.name().to_string(), spec.clone()).is_none(),
                "Duplicate ingredient spec name found: '{}'",
                spec.name()
            );
        }
    }

    specs
});

/// Retrieves the names of all embedded spec entries as [`Vec<String>`].
pub fn get_all_spec_entry_names() -> Vec<String> {
    PARSED_EMBEDDED_SPEC_ENTRIES
        .values()
        .map(|spec| spec.name().to_string())
        .collect()
}

/// Retrieves all embedded spec entries as [`Vec<SpecEntry>`].
pub fn get_all_spec_entries() -> Vec<SpecEntry> {
    PARSED_EMBEDDED_SPEC_ENTRIES.values().cloned().collect()
}

/// Retrieves an embedded spec entry by its name.
///
/// # Errors
///
/// Returns an [`Error::IngredientNotFound`] if no entry with the specified name exists.
pub fn get_spec_entry_by_name(name: &str) -> Result<SpecEntry> {
    PARSED_EMBEDDED_SPEC_ENTRIES
        .get(name)
        .cloned()
        .ok_or_else(|| Error::IngredientNotFound(name.to_string()))
}

/// Retrieves all embedded independent ingredient specs as [`Vec<IngredientSpec>`].
///
/// This function is similar to [`get_all_spec_entries`] but filters out [`AliasSpec`] and
/// [`CompositeSpec`] entries and extracts the [`IngredientSpec`], returning only "independent"
/// ingredient specs that do not reference other specs, and can therefore be directly converted into
/// [`Composition`]s or [`Ingredient`]s.
pub fn get_all_independent_ingredient_specs() -> Vec<IngredientSpec> {
    PARSED_EMBEDDED_SPEC_ENTRIES
        .values()
        .filter_map(|entry| match entry {
            SpecEntry::Alias(_)
            | SpecEntry::Ingredient(IngredientSpec {
                spec: TaggedSpec::CompositeSpec(_),
                ..
            }) => None,
            SpecEntry::Ingredient(ing_spec) => Some(ing_spec),
        })
        .cloned()
        .collect()
}

/// Retrieves an embedded independent ingredient spec by its name.
///
/// This function is similar to [`get_spec_entry_by_name`] but returns an error if the entry with
/// the specified name is not an independent ingredient spec, i.e not an [`AliasSpec`] or a
/// [`CompositeSpec`], and it extract and returns the [`IngredientSpec`] if it is. This is useful
/// for functions that need to retrieve ingredient specs that can be directly converted into
/// [`Composition`]s or [`Ingredient`]s, and want to enforce that the retrieved spec is independent
/// and does not reference other specs.
///
/// # Errors
///
/// Returns an [`Error::IngredientNotFound`] if no entry with the specified name exists. Returns an
/// [`Error::UnsupportedSpec`] if an entry with the specified name exists but is not independent.
pub fn get_independent_ingredient_spec_by_name(name: &str) -> Result<IngredientSpec> {
    match get_spec_entry_by_name(name)? {
        SpecEntry::Alias(_) => Err(Error::UnsupportedSpec(format!(
            "Spec entry '{name}' is an alias, which is not supported by this function"
        ))),
        SpecEntry::Ingredient(IngredientSpec {
            name,
            spec: TaggedSpec::CompositeSpec(_),
            ..
        }) => Err(Error::UnsupportedSpec(format!(
            "Spec entry '{name}' is a composite, which is not supported by this function"
        ))),
        SpecEntry::Ingredient(ing_spec) => Ok(ing_spec),
    }
}

/// WASM compatible wrappers for [`crate::data`] functions.
#[cfg(all(feature = "wasm", feature = "data"))]
#[cfg_attr(coverage, coverage(off))]
pub mod wasm {
    use serde::ser::Serialize;
    use serde_wasm_bindgen::Serializer;

    use wasm_bindgen::prelude::*;

    use super::{
        get_all_independent_ingredient_specs, get_all_spec_entries, get_independent_ingredient_spec_by_name,
        get_spec_entry_by_name,
    };

    use crate::specs::{IngredientSpec, SpecEntry};

    #[cfg(doc)]
    use crate::error::Error;

    fn serialize_spec_entry(spec: &SpecEntry) -> JsValue {
        spec.serialize(&Serializer::json_compatible())
            .expect("SpecEntry should be serializable to JSON-compatible JS value")
    }

    fn serialize_ingredient_spec(spec: &IngredientSpec) -> JsValue {
        spec.serialize(&Serializer::json_compatible())
            .expect("IngredientSpec should be serializable to JSON-compatible JS value")
    }

    /// WASM compatible wrapper for [`get_all_spec_entries`]
    #[wasm_bindgen(js_name = "get_all_spec_entries")]
    pub fn get_all_spec_entries_wasm() -> Vec<JsValue> {
        get_all_spec_entries().iter().map(serialize_spec_entry).collect()
    }

    /// WASM compatible wrapper for [`get_spec_entry_by_name`]
    ///
    /// # Errors
    ///
    /// Returns an [`Error::IngredientNotFound`] if no ingredient with the specified name exists.
    #[wasm_bindgen(js_name = "get_spec_entry_by_name")]
    pub fn get_spec_entry_by_name_wasm(name: &str) -> Result<JsValue, JsValue> {
        Ok(serialize_spec_entry(&get_spec_entry_by_name(name).map_err::<JsValue, _>(Into::into)?))
    }

    /// WASM compatible wrapper for [`get_all_independent_ingredient_specs`]
    #[wasm_bindgen(js_name = "get_all_independent_ingredient_specs")]
    pub fn get_all_independent_ingredient_specs_wasm() -> Vec<JsValue> {
        get_all_independent_ingredient_specs()
            .iter()
            .map(serialize_ingredient_spec)
            .collect()
    }

    /// WASM compatible wrapper for [`get_independent_ingredient_spec_by_name`]
    ///
    /// # Errors
    ///
    /// Returns an [`Error::IngredientNotFound`] if no ingredient with the specified name exists.
    #[wasm_bindgen(js_name = "get_independent_ingredient_spec_by_name")]
    pub fn get_independent_ingredient_spec_by_name_wasm(name: &str) -> Result<JsValue, JsValue> {
        Ok(serialize_ingredient_spec(
            &get_independent_ingredient_spec_by_name(name).map_err::<JsValue, _>(Into::into)?,
        ))
    }
}

#[cfg(test)]
#[cfg_attr(coverage, coverage(off))]
#[allow(clippy::unwrap_used)]
pub(crate) mod tests {
    use crate::tests::asserts::shadow_asserts::assert_eq;
    use crate::tests::asserts::*;

    use crate::tests::assets::*;

    use super::*;
    use crate::{
        composition::{Composition, ToComposition},
        ingredient::Category,
        specs::{IngredientSpec, TaggedSpec},
    };

    #[test]
    fn parse_spec_entries_from_json_string() {
        for (filename, file_content) in EMBEDDED_JSON_DATA_FILES_CONTENT {
            let specs = super::parse_spec_entries_from_json_string(file_content).unwrap();
            assert_false!(specs.is_empty(), "Failed to parse spec entry from file: {}", filename);
        }
    }

    // --- counts of embedded specs ---
    //
    // These tests are mostly to keep explicit track of the total number of embedded specs.

    const EXPECTED_EMBEDDED_SPEC_COUNT: usize = 94;
    const EXPECTED_EMBEDDED_SPEC_NON_ALIAS_COUNT: usize = 89;
    const EXPECTED_EMBEDDED_SPEC_INDEPENDENT_COUNT: usize = 89;

    #[test]
    fn spec_entry_counts() {
        assert_eq!(PARSED_EMBEDDED_SPEC_ENTRIES.len(), EXPECTED_EMBEDDED_SPEC_COUNT);
        assert_eq!(get_all_spec_entry_names().len(), EXPECTED_EMBEDDED_SPEC_COUNT);
        assert_eq!(super::get_all_spec_entries().len(), EXPECTED_EMBEDDED_SPEC_COUNT);
    }

    #[test]
    fn non_alias_spec_counts() {
        assert_eq!(
            super::get_all_spec_entries()
                .iter()
                .filter(|e| !matches!(e, SpecEntry::Alias(_)))
                .count(),
            EXPECTED_EMBEDDED_SPEC_NON_ALIAS_COUNT
        );
    }

    #[test]
    fn independent_spec_counts() {
        assert_eq!(super::get_all_independent_ingredient_specs().len(), EXPECTED_EMBEDDED_SPEC_INDEPENDENT_COUNT);
    }

    // --- Spec entry functions ---

    #[test]
    fn get_all_spec_entry_names_matches_spec_entries() {
        let names = get_all_spec_entry_names();
        let entries = super::get_all_spec_entries();
        assert_eq!(names.len(), entries.len());
        for entry in entries {
            assert!(names.contains(&entry.name().to_string()));
        }
    }

    #[test]
    fn spec_entry_names_are_unique() {
        let names = get_all_spec_entry_names();
        let unique_names: std::collections::HashSet<_> = names.iter().collect();
        assert_eq!(unique_names.len(), names.len());
    }

    #[test]
    fn get_all_spec_entries() {
        let entries = super::get_all_spec_entries();
        assert_false!(entries.is_empty());

        let whole_milk_entry = entries.iter().find(|e| e.name() == "Whole Milk").unwrap();
        assert!(matches!(whole_milk_entry, SpecEntry::Alias(a) if a.for_name == "3.25% Milk"));

        let milk_3_25_entry = entries.iter().find(|e| e.name() == "3.25% Milk").unwrap();
        assert!(matches!(milk_3_25_entry, SpecEntry::Ingredient(spec) if spec.name == "3.25% Milk"));
    }

    #[test]
    fn get_spec_entry_by_name() {
        let whole_milk_entry = super::get_spec_entry_by_name("Whole Milk").unwrap();
        assert!(matches!(whole_milk_entry, SpecEntry::Alias(a) if a.for_name == "3.25% Milk"));

        let milk_3_25_entry = super::get_spec_entry_by_name("3.25% Milk").unwrap();
        assert!(matches!(milk_3_25_entry, SpecEntry::Ingredient(spec) if spec.name == "3.25% Milk"));

        for spec in super::get_all_spec_entries() {
            let fetched_spec = super::get_spec_entry_by_name(spec.name()).unwrap();
            assert_eq!(fetched_spec, spec);
        }
    }

    #[test]
    fn get_spec_entry_by_name_not_found() {
        let result = super::get_spec_entry_by_name("This Spec Does Not Exist");
        assert!(matches!(result, Err(Error::IngredientNotFound(_))));
    }

    // --- Independent spec entry functions ---

    #[test]
    fn get_all_independent_ingredient_specs() {
        let specs = super::get_all_independent_ingredient_specs();
        assert_false!(specs.is_empty());
        for spec in specs {
            assert_false!(matches!(spec.spec, TaggedSpec::CompositeSpec(_)));
        }
    }

    #[test]
    fn get_independent_ingredient_spec_by_name() {
        let spec = super::get_independent_ingredient_spec_by_name("3.25% Milk").unwrap();
        assert_eq!(spec.name, "3.25% Milk");
        assert_false!(matches!(spec.spec, TaggedSpec::CompositeSpec(_)));
    }

    #[test]
    fn get_independent_ingredient_spec_by_name_not_found() {
        let result = super::get_independent_ingredient_spec_by_name("This Spec Does Not Exist");
        assert!(matches!(result, Err(Error::IngredientNotFound(_))));
    }

    #[test]
    fn get_independent_ingredient_spec_by_name_alias() {
        let result = super::get_independent_ingredient_spec_by_name("Whole Milk");
        assert!(matches!(result, Err(Error::UnsupportedSpec(_))));
    }

    #[test]
    fn get_independent_ingredient_spec_by_name_composite() {
        // @todo
    }

    // --- parse_spec_entries_from_json_string: alias and composite handling ---

    #[test]
    fn parse_spec_entries_includes_alias_entries() {
        let json = r#"[
            {"alias": "Whole Milk", "for": "3.25% Milk"},
            {"alias": "Skim Milk", "for": "0% Milk"}
        ]"#;
        let entries = super::parse_spec_entries_from_json_string(json).unwrap();
        assert_eq!(entries.len(), 2);

        let whole_milk = entries.get("Whole Milk").unwrap();
        assert!(matches!(whole_milk, SpecEntry::Alias(a) if a.for_name == "3.25% Milk"));

        let skim_milk = entries.get("Skim Milk").unwrap();
        assert!(matches!(skim_milk, SpecEntry::Alias(a) if a.for_name == "0% Milk"));
    }

    #[test]
    fn parse_spec_entries_alias_name_method() {
        let json = r#"[{"alias": "Skim Milk", "for": "0% Milk"}]"#;
        let entries = super::parse_spec_entries_from_json_string(json).unwrap();
        let entry = entries.get("Skim Milk").unwrap();
        assert_eq!(entry.name(), "Skim Milk");
        assert!(matches!(entry, SpecEntry::Alias(_)));
    }

    #[test]
    fn parse_spec_entries_includes_composite_entries() {
        let json = format!("[{ING_SPEC_COMPOSITE_MILK_CREAM_50_50_STR}]");
        let entries = super::parse_spec_entries_from_json_string(&json).unwrap();
        assert_eq!(entries.len(), 1);
        let entry = entries.get("Milk-Cream Blend 50-50").unwrap();
        assert!(matches!(
            entry,
            SpecEntry::Ingredient(spec) if matches!(spec.spec, TaggedSpec::CompositeSpec(_))
        ));
    }

    #[test]
    fn parse_spec_entries_mixed_alias_and_composite() {
        use crate::specs::composite::tests::ING_SPEC_COMPOSITE_MILK_CREAM_80_20_STR;
        let json = format!(
            r#"[
                {{"alias": "Whole Milk", "for": "3.25% Milk"}},
                {ING_SPEC_COMPOSITE_MILK_CREAM_80_20_STR}
            ]"#
        );
        let entries = super::parse_spec_entries_from_json_string(&json).unwrap();
        assert_eq!(entries.len(), 2);
        assert!(matches!(entries.get("Whole Milk").unwrap(), SpecEntry::Alias(_)));
        assert!(matches!(entries.get("Milk-Cream Blend 80-20").unwrap(), SpecEntry::Ingredient(_)));
    }

    // --- sweetener ratio sorting ---

    fn sort_and_log_sweeteners_by_ratio(
        _ratio_name: &str,
        get_num: fn(Composition) -> f64,
        get_den: fn(Composition) -> f64,
    ) {
        let mut sweeteners = super::get_all_spec_entries()
            .iter()
            .filter_map(|e| {
                if let SpecEntry::Ingredient(spec) = e
                    && spec.category == Category::Sweetener
                {
                    Some(spec.clone())
                } else {
                    None
                }
            })
            .collect::<Vec<_>>();
        assert_false!(sweeteners.is_empty());

        let get_ratio = |spec: &IngredientSpec| {
            let comp = spec.to_composition().unwrap();
            let num = get_num(comp);
            let den = get_den(comp);

            if num.abs() < f64::EPSILON {
                0.0
            } else if den.abs() < f64::EPSILON {
                f64::INFINITY
            } else {
                num / den
            }
        };

        sweeteners.sort_by(|a, b| {
            get_ratio(b)
                .partial_cmp(&get_ratio(a))
                .unwrap_or(std::cmp::Ordering::Equal)
        });

        // println!("\nSweeteners by {_ratio_name} ratio:");
        for sweetener in sweeteners {
            let _ratio = get_ratio(&sweetener);
            // println!("{:.2}, {}", _ratio, sweetener.name);
        }
    }

    #[test]
    fn sweeteners_by_ratio() {
        sort_and_log_sweeteners_by_ratio("PAC:POD", |comp| comp.pac.total(), |comp| comp.pod);
        sort_and_log_sweeteners_by_ratio("Solids:POD", |comp| comp.solids.total(), |comp| comp.pod);
        sort_and_log_sweeteners_by_ratio("Solids:PAC", |comp| comp.solids.total(), |comp| comp.pac.total());
        sort_and_log_sweeteners_by_ratio(
            "Solids:(POD+PAC)",
            |comp| comp.solids.total(),
            |comp| comp.pod + comp.pac.total(),
        );
    }
}

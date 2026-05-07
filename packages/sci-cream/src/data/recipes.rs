//! Inclusion and access of embedded recipe data
//!
//! If feature `data` is enabled, this module embeds the recipes from `data/recipes/*.json` at
//! compile time and provides functions to retrieve them.

use std::collections::HashMap;
use std::sync::LazyLock;

use serde::{Deserialize, Serialize};

use crate::recipe::OwnedLightRecipe;

/// (filename, file content) tuples for all embedded recipes JSON data files
const EMBEDDED_RECIPES_JSON_DATA_FILES_CONTENT: &[(&str, &str)] =
    &[("underbelly.json", include_str!("../../data/recipes/underbelly.json"))];

/// Struct representing a recipe entry, deserialized from JSON.
#[derive(PartialEq, Serialize, Deserialize, Debug, Clone)]
pub struct RecipeEntry {
    /// The name of the recipe, e.g. "Standard Base"
    pub name: String,
    /// Optional author of the recipe, e.g. "Underbelly"
    pub author: Option<String>,
    /// The recipe data itself, as an [`OwnedLightRecipe`]
    pub recipe: OwnedLightRecipe,
}

impl RecipeEntry {
    /// Generates an ID for the recipe entry, as "Name" or "Author - Name" if an author is present
    ///
    /// This is used as the key for storing the recipe entry in the map of embedded recipes,
    /// reducing name collision risk for common recipe names from different sources.
    #[must_use]
    pub fn gen_id(&self) -> String {
        self.author
            .as_ref()
            .map_or_else(|| self.name.clone(), |author| format!("{}: {}", author, self.name))
    }
}

/// Parses a JSON string of recipe entries into a map of recipe IDs to [`RecipeEntry`]s.
///
/// # Errors
///
/// Returns a [`serde_json::Error`] if the JSON string cannot be parsed into the expected format.
pub fn parse_recipe_entries_from_json_string(
    file_content: &str,
) -> Result<HashMap<String, RecipeEntry>, serde_json::Error> {
    let entries = serde_json::from_str::<Vec<serde_json::Value>>(file_content)?;

    entries
        .into_iter()
        .map(|entry_serde| serde_json::from_value(entry_serde).map(|entry: RecipeEntry| (entry.gen_id(), entry)))
        .collect()
}

/// Lazy static init of the embedded recipe entries, parsed from the JSON strings at init time.
static PARSED_EMBEDDED_RECIPE_ENTRIES: LazyLock<HashMap<String, RecipeEntry>> = LazyLock::new(|| {
    let mut recipes = HashMap::new();

    for (filename, file_content) in EMBEDDED_RECIPES_JSON_DATA_FILES_CONTENT {
        let parsed_recipes = parse_recipe_entries_from_json_string(file_content)
            .unwrap_or_else(|e| panic!("Failed to parse recipe entry from file '{filename}': {e}"));

        for recipe in parsed_recipes.into_values() {
            let key = recipe.gen_id();

            assert!(
                recipes.insert(key.clone(), recipe.clone()).is_none(),
                "Duplicate recipe ID found: '{key}' (from file '{filename}')"
            );
        }
    }

    recipes
});

/// Retrieves the IDs of all embedded recipe entries as [`Vec<String>`].
pub fn get_all_recipe_entry_ids() -> Vec<String> {
    PARSED_EMBEDDED_RECIPE_ENTRIES
        .values()
        .map(RecipeEntry::gen_id)
        .collect()
}

/// Retrieves all embedded recipe entries as [`Vec<RecipeEntry>`].
pub fn get_all_recipe_entries() -> Vec<RecipeEntry> {
    PARSED_EMBEDDED_RECIPE_ENTRIES.values().cloned().collect()
}

#[cfg(test)]
#[cfg_attr(coverage, coverage(off))]
#[allow(clippy::unwrap_used, clippy::float_cmp)]
pub(crate) mod tests {
    use std::sync::LazyLock;

    use crate::tests::asserts::shadow_asserts::assert_eq;
    use crate::tests::asserts::*;

    use super::*;

    static UB_STANDARD_BASE: LazyLock<RecipeEntry> = LazyLock::new(|| RecipeEntry {
        name: "Standard Base".into(),
        author: Some("Underbelly".into()),
        recipe: vec![
            ("Whole Milk".into(), 360.0),
            ("Heavy Cream".into(), 360.0),
            ("Skimmed Milk Powder".into(), 55.0),
            ("Egg Yolk".into(), 36.0),
            ("Sucrose".into(), 70.0),
            ("Dextrose".into(), 25.0),
            ("Invert Syrup".into(), 15.0),
            ("Locust Bean Gum".into(), 0.8),
            ("Guar Gum".into(), 0.4),
            ("Lambda Carrageenan".into(), 0.2),
            ("Salt".into(), 0.7),
        ],
    });

    fn find_entry(name: &str, author: Option<&str>) -> Option<RecipeEntry> {
        get_all_recipe_entries()
            .into_iter()
            .find(|e| e.name == name && e.author.as_deref() == author)
    }

    // --- counts of embedded recipes ---
    //
    // This test is mostly to keep explicit track of the total number of embedded recipes.

    const EXPECTED_EMBEDDED_RECIPE_COUNT: usize = 3;

    #[test]
    fn recipe_entry_counts() {
        assert_eq!(PARSED_EMBEDDED_RECIPE_ENTRIES.len(), EXPECTED_EMBEDDED_RECIPE_COUNT);
        assert_eq!(get_all_recipe_entry_ids().len(), EXPECTED_EMBEDDED_RECIPE_COUNT);
        assert_eq!(get_all_recipe_entries().len(), EXPECTED_EMBEDDED_RECIPE_COUNT);
    }

    // --- gen_id ---

    #[test]
    fn gen_id_with_author() {
        let entry = RecipeEntry {
            name: "Standard Base".into(),
            author: Some("Underbelly".into()),
            recipe: vec![],
        };
        assert_eq!(entry.gen_id(), "Underbelly: Standard Base");
    }

    #[test]
    fn gen_id_without_author() {
        let entry = RecipeEntry {
            name: "Standard Base".into(),
            author: None,
            recipe: vec![],
        };
        assert_eq!(entry.gen_id(), "Standard Base");
    }

    // --- parse_recipe_entries_from_json_string ---

    #[test]
    fn parse_valid_json_with_author() {
        let json = r#"[{"name":"Test Recipe","author":"Author","recipe":[["Whole Milk",100.0],["Sucrose",50.0]]}]"#;

        let result = parse_recipe_entries_from_json_string(json).unwrap();
        assert_eq!(result.len(), 1);

        let entry = result.get("Author: Test Recipe").unwrap();
        assert_eq!(entry.name, "Test Recipe");
        assert_eq!(entry.author.as_deref(), Some("Author"));
        assert_eq!(entry.recipe.len(), 2);
        assert_eq!(entry.recipe[0], ("Whole Milk".to_string(), 100.0));
        assert_eq!(entry.recipe[1], ("Sucrose".to_string(), 50.0));
    }

    #[test]
    fn parse_valid_json_without_author() {
        let json = r#"[{"name":"Test Recipe","recipe":[["Whole Milk",100.0]]}]"#;

        let result = parse_recipe_entries_from_json_string(json).unwrap();
        assert_eq!(result.len(), 1);

        let entry = result.get("Test Recipe").unwrap();
        assert_eq!(entry.name, "Test Recipe");
        assert_eq!(entry.author, None);
    }

    #[test]
    fn parse_invalid_json_returns_error() {
        assert_true!(parse_recipe_entries_from_json_string("not valid json").is_err());
    }

    // --- get_all_recipe_entry_ids ---

    #[test]
    fn get_all_recipe_entry_ids_contains_expected() {
        let ids = get_all_recipe_entry_ids();

        assert_ge!(ids.len(), 3);
        assert_true!(ids.contains(&"Underbelly: Standard Base".to_string()));
        assert_true!(ids.contains(&"Underbelly: French Variation".to_string()));
        assert_true!(ids.contains(&"Underbelly: Light Variation".to_string()));
    }

    // --- verify real assets ---

    #[test]
    fn underbelly_standard_base_matches_asset() {
        let entry = find_entry("Standard Base", Some("Underbelly")).unwrap();
        assert_eq!(&*UB_STANDARD_BASE, &entry);
    }
}

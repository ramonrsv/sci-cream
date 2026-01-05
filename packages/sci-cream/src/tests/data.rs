use std::collections::HashMap;
use std::sync::LazyLock;

use crate::specs::IngredientSpec;

pub(crate) fn read_ingredients_file_as_string(filename: &str) -> Result<String, std::io::Error> {
    std::fs::read_to_string(format!("./data/ingredients/{filename}"))
}

pub(crate) fn parse_ingredient_specs_from_string(
    file_content: &str,
) -> Result<HashMap<String, IngredientSpec>, serde_json::Error> {
    let specs = serde_json::from_str::<Vec<serde_json::Value>>(file_content)?;

    specs
        .into_iter()
        .map(|spec_serde| serde_json::from_value(spec_serde).map(|spec: IngredientSpec| (spec.name.clone(), spec)))
        .collect()
}

pub(crate) const INGREDIENT_JSON_FILENAMES: &[&str] = &[
    "dairy.json",
    "sweeteners.json",
    "fruits.json",
    "chocolates.json",
    "nuts.json",
    "eggs.json",
    "alcohol.json",
    "micros.json",
    "miscellaneous.json",
];

pub(crate) fn get_ingredient_spec_by_name(name: &str) -> Option<IngredientSpec> {
    static ALL_INGREDIENT_SPECS: LazyLock<HashMap<String, IngredientSpec>> = LazyLock::new(|| {
        let mut specs = HashMap::new();
        for filename in INGREDIENT_JSON_FILENAMES {
            let file_content = read_ingredients_file_as_string(filename)
                .unwrap_or_else(|e| panic!("Failed to read file '{filename}': {e}"));

            specs.extend(
                parse_ingredient_specs_from_string(&file_content)
                    .unwrap_or_else(|e| panic!("Failed to parse ingredient specs from file '{filename}': {e}")),
            );
        }
        specs
    });

    ALL_INGREDIENT_SPECS.get(name).cloned()
}

pub(crate) fn get_ingredient_spec_by_name_or_panic(name: &str) -> IngredientSpec {
    get_ingredient_spec_by_name(name).unwrap_or_else(|| panic!("Ingredient spec not found for '{name}'"))
}

#[cfg(test)]
pub(crate) mod tests {
    use crate::tests::asserts::*;

    use super::*;

    #[test]
    fn parse_ingredient_specs() {
        for filename in INGREDIENT_JSON_FILENAMES {
            let file_content = read_ingredients_file_as_string(filename).unwrap();
            let specs = parse_ingredient_specs_from_string(&file_content).unwrap();
            assert_false!(specs.is_empty(), "Failed to parse ingredient specs from file: {}", filename);
        }
    }
}

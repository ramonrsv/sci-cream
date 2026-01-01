use std::collections::HashMap;
use std::sync::LazyLock;

use crate::specs::IngredientSpec;

pub(crate) fn read_ingredients_file_as_string(filename: &str) -> String {
    std::fs::read_to_string(format!("./data/ingredients/{filename}")).unwrap()
}

pub(crate) fn parse_ingredient_specs_from_file(filename: &str) -> HashMap<String, IngredientSpec> {
    let specs = serde_json::from_str::<Vec<serde_json::Value>>(&read_ingredients_file_as_string(filename)).unwrap();

    specs
        .into_iter()
        .map(|spec| serde_json::from_value(spec).unwrap())
        .map(|spec: IngredientSpec| (spec.name.clone(), spec))
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
            specs.extend(parse_ingredient_specs_from_file(filename));
        }
        specs
    });

    ALL_INGREDIENT_SPECS.get(name).cloned()
}

pub(crate) fn get_ingredient_spec_by_name_or_panic(name: &str) -> IngredientSpec {
    get_ingredient_spec_by_name(name).unwrap_or_else(|| panic!("Ingredient spec not found for '{name}'"))
}

#[cfg(test)]
pub(crate) mod test {
    use crate::tests::asserts::*;

    use super::*;

    #[test]
    fn parse_ingredient_specs() {
        for filename in INGREDIENT_JSON_FILENAMES {
            let specs = parse_ingredient_specs_from_file(filename);
            assert_false!(specs.is_empty(), "Failed to parse ingredient specs from file: {}", filename);
        }
    }
}

#[cfg(test)]
pub(crate) mod test {
    use std::collections::HashMap;

    use crate::specs::IngredientSpec;

    use crate::tests::asserts::*;

    fn read_ingredients_file_as_string(filename: &str) -> String {
        std::fs::read_to_string(format!("../../data/ingredients/{filename}")).unwrap()
    }

    fn parse_ingredient_specs_from_file(filename: &str) -> HashMap<String, IngredientSpec> {
        let specs = serde_json::from_str::<Vec<serde_json::Value>>(
            &read_ingredients_file_as_string(filename),
        )
        .unwrap();

        specs
            .into_iter()
            .map(|spec| serde_json::from_value(spec).unwrap())
            .map(|spec: IngredientSpec| (spec.name.clone(), spec))
            .collect()
    }

    #[test]
    fn parse_ingredient_specs_dairy() {
        let specs = parse_ingredient_specs_from_file("dairy.json");
        assert_false!(specs.is_empty());
    }

    #[test]
    fn parse_ingredient_specs_sweeteners() {
        let specs = parse_ingredient_specs_from_file("sweeteners.json");
        assert_false!(specs.is_empty());
    }
}

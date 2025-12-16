#[cfg(test)]
pub(crate) mod test {
    use crate::specs::IngredientSpec;

    fn read_ingredients_file_as_string(filename: &str) -> String {
        std::fs::read_to_string(format!("../../data/ingredients/{filename}")).unwrap()
    }

    fn parse_ingredient_specs_from_file(filename: &str) -> Vec<IngredientSpec> {
        let specs = serde_json::from_str::<Vec<serde_json::Value>>(
            &read_ingredients_file_as_string(filename),
        )
        .unwrap();

        specs
            .into_iter()
            .map(|spec| serde_json::from_value(spec).unwrap())
            .collect()
    }

    #[test]
    fn parse_dairy_ingredient_specs() {
        let _unused = parse_ingredient_specs_from_file("dairy.json");
    }

    #[test]
    fn parse_sweeteners_ingredient_specs() {
        let _unused = parse_ingredient_specs_from_file("sweeteners.json");
    }
}

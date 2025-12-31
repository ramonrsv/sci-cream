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

pub(crate) fn get_ingredient_spec_by_name(name: &str) -> Option<IngredientSpec> {
    static ALL_INGREDIENT_SPECS: LazyLock<HashMap<String, IngredientSpec>> = LazyLock::new(|| {
        let mut specs = HashMap::new();
        for filename in &[
            "dairy.json",
            "sweeteners.json",
            "fruits.json",
            "chocolates.json",
            "eggs.json",
            "micros.json",
            "miscellaneous.json",
        ] {
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
    use crate::tests::asserts::shadow_asserts::assert_eq;
    use crate::tests::asserts::*;

    use super::*;
    use crate::tests::assets::*;

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

    #[test]
    fn parse_ingredient_specs_fruits() {
        let specs = parse_ingredient_specs_from_file("fruits.json");
        assert_false!(specs.is_empty());
    }

    #[test]
    fn parse_ingredient_specs_chocolates() {
        let specs = parse_ingredient_specs_from_file("chocolates.json");
        assert_false!(specs.is_empty());
    }

    #[test]
    fn parse_ingredient_specs_eggs() {
        let specs = parse_ingredient_specs_from_file("eggs.json");
        assert_false!(specs.is_empty());
    }

    #[test]
    fn parse_ingredient_specs_micros() {
        let specs = parse_ingredient_specs_from_file("micros.json");
        assert_false!(specs.is_empty());
    }

    #[test]
    fn parse_ingredient_specs_miscellaneous() {
        let specs = parse_ingredient_specs_from_file("miscellaneous.json");
        assert_false!(specs.is_empty());
    }

    #[test]
    fn get_ingredient_spec_by_name_existing() {
        for name in &["2% Milk", "Sucrose", "Dextrose", "Fructose"] {
            let spec = get_ingredient_spec_by_name(name);
            assert_true!(spec.is_some());
            assert_eq!(spec.unwrap().name, *name);
        }
    }

    #[test]
    fn ingredient_spec_from_file_matches_asset() {
        for (name, asset_spec) in [
            ("2% Milk", ING_SPEC_MILK_2_PERCENT.clone()),
            ("Sucrose", ING_SPEC_SUCROSE.clone()),
            ("Dextrose", ING_SPEC_DEXTROSE.clone()),
            ("Fructose", ING_SPEC_FRUCTOSE.clone()),
            ("Invert Sugar", ING_SPEC_INVERT_SUGAR.clone()),
            ("Honey", ING_SPEC_HONEY.clone()),
            ("HFCS 42", ING_SPEC_HFCS42.clone()),
        ] {
            assert_eq!(get_ingredient_spec_by_name_or_panic(name), asset_spec);
        }
    }
}

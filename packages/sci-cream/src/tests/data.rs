use std::collections::HashMap;
use std::sync::LazyLock;

use strum::IntoEnumIterator;

use crate::{ingredient::Category, specs::IngredientSpec};

const INGREDIENT_JSON_FILENAMES: &[&str] = &[
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

static ALL_INGREDIENT_SPECS: LazyLock<HashMap<String, IngredientSpec>> = LazyLock::new(|| {
    let mut specs = HashMap::new();

    for filename in INGREDIENT_JSON_FILENAMES {
        let file_content = read_ingredients_file_as_string(filename)
            .unwrap_or_else(|e| panic!("Failed to read file '{filename}': {e}"));

        let parsed_specs = parse_ingredient_specs_from_string(&file_content)
            .unwrap_or_else(|e| panic!("Failed to parse ingredient specs from file '{filename}': {e}"));

        for spec in parsed_specs.into_values() {
            assert!(
                specs.insert(spec.name.clone(), spec.clone()).is_none(),
                "Duplicate ingredient spec name found: '{}'",
                spec.name
            );
        }
    }

    specs
});

fn read_ingredients_file_as_string(filename: &str) -> Result<String, std::io::Error> {
    std::fs::read_to_string(format!("./data/ingredients/{filename}"))
}

fn parse_ingredient_specs_from_string(
    file_content: &str,
) -> Result<HashMap<String, IngredientSpec>, serde_json::Error> {
    let specs = serde_json::from_str::<Vec<serde_json::Value>>(file_content)?;

    specs
        .into_iter()
        .map(|spec_serde| serde_json::from_value(spec_serde).map(|spec: IngredientSpec| (spec.name.clone(), spec)))
        .collect()
}

pub(crate) fn get_all_ingredient_specs() -> Vec<IngredientSpec> {
    ALL_INGREDIENT_SPECS.values().cloned().collect()
}

pub(crate) fn get_ingredient_specs_by_category(category: Category) -> Vec<IngredientSpec> {
    ALL_INGREDIENT_SPECS
        .values()
        .filter(|spec| spec.category == category)
        .cloned()
        .collect()
}

pub(crate) fn get_ingredient_spec_by_name(name: &str) -> Option<IngredientSpec> {
    ALL_INGREDIENT_SPECS.get(name).cloned()
}

pub(crate) fn get_ingredient_spec_by_name_or_panic(name: &str) -> IngredientSpec {
    get_ingredient_spec_by_name(name).unwrap_or_else(|| panic!("Ingredient spec not found for '{name}'"))
}

#[cfg(test)]
#[cfg_attr(coverage, coverage(off))]
#[allow(clippy::unwrap_used)]
pub(crate) mod tests {
    use crate::tests::asserts::shadow_asserts::assert_eq;
    use crate::tests::asserts::*;

    use super::*;
    use crate::composition::{Composition, IntoComposition};

    #[test]
    fn parse_ingredient_specs() {
        for filename in INGREDIENT_JSON_FILENAMES {
            let file_content = read_ingredients_file_as_string(filename).unwrap();
            let specs = parse_ingredient_specs_from_string(&file_content).unwrap();
            assert_false!(specs.is_empty(), "Failed to parse ingredient specs from file: {}", filename);
        }
    }

    #[test]
    fn get_all_ingredient_specs() {
        let specs = super::get_all_ingredient_specs();
        let original_len = specs.len();
        assert_ge!(original_len, 88);
        assert_eq!(original_len, ALL_INGREDIENT_SPECS.len());

        let unique_names: std::collections::HashSet<_> = specs.iter().map(|spec| &spec.name).collect();
        assert_eq!(unique_names.len(), original_len);
    }

    #[test]
    fn get_ingredient_specs_by_category() {
        let categories = Category::iter().collect::<Vec<_>>();
        assert_false!(categories.is_empty());

        let mut total_specs_count = 0;

        for category in categories {
            let specs = super::get_ingredient_specs_by_category(category);
            assert_false!(specs.is_empty(), "No ingredient specs found for category: {:?}", category);
            total_specs_count += specs.len();

            for spec in specs {
                assert_eq!(spec.category, category);
            }
        }

        assert_eq!(total_specs_count, ALL_INGREDIENT_SPECS.len());
    }

    #[test]
    fn get_ingredient_spec_by_name() {
        for spec in super::get_all_ingredient_specs() {
            let fetched_spec = super::get_ingredient_spec_by_name(&spec.name).unwrap();
            assert_eq!(fetched_spec, spec);
        }
    }

    fn sweeteners_by_ratio(_ratio_name: &str, get_num: fn(Composition) -> f64, get_den: fn(Composition) -> f64) {
        let mut sweeteners = super::get_ingredient_specs_by_category(Category::Sweetener);
        assert_false!(sweeteners.is_empty());

        let get_ratio = |spec: &IngredientSpec| {
            let comp = spec.clone().into_composition().unwrap();
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
    fn sweeteners_pac_pod_ratio() {
        sweeteners_by_ratio("PAC:POD", |comp| comp.pac.total(), |comp| comp.pod);
    }

    #[test]
    fn sweeteners_solids_pod_ratio() {
        sweeteners_by_ratio("Solids:POD", |comp| comp.solids.total(), |comp| comp.pod);
    }

    #[test]
    fn sweeteners_solids_pac_ratio() {
        sweeteners_by_ratio("Solids:PAC", |comp| comp.solids.total(), |comp| comp.pac.total());
    }

    #[test]
    fn sweeteners_solids_pod_pac_ratio() {
        sweeteners_by_ratio("Solids:(POD+PAC)", |comp| comp.solids.total(), |comp| comp.pod + comp.pac.total());
    }
}

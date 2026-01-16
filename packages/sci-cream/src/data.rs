use std::collections::HashMap;
use std::sync::LazyLock;

use crate::{
    error::{Error, Result},
    ingredient::Category,
    specs::IngredientSpec,
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

pub fn parse_ingredient_specs_from_string(
    file_content: &str,
) -> std::result::Result<HashMap<String, IngredientSpec>, serde_json::Error> {
    let specs = serde_json::from_str::<Vec<serde_json::Value>>(file_content)?;

    specs
        .into_iter()
        .map(|spec_serde| serde_json::from_value(spec_serde).map(|spec: IngredientSpec| (spec.name.clone(), spec)))
        .collect()
}

static PARSED_EMBEDDED_INGREDIENT_SPECS: LazyLock<HashMap<String, IngredientSpec>> = LazyLock::new(|| {
    let mut specs = HashMap::new();

    for (filename, file_content) in EMBEDDED_JSON_DATA_FILES_CONTENT {
        let parsed_specs = parse_ingredient_specs_from_string(file_content)
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

pub fn get_all_ingredient_specs() -> Vec<IngredientSpec> {
    PARSED_EMBEDDED_INGREDIENT_SPECS.values().cloned().collect()
}

pub fn get_ingredient_specs_by_category(category: Category) -> Vec<IngredientSpec> {
    PARSED_EMBEDDED_INGREDIENT_SPECS
        .values()
        .filter(|spec| spec.category == category)
        .cloned()
        .collect()
}

pub fn get_ingredient_spec_by_name(name: &str) -> Result<IngredientSpec> {
    PARSED_EMBEDDED_INGREDIENT_SPECS
        .get(name)
        .cloned()
        .ok_or_else(|| Error::IngredientNotFound(name.to_string()))
}

#[cfg(all(feature = "wasm", feature = "data"))]
#[cfg_attr(coverage, coverage(off))]
pub mod wasm {
    use serde::ser::Serialize;
    use serde_wasm_bindgen::Serializer;

    use wasm_bindgen::prelude::*;

    use super::{get_all_ingredient_specs, get_ingredient_spec_by_name, get_ingredient_specs_by_category};

    use crate::{ingredient::Category, specs::IngredientSpec};

    fn serialize_spec(spec: &IngredientSpec) -> Result<JsValue, JsValue> {
        spec.serialize(&Serializer::json_compatible()).map_err(Into::into)
    }

    #[wasm_bindgen(js_name = "get_all_ingredient_specs")]
    pub fn get_all_ingredient_specs_wasm() -> Result<Vec<JsValue>, JsValue> {
        get_all_ingredient_specs().iter().map(serialize_spec).collect()
    }

    #[wasm_bindgen(js_name = "get_ingredient_specs_by_category")]
    pub fn get_ingredient_specs_by_category_wasm(category: Category) -> Result<Vec<JsValue>, JsValue> {
        get_ingredient_specs_by_category(category)
            .iter()
            .map(serialize_spec)
            .collect()
    }

    #[wasm_bindgen(js_name = "get_ingredient_spec_by_name")]
    pub fn get_ingredient_spec_by_name_wasm(name: &str) -> Result<JsValue, JsValue> {
        serialize_spec(&get_ingredient_spec_by_name(name).map_err::<JsValue, _>(Into::into)?)
    }
}

#[cfg(test)]
#[cfg_attr(coverage, coverage(off))]
#[allow(clippy::unwrap_used)]
pub(crate) mod tests {
    use strum::IntoEnumIterator;

    use crate::tests::asserts::shadow_asserts::assert_eq;
    use crate::tests::asserts::*;

    use super::*;
    use crate::composition::{Composition, IntoComposition};

    #[test]
    fn parse_ingredient_specs() {
        for (filename, file_content) in EMBEDDED_JSON_DATA_FILES_CONTENT {
            let specs = parse_ingredient_specs_from_string(file_content).unwrap();
            assert_false!(specs.is_empty(), "Failed to parse ingredient specs from file: {}", filename);
        }
    }

    #[test]
    fn get_all_ingredient_specs() {
        let specs = super::get_all_ingredient_specs();
        let original_len = specs.len();
        assert_ge!(original_len, 88);
        assert_eq!(original_len, PARSED_EMBEDDED_INGREDIENT_SPECS.len());

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

        assert_eq!(total_specs_count, PARSED_EMBEDDED_INGREDIENT_SPECS.len());
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

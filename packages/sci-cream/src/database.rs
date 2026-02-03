use std::collections::HashMap;
use std::sync::{RwLock, RwLockReadGuard, RwLockWriteGuard};

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

use crate::{
    error::{Error, Result},
    ingredient::{Category, Ingredient},
    specs::IngredientSpec,
};

#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Debug)]
pub struct IngredientDatabase {
    map: RwLock<HashMap<String, Ingredient>>,
}

/// Provides an in-memory database for looking up ingredient definitions by name
///
/// Since ingredient objects are lightweight, in most use cases keeping many or all of them in
/// memory should not be an issue. Holding them in this [`IngredientDatabase`] greatly simplifies
/// the setup and process of looking up ingredient definitions, obviating the need for lookups from
/// an external database. It should also provide performance improvements.
///
/// Lastly, and the primary motivation behind this class, it's supported in WASM, where it can
/// provide significant performance improvements if ingredient lookup is done on the WASM side,
/// compared to managing ingredient definitions and lookup on the JS side and bridging them to WASM
/// when requesting operations; JS <-> WASM bridging is very slow, so it's almost always more
/// performant to keep as much as possible on the WASM side. It's still possible to seed the
/// database from the JS side, then subsequent looks can be done within WASM.
impl IngredientDatabase {
    #[must_use]
    pub fn new_seeded(ingredients: &[Ingredient]) -> Self {
        let mut map = HashMap::new();
        for ingredient in ingredients {
            // @todo Consider error handling for duplicate names
            let _unused = map.insert(ingredient.name.clone(), ingredient.clone());
        }

        Self { map: RwLock::new(map) }
    }

    fn specs_into_ingredients(specs: &[IngredientSpec]) -> Result<Vec<Ingredient>> {
        specs
            .iter()
            .map(|spec| spec.clone().into_ingredient())
            .collect::<Result<_>>()
    }

    pub fn new_seeded_from_specs(specs: &[IngredientSpec]) -> Result<Self> {
        Ok(Self::new_seeded(&Self::specs_into_ingredients(specs)?))
    }

    #[cfg(feature = "data")]
    pub fn new_seeded_from_embedded_data() -> Result<Self> {
        Self::new_seeded_from_specs(&crate::data::get_all_ingredient_specs())
    }

    fn acquire_read_lock(&self) -> RwLockReadGuard<'_, HashMap<String, Ingredient>> {
        self.map
            .read()
            .expect("Failed to acquire read lock on ingredient database")
    }

    fn acquire_write_lock(&self) -> RwLockWriteGuard<'_, HashMap<String, Ingredient>> {
        self.map
            .write()
            .expect("Failed to acquire write lock on ingredient database")
    }

    pub fn seed(&self, ingredients: &[Ingredient]) {
        let mut db = self.acquire_write_lock();
        for ingredient in ingredients {
            let _unused = db.insert(ingredient.name.clone(), ingredient.clone());
        }
    }

    pub fn seed_from_specs(&self, specs: &[IngredientSpec]) -> Result<()> {
        self.seed(&Self::specs_into_ingredients(specs)?);
        Ok(())
    }

    pub fn get_ingredient_by_name(&self, name: &str) -> Result<Ingredient> {
        self.acquire_read_lock()
            .get(name)
            .cloned()
            .ok_or_else(|| Error::IngredientNotFound(name.to_string()))
    }
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
impl IngredientDatabase {
    #[cfg_attr(feature = "wasm", wasm_bindgen(constructor))]
    #[must_use]
    pub fn new() -> Self {
        Self {
            map: RwLock::new(HashMap::new()),
        }
    }

    pub fn get_all_ingredients(&self) -> Vec<Ingredient> {
        self.acquire_read_lock().values().cloned().collect()
    }

    pub fn get_ingredients_by_category(&self, category: Category) -> Vec<Ingredient> {
        self.acquire_read_lock()
            .values()
            .filter(|ingredient| ingredient.category == category)
            .cloned()
            .collect()
    }
}

impl Default for IngredientDatabase {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(feature = "wasm")]
#[cfg_attr(coverage, coverage(off))]
pub mod wasm {
    use wasm_bindgen::prelude::*;

    use super::IngredientDatabase;

    use crate::{ingredient::Ingredient, specs::IngredientSpec};

    fn specs_from_jsvalues(specs: &[JsValue]) -> Result<Vec<IngredientSpec>, JsValue> {
        specs
            .iter()
            .map(|spec| serde_wasm_bindgen::from_value::<IngredientSpec>(spec.clone()).map_err(Into::into))
            .collect::<Result<_, JsValue>>()
    }

    #[wasm_bindgen]
    impl IngredientDatabase {
        #[wasm_bindgen(js_name = "seed")]
        #[allow(clippy::needless_pass_by_value)]
        pub fn seed_wasm(&self, ingredients: Box<[Ingredient]>) {
            self.seed(&ingredients);
        }

        #[wasm_bindgen(js_name = "seed_from_specs")]
        #[allow(clippy::needless_pass_by_value)]
        pub fn seed_from_specs_wasm(&self, specs: Box<[JsValue]>) -> Result<(), JsValue> {
            self.seed_from_specs(&specs_from_jsvalues(&specs)?).map_err(Into::into)
        }

        #[wasm_bindgen(js_name = "get_ingredient_by_name")]
        pub fn get_ingredient_by_name_wasm(&self, name: &str) -> Result<Ingredient, JsValue> {
            self.get_ingredient_by_name(name).map_err(Into::into)
        }
    }

    #[wasm_bindgen]
    #[allow(clippy::needless_pass_by_value)]
    #[must_use]
    pub fn new_ingredient_database_seeded(ingredients: Box<[Ingredient]>) -> IngredientDatabase {
        IngredientDatabase::new_seeded(&ingredients)
    }

    #[wasm_bindgen]
    #[allow(clippy::needless_pass_by_value)]
    pub fn new_ingredient_database_seeded_from_specs(specs: Box<[JsValue]>) -> Result<IngredientDatabase, JsValue> {
        IngredientDatabase::new_seeded_from_specs(&specs_from_jsvalues(&specs)?).map_err(Into::into)
    }

    #[cfg(feature = "data")]
    #[wasm_bindgen]
    pub fn new_ingredient_database_seeded_from_embedded_data() -> Result<IngredientDatabase, JsValue> {
        IngredientDatabase::new_seeded_from_embedded_data().map_err(Into::into)
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
    use crate::data::get_all_ingredient_specs;

    #[test]
    fn ingredient_database_empty() {
        let db = IngredientDatabase::new();
        assert_eq!(db.get_all_ingredients().len(), 0);
    }

    #[test]
    fn ingredient_database_new_seeded() {
        let db = IngredientDatabase::new_seeded(
            &get_all_ingredient_specs()
                .iter()
                .map(|spec| spec.clone().into_ingredient().unwrap())
                .collect::<Vec<Ingredient>>(),
        );

        assert_eq!(db.get_all_ingredients().len(), get_all_ingredient_specs().len());

        for spec in get_all_ingredient_specs() {
            let ingredient = db.get_ingredient_by_name(&spec.name).unwrap();
            assert_eq!(ingredient, spec.into_ingredient().unwrap());
        }
    }

    #[test]
    fn ingredient_database_new_seeded_from_specs() {
        let db = IngredientDatabase::new_seeded_from_specs(&get_all_ingredient_specs()).unwrap();

        assert_eq!(db.get_all_ingredients().len(), get_all_ingredient_specs().len());

        for spec in get_all_ingredient_specs() {
            let ingredient = db.get_ingredient_by_name(&spec.name).unwrap();
            assert_eq!(ingredient, spec.into_ingredient().unwrap());
        }
    }

    #[test]
    fn ingredient_database_seed() {
        let db = IngredientDatabase::new();
        assert_eq!(db.get_all_ingredients().len(), 0);

        let ingredients = get_all_ingredient_specs()[..10]
            .iter()
            .map(|spec| spec.clone().into_ingredient().unwrap())
            .collect::<Vec<Ingredient>>();

        db.seed(&ingredients);
        assert_eq!(db.get_all_ingredients().len(), 10);

        for ingredient in ingredients {
            let fetched_ingredient = db.get_ingredient_by_name(&ingredient.name).unwrap();
            assert_eq!(fetched_ingredient, ingredient);
        }
    }

    #[test]
    fn ingredient_database_seed_from_specs() {
        let db = IngredientDatabase::new();
        assert_eq!(db.get_all_ingredients().len(), 0);

        let specs = get_all_ingredient_specs()[..10].to_vec();

        db.seed_from_specs(&specs).unwrap();
        assert_eq!(db.get_all_ingredients().len(), 10);

        for spec in specs {
            let fetched_ingredient = db.get_ingredient_by_name(&spec.name).unwrap();
            let ingredient = spec.into_ingredient().unwrap();
            assert_eq!(fetched_ingredient, ingredient);
        }
    }

    #[test]
    fn ingredient_database_seeded_from_embedded_data() {
        let db = IngredientDatabase::new_seeded_from_embedded_data().unwrap();

        assert_eq!(db.get_all_ingredients().len(), get_all_ingredient_specs().len());

        for spec in get_all_ingredient_specs() {
            let ingredient = db.get_ingredient_by_name(&spec.name).unwrap();
            assert_eq!(ingredient, spec.into_ingredient().unwrap());
        }
    }

    #[test]
    fn ingredient_database_get_ingredients_by_category() {
        let db = IngredientDatabase::new_seeded_from_specs(&get_all_ingredient_specs()).unwrap();

        for category in Category::iter() {
            let ingredients = db.get_ingredients_by_category(category);
            assert_false!(ingredients.is_empty());

            for ingredient in ingredients {
                assert_eq!(ingredient.category, category);
            }
        }
    }

    #[test]
    fn ingredient_database_get_ingredient_by_name_not_found() {
        let db = IngredientDatabase::new();
        let result = db.get_ingredient_by_name("non_existent_ingredient");
        assert!(matches!(result, Err(Error::IngredientNotFound(_))));
    }

    #[test]
    fn ingredient_database_thread_safety() {
        use std::sync::Arc;
        use std::thread;

        let db = Arc::new(IngredientDatabase::new_seeded_from_specs(&get_all_ingredient_specs()).unwrap());

        let mut handles = vec![];

        for _ in 0..10 {
            let db_clone = Arc::clone(&db);
            let handle = thread::spawn(move || {
                for spec in get_all_ingredient_specs() {
                    let ingredient = db_clone.get_ingredient_by_name(&spec.name).unwrap();
                    assert_eq!(ingredient, spec.into_ingredient().unwrap());
                }
            });
            handles.push(handle);
        }

        for handle in handles {
            handle.join().unwrap();
        }
    }
}

//! In-memory database for ingredient definition lookups
//!
//! If feature `database` is enabled, this module provides [`IngredientDatabase`], an in-memory
//! database, with WASM support, for looking up [`Ingredient`] definitions. [`IngredientDatabase`]
//! objects can be seeded from [`Ingredient`]s and ingredient specifications, including those
//! embedded via the `data` feature; see [`crate::data`] for more information.

use std::collections::HashMap;
use std::sync::{RwLock, RwLockReadGuard, RwLockWriteGuard};

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

use crate::{
    error::{Error, Result},
    ingredient::ResolveIntoIngredient,
    ingredient::{Category, Ingredient, IntoIngredient},
    resolution::IngredientGetter,
    specs::{SpecEntry, TaggedSpec},
};

#[cfg(doc)]
use crate::{
    composition::Composition,
    specs::{AliasSpec, CompositeSpec},
};

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
#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Debug)]
pub struct IngredientDatabase {
    map: RwLock<HashMap<String, Ingredient>>,
}

type ReadLock<'a> = RwLockReadGuard<'a, HashMap<String, Ingredient>>;
type WriteLock<'a> = RwLockWriteGuard<'a, HashMap<String, Ingredient>>;

impl IngredientDatabase {
    /// Creates a new, empty [`IngredientDatabase`].
    #[must_use]
    pub fn new() -> Self {
        Self {
            map: RwLock::new(HashMap::new()),
        }
    }

    fn acquire_read_lock(&self) -> ReadLock<'_> {
        self.map
            .read()
            .expect("Read lock on the ingredient database should be acquired successfully")
    }

    fn acquire_write_lock(&self) -> WriteLock<'_> {
        self.map
            .write()
            .expect("Write lock on the ingredient database should be acquired successfully")
    }

    /// Checks if the database contains an [`Ingredient`] with the specified name.
    pub fn has_ingredient(&self, name: &str) -> bool {
        self.acquire_read_lock().contains_key(name)
    }

    /// Retrieves all [`Ingredient`]s in the database.
    pub fn get_all_ingredients(&self) -> Vec<Ingredient> {
        self.acquire_read_lock().values().cloned().collect()
    }

    /// Retrieves [`Ingredient`]s filtered by the specified [`Category`].
    pub fn get_ingredients_by_category(&self, category: Category) -> Vec<Ingredient> {
        self.acquire_read_lock()
            .values()
            .filter(|ingredient| ingredient.category == category)
            .cloned()
            .collect()
    }

    /// Seeds a single [`Ingredient`] into the database, using a passed write lock, ensuring the
    /// ingredient name is unique across the database.
    ///
    /// # Errors
    ///
    /// Returns an [`Error::IngredientNameNotUnique`] if the name is already present in the database.
    fn seed_unique_ingredient(write_lock: &mut WriteLock<'_>, ingredient: Ingredient) -> Result<()> {
        if write_lock.contains_key(&ingredient.name) {
            return Err(Error::IngredientNameNotUnique(ingredient.name));
        }

        let _unused = write_lock.insert(ingredient.name.clone(), ingredient);
        Ok(())
    }

    /// Seeds the database with the provided [`Ingredient`]s.
    ///
    /// # Errors
    ///
    /// Returns an [`Error::IngredientNameNotUnique`] if any of the provided ingredients have a name
    /// that is not unique across the provided list and the ingredients already in the database.
    pub fn seed(&self, ingredients: &[Ingredient]) -> Result<()> {
        let mut db = self.acquire_write_lock();

        for ingredient in ingredients {
            Self::seed_unique_ingredient(&mut db, ingredient.clone())?;
        }

        Ok(())
    }

    /// Seeds the database with the provided [`SpecEntry`]s.
    ///
    /// [`AliasSpec`] and [`CompositeSpec`] entries in the provided specs will be resolved into full
    /// [`Ingredient`]s before being seeded into the database, being able to reference the
    /// ingredients already in the database and the other provided specs for resolution.
    ///
    /// # Errors
    ///
    /// Returns an [`Error`] if any of the provided specs cannot be converted into an
    /// [`Ingredient`]. This would likely be an error converting a [`spec`](crate::specs) into a
    /// [`Composition`] due to invalid values, e.g. negative percentages, not summing to 100%, etc.
    /// It also returns an error if any of the provided specs are [`AliasSpec`] or [`CompositeSpec`]
    /// entries that reference specs not present in the database or the provided list of specs.
    pub fn seed_from_specs(&self, specs: &[SpecEntry]) -> Result<()> {
        let mut ingredients = Vec::new();
        let mut composites = Vec::new();
        let mut aliases = Vec::new();

        for spec_entry in specs {
            match spec_entry {
                SpecEntry::Ingredient(ing_spec) => match ing_spec.spec {
                    TaggedSpec::CompositeSpec(_) => composites.push(ing_spec.clone()),
                    _ => ingredients.push(ing_spec.clone().into_ingredient()?),
                },
                SpecEntry::Alias(alias_spec) => aliases.push(alias_spec.clone()),
            }
        }

        // Since independent ingredients may be referenced by composites and aliases, we need to
        // seed them first, so they are available for resolution when resolving composites/aliases.
        {
            let mut db = self.acquire_write_lock();
            for ingredient in ingredients {
                Self::seed_unique_ingredient(&mut db, ingredient)?;
            }
        }

        // Composites may not reference aliases or other composites, so if the collection is valid
        // we can now resolve them with the currently seeded ingredients, and then seed them before
        // resolving the aliases, which may reference any ingredient, including composites.
        let resolved_composites = composites
            .into_iter()
            .map(|composite_spec| composite_spec.resolve_into_ingredient(self))
            .collect::<Result<Vec<Ingredient>>>()?;

        // Since [`ResolveComposition`] for composites acquires a read lock on the database, we need
        // to resolve all composites before acquiring a write lock to seed them, otherwise deadlock.
        {
            let mut db = self.acquire_write_lock();
            for composite in resolved_composites {
                Self::seed_unique_ingredient(&mut db, composite)?;
            }
        }

        let resolved_aliases = aliases
            .into_iter()
            .map(|alias_spec| alias_spec.resolve_into_ingredient(self))
            .collect::<Result<Vec<Ingredient>>>()?;

        // Since [`ResolveComposition`] for aliases acquires a read lock on the database, we need
        // to resolve all aliases before acquiring a write lock to seed them, otherwise deadlock.
        {
            let mut db = self.acquire_write_lock();
            for alias in resolved_aliases {
                Self::seed_unique_ingredient(&mut db, alias)?;
            }
        }

        Ok(())
    }

    /// Creates a new [`IngredientDatabase`] seeded with the provided [`Ingredient`]s.
    ///
    /// # Errors
    ///
    /// Returns an [`Error::IngredientNameNotUnique`] if any of the provided ingredients have a name
    /// that is not unique across the provided list and the ingredients already in the database.
    pub fn new_seeded(ingredients: &[Ingredient]) -> Result<Self> {
        let db = Self::new();
        db.seed(ingredients)?;
        Ok(db)
    }

    /// Creates a new [`IngredientDatabase`] seeded with the provided [`SpecEntry`]s
    ///
    /// # Errors
    ///
    /// Returns an [`Error`] if any of the provided specs cannot be converted into an
    /// [`Ingredient`]. This would likely be an error converting a [`spec`](crate::specs) into a
    /// [`Composition`] due to invalid values, e.g. negative percentages, not summing to 100%, etc.
    /// It also returns an error if any of the provided specs are [`AliasSpec`] or [`CompositeSpec`]
    /// entries that reference specs not present in the database or the provided list of specs.
    pub fn new_seeded_from_specs(specs: &[SpecEntry]) -> Result<Self> {
        let db = Self::new();
        db.seed_from_specs(specs)?;
        Ok(db)
    }

    /// Creates a new [`IngredientDatabase`] seeded with all embedded ingredient specifications.
    ///
    /// This function requires the `data` feature to be enabled.
    #[allow(clippy::missing_panics_doc)] // If this panics it's a bug, not a user-facing error
    #[cfg(feature = "data")]
    #[must_use]
    pub fn new_seeded_from_embedded_data() -> Self {
        Self::new_seeded_from_specs(&crate::data::get_all_spec_entries())
            .expect("The collection of embedded ingredient specs should be valid")
    }
}

impl IngredientGetter for IngredientDatabase {
    fn get_ingredient_by_name(&self, name: &str) -> Result<Ingredient> {
        self.acquire_read_lock()
            .get(name)
            .cloned()
            .ok_or_else(|| Error::IngredientNotFound(name.to_string()))
    }
}

impl Default for IngredientDatabase {
    fn default() -> Self {
        Self::new()
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
    use crate::data::{get_all_independent_ingredient_specs, get_all_spec_entries};

    #[test]
    fn ingredient_database_empty() {
        let db = IngredientDatabase::new();
        assert_eq!(db.get_all_ingredients().len(), 0);
    }

    #[test]
    fn ingredient_database_new_seeded() {
        let db = IngredientDatabase::new_seeded(
            &get_all_independent_ingredient_specs()
                .iter()
                .map(|spec| spec.clone().into_ingredient().unwrap())
                .collect::<Vec<Ingredient>>(),
        )
        .unwrap();

        assert_eq!(db.get_all_ingredients().len(), get_all_independent_ingredient_specs().len());

        for spec in get_all_independent_ingredient_specs() {
            let ingredient = db.get_ingredient_by_name(&spec.name).unwrap();
            assert_eq!(ingredient, spec.into_ingredient().unwrap());
        }
    }

    #[test]
    fn ingredient_database_new_seeded_from_specs() {
        let db = IngredientDatabase::new_seeded_from_specs(&get_all_spec_entries()).unwrap();

        assert_eq!(db.get_all_ingredients().len(), get_all_spec_entries().len());

        for spec in get_all_spec_entries() {
            let ingredient = db.get_ingredient_by_name(spec.name()).unwrap();
            assert_eq!(ingredient, spec.resolve_into_ingredient(&db).unwrap());
        }
    }

    #[test]
    fn ingredient_database_seed() {
        let db = IngredientDatabase::new();
        assert_eq!(db.get_all_ingredients().len(), 0);

        let ingredients = get_all_independent_ingredient_specs()
            .iter()
            .map(|spec| spec.clone().into_ingredient().unwrap())
            .collect::<Vec<Ingredient>>();

        db.seed(&ingredients).unwrap();
        assert_eq!(db.get_all_ingredients().len(), ingredients.len());

        for ingredient in ingredients {
            let fetched_ingredient = db.get_ingredient_by_name(&ingredient.name).unwrap();
            assert_eq!(fetched_ingredient, ingredient);
        }
    }

    #[test]
    fn ingredient_database_seed_from_specs() {
        let db = IngredientDatabase::new();
        assert_eq!(db.get_all_ingredients().len(), 0);

        let specs = get_all_spec_entries();

        db.seed_from_specs(&specs).unwrap();
        assert_eq!(db.get_all_ingredients().len(), specs.len());

        for spec in specs {
            let fetched_ingredient = db.get_ingredient_by_name(spec.name()).unwrap();
            let ingredient = spec.resolve_into_ingredient(&db).unwrap();
            assert_eq!(fetched_ingredient, ingredient);
        }
    }

    #[test]
    fn ingredient_database_seeded_from_embedded_data() {
        let db = IngredientDatabase::new_seeded_from_embedded_data();

        assert_eq!(db.get_all_ingredients().len(), get_all_spec_entries().len());

        for spec in get_all_spec_entries() {
            let ingredient = db.get_ingredient_by_name(spec.name()).unwrap();
            assert_eq!(ingredient, spec.resolve_into_ingredient(&db).unwrap());
        }
    }

    #[test]
    fn ingredient_database_has_ingredient() {
        let db = IngredientDatabase::new_seeded_from_specs(&get_all_spec_entries()).unwrap();

        for spec in get_all_spec_entries() {
            assert_true!(db.has_ingredient(spec.name()));
        }

        assert_false!(db.has_ingredient("non_existent_ingredient"));
    }

    #[test]
    fn ingredient_database_get_ingredients_by_category() {
        let db = IngredientDatabase::new_seeded_from_specs(&get_all_spec_entries()).unwrap();

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

        let db = Arc::new(IngredientDatabase::new_seeded_from_specs(&get_all_spec_entries()).unwrap());

        let mut handles = vec![];

        for _ in 0..10 {
            let db_clone = Arc::clone(&db);
            let handle = thread::spawn(move || {
                for spec in get_all_spec_entries() {
                    let ingredient = db_clone.get_ingredient_by_name(spec.name()).unwrap();
                    assert_eq!(ingredient, spec.resolve_into_ingredient(&*db_clone).unwrap());
                }
            });
            handles.push(handle);
        }

        for handle in handles {
            handle.join().unwrap();
        }
    }
}

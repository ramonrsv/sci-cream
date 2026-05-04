//! [`TaggedSpec`] and [`IngredientSpec`] used mostly for interoperability with external data
//! sources, such as JSON and databases, and for WASM interoperability.
//!
//! These structs are designed to be easily represented in JSON format and (de)serialized. They
//! cannot be used for calculations directly, but can trivially be converted into full
//! [`Composition`] and/or [`Ingredient`] instances via [`ToComposition`] and
//! [`IngredientSpec::into_ingredient`], respectively.

use enum_as_inner::EnumAsInner;
use serde::{Deserialize, Serialize};

#[cfg(feature = "diesel")]
use crate::diesel::ingredients;
#[cfg(feature = "diesel")]
use diesel::{Queryable, Selectable};

use crate::{
    composition::{Composition, ResolveComposition, ToComposition},
    error::{Error, Result},
    ingredient::{Category, Ingredient, IntoIngredient, ResolveIntoIngredient},
    resolution::IngredientGetter,
    specs::{
        AlcoholSpec, ChocolateSpec, CompositeSpec, DairyLabelSpec, DairySimpleSpec, EggSpec, EmulsifierSpec, FruitSpec,
        FullSpec, MicroSpec, NutSpec, StabilizerSpec, SweetenerSpec,
    },
};

/// Tagged enum for all the supported specs, which is useful for (de)serialization of specs.
#[derive(EnumAsInner, PartialEq, Serialize, Deserialize, Clone, Debug)]
#[expect(clippy::large_enum_variant)] // @todo Deal with this issue later
#[allow(missing_docs)] // Trivial mapping to the underlying specs
pub enum TaggedSpec {
    DairySimpleSpec(DairySimpleSpec),
    DairyLabelSpec(DairyLabelSpec),
    SweetenerSpec(SweetenerSpec),
    FruitSpec(FruitSpec),
    ChocolateSpec(ChocolateSpec),
    NutSpec(NutSpec),
    EggSpec(EggSpec),
    AlcoholSpec(AlcoholSpec),
    StabilizerSpec(StabilizerSpec),
    EmulsifierSpec(EmulsifierSpec),
    MicroSpec(MicroSpec),
    FullSpec(FullSpec),
    CompositeSpec(CompositeSpec),
}

impl ToComposition for TaggedSpec {
    fn to_composition(&self) -> Result<Composition> {
        match self {
            Self::DairySimpleSpec(spec) => spec.to_composition(),
            Self::DairyLabelSpec(spec) => spec.to_composition(),
            Self::SweetenerSpec(spec) => spec.to_composition(),
            Self::FruitSpec(spec) => spec.to_composition(),
            Self::ChocolateSpec(spec) => spec.to_composition(),
            Self::NutSpec(spec) => spec.to_composition(),
            Self::EggSpec(spec) => spec.to_composition(),
            Self::AlcoholSpec(spec) => spec.to_composition(),
            Self::StabilizerSpec(spec) => spec.to_composition(),
            Self::EmulsifierSpec(spec) => spec.to_composition(),
            Self::MicroSpec(spec) => spec.to_composition(),
            Self::FullSpec(spec) => spec.to_composition(),
            Self::CompositeSpec(_) => Err(Error::UnsupportedSpec(
                "CompositeSpec cannot be converted into a Composition directly, as it requires
                access to the ingredient database. Use CompositeSpec::resolve_composition instead."
                    .to_string(),
            )),
        }
    }
}

impl ResolveComposition for TaggedSpec {
    fn resolve_composition(&self, getter: &dyn IngredientGetter) -> Result<Composition> {
        match self {
            Self::CompositeSpec(spec) => spec.resolve_composition(getter),
            _ => self.to_composition(),
        }
    }
}

impl From<DairySimpleSpec> for TaggedSpec {
    fn from(spec: DairySimpleSpec) -> Self {
        Self::DairySimpleSpec(spec)
    }
}

impl From<DairyLabelSpec> for TaggedSpec {
    fn from(spec: DairyLabelSpec) -> Self {
        Self::DairyLabelSpec(spec)
    }
}

impl From<SweetenerSpec> for TaggedSpec {
    fn from(spec: SweetenerSpec) -> Self {
        Self::SweetenerSpec(spec)
    }
}

impl From<FruitSpec> for TaggedSpec {
    fn from(spec: FruitSpec) -> Self {
        Self::FruitSpec(spec)
    }
}

impl From<ChocolateSpec> for TaggedSpec {
    fn from(spec: ChocolateSpec) -> Self {
        Self::ChocolateSpec(spec)
    }
}

impl From<NutSpec> for TaggedSpec {
    fn from(spec: NutSpec) -> Self {
        Self::NutSpec(spec)
    }
}

impl From<EggSpec> for TaggedSpec {
    fn from(spec: EggSpec) -> Self {
        Self::EggSpec(spec)
    }
}

impl From<AlcoholSpec> for TaggedSpec {
    fn from(spec: AlcoholSpec) -> Self {
        Self::AlcoholSpec(spec)
    }
}

impl From<StabilizerSpec> for TaggedSpec {
    fn from(spec: StabilizerSpec) -> Self {
        Self::StabilizerSpec(spec)
    }
}

impl From<EmulsifierSpec> for TaggedSpec {
    fn from(spec: EmulsifierSpec) -> Self {
        Self::EmulsifierSpec(spec)
    }
}

impl From<MicroSpec> for TaggedSpec {
    fn from(spec: MicroSpec) -> Self {
        Self::MicroSpec(spec)
    }
}

impl From<FullSpec> for TaggedSpec {
    fn from(spec: FullSpec) -> Self {
        Self::FullSpec(spec)
    }
}

impl From<CompositeSpec> for TaggedSpec {
    fn from(spec: CompositeSpec) -> Self {
        Self::CompositeSpec(spec)
    }
}

/// Ingredient spec, which includes the name, category, and the tagged spec for the ingredient.
///
/// This struct is designed to have a user-friendly JSON representation, as it is used for manual
/// ingredient definitions in the crate's ingredient database. It can be easily (de)serialized
/// to/from JSON, and trivially converted into a full [`Composition`] and/or [`Ingredient`].
#[cfg_attr(feature = "diesel", derive(Queryable, Selectable), diesel(table_name = ingredients))]
#[derive(PartialEq, Serialize, Deserialize, Clone, Debug)]
pub struct IngredientSpec {
    /// The name of the ingredient, which should be unique across a collection.
    pub name: String,
    /// The category of the ingredient, which is used for organizational purposes.
    pub category: Category,
    /// The tagged spec for the ingredient, which holds the actual specification data.
    #[serde(flatten)]
    pub spec: TaggedSpec,
}

impl ToComposition for IngredientSpec {
    fn to_composition(&self) -> Result<Composition> {
        self.spec.to_composition()
    }
}

impl ResolveComposition for IngredientSpec {
    fn resolve_composition(&self, getter: &dyn IngredientGetter) -> Result<Composition> {
        self.spec.resolve_composition(getter)
    }
}

impl IntoIngredient for IngredientSpec {
    fn into_ingredient(self) -> Result<Ingredient> {
        Ok(Ingredient {
            name: self.name,
            category: self.category,
            composition: self.spec.to_composition()?,
        })
    }
}

impl ResolveIntoIngredient for IngredientSpec {
    fn resolve_into_ingredient(self, getter: &dyn IngredientGetter) -> Result<Ingredient> {
        Ok(Ingredient {
            name: self.name,
            category: self.category,
            composition: self.spec.resolve_composition(getter)?,
        })
    }
}

#[cfg(test)]
#[cfg_attr(coverage, coverage(off))]
#[allow(clippy::unwrap_used)]
pub(crate) mod tests {
    use std::sync::LazyLock;

    use crate::tests::asserts::shadow_asserts::assert_eq;
    use crate::tests::asserts::*;
    use crate::tests::assets::*;

    use super::*;
    use crate::{
        data::{get_all_independent_ingredient_specs, get_spec_entry_by_name},
        database::IngredientDatabase,
        specs::SpecEntry,
    };

    pub(crate) static INGREDIENT_ASSETS_TABLE: LazyLock<Vec<(&str, IngredientSpec, Option<Composition>)>> =
        LazyLock::new(|| {
            [
                INGREDIENT_ASSETS_TABLE_ALCOHOL.as_slice(),
                INGREDIENT_ASSETS_TABLE_CHOCOLATE.as_slice(),
                INGREDIENT_ASSETS_TABLE_COMPOSITE.as_slice(),
                INGREDIENT_ASSETS_TABLE_DAIRY.as_slice(),
                INGREDIENT_ASSETS_TABLE_EGG.as_slice(),
                INGREDIENT_ASSETS_TABLE_EMULSIFIERS.as_slice(),
                INGREDIENT_ASSETS_TABLE_FRUIT.as_slice(),
                INGREDIENT_ASSETS_TABLE_FULL.as_slice(),
                INGREDIENT_ASSETS_TABLE_MICRO.as_slice(),
                INGREDIENT_ASSETS_TABLE_NUT.as_slice(),
                INGREDIENT_ASSETS_TABLE_STABILIZERS.as_slice(),
                INGREDIENT_ASSETS_TABLE_SWEETENER.as_slice(),
            ]
            .concat()
        });

    #[test]
    fn deserialize_ingredient_spec() {
        INGREDIENT_ASSETS_TABLE.iter().for_each(|(spec_str, spec, _)| {
            assert_eq!(
                serde_json::from_str::<IngredientSpec>(spec_str)
                    .unwrap_or_else(|e| panic!("Failed to deserialize spec '{name}': {e}", name = spec.name)),
                *spec
            );
        });
    }

    #[test]
    fn ingredient_spec_database_matches_assets() {
        INGREDIENT_ASSETS_TABLE.iter().for_each(|(_, spec, _)| {
            assert_eq!(SpecEntry::Ingredient(spec.clone()), get_spec_entry_by_name(&spec.name).unwrap());
        });
    }

    #[test]
    fn ingredient_spec_to_composition_matches_assets() {
        INGREDIENT_ASSETS_TABLE
            .iter()
            // CompositeSpec requires database access to resolve, so we skip them in this test
            .filter(|(_, spec, _)| !matches!(spec.spec, TaggedSpec::CompositeSpec(_)))
            .for_each(|(_, spec, expected_comp_opt)| {
                let comp = spec.spec.to_composition().unwrap();
                if let Some(expected_comp) = expected_comp_opt {
                    assert_eq_flt_test!(&comp, expected_comp);
                }
            });
    }

    #[test]
    fn ingredient_spec_resolve_composition_matches_assets() {
        let db = IngredientDatabase::new_seeded_from_specs(
            get_all_independent_ingredient_specs()
                .into_iter()
                .map(SpecEntry::Ingredient)
                .collect::<Vec<_>>()
                .as_slice(),
        )
        .unwrap();

        INGREDIENT_ASSETS_TABLE.iter().for_each(|(_, spec, expected_comp_opt)| {
            let comp = spec.resolve_composition(&db).unwrap();
            if let Some(expected_comp) = expected_comp_opt {
                assert_eq_flt_test!(&comp, expected_comp);
            }
        });
    }
}

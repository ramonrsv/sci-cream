//! [`MicroSpec`] and associated implementations, for micro ingredients like salt, etc.

use serde::{Deserialize, Serialize};

use crate::{
    composition::{Composition, Micro, PAC, Solids, SolidsBreakdown, ToComposition},
    constants::{self},
    error::Result,
    validate::Validate,
};

/// Spec for ingredients with solely micro components, e.g. salt, etc.
#[doc = include_str!("../../docs/references/index/5.md")]
#[doc = include_str!("../../docs/references/index/6.md")]
#[derive(Eq, PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub enum MicroSpec {
    /// Assumed to be 100% salt, with all details calculated internally
    Salt,
}

impl ToComposition for MicroSpec {
    fn to_composition(&self) -> Result<Composition> {
        match *self {
            Self::Salt => Composition::new()
                .solids(Solids::new().other(SolidsBreakdown::new().others(100.0)))
                .micro(Micro::new().salt(100.0))
                .pac(PAC::new().salt(constants::pac::SALT))
                .validate_into(),
        }
    }
}

#[cfg(test)]
#[cfg_attr(coverage, coverage(off))]
#[allow(clippy::unwrap_used, clippy::float_cmp)]
pub(crate) mod tests {
    use std::sync::LazyLock;

    use crate::tests::asserts::shadow_asserts::assert_eq;
    #[expect(unused_imports)]
    use crate::tests::asserts::*;

    use super::*;
    use crate::{composition::CompKey, ingredient::Category, specs::IngredientSpec};

    pub(crate) const ING_SPEC_MICRO_SALT_STR: &str = r#"{
      "name": "Salt",
      "category": "Miscellaneous",
      "MicroSpec": "Salt"
    }"#;

    pub(crate) static ING_SPEC_MICRO_SALT: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Salt".to_string(),
        category: Category::Miscellaneous,
        spec: MicroSpec::Salt.into(),
    });

    #[test]
    fn to_composition_micro_spec_salt() {
        let comp = MicroSpec::Salt.to_composition().unwrap();

        assert_eq!(comp.get(CompKey::Energy), 0.0);

        assert_eq!(comp.get(CompKey::OtherSNFS), 100.0);
        assert_eq!(comp.get(CompKey::TotalSolids), 100.0);
        assert_eq!(comp.get(CompKey::Salt), 100.0);
        assert_eq!(comp.get(CompKey::PACslt), 585.0);
    }

    pub(crate) static INGREDIENT_ASSETS_TABLE_MICRO: LazyLock<Vec<(&str, IngredientSpec, Option<Composition>)>> =
        LazyLock::new(|| vec![(ING_SPEC_MICRO_SALT_STR, ING_SPEC_MICRO_SALT.clone(), None)]);
}

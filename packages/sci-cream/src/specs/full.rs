use serde::{Deserialize, Serialize};

use crate::{
    composition::{Alcohol, CompKey, Composition, IntoComposition, Micro, PAC, Solids},
    constants::{self},
    error::Result,
    validate::assert_within_100_percent,
};

/// Spec for ingredients with a full composition specified
///
/// This is the most flexible spec, allowing the user to specify all relevant fields of the
/// composition directly. However, it requires that the user know and provide all relevant values,
/// which can be an involved and challenging process for some ingredients, making it very cumbersome
/// and error-prone to use. It is recommended to use the more specified specs where possible.
///
/// We could just use [`Composition`] directly, but having a separate [`FullSpec`] allows some
/// flexibility to make the specification format more user friendly, and somewhat decouples it
/// from the internal implementation of [`Composition`].
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct FullSpec {
    pub solids: Option<Solids>,
    pub micro: Option<Micro>,
    pub abv: Option<f64>,
    pub pod: Option<f64>,
    pub pac: Option<PAC>,
}

impl IntoComposition for FullSpec {
    fn into_composition(self) -> Result<Composition> {
        let Self {
            solids,
            micro,
            abv,
            pod,
            pac,
        } = self;

        let (solids, micro) = (solids.unwrap_or_default(), micro.unwrap_or_default());
        let pod = pod.unwrap_or(solids.all().carbohydrates.to_pod()? + solids.all().artificial_sweeteners.to_pod()?);

        let alcohol = if let Some(abv) = abv {
            Alcohol::from_abv(abv)
        } else {
            Alcohol::default()
        };

        let pac = pac.unwrap_or(
            PAC::new()
                .sugars(solids.all().carbohydrates.to_pod()? + solids.all().artificial_sweeteners.to_pod()?)
                .alcohol(alcohol.to_pac())
                .salt(micro.salt * constants::pac::SALT)
                .msnf_ws_salts(solids.milk.snf() * constants::pac::MSNF_WS_SALTS / 100.0),
        );

        let comp = Composition::new()
            .energy(solids.all().energy()? + alcohol.energy())
            .solids(solids)
            .micro(micro)
            .alcohol(alcohol)
            .pod(pod)
            .pac(pac);

        assert_within_100_percent(comp.get(CompKey::TotalSolids) + comp.get(CompKey::Alcohol))?;

        Ok(comp)
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
    use crate::{
        composition::CompKey,
        ingredient::Category,
        specs::{IngredientSpec, Spec},
    };

    pub(crate) const ING_SPEC_FULL_WATER_STR: &str = r#"{
      "name": "Water",
      "category": "Miscellaneous",
      "FullSpec": {}
    }"#;

    pub(crate) static ING_SPEC_FULL_WATER: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Water".to_string(),
        category: Category::Miscellaneous,
        spec: Spec::FullSpec(FullSpec {
            solids: None,
            micro: None,
            abv: None,
            pod: None,
            pac: None,
        }),
    });

    #[test]
    fn into_composition_full_spec_water() {
        let comp = ING_SPEC_FULL_WATER.spec.into_composition().unwrap();

        assert_eq!(comp.get(CompKey::Energy), 0.0);
        assert_eq!(comp.get(CompKey::Water), 100.0);
        assert_eq!(comp.get(CompKey::TotalSolids), 0.0);
        assert_eq!(comp.get(CompKey::TotalSweeteners), 0.0);
        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::Lecithin), 0.0);
        assert_eq!(comp.get(CompKey::Emulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::Stabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq!(comp.get(CompKey::POD), 0.0);
        assert_eq!(comp.get(CompKey::PACtotal), 0.0);
        assert_eq!(comp.get(CompKey::HF), 0.0);
    }

    pub(crate) static INGREDIENT_ASSETS_TABLE_FULL: LazyLock<Vec<(&str, IngredientSpec, Option<Composition>)>> =
        LazyLock::new(|| vec![(ING_SPEC_FULL_WATER_STR, ING_SPEC_FULL_WATER.clone(), None)]);
}

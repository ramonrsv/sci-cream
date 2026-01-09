use serde::{Deserialize, Serialize};

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

use crate::{
    composition::{CompKey, Composition, ScaleComponents},
    error::Result,
    fpd::{FPD, FpdKey},
};

#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Serialize, Deserialize, Copy, Clone, Debug)]
pub struct CompositionLine {
    pub composition: Composition,
    pub amount: f64,
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
impl CompositionLine {
    #[cfg_attr(feature = "wasm", wasm_bindgen(constructor))]
    pub fn new(composition: Composition, amount: f64) -> Self {
        Self { composition, amount }
    }
}

impl Composition {
    pub fn calculate_from_composition_lines(composition_lines: &[CompositionLine]) -> Result<Self> {
        let total_amount: f64 = composition_lines.iter().map(|line| line.amount).sum();

        if total_amount == 0.0 {
            return Ok(Composition::empty());
        }

        composition_lines.iter().try_fold(Composition::empty(), |acc, line| {
            let mut mix_comp = acc;
            let weight = line.amount / total_amount;
            mix_comp = mix_comp.add(&line.composition.scale(weight));
            Ok(mix_comp)
        })
    }
}

#[derive(Hash, PartialEq, Eq, Serialize, Deserialize, Copy, Clone, Debug)]
pub enum PropKey {
    CompKey(CompKey),
    FpdKey(FpdKey),
}

impl From<CompKey> for PropKey {
    fn from(key: CompKey) -> Self {
        PropKey::CompKey(key)
    }
}

impl From<FpdKey> for PropKey {
    fn from(key: FpdKey) -> Self {
        PropKey::FpdKey(key)
    }
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Clone, Debug)]
pub struct MixProperties {
    pub composition: Composition,
    #[cfg_attr(feature = "wasm", wasm_bindgen(getter_with_clone))]
    pub fpd: FPD,
}

impl MixProperties {
    pub fn empty() -> Self {
        Self {
            composition: Composition::empty(),
            fpd: FPD::empty(),
        }
    }

    pub fn get(&self, key: PropKey) -> f64 {
        match key {
            PropKey::CompKey(comp_key) => self.composition.get(comp_key),
            PropKey::FpdKey(fpd_key) => self.fpd.get(fpd_key),
        }
    }

    pub fn calculate_from_composition_lines(composition_lines: &[CompositionLine]) -> Result<Self> {
        let composition = Composition::calculate_from_composition_lines(composition_lines)?;
        let fpd = FPD::compute_from_composition(composition)?;

        Ok(Self { composition, fpd })
    }
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
impl MixProperties {
    #[cfg_attr(feature = "wasm", wasm_bindgen(constructor))]
    pub fn new() -> Self {
        Self::empty()
    }
}

#[cfg(feature = "wasm")]
#[cfg_attr(coverage, coverage(off))]
pub mod wasm {
    use super::*;

    #[wasm_bindgen]
    pub fn calculate_mix_composition(composition_lines: JsValue) -> std::result::Result<Composition, JsValue> {
        Composition::calculate_from_composition_lines(
            &serde_wasm_bindgen::from_value::<Vec<CompositionLine>>(composition_lines).unwrap(),
        )
        .map_err(|e| JsValue::from_str(&e.to_string()))
    }

    #[wasm_bindgen]
    pub fn calculate_mix_properties(composition_lines: JsValue) -> std::result::Result<MixProperties, JsValue> {
        MixProperties::calculate_from_composition_lines(
            &serde_wasm_bindgen::from_value::<Vec<CompositionLine>>(composition_lines).unwrap(),
        )
        .map_err(|e| JsValue::from_str(&e.to_string()))
    }
}

impl Default for MixProperties {
    fn default() -> Self {
        Self::empty()
    }
}

#[cfg(test)]
#[cfg_attr(coverage, coverage(off))]
mod tests {
    use crate::tests::asserts::shadow_asserts::assert_eq;
    use crate::tests::asserts::*;

    use crate::tests::{assets::*, data::get_ingredient_spec_by_name_or_panic};

    use super::*;
    use crate::{constants::COMPOSITION_EPSILON, specs::IntoComposition};

    fn to_comp_lines(items: &[(&str, f64)]) -> Vec<CompositionLine> {
        items
            .iter()
            .map(|(name, amount)| {
                let spec = get_ingredient_spec_by_name_or_panic(name);
                CompositionLine::new(spec.spec.into_composition().unwrap(), *amount)
            })
            .collect::<Vec<CompositionLine>>()
    }

    #[test]
    fn composition_calculate_from_composition_lines() {
        let mix_comp = Composition::calculate_from_composition_lines(&[
            CompositionLine::new(*COMP_2_MILK, 50.0),
            CompositionLine::new(*COMP_SUCROSE, 50.0),
        ])
        .unwrap();

        assert_eq!(mix_comp.get(CompKey::Lactose), 4.8069 / 2.0);
        assert_eq!(mix_comp.get(CompKey::Sucrose), 50.0);
        assert_eq!(mix_comp.get(CompKey::TotalSugars), (4.8069 / 2.0) + 50.0);

        assert_eq!(mix_comp.get(CompKey::TotalSolids), (10.82 / 2.0) + 50.0);
        assert_eq!(mix_comp.get(CompKey::Water), 100.0 - mix_comp.get(CompKey::TotalSolids));

        assert_eq!(mix_comp.get(CompKey::MilkFat), 1.0);
        assert_eq!(mix_comp.get(CompKey::MSNF), 8.82 / 2.0);
        assert_abs_diff_eq!(mix_comp.get(CompKey::MilkSNFS), 4.0131 / 2.0, epsilon = COMPOSITION_EPSILON);
        assert_eq!(mix_comp.get(CompKey::MilkSolids), 10.82 / 2.0);

        assert_eq!(mix_comp.get(CompKey::TotalSolids) - mix_comp.get(CompKey::MilkSolids), 50.0);
    }

    #[test]
    fn mix_properties_calculate_from_composition_lines_with_hf() {
        let mix_properties = MixProperties::calculate_from_composition_lines(&to_comp_lines(&[
            ("Whole Milk", 245.0),
            ("Whipping Cream", 215.0),
            ("70% Dark Chocolate", 28.0),
            ("Skimmed Milk Powder", 21.0),
            ("Egg Yolk", 18.0),
            ("Dextrose", 45.0),
            ("Fructose", 32.0),
            ("Salt", 0.5),
            ("Rich Ice Cream SB", 1.25),
            //("Vanilla Extract", 6.0),
        ]))
        .unwrap();

        let epsilon = 0.15;
        assert_abs_diff_eq!(mix_properties.get(CompKey::PACtotal.into()), 33.07, epsilon = epsilon);
        assert_abs_diff_eq!(mix_properties.get(CompKey::AbsPAC.into()), 56.2, epsilon = epsilon);
        assert_abs_diff_eq!(mix_properties.get(FpdKey::FPD.into()), -3.5, epsilon = epsilon);
        assert_abs_diff_eq!(mix_properties.get(FpdKey::ServingTemp.into()), -14.78, epsilon = epsilon);
        assert_abs_diff_eq!(mix_properties.get(FpdKey::HardnessAt14C.into()), 73.42, epsilon = epsilon);
    }

    #[test]
    fn floating_point_edge_case_zero_water_near_epsilon() {
        let mix_properties =
            MixProperties::calculate_from_composition_lines(&to_comp_lines(&[("Fructose", 10.0), ("Salt", 0.54)]))
                .unwrap();

        assert_abs_diff_eq!(mix_properties.get(CompKey::Water.into()), 0.0, epsilon = COMPOSITION_EPSILON);
        assert_true!(mix_properties.get(FpdKey::FPD.into()).is_nan());
        assert_true!(mix_properties.get(FpdKey::ServingTemp.into()).is_nan());
        assert_true!(mix_properties.get(FpdKey::HardnessAt14C.into()).is_nan());
        assert_true!(mix_properties.fpd.curves.frozen_water[0].temp.is_nan());
        assert_true!(mix_properties.fpd.curves.hardness[0].temp.is_nan());
    }
}

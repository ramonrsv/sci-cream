use serde::{Deserialize, Serialize};

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

use crate::{
    composition::{CompKey, Composition, ScaleComponents},
    fpd::FPD,
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
        Self {
            composition,
            amount,
        }
    }
}

pub fn calculate_mix_composition(composition_lines: &[CompositionLine]) -> Composition {
    let total_amount: f64 = composition_lines.iter().map(|line| line.amount).sum();

    if total_amount == 0.0 {
        return Composition::empty();
    }

    composition_lines
        .iter()
        .fold(Composition::empty(), |mut mix_comp, line| {
            let weight = line.amount / total_amount;
            mix_comp = mix_comp.add(&line.composition.scale(weight));
            mix_comp
        })
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Hash, PartialEq, Eq, Serialize, Deserialize, Copy, Clone, Debug)]
pub enum PropKey {
    MilkFat,
    CacaoFat,
    NutFat,
    EggFat,
    OtherFat,
    TotalFat,
    Lactose,
    Sugars,
    ArtificialSweeteners,
    MSNF,
    MilkSNFS,
    CocoaSNFS,
    NutSNFS,
    EggSNFS,
    OtherSNFS,
    TotalSolids,
    Salt,
    Alcohol,
    Emulsifiers,
    Stabilizers,
    EmulsifiersPerFat,
    StabilizersPerWater,
    POD,
    PACsgr,
    PACslt,
    PACalc,
    PACtotal,
    AbsPAC,
    HF,
    FPD,
    ServingTemp,
    HardnessAt14C,
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Copy, Clone, Debug)]
pub struct MixProperties {
    pub composition: Composition,
    pub fpd: FPD,
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
impl MixProperties {
    pub fn get(&self, key: PropKey) -> f64 {
        match key {
            PropKey::MilkFat => self.composition.get(CompKey::MilkFat),
            PropKey::CacaoFat => self.composition.get(CompKey::CacaoFat),
            PropKey::NutFat => self.composition.get(CompKey::NutFat),
            PropKey::EggFat => self.composition.get(CompKey::EggFat),
            PropKey::OtherFat => self.composition.get(CompKey::OtherFat),
            PropKey::TotalFat => self.composition.get(CompKey::TotalFat),
            PropKey::Lactose => self.composition.get(CompKey::Lactose),
            PropKey::Sugars => self.composition.get(CompKey::Sugars),
            PropKey::ArtificialSweeteners => self.composition.get(CompKey::ArtificialSweeteners),
            PropKey::MSNF => self.composition.get(CompKey::MSNF),
            PropKey::MilkSNFS => self.composition.get(CompKey::MilkSNFS),
            PropKey::CocoaSNFS => self.composition.get(CompKey::CocoaSNFS),
            PropKey::NutSNFS => self.composition.get(CompKey::NutSNFS),
            PropKey::EggSNFS => self.composition.get(CompKey::EggSNFS),
            PropKey::OtherSNFS => self.composition.get(CompKey::OtherSNFS),
            PropKey::TotalSolids => self.composition.get(CompKey::TotalSolids),
            PropKey::Salt => self.composition.get(CompKey::Salt),
            PropKey::Alcohol => self.composition.get(CompKey::Alcohol),
            PropKey::Emulsifiers => self.composition.get(CompKey::Emulsifiers),
            PropKey::Stabilizers => self.composition.get(CompKey::Stabilizers),
            PropKey::EmulsifiersPerFat => self.composition.get(CompKey::EmulsifiersPerFat),
            PropKey::StabilizersPerWater => self.composition.get(CompKey::StabilizersPerWater),
            PropKey::POD => self.composition.get(CompKey::POD),
            PropKey::PACsgr => self.composition.get(CompKey::PACsgr),
            PropKey::PACslt => self.composition.get(CompKey::PACslt),
            PropKey::PACalc => self.composition.get(CompKey::PACalc),
            PropKey::PACtotal => self.composition.get(CompKey::PACtotal),
            PropKey::AbsPAC => self.composition.get(CompKey::AbsPAC),
            PropKey::HF => self.composition.get(CompKey::HF),
            PropKey::FPD => self.fpd.fpd,
            PropKey::ServingTemp => self.fpd.serving_temp,
            PropKey::HardnessAt14C => self.fpd.hardness_at_14c,
        }
    }
}

pub fn calculate_mix_properties(composition_lines: &[CompositionLine]) -> MixProperties {
    MixProperties {
        composition: calculate_mix_composition(composition_lines),
        fpd: FPD {
            fpd: -3.0,
            serving_temp: -14.0,
            hardness_at_14c: 75.0,
        },
    }
}
#[cfg(feature = "wasm")]
pub mod js {
    use super::*;

    #[wasm_bindgen]
    pub fn calculate_mix_composition_js(composition_lines: JsValue) -> Composition {
        calculate_mix_composition(
            &serde_wasm_bindgen::from_value::<Vec<CompositionLine>>(composition_lines).unwrap(),
        )
    }

    #[wasm_bindgen]
    pub fn calculate_mix_properties_js(composition_lines: JsValue) -> MixProperties {
        calculate_mix_properties(
            &serde_wasm_bindgen::from_value::<Vec<CompositionLine>>(composition_lines).unwrap(),
        )
    }
}

#[cfg(test)]
mod test {
    use crate::tests::asserts::shadow_asserts::assert_eq;
    #[allow(unused_imports)] // @todo Remove when used.
    use crate::tests::asserts::*;

    use super::*;
    use crate::tests::assets::*;

    #[test]
    fn calculate_mix_composition() {
        let mix_comp = super::calculate_mix_composition(&[
            CompositionLine::new(*COMP_MILK_2_PERCENT, 50.0),
            CompositionLine::new(*COMP_SUCROSE, 50.0),
        ]);

        assert_eq!(mix_comp.sweeteners.sugars.lactose, 4.8069 / 2.0);
        assert_eq!(mix_comp.sweeteners.sugars.sucrose, 50.0);
        assert_eq!(mix_comp.sweeteners.sugars.total(), (4.8069 / 2.0) + 50.0);

        assert_eq!(mix_comp.solids.total(), (10.82 / 2.0) + 50.0);
        assert_eq!(mix_comp.water(), 100.0 - mix_comp.solids.total());

        assert_eq!(mix_comp.solids.milk.fats, 1.0);
        assert_eq!(mix_comp.solids.milk.sweeteners, 4.8069 / 2.0);
        assert_eq!(mix_comp.solids.milk.snf(), 8.82 / 2.0);
        assert_eq!(mix_comp.solids.milk.snfs, 4.0131 / 2.0);
        assert_eq!(mix_comp.solids.milk.total(), 10.82 / 2.0);

        assert_eq!(mix_comp.solids.other.total(), 50.0);
    }
}

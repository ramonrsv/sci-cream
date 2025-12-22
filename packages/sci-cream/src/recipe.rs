use serde::{Deserialize, Serialize};

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

use crate::{
    composition::{CompKey, Composition, ScaleComponents},
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

#[derive(Hash, PartialEq, Eq, Serialize, Deserialize, Copy, Clone, Debug)]
pub enum PropKey {
    CompKey(CompKey),
    FpdKey(FpdKey),
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Copy, Clone, Debug)]
pub struct MixProperties {
    pub composition: Composition,
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
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
impl MixProperties {
    #[cfg_attr(feature = "wasm", wasm_bindgen(constructor))]
    pub fn new() -> Self {
        Self::empty()
    }
}

pub fn calculate_mix_properties(composition_lines: &[CompositionLine]) -> MixProperties {
    MixProperties {
        composition: calculate_mix_composition(composition_lines),
        fpd: FPD::empty(),
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

impl Default for MixProperties {
    fn default() -> Self {
        Self::empty()
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

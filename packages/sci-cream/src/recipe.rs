use serde::{Deserialize, Serialize};

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

use crate::composition::{Composition, Micro, PAC, Solids, SolidsBreakdown, Sugars, Sweeteners};

pub trait ScaleComponents {
    fn scale(&self, factor: f64) -> Self;
    fn add(&self, other: &Self) -> Self;
}

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

#[cfg(feature = "wasm")]
pub mod js {
    use super::*;

    #[wasm_bindgen]
    pub fn calculate_mix_composition_js(composition_lines: JsValue) -> Composition {
        calculate_mix_composition(
            &serde_wasm_bindgen::from_value::<Vec<CompositionLine>>(composition_lines).unwrap(),
        )
    }
}

impl ScaleComponents for Sugars {
    fn scale(&self, factor: f64) -> Self {
        Self {
            sucrose: self.sucrose * factor,
            glucose: self.glucose * factor,
            fructose: self.fructose * factor,
            lactose: self.lactose * factor,
            maltose: self.maltose * factor,
            galactose: self.galactose * factor,
            unspecified: self.unspecified * factor,
        }
    }

    fn add(&self, other: &Self) -> Self {
        Self {
            sucrose: self.sucrose + other.sucrose,
            glucose: self.glucose + other.glucose,
            fructose: self.fructose + other.fructose,
            lactose: self.lactose + other.lactose,
            maltose: self.maltose + other.maltose,
            galactose: self.galactose + other.galactose,
            unspecified: self.unspecified + other.unspecified,
        }
    }
}

impl ScaleComponents for Sweeteners {
    fn scale(&self, factor: f64) -> Self {
        Self {
            sugars: self.sugars.scale(factor),
            polysaccharides: self.polysaccharides * factor,
            artificial: self.artificial * factor,
        }
    }

    fn add(&self, other: &Self) -> Self {
        Self {
            sugars: self.sugars.add(&other.sugars),
            polysaccharides: self.polysaccharides + other.polysaccharides,
            artificial: self.artificial + other.artificial,
        }
    }
}

impl ScaleComponents for SolidsBreakdown {
    fn scale(&self, factor: f64) -> Self {
        Self {
            fats: self.fats * factor,
            sweeteners: self.sweeteners * factor,
            snfs: self.snfs * factor,
        }
    }

    fn add(&self, other: &Self) -> Self {
        Self {
            fats: self.fats + other.fats,
            sweeteners: self.sweeteners + other.sweeteners,
            snfs: self.snfs + other.snfs,
        }
    }
}

impl ScaleComponents for Solids {
    fn scale(&self, factor: f64) -> Self {
        Self {
            milk: self.milk.scale(factor),
            egg: self.egg.scale(factor),
            cocoa: self.cocoa.scale(factor),
            nut: self.nut.scale(factor),
            other: self.other.scale(factor),
        }
    }

    fn add(&self, other: &Self) -> Self {
        Self {
            milk: self.milk.add(&other.milk),
            egg: self.egg.add(&other.egg),
            cocoa: self.cocoa.add(&other.cocoa),
            nut: self.nut.add(&other.nut),
            other: self.other.add(&other.other),
        }
    }
}

impl ScaleComponents for Micro {
    fn scale(&self, factor: f64) -> Self {
        Self {
            salt: self.salt * factor,
            stabilizers: self.stabilizers * factor,
            emulsifiers: self.emulsifiers * factor,
        }
    }

    fn add(&self, other: &Self) -> Self {
        Self {
            salt: self.salt + other.salt,
            stabilizers: self.stabilizers + other.stabilizers,
            emulsifiers: self.emulsifiers + other.emulsifiers,
        }
    }
}

impl ScaleComponents for PAC {
    fn scale(&self, factor: f64) -> Self {
        Self {
            sugars: self.sugars * factor,
            salt: self.salt * factor,
            alcohol: self.alcohol * factor,
            hardness_factor: self.hardness_factor * factor,
        }
    }

    fn add(&self, other: &Self) -> Self {
        Self {
            sugars: self.sugars + other.sugars,
            salt: self.salt + other.salt,
            alcohol: self.alcohol + other.alcohol,
            hardness_factor: self.hardness_factor + other.hardness_factor,
        }
    }
}

impl ScaleComponents for Composition {
    fn scale(&self, factor: f64) -> Self {
        Self {
            solids: self.solids.scale(factor),
            sweeteners: self.sweeteners.scale(factor),
            micro: self.micro.scale(factor),
            alcohol: self.alcohol * factor,
            pod: self.pod * factor,
            pac: self.pac.scale(factor),
        }
    }

    fn add(&self, other: &Self) -> Self {
        Self {
            solids: self.solids.add(&other.solids),
            sweeteners: self.sweeteners.add(&other.sweeteners),
            micro: self.micro.add(&other.micro),
            alcohol: self.alcohol + other.alcohol,
            pod: self.pod + other.pod,
            pac: self.pac.add(&other.pac),
        }
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
        let mix_comp = super::calculate_mix_composition(&vec![
            CompositionLine::new(COMP_MILK_2_PERCENT.clone(), 50.0),
            CompositionLine::new(COMP_SUCROSE.clone(), 50.0),
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

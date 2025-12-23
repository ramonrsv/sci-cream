use serde::{Deserialize, Serialize};
use strum_macros::EnumIter;

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

use crate::{
    composition::{CompKey, Composition},
    constants::{
        FPD_MSNF_FACTOR_FOR_CELSIUS, PAC_FPD_TABLE, PAC_FPD_TABLE_MAX_PAC, PAC_FPD_TABLE_STEP,
        SERVING_TEMP_X_AXIS,
    },
    error::{Error, Result},
};

#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(EnumIter, Hash, PartialEq, Eq, Serialize, Deserialize, Copy, Clone, Debug)]
pub enum FpdKey {
    FPD,
    ServingTemp,
    HardnessAt14C,
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Copy, Clone, Debug)]
pub struct CurvePoint {
    pub temp: f64,
    pub x_axis: f64,
}

impl CurvePoint {
    pub fn new(temp: f64, x_axis: f64) -> Self {
        Self { temp, x_axis }
    }
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Clone, Debug)]
pub struct Curves {
    #[cfg_attr(feature = "wasm", wasm_bindgen(getter_with_clone))]
    pub frozen_water: Vec<CurvePoint>,
    #[cfg_attr(feature = "wasm", wasm_bindgen(getter_with_clone))]
    pub hardness: Vec<CurvePoint>,
    #[cfg_attr(feature = "wasm", wasm_bindgen(getter_with_clone))]
    pub hardness_factor: Vec<CurvePoint>,
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Clone, Debug)]
pub struct FPD {
    pub fpd: f64,
    pub serving_temp: f64,
    pub hardness_at_14c: f64,
    #[cfg_attr(feature = "wasm", wasm_bindgen(getter_with_clone))]
    pub curves: Curves,
}

impl Curves {
    pub fn empty() -> Self {
        Self {
            frozen_water: Vec::new(),
            hardness: Vec::new(),
            hardness_factor: Vec::new(),
        }
    }
}

impl FPD {
    pub fn empty() -> Self {
        Self {
            fpd: f64::NAN,
            serving_temp: f64::NAN,
            hardness_at_14c: f64::NAN,
            curves: Curves::empty(),
        }
    }

    pub fn compute_from_composition(composition: Composition) -> Result<Self> {
        let curves = compute_fpd_curves(composition)?;
        let fpd = curves.frozen_water[0].temp;
        let serving_temp = curves.hardness[SERVING_TEMP_X_AXIS].temp;
        let hardness_at_14c = 75.0;

        Ok(Self {
            fpd,
            serving_temp,
            hardness_at_14c,
            curves,
        })
    }
}

fn get_fpd_from_pac_interpolation(pac: f64) -> Result<f64> {
    if pac < 0.0 {
        return Err(Error::InvalidFpdComputation(format!(
            "PAC value {pac} cannot be negative"
        )));
    }

    let floor_pac = (pac / PAC_FPD_TABLE_STEP as f64).floor() as usize * PAC_FPD_TABLE_STEP;
    let ceil_pac = (pac / PAC_FPD_TABLE_STEP as f64).ceil() as usize * PAC_FPD_TABLE_STEP;

    let (floor_pac, ceil_pac) = if ceil_pac <= PAC_FPD_TABLE_MAX_PAC {
        (floor_pac, ceil_pac)
    } else {
        (
            PAC_FPD_TABLE_MAX_PAC - PAC_FPD_TABLE_STEP,
            PAC_FPD_TABLE_MAX_PAC,
        )
    };

    let idx_floor_pac = floor_pac / PAC_FPD_TABLE_STEP;
    let idx_ceil_pac = ceil_pac / PAC_FPD_TABLE_STEP;

    let floor_fpd = PAC_FPD_TABLE[idx_floor_pac].1;
    let ceil_fpd = PAC_FPD_TABLE[idx_ceil_pac].1;

    let run = pac - floor_pac as f64;
    let slope = (ceil_fpd - floor_fpd) / PAC_FPD_TABLE_STEP as f64;

    Ok(floor_fpd + slope * run)
}

fn compute_fpd_from_comp_and_frozen_water(
    composition: Composition,
    hardness_factor: f64,
    frozen_water: f64,
) -> Result<f64> {
    let water = composition.get(CompKey::Water) * ((100.0 - frozen_water) / 100.0);
    let fpd_pac = get_fpd_from_pac_interpolation(
        (composition.get(CompKey::PACtotal) - hardness_factor) * 100.0 / water,
    )?;
    let fpd_slt = (composition.get(CompKey::MSNF) * FPD_MSNF_FACTOR_FOR_CELSIUS) / water;

    Ok(-(fpd_pac + fpd_slt))
}

fn compute_fpd_curves(composition: Composition) -> Result<Curves> {
    let mut curves = Curves::empty();

    for x_axis in 0..100 {
        let cmp_fpd = compute_fpd_from_comp_and_frozen_water;

        let frozen_water_curve_fpd = cmp_fpd(composition, 0.0, x_axis as f64)?;
        let hf_curve_fpd = cmp_fpd(composition, composition.pac.hardness_factor, x_axis as f64)?;
        let hardness_curve_fpd = (frozen_water_curve_fpd + hf_curve_fpd) / 2.0;

        let frozen_water_curve_point = CurvePoint::new(frozen_water_curve_fpd, x_axis as f64);
        let hardness_curve_point = CurvePoint::new(hardness_curve_fpd, x_axis as f64);
        let hf_curve_point = CurvePoint::new(hf_curve_fpd, x_axis as f64);

        curves.frozen_water.push(frozen_water_curve_point);
        curves.hardness.push(hardness_curve_point);
        curves.hardness_factor.push(hf_curve_point);
    }

    Ok(curves)
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
impl FPD {
    pub fn get(&self, key: FpdKey) -> f64 {
        match key {
            FpdKey::FPD => self.fpd,
            FpdKey::ServingTemp => self.serving_temp,
            FpdKey::HardnessAt14C => self.hardness_at_14c,
        }
    }
}

impl Default for FPD {
    fn default() -> Self {
        Self::empty()
    }
}

#[cfg(test)]
mod tests {
    use std::sync::LazyLock;

    use super::*;

    use crate::composition::{Composition, PAC, Solids, SolidsBreakdown};

    use crate::tests::asserts::shadow_asserts::assert_eq;
    use crate::tests::asserts::*;

    const REF_FPD_FROM_PAC: [(f64, f64); 19] = [
        (0.0, 0.0),
        (3.0, 0.18),
        (6.0, 0.35),
        (93.0, 6.50),
        (96.0, 6.80),
        (177.0, 13.48),
        (180.0, 13.68),
        (0.5, 0.03),
        (1.0, 0.06),
        (1.5, 0.09),
        (2.0, 0.12),
        (2.5, 0.15),
        (93.5, 6.55),
        (94.0, 6.6),
        (94.5, 6.65),
        (95.0, 6.7),
        (95.5, 6.75),
        (177.125, 13.488333),
        (181.0, 13.746666),
    ];

    #[test]
    fn fpd_from_pac_interpolation() {
        for (pac, expected_fpd) in REF_FPD_FROM_PAC {
            let fpd = get_fpd_from_pac_interpolation(pac).unwrap();
            assert_abs_diff_eq!(fpd, expected_fpd, epsilon = TESTS_EPSILON);
        }
    }

    static REFERENCE_COMPOSITION: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .solids(
                Solids::new()
                    .milk(SolidsBreakdown::new().fats(5.82).snfs(12.0))
                    .other(SolidsBreakdown::new().sweeteners(22.18)),
            )
            .pac(PAC::new().sugars(22.18))
    });

    #[test]
    fn validate_reference_composition() {
        let comp = *REFERENCE_COMPOSITION;
        assert_eq!(comp.get(CompKey::MSNF), 12.0);
        assert_eq!(comp.get(CompKey::TotalSolids), 40.0);
        assert_eq!(comp.get(CompKey::PACtotal), 22.18);
    }

    const REFERENCE_FROZEN_WATER_FPD: [(f64, f64); 5] = [
        (0.0, -2.745),
        (10.0, -3.065),
        (20.0, -3.457),
        (30.0, -4.010),
        (40.0, -4.774),
    ];

    #[test]
    fn calculate_fdp_from_composition_and_frozen_water() {
        let comp = *REFERENCE_COMPOSITION;

        for (frozen_water, expected_fpd) in REFERENCE_FROZEN_WATER_FPD {
            let fpd = compute_fpd_from_comp_and_frozen_water(comp, 0.0, frozen_water).unwrap();
            assert_abs_diff_eq!(fpd, expected_fpd, epsilon = 0.0005);
        }
    }
}

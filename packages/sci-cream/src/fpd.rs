use serde::{Deserialize, Serialize};
use strum_macros::EnumIter;

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

use crate::{
    composition::{CompKey, Composition},
    constants::{
        FPD_MSNF_FACTOR_FOR_CELSIUS, PAC_TO_FPD_POLY_COEFFS, PAC_TO_FPD_TABLE,
        PAC_TO_FPD_TABLE_MAX_PAC, PAC_TO_FPD_TABLE_STEP, SERVING_TEMP_X_AXIS,
        TARGET_SERVING_TEMP_14C,
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
    pub x_axis: f64,
    pub temp: f64,
}

impl CurvePoint {
    pub fn new(x_axis: f64, temp: f64) -> Self {
        Self { x_axis, temp }
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
        let hardness_at_14c = get_x_axis_at_fpd(&curves.hardness, TARGET_SERVING_TEMP_14C);

        Ok(Self {
            fpd,
            serving_temp,
            hardness_at_14c: hardness_at_14c.unwrap_or(f64::NAN),
            curves,
        })
    }
}

pub fn get_fpd_from_pac_interpolation(pac: f64) -> Result<f64> {
    if pac < 0.0 {
        return Err(Error::NegativePacValue(pac));
    }

    let (step, max_pac) = (PAC_TO_FPD_TABLE_STEP, PAC_TO_FPD_TABLE_MAX_PAC);

    let floor_pac = (pac / step as f64).floor() as usize * step;
    let ceil_pac = (pac / step as f64).ceil() as usize * step;

    let (floor_pac, ceil_pac) = if ceil_pac <= max_pac {
        (floor_pac, ceil_pac)
    } else {
        (max_pac - step, max_pac)
    };

    let idx_floor_pac = floor_pac / step;
    let idx_ceil_pac = ceil_pac / step;

    let floor_fpd = PAC_TO_FPD_TABLE[idx_floor_pac].1;
    let ceil_fpd = PAC_TO_FPD_TABLE[idx_ceil_pac].1;

    let run = pac - floor_pac as f64;
    let slope = (ceil_fpd - floor_fpd) / step as f64;

    Ok(floor_fpd + slope * run)
}

pub fn get_fpd_from_pac_polynomial(pac: f64, coeffs: [f64; 3]) -> Result<f64> {
    if pac < 0.0 {
        return Err(Error::NegativePacValue(pac));
    }

    let [a, b, c] = coeffs;

    Ok((a * pac.powi(2)) + (b * pac) + c)
}

pub fn compute_fpd<F: Fn(f64) -> Result<f64>>(
    composition: Composition,
    hardness_factor: f64,
    frozen_water: f64,
    get_fpd_from_pac: &F,
) -> Result<f64> {
    let (comp, hf, fw) = (composition, hardness_factor, frozen_water);

    let water = comp.get(CompKey::Water) * ((100.0 - fw) / 100.0);
    let fpd_pac = get_fpd_from_pac((comp.pac.total_exc_hf() - hf) * 100.0 / water)?;
    let fpd_slt = (comp.get(CompKey::MSNF) * FPD_MSNF_FACTOR_FOR_CELSIUS) / water;

    Ok(-(fpd_pac + fpd_slt))
}

pub fn compute_fpd_curves(composition: Composition) -> Result<Curves> {
    let (comp, mut curves) = (composition, Curves::empty());

    for x_axis in 0..100 {
        let x_axis_f = x_axis as f64;

        // @todo Use interpolation for now for ease of comparison with sci-cream-legacy.ts
        let _ = PAC_TO_FPD_POLY_COEFFS; // _polynomial(pac, PAC_TO_FPD_POLY_COEFFS);
        let get_fpd_from_pac = get_fpd_from_pac_interpolation;

        let compute_fpd = |c, hf, fw| compute_fpd(c, hf, fw, &get_fpd_from_pac);

        let frozen_water_fpd = compute_fpd(comp, 0.0, x_axis_f)?;
        let hf_fpd = compute_fpd(comp, comp.pac.hardness_factor, x_axis_f)?;
        let hardness_fpd = (frozen_water_fpd + hf_fpd) / 2.0;

        let frozen_water_curve_point = CurvePoint::new(x_axis_f, frozen_water_fpd);
        let hf_curve_point = CurvePoint::new(x_axis_f, hf_fpd);
        let hardness_curve_point = CurvePoint::new(x_axis_f, hardness_fpd);

        curves.frozen_water.push(frozen_water_curve_point);
        curves.hardness_factor.push(hf_curve_point);
        curves.hardness.push(hardness_curve_point);
    }

    Ok(curves)
}

pub fn get_x_axis_at_fpd(curve: &[CurvePoint], target_fpd: f64) -> Option<f64> {
    for i in 0..curve.len() - 1 {
        let high = &curve[i];
        let low = &curve[i + 1];

        if high.temp >= target_fpd && low.temp <= target_fpd {
            let run = target_fpd - high.temp;
            let slope = (low.x_axis - high.x_axis) / (low.temp - high.temp);

            return Some(high.x_axis + run * slope);
        }
    }

    None
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
        // (pac, expected_fpd)
        (0.0, 0.00),
        (0.5, 0.03),
        (1.0, 0.06),
        (1.5, 0.09),
        (2.0, 0.12),
        (2.5, 0.15),
        (3.0, 0.18),
        (6.0, 0.35),
        (93.0, 6.50),
        (93.5, 6.55),
        (94.0, 6.60),
        (94.5, 6.65),
        (95.0, 6.70),
        (95.5, 6.75),
        (96.0, 6.80),
        (177.0, 13.48),
        (177.125, 13.488333),
        (180.0, 13.68),
        (181.0, 13.746666),
    ];

    #[test]
    fn get_fpd_from_pac_interpolation() {
        for (pac, expected_fpd) in REF_FPD_FROM_PAC {
            let fpd = super::get_fpd_from_pac_interpolation(pac).unwrap();
            assert_abs_diff_eq!(fpd, expected_fpd, epsilon = TESTS_EPSILON);
        }
    }

    #[test]
    fn get_fpd_from_pac_polynomial() {
        let get_fpd_poly = |pac| super::get_fpd_from_pac_polynomial(pac, PAC_TO_FPD_POLY_COEFFS);

        for (pac, expected_fpd) in REF_FPD_FROM_PAC {
            // Interpolation and polynomial diverge at high PAC
            let epsilon = if pac < 177.0 { 0.1 } else { 0.3 };

            let fpd = get_fpd_poly(pac).unwrap();
            assert_abs_diff_eq!(fpd, expected_fpd, epsilon = epsilon);
        }
    }

    // Reference composition from Goff + Hartel, Table 6.2, Ice Cream
    static REF_COMP: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .solids(
                Solids::new()
                    .milk(SolidsBreakdown::new().fats(5.82).snfs(12.0))
                    .other(SolidsBreakdown::new().sweeteners(22.18)),
            )
            .pac(PAC::new().sugars(22.18))
    });

    // Same as [`REF_COMP`], but with alcohol added
    static REF_COMP_WITH_ALCOHOL: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .solids(
                Solids::new()
                    .milk(SolidsBreakdown::new().fats(5.82).snfs(12.0))
                    .other(SolidsBreakdown::new().sweeteners(22.18)),
            )
            .alcohol(2.0)
            .pac(PAC::new().sugars(22.18).alcohol(14.8))
    });

    #[test]
    fn validate_reference_compositions() {
        let comp = *REF_COMP;
        assert_eq!(comp.get(CompKey::MSNF), 12.0);
        assert_eq!(comp.get(CompKey::TotalSolids), 40.0);
        assert_eq!(comp.get(CompKey::Water), 60.0);
        assert_eq!(comp.get(CompKey::PACtotal), 22.18);

        let comp = *REF_COMP_WITH_ALCOHOL;
        assert_eq!(comp.get(CompKey::MSNF), 12.0);
        assert_eq!(comp.get(CompKey::Alcohol), 2.0);
        assert_eq!(comp.get(CompKey::TotalSolids), 40.0);
        assert_eq!(comp.get(CompKey::Water), 58.0);
        assert_eq!(comp.get(CompKey::PACsgr), 22.18);
        assert_eq!(comp.get(CompKey::PACalc), 14.8);
        assert_abs_diff_eq!(comp.get(CompKey::PACtotal), 36.98, epsilon = TESTS_EPSILON);
    }

    // Ice Cream, Goff + Hartel, Table 6.2, page 184
    const REF_FROZEN_WATER_FPD: [(f64, f64); 10] = [
        (0.0, -2.74),
        (10.0, -3.06),
        (20.0, -3.45),
        (30.0, -4.01),
        (40.0, -4.76),
        (50.0, -5.87),
        (60.0, -7.63),
        (70.0, -10.79),
        (75.0, -13.16),
        (80.0, -16.37), // BAD?, ref is -16.61
    ];

    // Check alcohol not counted as water/solid
    const REF_FROZEN_WATER_FPD_WITH_ALCOHOL: [(f64, f64); 2] = [(0.0, -4.649), (10.0, -5.226)];

    // Interpolation and polynomial PAC -> FPD calculation diverge at high frozen water
    const REF_FROZEN_WATER_FPD_INTER: [(f64, f64); 2] = [(85.0, -21.270), (90.0, -31.064)];
    const REF_FROZEN_WATER_FPD_POLY: [(f64, f64); 2] = [(85.0, -23.71), (90.0, -39.66)];

    fn validate_compute_fpd<F: Fn(f64) -> Result<f64>>(
        get_fpd_from_pac: &F,
        ref_fpd_sets: &[(Composition, &[(f64, f64)])],
        epsilon: f64,
    ) {
        let compute_pd_inter =
            |comp: Composition, hf: f64, fw: f64| compute_fpd(comp, hf, fw, get_fpd_from_pac);

        for (comp, ref_fpd) in ref_fpd_sets {
            for (frozen_water, expected_fpd) in *ref_fpd {
                let fpd = compute_pd_inter(*comp, 0.0, *frozen_water).unwrap();
                assert_abs_diff_eq!(fpd, expected_fpd, epsilon = epsilon);
            }
        }
    }

    #[test]
    fn compute_fpd_interpolation() {
        validate_compute_fpd(
            &super::get_fpd_from_pac_interpolation,
            &[
                (*REF_COMP, &REF_FROZEN_WATER_FPD[..]),
                (*REF_COMP_WITH_ALCOHOL, &REF_FROZEN_WATER_FPD_WITH_ALCOHOL),
                (*REF_COMP, &REF_FROZEN_WATER_FPD_INTER),
            ][..],
            0.015,
        );
    }

    #[test]
    fn compute_fpd_polynomial() {
        let get_fpd_poly = |pac| super::get_fpd_from_pac_polynomial(pac, PAC_TO_FPD_POLY_COEFFS);

        validate_compute_fpd(
            &get_fpd_poly,
            &[
                (*REF_COMP, &REF_FROZEN_WATER_FPD[..]),
                (*REF_COMP_WITH_ALCOHOL, &REF_FROZEN_WATER_FPD_WITH_ALCOHOL),
                (*REF_COMP, &REF_FROZEN_WATER_FPD_POLY),
            ][..],
            0.4,
        );
    }
    #[test]
    fn compute_fpd_interpolation_with_hf() {
        for (comp, ref_fpd) in &[
            (*REF_COMP, &REF_FROZEN_WATER_FPD[..]),
            (*REF_COMP_WITH_ALCOHOL, &REF_FROZEN_WATER_FPD_WITH_ALCOHOL),
            (*REF_COMP, &REF_FROZEN_WATER_FPD_INTER),
        ] {
            let comp_pac_less_hf = Composition {
                pac: PAC {
                    sugars: comp.pac.sugars - 10.0,
                    ..comp.pac
                },
                ..*comp
            };

            for (frozen_water, expected_fpd) in *ref_fpd {
                let compute_fpd = |c: Composition, hf: f64, fw: f64| {
                    compute_fpd(c, hf, fw, &super::get_fpd_from_pac_interpolation)
                };

                let fpd_frozen_water = compute_fpd(*comp, 0.0, *frozen_water).unwrap();
                let fpd_with_added_hf = compute_fpd(*comp, 10.0, *frozen_water).unwrap();
                let fpd_pac_less_hf = compute_fpd(comp_pac_less_hf, 0.0, *frozen_water).unwrap();
                assert_abs_diff_eq!(fpd_frozen_water, *expected_fpd, epsilon = 0.015);
                assert_abs_diff_eq!(fpd_with_added_hf, fpd_pac_less_hf, epsilon = TESTS_EPSILON);
            }
        }
    }

    #[test]
    fn get_x_axis_at_fpd() {
        let curve = &REF_FROZEN_WATER_FPD
            .iter()
            .map(|(x_axis, temp)| CurvePoint::new(*x_axis, *temp))
            .collect::<Vec<CurvePoint>>();

        for point in curve {
            let x_axis = super::get_x_axis_at_fpd(curve, point.temp).unwrap();
            assert_abs_diff_eq!(x_axis, point.x_axis, epsilon = TESTS_EPSILON);
        }

        for fpd in [-1.0, 85.0] {
            assert_true!(super::get_x_axis_at_fpd(curve, fpd).is_none());
        }

        for (expected_x_axis, target_fpd) in &[(5.0, -2.9), (7.5, -2.98), (77.5, -14.765)] {
            let x_axis = super::get_x_axis_at_fpd(curve, *target_fpd).unwrap();
            assert_abs_diff_eq!(x_axis, *expected_x_axis, epsilon = TESTS_EPSILON);
        }
    }
}

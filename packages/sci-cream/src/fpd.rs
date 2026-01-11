use approx::AbsDiffEq;
use approx::abs_diff_eq;
use serde::{Deserialize, Serialize};
use struct_iterable::Iterable;
use strum_macros::EnumIter;

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

use crate::{
    composition::{CompKey, Composition},
    constants::{
        COMPOSITION_EPSILON,
        fpd::{
            CORVITTO_PAC_TO_SERVING_TEMP_TABLE, FPD_CONST_FOR_MSNF_WS_SALTS, PAC_TO_FPD_POLY_COEFFS, PAC_TO_FPD_TABLE,
            SERVING_TEMP_X_AXIS, TARGET_SERVING_TEMP_14C,
        },
    },
    error::{Error, Result},
    util::iter_all_abs_diff_eq,
};

#[cfg(doc)]
use crate::constants::pac;

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

/// [Freezing Point Depression Curves](crate::docs#freezing-point-depression-curve)...
#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Clone, Debug)]
pub struct Curves {
    #[cfg_attr(feature = "wasm", wasm_bindgen(getter_with_clone))]
    pub frozen_water: Vec<CurvePoint>,
    #[cfg_attr(feature = "wasm", wasm_bindgen(getter_with_clone))]
    pub hardness: Vec<CurvePoint>,
}

/// [Freezing Point Depression (FPD)](crate::docs#freezing-point-depression) properties...
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
    /// Create empty FPD curves, which are straight lines at 0°C, equivalent to those of 100% water
    pub fn empty() -> Self {
        let make_empty_curve = || (0..100).map(|x_axis| CurvePoint::new(f64::from(x_axis), 0.0)).collect();

        Self {
            frozen_water: make_empty_curve(),
            hardness: make_empty_curve(),
        }
    }
}

impl FPD {
    /// Create an empty FPD properties, which is equivalent to the properties of a 100% water
    pub fn empty() -> Self {
        Self {
            fpd: 0.0,
            serving_temp: 0.0,
            hardness_at_14c: f64::NAN,
            curves: Curves::empty(),
        }
    }

    /// Compute FPD properties from a given mix composition.
    ///
    /// A [`Composition::empty()`] is equivalent to a 100% water composition, and will result in an
    /// [`FPD`](Self::fpd) of 0°C, [serving temperature](Self::serving_temp) of 0°C, [hardness at
    /// -14°C](Self::hardness_at_14c) of [`f64::NAN`], and straight [curves](Self::curves) at 0°C.
    pub fn compute_from_composition(composition: Composition) -> Result<Self> {
        let curves = compute_fpd_curves(
            composition,
            PacToFpdMethod::Interpolation,
            FpdCurvesComputationMethod::ModifiedGoffHartelCorvitto,
        )?;

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

    let (step, max_pac) = (PAC_TO_FPD_TABLE[1].0, PAC_TO_FPD_TABLE.last().unwrap_or_else(|| unreachable!()).0);

    #[expect(
        clippy::cast_precision_loss,
        clippy::cast_possible_truncation,
        clippy::cast_sign_loss
    )]
    let (floor_pac, ceil_pac) =
        (((pac / step as f64).floor() as usize * step), ((pac / step as f64).ceil() as usize * step));

    let (floor_pac, ceil_pac) = if ceil_pac <= max_pac {
        (floor_pac, ceil_pac)
    } else {
        (max_pac - step, max_pac)
    };

    let idx_floor_pac = floor_pac / step;
    let idx_ceil_pac = ceil_pac / step;

    let floor_fpd = PAC_TO_FPD_TABLE[idx_floor_pac].1;
    let ceil_fpd = PAC_TO_FPD_TABLE[idx_ceil_pac].1;

    #[expect(clippy::cast_precision_loss)]
    let run = pac - floor_pac as f64;
    #[expect(clippy::cast_precision_loss)]
    let slope = (ceil_fpd - floor_fpd) / step as f64;

    Ok(-(floor_fpd + slope * run))
}

/// Compute FPD from PAC using a polynomial equation with given coefficients
///
/// The coefficients are in the form `[a, b, c]` for the polynomial equation `a*x^2 + b*x + c`.
/// They are an argument for flexibility, but are likely to always be [`PAC_TO_FPD_POLY_COEFFS`].
///
/// <div class='warning'>
/// Summing multiple PAC values and then computing FPD with this function can yield significantly
/// different results than computing FPD for each PAC value separately and summing the FPDs,
/// particularly at higher PAC values. Summing the PAC values is the recommended approach.
/// </div>
pub fn get_fpd_from_pac_polynomial(pac: f64, coeffs: Option<[f64; 3]>) -> Result<f64> {
    let [a, b, c] = coeffs.unwrap_or(PAC_TO_FPD_POLY_COEFFS);

    if pac < 0.0 {
        return Err(Error::NegativePacValue(pac));
    }

    Ok((a * pac.powi(2)) + (b * pac) + c)
}

/// Compute PAC from FPD using a polynomial equation with given coefficients
///
/// The coefficients are in the form `[a, b, c]` for the polynomial equation `a*x^2 + b*x + c`.
/// They are an argument for flexibility, but are likely to always be [`PAC_TO_FPD_POLY_COEFFS`].
///
/// This function is the inverse of [`get_fpd_from_pac_polynomial`].
pub fn get_pac_from_fpd_polynomial(fpd: f64, coeffs: Option<[f64; 3]>) -> Result<f64> {
    let [a, b, c] = coeffs.unwrap_or(PAC_TO_FPD_POLY_COEFFS);

    if fpd > 0.0 {
        return Err(Error::PositiveFpdValue(fpd));
    }

    let discriminant = b.powi(2) - 4.0 * a * (c - fpd);

    if discriminant < 0.0 {
        return Err(Error::CannotComputePAC("Discriminant is negative, no real roots exist".to_string()));
    }

    let sqrt_discriminant = discriminant.sqrt();
    let root1 = (-b + sqrt_discriminant) / (2.0 * a);
    let root2 = (-b - sqrt_discriminant) / (2.0 * a);

    if root1 < 0.0 && root2 < 0.0 {
        return Err(Error::CannotComputePAC("Both roots are negative, PAC cannot be negative".to_string()));
    }

    if root1 > 0.0 && root2 > 0.0 {
        return Err(Error::CannotComputePAC("Both roots are positive, ambiguous PAC value".to_string()));
    }

    Ok(root1.max(root2))
}

pub fn get_serving_temp_from_pac_corvitto(pac: f64) -> Result<f64> {
    let first = CORVITTO_PAC_TO_SERVING_TEMP_TABLE[0];
    let last = CORVITTO_PAC_TO_SERVING_TEMP_TABLE
        .last()
        .unwrap_or_else(|| unreachable!());

    let slope = (first.1 - last.1) / (first.0 - last.0);
    let run = pac - first.0;

    Ok(slope * run + first.1)
}

#[derive(Iterable, PartialEq, Copy, Clone, Debug)]
pub struct GoffHartelFpdCurveStep {
    /// Percentage of total water in mix that's frozen at this step
    pub frozen_water: f64,
    /// g/100g of mix that is still liquid water at this step
    pub water: f64,
    /// Sucrose equivalent concentration (PACsgr) at this step, g/100g water
    pub se: f64,
    /// Sucrose equivalent salt concentration (PACslt) at this step, g/100g water
    pub sa: f64,
    /// Sucrose equivalent alcohol concentration (PACalc) at this step, g/100g water
    pub alc: f64,
    /// FPD due to sucrose equivalent concentration at this step, °C
    pub fpd_se: f64,
    /// FPD due to salt concentration (from `sa` and MSNF/WS salts) at this step, °C
    pub fpd_sa: f64,
    /// FPD due to alcohol concentration at this step, °C
    pub fpd_alc: f64,
    /// Total FPD at this step, °C
    pub fpd_total: f64,
}

impl GoffHartelFpdCurveStep {
    pub fn empty() -> Self {
        Self {
            frozen_water: f64::NAN,
            water: f64::NAN,
            se: f64::NAN,
            sa: f64::NAN,
            alc: f64::NAN,
            fpd_se: f64::NAN,
            fpd_sa: f64::NAN,
            fpd_alc: f64::NAN,
            fpd_total: f64::NAN,
        }
    }
}

/// Compute a single step in the FPD curve using the Goff & Hartel method (2013, p. 181)[^2]
#[doc = include_str!("../docs/bibs/2.md")]
pub fn compute_fpd_curve_step_goff_hartel(
    composition: Composition,
    next_frozen_water: f64,
    get_fpd_from_pac: &impl Fn(f64) -> Result<f64>,
) -> Result<GoffHartelFpdCurveStep> {
    let mut next = GoffHartelFpdCurveStep::empty();

    next.frozen_water = next_frozen_water;
    next.water = (100.0 - next.frozen_water) / 100.0 * composition.get(CompKey::Water);
    next.se = composition.get(CompKey::PACsgr) / next.water * 100.0;
    next.sa = composition.get(CompKey::PACslt) / next.water * 100.0;
    next.alc = composition.get(CompKey::PACalc) / next.water * 100.0;

    let fpd_msnf_ws = composition.get(CompKey::MSNF) * FPD_CONST_FOR_MSNF_WS_SALTS / next.water;
    next.fpd_se = get_fpd_from_pac(next.se)?;
    next.fpd_sa = get_fpd_from_pac(next.sa)? + fpd_msnf_ws;
    next.fpd_alc = get_fpd_from_pac(next.alc)?;

    next.fpd_total = next.fpd_se + next.fpd_sa + next.fpd_alc;

    Ok(next)
}

#[derive(Iterable, PartialEq, Copy, Clone, Debug)]
pub struct ModifiedGoffHartelCorvittoFpdCurveStep {
    /// Percentage of total water in mix that's frozen at this step
    pub frozen_water: f64,
    /// g/100g of mix that is still liquid water at this step
    pub water: f64,
    /// This includes PAC from salts in MSNF and WS, calculated with [`pac::MSNF_WS_SALTS`], and so
    /// [`FPD_CONST_FOR_MSNF_WS_SALTS`] is not applied separately as in the Goff & Hartel method.
    pub pac_exc_hf: f64,
    /// HF/water contribution to PAC at this step
    pub hf: f64,
    /// FPD due to PAC excluding hardness factor at this step, °C
    pub fpd_exc_hf: f64,
    /// FPD due to PAC and hardness factor at this step, °C
    pub fpd_inc_hf: f64,
}

impl ModifiedGoffHartelCorvittoFpdCurveStep {
    pub fn empty() -> Self {
        Self {
            frozen_water: f64::NAN,
            water: f64::NAN,
            pac_exc_hf: f64::NAN,
            hf: f64::NAN,
            fpd_exc_hf: f64::NAN,
            fpd_inc_hf: f64::NAN,
        }
    }
}

/// Compute a single step in the FPD curve using a modified Goff & Hartel & Corvitto method
///
/// This function implements a modified version of the Goff & Hartel method (2013, p. 181)[^2]
/// implemented in [`compute_fpd_curve_step_goff_hartel`], with the difference that the
/// contributions from salts in MSNF and WS are included in the PAC values, which are summed before
/// computing FPD. This can yield significantly different results than computing FPD for each PAC
/// value separately and then summing the FPDs, particularly at higher PAC values. I theorize that
/// this method is more accurate, but it needs further validation.
///
/// The Corvitto method (2005, p. 243)[^3] for calculating hardness with cocoa and nut ingredients
/// is also integrated here, subtracting the hardness factor from the total PAC before computing
/// a separate FPD including hardness factor.
#[doc = include_str!("../docs/bibs/2.md")]
#[doc = include_str!("../docs/bibs/3.md")]
pub fn compute_fpd_curve_step_modified_goff_hartel_corvitto(
    composition: Composition,
    next_frozen_water: f64,
    get_fpd_from_pac: &impl Fn(f64) -> Result<f64>,
) -> Result<ModifiedGoffHartelCorvittoFpdCurveStep> {
    let mut next = ModifiedGoffHartelCorvittoFpdCurveStep::empty();

    if abs_diff_eq!(composition.get(CompKey::Water), 0.0, epsilon = COMPOSITION_EPSILON) {
        return Ok(next);
    }

    next.frozen_water = next_frozen_water;
    next.water = (100.0 - next.frozen_water) / 100.0 * composition.get(CompKey::Water);

    // It's important to sum the PAC values before computing FPD, rather than computing FPD for
    // each PAC value separately and summing the FPDs. See [`get_fpd_from_pac_polynomial`]'s docs.
    next.pac_exc_hf = composition.get(CompKey::PACtotal) / next.water * 100.0;
    next.hf = composition.get(CompKey::HF) / next.water * 100.0;
    let pac_inc_hf = next.pac_exc_hf - next.hf;

    next.fpd_exc_hf = get_fpd_from_pac(next.pac_exc_hf)?;
    next.fpd_inc_hf = if pac_inc_hf >= 0.0 {
        get_fpd_from_pac(pac_inc_hf)?
    } else {
        f64::NAN
    };

    Ok(next)
}

#[derive(Copy, Clone, Debug)]
pub enum PacToFpdMethod {
    Interpolation,
    Polynomial,
}

#[derive(Copy, Clone, Debug)]
pub enum FpdCurvesComputationMethod {
    GoffHartel,
    ModifiedGoffHartelCorvitto,
}

pub fn compute_fpd_curves(
    composition: Composition,
    pac_to_fpd_method: PacToFpdMethod,
    curves_method: FpdCurvesComputationMethod,
) -> Result<Curves> {
    let mut curves = Curves {
        frozen_water: Vec::new(),
        hardness: Vec::new(),
    };

    for x_axis in 0..100 {
        let frozen_water = f64::from(x_axis);

        let get_fpd_from_pac = match pac_to_fpd_method {
            PacToFpdMethod::Interpolation => get_fpd_from_pac_interpolation,
            PacToFpdMethod::Polynomial => |pac| get_fpd_from_pac_polynomial(pac, None),
        };

        let (fpd_fw, fpd_hardness) = match curves_method {
            FpdCurvesComputationMethod::GoffHartel => {
                compute_fpd_curve_step_goff_hartel(composition, frozen_water, &get_fpd_from_pac)
                    .map(|step| (step.fpd_total, f64::NAN))?
            }
            FpdCurvesComputationMethod::ModifiedGoffHartelCorvitto => {
                compute_fpd_curve_step_modified_goff_hartel_corvitto(composition, frozen_water, &get_fpd_from_pac)
                    .map(|step| (step.fpd_exc_hf, step.fpd_inc_hf))?
            }
        };

        curves.frozen_water.push(CurvePoint::new(frozen_water, fpd_fw));
        curves.hardness.push(CurvePoint::new(frozen_water, fpd_hardness));
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

impl AbsDiffEq for GoffHartelFpdCurveStep {
    type Epsilon = f64;

    fn default_epsilon() -> Self::Epsilon {
        f64::default_epsilon()
    }

    fn abs_diff_eq(&self, other: &Self, epsilon: Self::Epsilon) -> bool {
        iter_all_abs_diff_eq::<f64, f64, Self>(self, other, epsilon)
    }
}

impl AbsDiffEq for ModifiedGoffHartelCorvittoFpdCurveStep {
    type Epsilon = f64;

    fn default_epsilon() -> Self::Epsilon {
        f64::default_epsilon()
    }

    fn abs_diff_eq(&self, other: &Self, epsilon: Self::Epsilon) -> bool {
        iter_all_abs_diff_eq::<f64, f64, Self>(self, other, epsilon)
    }
}

#[cfg(test)]
#[cfg_attr(coverage, coverage(off))]
#[allow(clippy::unwrap_used)]
mod tests {
    use std::sync::LazyLock;

    use crate::tests::asserts::shadow_asserts::assert_eq;
    use crate::tests::asserts::*;

    use super::*;
    use crate::{
        composition::{Carbohydrates, CompKey, Composition, Fats, PAC, Solids, SolidsBreakdown, Sugars},
        constants::{
            composition::{STD_LACTOSE_IN_MSNF, STD_LACTOSE_IN_WS},
            fpd::{CORVITTO_PAC_TO_SERVING_TEMP_TABLE, FPD_CONST_FOR_MSNF_WS_SALTS},
            pac,
        },
    };

    fn get_fpd_from_pac_inter(pac: f64) -> Result<f64> {
        super::get_fpd_from_pac_interpolation(pac)
    }

    fn get_fpd_from_pac_poly(pac: f64) -> Result<f64> {
        super::get_fpd_from_pac_polynomial(pac, None)
    }

    /// Using [`PAC_TO_FPD_TABLE`] as f64 for testing `get_fpd_from_pac_*` functions
    static PAC_TO_FPD_TABLE_FLOAT: LazyLock<Vec<(f64, f64)>> = LazyLock::new(|| {
        #[expect(clippy::cast_precision_loss)]
        PAC_TO_FPD_TABLE
            .iter()
            .map(|(pac, fpd)| (*pac as f64, -*fpd))
            .collect::<Vec<(f64, f64)>>()
    });

    /// Extend [`PAC_TO_FPD_TABLE_FLOAT`] with more granular values for testing
    const PAC_TO_FPD_TABLE_EXTENDED: [(f64, f64); 12] = [
        // (pac, expected_fpd)
        (0.5, -0.03),
        (1.0, -0.06),
        (1.5, -0.09),
        (2.0, -0.12),
        (2.5, -0.15),
        (93.5, -6.55),
        (94.0, -6.60),
        (94.5, -6.65),
        (95.0, -6.70),
        (95.5, -6.75),
        (177.1, -13.4867),
        (181.0, -13.7467),
    ];

    #[test]
    fn get_fpd_from_pac_interpolation() {
        for ref_table in [
            PAC_TO_FPD_TABLE_FLOAT.as_slice(),
            &PAC_TO_FPD_TABLE_EXTENDED[..],
            // Outliers that differ between interpolation and polynomial methods
            &[(38.2, -2.35)],
        ] {
            for (pac, expected_fpd) in ref_table {
                let fpd = get_fpd_from_pac_inter(*pac).unwrap();
                assert_abs_diff_eq!(fpd, expected_fpd, epsilon = 0.001);
            }
        }
    }

    #[test]
    fn get_fpd_from_pac_polynomial() {
        for ref_table in [
            PAC_TO_FPD_TABLE_FLOAT.as_slice(),
            &PAC_TO_FPD_TABLE_EXTENDED[..],
            // Outliers that differ between interpolation and polynomial methods
            &[(38.2, -2.347)],
        ] {
            for (pac, expected_fpd) in ref_table {
                let fpd = get_fpd_from_pac_poly(*pac).unwrap();
                assert_abs_diff_eq!(fpd, expected_fpd, epsilon = 0.35);
            }
        }
    }

    #[test]
    fn get_fpd_from_pac_polynomial_vs_interpolation() {
        #[expect(
            clippy::cast_precision_loss,
            clippy::cast_possible_truncation,
            clippy::cast_sign_loss
        )]
        for pac_int in 0..=((200.0 / 0.25) as usize) {
            let pac = pac_int as f64 * 0.25;

            // Polynomial vs interpolation start to diverge a lot after PAC ~180
            let epsilon = if pac <= 180.0 { 0.35 } else { 0.85 };

            let fpd_poly = get_fpd_from_pac_poly(pac).unwrap();
            let fpd_inter = get_fpd_from_pac_inter(pac).unwrap();

            assert_abs_diff_eq!(fpd_poly, fpd_inter, epsilon = epsilon);
        }
    }

    #[test]
    fn get_fpd_from_pac_interpolation_combine_pac_vs_fpd() {
        let whole_fpd = get_fpd_from_pac_inter(200.0).unwrap();
        let half_fpd = get_fpd_from_pac_inter(100.0).unwrap();
        let diff = (whole_fpd - half_fpd * 2.0).abs();
        assert_abs_diff_eq!(diff, 0.745, epsilon = 0.01);
    }

    #[test]
    fn get_fpd_from_pac_polynomial_combine_pac_vs_fpd() {
        let whole_fpd = get_fpd_from_pac_poly(200.0).unwrap();
        let half_fpd = get_fpd_from_pac_poly(100.0).unwrap();
        let diff = (whole_fpd - half_fpd * 2.0).abs();

        // Significant divergence at higher PAC values, see docs for [`get_fpd_from_pac_polynomial`]
        assert_abs_diff_eq!(diff, 1.8, epsilon = 0.01);
    }

    /// [`get_fpd_from_pac_polynomial`] above verifies the sanity of get_fpd_from_pac_polynomial.
    /// With that verified, we can generate a reference table for testing other related functions.
    static PAC_TO_FPD_TABLE_POLY: LazyLock<Vec<(f64, f64)>> = LazyLock::new(|| {
        #[expect(
            clippy::cast_precision_loss,
            clippy::cast_possible_truncation,
            clippy::cast_sign_loss
        )]
        (0..=((200.0 / 0.25) as usize))
            .map(|pac_int| pac_int as f64 * 0.25)
            .map(|pac| (pac, super::get_fpd_from_pac_polynomial(pac, None).unwrap()))
            .collect()
    });

    #[test]
    fn get_pac_from_fpd_polynomial() {
        for (expected_pac, fpd) in PAC_TO_FPD_TABLE_POLY.as_slice() {
            assert_eq_flt_test!(super::get_pac_from_fpd_polynomial(*fpd, None).unwrap(), *expected_pac);
        }
    }

    #[test]
    fn pac_msnf_ws_salts() {
        assert_eq_flt_test!(
            super::get_pac_from_fpd_polynomial(FPD_CONST_FOR_MSNF_WS_SALTS, None).unwrap(),
            pac::MSNF_WS_SALTS
        );
    }

    /// Ref. composition for [`REF_FROZEN_WATER_FPD`] (Goff & Hartel, 2013, Table 6.2, p. 184)[^2]
    ///
    /// _10% MSNF, 2% whey solids, 12% sucrose, 4% 42DE CSS, 60% water (40% total solids)_
    #[doc = include_str!("../docs/bibs/2.md")]
    static REF_COMP: LazyLock<Composition> = LazyLock::new(|| {
        let (msnf, ws, sucrose, css_42de, total_solids) = (10.0, 2.0, 12.0, 4.0, 40.0);

        let lactose = (msnf * STD_LACTOSE_IN_MSNF) + (ws * STD_LACTOSE_IN_WS);
        let milk_snfs = msnf + ws - (lactose);
        let milk_fats = total_solids - sucrose - css_42de - lactose - milk_snfs;

        let milk_solids = SolidsBreakdown::new()
            .fats(Fats::new().total(milk_fats))
            .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(lactose)))
            .others(milk_snfs);

        let other_solids = SolidsBreakdown::new()
            .carbohydrates(Carbohydrates::new().sugars(Sugars::new().sucrose(sucrose + css_42de)));

        Composition::new()
            .solids(Solids::new().milk(milk_solids).other(other_solids))
            .pac(
                PAC::new()
                    .sugars(22.18)
                    .msnf_ws_salts((10.0 + 2.0) * pac::MSNF_WS_SALTS / 100.0),
            )
    });

    /// Same as [`REF_COMP`], but with alcohol added
    static REF_COMP_WITH_ALCOHOL: LazyLock<Composition> = LazyLock::new(|| {
        let mut ref_comp = *REF_COMP;
        ref_comp.alcohol.by_weight = 2.0;
        ref_comp.pac.alcohol = 14.8;
        ref_comp
    });

    /// Same as [`REF_COMP`], but with hardness factor added
    static REF_COMP_WITH_HF: LazyLock<Composition> = LazyLock::new(|| {
        let mut ref_comp = *REF_COMP;
        ref_comp.pac.hardness_factor = 10.0;
        ref_comp
    });

    #[test]
    fn validate_reference_compositions() {
        let comp = *REF_COMP;
        assert_eq!(comp.get(CompKey::MSNF), 12.0);
        assert_eq!(comp.get(CompKey::TotalSolids), 40.0);
        assert_eq!(comp.get(CompKey::Water), 60.0);
        assert_eq!(comp.get(CompKey::PACsgr), 22.18);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 4.4088);
        assert_eq_flt_test!(comp.get(CompKey::PACtotal), 26.5888);

        let comp = *REF_COMP_WITH_ALCOHOL;
        assert_eq!(comp.get(CompKey::MSNF), 12.0);
        assert_eq!(comp.get(CompKey::Alcohol), 2.0);
        assert_eq!(comp.get(CompKey::TotalSolids), 40.0);
        assert_eq!(comp.get(CompKey::Water), 58.0);
        assert_eq!(comp.get(CompKey::PACsgr), 22.18);
        assert_eq!(comp.get(CompKey::PACalc), 14.8);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 4.4088);
        assert_eq_flt_test!(comp.get(CompKey::PACtotal), 41.3888);

        let comp = *REF_COMP_WITH_HF;
        assert_eq!(comp.get(CompKey::MSNF), 12.0);
        assert_eq!(comp.get(CompKey::TotalSolids), 40.0);
        assert_eq!(comp.get(CompKey::Water), 60.0);
        assert_eq!(comp.get(CompKey::PACsgr), 22.18);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 4.4088);
        assert_eq!(comp.get(CompKey::HF), 10.0);
        assert_eq_flt_test!(comp.get(CompKey::PACtotal), 26.5888);
        assert_eq_flt_test!(comp.get(CompKey::PACtotal) - comp.get(CompKey::HF), 16.5888);
    }

    /// Reference freezing curve for [`REF_COMP`] (Goff & Hartel, 2013, Table 6.2, p. 184)[^2]
    #[doc = include_str!("../docs/bibs/2.md")]
    static REF_COMP_FREEZING_CURVE: LazyLock<Vec<GoffHartelFpdCurveStep>> = LazyLock::new(|| {
        [
            // (fw, w,    se,  fpd_se, fpd_sa, fpd_t)
            (0.0, 60.0, 36.97, -2.27, -0.47, -2.74),
            (10.0, 54.0, 41.07, -2.53, -0.53, -3.06),
            (20.0, 48.0, 46.21, -2.86, -0.59, -3.45),
            (30.0, 42.0, 52.81, -3.33, -0.68, -4.01),
            (40.0, 36.0, 61.61, -3.97, -0.79, -4.76),
            (50.0, 30.0, 73.93, -4.92, -0.95, -5.87),
            (60.0, 24.0, 92.42, -6.45, -1.18, -7.63),
            (70.0, 18.0, 123.22, -9.21, -1.58, -10.79),
            (75.0, 15.0, 147.87, -11.26, -1.90, -13.16),
            (80.0, 12.0, 184.83, -14.27, -2.37, -16.61),
        ]
        .into_iter()
        .map(|(fw, w, se, fpd_se, fpd_sa, fpd_t)| GoffHartelFpdCurveStep {
            frozen_water: fw,
            water: w,
            se,
            sa: 0.0,
            alc: 0.0,
            fpd_se,
            fpd_sa,
            fpd_alc: 0.0,
            fpd_total: fpd_t,
        })
        .collect()
    });

    /// Based on [`REF_COMP_FREEZING_CURVE`] but using [`REF_COMP_WITH_ALCOHOL`]
    static REF_COMP_WITH_ALCOHOL_FREEZING_CURVE: LazyLock<Vec<GoffHartelFpdCurveStep>> = LazyLock::new(|| {
        [
            // (fw, w,    se,  alc, fpd_se, fpd_sa, fpd_alc, fpd_t)
            (0.0, 58.0, 38.24, 25.52, -2.47, -0.49, -1.62, -4.58),
            (10.0, 52.2, 42.49, 28.35, -2.76, -0.54, -1.81, -5.12),
        ]
        .into_iter()
        .map(|(fw, w, se, alc, fpd_se, fpd_sa, fpd_alc, fpd_t)| GoffHartelFpdCurveStep {
            frozen_water: fw,
            water: w,
            se,
            sa: 0.0,
            alc,
            fpd_se,
            fpd_sa,
            fpd_alc,
            fpd_total: fpd_t,
        })
        .collect()
    });

    #[test]
    fn compute_fpd_curve_goff_hartel_interpolation() {
        for ref_step in REF_COMP_FREEZING_CURVE.iter() {
            let step =
                compute_fpd_curve_step_goff_hartel(*REF_COMP, ref_step.frozen_water, &get_fpd_from_pac_inter).unwrap();

            assert_abs_diff_eq!(step, ref_step, epsilon = 0.27);
        }
    }

    #[test]
    fn compute_fpd_curve_goff_hartel_polynomial() {
        for ref_step in REF_COMP_FREEZING_CURVE.iter() {
            let step =
                compute_fpd_curve_step_goff_hartel(*REF_COMP, ref_step.frozen_water, &get_fpd_from_pac_poly).unwrap();

            assert_abs_diff_eq!(step, ref_step, epsilon = 0.31);
        }
    }

    #[test]
    fn compute_fpd_curve_goff_hartel_polynomial_with_alcohol() {
        for ref_step in REF_COMP_WITH_ALCOHOL_FREEZING_CURVE.iter() {
            let step = compute_fpd_curve_step_goff_hartel(
                *REF_COMP_WITH_ALCOHOL,
                ref_step.frozen_water,
                &get_fpd_from_pac_poly,
            )
            .unwrap();

            assert_abs_diff_eq!(step, ref_step, epsilon = 0.005);
        }
    }

    static PAC_SALT_LOOKUP: LazyLock<Vec<(f64, f64)>> = LazyLock::new(|| {
        vec![
            // pac.salt == 4.4088
            // (water, pac_slt)
            (60.0, 7.348),
            (58.0, 7.601),
            (54.0, 8.164),
            (52.2, 8.398),
            (48.0, 9.185),
            (42.0, 10.497),
            (36.0, 12.247),
            (30.0, 14.696),
            (24.0, 18.37),
            (18.0, 24.493),
            (15.0, 29.392),
            (12.0, 36.74),
        ]
    });

    fn map_goff_hartel_to_modified_corvitto(
        step: &GoffHartelFpdCurveStep,
    ) -> (ModifiedGoffHartelCorvittoFpdCurveStep, f64) {
        let pac_slt = PAC_SALT_LOOKUP
            .iter()
            .find(|(water, _)| *water == step.water)
            .unwrap()
            .1;

        (
            ModifiedGoffHartelCorvittoFpdCurveStep {
                frozen_water: step.frozen_water,
                water: step.water,
                pac_exc_hf: step.se + step.alc + pac_slt,
                hf: 0.0,
                fpd_exc_hf: step.fpd_total,
                fpd_inc_hf: step.fpd_total,
            },
            pac_slt,
        )
    }

    /// The same as [`REF_COMP_FREEZING_CURVE`], but for with a `pac_slt` component added
    static REF_COMP_FREEZING_CURVE_MODIFIED_GOFF_HARTEL_CORVITTO: LazyLock<
        Vec<(ModifiedGoffHartelCorvittoFpdCurveStep, f64)>,
    > = LazyLock::new(|| {
        REF_COMP_FREEZING_CURVE
            .iter()
            .map(map_goff_hartel_to_modified_corvitto)
            .collect()
    });

    /// The same as [`REF_COMP_WITH_ALCOHOL_FREEZING_CURVE`], but for with a `pac_slt` added
    static REF_COMP_FREEZING_CURVE_MODIFIED_GOFF_HARTEL_CORVITTO_WITH_ALCOHOL: LazyLock<
        Vec<(ModifiedGoffHartelCorvittoFpdCurveStep, f64)>,
    > = LazyLock::new(|| {
        REF_COMP_WITH_ALCOHOL_FREEZING_CURVE
            .iter()
            .map(map_goff_hartel_to_modified_corvitto)
            .collect()
    });

    #[test]
    fn get_fpd_from_pac_modified_goff_hartel_corvitto_polynomial() {
        for (ref_step, (_, pac_slt)) in REF_COMP_FREEZING_CURVE
            .iter()
            .zip(REF_COMP_FREEZING_CURVE_MODIFIED_GOFF_HARTEL_CORVITTO.iter())
        {
            assert_abs_diff_eq!(get_fpd_from_pac_poly(*pac_slt).unwrap(), ref_step.fpd_sa, epsilon = 0.05);
        }
    }

    #[test]
    fn compute_fpd_curve_modified_goff_hartel_corvitto_polynomial() {
        for (ref_step, _) in REF_COMP_FREEZING_CURVE_MODIFIED_GOFF_HARTEL_CORVITTO.iter() {
            let step = compute_fpd_curve_step_modified_goff_hartel_corvitto(
                *REF_COMP,
                ref_step.frozen_water,
                &get_fpd_from_pac_poly,
            )
            .unwrap();

            // This divergence at higher PAC values is expected due to the different way of summing
            // PAC before calculating FPD, as explained in the docs [`get_fpd_from_pac_polynomial`]
            let epsilon = if ref_step.pac_exc_hf <= 177.0 { 0.31 } else { 1.4 };

            assert_abs_diff_eq!(&step, ref_step, epsilon = epsilon);
        }
    }

    #[test]
    fn compute_fpd_curve_modified_goff_hartel_corvitto_polynomial_with_alcohol() {
        for (ref_step, _) in REF_COMP_FREEZING_CURVE_MODIFIED_GOFF_HARTEL_CORVITTO_WITH_ALCOHOL.iter() {
            let step = compute_fpd_curve_step_modified_goff_hartel_corvitto(
                *REF_COMP_WITH_ALCOHOL,
                ref_step.frozen_water,
                &get_fpd_from_pac_poly,
            )
            .unwrap();

            assert_abs_diff_eq!(&step, ref_step, epsilon = 0.3);
        }
    }

    #[test]
    fn compute_fpd_curve_modified_goff_hartel_corvitto_polynomial_with_hf() {
        let comp_pac_less_hf = {
            let mut comp = *REF_COMP;
            comp.pac.sugars -= 10.0;
            comp
        };

        for (ref_step, _) in REF_COMP_FREEZING_CURVE_MODIFIED_GOFF_HARTEL_CORVITTO.iter() {
            let step_with_hf = compute_fpd_curve_step_modified_goff_hartel_corvitto(
                *REF_COMP_WITH_HF,
                ref_step.frozen_water,
                &get_fpd_from_pac_poly,
            )
            .unwrap();

            let step_pac_less_hf = compute_fpd_curve_step_modified_goff_hartel_corvitto(
                comp_pac_less_hf,
                ref_step.frozen_water,
                &get_fpd_from_pac_poly,
            )
            .unwrap();

            assert_eq_flt_test!(step_with_hf.hf, (10.0 / ref_step.water) * 100.0);
            assert_abs_diff_eq!(step_with_hf.pac_exc_hf, ref_step.pac_exc_hf, epsilon = 0.01);
            assert_eq_flt_test!(step_with_hf.fpd_inc_hf, step_pac_less_hf.fpd_exc_hf);
        }
    }

    #[test]
    fn compute_fpd_curve_modified_goff_hartel_corvitto_polynomial_with_neg_pac_due_to_hf() {
        let mut comp = *REF_COMP;
        assert_eq!(comp.get(CompKey::PACsgr), 22.18);
        assert_eq!(comp.get(CompKey::HF), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACtotal) - comp.get(CompKey::HF), 26.5888);

        comp.pac.hardness_factor = 30.0;
        assert_eq!(comp.get(CompKey::PACsgr), 22.18);
        assert_eq!(comp.get(CompKey::HF), 30.0);
        assert_eq_flt_test!(comp.get(CompKey::PACtotal) - comp.get(CompKey::HF), -3.4112);

        for (ref_step, _) in REF_COMP_FREEZING_CURVE_MODIFIED_GOFF_HARTEL_CORVITTO.iter() {
            let step_with_hf = compute_fpd_curve_step_modified_goff_hartel_corvitto(
                comp,
                ref_step.frozen_water,
                &get_fpd_from_pac_poly,
            )
            .unwrap();

            assert_eq_flt_test!(step_with_hf.hf, (30.0 / ref_step.water) * 100.0);
            assert_abs_diff_eq!(step_with_hf.pac_exc_hf, ref_step.pac_exc_hf, epsilon = 0.01);
            assert_true!(step_with_hf.fpd_inc_hf.is_nan());
        }
    }

    /// Reference composition for Corvitto FPD tests (Corvitto, 2005, p. 150)[^3]
    /// _Fat 8%, POD 18, MSNF 10%, Total Solids 36.1%, PAC 26.7, Serving Temperature -11°C_
    #[doc = include_str!("../docs/bibs/3.md")]
    static CORVITTO_REF_COMP_11ST: LazyLock<Composition> = LazyLock::new(|| {
        let milk_solids = SolidsBreakdown::new()
            .fats(Fats::new().total(8.0))
            .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(5.45)))
            .others_from_total(18.0)
            .unwrap();

        let other_solids =
            SolidsBreakdown::new().carbohydrates(Carbohydrates::new().sugars(Sugars::new().sucrose(18.1)));

        Composition::new()
            .solids(Solids::new().milk(milk_solids).other(other_solids))
            .pod(18.0)
            .pac(PAC::new().sugars(26.7))
    });

    /// Reference composition for Corvitto FPD tests (Corvitto, 2005, p. 151)[^3]
    /// _Fat 8%, POD 18, MSNF 10%, Total Solids 39.3%, PAC 40.9, Serving Temperature -18°C_
    #[doc = include_str!("../docs/bibs/3.md")]
    static CORVITTO_REF_COMP_18ST: LazyLock<Composition> = LazyLock::new(|| {
        let milk_solids = SolidsBreakdown::new()
            .fats(Fats::new().total(8.0))
            .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(5.45)))
            .others_from_total(18.0)
            .unwrap();

        let other_solids =
            SolidsBreakdown::new().carbohydrates(Carbohydrates::new().sugars(Sugars::new().sucrose(21.3)));

        Composition::new()
            .solids(Solids::new().milk(milk_solids).other(other_solids))
            .pod(18.0)
            .pac(PAC::new().sugars(40.9))
    });

    /// Reference composition for Corvitto FPD with HF tests (Corvitto, 2005, p. 251)[^3]
    /// _Fat 8%, POD 24.5, MSNF 8%, Cocoa SNF: 4.7%, Total Solids 38.2%, PAC 37.3,
    /// Hardness Factor: 9.7, Serving Temperature -11°C_
    #[doc = include_str!("../docs/bibs/3.md")]
    static CORVITTO_REF_COMP_WITH_HF_11ST: LazyLock<Composition> = LazyLock::new(|| {
        let milk_solids = SolidsBreakdown::new()
            .fats(Fats::new().total(6.1))
            .carbohydrates(Carbohydrates::new().sugars(Sugars::new().sucrose(3.4)))
            .others_from_total(14.1)
            .unwrap();

        let egg_solids = SolidsBreakdown::new().fats(Fats::new().total(0.6)).others(0.5);

        let cocoa_solids = SolidsBreakdown::new().fats(Fats::new().total(1.3)).others(4.7);

        let other_solids =
            SolidsBreakdown::new().carbohydrates(Carbohydrates::new().sugars(Sugars::new().sucrose(17.0)));

        Composition::new()
            .solids(
                Solids::new()
                    .milk(milk_solids)
                    .egg(egg_solids)
                    .cocoa(cocoa_solids)
                    .other(other_solids),
            )
            .pod(24.9)
            .pac(PAC::new().sugars(37.3).hardness_factor(9.7))
    });

    /// Reference composition for Corvitto FPD with HF tests (Corvitto, 2005, p. 252)[^3]
    /// _Fat 8%, POD 33.6, MSNF 8%, Cocoa SNF: 4.7%, Total Solids 43.2%, PAC 50.9,
    /// Hardness Factor: 9.7, Serving Temperature -18°C_
    #[doc = include_str!("../docs/bibs/3.md")]
    static CORVITTO_REF_COMP_WITH_HF_18ST: LazyLock<Composition> = LazyLock::new(|| {
        let milk_solids = SolidsBreakdown::new()
            .fats(Fats::new().total(6.1))
            .carbohydrates(Carbohydrates::new().sugars(Sugars::new().sucrose(4.1)))
            .others_from_total(14.1)
            .unwrap();

        let egg_solids = SolidsBreakdown::new().fats(Fats::new().total(0.6)).others(0.5);

        let cocoa_solids = SolidsBreakdown::new().fats(Fats::new().total(1.3)).others(4.7);

        let other_solids =
            SolidsBreakdown::new().carbohydrates(Carbohydrates::new().sugars(Sugars::new().sucrose(22.0)));

        Composition::new()
            .solids(
                Solids::new()
                    .milk(milk_solids)
                    .egg(egg_solids)
                    .cocoa(cocoa_solids)
                    .other(other_solids),
            )
            .pod(33.6)
            .pac(PAC::new().sugars(50.9).hardness_factor(9.7))
    });

    #[test]
    fn validate_corvitto_reference_compositions() {
        // Fat 8%, POD 18, MSNF 10%, Total Solids 36.1%, PAC 26.7
        let comp = *CORVITTO_REF_COMP_11ST;
        assert_eq!(comp.get(CompKey::MilkFat), 8.0);
        assert_eq!(comp.get(CompKey::MSNF), 10.0);
        assert_eq!(comp.get(CompKey::MilkSolids), 18.0);
        assert_eq!(comp.get(CompKey::TotalFats), 8.0);
        assert_eq!(comp.get(CompKey::TotalSolids), 36.1);
        assert_eq!(comp.get(CompKey::PACsgr), 26.7);
        assert_eq!(comp.get(CompKey::PACtotal), 26.7);
        assert_abs_diff_eq!(
            super::get_serving_temp_from_pac_corvitto(comp.get(CompKey::PACtotal)).unwrap(),
            -11.0,
            epsilon = 0.25
        );

        // Fat 8%, POD 18, MSNF 10%, Total Solids 39.3%, PAC 40.9
        let comp = *CORVITTO_REF_COMP_18ST;
        assert_eq!(comp.get(CompKey::MilkFat), 8.0);
        assert_eq!(comp.get(CompKey::MSNF), 10.0);
        assert_eq!(comp.get(CompKey::MilkSolids), 18.0);
        assert_eq!(comp.get(CompKey::TotalFats), 8.0);
        assert_eq!(comp.get(CompKey::TotalSolids), 39.3);
        assert_eq!(comp.get(CompKey::PACsgr), 40.9);
        assert_eq!(comp.get(CompKey::PACtotal), 40.9);
        assert_abs_diff_eq!(
            super::get_serving_temp_from_pac_corvitto(comp.get(CompKey::PACtotal)).unwrap(),
            -18.0,
            epsilon = 0.25
        );

        // Fat 8%, POD 24.5, MSNF 8%, Cocoa SNF: 4.7%, Total Solids 38.2%, PAC 37.3, Hardness Factor: 9.7
        let comp = *CORVITTO_REF_COMP_WITH_HF_11ST;
        assert_eq!(comp.get(CompKey::MilkFat), 6.1);
        assert_eq!(comp.get(CompKey::MSNF), 8.0);
        assert_eq!(comp.get(CompKey::MilkSolids), 14.1);
        assert_eq!(comp.get(CompKey::EggFat), 0.6);
        assert_eq_flt_test!(comp.get(CompKey::EggSNF), 0.5);
        assert_eq!(comp.get(CompKey::CocoaButter), 1.3);
        assert_eq!(comp.get(CompKey::CocoaSolids), 4.7);
        assert_eq_flt_test!(comp.get(CompKey::TotalFats), 8.0);
        assert_eq!(comp.get(CompKey::TotalSweeteners), 3.4 + 17.0);
        assert_eq!(comp.get(CompKey::TotalSolids), 38.2);
        assert_eq!(comp.get(CompKey::PACsgr), 37.3);
        assert_eq!(comp.get(CompKey::PACtotal), 37.3);
        assert_eq!(comp.get(CompKey::HF), 9.7);
        assert_abs_diff_eq!(
            super::get_serving_temp_from_pac_corvitto(comp.get(CompKey::PACtotal) - comp.get(CompKey::HF)).unwrap(),
            -11.0,
            epsilon = 0.3
        );

        // Fat 8%, POD 33.6, MSNF 8%, Cocoa SNF: 4.7%, Total Solids 43.2%, PAC 50.9, Hardness Factor: 9.7
        let comp = *CORVITTO_REF_COMP_WITH_HF_18ST;
        assert_eq!(comp.get(CompKey::MilkFat), 6.1);
        assert_eq!(comp.get(CompKey::MSNF), 8.0);
        assert_eq!(comp.get(CompKey::MilkSolids), 14.1);
        assert_eq!(comp.get(CompKey::EggFat), 0.6);
        assert_eq_flt_test!(comp.get(CompKey::EggSNF), 0.5);
        assert_eq!(comp.get(CompKey::CocoaButter), 1.3);
        assert_eq!(comp.get(CompKey::CocoaSolids), 4.7);
        assert_eq_flt_test!(comp.get(CompKey::TotalFats), 8.0);
        assert_eq!(comp.get(CompKey::TotalSweeteners), 4.1 + 22.0);
        assert_eq!(comp.get(CompKey::TotalSolids), 43.2);
        assert_eq!(comp.get(CompKey::PACsgr), 50.9);
        assert_eq!(comp.get(CompKey::PACtotal), 50.9);
        assert_eq!(comp.get(CompKey::HF), 9.7);
        assert_abs_diff_eq!(
            super::get_serving_temp_from_pac_corvitto(comp.get(CompKey::PACtotal) - comp.get(CompKey::HF)).unwrap(),
            -18.0,
            epsilon = 0.3
        );
    }

    #[test]
    fn get_serving_temp_from_pac_corvitto() {
        for table in [
            &CORVITTO_PAC_TO_SERVING_TEMP_TABLE[..],
            &[(23.0, -9.0), (24.0, -9.5), (42.0, -18.5), (43.0, -19.0)],
        ] {
            for (pac, serving_temp) in table {
                let computed_serving_temp = super::get_serving_temp_from_pac_corvitto(*pac).unwrap();
                assert_eq_flt_test!(computed_serving_temp, *serving_temp);
            }
        }

        let pac = CORVITTO_REF_COMP_11ST.pac.sugars;
        let computed_serving_temp = super::get_serving_temp_from_pac_corvitto(pac).unwrap();
        assert_abs_diff_eq!(computed_serving_temp, -11.0, epsilon = 0.2);

        let pac = CORVITTO_REF_COMP_18ST.pac.sugars;
        let computed_serving_temp = super::get_serving_temp_from_pac_corvitto(pac).unwrap();
        assert_abs_diff_eq!(computed_serving_temp, -18.0, epsilon = 0.2);
    }

    #[test]
    fn corvitto_pac_to_serving_temp_vs_goff_hartel_fpd_at_70_frozen_water() {
        for (pac, expected_serving_temp) in CORVITTO_PAC_TO_SERVING_TEMP_TABLE {
            let mut comp = Composition::calculate_from_composition_lines(&[
                crate::recipe::CompositionLine::new(*CORVITTO_REF_COMP_11ST, 50.0),
                crate::recipe::CompositionLine::new(*CORVITTO_REF_COMP_18ST, 50.0),
            ])
            .unwrap();
            comp.pac.sugars = pac;

            let fpd_curve_step_at_xx_fw =
                compute_fpd_curve_step_goff_hartel(comp, 68.25, &get_fpd_from_pac_poly).unwrap();
            assert_abs_diff_eq!(fpd_curve_step_at_xx_fw.fpd_total, expected_serving_temp, epsilon = 0.4);
        }
    }

    #[test]
    fn corvitto_pac_to_serving_temp_vs_modified_goff_hartel_corvitto_fpd_at_70_frozen_water() {
        for (pac, expected_serving_temp) in CORVITTO_PAC_TO_SERVING_TEMP_TABLE {
            let mut comp = Composition::calculate_from_composition_lines(&[
                crate::recipe::CompositionLine::new(*CORVITTO_REF_COMP_11ST, 50.0),
                crate::recipe::CompositionLine::new(*CORVITTO_REF_COMP_18ST, 50.0),
            ])
            .unwrap();
            comp.pac.sugars = pac;

            let fpd_curve_step_at_xx_fw =
                compute_fpd_curve_step_modified_goff_hartel_corvitto(comp, 70.0, &get_fpd_from_pac_poly).unwrap();
            assert_abs_diff_eq!(fpd_curve_step_at_xx_fw.fpd_exc_hf, expected_serving_temp, epsilon = 0.4);
        }
    }

    #[test]
    fn compute_fpd_curve_modified_goff_hartel_corvitto_polynomial_corvitto_ref() {
        for ref_comp in &[
            *CORVITTO_REF_COMP_11ST,
            *CORVITTO_REF_COMP_18ST,
            *CORVITTO_REF_COMP_WITH_HF_11ST,
            *CORVITTO_REF_COMP_WITH_HF_18ST,
        ] {
            let expected_serving_temp =
                super::get_serving_temp_from_pac_corvitto(ref_comp.get(CompKey::PACtotal) - ref_comp.get(CompKey::HF))
                    .unwrap();
            let fpd_curve_step_at_xx_fw =
                compute_fpd_curve_step_modified_goff_hartel_corvitto(*ref_comp, 70.0, &get_fpd_from_pac_poly).unwrap();

            // @todo The composition with HF and -18C expected serving temp shows a large deviation.
            let is_hf_18st = ref_comp.get(CompKey::HF) > 0.0 && expected_serving_temp < -12.0;
            let epsilon = if is_hf_18st { 2.0 } else { 0.6 };

            assert_abs_diff_eq!(fpd_curve_step_at_xx_fw.fpd_inc_hf, expected_serving_temp, epsilon = epsilon);
        }
    }

    #[test]
    fn get_x_axis_at_fpd() {
        let curve = &REF_COMP_FREEZING_CURVE
            .iter()
            .map(|step| CurvePoint::new(step.frozen_water, step.fpd_total))
            .collect::<Vec<CurvePoint>>();

        for point in curve {
            let x_axis = super::get_x_axis_at_fpd(curve, point.temp).unwrap();
            assert_eq_flt_test!(x_axis, point.x_axis);
        }

        for fpd in [-1.0, 85.0] {
            assert_true!(super::get_x_axis_at_fpd(curve, fpd).is_none());
        }

        for (expected_x_axis, target_fpd) in &[(5.0, -2.9), (7.5, -2.98), (77.5, -14.885)] {
            let x_axis = super::get_x_axis_at_fpd(curve, *target_fpd).unwrap();
            assert_eq_flt_test!(x_axis, *expected_x_axis);
        }
    }

    #[test]
    fn fpd_compute_from_empty_composition() {
        let validate_empty_fpd = |fpd: &FPD| {
            assert_eq!(fpd.fpd, 0.0);
            assert_eq!(fpd.serving_temp, 0.0);
            assert_true!(fpd.hardness_at_14c.is_nan());

            for x_axis in 0..100 {
                #[expect(clippy::cast_precision_loss)]
                let x_axis_f = x_axis as f64;

                for curve in [&fpd.curves.frozen_water, &fpd.curves.hardness] {
                    let curve_point = &curve[x_axis];
                    assert_eq!(curve_point.x_axis, x_axis_f);
                    assert_eq!(curve_point.temp, 0.0);
                }
            }
        };

        let comp = Composition::new();
        assert_eq!(comp.get(CompKey::Water), 100.0);
        assert_eq!(comp.get(CompKey::TotalSolids), 0.0);

        validate_empty_fpd(&FPD::empty());
        validate_empty_fpd(&FPD::compute_from_composition(comp).unwrap());
    }
}

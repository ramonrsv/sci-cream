//! Constants and utilities for density and conversions between volume and weight

use approx::AbsDiffEq;

use crate::{
    error::Result,
    util::{fast_interpolate_pairs, interpolate_pairs},
    validate::{verify_are_positive, verify_is_100_percent, verify_is_within_100_percent},
};

/// Density (g/mL) of pure water at 20°C
///
/// (Perry & Green, 2008, Table 2-112, p. 2-117)[^53]
#[doc = include_str!("../../docs/references/index/53.md")]
pub const WATER: f64 = 0.99823;

/// Density (g/mL) of pure ethanol at 20°C
///
/// (Perry & Green, 2008, Table 2-112, p. 2-117)[^53]
#[doc = include_str!("../../docs/references/index/53.md")]
pub const ETHANOL: f64 = 0.78934;

/// Grams of sugar in one teaspoon (US) of granulated sugar (Anderson, 2020)[^31]
#[doc = include_str!("../../docs/references/index/31.md")]
pub const GRAMS_IN_TEASPOON_OF_SUGAR: f64 = 4.2;

/// Approximate density (g/mL) of other dissolved solids (fiber, milk/cocoa SNFS).
///
/// **Warning:** This is a rough guess, but it should only apply to small fractions of other solids
/// non-fat non-sugars, so it shouldn't have a large impact on the overall density estimate.
pub const OTHER_DISSOLVED_SOLIDS: f64 = 1.5;

/// Densities (g/mL) for crystalline mono- and disaccharides at 20°C
pub mod sugars {
    /// Density (g/mL) of crystalline glucose at 20°C
    ///
    /// (PubChem, "Glucose", 2026)[^55]
    #[expect(clippy::doc_markdown)] // false positive on 'PubChem'
    #[doc = include_str!("../../docs/references/index/55.md")]
    pub const GLUCOSE: f64 = 1.54;

    /// Density (g/mL) of crystalline fructose at 20°C
    ///
    /// (PubChem, "Fructose", 2026)[^56]
    #[expect(clippy::doc_markdown)] // false positive on 'PubChem'
    #[doc = include_str!("../../docs/references/index/56.md")]
    pub const FRUCTOSE: f64 = 1.694;

    /// Density (g/mL) of crystalline galactose at 20°C
    ///
    /// (PubChem, "Galactose", 2026)[^57]
    #[expect(clippy::doc_markdown)] // false positive on 'PubChem'
    #[doc = include_str!("../../docs/references/index/57.md")]
    pub const GALACTOSE: f64 = 1.5;

    /// Density (g/mL) of crystalline sucrose at 20°C
    ///
    /// (PubChem, "Sucrose", 2026)[^58]
    #[expect(clippy::doc_markdown)] // false positive on 'PubChem'
    #[doc = include_str!("../../docs/references/index/58.md")]
    pub const SUCROSE: f64 = 1.587;

    /// Density (g/mL) of crystalline lactose at 20°C
    ///
    /// (PubChem, "Lactose", 2026)[^59]
    #[expect(clippy::doc_markdown)] // false positive on 'PubChem'
    #[doc = include_str!("../../docs/references/index/59.md")]
    pub const LACTOSE: f64 = 1.525;

    /// Density (g/mL) of crystalline maltose at 20°C
    ///
    /// (PubChem, "Maltose", 2026)[^60]
    #[expect(clippy::doc_markdown)] // false positive on 'PubChem'
    #[doc = include_str!("../../docs/references/index/60.md")]
    pub const MALTOSE: f64 = 1.54;

    /// Density (g/mL) of crystalline trehalose at 20°C
    ///
    /// (PubChem, "Trehalose", 2026)[^61]
    #[expect(clippy::doc_markdown)] // false positive on 'PubChem'
    #[doc = include_str!("../../docs/references/index/61.md")]
    pub const TREHALOSE: f64 = 1.58;
}

/// Densities (g/mL) of various milk components, e.g. milk fat, MSNF
pub mod dairy {
    /// Density (g/mL) of milk fat (butterfat) at 20°C, i.e. 915 kg/m³
    ///
    /// (Goff & Hill & Ferrer, 2026, Chapter 8)[^62]
    #[doc = include_str!("../../docs/references/index/62.md")]
    pub const MILK_FAT: f64 = 0.915;

    /// Observed apparent density (g/mL) of milk solids-non-fat (MSNF)
    ///
    /// Derived by least-squares over the dairy-density fit set (see
    /// [`DAIRY_INGREDIENTS`](super::DAIRY_INGREDIENTS)), holding fat at [`MILK_FAT`], sugar at
    /// [`SUCROSE`](super::sugars::SUCROSE), and water at [`WATER`](super::WATER).
    ///
    /// This is a fitted apparent density, not a textbook reference; used only by a volume-additive
    /// sanity-check test via [`mixture_density`](super::mixture_density).
    pub const MSNF: f64 = 1.577_997_137_942_653_6;

    /// MSNF (g/100g) at or above which dairy is treated as concentrated for density model selection
    ///
    /// Fresh milk and cream compute to at most ~10 g/100g of MSNF and concentrated (evaporated or
    /// condensed) dairy to ~14 or more, so any threshold in that gap routes fresh dairy to
    /// [`fresh_dairy_density`](super::fresh_dairy_density) and concentrated to
    /// [`dairy_density`](super::dairy_density), without its exact value affecting a real product.
    pub const CONCENTRATED_DAIRY_MSNF_THRESHOLD: f64 = 12.0;
}

/// Parameters for estimating the density of an aqueous mixture
#[derive(Copy, Clone, Debug)]
pub struct MixDensityParams {
    /// Mass (g) of ethanol in the mixture, per 100g of mixture, i.e. ABW
    pub ethanol: f64,
    /// Mass (g) of water in the mixture, per 100g of mixture, i.e. 100 - ABW - others
    pub water: f64,
    /// Mass (g) of sugar in the mixture, per 100g of mixture, and its density (g/mL)
    pub sugar: Option<(f64, f64)>,
    /// Mass (g) of fat in the mixture, per 100g of mixture, and its density (g/mL)
    pub fat: Option<(f64, f64)>,
    /// Mass (g) of other dissolved solids per 100g of mixture, and its density (g/mL)
    pub other_solids: Option<(f64, f64)>,
}

/// Estimate the density (g/mL) of an aqueous mixture from its component masses and densities.
///
/// `ethanol` and `water` are combined at their real (non-additive) [`ethanol_solution_density`];
/// `sugar` (at its own density, commonly [`sugars::SUCROSE`]), `fat` (at its own density, commonly
/// [`dairy::MILK_FAT`]), and `other_solids` (at its own density, commonly
/// [`OTHER_DISSOLVED_SOLIDS`], or [`dairy::MSNF`]) then add by volume. Masses are in grams per
/// 100g. The mixture must have an ethanol-water base, i.e. `ethanol + water > 0`.
///
/// # Errors
///
/// Errors if the total mass of all components does not sum to 100g, i.e. if the mixture is not
/// fully specified on a per-100g basis, or if there are other compositional inconsistencies.
pub fn mixture_density(mix_params: MixDensityParams) -> Result<f64> {
    let MixDensityParams {
        ethanol,
        water,
        sugar,
        fat,
        other_solids,
    } = mix_params;

    let (sugar, sugar_d) = sugar.unwrap_or((0.0, 1.0));
    let (fat, fat_d) = fat.unwrap_or((0.0, 1.0));
    let (other_solids, other_solids_d) = other_solids.unwrap_or((0.0, 1.0));

    verify_are_positive(&[ethanol, water, sugar, sugar_d, fat, fat_d, other_solids, other_solids_d])?;
    verify_is_100_percent(ethanol + water + sugar + fat + other_solids)?;

    let eth_sol_mass = ethanol + water;
    let eth_sol_vol = eth_sol_mass / ethanol_solution_density(100.0 * ethanol / eth_sol_mass);

    let sugar_vol = sugar / sugar_d;
    let fat_vol = fat / fat_d;
    let other_solids_vol = other_solids / other_solids_d;

    let volume = eth_sol_vol + sugar_vol + fat_vol + other_solids_vol;
    let mass = eth_sol_mass + sugar + fat + other_solids;

    Ok(mass / volume)
}

/// Convert dairy volume in milliliters to grams based on fat, msnf, and sucrose content.
///
/// The density is chosen by [`select_dairy_density`]. Inputs are grams per 100g of product.
///
/// # Errors
///
/// Returns an error if any of the inputs are negative or if their sum exceeds 100.
pub fn dairy_ml_to_g(ml: f64, fat: f64, msnf: f64, sucrose: f64) -> Result<f64> {
    verify_are_positive(&[ml, fat, msnf, sucrose])?;
    verify_is_within_100_percent(fat + msnf + sucrose)?;

    Ok(ml * select_dairy_density(fat, msnf, sucrose))
}

/// Estimate the density (g/mL) of a dairy ingredient, picking the model from its composition.
///
/// Uses the fat-only [`fresh_dairy_density`] for fresh dairy, which is more accurate there, and the
/// [`dairy_density`] `(fat, msnf, sucrose)` model for concentrated or sweetened dairy, i.e. when
/// `sucrose` is present or `msnf` reaches [`dairy::CONCENTRATED_DAIRY_MSNF_THRESHOLD`].
///
/// Inputs are grams per 100g. This is a pure evaluation and does not validate its inputs.
#[must_use]
pub fn select_dairy_density(fat: f64, msnf: f64, sucrose: f64) -> f64 {
    if sucrose > 0.0 || msnf >= dairy::CONCENTRATED_DAIRY_MSNF_THRESHOLD {
        dairy_density(fat, msnf, sucrose)
    } else {
        fresh_dairy_density(fat)
    }
}

/// Estimate the density (g/mL) of a fresh dairy ingredient from its fat content.
///
/// Evaluates the quadratic fit [`FRESH_DAIRY_DENSITY_COEFFS`] (`a·fat^2 + b·fat + c`).
///
/// This is a pure evaluation and does not validate its inputs.
#[must_use]
pub fn fresh_dairy_density(fat: f64) -> f64 {
    let [a, b, c] = FRESH_DAIRY_DENSITY_COEFFS;
    a * fat.powi(2) + b * fat + c
}

/// Estimate the density (g/mL) of a dairy ingredient from its fat, MSNF, and sucrose content.
///
/// Evaluates the linear fit [`DAIRY_DENSITY_COEFFS`] (`c0 + a·fat + b·msnf + d·sucrose`).
/// Inputs are grams per 100g of ingredient; each should be non-negative and sum to at most 100.
///
/// This is a pure evaluation and does not validate its inputs.
#[must_use]
pub fn dairy_density(fat: f64, msnf: f64, sucrose: f64) -> f64 {
    let [c0, a, b, d] = DAIRY_DENSITY_COEFFS;
    c0 + a * fat + b * msnf + d * sucrose
}

/// Iteration cap for the dairy serving-size fixed point; real should converge far sooner.
const DAIRY_SERVING_SOLVER_ITERS: usize = 50;

/// Convergence tolerance (g) for the dairy serving-size fixed point; far below the precision
/// of any composition value derived from the serving size, so it does not perturb the results.
const DAIRY_SERVING_SOLVER_TOLERANCE: f64 = 1e-9;

/// Solve a dairy serving size in grams from a volume in ml via the density fixed point.
///
/// The ml -> g density depends on the fat, MSNF, and sucrose fractions, which themselves depend on
/// the serving size in grams, so this iterates `serving = ml · density(serving)` to convergence
/// (see [`select_dairy_density`]). `msnf` and `sucrose` are constant masses (g) across the serving
/// range; `fat_at` returns the fat mass (g) for a candidate serving size.
///
/// # Errors
///
/// Returns an error if any of the inputs are negative or if their sum exceeds 100.
pub fn solve_dairy_serving_grams(ml: f64, sucrose: f64, msnf: f64, fat_at: impl Fn(f64) -> f64) -> Result<f64> {
    verify_are_positive(&[ml, sucrose, msnf, fat_at(ml)])?;
    verify_is_within_100_percent(fat_at(ml) + msnf + sucrose)?;

    Ok(solve_dairy_serving_grams_iters(ml, sucrose, msnf, fat_at).0)
}

/// [`solve_dairy_serving_grams`] but also returning the fixed-point iteration count, for testing.
fn solve_dairy_serving_grams_iters(ml: f64, sucrose: f64, msnf: f64, fat_at: impl Fn(f64) -> f64) -> (f64, usize) {
    let mut serving_size = ml;

    for iters in 1..=DAIRY_SERVING_SOLVER_ITERS {
        let density = select_dairy_density(
            100.0 * fat_at(serving_size) / serving_size,
            100.0 * msnf / serving_size,
            100.0 * sucrose / serving_size,
        );
        let next = ml * density;

        if next.abs_diff_eq(&serving_size, DAIRY_SERVING_SOLVER_TOLERANCE) {
            return (next, iters);
        }
        serving_size = next;
    }
    (serving_size, DAIRY_SERVING_SOLVER_ITERS)
}

/// Convert alcohol by weight (ABW, % w/w) to alcohol by volume (ABV, % v/v) at 20°C.
///
/// Interpolates the ABV implied by each `(ABW, density)` row of [`ETHANOL_SOLUTIONS_DENSITY`]
/// via `ABV = ABW · ρ_solution / ρ_ethanol`; the exact inverse of [`abv_to_abw`].
///
/// **Note:** This could use [`fast_interpolate_pairs`] since the table is keyed by ABW, but then
/// [`abv_to_abw`] would not be an exact inverse.
#[must_use]
pub fn abw_to_abv(abw: f64) -> f64 {
    interpolate_pairs(&ETHANOL_SOLUTIONS_DENSITY, abw, abw_to_f64, abv_from_abw_and_density)
}

/// Convert alcohol by volume (ABV, % v/v) to alcohol by weight (ABW, % w/w) at 20°C.
///
/// Inverts [`abw_to_abv`] by interpolating against the ABV implied by each `(ABW, density)`
/// row in [`ETHANOL_SOLUTIONS_DENSITY`], since the table is keyed by weight percent.
#[must_use]
pub fn abv_to_abw(abv: f64) -> f64 {
    interpolate_pairs(&ETHANOL_SOLUTIONS_DENSITY, abv, abv_from_abw_and_density, abw_to_f64)
}

/// Density (g/mL) of an ethanol-water solution at the given alcohol by weight (ABW, % w/w), 20°C.
///
/// Interpolates the solution density tabulated in [`ETHANOL_SOLUTIONS_DENSITY`], which is keyed by
/// weight percent, so [`fast_interpolate_pairs`] applies.
#[must_use]
pub fn ethanol_solution_density(abw: f64) -> f64 {
    fast_interpolate_pairs(&ETHANOL_SOLUTIONS_DENSITY, abw)
}

/// Alcohol by weight (ABW, % w/w) and solution density (g/mL) to alcohol by volume (ABV, % v/v)
///
/// Direct conversion using the formula `ABV = ABW · ρ_solution / ρ_ethanol`. Internal function;
/// parameters are `(u32, f64)` pairs of `(ABW, density)` to match [`ETHANOL_SOLUTIONS_DENSITY`].
#[must_use]
fn abv_from_abw_and_density(abw_density: &(u32, f64)) -> f64 {
    let (abw, density) = *abw_density;
    f64::from(abw) * density / ETHANOL
}

/// Trivial `u32` to `f64` conversion for the `(u32, f64)` pairs of [`ETHANOL_SOLUTIONS_DENSITY`]
#[must_use]
fn abw_to_f64(abw: &(u32, f64)) -> f64 {
    f64::from(abw.0)
}

/// Coefficients for a quadratic polynomial line of best fit over [`FRESH_DAIRY_DENSITIES`].
///
/// The table is a bit choppy, particularly at low fat contents, so this helps smooth out the
/// density estimates for intermediate fat contents. The function is almost linear, with a very
/// small quadratic term, and is a pretty good fit for the 9-point table covering 0–50% fat.
///
/// See [`fresh_dairy_density`] for a function doing the computation with these coefficients.
///
/// Maximum error over the fit set is about 0.17%.
pub const FRESH_DAIRY_DENSITY_COEFFS: [f64; 3] = [5.167_207_107e-6, -1.303_663_837e-3, 1.036_675_490];

/// Coefficients `[c0, fat, msnf, sucrose]` for a linear-density fit over [`DAIRY_INGREDIENTS`]
///
/// Fit by least-squares over the 15-row fit set (the [`DAIRY_INGREDIENTS`] rows, with the two
/// mutually inconsistent entries averaged into one). Inputs are grams per 100g; output is g/mL.
///
/// See [`dairy_density`] for a function doing the computation with these coefficients.
///
/// Maximum error over the fit set is about 0.65%.
pub const DAIRY_DENSITY_COEFFS: [f64; 4] = [
    1.000_121_061_970_323_8,
    -6.968_449_312_670_108e-4,
    3.952_891_715_097_246e-3,
    5.025_926_155_654_383_5e-3,
];

/// Densities (g/mL) of various fresh dairy ingredients at different fat contents
///
/// The elements are in ascending order of fat content, so this table support [`interpolate_pairs`]
/// for density lookup by fat content percentage; _not_ [`fast_interpolate_pairs`], no-equal steps.
///
/// These values are from Ice Cream 8th ed. (Goff & Hartel, 2025, Table 3.2, p. 48)[^20], but are
/// also roughly corroborated by various sources in FAO/INFOODS Density Database version 1.0 (July
/// 2011) (Charrondiere et al., 2011, p. 3)[^14].
#[doc = include_str!("../../docs/references/index/14.md")]
#[doc = include_str!("../../docs/references/index/20.md")]
pub const FRESH_DAIRY_DENSITIES: [(f64, f64); 9] = [
    (0.0, 1.036),  // Skim milk
    (3.0, 1.032),  // Milk 3%
    (4.0, 1.032),  // Milk 4%
    (5.0, 1.032),  // Milk 5%
    (18.0, 1.014), // Cream 18%
    (30.0, 1.002), // Cream 30%
    (35.0, 0.997), // Cream 35%
    (40.0, 0.994), // Cream 40%
    (50.0, 0.984), // Cream 50%
];

/// Properties of fresh and condensed dairy ingredients: [Fat, MSNF, Sucrose, Protein, Density]
///
/// (Goff & Hartel, 2025, Table 3.2, p. 48)[^20]
///
/// The `Evaporated milk, bulk` and `Condensed milk, 10% fat, 26% MSNF` rows are mutually
/// inconsistent (less MSNF yet higher density), so the dairy-density fits ([`dairy_density`],
/// [`dairy::MSNF`]) average them into a single row rather than using them directly.
#[doc = include_str!("../../docs/references/index/20.md")]
pub const DAIRY_INGREDIENTS: [(f64, f64, f64, f64, f64); 16] = [
    (0.0, 8.60, 0.0, 3.2, 1.036),    // Skim milk
    (3.0, 8.33, 0.0, 3.1, 1.032),    // Milk 3%
    (4.0, 8.79, 0.0, 3.2, 1.032),    // Milk 4%
    (5.0, 9.10, 0.0, 3.3, 1.032),    // Milk 5%
    (18.0, 7.31, 0.0, 2.6, 1.014),   // Cream 18%
    (30.0, 6.24, 0.0, 2.2, 1.002),   // Cream 30%
    (35.0, 5.69, 0.0, 2.1, 0.997),   // Cream 35%
    (40.0, 5.35, 0.0, 1.9, 0.994),   // Cream 40%
    (50.0, 4.45, 0.0, 1.6, 0.984),   // Cream 50%
    (10.0, 23.00, 0.0, 8.5, 1.104),  // Evaporated milk, bulk
    (8.0, 22.00, 0.0, 8.2, 1.079),   // Condensed milk, 8% fat, 22% MSNF
    (10.0, 26.00, 0.0, 9.7, 1.080),  // Condensed milk, 10% fat, 26% MSNF
    (0.0, 20.00, 0.0, 7.4, 1.078),   // Condensed skim milk, 20% MSNF
    (0.0, 30.00, 0.0, 11.1, 1.122),  // Condensed skim milk, 30% MSNF
    (8.0, 23.00, 42.0, 8.5, 1.305),  // Condensed milk, sweetened
    (0.5, 30.00, 42.0, 11.1, 1.321), // Condensed skim milk, sweetened
];

/// Density (g/mL) of ethanol aqueous solutions at various concentrations, at 20°C
///
/// (Perry & Green, 2008, Table 2-112, p. 2-117)[^53]
#[doc = include_str!("../../docs/references/index/53.md")]
pub const ETHANOL_SOLUTIONS_DENSITY: [(u32, f64); 101] = [
    (0, 0.99823),
    (1, 0.99636),
    (2, 0.99453),
    (3, 0.99275),
    (4, 0.99103),
    (5, 0.98938),
    (6, 0.98780),
    (7, 0.98627),
    (8, 0.98478),
    (9, 0.98331),
    (10, 0.98187),
    (11, 0.98047),
    (12, 0.97910),
    (13, 0.97775),
    (14, 0.97643),
    (15, 0.97514),
    (16, 0.97387),
    (17, 0.97259),
    (18, 0.97129),
    (19, 0.96997),
    (20, 0.96864),
    (21, 0.96729),
    (22, 0.96592),
    (23, 0.96453),
    (24, 0.96312),
    (25, 0.96168),
    (26, 0.96020),
    (27, 0.95867),
    (28, 0.95710),
    (29, 0.95548),
    (30, 0.95382),
    (31, 0.95212),
    (32, 0.95038),
    (33, 0.94860),
    (34, 0.94679),
    (35, 0.94494),
    (36, 0.94306),
    (37, 0.94114),
    (38, 0.93919),
    (39, 0.93720),
    (40, 0.93518),
    (41, 0.93314),
    (42, 0.93107),
    (43, 0.92897),
    (44, 0.92685),
    (45, 0.92472),
    (46, 0.92257),
    (47, 0.92041),
    (48, 0.91823),
    (49, 0.91604),
    (50, 0.91384),
    (51, 0.91160),
    (52, 0.90936),
    (53, 0.90711),
    (54, 0.90485),
    (55, 0.90258),
    (56, 0.90031),
    (57, 0.89803),
    (58, 0.89574),
    (59, 0.89344),
    (60, 0.89113),
    (61, 0.88882),
    (62, 0.88650),
    (63, 0.88417),
    (64, 0.88183),
    (65, 0.87948),
    (66, 0.87713),
    (67, 0.87477),
    (68, 0.87241),
    (69, 0.87004),
    (70, 0.86766),
    (71, 0.86527),
    (72, 0.86287),
    (73, 0.86047),
    (74, 0.85806),
    (75, 0.85564),
    (76, 0.85322),
    (77, 0.85079),
    (78, 0.84835),
    (79, 0.84590),
    (80, 0.84344),
    (81, 0.84096),
    (82, 0.83848),
    (83, 0.83599),
    (84, 0.83348),
    (85, 0.83095),
    (86, 0.82840),
    (87, 0.82583),
    (88, 0.82323),
    (89, 0.82062),
    (90, 0.81797),
    (91, 0.81529),
    (92, 0.81257),
    (93, 0.80983),
    (94, 0.80705),
    (95, 0.80424),
    (96, 0.80138),
    (97, 0.79846),
    (98, 0.79547),
    (99, 0.79243),
    (100, 0.78934),
];

#[cfg(test)]
#[cfg_attr(coverage, coverage(off))]
#[allow(clippy::unwrap_used, clippy::float_cmp)]
mod tests {
    use crate::tests::asserts::shadow_asserts::assert_eq;
    use crate::tests::asserts::*;

    use crate::tests::util::relative_diff_percent;

    use super::*;
    use crate::{
        constants::composition::STD_MINERALS_IN_MSNF,
        util::{
            fast_interpolate_pairs, interpolate_pairs, table_supports_fast_interpolation, table_supports_interpolation,
        },
    };

    #[test]
    fn fresh_dairy_densities_by_fat_supports_interpolation() {
        assert_true!(table_supports_interpolation(&FRESH_DAIRY_DENSITIES, |(f, _)| *f));
    }

    #[test]
    fn fresh_dairy_density_polynomial_fit_coeffs() {
        use polyfit_rs::polyfit_rs::polyfit;

        let xs: Vec<f64> = FRESH_DAIRY_DENSITIES.iter().map(|(f, _)| *f).collect();
        let ys: Vec<f64> = FRESH_DAIRY_DENSITIES.iter().map(|(_, d)| *d).collect();

        let coeffs = polyfit(&xs, &ys, 2).unwrap();
        assert_abs_diff_eq!(coeffs[2], FRESH_DAIRY_DENSITY_COEFFS[0], epsilon = 1e-10);
        assert_abs_diff_eq!(coeffs[1], FRESH_DAIRY_DENSITY_COEFFS[1], epsilon = 1e-10);
        assert_abs_diff_eq!(coeffs[0], FRESH_DAIRY_DENSITY_COEFFS[2], epsilon = 1e-10);
    }

    #[test]
    fn fresh_dairy_density_polynomial_fit_max_error() {
        let [a, b, c] = FRESH_DAIRY_DENSITY_COEFFS;

        // eprintln!("{:>8}  {:>8}  {:>8}  {:>8}", "fat%", "actual", "fit", "error");
        for (fat, actual) in &FRESH_DAIRY_DENSITIES {
            let fit = a * fat.powi(2) + b * fat + c;
            assert_abs_diff_eq!(*actual, fit, epsilon = 0.0018);
            // eprintln!("{fat:>8.1}  {actual:>8.4}  {fit:>8.4}  {:>+8.4}", actual - fit);
        }
    }

    #[test]
    fn dairy_milliliters_to_grams() {
        let expected_conversions = [
            (0.0, 1.036_675),
            (2.0, 1.034_089),
            (3.0, 1.032_811),
            (3.5, 1.032_176),
            (5.0, 1.030_286),
            (10.0, 1.024_156),
            (18.0, 1.014_884),
            (30.0, 1.002_216),
            (35.0, 0.997_377),
            (40.0, 0.992_796),
            (50.0, 0.984_410),
        ];

        for (fat_content, expected_density) in expected_conversions {
            let grams = dairy_ml_to_g(100.0, fat_content, 0.0, 0.0).unwrap();
            let expected_grams = 100.0 * expected_density;
            assert_eq_flt_test!(grams, expected_grams);
        }
    }

    #[test]
    fn dairy_serving_fixed_point_converges_well_within_cap() {
        // Sweetened condensed milk (grams fat) is the slowest case: dense (~1.30 g/mL). Eagle
        // Brand's 15mL serving: 1.5g fat, 8.97g sucrose, MSNF from its 2.03g lactose + 1g protein.
        let scm_msnf = (2.03 + 1.0) / (1.0 - STD_MINERALS_IN_MSNF);
        let (grams, iters) = solve_dairy_serving_grams_iters(15.0, 8.97, scm_msnf, |_| 1.5);
        assert_eq_flt_test!(grams, 19.4338);
        assert_lt!(iters, DAIRY_SERVING_SOLVER_ITERS);
        assert_le!(iters, 20);

        // Fresh milk (percentage fat) converges almost immediately: its density barely varies with
        // serving size. A 250mL whole-milk serving: 3.25% fat, MSNF from 13g lactose + 9g protein.
        let milk_msnf = (13.0 + 9.0) / (1.0 - STD_MINERALS_IN_MSNF);
        let (grams, fresh_iters) = solve_dairy_serving_grams_iters(250.0, 0.0, milk_msnf, |size| size * 3.25 / 100.0);
        assert_eq_flt_test!(grams, 258.1233);
        assert_le!(fresh_iters, 3);
    }

    #[test]
    fn abw_to_solution_density_table_supports_fast_interpolation() {
        assert_true!(table_supports_interpolation(&ETHANOL_SOLUTIONS_DENSITY, abw_to_f64));
        assert_true!(table_supports_fast_interpolation(&ETHANOL_SOLUTIONS_DENSITY));
    }

    #[test]
    fn abw_to_solution_density_table_supports_interpolation_via_implied_abv() {
        assert_true!(table_supports_interpolation(&ETHANOL_SOLUTIONS_DENSITY, abv_from_abw_and_density));
    }

    #[test]
    fn abw_to_abv() {
        let expected = [
            (0.0, 0.0),
            (5.0, 6.267_135),
            (12.5, 15.493_925),
            (40.0, 47.390_478),
            (50.0, 57.886_335),
            (100.0, 100.0),
        ];

        for (abw, expected_abv) in expected {
            assert_eq_flt_test!(super::abw_to_abv(abw), expected_abv);
        }
    }

    #[test]
    fn abv_to_abw() {
        let expected = [
            (0.0, 0.0),
            (10.0, 8.015_604),
            (30.0, 24.609_759),
            (50.0, 42.430_629),
            (70.0, 62.393_127),
            (100.0, 100.0),
        ];

        for (abv, expected_abw) in expected {
            assert_eq_flt_test!(super::abv_to_abw(abv), expected_abw);
        }
    }

    #[test]
    fn abv_to_abw_inverts_abw_to_abv() {
        for abw in [3.0, 12.5, 17.3, 33.3, 40.7, 62.7, 88.9] {
            assert_abs_diff_eq!(super::abv_to_abw(super::abw_to_abv(abw)), abw, epsilon = 1e-9);
        }
    }

    #[test]
    fn abw_to_abv_matches_external_values() {
        // Likely circular and calculated from Perry's table, so this is just a sanity check
        // https://www.miniindustry.com/d/ethanol-density-20c
        let published = [
            (0.0, 0.0),
            (5.0, 6.3),
            (10.0, 12.4),
            (15.0, 18.5),
            (20.0, 24.5),
            (25.0, 30.5),
            (30.0, 36.3),
            (35.0, 41.9),
            (40.0, 47.4),
            (45.0, 52.7),
            (50.0, 57.9),
            (55.0, 62.9),
            (60.0, 67.7),
            (65.0, 72.4),
            (70.0, 76.9),
            (75.0, 81.3),
            (80.0, 85.5),
            (85.0, 89.5),
            (90.0, 93.3),
            (95.0, 96.8),
            (100.0, 100.0),
        ];

        for (abw, abv_external) in published {
            assert_abs_diff_eq!(super::abw_to_abv(abw), abv_external, epsilon = 0.1);
        }
    }

    #[test]
    fn abv_to_abw_matches_external_values() {
        // Likely circular and calculated from Perry's table, so this is just a sanity check
        // https://www.miniindustry.com/d/ethanol-density-20c
        let published = [
            (0.0, 0.0),
            (5.0, 4.0),
            (10.0, 8.0),
            (15.0, 12.1),
            (20.0, 16.2),
            (25.0, 20.4),
            (30.0, 24.6),
            (35.0, 28.9),
            (40.0, 33.3),
            (45.0, 37.8),
            (50.0, 42.4),
            (55.0, 47.2),
            (60.0, 52.1),
            (65.0, 57.1),
            (70.0, 62.4),
            (75.0, 67.8),
            (80.0, 73.5),
            (85.0, 79.4),
            (90.0, 85.7),
            (95.0, 92.5),
            (100.0, 100.0),
        ];

        for (abv, abw_external) in published {
            assert_abs_diff_eq!(super::abv_to_abw(abv), abw_external, epsilon = 0.1);
        }
    }

    #[test]
    fn fast_and_slow_interpolation_agree_on_density_table() {
        // Probes span out-of-bounds, the first/last nodes, interior nodes, and between-node points.
        for x in [-5.0, -0.25, 0.0, 0.5, 12.5, 33.0, 33.5, 50.0, 67.0, 99.75, 100.0, 104.2] {
            assert_eq!(
                fast_interpolate_pairs(&ETHANOL_SOLUTIONS_DENSITY, x),
                interpolate_pairs(&ETHANOL_SOLUTIONS_DENSITY, x, abw_to_f64, |&(_, density)| density),
            );
        }
    }

    #[test]
    fn ethanol_solution_density() {
        assert_eq_flt_test!(super::ethanol_solution_density(0.0), WATER);
        assert_eq_flt_test!(super::ethanol_solution_density(100.0), ETHANOL);
        assert_eq_flt_test!(super::ethanol_solution_density(33.0), 0.94860);
    }

    #[test]
    fn mixture_density() {
        let abw = super::abv_to_abw(40.0);
        let water = 100.0 - abw;

        // With no added solids the mixture is just the ethanol-water solution.
        assert_eq_flt_test!(
            super::mixture_density(MixDensityParams {
                ethanol: abw,
                water,
                sugar: None,
                fat: None,
                other_solids: None,
            })
            .unwrap(),
            super::ethanol_solution_density(abw)
        );

        // Dissolving sucrose (denser than the solution) raises the density.
        assert_gt!(
            super::mixture_density(MixDensityParams {
                ethanol: abw,
                water: water - 10.0,
                sugar: Some((10.0, sugars::SUCROSE)),
                fat: None,
                other_solids: None,
            })
            .unwrap(),
            super::ethanol_solution_density(abw)
        );
    }

    /// The 15-row dairy-density fit set: every [`DAIRY_INGREDIENTS`] row except the two mutually
    /// inconsistent ones (evaporated milk and condensed 10%/26%), plus one row averaging those two.
    ///
    /// Their density residuals are equal-and-opposite, so the average is the best single estimate.
    ///
    /// Rows are `(fat, msnf, sucrose, density)`.
    fn dairy_density_fit_set() -> Vec<(f64, f64, f64, f64)> {
        const EVAP: usize = 9;
        const COND_10_26: usize = 11;

        let mut rows: Vec<(f64, f64, f64, f64)> = DAIRY_INGREDIENTS
            .iter()
            .enumerate()
            .filter(|(i, _)| *i != EVAP && *i != COND_10_26)
            .map(|(_, &(fat, msnf, sucrose, _, density))| (fat, msnf, sucrose, density))
            .collect();

        let (ef, em, es, _, ed) = DAIRY_INGREDIENTS[EVAP];
        let (cf, cm, cs, _, cd) = DAIRY_INGREDIENTS[COND_10_26];
        rows.push((f64::midpoint(ef, cf), f64::midpoint(em, cm), f64::midpoint(es, cs), f64::midpoint(ed, cd)));
        rows
    }

    #[test]
    fn dairy_density_linear_fit_coeffs() {
        use nalgebra::{DMatrix, DVector, SVD};

        let fit = dairy_density_fit_set();
        let mut a = Vec::with_capacity(fit.len() * 4);
        let mut y = Vec::with_capacity(fit.len());
        for (fat, msnf, sucrose, density) in &fit {
            a.extend_from_slice(&[1.0, *fat, *msnf, *sucrose]);
            y.push(*density);
        }

        let matrix = DMatrix::from_row_slice(fit.len(), 4, &a);
        let rhs = DVector::from_column_slice(&y);
        let coeffs = SVD::new(matrix, true, true).solve(&rhs, 1e-12).unwrap();

        for (fit_coeff, expected) in coeffs.iter().zip(DAIRY_DENSITY_COEFFS) {
            assert_abs_diff_eq!(*fit_coeff, expected, epsilon = 1e-9);
        }
    }

    #[test]
    fn dairy_density_msnf_density_fit() {
        use nalgebra::{DMatrix, DVector, SVD};

        let fit = dairy_density_fit_set();
        let mut a = Vec::with_capacity(fit.len());
        let mut y = Vec::with_capacity(fit.len());
        for (fat, msnf, sucrose, density) in &fit {
            let water = 100.0 - fat - msnf - sucrose;

            let fat_vol = fat / dairy::MILK_FAT;
            let sucrose_vol = sucrose / sugars::SUCROSE;
            let water_vol = water / WATER;

            let msnf_vol = 100.0 / density - fat_vol - sucrose_vol - water_vol;
            a.push(*msnf);
            y.push(msnf_vol);
        }

        let matrix = DMatrix::from_row_slice(fit.len(), 1, &a);
        let rhs = DVector::from_column_slice(&y);
        let specific_volume = SVD::new(matrix, true, true).solve(&rhs, 1e-12).unwrap()[0];

        assert_abs_diff_eq!(1.0 / specific_volume, dairy::MSNF, epsilon = 1e-9);
    }

    #[test]
    fn dairy_density_linear_max_error() {
        for (fat, msnf, sucrose, density) in dairy_density_fit_set() {
            assert_lt!(relative_diff_percent(dairy_density(fat, msnf, sucrose), density), 0.7);
        }
    }

    /// Volume-additive dairy density via [`mixture_density`]; test only, see [`dairy_density`].
    ///
    /// Milk fat as `fat`, MSNF as `other_solids`, sucrose as `sugar`, all using their respective
    /// densities from [`dairy::MILK_FAT`], [`dairy::MSNF`], and [`sugars::SUCROSE`].
    fn dairy_density_volume_additive(fat: f64, msnf: f64, sucrose: f64) -> Result<f64> {
        super::mixture_density(MixDensityParams {
            ethanol: 0.0,
            water: 100.0 - fat - msnf - sucrose,
            sugar: Some((sucrose, sugars::SUCROSE)),
            fat: Some((fat, dairy::MILK_FAT)),
            other_solids: Some((msnf, dairy::MSNF)),
        })
    }

    #[test]
    fn dairy_density_volume_additive_matches_table() {
        // Physically-referenced densities track the table to ~1.5%, except sweetened condensed
        // skim (~2.8%), where crystalline sucrose over-predicts density in a 42%-sugar system.
        // High-fat cream is the next miss (~1.4%; apparent fat density exceeds pure milk fat).
        for (fat, msnf, sucrose, density) in dairy_density_fit_set() {
            let predicted = dairy_density_volume_additive(fat, msnf, sucrose).unwrap();
            let sweetened_skim = sucrose > 40.0 && fat < 1.0;
            let tolerance = if sweetened_skim { 3.0 } else { 1.5 };
            assert_lt!(relative_diff_percent(predicted, density), tolerance);
        }
    }
}

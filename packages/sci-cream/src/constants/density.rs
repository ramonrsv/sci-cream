//! Constants and utilities for density and conversions between volume and weight

use crate::{
    error::Result,
    util::{fast_interpolate_pairs, interpolate_pairs},
    validate::{verify_are_positive, verify_is_100_percent},
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

/// Densities (g/mL) of various diary ingredients with varying fat and sugar contents
pub mod dairy {
    /// Density (g/mL) of milk with 2% fat content
    ///
    /// _Milk, liquid, partially skimmed_ (Charrondiere et al., 2011, p. 2)[^14]
    #[doc = include_str!("../../docs/references/index/14.md")]
    pub const MILK_2: f64 = 1.034;

    /// Density (g/mL) of milk with 3.5% fat content
    ///
    /// _Milk, liquid, whole_ (Charrondiere et al., 2011, p. 2)[^14]
    #[doc = include_str!("../../docs/references/index/14.md")]
    pub const MILK_3_5: f64 = 1.03;

    /// Density (g/mL) of cream with 40% fat content
    ///
    /// _Cream, whipping (about 40% fat)_ (Charrondiere et al., 2011, p. 2)[^14]
    #[doc = include_str!("../../docs/references/index/14.md")]
    pub const CREAM_40: f64 = 0.96;

    /// Density (g/mL) of evaporated milk
    ///
    /// _Milk, evaporated_ (Charrondiere et al., 2011, p. 3)[^14], (Lewis, 2023, Chapter 23.7)[^49]
    #[doc = include_str!("../../docs/references/index/14.md")]
    #[doc = include_str!("../../docs/references/index/49.md")]
    pub const EVAPORATED_MILK: f64 = 1.075;

    /// Density (g/mL) of sweetened condensed milk
    ///
    /// (Rodrigues, 2017)[^50], (Moro, 1985)[^51]
    #[doc = include_str!("../../docs/references/index/50.md")]
    #[doc = include_str!("../../docs/references/index/51.md")]
    pub const SWEETENED_CONDENSED_MILK: f64 = 1.3;
}

/// Parameters for estimating the density of an aqueous mixture
#[derive(Copy, Clone, Debug)]
pub struct MixDensityParams {
    /// Mass (g) of ethanol in the mixture, per 100g of mixture, i.e. ABW
    pub ethanol: f64,
    /// Mass (g) of water in the mixture, per 100g of mixture, i.e. 100 - ABW - others
    pub water: f64,
    /// Mass (g) of sugar in the mixture, per 100g of mixture, modeled as sucrose
    pub sugar: f64,
    /// Mass (g) of fat in the mixture, per 100g of mixture, and its density (g/mL)
    pub fat: Option<(f64, f64)>,
    /// Mass (g) of other dissolved solids in the mixture, per 100g of mixture
    pub other_solids: f64,
}

/// Estimate the density (g/mL) of an aqueous mixture from its component masses and `fat_density`.
///
/// `ethanol` and `water` are combined at their real (non-additive) [`ethanol_solution_density`];
/// `sugar` ([`sugars::SUCROSE`]), `fat` (`fat_density`), and `other_solids`
/// ([`OTHER_DISSOLVED_SOLIDS`]) then add by volume. Masses may be on any consistent basis (e.g.
/// grams per 100g). The mixture must have an ethanol-water base, i.e. `ethanol + water > 0`.
///
/// **Note:** This uses the density of [`sugars::SUCROSE`] for all sugars, so it may not be accurate
/// for other mono and disaccharides, but it should be close enough in most cases since they all
/// have similar densities and sucrose sits close to the average between them.
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

    let (fat, fat_density) = fat.unwrap_or((0.0, 1.0));

    verify_are_positive(&[ethanol, water, sugar, fat, fat_density, other_solids])?;
    verify_is_100_percent(ethanol + water + sugar + fat + other_solids)?;

    let eth_sol_mass = ethanol + water;
    let eth_sol_vol = eth_sol_mass / ethanol_solution_density(100.0 * ethanol / eth_sol_mass);

    let sugar_vol = sugar / sugars::SUCROSE;
    let fat_vol = fat / fat_density;
    let other_solids_vol = other_solids / OTHER_DISSOLVED_SOLIDS;

    let volume = eth_sol_vol + sugar_vol + fat_vol + other_solids_vol;
    let mass = eth_sol_mass + sugar + fat + other_solids;

    Ok(mass / volume)
}

/// Convert dairy volume in milliliters to grams based on fat content percentage
///
/// Interpolates density between known values for milk/cream of different fat contents; see
/// [`MILK_2`](dairy::MILK_2), [`MILK_3_5`](dairy::MILK_3_5), and [`CREAM_40`](dairy::CREAM_40).
///
/// # Panics
///
/// Panics if `fat_content` is negative or greater than 100.
#[must_use]
pub const fn dairy_milliliters_to_grams(ml: f64, fat_content: f64) -> f64 {
    use dairy::{CREAM_40, MILK_2, MILK_3_5};

    let less_than_2 = MILK_2;
    let between_2_and_3_5 = ((MILK_3_5 - MILK_2) / (3.5 - 2.0) * (fat_content - 2.0)) + MILK_2;
    let between_3_5_and_40 = ((CREAM_40 - MILK_3_5) / (40.0 - 3.5) * (fat_content - 3.5)) + MILK_3_5;
    let more_than_40 = CREAM_40;

    match fat_content {
        0.0..=2.0 => ml * less_than_2,
        2.0..=3.5 => ml * between_2_and_3_5,
        3.5..=40.0 => ml * between_3_5_and_40,
        40.0..=100.0 => ml * more_than_40,
        _ => panic!("Invalid fat content"),
    }
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

    use super::*;

    use crate::util::{
        fast_interpolate_pairs, interpolate_pairs, table_supports_fast_interpolation, table_supports_interpolation,
    };

    #[test]
    fn dairy_milliliters_to_grams() {
        let expected_conversions = [
            (0.0, 1.034),
            (2.0, 1.034),
            (3.0, 1.0313_333),
            (3.5, 1.03),
            (5.0, 1.0271_233),
            (35.0, 0.969_589),
            (40.0, 0.96),
            (50.0, 0.96),
        ];

        for (fat_content, expected_density) in expected_conversions {
            let grams = super::dairy_milliliters_to_grams(100.0, fat_content);
            let expected_grams = 100.0 * expected_density;
            assert_eq_flt_test!(grams, expected_grams);
        }
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
                sugar: 0.0,
                fat: None,
                other_solids: 0.0,
            })
            .unwrap(),
            super::ethanol_solution_density(abw)
        );

        // Dissolving sucrose (denser than the solution) raises the density.
        assert_gt!(
            super::mixture_density(MixDensityParams {
                ethanol: abw,
                water: water - 10.0,
                sugar: 10.0,
                fat: None,
                other_solids: 0.0,
            })
            .unwrap(),
            super::ethanol_solution_density(abw)
        );
    }
}

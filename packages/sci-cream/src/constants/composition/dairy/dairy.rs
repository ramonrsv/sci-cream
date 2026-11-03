//! [`SolidsSource`] and its solids non-fat lines, and the milk fat and milk powder constants.

use serde::{Deserialize, Serialize};

use super::{
    casein::{
        STD_CASEIN_PROTEIN_IN_MCI_PROTEIN, STD_LACTOSE_IN_CASEINATE, STD_LACTOSE_IN_MCI, STD_MINERALS_IN_CASEINATE,
        STD_MINERALS_IN_MCI, STD_PROTEIN_IN_MCI,
    },
    milk::{
        STD_CASEIN_PROTEIN_IN_MSNF_PROTEIN, STD_LACTOSE_IN_MPI, STD_LACTOSE_IN_MSNF, STD_MINERALS_IN_MPI,
        STD_MINERALS_IN_MSNF, STD_PROTEIN_IN_MPI, STD_PROTEIN_IN_MSNF,
    },
    whey::{
        STD_LACTOSE_IN_WPI, STD_LACTOSE_IN_WS, STD_MINERALS_IN_WPI, STD_MINERALS_IN_WS, STD_PROTEIN_IN_WPI,
        STD_PROTEIN_IN_WS,
    },
};

#[cfg(doc)]
use crate::constants::composition::dairy::{
    self,
    casein::{self, STD_PROTEIN_IN_CASEINATE},
    milk, whey,
};

/// Indicates the origin of the non-fat solids in a dairy product, which affects its composition
#[derive(PartialEq, Eq, Serialize, Deserialize, Copy, Clone, Debug)]
pub enum SolidsSource {
    /// Milk solids (MSNF) and concentrates: an ~80/20 casein/whey split, lactose, 7.2-8% minerals
    ///
    /// Lactose and minerals decrease linearly as protein is concentrated, from plain milk solids to
    /// isolates, as computed by [`lactose_in_snf`] and [`minerals_in_snf`], while the casein/whey
    /// split stays the same. See [`dairy::milk`] for more information about the detailed
    /// composition of milk products.
    Milk,
    /// Sweet whey solids (WS) and their concentrates: whey proteins, lactose, 3.6-8.5% minerals
    ///
    /// Lactose and minerals decrease linearly as protein is concentrated, from sweet whey to
    /// isolates, as computed by [`lactose_in_snf`] and [`minerals_in_snf`]. See [`dairy::whey`] for
    /// more information about the detailed composition of whey products.
    Whey,
    /// Micellar casein solids: mostly casein proteins, lactose, ~8% minerals
    ///
    /// Lactose, minerals, and the casein share of the protein follow the protein fraction, from
    /// milk solids' to isolates', as computed by [`lactose_in_snf`], [`minerals_in_snf`], and
    /// [`casein_in_protein`]; protein fractions below milk solids' are unsupported. See
    /// [`dairy::casein`] for more information about the detailed composition of casein products.
    MicellarCasein,
    /// Caseinate solids: casein proteins, ~0.2% lactose, ~4% minerals
    ///
    /// Caseinates hold the fixed fractions [`STD_LACTOSE_IN_CASEINATE`],
    /// [`STD_PROTEIN_IN_CASEINATE`], and [`STD_MINERALS_IN_CASEINATE`] of sodium caseinate. See
    /// [`dairy::casein`] for more information about the detailed composition of casein products.
    Caseinate,
}

/// Estimate the lactose fraction of `source`'s solids non-fat from their protein fraction.
///
/// Evaluates the line [`lactose_in_snf_coeffs`] (`a + b × protein_in_snf`).
///
/// This is a pure evaluation and does not validate its inputs.
#[must_use]
pub const fn lactose_in_snf(protein_in_snf: f64, source: SolidsSource) -> f64 {
    let [a, b] = lactose_in_snf_coeffs(source);
    a + b * protein_in_snf
}

/// Get coefficients `[a, b]` of the line `a + b × protein_in_snf` for the lactose fraction of
/// `source`'s solids non-fat - constant for caseinate, linear otherwise.
///
/// Caseinate solids hold a fixed fraction, [`casein::STD_LACTOSE_IN_CASEINATE`], so their `b`
/// is 0. Milk's, whey's, and micellar casein's fall as their protein is concentrated, along the
/// lines from [`milk::STD_LACTOSE_IN_MSNF`], [`whey::STD_LACTOSE_IN_WS`], and
/// [`milk::STD_LACTOSE_IN_MSNF`] to [`milk::STD_LACTOSE_IN_MPI`], [`whey::STD_LACTOSE_IN_WPI`],
/// and [`casein::STD_LACTOSE_IN_MCI`], respectively, each at the
/// protein of its `STD_PROTEIN_IN_*` counterpart.
///
/// See [`lactose_in_snf`] for a function doing the computation with these coefficients.
#[must_use]
pub const fn lactose_in_snf_coeffs(source: SolidsSource) -> [f64; 2] {
    match source {
        SolidsSource::Milk => {
            line_through([STD_PROTEIN_IN_MSNF, STD_LACTOSE_IN_MSNF], [STD_PROTEIN_IN_MPI, STD_LACTOSE_IN_MPI])
        }
        SolidsSource::Whey => {
            line_through([STD_PROTEIN_IN_WS, STD_LACTOSE_IN_WS], [STD_PROTEIN_IN_WPI, STD_LACTOSE_IN_WPI])
        }
        SolidsSource::MicellarCasein => {
            line_through([STD_PROTEIN_IN_MSNF, STD_LACTOSE_IN_MSNF], [STD_PROTEIN_IN_MCI, STD_LACTOSE_IN_MCI])
        }
        SolidsSource::Caseinate => [STD_LACTOSE_IN_CASEINATE, 0.0],
    }
}

/// Estimate the minerals fraction of `source`'s solids non-fat from their protein fraction.
///
/// Evaluates the line [`minerals_in_snf_coeffs`] (`a + b × protein_in_snf`).
///
/// This is a pure evaluation and does not validate its inputs.
#[must_use]
pub const fn minerals_in_snf(protein_in_snf: f64, source: SolidsSource) -> f64 {
    let [a, b] = minerals_in_snf_coeffs(source);
    a + b * protein_in_snf
}

/// Get coefficients `[a, b]` of the line `a + b × protein_in_snf` for the minerals fraction of
/// `source`'s solids non-fat - constant for caseinate, linear otherwise.
///
/// Caseinate solids hold a fixed fraction, [`casein::STD_MINERALS_IN_CASEINATE`], so their `b`
/// is 0. Milk's, whey's, and micellar casein's fall as their protein is concentrated, along the
/// lines from [`milk::STD_MINERALS_IN_MSNF`], [`whey::STD_MINERALS_IN_WS`], and
/// [`milk::STD_MINERALS_IN_MSNF`] to [`milk::STD_MINERALS_IN_MPI`],
/// [`whey::STD_MINERALS_IN_WPI`], and [`casein::STD_MINERALS_IN_MCI`], respectively, each at
/// the protein of its `STD_PROTEIN_IN_*` counterpart.
///
/// See [`minerals_in_snf`] for a function doing the computation with these coefficients.
#[must_use]
pub const fn minerals_in_snf_coeffs(source: SolidsSource) -> [f64; 2] {
    match source {
        SolidsSource::Milk => {
            line_through([STD_PROTEIN_IN_MSNF, STD_MINERALS_IN_MSNF], [STD_PROTEIN_IN_MPI, STD_MINERALS_IN_MPI])
        }
        SolidsSource::Whey => {
            line_through([STD_PROTEIN_IN_WS, STD_MINERALS_IN_WS], [STD_PROTEIN_IN_WPI, STD_MINERALS_IN_WPI])
        }
        SolidsSource::MicellarCasein => {
            line_through([STD_PROTEIN_IN_MSNF, STD_MINERALS_IN_MSNF], [STD_PROTEIN_IN_MCI, STD_MINERALS_IN_MCI])
        }
        SolidsSource::Caseinate => [STD_MINERALS_IN_CASEINATE, 0.0],
    }
}

/// Estimate the unaccounted fraction of `source`'s solids non-fat from their protein fraction.
///
/// Evaluates the line [`unaccounted_in_snf_coeffs`] (`a + b × protein_in_snf`).
///
/// This is a pure evaluation and does not validate its inputs.
#[must_use]
pub const fn unaccounted_in_snf(protein_in_snf: f64, source: SolidsSource) -> f64 {
    let [a, b] = unaccounted_in_snf_coeffs(source);
    a + b * protein_in_snf
}

/// Get coefficients `[a, b]` of the line `a + b × protein_in_snf` for the unaccounted fraction
/// of `source`'s solids non-fat - linear for whey, zero otherwise.
///
/// The unaccounted solids are what the protein, lactose, and minerals leave. Milk, micellar
/// casein, and caseinate solids are modeled as wholly those, so their `a` and `b` are 0. Whey's
/// is what its protein and the [`lactose_in_snf`] and [`minerals_in_snf`] lines leave, falling
/// from 2% in sweet whey to 0.1% in isolates, see the [`whey`] module.
///
/// See [`unaccounted_in_snf`] for a function doing the computation with these coefficients.
#[must_use]
pub const fn unaccounted_in_snf_coeffs(source: SolidsSource) -> [f64; 2] {
    match source {
        SolidsSource::Milk | SolidsSource::MicellarCasein | SolidsSource::Caseinate => [0.0, 0.0],
        SolidsSource::Whey => {
            // `1 - protein - lactose - minerals`, lactose and minerals each `a + b × protein`
            let [lactose_a, lactose_b] = lactose_in_snf_coeffs(source);
            let [minerals_a, minerals_b] = minerals_in_snf_coeffs(source);
            [1.0 - lactose_a - minerals_a, -1.0 - lactose_b - minerals_b]
        }
    }
}

/// Estimate the casein share of `source`'s protein from its solids non-fat's protein fraction.
///
/// Evaluates the line [`casein_in_protein_coeffs`] (`a + b × protein_in_snf`).
///
/// This is a pure evaluation and does not validate its inputs.
#[must_use]
pub const fn casein_in_protein(protein_in_snf: f64, source: SolidsSource) -> f64 {
    let [a, b] = casein_in_protein_coeffs(source);
    a + b * protein_in_snf
}

/// Get coefficients `[a, b]` of the line `a + b × protein_in_snf` for the casein share of
/// `source`'s protein - linear for micellar casein, constant otherwise.
///
/// Milk solids, their concentrates included, hold the natural
/// [`milk::STD_CASEIN_PROTEIN_IN_MSNF_PROTEIN`] split, whey solids no casein, and caseinate
/// solids only casein, so their `b` is 0. Micellar casein's rises as its protein is
/// concentrated and its whey proteins filtered out, from milk solids' split at
/// [`milk::STD_PROTEIN_IN_MSNF`] protein to [`casein::STD_CASEIN_PROTEIN_IN_MCI_PROTEIN`] at
/// [`casein::STD_PROTEIN_IN_MCI`] protein in its isolates.
///
/// See [`casein_in_protein`] for a function doing the computation with these coefficients.
#[must_use]
pub const fn casein_in_protein_coeffs(source: SolidsSource) -> [f64; 2] {
    match source {
        SolidsSource::Milk => [STD_CASEIN_PROTEIN_IN_MSNF_PROTEIN, 0.0],
        SolidsSource::Whey => [0.0, 0.0],
        SolidsSource::MicellarCasein => line_through(
            [STD_PROTEIN_IN_MSNF, STD_CASEIN_PROTEIN_IN_MSNF_PROTEIN],
            [STD_PROTEIN_IN_MCI, STD_CASEIN_PROTEIN_IN_MCI_PROTEIN],
        ),
        SolidsSource::Caseinate => [1.0, 0.0],
    }
}

/// Get coefficients `[a, b]` of the line `a + b × x` through points `(x0, y0)` and `(x1, y1)`
const fn line_through([x0, y0]: [f64; 2], [x1, y1]: [f64; 2]) -> [f64; 2] {
    let slope = (y1 - y0) / (x1 - x0);
    [y0 - slope * x0, slope]
}

/// Minimum percentage of water typically found in milk powder
///
/// Skim milk and whole milk powder listed as having 97% and 98% total solids, respectively
/// (Goff & Hartel, 2025, Table 3.2, p. 48)[^20]. This is the low end of whole milk powder's
/// typical 2.0-3.0% moisture; skim's is 3.0-4.0% (USDEC, 2018, Tables 8, 11, pp. 32, 34)[^113].
#[doc = include_str!("../../../../docs/references/index/20.md")]
#[doc = include_str!("../../../../docs/references/index/113.md")]
pub const STD_MIN_WATER_CONTENT_IN_MILK_POWDER: f64 = 0.02;

/// Percentage of butterfat typically found in whole milk powder
///
/// (Goff & Hartel, 2025, Table 3.2, p. 48)[^20], (Parmalat Whole Milk Powder 26%, 2026,
/// PantryLot)[^520], (MMPA - Grade A Whole Milk Powder 26%, 2026, BulkMart)[^521]
///
/// Whole milk powder typically has 26.0-28.5% milkfat (ADPI, 2023, p. 1)[^122], (USDEC, 2018,
/// Table 11, p. 34)[^113], with 26% the standard's minimum (ADPI, 2023, p. 1)[^121].
#[expect(clippy::doc_markdown)] // _PantryLot_  and _BulkMart_ false positives
#[doc = include_str!("../../../../docs/references/index/20.md")]
#[doc = include_str!("../../../../docs/references/index/113.md")]
#[doc = include_str!("../../../../docs/references/index/121.md")]
#[doc = include_str!("../../../../docs/references/index/122.md")]
#[doc = include_str!("../../../../docs/references/index/520.md")]
#[doc = include_str!("../../../../docs/references/index/521.md")]
pub const STD_BUTTERFAT_IN_WHOLE_MILK_POWDER: f64 = 0.26;

/// Percentage of saturated fats typical of milk fat (Board on Agriculture.., 1974, p. 203)[^12]
#[doc = include_str!("../../../../docs/references/index/12.md")]
pub const STD_SATURATED_FAT_IN_MILK_FAT: f64 = 0.65;

/// Percentage of trans fats typically found in milk fat
///
/// (USDA, 2019, "Milk, whole, 3.25% milkfat, with added vitamin D")[^503]
#[expect(clippy::doc_markdown)] // _FoodData_ false positive
#[doc = include_str!("../../../../docs/references/index/503.md")]
pub const STD_TRANS_FAT_IN_MILK_FAT: f64 = 0.035;

#[cfg(test)]
#[cfg_attr(coverage, coverage(off))]
#[allow(clippy::float_cmp)]
mod tests {
    use crate::tests::asserts::shadow_asserts::assert_eq;
    use crate::tests::asserts::*;

    use crate::constants::composition::dairy::{self, SolidsSource};

    #[test]
    fn dairy_minerals_in_snf() {
        // Each line passes through both its anchors, to within float rounding
        for (source, protein_fraction, minerals_fraction) in [
            (SolidsSource::Milk, dairy::milk::STD_PROTEIN_IN_MSNF, dairy::milk::STD_MINERALS_IN_MSNF),
            (SolidsSource::Milk, dairy::milk::STD_PROTEIN_IN_MPI, dairy::milk::STD_MINERALS_IN_MPI),
            (SolidsSource::Whey, dairy::whey::STD_PROTEIN_IN_WS, dairy::whey::STD_MINERALS_IN_WS),
            (SolidsSource::Whey, dairy::whey::STD_PROTEIN_IN_WPI, dairy::whey::STD_MINERALS_IN_WPI),
            (SolidsSource::MicellarCasein, dairy::milk::STD_PROTEIN_IN_MSNF, dairy::milk::STD_MINERALS_IN_MSNF),
            (SolidsSource::MicellarCasein, dairy::casein::STD_PROTEIN_IN_MCI, dairy::casein::STD_MINERALS_IN_MCI),
        ] {
            assert_eq_flt!(dairy::minerals_in_snf(protein_fraction, source), minerals_fraction);
        }

        // Caseinate solids hold a fixed fraction, whatever their protein
        for protein_fraction in [0.0, 0.5, 1.0] {
            assert_eq!(
                dairy::minerals_in_snf(protein_fraction, SolidsSource::Caseinate),
                dairy::casein::STD_MINERALS_IN_CASEINATE
            );
        }
    }

    #[test]
    fn dairy_lactose_in_snf() {
        // Each line passes through both its anchors, to within float rounding
        for (source, protein_fraction, lactose_fraction) in [
            (SolidsSource::Milk, dairy::milk::STD_PROTEIN_IN_MSNF, dairy::milk::STD_LACTOSE_IN_MSNF),
            (SolidsSource::Milk, dairy::milk::STD_PROTEIN_IN_MPI, dairy::milk::STD_LACTOSE_IN_MPI),
            (SolidsSource::Whey, dairy::whey::STD_PROTEIN_IN_WS, dairy::whey::STD_LACTOSE_IN_WS),
            (SolidsSource::Whey, dairy::whey::STD_PROTEIN_IN_WPI, dairy::whey::STD_LACTOSE_IN_WPI),
            (SolidsSource::MicellarCasein, dairy::milk::STD_PROTEIN_IN_MSNF, dairy::milk::STD_LACTOSE_IN_MSNF),
            (SolidsSource::MicellarCasein, dairy::casein::STD_PROTEIN_IN_MCI, dairy::casein::STD_LACTOSE_IN_MCI),
        ] {
            assert_eq_flt!(dairy::lactose_in_snf(protein_fraction, source), lactose_fraction);
        }

        // Caseinate solids hold a fixed fraction, whatever their protein
        for protein_fraction in [0.0, 0.5, 1.0] {
            assert_eq!(
                dairy::lactose_in_snf(protein_fraction, SolidsSource::Caseinate),
                dairy::casein::STD_LACTOSE_IN_CASEINATE
            );
        }
    }

    #[test]
    fn dairy_unaccounted_in_snf() {
        // Whey's line leaves what the constants leave at each anchor, 2% of sweet whey solids and
        // 0.1% of isolate solids, to within float rounding
        for (protein_fraction, lactose_fraction, minerals_fraction) in [
            (dairy::whey::STD_PROTEIN_IN_WS, dairy::whey::STD_LACTOSE_IN_WS, dairy::whey::STD_MINERALS_IN_WS),
            (dairy::whey::STD_PROTEIN_IN_WPI, dairy::whey::STD_LACTOSE_IN_WPI, dairy::whey::STD_MINERALS_IN_WPI),
        ] {
            assert_eq_flt!(
                dairy::unaccounted_in_snf(protein_fraction, SolidsSource::Whey),
                1.0 - protein_fraction - lactose_fraction - minerals_fraction
            );
        }

        // Milk, micellar casein, and caseinate solids are all protein, lactose, and minerals
        for protein_fraction in [0.0, 0.5, 1.0] {
            assert_eq!(dairy::unaccounted_in_snf(protein_fraction, SolidsSource::Milk), 0.0);
            assert_eq!(dairy::unaccounted_in_snf(protein_fraction, SolidsSource::MicellarCasein), 0.0);
            assert_eq!(dairy::unaccounted_in_snf(protein_fraction, SolidsSource::Caseinate), 0.0);
        }
    }

    #[test]
    fn dairy_casein_in_protein() {
        // Micellar casein's line passes through both of its anchors, to within float rounding
        for (protein_fraction, casein_fraction) in [
            (dairy::milk::STD_PROTEIN_IN_MSNF, dairy::milk::STD_CASEIN_PROTEIN_IN_MSNF_PROTEIN),
            (dairy::casein::STD_PROTEIN_IN_MCI, dairy::casein::STD_CASEIN_PROTEIN_IN_MCI_PROTEIN),
        ] {
            assert_eq_flt!(dairy::casein_in_protein(protein_fraction, SolidsSource::MicellarCasein), casein_fraction);
        }

        // Milk, whey, and caseinate solids hold fixed splits, whatever their protein
        for protein_fraction in [0.0, 0.5, 1.0] {
            assert_eq!(
                dairy::casein_in_protein(protein_fraction, SolidsSource::Milk),
                dairy::milk::STD_CASEIN_PROTEIN_IN_MSNF_PROTEIN
            );
            assert_eq!(dairy::casein_in_protein(protein_fraction, SolidsSource::Whey), 0.0);
            assert_eq!(dairy::casein_in_protein(protein_fraction, SolidsSource::Caseinate), 1.0);
        }
    }

    #[test]
    fn dairy_milk_lines_partition_the_solids() {
        // From permeate-diluted solids through plain milk solids to isolates, protein, lactose, and
        // minerals fill the solids, lactose ≥ 0
        for protein_fraction in [
            0.0,
            0.25,
            dairy::milk::STD_PROTEIN_IN_MSNF,
            0.5,
            0.75,
            dairy::milk::STD_PROTEIN_IN_MPI,
        ] {
            let lactose_fraction = dairy::lactose_in_snf(protein_fraction, SolidsSource::Milk);
            let minerals_fraction = dairy::minerals_in_snf(protein_fraction, SolidsSource::Milk);

            assert_eq_flt!(protein_fraction + lactose_fraction + minerals_fraction, 1.0);
            assert_ge!(lactose_fraction, 0.0);
        }
    }

    #[test]
    fn dairy_whey_lines_partition_the_solids() {
        // From sweet whey to isolate, protein, lactose, minerals, and unaccounted solids make up
        // all of the whey solids, to within float rounding, with no negative unaccounted solids
        for protein_fraction in [
            dairy::whey::STD_PROTEIN_IN_WS,
            0.25,
            0.5,
            0.75,
            dairy::whey::STD_PROTEIN_IN_WPI,
        ] {
            let lactose_fraction = dairy::lactose_in_snf(protein_fraction, SolidsSource::Whey);
            let minerals_fraction = dairy::minerals_in_snf(protein_fraction, SolidsSource::Whey);
            let unaccounted_fraction = dairy::unaccounted_in_snf(protein_fraction, SolidsSource::Whey);

            assert_eq_flt!(protein_fraction + lactose_fraction + minerals_fraction + unaccounted_fraction, 1.0);
            assert_ge!(unaccounted_fraction, 0.0);
        }
    }

    #[test]
    fn dairy_micellar_casein_lines_partition_the_solids() {
        // From milk solids to isolates, protein, lactose, and minerals fill the solids, lactose ≥ 0
        for protein_fraction in [
            dairy::milk::STD_PROTEIN_IN_MSNF,
            0.5,
            0.75,
            dairy::casein::STD_PROTEIN_IN_MCI,
        ] {
            let lactose_fraction = dairy::lactose_in_snf(protein_fraction, SolidsSource::MicellarCasein);
            let minerals_fraction = dairy::minerals_in_snf(protein_fraction, SolidsSource::MicellarCasein);

            assert_eq_flt!(protein_fraction + lactose_fraction + minerals_fraction, 1.0);
            assert_ge!(lactose_fraction, 0.0);
        }
    }
}

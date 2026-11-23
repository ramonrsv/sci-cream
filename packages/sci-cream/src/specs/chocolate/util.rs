//! Helpers for the chocolate specs' fats, milk and cocoa solids, and hardness factor, and for
//! estimating a chocolate's cocoa and milk solids from its label.

use crate::{
    composition::{Carbohydrates, Fats, Fibers, MilkSolids, SimpleProteins, SimpleSolids, Sugars},
    constants::{
        composition::{
            cocoa::{
                STD_ASH_IN_DUTCHED_COCOA_SNF, STD_ASH_IN_NATURAL_COCOA_SNF, STD_CARBOHYDRATES_IN_DUTCHED_COCOA_SNF,
                STD_CARBOHYDRATES_IN_NATURAL_COCOA_SNF, STD_COCOA_BUTTER_IN_COCOA_SOLIDS, STD_FIBER_IN_COCOA_SNF,
                STD_PROTEIN_IN_COCOA_SNF, STD_SATURATED_FAT_IN_COCOA_BUTTER, STD_SUGARS_IN_COCOA_SNF,
            },
            dairy::{
                STD_BUTTERFAT_IN_WHOLE_MILK_POWDER, STD_SATURATED_FAT_IN_MILK_FAT, STD_TRANS_FAT_IN_MILK_FAT,
                SolidsSource,
                milk::{STD_MINERALS_IN_MSNF, STD_PROTEIN_IN_MSNF},
            },
        },
        hf,
    },
    error::{Error, Result},
    specs::{
        chocolate::{ChocolateFat, DeclaredSolids},
        dairy::make_milk_proteins,
    },
    validate::{Validate, is_subset, is_within_range, verify_is_subset},
};

#[cfg(doc)]
use crate::{
    constants::composition::{cocoa, dairy},
    specs::ChocolateLabelSpec,
};

/// Resolves the declared [`ChocolateFat`] into cocoa butter and milk fat contents.
///
/// If `fat` is provided as a [`Total`](ChocolateFat::Total), milk fat is determined first from
/// `milk_solids` and [`dairy::STD_BUTTERFAT_IN_WHOLE_MILK_POWDER`]. The remainder is cocoa butter,
/// equivalent to total fat if there are no milk solids. If `fat` is [None], then cocoa butter and
/// milk fat are independently calculated. Cocoa butter from `cacao_solids` and
/// [`cocoa::STD_COCOA_BUTTER_IN_COCOA_SOLIDS`], and milk fat from `milk_solids` and
/// [`dairy::STD_BUTTERFAT_IN_WHOLE_MILK_POWDER`].
///
/// Milk fat anchors a total fat's split, see [standard fractions](super#standard-fractions).
#[must_use]
pub fn resolve_chocolate_fats(cacao_solids: f64, milk_solids: f64, fat: Option<ChocolateFat>) -> (f64, f64) {
    let std_milk_fat = milk_fat_from_milk_solids(milk_solids);

    match fat {
        None => (cacao_solids * STD_COCOA_BUTTER_IN_COCOA_SOLIDS, std_milk_fat),
        Some(ChocolateFat::Total(total)) => (total - std_milk_fat, std_milk_fat),
        Some(ChocolateFat::Split { cocoa_butter, milk_fat }) => (cocoa_butter, milk_fat),
    }
}

/// Builds a [`MilkSolids`] from total milk solids and milk fat, with standard compositions
///
/// See [standard fractions](super#standard-fractions) for the blends these don't fit.
pub(super) fn make_milk_solids(milk_solids: f64, milk_fat: f64, lactose: &Sugars) -> Result<MilkSolids> {
    let milk_snf = milk_solids - milk_fat;
    let proteins = milk_snf * STD_PROTEIN_IN_MSNF;

    Ok(MilkSolids::new()
        .fats(
            Fats::new()
                .total(milk_fat)
                .saturated(milk_fat * STD_SATURATED_FAT_IN_MILK_FAT)
                .trans(milk_fat * STD_TRANS_FAT_IN_MILK_FAT),
        )
        .carbohydrates(Carbohydrates::new().sugars(*lactose))
        .proteins(make_milk_proteins(proteins, STD_PROTEIN_IN_MSNF, SolidsSource::Milk)?)
        .minerals(milk_snf * STD_MINERALS_IN_MSNF))
}

/// Creates a [`SimpleSolids`] representing the specified `cacao_solids` and `cocoa_butter`
///
/// Alkalization leaves a mineral residue that raises ash at the expense of carbohydrates, so
/// `dutch_processed` selects between the two pairs of standard fractions.
pub(super) fn make_cocoa_solids(cacao_solids: f64, cocoa_butter: f64, dutch_processed: bool) -> Result<SimpleSolids> {
    let cocoa_snf = cacao_solids - cocoa_butter;

    let (std_carbohydrates_in_cocoa_snf, std_ash_in_cocoa_snf) = if dutch_processed {
        (STD_CARBOHYDRATES_IN_DUTCHED_COCOA_SNF, STD_ASH_IN_DUTCHED_COCOA_SNF)
    } else {
        (STD_CARBOHYDRATES_IN_NATURAL_COCOA_SNF, STD_ASH_IN_NATURAL_COCOA_SNF)
    };

    SimpleSolids::new()
        .fats(
            Fats::new()
                .total(cocoa_butter)
                .saturated(cocoa_butter * STD_SATURATED_FAT_IN_COCOA_BUTTER),
        )
        .proteins(SimpleProteins::from_total(cocoa_snf * STD_PROTEIN_IN_COCOA_SNF))
        .carbohydrates(
            Carbohydrates::new()
                .fiber(Fibers::new().other(cocoa_snf * STD_FIBER_IN_COCOA_SNF))
                .others_from_total(cocoa_snf * std_carbohydrates_in_cocoa_snf)?,
        )
        .minerals(cocoa_snf * std_ash_in_cocoa_snf)
        .validate_into()
}

/// Calculates the hardness factor based on the specified `cacao_solids` and `cocoa_butter`
pub(super) fn calculate_cocoa_hardness(cacao_solids: f64, cocoa_butter: f64) -> f64 {
    let cocoa_snf = cacao_solids - cocoa_butter;
    cocoa_butter * hf::COCOA_BUTTER + cocoa_snf * hf::COCOA_SNF
}

/// Estimates a chocolate's cocoa solids non-fat, per 100 g, from its `fiber`, which milk lacks
///
/// This estimation assumes that milk contributes no significant fiber, as USDA's milk powder
/// listings report none, so all the fiber comes from the cocoa solids non-fat. Those are then
/// estimated as <code>fiber / [cocoa::STD_FIBER_IN_COCOA_SNF]</code>.
///
/// **Note:** The estimation holds where its [standard fractions](super#standard-fractions) do.
#[must_use]
pub const fn estimate_chocolate_cocoa_snf_from_fiber(fiber: f64) -> f64 {
    fiber / STD_FIBER_IN_COCOA_SNF
}

/// Estimates a chocolate's SNF split, per 100 g, from its `protein`, by its `fiber`
///
/// The split is `(cocoa_snf, msnf)`, the cocoa solids non-fat and the milk solids non-fat (MSNF),
/// which share the protein at [`cocoa::STD_PROTEIN_IN_COCOA_SNF`] and
/// [`dairy::milk::STD_PROTEIN_IN_MSNF`]. The protein left by the cocoa solids non-fat, estimated
/// from the `fiber` by [`estimate_chocolate_cocoa_snf_from_fiber`], gives the MSNF.
///
/// **Note:** The estimation holds where its [standard fractions](super#standard-fractions) do.
#[must_use]
pub const fn estimate_chocolate_snf_split_from_protein_by_fiber(protein: f64, fiber: f64) -> (f64, f64) {
    let cocoa_snf = estimate_chocolate_cocoa_snf_from_fiber(fiber);
    let milk_protein = protein - cocoa_snf * STD_PROTEIN_IN_COCOA_SNF;
    let msnf = milk_protein / STD_PROTEIN_IN_MSNF;
    (cocoa_snf, msnf)
}

/// Estimates a chocolate's SNF split, per 100 g, from its `protein`, by its `cacao_solids`
///
/// The split is `(cocoa_snf, msnf)`, the cocoa solids non-fat and the milk solids non-fat (MSNF),
/// which share the protein at [`cocoa::STD_PROTEIN_IN_COCOA_SNF`] and
/// [`dairy::milk::STD_PROTEIN_IN_MSNF`]. The cocoa solids non-fat are the `cacao_solids` less the
/// cocoa butter, which is the `fat` less the milk fat, at
/// [`dairy::STD_BUTTERFAT_IN_WHOLE_MILK_POWDER`] of the milk solids. So both shares depend on the
/// MSNF, which this solves for:
///
/// ```text
/// protein     = msnf * STD_PROTEIN_IN_MSNF + cocoa_snf * STD_PROTEIN_IN_COCOA_SNF
/// cocoa_snf   = cacao_solids - (fat - milk_fat)
/// milk_fat    = milk_solids * STD_BUTTERFAT_IN_WHOLE_MILK_POWDER
/// milk_solids = msnf + milk_fat
/// ```
///
/// **Note:** The estimation holds where its [standard fractions](super#standard-fractions) do.
#[must_use]
pub const fn estimate_chocolate_snf_split_from_protein_by_cacao_solids(
    protein: f64,
    fat: f64,
    cacao_solids: f64,
) -> (f64, f64) {
    let milk_fat_per_msnf = STD_BUTTERFAT_IN_WHOLE_MILK_POWDER / (1.0 - STD_BUTTERFAT_IN_WHOLE_MILK_POWDER);
    let protein_without_milk = (cacao_solids - fat) * STD_PROTEIN_IN_COCOA_SNF;
    let protein_per_msnf = STD_PROTEIN_IN_MSNF + milk_fat_per_msnf * STD_PROTEIN_IN_COCOA_SNF;
    let msnf = (protein - protein_without_milk) / protein_per_msnf;
    let milk_fat = msnf * milk_fat_per_msnf;
    let cocoa_snf = cacao_solids - (fat - milk_fat);
    (cocoa_snf, msnf)
}

/// Estimates a chocolate's SNF split, per 100 g, from its `protein`, by its `milk_solids`
///
/// The split is `(cocoa_snf, msnf)`, the cocoa solids non-fat and the milk solids non-fat (MSNF),
/// which share the protein at [`cocoa::STD_PROTEIN_IN_COCOA_SNF`] and
/// [`dairy::milk::STD_PROTEIN_IN_MSNF`]. The protein left by the MSNF, the `milk_solids` less
/// their milk fat at [`dairy::STD_BUTTERFAT_IN_WHOLE_MILK_POWDER`], gives the cocoa solids non-fat.
///
/// **Note:** The estimation holds where its [standard fractions](super#standard-fractions) do.
#[must_use]
pub const fn estimate_chocolate_snf_split_from_protein_by_milk_solids(protein: f64, milk_solids: f64) -> (f64, f64) {
    let msnf = msnf_from_milk_solids(milk_solids);
    let milk_protein = msnf * STD_PROTEIN_IN_MSNF;
    let cocoa_protein = protein - milk_protein;
    let cocoa_snf = cocoa_protein / STD_PROTEIN_IN_COCOA_SNF;
    (cocoa_snf, msnf)
}

/// The milk solids carrying `msnf`, with milk fat at [`dairy::STD_BUTTERFAT_IN_WHOLE_MILK_POWDER`]
const fn milk_solids_from_msnf(msnf: f64) -> f64 {
    msnf / (1.0 - STD_BUTTERFAT_IN_WHOLE_MILK_POWDER)
}

/// The MSNF of `milk_solids`, with milk fat at [`dairy::STD_BUTTERFAT_IN_WHOLE_MILK_POWDER`]
const fn msnf_from_milk_solids(milk_solids: f64) -> f64 {
    milk_solids * (1.0 - STD_BUTTERFAT_IN_WHOLE_MILK_POWDER)
}

/// The milk fat of `milk_solids`, at [`dairy::STD_BUTTERFAT_IN_WHOLE_MILK_POWDER`]
pub(super) const fn milk_fat_from_milk_solids(milk_solids: f64) -> f64 {
    milk_solids * STD_BUTTERFAT_IN_WHOLE_MILK_POWDER
}

/// The value of an [`Actual`](DeclaredSolids::Actual) declaration, or else `estimate`
pub(super) const fn actual_or(declared: Option<DeclaredSolids>, estimate: f64) -> f64 {
    match declared {
        Some(DeclaredSolids::Actual(value)) => value,
        _ => estimate,
    }
}

/// The value of a [`Min`](DeclaredSolids::Min) declaration, if it is one
const fn declared_minimum(declared: Option<DeclaredSolids>) -> Option<f64> {
    match declared {
        Some(DeclaredSolids::Min(min)) => Some(min),
        _ => None,
    }
}

/// Verifies that `value` meets the `declared` [`Min`](DeclaredSolids::Min), if it is one
pub(super) fn verify_declared_minimum(declared: Option<DeclaredSolids>, value: f64, field: &str) -> Result<()> {
    declared_minimum(declared)
        .map_or(Ok(()), |min| verify_is_subset(min, value, &format!("declared minimum {field} <= {field}")))
}

/// How far rounding can raise a label's printed sugars above the actual, in grams per serving
///
/// It is half the gram that US labels round sugars to (U.S. FDA, CFR 21, 101.9(c)(6)(ii))[^123].
#[doc = include_str!("../../../docs/references/index/123.md")]
const MAX_SUGARS_ROUNDING_EXCESS: f64 = 0.5;

/// Verifies that a label's `sugars` counted in its `cocoa_solids`, per 100 g, are the cocoa's own
///
/// Cocoa's intrinsic sugars are [`cocoa::STD_SUGARS_IN_COCOA_SNF`] of the cocoa solids, which
/// the label can exceed by [`MAX_SUGARS_ROUNDING_EXCESS`] per `serving_size` in grams.
pub(super) fn verify_cocoa_sugars_are_intrinsic(sugars: f64, cocoa_solids: f64, serving_size: f64) -> Result<()> {
    let intrinsic = cocoa_solids * STD_SUGARS_IN_COCOA_SNF;
    let rounding = MAX_SUGARS_ROUNDING_EXCESS * 100.0 / serving_size;

    if is_subset(sugars, intrinsic + rounding) {
        Ok(())
    } else {
        Err(Error::InvalidComposition(format!(
            "Sugars counted in the cocoa solids cannot exceed the cocoa's own: \
            {sugars} g per 100 g > {intrinsic} g, plus {rounding} g of rounding"
        )))
    }
}

/// How far rounding can move a label's printed protein from the actual, in grams per serving
///
/// It is half the gram that US labels round protein to (U.S. FDA, CFR 21, 101.9(c)(7))[^123].
#[doc = include_str!("../../../docs/references/index/123.md")]
const MAX_PROTEIN_ROUNDING_ERROR: f64 = 0.5;

/// Verifies that a label's `protein`, per 100 g, is the `composed` protein, to within rounding
///
/// The label rounds it to within [`MAX_PROTEIN_ROUNDING_ERROR`] per `serving_size` in grams.
pub(super) fn verify_protein_is_within_rounding(composed: f64, protein: f64, serving_size: f64) -> Result<()> {
    let rounding = MAX_PROTEIN_ROUNDING_ERROR * 100.0 / serving_size;

    if is_within_range(composed, protein - rounding, protein + rounding) {
        Ok(())
    } else {
        Err(Error::InvalidComposition(format!(
            "Composed protein must match the label's to within rounding: \
            {composed} g per 100 g against {protein} g, give or take {rounding} g"
        )))
    }
}

/// Derives a dark chocolate's cacao solids and sugars, per 100 g, from its label's `sugars` and
/// declared `cacao_solids`, see [`ChocolateLabelSpec`]
///
/// They are returned as `(cacao_solids, sugars)`. The label's sugars are total sugars, including
/// both added sucrose and those intrinsic to the cocoa. An [`Actual`](DeclaredSolids::Actual)
/// declaration for `cacao_solids` is taken as given, otherwise it's estimated as `100 - sugars`. A
/// [`Min`](DeclaredSolids::Min) declaration floors the estimate, the sugars taking the rest.
pub(super) const fn derive_dark_chocolate_solids(sugars: f64, cacao_solids: Option<DeclaredSolids>) -> (f64, f64) {
    let cacao = actual_or(cacao_solids, 100.0 - sugars);

    match declared_minimum(cacao_solids) {
        Some(min) if cacao < min => (min, 100.0 - min),
        _ => (cacao, sugars),
    }
}

/// Derives a milk chocolate's cacao and milk solids, per 100 g, from its label's `protein`, `fat`,
/// `fiber`, and declared `cacao_solids` and `milk_solids`, see [`ChocolateLabelSpec`]
///
/// The solids are returned as `(cacao_solids, milk_solids)`.
///
/// - [`Actual`](DeclaredSolids::Actual) declarations for both solids are taken as given.
/// - An [`Actual`](DeclaredSolids::Actual) declaration for one is taken as given, and the other is
///   derived from it via [`estimate_chocolate_snf_split_from_protein_by_cacao_solids`] or
///   [`estimate_chocolate_snf_split_from_protein_by_milk_solids`]; a [`Min`](DeclaredSolids::Min)
///   declaration for the other only validates the derived value.
/// - Otherwise, both solids are estimated from the `fiber` content via
///   [`estimate_chocolate_snf_split_from_protein_by_fiber`]. [`Min`](DeclaredSolids::Min)
///   declarations are used as floors for these estimates, or as stand-ins for
///   [`Actual`](DeclaredSolids::Actual) ones if no `fiber` is provided, with the `cacao_solids`
///   taking precedence. If a floor is applied, then the other value is re-derived from it.
///
/// A zero `fiber` counts as none, as labels print anything under half a gram as 0, e.g. US ones
/// (U.S. FDA, CFR 21, 101.9(c)(6)(i))[^123].
///
/// **Note:** If both `cacao_solids` and `milk_solids` are [`Actual`](DeclaredSolids::Actual),
/// then the `protein`, `fat`, and `fiber` go unused and unchecked. If both are
/// [`Min`](DeclaredSolids::Min) and no `fiber` is provided, then `milk_solids` only validates
/// the value `cacao_solids` gives.
///
/// # Errors
///
/// Returns [`Error::InvalidSpec`] without a nonzero fiber or a declaration to split the protein by,
/// and [`Error::InvalidComposition`] if the estimated solids can't meet the declared minimums.
#[doc = include_str!("../../../docs/references/index/123.md")]
pub fn derive_milk_chocolate_solids(
    protein: f64,
    fat: f64,
    fiber: Option<f64>,
    cacao_solids: Option<DeclaredSolids>,
    milk_solids: Option<DeclaredSolids>,
) -> Result<(f64, f64)> {
    let fiber = fiber.filter(|&fiber| fiber > 0.0);
    let milk_from_cacao = |cacao: f64| {
        let (_, msnf) = estimate_chocolate_snf_split_from_protein_by_cacao_solids(protein, fat, cacao);
        milk_solids_from_msnf(msnf)
    };
    let cacao_from_milk = |milk: f64| {
        let (cocoa_snf, _) = estimate_chocolate_snf_split_from_protein_by_milk_solids(protein, milk);
        cocoa_snf + (fat - milk_fat_from_milk_solids(milk))
    };

    let (cacao, milk) = match (cacao_solids, milk_solids) {
        (Some(DeclaredSolids::Actual(cacao)), Some(DeclaredSolids::Actual(milk))) => (cacao, milk),
        (Some(DeclaredSolids::Actual(cacao)), _) => (cacao, milk_from_cacao(cacao)),
        (_, Some(DeclaredSolids::Actual(milk))) => (cacao_from_milk(milk), milk),
        _ => {
            let (min_cacao, min_milk) = (declared_minimum(cacao_solids), declared_minimum(milk_solids));

            let (cacao, milk) = match (fiber, min_cacao, min_milk) {
                (Some(fiber), _, _) => {
                    let (cocoa_snf, msnf) = estimate_chocolate_snf_split_from_protein_by_fiber(protein, fiber);
                    let milk = milk_solids_from_msnf(msnf);
                    let cocoa_butter = fat - milk_fat_from_milk_solids(milk);
                    (cocoa_snf + cocoa_butter, milk)
                }
                (None, Some(cacao), _) => (cacao, milk_from_cacao(cacao)),
                (None, None, Some(milk)) => (cacao_from_milk(milk), milk),
                (None, None, None) => {
                    return Err(Error::InvalidSpec(
                        "Milk chocolate labels need a nonzero fiber, or declared cacao or milk solids".to_string(),
                    ));
                }
            };

            match (min_cacao, min_milk) {
                (Some(min), _) if cacao < min => (min, milk_from_cacao(min)),
                (_, Some(min)) if milk < min => (cacao_from_milk(min), min),
                _ => (cacao, milk),
            }
        }
    };

    verify_declared_minimum(cacao_solids, cacao, "cacao_solids")?;
    verify_declared_minimum(milk_solids, milk, "milk_solids")?;
    Ok((cacao, milk))
}

/// Derives a white chocolate's cacao and milk solids, per 100 g, from its label's `protein`, `fat`,
/// and declared `cacao_solids` and `milk_solids`, see [`ChocolateLabelSpec`]
///
/// The solids are returned as `(cacao_solids, milk_solids)`.
///
/// White chocolate is assumed to contain no cocoa solids non-fat, so all the cacao solids are
/// cocoa butter, the remainder of `fat` after subtracting the milk fat. All the `protein` is
/// likewise assumed to be entirely from the milk solids non-fat (MSNF).
///
/// - [`Actual`](DeclaredSolids::Actual) declarations for both solids are taken as given.
/// - An [`Actual`](DeclaredSolids::Actual) declaration for one is taken as given, and the other is
///   derived from it: cacao solids from milk solids as the `fat` less their milk fat, at
///   [`dairy::STD_BUTTERFAT_IN_WHOLE_MILK_POWDER`], or milk solids from cacao solids as the MSNF
///   plus the `fat` the cacao solids leave. A [`Min`](DeclaredSolids::Min) declaration for the
///   other only validates the derived value.
/// - Otherwise, the milk solids are estimated from the MSNF, with milk fat at
///   [`dairy::STD_BUTTERFAT_IN_WHOLE_MILK_POWDER`], and the cacao solids from them as above.
///   [`Min`](DeclaredSolids::Min) declarations are used as floors for these estimates. If a floor
///   is applied, then the other value is re-derived from it.
///
/// **Note:** An [`Actual`](DeclaredSolids::Actual) `milk_solids` leaves the `protein` unused and
/// unchecked, whatever the `cacao_solids` declare. If both are [`Actual`](DeclaredSolids::Actual),
/// then the `fat` is only used as a validation ceiling for the `cacao_solids`.
///
/// # Errors
///
/// Returns [`Error::InvalidComposition`] if the cacao solids exceed the `fat`, or if the estimated
/// solids can't meet the declared minimums.
pub fn derive_white_chocolate_solids(
    protein: f64,
    fat: f64,
    cacao_solids: Option<DeclaredSolids>,
    milk_solids: Option<DeclaredSolids>,
) -> Result<(f64, f64)> {
    let msnf = protein / STD_PROTEIN_IN_MSNF;
    let milk_from_cacao = |cacao: f64| msnf + (fat - cacao);
    let cacao_from_milk = |milk: f64| fat - milk_fat_from_milk_solids(milk);

    let (cacao, milk) = match (cacao_solids, milk_solids) {
        (Some(DeclaredSolids::Actual(cacao)), Some(DeclaredSolids::Actual(milk))) => (cacao, milk),
        (Some(DeclaredSolids::Actual(cacao)), _) => (cacao, milk_from_cacao(cacao)),
        (_, Some(DeclaredSolids::Actual(milk))) => (cacao_from_milk(milk), milk),
        _ => {
            let milk = milk_solids_from_msnf(msnf);
            let cacao = cacao_from_milk(milk);

            match (declared_minimum(cacao_solids), declared_minimum(milk_solids)) {
                (Some(min), _) if cacao < min => (min, milk_from_cacao(min)),
                (_, Some(min)) if milk < min => (cacao_from_milk(min), min),
                _ => (cacao, milk),
            }
        }
    };

    verify_is_subset(cacao, fat, "cacao_solids <= fat")?;
    verify_declared_minimum(cacao_solids, cacao, "cacao_solids")?;
    verify_declared_minimum(milk_solids, milk, "milk_solids")?;
    Ok((cacao, milk))
}

#[cfg(test)]
#[cfg_attr(coverage, coverage(off))]
#[allow(clippy::unwrap_used, clippy::float_cmp)]
mod tests {
    use crate::tests::asserts::shadow_asserts::assert_eq;
    use crate::tests::asserts::*;

    use super::*;

    /// USDA milk chocolate's listing, per 100 g: protein, fat, and fiber
    const USDA_MILK: (f64, f64, f64) = (7.65, 29.7, 3.4);

    #[test]
    fn estimate_chocolate_snf_split_from_protein_by_cacao_solids_agrees_with_the_fiber_split() {
        let (protein, fat, fiber) = USDA_MILK;
        let (cocoa_snf, msnf) = estimate_chocolate_snf_split_from_protein_by_fiber(protein, fiber);
        let milk_fat = milk_solids_from_msnf(msnf) * STD_BUTTERFAT_IN_WHOLE_MILK_POWDER;
        let cacao_solids = cocoa_snf + fat - milk_fat;
        let split = estimate_chocolate_snf_split_from_protein_by_cacao_solids(protein, fat, cacao_solids);

        assert_eq_flt!(split.0, cocoa_snf);
        assert_eq_flt!(split.1, msnf);
    }

    #[test]
    fn estimate_chocolate_snf_split_from_protein_by_milk_solids_agrees_with_the_fiber_split() {
        let (protein, _, fiber) = USDA_MILK;
        let (cocoa_snf, msnf) = estimate_chocolate_snf_split_from_protein_by_fiber(protein, fiber);
        let split = estimate_chocolate_snf_split_from_protein_by_milk_solids(protein, milk_solids_from_msnf(msnf));

        assert_eq_flt!(split.0, cocoa_snf);
        assert_eq_flt!(split.1, msnf);
    }

    #[test]
    fn verify_cocoa_sugars_are_intrinsic_allows_what_rounding_adds() {
        // USDA's natural cocoa as a 100 g label: 1.75 g of sugars over 83.3 g of cocoa solids
        let own = 83.3 * STD_SUGARS_IN_COCOA_SNF;

        assert!(verify_cocoa_sugars_are_intrinsic(1.75, 83.3, 100.0).is_ok());
        assert!(verify_cocoa_sugars_are_intrinsic(own + 0.5, 83.3, 100.0).is_ok());

        let result = verify_cocoa_sugars_are_intrinsic(own + 0.6, 83.3, 100.0);
        assert!(matches!(result, Err(Error::InvalidComposition(_))));
    }

    #[test]
    fn verify_cocoa_sugars_are_intrinsic_err_on_a_sweetened_cocoa() {
        // A 5 g serving printing 1 g of sugars carries at least 10%, against its cocoa's own 1.6%
        let result = verify_cocoa_sugars_are_intrinsic(20.0, 75.0, 5.0);
        assert!(matches!(result, Err(Error::InvalidComposition(_))));
    }

    #[test]
    fn verify_cocoa_sugars_are_intrinsic_allows_a_dark_minimum_within_the_sugars_rounding() {
        // A 13 g serving's 4 g of sugars may be as little as 3.5 g, so a 70% minimum still holds
        let sugars = 400.0 / 13.0;
        let (cacao, added_sugars) = derive_dark_chocolate_solids(sugars, Some(DeclaredSolids::Min(70.0)));
        assert!(verify_cocoa_sugars_are_intrinsic(sugars - added_sugars, cacao - 40.0, 13.0).is_ok());
    }

    #[test]
    fn verify_cocoa_sugars_are_intrinsic_allows_a_dark_minimum_within_the_cocoas_own_sugars() {
        // 30.9 g of sugars per 100 g may be as little as 30.4 g, of which the cocoa's own 0.63 g
        // belong to the cacao solids at 40% fat, up to 70.23%, so a 70% minimum still holds
        let (cacao, added_sugars) = derive_dark_chocolate_solids(30.9, Some(DeclaredSolids::Min(70.0)));
        assert!(verify_cocoa_sugars_are_intrinsic(30.9 - added_sugars, cacao - 40.0, 100.0).is_ok());
    }

    #[test]
    fn verify_cocoa_sugars_are_intrinsic_err_on_a_dark_minimum_beyond_the_allowance() {
        // 12 g of sugars per 40 g may be as little as 11.5 g, 28.75%, and the cocoa's own 0.735 g
        // belong to the cacao solids at 40% fat, up to 71.985%, still short of a 75% minimum
        let (cacao, added_sugars) = derive_dark_chocolate_solids(30.0, Some(DeclaredSolids::Min(75.0)));
        let result = verify_cocoa_sugars_are_intrinsic(30.0 - added_sugars, cacao - 40.0, 40.0);
        assert!(matches!(result, Err(Error::InvalidComposition(_))));
    }

    #[test]
    fn verify_protein_is_within_rounding_allows_half_a_gram_per_serving_either_way() {
        // 7 g per 100 g may be 6.5-7.5 g, and 3 g per 40 g, 7.5 g per 100 g, 6.25-8.75 g
        for composed in [6.5, 7.5] {
            assert!(verify_protein_is_within_rounding(composed, 7.0, 100.0).is_ok());
        }
        for composed in [6.25, 8.75] {
            assert!(verify_protein_is_within_rounding(composed, 7.5, 40.0).is_ok());
        }
    }

    #[test]
    fn verify_protein_is_within_rounding_err_beyond_the_rounding() {
        // 7 g per 100 g may be no less than 6.5 g and no more than 7.5 g
        for composed in [6.4, 7.6] {
            let result = verify_protein_is_within_rounding(composed, 7.0, 100.0);
            assert!(matches!(result, Err(Error::InvalidComposition(_))));
        }
    }

    #[test]
    fn derive_dark_chocolate_solids_takes_all_but_the_sugars_as_cacao_solids() {
        // Lindt 70%'s label, whose 12 g of sugars per 40 g, 30%, meet its declared minimum
        let min = Some(DeclaredSolids::Min(70.0));
        assert_eq!(derive_dark_chocolate_solids(30.0, min), (70.0, 30.0));
        assert_eq!(derive_dark_chocolate_solids(30.0, None), (70.0, 30.0));

        let actual = Some(DeclaredSolids::Actual(68.0));
        assert_eq!(derive_dark_chocolate_solids(30.0, actual), (68.0, 30.0));
    }

    #[test]
    fn derive_dark_chocolate_solids_minimum_floors_the_estimate() {
        // The estimates, 69.23% and 69.1%, fall short of a 70% minimum, as 70% does of a 75% one
        let min = Some(DeclaredSolids::Min(70.0));
        assert_eq!(derive_dark_chocolate_solids(400.0 / 13.0, min), (70.0, 30.0));
        assert_eq!(derive_dark_chocolate_solids(30.9, min), (70.0, 30.0));
        assert_eq!(derive_dark_chocolate_solids(30.0, Some(DeclaredSolids::Min(75.0))), (75.0, 25.0));
    }

    #[test]
    fn derive_milk_chocolate_solids_splits_the_protein_by_the_fiber() {
        let (protein, fat, fiber) = USDA_MILK;
        let (cacao, milk) = derive_milk_chocolate_solids(protein, fat, Some(fiber), None, None).unwrap();

        assert_eq_6dp!(cacao, 33.507_598);
        assert_eq_6dp!(milk, 19.950_427);
    }

    #[test]
    fn derive_milk_chocolate_solids_actual_cacao_solids_fix_their_side() {
        let actual = Some(DeclaredSolids::Actual(35.0));
        let (cacao, milk) = derive_milk_chocolate_solids(9.8, 36.0, Some(2.8), actual, None).unwrap();

        assert_eq!(cacao, 35.0);
        assert_eq_6dp!(milk, 29.636_740);
    }

    #[test]
    fn derive_milk_chocolate_solids_actual_milk_solids_fix_their_side() {
        let actual = Some(DeclaredSolids::Actual(25.0));
        let (cacao, milk) = derive_milk_chocolate_solids(9.8, 36.0, Some(2.8), None, actual).unwrap();

        assert_eq_6dp!(cacao, 41.680_851);
        assert_eq!(milk, 25.0);
    }

    #[test]
    fn derive_milk_chocolate_solids_actual_declarations_fix_both_sides() {
        let (cacao, milk) = (Some(DeclaredSolids::Actual(35.0)), Some(DeclaredSolids::Actual(25.0)));
        let solids = derive_milk_chocolate_solids(9.8, 36.0, Some(2.8), cacao, milk).unwrap();
        assert_eq!(solids, (35.0, 25.0));
    }

    #[test]
    fn derive_milk_chocolate_solids_minimum_floors_the_fiber_estimate() {
        // Green & Black's Organic Milk, whose fiber puts the cacao solids at 35.9%
        let (cacao_min, milk_min) = (Some(DeclaredSolids::Min(37.0)), Some(DeclaredSolids::Min(24.0)));
        let (cacao, milk) = derive_milk_chocolate_solids(9.8, 36.0, Some(2.8), cacao_min, milk_min).unwrap();

        assert_eq!(cacao, 37.0);
        assert_eq_6dp!(milk, 28.248_671);
    }

    #[test]
    fn derive_milk_chocolate_solids_minimum_stands_in_without_fiber() {
        // Lindt Classic Milk's UK label, which gives no fiber
        let (cacao_min, milk_min) = (Some(DeclaredSolids::Min(30.0)), Some(DeclaredSolids::Min(20.0)));
        let (cacao, milk) = derive_milk_chocolate_solids(7.0, 32.0, None, cacao_min, milk_min).unwrap();

        assert_eq!(cacao, 30.0);
        assert_eq_6dp!(milk, 22.061_429);

        let (cacao, milk) = derive_milk_chocolate_solids(7.0, 32.0, None, None, milk_min).unwrap();

        assert_eq_6dp!(cacao, 32.970_213);
        assert_eq!(milk, 20.0);
    }

    #[test]
    fn derive_milk_chocolate_solids_err_when_both_minimums_bind() {
        let (cacao_min, milk_min) = (Some(DeclaredSolids::Min(30.0)), Some(DeclaredSolids::Min(23.0)));
        let result = derive_milk_chocolate_solids(7.0, 32.0, None, cacao_min, milk_min);
        assert!(matches!(result, Err(Error::InvalidComposition(_))));
    }

    #[test]
    fn derive_milk_chocolate_solids_err_without_fiber_or_declarations() {
        let result = derive_milk_chocolate_solids(7.0, 32.0, None, None, None);
        assert!(matches!(result, Err(Error::InvalidSpec(_))));
    }

    #[test]
    fn derive_milk_chocolate_solids_takes_a_zero_fiber_as_none() {
        // Lindt Classic Milk's UK label, were it to print 0 g of fiber
        let (cacao_min, milk_min) = (Some(DeclaredSolids::Min(30.0)), Some(DeclaredSolids::Min(20.0)));
        let without_fiber = derive_milk_chocolate_solids(7.0, 32.0, None, cacao_min, milk_min).unwrap();
        let zero_fiber = derive_milk_chocolate_solids(7.0, 32.0, Some(0.0), cacao_min, milk_min).unwrap();
        assert_eq!(zero_fiber, without_fiber);

        let result = derive_milk_chocolate_solids(7.0, 32.0, Some(0.0), None, None);
        assert!(matches!(result, Err(Error::InvalidSpec(_))));
    }

    #[test]
    fn derive_white_chocolate_solids_takes_all_the_protein_as_milk() {
        // Green & Black's Organic White, declaring at least 30% cocoa and 26% milk solids
        let (cacao_min, milk_min) = (Some(DeclaredSolids::Min(30.0)), Some(DeclaredSolids::Min(26.0)));
        let (cacao, milk) = derive_white_chocolate_solids(7.9, 38.0, cacao_min, milk_min).unwrap();

        assert_eq_6dp!(cacao, 30.598_198);
        assert_eq_6dp!(milk, 28.468_468);
    }

    #[test]
    fn derive_white_chocolate_solids_minimum_floors_the_estimate() {
        // Green & Black's Organic White, whose protein gives 30.6% cacao and 28.5% milk solids
        let cacao_min = Some(DeclaredSolids::Min(31.0));
        let (cacao, milk) = derive_white_chocolate_solids(7.9, 38.0, cacao_min, None).unwrap();

        assert_eq!(cacao, 31.0);
        assert_eq_6dp!(milk, 28.066_667);

        let milk_min = Some(DeclaredSolids::Min(29.0));
        let (cacao, milk) = derive_white_chocolate_solids(7.9, 38.0, None, milk_min).unwrap();

        assert_eq_flt!(cacao, 30.46);
        assert_eq!(milk, 29.0);
    }

    #[test]
    fn derive_white_chocolate_solids_err_when_both_minimums_bind() {
        let (cacao_min, milk_min) = (Some(DeclaredSolids::Min(31.0)), Some(DeclaredSolids::Min(28.5)));
        let result = derive_white_chocolate_solids(7.9, 38.0, cacao_min, milk_min);
        assert!(matches!(result, Err(Error::InvalidComposition(_))));
    }

    #[test]
    fn derive_white_chocolate_solids_actual_cacao_solids_fix_their_side() {
        let actual = Some(DeclaredSolids::Actual(30.0));
        let (cacao, milk) = derive_white_chocolate_solids(7.9, 38.0, actual, None).unwrap();

        assert_eq!(cacao, 30.0);
        assert_eq_6dp!(milk, 29.066_667);
    }

    #[test]
    fn derive_white_chocolate_solids_err_when_cacao_solids_exceed_the_fat() {
        let actual = Some(DeclaredSolids::Actual(39.0));
        let result = derive_white_chocolate_solids(7.9, 38.0, actual, None);
        assert!(matches!(result, Err(Error::InvalidComposition(_))));
    }

    #[test]
    fn derive_white_chocolate_solids_actual_milk_solids_fix_their_side() {
        let actual = Some(DeclaredSolids::Actual(26.0));
        let (cacao, milk) = derive_white_chocolate_solids(7.9, 38.0, None, actual).unwrap();

        assert_eq_flt!(cacao, 31.24);
        assert_eq!(milk, 26.0);
    }
}

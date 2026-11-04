//! Helpers for the chocolate specs' fats, milk and cocoa solids, and hardness factor, and for
//! estimating a chocolate's cocoa and milk solids from its fiber and protein.

use crate::{
    composition::{Carbohydrates, Fats, Fibers, MilkSolids, SimpleProteins, SimpleSolids, Sugars},
    constants::{
        composition::{
            cacao::{
                STD_ASH_IN_DUTCHED_COCOA_SOLIDS, STD_ASH_IN_NATURAL_COCOA_SOLIDS,
                STD_CARBOHYDRATES_IN_DUTCHED_COCOA_SOLIDS, STD_CARBOHYDRATES_IN_NATURAL_COCOA_SOLIDS,
                STD_COCOA_BUTTER_IN_CACAO_SOLIDS, STD_FIBER_IN_COCOA_SOLIDS, STD_PROTEIN_IN_COCOA_SOLIDS,
                STD_SATURATED_FAT_IN_COCOA_BUTTER,
            },
            dairy::{
                STD_BUTTERFAT_IN_WHOLE_MILK_POWDER, STD_SATURATED_FAT_IN_MILK_FAT, STD_TRANS_FAT_IN_MILK_FAT,
                SolidsSource,
                milk::{STD_MINERALS_IN_MSNF, STD_PROTEIN_IN_MSNF},
            },
        },
        hf,
    },
    error::Result,
    specs::{chocolate::ChocolateFat, dairy::make_milk_proteins},
    validate::Validate,
};

#[cfg(doc)]
use crate::constants::composition::{cacao, dairy};

/// Resolves the declared [`ChocolateFat`] into cocoa butter and milk fat contents.
///
/// If `fat` is provided as a [`Total`](ChocolateFat::Total), milk fat is determined first from
/// `milk_solids` and [`dairy::STD_BUTTERFAT_IN_WHOLE_MILK_POWDER`]. The remainder is cocoa butter,
/// equivalent to total fat if there are no milk solids. If `fat` is [None], then cocoa butter and
/// milk fat are independently calculated. Cocoa butter from `cacao_solids` and
/// [`cacao::STD_COCOA_BUTTER_IN_CACAO_SOLIDS`], and milk fat from `milk_solids` and
/// [`dairy::STD_BUTTERFAT_IN_WHOLE_MILK_POWDER`].
///
/// Milk fat anchors the split when unspecified because the milk fat content of milk solids is more
/// consistent than the cocoa butter content of cacao solids. The former usually comes from a single
/// whole milk powder ingredient, while products often include additional cocoa butter from other
/// sources. Products with separately added butterfat need an explicit [`ChocolateFat::Split`].
pub(super) fn resolve_fats(cacao_solids: f64, milk_solids: f64, fat: Option<ChocolateFat>) -> (f64, f64) {
    let std_milk_fat = milk_solids * STD_BUTTERFAT_IN_WHOLE_MILK_POWDER;

    match fat {
        None => (cacao_solids * STD_COCOA_BUTTER_IN_CACAO_SOLIDS, std_milk_fat),
        Some(ChocolateFat::Total(total)) => (total - std_milk_fat, std_milk_fat),
        Some(ChocolateFat::Split { cocoa_butter, milk_fat }) => (cocoa_butter, milk_fat),
    }
}

/// Builds a [`MilkSolids`] from total milk solids and milk fat, with standard compositions
///
/// Blends that depart from standard composition values - added lactose, whey, buttermilk - should
/// be specified in a [`CompositeSpec`](crate::specs::CompositeSpec) instead.
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

    let (std_carbohydrates_in_cocoa_solids, std_ash_in_cocoa_solids) = if dutch_processed {
        (STD_CARBOHYDRATES_IN_DUTCHED_COCOA_SOLIDS, STD_ASH_IN_DUTCHED_COCOA_SOLIDS)
    } else {
        (STD_CARBOHYDRATES_IN_NATURAL_COCOA_SOLIDS, STD_ASH_IN_NATURAL_COCOA_SOLIDS)
    };

    SimpleSolids::new()
        .fats(
            Fats::new()
                .total(cocoa_butter)
                .saturated(cocoa_butter * STD_SATURATED_FAT_IN_COCOA_BUTTER),
        )
        .proteins(SimpleProteins::from_total(cocoa_snf * STD_PROTEIN_IN_COCOA_SOLIDS))
        .carbohydrates(
            Carbohydrates::new()
                .fiber(Fibers::new().other(cocoa_snf * STD_FIBER_IN_COCOA_SOLIDS))
                .others_from_total(cocoa_snf * std_carbohydrates_in_cocoa_solids)?,
        )
        .minerals(cocoa_snf * std_ash_in_cocoa_solids)
        .validate_into()
}

/// Calculates the hardness factor based on the specified `cacao_solids` and `cocoa_butter`
pub(super) fn calculate_cocoa_hardness(cacao_solids: f64, cocoa_butter: f64) -> f64 {
    let cocoa_snf = cacao_solids - cocoa_butter;
    cocoa_butter * hf::COCOA_BUTTER + cocoa_snf * hf::COCOA_SOLIDS
}

/// Estimates a chocolate's cocoa solids non-fat, per 100 g, from its `fiber`, which milk lacks
///
/// This estimation assumes that milk contributes no significant fiber, as USDA's milk powder
/// listings report none, so all the fiber comes from the cocoa solids non-fat. Those are then
/// estimated as <code>fiber / [cacao::STD_FIBER_IN_COCOA_SOLIDS]</code>.
#[must_use]
pub const fn estimate_cocoa_snf(fiber: f64) -> f64 {
    fiber / STD_FIBER_IN_COCOA_SOLIDS
}

/// Estimates a chocolate's milk solids non-fat (MSNF), per 100 g, from its `protein` and `fiber`
///
/// Cocoa solids non-fat are first estimated from the `fiber` using [`estimate_cocoa_snf`], and
/// their protein from [`cacao::STD_PROTEIN_IN_COCOA_SOLIDS`]. The remaining protein is taken to be
/// entirely the MSNF's, then <code>milk_protein / [dairy::milk::STD_PROTEIN_IN_MSNF]</code> gives
/// the MSNF, where `milk_protein` is calculated as `protein - cocoa_protein`.
#[must_use]
pub const fn estimate_chocolate_msnf(protein: f64, fiber: f64) -> f64 {
    let cocoa_protein = estimate_cocoa_snf(fiber) * STD_PROTEIN_IN_COCOA_SOLIDS;
    let milk_protein = protein - cocoa_protein;
    milk_protein / STD_PROTEIN_IN_MSNF
}

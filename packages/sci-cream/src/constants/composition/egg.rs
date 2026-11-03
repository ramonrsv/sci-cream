//! Standard composition values for eggs, including yolks, whites, and whole eggs.

/// Percentage of egg yolk in a whole egg, by weight (Goff & Hartel, 2025, p. 84)[^20]
#[doc = include_str!("../../../docs/references/index/20.md")]
pub const STD_EGG_YOLKS_IN_WHOLE_EGG: f64 = 0.35;

/// Percentage of egg whites in a whole egg, by weight (Goff & Hartel, 2025, p. 84)[^20]
///
/// Calculated as 65%, the remainder of 100% - [`STD_EGG_YOLKS_IN_WHOLE_EGG`],
/// so the two add up to 1:
///
/// ```
/// # use sci_cream::constants::composition::egg::*;
/// assert_eq!(STD_EGG_YOLKS_IN_WHOLE_EGG + STD_EGG_WHITES_IN_WHOLE_EGG, 1.0);
/// ```
#[doc = include_str!("../../../docs/references/index/20.md")]
pub const STD_EGG_WHITES_IN_WHOLE_EGG: f64 = 0.65;

/// Percentage of protein typically found in egg yolk
///
/// (Clarke, 2004, p. 49)[^4], (Goff & Hartel, 2025, p. 48)[^20], (USDA, 2019,
/// "Eggs, Grade A, Large, egg yolk")[^500].
#[expect(clippy::doc_markdown)] // _FoodData_ false positive
#[doc = include_str!("../../../docs/references/index/4.md")]
#[doc = include_str!("../../../docs/references/index/20.md")]
#[doc = include_str!("../../../docs/references/index/500.md")]
pub const STD_PROTEIN_IN_EGG_YOLK: f64 = 0.16;

/// Percentage of protein typically found in egg white
///
/// (USDA, 2019, "Eggs, Grade A, Large, egg white")[^518]
#[expect(clippy::doc_markdown)] // _FoodData_ false positive
#[doc = include_str!("../../../docs/references/index/518.md")]
pub const STD_PROTEIN_IN_EGG_WHITE: f64 = 0.11;

/// Percentage of solids typically found in egg yolk
///
/// Sources list the total solids content of egg yolks to be between 48-51% by weight; 50% is a
/// reasonable average of these values (Clarke, 2004, p. 49)[^4], (Goff & Hartel, 2025, p.
/// 48)[^20], (USDA, 2019, "Eggs, Grade A, Large, egg yolk")[^500].
#[expect(clippy::doc_markdown)] // _FoodData_ false positive
#[doc = include_str!("../../../docs/references/index/4.md")]
#[doc = include_str!("../../../docs/references/index/20.md")]
#[doc = include_str!("../../../docs/references/index/500.md")]
pub const STD_SOLIDS_IN_EGG_YOLK: f64 = 0.50;

/// Percentage of solids typically found in egg white
///
/// (USDA, 2019, "Eggs, Grade A, Large, egg white")[^518]
#[expect(clippy::doc_markdown)] // _FoodData_ false positive
#[doc = include_str!("../../../docs/references/index/518.md")]
pub const STD_SOLIDS_IN_EGG_WHITE: f64 = 0.14;

/// Percentage of protein typically found in egg yolk solids
///
/// Sources list the protein content of egg yolk solids to be between 30.9-33.75% by weight; 32%
/// is a reasonable average of these values (Clarke, 2004, p. 49)[^4], (Goff & Hartel, 2025, p.
/// 48)[^20], (USDA, 2019, "Eggs, Grade A, Large, egg yolk")[^500].
///
/// Consistent with [`STD_PROTEIN_IN_EGG_YOLK`] / [`STD_SOLIDS_IN_EGG_YOLK`]:
///
/// ```
/// # use sci_cream::constants::composition::egg::*;
/// assert_eq!(
///     STD_PROTEIN_IN_EGG_YOLK_SOLIDS,
///     STD_PROTEIN_IN_EGG_YOLK / STD_SOLIDS_IN_EGG_YOLK
/// );
/// ```
#[expect(clippy::doc_markdown)] // _FoodData_ false positive
#[doc = include_str!("../../../docs/references/index/4.md")]
#[doc = include_str!("../../../docs/references/index/20.md")]
#[doc = include_str!("../../../docs/references/index/500.md")]
pub const STD_PROTEIN_IN_EGG_YOLK_SOLIDS: f64 = 0.32;

/// Percentage of protein typically found in egg white solids
///
/// (USDA, 2019, "Eggs, Grade A, Large, egg white")[^518]
///
/// Consistent with [`STD_PROTEIN_IN_EGG_WHITE`] / [`STD_SOLIDS_IN_EGG_WHITE`] within 0.6 pp:
///
/// ```
/// # use sci_cream::asserts::assert_eq_flt;
/// # use sci_cream::constants::composition::egg::*;
/// assert_eq_flt!(
///     STD_PROTEIN_IN_EGG_WHITE_SOLIDS,
///     STD_PROTEIN_IN_EGG_WHITE / STD_SOLIDS_IN_EGG_WHITE,
///     epsilon = 0.006
/// );
/// ```
#[expect(clippy::doc_markdown)] // _FoodData_ false positive
#[doc = include_str!("../../../docs/references/index/518.md")]
pub const STD_PROTEIN_IN_EGG_WHITE_SOLIDS: f64 = 0.78;

/// Percentage of whole-egg solids contributed by the yolk
///
/// Calculated as 65.7895%, rounded from the yolk's share of the solids of
/// [`STD_EGG_YOLKS_IN_WHOLE_EGG`] at [`STD_SOLIDS_IN_EGG_YOLK`]
/// and [`STD_EGG_WHITES_IN_WHOLE_EGG`] at [`STD_SOLIDS_IN_EGG_WHITE`]:
///
/// ```
/// # use sci_cream::{asserts::assert_eq_6dp, constants::composition::egg::*};
/// let yolk = STD_EGG_YOLKS_IN_WHOLE_EGG * STD_SOLIDS_IN_EGG_YOLK;
/// let white = STD_EGG_WHITES_IN_WHOLE_EGG * STD_SOLIDS_IN_EGG_WHITE;
/// assert_eq_6dp!(STD_YOLK_SOLIDS_IN_WHOLE_EGG_SOLIDS, yolk / (yolk + white));
/// ```
pub const STD_YOLK_SOLIDS_IN_WHOLE_EGG_SOLIDS: f64 = 0.657_895;

/// Percentage of whole-egg solids contributed by the white (albumen)
///
/// Calculated as 34.2105%, the remainder of 100% - [`STD_YOLK_SOLIDS_IN_WHOLE_EGG_SOLIDS`],
/// so the two add up to 1:
///
/// ```
/// # use sci_cream::constants::composition::egg::*;
/// assert_eq!(STD_YOLK_SOLIDS_IN_WHOLE_EGG_SOLIDS + STD_WHITE_SOLIDS_IN_WHOLE_EGG_SOLIDS, 1.0);
/// ```
pub const STD_WHITE_SOLIDS_IN_WHOLE_EGG_SOLIDS: f64 = 0.342_105;

/// Proportion of whole-egg protein contributed by the yolk
///
/// Calculated as 43.9216%, rounded from the yolk's share of the protein of
/// [`STD_EGG_YOLKS_IN_WHOLE_EGG`] at [`STD_PROTEIN_IN_EGG_YOLK`]
/// and [`STD_EGG_WHITES_IN_WHOLE_EGG`] at [`STD_PROTEIN_IN_EGG_WHITE`]:
///
/// ```
/// # use sci_cream::{asserts::assert_eq_6dp, constants::composition::egg::*};
/// let yolk = STD_EGG_YOLKS_IN_WHOLE_EGG * STD_PROTEIN_IN_EGG_YOLK;
/// let white = STD_EGG_WHITES_IN_WHOLE_EGG * STD_PROTEIN_IN_EGG_WHITE;
/// assert_eq_6dp!(STD_YOLK_PROTEIN_IN_WHOLE_EGG_PROTEIN, yolk / (yolk + white));
/// ```
pub const STD_YOLK_PROTEIN_IN_WHOLE_EGG_PROTEIN: f64 = 0.439_216;

/// Proportion of whole-egg protein contributed by the white (albumen)
///
/// Calculated as 56.0784%, the remainder of 100% - [`STD_YOLK_PROTEIN_IN_WHOLE_EGG_PROTEIN`],
/// so the two add up to 1:
///
/// ```
/// # use sci_cream::constants::composition::egg::*;
/// assert_eq!(
///     STD_YOLK_PROTEIN_IN_WHOLE_EGG_PROTEIN + STD_WHITE_PROTEIN_IN_WHOLE_EGG_PROTEIN,
///     1.0
/// );
/// ```
pub const STD_WHITE_PROTEIN_IN_WHOLE_EGG_PROTEIN: f64 = 0.560_784;

/// Percentage of saturated fats typical of egg fat (Board on Agriculture..., 1974, p. 203)[^12]
#[doc = include_str!("../../../docs/references/index/12.md")]
pub const STD_SATURATED_FAT_IN_EGG_FAT: f64 = 0.28;

/// Percentage of lecithin typically found in egg yolk solids
///
/// Sources list the lecithin content of egg yolks to be between 8-10% by weight, and the total
/// solids in egg yolk to be between 48-51% by weight, for a lecithin content of egg yolk solids
/// of between ~16-21% by weight; 19% is a reasonable average of these values (Clarke, 2004, p.
/// 49)[^4], (Goff & Hartel, 2025, p. 84)[^20], (Manley, 2000, 12.3.1 Lecithin)[^68], (Zhao, et
/// al., 2023, 1. Introduction)[^69], (Palacios, et al., 2020)[^70], (USDA, 2019,
/// "Eggs, Grade A, Large, egg yolk")[^500]
#[expect(clippy::doc_markdown)] // _FoodData_ false positive
#[doc = include_str!("../../../docs/references/index/4.md")]
#[doc = include_str!("../../../docs/references/index/20.md")]
#[doc = include_str!("../../../docs/references/index/68.md")]
#[doc = include_str!("../../../docs/references/index/69.md")]
#[doc = include_str!("../../../docs/references/index/70.md")]
#[doc = include_str!("../../../docs/references/index/500.md")]
pub const STD_LECITHIN_IN_EGG_YOLK_SOLIDS: f64 = 0.19;

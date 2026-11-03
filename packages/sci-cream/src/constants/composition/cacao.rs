//! Standard composition values for cacao products, notably cocoa solids; see the [chocolate
//! documentation](crate::docs#chocolate) for more details about the components of chocolate.
//!
//! These values are averages compiled from the nutrient profiles of various cacao products in the
//! [USDA FoodData Central](https://fdc.nal.usda.gov/) database:
//!
//! - (USDA, 2019, "Chocolate, dark, 45-59% cacao solids")[^527]
//! - (USDA, 2019, "Chocolate, dark, 60-69% cacao solids")[^504]
//! - (USDA, 2019, "Chocolate, dark, 70-85% cacao solids")[^505]
//! - (USDA, 2019, "Cocoa, dry powder, unsweetened")[^506]
//! - (USDA, 2019, "Cocoa, dry powder, unsweetened, processed with alkali")[^528]
//! - (USDA, 2019, "Cocoa, dry powder, hi-fat or breakfast, processed with alkali")[^529]
//!
//! The values are very consistent between the different cacao products, usually all within ~4
//! percentage points of each other (fiber was the only exception, varying between 33% and 46%).
//!
//! The values are also consistent with the nutrition facts tables of various market cacao products:
//!
//! - (Lindt 70% Cacao Dark Chocolate, 2025)[^507]
//! - (Lindt 85% Cacao Dark Chocolate, 2025)[^508]
//! - (Lindt 95% Cacao Dark Chocolate, 2025)[^509]
//! - (Lindt 100% Cacao Dark Chocolate, 2025)[^510]
//! - (Ghirardelli 100% Unsweetened Cocoa Powder, 2025)[^511]
//!
//! **Note:** The `_IN_COCOA_SOLIDS` constants are calculated as fractions of the dry, fat-free
//! cacao solids of each listing, including sugars intrinsic to the cacao nuts. For cocoa powders,
//! that is calculated as `100 - fat - water`. For chocolate listings, `sugars` includes both
//! intrinsic and added sugars, so cocoa solids is calculated as `100 - fat - water - added_sugars`.
//! Added sugars are calculated as `added_sugars = sugars - intrinsic_sugars`, where intrinsic
//! sugars are estimated by [`cacao::STD_SUGARS_IN_COCOA_SOLIDS`], denoted `k`. Then the cocoa
//! solids, the denominator, are calculated as `(100 - fat - water - sugars) / (1 - k)`.
//!
//! **Note:** The composition of cocoa solids is taken to be entirely proteins, carbohydrates, and
//! ash, i.e. `100% = proteins + carbohydrates + ash`, so the constants must add up to 1.
//!
//! For chocolates and natural cocoa powders:
//!
//! - [`cacao::STD_PROTEIN_IN_COCOA_SOLIDS`]
//! - [`cacao::STD_CARBOHYDRATES_IN_NATURAL_COCOA_SOLIDS`]
//! - [`cacao::STD_ASH_IN_NATURAL_COCOA_SOLIDS`]
//!
//! For alkalized (dutched) cocoa powders:
//!
//! - [`cacao::STD_PROTEIN_IN_COCOA_SOLIDS`]
//! - [`cacao::STD_CARBOHYDRATES_IN_DUTCHED_COCOA_SOLIDS`]
//! - [`cacao::STD_ASH_IN_DUTCHED_COCOA_SOLIDS`]
#![doc = include_str!("../../../docs/references/index/504.md")]
#![doc = include_str!("../../../docs/references/index/505.md")]
#![doc = include_str!("../../../docs/references/index/506.md")]
#![doc = include_str!("../../../docs/references/index/507.md")]
#![doc = include_str!("../../../docs/references/index/508.md")]
#![doc = include_str!("../../../docs/references/index/509.md")]
#![doc = include_str!("../../../docs/references/index/510.md")]
#![doc = include_str!("../../../docs/references/index/511.md")]
#![doc = include_str!("../../../docs/references/index/527.md")]
#![doc = include_str!("../../../docs/references/index/528.md")]
#![doc = include_str!("../../../docs/references/index/529.md")]

#[cfg(doc)]
use super::cacao;

#[cfg(doc)]
use crate::{
    constants::composition,
    specs::{ChocolateSpec, CocoaPowderSpec},
};

/// Water content of cocoa powder, as a percentage of the product as a whole
///
/// This is a rough average of the water content of several natural and alkalized powders:
///
/// - (USDA, 2019, "Cocoa, dry powder, unsweetened")[^506]
/// - (USDA, 2019, "Cocoa, dry powder, unsweetened, processed with alkali")[^528]
/// - (USDA, 2019, "Cocoa, dry powder, hi-fat or breakfast, processed with alkali")[^529]
///
/// The EU caps cocoa powder at 9% water (Directive 2000/36/EC, 2000, Annex I 2.(a))[^84].
#[doc = include_str!("../../../docs/references/index/84.md")]
#[doc = include_str!("../../../docs/references/index/506.md")]
#[doc = include_str!("../../../docs/references/index/528.md")]
#[doc = include_str!("../../../docs/references/index/529.md")]
pub const STD_WATER_IN_COCOA_POWDER: f64 = 0.03;

/// Water content of chocolate, as a percentage of the product as a whole
///
/// This is a rough average of the water content of several chocolate products:
///
/// - (USDA, 2019, "Chocolate, dark, 45-59% cacao solids")[^527]
/// - (USDA, 2019, "Chocolate, dark, 60-69% cacao solids")[^504]
/// - (USDA, 2019, "Chocolate, dark, 70-85% cacao solids")[^505]
#[doc = include_str!("../../../docs/references/index/504.md")]
#[doc = include_str!("../../../docs/references/index/505.md")]
#[doc = include_str!("../../../docs/references/index/527.md")]
pub const STD_WATER_IN_CHOCOLATE: f64 = 0.01;

/// Sugar content that is intrinsic to cocoa solids, naturally in the cacao nuts
///
/// This value is derived from the three cocoa powders which have no added sugars, so total
/// sugars is taken to be the intrinsic sugars: measured at (%) 2.10, 2.09, and 2.09
///
/// This constant is used to calculate a more accurate cocoa solids content for the chocolate
/// entries, to support more accurate derivations of the other cocoa solids components. However,
/// they are not modeled by either of [`ChocolateSpec`] or [`CocoaPowderSpec`]. The former
/// bundles them into the total sugars and counts them as added sugars. The latter includes them
/// in cocoa solids, which is more correct, but does not correctly track them as sugars.
///
/// The cost of these inaccuracies is quantified by the reconciliation tests.
pub const STD_SUGARS_IN_COCOA_SOLIDS: f64 = 0.021;

// Calculated cocoa solids content for each entry (%):
//
// Chocolate, dark, 45-59% cacao solids:                          20.3
// Chocolate, dark, 60-69% cacao solids:                          24.3
// Chocolate, dark, 70-85% cacao solids:                          32.7
// Cocoa, dry powder, unsweetened:                                83.3
// Cocoa, dry powder, unsweetened, processed with alkali:         84.2
// Cocoa, dry powder, hi-fat or breakfast, processed with alkali: 73.3

/// Percentage of proteins typically found in cocoa solids
///
/// Calculated values are (%): 24.04, 25.19, 23.82, 23.53, 21.50, 22.92
pub const STD_PROTEIN_IN_COCOA_SOLIDS: f64 = 0.235;

/// Percentage of fiber typically found in cocoa solids; it's a subset of carbohydrates
///
/// Calculated values are (%): 34.5, 32.9, 33.3, 44.4, 35.4, 46.2
///
/// These are the least consistent values among the cacao products, by a wide margin, spanning
/// 33% to 46% across the listings, with no clear pattern between natural and alkalized cocoa.
///
/// Fiber and the [intrinsic sugars](STD_SUGARS_IN_COCOA_SOLIDS) are both drawn from the
/// carbohydrates, so together they fit inside the smaller of the two carbohydrate fractions:
///
/// ```
/// # use sci_cream::constants::composition::cacao::*;
/// let smaller = STD_CARBOHYDRATES_IN_DUTCHED_COCOA_SOLIDS
///     .min(STD_CARBOHYDRATES_IN_NATURAL_COCOA_SOLIDS);
/// assert!(STD_FIBER_IN_COCOA_SOLIDS + STD_SUGARS_IN_COCOA_SOLIDS < smaller);
/// ```
pub const STD_FIBER_IN_COCOA_SOLIDS: f64 = 0.378;

/// Percentage of ash (tracked as other SNFS) typically found in natural cocoa solids.
///
/// This only averages the non-alkali entries. Calculated values are (%): 8.4, 7.8, 7.1, 7.0
///
/// See [`STD_ASH_IN_DUTCHED_COCOA_SOLIDS`] for the ash content in alkalized cocoa solids.
pub const STD_ASH_IN_NATURAL_COCOA_SOLIDS: f64 = 0.076;

/// Percentage of ash typically found in the cocoa solids of alkalized, or dutched, cocoa
///
/// The USDA listings for alkalized cocoa powders show a significantly higher ash content than
/// the chocolates and natural powders, which is to be expected, given the addition of mineral
/// residue from the alkalizing agents, e.g. potassium carbonate (Goff & Hartel, 2025, p.
/// 105)[^20], (Miller et al., 2008)[^85]. This is also corroborated by their measured potassium
/// content where, between listings differing only by the alkalization treatment, the alkalized
/// ones show ~2.5g of potassium per 100g compared to the natural's ~1.5g (USDA, 2019, "Cocoa,
/// dry powder, unsweetened")[^506], (USDA, 2019, "... processed with alkali")[^528]. Alkali
/// ingredients are capped at the neutralizing value of 3 parts by weight of anhydrous potassium
/// carbonate per 100 parts nibs (U.S. FDA, CFR 21, 163.110(b)(1))[^86]. This puts the USDA pair
/// at about a third of the regulatory limit, a reasonably typical value. See the documentation
/// for [dutch processed](crate::docs#dutch-processed) cocoa solids for more details.
///
/// This only averages the alkalized entries. Calculated values are (%): 9.3, 9.3
///
/// See [`STD_ASH_IN_NATURAL_COCOA_SOLIDS`] for the ash content of natural cocoa solids.
///
/// Alkalization only moves mass from carbohydrates into ash:
///
/// ```
/// # use sci_cream::constants::composition::cacao::*;
/// assert!(STD_ASH_IN_DUTCHED_COCOA_SOLIDS > STD_ASH_IN_NATURAL_COCOA_SOLIDS);
/// assert!(
///     STD_CARBOHYDRATES_IN_DUTCHED_COCOA_SOLIDS < STD_CARBOHYDRATES_IN_NATURAL_COCOA_SOLIDS
/// );
/// ```
#[doc = include_str!("../../../docs/references/index/20.md")]
#[doc = include_str!("../../../docs/references/index/85.md")]
#[doc = include_str!("../../../docs/references/index/86.md")]
#[doc = include_str!("../../../docs/references/index/506.md")]
#[doc = include_str!("../../../docs/references/index/528.md")]
pub const STD_ASH_IN_DUTCHED_COCOA_SOLIDS: f64 = 0.093;

/// Percentage of carbohydrates typically found in natural cocoa solids
///
/// Calculated as 68.9%, the remainder of 100% - [`STD_PROTEIN_IN_COCOA_SOLIDS`] -
/// [`STD_ASH_IN_NATURAL_COCOA_SOLIDS`], so the three add up to 1:
///
/// ```
/// # use sci_cream::constants::composition::cacao::*;
/// assert_eq!(
///     STD_PROTEIN_IN_COCOA_SOLIDS
///         + STD_ASH_IN_NATURAL_COCOA_SOLIDS
///         + STD_CARBOHYDRATES_IN_NATURAL_COCOA_SOLIDS,
///     1.0
/// );
/// ```
///
/// The composition of cocoa solids is taken to be entirely proteins, carbohydrates, and ash,
/// the carbohydrates derived _"by difference"_ the same way as the USDA listings.
pub const STD_CARBOHYDRATES_IN_NATURAL_COCOA_SOLIDS: f64 = 0.689;

/// Percentage of carbohydrates typically found in alkalized cocoa solids
///
/// Calculated as 67.2%, the remainder of 100% - [`STD_PROTEIN_IN_COCOA_SOLIDS`] -
/// [`STD_ASH_IN_DUTCHED_COCOA_SOLIDS`], so the three add up to 1:
///
/// ```
/// # use sci_cream::constants::composition::cacao::*;
/// assert_eq!(
///     STD_PROTEIN_IN_COCOA_SOLIDS
///         + STD_ASH_IN_DUTCHED_COCOA_SOLIDS
///         + STD_CARBOHYDRATES_IN_DUTCHED_COCOA_SOLIDS,
///     1.0
/// );
/// ```
///
/// The composition of cocoa solids is taken to be entirely proteins, carbohydrates, and ash,
/// the carbohydrates derived _"by difference"_ the same way as the USDA listings.
pub const STD_CARBOHYDRATES_IN_DUTCHED_COCOA_SOLIDS: f64 = 0.672;

/// Percentage of saturated fats typically found in cocoa butter
pub const STD_SATURATED_FAT_IN_COCOA_BUTTER: f64 = 0.60;

/// Percentage of cocoa butter typically found in cacao solids of non-powder chocolate
///
/// This value is an average of all the chocolate products listed in [`composition::cacao`].
/// Note that this excludes cocoa powders, which contain much lesser amounts of cocoa butter.
pub const STD_COCOA_BUTTER_IN_CACAO_SOLIDS: f64 = 0.57;

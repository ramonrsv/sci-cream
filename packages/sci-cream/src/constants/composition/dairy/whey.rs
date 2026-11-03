//! Standard composition values for whey solids (WS): sweet whey, concentrates, and isolates
//!
//! The `_IN_WS` constants are corroborated by averages compiled from the nutrient profiles of
//! these _sweet_ whey listings in the
//! [USDA FoodData Central](https://fdc.nal.usda.gov/) database:
//!
//! - (USDA, 2019, "Whey, sweet, dried")[^536]
//! - (USDA, 2019, "Whey, sweet, fluid")[^537]
//!
//! The acid wheys are left out of the analysis, since they have different compositions with
//! higher minerals (de Wit, 2001, p. 15)[^92], and this model explicitly targets only sweet
//! whey, as noted below. The FNDDS sweet dry whey listing, which repeats the SR Legacy
//! values, is also excluded.
//!
//! **Note:** The constants, and therefore the model, are based on sweet whey only, which most
//! whey products on the market are derived from (de Wit, 2001, p. 10)[^92], and which is the
//! whey most commonly used in ice cream (USDEC, 2003, p. 156)[^91], (Goff & Hartel, 2025,
//! p. 21)[^20]. Acid whey's use in frozen desserts is limited to acid-flavored sherbets and
//! sorbets (USDEC, 2003, p. 156)[^91], (ADPI, 2023, p. 5)[^93].
//!
//! **Note:** The calculated values under the `_IN_WS` constants are fractions of the WS of each
//! listing, which is itself calculated as `100 - water - fat`. This matches the sum of each
//! listing's sugars, protein, and ash to within ~0.3%.
//!
//! Concentrates and isolates hold less lactose and minerals, as ultrafiltration removes them
//! with the permeate (Goff & Hartel, 2025, p. 60)[^20]. Both fall from the sweet whey constants
//! (`_IN_WS`) to the isolate ones (`_IN_WPI`), and [`lactose_in_snf`] and [`minerals_in_snf`]
//! take each as linear in the protein fraction between the two.
//!
//! The lactose, protein, and minerals account for 98% of the solids in sweet whey, rising
//! linearly to 99.9% in isolates. The gap is expected, as whey's total solids are not often
//! equivalent to the sum of its separately determined constituents (de Wit, 2001, p. 15)[^92].
//! Sources that give lactose as the carbohydrates by difference count the gap in it too, so
//! they run higher than the lactose constants. The gap, [`unaccounted_in_snf`], counts with the
//! minerals, under other milk solids, in the dairy [specs](crate::specs).
#![doc = include_str!("../../../../docs/references/index/20.md")]
#![doc = include_str!("../../../../docs/references/index/91.md")]
#![doc = include_str!("../../../../docs/references/index/92.md")]
#![doc = include_str!("../../../../docs/references/index/93.md")]
#![doc = include_str!("../../../../docs/references/index/536.md")]
#![doc = include_str!("../../../../docs/references/index/537.md")]

#[cfg(doc)]
use crate::constants::composition::dairy::{lactose_in_snf, minerals_in_snf, unaccounted_in_snf};

/// Percentage of lactose typically found in sweet whey solids (WS)
///
/// (Goff & Hartel, 2013, p. 181)[^2]
///
/// This is in line with the 72-73% lactose of whey powder (Goff & Hartel, 2025, p. 59)[^20]
/// and the 70-75% of de Wit's sweet whey powder spec (de Wit, 2001, p. 81)[^92], ~75-77%
/// of WS. The [USDA listings](self) average a higher 78.2%, as their sugar content is
/// the carbohydrates by difference.
///
/// Calculated values are (%): 77.8, 78.6
#[doc = include_str!("../../../../docs/references/index/2.md")]
#[doc = include_str!("../../../../docs/references/index/20.md")]
#[doc = include_str!("../../../../docs/references/index/92.md")]
pub const STD_LACTOSE_IN_WS: f64 = 0.765;

/// Percentage of protein typically found in sweet whey solids (WS)
///
/// Taken as 13%, in line with the 11.0-14.5% of sweet whey powder (USDEC, 2003, p. 28)[^91]
/// and the 11-14% of de Wit's spec (de Wit, 2001, p. 81)[^92], ~13.3-13.5% of WS at the
/// midpoints, Goff & Hartel's "about 12%" of dry whey (Goff & Hartel, 2025, p. 34)[^20],
/// ~12.5% of WS, and the 13.3% average of the [USDA listings](self). ADPI's minimum for dry
/// sweet whey is 11% (ADPI, 2023, p. 2)[^93], ~11.6% of WS.
///
/// Calculated values are (%): 13.5, 13.0
#[doc = include_str!("../../../../docs/references/index/20.md")]
#[doc = include_str!("../../../../docs/references/index/91.md")]
#[doc = include_str!("../../../../docs/references/index/92.md")]
#[doc = include_str!("../../../../docs/references/index/93.md")]
pub const STD_PROTEIN_IN_WS: f64 = 0.13;

/// Percentage of minerals (ash) typical of sweet whey solids (WS)
///
/// Taken as 8.5%, in line with the 8.2-8.7% of de Wit's sweet wheys (de Wit, 2001, Table 1,
/// p. 14)[^92] and the 8.4% average of the [USDA listings](self). Spec sheets run slightly
/// higher: the 8.2-8.8% of sweet whey powder (USDEC, 2003, p. 28)[^91] and the 8-9% of
/// de Wit's spec (de Wit, 2001, p. 81)[^92] are ~9.0% of WS at their midpoints.
///
/// Calculated values are (%): 8.7, 8.1
#[doc = include_str!("../../../../docs/references/index/91.md")]
#[doc = include_str!("../../../../docs/references/index/92.md")]
pub const STD_MINERALS_IN_WS: f64 = 0.085;

/// Percentage of lactose typical of whey protein isolate (WPI) solids non-fat
///
/// Taken as 0.8%, in line with the typical 0.5-1.0% of WPI powder (USDEC, 2003,
/// p. 33)[^91], (ADPI, 2023)[^95], ~0.8% of the solids non-fat at the midpoint, a typical
/// WPI's 0.5% (Kuntz, 2010)[^94], and Hilmar 9000's 1.0% (Hilmar Ingredients, 2026)[^538].
/// The WPI profile (USDEC, 2003, Table 6, pp. 51-52)[^91] has a higher ~0.9%, as its
/// lactose is the carbohydrates by difference.
///
/// The [line](super::lactose_in_snf) from [`STD_LACTOSE_IN_WS`] to this fits USDEC's WPC 34
/// and WPC 80 within ~0.9 percentage points.
#[doc = include_str!("../../../../docs/references/index/91.md")]
#[doc = include_str!("../../../../docs/references/index/94.md")]
#[doc = include_str!("../../../../docs/references/index/95.md")]
#[doc = include_str!("../../../../docs/references/index/538.md")]
pub const STD_LACTOSE_IN_WPI: f64 = 0.008;

/// Percentage of protein typical of whey protein isolate (WPI) solids non-fat
///
/// Calculated from the 90.75g of protein in 95.0g of solids non-fat of the WPI profile
/// (USDEC, 2003, Table 6, pp. 51-52)[^91], in line with the typical 90.0-92.0% of WPI
/// powder (USDEC, 2003, p. 33)[^91], a typical WPI's 92.0% (Kuntz, 2010)[^94], and
/// Hilmar 9000's 89.0% (Hilmar Ingredients, 2026)[^538], ~93.7-97.4% of the solids non-fat.
/// ADPI gives USDEC's typical range on a dry basis (ADPI, 2023)[^95], ~90.7-92.7% of the
/// solids non-fat, but only the as-is reading adds up with its other typical values.
#[doc = include_str!("../../../../docs/references/index/91.md")]
#[doc = include_str!("../../../../docs/references/index/94.md")]
#[doc = include_str!("../../../../docs/references/index/95.md")]
#[doc = include_str!("../../../../docs/references/index/538.md")]
pub const STD_PROTEIN_IN_WPI: f64 = 0.955;

/// Percentage of minerals (ash) typical of whey protein isolate (WPI) solids non-fat
///
/// Calculated from the 3.38g of ash in 95.0g of solids non-fat of the WPI profile (USDEC,
/// 2003, Table 6, pp. 51-52)[^91]. Typical isolates run lower, ~2.1-3.2% of the
/// solids non-fat: the 2.0-3.0% of WPI powder (USDEC, 2003, p. 33)[^91], (ADPI, 2023)[^95],
/// a typical WPI's 2.0% (Kuntz, 2010)[^94], and Hilmar 9000's 2.5% (Hilmar Ingredients,
/// 2026)[^538], whose 3.5% maximum is ~3.7% of the solids non-fat.
///
/// The [line](super::minerals_in_snf) from [`STD_MINERALS_IN_WS`] to this fits USDA's sweet
/// whey and USDEC's WPC 34, WPC 80, and WPI within ~0.5 percentage points. The line would
/// miss WPC 80 by ~1.5 pp if using the lower typical values for isolates.
#[doc = include_str!("../../../../docs/references/index/91.md")]
#[doc = include_str!("../../../../docs/references/index/94.md")]
#[doc = include_str!("../../../../docs/references/index/95.md")]
#[doc = include_str!("../../../../docs/references/index/538.md")]
pub const STD_MINERALS_IN_WPI: f64 = 0.036;

//! Standard composition values for milk solids (MSNF): plain milk, concentrates, and isolates
//!
//! The `_IN_MSNF` constants are corroborated by averages compiled from the nutrient profiles of
//! these milks, evaporated milks, and milk powders in the
//! [USDA FoodData Central](https://fdc.nal.usda.gov/) database:
//!
//! - (USDA, 2019, "Milk, nonfat, fluid, with added vitamin ... (fat free or skim)")[^530]
//! - (USDA, 2019, "Milk, reduced fat, fluid, 2% milkfat, with added vitamin ...")[^531]
//! - (USDA, 2019, "Milk, whole, 3.25% milkfat, with added vitamin ...")[^503]
//! - (USDA, 2019, "Milk, canned, evaporated, nonfat, with added vitamin ...")[^532]
//! - (USDA, 2019, "Milk, canned, evaporated, with added vitamin ... without added ...")[^533]
//! - (USDA, 2019, "Milk, dry, nonfat, regular, without added vitamin ...")[^534]
//! - (USDA, 2019, "Milk, dry, whole, without added vitamin ...")[^535]
//!
//! The creams and sweetened condensed milk scatter more widely, e.g. 32.0-41.7% protein, so
//! they are left out, as is the 2% evaporated milk, which FNDDS calculates from the nonfat one.
//!
//! **Note:** The calculated values under the `_IN_MSNF` constants are fractions of the MSNF of
//! each listing, which is itself calculated as `100 - water - fat`. This should match the sum
//! of the listing's sugars, protein, and ash, but that is not always the case, e.g. skim milk's
//! calculated MSNF of 9.12g differs from the 9.25g sum of those, a ~1.4% discrepancy. The
//! listings' discrepancies range from 0% to ~2.1%.
//!
//! Milk protein concentrates and isolates (MPC, MPI) are made by ultrafiltration of skim milk,
//! which allows lactose, soluble minerals, and non-protein nitrogen to pass into the permeate,
//! while retaining the caseins and whey proteins (USDEC, 2018, p. 21)[^113], (Patel & Patel,
//! 2014, p. 2)[^114], (Goff & Hartel, 2025, p. 61)[^20].
//!
//! As concentration proceeds, the protein fraction of the solids non-fat rises, while their
//! lactose and minerals decrease along lines in that fraction, [`lactose_in_snf`] and
//! [`minerals_in_snf`], from plain milk solids given by the `_IN_MSNF` constants to the isolate
//! end given by the `_IN_MPI` constants. Below plain milk's protein fraction, the lines
//! continue toward the permeate's composition. The casein share of the protein stays
//! [`STD_CASEIN_PROTEIN_IN_MSNF_PROTEIN`], as ultrafiltration concentrates all the proteins
//! from milk and therefore leaves the casein-to-whey ratio essentially unchanged from the
//! original milk's, generally 80:20 (ADPI, 2023, p. 1)[^103], (USDEC, 2018, p. 21)[^113].
//!
//! Casein's share of the crude protein rises somewhat, from 76% in skim milk to 82% in its
//! final retentate (Don et al., 2025, Tables 1, 4)[^117], on either side of the 80% taken.
//!
//! The `_IN_MPI` constants average the lines from milk solids through these complete milk
//! protein concentrate compositions, at the protein of McSweeney et al.'s, the highest, and an
//! isolate by ADPI's minimum (ADPI, 2023, p. 2)[^103]:
//!
//! - (USDEC, 2018, Table 13, p. 35)[^113], a typical concentrate 85
//! - (McSweeney et al., 2020, Table 1)[^106], an ultrafiltered concentrate 85
//! - (VanWees et al., 2026, Table 1)[^115], Idaho Milk Products' concentrate
//! - (Seo & Oh, 2023, "Materials")[^116], Hochdorf's Ledor MI 85T
//!
//! Their protein, lactose, and ash, scaled to sum to 100% of their solids non-fat, are (%):
//!
//! | Source                   | Protein | Lactose | Minerals |
//! | ------------------------ | ------- | ------- | -------- |
//! | USDEC, MPC 85            | 89.7    | 3.4     | 7.0      |
//! | McSweeney et al., MPC 85 | 91.1    | 1.5     | 7.4      |
//! | VanWees et al., MPC 80   | 85.6    | 7.0     | 7.3      |
//! | Seo & Oh, MI 85T         | 86.0    | 6.9     | 7.1      |
//!
//! USDEC's typical isolate, which gives mostly limits (USDEC, 2018, Table 13, p. 35)[^113], and
//! its 2015 concentrate, which sums to 97.6% (USDEC, 2015, Figure 1, p. 1)[^100], are left out.
#![doc = include_str!("../../../../docs/references/index/20.md")]
#![doc = include_str!("../../../../docs/references/index/100.md")]
#![doc = include_str!("../../../../docs/references/index/103.md")]
#![doc = include_str!("../../../../docs/references/index/106.md")]
#![doc = include_str!("../../../../docs/references/index/113.md")]
#![doc = include_str!("../../../../docs/references/index/114.md")]
#![doc = include_str!("../../../../docs/references/index/115.md")]
#![doc = include_str!("../../../../docs/references/index/116.md")]
#![doc = include_str!("../../../../docs/references/index/117.md")]
#![doc = include_str!("../../../../docs/references/index/503.md")]
#![doc = include_str!("../../../../docs/references/index/530.md")]
#![doc = include_str!("../../../../docs/references/index/531.md")]
#![doc = include_str!("../../../../docs/references/index/532.md")]
#![doc = include_str!("../../../../docs/references/index/533.md")]
#![doc = include_str!("../../../../docs/references/index/534.md")]
#![doc = include_str!("../../../../docs/references/index/535.md")]
#![expect(clippy::doc_markdown)] // _McSweeney_, _McCarthy_, and _VanWees_ false positives

#[cfg(doc)]
use crate::constants::composition::dairy::{lactose_in_snf, minerals_in_snf};

/// Percentage milk solids non-fat (MSNF) typical of milk serum
///
/// (Goff & Hartel, 2013, p. 160)[^2]
#[doc = include_str!("../../../../docs/references/index/2.md")]
pub const STD_MSNF_IN_MILK_SERUM: f64 = 0.09;

/// Percentage of lactose typical of milk solids non-fat (MSNF)
///
/// (Goff & Hartel, 2013, p. 181)[^2],
/// (Goff, n.d., "16. Ice Cream Mix General Composition")[^90]
///
/// The sourced value agrees with the 54.8% average of the [USDA listings](self).
/// Calculated values are (%): 55.4, 54.3, 55.3, 55.9, 54.2, 54.1, 54.2
#[doc = include_str!("../../../../docs/references/index/2.md")]
#[doc = include_str!("../../../../docs/references/index/90.md")]
pub const STD_LACTOSE_IN_MSNF: f64 = 0.545;

/// Percentage of protein typical of milk solids non-fat (MSNF)
///
/// Calculated as 37.5%, the remainder of 100% - [`STD_LACTOSE_IN_MSNF`] -
/// [`STD_MINERALS_IN_MSNF`], so the three add up to 1:
///
/// ```
/// # use sci_cream::constants::composition::dairy::milk::*;
/// assert_eq!(STD_LACTOSE_IN_MSNF + STD_MINERALS_IN_MSNF + STD_PROTEIN_IN_MSNF, 1.0);
/// ```
///
/// This is in line with the ~37% average (~35-37.5% range) of the milks, creams, and milk
/// powders in Goff & Hartel's Table 3.2 (Goff & Hartel, 2025, p. 48)[^20], the text's
/// slightly lower range 34-36% (Goff & Hartel, 2025, p. 34)[^20], the Guelph e-Book's 38%
/// (Goff, n.d., "16. Ice Cream Mix General Composition")[^90], and the 37.3% average
/// of the [USDA listings](self).
///
/// Calculated USDA values are (%): 37.6, 37.3, 37.6, 37.0, 36.9, 37.7, 37.1
#[doc = include_str!("../../../../docs/references/index/20.md")]
#[doc = include_str!("../../../../docs/references/index/90.md")]
pub const STD_PROTEIN_IN_MSNF: f64 = 0.375;

/// Percentage of minerals (ash) typical of milk solids non-fat (MSNF)
///
/// Taken as 8% on a dry weight basis (Goff, n.d., "16. Ice Cream Mix General
/// Composition")[^90]. This is in line with the 7.7% of Goff & Hartel's bulk milk,
/// calculated from 700 mg/100 mL of ash at 8.8 wt.% non-fat solids and 1.032 kg/L density
/// (Goff & Hartel, 2025, Tables 3.2-3.3, pp. 48-49)[^20].
///
/// The sourced value agrees with the 8.4% average of the [USDA listings](self).
/// Calculated values are (%): 8.4, 8.3, 9.2, 7.4, 8.4, 8.3, 8.6
#[doc = include_str!("../../../../docs/references/index/90.md")]
#[doc = include_str!("../../../../docs/references/index/20.md")]
pub const STD_MINERALS_IN_MSNF: f64 = 0.08;

/// Percentage of lactose typical of milk protein isolate (MPI) solids non-fat
///
/// Taken as 1.7%, the average at [`STD_PROTEIN_IN_MPI`] of the lines from milk solids
/// through the [compositions](self). This is well within ADPI's 5.0% maximum for milk
/// protein isolate (ADPI, 2023, p. 2)[^103].
///
/// The [line](super::lactose_in_snf) from milk solids to this fits the compositions within
/// 0.3 percentage points, and McSweeney et al.'s MPC 75 to MPC 40 too, which they made by
/// diluting their MPC 85 with milk permeate (McSweeney et al., 2020, §2.1, Table 1)[^106].
///
/// Calculated values are (%): 2.0, 1.5, 1.6, 1.9
#[doc = include_str!("../../../../docs/references/index/103.md")]
#[doc = include_str!("../../../../docs/references/index/106.md")]
pub const STD_LACTOSE_IN_MPI: f64 = 0.017;

/// Percentage of protein typical of milk protein isolate (MPI) solids non-fat
///
/// Taken as 91.1%, the protein of McSweeney et al.'s among the [compositions](self), where
/// the averaged lines give [`STD_LACTOSE_IN_MPI`] and [`STD_MINERALS_IN_MPI`],
/// the rest of the solids non-fat:
///
/// ```
/// # use sci_cream::constants::composition::dairy::milk::*;
/// assert_eq!(STD_LACTOSE_IN_MPI + STD_MINERALS_IN_MPI + STD_PROTEIN_IN_MPI, 1.0);
/// ```
///
/// At 5% moisture and 1% fat, this is 90.1% protein on a dry basis, above ADPI's 89.5%
/// minimum for milk protein isolate (ADPI, 2023, p. 2)[^103] and in line with the 90-91%
/// typical of isolates (Patel & Patel, 2014, p. 2)[^114].
#[doc = include_str!("../../../../docs/references/index/103.md")]
#[doc = include_str!("../../../../docs/references/index/114.md")]
pub const STD_PROTEIN_IN_MPI: f64 = 0.911;

/// Percentage of minerals (ash) typical of milk protein isolate (MPI) solids non-fat
///
/// Taken as 7.2%, the average at [`STD_PROTEIN_IN_MPI`] of the lines from milk solids
/// through the [compositions](self). ADPI's 8.0% maximum ash for milk protein isolate
/// (ADPI, 2023, p. 2)[^103] is ~8.5% of the solids non-fat at 5% moisture and 1% fat, and
/// USDEC's typical isolate's 6.0% is ~6.4% (USDEC, 2018, Table 13, p. 35)[^113].
///
/// The [line](super::minerals_in_snf) from milk solids to this fits the compositions within
/// 0.3 percentage points, and McSweeney et al.'s MPC 75 to MPC 40 too (McSweeney et al.,
/// 2020, Table 1)[^106]. It runs 0.3-1.1 percentage points above USDEC's MPC 70 to MPC 42,
/// as USDEC lists nearly the same ash at every grade (USDEC, 2018, Table 13, p. 35)[^113].
///
/// Among liquid ultrafiltered milks, it fits Burrington's UF 85 and whole milk concentrated
/// 3 and 5 times within 1.5 percentage points, but runs 3.1 above Burrington's UF 65, whose
/// ash is 4.5% of its solids non-fat (Burrington, 2018, "UF Milk Composition")[^118],
/// (Hill & Ferrer, 2021, Table 24.1)[^119].
///
/// Calculated values are (%): 6.9, 7.4, 7.3, 7.0
#[doc = include_str!("../../../../docs/references/index/103.md")]
#[doc = include_str!("../../../../docs/references/index/106.md")]
#[doc = include_str!("../../../../docs/references/index/113.md")]
#[doc = include_str!("../../../../docs/references/index/118.md")]
#[doc = include_str!("../../../../docs/references/index/119.md")]
pub const STD_MINERALS_IN_MPI: f64 = 0.072;

/// Proportion of proteins in milk solids that is whey
///
/// (Clarke, 2004, p. 40)[^4], (Goff & Hartel, 2025, p. 315)[^20],
/// (USDEC, 2018, p. 68)[^113].
///
/// Consistent with [`STD_CASEIN_PROTEIN_IN_MSNF_PROTEIN`], the rest of the protein:
///
/// ```
/// # use sci_cream::constants::composition::dairy::milk::*;
/// assert_eq!(STD_WHEY_PROTEIN_IN_MSNF_PROTEIN + STD_CASEIN_PROTEIN_IN_MSNF_PROTEIN, 1.0);
/// ```
#[doc = include_str!("../../../../docs/references/index/4.md")]
#[doc = include_str!("../../../../docs/references/index/20.md")]
#[doc = include_str!("../../../../docs/references/index/113.md")]
pub const STD_WHEY_PROTEIN_IN_MSNF_PROTEIN: f64 = 0.2;

/// Proportion of proteins in milk solids that is casein
///
/// (Clarke, 2004, p. 40)[^4], (Goff & Hartel, 2025, p. 315)[^20],
/// (USDEC, 2018, p. 68)[^113].
///
/// Consistent with [`STD_WHEY_PROTEIN_IN_MSNF_PROTEIN`], the rest of the protein:
///
/// ```
/// # use sci_cream::constants::composition::dairy::milk::*;
/// assert_eq!(STD_WHEY_PROTEIN_IN_MSNF_PROTEIN + STD_CASEIN_PROTEIN_IN_MSNF_PROTEIN, 1.0);
/// ```
#[doc = include_str!("../../../../docs/references/index/4.md")]
#[doc = include_str!("../../../../docs/references/index/20.md")]
#[doc = include_str!("../../../../docs/references/index/113.md")]
pub const STD_CASEIN_PROTEIN_IN_MSNF_PROTEIN: f64 = 0.8;

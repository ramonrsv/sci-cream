//! Standard composition values for casein solids: micellar casein and caseinates
//!
//! Casein proteins occur in milk as micelles, fractions of proteins linked together by calcium
//! and phosphates (USDEC, 2015, p. 1)[^100]. They carry most of milk's calcium, as well as
//! phosphorus and other minerals (Goff & Hartel, 2025, p. 50)[^20], (Goff & Hill & Ferrer,
//! 2026, Chapter 12)[^62]. Micellar casein concentrates are produced through microfiltration,
//! which retains the micelles intact while whey proteins, lactose, and soluble minerals pass
//! through the membrane (USDEC, 2015, p. 1)[^100]. Caseinates are made from the caseins of acid
//! precipitation, which dissolves the calcium and inorganic phosphate and leaches the minerals
//! from the curd. The acid casein is neutralized with an alkali, e.g. sodium hydroxide, to
//! produce sodium caseinate (Southward, n.d., pp. 6-7)[^96]. As such, the mineral contents of
//! micellar casein and caseinates differ significantly, while micellar casein's lactose and
//! whey protein contents vary with the degree of filtration.
//!
//! In micellar casein, as [`SolidsSource::MicellarCasein`], the lactose, minerals, and casein
//! share of the protein follow the protein fraction along lines, [`lactose_in_snf`],
//! [`minerals_in_snf`], and [`casein_in_protein`], from unfiltered milk solids to the isolate
//! end that the `_IN_MCI` constants give. Caseinates, as [`SolidsSource::Caseinate`], hold the
//! fixed fractions of the `_IN_CASEINATE` constants, based on sodium caseinate, the caseinate
//! used in ice cream (Goff & Hartel, 2025, p. 61)[^20], (Southward, n.d., Table 3, p. 11)[^96].
//! Acid and rennet casein, used in cheese products and technical applications rather than ice
//! cream, are not modeled (Southward, n.d., Tables 3-4, pp. 11-12)[^96].
//!
//! The values quoted below are fractions of each source's solids non-fat, `100 - water - fat`.
//! Unlike whey solids, casein solids are taken as wholly protein, lactose, and minerals, as
//! milk solids are, since Southward's, Kommineni et al.'s, and Refit's compositions sum to
//! about 100% (Southward, n.d., Table 1, p. 9)[^96], (Kommineni et al., 2022,
//! Tables 1-2)[^101], (Schulnies et al., 2023, Table 1)[^105].
//!
//! The `_IN_MCI` constants average the lines from milk solids through these complete micellar
//! casein compositions, at the protein of Ingredia's isolate, the only isolate among them:
//!
//! - (Kommineni et al., 2022, Tables 1-2)[^101], a pilot concentrate
//! - (Eljabali et al., 2026, §2.1)[^108], Ingredia's Promilk 852B concentrate
//! - (Schulnies et al., 2023, Table 1)[^105], Refit, a commercial concentrate
//! - (Azevedo Scudeller et al., 2026, Table 1)[^107], Ingredia's isolate
//!
//! Their protein, lactose, and ash, scaled to sum to 100% of their solids non-fat, are (%):
//!
//! | Source             | Protein | Lactose | Minerals | Casein of protein |
//! | ------------------ | ------- | ------- | -------- | ----------------- |
//! | Kommineni et al.   | 85.6    | 5.5     | 8.8      | 90.5              |
//! | Promilk 852B       | 87.2    | 4.3     | 8.6      | 92                |
//! | Refit              | 89.2    | 3.0     | 7.8      | 94.0              |
//! | Ingredia's isolate | 90.6    | 1.6     | 7.8      | –                 |
//!
//! Kommineni et al.'s calcium-reduced concentrate is left out, its minerals cut on purpose.
//!
//! The `_IN_CASEINATE` constants are taken from these sodium caseinate compositions:
//!
//! - (Southward, n.d., Table 1, p. 9)[^96]
//! - (USDEC, 2015, Figure 1, p. 1)[^100]
//! - (Ornua, n.d.)[^539]
//! - (Glenstal Foods, n.d.)[^540]
//!
//! Glenstal lists no moisture, so its calculated values are fractions of its protein, lactose,
//! and ash combined. Its nutrition panel matches Ornua's, so the two may not be independent.
#![doc = include_str!("../../../../docs/references/index/20.md")]
#![doc = include_str!("../../../../docs/references/index/62.md")]
#![doc = include_str!("../../../../docs/references/index/96.md")]
#![doc = include_str!("../../../../docs/references/index/100.md")]
#![doc = include_str!("../../../../docs/references/index/101.md")]
#![doc = include_str!("../../../../docs/references/index/105.md")]
#![doc = include_str!("../../../../docs/references/index/107.md")]
#![doc = include_str!("../../../../docs/references/index/108.md")]
#![doc = include_str!("../../../../docs/references/index/539.md")]
#![doc = include_str!("../../../../docs/references/index/540.md")]

#[cfg(doc)]
use crate::{
    constants::composition::dairy::{casein_in_protein, lactose_in_snf, minerals_in_snf},
    specs::SolidsSource,
};

/// Percentage of lactose typical of micellar casein isolate solids non-fat
///
/// Taken as 1.1%, the average at [`STD_PROTEIN_IN_MCI`] of the lines from milk solids
/// through the [compositions](self). This matches ADPI's 1.0% maximum for micellar casein
/// isolate (ADPI, 2023, p. 2)[^103], ~1.1% of the solids non-fat at 5% moisture and 1% fat.
///
/// The [line](super::lactose_in_snf) from milk solids to this fits the compositions within
/// 0.6 percentage points. It overestimates the lactose of USDEC's typical micellar casein
/// concentrate by about as much as USDEC's composition is short of 100%, as if its lactose
/// were understated (USDEC, 2015, Figure 1, p. 1)[^100].
///
/// Calculated values are (%): 0.5, 0.8, 1.6, 1.6
#[doc = include_str!("../../../../docs/references/index/100.md")]
#[doc = include_str!("../../../../docs/references/index/103.md")]
pub const STD_LACTOSE_IN_MCI: f64 = 0.011;

/// Percentage of protein typical of micellar casein isolate solids non-fat
///
/// Taken as 90.6%, the protein of Ingredia's isolate among the [compositions](self), where
/// the averaged lines give [`STD_LACTOSE_IN_MCI`] and [`STD_MINERALS_IN_MCI`],
/// the rest of the solids non-fat:
///
/// ```
/// # use sci_cream::constants::composition::dairy::casein::*;
/// assert_eq!(STD_LACTOSE_IN_MCI + STD_MINERALS_IN_MCI + STD_PROTEIN_IN_MCI, 1.0);
/// ```
///
/// At 5% moisture and 1% fat, this is 89.6% protein on a dry basis, just above ADPI's 89.5%
/// minimum for micellar casein isolate (ADPI, 2023, p. 2)[^103] and just below the 90%
/// minimum in Rogers & Company Foods' specification (Rogers & Company Foods, 2025)[^541].
#[doc = include_str!("../../../../docs/references/index/103.md")]
#[doc = include_str!("../../../../docs/references/index/541.md")]
pub const STD_PROTEIN_IN_MCI: f64 = 0.906;

/// Percentage of minerals (ash) typical of micellar casein isolate solids non-fat
///
/// Taken as 8.3%, the average at [`STD_PROTEIN_IN_MCI`] of the lines from milk solids
/// through the [compositions](self). ADPI's 8.0% maximum ash for micellar casein
/// concentrates and isolates (ADPI, 2023, p. 2)[^103] is ~8.5% of the solids non-fat at 5%
/// moisture and 1% fat.
///
/// The [line](super::minerals_in_snf) from milk solids to this fits each of the
/// compositions within 0.6 percentage points.
///
/// Calculated values are (%): 8.9, 8.6, 7.8, 7.8
#[doc = include_str!("../../../../docs/references/index/103.md")]
pub const STD_MINERALS_IN_MCI: f64 = 0.083;

/// Proportion of proteins in micellar casein isolate solids that is casein
///
/// Taken as 93%, the average at [`STD_PROTEIN_IN_MCI`] of the lines from milk solids
/// through the casein shares of the [compositions](self). Ingredia's isolate reports none.
///
/// The [line](super::casein_in_protein) from milk solids to this fits the reported shares
/// within 1.4 percentage points. It gives ~82% for micellar casein concentrate 42, the
/// lower end of the 82:18 to 95:5 of commercial products (ADPI, 2023, p. 1)[^103], and
/// agrees with USDEC's typical micellar casein, at least 92:8 (USDEC, 2015, p. 1)[^100].
///
/// Calculated values are (%): 91.6, 92.8, 94.4
#[doc = include_str!("../../../../docs/references/index/100.md")]
#[doc = include_str!("../../../../docs/references/index/103.md")]
pub const STD_CASEIN_PROTEIN_IN_MCI_PROTEIN: f64 = 0.93;

/// Percentage of lactose typical of caseinate solids non-fat
///
/// Taken as 0.2%, in line with the [sodium caseinates](self). ADPI's maximum for edible
/// caseinates is 1.0% (ADPI, 2024, p. 1)[^102].
///
/// Calculated values are (%): 0.1, 0.3, 0.2, 0.2
#[doc = include_str!("../../../../docs/references/index/102.md")]
pub const STD_LACTOSE_IN_CASEINATE: f64 = 0.002;

/// Percentage of protein typical of caseinate solids non-fat
///
/// Calculated as 95.8%, the remainder of 100% - [`STD_LACTOSE_IN_CASEINATE`] -
/// [`STD_MINERALS_IN_CASEINATE`], so the three add up to 1, as the [module](self) explains:
///
/// ```
/// # use sci_cream::constants::composition::dairy::casein::*;
/// assert_eq!(
///     STD_LACTOSE_IN_CASEINATE + STD_MINERALS_IN_CASEINATE + STD_PROTEIN_IN_CASEINATE,
///     1.0
/// );
/// ```
///
/// This is in line with Southward's 96.1%, whose composition sums to 100.0%, and above
/// ADPI's minimum for edible caseinates, 90.0% on a dry basis (ADPI, 2024, p. 1)[^102].
/// USDEC's and Ornua's run higher, as their compositions sum to 101.0% and 102.9%.
///
/// Calculated values are (%): 96.1, 97.6, 98.0, 95.2
#[doc = include_str!("../../../../docs/references/index/102.md")]
pub const STD_PROTEIN_IN_CASEINATE: f64 = 0.958;

/// Percentage of minerals (ash) typical of caseinate solids non-fat
///
/// Taken as 4%, about the 4.1% mean of the [sodium caseinates](self). Southward's and
/// USDEC's calcium caseinates run higher than their sodium ones, at 4.0% and 5.4%
/// (Southward, n.d., Table 1, p. 9)[^96], (USDEC, 2015, Figure 1, p. 1)[^100].
///
/// Calculated values are (%): 3.8, 3.2, 4.9, 4.6
#[doc = include_str!("../../../../docs/references/index/96.md")]
#[doc = include_str!("../../../../docs/references/index/100.md")]
pub const STD_MINERALS_IN_CASEINATE: f64 = 0.04;

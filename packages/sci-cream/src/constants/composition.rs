//! Standard composition values for various food components and ingredients

/// Percentage milk solids non-fat (MSNF) typical of milk serum (Goff & Hartel, 2013, p.160)[^2]
#[doc = include_str!("../../docs/references/index/2.md")]
pub const STD_MSNF_IN_MILK_SERUM: f64 = 0.09;

/// Percentage of lactose typical of milk solids non-fat (MSNF) (Goff & Hartel, 2013, p.181)[^2]
#[doc = include_str!("../../docs/references/index/2.md")]
pub const STD_LACTOSE_IN_MSNF: f64 = 0.545;

/// Percentage of lactose typically found in whey solids (WS) (Goff & Hartel, 2013, p. 181)[^2]
#[doc = include_str!("../../docs/references/index/2.md")]
pub const STD_LACTOSE_IN_WS: f64 = 0.765;

/// Percentage of protein typical of milk solids non-fat (MSNF) (Goff & Hartel, 2013, p. 35)[^2]
#[doc = include_str!("../../docs/references/index/2.md")]
pub const STD_PROTEIN_IN_MSNF: f64 = 0.35;

/// Percentage of protein typically found in whey solids (WS) (Goff & Hartel, 2013, p. 35)[^2]
#[doc = include_str!("../../docs/references/index/2.md")]
pub const STD_PROTEIN_IN_WS: f64 = 0.12;

/// Proportion of proteins in milk solids that is whey (Goff & Hartel, 2025, p. 315)[^20].
#[doc = include_str!("../../docs/references/index/20.md")]
pub const STD_WHEY_PROTEIN_IN_MSNF_PROTEIN: f64 = 0.2;

/// Proportion of proteins in milk solids that is casein (Goff & Hartel, 2025, p. 315)[^20].
#[doc = include_str!("../../docs/references/index/20.md")]
pub const STD_CASEIN_PROTEIN_IN_MSNF_PROTEIN: f64 = 0.8;

/// Percentage of saturated fats typical of milk fat (Board on Agriculture.., 1974, p. 203)[^12]
#[doc = include_str!("../../docs/references/index/12.md")]
pub const STD_SATURATED_FAT_IN_MILK_FAT: f64 = 0.65;

/// Percentage of trans fats typically found in milk fat (Milk, whole, 3.25% milkfat, with added
/// Vitamin D, 2019)[^103]
#[allow(clippy::doc_markdown)] // _FoodData_ false positive
#[doc = include_str!("../../docs/references/index/103.md")]
pub const STD_TRANS_FAT_IN_MILK_FAT: f64 = 0.035;

/// Percentage of saturated fats typical of egg fat (Board on Agriculture..., 1974, p. 203)[^12]
#[doc = include_str!("../../docs/references/index/12.md")]
pub const STD_SATURATED_FAT_IN_EGG_FAT: f64 = 0.28;

/// Percentage of saturated fats typical of nut fat; see [`NutSpec`](crate::specs::NutSpec).
///
/// This value is an average compiled from the nutrient profiles of various nuts in the _USDA
/// FoodData Central_ database (Nuts, almonds, 2019)[^102], (Nuts, pistachio nuts, raw,
/// 2019)[^112], (Nuts, hazelnuts or filberts, 2019)[^113].
#[allow(clippy::doc_markdown)] // _FoodData_ false positive
#[doc = include_str!("../../docs/references/index/102.md")]
#[doc = include_str!("../../docs/references/index/112.md")]
#[doc = include_str!("../../docs/references/index/113.md")]
pub const STD_SATURATED_FAT_IN_NUT_FAT: f64 = 0.09;

#[allow(clippy::doc_markdown)] // _FoodData_ false positive
/// Standard composition values for cacao products, notably cocoa solids; see
/// [`crate::specs::ChocolateSpec`].
///
/// These values are averages compiled from the nutrient profiles of various cacao products in
/// the _USDA FoodData Central_ database (Chocolate, dark, 60-69% cacao solids, 2019)[^104],
/// (Chocolate, dark, 70-85% cacao solids, 2019)[^105], (Cocoa powder, unsweetened, 2019)[^106].
/// The values are very consistent between the different cacao products, usually all within ~3
/// percentage points of each other (fiber was the only exception, varying between 34% and 45%).
///
/// The values are also consistent with the nutrition facts tables of various market cacao
/// products (Lindt 70% Cacao Dark Chocolate, 2025)[^107], (Lindt 85% Cacao Dark Chocolate,
/// 2025)[^108], (Lindt 95% Cacao Dark Chocolate, 2025)[^109], (Lindt 100% Cacao Dark Chocolate,
/// 2025)[^110], (Ghirardelli 100% Unsweetened Cocoa Powder, 2025)[^111].
#[doc = include_str!("../../docs/references/index/104.md")]
#[doc = include_str!("../../docs/references/index/105.md")]
#[doc = include_str!("../../docs/references/index/106.md")]
#[doc = include_str!("../../docs/references/index/107.md")]
#[doc = include_str!("../../docs/references/index/108.md")]
#[doc = include_str!("../../docs/references/index/109.md")]
#[doc = include_str!("../../docs/references/index/110.md")]
#[doc = include_str!("../../docs/references/index/111.md")]
pub mod cacao {
    #[cfg(doc)]
    pub use crate::{constants::composition, specs::ChocolateSpec};

    /// Percentage of water typically found in cacao products
    pub const STD_WATER_CONTENT_IN_CACAO_PRODUCTS: f64 = 0.02;

    /// Percentage of proteins typically found in cocoa solids; see [`ChocolateSpec`].
    ///
    /// The full composition of cocoa solids is proteins, carbohydrates, and ash - the
    /// respective composition percentages add up to 100%.
    /// See [`STD_CARBOHYDRATES_IN_COCOA_SOLIDS`] and [`STD_ASH_IN_COCOA_SOLIDS`].
    pub const STD_PROTEIN_IN_COCOA_SOLIDS: f64 = 0.245;

    /// Percentage of carbohydrates typically found in cocoa solids; see [`ChocolateSpec`].
    ///
    /// The full composition of cocoa solids is proteins, carbohydrates, and ash - the
    /// respective composition percentages add up to 100%.
    /// See [`STD_PROTEIN_IN_COCOA_SOLIDS`] and [`STD_ASH_IN_COCOA_SOLIDS`].
    pub const STD_CARBOHYDRATES_IN_COCOA_SOLIDS: f64 = 0.68;

    /// Percentage of fiber typically found in carbohydrates from cocoa solids; see
    /// [`ChocolateSpec`].
    pub const STD_FIBER_IN_COCOA_SOLIDS: f64 = 0.40;

    /// Percentage of ash (tracked as other SNFS) typically found in cocoa solids.
    ///
    /// The full composition of cocoa solids is proteins, carbohydrates, and ash - the
    /// respective composition percentages add up to 100%.
    /// See [`STD_PROTEIN_IN_COCOA_SOLIDS`] and [`STD_CARBOHYDRATES_IN_COCOA_SOLIDS`].
    pub const STD_ASH_IN_COCOA_SOLIDS: f64 = 0.075;

    /// Percentage of saturated fats typically found in cocoa butter; see [`ChocolateSpec`].
    pub const STD_SATURATED_FAT_IN_COCOA_BUTTER: f64 = 0.60;

    /// Percentage of cocoa butter typically found in cacao solids of non-powder chocolate
    ///
    /// This value is an average of all the products listed in [`composition::cacao`], except
    /// for the two cocoa powder products, which contain much lesser amounts of cocoa butter.
    pub const STD_COCOA_BUTTER_IN_CACAO_SOLIDS_OF_CHOCOLATE_NON_POWDER: f64 = 0.57;
}

#[cfg(test)]
#[cfg_attr(coverage, coverage(off))]
#[allow(clippy::float_cmp)]
mod tests {

    use crate::tests::asserts::shadow_asserts::assert_eq;
    use crate::tests::asserts::*;

    use super::*;

    #[test]
    fn cocoa_constants() {
        assert_eq!(
            cacao::STD_PROTEIN_IN_COCOA_SOLIDS
                + cacao::STD_CARBOHYDRATES_IN_COCOA_SOLIDS
                + cacao::STD_ASH_IN_COCOA_SOLIDS,
            1.0
        );

        assert_lt!(cacao::STD_FIBER_IN_COCOA_SOLIDS, cacao::STD_CARBOHYDRATES_IN_COCOA_SOLIDS);
    }
}

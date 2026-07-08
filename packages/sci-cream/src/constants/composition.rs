//! Standard composition values for various food components and ingredients

/// Standard composition values for dairy products, including milk/cream, powders, proteins, etc.
pub mod dairy {
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

    /// Percentage of minerals typical of milk solids non-fat (MSNF)
    ///
    /// Calculates as the remainder of 100% - [`STD_LACTOSE_IN_MSNF`] - [`STD_PROTEIN_IN_MSNF`].
    pub const STD_MINERALS_IN_MSNF: f64 = 1.0 - STD_LACTOSE_IN_MSNF - STD_PROTEIN_IN_MSNF;

    /// Percentage of minerals typical of whey solids (WS)
    ///
    /// Calculates as the remainder of 100% - [`STD_LACTOSE_IN_WS`] - [`STD_PROTEIN_IN_WS`].
    pub const STD_MINERALS_IN_WS: f64 = 1.0 - STD_LACTOSE_IN_WS - STD_PROTEIN_IN_WS;

    /// Percentage of minerals typical of casein solids (CS)
    //
    // 10% guess, @todo find a reference for this value
    pub const STD_MINERALS_IN_CASEIN: f64 = 0.1;

    /// Proportion of proteins in milk solids that is whey
    ///
    /// (Clarke, 2004, p. 40)[^4], (Goff & Hartel, 2025, p. 315)[^20].
    #[doc = include_str!("../../docs/references/index/4.md")]
    #[doc = include_str!("../../docs/references/index/20.md")]
    pub const STD_WHEY_PROTEIN_IN_MSNF_PROTEIN: f64 = 0.2;

    /// Proportion of proteins in milk solids that is casein
    ///
    /// (Clarke, 2004, p. 40)[^4], (Goff & Hartel, 2025, p. 315)[^20].
    #[doc = include_str!("../../docs/references/index/4.md")]
    #[doc = include_str!("../../docs/references/index/20.md")]
    pub const STD_CASEIN_PROTEIN_IN_MSNF_PROTEIN: f64 = 0.8;

    /// Percentage of water typically found in milk powder
    ///
    /// (Goff & Hartel, 2025, Table 3.2, p. 48)[^20]
    ///
    /// Skim milk and whole milk powder listed as having 97% and 98% total solids, respectively.
    #[doc = include_str!("../../docs/references/index/20.md")]
    pub const STD_MIN_WATER_CONTENT_IN_MILK_POWDER: f64 = 0.02;

    /// Percentage of butterfat typically found in whole milk powder
    ///
    /// (Goff & Hartel, 2025, Table 3.2, p. 48)[^20], (Parmalat Whole Milk Powder 26%, 2026,
    /// PantryLot)[^120], (MMPA - Grade A Whole Milk Powder 26%, 2026, BulkMart)[^121]
    #[expect(clippy::doc_markdown)] // _PantryLot_  and _BulkMart_ false positives
    #[doc = include_str!("../../docs/references/index/20.md")]
    #[doc = include_str!("../../docs/references/index/120.md")]
    #[doc = include_str!("../../docs/references/index/121.md")]
    pub const STD_BUTTERFAT_IN_WHOLE_MILK_POWDER: f64 = 0.26;

    /// Percentage of saturated fats typical of milk fat (Board on Agriculture.., 1974, p. 203)[^12]
    #[doc = include_str!("../../docs/references/index/12.md")]
    pub const STD_SATURATED_FAT_IN_MILK_FAT: f64 = 0.65;

    /// Percentage of trans fats typically found in milk fat
    ///
    /// (Milk, whole, 3.25% milkfat, with added Vitamin D, 2019)[^103]
    #[expect(clippy::doc_markdown)] // _FoodData_ false positive
    #[doc = include_str!("../../docs/references/index/103.md")]
    pub const STD_TRANS_FAT_IN_MILK_FAT: f64 = 0.035;
}

/// Standard composition values for eggs, including yolks, whites, and whole eggs.
pub mod egg {
    /// Percentage of egg yolk in a whole egg, by weight (Goff & Hartel, 2025, p. 84)[^20]
    #[doc = include_str!("../../docs/references/index/20.md")]
    pub const STD_EGG_YOLKS_IN_WHOLE_EGG: f64 = 0.35;

    /// Percentage of egg whites in a whole egg, by weight (Goff & Hartel, 2025, p. 84)[^20]
    #[doc = include_str!("../../docs/references/index/20.md")]
    pub const STD_EGG_WHITES_IN_WHOLE_EGG: f64 = 1.0 - STD_EGG_YOLKS_IN_WHOLE_EGG;

    /// Percentage of protein typically found in egg yolk
    ///
    /// (Clarke, 2004, p. 49)[^4], (Goff & Hartel, 2025, p. 48)[^20], (FoodData Central, 2019,
    /// "Eggs, Grade A, Large, egg yolk")[^100].
    #[expect(clippy::doc_markdown)] // _FoodData_ false positive
    #[doc = include_str!("../../docs/references/index/4.md")]
    #[doc = include_str!("../../docs/references/index/20.md")]
    #[doc = include_str!("../../docs/references/index/100.md")]
    pub const STD_PROTEIN_IN_EGG_YOLK: f64 = 0.16;

    /// Percentage of protein typically found in egg white
    ///
    /// (FoodData Central, 2019, "Eggs, Grade A, Large, egg white")[^118]
    #[expect(clippy::doc_markdown)] // _FoodData_ false positive
    #[doc = include_str!("../../docs/references/index/118.md")]
    pub const STD_PROTEIN_IN_EGG_WHITE: f64 = 0.11;

    /// Percentage of solids typically found in egg yolk
    ///
    /// Sources list the total solids content of egg yolks to be between 48-51% by weight; 50% is a
    /// reasonable average of these values (Clarke, 2004, p. 49)[^4], (Goff & Hartel, 2025, p.
    /// 48)[^20], (FoodData Central, 2019, "Eggs, Grade A, Large, egg yolk")[^100].
    #[expect(clippy::doc_markdown)] // _FoodData_ false positive
    #[doc = include_str!("../../docs/references/index/4.md")]
    #[doc = include_str!("../../docs/references/index/20.md")]
    #[doc = include_str!("../../docs/references/index/100.md")]
    pub const STD_SOLIDS_IN_EGG_YOLK: f64 = 0.50;

    /// Percentage of solids typically found in egg white
    ///
    /// (FoodData Central, 2019, "Eggs, Grade A, Large, egg white")[^118]
    #[expect(clippy::doc_markdown)] // _FoodData_ false positive
    #[doc = include_str!("../../docs/references/index/118.md")]
    pub const STD_SOLIDS_IN_EGG_WHITE: f64 = 0.14;

    /// Percentage of protein typically found in egg yolk solids
    ///
    /// Sources list the protein content of egg yolk solids to be between 30.9-33.75% by weight; 32%
    /// is a reasonable average of these values (Clarke, 2004, p. 49)[^4], (Goff & Hartel, 2025, p.
    /// 48)[^20], (FoodData Central, 2019, "Eggs, Grade A, Large, egg yolk")[^100].
    ///
    /// Consistent with [`STD_PROTEIN_IN_EGG_YOLK`] / [`STD_SOLIDS_IN_EGG_YOLK`].
    #[expect(clippy::doc_markdown)] // _FoodData_ false positive
    #[doc = include_str!("../../docs/references/index/4.md")]
    #[doc = include_str!("../../docs/references/index/20.md")]
    #[doc = include_str!("../../docs/references/index/100.md")]
    pub const STD_PROTEIN_IN_EGG_YOLK_SOLIDS: f64 = 0.32;

    /// Percentage of protein typically found in egg white solids
    ///
    /// (FoodData Central, 2019, "Eggs, Grade A, Large, egg white")[^118]
    ///
    /// Consistent-ish with [`STD_PROTEIN_IN_EGG_WHITE`] / [`STD_SOLIDS_IN_EGG_WHITE`].
    #[expect(clippy::doc_markdown)] // _FoodData_ false positive
    #[doc = include_str!("../../docs/references/index/118.md")]
    pub const STD_PROTEIN_IN_EGG_WHITE_SOLIDS: f64 = 0.78;

    /// Percentage of whole-egg solids contributed by the yolk
    ///
    /// Derived from [`STD_SOLIDS_IN_EGG_YOLK`], [`STD_SOLIDS_IN_EGG_WHITE`],
    /// [`STD_EGG_YOLKS_IN_WHOLE_EGG`], and [`STD_EGG_WHITES_IN_WHOLE_EGG`].
    pub const STD_YOLK_SOLIDS_IN_WHOLE_EGG_SOLIDS: f64 = {
        let yolk = STD_EGG_YOLKS_IN_WHOLE_EGG * STD_SOLIDS_IN_EGG_YOLK;
        let white = STD_EGG_WHITES_IN_WHOLE_EGG * STD_SOLIDS_IN_EGG_WHITE;
        yolk / (yolk + white)
    };

    /// Percentage of whole-egg solids contributed by the white (albumen)
    ///
    /// Derived from [`STD_SOLIDS_IN_EGG_YOLK`], [`STD_SOLIDS_IN_EGG_WHITE`],
    /// [`STD_EGG_YOLKS_IN_WHOLE_EGG`], and [`STD_EGG_WHITES_IN_WHOLE_EGG`].
    pub const STD_WHITE_SOLIDS_IN_WHOLE_EGG_SOLIDS: f64 = 1.0 - STD_YOLK_SOLIDS_IN_WHOLE_EGG_SOLIDS;

    /// Proportion of whole-egg protein contributed by the yolk
    ///
    /// Derived from [`STD_PROTEIN_IN_EGG_YOLK`], [`STD_PROTEIN_IN_EGG_WHITE`],
    /// [`STD_EGG_YOLKS_IN_WHOLE_EGG`], and [`STD_EGG_WHITES_IN_WHOLE_EGG`].
    pub const STD_YOLK_PROTEIN_IN_WHOLE_EGG_PROTEIN: f64 = {
        let yolk = STD_EGG_YOLKS_IN_WHOLE_EGG * STD_PROTEIN_IN_EGG_YOLK;
        let white = STD_EGG_WHITES_IN_WHOLE_EGG * STD_PROTEIN_IN_EGG_WHITE;
        yolk / (yolk + white)
    };

    /// Proportion of whole-egg protein contributed by the white (albumen)
    ///
    /// Derived from [`STD_PROTEIN_IN_EGG_YOLK`], [`STD_PROTEIN_IN_EGG_WHITE`],
    /// [`STD_EGG_YOLKS_IN_WHOLE_EGG`], and [`STD_EGG_WHITES_IN_WHOLE_EGG`].
    pub const STD_WHITE_PROTEIN_IN_WHOLE_EGG_PROTEIN: f64 = 1.0 - STD_YOLK_PROTEIN_IN_WHOLE_EGG_PROTEIN;

    /// Percentage of saturated fats typical of egg fat (Board on Agriculture..., 1974, p. 203)[^12]
    #[doc = include_str!("../../docs/references/index/12.md")]
    pub const STD_SATURATED_FAT_IN_EGG_FAT: f64 = 0.28;

    /// Percentage of lecithin typically found in egg yolk solids
    ///
    /// Sources list the lecithin content of egg yolks to be between 8-10% by weight, and the total
    /// solids in egg yolk to be between 48-51% by weight, for a lecithin content of egg yolk solids
    /// of between ~16-21% by weight; 19% is a reasonable average of these values (Clarke, 2004, p.
    /// 49)[^4], (Goff & Hartel, 2025, p. 84)[^20], (Manley, 2000, 12.3.1 Lecithin)[^68], (Zhao, et
    /// al., 2023, 1. Introduction)[^69], (Palacios, et al., 2020)[^70], (FoodData Central, 2019,
    /// "Eggs, Grade A, Large, egg yolk")[^100]
    #[expect(clippy::doc_markdown)] // _FoodData_ false positive
    #[doc = include_str!("../../docs/references/index/4.md")]
    #[doc = include_str!("../../docs/references/index/20.md")]
    #[doc = include_str!("../../docs/references/index/68.md")]
    #[doc = include_str!("../../docs/references/index/69.md")]
    #[doc = include_str!("../../docs/references/index/70.md")]
    #[doc = include_str!("../../docs/references/index/100.md")]
    pub const STD_LECITHIN_IN_EGG_YOLK_SOLIDS: f64 = 0.19;
}

/// Standard composition values for nuts, e.g. almonds, hazelnuts, etc.
pub mod nut {
    /// Percentage of saturated fats typical of nut fat; see [`NutSpec`](crate::specs::NutSpec).
    ///
    /// This value is an average compiled from the nutrient profiles of various nuts in the _USDA
    /// FoodData Central_ database (Nuts, almonds, 2019)[^102], (Nuts, pistachio nuts, raw,
    /// 2019)[^112], (Nuts, hazelnuts or filberts, 2019)[^113].
    #[doc = include_str!("../../docs/references/index/102.md")]
    #[doc = include_str!("../../docs/references/index/112.md")]
    #[doc = include_str!("../../docs/references/index/113.md")]
    pub const STD_SATURATED_FAT_IN_NUT_FAT: f64 = 0.09;
}

/// Standard composition values for cacao products, notably cocoa solids; see the [chocolate
/// documentation](crate::docs#chocolate) for more details about the components of chocolate.
///
/// These values are averages compiled from the nutrient profiles of various cacao products in the
/// _USDA FoodData Central_ database (Chocolate, dark, 60-69% cacao solids, 2019)[^104], (Chocolate,
/// dark, 70-85% cacao solids, 2019)[^105], (Cocoa powder, unsweetened, 2019)[^106]. The values are
/// very consistent between the different cacao products, usually all within ~3 percentage points of
/// each other (fiber was the only exception, varying between 34% and 45%).
///
/// The values are also consistent with the nutrition facts tables of various market cacao products
/// (Lindt 70% Cacao Dark Chocolate, 2025)[^107], (Lindt 85% Cacao Dark Chocolate, 2025)[^108],
/// (Lindt 95% Cacao Dark Chocolate, 2025)[^109], (Lindt 100% Cacao Dark Chocolate, 2025)[^110],
/// (Ghirardelli 100% Unsweetened Cocoa Powder, 2025)[^111].
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
    pub use crate::constants::composition;

    /// Percentage of water typically found in cacao products
    pub const STD_WATER_CONTENT_IN_CACAO_PRODUCTS: f64 = 0.02;

    /// Percentage of proteins typically found in cocoa solids
    ///
    /// The full composition of cocoa solids is proteins, carbohydrates, and ash - the respective
    /// composition percentages add up to 100%.
    ///
    /// See [`STD_CARBOHYDRATES_IN_COCOA_SOLIDS`] and [`STD_ASH_IN_COCOA_SOLIDS`].
    pub const STD_PROTEIN_IN_COCOA_SOLIDS: f64 = 0.245;

    /// Percentage of carbohydrates typically found in cocoa solids
    ///
    /// The full composition of cocoa solids is proteins, carbohydrates, and ash - the respective
    /// composition percentages add up to 100%.
    ///
    /// See [`STD_PROTEIN_IN_COCOA_SOLIDS`] and [`STD_ASH_IN_COCOA_SOLIDS`].
    pub const STD_CARBOHYDRATES_IN_COCOA_SOLIDS: f64 = 0.68;

    /// Percentage of fiber typically found in carbohydrates from cocoa solids
    pub const STD_FIBER_IN_COCOA_SOLIDS: f64 = 0.40;

    /// Percentage of ash (tracked as other SNFS) typically found in cocoa solids.
    ///
    /// The full composition of cocoa solids is proteins, carbohydrates, and ash - the respective
    /// composition percentages add up to 100%.
    ///
    /// See [`STD_PROTEIN_IN_COCOA_SOLIDS`] and [`STD_CARBOHYDRATES_IN_COCOA_SOLIDS`].
    pub const STD_ASH_IN_COCOA_SOLIDS: f64 = 0.075;

    /// Percentage of saturated fats typically found in cocoa butter
    pub const STD_SATURATED_FAT_IN_COCOA_BUTTER: f64 = 0.60;

    /// Percentage of cocoa butter typically found in cacao solids of non-powder chocolate
    ///
    /// This value is an average of all the products listed in [`composition::cacao`], except for
    /// the two cocoa powder products, which contain much lesser amounts of cocoa butter.
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

    #[test]
    fn egg_split_constants() {
        // Whole-egg solids split: yolk 0.35×0.50, white 0.65×0.14.
        assert_eq_flt_test!(egg::STD_YOLK_SOLIDS_IN_WHOLE_EGG_SOLIDS, 0.6579);
        assert_eq_flt_test!(egg::STD_WHITE_SOLIDS_IN_WHOLE_EGG_SOLIDS, 0.3421);

        // Whole-egg protein split: yolk 0.35×0.16, white 0.65×0.11.
        assert_eq_flt_test!(egg::STD_YOLK_PROTEIN_IN_WHOLE_EGG_PROTEIN, 0.4392);
        assert_eq_flt_test!(egg::STD_WHITE_PROTEIN_IN_WHOLE_EGG_PROTEIN, 0.5608);

        // Each split partitions the whole.
        assert_eq!(egg::STD_YOLK_SOLIDS_IN_WHOLE_EGG_SOLIDS + egg::STD_WHITE_SOLIDS_IN_WHOLE_EGG_SOLIDS, 1.0);
        assert_eq!(egg::STD_YOLK_PROTEIN_IN_WHOLE_EGG_PROTEIN + egg::STD_WHITE_PROTEIN_IN_WHOLE_EGG_PROTEIN, 1.0);
    }

    #[test]
    fn egg_protein_in_solids_consistency() {
        // Yolk: protein-in-solids equals protein / solids exactly (0.16 / 0.50).
        assert_eq!(egg::STD_PROTEIN_IN_EGG_YOLK_SOLIDS, egg::STD_PROTEIN_IN_EGG_YOLK / egg::STD_SOLIDS_IN_EGG_YOLK);

        // White: within ~0.6 pp of protein / solids (0.78 vs 0.11 / 0.14 ≈ 0.7857).
        assert_abs_diff_eq!(
            egg::STD_PROTEIN_IN_EGG_WHITE_SOLIDS,
            egg::STD_PROTEIN_IN_EGG_WHITE / egg::STD_SOLIDS_IN_EGG_WHITE,
            epsilon = 0.01
        );
    }
}

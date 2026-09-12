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
/// _USDA FoodData Central_ database:
///
/// - (USDA, 2019, "Chocolate, dark, 45-59% cacao solids")[^127]
/// - (USDA, 2019, "Chocolate, dark, 60-69% cacao solids")[^104]
/// - (USDA, 2019, "Chocolate, dark, 70-85% cacao solids")[^105]
/// - (USDA, 2019, "Cocoa, dry powder, unsweetened")[^106]
/// - (USDA, 2019, "Cocoa, dry powder, unsweetened, processed with alkali")[^128]
/// - (USDA, 2019, "Cocoa, dry powder, hi-fat or breakfast, processed with alkali")[^129]
///
/// The values are very consistent between the different cacao products, usually all within ~4
/// percentage points of each other (fiber was the only exception, varying between 33% and 46%).
///
/// The values are also consistent with the nutrition facts tables of various market cacao products:
///
/// - (Lindt 70% Cacao Dark Chocolate, 2025)[^107]
/// - (Lindt 85% Cacao Dark Chocolate, 2025)[^108]
/// - (Lindt 95% Cacao Dark Chocolate, 2025)[^109]
/// - (Lindt 100% Cacao Dark Chocolate, 2025)[^110]
/// - (Ghirardelli 100% Unsweetened Cocoa Powder, 2025)[^111]
///
/// **Note:** The `_IN_COCOA_SOLIDS` constants are calculated as fractions of the dry, fat-free
/// cacao solids of each listing, including sugars intrinsic to the cacao nuts. For cocoa powders,
/// that is calculated as `100 - fat - water`. For chocolate listings, `sugars` includes both
/// intrinsic and added sugars, so cocoa solids is calculated as `100 - fat - water - added_sugars`.
/// Added sugars are calculated as `added_sugars = sugars - intrinsic_sugars`, where intrinsic
/// sugars are estimated by [`cacao::STD_SUGARS_IN_COCOA_SOLIDS`], denoted `k`. Then the cocoa
/// solids, the denominator, are calculated as `(100 - fat - water - sugars) / (1 - k)`.
///
/// **Note:** The composition of cocoa solids is taken to be entirely proteins, carbohydrates, and
/// ash, i.e. `100% = proteins + carbohydrates + ash`, so the constants must add up to 1.
///
/// For chocolates and natural cocoa powders:
///
/// - [`cacao::STD_PROTEIN_IN_COCOA_SOLIDS`]
/// - [`cacao::STD_CARBOHYDRATES_IN_NATURAL_COCOA_SOLIDS`]
/// - [`cacao::STD_ASH_IN_NATURAL_COCOA_SOLIDS`]
///
/// For alkalized (dutched) cocoa powders:
///
/// - [`cacao::STD_PROTEIN_IN_COCOA_SOLIDS`]
/// - [`cacao::STD_CARBOHYDRATES_IN_DUTCHED_COCOA_SOLIDS`]
/// - [`cacao::STD_ASH_IN_DUTCHED_COCOA_SOLIDS`]
#[doc = include_str!("../../docs/references/index/104.md")]
#[doc = include_str!("../../docs/references/index/105.md")]
#[doc = include_str!("../../docs/references/index/106.md")]
#[doc = include_str!("../../docs/references/index/107.md")]
#[doc = include_str!("../../docs/references/index/108.md")]
#[doc = include_str!("../../docs/references/index/109.md")]
#[doc = include_str!("../../docs/references/index/110.md")]
#[doc = include_str!("../../docs/references/index/111.md")]
#[doc = include_str!("../../docs/references/index/127.md")]
#[doc = include_str!("../../docs/references/index/128.md")]
#[doc = include_str!("../../docs/references/index/129.md")]
pub mod cacao {
    #[cfg(doc)]
    pub use crate::{
        constants::composition,
        specs::{ChocolateSpec, CocoaPowderSpec},
    };

    /// Water content of cocoa powder, as a percentage of the product as a whole
    ///
    /// This is a rough average of the water content of several natural and alkalized powders:
    ///
    /// - (USDA, 2019, "Cocoa, dry powder, unsweetened")[^106]
    /// - (USDA, 2019, "Cocoa, dry powder, unsweetened, processed with alkali")[^128]
    /// - (USDA, 2019, "Cocoa, dry powder, hi-fat or breakfast, processed with alkali")[^129]
    ///
    /// The EU caps cocoa powder at 9% water (Directive 2000/36/EC, 2000, Annex I 2.(a))[^84].
    #[doc = include_str!("../../docs/references/index/84.md")]
    #[doc = include_str!("../../docs/references/index/106.md")]
    #[doc = include_str!("../../docs/references/index/128.md")]
    #[doc = include_str!("../../docs/references/index/129.md")]
    pub const STD_WATER_IN_COCOA_POWDER: f64 = 0.03;

    /// Water content of chocolate, as a percentage of the product as a whole
    ///
    /// This is a rough average of the water content of several chocolate products:
    ///
    /// - (USDA, 2019, "Chocolate, dark, 45-59% cacao solids")[^127]
    /// - (USDA, 2019, "Chocolate, dark, 60-69% cacao solids")[^104]
    /// - (USDA, 2019, "Chocolate, dark, 70-85% cacao solids")[^105]
    #[doc = include_str!("../../docs/references/index/104.md")]
    #[doc = include_str!("../../docs/references/index/105.md")]
    #[doc = include_str!("../../docs/references/index/127.md")]
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
    /// dry powder, unsweetened")[^106], (USDA, 2019, "... processed with alkali")[^128]. Alkali
    /// ingredients are capped at the neutralizing value of 3 parts by weight of anhydrous potassium
    /// carbonate per 100 parts nibs (U.S. FDA, CFR 21, 163.110(b)(1))[^86]. This puts the USDA pair
    /// at about a third of the regulatory limit, a reasonably typical value. See the documentation
    /// for [dutch processed](crate::docs#dutch-processed) cocoa solids for more details.
    ///
    /// This only averages the alkalized entries. Calculated values are (%): 9.3, 9.3
    ///
    /// See [`STD_ASH_IN_NATURAL_COCOA_SOLIDS`] for the ash content of natural cocoa solids.
    #[doc = include_str!("../../docs/references/index/20.md")]
    #[doc = include_str!("../../docs/references/index/85.md")]
    #[doc = include_str!("../../docs/references/index/86.md")]
    #[doc = include_str!("../../docs/references/index/106.md")]
    #[doc = include_str!("../../docs/references/index/128.md")]
    pub const STD_ASH_IN_DUTCHED_COCOA_SOLIDS: f64 = 0.093;

    /// Percentage of carbohydrates typically found in natural cocoa solids
    ///
    /// The composition of cocoa solids is taken to be entirely proteins, carbohydrates, and ash,
    /// i.e. `100% = proteins + carbohydrates + ash`, so the constants must add up to 1. This is
    /// the residual of the other components, i.e. `carbohydrates = 100% - proteins - ash`, derived
    /// _"by difference"_ the same way as the USDA listings.
    ///
    /// The residual of [`STD_PROTEIN_IN_COCOA_SOLIDS`] and [`STD_ASH_IN_NATURAL_COCOA_SOLIDS`].
    pub const STD_CARBOHYDRATES_IN_NATURAL_COCOA_SOLIDS: f64 = 0.689;

    /// Percentage of carbohydrates typically found in alkalized cocoa solids
    ///
    /// The composition of cocoa solids is taken to be entirely proteins, carbohydrates, and ash,
    /// i.e. `100% = proteins + carbohydrates + ash`, so the constants must add up to 1. This is
    /// the residual of the other components, i.e. `carbohydrates = 100% - proteins - ash`, derived
    /// _"by difference"_ the same way as the USDA listings.
    ///
    /// The residual of [`STD_PROTEIN_IN_COCOA_SOLIDS`] and [`STD_ASH_IN_DUTCHED_COCOA_SOLIDS`].
    pub const STD_CARBOHYDRATES_IN_DUTCHED_COCOA_SOLIDS: f64 = 0.672;

    /// Percentage of saturated fats typically found in cocoa butter
    pub const STD_SATURATED_FAT_IN_COCOA_BUTTER: f64 = 0.60;

    /// Percentage of cocoa butter typically found in cacao solids of non-powder chocolate
    ///
    /// This value is an average of all the chocolate products listed in [`composition::cacao`].
    /// Note that this excludes cocoa powders, which contain much lesser amounts of cocoa butter.
    pub const STD_COCOA_BUTTER_IN_CACAO_SOLIDS: f64 = 0.57;
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
        // Both triples partition the cocoa solids, to within the rounding of their last digit
        assert_abs_diff_eq!(
            cacao::STD_PROTEIN_IN_COCOA_SOLIDS
                + cacao::STD_CARBOHYDRATES_IN_NATURAL_COCOA_SOLIDS
                + cacao::STD_ASH_IN_NATURAL_COCOA_SOLIDS,
            1.0,
            epsilon = f64::EPSILON
        );
        assert_abs_diff_eq!(
            cacao::STD_PROTEIN_IN_COCOA_SOLIDS
                + cacao::STD_CARBOHYDRATES_IN_DUTCHED_COCOA_SOLIDS
                + cacao::STD_ASH_IN_DUTCHED_COCOA_SOLIDS,
            1.0,
            epsilon = f64::EPSILON
        );

        // Alkalization only moves mass from carbohydrates into ash
        assert_gt!(cacao::STD_ASH_IN_DUTCHED_COCOA_SOLIDS, cacao::STD_ASH_IN_NATURAL_COCOA_SOLIDS);
        assert_lt!(cacao::STD_CARBOHYDRATES_IN_DUTCHED_COCOA_SOLIDS, cacao::STD_CARBOHYDRATES_IN_NATURAL_COCOA_SOLIDS);

        // Fiber and the intrinsic sugars are both drawn from the carbohydrates, so together they
        // must fit inside the smaller of the two carbohydrate fractions
        assert_lt!(
            cacao::STD_FIBER_IN_COCOA_SOLIDS + cacao::STD_SUGARS_IN_COCOA_SOLIDS,
            cacao::STD_CARBOHYDRATES_IN_DUTCHED_COCOA_SOLIDS
        );
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

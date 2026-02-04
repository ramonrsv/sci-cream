/*! Constants and associated utilities for various ingredient properties */

/// [Potere Dolcificante (POD)](crate::docs#pod) values various sweeteners and other ingredients
///
/// Expressed as g/100g of sucrose equivalence.
#[doc = include_str!("../docs/bibs/2.md")]
pub mod pod {
    /// Also known by the name 'dextrose', commonly sold as dextrose monohydrate powder.
    ///
    /// (Goff & Hartel, 2013, Table 3.4, p. 67)[^2]
    #[doc = include_str!("../docs/bibs/2.md")]
    pub const GLUCOSE: f64 = 80.0;
    /// (Goff & Hartel, 2013, Table 3.4, p. 67)[^2]
    #[doc = include_str!("../docs/bibs/2.md")]
    pub const FRUCTOSE: f64 = 173.0;
    /// (Spillane, 2006, p. 264)[^9]
    #[doc = include_str!("../docs/bibs/9.md")]
    pub const GALACTOSE: f64 = 65.0;
    /// (Goff & Hartel, 2013, Table 3.4, p. 67)[^2]
    #[doc = include_str!("../docs/bibs/2.md")]
    pub const SUCROSE: f64 = 100.0;
    /// (Goff & Hartel, 2013, Table 3.4, p. 67)[^2]
    #[doc = include_str!("../docs/bibs/2.md")]
    pub const LACTOSE: f64 = 16.0;
    /// (Goff & Hartel, 2013, Table 3.4, p. 67)[^2], (Spillane, 2006, p. 253)[^9]
    #[doc = include_str!("../docs/bibs/2.md")]
    #[doc = include_str!("../docs/bibs/9.md")]
    pub const MALTOSE: f64 = 32.0;
    /// (Hull, 2010, Appendix C.3, p. 324)[^15], (Spillane, 2006, p. 262)[^9]
    #[doc = include_str!("../docs/bibs/15.md")]
    #[doc = include_str!("../docs/bibs/9.md")]
    pub const TREHALOSE: f64 = 45.0;

    /// (The European Commission, 2025, E968)[^10]
    #[doc = include_str!("../docs/bibs/10.md")]
    pub const ERYTHRITOL: f64 = 70.0;
    /// (Hull, 2010, Appendix C.3, p. 324)[^15]
    #[doc = include_str!("../docs/bibs/15.md")]
    pub const MALTITOL: f64 = 90.0;
    /// (Hull, 2010, Appendix C.3, p. 324)[^15]
    #[doc = include_str!("../docs/bibs/15.md")]
    pub const SORBITOL: f64 = 50.0;
    /// (Hull, 2010, Appendix C.3, p. 324)[^15]
    #[doc = include_str!("../docs/bibs/15.md")]
    pub const XYLITOL: f64 = 100.0;

    /// (The European Commission, 2025, E951)[^10]
    #[doc = include_str!("../docs/bibs/10.md")]
    pub const ASPARTAME: f64 = 200.0 * 100.0;
    /// (Spillane, 2006, Table 9.4, p. 188)[^9]
    #[doc = include_str!("../docs/bibs/9.md")]
    pub const CYCLAMATE: f64 = 30.0 * 100.0;
    /// (The European Commission, 2025, E954)[^10]
    #[doc = include_str!("../docs/bibs/10.md")]
    pub const SACCHARIN: f64 = 400.0 * 100.0;
    /// (Castro-Muñoz, 2022)[^11]), (Hull, 2010, Appendix C.3, p. 324)[^15]
    #[doc = include_str!("../docs/bibs/11.md")]
    #[doc = include_str!("../docs/bibs/15.md")]
    pub const SUCRALOSE: f64 = 600.0 * 100.0;

    /// (Spillane, 2006, p. 297)[^9]
    ///
    /// <div class='warning'>
    /// The POD values for steviosides vary significantly between different sources, are dependent
    /// on concentration, extract purity, and on specific glycoside composition. The values listed
    /// here are very rough estimations for general reference only. Given that, and that products
    /// rarely list the exact amounts of extracts used, these should not be used to calculate POD
    /// contributions in formulations; ingredients should explicitly provide POD values instead.
    /// </div>
    ///
    #[doc = include_str!("../docs/bibs/9.md")]
    pub const STEVIOSIDES: f64 = 225.0 * 100.0;
    /// (Spillane, 2006, p. 297)[^9]
    ///
    /// <div class='warning'>
    /// The POD values for mogrosides vary significantly between different sources, are dependent
    /// on concentration, extract purity, and on specific glycoside composition. The values listed
    /// here are very rough estimations for general reference only. Given that, and that products
    /// rarely list the exact amounts of extracts used, these should not be used to calculate POD
    /// contributions in formulations; ingredients should explicitly provide POD values instead.
    /// </div>
    ///
    #[doc = include_str!("../docs/bibs/9.md")]
    pub const MOGROSIDES: f64 = 340.0 * 100.0;

    /// (Niness, 1999, "Inulin and Oligofructose: What Are They?")[^24]
    #[doc = include_str!("../docs/bibs/24.md")]
    pub const INULIN: f64 = 0.0;
    /// (Niness, 1999, "Inulin and Oligofructose: What Are They?")[^24]
    #[doc = include_str!("../docs/bibs/24.md")]
    pub const OLIGOFRUCTOSE: f64 = 40.0;
}

/// Molar mass values (g/mol) for various sweeteners and other ingredients
///
/// Used to calculate [PAC](crate::docs#pac-afp-fpdf-se) based on molar mass relative to that of
/// sucrose. These values are sourced from the respective Wikipedia articles for each ingredient.
#[allow(missing_docs)] // No need to document each constant individually
pub mod molar_mass {
    /// Calculate [PAC](crate::docs#pac-afp-fpdf-se) from molar mass, expressed as g/100g of
    /// sucrose equivalence
    ///
    /// Calculate PAC based on a molar mass relative to that of sucrose of 342.30 g/mol, e.g.
    /// glucose has a molar mass of 180.16 g/mol, so its PAC is 342.30 / 180.16 * 100 = 190.
    #[must_use]
    pub const fn pac_from_molar_mass(molar_mass: f64) -> f64 {
        (SUCROSE / molar_mass * 100.0).floor()
    }

    pub const GLUCOSE: f64 = 180.156;
    pub const FRUCTOSE: f64 = 180.156;
    pub const GALACTOSE: f64 = 180.156;
    pub const SUCROSE: f64 = 342.30;
    pub const LACTOSE: f64 = 342.297;
    pub const MALTOSE: f64 = 342.297;
    pub const TREHALOSE: f64 = 342.296;

    pub const ERYTHRITOL: f64 = 122.12;
    pub const MALTITOL: f64 = 344.313;
    pub const SORBITOL: f64 = 182.17;
    pub const XYLITOL: f64 = 152.146;

    pub const ASPARTAME: f64 = 294.307;
    pub const CYCLAMATE: f64 = 201.22;
    pub const SACCHARIN: f64 = 183.18;
    pub const SUCRALOSE: f64 = 397.63;

    pub const SALT: f64 = 58.443;
    pub const ALCOHOL: f64 = 46.069;
}

/// [Potere Anti-Congelante (PAC)](crate::docs#pac-afp-fpdf-se) values for various sweeteners and
/// other ingredients
///
/// Expressed as g/100g of sucrose equivalence. Unless otherwise specified, values are calculated
/// based on molar mass relative to that of sucrose. See [`molar_mass::pac_from_molar_mass`].
#[allow(missing_docs)] // No need to document each constant individually
pub mod pac {
    use super::molar_mass::{self, pac_from_molar_mass};

    pub const GLUCOSE: f64 = pac_from_molar_mass(molar_mass::GLUCOSE);
    pub const FRUCTOSE: f64 = pac_from_molar_mass(molar_mass::FRUCTOSE);
    pub const GALACTOSE: f64 = pac_from_molar_mass(molar_mass::GALACTOSE);
    pub const SUCROSE: f64 = pac_from_molar_mass(molar_mass::SUCROSE);
    pub const LACTOSE: f64 = pac_from_molar_mass(molar_mass::LACTOSE);
    pub const MALTOSE: f64 = pac_from_molar_mass(molar_mass::MALTOSE);
    pub const TREHALOSE: f64 = pac_from_molar_mass(molar_mass::TREHALOSE);

    pub const ERYTHRITOL: f64 = pac_from_molar_mass(molar_mass::ERYTHRITOL);
    pub const MALTITOL: f64 = pac_from_molar_mass(molar_mass::MALTITOL);
    pub const SORBITOL: f64 = pac_from_molar_mass(molar_mass::SORBITOL);
    pub const XYLITOL: f64 = pac_from_molar_mass(molar_mass::XYLITOL);

    pub const ASPARTAME: f64 = pac_from_molar_mass(molar_mass::ASPARTAME);
    pub const CYCLAMATE: f64 = pac_from_molar_mass(molar_mass::CYCLAMATE);
    pub const SACCHARIN: f64 = pac_from_molar_mass(molar_mass::SACCHARIN);
    pub const SUCRALOSE: f64 = pac_from_molar_mass(molar_mass::SUCRALOSE);

    pub const SALT: f64 = pac_from_molar_mass(molar_mass::SALT);
    pub const ALCOHOL: f64 = pac_from_molar_mass(molar_mass::ALCOHOL);

    #[cfg(doc)]
    use crate::constants;

    /// PAC for typical salt content in milk solids non-fat (MSNF) and whey solids (WS)
    ///
    /// This value was reverse engineered from [`constants::fpd::FPD_CONST_FOR_MSNF_WS_SALTS`],
    /// calculated via [`get_pac_from_fpd_polynomial(...)`](crate::fpd::get_pac_from_fpd_polynomial)
    /// with argument [`constants::fpd::FPD_CONST_FOR_MSNF_WS_SALTS`] for the target FPD, and using
    /// the polynomial described by [`constants::fpd::PAC_TO_FPD_POLY_COEFFS`].
    pub const MSNF_WS_SALTS: f64 = 36.740_405_761_491_57;
}

/// Hardness Factor (HF) values for chocolate and nut ingredients
///
/// Used in the [Corvitto method](crate::docs#corvitto-method-hardness-factor) for calculating the
/// hardness of mixes containing chocolate and nut ingredients (Corvitto, 2005, p. 243)[^3].
#[doc = include_str!("../docs/bibs/3.md")]
pub mod hf {
    /// Hardness Factor for cacao butter; see [`ChocolateSpec`](crate::specs::ChocolateSpec).
    pub const CACAO_BUTTER: f64 = 0.9;

    /// Hardness Factor for cocoa solids; see [`ChocolateSpec`](crate::specs::ChocolateSpec).
    pub const COCOA_SOLIDS: f64 = 1.8;

    /// Hardness Factor for nut fat; see [`NutSpec`](crate::specs::NutSpec).
    pub const NUT_FAT: f64 = 1.4;
}

/// Standard composition values for various food components and ingredients
pub mod composition {
    /// Percentage milk solids non-fat (MSNF) typical of milk serum (Goff & Hartel, 2013, p.160)[^2]
    #[doc = include_str!("../docs/bibs/2.md")]
    pub const STD_MSNF_IN_MILK_SERUM: f64 = 0.09;

    /// Percentage of lactose typical of milk solids non-fat (MSNF) (Goff & Hartel, 2013, p.181)[^2]
    #[doc = include_str!("../docs/bibs/2.md")]
    pub const STD_LACTOSE_IN_MSNF: f64 = 0.545;

    /// Percentage of lactose typically found in whey solids (WS) (Goff & Hartel, 2013, p. 181)[^2]
    #[doc = include_str!("../docs/bibs/2.md")]
    pub const STD_LACTOSE_IN_WS: f64 = 0.765;

    /// Percentage of protein typical of milk solids non-fat (MSNF) (Goff & Hartel, 2013, p. 35)[^2]
    #[doc = include_str!("../docs/bibs/2.md")]
    pub const STD_PROTEIN_IN_MSNF: f64 = 0.35;

    /// Percentage of protein typically found in whey solids (WS) (Goff & Hartel, 2013, p. 35)[^2]
    #[doc = include_str!("../docs/bibs/2.md")]
    pub const STD_PROTEIN_IN_WS: f64 = 0.12;

    /// Percentage of saturated fats typical of milk fat (Board on Agriculture.., 1974, p. 203)[^12]
    #[doc = include_str!("../docs/bibs/12.md")]
    pub const STD_SATURATED_FAT_IN_MILK_FAT: f64 = 0.65;

    /// Percentage of trans fats typically found in milk fat (Milk, whole, 3.25% milkfat, with added
    /// Vitamin D, 2019)[^103]
    #[allow(clippy::doc_markdown)] // _FoodData_ false positive
    #[doc = include_str!("../docs/bibs/103.md")]
    pub const STD_TRANS_FAT_IN_MILK_FAT: f64 = 0.035;

    /// Percentage of saturated fats typical of egg fat (Board on Agriculture..., 1974, p. 203)[^12]
    #[doc = include_str!("../docs/bibs/12.md")]
    pub const STD_SATURATED_FAT_IN_EGG_FAT: f64 = 0.28;

    /// Percentage of saturated fats typical of nut fat; see [`NutSpec`](crate::specs::NutSpec).
    ///
    /// This value is an average compiled from the nutrient profiles of various nuts in the _USDA
    /// FoodData Central_ database (Nuts, almonds, 2019)[^102], (Nuts, pistachio nuts, raw,
    /// 2019)[^112], (Nuts, hazelnuts or filberts, 2019)[^113].
    #[allow(clippy::doc_markdown)] // _FoodData_ false positive
    #[doc = include_str!("../docs/bibs/102.md")]
    #[doc = include_str!("../docs/bibs/112.md")]
    #[doc = include_str!("../docs/bibs/113.md")]
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
    #[doc = include_str!("../docs/bibs/104.md")]
    #[doc = include_str!("../docs/bibs/105.md")]
    #[doc = include_str!("../docs/bibs/106.md")]
    #[doc = include_str!("../docs/bibs/107.md")]
    #[doc = include_str!("../docs/bibs/108.md")]
    #[doc = include_str!("../docs/bibs/109.md")]
    #[doc = include_str!("../docs/bibs/110.md")]
    #[doc = include_str!("../docs/bibs/111.md")]
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
}

/// Energy constants (kcal/g) for macronutrients and other components
///
/// _The data represent physiologically available energy, which is the energy value remaining after
/// digestive and urinary losses are deducted from gross energy._ ( U.S. Department of Agriculture,
/// 2013, p. 13)[^18] Energy values for major macronutrients are based on the Atwater system
/// (Merrill & Watt, 1973)[^32], and those for polyols, artificial sweeteners, and other ingredients
/// are based on various sources as noted.
#[doc = include_str!("../docs/bibs/18.md")]
#[doc = include_str!("../docs/bibs/32.md")]
pub mod energy {
    /// ( U.S. Department of Agriculture, 2013, p. 13)[^18]
    #[doc = include_str!("../docs/bibs/18.md")]
    pub const FATS: f64 = 9.0;
    /// Energy for digestible carbohydrates; fiber and polyols are not included.
    ///
    /// ( U.S. Department of Agriculture, 2013, p. 13)[^18]
    #[doc = include_str!("../docs/bibs/18.md")]
    pub const CARBOHYDRATES: f64 = 4.0;
    /// ( U.S. Department of Agriculture, 2013, p. 13)[^18]
    #[doc = include_str!("../docs/bibs/18.md")]
    pub const PROTEINS: f64 = 4.0;
    /// ( U.S. Department of Agriculture, 2013, p. 13)[^18]
    #[doc = include_str!("../docs/bibs/18.md")]
    pub const ALCOHOL: f64 = 6.93;

    /// (European Association of Polyols Producers, 2026, "Polyol Erythritol")[^19]
    #[doc = include_str!("../docs/bibs/19.md")]
    pub const ERYTHRITOL: f64 = 0.0;
    /// (European Association of Polyols Producers, 2026, "Polyol Maltitol")[^19]
    #[doc = include_str!("../docs/bibs/19.md")]
    pub const MALTITOL: f64 = 2.4;
    /// (European Association of Polyols Producers, 2026, "Polyol Sorbitol")[^19]
    #[doc = include_str!("../docs/bibs/19.md")]
    pub const SORBITOL: f64 = 0.0;
    /// (European Association of Polyols Producers, 2026, "Polyol Xylitol")[^19]
    #[doc = include_str!("../docs/bibs/19.md")]
    pub const XYLITOL: f64 = 2.4;

    /// (International Food Information Council Foundation, 2019, "What is aspartame?")[^21]
    #[doc = include_str!("../docs/bibs/21.md")]
    pub const ASPARTAME: f64 = 4.0;
    /// (Lawrence, 2003, "Cyclamates")[^32]
    #[doc = include_str!("../docs/bibs/32.md")]
    pub const CYCLAMATE: f64 = 0.0;
    /// (American Diabetes Association, 2014, "Saccharin")[^22]
    #[doc = include_str!("../docs/bibs/22.md")]
    pub const SACCHARIN: f64 = 0.0;
    /// (Schiffman, 2013, "Abstract")[^23]
    #[doc = include_str!("../docs/bibs/23.md")]
    pub const SUCRALOSE: f64 = 0.0;
    /// (Priscilla, 2018, "Metabolism of steviol glycosides")[^28]
    #[doc = include_str!("../docs/bibs/28.md")]
    pub const STEVIOSIDES: f64 = 0.0;
    /// (Murata, 2010, "Abstract")[^29]
    #[doc = include_str!("../docs/bibs/29.md")]
    pub const MOGROSIDES: f64 = 0.0;

    /// (Niness, 1999, "Inulin and Oligofructose: What Are They?")[^24]
    /// (Roberfoid, 1999, "Caloric Value of Inulin and Oligofructose")[^25]
    #[doc = include_str!("../docs/bibs/24.md")]
    #[doc = include_str!("../docs/bibs/25.md")]
    pub const INULIN_AND_OLIGOFRUCTOSE: f64 = 1.5;
}

/// Constants and utilities for density and conversions between volume and weight
pub mod density {
    /// Ratio to convert Alcohol by Volume (ABV) to Alcohol by Weight (ABW)
    ///
    /// _"Because of the miscibility of alcohol and water, the conversion factor is not constant but
    /// rather depends upon the concentration of alcohol."_ ("Alcohol by volume", 2025)[^8] However,
    /// for typical ice cream alcohol contents the approximation of 0.789 is sufficiently accurate.
    #[doc = include_str!("../docs/bibs/8.md")]
    pub const ABV_TO_ABW_RATIO: f64 = 0.789;

    /// Density (g/mL) of milk with 2% fat content
    ///
    /// _Milk, liquid, partially skimmed_ (Charrondiere et al., 2011, p. 2)[^14]
    #[doc = include_str!("../docs/bibs/14.md")]
    pub const MILK_2: f64 = 1.034;

    /// Density (g/mL) of milk with 3.5% fat content
    ///
    /// _Milk, liquid, whole_ (Charrondiere et al., 2011, p. 2)[^14]
    #[doc = include_str!("../docs/bibs/14.md")]
    pub const MILK_3_5: f64 = 1.03;

    /// Density (g/mL) of cream with 40% fat content
    ///
    /// _Cream, whipping (about 40% fat)_ (Charrondiere et al., 2011, p. 2)[^14]
    #[doc = include_str!("../docs/bibs/14.md")]
    pub const CREAM_40: f64 = 0.96;

    /// Convert dairy volume in milliliters to grams based on fat content percentage
    ///
    /// Interpolates density between known values for milk/cream of different fat contents;
    /// see [`MILK_2`], [`MILK_3_5`], and [`CREAM_40`].
    #[must_use]
    pub const fn dairy_milliliters_to_grams(ml: f64, fat_content: f64) -> f64 {
        let less_than_2 = MILK_2;
        let between_2_and_3_5 = ((MILK_3_5 - MILK_2) / (3.5 - 2.0) * (fat_content - 2.0)) + MILK_2;
        let between_3_5_and_40 = ((CREAM_40 - MILK_3_5) / (40.0 - 3.5) * (fat_content - 3.5)) + MILK_3_5;
        let more_than_40 = CREAM_40;

        match fat_content {
            0.0..=2.0 => ml * less_than_2,
            2.0..=3.5 => ml * between_2_and_3_5,
            3.5..=40.0 => ml * between_3_5_and_40,
            40.0.. => ml * more_than_40,
            _ => panic!("Invalid fat content"),
        }
    }

    /// Grams of sugar in one teaspoon (US) of granulated sugar (Anderson, 2010)[^31]
    #[doc = include_str!("../docs/bibs/31.md")]
    pub const GRAMS_IN_TEASPOON_OF_SUGAR: f64 = 4.2;
}

/// Constants and utilities for [Freezing Point Depression
/// (FPD)](crate::docs#freezing-point-depression) calculations
pub mod fpd {
    /// Typical target serving temperature (in °C) for ice cream (Raphaelson, 2016, Hardness)[^7]
    #[doc = include_str!("../docs/bibs/7.md")]
    pub const TARGET_SERVING_TEMP_14C: f64 = -14.0;

    /// Typical x-axis value ("hardness" or "frozen water") for the serving temperature of an ice
    /// cream mix in an FPD curve
    ///
    /// Corvitto (2005, p. 78)[^3] uses 70%, see [`CORVITTO_PAC_TO_SERVING_TEMP_TABLE`] for details.
    #[doc = include_str!("../docs/bibs/3.md")]
    pub const SERVING_TEMP_X_AXIS: usize = 75;

    /// PAC to FPD polynomial coefficients, a*x^2 + b*x + c => [a, b, c]
    ///
    /// _Polynominal equation with intercept through zero derived from regression model where g
    /// sucrose/100 g water is graphed against FPD °C._ (Goff & Hartel, 2013, Table 6.3.c, p.
    /// 186)[^2]
    #[doc = include_str!("../docs/bibs/2.md")]
    pub const PAC_TO_FPD_POLY_COEFFS: [f64; 3] = [-0.00009, -0.0612, 0.0];

    /// Freezing Point Depression (FPD) constant (°C) for salts contained in MSNF and WS
    ///
    /// _The freezing point depression for salts (°C) contained in MSNF and WS, ... based on the
    /// average molecular weight and concentration of salts present in milk._ (Goff & Hartel, 2013,
    /// p.183)[^2]
    #[doc = include_str!("../docs/bibs/2.md")]
    pub const FPD_CONST_FOR_MSNF_WS_SALTS: f64 = -2.37;

    /// PAC to FPD lookup table
    ///
    /// Table of empirical measurements, referenced from  _Freezing point depression (°C) below 0°C
    /// of sucrose solutions (g/100g water)_ (Goff & Hartel, 2013, Table 6.1, p. 182)[^2]
    #[doc = include_str!("../docs/bibs/2.md")]
    pub const PAC_TO_FPD_TABLE: [(usize, f64); 61] = [
        // (g Sucrose/100g water, FPD (°C))
        (0, 0.00),
        (3, 0.18),
        (6, 0.35),
        (9, 0.53),
        (12, 0.72),
        (15, 0.90),
        (18, 1.10),
        (21, 1.29),
        (24, 1.47),
        (27, 1.67),
        (30, 1.86),
        (33, 2.03),
        (36, 2.21),
        (39, 2.40),
        (42, 2.60),
        (45, 2.78),
        (48, 2.99),
        (51, 3.20),
        (54, 3.42),
        (57, 3.63),
        (60, 3.85),
        (63, 4.10),
        (66, 4.33),
        (69, 4.54),
        (72, 4.77),
        (75, 5.00),
        (78, 5.26),
        (81, 5.53),
        (84, 5.77),
        (87, 5.99),
        (90, 6.23),
        (93, 6.50),
        (96, 6.80),
        (99, 7.04),
        (102, 7.32),
        (105, 7.56),
        (108, 7.80),
        (111, 8.04),
        (114, 8.33),
        (117, 8.62),
        (120, 8.92),
        (123, 9.19),
        (126, 9.45),
        (129, 9.71),
        (132, 9.96),
        (135, 10.22),
        (138, 10.47),
        (141, 10.72),
        (144, 10.97),
        (147, 11.19),
        (150, 11.41),
        (153, 11.63),
        (156, 11.88),
        (159, 12.14),
        (162, 12.40),
        (165, 12.67),
        (168, 12.88),
        (171, 13.08),
        (174, 13.28),
        (177, 13.48),
        (180, 13.68),
    ];

    /// Reference table for Corvitto PAC to serving temperature (Corvitto, 2005, p. 78)[^3]
    ///
    /// For most standard ice cream mixes this roughly matches the FPD at ~70% frozen water
    /// calculated using the Goff & Hartel method (2013, p. 181)[^2] with
    /// [`PAC_TO_FPD_POLY_COEFFS`], adjusting [`PAC::sugars`](crate::composition::PAC::sugars) to
    /// match the PAC in this table, but ignoring the contributions to FPD by salts present in
    /// MSNF and WS - Corvitto seems to have ignored these.
    #[doc = include_str!("../docs/bibs/2.md")]
    #[doc = include_str!("../docs/bibs/3.md")]
    pub const CORVITTO_PAC_TO_SERVING_TEMP_TABLE: [(f64, f64); 9] = [
        // (pac, serving_temp)
        (25.0, -10.0),
        (27.0, -11.0),
        (29.0, -12.0),
        (31.0, -13.0),
        (33.0, -14.0),
        (35.0, -15.0),
        (37.0, -16.0),
        (39.0, -17.0),
        (41.0, -18.0),
    ];
}

/// Epsilon value for floating point comparisons of compositions, e.g. water content
pub const COMPOSITION_EPSILON: f64 = 1e-10;

#[cfg(test)]
#[cfg_attr(coverage, coverage(off))]
#[allow(clippy::float_cmp)]
mod tests {

    use crate::tests::asserts::shadow_asserts::assert_eq;
    use crate::tests::asserts::*;

    use super::*;

    #[test]
    fn pac_from_molar_mass() {
        assert_eq!(molar_mass::pac_from_molar_mass(molar_mass::GLUCOSE), 190.0);
        assert_eq!(molar_mass::pac_from_molar_mass(molar_mass::FRUCTOSE), 190.0);
        assert_eq!(molar_mass::pac_from_molar_mass(molar_mass::GALACTOSE), 190.0);
        assert_eq!(molar_mass::pac_from_molar_mass(molar_mass::SUCROSE), 100.0);
        assert_eq!(molar_mass::pac_from_molar_mass(molar_mass::LACTOSE), 100.0);
        assert_eq!(molar_mass::pac_from_molar_mass(molar_mass::MALTOSE), 100.0);
        assert_eq!(molar_mass::pac_from_molar_mass(molar_mass::TREHALOSE), 100.0);

        assert_eq!(molar_mass::pac_from_molar_mass(molar_mass::ERYTHRITOL), 280.0);
        assert_eq!(molar_mass::pac_from_molar_mass(molar_mass::MALTITOL), 99.0);
        assert_eq!(molar_mass::pac_from_molar_mass(molar_mass::SORBITOL), 187.0);
        assert_eq!(molar_mass::pac_from_molar_mass(molar_mass::XYLITOL), 224.0);

        assert_eq!(molar_mass::pac_from_molar_mass(molar_mass::ASPARTAME), 116.0);
        assert_eq!(molar_mass::pac_from_molar_mass(molar_mass::CYCLAMATE), 170.0);
        assert_eq!(molar_mass::pac_from_molar_mass(molar_mass::SACCHARIN), 186.0);
        assert_eq!(molar_mass::pac_from_molar_mass(molar_mass::SUCRALOSE), 86.0);

        assert_eq!(molar_mass::pac_from_molar_mass(molar_mass::SALT), 585.0);
        assert_eq!(molar_mass::pac_from_molar_mass(molar_mass::ALCOHOL), 743.0);
    }

    #[test]
    fn cocoa_constants() {
        assert_eq!(
            composition::cacao::STD_PROTEIN_IN_COCOA_SOLIDS
                + composition::cacao::STD_CARBOHYDRATES_IN_COCOA_SOLIDS
                + composition::cacao::STD_ASH_IN_COCOA_SOLIDS,
            1.0
        );

        assert_lt!(
            composition::cacao::STD_FIBER_IN_COCOA_SOLIDS,
            composition::cacao::STD_CARBOHYDRATES_IN_COCOA_SOLIDS
        );
    }

    #[test]
    fn dairy_milliliters_to_grams() {
        let expected_conversions = [
            (0.0, 1.034),
            (2.0, 1.034),
            (3.0, 1.0313_333),
            (3.5, 1.03),
            (5.0, 1.0271_233),
            (35.0, 0.969_589),
            (40.0, 0.96),
            (50.0, 0.96),
        ];

        for (fat_content, expected_density) in expected_conversions {
            let grams = density::dairy_milliliters_to_grams(100.0, fat_content);
            let expected_grams = 100.0 * expected_density;
            assert_eq_flt_test!(grams, expected_grams);
        }
    }
}

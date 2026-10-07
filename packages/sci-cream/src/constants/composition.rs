//! Standard composition values for various food components and ingredients

/// Standard composition values for dairy products, including milk/cream, powders, proteins, etc.
///
/// The `_IN_MSNF` constants are corroborated by averages compiled from the nutrient profiles of
/// these milks, evaporated milks, and milk powders in the
/// [USDA FoodData Central](https://fdc.nal.usda.gov/) database:
///
/// - (USDA, 2019, "Milk, nonfat, fluid, with added vitamin ... (fat free or skim)")[^530]
/// - (USDA, 2019, "Milk, reduced fat, fluid, 2% milkfat, with added vitamin ...")[^531]
/// - (USDA, 2019, "Milk, whole, 3.25% milkfat, with added vitamin ...")[^503]
/// - (USDA, 2019, "Milk, canned, evaporated, nonfat, with added vitamin ...")[^532]
/// - (USDA, 2019, "Milk, canned, evaporated, with added vitamin ... and without added ...")[^533]
/// - (USDA, 2019, "Milk, dry, nonfat, regular, without added vitamin ...")[^534]
/// - (USDA, 2019, "Milk, dry, whole, without added vitamin ...")[^535]
///
/// The creams and sweetened condensed milk scatter more widely, e.g. 32.0-41.7% protein, so they
/// are left out, as is the 2% evaporated milk, which FNDDS calculates from the nonfat one.
///
/// **Note:** The calculated values under the `_IN_MSNF` constants are fractions of the MSNF of each
/// listing, which is itself calculated as `100 - water - fat`. This should match the sum of the
/// listing's sugars, protein, and ash, but that is not always the case, e.g. skim milk's calculated
/// MSNF of 9.12g differs from the 9.25g sum of those, a ~1.4% discrepancy. The listings'
/// discrepancies range from 0% to ~2.1%.
#[doc = include_str!("../../docs/references/index/503.md")]
#[doc = include_str!("../../docs/references/index/530.md")]
#[doc = include_str!("../../docs/references/index/531.md")]
#[doc = include_str!("../../docs/references/index/532.md")]
#[doc = include_str!("../../docs/references/index/533.md")]
#[doc = include_str!("../../docs/references/index/534.md")]
#[doc = include_str!("../../docs/references/index/535.md")]
pub mod dairy {
    use crate::specs::SolidsSource;
    use {
        casein::{STD_LACTOSE_IN_CASEIN, STD_MINERALS_IN_CASEIN},
        whey::{
            STD_LACTOSE_IN_WPI, STD_LACTOSE_IN_WS, STD_MINERALS_IN_WPI, STD_MINERALS_IN_WS, STD_PROTEIN_IN_WPI,
            STD_PROTEIN_IN_WS,
        },
    };

    /// Percentage milk solids non-fat (MSNF) typical of milk serum
    ///
    /// (Goff & Hartel, 2013, p. 160)[^2]
    #[doc = include_str!("../../docs/references/index/2.md")]
    pub const STD_MSNF_IN_MILK_SERUM: f64 = 0.09;

    /// Percentage of lactose typical of milk solids non-fat (MSNF)
    ///
    /// (Goff & Hartel, 2013, p. 181)[^2],
    /// (Goff, n.d., "16. Ice Cream Mix General Composition")[^90]
    ///
    /// The sourced value agrees with the 54.8% average of the [USDA listings](self).
    /// Calculated values are (%): 55.4, 54.3, 55.3, 55.9, 54.2, 54.1, 54.2
    #[doc = include_str!("../../docs/references/index/2.md")]
    #[doc = include_str!("../../docs/references/index/90.md")]
    pub const STD_LACTOSE_IN_MSNF: f64 = 0.545;

    /// Percentage of protein typical of milk solids non-fat (MSNF)
    ///
    /// Calculated as the remainder of 100% - [`STD_LACTOSE_IN_MSNF`] - [`STD_MINERALS_IN_MSNF`].
    ///
    /// This is in line with the ~37% average (~35-37.5% range) of the milks, creams, and milk
    /// powders in Goff & Hartel's Table 3.2 (Goff & Hartel, 2025, p. 48)[^20], the text's slightly
    /// lower range 34-36% (Goff & Hartel, 2025, p. 34)[^20], the Guelph e-Book's 38% (Goff, n.d.,
    /// "16. Ice Cream Mix General Composition")[^90], and the 37.3% average of the [USDA
    /// listings](self).
    ///
    /// Calculated USDA values are (%): 37.6, 37.3, 37.6, 37.0, 36.9, 37.7, 37.1
    #[doc = include_str!("../../docs/references/index/20.md")]
    #[doc = include_str!("../../docs/references/index/90.md")]
    pub const STD_PROTEIN_IN_MSNF: f64 = 1.0 - STD_LACTOSE_IN_MSNF - STD_MINERALS_IN_MSNF;

    /// Percentage of minerals (ash) typical of milk solids non-fat (MSNF)
    ///
    /// Taken as 8% on a dry weight basis (Goff, n.d., "16. Ice Cream Mix General
    /// Composition")[^90]. This is in line with the 7.7% of Goff & Hartel's bulk milk, calculated
    /// from 700 mg/100 mL of ash at 8.8 wt.% non-fat solids and 1.032 kg/L density (Goff & Hartel,
    /// 2025, Tables 3.2-3.3, pp. 48-49)[^20].
    ///
    /// The sourced value agrees with the 8.4% average of the [USDA listings](self).
    /// Calculated values are (%): 8.4, 8.3, 9.2, 7.4, 8.4, 8.3, 8.6
    #[doc = include_str!("../../docs/references/index/90.md")]
    #[doc = include_str!("../../docs/references/index/20.md")]
    pub const STD_MINERALS_IN_MSNF: f64 = 0.08;

    /// Standard composition values for whey solids (WS): sweet whey, concentrates, and isolates
    ///
    /// The `_IN_WS` constants are corroborated by averages compiled from the nutrient profiles of
    /// these _sweet_ whey listings in the
    /// [USDA FoodData Central](https://fdc.nal.usda.gov/) database:
    ///
    /// - (USDA, 2019, "Whey, sweet, dried")[^536]
    /// - (USDA, 2019, "Whey, sweet, fluid")[^537]
    ///
    /// The acid wheys are left out of the analysis, since they have different compositions with
    /// higher minerals (de Wit, 2001, p. 15)[^92], and this model explicitly targets only sweet
    /// whey, as noted below. The FNDDS sweet dry whey listing, which repeats the SR Legacy
    /// values, is also excluded.
    ///
    /// **Note:** The constants, and therefore the model, are based on sweet whey only, which most
    /// whey products on the market are derived from (de Wit, 2001, p. 10)[^92], and which is the
    /// whey most commonly used in ice cream (USDEC, 2003, p. 156)[^91], (Goff & Hartel, 2025,
    /// p. 21)[^20]. Acid whey's use in frozen desserts is limited to acid-flavored sherbets and
    /// sorbets (USDEC, 2003, p. 156)[^91], (ADPI, 2023, p. 5)[^93].
    ///
    /// **Note:** The calculated values under the `_IN_WS` constants are fractions of the WS of each
    /// listing, which is itself calculated as `100 - water - fat`. This matches the sum of each
    /// listing's sugars, protein, and ash to within ~0.3%.
    ///
    /// Concentrates and isolates hold less lactose and minerals, as ultrafiltration removes them
    /// with the permeate (Goff & Hartel, 2025, p. 60)[^20]. Both fall from the sweet whey constants
    /// (`_IN_WS`) to the isolate ones (`_IN_WPI`), and [`lactose_in_snf`] and [`minerals_in_snf`]
    /// take each as linear in the protein fraction between the two.
    ///
    /// The lactose, protein, and minerals account for 98% of the solids in sweet whey, rising
    /// linearly to 99.9% in isolates. The gap is expected, as whey's total solids are not often
    /// equivalent to the sum of its separately determined constituents (de Wit, 2001, p. 15)[^92].
    /// Sources that give lactose as the carbohydrates by difference count the gap in it too, so
    /// they run higher than the lactose constants. The gap, [`unaccounted_in_snf`], counts with the
    /// minerals, under other milk solids, in the dairy [specs](crate::specs).
    #[doc = include_str!("../../docs/references/index/20.md")]
    #[doc = include_str!("../../docs/references/index/91.md")]
    #[doc = include_str!("../../docs/references/index/92.md")]
    #[doc = include_str!("../../docs/references/index/93.md")]
    #[doc = include_str!("../../docs/references/index/536.md")]
    #[doc = include_str!("../../docs/references/index/537.md")]
    pub mod whey {
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
        #[doc = include_str!("../../docs/references/index/2.md")]
        #[doc = include_str!("../../docs/references/index/20.md")]
        #[doc = include_str!("../../docs/references/index/92.md")]
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
        #[doc = include_str!("../../docs/references/index/20.md")]
        #[doc = include_str!("../../docs/references/index/91.md")]
        #[doc = include_str!("../../docs/references/index/92.md")]
        #[doc = include_str!("../../docs/references/index/93.md")]
        pub const STD_PROTEIN_IN_WS: f64 = 0.13;

        /// Percentage of minerals (ash) typical of sweet whey solids (WS)
        ///
        /// Taken as 8.5%, in line with the 8.2-8.7% of de Wit's sweet wheys (de Wit, 2001, Table 1,
        /// p. 14)[^92] and the 8.4% average of the [USDA listings](self). Spec sheets run slightly
        /// higher: the 8.2-8.8% of sweet whey powder (USDEC, 2003, p. 28)[^91] and the 8-9% of
        /// de Wit's spec (de Wit, 2001, p. 81)[^92] are ~9.0% of WS at their midpoints.
        ///
        /// Calculated values are (%): 8.7, 8.1
        #[doc = include_str!("../../docs/references/index/91.md")]
        #[doc = include_str!("../../docs/references/index/92.md")]
        pub const STD_MINERALS_IN_WS: f64 = 0.085;

        /// Percentage of lactose typical of whey protein isolate (WPI) solids
        ///
        /// Taken as 0.8%, in line with the typical 0.5-1.0% of WPI powder (USDEC, 2003,
        /// p. 33)[^91], (ADPI, 2023)[^95], ~0.8% of the solids at the midpoint, a typical
        /// WPI's 0.5% (Kuntz, 2010)[^94], and Hilmar 9000's 1.0% (Hilmar Ingredients, 2026)[^538].
        /// The WPI profile (USDEC, 2003, Table 6, pp. 51-52)[^91] has a higher ~0.9%, as its
        /// lactose is the carbohydrates by difference.
        ///
        /// The [line](super::lactose_in_snf) from [`STD_LACTOSE_IN_WS`] to this fits USDEC's WPC 34
        /// and WPC 80 within ~0.9 percentage points.
        #[doc = include_str!("../../docs/references/index/91.md")]
        #[doc = include_str!("../../docs/references/index/94.md")]
        #[doc = include_str!("../../docs/references/index/95.md")]
        #[doc = include_str!("../../docs/references/index/538.md")]
        pub const STD_LACTOSE_IN_WPI: f64 = 0.008;

        /// Percentage of protein typical of whey protein isolate (WPI) solids
        ///
        /// Calculated from the 90.75g of protein in 95.0g of solids of the WPI profile (USDEC,
        /// 2003, Table 6, pp. 51-52)[^91], in line with the typical 90.0-92.0% of WPI powder
        /// (USDEC, 2003, p. 33)[^91], a typical WPI's 92.0% (Kuntz, 2010)[^94], and Hilmar 9000's
        /// 89.0% (Hilmar Ingredients, 2026)[^538], ~93.7-97.4% of the solids. ADPI gives USDEC's
        /// typical range on a dry basis (ADPI, 2023)[^95], ~90.7-92.7% of the solids, but only the
        /// as-is reading adds up with its other typical values.
        #[doc = include_str!("../../docs/references/index/91.md")]
        #[doc = include_str!("../../docs/references/index/94.md")]
        #[doc = include_str!("../../docs/references/index/95.md")]
        #[doc = include_str!("../../docs/references/index/538.md")]
        pub const STD_PROTEIN_IN_WPI: f64 = 0.955;

        /// Percentage of minerals (ash) typical of whey protein isolate (WPI) solids
        ///
        /// Calculated from the 3.38g of ash in 95.0g of solids of the WPI profile (USDEC, 2003,
        /// Table 6, pp. 51-52)[^91]. Typical isolates run lower, ~2.1-3.2% of the solids: the
        /// 2.0-3.0% of WPI powder (USDEC, 2003, p. 33)[^91], (ADPI, 2023)[^95], a typical WPI's
        /// 2.0% (Kuntz, 2010)[^94], and Hilmar 9000's 2.5% (Hilmar Ingredients, 2026)[^538], whose
        /// 3.5% maximum is ~3.7% of the solids.
        ///
        /// The [line](super::minerals_in_snf) from [`STD_MINERALS_IN_WS`] to this fits USDA's sweet
        /// whey and USDEC's WPC 34, WPC 80, and WPI within ~0.5 percentage points. The line would
        /// miss WPC 80 by ~1.5 pp if using the lower typical values for isolates.
        #[doc = include_str!("../../docs/references/index/91.md")]
        #[doc = include_str!("../../docs/references/index/94.md")]
        #[doc = include_str!("../../docs/references/index/95.md")]
        #[doc = include_str!("../../docs/references/index/538.md")]
        pub const STD_MINERALS_IN_WPI: f64 = 0.036;
    }

    /// Standard composition values for casein solids (CS)
    pub mod casein {
        /// Percentage of lactose typical of casein solids (CS)
        ///
        /// Taken as 0.1%, the lactose of acid and rennet casein and of sodium and calcium caseinate
        /// (Southward, n.d., Table 1, p. 8)[^96], ~0.1% of their solids.
        #[doc = include_str!("../../docs/references/index/96.md")]
        pub const STD_LACTOSE_IN_CASEIN: f64 = 0.001;

        /// Percentage of minerals typical of casein solids (CS)
        //
        // 10% guess, @todo find a reference for this value
        pub const STD_MINERALS_IN_CASEIN: f64 = 0.1;
    }

    /// Estimate the lactose fraction of `source`'s solids non-fat from their protein fraction.
    ///
    /// Evaluates the line [`lactose_in_snf_coeffs`] (`a + b × protein_in_snf`).
    ///
    /// This is a pure evaluation and does not validate its inputs.
    #[must_use]
    pub const fn lactose_in_snf(protein_in_snf: f64, source: SolidsSource) -> f64 {
        let [a, b] = lactose_in_snf_coeffs(source);
        a + b * protein_in_snf
    }

    /// Get coefficients `[a, b]` of the line `a + b × protein_in_snf` for the lactose fraction of
    /// `source`'s solids non-fat - constant for milk and casein, linear for whey.
    ///
    /// Milk and casein solids hold fixed fractions, [`STD_LACTOSE_IN_MSNF`] and
    /// [`casein::STD_LACTOSE_IN_CASEIN`], so their `b` is 0. Whey's falls as the protein is
    /// concentrated, along the line from [`whey::STD_LACTOSE_IN_WS`] at
    /// [`whey::STD_PROTEIN_IN_WS`] protein in sweet whey to [`whey::STD_LACTOSE_IN_WPI`]
    /// at [`whey::STD_PROTEIN_IN_WPI`] in isolates.
    ///
    /// See [`lactose_in_snf`] for a function doing the computation with these coefficients.
    #[must_use]
    pub const fn lactose_in_snf_coeffs(source: SolidsSource) -> [f64; 2] {
        match source {
            SolidsSource::Milk => [STD_LACTOSE_IN_MSNF, 0.0],
            SolidsSource::Whey => {
                let slope = (STD_LACTOSE_IN_WPI - STD_LACTOSE_IN_WS) / (STD_PROTEIN_IN_WPI - STD_PROTEIN_IN_WS);
                [STD_LACTOSE_IN_WS - slope * STD_PROTEIN_IN_WS, slope]
            }
            SolidsSource::Casein => [STD_LACTOSE_IN_CASEIN, 0.0],
        }
    }

    /// Estimate the minerals fraction of `source`'s solids non-fat from their protein fraction.
    ///
    /// Evaluates the line [`minerals_in_snf_coeffs`] (`a + b × protein_in_snf`).
    ///
    /// This is a pure evaluation and does not validate its inputs.
    #[must_use]
    pub const fn minerals_in_snf(protein_in_snf: f64, source: SolidsSource) -> f64 {
        let [a, b] = minerals_in_snf_coeffs(source);
        a + b * protein_in_snf
    }

    /// Get coefficients `[a, b]` of the line `a + b × protein_in_snf` for the minerals fraction of
    /// `source`'s solids non-fat - constant for milk and casein, linear for whey.
    ///
    /// Milk and casein solids hold fixed fractions, [`STD_MINERALS_IN_MSNF`] and
    /// [`casein::STD_MINERALS_IN_CASEIN`], so their `b` is 0. Whey's falls as the protein is
    /// concentrated, along the line from [`whey::STD_MINERALS_IN_WS`] at
    /// [`whey::STD_PROTEIN_IN_WS`] protein in sweet whey to [`whey::STD_MINERALS_IN_WPI`]
    /// at [`whey::STD_PROTEIN_IN_WPI`] in isolates.
    ///
    /// See [`minerals_in_snf`] for a function doing the computation with these coefficients.
    #[must_use]
    pub const fn minerals_in_snf_coeffs(source: SolidsSource) -> [f64; 2] {
        match source {
            SolidsSource::Milk => [STD_MINERALS_IN_MSNF, 0.0],
            SolidsSource::Whey => {
                let slope = (STD_MINERALS_IN_WPI - STD_MINERALS_IN_WS) / (STD_PROTEIN_IN_WPI - STD_PROTEIN_IN_WS);
                [STD_MINERALS_IN_WS - slope * STD_PROTEIN_IN_WS, slope]
            }
            SolidsSource::Casein => [STD_MINERALS_IN_CASEIN, 0.0],
        }
    }

    /// Estimate the unaccounted fraction of `source`'s solids non-fat from their protein fraction.
    ///
    /// Evaluates the line [`unaccounted_in_snf_coeffs`] (`a + b × protein_in_snf`).
    ///
    /// This is a pure evaluation and does not validate its inputs.
    #[must_use]
    pub const fn unaccounted_in_snf(protein_in_snf: f64, source: SolidsSource) -> f64 {
        let [a, b] = unaccounted_in_snf_coeffs(source);
        a + b * protein_in_snf
    }

    /// Get coefficients `[a, b]` of the line `a + b × protein_in_snf` for the unaccounted fraction
    /// of `source`'s solids non-fat - zero for milk and casein, linear for whey.
    ///
    /// The unaccounted solids are what the protein, lactose, and minerals leave. Milk and casein
    /// solids are modeled as wholly those, so their `a` and `b` are 0. Whey's is what its protein
    /// and the [`lactose_in_snf`] and [`minerals_in_snf`] lines leave, falling from 2% in sweet
    /// whey to 0.1% in isolates, see the [`whey`] module.
    ///
    /// See [`unaccounted_in_snf`] for a function doing the computation with these coefficients.
    #[must_use]
    pub const fn unaccounted_in_snf_coeffs(source: SolidsSource) -> [f64; 2] {
        match source {
            SolidsSource::Milk | SolidsSource::Casein => [0.0, 0.0],
            SolidsSource::Whey => {
                // `1 - protein - lactose - minerals`, lactose and minerals each `a + b × protein`
                let [lactose_a, lactose_b] = lactose_in_snf_coeffs(source);
                let [minerals_a, minerals_b] = minerals_in_snf_coeffs(source);
                [1.0 - lactose_a - minerals_a, -1.0 - lactose_b - minerals_b]
            }
        }
    }

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
    /// PantryLot)[^520], (MMPA - Grade A Whole Milk Powder 26%, 2026, BulkMart)[^521]
    #[expect(clippy::doc_markdown)] // _PantryLot_  and _BulkMart_ false positives
    #[doc = include_str!("../../docs/references/index/20.md")]
    #[doc = include_str!("../../docs/references/index/520.md")]
    #[doc = include_str!("../../docs/references/index/521.md")]
    pub const STD_BUTTERFAT_IN_WHOLE_MILK_POWDER: f64 = 0.26;

    /// Percentage of saturated fats typical of milk fat (Board on Agriculture.., 1974, p. 203)[^12]
    #[doc = include_str!("../../docs/references/index/12.md")]
    pub const STD_SATURATED_FAT_IN_MILK_FAT: f64 = 0.65;

    /// Percentage of trans fats typically found in milk fat
    ///
    /// (USDA, 2019, "Milk, whole, 3.25% milkfat, with added vitamin D")[^503]
    #[expect(clippy::doc_markdown)] // _FoodData_ false positive
    #[doc = include_str!("../../docs/references/index/503.md")]
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
    /// (Clarke, 2004, p. 49)[^4], (Goff & Hartel, 2025, p. 48)[^20], (USDA, 2019,
    /// "Eggs, Grade A, Large, egg yolk")[^500].
    #[expect(clippy::doc_markdown)] // _FoodData_ false positive
    #[doc = include_str!("../../docs/references/index/4.md")]
    #[doc = include_str!("../../docs/references/index/20.md")]
    #[doc = include_str!("../../docs/references/index/500.md")]
    pub const STD_PROTEIN_IN_EGG_YOLK: f64 = 0.16;

    /// Percentage of protein typically found in egg white
    ///
    /// (USDA, 2019, "Eggs, Grade A, Large, egg white")[^518]
    #[expect(clippy::doc_markdown)] // _FoodData_ false positive
    #[doc = include_str!("../../docs/references/index/518.md")]
    pub const STD_PROTEIN_IN_EGG_WHITE: f64 = 0.11;

    /// Percentage of solids typically found in egg yolk
    ///
    /// Sources list the total solids content of egg yolks to be between 48-51% by weight; 50% is a
    /// reasonable average of these values (Clarke, 2004, p. 49)[^4], (Goff & Hartel, 2025, p.
    /// 48)[^20], (USDA, 2019, "Eggs, Grade A, Large, egg yolk")[^500].
    #[expect(clippy::doc_markdown)] // _FoodData_ false positive
    #[doc = include_str!("../../docs/references/index/4.md")]
    #[doc = include_str!("../../docs/references/index/20.md")]
    #[doc = include_str!("../../docs/references/index/500.md")]
    pub const STD_SOLIDS_IN_EGG_YOLK: f64 = 0.50;

    /// Percentage of solids typically found in egg white
    ///
    /// (USDA, 2019, "Eggs, Grade A, Large, egg white")[^518]
    #[expect(clippy::doc_markdown)] // _FoodData_ false positive
    #[doc = include_str!("../../docs/references/index/518.md")]
    pub const STD_SOLIDS_IN_EGG_WHITE: f64 = 0.14;

    /// Percentage of protein typically found in egg yolk solids
    ///
    /// Sources list the protein content of egg yolk solids to be between 30.9-33.75% by weight; 32%
    /// is a reasonable average of these values (Clarke, 2004, p. 49)[^4], (Goff & Hartel, 2025, p.
    /// 48)[^20], (USDA, 2019, "Eggs, Grade A, Large, egg yolk")[^500].
    ///
    /// Consistent with [`STD_PROTEIN_IN_EGG_YOLK`] / [`STD_SOLIDS_IN_EGG_YOLK`].
    #[expect(clippy::doc_markdown)] // _FoodData_ false positive
    #[doc = include_str!("../../docs/references/index/4.md")]
    #[doc = include_str!("../../docs/references/index/20.md")]
    #[doc = include_str!("../../docs/references/index/500.md")]
    pub const STD_PROTEIN_IN_EGG_YOLK_SOLIDS: f64 = 0.32;

    /// Percentage of protein typically found in egg white solids
    ///
    /// (USDA, 2019, "Eggs, Grade A, Large, egg white")[^518]
    ///
    /// Consistent-ish with [`STD_PROTEIN_IN_EGG_WHITE`] / [`STD_SOLIDS_IN_EGG_WHITE`].
    #[expect(clippy::doc_markdown)] // _FoodData_ false positive
    #[doc = include_str!("../../docs/references/index/518.md")]
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
    /// al., 2023, 1. Introduction)[^69], (Palacios, et al., 2020)[^70], (USDA, 2019,
    /// "Eggs, Grade A, Large, egg yolk")[^500]
    #[expect(clippy::doc_markdown)] // _FoodData_ false positive
    #[doc = include_str!("../../docs/references/index/4.md")]
    #[doc = include_str!("../../docs/references/index/20.md")]
    #[doc = include_str!("../../docs/references/index/68.md")]
    #[doc = include_str!("../../docs/references/index/69.md")]
    #[doc = include_str!("../../docs/references/index/70.md")]
    #[doc = include_str!("../../docs/references/index/500.md")]
    pub const STD_LECITHIN_IN_EGG_YOLK_SOLIDS: f64 = 0.19;
}

/// Standard composition values for nuts, e.g. almonds, hazelnuts, etc.
pub mod nut {
    /// Percentage of saturated fats typical of nut fat; see [`NutSpec`](crate::specs::NutSpec).
    ///
    /// This value is an average compiled from the nutrient profiles of various nuts in the _USDA
    /// FoodData Central_ database (USDA, 2019, "Nuts, almonds")[^502], (USDA, 2019, "Nuts,
    /// pistachio nuts, raw")[^512], (USDA, 2019, "Nuts, hazelnuts or filberts")[^513].
    #[doc = include_str!("../../docs/references/index/502.md")]
    #[doc = include_str!("../../docs/references/index/512.md")]
    #[doc = include_str!("../../docs/references/index/513.md")]
    pub const STD_SATURATED_FAT_IN_NUT_FAT: f64 = 0.09;
}

/// Standard composition values for cacao products, notably cocoa solids; see the [chocolate
/// documentation](crate::docs#chocolate) for more details about the components of chocolate.
///
/// These values are averages compiled from the nutrient profiles of various cacao products in the
/// [USDA FoodData Central](https://fdc.nal.usda.gov/) database:
///
/// - (USDA, 2019, "Chocolate, dark, 45-59% cacao solids")[^527]
/// - (USDA, 2019, "Chocolate, dark, 60-69% cacao solids")[^504]
/// - (USDA, 2019, "Chocolate, dark, 70-85% cacao solids")[^505]
/// - (USDA, 2019, "Cocoa, dry powder, unsweetened")[^506]
/// - (USDA, 2019, "Cocoa, dry powder, unsweetened, processed with alkali")[^528]
/// - (USDA, 2019, "Cocoa, dry powder, hi-fat or breakfast, processed with alkali")[^529]
///
/// The values are very consistent between the different cacao products, usually all within ~4
/// percentage points of each other (fiber was the only exception, varying between 33% and 46%).
///
/// The values are also consistent with the nutrition facts tables of various market cacao products:
///
/// - (Lindt 70% Cacao Dark Chocolate, 2025)[^507]
/// - (Lindt 85% Cacao Dark Chocolate, 2025)[^508]
/// - (Lindt 95% Cacao Dark Chocolate, 2025)[^509]
/// - (Lindt 100% Cacao Dark Chocolate, 2025)[^510]
/// - (Ghirardelli 100% Unsweetened Cocoa Powder, 2025)[^511]
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
#[doc = include_str!("../../docs/references/index/504.md")]
#[doc = include_str!("../../docs/references/index/505.md")]
#[doc = include_str!("../../docs/references/index/506.md")]
#[doc = include_str!("../../docs/references/index/507.md")]
#[doc = include_str!("../../docs/references/index/508.md")]
#[doc = include_str!("../../docs/references/index/509.md")]
#[doc = include_str!("../../docs/references/index/510.md")]
#[doc = include_str!("../../docs/references/index/511.md")]
#[doc = include_str!("../../docs/references/index/527.md")]
#[doc = include_str!("../../docs/references/index/528.md")]
#[doc = include_str!("../../docs/references/index/529.md")]
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
    /// - (USDA, 2019, "Cocoa, dry powder, unsweetened")[^506]
    /// - (USDA, 2019, "Cocoa, dry powder, unsweetened, processed with alkali")[^528]
    /// - (USDA, 2019, "Cocoa, dry powder, hi-fat or breakfast, processed with alkali")[^529]
    ///
    /// The EU caps cocoa powder at 9% water (Directive 2000/36/EC, 2000, Annex I 2.(a))[^84].
    #[doc = include_str!("../../docs/references/index/84.md")]
    #[doc = include_str!("../../docs/references/index/506.md")]
    #[doc = include_str!("../../docs/references/index/528.md")]
    #[doc = include_str!("../../docs/references/index/529.md")]
    pub const STD_WATER_IN_COCOA_POWDER: f64 = 0.03;

    /// Water content of chocolate, as a percentage of the product as a whole
    ///
    /// This is a rough average of the water content of several chocolate products:
    ///
    /// - (USDA, 2019, "Chocolate, dark, 45-59% cacao solids")[^527]
    /// - (USDA, 2019, "Chocolate, dark, 60-69% cacao solids")[^504]
    /// - (USDA, 2019, "Chocolate, dark, 70-85% cacao solids")[^505]
    #[doc = include_str!("../../docs/references/index/504.md")]
    #[doc = include_str!("../../docs/references/index/505.md")]
    #[doc = include_str!("../../docs/references/index/527.md")]
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
    /// dry powder, unsweetened")[^506], (USDA, 2019, "... processed with alkali")[^528]. Alkali
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
    #[doc = include_str!("../../docs/references/index/506.md")]
    #[doc = include_str!("../../docs/references/index/528.md")]
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
    use crate::specs::SolidsSource;

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

    #[test]
    fn dairy_minerals_in_snf() {
        // Whey's line passes through its sweet whey and isolate anchors, to within float rounding
        for (protein_fraction, minerals_fraction) in [
            (dairy::whey::STD_PROTEIN_IN_WS, dairy::whey::STD_MINERALS_IN_WS),
            (dairy::whey::STD_PROTEIN_IN_WPI, dairy::whey::STD_MINERALS_IN_WPI),
        ] {
            assert_abs_diff_eq!(
                dairy::minerals_in_snf(protein_fraction, SolidsSource::Whey),
                minerals_fraction,
                epsilon = f64::EPSILON
            );
        }

        // Milk and casein solids hold fixed fractions, whatever their protein
        for protein_fraction in [0.0, 0.5, 1.0] {
            assert_eq!(dairy::minerals_in_snf(protein_fraction, SolidsSource::Milk), dairy::STD_MINERALS_IN_MSNF);
            assert_eq!(
                dairy::minerals_in_snf(protein_fraction, SolidsSource::Casein),
                dairy::casein::STD_MINERALS_IN_CASEIN
            );
        }
    }

    #[test]
    fn dairy_lactose_in_snf() {
        // Whey's line passes through its sweet whey and isolate anchors, to within float rounding
        for (protein_fraction, lactose_fraction) in [
            (dairy::whey::STD_PROTEIN_IN_WS, dairy::whey::STD_LACTOSE_IN_WS),
            (dairy::whey::STD_PROTEIN_IN_WPI, dairy::whey::STD_LACTOSE_IN_WPI),
        ] {
            assert_abs_diff_eq!(
                dairy::lactose_in_snf(protein_fraction, SolidsSource::Whey),
                lactose_fraction,
                epsilon = f64::EPSILON
            );
        }

        // Milk and casein solids hold fixed fractions, whatever their protein
        for protein_fraction in [0.0, 0.5, 1.0] {
            assert_eq!(dairy::lactose_in_snf(protein_fraction, SolidsSource::Milk), dairy::STD_LACTOSE_IN_MSNF);
            assert_eq!(
                dairy::lactose_in_snf(protein_fraction, SolidsSource::Casein),
                dairy::casein::STD_LACTOSE_IN_CASEIN
            );
        }
    }

    #[test]
    fn dairy_unaccounted_in_snf() {
        // Whey's line leaves what the constants leave at each anchor, 2% of sweet whey solids and
        // 0.1% of isolate solids, to within float rounding
        for (protein_fraction, lactose_fraction, minerals_fraction) in [
            (dairy::whey::STD_PROTEIN_IN_WS, dairy::whey::STD_LACTOSE_IN_WS, dairy::whey::STD_MINERALS_IN_WS),
            (dairy::whey::STD_PROTEIN_IN_WPI, dairy::whey::STD_LACTOSE_IN_WPI, dairy::whey::STD_MINERALS_IN_WPI),
        ] {
            assert_abs_diff_eq!(
                dairy::unaccounted_in_snf(protein_fraction, SolidsSource::Whey),
                1.0 - protein_fraction - lactose_fraction - minerals_fraction,
                epsilon = f64::EPSILON
            );
        }

        // Milk and casein solids are wholly protein, lactose, and minerals, whatever their protein
        for protein_fraction in [0.0, 0.5, 1.0] {
            assert_eq!(dairy::unaccounted_in_snf(protein_fraction, SolidsSource::Milk), 0.0);
            assert_eq!(dairy::unaccounted_in_snf(protein_fraction, SolidsSource::Casein), 0.0);
        }
    }

    #[test]
    fn dairy_whey_lines_partition_the_solids() {
        // From sweet whey to isolate, protein, lactose, minerals, and unaccounted solids make up
        // all of the whey solids, to within float rounding, with no negative unaccounted solids
        for protein_fraction in [
            dairy::whey::STD_PROTEIN_IN_WS,
            0.25,
            0.5,
            0.75,
            dairy::whey::STD_PROTEIN_IN_WPI,
        ] {
            let lactose_fraction = dairy::lactose_in_snf(protein_fraction, SolidsSource::Whey);
            let minerals_fraction = dairy::minerals_in_snf(protein_fraction, SolidsSource::Whey);
            let unaccounted_fraction = dairy::unaccounted_in_snf(protein_fraction, SolidsSource::Whey);

            assert_abs_diff_eq!(
                protein_fraction + lactose_fraction + minerals_fraction + unaccounted_fraction,
                1.0,
                epsilon = f64::EPSILON
            );
            assert_ge!(unaccounted_fraction, 0.0);
        }
    }
}

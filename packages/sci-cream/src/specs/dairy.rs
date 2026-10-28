//! [`DairySimpleSpec`], [`DairyLabelSpec`], [`DairySheetSpec`], and associated implementations,
//! for dairy ingredients such as milk, cream, milk powders, protein powders, etc.

use core::f64;

use serde::{Deserialize, Serialize};

use crate::{
    composition::{
        Carbohydrates, Composition, Fats, MilkProteins, MilkSolids, PAC, ScaleComponents, SimpleSolids, Solids, Sugars,
        ToComposition,
    },
    constants::{
        composition::dairy::{
            STD_MIN_WATER_CONTENT_IN_MILK_POWDER, STD_SATURATED_FAT_IN_MILK_FAT, STD_TRANS_FAT_IN_MILK_FAT,
            casein::STD_PROTEIN_IN_CASEINATE,
            casein_in_protein, lactose_in_snf_coeffs,
            milk::{
                STD_CASEIN_PROTEIN_IN_MSNF_PROTEIN, STD_MSNF_IN_MILK_SERUM, STD_PROTEIN_IN_MSNF,
                STD_WHEY_PROTEIN_IN_MSNF_PROTEIN,
            },
            minerals_in_snf_coeffs, unaccounted_in_snf_coeffs,
            whey::STD_PROTEIN_IN_WS,
        },
        density::solve_dairy_serving_grams,
        pac,
    },
    error::{Error, Result},
    specs::units::Unit,
    validate::{Validate, verify_are_positive, verify_is_subset, verify_is_within_100_percent},
};

#[cfg(doc)]
use crate::{
    composition::{ArtificialSweeteners, CompKey, Polyols},
    constants::{
        self,
        composition::dairy::{
            self,
            casein::{STD_LACTOSE_IN_CASEINATE, STD_MINERALS_IN_CASEINATE},
            lactose_in_snf,
            milk::STD_LACTOSE_IN_MSNF,
            minerals_in_snf, unaccounted_in_snf,
        },
    },
};

/// Indicates the origin of the non-fat solids in a dairy product, which affects its composition
#[derive(PartialEq, Eq, Serialize, Deserialize, Copy, Clone, Debug)]
pub enum SolidsSource {
    /// Milk solids (MSNF) and concentrates: an ~80/20 casein/whey split, lactose, 7.2-8% minerals
    ///
    /// Lactose and minerals decrease linearly as protein is concentrated, from plain milk solids to
    /// isolates, as computed by [`lactose_in_snf`] and [`minerals_in_snf`], while the casein/whey
    /// split stays the same. See [`dairy::milk`] for more information about the detailed
    /// composition of milk products.
    Milk,
    /// Sweet whey solids (WS) and their concentrates: whey proteins, lactose, 3.6-8.5% minerals
    ///
    /// Lactose and minerals decrease linearly as protein is concentrated, from sweet whey to
    /// isolates, as computed by [`lactose_in_snf`] and [`minerals_in_snf`]. See [`dairy::whey`] for
    /// more information about the detailed composition of whey products.
    Whey,
    /// Micellar casein solids: mostly casein proteins, lactose, ~8% minerals
    ///
    /// Lactose, minerals, and the casein share of the protein follow the protein fraction, from
    /// milk solids' to isolates', as computed by [`lactose_in_snf`], [`minerals_in_snf`], and
    /// [`casein_in_protein`]; protein fractions below milk solids' are unsupported. See
    /// [`dairy::casein`] for more information about the detailed composition of casein products.
    MicellarCasein,
    /// Caseinate solids: casein proteins, ~0.2% lactose, ~4% minerals
    ///
    /// Caseinates hold the fixed fractions [`STD_LACTOSE_IN_CASEINATE`],
    /// [`STD_PROTEIN_IN_CASEINATE`], and [`STD_MINERALS_IN_CASEINATE`] of sodium caseinate. See
    /// [`dairy::casein`] for more information about the detailed composition of casein products.
    Caseinate,
}

/// Spec for trivial dairy ingredients, e.g. Milk, Cream, Milk Powder, etc.
///
/// This spec is suitable for common dairy ingredients where only one or a few basic compositional
/// parameters are specified, such as fat content, and the rest is inferred from standard values,
/// notably [`STD_MSNF_IN_MILK_SERUM`], [`STD_LACTOSE_IN_MSNF`], [`STD_PROTEIN_IN_MSNF`], etc. It
/// is also suitable for literature sources where only basic compositional information is available.
///
/// For most common ingredients, e.g. milks and creams, it is sufficient to specify only the fat
/// content. For dried or concentrated dairy products, such as milk powder, whey concentrates, etc.,
/// it is necessary to specify the milk solids non-fat [`msnf`](Self::msnf) content explicitly. For
/// example, _Skimmed Milk Powder_ may have a 3% water content and 0% `fat`, which translates to an
/// `msnf` of 97. Concentrates also need to specify the protein content, as the ultrafiltration
/// process increases the protein concentration beyond that of typical milk or whey. Whey and casein
/// products also need to specify the corresponding [`solids_source`](Self::solids_source), and
/// micellar casein products always need their protein content, which sets their grade.
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct DairySimpleSpec {
    /// Fat content by weight, e.g. 3.25 for whole milk, 40 for cream, 0 for skimmed milk, etc.
    pub fat: f64,
    /// Milk solids non-fat content by weight, calculated internally for typical milks and creams.
    ///
    /// It is necessary to specify `msnf` for milk powders and other condensed or dried dairy
    /// products, as they do not adhere to the standard milk and whey composition ratios.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub msnf: Option<f64>,
    /// Protein content by weight; calculated internally based on standard values, if unspecified.
    ///
    /// See [`STD_PROTEIN_IN_MSNF`], [`STD_PROTEIN_IN_WS`], and [`STD_PROTEIN_IN_CASEINATE`] for
    /// those standard values; [`SolidsSource::MicellarCasein`] has none and requires it. The
    /// detailed proteins breakdown is determined by [`solids_source`](Self::solids_source). If that
    /// is not [`SolidsSource::Caseinate`], the lactose content is also determined by the protein
    /// content, as given by [`lactose_in_snf`].
    ///
    /// This is [crude protein](crate::docs#crude-and-true-protein), as sources list it.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub protein: Option<f64>,
    /// Sucrose content by weight; optional, assumed to be zero if not specified.
    ///
    /// This accommodates dairy products with added sugars, e.g. sweetened condensed milk.
    ///
    /// Note that this is included under [`Solids::other`], not under [`Solids::milk`].
    ///
    /// See [`lactose_free`](Self::lactose_free) for the possibility of different natural sugar
    /// compositions in lactose-free products.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sucrose: Option<f64>,
    /// Whether the dairy product is lactose-free, which affects the detailed sugars composition
    ///
    /// If `false`/`None`, the sugars are assumed to be all lactose, calculated from
    /// [`msnf`](Self::msnf) per the [`solids_source`](Self::solids_source) and [`lactose_in_snf`].
    /// If `true`, the same amount of lactose is instead assumed to be a 50/50 glucose and galactose
    /// mixture, the two monosaccharides that make up lactose, which is typical of lactose-free
    /// dairy products where lactose is enzymatically broken down into its constituent sugars
    /// (Goff & Hartel, 2025, pp. 35, 422)[^20].
    #[doc = include_str!("../../docs/references/index/20.md")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub lactose_free: Option<bool>,
    /// Source of the solids non-fat in this product, [`SolidsSource::Milk`] if unspecified
    ///
    /// This affects the detailed protein, lactose, and minerals composition of the solids non-fat.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub solids_source: Option<SolidsSource>,
}

impl ToComposition for DairySimpleSpec {
    fn to_composition(&self) -> Result<Composition> {
        let Self {
            fat,
            msnf,
            protein,
            sucrose,
            lactose_free,
            solids_source,
        } = *self;

        let sucrose = sucrose.unwrap_or(0.0);
        let lactose_free = lactose_free.unwrap_or(false);
        let solids_source = solids_source.unwrap_or(SolidsSource::Milk);

        let calculated_msnf = (100.0 - fat) * STD_MSNF_IN_MILK_SERUM;
        let msnf = msnf.unwrap_or(calculated_msnf);

        let proteins = match (protein, solids_source) {
            (Some(protein), _) => protein,
            (None, SolidsSource::Milk) => msnf * STD_PROTEIN_IN_MSNF,
            (None, SolidsSource::Whey) => msnf * STD_PROTEIN_IN_WS,
            (None, SolidsSource::Caseinate) => msnf * STD_PROTEIN_IN_CASEINATE,
            (None, SolidsSource::MicellarCasein) => {
                return Err(Error::InvalidSpec(
                    "Micellar casein solids require an explicit protein content".to_string(),
                ));
            }
        };
        let lactose = estimate_lactose(msnf, proteins, solids_source);

        verify_are_positive(&[fat, msnf, proteins, sucrose])?;
        verify_is_within_100_percent(fat + msnf + sucrose)?;
        verify_is_subset(proteins, msnf, "proteins <= msnf")?;
        verify_is_subset(lactose + proteins, msnf, "lactose + proteins <= msnf")?;

        let estimated_minerals = estimate_minerals(msnf, proteins, solids_source);
        let minerals = f64::min(estimated_minerals, msnf - lactose - proteins);

        let dairy_sugars = make_dairy_sugars(lactose, lactose_free);
        let other_sugars = Sugars::new().sucrose(sucrose);
        let total_sugars = dairy_sugars.add(&other_sugars);

        let milk_solids = MilkSolids::new()
            .fats(
                Fats::new()
                    .total(fat)
                    .saturated(fat * STD_SATURATED_FAT_IN_MILK_FAT)
                    .trans(fat * STD_TRANS_FAT_IN_MILK_FAT),
            )
            .carbohydrates(Carbohydrates::new().sugars(dairy_sugars))
            .proteins(make_milk_proteins(proteins, proteins / msnf, solids_source)?)
            .minerals(minerals)
            .others_from_total(fat + msnf)?;

        let other_solids = SimpleSolids::new().carbohydrates(Carbohydrates::new().sugars(other_sugars));

        let pod = total_sugars.to_pod()?;
        let pad = PAC::new()
            .sugars(total_sugars.to_pac()?)
            .msnf_ws_salts(msnf * pac::MSNF_WS_SALTS / 100.0);

        Composition::new()
            .energy(milk_solids.energy()? + other_solids.energy()?)
            .solids(Solids::new().milk(milk_solids).other(other_solids))
            .pod(pod)
            .pac(pad)
            .validate_into()
    }
}

/// Spec for dairy ingredients derived from nutrition facts labels, with detailed breakdown.
///
/// This spec is more flexible than [`DairySimpleSpec`] and can accommodate a wider range of dairy
/// products, including those with non-standard compositions, e.g. lactose-free products with
/// different types of sugars, whey protein or isolate powder, or other specialized dairy products.
/// The required values can typically be pulled directly from the nutrition facts label.
///
/// For sources that list more detailed compositions like water and ash content, such as spec
/// sheets and composition databases, use [`DairySheetSpec`] for a more accurate representation.
///
/// In addition to lactose and proteins, MSNF (milk solids non-fat) and WS (whey solids) include
/// minerals and salts (Goff & Hartel, 2025, pp. 37, 47)[^20], (Goff, n.d., "11. Milk
/// Solids-not-fat")[^90], which nutrition facts labels don't list. As such, the total MSNF or WS
/// content is internally estimated from `dairy_sugars` (see [`sugars`](Self::sugars) and
/// [`sucrose`](Self::sucrose)), [`protein`](Self::protein), and the minerals fraction of the
/// [`solids_source`](Self::solids_source): [`STD_MINERALS_IN_CASEINATE`] for
/// [`Caseinate`](SolidsSource::Caseinate), and for the others a line in the protein fraction, see
/// [`minerals_in_snf`]. Those minerals are the composition's [`CompKey::MilkMinerals`]. Whey solids
/// also hold a small fraction that their lactose, protein, and minerals leave unaccounted, see
/// [`unaccounted_in_snf`], which the estimate adds as well, as other milk solids.
///
/// The solids, from the label's values and the estimated minerals and other milk solids, are capped
/// so that the water content doesn't fall below [`STD_MIN_WATER_CONTENT_IN_MILK_POWDER`]. The other
/// milk solids are cut first, then the minerals. It is an error if the label's values alone leave
/// less water than that.
#[doc = include_str!("../../docs/references/index/20.md")]
#[doc = include_str!("../../docs/references/index/90.md")]
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct DairyLabelSpec {
    /// Serving size in grams; if given in ml, it is converted to grams based on the composition
    ///
    /// The ml → g density is selected by [`constants::density::select_dairy_density`] and solved as
    /// a fixed point, since fat, MSNF, and sucrose fractions depend on the serving size in grams.
    pub serving_size: Unit,
    /// Energy per serving, in kcal; calculated based on macronutrients composition if unspecified
    #[serde(skip_serializing_if = "Option::is_none")]
    pub energy: Option<f64>,
    /// Total fat content per serving; it can be given in grams or as a percentage of serving size
    ///
    /// If a dairy product states a fat content percentage on the label, that is usually more
    /// accurate than the whole unit grams in the nutrition facts table, so specifying a total fat
    /// percentage is recommended whenever possible.
    pub total_fat: Unit,
    /// Saturated fat content per serving, in grams; it must be a subset of total fat.
    ///
    /// If unspecified, it is calculated as [`STD_SATURATED_FAT_IN_MILK_FAT`] of
    /// [`total_fat`](Self::total_fat). Nutrition tables sometimes list this as zero, particularly
    /// for small serving sizes, in which cases it's usually more accurate to not specify it and
    /// instead have it internally calculated from the total fat content.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub saturated_fat: Option<f64>,
    /// Trans fat content per serving, in grams; it must be a subset of total fat.
    ///
    /// If unspecified, it is calculated as [`STD_TRANS_FAT_IN_MILK_FAT`] of
    /// [`total_fat`](Self::total_fat). Nutrition tables sometimes list this as zero, particularly
    /// for small serving sizes, in which cases it's usually more accurate to not specify it and
    /// instead have it internally calculated from the total fat content.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub trans_fat: Option<f64>,
    /// Total carbohydrate content per serving, in grams; a superset of [`sugars`](Self::sugars).
    ///
    /// If unspecified, it is assumed to equal the [`sugars`](Self::sugars) content. This should be
    /// the case for most dairy products, which should contain lactose as the only carbohydrate
    /// (aside from trace amounts of other carbohydrates). However, some labels may list a total
    /// carbohydrate content that's slightly higher than the sugar content - due to several reasons,
    /// e.g. imprecise carbohydrate by-difference measurements, heat damage during drying, etc. In
    /// those cases, specifying the total carbohydrate content is recommended, as it allows for a
    /// more accurate estimation of the composition solids breakdown, water content, etc.
    ///
    /// Note that any difference is included under [`Solids::other`], not under [`Solids::milk`],
    /// less whey's unaccounted solids, see [`unaccounted_in_snf`], to avoid counting them twice:
    /// both carbohydrates by difference and the solids non-fat estimate include them.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub carbohydrates: Option<f64>,
    /// Sugars content per serving, in grams; the detailed composition is determined by
    /// [`lactose_free`](Self::lactose_free) and [`sucrose`](Self::sucrose).
    ///
    /// These are the measured sugars that nutrition facts labels list; they must be a subset of
    /// [`carbohydrates`](Self::carbohydrates) (by difference) if those are specified. If they are
    /// not, then the two are assumed to be equal, which should be the case for most dairy products.
    pub sugars: f64,
    /// Protein content per serving, in grams.
    ///
    /// This is [crude protein](crate::docs#crude-and-true-protein), as labels list it. The detailed
    /// proteins breakdown is determined by [`solids_source`](Self::solids_source).
    pub protein: f64,
    /// Whether the dairy product is lactose-free, which affects the detailed composition of
    /// [`sugars`](Self::sugars).
    ///
    /// If `false`/`None`, the non-sucrose sugars are assumed to be all lactose, which is the
    /// predominant sugar in regular dairy products. If `true`, the non-sucrose sugars are assumed
    /// to be a 50/50 glucose and galactose mixture, the two monosaccharides that make up lactose,
    /// which is typical of lactose free dairy products where lactose is enzymatically broken down
    /// into its constituent sugars (Goff & Hartel, 2025, pp. 35, 422)[^20].
    ///
    /// See [`sucrose`](Self::sucrose) for the possibility of other types of sugars.
    #[doc = include_str!("../../docs/references/index/20.md")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub lactose_free: Option<bool>,
    /// Sucrose content per serving, in grams, assumed to be zero if not specified
    ///
    /// This accommodates dairy products with added sugars, e.g. sweetened condensed milk. It must
    /// be a subset of [`sugars`](Self::sugars), the rest is assumed to be natural dairy sugars.
    ///
    /// Note that this is included under [`Solids::other`], not under [`Solids::milk`].
    ///
    /// See [`lactose_free`](Self::lactose_free) for the possibility of different natural sugar
    /// compositions in lactose-free products.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sucrose: Option<f64>,
    /// Source of the solids non-fat in this product, [`SolidsSource::Milk`] if unspecified
    ///
    /// This affects the detailed protein and minerals composition of the solids non-fat.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub solids_source: Option<SolidsSource>,
}

impl ToComposition for DairyLabelSpec {
    fn to_composition(&self) -> Result<Composition> {
        let Self {
            serving_size,
            energy,
            total_fat,
            saturated_fat,
            trans_fat,
            carbohydrates,
            sugars,
            protein,
            lactose_free,
            sucrose,
            solids_source,
        } = *self;

        let lactose_free = lactose_free.unwrap_or(false);
        let sucrose = sucrose.unwrap_or(0.0);
        let dairy_sugars = sugars - sucrose;
        let carbohydrates = carbohydrates.unwrap_or(sugars);
        let solids_source = solids_source.unwrap_or(SolidsSource::Milk);

        let calculated_snf = estimate_snf(dairy_sugars, protein, solids_source);
        let unaccounted = estimate_unaccounted(calculated_snf, protein, solids_source);
        let other_carbohydrates = f64::max(carbohydrates - sugars - unaccounted, 0.0);

        let max_solids = 1.0 - STD_MIN_WATER_CONTENT_IN_MILK_POWDER;
        let snf_ceiling = |size: f64, fat| max_solids * size - fat - sucrose - other_carbohydrates;

        let (serving_size, total_fat) = match (serving_size, total_fat) {
            (Unit::Grams(size_grams), Unit::Grams(fat_grams)) => (size_grams, fat_grams),
            (Unit::Grams(size_grams), Unit::Percent(fat_percent)) => (size_grams, size_grams * fat_percent / 100.0),
            (Unit::Milliliters(size_ml), Unit::Grams(fat_grams)) => {
                let fat_at = |_| fat_grams;
                let size_grams = solve_dairy_serving_grams(size_ml, sucrose, calculated_snf, fat_at)?;
                (size_grams, fat_grams)
            }
            (Unit::Milliliters(size_ml), Unit::Percent(fat_percent)) => {
                let fat_at = |size: f64| size * fat_percent / 100.0;
                let size_grams = solve_dairy_serving_grams(size_ml, sucrose, calculated_snf, fat_at)?;
                (size_grams, size_grams * fat_percent / 100.0)
            }
            _ => return Err(Error::UnsupportedCompositionUnit(serving_size)),
        };

        let snf = f64::min(calculated_snf, snf_ceiling(serving_size, total_fat));

        let saturated_fat = saturated_fat.unwrap_or(STD_SATURATED_FAT_IN_MILK_FAT * total_fat);
        let trans_fat = trans_fat.unwrap_or(STD_TRANS_FAT_IN_MILK_FAT * total_fat);

        verify_are_positive(&[
            serving_size,
            total_fat,
            saturated_fat,
            trans_fat,
            carbohydrates,
            sugars,
            protein,
            sucrose,
        ])?;

        verify_is_subset(saturated_fat, total_fat, "saturated_fat <= total_fat")?;
        verify_is_subset(trans_fat, total_fat, "trans_fat <= total_fat")?;
        verify_is_subset(total_fat + snf + sucrose, serving_size, "total_fat + snf + sucrose <= serving_size")?;
        verify_is_subset(sugars, carbohydrates, "sugars <= carbohydrates")?;
        verify_is_subset(sucrose, sugars, "sucrose <= sugars")?;
        verify_is_subset(dairy_sugars + protein, snf, "dairy_sugars + protein <= snf")?;

        let estimated_minerals = estimate_minerals(snf, protein, solids_source);
        let minerals = f64::min(estimated_minerals, snf - dairy_sugars - protein);

        let dairy_sugars = make_dairy_sugars(dairy_sugars, lactose_free);
        let other_sugars = Sugars::new().sucrose(sucrose);
        let total_sugars = dairy_sugars.add(&other_sugars);

        let milk_solids = MilkSolids::new()
            .fats(Fats::new().total(total_fat).saturated(saturated_fat).trans(trans_fat))
            .carbohydrates(Carbohydrates::new().sugars(dairy_sugars))
            .proteins(make_milk_proteins(protein, protein / snf, solids_source)?)
            .minerals(minerals)
            .others_from_total(total_fat + snf)?;

        let other_solids =
            SimpleSolids::new().carbohydrates(Carbohydrates::new().sugars(other_sugars).others(other_carbohydrates));

        Composition::new()
            .energy(energy.unwrap_or(milk_solids.energy()? + other_solids.energy()?))
            .solids(Solids::new().milk(milk_solids).other(other_solids))
            .pod(total_sugars.to_pod()?)
            .pac(
                PAC::new()
                    .sugars(total_sugars.to_pac()?)
                    .msnf_ws_salts(snf * pac::MSNF_WS_SALTS / 100.0),
            )
            .scale(100.0 / serving_size)
            .validate_into()
    }
}

/// Spec for dairy ingredients from spec sheets and food composition databases, per 100 g
///
/// This spec is suitable for dairy ingredients that have detailed compositional information,
/// including water, fat, protein, sugars, ash, etc. These most often come from food composition
/// databases, like the [USDA FoodData Central](https://fdc.nal.usda.gov/) database, or from
/// suppliers' specification sheets. It makes the fewest assumptions about the composition beyond
/// what is explicitly listed, and as such provides few defaults and requires comprehensive input.
///
/// See [`DairySimpleSpec`] for a simpler spec that infers most of the composition from standard
/// values, and [`DairyLabelSpec`] for a spec that is suitable for nutrition facts labels, as well
/// as some spec sheets that don't provide the water content - the anchor for solids calculations.
///
/// Values are as-is, in grams per 100 g. Where sheets list typical values beside min/max
/// limits, use the typical values, or the midpoints of typical ranges. Values given on a dry basis
/// should be converted to as-is using the water content, as: `as-is = dry × (100 - water) / 100`.
///
/// **Note:** The solids non-fat are the greater of `100 - water - fat - added_sugars` and
/// `milk_sugars + protein + ash`. If the latter is greater, the difference is subtracted from the
/// water; this can happen as proximates measured apart rarely sum to exactly 100 g. An unlisted
/// [`ash`](Self::ash) is modeled up to what the water leaves, so it never lowers the water. In
/// contrast, [`DairyLabelSpec`] lacks the water, so it estimates the solids non-fat from the sugars
/// and protein plus the minerals modeled for the solids source, and the water is what remains.
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct DairySheetSpec {
    /// Water content, in grams per 100 g; spec sheets usually list it as moisture
    ///
    /// Water content determines the solids non-fat as `100 - water - fat - added_sugars`, unless
    /// `milk_sugars + protein + ash` is greater, when the difference is subtracted from the water.
    pub water: f64,
    /// Energy per 100 g, in kcal; calculated based on macronutrients composition if unspecified
    #[serde(skip_serializing_if = "Option::is_none")]
    pub energy: Option<f64>,
    /// Total fat content, in grams per 100 g; wholly counted as butterfat (milk fat)
    pub fat: f64,
    /// Saturated fat content, in grams per 100 g; it must be a subset of [`fat`](Self::fat).
    ///
    /// If unspecified, it is calculated as [`STD_SATURATED_FAT_IN_MILK_FAT`] of [`fat`](Self::fat).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub saturated_fat: Option<f64>,
    /// Trans fat content, in grams per 100 g; it must be a subset of [`fat`](Self::fat).
    ///
    /// If unspecified, it is calculated as [`STD_TRANS_FAT_IN_MILK_FAT`] of [`fat`](Self::fat).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub trans_fat: Option<f64>,
    /// Sugar content and composition breakdown of mono- and disaccharides, in grams per 100 g
    ///
    /// This allows a detailed breakdown of the sugars composition, although only a few combinations
    /// occur in dairy. For typical dairy products, `lactose` should be the only listed sugar.
    /// Lactose-free products should list either all or part of the lactose as a 50/50 split of
    /// glucose and galactose, the two constituent monosaccharides that it is enzymatically broken
    /// down into (Goff & Hartel, 2025, pp. 35, 422)[^20]. These are all counted as milk sugars, as
    /// part of [`Solids::milk`]. Any other sugars, typically added `sucrose`, e.g. in sweetened
    /// condensed milk, should be included and are counted as [`Solids::other`].
    #[doc = include_str!("../../docs/references/index/20.md")]
    pub sugars: Sugars,
    /// Protein content, in grams per 100 g, as-is rather than on a dry basis
    ///
    /// This is [crude protein](crate::docs#crude-and-true-protein), as sheets list it.
    ///
    /// The detailed breakdown of the proteins is determined by [`casein`](Self::casein), if listed,
    /// or else by [`solids_source`](Self::solids_source).
    pub protein: f64,
    /// Casein content, in grams per 100 g, if listed; a subset of [`protein`](Self::protein)
    ///
    /// If specified, it replaces the casein share that [`solids_source`](Self::solids_source)
    /// gives, and whey makes up the rest of the protein, non-protein nitrogen included.
    /// See [crude and true protein](crate::docs#crude-and-true-protein) for more details.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub casein: Option<f64>,
    /// Ash or mineral content, in grams per 100 g, if listed
    ///
    /// The milk solids' minerals, [`CompKey::MilkMinerals`], are the listed ash or, if unlisted,
    /// those modeled for the [`solids_source`](Self::solids_source), see [`minerals_in_snf`], up to
    /// what the solids non-fat leave after the milk sugars and [`protein`](Self::protein). The rest
    /// of the solids non-fat, e.g. organic acids, are other milk solids.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ash: Option<f64>,
    /// Source of the solids non-fat in this product, [`SolidsSource::Milk`] if unspecified
    ///
    /// This affects the detailed protein composition of the solids non-fat, unless
    /// [`casein`](Self::casein) is listed. Without a listed [`ash`](Self::ash), it also sets the
    /// minerals modeled for them.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub solids_source: Option<SolidsSource>,
}

impl ToComposition for DairySheetSpec {
    fn to_composition(&self) -> Result<Composition> {
        let Self {
            water,
            energy,
            fat,
            saturated_fat,
            trans_fat,
            sugars,
            protein,
            casein,
            ash,
            solids_source,
        } = *self;

        let saturated_fat = saturated_fat.unwrap_or(STD_SATURATED_FAT_IN_MILK_FAT * fat);
        let trans_fat = trans_fat.unwrap_or(STD_TRANS_FAT_IN_MILK_FAT * fat);
        let solids_source = solids_source.unwrap_or(SolidsSource::Milk);

        sugars.validate()?;

        verify_are_positive(&[
            water,
            fat,
            saturated_fat,
            trans_fat,
            protein,
            casein.unwrap_or(0.0),
            ash.unwrap_or(0.0),
        ])?;
        verify_is_within_100_percent(water + fat + sugars.total() + protein)?;
        verify_is_subset(saturated_fat, fat, "saturated_fat <= fat")?;
        verify_is_subset(trans_fat, fat, "trans_fat <= fat")?;
        verify_is_subset(casein.unwrap_or(0.0), protein, "casein <= protein")?;

        let (milk_sugars, other_sugars) = split_milk_sugars(sugars);
        let snf_by_water = 100.0 - water - fat - other_sugars.total();

        let estimated_minerals = estimate_minerals(snf_by_water, protein, solids_source);
        let minerals_by_diff = snf_by_water - milk_sugars.total() - protein;

        let minerals = ash.unwrap_or_else(|| f64::min(estimated_minerals, minerals_by_diff));
        let snf_by_solids = milk_sugars.total() + protein + minerals;

        let snf = f64::max(snf_by_water, snf_by_solids);

        let proteins = match casein {
            Some(casein) => MilkProteins::new().casein(casein).whey(protein - casein),
            None => make_milk_proteins(protein, protein / snf, solids_source)?,
        };

        let milk_solids = MilkSolids::new()
            .fats(Fats::new().total(fat).saturated(saturated_fat).trans(trans_fat))
            .carbohydrates(Carbohydrates::new().sugars(milk_sugars))
            .proteins(proteins)
            .minerals(minerals)
            .others_from_total(fat + snf)?;

        let other_solids = SimpleSolids::new().carbohydrates(Carbohydrates::new().sugars(other_sugars));

        Composition::new()
            .energy(energy.unwrap_or(milk_solids.energy()? + other_solids.energy()?))
            .solids(Solids::new().milk(milk_solids).other(other_solids))
            .pod(sugars.to_pod()?)
            .pac(
                PAC::new()
                    .sugars(sugars.to_pac()?)
                    .msnf_ws_salts(snf * pac::MSNF_WS_SALTS / 100.0),
            )
            .validate_into()
    }
}

/// Splits a total sugars content into lactose or glucose/galactose according to the `lactose_free`
///
/// If `lactose_free` is `false`, then it returns all lactose. If `true`, then a 50/50 glucose and
/// galactose mixture, the two monosaccharides that make up lactose, which is typical of
/// lactose-free products where lactose is enzymatically broken down into its constituent sugars.
fn make_dairy_sugars(sugars: f64, lactose_free: bool) -> Sugars {
    if lactose_free {
        Sugars::new().glucose(sugars / 2.0).galactose(sugars / 2.0)
    } else {
        Sugars::new().lactose(sugars)
    }
}

/// Splits `sugars` into milk and other sugars, as `(milk_sugars, other_sugars)`
///
/// Lactose, glucose, and galactose are considered milk sugars; all others, e.g. sucrose, are not.
/// Lactose is a disaccharide composed of glucose and galactose, into which it is enzymatically
/// broken down in typical lactose-free products (Goff & Hartel, 2025, pp. 35, 422)[^20].
#[doc = include_str!("../../docs/references/index/20.md")]
const fn split_milk_sugars(sugars: Sugars) -> (Sugars, Sugars) {
    let milk_sugars = Sugars {
        lactose: sugars.lactose,
        glucose: sugars.glucose,
        galactose: sugars.galactose,
        ..Sugars::new()
    };
    let other_sugars = Sugars {
        lactose: 0.0,
        glucose: 0.0,
        galactose: 0.0,
        ..sugars
    };
    (milk_sugars, other_sugars)
}

/// Estimates the solids non-fat from their `sugars` and `protein`, adding `source`'s minerals and
/// unaccounted solids, see [`minerals_in_snf`] and [`unaccounted_in_snf`].
const fn estimate_snf(sugars: f64, protein: f64, source: SolidsSource) -> f64 {
    // Solves `snf = sugars + protein + snf × (minerals + unaccounted)`, both fractions linear in
    // `protein / snf` and summing to `a + b × protein / snf`. Subbing in gives `snf = sugars +
    // protein + snf × (a + b × protein / snf)`, so `snf = (sugars + (1 + b) × protein) / (1 - a)`
    let [minerals_a, minerals_b] = minerals_in_snf_coeffs(source);
    let [unaccounted_a, unaccounted_b] = unaccounted_in_snf_coeffs(source);
    let (a, b) = (minerals_a + unaccounted_a, minerals_b + unaccounted_b);
    (sugars + (1.0 + b) * protein) / (1.0 - a)
}

/// Estimates the unaccounted solids in `snf` grams of `source`'s solids non-fat from its `protein`
const fn estimate_unaccounted(snf: f64, protein: f64, source: SolidsSource) -> f64 {
    // The solids, `snf × unaccounted_in_snf(protein / snf, source)`, are `a × snf + b × protein`
    let [a, b] = unaccounted_in_snf_coeffs(source);
    a * snf + b * protein
}

/// Estimates the lactose in `snf` grams of `source`'s solids non-fat from their `protein` content
const fn estimate_lactose(snf: f64, protein: f64, source: SolidsSource) -> f64 {
    // The lactose, `snf × lactose_in_snf(protein / snf, source)`, is `a × snf + b × protein`
    let [a, b] = lactose_in_snf_coeffs(source);
    a * snf + b * protein
}

/// Estimates the minerals in `snf` grams of `source`'s solids non-fat from their `protein` content
const fn estimate_minerals(snf: f64, protein: f64, source: SolidsSource) -> f64 {
    // The minerals, `snf × minerals_in_snf(protein / snf, source)`, are `a × snf + b × protein`
    let [a, b] = minerals_in_snf_coeffs(source);
    a * snf + b * protein
}

/// Splits a total milk protein content into casein and whey according to the [`SolidsSource`], for
/// solids non-fat whose protein fraction is `protein_in_snf`
///
/// Milk solids carry the natural ~80/20 casein/whey split ([`STD_CASEIN_PROTEIN_IN_MSNF_PROTEIN`],
/// [`STD_WHEY_PROTEIN_IN_MSNF_PROTEIN`]); whey solids' proteins are entirely whey, and caseinate
/// solids' entirely casein. Micellar casein solids' casein share follows their protein fraction, of
/// at least milk solids' [`STD_PROTEIN_IN_MSNF`], along a line, see [`casein_in_protein`].
///
/// # Errors
///
/// Returns [`Error::UnsupportedComposition`] if micellar casein protein is below milk's, or NaN.
pub(crate) fn make_milk_proteins(total: f64, protein_in_snf: f64, source: SolidsSource) -> Result<MilkProteins> {
    Ok(match source {
        SolidsSource::Milk => MilkProteins::new()
            .casein(total * STD_CASEIN_PROTEIN_IN_MSNF_PROTEIN)
            .whey(total * STD_WHEY_PROTEIN_IN_MSNF_PROTEIN),
        SolidsSource::Whey => MilkProteins::new().whey(total),
        SolidsSource::Caseinate => MilkProteins::new().casein(total),
        SolidsSource::MicellarCasein => {
            // Below milk solids' protein, or NaN, the lines would give more whey than milk has
            if protein_in_snf.is_nan() || protein_in_snf < STD_PROTEIN_IN_MSNF {
                return Err(Error::UnsupportedComposition(format!(
                    "Micellar casein protein fraction {protein_in_snf} is below milk's {STD_PROTEIN_IN_MSNF}"
                )));
            }
            let casein = total * casein_in_protein(protein_in_snf, source);
            MilkProteins::new().casein(casein).whey(total - casein)
        }
    })
}

#[cfg(test)]
#[cfg_attr(coverage, coverage(off))]
#[allow(clippy::unwrap_used, clippy::float_cmp)]
pub(crate) mod tests {
    use std::sync::LazyLock;

    use crate::tests::asserts::shadow_asserts::assert_eq;
    use crate::tests::asserts::*;
    use crate::tests::util::AssertKeys;

    use super::*;
    use crate::{
        composition::{CompKey, SolidsBreakdown},
        constants::composition::dairy::{
            casein::{STD_LACTOSE_IN_CASEINATE, STD_MINERALS_IN_CASEINATE},
            lactose_in_snf,
            milk::STD_LACTOSE_IN_MSNF,
            minerals_in_snf, unaccounted_in_snf,
            whey::{STD_LACTOSE_IN_WPI, STD_LACTOSE_IN_WS, STD_PROTEIN_IN_WPI},
        },
        error::Error,
        ingredient::Category,
        specs::{IngredientSpec, TaggedSpec},
    };

    pub(crate) const ING_SPEC_DAIRY_SIMPLE_0_MILK_STR: &str = r#"{
      "name": "0% Milk",
      "category": "Dairy",
      "DairySimpleSpec": {
        "fat": 0
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_SIMPLE_0_MILK: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "0% Milk".to_string(),
        category: Category::Dairy,
        spec: DairySimpleSpec {
            fat: 0.0,
            msnf: None,
            protein: None,
            sucrose: None,
            lactose_free: None,
            solids_source: None,
        }
        .into(),
    });

    pub(crate) static COMP_0_MILK: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(33.12)
            .solids(
                Solids::new().milk(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(0.0))
                        .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(4.905)))
                        .proteins(MilkProteins::new().casein(2.7).whey(0.675))
                        .minerals(0.72),
                ),
            )
            .pod(0.7848)
            .pac(PAC::new().sugars(4.905).msnf_ws_salts(3.3066))
    });

    #[test]
    fn to_composition_dairy_simple_spec_0_milk() {
        let comp = ING_SPEC_DAIRY_SIMPLE_0_MILK.spec.to_composition().unwrap();

        comp.assert_all_keys(&[
            (CompKey::Energy, 33.12),
            (CompKey::MilkSolids, 9.0),
            (CompKey::MilkFat, 0.0),
            (CompKey::MSNF, 9.0),
            (CompKey::MilkSugars, 4.905),
            (CompKey::MilkSNFS, 4.095),
            (CompKey::MilkProteins, 3.375),
            (CompKey::Casein, 2.7),
            (CompKey::Whey, 0.675),
            (CompKey::MilkMinerals, 0.72),
            (CompKey::TotalSolids, 9.0),
            (CompKey::TotalFats, 0.0),
            (CompKey::TotalSNF, 9.0),
            (CompKey::TotalSNFS, 4.095),
            (CompKey::TotalProteins, 3.375),
            (CompKey::TotalMinerals, 0.72),
            (CompKey::Water, 91.0),
            (CompKey::TotalCarbohydrates, 4.905),
            (CompKey::TotalSugars, 4.905),
            (CompKey::Lactose, 4.905),
            (CompKey::TotalSweeteners, 4.905),
            (CompKey::POD, 0.7848),
            (CompKey::NetPAC, 8.211_637),
            (CompKey::TotalPAC, 8.211_637),
            (CompKey::PACsgr, 4.905),
            (CompKey::PACmlk, 3.306_637),
        ]);
    }

    pub(crate) const ING_SPEC_DAIRY_SIMPLE_2_MILK_STR: &str = r#"{
      "name": "2% Milk",
      "category": "Dairy",
      "DairySimpleSpec": {
        "fat": 2
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_SIMPLE_2_MILK: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "2% Milk".to_string(),
        category: Category::Dairy,
        spec: DairySimpleSpec {
            fat: 2.0,
            msnf: None,
            protein: None,
            sucrose: None,
            lactose_free: None,
            solids_source: None,
        }
        .into(),
    });

    pub(crate) static COMP_2_MILK: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(50.4576)
            .solids(
                Solids::new().milk(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(2.0).saturated(1.3).trans(0.07))
                        .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(4.8069)))
                        .proteins(MilkProteins::new().casein(2.646).whey(0.6615))
                        .minerals(0.7056),
                ),
            )
            .pod(0.769_104)
            .pac(PAC::new().sugars(4.8069).msnf_ws_salts(3.2405))
    });

    #[test]
    fn to_composition_dairy_simple_spec_2_milk() {
        let comp = ING_SPEC_DAIRY_SIMPLE_2_MILK.spec.to_composition().unwrap();

        assert_eq!(comp.get(CompKey::Energy), 50.4576);

        assert_eq!(comp.get(CompKey::MilkFat), 2.0);
        assert_eq_flt_test!(comp.get(CompKey::Lactose), 4.8069);
        assert_eq!(comp.get(CompKey::MSNF), 8.82);
        assert_eq!(comp.get(CompKey::MilkSNFS), 4.0131);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 3.3075);
        assert_eq_flt_test!(comp.get(CompKey::Casein), 2.646);
        assert_eq_flt_test!(comp.get(CompKey::Whey), 0.6615);
        assert_eq_flt_test!(comp.get(CompKey::MilkMinerals), 0.7056);
        assert_eq!(comp.get(CompKey::MilkSolids), 10.82);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 3.3075);
        assert_eq!(comp.get(CompKey::TotalSolids), 10.82);
        assert_eq!(comp.get(CompKey::Water), 89.18);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::TotalEmulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::TotalStabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 0.769_104);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 4.8069);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 3.2405);
        assert_eq_flt_test!(comp.get(CompKey::TotalPAC), 8.0474);

        assert_eq_flt_test!(comp.get(CompKey::SaturatedFat), 1.3);
        assert_eq_flt_test!(comp.get(CompKey::TransFat), 0.07);
    }

    pub(crate) const ING_SPEC_DAIRY_SIMPLE_3_25_MILK_STR: &str = r#"{
      "name": "3.25% Milk",
      "category": "Dairy",
      "DairySimpleSpec": {
        "fat": 3.25
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_SIMPLE_3_25_MILK: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "3.25% Milk".to_string(),
        category: Category::Dairy,
        spec: DairySimpleSpec {
            fat: 3.25,
            msnf: None,
            protein: None,
            sucrose: None,
            lactose_free: None,
            solids_source: None,
        }
        .into(),
    });

    pub(crate) static COMP_3_25_MILK: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(61.2936)
            .solids(
                Solids::new().milk(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(3.25).saturated(2.1125).trans(0.11375))
                        .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(4.7456)))
                        .proteins(MilkProteins::new().casein(2.6122).whey(0.6531))
                        .minerals(0.6966),
                ),
            )
            .pod(0.7593)
            .pac(PAC::new().sugars(4.7456).msnf_ws_salts(3.1992))
    });

    #[test]
    fn to_composition_dairy_simple_spec_3_25_milk() {
        let comp = ING_SPEC_DAIRY_SIMPLE_3_25_MILK.spec.to_composition().unwrap();

        assert_eq!(comp.get(CompKey::Energy), 61.2936);

        assert_eq!(comp.get(CompKey::MilkFat), 3.25);
        assert_eq_flt_test!(comp.get(CompKey::Lactose), 4.7456);
        assert_eq!(comp.get(CompKey::MSNF), 8.7075);
        assert_eq_flt_test!(comp.get(CompKey::MilkSNFS), 3.9619);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 3.2653);
        assert_eq_flt_test!(comp.get(CompKey::Casein), 2.6122);
        assert_eq_flt_test!(comp.get(CompKey::Whey), 0.6531);
        assert_eq_flt_test!(comp.get(CompKey::MilkMinerals), 0.6966);
        assert_eq!(comp.get(CompKey::MilkSolids), 11.9575);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 3.2653);
        assert_eq!(comp.get(CompKey::TotalSolids), 11.9575);
        assert_eq_flt_test!(comp.get(CompKey::Water), 88.0425);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::TotalEmulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::TotalStabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 0.7593);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 4.7456);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 3.1992);
        assert_eq_flt_test!(comp.get(CompKey::TotalPAC), 7.9448);

        assert_eq_flt_test!(comp.get(CompKey::SaturatedFat), 2.1125);
        assert_eq_flt_test!(comp.get(CompKey::TransFat), 0.11375);
    }

    pub(crate) const ING_SPEC_DAIRY_SIMPLE_40_CREAM_STR: &str = r#"{
      "name": "40% Cream",
      "category": "Dairy",
      "DairySimpleSpec": {
        "fat": 40
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_SIMPLE_40_CREAM: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "40% Cream".to_string(),
        category: Category::Dairy,
        spec: DairySimpleSpec {
            fat: 40.0,
            msnf: None,
            protein: None,
            sucrose: None,
            lactose_free: None,
            solids_source: None,
        }
        .into(),
    });

    pub(crate) static COMP_40_CREAM: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(379.872)
            .solids(
                Solids::new().milk(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(40.0).saturated(26.0).trans(1.4))
                        .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(2.943)))
                        .proteins(MilkProteins::new().casein(1.62).whey(0.405))
                        .minerals(0.432),
                ),
            )
            .pod(0.47088)
            .pac(PAC::new().sugars(2.943).msnf_ws_salts(1.984))
    });

    #[test]
    fn to_composition_dairy_simple_spec_40_cream() {
        let comp = ING_SPEC_DAIRY_SIMPLE_40_CREAM.spec.to_composition().unwrap();

        assert_eq!(comp.get(CompKey::Energy), 379.872);

        assert_eq!(comp.get(CompKey::MilkFat), 40.0);
        assert_eq_flt_test!(comp.get(CompKey::Lactose), 2.943);
        assert_eq_flt_test!(comp.get(CompKey::MSNF), 5.4);
        assert_eq_flt_test!(comp.get(CompKey::MilkSNFS), 2.457);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 2.025);
        assert_eq_flt_test!(comp.get(CompKey::Casein), 1.62);
        assert_eq_flt_test!(comp.get(CompKey::Whey), 0.405);
        assert_eq_flt_test!(comp.get(CompKey::MilkMinerals), 0.432);
        assert_eq!(comp.get(CompKey::MilkSolids), 45.4);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 2.025);
        assert_eq!(comp.get(CompKey::TotalSolids), 45.4);
        assert_eq!(comp.get(CompKey::Water), 54.6);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::TotalEmulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::TotalStabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 0.47088);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 2.943);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 1.984);
        assert_eq_flt_test!(comp.get(CompKey::TotalPAC), 4.927);

        assert_eq_flt_test!(comp.get(CompKey::SaturatedFat), 26.0);
        assert_eq_flt_test!(comp.get(CompKey::TransFat), 1.4);
    }

    pub(crate) const ING_SPEC_DAIRY_SIMPLE_2_MILK_LACTOSE_FREE_STR: &str = r#"{
      "name": "Lactose-Free 2% Milk",
      "category": "Dairy",
      "DairySimpleSpec": {
        "fat": 2,
        "lactose_free": true
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_SIMPLE_2_MILK_LACTOSE_FREE: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Lactose-Free 2% Milk".to_string(),
            category: Category::Dairy,
            spec: DairySimpleSpec {
                fat: 2.0,
                msnf: None,
                protein: None,
                sucrose: None,
                lactose_free: Some(true),
                solids_source: None,
            }
            .into(),
        });

    pub(crate) static COMP_2_MILK_LACTOSE_FREE: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(50.4576)
            .solids(
                Solids::new().milk(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(2.0).saturated(1.3).trans(0.07))
                        .carbohydrates(Carbohydrates::new().sugars(Sugars::new().glucose(2.40345).galactose(2.40345)))
                        .proteins(MilkProteins::new().casein(2.646).whey(0.6615))
                        .minerals(0.7056),
                ),
            )
            .pod(3.485)
            .pac(PAC::new().sugars(9.1331).msnf_ws_salts(3.2405))
    });

    #[test]
    fn to_composition_dairy_simple_spec_2_milk_lactose_free() {
        let comp = ING_SPEC_DAIRY_SIMPLE_2_MILK_LACTOSE_FREE.spec.to_composition().unwrap();

        assert_eq!(comp.get(CompKey::Energy), 50.4576);

        assert_eq!(comp.get(CompKey::MilkFat), 2.0);
        assert_eq_flt_test!(comp.get(CompKey::Glucose), 2.40345);
        assert_eq_flt_test!(comp.get(CompKey::Galactose), 2.40345);
        assert_eq!(comp.get(CompKey::MSNF), 8.82);
        assert_eq!(comp.get(CompKey::MilkSNFS), 4.0131);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 3.3075);
        assert_eq_flt_test!(comp.get(CompKey::Casein), 2.646);
        assert_eq_flt_test!(comp.get(CompKey::Whey), 0.6615);
        assert_eq_flt_test!(comp.get(CompKey::MilkMinerals), 0.7056);
        assert_eq!(comp.get(CompKey::MilkSolids), 10.82);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 3.3075);
        assert_eq!(comp.get(CompKey::TotalSolids), 10.82);
        assert_eq!(comp.get(CompKey::Water), 89.18);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::TotalEmulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::TotalStabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 3.485);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 9.1331);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 3.2405);
        assert_eq_flt_test!(comp.get(CompKey::TotalPAC), 12.3736);

        assert_eq_flt_test!(comp.get(CompKey::SaturatedFat), 1.3);
        assert_eq_flt_test!(comp.get(CompKey::TransFat), 0.07);
    }

    pub(crate) const ING_SPEC_DAIRY_SIMPLE_SKIMMED_POWDER_STR: &str = r#"{
      "name": "Skimmed Milk Powder",
      "category": "Dairy",
      "DairySimpleSpec": {
        "fat": 1,
        "msnf": 96
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_SIMPLE_SKIMMED_POWDER: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Skimmed Milk Powder".to_string(),
            category: Category::Dairy,
            spec: DairySimpleSpec {
                fat: 1.0,
                msnf: Some(96.0),
                protein: None,
                sucrose: None,
                lactose_free: None,
                solids_source: None,
            }
            .into(),
        });

    pub(crate) static COMP_SKIMMED_POWDER: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(362.28)
            .solids(
                Solids::new().milk(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(1.0).saturated(0.65).trans(0.035))
                        .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(52.32)))
                        .proteins(MilkProteins::new().casein(28.8).whey(7.2))
                        .minerals(7.68),
                ),
            )
            .pod(8.3712)
            .pac(PAC::new().sugars(52.32).msnf_ws_salts(35.2708))
    });

    #[test]
    fn to_composition_dairy_simple_spec_skimmed_powder() {
        let comp = ING_SPEC_DAIRY_SIMPLE_SKIMMED_POWDER.spec.to_composition().unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Energy), 362.28);

        assert_eq!(comp.get(CompKey::MilkFat), 1.0);
        assert_eq_flt_test!(comp.get(CompKey::Lactose), 52.32);
        assert_eq!(comp.get(CompKey::MSNF), 96.0);
        assert_eq_flt_test!(comp.get(CompKey::MilkSNFS), 43.68);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 36.0);
        assert_eq_flt_test!(comp.get(CompKey::Casein), 28.8);
        assert_eq_flt_test!(comp.get(CompKey::Whey), 7.2);
        assert_eq_flt_test!(comp.get(CompKey::MilkMinerals), 7.68);
        assert_eq!(comp.get(CompKey::MilkSolids), 97.0);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 36.0);
        assert_eq!(comp.get(CompKey::TotalSolids), 97.0);
        assert_eq!(comp.get(CompKey::Water), 3.0);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::TotalEmulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::TotalStabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 8.3712);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 52.32);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 35.2708);
        assert_eq_flt_test!(comp.get(CompKey::TotalPAC), 87.5908);

        assert_eq!(comp.get(CompKey::SaturatedFat), 0.65);
        assert_eq!(comp.get(CompKey::TransFat), 0.035);
    }

    pub(crate) const ING_SPEC_DAIRY_SIMPLE_WHOLE_POWDER_STR: &str = r#"{
      "name": "Whole Milk Powder",
      "category": "Dairy",
      "DairySimpleSpec": {
        "fat": 26,
        "msnf": 72
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_SIMPLE_WHOLE_POWDER: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Whole Milk Powder".to_string(),
        category: Category::Dairy,
        spec: DairySimpleSpec {
            fat: 26.0,
            msnf: Some(72.0),
            protein: None,
            sucrose: None,
            lactose_free: None,
            solids_source: None,
        }
        .into(),
    });

    pub(crate) static COMP_WHOLE_POWDER: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(498.96)
            .solids(
                Solids::new().milk(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(26.0).saturated(16.9).trans(0.91))
                        .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(39.24)))
                        .proteins(MilkProteins::new().casein(21.6).whey(5.4))
                        .minerals(5.76),
                ),
            )
            .pod(6.2784)
            .pac(PAC::new().sugars(39.24).msnf_ws_salts(26.4531))
    });

    #[test]
    fn to_composition_dairy_simple_spec_whole_powder() {
        let comp = ING_SPEC_DAIRY_SIMPLE_WHOLE_POWDER.spec.to_composition().unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Energy), 498.96);

        assert_eq!(comp.get(CompKey::MilkFat), 26.0);
        assert_eq_flt_test!(comp.get(CompKey::Lactose), 39.24);
        assert_eq!(comp.get(CompKey::MSNF), 72.0);
        assert_eq_flt_test!(comp.get(CompKey::MilkSNFS), 32.76);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 27.0);
        assert_eq_flt_test!(comp.get(CompKey::Casein), 21.6);
        assert_eq_flt_test!(comp.get(CompKey::Whey), 5.4);
        assert_eq_flt_test!(comp.get(CompKey::MilkMinerals), 5.76);
        assert_eq!(comp.get(CompKey::MilkSolids), 98.0);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 27.0);
        assert_eq!(comp.get(CompKey::TotalSolids), 98.0);
        assert_eq!(comp.get(CompKey::Water), 2.0);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::TotalEmulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::TotalStabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 6.2784);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 39.24);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 26.4531);
        assert_eq_flt_test!(comp.get(CompKey::TotalPAC), 65.6931);

        assert_eq_flt_test!(comp.get(CompKey::SaturatedFat), 16.9);
        assert_eq_flt_test!(comp.get(CompKey::TransFat), 0.91);
    }

    pub(crate) const ING_SPEC_DAIRY_SIMPLE_SKIM_MILK_GOFF_HARTEL_STR: &str = r#"{
      "name": "Goff & Hartel Skim Milk",
      "category": "Dairy",
      "DairySimpleSpec": {
        "fat": 0,
        "msnf": 8.6,
        "protein": 3.2
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_SIMPLE_SKIM_MILK_GOFF_HARTEL: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Goff & Hartel Skim Milk".to_string(),
            category: Category::Dairy,
            spec: DairySimpleSpec {
                fat: 0.0,
                msnf: Some(8.6),
                protein: Some(3.2),
                sucrose: None,
                lactose_free: None,
                solids_source: None,
            }
            .into(),
        });

    pub(crate) static COMP_SKIM_MILK_GOFF_HARTEL: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(31.6465)
            .solids(
                Solids::new().milk(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(0.0))
                        .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(4.7116)))
                        .proteins(MilkProteins::new().casein(2.56).whey(0.64))
                        .minerals(0.6884),
                ),
            )
            .pod(0.7539)
            .pac(PAC::new().sugars(4.7116).msnf_ws_salts(3.1597))
    });

    #[test]
    fn to_composition_dairy_simple_spec_skim_milk_goff_hartel() {
        let comp = ING_SPEC_DAIRY_SIMPLE_SKIM_MILK_GOFF_HARTEL
            .spec
            .to_composition()
            .unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Energy), 31.6465);

        assert_eq!(comp.get(CompKey::MilkFat), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::Lactose), 4.7116);
        assert_eq_flt_test!(comp.get(CompKey::MSNF), 8.6);
        assert_eq_flt_test!(comp.get(CompKey::MilkSNFS), 3.8884);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 3.2);
        assert_eq_flt_test!(comp.get(CompKey::Casein), 2.56);
        assert_eq_flt_test!(comp.get(CompKey::Whey), 0.64);
        assert_eq_flt_test!(comp.get(CompKey::MilkMinerals), 0.6884);
        assert_eq_flt_test!(comp.get(CompKey::MilkSolids), 8.6);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 3.2);
        assert_eq_flt_test!(comp.get(CompKey::TotalSolids), 8.6);
        assert_eq!(comp.get(CompKey::Water), 91.4);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::TotalEmulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::TotalStabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 0.7539);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 4.7116);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 3.1597);
        assert_eq_flt_test!(comp.get(CompKey::TotalPAC), 7.8713);

        assert_eq!(comp.get(CompKey::SaturatedFat), 0.0);
        assert_eq!(comp.get(CompKey::TransFat), 0.0);
    }

    // https://fdc.nal.usda.gov/food-details/746782/nutrients
    pub(crate) const ING_SPEC_DAIRY_SHEET_WHOLE_MILK_USDA_STR: &str = r#"{
      "name": "USDA Whole Milk",
      "category": "Dairy",
      "DairySheetSpec": {
        "water": 88.1,
        "energy": 61,
        "fat": 3.2,
        "saturated_fat": 1.86,
        "trans_fat": 0.112,
        "sugars": { "lactose": 4.81 },
        "protein": 3.27,
        "ash": 0.8
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_SHEET_WHOLE_MILK_USDA: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "USDA Whole Milk".to_string(),
            category: Category::Dairy,
            spec: DairySheetSpec {
                water: 88.1,
                energy: Some(61.0),
                fat: 3.2,
                saturated_fat: Some(1.86),
                trans_fat: Some(0.112),
                sugars: Sugars::new().lactose(4.81),
                protein: 3.27,
                casein: None,
                ash: Some(0.8),
                solids_source: None,
            }
            .into(),
        });

    pub(crate) static COMP_WHOLE_MILK_USDA: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(61.0)
            .solids(
                Solids::new().milk(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(3.2).saturated(1.86).trans(0.112))
                        .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(4.81)))
                        .proteins(MilkProteins::new().casein(2.616).whey(0.654))
                        .minerals(0.8),
                ),
            )
            .pod(0.7696)
            .pac(PAC::new().sugars(4.81).msnf_ws_salts(3.2625))
    });

    #[test]
    fn to_composition_dairy_sheet_spec_whole_milk_usda() {
        // Its proximates sum to 100.18 g, so the water gives way to the listed solids, to 87.92 g
        let comp = ING_SPEC_DAIRY_SHEET_WHOLE_MILK_USDA.spec.to_composition().unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Energy), 61.0);

        assert_eq!(comp.get(CompKey::MilkFat), 3.2);
        assert_eq_flt_test!(comp.get(CompKey::Lactose), 4.81);
        assert_eq_flt_test!(comp.get(CompKey::MSNF), 8.88);
        assert_eq_flt_test!(comp.get(CompKey::MilkSNFS), 4.07);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 3.27);
        assert_eq_flt_test!(comp.get(CompKey::Casein), 2.616);
        assert_eq_flt_test!(comp.get(CompKey::Whey), 0.654);
        assert_eq_flt_test!(comp.get(CompKey::MilkMinerals), 0.8);
        assert_eq_flt_test!(comp.get(CompKey::MilkSolids), 12.08);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 3.27);
        assert_eq_flt_test!(comp.get(CompKey::TotalSolids), 12.08);
        assert_eq_flt_test!(comp.get(CompKey::Water), 87.92);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::TotalEmulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::TotalStabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 0.7696);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 4.81);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 3.2625);
        assert_eq_flt_test!(comp.get(CompKey::TotalPAC), 8.0725);

        assert_eq_flt_test!(comp.get(CompKey::SaturatedFat), 1.86);
        assert_eq_flt_test!(comp.get(CompKey::TransFat), 0.112);
    }

    // https://www.sealtest.ca/en/products/milks/325-milk
    pub(crate) const ING_SPEC_DAIRY_LABEL_3_25_MILK_SEALTEST_STR: &str = r#"{
      "name": "Sealtest 3.25% Milk",
      "category": "Dairy",
      "DairyLabelSpec": {
        "serving_size": { "ml": 250 },
        "energy": 160,
        "total_fat": { "percent": 3.25 },
        "saturated_fat": 5,
        "trans_fat": 0.3,
        "sugars": 13,
        "protein": 9
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_LABEL_3_25_MILK_SEALTEST: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Sealtest 3.25% Milk".to_string(),
            category: Category::Dairy,
            spec: DairyLabelSpec {
                serving_size: Unit::Milliliters(250.0), // 257.6667 grams
                energy: Some(160.0),
                total_fat: Unit::Percent(3.25), // 3.25% is 8.3742g, not 8g
                saturated_fat: Some(5.0),
                trans_fat: Some(0.3),
                carbohydrates: None,
                sugars: 13.0,
                protein: 9.0,
                lactose_free: None,
                sucrose: None,
                solids_source: None,
            }
            .into(),
        });

    pub(crate) static COMP_3_25_MILK_SEALTEST: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(61.9859)
            .solids(
                Solids::new().milk(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(3.25).saturated(1.9371).trans(0.1162))
                        .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(5.0364)))
                        .proteins(MilkProteins::new().casein(2.7894).whey(0.6973))
                        .minerals(0.7409),
                ),
            )
            .pod(0.8058)
            .pac(PAC::new().sugars(5.0364).msnf_ws_salts(3.4036))
    });

    #[test]
    fn to_composition_dairy_label_spec_3_25_milk_sealtest() {
        let comp = ING_SPEC_DAIRY_LABEL_3_25_MILK_SEALTEST.spec.to_composition().unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Energy), 61.9859);

        assert_eq_flt_test!(comp.get(CompKey::MilkFat), 3.25);
        assert_eq_flt_test!(comp.get(CompKey::Lactose), 5.0364);
        assert_eq_flt_test!(comp.get(CompKey::MSNF), 9.264);
        assert_eq_flt_test!(comp.get(CompKey::MilkSNFS), 4.2276);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 3.4867);
        assert_eq_flt_test!(comp.get(CompKey::Casein), 2.7894);
        assert_eq_flt_test!(comp.get(CompKey::Whey), 0.6973);
        assert_eq_flt_test!(comp.get(CompKey::MilkMinerals), 0.7409);
        assert_eq_flt_test!(comp.get(CompKey::MilkSolids), 12.514);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 3.4867);
        assert_eq_flt_test!(comp.get(CompKey::TotalSolids), 12.514);
        assert_eq_flt_test!(comp.get(CompKey::Water), 87.486);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::TotalEmulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::TotalStabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 0.8058);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 5.0364);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 3.4036);
        assert_eq_flt_test!(comp.get(CompKey::TotalPAC), 8.44);

        assert_eq_flt_test!(comp.get(CompKey::SaturatedFat), 1.9371);
        assert_eq_flt_test!(comp.get(CompKey::TransFat), 0.1162);
    }

    // https://fairlife.com/ultra-filtered-milk/whole-milk/
    pub(crate) const ING_SPEC_DAIRY_LABEL_WHOLE_ULTRA_FILTERED_LACTOSE_FREE_STR: &str = r#"{
      "name": "Fairlife Whole Ultra-Filtered Lactose-Free Milk",
      "category": "Dairy",
      "DairyLabelSpec": {
        "serving_size": { "ml": 240 },
        "energy": 150,
        "total_fat": { "grams": 8 },
        "saturated_fat": 5,
        "sugars": 6,
        "protein": 13,
        "lactose_free": true
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_LABEL_WHOLE_ULTRA_FILTERED_LACTOSE_FREE: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Fairlife Whole Ultra-Filtered Lactose-Free Milk".to_string(),
            category: Category::Dairy,
            spec: DairyLabelSpec {
                serving_size: Unit::Milliliters(240.0), // 245.1288 grams
                energy: Some(150.0),
                total_fat: Unit::Grams(8.0), // 8g is 3.2636%
                saturated_fat: Some(5.0),
                trans_fat: None,
                carbohydrates: None,
                sugars: 6.0,
                protein: 13.0,
                lactose_free: Some(true),
                sucrose: None,
                solids_source: None,
            }
            .into(),
        });

    pub(crate) static COMP_WHOLE_ULTRA_FILTERED_LACTOSE_FREE: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(60.5315)
            .solids(
                Solids::new().milk(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(3.2283).saturated(2.0177).trans(0.1130))
                        .carbohydrates(Carbohydrates::new().sugars(Sugars::new().glucose(1.2106).galactose(1.2106)))
                        .proteins(MilkProteins::new().casein(4.1968).whey(1.0492))
                        .minerals(0.6321),
                ),
            )
            .pod(1.7554)
            .pac(PAC::new().sugars(4.6004).msnf_ws_salts(3.0492))
    });

    #[test]
    fn to_composition_dairy_simple_spec_whole_ultra_filtered_lactose_free() {
        let comp = ING_SPEC_DAIRY_LABEL_WHOLE_ULTRA_FILTERED_LACTOSE_FREE
            .spec
            .to_composition()
            .unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Energy), 60.5315);

        assert_eq_flt_test!(comp.get(CompKey::MilkFat), 3.2283);
        assert_eq_flt_test!(comp.get(CompKey::Lactose), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::Glucose), 1.2106);
        assert_eq_flt_test!(comp.get(CompKey::Galactose), 1.2106);
        assert_eq_flt_test!(comp.get(CompKey::MSNF), 8.2994);
        assert_eq_flt_test!(comp.get(CompKey::MilkSNFS), 5.8782);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 5.2461);
        assert_eq_flt_test!(comp.get(CompKey::Casein), 4.1968);
        assert_eq_flt_test!(comp.get(CompKey::Whey), 1.0492);
        assert_eq_flt_test!(comp.get(CompKey::MilkMinerals), 0.6321);
        assert_eq_flt_test!(comp.get(CompKey::MilkSolids), 11.5278);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 5.2461);
        assert_eq_flt_test!(comp.get(CompKey::TotalSolids), 11.5278);
        assert_eq_flt_test!(comp.get(CompKey::Water), 88.4722);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::TotalEmulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::TotalStabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 1.7554);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 4.6004);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 3.0492);
        assert_eq_flt_test!(comp.get(CompKey::TotalPAC), 7.6496);

        assert_eq_flt_test!(comp.get(CompKey::SaturatedFat), 2.0177);
        assert_eq_flt_test!(comp.get(CompKey::TransFat), 0.1130);
    }

    // https://www.lactantia.ca/food_product/lactantia-ultrapur-2-20g-protein-1-5l/
    pub(crate) const ING_SPEC_DAIRY_LABEL_2_ULTRAFILTERED_MILK_LACTANTIA_STR: &str = r#"{
      "name": "Lactantia UltraPur 2% Ultrafiltered Lactose-Free Milk",
      "category": "Dairy",
      "DairyLabelSpec": {
        "serving_size": { "ml": 250 },
        "energy": 170,
        "total_fat": { "grams": 5 },
        "saturated_fat": 3.5,
        "trans_fat": 0.2,
        "carbohydrates": 11,
        "sugars": 10,
        "protein": 20,
        "lactose_free": true
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_LABEL_2_ULTRAFILTERED_MILK_LACTANTIA: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Lactantia UltraPur 2% Ultrafiltered Lactose-Free Milk".to_string(),
            category: Category::Dairy,
            spec: DairyLabelSpec {
                serving_size: Unit::Milliliters(250.0), // 261.9516 grams
                energy: Some(170.0),
                total_fat: Unit::Grams(5.0), // 5g is 1.9087%
                saturated_fat: Some(3.5),
                trans_fat: Some(0.2),
                carbohydrates: Some(11.0),
                sugars: 10.0,
                protein: 20.0,
                lactose_free: Some(true),
                sucrose: None,
                solids_source: None,
            }
            .into(),
        });

    pub(crate) static COMP_2_ULTRAFILTERED_MILK_LACTANTIA: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(64.8975)
            .solids(
                Solids::new()
                    .milk(
                        SolidsBreakdown::new()
                            .fats(Fats::new().total(1.9087).saturated(1.3361).trans(0.0763))
                            .carbohydrates(Carbohydrates::new().sugars(Sugars::new().glucose(1.9087).galactose(1.9087)))
                            .proteins(MilkProteins::new().casein(6.108).whey(1.527))
                            .minerals(0.9474),
                    )
                    .other(SolidsBreakdown::new().carbohydrates(Carbohydrates::new().others(0.3817))),
            )
            .pod(2.7677)
            .pac(PAC::new().sugars(7.2532).msnf_ws_salts(4.5558))
    });

    #[test]
    fn to_composition_dairy_label_spec_2_ultrafiltered_milk_lactantia() {
        let comp = ING_SPEC_DAIRY_LABEL_2_ULTRAFILTERED_MILK_LACTANTIA
            .spec
            .to_composition()
            .unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Energy), 64.8975);

        assert_eq_flt_test!(comp.get(CompKey::MilkFat), 1.9087);
        assert_eq_flt_test!(comp.get(CompKey::Lactose), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::Glucose), 1.9087);
        assert_eq_flt_test!(comp.get(CompKey::Galactose), 1.9087);
        assert_eq_flt_test!(comp.get(CompKey::MSNF), 12.3999);
        assert_eq_flt_test!(comp.get(CompKey::MilkSNFS), 8.5824);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 7.635);
        assert_eq_flt_test!(comp.get(CompKey::Casein), 6.108);
        assert_eq_flt_test!(comp.get(CompKey::Whey), 1.527);
        assert_eq_flt_test!(comp.get(CompKey::MilkMinerals), 0.9474);
        assert_eq_flt_test!(comp.get(CompKey::MilkSolids), 14.3087);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 7.635);
        assert_eq_flt_test!(comp.get(CompKey::TotalSolids), 14.6904);
        assert_eq_flt_test!(comp.get(CompKey::Water), 85.3096);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::TotalEmulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::TotalStabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 2.7677);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 7.2532);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 4.5558);
        assert_eq_flt_test!(comp.get(CompKey::TotalPAC), 11.809);

        assert_eq_flt_test!(comp.get(CompKey::SaturatedFat), 1.3361);
        assert_eq_flt_test!(comp.get(CompKey::TransFat), 0.0763);
    }

    // https://fdc.nal.usda.gov/food-details/2705400/nutrients
    pub(crate) const ING_SPEC_DAIRY_SHEET_2_EVAPORATED_MILK_USDA_STR: &str = r#"{
      "name": "USDA 2% Reduced-Fat Evaporated Milk",
      "category": "Dairy",
      "DairySheetSpec": {
        "water": 78,
        "energy": 92,
        "fat": 1.96,
        "saturated_fat": 1.214,
        "sugars": { "lactose": 11.15 },
        "protein": 7.42
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_SHEET_2_EVAPORATED_MILK_USDA: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "USDA 2% Reduced-Fat Evaporated Milk".to_string(),
            category: Category::Dairy,
            spec: DairySheetSpec {
                water: 78.0,
                energy: Some(92.0),
                fat: 1.96,
                saturated_fat: Some(1.214),
                trans_fat: None,
                sugars: Sugars::new().lactose(11.15),
                protein: 7.42,
                casein: None,
                ash: None,
                solids_source: None,
            }
            .into(),
        });

    pub(crate) static COMP_2_EVAPORATED_MILK_USDA: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(92.0)
            .solids(
                Solids::new().milk(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(1.96).saturated(1.214).trans(0.0686))
                        .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(11.15)))
                        .proteins(MilkProteins::new().casein(5.936).whey(1.484))
                        .minerals(1.47),
                ),
            )
            .pod(1.784)
            .pac(PAC::new().sugars(11.15).msnf_ws_salts(7.3628))
    });

    #[test]
    fn to_composition_dairy_sheet_spec_2_evaporated_milk_usda() {
        let comp = ING_SPEC_DAIRY_SHEET_2_EVAPORATED_MILK_USDA
            .spec
            .to_composition()
            .unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Energy), 92.0);

        assert_eq!(comp.get(CompKey::MilkFat), 1.96);
        assert_eq_flt_test!(comp.get(CompKey::Lactose), 11.15);
        assert_eq_flt_test!(comp.get(CompKey::MSNF), 20.04);
        assert_eq_flt_test!(comp.get(CompKey::MilkSNFS), 8.89);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 7.42);
        assert_eq_flt_test!(comp.get(CompKey::Casein), 5.936);
        assert_eq_flt_test!(comp.get(CompKey::Whey), 1.484);
        assert_eq_flt_test!(comp.get(CompKey::MilkMinerals), 1.47);
        assert_eq_flt_test!(comp.get(CompKey::MilkSolids), 22.0);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 7.42);
        assert_eq_flt_test!(comp.get(CompKey::TotalSolids), 22.0);
        assert_eq_flt_test!(comp.get(CompKey::Water), 78.0);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::TotalEmulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::TotalStabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 1.784);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 11.15);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 7.3628);
        assert_eq_flt_test!(comp.get(CompKey::TotalPAC), 18.5128);

        assert_eq_flt_test!(comp.get(CompKey::SaturatedFat), 1.214);
        assert_eq_flt_test!(comp.get(CompKey::TransFat), 0.0686);
    }

    // https://www.carnationmilk.ca/en/products/2-partly-skimmed
    pub(crate) const ING_SPEC_DAIRY_LABEL_2_EVAPORATED_MILK_CARNATION_STR: &str = r#"{
      "name": "Carnation 2% Evaporated Partly Skimmed Milk",
      "category": "Dairy",
      "DairyLabelSpec": {
        "serving_size": { "ml": 15 },
        "energy": 15,
        "total_fat": { "percent": 2 },
        "saturated_fat": 0.2,
        "carbohydrates": 2,
        "sugars": 1,
        "protein": 1
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_LABEL_2_EVAPORATED_MILK_CARNATION: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Carnation 2% Evaporated Partly Skimmed Milk".to_string(),
            category: Category::Dairy,
            spec: DairyLabelSpec {
                serving_size: Unit::Milliliters(15.0),
                energy: Some(15.0),
                total_fat: Unit::Percent(2.0),
                saturated_fat: Some(0.2),
                trans_fat: None,
                carbohydrates: Some(2.0),
                sugars: 1.0,
                protein: 1.0,
                lactose_free: None,
                sucrose: None,
                solids_source: None,
            }
            .into(),
        });

    pub(crate) static COMP_2_EVAPORATED_MILK_CARNATION: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(94.9619)
            .solids(
                Solids::new()
                    .milk(
                        SolidsBreakdown::new()
                            .fats(Fats::new().total(2.0).saturated(1.2662).trans(0.07))
                            .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(6.3308)))
                            .proteins(MilkProteins::new().casein(5.0646).whey(1.2662))
                            .minerals(1.0819),
                    )
                    .other(SolidsBreakdown::new().carbohydrates(Carbohydrates::new().others(6.3308))),
            )
            .pod(1.0129)
            .pac(PAC::new().sugars(6.3308).msnf_ws_salts(5.0494))
    });

    #[test]
    fn to_composition_dairy_label_spec_2_evaporated_milk_carnation() {
        let comp = ING_SPEC_DAIRY_LABEL_2_EVAPORATED_MILK_CARNATION
            .spec
            .to_composition()
            .unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Energy), 94.9619);

        assert_eq_flt_test!(comp.get(CompKey::MilkFat), 2.0);
        assert_eq_flt_test!(comp.get(CompKey::Lactose), 6.3308);
        assert_eq_flt_test!(comp.get(CompKey::MSNF), 13.7435);
        assert_eq_flt_test!(comp.get(CompKey::MilkSNFS), 7.4127);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 6.3308);
        assert_eq_flt_test!(comp.get(CompKey::Casein), 5.0646);
        assert_eq_flt_test!(comp.get(CompKey::Whey), 1.2662);
        assert_eq_flt_test!(comp.get(CompKey::MilkMinerals), 1.0819);
        assert_eq_flt_test!(comp.get(CompKey::MilkSolids), 15.7435);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 6.3308);
        assert_eq_flt_test!(comp.get(CompKey::TotalSolids), 22.0743);
        assert_eq_flt_test!(comp.get(CompKey::Water), 77.9257);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::TotalEmulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::TotalStabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 1.0129);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 6.3308);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 5.0494);
        assert_eq_flt_test!(comp.get(CompKey::TotalPAC), 11.3802);

        assert_eq_flt_test!(comp.get(CompKey::SaturatedFat), 1.2662);
        assert_eq_flt_test!(comp.get(CompKey::TransFat), 0.07);
    }

    // https://fdc.nal.usda.gov/food-details/171275/nutrients
    // https://fdc.nal.usda.gov/food-details/2758990/nutrients
    pub(crate) const ING_SPEC_DAIRY_SHEET_SWEETENED_CONDENSED_MILK_USDA_STR: &str = r#"{
      "name": "USDA Sweetened Condensed Milk",
      "category": "Dairy",
      "DairySheetSpec": {
        "water": 27.2,
        "energy": 321,
        "fat": 8.7,
        "saturated_fat": 5.49,
        "sugars": { "lactose": 9.6, "sucrose": 44.8 },
        "protein": 7.91,
        "ash": 1.83
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_SHEET_SWEETENED_CONDENSED_MILK_USDA: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "USDA Sweetened Condensed Milk".to_string(),
            category: Category::Dairy,
            spec: DairySheetSpec {
                water: 27.2,
                energy: Some(321.0),
                fat: 8.7,
                saturated_fat: Some(5.49),
                trans_fat: None,
                sugars: Sugars::new().lactose(9.6).sucrose(44.8),
                protein: 7.91,
                casein: None,
                ash: Some(1.83),
                solids_source: None,
            }
            .into(),
        });

    pub(crate) static COMP_SWEETENED_CONDENSED_MILK_USDA: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(321.0)
            .solids(
                Solids::new()
                    .milk(
                        SolidsBreakdown::new()
                            .fats(Fats::new().total(8.7).saturated(5.49).trans(0.3045))
                            .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(9.6)))
                            .proteins(MilkProteins::new().casein(6.328).whey(1.582))
                            .minerals(1.83),
                    )
                    .other(
                        SolidsBreakdown::new().carbohydrates(Carbohydrates::new().sugars(Sugars::new().sucrose(44.8))),
                    ),
            )
            .pod(46.336)
            .pac(PAC::new().sugars(54.4).msnf_ws_salts(7.1056))
    });

    #[test]
    fn to_composition_dairy_sheet_spec_sweetened_condensed_milk_usda() {
        // Its proximates sum to 100.04 g, so the water gives way to the listed solids, to 27.16 g
        let comp = ING_SPEC_DAIRY_SHEET_SWEETENED_CONDENSED_MILK_USDA
            .spec
            .to_composition()
            .unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Energy), 321.0);

        assert_eq!(comp.get(CompKey::MilkFat), 8.7);
        assert_eq_flt_test!(comp.get(CompKey::Lactose), 9.6);
        assert_eq_flt_test!(comp.get(CompKey::MSNF), 19.34);
        assert_eq_flt_test!(comp.get(CompKey::MilkSNFS), 9.74);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 7.91);
        assert_eq_flt_test!(comp.get(CompKey::Casein), 6.328);
        assert_eq_flt_test!(comp.get(CompKey::Whey), 1.582);
        assert_eq_flt_test!(comp.get(CompKey::MilkMinerals), 1.83);
        assert_eq_flt_test!(comp.get(CompKey::MilkSolids), 28.04);

        assert_eq_flt_test!(comp.get(CompKey::Sucrose), 44.8);
        assert_eq_flt_test!(comp.get(CompKey::TotalSugars), 54.4);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 7.91);
        assert_eq_flt_test!(comp.get(CompKey::TotalSolids), 72.84);
        assert_eq_flt_test!(comp.get(CompKey::Water), 27.16);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::TotalEmulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::TotalStabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 46.336);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 54.4);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 7.1056);
        assert_eq_flt_test!(comp.get(CompKey::TotalPAC), 61.5056);

        assert_eq_flt_test!(comp.get(CompKey::SaturatedFat), 5.49);
        assert_eq_flt_test!(comp.get(CompKey::TransFat), 0.3045);
    }

    // https://www.eaglebrand.ca/en/products/original
    pub(crate) const ING_SPEC_DAIRY_LABEL_SWEETENED_CONDENSED_MILK_EAGLE_BRAND_STR: &str = r#"{
      "name": "Eagle Brand Original Sweetened Condensed Milk",
      "category": "Dairy",
      "DairyLabelSpec": {
        "serving_size": { "ml": 15 },
        "energy": 70,
        "total_fat": { "grams": 1.5 },
        "saturated_fat": 1.0,
        "sugars": 11,
        "protein": 1,
        "sucrose": 8.81
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_LABEL_SWEETENED_CONDENSED_MILK_EAGLE_BRAND: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Eagle Brand Original Sweetened Condensed Milk".to_string(),
            category: Category::Dairy,
            spec: DairyLabelSpec {
                serving_size: Unit::Milliliters(15.0),
                energy: Some(70.0),
                total_fat: Unit::Grams(1.5),
                saturated_fat: Some(1.0),
                trans_fat: None,
                carbohydrates: None,
                sugars: 11.0,
                protein: 1.0,
                lactose_free: None,
                sucrose: Some(8.81), // estimated 45% of total, based on USDA
                solids_source: None,
            }
            .into(),
        });

    pub(crate) static COMP_SWEETENED_CONDENSED_MILK_EAGLE_BRAND: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(360.7362)
            .solids(
                Solids::new()
                    .milk(
                        SolidsBreakdown::new()
                            .fats(Fats::new().total(7.7301).saturated(5.1534).trans(0.2706))
                            .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(11.2859)))
                            .proteins(MilkProteins::new().casein(4.1227).whey(1.0307))
                            .minerals(1.4548),
                    )
                    .other(
                        SolidsBreakdown::new()
                            .carbohydrates(Carbohydrates::new().sugars(Sugars::new().sucrose(45.4012))),
                    ),
            )
            .pod(47.207)
            .pac(PAC::new().sugars(56.6871).msnf_ws_salts(6.5743))
    });

    #[test]
    fn to_composition_dairy_label_spec_sweetened_condensed_milk_eagle_brand() {
        let comp = ING_SPEC_DAIRY_LABEL_SWEETENED_CONDENSED_MILK_EAGLE_BRAND
            .spec
            .to_composition()
            .unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Energy), 360.7362);

        assert_eq_flt_test!(comp.get(CompKey::MilkFat), 7.7301);
        assert_eq_flt_test!(comp.get(CompKey::Lactose), 11.2859);
        assert_eq_flt_test!(comp.get(CompKey::MSNF), 17.894);
        assert_eq_flt_test!(comp.get(CompKey::MilkSNFS), 6.6081);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 5.1534);
        assert_eq_flt_test!(comp.get(CompKey::Casein), 4.1227);
        assert_eq_flt_test!(comp.get(CompKey::Whey), 1.0307);
        assert_eq_flt_test!(comp.get(CompKey::MilkMinerals), 1.4548);
        assert_eq_flt_test!(comp.get(CompKey::MilkSolids), 25.6241);

        assert_eq_flt_test!(comp.get(CompKey::Sucrose), 45.4012);
        assert_eq_flt_test!(comp.get(CompKey::TotalSugars), 56.6871);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 5.1534);
        assert_eq_flt_test!(comp.get(CompKey::TotalSolids), 71.0253);
        assert_eq_flt_test!(comp.get(CompKey::Water), 28.9747);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::TotalEmulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::TotalStabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 47.207);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 56.6871);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 6.5743);
        assert_eq_flt_test!(comp.get(CompKey::TotalPAC), 63.2615);

        assert_eq_flt_test!(comp.get(CompKey::SaturatedFat), 5.1534);
        assert_eq_flt_test!(comp.get(CompKey::TransFat), 0.2706);
    }

    // https://www.medallionmilk.com/products/skim-milk-powder-500g-bag
    pub(crate) const ING_SPEC_DAIRY_LABEL_SKIM_MILK_POWDER_MEDALLION_STR: &str = r#"{
      "name": "Medallion Skim Milk Powder",
      "category": "Dairy",
      "DairyLabelSpec": {
        "serving_size": { "grams": 25 },
        "energy": 90,
        "total_fat": { "grams": 0 },
        "carbohydrates": 13,
        "sugars": 12,
        "protein": 9
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_LABEL_SKIM_MILK_POWDER_MEDALLION: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Medallion Skim Milk Powder".to_string(),
            category: Category::Dairy,
            spec: DairyLabelSpec {
                serving_size: Unit::Grams(25.0),
                energy: Some(90.0),
                total_fat: Unit::Grams(0.0),
                saturated_fat: None,
                trans_fat: None,
                carbohydrates: Some(13.0),
                sugars: 12.0,
                protein: 9.0,
                lactose_free: None,
                sucrose: None,
                solids_source: None,
            }
            .into(),
        });

    pub(crate) static COMP_SKIM_MILK_POWDER_MEDALLION: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(360.0)
            .solids(
                Solids::new()
                    .milk(
                        SolidsBreakdown::new()
                            .fats(Fats::new().total(0.0))
                            .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(48.0)))
                            .proteins(MilkProteins::new().casein(28.8).whey(7.2))
                            .minerals(7.2756),
                    )
                    .other(SolidsBreakdown::new().carbohydrates(Carbohydrates::new().others(4.0))),
            )
            .pod(7.68)
            .pac(PAC::new().sugars(48.0).msnf_ws_salts(33.535))
    });

    #[test]
    fn to_composition_dairy_label_spec_skim_milk_powder_medallion() {
        let comp = ING_SPEC_DAIRY_LABEL_SKIM_MILK_POWDER_MEDALLION
            .spec
            .to_composition()
            .unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Energy), 360.0);

        assert_eq!(comp.get(CompKey::MilkFat), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::Lactose), 48.0);
        assert_eq_flt_test!(comp.get(CompKey::MSNF), 91.2756);
        assert_eq_flt_test!(comp.get(CompKey::MilkSNFS), 43.2756);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 36.0);
        assert_eq_flt_test!(comp.get(CompKey::Casein), 28.8);
        assert_eq_flt_test!(comp.get(CompKey::Whey), 7.2);
        assert_eq_flt_test!(comp.get(CompKey::MilkMinerals), 7.2756);
        assert_eq_flt_test!(comp.get(CompKey::MilkSolids), 91.2756);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 36.0);
        assert_eq_flt_test!(comp.get(CompKey::TotalSolids), 95.2756);
        assert_eq_flt_test!(comp.get(CompKey::Water), 4.7244);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::TotalEmulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::TotalStabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 7.68);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 48.0);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 33.535);
        assert_eq_flt_test!(comp.get(CompKey::TotalPAC), 81.535);

        assert_eq!(comp.get(CompKey::SaturatedFat), 0.0);
        assert_eq!(comp.get(CompKey::TransFat), 0.0);
    }

    // https://www.medallionmilk.com/products/whole-milk-powder-500g-bag
    pub(crate) const ING_SPEC_DAIRY_LABEL_WHOLE_MILK_POWDER_MEDALLION_STR: &str = r#"{
      "name": "Medallion Whole Milk Powder",
      "category": "Dairy",
      "DairyLabelSpec": {
        "serving_size": { "grams": 30 },
        "energy": 150,
        "total_fat": { "grams": 8 },
        "saturated_fat": 5,
        "sugars": 11,
        "protein": 8
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_LABEL_WHOLE_MILK_POWDER_MEDALLION: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Medallion Whole Milk Powder".to_string(),
            category: Category::Dairy,
            spec: DairyLabelSpec {
                serving_size: Unit::Grams(30.0),
                energy: Some(150.0),
                total_fat: Unit::Grams(8.0),
                saturated_fat: Some(5.0),
                trans_fat: None,
                carbohydrates: None,
                sugars: 11.0,
                protein: 8.0,
                lactose_free: None,
                sucrose: None,
                solids_source: None,
            }
            .into(),
        });

    pub(crate) static COMP_WHOLE_MILK_POWDER_MEDALLION: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(500.0)
            .solids(
                Solids::new().milk(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(26.6667).saturated(16.6667).trans(0.9333))
                        .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(36.6667)))
                        .proteins(MilkProteins::new().casein(21.3333).whey(5.3333))
                        .minerals(5.4933),
                ),
            )
            .pod(5.8667)
            .pac(PAC::new().sugars(36.6667).msnf_ws_salts(25.2872))
    });

    #[test]
    fn to_composition_dairy_label_spec_whole_milk_powder_medallion() {
        let comp = ING_SPEC_DAIRY_LABEL_WHOLE_MILK_POWDER_MEDALLION
            .spec
            .to_composition()
            .unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Energy), 500.0);

        assert_eq_flt_test!(comp.get(CompKey::MilkFat), 26.6667);
        assert_eq_flt_test!(comp.get(CompKey::Lactose), 36.6667);
        assert_eq_flt_test!(comp.get(CompKey::MSNF), 68.8267);
        assert_eq_flt_test!(comp.get(CompKey::MilkSNFS), 32.16);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 26.6667);
        assert_eq_flt_test!(comp.get(CompKey::Casein), 21.3333);
        assert_eq_flt_test!(comp.get(CompKey::Whey), 5.3333);
        assert_eq_flt_test!(comp.get(CompKey::MilkMinerals), 5.4933);
        assert_eq_flt_test!(comp.get(CompKey::MilkSolids), 95.4933);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 26.6667);
        assert_eq_flt_test!(comp.get(CompKey::TotalSolids), 95.4933);
        assert_eq_flt_test!(comp.get(CompKey::Water), 4.5067);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::TotalEmulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::TotalStabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 5.8667);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 36.6667);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 25.2872);
        assert_eq_flt_test!(comp.get(CompKey::TotalPAC), 61.9539);

        assert_eq_flt_test!(comp.get(CompKey::SaturatedFat), 16.6667);
        assert_eq_flt_test!(comp.get(CompKey::TransFat), 0.9333);
    }

    pub(crate) const ING_SPEC_DAIRY_LABEL_SKIM_MILK_POWDER_THELAND_STR: &str = r#"{
      "name": "Theland Skim Milk Powder",
      "category": "Dairy",
      "DairyLabelSpec": {
        "serving_size": { "grams": 25 },
        "energy": 92,
        "total_fat": { "grams": 0.3 },
        "sugars": 13.3,
        "protein": 8.7
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_LABEL_SKIM_MILK_POWDER_THELAND: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Theland Skim Milk Powder".to_string(),
            category: Category::Dairy,
            spec: DairyLabelSpec {
                serving_size: Unit::Grams(25.0),
                energy: Some(92.0),
                total_fat: Unit::Grams(0.3),
                saturated_fat: None,
                trans_fat: None,
                carbohydrates: None,
                sugars: 13.3,
                protein: 8.7,
                lactose_free: None,
                sucrose: None,
                solids_source: None,
            }
            .into(),
        });

    pub(crate) static COMP_SKIM_MILK_POWDER_THELAND: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(368.0)
            .solids(
                Solids::new().milk(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(1.2).saturated(0.78).trans(0.042))
                        .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(53.2)))
                        .proteins(MilkProteins::new().casein(27.84).whey(6.96))
                        .minerals(7.6696),
                ),
            )
            .pod(8.512)
            .pac(PAC::new().sugars(53.2).msnf_ws_salts(35.1494))
    });

    #[test]
    fn to_composition_dairy_label_spec_skim_milk_powder_theland() {
        let comp = ING_SPEC_DAIRY_LABEL_SKIM_MILK_POWDER_THELAND
            .spec
            .to_composition()
            .unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Energy), 368.0);

        assert_eq_flt_test!(comp.get(CompKey::MilkFat), 1.2);
        assert_eq_flt_test!(comp.get(CompKey::Lactose), 53.2);
        assert_eq_flt_test!(comp.get(CompKey::MSNF), 95.6696);
        assert_eq_flt_test!(comp.get(CompKey::MilkSNFS), 42.4696);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 34.8);
        assert_eq_flt_test!(comp.get(CompKey::Casein), 27.84);
        assert_eq_flt_test!(comp.get(CompKey::Whey), 6.96);
        assert_eq_flt_test!(comp.get(CompKey::MilkMinerals), 7.6696);
        assert_eq_flt_test!(comp.get(CompKey::MilkSolids), 96.8696);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 34.8);
        assert_eq_flt_test!(comp.get(CompKey::TotalSolids), 96.8696);
        assert_eq_flt_test!(comp.get(CompKey::Water), 3.1304);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::TotalEmulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::TotalStabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 8.512);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 53.2);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 35.1494);
        assert_eq_flt_test!(comp.get(CompKey::TotalPAC), 88.3494);

        assert_eq_flt_test!(comp.get(CompKey::SaturatedFat), 0.78);
        assert_eq_flt_test!(comp.get(CompKey::TransFat), 0.042);
    }

    pub(crate) const ING_SPEC_DAIRY_LABEL_WHOLE_MILK_POWDER_THELAND_STR: &str = r#"{
      "name": "Theland Whole Milk Powder",
      "category": "Dairy",
      "DairyLabelSpec": {
        "serving_size": { "grams": 25 },
        "energy": 131,
        "total_fat": { "grams": 7.4 },
        "sugars": 9.8,
        "protein": 6.3
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_LABEL_WHOLE_MILK_POWDER_THELAND: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Theland Whole Milk Powder".to_string(),
            category: Category::Dairy,
            spec: DairyLabelSpec {
                serving_size: Unit::Grams(25.0),
                energy: Some(131.0),
                total_fat: Unit::Grams(7.4),
                saturated_fat: None,
                trans_fat: None,
                carbohydrates: None,
                sugars: 9.8,
                protein: 6.3,
                lactose_free: None,
                sucrose: None,
                solids_source: None,
            }
            .into(),
        });

    pub(crate) static COMP_WHOLE_MILK_POWDER_THELAND: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(524.0)
            .solids(
                Solids::new().milk(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(29.6).saturated(19.24).trans(1.036))
                        .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(39.2)))
                        .proteins(MilkProteins::new().casein(20.16).whey(5.04))
                        .minerals(4.0),
                ),
            )
            .pod(6.272)
            .pac(PAC::new().sugars(39.2).msnf_ws_salts(25.1304))
    });

    #[test]
    fn to_composition_dairy_label_spec_whole_milk_powder_theland() {
        let comp = ING_SPEC_DAIRY_LABEL_WHOLE_MILK_POWDER_THELAND
            .spec
            .to_composition()
            .unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Energy), 524.0);

        assert_eq_flt_test!(comp.get(CompKey::MilkFat), 29.6);
        assert_eq_flt_test!(comp.get(CompKey::Lactose), 39.2);
        assert_eq_flt_test!(comp.get(CompKey::MSNF), 68.4);
        assert_eq_flt_test!(comp.get(CompKey::MilkSNFS), 29.2);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 25.2);
        assert_eq_flt_test!(comp.get(CompKey::Casein), 20.16);
        assert_eq_flt_test!(comp.get(CompKey::Whey), 5.04);
        assert_eq_flt_test!(comp.get(CompKey::MilkMinerals), 4.0);
        assert_eq_flt_test!(comp.get(CompKey::MilkSolids), 98.0);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 25.2);
        assert_eq_flt_test!(comp.get(CompKey::TotalSolids), 98.0);
        assert_eq_flt_test!(comp.get(CompKey::Water), 2.0);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::TotalEmulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::TotalStabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 6.272);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 39.2);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 25.1304);
        assert_eq_flt_test!(comp.get(CompKey::TotalPAC), 64.3304);

        assert_eq_flt_test!(comp.get(CompKey::SaturatedFat), 19.24);
        assert_eq_flt_test!(comp.get(CompKey::TransFat), 1.036);
    }

    /// (USDEC, 2003, Table 6, pp. 51-52)[^91]
    #[doc = include_str!("../../docs/references/index/91.md")]
    pub(crate) const ING_SPEC_DAIRY_SHEET_WPC_80_USDEC_STR: &str = r#"{
      "name": "USDEC Whey Protein Concentrate 80%",
      "category": "Dairy",
      "DairySheetSpec": {
        "water": 4.11,
        "energy": 412,
        "fat": 6.6,
        "sugars": { "lactose": 5.31 },
        "protein": 80,
        "ash": 3.98,
        "solids_source": "Whey"
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_SHEET_WPC_80_USDEC: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "USDEC Whey Protein Concentrate 80%".to_string(),
        category: Category::Dairy,
        spec: DairySheetSpec {
            water: 4.11,
            energy: Some(412.0),
            fat: 6.6,
            saturated_fat: None,
            trans_fat: None,
            sugars: Sugars::new().lactose(5.31),
            protein: 80.0,
            casein: None,
            ash: Some(3.98),
            solids_source: Some(SolidsSource::Whey),
        }
        .into(),
    });

    pub(crate) static COMP_WPC_80_USDEC: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(412.0)
            .solids(
                Solids::new().milk(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(6.6).saturated(4.29).trans(0.231))
                        .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(5.31)))
                        .proteins(MilkProteins::new().whey(80.0))
                        .minerals(3.98),
                ),
            )
            .pod(0.8496)
            .pac(PAC::new().sugars(5.31).msnf_ws_salts(32.8055))
    });

    #[test]
    fn to_composition_dairy_sheet_spec_wpc_80_usdec() {
        let comp = ING_SPEC_DAIRY_SHEET_WPC_80_USDEC.spec.to_composition().unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Energy), 412.0);

        assert_eq!(comp.get(CompKey::MilkFat), 6.6);
        assert_eq_flt_test!(comp.get(CompKey::Lactose), 5.31);
        assert_eq_flt_test!(comp.get(CompKey::MSNF), 89.29);
        assert_eq_flt_test!(comp.get(CompKey::MilkSNFS), 83.98);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 80.0);
        assert_eq_flt_test!(comp.get(CompKey::Whey), 80.0);
        assert_eq_flt_test!(comp.get(CompKey::MilkMinerals), 3.98);
        assert_eq_flt_test!(comp.get(CompKey::Casein), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::MilkSolids), 95.89);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 80.0);
        assert_eq_flt_test!(comp.get(CompKey::TotalSolids), 95.89);
        assert_eq_flt_test!(comp.get(CompKey::Water), 4.11);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::TotalEmulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::TotalStabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 0.8496);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 5.31);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 32.8055);
        assert_eq_flt_test!(comp.get(CompKey::TotalPAC), 38.1155);

        assert_eq_flt_test!(comp.get(CompKey::SaturatedFat), 4.29);
        assert_eq_flt_test!(comp.get(CompKey::TransFat), 0.231);
    }

    // https://www.hilmar.com/wp-content/uploads/2023/07/Hilmar-9000-WPI.pdf
    pub(crate) const ING_SPEC_DAIRY_SHEET_WPI_HILMAR_STR: &str = r#"{
      "name": "Hilmar 9000 Whey Protein Isolate",
      "category": "Dairy",
      "DairySheetSpec": {
        "water": 4.5,
        "energy": 372,
        "fat": 0.5,
        "sugars": { "lactose": 1 },
        "protein": 89,
        "ash": 2.5,
        "solids_source": "Whey"
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_SHEET_WPI_HILMAR: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Hilmar 9000 Whey Protein Isolate".to_string(),
        category: Category::Dairy,
        spec: DairySheetSpec {
            water: 4.5,
            energy: Some(372.0),
            fat: 0.5,
            saturated_fat: None,
            trans_fat: None,
            sugars: Sugars::new().lactose(1.0),
            protein: 89.0,
            casein: None,
            ash: Some(2.5),
            solids_source: Some(SolidsSource::Whey),
        }
        .into(),
    });

    pub(crate) static COMP_WPI_HILMAR: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(372.0)
            .solids(
                Solids::new().milk(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(0.5).saturated(0.325).trans(0.0175))
                        .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(1.0)))
                        .proteins(MilkProteins::new().whey(89.0))
                        .minerals(2.5)
                        .others(2.5),
                ),
            )
            .pod(0.16)
            .pac(PAC::new().sugars(1.0).msnf_ws_salts(34.9034))
    });

    #[test]
    fn to_composition_dairy_sheet_spec_wpi_hilmar() {
        let comp = ING_SPEC_DAIRY_SHEET_WPI_HILMAR.spec.to_composition().unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Energy), 372.0);

        assert_eq!(comp.get(CompKey::MilkFat), 0.5);
        assert_eq_flt_test!(comp.get(CompKey::Lactose), 1.0);
        assert_eq_flt_test!(comp.get(CompKey::MSNF), 95.0);
        assert_eq_flt_test!(comp.get(CompKey::MilkSNFS), 94.0);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 89.0);
        assert_eq_flt_test!(comp.get(CompKey::Whey), 89.0);
        assert_eq_flt_test!(comp.get(CompKey::MilkMinerals), 2.5);
        assert_eq_flt_test!(comp.get(CompKey::Casein), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::MilkSolids), 95.5);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 89.0);
        assert_eq_flt_test!(comp.get(CompKey::TotalSolids), 95.5);
        assert_eq_flt_test!(comp.get(CompKey::Water), 4.5);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::TotalEmulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::TotalStabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 0.16);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 1.0);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 34.9034);
        assert_eq_flt_test!(comp.get(CompKey::TotalPAC), 35.9034);

        assert_eq_flt_test!(comp.get(CompKey::SaturatedFat), 0.325);
        assert_eq_flt_test!(comp.get(CompKey::TransFat), 0.0175);
    }

    // https://leanfit.ca/collections/sport/products/leanfit-sport-whey-isolate-unflavoured-2kg
    pub(crate) const ING_SPEC_DAIRY_LABEL_WHEY_ISOLATE_STR: &str = r#"{
      "name": "Leanfit Sport Whey Isolate",
      "category": "Dairy",
      "DairyLabelSpec": {
        "serving_size": { "grams": 39 },
        "energy": 150,
        "total_fat": { "grams": 0.5 },
        "saturated_fat": 0.3,
        "sugars": 1,
        "protein": 35,
        "solids_source": "Whey"
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_LABEL_WHEY_ISOLATE: LazyLock<IngredientSpec> = LazyLock::new(|| IngredientSpec {
        name: "Leanfit Sport Whey Isolate".to_string(),
        category: Category::Dairy,
        spec: DairyLabelSpec {
            serving_size: Unit::Grams(39.0),
            energy: Some(150.0),
            total_fat: Unit::Grams(0.5),
            saturated_fat: Some(0.3),
            trans_fat: None,
            carbohydrates: None,
            sugars: 1.0,
            protein: 35.0,
            lactose_free: None,
            sucrose: None,
            solids_source: Some(SolidsSource::Whey),
        }
        .into(),
    });

    pub(crate) static COMP_WHEY_ISOLATE: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(384.6154)
            .solids(
                Solids::new().milk(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(1.2821).saturated(0.7692).trans(0.0449))
                        .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(2.5641)))
                        .proteins(MilkProteins::new().whey(89.7436))
                        .minerals(3.5730)
                        .others(0.1411),
                ),
            )
            .pod(0.4103)
            .pac(PAC::new().sugars(2.5641).msnf_ws_salts(35.2788))
    });

    #[test]
    fn to_composition_dairy_label_spec_whey_isolate() {
        let comp = ING_SPEC_DAIRY_LABEL_WHEY_ISOLATE.spec.to_composition().unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Energy), 384.6154);

        assert_eq_flt_test!(comp.get(CompKey::MilkFat), 1.2821);
        assert_eq_flt_test!(comp.get(CompKey::Lactose), 2.5641);
        assert_eq_flt_test!(comp.get(CompKey::MSNF), 96.0218);
        assert_eq_flt_test!(comp.get(CompKey::MilkSNFS), 93.4577);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 89.7436);
        assert_eq_flt_test!(comp.get(CompKey::Whey), 89.7436);
        assert_eq_flt_test!(comp.get(CompKey::MilkMinerals), 3.5730);
        assert_eq_flt_test!(comp.get(CompKey::Casein), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::MilkSolids), 97.3039);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 89.7436);
        assert_eq_flt_test!(comp.get(CompKey::TotalSolids), 97.3039);
        assert_eq_flt_test!(comp.get(CompKey::Water), 2.6961);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::TotalEmulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::TotalStabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 0.4103);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 2.5641);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 35.2788);
        assert_eq_flt_test!(comp.get(CompKey::TotalPAC), 37.8429);

        assert_eq_flt_test!(comp.get(CompKey::SaturatedFat), 0.7692);
        assert_eq_flt_test!(comp.get(CompKey::TransFat), 0.0449);
    }

    // https://www.optimumnutrition.com/products/gold-standard-100-whey-protein-powder-eu?variant=52105832956171
    pub(crate) const ING_SPEC_DAIRY_LABEL_GOLD_STANDARD_WHEY_OPTIMUM_NUTRITION_STR: &str = r#"{
      "name": "Optimum Nutrition Gold Standard 100% Whey",
      "category": "Dairy",
      "DairyLabelSpec": {
        "serving_size": { "grams": 100 },
        "energy": 374,
        "total_fat": { "grams": 4.0 },
        "saturated_fat": 1.4,
        "carbohydrates": 4.2,
        "sugars": 3.3,
        "protein": 80,
        "solids_source": "Whey"
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_LABEL_GOLD_STANDARD_WHEY_OPTIMUM_NUTRITION: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Optimum Nutrition Gold Standard 100% Whey".to_string(),
            category: Category::Dairy,
            spec: DairyLabelSpec {
                serving_size: Unit::Grams(100.0),
                energy: Some(374.0),
                total_fat: Unit::Grams(4.0),
                saturated_fat: Some(1.4),
                trans_fat: None,
                carbohydrates: Some(4.2),
                sugars: 3.3,
                protein: 80.0,
                lactose_free: None,
                sucrose: None,
                solids_source: Some(SolidsSource::Whey),
            }
            .into(),
        });

    pub(crate) static COMP_GOLD_STANDARD_WHEY_OPTIMUM_NUTRITION: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(374.0)
            .solids(
                Solids::new()
                    .milk(
                        SolidsBreakdown::new()
                            .fats(Fats::new().total(4.0).saturated(1.4).trans(0.14))
                            .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(3.3)))
                            .proteins(MilkProteins::new().whey(80.0))
                            .minerals(3.2915)
                            .others(0.1522),
                    )
                    .other(SolidsBreakdown::new().carbohydrates(Carbohydrates::new().others(0.7478))),
            )
            .pod(0.528)
            .pac(PAC::new().sugars(3.3).msnf_ws_salts(31.87))
    });

    #[test]
    fn to_composition_dairy_label_spec_gold_standard_whey_optimum_nutrition() {
        let comp = ING_SPEC_DAIRY_LABEL_GOLD_STANDARD_WHEY_OPTIMUM_NUTRITION
            .spec
            .to_composition()
            .unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Energy), 374.0);

        assert_eq_flt_test!(comp.get(CompKey::MilkFat), 4.0);
        assert_eq_flt_test!(comp.get(CompKey::Lactose), 3.3);
        assert_eq_flt_test!(comp.get(CompKey::MSNF), 86.7436);
        assert_eq_flt_test!(comp.get(CompKey::MilkSNFS), 83.4436);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 80.0);
        assert_eq_flt_test!(comp.get(CompKey::Whey), 80.0);
        assert_eq_flt_test!(comp.get(CompKey::MilkMinerals), 3.2915);
        assert_eq_flt_test!(comp.get(CompKey::Casein), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::MilkSolids), 90.7436);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 80.0);
        assert_eq_flt_test!(comp.get(CompKey::TotalSolids), 91.4915);
        assert_eq_flt_test!(comp.get(CompKey::Water), 8.5085);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::TotalEmulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::TotalStabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 0.528);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 3.3);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 31.87);
        assert_eq_flt_test!(comp.get(CompKey::TotalPAC), 35.17);

        assert_eq_flt_test!(comp.get(CompKey::SaturatedFat), 1.4);
        assert_eq_flt_test!(comp.get(CompKey::TransFat), 0.14);
    }

    // https://www.optimumnutrition.com/products/gold-standard-100-casein-protein-powder-eu?variant=52105828106507
    pub(crate) const ING_SPEC_DAIRY_LABEL_GOLD_STANDARD_CASEIN_OPTIMUM_NUTRITION_STR: &str = r#"{
      "name": "Optimum Nutrition Gold Standard 100% Casein",
      "category": "Dairy",
      "DairyLabelSpec": {
        "serving_size": { "grams": 100 },
        "energy": 352,
        "total_fat": { "grams": 1.8 },
        "saturated_fat": 1.1,
        "carbohydrates": 11,
        "sugars": 4.3,
        "protein": 73,
        "solids_source": "MicellarCasein"
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_LABEL_GOLD_STANDARD_CASEIN_OPTIMUM_NUTRITION: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Optimum Nutrition Gold Standard 100% Casein".to_string(),
            category: Category::Dairy,
            spec: DairyLabelSpec {
                serving_size: Unit::Grams(100.0),
                energy: Some(352.0),
                total_fat: Unit::Grams(1.8),
                saturated_fat: Some(1.1),
                trans_fat: None,
                carbohydrates: Some(11.0),
                sugars: 4.3,
                protein: 73.0,
                lactose_free: None,
                sucrose: None,
                solids_source: Some(SolidsSource::MicellarCasein),
            }
            .into(),
        });

    pub(crate) static COMP_GOLD_STANDARD_CASEIN_OPTIMUM_NUTRITION: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(352.0)
            .solids(
                Solids::new()
                    .milk(
                        SolidsBreakdown::new()
                            .fats(Fats::new().total(1.8).saturated(1.1).trans(0.063))
                            .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(4.3)))
                            .proteins(MilkProteins::new().casein(67.1787).whey(5.8213))
                            .minerals(6.9760),
                    )
                    .other(SolidsBreakdown::new().carbohydrates(Carbohydrates::new().others(6.7))),
            )
            .pod(0.688)
            .pac(PAC::new().sugars(4.3).msnf_ws_salts(30.9633))
    });

    #[test]
    fn to_composition_dairy_label_spec_gold_standard_casein_optimum_nutrition() {
        let comp = ING_SPEC_DAIRY_LABEL_GOLD_STANDARD_CASEIN_OPTIMUM_NUTRITION
            .spec
            .to_composition()
            .unwrap();

        comp.assert_all_keys(&[
            (CompKey::Energy, 352.0),
            (CompKey::MilkSolids, 86.075_955),
            (CompKey::MilkFat, 1.8),
            (CompKey::MSNF, 84.275_955),
            (CompKey::MilkSugars, 4.3),
            (CompKey::MilkSNFS, 79.975_955),
            (CompKey::MilkProteins, 73.0),
            (CompKey::Casein, 67.178_732),
            (CompKey::Whey, 5.821_268),
            (CompKey::MilkMinerals, 6.975_955),
            (CompKey::OtherSNFS, 6.7),
            (CompKey::TotalSolids, 92.775_955),
            (CompKey::TotalFats, 1.8),
            (CompKey::TotalSNF, 90.975_955),
            (CompKey::TotalSNFS, 86.675_955),
            (CompKey::TotalProteins, 73.0),
            (CompKey::TotalMinerals, 6.975_955),
            (CompKey::Water, 7.224_045),
            (CompKey::TotalCarbohydrates, 11.0),
            (CompKey::TotalSugars, 4.3),
            (CompKey::Lactose, 4.3),
            (CompKey::TotalSweeteners, 4.3),
            (CompKey::POD, 0.688),
            (CompKey::NetPAC, 35.263_328),
            (CompKey::TotalPAC, 35.263_328),
            (CompKey::PACsgr, 4.3),
            (CompKey::PACmlk, 30.963_328),
            (CompKey::SaturatedFat, 1.1),
            (CompKey::TransFat, 0.063),
        ]);
    }

    /// The control powder (Kommineni et al., 2022, Tables 1-2)[^101]
    #[doc = include_str!("../../docs/references/index/101.md")]
    pub(crate) const ING_SPEC_DAIRY_SHEET_MCC_80_KOMMINENI_STR: &str = r#"{
      "name": "Kommineni Micellar Casein Concentrate 80%",
      "category": "Dairy",
      "DairySheetSpec": {
        "water": 4.49,
        "fat": 2.98,
        "sugars": { "lactose": 5.13 },
        "protein": 79.25,
        "casein": 71.74,
        "ash": 8.15,
        "solids_source": "MicellarCasein"
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_SHEET_MCC_80_KOMMINENI: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Kommineni Micellar Casein Concentrate 80%".to_string(),
            category: Category::Dairy,
            spec: DairySheetSpec {
                water: 4.49,
                energy: None,
                fat: 2.98,
                saturated_fat: None,
                trans_fat: None,
                sugars: Sugars::new().lactose(5.13),
                protein: 79.25,
                casein: Some(71.74),
                ash: Some(8.15),
                solids_source: Some(SolidsSource::MicellarCasein),
            }
            .into(),
        });

    pub(crate) static COMP_MCC_80_KOMMINENI: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(364.34)
            .solids(
                Solids::new().milk(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(2.98).saturated(1.937).trans(0.1043))
                        .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(5.13)))
                        .proteins(MilkProteins::new().casein(71.74).whey(7.51))
                        .minerals(8.15),
                ),
            )
            .pod(0.8208)
            .pac(PAC::new().sugars(5.13).msnf_ws_salts(33.9959))
    });

    #[test]
    fn to_composition_dairy_sheet_spec_mcc_80_kommineni() {
        let comp = ING_SPEC_DAIRY_SHEET_MCC_80_KOMMINENI.spec.to_composition().unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Energy), 364.34);

        assert_eq!(comp.get(CompKey::MilkFat), 2.98);
        assert_eq_flt_test!(comp.get(CompKey::Lactose), 5.13);
        assert_eq_flt_test!(comp.get(CompKey::MSNF), 92.53);
        assert_eq_flt_test!(comp.get(CompKey::MilkSNFS), 87.4);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 79.25);
        assert_eq_flt_test!(comp.get(CompKey::Casein), 71.74);
        assert_eq_flt_test!(comp.get(CompKey::Whey), 7.51);
        assert_eq_flt_test!(comp.get(CompKey::MilkMinerals), 8.15);
        assert_eq_flt_test!(comp.get(CompKey::MilkSolids), 95.51);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 79.25);
        assert_eq_flt_test!(comp.get(CompKey::TotalSolids), 95.51);
        assert_eq_flt_test!(comp.get(CompKey::Water), 4.49);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::TotalEmulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::TotalStabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 0.8208);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 5.13);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 33.9959);
        assert_eq_flt_test!(comp.get(CompKey::TotalPAC), 39.1259);

        assert_eq_flt_test!(comp.get(CompKey::SaturatedFat), 1.937);
        assert_eq_flt_test!(comp.get(CompKey::TransFat), 0.1043);
    }

    /// (Southward, n.d., Table 1, p. 9)[^96]
    #[doc = include_str!("../../docs/references/index/96.md")]
    pub(crate) const ING_SPEC_DAIRY_SHEET_SODIUM_CASEINATE_SOUTHWARD_STR: &str = r#"{
      "name": "Southward Sodium Caseinate",
      "category": "Dairy",
      "DairySheetSpec": {
        "water": 3.8,
        "fat": 1.1,
        "sugars": { "lactose": 0.1 },
        "protein": 91.4,
        "ash": 3.6,
        "solids_source": "Caseinate"
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_SHEET_SODIUM_CASEINATE_SOUTHWARD: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "Southward Sodium Caseinate".to_string(),
            category: Category::Dairy,
            spec: DairySheetSpec {
                water: 3.8,
                energy: None,
                fat: 1.1,
                saturated_fat: None,
                trans_fat: None,
                sugars: Sugars::new().lactose(0.1),
                protein: 91.4,
                casein: None,
                ash: Some(3.6),
                solids_source: Some(SolidsSource::Caseinate),
            }
            .into(),
        });

    pub(crate) static COMP_SODIUM_CASEINATE_SOUTHWARD: LazyLock<Composition> = LazyLock::new(|| {
        Composition::new()
            .energy(375.9)
            .solids(
                Solids::new().milk(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(1.1).saturated(0.715).trans(0.0385))
                        .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(0.1)))
                        .proteins(MilkProteins::new().casein(91.4))
                        .minerals(3.6),
                ),
            )
            .pod(0.016)
            .pac(PAC::new().sugars(0.1).msnf_ws_salts(34.9401))
    });

    #[test]
    fn to_composition_dairy_sheet_spec_sodium_caseinate_southward() {
        let comp = ING_SPEC_DAIRY_SHEET_SODIUM_CASEINATE_SOUTHWARD
            .spec
            .to_composition()
            .unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Energy), 375.9);

        assert_eq!(comp.get(CompKey::MilkFat), 1.1);
        assert_eq_flt_test!(comp.get(CompKey::Lactose), 0.1);
        assert_eq_flt_test!(comp.get(CompKey::MSNF), 95.1);
        assert_eq_flt_test!(comp.get(CompKey::MilkSNFS), 95.0);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 91.4);
        assert_eq_flt_test!(comp.get(CompKey::Casein), 91.4);
        assert_eq_flt_test!(comp.get(CompKey::Whey), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::MilkMinerals), 3.6);
        assert_eq_flt_test!(comp.get(CompKey::MilkSolids), 96.2);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 91.4);
        assert_eq_flt_test!(comp.get(CompKey::TotalSolids), 96.2);
        assert_eq_flt_test!(comp.get(CompKey::Water), 3.8);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::TotalEmulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::TotalStabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 0.016);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 0.1);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 34.9401);
        assert_eq_flt_test!(comp.get(CompKey::TotalPAC), 35.0401);

        assert_eq_flt_test!(comp.get(CompKey::SaturatedFat), 0.715);
        assert_eq_flt_test!(comp.get(CompKey::TransFat), 0.0385);
    }

    pub(crate) static INGREDIENT_ASSETS_TABLE_DAIRY: LazyLock<Vec<(&str, IngredientSpec, Option<Composition>)>> =
        LazyLock::new(|| {
            vec![
                (ING_SPEC_DAIRY_SIMPLE_0_MILK_STR, ING_SPEC_DAIRY_SIMPLE_0_MILK.clone(), Some(*COMP_0_MILK)),
                (ING_SPEC_DAIRY_SIMPLE_2_MILK_STR, ING_SPEC_DAIRY_SIMPLE_2_MILK.clone(), Some(*COMP_2_MILK)),
                (ING_SPEC_DAIRY_SIMPLE_3_25_MILK_STR, ING_SPEC_DAIRY_SIMPLE_3_25_MILK.clone(), Some(*COMP_3_25_MILK)),
                (ING_SPEC_DAIRY_SIMPLE_40_CREAM_STR, ING_SPEC_DAIRY_SIMPLE_40_CREAM.clone(), Some(*COMP_40_CREAM)),
                (
                    ING_SPEC_DAIRY_SIMPLE_2_MILK_LACTOSE_FREE_STR,
                    ING_SPEC_DAIRY_SIMPLE_2_MILK_LACTOSE_FREE.clone(),
                    Some(*COMP_2_MILK_LACTOSE_FREE),
                ),
                (
                    ING_SPEC_DAIRY_SIMPLE_SKIMMED_POWDER_STR,
                    ING_SPEC_DAIRY_SIMPLE_SKIMMED_POWDER.clone(),
                    Some(*COMP_SKIMMED_POWDER),
                ),
                (
                    ING_SPEC_DAIRY_SIMPLE_WHOLE_POWDER_STR,
                    ING_SPEC_DAIRY_SIMPLE_WHOLE_POWDER.clone(),
                    Some(*COMP_WHOLE_POWDER),
                ),
                (
                    ING_SPEC_DAIRY_SIMPLE_SKIM_MILK_GOFF_HARTEL_STR,
                    ING_SPEC_DAIRY_SIMPLE_SKIM_MILK_GOFF_HARTEL.clone(),
                    Some(*COMP_SKIM_MILK_GOFF_HARTEL),
                ),
                (
                    ING_SPEC_DAIRY_SHEET_WHOLE_MILK_USDA_STR,
                    ING_SPEC_DAIRY_SHEET_WHOLE_MILK_USDA.clone(),
                    Some(*COMP_WHOLE_MILK_USDA),
                ),
                (
                    ING_SPEC_DAIRY_LABEL_3_25_MILK_SEALTEST_STR,
                    ING_SPEC_DAIRY_LABEL_3_25_MILK_SEALTEST.clone(),
                    Some(*COMP_3_25_MILK_SEALTEST),
                ),
                (
                    ING_SPEC_DAIRY_LABEL_WHOLE_ULTRA_FILTERED_LACTOSE_FREE_STR,
                    ING_SPEC_DAIRY_LABEL_WHOLE_ULTRA_FILTERED_LACTOSE_FREE.clone(),
                    Some(*COMP_WHOLE_ULTRA_FILTERED_LACTOSE_FREE),
                ),
                (
                    ING_SPEC_DAIRY_LABEL_2_ULTRAFILTERED_MILK_LACTANTIA_STR,
                    ING_SPEC_DAIRY_LABEL_2_ULTRAFILTERED_MILK_LACTANTIA.clone(),
                    Some(*COMP_2_ULTRAFILTERED_MILK_LACTANTIA),
                ),
                (
                    ING_SPEC_DAIRY_SHEET_2_EVAPORATED_MILK_USDA_STR,
                    ING_SPEC_DAIRY_SHEET_2_EVAPORATED_MILK_USDA.clone(),
                    Some(*COMP_2_EVAPORATED_MILK_USDA),
                ),
                (
                    ING_SPEC_DAIRY_LABEL_2_EVAPORATED_MILK_CARNATION_STR,
                    ING_SPEC_DAIRY_LABEL_2_EVAPORATED_MILK_CARNATION.clone(),
                    Some(*COMP_2_EVAPORATED_MILK_CARNATION),
                ),
                (
                    ING_SPEC_DAIRY_SHEET_SWEETENED_CONDENSED_MILK_USDA_STR,
                    ING_SPEC_DAIRY_SHEET_SWEETENED_CONDENSED_MILK_USDA.clone(),
                    Some(*COMP_SWEETENED_CONDENSED_MILK_USDA),
                ),
                (
                    ING_SPEC_DAIRY_LABEL_SWEETENED_CONDENSED_MILK_EAGLE_BRAND_STR,
                    ING_SPEC_DAIRY_LABEL_SWEETENED_CONDENSED_MILK_EAGLE_BRAND.clone(),
                    Some(*COMP_SWEETENED_CONDENSED_MILK_EAGLE_BRAND),
                ),
                (
                    ING_SPEC_DAIRY_LABEL_SKIM_MILK_POWDER_MEDALLION_STR,
                    ING_SPEC_DAIRY_LABEL_SKIM_MILK_POWDER_MEDALLION.clone(),
                    Some(*COMP_SKIM_MILK_POWDER_MEDALLION),
                ),
                (
                    ING_SPEC_DAIRY_LABEL_WHOLE_MILK_POWDER_MEDALLION_STR,
                    ING_SPEC_DAIRY_LABEL_WHOLE_MILK_POWDER_MEDALLION.clone(),
                    Some(*COMP_WHOLE_MILK_POWDER_MEDALLION),
                ),
                (
                    ING_SPEC_DAIRY_LABEL_SKIM_MILK_POWDER_THELAND_STR,
                    ING_SPEC_DAIRY_LABEL_SKIM_MILK_POWDER_THELAND.clone(),
                    Some(*COMP_SKIM_MILK_POWDER_THELAND),
                ),
                (
                    ING_SPEC_DAIRY_LABEL_WHOLE_MILK_POWDER_THELAND_STR,
                    ING_SPEC_DAIRY_LABEL_WHOLE_MILK_POWDER_THELAND.clone(),
                    Some(*COMP_WHOLE_MILK_POWDER_THELAND),
                ),
                (
                    ING_SPEC_DAIRY_SHEET_WPC_80_USDEC_STR,
                    ING_SPEC_DAIRY_SHEET_WPC_80_USDEC.clone(),
                    Some(*COMP_WPC_80_USDEC),
                ),
                (ING_SPEC_DAIRY_SHEET_WPI_HILMAR_STR, ING_SPEC_DAIRY_SHEET_WPI_HILMAR.clone(), Some(*COMP_WPI_HILMAR)),
                (
                    ING_SPEC_DAIRY_LABEL_WHEY_ISOLATE_STR,
                    ING_SPEC_DAIRY_LABEL_WHEY_ISOLATE.clone(),
                    Some(*COMP_WHEY_ISOLATE),
                ),
                (
                    ING_SPEC_DAIRY_LABEL_GOLD_STANDARD_WHEY_OPTIMUM_NUTRITION_STR,
                    ING_SPEC_DAIRY_LABEL_GOLD_STANDARD_WHEY_OPTIMUM_NUTRITION.clone(),
                    Some(*COMP_GOLD_STANDARD_WHEY_OPTIMUM_NUTRITION),
                ),
                (
                    ING_SPEC_DAIRY_LABEL_GOLD_STANDARD_CASEIN_OPTIMUM_NUTRITION_STR,
                    ING_SPEC_DAIRY_LABEL_GOLD_STANDARD_CASEIN_OPTIMUM_NUTRITION.clone(),
                    Some(*COMP_GOLD_STANDARD_CASEIN_OPTIMUM_NUTRITION),
                ),
                (
                    ING_SPEC_DAIRY_SHEET_MCC_80_KOMMINENI_STR,
                    ING_SPEC_DAIRY_SHEET_MCC_80_KOMMINENI.clone(),
                    Some(*COMP_MCC_80_KOMMINENI),
                ),
                (
                    ING_SPEC_DAIRY_SHEET_SODIUM_CASEINATE_SOUTHWARD_STR,
                    ING_SPEC_DAIRY_SHEET_SODIUM_CASEINATE_SOUTHWARD.clone(),
                    Some(*COMP_SODIUM_CASEINATE_SOUTHWARD),
                ),
            ]
        });

    fn empty_dairy_simple_spec() -> DairySimpleSpec {
        DairySimpleSpec {
            fat: 0.0,
            msnf: None,
            protein: None,
            sucrose: None,
            lactose_free: None,
            solids_source: None,
        }
    }

    #[test]
    fn dairy_label_spec_water_floor_with_sucrose() {
        let comp = DairyLabelSpec {
            serving_size: Unit::Grams(100.0),
            energy: None,
            total_fat: Unit::Grams(26.0),
            saturated_fat: None,
            trans_fat: None,
            carbohydrates: Some(52.0),
            sugars: 50.0,
            protein: 17.0,
            lactose_free: None,
            sucrose: Some(20.0),
            solids_source: None,
        }
        .to_composition()
        .unwrap();

        // The estimated 51.09g MSNF is capped at 98% solids, less fat, sucrose, and other carbs
        assert_eq_flt_test!(comp.get(CompKey::MSNF), 50.0);
        assert_eq_flt_test!(comp.get(CompKey::Water), 2.0);
    }

    /// A label for 90 g of whey solids and 1 g of fat, whose sugars are the solids' lactose
    fn whey_label_spec(protein_fraction: f64, carbohydrates: Option<f64>) -> DairyLabelSpec {
        DairyLabelSpec {
            serving_size: Unit::Grams(100.0),
            energy: None,
            total_fat: Unit::Grams(1.0),
            saturated_fat: None,
            trans_fat: None,
            carbohydrates,
            sugars: 90.0 * lactose_in_snf(protein_fraction, SolidsSource::Whey),
            protein: 90.0 * protein_fraction,
            lactose_free: None,
            sucrose: None,
            solids_source: Some(SolidsSource::Whey),
        }
    }

    #[test]
    fn dairy_label_spec_whey_lines_endpoints() {
        // At both anchors the estimate adds minerals and unaccounted solids to lactose and protein;
        // carbohydrates by difference hold the latter too, which leaves no other carbohydrates
        for protein_fraction in [STD_PROTEIN_IN_WS, STD_PROTEIN_IN_WPI] {
            let sugars = 90.0 * lactose_in_snf(protein_fraction, SolidsSource::Whey);
            let unaccounted = 90.0 * unaccounted_in_snf(protein_fraction, SolidsSource::Whey);

            for carbohydrates in [None, Some(sugars + unaccounted)] {
                let comp = whey_label_spec(protein_fraction, carbohydrates)
                    .to_composition()
                    .unwrap();

                assert_eq_flt_test!(comp.get(CompKey::MSNF), 90.0);
                assert_eq_flt_test!(comp.get(CompKey::OtherSNFS), 0.0);
                assert_eq_flt_test!(comp.get(CompKey::Water), 9.0);
            }
        }
    }

    #[test]
    fn dairy_label_spec_whey_other_carbohydrates_beyond_unaccounted_solids() {
        // Carbohydrates beyond the sugars and the 1.8 g of unaccounted solids, e.g. from additives,
        // are other carbohydrates; any up to that are already in the solids non-fat
        let sugars = 90.0 * STD_LACTOSE_IN_WS;

        for (carbohydrates, other_carbohydrates) in [(sugars + 1.8 + 2.0, 2.0), (sugars + 1.0, 0.0)] {
            let comp = whey_label_spec(STD_PROTEIN_IN_WS, Some(carbohydrates))
                .to_composition()
                .unwrap();

            assert_eq_flt_test!(comp.get(CompKey::MSNF), 90.0);
            assert_eq_flt_test!(comp.get(CompKey::OtherSNFS), other_carbohydrates);
            assert_eq_flt_test!(comp.get(CompKey::Water), 9.0 - other_carbohydrates);
        }
    }

    #[test]
    fn dairy_label_spec_casein_forms() {
        // Each form's estimated solids non-fat hold the label's sugars and protein, the minerals at
        // their line's protein fraction, none unaccounted, and protein splits along its casein line
        for source in [SolidsSource::MicellarCasein, SolidsSource::Caseinate] {
            let comp = DairyLabelSpec {
                serving_size: Unit::Grams(100.0),
                energy: None,
                total_fat: Unit::Grams(1.0),
                saturated_fat: None,
                trans_fat: None,
                carbohydrates: None,
                sugars: 1.0,
                protein: 85.0,
                lactose_free: None,
                sucrose: None,
                solids_source: Some(source),
            }
            .to_composition()
            .unwrap();

            let snf = comp.get(CompKey::MSNF);
            let protein_fraction = 85.0 / snf;
            assert_eq_flt_test!(snf, 86.0 + snf * minerals_in_snf(protein_fraction, source));
            assert_eq_flt_test!(comp.get(CompKey::Casein), 85.0 * casein_in_protein(protein_fraction, source));
            assert_eq_flt_test!(comp.get(CompKey::Casein) + comp.get(CompKey::Whey), 85.0);
            assert_eq_flt_test!(comp.get(CompKey::Water), 99.0 - snf);
        }
    }

    #[test]
    fn dairy_simple_spec_milk_at_plain_milk_protein() {
        // Plain milk's own protein puts lactose at its line's anchor, whether given or defaulted
        for protein in [None, Some(96.0 * STD_PROTEIN_IN_MSNF)] {
            let comp = DairySimpleSpec {
                fat: 1.0,
                msnf: Some(96.0),
                protein,
                ..empty_dairy_simple_spec()
            }
            .to_composition()
            .unwrap();

            assert_eq_flt_test!(comp.get(CompKey::Lactose), 96.0 * STD_LACTOSE_IN_MSNF);
            assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 96.0 * STD_PROTEIN_IN_MSNF);
        }
    }

    #[test]
    fn dairy_simple_spec_milk_protein_concentrate_grade() {
        // A milk protein concentrate 80's protein, 84.2% of its solids non-fat, sets its lactose
        // and minerals along the lines, 8.5% and 7.3%, and its protein keeps milk's casein share
        let comp = DairySimpleSpec {
            fat: 1.0,
            msnf: Some(95.0),
            protein: Some(80.0),
            ..empty_dairy_simple_spec()
        }
        .to_composition()
        .unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Lactose), 8.0623);
        assert_eq_flt_test!(comp.get(CompKey::MilkMinerals), 6.9377);
        assert_eq_flt_test!(comp.get(CompKey::Casein), 64.0);
        assert_eq_flt_test!(comp.get(CompKey::Whey), 16.0);
        assert_eq_flt_test!(comp.get(CompKey::Water), 4.0);
    }

    #[test]
    fn dairy_simple_spec_milk_below_plain_milk_protein() {
        // At 34.4% protein, under plain milk solids' 37.5%, as in milk with added permeate, the
        // lines continue toward the permeate's composition: 57.6% lactose and 8.0% minerals
        let comp = DairySimpleSpec {
            fat: 1.0,
            msnf: Some(96.0),
            protein: Some(33.0),
            ..empty_dairy_simple_spec()
        }
        .to_composition()
        .unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Lactose), 55.2752);
        assert_eq_flt_test!(comp.get(CompKey::MilkMinerals), 7.7248);
        assert_eq_flt_test!(comp.get(CompKey::Casein), 26.4);
        assert_eq_flt_test!(comp.get(CompKey::Water), 3.0);
    }

    #[test]
    fn dairy_simple_spec_whey_at_sweet_whey_protein() {
        // Sweet whey's own protein keeps lactose at its fixed fraction, whether given or defaulted
        for protein in [None, Some(96.0 * STD_PROTEIN_IN_WS)] {
            let comp = DairySimpleSpec {
                fat: 1.0,
                msnf: Some(96.0),
                protein,
                solids_source: Some(SolidsSource::Whey),
                ..empty_dairy_simple_spec()
            }
            .to_composition()
            .unwrap();

            assert_eq_flt_test!(comp.get(CompKey::Lactose), 96.0 * STD_LACTOSE_IN_WS);
            assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 96.0 * STD_PROTEIN_IN_WS);
        }
    }

    #[test]
    fn dairy_simple_spec_whey_at_isolate_protein() {
        // An isolate's protein puts lactose at the line's other anchor
        let comp = DairySimpleSpec {
            fat: 0.5,
            msnf: Some(95.0),
            protein: Some(95.0 * STD_PROTEIN_IN_WPI),
            solids_source: Some(SolidsSource::Whey),
            ..empty_dairy_simple_spec()
        }
        .to_composition()
        .unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Lactose), 95.0 * STD_LACTOSE_IN_WPI);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 95.0 * STD_PROTEIN_IN_WPI);
    }

    #[test]
    fn dairy_simple_spec_whey_protein_concentrate() {
        // USDEC's WPC 80 profile: at 89.6% protein, the line's lactose is 6.22% of the whey solids
        let comp = DairySimpleSpec {
            fat: 6.6,
            msnf: Some(89.29),
            protein: Some(80.0),
            solids_source: Some(SolidsSource::Whey),
            ..empty_dairy_simple_spec()
        }
        .to_composition()
        .unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Lactose), 5.5517);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 80.0);
        assert_eq_flt_test!(comp.get(CompKey::MilkSNFS), 83.7383);
        assert_eq_flt_test!(comp.get(CompKey::Water), 4.11);
    }

    #[test]
    fn dairy_simple_spec_caseinate_default_protein() {
        // Caseinate's protein defaults to what its lactose and minerals leave of the solids non-fat
        let comp = DairySimpleSpec {
            fat: 1.0,
            msnf: Some(95.0),
            solids_source: Some(SolidsSource::Caseinate),
            ..empty_dairy_simple_spec()
        }
        .to_composition()
        .unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Lactose), 95.0 * STD_LACTOSE_IN_CASEINATE);
        assert_eq_flt_test!(comp.get(CompKey::Casein), 95.0 * STD_PROTEIN_IN_CASEINATE);
        assert_eq_flt_test!(comp.get(CompKey::Whey), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::MilkMinerals), 95.0 * STD_MINERALS_IN_CASEINATE);
        assert_eq_flt_test!(comp.get(CompKey::Water), 4.0);
    }

    #[test]
    fn dairy_simple_spec_micellar_casein_grade() {
        // A micellar casein concentrate 80's protein, 85.1% of its solids non-fat, sets its
        // lactose, minerals, and casein share along the lines: 6.6%, 8.3%, and 91.7%
        let comp = DairySimpleSpec {
            fat: 1.0,
            msnf: Some(94.0),
            protein: Some(80.0),
            solids_source: Some(SolidsSource::MicellarCasein),
            ..empty_dairy_simple_spec()
        }
        .to_composition()
        .unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Lactose), 6.2272);
        assert_eq_flt_test!(comp.get(CompKey::MilkMinerals), 7.7728);
        assert_eq_flt_test!(comp.get(CompKey::Casein), 73.3240);
        assert_eq_flt_test!(comp.get(CompKey::Whey), 6.6760);
        assert_eq_flt_test!(comp.get(CompKey::Water), 5.0);
    }

    #[test]
    fn dairy_simple_spec_casein_given_protein() {
        // A given protein above caseinate's default leaves its minerals only what remains beside
        // the lactose, under their fixed fraction, e.g. Southward's sodium caseinate, 91.4 g of
        // protein in 95.1 g of solids non-fat: 3.5098 g of minerals rather than 3.804 g
        let comp = DairySimpleSpec {
            fat: 1.1,
            msnf: Some(95.1),
            protein: Some(91.4),
            solids_source: Some(SolidsSource::Caseinate),
            ..empty_dairy_simple_spec()
        }
        .to_composition()
        .unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Lactose), 0.1902);
        assert_eq_flt_test!(comp.get(CompKey::Casein), 91.4);
        assert_eq_flt_test!(comp.get(CompKey::MilkMinerals), 3.5098);
        assert_eq!(comp.solids.milk.others, 0.0);
    }

    #[test]
    fn dairy_simple_spec_casein_given_low_protein() {
        // A given protein below caseinate's default keeps the fixed fraction of minerals, 3.8 g of
        // 95 g of solids non-fat, and the other milk solids take the 3.01 g left beside them
        let comp = DairySimpleSpec {
            fat: 1.0,
            msnf: Some(95.0),
            protein: Some(88.0),
            solids_source: Some(SolidsSource::Caseinate),
            ..empty_dairy_simple_spec()
        }
        .to_composition()
        .unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Lactose), 0.19);
        assert_eq_flt_test!(comp.get(CompKey::MilkMinerals), 95.0 * STD_MINERALS_IN_CASEINATE);
        assert_eq_flt_test!(comp.solids.milk.others, 3.01);
    }

    #[test]
    fn dairy_simple_spec_err_on_negative_field() {
        let specs = [
            DairySimpleSpec {
                fat: -1.0,
                ..empty_dairy_simple_spec()
            },
            DairySimpleSpec {
                fat: 3.25,
                msnf: Some(-1.0),
                ..empty_dairy_simple_spec()
            },
            DairySimpleSpec {
                fat: 3.25,
                protein: Some(-1.0),
                ..empty_dairy_simple_spec()
            },
        ];

        for spec in specs {
            let result = spec.to_composition();
            assert!(matches!(result, Err(Error::CompositionNotPositive(_))));
        }
    }

    #[test]
    fn dairy_simple_spec_err_when_fat_plus_msnf_plus_sucrose_exceeds_100() {
        let result = DairySimpleSpec {
            fat: 50.0,
            msnf: Some(40.0),
            sucrose: Some(15.0),
            ..empty_dairy_simple_spec()
        }
        .to_composition();
        assert!(matches!(result, Err(Error::CompositionNotWithin100Percent(_))));
    }

    #[test]
    fn dairy_simple_spec_err_when_milk_protein_leaves_no_lactose() {
        // At 93.2% protein, past the ~92.8% where the line's lactose runs out
        let result = DairySimpleSpec {
            msnf: Some(95.0),
            protein: Some(88.5),
            ..empty_dairy_simple_spec()
        }
        .to_composition();
        assert!(matches!(result, Err(Error::CompositionNotPositive(_))));
    }

    #[test]
    fn dairy_simple_spec_err_when_micellar_casein_protein_is_missing() {
        // Micellar casein's grade is its protein, so it has no default
        let result = DairySimpleSpec {
            msnf: Some(94.0),
            solids_source: Some(SolidsSource::MicellarCasein),
            ..empty_dairy_simple_spec()
        }
        .to_composition();
        assert!(matches!(result, Err(Error::InvalidSpec(_))));
    }

    #[test]
    fn dairy_spec_err_when_micellar_casein_protein_is_below_milk_solids() {
        // At 30 g of protein in ~87-94 g of solids non-fat, under milk solids' 37.5%, each spec's
        // micellar casein lines would split its protein with more whey than milk has
        let simple = DairySimpleSpec {
            msnf: Some(94.0),
            protein: Some(30.0),
            solids_source: Some(SolidsSource::MicellarCasein),
            ..empty_dairy_simple_spec()
        }
        .to_composition();
        let sheet = DairySheetSpec {
            water: 5.0,
            energy: None,
            fat: 1.0,
            saturated_fat: None,
            trans_fat: None,
            sugars: Sugars::new().lactose(50.0),
            protein: 30.0,
            casein: None,
            ash: None,
            solids_source: Some(SolidsSource::MicellarCasein),
        }
        .to_composition();
        let label = DairyLabelSpec {
            serving_size: Unit::Grams(100.0),
            energy: None,
            total_fat: Unit::Grams(1.0),
            saturated_fat: None,
            trans_fat: None,
            carbohydrates: None,
            sugars: 50.0,
            protein: 30.0,
            lactose_free: None,
            sucrose: None,
            solids_source: Some(SolidsSource::MicellarCasein),
        }
        .to_composition();

        for result in [simple, sheet, label] {
            assert!(matches!(result, Err(Error::UnsupportedComposition(_))));
        }
    }

    #[test]
    fn dairy_simple_spec_err_when_micellar_casein_protein_leaves_no_lactose() {
        // At 92.1% protein, past the ~91.7% where the line's lactose runs out
        let result = DairySimpleSpec {
            msnf: Some(95.0),
            protein: Some(87.5),
            solids_source: Some(SolidsSource::MicellarCasein),
            ..empty_dairy_simple_spec()
        }
        .to_composition();
        assert!(matches!(result, Err(Error::CompositionNotPositive(_))));
    }

    #[test]
    fn dairy_simple_spec_err_when_caseinate_protein_leaves_no_minerals() {
        // 94.9 g of protein and the 0.19 g of lactose of 95 g of caseinate solids exceed them
        let result = DairySimpleSpec {
            msnf: Some(95.0),
            protein: Some(94.9),
            solids_source: Some(SolidsSource::Caseinate),
            ..empty_dairy_simple_spec()
        }
        .to_composition();
        assert!(matches!(result, Err(Error::InvalidComposition(_))));
    }

    #[test]
    fn dairy_simple_spec_err_when_whey_protein_leaves_no_lactose() {
        // At 97% protein, past the ~96.4% where the line's lactose runs out
        let result = DairySimpleSpec {
            msnf: Some(95.0),
            protein: Some(92.15),
            solids_source: Some(SolidsSource::Whey),
            ..empty_dairy_simple_spec()
        }
        .to_composition();
        assert!(matches!(result, Err(Error::CompositionNotPositive(_))));
    }

    #[test]
    fn dairy_label_spec_err_on_unsupported_unit() {
        let base = DairyLabelSpec {
            serving_size: Unit::Milliliters(250.0),
            energy: Some(160.0),
            total_fat: Unit::Grams(8.0),
            saturated_fat: Some(5.0),
            trans_fat: Some(0.3),
            carbohydrates: None,
            sugars: 13.0,
            protein: 9.0,
            lactose_free: None,
            sucrose: None,
            solids_source: None,
        };

        // serving_size,  total_fat
        // ✔ Grams,       Grams       | Percent
        // ✘ Grams,       Milliliters | MolarMass
        // ✔ Milliliters, Grams       | Percent
        // ✘ Milliliters, Milliliters | MolarMass
        // ✘ Percent,     any unit
        // ✘ MolarMass,   any unit
        let bad_units = [
            // ✘ Grams,       Milliliters | MolarMass
            DairyLabelSpec {
                serving_size: Unit::Grams(250.0),
                total_fat: Unit::Milliliters(8.0),
                ..base
            },
            DairyLabelSpec {
                serving_size: Unit::Grams(250.0),
                total_fat: Unit::MolarMass(3.25),
                ..base
            },
            // ✘ Milliliters, Milliliters | MolarMass
            DairyLabelSpec {
                serving_size: Unit::Milliliters(100.0),
                total_fat: Unit::Milliliters(8.0),
                ..base
            },
            DairyLabelSpec {
                serving_size: Unit::Milliliters(250.0),
                total_fat: Unit::MolarMass(3.25),
                ..base
            },
            // ✘ Percent,     any unit
            DairyLabelSpec {
                serving_size: Unit::Percent(100.0),
                total_fat: Unit::Grams(8.0),
                ..base
            },
            DairyLabelSpec {
                serving_size: Unit::Percent(100.0),
                total_fat: Unit::Milliliters(8.0),
                ..base
            },
            DairyLabelSpec {
                serving_size: Unit::Percent(100.0),
                total_fat: Unit::Percent(3.25),
                ..base
            },
            DairyLabelSpec {
                serving_size: Unit::Percent(100.0),
                total_fat: Unit::MolarMass(8.0),
                ..base
            },
            // ✘ MolarMass,   any unit
            DairyLabelSpec {
                serving_size: Unit::MolarMass(100.0),
                total_fat: Unit::Grams(8.0),
                ..base
            },
            DairyLabelSpec {
                serving_size: Unit::MolarMass(100.0),
                total_fat: Unit::Milliliters(8.0),
                ..base
            },
            DairyLabelSpec {
                serving_size: Unit::MolarMass(100.0),
                total_fat: Unit::Percent(3.25),
                ..base
            },
            DairyLabelSpec {
                serving_size: Unit::MolarMass(100.0),
                total_fat: Unit::MolarMass(8.0),
                ..base
            },
        ];

        for spec in bad_units {
            let result = spec.to_composition();
            assert!(matches!(result, Err(Error::UnsupportedCompositionUnit(_))));
        }
    }

    #[test]
    fn dairy_label_spec_err_on_negative_field() {
        let base = DairyLabelSpec {
            serving_size: Unit::Grams(250.0),
            energy: Some(160.0),
            total_fat: Unit::Grams(8.0),
            saturated_fat: Some(5.0),
            trans_fat: Some(0.3),
            carbohydrates: None,
            sugars: 13.0,
            protein: 9.0,
            lactose_free: None,
            sucrose: None,
            solids_source: None,
        };

        let neg_cases = [
            DairyLabelSpec {
                serving_size: Unit::Grams(-1.0),
                ..base
            },
            DairyLabelSpec {
                total_fat: Unit::Grams(-1.0),
                ..base
            },
            DairyLabelSpec {
                saturated_fat: Some(-1.0),
                ..base
            },
            DairyLabelSpec {
                trans_fat: Some(-1.0),
                ..base
            },
            DairyLabelSpec { sugars: -1.0, ..base },
            DairyLabelSpec { protein: -1.0, ..base },
        ];

        for spec in neg_cases {
            let result = spec.to_composition();
            assert!(matches!(result, Err(Error::CompositionNotPositive(_))));
        }
    }

    #[test]
    fn dairy_label_spec_err_when_saturated_fat_exceeds_total_fat() {
        let result = DairyLabelSpec {
            serving_size: Unit::Grams(250.0),
            energy: Some(160.0),
            total_fat: Unit::Grams(5.0),
            saturated_fat: Some(8.0),
            trans_fat: Some(0.0),
            carbohydrates: None,
            sugars: 13.0,
            protein: 9.0,
            lactose_free: None,
            sucrose: None,
            solids_source: None,
        }
        .to_composition();
        assert!(matches!(result, Err(Error::InvalidComposition(_))));
    }

    #[test]
    fn dairy_label_spec_err_when_trans_fat_exceeds_total_fat() {
        let result = DairyLabelSpec {
            serving_size: Unit::Grams(250.0),
            energy: Some(160.0),
            total_fat: Unit::Grams(5.0),
            saturated_fat: Some(3.0),
            trans_fat: Some(8.0),
            carbohydrates: None,
            sugars: 13.0,
            protein: 9.0,
            lactose_free: None,
            sucrose: None,
            solids_source: None,
        }
        .to_composition();
        assert!(matches!(result, Err(Error::InvalidComposition(_))));
    }

    #[test]
    fn dairy_label_spec_err_when_fat_plus_sugars_plus_protein_exceeds_serving_size() {
        let result = DairyLabelSpec {
            serving_size: Unit::Grams(20.0),
            energy: Some(160.0),
            total_fat: Unit::Grams(8.0),
            saturated_fat: Some(5.0),
            trans_fat: Some(0.3),
            carbohydrates: None,
            sugars: 13.0,
            protein: 9.0,
            lactose_free: None,
            sucrose: None,
            solids_source: None,
        }
        .to_composition();
        assert!(matches!(result, Err(Error::InvalidComposition(_))));
    }

    fn usda_whole_milk_sheet_spec() -> DairySheetSpec {
        let TaggedSpec::DairySheetSpec(spec) = ING_SPEC_DAIRY_SHEET_WHOLE_MILK_USDA.spec else {
            unreachable!("the USDA whole milk asset is a DairySheetSpec");
        };
        spec
    }

    #[test]
    fn dairy_sheet_spec_whey_unaccounted_solids() {
        // Hilmar 9000's bulletin sums to 97.5%, so beside its 2.5 g of ash, the other milk solids
        // hold the 2.5 g it doesn't account for
        let comp = ING_SPEC_DAIRY_SHEET_WPI_HILMAR.spec.to_composition().unwrap();

        assert_eq_flt_test!(comp.get(CompKey::MSNF), 95.0);
        assert_eq_flt_test!(comp.get(CompKey::Lactose), 1.0);
        assert_eq_flt_test!(comp.get(CompKey::Whey), 89.0);
        assert_eq_flt_test!(comp.get(CompKey::MilkMinerals), 2.5);
        assert_eq_flt_test!(comp.get(CompKey::MilkSNFS), 89.0 + 2.5 + 2.5);
        assert_eq_flt_test!(comp.get(CompKey::Water), 4.5);
    }

    #[test]
    fn dairy_sheet_spec_lactose_free() {
        // The glucose and galactose its lactose breaks down into still count as milk solids
        let comp = DairySheetSpec {
            sugars: Sugars::new().glucose(4.81 / 2.0).galactose(4.81 / 2.0),
            ..usda_whole_milk_sheet_spec()
        }
        .to_composition()
        .unwrap();

        assert_eq!(comp.get(CompKey::Lactose), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::Glucose), 4.81 / 2.0);
        assert_eq_flt_test!(comp.get(CompKey::Galactose), 4.81 / 2.0);
        assert_eq_flt_test!(comp.get(CompKey::MilkSugars), 4.81);
        assert_eq_flt_test!(comp.get(CompKey::MSNF), 8.88);
    }

    #[test]
    fn dairy_sheet_spec_listed_ash_sets_the_minerals() {
        // USDA's whole milk lists 0.8 g of ash, 0.18 g past what its water leaves beside its sugars
        // and protein, so the water gives way to the listed solids
        let comp = usda_whole_milk_sheet_spec().to_composition().unwrap();

        assert_eq_flt_test!(comp.get(CompKey::MilkMinerals), 0.8);
        assert_eq_flt_test!(comp.get(CompKey::MSNF), 8.88);
        assert_eq_flt_test!(comp.get(CompKey::Water), 87.92);
        assert_eq_flt_test!(comp.solids.milk.others, 0.0);
    }

    #[test]
    fn dairy_sheet_spec_unlisted_ash_yields_to_the_water() {
        // Without its ash, USDA's whole milk leaves 0.62 g beside its sugars and protein, under the
        // modeled 0.70 g, so the minerals take that remainder and the listed water stands
        let comp = DairySheetSpec {
            ash: None,
            ..usda_whole_milk_sheet_spec()
        }
        .to_composition()
        .unwrap();

        assert_eq_flt_test!(comp.get(CompKey::MilkMinerals), 0.62);
        assert_eq_flt_test!(comp.get(CompKey::MSNF), 8.7);
        assert_eq_flt_test!(comp.get(CompKey::Water), 88.1);
        assert_eq!(comp.solids.milk.others, 0.0);
    }

    #[test]
    fn dairy_sheet_spec_unlisted_ash_is_modeled() {
        // Without an ash, USDA's heavy cream leaves 1.37 g beside its sugars and protein, so the
        // minerals take the modeled 0.51 g, and the other milk solids the rest
        let comp = DairySheetSpec {
            water: 58.13,
            energy: None,
            fat: 35.56,
            saturated_fat: None,
            trans_fat: None,
            sugars: Sugars::new().lactose(2.92),
            protein: 2.02,
            casein: None,
            ash: None,
            solids_source: None,
        }
        .to_composition()
        .unwrap();

        assert_eq_flt_test!(comp.get(CompKey::MilkMinerals), 0.51);
        assert_eq_flt_test!(comp.solids.milk.others, 0.86);
        assert_eq_flt_test!(comp.get(CompKey::Water), 58.13);
    }

    #[test]
    fn dairy_sheet_spec_casein_replaces_solids_source_split() {
        // A listed casein sets the split whatever the solids source, and whey takes the rest
        let milk = DairySheetSpec {
            casein: Some(2.5),
            ..usda_whole_milk_sheet_spec()
        };
        let comp = milk.to_composition().unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Casein), 2.5);
        assert_eq_flt_test!(comp.get(CompKey::Whey), milk.protein - 2.5);

        for source in [
            SolidsSource::Whey,
            SolidsSource::MicellarCasein,
            SolidsSource::Caseinate,
        ] {
            let spec = DairySheetSpec {
                solids_source: Some(source),
                ..milk
            };
            assert_eq!(spec.to_composition().unwrap(), comp);
        }
    }

    #[test]
    fn dairy_sheet_spec_err_on_negative_field() {
        let base = usda_whole_milk_sheet_spec();

        let neg_cases = [
            DairySheetSpec { water: -1.0, ..base },
            DairySheetSpec { fat: -1.0, ..base },
            DairySheetSpec {
                saturated_fat: Some(-1.0),
                ..base
            },
            DairySheetSpec {
                trans_fat: Some(-1.0),
                ..base
            },
            DairySheetSpec {
                sugars: Sugars::new().lactose(-1.0),
                ..base
            },
            DairySheetSpec {
                sugars: Sugars::new().lactose(4.81).sucrose(-1.0),
                ..base
            },
            DairySheetSpec { protein: -1.0, ..base },
            DairySheetSpec {
                casein: Some(-1.0),
                ..base
            },
            DairySheetSpec {
                ash: Some(-1.0),
                ..base
            },
        ];

        for spec in neg_cases {
            let result = spec.to_composition();
            assert!(matches!(result, Err(Error::CompositionNotPositive(_))));
        }
    }

    #[test]
    fn dairy_sheet_spec_err_when_water_plus_fat_plus_sugars_plus_protein_exceeds_100() {
        let result = DairySheetSpec {
            water: 90.0,
            ..usda_whole_milk_sheet_spec()
        }
        .to_composition();
        assert!(matches!(result, Err(Error::CompositionNotWithin100Percent(_))));
    }

    #[test]
    fn dairy_sheet_spec_err_when_saturated_fat_exceeds_fat() {
        let result = DairySheetSpec {
            saturated_fat: Some(4.0),
            ..usda_whole_milk_sheet_spec()
        }
        .to_composition();
        assert!(matches!(result, Err(Error::InvalidComposition(_))));
    }

    #[test]
    fn dairy_sheet_spec_err_when_trans_fat_exceeds_fat() {
        let result = DairySheetSpec {
            trans_fat: Some(4.0),
            ..usda_whole_milk_sheet_spec()
        }
        .to_composition();
        assert!(matches!(result, Err(Error::InvalidComposition(_))));
    }

    #[test]
    fn dairy_sheet_spec_err_when_casein_exceeds_protein() {
        let base = usda_whole_milk_sheet_spec();
        let result = DairySheetSpec {
            casein: Some(base.protein + 0.1),
            ..base
        }
        .to_composition();
        assert!(matches!(result, Err(Error::InvalidComposition(_))));
    }

    #[test]
    fn split_milk_sugars_by_type() {
        let sugars = Sugars::new()
            .lactose(1.0)
            .glucose(2.0)
            .galactose(3.0)
            .sucrose(4.0)
            .fructose(5.0)
            .maltose(6.0)
            .trehalose(7.0)
            .other(8.0);

        let (milk_sugars, other_sugars) = split_milk_sugars(sugars);

        assert_eq!(milk_sugars, Sugars::new().lactose(1.0).glucose(2.0).galactose(3.0));
        assert_eq!(
            other_sugars,
            Sugars::new()
                .sucrose(4.0)
                .fructose(5.0)
                .maltose(6.0)
                .trehalose(7.0)
                .other(8.0)
        );
        assert_eq!(milk_sugars.add(&other_sugars), sugars);
    }

    #[test]
    fn dairy_sheet_spec_err_on_unspecified_sugars() {
        let result = DairySheetSpec {
            sugars: Sugars::new().other(4.81),
            ..usda_whole_milk_sheet_spec()
        }
        .to_composition();
        assert!(matches!(result, Err(Error::CannotComputePOD(_))));
    }
}

//! [`DairySimpleSpec`], [`DairyLabelSpec`], [`DairySheetSpec`], and associated implementations,
//! for dairy ingredients such as milk, cream, milk powders, protein powders, etc.

use serde::{Deserialize, Serialize};

use crate::{
    composition::{
        Carbohydrates, Composition, Fats, MilkProteins, MilkSolids, PAC, ScaleComponents, SimpleSolids, Solids, Sugars,
        ToComposition,
    },
    constants::{
        composition::dairy::{
            STD_CASEIN_PROTEIN_IN_MSNF_PROTEIN, STD_MIN_WATER_CONTENT_IN_MILK_POWDER, STD_MSNF_IN_MILK_SERUM,
            STD_PROTEIN_IN_MSNF, STD_SATURATED_FAT_IN_MILK_FAT, STD_TRANS_FAT_IN_MILK_FAT,
            STD_WHEY_PROTEIN_IN_MSNF_PROTEIN, lactose_in_snf_coeffs, minerals_in_snf_coeffs, whey::STD_PROTEIN_IN_WS,
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
    composition::{ArtificialSweeteners, Polyols},
    constants::{
        self,
        composition::dairy::{
            self, STD_LACTOSE_IN_MSNF, STD_MINERALS_IN_MSNF, casein::STD_MINERALS_IN_CASEIN, lactose_in_snf,
            minerals_in_snf,
        },
    },
};

/// Indicates the origin of the non-fat solids in a dairy product, which affects its composition
#[derive(PartialEq, Eq, Serialize, Deserialize, Copy, Clone, Debug)]
pub enum SolidsSource {
    /// Milk solids (MSNF), a natural ~80/20 casein/whey proteins split, lactose, ~8% minerals
    ///
    /// See [`STD_LACTOSE_IN_MSNF`], [`STD_PROTEIN_IN_MSNF`], [`STD_MINERALS_IN_MSNF`],
    /// [`STD_WHEY_PROTEIN_IN_MSNF_PROTEIN`], and [`STD_CASEIN_PROTEIN_IN_MSNF_PROTEIN`] for details
    /// about the composition assumptions.
    Milk,
    /// Sweet whey solids (WS) and their concentrates: whey proteins, lactose, 3.6-8.5% minerals
    ///
    /// Lactose and minerals decrease linearly as protein is concentrated, from sweet whey to
    /// isolates, as computed by [`lactose_in_snf`] and [`minerals_in_snf`]. See [`dairy::whey`] for
    /// more information about the detailed composition of whey products.
    Whey,
    /// Casein solids, all casein proteins, ~10% minerals
    //
    // @todo The mineral content is an estimate
    Casein,
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
/// process increases the protein concentration beyond that of typical milk or whey. Whey
/// products also need to specify the corresponding [`solids_source`](Self::solids_source).
//
// @todo Add support for milk concentrates, e.g. ultra-filtered milk. The lactose content, which
// decreases as protein increases, is currently overestimated; see handling of whey concentrates.
// @todo Add support for casein as a solids source, most likely only casein concentrates.
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
    /// See [`STD_PROTEIN_IN_MSNF`] and [`STD_PROTEIN_IN_WS`] for those standard values. The
    /// detailed proteins breakdown is determined by [`solids_source`](Self::solids_source). If
    /// that is [`SolidsSource::Whey`], the lactose content is also determined by the protein
    /// content, as given by [`lactose_in_snf`].
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

        let std_protein_in_snf = match solids_source {
            SolidsSource::Milk => STD_PROTEIN_IN_MSNF,
            SolidsSource::Whey => STD_PROTEIN_IN_WS,
            SolidsSource::Casein => {
                return Err(Error::UnsupportedComposition(
                    "Casein solids source is not supported in DairySimpleSpec".to_string(),
                ));
            }
        };

        let proteins = protein.unwrap_or(msnf * std_protein_in_snf);
        let lactose = estimate_lactose(msnf, proteins, solids_source);

        verify_are_positive(&[fat, msnf, proteins, sucrose])?;
        verify_is_within_100_percent(fat + msnf + sucrose)?;
        verify_is_subset(proteins, msnf, "proteins <= msnf")?;

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
            .proteins(make_milk_proteins(proteins, solids_source))
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
/// [`solids_source`](Self::solids_source): [`STD_MINERALS_IN_MSNF`] for
/// [`Milk`](SolidsSource::Milk), [`STD_MINERALS_IN_CASEIN`] for [`Casein`](SolidsSource::Casein),
/// and for [`Whey`](SolidsSource::Whey) a line in the protein fraction, see [`minerals_in_snf`].
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
    /// Note that any difference is included under [`Solids::other`], not under [`Solids::milk`].
    #[serde(skip_serializing_if = "Option::is_none")]
    pub carbohydrates: Option<f64>,
    /// Sugars content per serving, in grams; the detailed composition is determined by
    /// [`lactose_free`](Self::lactose_free) and [`sucrose`](Self::sucrose).
    ///
    /// If [`carbohydrates`](Self::carbohydrates) is specified, this must be a subset of it. If not
    /// specified, they are assumed to be equal, which is the case for most dairy products.
    pub sugars: f64,
    /// Protein content per serving, in grams.
    ///
    /// The detailed proteins breakdown is determined by [`solids_source`](Self::solids_source).
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
        let other_carbohydrates = carbohydrates - sugars;
        let solids_source = solids_source.unwrap_or(SolidsSource::Milk);

        let calculated_snf = estimate_snf(dairy_sugars, protein, solids_source);
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

        let dairy_sugars = make_dairy_sugars(dairy_sugars, lactose_free);
        let other_sugars = Sugars::new().sucrose(sucrose);
        let total_sugars = dairy_sugars.add(&other_sugars);

        let milk_solids = MilkSolids::new()
            .fats(Fats::new().total(total_fat).saturated(saturated_fat).trans(trans_fat))
            .carbohydrates(Carbohydrates::new().sugars(dairy_sugars))
            .proteins(make_milk_proteins(protein, solids_source))
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
/// **Note:** The solids non-fat are calculated by difference from the listed water, as
/// `100 - water - fat - added_sugars`, with no assumptions about their mineral content. In
/// contrast, [`DairyLabelSpec`] lacks the water, so it estimates the solids non-fat from the sugars
/// and protein plus the minerals modeled for the solids source, and the water is what remains.
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct DairySheetSpec {
    /// Water content, in grams per 100 g; spec sheets usually list it as moisture
    ///
    /// Water content determines the amount of milk solids non-fat in the ingredient, what remains
    /// of the 100 g after the water, [`fat`](Self::fat), and added [`sugars`](Self::sugars).
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
    /// The detailed proteins breakdown is determined by [`solids_source`](Self::solids_source).
    pub protein: f64,
    /// Ash or mineral content, in grams per 100 g, if listed
    ///
    /// This does not currently affect the composition; minerals are implicitly counted as part of
    /// other milk solids that remain from the solids non-fat less the milk sugars and
    /// [`protein`](Self::protein). However, it should still be specified if listed, as it will
    /// eventually be used to inform PAC calculations in place of [`pac::MSNF_WS_SALTS`].
    //
    // @todo Derive the milk salts' PAC from this mineral content, replacing `pac::MSNF_WS_SALTS`,
    // which doesn't hold for concentrates that have a lower relative mineral content.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ash: Option<f64>,
    /// Source of the solids non-fat in this product, [`SolidsSource::Milk`] if unspecified
    ///
    /// This affects the detailed protein composition of the solids non-fat.
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
            ash,
            solids_source,
        } = *self;

        let saturated_fat = saturated_fat.unwrap_or(STD_SATURATED_FAT_IN_MILK_FAT * fat);
        let trans_fat = trans_fat.unwrap_or(STD_TRANS_FAT_IN_MILK_FAT * fat);
        let solids_source = solids_source.unwrap_or(SolidsSource::Milk);

        sugars.validate()?;

        verify_are_positive(&[water, fat, saturated_fat, trans_fat, protein, ash.unwrap_or(0.0)])?;
        verify_is_within_100_percent(water + fat + sugars.total() + protein)?;
        verify_is_subset(saturated_fat, fat, "saturated_fat <= fat")?;
        verify_is_subset(trans_fat, fat, "trans_fat <= fat")?;

        let (milk_sugars, other_sugars) = split_milk_sugars(sugars);
        let snf = 100.0 - water - fat - other_sugars.total();

        let milk_solids = MilkSolids::new()
            .fats(Fats::new().total(fat).saturated(saturated_fat).trans(trans_fat))
            .carbohydrates(Carbohydrates::new().sugars(milk_sugars))
            .proteins(make_milk_proteins(protein, solids_source))
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

/// Estimates the solids non-fat from their `sugars` and `protein`, adding `source`'s minerals
const fn estimate_snf(sugars: f64, protein: f64, source: SolidsSource) -> f64 {
    // Solves `snf = sugars + protein + snf × minerals_in_snf(protein / snf)`. The fraction is
    // linear, `a + b × protein / snf`, so `snf = sugars + protein + snf × (a + b × protein / snf)`.
    // Solving for `snf` gives `snf = (sugars + (1 + b) × protein) / (1 - a)`
    let [a, b] = minerals_in_snf_coeffs(source);
    (sugars + (1.0 + b) * protein) / (1.0 - a)
}

/// Estimates the lactose in `snf` grams of `source`'s solids non-fat from their `protein` content
const fn estimate_lactose(snf: f64, protein: f64, source: SolidsSource) -> f64 {
    // The lactose, `snf × lactose_in_snf(protein / snf, source)`, is `a × snf + b × protein`
    let [a, b] = lactose_in_snf_coeffs(source);
    a * snf + b * protein
}

/// Splits a total milk protein content into casein and whey according to the [`SolidsSource`].
///
/// Milk solids carry the natural ~80/20 casein/whey split ([`STD_CASEIN_PROTEIN_IN_MSNF_PROTEIN`],
/// [`STD_WHEY_PROTEIN_IN_MSNF_PROTEIN`]); whey and casein solids are entirely whey or casein.
pub(crate) fn make_milk_proteins(total: f64, source: SolidsSource) -> MilkProteins {
    match source {
        SolidsSource::Milk => MilkProteins::new()
            .casein(total * STD_CASEIN_PROTEIN_IN_MSNF_PROTEIN)
            .whey(total * STD_WHEY_PROTEIN_IN_MSNF_PROTEIN),
        SolidsSource::Whey => MilkProteins::new().whey(total),
        SolidsSource::Casein => MilkProteins::new().casein(total),
    }
}

#[cfg(test)]
#[cfg_attr(coverage, coverage(off))]
#[allow(clippy::unwrap_used, clippy::float_cmp)]
pub(crate) mod tests {
    use std::sync::LazyLock;

    use crate::tests::asserts::shadow_asserts::assert_eq;
    use crate::tests::asserts::*;

    use crate::tests::util::relative_diff_percent;

    use super::*;
    use crate::{
        composition::{CompKey, SolidsBreakdown},
        constants::composition::dairy::whey::{
            STD_LACTOSE_IN_WPI, STD_LACTOSE_IN_WS, STD_MINERALS_IN_WPI, STD_MINERALS_IN_WS, STD_PROTEIN_IN_WPI,
        },
        error::Error,
        ingredient::Category,
        specs::IngredientSpec,
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
                        .others_from_total(9.0)
                        .unwrap(),
                ),
            )
            .pod(0.7848)
            .pac(PAC::new().sugars(4.905).msnf_ws_salts(3.3066))
    });

    #[test]
    fn to_composition_dairy_simple_spec_0_milk() {
        let comp = ING_SPEC_DAIRY_SIMPLE_0_MILK.spec.to_composition().unwrap();

        assert_eq!(comp.get(CompKey::Energy), 33.12);

        assert_eq!(comp.get(CompKey::MilkFat), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::Lactose), 4.905);
        assert_eq!(comp.get(CompKey::MSNF), 9.0);
        assert_eq!(comp.get(CompKey::MilkSNFS), 4.095);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 3.375);
        assert_eq_flt_test!(comp.get(CompKey::Casein), 2.7);
        assert_eq_flt_test!(comp.get(CompKey::Whey), 0.675);
        assert_eq!(comp.get(CompKey::MilkSolids), 9.0);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 3.375);
        assert_eq!(comp.get(CompKey::TotalSolids), 9.0);
        assert_eq!(comp.get(CompKey::Water), 91.0);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::TotalEmulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::TotalStabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 0.7848);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 4.905);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 3.3066);
        assert_eq_flt_test!(comp.get(CompKey::TotalPAC), 8.2116);

        assert_eq!(comp.get(CompKey::SaturatedFat), 0.0);
        assert_eq!(comp.get(CompKey::TransFat), 0.0);
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
                        .others_from_total(2.0 + 8.82)
                        .unwrap(),
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
                        .others(0.6966),
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
                        .others_from_total(40.0 + 5.4)
                        .unwrap(),
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
                        .others_from_total(2.0 + 8.82)
                        .unwrap(),
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
                        .others_from_total(97.0)
                        .unwrap(),
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
                        .others_from_total(98.0)
                        .unwrap(),
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
            .energy(31.548)
            .solids(
                Solids::new().milk(
                    SolidsBreakdown::new()
                        .fats(Fats::new().total(0.0))
                        .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(4.687)))
                        .proteins(MilkProteins::new().casein(2.56).whey(0.64))
                        .others_from_total(8.6)
                        .unwrap(),
                ),
            )
            .pod(0.7499)
            .pac(PAC::new().sugars(4.687).msnf_ws_salts(3.1597))
    });

    #[test]
    fn to_composition_dairy_simple_spec_skim_milk_goff_hartel() {
        let comp = ING_SPEC_DAIRY_SIMPLE_SKIM_MILK_GOFF_HARTEL
            .spec
            .to_composition()
            .unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Energy), 31.548);

        assert_eq!(comp.get(CompKey::MilkFat), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::Lactose), 4.687);
        assert_eq!(comp.get(CompKey::MSNF), 8.6);
        assert_eq_flt_test!(comp.get(CompKey::MilkSNFS), 3.913);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 3.2);
        assert_eq_flt_test!(comp.get(CompKey::Casein), 2.56);
        assert_eq_flt_test!(comp.get(CompKey::Whey), 0.64);
        assert_eq!(comp.get(CompKey::MilkSolids), 8.6);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 3.2);
        assert_eq!(comp.get(CompKey::TotalSolids), 8.6);
        assert_eq!(comp.get(CompKey::Water), 91.4);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::TotalEmulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::TotalStabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 0.7499);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 4.687);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 3.1597);
        assert_eq_flt_test!(comp.get(CompKey::TotalPAC), 7.8467);

        assert_eq!(comp.get(CompKey::SaturatedFat), 0.0);
        assert_eq!(comp.get(CompKey::TransFat), 0.0);
    }

    // https://fdc.nal.usda.gov/food-details/2705385/nutrients
    pub(crate) const ING_SPEC_DAIRY_LABEL_WHOLE_MILK_USDA_STR: &str = r#"{
      "name": "USDA Whole Milk",
      "category": "Dairy",
      "DairyLabelSpec": {
        "serving_size": { "grams": 100 },
        "energy": 61,
        "total_fat": { "grams": 3.2 },
        "saturated_fat": 1.86,
        "sugars": 4.81,
        "protein": 3.27
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_LABEL_WHOLE_MILK_USDA: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "USDA Whole Milk".to_string(),
            category: Category::Dairy,
            spec: DairyLabelSpec {
                serving_size: Unit::Grams(100.0),
                energy: Some(61.0),
                total_fat: Unit::Grams(3.2),
                saturated_fat: Some(1.86),
                trans_fat: None,
                carbohydrates: None,
                sugars: 4.81,
                protein: 3.27,
                lactose_free: None,
                sucrose: None,
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
                        .others(0.7026),
                ),
            )
            .pod(0.7696)
            .pac(PAC::new().sugars(4.81).msnf_ws_salts(3.2268))
    });

    #[test]
    fn to_composition_dairy_label_spec_whole_milk_usda() {
        let comp = ING_SPEC_DAIRY_LABEL_WHOLE_MILK_USDA.spec.to_composition().unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Energy), 61.0);

        assert_eq!(comp.get(CompKey::MilkFat), 3.2);
        assert_eq_flt_test!(comp.get(CompKey::Lactose), 4.81);
        assert_eq_flt_test!(comp.get(CompKey::MSNF), 8.7826);
        assert_eq_flt_test!(comp.get(CompKey::MilkSNFS), 3.9726);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 3.27);
        assert_eq_flt_test!(comp.get(CompKey::Casein), 2.616);
        assert_eq_flt_test!(comp.get(CompKey::Whey), 0.654);
        assert_eq_flt_test!(comp.get(CompKey::MilkSolids), 11.9826);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 3.27);
        assert_eq_flt_test!(comp.get(CompKey::TotalSolids), 11.9826);
        assert_eq_flt_test!(comp.get(CompKey::Water), 88.0174);

        // USDA lists water as 88.1
        assert_eq_flt_test!(relative_diff_percent(comp.get(CompKey::Water), 88.1), 0.0938);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::TotalEmulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::TotalStabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 0.7696);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 4.81);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 3.2268);
        assert_eq_flt_test!(comp.get(CompKey::TotalPAC), 8.0368);

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
                        .others(0.7411),
                ),
            )
            .pod(0.8058)
            .pac(PAC::new().sugars(5.0364).msnf_ws_salts(3.4037))
    });

    #[test]
    fn to_composition_dairy_label_spec_3_25_milk_sealtest() {
        let comp = ING_SPEC_DAIRY_LABEL_3_25_MILK_SEALTEST.spec.to_composition().unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Energy), 61.9859);

        assert_eq_flt_test!(comp.get(CompKey::MilkFat), 3.25);
        assert_eq_flt_test!(comp.get(CompKey::Lactose), 5.0364);
        assert_eq_flt_test!(comp.get(CompKey::MSNF), 9.2642);
        assert_eq_flt_test!(comp.get(CompKey::MilkSNFS), 4.2278);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 3.4867);
        assert_eq_flt_test!(comp.get(CompKey::Casein), 2.7894);
        assert_eq_flt_test!(comp.get(CompKey::Whey), 0.6973);
        assert_eq_flt_test!(comp.get(CompKey::MilkSolids), 12.5142);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 3.4867);
        assert_eq_flt_test!(comp.get(CompKey::TotalSolids), 12.5142);
        assert_eq_flt_test!(comp.get(CompKey::Water), 87.4858);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::TotalEmulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::TotalStabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 0.8058);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 5.0364);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 3.4037);
        assert_eq_flt_test!(comp.get(CompKey::TotalPAC), 8.4401);

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
                        .proteins(MilkProteins::new().casein(4.1969).whey(1.0492))
                        .others(0.6667),
                ),
            )
            .pod(1.7554)
            .pac(PAC::new().sugars(4.6004).msnf_ws_salts(3.062))
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
        assert_eq_flt_test!(comp.get(CompKey::MSNF), 8.334);
        assert_eq_flt_test!(comp.get(CompKey::MilkSNFS), 5.9128);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 5.2461);
        assert_eq_flt_test!(comp.get(CompKey::Casein), 4.1969);
        assert_eq_flt_test!(comp.get(CompKey::Whey), 1.0492);
        assert_eq_flt_test!(comp.get(CompKey::MilkSolids), 11.5624);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 5.2461);
        assert_eq_flt_test!(comp.get(CompKey::TotalSolids), 11.5624);
        assert_eq_flt_test!(comp.get(CompKey::Water), 88.4376);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::TotalEmulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::TotalStabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 1.7554);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 4.6004);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 3.062);
        assert_eq_flt_test!(comp.get(CompKey::TotalPAC), 7.6624);

        assert_eq_flt_test!(comp.get(CompKey::SaturatedFat), 2.0177);
        assert_eq_flt_test!(comp.get(CompKey::TransFat), 0.1130);
    }

    // https://fdc.nal.usda.gov/food-details/2705400/nutrients
    pub(crate) const ING_SPEC_DAIRY_LABEL_2_EVAPORATED_MILK_USDA_STR: &str = r#"{
      "name": "USDA 2% Reduced-Fat Evaporated Milk",
      "category": "Dairy",
      "DairyLabelSpec": {
        "serving_size": { "grams": 100 },
        "energy": 92,
        "total_fat": { "grams": 1.96 },
        "saturated_fat": 1.214,
        "sugars": 11.15,
        "protein": 7.42
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_LABEL_2_EVAPORATED_MILK_USDA: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "USDA 2% Reduced-Fat Evaporated Milk".to_string(),
            category: Category::Dairy,
            spec: DairyLabelSpec {
                serving_size: Unit::Grams(100.0), // 100g serving size
                energy: Some(92.0),
                total_fat: Unit::Grams(1.96),
                saturated_fat: Some(1.214),
                trans_fat: None,
                carbohydrates: None,
                sugars: 11.15,
                protein: 7.42,
                lactose_free: None,
                sucrose: None,
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
                        .others(1.6148),
                ),
            )
            .pod(1.784)
            .pac(PAC::new().sugars(11.15).msnf_ws_salts(7.416))
    });

    #[test]
    fn to_composition_dairy_label_spec_2_evaporated_milk_usda() {
        let comp = ING_SPEC_DAIRY_LABEL_2_EVAPORATED_MILK_USDA
            .spec
            .to_composition()
            .unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Energy), 92.0);

        assert_eq!(comp.get(CompKey::MilkFat), 1.96);
        assert_eq_flt_test!(comp.get(CompKey::Lactose), 11.15);
        assert_eq_flt_test!(comp.get(CompKey::MSNF), 20.1848);
        assert_eq_flt_test!(comp.get(CompKey::MilkSNFS), 9.0348);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 7.42);
        assert_eq_flt_test!(comp.get(CompKey::Casein), 5.936);
        assert_eq_flt_test!(comp.get(CompKey::Whey), 1.484);
        assert_eq_flt_test!(comp.get(CompKey::MilkSolids), 22.1448);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 7.42);
        assert_eq_flt_test!(comp.get(CompKey::TotalSolids), 22.1448);
        assert_eq_flt_test!(comp.get(CompKey::Water), 77.8552);

        // USDA lists water as 78
        assert_eq_flt_test!(relative_diff_percent(comp.get(CompKey::Water), 78.0), 0.1856);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::TotalEmulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::TotalStabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 1.784);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 11.15);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 7.416);
        assert_eq_flt_test!(comp.get(CompKey::TotalPAC), 18.566);

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
            .energy(94.9554)
            .solids(
                Solids::new()
                    .milk(
                        SolidsBreakdown::new()
                            .fats(Fats::new().total(2.0).saturated(1.2661).trans(0.07))
                            .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(6.3304)))
                            .proteins(MilkProteins::new().casein(5.0643).whey(1.2661))
                            .others(1.1009),
                    )
                    .other(SolidsBreakdown::new().carbohydrates(Carbohydrates::new().others(6.3304))),
            )
            .pod(1.0129)
            .pac(PAC::new().sugars(6.3304).msnf_ws_salts(5.0561))
    });

    #[test]
    fn to_composition_dairy_label_spec_2_evaporated_milk_carnation() {
        let comp = ING_SPEC_DAIRY_LABEL_2_EVAPORATED_MILK_CARNATION
            .spec
            .to_composition()
            .unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Energy), 94.9554);

        assert_eq!(comp.get(CompKey::MilkFat), 2.0);
        assert_eq_flt_test!(comp.get(CompKey::Lactose), 6.3304);
        assert_eq_flt_test!(comp.get(CompKey::MSNF), 13.7617);
        assert_eq_flt_test!(comp.get(CompKey::MilkSNFS), 7.4313);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 6.3304);
        assert_eq_flt_test!(comp.get(CompKey::Casein), 5.0643);
        assert_eq_flt_test!(comp.get(CompKey::Whey), 1.2661);
        assert_eq_flt_test!(comp.get(CompKey::MilkSolids), 15.7617);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 6.3304);
        assert_eq_flt_test!(comp.get(CompKey::TotalSolids), 22.092);
        assert_eq_flt_test!(comp.get(CompKey::Water), 77.908);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::TotalEmulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::TotalStabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 1.0129);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 6.3304);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 5.0561);
        assert_eq_flt_test!(comp.get(CompKey::TotalPAC), 11.3864);

        assert_eq_flt_test!(comp.get(CompKey::SaturatedFat), 1.2661);
        assert_eq_flt_test!(comp.get(CompKey::TransFat), 0.07);
    }

    // https://fdc.nal.usda.gov/food-details/171275/nutrients
    // https://fdc.nal.usda.gov/food-details/2758990/nutrients
    pub(crate) const ING_SPEC_DAIRY_LABEL_SWEETENED_CONDENSED_MILK_USDA_STR: &str = r#"{
      "name": "USDA Sweetened Condensed Milk",
      "category": "Dairy",
      "DairyLabelSpec": {
        "serving_size": { "grams": 100 },
        "energy": 321,
        "total_fat": { "grams": 8.7 },
        "saturated_fat": 5.49,
        "sugars": 54.4,
        "protein": 7.91,
        "sucrose": 44.8
      }
    }"#;

    pub(crate) static ING_SPEC_DAIRY_LABEL_SWEETENED_CONDENSED_MILK_USDA: LazyLock<IngredientSpec> =
        LazyLock::new(|| IngredientSpec {
            name: "USDA Sweetened Condensed Milk".to_string(),
            category: Category::Dairy,
            spec: DairyLabelSpec {
                serving_size: Unit::Grams(100.0),
                energy: Some(321.0),
                total_fat: Unit::Grams(8.7),
                saturated_fat: Some(5.49),
                trans_fat: None,
                carbohydrates: None,
                sugars: 54.4,
                protein: 7.91,
                lactose_free: None,
                sucrose: Some(44.8),
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
                            .others(1.5226),
                    )
                    .other(
                        SolidsBreakdown::new().carbohydrates(Carbohydrates::new().sugars(Sugars::new().sucrose(44.8))),
                    ),
            )
            .pod(46.336)
            .pac(PAC::new().sugars(54.4).msnf_ws_salts(6.9927))
    });

    #[test]
    fn to_composition_dairy_label_spec_sweetened_condensed_milk_usda() {
        let comp = ING_SPEC_DAIRY_LABEL_SWEETENED_CONDENSED_MILK_USDA
            .spec
            .to_composition()
            .unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Energy), 321.0);

        assert_eq!(comp.get(CompKey::MilkFat), 8.7);
        assert_eq_flt_test!(comp.get(CompKey::Lactose), 9.6);
        assert_eq_flt_test!(comp.get(CompKey::MSNF), 19.0326);
        assert_eq_flt_test!(comp.get(CompKey::MilkSNFS), 9.4326);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 7.91);
        assert_eq_flt_test!(comp.get(CompKey::Casein), 6.328);
        assert_eq_flt_test!(comp.get(CompKey::Whey), 1.582);
        assert_eq_flt_test!(comp.get(CompKey::MilkSolids), 27.7326);

        assert_eq_flt_test!(comp.get(CompKey::Sucrose), 44.8);
        assert_eq_flt_test!(comp.get(CompKey::TotalSugars), 54.4);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 7.91);
        assert_eq_flt_test!(comp.get(CompKey::TotalSolids), 72.5326);
        assert_eq_flt_test!(comp.get(CompKey::Water), 27.4674); // USDA lists 27.2

        // USDA lists water as 27.2
        assert_eq_flt_test!(relative_diff_percent(comp.get(CompKey::Water), 27.2), 0.9735);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::TotalEmulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::TotalStabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 46.336);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 54.4);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 6.9927);
        assert_eq_flt_test!(comp.get(CompKey::TotalPAC), 61.3927);

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
            .energy(360.7589)
            .solids(
                Solids::new()
                    .milk(
                        SolidsBreakdown::new()
                            .fats(Fats::new().total(7.7305).saturated(5.1537).trans(0.2706))
                            .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(11.2866)))
                            .proteins(MilkProteins::new().casein(4.123).whey(1.0307))
                            .others(1.4296),
                    )
                    .other(
                        SolidsBreakdown::new()
                            .carbohydrates(Carbohydrates::new().sugars(Sugars::new().sucrose(45.4041))),
                    ),
            )
            .pod(47.2099)
            .pac(PAC::new().sugars(56.6907).msnf_ws_salts(6.5655))
    });

    #[test]
    fn to_composition_dairy_label_spec_sweetened_condensed_milk_eagle_brand() {
        let comp = ING_SPEC_DAIRY_LABEL_SWEETENED_CONDENSED_MILK_EAGLE_BRAND
            .spec
            .to_composition()
            .unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Energy), 360.7589);

        assert_eq_flt_test!(comp.get(CompKey::MilkFat), 7.7305);
        assert_eq_flt_test!(comp.get(CompKey::Lactose), 11.2866);
        assert_eq_flt_test!(comp.get(CompKey::MSNF), 17.8699);
        assert_eq_flt_test!(comp.get(CompKey::MilkSNFS), 6.5833);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 5.1537);
        assert_eq_flt_test!(comp.get(CompKey::Casein), 4.123);
        assert_eq_flt_test!(comp.get(CompKey::Whey), 1.0307);
        assert_eq_flt_test!(comp.get(CompKey::MilkSolids), 25.6004);

        assert_eq_flt_test!(comp.get(CompKey::Sucrose), 45.4041);
        assert_eq_flt_test!(comp.get(CompKey::TotalSugars), 56.6907);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 5.1537);
        assert_eq_flt_test!(comp.get(CompKey::TotalSolids), 71.0045);
        assert_eq_flt_test!(comp.get(CompKey::Water), 28.9955);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::TotalEmulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::TotalStabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 47.2099);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 56.6907);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 6.5655);
        assert_eq_flt_test!(comp.get(CompKey::TotalPAC), 63.2562);

        assert_eq_flt_test!(comp.get(CompKey::SaturatedFat), 5.1537);
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
                            .others(7.3043),
                    )
                    .other(SolidsBreakdown::new().carbohydrates(Carbohydrates::new().others(4.0))),
            )
            .pod(7.68)
            .pac(PAC::new().sugars(48.0).msnf_ws_salts(33.5456))
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
        assert_eq_flt_test!(comp.get(CompKey::MSNF), 91.3043);
        assert_eq_flt_test!(comp.get(CompKey::MilkSNFS), 43.3043);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 36.0);
        assert_eq_flt_test!(comp.get(CompKey::Casein), 28.8);
        assert_eq_flt_test!(comp.get(CompKey::Whey), 7.2);
        assert_eq_flt_test!(comp.get(CompKey::MilkSolids), 91.3043);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 36.0);
        assert_eq_flt_test!(comp.get(CompKey::TotalSolids), 95.3043);
        assert_eq_flt_test!(comp.get(CompKey::Water), 4.6957);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::TotalEmulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::TotalStabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 7.68);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 48.0);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 33.5456);
        assert_eq_flt_test!(comp.get(CompKey::TotalPAC), 81.5456);

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
                        .proteins(MilkProteins::new().casein(21.3334).whey(5.3333))
                        .others(5.5072),
                ),
            )
            .pod(5.8667)
            .pac(PAC::new().sugars(36.6667).msnf_ws_salts(25.2923))
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
        assert_eq_flt_test!(comp.get(CompKey::MSNF), 68.8406);
        assert_eq_flt_test!(comp.get(CompKey::MilkSNFS), 32.1739);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 26.6667);
        assert_eq_flt_test!(comp.get(CompKey::Casein), 21.3334);
        assert_eq_flt_test!(comp.get(CompKey::Whey), 5.3333);
        assert_eq_flt_test!(comp.get(CompKey::MilkSolids), 95.5072);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 26.6667);
        assert_eq_flt_test!(comp.get(CompKey::TotalSolids), 95.5072);
        assert_eq_flt_test!(comp.get(CompKey::Water), 4.4928);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::TotalEmulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::TotalStabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 5.8667);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 36.6667);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 25.2923);
        assert_eq_flt_test!(comp.get(CompKey::TotalPAC), 61.959);

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
                        .others(7.6522),
                ),
            )
            .pod(8.512)
            .pac(PAC::new().sugars(53.2).msnf_ws_salts(35.143))
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
        assert_eq_flt_test!(comp.get(CompKey::MSNF), 95.6522);
        assert_eq_flt_test!(comp.get(CompKey::MilkSNFS), 42.4522);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 34.8);
        assert_eq_flt_test!(comp.get(CompKey::Casein), 27.84);
        assert_eq_flt_test!(comp.get(CompKey::Whey), 6.96);
        assert_eq_flt_test!(comp.get(CompKey::MilkSolids), 96.8522);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 34.8);
        assert_eq_flt_test!(comp.get(CompKey::TotalSolids), 96.8522);
        assert_eq_flt_test!(comp.get(CompKey::Water), 3.1478);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::TotalEmulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::TotalStabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 8.512);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 53.2);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 35.143);
        assert_eq_flt_test!(comp.get(CompKey::TotalPAC), 88.343);

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
                        .others(4.0),
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
                        .others(3.5586),
                ),
            )
            .pod(0.4103)
            .pac(PAC::new().sugars(2.5641).msnf_ws_salts(35.2217))
    });

    #[test]
    fn to_composition_dairy_label_spec_whey_isolate() {
        let comp = ING_SPEC_DAIRY_LABEL_WHEY_ISOLATE.spec.to_composition().unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Energy), 384.6154);

        assert_eq_flt_test!(comp.get(CompKey::MilkFat), 1.2821);
        assert_eq_flt_test!(comp.get(CompKey::Lactose), 2.5641);
        assert_eq_flt_test!(comp.get(CompKey::MSNF), 95.8663);
        assert_eq_flt_test!(comp.get(CompKey::MilkSNFS), 93.3022);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 89.7436);
        assert_eq_flt_test!(comp.get(CompKey::Whey), 89.7436);
        assert_eq_flt_test!(comp.get(CompKey::Casein), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::MilkSolids), 97.1484);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 89.7436);
        assert_eq_flt_test!(comp.get(CompKey::TotalSolids), 97.1484);
        assert_eq_flt_test!(comp.get(CompKey::Water), 2.8516);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::TotalEmulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::TotalStabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 0.4103);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 2.5641);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 35.2217);
        assert_eq_flt_test!(comp.get(CompKey::TotalPAC), 37.7858);

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
                            .others(3.2759),
                    )
                    .other(SolidsBreakdown::new().carbohydrates(Carbohydrates::new().others(0.9))),
            )
            .pod(0.528)
            .pac(PAC::new().sugars(3.3).msnf_ws_salts(31.8083))
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
        assert_eq_flt_test!(comp.get(CompKey::MSNF), 86.5759);
        assert_eq_flt_test!(comp.get(CompKey::MilkSNFS), 83.2759);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 80.0);
        assert_eq_flt_test!(comp.get(CompKey::Whey), 80.0);
        assert_eq_flt_test!(comp.get(CompKey::Casein), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::MilkSolids), 90.5759);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 80.0);
        assert_eq_flt_test!(comp.get(CompKey::TotalSolids), 91.4759);
        assert_eq_flt_test!(comp.get(CompKey::Water), 8.5241);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::TotalEmulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::TotalStabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 0.528);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 3.3);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 31.8083);
        assert_eq_flt_test!(comp.get(CompKey::TotalPAC), 35.1083);

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
        "solids_source": "Casein"
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
                solids_source: Some(SolidsSource::Casein),
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
                            .proteins(MilkProteins::new().casein(73.0))
                            .others(8.5889),
                    )
                    .other(SolidsBreakdown::new().carbohydrates(Carbohydrates::new().others(6.7))),
            )
            .pod(0.688)
            .pac(PAC::new().sugars(4.3).msnf_ws_salts(31.5559))
    });

    #[test]
    fn to_composition_dairy_label_spec_gold_standard_casein_optimum_nutrition() {
        let comp = ING_SPEC_DAIRY_LABEL_GOLD_STANDARD_CASEIN_OPTIMUM_NUTRITION
            .spec
            .to_composition()
            .unwrap();

        assert_eq_flt_test!(comp.get(CompKey::Energy), 352.0);

        assert_eq_flt_test!(comp.get(CompKey::MilkFat), 1.8);
        assert_eq_flt_test!(comp.get(CompKey::Lactose), 4.3);
        assert_eq_flt_test!(comp.get(CompKey::MSNF), 85.8889);
        assert_eq_flt_test!(comp.get(CompKey::MilkSNFS), 81.5889);
        assert_eq_flt_test!(comp.get(CompKey::MilkProteins), 73.0);
        assert_eq_flt_test!(comp.get(CompKey::Casein), 73.0);
        assert_eq_flt_test!(comp.get(CompKey::Whey), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::MilkSolids), 87.6889);

        assert_eq_flt_test!(comp.get(CompKey::TotalProteins), 73.0);
        assert_eq_flt_test!(comp.get(CompKey::TotalSolids), 94.3889);
        assert_eq_flt_test!(comp.get(CompKey::Water), 5.6111);

        assert_eq!(comp.get(CompKey::Salt), 0.0);
        assert_eq!(comp.get(CompKey::TotalEmulsifiers), 0.0);
        assert_eq!(comp.get(CompKey::TotalStabilizers), 0.0);
        assert_eq!(comp.get(CompKey::Alcohol), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::POD), 0.688);

        assert_eq_flt_test!(comp.get(CompKey::PACsgr), 4.3);
        assert_eq!(comp.get(CompKey::PACslt), 0.0);
        assert_eq_flt_test!(comp.get(CompKey::PACmlk), 31.5559);
        assert_eq_flt_test!(comp.get(CompKey::TotalPAC), 35.8559);

        assert_eq_flt_test!(comp.get(CompKey::SaturatedFat), 1.1);
        assert_eq_flt_test!(comp.get(CompKey::TransFat), 0.063);
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
                    ING_SPEC_DAIRY_LABEL_WHOLE_MILK_USDA_STR,
                    ING_SPEC_DAIRY_LABEL_WHOLE_MILK_USDA.clone(),
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
                    ING_SPEC_DAIRY_LABEL_2_EVAPORATED_MILK_USDA_STR,
                    ING_SPEC_DAIRY_LABEL_2_EVAPORATED_MILK_USDA.clone(),
                    Some(*COMP_2_EVAPORATED_MILK_USDA),
                ),
                (
                    ING_SPEC_DAIRY_LABEL_2_EVAPORATED_MILK_CARNATION_STR,
                    ING_SPEC_DAIRY_LABEL_2_EVAPORATED_MILK_CARNATION.clone(),
                    Some(*COMP_2_EVAPORATED_MILK_CARNATION),
                ),
                (
                    ING_SPEC_DAIRY_LABEL_SWEETENED_CONDENSED_MILK_USDA_STR,
                    ING_SPEC_DAIRY_LABEL_SWEETENED_CONDENSED_MILK_USDA.clone(),
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

    #[test]
    fn dairy_label_spec_whey_minerals_line_endpoints() {
        // 90g of whey solids at each end of the line, sweet whey and isolate, with 1g of fat. The
        // label's sugars are by difference, as USDA's are, so they hold the unaccounted solids too
        for (protein_fraction, minerals_fraction) in [
            (STD_PROTEIN_IN_WS, STD_MINERALS_IN_WS),
            (STD_PROTEIN_IN_WPI, STD_MINERALS_IN_WPI),
        ] {
            let sugars_by_difference = 1.0 - protein_fraction - minerals_fraction;
            let comp = DairyLabelSpec {
                serving_size: Unit::Grams(100.0),
                energy: None,
                total_fat: Unit::Grams(1.0),
                saturated_fat: None,
                trans_fat: None,
                carbohydrates: None,
                sugars: 90.0 * sugars_by_difference,
                protein: 90.0 * protein_fraction,
                lactose_free: None,
                sucrose: None,
                solids_source: Some(SolidsSource::Whey),
            }
            .to_composition()
            .unwrap();

            assert_eq_flt_test!(comp.get(CompKey::MSNF), 90.0);
            assert_eq_flt_test!(comp.get(CompKey::Water), 9.0);
        }
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

    fn empty_dairy_sheet_spec() -> DairySheetSpec {
        DairySheetSpec {
            water: 0.0,
            energy: None,
            fat: 0.0,
            saturated_fat: None,
            trans_fat: None,
            sugars: Sugars::new(),
            protein: 0.0,
            ash: None,
            solids_source: None,
        }
    }

    // https://fdc.nal.usda.gov/food-details/746782/nutrients
    fn usda_whole_milk_sheet_spec() -> DairySheetSpec {
        DairySheetSpec {
            water: 88.1,
            energy: Some(61.0),
            fat: 3.2,
            saturated_fat: Some(1.86),
            sugars: Sugars::new().lactose(4.81),
            protein: 3.27,
            ash: Some(0.8),
            ..empty_dairy_sheet_spec()
        }
    }

    #[test]
    fn dairy_sheet_spec_whey_unaccounted_solids() {
        // Hilmar 9000's bulletin sums to 97.5%, so beside its 2.5 g of ash, the other milk solids
        // hold the 2.5 g it doesn't account for
        let comp = DairySheetSpec {
            water: 4.5,
            fat: 0.5,
            sugars: Sugars::new().lactose(1.0),
            protein: 89.0,
            ash: Some(2.5),
            solids_source: Some(SolidsSource::Whey),
            ..empty_dairy_sheet_spec()
        }
        .to_composition()
        .unwrap();

        assert_eq_flt_test!(comp.get(CompKey::MSNF), 95.0);
        assert_eq_flt_test!(comp.get(CompKey::Lactose), 1.0);
        assert_eq_flt_test!(comp.get(CompKey::Whey), 89.0);
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
        assert_eq_flt_test!(comp.get(CompKey::MSNF), 8.7);
    }

    #[test]
    fn dairy_sheet_spec_ash_does_not_affect_composition() {
        let listed = usda_whole_milk_sheet_spec();
        let unlisted = DairySheetSpec { ash: None, ..listed };

        assert_eq!(listed.to_composition().unwrap(), unlisted.to_composition().unwrap());
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

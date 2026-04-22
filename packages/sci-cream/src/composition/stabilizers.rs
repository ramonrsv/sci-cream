//! [`Stabilizers`] struct and related functionality, independently tracking stabilizer components
//! of an ingredient or mix, which have an important effect on ice cream properties

use approx::AbsDiffEq;
use serde::{Deserialize, Serialize};
use struct_iterable::Iterable;

use crate::{
    composition::{ScaleComponents, Texture},
    constants::stabilization::{
        STABILIZER_STRENGTH_CARBOXYMETHYL_CELLULOSE, STABILIZER_STRENGTH_CARRAGEENANS, STABILIZER_STRENGTH_CORNSTARCH,
        STABILIZER_STRENGTH_EGG_YOLK_SOLIDS, STABILIZER_STRENGTH_GELATIN, STABILIZER_STRENGTH_GUAR_GUM,
        STABILIZER_STRENGTH_LOCUST_BEAN_GUM, STABILIZER_STRENGTH_PECTIN, STABILIZER_STRENGTH_SODIUM_ALGINATE,
        STABILIZER_STRENGTH_TAPIOCA_STARCH, STABILIZER_STRENGTH_TARA_GUM, STABILIZER_STRENGTH_WHEY_PROTEINS,
        STABILIZER_STRENGTH_XANTHAN_GUM,
    },
    error::{Error, Result},
    util::{collect_fields_copied_as, iter_all_abs_diff_eq, iter_fields_as},
    validate::{Validate, verify_are_positive, verify_is_within_100_percent},
};

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

#[cfg(doc)]
use crate::{
    composition::{CompKey, Solids},
    constants::composition::{
        STD_CASEIN_PROTEIN_IN_MSNF_PROTEIN, STD_PROTEIN_IN_MSNF, STD_WHEY_PROTEIN_IN_MSNF_PROTEIN,
    },
};

/// Stabilizer components breakdown of an ingredient or mix
///
/// Stabilizers, usually polysaccharides, are a group of ingredients commonly referred to as
/// 'hydrocolloids' - water soluble substances that form suspensions or gels in the presence of
/// water, increasing its viscosity. Even at concentrations of 1 wt% or less some hydrocolloids are
/// capable of producing highly viscous solutions with varying textures. These properties have led
/// to their widespread use in the food industry, with each hydrocolloid having unique functional
/// characteristics (Clarke, 2004, p. 50)[^4], (Cree, 2017, Stabilizers, p. 61)[^6], (Raphaelson,
/// 2023, January)[^37], (Williams, 2003, "Introduction")[^39], (Ice Cream Science, 2026, April,
/// "Why are stabilizers used in ice cream?")[^42], (Carl, 2024, April)[^43].
///
/// Stabilizers serve several purposes in ice cream formulations. Primarily, they increase mix
/// viscosity, stabilize the mix to prevent wheying off, aid in suspension of flavoring particles,
/// retard or reduce ice and lactose crystal growth over time, produce smaller ice crystal to being
/// with, provide uniformity to the product and resistance to melting, produce smoothness in texture
/// during consumption, etc. (Goff & Hartel, 2025, p. 76)[^20], (Raphaelson, 2023, January)[^37].
///
/// These components are already accounted for in [`Solids`], but they are also tracked here with a
/// more detailed breakdown, as they have a significant effect on ice cream properties, even in
/// miniscule amounts. These components do not meaningfully contribute to the other macro properties
/// of a mix, e.g. energy, [POD](crate::docs#pod), [PAC](crate::docs#pac-afp-fpdf-se), etc. Any such
/// minor contributions are accounted for in the solids breakdown.
#[doc = include_str!("../../docs/bibs/4.md")]
#[doc = include_str!("../../docs/bibs/6.md")]
#[doc = include_str!("../../docs/bibs/20.md")]
#[doc = include_str!("../../docs/bibs/37.md")]
#[doc = include_str!("../../docs/bibs/39.md")]
#[doc = include_str!("../../docs/bibs/42.md")]
#[doc = include_str!("../../docs/bibs/43.md")]
#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Iterable, PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(default, deny_unknown_fields)]
pub struct Stabilizers {
    /// Egg yolk solids, typically in the form of egg custards, which have stabilizing properties
    ///
    /// Egg custards are among the most effective stabilizers at creating great textures, but only
    /// middling at slowing ice crystal growth, likely because they exhibit _synerisis_, or weeping:
    /// they let water seep out of their gelatinous structure. Egg custard ice cream formulations
    /// typically use additional stabilizers to mitigate this issue. Another drawback of egg
    /// custards is that they dampen the release of flavours more than most other stabilizers -
    /// especially lighter and more aromatic flavours, and water-soluble flavours (fruits, etc.)
    /// (Raphaelson, 2023, January)[^37].
    ///
    /// For thickening and stabilization, egg custard ice cream formulations typically require a
    /// minimum of 3% egg yolk by weight, up to 10% being common (Raphaelson, 2023, January)[^37].
    //
    // @todo `EggSpec` does not yet populate this field, but it will in a future change to take into
    // account stabilizing contributions from other components like egg and milk proteins, etc.
    // @todo Egg yolk and egg white solids have significantly different properties with regards to
    // stabilization, emulsification, and texture, therefore they are tracked separately. `EggSpec`
    // needs to be updated to allow specifying the egg yolk and egg white breakdown of solids.
    #[doc = include_str!("../../docs/bibs/37.md")]
    pub egg_yolk_solids: f64,
    /// Whey proteins, from dairy products, which have stabilizing properties when denatured by heat
    ///
    /// Some of the whey proteins can form a gel-like network when heated to the right temperature
    /// for the right amount of time. This network functions in the same way as other hydrocolloids
    /// (Raphaelson, 2023, January)[^37].
    ///
    /// Skimmed milk powder, which is about 7% whey proteins (see [`STD_PROTEIN_IN_MSNF`],
    /// [`STD_WHEY_PROTEIN_IN_MSNF_PROTEIN`], [`STD_CASEIN_PROTEIN_IN_MSNF_PROTEIN`]), is commonly
    /// used in ice cream formulations as a source of whey proteins. Milk powder is typically used
    /// in concentrations of 3-6% by weight, although it almost always augmented with other
    /// stabilizers (Cree, 2017, Milk Powder, p. 65)[^6], (Raphaelson, 2016, May)[^7], (Pikosky,
    /// 2016, July)[^41], (Goff & Hartel, 2025, p. 315)[^20].
    #[doc = include_str!("../../docs/bibs/6.md")]
    #[doc = include_str!("../../docs/bibs/7.md")]
    #[doc = include_str!("../../docs/bibs/20.md")]
    #[doc = include_str!("../../docs/bibs/37.md")]
    #[doc = include_str!("../../docs/bibs/41.md")]
    pub whey_proteins: f64,
    /// Cornstarch, a polysaccharide derived from corn, is a common and widely available stabilizer
    ///
    /// Cornstarch is a staple in many ice cream traditions, most famously associated with Southern
    /// Italian-style gelato, where formulations often omit eggs and cream entirely, relying on the
    /// starch to provide body and stability. It has also become popular in home recipes because of
    /// its wide availability, ease of use, and reasonably good texture and stability results
    /// (Raphaelson, 2023, January)[^37].
    ///
    /// One drawback of cornstarch is that it begins to deteriorate when frozen, making it less
    /// ideal for protecting ice creams from the freeze-thaw cycle. It's typically used in
    /// concentrations of 1% by weight (Cree, 2017, Cornstarch, p. 69)[^6], (Cree, 2017, Blank Slate
    /// Custard Ice Cream, p. 115)[^6].
    ///
    /// Cornstarch generally gives better flavor release than custard, but not as good as gums
    /// (Raphaelson, 2023, January)[^37].
    #[doc = include_str!("../../docs/bibs/6.md")]
    #[doc = include_str!("../../docs/bibs/37.md")]
    pub cornstarch: f64,
    /// Tapioca starch, a polysaccharide derived from cassava root, is a common stabilizer
    ///
    /// Tapioca starch has similar properties to cornstarch, but with various advantages. It
    /// hydrates at a lower temperature than cornstarch - 60°C (140°F) vs 95°C (203°F). It can
    /// absorb more water than cornstarch, and so can be used at lower concentrations, it performs
    /// better in the freeze-thaw cycle, and it doesn't lose strength when frozen. It is typically
    /// used in concentrations of 0.5% by weight (Cree, 2017, Tapioca Starch, p. 71)[^6],
    /// (Raphaelson, 2023, January)[^37], (Chin, 2024)[^40].
    ///
    /// Tapioca starch generally gives better flavor release than custard, but not as good as gums
    /// (Raphaelson, 2023, January)[^37].
    #[doc = include_str!("../../docs/bibs/6.md")]
    #[doc = include_str!("../../docs/bibs/37.md")]
    #[doc = include_str!("../../docs/bibs/40.md")]
    pub tapioca_starch: f64,
    /// Pectin is a polysaccharide derived from the cell wall of plants, particularly citrus fruits
    ///
    /// Pectin (E440) is obtained by extraction from appropriate edible plant material, usually
    /// citrus peel or apple pomace. It is a polysaccharide consisting of linear chains of
    /// galacturonic acid and galacturonic acid methyl ester units. Pectin is classified according
    /// to its degree of esterification. High methoxy (>50% esterified) and low methoxy (<50%)
    /// pectins possess different properties (Clarke, 2004, p. 53)[^4], (The European Commission,
    /// 2025, E440)[^9].
    ///
    /// Low-methoxy pectin, widely available to home consumers, is most suitable for ice cream
    /// formulations. It requires calcium ions to form a gel, which are abundant in dairy ice cream
    /// formulations. It is typically used in concentrations of 0.1% by weight (Cree, 2017, Pectin,
    /// p. 72)[^6].
    ///
    /// Pectin is commonly used in sorbet formulations, which generally call for fruit and/or fruit
    /// juice at 30-50% by weight (sometimes as high as 75%). As such, fruits that contain a lot of
    /// pectin require special adjustments to the stabilizer use in sorbet formulations (Goff &
    /// Hartel, 2025, p. 432)[^20], (Raphaelson, 2019, July)[^35].
    #[doc = include_str!("../../docs/bibs/4.md")]
    #[doc = include_str!("../../docs/bibs/6.md")]
    #[doc = include_str!("../../docs/bibs/9.md")]
    #[doc = include_str!("../../docs/bibs/20.md")]
    #[doc = include_str!("../../docs/bibs/35.md")]
    pub pectin: f64,
    /// Gelatin, a protein derived from collagen, is one of the oldest non-egg stabilizers
    ///
    /// Gelatin (E441) is a protein derived from collagen from animal connective tissue, and was
    /// commonly used as a gelling and thickening agent. It has largely fallen out of favor in ice
    /// cream formulations due to cost, availability, and its animal origin. While it has been
    /// gradually replaced by polysaccharide stabilizers, it is still a good stabilizer, forming a
    /// weak gel that melts readily in the mouth giving no impression of gumminess, with ice crystal
    /// suppression and texture arguably superior to starches. It's also more available to home
    /// consumers than most gums (Clarke, 2004, p. 54)[^4], (The European Commission, 2025,
    /// E441)[^9],(Goff & Hartel, 2025, p. 80)[^20], (Raphaelson, 2023, January)[^37].
    ///
    /// The strength of gelatin available on the market can vary significantly, so it may require
    /// some trial and error to find the right concentration for a formulation. A common starting
    /// point is 0.4% by weight (Cree, 2017, Gelatin, p. 76)[^6]. Gelatin hydrates when cooked to
    /// a temperature of 60°C (140°F) or higher. This is not a problem for ice cream formulations,
    /// which are typically heated to at least 71°C (160°F), but it presents complications for
    /// no-cook formulations, particularly sorbets (Raphaelson, 2023, January)[^37].
    #[doc = include_str!("../../docs/bibs/4.md")]
    #[doc = include_str!("../../docs/bibs/6.md")]
    #[doc = include_str!("../../docs/bibs/9.md")]
    #[doc = include_str!("../../docs/bibs/20.md")]
    #[doc = include_str!("../../docs/bibs/37.md")]
    pub gelatin: f64,
    /// Locust Bean Gum (LBG), also known as Carob Bean Gum, is a very common gum stabilizer
    ///
    /// Locust Bean Gum (E410) is a polysaccharide derived from the seeds of the Mediterranean
    /// Ceratonia siliqua tree, more commonly known as the carob tree. LBG solutions are highly
    /// viscous at low concentrations, they have excellent freeze-thaw stability, and arguably the
    /// most powerful ice crystal suppression of all the conventional gums. It also provides a
    /// smooth, creamy texture with good flavor release. These properties make it widely regarded as
    /// a good ice cream stabilizer, considered the best stabilizer for many ice cream applications,
    /// and arguably the most important of the gums in ice cream formulations (Clarke, 2004, p.
    /// 52)[^4], (The European Commission, 2025, E410)[^9], (Goff & Hartel, 2025, p. 81)[^20],
    /// (Raphaelson, 2023, January)[^37].
    ///
    /// A drawback of LBG is its incompatibility with milk proteins, which causes a phase separation
    /// of milk proteins and polysaccharides known as 'wheying off'. The leaking of a clear watery
    /// serum layer during the melting of ice cream can cause an undesirable appearance, and the
    /// milk proteins precipitated out of the suspension can aggregate and create an undesirable
    /// grainy texture. This issue can be mitigated by using LBG in combination with small amounts
    /// of Carrageenans, which help reduce or prevent wheying off (Clarke, 2004, p. 51, 145)[^4],
    /// (Goff & Hartel, 2025, p. 80)[^20], (Raphaelson, 2023, January)[^37], (Ice Cream Science,
    /// 2026, April, "Why are stabilizers used in ice cream?")[^42].
    ///
    /// Another issue with LBG is its poor solubility in water, requiring high temperatures to fully
    /// dissolve. Most varieties of LBG require heating above 80°C (176°F) to fully hydrate, which
    /// is higher than ideal for many ice cream processes, although some varieties can hydrate at
    /// lower temperatures. This makes LBG largely incompatible with no-cook formulations,
    /// particularly sorbets (Clarke, 2004, p. 52)[^4], (Raphaelson, 2023, January)[^37].
    ///
    /// LBG is commonly used in concentrations of 0.2% by weight, although it is often used in
    /// combination with other stabilizers, usually Guar Gum and Carrageenan, due to their
    /// synergistic effects (Cree, 2017, Locust Bean Gum, p. 71)[^6], (Goff & Hartel, 2025, p.
    /// 80)[^20], (Raphaelson, 2023, January)[^37].
    #[doc = include_str!("../../docs/bibs/4.md")]
    #[doc = include_str!("../../docs/bibs/6.md")]
    #[doc = include_str!("../../docs/bibs/9.md")]
    #[doc = include_str!("../../docs/bibs/20.md")]
    #[doc = include_str!("../../docs/bibs/37.md")]
    #[doc = include_str!("../../docs/bibs/42.md")]
    pub locust_bean_gum: f64,
    /// Guar Gum is a common gum stabilizer, often used in combination with Locust Bean Gum
    ///
    /// Guar Gum (E412) is extracted from the seeds of Cyamposis tetragonolobus, an annual crop
    /// grown in the Indian subcontinent, and is chemically similar to Locust Bean Gum. Although it
    /// is not quite as effective as LBG at ice crystal suppression, its solutions have a higher
    /// viscosity than those of LBG at similar concentrations (Clarke, 2004, p. 52)[^4], (The
    /// European Commission, 2025, E412)[^9], (Goff & Hartel, 2025, p. 81)[^20], (Raphaelson, 2023,
    /// January)[^37].
    ///
    /// In combination, Guar and LBG strengthen each other through synergistic interactions, so they
    /// are often used together in ice cream formulations (Raphaelson, 2023, January)[^37].
    ///
    /// Guar Gum dissolves readily in cold water (10-30°C, 50-86°F), making it compatible with and
    /// highly desirable in certain applications, particularly no-cook formulations like sorbets
    /// (Goff & Hartel, 2025, p. 81)[^20].
    ///
    /// Similarly to Locust Bean Gum, a drawback of Guar Gum is its incompatibility with milk
    /// proteins which causes 'wheying off'. This issue can be mitigated by using Guar Gum in
    /// combination with small amounts of Carrageenans, which help reduce or prevent wheying off
    /// (Clarke, 2004, p. 51, 145)[^4], (Goff & Hartel, 2025, p. 80)[^20], (Raphaelson, 2023,
    /// January)[^37], (Ice Cream Science, 2026, April, "Why are stabilizers used in ice
    /// cream?")[^42].
    ///
    /// Guar Gum can have a strong flavour that is detectable in ice creams, which is undesirable in
    /// most applications. Some market products claim to have removed this flavour (Carl, 2024,
    /// April)[^43], (Modernist Pantry, 2026, "Perfected Guar Gum")[^116].
    ///
    /// Guar Gum is commonly used in concentrations of 0.1% by weight, although it is often used in
    /// combination with other stabilizers, usually Locust Bean Gum and Carrageenan, due to their
    /// synergistic effects (Cree, 2017, Guar Gum, p. 73)[^6], (Goff & Hartel, 2025, p. 80)[^20],
    /// (Raphaelson, 2023, January)[^37].
    #[doc = include_str!("../../docs/bibs/4.md")]
    #[doc = include_str!("../../docs/bibs/6.md")]
    #[doc = include_str!("../../docs/bibs/9.md")]
    #[doc = include_str!("../../docs/bibs/20.md")]
    #[doc = include_str!("../../docs/bibs/37.md")]
    #[doc = include_str!("../../docs/bibs/42.md")]
    #[doc = include_str!("../../docs/bibs/43.md")]
    #[doc = include_str!("../../docs/bibs/116.md")]
    pub guar_gum: f64,
    /// Carrageenans are a family of polysaccharides commonly used as stabilizers
    ///
    /// Carrageenans (E407) are complex polysaccharides of esters of galactose. They are derived
    /// from an extract of red algal seaweed, including the original source Chondrus crispus (Irish
    /// Moss), Gigartina sp., Eucheuma sp., and Kappaphycus sp. They've been used as food thickeners
    /// since the 15th century. Modern Carrageenan are usually classified as one of three types
    /// based on their molecular structure: kappa (κ), iota (ι) (both of which come from Indonesia
    /// and the Philippines) and lambda ( λ) (from the Pacific coast of North America, France,
    /// Denmark, Norway, Ireland and Great Britain). These types have different solubility
    /// temperatures, gelling characteristics, and interactions (Clarke, 2004, p. 51)[^4], (The
    /// European Commission, 2025, E407)[^9], (Goff & Hartel, 2025, p. 80)[^20], (Raphaelson, 2023,
    /// January)[^37].
    ///
    /// Most useful as a primary stabilizer in ice cream formulations is Lambda Carrageenan, which
    /// is soluble in cold water and doesn't gel; the others can form gels in the presence of
    /// calcium (dairy products). It has a moderate effect on ice crystal suppression, but a strong
    /// effect on texture, creating a rich and creamy mouthfeel similar to egg custard, but without
    /// adding any flavour of its own or muting other flavours. Lambda Carrageenan has also been
    /// shown to interact with Locust Bean Gum and Carboxymethyl Cellulose in a synergistic manner,
    /// improving the texture and characteristics of melting of the ice creams (Goff & Hartel, 2025,
    /// p. 80)[^20], (Raphaelson, 2023, January)[^37].
    ///
    /// Kappa Carrageenan is often used in ice cream formulations as a secondary hydrocolloid to
    /// prevent 'wheying off' caused by stabilizers that are incompatible with milk proteins, such
    /// as Locust Bean Gum and Guar Gum. Hence it is included in most stabilizer blends at usage
    /// rates of 0.01–0.02%. At higher concentrations, the carrageenan would begin to gel and fail
    /// to function well (Clarke, 2004, p. 51, 145)[^4], (Goff & Hartel, 2025, p. 80)[^20], (Ice
    /// Cream Science, 2026, April, "Why are stabilizers used in ice cream?")[^42].
    ///
    /// Carrageenans are almost exclusively used in combination with other stabilizers, usually
    /// Locust Bean Gum and Guar Gum, due to their synergistic effects (Clarke, 2004, p. 51,
    /// 145)[^4], (Goff & Hartel, 2025, p. 80)[^20], (Raphaelson, 2023, January)[^37]. As such,
    /// a recommended concentration of Carrageenans along has little practical meaning, but for the
    /// purposes of calculating relative strength, 0.25% by weight has been sited as a possible
    /// concentration for ice cream formulations (Cree, 2017, Carrageenans, p. 74)[^6].
    #[doc = include_str!("../../docs/bibs/4.md")]
    #[doc = include_str!("../../docs/bibs/6.md")]
    #[doc = include_str!("../../docs/bibs/9.md")]
    #[doc = include_str!("../../docs/bibs/20.md")]
    #[doc = include_str!("../../docs/bibs/37.md")]
    #[doc = include_str!("../../docs/bibs/42.md")]
    pub carrageenans: f64,
    /// Carboxymethyl Cellulose (CMC) is a stabilizer derived from purified cellulose
    ///
    /// Carboxymethyl Cellulose (E466), also known as cellulose gum, is synthesized from purified
    /// cellulose from cotton or wood pulp. It is often used in it sodium salt form, sodium
    /// carboxymethyl cellulose. It may have the strongest ice crystal suppression of any known gum.
    /// It adds body and chew comparable to Guar Gum, and is synergistic with Locust Bean Gum, Guar
    /// Gum, and Carrageenans - it forms a gel in combination with these ingredients, which can be
    /// problematic (Clarke, 2004, p. 53)[^4], (Raphaelson, 2023, January)[^37].
    ///
    /// There are low-viscosity varieties of CMC that suppress ice crystal formation with very
    /// little increase in base viscosity, if they’re used in a non-gelling blend. These
    /// theoretically allow for the relatively independent control of iciness and texture
    /// (Raphaelson, 2023, January)[^37].
    ///
    /// CMC is not commonly used in ice cream formulations due to its perception as a 'chemical' or
    /// synthetic ingredient. This is largely a marketing issue; CMC is generally recognized as safe
    /// (GRAS) by the FDA, and approved for use in food products by the European Commission (E466)
    /// (Clarke, 2004, p. 53)[^4], (The European Commission, 2025, E466)[^9], (Raphaelson, 2023,
    /// January)[^37], (Drugs.com, 2025, July, "Carboxymethylcellulose")[^44].
    ///
    /// CMC is particularly useful in sorbet formulations, since it hydrates easily in cold water,
    /// so it can be blended into fruit purees without any need for cooking. These qualities make it
    /// a perfect substitute for Locust Bean Gum (Raphaelson, 2023, January)[^37].
    #[doc = include_str!("../../docs/bibs/4.md")]
    #[doc = include_str!("../../docs/bibs/9.md")]
    #[doc = include_str!("../../docs/bibs/37.md")]
    #[doc = include_str!("../../docs/bibs/44.md")]
    pub carboxymethyl_cellulose: f64,
    /// Xanthan Gum is a polysaccharide produced by bacterial action, and is a common stabilizer
    ///
    /// Xanthan Gum (E415) is produced by the bacterium Xanthomonas campestris through fermentation
    /// of glucose, lactose, or sucrose. It is a very versatile stabilizer, soluble in cold water
    /// (10-30°C), its solutions have uniform viscosity over a wide temperature and pH range, it
    /// produces high viscosity at low concentrations, it can tolerate alcohol, freeze-thaw cycles,
    /// etc. These properties make it a very commonly used stabilizer in a wide variety of
    /// applications, including ice cream (Clarke, 2004, p. 53)[^4], (The European Commission, 2025,
    /// E415)[^9], (Goff & Hartel, 2025, p. 83)[^20], (Raphaelson, 2023, January)[^37].
    ///
    /// Solutions of Xanthan Gum have a high degree of pseudoplasticity, meaning that their
    /// viscosity decreases with shear, but quickly recovers once the shear is removed. This
    /// property is useful in sauces for ice cream. During dispensing, the viscosity is low, but as
    /// soon as shear forces cease, the viscosity rises substantially. This results in a sauce that
    /// stays put after dosing on to the product (Clarke, 2004, p. 53)[^4], (Goff & Hartel, 2025, p.
    /// 83)[^20].
    ///
    /// Xanthan Gum provides acceptable ice crystal suppression, but is not as powerful as other
    /// gums. It can also form gels when used with Locust Bean Gum, which may be problematic. As a
    /// result, it is not commonly used in commercial ice cream formulations, but it may be used in
    /// home recipes due to its wide availability (Raphaelson, 2023, January)[^37]. It is typically
    /// used in concentrations of 0.1% by weight (Cree, 2017, Xanthan Gum, p. 73)[^6]
    #[doc = include_str!("../../docs/bibs/4.md")]
    #[doc = include_str!("../../docs/bibs/6.md")]
    #[doc = include_str!("../../docs/bibs/9.md")]
    #[doc = include_str!("../../docs/bibs/20.md")]
    #[doc = include_str!("../../docs/bibs/37.md")]
    pub xanthan_gum: f64,
    /// Sodium Alginate is a polysaccharide derived from brown algae, and is a common stabilizer
    ///
    /// Sodium alginate (E401) is a polysaccharide of guluronic acid and mannuronic acid, which is
    /// extracted from brown seaweeds such as Macrocystis pyrifera and Laminaria digitata. It is a
    /// popular stabilizer, especially in low-fat and fat-free ice cream, because it forms a gel in
    /// the presence of calcium ions in the dairy. Its gelling quality makes it less useful in
    /// standard recipes, although that can be mitigated by mixing it with phosphate, citrate or
    /// tartrate ions to prevent premature gelation due to the calcium from the milk solids (Clarke,
    /// 2004, p. 51)[^4], (The European Commission, 2025, E401)[^9], (Goff & Hartel, 2025, p.
    /// 79)[^20], (Raphaelson, 2023, January)[^37].
    ///
    /// It is quite effective at ice crystal suppression, and the gel breaks into a fluid gel when
    /// the ice cream is spun, creating a unique body and viscosity. The major advantage of alginate
    /// is its resistance to acid conditions, particularly when heated, whereas other stabilizers
    /// would lose their functionality (Clarke, 2004, p. 51)[^4], (Raphaelson, 2023, January)[^37].
    #[doc = include_str!("../../docs/bibs/4.md")]
    #[doc = include_str!("../../docs/bibs/9.md")]
    #[doc = include_str!("../../docs/bibs/20.md")]
    #[doc = include_str!("../../docs/bibs/37.md")]
    pub sodium_alginate: f64,
    /// Tara Gum is a polysaccharide that has recently become available as an ice cream stabilizer
    ///
    /// Tara Gum (E417) is a polysaccharide derived from the seeds of the Tara spinosa plant, native
    /// to Peru. Chemically and functionally, it is almost exactly a 50/50 blend of Locust Bean Gum
    /// and Guar Gum, its solutions being less viscous than those of Guar Gum, but more than those
    /// of Locust Bean Gum. This makes it an attractive, one-ingredient stabilizer that offers good
    /// ice crystal suppression and thick, creamy consistency. Most Tara Gums need to be heated to
    /// around 80°C (176°F) to fully hydrate (The European Commission, 2025, E417)[^9], (Goff &
    /// Hartel, 2025, p. 82)[^20], (Raphaelson, 2023, January)[^37].
    #[doc = include_str!("../../docs/bibs/9.md")]
    #[doc = include_str!("../../docs/bibs/20.md")]
    #[doc = include_str!("../../docs/bibs/37.md")]
    pub tara_gum: f64,
    /// Other unspecified stabilizers, which require the `strength` parameter to be provided in
    /// in order to calculate the contribution to texture; see [`to_texture`](Self::to_texture).
    pub other: f64,
}

impl Stabilizers {
    /// Creates an empty [`Stabilizers`] struct with all fields set to 0.
    #[must_use]
    pub const fn empty() -> Self {
        Self {
            egg_yolk_solids: 0.0,
            whey_proteins: 0.0,
            cornstarch: 0.0,
            tapioca_starch: 0.0,
            pectin: 0.0,
            gelatin: 0.0,
            locust_bean_gum: 0.0,
            guar_gum: 0.0,
            carrageenans: 0.0,
            carboxymethyl_cellulose: 0.0,
            xanthan_gum: 0.0,
            sodium_alginate: 0.0,
            tara_gum: 0.0,
            other: 0.0,
        }
    }

    /// Creates a new empty [`Stabilizers`] struct, forwards to [`empty`](Self::empty)
    #[must_use]
    pub const fn new() -> Self {
        Self::empty()
    }

    /// Field-update method for [`egg_yolk_solids`](Self::egg_yolk_solids).
    #[must_use]
    pub const fn egg_yolk_solids(self, egg_yolk_solids: f64) -> Self {
        Self {
            egg_yolk_solids,
            ..self
        }
    }

    /// Field-update method for [`whey_proteins`](Self::whey_proteins).
    #[must_use]
    pub const fn whey_proteins(self, whey_proteins: f64) -> Self {
        Self { whey_proteins, ..self }
    }

    /// Field-update method for [`cornstarch`](Self::cornstarch).
    #[must_use]
    pub const fn cornstarch(self, cornstarch: f64) -> Self {
        Self { cornstarch, ..self }
    }

    /// Field-update method for [`tapioca_starch`](Self::tapioca_starch).
    #[must_use]
    pub const fn tapioca_starch(self, tapioca_starch: f64) -> Self {
        Self { tapioca_starch, ..self }
    }

    /// Field-update method for [`pectin`](Self::pectin).
    #[must_use]
    pub const fn pectin(self, pectin: f64) -> Self {
        Self { pectin, ..self }
    }

    /// Field-update method for [`gelatin`](Self::gelatin).
    #[must_use]
    pub const fn gelatin(self, gelatin: f64) -> Self {
        Self { gelatin, ..self }
    }

    /// Field-update method for [`locust_bean_gum`](Self::locust_bean_gum).
    #[must_use]
    pub const fn locust_bean_gum(self, locust_bean_gum: f64) -> Self {
        Self {
            locust_bean_gum,
            ..self
        }
    }

    /// Field-update method for [`guar_gum`](Self::guar_gum).
    #[must_use]
    pub const fn guar_gum(self, guar_gum: f64) -> Self {
        Self { guar_gum, ..self }
    }

    /// Field-update method for [`carrageenans`](Self::carrageenans).
    #[must_use]
    pub const fn carrageenans(self, carrageenans: f64) -> Self {
        Self { carrageenans, ..self }
    }

    /// Field-update method for [`carboxymethyl_cellulose`](Self::carboxymethyl_cellulose).
    #[must_use]
    pub const fn carboxymethyl_cellulose(self, carboxymethyl_cellulose: f64) -> Self {
        Self {
            carboxymethyl_cellulose,
            ..self
        }
    }

    /// Field-update method for [`xanthan_gum`](Self::xanthan_gum).
    #[must_use]
    pub const fn xanthan_gum(self, xanthan_gum: f64) -> Self {
        Self { xanthan_gum, ..self }
    }

    /// Field-update method for [`sodium_alginate`](Self::sodium_alginate).
    #[must_use]
    pub const fn sodium_alginate(self, sodium_alginate: f64) -> Self {
        Self {
            sodium_alginate,
            ..self
        }
    }

    /// Field-update method for [`tara_gum`](Self::tara_gum).
    #[must_use]
    pub const fn tara_gum(self, tara_gum: f64) -> Self {
        Self { tara_gum, ..self }
    }

    /// Field-update method for [`other`](Self::other).
    #[must_use]
    pub const fn other(self, other: f64) -> Self {
        Self { other, ..self }
    }

    /// Calculates the total stabilizer content, in grams per 100g of mix, by summing all the fields
    #[must_use]
    pub fn total(&self) -> f64 {
        iter_fields_as::<f64, _>(self).sum()
    }

    /// Converts the stabilizer breakdown into a contribution to the [`Texture`] of the composition,
    /// based on the relative strength of the constituent stabilizer components.
    ///
    /// # Errors
    ///
    /// Returns an [`Error::InvalidSpec`] if the strength of the stabilizer cannot be determined,
    /// which can happen if there are unspecified stabilizer components (i.e. if field
    /// [`other`](Self::other) is populated but the `strength` parameter is not provided).
    pub fn to_texture(&self, strength: Option<f64>) -> Result<Texture> {
        if self.other > 0.0 && strength.is_none() {
            return Err(Error::InvalidSpec("Strength must be provided if 'other' stabilizers are specified".into()));
        }

        Ok(Texture::new().stabilization(strength.unwrap_or_else(|| {
            [
                self.egg_yolk_solids * STABILIZER_STRENGTH_EGG_YOLK_SOLIDS,
                self.whey_proteins * STABILIZER_STRENGTH_WHEY_PROTEINS,
                self.cornstarch * STABILIZER_STRENGTH_CORNSTARCH,
                self.tapioca_starch * STABILIZER_STRENGTH_TAPIOCA_STARCH,
                self.pectin * STABILIZER_STRENGTH_PECTIN,
                self.gelatin * STABILIZER_STRENGTH_GELATIN,
                self.locust_bean_gum * STABILIZER_STRENGTH_LOCUST_BEAN_GUM,
                self.guar_gum * STABILIZER_STRENGTH_GUAR_GUM,
                self.carrageenans * STABILIZER_STRENGTH_CARRAGEENANS,
                self.carboxymethyl_cellulose * STABILIZER_STRENGTH_CARBOXYMETHYL_CELLULOSE,
                self.xanthan_gum * STABILIZER_STRENGTH_XANTHAN_GUM,
                self.sodium_alginate * STABILIZER_STRENGTH_SODIUM_ALGINATE,
                self.tara_gum * STABILIZER_STRENGTH_TARA_GUM,
            ]
            .iter()
            .sum::<f64>()
                / 100.0
        })))
    }
}

#[cfg_attr(coverage, coverage(off))]
#[cfg(feature = "wasm")]
#[wasm_bindgen]
impl Stabilizers {
    /// WASM compatible wrapper for [`new`](Self::new)
    #[allow(clippy::missing_const_for_fn)] // wasm_bindgen does not support const
    #[wasm_bindgen(constructor)]
    #[must_use]
    pub fn new_wasm() -> Self {
        Self::new()
    }
}

impl Validate for Stabilizers {
    fn validate(&self) -> Result<()> {
        verify_are_positive(&collect_fields_copied_as(self))?;
        verify_is_within_100_percent(self.total())?;
        Ok(())
    }
}

impl ScaleComponents for Stabilizers {
    fn scale(&self, factor: f64) -> Self {
        Self {
            egg_yolk_solids: self.egg_yolk_solids * factor,
            whey_proteins: self.whey_proteins * factor,
            cornstarch: self.cornstarch * factor,
            tapioca_starch: self.tapioca_starch * factor,
            pectin: self.pectin * factor,
            gelatin: self.gelatin * factor,
            locust_bean_gum: self.locust_bean_gum * factor,
            guar_gum: self.guar_gum * factor,
            carrageenans: self.carrageenans * factor,
            carboxymethyl_cellulose: self.carboxymethyl_cellulose * factor,
            xanthan_gum: self.xanthan_gum * factor,
            sodium_alginate: self.sodium_alginate * factor,
            tara_gum: self.tara_gum * factor,
            other: self.other * factor,
        }
    }

    fn add(&self, other: &Self) -> Self {
        Self {
            egg_yolk_solids: self.egg_yolk_solids + other.egg_yolk_solids,
            whey_proteins: self.whey_proteins + other.whey_proteins,
            cornstarch: self.cornstarch + other.cornstarch,
            tapioca_starch: self.tapioca_starch + other.tapioca_starch,
            pectin: self.pectin + other.pectin,
            gelatin: self.gelatin + other.gelatin,
            locust_bean_gum: self.locust_bean_gum + other.locust_bean_gum,
            guar_gum: self.guar_gum + other.guar_gum,
            carrageenans: self.carrageenans + other.carrageenans,
            carboxymethyl_cellulose: self.carboxymethyl_cellulose + other.carboxymethyl_cellulose,
            xanthan_gum: self.xanthan_gum + other.xanthan_gum,
            sodium_alginate: self.sodium_alginate + other.sodium_alginate,
            tara_gum: self.tara_gum + other.tara_gum,
            other: self.other + other.other,
        }
    }
}

impl AbsDiffEq for Stabilizers {
    type Epsilon = f64;

    fn default_epsilon() -> Self::Epsilon {
        f64::default_epsilon()
    }

    fn abs_diff_eq(&self, other: &Self, epsilon: Self::Epsilon) -> bool {
        iter_all_abs_diff_eq::<f64, f64, Self>(self, other, epsilon)
    }
}

impl Default for Stabilizers {
    fn default() -> Self {
        Self::empty()
    }
}

#[cfg(test)]
#[cfg_attr(coverage, coverage(off))]
#[allow(clippy::unwrap_used, clippy::float_cmp)]
mod tests {
    use crate::tests::asserts::shadow_asserts::assert_eq;
    use crate::tests::asserts::*;
    use crate::tests::util::{assert_f64_fields_eq_zero, assert_f64_fields_ne_zero};

    use super::*;
    use crate::error::Error;

    const FIELD_MODIFIERS: [fn(&mut Stabilizers, f64); 14] = [
        |m, v| m.egg_yolk_solids += v,
        |m, v| m.whey_proteins += v,
        |m, v| m.cornstarch += v,
        |m, v| m.tapioca_starch += v,
        |m, v| m.pectin += v,
        |m, v| m.gelatin += v,
        |m, v| m.locust_bean_gum += v,
        |m, v| m.guar_gum += v,
        |m, v| m.carrageenans += v,
        |m, v| m.carboxymethyl_cellulose += v,
        |m, v| m.xanthan_gum += v,
        |m, v| m.sodium_alginate += v,
        |m, v| m.tara_gum += v,
        |m, v| m.other += v,
    ];

    #[test]
    fn stabilizers_field_count() {
        assert_eq!(Stabilizers::new().iter().count(), 14);
    }

    #[test]
    fn stabilizers_no_fields_missed() {
        assert_eq!(Stabilizers::new().iter().count(), FIELD_MODIFIERS.len());
    }

    #[test]
    fn stabilizers_empty() {
        let m = Stabilizers::empty();
        assert_eq!(m, Stabilizers::new());
        assert_eq!(m, Stabilizers::default());

        assert_f64_fields_eq_zero(&m);

        assert_eq!(m.egg_yolk_solids, 0.0);
        assert_eq!(m.whey_proteins, 0.0);
        assert_eq!(m.cornstarch, 0.0);
        assert_eq!(m.tapioca_starch, 0.0);
        assert_eq!(m.pectin, 0.0);
        assert_eq!(m.gelatin, 0.0);
        assert_eq!(m.locust_bean_gum, 0.0);
        assert_eq!(m.guar_gum, 0.0);
        assert_eq!(m.carrageenans, 0.0);
        assert_eq!(m.carboxymethyl_cellulose, 0.0);
        assert_eq!(m.xanthan_gum, 0.0);
        assert_eq!(m.sodium_alginate, 0.0);
        assert_eq!(m.tara_gum, 0.0);
        assert_eq!(m.other, 0.0);
    }

    #[test]
    fn stabilizers_field_update_methods() {
        let m = Stabilizers::new()
            .egg_yolk_solids(1.0)
            .whey_proteins(2.0)
            .cornstarch(3.0)
            .tapioca_starch(4.0)
            .pectin(5.0)
            .gelatin(6.0)
            .locust_bean_gum(7.0)
            .guar_gum(8.0)
            .carrageenans(9.0)
            .carboxymethyl_cellulose(10.0)
            .xanthan_gum(11.0)
            .sodium_alginate(12.0)
            .tara_gum(13.0)
            .other(14.0);
        assert_f64_fields_ne_zero(&m);

        assert_eq!(m.egg_yolk_solids, 1.0);
        assert_eq!(m.whey_proteins, 2.0);
        assert_eq!(m.cornstarch, 3.0);
        assert_eq!(m.tapioca_starch, 4.0);
        assert_eq!(m.pectin, 5.0);
        assert_eq!(m.gelatin, 6.0);
        assert_eq!(m.locust_bean_gum, 7.0);
        assert_eq!(m.guar_gum, 8.0);
        assert_eq!(m.carrageenans, 9.0);
        assert_eq!(m.carboxymethyl_cellulose, 10.0);
        assert_eq!(m.xanthan_gum, 11.0);
        assert_eq!(m.sodium_alginate, 12.0);
        assert_eq!(m.tara_gum, 13.0);
        assert_eq!(m.other, 14.0);
    }

    #[test]
    fn stabilizers_scale() {
        let m = Stabilizers::new()
            .egg_yolk_solids(1.0)
            .whey_proteins(2.0)
            .cornstarch(3.0)
            .tapioca_starch(4.0)
            .pectin(5.0)
            .gelatin(6.0)
            .locust_bean_gum(7.0)
            .guar_gum(8.0)
            .carrageenans(9.0)
            .carboxymethyl_cellulose(10.0)
            .xanthan_gum(11.0)
            .sodium_alginate(12.0)
            .tara_gum(13.0)
            .other(14.0);
        assert_f64_fields_ne_zero(&m);

        let scaled = m.scale(0.5);
        assert_eq!(scaled.egg_yolk_solids, 0.5);
        assert_eq!(scaled.whey_proteins, 1.0);
        assert_eq!(scaled.cornstarch, 1.5);
        assert_eq!(scaled.tapioca_starch, 2.0);
        assert_eq!(scaled.pectin, 2.5);
        assert_eq!(scaled.gelatin, 3.0);
        assert_eq!(scaled.locust_bean_gum, 3.5);
        assert_eq!(scaled.guar_gum, 4.0);
        assert_eq!(scaled.carrageenans, 4.5);
        assert_eq!(scaled.carboxymethyl_cellulose, 5.0);
        assert_eq!(scaled.xanthan_gum, 5.5);
        assert_eq!(scaled.sodium_alginate, 6.0);
        assert_eq!(scaled.tara_gum, 6.5);
        assert_eq!(scaled.other, 7.0);
    }

    #[test]
    fn stabilizers_add() {
        let a = Stabilizers::new()
            .egg_yolk_solids(1.0)
            .whey_proteins(2.0)
            .cornstarch(3.0)
            .tapioca_starch(4.0)
            .pectin(5.0)
            .gelatin(6.0)
            .locust_bean_gum(7.0)
            .guar_gum(8.0)
            .carrageenans(9.0)
            .carboxymethyl_cellulose(10.0)
            .xanthan_gum(11.0)
            .sodium_alginate(12.0)
            .tara_gum(13.0)
            .other(14.0);
        let b = Stabilizers::new()
            .egg_yolk_solids(1.5)
            .whey_proteins(2.5)
            .cornstarch(3.5)
            .tapioca_starch(4.5)
            .pectin(5.5)
            .gelatin(6.5)
            .locust_bean_gum(7.5)
            .guar_gum(8.5)
            .carrageenans(9.5)
            .carboxymethyl_cellulose(10.5)
            .xanthan_gum(11.5)
            .sodium_alginate(12.5)
            .tara_gum(13.5)
            .other(14.5);

        assert_f64_fields_ne_zero(&a);
        assert_f64_fields_ne_zero(&b);

        let sum = a.add(&b);
        assert_eq!(sum.egg_yolk_solids, 2.5);
        assert_eq!(sum.whey_proteins, 4.5);
        assert_eq!(sum.cornstarch, 6.5);
        assert_eq!(sum.tapioca_starch, 8.5);
        assert_eq!(sum.pectin, 10.5);
        assert_eq!(sum.gelatin, 12.5);
        assert_eq!(sum.locust_bean_gum, 14.5);
        assert_eq!(sum.guar_gum, 16.5);
        assert_eq!(sum.carrageenans, 18.5);
        assert_eq!(sum.carboxymethyl_cellulose, 20.5);
        assert_eq!(sum.xanthan_gum, 22.5);
        assert_eq!(sum.sodium_alginate, 24.5);
        assert_eq!(sum.tara_gum, 26.5);
        assert_eq!(sum.other, 28.5);
        assert_f64_fields_ne_zero(&sum);
    }

    #[test]
    fn stabilizers_abs_diff_eq() {
        let a = Stabilizers::new()
            .egg_yolk_solids(1.0)
            .whey_proteins(2.0)
            .cornstarch(3.0)
            .tapioca_starch(4.0)
            .pectin(5.0)
            .gelatin(6.0)
            .locust_bean_gum(7.0)
            .guar_gum(8.0)
            .carrageenans(9.0)
            .carboxymethyl_cellulose(10.0)
            .xanthan_gum(11.0)
            .sodium_alginate(12.0)
            .tara_gum(13.0)
            .other(14.0);
        let b = a;
        let mut c = b;

        for v in [a, b, c] {
            assert_f64_fields_ne_zero(&v);
        }

        assert_abs_diff_eq!(a, b);
        assert_abs_diff_eq!(a, c);

        for field_modifier in FIELD_MODIFIERS {
            assert_abs_diff_eq!(a, c);
            field_modifier(&mut c, 1e-10);
            assert_abs_diff_ne!(a, c);
            field_modifier(&mut c, -1e-10);
            assert_abs_diff_eq!(a, c);
        }
    }

    // --- Validate ---

    #[test]
    fn validate_ok_for_empty() {
        assert!(Stabilizers::empty().validate().is_ok());
    }

    #[test]
    fn validate_ok_for_valid_values() {
        assert!(
            Stabilizers::new()
                .cornstarch(0.5)
                .gelatin(0.3)
                .locust_bean_gum(0.2)
                .validate()
                .is_ok()
        );
    }

    #[test]
    fn validate_err_for_each_negative_field() {
        for field_modifier in FIELD_MODIFIERS {
            let mut stabilizers = Stabilizers::empty();
            field_modifier(&mut stabilizers, -1.0);
            assert!(matches!(stabilizers.validate(), Err(Error::CompositionNotPositive(_))));
        }
    }

    #[test]
    fn validate_into_returns_self_when_valid() {
        let stabilizers = Stabilizers::new().cornstarch(1.0).gelatin(0.5);
        let result = stabilizers.validate_into();
        assert!(result.is_ok());
        assert_eq!(result.unwrap().cornstarch, 1.0);
    }

    #[test]
    fn validate_into_returns_err_when_invalid() {
        assert!(Stabilizers::new().cornstarch(-1.0).validate_into().is_err());
    }
}

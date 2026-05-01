//! Top-level [`Composition`] struct and related types and traits, representing the composition of
//! an ingredient or mix, and providing key methods for accessing specific components/properties.

use approx::AbsDiffEq;
use serde::{Deserialize, Serialize};
use struct_iterable::Iterable;
use strum_macros::EnumIter;

use crate::{
    composition::{Alcohol, Micro, PAC, Solids, Texture},
    error::Result,
    resolution::IngredientGetter,
    validate::{Validate, verify_are_positive, verify_is_within_100_percent},
};

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

#[cfg(doc)]
use crate::{
    composition::{ArtificialSweeteners, Carbohydrates, Emulsifiers, Polyols, Sugars},
    error::Error,
    specs::{ChocolateSpec, CompositeSpec},
};

/// Trait for converting various types, e.g. [`specs`](crate::specs), to a [`Composition`]
pub trait ToComposition {
    /// Converts `&self` into a [`Composition`], which may involve complex calculations
    ///
    /// # Errors
    ///
    /// Returns an [`Error`] if the conversion cannot be performed, e.g. due to missing values,
    /// invalid ingredient specs, etc. The specific errors are implementation-dependent.
    fn to_composition(&self) -> Result<Composition>;
}

/// Trait for resolving a [`Composition`] from a type that may reference other ingredients
///
/// This is used for types that may reference other ingredients, e.g. [`CompositeSpec`]s, which need
/// to resolve the compositions of their referenced ingredients, via a provided
/// [`IngredientGetter`], in order to calculate their own composition.
pub trait ResolveComposition {
    /// Resolves a [`Composition`] from `self`, which may involve looking up referenced ingredients
    /// via the provided [`IngredientGetter`] and calculating combinations of their compositions.
    ///
    /// # Errors
    ///
    /// Returns an [`Error`] if any referenced ingredient cannot be found via the getter, or if any
    /// composition calculations fail, likely due to invalid values, e.g. negative percentages, not
    /// summing to 100%, etc. See [`CompositeSpec`] as an example for more details.
    fn resolve_composition(&self, getter: &dyn IngredientGetter) -> Result<Composition>;
}

/// Trait for scaling and adding [`Composition`]s and their constituent types
///
/// This is used for calculating the composition of mixes from a weighted combination of its
/// ingredients. It should be implemented by all types that are part of the composition, including
/// [`Composition`] itself, and all constituent types such as [`Solids`], [`Micro`], etc.
pub trait ScaleComponents {
    /// Scales `self` by a factor, typically `ing_qty/mix_total_qty` when calculating the
    /// contribution of ingredients to a mix composition.
    ///
    /// **Note**: Composition values are typically expressed as grams per 100g, where the rest is
    /// assumed to be water. A such, scaling a composition by a factor `f` actually changes the
    /// relative proportions of components and therefore the nature of the composition. After
    /// scaling, a composition represents `f` grams of ingredient per 100g of mix, and only becomes
    /// a valid composition when combined with other scaled compositions of other ingredients, which
    /// together sum to 100g of ingredient per 100g of mix. This is a necessary step in calculating
    /// the composition of mixes from their ingredients, but should not be used for other purposes.
    /// See [`add`](Self::add) for [`Composition::from_combination`] for more details about this.
    #[must_use]
    fn scale(&self, factor: f64) -> Self;

    /// Adds `self` and `other`, typically scaled compositions of ingredients, when calculating the
    /// contributions of ingredients to a mix composition.
    ///
    /// **Note**: This is a simple addition of composition values, and does not take into account
    /// the relative proportions of ingredients in a mix. As such, it should only be used for adding
    /// scaled compositions of ingredients, which together sum to 100g of ingredient per 100g of
    /// mix, to calculate the composition of mixes. See [`scale`](Self::scale) and
    /// [`Composition::from_combination`] for more details about and implementations of this.
    #[must_use]
    fn add(&self, other: &Self) -> Self;
}

/// Composition of an ingredient or mix, mostly as grams of component per 100g of ingredient/mix
///
/// [`Composition`] is the top-level struct representing the composition of an ingredient or mix,
/// holding several other constituent types, and is used as the basis for all composition-related
/// calculations and analyses.
///
/// In a hypothetical 100g of ingredient/mix: `solids.total() + alcohol + water() == 100`.
///
/// [`micro`](Self::micro) components are accounted for in `solids`, and should not be
/// double-counted. They are  provided separately to facilitate the analysis of key components.
///
/// POD and [PAC](crate::docs#pac-afp-fpdf-se) are expressed as a sucrose equivalence and do not
/// necessarily represent real weights of components. While some underlying components may have
/// utilities to calculate their contributions to POD and PAC, the overall POD and PAC of a
/// composition are independent values and are set during composition construction, taking all
/// underlying contributions into account.
#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Iterable, PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
pub struct Composition {
    /// Total energy content in kilocalories (kcal) per 100g of ingredient/mix
    pub energy: f64,
    /// Detailed breakdown of solid components, as grams of component per 100g of ingredient/mix
    pub solids: Solids,
    /// Tracking of micronutrients and other micro components and properties
    ///
    /// These are accounted for in `solids`; they are provided separately to facilitate the tracking
    /// and analysis of key components and properties, e.g. stabilizers, emulsifiers, salt, etc.
    pub micro: Micro,
    /// Alcohol content, as grams of alcohol per 100g of ingredient/mix, with ABV conversions
    pub alcohol: Alcohol,
    /// [Potere Dolcificante (POD)](crate::docs#pod), expressed as a sucrose equivalence
    pub pod: f64,
    /// [Potere Anti-Cristallizzante (PAC)](crate::docs#pac), expressed as a sucrose equivalence
    pub pac: PAC,
    /// Texture properties, representing the overall contributions from various components
    pub texture: Texture,
}

/// Keys for accessing specific composition values from a [`Composition`] via [`Composition::get()`]
///
/// [`Composition`] is a complex struct with several levels of nesting, and may continuously evolve
/// to include more components, which makes direct field access cumbersome and error-prone. This
/// enum provides a more stable and convenient interface for accessing specific composition values.
#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(EnumIter, Hash, PartialEq, Eq, Serialize, Deserialize, Copy, Clone, Debug)]
pub enum CompKey {
    /// Total energy content in kilocalories (kcal) per 100g of ingredient/mix
    Energy,

    /// Milk Fats, the fat content of dairy ingredients, e.g. 2% in 2% milk, etc.
    ///
    /// This is a key component of ice cream mixes, contributing to creaminess and mouthfeel.
    MilkFat,
    /// Milk Solids Non-Fat (MSNF), the non-fat solid content of dairy ingredients
    ///
    /// This includes lactose, proteins, and minerals. It is a key component in the analysis of ice
    /// cream mixes, contributing to freezing point depression, body, and texture.
    MSNF,
    /// Milk Solids Non-Fat Non-Sugar (SNFS), the non-fat non-lactose content of dairy ingredients
    ///
    /// This includes proteins and minerals; and is equivalent to [`CompKey::MSNF`] minus lactose.
    MilkSNFS,
    /// Protein content from milk ingredients, i.e. casein and whey proteins
    MilkProteins,
    /// Total solids from milk ingredients
    ///
    /// Ths includes fats, lactose, proteins, and minerals. It is the sum of both
    /// [`CompKey::MilkFat`] and [`CompKey::MSNF`].
    MilkSolids,

    /// Cocoa butter, the fat component extracted from cacao solids [`CompKey::CacaoSolids`].
    ///
    /// Sometimes referred to as "cocoa fat"; see [`ChocolateSpec`] for more details. This component
    /// affects the texture of ice creams by hardening the frozen product, and contributes to the
    /// _"perception of richness in chocolate ice creams... [due to] the lubricating effect that
    /// cocoa butter provides as it melts in the mouth."_ (Goff & Hartel, 2025, p. 107)[^20]
    #[doc = include_str!("../../docs/references/index/20.md")]
    CocoaButter,
    /// _Cocoa_ solids, the non-fat component of cacao solids [`CompKey::CacaoSolids`]
    ///
    /// Sometimes referred to as "cocoa powder" or "cocoa fiber", i.e. cacao solids minus cocoa
    /// butter; see [`ChocolateSpec`] for more details. In ice cream mixes, this generally
    /// determines the intensity of the chocolate flavor, and contributes to the texture and body.
    CocoaSolids,
    /// _Cacao_ solids, the total dry matter content derived from the cacao bean
    ///
    /// Sometimes referred to as "chocolate liquor", "cocoa mass", etc., it includes both cocoa
    /// butter (fat) [`CompKey::CocoaButter`] and cocoa solids (non-fat solids)
    /// [`CompKey::CocoaSolids`]. See [`ChocolateSpec`] for more details.
    ///
    /// **Note**: This does not include any sugar content that may be present in chocolate
    /// ingredients; that is accounted for separately via [`CompKey::TotalSugars`].
    CacaoSolids,

    /// Nut Fats, the fat content of nut ingredients
    ///
    /// It is roughly equivalent to [`CompKey::CocoaButter`] if cacao were treated as a nut.
    /// This component affects the texture of ice creams by hardening the frozen product.
    NutFat,
    /// Nut Solids Non-Fat Non-Sugar (SNFS), the non-fat, non-sugar solid content of nuts
    ///
    /// This generally includes proteins, fibers, and minerals. It is roughly equivalent to
    /// [`CompKey::CocoaSolids`] if cacao were treated as a nut. For nut flavored ice cream recipes,
    /// this value directly correlates with the perceived intensity of the nut flavor.
    ///
    /// **Note**: This does not include any sugar content that may be present in nut ingredients;
    /// that is accounted for separately via [`CompKey::TotalSugars`]. As such, it would be
    /// equivalent to a hypothetical `NutSNFS` (Nut Solids Non-Fat Non-Sugar).
    NutSNF,
    /// Nut Solids, the total solid content of nut ingredients
    ///
    /// This generally includes fats, proteins, fibers, and minerals. It includes both
    /// [`CompKey::NutFat`] and [`CompKey::NutSNF`], and is roughly equivalent to
    /// [`CompKey::CacaoSolids`] if cacao were treated as a nut.
    ///
    /// **Note**: This does not include any sugar content that may be present in nut ingredients;
    /// that is accounted for separately via [`CompKey::TotalSugars`].
    NutSolids,

    /// Egg Fats, the fat content of egg ingredients
    EggFat,
    /// Egg Solids Non-Fat (SNF), the non-fat solid content of egg ingredients
    ///
    /// **Note**: This does not include any sugar content that may be present in egg ingredients;
    /// that is accounted for separately via [`CompKey::TotalSugars`]. As such, it would be
    /// equivalent to a hypothetical `EggSNFS` (Egg Solids Non-Fat Non-Sugar).
    EggSNF,
    /// Egg Solids, the total solid content of egg ingredients
    ///
    /// **Note**: This does not include any sugar content that may be present in egg ingredients;
    /// that is accounted for separately via [`CompKey::TotalSugars`].
    EggSolids,

    /// Other Fats, the fat content of other ingredients not milk, cocoa, nut, or egg
    OtherFats,
    /// Other Solids Non-Fat Non-Sugar (SNFS), the non-fat, non-sugar solid content of other
    /// ingredients not milk, cocoa, nut, or egg
    OtherSNFS,

    /// Total Fats, sum of all fat components
    ///
    /// This is a key component of ice cream mixes, contributing to creaminess and mouthfeel.
    TotalFats,
    /// Total Solids Non-Fat, sum of all non-fat solid components
    TotalSNF,
    /// Total Solids Non-Fat Non-Sugar (SNFS), sum of all non-fat, non-sugar solid components
    ///
    /// This is a key component in the analysis of ice cream mixes, contributing to freezing point
    /// depression, body, and texture. If ice creams feel "cakey" or "spongy", this value is often
    /// a key indicator of the cause, being too high or too low, respectively.
    TotalSNFS,
    /// Total Proteins, sum of all protein components
    TotalProteins,
    /// Total Solids, sum of all solid components
    TotalSolids,

    /// Water content, `100 - TotalSolids - Alcohol.by_weight`
    Water,

    // Carbohydrates and Artificial Sweeteners
    // ---------------------------------------
    //
    /// Total fiber content, as tracked in [`Carbohydrates::fiber`]
    Fiber,
    /// Total free glucose content, i.e. glucose not part of disaccharides or polysaccharides
    Glucose,
    /// Total free fructose content, i.e. fructose not part of disaccharides or polysaccharides
    Fructose,
    /// Total free galactose content, i.e. galactose not part of disaccharides or polysaccharides
    Galactose,
    /// Total sucrose content, as tracked in [`Carbohydrates::sugars::sucrose`](Sugars::sucrose)
    Sucrose,
    /// Total lactose content, as tracked in [`Carbohydrates::sugars::lactose`](Sugars::lactose)
    Lactose,
    /// Total maltose content, as tracked in [`Carbohydrates::sugars::maltose`](Sugars::maltose)
    Maltose,
    /// Total trehalose content, tracked in [`Carbohydrates::sugars::trehalose`](Sugars::trehalose)
    Trehalose,
    /// Total sugar content, including all mono/disaccharides tracked in [`Carbohydrates::sugars`]
    TotalSugars,
    /// Total erythritol content, as tracked in
    /// [`Carbohydrates::polyols::erythritol`](Polyols::erythritol)
    Erythritol,
    /// Total polyol content, including all polyols tracked in [`Carbohydrates::polyols`]
    TotalPolyols,
    /// Total carbohydrate content, including all sugars, polyols, and fiber in [`Carbohydrates`]
    TotalCarbohydrates,
    /// Total artificial sweetener content, including all artificial sweeteners tracked in
    /// [`ArtificialSweeteners`]
    TotalArtificial,
    /// Total sweetener content, including all sugars, polyols, and artificial sweeteners, but
    /// excluding fiber and other carbohydrates not contributing to sweetness
    TotalSweeteners,

    // Alcohol and Micro Components
    // ----------------------------
    //
    /// Total alcohol content, as grams of alcohol per 100g of ingredient/mix
    Alcohol,
    /// Total alcohol by volume (ABV) content, calculated from the alcohol content by weight
    ABV,

    /// Total salt content, excluding salts from milk ingredients, as tracked in [`Micro::salt`]
    ///
    /// This includes any salt added as an ingredient, as well as any salt that is part of other
    /// ingredients, e.g. the salt in chocolate or nut ingredients, but excludes salts naturally
    /// present in milk ingredients, which are accounted for separately in [`CompKey::MilkSNFS`] .
    ///
    /// Note that this is a subset of [`CompKey::TotalSolids`].
    Salt,
    /// Total lecithin content, a subset of emulsifiers, tracked in [`Emulsifiers`]
    Lecithin,
    /// Total emulsifier content, including lecithin and others tracked in [`Micro::emulsifiers`]
    // @todo Introduce `Emulsification` as a separate key, representing the overall emulsification
    // strength of the mix from all sources, as tracked in [`Texture::emulsification`]
    Emulsifiers,
    /// Total stabilizer content, e.g. from Locust Bean Gum, etc. tracked in [`Micro::stabilizers`]
    // @todo Introduce `Stabilization` as a separate key, representing the overall stabilization
    // strength of the mix from all sources, as tracked in [`Texture::stabilization`]
    Stabilizers,
    /// Total emulsifier content per fat content, i.e. `Emulsifiers / TotalFats`, as a percentage
    EmulsifiersPerFat,
    /// Total stabilizer content per water content, i.e. `Stabilizers / Water`, as a percentage
    StabilizersPerWater,

    // POD, PAC, and Hardness Factor
    // -----------------------------
    //
    /// [Potere Dolcificante (POD)](crate::docs#pod) of the ingredient or mix as a whole
    POD,

    /// [Potere Anti-Cristallizzante (PAC)](crate::docs#pac) contributions from sugars and polyols
    PACsgr,
    /// [Potere Anti-Cristallizzante (PAC)](crate::docs#pac) contributions from [`CompKey::Salt`]
    PACslt,
    /// [Potere Anti-Cristallizzante (PAC)](crate::docs#pac) contributions from milk minerals
    PACmlk,
    /// [Potere Anti-Cristallizzante (PAC)](crate::docs#pac) contributions from alcohol
    PACalc,
    /// Total [Potere Anti-Cristallizzante (PAC)](crate::docs#pac) of the ingredient or mix as whole
    PACtotal,
    /// [Absolute PAC](crate::docs#absolute-pac), i.e. `PACtotal / Water`, as a percentage
    AbsPAC,
    /// [Hardness Factor (HF)](crate::docs#corvitto-method-hardness-factor) of the ingredient or mix
    HF,
}

impl Composition {
    /// Creates an empty composition, which is equivalent to the composition of 100% water.
    #[must_use]
    pub const fn empty() -> Self {
        Self {
            energy: 0.0,
            solids: Solids::empty(),
            micro: Micro::empty(),
            alcohol: Alcohol::empty(),
            pod: 0.0,
            pac: PAC::empty(),
            texture: Texture::empty(),
        }
    }

    /// Creates an empty composition, equivalent to 100% water; forwards to [`empty`](Self::empty)
    #[must_use]
    pub const fn new() -> Self {
        Self::empty()
    }

    /// Field-update method for [`energy`](Self::energy)
    #[must_use]
    pub const fn energy(self, energy: f64) -> Self {
        Self { energy, ..self }
    }

    /// Field-update method for [`solids`](Self::solids)
    #[must_use]
    pub const fn solids(self, solids: Solids) -> Self {
        Self { solids, ..self }
    }

    /// Field-update method for [`micro`](Self::micro)
    #[must_use]
    pub const fn micro(self, micro: Micro) -> Self {
        Self { micro, ..self }
    }

    /// Field-update method for [`alcohol`](Self::alcohol)
    #[must_use]
    pub const fn alcohol(self, alcohol: Alcohol) -> Self {
        Self { alcohol, ..self }
    }

    /// Field-update method for [`pod`](Self::pod)
    #[must_use]
    pub const fn pod(self, pod: f64) -> Self {
        Self { pod, ..self }
    }

    /// Field-update method for [`pac`](Self::pac)
    #[must_use]
    pub const fn pac(self, pac: PAC) -> Self {
        Self { pac, ..self }
    }

    /// Field-update method for [`texture`](Self::texture)
    #[must_use]
    pub const fn texture(self, texture: Texture) -> Self {
        Self { texture, ..self }
    }

    /// Calculates the composition of a mix from a weighted combination of its ingredients
    ///
    /// # Errors
    ///
    /// Returns an [`Error::CompositionNotPositive`] if any of the ingredient amounts are negative.
    pub fn from_combination(compositions: &[(Self, f64)]) -> Result<Self> {
        verify_are_positive(&compositions.iter().map(|line| line.1).collect::<Vec<_>>())?;

        let total_amount: f64 = compositions.iter().map(|line| line.1).sum();

        if total_amount == 0.0 {
            return Ok(Self::empty());
        }

        compositions.iter().try_fold(Self::empty(), |acc, line| {
            let mut mix_comp = acc;
            let weight = line.1 / total_amount;
            mix_comp = mix_comp.add(&line.0.scale(weight));
            Ok(mix_comp)
        })
    }
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
impl Composition {
    /// WASM compatible wrapper for [`new`](Self::new)
    #[allow(clippy::missing_const_for_fn)] // wasm_bindgen does not support const
    #[cfg_attr(coverage, coverage(off))]
    #[cfg(feature = "wasm")]
    #[wasm_bindgen(constructor)]
    #[must_use]
    pub fn new_wasm() -> Self {
        Self::new()
    }

    /// Calculates the water content as `100 - TotalSolids - Alcohol`
    ///
    /// An empty composition would have `TotalSolids == 0` and `Alcohol == 0`, resulting in
    /// `Water == 100`, which is in accordance with an empty composition being equivalent to 100%
    /// water. This is equivalent to [`get(CompKey::Water)`](Self::get).
    #[must_use]
    pub fn water(&self) -> f64 {
        100.0 - self.solids.total() - self.alcohol.by_weight
    }

    /// Calculates the emulsifier per fat content, i.e. `Emulsifiers / TotalFats`, as a percentage
    ///
    /// This is equivalent to [`get(CompKey::EmulsifiersPerFat)`](Self::get).
    ///
    /// Note that [`f64::NAN`] is a valid result, if there are no fats.
    #[must_use]
    pub fn emulsifiers_per_fat(&self) -> f64 {
        if self.solids.all().fats.total > 0.0 {
            (self.micro.emulsifiers.total() / self.solids.all().fats.total) * 100.0
        } else {
            f64::NAN
        }
    }

    /// Calculates the stabilizer per water content, i.e. `Stabilizers / Water`, as a percentage
    ///
    /// This is equivalent to [`get(CompKey::StabilizersPerWater)`](Self::get).
    ///
    /// Note that [`f64::NAN`] is a valid result, if there is no water
    #[must_use]
    pub fn stabilizers_per_water(&self) -> f64 {
        if self.water() > 0.0 {
            (self.micro.stabilizers.total() / self.water()) * 100.0
        } else {
            f64::NAN
        }
    }

    /// Calculates [Absolute PAC](crate::docs#absolute-pac), i.e. `PACtotal / Water`, as a
    /// percentage, excluding the hardness factor
    ///
    /// This is equivalent to [`get(CompKey::AbsPAC)`](Self::get).
    ///
    /// Note that [`f64::NAN`] is a valid result, if there is no water
    #[must_use]
    pub fn absolute_pac(&self) -> f64 {
        if self.water() > 0.0 {
            (self.pac.total() / self.water()) * 100.0
        } else {
            f64::NAN
        }
    }

    /// Gets a specific composition value by key, using [`CompKey`] to specify the desired value
    #[must_use]
    pub fn get(&self, key: CompKey) -> f64 {
        match key {
            CompKey::Energy => self.energy,

            CompKey::MilkFat => self.solids.milk.fats.total,
            CompKey::MSNF => self.solids.milk.snf(),
            CompKey::MilkSNFS => self.solids.milk.snfs(),
            CompKey::MilkProteins => self.solids.milk.proteins,
            CompKey::MilkSolids => self.solids.milk.total(),

            CompKey::CocoaButter => self.solids.cocoa.fats.total,
            CompKey::CocoaSolids => self.solids.cocoa.snfs(),
            CompKey::CacaoSolids => self.solids.cocoa.total() - self.solids.cocoa.carbohydrates.sugars.total(),
            CompKey::NutFat => self.solids.nut.fats.total,
            CompKey::NutSNF => self.solids.nut.snfs(),
            CompKey::NutSolids => self.solids.nut.total() - self.solids.nut.carbohydrates.sugars.total(),

            CompKey::EggFat => self.solids.egg.fats.total,
            CompKey::EggSNF => self.solids.egg.snfs(),
            CompKey::EggSolids => self.solids.egg.total() - self.solids.egg.carbohydrates.sugars.total(),
            CompKey::OtherFats => self.solids.other.fats.total,
            CompKey::OtherSNFS => self.solids.other.snfs(),

            CompKey::TotalFats => self.solids.all().fats.total,
            CompKey::TotalSNF => self.solids.all().snf(),
            CompKey::TotalSNFS => self.solids.all().snfs(),
            CompKey::TotalProteins => self.solids.all().proteins,
            CompKey::TotalSolids => self.solids.total(),

            CompKey::Water => self.water(),

            CompKey::Fiber => self.solids.all().carbohydrates.fiber.total(),
            CompKey::Glucose => self.solids.all().carbohydrates.sugars.glucose,
            CompKey::Fructose => self.solids.all().carbohydrates.sugars.fructose,
            CompKey::Galactose => self.solids.all().carbohydrates.sugars.galactose,
            CompKey::Sucrose => self.solids.all().carbohydrates.sugars.sucrose,
            CompKey::Lactose => self.solids.all().carbohydrates.sugars.lactose,
            CompKey::Maltose => self.solids.all().carbohydrates.sugars.maltose,
            CompKey::Trehalose => self.solids.all().carbohydrates.sugars.trehalose,
            CompKey::TotalSugars => self.solids.all().carbohydrates.sugars.total(),
            CompKey::Erythritol => self.solids.all().carbohydrates.polyols.erythritol,
            CompKey::TotalPolyols => self.solids.all().carbohydrates.polyols.total(),
            CompKey::TotalCarbohydrates => self.solids.all().carbohydrates.total(),
            CompKey::TotalArtificial => self.solids.all().artificial_sweeteners.total(),
            CompKey::TotalSweeteners => {
                self.solids.all().carbohydrates.sugars.total()
                    + self.solids.all().carbohydrates.polyols.total()
                    + self.solids.all().artificial_sweeteners.total()
            }

            CompKey::Alcohol => self.alcohol.by_weight,
            CompKey::ABV => self.alcohol.to_abv(),

            CompKey::Salt => self.micro.salt,
            CompKey::Lecithin => self.micro.emulsifiers.total_lecithin(),
            CompKey::Emulsifiers => self.micro.emulsifiers.total(),
            CompKey::Stabilizers => self.micro.stabilizers.total(),
            CompKey::EmulsifiersPerFat => self.emulsifiers_per_fat(),
            CompKey::StabilizersPerWater => self.stabilizers_per_water(),

            CompKey::POD => self.pod,

            CompKey::PACsgr => self.pac.sugars,
            CompKey::PACslt => self.pac.salt,
            CompKey::PACmlk => self.pac.msnf_ws_salts,
            CompKey::PACalc => self.pac.alcohol,
            CompKey::PACtotal => self.pac.total(),
            CompKey::AbsPAC => self.absolute_pac(),
            CompKey::HF => self.pac.hardness_factor,
        }
    }
}

impl Validate for Composition {
    fn validate(&self) -> Result<()> {
        self.solids.validate()?;
        self.micro.validate()?;
        self.alcohol.validate()?;
        self.pac.validate()?;
        self.texture.validate()?;
        verify_are_positive(&[self.energy, self.pod])?;
        verify_is_within_100_percent(self.solids.total() + self.alcohol.by_weight)?;
        Ok(())
    }
}

impl ScaleComponents for Composition {
    fn scale(&self, factor: f64) -> Self {
        Self {
            energy: self.energy * factor,
            solids: self.solids.scale(factor),
            micro: self.micro.scale(factor),
            alcohol: self.alcohol.scale(factor),
            pod: self.pod * factor,
            pac: self.pac.scale(factor),
            texture: self.texture.scale(factor),
        }
    }

    fn add(&self, other: &Self) -> Self {
        Self {
            energy: self.energy + other.energy,
            solids: self.solids.add(&other.solids),
            micro: self.micro.add(&other.micro),
            alcohol: self.alcohol.add(&other.alcohol),
            pod: self.pod + other.pod,
            pac: self.pac.add(&other.pac),
            texture: self.texture.add(&other.texture),
        }
    }
}

impl AbsDiffEq for Composition {
    type Epsilon = f64;

    fn default_epsilon() -> Self::Epsilon {
        f64::default_epsilon()
    }

    fn abs_diff_eq(&self, other: &Self, epsilon: Self::Epsilon) -> bool {
        self.energy.abs_diff_eq(&other.energy, epsilon)
            && self.solids.abs_diff_eq(&other.solids, epsilon)
            && self.micro.abs_diff_eq(&other.micro, epsilon)
            && self.alcohol.abs_diff_eq(&other.alcohol, epsilon)
            && self.pod.abs_diff_eq(&other.pod, epsilon)
            && self.pac.abs_diff_eq(&other.pac, epsilon)
            && self.texture.abs_diff_eq(&other.texture, epsilon)
    }
}

impl Default for Composition {
    fn default() -> Self {
        Self::empty()
    }
}

#[cfg(test)]
#[cfg_attr(coverage, coverage(off))]
#[allow(clippy::unwrap_used, clippy::float_cmp)]
mod tests {
    use std::collections::HashMap;

    use strum::IntoEnumIterator;

    use crate::tests::asserts::shadow_asserts::{assert_eq, assert_ne};
    use crate::tests::asserts::*;

    use crate::error::Error;
    use crate::tests::assets::*;

    use super::*;
    use crate::composition::*;

    const FIELD_MODIFIERS: [fn(&mut Composition, f64); 7] = [
        |c, v| c.energy += v,
        |c, v| c.solids.milk.fats.total += v,
        |c, v| c.micro.salt += v,
        |c, v| c.alcohol.by_weight += v,
        |c, v| c.pod += v,
        |c, v| c.pac.sugars += v,
        |c, v| c.texture.stabilization += v,
    ];

    #[test]
    fn composition_field_count() {
        assert_eq!(Composition::new().iter().count(), 7);
    }

    #[test]
    fn composition_no_fields_missed() {
        assert_eq!(Composition::new().iter().count(), FIELD_MODIFIERS.len());
    }

    #[test]
    fn composition_empty() {
        let c = Composition::empty();
        assert_eq!(c, Composition::new());
        assert_eq!(c, Composition::default());

        assert_eq!(c.energy, 0.0);
        assert_eq!(c.solids, Solids::empty());
        assert_eq!(c.micro, Micro::empty());
        assert_eq!(c.alcohol, Alcohol::empty());
        assert_eq!(c.pod, 0.0);
        assert_eq!(c.pac, PAC::empty());
        assert_eq!(c.texture, Texture::empty());

        // An empty composition is equivalent to 100% water
        assert_eq!(c.water(), 100.0);
    }

    #[test]
    fn composition_field_update_methods() {
        let solids = Solids::new().milk(SolidsBreakdown::new().fats(Fats::new().total(5.0)));
        let micro = Micro::new().salt(0.5);
        let alcohol = Alcohol::new().by_weight(3.0);
        let pac = PAC::new().sugars(4.0).msnf_ws_salts(2.0);
        let texture = Texture::new().stabilization(0.8);

        let c = Composition::new()
            .energy(150.0)
            .solids(solids)
            .micro(micro)
            .alcohol(alcohol)
            .pod(1.5)
            .pac(pac)
            .texture(texture);

        assert_eq!(c.energy, 150.0);
        assert_eq!(c.solids, solids);
        assert_eq!(c.micro, micro);
        assert_eq!(c.alcohol, alcohol);
        assert_eq!(c.pod, 1.5);
        assert_eq!(c.pac, pac);
        assert_eq!(c.texture, texture);
    }

    #[test]
    fn composition_water() {
        assert_eq!(Composition::new().water(), 100.0);

        let with_solids = Composition::new().solids(Solids::new().other(SolidsBreakdown::new().others(10.0)));
        assert_eq!(with_solids.water(), 90.0);

        let with_alcohol = Composition::new().alcohol(Alcohol::new().by_weight(5.0));
        assert_eq!(with_alcohol.water(), 95.0);

        let with_both = Composition::new()
            .solids(Solids::new().other(SolidsBreakdown::new().others(10.0)))
            .alcohol(Alcohol::new().by_weight(5.0));
        assert_eq!(with_both.water(), 85.0);
    }

    #[test]
    fn composition_nan_values() {
        let comp = Composition::new();

        assert_eq!(comp.get(CompKey::Water), 100.0);
        assert_eq!(comp.get(CompKey::TotalSolids), 0.0);
        assert_eq!(comp.get(CompKey::TotalFats), 0.0);
        assert!(comp.get(CompKey::EmulsifiersPerFat).is_nan());
        assert_eq!(comp.get(CompKey::StabilizersPerWater), 0.0);
        assert_eq!(comp.get(CompKey::AbsPAC), 0.0);

        let comp = Composition::new().solids(Solids::new().other(SolidsBreakdown::new().others(100.0)));

        assert_eq!(comp.get(CompKey::Water), 0.0);
        assert_eq!(comp.get(CompKey::TotalSolids), 100.0);
        assert!(comp.get(CompKey::EmulsifiersPerFat).is_nan());
        assert!(comp.get(CompKey::StabilizersPerWater).is_nan());
        assert!(comp.get(CompKey::AbsPAC).is_nan());
    }

    #[test]
    fn composition_emulsifiers_per_fat() {
        let c = Composition::new()
            .micro(Micro::new().emulsifiers(Emulsifiers::new().egg_yolk_lecithin(0.5)))
            .solids(Solids::new().milk(SolidsBreakdown::new().fats(Fats::new().total(10.0))));
        assert_eq!(c.emulsifiers_per_fat(), 5.0);
    }

    #[test]
    fn composition_stabilizers_per_water() {
        let c = Composition::new()
            .micro(Micro::new().stabilizers(Stabilizers::new().locust_bean_gum(0.9)))
            .solids(Solids::new().other(SolidsBreakdown::new().others(10.0)));
        // 0.9 / 90.0 * 100 == 1.0
        assert_eq!(c.stabilizers_per_water(), 1.0);
    }

    #[test]
    fn composition_absolute_pac() {
        let c = Composition::new()
            .pac(PAC::new().sugars(9.0))
            .solids(Solids::new().other(SolidsBreakdown::new().others(10.0)));
        // 9.0 / 90.0 * 100 == 10.0
        assert_eq!(c.absolute_pac(), 10.0);
    }

    #[test]
    fn composition_2_percent_milk_get() {
        let expected = HashMap::from([
            (CompKey::Energy, 49.5756),
            (CompKey::MilkFat, 2.0),
            (CompKey::MSNF, 8.82),
            (CompKey::MilkSNFS, 4.0131),
            (CompKey::MilkProteins, 3.087),
            (CompKey::MilkSolids, 10.82),
            (CompKey::TotalFats, 2.0),
            (CompKey::TotalSNF, 8.82),
            (CompKey::TotalSNFS, 4.0131),
            (CompKey::TotalProteins, 3.087),
            (CompKey::TotalSolids, 10.82),
            (CompKey::Water, 89.18),
            (CompKey::Lactose, 4.8069),
            (CompKey::TotalSugars, 4.8069),
            (CompKey::TotalArtificial, 0.0),
            (CompKey::TotalSweeteners, 4.8069),
            (CompKey::TotalCarbohydrates, 4.8069),
            (CompKey::POD, 0.769_104),
            (CompKey::PACsgr, 4.8069),
            (CompKey::PACmlk, 3.2405),
            (CompKey::PACtotal, 8.0474),
            (CompKey::AbsPAC, 9.02377),
        ]);

        CompKey::iter().for_each(|key| assert_eq_flt_test!(COMP_2_MILK.get(key), *expected.get(&key).unwrap_or(&0.0)));
    }

    #[allow(clippy::too_many_lines)]
    #[test]
    fn composition_get_all_keys() {
        // Build a composition with every field set to known non-zero values to exercise all
        // CompKey branches. Any key that maps to 0.0 (because it falls through to a default)
        // would cause unwrap() to fail below, making it easy to catch new unhandled keys.
        //
        // Per-category totals: milk=13, egg=4, cocoa=7, nut=4, other=10.5 -> TotalSolids=38.5
        // alcohol=2.5 -> Water = 100 - 38.5 - 2.5 = 59.0
        let milk = SolidsBreakdown::new()
            .fats(Fats::new().total(4.0))
            .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(5.0)))
            .proteins(3.0)
            .others(1.0);

        let egg = SolidsBreakdown::new()
            .fats(Fats::new().total(2.0))
            .proteins(1.0)
            .others(1.0);

        let cocoa = SolidsBreakdown::new()
            .fats(Fats::new().total(3.0))
            .carbohydrates(Carbohydrates::new().sugars(Sugars::new().sucrose(2.0)))
            .proteins(1.0)
            .others(1.0);

        let nut = SolidsBreakdown::new()
            .fats(Fats::new().total(2.0))
            .proteins(1.0)
            .others(1.0);

        let other = SolidsBreakdown::new()
            .fats(Fats::new().total(1.0))
            .carbohydrates(
                Carbohydrates::new()
                    .sugars(
                        Sugars::new()
                            .glucose(1.0)
                            .fructose(1.0)
                            .galactose(1.0)
                            .maltose(1.0)
                            .trehalose(1.0),
                    )
                    .polyols(Polyols::new().erythritol(2.0))
                    .fiber(Fibers::new().oligofructose(1.0)),
            )
            .artificial_sweeteners(ArtificialSweeteners::new().aspartame(0.5))
            .proteins(0.5)
            .others(0.5);

        let c = Composition::new()
            .energy(100.0)
            .solids(Solids::new().milk(milk).egg(egg).cocoa(cocoa).nut(nut).other(other))
            .micro(
                Micro::new()
                    .salt(0.3)
                    .emulsifiers(Emulsifiers::new().egg_yolk_lecithin(0.6))
                    .stabilizers(Stabilizers::new().locust_bean_gum(0.59)),
            )
            .alcohol(Alcohol::new().by_weight(2.5))
            .pod(5.0)
            .pac(
                PAC::new()
                    .sugars(6.0)
                    .salt(1.0)
                    .msnf_ws_salts(2.0)
                    .alcohol(0.5)
                    .hardness_factor(1.0),
            );

        let abv = c.alcohol.to_abv(); // 2.5 / ABV_TO_ABW_RATIO
        let abs_pac = c.absolute_pac(); // (6+1+2+0.5) / 59.0 * 100

        #[rustfmt::skip]
        let expected = HashMap::from([
            (CompKey::Energy,               100.0),
            // Milk
            (CompKey::MilkFat,              4.0),
            (CompKey::MSNF,                 9.0),   // milk.snf()  = 13 - 4
            (CompKey::MilkSNFS,             4.0),   // milk.snfs() = 9 - 5 (lactose)
            (CompKey::MilkProteins,         3.0),
            (CompKey::MilkSolids,           13.0),
            // Cocoa
            (CompKey::CocoaButter,          3.0),
            (CompKey::CocoaSolids,          2.0),   // cocoa.snfs() = (7-3) - 2 (sucrose)
            (CompKey::CacaoSolids,          5.0),   // cocoa.total() - cocoa.sugars = 7 - 2
            // Nut
            (CompKey::NutFat,               2.0),
            (CompKey::NutSNF,               2.0),   // nut.snfs() = (4-2) - 0
            (CompKey::NutSolids,            4.0),   // nut.total() - nut.sugars = 4 - 0
            // Egg
            (CompKey::EggFat,               2.0),
            (CompKey::EggSNF,               2.0),   // egg.snfs() = (4-2) - 0
            (CompKey::EggSolids,            4.0),   // egg.total() - egg.sugars = 4 - 0
            // Other
            (CompKey::OtherFats,            1.0),
            (CompKey::OtherSNFS,            4.5),   // other.snfs() = (10.5-1) - 5.0 (sugars)
            // Totals
            (CompKey::TotalFats,            12.0),  // 4+2+3+2+1
            (CompKey::TotalSNF,             26.5),  // 38.5 - 12.0
            (CompKey::TotalSNFS,            14.5),  // 26.5 - 12.0 (TotalSugars)
            (CompKey::TotalProteins,        6.5),   // 3+1+1+1+0.5
            (CompKey::TotalSolids,          38.5),  // 13+4+7+4+10.5
            (CompKey::Water,                59.0),  // 100 - 38.5 - 2.5
            // Carbohydrates
            (CompKey::Fiber,                1.0),   // oligofructose
            (CompKey::Glucose,              1.0),
            (CompKey::Fructose,             1.0),
            (CompKey::Galactose,            1.0),
            (CompKey::Sucrose,              2.0),
            (CompKey::Lactose,              5.0),
            (CompKey::Maltose,              1.0),
            (CompKey::Trehalose,            1.0),
            (CompKey::TotalSugars,          12.0),  // 1+1+1+2+5+1+1
            (CompKey::Erythritol,           2.0),
            (CompKey::TotalPolyols,         2.0),
            (CompKey::TotalCarbohydrates,   15.0),  // 12 (sugars) + 2 (polyols) + 1 (fiber)
            (CompKey::TotalArtificial,      0.5),   // aspartame
            (CompKey::TotalSweeteners,      14.5),  // 12 + 2 + 0.5
            // Alcohol and Micro
            (CompKey::Alcohol,              2.5),
            (CompKey::ABV,                  abv),
            (CompKey::Salt,                 0.3),
            (CompKey::Lecithin,             0.6),
            (CompKey::Emulsifiers,          0.6),
            (CompKey::Stabilizers,          0.59),
            (CompKey::EmulsifiersPerFat,    5.0),   // 0.6 / 12.0 * 100
            (CompKey::StabilizersPerWater,  1.0),   // 0.59 / 59.0 * 100
            // POD and PAC
            (CompKey::POD,                  5.0),
            (CompKey::PACsgr,               6.0),
            (CompKey::PACslt,               1.0),
            (CompKey::PACmlk,               2.0),
            (CompKey::PACalc,               0.5),
            (CompKey::PACtotal,             9.5),
            (CompKey::AbsPAC,               abs_pac),
            (CompKey::HF,                   1.0),
        ]);

        // unwrap (not unwrap_or) so that any newly added CompKey not in the map panics the test
        CompKey::iter().for_each(|key| assert_eq_flt_test!(c.get(key), *expected.get(&key).unwrap()));
    }

    #[test]
    fn composition_from_combination_empty() {
        assert_eq!(Composition::from_combination(&[]).unwrap(), Composition::empty());
    }

    #[test]
    fn composition_from_combination_zero_total() {
        let c = Composition::new().energy(100.0).pod(2.0);
        assert_eq!(Composition::from_combination(&[(c, 0.0)]).unwrap(), Composition::empty());
    }

    #[test]
    fn composition_from_combination_single() {
        let c = Composition::new()
            .energy(100.0)
            .solids(Solids::new().other(SolidsBreakdown::new().others(10.0)))
            .pod(2.0);
        let result = Composition::from_combination(&[(c, 1.0)]).unwrap();
        assert_abs_diff_eq!(result, c);
    }

    #[test]
    fn composition_from_combination_two_equal_weights() {
        let a = Composition::new()
            .energy(100.0)
            .solids(Solids::new().other(SolidsBreakdown::new().others(20.0)));
        let b = Composition::new()
            .energy(60.0)
            .solids(Solids::new().other(SolidsBreakdown::new().others(10.0)));

        let result = Composition::from_combination(&[(a, 1.0), (b, 1.0)]).unwrap();
        assert_eq!(result.energy, 80.0);
        assert_eq!(result.solids.other.others, 15.0);
    }

    #[test]
    fn composition_from_combination_error() {
        let c = Composition::new();
        assert!(matches!(Composition::from_combination(&[(c, -1.0)]), Err(Error::CompositionNotPositive(_))));
    }

    #[test]
    fn composition_scale() {
        let c = Composition::new()
            .energy(100.0)
            .solids(Solids::new().other(SolidsBreakdown::new().others(20.0)))
            .micro(Micro::new().salt(1.0))
            .alcohol(Alcohol::new().by_weight(4.0))
            .pod(2.0)
            .pac(PAC::new().sugars(8.0));

        let scaled = c.scale(0.5);
        assert_eq!(scaled.energy, 50.0);
        assert_eq!(scaled.solids.other.others, 10.0);
        assert_eq!(scaled.micro.salt, 0.5);
        assert_eq!(scaled.alcohol.by_weight, 2.0);
        assert_eq!(scaled.pod, 1.0);
        assert_eq!(scaled.pac.sugars, 4.0);
    }

    #[test]
    fn composition_add() {
        let a = Composition::new()
            .energy(100.0)
            .solids(Solids::new().other(SolidsBreakdown::new().others(20.0)))
            .micro(Micro::new().salt(1.0))
            .alcohol(Alcohol::new().by_weight(4.0))
            .pod(2.0)
            .pac(PAC::new().sugars(8.0))
            .texture(Texture::new().stabilization(0.5));
        let b = Composition::new()
            .energy(50.0)
            .solids(Solids::new().milk(SolidsBreakdown::new().proteins(5.0)))
            .micro(Micro::new().stabilizers(Stabilizers::new().locust_bean_gum(0.2)))
            .alcohol(Alcohol::new().by_weight(1.0))
            .pod(1.0)
            .pac(PAC::new().msnf_ws_salts(3.0))
            .texture(Texture::new().stabilization(0.7));

        let sum = a.add(&b);
        assert_eq!(sum.energy, 150.0);
        assert_eq!(sum.solids.other.others, 20.0);
        assert_eq!(sum.solids.milk.proteins, 5.0);
        assert_eq!(sum.micro.salt, 1.0);
        assert_eq!(sum.micro.stabilizers.locust_bean_gum, 0.2);
        assert_eq!(sum.alcohol.by_weight, 5.0);
        assert_eq!(sum.pod, 3.0);
        assert_eq!(sum.pac.sugars, 8.0);
        assert_eq!(sum.pac.msnf_ws_salts, 3.0);
        assert_eq!(sum.texture.stabilization, 1.2);
    }

    #[test]
    fn composition_abs_diff_eq() {
        let a = Composition::new()
            .energy(100.0)
            .solids(Solids::new().milk(SolidsBreakdown::new().fats(Fats::new().total(5.0))))
            .micro(Micro::new().salt(1.0))
            .alcohol(Alcohol::new().by_weight(3.0))
            .pod(2.0)
            .pac(PAC::new().sugars(4.0))
            .texture(Texture::new().stabilization(0.5));
        let b = a;
        let mut c = b;

        for v in [a, b, c] {
            assert_ne!(v.energy, 0.0);
            assert_ne!(v.solids.milk.fats.total, 0.0);
            assert_ne!(v.micro.salt, 0.0);
            assert_ne!(v.alcohol.by_weight, 0.0);
            assert_ne!(v.pod, 0.0);
            assert_ne!(v.pac.sugars, 0.0);
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
        assert!(Composition::empty().validate().is_ok());
    }

    #[test]
    fn validate_ok_for_valid_values() {
        let c = Composition::new()
            .energy(250.0)
            .solids(Solids::new().milk(SolidsBreakdown::new().fats(Fats::new().total(10.0))))
            .micro(Micro::new().salt(0.5))
            .alcohol(Alcohol::new().by_weight(2.0))
            .pod(80.0)
            .pac(PAC::new().sugars(6.0))
            .texture(Texture::new().stabilization(0.5));
        assert!(c.validate().is_ok());
    }

    #[test]
    fn validate_err_for_each_negative_field() {
        for field_modifier in FIELD_MODIFIERS {
            let mut c = Composition::empty();
            field_modifier(&mut c, -1.0);
            assert!(matches!(c.validate(), Err(Error::CompositionNotPositive(_))));
        }
    }

    #[test]
    fn validate_err_when_solids_plus_alcohol_exceeds_100() {
        let c = Composition::new()
            .solids(Solids::new().milk(SolidsBreakdown::new().others(60.0)))
            .alcohol(Alcohol::new().by_weight(41.0));
        assert!(matches!(c.validate(), Err(Error::CompositionNotWithin100Percent(_))));
    }

    #[test]
    fn validate_err_on_invalid_solids() {
        let c = Composition::new()
            .solids(Solids::new().milk(SolidsBreakdown::new().fats(Fats::new().total(10.0).saturated(11.0))));
        assert!(matches!(c.validate(), Err(Error::InvalidComposition(_))));
    }

    #[test]
    fn validate_err_on_invalid_micro() {
        let c = Composition::new().micro(Micro::new().salt(-1.0));
        assert!(matches!(c.validate(), Err(Error::CompositionNotPositive(_))));
    }

    #[test]
    fn validate_err_on_invalid_alcohol() {
        let c = Composition::new().alcohol(Alcohol::new().by_weight(101.0));
        assert!(matches!(c.validate(), Err(Error::CompositionNotWithin100Percent(_))));
    }

    #[test]
    fn validate_err_on_invalid_pac() {
        let c = Composition::new().pac(PAC::new().sugars(-1.0));
        assert!(matches!(c.validate(), Err(Error::CompositionNotPositive(_))));
    }

    #[test]
    fn validate_err_on_invalid_texture() {
        let c = Composition::new().texture(Texture::new().stabilization(-0.1));
        assert!(matches!(c.validate(), Err(Error::CompositionNotPositive(_))));
    }

    #[test]
    fn validate_into_returns_self_when_valid() {
        let c = Composition::new().energy(100.0).pod(50.0);
        let result = c.validate_into();
        assert!(result.is_ok());
        assert_eq!(result.unwrap().energy, 100.0);
    }

    #[test]
    fn validate_into_returns_err_when_invalid() {
        assert!(Composition::new().energy(-1.0).validate_into().is_err());
    }
}

use approx::AbsDiffEq;
use serde::{Deserialize, Serialize};
use struct_iterable::Iterable;
use strum_macros::EnumIter;

use crate::composition::{Alcohol, Micro, PAC, Solids};

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

#[cfg(doc)]
use crate::specs::ChocolateSpec;

pub trait ScaleComponents {
    fn scale(&self, factor: f64) -> Self;
    fn add(&self, other: &Self) -> Self;
}

/// Composition of an ingredient or mix, as grams of component per 100g of ingredient/mix
///
/// In a hypothetical 100g of ingredient/mix: `solids.total() + alcohol + water() == 100`.
///
/// `sweeteners` and `micro` components are both accounted for in `solids`, and should not be
/// double-counted. They are provided separately to facilitate the analysis of key components.
///
/// POD and [PAC](crate::docs#pac-afp-fpdf-se) are expressed as a sucrose equivalence and do not
/// necessarily represent real weights of components. While some underlying components may have
/// utilities to calculate their contributions to POD and PAC, the overall POD and PAC of a
/// composition are independent values and are set during composition construction, taking all
/// underlying contributions into account.
#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Iterable, PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
pub struct Composition {
    pub solids: Solids,
    pub micro: Micro,
    pub alcohol: Alcohol,
    pub pod: f64,
    pub pac: PAC,
}

/// Keys for accessing specific composition values from a [`Composition`] via [`Composition::get()`]
///
/// [`Composition`] is a complex struct with several levels of nesting, and may continuously evolve
/// to include more components, which makes direct field access cumbersome and error-prone. This
/// enum provides a more stable and convenient interface for accessing specific composition values.
#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(EnumIter, Hash, PartialEq, Eq, Serialize, Deserialize, Copy, Clone, Debug)]
pub enum CompKey {
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
    /// rich mouthfeel of chocolate ice creams due to the way that cocoa fats melt in the mouth.
    CocoaButter,
    /// _Cocoa_ solids, the non-fat component of cacao solids [`CompKey::CacaoSolids`]
    ///
    /// Sometimes referred to as "cocoa powder" or "cocoa fiber", i.e. cacao solids minus cocoa
    /// butter; see [`ChocolateSpec`] for more details. In ice cream mixes, this generally
    /// determines how "chocolatey" the flavor is, and contributes to the texture and body.
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

    Glucose,
    Fructose,
    Galactose,
    Sucrose,
    Lactose,
    Maltose,
    TotalSugars,
    Polyols,
    TotalCarbohydrates,
    ArtificialSweeteners,
    TotalSweeteners,

    Alcohol,
    ABV,

    Salt,
    Lecithin,
    Emulsifiers,
    Stabilizers,
    EmulsifiersPerFat,
    StabilizersPerWater,

    POD,

    PACsgr,
    PACslt,
    PACmlk,
    PACalc,
    PACtotal,
    AbsPAC,
    HF,
}

impl Composition {
    /// Create an empty composition, which is equivalent to the composition of 100% water.
    pub fn empty() -> Self {
        Self {
            solids: Solids::empty(),
            micro: Micro::empty(),
            alcohol: Alcohol::empty(),
            pod: 0.0,
            pac: PAC::empty(),
        }
    }

    pub fn solids(self, solids: Solids) -> Self {
        Self { solids, ..self }
    }

    pub fn micro(self, micro: Micro) -> Self {
        Self { micro, ..self }
    }

    pub fn alcohol(self, alcohol: Alcohol) -> Self {
        Self { alcohol, ..self }
    }

    pub fn pod(self, pod: f64) -> Self {
        Self { pod, ..self }
    }

    pub fn pac(self, pac: PAC) -> Self {
        Self { pac, ..self }
    }
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
impl Composition {
    #[cfg_attr(feature = "wasm", wasm_bindgen(constructor))]
    pub fn new() -> Self {
        Self::empty()
    }

    pub fn water(&self) -> f64 {
        100.0 - self.solids.total() - self.alcohol.by_weight
    }

    /// Note that [`f64::NAN`] is a valid result, if there are no fats
    pub fn emulsifiers_per_fat(&self) -> f64 {
        if self.solids.all().fats.total > 0.0 {
            (self.micro.emulsifiers / self.solids.all().fats.total) * 100.0
        } else {
            f64::NAN
        }
    }

    /// Note that [`f64::NAN`] is a valid result, if there is no water
    pub fn stabilizers_per_water(&self) -> f64 {
        if self.water() > 0.0 {
            (self.micro.stabilizers / self.water()) * 100.0
        } else {
            f64::NAN
        }
    }

    /// Note that [`f64::NAN`] is a valid result, if there is no water
    /// Excluding hardness factor, i.e. `self.pac.total() / self.water()`
    pub fn absolute_pac(&self) -> f64 {
        if self.water() > 0.0 {
            (self.pac.total() / self.water()) * 100.0
        } else {
            f64::NAN
        }
    }

    pub fn get(&self, key: CompKey) -> f64 {
        match key {
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

            CompKey::Glucose => self.solids.all().carbohydrates.sugars.glucose,
            CompKey::Fructose => self.solids.all().carbohydrates.sugars.fructose,
            CompKey::Galactose => self.solids.all().carbohydrates.sugars.galactose,
            CompKey::Sucrose => self.solids.all().carbohydrates.sugars.sucrose,
            CompKey::Lactose => self.solids.all().carbohydrates.sugars.lactose,
            CompKey::Maltose => self.solids.all().carbohydrates.sugars.maltose,
            CompKey::TotalSugars => self.solids.all().carbohydrates.sugars.total(),
            CompKey::Polyols => self.solids.all().carbohydrates.polyols.total(),
            CompKey::TotalCarbohydrates => self.solids.all().carbohydrates.total(),
            CompKey::ArtificialSweeteners => self.solids.all().artificial_sweeteners.total(),
            CompKey::TotalSweeteners => {
                self.solids.all().carbohydrates.sugars.total()
                    + self.solids.all().carbohydrates.polyols.total()
                    + self.solids.all().artificial_sweeteners.total()
            }

            CompKey::Alcohol => self.alcohol.by_weight,
            CompKey::ABV => self.alcohol.to_abv(),

            CompKey::Salt => self.micro.salt,
            CompKey::Lecithin => self.micro.lecithin,
            CompKey::Emulsifiers => self.micro.emulsifiers,
            CompKey::Stabilizers => self.micro.stabilizers,
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

impl ScaleComponents for Composition {
    fn scale(&self, factor: f64) -> Self {
        Self {
            solids: self.solids.scale(factor),
            micro: self.micro.scale(factor),
            alcohol: self.alcohol.scale(factor),
            pod: self.pod * factor,
            pac: self.pac.scale(factor),
        }
    }

    fn add(&self, other: &Self) -> Self {
        Self {
            solids: self.solids.add(&other.solids),
            micro: self.micro.add(&other.micro),
            alcohol: self.alcohol.add(&other.alcohol),
            pod: self.pod + other.pod,
            pac: self.pac.add(&other.pac),
        }
    }
}

impl AbsDiffEq for Composition {
    type Epsilon = f64;

    fn default_epsilon() -> Self::Epsilon {
        f64::default_epsilon()
    }

    fn abs_diff_eq(&self, other: &Self, epsilon: Self::Epsilon) -> bool {
        self.solids.abs_diff_eq(&other.solids, epsilon)
            && self.micro.abs_diff_eq(&other.micro, epsilon)
            && self.alcohol.abs_diff_eq(&other.alcohol, epsilon)
            && self.pod.abs_diff_eq(&other.pod, epsilon)
            && self.pac.abs_diff_eq(&other.pac, epsilon)
    }
}

impl Default for Composition {
    fn default() -> Self {
        Self::empty()
    }
}

#[cfg(test)]
mod tests {
    use std::collections::HashMap;

    use strum::IntoEnumIterator;

    use crate::tests::asserts::shadow_asserts::assert_eq;
    use crate::tests::asserts::*;

    use crate::tests::assets::*;

    use super::*;
    use crate::composition::*;

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
    fn composition_get() {
        let expected = HashMap::from([
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
            (CompKey::TotalCarbohydrates, 4.8069),
            (CompKey::ArtificialSweeteners, 0.0),
            (CompKey::TotalSweeteners, 4.8069),
            (CompKey::POD, 0.769104),
            (CompKey::PACsgr, 4.8069),
            (CompKey::PACmlk, 3.2405),
            (CompKey::PACtotal, 8.0474),
            (CompKey::AbsPAC, 9.02377),
        ]);

        CompKey::iter().for_each(|key| {
            assert_abs_diff_eq!(COMP_2_MILK.get(key), *expected.get(&key).unwrap_or(&0.0), epsilon = TESTS_EPSILON)
        });
    }
}

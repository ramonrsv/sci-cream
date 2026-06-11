//! [`RatioKey`] and its metadata: keys for intensive (non-additive) ratios of two extensive
//! [`CompKey`]s, e.g. [`RatioKey::AbsPAC`].
//!
//! Unlike a [`CompKey`], which is *extensive* — additive, scalable by an ingredient's quantity, and
//! summable across a recipe — a [`RatioKey`] is *intensive*: `numerator / denominator * 100`, a
//! dimensionless percentage that is not additive and must never be multiplied by a quantity.
//! Keeping ratios in their own type lets [`CompKey`] retain a hard, type-enforced "every variant is
//! additive" invariant. See [`PropKey`] and [`BalanceKey`] for unions of these keys and [`FpdKey`].
//!
//! [`RatioKey::parts`] is the authoritative source for a ratio's parts (numerator and denominator).

use serde::{Deserialize, Serialize};
use strum_macros::EnumIter;

use crate::composition::CompKey;

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

#[cfg(doc)]
use crate::{balancing::BalanceKey, composition::Composition, fpd::FpdKey, properties::PropKey};

/// Keys for intensive ratio properties — `numerator / denominator * 100` of two extensive keys.
///
/// Read from a [`Composition`] via [`get_ratio`](Composition::get_ratio).
///
/// A ratio is non-additive: it is meaningful for a whole mix (or, for some keys, a single
/// ingredient; see [`RatioKey::scope`]) but cannot be summed or scaled by a quantity the way a
/// [`CompKey`] can. As a balancing target a ratio is encoded as a homogeneous row rather than a
/// direct weighted-sum row (see [`RatioKey::parts`]).
#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(EnumIter, Hash, PartialEq, Eq, Serialize, Deserialize, Copy, Clone, Debug)]
pub enum RatioKey {
    /// [Absolute PAC](crate::docs#absolute-pac), i.e. `TotalPAC / Water`, as a percentage.
    AbsPAC,
    /// Absolute net [PAC](crate::docs#pac), i.e. `(TotalPAC - HF) / Water`, as a percentage.
    AbsNetPAC,
    /// Total emulsifier content per fat content, i.e. `TotalEmulsifiers / TotalFats`, as a
    /// percentage.
    EmulsifiersPerFat,
    /// Total stabilizer content per water content, i.e. `TotalStabilizers / Water`, as a
    /// percentage.
    StabilizersPerWater,
}

/// Whether a key is meaningful for a whole mix, an individual ingredient, or both.
///
/// A *soft* classification used to filter which keys a UI surfaces in a given context (e.g. a mix
/// calculator vs. an ingredient/sweetener classifier). It does not gate computation: the underlying
/// math (see [`get_ratio`](Composition::get_ratio)) is evaluated regardless of scope.
#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(EnumIter, Hash, PartialEq, Eq, Serialize, Deserialize, Copy, Clone, Debug)]
pub enum KeyScope {
    /// Meaningful only for a whole mix, e.g. [`RatioKey::AbsPAC`], [`RatioKey::EmulsifiersPerFat`]
    ///
    /// The current ratios are all mix-level (their denominators — water, total fat — are only
    /// meaningful for a finished mix). Future sweetener-classification ratios (e.g. `PAC:POD`,
    /// `PAC:Solids`) will be [`KeyScope::Ingredient`].
    Mix,
    /// Meaningful only for an individual ingredient, e.g. PAC:POD sweetener-classification ratio.
    Ingredient,
    /// Meaningful for both a whole mix and individual ingredients.
    Both,
}

impl RatioKey {
    /// This ratio's `(numerator, denominator)` extensive [`CompKey`] parts.
    #[must_use]
    pub const fn parts(self) -> (CompKey, CompKey) {
        match self {
            Self::AbsPAC => (CompKey::TotalPAC, CompKey::Water),
            Self::AbsNetPAC => (CompKey::NetPAC, CompKey::Water),
            Self::StabilizersPerWater => (CompKey::TotalStabilizers, CompKey::Water),
            Self::EmulsifiersPerFat => (CompKey::TotalEmulsifiers, CompKey::TotalFats),
        }
    }

    /// This ratio's [`KeyScope`] — whether it is meaningful for a mix, an ingredient, or both.
    #[must_use]
    pub const fn scope(self) -> KeyScope {
        match self {
            Self::AbsPAC | Self::AbsNetPAC | Self::EmulsifiersPerFat | Self::StabilizersPerWater => KeyScope::Mix,
        }
    }
}

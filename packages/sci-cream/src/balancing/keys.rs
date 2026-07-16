//! Balancing target keys: [`BalanceKey`], its encoding as a least-squares row
//! ([`target_row_coeff`] and the crate-internal `target_row_rhs`), and the catalogs of
//! balanceable keys.

use std::ops::RangeInclusive;

use serde::{Deserialize, Serialize};
use strum::IntoEnumIterator;

use crate::{
    composition::{CompKey, Composition, CompositionValues, RatioKey},
    fpd::{FPD, FpdKey},
};

#[cfg(doc)]
use crate::recipe::Recipe;

/// A key usable as a balancing target: a [`CompKey`], a [`RatioKey`], or an [`FpdKey`]
///
/// Balancing accepts all three kinds of key but treats them differently — an extensive key
/// contributes a direct weighted-sum row, a ratio key a homogeneous row (see [`target_row_coeff`]),
/// and a key with a [`proxy`](Self::proxy) (FPD keys and [`CompKey::ABV`]) is translated to a
/// target on that proxy before solving. This union is the balancing-facing counterpart of
/// [`PropKey`](crate::properties::PropKey).
///
/// **Note**: The different variants all use `#[serde(untagged)]` to allow a flat list of keys in
/// the WASM-facing balancing API, in line with how the TypeScript wrappers handle `PropKey`. This
/// requires that all variant names be unique across all the underlying key types.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum BalanceKey {
    /// An extensive composition key (additive, scalable by quantity).
    #[serde(untagged)]
    Comp(CompKey),
    /// An intensive ratio key (`numerator / denominator`, non-additive).
    #[serde(untagged)]
    Ratio(RatioKey),
    /// An intensive freezing-point-derived key, translated to a ratio proxy before solving.
    #[serde(untagged)]
    Fpd(FpdKey),
}

impl From<CompKey> for BalanceKey {
    fn from(key: CompKey) -> Self {
        Self::Comp(key)
    }
}

impl From<RatioKey> for BalanceKey {
    fn from(key: RatioKey) -> Self {
        Self::Ratio(key)
    }
}

impl From<FpdKey> for BalanceKey {
    fn from(key: FpdKey) -> Self {
        Self::Fpd(key)
    }
}

/// The Intensive/Extensive classification of a [`BalanceKey`]; see [`BalanceKey::extent`].
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Extent {
    /// Additive and scalable by quantity; contributes a direct weighted-sum solver row.
    Extensive,
    /// Non-additive; solved via a homogeneous ratio row or a proxy translation.
    Intensive,
}

impl BalanceKey {
    /// Returns `true` if this is a ratio key (encoded as a homogeneous row when balancing).
    #[must_use]
    pub const fn is_ratio(self) -> bool {
        matches!(self, Self::Ratio(_))
    }

    /// The Intensive/Extensive classification of this key.
    ///
    /// Intensive does not imply a translation: ratio keys are intensive but natively solvable via
    /// homogeneous rows; only keys with a [`proxy`](Self::proxy) require translation.
    #[must_use]
    pub const fn extent(self) -> Extent {
        match self {
            Self::Comp(CompKey::ABV) | Self::Ratio(_) | Self::Fpd(_) => Extent::Intensive,
            Self::Comp(_) => Extent::Extensive,
        }
    }

    /// The proxy key this key's target translates to before solving, or `None` if the solver
    /// encodes this key natively (extensive keys directly, ratio keys via homogeneous rows).
    ///
    /// [`CompKey::ABV`] translates to the additive alcohol by weight; the FPD keys translate to
    /// the PAC-per-water ratio driving the corresponding forward curve computation (see
    /// [`translate_balancing_targets`](super::translate_balancing_targets) for value formulas).
    #[must_use]
    pub const fn proxy(self) -> Option<Self> {
        match self {
            Self::Comp(CompKey::ABV) => Some(Self::Comp(CompKey::Alcohol)),
            Self::Fpd(FpdKey::FPD) => Some(Self::Ratio(RatioKey::AbsPAC)),
            Self::Fpd(FpdKey::ServingTemp | FpdKey::HardnessAt14C) => Some(Self::Ratio(RatioKey::AbsNetPAC)),
            Self::Comp(_) | Self::Ratio(_) => None,
        }
    }

    /// The admissible interval for this key's target value; targets outside it are meaningless by
    /// definition — a negative quantity or ratio, an above-freezing temperature, or a hardness
    /// (percent frozen water) above 100. Bounds may be infinite.
    ///
    /// The key's intrinsic domain, independent of any palette; cf. the palette-derived reachable
    /// range of [`UnreachableTarget`](crate::balancing::BalancingIssue::UnreachableTarget).
    #[must_use]
    pub const fn target_domain(self) -> RangeInclusive<f64> {
        match self {
            Self::Fpd(FpdKey::FPD | FpdKey::ServingTemp) => f64::NEG_INFINITY..=0.0,
            Self::Fpd(FpdKey::HardnessAt14C) => 0.0..=100.0,
            Self::Comp(_) | Self::Ratio(_) => 0.0..=f64::INFINITY,
        }
    }

    /// The `(numerator, denominator)` extensive [`CompKey`] parts if this is a ratio key, else
    /// `None` (see [`RatioKey::parts`]).
    #[must_use]
    pub const fn ratio_parts(self) -> Option<(CompKey, CompKey)> {
        match self {
            Self::Ratio(key) => Some(key.parts()),
            Self::Comp(_) | Self::Fpd(_) => None,
        }
    }

    /// This key's value for a single composition: the extensive reading [`Composition::get`] for an
    /// extensive key, the intensive [`Composition::get_ratio`] for a ratio key, or the FPD reading
    /// via [`FPD::compute_from_composition`] for an FPD key.
    ///
    /// An FPD reading computes the full FPD curves, which is comparatively expensive, and reads
    /// [`f64::NAN`] when the curves cannot be computed — like `NaN` of [`Composition::get_ratio`].
    #[must_use]
    pub fn value(self, comp: &Composition) -> f64 {
        match self {
            Self::Comp(key) => comp.get(key),
            Self::Ratio(key) => comp.get_ratio(key),
            Self::Fpd(key) => FPD::compute_from_composition(*comp).map_or(f64::NAN, |fpd| fpd.get(key)),
        }
    }
}

/// The per-composition least-squares coefficient for one balancing target.
///
/// For an extensive key the coefficient is simply `comp.get(key)`. For a ratio key `R`, it is the
/// homogeneous `comp.get(num) - (R / 100) * comp.get(den)` (see [`RatioKey::parts`]), which is
/// always finite — the solver never evaluates the `NaN`-prone per-ingredient ratio.
///
/// # Panics
///
/// Panics on an FPD key: [`translate_balancing_targets`](super::translate_balancing_targets)
/// substitutes proxies before solving, so an FPD key reaching a solver row is a programming bug.
#[must_use]
pub fn target_row_coeff(key: BalanceKey, target: f64, comp: &impl CompositionValues) -> f64 {
    match key {
        BalanceKey::Ratio(ratio) => {
            let (num_key, den_key) = ratio.parts();
            comp.get(num_key) - (target / 100.0) * comp.get(den_key)
        }
        BalanceKey::Comp(comp_key) => comp.get(comp_key),
        BalanceKey::Fpd(_) => unreachable!("FPD keys must be translated to their proxy before solving"),
    }
}

/// The RHS for one target row: `0` for a ratio key (homogeneous row), else the target value itself.
pub(crate) const fn target_row_rhs(key: BalanceKey, target: f64) -> f64 {
    if key.is_ratio() { 0.0 } else { target }
}

/// All keys usable as balancing targets — every [`CompKey`], [`RatioKey`], and [`FpdKey`].
///
/// Extensive keys contribute their usual weighted-sum row. A ratio target `R` is encoded as the
/// homogeneous row `numerator - (R / 100) * denominator = 0` (see [`RatioKey::parts`]), so it never
/// divides and never poisons the solve with `f64::NAN`. Keys with a [`proxy`](BalanceKey::proxy)
/// ([`CompKey::ABV`] and the FPD keys) are translated to a target on that proxy before solving.
///
/// Every key here is individually targetable, but keys resolving to the same solver key — two keys
/// sharing one proxy, or a key together with its own proxy — cannot be targeted at once; see
/// [`get_all_native_balancing_keys`] for the maximal set that can.
#[must_use]
pub fn get_all_balanceable_keys() -> Vec<BalanceKey> {
    CompKey::iter()
        .map(BalanceKey::Comp)
        .chain(RatioKey::iter().map(BalanceKey::Ratio))
        .chain(FpdKey::iter().map(BalanceKey::Fpd))
        .collect()
}

/// The maximal consistent, translation-free target set — all except [`CompKey::ABV`], [`FpdKey`]s.
///
/// Unlike [`get_all_balanceable_keys`], no key has a [`proxy`](BalanceKey::proxy) or shares a
/// solver key, so the whole set can be targeted at once (e.g. by [`Recipe::deevaporate`]).
#[must_use]
pub fn get_all_native_balancing_keys() -> Vec<BalanceKey> {
    CompKey::iter()
        .filter(|key| *key != CompKey::ABV)
        .map(BalanceKey::Comp)
        .chain(RatioKey::iter().map(BalanceKey::Ratio))
        .collect()
}

/// Reads each `key`'s value from `comp` as a balancing target `(key, value)` pair.
#[must_use]
pub fn composition_balance_targets(comp: &Composition, keys: &[BalanceKey]) -> Vec<(BalanceKey, f64)> {
    keys.iter().map(|&key| (key, key.value(comp))).collect()
}

/// A subset of balanceable keys that adequately balances most typical ice cream mixes.
///
/// These keys target most of the critical attributes of an ice cream mix, including formulations
/// with chocolate, nuts, and eggs. Balancing a set of ingredients to these targets from a reference
/// recipe should typically succeed in producing a mix that closely matches the reference's key
/// properties. More complex formulations, e.g. sugar-free, lactose-free, sorbets, etc., likely
/// require more careful targeting and adjustment, so this is not a one-size-fits-all set.
#[must_use]
pub fn get_typical_balancing_keys() -> Vec<BalanceKey> {
    vec![
        CompKey::MilkFat.into(),
        CompKey::MSNF.into(),
        CompKey::CocoaButter.into(),
        CompKey::CocoaSolids.into(),
        CompKey::NutSNF.into(),
        CompKey::EggSNF.into(),
        CompKey::POD.into(),
        CompKey::TotalSolids.into(),
        CompKey::TotalFats.into(),
        CompKey::Salt.into(),
        RatioKey::StabilizersPerWater.into(),
        RatioKey::EmulsifiersPerFat.into(),
        CompKey::ABV.into(),
        FpdKey::FPD.into(),
        FpdKey::ServingTemp.into(),
    ]
}

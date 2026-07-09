//! Balancing target keys: [`BalanceKey`], its encoding as a least-squares row
//! ([`target_row_coeff`] and the crate-internal `target_row_rhs`), and the catalogs of
//! balanceable keys.

use serde::{Deserialize, Serialize};
use strum::IntoEnumIterator;

use crate::composition::{CompKey, Composition, CompositionValues, RatioKey};

/// A key usable as a balancing target: either an extensive [`CompKey`] or an intensive [`RatioKey`]
///
/// Balancing accepts both kinds of key but treats them differently — an extensive key contributes a
/// direct weighted-sum row, a ratio key a homogeneous row (see [`target_row_coeff`]). This union is
/// the balancing-facing counterpart of [`PropKey`](crate::properties::PropKey) (which additionally
/// carries [`FpdKey`](crate::fpd::FpdKey), which is not currently a supported balancing target).
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

impl BalanceKey {
    /// Returns `true` if this is a ratio key (encoded as a homogeneous row when balancing).
    #[must_use]
    pub const fn is_ratio(self) -> bool {
        matches!(self, Self::Ratio(_))
    }

    /// The `(numerator, denominator)` extensive [`CompKey`] parts if this is a ratio key, else
    /// `None` (see [`RatioKey::parts`]).
    #[must_use]
    pub const fn ratio_parts(self) -> Option<(CompKey, CompKey)> {
        match self {
            Self::Ratio(key) => Some(key.parts()),
            Self::Comp(_) => None,
        }
    }

    /// This key's value for a single composition: the extensive reading [`Composition::get`] for an
    /// extensive key, or the intensive [`Composition::get_ratio`] for a ratio key.
    #[must_use]
    pub fn value(self, comp: &Composition) -> f64 {
        match self {
            Self::Comp(key) => comp.get(key),
            Self::Ratio(key) => comp.get_ratio(key),
        }
    }
}

/// The per-composition least-squares coefficient for one balancing target.
///
/// For an extensive key the coefficient is simply `comp.get(key)`. For a ratio key `R`, it is the
/// homogeneous `comp.get(num) - (R / 100) * comp.get(den)` (see [`RatioKey::parts`]), which is
/// always finite — the solver never evaluates the `NaN`-prone per-ingredient ratio.
#[must_use]
pub fn target_row_coeff(key: BalanceKey, target: f64, comp: &impl CompositionValues) -> f64 {
    match key {
        BalanceKey::Ratio(ratio) => {
            let (num_key, den_key) = ratio.parts();
            comp.get(num_key) - (target / 100.0) * comp.get(den_key)
        }
        BalanceKey::Comp(comp_key) => comp.get(comp_key),
    }
}

/// The RHS for one target row: `0` for a ratio key (homogeneous row), else the target value itself.
pub(crate) const fn target_row_rhs(key: BalanceKey, target: f64) -> f64 {
    if key.is_ratio() { 0.0 } else { target }
}

/// All keys that can be used as balancing targets — all [`CompKey`]s and [`RatioKey`]s.
///
/// Ratio keys are balanceable too: a ratio target `R` is encoded as the homogeneous row
/// `numerator - (R / 100) * denominator = 0` (see [`RatioKey::parts`]), so it never divides and
/// never poisons the solve with `f64::NAN`. Extensive keys contribute their usual weighted-sum row.
#[must_use]
pub fn get_all_balanceable_keys() -> Vec<BalanceKey> {
    // @todo `ABV` is intensive (non-additive), so it cannot be a direct additive balancing row;
    // exclude it until the intensive->extensive translation layer (ABV -> Alcohol) lands.
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
        // @todo Restore the `ABV` target once the intensive->extensive translation layer lands;
        // balance the additive `Alcohol` (by_weight) proxy for now. See TODO.md.
        CompKey::Alcohol.into(),
        RatioKey::AbsNetPAC.into(),
    ]
}

//! Fast, read-only value lookup for a [`Composition`].
//!
//! [`Composition::get`] is a large [`CompKey`] `match`, and many arms recompute aggregates (e.g.
//! `self.solids.all()`) per call. Code that reads one composition many times, across many keys or
//! iterations, pays that cost repeatedly. [`FastComposition`] computes every [`CompKey`] value
//! once into a flat array, turning each later read into an array index.
//!
//! Both types implement [`CompositionValues`], so a hot path can be written once against
//! `&impl CompositionValues` and used with either a live [`Composition`] or a [`FastComposition`]
//! snapshot. Callers opt into the precompute only where it pays off; building the snapshot costs
//! roughly one full `get` sweep.

use strum::{EnumCount, IntoEnumIterator};

use crate::composition::{CompKey, Composition, RatioKey};

/// Read-only value access by key, shared by [`Composition`] and [`FastComposition`].
///
/// Only the value accessors are abstracted; construction, builders, and scaling stay specific to
/// [`Composition`] (meaningless on a flat snapshot). Generic, lookup-heavy code should take
/// `&impl CompositionValues` so it works with either representation.
pub trait CompositionValues {
    /// The extensive value for `key`, with the same semantics as [`Composition::get`].
    fn get(&self, key: CompKey) -> f64;

    /// The intensive ratio for `key`: `numerator / denominator * 100` of its two extensive
    /// [`CompKey`] parts (see [`RatioKey::parts`]), or [`f64::NAN`] when the denominator is zero.
    ///
    /// Mirrors [`Composition::get_ratio`]; provided in terms of [`get`](Self::get) so both
    /// implementors share one definition.
    fn get_ratio(&self, key: RatioKey) -> f64 {
        let (num_key, den_key) = key.parts();
        let denominator = self.get(den_key);
        if denominator > 0.0 {
            (self.get(num_key) / denominator) * 100.0
        } else {
            f64::NAN
        }
    }
}

impl CompositionValues for Composition {
    fn get(&self, key: CompKey) -> f64 {
        // Resolves to the inherent `Composition::get` (inherent methods take precedence over trait
        // methods of the same name), so this forwards rather than recursing.
        self.get(key)
    }
}

/// A flat snapshot of every [`CompKey`] value of a [`Composition`], for fast repeated reads.
///
/// Built once from a [`Composition`] (see [`Composition::to_fast`] or [`From`]), after which
/// [`get`](CompositionValues::get) is an array index keyed by `CompKey as usize`. The snapshot does
/// not track its source: rebuild it if the underlying composition changes.
///
/// Deliberately not `Copy` — the backing array is [`CompKey::COUNT`] × `f64` — so it is held and
/// passed by reference rather than copied implicitly.
#[derive(Clone, Debug, PartialEq)]
pub struct FastComposition([f64; CompKey::COUNT]);

impl From<&Composition> for FastComposition {
    fn from(comp: &Composition) -> Self {
        let mut values = [0.0; CompKey::COUNT];
        for key in CompKey::iter() {
            values[key as usize] = comp.get(key);
        }
        Self(values)
    }
}

impl CompositionValues for FastComposition {
    fn get(&self, key: CompKey) -> f64 {
        self.0[key as usize]
    }
}

impl Composition {
    /// Builds a [`FastComposition`] snapshot of this composition for fast repeated value reads.
    ///
    /// Equivalent to [`FastComposition::from`]; the cost is roughly one full [`get`](Self::get)
    /// sweep, so prefer it where a composition is read many times.
    #[must_use]
    pub fn to_fast(&self) -> FastComposition {
        FastComposition::from(self)
    }
}

#[cfg(test)]
#[cfg_attr(coverage, coverage(off))]
mod tests {
    use crate::tests::asserts::shadow_asserts::assert_eq;
    use crate::tests::asserts::*;

    use super::*;

    use crate::tests::assets::COMP_3_25_MILK_SEALTEST as SAMPLE_COMP;

    /// `FastComposition` indexes by `key as usize`, sound only if discriminants are the dense range
    /// `0..COUNT` in iter order. Guards against corruption from a future reorder or explicit =val.
    #[test]
    fn comp_key_discriminants_are_contiguous() {
        assert_eq!(CompKey::COUNT, CompKey::iter().count());
        for (index, key) in CompKey::iter().enumerate() {
            assert_eq!(key as usize, index);
        }
    }

    #[test]
    fn fast_get_matches_composition_for_every_comp_key() {
        for comp in [Composition::new(), *SAMPLE_COMP] {
            let fast = comp.to_fast();
            for key in CompKey::iter() {
                assert_eq_flt_test!(fast.get(key), comp.get(key));
            }
        }
    }

    #[test]
    fn fast_get_ratio_matches_composition_for_every_ratio_key() {
        for comp in [Composition::new(), *SAMPLE_COMP] {
            let fast = comp.to_fast();
            for key in RatioKey::iter() {
                let (fast_ratio, comp_ratio) = (fast.get_ratio(key), comp.get_ratio(key));
                if comp_ratio.is_nan() {
                    assert_true!(fast_ratio.is_nan());
                } else {
                    assert_eq_flt_test!(fast_ratio, comp_ratio);
                }
            }
        }
    }
}

//! Per-source protein breakdowns and the [`ProteinComponents`] trait that unifies them.
//!
//! Each solid source carries the protein subcomponents that can only originate from it — milk into
//! casein and whey, egg into white and yolk — while cocoa, nut, and other solids track only a
//! total. Unlike [`Sugars`], where one shared type is correct because any sugar can come from any
//! source, these subcomponents are source-bound, so each source gets its own protein type and
//! [`SolidsBreakdown`] is generic over it.

use approx::AbsDiffEq;
use serde::{Deserialize, Serialize};
use struct_iterable::Iterable;

use crate::{
    composition::ScaleComponents,
    composition::field_update::field_update_methods,
    error::Result,
    util::{collect_fields_copied_as, iter_all_abs_diff_eq},
    validate::{Validate, verify_are_positive, verify_is_within_100_percent},
};

#[cfg(doc)]
use crate::{
    composition::{Fats, Solids, SolidsBreakdown, Sugars},
    constants::composition::{STD_CASEIN_PROTEIN_IN_MSNF_PROTEIN, STD_WHEY_PROTEIN_IN_MSNF_PROTEIN},
};

/// Protein breakdown for a single solid source, e.g. [`MilkProteins`], [`EggProteins`].
///
/// Each source's protein type is fixed by [`Solids`] rather than shared, because the subcomponents
/// are source-bound: casein and whey only come from dairy, egg white and yolk proteins only from
/// eggs. This trait unifies the per-source types so [`SolidsBreakdown`] can be generic over the
/// protein breakdown while still scaling, adding, validating, and reporting a total uniformly.
///
/// Subcomponents are additive (disjoint, unlike the overlapping subsets of [`Fats`]), so
/// [`total`](Self::total) is simply their sum.
pub trait ProteinComponents: ScaleComponents + Validate + AbsDiffEq<Epsilon = f64> + Copy + Default {
    /// The empty (all-zero) breakdown; the additive identity used when scaling and combining mixes.
    const EMPTY: Self;

    /// Total protein content, as grams of protein per 100g of ingredient/mix.
    fn total(&self) -> f64;
}

/// Protein breakdown of dairy/milk solids, split into casein and whey
///
/// Milk protein is roughly 80% casein and 20% whey, although concentrates and isolates can vary;
/// see [`STD_CASEIN_PROTEIN_IN_MSNF_PROTEIN`] and [`STD_WHEY_PROTEIN_IN_MSNF_PROTEIN`].
#[derive(Iterable, PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(default, deny_unknown_fields)]
pub struct MilkProteins {
    /// Casein protein content
    pub casein: f64,
    /// Whey protein content
    pub whey: f64,
}

impl MilkProteins {
    /// Creates an empty [`MilkProteins`] with all fields set to zero
    #[must_use]
    pub const fn empty() -> Self {
        Self { casein: 0.0, whey: 0.0 }
    }

    /// Creates a new empty `MilkProteins`, forwards to [`empty`](Self::empty)
    #[must_use]
    pub const fn new() -> Self {
        Self::empty()
    }

    field_update_methods! {
        casein: f64,
        whey: f64,
    }
}

impl ProteinComponents for MilkProteins {
    const EMPTY: Self = Self::empty();

    fn total(&self) -> f64 {
        self.casein + self.whey
    }
}

impl Validate for MilkProteins {
    fn validate(&self) -> Result<()> {
        verify_are_positive(&collect_fields_copied_as(self))?;
        verify_is_within_100_percent(self.total())?;
        Ok(())
    }
}

impl ScaleComponents for MilkProteins {
    fn scale(&self, factor: f64) -> Self {
        Self {
            casein: self.casein * factor,
            whey: self.whey * factor,
        }
    }

    fn add(&self, other: &Self) -> Self {
        Self {
            casein: self.casein + other.casein,
            whey: self.whey + other.whey,
        }
    }
}

impl AbsDiffEq for MilkProteins {
    type Epsilon = f64;

    fn default_epsilon() -> Self::Epsilon {
        f64::default_epsilon()
    }

    fn abs_diff_eq(&self, other: &Self, epsilon: Self::Epsilon) -> bool {
        iter_all_abs_diff_eq::<f64, f64, Self>(self, other, epsilon)
    }
}

impl Default for MilkProteins {
    fn default() -> Self {
        Self::empty()
    }
}

/// Protein breakdown of egg solids, split into egg white and egg yolk proteins
///
/// Egg white and yolk proteins differ markedly in their functional properties.
#[derive(Iterable, PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(default, deny_unknown_fields)]
pub struct EggProteins {
    /// Egg white (albumen) protein content
    pub white: f64,
    /// Egg yolk protein content
    pub yolk: f64,
}

impl EggProteins {
    /// Creates an empty [`EggProteins`] with all fields set to zero
    #[must_use]
    pub const fn empty() -> Self {
        Self { white: 0.0, yolk: 0.0 }
    }

    /// Creates a new empty `EggProteins`, forwards to [`empty`](Self::empty)
    #[must_use]
    pub const fn new() -> Self {
        Self::empty()
    }

    field_update_methods! {
        white: f64,
        yolk: f64,
    }
}

impl ProteinComponents for EggProteins {
    const EMPTY: Self = Self::empty();

    fn total(&self) -> f64 {
        self.white + self.yolk
    }
}

impl Validate for EggProteins {
    fn validate(&self) -> Result<()> {
        verify_are_positive(&collect_fields_copied_as(self))?;
        verify_is_within_100_percent(self.total())?;
        Ok(())
    }
}

impl ScaleComponents for EggProteins {
    fn scale(&self, factor: f64) -> Self {
        Self {
            white: self.white * factor,
            yolk: self.yolk * factor,
        }
    }

    fn add(&self, other: &Self) -> Self {
        Self {
            white: self.white + other.white,
            yolk: self.yolk + other.yolk,
        }
    }
}

impl AbsDiffEq for EggProteins {
    type Epsilon = f64;

    fn default_epsilon() -> Self::Epsilon {
        f64::default_epsilon()
    }

    fn abs_diff_eq(&self, other: &Self, epsilon: Self::Epsilon) -> bool {
        iter_all_abs_diff_eq::<f64, f64, Self>(self, other, epsilon)
    }
}

impl Default for EggProteins {
    fn default() -> Self {
        Self::empty()
    }
}

/// Protein content of a source with no finer breakdown, e.g. cocoa, nut, and other solids
///
/// This is also the protein type produced by [`Solids::all`] when proteins from different sources
/// are aggregated, where only the combined total is meaningful.
#[derive(Iterable, PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(default, deny_unknown_fields)]
pub struct SimpleProteins {
    /// Total protein content
    pub total: f64,
}

impl SimpleProteins {
    /// Creates an empty [`SimpleProteins`] with zero protein
    #[must_use]
    pub const fn empty() -> Self {
        Self { total: 0.0 }
    }

    /// Creates a new empty [`SimpleProteins`], forwards to [`empty`](Self::empty)
    #[must_use]
    pub const fn new() -> Self {
        Self::empty()
    }

    /// Creates a [`SimpleProteins`] with the given total protein content
    #[must_use]
    pub const fn from_total(total: f64) -> Self {
        Self { total }
    }
}

impl ProteinComponents for SimpleProteins {
    const EMPTY: Self = Self::empty();

    fn total(&self) -> f64 {
        self.total
    }
}

impl Validate for SimpleProteins {
    fn validate(&self) -> Result<()> {
        verify_are_positive(&[self.total])?;
        verify_is_within_100_percent(self.total)?;
        Ok(())
    }
}

impl ScaleComponents for SimpleProteins {
    fn scale(&self, factor: f64) -> Self {
        Self {
            total: self.total * factor,
        }
    }

    fn add(&self, other: &Self) -> Self {
        Self {
            total: self.total + other.total,
        }
    }
}

impl AbsDiffEq for SimpleProteins {
    type Epsilon = f64;

    fn default_epsilon() -> Self::Epsilon {
        f64::default_epsilon()
    }

    fn abs_diff_eq(&self, other: &Self, epsilon: Self::Epsilon) -> bool {
        self.total.abs_diff_eq(&other.total, epsilon)
    }
}

impl Default for SimpleProteins {
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

    use super::*;
    use crate::error::Error;

    // --- MilkProteins ---

    #[test]
    fn milk_proteins_field_count() {
        assert_eq!(MilkProteins::new().iter().count(), 2);
    }

    #[test]
    fn milk_proteins_empty_and_default() {
        let m = MilkProteins::empty();
        assert_eq!(m, MilkProteins::new());
        assert_eq!(m, MilkProteins::default());
        assert_eq!(m, MilkProteins::EMPTY);
        assert_eq!(m.casein, 0.0);
        assert_eq!(m.whey, 0.0);
        assert_eq!(m.total(), 0.0);
    }

    #[test]
    fn milk_proteins_field_update_and_total() {
        let m = MilkProteins::new().casein(2.4).whey(0.6);
        assert_eq!(m.casein, 2.4);
        assert_eq!(m.whey, 0.6);
        assert_eq!(m.total(), 3.0);
    }

    #[test]
    fn milk_proteins_scale_and_add() {
        let m = MilkProteins::new().casein(2.4).whey(0.6);
        let scaled = m.scale(0.5);
        assert_eq!(scaled, MilkProteins::new().casein(1.2).whey(0.3));

        let sum = m.add(&MilkProteins::new().casein(1.0).whey(1.0));
        assert_eq!(sum, MilkProteins::new().casein(3.4).whey(1.6));
    }

    #[test]
    fn milk_proteins_abs_diff_eq() {
        let a = MilkProteins::new().casein(2.4).whey(0.6);
        let mut b = a;
        assert_abs_diff_eq!(a, b);
        b.whey += 1e-10;
        assert_abs_diff_ne!(a, b);
    }

    #[test]
    fn milk_proteins_validate() {
        assert!(MilkProteins::new().casein(2.0).whey(0.5).validate().is_ok());
        assert!(matches!(MilkProteins::new().casein(-1.0).validate(), Err(Error::CompositionNotPositive(_))));
        assert!(matches!(
            MilkProteins::new().casein(80.0).whey(21.0).validate(),
            Err(Error::CompositionNotWithin100Percent(_))
        ));
    }

    // --- EggProteins ---

    #[test]
    fn egg_proteins_field_count() {
        assert_eq!(EggProteins::new().iter().count(), 2);
    }

    #[test]
    fn egg_proteins_empty_and_default() {
        let e = EggProteins::empty();
        assert_eq!(e, EggProteins::new());
        assert_eq!(e, EggProteins::default());
        assert_eq!(e, EggProteins::EMPTY);
        assert_eq!(e.total(), 0.0);
    }

    #[test]
    fn egg_proteins_field_update_and_total() {
        let e = EggProteins::new().white(1.0).yolk(2.0);
        assert_eq!(e.white, 1.0);
        assert_eq!(e.yolk, 2.0);
        assert_eq!(e.total(), 3.0);
    }

    #[test]
    fn egg_proteins_scale_and_add() {
        let e = EggProteins::new().white(1.0).yolk(2.0);
        assert_eq!(e.scale(0.5), EggProteins::new().white(0.5).yolk(1.0));
        let sum = e.add(&EggProteins::new().white(1.0).yolk(1.0));
        assert_eq!(sum, EggProteins::new().white(2.0).yolk(3.0));
    }

    #[test]
    fn egg_proteins_abs_diff_eq() {
        let a = EggProteins::new().white(1.0).yolk(2.0);
        let mut b = a;
        assert_abs_diff_eq!(a, b);
        b.yolk += 1e-10;
        assert_abs_diff_ne!(a, b);
    }

    #[test]
    fn egg_proteins_validate() {
        assert!(EggProteins::new().white(1.0).yolk(2.0).validate().is_ok());
        assert!(matches!(EggProteins::new().yolk(-1.0).validate(), Err(Error::CompositionNotPositive(_))));
        assert!(matches!(
            EggProteins::new().white(60.0).yolk(41.0).validate(),
            Err(Error::CompositionNotWithin100Percent(_))
        ));
    }

    // --- SimpleProteins ---

    #[test]
    fn simple_proteins_field_count() {
        assert_eq!(SimpleProteins::new().iter().count(), 1);
    }

    #[test]
    fn simple_proteins_empty_and_from_total() {
        let s = SimpleProteins::empty();
        assert_eq!(s, SimpleProteins::new());
        assert_eq!(s, SimpleProteins::default());
        assert_eq!(s, SimpleProteins::EMPTY);
        assert_eq!(s.total(), 0.0);

        let s = SimpleProteins::from_total(4.0);
        assert_eq!(s.total, 4.0);
        assert_eq!(s.total(), 4.0);
    }

    #[test]
    fn simple_proteins_scale_add_abs_diff_eq() {
        let s = SimpleProteins::from_total(4.0);
        assert_eq!(s.scale(0.25), SimpleProteins::from_total(1.0));
        assert_eq!(s.add(&SimpleProteins::from_total(2.0)), SimpleProteins::from_total(6.0));

        let mut t = s;
        assert_abs_diff_eq!(s, t);
        t.total += 1e-10;
        assert_abs_diff_ne!(s, t);
    }

    #[test]
    fn simple_proteins_validate() {
        assert!(SimpleProteins::from_total(5.0).validate().is_ok());
        assert!(matches!(SimpleProteins::from_total(-1.0).validate(), Err(Error::CompositionNotPositive(_))));
        assert!(matches!(
            SimpleProteins::from_total(101.0).validate(),
            Err(Error::CompositionNotWithin100Percent(_))
        ));
    }
}

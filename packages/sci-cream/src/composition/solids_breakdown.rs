//! [`SolidsBreakdown`] and associated functionality to represent the breakdown of solid components
//! of an ingredient or mix, with regards to nutrition and ice cream science

use approx::AbsDiffEq;
use serde::{Deserialize, Serialize};

use crate::{
    composition::field_update::field_update_methods,
    composition::{ArtificialSweeteners, Carbohydrates, Fats, ProteinComponents, ScaleComponents, SimpleProteins},
    constants,
    error::{Error, Result},
    validate::{Validate, verify_are_positive, verify_is_within_100_percent},
};

#[cfg(doc)]
use crate::composition::{EggProteins, MilkProteins, Solids};

/// Breakdown of solid components, as grams of component per 100g of ingredient/mix
///
/// This breakdown reflects the standard nutrition facts labelling; for most ingredients with a
/// nutrition facts label, these values can be directly taken from the label. Internally these
/// structs provide an interface to infer breakdowns relevant for ice cream science, e.g. solids
/// non-fat (SNF), solids non-fat non-sugar (SNFS), etc. The following relationships hold:
///
/// `total() >= fats + carbohydrates + proteins.total() + artificial_sweeteners`
/// `snf() == total() - fats`
/// `snfs() == snf() - carbohydrates.sugars`
///
/// Note that the values here are expressed as grams per 100g of _total_ ingredient/mix, not as a
/// percentage of a particular ingredient's solids, i.e. it describes this ingredient's contribution
/// to the total mix, taking into account its proportion in the mix. For example, a 50g:50g
/// 2% milk:water mix would have `milk.fats == 1`, in spite of the milk ingredient being 2% fat.
///
/// The breakdown is generic over its [`proteins`](Self::proteins) type `P`, fixed per source by
/// [`Solids`]: milk uses [`MilkProteins`], egg uses [`EggProteins`], and cocoa/nut/other use
/// [`SimpleProteins`]. See [`ProteinComponents`] for why each source has its own protein type.
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(default, deny_unknown_fields)]
pub struct SolidsBreakdown<P: ProteinComponents> {
    /// Breakdown of fat components, including total, saturated, and trans
    pub fats: Fats,
    /// Detailed carbohydrate composition, including sugars, fibers, polyols, and others
    pub carbohydrates: Carbohydrates,
    /// Protein content for this source, broken down by its source-specific subcomponents
    pub proteins: P,
    /// Breakdown of artificial sweetener components, including total and specific sweeteners
    pub artificial_sweeteners: ArtificialSweeteners,
    /// Other components not included in the above categories
    pub others: f64,
}

impl<P: ProteinComponents> SolidsBreakdown<P> {
    /// Creates an empty [`SolidsBreakdown`] with all fields set to zero or `empty()`
    #[must_use]
    pub const fn empty() -> Self {
        Self {
            fats: Fats::empty(),
            carbohydrates: Carbohydrates::empty(),
            proteins: P::EMPTY,
            artificial_sweeteners: ArtificialSweeteners::empty(),
            others: 0.0,
        }
    }

    /// Creates a new empty `SolidsBreakdown` struct, forwards to [`empty`](Self::empty)
    #[must_use]
    pub const fn new() -> Self {
        Self::empty()
    }

    field_update_methods! {
        fats: Fats,
        carbohydrates: Carbohydrates,
        proteins: P,
        artificial_sweeteners: ArtificialSweeteners,
        others: f64,
    }

    /// Sets `others = total - (fats + carbohydrates + proteins + artificial_sweeteners)`
    ///
    /// # Errors
    ///
    /// Returns an [`Error::InvalidComposition`] if `total < fats + carbohydrates + proteins +
    /// artificial_sweeteners`; this should only be called once all other components have been set.
    pub fn others_from_total(&self, total: f64) -> Result<Self> {
        if (self.total() - self.others) > total {
            return Err(Error::InvalidComposition(format!(
                "Cannot set others from total: total {} is less than sum of other components {}",
                total,
                self.total() - self.others
            )));
        }

        Ok(Self {
            others: total - (self.total() - self.others),
            ..*self
        })
    }

    /// Calculates the total solids content, by summing the solids content from all components
    #[must_use]
    pub fn total(&self) -> f64 {
        self.fats.total
            + self.carbohydrates.total()
            + self.proteins.total()
            + self.artificial_sweeteners.total()
            + self.others
    }

    /// Converts to a [`SolidsBreakdown<SimpleProteins>`], reducing the source-specific protein
    /// breakdown to its total. Used by [`Solids::all`] to aggregate breakdowns across sources.
    #[must_use]
    pub fn to_simple(&self) -> SolidsBreakdown<SimpleProteins> {
        SolidsBreakdown {
            fats: self.fats,
            carbohydrates: self.carbohydrates,
            proteins: SimpleProteins::from_total(self.proteins.total()),
            artificial_sweeteners: self.artificial_sweeteners,
            others: self.others,
        }
    }

    /// Calculates the total solids non-fat (SNF) content, by subtracting the total fat content from
    /// the total solids content, i.e. `total() - fats.total`
    #[must_use]
    pub fn snf(&self) -> f64 {
        self.total() - self.fats.total
    }

    /// Calculates the total solids non-fat non-sugar (SNFS) content, by subtracting the total sugar
    /// content from the SNF content, i.e. `snf() - carbohydrates.sugars.total()`
    ///
    /// **Note**: Largely due to convention, [`polyols`](Carbohydrates::polyols) and
    /// [`artificial_sweeteners`](Self::artificial_sweeteners) are not subtracted here.
    #[must_use]
    pub fn snfs(&self) -> f64 {
        self.snf() - self.carbohydrates.sugars.total()
    }

    /// Calculates the total energy contributed by the solids, in kcal per 100g of mix
    ///
    /// **Note**: This method intentionally omits the [`others`](Self::others) field, since the
    /// specific solid compounds and their energy contributions are unknown. This should be
    /// inconsequential in most practical circumstances, since the vast majority of solid components
    /// with energy contributions should fit into the known categories. As such, the accuracy of
    /// overall energy calculations depends on the quality of the ingredient definitions. Returning
    /// an error here would be impractical, since the `others` field is rarely expected to be zero,
    /// although it is expected to almost always be a small fraction of the total solids content.
    ///
    /// # Errors
    ///
    /// Returns an [`Error::CannotComputeEnergy`] if energy calculations fail for any of the
    /// components, e.g. due to the presence of "other" polyols with unknown energy contributions.
    pub fn energy(&self) -> Result<f64> {
        // `others` is intentionally omitted; see docs above
        Ok(self.fats.energy()
            + self.carbohydrates.energy()?
            + (self.proteins.total() * constants::energy::PROTEINS)
            + self.artificial_sweeteners.energy()?)
    }
}

impl<P: ProteinComponents> Validate for SolidsBreakdown<P> {
    fn validate(&self) -> Result<()> {
        self.fats.validate()?;
        self.carbohydrates.validate()?;
        self.proteins.validate()?;
        self.artificial_sweeteners.validate()?;
        verify_are_positive(&[self.others])?;
        verify_is_within_100_percent(self.total())?;
        Ok(())
    }
}

impl<P: ProteinComponents> ScaleComponents for SolidsBreakdown<P> {
    fn scale(&self, factor: f64) -> Self {
        Self {
            fats: self.fats.scale(factor),
            carbohydrates: self.carbohydrates.scale(factor),
            proteins: self.proteins.scale(factor),
            artificial_sweeteners: self.artificial_sweeteners.scale(factor),
            others: self.others * factor,
        }
    }

    fn add(&self, other: &Self) -> Self {
        Self {
            fats: self.fats.add(&other.fats),
            carbohydrates: self.carbohydrates.add(&other.carbohydrates),
            proteins: self.proteins.add(&other.proteins),
            artificial_sweeteners: self.artificial_sweeteners.add(&other.artificial_sweeteners),
            others: self.others + other.others,
        }
    }
}

impl<P: ProteinComponents> AbsDiffEq for SolidsBreakdown<P> {
    type Epsilon = f64;

    fn default_epsilon() -> Self::Epsilon {
        f64::default_epsilon()
    }

    fn abs_diff_eq(&self, other: &Self, epsilon: Self::Epsilon) -> bool {
        self.fats.abs_diff_eq(&other.fats, epsilon)
            && self.carbohydrates.abs_diff_eq(&other.carbohydrates, epsilon)
            && self.proteins.abs_diff_eq(&other.proteins, epsilon)
            && self
                .artificial_sweeteners
                .abs_diff_eq(&other.artificial_sweeteners, epsilon)
            && self.others.abs_diff_eq(&other.others, epsilon)
    }
}

impl<P: ProteinComponents> Default for SolidsBreakdown<P> {
    fn default() -> Self {
        Self::empty()
    }
}

#[cfg(test)]
#[cfg_attr(coverage, coverage(off))]
#[allow(clippy::unwrap_used, clippy::float_cmp)]
mod tests {
    use std::any::Any;

    use crate::tests::asserts::shadow_asserts::{assert_eq, assert_ne};
    use crate::tests::asserts::*;

    use super::*;
    use crate::{composition::*, error::Error};

    // The breakdown is generic; these tests exercise the generic plumbing with `SimpleProteins`.
    // Per-source protein behaviour (casein/whey, white/yolk) is tested in `composition::proteins`.
    type Sb = SolidsBreakdown<SimpleProteins>;

    fn proteins(total: f64) -> SimpleProteins {
        SimpleProteins::from_total(total)
    }

    const FIELD_MODIFIERS: [fn(&mut Sb, f64); 5] = [
        |s, ec| s.fats.total += ec,
        |s, ec| s.carbohydrates.sugars.sucrose += ec,
        |s, ec| s.proteins.total += ec,
        |s, ec| s.artificial_sweeteners.aspartame += ec,
        |s, ec| s.others += ec,
    ];

    #[test]
    fn field_modifiers_cover_every_field() {
        let SolidsBreakdown {
            fats,
            carbohydrates,
            proteins,
            artificial_sweeteners,
            others,
        } = &Sb::empty();

        let fields: [&dyn Any; 5] = [fats, carbohydrates, proteins, artificial_sweeteners, others];
        assert_eq!(fields.len(), FIELD_MODIFIERS.len());
    }

    #[test]
    fn solids_breakdown_empty() {
        let s = Sb::empty();
        assert_eq!(s, Sb::new());
        assert_eq!(s, Sb::default());

        assert_eq!(s.fats, Fats::empty());
        assert_eq!(s.carbohydrates, Carbohydrates::empty());
        assert_eq!(s.proteins, SimpleProteins::empty());
        assert_eq!(s.artificial_sweeteners, ArtificialSweeteners::empty());
        assert_eq!(s.others, 0.0);

        assert_eq!(s.total(), 0.0);
        assert_eq!(s.snf(), 0.0);
        assert_eq!(s.snfs(), 0.0);
        assert_eq!(s.energy().unwrap(), 0.0);
    }

    #[test]
    fn solids_breakdown_field_update_methods() {
        let s = Sb::new()
            .fats(Fats::new().total(5.0))
            .carbohydrates(Carbohydrates::new().sugars(Sugars::new().sucrose(3.0)))
            .proteins(proteins(2.0))
            .artificial_sweeteners(ArtificialSweeteners::new().aspartame(1.0))
            .others(4.0);

        assert_eq!(s.fats, Fats::new().total(5.0));
        assert_eq!(s.carbohydrates, Carbohydrates::new().sugars(Sugars::new().sucrose(3.0)));
        assert_eq!(s.proteins, proteins(2.0));
        assert_eq!(s.artificial_sweeteners, ArtificialSweeteners::new().aspartame(1.0));
        assert_eq!(s.others, 4.0);
    }

    #[test]
    fn solids_breakdown_others_from_total() {
        let s = Sb::new()
            .fats(Fats::new().total(5.0))
            .carbohydrates(Carbohydrates::new().sugars(Sugars::new().sucrose(3.0)))
            .proteins(proteins(2.0));
        assert_eq!(s.total(), 10.0);

        let s_with_others = s.others_from_total(12.0).unwrap();
        assert_eq!(s_with_others.others, 2.0);
        assert_eq!(s_with_others.total(), 12.0);
    }

    #[test]
    fn solids_breakdown_others_from_total_override() {
        let s = Sb::new().fats(Fats::new().total(10.0)).others(5.0);
        assert_eq!(s.others, 5.0);
        assert_eq!(s.total(), 15.0);

        let s_with_others = s.others_from_total(12.0).unwrap();
        assert_eq!(s_with_others.others, 2.0);
        assert_eq!(s_with_others.total(), 12.0);
    }

    #[test]
    fn solids_breakdown_others_from_total_error() {
        let s = Sb::new().fats(Fats::new().total(10.0));
        assert!(matches!(s.others_from_total(9.0), Err(Error::InvalidComposition(_))));
    }

    #[test]
    fn solids_breakdown_total() {
        let s = Sb::new()
            .fats(Fats::new().total(5.0))
            .carbohydrates(Carbohydrates::new().sugars(Sugars::new().sucrose(3.0)))
            .proteins(proteins(2.0))
            .artificial_sweeteners(ArtificialSweeteners::new().aspartame(1.0))
            .others(4.0);

        assert_eq!(s.total(), 15.0);
    }

    #[test]
    fn solids_breakdown_to_simple() {
        // A milk breakdown collapses its casein/whey split to a plain protein total.
        let milk = SolidsBreakdown::<MilkProteins>::new()
            .fats(Fats::new().total(4.0))
            .proteins(MilkProteins::new().casein(2.4).whey(0.6))
            .others(1.0);
        let simple = milk.to_simple();

        assert_eq!(simple.proteins, SimpleProteins::from_total(3.0));
        assert_eq!(simple.fats, milk.fats);
        assert_eq!(simple.others, milk.others);
        assert_eq!(simple.total(), milk.total());
    }

    #[test]
    fn solids_breakdown_snf() {
        let s = Sb::new()
            .fats(Fats::new().total(5.0).saturated(2.0))
            .carbohydrates(Carbohydrates::new().sugars(Sugars::new().sucrose(3.0)))
            .proteins(proteins(2.0))
            .others(1.0);
        assert_eq!(s.total(), 11.0);
        assert_eq!(s.fats.total, 5.0);

        assert_eq!(s.snf(), s.total() - s.fats.total);
        assert_eq!(s.snf(), 6.0);
    }

    #[test]
    fn solids_breakdown_snfs() {
        let s = Sb::new()
            .fats(Fats::new().total(7.0))
            .carbohydrates(
                Carbohydrates::new()
                    .sugars(Sugars::new().sucrose(6.0))
                    .polyols(Polyols::new().sorbitol(5.0))
                    .others(4.0),
            )
            .artificial_sweeteners(ArtificialSweeteners::new().aspartame(3.0))
            .proteins(proteins(2.0))
            .others(1.0);
        assert_eq!(s.total(), 28.0);
        assert_eq!(s.fats.total, 7.0);
        assert_eq!(s.snf(), 21.0);
        assert_eq!(s.carbohydrates.sugars.total(), 6.0);

        assert_eq!(s.snfs(), s.snf() - s.carbohydrates.sugars.total());
        assert_eq!(s.snfs(), 15.0);
    }

    #[test]
    fn solids_breakdown_energy() {
        let fats = Fats::new().total(5.0);
        let carbohydrates = Carbohydrates::new().sugars(Sugars::new().sucrose(3.0));
        let artificial_sweeteners = ArtificialSweeteners::new().aspartame(1.0);
        assert_ne!(fats.energy(), 0.0);
        assert_ne!(carbohydrates.energy().unwrap(), 0.0);
        assert_ne!(artificial_sweeteners.energy().unwrap(), 0.0);

        let s = Sb::new()
            .fats(fats)
            .carbohydrates(carbohydrates)
            .proteins(proteins(2.0))
            .artificial_sweeteners(artificial_sweeteners)
            .others(100.0); // `others` is intentionally omitted from energy

        assert_eq!(
            s.energy().unwrap(),
            fats.energy()
                + carbohydrates.energy().unwrap()
                + 2.0 * 4.0 /* proteins */
                + artificial_sweeteners.energy().unwrap()
        );
        assert_eq!(s.energy().unwrap(), 69.0);
    }

    #[test]
    fn solids_breakdown_energy_error() {
        assert!(matches!(
            Sb::new()
                .carbohydrates(Carbohydrates::new().polyols(Polyols::new().other(1.0)))
                .energy(),
            Err(Error::CannotComputeEnergy(_))
        ));
        assert!(matches!(
            Sb::new()
                .artificial_sweeteners(ArtificialSweeteners::new().other(1.0))
                .energy(),
            Err(Error::CannotComputeEnergy(_))
        ));
    }

    #[test]
    fn solids_breakdown_scale() {
        let s = Sb::new()
            .fats(Fats::new().total(4.0))
            .carbohydrates(Carbohydrates::new().sugars(Sugars::new().sucrose(6.0)))
            .proteins(proteins(2.0))
            .artificial_sweeteners(ArtificialSweeteners::new().aspartame(2.0))
            .others(2.0);
        assert_eq!(s.total(), 16.0);

        let scaled = s.scale(0.5);
        assert_eq!(scaled.fats, Fats::new().total(2.0));
        assert_eq!(scaled.carbohydrates, Carbohydrates::new().sugars(Sugars::new().sucrose(3.0)));
        assert_eq!(scaled.proteins, proteins(1.0));
        assert_eq!(scaled.artificial_sweeteners, ArtificialSweeteners::new().aspartame(1.0));
        assert_eq!(scaled.others, 1.0);
        assert_eq!(scaled.total(), 8.0);
    }

    #[test]
    fn solids_breakdown_add() {
        let a = Sb::new()
            .fats(Fats::new().total(5.0))
            .carbohydrates(Carbohydrates::new().sugars(Sugars::new().sucrose(4.0)))
            .proteins(proteins(3.0))
            .artificial_sweeteners(ArtificialSweeteners::new().aspartame(2.0))
            .others(1.0);
        let b = Sb::new()
            .fats(Fats::new().total(2.5))
            .carbohydrates(Carbohydrates::new().sugars(Sugars::new().glucose(2.0)))
            .proteins(proteins(1.5))
            .artificial_sweeteners(ArtificialSweeteners::new().sucralose(1.0))
            .others(0.5);
        assert_eq!(a.total(), 15.0);
        assert_eq!(b.total(), 7.5);

        let sum = a.add(&b);
        assert_eq!(sum.fats, Fats::new().total(7.5));
        assert_eq!(sum.carbohydrates, Carbohydrates::new().sugars(Sugars::new().sucrose(4.0).glucose(2.0)));
        assert_eq!(sum.proteins, proteins(4.5));
        assert_eq!(sum.artificial_sweeteners, ArtificialSweeteners::new().aspartame(2.0).sucralose(1.0));
        assert_eq!(sum.others, 1.5);
        assert_eq!(sum.total(), a.total() + b.total());
        assert_eq!(sum.total(), 22.5);
    }

    #[test]
    fn solids_breakdown_abs_diff_eq() {
        let a = Sb::new()
            .fats(Fats::new().total(4.0))
            .carbohydrates(Carbohydrates::new().sugars(Sugars::new().sucrose(6.0)))
            .proteins(proteins(2.0))
            .artificial_sweeteners(ArtificialSweeteners::new().aspartame(1.0))
            .others(1.0);
        let b = a;
        let mut c = b;

        for v in [a, b, c] {
            assert_ne!(v.fats.total, 0.0);
            assert_ne!(v.carbohydrates.total(), 0.0);
            assert_ne!(v.proteins.total(), 0.0);
            assert_ne!(v.artificial_sweeteners.total(), 0.0);
            assert_ne!(v.others, 0.0);
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
        assert!(Sb::empty().validate().is_ok());
    }

    #[test]
    fn validate_ok_for_valid_values() {
        let s = Sb::new()
            .fats(Fats::new().total(10.0))
            .carbohydrates(Carbohydrates::new().sugars(Sugars::new().sucrose(20.0)))
            .proteins(proteins(5.0))
            .artificial_sweeteners(ArtificialSweeteners::new().aspartame(3.0))
            .others(2.0);
        assert!(s.validate().is_ok());
    }

    #[test]
    fn validate_err_for_each_negative_field() {
        for field_modifier in FIELD_MODIFIERS {
            let mut s = Sb::empty();
            field_modifier(&mut s, -1.0);
            assert!(matches!(s.validate(), Err(Error::CompositionNotPositive(_))));
        }
    }

    #[test]
    fn validate_err_when_total_exceeds_100() {
        let s = Sb::new().fats(Fats::new().total(70.0)).proteins(proteins(31.0));
        assert!(matches!(s.validate(), Err(Error::CompositionNotWithin100Percent(_))));
    }

    #[test]
    fn validate_into_returns_self_when_valid() {
        let s = Sb::new().proteins(proteins(5.0));
        let result = s.validate_into();
        assert!(result.is_ok());
        assert_eq!(result.unwrap().proteins, proteins(5.0));
    }

    #[test]
    fn validate_into_returns_err_when_invalid() {
        let s = Sb::new().proteins(proteins(-1.0));
        assert!(s.validate_into().is_err());
    }
}

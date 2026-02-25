//! [`SolidsBreakdown`] and associated functionality to represent the breakdown of solid components
//! of an ingredient or mix, with regards to nutrition and ice cream science

use approx::AbsDiffEq;
use serde::{Deserialize, Serialize};
use struct_iterable::Iterable;

use crate::{
    composition::{ArtificialSweeteners, Carbohydrates, Fats, ScaleComponents},
    constants,
    error::{Error, Result},
};

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

/// Breakdown of solid components, as grams of component per 100g of ingredient/mix
///
/// This breakdown reflects the standard nutrition facts labelling; for most ingredients with a
/// nutrition facts label, these values can be directly taken from the label. Internally these
/// structs provide an interface to infer breakdowns relevant for ice cream science, e.g. solids
/// non-fat (SNF), solids non-fat non-sugar (SNFS), etc. The following relationships hold:
///
/// `total() >= fats + carbohydrates + proteins + artificial_sweeteners`
/// `snf() == total() - fats`
/// `snfs() == snf() - carbohydrates.sugars`
///
/// Note that the values here are expressed as grams per 100g of _total_ ingredient/mix, not as a
/// percentage of a particular ingredient's solids, i.e. it describes this ingredient's contribution
/// to the total mix, taking into account its proportion in the mix. For example, a 50g:50g
/// 2% milk:water mix would have `milk.fats == 1`, in spite of the milk ingredient being 2% fat.
#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Iterable, PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(default, deny_unknown_fields)]
pub struct SolidsBreakdown {
    /// Breakdown of fat components, including total, saturated, and trans
    pub fats: Fats,
    /// Detailed carbohydrate composition, including sugars, fibers, polyols, and others
    pub carbohydrates: Carbohydrates,
    /// Protein content, as grams of protein per 100g of total ingredient/mix
    pub proteins: f64,
    /// Breakdown of artificial sweetener components, including total and specific sweeteners
    pub artificial_sweeteners: ArtificialSweeteners,
    /// Other components not included in the above categories
    pub others: f64,
}

impl SolidsBreakdown {
    /// Creates an empty [`SolidsBreakdown`] with all fields set to zero or `empty()`
    #[must_use]
    pub fn empty() -> Self {
        Self {
            fats: Fats::empty(),
            carbohydrates: Carbohydrates::empty(),
            proteins: 0.0,
            artificial_sweeteners: ArtificialSweeteners::empty(),
            others: 0.0,
        }
    }

    /// Field-update method for [`fats`](Self::fats)
    #[must_use]
    pub fn fats(self, fats: Fats) -> Self {
        Self { fats, ..self }
    }

    /// Field-update method for [`carbohydrates`](Self::carbohydrates)
    #[must_use]
    pub fn carbohydrates(self, carbohydrates: Carbohydrates) -> Self {
        Self { carbohydrates, ..self }
    }

    /// Field-update method for [`proteins`](Self::proteins)
    #[must_use]
    pub fn proteins(self, proteins: f64) -> Self {
        Self { proteins, ..self }
    }

    /// Field-update method for [`artificial_sweeteners`](Self::artificial_sweeteners)
    #[must_use]
    pub fn artificial_sweeteners(self, artificial_sweeteners: ArtificialSweeteners) -> Self {
        Self {
            artificial_sweeteners,
            ..self
        }
    }

    /// Field-update method for [`others`](Self::others)
    #[must_use]
    pub fn others(self, others: f64) -> Self {
        Self { others, ..self }
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
            + (self.proteins * constants::energy::PROTEINS)
            + self.artificial_sweeteners.energy()?)
    }
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
impl SolidsBreakdown {
    /// Creates a new empty `SolidsBreakdown` struct, forwards to [`SolidsBreakdown::empty`]
    #[cfg_attr(feature = "wasm", wasm_bindgen(constructor))]
    #[must_use]
    pub fn new() -> Self {
        Self::empty()
    }

    /// Calculates the total solids content, by summing the solids content from all components
    #[must_use]
    pub fn total(&self) -> f64 {
        self.fats.total + self.carbohydrates.total() + self.proteins + self.artificial_sweeteners.total() + self.others
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
}

impl ScaleComponents for SolidsBreakdown {
    fn scale(&self, factor: f64) -> Self {
        Self {
            fats: self.fats.scale(factor),
            carbohydrates: self.carbohydrates.scale(factor),
            proteins: self.proteins * factor,
            artificial_sweeteners: self.artificial_sweeteners.scale(factor),
            others: self.others * factor,
        }
    }

    fn add(&self, other: &Self) -> Self {
        Self {
            fats: self.fats.add(&other.fats),
            carbohydrates: self.carbohydrates.add(&other.carbohydrates),
            proteins: self.proteins + other.proteins,
            artificial_sweeteners: self.artificial_sweeteners.add(&other.artificial_sweeteners),
            others: self.others + other.others,
        }
    }
}

impl AbsDiffEq for SolidsBreakdown {
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

impl Default for SolidsBreakdown {
    fn default() -> Self {
        Self::empty()
    }
}

//! [`Sweeteners`] structure and related functionality, representing the composition of sweeteners
//! present in an ingredient or mix, including sugars, polyols, and artificial sweeteners

use approx::AbsDiffEq;
use serde::{Deserialize, Serialize};

use crate::{
    composition::{ArtificialSweeteners, Polyols, ScaleComponents, Sugars},
    error::Result,
};

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

#[cfg(doc)]
use crate::{composition::Composition, error::Error, specs::SweetenerSpec};

/// The sweetener composition of an ingredient or mix, including sugars, polyols, and artificial
///
/// **Note**: This struct is not actually used in the main [`Composition`] struct. It is provided
/// as a separate struct to facilitate some use cases for which only components with sweetness
/// properties are relevant, e.g. defining sweetener ingredient specs; see [`SweetenerSpec`].
#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(PartialEq, Serialize, Deserialize, Copy, Clone, Debug)]
#[serde(default, deny_unknown_fields)]
pub struct Sweeteners {
    /// The sugar composition of the mix, including monosaccharides, disaccharides, and other sugars
    pub sugars: Sugars,
    /// The polyol composition of the mix, including sorbitol, maltitol, and other polyols
    pub polyols: Polyols,
    /// The artificial sweetener composition of the mix, including aspartame, sucralose, etc.
    pub artificial: ArtificialSweeteners,
}

impl Sweeteners {
    /// Creates an empty [`Sweeteners`] struct with all fields set to 0, i.e. no sweeteners present
    #[must_use]
    pub const fn empty() -> Self {
        Self {
            sugars: Sugars::empty(),
            polyols: Polyols::empty(),
            artificial: ArtificialSweeteners::empty(),
        }
    }

    /// Creates a new empty `Sweeteners` struct, forwards to [`empty`](Self::empty)
    #[must_use]
    pub const fn new() -> Self {
        Self::empty()
    }

    /// Field-update method for [`sugars`](Self::sugars)
    #[must_use]
    pub const fn sugars(self, sugars: Sugars) -> Self {
        Self { sugars, ..self }
    }

    /// Field-update method for [`polyols`](Self::polyols)
    #[must_use]
    pub const fn polyols(self, polyols: Polyols) -> Self {
        Self { polyols, ..self }
    }

    /// Field-update method for [`artificial`](Self::artificial)
    #[must_use]
    pub const fn artificial(self, artificial: ArtificialSweeteners) -> Self {
        Self { artificial, ..self }
    }

    /// Calculates the total sweetener content by weight, by summing all the fields
    ///
    /// It forwards to the `total` methods of the individual components and sums the results.
    #[must_use]
    pub fn total(&self) -> f64 {
        self.sugars.total() + self.polyols.total() + self.artificial.total()
    }

    /// Calculates the [POD](crate::docs#pod) contributions of all the sweeteners in this struct
    ///
    /// It forwards to the `to_pod` methods of the individual components and sums the results.
    ///
    /// # Errors
    ///
    /// Returns an [`Error::CannotComputePOD`] if POD calculations fail for any of the components,
    /// e.g. due to the presence of "other" sugars or polyols with unknown POD contributions.
    pub fn to_pod(&self) -> Result<f64> {
        Ok(self.sugars.to_pod()? + self.polyols.to_pod()? + self.artificial.to_pod()?)
    }

    /// Calculates the [PAC](crate::docs#pac-afp-fpdf-se) contributions of all the sweeteners in
    /// this struct
    ///
    /// It forwards to the `to_pac` methods of the individual components and sums the results.
    ///
    /// # Errors
    ///
    /// Returns an [`Error::CannotComputePAC`] if PAC calculations fail for any of the components,
    /// e.g. due to the presence of "other" sugars or polyols with unknown PAC contributions.
    pub fn to_pac(&self) -> Result<f64> {
        Ok(self.sugars.to_pac()? + self.polyols.to_pac()? + self.artificial.to_pac()?)
    }
}

#[cfg_attr(coverage, coverage(off))]
#[cfg(feature = "wasm")]
#[wasm_bindgen]
impl Sweeteners {
    /// WASM compatible wrapper for [`new`](Self::new)
    #[allow(clippy::missing_const_for_fn)] // wasm_bindgen does not support const
    #[wasm_bindgen(constructor)]
    #[must_use]
    pub fn new_wasm() -> Self {
        Self::new()
    }
}

impl ScaleComponents for Sweeteners {
    fn scale(&self, factor: f64) -> Self {
        Self {
            sugars: self.sugars.scale(factor),
            polyols: self.polyols.scale(factor),
            artificial: self.artificial.scale(factor),
        }
    }

    fn add(&self, other: &Self) -> Self {
        Self {
            sugars: self.sugars.add(&other.sugars),
            polyols: self.polyols.add(&other.polyols),
            artificial: self.artificial.add(&other.artificial),
        }
    }
}

impl AbsDiffEq for Sweeteners {
    type Epsilon = f64;

    fn default_epsilon() -> Self::Epsilon {
        f64::default_epsilon()
    }

    fn abs_diff_eq(&self, other: &Self, epsilon: Self::Epsilon) -> bool {
        self.sugars.abs_diff_eq(&other.sugars, epsilon)
            && self.polyols.abs_diff_eq(&other.polyols, epsilon)
            && self.artificial.abs_diff_eq(&other.artificial, epsilon)
    }
}

impl Default for Sweeteners {
    fn default() -> Self {
        Self::empty()
    }
}

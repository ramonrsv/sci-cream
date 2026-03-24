//! [`Sweeteners`] structure and related functionality, representing the composition of sweeteners
//! present in an ingredient or mix, including sugars, polyols, and artificial sweeteners

use approx::AbsDiffEq;
use serde::{Deserialize, Serialize};

use crate::{
    composition::{ArtificialSweeteners, Polyols, ScaleComponents, Sugars},
    error::Result,
    validate::{Validate, verify_is_within_100_percent},
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

impl Validate for Sweeteners {
    fn validate(&self) -> Result<()> {
        self.sugars.validate()?;
        self.polyols.validate()?;
        self.artificial.validate()?;
        verify_is_within_100_percent(self.total())?;
        Ok(())
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

#[cfg(test)]
#[cfg_attr(coverage, coverage(off))]
#[allow(clippy::unwrap_used, clippy::float_cmp)]
mod tests {
    use crate::tests::asserts::shadow_asserts::{assert_eq, assert_ne};
    use crate::tests::asserts::*;

    use super::*;
    use crate::composition::*;
    use crate::error::Error;

    const FIELD_MODIFIERS: [fn(&mut Sweeteners, f64); 3] = [
        |s, ec| s.sugars.sucrose += ec,
        |s, ec| s.polyols.sorbitol += ec,
        |s, ec| s.artificial.aspartame += ec,
    ];

    #[test]
    fn sweeteners_empty() {
        let sweeteners = Sweeteners::empty();
        assert_eq!(sweeteners, Sweeteners::new());
        assert_eq!(sweeteners, Sweeteners::default());

        assert_eq!(sweeteners.sugars, Sugars::empty());
        assert_eq!(sweeteners.polyols, Polyols::empty());
        assert_eq!(sweeteners.artificial, ArtificialSweeteners::empty());

        assert_eq!(sweeteners.total(), 0.0);
        assert_eq!(sweeteners.to_pod().unwrap(), 0.0);
        assert_eq!(sweeteners.to_pac().unwrap(), 0.0);
    }

    #[test]
    fn sweeteners_field_update_methods() {
        let sweeteners = Sweeteners::new()
            .sugars(Sugars::new().sucrose(5.0))
            .polyols(Polyols::new().sorbitol(3.0))
            .artificial(ArtificialSweeteners::new().aspartame(1.0));

        assert_eq!(sweeteners.sugars, Sugars::new().sucrose(5.0));
        assert_eq!(sweeteners.polyols, Polyols::new().sorbitol(3.0));
        assert_eq!(sweeteners.artificial, ArtificialSweeteners::new().aspartame(1.0));
    }

    #[test]
    fn sweeteners_total() {
        let sugars = Sugars::new().sucrose(5.0);
        let polyols = Polyols::new().sorbitol(3.0);
        let artificial = ArtificialSweeteners::new().aspartame(1.0);

        let sweeteners = Sweeteners::new().sugars(sugars).polyols(polyols).artificial(artificial);

        assert_eq!(sweeteners.total(), sugars.total() + polyols.total() + artificial.total());
        assert_eq!(sweeteners.total(), 9.0);
    }

    #[test]
    fn sweeteners_to_pod() {
        let sugars = Sugars::new().sucrose(5.0);
        let polyols = Polyols::new().maltitol(3.0);
        let artificial = ArtificialSweeteners::new().sucralose(1.0);
        assert_ne!(sugars.to_pod().unwrap(), 0.0);
        assert_ne!(polyols.to_pod().unwrap(), 0.0);
        assert_ne!(artificial.to_pod().unwrap(), 0.0);

        let sweeteners = Sweeteners::new().sugars(sugars).polyols(polyols).artificial(artificial);

        assert_eq!(
            sweeteners.to_pod().unwrap(),
            sugars.to_pod().unwrap() + polyols.to_pod().unwrap() + artificial.to_pod().unwrap()
        );
    }

    #[test]
    fn sweeteners_to_pod_error() {
        assert!(matches!(
            Sweeteners::new().sugars(Sugars::new().other(1.0)).to_pod(),
            Err(Error::CannotComputePOD(_))
        ));
        assert!(matches!(
            Sweeteners::new().polyols(Polyols::new().other(1.0)).to_pod(),
            Err(Error::CannotComputePOD(_))
        ));
        assert!(matches!(
            Sweeteners::new()
                .artificial(ArtificialSweeteners::new().other(1.0))
                .to_pod(),
            Err(Error::CannotComputePOD(_))
        ));
    }

    #[test]
    fn sweeteners_to_pac() {
        let sugars = Sugars::new().sucrose(5.0);
        let polyols = Polyols::new().maltitol(3.0);
        let artificial = ArtificialSweeteners::new().sucralose(1.0);
        assert_ne!(sugars.to_pac().unwrap(), 0.0);
        assert_ne!(polyols.to_pac().unwrap(), 0.0);
        assert_ne!(artificial.to_pac().unwrap(), 0.0);

        let sweeteners = Sweeteners::new().sugars(sugars).polyols(polyols).artificial(artificial);

        assert_eq!(
            sweeteners.to_pac().unwrap(),
            sugars.to_pac().unwrap() + polyols.to_pac().unwrap() + artificial.to_pac().unwrap()
        );
    }

    #[test]
    fn sweeteners_to_pac_error() {
        assert!(matches!(
            Sweeteners::new().sugars(Sugars::new().other(1.0)).to_pac(),
            Err(Error::CannotComputePAC(_))
        ));
        assert!(matches!(
            Sweeteners::new().polyols(Polyols::new().other(1.0)).to_pac(),
            Err(Error::CannotComputePAC(_))
        ));
        assert!(matches!(
            Sweeteners::new()
                .artificial(ArtificialSweeteners::new().other(1.0))
                .to_pac(),
            Err(Error::CannotComputePAC(_))
        ));
    }

    #[test]
    fn sweeteners_scale() {
        let sweeteners = Sweeteners::new()
            .sugars(Sugars::new().sucrose(6.0))
            .polyols(Polyols::new().sorbitol(4.0))
            .artificial(ArtificialSweeteners::new().aspartame(2.0));
        assert_eq!(sweeteners.total(), 12.0);

        let scaled = sweeteners.scale(0.5);
        assert_eq!(scaled.sugars, Sugars::new().sucrose(3.0));
        assert_eq!(scaled.polyols, Polyols::new().sorbitol(2.0));
        assert_eq!(scaled.artificial, ArtificialSweeteners::new().aspartame(1.0));
        assert_eq!(scaled.total(), 6.0);
    }

    #[test]
    fn sweeteners_add() {
        let a = Sweeteners::new()
            .sugars(Sugars::new().sucrose(6.0))
            .polyols(Polyols::new().sorbitol(4.0))
            .artificial(ArtificialSweeteners::new().aspartame(2.0));
        let b = Sweeteners::new()
            .sugars(Sugars::new().glucose(3.0))
            .polyols(Polyols::new().maltitol(2.0))
            .artificial(ArtificialSweeteners::new().sucralose(1.0));
        assert_eq!(a.total(), 12.0);
        assert_eq!(b.total(), 6.0);

        let sum = a.add(&b);
        assert_eq!(sum.sugars, Sugars::new().sucrose(6.0).glucose(3.0));
        assert_eq!(sum.polyols, Polyols::new().sorbitol(4.0).maltitol(2.0));
        assert_eq!(sum.artificial, ArtificialSweeteners::new().aspartame(2.0).sucralose(1.0));
        assert_eq!(sum.total(), 18.0);
    }

    #[test]
    fn sweeteners_abs_diff_eq() {
        let a = Sweeteners::new()
            .sugars(Sugars::new().sucrose(5.0))
            .polyols(Polyols::new().sorbitol(3.0))
            .artificial(ArtificialSweeteners::new().aspartame(1.0));
        let b = a;
        let mut c = b;

        for v in [a, b, c] {
            assert_ne!(v.sugars.total(), 0.0);
            assert_ne!(v.polyols.total(), 0.0);
            assert_ne!(v.artificial.total(), 0.0);
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
        assert!(Sweeteners::empty().validate().is_ok());
    }

    #[test]
    fn validate_ok_for_valid_values() {
        let s = Sweeteners::new()
            .sugars(Sugars::new().sucrose(30.0))
            .polyols(Polyols::new().sorbitol(20.0))
            .artificial(ArtificialSweeteners::new().aspartame(10.0));
        assert!(s.validate().is_ok());
    }

    #[test]
    fn validate_err_for_each_negative_field() {
        for field_modifier in FIELD_MODIFIERS {
            let mut s = Sweeteners::empty();
            field_modifier(&mut s, -1.0);
            assert!(matches!(s.validate(), Err(Error::CompositionNotPositive(_))));
        }
    }

    #[test]
    fn validate_err_when_total_exceeds_100() {
        let s = Sweeteners::new()
            .sugars(Sugars::new().sucrose(60.0))
            .polyols(Polyols::new().sorbitol(41.0));
        assert!(matches!(s.validate(), Err(Error::CompositionNotWithin100Percent(_))));
    }

    #[test]
    fn validate_into_returns_self_when_valid() {
        let s = Sweeteners::new().sugars(Sugars::new().sucrose(10.0));
        let result = s.validate_into();
        assert!(result.is_ok());
        assert_eq!(result.unwrap().sugars.sucrose, 10.0);
    }

    #[test]
    fn validate_into_returns_err_when_invalid() {
        assert!(
            Sweeteners::new()
                .sugars(Sugars::new().sucrose(-1.0))
                .validate_into()
                .is_err()
        );
    }
}

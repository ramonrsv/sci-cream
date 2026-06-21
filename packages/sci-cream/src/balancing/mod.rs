//! Utilities for balancing compositions to match target values for specified keys, usually by
//! solving a least squares problem, through [`nalgebra`] SVD, [`mod@nnls`] non-negative, etc.
//!
//! For example, for [3.25% Milk, 40 % Cream, Skimmed Powder] and target [Milk Fat, MSNF].
//!
//! We want to solve the least squares problem for:
//!
//!   [3.25, 40,    0]   \[x1\]   \[16\]  // Milk Fat
//!   [8.71,  5.4, 97] * \[x2\] = \[11\]  // MSNF
//!   [1,     1,    1]   \[x3\]    \[1\]  // Total sums to 100%
//!
//! Where x1, x2, x3 are the amounts of each composition/ingredient to use.
//!
//! The feature is organized into three submodules: [`keys`] defines the balanceable target keys and
//! their least-squares row encoding, [`validate`] checks inputs and reports issues before a solve,
//! and [`solve`] assembles and solves the weighted system. All public items are re-exported here.

pub mod keys;
pub mod solve;
pub mod validate;

#[cfg(test)]
#[cfg_attr(coverage, coverage(off))]
#[allow(clippy::float_cmp, clippy::unwrap_used)]
pub(crate) mod tests;

pub use keys::*;
pub use solve::*;
pub use validate::*;

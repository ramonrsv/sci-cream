//! Standard composition values for dairy products, including milk/cream, powders, proteins, etc.
//!
//! Each source of solids non-fat, see [`SolidsSource`], has its standard values in a submodule:
//! milk solids in [`milk`], whey solids in [`whey`], and micellar casein and caseinates in
//! [`casein`]. The functions here estimate the lactose, minerals, unaccounted solids, and casein
//! share of any source's solids non-fat from their protein fraction.

#[allow(clippy::module_inception)]
pub mod dairy;

pub mod casein;
pub mod milk;
pub mod whey;

pub use dairy::*;

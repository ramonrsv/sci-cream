//! This module contains the various specifications that are used to define ingredient compositions.
//!
//! An [`Ingredient`] is defined chiefly by its [`Composition`], which is used to calculate its
//! contributions to the overall properties of a mix. The [`Composition`] struct is very complex and
//! subject to change as more tracking and properties are added, which makes directly defining it
//! for each ingredient very cumbersome and error-prone, to the point of being impractical.
//!
//! Instead, we define various "specs" that provide greatly simplified interfaces for defining
//! ingredients of different common categories, such as dairy, sweeteners, fruits, etc. These specs
//! are then internally converted into the full [`Composition`] struct using a multitude of
//! researched calculation and typical composition data. This allows for much easier and more
//! intuitive ingredient definitions, while still providing accurate and detailed composition data
//! for calculations. This approach also allows for more flexibility and extensibility, as new specs
//! can be added as needed for new ingredient types, and internal tracking can be expanded without
//! affecting the user-facing interfaces. [`FullSpec`] is also provided as a fallback for cases
//! where the user wants to directly specify the full composition.

#[cfg(doc)]
use crate::{composition::Composition, ingredient::Ingredient};

pub mod alcohol;
pub mod chocolate;
pub mod dairy;
pub mod egg;
pub mod fruit;
pub mod full;
pub mod ingredient;
pub mod micro;
pub mod nut;
pub mod sweetener;
pub mod units;

pub use alcohol::*;
pub use chocolate::*;
pub use dairy::*;
pub use egg::*;
pub use fruit::*;
pub use full::*;
pub use ingredient::*;
pub use micro::*;
pub use nut::*;
pub use sweetener::*;
pub use units::*;

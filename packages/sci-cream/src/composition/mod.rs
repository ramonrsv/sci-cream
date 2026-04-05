//! [`Composition`] and related constituent types which represent the full breakdown of an
//! ingredient or ice cream mix's composition, including all key components and their properties.
//!
//! The composition of an ingredient or mix is the most fundamental representation of its
//! properties; it directly represents many key quantities and aspects, e.g. fat and sugar content,
//! milk solids non-fat (MSNF), sweetness as [Potere Dolcificante (POD)](crate::docs#pod), etc., and
//! is the basis for all further calculation and analyses, e.g. [Freezing Point Depression
//! (FPD)](crate::docs#freezing-point-depression) calculations.
//!
//! [`Composition`] and its constituent types are a detailed breakdown of components and properties,
//! tracking macronutrients (e.g. carbohydrates, fats, proteins), contributions to key properties
//! (e.g. [Potere Dolcificante (POD)](crate::docs#pod), [PAC](crate::docs#pac-afp-fpdf-se)),
//! micronutrients and other micro components (e.g. vitamins, minerals, emulsifiers, stabilizers),
//! solids breakdowns (e.g. fat, sugar, protein, other solids, water, and alcohol content), as well
//! as other overall properties like energy. Most values are expressed in terms of grams per 100g of
//! total ingredient/mix, e.g. grams of fat per 100g of ingredient/mix. POD and PAC are expressed as
//! a sucrose equivalence and do not necessarily represent real weights of components. Energy is
//! expressed in kcal per 100g of ingredient/mix. See the documentation for each struct for more
//! details on the specific components and properties tracked, as well as the units being used.
//!
//! Due to the complexity and level of detail of these types, they are primarily intended for
//! internal use within the library, and to be constructed internally from more user-friendly input
//! types, e.g. [`specs`](crate::specs). They are not necessarily intended to be constructed
//! directly by users of the library, but they are left public and can be constructed directly if
//! needed for advanced use cases not covered by the library. To make this easier, each struct
//! provides field-update methods for each field, which allow construction by starting with an empty
//! structure and then updating only the relevant fields via chaining method calls.
//!
//! # Examples
//!
//! ```
//! # fn main() -> Result<(), Box<dyn std::error::Error>> {
//! use sci_cream::{composition::*, constants::{composition::*, pac}, docs::assert_eq_float};
//!
//! let msnf = (100.0 - 2.0) * STD_MSNF_IN_MILK_SERUM;
//! let lactose = msnf * STD_LACTOSE_IN_MSNF;
//! let proteins = msnf * STD_PROTEIN_IN_MSNF;
//!
//! let milk_solids = SolidsBreakdown::new()
//!     .fats(
//!         Fats::new()
//!             .total(2.0)
//!             .saturated(2.0 * STD_SATURATED_FAT_IN_MILK_FAT)
//!             .trans(2.0 * STD_TRANS_FAT_IN_MILK_FAT),
//!     )
//!     .carbohydrates(Carbohydrates::new().sugars(Sugars::new().lactose(lactose)))
//!     .proteins(proteins)
//!     .others(msnf - lactose - proteins);
//!
//! let pod = milk_solids.carbohydrates.to_pod()?;
//! let pac = PAC::new()
//!     .sugars(milk_solids.carbohydrates.to_pac()?)
//!     .msnf_ws_salts(msnf * pac::MSNF_WS_SALTS / 100.0);
//!
//! // Composition for 2% milk
//! let comp = Composition::new()
//!     .energy(milk_solids.energy()?)
//!     .solids(Solids::new().milk(milk_solids))
//!     .pod(pod)
//!     .pac(pac);
//!
//! assert_eq!(comp.get(CompKey::Energy), 49.5756);
//!
//! assert_eq!(comp.get(CompKey::MilkFat), 2.0);
//! assert_eq_float!(comp.get(CompKey::Lactose), 4.8069);
//! assert_eq!(comp.get(CompKey::MSNF), 8.82);
//! assert_eq!(comp.get(CompKey::MilkSNFS), 4.0131);
//! assert_eq_float!(comp.get(CompKey::MilkProteins), 3.087);
//! assert_eq!(comp.get(CompKey::MilkSolids), 10.82);
//!
//! assert_eq!(comp.get(CompKey::TotalSolids), 10.82);
//! assert_eq!(comp.get(CompKey::Water), 89.18);
//!
//! assert_eq_float!(comp.get(CompKey::POD), 0.769_104);
//! assert_eq_float!(comp.get(CompKey::PACsgr), 4.8069);
//! assert_eq_float!(comp.get(CompKey::PACmlk), 3.2405);
//! assert_eq_float!(comp.get(CompKey::PACtotal), 8.0474);
//! # Ok(()) }
//! ```

#[allow(clippy::module_inception)]
pub mod composition;

pub mod alcohol;
pub mod artificial_sweeteners;
pub mod carbohydrates;
pub mod emulsifiers;
pub mod fats;
pub mod fibers;
pub mod micro;
pub mod pac;
pub mod polyols;
pub mod solids;
pub mod solids_breakdown;
pub mod stabilizers;
pub mod sugars;
pub mod sweeteners;
pub mod texture;

pub use alcohol::*;
pub use artificial_sweeteners::*;
pub use carbohydrates::*;
pub use composition::*;
pub use emulsifiers::*;
pub use fats::*;
pub use fibers::*;
pub use micro::*;
pub use pac::*;
pub use polyols::*;
pub use solids::*;
pub use solids_breakdown::*;
pub use stabilizers::*;
pub use sugars::*;
pub use sweeteners::*;
pub use texture::*;

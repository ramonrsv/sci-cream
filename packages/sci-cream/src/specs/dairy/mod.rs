//! [`DairySimpleSpec`], [`DairyLabelSpec`], [`DairySheetSpec`], and associated implementations,
//! for dairy ingredients such as milk, cream, milk powders, protein powders, etc.

pub mod label;
pub mod sheet;
pub mod simple;
mod util;

pub use label::*;
pub use sheet::*;
pub use simple::*;
pub(crate) use util::make_milk_proteins;

//! [`ChocolateSpec`], [`CocoaPowderSpec`], and associated implementations, for chocolate
//! and other cocoa ingredients

#[allow(clippy::module_inception)]
pub mod chocolate;

pub mod cocoa_powder;
mod util;

pub use chocolate::*;
pub use cocoa_powder::*;

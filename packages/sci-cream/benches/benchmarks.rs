#![allow(
    unused_crate_dependencies,
    clippy::unwrap_used,
    missing_docs,
    clippy::redundant_pub_crate
)]

mod assets;
mod balance_compositions;
mod bridge_calculate_recipe;
mod recipe_calculate;
mod spec_to_composition;

use criterion::criterion_main;

criterion_main! {
    bridge_calculate_recipe::benches,
    recipe_calculate::benches,
    spec_to_composition::benches,
    balance_compositions::benches,
}

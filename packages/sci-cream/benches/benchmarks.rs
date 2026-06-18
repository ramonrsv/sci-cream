#![allow(
    unused_crate_dependencies,
    clippy::unwrap_used,
    missing_docs,
    clippy::redundant_pub_crate
)]

mod assets;
mod balance_compositions;
mod bridge_calculate_recipe;
mod compute_fpd_curves;
mod fast_composition;
mod recipe_calculate;
mod spec_to_composition;
mod validate_balancing_targets;

use criterion::criterion_main;

criterion_main! {
    bridge_calculate_recipe::benches,
    recipe_calculate::benches,
    spec_to_composition::benches,
    balance_compositions::benches,
    validate_balancing_targets::benches,
    fast_composition::benches,
    compute_fpd_curves::benches,
}

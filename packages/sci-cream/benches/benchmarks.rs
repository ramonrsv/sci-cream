#![allow(unused_crate_dependencies, clippy::unwrap_used, missing_docs)]

mod assets;
mod bridge_calculate_recipe;
mod recipe_calculate;
mod spec_into_composition;

use criterion::criterion_main;

criterion_main! {
    bridge_calculate_recipe::benches,
    recipe_calculate::benches,
    spec_into_composition::benches,
}

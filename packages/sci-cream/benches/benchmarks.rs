#![allow(unused_crate_dependencies, clippy::unwrap_used)]

mod recipe_calculate;
mod spec_into_composition;

use criterion::criterion_main;

criterion_main! {
    recipe_calculate::benches,
    spec_into_composition::benches,
}

use std::hint::black_box;

use criterion::{Criterion, criterion_group};

use crate::assets::REF_RECIPE;

use sci_cream::fpd::{FpdCurvesMethod, PacToFpdMethod, compute_fpd_curves};

pub(crate) fn bench_recipe_calculate(c: &mut Criterion) {
    use FpdCurvesMethod::{GoffHartel, ModifiedGoffHartelCorvitto};
    use PacToFpdMethod::{Interpolation, Polynomial};

    let composition = REF_RECIPE.calculate_composition().unwrap();

    let _ = c.bench_function("compute_fpd_curves(Interpolation, Goff & Hartel)", |b| {
        b.iter(|| black_box(compute_fpd_curves(composition, Interpolation, GoffHartel).unwrap()));
    });

    let _ = c.bench_function("compute_fpd_curves(Polynomial, Goff & Hartel)", |b| {
        b.iter(|| black_box(compute_fpd_curves(composition, Polynomial, GoffHartel).unwrap()));
    });

    let _ = c.bench_function("compute_fpd_curves(Interpolation, Modified Goff & Hartel & Corvitto)", |b| {
        b.iter(|| black_box(compute_fpd_curves(composition, Interpolation, ModifiedGoffHartelCorvitto).unwrap()));
    });

    let _ = c.bench_function("compute_fpd_curves(Polynomial, Modified Goff & Hartel & Corvitto)", |b| {
        b.iter(|| black_box(compute_fpd_curves(composition, Polynomial, ModifiedGoffHartelCorvitto).unwrap()));
    });
}

criterion_group!(benches, bench_recipe_calculate);

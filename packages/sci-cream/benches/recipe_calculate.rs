use criterion::{BatchSize, Criterion, criterion_group};

use crate::assets::REF_RECIPE;

pub(crate) fn bench_recipe_calculate(c: &mut Criterion) {
    let recipe = REF_RECIPE.clone();

    let _ = c.bench_function("recipe.calculate_composition", |b| {
        b.iter_batched(|| (), |()| recipe.calculate_composition().unwrap(), BatchSize::SmallInput);
    });

    let _ = c.bench_function("recipe.calculate_mix_properties", |b| {
        b.iter_batched(|| (), |()| recipe.calculate_mix_properties().unwrap(), BatchSize::SmallInput);
    });
}

criterion_group!(benches, bench_recipe_calculate);

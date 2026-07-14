use std::hint::black_box;

use criterion::{BatchSize, Criterion, criterion_group};

use sci_cream::balancing::{balance_compositions_nalgebra, balance_compositions_nnls, get_all_native_balancing_keys};

use crate::assets::REF_RECIPE;

pub(crate) fn bench_balance_main_recipe_compositions(c: &mut Criterion) {
    let mix_comp = REF_RECIPE.calculate_composition().unwrap();

    let comps = REF_RECIPE
        .lines
        .iter()
        .map(|line| (line.ingredient.composition, None::<f64>))
        .collect::<Vec<_>>();

    let targets = get_all_native_balancing_keys()
        .iter()
        .map(|key| (*key, key.value(&mix_comp)))
        .filter(|(_, value)| value.is_finite())
        .collect::<Vec<_>>();

    let _ = c.bench_function("balance_compositions_nalgebra(recipe...)", |b| {
        b.iter_batched(
            || (comps.clone(), targets.clone()),
            |(comps, targets)| black_box(balance_compositions_nalgebra(&comps, &targets, None, &[]).unwrap()),
            BatchSize::SmallInput,
        );
    });

    let _ = c.bench_function("balance_compositions_nnls(recipe...)", |b| {
        b.iter_batched(
            || (comps.clone(), targets.clone()),
            |(comps, targets)| black_box(balance_compositions_nnls(&comps, &targets, None, &[]).unwrap()),
            BatchSize::SmallInput,
        );
    });
}

criterion_group!(benches, bench_balance_main_recipe_compositions);

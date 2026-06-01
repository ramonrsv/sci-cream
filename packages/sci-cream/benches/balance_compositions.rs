use criterion::{BatchSize, Criterion, criterion_group};

use sci_cream::balancing::{balance_compositions_nalgebra, balance_compositions_nnls, get_balanceable_comp_keys};

use crate::assets::REF_RECIPE;

pub(crate) fn bench_balance_main_recipe_compositions(c: &mut Criterion) {
    let mix_comp = REF_RECIPE.calculate_composition().unwrap();

    let comps = REF_RECIPE
        .lines
        .iter()
        .map(|line| line.ingredient.composition)
        .collect::<Vec<_>>();

    let targets = get_balanceable_comp_keys()
        .iter()
        .map(|key| (*key, mix_comp.get(*key)))
        .collect::<Vec<_>>();

    let _ = c.bench_function("balance_compositions_nalgebra(recipe...)", |b| {
        b.iter_batched(
            || (comps.clone(), targets.clone()),
            |(comps, targets)| balance_compositions_nalgebra(&comps, &targets).unwrap(),
            BatchSize::SmallInput,
        );
    });

    let _ = c.bench_function("balance_compositions_nnls(recipe...)", |b| {
        b.iter_batched(
            || (comps.clone(), targets.clone()),
            |(comps, targets)| balance_compositions_nnls(&comps, &targets).unwrap(),
            BatchSize::SmallInput,
        );
    });
}

criterion_group!(benches, bench_balance_main_recipe_compositions);

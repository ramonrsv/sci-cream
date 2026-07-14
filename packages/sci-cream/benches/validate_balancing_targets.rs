use std::hint::black_box;

use criterion::{BatchSize, Criterion, criterion_group};

use sci_cream::{
    balancing::{
        BalanceKey, Priority, get_all_native_balancing_keys, get_typical_balancing_keys, validate_balancing_targets,
    },
    composition::{CompKey, RatioKey},
};

use crate::assets::REF_RECIPE;

pub(crate) fn bench_validate_balancing_targets(c: &mut Criterion) {
    let mix_comp = REF_RECIPE.calculate_composition().unwrap();

    let comps = REF_RECIPE
        .lines
        .iter()
        .map(|line| (line.ingredient.composition, None::<f64>))
        .collect::<Vec<_>>();

    let priority_for = |key: BalanceKey| match key {
        k if k == CompKey::MilkFat.into() || k == CompKey::MSNF.into() => Some(Priority::High),
        k if k == RatioKey::AbsNetPAC.into() => Some(Priority::Critical),
        _ => None,
    };

    let targets_for = |keys: Vec<BalanceKey>| {
        keys.iter()
            .map(|key| (*key, key.value(&mix_comp), priority_for(*key)))
            .filter(|(_, value, _)| value.is_finite())
            .collect::<Vec<_>>()
    };

    let native_targets = targets_for(get_all_native_balancing_keys());
    let typical_targets = targets_for(get_typical_balancing_keys());

    let _ = c.bench_function("validate_balancing_targets(native_keys)", |b| {
        b.iter_batched(
            || (),
            |()| black_box(validate_balancing_targets(&comps, &native_targets, None, None)),
            BatchSize::SmallInput,
        );
    });

    let _ = c.bench_function("validate_balancing_targets(typical_keys)", |b| {
        b.iter_batched(
            || (),
            |()| black_box(validate_balancing_targets(&comps, &typical_targets, None, None)),
            BatchSize::SmallInput,
        );
    });
}

criterion_group!(benches, bench_validate_balancing_targets);

use std::hint::black_box;

use criterion::{BatchSize, Criterion, criterion_group};

use sci_cream::{
    balancing::{Priority, get_all_balanceable_keys, get_typical_balancing_keys, validate_balancing_targets},
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

    let all_targets = get_all_balanceable_keys()
        .iter()
        .map(|key| (*key, key.value(&mix_comp)))
        .filter(|(_, value)| value.is_finite())
        .collect::<Vec<_>>();

    let typical_targets = get_typical_balancing_keys()
        .iter()
        .map(|key| (*key, key.value(&mix_comp)))
        .filter(|(_, value)| value.is_finite())
        .collect::<Vec<_>>();

    let priorities = vec![
        (CompKey::MilkFat.into(), Priority::High),
        (CompKey::MSNF.into(), Priority::High),
        (RatioKey::AbsNetPAC.into(), Priority::Critical),
    ];

    let _ = c.bench_function("validate_balancing_targets(all_keys)", |b| {
        b.iter_batched(
            || (),
            |()| black_box(validate_balancing_targets(&comps, &all_targets, &priorities, None, None)),
            BatchSize::SmallInput,
        );
    });

    let _ = c.bench_function("validate_balancing_targets(typical_keys)", |b| {
        b.iter_batched(
            || (),
            |()| black_box(validate_balancing_targets(&comps, &typical_targets, &priorities, None, None)),
            BatchSize::SmallInput,
        );
    });
}

criterion_group!(benches, bench_validate_balancing_targets);

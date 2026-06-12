use criterion::{BatchSize, Criterion, criterion_group};

use sci_cream::{
    balancing::{Priority, get_balanceable_keys, validate_balancing_targets},
    composition::{CompKey, RatioKey},
};

use crate::assets::REF_RECIPE;

pub(crate) fn bench_validate_balancing_targets(c: &mut Criterion) {
    let mix_comp = REF_RECIPE.calculate_composition().unwrap();

    let comps = REF_RECIPE
        .lines
        .iter()
        .map(|line| line.ingredient.composition)
        .collect::<Vec<_>>();

    let targets = get_balanceable_keys()
        .iter()
        .map(|key| (*key, key.value(&mix_comp)))
        .filter(|(_, value)| value.is_finite())
        .collect::<Vec<_>>();

    let priorities = vec![
        (CompKey::MilkFat.into(), Priority::High),
        (CompKey::MSNF.into(), Priority::High),
        (RatioKey::AbsNetPAC.into(), Priority::Critical),
    ];

    let _ = c.bench_function("validate_balancing_targets", |b| {
        b.iter_batched(|| (), |()| validate_balancing_targets(&comps, &targets, &priorities), BatchSize::SmallInput);
    });
}

criterion_group!(benches, bench_validate_balancing_targets);

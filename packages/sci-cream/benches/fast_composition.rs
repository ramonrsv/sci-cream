use std::hint::black_box;

use criterion::{Criterion, criterion_group};
use strum::IntoEnumIterator;

use sci_cream::composition::{CompKey, CompositionValues, FastComposition};

use crate::assets::REF_RECIPE;

/// Per-key reads via `Composition::get` vs. a precomputed `FastComposition`, plus the one-time
/// snapshot build cost (`build` ≈ one sweep — the break-even the per-access win pays back).
pub(crate) fn bench_fast_composition(c: &mut Criterion) {
    let comp = REF_RECIPE.calculate_composition().unwrap();
    let keys = CompKey::iter().collect::<Vec<_>>();
    let fast = comp.to_fast();

    let _ = c.bench_function("fast_composition/get_sweep", |b| {
        b.iter(|| keys.iter().map(|&key| black_box(&comp).get(key)).sum::<f64>());
    });

    let _ = c.bench_function("fast_composition/fast_get_sweep", |b| {
        b.iter(|| keys.iter().map(|&key| black_box(&fast).get(key)).sum::<f64>());
    });

    let _ = c.bench_function("fast_composition/build", |b| {
        b.iter(|| FastComposition::from(black_box(&comp)));
    });
}

criterion_group!(benches, bench_fast_composition);

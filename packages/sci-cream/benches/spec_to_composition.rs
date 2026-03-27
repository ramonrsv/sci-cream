use criterion::{BatchSize, Criterion, criterion_group};

use sci_cream::{composition::ToComposition, data::get_ingredient_spec_by_name};

pub(crate) fn bench_sweetener_spec_to_composition(c: &mut Criterion) {
    let sweetener_spec = get_ingredient_spec_by_name("HFCS 42")
        .unwrap()
        .spec
        .into_sweetener_spec()
        .unwrap();

    let _ = c.bench_function("sweetener_spec_to_composition", |b| {
        b.iter_batched(|| sweetener_spec, |spec| spec.to_composition().unwrap(), BatchSize::SmallInput);
    });
}

criterion_group!(benches, bench_sweetener_spec_to_composition);

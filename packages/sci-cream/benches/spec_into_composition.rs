use criterion::{BatchSize, Criterion, criterion_group};

use sci_cream::{composition::IntoComposition, data::get_ingredient_spec_by_name};

pub(crate) fn bench_sweetener_spec_into_composition(c: &mut Criterion) {
    let sweetener_spec = get_ingredient_spec_by_name("HFCS 42")
        .unwrap()
        .spec
        .into_sweetener_spec()
        .unwrap();

    let _ = c.bench_function("sweetener_spec_into_composition", |b| {
        b.iter_batched(|| sweetener_spec, |spec| spec.into_composition().unwrap(), BatchSize::SmallInput);
    });
}

criterion_group!(benches, bench_sweetener_spec_into_composition);

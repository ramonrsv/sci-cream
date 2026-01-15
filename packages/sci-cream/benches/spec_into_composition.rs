#![allow(unused_crate_dependencies, clippy::unwrap_used)]

use criterion::{BatchSize, Criterion};
use criterion::{criterion_group, criterion_main};

pub fn bench_sweetener_spec_into_composition(c: &mut Criterion) {
    use sci_cream::{
        composition::{IntoComposition, Sugars, Sweeteners},
        specs::{SweetenerSpec, units::CompositionBasis},
    };

    let hfcs42 = SweetenerSpec {
        sweeteners: Sweeteners::new().sugars(Sugars::new().fructose(42.0).glucose(53.0)),
        fiber: None,
        other_carbohydrates: Some(5.0),
        other_solids: None,
        basis: CompositionBasis::ByDryWeight { solids: 76.0 },
        pod: None,
        pac: None,
    };

    let _ = c.bench_function("sweetener_spec_into_composition", |b| {
        b.iter_batched(|| hfcs42, |spec| spec.into_composition().unwrap(), BatchSize::SmallInput);
    });
}

criterion_group!(benches, bench_sweetener_spec_into_composition);
criterion_main!(benches);

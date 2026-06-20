use std::hint::black_box;

use criterion::{Criterion, criterion_group};

use sci_cream::{composition::ToComposition, data::get_independent_ingredient_spec_by_name};

pub(crate) fn bench_sweetener_spec_to_composition(c: &mut Criterion) {
    let get_spec = |name| {
        get_independent_ingredient_spec_by_name(name)
            .unwrap_or_else(|e| panic!("missing ingredient '{name}': {e}"))
            .spec
    };

    let sweetener_spec = get_spec("HFCS 42").into_sweetener_spec().unwrap();

    let simple_milk = "2% Milk";
    let label_milk_g = "USDA Whole Milk";
    let label_milk_ml = "Sealtest 3.25% Milk";
    let label_sweet_g = "USDA Sweetened Condensed Milk";
    let label_sweet_ml = "Eagle Brand Original Sweetened Condensed Milk";

    let dairy_simple_spec = get_spec(simple_milk).into_dairy_simple_spec().unwrap();
    let dairy_label_spec_milk_g = get_spec(label_milk_g).into_dairy_label_spec().unwrap();
    let dairy_label_spec_milk_ml = get_spec(label_milk_ml).into_dairy_label_spec().unwrap();
    let dairy_label_spec_sweet_g = get_spec(label_sweet_g).into_dairy_label_spec().unwrap();
    let dairy_label_spec_sweet_ml = get_spec(label_sweet_ml).into_dairy_label_spec().unwrap();

    let _ = c.bench_function("sweetener_spec_to_composition", |b| {
        b.iter(|| black_box(sweetener_spec.to_composition().unwrap()));
    });

    let _ = c.bench_function("dairy_simple_spec_to_composition(milk)", |b| {
        b.iter(|| black_box(dairy_simple_spec.to_composition().unwrap()));
    });

    let _ = c.bench_function("dairy_label_spec_to_composition(milk_g)", |b| {
        b.iter(|| black_box(dairy_label_spec_milk_g.to_composition().unwrap()));
    });

    let _ = c.bench_function("dairy_label_spec_to_composition(milk_ml)", |b| {
        b.iter(|| black_box(dairy_label_spec_milk_ml.to_composition().unwrap()));
    });

    let _ = c.bench_function("dairy_label_spec_to_composition(sweet_g)", |b| {
        b.iter(|| black_box(dairy_label_spec_sweet_g.to_composition().unwrap()));
    });

    let _ = c.bench_function("dairy_label_spec_to_composition(sweet_ml)", |b| {
        b.iter(|| black_box(dairy_label_spec_sweet_ml.to_composition().unwrap()));
    });
}

criterion_group!(benches, bench_sweetener_spec_to_composition);

use criterion::{BatchSize, Criterion, criterion_group};

use crate::assets::REF_LIGHT_RECIPE;

use sci_cream::{database::IngredientDatabase, wasm::Bridge};

pub(crate) fn bench_bridge_calculate_recipe(c: &mut Criterion) {
    let bridge = Bridge::new(IngredientDatabase::new_seeded_from_embedded_data().unwrap());
    let ref_light_recipe = REF_LIGHT_RECIPE.clone();

    let _ = c.bench_function("bridge.calculate_recipe_composition", |b| {
        b.iter_batched(
            || (),
            |()| bridge.calculate_recipe_composition(&ref_light_recipe).unwrap(),
            BatchSize::SmallInput,
        );
    });

    let _ = c.bench_function("bridge.calculate_recipe_mix_properties", |b| {
        b.iter_batched(
            || (),
            |()| bridge.calculate_recipe_mix_properties(&ref_light_recipe).unwrap(),
            BatchSize::SmallInput,
        );
    });
}

criterion_group!(benches, bench_bridge_calculate_recipe);

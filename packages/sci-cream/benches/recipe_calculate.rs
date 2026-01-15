use criterion::{BatchSize, Criterion, criterion_group};

pub(crate) fn bench_recipe_calculate(c: &mut Criterion) {
    use sci_cream::recipe::{Recipe, RecipeLine};

    let recipe = Recipe {
        name: "Chocolate Ice Cream".to_string(),
        lines: [
            ("Whole Milk", 245.0),
            ("Whipping Cream", 215.0),
            ("Cocoa Powder, 17% Fat", 28.0),
            ("Skimmed Milk Powder", 21.0),
            ("Egg Yolk", 18.0),
            ("Dextrose", 45.0),
            ("Fructose", 32.0),
            ("Salt", 0.5),
            ("Rich Ice Cream SB", 1.25),
            ("Vanilla Extract", 6.0),
        ]
        .iter()
        .map(|(name, amount)| RecipeLine {
            ingredient: sci_cream::data::get_ingredient_spec_by_name(name)
                .unwrap()
                .into_ingredient()
                .unwrap(),
            amount: *amount,
        })
        .collect::<Vec<RecipeLine>>(),
    };

    let _ = c.bench_function("calculate_composition", |b| {
        b.iter_batched(|| &recipe, |recipe| recipe.calculate_composition().unwrap(), BatchSize::SmallInput);
    });

    let _ = c.bench_function("calculate_mix_properties", |b| {
        b.iter_batched(|| &recipe, |recipe| recipe.calculate_mix_properties().unwrap(), BatchSize::SmallInput);
    });
}

criterion_group!(benches, bench_recipe_calculate);

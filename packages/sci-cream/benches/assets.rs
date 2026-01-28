use std::sync::LazyLock;

use sci_cream::{
    data::get_ingredient_spec_by_name,
    recipe::{OwnedLightRecipe, Recipe, RecipeLine},
};

pub(crate) const REF_RECIPE_NAME: &str = "Chocolate Ice Cream";

pub(crate) static REF_LIGHT_RECIPE: LazyLock<OwnedLightRecipe> = LazyLock::new(|| {
    [
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
    .map(|(name, amount)| (name.to_string(), *amount))
    .collect()
});

pub(crate) static REF_RECIPE: LazyLock<Recipe> = LazyLock::new(|| Recipe {
    name: Some(REF_RECIPE_NAME.to_string()),
    lines: REF_LIGHT_RECIPE
        .iter()
        .map(|(name, amount)| RecipeLine {
            ingredient: get_ingredient_spec_by_name(name).unwrap().into_ingredient().unwrap(),
            amount: *amount,
        })
        .collect::<Vec<RecipeLine>>(),
});

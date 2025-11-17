use std::sync::LazyLock;

use crate::{
    comp_specs::{DairySpec, SugarsSpec},
    composition::{Composition, PAC, Solids, SolidsBreakdown, Sugars, Sweeteners},
};

// Comp Specs
// --------------------------------------------

pub static SPEC_DAIRY_2_PERCENT: LazyLock<DairySpec> = LazyLock::new(|| DairySpec {
    fat: 2f64,
    msnf: None,
});

pub static SPEC_SUGARS_DEXTROSE: LazyLock<SugarsSpec> = LazyLock::new(|| SugarsSpec {
    sugars: Sugars::new().glucose(100f64),
    solids: 100f64,
});

pub static SPEC_SUGARS_DEXTROSE_50_PERCENT: LazyLock<SugarsSpec> = LazyLock::new(|| SugarsSpec {
    sugars: Sugars::new().glucose(100f64),
    solids: 50f64,
});

// Compositions
// --------------------------------------------

pub static COMP_MILK_2_PERCENT: LazyLock<Composition> = LazyLock::new(|| {
    Composition::new()
        .solids(
            Solids::new().milk(
                SolidsBreakdown::new()
                    .fats(2f64)
                    .sweeteners(4.8069f64)
                    .snfs(4.0131f64),
            ),
        )
        .sweeteners(Sweeteners::new().sugars(Sugars::new().lactose(4.8069f64)))
        .pod(0.769104f64)
        .pac(PAC::new().sugars(4.8069f64))
});

pub static COMP_DEXTROSE: LazyLock<Composition> = LazyLock::new(|| {
    Composition::new()
        .solids(Solids::new().other(SolidsBreakdown::new().sweeteners(100f64)))
        .sweeteners(Sweeteners::new().sugars(Sugars::new().glucose(100f64)))
        .pod(70f64)
        .pac(PAC::new().sugars(190f64))
});

pub static COMP_DEXTROSE_50_PERCENT: LazyLock<Composition> = LazyLock::new(|| {
    Composition::new()
        .solids(Solids::new().other(SolidsBreakdown::new().sweeteners(50f64)))
        .sweeteners(Sweeteners::new().sugars(Sugars::new().glucose(50f64)))
        .pod(35f64)
        .pac(PAC::new().sugars(95f64))
});

use std::sync::LazyLock;

use crate::{
    comp_specs::DairySpec,
    composition::{Composition, Fats, PAC, Solids, SolidsNF, SolidsNFS, Sugar, Sweeteners},
    ingredients::{Category, Ingredient},
};

pub static COMP_MILK_2_PERCENT: LazyLock<Composition> = LazyLock::new(|| {
    Composition::new()
        .solids(
            Solids::new()
                .fats(Fats::new().milk(2f64))
                .snf(SolidsNF::new().milk(8.82f64))
                .sweeteners(Sweeteners::new().sugar(Sugar::new().lactose(4.8069f64)))
                .snfs(SolidsNFS::new().milk(4.0131f64)),
        )
        .pod(0.769104f64)
        .pac(PAC::new().sugar(4.8069f64))
});

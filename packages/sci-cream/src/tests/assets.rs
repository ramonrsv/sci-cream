use std::sync::LazyLock;

use crate::{
    comp_specs::DairySpec,
    composition::{Composition, Fats, PAC, Solids, SolidsNFNS, Sugar, Sweeteners},
    ingredients::{Category, Ingredient},
};

pub static COMP_MILK_2_PERCENT: LazyLock<Composition> = LazyLock::new(|| Composition {
    solids: Some(Solids {
        fats: Some(Fats {
            milk: Some(2f64.into()),
            ..Fats::empty()
        }),
        sweeteners: Some(Sweeteners {
            sugar: Some(Sugar {
                lactose: Some(4.8069f64.into()),
                ..Sugar::empty()
            }),
            ..Sweeteners::empty()
        }),
        snfs: Some(SolidsNFNS {
            milk: Some(8.82f64.into()),
            ..SolidsNFNS::empty()
        }),
    }),
    micro: None,
    alcohol: None,
    pod: Some(0.769104f64.into()),
    pac: Some(PAC {
        sugar: Some(4.8069f64.into()),
        ..PAC::empty()
    }),
});

//! Reconciles the dairy entries: the `USDA …` ones against the proximates their listings measure,
//! in [`usda`], and the milk and micellar casein lines against the concentrate compositions their
//! isolate anchors average, in [`milk_protein`] and [`micellar_casein`].

mod micellar_casein;
mod milk_protein;
mod usda;
mod util;

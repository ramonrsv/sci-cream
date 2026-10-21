//! Reconciliation suites: each validates an ingredient's modeled composition against what a
//! published source measures, a per-serving nutrition label (often with volume and density
//! estimations), the proximates of a USDA listing, or the composition from papers or spec sheets.

mod chocolate;
mod dairy;
mod flavourings;
mod micellar_casein;
mod util;

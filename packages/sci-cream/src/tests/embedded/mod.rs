//! Tests whose subject is the embedded-data product itself, rather than a unit of code.
//!
//! Two flavors live here. [`integrity`] checks that every embedded spec is internally well-formed:
//! it deserializes, resolves to an ingredient, and satisfies the composition invariants. The others
//! validate each ingredient's modeled composition against an external reference: a published
//! nutrition label (in [`reconciliation`]) or cross-checked across sources (in [`compare_specs`]).
//! Unlike the colocated unit tests, these have no single code module to live beside.

mod compare_specs;
mod integrity;
mod reconciliation;

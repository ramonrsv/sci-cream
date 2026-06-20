//! Tests whose subject is the embedded-data product itself, rather than a unit of code.
//!
//! Each ingredient's modeled composition is validated against an external reference: a published
//! nutrition label (in [`reconciliation`]) or, in a follow-up, cross-checked across sources
//! (`compare_specs`). Unlike the colocated unit tests, these have no single code module to live
//! beside.

mod reconciliation;

//! Aggregate well-formedness check for the embedded ingredient dataset.
//!
//! The other embedded suites each cover one facet (parsing, seeding, structural invariants) or
//! check accuracy against an external reference. This one runs the full *validity* contract over
//! every embedded spec in a single place, reporting which spec fails, so a malformed entry is
//! diagnosed here rather than through a panic deep in database seeding.

#![cfg_attr(coverage, coverage(off))]

use crate::{
    composition::Composition,
    data::get_all_spec_entries,
    error::Result,
    ingredient::ResolveIntoIngredient,
    tests::{assets::EMBEDDED_DB, util::verify_structural_consistency},
    validate::Validate,
};

/// Runs every per-composition validity check, short-circuiting on the first failure.
fn check_composition(comp: &Composition) -> Result<()> {
    comp.validate()?;
    verify_structural_consistency(comp)?;
    Ok(())
}

/// Every embedded spec resolves to an ingredient whose composition is valid and structurally
/// consistent. Failures are collected so a single run lists every offending spec by name.
#[test]
fn embedded_specs_are_well_formed() {
    let db = &*EMBEDDED_DB;

    let failures: Vec<String> = get_all_spec_entries()
        .into_iter()
        .filter_map(|entry| {
            let name = entry.name().to_string();
            entry
                .resolve_into_ingredient(db)
                .and_then(|ingredient| check_composition(&ingredient.composition))
                .err()
                .map(|e| format!("  {name}: {e}"))
        })
        .collect();

    assert!(
        failures.is_empty(),
        "{} embedded spec(s) failed validation:\n{}",
        failures.len(),
        failures.join("\n")
    );
}

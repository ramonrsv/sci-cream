//! Diesel schema for the `ingredients` table.
//!
//! This module is only compiled when the `diesel` feature is enabled.

#[cfg(feature = "diesel")]
diesel::table! {
    #[allow(missing_docs)] // WIP, @todo
    ingredients (id) {
        id -> Int4,
        name -> Varchar,
        category -> Varchar,
        spec -> Varchar,
    }
}

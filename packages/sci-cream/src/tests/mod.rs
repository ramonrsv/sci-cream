// Shared test infrastructure, imported by tests across the crate.
pub(crate) mod asserts;
pub(crate) mod assets;
pub(crate) mod util;

// Test suites that have no clear code module to be collocated with.
mod embedded;

//! Helpers shared by the two line suites: extending a source's line to the isolate's protein,
//! rounding and averaging, and the fit report's rows and cells.

use crate::constants::composition::dairy::milk::STD_PROTEIN_IN_MSNF;

/// The value at `isolate_protein` of the line from milk solids' `milk_solids_value` through a
/// source's `value` at its `protein`
pub(super) fn extend_to_isolate(isolate_protein: f64, milk_solids_value: f64, [protein, value]: [f64; 2]) -> f64 {
    let slope = (value - milk_solids_value) / (protein - STD_PROTEIN_IN_MSNF);
    milk_solids_value + slope * (isolate_protein - STD_PROTEIN_IN_MSNF)
}

/// `value` rounded to the nearest multiple of `step`, e.g. a tenth of a percentage point for 0.001
pub(super) fn round_to(value: f64, step: f64) -> f64 {
    (value / step).round() * step
}

#[expect(clippy::cast_precision_loss, reason = "a handful of sources")]
pub(super) fn mean(values: &[f64]) -> f64 {
    values.iter().sum::<f64>() / values.len() as f64
}

/// `fraction` as a percentage, to two decimals
pub(super) fn percent(fraction: f64) -> String {
    format!("{:.2}", fraction * 100.0)
}

/// `fraction` as a signed percentage, to two decimals
pub(super) fn signed(fraction: f64) -> String {
    format!("{:+.2}", fraction * 100.0)
}

/// A row of the fit report, with each column as wide as the header's longest label
pub(super) fn report_row(name: &str, cells: [&str; 7]) -> String {
    let [
        protein,
        lactose,
        lactose_line,
        lactose_miss,
        minerals,
        minerals_line,
        minerals_miss,
    ] = cells;
    format!(
        "{name:<32} {protein:>7} | {lactose:>7} {lactose_line:>6} {lactose_miss:>6} | {minerals:>8} \
         {minerals_line:>6} {minerals_miss:>6}"
    )
}

/// The header row of the fit report
pub(super) fn report_header() -> String {
    report_row("% of solids non-fat", ["protein", "lactose", "line", "miss", "minerals", "line", "miss"])
}

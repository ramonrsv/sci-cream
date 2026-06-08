//! WASM/JS-facing view of balancing reports and issues.

use serde::Serialize;

use crate::balancing::{BalanceKey, BalancingReport, Severity};

#[cfg(doc)]
use crate::balancing::BalancingIssue;

/// A single balancing issue, flattened for the WASM/JS boundary.
///
/// Carries the issue's [`Severity`] as a string ("error" or "warning"), the [`BalanceKey`]s it
/// concerns (from [`BalancingIssue::affected_keys`]), and the human-readable text (from the issue's
/// [`Display`](std::fmt::Display) impl). Flattening here keeps the TS side from having to mirror
/// the Rust [`BalancingIssue`] variants — it renders this view directly.
#[derive(Serialize, Debug)]
pub struct BalancingIssueView {
    /// The severity of the issue, as a string ("error" or "warning").
    pub severity: &'static str,
    /// The keys this issue concerns, for relating it back to the offending target(s).
    pub keys: Vec<BalanceKey>,
    /// The human-readable message describing the issue.
    pub message: String,
}

/// The WASM/JS-facing form of a [`BalancingReport`]: a flat list of [`BalancingIssueView`]s.
#[derive(Serialize, Debug)]
pub struct BalancingReportView {
    /// The issues found in the report.
    pub issues: Vec<BalancingIssueView>,
}

impl From<&BalancingReport> for BalancingReportView {
    fn from(report: &BalancingReport) -> Self {
        let issues = report
            .issues
            .iter()
            .map(|issue| BalancingIssueView {
                severity: match issue.severity() {
                    Severity::Error => "error",
                    Severity::Warning => "warning",
                },
                keys: issue.affected_keys(),
                message: issue.to_string(),
            })
            .collect();
        Self { issues }
    }
}

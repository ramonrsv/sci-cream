//! WASM/JS-facing view of balancing reports and issues.

use serde::Serialize;
use serde_wasm_bindgen::Serializer;

use wasm_bindgen::prelude::*;

use crate::balancing::{
    BalanceKey, BalancingReport, Severity, get_all_balanceable_keys, get_all_native_balancing_keys,
    get_typical_balancing_keys,
};

#[cfg(doc)]
use crate::{balancing::BalancingIssue, properties::PropKey};

/// A single balancing issue, flattened for the WASM/JS boundary.
///
/// Carries the issue's [`Severity`] as a string ("error", "warning", or "information"), the
/// [`BalanceKey`]s it concerns (from [`BalancingIssue::affected_keys`]), and the human-readable text
/// (from the issue's [`Display`](std::fmt::Display) impl). Flattening here keeps the TS side from
/// having to mirror the Rust [`BalancingIssue`] variants — it renders this view directly.
#[derive(Serialize, Debug)]
pub struct BalancingIssueView {
    /// The severity of the issue, as a string ("error", "warning", or "information").
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
                    Severity::Info => "information",
                },
                keys: issue.affected_keys(),
                message: issue.to_string(),
            })
            .collect();
        Self { issues }
    }
}

fn serialize_balance_key(key: BalanceKey) -> JsValue {
    key.serialize(&Serializer::json_compatible())
        .expect("BalanceKey should be serializable to JSON-compatible JS value")
}

/// WASM compatible wrapper for [`get_all_balanceable_keys`], returning an array of JS `PropKey`s.
///
/// **Note**: This function returns enums as strings, directly usable as `PropKey`s on the JS
/// side; [`BalanceKey`]s, like [`PropKey`]s, cannot be directly represented in TypeScript.
#[wasm_bindgen(js_name = "get_all_balanceable_keys")]
#[must_use]
pub fn get_all_balanceable_keys_wasm() -> Vec<JsValue> {
    get_all_balanceable_keys()
        .into_iter()
        .map(serialize_balance_key)
        .collect()
}

/// WASM compatible wrapper for [`get_all_native_balancing_keys`], returning array of JS `PropKey`s.
///
/// **Note**: This function returns enums as strings, directly usable as `PropKey`s on the JS
/// side; [`BalanceKey`]s, like [`PropKey`]s, cannot be directly represented in TypeScript.
#[wasm_bindgen(js_name = "get_all_native_balancing_keys")]
#[must_use]
pub fn get_all_native_balancing_keys_wasm() -> Vec<JsValue> {
    get_all_native_balancing_keys()
        .into_iter()
        .map(serialize_balance_key)
        .collect()
}

/// WASM compatible wrapper for [`get_typical_balancing_keys`], returning an array of JS `PropKey`s.
///
/// **Note**: This function returns enums as strings, directly usable as `PropKey`s on the JS
/// side; [`BalanceKey`]s, like [`PropKey`]s, cannot be directly represented in TypeScript.
#[wasm_bindgen(js_name = "get_typical_balancing_keys")]
#[must_use]
pub fn get_typical_balancing_keys_wasm() -> Vec<JsValue> {
    get_typical_balancing_keys()
        .into_iter()
        .map(serialize_balance_key)
        .collect()
}

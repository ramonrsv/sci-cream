//! Intensive -> extensive translation of balancing targets before a solve.
//!
//! The solver can only encode extensive keys (weighted-sum rows) and ratio keys (homogeneous
//! rows). Targets on other intensive keys — [`CompKey::ABV`] and the [`FpdKey`]s — are translated
//! here to equivalent targets on their [`proxy`](BalanceKey::proxy) key:
//!
//! | Original target     | Proxy target | Value translation                                    |
//! |---------------------|--------------|------------------------------------------------------|
//! | `ABV`               | `Alcohol`    | [`abv_to_abw`]                                       |
//! | `FPD` = T           | `AbsPAC`     | [`compute_pac_from_fpd_curve_point`] at `(0, T)`     |
//! | `ServingTemp` = T   | `AbsNetPAC`  | [`compute_pac_from_fpd_curve_point`] at `(x_s, T)`   |
//! | `HardnessAt14C` = h | `AbsNetPAC`  | [`compute_pac_from_fpd_curve_point`] at `(h, −14°C)` |
//!
//! The FPD keys all invert the same forward curve relation, pinned at each key's defining
//! `(frozen water, fpd)` point — with `x_s` = [`SERVING_TEMP_X_AXIS`] and −14°C =
//! [`TARGET_SERVING_TEMP_14C`] — under the fixed methods of [`FPD::compute_from_composition`],
//! whose readings the translations exactly invert. The resulting PAC per 100 g of mix water is
//! precisely the proxy's ratio value: the total PAC for `AbsPAC` (frozen-water curve), and the
//! PAC net of the hardness factor for `AbsNetPAC` (hardness curve).

use std::collections::HashSet;

use crate::{
    balancing::{
        keys::BalanceKey,
        solve::Priority,
        validate::{BalancingIssue, append_input_error_issues},
    },
    composition::CompKey,
    constants::{
        density::abv_to_abw,
        fpd::{DEFAULT_FPD_CURVES_METHOD, DEFAULT_PAC_TO_FPD_METHOD, SERVING_TEMP_X_AXIS, TARGET_SERVING_TEMP_14C},
    },
    fpd::{FpdKey, compute_pac_from_fpd_curve_point},
};

#[cfg(doc)]
use crate::fpd::FPD;

/// The result of [`translate_balancing_targets`]: solver-ready targets plus the error issues
/// detected while translating.
#[derive(Debug, Clone, PartialEq)]
pub struct TranslatedTargets {
    /// Solver-ready fused targets: proxies substituted (each priority riding along with its
    /// target); targets flagged with a value issue or in a clashing group are dropped.
    pub targets: Vec<(BalanceKey, f64, Option<Priority>)>,
    /// Every error-severity issue found: input errors, domain errors, and proxy clashes.
    pub issues: Vec<BalancingIssue>,
}

/// Validates and translates balancing targets into their solver-ready form.
///
/// The single shared front door for [`balance_compositions`](super::balance_compositions) and
/// [`validate_balancing_targets`](super::validate_balancing_targets): both apply identical checks
/// in identical order through it, and every issue names the keys and values the caller passed.
///
/// Runs in four phases: the input error checks (non-finite/negative values, duplicate keys), the
/// translation domain checks ([`UntranslatableTarget`](BalancingIssue::UntranslatableTarget)),
/// clash detection over the resolved solver keys
/// ([`ProxyTargetClash`](BalancingIssue::ProxyTargetClash)), and finally the proxy value
/// substitution per the module table.
#[must_use]
pub fn translate_balancing_targets(targets: &[(BalanceKey, f64, Option<Priority>)]) -> TranslatedTargets {
    let mut issues = Vec::new();

    let plain: Vec<(BalanceKey, f64)> = targets.iter().map(|&(key, value, _)| (key, value)).collect();
    append_input_error_issues(&plain, &mut issues);

    for &(key, value) in &plain {
        if value.is_finite() && is_untranslatable(key, value) {
            issues.push(BalancingIssue::UntranslatableTarget { key, value });
        }
    }

    append_proxy_clash_issues(&plain, &mut issues);

    // Substitute proxies, dropping targets flagged with a value issue and every member of a
    // clashing group (ambiguous — no member can be preferred, and any surviving pair would raise
    // nonsense warnings against itself downstream). The flagged issues always gate the solve, so
    // the drops only shape the report-only validation path, mirroring how the warning checks
    // already skip non-finite targets. Same-key duplicates are kept, as before this layer.
    let dropped: HashSet<BalanceKey> = issues
        .iter()
        .flat_map(|issue| match issue {
            BalancingIssue::NonFiniteTarget { key, .. }
            | BalancingIssue::NegativeTarget { key, .. }
            | BalancingIssue::UntranslatableTarget { key, .. } => vec![*key],
            BalancingIssue::ProxyTargetClash { keys, .. } => keys.clone(),
            _ => vec![],
        })
        .collect();

    let targets = targets
        .iter()
        .filter(|(key, _, _)| !dropped.contains(key))
        .map(|&(key, value, priority)| {
            key.proxy()
                .map_or((key, value, priority), |proxy| (proxy, translate_target_value(key, value), priority))
        })
        .collect();

    TranslatedTargets { targets, issues }
}

/// Appends a [`ProxyTargetClash`](BalancingIssue::ProxyTargetClash) for each group of two or more
/// distinct target keys resolving to the same solver key (`proxy()`, or the key itself).
///
/// Purely key-level; values are irrelevant. Same-key repeats are already `DuplicateTarget`s and do
/// not additionally clash. Groups and their keys keep the input order.
fn append_proxy_clash_issues(targets: &[(BalanceKey, f64)], issues: &mut Vec<BalancingIssue>) {
    let mut groups: Vec<(BalanceKey, Vec<BalanceKey>)> = Vec::new();
    for &(key, _) in targets {
        let resolved = key.proxy().unwrap_or(key);
        match groups.iter_mut().find(|(proxy, _)| *proxy == resolved) {
            Some((_, keys)) => {
                if !keys.contains(&key) {
                    keys.push(key);
                }
            }
            None => groups.push((resolved, vec![key])),
        }
    }

    for (proxy, keys) in groups {
        if keys.len() >= 2 {
            issues.push(BalancingIssue::ProxyTargetClash { keys, proxy });
        }
    }
}

/// Returns `true` if a finite `value` is outside the domain `key`'s proxy translation is defined
/// on: a positive `FPD`/`ServingTemp` temperature, or a `HardnessAt14C` above 100.
///
/// Negative values for keys that must be non-negative (including `ABV` and `HardnessAt14C`) are
/// already flagged as [`NegativeTarget`](BalancingIssue::NegativeTarget) by the input checks.
const fn is_untranslatable(key: BalanceKey, value: f64) -> bool {
    match key {
        BalanceKey::Fpd(FpdKey::FPD | FpdKey::ServingTemp) => value > 0.0,
        BalanceKey::Fpd(FpdKey::HardnessAt14C) => value > 100.0,
        BalanceKey::Comp(_) | BalanceKey::Ratio(_) => false,
    }
}

/// The proxy target value for a `key` with a [`proxy`](BalanceKey::proxy), per the module table.
///
/// The value must already be domain-checked (see [`is_untranslatable`] and the input checks).
fn translate_target_value(key: BalanceKey, value: f64) -> f64 {
    #[expect(clippy::cast_precision_loss, reason = "SERVING_TEMP_X_AXIS is a small constant")]
    const SERVING_TEMP_X: f64 = SERVING_TEMP_X_AXIS as f64;

    // Matching the forward computation's methods keeps the point inversion exact.
    let pac_at = |frozen_water: f64, fpd: f64| {
        compute_pac_from_fpd_curve_point(frozen_water, fpd, DEFAULT_PAC_TO_FPD_METHOD, DEFAULT_FPD_CURVES_METHOD)
            .expect("translation domain checks admit only in-domain values")
    };

    match key {
        BalanceKey::Comp(CompKey::ABV) => abv_to_abw(value),
        BalanceKey::Fpd(FpdKey::FPD) => pac_at(0.0, value),
        BalanceKey::Fpd(FpdKey::ServingTemp) => pac_at(SERVING_TEMP_X, value),
        BalanceKey::Fpd(FpdKey::HardnessAt14C) => pac_at(value, TARGET_SERVING_TEMP_14C),
        BalanceKey::Comp(_) | BalanceKey::Ratio(_) => {
            unreachable!("only keys with a proxy have a translated target value")
        }
    }
}

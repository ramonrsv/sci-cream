//! Intensive -> extensive translation of balancing targets before a solve.
//!
//! The solver can only encode extensive keys (weighted-sum rows) and ratio keys (homogeneous
//! rows). Targets on other intensive keys — [`CompKey::ABV`] and the [`FpdKey`]s — are translated
//! here to equivalent targets on their [`proxy`](BalanceKey::proxy) key:
//!
//! | Original target            | Proxy target        | Value formula                            |
//! |----------------------------|---------------------|------------------------------------------|
//! | `ABV` = v                  | `Alcohol`           | `abv_to_abw(v)`                          |
//! | `FPD` = T                  | `AbsPAC`            | `pac(T)`                                 |
//! | `ServingTemp` = T          | `AbsNetPAC`         | `pac(T) · (100 − x_serve) / 100`         |
//! | `HardnessAt14C` = h        | `AbsNetPAC`         | `pac(−14) · (100 − h) / 100`             |
//!
//! where `pac` is [`get_pac_from_fpd_interpolation`] (the exact inverse of the forward FPD
//! computation, see [`FPD::compute_from_composition`] and [`PacToFpdMethod::Interpolation`]) and
//! `x_serve` is [`SERVING_TEMP_X_AXIS`], the frozen-water percentage whose hardness-curve
//! temperature defines the serving temperature. Each formula inverts the forward curve step (see
//! [`compute_fpd_curve_step_modified_goff_hartel_corvitto`]): at frozen-water percentage `x` the
//! curve reads `pac2fpd(NetPAC / Water · 100 · 100 / (100 − x))`, so a temperature target pins the
//! `AbsNetPAC` ratio (or `AbsPAC`, for the hardness-factor-free `FPD` at `x = 0`).

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
        fpd::{SERVING_TEMP_X_AXIS, TARGET_SERVING_TEMP_14C},
    },
    fpd::{FpdKey, get_pac_from_fpd_interpolation},
};

#[cfg(doc)]
use crate::fpd::{FPD, PacToFpdMethod, compute_fpd_curve_step_modified_goff_hartel_corvitto};

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
/// The value must already be domain-checked (see [`is_untranslatable`] and the input checks);
/// within the domain every translation is total.
fn translate_target_value(key: BalanceKey, value: f64) -> f64 {
    // Fraction of the mix's water still liquid at the serving-temperature frozen-water percentage.
    #[expect(clippy::cast_precision_loss, reason = "SERVING_TEMP_X_AXIS is a small constant")]
    const SERVING_TEMP_WATER_FRACTION: f64 = (100 - SERVING_TEMP_X_AXIS) as f64 / 100.0;

    let pac = |fpd: f64| get_pac_from_fpd_interpolation(fpd).expect("translation domain checks admit only fpd <= 0");

    match key {
        BalanceKey::Comp(CompKey::ABV) => abv_to_abw(value),
        BalanceKey::Fpd(FpdKey::FPD) => pac(value),
        BalanceKey::Fpd(FpdKey::ServingTemp) => pac(value) * SERVING_TEMP_WATER_FRACTION,
        BalanceKey::Fpd(FpdKey::HardnessAt14C) => pac(TARGET_SERVING_TEMP_14C) * (100.0 - value) / 100.0,
        BalanceKey::Comp(_) | BalanceKey::Ratio(_) => {
            unreachable!("only keys with a proxy have a translated target value")
        }
    }
}

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

use crate::{
    balancing::{keys::BalanceKey, solve::Priority},
    composition::CompKey,
    constants::{
        density::abv_to_abw,
        fpd::{DEFAULT_FPD_CURVES_METHOD, DEFAULT_PAC_TO_FPD_METHOD, SERVING_TEMP_X_AXIS, TARGET_SERVING_TEMP_14C},
    },
    fpd::{FpdKey, compute_pac_from_fpd_curve_point},
};

#[cfg(doc)]
use crate::fpd::FPD;

/// Translates balancing targets into their solver-ready form.
///
/// Pure substitution: each target on a key with a [`proxy`](BalanceKey::proxy) is replaced with
/// the equivalent target on that proxy per the module table, its priority riding along; native
/// targets pass through unchanged. Callers run the error checks first
/// (`append_target_error_issues` in the validate module) and exclude the flagged targets
/// (`dropped_target_keys`).
///
/// # Panics
///
/// Panics if a proxy key's target value is outside its translation domain (a check/translate
/// ordering bug in the caller, not a reachable input error).
#[must_use]
pub fn translate_balancing_targets(
    targets: &[(BalanceKey, f64, Option<Priority>)],
) -> Vec<(BalanceKey, f64, Option<Priority>)> {
    targets
        .iter()
        .map(|&(key, value, priority)| {
            key.proxy()
                .map_or((key, value, priority), |proxy| (proxy, translate_target_value(key, value), priority))
        })
        .collect()
}

/// The proxy target value for a `key` with a [`proxy`](BalanceKey::proxy), per the module table.
///
/// The value must already be error-checked (see `append_target_error_issues` in the validate mod).
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

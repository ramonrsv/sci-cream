//! Reconciles the micellar casein lines against the micellar casein compositions at hand.
//!
//! [`lactose_in_snf`], [`minerals_in_snf`], and [`casein_in_protein`] run from milk solids to the
//! `_IN_MCI` anchors, which average the lines through each complete composition, scaled to 100% of
//! its solids non-fat, at the protein of Ingredia's isolate, see the [`casein`] module. These
//! suites derive the anchors again from the compositions, and check the misses their docs describe.

#![cfg_attr(coverage, coverage(off))]

use crate::tests::asserts::*;

use crate::{
    constants::composition::dairy::{
        casein::{STD_CASEIN_PROTEIN_IN_MCI_PROTEIN, STD_LACTOSE_IN_MCI, STD_MINERALS_IN_MCI, STD_PROTEIN_IN_MCI},
        casein_in_protein, lactose_in_snf,
        milk::{STD_CASEIN_PROTEIN_IN_MSNF_PROTEIN, STD_LACTOSE_IN_MSNF, STD_MINERALS_IN_MSNF, STD_PROTEIN_IN_MSNF},
        minerals_in_snf,
    },
    specs::SolidsSource,
};

#[cfg(doc)]
use crate::constants::composition::dairy::casein;

/// A micellar casein composition as its source reports it, in g per 100 g.
#[derive(Copy, Clone)]
struct Reported {
    name: &'static str,
    water: f64,
    fat: f64,
    protein: f64,
    lactose: f64,
    ash: f64,
    /// Casein as a fraction of the total protein, where the source reports it
    casein: Option<f64>,
}

impl Reported {
    /// The solids non-fat, `100 - water - fat`
    fn snf(&self) -> f64 {
        100.0 - self.water - self.fat
    }

    /// Protein, lactose, and ash as fractions of the solids non-fat, scaled to sum to 1
    fn scaled(&self) -> [f64; 3] {
        let total = self.protein + self.lactose + self.ash;
        [self.protein / total, self.lactose / total, self.ash / total]
    }
}

/// The control of a pilot micellar casein concentrate 80 (Kommineni et al., 2022, Tables 1-2)[^101]
#[doc = include_str!("../../../../docs/references/index/101.md")]
const KOMMINENI: Reported = Reported {
    name: "Kommineni MCC 80, control",
    water: 4.49,
    fat: 2.98,
    protein: 79.25,
    lactose: 5.13,
    ash: 8.15,
    casein: Some(71.74 / 79.25),
};

/// Ingredia's Promilk 852B, a micellar casein concentrate (Eljabali et al., 2026, §2.1)[^108]
#[doc = include_str!("../../../../docs/references/index/108.md")]
const PROMILK: Reported = Reported {
    name: "Ingredia Promilk 852B",
    water: 5.0,
    fat: 1.5,
    protein: 81.5,
    lactose: 4.0,
    ash: 8.0,
    casein: Some(0.92),
};

/// Refit, a commercial concentrate, per 100 g of dry matter (Schulnies et al., 2023, Table 1)[^105]
#[doc = include_str!("../../../../docs/references/index/105.md")]
const REFIT: Reported = Reported {
    name: "FrieslandCampina Refit",
    water: 0.0,
    fat: 1.2,
    protein: 88.0,
    lactose: 3.0,
    ash: 7.7,
    casein: Some(82.7 / 88.0),
};

/// Ingredia's micellar casein isolate (Azevedo Scudeller et al., 2026, Table 1)[^107]
#[doc = include_str!("../../../../docs/references/index/107.md")]
const INGREDIA_ISOLATE: Reported = Reported {
    name: "Ingredia micellar casein isolate",
    water: 6.31,
    fat: 0.05,
    protein: 85.15,
    lactose: 1.48,
    ash: 7.33,
    casein: None,
};

/// A typical micellar casein concentrate, summing to 97.8% (USDEC, 2015, Figure 1, p. 1)[^100]
#[doc = include_str!("../../../../docs/references/index/100.md")]
const USDEC: Reported = Reported {
    name: "USDEC typical micellar casein concentrate",
    water: 5.0,
    fat: 1.0,
    protein: 83.0,
    lactose: 1.0,
    ash: 7.8,
    casein: None,
};

/// The compositions the `_IN_MCI` anchors average
const AVERAGED: [Reported; 4] = [KOMMINENI, PROMILK, REFIT, INGREDIA_ISOLATE];

/// The value at the isolate's protein, [`STD_PROTEIN_IN_MCI`], of the line from milk solids'
/// `milk_solids_value` through a source's `value` at its `protein`
fn extend_to_isolate(milk_solids_value: f64, [protein, value]: [f64; 2]) -> f64 {
    let slope = (value - milk_solids_value) / (protein - STD_PROTEIN_IN_MSNF);
    milk_solids_value + slope * (STD_PROTEIN_IN_MCI - STD_PROTEIN_IN_MSNF)
}

/// `value` rounded to the nearest multiple of `step`, e.g. a tenth of a percentage point for 0.001
fn round_to(value: f64, step: f64) -> f64 {
    (value / step).round() * step
}

#[expect(clippy::cast_precision_loss, reason = "a handful of sources")]
fn mean(values: &[f64]) -> f64 {
    values.iter().sum::<f64>() / values.len() as f64
}

/// `fraction` as a percentage, to two decimals
fn percent(fraction: f64) -> String {
    format!("{:.2}", fraction * 100.0)
}

/// `fraction` as a signed percentage, to two decimals
fn signed(fraction: f64) -> String {
    format!("{:+.2}", fraction * 100.0)
}

/// A row of the fit report, with each column as wide as the header's longest label
fn report_row(name: &str, cells: [&str; 7]) -> String {
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

/// A row of the casein share report, with each column as wide as the header's longest label
fn share_report_row(name: &str, [casein, line, miss]: [&str; 3]) -> String {
    format!("{name:<32} {casein:>6} {line:>6} {miss:>6}")
}

#[test]
fn micellar_casein_anchors_average_the_source_lines() {
    // The protein anchor is Ingredia's isolate's, to the nearest 0.1 percentage point
    let [isolate_protein, _, _] = INGREDIA_ISOLATE.scaled();
    assert_abs_diff_eq!(round_to(isolate_protein, 0.001), STD_PROTEIN_IN_MCI);

    // At that protein, the lines through each source average to the lactose and minerals anchors
    let lactose = mean(&AVERAGED.map(|source| {
        let [protein, lactose, _] = source.scaled();
        extend_to_isolate(STD_LACTOSE_IN_MSNF, [protein, lactose])
    }));
    let minerals = mean(&AVERAGED.map(|source| {
        let [protein, _, minerals] = source.scaled();
        extend_to_isolate(STD_MINERALS_IN_MSNF, [protein, minerals])
    }));
    assert_abs_diff_eq!(round_to(lactose, 0.001), STD_LACTOSE_IN_MCI);
    assert_abs_diff_eq!(round_to(minerals, 0.001), STD_MINERALS_IN_MCI);

    // Those that report a casein share average to the casein anchor, to the nearest point
    let casein_shares: Vec<f64> = AVERAGED
        .iter()
        .filter_map(|source| {
            let [protein, _, _] = source.scaled();
            source
                .casein
                .map(|casein| extend_to_isolate(STD_CASEIN_PROTEIN_IN_MSNF_PROTEIN, [protein, casein]))
        })
        .collect();
    assert_abs_diff_eq!(round_to(mean(&casein_shares), 0.01), STD_CASEIN_PROTEIN_IN_MCI_PROTEIN);
}

#[test]
fn micellar_casein_lines_fit_the_sources() {
    // The lactose line passes within 0.6 percentage points of each averaged composition, and the
    // minerals line misses it by as much the other way, as both close at 100% with its protein
    let mut lines = vec![report_row(
        "% of solids non-fat",
        ["protein", "lactose", "line", "miss", "minerals", "line", "miss"],
    )];

    for source in AVERAGED {
        let [protein, lactose, minerals] = source.scaled();
        let lactose_line = lactose_in_snf(protein, SolidsSource::MicellarCasein);
        let minerals_line = minerals_in_snf(protein, SolidsSource::MicellarCasein);
        let (lactose_miss, minerals_miss) = (lactose - lactose_line, minerals - minerals_line);

        lines.push(report_row(
            source.name,
            [
                &percent(protein),
                &percent(lactose),
                &percent(lactose_line),
                &signed(lactose_miss),
                &percent(minerals),
                &percent(minerals_line),
                &signed(minerals_miss),
            ],
        ));

        assert_le!(lactose_miss.abs(), 0.006, "{}: lactose misses by {lactose_miss:.4}", source.name);
        assert_abs_diff_eq!(minerals_miss, -lactose_miss);
    }

    insta::assert_snapshot!(lines.join("\n"));
}

#[test]
fn micellar_casein_share_line_fits_the_sources() {
    // The casein share line passes within 1.4 percentage points of each reported share
    let mut lines = vec![share_report_row("% of protein", ["casein", "line", "miss"])];

    for source in AVERAGED {
        let Some(casein) = source.casein else { continue };
        let [protein, _, _] = source.scaled();
        let line = casein_in_protein(protein, SolidsSource::MicellarCasein);
        let miss = casein - line;

        lines.push(share_report_row(source.name, [&percent(casein), &percent(line), &signed(miss)]));
        assert_le!(miss.abs(), 0.014, "{}: casein share misses by {miss:.4}", source.name);
    }

    insta::assert_snapshot!(lines.join("\n"));
}

#[test]
fn micellar_casein_line_overestimates_usdec_lactose_by_its_shortfall() {
    // USDEC's values leave 2.2 g of its solids non-fat unaccounted, and the lactose line gives it
    // as much more lactose than it lists, to within 0.02 percentage points, as if it were lactose
    let snf = USDEC.snf();
    let overestimate = lactose_in_snf(USDEC.protein / snf, SolidsSource::MicellarCasein) - USDEC.lactose / snf;
    let shortfall = 1.0 - (USDEC.protein + USDEC.lactose + USDEC.ash) / snf;
    assert_abs_diff_eq!(overestimate, shortfall, epsilon = 0.0002);
}

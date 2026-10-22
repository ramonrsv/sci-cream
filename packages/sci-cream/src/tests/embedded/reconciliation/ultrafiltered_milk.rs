//! Reconciles the milk solids lines against the milk protein concentrate compositions at hand.
//!
//! [`lactose_in_snf`] and [`minerals_in_snf`] run from milk solids to the `_IN_MPI` anchors, which
//! average the lines through each complete composition, scaled to 100% of its solids non-fat, at
//! the protein of McSweeney et al.'s concentrate, see the [`milk`] module. These suites derive the
//! anchors again from the compositions, and check the misses their docs describe.

#![cfg_attr(coverage, coverage(off))]
// _McSweeney_, _McCarthy_, and _VanWees_ false positives
#![expect(clippy::doc_markdown)]

use crate::tests::asserts::*;

use crate::{
    constants::composition::dairy::{
        lactose_in_snf,
        milk::{
            STD_LACTOSE_IN_MPI, STD_LACTOSE_IN_MSNF, STD_MINERALS_IN_MPI, STD_MINERALS_IN_MSNF, STD_PROTEIN_IN_MPI,
            STD_PROTEIN_IN_MSNF,
        },
        minerals_in_snf,
    },
    specs::SolidsSource,
};

#[cfg(doc)]
use crate::constants::composition::dairy::milk;

/// A milk protein concentrate composition as its source reports it, in g per 100 g.
#[derive(Copy, Clone)]
struct Reported {
    name: &'static str,
    protein: f64,
    lactose: f64,
    ash: f64,
}

impl Reported {
    /// Protein, lactose, and ash as fractions of the solids non-fat, scaled to sum to 1
    fn scaled(&self) -> [f64; 3] {
        let total = self.protein + self.lactose + self.ash;
        [self.protein / total, self.lactose / total, self.ash / total]
    }
}

/// A typical milk protein concentrate 85 (USDEC, 2018, Table 13, p. 35)[^113]
#[doc = include_str!("../../../../docs/references/index/113.md")]
const USDEC_85: Reported = Reported {
    name: "USDEC typical MPC 85",
    protein: 85.0,
    lactose: 3.2,
    ash: 6.6,
};

/// An ultrafiltered milk protein concentrate 85 (McSweeney et al., 2020, Table 1)[^106]
#[doc = include_str!("../../../../docs/references/index/106.md")]
const MCSWEENEY_85: Reported = Reported {
    name: "McSweeney MPC85",
    protein: 84.7,
    lactose: 1.37,
    ash: 6.88,
};

/// Idaho Milk Products' concentrate (VanWees et al., 2026, Table 1)[^115]
#[doc = include_str!("../../../../docs/references/index/115.md")]
const IDAHO: Reported = Reported {
    name: "Idaho Milk Products MPC 80",
    protein: 80.40,
    lactose: 6.59,
    ash: 6.89,
};

/// Hochdorf's Ledor MI 85T, whose moisture is not given (Seo & Oh, 2023, "Materials")[^116]
#[doc = include_str!("../../../../docs/references/index/116.md")]
const HOCHDORF: Reported = Reported {
    name: "Hochdorf Ledor MI 85T",
    protein: 81.0,
    lactose: 6.5,
    ash: 6.7,
};

/// The compositions the `_IN_MPI` anchors average
const AVERAGED: [Reported; 4] = [USDEC_85, MCSWEENEY_85, IDAHO, HOCHDORF];

/// McSweeney et al.'s lower-protein concentrates, their concentrate 85 diluted with milk permeate
/// (McSweeney et al., 2020, §2.1, Table 1)[^106]
#[doc = include_str!("../../../../docs/references/index/106.md")]
const MCSWEENEY_BLENDS: [Reported; 4] = [
    Reported {
        name: "McSweeney MPC75",
        protein: 74.1,
        lactose: 12.6,
        ash: 6.99,
    },
    Reported {
        name: "McSweeney MPC65",
        protein: 63.6,
        lactose: 22.8,
        ash: 7.17,
    },
    Reported {
        name: "McSweeney MPC55",
        protein: 53.7,
        lactose: 33.4,
        ash: 7.43,
    },
    Reported {
        name: "McSweeney MPC40",
        protein: 38.9,
        lactose: 48.2,
        ash: 7.82,
    },
];

/// USDEC's typical lower-protein concentrates, left out of the anchors
/// (USDEC, 2018, Table 13, p. 35)[^113]
#[doc = include_str!("../../../../docs/references/index/113.md")]
const USDEC_LOWER_GRADES: [Reported; 3] = [
    Reported {
        name: "USDEC typical MPC 70",
        protein: 70.0,
        lactose: 18.0,
        ash: 6.8,
    },
    Reported {
        name: "USDEC typical MPC 56",
        protein: 56.0,
        lactose: 32.0,
        ash: 6.8,
    },
    Reported {
        name: "USDEC typical MPC 42",
        protein: 42.0,
        lactose: 47.0,
        ash: 6.5,
    },
];

/// The value at the isolate's protein, [`STD_PROTEIN_IN_MPI`], of the line from milk solids'
/// `milk_solids_value` through a source's `value` at its `protein`
fn extend_to_isolate(milk_solids_value: f64, [protein, value]: [f64; 2]) -> f64 {
    let slope = (value - milk_solids_value) / (protein - STD_PROTEIN_IN_MSNF);
    milk_solids_value + slope * (STD_PROTEIN_IN_MPI - STD_PROTEIN_IN_MSNF)
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

/// The header row of the fit report
fn report_header() -> String {
    report_row("% of solids non-fat", ["protein", "lactose", "line", "miss", "minerals", "line", "miss"])
}

/// How far `source`'s lactose and minerals miss the milk lines, with its row of the fit report
fn misses(source: &Reported) -> ([f64; 2], String) {
    let [protein, lactose, minerals] = source.scaled();
    let lactose_line = lactose_in_snf(protein, SolidsSource::Milk);
    let minerals_line = minerals_in_snf(protein, SolidsSource::Milk);
    let (lactose_miss, minerals_miss) = (lactose - lactose_line, minerals - minerals_line);

    let row = report_row(
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
    );
    ([lactose_miss, minerals_miss], row)
}

#[test]
fn ultrafiltered_milk_anchors_average_the_source_lines() {
    // The protein anchor is McSweeney et al.'s concentrate's, to the nearest 0.1 percentage point
    let [mcsweeney_protein, _, _] = MCSWEENEY_85.scaled();
    assert_abs_diff_eq!(round_to(mcsweeney_protein, 0.001), STD_PROTEIN_IN_MPI);

    // At that protein, the lines through each source average to the lactose and minerals anchors
    let lactose = mean(&AVERAGED.map(|source| {
        let [protein, lactose, _] = source.scaled();
        extend_to_isolate(STD_LACTOSE_IN_MSNF, [protein, lactose])
    }));
    let minerals = mean(&AVERAGED.map(|source| {
        let [protein, _, minerals] = source.scaled();
        extend_to_isolate(STD_MINERALS_IN_MSNF, [protein, minerals])
    }));
    assert_abs_diff_eq!(round_to(lactose, 0.001), STD_LACTOSE_IN_MPI);
    assert_abs_diff_eq!(round_to(minerals, 0.001), STD_MINERALS_IN_MPI);
}

#[test]
fn ultrafiltered_milk_lines_fit_the_sources() {
    // The lactose line passes within 0.3 percentage points of each source, and the minerals line
    // misses each by as much the other way, as both close at 100% with its protein
    let mut lines = vec![report_header()];

    for source in AVERAGED.into_iter().chain(MCSWEENEY_BLENDS) {
        let ([lactose_miss, minerals_miss], row) = misses(&source);
        lines.push(row);

        assert_le!(lactose_miss.abs(), 0.003, "{}: lactose misses by {lactose_miss:.4}", source.name);
        assert_abs_diff_eq!(minerals_miss, -lactose_miss);
    }

    insta::assert_snapshot!(lines.join("\n"));
}

#[test]
fn ultrafiltered_milk_minerals_line_runs_above_usdec_lower_grades() {
    // USDEC lists nearly the same ash at every grade, 6.5-6.8 g, so its share of the solids non-fat
    // stays near the isolates' as protein falls, while the minerals line rises toward milk's,
    // running up to 1.1 percentage points above them, and the lactose line as far below
    let mut lines = vec![report_header()];

    for source in USDEC_LOWER_GRADES {
        let ([lactose_miss, minerals_miss], row) = misses(&source);
        lines.push(row);

        assert_lt!(minerals_miss, 0.0, "{}: minerals miss by {minerals_miss:.4}", source.name);
        assert_abs_diff_eq!(minerals_miss, -lactose_miss);
    }

    insta::assert_snapshot!(lines.join("\n"));
}

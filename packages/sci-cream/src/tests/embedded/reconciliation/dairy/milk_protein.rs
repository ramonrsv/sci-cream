//! Reconciles the milk solids lines against the milk protein concentrate compositions at hand.
//!
//! [`lactose_in_snf`] and [`minerals_in_snf`] run from milk solids to the `_IN_MPI` anchors, which
//! average the lines through each complete composition, scaled to 100% of its solids non-fat, at
//! the protein of McSweeney et al.'s concentrate, see the [`milk`] module. These suites derive the
//! anchors again from the compositions, and check the misses their docs describe.

#![cfg_attr(coverage, coverage(off))]
// _McSweeney_, _McCarthy_, and _VanWees_ false positives
#![expect(clippy::doc_markdown)]

use super::util::{extend_to_isolate, mean, misses, report_header, round_to};
use crate::tests::asserts::*;

use crate::{
    constants::composition::dairy::milk::{
        STD_LACTOSE_IN_MPI, STD_LACTOSE_IN_MSNF, STD_MINERALS_IN_MPI, STD_MINERALS_IN_MSNF, STD_PROTEIN_IN_MPI,
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
#[doc = include_str!("../../../../../docs/references/index/113.md")]
const USDEC_85: Reported = Reported {
    name: "USDEC typical MPC 85",
    protein: 85.0,
    lactose: 3.2,
    ash: 6.6,
};

/// An ultrafiltered milk protein concentrate 85 (McSweeney et al., 2020, Table 1)[^106]
#[doc = include_str!("../../../../../docs/references/index/106.md")]
const MCSWEENEY_85: Reported = Reported {
    name: "McSweeney MPC85",
    protein: 84.7,
    lactose: 1.37,
    ash: 6.88,
};

/// Idaho Milk Products' concentrate (VanWees et al., 2026, Table 1)[^115]
#[doc = include_str!("../../../../../docs/references/index/115.md")]
const IDAHO: Reported = Reported {
    name: "Idaho Milk Products MPC 80",
    protein: 80.40,
    lactose: 6.59,
    ash: 6.89,
};

/// Hochdorf's Ledor MI 85T, whose moisture is not given (Seo & Oh, 2023, "Materials")[^116]
#[doc = include_str!("../../../../../docs/references/index/116.md")]
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
#[doc = include_str!("../../../../../docs/references/index/106.md")]
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
#[doc = include_str!("../../../../../docs/references/index/113.md")]
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

#[test]
fn milk_protein_anchors_average_the_source_lines() {
    // The protein anchor is McSweeney et al.'s concentrate's, to the nearest 0.1 percentage point
    let [mcsweeney_protein, _, _] = MCSWEENEY_85.scaled();
    assert_abs_diff_eq!(round_to(mcsweeney_protein, 0.001), STD_PROTEIN_IN_MPI);

    // At that protein, the lines through each source average to the lactose and minerals anchors
    let lactose = mean(&AVERAGED.map(|source| {
        let [protein, lactose, _] = source.scaled();
        extend_to_isolate(STD_PROTEIN_IN_MPI, STD_LACTOSE_IN_MSNF, [protein, lactose])
    }));
    let minerals = mean(&AVERAGED.map(|source| {
        let [protein, _, minerals] = source.scaled();
        extend_to_isolate(STD_PROTEIN_IN_MPI, STD_MINERALS_IN_MSNF, [protein, minerals])
    }));
    assert_abs_diff_eq!(round_to(lactose, 0.001), STD_LACTOSE_IN_MPI);
    assert_abs_diff_eq!(round_to(minerals, 0.001), STD_MINERALS_IN_MPI);
}

#[test]
fn milk_protein_lines_fit_the_sources() {
    // The lactose line passes within 0.3 percentage points of each source, and the minerals line
    // misses each by as much the other way, as both close at 100% with its protein
    let mut lines = vec![report_header()];

    for source in AVERAGED.into_iter().chain(MCSWEENEY_BLENDS) {
        let ([lactose_miss, minerals_miss], row) = misses(source.name, source.scaled(), SolidsSource::Milk);
        lines.push(row);

        assert_le!(lactose_miss.abs(), 0.003, "{}: lactose misses by {lactose_miss:.4}", source.name);
        assert_abs_diff_eq!(minerals_miss, -lactose_miss);
    }

    insta::assert_snapshot!(lines.join("\n"));
}

#[test]
fn milk_protein_minerals_line_runs_above_usdec_lower_grades() {
    // USDEC lists nearly the same ash at every grade, 6.5-6.8 g, so its share of the solids non-fat
    // stays near the isolates' as protein falls, while the minerals line rises toward milk's,
    // running up to 1.1 percentage points above them, and the lactose line as far below
    let mut lines = vec![report_header()];

    for source in USDEC_LOWER_GRADES {
        let ([lactose_miss, minerals_miss], row) = misses(source.name, source.scaled(), SolidsSource::Milk);
        lines.push(row);

        assert_lt!(minerals_miss, 0.0, "{}: minerals miss by {minerals_miss:.4}", source.name);
        assert_abs_diff_eq!(minerals_miss, -lactose_miss);
    }

    insta::assert_snapshot!(lines.join("\n"));
}

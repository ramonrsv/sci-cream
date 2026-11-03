//! Helpers for the dairy specs' milk sugars, solids non-fat, and proteins.

use crate::{
    composition::{MilkProteins, Sugars},
    constants::composition::dairy::{
        SolidsSource, casein_in_protein, lactose_in_snf_coeffs,
        milk::{STD_CASEIN_PROTEIN_IN_MSNF_PROTEIN, STD_PROTEIN_IN_MSNF, STD_WHEY_PROTEIN_IN_MSNF_PROTEIN},
        minerals_in_snf_coeffs, unaccounted_in_snf_coeffs,
    },
    error::{Error, Result},
};

#[cfg(doc)]
use crate::constants::composition::dairy::{minerals_in_snf, unaccounted_in_snf};

/// Splits a total sugars content into lactose or glucose/galactose according to the `lactose_free`
///
/// If `lactose_free` is `false`, then it returns all lactose. If `true`, then a 50/50 glucose and
/// galactose mixture, the two monosaccharides that make up lactose, which is typical of
/// lactose-free products where lactose is enzymatically broken down into its constituent sugars.
pub(super) fn make_dairy_sugars(sugars: f64, lactose_free: bool) -> Sugars {
    if lactose_free {
        Sugars::new().glucose(sugars / 2.0).galactose(sugars / 2.0)
    } else {
        Sugars::new().lactose(sugars)
    }
}

/// Splits `sugars` into milk and other sugars, as `(milk_sugars, other_sugars)`
///
/// Lactose, glucose, and galactose are considered milk sugars; all others, e.g. sucrose, are not.
/// Lactose is a disaccharide composed of glucose and galactose, into which it is enzymatically
/// broken down in typical lactose-free products (Goff & Hartel, 2025, pp. 35, 422)[^20].
#[doc = include_str!("../../../docs/references/index/20.md")]
pub(super) const fn split_milk_sugars(sugars: Sugars) -> (Sugars, Sugars) {
    let milk_sugars = Sugars {
        lactose: sugars.lactose,
        glucose: sugars.glucose,
        galactose: sugars.galactose,
        ..Sugars::new()
    };
    let other_sugars = Sugars {
        lactose: 0.0,
        glucose: 0.0,
        galactose: 0.0,
        ..sugars
    };
    (milk_sugars, other_sugars)
}

/// Estimates the solids non-fat from their `sugars` and `protein`, adding `source`'s minerals and
/// unaccounted solids, see [`minerals_in_snf`] and [`unaccounted_in_snf`].
pub(super) const fn estimate_snf(sugars: f64, protein: f64, source: SolidsSource) -> f64 {
    // Solves `snf = sugars + protein + snf × (minerals + unaccounted)`, both fractions linear in
    // `protein / snf` and summing to `a + b × protein / snf`. Subbing in gives `snf = sugars +
    // protein + snf × (a + b × protein / snf)`, so `snf = (sugars + (1 + b) × protein) / (1 - a)`
    let [minerals_a, minerals_b] = minerals_in_snf_coeffs(source);
    let [unaccounted_a, unaccounted_b] = unaccounted_in_snf_coeffs(source);
    let (a, b) = (minerals_a + unaccounted_a, minerals_b + unaccounted_b);
    (sugars + (1.0 + b) * protein) / (1.0 - a)
}

/// Estimates the unaccounted solids in `snf` grams of `source`'s solids non-fat from its `protein`
pub(super) const fn estimate_unaccounted(snf: f64, protein: f64, source: SolidsSource) -> f64 {
    // The solids, `snf × unaccounted_in_snf(protein / snf, source)`, are `a × snf + b × protein`
    let [a, b] = unaccounted_in_snf_coeffs(source);
    a * snf + b * protein
}

/// Estimates the lactose in `snf` grams of `source`'s solids non-fat from their `protein` content
pub(super) const fn estimate_lactose(snf: f64, protein: f64, source: SolidsSource) -> f64 {
    // The lactose, `snf × lactose_in_snf(protein / snf, source)`, is `a × snf + b × protein`
    let [a, b] = lactose_in_snf_coeffs(source);
    a * snf + b * protein
}

/// Estimates the minerals in `snf` grams of `source`'s solids non-fat from their `protein` content
pub(super) const fn estimate_minerals(snf: f64, protein: f64, source: SolidsSource) -> f64 {
    // The minerals, `snf × minerals_in_snf(protein / snf, source)`, are `a × snf + b × protein`
    let [a, b] = minerals_in_snf_coeffs(source);
    a * snf + b * protein
}

/// Splits a total milk protein content into casein and whey according to the [`SolidsSource`], for
/// solids non-fat whose protein fraction is `protein_in_snf`
///
/// Milk solids carry the natural ~80/20 casein/whey split ([`STD_CASEIN_PROTEIN_IN_MSNF_PROTEIN`],
/// [`STD_WHEY_PROTEIN_IN_MSNF_PROTEIN`]); whey solids' proteins are entirely whey, and caseinate
/// solids' entirely casein. Micellar casein solids' casein share follows their protein fraction, of
/// at least milk solids' [`STD_PROTEIN_IN_MSNF`], along a line, see [`casein_in_protein`].
///
/// # Errors
///
/// Returns [`Error::UnsupportedComposition`] if micellar casein protein is below milk's, or NaN.
pub(crate) fn make_milk_proteins(total: f64, protein_in_snf: f64, source: SolidsSource) -> Result<MilkProteins> {
    Ok(match source {
        SolidsSource::Milk => MilkProteins::new()
            .casein(total * STD_CASEIN_PROTEIN_IN_MSNF_PROTEIN)
            .whey(total * STD_WHEY_PROTEIN_IN_MSNF_PROTEIN),
        SolidsSource::Whey => MilkProteins::new().whey(total),
        SolidsSource::Caseinate => MilkProteins::new().casein(total),
        SolidsSource::MicellarCasein => {
            // Below milk solids' protein, or NaN, the lines would give more whey than milk has
            if protein_in_snf.is_nan() || protein_in_snf < STD_PROTEIN_IN_MSNF {
                return Err(Error::UnsupportedComposition(format!(
                    "Micellar casein protein fraction {protein_in_snf} is below milk's {STD_PROTEIN_IN_MSNF}"
                )));
            }
            let casein = total * casein_in_protein(protein_in_snf, source);
            MilkProteins::new().casein(casein).whey(total - casein)
        }
    })
}

#[cfg(test)]
#[cfg_attr(coverage, coverage(off))]
mod tests {
    use crate::tests::asserts::shadow_asserts::assert_eq;
    #[expect(unused_imports)]
    use crate::tests::asserts::*;

    use super::*;
    use crate::composition::ScaleComponents;

    #[test]
    fn split_milk_sugars_by_type() {
        let sugars = Sugars::new()
            .lactose(1.0)
            .glucose(2.0)
            .galactose(3.0)
            .sucrose(4.0)
            .fructose(5.0)
            .maltose(6.0)
            .trehalose(7.0)
            .other(8.0);

        let (milk_sugars, other_sugars) = split_milk_sugars(sugars);

        assert_eq!(milk_sugars, Sugars::new().lactose(1.0).glucose(2.0).galactose(3.0));
        assert_eq!(
            other_sugars,
            Sugars::new()
                .sucrose(4.0)
                .fructose(5.0)
                .maltose(6.0)
                .trehalose(7.0)
                .other(8.0)
        );
        assert_eq!(milk_sugars.add(&other_sugars), sugars);
    }
}

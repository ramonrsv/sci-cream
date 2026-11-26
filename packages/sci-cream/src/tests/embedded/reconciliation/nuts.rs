//! Reconciles the hazelnut spreads against the nutrition tables their shares are fit to.
//!
//! Each spread is a [`CompositeSpec`] that takes the shares its label declares as given and fits
//! the rest to the label's table, per 100 g, so each figure must round to what the table prints or
//! fall within a ceiling sized to the fit's residual. Energy is excluded: the EU counts fiber at
//! 2 kcal/g, Lindt's label at 4, and the crate at 0.
//!
//! The North American labels are tabled per serving with their rounding, but not asserted, as
//! several of their figures sit on rounding boundaries.

#![cfg_attr(coverage, coverage(off))]

use crate::tests::{assets::get_comp_by_name, util::relative_error_percent};

use super::util::LabelRounding;
use crate::{
    composition::{CompKey, Composition},
    data::get_spec_entry_by_name,
    specs::{Basis, ComponentSource, IngredientSpec, SpecEntry, TaggedSpec},
};

#[cfg(doc)]
use crate::specs::CompositeSpec;

/// A figure a spread's label prints, in grams
#[derive(Copy, Clone, Debug)]
enum Figure {
    Fat,
    SaturatedFat,
    /// Carbohydrate without its fiber, as EU and UK labels print it
    AvailableCarbohydrate,
    /// Carbohydrate with its fiber, as US and Canadian labels print it
    TotalCarbohydrate,
    Fiber,
    Sugars,
    AddedSugars,
    Protein,
}

impl Figure {
    const fn name(self) -> &'static str {
        match self {
            Self::Fat => "fat",
            Self::SaturatedFat => "saturated fat",
            Self::AvailableCarbohydrate => "carbohydrate",
            Self::TotalCarbohydrate => "total carbs",
            Self::Fiber => "fiber",
            Self::Sugars => "sugars",
            Self::AddedSugars => "added sugars",
            Self::Protein => "protein",
        }
    }

    /// The figure per 100 g of the spread `name`, of composition `comp`
    fn modeled(self, name: &str, comp: &Composition) -> f64 {
        match self {
            Self::Fat => comp.get(CompKey::TotalFats),
            Self::SaturatedFat => comp.get(CompKey::SaturatedFat),
            Self::AvailableCarbohydrate => comp.get(CompKey::TotalCarbohydrates) - comp.get(CompKey::TotalFiber),
            Self::TotalCarbohydrate => comp.get(CompKey::TotalCarbohydrates),
            Self::Fiber => comp.get(CompKey::TotalFiber),
            Self::Sugars => comp.get(CompKey::TotalSugars),
            Self::AddedSugars => sucrose_share(name),
            Self::Protein => comp.get(CompKey::TotalProteins),
        }
    }

    /// Rounds the figure as a label in the `rounding` market prints it; saturated fat as fat
    fn rounded(self, rounding: LabelRounding, grams: f64) -> f64 {
        match self {
            Self::Fat | Self::SaturatedFat => rounding.fat(grams),
            Self::AvailableCarbohydrate | Self::TotalCarbohydrate | Self::Fiber | Self::Sugars | Self::AddedSugars => {
                rounding.carbohydrate(grams)
            }
            Self::Protein => rounding.protein(grams),
        }
    }
}

/// The share of the spread `name` that is its `Sucrose` component, the sugar it adds, in percent
fn sucrose_share(name: &str) -> f64 {
    let Ok(SpecEntry::Ingredient(IngredientSpec {
        spec: TaggedSpec::CompositeSpec(spec),
        ..
    })) = get_spec_entry_by_name(name)
    else {
        panic!("{name} is not a CompositeSpec");
    };
    let Basis::ByPercentage(components) = spec.components else {
        panic!("{name}'s components are not by percentage");
    };

    components
        .iter()
        .find_map(|(source, share)| matches!(source, ComponentSource::Named(n) if n == "Sucrose").then_some(*share))
        .unwrap_or_else(|| panic!("{name} has no Sucrose component"))
}

/// A figure a table prints, as `(figure, printed, ceiling)`, the ceiling on its relative error, in
/// percent, should it not round to the printed one
type TableFigure = (Figure, f64, f64);

/// A figure a label prints per serving, as `(figure, printed)`
type LabelFigure = (Figure, f64);

/// Each spread's EU or UK table per 100 g:
///
/// - Nutella's declared shares leave 2 points less for its sugar and palm oil than its sugars and
///   fat imply, so its fat reads low, and its saturated fat and protein high.
/// - Lindt's carbohydrate reads low and its sugars high, its cocoa held to the label's 11% minimum
///   of cocoa solids.
/// - Fiber reads high on both tables that print it, Nutella's by 21% and Nocciolata's by 7%.
const TABLES: &[(&str, &[TableFigure])] = &[
    // https://www.nutella.com/ma/en/products/nutella
    (
        "Nutella Hazelnut Spread with Cocoa",
        &[
            (Figure::Fat, 30.9, 5.0),
            (Figure::SaturatedFat, 10.6, 4.0),
            (Figure::AvailableCarbohydrate, 57.5, 1.0),
            (Figure::Fiber, 3.0, 21.0),
            (Figure::Sugars, 56.3, 1.5),
            (Figure::Protein, 6.3, 4.5),
        ],
    ),
    // https://www.lindt.co.uk/lindt-hazelnut-chocolate-spread-200g
    (
        "Lindt Hazelnut Milk Chocolate Spread",
        &[
            (Figure::Fat, 33.0, 0.0),
            (Figure::SaturatedFat, 4.7, 0.0),
            (Figure::AvailableCarbohydrate, 52.0, 4.5),
            (Figure::Sugars, 46.0, 1.5),
            (Figure::Protein, 9.2, 0.0),
        ],
    ),
    // https://www.rigonidiasiago.com/en-it/products/nocciolata-originale-250g
    (
        "Rigoni di Asiago Nocciolata",
        &[
            (Figure::Fat, 32.0, 0.0),
            (Figure::SaturatedFat, 5.7, 2.0),
            (Figure::AvailableCarbohydrate, 54.0, 0.0),
            (Figure::Fiber, 3.6, 7.5),
            (Figure::Sugars, 51.0, 0.0),
            (Figure::Protein, 8.1, 1.0),
        ],
    ),
];

/// Each spread's North American label, as `(spread, rounding, serving in grams, figures)`
const NORTH_AMERICAN_LABELS: &[(&str, LabelRounding, f64, &[LabelFigure])] = &[
    // https://www.ferrerofoodservice.com/ca/sites/ferrerofoodservice20_ca/files/2023-10/generic_nutella_sell_sheet_ca_1.23_2.pdf
    //
    // Ferrero's foodservice sell sheet, a US-format label made in Canada, per 2 tbsp
    (
        "Nutella Hazelnut Spread with Cocoa",
        LabelRounding::US,
        37.0,
        &[
            (Figure::Fat, 11.0),
            (Figure::SaturatedFat, 4.0),
            (Figure::TotalCarbohydrate, 22.0),
            (Figure::Fiber, 1.0),
            (Figure::Sugars, 21.0),
            (Figure::AddedSugars, 19.0),
            (Figure::Protein, 2.0),
        ],
    ),
    // https://www.lindt.ca/en/lindt-hazelnut-milk-chocolate-spread-200g
    //
    // The label photo in its gallery, per 1 tbsp
    (
        "Lindt Hazelnut Milk Chocolate Spread",
        LabelRounding::Canada,
        19.0,
        &[
            (Figure::Fat, 6.0),
            (Figure::SaturatedFat, 1.0),
            (Figure::TotalCarbohydrate, 11.0),
            (Figure::Fiber, 1.0),
            (Figure::Sugars, 9.0),
            (Figure::Protein, 2.0),
        ],
    ),
];

const HEADER: &str = "  [    figure    | printed | modeled | rounded |  diff  | error ]";

fn row(figure: Figure, printed: f64, modeled: f64, rounded: f64) -> String {
    let (diff, error) = (modeled - printed, relative_error_percent(modeled, printed));
    format!(
        "  {:<16}{printed:>7.2}   {modeled:>7.2}   {rounded:>7.2}   {diff:>+6.2}   {error:>+6.1}%",
        figure.name()
    )
}

/// Each of the [`TABLES`] spreads composes the figures its table prints, each rounding to the
/// printed one or within its ceiling; the snapshot tables each figure.
#[test]
#[allow(clippy::float_cmp)] // Rounding lands a figure on its label's own increments
fn hazelnut_spreads_reproduce_their_tables() {
    let mut lines = Vec::new();

    for &(name, figures) in TABLES {
        let comp = get_comp_by_name(name);
        lines.push(format!("{name}, per 100 g"));
        lines.push(HEADER.to_string());

        for &(figure, printed, ceiling) in figures {
            let modeled = figure.modeled(name, &comp);
            let rounded = figure.rounded(LabelRounding::EU, modeled);
            lines.push(row(figure, printed, modeled, rounded));

            let error = relative_error_percent(modeled, printed);
            assert!(
                rounded == printed || error.abs() <= ceiling,
                "{name}: {} of {modeled:.2} g prints as {rounded:.2}, not the table's {printed:.2} \
                 ({error:+.2}%, ceiling {ceiling:.2}%)",
                figure.name()
            );
        }

        lines.push(String::new());
    }

    insta::assert_snapshot!(lines.join("\n"));
}

/// The [`NORTH_AMERICAN_LABELS`], each figure per serving with its label's rounding, tabled by the
/// snapshot rather than asserted.
#[test]
fn hazelnut_spreads_table_their_north_american_labels() {
    let mut lines = Vec::new();

    for &(name, rounding, serving, figures) in NORTH_AMERICAN_LABELS {
        let comp = get_comp_by_name(name);
        lines.push(format!("{name}, per {serving} g ({rounding:?})"));
        lines.push(HEADER.to_string());

        for &(figure, printed) in figures {
            let modeled = figure.modeled(name, &comp) * serving / 100.0;
            lines.push(row(figure, printed, modeled, figure.rounded(rounding, modeled)));
        }

        lines.push(String::new());
    }

    insta::assert_snapshot!(lines.join("\n"));
}

<!-- markdownlint-disable MD041 -- files are concatenated together -->

## Milk Proteins

Milk proteins, casein and whey proteins, are tracked in
[`MilkProteins`](crate::composition::proteins::MilkProteins) and accessible via [`CompKey::Casein`],
[`CompKey::Whey`], and their total, [`CompKey::MilkProteins`].

### Crude and True Protein

Crude protein, also called total protein, is estimated from measuring the total nitrogen content of
milk, e.g. via Kjeldahl analysis, multiplied by 6.38 to express the results on a protein equivalent
basis (Barbano & Lynch, n.d.)[^109]. However, not all of the nitrogen in milk comes from protein.
Approximately 5 to 6% of the total nitrogen is non-protein nitrogen (NPN), about 50% of which is
from urea, the rest from other nitrogen-containing compounds such as creatine and creatinine
(Barbano & Lynch, n.d.)[^109], (DePeters & Ferguson, 1992, p. 3192)[^110]. Microfiltration allows
these nitrogen compounds to pass through the membrane, along with lactose and soluble minerals, so
micellar casein concentrates hold less of them (Kommineni et al., 2022, §1)[^101].

Crude protein is the basis for nutrition labeling (Barbano & Lynch, n.d.)[^109], and what the USDA's
FoodData Central database report as "protein", calculated from total nitrogen in both SR Legacy
(USDA, 2016, p. 12)[^111] and Foundation Foods (USDA, n.d., "Proximates")[^112]. Dairy protein
values throughout the crate are crude protein, made up of casein and whey together, including NPN.
Where a spec sheet lists its casein, whey takes the rest, see [`DairySheetSpec::casein`].

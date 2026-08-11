<!-- markdownlint-disable MD041 -- files are used to generate JSON, may also be concatenated -->

## Sucrose

```json
{
  "category": "Sweetener",
  "SweetenerSpec": {
    "sweeteners": { "sugars": { "sucrose": 100 } },
    "ByDryWeight": { "solids": 100 }
  }
}
```

## Dextrose

```json
{
  "category": "Sweetener",
  "SweetenerSpec": {
    "sweeteners": { "sugars": { "glucose": 100 } },
    "ByDryWeight": { "solids": 92 }
  }
}
```

Dextrose Powder (Monohydrate), typically with a moisture content of around 8% (Goff & Hartel, 2013,
Table 3.4, p. 67)[^2].

## Fructose

```json
{
  "category": "Sweetener",
  "SweetenerSpec": {
    "sweeteners": { "sugars": { "fructose": 100 } },
    "ByDryWeight": { "solids": 100 }
  }
}
```

## Lactose

```json
{
  "category": "Sweetener",
  "SweetenerSpec": {
    "sweeteners": { "sugars": { "lactose": 100 } },
    "ByDryWeight": { "solids": 100 }
  }
}
```

## Maltose

```json
{
  "category": "Sweetener",
  "SweetenerSpec": {
    "sweeteners": { "sugars": { "maltose": 100 } },
    "ByDryWeight": { "solids": 100 }
  }
}
```

## Trehalose

```json
{
  "category": "Sweetener",
  "SweetenerSpec": {
    "sweeteners": { "sugars": { "trehalose": 100 } },
    "ByDryWeight": { "solids": 100 }
  }
}
```

## Erythritol

```json
{
  "category": "Sweetener",
  "SweetenerSpec": {
    "sweeteners": { "polyols": { "erythritol": 100 } },
    "ByDryWeight": { "solids": 100 }
  }
}
```

## Maltitol

```json
{
  "category": "Sweetener",
  "SweetenerSpec": {
    "sweeteners": { "polyols": { "maltitol": 100 } },
    "ByDryWeight": { "solids": 100 }
  }
}
```

## Sorbitol

```json
{
  "category": "Sweetener",
  "SweetenerSpec": {
    "sweeteners": { "polyols": { "sorbitol": 100 } },
    "ByDryWeight": { "solids": 100 }
  }
}
```

## Xylitol

```json
{
  "category": "Sweetener",
  "SweetenerSpec": {
    "sweeteners": { "polyols": { "xylitol": 100 } },
    "ByDryWeight": { "solids": 100 }
  }
}
```

## Invert Sugar

```json
{
  "category": "Sweetener",
  "SweetenerSpec": {
    "sweeteners": { "sugars": { "glucose": 42.5, "fructose": 42.5, "sucrose": 15 } },
    "ByDryWeight": { "solids": 80 }
  }
}
```

Sources differ significantly on the exact composition and POD/PAC values. This is a middle ground
between various sources, including [Underbelly's sugars
chart](https://under-belly.org/wp-content/uploads/2016/05/sugars11.png), Ice Cream 7th Edition
(Table 3.4, page 67)[^20], and [Ice Cream Calculator](https://icecreamcalc.com/).

## Honey

```json
{
  "category": "Sweetener",
  "SweetenerSpec": {
    "sweeteners": {
      "sugars": { "glucose": 36, "fructose": 41, "sucrose": 2, "galactose": 1.5, "maltose": 1.5 }
    },
    "other_solids": 1,
    "ByTotalWeight": { "water": 17 }
  }
}
```

Composition values were taken from the sugar profile in
[Wikipedia](https://en.wikipedia.org/wiki/Honey#Nutrition), which roughly match those in _Glucose
Syrups_ (Hull, 2010, Appendix C: Sugars data, p. 325)[^15]. The resulting POD/PAC values roughly
align with those in [Underbelly's sugars
chart](https://under-belly.org/wp-content/uploads/2016/05/sugars11.png), Ice Cream 7th Edition
(Table 3.4, page 67), and [Ice Cream Calculator](https://icecreamcalc.com/), which differ slightly
among themselves.

## Maple Syrup

```json
{
  "category": "Sweetener",
  "SweetenerSpec": {
    "sweeteners": { "sugars": { "glucose": 0.65, "fructose": 0.35, "sucrose": 59 } },
    "other_carbohydrates": 7.5,
    "other_solids": 0.5,
    "ByTotalWeight": { "water": 32 }
  }
}
```

Composition from USDA FoodData Central - SR Legacy - [Syrup, maple,
Canadian](https://fdc.nal.usda.gov/food-details/170276/nutrients). These values roughly align with
the analysis in _Glucose Syrups_ (Hull, 2010, 'Maple Syrup', p. 326)[^15].

## Fancy Molasses

```json
{
  "category": "Sweetener",
  "SweetenerSpec": {
    "sweeteners": { "sugars": { "glucose": 12, "fructose": 12, "sucrose": 32 } },
    "other_carbohydrates": 20,
    "other_solids": 4,
    "ByTotalWeight": { "water": 20 }
  }
}
```

Composition values are roughly a middle ground between the nutrition facts for [Crosby's Fancy
Molasses](https://www.crosbys.com/product/#fancy-molasses-nutrition) and the nutrition analysis in
USDA FoodData Central - SR Legacy -
[Molasses](https://fdc.nal.usda.gov/food-details/168820/nutrients). These values roughly align with
the analysis in _Glucose Syrups_ (Hull, 2010, Table 12.1, p. 176)[^15].

## Maltodextrin 5 DE

```json
{
  "category": "Sweetener",
  "SweetenerSpec": {
    "sweeteners": { "sugars": { "glucose": 0.9, "maltose": 0.9 } },
    "other_carbohydrates": 98.2,
    "ByDryWeight": { "solids": 95 },
    "pod": { "OfSolids": 6 },
    "pac": { "OfSolids": { "molar_mass": 3600 } }
  }
}
```

Sugar spectra, molar mass, and POD values taken from _Glucose Syrups_ (Hull, 2010, Appendix C.1-3,
p. 321-323)[^15], and solids content from _Ice Cream 7th Edition_ (Goff & Hartel, 2013, Table 3.4,
p. 67)[^2]. See [Sweetness Values](crate::docs#sweetness-values) for a discussion on sweetness of
glucose syrups and powders.

## Maltodextrin 10 DE

```json
{
  "category": "Sweetener",
  "SweetenerSpec": {
    "sweeteners": { "sugars": { "glucose": 0.6, "maltose": 2.8 } },
    "other_carbohydrates": 96.6,
    "ByDryWeight": { "solids": 95 },
    "pod": { "OfSolids": 11 },
    "pac": { "OfSolids": { "molar_mass": 1800 } }
  }
}
```

Sugar spectra, molar mass, and POD values taken from _Glucose Syrups_ (Hull, 2010, Appendix C.1-3,
p. 321-323)[^15], and solids content from _Ice Cream 7th Edition_ (Goff & Hartel, 2013, Table 3.4,
p. 67)[^2]. See [Sweetness Values](crate::docs#sweetness-values) for a discussion on sweetness of
glucose syrups and powders.

## Maltodextrin 15 DE

```json
{
  "category": "Sweetener",
  "SweetenerSpec": {
    "sweeteners": { "sugars": { "glucose": 1.3, "maltose": 4.1 } },
    "other_carbohydrates": 94.6,
    "ByDryWeight": { "solids": 95 },
    "pod": { "OfSolids": 17 },
    "pac": { "OfSolids": { "molar_mass": 1200 } }
  }
}
```

Sugar spectra, molar mass, and POD values taken from _Glucose Syrups_ (Hull, 2010, Appendix C.1-3,
p. 321-323)[^15], and solids content from _Ice Cream 7th Edition_ (Goff & Hartel, 2013, Table 3.4,
p. 67)[^2]. See [Sweetness Values](crate::docs#sweetness-values) for a discussion on sweetness of
glucose syrups and powders.

## Maltodextrin 18 DE

```json
{
  "category": "Sweetener",
  "SweetenerSpec": {
    "sweeteners": { "sugars": { "glucose": 1.5, "maltose": 6.0 } },
    "other_carbohydrates": 92.5,
    "ByDryWeight": { "solids": 95 },
    "pod": { "OfSolids": 20 },
    "pac": { "OfSolids": { "molar_mass": 1000 } }
  }
}
```

Sugar spectra, molar mass, and POD values taken from _Glucose Syrups_ (Hull, 2010, Appendix C.1-3,
p. 321-323)[^15], and solids content from _Ice Cream 7th Edition_ (Goff & Hartel, 2013, Table 3.4,
p. 67)[^2]. See [Sweetness Values](crate::docs#sweetness-values) for a discussion on sweetness of
glucose syrups and powders. The sweetness value is for 'Maltodextrin - 19 DE', the closest in C.3.

## Glucose Syrup 20 DE

```json
{
  "category": "Sweetener",
  "SweetenerSpec": {
    "sweeteners": { "sugars": { "glucose": 2.0, "maltose": 10.0 } },
    "other_carbohydrates": 88,
    "ByDryWeight": { "solids": 80 },
    "pod": { "OfSolids": 23 },
    "pac": { "OfSolids": { "molar_mass": 900 } }
  }
}
```

Sugar spectra, molar mass, and POD values taken from _Glucose Syrups_ (Hull, 2010, Appendix C.1-3,
p. 321-323)[^15], and solids content from _Ice Cream 7th Edition_ (Goff & Hartel, 2013, Table 3.4,
p. 67)[^2]. See [Sweetness Values](crate::docs#sweetness-values) for a discussion on sweetness of
glucose syrups and powders. The sugar spectra is for 'Glucose syrup 28', the closest in C.1. The
POD value is for 'Glucose syrup solids - 20 DE' in C.3, equivalent since it's on a dry solids basis.

## Glucose Syrup 25 DE

```json
{
  "category": "Sweetener",
  "SweetenerSpec": {
    "sweeteners": { "sugars": { "glucose": 2.0, "maltose": 10.0 } },
    "other_carbohydrates": 88,
    "ByDryWeight": { "solids": 80 },
    "pod": { "OfSolids": 28 },
    "pac": { "OfSolids": { "molar_mass": 720 } }
  }
}
```

Sugar spectra, molar mass, and POD values taken from _Glucose Syrups_ (Hull, 2010, Appendix C.1-3,
p. 321-323)[^15], and solids content from _Ice Cream 7th Edition_ (Goff & Hartel, 2013, Table 3.4,
p. 67)[^2]. See [Sweetness Values](crate::docs#sweetness-values) for a discussion on sweetness of
glucose syrups and powders. The sugar spectra is for 'Glucose syrup 28', the closest in C.1. The
POD value is for 'Glucose syrup solids - 25 DE' in C.3, equivalent since it's on a dry solids basis.

## Glucose Syrup 28 DE

```json
{
  "category": "Sweetener",
  "SweetenerSpec": {
    "sweeteners": { "sugars": { "glucose": 2.0, "maltose": 10.0 } },
    "other_carbohydrates": 88,
    "ByDryWeight": { "solids": 80 },
    "pod": { "OfSolids": 30 },
    "pac": { "OfSolids": { "molar_mass": 643 } }
  }
}
```

Sugar spectra, molar mass, and POD values taken from _Glucose Syrups_ (Hull, 2010, Appendix C.1-3,
p. 321-323)[^15], and solids content from _Ice Cream 7th Edition_ (Goff & Hartel, 2013, Table 3.4,
p. 67)[^2]. See [Sweetness Values](crate::docs#sweetness-values) for a discussion on sweetness of
glucose syrups and powders.

## Glucose Syrup 33 DE

```json
{
  "category": "Sweetener",
  "SweetenerSpec": {
    "sweeteners": { "sugars": { "glucose": 11.0, "maltose": 12.0 } },
    "other_carbohydrates": 77,
    "ByDryWeight": { "solids": 80 },
    "pod": { "OfSolids": 40 },
    "pac": { "OfSolids": { "molar_mass": 545 } }
  }
}
```

Sugar spectra, molar mass, and POD values taken from _Glucose Syrups_ (Hull, 2010, Appendix C.1-3,
p. 321-323)[^15], and solids content from _Ice Cream 7th Edition_ (Goff & Hartel, 2013, Table 3.4,
p. 67)[^2]. See [Sweetness Values](crate::docs#sweetness-values) for a discussion on sweetness of
glucose syrups and powders. The sugar spectra is for 'Glucose syrup 35', the closest in C.1.

## Glucose Syrup 37 DE

```json
{
  "category": "Sweetener",
  "SweetenerSpec": {
    "sweeteners": { "sugars": { "glucose": 11.0, "maltose": 12.0 } },
    "other_carbohydrates": 77,
    "ByDryWeight": { "solids": 80 },
    "pod": { "OfSolids": 45 },
    "pac": { "OfSolids": { "molar_mass": 486 } }
  }
}
```

Sugar spectra, molar mass, and POD values taken from _Glucose Syrups_ (Hull, 2010, Appendix C.1-3,
p. 321-323)[^15], and solids content from _Ice Cream 7th Edition_ (Goff & Hartel, 2013, Table 3.4,
p. 67)[^2]. See [Sweetness Values](crate::docs#sweetness-values) for a discussion on sweetness of
glucose syrups and powders. The sugar spectra is for 'Glucose syrup 35', the closest in C.1.

## Glucose Syrup 42 DE

```json
{
  "category": "Sweetener",
  "SweetenerSpec": {
    "sweeteners": { "sugars": { "glucose": 19.0, "maltose": 14.0 } },
    "other_carbohydrates": 67,
    "ByDryWeight": { "solids": 80 },
    "pod": { "OfSolids": 50 },
    "pac": { "OfSolids": { "molar_mass": 429 } }
  }
}
```

Sugar spectra, molar mass, and POD values taken from _Glucose Syrups_ (Hull, 2010, Appendix C.1-3,
p. 321-323)[^15], and solids content from _Ice Cream 7th Edition_ (Goff & Hartel, 2013, Table 3.4,
p. 67)[^2]. See [Sweetness Values](crate::docs#sweetness-values) for a discussion on sweetness of
glucose syrups and powders.

## Glucose Syrup 49 DE

```json
{
  "category": "Sweetener",
  "SweetenerSpec": {
    "sweeteners": { "sugars": { "glucose": 26.0, "maltose": 17.0 } },
    "other_carbohydrates": 57,
    "ByDryWeight": { "solids": 80 },
    "pod": { "OfSolids": 56 },
    "pac": { "OfSolids": { "molar_mass": 367 } }
  }
}
```

Sugar spectra, molar mass, and POD values taken from _Glucose Syrups_ (Hull, 2010, Appendix C.1-3,
p. 321-323)[^15], and solids content from _Ice Cream 7th Edition_ (Goff & Hartel, 2013, Table 3.4,
p. 67)[^2]. See [Sweetness Values](crate::docs#sweetness-values) for a discussion on sweetness of
glucose syrups and powders. The sugar spectra is for 'Glucose syrup 50', the closest in C.1.

## Glucose Syrup 55 DE

```json
{
  "category": "Sweetener",
  "SweetenerSpec": {
    "sweeteners": { "sugars": { "glucose": 30.0, "maltose": 24.0 } },
    "other_carbohydrates": 46,
    "ByDryWeight": { "solids": 80 },
    "pod": { "OfSolids": 62 },
    "pac": { "OfSolids": { "molar_mass": 327 } }
  }
}
```

Sugar spectra, molar mass, and POD values taken from _Glucose Syrups_ (Hull, 2010, Appendix C.1-3,
p. 321-323)[^15], and solids content from _Ice Cream 7th Edition_ (Goff & Hartel, 2013, Table 3.4,
p. 67)[^2]. See [Sweetness Values](crate::docs#sweetness-values) for a discussion on sweetness of
glucose syrups and powders.

## Glucose Syrup 63 DE

```json
{
  "category": "Sweetener",
  "SweetenerSpec": {
    "sweeteners": { "sugars": { "glucose": 34.0, "maltose": 33.0 } },
    "other_carbohydrates": 33,
    "ByDryWeight": { "solids": 80 },
    "pod": { "OfSolids": 70 },
    "pac": { "OfSolids": { "molar_mass": 286 } }
  }
}
```

Sugar spectra, molar mass, and POD values taken from _Glucose Syrups_ (Hull, 2010, Appendix C.1-3,
p. 321-323)[^15], and solids content from _Ice Cream 7th Edition_ (Goff & Hartel, 2013, Table 3.4,
p. 67)[^2]. See [Sweetness Values](crate::docs#sweetness-values) for a discussion on sweetness of
glucose syrups and powders.

## Glucose Syrup

```json
{ "for": "Glucose Syrup 42 DE" }
```

'Glucose Syrup 42 DE' is the most common general-purpose glucose syrup, particularly of those
available to home cooks, and is often referred to as just 'Glucose Syrup'. @todo Source needed.

## High Fructose Corn Syrup 42

```json
{
  "category": "Sweetener",
  "SweetenerSpec": {
    "sweeteners": { "sugars": { "fructose": 42, "glucose": 52, "maltose": 4 } },
    "other_carbohydrates": 2,
    "ByDryWeight": { "solids": 77 },
    "pod": { "OfSolids": 95 },
    "pac": { "OfSolids": { "molar_mass": 190 } }
  }
}
```

Sugar spectra, molar mass, and POD values taken from _Glucose Syrups_ (Hull, 2010, Appendix C.1-3,
p. 321-323)[^15], and solids content from _Ice Cream 7th Edition_ (Goff & Hartel, 2013, Table 3.4,
p. 67)[^2]. See [Sweetness Values](crate::docs#sweetness-values) for a discussion on sweetness of
glucose syrups and powders.

## High Fructose Corn Syrup 55

```json
{
  "category": "Sweetener",
  "SweetenerSpec": {
    "sweeteners": { "sugars": { "fructose": 55, "glucose": 41, "maltose": 2 } },
    "other_carbohydrates": 2,
    "ByDryWeight": { "solids": 77 },
    "pod": { "OfSolids": 105 },
    "pac": { "OfSolids": { "molar_mass": 185 } }
  }
}
```

Sugar spectra, molar mass, and POD values taken from _Glucose Syrups_ (Hull, 2010, Appendix C.1-3,
p. 321-323)[^15], and solids content from _Ice Cream 7th Edition_ (Goff & Hartel, 2013, Table 3.4,
p. 67)[^2]. See [Sweetness Values](crate::docs#sweetness-values) for a discussion on sweetness of
glucose syrups and powders.

## High Fructose Corn Syrup 90

```json
{
  "category": "Sweetener",
  "SweetenerSpec": {
    "sweeteners": { "sugars": { "fructose": 80, "glucose": 18, "maltose": 1 } },
    "other_carbohydrates": 1,
    "ByDryWeight": { "solids": 77 },
    "pod": { "OfSolids": 135 },
    "pac": { "OfSolids": { "molar_mass": 182 } }
  }
}
```

Sugar spectra, molar mass, and POD values taken from _Glucose Syrups_ (Hull, 2010, Appendix C.1-3,
p. 321-323)[^15], and solids content from _Ice Cream 7th Edition_ (Goff & Hartel, 2013, Table 3.4,
p. 67)[^2]. See [Sweetness Values](crate::docs#sweetness-values) for a discussion on sweetness of
glucose syrups and powders. The sugar spectra and molar mass are for 'HFGS 80%' and 'High-fructose
glucose syrup - 80% FX', the closest in C.1 and C.2, respectively.

## HFCS 42

```json
{ "for": "High Fructose Corn Syrup 42" }
```

## HFCS 55

```json
{ "for": "High Fructose Corn Syrup 55" }
```

## HFCS 90

```json
{ "for": "High Fructose Corn Syrup 90" }
```

## Glucose Powder 25 DE

```json
{
  "category": "Sweetener",
  "SweetenerSpec": {
    "sweeteners": { "sugars": { "glucose": 2.0, "maltose": 10.0 } },
    "other_carbohydrates": 88,
    "ByDryWeight": { "solids": 95 },
    "pod": { "OfSolids": 28 },
    "pac": { "OfSolids": { "molar_mass": 720 } }
  }
}
```

This is a copy of 'Glucose Syrup 25 DE' but with the solids content adjusted to 95% to reflect spray
dried powder form. See the comments there for more details.

## Glucose Powder 42 DE

```json
{
  "category": "Sweetener",
  "SweetenerSpec": {
    "sweeteners": { "sugars": { "glucose": 19.0, "maltose": 14.0 } },
    "other_carbohydrates": 67,
    "ByDryWeight": { "solids": 95 },
    "pod": { "OfSolids": 50 },
    "pac": { "OfSolids": { "molar_mass": 429 } }
  }
}
```

This is a copy of 'Glucose Syrup 42 DE' but with the solids content adjusted to 95% to reflect spray
dried powder form. See the comments there for more details.

## Inulin Powder

```json
{
  "category": "Sweetener",
  "SweetenerSpec": {
    "sweeteners": { "sugars": { "glucose": 3, "fructose": 3, "sucrose": 3 } },
    "fiber": { "inulin": 91 },
    "ByDryWeight": { "solids": 98 }
  }
}
```

Properties taken from _Inulin and Oligofructose: What are they?_ (Niness, 1999)[^24], and moisture
content of commercial inulin powders from _Determination of total water content in inulin powder..._
(Ronkart, 2006)[^26]. Energy is calculated internally from values from the same sources (1.5kcal/g).
Minor POD and PAC contributions are automatically calculated from the small sugar fraction.

## HP Inulin Powder

```json
{
  "category": "Sweetener",
  "SweetenerSpec": { "sweeteners": {}, "fiber": { "inulin": 100 }, "ByDryWeight": { "solids": 98 } }
}
```

High-Performance (HP) Inulin Powder. _'This product is manufactured by removing the shorter-chain
molecules [in standard inulin]. (...) [It] provides almost twice the fat mimetic characteristics of
standard inulin with no sweetness contribution.'_ Properties taken from _Inulin and Oligofructose:
What are they?_ (Niness, 1999)[^24], and moisture content of commercial inulin powders from
_Determination of total water content in inulin powder..._ (Ronkart, 2006)[^26]. Energy is
calculated internally from values from the same sources (1.5kcal/g).

## Oligofructose Powder

```json
{
  "category": "Sweetener",
  "SweetenerSpec": {
    "sweeteners": { "sugars": { "glucose": 1.67, "fructose": 1.67, "sucrose": 1.66 } },
    "fiber": { "oligofructose": 95 },
    "ByDryWeight": { "solids": 98 }
  }
}
```

Properties taken from _Inulin and Oligofructose: What are they?_ (Niness, 1999)[^24], and moisture
content of commercial powders from _Determination of total water content in inulin powder..._
(Ronkart, 2006)[^26]. Energy is calculated internally from values from the same sources (1.5kcal/g).
POD contributions are calculated internally with values from the same sources (oligofructose solids
have a POD of ~40).

## Splenda (Sucralose)

```json
{
  "category": "Sweetener",
  "SweetenerSpec": {
    "sweeteners": { "sugars": { "glucose": 55 }, "artificial": { "sucralose": 1.32 } },
    "other_carbohydrates": 38.68,
    "ByTotalWeight": { "water": 5 },
    "pod": { "OfWhole": 840 },
    "pac": { "OfWhole": { "grams": 112.6 } }
  }
}
```

Source: [splenda.com](https://www.splenda.com/product/splenda-sweetener-packets/).

POD value taken from the manufacturer's suggested 2tsp:1packet sugar to sweetener conversion, where
a teaspoon of granulated sugar is 4.2g (see
[`crate::constants::density::GRAMS_IN_TEASPOON_OF_SUGAR`]) and a packet is 1g (from the
manufacturer's packaging and empirically measured with a 0.01g precision scale). The composition is
inferred from the ingredient list, assuming 55% dextrose, ~40% maltodextrin, 5% water, and enough
sucralose to reach a POD of 840 (works out to ~1.32% using a POD of 11 for maltodextrin). PAC is
calculated for 55% dextrose and 40% Maltodextrin 10 DE with a PAC of 18. Energy is calculated
internally from the composition.

## Splenda (Stevia)

```json
{
  "category": "Sweetener",
  "SweetenerSpec": {
    "sweeteners": { "polyols": { "erythritol": 99.9 }, "artificial": { "steviosides": 0.1 } },
    "ByDryWeight": { "solids": 100 },
    "pod": { "OfWhole": 200 }
  }
}
```

Source: [splenda.com](https://www.splenda.com/product/splenda-stevia-sweetener-jar/).

POD value taken from the manufacturer's suggested 2:1 sugar to sweetener conversion. Energy and PAC
are calculated internally from the composition (virtually all erythritol), taken from the
manufacturer's nutrition facts and ingredient list.

## Splenda (Monk Fruit)

```json
{
  "category": "Sweetener",
  "SweetenerSpec": {
    "sweeteners": { "polyols": { "erythritol": 99.9 }, "artificial": { "mogrosides": 0.1 } },
    "ByDryWeight": { "solids": 100 },
    "pod": { "OfWhole": 100 }
  }
}
```

Source: [splenda.ca](https://www.splenda.ca/product/splenda-monk-fruit-sweetener-19-oz-jar/).

POD value taken from the manufacturer's suggested 1:1 sugar to sweetener conversion. Energy and PAC
are calculated internally from the composition (virtually all erythritol), taken from the
manufacturer's nutrition facts and ingredient list.

## SweetLeaf Stevia

```json
{
  "category": "Sweetener",
  "SweetenerSpec": {
    "sweeteners": {
      "sugars": { "glucose": 2, "fructose": 2, "sucrose": 2 },
      "artificial": { "steviosides": 5 }
    },
    "fiber": { "inulin": 89 },
    "ByDryWeight": { "solids": 98 },
    "pod": { "OfWhole": 1050 }
  }
}
```

Source:
[sweetleaf.com](https://www.sweetleaf.com/products/natural-stevia-sweetener-packets-70-count/).

POD value taken from the manufacturer's suggested 2tsp:1packet sugar to sweetener conversion, where
a teaspoon of granulated sugar is 4.2g (see
[`crate::constants::density::GRAMS_IN_TEASPOON_OF_SUGAR`]) and a packet is 0.8g (from the
manufacturer's packaging and empirically measured with a 0.01g precision scale). Composition is
inferred from the ingredient list as enough steviosides to reach a POD of 1050, and the rest Inulin
(regular, not high-performance, with a small sugar fraction). Energy and a minor PAC contribution
are calculated internally from the composition.

## Sugar Twin

```json
{
  "category": "Sweetener",
  "SweetenerSpec": {
    "sweeteners": { "sugars": { "glucose": 61 }, "artificial": { "cyclamate": 33 } },
    "ByTotalWeight": { "water": 6 },
    "pod": { "OfWhole": 1050 }
  }
}
```

Source: [sugartwin.ca](https://sugartwin.ca/product/sachets/).

POD value taken from the manufacturer's suggested 2tsp:1packet sugar to sweetener conversion, where
a teaspoon of granulated sugar is 4.2g (see
[`crate::constants::density::GRAMS_IN_TEASPOON_OF_SUGAR`]) and a packet is 0.8g (from the
manufacturer's packaging and empirically measured with a 0.01g precision scale). Composition is
taken from the ingredient list, which specifies dextrose 66% and sodium cyclamate 33%. Energy and
PAC contributions are calculated internally from the composition.

## Stevia In The Raw (Packets)

```json
{
  "category": "Sweetener",
  "SweetenerSpec": {
    "sweeteners": { "sugars": { "glucose": 89 }, "artificial": { "steviosides": 3.4 } },
    "ByTotalWeight": { "water": 7.6 },
    "pod": { "OfWhole": 840 }
  }
}
```

Source: [intheraw.com](https://www.intheraw.com/using-itr/product/stevia-in-the-raw-packets/).

POD value taken from the manufacturer's suggested 2tsp:1packet sugar to sweetener conversion, where
a teaspoon of granulated sugar is 4.2g (see
[`crate::constants::density::GRAMS_IN_TEASPOON_OF_SUGAR`]) and a packet is 1g (from the
manufacturer's packaging and empirically measured with a 0.01g precision scale). The composition is
inferred from the ingredient list as enough steviosides to reach a POD of 840, and the rest dextrose
with 8% moisture content. Energy and PAC contributions are calculated internally from the
composition.

## Stevia In The Raw (Bakers Bag)

```json
{
  "category": "Sweetener",
  "SweetenerSpec": {
    "sweeteners": { "artificial": { "steviosides": 3.45 } },
    "other_carbohydrates": 91.55,
    "ByTotalWeight": { "water": 5 },
    "pod": { "OfWhole": 775 },
    "pac": { "OfSolids": { "molar_mass": 1800 } }
  }
}
```

Source: [intheraw.com](https://www.intheraw.com/using-itr/product/stevia-in-the-raw-bakers-bag/).

POD value taken from the manufacturer's suggested 1:1 sugar to sweetener conversion _by volume_,
which was measured as 1:7.75 by weight. The composition is inferred from the ingredient list as
enough steviosides to reach a POD of 775, and the rest maltodextrin. PAC is calculated as all
Maltodextrin 10 DE, with a molar mass of 1800. Energy is calculated internally from the composition.

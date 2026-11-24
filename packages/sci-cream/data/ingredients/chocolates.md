<!-- markdownlint-disable MD033 -- needed for <code> equations with linked constants -->

# Chocolates

These are chocolate and cocoa powder ingredients, defined using one of [`ChocolateSpec`],
[`CocoaPowderSpec`], or [`ChocolateLabelSpec`]. **Simple specs** are simplified and idealized
generic ingredients. Whilst they don't represent a particular real product, they are good
representations of typical products for each class, and are considered the canonical generic
option. They use either [`ChocolateSpec`] or [`CocoaPowderSpec`], e.g. "70% Dark Chocolate",
"Cocoa Powder, 10/12% Fat", etc.

For real products, which spec is used depends on the available information, preferring the most
detailed source a product has. In descending order of preference:

- **Specification sheets** are the preferred source, whenever one is available - they are usually
  hosted by distributors. EU sheets state the cocoa solids, milk solids, fat, and sugar directly,
  while US sheets give only a cocoa content and a nutrition panel. Product pages often quote minima,
  the sheet's value less its tolerance. These values translate to the spec fields relatively
  trivially, using [`ChocolateSpec`] or [`CocoaPowderSpec`], e.g. "Callebaut 811 Dark Chocolate",
  "Callebaut 823 Milk Chocolate", "Callebaut 10/12 Natural Cocoa Powder", etc.
- **Nutrient databases**, such as [USDA FoodData Central](https://fdc.nal.usda.gov/), are not as
  useful as specification sheets, since they don't provide a breakdown of cocoa and milk solids.
  However, they provide detailed and mostly _measured_ nutrition information, which allows them to
  be the source of the standard cocoa fractions used in the internal model. Dark chocolate and cocoa
  powder listings carry over their fat, and their sugars or water respectively, where the cocoa
  solids are all that isn't sugars or water; chocolates don't model water. Milk and white chocolate
  entries estimate their cocoa and milk solids, which the listings don't provide, via
  [`estimate_chocolate_snf_split_from_protein_by_fiber`], and their sugars exclude the lactose those
  milk solids carry. They use either [`ChocolateSpec`] or [`CocoaPowderSpec`], e.g. "USDA Dark
  Chocolate, 70-85% Cacao Solids", "USDA Milk Chocolate", etc.
- **Nutrition labels** are the most widely available information, but also the least detailed and
  precise. They can be used, via [`ChocolateLabelSpec`], when no better source is available. Dark
  chocolate labels often declare a cocoa solids content, usually as a minimum, and milk and white
  chocolate ones less often. EU labels must declare a dark or milk chocolate's minimum cocoa solids
  (Directive 2000/36/EC, 2000, Article 3(3))[^84], and UK ones a milk chocolate's minimum milk
  solids as well (SI 2003/1659, 2003, regulation 6(1)(c)-(d))[^134]. Labels in some jurisdictions
  round coarsely, which can be a significant source of inaccuracy: in the US, fat between 0.5 and 5
  g is declared to the nearest 0.5 g, and under 0.5 g as 0 (U.S. FDA, CFR 21, 101.9(c)(2))[^123], so
  a 5 g serving's _"0.5 g"_ covers anything from 10% to 15% fat.

A few notes and clarifications about the entries in this list:

- Corvitto entries are generic ingredients, like the simple specs, but with the compositions stated
  in _I Segreti del Gelato (Secrets of Ice-Cream)_ (Corvitto, 2005)[^3].
- Callebaut entries take fat from the sheet's total, and cocoa butter as the total less the milk fat
  rather than the cocoa solids less the cocoa solids non-fat, which can differ by rounding.
- Callebaut's nutritional data is _"by calculation based on literature data"_ rather than measured,
  so entries leave it out, as it would only swap the standard fractions for the vendor's own.
- A cocoa powder's _"100%"_ means pure cocoa, i.e. no other ingredients, rather than a declared
  content, as an actual 100% would leave no room for its water.
- US and Canadian labels include fiber in the carbohydrate (U.S. FDA, CFR 21, 101.9(c)(6))[^123],
  (CFIA, n.d., "Carbohydrates")[^125], while EU and UK labels print available carbohydrate
  (Regulation (EU) No 1169/2011, 2011, Annex I 7., Article 30(2))[^126], (Regulation (EU) No
  1169/2011, n.d., Annex I 7., Article 30(2))[^127], with fiber beside it if they declare it at all.

## 50% Dark Chocolate

```json
{ "category": "Chocolate", "ChocolateSpec": { "cocoa_solids": 50, "sugars": 50 } }
```

## 55% Dark Chocolate

```json
{ "category": "Chocolate", "ChocolateSpec": { "cocoa_solids": 55, "sugars": 45 } }
```

## 60% Dark Chocolate

```json
{ "category": "Chocolate", "ChocolateSpec": { "cocoa_solids": 60, "sugars": 40 } }
```

## 65% Dark Chocolate

```json
{ "category": "Chocolate", "ChocolateSpec": { "cocoa_solids": 65, "sugars": 35 } }
```

## 70% Dark Chocolate

```json
{ "category": "Chocolate", "ChocolateSpec": { "cocoa_solids": 70, "sugars": 30 } }
```

## 75% Dark Chocolate

```json
{ "category": "Chocolate", "ChocolateSpec": { "cocoa_solids": 75, "sugars": 25 } }
```

## 80% Dark Chocolate

```json
{ "category": "Chocolate", "ChocolateSpec": { "cocoa_solids": 80, "sugars": 20 } }
```

## 85% Dark Chocolate

```json
{ "category": "Chocolate", "ChocolateSpec": { "cocoa_solids": 85, "sugars": 15 } }
```

## 90% Dark Chocolate

```json
{ "category": "Chocolate", "ChocolateSpec": { "cocoa_solids": 90, "sugars": 10 } }
```

## 95% Dark Chocolate

```json
{ "category": "Chocolate", "ChocolateSpec": { "cocoa_solids": 95, "sugars": 5 } }
```

## 100% Dark Chocolate

```json
{ "category": "Chocolate", "ChocolateSpec": { "cocoa_solids": 100 } }
```

## Cocoa Powder, 10% Fat

```json
{ "category": "Chocolate", "CocoaPowderSpec": { "cocoa_butter": 10 } }
```

## Cocoa Powder, 13% Fat

```json
{ "category": "Chocolate", "CocoaPowderSpec": { "cocoa_butter": 13 } }
```

## Cocoa Powder, 15% Fat

```json
{ "category": "Chocolate", "CocoaPowderSpec": { "cocoa_butter": 15 } }
```

## Cocoa Powder, 17% Fat

```json
{ "category": "Chocolate", "CocoaPowderSpec": { "cocoa_butter": 17 } }
```

## Cocoa Powder, 20% Fat

```json
{ "category": "Chocolate", "CocoaPowderSpec": { "cocoa_butter": 20 } }
```

## Cocoa Powder, 22% Fat

```json
{ "category": "Chocolate", "CocoaPowderSpec": { "cocoa_butter": 22 } }
```

## Cocoa Powder, 24% Fat

```json
{ "category": "Chocolate", "CocoaPowderSpec": { "cocoa_butter": 24 } }
```

## Cocoa Powder, 10/12% Fat

```json
{ "category": "Chocolate", "CocoaPowderSpec": { "cocoa_butter": 11 } }
```

Cocoa powder in the 10-12% cocoa butter content range, a typical grade used in commercial products,
e.g. [Callebaut Natural Cocoa Powder -
10/12](https://www.callebaut.com/en-US/products/callebaut/natural-cocoa-powder/NCP-10C101-CAL-A99).

It has different classifications depending on the regulatory jurisdiction. Its 10% floor matches the
FDA's "cocoa" or "medium fat cocoa" designation, below which it would be "lowfat cocoa" (U.S. FDA,
CFR 21, 163.113-114)[^86]. Being below 20%, it falls within the EU's "fat-reduced cocoa" designation
(Directive 2000/36/EC, 2000, Annex I 2.)[^84]. Due to the challenges of achieving less than 10%
cocoa butter content, this is the leanest grade found in commonly sold commercial products, and can
be considered medium (Kuehn, 2021)[^88] or low-fat (CFW Blog, 2025)[^89] content.

The spec uses 11% cocoa butter content, the grade's midpoint, matching the _"TOTAL FAT 11.0 g"_ of
Callebaut's [10/12 Natural spec
sheet](https://linneasinc.com/wp-content/uploads/2025/11/6-NCP1012-SPEC.pdf).

## Cocoa Powder, 20/22% Fat

```json
{ "category": "Chocolate", "CocoaPowderSpec": { "cocoa_butter": 21 } }
```

Cocoa powder in the 20-22% cocoa butter content range, a typical grade used in commercial products,
e.g. [Callebaut Botanical Décor Cacao
Powder](https://www.callebaut.com/en/products/callebaut/botanical-decor-cacao-en-polvo-callebaut/DCP-20BODEC-89B).

It has different classifications depending on the regulatory jurisdiction. Its 20% floor matches the
EU's "cocoa powder" designation, below which it would be "fat-reduced cocoa" (Directive 2000/36/EC,
2000, Annex I 2.)[^84]. Being below 22%, it falls within the FDA's "cocoa" or "medium fat cocoa"
designation (U.S. FDA, CFR 21, 163.113)[^86].

The spec uses 21% cocoa butter content, the grade's midpoint, matching the _"TOTAL FAT 21.0 g"_ of
Cacao Barry's [Décor Cacao spec
sheet](https://www.cfw.co.uk/Media/PDF%20Spec%20Sheets/Cacao%20Barry/Spec-Sheet-Cacao-Barry-Cocoa-Powder-Decor-1kg-%28DCP-20DECOR-E0-89B%29.pdf).

## Cocoa Powder, 22/24% Fat

```json
{ "category": "Chocolate", "CocoaPowderSpec": { "cocoa_butter": 23 } }
```

Cocoa powder in the 22-24% cocoa butter content range, a typical grade used in commercial products,
e.g. [Callebaut Botanical Extra Brute
Powder](https://www.callebaut.com/en/products/callebaut/callebaut-selection-botanical-extra-brute-powder/DCP-22BOEXB-89B).

It has different classifications depending on the regulatory jurisdiction. Its 22% floor matches the
FDA's "breakfast cocoa" or "high fat cocoa" designation, below which it would be "cocoa" (U.S. FDA,
CFR 21, 163.112-113)[^86]. Being above 20%, it falls within the EU's "cocoa powder" designation
(Directive 2000/36/EC, 2000, Annex I 2.)[^84]. It is the grade most commonly used in ice-cream
making (Corvitto, 2005, p. 249)[^3], and is consistently considered high-fat content
(Kuehn, 2021)[^88], (CFW Blog, 2025)[^89].

The spec uses 23% cocoa butter content, the grade's midpoint, matching the _"TOTAL FAT 23.0 g"_ of
Callebaut's spec sheets for [Botanical Extra
Brute](https://www.cfw.co.uk/Media/PDF%20Spec%20Sheets/Callebaut/Spec-Sheet-Callebaut-Botanical-Extra-Brute-Cocoa-Powder-1kg%20%28DCP-22BOEXB-E0-89B%29.pdf)
and [Zestina Plein
Arôme](https://www.cfw.co.uk/Media/PDF%20Spec%20Sheets/Callebaut/Spec-Sheet-Callebaut-Zestina-Plein-Arome-1kg%20%28DCP-22ZEPLA-E0-89B%29.pdf).

## Cocoa Butter

```json
{ "category": "Chocolate", "ChocolateSpec": { "cocoa_solids": 100, "total_fat": 100 } }
```

Cocoa butter is _"the fat obtained from cocoa beans or parts of cocoa beans"_, whose free fatty
acids and unsaponifiable matter, both lipids, are limited to 1.75% and 0.5% (Directive 2000/36/EC,
2000, Annex I A.1)[^84]. The sources show no significant content other than fat, and no fiber:
USDA's SR Legacy [Oil, cocoa butter](https://fdc.nal.usda.gov/food-details/171421/nutrients)
listing, and the specifications of [Barry Callebaut Cocoa Butter][barry_callebaut_cocoa_butter],
[Cacao Barry Mycryo][cacao_barry_mycryo], [Belcolade Pure Prime Pressed Cocoa
Butter][belcolade_cocoa_butter], and [GFWA Cacao Butter][gfwa_cacao_butter].

[barry_callebaut_cocoa_butter]: https://argo.webstaurantstore.com/documents/nutrition/ncb-hd703-by-654.pdf
[cacao_barry_mycryo]: https://cdn.api.groupe-pomona.fr/public/products/0202780/branch/es/medias/beurre-mycryo-100-cacao-en-pot-550-g-cacao-barry_0202780_es_technical.pdf
[belcolade_cocoa_butter]: https://hbingredients.co.uk/cdn/shop/files/C.CB4.pdf
[gfwa_cacao_butter]: https://cdn.shopify.com/s/files/1/1366/1771/files/GFWA_Product_Specification_-_Cacao_Butter_Block_Organic_-_OCB25I.pdf

## Corvitto 55% Dark Chocolate

```json
{ "category": "Chocolate", "ChocolateSpec": { "cocoa_solids": 55, "total_fat": 35, "sugars": 45 } }
```

Corvitto's 55% dark coating, a couverture, with 35% cocoa butter and 20% _"pure cocoa"_, for a
_"total cocoa paste"_ (`cocoa_solids`) of 55%, plus 45% sugar (Corvitto, 2005, p. 254)[^3].

## Corvitto 60% Dark Chocolate

```json
{ "category": "Chocolate", "ChocolateSpec": { "cocoa_solids": 60, "total_fat": 38, "sugars": 40 } }
```

Corvitto's 60% dark coating, a couverture, with 38% cocoa butter and 22% _"pure cocoa"_, for a
_"total cocoa paste"_ (`cocoa_solids`) of 60%, plus 40% sugar (Corvitto, 2005, p. 254)[^3].

## Corvitto 65% Dark Chocolate

```json
{ "category": "Chocolate", "ChocolateSpec": { "cocoa_solids": 65, "total_fat": 40, "sugars": 35 } }
```

Corvitto's 65% dark coating, a couverture, with 40% cocoa butter and 25% _"pure cocoa"_, for a
_"total cocoa paste"_ (`cocoa_solids`) of 65%, plus 35% sugar (Corvitto, 2005, p. 254)[^3].

## Corvitto 70% Dark Chocolate

```json
{
  "category": "Chocolate",
  "ChocolateSpec": { "cocoa_solids": 70, "total_fat": 42.5, "sugars": 30 }
}
```

Corvitto's 70% dark coating, a couverture, with 42.5% cocoa butter and 27.5% _"pure cocoa"_, for a
_"total cocoa paste"_ (`cocoa_solids`) of 70%, plus 30% sugar (Corvitto, 2005, p. 254)[^3].

## Corvitto Cocoa Powder, 10/12% Fat

```json
{ "category": "Chocolate", "CocoaPowderSpec": { "cocoa_butter": 11, "water": 0 } }
```

Corvitto's type 10/12 dry cocoa powder, where _"the fat would represent 11% and the pure cocoa 89%"_
(Corvitto, 2005, p. 249)[^3]. Water is 0, since the book's calculations count the 22/24 powder's
full weight as solids (Corvitto, 2005, p. 251)[^3].

## Corvitto Cocoa Powder, 22/24% Fat

```json
{ "category": "Chocolate", "CocoaPowderSpec": { "cocoa_butter": 22, "water": 0 } }
```

Corvitto's type 22/24 dry cocoa powder, _"22% of fat and 78% of pure cocoa"_ (Corvitto, 2005,
p. 249)[^3]. Water is 0, since the book's calculations count the powder's full weight as solids
(Corvitto, 2005, p. 251)[^3].

## Corvitto 40% Milk Chocolate

```json
{
  "category": "Chocolate",
  "ChocolateSpec": {
    "cocoa_solids": 40,
    "milk_solids": 25,
    "split_fats": { "cocoa_butter": 35, "milk_fat": 5 },
    "sugars": 35
  }
}
```

Corvitto's 40% milk coating, a couverture, with 35% cocoa butter, 5% _"pure cocoa"_, 35% sugar,
5% dairy fat, and 20% skimmed milk powder (Corvitto, 2005, pp. 258, 260)[^3].

## Corvitto White Chocolate

```json
{
  "category": "Chocolate",
  "ChocolateSpec": {
    "cocoa_solids": 30,
    "milk_solids": 30,
    "split_fats": { "cocoa_butter": 30, "milk_fat": 10 },
    "sugars": 40
  }
}
```

Corvitto's white chocolate, with 30% cocoa butter, 10% dairy fat, 20% powdered milk and 40% sugar
(Corvitto, 2005, p. 264)[^3]. The powdered milk is skimmed, as the book's white chocolate cream
counts 40g of skimmed powdered milk in 200g of white chocolate (Corvitto, 2005, p. 266)[^3].

## USDA Dark Chocolate, 45-59% Cacao Solids

```json
{
  "category": "Chocolate",
  "ChocolateSpec": { "cocoa_solids": 52.1, "total_fat": 31.3, "sugars": 47.9 }
}
```

USDA FoodData Central - SR Legacy - [Chocolate, dark, 45-59% cacao
solids](https://fdc.nal.usda.gov/food-details/170271/nutrients)

`cocoa_solids` is calculated as `100 - sugars`, which falls within the 45-59% in the listing's name.

## USDA Dark Chocolate, 60-69% Cacao Solids

```json
{
  "category": "Chocolate",
  "ChocolateSpec": { "cocoa_solids": 63.3, "total_fat": 38.3, "sugars": 36.7 }
}
```

USDA FoodData Central - SR Legacy - [Chocolate, dark, 60-69% cacao
solids](https://fdc.nal.usda.gov/food-details/170272/nutrients)

`cocoa_solids` is calculated as `100 - sugars`, which falls within the 60-69% in the listing's name.

## USDA Dark Chocolate, 70-85% Cacao Solids

```json
{
  "category": "Chocolate",
  "ChocolateSpec": { "cocoa_solids": 76, "total_fat": 42.6, "sugars": 24 }
}
```

USDA FoodData Central - SR Legacy - [Chocolate, dark, 70-85% cacao
solids](https://fdc.nal.usda.gov/food-details/170273/nutrients)

`cocoa_solids` is calculated as `100 - sugars`, which falls within the 70-85% in the listing's name.

## USDA Milk Chocolate

```json
{
  "category": "Chocolate",
  "ChocolateSpec": {
    "cocoa_solids": 33.5,
    "milk_solids": 20,
    "total_fat": 29.7,
    "sugars": 43.4,
    "other_solids": 3.1
  }
}
```

USDA FoodData Central - SR Legacy - [Candies, milk
chocolate](https://fdc.nal.usda.gov/food-details/167587/nutrients)

The dark chocolate entries take `cocoa_solids` as `100 - sugars`, but this listing also contains
milk solids, which need to be estimated. This SR Legacy listing does not report lactose, so the
split between cocoa and milk is instead derived from the reported fiber and protein; see
[`estimate_chocolate_snf_split_from_protein_by_fiber`].

- `cocoa_solids` as `total_fat - milk_fat` plus cocoa solids non-fat, via
  [`estimate_chocolate_cocoa_snf_from_fiber`] and the 3.4 g of fiber. `milk_fat` is
  <code>milk_solids \* [STD_BUTTERFAT_IN_WHOLE_MILK_POWDER]</code>
- `milk_solids` as <code>MSNF / (1 - [STD_BUTTERFAT_IN_WHOLE_MILK_POWDER])</code>, where
  MSNF is estimated as 14.8% via [`estimate_chocolate_snf_split_from_protein_by_fiber`] and the
  7.65 g of protein and 3.4 g of fiber
- `total_fat` from the listing, internally split into cocoa butter and milk fat by [`ChocolateSpec`]
- `sugars` as the 51.5 g total less the lactose that MSNF carries, at [`STD_LACTOSE_IN_MSNF`]
- `other_solids` as the remainder, the listing's 1.5% water and 1.6% more, such as emulsifier

## USDA White Chocolate

```json
{
  "category": "Chocolate",
  "ChocolateSpec": {
    "cocoa_solids": 27.2,
    "milk_solids": 20.7,
    "total_fat": 32.1,
    "sugars": 50.7,
    "other_solids": 1.4
  }
}
```

USDA FoodData Central - SR Legacy - [Candies, white
chocolate](https://fdc.nal.usda.gov/food-details/167571/nutrients)

The dark chocolate entries take `cocoa_solids` as `100 - sugars`, but this listing also contains
milk solids, which need to be estimated. This SR Legacy listing does not report lactose, so the
split between cocoa and milk is instead derived from the reported fiber and protein; see
[`estimate_chocolate_snf_split_from_protein_by_fiber`].

The listing's 0.2 g of fiber puts the cocoa solids non-fat at 0.5%, so nearly all the cocoa solids
are cocoa butter, and nearly all the protein is milk's, as expected of white chocolate.

- `cocoa_solids` as `total_fat - milk_fat` plus cocoa solids non-fat, via
  [`estimate_chocolate_cocoa_snf_from_fiber`] and the 0.2 g of fiber. `milk_fat` is
  <code>milk_solids \* [STD_BUTTERFAT_IN_WHOLE_MILK_POWDER]</code>
- `milk_solids` as <code>MSNF / (1 - [STD_BUTTERFAT_IN_WHOLE_MILK_POWDER])</code>, where
  MSNF is estimated as 15.3% via [`estimate_chocolate_snf_split_from_protein_by_fiber`] and the
  5.87 g of protein and 0.2 g of fiber
- `total_fat` from the listing, internally split into cocoa butter and milk fat by [`ChocolateSpec`]
- `sugars` as the 59.0 g total less the lactose that MSNF carries, at [`STD_LACTOSE_IN_MSNF`]
- `other_solids` as the remainder, the listing's 1.3% water and 0.1% more, such as emulsifier

## Lindt EXCELLENCE 70% Cacao Dark Chocolate

```json
{
  "category": "Chocolate",
  "ChocolateLabelSpec": {
    "kind": "DarkChocolate",
    "serving_size": { "grams": 40 },
    "total_fat": 16,
    "carbohydrates": { "total": 19, "fiber": 5, "sugars": 12 },
    "protein": 4,
    "cocoa_solids": { "min": 70 }
  }
}
```

From the [nutrition facts
table](https://www.lindt.ca/en/lindt-excellence-70-cacao-dark-chocolate-bar-100g), which declares
_"CACAO SOLIDS: 70% MINIMUM"_.

## Lindt EXCELLENCE 85% Cacao Dark Chocolate

```json
{
  "category": "Chocolate",
  "ChocolateLabelSpec": {
    "kind": "DarkChocolate",
    "serving_size": { "grams": 40 },
    "total_fat": 18,
    "carbohydrates": { "total": 15, "fiber": 6, "sugars": 6 },
    "protein": 5,
    "cocoa_solids": { "min": 85 }
  }
}
```

From the [nutrition facts
table](https://www.lindt.ca/en/lindt-excellence-85-cacao-dark-chocolate-bar-100g), which declares
_"CACAO SOLIDS: 85% MINIMUM"_. The values are sourced from an alternative [No Frills
listing](https://www.nofrills.ca/en/excellence-85-cacao-dark-chocolate-bar/p/20312527001_EA), from
a product photo, not the listing's typed table, which appears to have an incorrect _"Fat"_ value.

## Lindt EXCELLENCE 95% Cacao Dark Chocolate

```json
{
  "category": "Chocolate",
  "ChocolateLabelSpec": {
    "kind": "DarkChocolate",
    "serving_size": { "grams": 40 },
    "total_fat": 23,
    "carbohydrates": { "total": 10, "fiber": 7, "sugars": 1 },
    "protein": 5,
    "cocoa_solids": { "min": 95 }
  }
}
```

From the [nutrition facts
table](https://www.lindt.ca/en/lindt-excellence-95-cacao-dark-chocolate-bar-80g), which declares
_"CACAO SOLIDS: 95% MINIMUM"_.

## Lindt EXCELLENCE 100% Cacao Dark Chocolate

```json
{
  "category": "Chocolate",
  "ChocolateLabelSpec": {
    "kind": "DarkChocolate",
    "serving_size": { "grams": 50 },
    "total_fat": 27,
    "carbohydrates": { "total": 14, "fiber": 8, "sugars": 0 },
    "protein": 7,
    "cocoa_solids": { "actual": 100 }
  }
}
```

From the [nutrition facts table](https://www.lindt.ca/en/lindt-excellence-100-cacao-bar-50g), which
declares _"CACAO SOLIDS: 100%"_.

## Lindt Classic Milk Chocolate

```json
{
  "category": "Chocolate",
  "ChocolateLabelSpec": {
    "kind": "MilkChocolate",
    "serving_size": { "grams": 100 },
    "total_fat": 32,
    "carbohydrates": { "available": 56, "sugars": 55 },
    "protein": 7,
    "cocoa_solids": { "min": 30 },
    "milk_solids": { "min": 20 }
  }
}
```

Sold as [_Classic Recipe_](https://www.lindt.co.uk/lindt-classic-recipe-milk-chocolate-100g) in the
UK and as [_SWISS CLASSIC_](https://www.lindt.ca/en/lindt-swiss-classic-milk-chocolate-bar-100g) in
Canada, where its [label](https://www.staples.ca/products/892120-en-lindt-swiss-classic-bar-milk)
lists matching ingredients, which add lactose and barley malt extract to the milk powders. From the
UK [product page](https://www.lindt.co.uk/lindt-classic-recipe-milk-chocolate-100g), per 100 g,
with _"Cocoa : 30% minimum. Milk solids : 20% minimum"_.

The UK label gives no fiber, so the cocoa minimum stands in for the cocoa solids. The Canadian
label's 1 g of fiber per 30 g covers 1.7-5.0 g per 100 g once rounded, too coarse to estimate them
from. The added lactose counts as sucrose.

## Lindt Classic White Chocolate

```json
{
  "category": "Chocolate",
  "ChocolateLabelSpec": {
    "kind": "WhiteChocolate",
    "serving_size": { "grams": 40 },
    "total_fat": 14,
    "carbohydrates": { "total": 22, "fiber": 0, "sugars": 22 },
    "protein": 3
  }
}
```

Sold as _SWISS CLASSIC_ in Canada. From the [product
page](https://www.lindt.ca/en/lindt-swiss-classic-white-chocolate-bar-100g)'s label.

## Valrhona Guanaja 70% Dark Chocolate

```json
{ "category": "Chocolate", "ChocolateSpec": { "cocoa_solids": 70, "sugars": 30 } }
```

From the
[manufacturer](https://www.valrhona.com/en/our-products/for-consumers/gourmets-range/cooking-range/for-baking/cooking-range-guanaja-70-dark-chocolate)
and vendor product listing for [_VALRHONA Guanaja 70% Dark Chocolate
Couverture_](https://supplies.gusta.ca/products/valrhona-guanaja-70-dark-chocolate-couverture).

Neither of the two listings above gave any additional information other than _"70%"_, so the
ingredient is modeled as a simple 70% dark chocolate.

## Valrhona Ivoire 35% White Chocolate

```json
{
  "category": "Chocolate",
  "ChocolateSpec": {
    "cocoa_solids": 35.1,
    "milk_solids": 21,
    "split_fats": { "cocoa_butter": 35.1, "milk_fat": 5.9 },
    "sugars": 42.78,
    "other_solids": 1.12
  }
}
```

White chocolate, from the [product
page](https://www.valrhona.com/en/our-products/for-professionals/chocolate-co/couverture-chocolates/gourmet-chocolates/ivoire-35)
and [specification
sheet](https://dam.valrhona.com/m/03ceabce19cf5f67/original/4660-IVOIRE_FT_UK.pdf). The values
are taken from the spec sheet:

- `cocoa_solids` from _"cocoa butter 35.1%"_, the recipe's only cocoa ingredient
- `milk_solids` from _"Dry matter content of milk 21 %"_, corroborated by _"whole MILK powder
  21.6%"_
- `cocoa_butter` equal to cocoa solids
- `milk_fat` as the nutritional values' _"Fat 41 g/100g"_ less the cocoa butter, as the sheet
  gives no milk fat of its own
- `sugars` from _"sugar 42.78%"_
- `other_solids` the remainder from the above

These are in agreement with the product page's _"35% of cocoa butter"_.

## Valrhona Opalys 33% White Chocolate

```json
{
  "category": "Chocolate",
  "ChocolateSpec": {
    "cocoa_solids": 34.6,
    "milk_solids": 31,
    "split_fats": { "cocoa_butter": 34.6, "milk_fat": 9.4 },
    "sugars": 32.3,
    "other_solids": 2.1
  }
}
```

White chocolate, from the [product
page](https://www.valrhona.com/en/our-products/for-professionals/chocolate-co/couverture-chocolates/gourmet-chocolates/opalys-33)
and a distributor's copy of the [specification
sheet](https://www.webstaurantstore.com/documents/nutrition/valrhona_8118_nutrition.pdf), which
describes it as _"a white chocolate with the merest hint of sweetness"_. The values are taken from
the spec sheet:

- `cocoa_solids` from _"cocoa butter 34.6%"_, the recipe's only cocoa ingredient
- `milk_solids` from _"Dry matter content of milk 31 %"_, corroborated by _"whole MILK powder
  32.3%"_
- `cocoa_butter` equal to cocoa solids
- `milk_fat` as the nutritional values' _"Fat 44 g/100g"_ less the cocoa butter, as the sheet
  gives no milk fat of its own
- `sugars` from _"sugar 32.3%"_
- `other_solids` the remainder from the above

These are in agreement with the product page's _"33% of cocoa butter"_.

## Valrhona Ariaga Blanche 30% White Chocolate

```json
{
  "category": "Chocolate",
  "ChocolateSpec": {
    "cocoa_solids": 30,
    "milk_solids": 25,
    "split_fats": { "cocoa_butter": 30, "milk_fat": 6 },
    "sugars": 43.16,
    "other_solids": 1.84
  }
}
```

White chocolate, from the [specification
sheet](https://dam.valrhona.com/m/4096ff845fe81357/original/12141-ARIAGA-BLANCHE-30-_FT_UK.pdf).
The values are taken from it:

- `cocoa_solids` from _"cocoa butter 30%"_, the recipe's only cocoa ingredient
- `milk_solids` from _"Dry matter content of milk 25 %"_, corroborated by _"whole MILK powder
  21.2%"_ plus _"dried skimmed MILK 5%"_
- `cocoa_butter` equal to cocoa solids
- `milk_fat` as the nutritional values' _"Fat 36 g/100g"_ less the cocoa butter, as the sheet
  gives no milk fat of its own
- `sugars` from _"sugar 43.16%"_
- `other_solids` the remainder from the above

Its _"Dairy protein content 0%"_ must be an error, as milk powders are its only source of protein,
which its nutritional values put at 7.2 g.

## Callebaut 811 Dark Chocolate

```json
{
  "category": "Chocolate",
  "ChocolateSpec": { "cocoa_solids": 56, "total_fat": 36.6, "sugars": 43, "other_solids": 1 }
}
```

Dark couverture chocolate, from the [product
page](https://www.callebaut.com/en-CA/products/callebaut/darkchocolaterecipe811/811NV-595) and
[specification
sheet](https://www.cfw.co.uk/Media/PDF%20Spec%20Sheets/Callebaut/Spec-Sheet-Callebaut-Dark-Callets-1kg-%28811-E1-U68%29.pdf).
The values are taken from the spec sheet:

- `cocoa_solids` from _"Dry cocoa solids 56.0%"_, corroborated by _"cocoa mass 43.0%"_ plus
  _"cocoa butter 13.0%"_
- `total_fat` from _"TOTAL FAT CONTENT 36.6%"_, corroborated by 56.0% less _"Dry fatfree cocoa
  solids 19.4%"_
- `sugars` from _"sugar 43.0%"_
- `other_solids` the remainder from the above

These are in agreement with the product page's _"54.5% Min. % Dry cocoa solids"_, _"36.6% Fat %"_.

## Callebaut 2815 Dark Chocolate

```json
{
  "category": "Chocolate",
  "ChocolateSpec": { "cocoa_solids": 59.4, "total_fat": 38.7, "sugars": 39.6, "other_solids": 1 }
}
```

Dark chocolate, from the [product
page](https://www.callebaut.com/en-CA/products/callebaut/2815/2815-2B-U76), stating dry cocoa
solids of minimum 57.9% and fat 38.7%. No specification sheet was found for it, so `cocoa_solids`
and `sugars` are both derived.

Across the siblings that do have sheets, the product page's minimum cocoa solids is almost always
the sheet's value less its stated tolerance, 1.5 in almost all of them. As such, the minimum 57.9%
plus 1.5 is likely what would be on a spec sheet, and a better estimate of typical values. `sugars`
is taken as a remainder, including `other_solids` of 1%, the low end of the 1.0-1.5% range of its
siblings.

## Callebaut 60-40-38 Dark Chocolate

```json
{
  "category": "Chocolate",
  "ChocolateSpec": { "cocoa_solids": 62.1, "total_fat": 38.8, "sugars": 37, "other_solids": 0.9 }
}
```

Dark couverture chocolate, from the [product
page](https://www.callebaut.com/en-CA/products/callebaut/60-40-38/60-40-38NV-595) and
[specification
sheet](https://www.cfw.co.uk/Media/PDF%20Spec%20Sheets/Callebaut/Spec-Sheet-Callebaut-Dark-604038-%2860-40-38NV-01B%29.pdf).
The values are taken from the spec sheet:

- `cocoa_solids` from _"Dry cocoa solids 62.1%"_, corroborated by _"cocoa mass 52.0%"_ plus
  _"cocoa butter 10.5%"_
- `total_fat` from _"TOTAL FAT CONTENT 38.8%"_, corroborated by 62.1% less _"Dry fatfree cocoa
  solids 23.3%"_
- `sugars` from _"sugar 37.0%"_
- `other_solids` the remainder from the above

These are in agreement with the product page's _"60.1% Min. % Dry cocoa solids"_,
_"39.4% Fat %"_ (off by 0.6%).

## Callebaut 70-30-38 Dark Chocolate

```json
{
  "category": "Chocolate",
  "ChocolateSpec": { "cocoa_solids": 72.5, "total_fat": 38.9, "sugars": 26, "other_solids": 1.5 }
}
```

Dark couverture chocolate, from the [product
page](https://www.callebaut.com/en-CA/products/callebaut/darkchocolaterecipe70-30-39/70-30-38NV-595)
and [specification
sheet](https://www.cfw.co.uk/Media/PDF%20Spec%20Sheets/Callebaut/Spec-Sheet-Callebaut-Extra-Bitter-Callets-10kg-%2870-30-38NV-01B%29.pdf).
The values are taken from the spec sheet:

- `cocoa_solids` from _"Dry cocoa solids 72.5%"_, corroborated by _"cocoa mass 71.0%"_ plus
  _"fat-reduced cocoa powder 2.0%"_
- `total_fat` from _"TOTAL FAT CONTENT 38.9%"_, corroborated by 72.5% less _"Dry fatfree cocoa
  solids 33.6%"_
- `sugars` from _"sugar 26.0%"_
- `other_solids` the remainder from the above

These are in agreement with the product page's _"70.5% Min. % Dry cocoa solids"_, _"38.9% Fat %"_.

## Callebaut 823 Milk Chocolate

```json
{
  "category": "Chocolate",
  "ChocolateSpec": {
    "cocoa_solids": 35.1,
    "milk_solids": 21.8,
    "split_fats": { "cocoa_butter": 30.2, "milk_fat": 6 },
    "sugars": 42,
    "other_solids": 1.1
  }
}
```

Couverture milk chocolate, from the [product
page](https://www.callebaut.com/en/products/callebaut/milkchocolaterecipe823/823NV-595) and
[specification
sheet](https://slrsupplies.com/wp-content/uploads/2021/02/Choco-BLOCK-823-Callebaut-823NV.pdf).
The values are taken from the spec sheet, which writes its decimals with commas:

- `cocoa_solids` from _"Dry cocoa solids 35,1%"_, corroborated by _"cocoa butter 24,0%"_ plus
  _"cocoa mass 11,0%"_
- `milk_solids` from _"Dry milk solids 21,8%"_, corroborated by _"whole milk powder 22,5%"_
- `milk_fat` from _"Milkfat 6,0%"_
- `cocoa_butter` as _"TOTAL FAT CONTENT 36,2%"_ less the milkfat, corroborated by 35,1% less
  _"Dry fatfree cocoa solids 4,9%"_
- `sugars` from _"sugar 42,0%"_
- `other_solids` the remainder from the above

These are in agreement with the product page's _"33.6% Min. % Dry cocoa solids"_, _"20.8% Min. %
Dry milk solids"_, _"36.2% Fat %"_.

## Callebaut 665 Milk Chocolate

```json
{
  "category": "Chocolate",
  "ChocolateSpec": {
    "cocoa_solids": 33,
    "milk_solids": 27,
    "split_fats": { "cocoa_butter": 29.8, "milk_fat": 5.9 },
    "sugars": 38.5,
    "other_solids": 1.5
  }
}
```

Couverture milk chocolate, from the [product
page](https://www.callebaut.com/en/products/callebaut/milkchocolaterecipe665/665NV-01B) and
[specification
sheet](https://www.cfw.co.uk/Media/PDF%20Spec%20Sheets/Callebaut/Spec-Sheet-Callebaut-Milk-665-%28665NV-01B%29.pdf).
The values are taken from the spec sheet:

- `cocoa_solids` from _"Dry cocoa solids 33.0%"_, corroborated by _"cocoa butter 27.0%"_ plus
  _"cocoa mass 5.5%"_
- `milk_solids` from _"Dry milk solids 27.0%"_, corroborated by _"whole milk powder 21.0%"_ plus
  _"skimmed milk powder 6.0%"_
- `milk_fat` from _"Milkfat 5.9%"_
- `cocoa_butter` as _"TOTAL FAT CONTENT 35.7%"_ less the milkfat, leaving 3.2% cocoa solids non-fat
  against the sheet's _"Dry fatfree cocoa solids min 2.5%"_
- `sugars` from _"sugar 38.5%"_
- `other_solids` the remainder from the above, covering _"caramelized glucose syrup 1.5%"_ and the
  lecithin and vanilla flavouring each listed at <1%

These are in agreement with the product page's _"31% Min. % Dry cocoa solids"_, _"25.1% Min. % Dry
milk solids"_, _"35.5% Fat %"_ (off by 0.2%).

## Callebaut Power 41 Milk Chocolate

```json
{
  "category": "Chocolate",
  "ChocolateSpec": {
    "cocoa_solids": 42.2,
    "milk_solids": 20.4,
    "split_fats": { "cocoa_butter": 32.2, "milk_fat": 4.1 },
    "sugars": 36,
    "other_solids": 1.4
  }
}
```

Couverture milk chocolate, from the [product
page](https://www.callebaut.com/en/chocolate-cocoa-nuts/841-RT-U71/milkchocolaterecipepower41) and
[specification
sheet](https://www.cfw.co.uk/Media/PDF%20Spec%20Sheets/Callebaut/Spec-Sheet-Callebaut-Power-41-%28841-E4-U71%29.pdf).
The values are taken from the spec sheet:

- `cocoa_solids` from _"Dry cocoa solids 42.2%"_, corroborated by _"cocoa mass 22.0%"_ plus
  _"cocoa butter 20.0%"_
- `milk_solids` from _"Dry milk solids 20.4%"_, corroborated by _"whole milk powder 14.5%"_ plus
  _"skimmed milk powder 6.0%"_
- `milk_fat` from _"Milkfat 4.1%"_
- `cocoa_butter` as _"TOTAL FAT CONTENT 36.3%"_ less the milkfat, corroborated by 42.2% less
  _"Dry fatfree cocoa solids 9.9%"_ (off by 0.1%)
- `sugars` from _"sugar 36.0%"_
- `other_solids` the remainder from the above

These are in agreement with the product page's _"40.7% Min. % Dry cocoa solids"_, _"19.4% Min. %
Dry milk solids"_, _"36.3% Fat %"_.

## Callebaut Arriba Milk Chocolate

```json
{
  "category": "Chocolate",
  "ChocolateSpec": {
    "cocoa_solids": 40.5,
    "milk_solids": 25.5,
    "split_fats": { "cocoa_butter": 33.8, "milk_fat": 5.2 },
    "sugars": 33,
    "other_solids": 1
  }
}
```

Couverture milk chocolate made with Ecuadorian Arriba cocoa, from the [product
page](https://www.callebaut.com/en-US/chocolate-cocoa-nuts/CHM-Q415AR-2B-U75/arriba) and
[specification
sheet](https://www.sephra.com/Media/PDF%20Spec%20Sheets/Callebaut/Spec-Sheet-Callebaut-Arriba-%28CHM-Q415AR-E4-U70%29.pdf).
The values are taken from the spec sheet:

- `cocoa_solids` from _"Dry cocoa solids 40.5%"_, corroborated by _"cocoa butter 26.0%"_ plus
  _"cocoa mass Ecuador 14.5%"_
- `milk_solids` from _"Dry milk solids 25.5%"_, corroborated by _"whole milk powder 19.0%"_ plus
  _"skimmed milk powder 7.5%"_
- `milk_fat` from _"Milkfat 5.2%"_
- `cocoa_butter` as _"TOTAL FAT CONTENT 39.0%"_ less the milkfat, corroborated by 40.5% less
  _"Dry fatfree cocoa solids 6.6%"_ (off by 0.1%)
- `sugars` from _"sugar 33.0%"_
- `other_solids` the remainder from the above

These are in agreement with the product page's _"39% Min. % Dry cocoa solids"_, _"24% Min. % Dry
milk solids"_, _"39.1% Fat %"_ (off by 0.1%).

## Callebaut W2 White Chocolate

```json
{
  "category": "Chocolate",
  "ChocolateSpec": {
    "cocoa_solids": 29.5,
    "milk_solids": 23,
    "split_fats": { "cocoa_butter": 29.5, "milk_fat": 6.3 },
    "sugars": 46.5,
    "other_solids": 1
  }
}
```

White chocolate, from the [product
page](https://www.callebaut.com/en-CA/products/callebaut/whitechocolaterecipew2/W2NV-595) and
[specification
sheet](https://www.cfw.co.uk/Media/PDF%20Spec%20Sheets/Callebaut/Spec-Sheet-Callebaut-White-Callets-1kg-%28W2-E1-U68%20%29.pdf).
The values are taken from the spec sheet:

- `cocoa_solids` from _"Dry cocoa solids 29.5%"_, corroborated by _"cocoa butter 29.5%"_, the
  recipe's only cocoa ingredient
- `milk_solids` from _"Dry milk solids 23.0%"_, corroborated by _"whole milk powder 23.5%"_
- `milk_fat` from _"Milkfat 6.3%"_
- `cocoa_butter` equal to cocoa solids - it's the only cocoa ingredient and the sheet does not list
  cocoa solids non-fat, corroborated by _"TOTAL FAT CONTENT 35.8%"_ less milkfat
- `sugars` from _"sugar 46.5%"_
- `other_solids` the remainder from the above

These are in agreement with the product page's _"28% Min. % Dry cocoa solids"_, _"22% Min. % Dry
milk solids"_, _"35.8% Fat %"_.

## Mona Lisa Dark Chocolate Curved Shavings

```json
{
  "category": "Chocolate",
  "ChocolateSpec": { "cocoa_solids": 49.4, "total_fat": 30.3, "sugars": 49.5, "other_solids": 1.1 }
}
```

Chocolate decoration made from Callebaut chocolate, from the [product
page](https://www.cfw.co.uk/Mona-Lisa-Dark-Curved-Shavings-2.5Kg) and [specification
sheet](https://www.cfw.co.uk/Media/PDF%20Spec%20Sheets/Callebaut/Spec-Sheet-Callebaut-Dark-Chocolate-Curved-Shavings%20%28CHD-SV-U4C-E0-74A%29.pdf).
Its _"Legal denomination"_ is _"Chocolate"_, the plain EU denomination rather than a couverture.
The values are taken from the spec sheet:

- `cocoa_solids` from _"Dry cocoa solids 49.4%"_, corroborated by _"cocoa mass 43.0%"_ plus
  _"cocoa butter 7.0%"_
- `total_fat` from _"TOTAL FAT 30.3 g"_, corroborated by 49.4% less _"Dry fatfree cocoa solids
  19.2%"_ (off by 0.1%)
- `sugars` from _"sugar 49.5%"_
- `other_solids` the remainder from the above

The product page lists the ingredients without percentages and states no composition minima, so it
corroborates only the recipe.

## Mona Lisa Milk Chocolate Blossoms

```json
{
  "category": "Chocolate",
  "ChocolateSpec": {
    "cocoa_solids": 29.6,
    "milk_solids": 16.9,
    "split_fats": { "cocoa_butter": 23, "milk_fat": 3.9 },
    "sugars": 52.5,
    "other_solids": 1
  }
}
```

Chocolate decoration made from Callebaut chocolate, from the [product
page](https://www.cfw.co.uk/Callebaut-Milk-Chocolate-Blossoms-1kg) and [specification
sheet](https://www.cfw.co.uk/Media/PDF%20Spec%20Sheets/Callebaut/Spec-Sheet-Callebaut-Milk-Blossoms-1kg%20%28CHM-BS-9U15-E0-07B%29.pdf).
Its _"Legal denomination"_ is _"Milk chocolate"_, the plain EU denomination rather than a
couverture. The values are taken from the spec sheet:

- `cocoa_solids` from _"Dry cocoa solids 29.6%"_, corroborated by _"cocoa mass 15.0%"_ plus
  _"cocoa butter 15.0%"_
- `milk_solids` from _"Dry milk solids 16.9%"_, corroborated by _"whole milk powder 13.5%"_ plus
  _"skimmed milk powder 3.5%"_
- `cocoa_butter` as 29.6% less _"Dry fatfree cocoa solids 6.6%"_
- `milk_fat` as _"TOTAL FAT 26.9 g"_ less that cocoa butter. The sheet gives only _"Milkfat min
  3.5 %"_, a floor rather than a typical value
- `sugars` from _"sugar 52.5%"_
- `other_solids` the remainder from the above

These are in agreement with the product page's _"Min Cocoa Solids: 28%"_.

## Belcolade Blanc Selection White Chocolate

```json
{
  "category": "Chocolate",
  "ChocolateSpec": {
    "cocoa_solids": 30,
    "milk_solids": 25,
    "split_fats": { "cocoa_butter": 30, "milk_fat": 6.5 },
    "sugars": 44.2,
    "other_solids": 0.8
  }
}
```

White chocolate, from Puratos's [technical data
sheet](https://www.cfw.co.uk/Media/PDF%20Spec%20Sheets/Belcolade/Spec-Sheet-Belcolade-White-Chocolate-Easimelt-15kg-X605.pdf),
version 1.8. The values are taken from it:

- `cocoa_solids` from _"Dry cocoa solids 30,0 %"_, all cocoa butter by _"Fat free dry cocoa solids
  0%"_
- `milk_solids` from _"Dry milk solids 25,0 %"_
- `cocoa_butter` from _"Cocoa Butter 30,0 %"_
- `milk_fat` from _"Milk fat 6,5 %"_, the rest of the milk solids being _"Fat free dry milk solids
  18,5 %"_
- `sugars` from the nutritional information's _"Added sugars 44,2 g"_, as the sheet lists the
  ingredients without percentages
- `other_solids` the remainder from the above

The cocoa butter and milk fat give 36.5% fat, within its _"Total Fat Content 35,6 - 38,6 %"_. An
[older
sheet](https://cdn.shopify.com/s/files/1/0020/9046/7391/files/TDS_4102183_Belcolade_Blanco_X605G_Drops_2X5.pdf)
agrees, with a recipe of 44.5% sugar, 29.8% cocoa butter, and 25.1% whole milk powder.

## Green & Black's Organic Milk Chocolate

```json
{
  "category": "Chocolate",
  "ChocolateLabelSpec": {
    "kind": "MilkChocolate",
    "serving_size": { "grams": 100 },
    "total_fat": 36,
    "carbohydrates": { "available": 48, "fiber": 2.8, "sugars": 46 },
    "protein": 9.8,
    "cocoa_solids": { "min": 37 },
    "milk_solids": { "min": 24 }
  }
}
```

From the [Ocado
listing](https://www.ocado.com/products/green-black-s-organic-milk-chocolate-bar/15055011) of the UK
bar, with _"COCOA SOLIDS 37% MINIMUM, MILK SOLIDS 24% MINIMUM"_.

## Green & Black's Organic White Chocolate

```json
{
  "category": "Chocolate",
  "ChocolateLabelSpec": {
    "kind": "WhiteChocolate",
    "serving_size": { "grams": 100 },
    "total_fat": 38,
    "carbohydrates": { "available": 51, "fiber": 0, "sugars": 51 },
    "protein": 7.9,
    "cocoa_solids": { "min": 30 },
    "milk_solids": { "min": 26 }
  }
}
```

From the [Ocado
listing](https://www.ocado.com/products/green-black-s-organic-white-chocolate-bar/13811011) of the
UK bar, with _"minimum Cocoa Solids 30 %, minimum Milk Solids 26 %"_.

## Cadbury Dairy Milk Chocolate (UK)

```json
{
  "category": "Chocolate",
  "ChocolateLabelSpec": {
    "kind": "MilkChocolate",
    "serving_size": { "grams": 100 },
    "total_fat": 30,
    "carbohydrates": { "available": 57, "fiber": 2.1, "sugars": 56 },
    "protein": 7.3,
    "cocoa_solids": { "min": 20 },
    "milk_solids": { "actual": 23 }
  }
}
```

From the [product page](https://www.cadbury.co.uk/products/cadbury-dairy-milk-chocolate-bar-95g)
of the UK bar, with _"MILK SOLIDS 20 % MINIMUM, ACTUAL 23 %. COCOA SOLIDS 20 % MINIMUM"_, as the
[Irish bar's](https://www.cadbury.ie/products/cadbury-dairy-milk-chocolate-bar-95g/) label also
gives. It _"CONTAINS VEGETABLE FATS IN ADDITION TO COCOA BUTTER"_, palm and shea, which count as
cocoa butter here. As cocoa butter equivalents, they must mix with it in any proportion and share
its physical properties, and make up at most 5% of the bar (Directive 2000/36/EC, 2000, Article
2(1), Annex II)[^84], so its cocoa solids may read up to 5 points high.

## Cadbury Dairy Milk Chocolate (Canada)

```json
{
  "category": "Chocolate",
  "ChocolateLabelSpec": {
    "kind": "MilkChocolate",
    "serving_size": { "grams": 40 },
    "total_fat": 13,
    "carbohydrates": { "total": 23, "fiber": 1, "sugars": 22 },
    "protein": 3
  }
}
```

From the label of the Canadian 90 g bar, per 8 pieces (40 g), as pictured on its
[Walmart.ca listing](https://www.walmart.ca/en/ip/28HWNCSUCTSU). Unlike the UK bar, it contains no
vegetable fats, but it declares no solids either, so they're estimated from its fiber and protein.
[Older labels](https://world.openfoodfacts.org/product/0061200084450) of the same bar name its
_"milk ingredients"_ as milk, skim milk, whole milk powder, and butter oil, so its milk fat likely
exceeds the whole milk powder default. Its rounded figures compose 1.3% more than 100 g, so
they're scaled down into it.

## USDA Unsweetened Cocoa Powder

```json
{ "category": "Chocolate", "CocoaPowderSpec": { "cocoa_butter": 13.7, "water": 3 } }
```

USDA FoodData Central - SR Legacy - [Cocoa, dry powder,
unsweetened](https://fdc.nal.usda.gov/food-details/169593/nutrients)

## USDA Unsweetened Cocoa Powder, Processed with Alkali

```json
{
  "category": "Chocolate",
  "CocoaPowderSpec": { "cocoa_butter": 13.1, "water": 2.7, "dutch_processed": true }
}
```

USDA FoodData Central - SR Legacy - [Cocoa, dry powder, unsweetened, processed with
alkali](https://fdc.nal.usda.gov/food-details/169594/nutrients)

## USDA Unsweetened Cocoa Powder, Processed with Alkali, High Fat

```json
{
  "category": "Chocolate",
  "CocoaPowderSpec": { "cocoa_butter": 23.7, "water": 3, "dutch_processed": true }
}
```

USDA FoodData Central - SR Legacy - [Cocoa, dry powder, hi-fat or breakfast, processed with
alkali](https://fdc.nal.usda.gov/food-details/170657/nutrients)

## Ghirardelli 100% Unsweetened Cocoa Powder

```json
{
  "category": "Chocolate",
  "ChocolateLabelSpec": {
    "kind": "CocoaPowder",
    "serving_size": { "grams": 6 },
    "total_fat": 1,
    "carbohydrates": { "total": 3, "fiber": 2, "sugars": 0 },
    "protein": 1
  }
}
```

From the [nutrition facts
table](https://www.ghirardelli.com/premium-baking-cocoa-100-unsweetened-cocoa-powder-6-bags-61703cs).
The powder is natural, _"non-alkalized"_.

## Baker's Unsweetened Chocolate

```json
{
  "category": "Chocolate",
  "ChocolateLabelSpec": {
    "kind": "DarkChocolate",
    "serving_size": { "grams": 15 },
    "total_fat": 8,
    "carbohydrates": { "total": 5, "fiber": 3, "sugars": 0 },
    "protein": 2
  }
}
```

From the [nutrition facts
table](https://www.kraftheinz.com/en-CA/bakers/products/00066188008405-100-pure-unsweetened-chocolate-baking-bar).

## Hershey's 100% Natural Unsweetened Cocoa Powder

```json
{
  "category": "Chocolate",
  "ChocolateLabelSpec": {
    "kind": "CocoaPowder",
    "serving_size": { "grams": 5 },
    "total_fat": 0.5,
    "carbohydrates": { "total": 3, "fiber": 2, "sugars": 0 },
    "protein": 1
  }
}
```

From the nutrition facts on the Canadian [Walmart.ca
listing](https://www.walmart.ca/en/ip/HERSHEY-S-Unsweetened-Cocoa-Powder-Natural-and-Organic-226-g/6000197192541),
which describes the powder as _"natural, non-alkalized"_. The US [product
page](https://www.hersheyland.com/products/hersheys-cocoa-100-cacao-natural-unsweetened-8-oz-can.html)
gives the same figures without the fiber, and the protein as _"<1g"_.

## Valrhona Unsweetened Cocoa Powder

```json
{
  "category": "Chocolate",
  "CocoaPowderSpec": {
    "cocoa_solids": 93,
    "cocoa_butter": 21,
    "other_solids": 4,
    "water": 3,
    "dutch_processed": true
  }
}
```

From the manufacturer's [technical
information](https://www.valrhona.com/en/our-products/for-professionals/chocolate-co/100-cocoa/cocoa-powder/cocoa-powder)
and vendor product listing for [_VALRHONA Unsweetened Dutch-Processed Cocoa
Powder_](https://supplies.gusta.ca/products/valrhona-dutch-processed-cocoa-powder).

> Dutch Processed Cocoa Powder (processed with alkali) gives a pure and intense cocoa taste with a
> very warm red mahogany color.

The manufacturer cites the composition as _"Cocoa 93% (min), Fat 21%"_. The remaining 7% is assumed
to be water and the ash introduced by the Dutch processing: 3% is the standard cocoa powder moisture
[`STD_WATER_IN_COCOA_POWDER`], leaving 4% as `other_solids`.

## Purest Natural Cocoa Powder

```json
{
  "category": "Chocolate",
  "ChocolateLabelSpec": {
    "kind": "CocoaPowder",
    "serving_size": { "grams": 12 },
    "total_fat": 1.5,
    "carbohydrates": { "total": 6, "fiber": 4, "sugars": 0 },
    "protein": 2
  }
}
```

From the nutrition facts on the [Amazon.ca
listing](https://www.amazon.ca/PUREST-NATURAL-Cocoa-Powder-300g/dp/B07F42XJLJ). The only ingredient
listed is _"NATURAL COCOA"_.

## Callebaut Botanical Extra Brute Cocoa Powder

```json
{
  "category": "Chocolate",
  "CocoaPowderSpec": { "cocoa_butter": 23, "water": 3.5, "dutch_processed": true }
}
```

Alkalized cocoa powder, from the [product
page](https://www.callebaut.com/en/products/callebaut/callebaut-selection-botanical-extra-brute-powder/DCP-22BOEXB-89B),
[product listing](https://www.cfw.co.uk/callebaut-cocoa-powder-botanical-extra-brute-1kg), and
[specification
sheet](https://www.cfw.co.uk/Media/PDF%20Spec%20Sheets/Callebaut/Spec-Sheet-Callebaut-Botanical-Extra-Brute-Cocoa-Powder-1kg%20%28DCP-22BOEXB-E0-89B%29.pdf).
The values are taken from the spec sheet:

- `cocoa_butter` from _"TOTAL FAT 23.0 g"_, within _"TOT. FAT CONTENT ON DRY MATTER 22.0 - 24.0 %"_
- `water` as 100 less the 96.5 g its nutritional data accounts for, within _"MOISTURE max 4.50 %"_
- `dutch_processed` from its _"Legal denomination"_, _"Cocoa powder alkalized"_, at _"pH 7.7 - 8.1"_

These are in agreement with the listing's _"22–24% cocoa butter"_, _"pH: 7.6-8.2 (High alkalized)"_.

## Callebaut Zestina Plein Arome Cocoa Powder

```json
{
  "category": "Chocolate",
  "CocoaPowderSpec": { "cocoa_butter": 23, "water": 3.5, "dutch_processed": true }
}
```

Alkalized cocoa powder, from the [product
page](https://www.callebaut.com/en/products/callebaut/zestina-plein-arome-cacao-en-polvo-callebaut/DCP-22ZEPLA-E0-89B),
[product listing](https://www.cfw.co.uk/callebaut-zestina-plein-arome-cocoa-powder-1kg), and
[specification
sheet](https://www.cfw.co.uk/Media/PDF%20Spec%20Sheets/Callebaut/Spec-Sheet-Callebaut-Zestina-Plein-Arome-1kg%20%28DCP-22ZEPLA-E0-89B%29.pdf).
The values are taken from the spec sheet:

- `cocoa_butter` from _"TOTAL FAT 23.0 g"_, within _"TOT. FAT CONTENT ON DRY MATTER 22.0 - 24.0 %"_
- `water` as 100 less the 96.5 g its nutritional data accounts for, within _"MOISTURE max 4.50 %"_
- `dutch_processed` from its _"Legal denomination"_, _"Cocoa powder alkalized"_, at _"pH 6.8 - 7.2"_

These are in agreement with the product page's _"22-24% fat content"_,
_"pH 6.8-7.2"_, _"light alkalisation"_.

## Callebaut 10/12 Natural Cocoa Powder

```json
{ "category": "Chocolate", "CocoaPowderSpec": { "cocoa_butter": 11, "water": 3.5 } }
```

Natural cocoa powder, from the [product
page](https://www.callebaut.com/en-US/products/callebaut/natural-cocoa-powder/NCP-10C101-CAL-A99),
[product listing](https://linneasinc.com/product/callebaut-10-12-cocoa-powder-natural-4-lb-bag/),
and [specification sheet](https://linneasinc.com/wp-content/uploads/2025/11/6-NCP1012-SPEC.pdf). The
values are taken from the spec sheet:

- `cocoa_butter` from _"TOTAL FAT 11.0 g"_, within _"TOT. FAT CONTENT ON DRY MATTER 10.0 - 12.0 %"_
- `water` as 100 less the 96.5 g its nutritional data accounts for, within _"MOISTURE max 5 %"_

These are in agreement with the product page's _"10–12% fat"_, _"pH 5-6.2 (Natural)"_.

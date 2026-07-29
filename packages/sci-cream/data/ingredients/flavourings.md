<!-- markdownlint-disable MD041 -- files are used to generate JSON, may also be concatenated -->

## Vanilla Extract

```json
{ "category": "Flavouring", "AlcoholSpec": { "abv": 35 } }
```

FDA CFR Title 21 - 169.175 Vanilla Extract: [_"In vanilla extract the content of ethyl alcohol is
not less than 35 percent by volume..."_](https://www.ecfr.gov/current/title-21/section-169.175).

The lack of sugars is intentional; many similar products don't have 'Sugar' listed in the
ingredients.

## USDA Vanilla Extract

```json
{ "category": "Flavouring", "AlcoholSpec": { "abv": 34.4, "sugars": 12.6, "fat": 0.06 } }
```

USDA FoodData Central - SR Legacy - [Vanilla
extract](https://fdc.nal.usda.gov/food-details/173471/nutrients).

## USDA Imitation Vanilla Extract

```json
{ "category": "Flavouring", "AlcoholSpec": { "abv": 32.9 } }
```

USDA FoodData Central - SR Legacy - [Vanilla extract, imitation,
alcohol](https://fdc.nal.usda.gov/food-details/172235/nutrients).

It lists 'Carbohydrate, by difference' as 2.41g, but no 'Total Sugars', which the other vanilla
extract entries do list, so I didn't include any sugars here.

## USDA No-Alcohol Imitation Vanilla Extract

```json
{ "category": "Flavouring", "FruitSpec": { "water": 85.6, "sugars": { "sucrose": 14.4 } } }
```

USDA FoodData Central - SR Legacy - [Vanilla extract, imitation, no
alcohol](https://fdc.nal.usda.gov/food-details/172236/nutrients).

## USDA Raw Lemon Peel

```json
{
  "category": "Flavouring",
  "FruitSpec": {
    "water": 81.6,
    "energy": 47,
    "protein": 1.5,
    "fat": 0.3,
    "fiber": 10.6,
    "carbohydrate": 16,
    "sugars": { "glucose": 1.39, "fructose": 1.39, "sucrose": 1.39 }
  }
}
```

USDA FoodData Central - SR Legacy - [Lemon peel,
raw](https://fdc.nal.usda.gov/food-details/167749/nutrients).

'Total Sugars' is listed as 4.17g with no breakdown, so assume equal parts glucose, fructose, and
sucrose.

## Lemon Zest

```json
{ "for": "USDA Raw Lemon Peel" }
```

## USDA Fresh Peppermint

```json
{
  "category": "Flavouring",
  "FruitSpec": {
    "water": 78.6,
    "energy": 70,
    "protein": 3.75,
    "fat": 0.94,
    "fiber": 8,
    "carbohydrate": 14.9,
    "sugars": {}
  }
}
```

USDA FoodData Central - SR Legacy - [Peppermint,
fresh](https://fdc.nal.usda.gov/food-details/173474/nutrients).

## Fresh Peppermint

```json
{ "for": "USDA Fresh Peppermint" }
```

## USDA Fresh Spearmint

```json
{
  "category": "Flavouring",
  "FruitSpec": {
    "water": 85.6,
    "energy": 44,
    "protein": 3.29,
    "fat": 0.73,
    "fiber": 6.8,
    "carbohydrate": 8.41,
    "sugars": {}
  }
}
```

USDA FoodData Central - SR Legacy - [Spearmint,
fresh](https://fdc.nal.usda.gov/food-details/173475/nutrients).

## Fresh Spearmint

```json
{ "for": "USDA Fresh Spearmint" }
```

## Nielsen-Massey Pure Vanilla Extract

```json
{ "category": "Flavouring", "AlcoholSpec": { "abv": 35, "sugars": 9 } }
```

Sources:
[nielsen-massey.nl](https://www.nielsen-massey.nl/consumer/products-pure-vanilla-extract.php),
[nielsenmassey.com/](https://nielsenmassey.com/products/pure-vanilla-extract/).

Ingredients: _Water, Alcohol (35%), Sugar, Vanilla Bean Extractives_. \
Nutrition facts table: _15kcal, 0g fat, 0g sugar per 1 tsp (5ml)_.

Sugar is present (3rd ingredient), but must be under 0.5g/serving since the label states 0g sugar,
so it is capped at under 10% (0.5g/5ml). This doesn't quite reach the label's 15kcal/5ml.

## Nielsen-Massey Pure Vanilla Bean Paste

```json
{
  "category": "Flavouring",
  "CompositeSpec": {
    "ByPercentage": [
      ["Sucrose", 50],
      ["Water", 25],
      ["Vanilla Extract", 24.5],
      ["Guar Gum", 0.5]
    ]
  }
}
```

Sources:
[nielsen-massey.nl](https://www.nielsen-massey.nl/consumer/products-pure-vanilla-bean-paste.php),
[nielsenmassey.com](https://nielsenmassey.com/products/pure-vanilla-bean-paste/).

Ingredients: _Sugar, Water, Vanilla Extract, Vanilla Beans, Gum Tragacanth (a natural thickener)._ \
Nutrition facts table: _17kcal per 1 tsp (5ml) serving_.

_"To replace vanilla extract in a recipe, simply measure the same amount of our Pure Vanilla Bean
Paste and add. Or, replace one tablespoon of paste for every one whole vanilla bean."_

The sources state 9g of sugar per tbsp (~15ml), or 3g per tsp (5ml) on the nutrition facts table.
With a sucrose density of 1.59g/ml that works out to ~50% sucrose by weight. Assuming the 'Vanilla
Extract' used is 35% ABV, a ~50/25/25 breakdown of sucrose, water, and 'Vanilla Extract' works out
to ~15kcal per 1 tsp (5ml), which is consistent with the label ordering but doesn't quite reach
17kcal. I tested a 1% Guar Gum solution and it looked about the same as the paste, but that was
without 50% sugar, so using 0.5% Guar Gum (strength: 200) as a proxy for Gum Tragacanth.

## Nielsen-Massey Pure Vanilla Powder

```json
{ "category": "Flavouring", "CompositeSpec": { "ByPercentage": [["Maltodextrin 10 DE", 100]] } }
```

Sources:
[nielsen-massey.nl](https://www.nielsen-massey.nl/consumer/products-pure-vanilla-powder.php),
[nielsenmassey.com](https://nielsenmassey.com/products/pure-vanilla-powder/).

Ingredients: _Maltodextrin (a modified cornstarch), Vanilla Extract_. \
Nutrition facts table: _20kcal, 5g total carbohydrate, 0g sugar per 1 tsp (5ml)._

_"...alcohol and sugar-free powder..."_. Stated alcohol- and sugar-free, so modeled as 100%
Maltodextrin. 5g of carbohydrates at ~4kcal/g reproduces the 20kcal per serving - disregarding the
powder's low bulk density and volume-based serving size.

## Vanilla Bean Paste

```json
{ "for": "Nielsen-Massey Pure Vanilla Bean Paste" }
```

## Vanilla Powder

```json
{ "for": "Nielsen-Massey Pure Vanilla Powder" }
```

## Nielsen-Massey Pure Almond Extract

```json
{ "category": "Flavouring", "AlcoholSpec": { "abv": 90, "fat": 5 } }
```

Sources:
[nielsen-massey.nl](https://www.nielsen-massey.nl/consumer/products-pure-almond-extract.php),
[nielsenmassey.com](https://nielsenmassey.com/products/pure-almond-extract/).

Ingredients: _Cane Alcohol (90%), Bitter Almond Oil, Water_. \
Nutrition facts table: _25kcal, 0g fat per 1 tsp (5ml)_.

At 90% ABV the alcohol alone is ~24kcal/5ml; a little bitter almond oil (benzaldehyde), modeled as
5% fat (~0.2g/serving, rounds to the label's 0g), brings it to ~25kcal.

## Nielsen-Massey Pure Chocolate Extract

```json
{ "category": "Flavouring", "AlcoholSpec": { "abv": 37, "fat": 10 } }
```

Sources:
[nielsen-massey.nl](https://www.nielsen-massey.nl/consumer/products-pure-chocolate-extract.php),
[nielsenmassey.com](https://nielsenmassey.com/products/pure-chocolate-extract/).

Ingredients: _Water, Alcohol (37%), Cocoa Extract_. \
Nutrition facts table: _15kcal, 0g fat, 0g sugar per 1 tsp (5ml)_.

_"1 Tbs. Chocolate Extract = 1 Tbs. Unsweetened Cocoa Powder."_ <!-- markdownlint-disable-line MD036 -->

At 37% ABV the alcohol is ~10kcal/5ml; cocoa butter carried by the cocoa extract, modeled as 10% fat
(~0.46g/serving, rounds to the label's 0g), brings it to ~15kcal.

## Nielsen-Massey Pure Coffee Extract

```json
{ "category": "Flavouring", "AlcoholSpec": { "abv": 35, "fat": 10 } }
```

Sources:
[nielsen-massey.nl](https://www.nielsen-massey.nl/consumer/products-pure-coffee-extract.php),
[nielsenmassey.com](https://nielsenmassey.com/products/pure-coffee-extract/).

Ingredients: _Water, Alcohol (35%), Coffee Extract_. \
Nutrition facts table: _20kcal, 0g fat, 0g carbohydrate per 1 tsp (5ml)_.

_"1 tsp. Coffee Extract = 1 tsp. Dry Espresso Powder."_ <!-- markdownlint-disable-line MD036 -->

At 35% ABV the alcohol is ~10kcal/5ml; coffee oils modeled as 10% fat (~0.47g/serving, rounds to the
label's 0g) bring it to ~14kcal. The label's 20kcal is not reproducible at 35% ABV with all-zero
macros (reaching 17.5kcal would need ~19% fat, ~0.9g/serving showing as 1g), so it appears rounded
up.

## Nielsen-Massey Pure Lemon Extract

```json
{ "category": "Flavouring", "AlcoholSpec": { "abv": 90, "fat": 11 } }
```

Sources:
[nielsen-massey.nl](https://www.nielsen-massey.nl/consumer/products-pure-lemon-extract.php),
[nielsenmassey.com](https://nielsenmassey.com/products/pure-lemon-extract/).

Ingredients: _Cane Alcohol (90%), Lemon Oil, Water_. \
Nutrition facts table: _30kcal, 0g fat per 1 tsp (5ml)_.

Lemon oil (d-limonene) is listed before water, so it is a notable fraction; modeled as 11% fat
(~0.44g/serving, just under the 0.5g threshold so it rounds to the label's 0g). With 90% ABV alcohol
(~24kcal) plus the oil this works out to ~28kcal/5ml (rounds to 30).

## Nielsen-Massey Pure Orange Extract

```json
{ "category": "Flavouring", "AlcoholSpec": { "abv": 90, "fat": 11 } }
```

Sources:
[nielsen-massey.nl](https://www.nielsen-massey.nl/consumer/products-pure-orange-extract.php),
[nielsenmassey.com](https://nielsenmassey.com/products/pure-orange-extract/).

Ingredients: _Cane Alcohol (90%), Orange Oil, Water_. \
Nutrition facts table: _30kcal, 0g fat per 1 tsp (5ml)_.

Orange oil (d-limonene) is listed before water, so it is a notable fraction; modeled as 11% fat
(~0.44g/serving, just under the 0.5g threshold so it rounds to the label's 0g). With 90% ABV alcohol
(~24kcal) plus the oil this works out to ~28kcal/5ml (rounds to 30).

## Nielsen-Massey Pure Peppermint Extract

```json
{ "category": "Flavouring", "AlcoholSpec": { "abv": 90, "fat": 11 } }
```

Sources:
[nielsen-massey.nl](https://www.nielsen-massey.nl/consumer/products-pure-peppermint-extract.php),
[nielsenmassey.com](https://nielsenmassey.com/products/pure-peppermint-extract-2/).

Ingredients: _Cane Alcohol, Peppermint Oil (no water)_. \
Nutrition facts table: _30kcal, 0g fat per 1 tsp (5ml)_.

No water in the ingredients implies a high-proof base, so ABV is estimated at 90% (the label does
not specify). Peppermint oil modeled as 11% fat (~0.44g/serving, rounds to the label's 0g); with the
alcohol this works out to ~28kcal/5ml (rounds to 30).

## Almond Extract

```json
{ "for": "Nielsen-Massey Pure Almond Extract" }
```

## Chocolate Extract

```json
{ "for": "Nielsen-Massey Pure Chocolate Extract" }
```

## Coffee Extract

```json
{ "for": "Nielsen-Massey Pure Coffee Extract" }
```

## Lemon Extract

```json
{ "for": "Nielsen-Massey Pure Lemon Extract" }
```

## Orange Extract

```json
{ "for": "Nielsen-Massey Pure Orange Extract" }
```

## Peppermint Extract

```json
{ "for": "Nielsen-Massey Pure Peppermint Extract" }
```

## Angostura Aromatic Bitters

```json
{ "category": "Flavouring", "AlcoholSpec": { "abv": 44.7, "sugars": 3 } }
```

From the [package label](https://angosturabitters.com/portfolio/aromatic-bitters/).

Ingredients: _Water, alcohol, spices, natural aromas, sugar, colorant: Caramel E150a_.

3% sugars is a guess; it should be very little since it's listed after the spices and aromas.

## Angostura Orange Bitters

```json
{ "category": "Flavouring", "AlcoholSpec": { "abv": 28 } }
```

From the [package label](https://angosturabitters.com/portfolio/orange-bitters/).

Ingredients: _Water, glycerine, alcohol, natural flavors, beta-carotene (color)_.

## Dillon's Orange Bitters

```json
{ "category": "Flavouring", "AlcoholSpec": { "abv": 50, "sugars": 10 } }
```

Source: [shop.dillons.ca](https://shop.dillons.ca/orange-bitters.html).

Ingredients: _Alcohol, Water, Sugar, Orange peel, Natural flavour, Spices_.

10% sugars is a guess, in line with similar products that list 'Sugar' as the 3rd ingredient.

## Essential Oil

```json
{ "category": "Flavouring", "AlcoholSpec": { "abv": 0 } }
```

This is a generic entry for pure essential oils, which are highly concentrated aromatic extracts
derived from plants. They are typically composed of volatile compounds like terpenes, terpenoids,
phenols, aldehydes, esters, etc. It's not currently possible to model these complex compositions in
this library, but essential oils are used in such minute quantities that their composition is
negligible in the formulation.

## Peppermint Essential Oil

```json
{ "for": "Essential Oil" }
```

## Spearmint Essential Oil

```json
{ "for": "Essential Oil" }
```

## Lemon Essential Oil

```json
{ "for": "Essential Oil" }
```

## Orange Essential Oil

```json
{ "for": "Essential Oil" }
```

## Lavender Essential Oil

```json
{ "for": "Essential Oil" }
```

## Eucalyptus Essential Oil

```json
{ "for": "Essential Oil" }
```

## Rose Essential Oil

```json
{ "for": "Essential Oil" }
```

## USDA Instant Coffee Powder

```json
{
  "category": "Flavouring",
  "FruitSpec": {
    "water": 3.1,
    "energy": 353,
    "protein": 12.2,
    "fat": 0.5,
    "carbohydrate": 75.4,
    "sugars": {}
  }
}
```

USDA FoodData Central - SR Legacy - [Beverages, coffee, instant, regular,
powder](https://fdc.nal.usda.gov/food-details/171893/nutrients).

## Instant Coffee

```json
{ "for": "USDA Instant Coffee Powder" }
```

## Vanilla Bean Pod (5g/pod)

```json
{
  "category": "Flavouring",
  "FruitSpec": {
    "water": 40,
    "protein": 3,
    "fat": 12,
    "carbohydrate": 45,
    "sugars": { "sucrose": 10 },
    "fiber": 25
  }
}
```

The composition is a rough estimate consolidated from various sources, including: [vanilla
etc](https://vanillaetc.com/products/madagascan-gourmet-vanilla-pods-1kg-vanilla-etc), (Ramachandra,
et al., 2000)[^71]. How much of the pod actually contributes to the mix composition depends on the
preparation, but is largely negligible. The weight of a single vanilla bean pod varies
significantly, but is typically ~5g for Bourbon vanilla beans:
[Norohy](https://en.norohy.com/how-much-does-a-vanilla-pod-weigh/),
[nielsen-massey.nl](https://www.nielsen-massey.nl/consumer/products-madagascar-bourbon-vanilla-beans.php).

@todo Change the name and specify a per-unit weight once supported by the library.

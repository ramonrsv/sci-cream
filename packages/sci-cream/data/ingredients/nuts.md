# Nuts

## Almond

```json
{
  "category": "Nut",
  "NutSpec": {
    "water": 4.41,
    "protein": 21.2,
    "fat": 49.9,
    "saturated_fat": 3.8,
    "carbohydrate": 21.6,
    "fiber": 12.5,
    "sugars": 4.35
  }
}
```

USDA FoodData Central - SR Legacy Foods - [Nuts,
almonds](https://fdc.nal.usda.gov/food-details/170567/nutrients).

## Pistachio

```json
{
  "category": "Nut",
  "NutSpec": {
    "water": 4.37,
    "protein": 20.2,
    "fat": 45.3,
    "saturated_fat": 5.91,
    "carbohydrate": 27.2,
    "fiber": 10.6,
    "sugars": 7.66
  }
}
```

USDA FoodData Central - SR Legacy Foods - [Nuts, pistachio nuts,
raw](https://fdc.nal.usda.gov/food-details/170184/nutrients).

## Roasted Pistachio

```json
{
  "category": "Nut",
  "NutSpec": {
    "water": 1.85,
    "protein": 21,
    "fat": 45.8,
    "saturated_fat": 5.64,
    "carbohydrate": 28.3,
    "fiber": 10.3,
    "sugars": 7.74
  }
}
```

USDA FoodData Central - SR Legacy Foods - [Nuts, pistachio nuts, dry roasted, without salt
added](https://fdc.nal.usda.gov/food-details/170185/nutrients).

## Hazelnut

```json
{
  "category": "Nut",
  "NutSpec": {
    "water": 5.31,
    "protein": 15,
    "fat": 60.8,
    "saturated_fat": 4.46,
    "carbohydrate": 16.7,
    "fiber": 9.7,
    "sugars": 4.34
  }
}
```

USDA FoodData Central - SR Legacy Foods - [Nuts, hazelnuts or
filberts](https://fdc.nal.usda.gov/food-details/170581/nutrients).

## Roasted Hazelnut

```json
{
  "category": "Nut",
  "NutSpec": {
    "water": 2.52,
    "protein": 15,
    "fat": 62.4,
    "saturated_fat": 4.51,
    "carbohydrate": 17.6,
    "fiber": 9.4,
    "sugars": 4.89
  }
}
```

USDA FoodData Central - SR Legacy Foods - [Nuts, hazelnuts or filberts, dry roasted, without salt
added](https://fdc.nal.usda.gov/food-details/170583/nutrients).

## Shoei Pistachio Paste

```json
{
  "category": "Nut",
  "CompositeSpec": {
    "ByPercentage": [
      ["Pistachio", 66],
      ["Sucrose", 26],
      ["Vegetable Oil", 8]
    ]
  }
}
```

From [ingredients list and nutrition facts
table](https://www.bakemart.com.hk/item/%E6%97%A5%E6%9C%AC%E6%AD%A3%E6%A6%AE%E9%96%8B%E5%BF%83%E6%9E%9C%E9%86%AC-Shoei-Pistachio-Paste%2CJapan/5899160460591104?srsltid=AfmBOordWXRqDwgvc_In2rr-n7ESlHgt68YB2-5c9XNFkPmvbsz2nLMw).

Ingredients: _"Pistachio nuts (USA), sugar, vegetable oil, corn syrup/emulsifier, coloring (Yellow
4, Blue 1, Red 2)"_ \
Nutrition facts table: _"Per 100g: energy 559kcal, protein 13.3g, lipid 38.0g, carbohydrates 44.2g"_

The components and their percentages are balanced to produce a similar composition to the nutrition
facts table.

## Joyful Nut Pistachio Butter

```json
{
  "category": "Nut",
  "CompositeSpec": {
    "ByPercentage": [
      [
        {
          "NutSpec": {
            "water": 3,
            "protein": 24.4,
            "fat": 55.3,
            "saturated_fat": 6,
            "carbohydrate": 16.7,
            "fiber": 10,
            "sugars": 5
          }
        },
        99.99
      ],
      ["Salt", 0.01]
    ]
  }
}
```

From ingredients list and nutrition facts table: (could not find a link to the product, recording
the information here from a physical package)

Ingredients: _"Pistachio nuts, food coloring (turmeric, gardenia blue), salt (0.01%)"_ \
Nutrition facts table: _"Per 100g: energy 2745 kJ, protein 24.4g, fat 55.3g, carbohydrates 16.7g"_

The calculated energy content of 622kcal/100g is off by 5% compared to the label value of
656kcal/100g. Some of the unspecified [`NutSpec`] values were estimated from the USDA FoodData
Central pistachio ingredients. @todo Convert to a user-saved ingredient once the App supports it.

## Nutella Hazelnut Spread with Cocoa

```json
{
  "category": "Nut",
  "CompositeSpec": {
    "ByPercentage": [
      ["Sucrose", 50.47],
      ["Palm Oil", 20],
      ["Roasted Hazelnut", 13],
      ["Skimmed Milk Powder", 8.7],
      ["Cocoa Powder, 10/12% Fat", 7.4],
      ["Liquid Soy Lecithin", 0.43]
    ]
  }
}
```

From the ingredients and nutrition table on Ferrero's [Moroccan product
page](https://www.nutella.com/ma/en/products/nutella), the only one found to declare the lecithin
and flavouring shares and the fiber. Ferrero's [UK product
page](https://www.nutella.com/uk/en/products/nutella) and Tesco's
[listing](https://www.tesco.com/shop/en-GB/products/263914432) leave those out but otherwise give
the same list and table.

Ingredients: _"Sugar, Vegetable fat (Palm), Hazelnuts (13%), Skimmed milk powder (8.7%), Fat
Reduced cocoa powder (7.4%), Emulsifier (lecithin (soy)) (0,43%)(INS 322), Flavouring (0,075%)"_ \
Nutrition table: _"Per 100g: energy 2252 kJ / 539 kcal, fats 30.9g, of which saturated fatty acids
10.6g, carbohydrates 57.5g, of which sugar 56.3g, alimentary fibre 3g, protein 6.3g, salt 0.107g"_

The sugar and palm oil, which no label quantifies, are fit to the nutrition table, in the order the
ingredients are listed. The lecithin is "Liquid Soy Lecithin", the flavouring is left out, and the
hazelnuts are "Roasted Hazelnut". Every figure is within 5% of the table but the fiber, 21% high.
The sucrose agrees with the _"Includes 19g Added Sugars"_ per 37 g of the North American label, on
Ferrero's [foodservice sell
sheet](https://www.ferrerofoodservice.com/ca/sites/ferrerofoodservice20_ca/files/2023-10/generic_nutella_sell_sheet_ca_1.23_2.pdf).

## Lindt Hazelnut Milk Chocolate Spread

```json
{
  "category": "Nut",
  "CompositeSpec": {
    "ByPercentage": [
      ["Sucrose", 40.07],
      ["Roasted Hazelnut", 25],
      ["Sunflower Oil", 12.5],
      ["Skimmed Milk Powder", 10],
      ["Cocoa Powder, 10/12% Fat", 9],
      ["Cocoa Butter", 2.5],
      ["Anhydrous Milk Fat", 0.5],
      ["Liquid Soy Lecithin", 0.43]
    ]
  }
}
```

From the ingredients and nutrition table on Lindt's [UK shop
page](https://www.lindt.co.uk/lindt-hazelnut-chocolate-spread-200g). Ocado's
[listing](https://www.ocado.com/products/lindt-hazelnut-chocolate-spread/542740011) gives the same
list and table. The Canadian
[jar](https://www.lindt.ca/en/lindt-hazelnut-milk-chocolate-spread-200g) declares the same _"25%
hazelnut"_, with a nutrition table that agrees within its rounding.

Ingredients: _"sugar, HAZELNUTS (25%), vegetable oil (sunflower, safflower and rice), skimmed MILK
powder, fat reduced cocoa powder, cocoa butter, anhydrous MILK fat, emulsifier (SOYA lecithin)"_ \
Nutrition table: _"Per 100g: energy 2339 kJ / 561 kcal, fat 33g, of which saturates 4.7g,
carbohydrate 52g, of which sugars 46g, protein 9.2g, salt 0.17g"_ \
Cocoa solids: _"11% minimum"_

The shares other than the hazelnut's are fit to the nutrition table, in the order the ingredients
are listed, with enough cocoa powder and cocoa butter to meet the cocoa solids minimum. The
lecithin, which the label doesn't quantify, is 0.43% "Liquid Soy Lecithin", Nutella's declared share
and within the 0.3-0.5% tested by Icyer et al. (2024)[^150]. The vegetable oil is "Sunflower Oil"
and the hazelnuts are "Roasted Hazelnut". Every figure is within 5% of the table.

## Rigoni di Asiago Nocciolata

```json
{
  "category": "Nut",
  "CompositeSpec": {
    "ByPercentage": [
      ["Sucrose", 44.57],
      ["Roasted Hazelnut", 18.5],
      ["Sunflower Oil", 14],
      ["Skimmed Milk Powder", 11],
      ["Cocoa Powder, 10/12% Fat", 6.5],
      ["Cocoa Butter", 5],
      ["Liquid Soy Lecithin", 0.43]
    ]
  }
}
```

From the ingredients on the UK label, as photographed on Italia Solutions'
[listing](https://italiasolutions.co.uk/products/rigoni-di-asiago-bio-nocciolata-250g-organic-hazelnut-cocoa-cream-spread),
and the nutrition table on Rigoni di Asiago's [product
page](https://www.rigonidiasiago.com/en-it/products/nocciolata-originale-250g), whose ingredient
percentages differ from the label's. Berchicci's Canadian
[listing](https://store.berchicci.ca/Rigoni-di-Asiago/Rigoni-Nocciolata-Organic-Cocoa-Hazelnut-Spread)
gives the same list and table.

Ingredients: _"Cane sugar\*, HAZELNUT paste\* 18.5%, sunflower oil\*, skimmed MILK powder\*, low-fat
cocoa powder\* 6.5%, cocoa butter\*, emulsifier: SOY lecithin\*, vanilla extract\*"_ \
Nutrition table: _"Per 100g: energy 2270 kJ / 544 kcal, fat 32g, of which saturates 5.7g,
carbohydrate 54g, of which sugars 51g, fibre 3.6g, protein 8.1g, salt 0.12g"_

The sugar, oil, milk powder, and cocoa butter are fit to the nutrition table, in the order the
ingredients are listed. The lecithin, which the label doesn't quantify, is 0.43% "Liquid Soy
Lecithin", Nutella's declared share and within the 0.3-0.5% tested by Icyer et al. (2024)[^150]. The
vanilla extract is left out and the hazelnut paste is "Roasted Hazelnut". Every figure is within 2%
of the table but the fiber, 7% high.

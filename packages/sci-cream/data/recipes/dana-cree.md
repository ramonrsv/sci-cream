# Dana Cree Recipes

These are reference recipes from _Hello, My Name Is Ice Cream: The Art and Science of the Scoop_, by
Dana Cree. There are a few things to note regarding the ingredients used in the book and their
mappings to Sci-Cream ingredients used here. The author makes a few clarifications (Cree, 2017, "A
Few Things to Know When Making These Recipes", p. 107-108)[^6]:

- **Milk:** _"The recipes [use] homogenized whole milk (the standard 4% butterfat)."_
- **Cream:** _"All cream in this book is heavy cream, with 40% butterfat content."_
- **Buttermilk:** _"... the recipes in this book use standard, cultured low-fat buttermilk."_
- **Cream cheese:** _"When cream cheese is called for ..., use blocks of full-fat cream cheese."_
- **Glucose:** _"Glucose is a key ingredient in these recipes, offering the textural benefits of
  sugar while tasting much less sweet. Glucose syrup is sold in [stores or online]. You can also
  substitute corn syrup ... or ... inverted sugar syrup, though both are noticeably sweeter."_

With regards to the mappings to Sci-Cream ingredients, "whole milk" typically refers to 3.25% milk,
and "heavy cream" to 36% cream, which makes the 4% and 40% values seem odd. However, Cree is
explicit about the butterfat percentages, and uses those values in calculations (Cree, 2017,
"Ratios, or How Math Will Help You Make Your Own Ice Cream Recipes", p. 540)[^6], so we use the
ingredients with precise butterfat percentages, namely "4% Milk" and "40% Cream". "Glucose Syrup"
is directly mapped to the Sci-Cream ingredient of the same name, which is an alias for "Glucose
Syrup 42 DE", the most common glucose syrup - see the ingredient definition for more details. The
"corn syrup" substitute is taken to mean retail corn syrup products, e.g. "Karo Light Corn Syrup" -
see [retail corn syrups](crate::docs#retail-corn-syrups) for more details.

With regards to stabilizers or "texture agents", each recipe offers several alternatives, but they
seem to be the same for every recipe, indicating that there is no fine per-recipe tailoring of
stabilizers. Recipes here will use the "Commercial Stabilizers" option. The full cited set is (Cree,
2017, "Blank Slate Custard Ice Cream", p. 115)[^6]:

1. Best texture: Commercial stabilizer 3g | 1 tsp
2. Least icy: Guar or xanthan gum 1g | 1/4 tsp
3. Easiest to use: Tapioca starch 5g | 2 tsp
4. Most accessible: Cornstarch 10g | 1 tbsp + 1 tsp

For all other non-obvious ingredients not listed above, approximations or best guesses are
documented per recipe as required. For example _"2 tablespoons vanilla extract"_ is modeled at about
25g, a middle ground between Cree's _"2 tbsp | 20g"_ equivalency for cold milk (Cree, 2017,
p. 115)[^6] and the ~28g of a 35% ABV solution at ~14.8ml per tablespoon (NIST, 2025,
"tablespoon")[^74], (Perry & Green, 2008, Table 2-112, p. 2-117)[^53].

A few caveats regarding Dana's composition calculations (Cree, 2017, "Assumed Percentages of Each
Ingredient", p. 540)[^6]. 9% MSNF for 40% butterfat cream is inconsistent with Goff & Hartel and
with nutrition labels, which show closer to 5.5% (Goff & Hartel, 2025, Table 3.2, p. 48)[^20].
Glucose syrups are closer to 80% solids according to various sources, not 90%. The solids are also
not modeled as 100% sugar, since at 42 DE many of the solids are still polysaccharides (Hull, 2010,
Appendix C.1-3, p. 321-323)[^15], (Goff & Hartel, 2013, Table 3.4, p. 67)[^2].

## Blank Slate Custard Ice Cream

```json
{
  "author": "Dana Cree",
  "recipe": [
    ["40% Cream", 300],
    ["4% Milk", 400],
    ["Glucose Syrup", 50],
    ["Sucrose", 150],
    ["Egg Yolk", 100],
    ["Commercial Stabilizers", 3]
  ]
}
```

(Cree, 2017, "Blank Slate Custard Ice Cream", p. 113)[^6]

## Vanilla Ice Cream

```json
{
  "author": "Dana Cree",
  "recipe": [
    ["40% Cream", 300],
    ["4% Milk", 400],
    ["Glucose Syrup", 50],
    ["Sucrose", 150],
    ["Vanilla Extract", 25],
    ["Egg Yolk", 100],
    ["Commercial Stabilizers", 3]
  ]
}
```

(Cree, 2017, "Vanilla Ice Cream", p. 120)[^6]. The recipe calls for _"Vanilla: 1 whole bean (or 2
tablespoons vanilla extract)"_. The vanilla extract option is included above, which is about 25g.

# Corvitto Recipes

These are reference recipes from _I Segreti del Gelato (Secrets of Ice-Cream)_, by Angelo Corvitto
(Corvitto, 2005)[^3].

With regards to ingredient translations, "full fat milk" is explicitly stated in the book to have a
3.6% butterfat content; the "Full Fat Milk" ingredient entry encodes this, aliasing "3.6% Milk"
(Corvitto, 2005, p. 149)[^3]. Regarding cocoa powder and chocolate ingredients, Sci-Cream includes
"Corvitto" ingredient definitions that encode the compositions as stated in the text. However, these
are mostly references used in internal validations, and are generally not used in the recipes, which
prefer generic entries where a clear translation exists, e.g. for "70% Dark Chocolate" - the text's
entries use idealized compositions that are less accurate than the library's sourced values. Milk
and white chocolates are exceptions, since those don't have a clear representative composition, as
product formulations can vary significantly. In those cases, the "Corvitto" entries are effectively
specific formulations and so these are used in the recipes.

_"Dry cocoa powder"_, _"type 22/24"_, is modeled as "Cocoa Powder, 22% Fat", since the author states
that the _"dry cocoa powder most commonly used in ice-cream making is the one that contains 22% of
fat and 78% of pure cocoa"_, and 22% fat is used in their calculations (Corvitto, 2005, p. 249)[^3].
Note that the generic entries include water, whereas Corvitto models cocoa powder as all solids. The
22% fat entry as a stand-in for 22/24% also differs slightly from the generic "Cocoa Powder, 22/24%
Fat", which has 23% fat and is more consistent with the spec sheets of branded products like
"Callebaut Botanical Extra Brute Cocoa Powder".

All other ingredients are either obvious, explicit, or clarified per recipe. The author's
composition calculations roughly match those produced by the `sci-cream` library; any significant
differences are discussed inline for any affected recipes. The composition values, e.g. PAC, POD,
etc., of the ingredients are similar, albeit not equal, to those in `sci-cream`, so there may be
some variation in the composition values of the recipe mixes (Corvitto, 2005, p. 149)[^3].

Corvitto provides two versions of each recipe, formulated for different serving temperatures of
-11°C and -18°C. These are designed for _"serving in a classical ice-cream parlor cabinet, placed in
an ice-cream tray, submited \[sic\] to a temperature of about -11°C"_, and for _"a restaurant that
normally has a horizontal or vertical freezer, whose temperature ranges from -18 to -20°C"_,
respectively (Corvitto, 2005, p. 33)[^3]. Note, however, that Corvitto's method for calculating the
serving temperature differs from the Goff & Hartel method in several aspects. Most notably, Corvitto
ignores the FPD contributions of milk salts, and appears to take the serving temperature at 70%
frozen water, as opposed to 75% in Goff & Hartel (Goff & Hartel, 2013, p. 181)[^2], (Corvitto, 2005,
p. 78)[^3]; see [`SERVING_TEMP_X_AXIS`] and [`CORVITTO_PAC_TO_SERVING_TEMP_TABLE`] for more details.
This means that Corvitto's -11°C and -18°C roughly translate to -14°C and -20°C in the Goff & Hartel
method, respectively.

## White Cream, -11°C

```json
{
  "author": "Corvitto",
  "recipe": [
    ["Full Fat Milk", 609],
    ["35% Cream", 166],
    ["Skimmed Milk Powder", 39],
    ["Dextrose", 20],
    ["Invert Sugar", 20],
    ["Sucrose", 140],
    ["Commercial Stabilizers", 6]
  ]
}
```

(Corvitto, 2005, "crema bianca / white cream", p. 150)[^3].

The ingredient _"neutral ingredients for cream / neutro per crema"_ is assumed to be a generic
commercial stabilizer and emulsifier blend for ice creams and gelatos, modeled as "Commercial
Stabilizers" (Corvitto, 2005, p. 150)[^3].

## White Cream, -18°C

```json
{
  "author": "Corvitto",
  "recipe": [
    ["Full Fat Milk", 567],
    ["35% Cream", 172],
    ["Skimmed Milk Powder", 42],
    ["Dextrose", 137],
    ["Invert Sugar", 26],
    ["Sucrose", 50],
    ["Commercial Stabilizers", 6]
  ]
}
```

(Corvitto, 2005, "crema bianca / white cream", p. 151)[^3].

The ingredient _"neutral ingredients for cream / neutro per crema"_ is assumed to be a generic
commercial stabilizer and emulsifier blend for ice creams and gelatos, modeled as "Commercial
Stabilizers" (Corvitto, 2005, p. 151)[^3].

## Egg Yolk Cream, -11°C

```json
{
  "author": "Corvitto",
  "recipe": [
    ["Full Fat Milk", 592],
    ["35% Cream", 83],
    ["Skimmed Milk Powder", 45],
    ["Dextrose", 20],
    ["Egg Yolk", 100],
    ["Sucrose", 140],
    ["Invert Sugar", 20]
  ]
}
```

(Corvitto, 2005, "crema all’uovo / egg yolk cream", p. 180)[^3].

## Egg Yolk Cream, -18°C

```json
{
  "author": "Corvitto",
  "recipe": [
    ["Full Fat Milk", 547],
    ["35% Cream", 86],
    ["Skimmed Milk Powder", 49],
    ["Dextrose", 148],
    ["Egg Yolk", 100],
    ["Sucrose", 50],
    ["Invert Sugar", 20]
  ]
}
```

(Corvitto, 2005, "crema all’uovo / egg yolk cream", p. 181)[^3].

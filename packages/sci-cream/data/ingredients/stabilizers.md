<!-- markdownlint-disable MD041 -- files are used to generate JSON, may also be concatenated -->

## Cornstarch

```json
{ "category": "Stabilizer", "StabilizerSpec": { "stabilizers": { "cornstarch": 100 } } }
```

## Tapioca Starch

```json
{ "category": "Stabilizer", "StabilizerSpec": { "stabilizers": { "tapioca_starch": 100 } } }
```

## Pectin

```json
{ "category": "Stabilizer", "StabilizerSpec": { "stabilizers": { "pectin": 100 } } }
```

This models pure pectin E440, which requires a minimum of 65% galacturonic acid on the ash-free and
anhydrous basis, and allows up to 12% water (The European Commission, 2025, E440)[^10]. Unlike the
other entries of individual stabilizers, it does _not_ model most retail pectin products, which
typically include fillers like dextrose, often at higher proportions than the active pectin (Kraft
Heinz, 2026, "Sure-Jell")[^124]. Those should be modeled via [`CompositeSpec`] including pure pectin
and fillers as separate ingredients.

## Gelatin

```json
{ "category": "Stabilizer", "StabilizerSpec": { "stabilizers": { "gelatin": 100 } } }
```

## Locust Bean Gum

```json
{ "category": "Stabilizer", "StabilizerSpec": { "stabilizers": { "locust_bean_gum": 100 } } }
```

## Guar Gum

```json
{ "category": "Stabilizer", "StabilizerSpec": { "stabilizers": { "guar_gum": 100 } } }
```

## Carrageenan

```json
{ "category": "Stabilizer", "StabilizerSpec": { "stabilizers": { "carrageenans": 100 } } }
```

## Lambda Carrageenan

```json
{ "category": "Stabilizer", "StabilizerSpec": { "stabilizers": { "carrageenans": 100 } } }
```

## Iota Carrageenan

```json
{ "category": "Stabilizer", "StabilizerSpec": { "stabilizers": { "carrageenans": 100 } } }
```

## Kappa Carrageenan

```json
{ "category": "Stabilizer", "StabilizerSpec": { "stabilizers": { "carrageenans": 100 } } }
```

## Carboxymethyl Cellulose

```json
{
  "category": "Stabilizer",
  "StabilizerSpec": { "stabilizers": { "carboxymethyl_cellulose": 100 } }
}
```

## Xanthan Gum

```json
{ "category": "Stabilizer", "StabilizerSpec": { "stabilizers": { "xanthan_gum": 100 } } }
```

## Sodium Alginate

```json
{ "category": "Stabilizer", "StabilizerSpec": { "stabilizers": { "sodium_alginate": 100 } } }
```

## Tara Gum

```json
{ "category": "Stabilizer", "StabilizerSpec": { "stabilizers": { "tara_gum": 100 } } }
```

## CMC

```json
{ "for": "Carboxymethyl Cellulose" }
```

## Underbelly Easy-to-find Stabilizer Blend

```json
{
  "category": "Stabilizer",
  "CompositeSpec": {
    "ByParts": [
      ["Gelatin", 3],
      ["Xanthan Gum", 1]
    ]
  }
}
```

### [Blend 1: Easy-to-find ingredients](https://under-belly.org/ice-cream-stabilizers/)

**Gelatin : Xanthan Gum** \
**3 : 1** \
1g gelatin 0.33g xanthan For 1 liter of ice cream (0.15% total)

_"Gelatin hydrates when cooked to 60°C / 140°F. Any standard cooking step will take care of this.
Both the gelatin and the xanthan suppress ice crystals and increase the viscosity of the mix. The
gelatin forms a weak gel that melts at body temperature and strengthens in the cold, so its effect
is most pronounced on the ice cream in the frozen state. The xanthan gum’s activity is almost
completely independent of temperature. So its effect is most pronounced on the ice cream in its
melted state. So if you want more body, increase the proportion of the gelatin. If you want a
creamier melt, increase the proportion of xanthan. You can experiment freely, but be warned that at
much higher concentrations, xanthan’s mouthfeel goes from creamy to slimy. If you’re not getting the
results you want from this blend at modest concentrations, you should move on to the other gums."_

## Underbelly General Purpose Stabilizer Blend

```json
{
  "category": "Stabilizer",
  "CompositeSpec": {
    "ByParts": [
      ["Locust Bean Gum", 4],
      ["Guar Gum", 2],
      ["Lambda Carrageenan", 1]
    ]
  }
}
```

### [Blend 2: General Purpose](https://under-belly.org/ice-cream-stabilizers/)

**Locust Bean Gum : Guar Gum : Lambda Carrageenan** \
**4 : 2 : 1** \
0.8g 0.4g 0.2g for 1L (0.25% water weight of formula, or 0.15% total)

_"Mix should be cooked at least to the hydration temperature of the locust bean gum. TIC Gums
versions hydrate at 74°C / 165°F—most brands hydrate at temperatures higher than what’s ideal for
most ice creams. All three gums suppress ice crystals and affect texture, but not equally. The
Locust Bean Gum is the most powerful at suppressing ice crystals. It has a subtle effect on
increasing the body of the ice cream and the creaminess of the melt. The Guar amplifies the power of
the locust bean gum, and has the strongest effect on the body of the frozen ice cream. Significantly
increasing the guar will make the ice cream chewy and elastic. The Lambda Carrageenan has the
strongest effect on the consistency of the melted ice cream. Its mouthfeel is similar to that of
custard, although it has a somewhat cleaner finish. If the melt feels too milky or watery, you can
subtly enrich it with a bit more LCG. I use this blend at 0.15% in a 15% milk fat ice cream that
uses 2 yolks per liter. For a richer, more custardy mix, you could experiment with using as little
as 0.1%. For a lighter ice cream, or one that needs a long shelf life, you could try 0.25%"_

## Underbelly Eggless Ice Cream Stabilizer Blend

```json
{
  "category": "Stabilizer",
  "CompositeSpec": {
    "ByParts": [
      ["Soy Lecithin Powder", 4],
      ["Locust Bean Gum", 4],
      ["Guar Gum", 2],
      ["Lambda Carrageenan", 1]
    ]
  }
}
```

### [Blend 3: Eggless Ice Cream](https://under-belly.org/ice-cream-stabilizers/)

_[edited 10-2018]_

**Soy Lecithin: Locust Bean Gum : Guar Gum : Lambda Carrageenan** \
**4 : 4 : 2 : 1** \
1g 1g 0.5g 0.25g for 1L (0.4% water weight of formula, or 0.25% total)

_"Mix should be cooked at least to the hydration temperature of the locust bean gum. TIC Gums
versions hydrate at 74°C / 165°F—most brands hydrate at temperatures higher than what’s ideal for
most ice creams. This is the same as the standard formula, but with the guar and carrageenan
increased, and with soy lecithin added. Egg custard has thickening and stabilizing benefits, so its
elimination requires a higher concentration of gums. The eggs also act as emulsifiers (see the next
post). The lecithin content of this blend is equal to a large egg yolk. You could theoretically use
less—as little as 1/3 this much. All the notes for manipulating the standard formula apply here. Be
careful if increasing the lecithin. You probably don’t have to. If you go too far, it will actually
impede the whipping of the ice cream."_

## Underbelly Sorbet Stabilizer Blend

```json
{
  "category": "Stabilizer",
  "CompositeSpec": {
    "ByParts": [
      ["Carboxymethyl Cellulose", 2],
      ["Guar Gum", 1],
      ["Lambda Carrageenan", 1]
    ]
  }
}
```

### [Blend 4: Sorbet](https://under-belly.org/ice-cream-stabilizers/)

_[updated 7-24-2019]_

**Carboxymethyl Cellulose : Guar Gum : Lambda Carrageenan** \
**2 : 1 : 1** \
2g 1g 1g for 1L (0.5% water weight)

_"This is a major update after a year of sorbet experiments. This formula requires no cooking, and
lets you make a sorbet without creating a separate syrup. Just blend the dry ingredients into the
fruit puree, chill, then spin. CMC is the wunderkind of sorbet stabilizing ingredients. Its ice
crystal suppression powers and effortless cold hydration make it the perfect choice. Guar adds body
and some elasticity, and amplifies the effects of the CMC; lambda carrageenan adds creaminess to the
melted texture. I don’t know why so many of the commercial stabilizer makers seem oblivious to CMC.
They may not be paying attention. Most sorbets have no fat content and don’t rely on a fat-based
foam structure, so they have no need for emulsifiers. If you wish to make a sorbet with chocolate,
nut butters, olive oil or other fatty ingredients, you may get smoother results by adding some
lecithin (maybe start with 1g / Liter). We’ll look at all this in greater depth in a future post on
sorbets."_

## Ice Cream Stabilizer Blend

```json
{ "for": "Underbelly Easy-to-find Stabilizer Blend" }
```

## Eggless Ice Cream Stabilizer Blend

```json
{ "for": "Underbelly Eggless Ice Cream Stabilizer Blend" }
```

## Sorbet Stabilizer Blend

```json
{ "for": "Underbelly Sorbet Stabilizer Blend" }
```

## Stabilizer Blend

```json
{ "for": "Underbelly General Purpose Stabilizer Blend" }
```

## Louis Francois Super Neutrose

```json
{
  "category": "Stabilizer",
  "CompositeSpec": {
    "ByPercentage": [
      ["Glucose Powder 42 DE", 45],
      ["Locust Bean Gum", 30],
      ["Sodium Alginate", 17],
      ["Carrageenan", 8]
    ]
  }
}
```

The recipe for [Louis Francois Super Neutrose](https://louisfrancois.com/en/produit/super-neutrose/)
is expectedly not published, so this is an estimation based on the ingredient list, their relative
order, and the manufacturer recommended dosage:

> **Description**
>
> Super Neutrose absorbs residual water from mixes: it has anti-crystallization properties, corrects
> the viscosity of mixes, improves velvety texture and smoothness, and adds creaminess. It also
> provides a significant increase in overrun and delays the melting of popsicles. \
> Super Neutrose is mainly used for sorbets, but can also be used for ice creams intended for
> low-foam applications.
>
> **Dosage**
>
> 2 to 5g/L - 0.2 to 0.5%.

The manufacturer's website information is also corroborated by the technical datasheet, with some
additional composition clarifications and expanded dosage information (Louis Francois, 2014, "Super
Neutrose Gallia")[^125]:

> **Composition**
>
> Sirop de Glucose déshydraté \
> Epaississant : Farine de graines de Caroube E410 \
> Gélifiants : Alginates de Sodium E401, Carraghénanes de Sodium E407
>
> **Doses conseillées**
>
> Glaces Parfums usuels - 2 à 3 g/l \
> Sorbets aux fruits - 4 à 5 g/l \
> Chantilly - 5 g/l

At _"2 to 3g/L [for] ice creams"_ (0.2 to 0.3%), the recommended dose is comparable to that of a
blend of pure gums, e.g. "Underbelly General Purpose Stabilizer Blend", indicating a composition
with a majority of active ingredients. 'Glucose powder' (_"Sirop de Glucose déshydraté"_) is the
first ingredient, so we model it as 45%, the rest being primarily gums. "Glucose Powder 42 DE" is
used as it is the most common and "regular" glucose powder - see the ingredient comments for more
details. "Locust Bean Gum" as the primary gum is typical of stabilizer blends for ice cream (Clarke,
2004, p. 52)[^4], so it's modeled at 30%. A gelling carrageenan is typically included in ice cream
formulations at about 0.02% (Clarke, 2004, p. 51)[^4], which works out to ~8% of the blend at the
recommended dosage. The remaining 17% is taken up by the "Sodium Alginate" (_"Alginates de Sodium
E401"_), which is consistent with the ingredient order.

## Louis Francois Stab 2000

```json
{
  "category": "Stabilizer",
  "CompositeSpec": {
    "ByPercentage": [
      ["Glucose Powder 42 DE", 45],
      ["Locust Bean Gum", 30],
      ["Sodium Alginate", 16],
      ["Carrageenan", 8],
      ["Glycerol Monostearate", 1]
    ]
  }
}
```

The recipe for [Louis Francois Stab 2000](https://louisfrancois.com/en/produit/stab-2000/) is
expectedly not published, so this is an estimation based on the ingredient list, their relative
order, and the manufacturer recommended dosage:

> **Description**
>
> Stab 2000 stabilizes the structure by preventing the formation of ice crystals. \
> It is also used to improve the body and texture of finished products. \
> It lends creaminess, promotes overrun, improves fat dispersion and emulsifies the various
> constituents of mixes.
>
> **Dosage**
>
> Between 2 and 5g/L - 0.2 to 0.5% \
> Low-fat ice creams (less than 7.5%): 4 to 5g/L - 0.4 to 0.5%. \
> High-fat ice creams (10 to 12%): 2 to 3g/L - 0.2 to 0.3%.

At _"2 to 3g/L - 0.2 to 0.3% [for] high-fat ice creams"_, the recommended dosage is the same as that
of 'Louis Francois Super Neutrose', and the ingredient list is identical bar the emulsifier, so the
proportions are estimated the same way - see that entry for the reasoning. The product is a powder,
so 'glucose syrup' is probably a labeling quirk and it's actually glucose powder, explicitly so in
Neutrose's datasheet (_"Sirop de Glucose déshydraté"_) - modeled here as "Glucose Powder 42 DE" for
the same reasons. It's difficult to estimate the emulsifying effect of the blend, and therefore the
proportion of "Glycerol Monostearate". However, any amount that respects the ingredient list order
would make it insufficient to be a primary emulsifier, so the contribution must be minimal,
nominally modeled here at 1%. "Alginate" is assumed to be "Sodium Alginate", also explicit in
Neutrose's datasheet (_"Alginates de Sodium E401"_). Its proportion is reduced by the above 1%,
since the value was determined via a remainder in the estimated formulation for Neutrose.

## Commercial Stabilizers

```json
{ "for": "Louis Francois Super Neutrose" }
```

A generic commercial stabilizer blend, i.e. gums cut with a filler, and no emulsifier. Commercial
blends vary in how much filler they carry: "Louis Francois Super Neutrose" leads with it, whereas
_"Modernist Pantry Perfect Ice Cream"_ declares "Guar Gum, Dextrose, Carrageenan, ..." in that
order, so its filler is a minority (Modernist Pantry, 2026, "Perfect Ice Cream")[^126]. As such, the
aliased ingredient is just an example of a popular commercial product, not a principled "standard".

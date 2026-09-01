<!-- markdownlint-disable MD041 -- files are used to generate JSON, may also be concatenated -->

## Lecithin

```json
{ "category": "Emulsifier", "EmulsifierSpec": { "emulsifiers": { "lecithin": 100 } } }
```

This is a theoretical pure lecithin, not representing any commercial product - it can be used in a
[`CompositeSpec`] to define ingredients that model real products. It's relatively close to lecithin
powders which have > 95% purity (acetone insoluble substances, i.e. phospholipids), but well above
liquid lecithins with a minimum 60% of substances insoluble in acetone (EFSA et al., 2017, 3.1.1
Identity of the substance)[^75], (The European Commission, 2025, E322)[^10].

## Soy Lecithin Powder

```json
{
  "category": "Emulsifier",
  "EmulsifierSpec": {
    "emulsifiers": { "lecithin": 95 },
    "other_solids": { "fats": { "total": 5 } }
  }
}
```

De-oiled soy lecithin powder with a purity (acetone insoluble substances) of ~95%; the remaining
substances are mostly triglycerides (EFSA et al., 2017, 3.1.1 Identity of the substance)[^75], (East
Harbour Group, 2026, "Lecithin, Technical Specification")[^122].

## Liquid Soy Lecithin

```json
{
  "category": "Emulsifier",
  "EmulsifierSpec": {
    "emulsifiers": { "lecithin": 60 },
    "other_solids": { "fats": { "total": 40 } }
  }
}
```

Liquid soy lecithin with a minimum purity (acetone insoluble substances) of ~60%; the remaining
substances are mostly triglycerides (The European Commission, 2025, E322)[^10], (East Harbour Group,
2026, "Lecithin, Technical Specification")[^122], (Konsonet, 2026, "Soya Lecithin Liquid
GMO")[^123], (EFSA et al., 2017, 3.1.1 Identity of the substance)[^75].

## Sunflower Lecithin Powder

```json
{
  "category": "Emulsifier",
  "EmulsifierSpec": {
    "emulsifiers": { "lecithin": 95 },
    "other_solids": { "fats": { "total": 5 } }
  }
}
```

De-oiled sunflower lecithin powder with a purity (acetone insoluble substances) of ~95%; the
remaining substances are mostly triglycerides (EFSA et al., 2017, 3.1.1 Identity of the
substance)[^75].

## Liquid Sunflower Lecithin

```json
{
  "category": "Emulsifier",
  "EmulsifierSpec": {
    "emulsifiers": { "lecithin": 60 },
    "other_solids": { "fats": { "total": 40 } }
  }
}
```

Liquid sunflower lecithin with a minimum purity (acetone insoluble substances) of ~60%; the
remaining substances are mostly triglycerides (The European Commission, 2025, E322)[^10], (EFSA et
al., 2017, 3.1.1 Identity of the substance)[^75]; its phospholipid composition is comparable to that
of liquid soy lecithin (EFSA et al., 2017, Table 2)[^75].

## Egg Yolk Lecithin

```json
{ "category": "Emulsifier", "EmulsifierSpec": { "emulsifiers": { "lecithin": 100 } } }
```

## Gum Arabic

```json
{ "category": "Emulsifier", "EmulsifierSpec": { "emulsifiers": { "gum_arabic": 100 } } }
```

By EU regulation, gum arabic (E414) products can have up to 17% water and 4% ash (The European
Commission, 2025, E414)[^10]. Here it is modeled as 100% `gum_arabic` since "gum arabic" products
aren't sold at a range of purity grades, and aside from emulsification the solids composition has no
meaningful effect in the ice cream formulation at normal usage levels.

## Mono- and Diglycerides

```json
{ "category": "Emulsifier", "EmulsifierSpec": { "emulsifiers": { "mono_and_diglycerides": 100 } } }
```

## Distilled Monoglycerides

```json
{
  "category": "Emulsifier",
  "EmulsifierSpec": { "emulsifiers": { "distilled_monoglycerides": 100 } }
}
```

## Polysorbate 80

```json
{ "category": "Emulsifier", "EmulsifierSpec": { "emulsifiers": { "polysorbate_80": 100 } } }
```

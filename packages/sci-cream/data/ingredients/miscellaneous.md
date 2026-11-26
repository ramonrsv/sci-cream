# Miscellaneous

The vegetable oils are [`FullSpec`] entries, their fat _Other Fats_, with no hardness factor, which
Corvitto gives for cocoa butter and nut fat only (Corvitto, 2005, pp. 243, 274)[^3].

## Water

```json
{ "category": "Miscellaneous", "FullSpec": {} }
```

## Salt

```json
{ "category": "Miscellaneous", "MicroSpec": "Salt" }
```

## Vegetable Oil

```json
{
  "category": "Miscellaneous",
  "FullSpec": { "solids": { "other": { "fats": { "total": 100, "saturated": 13.4 } } } }
}
```

USDA FoodData Central - Survey (FNDDS) - [Vegetable oil,
NFS](https://fdc.nal.usda.gov/food-details/2710180/nutrients)

"Vegetable oil" is a class name that can stand for a blend of oils. The EU and UK let refined
vegetable oils be grouped as _"vegetable oils"_, followed by their origins and optionally _"in
varying proportions"_ (Regulation (EU) No 1169/2011, n.d., Annex VII, Part A, 8)[^127], and the US
as a blend of vegetable oils, naming each oil in parentheses (U.S. FDA, CFR 21, 101.4(b)(14))[^52].
Canada allows _"vegetable oil"_ for one oil or a blend, with some exceptions (CFIA, 2025)[^143].

The entry takes USDA's survey recipe for vegetable oil "not further specified": soybean 45%,
olive 25%, canola 15%, corn 10%, and sunflower 5%. USDA gives no trans fat value.

## Canola Oil

```json
{
  "category": "Miscellaneous",
  "FullSpec": {
    "energy": 884,
    "solids": { "other": { "fats": { "total": 100, "saturated": 7.36, "trans": 0.395 } } }
  }
}
```

USDA FoodData Central - SR Legacy - [Oil,
canola](https://fdc.nal.usda.gov/food-details/172336/nutrients)

## Rapeseed Oil

```json
{ "for": "Canola Oil" }
```

Food rapeseed oil is low erucic acid rapeseed oil, the only kind the US lists as edible, with at
most 2% of its fatty acids as erucic acid (U.S. FDA, CFR 21, 184.1555(c))[^52], and the UK caps
erucic acid in food oils at the same 20 g per kg of fatty acids, with some exceptions (Regulation
(EC) No 1881/2006, n.d., Annex, 8.1.1)[^141]. Codex gives "canola oil" as one of the names for low
erucic acid rapeseed oil (Codex, CXS 210-1999, §2.1.13)[^138]. High erucic acid rapeseed is grown
for industry ("Erucic acid", 2026)[^142].

## Coconut Oil

```json
{
  "category": "Miscellaneous",
  "FullSpec": {
    "energy": 892,
    "solids": { "other": { "fats": { "total": 99.1, "saturated": 82.5, "trans": 0.028 } } }
  }
}
```

USDA FoodData Central - SR Legacy - [Oil,
coconut](https://fdc.nal.usda.gov/food-details/171412/nutrients)

The 0.9 g left after the fat counts as water, though USDA measured 0.03 g each of water and ash.

## Olive Oil

```json
{
  "category": "Miscellaneous",
  "FullSpec": {
    "energy": 884,
    "solids": { "other": { "fats": { "total": 100, "saturated": 13.8 } } }
  }
}
```

USDA FoodData Central - SR Legacy - [Oil, olive, salad or
cooking](https://fdc.nal.usda.gov/food-details/171413/nutrients)

USDA gives no trans fat value.

## Palm Oil

```json
{
  "category": "Miscellaneous",
  "FullSpec": {
    "energy": 884,
    "solids": { "other": { "fats": { "total": 100, "saturated": 49.3 } } }
  }
}
```

USDA FoodData Central - SR Legacy - [Oil,
palm](https://fdc.nal.usda.gov/food-details/171015/nutrients)

USDA gives no trans fat value.

## Soybean Oil

```json
{
  "category": "Miscellaneous",
  "FullSpec": {
    "energy": 884,
    "solids": { "other": { "fats": { "total": 100, "saturated": 15.3, "trans": 0.678 } } }
  }
}
```

USDA FoodData Central - SR Legacy - [Oil, vegetable, soybean,
refined](https://fdc.nal.usda.gov/food-details/172370/nutrients)

## Sunflower Oil

```json
{
  "category": "Miscellaneous",
  "FullSpec": {
    "energy": 884,
    "solids": { "other": { "fats": { "total": 100, "saturated": 9.01, "trans": 0.219 } } }
  }
}
```

USDA FoodData Central - SR Legacy - [Oil, industrial, mid-oleic,
sunflower](https://fdc.nal.usda.gov/food-details/172357/nutrients)

SR Legacy's mid-oleic record is taken as generic "sunflower oil", as Foundation's only sunflower
oil, [Oil, sunflower](https://fdc.nal.usda.gov/food-details/1750349/nutrients), is mid-oleic too,
at 67.5% oleic acid and 8.99 g of saturated fat. Mid-oleic oil is 55-75% oleic acid (Health
Canada, 2024)[^139], a range trading rules set (National Sunflower Association, n.d., p. 5)[^140].

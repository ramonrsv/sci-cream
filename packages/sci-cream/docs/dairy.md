# Dairy

Milk fat and milk solids non-fat (MSNF) are key components of most ice cream formulations (Goff &
Hartel, 2025, p. 17)[^20], which makes dairy a crucial source of ice cream ingredients (Goff &
Hartel, 2025, Table 3.1, pp. 46–47)[^20], (Goff, n.d., "10. Milkfat and Non-dairy Fats", "11. Milk
Solids-not-fat")[^90]. Such ingredients are typically defined with [`DairySimpleSpec`],
[`DairyLabelSpec`], or [`DairySheetSpec`], which use the provided values and internal models to
build a full composition, with breakdowns of its fats, sugars, and proteins (casein, whey).
Associated constants and model utilities can be found at
[`constants::composition::dairy`](crate::constants::composition::dairy) and its submodules.

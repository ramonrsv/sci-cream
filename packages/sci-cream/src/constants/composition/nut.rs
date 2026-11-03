//! Standard composition values for nuts, e.g. almonds, hazelnuts, etc.

/// Percentage of saturated fats typical of nut fat; see [`NutSpec`](crate::specs::NutSpec).
///
/// This value is an average compiled from the nutrient profiles of various nuts in the _USDA
/// FoodData Central_ database (USDA, 2019, "Nuts, almonds")[^502], (USDA, 2019, "Nuts,
/// pistachio nuts, raw")[^512], (USDA, 2019, "Nuts, hazelnuts or filberts")[^513].
#[doc = include_str!("../../../docs/references/index/502.md")]
#[doc = include_str!("../../../docs/references/index/512.md")]
#[doc = include_str!("../../../docs/references/index/513.md")]
pub const STD_SATURATED_FAT_IN_NUT_FAT: f64 = 0.09;

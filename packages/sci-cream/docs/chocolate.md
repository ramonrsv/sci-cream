# Chocolate

The terminology around chocolate ingredients can be confusing and used inconsistently across
different industries and stages of processing. For clarity, within this library we define:

- **_Cacao_ solids**: the total dry matter content derived from the cacao bean (sometimes referred
  to as "chocolate liquor", "cocoa mass", etc.) including both cocoa butter (fat) and cocoa solids
  (non-fat solids). This is the percentage advertised on chocolate packaging, e.g. 70% dark
  chocolate has 70% cacao solids.

  This value is specified in [`Composition`], accessible via [`CompKey::CacaoSolids`], and
  corresponds to [`ChocolateSpec::cacao_solids`].

- **Cocoa butter**: the fat component extracted from cacao solids (sometimes referred to as "cocoa
  fat"). This component affects the texture of ice creams by hardening the frozen product, and
  contributes to the _"perception of richness in chocolate ice creams... [due to] the lubricating_
  _effect that cocoa butter provides as it melts in the mouth."_ (Goff & Hartel, 2025, p. 107)[^20].
  It is rarely advertised on packaging, but can usually be inferred from the nutrition table.

  This value is specified in [`Composition`], accessible via [`CompKey::CocoaButter`], and
  corresponds to [`ChocolateSpec::cocoa_butter`].

- **_Cocoa_ solids**: the non-fat component of cacao solids (sometimes referred to as "cocoa powder"
  or "cocoa fiber"), i.e. cacao solids minus cocoa butter. In ice cream mixes, this generally
  determines the intensity of the chocolate flavor, and contributes to the texture and body.

  This value is specified in [`Composition`], accessible via [`CompKey::CocoaSolids`].

[`ChocolateSpec`] and [`CocoaPowderSpec`] can be used to define chocolate and cocoa powder
ingredients, which have fields for the above terms as well as for [`sugars`](ChocolateSpec::sugars)
and [`other_solids`](ChocolateSpec::other_solids).

## Dutch Processed

_Dutch processed_, _dutched_, or _alkalized_ cocoa is cocoa that has been treated with alkalizing
agents at the time of roasting. This alkalization process can shift the pH of natural nibs from
about 5.2-5.6 up to 7.0-8.6, resulting in cocoa that is less acidic and astringent, and has a darker
color (Goff & Hartel, 2025, p. 105)[^20], (Miller et al., 2008)[^85]. Alkalizing agents vary, with
_"\[a\]mmonium, potassium, or sodium bicarbonate, carbonate, or hydroxide, or magnesium carbonate or
oxide"_ permitted (U.S. FDA, CFR 21, 163.110(b)(1))[^86]. Dutch processing is a graded scale, where
natural cocoa powders have an extractable pH of 5.3-5.8, and alkalized cocoa powders can be grouped
into lightly treated (pH 6.50-7.20), medium treated (pH 7.21-7.60), and heavily treated (pH 7.61 and
higher) (Miller et al., 2008)[^85].

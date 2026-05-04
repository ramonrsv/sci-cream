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

[`ChocolateSpec`] can be used to define chocolate ingredients, which has fields for the above terms
as well as for [`sugars`](ChocolateSpec::sugars) and [`other_solids`](ChocolateSpec::other_solids).

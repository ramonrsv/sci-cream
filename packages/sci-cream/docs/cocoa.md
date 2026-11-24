# Cocoa

Chocolate and cocoa products, used in the formulation of chocolate ice creams, are made from cocoa
beans, harvested from the _Theobroma cacao_ tree (Goff & Hartel, 2025, p. 102)[^20]. The beans are
cleaned and shelled, leaving the cotyledons, known as "nibs" (Belitz et al., 2009, p. 960)[^17],
which are ground into chocolate liquor after roasting (Goff & Hartel, 2025, p. 104)[^20]. Cocoa
butter can be separated from hot chocolate liquor through the use of hydraulic presses, producing
free cocoa butter and cocoa cakes that are ground into cocoa powder (Goff & Hartel, 2025,
p. 105)[^20]. The cocoa components of these products have different effects and uses in the
manufacturing of chocolate products and ice creams, and are described in standards, specification
sheets, and the literature:

- **Cocoa solids**: Everything in a product that comes from the cocoa bean, including cocoa butter.
  Codex and Canadian standards call them _"total cocoa solids"_ (Codex, CXS 87-1981, §2.1.1)[^135],
  (CFIA, 2025, Volume 4, 4.1.6)[^136], EU ones _"total dry cocoa solids"_ (Directive 2000/36/EC,
  2000, Annex I A.3(a))[^84], and Callebaut's sheets _"Dry cocoa solids"_ (Barry
  Callebaut, 2023)[^543]. They are the percentage on a chocolate's label, which EU labels state as
  _"cocoa solids: ... % minimum"_ (Directive 2000/36/EC, 2000, Article 3(3))[^84], and North
  American ones often as "cacao", as in _"CACAO SOLIDS: 70% MINIMUM"_ (Lindt 70% Cacao Dark
  Chocolate, 2026)[^507]. This term is important for the specification of chocolate products, but
  ice cream formulations more often work with its constituent cocoa butter and cocoa solids non-fat
  (below), whose effects differ (Corvitto, 2005, p. 249, 254)[^3], (Goff & Hartel, 2025,
  p. 106)[^20]. US regulations still use it for ice creams, reducing the milkfat and milk solids
  required of chocolate ones in proportion to their cocoa solids (Goff & Hartel, 2025, p. 107)[^20].

  This value is specified in [`Composition`], accessible via [`CompKey::CocoaSolids`], and
  corresponds to [`ChocolateSpec::cocoa_solids`], [`CocoaPowderSpec::cocoa_solids`], and
  [`ChocolateLabelSpec::cocoa_solids`].

- **Cocoa butter**: The fat in cocoa beans, about 55% of the nibs (Goff & Hartel, 2025,
  p. 104)[^20]. Codex, Canadian, and EU standards call it _"cocoa butter"_ (Codex, CXS 87-1981,
  §2.1.1)[^135], (CFIA, 2025, Volume 4, 4.1.6)[^136], the EU defining it as _"the fat obtained from
  cocoa beans or parts of cocoa beans"_ (Directive 2000/36/EC, 2000, Annex I A.1)[^84], and US ones
  _"cacao fat"_ (U.S. FDA, CFR 21, 163.111)[^86]. It is _"practically flavorless"_ (Goff & Hartel,
  2025, p. 105)[^20], but it hardens the frozen product (Corvitto, 2005, p. 243)[^3], and enhances
  _"the perception of richness in chocolate ice creams"_ through _"the lubricating effect that cocoa
  butter provides as it melts in the mouth"_ (Goff & Hartel, 2025, p. 107)[^20]. It is rarely
  advertised on packaging, but can usually be inferred from the nutrition table.

  This value is specified in [`Composition`], accessible via [`CompKey::CocoaButter`]. In
  [`CocoaPowderSpec`] it is specified directly in the
  [`cocoa_butter`](CocoaPowderSpec::cocoa_butter) field. In [`ChocolateSpec`] it is specified in the
  [`ChocolateSpec::fat`] field, via [`ChocolateFat::Split::cocoa_butter`].

- **Cocoa solids non-fat**, or cocoa SNF: The cocoa solids less the cocoa butter. Codex and Canada
  call them _"fat-free cocoa solids"_, the EU _"dry non-fat cocoa solids"_, and Goff & Hartel
  _"nonfat cocoa solids"_, at 78-90% of cocoa powder and 40-50% of chocolate liquor (Goff & Hartel,
  2025, p. 106)[^20]. This is the component chiefly responsible for the chocolate flavor and color
  in chocolate ice creams (Clarke, 2004, p. 56)[^4], (Goff & Hartel, 2025, p. 105-107)[^20],
  (Corvitto, 2005, p. 249)[^3]. In ice cream mixes, it generally determines the intensity of the
  chocolate flavor (Goff & Hartel, 2025, p. 107)[^20], and contributes to the texture by hardening
  the frozen product (Corvitto, 2005, p. 243)[^3]. Corvitto calls for 4 to 5% of cocoa SNF in a mix
  to give chocolate flavor (Corvitto, 2005, p. 249)[^3], while Goff & Hartel find 2.7-3.2% of cocoa
  powder adequate, about 2 to 3% of cocoa SNF (Goff & Hartel, 2025, p. 106)[^20]. Some formulations
  go as high as 9%, as in Underbelly's Single Origin Cocoa Ice Cream, with _"Cocoa Solids Nonfat:
  88g / 9%"_ (Raphaelson, 2018)[^81].

  This value is specified in [`Composition`], accessible via [`CompKey::CocoaSNF`].

Chocolate liquor, also cocoa mass or cocoa paste, is often listed as an ingredient, containing both
the non-fat cocoa solids and the cocoa butter ("Cocoa solids", 2026)[^137], (U.S. FDA, CFR 21,
163.111)[^86]. As in the standards, sheets, and labels above, unqualified "cocoa solids" means the
total, cocoa butter included. Cocoa powder contains chiefly cocoa solids non-fat, although it almost
always contains residual fat, typically in grades of 10-12% or 22-24% (Goff & Hartel, 2025,
p. 105)[^20], or of 20-22%, the EU requiring at least 20% cocoa butter in the dry matter of "cocoa
powder" (Directive 2000/36/EC, 2000, Annex I A.2)[^84]. The names used to describe the grades can
vary by jurisdiction; see the "Cocoa Powder, 10/12% Fat", "Cocoa Powder, 20/22% Fat", and "Cocoa
Powder, 22/24% Fat" ingredients for more information. A product's cocoa solids typically come from
chocolate liquor, from added cocoa butter, or from cocoa powder.

[`ChocolateSpec`] and [`CocoaPowderSpec`] can be used to define chocolate and cocoa powder
ingredients, which have fields for the above terms as well as for [`sugars`](ChocolateSpec::sugars)
and [`other_solids`](ChocolateSpec::other_solids). [`ChocolateLabelSpec`] can be used to define
either from a nutrition label instead, deriving values from its figures and typical compositions.

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

<!-- markdownlint-disable MD033 -- needed for id attribute anchors -->
<!-- markdownlint-disable MD041 -- files are concatenated together -->

## Polyols

Sugar alcohols, commonly used as sugar substitutes, e.g. erythritol, maltitol, etc., are
reduced-calorie, sugar-free bulk sweeteners. Because the intensity of sweetness and sweetness
profile of polyols are close to sucrose, they can be used to replace sugar for bulk and sweetness in
ice cream formulations. This is an advantage of polyols over intense sweeteners that require bulking
agents or fillers (Spillane, 2006, p. 153)[^9]. Polyols also have sever health advantages, such as
not promoting tooth decay and producing low glycemic index and reduced insulin response, making them
suitable for diabetics (Spillane, 2006, p. 161)[^9].

**Note**: These are distinct from artificial sweeteners (e.g. aspartame, sucralose, etc.) which
typically have no functional properties other than sweetness. See [`artificial
sweeteners`](crate::docs#artificial-sweeteners) for more details on those.

The detailed breakdown of sugar alcohols in a mix is tracked in [`Polyols`]. [Potere Anti-Congelante
(PAC)](crate::docs#pac-afp-fpdf-se) and [Potere Dolcificante (POD)](crate::docs#pod) values for all
sugars documented here can be found at [constants::pac](crate::constants::pac) and
[constants::pod](crate::constants::pod), respectively.

- <a id="erythritol"></a>**Erythritol** is a sugar alcohol that occurs naturally in some fruits and
  fermented foods. It is about 70% as sweet as sucrose, but has almost no caloric value (0.2
  kcal/g). It has a sweetness profile similar to sucrose with slight acidity and bitterness, no
  aftertaste, clean sweet taste, and a cooling sensation in the mouth. It is approved for general
  use in most countries, including in the US and EU (E968) (Spillane, 2006, Table 8.5, p. 159)[^9],
  (The European Commission, 2025, E968)[^10], (Hull, 2010, Appendix C.3, p. 324)[^15], (European
  Association of Polyols Producers, 2026, "Polyol Erythritol")[^19].

  This component is tracked in [`field@Polyols::erythritol`].

- <a id="maltitol"></a>**Maltitol** is a sugar alcohol derived from maltose obtained from starch. It
  is about 90% as sweet as sucrose, sweeter than most other polyols, has a low cooling effect in the
  mouth, similar to sucrose, and is one of the most hygroscopic polyols. It has a caloric value of
  approximately 2.4 kcal/g. It is often used as a fat replacer because of its creamy mouth feel. It
  is approved for general use in most countries, including in the US and EU (E965) (Spillane, 2006,
  Tables 8.3, 8.5, p. 156, 159)[^9], (The European Commission, 2025, E965)[^10], (Hull, 2010,
  Appendix C.3, p. 324)[^15], (European Association of Polyols Producers, 2026, "Polyol
  Maltitol")[^19]

  This component is tracked in [`field@Polyols::maltitol`].

- <a id="sorbitol"></a>**Sorbitol** is a sugar alcohol that occurs naturally in some fruits. It is
  approximately 50-60% as sweet as sucrose and has a similar sweetness profile, but it has a
  significant cooling effect in the mouth. It is one of the most hygroscopic polyols, and has a
  caloric value of approximately 2.6-3.0 kcal/g. It is approved for general use in most countries,
  including in the US and EU (E420) (Spillane, 2006, Tables 8.3, 8.5, p. 156, 159)[^9], (The
  European Commission, 2025, E420)[^10], (Hull, 2010, Appendix C.3, p. 324)[^15], (European
  Association of Polyols Producers, 2026, "Polyol Sorbitol")[^19].

  This component is tracked in [`field@Polyols::sorbitol`].

- <a id="xylitol"></a>**Xylitol** is a sugar alcohol that occurs naturally in some fruits. It is
  almost as sweet as sucrose at about 95% the sweetness, and has a similar sweetness profile, but it
  has an intense cooling effect in the mouth that makes it less suitable for use in some
  formulations. It is the most hygroscopic polyol, and has a caloric value of approximately 2.4-3.0
  kcal/g. It is approved for general use in most countries, including in the US and EU (E967)
  (Spillane, 2006, Tables 8.3, 8.5, p. 156, 159)[^9], (The European Commission, 2025, E967)[^10],
  (Hull, 2010, Appendix C.3, p. 324)[^15], (European Association of Polyols Producers, 2026, "Polyol
  Xylitol")[^19].

  This component is tracked in [`field@Polyols::xylitol`].

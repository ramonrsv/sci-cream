<!-- markdownlint-disable MD033 -- needed for id attribute anchors -->
<!-- markdownlint-disable MD041 -- files are concatenated together -->

## Artificial Sweeteners

Non-saccharide artificial sweeteners, commonly used as sugar substitutes, are typically
high-intensity sweeteners ranging from 10s to 100s of thousands of times sweeter than sucrose
(Spillane, 2006, Table 9.7, p. 209-213)[^9]. They are often non-nutritive, but even when they aren't
(e.g. [`ASPARTAME`](constants::energy::ASPARTAME), which provides 4kcal/g, similar to sucrose), due
to their high potency they are used in such small quantities that their energy contribution is
negligible. They can be produced synthetically (e.g. aspartame, sucralose) or extracted from natural
sources (e.g. stevia and monkfruit extracts).

In ice cream formulations their sole purpose is to provide sweetness without contributing to the
bulk, freezing point depression, or other functional properties that sugars provide.

**Note**: These are distinct from sugar alcohols (e.g. erythritol, maltitol, etc.) which have
different functional properties and are used in different quantities. See
[`polyols`](crate::docs#polyols) for more details on those.

The detailed breakdown of artificial sweeteners in a mix is tracked in [`ArtificialSweeteners`].
[Potere Anti-Congelante (PAC)](crate::docs#pac-afp-fpdf-se) and [Potere Dolcificante
(POD)](crate::docs#pod) values for all sugars documented here can be found at
[constants::pac](crate::constants::pac) and [constants::pod](crate::constants::pod), respectively.

- <a id="aspartame"></a>**Aspartame** is a common non-saccharide high-intensity artificial
  sweetener. It is a methyl ester of aspartic acid and phenylalanine. It is approximately 200 times
  sweeter than sucrose, and provides about 4 kcal/g (similar to sucrose), but due to its high
  potency it is used in such small quantities that its energy contribution is negligible. It is one
  of the most studied food additives and has been deemed safe for human consumption by numerous
  regulatory agencies worldwide (The European Commission, 2025, E951)[^10], (International Food
  Information Council Foundation, 2019, "What is aspartame?")[^21], (Spillane, 2006, Table 9.3, p.
  179)[^9], (Spillane, 2006, Table 9.4, p. 187)[^9]. It is found in various brand-name products such
  as Equal and Canderel.

  This component is tracked in [`field@ArtificialSweeteners::aspartame`].

- <a id="cyclamate"></a>**Cyclamate** is a zero-calorie artificial sweetener. It is the sodium or
  calcium salt of cyclamic acid. It is approximately 30-50 times sweeter than sucrose. It is often
  used with other artificial sweeteners like saccharin for improved taste. It is banned in the US
  but approved for use in many other countries, including the EU (E952) (Spillane, 2006, Table 9.4,
  p. 188)[^9], (The European Commission, 2025, E952)[^10], (Lawrence, 2003, "Cyclamates")[^32].

  This component is tracked in [`field@ArtificialSweeteners::cyclamate`].

- <a id="saccharin"></a>**Saccharin** is a non-nutritive artificial sweetener. Its name is derived
  from "saccharine", the latin word for sugar. It is approximately 400 times sweeter than sucrose,
  but has no caloric value. It is one of the oldest artificial sweeteners, discovered in 1878. Its
  use became widespread with the introduction of cyclamate, which is often used in combination with
  saccharin to improve the taste. It is widely approved for use in many countries, including in the
  US and EU (E954) (Spillane, 2006, Table 9.3, p. 181)[^9], (The European Commission, 2025,
  E954)[^10], (American Diabetes Association, 2014, "Saccharin")[^22].

  This component is tracked in [`field@ArtificialSweeteners::saccharin`].

- <a id="sucralose"></a>**Sucralose** is a common non-nutritive artificial sweetener. It is derived
  from and approximately 600 times sweeter than sucrose. It compares favorably to other artificial
  sweeteners in terms of taste, stability, and safety profile, and is one of the most commonly used
  artificial sweeteners, found in products such as Splenda. It is widely approved for use in many
  countries, including in the US and EU (E955) (Spillane, 2006, Table 9.3, p. 184)[^9], (The
  European Commission, 2025, E955)[^10], (Castro-Muñoz, 2022)[^11]), (Hull, 2010, Appendix C.3, p.
  324)[^15], (Schiffman, 2013, "Abstract")[^23].

  This component is tracked in [`field@ArtificialSweeteners::sucralose`].

- <a id="steviosides"></a>**Steviosides** — Steviol glycosides are the main active sweetening
  compounds in stevia extract. Stevioside and rebaudioside are ent-kaurene-type diterpene glycosides
  based on the aglycone steviol isolated from the leaves of Stevia rebaudiana (commonly known as
  candyleaf, sweetleaf, or sugarleaf). Their sweetness has been rated as 210 and 450 times sweeter
  than sucrose (Spillane, 2006, p. 210, 297)[^9]. They are not digested and so have no caloric value
  (Priscilla, 2018, "Metabolism of steviol glycosides")[^28]. They are the primary sweetening
  compounds in stevia extract, a common low-calorie sugar substitute.

  This component is tracked in [`field@ArtificialSweeteners::steviosides`].

- <a id="mogrosides"></a>**Mogrosides** are the main active sweetening compounds in monkfruit
  extract. They are cucurbitane-type triterpenoid glycosides isolated from the fruits of Siraitia
  grosvenorii (commonly known as monkfruit, swingle fruit, or luo han guo). Their sweetness has been
  rated as 233 to 425 times sweeter than sucrose (Spillane, 2006, p. 210, 297)[^9]. They are
  degraded by digestive enzymes and intestinal microflora, and excreted in the feces as mogrol, so
  they have no caloric value (Murata, 2010, "Abstract")[^29]. They are the primary sweetening
  compounds in monkfruit extract, a common low-calorie sugar substitute.

  This component is tracked in [`field@ArtificialSweeteners::mogrosides`].

<!-- markdownlint-disable MD033 -- needed for id attribute anchors -->
<!-- markdownlint-disable MD041 -- files are concatenated together -->

## Emulsifiers

Emulsifiers are substances that produce a stable suspension of two liquids that do not mix naturally
(are immiscible), typically oil and water. They are two-faced molecules that have both a hydrophilic
(water-attracting) and an oleophilic (fat-attracting) side, also labelled hydrophobic
(water-repelling). They are common in nature, e.g. in egg yolks, milk, etc. (Clarke, 2004, p.
48)[^4], (Goff & Hartel, 2025, p. 84)[^20], (Raphaelson, 2023, January)[^38], (Ice Cream Science,
2026, May, "Why are emulsifiers used in ice cream?")[^45], (Carl, 2024, April)[^46].

Due to the proteins in milk and cream, chiefly casein which makes up about 80% of milk proteins, ice
cream mixes are already adequately emulsified, so emulsifiers are not needed for fat emulsification
in the classic sense. Instead, emulsifiers are used to lower the fat/water interfacial tension in
the mix, resulting in protein displacement from the fat globule surface. In turn, this reduces the
stability of the fat globule allowing partial coalescence during the whipping and freezing process.
In a sense, emulsifiers are used to _weaken_ or _destabilize_ the emulsion (Goff & Hartel, 2025, p.
84), (Raphaelson, 2023, January)[^38].

The effect of emulsifiers noted above serves several purposes in ice cream formulations. They
promote fat nucleation during aging (reducing aging time), improve whipping quality by stabilizing
the air interface for smaller, more homogeneous air cells, and enhance fat structuring. This fat
structuring, combined with more numerous air bubbles, also increases resistance to shrinkage, rapid
meltdown, and the development of coarse or icy textures, while contributing to a smooth finish in
the frozen product (Goff & Hartel, 2025, pp. 84–85)[^20].

The detailed breakdown of added emulsifiers in a mix is tracked in [`Emulsifiers`], with the total
content accessible via [`CompKey::Emulsifiers`]. The strength properties for all emulsifiers
documented here can be found at [`constants::emulsification`](crate::constants::emulsification).

- <a id="emulsifier-casein-proteins"></a>**Casein proteins**, which make up ~80% of milk proteins
  (see [`STD_CASEIN_PROTEIN_IN_MSNF_PROTEIN`]), are the primary emulsifying agents in milk, and
  therefore ice cream mixes. Casein proteins are chiefly responsible for the inherent stability of
  the butterfat and water emulsion in milk and cream, and thus are the main emulsifier components in
  ice cream mixes. Casein proteins actually make dairy-based ice cream mixes over-emulsified, making
  them too stable and requiring the use of additional emulsifiers to _destabilize_ the emulsion and
  partial coalescence of fat globules during whipping and freezing (Goff & Hartel, 2025, p.
  84)[^20], (Raphaelson, 2023, January)[^38].

- <a id="emulsifier-whey-proteins"></a>**Whey proteins**, which make up ~20% of milk proteins (see
  [`STD_WHEY_PROTEIN_IN_MSNF_PROTEIN`]), have an emulsifying effect when partially denatured. Unlike
  casein, whey proteins are considerably less heat-stable and begin to denature above approximately
  60°C (140°F) — easily reached during typical ice cream pasteurization and custard preparation.
  Full denaturation occurs at approximately 90°C (194°F) or above; at that point, some whey proteins
  may form insoluble aggregates that are detrimental to texture. Ice cream mixes are typically held
  at ~75°C (167°F) for 30–60 minutes (Raphaelson, 2023, January)[^38].

  When partially denatured, whey proteins expose hydrophobic surfaces that interact with other
  proteins and fats in the mix. Some denatured whey proteins bind to casein micelles, forming
  stronger bonds than casein's native bonds to fat globule surfaces, and thereby displacing casein
  from the fat globule interface. This reduces the stability of the fat globule, contributing to
  partial fat coalescence during whipping and freezing — the same mechanism targeted by conventional
  emulsifiers such as lecithin and mono- and diglycerides (Raphaelson, 2023, January)[^38].

  Effective use as an emulsifier requires elevated nonfat milk solids content, typically in the 10%
  range, as straight milk and cream do not supply sufficient whey protein concentrations; skimmed
  milk powder is a common means of achieving this (Raphaelson, 2023, January)[^38].

- <a id="emulsifier-egg-yolk-solids"></a>**Egg yolk solids**, which contains several amphiphilic
  components with emulsifying properties, are often used in ‘all-natural’, premium or homemade ice
  creams. The unique smoothness of custard type ice creams can be attributed at least partially to
  the large amount of emulsifying properties in the egg yolks. Of these components, lecithin, which
  consists of phosphatides and phospholipids, is the most significant emulsifier, making up roughly
  9% of total weight, and about 18% of egg yolk solids. Other egg yolk solids, primarily
  phospholipids, proteins, and minor components have less prominent emulsifying properties (Clarke,
  2004, p. 49)[^4], (Goff & Hartel, 2025, p. 84)[^20], (Raphaelson, 2023, January)[^38].

  For adequate effect on ice cream emulsifications, mixes require 0.5-2.0% egg yolk (0.3-1.0% dried
  egg yolk). Some recipes can call for even higher amounts, from 3% up to 14% egg yolk in some
  custard-style formulations. At these ranges egg flavours become prominent, which can be desirable
  to enhance some flavours, e.g. "French Vanilla", but can be problematic in others, particularly
  more delicate flavours (Clarke, 2004, p. 49)[^4], (Goff & Hartel, 2025, p. 84)[^20], (Raphaelson,
  2023, January)[^38].

  This component is partially tracked in [`field@Emulsifiers::lecithin`].

- <a id="lecithin"></a>**Lecithin**, which consists of phosphatides and phospholipids, is the most
  significant emulsifier in egg yolks, making up roughly 9% of total weight, and about 18% of egg
  yolk solids (Clarke, 2004, p. 49)[^4], (Goff & Hartel, 2025, p. 84)[^20], (Raphaelson, 2023,
  January)[^38]. It can also be added directly in egg-free formulations, typically from 'Soy
  Lecithin' or 'Sunflower Lecithin' sources. This allows egg-free ice creams to be made with the
  same, all-natural emulsifier used in custard ice creams (Raphaelson, 2023, January)[^38].

  Egg-free recipes can be made with 0.15-0.45% lecithin. Higher quantities may be helpful in recipes
  with high fat content. A drawback of lecithin from non-egg sources is that it can have a
  detectible flavour of its own, depending on the quality of the ingredient, so careful sourcing may
  be required (Raphaelson, 2023, January)[^38].

  This component is tracked in [`field@Emulsifiers::lecithin`].

- <a id="gum-arabic"></a>**Gum Arabic**, also known as Gum Acadia, is an all natural emulsifier
  derived from acadia trees in sub-Saharan Africa. It is derived from two types of acadia trees,
  Acacia Senegal and Acacia Seyal. It has the benefit of being an all natural emulsifier. Its
  effectiveness as an emulsifier depends on the type and sample. Some commercial Gum Arabic products
  claim that it is a 1:1 substitute for mono- and diglycerides, which itself has a recommended
  dosage of 1-2g/kg (Raphaelson, 2023, January)[^38].

  This component is tracked in [`field@Emulsifiers::gum_arabic`].

- <a id="mono-and-diglycerides"></a>**Mono- and diglycerides** are common emulsifiers derived from
  glycerol and fatty acids. Mono- and diglycerides (E471) are the most commonly used emulsifiers in
  ice cream manufacturing. They are derived from the partial hydrolysis of fats of animal or
  vegetable origin and reesterification with an excess of glycerol. This produces a mixture of
  monoglycerides, diglycerides, and a small amount of triglycerides, fatty acids, and glycerol -
  mono-, di-, and triglycerides are esters of glycerol with 1-3 fatty acid molecules, respectively.
  The content of monoglycerides in the mixture may vary from 10-60%, with products for ice cream
  applications typically containing 40% or greater, as monoglycerides are most amphiphilic and hence
  functional. The nature of the fatty acids also influences the functionality, with unsaturated
  fatty acids encouraging higher rates of protein displacement and, consequently, higher rates of
  partial coalescence (Clarke, 2004, p. 48)[^4], (The European Commission, 2025, E471)[^9], (Goff &
  Hartel, 2025, p. 85)[^20], (Raphaelson, 2023, January)[^38], (Ice Cream Science, 2026, May, "Why
  are emulsifiers used in ice cream?")[^45].

  Mono- and diglycerides are believed to be most effective at the interface between fat and air, and
  so are particularly effective at stabilizing the air bubbles and helping form a finer-textured
  foam. As a result, it has been shown to have significant synergistic effects with polysorbate 80,
  which is most active at the fat and air interface, and the combination of these two emulsifiers is
  very common in ice cream formulations (Raphaelson, 2023, January)[^38], (Ice Cream Science, 2026,
  May, "Why are emulsifiers used in ice cream?")[^45], (Carl, 2024, April)[^46].

  Mono- and diglycerides are typically used in concentrations of 1-2g/kg (0.1-0.2%) by weight in ice
  cream mixes (Clarke, 2004, p. 48)[^4], (Raphaelson, 2023, January)[^38], (Ice Cream Science, 2026,
  May, "Why are emulsifiers used in ice cream?")[^45].

  This component is tracked in [`field@Emulsifiers::mono_and_diglycerides`].

- <a id="distilled-monoglycerides"></a>**Distilled monoglycerides** are mono- and diglycerides that
  have been distilled to a higher monoglyceride content, typically to more than 90%, as specific
  glycerol esters, such as glycerol monostearate (or a blend of saturated monoglycerides) or
  glycerol monooleate (or a blend of unsaturated monoglycerides). These are more effective
  emulsifiers, and can be used in much smaller quantities, but are more expensive to process than
  the usual mono- and diglycerides mixtures (Clarke, 2004, p. 48)[^4], (Goff & Hartel, 2025, p.
  85)[^20], (Raphaelson, 2023, January)[^38], (Ice Cream Science, 2026, May, "Why are emulsifiers
  used in ice cream?")[^45].

  This component is tracked in [`field@Emulsifiers::distilled_monoglycerides`].

- <a id="polysorbate-80"></a>**Polysorbate 80** is the most common sorbitan ester, an emulsifier,
  used in ice cream mixes. Sorbitan esters of fatty acids are structurally similar to
  monoglycerides, consisting of a fatty acid attached to a sorbitol molecule instead of glycerol.
  Polyoxyethylene groups are also attached to the sorbitol molecule to make it water soluble.
  Polysorbate 80 (E433), polyoxyethylene sorbitan monooleate, is the most common of these sorbitan
  esters used in ice cream applications (Clarke, 2004, p. 48)[^4], (The European Commission, 2025,
  E433)[^9], (Goff & Hartel, 2025, p. 85)[^20], (Raphaelson, 2023, January)[^38], (Ice Cream
  Science, 2026, May, "Why are emulsifiers used in ice cream?")[^45], (Carl, 2024, April)[^46].

  Sorbitan have been shown to be most active at the interface between fat and water, making them
  most effective at destabilizing the fat emulsion and encouraging partial coalescence. As a result,
  it has been shown to have significant synergistic effects with mono- and diglycerides, which are
  most active at the fat and air interface, and the combination of these two emulsifiers is very
  common in ice cream formulations (Raphaelson, 2023, January)[^38], (Ice Cream Science, 2026, May,
  "Why are emulsifiers used in ice cream?")[^45], (Carl, 2024, April)[^46].

  Polysorbate 80 is very effective, and is typically used in minute concentrations of 0.02-0.04% by
  weight (Clarke, 2004, p. 48)[^4], (Raphaelson, 2023, January)[^38], (Ice Cream Science, 2026, May,
  "Why are emulsifiers used in ice cream?")[^45], (Carl, 2024, April)[^46].

  This component is tracked in [`field@Emulsifiers::polysorbate_80`].

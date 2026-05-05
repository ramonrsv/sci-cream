<!-- markdownlint-disable MD033 -- needed for id attribute anchors -->
<!-- markdownlint-disable MD041 -- files are concatenated together -->

## Stabilizers

Stabilizers, usually polysaccharides, are a group of ingredients commonly referred to as
'hydrocolloids' - water soluble substances that form suspensions or gels in the presence of water,
increasing its viscosity. Even at concentrations of 1 wt% or less some hydrocolloids are capable of
producing highly viscous solutions with varying textures. These properties have led to their
widespread use in the food industry, with each hydrocolloid having unique functional characteristics
(Clarke, 2004, p. 50)[^4], (Cree, 2017, Stabilizers, p. 61)[^6], (Raphaelson, 2023, January)[^37],
(Williams, 2003, "Introduction")[^39], (Ice Cream Science, 2026, April, "Why are stabilizers used in
ice cream?")[^42], (Carl, 2024, April)[^43].

Stabilizers serve several purposes in ice cream formulations. Primarily, they increase mix
viscosity, stabilize the mix to prevent wheying off, aid in suspension of flavoring particles,
retard or reduce ice and lactose crystal growth over time, produce smaller ice crystal to being
with, provide uniformity to the product and resistance to melting, produce smoothness in texture
during consumption, etc. (Goff & Hartel, 2025, p. 76)[^20], (Raphaelson, 2023, January)[^37].

The detailed breakdown of added stabilizers in a mix is tracked in [`Stabilizers`], with the total
content accessible via [`CompKey::Stabilizers`]. The strength properties for all stabilizers
documented here can be found at [`constants::stabilization`](crate::constants::stabilization).

- <a id="stabilizer-egg-yolk-solids"></a>**Egg Yolk Solids**, typically in the form of egg custards,
  which have stabilizing properties. Egg custards are among the most effective stabilizers at
  creating great textures, but only middling at slowing ice crystal growth, likely because they
  exhibit _synerisis_, or weeping: they let water seep out of their gelatinous structure. Egg
  custard ice cream formulations typically use additional stabilizers to mitigate this issue.
  Another drawback of egg custards is that they dampen the release of flavours more than most other
  stabilizers - especially lighter and more aromatic flavours, and water-soluble flavours (fruits,
  etc.) (Raphaelson, 2023, January)[^37].

  For thickening and stabilization, egg custard ice cream formulations typically require a minimum
  of 3% egg yolk by weight, up to 10% being common (Raphaelson, 2023, January)[^37].

- <a id="stabilizer-whey-proteins"></a>**Whey proteins**, from dairy products, have stabilizing
  properties when denatured by heat. Some of the whey proteins can form a gel-like network when
  heated to the right temperature for the right amount of time. This network functions in the same
  way as other hydrocolloids (Raphaelson, 2023, January)[^37].

  Skimmed milk powder, which is about 7% whey proteins (see [`STD_WHEY_PROTEIN_IN_MSNF_PROTEIN`],
  [`STD_PROTEIN_IN_MSNF`]), is commonly used in ice cream formulations as a source of whey proteins.
  Milk powder is typically used in concentrations of 3-6% by weight, although it almost always
  augmented with other stabilizers (Cree, 2017, Milk Powder, p. 65)[^6], (Raphaelson, 2016,
  May)[^7], (Pikosky, 2016, July)[^41], (Goff & Hartel, 2025, p. 315)[^20].

- <a id="cornstarch"></a>**Cornstarch**, a polysaccharide derived from corn, is a common and widely
  available stabilizer. Cornstarch is a staple in many ice cream traditions, most famously
  associated with Southern Italian-style gelato, where formulations often omit eggs and cream
  entirely, relying on the starch to provide body and stability. It has also become popular in home
  recipes because of its wide availability, ease of use, and reasonably good texture and stability
  results (Raphaelson, 2023, January)[^37].

  One drawback of cornstarch is that it begins to deteriorate when frozen, making it less ideal for
  protecting ice creams from the freeze-thaw cycle. It's typically used in concentrations of 1% by
  weight (Cree, 2017, Cornstarch, p. 69)[^6], (Cree, 2017, Blank Slate Custard Ice Cream, p.
  115)[^6].

  Cornstarch generally gives better flavor release than custard, but not as good as gums
  (Raphaelson, 2023, January)[^37].

  This component is tracked in [`field@Stabilizers::cornstarch`].

- <a id="tapioca-starch"></a>**Tapioca starch**, a polysaccharide derived from cassava root, is a
  common stabilizer. Tapioca starch has similar properties to cornstarch, but with various
  advantages. It hydrates at a lower temperature than cornstarch - 60°C (140°F) vs 95°C (203°F). It
  can absorb more water than cornstarch, and so can be used at lower concentrations, it performs
  better in the freeze-thaw cycle, and it doesn't lose strength when frozen. It is typically used in
  concentrations of 0.5% by weight (Cree, 2017, Tapioca Starch, p. 71)[^6], (Raphaelson, 2023,
  January)[^37], (Chin, 2024)[^40].

  Tapioca starch generally gives better flavor release than custard, but not as good as gums
  (Raphaelson, 2023, January)[^37].

  This component is tracked in [`field@Stabilizers::tapioca_starch`].

- <a id="pectin"></a>**Pectin** is a polysaccharide derived from the cell wall of plants,
  particularly citrus fruits. Pectin (E440) is obtained by extraction from appropriate edible plant
  material, usually citrus peel or apple pomace. It is a polysaccharide consisting of linear chains
  of galacturonic acid and galacturonic acid methyl ester units. Pectin is classified according to
  its degree of esterification. High methoxy (>50% esterified) and low methoxy (<50%) pectins
  possess different properties (Clarke, 2004, p. 53)[^4], (The European Commission, 2025, E440)[^9].

  Low-methoxy pectin, widely available to home consumers, is most suitable for ice cream
  formulations. It requires calcium ions to form a gel, which are abundant in dairy ice cream
  formulations. It is typically used in concentrations of 0.1% by weight (Cree, 2017, Pectin, p.
  72)[^6].

  Pectin is commonly used in sorbet formulations, which generally call for fruit and/or fruit juice
  at 30-50% by weight (sometimes as high as 75%). As such, fruits that contain a lot of pectin
  require special adjustments to the stabilizer use in sorbet formulations (Goff & Hartel, 2025, p.
  432)[^20], (Raphaelson, 2019, July)[^35].

  This component is tracked in [`field@Stabilizers::pectin`].

- <a id="gelatin"></a>**Gelatin**, a protein derived from collagen, is one of the oldest non-egg
  stabilizers. Gelatin (E441) is a protein derived from collagen from animal connective tissue, and
  was commonly used as a gelling and thickening agent. It has largely fallen out of favor in ice
  cream formulations due to cost, availability, and its animal origin. While it has been gradually
  replaced by polysaccharide stabilizers, it is still a good stabilizer, forming a weak gel that
  melts readily in the mouth giving no impression of gumminess, with ice crystal suppression and
  texture arguably superior to starches. It's also more available to home consumers than most gums
  (Clarke, 2004, p. 54)[^4], (The European Commission, 2025, E441)[^9],(Goff & Hartel, 2025, p.
  80)[^20], (Raphaelson, 2023, January)[^37].

  The strength of gelatin available on the market can vary significantly, so it may require some
  trial and error to find the right concentration for a formulation. A common starting point is 0.4%
  by weight (Cree, 2017, Gelatin, p. 76)[^6]. Gelatin hydrates when cooked to a temperature of 60°C
  (140°F) or higher. This is not a problem for ice cream formulations, which are typically heated to
  at least 71°C (160°F), but it presents complications for no-cook formulations, particularly
  sorbets (Raphaelson, 2023, January)[^37].

  This component is tracked in [`field@Stabilizers::gelatin`].

- <a id="locust-bean-gum"></a>**Locust Bean Gum (LBG)**, also known as Carob Bean Gum, is a very
  common gum stabilizer. Locust Bean Gum (E410) is a polysaccharide derived from the seeds of the
  Mediterranean Ceratonia siliqua tree, more commonly known as the carob tree. LBG solutions are
  highly viscous at low concentrations, they have excellent freeze-thaw stability, and arguably the
  most powerful ice crystal suppression of all the conventional gums. It also provides a smooth,
  creamy texture with good flavor release. These properties make it widely regarded as a good ice
  cream stabilizer, considered the best stabilizer for many ice cream applications, and arguably the
  most important of the gums in ice cream formulations (Clarke, 2004, p. 52)[^4], (The European
  Commission, 2025, E410)[^9], (Goff & Hartel, 2025, p. 81)[^20], (Raphaelson, 2023, January)[^37].

  A drawback of LBG is its incompatibility with milk proteins, which causes a phase separation of
  milk proteins and polysaccharides known as 'wheying off'. The leaking of a clear watery serum
  layer during the melting of ice cream can cause an undesirable appearance, and the milk proteins
  precipitated out of the suspension can aggregate and create an undesirable grainy texture. This
  issue can be mitigated by using LBG in combination with small amounts of Carrageenans, which help
  reduce or prevent wheying off (Clarke, 2004, p. 51, 145)[^4], (Goff & Hartel, 2025, p. 80)[^20],
  (Raphaelson, 2023, January)[^37], (Ice Cream Science, 2026, April, "Why are stabilizers used in
  ice cream?")[^42].

  Another issue with LBG is its poor solubility in water, requiring high temperatures to fully
  dissolve. Most varieties of LBG require heating above 80°C (176°F) to fully hydrate, which is
  higher than ideal for many ice cream processes, although some varieties can hydrate at lower
  temperatures. This makes LBG largely incompatible with no-cook formulations, particularly sorbets
  (Clarke, 2004, p. 52)[^4], (Raphaelson, 2023, January)[^37].

  LBG is commonly used in concentrations of 0.2% by weight, although it is often used in combination
  with other stabilizers, usually Guar Gum and Carrageenan, due to their synergistic effects (Cree,
  2017, Locust Bean Gum, p. 71)[^6], (Goff & Hartel, 2025, p. 80)[^20], (Raphaelson, 2023,
  January)[^37].

  This component is tracked in [`field@Stabilizers::locust_bean_gum`].

- <a id="guar-gum"></a>**Guar Gum** is a common gum stabilizer, often used in combination with
  Locust Bean Gum. Guar Gum (E412) is extracted from the seeds of Cyamposis tetragonolobus, an
  annual crop grown in the Indian subcontinent, and is chemically similar to Locust Bean Gum.
  Although it is not quite as effective as LBG at ice crystal suppression, its solutions have a
  higher viscosity than those of LBG at similar concentrations (Clarke, 2004, p. 52)[^4], (The
  European Commission, 2025, E412)[^9], (Goff & Hartel, 2025, p. 81)[^20], (Raphaelson, 2023,
  January)[^37].

  In combination, Guar and LBG strengthen each other through synergistic interactions, so they are
  often used together in ice cream formulations (Raphaelson, 2023, January)[^37].

  Guar Gum dissolves readily in cold water (10-30°C, 50-86°F), making it compatible with and highly
  desirable in certain applications, particularly no-cook formulations like sorbets (Goff & Hartel,
  2025, p. 81)[^20].

  Similarly to Locust Bean Gum, a drawback of Guar Gum is its incompatibility with milk proteins
  which causes 'wheying off'. This issue can be mitigated by using Guar Gum in combination with
  small amounts of Carrageenans, which help reduce or prevent wheying off (Clarke, 2004, p. 51,
  145)[^4], (Goff & Hartel, 2025, p. 80)[^20], (Raphaelson, 2023, January)[^37], (Ice Cream Science,
  2026, April, "Why are stabilizers used in ice cream?")[^42].

  Guar Gum can have a strong flavour that is detectable in ice creams, which is undesirable in most
  applications. Some market products claim to have removed this flavour (Carl, 2024, April)[^43],
  (Modernist Pantry, 2026, "Perfected Guar Gum")[^116].

  Guar Gum is commonly used in concentrations of 0.1% by weight, although it is often used in
  combination with other stabilizers, usually Locust Bean Gum and Carrageenan, due to their
  synergistic effects (Cree, 2017, Guar Gum, p. 73)[^6], (Goff & Hartel, 2025, p. 80)[^20],
  (Raphaelson, 2023, January)[^37].

  This component is tracked in [`field@Stabilizers::guar_gum`].

- <a id="carrageenans"></a>**Carrageenans** are a family of polysaccharides commonly used as
  stabilizers. Carrageenans (E407) are complex polysaccharides of esters of galactose. They are
  derived from an extract of red algal seaweed, including the original source Chondrus crispus
  (Irish Moss), Gigartina sp., Eucheuma sp., and Kappaphycus sp. They've been used as food
  thickeners since the 15th century. Modern Carrageenan are usually classified as one of three types
  based on their molecular structure: kappa (κ), iota (ι) (both of which come from Indonesia and the
  Philippines) and lambda ( λ) (from the Pacific coast of North America, France, Denmark, Norway,
  Ireland and Great Britain). These types have different solubility temperatures, gelling
  characteristics, and interactions (Clarke, 2004, p. 51)[^4], (The European Commission, 2025,
  E407)[^9], (Goff & Hartel, 2025, p. 80)[^20], (Raphaelson, 2023, January)[^37].

  Most useful as a primary stabilizer in ice cream formulations is Lambda Carrageenan, which is
  soluble in cold water and doesn't gel; the others can form gels in the presence of calcium (dairy
  products). It has a moderate effect on ice crystal suppression, but a strong effect on texture,
  creating a rich and creamy mouthfeel similar to egg custard, but without adding any flavour of its
  own or muting other flavours. Lambda Carrageenan has also been shown to interact with Locust Bean
  Gum and Carboxymethyl Cellulose in a synergistic manner, improving the texture and characteristics
  of melting of the ice creams (Goff & Hartel, 2025, p. 80)[^20], (Raphaelson, 2023, January)[^37].

  Kappa Carrageenan is often used in ice cream formulations as a secondary hydrocolloid to prevent
  'wheying off' caused by stabilizers that are incompatible with milk proteins, such as Locust Bean
  Gum and Guar Gum. Hence it is included in most stabilizer blends at usage rates of 0.01–0.02%. At
  higher concentrations, the carrageenan would begin to gel and fail to function well (Clarke, 2004,
  p. 51, 145)[^4], (Goff & Hartel, 2025, p. 80)[^20], (Ice Cream Science, 2026, April, "Why are
  stabilizers used in ice cream?")[^42].

  Carrageenans are almost exclusively used in combination with other stabilizers, usually Locust
  Bean Gum and Guar Gum, due to their synergistic effects (Clarke, 2004, p. 51, 145)[^4], (Goff &
  Hartel, 2025, p. 80)[^20], (Raphaelson, 2023, January)[^37]. As such, a recommended concentration
  of Carrageenans along has little practical meaning, but for the purposes of calculating relative
  strength, 0.25% by weight has been sited as a possible concentration for ice cream formulations
  (Cree, 2017, Carrageenans, p. 74)[^6].

  This component is tracked in [`field@Stabilizers::carrageenans`].

- <a id="carboxymethyl-cellulose"></a>**Carboxymethyl Cellulose (CMC)** is a stabilizer derived from
  purified cellulose. Carboxymethyl Cellulose (E466), also known as cellulose gum, is synthesized
  from purified cellulose from cotton or wood pulp. It is often used in it sodium salt form, sodium
  carboxymethyl cellulose. It may have the strongest ice crystal suppression of any known gum. It
  adds body and chew comparable to Guar Gum, and is synergistic with Locust Bean Gum, Guar Gum, and
  Carrageenans - it forms a gel in combination with these ingredients, which can be problematic
  (Clarke, 2004, p. 53)[^4], (Raphaelson, 2023, January)[^37].

  There are low-viscosity varieties of CMC that suppress ice crystal formation with very little
  increase in base viscosity, if they’re used in a non-gelling blend. These theoretically allow for
  the relatively independent control of iciness and texture (Raphaelson, 2023, January)[^37].

  CMC is not commonly used in ice cream formulations due to its perception as a 'chemical' or
  synthetic ingredient. This is largely a marketing issue; CMC is generally recognized as safe
  (GRAS) by the FDA, and approved for use in food products by the European Commission (E466)
  (Clarke, 2004, p. 53)[^4], (The European Commission, 2025, E466)[^9], (Raphaelson, 2023,
  January)[^37], (Drugs.com, 2025, July, "Carboxymethylcellulose")[^44].

  CMC is particularly useful in sorbet formulations, since it hydrates easily in cold water, so it
  can be blended into fruit purees without any need for cooking. These qualities make it a perfect
  substitute for Locust Bean Gum (Raphaelson, 2023, January)[^37].

  This component is tracked in [`field@Stabilizers::carboxymethyl_cellulose`].

- <a id="xanthan-gum"></a>**Xanthan Gum** is a polysaccharide produced by bacterial action, and is a
  common stabilizer. Xanthan Gum (E415) is produced by the bacterium Xanthomonas campestris through
  fermentation of glucose, lactose, or sucrose. It is a very versatile stabilizer, soluble in cold
  water (10-30°C), its solutions have uniform viscosity over a wide temperature and pH range, it
  produces high viscosity at low concentrations, it can tolerate alcohol, freeze-thaw cycles, etc.
  These properties make it a very commonly used stabilizer in a wide variety of applications,
  including ice cream (Clarke, 2004, p. 53)[^4], (The European Commission, 2025, E415)[^9], (Goff &
  Hartel, 2025, p. 83)[^20], (Raphaelson, 2023, January)[^37].

  Solutions of Xanthan Gum have a high degree of pseudoplasticity, meaning that their viscosity
  decreases with shear, but quickly recovers once the shear is removed. This property is useful in
  sauces for ice cream. During dispensing, the viscosity is low, but as soon as shear forces cease,
  the viscosity rises substantially. This results in a sauce that stays put after dosing on to the
  product (Clarke, 2004, p. 53)[^4], (Goff & Hartel, 2025, p. 83)[^20].

  Xanthan Gum provides acceptable ice crystal suppression, but is not as powerful as other gums. It
  can also form gels when used with Locust Bean Gum, which may be problematic. As a result, it is
  not commonly used in commercial ice cream formulations, but it may be used in home recipes due to
  its wide availability (Raphaelson, 2023, January)[^37]. It is typically used in concentrations of
  0.1% by weight (Cree, 2017, Xanthan Gum, p. 73)[^6]

  This component is tracked in [`field@Stabilizers::xanthan_gum`].

- <a id="sodium-alginate"></a>**Sodium Alginate** is a polysaccharide derived from brown algae, and
  is a common stabilizer. Sodium alginate (E401) is a polysaccharide of guluronic acid and
  mannuronic acid, which is extracted from brown seaweeds such as Macrocystis pyrifera and Laminaria
  digitata. It is a popular stabilizer, especially in low-fat and fat-free ice cream, because it
  forms a gel in the presence of calcium ions in the dairy. Its gelling quality makes it less useful
  in standard recipes, although that can be mitigated by mixing it with phosphate, citrate or
  tartrate ions to prevent premature gelation due to the calcium from the milk solids (Clarke, 2004,
  p. 51)[^4], (The European Commission, 2025, E401)[^9], (Goff & Hartel, 2025, p. 79)[^20],
  (Raphaelson, 2023, January)[^37].

  It is quite effective at ice crystal suppression, and the gel breaks into a fluid gel when the ice
  cream is spun, creating a unique body and viscosity. The major advantage of alginate is its
  resistance to acid conditions, particularly when heated, whereas other stabilizers would lose
  their functionality (Clarke, 2004, p. 51)[^4], (Raphaelson, 2023, January)[^37].

  This component is tracked in [`field@Stabilizers::sodium_alginate`].

- <a id="tara-gum"></a>**Tara Gum** is a polysaccharide that has recently become available as an ice
  cream stabilizer. Tara Gum (E417) is a polysaccharide derived from the seeds of the Tara spinosa
  plant, native to Peru. Chemically and functionally, it is almost exactly a 50/50 blend of Locust
  Bean Gum and Guar Gum, its solutions being less viscous than those of Guar Gum, but more than
  those of Locust Bean Gum. This makes it an attractive, one-ingredient stabilizer that offers good
  ice crystal suppression and thick, creamy consistency. Most Tara Gums need to be heated to around
  80°C (176°F) to fully hydrate (The European Commission, 2025, E417)[^9], (Goff & Hartel, 2025, p.
  82)[^20], (Raphaelson, 2023, January)[^37].

  This component is tracked in [`field@Stabilizers::tara_gum`].

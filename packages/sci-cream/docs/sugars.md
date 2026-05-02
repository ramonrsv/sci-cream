<!-- markdownlint-disable MD033 -- needed for id attribute anchors -->
<!-- markdownlint-disable MD041 -- files are concatenated together -->

## Sugars

Sugars are one of the most crucial components in ice cream, contributing to sweetness, freezing
point depression, ice crystal control, overall texture, and more. Different type of sugars have
different properties and contribute differently to these various aspects of the ice cream. Good ice
cream formulations make use of a variety of different sugars to achieve the desired balance of
properties. For example, glucose (dextrose) is less sweet than sucrose but has stronger freezing
point depression, so it is often used to lower the sweetness of a formulation while still providing
good texture (Raphaelson, 2023, February)[^1].

Whilst not without some challenges, it is possible to replace some or all sugars in a formulation
with polyols (sugar alcohols) and/or artificial sweeteners, whether for dietary reasons or to
achieve specific functional properties that aren't possible with sugars alone, e.g. using erythritol
for maximum freezing point depression without adding sweetness (Raphaelson, 2019, July)[^35]. See
[polyols](crate::docs#polyols) and [artificial sweeteners](crate::docs#artificial-sweeteners) for
more details on these.

The detailed breakdown of sugars (mono and disaccharides) in a mix is tracked in [`Sugars`]. [Potere
Anti-Congelante (PAC)](crate::docs#pac-afp-fpdf-se) and [Potere Dolcificante (POD)](crate::docs#pod)
values for all sugars documented here can be found at [constants::pac](crate::constants::pac) and
[constants::pod](crate::constants::pod), respectively.

- <a id="sucrose"></a>**Sucrose**, or table sugar, is the most common sugar used in ice cream
  formulations, and is often the baseline for sweetness, freezing point depression, and other
  properties. It is a disaccharide composed of one glucose molecule and one fructose molecule. It is
  the standard for sweetness, with a [POD](crate::docs#pod) of 100, and for freezing point
  depression, with a [PAC](crate::docs#pac-afp-fpdf-se) of 100. Since it has the most familiar
  flavor and sweetness profile, it is often the primary sugar used in ice cream formulations, with
  others used as supplements to achieve specific functional properties (Raphaelson, 2023,
  February)[^1], (Goff & Hartel, 2013, Table 3.4, p. 67)[^2].

  This component is tracked in [`field@Sugars::sucrose`], accessible via [`CompKey::Sucrose`].

- <a id="glucose"></a>**Glucose**, also known as dextrose, is one of the two monosaccharides present
  in sucrose, the other being fructose. It is about 75% as sweet as sucrose, but has almost twice
  the freezing point depression, so it is often used to reduce sweetness while simultaneously
  softening the texture. It is hygroscopic, so it's also helpful in reducing the formation of both
  ice crystals and sugar crystals (Raphaelson, 2023, February)[^1]. It is widely available for home
  use, usually in the form of dextrose monohydrate, which is about 92% glucose by weight. Having
  dextrose available is one of the most impactful upgrades that a home ice cream maker can make,
  since it allows for much better control over the sweetness and texture of the ice cream.

  This component is tracked in [`field@Sugars::glucose`], accessible via [`CompKey::Glucose`].

- <a id="fructose"></a>**Fructose** is is one of the two monosaccharides present in sucrose, the
  other being glucose. It is about 25% sweeter than sucrose, and has about the same freezing point
  depression as dextrose, so it is often used in ice cream formulations to increase sweetness and
  freezing point depression without increasing solids. Fructose is even more hygroscopic than
  glucose, so it is particularly effective at reducing the formation of ice crystals and sugar
  crystals, more than any other sugar (Raphaelson, 2023, February)[^1]. It is available for purchase
  in crystalline form, and it's also present in honey, invert syrup, and others.

  This component is tracked in [`field@Sugars::fructose`], accessible via [`CompKey::Fructose`].

- <a id="lactose"></a>**Lactose**  is a disaccharide composed of one glucose molecule and one
  galactose molecule. Lactose is the sugar that is present in dairy ingredients. It has the same
  freezing point depression as sucrose, but is less than 20% as sweet, so it is very useful for
  increasing solids and freezing point depression independently of sweetness. It is also excellent
  for controlling ice crystal formation, being able to absorb six times its weight in water
  (Raphaelson, 2023, February)[^1]. However, lactose has limited solubility in water, which limits
  how much can be added to a formulation before it starts to crystallize (Spillane, 2006, p.
  264)[^9]. It's also usually not an option in dairy-free formulations like sorbets.

  This component is tracked in [`field@Sugars::lactose`], accessible via [`CompKey::Lactose`].

- <a id="trehalose"></a>**Trehalose** is a disaccharide composed of two glucose molecules linked in
  1.1-position. It is a naturally occurring disaccharide, found in small quantities in several
  plants and animals. Interest in this compound has increased in recent years as commercial
  quantities have become available. Its sweetness is approximately 45% that of sucrose, although it
  persists longer than the sucrose taste. It has a lower glycemic index than other sugars (Spillane,
  2006, p. 262)[^9], (Hull, 2010, Appendix C.3, p. 324)[^15]. In ice cream formulations, it has
  strong water controlling properties and helps with texture. However, it has low solubility and can
  crystallize if the concentration is too high. It has very similar functional properties to lactose
  in milk solids (Raphaelson, 2019, July)[^35].

  This component is tracked in [`field@Sugars::trehalose`], accessible via [`CompKey::Trehalose`].

- <a id="galactose"></a>**Galactose** is a monosaccharide that is less common in ice cream
  formulations, but it is one of the two monosaccharides present in lactose, the other being
  glucose. It is about 65% as sweet as sucrose, and has about the same freezing point depression as
  glucose and fructose (Spillane, 2006, p. 264)[^9]. It is not commonly used as a standalone
  ingredient in ice cream formulations, but it is often present in lactose-free dairy products,
  where the lactose is enzymatically broken down into glucose and galactose.

  This component is tracked in [`field@Sugars::galactose`], accessible via [`CompKey::Galactose`].

- <a id="maltose"></a>**Maltose** is a disaccharide composed of two glucose molecules. It is about
  30% as sweet as sucrose, and has about the same freezing point depression (Goff & Hartel, 2013,
  Table 3.4, p. 67)[^2], (Spillane, 2006, p. 253)[^9]. It is rarely used as a standalone ingredient
  in ice cream formulations, but it is often present in partially hydrolyzed starches, like
  maltodextrin and corn syrups (Furia, 1972, p. 45)[^36].

  This component is tracked in [`field@Sugars::maltose`], accessible via [`CompKey::Maltose`].

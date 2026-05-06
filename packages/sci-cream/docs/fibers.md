<!-- markdownlint-disable MD033 -- needed for id attribute anchors -->
<!-- markdownlint-disable MD041 -- files are concatenated together -->

## Fibers

Dietary fiber is a diverse group of compounds, including complex carbohydrates, which cannot be
digested by human enzymes in the small intestine. They can be classified according to their
solubility, viscosity, and fermentability. Consumption of dietary fiber is associated with a
multitude of health benefits (Higdon, 2019)[^34]. In ice cream making certain types of fiber, most
notably inulin and oligofructose, can be used as substitutes for sugars and fats, providing similar
functional properties along with several health-promoting properties (Porto, 2026)[^27].

The detailed breakdown of fibers in a mix is tracked in [`Fibers`]. [Potere Anti-Congelante
(PAC)](crate::docs#pac-afp-fpdf-se) and [Potere Dolcificante (POD)](crate::docs#pod) values for all
sugars documented here can be found at [constants::pac](crate::constants::pac) and
[constants::pod](crate::constants::pod), respectively.

- <a id="inulin"></a>**Inulin** is a type of soluble fiber found in many plants, with useful
  functional properties. It is commonly extracted from chicory root for use in food products. It
  provides similar functional properties to fats in ice cream, while offering health benefits like
  promoting gut health and aiding in blood sugar regulation (Niness, 1999)[^24], (Porto, 2026)[^27].

  This component is tracked in [`field@Fibers::inulin`].

- <a id="oligofructose"></a>**Oligofructose** is a type of soluble fiber that is chemically similar
  to inulin, but with a shorter chain length. Like inulin, it is commonly extracted from chicory
  root. The major difference is the addition of a hydrolysis step after extraction, which breaks
  down some of the inulin into shorter chains, with lengths ranging from 2 to 10. This results in a
  compound with ~30-40% the sweetness of sucrose (Niness, 1999)[^24]. It can be used to replace some
  of the sugars in ice cream formulations, while also providing health benefits (Porto, 2026)[^27].

  This component is tracked in [`field@Fibers::oligofructose`].

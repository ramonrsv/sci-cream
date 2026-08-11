<!-- markdownlint-disable MD041 -- files are concatenated together -->

## Glucose Syrups and Powders

Glucose Syrup is...

### Sweetness Values

There aren't yet any chemical tests for sweetness, so we must rely on subjective assessments of
sweetness. I have not been able to find any original research attempting to quantity the sweetness
of various sugars and glucose syrup products. The best sources that I have been able to find are
tables in _Ice Cream 7th Edition_ (Goff & Hartel, 2013, Table 3.4, p. 67)[^2], _Glucose Syrups:
Technology and Applications_ (Hull, 2010, Appendix C.3, p. 323)[^15], and _Optimizing Sweet Taste in
Foods_ (Spillane, 2006, Table 10.3, p. 269)[^9], which do not reference any original research. The
values between these texts roughly match each other, with some caveats.

Table 10.3 in Spillane quotes the sweetness values _"on a dried basis"_, whilst Table 3.4 in Goff &
Hartel quotes them _"on an as is or product basis"_; Hull does not specify. Taking the values to be
on a dried basis resolves various internal inconsistencies (below) that otherwise remain if the Goff
& Hartel values are read on an as-is product basis:

- Once adjusted for the differences in their sweetness values for pure glucose (which differ from
  61 to 80), the sweetness values for all products are roughly consistent across all the sources.
- The values of maltodextrin and glucose syrup/solids grow roughly linearly with DE (Dextrose
  Equivalence) values, being seemingly unaffected by the ratio of total solids in these products.
- The values are consistent with those in various modern manufacturer, seller, and software sources.
  ("The Sweetness of Glucose Syrup", 2025)[^16], [Gateway Food Products co., Du-Bake 42/43 Glucose
  Syrup][gateway], [Owl Software, Relative Sweetness Values of Various Sweeteners][owl], [Modernist
  Pantry, Glucose DE 42 Powder][modernist].

[gateway]: https://www.gatewayfoodproducts.com/wp-content/uploads/2019/01/GFP_CornSyrups_DuBake.pdf
[owl]: https://owlsoft.com/pdf_docs/WhitePaper/Rel_Sweet.pdf
[modernist]: https://modernistpantry.com/products/glucose-de-42-powder.html

The sweetness values often differ from the sum of their sugar spectra (i.e. dextrose, maltose,
maltotriose, and higher sugars content) (Hull, 2010, Appendix C.1, p. 321)[^15]. Synergistic
reactions between components have been used to explain this effect ("The Sweetness of Glucose
Syrup", 2025)[^16], although the values can also be lower than the sum of the sugar spectra.

It is worth noting that sweetness values can sometimes vary widely between sources, e.g. the
sweetness of maltose relative to sucrose has been cited as 32 (Goff & Hartel, 2013, Table 3.4,
p. 67)[^2], 35 (Spillane, 2006, p. 253)[^9], 50 (Hull, 2010, Appendix C.3, p. 323)[^15], 75 ("The
Sweetness of Glucose Syrup", 2025)[^16], etc., and they can even vary based on concentrations
(Belitz, 2009)[^17]. As such, there may be strong limitations on the ability to source accurate and
consistent sweetness values for various sweeteners.

Within this library, and with regards to maltodextrin, glucose syrup, high maltose syrup, and
high-fructose glucose syrup, the sweetness values will be sourced from _Glucose Syrups: Technology
and Applications_ (Hull, 2010, Appendix C.3, p. 323)[^15] assumed to be for the dry solids, whilst
the solids contents of each product will be cited as 80% for glucose and high maltose syrups, 77%
for high-fructose glucose syrup, and 95% for maltodextrin. (Goff & Hartel, 2013, Table 3.4,
p. 67)[^2]. Glucose _powder_ will be cited with the same values for dry solids, with 95% solids.

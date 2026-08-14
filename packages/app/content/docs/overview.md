---
title: "Overview"
description: "Overview of the Sci-Cream project and available resources, including the ice cream
calculator, reference recipes, ingredient database, documentation, blog, sci-cream Rust crate, etc."
---

<!-- markdownlint-disable no-inline-html -- required for the badge row wrappers -->

# Overview

The _Sci-Cream_ project is a collection of tools, references, and writings about ice cream science,
and my own journey in ice cream making:

- [`sci-cream` Rust crate](/docs/overview#sci-cream-crate), the library that provides all the ice
  cream science calculations powering this app.
- [This app](/docs/overview#sci-cream-app), including an [ice cream calculator](/calculator),
  [ingredient](/ingredients) and [recipe](/recipes) databases, and other tools.
- Ice cream science knowledge base: [reference
  knowledge](https://docs.rs/sci-cream/latest/sci_cream/docs/index.html) from the crate, and a less
  rigorous [supplemental collection](/docs/science) here.
- A [blog](/blog) where I share that journey: experiments, lessons learned, recipes, this project,
  etc.

## `sci-cream` crate

<div class="badges">

[![CI](https://github.com/ramonrsv/sci-cream/actions/workflows/crate.yml/badge.svg)](https://github.com/ramonrsv/sci-cream/actions)
[![GitHub Release](https://img.shields.io/github/v/release/ramonrsv/sci-cream?filter=sci-cream-v*)](https://github.com/ramonrsv/sci-cream/releases/tag/sci-cream-v0.0.7)
[![Crates.io](https://img.shields.io/crates/v/sci-cream.svg)](https://crates.io/crates/sci-cream)
[![Documentation](https://docs.rs/sci-cream/badge.svg)](https://docs.rs/sci-cream)
[![codecov](https://codecov.io/github/ramonrsv/sci-cream/graph/badge.svg?flag=crate)](https://app.codecov.io/github/ramonrsv/sci-cream/tree/main?flags%5B0%5D=crate)

</div>

The [`sci-cream` crate](https://github.com/ramonrsv/sci-cream/tree/main/packages/sci-cream) is a
Rust library that facilitates the mathematical analysis of ice cream mixes and their properties. It
includes comprehensive systems to represent the [composition of ingredients and ice cream
mixes][ing-mix-comp], to [define ingredients via user-friendly specifications][ing-spec], to
[calculate the properties of ice cream mixes][calc-props] based on their composition, and a [recipe
balancing][auto-balance] feature that automates formulating mixes to meet composition targets.

[ing-mix-comp]: https://docs.rs/sci-cream/latest/sci_cream/index.html#ingredientmix-composition
[ing-spec]: https://docs.rs/sci-cream/latest/sci_cream/index.html#ingredient-specifications
[calc-props]: https://docs.rs/sci-cream/latest/sci_cream/index.html#usage
[auto-balance]: https://docs.rs/sci-cream/latest/sci_cream/index.html#automatic-recipe-balancing

It is freely available and open-source for anyone to use in their own applications - it supports
various languages, including native Rust and web environments via
[WebAssembly](https://docs.rs/sci-cream/latest/sci_cream/index.html#wasm-interoperability). The
provenance of calculation methods and ingredient definitions is open for anyone to inspect and
scrutinize, which I encourage and would appreciate.

## Sci-Cream App

<div class="badges">

[![CI](https://github.com/ramonrsv/sci-cream/actions/workflows/app.yml/badge.svg)](https://github.com/ramonrsv/sci-cream/actions)
[![GitHub Release](https://img.shields.io/github/v/release/ramonrsv/sci-cream?filter=app-v*)](https://github.com/ramonrsv/sci-cream/releases/tag/app-v0.0.7)
[![codecov](https://codecov.io/github/ramonrsv/sci-cream/graph/badge.svg?flag=app)](https://app.codecov.io/github/ramonrsv/sci-cream/tree/main?flags%5B0%5D=app)

</div>

This [Sci-Cream app](https://github.com/ramonrsv/sci-cream/tree/main/packages/app) is built with
Next.js and powered by the `sci-cream` crate which enables all the ice cream science computations.
It provides several utilities for the development and study of ice cream recipes:

- The [ice cream calculator](/calculator) is a fully featured dashboard for composition analysis:
  - Consists of several adjustable panels for input, composition visualization, and balancing.
  - Supports a main and two reference recipes to compare against or use as composition targets.
  - Customizable visualization with key selection, absolute or percentage quantities, deltas, etc.
  - Balancing target visualization panels with per-target balancing quality color coding.
  - Freezing-point-depression graphs, including "Frozen Water" and estimated "Hardness".
- An extensive [ingredients database](/ingredients) with ~250 ingredient definitions, and growing.
- A [recipes database](/recipes) with built-in recipes from your favourite sources, and where you
  can save your own:
  - Easily load any recipe into one of several slots in the calculator.
  - Versioned recipes with per-version comment fields, ratings, favourites.
  - Share recipes with links that anyone can view and optionally open in the calculator.
- A [batch making](/make-recipe) utility, also with database storage, sharing, an ingredient
  weighing checklist, etc.

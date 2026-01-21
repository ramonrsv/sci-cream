# Sci-Cream

A collection of resources about the science and technology of ice cream and related frozen products.
Namely, this repo contains the [`sci-cream` Rust crate](#sci-cream-crate), a library to facilitate
the mathematical analysis of ice cream mixes and their properties, as well as the [`sci-cream`
app](#sci-cream-app), a web app that provides user-friendly utilities to facilitate the development
and study of ice cream recipes. There is also
[documentation](https://github.com/ramonrsv/sci-cream/tree/main/packages/sci-cream/docs) about ice
cream science, and an [ingredient
database](https://github.com/ramonrsv/sci-cream/tree/main/packages/sci-cream/data/ingredients) that
can be imported with the library. [GitHub Pages](https://ramonrsv.github.io/sci-cream/), including
[benchmarks](https://ramonrsv.github.io/sci-cream/dev/bench/), are available for the project as a
whole.

## `sci-cream` crate

[![CI](https://github.com/ramonrsv/sci-cream/actions/workflows/crate.yml/badge.svg)](https://github.com/ramonrsv/sci-cream/actions)
[![codecov](https://codecov.io/github/ramonrsv/sci-cream/graph/badge.svg?flag=crate)](https://app.codecov.io/github/ramonrsv/sci-cream/tree/main?flags%5B0%5D=crate)

The [`sci-cream` crate](https://github.com/ramonrsv/sci-cream/tree/main/packages/sci-cream) is a
Rust library that facilitates the mathematical analysis of ice cream mixes and their properties.

## `sci-cream` app

[![CI](https://github.com/ramonrsv/sci-cream/actions/workflows/app.yml/badge.svg)](https://github.com/ramonrsv/sci-cream/actions)
[![codecov](https://codecov.io/github/ramonrsv/sci-cream/graph/badge.svg?flag=app)](https://app.codecov.io/github/ramonrsv/sci-cream/tree/main?flags%5B0%5D=app)

The [`sci-cream` app](https://github.com/ramonrsv/sci-cream/tree/main/packages/app) is a web app
that utilizes the [`sci-cream` crate](#sci-cream-crate) to provide user-friendly utilities, most
notably an ice cream calculator, to facilitate the development and study of ice cream recipes.

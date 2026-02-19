There are two projects in this workspace, a Rust crate at `packages/sci-cream`, and a Next.js app
at `packages/app`. The crate is a dependency for the app and must be built first.

To install `pnpm` and all `npm` dependency packages, required for both the crate and the app:

```bash
$ sudo npm install -g pnpm
$ pnpm install
```

# `sci-cream` crate at `packages/sci-cream`

[Rust](https://rust-lang.org/tools/install/) must be installed to build the crate. Some features
also require additional installs:

The `diesel` feature requires `$ sudo apt install libpq-dev`.

The `wasm` feature requires [`wasm-pack`](https://drager.github.io/wasm-pack/) and the
`wasm32-unknown-unknown` target to be installed:

```bash
$ cargo install wasm-pack
$ rustup target add wasm32-unknown-unknown
```

Building and running tests can be done normally with `cargo build` and `cargo test`, with
`--all-features` or `--features ...` to enable a specific set of features. `data` and `database`
are enabled by default. Using the `wasm` feature and `wasm-pack` to prepare an `npm` package
can be done as below, or simply by running `pnpm build:package`:

```bash
$ # To validate build, not necessary when running wasm-pack
$ cargo rustc --crate-type cdylib --target wasm32-unknown-unknown --features wasm,data,database
$
$ # To prepare the npm package, a dependency for the app
$ ./scripts/set-crate-type.sh ./Cargo.toml cdylib
$ wasm-pack build --out-dir wasm --out-name index -- --features "wasm,data,database"
```

To run code coverage:

```bash
$ # Rust
$ cargo install cargo-llvm-cov
$ cargo llvm-cov test --all-features
$ # Generate report to upload or visualize locally
$ cargo llvm-cov report --codecov OR --html
```

To upgrade Rust dependencies:

```bash
$ cargo install cargo-edit
$ cd ./packages/sci-cream
$ cargo upgrade --incompatible
```

# `sci-cream` app at `packages/app`

Building and running the app requires Node.js, often a newer version than is provided by `apt`:

```bash
$ sudo apt update
$ sudo apt install nodejs
$
$ # To upgrade to the latest
$ sudo npm install -g n
$ sudo n stable
```

Testing and running the app requires a PostgreSQL database to be running and seeded, and certain
environment variables to be set. The requirements are detailed below:

Install `postgresql`:

```bash
$ sudo apt install postgresql postgresql-contrib
```

Create database:

```bash
$ sudo -u postgres psql
# \password postgres
# create database sci_cream;
# grant all privileges on database sci_cream to postgres;
```

Database URL should be:

`"postgres://<your Postgres username>:<your DB password>@localhost:5432/sci_cream"`

In `.env` set `POSTGRES_URL="postgres://postgres:password@localhost:5432/sci_cream"`

Using [DBeaver](https://dbeaver.io/), create database connection with:

- Connected by: `Host`
- Host: `localhost`
- Port: `5432`
- Database: `sci_cream`
- Authentication: `Database Native`
- Username: `postgres`
- Password: `<password>`

If developing on WSL and using DBeaver on Windows, then port `5432` may need to be forwarded in VSC.

To list and start/stop running database servers:

```bash
$ pg_lscluster
$ pg_ctlcluster 16 main stop
$ pg_ctlcluster 16 main start
```

Push schema to database and seed, need to configure `.env` with the values below, and run the
following commands:

```
APP_USER_NAME="SciCream App"
APP_USER_EMAIL="app@scicream.ca"
TEST_USER_NAME="SciCream Test"
TEST_USER_EMAIL="test@scicream.ca"
```

```bash
$ cd ./packages/app
$ npx drizzle-kit push
$ pnpm tsx ./src/lib/db/seed.ts
```

Building, testing, and running the app can be done with `pnpm build`, `test`, `dev`, or `start`.
To set up and run end-to-end and visual regression tests with Playwright (also run by `pnpm test`):

```bash
$ # Set up dependencies
$ pnpm playwright install --with-deps # default browsers
$ pnpm playwright install chrome --with-deps # Chrome browser
$
$ # Run e2e and visual tests
$ pnpm test:e2e # run end-to-end tests
$ pnpm test:e2e:ui # run end-to-end tests with --ui
$ pnpm test:visual # run visual regression tests
$ pnpm test:visual:update # run visual with --update-snapshots
```

To run code coverage `npx vitest run --coverage`.
To upgrade `pnpm` dependencies `pnpm update --latest`.

```bash
$ pnpm update --latest --dir ./packages/app
$ pnpm update --latest --dir ./packages/sci-cream
```

# Running CI workflows locally

GitHub Actions workflows that are running as part of CI jobs can also be run locally with
[`act`](https://github.com/nektos/act). Ensure that it is installed and available in `PATH`, and
then simply run `$ act` from the repository root.

When running CI workflows locally via `act`, any services (e.g. postgres) or web servers (e.g. from
Playwright, `pnpm dev|start`, etc.) running either locally or as part of jobs in CI workflows must
use mutually exclusive ports to avoid conflicting with each other. CI workflows do not use the
default postgres port 5432 or default web server port 3000, to avoid conflicts with local services
and servers. However, if conflicts still arise, they can be resolved by stopping or changing the
ports used by the local services/servers, or by changing the host ports the CI workflows use.

The postgres service port can be changed by modifying `port` in `postgresql.conf` (for example
located at `/etc/postgresql/16/main/postgresql.conf`) then restarting the service/system, e.g. via
`sudo service postgresql restart`. `POSTGRES_URL` in `.env` must then also be changed to point to
the new port. `sudo ss -tulpn` can be used to see what services are running on what ports.

The web server port can be changed by setting the `PORT` environment variable when starting the
`pnpm dev|start` or `pnpm playwright` servers; e.g. setting in command line `PORT=3001 pnpm start`.

To change the host port that the CI workflow is using, modify `job.<id>.services.postgres.ports`,
e.g. from `5432:5432` to `5433:5432`, to map host port `5433` instead of `5432` to port `5432` on
the container. The respective `job.<id>.env.POSTGRES_URL` needs to be changed to point to the new
port. If multiple jobs in a CI workflow use a service that requires port mappings, they must each
use different ports from each other and from any ports being used on the host. Note that only the
host ports need to be unique, the container ports can be reused. See [Creating PostgreSQL service
containers](https://docs.github.com/en/actions/tutorials/use-containerized-services/create-postgresql-service-containers)

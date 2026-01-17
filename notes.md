Install requirements and dependencies:

```bash
$ sudo apt update
$ sudo apt install nodejs npm
$ sudo npm install -g pnpm
$ pnpm install
```

Install postgresql:

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

`"postgres://<your Postgres username>:<your DB password>@localhost:5432/sci-cream"`

In `.env` set `DATABASE_URL="postgres://postgres:password@localhost:5432/sci_cream"`

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

When running CI workflows locally via `act`, the job may fail to map ports if the default port 5432
on the host is already being used by a running postgres service. To fix this either stop the local
postgres service, change the port that it's running on, or change the host ports that the CI
workflow uses.

To change the local service port modify `port` in `postgresql.conf`, then restart the service, e.g.
via `sudo service postgresql restart`, and change `DATABASE_URL` in `.env` to point to the new port.
`sudo ss -tulpn` can be used to see what services are running on what ports.

To change the host port that the CI workflow is using, modify `job.<id>.services.postgres.ports`,
e.g. from `5432:5432` to `5433:5432`, to map host port `5433` instead of `5432` to port `5432` on
the container. The respective `job.<id>.env.DATABASE_URL` needs to be changed to point to the new
port. If multiple jobs in a CI workflow use a service that requires port mappings, they must each
use different ports from each other and from any ports being used on the host. Note that only the
host ports need to be unique, the container ports can be reused. See [Creating PostgresSQL service
containers](https://docs.github.com/en/actions/tutorials/use-containerized-services/create-postgresql-service-containers)

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

Build, run tests, run dev server:

```bash
$ pnpm build
$ pnpm test
$ pnpm dev
```

To build the `"diesel"` feature of the rust `sci-cream` crate, need to:

```bash
$ sudo apt install libpq-dev
```

Then we can:

```bash
$ # `--features wasm` OR `diesel` for individual features
$ cargo build --all-features
$ cargo test --all-features
```

To use the "wasm" feature and `wasm-pack` to prepare `npm` package:

```bash
$ cargo install wasm-pack # Only needed once
$ cd ./packages/sci-cream
$ # To validate build, not necessary when running wasm-pack
$ cargo rustc --features wasm --crate-type=cdylib
$
$ ./scripts/set-crate-type.sh ./Cargo.toml cdylib
$ wasm-pack build --out-dir wasm --out-name index -- --features wasm
$     # OR
# pnpm build
```

To upgrade `node`:

```bash
$ sudo npm install -g n
$ sudo n stable
```

To upgrade `pnpm` dependencies:

```bash
$ pnpm update --latest --dir ./packages/app
$ pnpm update --latest --dir ./packages/sci-cream
```

To upgrade Rust dependencies:

```bash
$ cargo install cargo-edit # Only needed once
$ cd ./packages/sci-cream
$ cargo upgrade --incompatible
```

To run code coverage:

```bash
$ # Rust
$ cargo install cargo-llvm-cov # Only needed once
$ cargo llvm-cov test --all-features
# Generate report to upload or visualize locally
$ cargo llvm-cov report --codecov OR --html
$
$ # Vitest
$ npx vitest run --coverage
$
$ # Both
$ pnpm coverage
```

To set up and run E2E tests with playwright:

```bash
$ # Set up dependencies
$ pnpm playwright install --with-deps # default browsers
$ pnpm playwright install chrome --with-deps # Chrome browser
$
$ # Run e2e tests
$ pnpm test:e2e # 'pnpm playwright test'
$ pnpm test:e2e:ui # 'pnpm playwright test --ui'
```

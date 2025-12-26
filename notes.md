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

When running CI workflows locally via `act`, the postgres service may fail to start if the above
service is already running on port `5432`. To fix this, either stop the local postgres service, or
change the port that it's running on by modifying `port` in `postgresql.conf`, then restart the
service/system, e.g. via `sudo service postgresql restart`, and change `DATABASE_URL` in `.env` to
point to the new port.

Push schema to database and seed:

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

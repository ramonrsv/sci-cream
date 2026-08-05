# Development

There are two projects in this workspace, a Rust crate at `packages/sci-cream`, and a Next.js app
at `packages/app`. The crate is a dependency for the app and must be built first.

To install `pnpm` and all `npm` dependency packages, required for both the crate and the app:

```bash
sudo npm install -g pnpm
pnpm install
```

## `sci-cream` crate at `packages/sci-cream`

[Rust](https://rust-lang.org/tools/install/) must be installed to build the crate. Some features
also require additional installs:

The `diesel` feature requires `sudo apt install libpq-dev`.

The `wasm` feature requires [`wasm-pack`](https://drager.github.io/wasm-pack/) and the
`wasm32-unknown-unknown` target to be installed:

```bash
cargo install wasm-pack
rustup target add wasm32-unknown-unknown
```

Building and running tests can be done normally with `cargo build` and `cargo test`, with
`--all-features` or `--features ...` to enable a specific set of features. `data` and `database`
are enabled by default. Using the `wasm` feature and `wasm-pack` to prepare an `npm` package
can be done as below, or simply by running `pnpm build:package`:

```bash
# To validate build, not necessary when running wasm-pack
cargo rustc --crate-type cdylib --target wasm32-unknown-unknown --features wasm,data,database

# To prepare the npm package, a dependency for the app
./scripts/set-crate-type.sh ./Cargo.toml cdylib
wasm-pack build --out-dir wasm --out-name index -- --features "wasm,data,database"
```

To run code coverage:

```bash
cargo install cargo-llvm-cov
cargo llvm-cov test --all-features
# Generate report to upload or visualize locally
cargo llvm-cov report --codecov OR --html
```

To upgrade Rust dependencies:

```bash
cargo install cargo-edit
cd ./packages/sci-cream
cargo upgrade --incompatible
```

To perform a release execute the steps below, followed by doing a GitHub release:

```bash
cargo install cargo-release

# Login to crates.io, needs token from https://crates.io/settings/tokens
cargo login

# Review changes and update CHANGELOG.md
cargo release changes

# Review release before executing
cargo release patch # OR minor, major

# Execute release, will also push tag
cargo release patch --execute
```

## `sci-cream` app at `packages/app`

Building and running the app requires Node.js, often a newer version than is provided by `apt`:

```bash
sudo apt update
sudo apt install nodejs

# To upgrade to the latest
sudo npm install -g n
sudo n stable
```

Testing and running the app requires a PostgreSQL database to be running and seeded, and certain
environment variables to be set. The requirements are detailed below:

Install `postgresql`:

```bash
sudo apt install postgresql postgresql-contrib
```

Create database:

```bash
sudo -u postgres psql
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
pg_lsclusters
pg_ctlcluster 17 main stop
pg_ctlcluster 17 main start

pg_dropcluster 17 main --stop
pg_createcluster 17 main --start
```

Apply the schema and seed it by running the following commands:

```bash
cd ./packages/app

# Individual steps
npx drizzle-kit migrate
pnpm tsx ./src/lib/database/seed.ts

# Or the equivalent
pnpm seed-db
```

In order to set up OAuth authentication do the following steps. `<base_url>` can be either
`sci-cream.ca` to set up authentication for the production app, or `localhost:3000` to set it up
for local development environments.

1. Generate `AUTH_SECRET` with `npx auth secret`
2. GitHub OAuth App
   - Go to [Settings -> Developer -> OAuth Apps -> New OAuth App](github.com/settings/developers)
   - Set Homepage URL to `http://<base_url>`
   - Set Authorization callback URL to `http://<base_url>/api/auth/callback/github`
   - Copy the Client ID -> `AUTH_GITHUB_ID`
   - Generate a Client Secret -> `AUTH_GITHUB_SECRET`
3. Google OAuth Credentials
   - Go to [console.cloud.google.com/apis/credentials](console.cloud.google.com/apis/credentials)
   - Create a project (or select an existing one)
   - Go to OAuth consent screen -> configure as 'External', fill in app name/email
   - Go to Credentials -> Create Credentials -> OAuth client ID
   - Set Application type to 'Web application'
   - Add Authorized Javascript origins: `http://<base_url>`
   - Add Authorized redirect URI: `http://<base_url>/api/auth/callback/google`
   - Copy the Client ID -> `AUTH_GOOGLE_ID`
   - Copy the Client Secret -> `AUTH_GOOGLE_SECRET`
4. Populate environment variables
   - Add all five values to `.env` for local or to Vercel project environment for production.

Building, testing, and running the app can be done with `pnpm build`, `test`, `dev`, or `start`.
To set up and run end-to-end and visual regression tests with Playwright (also run by `pnpm test`):

```bash
# Set up dependencies
pnpm playwright install --with-deps # default browsers
pnpm playwright install chrome --with-deps # Chrome browser

# Run e2e and visual tests
pnpm test:e2e # run end-to-end tests
pnpm test:e2e:ui # run end-to-end tests with --ui
pnpm test:visual # run visual regression tests
pnpm test:visual:update # run visual with --update-snapshots
```

To run code coverage `npx vitest run --coverage`.
To upgrade `pnpm` dependencies `pnpm update --latest`.

```bash
pnpm update --latest --dir ./packages/app
pnpm update --latest --dir ./packages/sci-cream
```

To perform a release execute the steps below, followed by doing a GitHub release:

```bash
# Review changes and update CHANGELOG.md
./scripts/release.sh changes

# Review release before executing
./scripts/release.sh release patch # OR minor, major

# Execute: will make changes and create commit/tag
./scripts/release.sh release patch --execute

# Push: will push the commit and tag to upstream
./scripts/release.sh push
```

## Database migrations

`packages/app/drizzle/` is the source of truth for the database schema.

```bash
cd ./packages/app
pnpm db:generate --name <short_description>  # write a migration from the current schema.ts
pnpm lint:sql                                # Squawk checks it for hazards Postgres will not
pnpm db:migrate                              # apply pending migrations
```

**Read the generated SQL.** `drizzle-kit` diffs the schema, not the database, so it misses
dependencies between constraints and routinely emits statements Postgres rejects; hand-editing is
expected. `meta/*_snapshot.json` describes the end state, not the statements, so it stays valid.
Rules Squawk should not apply at this scale are excluded in `.squawk.toml`; suppress a single
finding with a `-- squawk-ignore <rule>` comment saying why it is safe.

A committed migration is immutable, which the `migration_immutability` CI job enforces — drizzle's
migrator compares bookmarks by timestamp rather than hash, so an edited one would test green here
while production kept the original schema.

Each migration also needs a data-only fixture at `drizzle/fixtures/<tag>.sql`, giving the
`db_migration` CI job a populated database to apply it to. Dump one from a database at the
_previous_ migration, holding whatever rows the new migration's constraints must validate against.
Only the newest fixture is read, so delete the previous one:

```bash
createdb sci_cream_fixture
export POSTGRES_URL="postgres://postgres:password@localhost:5432/sci_cream_fixture"

# Every migration except the new one, in journal order
psql "$POSTGRES_URL" -q -v ON_ERROR_STOP=1 -f drizzle/0000_baseline.sql

pnpm tsx ./src/lib/database/seed.ts
pg_dump "$POSTGRES_URL" --data-only --schema=public --no-owner --no-privileges \
  > drizzle/fixtures/<new_tag>.sql
dropdb sci_cream_fixture
```

### Ordering a migration against a deploy

Drizzle names every column explicitly, so running code breaks the moment a column it still names
disappears:

- **Expand** (new tables, new nullable columns) — migrate **before** deploying.
- **Contract** (dropped columns or constraints) — deploy **first**, then migrate.

A migration runs in a single transaction, so a failure rolls back whole.

### Applying to production

Production is Supabase, reached over its **session pooler**
(`aws-<n>-<region>.pooler.supabase.com:5432`) — the transaction pooler on `6543` cannot hold a
migration's transaction. It is the `PROD_MIGRATION_POSTGRES_URL` secret on the `production` GitHub
Environment, whose required reviewer gates every run.

Migrations are applied by the `Database Migrate` workflow — never from a laptop, and never from a
push. Dispatch it manually, or let `Deploy` call it via its `migrate: before | after` input. It
rehearses on a throwaway copy of production first, and aborts before touching production if that
fails.

Rehearse by hand before dispatching, with the script the workflow itself runs. It only ever reads
production, and drops the local copy afterwards unless `--keep-clone` is given. The copy needs a
server at production's major version — Postgres does not restore into an older one — so run one if
the development server is behind:

```bash
docker run -d --rm -e POSTGRES_PASSWORD=password -p 127.0.0.1:5442:5432 postgres:17
export MIGRATION_CLONE_POSTGRES_URL="postgres://postgres:password@localhost:5442/sci_cream_clone"

set -a; . ~/.config/sci-cream/prod.env; set +a
./packages/app/scripts/verify-migration-on-clone.sh
```

Take a backup first, and smoke-test `/recipes` and `/make-recipe` afterwards.

### Rolling back

Drizzle has no down migrations. Reversals live in `drizzle/rollback/*.down.sql`, outside
`meta/_journal.json` so they are never applied as a forward step. Apply with `psql`, delete the
migration's row from `drizzle.__drizzle_migrations`, and redeploy the matching app build.

## Deploying

Production deploys run from the `Deploy` workflow rather than Vercel's Git integration, so a deploy
can be ordered against a migration instead of racing it. `packages/app/vercel.json` switches
Vercel's own deployments off entirely, leaving the workflow as the only thing that ships the app.
Production Branch stays `main` — disabling its deployments is what stops the automatic promotion.

Vercel reads `git.deploymentEnabled` from the branch being pushed, so `gh-pages` carries its own
copy; it holds benchmark data rather than an app.

The deploy job binds the GitHub Environment named by its `target`, so `VERCEL_TOKEN` is needed on
both `Preview` and `Production`, while `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` are repository
secrets. A reviewer on `Production` gates production deploys without holding up previews.

Dispatch it with `target: preview | production`, and `migrate: none | before | after` to pick which
side of the deploy a migration runs on — see
[Ordering a migration against a deploy](#ordering-a-migration-against-a-deploy). It gates on App CI
and Crate CI having already passed for the commit.

## Database Backups

`packages/app/scripts/backup-db.sh` writes an encrypted dump of production to this machine.

One-time setup. The **private** key is the only thing that can read the backups, so keep it
somewhere that survives this machine dying — a password manager, another device, paper:

```bash
sudo apt install age
age-keygen -o ./backup-key.txt   # prints the public key; store the file elsewhere, then delete it
```

Put the production URLs and the age **public** key in a file the app never loads:

```bash
install -m 600 /dev/null ~/.config/sci-cream/prod.env
# PROD_DUMP_POSTGRES_URL="postgres://...pooler.supabase.com:5432/postgres?sslmode=require"
# PROD_MIGRATION_POSTGRES_URL="postgres://...pooler.supabase.com:5432/postgres?sslmode=require"
# BACKUP_AGE_RECIPIENT="age1..."
```

Never put a production URL in `packages/app/.env` — the dev server, `drizzle.config.ts`, and the
tests all read it, and `pnpm seed-db` deletes each seeded user's recipes and batches.

```bash
set -a; . ~/.config/sci-cream/prod.env; set +a
./packages/app/scripts/backup-db.sh --verify
```

Dumps land in `~/backups/sci-cream` as `sci-cream-<timestamp>.sql.gz.age` and are never deleted
unless `--keep N` asks for it (`--out DIR` moves them). They cover the `public` and `drizzle`
schemas, so a restore carries its own migration bookmark. `--verify` restores into a scratch
database and reports row counts _before_ encrypting; it needs `BACKUP_VERIFY_POSTGRES_URL`
pointing at a server on production's major version, the same constraint as the migration rehearsal
above. Restore instructions are in the script's header.

## Running CI workflows locally

GitHub Actions workflows that are running as part of CI jobs can also be run locally with
[`act`](https://github.com/nektos/act). Ensure that it is installed and available in `PATH`, and
then simply run `act` from the repository root.

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

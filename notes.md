Install requirements and dependencies:

```console
$ sudo apt update
$ sudo apt install nodejs npm
$ sudo npm install -g pnpm
$ pnpm install
```

Install postgresql:

```console
$ sudo apt install postgresql postgresql-contrib
```

Create database:

```console
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

Push schema to database and seed:

```console
$ npx drizzle-kit push
$ pnpm tsx ./src/db/seed.ts
```

Build, run tests, run dev server:

```console
$ pnpm build
$ pnpm test
$ pnpm dev
```

Rust `sci-cream` crate feature builds:

```console
$ cargo rustc --features wasm --crate-type=cdylib
$ cargo rustc --features backend --crate-type=rlib
```

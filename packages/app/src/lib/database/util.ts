import "dotenv/config";

/**
 * Get the database URL from `POSTGRES_URL` and apply any necessary transformations
 *
 * @throws {Error} If `POSTGRES_URL` is unset, rather than letting the miss surface downstream.
 *
 * @todo Currently this is replacing `sslmode=require` with `sslmode=no-verify` to disable SSL
 * verification in order to work around a 'SELF_SIGNED_CERT_IN_CHAIN' error with Drizzle ORM.
 * See:
 *   https://github.com/drizzle-team/drizzle-orm/discussions/881
 *   https://github.com/brianc/node-postgres/issues/2558
 */
export function getDatabaseUrl() {
  const url = process.env.POSTGRES_URL;
  if (url === undefined) {
    throw new Error(`POSTGRES_URL is not set; dotenv looks for .env in ${process.cwd()}`);
  }
  return url.replace("sslmode=require", "sslmode=no-verify");
}

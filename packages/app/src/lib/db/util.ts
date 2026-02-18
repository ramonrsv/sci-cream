import "dotenv/config";

/** Get the database URL from `POSTGRES_URL` and apply any necessary transformations
 *
 * @todo Currently this is replacing `sslmode=require` with `sslmode=no-verify` to disable SSL
 * verification in order to work around a 'SELF_SIGNED_CERT_IN_CHAIN' error with Drizzle ORM.
 * See:
 *   https://github.com/drizzle-team/drizzle-orm/discussions/881
 *   https://github.com/brianc/node-postgres/issues/2558
 */
export function getDatabaseUrl() {
  return process.env.POSTGRES_URL!.replace("sslmode=require", "sslmode=no-verify");
}

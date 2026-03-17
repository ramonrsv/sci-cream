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

export const TEST_USER_A = {
  name: "SciCream Tester A",
  email: "a.tester@sci-cream.ca",
  password: "password123",
};

export const TEST_USER_B = {
  name: "SciCream Tester B",
  email: "b.tester@sci-cream.ca",
  password: "password123",
};

export const USER_DEFINED_FRUCTOSE_SPEC = {
  name: "Fructose (User-Defined)",
  category: "Sweetener",
  SweetenerSpec: { sweeteners: { sugars: { fructose: 100 } }, ByDryWeight: { solids: 100 } },
};

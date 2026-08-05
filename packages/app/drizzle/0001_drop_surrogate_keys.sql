-- Hand-ordered. `drizzle-kit generate` emits these statements in an order Postgres rejects twice:
-- it drops `recipe_versions_recipe_version_uq` while `batch_recipes_version_fk` still depends on
-- the index behind it, and it adds the composite primary keys while the `id` columns still hold
-- one. Dropping the FK first, then the columns (which takes the old primary keys with them), then
-- adding the composite keys and recreating the FK against them, satisfies both.
ALTER TABLE "batch_recipes" DROP CONSTRAINT "batch_recipes_version_fk";--> statement-breakpoint
ALTER TABLE "batch_recipes" DROP CONSTRAINT "batch_recipes_batch_position_uq";--> statement-breakpoint
ALTER TABLE "recipe_versions" DROP CONSTRAINT "recipe_versions_recipe_version_uq";--> statement-breakpoint
-- Dropping these does break clients that still name the columns, which every drizzle query does.
-- Handled by ordering: this is a contract-phase migration, applied only after the code that stopped
-- naming them is deployed. See DEVELOPMENT.md, "Ordering a migration against a deploy".
-- squawk-ignore ban-drop-column
ALTER TABLE "batch_recipes" DROP COLUMN "id";--> statement-breakpoint
-- squawk-ignore ban-drop-column
ALTER TABLE "recipe_versions" DROP COLUMN "id";--> statement-breakpoint
ALTER TABLE "batch_recipes" ADD CONSTRAINT "batch_recipes_batch_id_position_pk" PRIMARY KEY("batch_id","position");--> statement-breakpoint
ALTER TABLE "recipe_versions" ADD CONSTRAINT "recipe_versions_recipe_id_version_pk" PRIMARY KEY("recipe_id","version");--> statement-breakpoint
ALTER TABLE "batch_recipes" ADD CONSTRAINT "batch_recipes_version_fk" FOREIGN KEY ("recipe_id","version_number") REFERENCES "public"."recipe_versions"("recipe_id","version") ON DELETE set null ON UPDATE no action;

ALTER TABLE "comments" ADD COLUMN "deleted_by" integer;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Tombstones predating the column record no actor. Attributing them to their author is the
-- conservative reading: it claims no moderation that may not have happened, and it satisfies the
-- check below, which would otherwise reject every row already deleted.
UPDATE "comments" SET "deleted_by" = "author" WHERE "deleted_at" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_deleted_both_or_neither" CHECK (("comments"."deleted_at" IS NULL) = ("comments"."deleted_by" IS NULL));

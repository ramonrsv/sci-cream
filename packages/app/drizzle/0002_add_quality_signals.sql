CREATE TYPE "public"."rating" AS ENUM('Bad', 'Good', 'Great');--> statement-breakpoint
ALTER TABLE "batches" ADD COLUMN "favourite" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "recipe_versions" ADD COLUMN "rating" "rating";--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "favourite" boolean DEFAULT false NOT NULL;
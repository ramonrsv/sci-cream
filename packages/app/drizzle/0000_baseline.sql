CREATE TYPE "public"."category" AS ENUM('Dairy', 'Sweetener', 'Fruit', 'Chocolate', 'Nut', 'Egg', 'Alcohol', 'Stabilizer', 'Emulsifier', 'Flavouring', 'Miscellaneous');--> statement-breakpoint
CREATE TABLE "batch_recipes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "batch_recipes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"batch_id" integer NOT NULL,
	"position" integer NOT NULL,
	"name" text NOT NULL,
	"rows" json NOT NULL,
	"color" text,
	"recipe_id" integer,
	"version_number" integer,
	"version_name" text,
	"has_siblings" boolean,
	CONSTRAINT "batch_recipes_batch_position_uq" UNIQUE("batch_id","position"),
	CONSTRAINT "batch_recipes_ref_both_or_neither" CHECK (("batch_recipes"."recipe_id" IS NULL) = ("batch_recipes"."version_number" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "batches" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "batches_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user" integer NOT NULL,
	"title" text,
	"date" text NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingredients" (
	"name" text NOT NULL,
	"user" integer NOT NULL,
	"category" "category",
	"spec" json,
	CONSTRAINT "ingredients_name_user_pk" PRIMARY KEY("name","user")
);
--> statement-breakpoint
CREATE TABLE "recipe_versions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "recipe_versions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"recipe_id" integer NOT NULL,
	"version" integer NOT NULL,
	"recipe" json NOT NULL,
	"comments" text,
	"label" text,
	"version_name" text,
	"evaporation" real,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "recipe_versions_recipe_version_uq" UNIQUE("recipe_id","version")
);
--> statement-breakpoint
CREATE TABLE "recipes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "recipes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"user" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "recipes_user_name_uq" UNIQUE("name","user")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "batch_recipes" ADD CONSTRAINT "batch_recipes_batch_id_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batch_recipes" ADD CONSTRAINT "batch_recipes_version_fk" FOREIGN KEY ("recipe_id","version_number") REFERENCES "public"."recipe_versions"("recipe_id","version") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batches" ADD CONSTRAINT "batches_user_users_id_fk" FOREIGN KEY ("user") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_user_users_id_fk" FOREIGN KEY ("user") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_versions" ADD CONSTRAINT "recipe_versions_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_user_users_id_fk" FOREIGN KEY ("user") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "recipe_versions_recipe_version_name_uq" ON "recipe_versions" USING btree ("recipe_id","version_name") WHERE "recipe_versions"."version_name" IS NOT NULL;
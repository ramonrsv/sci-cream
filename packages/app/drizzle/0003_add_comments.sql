CREATE TYPE "public"."comment_subject_type" AS ENUM('blog', 'docs');--> statement-breakpoint
CREATE TABLE "comment_reports" (
	"comment_id" integer NOT NULL,
	"reporter" integer NOT NULL,
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp,
	CONSTRAINT "comment_reports_comment_id_reporter_pk" PRIMARY KEY("comment_id","reporter")
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "comments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"subject_type" "comment_subject_type" NOT NULL,
	"subject_key" text NOT NULL,
	"author" integer NOT NULL,
	"parent_id" integer,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"deleted_at" timestamp,
	CONSTRAINT "comments_body_len" CHECK (char_length("comments"."body") <= 2000)
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_admin" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "comment_reports" ADD CONSTRAINT "comment_reports_comment_id_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_reports" ADD CONSTRAINT "comment_reports_reporter_users_id_fk" FOREIGN KEY ("reporter") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_users_id_fk" FOREIGN KEY ("author") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "comment_reports_open_idx" ON "comment_reports" USING btree ("created_at") WHERE "comment_reports"."resolved_at" IS NULL;--> statement-breakpoint
CREATE INDEX "comments_subject_idx" ON "comments" USING btree ("subject_type","subject_key","created_at");
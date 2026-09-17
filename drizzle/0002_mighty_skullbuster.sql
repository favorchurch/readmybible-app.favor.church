CREATE TABLE "readmybible"."notes" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"rock_person_id" integer NOT NULL,
	"group_id" integer,
	"page" text NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"is_shared" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notes_person_page_unique" UNIQUE("rock_person_id","page"),
	CONSTRAINT "notes_content_length" CHECK (char_length("readmybible"."notes"."content") <= 1000)
);
--> statement-breakpoint
CREATE INDEX "notes_rock_person_id_idx" ON "readmybible"."notes" USING btree ("rock_person_id");--> statement-breakpoint
CREATE INDEX "notes_group_id_idx" ON "readmybible"."notes" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "notes_page_idx" ON "readmybible"."notes" USING btree ("page");
CREATE TABLE "readmybible"."feedback" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"rock_person_id" integer NOT NULL,
	"category" text NOT NULL,
	"textual_feedback" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "feedback_category_check" CHECK ("readmybible"."feedback"."category" in ('Read My Bible App', 'Experience with Favor Connects')),
	CONSTRAINT "feedback_textual_feedback_check" CHECK (char_length(trim("readmybible"."feedback"."textual_feedback")) between 1 and 5000)
);
--> statement-breakpoint
CREATE INDEX "feedback_created_at_idx" ON "readmybible"."feedback" USING btree ("created_at");
--> statement-breakpoint
CREATE INDEX "feedback_rock_person_id_idx" ON "readmybible"."feedback" USING btree ("rock_person_id");

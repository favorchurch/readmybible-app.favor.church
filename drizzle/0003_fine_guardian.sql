CREATE TABLE "readmybible"."notifications" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"rock_person_id" integer NOT NULL,
	"sender_rock_person_id" integer,
	"group_id" integer,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"metadata" jsonb,
	"dismissed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "readmybible"."nudges" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"sender_rock_person_id" integer NOT NULL,
	"recipient_rock_person_id" integer NOT NULL,
	"group_id" integer NOT NULL,
	"nudge_date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "nudges_sender_recipient_date_unique" UNIQUE("sender_rock_person_id","recipient_rock_person_id","nudge_date")
);
--> statement-breakpoint
CREATE INDEX "notifications_rock_person_id_idx" ON "readmybible"."notifications" USING btree ("rock_person_id");--> statement-breakpoint
CREATE INDEX "notifications_dismissed_idx" ON "readmybible"."notifications" USING btree ("rock_person_id","dismissed_at");--> statement-breakpoint
CREATE INDEX "notifications_created_at_idx" ON "readmybible"."notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "nudges_sender_rock_person_id_idx" ON "readmybible"."nudges" USING btree ("sender_rock_person_id");--> statement-breakpoint
CREATE INDEX "nudges_recipient_rock_person_id_idx" ON "readmybible"."nudges" USING btree ("recipient_rock_person_id");--> statement-breakpoint
CREATE INDEX "nudges_group_id_idx" ON "readmybible"."nudges" USING btree ("group_id");
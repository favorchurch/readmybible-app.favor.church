CREATE TABLE "readmybible"."checkins" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"rock_person_id" integer NOT NULL,
	"group_id" integer,
	"chapter" smallint NOT NULL,
	"reading_date" date NOT NULL,
	"timezone" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "checkins_person_chapter_unique" UNIQUE("rock_person_id","chapter"),
	CONSTRAINT "checkins_chapter_range" CHECK ("readmybible"."checkins"."chapter" between 1 and 28)
);
--> statement-breakpoint
CREATE TABLE "readmybible"."join_codes" (
	"group_id" integer PRIMARY KEY NOT NULL,
	"code" char(4) NOT NULL,
	"created_by" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "join_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "readmybible"."join_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"group_id" integer,
	"rock_person_id" integer,
	"code" char(4),
	"outcome" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "readmybible"."profiles" (
	"rock_person_id" integer PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"avatar" jsonb NOT NULL,
	"translation" text DEFAULT 'NET' NOT NULL,
	"active_group_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "checkins_group_reading_date_idx" ON "readmybible"."checkins" USING btree ("group_id","reading_date");--> statement-breakpoint
CREATE INDEX "checkins_rock_person_id_idx" ON "readmybible"."checkins" USING btree ("rock_person_id");
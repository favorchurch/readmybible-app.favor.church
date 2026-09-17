import {
  bigserial,
  boolean,
  char,
  check,
  date,
  index,
  integer,
  jsonb,
  pgSchema,
  smallint,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const readmybible = pgSchema("readmybible");

export const profiles = readmybible.table("profiles", {
  rockPersonId: integer("rock_person_id").primaryKey(),
  displayName: text("display_name").notNull(),
  avatar: jsonb("avatar").notNull(),
  translation: text("translation").notNull().default("NET"),
  activeGroupId: integer("active_group_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const checkins = readmybible.table(
  "checkins",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    rockPersonId: integer("rock_person_id").notNull(),
    groupId: integer("group_id"),
    chapter: smallint("chapter").notNull(),
    readingDate: date("reading_date").notNull(),
    timezone: text("timezone").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("checkins_person_chapter_unique").on(table.rockPersonId, table.chapter),
    check("checkins_chapter_range", sql`${table.chapter} between 1 and 28`),
    index("checkins_group_reading_date_idx").on(table.groupId, table.readingDate),
    index("checkins_rock_person_id_idx").on(table.rockPersonId),
  ],
);

export const joinCodes = readmybible.table("join_codes", {
  groupId: integer("group_id").primaryKey(),
  code: char("code", { length: 4 }).notNull().unique(),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const joinEvents = readmybible.table("join_events", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  groupId: integer("group_id"),
  rockPersonId: integer("rock_person_id"),
  code: char("code", { length: 4 }),
  outcome: text("outcome"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const feedback = readmybible.table(
  "feedback",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    rockPersonId: integer("rock_person_id").notNull(),
    category: text("category").notNull(),
    textualFeedback: text("textual_feedback").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "feedback_category_check",
      sql`${table.category} in ('Read My Bible App', 'Experience with Favor Connects')`,
    ),
    check(
      "feedback_textual_feedback_check",
      sql`char_length(trim(${table.textualFeedback})) between 1 and 5000`,
    ),
    index("feedback_created_at_idx").on(table.createdAt),
    index("feedback_rock_person_id_idx").on(table.rockPersonId),
  ],
);

// ---------------------------------------------------------------------------
// Issue #148: Personal Revelations notebook
// ---------------------------------------------------------------------------

export const notes = readmybible.table(
  "notes",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    rockPersonId: integer("rock_person_id").notNull(),
    groupId: integer("group_id"),
    page: text("page").notNull(),
    content: text("content").notNull().default(""),
    isShared: boolean("is_shared").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("notes_person_page_unique").on(table.rockPersonId, table.page),
    check("notes_content_length", sql`char_length(${table.content}) <= 1000`),
    index("notes_rock_person_id_idx").on(table.rockPersonId),
    index("notes_group_id_idx").on(table.groupId),
    index("notes_page_idx").on(table.page),
  ],
);


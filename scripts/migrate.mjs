// Custom migration runner.
//
// drizzle-orm's built-in `migrate()` always issues `CREATE SCHEMA IF NOT
// EXISTS` for its tracking table's schema before applying anything, and
// Postgres checks CREATE-on-database privilege for that statement regardless
// of whether the schema already exists. The app's dedicated role
// (readmybible_app) intentionally has no such privilege -- Supabase schema
// and role were provisioned out-of-band (Leg 0.3) with grants scoped to
// objects inside the `readmybible` schema only. So this runner tracks
// applied migrations in a plain table inside that schema instead.
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import { readdirSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import postgres from "postgres";

if (!process.env.DATABASE_URL_DIRECT) {
  throw new Error("DATABASE_URL_DIRECT is not set.");
}

const sql = postgres(process.env.DATABASE_URL_DIRECT, { max: 1 });

try {
  await sql`
    CREATE TABLE IF NOT EXISTS "readmybible"."__drizzle_migrations" (
      id serial PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `;

  const files = readdirSync("./drizzle")
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const content = readFileSync(`./drizzle/${file}`, "utf8");
    const hash = createHash("sha256").update(content).digest("hex");

    const [existing] = await sql`
      SELECT 1 FROM "readmybible"."__drizzle_migrations" WHERE hash = ${hash}
    `;
    if (existing) {
      console.log(`Skipping already-applied migration ${file}`);
      continue;
    }

    const statements = content
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean);

    console.log(`Applying ${file} (${statements.length} statements)...`);
    await sql.begin(async (tx) => {
      for (const statement of statements) {
        await tx.unsafe(statement);
      }
      await tx`
        INSERT INTO "readmybible"."__drizzle_migrations" (hash, created_at)
        VALUES (${hash}, ${Date.now()})
      `;
    });
    console.log(`Applied ${file}.`);
  }

  console.log("Migrations complete.");
} catch (err) {
  console.error("Migration failed:", err);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}

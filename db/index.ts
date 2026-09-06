import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

type Database = ReturnType<typeof drizzle>;
let database: Database | null = null;

/**
 * Keep database construction out of module evaluation. Next/Vercel imports
 * route modules while collecting build configuration, and Preview may not
 * expose the runtime DATABASE_URL during that phase. The first real query
 * still fails clearly when the runtime is misconfigured.
 */
function getDatabase(): Database {
  if (database) return database;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set.");

  // `prepare: false` is required against Supabase's pooler (transaction mode,
  // port 6543) -- it does not support prepared statements across connections.
  const client = postgres(connectionString, { prepare: false });
  database = drizzle(client, { schema });
  return database;
}

// A proxy keeps the existing `db.select()` call sites unchanged while
// deferring connection creation until a request actually touches the DB.
export const db = new Proxy({} as Database, {
  get(_target, property) {
    const value = Reflect.get(getDatabase() as object, property);
    return typeof value === "function" ? value.bind(getDatabase()) : value;
  },
});

import { config as loadEnv } from "dotenv";
import { defineConfig } from "drizzle-kit";

loadEnv({ path: ".env.local" });

const connectionString = process.env.DATABASE_URL_DIRECT;
if (!connectionString) {
  throw new Error("DATABASE_URL_DIRECT is required for drizzle-kit (migrations use the direct, non-pooled connection).");
}

export default defineConfig({
  out: "./drizzle",
  schema: "./db/schema.ts",
  dialect: "postgresql",
  schemaFilter: ["readmybible"],
  dbCredentials: {
    url: connectionString,
  },
});

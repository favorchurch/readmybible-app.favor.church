import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL_DIRECT, { max: 1 });
const rows = await sql`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'readmybible'
  ORDER BY table_name
`;
console.log(rows.map((r) => r.table_name));
await sql.end({ timeout: 5 });

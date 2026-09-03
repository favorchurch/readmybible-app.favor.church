/**
 * Campus id -> display name, for the admin table/CSV. Read live via
 * `rock_entity` (Rock MCP, read-only) against the `campuses` model on
 * 2026-09-03. Rock production values -- do not assume preview parity.
 */
export const CAMPUS_NAMES: Record<number, string> = {
  1: "Manila",
  2: "Brisbane",
  3: "Seoul",
  5: "OPEN ACCESS",
};

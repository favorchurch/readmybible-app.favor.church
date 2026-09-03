/**
 * Root section ids for the Connect Groups (GT24) hierarchy. Split out of
 * lib/rock/hierarchy.ts (which imports "server-only" and the live Rock
 * client) so plain consumers -- like lib/admin/access.ts, and its unit
 * tests -- can use these constants without pulling in a module that throws
 * outside a server component / Node's "react-server" resolve condition.
 *
 * Discovered live on 2026-09-03 via `rock_entity` (Rock MCP, read-only) --
 * see the longer comment in lib/rock/hierarchy.ts for the full walk.
 */

/** GroupId of the top-most GT24 "Connect Groups" section (ParentGroupId null). */
export const GLOBAL_ROOT_SECTION_ID = 22464;

/** GroupIds of the three campus-level GT24 sections directly under the global root. */
export const CAMPUS_ROOT_SECTION_IDS = [39, 22863, 22864] as const;

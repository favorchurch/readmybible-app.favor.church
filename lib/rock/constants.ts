/**
 * Rock RMS role and group type IDs. These are PRODUCTION values from
 * rock.favor.church. rock-preview.favor.church has a separate, unsynced
 * database and these IDs are NOT guaranteed to match there — do not assume
 * preview parity when testing against it.
 */

/** GroupTypeId for a Connect Group (GT25). */
export const GROUP_TYPE_CONNECT_GROUP = 25;

/** GroupTypeId for a Connect section (GT24) — leaders/departments/clusters/regions. */
export const GROUP_TYPE_SECTION = 24;

/** GroupRoleId values within a Connect Group (GT25). */
export const ROLE_GT25_MEMBER = 23;
export const ROLE_GT25_LEADER = 24;
export const ROLE_GT25_ASSISTANT_LEADER = 81;

/** Roles that count as "active membership" of a Connect Group for game scoring. */
export const GT25_ACTIVE_ROLE_IDS = [
  ROLE_GT25_MEMBER,
  ROLE_GT25_LEADER,
  ROLE_GT25_ASSISTANT_LEADER,
] as const;

/** GroupRoleId values within a Connect section (GT24). */
export const ROLE_GT24_LEADER = 22;
export const ROLE_GT24_ADMIN = 68;

/** Rock GroupMemberStatus enum values used in OData filters. */
export const GROUP_MEMBER_STATUS_ACTIVE = 1;

/**
 * Local manual character orientation for the immersive 3D home scene (#174).
 * Orientation is device-local only -- never persisted to Rock or shared state.
 * Scope = mode + exact roster, so one person's yaw can never leak onto another
 * person, another mode, or another home.
 */

export type OrientationMode = "tent" | "campfire";

const STORAGE_KEY = "read-my-bible-scene-orientation";
const MAX_SCOPES = 10;

/** The ±15° step used by the rotation controls. */
export const ROTATE_STEP = Math.PI / 12;

/** Yaw that points a person standing at `position` toward `focus`. */
export function headingToward(position: { x: number; z: number }, focus: { x: number; z: number }) {
  return Math.atan2(focus.x - position.x, focus.z - position.z);
}

/** Keep stored/manual yaw in [-π, π] so drift never accumulates. */
export function normalizeAngle(radians: number) {
  let angle = radians;
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

function rosterFingerprint(roster: { personId: number }[]) {
  return roster.map(member => member.personId).sort((a, b) => a - b).join("-");
}

export function orientationScope(mode: OrientationMode, roster: { personId: number }[]) {
  return `${mode}:${rosterFingerprint(roster)}`;
}

function readStore(): Record<string, Record<string, number>> {
  if (typeof window === "undefined") return {};
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as Record<string, Record<string, number>>;
  } catch {
    return {};
  }
}

function writeStore(store: Record<string, Record<string, number>>) {
  if (typeof window === "undefined") return;
  try {
    const keys = Object.keys(store);
    for (const key of keys.slice(0, Math.max(0, keys.length - MAX_SCOPES))) delete store[key];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* Storage unavailable (private mode, quota) -- orientation stays in memory for this visit. */
  }
}

/** Saved manual yaws for one scope; anything invalid is ignored. */
export function loadSceneOrientations(scope: string): Map<number, number> {
  const yaws = new Map<number, number>();
  const saved = readStore()[scope];
  if (!saved || typeof saved !== "object") return yaws;
  for (const [id, yaw] of Object.entries(saved)) {
    const personId = Number(id);
    if (Number.isInteger(personId) && Number.isFinite(yaw)) yaws.set(personId, yaw);
  }
  return yaws;
}

export function saveSceneOrientation(scope: string, personId: number, yaw: number) {
  if (!Number.isFinite(yaw)) return;
  const store = readStore();
  const saved = store[scope] ?? {};
  delete store[scope]; // Re-insert so the LRU cap drops the least-recent homes.
  saved[String(personId)] = yaw;
  store[scope] = saved;
  writeStore(store);
}

/** A deliberate Face fire: clear the manual heading so the fire-facing default restores. */
export function clearSceneOrientation(scope: string, personId: number) {
  const store = readStore();
  const saved = store[scope];
  if (!saved) return;
  delete saved[String(personId)];
  if (Object.keys(saved).length) store[scope] = saved;
  else delete store[scope];
  writeStore(store);
}

/** Reset view: drop stored orientation for this roster in every mode. */
export function clearAllSceneOrientations(roster: { personId: number }[]) {
  const fingerprint = rosterFingerprint(roster);
  const store = readStore();
  for (const scope of Object.keys(store)) {
    if (scope.endsWith(`:${fingerprint}`)) delete store[scope];
  }
  writeStore(store);
}

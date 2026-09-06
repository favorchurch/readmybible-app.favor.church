import "server-only";

/**
 * The one Connect Group test mode may write to, from
 * `TEST_MODE_WRITABLE_GROUP_ID`.
 *
 * Returns null in a production build no matter what the env says, so the
 * no-write guarantee holds on Vercel (preview and prod both build with
 * NODE_ENV=production) even if the variable is set there by accident.
 *
 * Shared by `app/page.tsx` (which sends it to the client) and
 * `app/actions/getTestGroupSnapshot.ts` (which lets the sandbox group bypass
 * the campus check). They must never disagree about which group this is.
 */
export function testWritableGroupId(): number | null {
  if (process.env.NODE_ENV === "production") return null;
  const raw = process.env.TEST_MODE_WRITABLE_GROUP_ID;
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

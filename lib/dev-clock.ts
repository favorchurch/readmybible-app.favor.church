/**
 * Dev-only clock override (D5, issue 32). No active, grace, or closed state
 * can be QA'd before October 1 without a way to move "today." Guarded on
 * both sides -- production never reads DEV_MOCK_TODAY, and a malformed
 * value falls back to the real clock -- so this cannot affect a real
 * reader. This file intentionally has no "server-only" import: it's a pure
 * function over process.env, called from server code (app/page.tsx,
 * app/actions/checkIn.ts, lib/data/stats.ts, lib/admin/stats.ts) that then
 * passes the resolved value down to the client as a plain prop.
 */

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function mockDateString(): string | null {
  if (process.env.NODE_ENV === "production") return null;
  const value = process.env.DEV_MOCK_TODAY;
  return value && DATE_PATTERN.test(value) ? value : null;
}

/** The dev-mock date if one is set and valid outside production, else null. */
export function devMockToday(): string | null {
  return mockDateString();
}

/** Real `new Date()`, unless a valid DEV_MOCK_TODAY override applies (that date at 12:00 local). */
export function appNow(): Date {
  const mock = mockDateString();
  if (!mock) return new Date();
  const [year, month, day] = mock.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

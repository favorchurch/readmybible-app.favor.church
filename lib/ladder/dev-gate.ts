/**
 * Reachability gate for the home-ladder prototype route.
 *
 * The ladder prototype reads live Rock structure at request time and applies
 * synthetic ratios. It is a design surface, not a product surface, and
 * `main` deploys straight to production -- so the route must be unreachable
 * in a production build.
 *
 * This repo already carries an open bug for exactly this failure (issue #52:
 * the `?test=1` debug panel reachable in production), which is why the gate
 * is a named function with a test against it rather than an inline check
 * someone can quietly drop while refactoring.
 *
 * Same shape as `lib/test-mode-config.ts`: production loses, unconditionally,
 * before any other consideration.
 */

/** True only outside a production build. Never opt-in-able by an env var. */
export function isLadderPrototypeEnabled(): boolean {
  return process.env.NODE_ENV !== "production";
}

/** Why the gate is closed, for a test to assert against rather than a bare boolean. */
export function ladderGateReason(): string {
  return isLadderPrototypeEnabled()
    ? "open: non-production build"
    : "closed: NODE_ENV is production";
}

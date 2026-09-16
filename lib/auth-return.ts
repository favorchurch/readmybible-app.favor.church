/**
 * Keep authentication destinations inside this app. Auth0's `returnTo` is
 * reflected back into a redirect after the callback, so accepting only
 * absolute local paths prevents the login entry from becoming an open
 * redirect while preserving deep links such as `/join/ABC123`.
 */
export function safeReturnTo(value: unknown): string {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (typeof candidate !== "string" || !candidate.startsWith("/") || candidate.startsWith("//")) {
    return "/";
  }
  return candidate;
}

export function loginPathFor(returnTo: unknown): string {
  const safe = safeReturnTo(returnTo);
  return safe === "/" ? "/login" : `/login?returnTo=${encodeURIComponent(safe)}`;
}

export function authLoginPathFor(returnTo: unknown): string {
  const safe = safeReturnTo(returnTo);
  return safe === "/" ? "/auth/login" : `/auth/login?returnTo=${encodeURIComponent(safe)}`;
}

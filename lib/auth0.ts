import { NextResponse } from "next/server";
import { Auth0Client, filterDefaultIdTokenClaims } from "@auth0/nextjs-auth0/server";
import type { OnCallbackContext } from "@auth0/nextjs-auth0/types";
import type { SdkError } from "@auth0/nextjs-auth0/errors";

/**
 * Shared with lib/session.ts's claim reads -- must match the Action's NAMESPACE
 * in rock-auth0/actions/post-login/code.js exactly (trailing slash included).
 */
export const AUTH0_CLAIM_NAMESPACE = "https://auth.favor.church/";

/** Keep reflected Auth0 error text short and inert before it reaches a URL or the DOM. */
function sanitizeDetail(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/[^\w .,:'()/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

/**
 * The SDK's default handler renders `error.message`, which for a failed
 * authorization is the generic "An error occurred during the authorization
 * flow." The reason Auth0 actually sent back lives on `error.cause`, so unwrap
 * it: log the full shape for Vercel's runtime logs and pass a sanitized code
 * and reason to the error screen, so a failure is diagnosable without tenant
 * log access.
 */
async function onCallback(
  error: SdkError | null,
  ctx: OnCallbackContext,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _session: unknown,
): Promise<NextResponse> {
  const appBaseUrl = process.env.APP_BASE_URL ?? ctx.appBaseUrl ?? "";

  if (!error) {
    return NextResponse.redirect(new URL(ctx.returnTo || "/", appBaseUrl).toString());
  }

  const cause = (error as { cause?: { code?: string; message?: string } }).cause;
  console.error("[auth0-callback] authorization failed", {
    name: error.name,
    code: (error as { code?: string }).code,
    message: error.message,
    causeCode: cause?.code,
    causeMessage: cause?.message,
  });

  const target = new URL("/auth-error", appBaseUrl);
  const code = sanitizeDetail(cause?.code ?? (error as { code?: string }).code, 64);
  const reason = sanitizeDetail(cause?.message, 200);
  if (code) target.searchParams.set("code", code);
  if (reason) target.searchParams.set("reason", reason);
  return NextResponse.redirect(target.toString());
}

/**
 * Auth0 issuer is the custom domain auth.favor.church (same as
 * runsheet.favor.church). Callback and logout URLs live on the Auth0 "Rock
 * Web Apps" client and are provisioned by the planner, not this app.
 */
export const auth0 = new Auth0Client({
  domain: process.env.AUTH0_DOMAIN,
  /**
   * The tenant sets a default audience of the Rock MCP API, and the shared
   * "Rock Web Apps" client has no grant for it, so any /authorize request that
   * omits an audience is rejected with invalid_request before the user ever
   * sees a login form. Naming the tenant's own /userinfo audience overrides
   * that default and needs no client grant -- this is what runsheet's v3 SDK
   * did implicitly, and what v4 stopped doing. offline_access is dropped with
   * it: sessions ride the SDK's own cookie and Rock is called with a server
   * REST key, so no refresh token is needed.
   */
  authorizationParameters: {
    scope: "openid profile email",
    audience: process.env.AUTH0_AUDIENCE ?? "https://favorchurch.au.auth0.com/userinfo",
  },
  clientId: process.env.AUTH0_CLIENT_ID,
  clientSecret: process.env.AUTH0_CLIENT_SECRET,
  appBaseUrl: process.env.APP_BASE_URL,
  secret: process.env.AUTH0_SECRET,
  onCallback,
  /**
   * v4 keeps only a fixed default claim set (sub, name, email, ...) in the
   * session cookie and drops everything else -- including the rock_person_id
   * / rock_person_found namespaced claims the post-login Action sets. Without
   * this hook every session resolves to "not-found-in-rock" regardless of
   * what Rock or the Action actually returned.
   */
  async beforeSessionSaved(session) {
    const namespacedClaims = Object.fromEntries(
      Object.entries(session.user).filter(([key]) => key.startsWith(AUTH0_CLAIM_NAMESPACE)),
    );
    return {
      ...session,
      user: {
        ...filterDefaultIdTokenClaims(session.user),
        ...namespacedClaims,
      },
    };
  },
});

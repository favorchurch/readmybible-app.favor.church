import { NextResponse } from "next/server";
import { Auth0Client } from "@auth0/nextjs-auth0/server";
import type { OnCallbackContext } from "@auth0/nextjs-auth0/types";
import type { SdkError } from "@auth0/nextjs-auth0/errors";

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
  clientId: process.env.AUTH0_CLIENT_ID,
  clientSecret: process.env.AUTH0_CLIENT_SECRET,
  appBaseUrl: process.env.APP_BASE_URL,
  secret: process.env.AUTH0_SECRET,
  onCallback,
});

import { NextResponse, type NextRequest } from "next/server";

import { auth0 } from "@/lib/auth0";
import { isLadderPrototypeEnabled } from "@/lib/ladder/dev-gate";

/**
 * The ladder prototype is dev-only, and calling `notFound()` inside the page
 * is NOT enough: Next renders the not-found body but still answers the
 * request with **HTTP 200**, so the route stays observably present to
 * crawlers, monitoring and anyone probing the deployment. (Verified against a
 * production build: `/ladder` returned 200, `/does-not-exist` returned 404.)
 *
 * Refusing it here, before the route runs, is what actually makes it
 * unreachable. The page keeps its own `notFound()` as a second layer.
 */
function ladderBlocked(request: NextRequest): boolean {
  return !isLadderPrototypeEnabled() && request.nextUrl.pathname.startsWith("/ladder");
}

export async function proxy(request: NextRequest) {
  if (ladderBlocked(request)) {
    return new NextResponse(null, { status: 404 });
  }
  // Mounts /auth/login, /auth/callback, /auth/logout and keeps the session rolling.
  return auth0.middleware(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for static assets, so the SDK can
     * refresh the session cookie on every navigation without doing it on
     * every image or CSS request.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

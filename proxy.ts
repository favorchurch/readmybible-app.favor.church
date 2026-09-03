import type { NextRequest } from "next/server";

import { auth0 } from "@/lib/auth0";

export async function proxy(request: NextRequest) {
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

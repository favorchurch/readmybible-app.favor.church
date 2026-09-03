import { Auth0Client } from "@auth0/nextjs-auth0/server";

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
});

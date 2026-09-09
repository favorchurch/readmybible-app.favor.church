# Login landing and entry performance

Status: approved by Rico in this conversation on 2026-09-09. Public welcome direction selected. Execute the named preview-only actions; no merge or production deployment. Earlier planning-only language below records the original proposal and is superseded by this approval.

## Outcome and visual

Give logged-out visitors useful, branded content at `/`, with a single “Log in with Favor” action. Keep the existing authenticated Bible experience at `/` and preserve protected deep-link return paths. Visual: `docs/prototypes/login-landing/index.html`. This is a standalone responsive concept, not a replacement credential form. Uses existing app cream/navy palette, coral accent and local brand fonts. A person opening the app on their phone before work should see a calm, legible invitation and an immediately available action. The Scripture panel is explicitly sample content, not a personalized reading assignment.

## Evidence and limits

User-supplied baseline (not independently rerun): root median TTFB 503 ms, login redirect 228 ms; Auth0 document TTFB ~931 ms, FCP 2.892 s, load 4.989 s. External branding begins ~2.75 s and ends ~3.90 s. Unknown device, throttling, geography, cold/warm mix and time origin limit comparisons. Do not add timing values until their navigation origins are aligned; late artwork is correlated with the waterfall, not proven to cause FCP.

Repository: `app/page.tsx:20` calls `getSessionContext()` then redirects logged-out visitors to `/auth/login`; `proxy.ts:5` invokes Auth0 middleware for mounted auth routes and rolling sessions. `lib/session.ts` returns logged-out immediately when the SDK has no session, before person/membership work. Therefore there is no evidence that unauthenticated Rock calls explain root latency. Imports/runtime startup, middleware and session parsing require measurement. SDK pinned at 4.28.0; Next.js declared ^16.3.4.

Auth0 configuration in `lib/auth0.ts` has a required audience override, custom callback/error handling and namespaced Rock claims. Preserve these. Universal Login is served outside this repository; access to its customization and shared-app blast radius have not been established.

## Proposed work (express; one repository, three tasks)

1. Establish repeatable baseline. Collect 10 cold and 10 warm entry navigations from the same geography/device profile; record status, redirect count, TTFB, FCP, LCP, CLS, asset initiators and cache headers. Measure both navigation-to-content and click-to-login-form. Separately use an authorized authenticated browser to capture root, reading and group journeys, API timing and JS cost. Never log cookies, authorization codes, tokens or personal response bodies. Record median/p75 and environment; instrument only coarse server phases without identifiers where needed.
2. Implement the approved welcome visual as a Server Component for logged-out `/`. Keep authenticated root and missing-person behavior intact. Scope CSS to the welcome component; local assets with explicit dimensions; use a plain anchor to `/auth/login`, not client-side prefetch. No added client JS for the landing. Avoid image-as-CSS background for critical branding; use font-display swap and at most a measured critical font preload. Inspect font bytes and subset/WOFF2 only if useful and licensing permits. Keep session-sensitive HTML private. A session-aware root is not automatically a static CDN hit. Measure before introducing a separate public route or deeper module split.
3. Verify auth regressions, performance and responsive presentation; independent review then draft-PR closeout per approved named actions. Record authenticated measurement as blocked if no authorized test session is available; never describe mocked results as real app performance.

## Redirect decision

With a public welcome page, initial `/` returns content instead of redirecting. The button goes directly to the SDK `/auth/login` endpoint; that endpoint already redirects to Auth0. This changes the user journey and improves potential first content; it does not remove Auth0 latency or prove faster end-to-end authentication. Do not promise the suggested 0.2–0.5 s savings.

If the user instead chooses automatic login, evaluate `auth0.startInteractiveLogin()` through a supported response-producing handler/proxy integration, preserving state/nonce/PKCE and all transaction Set-Cookie headers. Confirm behavior against installed v4.28.0 before implementation; do not call it blindly from a Server Component or manually concatenate an `/authorize` URL. Do not prefetch state-bearing auth endpoints. Preserve no-store on auth redirects/callbacks. This is an alternative to the welcome route, not a cumulative optimization.

## Auth0 follow-up, separate scope

Inspect the actual Universal Login template and resource waterfall read-only. Determine which font/image is above the fold and whether template controls allow a preload or early HTML image with dimensions. Compare same-origin/custom-domain serving against the current host; verify CSP, content type and cache headers. Use preconnect only for a measured necessary cross-origin request. Do not inline images or preload all fonts speculatively. Export a rollback copy and inventory all clients sharing the template before proposing a change. Tenant writes require a separate concrete plan; app changes alone cannot repair this page.

## Done criteria and validation

- Logged-out root returns 200 with heading and login link; no personal data or Rock/profile queries. Authenticated root still shows the Bible app; missing-person flow unchanged.
- `/auth/login` produces SDK transaction cookies and no-store redirect; callback, logout, denied-login, expired session, concurrent login tabs and join/admin return paths pass. External return destinations remain rejected/normalized by the established SDK configuration.
- Check at 390×844 and 1440×1000, keyboard navigation, 200% zoom, no horizontal overflow, contrast >=4.5:1 for body copy and visible focus. Button usable with JS disabled. Explicit image dimensions prevent shifts.
- Run `npm run lint`, `npm test`, `npm run build`; add focused integration coverage for guest/authenticated branch and OAuth regressions rather than snapshotting markup. Save outputs and browser evidence.
- Proposed budgets on a documented mid-tier mobile/4G profile: landing p75 LCP <=2.5 s, CLS <=0.1, zero incremental landing client JS. Aim for >=30% earlier first content versus a fresh equivalent baseline. Report failed targets honestly; do not substitute localhost timings. Auth0 click-to-form must not materially regress (>10% median over paired samples); load event is diagnostic, not the primary goal.

## GOAL contract for a future approved implementation

```yaml
goal: Deliver the approved public welcome page and measured entry performance improvements.
done_criteria: [guest_200, authenticated_root_preserved, oauth_regressions_pass, responsive_accessible, checks_pass, paired_measurements_reported]
blast_radius: This app repository and its preview deployment only; no shared Auth0 tenant or Rock writes.
non_goals: [new_credential_form, auth_provider_migration, public_personal_data, oauth_redirect_caching, post_login_rewrite, production_deploy]
milestones:
  - baseline_recorded
  - landing_and_regressions_verified
  - independent_review_and_preview_handoff
named_actions:
  - Create an isolated branch and plan-only draft PR after approval; exclude existing unrelated work.
  - Run preview deployment only after verifying project target and preview environment configuration.
  - Report reviewed preview and evidence; do not merge or deploy production under this plan.
```

Routing: one Codex executor, gpt-5.6-luna high, owns all three tasks because the core work is session/server behavior with a supplied visual. Independent Codex reviewer gpt-5.6-luna xhigh reviews auth and evidence; two express rounds maximum. No task workers needed. Planner prepares this visual and plan inline: delegation would buy design alternatives, but this is a single reviewable direction with shared entry-flow reasoning. Planning is not code approval. Reprobe quota immediately before dispatch; load execution/closeout skills then. User scope is visual plus planning; no implementation dispatch, PR, tenant edit or deploy occurs now.

Self-review: separated app and tenant ownership; preserved audience/claims/session behavior; avoided unsupported cache promises; made timing uncertainty explicit; kept pre-existing dirty files outside scope. Approval must resolve public welcome versus Auth0 redesign before locking the goal. Implementation plan approval is required by auto-office before dispatch; approval authorizes only the named preview actions, not production.

Sources: local Next.js page guide `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md`; current Auth0 SDK examples fetched via Context7 on 2026-09-09: https://github.com/auth0/nextjs-auth0/blob/main/EXAMPLES.md (programmatic login and returnTo). Installed-version verification remains an implementation prerequisite.

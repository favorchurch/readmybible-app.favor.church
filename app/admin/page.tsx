import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getSessionContext } from "@/lib/session";
import { resolveAdminScope, resolveScopeRole } from "@/lib/admin/access";
import { GLOBAL_ROOT_SECTION_ID } from "@/lib/rock/hierarchy-constants";
import { loadSectionSubtree } from "@/lib/rock/hierarchy";
import { loadAdminStats } from "@/lib/admin/stats";
import { HierarchyChart } from "@/app/admin/HierarchyChart";
import { SectionTree } from "@/app/admin/SectionTree";
import "@/app/admin/admin.css";

export const metadata: Metadata = {
  title: "Read My Bible: Connect Group progress",
};

/** Oxford-comma-joined list: "A", "A and B", "A, B, and C". */
function formatNameList(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

export default async function AdminPage(props: {
  searchParams?: Promise<{ test?: string; scope?: string }>;
}) {
  const session = await getSessionContext();
  const params = props.searchParams ? await props.searchParams : {};
  const isDev = process.env.NODE_ENV !== "production";
  const isTest = (isDev && (params.test === "1" || params.scope !== undefined)) || (params.test === "1" && session.status === "ok");

  if (session.status === "logged-out" && !isDev) {
    redirect("/auth/login?returnTo=%2Fadmin");
  }
  if (session.status === "not-found-in-rock" && !isDev) {
    redirect("/not-found-in-rock");
  }

  let scope = resolveAdminScope(session);

  // In development / test mode, allow simulating global, cluster, or region scopes
  if (isTest || (!scope && isDev)) {
    const requestedScope = params.scope ?? (scope?.kind === "sections" ? "sections" : "global");
    if (requestedScope === "cluster") {
      scope = { kind: "sections", rootIds: [23869] }; // Cluster // Cielo Pabalan & Peejay Pabalan
    } else if (requestedScope === "region") {
      scope = { kind: "sections", rootIds: [23870] }; // Region // Arnel Guiron & Belle Guiron
    } else if (requestedScope === "global" || !scope) {
      scope = { kind: "global", rootIds: [GLOBAL_ROOT_SECTION_ID] };
    }
  }

  if (!scope) {
    return (
      <main className="screen admin-screen frame">
        <div className="admin-header-row">
          <Link className="admin-back-link" href="/">
            ← Back to App
          </Link>
        </div>
        <section className="admin-no-access">
          <h1>This page is for section leaders.</h1>
          <p>
            If you lead a department, cluster, or region and can&apos;t get in, message the
            Tech Team.
          </p>
        </section>
      </main>
    );
  }

  const sections = await loadSectionSubtree(scope.rootIds);
  const { sections: statsSections, series } = await loadAdminStats(sections);
  const scopeRole = resolveScopeRole(scope, statsSections);
  const csvUrl = params.scope ? `/admin/export.csv?scope=${encodeURIComponent(params.scope)}` : "/admin/export.csv";

  return (
    <main className="screen admin-screen frame">
      <div className="admin-header-row">
        <Link className="admin-back-link" href="/">
          ← Back to App
        </Link>
      </div>

      {isTest && (
        <div className="admin-test-bar" role="region" aria-label="Admin test mode">
          <span className="admin-test-badge">Test mode</span>
          <span className="admin-test-label">Simulate view:</span>
          <div className="admin-test-links">
            <a
              href="/admin?test=1&scope=global"
              className={`admin-test-btn ${scopeRole === "Global Admin" ? "active" : ""}`}
            >
              Global Admin
            </a>
            <a
              href="/admin?test=1&scope=cluster"
              className={`admin-test-btn ${scopeRole === "Cluster Head" ? "active" : ""}`}
            >
              Cluster Head
            </a>
            <a
              href="/admin?test=1&scope=region"
              className={`admin-test-btn ${scopeRole === "Regional Leader" ? "active" : ""}`}
            >
              Regional Leader
            </a>
          </div>
        </div>
      )}

      <section className="page-title">
        <h1>Connect Group progress</h1>
      </section>

      <section className="admin-scope-card" data-section="admin-scope">
        <div className="admin-scope-header">
          <h2>Your view</h2>
          <span className="admin-role-badge">{scopeRole}</span>
        </div>
        {scope.kind === "global" ? (
          <p>You have access to the full Connect Group tree for this dashboard.</p>
        ) : (
          <>
            <p>
              You&apos;re seeing the Connect Groups under the section or sections you lead in
              Favor&apos;s records. This dashboard shows group totals for your scope only.
            </p>
            <p className="admin-scope-sections">
              Sections shown: {formatNameList(statsSections.map((s) => s.name))}.
            </p>
          </>
        )}
      </section>

      <div className="admin-chart-card">
        <h2>Daily progress since October 1</h2>
        <HierarchyChart series={series} />
      </div>

      <details className="admin-progress-note" data-section="admin-progress-note">
        <summary>How progress is calculated</summary>
        <p>
          Progress is completed chapter check-ins divided by active members x 28 chapters. This
          keeps group sizes comparable.
        </p>
      </details>

      <div className="admin-toolbar">
        <a className="admin-csv-link" href={csvUrl}>
          Download CSV
        </a>
      </div>

      <div className="admin-section-block">
        {statsSections.length === 0 ? (
          <p>No sections found for your scope.</p>
        ) : (
          statsSections.map((section) => <SectionTree key={section.id} section={section} />)
        )}
      </div>
    </main>
  );
}

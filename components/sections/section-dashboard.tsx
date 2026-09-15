import Link from "next/link";

import { AppBrandSplash } from "@/components/app-splash";
import type { AdminScope } from "@/lib/admin/access";
import { resolveScopeRole } from "@/lib/admin/access";
import { loadSectionSubtree } from "@/lib/rock/hierarchy";
import { loadAdminStats } from "@/lib/admin/stats";
import { HierarchyChart } from "@/components/sections/HierarchyChart";
import { HierarchyView } from "@/components/sections/hierarchy-view";
import "@/components/sections/admin.css";

/** Oxford-comma-joined list: "A", "A and B", "A, B, and C". */
function formatNameList(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

export type SectionDashboardProps = {
  scope: AdminScope;
  simulatedScope?: "global" | "cluster" | "region";
};

export default async function SectionDashboard({
  scope,
  simulatedScope,
}: SectionDashboardProps) {
  const sections = await loadSectionSubtree(scope.rootIds);
  const { sections: statsSections, series } = await loadAdminStats(sections);
  const scopeRole = resolveScopeRole(scope, statsSections);
  const csvUrl =
    simulatedScope !== undefined
      ? `/admin/export.csv?scope=${encodeURIComponent(simulatedScope)}`
      : "/admin/export.csv";

  return (
    <>
      {simulatedScope !== undefined && (
        <div className="admin-test-bar" role="region" aria-label="Admin test mode">
          <span className="admin-test-badge">Test mode</span>
          <span className="admin-test-label">Simulate view:</span>
          <div className="admin-test-links">
            <Link
              href="/?tab=leader&test=1&scope=global"
              className={`admin-test-btn ${scopeRole === "Global Admin" ? "active" : ""}`}
            >
              Global Admin
            </Link>
            <Link
              href="/?tab=leader&test=1&scope=cluster"
              className={`admin-test-btn ${scopeRole === "Cluster Head" ? "active" : ""}`}
            >
              Cluster Head
            </Link>
            <Link
              href="/?tab=leader&test=1&scope=region"
              className={`admin-test-btn ${scopeRole === "Regional Leader" ? "active" : ""}`}
            >
              Regional Leader
            </Link>
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

      <HierarchyView sections={statsSections} />
    </>
  );
}

export function SectionDashboardSkeleton() {
  return <AppBrandSplash />;
}

import Link from "next/link";

import { AppBrandSplash } from "@/components/app-splash";
import type { AdminScope } from "@/lib/admin/access";
import { resolveScopeRole } from "@/lib/admin/access";
import { loadSectionSubtree } from "@/lib/rock/hierarchy";
import { loadAdminStats } from "@/lib/admin/stats";
import { HierarchyChart } from "@/components/sections/HierarchyChart";
import { SectionTree } from "@/components/sections/SectionTree";
import { TestSimulationChip } from "@/components/sections/test-simulation-chip";
import { TEST_MODE_CAMPUSES, type TestModeCampus } from "@/components/test-mode/logic";
import { LadderTownView } from "@/components/ladder/town-view";
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
  simulatedScope?: "global" | "cluster" | "region" | "department";
  simulatedCampus?: TestModeCampus;
};

export default async function SectionDashboard({
  scope,
  simulatedScope,
  simulatedCampus,
}: SectionDashboardProps) {
  const sections = await loadSectionSubtree(scope.rootIds);
  const { sections: statsSections, series } = await loadAdminStats(sections);
  const scopeRole = resolveScopeRole(scope, statsSections);
  const csvParams = new URLSearchParams({ scope: simulatedScope ?? "", test: "1" });
  if (simulatedScope === "department" && simulatedCampus !== undefined) {
    csvParams.set("campus", TEST_MODE_CAMPUSES.find((campus) => campus.id === simulatedCampus)?.code ?? "MNL");
  }
  const csvUrl = simulatedScope !== undefined ? `/admin/export.csv?${csvParams.toString()}` : "/admin/export.csv";

  // Member-facing collapse to the umbrella "Leader" (issue #165); the ladder
  // never fabricates a Region/Cluster/Department-owned home, and reflects
  // navigation across scope only, so the town view's own viewer key stays
  // generic rather than naming an upstream tier.
  const ladderViewer = "leader";

  return (
    <>
      {simulatedScope !== undefined && <TestSimulationChip simulatedScope={simulatedScope} />}

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

      {/*
       * No page-title heading here on purpose: this renders inside
       * LeaderScreen, whose own <Header heading="Leader" /> already titles
       * the surface. A second "Connect Group progress" h1 was a leftover
       * from when this was its own standalone /admin page.
       *
       * Issue #151: the Leader tab and the home ladder are one surface for
       * upstream leaders, not two. This is the promotion of the town view
       * out of the dev-only /ladder prototype -- a Regional Leader's roots
       * have no child sections, so they land directly on their region's
       * Connect homes; a Cluster Head's roots do, so they land on the
       * region list first (regionsForRoot/LadderTownView, not a fixed
       * viewer name, decide which per jurisdiction).
       */}
      {/*
       * Keyed by the jurisdiction's root ids: LadderTownView owns internal
       * navigation state (which region is entered, which root is selected)
       * that must reset when the jurisdiction itself changes shape, not
       * just when a group inside it changes. Without this key, switching
       * Test Mode role from Regional to Cluster while staying on the Leader
       * tab left a Cluster Head landed already "inside" the prior Regional
       * Leader's region instead of on the plain region list (issue #117) --
       * found during this ticket's own hand-verification.
       */}
      <LadderTownView
        key={scope.rootIds.join(",")}
        roots={statsSections}
        unavailableGroupIds={[]}
        viewer={ladderViewer}
        ownGroupId={null}
      />

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
    </>
  );
}

export function SectionDashboardSkeleton() {
  return <AppBrandSplash />;
}

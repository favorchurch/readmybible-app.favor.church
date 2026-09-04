import type { Metadata } from "next";

import { redirect } from "next/navigation";

import { getSessionContext } from "@/lib/session";
import { resolveAdminScope } from "@/lib/admin/access";
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

export default async function AdminPage() {
  const session = await getSessionContext();
  if (session.status === "logged-out") {
    redirect("/auth/login?returnTo=%2Fadmin");
  }
  if (session.status === "not-found-in-rock") {
    redirect("/not-found-in-rock");
  }
  const scope = resolveAdminScope(session);

  if (!scope) {
    return (
      <main className="screen admin-screen frame">
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

  return (
    <main className="screen admin-screen frame">
      <section className="page-title">
        <h1>Connect Group progress</h1>
      </section>

      <section className="admin-scope-card" data-section="admin-scope">
        <h2>Your view</h2>
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
        <a className="admin-csv-link" href="/admin/export.csv">
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

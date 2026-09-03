import type { Metadata } from "next";

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

export default async function AdminPage() {
  const session = await getSessionContext();
  const scope = resolveAdminScope(session);

  if (!scope) {
    return (
      <main className="screen admin-screen">
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

  const scopeLine =
    scope.kind === "global"
      ? "Showing the entire Connect Groups tree."
      : `Showing ${statsSections.map((s) => s.name).join(", ")} and everything under it.`;

  return (
    <main className="screen admin-screen">
      <section className="page-title">
        <h1>Connect Group progress</h1>
        <p className="admin-scope-line">{scopeLine}</p>
      </section>

      <div className="admin-chart-card">
        <h2>Daily progress since October 1</h2>
        <HierarchyChart series={series} />
      </div>

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

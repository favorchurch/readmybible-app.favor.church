import { NextResponse } from "next/server";

import { getSessionContext } from "@/lib/session";
import { resolveAdminScope } from "@/lib/admin/access";
import { loadSectionSubtree } from "@/lib/rock/hierarchy";
import { loadAdminStats } from "@/lib/admin/stats";
import { flattenStatsRows, rowsToCsv } from "@/lib/admin/rows";
import { initialTestModeState, scopeForRole } from "@/components/test-mode/logic";

export async function GET(request: Request) {
  const session = await getSessionContext();
  let scope = resolveAdminScope(session);

  const url = new URL(request.url);
  const isDev = process.env.NODE_ENV !== "production";
  const testScope = url.searchParams.get("scope");
  const roleParam = url.searchParams.get("role") ?? url.searchParams.get("viewer");
  const campusParam = url.searchParams.get("campus");
  const allowsSimulation = isDev || (url.searchParams.get("test") === "1" && scope !== null);
  // Resolve exactly the way HomeData does (components/home-data.tsx), and in the
  // same order: an explicit role wins over `?scope=`, and a role with no admin
  // scope exports nothing. Reading `?scope=` on its own here meant
  // `?test=1&scope=global&role=member` rendered a member page while this
  // endpoint handed back the whole global subtree.
  if (allowsSimulation && (roleParam !== null || campusParam !== null || testScope !== null)) {
    // Pass the whole query, not a rebuilt subset: `initialTestModeState` already
    // encodes the precedence (`?role=` beats `?scope=`), so dropping `scope`
    // here would silently resolve a legacy export link to "member".
    const state = initialTestModeState(url.searchParams);
    const simulated = scopeForRole(state.role, state.campus);
    scope = simulated.isAdminScope && simulated.rootIds ? { kind: "sections", rootIds: simulated.rootIds } : null;
  }

  if (!scope) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const sections = await loadSectionSubtree(scope.rootIds);
  const { sections: statsSections } = await loadAdminStats(sections);
  const csv = rowsToCsv(flattenStatsRows(statsSections));

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="connect-group-progress.csv"',
    },
  });
}

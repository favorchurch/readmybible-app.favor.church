import { NextResponse } from "next/server";

import { getSessionContext } from "@/lib/session";
import { resolveAdminScope } from "@/lib/admin/access";
import { loadSectionSubtree } from "@/lib/rock/hierarchy";
import { loadAdminStats } from "@/lib/admin/stats";
import { flattenStatsRows, rowsToCsv } from "@/lib/admin/rows";
import { GLOBAL_ROOT_SECTION_ID } from "@/lib/rock/hierarchy-constants";
import { simulatedScopeFromQuery, type TestModeCampus } from "@/components/test-mode/logic";

function testModeCampusForId(campusId: number | null): TestModeCampus {
  return campusId === 2 || campusId === 3 ? campusId : 1;
}

export async function GET(request: Request) {
  const session = await getSessionContext();
  let scope = resolveAdminScope(session);

  const url = new URL(request.url);
  const isDev = process.env.NODE_ENV !== "production";
  const hasSimulationQuery =
    url.searchParams.get("role") !== null ||
    url.searchParams.get("viewer") !== null ||
    url.searchParams.get("campus") !== null ||
    url.searchParams.get("scope") !== null ||
    url.searchParams.get("test") === "1";
  if (hasSimulationQuery) {
    const isAuthorizedProductionSimulation = isDev || (url.searchParams.get("test") === "1" && scope !== null);
    if (!isAuthorizedProductionSimulation) {
      scope = null;
    } else if (url.searchParams.get("test") !== "1") {
      scope = null;
    } else {
      const simulated = simulatedScopeFromQuery(
        url.searchParams,
        testModeCampusForId(session.status === "ok" ? session.campusId : null),
      );
      scope = simulated
        ? simulated.kind === "global"
          ? { kind: "global", rootIds: [GLOBAL_ROOT_SECTION_ID] }
          : { kind: "sections", rootIds: simulated.rootIds }
        : null;
    }
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

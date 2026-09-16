import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSessionContext: vi.fn(),
  resolveAdminScope: vi.fn(),
  loadSectionSubtree: vi.fn(),
  loadAdminStats: vi.fn(),
  flattenStatsRows: vi.fn(),
  rowsToCsv: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ getSessionContext: mocks.getSessionContext }));
vi.mock("@/lib/admin/access", () => ({ resolveAdminScope: mocks.resolveAdminScope }));
vi.mock("@/lib/rock/hierarchy", () => ({ loadSectionSubtree: mocks.loadSectionSubtree }));
vi.mock("@/lib/admin/stats", () => ({ loadAdminStats: mocks.loadAdminStats }));
vi.mock("@/lib/admin/rows", () => ({
  flattenStatsRows: mocks.flattenStatsRows,
  rowsToCsv: mocks.rowsToCsv,
}));

import { GET } from "@/app/admin/export.csv/route";
import { CAMPUS_ROOT_SECTION_IDS } from "@/lib/rock/hierarchy-constants";

beforeEach(() => {
  // Call history has to be cleared, not just re-stubbed: the "exports nothing"
  // assertions below are `not.toHaveBeenCalled()`, which a previous test's call
  // would otherwise satisfy.
  vi.clearAllMocks();
  vi.stubEnv("NODE_ENV", "development");
  mocks.getSessionContext.mockResolvedValue({ status: "ok" });
  mocks.resolveAdminScope.mockReturnValue({ kind: "global", rootIds: [22464] });
  mocks.loadSectionSubtree.mockResolvedValue([]);
  mocks.loadAdminStats.mockResolvedValue({ sections: [] });
  mocks.flattenStatsRows.mockReturnValue([]);
  mocks.rowsToCsv.mockReturnValue("csv");
});

describe("simulated admin CSV scope", () => {
  it("exports the selected Department campus subtree", async () => {
    const response = await GET(new Request("https://example.test/admin/export.csv?scope=department&campus=BNE&test=1"));

    expect(response.status).toBe(200);
    expect(mocks.loadSectionSubtree).toHaveBeenCalledWith([CAMPUS_ROOT_SECTION_IDS[1]]);
  });

  // The endpoint used to read `?scope=` on its own, so a URL whose role says
  // "member" and whose scope says "global" rendered a member page while the CSV
  // handed back the entire global subtree. The role wins, exactly as it does in
  // HomeData, and a non-admin role exports nothing at all.
  it("refuses to export when the simulated role has no admin scope, even if ?scope= asks for global", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const response = await GET(
      new Request("https://example.test/admin/export.csv?test=1&scope=global&role=member"),
    );

    expect(response.status).toBe(403);
    expect(mocks.loadSectionSubtree).not.toHaveBeenCalled();
  });

  it("lets an explicit admin role override a conflicting ?scope=", async () => {
    const response = await GET(
      new Request("https://example.test/admin/export.csv?test=1&scope=global&role=department&campus=SEL"),
    );

    expect(response.status).toBe(200);
    expect(mocks.loadSectionSubtree).toHaveBeenCalledWith([CAMPUS_ROOT_SECTION_IDS[2]]);
  });

  it("treats the legacy ?scope=sections value as a real scope rather than falling through", async () => {
    const response = await GET(new Request("https://example.test/admin/export.csv?test=1&scope=sections"));

    expect(response.status).toBe(200);
    expect(mocks.loadSectionSubtree).toHaveBeenCalled();
  });
});

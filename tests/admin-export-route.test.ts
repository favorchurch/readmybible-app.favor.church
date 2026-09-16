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
});

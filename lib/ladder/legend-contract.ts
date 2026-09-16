export type LadderGroupLegendMember = {
  personId: number;
  name: string;
  readingDates: string[];
};

export type LadderGroupLegend =
  | {
      ok: true;
      todayLocal: string;
      members: LadderGroupLegendMember[];
    }
  | { ok: false; error: string };

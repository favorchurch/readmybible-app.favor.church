import { planEntryForDate } from "@/lib/plan";

export type NotebookPageId = "general" | string;

export type NotebookPageMeta = {
  id: NotebookPageId;
  title: string;
  subtitle?: string;
  isGeneral: boolean;
};

/**
 * Builds the canonical ordered list of all allowed notebook pages:
 * "general" plus every calendar date in the campaign (Oct 5 to Oct 30, 2026).
 * Dates outside this range (e.g. Oct 31, Nov 3) are never notebook pages.
 */
export function buildNotebookPages(): NotebookPageMeta[] {
  const pages: NotebookPageMeta[] = [
    {
      id: "general",
      title: "General",
      subtitle: "Personal Reflections & Prayers",
      isGeneral: true,
    },
  ];

  // Campaign dates: 2026-10-05 to 2026-10-30
  for (let day = 5; day <= 30; day++) {
    const dayStr = String(day).padStart(2, "0");
    const date = `2026-10-${dayStr}`;
    const planEntry = planEntryForDate(date);

    if (planEntry) {
      pages.push({
        id: date,
        title: `Day ${planEntry.day} · Oct ${day}`,
        subtitle: planEntry.title,
        isGeneral: false,
      });
    } else {
      // Review days (Oct 10-11, 17-18, 24-25)
      pages.push({
        id: date,
        title: `Oct ${day} · Review`,
        subtitle: "Review & Reflection",
        isGeneral: false,
      });
    }
  }

  return pages;
}

export const NOTEBOOK_PAGES = buildNotebookPages();

export function getPageMeta(pageId: string): NotebookPageMeta {
  const found = NOTEBOOK_PAGES.find((p) => p.id === pageId);
  if (found) return found;
  if (pageId === "general") {
    return { id: "general", title: "General", isGeneral: true };
  }
  return { id: pageId, title: pageId, isGeneral: false };
}

/**
 * Valid notebook pages: "general" plus the defined campaign-calendar dates.
 * No endless dated pages after the campaign ends -- driven off the same
 * `NOTEBOOK_PAGES` list the modal navigates, so the two can never drift.
 */
export function isValidNotebookPage(page: string): boolean {
  return page === "general" || NOTEBOOK_PAGES.some((p) => p.id === page);
}

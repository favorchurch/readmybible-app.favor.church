/**
 * The 28-day Matthew reading plan. Day n = October n, 2026 = Matthew chapter
 * n. See intent/GAME.md. `keyPassage` is a curated, well-known reference
 * within that chapter, used for the "quick verse" popup in the Today tab.
 */

export type PlanEntry = {
  day: number;
  chapter: number;
  date: string; // YYYY-MM-DD, October 2026
  keyPassage: string;
  title: string;
};

function octoberDate(day: number): string {
  return `2026-10-${String(day).padStart(2, "0")}`;
}

const KEY_PASSAGES: Array<{ keyPassage: string; title: string }> = [
  { keyPassage: "Matthew 1:20-21", title: "Jesus is born" },
  { keyPassage: "Matthew 2:1-2", title: "The wise men arrive" },
  { keyPassage: "Matthew 3:16-17", title: "Jesus is baptized" },
  { keyPassage: "Matthew 4:18-20", title: "The first disciples" },
  { keyPassage: "Matthew 5:3-12", title: "The Beatitudes" },
  { keyPassage: "Matthew 6:9-13", title: "The Lord's Prayer" },
  { keyPassage: "Matthew 7:24-27", title: "The wise and foolish builders" },
  { keyPassage: "Matthew 8:23-27", title: "Jesus calms the storm" },
  { keyPassage: "Matthew 9:35-38", title: "The harvest is plentiful" },
  { keyPassage: "Matthew 10:29-31", title: "Sent out with courage" },
  { keyPassage: "Matthew 11:28-30", title: "Come to me and rest" },
  { keyPassage: "Matthew 12:11-12", title: "Lord of the Sabbath" },
  { keyPassage: "Matthew 13:31-32", title: "The mustard seed" },
  { keyPassage: "Matthew 14:29-31", title: "Peter walks on water" },
  { keyPassage: "Matthew 15:28", title: "A mother's persistent faith" },
  { keyPassage: "Matthew 16:15-16", title: "Who do you say I am?" },
  { keyPassage: "Matthew 17:1-2", title: "The transfiguration" },
  { keyPassage: "Matthew 18:12-14", title: "The lost sheep" },
  { keyPassage: "Matthew 19:14", title: "Let the children come" },
  { keyPassage: "Matthew 20:26-28", title: "The greatest is a servant" },
  { keyPassage: "Matthew 21:9", title: "Jesus enters Jerusalem" },
  { keyPassage: "Matthew 22:37-39", title: "The greatest commandment" },
  { keyPassage: "Matthew 23:11-12", title: "Humility over pride" },
  { keyPassage: "Matthew 24:35", title: "His words will never pass away" },
  { keyPassage: "Matthew 25:35-36", title: "Whatever you did for the least of these" },
  { keyPassage: "Matthew 26:26-28", title: "The Last Supper" },
  { keyPassage: "Matthew 27:50-51", title: "Jesus dies on the cross" },
  { keyPassage: "Matthew 28:5-6", title: "He has risen" },
];

export const PLAN: PlanEntry[] = KEY_PASSAGES.map((entry, index) => ({
  day: index + 1,
  chapter: index + 1,
  date: octoberDate(index + 1),
  keyPassage: entry.keyPassage,
  title: entry.title,
}));

export function planEntryForChapter(chapter: number): PlanEntry | undefined {
  return PLAN.find((entry) => entry.chapter === chapter);
}

export function planEntryForDate(date: string): PlanEntry | undefined {
  return PLAN.find((entry) => entry.date === date);
}

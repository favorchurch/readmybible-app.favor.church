"use client";

/**
 * Daily cumulative ratio chart, one line per top-level child of the admin
 * scope. See intent/COPY.md "Admin" ("Daily progress since October 1") and
 * intent/SPEC.md "Admin dashboard".
 */
import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type ChartData,
} from "chart.js";
import { Line } from "react-chartjs-2";

import type { TopLevelSeries } from "@/lib/admin/stats";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

const LINE_COLORS = ["#d96c57", "#7b9caf", "#e7a72f", "#91a88b", "#9c84ab", "#172943"];

// Mirrors lib/admin/stats.ts's PLAN_START (a frozen literal, not expected to
// change) as a local value: importing the real binding here would pull that
// module's server-only DB loaders into this "use client" component's bundle.
const PLAN_START = "2026-10-01";

/**
 * True when every series has no on-or-after-launch data point (points
 * missing or all dated before the plan starts). Vacuously true for an empty
 * series list -- the caller below already returns its own empty-scope
 * message before reaching this check, so that case never renders from here.
 */
function isPreLaunchOnly(series: TopLevelSeries[]): boolean {
  return series.every((s) => s.points.length === 0 || s.points.every((p) => p.date < PLAN_START));
}

export function HierarchyChart({ series }: { series: TopLevelSeries[] }) {
  if (series.length === 0) {
    return (
      <p className="admin-chart-empty" data-section="admin-chart-empty">
        No groups to chart for this view.
      </p>
    );
  }
  if (isPreLaunchOnly(series)) {
    return (
      <p className="admin-chart-empty" data-section="admin-chart-empty">
        The chart starts filling in on October 1.
      </p>
    );
  }

  const labels = series[0].points.map((p) => p.date.slice(5));
  const data: ChartData<"line"> = {
    labels,
    datasets: series.map((s, i) => {
      const color = LINE_COLORS[i % LINE_COLORS.length];
      return {
        label: s.label,
        data: s.points.map((p) => Math.round(p.ratio * 1000) / 10),
        borderColor: color,
        backgroundColor: color,
        pointRadius: 0,
        borderWidth: 2,
        tension: 0.25,
      };
    }),
  };

  return (
    <div className="admin-chart">
      <Line
        data={data}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 12 } } },
          },
          scales: {
            y: {
              min: 0,
              max: 100,
              ticks: { callback: (value) => `${value}%` },
            },
          },
        }}
      />
    </div>
  );
}

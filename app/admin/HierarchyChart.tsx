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

export function HierarchyChart({ series }: { series: TopLevelSeries[] }) {
  if (series.length === 0 || series.every((s) => s.points.length === 0)) {
    return <p className="admin-chart-empty">No reading days in range yet.</p>;
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
            legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 11 } } },
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

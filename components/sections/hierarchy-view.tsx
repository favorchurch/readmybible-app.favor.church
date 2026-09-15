"use client";

import { useMemo, useState } from "react";

import type { SectionWithStats } from "@/lib/admin/stats";
import { SectionTree } from "@/components/sections/SectionTree";
import { collectGroups, LeadingConnects } from "@/components/sections/hierarchy-overview";

/**
 * The client shell around the Connect Group hierarchy: a title quick-filter
 * plus the dashboard-wide podium.
 *
 * Filtering prunes rather than flattens -- a section survives if any group at
 * or below it matches, and matching groups keep their place in the tree, so a
 * leader never loses the answer to "which cluster is this under?". Because
 * the pruned tree is what `SectionTree` renders, every stage chart and podium
 * inside it recomputes against the filtered set for free.
 */
function matches(name: string, query: string): boolean {
  return name.toLowerCase().includes(query);
}

/** Returns the section with non-matching groups and empty branches removed, or null. */
function pruneSection(section: SectionWithStats, query: string): SectionWithStats | null {
  // A section whose own title matches keeps its whole subtree: the leader
  // searched for the cluster, not for one group inside it.
  if (matches(section.name, query)) return section;
  const children = section.children
    .map((child) => pruneSection(child, query))
    .filter((child): child is SectionWithStats => child !== null);
  const groups = section.groups.filter((group) => matches(group.name, query));
  if (children.length === 0 && groups.length === 0) return null;
  return { ...section, children, groups };
}

export function HierarchyView({ sections }: { sections: SectionWithStats[] }) {
  const [query, setQuery] = useState("");
  const trimmed = query.trim().toLowerCase();

  const visible = useMemo(() => {
    if (trimmed === "") return sections;
    return sections
      .map((section) => pruneSection(section, trimmed))
      .filter((section): section is SectionWithStats => section !== null);
  }, [sections, trimmed]);

  const allGroups = useMemo(() => visible.flatMap(collectGroups), [visible]);

  return (
    <div className="admin-section-block" data-section="hierarchy">
      <LeadingConnects
        groups={allGroups}
        heading={trimmed === "" ? "LEADING CONNECTS" : "LEADING MATCHES"}
        label="Leading Connect Groups across this view"
      />

      <div className="hierarchy-filter">
        <label className="sr-only" htmlFor="hierarchy-filter-input">
          Filter Connect Groups by title
        </label>
        <input
          id="hierarchy-filter-input"
          type="search"
          className="hierarchy-filter-input"
          placeholder="Filter by title…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          autoComplete="off"
        />
        {trimmed !== "" && (
          <button type="button" className="hierarchy-filter-clear" onClick={() => setQuery("")}>
            Clear
          </button>
        )}
      </div>

      {sections.length === 0 ? (
        <p>No sections found for your scope.</p>
      ) : visible.length === 0 ? (
        <p className="gentle-note" data-section="hierarchy-no-match">
          No Connect Group matches “{query.trim()}”.
        </p>
      ) : (
        visible.map((section) => (
          <SectionTree
            key={section.id}
            section={section}
            forceOpen={trimmed !== ""}
            showPodium={visible.length > 1}
          />
        ))
      )}
    </div>
  );
}

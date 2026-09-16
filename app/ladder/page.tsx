/**
 * Home-ladder prototype surface. Dev-only: `isLadderPrototypeEnabled()`
 * returns false in a production build and this route 404s.
 *
 * The tree is read from Rock here, on the server, at request time -- nothing
 * about the congregation is committed to this (public) repository. The viewer
 * lives in the query string rather than client state, because switching
 * viewer means a different Rock subtree, which is a server fetch.
 *
 * See wayfinder map #110 for the decisions this renders.
 */
import { notFound } from "next/navigation";

import { LadderPrototype, type LadderVariant } from "@/components/ladder/ladder-prototype";
import { isLadderPrototypeEnabled } from "@/lib/ladder/dev-gate";
import { loadLadderTreeAs } from "@/lib/ladder/tree";
import { LADDER_VIEWERS, type LadderViewerKey } from "@/lib/ladder/tuning";

export const dynamic = "force-dynamic";

function viewerFrom(value: string | undefined): LadderViewerKey {
  return value && value in LADDER_VIEWERS ? (value as LadderViewerKey) : "regionalLeader";
}

function variantFrom(value: string | undefined): LadderVariant {
  return value === "states" || value === "stream" ? value : "navigator";
}

function visitKeyFrom(value: string | undefined): `group:${number}` | null {
  return value && /^group:\d+$/.test(value) ? (value as `group:${number}`) : null;
}

export default async function LadderPage(props: {
  searchParams?: Promise<{ viewer?: string; variant?: string; home?: string }>;
}) {
  if (!isLadderPrototypeEnabled()) notFound();

  const searchParams = props.searchParams ? await props.searchParams : {};
  const viewer = viewerFrom(searchParams.viewer);
  const variant = variantFrom(searchParams.variant);
  const { sections, unavailableGroupIds } = await loadLadderTreeAs(viewer);

  return (
    <LadderPrototype
      roots={sections}
      unavailableGroupIds={unavailableGroupIds}
      viewer={viewer}
      viewers={Object.entries(LADDER_VIEWERS).map(([key, value]) => ({ key, label: value.label }))}
      initialVisitedKey={visitKeyFrom(searchParams.home)}
      initialVariant={variant}
    />
  );
}

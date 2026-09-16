"use client";

/**
 * Client shell for the ladder prototype. The tree arrives as props from the
 * server page -- switching viewer means a different Rock subtree, so it is a
 * navigation, not local state.
 */
import { useRouter } from "next/navigation";
import { useState } from "react";

import { LadderTownView } from "@/components/ladder/town-view";
import type { SectionWithStats } from "@/lib/admin/stats";

import "./ladder.css";

export type LadderVariant = "navigator" | "states" | "stream";

const VARIANTS: Array<{ key: LadderVariant; label: string }> = [
  { key: "navigator", label: "Connect homes" },
  { key: "states", label: "Empty + zero states" },
  { key: "stream", label: "Base → scope bonus" },
];

export function LadderPrototype({
  roots,
  unavailableGroupIds,
  viewer,
  viewers,
  initialVisitedKey,
  initialVariant,
}: {
  roots: SectionWithStats[];
  unavailableGroupIds: number[];
  viewer: string;
  viewers: Array<{ key: string; label: string }>;
  initialVisitedKey?: `group:${number}` | null;
  initialVariant: LadderVariant;
}) {
  const router = useRouter();
  const [variant, setVariant] = useState(initialVariant);
  const [currentVisitedKey, setCurrentVisitedKey] = useState(initialVisitedKey ?? null);

  function changeVariant(next: LadderVariant) {
    const url = new URL(window.location.href);
    url.searchParams.set("variant", next);
    url.searchParams.delete("home");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    setVariant(next);
    setCurrentVisitedKey(null);
  }

  return (
    <main className="ladder-page">
      <header className="ladder-header">
        <p className="ladder-eyebrow">Prototype · Leader + home ladder</p>
        <h1>Visit the home you&apos;re authorized to see</h1>
        <p className="ladder-lede">
          One Leader surface: navigate your jurisdiction, then enter Connect homes. Structure is
          read from Rock at request time; ratios are synthetic for this decision prototype.
        </p>
      </header>

      <section className="ladder-contract" aria-label="Prototype contract">
        <span className="ladder-contract-mark">01</span>
        <p>
          Upstream leaders do not own a Region, Cluster, or Department home. They visit authorized
          Connect homes; section-only users stay on Leader.
        </p>
      </section>

      {variant === "states" ? (
        <LadderStateLab />
      ) : variant === "stream" ? (
        <LadderStreamStory />
      ) : (
        <LadderTownView
          key={viewer}
          roots={roots}
          unavailableGroupIds={unavailableGroupIds}
          viewer={viewer}
          viewers={viewers}
          initialVisitedKey={currentVisitedKey}
          onChangeViewer={(next) => {
            setCurrentVisitedKey(null);
            router.push(`/ladder?viewer=${next}`);
          }}
        />
      )}

      <nav className="ladder-variant-switcher" aria-label="Prototype variations">
        <button type="button" onClick={() => changeVariant(VARIANTS[(VARIANTS.findIndex((item) => item.key === variant) + VARIANTS.length - 1) % VARIANTS.length].key)} aria-label="Previous prototype">
          ←
        </button>
        <span><b>Prototype</b> · {VARIANTS.find((item) => item.key === variant)?.label}</span>
        <button type="button" onClick={() => changeVariant(VARIANTS[(VARIANTS.findIndex((item) => item.key === variant) + 1) % VARIANTS.length].key)} aria-label="Next prototype">
          →
        </button>
      </nav>
    </main>
  );
}

function LadderStateLab() {
  return (
    <section className="ladder-lab" aria-labelledby="ladder-lab-title">
      <div className="ladder-lab-heading">
        <p className="ladder-eyebrow">Prototype · state lab</p>
        <h2 id="ladder-lab-title">When the home has nothing to show</h2>
        <p>Three states, one recovery rule: the viewer can always leave.</p>
      </div>
      <div className="ladder-state-grid">
        <article className="ladder-state-sample">
          <span className="ladder-state-icon">∅</span>
          <p className="ladder-state-kicker">Empty structure</p>
          <h3>No Connect homes yet</h3>
          <p>This jurisdiction has no Connect homes beneath it.</p>
          <button type="button" className="ladder-return">Return to Leader</button>
        </article>
        <article className="ladder-state-sample">
          <span className="ladder-state-icon">⚪</span>
          <p className="ladder-state-kicker">Genuine zero</p>
          <h3>0/3 homes on track</h3>
          <p>The homes exist, but no one has started yet.</p>
          <span className="ladder-badge">⚪ 0/3</span>
        </article>
        <article className="ladder-state-sample">
          <span className="ladder-state-icon">…</span>
          <p className="ladder-state-kicker">Still resolving</p>
          <h3>Progress unavailable</h3>
          <p>Keep the base view visible while scope contributions arrive.</p>
          <span className="ladder-badge">⚪ —/—</span>
        </article>
      </div>
    </section>
  );
}

function LadderStreamStory() {
  return (
    <section className="ladder-stream" aria-labelledby="ladder-stream-title">
      <div className="ladder-stream-copy">
        <p className="ladder-eyebrow">Prototype · progressive loading</p>
        <h2 id="ladder-stream-title">Let the home move upward as context arrives</h2>
        <p>
          The first paint is useful on its own. A bounded scope bonus can upgrade the home later,
          but it can never make the base view worse.
        </p>
      </div>
      <ol className="ladder-stream-steps">
        <li className="is-current"><span>01</span><div><strong>Base Connect view</strong><small>Paint immediately · provisional</small></div></li>
        <li><span>02</span><div><strong>Scope contributions</strong><small>Resolve upward in the background</small></div></li>
        <li><span>03</span><div><strong>Upward-only upgrade</strong><small>Settle the home when bonuses land</small></div></li>
      </ol>
      <div className="ladder-stream-rule">
        <span>Never downgrade</span>
        <span>Never publish the points formula here</span>
      </div>
    </section>
  );
}

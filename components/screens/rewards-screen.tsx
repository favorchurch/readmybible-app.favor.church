"use client";

import { useEffect, useState } from "react";

import type { UserProfile } from "@/components/avatar";
import { Header } from "@/components/screens/header";
import type { TodayState } from "@/components/use-today";
import { medals as medalsReached, nextMedal } from "@/lib/game";

const REWARD_META: Record<number, { tone: string; kind: "medal" | "trophy"; shape: string }> = {
  3: { tone: "bronze", kind: "medal", shape: "small" },
  7: { tone: "silver", kind: "medal", shape: "medium" },
  14: { tone: "gold", kind: "medal", shape: "star" },
  21: { tone: "violet", kind: "trophy", shape: "medium" },
  28: { tone: "navy", kind: "trophy", shape: "large" },
};

export const REWARD_TITLES: Record<number, string> = {
  3: "First steps",
  7: "One week in",
  14: "Halfway there",
  21: "Three weeks strong",
  28: "All of Matthew",
};

const REWARD_THRESHOLDS = [3, 7, 14, 21, 28];

export function RewardsScreen({
  profile,
  chapters,
  onEditProfile,
  today,
}: {
  profile: UserProfile;
  chapters: number;
  onEditProfile: () => void;
  today: TodayState;
}) {
  const isPreLaunch = today.displayPhase === "pre-launch";

  const earned = medalsReached(chapters);
  const next = nextMedal(chapters);

  const [shineEarned] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const key = "rmb:medals-seen";
      const seenRaw = sessionStorage.getItem(key);
      const seen = seenRaw !== null ? Number(seenRaw) : 0;
      return earned.length > seen;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!shineEarned) return;
    try {
      sessionStorage.setItem("rmb:medals-seen", String(earned.length));
    } catch {
      // Ignore storage restrictions in private browsing
    }
  }, [shineEarned, earned.length]);

  return (
    <main className="screen rewards-screen frame">
      <Header heading="Rewards" profile={profile} onEditProfile={onEditProfile} />
      <section className="page-title">
        {isPreLaunch ? (
          <>
            <p className="eyebrow">STARTS OCTOBER 1</p>
            <h1>Rewards</h1>
            <p className="rewards-sub">
              Rewards celebrate your own consistency. Your group&apos;s home is a separate journey.
            </p>
          </>
        ) : (
          <>
            <h1>Rewards</h1>
            <p className="rewards-sub">Rewards celebrate consistency, not comparison.</p>
          </>
        )}
      </section>

      <section className="shelf-cabinet" data-section="rewards-shelf">
        <div className="shelf-stage">
          <div className="shelf-row one">
            {REWARD_THRESHOLDS.slice(0, 3).map((threshold) => (
              <Reward
                key={threshold}
                threshold={threshold}
                earned={earned.includes(threshold)}
                shine={shineEarned && earned.includes(threshold)}
                isPreLaunch={isPreLaunch}
              />
            ))}
          </div>
          <div className="wood-shelf middle-shelf" />
          <div className="shelf-row two">
            {REWARD_THRESHOLDS.slice(3).map((threshold) => (
              <Reward
                key={threshold}
                threshold={threshold}
                earned={earned.includes(threshold)}
                shine={shineEarned && earned.includes(threshold)}
                isPreLaunch={isPreLaunch}
              />
            ))}
          </div>
          <div className="wood-shelf bottom-shelf" />
        </div>
      </section>

      {!isPreLaunch && next !== null && (
        <section className="next-reward">
          <div className="mini-medal gold">◇</div>
          <div>
            <p className="eyebrow">NEXT REWARD</p>
            <h2>{REWARD_TITLES[next]}</h2>
            <span>{next - chapters} more chapters</span>
          </div>
          <strong>
            {chapters} / {next}
          </strong>
        </section>
      )}
    </main>
  );
}

function Reward({
  threshold,
  earned,
  shine,
  isPreLaunch,
}: {
  threshold: number;
  earned: boolean;
  shine: boolean;
  isPreLaunch: boolean;
}) {
  const meta = REWARD_META[threshold];
  const title = REWARD_TITLES[threshold];

  const stateClass = earned ? "earned" : isPreLaunch ? "pre-launch-silhouette" : "unearned";
  const shineClass = shine ? "earned-shine" : "";

  return (
    <article className={`reward ${stateClass} ${shineClass}`}>
      {meta.kind === "trophy" ? (
        <div className={`shelf-award trophy-award ${meta.tone} trophy-${meta.shape}`}>
          <span className="trophy-cup">★</span>
          <i />
          <b />
          <em>{threshold}</em>
        </div>
      ) : (
        <div className={`shelf-award medal-award ${meta.tone} medal-${meta.shape}`}>
          <i className="medal-ribbons" />
          <b className="medal-face">{meta.shape === "star" ? "★" : "✦"}</b>
          <span>{threshold}</span>
        </div>
      )}
      <strong>{title}</strong>
      <span>{earned ? "Earned" : `${threshold} chapters`}</span>
    </article>
  );
}

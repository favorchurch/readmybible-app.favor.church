import type { UserProfile } from "@/components/avatar";
import { Header } from "@/components/screens/header";
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

export function RewardsScreen({ profile, chapters, onEditProfile }: { profile: UserProfile; chapters: number; onEditProfile: () => void }) {
  const earned = medalsReached(chapters);
  const next = nextMedal(chapters);
  return (
    <main className="screen rewards-screen frame">
      <Header heading="Rewards" profile={profile} onEditProfile={onEditProfile} />
      <section className="page-title">
        <h1>Rewards</h1>
        <p>Rewards celebrate consistency, not comparison.</p>
      </section>
      <section className="shelf-cabinet">
        <div className="shelf-row">
          {REWARD_THRESHOLDS.slice(0, 3).map((threshold) => (
            <Reward key={threshold} threshold={threshold} earned={earned.includes(threshold)} />
          ))}
        </div>
        <div className="wood-shelf" />
        <div className="shelf-row two">
          {REWARD_THRESHOLDS.slice(3).map((threshold) => (
            <Reward key={threshold} threshold={threshold} earned={earned.includes(threshold)} />
          ))}
        </div>
        <div className="wood-shelf" />
      </section>
      {next !== null && (
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

function Reward({ threshold, earned }: { threshold: number; earned: boolean }) {
  const meta = REWARD_META[threshold];
  const title = REWARD_TITLES[threshold];
  return (
    <article className={`reward ${earned ? "earned" : "locked"}`}>
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

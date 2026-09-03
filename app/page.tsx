"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Tab = "today" | "connect" | "rewards" | "progress";

type HairStyle = "crop" | "curls" | "bob" | "bun" | "bald" | "waves" | "graybun" | "pixie" | "long-curly" | "medium-curly" | "short-curly" | "long-straight" | "medium-straight" | "short-straight" | "long-wavy" | "medium-wavy" | "short-wavy" | "extra-short" | "ponytail";
type SkinTone = "light" | "golden" | "warm" | "deep";
type FaceShape = "narrow" | "normal" | "round";
type Gender = "male" | "female";
type FacialHair = "none" | "mustache" | "stubble" | "beard";
type GlassesStyle = "none" | "round" | "wayfarer";
type UserProfile = {
  displayName: string;
  gender: Gender;
  face: FaceShape;
  hair: HairStyle;
  glasses: GlassesStyle;
  facialHair: FacialHair;
  hairColor: string;
  skinColor: string;
  shirtColor: string;
  backgroundColor: string;
};

const defaultProfile: UserProfile = {
  displayName: "Mia",
  gender: "female",
  face: "normal",
  hair: "short-straight",
  glasses: "none",
  facialHair: "none",
  hairColor: "#172943",
  skinColor: "#b97856",
  shirtColor: "#d96c57",
  backgroundColor: "#efd8bd",
};

const members = [
  { name: "Mia", gender: "female", color: "coral", skin: "warm", hair: "bob", glasses: "none", facialHair: "none", read: true, coins: 120 },
  { name: "Noah", gender: "male", color: "blue", skin: "golden", hair: "crop", glasses: "none", facialHair: "none", read: true, coins: 110 },
  { name: "Bea", gender: "female", color: "gold", skin: "deep", hair: "waves", glasses: "none", facialHair: "none", read: true, coins: 100 },
  { name: "Sam", gender: "male", color: "sage", skin: "light", hair: "crop", glasses: "wayfarer", facialHair: "beard", read: true, coins: 90 },
  { name: "Luis", gender: "male", color: "violet", skin: "warm", hair: "bald", glasses: "none", facialHair: "beard", read: true, coins: 90 },
  { name: "Jo", gender: "female", color: "coral", skin: "golden", hair: "bun", glasses: "none", facialHair: "none", read: true, coins: 80 },
  { name: "Ari", gender: "female", color: "blue", skin: "light", hair: "curls", glasses: "none", facialHair: "none", read: true, coins: 70 },
  { name: "Kim", gender: "female", color: "gold", skin: "warm", hair: "graybun", glasses: "round", facialHair: "none", read: true, coins: 60 },
  { name: "Ella", gender: "female", color: "sage", skin: "deep", hair: "curls", glasses: "none", facialHair: "none", read: false, coins: 60 },
  { name: "Ian", gender: "male", color: "violet", skin: "golden", hair: "waves", glasses: "none", facialHair: "stubble", read: false, coins: 50 },
  { name: "May", gender: "female", color: "coral", skin: "light", hair: "graybun", glasses: "round", facialHair: "none", read: false, coins: 40 },
] satisfies Array<{ name: string; gender: Gender; color: string; skin: SkinTone; hair: HairStyle; glasses: GlassesStyle; facialHair: FacialHair; read: boolean; coins: number }>;

const navItems: { id: Tab; label: string; icon: "home" | "people" | "medal" | "progress" }[] = [
  { id: "today", label: "Today", icon: "home" },
  { id: "connect", label: "Connect", icon: "people" },
  { id: "rewards", label: "Rewards", icon: "medal" },
  { id: "progress", label: "Progress", icon: "progress" },
];

function NavIcon({ icon }: { icon: "home" | "people" | "medal" | "progress" }) {
  if (icon === "people") {
    return <span className="nav-icon nav-people" aria-hidden="true"><i /><i /><i /></span>;
  }

  if (icon === "medal") {
    return <span className="nav-icon nav-medal" aria-hidden="true"><i /><b>★</b></span>;
  }

  return <span className="nav-icon nav-symbol" aria-hidden="true">{icon === "home" ? "⌂" : "◔"}</span>;
}

function Avatar({ color, gender = "female", skin = "warm", hair = "crop", glasses = "none", facialHair = "none", face = "normal", hairColor, skinColor, shirtColor, backgroundColor, small = false, preview = false }: { color: string; gender?: Gender; skin?: SkinTone; hair?: HairStyle; glasses?: GlassesStyle; facialHair?: FacialHair; face?: FaceShape; hairColor?: string; skinColor?: string; shirtColor?: string; backgroundColor?: string; small?: boolean; preview?: boolean }) {
  const customStyle = {
    ...(hairColor ? { "--hair": hairColor } : {}),
    ...(skinColor ? { "--skin": skinColor } : {}),
    ...(shirtColor ? { "--avatar-color": shirtColor } : {}),
    ...(backgroundColor ? { "--avatar-bg": backgroundColor } : {}),
  } as React.CSSProperties;
  return (
    <span style={customStyle} className={`avatar avatar-${color} gender-${gender} skin-${skin} hair-${hair} face-${face} glasses-${glasses} facial-${facialHair} ${small ? "avatar-small" : ""} ${preview ? "avatar-preview" : ""}`} aria-hidden="true">
      <span className="avatar-back-hair" />
      <span className="avatar-ears" />
      <span className="avatar-face"><i /><i /><b /></span>
      <span className="avatar-hair" />
      <span className="avatar-brows" />
      {glasses !== "none" && <span className={`avatar-glasses glasses-${glasses}`}><i /><i /><b /></span>}
      {gender === "male" && facialHair !== "none" && <span className={`avatar-facial-hair facial-${facialHair}`} />}
      <span className="avatar-body" />
    </span>
  );
}

function Brand() {
  return (
    <div className="brand" aria-label="Read My Bible">
      <span>READ</span><span>MY</span><span>BIBLE</span>
    </div>
  );
}

function ProgressBar({ value, max, pale = false }: { value: number; max: number; pale?: boolean }) {
  const width = Math.min(100, Math.round((value / max) * 100));
  return <div className={`progress-track ${pale ? "pale" : ""}`} aria-label={`${value} of ${max}`}><span style={{ width: `${width}%` }} /></div>;
}

function HomeIllustration({ completed = false }: { completed?: boolean }) {
  return <RotatableHome stage={2} completed={completed} compact />;
}

const homeStages = [
  { name: "Tent", className: "tent", note: "A humble beginning" },
  { name: "Trailer", className: "trailer", note: "Making room" },
  { name: "Cabin", className: "cabin3d", note: "Current home" },
  { name: "Apartment", className: "apartment", note: "Next upgrade" },
  { name: "House", className: "house3d", note: "Growing together" },
  { name: "Mansion", className: "mansion", note: "The final home" },
];

function RotatableHome({ stage, completed, compact = false }: { stage: number; completed: boolean; compact?: boolean }) {
  const [rotation, setRotation] = useState(-28);
  const drag = useRef<{ x: number; rotation: number } | null>(null);
  const selected = homeStages[stage];

  function pointerDown(event: React.PointerEvent<HTMLDivElement>) {
    drag.current = { x: event.clientX, rotation };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function pointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    setRotation(drag.current.rotation + (event.clientX - drag.current.x) * .55);
  }

  function keyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowLeft") setRotation((value) => value - 18);
    if (event.key === "ArrowRight") setRotation((value) => value + 18);
  }

  return (
    <div className={`home3d-wrap ${compact ? "compact" : ""}`}>
      <div className="home3d-sky"><i /><i /><span /></div>
      {/* drag/keyboard-rotatable 3D preview, not a semantic control */}
      {/* eslint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */}
      <div
        className="home3d-viewport"
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={() => { drag.current = null; }}
        onPointerCancel={() => { drag.current = null; }}
        onKeyDown={keyDown}
        role="img"
        tabIndex={0}
        aria-label={`Interactive 3D ${selected.name}. Drag, swipe, or use arrow keys to rotate.`}
      >
      {/* eslint-enable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */}
        <div className="home3d-turntable" style={{ transform: `rotateX(-9deg) rotateY(${rotation}deg)` }}>
          <div className="home3d-ground"><span className="path3d" /><span className="shrub shrub-one" /><span className="shrub shrub-two" /></div>
          <div className={`home3d-model ${selected.className}`}>
            <div className="building-face face-front">
              <div className="window3d window-left"><i /></div><div className="door3d"><i /></div><div className="window3d window-right"><i /></div>
              <div className="upper-windows"><span /><span /><span /></div>
            </div>
            <div className="building-face face-back" />
            <div className="building-face face-left"><span className="side-window" /></div>
            <div className="building-face face-right"><span className="side-window" /></div>
            <div className="building-face face-top" />
            <div className="roof3d"><span className="roof-front" /><span className="roof-back" /></div>
            <div className="chimney3d"><i /><b /></div>
            <div className="balcony3d"><span /><i /></div>
            <div className="tent-detail">
              <span className="tent-gable tent-gable-front" /><span className="tent-gable tent-gable-back" />
              <span className="tent-slope tent-slope-left" /><span className="tent-slope tent-slope-right" />
              <i className="tent-flap" />
            </div>
            <div className="trailer-detail">
              <span className="trailer-stripe trailer-stripe-near" /><span className="trailer-stripe trailer-stripe-far" /><span className="trailer-hitch" />
              <i className="wheel wheel-near-left" /><i className="wheel wheel-near-right" />
              <i className="wheel wheel-far-left" /><i className="wheel wheel-far-right" />
            </div>
            <div className="cabin-detail">
              <span className="cabin-gable cabin-gable-front" /><span className="cabin-gable cabin-gable-back" />
              <span className="cabin-roof-plane cabin-roof-left" /><span className="cabin-roof-plane cabin-roof-right" />
            </div>
            <div className="apartment-detail"><span /><span /><span /></div>
            <div className="house-detail"><span className="garage" /><span className="porch" /></div>
            <div className="mansion-detail"><span /><span /><span /><span /></div>
          </div>
        </div>
      </div>
      <div className="rotate-hint"><span>↔</span> Drag to rotate 360° <button onClick={() => setRotation(-28)}>Reset view</button></div>
      {completed && stage === 2 && <div className="home3d-complete">✦ 10 coins added</div>}
    </div>
  );
}

function Header({ name, profile, onEditProfile }: { name?: string; profile: UserProfile; onEditProfile: () => void }) {
  const heading = name ?? `Good morning, ${profile.displayName}`;
  return (
    <header className="topbar">
      <Brand />
      <button className="header-person" onClick={onEditProfile} aria-label="Edit your profile and avatar"><span>{heading}<small>Edit profile</small></span><Avatar color="coral" gender={profile.gender} hair={profile.hair} glasses={profile.glasses} facialHair={profile.facialHair} face={profile.face} hairColor={profile.hairColor} skinColor={profile.skinColor} shirtColor={profile.shirtColor} backgroundColor={profile.backgroundColor} small /></button>
    </header>
  );
}

function TodayScreen({ completed, caughtUp, onStart, groupCoins, profile, onEditProfile }: { completed: boolean; caughtUp: boolean; onStart: (chapter: number) => void; groupCoins: number; profile: UserProfile; onEditProfile: () => void }) {
  return (
    <main className="screen today-screen">
      <Header profile={profile} onEditProfile={onEditProfile} />
      <section className="hero-copy">
        <p className="eyebrow">DAY 8 OF 28</p>
        <h1>{completed ? "You made space for the Word today." : "Make space for the Word today."}</h1>
        <p>{completed ? "Matthew 8 is complete. Your reading is already helping your Connect build together." : "Twelve people. Different places. One chapter."}</p>
      </section>

      <section className={`reading-card ${completed ? "is-complete" : ""}`}>
        <div className="reading-topline"><span>{completed ? "TODAY’S READING · COMPLETE" : "TODAY’S READING"}</span><span className="streak">● 6 day streak</span></div>
        <div className="reading-main">
          <div><span className="book-label">GOSPEL OF</span><h2>Matthew 8</h2><p>Faith in the middle of the storm</p></div>
          <div className="chapter-mark">08</div>
        </div>
        <button className="primary-button today-reading-button" onClick={() => onStart(8)}>
          <strong>{completed ? "✓ Read again" : "Read today’s chapter"}</strong>
          <span className="button-arrow" aria-hidden="true">→</span>
        </button>
      </section>

      <section className={`catchup-card ${caughtUp ? "is-complete" : ""}`}>
        <div className="catchup-mark">{caughtUp ? "✓" : "07"}</div>
        <div className="catchup-copy">
          <p className="eyebrow">{caughtUp ? "CAUGHT UP" : "MISSED YESTERDAY"}</p>
          <h2>{caughtUp ? "Matthew 7 is complete." : "You can still read Matthew 7."}</h2>
          <span>{caughtUp ? "It counted toward Matthew and your Connect." : "Catch up anytime—there’s no shame and no deadline."}</span>
        </div>
        <button type="button" onClick={() => onStart(7)}>{caughtUp ? "Read again" : "Catch up"} <b>→</b></button>
        {!caughtUp && <small>Earns 10 coins · Daily streak stays unchanged</small>}
      </section>

      <section className="section-block">
        <div className="section-heading"><div><p className="eyebrow">OUR CONNECT</p><h2>We’re building this together</h2></div><button onClick={() => document.querySelector<HTMLButtonElement>('[data-tab="connect"]')?.click()}>See home</button></div>
        <div className="home-card">
          <HomeIllustration completed={completed} />
          <div className="home-info">
            <div className="stage-row"><span>Cabin</span><span>Apartment</span></div>
            <ProgressBar value={groupCoins} max={100} />
            <div className="stage-row detail"><strong>{groupCoins} / 100 coins</strong><span>{100 - groupCoins} to upgrade</span></div>
          </div>
        </div>
      </section>

      <section className="people-today">
        <div className="avatar-stack">{members.slice(0, 5).map((m) => <Avatar key={m.name} color={m.color} gender={m.gender} skin={m.skin} hair={m.hair} glasses={m.glasses} facialHair={m.facialHair} small />)}</div>
        <div><strong>{completed ? 9 : 8} of 12 have read today</strong><span>Your 10 coins go straight to your Connect.</span></div>
      </section>
      <p className="daily-note">Read anywhere. Grow together.</p>
    </main>
  );
}

function ConnectScreen({ completed, groupCoins, profile, onEditProfile }: { completed: boolean; groupCoins: number; profile: UserProfile; onEditProfile: () => void }) {
  const [selectedHome, setSelectedHome] = useState(2);
  const currentMembers = completed
    ? [...members, { name: "You", gender: profile.gender, color: "coral", skin: "warm" as SkinTone, hair: profile.hair, glasses: profile.glasses, facialHair: profile.facialHair, read: true, coins: 80 }]
    : [...members, { name: "You", gender: profile.gender, color: "coral", skin: "warm" as SkinTone, hair: profile.hair, glasses: profile.glasses, facialHair: profile.facialHair, read: false, coins: 70 }];
  const sorted = [...currentMembers].sort((a, b) => Number(b.read) - Number(a.read));
  return (
    <main className="screen connect-screen">
      <Header name="Connect 24" profile={profile} onEditProfile={onEditProfile} />
      <section className="connect-title"><p className="eyebrow">OUR SHARED HOME</p><h1>Little by little,<br />we’re building a place.</h1><p>Every chapter read adds 10 coins automatically.</p></section>
      <section className="big-home-card">
        <RotatableHome stage={selectedHome} completed={completed} />
        <div className="big-home-info"><div><p>{selectedHome === 2 ? "CURRENT HOME" : selectedHome === 3 ? "NEXT UPGRADE" : "HOME COLLECTION"}</p><h2>{homeStages[selectedHome].name}</h2><span className="home-note">{homeStages[selectedHome].note}</span></div><div className="coin-chip">◉ {groupCoins}</div></div>
        <ProgressBar value={groupCoins} max={100} />
        <div className="upgrade-copy"><strong>{100 - groupCoins} coins to Apartment</strong><span>Next group upgrade</span></div>
      </section>
      <section className="journey">
        <div className="journey-heading"><div><p className="eyebrow">OUR JOURNEY</p><h2>Explore every home</h2></div><span>Tap a stage to preview it in 3D.</span></div>
        <div className="stages">{homeStages.map((home, i) => <button key={home.name} onClick={() => setSelectedHome(i)} aria-pressed={selectedHome === i} className={`${i < 3 ? "done" : i === 3 ? "next" : ""} ${selectedHome === i ? "selected" : ""}`}><span>{i < 3 ? "✓" : i + 1}</span><small>{home.name}</small></button>)}</div>
      </section>
      <section className="member-section">
        <div className="section-heading"><div><p className="eyebrow">TODAY</p><h2>{completed ? 9 : 8} of 12 have read</h2></div><div className="status-key"><i /> Read</div></div>
        <div className="member-grid">
          {sorted.map((m) => <article className={`member-card ${m.read ? "read" : "waiting"}`} key={m.name}><div className="member-avatar">{m.name === "You" ? <Avatar color="coral" gender={profile.gender} hair={profile.hair} glasses={profile.glasses} facialHair={profile.facialHair} face={profile.face} hairColor={profile.hairColor} skinColor={profile.skinColor} shirtColor={profile.shirtColor} backgroundColor={profile.backgroundColor} /> : <Avatar color={m.color} gender={m.gender} skin={m.skin} hair={m.hair} glasses={m.glasses} facialHair={m.facialHair} />}{m.read && <b>✓</b>}</div><strong>{m.name === "You" ? profile.displayName : m.name}</strong><span>{m.read ? "Read today" : "Not yet"}</span><small>◉ {m.coins} contributed</small></article>)}
        </div>
        <p className="gentle-note">No rankings here—just a gentle way to encourage one another.</p>
      </section>
    </main>
  );
}

const rewards = [
  { chapters: 3, title: "First Steps", tone: "bronze", kind: "medal", shape: "small", earned: true },
  { chapters: 7, title: "Steady Reader", tone: "silver", kind: "medal", shape: "medium", earned: true },
  { chapters: 14, title: "Halfway Heart", tone: "gold", kind: "medal", shape: "star", earned: false },
  { chapters: 21, title: "Faithful Rhythm", tone: "violet", kind: "trophy", shape: "medium", earned: false },
  { chapters: 28, title: "Matthew Complete", tone: "navy", kind: "trophy", shape: "large", earned: false },
];

function RewardsScreen({ profile, chapters, onEditProfile }: { profile: UserProfile; chapters: number; onEditProfile: () => void }) {
  const earnedCount = rewards.filter((reward) => chapters >= reward.chapters).length;
  return (
    <main className="screen rewards-screen">
      <Header name="Your shelf" profile={profile} onEditProfile={onEditProfile} />
      <section className="page-title"><p className="eyebrow">PERSONAL MILESTONES</p><h1>A little reminder<br />of every faithful step.</h1><p>You’ve earned {earnedCount} of 5 rewards.</p></section>
      <section className="shelf-cabinet">
        <div className="shelf-row">
          {rewards.slice(0, 3).map((r) => <Reward key={r.title} {...r} earned={chapters >= r.chapters} />)}
        </div>
        <div className="wood-shelf" />
        <div className="shelf-row two">
          {rewards.slice(3).map((r) => <Reward key={r.title} {...r} earned={chapters >= r.chapters} />)}
        </div>
        <div className="wood-shelf" />
      </section>
      <section className="next-reward"><div className="mini-medal gold">◇</div><div><p className="eyebrow">NEXT REWARD</p><h2>Halfway Heart</h2><span>{Math.max(0, 14 - chapters)} more chapter{14 - chapters === 1 ? "" : "s"} to unlock</span></div><strong>{chapters} / 14</strong></section>
      <p className="gentle-note">Rewards celebrate consistency—not comparison.</p>
    </main>
  );
}

function Reward({ chapters, title, tone, kind, shape, earned }: { chapters: number; title: string; tone: string; kind: string; shape: string; earned: boolean }) {
  return <article className={`reward ${earned ? "earned" : "locked"}`}>
    {kind === "trophy"
      ? <div className={`shelf-award trophy-award ${tone} trophy-${shape}`}><span className="trophy-cup">★</span><i /><b /><em>{chapters}</em></div>
      : <div className={`shelf-award medal-award ${tone} medal-${shape}`}><i className="medal-ribbons" /><b className="medal-face">{shape === "star" ? "★" : "✦"}</b><span>{chapters}</span></div>}
    <strong>{title}</strong><span>{earned ? "Earned" : `${chapters} chapters`}</span>
  </article>;
}

function ProgressScreen({ completed, caughtUp, chapters, profile, onCatchUp, onEditProfile }: { completed: boolean; caughtUp: boolean; chapters: number; profile: UserProfile; onCatchUp: () => void; onEditProfile: () => void }) {
  const completedDays = useMemo(() => new Set([1, 2, 3, 4, 5, 6, ...(caughtUp ? [7] : []), 8, 9, 10, 11, 12, ...(completed ? [13] : [])]), [completed, caughtUp]);
  return (
    <main className="screen progress-screen">
      <Header name="Your progress" profile={profile} onEditProfile={onEditProfile} />
      <section className="progress-profile-card" aria-label={`${profile.displayName}'s profile and reading highlights`}>
        <Avatar color="coral" gender={profile.gender} hair={profile.hair} glasses={profile.glasses} facialHair={profile.facialHair} face={profile.face} hairColor={profile.hairColor} skinColor={profile.skinColor} shirtColor={profile.shirtColor} backgroundColor={profile.backgroundColor} preview />
        <div className="progress-profile-copy">
          <p className="eyebrow">YOUR PROFILE</p>
          <h2>{profile.displayName}</h2>
          <span>Connect 24</span>
          <button type="button" onClick={onEditProfile}>Edit avatar <b>→</b></button>
        </div>
        <div className="progress-profile-highlights">
          <div><b>6</b><span>day streak</span></div>
          <div><b>{chapters}</b><span>chapters read</span></div>
        </div>
      </section>
      <section className="page-title compact"><p className="eyebrow">MATTHEW · OCTOBER 2026</p><h1>Keep showing up.</h1><p>Grace for the missed days. Joy in the next one.</p></section>
      <section className="stats-card">
        <div className="chapter-ring"><span><b>{chapters}</b><small>/ 28</small></span></div>
        <div className="stat-copy"><p>CHAPTERS READ</p><h2>{Math.round(chapters / 28 * 100)}% through Matthew</h2><ProgressBar value={chapters} max={28} /><span>{28 - chapters} chapters to go</span></div>
      </section>
      <section className="mini-stats"><article><span className="stat-icon coral">●</span><div><b>6 days</b><small>Current streak</small></div></article><article><span className="stat-icon gold">◉</span><div><b>{chapters * 10} coins</b><small>Contributed</small></div></article></section>
      <section className="calendar-card">
        <div className="section-heading"><div><p className="eyebrow">YOUR READING</p><h2>October</h2></div><span className="calendar-key"><i /> Read</span></div>
        <div className="weekday">{"SMTWTFS".split("").map((d, i) => <span key={i}>{d}</span>)}</div>
        <div className="calendar-grid"><span /><span /><span /><span />{Array.from({ length: 28 }, (_, i) => i + 1).map((day) => day === 7 && !caughtUp
          ? <button type="button" key={day} className="missed catchup-day" onClick={onCatchUp} aria-label="Catch up Matthew 7">7<i>Catch up</i></button>
          : <span key={day} className={completedDays.has(day) ? "read" : day === 13 ? "today" : day < 13 ? "missed" : ""}>{completedDays.has(day) ? "✓" : day}</span>)}</div>
      </section>
      <section className="next-reward progress-reward"><div className="mini-medal gold">◇</div><div><p className="eyebrow">UP NEXT</p><h2>Halfway Heart</h2><span>{14 - chapters} more chapter{14 - chapters === 1 ? "" : "s"} to unlock</span></div><strong>{chapters} / 14</strong></section>
    </main>
  );
}

function CompletionFlow({ step, chapter, chapters, onClose, onComplete }: { step: number; chapter: number; chapters: number; onClose: () => void; onComplete: () => void }) {
  const [location, setLocation] = useState("Home");
  const isCatchUp = chapter === 7;
  const nextTrophyAt = 21;
  const trophyProgress = Math.min(chapters, nextTrophyAt);
  if (!step) return null;
  return (
    <div className="modal-wrap" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <button className="modal-backdrop" onClick={onClose} aria-label="Close" />
      <div className="modal-sheet">
        {step === 1 ? <>
          <button className="close-button" onClick={onClose} aria-label="Close">×</button>
          <p className="eyebrow">{isCatchUp ? "CATCH-UP READING" : "TODAY’S READING"}</p><h2 id="modal-title">Matthew {chapter}</h2><p className="passage-note">{isCatchUp ? "Ask, seek and keep building your life on the firm foundation of Jesus’ words." : "Jesus meets people in their fear, sickness and uncertainty—and invites them to trust him."}</p>
          <div className="reading-prompt"><span>{String(chapter).padStart(2, "0")}</span><div><strong>Read Matthew chapter {chapter}</strong><small>Use your Bible or preferred Bible app.</small></div></div>
          <button className="primary-button" onClick={onComplete}>I’ve read Matthew {chapter} <span>✓</span></button>
          <p className="honor-note">This is an honor-based check-in. Take your time.</p>
        </> : isCatchUp ? <>
          <button className="close-button" onClick={onClose} aria-label="Close">×</button>
          <div className="celebration-mark">✦</div><p className="eyebrow centered">CAUGHT UP</p><h2 id="modal-title" className="centered">Matthew {chapter} is done!</h2><p className="reward-line"><b>+10 coins</b> for Connect 24</p>
          <p className="catchup-modal-note">This counts toward finishing Matthew. Your daily streak remains 6 days.</p>
          <div className="location-question"><strong>Where did you read today?</strong><span>Optional—just for fun.</span><div className="location-grid">{[["⌂", "Home"], ["▤", "Commute"], ["□", "Work"], ["☕", "Café"], ["♧", "Outside"], ["·", "Elsewhere"]].map(([icon, label]) => <button key={label} className={location === label ? "selected" : ""} onClick={() => setLocation(label)}><span>{icon}</span>{label}</button>)}</div></div>
          <button className="primary-button" onClick={onClose}>See what changed <span>→</span></button>
        </> : <div className="today-completion">
          <button className="close-button" onClick={onClose} aria-label="Close congratulations">×</button>
          <div className="celebration-mark">✦</div>
          <p className="eyebrow centered">TODAY’S READING COMPLETE</p>
          <h2 id="modal-title" className="centered">Congratulations! You’ve finished today’s readings!</h2>
          <p className="completion-note">Matthew {chapter} is complete. Your faithful step is helping your whole Connect build together.</p>
          <div className="coin-reward-card">
            <strong>+10</strong>
            <div><span>COINS ADDED</span><b>To your Connect home</b></div>
          </div>
          <div className="trophy-progress-card">
            <div className="completion-trophy" aria-hidden="true"><span>★</span><i /></div>
            <div className="trophy-progress-copy">
              <p>NEXT TROPHY</p>
              <div><strong>Faithful Rhythm</strong><span>{trophyProgress} / {nextTrophyAt} chapters</span></div>
              <ProgressBar value={trophyProgress} max={nextTrophyAt} />
              <small>{nextTrophyAt - trophyProgress} more chapters to unlock</small>
            </div>
          </div>
          <button className="primary-button completion-close" onClick={onClose}>Close <span>✓</span></button>
        </div>}
      </div>
    </div>
  );
}

const hairChoices: Array<{ value: HairStyle; label: string }> = [
  { value: "bald", label: "Bald" },
  { value: "extra-short", label: "Buzz cut" },
  { value: "crop", label: "Short crop" },
  { value: "short-straight", label: "Side part" },
  { value: "pixie", label: "Pixie" },
  { value: "bob", label: "Bob" },
  { value: "ponytail", label: "Ponytail" },
  { value: "short-curly", label: "Short curls" },
  { value: "long-curly", label: "Long curls" },
  { value: "short-wavy", label: "Short waves" },
  { value: "long-wavy", label: "Long waves" },
  { value: "long-straight", label: "Long straight" },
];

const hairColors = ["#172943", "#302a29", "#5a3c31", "#9a5843", "#d5ad55", "#85887e"];
const skinColors = ["#f0c6a1", "#dfa16d", "#c47f5f", "#81503a"];
const shirtColors = ["#dc6e57", "#75a6c5", "#edaa35", "#71846c", "#9b84c5"];
const backgroundColors = ["#f1dfc7", "#e8def0", "#d1e2eb", "#dce5d6", "#f2d1c3"];
const facialHairChoices: Array<{ value: FacialHair; label: string }> = [
  { value: "none", label: "Clean-shaven" },
  { value: "mustache", label: "Mustache" },
  { value: "stubble", label: "Stubble" },
  { value: "beard", label: "Beard" },
];

function ColorChoices({ label, colors, value, onChange }: { label: string; colors: string[]; value: string; onChange: (color: string) => void }) {
  return <fieldset className="profile-field"><legend>{label}</legend><div className="color-choices">{colors.map((color) => <button key={color} type="button" className={value === color ? "selected" : ""} style={{ background: color }} onClick={() => onChange(color)} aria-label={`${label} ${color}`} aria-pressed={value === color} />)}</div></fieldset>;
}

function ProfileEditor({ profile, onClose, onSave }: { profile: UserProfile; onClose: () => void; onSave: (profile: UserProfile) => void }) {
  const [draft, setDraft] = useState(profile);
  function update<K extends keyof UserProfile>(key: K, value: UserProfile[K]) { setDraft((current) => ({ ...current, [key]: value })); }

  return (
    <div className="modal-wrap profile-modal" role="dialog" aria-modal="true" aria-labelledby="profile-title">
      <button className="modal-backdrop" onClick={onClose} aria-label="Close profile editor" />
      <section className="modal-sheet profile-sheet">
        <button className="close-button" onClick={onClose} aria-label="Close">×</button>
        <p className="eyebrow">YOUR PROFILE</p>
        <h2 id="profile-title">Make it feel like you.</h2>
        <p className="profile-intro">Choose a few details for the avatar your Connect will see.</p>
        <div className="profile-preview-wrap">
          <Avatar color="coral" gender={draft.gender} hair={draft.hair} glasses={draft.glasses} facialHair={draft.facialHair} face={draft.face} hairColor={draft.hairColor} skinColor={draft.skinColor} shirtColor={draft.shirtColor} backgroundColor={draft.backgroundColor} preview />
          <div><strong>{draft.displayName.trim() || "Your name"}</strong><span>Connect 24</span></div>
        </div>

        <label className="profile-name-field">
          <span>Display name</span>
          <input type="text" value={draft.displayName} maxLength={24} autoComplete="name" onChange={(event) => update("displayName", event.target.value)} placeholder="Your name" />
          <small>This is the name your Connect will see.</small>
        </label>
        <fieldset className="profile-field"><legend>Gender</legend><div className="gender-choices">{(["female", "male"] as Gender[]).map((gender) => <button type="button" key={gender} className={`avatar-option ${draft.gender === gender ? "selected" : ""}`} onClick={() => update("gender", gender)} aria-pressed={draft.gender === gender}><Avatar color="coral" gender={gender} hair={gender === "female" ? "bob" : "crop"} face={draft.face} hairColor={draft.hairColor} skinColor={draft.skinColor} shirtColor={draft.shirtColor} backgroundColor={draft.backgroundColor} small /><span>{gender === "female" ? "Female" : "Male"}</span></button>)}</div></fieldset>
        <fieldset className="profile-field"><legend>Face</legend><div className="face-choices">{(["narrow", "normal", "round"] as FaceShape[]).map((face, index) => <button type="button" key={face} className={draft.face === face ? "selected" : ""} onClick={() => update("face", face)}><Avatar color="coral" gender={draft.gender} hair="extra-short" face={face} hairColor={draft.hairColor} skinColor={draft.skinColor} shirtColor={draft.shirtColor} backgroundColor={draft.backgroundColor} small /><span>Face {index + 1}</span></button>)}</div></fieldset>
        <fieldset className="profile-field"><legend>Hair type</legend><div className="hair-choices">{hairChoices.map((choice) => <button type="button" key={choice.value} className={draft.hair === choice.value ? "selected" : ""} onClick={() => update("hair", choice.value)}><Avatar color="coral" gender={draft.gender} hair={choice.value} face={draft.face} hairColor={draft.hairColor} skinColor={draft.skinColor} shirtColor={draft.shirtColor} backgroundColor={draft.backgroundColor} small /><span>{choice.label}</span></button>)}</div></fieldset>
        <ColorChoices label="Hair color" colors={hairColors} value={draft.hairColor} onChange={(color) => update("hairColor", color)} />
        <fieldset className="profile-field"><legend>Glasses</legend><div className="accessory-choices">{(["none", "round", "wayfarer"] as GlassesStyle[]).map((glasses) => <button type="button" key={glasses} className={`avatar-option ${draft.glasses === glasses ? "selected" : ""}`} onClick={() => update("glasses", glasses)} aria-pressed={draft.glasses === glasses}><Avatar color="coral" gender={draft.gender} hair={draft.hair} glasses={glasses} face={draft.face} hairColor={draft.hairColor} skinColor={draft.skinColor} shirtColor={draft.shirtColor} backgroundColor={draft.backgroundColor} small /><span>{glasses === "none" ? "No glasses" : glasses === "round" ? "Rounded" : "Wayfarer"}</span></button>)}</div></fieldset>
        {draft.gender === "male" && <fieldset className="profile-field"><legend>Facial hair</legend><div className="facial-hair-choices">{facialHairChoices.map((choice) => <button type="button" key={choice.value} className={`avatar-option ${draft.facialHair === choice.value ? "selected" : ""}`} onClick={() => update("facialHair", choice.value)} aria-pressed={draft.facialHair === choice.value}><Avatar color="coral" gender="male" hair={draft.hair} glasses={draft.glasses} facialHair={choice.value} face={draft.face} hairColor={draft.hairColor} skinColor={draft.skinColor} shirtColor={draft.shirtColor} backgroundColor={draft.backgroundColor} small /><span>{choice.label}</span></button>)}</div></fieldset>}
        <ColorChoices label="Skin color" colors={skinColors} value={draft.skinColor} onChange={(color) => update("skinColor", color)} />
        <ColorChoices label="T-shirt color" colors={shirtColors} value={draft.shirtColor} onChange={(color) => update("shirtColor", color)} />
        <ColorChoices label="Background color" colors={backgroundColors} value={draft.backgroundColor} onChange={(color) => update("backgroundColor", color)} />
        <button className="primary-button profile-save" onClick={() => onSave({ ...draft, displayName: draft.displayName.trim() || "Mia" })}>Save my profile <span>✓</span></button>
      </section>
    </div>
  );
}

export default function Home() {
  const [tab, setTab] = useState<Tab>("today");
  const [flowStep, setFlowStep] = useState(0);
  const [readingChapter, setReadingChapter] = useState(8);
  const [completed, setCompleted] = useState(false);
  const [caughtUp, setCaughtUp] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const chapters = 12 + Number(completed) + Number(caughtUp);
  const groupCoins = 76 + Number(completed) * 10 + Number(caughtUp) * 10;

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("read-my-bible-profile");
      if (saved) {
        const previous = JSON.parse(saved) as Omit<Partial<UserProfile>, "glasses"> & { gender?: string; beard?: boolean; glasses?: GlassesStyle | "square" | boolean };
        const legacyHair: Partial<Record<HairStyle, HairStyle>> = { curls: "short-curly", bun: "ponytail", waves: "short-wavy", graybun: "ponytail", "medium-curly": "short-curly", "medium-straight": "short-straight", "medium-wavy": "short-wavy" };
        const gender: Gender = previous.gender === "male" ? "male" : "female";
        const facialHair: FacialHair = previous.facialHair === "mustache" || previous.facialHair === "stubble" || previous.facialHair === "beard" ? previous.facialHair : previous.beard ? "beard" : "none";
        const glasses: GlassesStyle = previous.glasses === "wayfarer" || previous.glasses === "square" ? "wayfarer" : previous.glasses === "round" || previous.glasses === true ? "round" : "none";
        const displayName = typeof previous.displayName === "string" && previous.displayName.trim() ? previous.displayName.trim().slice(0, 24) : defaultProfile.displayName;
        // One-time hydration from local storage on mount, not a React-state sync -- see
        // https://react.dev/learn/you-might-not-need-an-effect for the general rule this bends.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setProfile({ ...defaultProfile, ...previous, displayName, gender, glasses, facialHair, face: previous.face ?? "normal", hair: legacyHair[previous.hair as HairStyle] ?? previous.hair ?? defaultProfile.hair });
      }
    } catch { /* Keep the friendly default if device storage is unavailable. */ }
  }, []);

  function selectTab(next: Tab) { setTab(next); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function startReading(chapter: number) { setReadingChapter(chapter); setFlowStep(1); }
  function finishReading() {
    if (readingChapter === 7) setCaughtUp(true);
    else setCompleted(true);
    setFlowStep(2);
  }
  function saveProfile(next: UserProfile) {
    setProfile(next);
    setProfileOpen(false);
    try { window.localStorage.setItem("read-my-bible-profile", JSON.stringify(next)); } catch { /* Profile still works for this session. */ }
  }

  return (
    <div className="app-shell">
      <div className="paper-noise" />
      {tab === "today" && <TodayScreen completed={completed} caughtUp={caughtUp} onStart={startReading} groupCoins={groupCoins} profile={profile} onEditProfile={() => setProfileOpen(true)} />}
      {tab === "connect" && <ConnectScreen completed={completed} groupCoins={groupCoins} profile={profile} onEditProfile={() => setProfileOpen(true)} />}
      {tab === "rewards" && <RewardsScreen profile={profile} chapters={chapters} onEditProfile={() => setProfileOpen(true)} />}
      {tab === "progress" && <ProgressScreen completed={completed} caughtUp={caughtUp} chapters={chapters} profile={profile} onCatchUp={() => startReading(7)} onEditProfile={() => setProfileOpen(true)} />}
      <nav className="bottom-nav" aria-label="Main navigation">
        {navItems.map((item) => <button key={item.id} data-tab={item.id} className={tab === item.id ? "active" : ""} onClick={() => selectTab(item.id)}><NavIcon icon={item.icon} />{item.label}</button>)}
      </nav>
      <CompletionFlow step={flowStep} chapter={readingChapter} chapters={chapters} onClose={() => setFlowStep(0)} onComplete={finishReading} />
      {profileOpen && <ProfileEditor profile={profile} onClose={() => setProfileOpen(false)} onSave={saveProfile} />}
    </div>
  );
}

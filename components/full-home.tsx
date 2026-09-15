"use client";

import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Avatar, type UserProfile } from "@/components/avatar";
import type { RosterMemberView } from "@/components/app-shell";
import { homeStages, RotatableHome } from "@/components/rotatable-home";
import { Sheet } from "@/components/sheet";
import { ProgressBar } from "@/components/progress-bar";
import type { TodayState } from "@/components/use-today";
import { modelFor } from "./scene-home-registry";
import { sceneEligibility } from "@/lib/scene-eligibility";

const TIMES = ['Day', 'Sunset', 'Night'] as const;
const ImmersiveHomeScene = lazy(() => import('@/components/immersive-home-scene').then(module => ({ default: module.ImmersiveHomeScene })));

function SceneControlIcon({ icon }: { icon: 'people' | 'moon' | 'sun' | 'reset' | 'expand' }) {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {icon === 'people' && <><circle cx="9" cy="7" r="3" /><path d="M3 20v-3a6 6 0 0 1 12 0v3H3ZM16 4a3 3 0 0 1 0 6M18 13a5 5 0 0 1 3 4v3h-3" /></>}
    {icon === 'moon' && <path d="M20 15.3A8.5 8.5 0 0 1 8.7 4 8.5 8.5 0 1 0 20 15.3Z" />}
    {icon === 'sun' && <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></>}
    {icon === 'reset' && <><path d="M20 7v5h-5M20 12a8 8 0 1 0-2.3 5.7" /></>}
    {icon === 'expand' && <path d="M14 4h6v6M20 4l-7 7M10 20H4v-6m0 6 7-7" />}
  </svg>;
}

export function FullHome({ onClose, groupName, coins, groupCheckinCount, stage, progress, milestone, overallPct, today, roster, profile, selectedMemberId, onSelectMember, onViewReading, onViewPlan }: {
  onClose: () => void; groupName: string; coins: number; stage: number;
  groupCheckinCount: number | null;
  progress: { pct: number; stage: string } | null; milestone: { stage: string; pct: number } | null;
  overallPct: number; today: TodayState; roster: RosterMemberView[]; profile: UserProfile;
  selectedMemberId: number | null; onSelectMember: (member: RosterMemberView) => void;
  onViewReading?: () => void; onViewPlan?: () => void;
}) {
  const [people, setPeople] = useState(true);
  const [names, setNames] = useState(true);
  const [time, setTime] = useState<typeof TIMES[number]>('Sunset');
  const [mode, setMode] = useState<'classic' | 'tent' | 'campfire'>('classic');
  const supportsScene = modelFor(stage)?.supported ?? false;
  const isCampsite = supportsScene && mode !== 'classic';
  const eligibility = sceneEligibility(groupCheckinCount);
  const gatheringOpen = eligibility.kind === "unlocked";
  const [options, setOptions] = useState(false);
  const [reset, setReset] = useState(0);
  const [fullscreenAvailable, setFullscreenAvailable] = useState(false);
  const [coinInfo, setCoinInfo] = useState(false);
  const ownsFullscreen = useRef(false);
  const currentMember = roster.find(member => member.isSelf);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setFullscreenAvailable(document.fullscreenEnabled));
    return () => {
      cancelAnimationFrame(frame);
      if (ownsFullscreen.current && document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    };
  }, []);

  async function expand() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else { await document.documentElement.requestFullscreen(); ownsFullscreen.current = true; }
    } catch { /* The immersive layout also fills browsers that decline fullscreen. */ }
  }

  return <>
    <Sheet open onClose={onClose} labelledBy="full-home-title" immersive className={`full-home ${isCampsite ? 'scene-home' : ''} time-${time.toLowerCase()} mode-${mode}`}>
      <div className="full-home-header">
        <button className="home-float-button" onClick={onClose} aria-label="Close Home">×</button>
        <div className="full-home-identity"><h2 id="full-home-title">{groupName}</h2><span>{roster.length} members · {homeStages[stage].name}</span></div>
        <button type="button" className="coin-chip" aria-expanded={coinInfo} aria-label={`${coins} chapter points. Select to learn more`} onClick={() => setCoinInfo(value => !value)}>◉ {coins}</button>
        {fullscreenAvailable && <button className="home-float-button home-expand" aria-label="Toggle device fullscreen" onClick={expand}><SceneControlIcon icon="expand" /></button>}
      </div>
      {isCampsite && <Suspense fallback={<div className="scene-loading" role="status">Preparing your gathering…</div>}>
        <ImmersiveHomeScene stage={stage} mode={mode === 'campfire' ? 'campfire' : 'tent'} time={time} roster={roster} profile={profile} people={people && gatheringOpen} names={names} selectedMemberId={selectedMemberId} onSelectMember={onSelectMember} resetKey={reset} />
      </Suspense>}
      {!isCampsite && <RotatableHome key={reset} stage={stage} completed={false} immersive>
        {people && <div className={`home-gathering ${names ? 'show-names' : ''}`}>
          {roster.map((member, index) => {
            const angle = index / Math.max(roster.length, 1) * Math.PI * 2;
            const radius = 168 * (1 + Math.floor(index / 14) * .22);
            return <button type="button" className={`home-person ${selectedMemberId === member.personId ? 'selected' : ''}`} key={member.personId} style={{ '--px': `${Math.cos(angle) * radius}px`, '--pz': `${Math.sin(angle) * radius}px` } as React.CSSProperties} onClick={() => onSelectMember(member)} aria-label={`View ${member.name}'s profile`}>
              <span className="home-person-label">{member.name}{member.isSelf ? ' · You' : ''}</span>
              <Avatar color="coral" {...(member.isSelf ? profile : member.avatar)} />
            </button>;
          })}
        </div>}
      </RotatableHome>}
      {coinInfo && <p className="full-home-coin-info" role="status">Points celebrate each chapter your group checks in. Home stages are unlocked by overall Matthew completion.</p>}
      <div className="full-home-footer">
        {isCampsite && !gatheringOpen && <div className="scene-access-note" role="status" data-scene-access={eligibility.kind}>
          <p>{eligibility.message}</p>
          {!gatheringOpen && eligibility.kind === "locked" && <button type="button" onClick={today.displayPhase === "active" ? onViewReading : onViewPlan}>
            {today.displayPhase === "active" ? "Read a chapter →" : "View reading plan →"}
          </button>}
        </div>}
        <details className="full-home-progress scene-progress">
          <summary><span>{today.entry ? `Chapter ${today.entry.chapter}` : 'Our shared home'} · {progress ? `${progress.pct}% to ${progress.stage}` : 'All homes unlocked'}</span><span aria-hidden="true">⌂</span></summary>
          <div className="scene-progress-details">
          <strong>{today.displayPhase === "pre-launch" ? "Preview progress" : `${overallPct}% of Matthew complete`}</strong>
          <span>{progress ? `${progress.pct}% through this stage · ${progress.stage} unlocks at ${milestone?.pct ?? 100}% overall` : 'Every stage reached'}</span>
          <p>{isCampsite && gatheringOpen ? eligibility.message : "Your group's reading grows this home."}</p>
          <ProgressBar value={progress?.pct ?? 100} max={100} />
          {today.displayPhase === "pre-launch" && <><small>Reading begins October 1.</small><button type="button" className="primary-button home-reading-cta" onClick={onViewPlan}>View reading plan <span aria-hidden="true">→</span></button></>}
          {today.displayPhase === "active" && (currentMember?.readToday
            ? <button type="button" className="primary-button home-reading-cta" disabled>You&apos;re done for today <span aria-hidden="true">✓</span></button>
            : <button type="button" className="primary-button home-reading-cta" onClick={onViewReading}>{today.entry ? `Read Matthew ${today.entry.chapter}` : "Continue reading"} <span aria-hidden="true">→</span></button>)}
          {today.displayPhase === "grace" && <button type="button" className="primary-button home-reading-cta" onClick={onViewPlan}>View reading plan <span aria-hidden="true">→</span></button>}
          {today.displayPhase === "closed" && <button type="button" className="secondary-link home-reading-cta" onClick={onViewPlan}>Review the reading plan →</button>}
          </div>
        </details>
        {supportsScene && <div className="home-scene-switch" role="group" aria-label="Scene presentation">
          <button type="button" aria-pressed={mode === 'classic'} onClick={() => setMode('classic')}>Classic</button>
          <button type="button" aria-pressed={mode === 'tent'} onClick={() => setMode('tent')}>{modelFor(stage)?.name}</button>
          <button type="button" aria-pressed={mode === 'campfire'} onClick={() => setMode('campfire')}>Campfire</button>
        </div>}
        <div className="home-floating-actions">
          <button onClick={() => setOptions(true)} aria-haspopup="dialog"><span><SceneControlIcon icon="people" /></span>People</button>
          <button onClick={() => setTime(TIMES[(TIMES.indexOf(time) + 1) % TIMES.length])} aria-label={`Time of day: ${time}. Change time of day`}><span><SceneControlIcon icon={time === 'Night' ? 'moon' : 'sun'} /></span>{time}</button>
          <button onClick={() => setReset(value => value + 1)}><span><SceneControlIcon icon="reset" /></span>Reset view</button>
        </div>
      </div>
    </Sheet>
    <Sheet open={options} onClose={() => setOptions(false)} labelledBy="home-options-title" className="home-options">
      <button className="close-button" aria-label="Close View Options" onClick={() => setOptions(false)}>×</button>
      <h2 id="home-options-title">View Options</h2>
      <label className="home-option" htmlFor="home-people" aria-label="Show all members"><span><strong>Show all members</strong><small>See everyone in the scene</small></span><input id="home-people" type="checkbox" role="switch" checked={people} onChange={e => setPeople(e.target.checked)} /></label>
      <label className="home-option" htmlFor="home-names" aria-label="Show name labels"><span><strong>Show name labels</strong><small>Display names above avatars</small></span><input id="home-names" type="checkbox" role="switch" checked={names} disabled={!people} onChange={e => setNames(e.target.checked)} /></label>
      <fieldset className="home-time-options"><legend>Time of day</legend>{TIMES.map(value => <button key={value} aria-pressed={time === value} onClick={() => setTime(value)}>{value}</button>)}</fieldset>
      <section className="home-options-members" aria-labelledby="home-options-members-title">
        <h3 id="home-options-members-title">Connect members</h3>
        <p>Select anyone to view their profile.</p>
        <div className="home-options-member-list">
          {roster.map(member => <button type="button" key={member.personId} className={selectedMemberId === member.personId ? "selected" : ""} onClick={() => { setOptions(false); onSelectMember(member); }}>{member.name}{member.isSelf ? " (You)" : ""}</button>)}
        </div>
      </section>
      <button className="home-option-reset" onClick={() => setReset(value => value + 1)}>↺ Reset view</button>
      <button className="primary-button" onClick={() => setOptions(false)}>Done <span aria-hidden="true">✓</span></button>
    </Sheet>
  </>;
}

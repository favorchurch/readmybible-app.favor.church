"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar, type UserProfile } from "@/components/avatar";
import type { RosterMemberView } from "@/components/app-shell";
import { RotatableHome, homeStages } from "@/components/rotatable-home";
import { Sheet } from "@/components/sheet";
import { ProgressBar } from "@/components/progress-bar";

const TIMES = ['Day', 'Sunset', 'Night'] as const;

export function FullHome({ onClose, groupName, coins, stage, progress, chapter, roster, profile }: {
  onClose: () => void; groupName: string; coins: number; stage: number;
  progress: { pct: number; stage: string } | null; chapter: number | null;
  roster: RosterMemberView[]; profile: UserProfile;
}) {
  const [people, setPeople] = useState(true);
  const [names, setNames] = useState(false);
  const [time, setTime] = useState<typeof TIMES[number]>('Day');
  const [options, setOptions] = useState(false);
  const [reset, setReset] = useState(0);
  const [fullscreenAvailable, setFullscreenAvailable] = useState(false);
  const ownsFullscreen = useRef(false);

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
    <Sheet open onClose={onClose} labelledBy="full-home-title" immersive className={`full-home time-${time.toLowerCase()}`}>
      <div className="full-home-header">
        <button className="home-float-button" onClick={onClose} aria-label="Close Home">×</button>
        <div className="full-home-identity"><h2 id="full-home-title">{groupName}</h2><span>{roster.length} members · {homeStages[stage].name}</span></div>
        <span className="coin-chip" aria-label={`${coins} coins`}>◉ {coins}</span>
        {fullscreenAvailable && <button className="home-float-button home-expand" aria-label="Toggle device fullscreen" onClick={expand}>↗</button>}
      </div>
      <RotatableHome key={reset} stage={stage} completed={false} immersive>
        {people && <div className="home-gathering" aria-hidden="true">
          {roster.map((member, index) => {
            const angle = (index / Math.max(roster.length, 1)) * Math.PI * 2;
            const ring = 1 + Math.floor(index / 14) * .22;
            return <div className="home-person" key={member.personId} style={{ left: `${50 + Math.cos(angle) * 35 * ring}%`, top: `${58 + Math.sin(angle) * 18 * ring}%` }}>
              {names && <span className="home-person-label">{member.name}</span>}
              <Avatar color="coral" {...(member.isSelf ? profile : member.avatar)} />
            </div>;
          })}
        </div>}
      </RotatableHome>
      {people && <p className="sr-only">Together at home: {roster.map(m => m.name).join(', ')}.</p>}
      <div className="full-home-footer">
        <div className="full-home-progress">
          <strong>{chapter ? `Chapter ${chapter}` : 'Starts October 1'}</strong>
          <span>{progress ? `${progress.pct}% to ${progress.stage}` : 'Every stage reached'}</span>
          <ProgressBar value={progress?.pct ?? 100} max={100} />
        </div>
        <div className="home-floating-actions">
          <button onClick={() => setOptions(true)} aria-haspopup="dialog"><span aria-hidden="true">♧</span>People</button>
          <button onClick={() => setTime(TIMES[(TIMES.indexOf(time) + 1) % TIMES.length])} aria-label={`Time of day: ${time}. Change time of day`}><span aria-hidden="true">{time === 'Night' ? '☾' : '☀'}</span>{time}</button>
          <button onClick={() => setReset(value => value + 1)}><span aria-hidden="true">↺</span>Reset</button>
        </div>
      </div>
    </Sheet>
    <Sheet open={options} onClose={() => setOptions(false)} labelledBy="home-options-title" className="home-options">
      <button className="close-button" aria-label="Close View Options" onClick={() => setOptions(false)}>×</button>
      <h2 id="home-options-title">View Options</h2>
      <label className="home-option" htmlFor="home-people" aria-label="Show all members"><span><strong>Show all members</strong><small>See everyone in the scene</small></span><input id="home-people" type="checkbox" role="switch" checked={people} onChange={e => setPeople(e.target.checked)} /></label>
      <label className="home-option" htmlFor="home-names" aria-label="Show name labels"><span><strong>Show name labels</strong><small>Display names above avatars</small></span><input id="home-names" type="checkbox" role="switch" checked={names} disabled={!people} onChange={e => setNames(e.target.checked)} /></label>
      <fieldset className="home-time-options"><legend>Time of day</legend>{TIMES.map(value => <button key={value} aria-pressed={time === value} onClick={() => setTime(value)}>{value}</button>)}</fieldset>
      <button className="home-option-reset" onClick={() => setReset(value => value + 1)}>↺ Reset view</button>
      <button className="primary-button" onClick={() => setOptions(false)}>Done <span aria-hidden="true">✓</span></button>
    </Sheet>
  </>;
}

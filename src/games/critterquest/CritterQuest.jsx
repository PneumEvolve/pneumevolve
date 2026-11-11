import { useEffect, useRef } from 'react';
import { startGame } from './engine.js';
import './critterquest.css';

// Critter Quest — a Pokemon-style adventure made with my son.
// The engine draws into this markup and manages it directly; React only mounts it once.
export default function CritterQuest() {
  const rootRef = useRef(null);
  const dev = import.meta.env.DEV || new URLSearchParams(window.location.search).has('dev');

  useEffect(() => {
    const prevTitle = document.title;
    document.title = 'Critter Quest · PneumEvolve';
    const stop = startGame(rootRef.current, { dev });
    return () => { stop(); document.title = prevTitle; };
  }, [dev]);

  return (
    <div className="cq" ref={rootRef}>
      <main className="cq-console">
        <div className="cq-brand"><h1>CRITTER QUEST</h1><span>Version 0.3</span></div>

        <div className="cq-bezel">
          <div className="cq-bezel-top"><span className="cq-led" />Power</div>
          <div className="cq-screen" aria-label="Game screen">
            <canvas data-cq="canvas" width="240" height="160" />

            <div className="cq-banner" data-cq="banner" hidden>Choose your partner!</div>

            <div className="cq-hud cq-hud-enemy" data-cq="enemyBox" hidden>
              <div className="cq-hud-row"><span data-cq="eName" /><small data-cq="eLv" /></div>
              <div className="cq-types" data-cq="eTypes" />
              <div className="cq-bar"><b>HP</b><div className="cq-track"><div className="cq-fill" data-cq="eFill" /></div></div>
            </div>

            <div className="cq-hud cq-hud-player" data-cq="playerBox" hidden>
              <div className="cq-hud-row"><span data-cq="pName" /><small data-cq="pLv" /></div>
              <div className="cq-types" data-cq="pTypes" />
              <div className="cq-bar"><b>HP</b><div className="cq-track"><div className="cq-fill" data-cq="pFill" /></div></div>
              <div className="cq-bar">
                <b className="cq-xp">XP</b>
                <div className="cq-track cq-thin"><div className="cq-fill cq-xp-fill" data-cq="xpFill" /></div>
                <span className="cq-nums" data-cq="pNums" />
              </div>
            </div>

            <div className="cq-panel" data-cq="panel" hidden>
              <div className="cq-panel-head"><span data-cq="panelTitle">Your team</span><small>A pick · B back</small></div>
              <div className="cq-panel-grid" data-cq="panelGrid" />
            </div>

            <div className="cq-textbox" data-cq="textbox" data-layout="msg" hidden>
              <div className="cq-msg" data-cq="msg" />
              <div className="cq-menu" data-cq="menu" hidden />
              <span className="cq-more" data-cq="more" hidden>▼</span>
            </div>
          </div>
        </div>

        <div className="cq-controls">
          <div className="cq-dpad" aria-label="Direction pad">
            <button type="button" className="cq-up" data-btn="up" aria-label="Up">▲</button>
            <button type="button" className="cq-left" data-btn="left" aria-label="Left">◀</button>
            <span className="cq-hub" />
            <button type="button" className="cq-right" data-btn="right" aria-label="Right">▶</button>
            <button type="button" className="cq-down" data-btn="down" aria-label="Down">▼</button>
          </div>
          <div className="cq-ab">
            <div className="cq-key cq-key-b"><button type="button" data-btn="b" aria-label="B button">B</button></div>
            <div className="cq-key"><button type="button" data-btn="a" aria-label="A button">A</button></div>
          </div>
        </div>
        <p className="cq-hint">
          <kbd>Arrows</kbd> or <kbd>WASD</kbd> walk · <kbd>Z</kbd>/<kbd>Space</kbd> = A · <kbd>X</kbd> = B (menu)
          <br />Your progress saves in this browser.
        </p>
      </main>

      {dev && (
        <section className="cq-dev" aria-label="Test tools">
          <span className="cq-dev-label">Test tools</span>
          <button type="button" data-cq="devLv1">Level +1</button>
          <button type="button" data-cq="devLv5">Level +5</button>
          <button type="button" data-cq="devBattle">Battle now</button>
          <button type="button" data-cq="devPods">+10 pods</button>
          <button type="button" data-cq="devNew">New game</button>
          <span className="cq-dev-note">Only shown in dev or with ?dev in the URL. They act on your lead critter while walking.</span>
        </section>
      )}
    </div>
  );
}

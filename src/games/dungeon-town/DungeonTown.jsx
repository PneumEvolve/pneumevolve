import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { createDungeonTownGame } from './createDungeonTownGame';

export default function DungeonTown() {
  const containerRef = useRef(null);
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Lock the page while the game is open (no scrolling / pull-to-refresh on mobile)
    const prevOverflow = document.body.style.overflow;
    const prevOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';

    // Show any crash on screen, so it's visible on a phone with no dev tools
    const onError = (e) => setError(String(e?.error?.stack || e?.message || e?.reason || e));
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onError);

    let game = null;
    try {
      game = createDungeonTownGame(el, { onExit: () => navigate('/') });
    } catch (e) {
      setError(String(e?.stack || e));
    }

    // If the game box ends up with no size, say so instead of showing a black screen
    const sizeCheck = setTimeout(() => {
      const canvas = el.querySelector('canvas');
      if (!canvas) setError((prev) => prev || 'No game canvas was created.');
      else if (!el.clientWidth || !el.clientHeight || !canvas.width || !canvas.height) {
        setError((prev) => prev || `Game area has no size: box ${el.clientWidth}x${el.clientHeight}, canvas ${canvas.width}x${canvas.height}`);
      }
    }, 2000);

    return () => {
      clearTimeout(sizeCheck);
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onError);
      if (game) game.destroy(true);
      document.body.style.overflow = prevOverflow;
      document.body.style.overscrollBehavior = prevOverscroll;
    };
  }, [navigate]);

  // Rendered straight into <body> so no parent layout (transforms, overflow, page
  // transitions, navbars) can shrink or hide the full-screen game.
  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100dvh',
        zIndex: 9999,
        background: '#0e1013',
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
      }}
    >
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      {error && (
        <div
          style={{
            position: 'absolute',
            inset: 12,
            overflow: 'auto',
            background: 'rgba(0,0,0,0.85)',
            color: '#ff8c8c',
            font: '12px/1.4 ui-monospace, monospace',
            padding: 12,
            borderRadius: 8,
            whiteSpace: 'pre-wrap',
          }}
        >
          <b style={{ color: '#fff' }}>Dungeon Town hit an error — send this to Claude:</b>
          {'\n\n'}
          {error}
          {'\n\n'}
          <button onClick={() => navigate('/')} style={{ color: '#fff', textDecoration: 'underline' }}>
            Back to home
          </button>
        </div>
      )}
    </div>,
    document.body
  );
}
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createDungeonTownGame } from '../games/dungeon-town/createDungeonTownGame';

export default function DungeonTown() {
  const containerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Lock the page while the game is open (no scrolling / pull-to-refresh on mobile)
    const prevOverflow = document.body.style.overflow;
    const prevOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';

    const game = createDungeonTownGame(el, {
      onExit: () => navigate('/'),
    });

    return () => {
      game.destroy(true);
      document.body.style.overflow = prevOverflow;
      document.body.style.overscrollBehavior = prevOverscroll;
    };
  }, [navigate]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: '#0e1013',
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
      }}
    />
  );
}
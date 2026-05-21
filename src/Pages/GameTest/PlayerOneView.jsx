// src/Pages/GameTest/PlayerOneView.jsx
import React, { useEffect, useRef } from "react";
import { useGameTestRoom } from "./useGameTestRoom";
import {
  WORLD_H, CHUNK_W, GROUND_Y, RUNNER_R,
  seededRand, generateChunk,
  surfaceUnder, touchesRedStroke, updateEnemies,
} from "./gameEngine";



export default function PlayerOneView () {
    
    const PlayerGame = () => {
  // 1. Initial player position (centered in a 500x500 box)
  const [position, setPosition] = useState({ x: 250, y: 250 });
  
  // 2. Event listener for handling movement
  useEffect(() => {
    const handleKeyDown = (e) => {
      const speed = 10;
      setPosition((prev) => {
        let newX = prev.x;
        let newY = prev.y;

        switch (e.key.toLowerCase()) {
          case 'w':
            newY = Math.max(0, prev.y - speed); // Prevent going past top
            break;
          case 's':
            newY = Math.min(460, prev.y + speed); // Prevent going past bottom
            break;
          case 'a':
            newX = Math.max(0, prev.x - speed); // Prevent going past left
            break;
          case 'd':
            newX = Math.min(460, prev.x + speed); // Prevent going past right
            break;
          default:
            return prev;
        }

        return { x: newX, y: newY };
      });
    };

    // Attach listener to window
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 3. Styles
  const gameAreaStyle = {
    width: '500px',
    height: '500px',
    backgroundColor: '#282c34',
    position: 'relative',
    border: '3px solid #61dafb',
    borderRadius: '8px',
    margin: '20px auto',
    overflow: 'hidden',
  };

  const playerStyle = {
    position: 'absolute',
    width: '40px',
    height: '40px',
    backgroundColor: '#61dafb',
    borderRadius: '50%',
    left: `${position.x}px`,
    top: `${position.y}px`,
    transition: 'left 0.05s linear, top 0.05s linear', // Smooth movement
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <h2>WASD Player Mover</h2>
      <p>Use <b>W, A, S, D</b> on your keyboard to move the circle.</p>
      <div style={gameAreaStyle}>
        <div style={playerStyle}></div>
      </div>
    </div>
  );
};

}
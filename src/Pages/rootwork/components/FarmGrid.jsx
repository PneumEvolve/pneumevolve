// src/Pages/rootwork/components/FarmGrid.jsx
 
import React from "react";
import Plot from "./Plot";
 
const GRID_STYLES = `
  @keyframes rw-pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50%       { opacity: 0.4; transform: scale(1.04); }
  }
  @keyframes rw-pop {
    0%   { transform: scale(0.85); opacity: 0; }
    70%  { transform: scale(1.06); opacity: 1; }
    100% { transform: scale(1);    opacity: 1; }
  }
  .rw-plot-enter {
    animation: rw-pop 0.25s ease forwards;
  }
`;
 
function getGridColumns(plotCount) {
  if (plotCount <= 1)  return 1;
  if (plotCount <= 4)  return 2;
  if (plotCount <= 9)  return 3;
  if (plotCount <= 16) return 4;
  return 5;
}
 
export default function FarmGrid({ farm, game, onPlant, onHarvest, onTend, tendMode }) {
  const cols = getGridColumns(farm.plots.length);
 
  return (
    <>
      <style>{GRID_STYLES}</style>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: "8px",
          width: "100%",
          maxWidth: `${cols * 80}px`,
          margin: "0 auto",
        }}
      >
        {farm.plots.map((plot, idx) => (
          <div key={plot.id} className="rw-plot-enter" style={{ animationDelay: `${idx * 20}ms` }}>
            <Plot
              plot={plot}
              farm={farm}
              game={game}
              onPlant={onPlant}
              onHarvest={onHarvest}
              onTend={onTend}
              tendMode={tendMode}
            />
          </div>
        ))}
      </div>
    </>
  );
}
import React from "react";

export default function BugDisplay({ bugs, onBugClick }) {
  return (
    <>
      {bugs.map((bug, index) => (
        <div
          key={index}
          onClick={() => onBugClick(bug.x, bug.y)}
          style={{
            position: "absolute",
            left: `${bug.y * 60 + 15}px`,
            top: `${bug.x * 60 + 15}px`,
            fontSize: "24px", // bug size
            cursor: "pointer",
            zIndex: 40,
          }}
        >
          🐛
        </div>
      ))}
    </>
  );
}
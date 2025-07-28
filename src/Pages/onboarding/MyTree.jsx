import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";

export default function MyTree() {
  const { isLoggedIn } = useAuth();
  const [treeStage, setTreeStage] = useState(0);
  const [activeOrb, setActiveOrb] = useState(null);

  useEffect(() => {
    if (!isLoggedIn) {
      setTreeStage(0);
    } else {
      const visitedTools = localStorage.getItem("visitedTools") === "true";
      const visitedDream = localStorage.getItem("visitedDream") === "true";
      const communityUnlocked = visitedTools && visitedDream;

      if (communityUnlocked) {
        localStorage.setItem("communitySurveyComplete", "true");
        setTreeStage(2);
      } else {
        setTreeStage(1);
      }
    }
  }, [isLoggedIn]);

  const fireballs = [
    [ // tree0_bg — not logged in
      {
        id: "signup",
        src: "/fireball.png",
        top: "70%",
        left: "50%",
        label: "Plant the Seed",
        link: "/signup",
      },
    ],
    [ // tree1_bg — logged in
      {
        id: "tools",
        src: "/fireball.png",
        top: "70%",
        left: "30%",
        label: "My Tools",
        link: "/tools",
      },
      {
        id: "dream",
        src: "/purple_fireball.png",
        top: "70%",
        left: "70%",
        label: "Dream Machine",
        link: "/dreammachine",
      },
    ],
    [ // tree2_bg — logged in + visited both
      {
        id: "tools",
        src: "/fireball.png",
        top: "70%",
        left: "20%",
        label: "My Tools",
        link: "/tools",
      },
      {
        id: "dream",
        src: "/purple_fireball.png",
        top: "70%",
        left: "50%",
        label: "Dream Machine",
        link: "/dreammachine",
      },
      {
        id: "community",
        src: "/green_fireball.png",
        top: "70%",
        left: "80%",
        label: "Communities",
        link: "/communities",
      },
    ],
  ];

  const handleClick = (e, id, link) => {
    if (id === "tools") {
      localStorage.setItem("visitedTools", "true");
    }
    if (id === "dream") {
      localStorage.setItem("visitedDream", "true");
    }

    if (window.innerWidth <= 768) {
      if (activeOrb !== id) {
        e.preventDefault();
        setActiveOrb(id);
        return;
      }
    }

    window.location.href = link;
  };

  return (
    <>
      <style>{`
        html, body {
          margin: 0;
          padding: 0;
          overflow-x: hidden;
          background-color: black;
        }

        .full-screen-container {
          position: relative;
          width: 100vw;
          min-height: 100vh;
          background-color: black;
        }

        .tree-img {
          width: 100%;
          height: auto;
          display: block;
        }

        .orb-container {
          position: absolute;
          transform: translate(-50%, -50%);
          z-index: 10;
        }

        .fireball {
          width: 100px;
          height: 100px;
          animation: pulse 3s ease-in-out infinite;
          transition: transform 0.3s ease;
          cursor: pointer;
        }

        .fireball:hover {
          transform: scale(1.2);
        }

        @keyframes pulse {
          0%, 100% {
            filter: brightness(1);
          }
          50% {
            filter: brightness(1.25);
          }
        }

        .orb-label {
          position: absolute;
          top: 110%;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 0.9rem;
          white-space: nowrap;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.3s;
        }

        .orb-container:hover .orb-label {
          opacity: 1;
        }

        @media (hover: none) {
          .orb-label {
            opacity: 0 !important;
          }

          .orb-label.active {
            opacity: 1 !important;
          }
        }
      `}</style>

      <div className="full-screen-container">
        <img
          src={`/tree${treeStage}_bg.png`}
          alt="Tree of Life"
          className="tree-img"
        />

        {fireballs[treeStage].map(({ id, src, top, left, label, link }) => (
          <div
            key={id}
            className="orb-container"
            style={{ top, left }}
            onClick={(e) => handleClick(e, id, link)}
          >
            <img src={src} alt={label} className="fireball" />
            <div className={`orb-label ${activeOrb === id ? "active" : ""}`}>
              {label}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
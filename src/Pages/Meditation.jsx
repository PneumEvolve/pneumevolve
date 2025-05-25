// src/pages/Meditation.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const getNextMeditationWindow = () => {
  const now = new Date();
  const utcNow = new Date(now.toISOString());

  const nextMidnight = new Date(utcNow);
  nextMidnight.setUTCHours(0, 0, 0, 0);

  const nextNoon = new Date(utcNow);
  nextNoon.setUTCHours(12, 0, 0, 0);

  let next;
  if (utcNow < nextMidnight) {
    next = nextMidnight;
  } else if (utcNow < nextNoon) {
    next = nextNoon;
  } else {
    nextMidnight.setUTCDate(nextMidnight.getUTCDate() + 1);
    next = nextMidnight;
  }

  return next;
};

const Meditation = () => {
  const [timeLeft, setTimeLeft] = useState(0);
  const [inSession, setInSession] = useState(false);

  useEffect(() => {
    const calculateTime = () => {
      const now = new Date();
      const nextSession = getNextMeditationWindow();
      const diff = nextSession - now;

      if (diff <= 0) {
        setInSession(true);
        setTimeLeft(5 * 60); // 5 minutes = 300 seconds
      } else {
        setInSession(false);
        setTimeLeft(Math.floor(diff / 1000));
      }
    };

    calculateTime();
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (inSession && prev <= 1) {
          setInSession(false);
          return Math.floor((getNextMeditationWindow() - new Date()) / 1000);
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [inSession]);

  const formatTime = (seconds) => {
    const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
    const secs = String(seconds % 60).padStart(2, "0");
    return `${mins}:${secs}`;
  };
    
    const navigate = useNavigate();
    
  return (
    <div className="max-w-2xl mx-auto p-6 text-center dark:text-white">
      <h1 className="text-4xl font-bold mb-4">🧘 Daily Meditation Timer</h1>
      <p className="mb-6 text-lg">
        Every 12 hours, the world pauses—together. Join for 5 minutes of global silence and peace.
      </p>

      <div className="bg-gray-100 dark:bg-gray-800 p-8 rounded-lg shadow-lg mb-4">
        {inSession ? (
          <h2 className="text-3xl font-bold text-green-500">Meditate Now</h2>
        ) : (
          <h2 className="text-2xl font-semibold">Next Global Session In</h2>
        )}
        <div className="text-5xl font-mono mt-4">
          {formatTime(timeLeft)}
        </div>
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
        Times are synchronized in UTC. You're not alone. Someone is breathing with you.
      </p>
      
      <Button onClick={() => navigate("/Experiments")}>
  ← Back to Experiments
</Button>
    </div>
    
  );
};

export default Meditation;
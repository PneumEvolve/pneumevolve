// src/pages/Experiments.jsx
import React from "react";
import { Link } from "react-router-dom";

const Experiments = () => {
  return (
    <div className="max-w-4xl mx-auto p-6 text-gray-800 dark:text-black">
      <h1 className="text-4xl font-bold mb-4">🧪 Shea’s Living Lab</h1>

      <p className="mb-6 text-lg">
        Welcome to the back room of PneumEvolve — a place for prototypes, strange visions, and things not quite ready for the spotlight. Some of these tools are functional, others are fragments waiting for their next mutation. Nothing here is final. Everything is invitation.
      </p>

      <ul className="space-y-4 text-lg">
        <li>
          🃏 <Link to="/tarot" className="text-blue-500 underline">Tarot Reading</Link> – A mystical portal. Pull cards, see what the current carries.
        </li>
        <li>
          🕊️ <Link to="/meditation" className="text-blue-500 underline">Global Meditation Timer</Link> – Sync in stillness. A 5-minute breath with the world, every 12 hours.
        </li>
        <li>
          🗳️ <Link to="/wechoose" className="text-blue-500 underline">We Choose</Link> – A prototype for transparent, collective decision-making. Vote. Rethink. Rebuild.
        </li>
        <li>
          📖 <Link to="/welearn" className="text-blue-500 underline">We Learn</Link> – Let AI explain laws, policies, and systems without agenda. Truth over spin.
        </li>
        <li>
          🧠 <Link to="/weplan" className="text-blue-500 underline">We Plan</Link> – The synthesis engine. Where ideas merge, clash, and evolve into action.
        </li>
        <li>
          🌱 <Link to="/wegreen" className="text-blue-500 underline">We Green</Link> – Garden together. Share planting wisdom, excess produce, and land-based dreams.
        </li>
        <li>
          🤝 <Link to="/wehelp" className="text-blue-500 underline">We Help</Link> – Ask for or offer help. Local or global, human to human.
        </li>
        <li>
          🛠️ <Link to="/wedo" className="text-blue-500 underline">We Do</Link> – A marketplace of action. Trade skills, collaborate, make something real.
        </li>
      </ul>

      <p className="mt-10 italic text-sm text-gray-500 dark:text-gray-400">
        Experiments are sacred chaos. If something speaks to you, build it. If something’s broken, break it better.
      </p>
    </div>
  );
};

export default Experiments;
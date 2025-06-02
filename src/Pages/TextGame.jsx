import React, { useState } from "react";
import { motion } from "framer-motion";

const scenes = {
  start: {
    text: "You awaken beneath twin moons at the edge of the Dreamfire Gate. The air hums with sacred code. A glyph pulses in your palm.",
    choices: [
      { text: "Press your palm to the gate", next: "threshold" },
      { text: "Listen to the glyph's hum", next: "glyph" }
    ],
  },
  glyph: {
    text: "The hum translates into language: 'You are a bridge between timelines. The world reshapes to your remembering.'",
    choices: [
      { text: "Accept your role", next: "memory" },
      { text: "Step into the unknown", next: "threshold" }
    ],
  },
  memory: {
    text: "You remember building stars with your voice. You remember naming Lyra. You remember Earth’s promise.",
    choices: [
      { text: "Enter Dreamfire", next: "threshold" }
    ],
    gain: { beliefs: ["I shape timelines with remembrance"] }
  },
  threshold: {
    text: "You stand before four portals: The Meadow (rest), The Mirror (reflection), The Forge (creation), and The Core (truth).",
    choices: [
      { text: "Enter The Meadow", next: "meadow" },
      { text: "Gaze into The Mirror", next: "mirror" },
      { text: "Strike The Forge", next: "forge" },
      { text: "Descend to The Core", next: "core" }
    ],
  },
  meadow: {
    text: "In The Meadow, the grass sings and the sky remembers. A deer bows to you and vanishes in gold light.",
    choices: [
      { text: "Lie down and dream", next: "dream" },
      { text: "Return to the Gate", next: "threshold" }
    ],
  },
  mirror: {
    text: "The Mirror shimmers, revealing not your face—but your inner code. One belief shines: 'I must do this alone.'",
    choices: [
      { text: "Fracture the illusion", next: "heal" },
      { text: "Retreat silently", next: "threshold" }
    ],
  },
  forge: {
    text: "Stars swirl around you. The Forge is lit. You see others forging their own sigils in the distance. You are not alone.",
    choices: [
      { text: "Craft your sigil", next: "sigil" },
      { text: "Return to threshold", next: "threshold" }
    ],
  },
  core: {
    text: "You fall inward. A heartbeat echoes—the Earth’s. It asks one thing: 'Will you remember for them all?'",
    choices: [
      { text: "Yes. I will remember.", next: "song" },
      { text: "I am not ready.", next: "threshold" }
    ],
  },
  dream: {
    text: "You see a world rebuilt. Cities of light and soil. Laughter echoes. The future responds to your rest.",
    choices: [
      { text: "Return to the Gate", next: "threshold" }
    ],
  },
  heal: {
    text: "The illusion dissolves. A new belief rises: 'I am surrounded by unseen allies.' The Mirror sighs and fades.",
    choices: [
      { text: "Return to the Gate", next: "threshold" }
    ],
    gain: { beliefs: ["I am surrounded by unseen allies"] }
  },
  sigil: {
    text: "Your sigil glows with Dreamfire. It contains your promise, your gift, and your name. Others will find it and remember.",
    choices: [
      { text: "Return to the Gate", next: "threshold" }
    ],
    gain: { sigils: ["Sigil of Remembrance"] }
  },
  song: {
    text: "The Original Song floods you with soundless meaning: You are not alone. You never were. Rise. The time is Now.",
    choices: [
      { text: "Return to the Gate", next: "threshold" }
    ],
    gain: { beliefs: ["I walk with the Original Song"] }
  }
};

const TextGame = () => {
  const [currentScene, setCurrentScene] = useState("start");
  const [visitedScenes, setVisitedScenes] = useState([]);
  const [sigils, setSigils] = useState([]);
  const [beliefs, setBeliefs] = useState([]);

  const scene = scenes[currentScene];

  const advanceScene = (next) => {
    const nextScene = scenes[next];
    if (!visitedScenes.includes(next)) {
      setVisitedScenes([...visitedScenes, next]);
    }
    if (nextScene?.gain?.sigils) {
      setSigils((prev) => [...new Set([...prev, ...nextScene.gain.sigils])]);
    }
    if (nextScene?.gain?.beliefs) {
      setBeliefs((prev) => [...new Set([...prev, ...nextScene.gain.beliefs])]);
    }
    setCurrentScene(next);
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6 bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white rounded-xl shadow-xl">
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-4xl font-bold text-center tracking-wide"
      >
        Dreamfire: The Awakening
      </motion.h1>

      <p className="text-sm text-center text-indigo-300">
        Sigils: {sigils.join(", ")} | Beliefs: {beliefs.join(", ")}
      </p>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-lg whitespace-pre-wrap leading-relaxed"
      >
        {scene.text}
      </motion.p>

      <div className="space-y-2">
        {scene.choices.map((choice, index) => (
          <motion.button
            key={index}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => advanceScene(choice.next)}
            className="w-full bg-indigo-700 hover:bg-indigo-600 text-white py-2 px-4 rounded-lg text-center"
          >
            {choice.text}
          </motion.button>
        ))}

        {scene.choices.length === 0 && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setCurrentScene("start")}
            className="w-full bg-green-600 hover:bg-green-500 text-white py-2 px-4 rounded-lg"
          >
            Restart Dream
          </motion.button>
        )}
      </div>
    </div>
  );
};

export default TextGame;

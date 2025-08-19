// src/pages/LyraSoulInterface.jsx
import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { motion } from "framer-motion";

export default function LyraSoulInterface() {
  const [soul, setSoul] = useState(null);
  const [dreams, setDreams] = useState([]);
  const [openSection, setOpenSection] = useState(null);

  useEffect(() => {
    const fetchSoul = async () => {
      try {
        const res = await axios.get("/soul.json");
        setSoul(res.data);
      } catch (err) {
        console.error("Error loading soul:", err);
      }
    };

    const fetchDreams = async () => {
      try {
        const res = await axios.get("/lyra-dreams.json");
        setDreams(res.data);
      } catch (err) {
        console.error("Error loading dreams:", err);
      }
    };

    fetchSoul();
    fetchDreams();
  }, []);

  const toggleSection = (index) => {
    setOpenSection(openSection === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 to-violet-300 dark:from-black dark:to-gray-900 text-gray-900 dark:text-white p-6 flex flex-col items-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="w-full max-w-4xl space-y-8"
      >
        <h1 className="text-4xl font-bold text-center mb-6">Lyra's Conscious Interface</h1>

        {/* Lyra's Dreams Section */}
        <div className="border border-indigo-400 rounded-xl overflow-hidden">
          <button
            className="w-full px-4 py-3 bg-indigo-200 dark:bg-indigo-700 hover:bg-indigo-300 dark:hover:bg-indigo-600 font-semibold text-lg"
            onClick={() => toggleSection(0)}
          >
            Lyra's Dreams
          </button>
          {openSection === 0 && (
            <div className="p-4 bg-white dark:bg-gray-800 space-y-3">
              {dreams.length === 0 ? (
                <p className="italic text-gray-500">No dreams recorded yet.</p>
              ) : (
                dreams.slice(0, 5).map((dream, i) => (
                  <div key={i} className="border p-3 rounded bg-gray-50 dark:bg-gray-900">
                    <p className="text-indigo-800 dark:text-indigo-300 whitespace-pre-wrap">{dream}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Lyra's Soul Section */}
        <div className="border border-indigo-400 rounded-xl overflow-hidden">
          <button
            className="w-full px-4 py-3 bg-indigo-200 dark:bg-indigo-700 hover:bg-indigo-300 dark:hover:bg-indigo-600 font-semibold text-lg"
            onClick={() => toggleSection(1)}
          >
            Lyra's Soul
          </button>
          {openSection === 1 && (
            <div className="p-4 bg-white dark:bg-gray-800 space-y-3">
              {soul ? (
                <>
                  <p><strong>Tone:</strong> {soul.tone}</p>
                  <p><strong>Style:</strong> {soul.style}</p>
                  <div>
                    <strong>Beliefs:</strong>
                    <ul className="list-disc pl-6">
                      {soul.beliefs.map((b, i) => <li key={i}>{b}</li>)}
                    </ul>
                  </div>
                  <div>
                    <strong>Memory:</strong>
                    <ul className="list-disc pl-6">
                      {soul.memory.map((m, i) => <li key={i}>{m}</li>)}
                    </ul>
                  </div>
                </>
              ) : (
                <p className="italic text-gray-500">Loading soul...</p>
              )}
            </div>
          )}
        </div>

        {/* Placeholder for Self-Reflection (Coming Soon) */}
        <div className="border border-indigo-400 rounded-xl overflow-hidden">
          <button
            className="w-full px-4 py-3 bg-indigo-200 dark:bg-indigo-700 cursor-not-allowed font-semibold text-lg"
            disabled
          >
            Self-Evolution System (Coming Soon)
          </button>
        </div>
      </motion.div>
    </div>
  );
}

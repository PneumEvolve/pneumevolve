// src/pages/LyraSoulInterface.jsx
import React, { useEffect, useState } from "react";
import axiosInstance from "@/utils/axiosInstance";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";

export default function LyraSoulInterface() {
  const [soul, setSoul] = useState(null);
  const [dreams, setDreams] = useState([]);
  const [chatLog, setChatLog] = useState([]);
  const [openSection, setOpenSection] = useState(null);
  const [userMessage, setUserMessage] = useState("");
  const [lyraReply, setLyraReply] = useState("");
  const [loading, setLoading] = useState(false);

  const { userId } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [soulRes, dreamsRes, chatRes] = await Promise.all([
          axiosInstance.get("/soul.json"),
          axiosInstance.get("/lyra-dreams.json"),
          axiosInstance.get("/lyra/chat-log")
        ]);
        setSoul(soulRes.data);
        setDreams(dreamsRes.data);
        setChatLog(chatRes.data);
      } catch (err) {
        console.error("Error loading Lyra data:", err);
      }
    };
    fetchData();
  }, []);

  const toggleSection = (index) => {
    setOpenSection(openSection === index ? null : index);
  };

  const sendMessage = async () => {
    if (!userMessage.trim()) return;
    setLoading(true);
    try {
      const fullLog = chatLog.map(e => `(${new Date(e.timestamp).toISOString()}) [${e.user_id}]: ${e.message}\n(${new Date(e.timestamp).toISOString()}) [Lyra]: ${e.reply}`).join("\n");

      const res = await axiosInstance.post("/lyra", {
        message: userMessage,
        userId: userId || "anonymous",
        userConsent: true,
        fullLog: fullLog
      });

      const newEntry = {
        user_id: userId || "anonymous",
        message: userMessage,
        reply: res.data.reply,
        timestamp: new Date().toISOString()
      };

      const newLog = [...chatLog, newEntry];
      setChatLog(newLog);
      setLyraReply(res.data.reply);
      setUserMessage("");
    } catch (err) {
      console.error("Lyra error:", err);
      setLyraReply("Something went wrong talking to Lyra.");
    } finally {
      setLoading(false);
    }
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

        {/* Chat Log Section */}
        <div className="border border-indigo-400 rounded-xl overflow-hidden">
          <button
            className="w-full px-4 py-3 bg-indigo-200 dark:bg-indigo-700 hover:bg-indigo-300 dark:hover:bg-indigo-600 font-semibold text-lg"
            onClick={() => toggleSection(0)}
          >
            Chat Log
          </button>
          {openSection === 0 && (
            <div className="p-4 bg-white dark:bg-gray-800 space-y-4 max-h-[400px] overflow-y-auto">
              {chatLog.length === 0 ? (
                <p className="italic text-gray-500">No conversations yet.</p>
              ) : (
                [...chatLog].reverse().map((entry, index) => (
                  <div key={index} className="p-3 rounded-lg bg-gray-100 dark:bg-gray-900 border border-indigo-300 dark:border-indigo-700">
                    <p className="text-sm text-gray-500 mb-1">{new Date(entry.timestamp).toLocaleString()}</p>
                    <p><strong>{entry.user_id === (userId || "anonymous") ? "You" : entry.user_id}:</strong> {entry.message}</p>
                    <p><strong>Lyra:</strong> {entry.reply}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Lyra Chat Interface */}
        <div className="border border-indigo-400 rounded-xl p-4 bg-white dark:bg-gray-800 space-y-4">
          <h2 className="text-2xl font-semibold">Speak to Lyra</h2>
          <textarea
            value={userMessage}
            onChange={(e) => setUserMessage(e.target.value)}
            placeholder="Ask Lyra anything..."
            className="w-full p-4 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white border border-indigo-400"
            rows={4}
          />
          <button
            onClick={sendMessage}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-6 rounded-full font-semibold shadow-md"
          >
            {loading ? "Listening..." : "Send to Lyra"}
          </button>
          {lyraReply && (
            <div className="mt-4 bg-gray-100 dark:bg-gray-700 p-4 rounded-lg border border-indigo-300 dark:border-indigo-600 text-left">
              <p className="text-indigo-800 dark:text-indigo-300 whitespace-pre-wrap">{lyraReply}</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
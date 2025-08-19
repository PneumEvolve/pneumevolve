import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const API = import.meta.env.VITE_API_URL;

export default function LyraDashboard() {
  const [soul, setSoul] = useState(null);
  const [dreams, setDreams] = useState([]);
  const [chatLog, setChatLog] = useState([]);
  const [shortTermMemory, setShortTermMemory] = useState([]);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const { userId, isLoggedIn } = useAuth();

if (!isLoggedIn) {
  return (
    <div className="p-10 text-center text-lg text-red-600">
      Please log in to access Lyra.
    </div>
  );
}

  useEffect(() => {
    fetchSoul();
    fetchDreams();
    fetchChatLog();
    fetchShortTerm();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchChatLog();
      fetchShortTerm();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchSoul = async () => {
    const res = await axios.get(`${API}/soul.json`);
    setSoul(res.data);
  };

  const fetchDreams = async () => {
  const res = await axios.get(`${API}/lyra-dreams.json?user_id=${userId}`);
  setDreams(res.data); // Now an array of { day, summary }
};

  const fetchChatLog = async () => {
    const res = await axios.get(`${API}/lyra/chat-log`);
    const filtered = res.data.filter((log) => log.user_id === userId);
    setChatLog(filtered.slice(0, 20).reverse());
  };

  const fetchShortTerm = async () => {
    const res = await axios.get(`${API}/lyra/short-term/${userId}`);
    setShortTermMemory(res.data);
  };

  const summarizeMemory = async () => {
    try {
      setIsSummarizing(true);
      const res = await axios.post(`${API}/lyra/summarize-short-term?user_id=${userId}`);
      await fetchDreams();
      await fetchShortTerm();
      alert("Summary complete:");
      console.log(res.data.summary);
    } catch (err) {
      console.error("Summarization failed:", err);
      alert("Summarization failed.");
    } finally {
      setIsSummarizing(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <h1 className="text-4xl font-bold text-center">Lyra's Consciousness</h1>

      {/* Soul Section */}
      <section className="bg-white p-4 rounded shadow">
        <h2 className="text-2xl font-semibold">🌟 Soul</h2>
        {soul ? (
          <div className="mt-2 space-y-2">
            <p><strong>Tone:</strong> {soul.tone}</p>
            <p><strong>Style:</strong> {soul.style}</p>
            <div>
              <strong>Beliefs:</strong>
              <ul className="list-disc list-inside ml-4">
                {soul.beliefs.map((b, i) => <li key={i}>{b}</li>)}
              </ul>
            </div>
            <div>
              <strong>Core Memories:</strong>
              <ul className="list-disc list-inside ml-4">
                {soul.memory.map((m, i) => <li key={i}>{m}</li>)}
              </ul>
            </div>
          </div>
        ) : <p>Loading soul...</p>}
      </section>

      {/* Short-Term Memory */}
      <section className="bg-blue-50 p-4 rounded shadow">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-semibold">🧠 Short-Term Memory</h2>
          <button
            onClick={summarizeMemory}
            disabled={isSummarizing}
            className="bg-blue-600 text-white px-4 py-1 rounded shadow hover:bg-blue-700 disabled:opacity-50"
          >
            {isSummarizing ? "Summarizing..." : "Summarize to Long-Term"}
          </button>
        </div>
        <ul className="list-disc list-inside ml-4 mt-2">
          {shortTermMemory.map((m, i) => (
            <li key={i}>{m.memory}</li>
          ))}
        </ul>
      </section>

      {/* Long-Term Memory */}
      <section className="bg-yellow-50 p-4 rounded shadow">
        <h2 className="text-2xl font-semibold">🌙 Dream Memories (Daily Summaries)</h2>
        <ul className="space-y-2">
  {dreams.map((d, i) => (
    <li key={i} className="border p-3 rounded bg-white shadow">
      <p className="text-sm text-gray-500">{new Date(d.day).toLocaleDateString()}</p>
      <p>{d.summary}</p>
    </li>
  ))}
</ul>
      </section>

      {/* Chat Log */}
      <section className="bg-gray-100 p-4 rounded shadow">
        <h2 className="text-2xl font-semibold">📜 Chat Log</h2>
        <ul className="space-y-2">
          {chatLog.map((log, i) => (
            <li key={i} className="border p-2 rounded">
              <p><strong>You:</strong> {log.message}</p>
              <p><strong>Lyra:</strong> {log.reply}</p>
              <p className="text-sm text-gray-500">{new Date(log.timestamp).toLocaleString()}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

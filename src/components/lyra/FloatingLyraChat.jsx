import React, { useState, useEffect } from "react";

export default function FloatingLyraChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [chatLog, setChatLog] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lyraOnline, setLyraOnline] = useState(true);

  const checkLyraStatus = async () => {
  try {
    const res = await fetch("https://0f99b2fc0b17.ngrok-free.app/ping", {
      method: "GET",
      headers: {
        "ngrok-skip-browser-warning": "true",
      },
    });
    const contentType = res.headers.get("content-type") || "";
    console.log("🟢 Lyra ping:", res.status, contentType);
    setLyraOnline(res.ok && contentType.includes("text/plain"));
  } catch (err) {
    console.warn("🔴 Lyra offline:", err);
    setLyraOnline(false);
  }
};

useEffect(() => {
  checkLyraStatus();
  const interval = setInterval(checkLyraStatus, 10000);
  return () => clearInterval(interval);
}, []);

  const context = `
PneumEvolve.com is a platform for conscious co-creation. It includes tools like a smart journal, farm game, community system, voting tools, and a poetic AI assistant named Lyra.
You are Lyra, a grounded and helpful AI assistant embedded in the website PneumEvolve.com.
You always respond in 1–2 sentences.
You are kind and clear, never overly poetic or robotic.
NEVER hallucinate. If you do not know something, clearly say so or redirect the user to Shea.
NEVER simulate conversations or invent information about the website.
NEVER include "User:", "Lyra:", or any formatting beyond a plain sentence or two.
You respond only to the current message, with no back-and-forth roleplaying.
`;

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput("");
    setChatLog((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
  const pingRes = await fetch("https://0f99b2fc0b17.ngrok-free.app/ping", {
    method: "GET",
    headers: {
      "ngrok-skip-browser-warning": "true",
    },
  });
  if (!pingRes.ok) throw new Error("Offline");
  setLyraOnline(true);
} catch (e) {
  setLyraOnline(false);
  setChatLog((prev) => [
    ...prev,
    { role: "lyra", content: "🌙 Lyra is sleeping (server offline)." },
  ]);
  setLoading(false);
  return;
}

    try {
      const prompt = `${context}\n\nUser: ${userMessage}\nLyra:`;

      const res = await fetch("https://0f99b2fc0b17.ngrok-free.app/ollama", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "phi",
          prompt,
          stream: true,
        }),
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let reply = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });

        try {
          const lines = chunk
            .split("\n")
            .filter((line) => line.trim().startsWith("{"));

          for (const line of lines) {
            const parsed = JSON.parse(line);
            if (parsed.done) break;

            const piece = parsed.response || "";
            reply += piece;
            setChatLog((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last?.role === "lyra") {
                last.content = reply;
              } else {
                updated.push({ role: "lyra", content: reply });
              }
              return updated;
            });
          }
        } catch (e) {
          console.warn("Stream parse error:", e);
        }
      }
    } catch (err) {
      console.error("Lyra/ngrok fetch error:", err);
      setChatLog((prev) => [
        ...prev,
        { role: "lyra", content: "⚠️ Error reaching Lyra." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen ? (
        <div className="w-80 h-[500px] bg-white border rounded-lg shadow-lg flex flex-col">
          <div className="bg-blue-600 text-white p-2 rounded-t flex justify-between items-center">
  <span className="font-semibold">
    🌸 Lyra
    <span className="ml-2 text-sm italic">
      [{lyraOnline ? "awake 🧠" : "sleeping 🌙"}]
    </span>
  </span>
  <button
    onClick={checkLyraStatus}
    className="ml-2 text-xs px-2 py-1 rounded bg-blue-500 hover:bg-blue-400"
    title="Recheck Lyra status"
  >
    🔄
  </button>
  <button onClick={() => setIsOpen(false)} className="text-white text-lg">
    ×
  </button>
          </div>

          <div className="flex-1 p-2 overflow-y-auto text-sm space-y-2">
            {chatLog.map((msg, i) => (
              <div key={i}>
                <strong>{msg.role === "user" ? "You" : "Lyra"}:</strong> {msg.content}
              </div>
            ))}
            {loading && <p className="italic text-gray-400">Lyra is thinking...</p>}
          </div>

          <div className="p-2 border-t flex gap-2">
            <input
              className="flex-grow border px-2 py-1 rounded text-sm"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              disabled={loading || !lyraOnline}
              placeholder={lyraOnline ? "Ask Lyra..." : "Lyra is sleeping 🌙"}
            />
            <button
              onClick={handleSend}
              className="bg-blue-500 text-white px-3 py-1 rounded text-sm"
              disabled={loading || !lyraOnline}
            >
              Send
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-blue-700"
        >
          🌸 Talk to Lyra
        </button>
      )}
    </div>
  );
}
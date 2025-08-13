// src/pages/AaronsPage.jsx
import React, { useRef } from "react";

export default function AaronsPage() {
  const ref = useRef(null);

  // Auto-size the iframe to the document height after it loads
  const onLoad = () => {
    const el = ref.current;
    if (!el) return;
    try {
      const doc = el.contentWindow?.document;
      const h = doc?.documentElement?.scrollHeight || 800;
      el.style.height = Math.max(600, h) + "px";
    } catch {
      // ignore (still works with a fixed height)
    }
  };

  return (
    <div className="min-h-screen p-4">
      <h1 className="text-2xl font-semibold mb-3">Aaron’s Page</h1>
      <iframe
        ref={ref}
        title="Aaron's Page"
        src="/custom/aaron.html"
        onLoad={onLoad}
        className="w-full border rounded bg-white"
        // allow scripts if she uses any:
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
        style={{ minHeight: "70vh" }}
      />
    </div>
  );
}
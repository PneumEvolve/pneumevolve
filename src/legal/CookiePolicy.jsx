import React, { useEffect, useState } from "react";
import { getConsent, setConsent } from "@/lib/consent";

export default function CookiePolicy() {
  const [prefs, setPrefs] = useState(getConsent());

  useEffect(() => {
    const onChange = (e) => setPrefs(e.detail);
    window.addEventListener("pe:consent", onChange);
    return () => window.removeEventListener("pe:consent", onChange);
  }, []);

  const allowAnalytics = () => setPrefs(setConsent({ analytics: true }));
  const essentialOnly = () => setPrefs(setConsent({ analytics: false }));

  return (
    <main className="prose dark:prose-invert max-w-3xl mx-auto p-6">
      <h1>Cookie Policy</h1>
      <p>
        We use necessary cookies for core functionality (security, session, preferences).
        Analytics cookies are optional and load only if you consent.
      </p>

      <h2>Current preference</h2>
      <p>
        <strong>
          {prefs.analytics ? "Analytics allowed" : "Essential only"}
        </strong>
        {prefs.timestamp ? ` • set ${new Date(prefs.timestamp).toLocaleString()}` : ""}
      </p>

      <div className="not-prose flex gap-2 mt-2">
        <button onClick={allowAnalytics} className="px-3 py-2 rounded-lg bg-black text-white dark:bg-white dark:text-black">
          Allow analytics
        </button>
        <button onClick={essentialOnly} className="px-3 py-2 rounded-lg border">
          Essential only
        </button>
      </div>

      <h2>Categories</h2>
      <ul>
        <li><strong>Necessary:</strong> required for login, security, and basic features.</li>
        <li><strong>Analytics (optional):</strong> help us understand usage to improve the product.</li>
      </ul>

      <h2>Questions?</h2>
      <p>Contact <a href="mailto:privacy@pneumevolve.com">privacy@pneumevolve.com</a>.</p>
    </main>
  );
}
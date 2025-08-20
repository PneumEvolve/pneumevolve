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
        This Cookie Policy explains how PneumEvolve (“we”, “our”, “us”) uses cookies 
        and similar technologies. By using our site, you agree to the use of cookies 
        as described here.
      </p>

      <h2>Categories of Cookies</h2>
      <ul>
        <li><strong>Necessary:</strong> Required for core site functions (login, session, security, preferences). These cannot be disabled.</li>
        <li><strong>Analytics (optional):</strong> Help us understand site usage and improve features. Only set with your consent.</li>
      </ul>

      <h2>Your Current Preference</h2>
      <p>
        <strong>{prefs.analytics ? "Analytics allowed" : "Essential only"}</strong>
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

      <h2>Managing Cookies</h2>
      <p>
        You may also manage or disable cookies through your browser settings. 
        However, disabling necessary cookies may affect site functionality.
      </p>

      <h2>Contact</h2>
      <p>
        Questions? Contact us at <a href="mailto:privacy@pneumevolve.com">privacy@pneumevolve.com</a>.
      </p>
    </main>
  );
}
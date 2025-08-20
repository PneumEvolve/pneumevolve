import React, { useEffect, useState } from "react";
import { getConsent, setConsent, needsConsentPrompt } from "@/lib/consent";
import { loadAnalytics, bindAnalyticsAutoload } from "../lib/analytics";

export default function CookieConsent() {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState(getConsent());

  useEffect(() => {
    // Decide once on mount
    const initialPrompt = needsConsentPrompt();
    setOpen(initialPrompt);

    // Ensure your analytics module sets up but doesn't auto-load without consent
    bindAnalyticsAutoload();

    // If already consented to analytics, load it immediately
    const c = getConsent();
    if (!initialPrompt && c.analytics) {
      loadAnalytics();
    }

    // cross-tab & in-app sync
    const onStorage = (e) => {
      if (e.key === "pe_consent_v1") {
        const updated = getConsent();
        setPrefs(updated);
        setOpen(needsConsentPrompt());
      }
    };

    const onCustom = (e) => {
      const updated = e && e.detail ? e.detail : getConsent();
      setPrefs(updated);
      setOpen(needsConsentPrompt());
    };

    window.addEventListener("storage", onStorage, { passive: true });
    window.addEventListener("pe:consent", onCustom);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("pe:consent", onCustom);
    };
  }, []);

  function acceptAll() {
    const updated = setConsent({ analytics: true });
    setPrefs(updated);
    setOpen(false);
    loadAnalytics();
  }

  function rejectAll() {
    const updated = setConsent({ analytics: false });
    setPrefs(updated);
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50">
      <div className="mx-auto max-w-3xl m-4 p-4 rounded-2xl shadow-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold mb-1">Cookies &amp; Privacy</h2>
        <p className="text-sm opacity-90 mb-3">
          We use essential cookies to run the site. May we also use anonymous analytics to improve PneumEvolve?
        </p>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={acceptAll}
            className="px-3 py-2 rounded-lg bg-black text-white dark:bg-white dark:text-black"
          >
            Allow analytics
          </button>
          <button onClick={rejectAll} className="px-3 py-2 rounded-lg border">
            Essential only
          </button>
          <a href="/cookies" className="px-3 py-2 rounded-lg border">
            Learn more
          </a>
        </div>
      </div>
    </div>
  );
}
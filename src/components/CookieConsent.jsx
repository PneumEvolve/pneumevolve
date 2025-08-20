import React, { useEffect, useState } from "react";
import { getConsent, setConsent } from "../lib/consent";
import { loadAnalytics, bindAnalyticsAutoload } from "../lib/analytics";


export default function CookieConsent() {
const [open, setOpen] = useState(false);
const [prefs, setPrefs] = useState(getConsent());


useEffect(() => {
// First render: if no timestamp, show banner
if (!prefs.timestamp) setOpen(true);
bindAnalyticsAutoload();
// Try autoload if already consented
loadAnalytics();
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
<h2 className="text-lg font-semibold mb-1">Cookies & Privacy</h2>
<p className="text-sm opacity-90 mb-3">
We use essential cookies to run the site. May we also use anonymous analytics to improve PneumEvolve?
</p>
<div className="flex gap-2 flex-wrap">
<button onClick={acceptAll} className="px-3 py-2 rounded-lg bg-black text-white dark:bg-white dark:text-black">Allow analytics</button>
<button onClick={rejectAll} className="px-3 py-2 rounded-lg border">Essential only</button>
<a href="/cookies" className="px-3 py-2 rounded-lg border">Learn more</a>
</div>
</div>
</div>
);
}
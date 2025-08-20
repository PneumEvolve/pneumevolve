// /src/lib/consent.ts (or .js)
const COOKIE = "pe_consent";
const VERSION = "v1"; // bump when your policy/categories change
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 12 months
const LS_KEY = "pe_consent_v1";

type Consent = {
  version: string;
  necessary: true;
  analytics: boolean;
  timestamp: number | null;
};

// --- cookie helpers ---
function readCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}
function writeCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${COOKIE_MAX_AGE}; Path=/; Secure; SameSite=Lax`;
}

// --- normalize to expected shape ---
function normalize(obj: any): Consent {
  return {
    version: typeof obj?.version === "string" ? obj.version : VERSION,
    necessary: true,
    analytics: !!obj?.analytics,
    timestamp: typeof obj?.timestamp === "number" ? obj.timestamp : null,
  };
}

// --- public API ---
export function getConsent(): Consent {
  // 1) cookie (source of truth)
  const c = readCookie(COOKIE);
  if (c) {
    try { return normalize(JSON.parse(c)); } catch {}
  }
  // 2) legacy/localStorage
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return normalize(JSON.parse(raw));
  } catch {}
  // 3) default (undecided)
  return { version: VERSION, necessary: true, analytics: false, timestamp: null };
}

export function setConsent(update: Partial<Consent>): Consent {
  const merged: Consent = {
    ...getConsent(),              
    necessary: true,
    analytics: false,
    timestamp: Date.now(),
    ...update,
    version: VERSION,               // enforce (again) after spread
  };
  const json = JSON.stringify(merged);
  writeCookie(COOKIE, json);
  try { localStorage.setItem(LS_KEY, json); } catch {}
  window.dispatchEvent(new CustomEvent("pe:consent", { detail: merged }));
  return merged;
}

export function needsConsentPrompt(): boolean {
  const c = getConsent();
  if (!c.timestamp) return true;        // never decided
  if (c.version !== VERSION) return true; // policy changed
  return false;
}

export function clearConsent() {
  // lets you reopen from a “Privacy settings” link
  document.cookie = `${COOKIE}=; Max-Age=0; Path=/`;
  try { localStorage.removeItem(LS_KEY); } catch {}
}
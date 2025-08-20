const KEY = "pe_consent_v1";


export function getConsent() {
try {
const raw = localStorage.getItem(KEY);
if (!raw) return { necessary: true, analytics: false, timestamp: null };
return JSON.parse(raw);
} catch {
return { necessary: true, analytics: false, timestamp: null };
}
}


export function setConsent(update) {
const merged = { necessary: true, analytics: false, timestamp: Date.now(), ...getConsent(), ...update };
localStorage.setItem(KEY, JSON.stringify(merged));
const event = new CustomEvent("pe:consent", { detail: merged });
window.dispatchEvent(event);
return merged;
}
import { getConsent } from "./consent";


let loaded = false;


export function loadAnalytics() {
const c = getConsent();
if (!c.analytics || loaded) return;
// Inject Plausible only after consent
const s = document.createElement("script");
s.setAttribute("defer", "");
s.dataset.domain = window.location.hostname; // or "pneumevolve.com" if fixed
s.src = "https://plausible.io/js/script.js";
document.head.appendChild(s);
loaded = true;
}


// Listen for consent changes (banner will dispatch pe:consent)
export function bindAnalyticsAutoload() {
window.addEventListener("pe:consent", () => {
loadAnalytics();
});
}
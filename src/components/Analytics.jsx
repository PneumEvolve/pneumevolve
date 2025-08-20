// src/components/Analytics.jsx
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { getConsent } from "@/lib/consent";

const GA_ID = "G-F8Q44YGLQS";

let gtagLoaded = false;

function loadGA() {
  if (gtagLoaded) return;

  // 1) Add the GA script tag ONLY after consent
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(s);

  // 2) Create the stub so we can queue commands before the script finishes loading
  window.dataLayer = window.dataLayer || [];
  function gtag(){ window.dataLayer.push(arguments); }
  window.gtag = gtag;

  // 3) Basic init
  gtag("js", new Date());

  gtagLoaded = true;
}

export default function Analytics() {
  const location = useLocation();

  // Initialize GA only after analytics consent
  useEffect(() => {
    const tryInit = () => {
      const c = getConsent();
      if (!c.analytics) return;           // no consent => do nothing
      loadGA();
      window.gtag("config", GA_ID, {
        page_path: window.location.pathname + window.location.search,
      });
    };

    tryInit();
    const onConsent = () => tryInit();
    window.addEventListener("pe:consent", onConsent);
    return () => window.removeEventListener("pe:consent", onConsent);
  }, []);

  // Track SPA route changes (only if GA was loaded)
  useEffect(() => {
    if (!gtagLoaded || !window.gtag) return;
    window.gtag("config", GA_ID, {
      page_path: location.pathname + location.search,
    });
  }, [location]);

  return null;
}
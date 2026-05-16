// src/components/Analytics.jsx
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const GA_ID = "G-F8Q44YGLQS";

let gtagLoaded = false;

function loadGA() {
  if (gtagLoaded) return;

  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(s);

  window.dataLayer = window.dataLayer || [];
  function gtag(){ window.dataLayer.push(arguments); }
  window.gtag = gtag;

  gtag("js", new Date());

  gtagLoaded = true;
}

export default function Analytics() {
  const location = useLocation();

  useEffect(() => {
    loadGA();
    window.gtag("config", GA_ID, {
      page_path: window.location.pathname + window.location.search,
    });
  }, []);

  useEffect(() => {
    if (!gtagLoaded || !window.gtag) return;
    window.gtag("config", GA_ID, {
      page_path: location.pathname + location.search,
    });
  }, [location]);

  return null;
}
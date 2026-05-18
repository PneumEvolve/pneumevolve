// src/components/PwaManifest.jsx
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const PWA_CONFIGS = {
  "/clear-and-calm": {
    manifest: "/manifest-clearandcalm.json",
    title: "Clear & Calm",
    icon192: "/icons/cc-192.png",
    themeColor: "#0e9aa7",
  },
  "/rootwork": {
    manifest: "/manifest-rootwork.json",
    title: "RootWork",
    icon192: "/icons/rw-192.png",
    themeColor: "#2d6a4f",
  },
};

function setOrCreate(selector, attrs) {
  let el = document.querySelector(selector);
  if (!el) {
    const tag = selector.split("[")[0];
    el = document.createElement(tag);
    document.head.appendChild(el);
  }
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  return el;
}

function remove(selector) {
  document.querySelector(selector)?.remove();
}

export default function PwaManifest() {
  const { pathname } = useLocation();

  useEffect(() => {
    const config = Object.entries(PWA_CONFIGS).find(([route]) =>
      pathname.startsWith(route)
    )?.[1] ?? null;

    if (config) {
      // Manifest
      setOrCreate("link[rel='manifest']", { rel: "manifest", href: config.manifest });
      // iOS icon
      setOrCreate("link[rel='apple-touch-icon']", { rel: "apple-touch-icon", href: config.icon192 });
      // iOS app title (what appears under the icon)
      setOrCreate("meta[name='apple-mobile-web-app-title']", { name: "apple-mobile-web-app-title", content: config.title });
      // iOS standalone mode
      setOrCreate("meta[name='apple-mobile-web-app-capable']", { name: "apple-mobile-web-app-capable", content: "yes" });
      // Theme color (Android)
      setOrCreate("meta[name='theme-color']", { name: "theme-color", content: config.themeColor });
      // Page title
      document.title = config.title;
    } else {
      remove("link[rel='manifest']");
      remove("link[rel='apple-touch-icon']");
      remove("meta[name='apple-mobile-web-app-title']");
      remove("meta[name='apple-mobile-web-app-capable']");
      remove("meta[name='theme-color']");
      document.title = "PneumEvolve – An Experiment in Thinking More Clearly";
    }
  }, [pathname]);

  return null;
}
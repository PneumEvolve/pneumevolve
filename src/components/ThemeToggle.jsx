import { useEffect, useState } from "react";

export default function ThemeToggle({ className = "" }) {
  // 1) Initialize from storage or system preference
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem("theme");
    if (saved) return saved === "dark";
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  });

  // 2) Apply class on <html> whenever dark changes
  useEffect(() => {
    const root = document.documentElement;
    if (dark) root.classList.add("dark");
    else root.classList.remove("dark");
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  // 3) Optional: cross-tab sync
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "theme") setDark(e.newValue === "dark");
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <button
      type="button"
      onClick={() => setDark((v) => !v)}
      className={`px-1.5 py-1 hover:underline !bg-transparent !border-0 !shadow-none ${className}`}
      aria-label="Toggle theme"
    >
      {dark ? "Light" : "Dark"}
    </button>
  );
}
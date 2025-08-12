import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(() =>
    typeof document !== "undefined" ? document.documentElement.classList.contains("dark") : false
  );

  useEffect(() => {
    const root = document.documentElement;
    if (dark) root.classList.add("dark");
    else root.classList.remove("dark");
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (!stored) {
      const prefers = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setDark(prefers);
    } else {
      setDark(stored === "dark");
    }
  }, []);

  return (
    <button
      onClick={() => setDark((v) => !v)}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-zinc-300/70 dark:border-zinc-700/70 bg-white/70 dark:bg-zinc-900/70 backdrop-blur hover:bg-white dark:hover:bg-zinc-900"
      aria-label="Toggle theme"
      title="Toggle theme"
    >
      {dark ? <Sun size={16} /> : <Moon size={16} />}
      <span className="text-sm">{dark ? "Light" : "Dark"}</span>
    </button>
  );
}
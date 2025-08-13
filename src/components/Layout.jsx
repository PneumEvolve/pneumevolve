import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useEffect, useState } from "react";
import Analytics from "./Analytics";
import axios from "axios";
import ThemeToggle from "@/components/ThemeToggle";
import { Menu } from "@headlessui/react";

const API = import.meta.env.VITE_API_URL;

function decodeJWT(token) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export default function Layout() {
  const { isLoggedIn, logout, userEmail } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  const checkToken = () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      logout();
      return;
    }
    const decoded = decodeJWT(token);
    const currentTime = Math.floor(Date.now() / 1000);
    if (!decoded || decoded.exp < currentTime) logout();
  };

  function handleLogout() {
    logout();
    navigate("/login");
  }

  // Initial auth + unread
  useEffect(() => {
    checkToken();
    if (isLoggedIn && userEmail) {
      let cancelled = false;
      axios
        .get(`${API}/inbox/feed/${encodeURIComponent(userEmail)}`)
        .then((res) => {
          const data = Array.isArray(res.data) ? res.data : [];
          const unread = data.reduce((acc, m) => acc + (m.read ? 0 : 1), 0);
          if (!cancelled) {
            setUnreadCount(unread);
            localStorage.setItem("unreadCount", String(unread));
          }
        })
        .catch(() => {
          if (!cancelled) setUnreadCount(0);
        });
      return () => {
        cancelled = true;
      };
    } else {
      setUnreadCount(0);
      localStorage.setItem("unreadCount", "0");
    }
  }, [isLoggedIn, userEmail]);

  // cross-tab + same-tab sync
  useEffect(() => {
    const applyLocalCount = () => {
      const count = parseInt(localStorage.getItem("unreadCount") || "0", 10);
      setUnreadCount(count);
    };
    const onStorage = (e) => {
      if (e.key === "unreadCount") applyLocalCount();
      if (e.key === "access_token") checkToken();
    };
    const onCustom = (e) => {
      const next =
        e?.detail?.count ??
        parseInt(localStorage.getItem("unreadCount") || "0", 10);
      setUnreadCount(next);
    };
    applyLocalCount();
    window.addEventListener("storage", onStorage);
    window.addEventListener("inbox:unreadUpdate", onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("inbox:unreadUpdate", onCustom);
    };
  }, []);

  const location = useLocation();
  const noPaddingRoutes = ["/", "/aestheticlab", "/MyTree"];
  const isFullScreen = noPaddingRoutes.includes(location.pathname);

  return (
    // ⬇️ clamp any accidental wide element (fixes the white gutter)
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-b from-sky-50 to-white dark:from-zinc-950 dark:to-zinc-900 text-zinc-900 dark:text-zinc-100">
      <Analytics />

      {/* Glass header */}
      <header className="sticky top-0 z-40">
  <div className="app-header backdrop-blur border-b">
    <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between text-[var(--text)]">
      <Link to="/home" className="text-xl font-semibold tracking-tight shrink-0">
        PneumEvolve
      </Link>

      {/* All plain-text links; no pills/buttons */}
      <nav className="flex items-center justify-end gap-3 flex-wrap max-w-full text-[var(--text)]">
        <Link className="px-1.5 py-1 hover:underline shrink-0" to="/forge">Forge</Link>
        <Link className="px-1.5 py-1 hover:underline shrink-0" to="/problems">Problems</Link>
        <Link className="px-1.5 py-1 hover:underline shrink-0" to="/blog">Blog</Link>

        <Menu as="div" className="relative shrink-0">
  <Menu.Button className="px-1.5 py-1 hover:underline">Tools ▾</Menu.Button>

  <Menu.Items
    className="absolute right-0 mt-2 w-48 rounded-lg border
               border-zinc-200 dark:border-zinc-800
               bg-white text-zinc-900
               dark:bg-zinc-900 dark:text-zinc-100
               shadow-lg overflow-hidden p-1 z-50"
  >
    <Menu.Item>
      {({ active }) => (
        <Link
          to="/MealPlanning"
          className={`block px-2.5 py-1.5 text-sm rounded
                     ${active ? "bg-zinc-100 dark:bg-zinc-800" : ""}`}
        >
          Meal Planner
        </Link>
      )}
    </Menu.Item>

    <Menu.Item>
      {({ active }) => (
        <Link
          to="/journal"
          className={`block px-2.5 py-1.5 text-sm rounded
                     ${active ? "bg-zinc-100 dark:bg-zinc-800" : ""}`}
        >
          Journal
        </Link>
      )}
    </Menu.Item>

    <Menu.Item>
      {({ active }) => (
        <Link
          to="/projects"
          className={`block px-2.5 py-1.5 text-sm rounded
                     ${active ? "bg-zinc-100 dark:bg-zinc-800" : ""}`}
        >
          Projects
        </Link>
      )}
    </Menu.Item>
  </Menu.Items>
</Menu>

        <div className="shrink-0">
          <ThemeToggle className="!bg-transparent !border-0 !shadow-none !px-0 !py-0 hover:underline" />
        </div>

        {!isLoggedIn ? (
          <>
            <Link className="px-1.5 py-1 hover:underline shrink-0" to="/signup">Sign Up</Link>
            <Link className="px-1.5 py-1 hover:underline shrink-0" to="/login">Login</Link>
          </>
        ) : (
          <>
            <Link to="/Account" className="relative px-1.5 py-1 hover:underline shrink-0">
              Account
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </Link>
            <button onClick={handleLogout} className="px-1.5 py-1 hover:underline text-red-600 shrink-0">
              Logout
            </button>
          </>
        )}
      </nav>
    </div>
  </div>
</header>

      <main className={isFullScreen ? "" : "px-4 py-6"}>
        <div className={isFullScreen ? "" : "mx-auto max-w-6xl"}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
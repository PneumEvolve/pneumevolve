// src/components/Layout.jsx
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useEffect, useState } from "react";
import Analytics from "./Analytics";
import { api } from "@/lib/api";
import ThemeToggle from "./ThemeToggle";
import EnvBadge from "@/components/EnvBadge"; // ⬅️ NEW
import CookieConsent from "@/components/CookieConsent"; // ⬅️ ADDED

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
      api
        .get(`/inbox/feed/${encodeURIComponent(userEmail)}`)
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
  const noPaddingRoutes = ["/", "/aestheticlab", "/MyTree", "/aaron"];
  const isFullScreen = noPaddingRoutes.includes(location.pathname);
  const noChromeRoutes = ["/aaron"];
  const isChromeless = noChromeRoutes.includes(location.pathname);

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-b from-sky-50 to-white dark:from-zinc-950 dark:to-zinc-900 text-zinc-900 dark:text-zinc-100">
      <Analytics />

      {!isChromeless && (
        <header className="sticky top-0 z-40">
          <div className="app-header backdrop-blur border-b">
            <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
              {/* Left: Home */}
              <Link to="/" className="text-xl font-semibold tracking-tight shrink-0">
                PneumEvolve
              </Link>

              {/* Right: Journal → Forge → Blog → Map → Light/Dark → Account/Login/Signup */}
              <nav className="flex items-center gap-4 flex-wrap text-[var(--text)]">
                <Link
                  className="px-1.5 py-1 hover:underline shrink-0"
                  to={isLoggedIn ? "/journal" : "/signup"}
                >
                  Journal
                </Link>
                <Link className="px-1.5 py-1 hover:underline shrink-0" to="/forge">
                  Forge
                </Link>
                <Link className="px-1.5 py-1 hover:underline shrink-0" to="/blog">
                  Blog
                </Link>
                <Link className="px-1.5 py-1 hover:underline shrink-0" to="/sitemap">
                  Map
                </Link>

                <span className="shrink-0">
                  <ThemeToggle className="!bg-transparent !border-0 !shadow-none !px-0 !py-0 hover:underline" />
                </span>

                {!isLoggedIn ? (
                  <div className="flex items-center gap-3">
                    <Link className="px-1.5 py-1 hover:underline shrink-0" to="/login">
                      Login
                    </Link>
                    <Link className="px-1.5 py-1 hover:underline shrink-0" to="/signup">
                      Sign Up
                    </Link>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Link to="/Account" className="relative px-1.5 py-1 hover:underline shrink-0">
                      Account
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                          {unreadCount}
                        </span>
                      )}
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="px-1.5 py-1 hover:underline text-red-600 shrink-0"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </nav>
            </div>
          </div>
        </header>
      )}

      <main className={isFullScreen ? "" : "px-4 py-6"}>
        <div className={isFullScreen ? "" : "mx-auto max-w-6xl"}>
          <Outlet />
        </div>
      </main>

      {/* ⬇️ Env badge (hide on chromeless pages like /aaron) */}
      {!isChromeless && <EnvBadge />}

      {/* ⬇️ Cookie consent banner (fixed at bottom, loads on every page) */}
      <CookieConsent />
    </div>
  );
}
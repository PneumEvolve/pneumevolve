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
      const next = e?.detail?.count ?? parseInt(localStorage.getItem("unreadCount") || "0", 10);
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

  // remember last route
  useEffect(() => {
    const excluded = ["/login", "/signup", "/logout"];
    if (!excluded.includes(location.pathname)) {
      localStorage.setItem("lastVisitedPath", location.pathname);
    }
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white dark:from-zinc-950 dark:to-zinc-900 text-zinc-900 dark:text-zinc-100">
      <Analytics />

      {/* Glass header */}
      <header className="sticky top-0 z-40">
        <div className="backdrop-blur bg-white/70 dark:bg-zinc-900/70 border-b border-zinc-200/70 dark:border-zinc-800/70">
          <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
            <Link to="/home" className="text-xl font-semibold tracking-tight">
              PneumEvolve
            </Link>

            <nav className="flex items-center gap-2">
              
              <Link className="hover:underline px-2 py-1 rounded" to="/forge">
                Forge
              </Link>
              <Link className="hover:underline px-2 py-1 rounded" to="/problems">
                Problems
              </Link>
              <Link className="hover:underline px-2 py-1 rounded" to="/blog">
                Blog
              </Link>

              {/* Tools dropdown */}
              <Menu as="div" className="relative">
                <Menu.Button className="px-2 py-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800">
                  Tools ▾
                </Menu.Button>
                <Menu.Items className="absolute right-0 mt-2 w-44 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg overflow-hidden">
                  <Menu.Item>
                    {({ active }) => (
                      <Link
                        to="/MealPlanning"
                        className={`block px-3 py-2 text-sm ${active ? "bg-zinc-100 dark:bg-zinc-800" : ""}`}
                      >
                        Meal Planner
                      </Link>
                    )}
                  </Menu.Item>
                  <Menu.Item>
                    {({ active }) => (
                      <Link
                        to="/journal"
                        className={`block px-3 py-2 text-sm ${active ? "bg-zinc-100 dark:bg-zinc-800" : ""}`}
                      >
                        Journal
                      </Link>
                    )}
                  </Menu.Item>
                  <Menu.Item>
                    {({ active }) => (
                      <Link
                        to="/projects"
                        className={`block px-3 py-2 text-sm ${active ? "bg-zinc-100 dark:bg-zinc-800" : ""}`}
                      >
                        Projects
                      </Link>
                    )}
                  </Menu.Item>
                </Menu.Items>
              </Menu>

              

              <ThemeToggle />

              {!isLoggedIn ? (
                <>
                  <Link className="hover:underline px-2 py-1 rounded text-blue-600" to="/signup">
                    Sign Up
                  </Link>
                  <Link className="hover:underline px-2 py-1 rounded text-blue-600" to="/login">
                    Login
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/Account" className="relative px-2 py-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800">
                    Account
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </Link>
                  <button onClick={handleLogout} className="hover:underline px-2 py-1 rounded text-red-600">
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
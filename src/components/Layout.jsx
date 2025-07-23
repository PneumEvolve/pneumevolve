import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useEffect, useState } from "react";
import Analytics from "./Analytics";
import axios from "axios";

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
  } catch (e) {
    return null;
  }
}

const API = import.meta.env.VITE_API_URL;

export default function Layout() {
  const { isLoggedIn, userId, logout } = useAuth();
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
    if (!decoded || decoded.exp < currentTime) {
      logout();
    }
  };

  function handleLogout() {
    logout();
    navigate("/login");
  }

  useEffect(() => {
    checkToken();

    if (isLoggedIn && userId) {
      axios
        .get(`${API}/inbox/${userId}`)
        .then((res) => {
          const unread = res.data.filter((msg) => !msg.read).length;
          setUnreadCount(unread);
        })
        .catch((err) => {
          console.error("Failed to load inbox count:", err);
        });
    }

    window.addEventListener("storage", checkToken);
    return () => window.removeEventListener("storage", checkToken);
  }, [isLoggedIn, userId]);

  useEffect(() => {
  const handleStorageUpdate = () => {
    const count = parseInt(localStorage.getItem("unreadCount") || "0");
    setUnreadCount(count);
  };

  handleStorageUpdate(); // Load initial value on mount

  window.addEventListener("storage", handleStorageUpdate);
  return () => window.removeEventListener("storage", handleStorageUpdate);
}, []);

const location = useLocation();

useEffect(() => {
  const excludedPaths = ["/login", "/signup", "/logout"];
  if (!excludedPaths.includes(location.pathname)) {
    localStorage.setItem("lastVisitedPath", location.pathname);
  }
}, [location.pathname]);

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <Analytics />
      <header className="bg-white shadow p-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <h1 className="text-2xl font-bold text-center sm:text-left">PneumEvolve</h1>
          <nav className="flex flex-wrap justify-center sm:justify-end gap-3 text-sm">
            <Link to="/" className="hover:underline">Home</Link>
            <Link to="/communities" className="hover:underline">Community</Link>
            <Link to="/farmgame" className="hover:underline">Game</Link>
            <Link to="/blog" className="hover:underline">Blog</Link>
            <Link to="/projects" className="hover:underline">Projects</Link>
            <Link to="/journal" className="hover:underline">Journal</Link>
            <Link to="/MealPlanning" className="hover:underline">MealPlan</Link>
            {!isLoggedIn ? (
              <>
                <Link to="/signup" className="hover:underline text-blue-600">Sign Up</Link>
                <Link to="/login" className="hover:underline text-blue-600">Login</Link>
              </>
            ) : (
              <>
                <Link to="/Account" className="hover:underline relative flex items-center">
  Account
  {unreadCount > 0 && (
    <span className="ml-1 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
      {unreadCount}
    </span>
  )}
</Link>
                <button onClick={handleLogout} className="hover:underline text-red-600">
                  Logout
                </button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
}
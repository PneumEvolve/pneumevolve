import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useEffect } from "react";
import Analytics from "./Analytics";

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

export default function Layout() {
  const { isLoggedIn, logout } = useAuth();
  const navigate = useNavigate();

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
    window.addEventListener("storage", checkToken);
    return () => window.removeEventListener("storage", checkToken);
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <Analytics />
      <header className="bg-white shadow p-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <h1 className="text-2xl font-bold text-center sm:text-left">PneumEvolve</h1>
          <nav className="flex flex-wrap justify-center sm:justify-end gap-3 text-sm">
            <Link to="/" className="hover:underline">Home</Link>
            <Link to="/communities" className="hover:underline">Community</Link>
            <Link to="/game" className="hover:underline">Game</Link>
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
                <Link to="/Account" className="hover:underline">Account</Link>
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
import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useEffect } from "react";

export default function Layout() {
  const { isLoggedIn, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  // Re-check token on load and on storage change
  useEffect(() => {
    const checkToken = () => {
      const token = localStorage.getItem("token");
      if (!token) {
        logout();
      }
    };

    // Check on mount
    checkToken();

    // Listen for token changes across tabs
    window.addEventListener("storage", checkToken);

    // Cleanup
    return () => {
      window.removeEventListener("storage", checkToken);
    };
  }, [logout]);

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <header className="bg-white shadow p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">PneumEvolve</h1>
        <nav className="space-x-4">
          <Link to="/" className="hover:underline">Home</Link>
          <Link to="/DreamMachine" className="hover:underline">WeDream</Link>
          <Link to="/wetalk" className="hover:underline">WeTalk</Link>
          <Link to="/smartjournal" className="hover:underline">Journal</Link>
          <Link to="/MealPlanning" className="hover:underline">MealPlan</Link>
          {!isLoggedIn ? (
            <>
              <Link to="/signup" className="hover:underline text-blue-600">Sign Up</Link>
              <Link to="/login" className="hover:underline text-blue-600">Login</Link>
            </>
          ) : (
            <button onClick={handleLogout} className="hover:underline text-red-600">
              Logout
            </button>
          )}
        </nav>
      </header>

      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
}
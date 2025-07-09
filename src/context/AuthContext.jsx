// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [userId, setUserId] = useState(() => {
    const storedId = localStorage.getItem("user_id");
    return storedId ? parseInt(storedId, 10) : null;
  });
  const [userEmail, setUserEmail] = useState(localStorage.getItem("user_email"));
  const [isLoggedIn, setIsLoggedIn] = useState(!!token);

  useEffect(() => {
    // Sync token and user info with localStorage
    if (token) {
      localStorage.setItem("token", token);
      if (userId !== null) localStorage.setItem("user_id", userId.toString());
      if (userEmail) localStorage.setItem("user_email", userEmail);
    } else {
      localStorage.removeItem("token");
      localStorage.removeItem("user_id");
      localStorage.removeItem("user_email");
    }
    setIsLoggedIn(!!token);
  }, [token, userId, userEmail]);

  // Listen for logout/login from other tabs
  useEffect(() => {
    const syncAuthState = () => {
      setToken(localStorage.getItem("token"));
      setUserId(() => {
        const storedId = localStorage.getItem("user_id");
        return storedId ? parseInt(storedId, 10) : null;
      });
      setUserEmail(localStorage.getItem("user_email"));
      setIsLoggedIn(!!localStorage.getItem("token"));
    };

    window.addEventListener("storage", syncAuthState);
    return () => window.removeEventListener("storage", syncAuthState);
  }, []);

  const login = (newToken, id, email) => {
    setToken(newToken);
    setUserId(id);
    setUserEmail(email);
    localStorage.setItem("token", newToken);
    localStorage.setItem("user_id", id.toString());
    localStorage.setItem("user_email", email);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user_id");
    localStorage.removeItem("user_email");
    setToken(null);
    setUserId(null);
    setUserEmail(null);
    setIsLoggedIn(false);
  };

  return (
    <AuthContext.Provider
      value={{ token, isLoggedIn, login, logout, userId, userEmail }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext();

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

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [userId, setUserId] = useState(() => {
    const storedId = localStorage.getItem("user_id");
    return storedId ? parseInt(storedId, 10) : null;
  });
  const [userEmail, setUserEmail] = useState(localStorage.getItem("user_email"));
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    const decoded = decodeJWT(token);
    return !!decoded && decoded.exp > Math.floor(Date.now() / 1000);
  });

  useEffect(() => {
    if (token) {
      const decoded = decodeJWT(token);
      if (decoded && decoded.exp > Math.floor(Date.now() / 1000)) {
        localStorage.setItem("token", token);
        if (userId !== null) localStorage.setItem("user_id", userId.toString());
        if (userEmail) localStorage.setItem("user_email", userEmail);
        setIsLoggedIn(true);
      } else {
        logout();
      }
    } else {
      logout();
    }
  }, [token, userId, userEmail]);

  useEffect(() => {
    const syncAuthState = () => {
      const storedToken = localStorage.getItem("token");
      const decoded = decodeJWT(storedToken);
      if (decoded && decoded.exp > Math.floor(Date.now() / 1000)) {
        setToken(storedToken);
        const storedId = localStorage.getItem("user_id");
        setUserId(storedId ? parseInt(storedId, 10) : null);
        setUserEmail(localStorage.getItem("user_email"));
        setIsLoggedIn(true);
      } else {
        logout();
      }
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
    setIsLoggedIn(true);
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
import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem("access_token"));
  const [refreshToken, setRefreshToken] = useState(() => localStorage.getItem("refresh_token"));
  const [userId, setUserId] = useState(() => localStorage.getItem("user_id"));
  const [userEmail, setUserEmail] = useState(() => localStorage.getItem("user_email"));
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem("access_token"));
  const [userProfile, setUserProfile] = useState(null); // ✅ New: full user data
  const [loading, setLoading] = useState(true);

  const saveTokens = (access, refresh) => {
    setAccessToken(access);
    setRefreshToken(refresh);
    localStorage.setItem("access_token", access);
    localStorage.setItem("refresh_token", refresh);
  };

  const login = (access, refresh, id, email) => {
    saveTokens(access, refresh);
    setUserId(id);
    setUserEmail(email);
    localStorage.setItem("user_id", id.toString());
    localStorage.setItem("user_email", email);
    setIsLoggedIn(true);
    fetchUserProfile(access); // ✅ Fetch after login
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user_id");
    localStorage.removeItem("user_email");
    setAccessToken(null);
    setRefreshToken(null);
    setUserId(null);
    setUserEmail(null);
    setUserProfile(null); // ✅ Clear on logout
    setIsLoggedIn(false);
  };

  const refreshAccessToken = async () => {
    try {
      const res = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/auth/refresh`, {
        refresh_token: localStorage.getItem("refresh_token"),
      });
      const newAccess = res.data.access_token;
      saveTokens(newAccess, localStorage.getItem("refresh_token"));
      return newAccess;
    } catch (error) {
      console.error("Failed to refresh access token:", error);
      logout();
      return null;
    }
  };

  const fetchUserProfile = async (token) => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/auth/account/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUserProfile(res.data); // ✅ Store full profile
    } catch (err) {
      console.error("Failed to fetch user profile:", err);
    }
  };

  useEffect(() => {
  const checkAndRefreshToken = async () => {
    const token = localStorage.getItem("access_token");
    const refresh = localStorage.getItem("refresh_token");
    const id = localStorage.getItem("user_id");
    const email = localStorage.getItem("user_email");

    if (token && refresh && id && email) {
      let payload;
      try {
        payload = JSON.parse(atob(token.split('.')[1]));
      } catch (e) {
        console.error("Invalid token:", e);
        logout();
        setLoading(false);
        return;
      }

      const currentTime = Math.floor(Date.now() / 1000);
      if (payload.exp < currentTime) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          setAccessToken(newToken);
          setRefreshToken(refresh);
          setUserId(id);
          setUserEmail(email);
          setIsLoggedIn(true);
          if (!userProfile) fetchUserProfile(newToken); // ✅ only if missing
        } else {
          logout();
        }
      } else {
        setAccessToken(token);
        setRefreshToken(refresh);
        setUserId(id);
        setUserEmail(email);
        setIsLoggedIn(true);
        if (!userProfile) fetchUserProfile(token); // ✅ only if missing
      }
    }

    setLoading(false);
  };

  checkAndRefreshToken();
  const interval = setInterval(checkAndRefreshToken, 5 * 60 * 1000);
  return () => clearInterval(interval);
}, [userProfile]);

  if (loading) return null;

  return (
    <AuthContext.Provider
      value={{
        login,
        logout,
        isLoggedIn,
        accessToken,
        userId,
        userEmail,
        userProfile, // ✅ usable anywhere now
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
 
const AuthContext = createContext();
 
export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem("access_token"));
  const [refreshToken, setRefreshToken] = useState(() => localStorage.getItem("refresh_token"));
  const [userId, setUserId] = useState(() => localStorage.getItem("user_id"));
  const [userEmail, setUserEmail] = useState(() => localStorage.getItem("user_email"));
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
 
  // ── KEY FIX: don't trust localStorage blindly on init.
  // Start as false — only set true after token is verified async.
  // This eliminates the stale "looks logged in but isn't" window.
  const [isLoggedIn, setIsLoggedIn] = useState(false);
 
  const saveTokens = (access, refresh) => {
    setAccessToken(access);
    setRefreshToken(refresh);
    localStorage.setItem("access_token", access);
    if (refresh) localStorage.setItem("refresh_token", refresh);
  };
 
  const login = (access, refresh, id, email) => {
    saveTokens(access, refresh);
    setUserId(id);
    setUserEmail(email);
    localStorage.setItem("user_id", id.toString());
    localStorage.setItem("user_email", email);
    setIsLoggedIn(true);
    fetchUserProfile(access);
  };
 
  const logout = async () => {
    try { await api.post("/auth/logout"); } catch {}
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user_id");
    localStorage.removeItem("user_email");
    setAccessToken(null);
    setRefreshToken(null);
    setUserId(null);
    setUserEmail(null);
    setUserProfile(null);
    setIsLoggedIn(false);
  };
 
  const refreshAccessToken = async () => {
    try {
      const res = await api.post("/auth/refresh", {}, { withCredentials: true });
      const newAccess = res.data.access_token;
      // Refresh endpoint also rotates the refresh token cookie — no need to
      // store it manually here since it's httpOnly
      saveTokens(newAccess, localStorage.getItem("refresh_token"));
      return newAccess;
    } catch {
      logout();
      return null;
    }
  };
 
  const fetchUserProfile = async (tokenArg) => {
    try {
      const tokenToUse = tokenArg || localStorage.getItem("access_token");
      if (!tokenToUse) return;
      const res = await api.get("/auth/account/me", {
        headers: { Authorization: `Bearer ${tokenToUse}` },
      });
      setUserProfile(res.data);
    } catch {}
  };
 
  useEffect(() => {
    const checkAndRefreshToken = async () => {
      const token = localStorage.getItem("access_token");
      const refresh = localStorage.getItem("refresh_token");
      const id = localStorage.getItem("user_id");
      const email = localStorage.getItem("user_email");
 
      // No stored session at all — not logged in
      if (!token || !id || !email) {
        setIsLoggedIn(false);
        setLoading(false);
        return;
      }
 
      // Decode and check expiry
      let payload;
      try {
        payload = JSON.parse(atob(token.split(".")[1]));
      } catch {
        // Malformed token — clear everything
        await logout();
        setLoading(false);
        return;
      }
 
      const currentTime = Math.floor(Date.now() / 1000);
      // Refresh proactively if token expires within 5 minutes
      const needsRefresh = payload.exp < currentTime + 300;
 
      if (needsRefresh) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          setUserId(id);
          setUserEmail(email);
          setIsLoggedIn(true);
          if (!userProfile) fetchUserProfile(newToken);
        }
        // If refresh failed, logout() was already called inside refreshAccessToken
      } else {
        // Token is valid
        setAccessToken(token);
        setUserId(id);
        setUserEmail(email);
        setIsLoggedIn(true);
        if (!userProfile) fetchUserProfile(token);
      }
 
      setLoading(false);
    };
 
    // Listen for forced logout from api.ts 401 interceptor
    const handleForcedLogout = () => logout();
    window.addEventListener("auth:logout", handleForcedLogout);
 
    checkAndRefreshToken();
    // Check every 4 minutes — proactively refreshes before the token expires
    const interval = setInterval(checkAndRefreshToken, 4 * 60 * 1000);
 
    return () => {
      clearInterval(interval);
      window.removeEventListener("auth:logout", handleForcedLogout);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
 
  const username = useMemo(() => {
    if (!userProfile) return null;
    return userProfile.username || userProfile.display_name || null;
  }, [userProfile]);
 
  const displayName = useMemo(() => {
    return username || userEmail || "anonymous";
  }, [username, userEmail]);
 
  return (
    <AuthContext.Provider
      value={{
        login,
        logout,
        isLoggedIn,
        accessToken,
        userId,
        userEmail,
        userProfile,
        username,
        displayName,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
 
export const useAuth = () => useContext(AuthContext);
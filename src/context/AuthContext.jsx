import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem("access_token"));
  const [refreshToken, setRefreshToken] = useState(() => localStorage.getItem("refresh_token"));
  const [userId, setUserId] = useState(() => localStorage.getItem("user_id"));
  const [userEmail, setUserEmail] = useState(() => localStorage.getItem("user_email"));
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem("access_token"));
  const [userProfile, setUserProfile] = useState(null);
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
    if (!userProfile) fetchUserProfile(access);
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
    setUserProfile(null);
    setIsLoggedIn(false);
  };

  const refreshAccessToken = async () => {
    try {
      const res = await api.post(`/auth/refresh`, {}, { withCredentials: true });
      const newAccess = res.data.access_token;
      saveTokens(newAccess, refreshToken);
      return newAccess;
    } catch (error) {
      console.error("Failed to refresh access token:", error);
      logout();
      return null;
    }
  };

  const fetchUserProfile = async (tokenArg) => {
    try {
      const tokenToUse = tokenArg || accessToken;
      if (!tokenToUse) return;
      const res = await api.get(`/auth/account/me`, {
        headers: { Authorization: `Bearer ${tokenToUse}` },
      });
      setUserProfile(res.data);
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
          payload = JSON.parse(atob(token.split(".")[1]));
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
            if (!userProfile) fetchUserProfile(newToken);
          } else {
            logout();
          }
        } else {
          setAccessToken(token);
          setRefreshToken(refresh);
          setUserId(id);
          setUserEmail(email);
          setIsLoggedIn(true);
          if (!userProfile) fetchUserProfile(token);
        }
      }

      setLoading(false);
    };

    checkAndRefreshToken();
    const interval = setInterval(checkAndRefreshToken, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [userProfile]); // eslint-disable-line react-hooks/exhaustive-deps

  // 👇 Derive username + displayName from profile/email
  const username = useMemo(() => {
    if (!userProfile) return null;
    return userProfile.username || userProfile.display_name || null;
  }, [userProfile]);

  const displayName = useMemo(() => {
    return username || userEmail || "anonymous";
  }, [username, userEmail]);

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
        userProfile,
        username,     // 👈 exported
        displayName,  // 👈 exported (nice fallback)
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
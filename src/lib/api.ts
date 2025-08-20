// src/api.ts
import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from "axios";
import { API_URL } from "./env";

console.log("[api.ts] baseURL =", API_URL);

const ACCESS_KEY = "access_token";

function getAccess(): string | null {
  try { return localStorage.getItem(ACCESS_KEY); } catch { return null; }
}
function setAccess(t: string | null) {
  try {
    if (t) localStorage.setItem(ACCESS_KEY, t);
    else   localStorage.removeItem(ACCESS_KEY);
  } catch {}
}

export const api = axios.create({
  baseURL: API_URL,               // e.g. https://api.pneumevolve.com (NOT localhost in prod)
  headers: { "Content-Type": "application/json" },
  withCredentials: true,          // <-- required so Safari sends cookies
  timeout: 20000,
});

// ---- Request: attach Authorization if we have an access token
api.interceptors.request.use((cfg: InternalAxiosRequestConfig) => {
  const t = getAccess();
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  const base = (cfg.baseURL ?? "").replace(/\/$/, "");
  const url  = typeof cfg.url === "string" ? cfg.url : "";
  console.log("[API REQ]", cfg.method?.toUpperCase(), base + url);
  return cfg;
});

// ---- 401 handling with single-flight refresh
let refreshing: Promise<string | null> | null = null;

async function refreshAccess(): Promise<string | null> {
  if (!refreshing) {
    // Use a bare axios so this call itself doesn't get intercepted/loop
    refreshing = axios
      .post(`${API_URL.replace(/\/$/, "")}/auth/refresh`, null, {
        withCredentials: true,            // send refresh cookie
      })
      .then(res => {
        const t = res.data?.access_token as string | undefined;
        if (t) {
          setAccess(t);
          return t;
        }
        return null;
      })
      .catch(() => null)
      .finally(() => { refreshing = null; });
  }
  return refreshing;
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const original = error.config as AxiosRequestConfig & { _retry?: boolean };

    console.warn("[API ERR]", status, original?.url, error.message);

    if (status === 401 && !original?._retry) {
      original._retry = true;

      const newAccess = await refreshAccess();
      if (newAccess) {
        // retry original with new token
        original.headers = original.headers ?? {};
        (original.headers as any).Authorization = `Bearer ${newAccess}`;
        return api(original);
      } else {
        // refresh failed -> hard logout path
        setAccess(null);
        // optional: redirect to login route, or emit an event
        // window.location.href = "/login";
      }
    }

    throw error;
  }
);
// src/api.ts
import axios from "axios";
import { API_URL } from "./env";

console.log("[api.ts] loaded, baseURL =", API_URL);

export const api = axios.create({
  baseURL: API_URL,                  // '/api' in dev
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
  timeout: 20000,
});

// 🔎 Log every request URL resolved by axios
api.interceptors.request.use((cfg) => {
  const base = cfg.baseURL?.replace(/\/$/, '') || '';
  const url = typeof cfg.url === 'string' ? cfg.url : '';
  console.log('[API REQ]', cfg.method?.toUpperCase(), base + url);
  return cfg;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    console.warn('[API ERR]', err?.response?.status, err?.config?.url, err?.message);
    throw err;
  }
);
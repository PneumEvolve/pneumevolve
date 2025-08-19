// src/env.ts

type MaybeString = string | undefined;

const isDev = import.meta.env.DEV;
const RAW = (import.meta.env.VITE_API_URL as MaybeString) ?? "";

/** Environment name (unchanged) */
export const ENV: string =
  (import.meta.env.VITE_ENV as MaybeString) ?? import.meta.env.MODE;

/**
 * API base:
 *  - In dev: always use Vite proxy at "/api" (so phones on LAN work)
 *  - In prod: require an absolute URL from VITE_API_URL
 */
export const API_URL: string = isDev ? "/api" : (RAW || "").replace(/\/$/, "");

/** Other envs (unchanged) */
export const SUPABASE_URL: string = import.meta.env.VITE_SUPABASE_URL as string;
export const SUPABASE_ANON_KEY: string =
  import.meta.env.VITE_SUPABASE_ANON_KEY as string;

/** Helpful logs */
if (isDev) {
  if (!RAW) {
    console.info("[ENV] Using Vite proxy at /api");
  } else {
    console.info("[ENV] Ignoring VITE_API_URL in dev; using /api via Vite proxy");
  }
}

/** Guardrails for production */
if (import.meta.env.PROD) {
  if (!RAW) {
    throw new Error("[ENV] Production build requires VITE_API_URL (do not rely on /api in prod).");
  }
  if (!/^https?:\/\//i.test(API_URL)) {
    throw new Error("[ENV] Production API_URL must be an absolute http(s) URL.");
  }
  if (/localhost|127\.0\.0\.1/.test(API_URL)) {
    throw new Error("[ENV] Production API_URL cannot be localhost/127.0.0.1.");
  }
}
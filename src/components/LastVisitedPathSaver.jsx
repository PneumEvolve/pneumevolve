// src/components/LastVisitedPathSaver.jsx
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const AUTH_ROUTES = new Set(["/login", "/signup", "/forgotpassword", "/logout"]);

export default function LastVisitedPathSaver() {
  const location = useLocation();

  useEffect(() => {
    const { pathname, search = "", hash = "" } = location || {};
    if (!pathname) return;

    // Don’t store auth pages as a “last visited”
    if (AUTH_ROUTES.has(pathname)) return;

    localStorage.setItem("lastVisitedPath", `${pathname}${search}${hash}`);
  }, [location]);

  return null; // renders nothing
}
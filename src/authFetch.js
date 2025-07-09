// src/authFetch.js
export const authFetch = async (url, options = {}) => {
  const token = localStorage.getItem("token");
  if (!token) return null; // Not logged in, allow the UI to react

  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });

  if (res.status === 401) {
    localStorage.removeItem("token");
    return null; // No redirect, caller will decide what to do
  }

  return res;
};
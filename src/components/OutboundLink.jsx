import React from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const API = import.meta.env.VITE_API_URL;

export default function OutboundLink({ refId, href, children, className }) {
  const { userEmail } = useAuth();

  const onClick = async (e) => {
    // let the click happen immediately; ping in background
    // only logged-in can earn; skip otherwise
    if (userEmail && refId) {
      try {
        await axios.post(`${API}/seed/click`, { ref: refId }, { headers: { "x-user-email": userEmail } });
      } catch (err) {
        // ignore caps/duplicates; we don’t block navigation
      }
    }
  };

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" onClick={onClick} className={className}>
      {children}
    </a>
  );
}
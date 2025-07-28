import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

export default function RedirectIfFirstVisit({ children }) {
  const [firstVisit, setFirstVisit] = useState(null);



  useEffect(() => {
  const visited = localStorage.getItem("hasVisited");
  const alreadyRedirected = sessionStorage.getItem("alreadyRedirected");

  if (visited || alreadyRedirected) {
    setFirstVisit(false);
  } else {
    localStorage.setItem("hasVisited", "true");
    sessionStorage.setItem("alreadyRedirected", "true");
    setFirstVisit(true);
  }
}, []);

  if (firstVisit === null) return null;

  if (firstVisit) {
    return <Navigate to="/MyTree" replace />;
  }

  return children;
}
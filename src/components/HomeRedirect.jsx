import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

export default function HomeRedirect() {
  const [firstVisit, setFirstVisit] = useState(null);

  useEffect(() => {
    const visited = localStorage.getItem("hasVisited");
    if (visited) {
      setFirstVisit(false);
    } else {
      localStorage.setItem("hasVisited", "true");
      setFirstVisit(true);
    }
  }, []);

  if (firstVisit === null) return null;

  return firstVisit ? <Navigate to="/MyTree" replace /> : <Navigate to="/home" replace />;
}
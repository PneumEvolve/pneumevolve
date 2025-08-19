import React from "react";
import { ENV } from "@/lib/env";

export default function EnvBadge() {
  const isProd = ENV === "production" || ENV === "prod";
  const bg = isProd ? "bg-red-500" : "bg-green-500";

  return (
    <div
      className={`fixed bottom-2 right-2 px-3 py-1 rounded text-white text-xs shadow-lg ${bg}`}
    >
      {isProd ? "PROD" : "DEV"}
    </div>
  );
}
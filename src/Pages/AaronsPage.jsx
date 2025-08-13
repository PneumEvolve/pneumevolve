// src/pages/AaronsPage.jsx
import React from "react";

export default function AaronsPage() {
  return (
    <iframe
      title="Aaron's Page"
      src="/custom/aaron.html"          // put her file in /public/custom/aaron.html
      className="fixed inset-0 w-screen h-[100dvh] border-0"
      // allow vanilla JS/CSS she includes:
      sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
    />
  );
}
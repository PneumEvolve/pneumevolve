// src/components/ui/button.jsx
import React from "react";

// Define style classes for each variant
const VARIANT_CLASSES = {
  default: "bg-blue-600 hover:bg-blue-700 text-white",
  red: "bg-red-600 hover:bg-red-700 text-white",
  green: "bg-green-600 hover:bg-green-700 text-white",
  yellow: "bg-yellow-500 hover:bg-yellow-600 text-black",
  ghost: "bg-transparent text-blue-600 hover:underline",
};

export const Button = ({
  children,
  onClick,
  className = "",
  type = "button",
  variant = "default", // fallback for all old buttons
  ...props
}) => {
  const variantClass = VARIANT_CLASSES[variant] || VARIANT_CLASSES.default;

  return (
    <button
      type={type}
      onClick={onClick}
      className={`px-4 py-2 rounded-md transition ${variantClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
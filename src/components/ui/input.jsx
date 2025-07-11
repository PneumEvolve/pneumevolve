// src/components/ui/input.jsx
import React from "react";
import classNames from "classnames";

export const Input = React.forwardRef(
  ({ className, type = "text", ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={classNames(
          "w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800",
          "px-4 py-2 text-sm text-gray-900 dark:text-white shadow-sm",
          "placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
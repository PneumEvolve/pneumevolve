import React from "react";
import classNames from "classnames";

export const Card = ({ className, children }) => {
  return (
    <div
      className={classNames(
        "bg-white dark:bg-gray-900 rounded-2xl shadow p-4 border border-gray-200 dark:border-gray-700",
        className
      )}
    >
      {children}
    </div>
  );
};

export const CardContent = ({ className, children }) => {
  return <div className={classNames("", className)}>{children}</div>;
};

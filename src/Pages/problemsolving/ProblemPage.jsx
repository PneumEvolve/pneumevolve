import React, { useState } from "react";
import ProblemForm from "./ProblemForm";
import ProblemList from "./ProblemList";

export default function ProblemPage() {
  const [reloadFlag, setReloadFlag] = useState(false);

  const handleNewProblem = () => {
    setReloadFlag((prev) => !prev); // trigger list refresh
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">🌍 Community Problem Solver</h1>
      <ProblemForm onNewProblem={handleNewProblem} />
      <ProblemList key={reloadFlag} />
    </div>
  );
}
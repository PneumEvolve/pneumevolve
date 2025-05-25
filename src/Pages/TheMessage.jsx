// src/pages/TheMessage.jsx
import React from "react";
import { Link } from "react-router-dom";
import {Button} from "@/components/ui/button";

const TheMessage = () => {
  return (
    <div className="max-w-3xl mx-auto p-8 text-center dark:text-white">
      <h1 className="text-5xl font-extrabold mb-6 leading-tight">
        🌍 The Message
      </h1>

      <p className="text-lg mb-6">
        You found it. The page between worlds. No ads, no agenda — just truth, dressed in courage.
      </p>

      <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg shadow-lg mb-6">
        <p className="text-xl leading-relaxed">
          The world is changing — and not because it has to.
          <br />
          It’s changing because *we* are remembering that it can.
        </p>

        <p className="mt-4">
          Somewhere inside you, something ancient is waking up.
          A voice, a spark, a knowing.
          You didn’t come here to obey.
          You came here to remember. Reclaim. Rebuild.
        </p>

        <p className="mt-4 font-semibold">
          We are the architects of the next story. We are the authors of Earth’s next verse.
        </p>

        <p className="mt-6 italic text-indigo-500 dark:text-indigo-300">
          So speak your truth. Plant your seed. Cast your vote. Build your world. 
          <br />This is not a drill.
        </p>
      </div>

      <p className="mb-4">
        You are not alone.
        You never were.
        Now go write something worth being remembered for.
      </p>

      <Button className="mt-4">
        <Link to="/">← Return to PneumEvolve</Link>
      </Button>
    </div>
  );
};

export default TheMessage;
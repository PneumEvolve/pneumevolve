import React from "react";
import { Button } from "../components/ui/button";
import { useNavigate } from "react-router-dom";

const Tarot = () => {

const navigate = useNavigate();

  return (
    <div className="max-w-3xl mx-auto p-6 text-center text-gray-800 dark:text-white">
      <h1 className="text-4xl font-bold mb-4">🔮 Tarot Readings with Shea</h1>

      <p className="text-lg mb-6">
        Enter the circle. Each reading is a moment outside of time—a mirror, a map, a whisper from the deep. Some sessions may be public, others private, and some may be streamed live as we explore the cards together.
      </p>

      <div className="bg-black rounded-lg overflow-hidden shadow-lg mb-6">
        {/* Replace this iframe with a live YouTube embed or other video stream */}
        <div className="relative w-full pb-[56.25%] h-0">
          <iframe
            className="absolute top-0 left-0 w-full h-full"
            src="https://www.youtube.com/embed/dQw4w9WgXcQ" // <-- replace with your live or static video
            title="Live Tarot Session"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400 italic">
        When the cards speak, we listen. Trust what resonates, release what doesn’t. The deck doesn’t control you—it reminds you of what you already know.
      </p>
      <Button onClick={() => navigate("/Experiments")}>
        ← Back to Experiments
      </Button>
    </div>
    
  );
};

export default Tarot;
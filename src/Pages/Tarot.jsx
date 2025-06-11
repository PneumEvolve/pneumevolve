import React from "react";
import { Mail, Heart, Video, Calendar } from "lucide-react";
import { Button } from "../components/ui/button";
import { Link } from "react-router-dom";

const Tarot = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-900 via-purple-900 to-black text-white p-6 flex flex-col items-center justify-center space-y-10">
      <div className="max-w-3xl text-center space-y-6">
        <h1 className="text-5xl font-extrabold tracking-tight">🃏 Zen Tarot Readings</h1>
        <p className="text-xl text-gray-300">
          Welcome to your next message from the Universe.
          Join me for live intuitive tarot readings streaming weekly.
        </p>
        <p className="text-lg text-purple-200">
          Come with a question, or just let the cards speak. I read for collective consciousness and for YOU.
        </p>
        <p className="text-md text-gray-400 italic">
          “The cards don’t predict the future. They reflect the now — and you decide what’s next.”
        </p>
      </div>

      {/* Replace with your actual live stream embed (YouTube, Twitch, etc.) */}
      <div className="w-full max-w-2xl aspect-video rounded-2xl overflow-hidden shadow-xl border border-purple-600">
        <iframe
          className="w-full h-full"
          src="https://www.youtube.com/embed/live_stream?channel=YOUR_CHANNEL_ID"
          title="Live Tarot Reading"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      </div>

      <div className="text-center space-y-4">
        <h2 className="text-2xl font-semibold">🧙‍♂️ Get a Reading</h2>
        <p className="text-gray-300">
          Live viewers: Drop your question in the chat or just type "🃏" for a card pull.
        </p>
        <p className="text-gray-400">
          Private readings: Email me to schedule a personal reading.
        </p>
        <a
          href="mailto:sheaklipper@gmail.com"
          className="inline-flex items-center space-x-2 text-pink-400 hover:underline"
        >
          <Mail className="w-5 h-5" />
          <span>sheaklipper@gmail.com</span>
        </a>
        <div className="flex gap-4 justify-center mt-4">
          <Button variant="outline" asChild>
            <a href="mailto:sheaklipper@gmail.com">
              <Calendar className="w-4 h-4 mr-1" /> Book Private Reading
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href="https://www.buymeacoffee.com/YOUR_USERNAME" target="_blank" rel="noopener noreferrer">
              <Heart className="w-4 h-4 mr-1" /> Support My Work
            </a>
          </Button>
        </div>
      </div>

      <div className="text-sm text-gray-500 mt-10">
        Stream live on YouTube • TikTok: <span className="font-semibold">@pneumevolve</span>
      </div>

      <Button variant="ghost" className="mt-6" asChild>
        <Link to="/">← Return to PneumEvolve</Link>
      </Button>
    </div>
  );
};

export default Tarot;
// src/pages/Tarot.jsx
import React from "react";
import { Mail, Heart, Video, Calendar, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

const VIDEO_URL = "https://www.youtube.com/watch?v=VIDEO_ID_HERE"; // ← replace me
const CHANNEL_LIVE_URL = "https://www.youtube.com/@pneumevolve/live"; // ← replace if different
const BUY_ME_A_COFFEE_URL = "https://www.buymeacoffee.com/YOUR_USERNAME"; // ← replace me
const CONTACT_EMAIL = "shea@pneumevolve.com";

export default function Tarot() {
  return (
    <div className="main p-6 space-y-6">
      {/* Header */}
      <header className="section-bar flex items-center justify-between gap-3">
        <h1 className="m-0">🃏 Zen Tarot Readings</h1>
        <Link
          to="/experiments"
          className="btn btn-secondary text-xs sm:text-sm opacity-80 hover:opacity-100"
        >
          ← Back to Experiments
        </Link>
      </header>

      {/* Intro */}
      <section className="card space-y-3">
        <p className="text-base">
          Welcome to your next message from the Universe. Join me for live intuitive
          tarot readings streaming weekly.
        </p>
        <p className="text-sm opacity-80">
          Come with a question, or just let the cards speak. I read for the collective
          and for <em>you</em>.
        </p>
        <p className="text-sm italic opacity-70">
          “The cards don’t predict the future. They reflect the now — and you decide what’s next.”
        </p>
      </section>

      {/* Placeholder video link */}
      <section className="card p-0 overflow-hidden">
        <div className="aspect-video flex items-center justify-center bg-[color-mix(in_oklab,var(--bg)_80%,transparent)]">
          <a
            href={VIDEO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 btn"
            aria-label="Watch placeholder tarot reading video"
            title="Watch placeholder tarot reading video"
          >
            <Video className="w-5 h-5" />
            <span>Watch placeholder reading</span>
            <ExternalLink className="w-4 h-4 opacity-80" />
          </a>
        </div>
        <div className="p-3 border-t flex items-center justify-between gap-3 text-sm">
          <span className="opacity-70">Ready for live? Catch me on YouTube.</span>
          <a
            href={CHANNEL_LIVE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
          >
            Open Live Page
          </a>
        </div>
      </section>

      {/* Get a reading */}
      <section className="card space-y-3">
        <h2 className="text-lg font-semibold m-0">🧙‍♂️ Get a Reading</h2>
        <div className="text-sm space-y-1">
          <p className="opacity-80">
            Live viewers: drop your question in chat or just type <span className="badge">🃏</span>{" "}
            for a card pull.
          </p>
          <p className="opacity-70">
            Private sessions: email me to schedule a personal reading.
          </p>
        </div>

        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="inline-flex items-center gap-2 link-default"
        >
          <Mail className="w-5 h-5" />
          <span>{CONTACT_EMAIL}</span>
        </a>

        <div className="flex flex-wrap gap-2 pt-2">
          <a href={`mailto:${CONTACT_EMAIL}`} className="btn btn-secondary">
            <Calendar className="w-4 h-4 mr-2" />
            Book Private Reading
          </a>
          <a
            href={BUY_ME_A_COFFEE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
          >
            <Heart className="w-4 h-4 mr-2" />
            Support My Work
          </a>
        </div>
      </section>

      {/* Footer */}
      <section className="card flex items-center justify-between text-xs">
        <span className="opacity-70">
          Streaming on YouTube • TikTok: <span className="font-medium">@pneumevolve</span>
        </span>
        <Link to="/" className="btn btn-secondary">
          ← Return Home
        </Link>
      </section>
    </div>
  );
}
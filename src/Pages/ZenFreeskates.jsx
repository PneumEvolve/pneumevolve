// src/pages/ZenFreeskates.jsx
import React from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Mail, MapPin, Calendar, Sparkles } from "lucide-react";

export default function ZenFreeskates() {
  return (
    <main className="main p-6 space-y-8">
      {/* SEO */}
      <Helmet>
        <title>Zen Freeskates | Learn to Freeskate in Vernon BC | PneumEvolve</title>
        <meta
          name="description"
          content="Join Zen Freeskates – Free lessons at Polson Park Skatepark in Vernon, BC. Flow with freedom and learn freeskating with Shea. Limited time offer!"
        />
        <meta property="og:title" content="Zen Freeskates | Vernon, BC" />
        <meta
          property="og:description"
          content="Free Freeskating lessons at Polson Park Skatepark – Email to book!"
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://pneumevolve.com/zen-freeskates" />
      </Helmet>

      {/* Header */}
      <section className="text-center space-y-3">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">Zen Freeskates</h1>
        <p className="opacity-90 text-lg">
          Flow with freedom. Move with purpose. Discover the art of freeskating.
        </p>
        <div className="inline-flex items-center gap-2 text-sm opacity-75">
          <Sparkles className="w-4 h-4" />
          <span><strong>FREE</strong> beginner lessons for a limited time</span>
        </div>
      </section>

      {/* Video (card shell to match theme) */}
      <section className="card p-0 overflow-hidden rounded-2xl">
        <div className="aspect-video">
          <iframe
            className="w-full h-full"
            src="https://www.youtube.com/embed/2-k4j-guLNk?si=LkYXxZKs_1hy87kg"
            title="Intro to Freeskating"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </section>

      {/* Info */}
      <section className="space-y-3">
        <div className="section-bar">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="font-semibold">Learn Locally in Vernon, BC</h2>
            <div className="text-xs opacity-70">Beginner-friendly · Boards available</div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="card flex items-start gap-3">
            <MapPin className="w-5 h-5 mt-1 opacity-70" />
            <div>
              <div className="font-medium">Polson Park Skatepark</div>
              <div className="text-sm opacity-80">Vernon, British Columbia</div>
            </div>
          </div>

          <div className="card flex items-start gap-3">
            <Calendar className="w-5 h-5 mt-1 opacity-70" />
            <div>
              <div className="font-medium">Book a Time</div>
              <div className="text-sm opacity-80">Flexible afternoons & weekends</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="card text-center space-y-4">
        <h3 className="text-xl font-semibold">Ready to roll?</h3>
        <p className="opacity-80">Email me to set up your first session.</p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <a href="mailto:shea@pneumevolve.com" className="btn">
            <Mail className="w-4 h-4 mr-2 inline-block" />
            shea@pneumevolve.com
          </a>

          <a
            href="mailto:shea@pneumevolve.com?subject=Zen%20Freeskates%20Lesson%20Request"
            className="btn btn-secondary"
          >
            Send a request
          </a>
        </div>
      </section>

      {/* Footer note */}
      <p className="text-center text-sm opacity-70">
        Follow on TikTok: <span className="font-semibold">@pneumevolve</span> (link coming soon)
      </p>
    </main>
  );
}
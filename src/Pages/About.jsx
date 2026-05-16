// src/Pages/About.jsx
import React from "react";
import { Link } from "react-router-dom";

export default function About() {
  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="mx-auto max-w-2xl px-5 py-14 space-y-10">

        {/* Header */}
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">
            PneumEvolve
          </p>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight leading-snug">
            What is this?
          </h1>
        </header>

        {/* Body */}
        <div className="space-y-6 text-sm leading-7 text-[var(--muted)]">

          <p>
            Honestly? I'm still figuring that out.
          </p>

          <p>
            My name is Shea. I built PneumEvolve — the name means breathe and evolve — because I needed somewhere to put things. Tools I was building for myself. Ideas I couldn't stop thinking about. A vision of a world that works a little better than this one.
          </p>

          <p>
            It started as something spiritual. A kind of movement, maybe. I had this belief — I still have it — that the most important thing we can do right now is find each other again. That we've been divided on purpose, by systems that benefit from our isolation, and that the way out is embarrassingly simple: we just have to start caring about the person in front of us. Or across the miles from us. Or living three doors down that we've never spoken to.
          </p>

          <p>
            So I built <Link to="/stillness" className="text-[var(--accent)] hover:underline">Shared Stillness</Link> — a 24-hour timer that lets you share a moment of quiet with someone you love, without words, across any distance. I use it with my mom and my partner and my dad. It works. Something in it works.
          </p>

          <p>
            Then I kept building. A decision board for when your head won't stop looping. A flow map for seeing your own patterns clearly. A meal planner because you have to eat. A tool called <Link to="/clear-and-calm" className="text-[var(--accent)] hover:underline">Clear & Calm</Link> that I built for myself, to help me quit cannabis after 15 years, while documenting the journey publicly because I think honesty is the only thing worth offering.
          </p>

          <p>
            None of this is finished. None of it is perfect. I have high standards and a complicated relationship with the gap between the world I can see and the world I'm actually living in. Some days I feel luminous. Some days I can't find a reason to get out of bed. Most days I'm somewhere in between, building something, reaching toward something, hoping it matters.
          </p>

          <p className="text-[var(--text)] font-medium">
            I built this for myself. You're welcome here too.
          </p>

          <p>
            If something helps you — use it. If something doesn't make sense — that's fair, it might not be ready yet, or it might just not be for you. If you want to tell me something, there's a <Link to="/blog" className="text-[var(--accent)] hover:underline">blog</Link> where I write, and the tools themselves are the best way I know to say what I'm trying to say.
          </p>

          <p>
            Start anywhere. Or don't. Either is fine.
          </p>

        </div>

        {/* Quiet sign-off */}
        <div className="pt-2 border-t border-[var(--border)]">
          <p className="text-xs text-[var(--muted)]">— Shea, Edmonton, Alberta</p>
        </div>

        {/* Links */}
        <div className="flex flex-wrap gap-3">
          <Link to="/"
            className="rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] px-5 py-2.5 text-sm font-semibold hover:opacity-90 transition shadow">
            See the tools →
          </Link>
          <Link to="/stillness"
            className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-5 py-2.5 text-sm font-medium hover:shadow transition">
            Shared Stillness
          </Link>
          <Link to="/clear-and-calm"
            className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-5 py-2.5 text-sm font-medium hover:shadow transition">
            Clear & Calm
          </Link>
        </div>

      </div>
    </main>
  );
}
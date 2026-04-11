// src/pages/ZenFreeskates.jsx
import React, { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Mail, MapPin, Calendar, Sparkles, ExternalLink, ChevronDown } from "lucide-react";
import { api } from "@/lib/api";
 
const FAQ = [
  {
    q: "Do I need any experience?",
    a: "None at all. Zen Freeskates is built for complete beginners. You don't need a skating background — just curiosity and a willingness to fall a few times.",
  },
  {
    q: "Do I need my own freeskates?",
    a: "Ideally yes — having your own skates makes a big difference. Reach out before your first session and we'll talk through what to get.",
  },
  {
    q: "Is freeskating hard to learn?",
    a: "It has a real learning curve — similar to snowboarding or surfing. Most people get the basics in 10–15 hours of practice. Having an instructor speeds that up a lot.",
  },
  {
    q: "Is freeskating the same as rollerblading or inline skating?",
    a: "No — freeskating is its own thing entirely. You're standing on two small independent decks with wheels. They're not attached to your feet at all. You control them by rotating your legs and ankles. It feels completely unlike anything else.",
  },
  {
    q: "How long are sessions?",
    a: "Usually 1–2 hours. No pressure to stay longer than you want.",
  },
  {
    q: "Is this really free?",
    a: "Yes, genuinely free. No catch. Freeskating is still a tiny sport in Edmonton and I want more people to discover it.",
  },
];
 
function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid var(--border)" }} className="py-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between text-left gap-4"
        style={{
          background: "none", border: "none", color: "var(--text)",
          padding: 0, cursor: "pointer", fontWeight: 500, fontSize: "0.95rem",
        }}
      >
        <span>{q}</span>
        <ChevronDown
          className="shrink-0 w-4 h-4"
          style={{
            opacity: 0.5,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
          }}
        />
      </button>
      {open && (
        <p className="mt-3 text-sm" style={{ color: "var(--muted)", lineHeight: 1.7 }}>
          {a}
        </p>
      )}
    </div>
  );
}
 
function ContactForm() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
 
  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      await api.post("/contact/zen-freeskates", {
        name: name.trim(),
        email: email.trim(),
        message: message.trim(),
      });
      setSuccess(true);
    } catch {
      setError("Something went wrong. Please try emailing directly at shea@pneumevolve.com");
    } finally {
      setSubmitting(false);
    }
  }
 
  if (success) {
    return (
      <div
        className="card p-8 text-center space-y-3"
        style={{ marginTop: "1rem" }}
      >
        <div style={{ fontSize: "2rem" }}>🛼</div>
        <h3 className="text-xl font-bold">You're on the list!</h3>
        <p className="text-sm" style={{ color: "var(--muted)", lineHeight: 1.7 }}>
          Thanks {name} — I'll be in touch soon to find a time that works.
          See you at MillWoods Skatepark.
        </p>
      </div>
    );
  }
 
  return (
    <div style={{ marginTop: "1rem" }}>
      {!open ? (
        <div className="flex flex-wrap gap-3 justify-center">
          <button
            onClick={() => setOpen(true)}
            className="btn"
            style={{ display: "inline-flex", alignItems: "center" }}
          >
            <Mail className="w-4 h-4" style={{ marginRight: "0.5rem" }} />
            Book a free session
          </button>
          <a
            href="https://www.tiktok.com/@pneumevolve"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
            style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}
          >
            Watch on TikTok
            <ExternalLink className="w-3 h-3 ml-2 opacity-60" />
          </a>
        </div>
      ) : (
        <div className="card p-6 space-y-4" style={{ marginTop: "0.5rem" }}>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-base">Book a free session</h3>
            <button
              onClick={() => setOpen(false)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: "var(--muted)", fontSize: "1.2rem", lineHeight: 1, padding: 0,
              }}
              aria-label="Close form"
            >
              ×
            </button>
          </div>
 
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-xs font-medium block mb-1" style={{ opacity: 0.6 }}>
                Your name
              </label>
              <input
                type="text"
                placeholder="e.g. Jordan"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
 
            <div>
              <label className="text-xs font-medium block mb-1" style={{ opacity: 0.6 }}>
                Your email
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
 
            <div>
              <label className="text-xs font-medium block mb-1" style={{ opacity: 0.6 }}>
                Message
              </label>
              <textarea
                rows={4}
                placeholder="Tell me a bit about yourself — when you're free, any skating experience, questions, anything at all."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              />
            </div>
 
            {error && (
              <p className="text-sm" style={{ color: "#ef4444" }}>{error}</p>
            )}
 
            <div className="flex gap-3 items-center pt-1">
              <button
                type="submit"
                disabled={submitting}
                className="btn"
                style={{ display: "inline-flex", alignItems: "center" }}
              >
                {submitting ? "Sending…" : "Send message"}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
 
export default function ZenFreeskates() {
  return (
    <main style={{ background: "var(--bg)", color: "var(--text)", minHeight: "100vh" }}>
      <Helmet>
        <title>Zen Freeskates | Free Freeskating Lessons in Edmonton, Alberta</title>
        <meta
          name="description"
          content="Free beginner freeskating lessons at MillWoods Skatepark in Edmonton, Alberta. Freeskating is one of the newest sports on the planet — two independent skates, no boots, pure flow. Book your first session with Shea today."
        />
        <meta property="og:title" content="Zen Freeskates | Free Freeskating Lessons — Edmonton, AB" />
        <meta
          property="og:description"
          content="Free beginner freeskating lessons at MillWoods Skatepark, Edmonton. Freeskating is its own sport — not inline skating. Book your first session."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://pneumevolve.com/zen-freeskates" />
        <meta
          name="keywords"
          content="freeskating Edmonton, freeskate lessons Edmonton, freeskate Alberta, JMKRIDE Edmonton, MillWoods Skatepark, learn freeskating Edmonton, freeline skating Edmonton, new skate sport Edmonton"
        />
      </Helmet>
 
      {/* ── Hero ── */}
      <section style={{ borderBottom: "1px solid var(--border)", padding: "4rem 1.5rem 3rem" }}>
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <div
            className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1 rounded-full"
            style={{
              background: "color-mix(in oklab, var(--accent) 10%, var(--bg-elev))",
              border: "1px solid color-mix(in oklab, var(--accent) 25%, var(--border))",
              color: "var(--accent)",
            }}
          >
            <Sparkles className="w-3 h-3" />
            Free lessons · Edmonton, Alberta
          </div>
 
          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight" style={{ lineHeight: 1.05 }}>
            Zen Freeskates
          </h1>
 
          <p className="text-lg max-w-xl mx-auto" style={{ color: "var(--muted)", lineHeight: 1.7 }}>
            Freeskating is one of the newest sports on the planet. Two independent skates,
            no boots, no straps — pure flow. Free beginner lessons at MillWoods Skatepark
            in Edmonton.
          </p>
 
          <ContactForm />
        </div>
      </section>
 
      <div className="max-w-3xl mx-auto px-6 py-12 space-y-12">
 
        {/* ── Video ── */}
        <section>
          <div className="card p-0 overflow-hidden" style={{ borderRadius: "var(--radius)" }}>
            <div className="aspect-video">
              <iframe
                className="w-full h-full"
                src="https://www.youtube.com/embed/2-k4j-guLNk?si=LkYXxZKs_1hy87kg"
                title="Zen Freeskates — Freeskating in Edmonton Alberta"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
          <p className="text-xs text-center mt-3" style={{ color: "var(--muted)" }}>
            See what freeskating actually looks like before you show up.
          </p>
        </section>
 
        {/* ── What is freeskating ── */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">What is freeskating?</h2>
          <p className="text-sm" style={{ color: "var(--muted)", lineHeight: 1.8 }}>
            Freeskating is not inline skating. It's not rollerblading, skateboarding, or anything
            you've likely tried before. You ride on two small, completely independent decks —
            one under each foot — with no boots, no bindings, nothing attaching the skates to you.
            You control them entirely through leg and ankle rotation.
          </p>
          <p className="text-sm" style={{ color: "var(--muted)", lineHeight: 1.8 }}>
            The closest comparisons are surfing, snowboarding, and longboarding — but even those
            don't quite capture it. The feeling of pumping up to speed and carving a smooth surface
            is genuinely unlike anything else. It's one of the few sports where the learning curve
            is steep enough to be humbling, but the payoff is that good.
          </p>
          <p className="text-sm" style={{ color: "var(--muted)", lineHeight: 1.8 }}>
            Freeskating is still a tiny sport in Edmonton. Zen Freeskates exists to change that —
            one person at a time.
          </p>
        </section>
 
        {/* ── Location + details ── */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Where & when</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="card p-5 flex items-start gap-3">
              <MapPin className="w-5 h-5 mt-0.5 shrink-0" style={{ opacity: 0.6 }} />
              <div>
                <div className="font-semibold text-sm">MillWoods Skatepark</div>
                <div className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>
                  Edmonton, Alberta
                </div>
                <a
                  href="https://maps.google.com/?q=MillWoods+Skatepark+Edmonton"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs mt-2 inline-flex items-center gap-1"
                  style={{ color: "var(--accent)" }}
                >
                  Get directions
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
 
            <div className="card p-5 flex items-start gap-3">
              <Calendar className="w-5 h-5 mt-0.5 shrink-0" style={{ opacity: 0.6 }} />
              <div>
                <div className="font-semibold text-sm">Flexible scheduling</div>
                <div className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>
                  Afternoons and weekends — fill out the form to find a time that works.
                </div>
              </div>
            </div>
 
            <div className="card p-5 flex items-start gap-3">
              <Sparkles className="w-5 h-5 mt-0.5 shrink-0" style={{ opacity: 0.6 }} />
              <div>
                <div className="font-semibold text-sm">Completely free</div>
                <div className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>
                  No cost, no catch. Just show up and skate.
                </div>
              </div>
            </div>
 
            <div className="card p-5 flex items-start gap-3">
              <Mail className="w-5 h-5 mt-0.5 shrink-0" style={{ opacity: 0.6 }} />
              <div>
                <div className="font-semibold text-sm">Or email directly</div>
                <div className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>
                  <a href="mailto:shea@pneumevolve.com" style={{ color: "var(--accent)" }}>
                    shea@pneumevolve.com
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
 
        {/* ── FAQ ── */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Common questions</h2>
          <div className="card p-6">
            {FAQ.map((item) => (
              <FaqItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </section>
 
        {/* ── CTA ── */}
        <section className="card p-8 text-center space-y-4">
          <h3 className="text-2xl font-bold">Ready to try something new?</h3>
          <p className="text-sm" style={{ color: "var(--muted)", lineHeight: 1.7 }}>
            Fill out the form and I'll be in touch to find a time that works.
            First session is free, no experience required.
          </p>
          <div className="flex justify-center">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="btn"
              style={{ display: "inline-flex", alignItems: "center" }}
            >
              <Mail className="w-4 h-4" style={{ marginRight: "0.5rem" }} />
              Book your first session
            </button>
          </div>
        </section>
 
        {/* ── Footer note ── */}
        <p className="text-center text-xs" style={{ color: "var(--muted)" }}>
          Follow along on{" "}
          <a
            href="https://www.tiktok.com/@pneumevolve"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--accent)" }}
          >
            TikTok @pneumevolve
          </a>{" "}
          · A PneumEvolve project
        </p>
 
      </div>
    </main>
  );
}
import React, { useEffect, useState, useMemo } from "react";
import { Dialog } from "@headlessui/react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL;

const interestOptions = [
  "Ideas & Concepts",
  "Design & UI",
  "Development (Frontend)",
  "Development (Backend)",
  "Writing & Philosophy",
  "Testing & Feedback",
  "Community & Organization",
  "I’m not sure yet",
];

export default function Home() {
  const currentYear = new Date().getFullYear();

  // feedback modal
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ contact: "", interests: [], idea: "", bugs: "", skills: "", extra: "" });
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const toggleInterest = (value) =>
    setForm((prev) => ({
      ...prev,
      interests: prev.interests.includes(value) ? prev.interests.filter((v) => v !== value) : [...prev.interests, value],
    }));
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Submit failed");
      alert("Thank you for your contribution!");
      setForm({ contact: "", interests: [], idea: "", bugs: "", skills: "", extra: "" });
      setIsOpen(false);
    } catch {
      alert("Sorry, something went wrong submitting your contribution.");
    }
  };

  // newest content feed (Forge ideas + Problems)
  const [newest, setNewest] = useState([]);
  useEffect(() => {
    (async () => {
      try {
        const [ideasRes, probsRes] = await Promise.all([
          axios.get(`${API}/forge/ideas`, { params: { limit: 20 } }),
          axios.get(`${API}/problems`, { params: { sort: "new", limit: 20 } }),
        ]);
        const ideas = (ideasRes.data || []).map((i) => ({
          type: "idea",
          id: i.id,
          title: i.title,
          desc: i.description,
          created_at: i.created_at,
          href: `/forge/${i.id}`,
        }));
        const probs = (probsRes.data || []).map((p) => ({
          type: "problem",
          id: p.id,
          title: p.title,
          desc: p.description,
          created_at: p.created_at,
          href: `/problems/${p.id}`,
        }));
        const merged = [...ideas, ...probs].sort(
          (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
        );
        setNewest(merged);
      } catch (e) {
        console.error("Failed to load newest content:", e);
        setNewest([]);
      }
    })();
  }, []);

  // pick the hero (newest item) and a small list of next items if you want
  const hero = newest[0];
  const nextFew = newest.slice(1, 5);

  // Spotlight entries (you can move these to your backend later)
  const communitySpotlight = {
  title: "Community Spotlight",
  image: "/aaron1.webp", // ✅ not "/public/aaron1.webp"
  blurb:
    "Aaron's thing. Check it out. :)",
  link: "https://flanfan.neocities.org",
  cta: "Visit their work",
  tag: "Community",
};


  return (
    <div className="relative">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-100 via-indigo-100 to-fuchsia-100 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-900 p-6 sm:p-10">
        <div className="mx-auto max-w-4xl text-center">
          <img
            src="/logo.png"
            alt="PneumEvolve Logo"
            className="w-20 h-20 mx-auto rounded-full shadow ring-4 ring-white/60 dark:ring-zinc-800 mb-4"
          />
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-blue-700 via-indigo-600 to-fuchsia-600 bg-clip-text text-transparent">
            PneumEvolve
          </h1>
          <p className="mt-4 text-base sm:text-lg text-zinc-700 dark:text-zinc-300">
            Let’s co-create tools and communities that actually serve us. Build <strong>with</strong> and{" "}
            <strong>for</strong> each other—starting now.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <a href="/forge" className="px-5 py-3 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">
              Explore The Forge
            </a>
            <button
              onClick={() => setIsOpen(true)}
              className="px-5 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900/80 backdrop-blur hover:bg-white dark:hover:bg-zinc-900"
            >
              🚀 Help Build PneumEvolve
            </button>
          </div>
        </div>
      </section>

      {/* Top row: Newest (60%) + Spotlights (40%) */}
      <div className="mt-10 grid gap-6 lg:grid-cols-5">
        {/* 60% column */}
        <section className="lg:col-span-3">
          <h2 className="text-lg sm:text-xl font-semibold mb-3">What’s New</h2>

          {/* Primary newest card */}
          {hero ? (
            <a href={hero.href} className="block card mb-4 hover:shadow-lg transition">
              <div className="text-xs opacity-70 mb-1">
                {hero.type === "idea" ? "Forge Idea" : "Problem"} · {new Date(hero.created_at).toLocaleString()}
              </div>
              <h3 className="text-xl sm:text-2xl font-bold mb-1">{hero.title}</h3>
              <p className="opacity-80 line-clamp-3">{hero.desc}</p>
            </a>
          ) : (
            <div className="card">No new content yet—be the first to post!</div>
          )}

          {/* Small list below (optional) */}
          {nextFew.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {nextFew.map((item) => (
                <a key={`${item.type}-${item.id}`} href={item.href} className="card hover:shadow-md transition">
                  <div className="text-xs opacity-70 mb-1">
                    {item.type === "idea" ? "Forge Idea" : "Problem"} · {new Date(item.created_at).toLocaleDateString()}
                  </div>
                  <h4 className="font-semibold mb-1 line-clamp-1">{item.title}</h4>
                  <p className="text-sm opacity-80 line-clamp-2">{item.desc}</p>
                </a>
              ))}
            </div>
          )}
        </section>

        {/* 40% column (two spotlights) */}
        <aside className="lg:col-span-2 space-y-6">
  <SpotlightCard {...communitySpotlight} fit="contain" />
  <a
  href="/spotlightarchive"
  className="btn w-full text-center"
  style={{
    '--btn-bg': 'var(--bg-elev)',   // white in light, dark panel in dark
    '--btn-fg': 'var(--text)',      // text color follows theme
    '--btn-border': 'var(--border)' // subtle outline in both
  }}
>
  View Spotlight Archive →
</a>
</aside>
      </div>

      {/* Quick sections (unchanged) */}
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Section title="💖 Our Favourites">
          <LinkCard href="/forge" label="🛠️ The Forge" />
          <LinkCard href="/farmgame" label="🌾 Farm Game" />
          <LinkCard href="/dreammachine" label="💭 Dream Machine" />
          <LinkCard href="/journal" label="📓 I AM – Journal" />
        </Section>

        <Section title="🛠 Core Tools">
          <LinkCard href="/journal" label="📓 I AM – Journal" />
          <LinkCard href="/MealPlanning" label="🍽️ Life Tools – Meal Planner" />
          <LinkCard href="/projects" label="📋 Project Manager" />
        </Section>

        <Section title="🌱 Community Experiments">
          <LinkCard href="/communities" label="🏘 Modular Community Manager" />
          <LinkCard href="/WeGreen" label="🌿 WeGreen – Gardening Initiative" />
          <LinkCard href="/livingplan" label="PneumEvolve’s Evolving Plan" />
          <LinkCard href="/dreammachine" label="💭 We Dream – Collective Engine" />
        </Section>

        <Section title="🎨 Creative Playground">
          <LinkCard href="/ZenFreeskates" label="🛼 Zen Freeskates – Flow Meets Freedom" />
          <LinkCard href="/experiments" label="🧪 Experiments – WIP Ideas" />
          <LinkCard href="/farmgame" label="🌾 Active Idle Farm Game" />
          <LinkCard href="/meditation" label="🧘 Daily Meditation Timer" />
        </Section>

        <Section title="🔥 Lyra’s Corner">
          <LinkCard href="https://pneumevolve.github.io/dreamfire-gate" label="🌌 Dreamfire Gate – Enter the Codex" external />
        </Section>
      </div>

      {/* Footer */}
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-16 text-center">
        © {currentYear} PneumEvolve. Guided by Spirit, built with love.
      </p>

      {/* Feedback modal */}
      <Dialog
  open={isOpen}
  onClose={() => setIsOpen(false)}
  className="fixed inset-0 z-50 flex items-center justify-center p-4"
>
  {/* Backdrop */}
  <div className="fixed inset-0 bg-black/40" aria-hidden="true" />

  {/* Panel */}
  <Dialog.Panel className="relative z-10 w-full max-w-lg card p-5 sm:p-6
             max-h-[90dvh] sm:max-h-[85vh] overflow-y-auto overscroll-contain">
    <Dialog.Title className="text-xl sm:text-2xl font-bold mb-3">
      🚀 Help Build PneumEvolve
    </Dialog.Title>

    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Contact */}
      <div>
        <label className="block mb-1 text-sm font-medium opacity-80">
          Contact (email or social)
        </label>
        <input
          type="text"
          name="contact"
          value={form.contact}
          onChange={handleChange}
          className="w-full"
          placeholder="you@example.com"
        />
      </div>

      {/* Interests */}
      <div>
        <label className="block mb-2 text-sm font-medium opacity-80">
          What do you want to contribute?
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            "Ideas & Concepts",
            "Design & UI",
            "Development (Frontend)",
            "Development (Backend)",
            "Writing & Philosophy",
            "Testing & Feedback",
            "Community & Organization",
            "I’m not sure yet",
          ].map((option) => (
            <label
              key={option}
              className="flex items-center gap-2 rounded px-2 py-1 hover:bg-[color-mix(in_oklab,var(--bg)80%,transparent)]"
            >
              <input
                type="checkbox"
                checked={form.interests.includes(option)}
                onChange={() =>
                  setForm((prev) => ({
                    ...prev,
                    interests: prev.interests.includes(option)
                      ? prev.interests.filter((v) => v !== option)
                      : [...prev.interests, option],
                  }))
                }
              />
              <span className="text-sm">{option}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Textareas */}
      <FieldArea
        label="An idea you’d love to see"
        name="idea"
        value={form.idea}
        onChange={handleChange}
      />
      <FieldArea
        label="Any bugs or problems?"
        name="bugs"
        value={form.bugs}
        onChange={handleChange}
      />
      <FieldArea
        label="What are you good at / excited to learn?"
        name="skills"
        value={form.skills}
        onChange={handleChange}
      />
      <FieldArea
        label="Anything else?"
        name="extra"
        value={form.extra}
        onChange={handleChange}
      />

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={() => setIsOpen(false)} className="btn btn-secondary">
          Cancel
        </button>
        <button type="submit" className="btn">
          Submit
        </button>
      </div>
    </form>
  </Dialog.Panel>
</Dialog>
    </div>
  );
}

/* ---------- small helpers ---------- */

function FieldArea({ label, name, value, onChange }) {
  return (
    <div>
      <label className="block mb-1 text-sm font-medium opacity-80">{label}</label>
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        rows={3}
        className="w-full"
      />
    </div>
  );
}

function SpotlightCard({
  title,
  image,
  blurb,
  link = "#",
  cta = "Learn more",
  tag,
  fit = "contain",          // "contain" (no crop) | "cover" (crop)
  focal = "center",         // "top" | "center" | "bottom" (for cover)
  height = 360,         
}) {
  const fitClass = fit === "cover" ? "object-cover" : "object-contain";
  const focalClass =
    focal === "top" ? "object-top" : focal === "bottom" ? "object-bottom" : "object-center";

  return (
  <a
    href={link}
    className="card link-reset block hover:shadow-md transition text-[var(--text)]"
  >
    <div
  className="rounded-t-[calc(var(--radius)-2px)] px-3 pt-3 pb-2 flex items-center justify-center"
  style={{
    // subtle letterbox backdrop that works in light/dark
    background: "color-mix(in oklab, var(--bg) 85%, transparent)",
  }}
>
  <img
    src={image}
    alt={title}
    className={`${fitClass} ${focalClass} block`}
    style={{
      width: "100%",
      height: fit === "cover" ? height : "auto",
      maxHeight: height,        // ensures a nice, not-too-tall image
      objectFit: fit === "cover" ? "cover" : "contain",
    }}
    loading="lazy"
    decoding="async"
  />
</div>

    <div className="p-4">
      {tag && <span className="badge">{tag}</span>}
      <h3 className="mt-2 text-lg font-semibold">{title}</h3>
      {blurb && <p className="mt-1 text-sm opacity-80">{blurb}</p>}
      <div className="mt-3">
        <span className="link-default">{cta} →</span>
      </div>
    </div>
  </a>
);
}

function Section({ title, children }) {
  return (
    <section className="card">
      <h2 className="text-lg sm:text-xl font-semibold mb-3">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function LinkCard({ href, label, external = false }) {
  return (
    <a
      href={href}
      target={external ? "_blank" : "_self"}
      rel={external ? "noopener noreferrer" : undefined}
      className="card link-reset block hover:shadow-md transition"
    >
      <span className="text-base sm:text-lg font-medium">{label}</span>
    </a>
  );
}

function TextArea({ label, name, value, onChange }) {
  return (
    <div>
      <label className="block mb-1 text-sm font-medium">{label}</label>
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        rows={3}
        className="w-full p-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
      />
    </div>
  );
}
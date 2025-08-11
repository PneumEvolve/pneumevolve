import React, { useState } from "react";
import { Dialog } from "@headlessui/react";

export default function App() {
  const currentYear = new Date().getFullYear();
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({
    contact: "",
    interests: [],
    idea: "",
    bugs: "",
    skills: "",
    extra: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const toggleInterest = (value) => {
    setForm((prev) => {
      const interests = prev.interests.includes(value)
        ? prev.interests.filter((v) => v !== value)
        : [...prev.interests, value];
      return { ...prev, interests };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Submit failed: ${res.status} ${text}`);
      }
      alert("Thank you for your contribution!");
      setForm({ contact: "", interests: [], idea: "", bugs: "", skills: "", extra: "" });
      setIsOpen(false);
    } catch (err) {
      console.error(err);
      alert("Sorry, something went wrong submitting your contribution.");
    }
  };

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

  return (
    <div className="min-h-screen bg-white sm:bg-gradient-to-br sm:from-sky-100 sm:to-blue-200 dark:bg-gray-900 sm:dark:from-gray-900 sm:dark:to-black text-gray-900 dark:text-white px-4 sm:px-6 py-10 font-sans">
      {/* Hero */}
      <div className="flex flex-col items-center text-center mb-10 sm:mb-12 space-y-5">
        <div className="space-y-2.5 max-w-xl sm:max-w-2xl">
          <h2 className="text-xl sm:text-3xl font-semibold leading-snug">
            Do you believe in building something better than what we’ve got?
          </h2>
          <h2 className="text-xl sm:text-3xl font-semibold leading-snug">
            Do you have a skill, a heart, or a dream you want to contribute?
          </h2>
          <h2 className="text-xl sm:text-3xl font-semibold leading-snug">
            Do you want to explore new ways of creating and organizing together?
          </h2>
        </div>

        <img
          src="/logo.png"
          alt="PneumEvolve Logo"
          className="w-20 h-20 sm:w-24 sm:h-24 mb-2 rounded-full shadow-lg border-4 border-blue-300 dark:border-indigo-500"
        />
        <h1 className="text-3xl sm:text-5xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent">
          PneumEvolve
        </h1>
        <p className="text-base sm:text-xl text-gray-800 dark:text-gray-300 max-w-xl sm:max-w-2xl leading-relaxed">
          Here's what I've built so far. Now I want to build <strong>with you</strong>, and <strong>for you</strong>.
          This is not a company. This is not a business. This is a co-creation and you are invited. Let’s start now.
        </p>

        <button
          onClick={() => setIsOpen(true)}
          className="mt-4 inline-flex items-center justify-center w-full sm:w-auto px-5 py-3 text-base sm:text-lg bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 shadow"
        >
          🚀 Help Build PneumEvolve
        </button>
      </div>

      {/* Sections */}
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
        <LinkCard
          href="https://pneumevolve.github.io/dreamfire-gate"
          label="🌌 Dreamfire Gate – Enter the Codex"
          external
        />
      </Section>

      {/* Feedback Dialog — mobile-first sheet with solid panel & high contrast */}
      <Dialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        className="fixed inset-0 z-50"
      >
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-end sm:items-center justify-center p-4">
            <Dialog.Panel className="w-full max-w-full sm:max-w-xl rounded-t-2xl sm:rounded-2xl bg-white dark:bg-gray-900 shadow-xl mx-0 sm:mx-auto p-5 sm:p-6">
              <Dialog.Title className="text-xl sm:text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">
                🚀 Help Build PneumEvolve
              </Dialog.Title>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Contact */}
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-800 dark:text-gray-200">
                    How can we contact you? <span className="opacity-70">(Email or social)</span>
                  </label>
                  <input
                    type="text"
                    name="contact"
                    value={form.contact}
                    onChange={handleChange}
                    className="w-full py-3 px-3 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="you@example.com or @yourhandle"
                  />
                </div>

                {/* Interests */}
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-800 dark:text-gray-200">
                    What do you most want to contribute?
                  </label>
                  <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 gap-2">
                    {interestOptions.map((option) => {
                      const checked = form.interests.includes(option);
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => toggleInterest(option)}
                          aria-pressed={checked}
                          className={`w-full text-left px-3 py-2 rounded-lg border text-sm
                            ${checked
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-white dark:bg-zinc-800 text-gray-800 dark:text-gray-100 border-gray-300 dark:border-zinc-700"
                            }
                            focus:outline-none focus:ring-2 focus:ring-blue-500`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Idea */}
                <FieldBlock
                  label="What’s an idea you’d love to see in PneumEvolve?"
                  name="idea"
                  value={form.idea}
                  onChange={handleChange}
                  placeholder="Tell us something you wish existed here…"
                />

                {/* Bugs */}
                <FieldBlock
                  label="Have you noticed any bugs or problems?"
                  name="bugs"
                  value={form.bugs}
                  onChange={handleChange}
                  placeholder="What’s broken or confusing?"
                />

                {/* Skills */}
                <FieldBlock
                  label="What are you good at, or excited to learn?"
                  name="skills"
                  value={form.skills}
                  onChange={handleChange}
                  placeholder="e.g., React, design, writing, organizing…"
                />

                {/* Extra */}
                <FieldBlock
                  label="Anything else you want to share?"
                  name="extra"
                  value={form.extra}
                  onChange={handleChange}
                  placeholder="Dreams, context, links—anything!"
                />

                <div className="flex flex-col sm:flex-row gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-3 rounded-lg bg-gray-200 dark:bg-zinc-800 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Submit
                  </button>
                </div>
              </form>
            </Dialog.Panel>
          </div>
        </div>
      </Dialog>

      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-14 text-center">
        © {currentYear} PneumEvolve. Guided by Spirit, built with love.
      </p>
    </div>
  );
}

/* ---------- helpers & small components ---------- */

function FieldBlock({ label, name, value, onChange, placeholder }) {
  return (
    <div>
      <label className="block mb-1 text-sm font-medium text-gray-800 dark:text-gray-200">
        {label}
      </label>
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        rows={4}
        className="w-full py-3 px-3 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder={placeholder}
      />
    </div>
  );
}

const Section = ({ title, children }) => (
  <div className="mb-12 sm:mb-16">
    <h2 className="text-xl sm:text-2xl font-semibold mb-4 border-l-4 border-blue-500 dark:border-indigo-500 pl-4">
      {title}
    </h2>
    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {children}
    </div>
  </div>
);

const LinkCard = ({ href, label, external = false }) => (
  <a
    href={href}
    target={external ? "_blank" : "_self"}
    rel={external ? "noopener noreferrer" : ""}
    className="block rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 sm:p-5 shadow-sm hover:shadow-md hover:border-blue-500 dark:hover:border-blue-400 transition text-gray-900 dark:text-gray-100 text-base"
  >
    <span className="font-medium">{label}</span>
  </a>
);
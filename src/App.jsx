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
    console.log("Submitted Feedback:", form);
    await fetch(`${import.meta.env.VITE_API_URL}/inbox/contribute`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(form),
});
    alert("Thank you for your contribution!");
    setForm({ contact: "", interests: [], idea: "", bugs: "", skills: "", extra: "" });
    setIsOpen(false);
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
    <div className="min-h-screen bg-gradient-to-br from-sky-100 to-blue-200 dark:from-gray-900 dark:to-black text-gray-900 dark:text-white px-6 py-12 font-sans">
      <div className="flex flex-col items-center text-center mb-12 space-y-6">
        <div className="space-y-3 max-w-2xl">
          <h2 className="text-2xl sm:text-3xl font-semibold">Do you believe in building something better than what we’ve got?</h2>
          <h2 className="text-2xl sm:text-3xl font-semibold">Do you have a skill, a heart, or a dream you want to contribute?</h2>
          <h2 className="text-2xl sm:text-3xl font-semibold">Do you want to explore new ways of creating and organizing together?</h2>
        </div>

        <img
          src="/logo.png"
          alt="PneumEvolve Logo"
          className="w-24 h-24 mb-4 rounded-full shadow-lg border-4 border-blue-300 dark:border-indigo-500"
        />
        <h1 className="text-4xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent">
          PneumEvolve
        </h1>
        <p className="text-lg sm:text-xl text-gray-700 dark:text-gray-300 max-w-2xl leading-relaxed">
          Here's what I've built so far. Now I want to build <strong>with you</strong>, and <strong>for you</strong>. This is not a company. This is not a business. This is a co-creation and You are invited. Let's start now.
        </p>
        <button
          onClick={() => setIsOpen(true)}
          className="mt-6 px-6 py-3 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 shadow"
        >
          🚀 Help Build PneumEvolve
        </button>
      </div>

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
        <LinkCard href="/livingplan" label="PneumEvolves Evolving Plan" />
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

      <Dialog open={isOpen} onClose={() => setIsOpen(false)} className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
        <Dialog.Panel className="bg-white dark:bg-gray-900 max-h-[90vh] overflow-y-auto p-6 rounded-xl max-w-2xl w-full shadow-xl">
          <Dialog.Title className="text-2xl font-bold mb-4">🚀 Help Build PneumEvolve</Dialog.Title>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block mb-1 font-medium">How can we contact you? (Email or social)</label>
              <input
                type="text"
                name="contact"
                value={form.contact}
                onChange={handleChange}
                className="w-full p-2 border rounded dark:bg-gray-800"
              />
            </div>

            <div>
              <label className="block mb-2 font-medium">What do you most want to contribute?</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {interestOptions.map((option) => (
                  <label key={option} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.interests.includes(option)}
                      onChange={() => toggleInterest(option)}
                    />
                    {option}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block mb-1 font-medium">What’s an idea you’d love to see in PneumEvolve?</label>
              <textarea name="idea" value={form.idea} onChange={handleChange} className="w-full p-2 border rounded dark:bg-gray-800" />
            </div>

            <div>
              <label className="block mb-1 font-medium">Have you noticed any bugs or problems?</label>
              <textarea name="bugs" value={form.bugs} onChange={handleChange} className="w-full p-2 border rounded dark:bg-gray-800" />
            </div>

            <div>
              <label className="block mb-1 font-medium">What are you good at, or excited to learn?</label>
              <textarea name="skills" value={form.skills} onChange={handleChange} className="w-full p-2 border rounded dark:bg-gray-800" />
            </div>

            <div>
              <label className="block mb-1 font-medium">Anything else you want to share?</label>
              <textarea name="extra" value={form.extra} onChange={handleChange} className="w-full p-2 border rounded dark:bg-gray-800" />
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 bg-gray-300 dark:bg-gray-700 rounded">
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                Submit
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </Dialog>

      <p className="text-sm text-gray-500 dark:text-gray-400 mt-16 text-center">
        © {currentYear} PneumEvolve. Guided by Spirit, built with love.
      </p>
    </div>
  );
}

const Section = ({ title, children }) => (
  <div className="mb-16">
    <h2 className="text-2xl font-semibold mb-4 border-l-4 border-blue-400 dark:border-indigo-500 pl-4">
      {title}
    </h2>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
  </div>
);

const LinkCard = ({ href, label, external = false }) => (
  <a
    href={href}
    target={external ? "_blank" : "_self"}
    rel={external ? "noopener noreferrer" : ""}
    className="block bg-white dark:bg-gray-900 rounded-xl shadow-sm hover:shadow-md border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 p-5 transition"
  >
    <span className="text-lg font-medium text-gray-800 dark:text-gray-100">
      {label}
    </span>
  </a>
);

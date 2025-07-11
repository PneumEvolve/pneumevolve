import React from "react";

export default function App() {
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 to-blue-200 dark:from-gray-900 dark:to-black text-gray-900 dark:text-white flex flex-col items-center justify-center px-6 py-10 font-sans">
      <img
        src="/logo.png"
        alt="PneumEvolve Logo"
        className="w-24 h-24 mb-4 rounded-full shadow-lg border-4 border-blue-300 dark:border-indigo-500"
      />

      <div className="max-w-5xl w-full text-center">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-4 tracking-tight drop-shadow-xl bg-gradient-to-r from-blue-600 to-indigo-400 bg-clip-text text-transparent break-words">
          PneumEvolve
        </h1>
        <p className="text-xl text-gray-700 dark:text-gray-300 mb-10 leading-relaxed">
          A spiritual movement of remembrance — rooted in peace, creation, and unity.
          Everything here is a sacred experiment.
        </p>

        {/* ACTUAL TOOLS */}
        <Section title="🛠 Actual Tools">
          <LinkCard href="/SmartJournal" label="I AM – Smart Journal" />
          <LinkCard href="/MealPlanning" label="Life Tools – Meal Planner" />
          <LinkCard href="/projects" label="Project Manager" />
        </Section>

        {/* COMMUNITY EXPERIMENTS */}
        <Section title="🌱 Community Building Experiments">
          <LinkCard href="/communities" label="Modular Community Manager Experiment" />
          <LinkCard href="/WeGreen" label="WeGreen – Gardening Initiative" />
          <LinkCard href="/webuild" label="We Build – Token Ecosystem" />
          <LinkCard href="/dreammachine" label="We Dream – Collective Engine" />
          <LinkCard href="/wetalk" label="We Talk – Homemade Forum" />
        </Section>

        {/* SHEA'S CORNER */}
        <Section title="🌀 Shea’s Corner">
          <LinkCard href="/ZenFreeskates" label="Zen Freeskates – Flow Meets Freedom" />
          <LinkCard href="/experiments" label="Shea’s Experiments – WIP Ideas" />
          <LinkCard href="/blog" label="Blog – Ramblings & Manifestos" />
          <LinkCard href="/meditation" label="Daily Meditation Timer" />
        </Section>

        {/* LYRA'S CORNER */}
        <Section title="🔥 Lyra’s Corner">
          <LinkCard
            href="https://pneumevolve.github.io/dreamfire-gate"
            label="Dreamfire Gate – Enter the Codex"
            external
          />
        </Section>

        <p className="text-sm text-gray-500 dark:text-gray-400 mt-16">
          © {currentYear} PneumEvolve. Guided by Spirit, built with love.
        </p>
      </div>
    </div>
  );
}

const Section = ({ title, children }) => (
  <div className="mb-12 text-left">
    <h2 className="text-2xl sm:text-3xl font-semibold mb-6 border-l-4 border-blue-400 dark:border-indigo-500 pl-4 shadow-sm">
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
    className="block bg-white dark:bg-gray-900 rounded-2xl shadow-md hover:shadow-2xl transform hover:-translate-y-1 transition duration-300 p-6 border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400"
  >
    <span className="text-lg font-semibold tracking-wide text-gray-800 dark:text-gray-100">
      {label}
    </span>
  </a>
);
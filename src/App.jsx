import React from "react";

export default function App() {
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 to-blue-200 dark:from-gray-900 dark:to-black text-gray-900 dark:text-white px-6 py-12 font-sans">
      {/* Logo and Intro */}
      <div className="flex flex-col items-center text-center mb-12">
        <img
          src="/logo.png"
          alt="PneumEvolve Logo"
          className="w-24 h-24 mb-4 rounded-full shadow-lg border-4 border-blue-300 dark:border-indigo-500"
        />
        <h1 className="text-4xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent">
          PneumEvolve
        </h1>
        <p className="text-lg sm:text-xl text-gray-700 dark:text-gray-300 max-w-2xl leading-relaxed">
          A spiritual and practical movement to grow communities, reclaim self-trust, and build new systems rooted in love, cooperation, and shared joy.
        </p>
      </div>

      {/* Our Favourites */}
      <Section title="💖 Our Favourites">
        <LinkCard href="/farmgame" label="🌾 Farm Game" />
        <LinkCard href="/dreammachine" label="💭 Dream Machine" />
        <LinkCard href="/journal" label="📓 I AM – Journal" />
        <LinkCard href="/communities" label="🏘 Community Manager" />
      </Section>

      {/* Tools Section */}
      <Section title="🛠 Core Tools">
        <LinkCard href="/journal" label="📓 I AM – Journal" />
        <LinkCard href="/MealPlanning" label="🍽️ Life Tools – Meal Planner" />
        <LinkCard href="/projects" label="📋 Project Manager" />
      </Section>

      {/* Community Experiments */}
      <Section title="🌱 Community Experiments">
        <LinkCard href="/communities" label="🏘 Modular Community Manager" />
        <LinkCard href="/WeGreen" label="🌿 WeGreen – Gardening Initiative" />
        <LinkCard href="/webuild" label="🪙 We Build – Token Ecosystem" />
        <LinkCard href="/dreammachine" label="💭 We Dream – Collective Engine" />
        <LinkCard href="/wetalk" label="💬 We Talk – Homemade Forum" />
      </Section>

      {/* Creative Playground */}
      <Section title="🎨 Creative Playground">
        <LinkCard href="/ZenFreeskates" label="🛼 Zen Freeskates – Flow Meets Freedom" />
        <LinkCard href="/experiments" label="🧪 Experiments – WIP Ideas" />
        <LinkCard href="/farmgame" label="🌾 Active Idle Farm Game" />
        <LinkCard href="/meditation" label="🧘 Daily Meditation Timer" />
      </Section>

      {/* Lyra's Corner */}
      <Section title="🔥 Lyra’s Corner">
        <LinkCard
          href="https://pneumevolve.github.io/dreamfire-gate"
          label="🌌 Dreamfire Gate – Enter the Codex"
          external
        />
      </Section>

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
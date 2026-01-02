// src/pages/SiteMap.jsx (styled for light/dark – Three-Step Map)
import { Link as RLink } from "react-router-dom";
import { useAuth as useAuthMap } from "@/context/AuthContext";
import {
  Compass,
  Hammer,
  Users,
  TreePine,
  LayoutGrid,
  MessageSquare,
  NotebookPen,
  FileText,
  Map as MapIcon,
  Brain,
  ClipboardList,
  Salad,
  Moon,
  Gamepad2,
  Wind
} from "lucide-react";

// Shared tile renderer — consistent card + icon bubble that adapts to light/dark
function Tile({ to, title, description, Icon, status }) {
  return (
    <li className="card p-4 hover:shadow-lg transition group">
      <RLink to={to} className="block">
        <div className="flex items-start gap-3">
          {/* Icon bubble */}
          <span
            className="shrink-0 h-10 w-10 rounded-xl grid place-items-center border"
            style={{
              background: "color-mix(in oklab, var(--bg) 85%, transparent)",
              borderColor: "var(--border)",
            }}
          >
            <Icon className="h-5 w-5 opacity-80" />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-lg font-semibold leading-tight truncate">{title}</h3>
              <span className="badge whitespace-nowrap">{status}</span>
            </div>
            <p className="mt-1 text-sm line-clamp-2">{description}</p>
          </div>
        </div>
      </RLink>
    </li>
  );
}

// Step 1: Personal Development tools (login may be required for some)
const tilesPersonal = ({ isLoggedIn }) => [
  {
    title: "Journal",
    to: isLoggedIn ? "/journal" : "/signup",
    description: isLoggedIn ? "Write, reflect, track intentions." : "Create an account to start journaling.",
    icon: NotebookPen,
    status: isLoggedIn ? "Ready" : "Sign up",
  },
  {
    title: "Meal Planner",
    to: "/meal-planning",
    description: "Plan simple meals that support your day.",
    icon: Salad,
    status: "Ready",
  },
  {
    title: "Projects",
    to: "/projects",
    description: "Organize tasks and personal goals.",
    icon: ClipboardList,
    status: "Ready",
  },
  {
    title: "Meditation Timer",
    to: "/meditation",
    description: "A simple timer for daily presence.",
    icon: Brain,
    status: "Ready",
  },
];

// Step 2: Community Development (everything else lives here)
const tilesCommunity = () => [
  {
    title: "Forge",
    to: "/forge2",
    description: "Propose ideas, vote, and help build PneumEvolve.",
    icon: Hammer,
    status: "Open",
  },
  {
    title: "Dream Machine",
    to: "/dream-machine",
    description: "A shared engine for collective dreaming & prompts.",
    icon: Moon,
    status: "Beta",
  },
  {
    title: "Communities",
    to: "/communities",
    description: "Find people, projects, and local action.",
    icon: Users,
    status: "Beta",
  },
  
  {
    title: "Experiments",
    to: "/experiments",
    description: "Lightweight prototypes and WIP ideas.",
    icon: LayoutGrid,
    status: "Lab",
  },
  {
    title: "WeGreen",
    to: "/we-green",
    description: "Gardening and resilience initiative.",
    icon: TreePine,
    status: "Community",
  },
  
  {
    title: "Blog",
    to: "/blog",
    description: "Updates and reflections from the journey.",
    icon: FileText,
    status: "Read",
  },
  
  {
    title: "Map",
    to: "/sitemap",
    description: "You are here. Overview of the whole space.",
    icon: MapIcon,
    status: "Guide",
  },
];

// Step 3: Have Fun (playful spaces)
const tilesFun = () => [
  {
    title: "Farm Game",
    to: "/farm-game",
    description: "An active idle game — plant, tend, flow. Designed for Desktop.",
    icon: Gamepad2,
    status: "Play",
  },
  {
    title: "Zen Freeskates",
    to: "/zen-freeskates",
    description: "Learn how to freeskate.",
    icon: Wind,
    status: "Play/Watch",
  },
  {
    title: "Tree of Life",
    to: "/my-tree",
    description: "Watch your path grow as you participate.",
    icon: TreePine,
    status: "Growing",
  },
];

export function SiteMap() {
  const { isLoggedIn } = useAuthMap();
  const personal = tilesPersonal({ isLoggedIn });
  const community = tilesCommunity();
  const fun = tilesFun();

  return (
    <main className="min-h-[80vh] p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Compass className="h-7 w-7" /> Map of PneumEvolve
          </h1>
          <RLink to="/" className="underline underline-offset-4 hover:no-underline">Back to Home</RLink>
        </header>

        {/* Intro */}
        <div className="section-bar mb-8">
          <p className="text-sm sm:text-base">
            Three steps. Start where you are.
            <span className="block mt-1"><strong>Step 1 – Personal Development:</strong> use simple tools to steady your day and grow your practice.</span>
            <span className="block"><strong>Step 2 – Community Development:</strong> bring your energy into shared projects and decisions.</span>
            <span className="block"><strong>Step 3 – Have Fun:</strong> play, explore, and restore your spark.</span>
          </p>
        </div>

        {/* Step 1 */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold mb-4">Step 1 – Personal Development</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {personal.map(({ title, to, description, icon: Icon, status }) => (
              <Tile key={title} to={to} title={title} description={description} Icon={Icon} status={status} />
            ))}
          </ul>
        </section>

        {/* Step 2 */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold mb-4">Step 2 – Community Development</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {community.map(({ title, to, description, icon: Icon, status }) => (
              <Tile key={title} to={to} title={title} description={description} Icon={Icon} status={status} />
            ))}
          </ul>
        </section>

        {/* Step 3 */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Step 3 – Have Fun</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {fun.map(({ title, to, description, icon: Icon, status }) => (
              <Tile key={title} to={to} title={title} description={description} Icon={Icon} status={status} />
            ))}
          </ul>
        </section>

        {/* Footer note */}
        <section className="mt-10 space-y-2 text-sm">
          <h3 className="text-base font-semibold">How this map works</h3>
          <p>• <span className="font-medium">Ready</span> means you can use it now. <span className="font-medium">Beta/Lab</span> may change quickly. <span className="font-medium">Growing</span> evolves as you participate.</p>
          <p className="opacity-80">Kept it human-centered and simple. No AI-specific routes.</p>
        </section>
      </div>
    </main>
  );
}

export default SiteMap;
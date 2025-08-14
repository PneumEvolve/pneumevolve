// src/pages/SiteMap.jsx (new page)
import { Link as RLink } from "react-router-dom";
import { useAuth as useAuthMap } from "@/context/AuthContext";
import { Compass, Hammer, Users, TreePine, LayoutGrid, MessageSquare, NotebookPen } from "lucide-react";

const tiles = ({ isLoggedIn }) => [
  {
    title: "Journal",
    to: isLoggedIn ? "/journal" : "/signup",
    description: isLoggedIn ? "Write, reflect, track intentions." : "Create an account to start journaling.",
    icon: NotebookPen,
    status: isLoggedIn ? "Ready" : "Sign up",
  },
  {
    title: "Forge",
    to: "/forge",
    description: "Propose ideas and vote on what we build next.",
    icon: Hammer,
    status: "Open",
  },
  {
    title: "Communities",
    to: "/communities",
    description: "Find people, projects, and local action.",
    icon: Users,
    status: "Beta",
  },
  {
    title: "Tree of Life",
    to: "/mytree",
    description: "Watch your path grow as you contribute.",
    icon: TreePine,
    status: "Growing",
  },
  {
    title: "Tools",
    to: "/mytools",
    description: "Lightweight utilities that support your journey.",
    icon: LayoutGrid,
    status: "Optional",
  },
  {
    title: "Messages",
    to: "/inbox",
    description: "Updates, invites, and conversations.",
    icon: MessageSquare,
    status: "Inbox",
  },
];

export function SiteMap() {
  const { isLoggedIn } = useAuthMap();
  const data = tiles({ isLoggedIn });

  return (
    <main className="min-h-[80vh] p-6">
      <div className="max-w-5xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Compass className="h-7 w-7" /> Map of PneumEvolve
          </h1>
          <RLink to="/" className="underline underline-offset-4 hover:no-underline">Back to Home</RLink>
        </header>

        <p className="text-gray-700 dark:text-gray-300 mb-8">
          One map. Few clear paths. Start where you feel alive. As you contribute, new areas unlock and your tree grows.
        </p>

        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map(({ title, to, description, icon: Icon, status }) => (
            <li key={title} className="border rounded-2xl p-4 hover:shadow-md transition">
              <RLink to={to} className="block">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold">{title}</h2>
                  <span className="text-xs px-2 py-1 rounded-full border">{status}</span>
                </div>
                <div className="flex items-start gap-3">
                  <Icon className="h-6 w-6 mt-0.5" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
                </div>
              </RLink>
            </li>
          ))}
        </ul>

        <section className="mt-10 space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <h3 className="text-base font-semibold">How the map works</h3>
          <p>
            • <span className="font-medium">Ready</span> means you can use it now. <span className="font-medium">Beta</span> may change quickly. <span className="font-medium">Growing</span> evolves as you participate.
          </p>
        </section>
      </div>
    </main>
  );
}

export default SiteMap;
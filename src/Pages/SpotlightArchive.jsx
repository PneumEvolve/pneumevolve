export default function SpotlightArchive() {
  const items = [
    {
      id: 1,
      title: "Community · Katie’s Journaling Flow",
      image: "/spotlights/katie.webp",
      blurb: "Iterative UX for daily reflection.",
      href: "/forge/123",
    },
    {
      id: 2,
      title: "External · Lyra’s Dreamfire Gate",
      image: "/spotlights/dreamfire.webp",
      blurb: "A living codex exploring dreamwork.",
      href: "https://pneumevolve.github.io/dreamfire-gate",
      external: true,
    },
  ];
  return (
    <div className="main space-y-4">
      <h1 className="text-3xl font-bold mb-2">Spotlight Archive</h1>
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((it) => (
          <a
            key={it.id}
            href={it.href}
            target={it.external ? "_blank" : "_self"}
            rel={it.external ? "noopener noreferrer" : ""}
            className="card hover:shadow-md transition"
          >
            {it.image && <img src={it.image} alt="" className="w-full h-40 object-cover rounded-lg mb-3" />}
            <h3 className="font-semibold mb-1">{it.title}</h3>
            <p className="text-sm opacity-80">{it.blurb}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
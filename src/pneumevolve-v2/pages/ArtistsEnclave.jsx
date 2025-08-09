// /src/pneumevolve-v2/pages/ArtistsEnclave.jsx
import React, { useState } from "react";

export default function ArtistsEnclave() {
  const [images] = useState([
    {
      id: 1,
      name: "Dream Forest",
      url: "/tree1_bg.png",
      votes: 12,
    },
    {
      id: 2,
      name: "Galactic Bloom",
      url: "/tree2_bg.png",
      votes: 7,
    },
    {
      id: 3,
      name: "Rooted Sky",
      url: "/tree3_bg.png",
      votes: 4,
    },
  ]);

  const [selectedId, setSelectedId] = useState(null);

  const handleVote = (id) => {
    setSelectedId(id); // this is placeholder — in a real version, you'd update the backend
    alert("Vote submitted! (Voting backend not implemented yet)");
  };

  return (
    <div className="min-h-screen p-6 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold">🎨 Artists Enclave</h1>
          <p className="mt-2 text-lg text-gray-600 dark:text-gray-300">
            This is where the aesthetic of PneumEvolve begins. Vote on your favorite background image.
            Submissions will open in Stage 2.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {images.map((img) => (
            <div
              key={img.id}
              className={`rounded overflow-hidden shadow hover:scale-105 transition-all border-2 ${
                selectedId === img.id
                  ? "border-green-600"
                  : "border-transparent"
              }`}
            >
              <img
                src={img.url}
                alt={img.name}
                className="w-full h-40 object-cover"
              />
              <div className="p-4 flex flex-col items-center">
                <h2 className="text-lg font-semibold mb-1">{img.name}</h2>
                <p className="text-sm text-gray-500 mb-2">Votes: {img.votes}</p>
                <button
                  onClick={() => handleVote(img.id)}
                  className="bg-green-600 text-white px-4 py-1 rounded hover:bg-green-700"
                >
                  Vote
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          Stage 2 will allow artists to submit new background options and vote on themes. For now, choose your favorite.
        </div>
      </div>
    </div>
  );
}

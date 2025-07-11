const ResourceBoard = () => {
  const resources = [
    { title: "Garden Blitz Guide", url: "https://example.com" },
    { title: "Seed Sharing Spreadsheet", url: "#" },
  ];

  return (
    <div className="p-4 bg-white rounded shadow space-y-2">
      <h2 className="text-xl font-bold">📚 Resources</h2>
      {resources.map((r, i) => (
        <a key={i} href={r.url} className="block text-blue-600 hover:underline" target="_blank">
          {r.title}
        </a>
      ))}
    </div>
  );
};
export default ResourceBoard;
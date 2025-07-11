const CommunityChat = () => {
  const messages = [
    { user: "Shea", text: "Welcome everyone 🌿" },
    { user: "Anna", text: "Excited to get started!" },
  ];

  return (
    <div className="p-4 bg-white rounded shadow h-64 overflow-y-auto space-y-2">
      <h2 className="text-xl font-bold">💬 Community Chat</h2>
      {messages.map((msg, i) => (
        <p key={i}><strong>{msg.user}:</strong> {msg.text}</p>
      ))}
      <input type="text" placeholder="Say something..." className="mt-2 w-full border p-2 rounded" />
    </div>
  );
};
export default CommunityChat;
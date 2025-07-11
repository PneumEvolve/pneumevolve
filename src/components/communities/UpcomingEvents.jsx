const UpcomingEvents = () => {
  const events = [
    { date: "July 20", name: "Garden Planting Day" },
    { date: "Aug 5", name: "Tool Swap & BBQ" },
  ];

  return (
    <div className="p-4 bg-white rounded shadow space-y-2">
      <h2 className="text-xl font-bold">📅 Upcoming Events</h2>
      {events.map((e, i) => (
        <div key={i} className="border-b pb-1">
          <span className="font-semibold">{e.date}:</span> {e.name}
        </div>
      ))}
    </div>
  );
};
export default UpcomingEvents;
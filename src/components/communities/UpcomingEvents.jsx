import React, { useEffect, useState } from "react";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
  startOfWeek,
  addDays,
} from "date-fns";
import CollapsibleComponent from "../ui/CollapsibleComponent";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";

const API = import.meta.env.VITE_API_URL;

export default function UpcomingEvents({ communityId, isAdmin }) {
  const { userId, accessToken } = useAuth();

  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [eventsByDate, setEventsByDate] = useState({});
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventDesc, setNewEventDesc] = useState("");
  const [editingEventId, setEditingEventId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingDesc, setEditingDesc] = useState("");

  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const startDayOfWeek = startOfWeek(monthStart, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: startDayOfWeek, end: monthEnd });

  const weekDays = Array.from({ length: 7 }).map((_, i) =>
    format(addDays(startOfWeek(viewDate, { weekStartsOn: 0 }), i), "EEE")
  );

  const fetchEvents = async () => {
    try {
      const res = await axios.get(`${API}/communities/${communityId}/events`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const grouped = {};
      for (const event of res.data) {
        const date = event.date;
        if (!grouped[date]) grouped[date] = [];
        grouped[date].push(event);
      }
      setEventsByDate(grouped);
    } catch (err) {
      console.error("Error fetching events:", err);
    }
  };

  useEffect(() => {
    if (accessToken && communityId) fetchEvents();
  }, [viewDate]);

  const handleDayClick = (date) => {
    setSelectedDate(format(date, "yyyy-MM-dd"));
  };

  const changeMonth = (dir) => {
    setViewDate(dir === "next" ? addMonths(viewDate, 1) : subMonths(viewDate, 1));
    setSelectedDate(null);
  };

  const addEvent = async () => {
    if (!newEventTitle.trim()) return;
    try {
      const res = await axios.post(
        `${API}/communities/${communityId}/events`,
        {
          title: newEventTitle,
          description: newEventDesc,
          date: selectedDate,
          community_id: communityId,
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      setEventsByDate((prev) => ({
        ...prev,
        [selectedDate]: [...(prev[selectedDate] || []), res.data],
      }));
      setNewEventTitle("");
      setNewEventDesc("");
    } catch (err) {
      console.error("Error adding event:", err);
    }
  };

  const handleEdit = (event) => {
    setEditingEventId(event.id);
    setEditingTitle(event.title);
    setEditingDesc(event.description);
  };

  const saveEdit = async (eventId) => {
    try {
      await axios.put(
        `${API}/communities/${communityId}/events/${eventId}`,
        {
          title: newEventTitle,
          description: newEventDesc,
          date: selectedDate,
          community_id: communityId,
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      setEventsByDate((prev) => {
        const updated = { ...prev };
        updated[selectedDate] = updated[selectedDate].map((e) =>
          e.id === eventId ? { ...e, title: editingTitle, description: editingDesc } : e
        );
        return updated;
      });

      setEditingEventId(null);
    } catch (err) {
      console.error("Error saving edit:", err);
    }
  };

  const deleteEvent = async (eventId) => {
    try {
      await axios.delete(`${API}/communities/${communityId}/events/${eventId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setEventsByDate((prev) => {
        const updated = { ...prev };
        updated[selectedDate] = updated[selectedDate].filter((e) => e.id !== eventId);
        return updated;
      });
    } catch (err) {
      console.error("Error deleting event:", err);
    }
  };

  return (
    <CollapsibleComponent title="📅 Upcoming Events">
      <div className="flex justify-between items-center mb-2">
        <button onClick={() => changeMonth("prev")} className="text-sm px-2 py-1 bg-gray-200 rounded">
          ← Prev
        </button>
        <h2 className="font-bold text-lg">{format(viewDate, "MMMM yyyy")}</h2>
        <button onClick={() => changeMonth("next")} className="text-sm px-2 py-1 bg-gray-200 rounded">
          Next →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-2 text-xs font-semibold text-center border-b pb-2">
        {weekDays.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2 text-sm mt-2">
        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const isCurrentMonth = isSameMonth(day, viewDate);
          const hasEvents = eventsByDate[dateStr]?.length > 0;

          return (
            <div
              key={dateStr}
              onClick={() => handleDayClick(day)}
              className={`p-2 rounded text-center cursor-pointer border 
                ${isToday(day) ? "bg-blue-100 font-bold" : ""}
                ${!isCurrentMonth ? "text-gray-400" : ""}
              `}
            >
              {format(day, "d")}
              {hasEvents && (
                <div className="mt-1 text-xs text-green-700 truncate">
                  {eventsByDate[dateStr][0].title}
                  {eventsByDate[dateStr].length > 1 && " + more"}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedDate && (
        <div className="mt-4 border-t pt-4">
          <h3 className="font-semibold mb-1">Events for {selectedDate}</h3>
          <ul className="mb-3">
            {(eventsByDate[selectedDate] || []).map((evt) => (
              <li key={evt.id} className="text-sm text-gray-700 mb-2">
                {editingEventId === evt.id ? (
                  <div className="space-y-1">
                    <input
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      className="border p-1 text-sm w-full"
                    />
                    <textarea
                      value={editingDesc}
                      onChange={(e) => setEditingDesc(e.target.value)}
                      rows={2}
                      className="border p-1 text-sm w-full"
                    />
                    <div className="flex gap-2 mt-1">
                      <button onClick={() => saveEdit(evt.id)} className="text-green-700 text-sm">Save</button>
                      <button onClick={() => setEditingEventId(null)} className="text-gray-500 text-sm">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div>
                    • <strong>{evt.title}</strong>
                    {evt.description && <> – <em>{evt.description}</em></>}
                    {(isAdmin || evt.user_id === parseInt(userId)) && (
                      <div className="flex gap-2 text-xs mt-1 text-blue-600">
                        <button onClick={() => handleEdit(evt)}>Edit</button>
                        <button onClick={() => deleteEvent(evt.id)} className="text-red-600">Delete</button>
                      </div>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>

          <input
            type="text"
            className="border p-1 mb-2 w-full text-sm"
            placeholder="Event title"
            value={newEventTitle}
            onChange={(e) => setNewEventTitle(e.target.value)}
          />
          <textarea
            className="border p-1 mb-2 w-full text-sm"
            rows={2}
            placeholder="Event description (optional)"
            value={newEventDesc}
            onChange={(e) => setNewEventDesc(e.target.value)}
          />
          <button
            onClick={addEvent}
            className="bg-green-600 text-white px-3 py-1 rounded text-sm"
          >
            ➕ Add Event
          </button>
        </div>
      )}
    </CollapsibleComponent>
  );
}
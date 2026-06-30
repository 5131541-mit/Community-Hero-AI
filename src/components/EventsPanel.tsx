import React, { useState, useEffect } from "react";
import { CivicEvent, UserProfile } from "../types";
import { 
  Calendar, Clock, MapPin, Users, PlusCircle, CheckCircle, 
  Sparkles, CalendarPlus, UserCheck, ChevronRight, MessageSquare 
} from "lucide-react";

interface EventsPanelProps {
  userProfile: UserProfile;
  onGrantXP: (amount: number, reason: string) => void;
}

export default function EventsPanel({ userProfile, onGrantXP }: EventsPanelProps) {
  const [events, setEvents] = useState<CivicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<'Cleanup Drive' | 'Tree Planting' | 'Awareness Campaign' | 'Volunteer Event' | 'Other'>("Cleanup Drive");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [locationName, setLocationName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch events from backend database
  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/events");
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (err) {
      console.error("Error fetching community events:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleJoinEvent = async (eventId: string) => {
    try {
      const res = await fetch(`/api/events/${eventId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userProfile.email })
      });

      if (res.ok) {
        const updatedEvent = await res.json();
        setEvents((prev) => prev.map((e) => e.id === eventId ? updatedEvent : e));
        
        // Award XP points for joining
        onGrantXP(100, "Joining local community volunteer event!");
      }
    } catch (err) {
      console.error("Error joining event:", err);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !date || !time || !locationName.trim()) {
      setFormError("Please fill out all required fields.");
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);

      const res = await fetch("/api/events/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          category,
          date,
          time,
          locationName,
          creatorEmail: userProfile.email,
          creatorName: userProfile.name
        })
      });

      if (res.ok) {
        const newEvent = await res.json();
        setEvents((prev) => [newEvent, ...prev]);
        setShowCreateForm(false);
        
        // Reset form
        setTitle("");
        setDescription("");
        setCategory("Cleanup Drive");
        setDate("");
        setTime("");
        setLocationName("");
        
        // Grant XP for organizing
        onGrantXP(150, "Organizing a new community action drive!");
      } else {
        const errData = await res.json();
        setFormError(errData.error || "Failed to create event.");
      }
    } catch (err) {
      console.error("Error creating event:", err);
      setFormError("Server error. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryBadgeColor = (cat: string) => {
    switch (cat) {
      case "Cleanup Drive":
        return "bg-emerald-50 text-emerald-700 border border-emerald-150";
      case "Tree Planting":
        return "bg-teal-50 text-teal-700 border border-teal-150";
      case "Awareness Campaign":
        return "bg-indigo-50 text-indigo-700 border border-indigo-150";
      case "Volunteer Event":
        return "bg-sky-50 text-sky-700 border border-sky-150";
      default:
        return "bg-slate-50 text-slate-700 border border-slate-150";
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Banner */}
      <div className="bg-white rounded-2xl border border-slate-150 p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <Calendar className="w-5 h-5" />
            </span>
            <h2 className="font-display font-bold text-lg text-slate-900">Locality Events &amp; Action Drives</h2>
          </div>
          <p className="text-xs text-slate-500 max-w-xl">
            Sponsor or participate in neighborhood volunteer drives. Clear pollution, plant trees, or raise awareness to unlock bonus civic achievements.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer hover:shadow-lg shrink-0"
        >
          {showCreateForm ? (
            <span>Close Form</span>
          ) : (
            <>
              <PlusCircle className="w-4 h-4" />
              <span>Create Event Drive</span>
            </>
          )}
        </button>
      </div>

      {/* Creation form */}
      {showCreateForm && (
        <div className="bg-white rounded-2xl border border-indigo-150 p-6 shadow-md space-y-4 animate-fade-in">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <CalendarPlus className="w-5 h-5 text-indigo-600" />
            <h3 className="font-display font-bold text-sm text-slate-900">Setup New Volunteer Action Drive</h3>
          </div>

          <form onSubmit={handleCreateEvent} className="space-y-4 text-xs">
            {formError && (
              <p className="p-3 bg-rose-50 text-rose-700 font-semibold rounded-xl border border-rose-100">
                ⚠️ {formError}
              </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Drive Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Elm Street Litter Cleanup Walk"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Action Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all cursor-pointer"
                >
                  <option value="Cleanup Drive">Cleanup Drive</option>
                  <option value="Tree Planting">Tree Planting</option>
                  <option value="Awareness Campaign">Awareness Campaign</option>
                  <option value="Volunteer Event">Volunteer Event</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Description &amp; Instructions *</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What will the volunteers accomplish? Where do neighbors meet? What gear should they bring?"
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all resize-none"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Date *</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all cursor-pointer"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Start Time *</label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all cursor-pointer"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Meeting Landmark / Location Name *</label>
                <input
                  type="text"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="e.g. Sector B Jogging Track gate"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                  required
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold px-4 py-2 rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2 rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1"
              >
                {isSubmitting ? "Broadcasting..." : "Publish & Host Drive"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Events Board List */}
      <div className="space-y-3">
        <h3 className="font-display font-semibold text-xs text-slate-500 uppercase tracking-wider">Active Ward Event Board</h3>

        {loading ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-150">
            <span className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-indigo-500 animate-spin inline-block" />
            <p className="text-xs text-slate-500 mt-2">Loading neighborhood activities...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-150">
            <p className="text-xs font-semibold text-slate-600">No events currently scheduled</p>
            <p className="text-[10px] text-slate-400 mt-1">Be the spark! Click 'Create Event Drive' to assemble your neighbors.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {events.map((event) => {
              const isAttending = event.attendees.includes(userProfile.email);
              return (
                <div 
                  key={event.id}
                  className="bg-white border border-slate-150 rounded-2xl p-5 shadow-xs hover:shadow-md hover:border-slate-200 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-lg ${getCategoryBadgeColor(event.category)}`}>
                        {event.category}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">ID: {event.id}</span>
                    </div>

                    <div className="space-y-1">
                      <h4 className="font-display font-bold text-sm text-slate-900 leading-snug">{event.title}</h4>
                      <p className="text-slate-500 text-xs leading-relaxed italic">{event.description}</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-600 font-medium">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{event.date}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{event.time}</span>
                      </div>
                      <div className="flex items-center gap-1 truncate">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{event.locationName}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 pt-3">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center p-1 bg-slate-100 rounded-lg text-slate-600">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold leading-none">Attendees</p>
                        <p className="text-xs font-bold text-slate-800 mt-1 leading-none">{event.attendees.length} Joining</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleJoinEvent(event.id)}
                      disabled={isAttending}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        isAttending
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow"
                      }`}
                    >
                      {isAttending ? (
                        <>
                          <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>✓ Attending</span>
                        </>
                      ) : (
                        <span>Join Drive (+100 XP)</span>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

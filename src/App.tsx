import React, { useState, useEffect } from "react";
import { 
  MapPin, Activity, Award, Building2, Bot, HelpCircle, 
  ArrowUpCircle, MessageSquare, Clock, AlertCircle, Sparkles, 
  X, ShieldAlert, Sparkle, LogIn, ChevronRight, UserCircle2, 
  TrendingUp, CheckCircle, Flame 
} from "lucide-react";
import CivicMap from "./components/CivicMap";
import CivicForm from "./components/CivicForm";
import StatsDashboard from "./components/StatsDashboard";
import LeaderboardPanel from "./components/LeaderboardPanel";
import GovernmentPanel from "./components/GovernmentPanel";
import CivicBot from "./components/CivicBot";
import EventsPanel from "./components/EventsPanel";
import AuthPage from "./components/AuthPage";
import { getOfflineReports, deleteOfflineReport } from "./lib/offlineDb";
import { Issue, UserProfile, Comment, IssueStatus } from "./types";

export default function App() {
  // Views navigation
  const [activeTab, setActiveTab] = useState<"map" | "analytics" | "rewards" | "official" | "events">("map");

  // Issues database state
  const [issues, setIssues] = useState<Issue[]>([]);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  
  // Interactive pinning states
  const [pinnedLocation, setPinnedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [pinnedAddress, setPinnedAddress] = useState<string>("");
  const [isPinningMode, setPinningMode] = useState<boolean>(false);

  // Active Citizen user profile state (loads from storage)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem("civic_user");
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  // Floating Chatbot drawer state
  const [showBot, setShowBot] = useState(false);

  // Gamified Toast & Popup states
  const [toasts, setToasts] = useState<{ id: string; text: string; icon: string }[]>([]);
  const [levelUpPopup, setLevelUpPopup] = useState<number | null>(null);

  // Loading states
  const [issuesLoading, setIssuesLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [commentAuthor, setCommentAuthor] = useState("");

  // Fetch all issues on mount
  const fetchIssues = async () => {
    try {
      setIssuesLoading(true);
      const res = await fetch("/api/issues");
      if (res.ok) {
        const data = await res.json();
        setIssues(data);
      }
    } catch (err) {
      console.error("Error fetching issues:", err);
    } finally {
      setIssuesLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
  }, []);

  // Sync geolocation to help citizens find their spot
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // If we have geolocation, preset the pinning location to user coordinates
          const { latitude, longitude } = position.coords;
          if (
            typeof latitude === "number" &&
            typeof longitude === "number" &&
            !isNaN(latitude) &&
            !isNaN(longitude)
          ) {
            setPinnedLocation({ lat: latitude, lng: longitude });
            setPinnedAddress("My GPS Location");
          } else {
            console.warn("Geolocation succeeded but coordinates are invalid/NaN:", latitude, longitude);
          }
        },
        (error) => {
          console.log("GPS access not granted or unavailable, using default center SF.");
        }
      );
    }
  }, []);

  // Listen for restoring internet and automatically synchronize offline reports
  useEffect(() => {
    if (!userProfile) return;

    const handleSyncOnRestore = async () => {
      try {
        const queue = await getOfflineReports();
        if (queue.length === 0) return;

        addToast(`Internet restored! Synchronizing ${queue.length} offline report(s) from IndexedDB...`, "🔄");

        let syncCount = 0;
        for (const report of queue) {
          try {
            const { id, createdAtLocal, ...pureReport } = report;
            const res = await fetch("/api/issues", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(pureReport)
            });

            if (res.ok) {
              if (id !== undefined) {
                await deleteOfflineReport(id);
                syncCount++;
              }
            }
          } catch (err) {
            console.error("Failed to sync report during online restore event:", err);
          }
        }

        if (syncCount > 0) {
          addToast(`Successfully synced ${syncCount} report(s)! XP rewards added!`, "🎉");
          // Safely award XP points 
          setUserProfile((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              points: prev.points + (syncCount * 50)
            };
          });
          fetchIssues();
        }
      } catch (err) {
        console.error("Error running auto network sync:", err);
      }
    };

    window.addEventListener("online", handleSyncOnRestore);
    // Also trigger immediately on mount in case the app was opened while online and there are cached reports
    if (navigator.onLine) {
      handleSyncOnRestore();
    }

    return () => {
      window.removeEventListener("online", handleSyncOnRestore);
    };
  }, [userProfile]);

  // Live WebSocket Real-Time Synchronization with robust Auto-reconnect & Sync on reconnect
  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimeoutId: any = null;
    let isStopped = false;

    const connectWS = () => {
      if (isStopped) return;
      
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}`;

      console.log(`WebSocket Live Sync: Connecting to ${wsUrl}`);
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        console.log("WebSocket Live Sync: Connection established.");
        // Fetch fresh state on reconnect/connect to guarantee no silent data lag
        fetchIssues();
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log("WebSocket Live Sync: Message received:", message);
          
          if (message.type === "issues_updated") {
            if (message.data && Array.isArray(message.data)) {
              setIssues(message.data);
              addToast("Live updates synchronized with municipal database!", "🔔");
            } else {
              fetchIssues();
            }
          }
        } catch (err) {
          console.error("WebSocket Live Sync: Error parsing dynamic update payload:", err);
        }
      };

      socket.onerror = (err) => {
        console.warn("WebSocket Live Sync: Port/Ingress WebSocket error:", err);
      };

      socket.onclose = () => {
        console.log("WebSocket Live Sync: Socket disconnected. Retrying in 4 seconds...");
        if (!isStopped) {
          reconnectTimeoutId = setTimeout(connectWS, 4000);
        }
      };
    };

    connectWS();

    return () => {
      isStopped = true;
      if (socket) {
        socket.close();
      }
      if (reconnectTimeoutId) {
        clearTimeout(reconnectTimeoutId);
      }
    };
  }, []);

  // Helper to add toast notification
  const addToast = (text: string, icon: string = "✨") => {
    const id = `toast-${Date.now()}`;
    setToasts((prev) => [...prev, { id, text, icon }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  // Helper to increment user XP and handle levels
  const grantXP = (amount: number, reason: string) => {
    setUserProfile((prev) => {
      const nextPoints = prev.points + amount;
      const currentLevelBoundary = (prev.level + 1) * 200;
      let nextLevel = prev.level;
      let didLevelUp = false;

      if (nextPoints >= currentLevelBoundary) {
        nextLevel = prev.level + 1;
        didLevelUp = true;
      }

      // Automatically unlock badges based on milestones
      const nextBadges = [...prev.badges];
      if (nextPoints >= 200 && !nextBadges.includes("badge-comment")) {
        nextBadges.push("badge-comment");
        setTimeout(() => addToast("Unlocked Badge: Fixer-Upper! 💬 (+100 XP)", "🏆"), 1000);
      }
      if (nextPoints >= 400 && !nextBadges.includes("badge-captain")) {
        nextBadges.push("badge-captain");
        setTimeout(() => addToast("Unlocked Badge: Ward Captain! 🎖️ (+250 XP)", "🏆"), 1000);
      }

      setTimeout(() => {
        addToast(`Earned +${amount} XP: ${reason}`, "⚡");
        if (didLevelUp) {
          setLevelUpPopup(nextLevel);
        }
      }, 300);

      return {
        ...prev,
        points: nextPoints,
        level: nextLevel,
        badges: nextBadges
      };
    });
  };

  // Action: User clicks Map to drop a new pin
  const handleMapClick = (lat: number, lng: number, address: string) => {
    setPinnedLocation({ lat, lng });
    setPinnedAddress(address);
    addToast("Location geotag pinned!", "📍");
  };

  // Action: New complaint submitted successfully
  const handleNewIssueSuccess = (newIssue: Issue) => {
    setIssues((prev) => [newIssue, ...prev]);
    setSelectedIssueId(newIssue.id);
    addToast("Report successfully filed!", "🚨");
    
    // Earn XP for filing
    grantXP(150, "Filed a new civic report with visual/geotag data");

    // Earn badge for specific categories if not unlocked yet
    if (newIssue.category === "Road" && !userProfile.badges.includes("badge-road")) {
      setUserProfile((prev) => ({ ...prev, badges: [...prev.badges, "badge-road"] }));
      setTimeout(() => addToast("Unlocked Badge: Road Hero! 🛣️", "🏆"), 1200);
    }
    if (newIssue.category === "Waste" && !userProfile.badges.includes("badge-green")) {
      setUserProfile((prev) => ({ ...prev, badges: [...prev.badges, "badge-green"] }));
      setTimeout(() => addToast("Unlocked Badge: Green Citizen! 🗑️", "🏆"), 1200);
    }
  };

  // Action: Upvote toggled (Crowd validation)
  const handleUpvoteIssue = async (id: string) => {
    try {
      const res = await fetch(`/api/issues/${id}/upvote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userProfile.email })
      });

      if (res.ok) {
        const updatedIssue = await res.json();
        setIssues((prev) => prev.map((i) => (i.id === id ? updatedIssue : i)));
        
        const isNowUpvoted = updatedIssue.upvotedBy.includes(userProfile.email);
        if (isNowUpvoted) {
          grantXP(50, "Validated a neighbor's civic complaint");
          addToast("Verified issue: 'I have this too' logged!", "👍");
        } else {
          addToast("Removed upvote verification.", "ℹ️");
        }
      }
    } catch (err) {
      console.error("Upvote failed", err);
    }
  };

  // Action: Comment added
  const handleAddComment = async (e: React.FormEvent, id: string) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      const res = await fetch(`/api/issues/${id}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author: commentAuthor || userProfile.name || "Anonymous Resident",
          text: commentText
        })
      });

      if (res.ok) {
        const updatedIssue = await res.json();
        setIssues((prev) => prev.map((i) => (i.id === id ? updatedIssue : i)));
        setCommentText("");
        grantXP(30, "Submitted helpful feedback comment");
      }
    } catch (err) {
      console.error("Failed to add comment", err);
    }
  };

  // Action: Official status changed (Government Dashboard)
  const handleUpdateStatus = async (
    id: string, 
    updates: { status: IssueStatus; resolvedImageUrl?: string; assignedTo?: string }
  ) => {
    try {
      const res = await fetch(`/api/issues/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });

      if (res.ok) {
        const updatedIssue = await res.json();
        setIssues((prev) => prev.map((i) => (i.id === id ? updatedIssue : i)));
        addToast(`Ticket status set to: ${updates.status}!`, "🏢");
      }
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  // Chatbot suggested filter action
  const handleBotSuggestAction = (type: string, value?: any) => {
    if (type === "filter-severity") {
      addToast(`Filtering map to severity: ${value}`, "🔍");
    }
    if (type === "filter-status") {
      addToast(`Filtering map to status: ${value}`, "🔍");
    }
  };

  const selectedIssue = issues.find((i) => i.id === selectedIssueId);

  if (!userProfile) {
    return <AuthPage onLoginSuccess={(profile) => setUserProfile(profile)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* Dynamic Header Navbar */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-150 px-4 sm:px-6 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-md shrink-0">
            <span className="font-display font-black text-base text-teal-400">CH</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-display font-bold text-sm tracking-tight text-slate-900">Community Hero</h1>
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[8px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-full">
                SaaS v1.4
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium">Hyperlocal AI-Driven Problem Solver</p>
          </div>
        </div>

        {/* Desktop Tabs */}
        <nav className="hidden md:flex items-center gap-1">
          <button
            onClick={() => setActiveTab("map")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "map" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            🗺️ Neighbor Map
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "analytics" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            📊 Ward Analytics
          </button>
          <button
            onClick={() => setActiveTab("events")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "events" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            🌱 Community Events
          </button>
          <button
            onClick={() => setActiveTab("rewards")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "rewards" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            🏆 Gamified Hub
          </button>
          <button
            onClick={() => setActiveTab("official")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "official" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            🏢 Municipal Portal
          </button>
        </nav>

        {/* Mini profile box */}
        <div id="header-profile-box" className="flex items-center gap-2.5">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">
              {userProfile.role === "official" ? "Staff Operator" : "Citizen Status"}
            </p>
            <p className="text-xs font-semibold text-slate-800 mt-1 leading-none">
              {userProfile.role === "official" ? "Official Portal 🛡️" : `${userProfile.points} XP • Lvl ${userProfile.level}`}
            </p>
          </div>
          <button 
            onClick={() => setActiveTab(userProfile.role === "official" ? "official" : "rewards")}
            className="w-8.5 h-8.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 p-1 flex items-center justify-center cursor-pointer transition-colors shrink-0 shadow-xs"
            title="Profile details"
          >
            <span className="text-sm">{userProfile.role === "official" ? "🛡️" : "🌱"}</span>
          </button>
          
          <button
            onClick={() => {
              localStorage.removeItem("civic_user");
              setUserProfile(null);
            }}
            className="text-[10px] font-bold text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 px-2.5 py-1.5 rounded-xl border border-rose-100 hover:border-rose-600 transition-all cursor-pointer shadow-2xs"
          >
            Log Out
          </button>
        </div>
      </header>

      {/* Mobile Sticky Tab Footer */}
      <nav className="md:hidden fixed bottom-4 left-4 right-4 z-40 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 p-1.5 shadow-xl flex justify-around">
        <button
          onClick={() => setActiveTab("map")}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 rounded-xl text-[10px] font-semibold transition-colors cursor-pointer ${
            activeTab === "map" ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          <span>🗺️</span>
          <span className="mt-0.5">Map</span>
        </button>
        <button
          onClick={() => setActiveTab("analytics")}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 rounded-xl text-[10px] font-semibold transition-colors cursor-pointer ${
            activeTab === "analytics" ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          <span>📊</span>
          <span className="mt-0.5">Stats</span>
        </button>
        <button
          onClick={() => setActiveTab("events")}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 rounded-xl text-[10px] font-semibold transition-colors cursor-pointer ${
            activeTab === "events" ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          <span>🌱</span>
          <span className="mt-0.5">Events</span>
        </button>
        <button
          onClick={() => setActiveTab("rewards")}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 rounded-xl text-[10px] font-semibold transition-colors cursor-pointer ${
            activeTab === "rewards" ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          <span>🏆</span>
          <span className="mt-0.5">Rewards</span>
        </button>
        <button
          onClick={() => setActiveTab("official")}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 rounded-xl text-[10px] font-semibold transition-colors cursor-pointer ${
            activeTab === "official" ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          <span>🏢</span>
          <span className="mt-0.5">Admin</span>
        </button>
      </nav>

      {/* Main Body Layout Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 pb-24 md:pb-6 space-y-6">

        {/* Tab View Switchboard */}
        {activeTab === "map" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            
            {/* Left side: Interactive Map (Takes 1 col on mobile, 1 col on tablet, 2 cols on desktop, 3 cols on widescreen) */}
            <div className="md:col-span-1 lg:col-span-2 xl:col-span-3 space-y-4 flex flex-col h-[400px] sm:h-[500px] lg:h-[570px]">
              <div className="flex items-center justify-between bg-white rounded-2xl p-4 border border-slate-150 shadow-xs shrink-0">
                <div>
                  <h2 className="font-display font-semibold text-sm text-slate-800">Hyperlocal Ward Map</h2>
                  <p className="text-[10px] text-slate-400">Select any incident to upvote, comment, or track repairs.</p>
                </div>
                {/* Active Indicator */}
                <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 text-emerald-800 px-2.5 py-1 rounded-xl text-[10px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{issues.length} active issues</span>
                </div>
              </div>

              {/* Leaflet Map Widget */}
              <div className="flex-1 relative">
                <CivicMap
                  issues={issues}
                  selectedIssueId={selectedIssueId}
                  onSelectIssue={(issue) => setSelectedIssueId(issue.id)}
                  onMapClick={handleMapClick}
                  pinnedLocation={pinnedLocation}
                  isPinningMode={isPinningMode}
                />
              </div>
            </div>

            {/* Right side: Report form & Ticket Inspector detail panels */}
            <div className="md:col-span-1 lg:col-span-1 space-y-4 h-auto lg:h-[570px] lg:overflow-y-auto pr-0 lg:pr-1">
              
              {/* Report form widget */}
              <CivicForm
                pinnedLocation={pinnedLocation}
                pinnedAddress={pinnedAddress}
                isPinningMode={isPinningMode}
                setPinningMode={setPinningMode}
                onSubmitSuccess={handleNewIssueSuccess}
                issues={issues}
              />

              {/* Detailed ticket inspector panel if selected */}
              {selectedIssue ? (
                <div className="bg-white rounded-2xl border border-slate-150 p-5 shadow-sm space-y-4 animate-fade-in relative">
                  <button
                    onClick={() => setSelectedIssueId(null)}
                    className="absolute top-4 right-4 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors border border-slate-150 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>

                  <div className="border-b border-slate-100 pb-3">
                    <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                      {selectedIssue.category}
                    </span>
                    <h4 className="font-display font-semibold text-sm text-slate-900 mt-1.5">{selectedIssue.title}</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Reported by {selectedIssue.reporterName} on {new Date(selectedIssue.createdAt).toLocaleDateString()}</p>
                  </div>

                  <div className="space-y-3 text-xs text-slate-600">
                    <p className="leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100 italic">
                      &ldquo;{selectedIssue.description}&rdquo;
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-[10px] border-b border-slate-100 pb-2.5">
                      <div>
                        <span className="block font-bold text-slate-400 uppercase tracking-wide">Status</span>
                        <span className={`inline-block font-bold font-mono text-[9px] px-1.5 py-0.5 rounded mt-0.5 ${
                          selectedIssue.status === "Resolved" 
                            ? "bg-emerald-100 text-emerald-800" 
                            : selectedIssue.status === "In Progress"
                            ? "bg-amber-100 text-amber-800 animate-pulse"
                            : "bg-rose-100 text-rose-800"
                        }`}>
                          {selectedIssue.status}
                        </span>
                      </div>
                      <div>
                        <span className="block font-bold text-slate-400 uppercase tracking-wide">Severity</span>
                        <span className="font-semibold text-slate-800 block mt-0.5">{selectedIssue.severity}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] border-b border-slate-100 pb-2.5">
                      <div>
                        <span className="block font-bold text-slate-400 uppercase tracking-wide">Location Landmark</span>
                        <span className="font-semibold text-slate-800 mt-0.5 block truncate max-w-[120px]">{selectedIssue.address || "Unspecified"}</span>
                      </div>
                      <div>
                        <span className="block font-bold text-slate-400 uppercase tracking-wide">Assigned Unit</span>
                        <span className="font-semibold text-slate-800 block mt-0.5 truncate max-w-[120px]">{selectedIssue.department}</span>
                      </div>
                    </div>

                    {/* Before/After Photos Display */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {selectedIssue.imageUrl && (
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Before photo</p>
                          <div className="rounded-lg overflow-hidden border border-slate-150 h-[80px]">
                            <img src={selectedIssue.imageUrl} alt="Before Fix" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                        </div>
                      )}
                      {selectedIssue.resolvedImageUrl && (
                        <div>
                          <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider mb-1">After work proof</p>
                          <div className="rounded-lg overflow-hidden border border-emerald-200 h-[80px]">
                            <img src={selectedIssue.resolvedImageUrl} alt="After Fix" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Crowdsourced verification button & comments board */}
                  <div className="border-t border-slate-100 pt-3 space-y-3">
                    <button
                      onClick={() => handleUpvoteIssue(selectedIssue.id)}
                      className={`w-full text-xs font-bold py-2 px-3 rounded-xl border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        selectedIssue.upvotedBy?.includes(userProfile.email)
                          ? "bg-teal-500 border-teal-500 text-slate-950 shadow-sm"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <ArrowUpCircle className="w-4 h-4 shrink-0" />
                      <span>
                        {selectedIssue.upvotedBy?.includes(userProfile.email)
                          ? "Verified – You upvoted this!"
                          : `${selectedIssue.upvotes} Neighbors verified. Click to upvote`}
                      </span>
                    </button>

                    {/* Comments block */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                        <span>Discussions ({selectedIssue.comments.length})</span>
                      </p>

                      <div className="space-y-1.5 max-h-[110px] overflow-y-auto pr-1">
                        {selectedIssue.comments.length === 0 ? (
                          <p className="text-[10px] text-slate-400 italic">No feedback submitted yet. Be the first!</p>
                        ) : (
                          selectedIssue.comments.map((comm) => (
                            <div key={comm.id} className="bg-slate-50 p-2 rounded-lg text-[10px] border border-slate-100">
                              <div className="flex justify-between items-center text-[9px] font-semibold text-slate-600">
                                <span className={comm.author.includes("System") || comm.author.includes("Official") ? "text-teal-600 font-bold" : ""}>
                                  {comm.author}
                                </span>
                                <span className="text-[8px] text-slate-400">
                                  {new Date(comm.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </div>
                              <p className="text-slate-600 mt-0.5 leading-relaxed">{comm.text}</p>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Comment Input */}
                      <form onSubmit={(e) => handleAddComment(e, selectedIssue.id)} className="flex gap-1.5 mt-2 pt-1 border-t border-slate-100">
                        <input
                          type="text"
                          required
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          placeholder="Add helpful context or update..."
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-[10px] text-slate-800 outline-none hover:border-slate-300 focus:border-teal-500 focus:bg-white transition-all"
                        />
                        <button
                          type="submit"
                          className="bg-slate-900 text-white hover:bg-slate-800 px-3 py-1.5 rounded-xl font-bold text-[10px] transition-all cursor-pointer shrink-0"
                        >
                          Comment
                        </button>
                      </form>
                    </div>

                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-150 p-5 shadow-sm text-center py-8">
                  <HelpCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-600">Grievance Inspector</p>
                  <p className="text-[10px] text-slate-400 mt-1 max-w-[200px] mx-auto">
                    Click any color-coded marker emoji on the map or filter through reports to inspect details.
                  </p>
                </div>
              )}

            </div>
          </div>
        )}

        {activeTab === "analytics" && (
          <StatsDashboard issues={issues} />
        )}

        {activeTab === "rewards" && (
          <LeaderboardPanel userProfile={userProfile} />
        )}

        {activeTab === "events" && (
          <EventsPanel userProfile={userProfile} onGrantXP={grantXP} />
        )}

        {activeTab === "official" && (
          userProfile.role === "official" ? (
            <GovernmentPanel
              issues={issues}
              onUpdateStatus={handleUpdateStatus}
              onUpdateIssue={(updated) => {
                setIssues((prev) => prev.map((i) => i.id === updated.id ? updated : i));
              }}
              onSelectIssue={(issue) => {
                setSelectedIssueId(issue.id);
              }}
              selectedIssueId={selectedIssueId}
            />
          ) : (
            <div id="role-restricted-view" className="bg-white rounded-3xl border border-slate-150 p-8 shadow-md text-center max-w-lg mx-auto my-12 space-y-5 animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-500 border border-amber-200 mx-auto flex items-center justify-center shadow-sm">
                <span className="text-3xl">🛡️</span>
              </div>
              <div className="space-y-2">
                <h3 className="font-display font-bold text-lg text-slate-900">Municipal Authorization Required</h3>
                <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
                  The Municipal Portal is reserved exclusively for accredited ward officials, field surveyors, and dispatch teams to review evidence, update ticket status, and assign crew routes.
                </p>
              </div>
              <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 text-[11px] text-slate-500 leading-relaxed space-y-2 text-left">
                <p className="font-bold text-slate-700 flex items-center gap-1">
                  <span>📌</span> Access Privileges Include:
                </p>
                <ul className="list-disc list-inside space-y-1 pl-1">
                  <li>Assigning repair crews (Alpha, Beta, Delta, Sparky)</li>
                  <li>Overriding auto-calculated priority scores</li>
                  <li>Uploading before-and-after resolution proof photos</li>
                  <li>Exporting fully formatted CSV reports for off-grid analytics</li>
                </ul>
              </div>
              <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => {
                    localStorage.removeItem("civic_user");
                    setUserProfile(null);
                  }}
                  className="bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-colors cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                >
                  Switch to Official Account
                </button>
                <button
                  onClick={() => setActiveTab("map")}
                  className="bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 font-bold text-xs px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
                >
                  Return to Map
                </button>
              </div>
            </div>
          )
        )}

      </main>

      {/* Floating Chatbot Assistant Widget toggle button */}
      <div className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-[100] flex flex-col items-end gap-3.5">
        
        {/* Animated Bot Panel Drawer */}
        {showBot && (
          <div className="w-[310px] sm:w-[350px] h-[380px] shadow-2xl animate-fade-in border border-slate-800 rounded-2xl overflow-hidden mb-1">
            <CivicBot onSuggestAction={handleBotSuggestAction} />
          </div>
        )}

        <button
          onClick={() => setShowBot(!showBot)}
          className={`rounded-2xl p-3.5 text-white shadow-lg transition-all transform hover:scale-110 flex items-center justify-center cursor-pointer ${
            showBot 
              ? "bg-slate-900 hover:bg-slate-850 rotate-90" 
              : "bg-slate-900 hover:bg-slate-850 bg-gradient-to-tr from-slate-950 to-slate-900 border border-slate-800"
          }`}
        >
          {showBot ? (
            <X className="w-5.5 h-5.5 text-teal-400" />
          ) : (
            <div className="relative">
              <Bot className="w-5.5 h-5.5 text-teal-400" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-teal-500 rounded-full border border-slate-900 animate-ping" />
            </div>
          )}
        </button>
      </div>

      {/* Floating Toast Notification Drawer */}
      <div className="fixed top-20 right-4 z-[9999] flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="bg-slate-900 text-white backdrop-blur-md px-4 py-3 rounded-xl shadow-2xl border border-slate-800 flex items-center gap-3 animate-slide-in pointer-events-auto"
          >
            <span className="text-sm shrink-0">{t.icon}</span>
            <span className="text-xs font-semibold leading-snug">{t.text}</span>
            <button
              onClick={() => setToasts((prev) => prev.filter((toast) => toast.id !== t.id))}
              className="text-slate-400 hover:text-white ml-auto cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Gamified Level-Up Overlay Popup Modal */}
      {levelUpPopup !== null && (
        <div className="fixed inset-0 z-[10000] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white border-2 border-teal-500/30 rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl animate-fade-in space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 p-3 mx-auto flex items-center justify-center shadow-lg animate-bounce text-3xl">
              🌟
            </div>
            
            <div className="space-y-1">
              <h4 className="font-display font-black text-xl text-teal-600 uppercase tracking-tight">Citizen Level Up!</h4>
              <p className="text-xs text-slate-500">You are now a respected neighborhood leader.</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-center gap-3">
              <span className="text-sm text-slate-400 line-through">Level {levelUpPopup - 1}</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-bold text-slate-800 bg-teal-50 border border-teal-100 px-3 py-1 rounded-full">
                Level {levelUpPopup} Active Citizen
              </span>
            </div>

            <p className="text-[10px] text-slate-400">
              Your votes now count for higher baseline department priorities, and you have earned locked marketplace coupons!
            </p>

            <button
              onClick={() => setLevelUpPopup(null)}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-all cursor-pointer shadow-md"
            >
              Claim Rewards & Keep Building
            </button>
          </div>
        </div>
      )}

    </div>
  );
}


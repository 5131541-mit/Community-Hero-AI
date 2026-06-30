import React, { useState, useEffect } from "react";
import { Newspaper, Sparkles, Megaphone, Activity, HelpCircle } from "lucide-react";

interface LocalNewsDigest {
  headlineNews: string;
  communitySpotlight: string;
  cityHealthReport: string;
}

export default function LocalNewsWidget() {
  const [digest, setDigest] = useState<LocalNewsDigest | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<"headline" | "spotlight" | "health">("headline");

  const fetchDigest = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/gemini/local-news");
      if (res.ok) {
        const data = await res.json();
        setDigest(data);
      }
    } catch (err) {
      console.error("Error fetching local news digest:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDigest();
  }, []);

  return (
    <div className="bg-white rounded-2xl border border-slate-150 p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
            <Newspaper className="w-5 h-5" />
          </span>
          <div>
            <h3 className="font-display font-bold text-sm text-slate-900 flex items-center gap-1.5">
              <span>Daily Civic AI Digest</span>
              <span className="flex items-center gap-0.5 text-[9px] bg-gradient-to-r from-indigo-500 to-indigo-700 text-white font-bold px-2 py-0.5 rounded-full shadow-xs uppercase tracking-wide">
                <Sparkles className="w-2.5 h-2.5" /> Gemini Core
              </span>
            </h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Automated neighborhood intelligence bulletin</p>
          </div>
        </div>
        <button
          type="button"
          onClick={fetchDigest}
          disabled={loading}
          className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 font-mono bg-indigo-50 border border-indigo-100 px-2.5 py-1.5 rounded-xl cursor-pointer hover:bg-indigo-100 transition-all disabled:opacity-50"
        >
          {loading ? "Synthesizing..." : "↻ Refresh Digest"}
        </button>
      </div>

      {loading ? (
        <div className="py-10 text-center space-y-3">
          <div className="relative w-8 h-8 mx-auto">
            <span className="absolute inset-0 w-full h-full border-2 border-slate-100 border-t-indigo-600 rounded-full animate-spin" />
            <Sparkles className="w-4 h-4 text-indigo-500 absolute inset-0 m-auto animate-pulse" />
          </div>
          <p className="text-xs text-slate-400 font-semibold italic">Gemini is synthesizing neighborhood database records...</p>
        </div>
      ) : digest ? (
        <div className="space-y-4">
          {/* Sub-Tabs Selector */}
          <div className="flex items-center gap-1.5 border-b border-slate-100 pb-1 text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => setActiveSubTab("headline")}
              className={`pb-2 px-1 transition-all border-b-2 cursor-pointer ${
                activeSubTab === "headline"
                  ? "border-indigo-600 text-indigo-600 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              📰 Headline news
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab("spotlight")}
              className={`pb-2 px-1 transition-all border-b-2 cursor-pointer ${
                activeSubTab === "spotlight"
                  ? "border-indigo-600 text-indigo-600 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              📢 Community Spotlight
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab("health")}
              className={`pb-2 px-1 transition-all border-b-2 cursor-pointer ${
                activeSubTab === "health"
                  ? "border-indigo-600 text-indigo-600 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              🏥 City Health Appraisal
            </button>
          </div>

          {/* Sub-Tab Content Render */}
          <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-150 min-h-[90px] flex flex-col justify-center animate-fade-in">
            {activeSubTab === "headline" && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Megaphone className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Latest Ward Developments</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed font-sans">{digest.headlineNews}</p>
              </div>
            )}

            {activeSubTab === "spotlight" && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Resident Action &amp; Events</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed font-sans">{digest.communitySpotlight}</p>
              </div>
            )}

            {activeSubTab === "health" && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Safety &amp; Green Citizenship Rating</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed font-sans">{digest.cityHealthReport}</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-500">Failed to render news digest. Please check server connectivity.</p>
      )}
    </div>
  );
}

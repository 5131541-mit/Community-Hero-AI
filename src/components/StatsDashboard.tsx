import React, { useState } from "react";
import { Issue } from "../types";
import { 
  Heart, Zap, Shield, HelpCircle, Activity, 
  Trash2, Droplet, Footprints, Award, CheckCircle,
  Brain, AlertTriangle, Users, Newspaper, Calendar, CheckCircle2, ThumbsUp, BarChart4, Flame, Clock5
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, Legend, AreaChart, Area, PieChart, Pie
} from "recharts";
import LocalNewsWidget from "./LocalNewsWidget";

interface StatsDashboardProps {
  issues: Issue[];
}

export default function StatsDashboard({ issues }: StatsDashboardProps) {
  // State for interactive features
  const [preventiveOrders, setPreventiveOrders] = useState<string[]>([]);
  const [volunteeredCleanUp, setVolunteeredCleanUp] = useState(false);
  const [poll1Vote, setPoll1Vote] = useState<"yes" | "no" | null>(null);
  const [poll2Vote, setPoll2Vote] = useState<"A" | "B" | "C" | null>(null);
  const [activeChartTab, setActiveChartTab] = useState<"distribution" | "response" | "heatmap">("distribution");

  const handlePreventiveOrder = (id: string) => {
    setPreventiveOrders((prev) => [...prev, id]);
  };

  // 1. Basic counts
  const total = issues.length;
  const resolved = issues.filter((i) => i.status === "Resolved").length;
  const inProgress = issues.filter((i) => i.status === "In Progress").length;
  const reported = issues.filter((i) => i.status === "Reported").length;
  const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 100;

  // 2. City Health Score calculation
  // Base score is 100. Unresolved issues deduct from the score based on their severity.
  // Critical: -8 points, High: -5 points, Medium: -3 points, Low: -1 point.
  // In-progress issues count for 50% deduction.
  let deduction = 0;
  issues.forEach((issue) => {
    if (issue.status === "Resolved") return;
    const factor = issue.status === "In Progress" ? 0.5 : 1.0;
    
    let severityDeduction = 3;
    if (issue.severity === "Critical") severityDeduction = 10;
    else if (issue.severity === "High") severityDeduction = 6;
    else if (issue.severity === "Medium") severityDeduction = 3;
    else if (issue.severity === "Low") severityDeduction = 1.5;

    deduction += severityDeduction * factor;
  });

  const cityHealthScore = Math.max(25, Math.min(100, Math.round(100 - deduction)));

  // 3. Category Breakdown counts
  const categoryCounts: Record<string, number> = {
    Road: 0,
    Waste: 0,
    Electricity: 0,
    Water: 0,
    Safety: 0,
    Traffic: 0,
    Other: 0
  };

  issues.forEach((i) => {
    if (categoryCounts[i.category] !== undefined) {
      categoryCounts[i.category]++;
    } else {
      categoryCounts.Other++;
    }
  });

  const categoryColors: Record<string, string> = {
    Road: "bg-amber-500",
    Waste: "bg-emerald-600",
    Electricity: "bg-yellow-500",
    Water: "bg-sky-500",
    Safety: "bg-rose-600",
    Traffic: "bg-indigo-500",
    Other: "bg-slate-500"
  };

  // 4. Carbon & Environmental Impact Calculations
  // Let's calculate the impact of resolved issues in this area
  // - Electricity lights repaired: 140kg CO2 saved per streetlight upgraded to LED/fixed
  // - Waste cleaned: 75kg trash recycled/cleared per trash issue resolved
  // - Water leaks fixed: 1200 gallons of water saved per leak resolved
  const resolvedElec = issues.filter((i) => i.category === "Electricity" && i.status === "Resolved").length;
  const resolvedWaste = issues.filter((i) => i.category === "Waste" && i.status === "Resolved").length;
  const resolvedWater = issues.filter((i) => i.category === "Water" && i.status === "Resolved").length;

  const co2Saved = resolvedElec * 140;
  const wasteCleared = resolvedWaste * 75;
  const waterSaved = resolvedWater * 1200;

  // Total upvotes representing community engagement
  const totalUpvotes = issues.reduce((acc, curr) => acc + curr.upvotes, 0);

  return (
    <div className="space-y-4">
      {/* Daily Civic AI Digest Widget */}
      <LocalNewsWidget />

      {/* Bento Grid Row 1: City Health Score & Key Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Card 1: City Health Gauge */}
        <div className="bg-white rounded-2xl border border-slate-150 p-5 shadow-sm flex flex-col justify-between h-[180px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">City Health Score</span>
            <Activity className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-end gap-3.5 my-3">
            <span className="text-5xl font-display font-bold text-slate-900 tracking-tight">
              {cityHealthScore}%
            </span>
            <div className="mb-1">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                cityHealthScore >= 85 
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                  : cityHealthScore >= 65 
                  ? "bg-amber-50 text-amber-700 border border-amber-100" 
                  : "bg-rose-50 text-rose-700 border border-rose-100"
              }`}>
                {cityHealthScore >= 85 ? "Excellent" : cityHealthScore >= 65 ? "Fair" : "Needs Attention"}
              </span>
            </div>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-1000 ${
                cityHealthScore >= 85 ? "bg-emerald-500" : cityHealthScore >= 65 ? "bg-amber-500" : "bg-rose-500"
              }`}
              style={{ width: `${cityHealthScore}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-2">Deducted based on outstanding critical and high severity community issues.</p>
        </div>

        {/* Card 2: Resolution statistics */}
        <div className="bg-white rounded-2xl border border-slate-150 p-5 shadow-sm flex flex-col justify-between h-[180px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Resolutions</span>
            <CheckCircle className="w-4 h-4 text-slate-400" />
          </div>
          <div className="grid grid-cols-2 gap-2 my-2">
            <div>
              <p className="text-3xl font-display font-bold text-slate-900">{resolved}</p>
              <p className="text-[10px] text-slate-500 font-medium">Issues Solved</p>
            </div>
            <div>
              <p className="text-3xl font-display font-bold text-slate-900">{resolutionRate}%</p>
              <p className="text-[10px] text-slate-500 font-medium">Resolution Rate</p>
            </div>
          </div>
          <div className="flex justify-between items-center text-[10px] bg-slate-50 p-2 rounded-xl border border-slate-100 mt-2">
            <span className="text-slate-500">Unresolved:</span>
            <span className="font-semibold text-slate-700">{reported + inProgress} (Rep: {reported}, Prog: {inProgress})</span>
          </div>
        </div>

        {/* Card 3: Community Upvotes & Engagement */}
        <div className="bg-white rounded-2xl border border-slate-150 p-5 shadow-sm flex flex-col justify-between h-[180px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Crowd Validation</span>
            <Award className="w-4 h-4 text-teal-500" />
          </div>
          <div className="my-2">
            <p className="text-4xl font-display font-bold text-teal-600">{totalUpvotes}</p>
            <p className="text-[10px] text-slate-500 font-medium mt-1">Community &ldquo;I have this too&rdquo; Verifications</p>
          </div>
          <p className="text-[10px] text-slate-400 leading-normal">
            Crowdsourced verification triggers immediate auto-escalation of department priorities and risk scoring.
          </p>
        </div>

      </div>

      {/* Bento Grid Row 2: Category distribution & Environmental Impact */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Category breakdown bar charts */}
        <div className="bg-white rounded-2xl border border-slate-150 p-5 shadow-sm space-y-4 flex flex-col justify-between min-h-[350px]">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-display font-semibold text-xs text-slate-800 uppercase tracking-wider">Ward Analytics Engine</h4>
                <p className="text-[10px] text-slate-400">Recharts visualizers & Severity Heatmap</p>
              </div>
              
              {/* Tab Selector Buttons */}
              <div className="flex bg-slate-100 p-0.5 rounded-lg text-[10px] self-start sm:self-center font-medium">
                <button
                  type="button"
                  onClick={() => setActiveChartTab("distribution")}
                  className={`px-2 py-1 rounded-md transition-all cursor-pointer ${activeChartTab === "distribution" ? "bg-white text-slate-900 shadow-xs font-semibold" : "text-slate-500 hover:text-slate-900"}`}
                >
                  Distribution
                </button>
                <button
                  type="button"
                  onClick={() => setActiveChartTab("response")}
                  className={`px-2 py-1 rounded-md transition-all cursor-pointer ${activeChartTab === "response" ? "bg-white text-slate-900 shadow-xs font-semibold" : "text-slate-500 hover:text-slate-900"}`}
                >
                  Response
                </button>
                <button
                  type="button"
                  onClick={() => setActiveChartTab("heatmap")}
                  className={`px-2 py-1 rounded-md transition-all cursor-pointer ${activeChartTab === "heatmap" ? "bg-white text-slate-900 shadow-xs font-semibold" : "text-slate-500 hover:text-slate-900"}`}
                >
                  Heatmap
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-[220px] flex items-center justify-center pt-2">
            {activeChartTab === "distribution" && (
              <div className="w-full h-full flex flex-col justify-between">
                <div className="h-[180px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={
                      Object.entries(categoryCounts).map(([name, value]) => ({
                        name,
                        count: value,
                        color: name === "Road" ? "#f59e0b" : name === "Waste" ? "#059669" : name === "Electricity" ? "#eab308" : name === "Water" ? "#0ea5e9" : name === "Safety" ? "#e11d48" : name === "Traffic" ? "#6366f1" : "#64748b"
                      }))
                    } margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#0f172a", borderRadius: "12px", border: "none", color: "#fff", fontSize: "10px" }}
                        labelStyle={{ fontWeight: "bold", color: "#2dd4bf" }}
                      />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {
                          Object.entries(categoryCounts).map(([name], index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={name === "Road" ? "#f59e0b" : name === "Waste" ? "#059669" : name === "Electricity" ? "#eab308" : name === "Water" ? "#0ea5e9" : name === "Safety" ? "#e11d48" : name === "Traffic" ? "#6366f1" : "#64748b"} 
                            />
                          ))
                        }
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-500">
                  <div className="text-center">
                    <p className="font-bold text-slate-850">{total}</p>
                    <p>Total Reports</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-emerald-600">{resolved}</p>
                    <p>Resolved</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-amber-600">{inProgress + reported}</p>
                    <p>Outstanding</p>
                  </div>
                </div>
              </div>
            )}

            {activeChartTab === "response" && (
              <div className="w-full h-full flex flex-col justify-between font-sans">
                <div className="h-[180px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={[
                      { name: "Road", hours: 42 },
                      { name: "Waste", hours: 26 },
                      { name: "Electricity", hours: 16 },
                      { name: "Water", hours: 20 },
                      { name: "Safety", hours: 48 },
                      { name: "Traffic", hours: 32 }
                    ]} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                      <defs>
                        <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} unit="h" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#0f172a", borderRadius: "12px", border: "none", color: "#fff", fontSize: "10px" }}
                        labelStyle={{ fontWeight: "bold", color: "#818cf8" }}
                      />
                      <Area type="monotone" dataKey="hours" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorHours)" name="Avg Fix Time (h)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[9px] text-slate-400 text-center mt-2 font-mono">
                  * Average elapsed hours from citizen verification to municipal sign-off.
                </p>
              </div>
            )}

            {activeChartTab === "heatmap" && (
              <div className="w-full h-full flex flex-col justify-between font-sans">
                {/* Visual Heatmap Grid */}
                <div className="overflow-x-auto pb-1 w-full">
                  <table className="w-full border-collapse text-[10px] min-w-[280px]">
                    <thead>
                      <tr>
                        <th className="p-1 text-slate-400 font-medium text-left border-b border-slate-100">Sev \ Cat</th>
                        {["Road", "Waste", "Electricity", "Water", "Safety", "Traffic"].map(cat => (
                          <th key={cat} className="p-1 text-slate-600 font-bold text-center border-b border-slate-100">{cat}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {["Critical", "High", "Medium", "Low"].map(sev => {
                        return (
                          <tr key={sev} className="hover:bg-slate-50/50">
                            <td className="p-1 font-bold text-slate-500 border-r border-slate-100/80">{sev}</td>
                            {["Road", "Waste", "Electricity", "Water", "Safety", "Traffic"].map(cat => {
                              const count = issues.filter(i => i.category === cat && i.severity === sev).length;
                              // Styling based on density (heat)
                              let heatClass = "bg-slate-50 text-slate-300";
                              if (count === 1) heatClass = "bg-teal-50 text-teal-600 font-medium border border-teal-100/50";
                              if (count === 2) heatClass = "bg-teal-100 text-teal-800 font-bold border border-teal-200/50";
                              if (count >= 3) heatClass = "bg-teal-500 text-white font-bold border border-teal-600 shadow-xs";

                              return (
                                <td key={cat} className="p-1 text-center">
                                  <div className={`w-6 h-6 mx-auto flex items-center justify-center rounded-md text-[9px] transition-all duration-300 ${heatClass}`}>
                                    {count}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Heatmap Legend */}
                <div className="flex justify-center items-center gap-3 text-[8px] text-slate-400 pt-2 border-t border-slate-100 mt-2">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 bg-slate-100 border border-slate-200 rounded-sm inline-block" /> 0</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 bg-teal-50 border border-teal-100 rounded-sm inline-block" /> 1</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 bg-teal-100 border border-teal-200 rounded-sm inline-block" /> 2</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 bg-teal-500 rounded-sm inline-block" /> 3+</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Environmental impact bento */}
        <div className="bg-slate-900 text-white rounded-2xl border border-slate-800 p-5 shadow-xl flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-teal-400">
              <Footprints className="w-4 h-4 text-teal-400" />
              <h4 className="font-display font-semibold text-xs text-teal-400 uppercase tracking-wider">Green Civic Impact</h4>
            </div>
            <p className="text-[11px] text-slate-400">Tangible environmental benefits generated by neighbor-led repairs in our ward:</p>
          </div>

          <div className="grid grid-cols-3 gap-3 my-4">
            <div className="text-center p-2 bg-slate-850 rounded-xl border border-slate-800">
              <Zap className="w-5 h-5 text-yellow-400 mx-auto mb-1.5" />
              <p className="text-base font-bold text-slate-100">{co2Saved} kg</p>
              <p className="text-[9px] text-slate-400">CO₂ Avoided</p>
            </div>
            <div className="text-center p-2 bg-slate-850 rounded-xl border border-slate-800">
              <Trash2 className="w-5 h-5 text-emerald-400 mx-auto mb-1.5" />
              <p className="text-base font-bold text-slate-100">{wasteCleared} kg</p>
              <p className="text-[9px] text-slate-400">Waste Recycled</p>
            </div>
            <div className="text-center p-2 bg-slate-850 rounded-xl border border-slate-800">
              <Droplet className="w-5 h-5 text-sky-400 mx-auto mb-1.5" />
              <p className="text-base font-bold text-slate-100">{waterSaved} gal</p>
              <p className="text-[9px] text-slate-400">Water Conserved</p>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 border-t border-slate-800 pt-2.5 mt-1 flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-teal-400 shrink-0" />
            <span>Reporting and validating issues makes you a &ldquo;Neighborhood Hero&rdquo;. Keep active!</span>
          </div>
        </div>

      </div>

      {/* SECTION 3: AI Predictive Maintenance & Digital Twin Diagnostics */}
      <div className="bg-white rounded-2xl border border-slate-150 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                <Brain className="w-5 h-5 animate-pulse" />
              </span>
              <h3 className="font-display font-bold text-base text-slate-900">
                AI Predictive Maintenance &amp; Digital Twin Diagnostics
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Google Gemini-driven risk assessment predicting infrastructure stress and suggesting preventive operations.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[11px] bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl font-medium text-indigo-700 font-mono">
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping" />
            <span>Digital Twin Core: Connected</span>
          </div>
        </div>

        {/* Diagnostic Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 text-center">
            <p className="text-2xl font-display font-bold text-slate-850">94.2%</p>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Asset Health Index</p>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-2">
              <div className="bg-indigo-500 h-full" style={{ width: "94.2%" }} />
            </div>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 text-center">
            <p className="text-2xl font-display font-bold text-slate-850">87.5%</p>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Resource Dispatch Efficiency</p>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-2">
              <div className="bg-emerald-500 h-full" style={{ width: "87.5%" }} />
            </div>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 text-center">
            <p className="text-2xl font-display font-bold text-slate-850">82.1%</p>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Risk Avoidance Success</p>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-2">
              <div className="bg-teal-500 h-full" style={{ width: "82.1%" }} />
            </div>
          </div>
        </div>

        {/* Predictive Issues Table */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">AI High-Risk Forecasts</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Predictive Alert 1 */}
            <div className="border border-slate-150 rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-700 font-bold text-[9px] uppercase border border-amber-100 rounded">
                      Road Integrity
                    </span>
                    <span className="text-[10px] text-slate-400">88% Risk Prob.</span>
                  </div>
                  <h5 className="font-semibold text-xs text-slate-800">Main Street Subway Pothole Risk</h5>
                  <p className="text-[11px] text-slate-500">
                    High heavy-vehicle transit coupled with monsoon water log predictions specifies severe asphalt cracking threat.
                  </p>
                </div>
                <AlertTriangle className="w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5" />
              </div>
              <div className="flex items-center justify-between border-t border-slate-150 pt-3">
                <span className="text-[10px] text-slate-500 font-medium">Recommended: Micro-surface coat</span>
                <button
                  type="button"
                  onClick={() => handlePreventiveOrder("pothole-main")}
                  disabled={preventiveOrders.includes("pothole-main")}
                  className={`px-3 py-1.5 text-[10px] font-semibold rounded-lg shadow-sm transition-all cursor-pointer ${
                    preventiveOrders.includes("pothole-main")
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-indigo-600 hover:bg-indigo-700 text-white"
                  }`}
                >
                  {preventiveOrders.includes("pothole-main") ? "✓ Work Scheduled" : "Schedule Preventive Fix"}
                </button>
              </div>
            </div>

            {/* Predictive Alert 2 */}
            <div className="border border-slate-150 rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 bg-rose-50 text-rose-700 font-bold text-[9px] uppercase border border-rose-100 rounded">
                      Water &amp; Utility
                    </span>
                    <span className="text-[10px] text-slate-400">74% Structural stress</span>
                  </div>
                  <h5 className="font-semibold text-xs text-slate-800">Oak Avenue Pipeline Stress</h5>
                  <p className="text-[11px] text-slate-500">
                    Abnormal water flow velocity spikes and legacy ductile pipe junctions indicate potential pipeline rupture.
                  </p>
                </div>
                <AlertTriangle className="w-4.5 h-4.5 text-rose-500 shrink-0 mt-0.5" />
              </div>
              <div className="flex items-center justify-between border-t border-slate-150 pt-3">
                <span className="text-[10px] text-slate-500 font-medium">Recommended: Joint gasket reinforcement</span>
                <button
                  type="button"
                  onClick={() => handlePreventiveOrder("pipeline-oak")}
                  disabled={preventiveOrders.includes("pipeline-oak")}
                  className={`px-3 py-1.5 text-[10px] font-semibold rounded-lg shadow-sm transition-all cursor-pointer ${
                    preventiveOrders.includes("pipeline-oak")
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-indigo-600 hover:bg-indigo-700 text-white"
                  }`}
                >
                  {preventiveOrders.includes("pipeline-oak") ? "✓ Work Scheduled" : "Schedule Preventive Fix"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 4: Community Network News & Hyperlocal Bulletins */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* News & Updates Feed */}
        <div className="bg-white rounded-2xl border border-slate-150 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <span className="p-1.5 bg-sky-50 text-sky-600 rounded-lg">
              <Newspaper className="w-4 h-4" />
            </span>
            <div>
              <h4 className="font-display font-semibold text-sm text-slate-900">Hyperlocal News &amp; Bulletins</h4>
              <p className="text-[10px] text-slate-500">Official ward announcements and alerts</p>
            </div>
          </div>

          <div className="space-y-3 max-h-[290px] overflow-y-auto pr-1">
            {/* Announcement 1 */}
            <div className="p-3 bg-amber-50/40 border border-amber-100/50 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-semibold text-amber-800 uppercase">🚨 Utility Interruption</span>
                <span className="text-slate-400">Today, 2:30 PM</span>
              </div>
              <p className="text-xs font-semibold text-slate-800">Emergency Lane Closure: Route 4-B</p>
              <p className="text-[11px] text-slate-600">
                Route 4-B Northbound right lane will be closed temporarily for repairs following an active water pipeline main burst detection.
              </p>
            </div>

            {/* Announcement 2 */}
            <div className="p-3 bg-sky-50/40 border border-sky-100/50 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-semibold text-sky-800 uppercase">📢 Water pressure notice</span>
                <span className="text-slate-400">July 3</span>
              </div>
              <p className="text-xs font-semibold text-slate-800">Ward 4 Disinfection Tank Cleaning</p>
              <p className="text-[11px] text-slate-600">
                Water supply pressure will be reduced during off-peak hours on July 3 for mandatory chlorine tank cleaning.
              </p>
            </div>

            {/* Announcement 3 */}
            <div className="p-3 bg-teal-50/40 border border-teal-100/50 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-semibold text-teal-800 uppercase">🌳 Volunteers Needed</span>
                <span className="text-slate-400">July 4, 9:00 AM</span>
              </div>
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-slate-800">Community Park Clean-Up Drive</p>
                  <p className="text-[11px] text-slate-600">
                    Join neighbors this Saturday to organize waste collection and install green civic bins. Gloves and snacks provided!
                  </p>
                </div>
                <Calendar className="w-4.5 h-4.5 text-teal-600 shrink-0 mt-0.5" />
              </div>
              <button
                type="button"
                onClick={() => setVolunteeredCleanUp(!volunteeredCleanUp)}
                className={`w-full py-1.5 text-[10px] font-semibold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  volunteeredCleanUp
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    : "bg-slate-900 hover:bg-slate-800 text-white"
                }`}
              >
                {volunteeredCleanUp ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Registered as Volunteer!</span>
                  </>
                ) : (
                  <span>Register to Volunteer</span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Local Polls */}
        <div className="bg-white rounded-2xl border border-slate-150 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <Users className="w-4 h-4" />
            </span>
            <div>
              <h4 className="font-display font-semibold text-sm text-slate-900">Locality Polls &amp; Campaigns</h4>
              <p className="text-[10px] text-slate-500">Decide ward improvements together</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Poll 1 */}
            <div className="border border-slate-100 rounded-xl p-3.5 space-y-3 bg-slate-50/30">
              <div className="space-y-1">
                <span className="text-[9px] font-bold bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded uppercase border border-indigo-100 font-mono">
                  Active Community Poll
                </span>
                <p className="text-xs font-semibold text-slate-800">
                  Should we request a speed-breaker bump on Elm Street near the elementary school?
                </p>
              </div>

              {poll1Vote ? (
                <div className="space-y-2">
                  <div className="text-[11px] font-semibold text-slate-700">Thank you for voting! Current standings:</div>
                  <div className="space-y-1.5 text-[11px]">
                    <div>
                      <div className="flex justify-between text-slate-600">
                        <span>Yes, highly necessary</span>
                        <span className="font-bold">{poll1Vote === "yes" ? "89%" : "88%"}</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div className="bg-indigo-600 h-full" style={{ width: poll1Vote === "yes" ? "89%" : "88%" }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-slate-600">
                        <span>No, speed bump not ideal</span>
                        <span className="font-bold">{poll1Vote === "no" ? "12%" : "11%"}</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div className="bg-slate-400 h-full" style={{ width: poll1Vote === "no" ? "12%" : "11%" }} />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPoll1Vote("yes")}
                    className="py-1.5 px-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <ThumbsUp className="w-3.5 h-3.5 text-slate-500" />
                    <span>Yes, necessary</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPoll1Vote("no")}
                    className="py-1.5 px-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>No, not needed</span>
                  </button>
                </div>
              )}
            </div>

            {/* Poll 2 */}
            <div className="border border-slate-100 rounded-xl p-3.5 space-y-3 bg-slate-50/30">
              <div className="space-y-1">
                <span className="text-[9px] font-bold bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded uppercase border border-indigo-100 font-mono">
                  Streetlight Placement
                </span>
                <p className="text-xs font-semibold text-slate-800">
                  Where should the next solar streetlight be placed?
                </p>
              </div>

              {poll2Vote ? (
                <div className="space-y-2">
                  <div className="text-[11px] font-semibold text-slate-700">Thank you for voting! Current standings:</div>
                  <div className="space-y-1.5 text-[11px]">
                    <div>
                      <div className="flex justify-between text-slate-600">
                        <span>Sector A Central Plaza</span>
                        <span className="font-bold">{poll2Vote === "A" ? "53%" : "52%"}</span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-indigo-600 h-full" style={{ width: poll2Vote === "A" ? "53%" : "52%" }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-slate-600">
                        <span>Sector B Jogging Track</span>
                        <span className="font-bold">{poll2Vote === "B" ? "33%" : "32%"}</span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-indigo-600 h-full" style={{ width: poll2Vote === "B" ? "33%" : "32%" }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-slate-600">
                        <span>Sector C Gate 2</span>
                        <span className="font-bold">{poll2Vote === "C" ? "17%" : "16%"}</span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-indigo-600 h-full" style={{ width: poll2Vote === "C" ? "17%" : "16%" }} />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5 font-sans">
                  <button
                    type="button"
                    onClick={() => setPoll2Vote("A")}
                    className="w-full text-left py-1.5 px-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition-all cursor-pointer"
                  >
                    A) Sector A Central Plaza
                  </button>
                  <button
                    type="button"
                    onClick={() => setPoll2Vote("B")}
                    className="w-full text-left py-1.5 px-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition-all cursor-pointer"
                  >
                    B) Sector B Jogging Track
                  </button>
                  <button
                    type="button"
                    onClick={() => setPoll2Vote("C")}
                    className="w-full text-left py-1.5 px-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition-all cursor-pointer"
                  >
                    C) Sector C Gate 2
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

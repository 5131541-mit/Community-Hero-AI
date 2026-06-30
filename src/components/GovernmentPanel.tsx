import React, { useState, useEffect } from "react";
import { Issue, IssueStatus, InventoryAsset } from "../types";
import { 
  Building2, Search, Filter, ArrowUpCircle, CheckCircle, 
  Clock, AlertTriangle, Hammer, Image, CheckSquare, 
  Sparkles, ArrowRight, TrendingUp, Users, Download,
  BarChart3, List, Layers, Truck, HelpCircle, FileText,
  CheckCircle2, Printer, ChevronRight, MessageSquare, Info
} from "lucide-react";
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
  Tooltip, Legend, PieChart, Pie, Cell 
} from "recharts";

interface GovernmentPanelProps {
  issues: Issue[];
  onUpdateStatus: (id: string, updates: { status: IssueStatus; resolvedImageUrl?: string; assignedTo?: string }) => void;
  onUpdateIssue?: (issue: Issue) => void;
  onSelectIssue: (issue: Issue) => void;
  selectedIssueId: string | null;
}

const MOCK_PROOF_IMAGES: Record<string, string[]> = {
  Road: [
    "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&q=80&w=600",
    "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&q=80&w=600"
  ],
  Waste: [
    "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&q=80&w=600",
    "https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&q=80&w=600"
  ],
  Water: [
    "https://images.unsplash.com/photo-1542013936693-8848e5742381?auto=format&fit=crop&q=80&w=600",
    "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=600"
  ],
  Electricity: [
    "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&q=80&w=600",
    "https://images.unsplash.com/photo-1509395062183-67c5ad6faff9?auto=format&fit=crop&q=80&w=600"
  ],
  Safety: [
    "https://images.unsplash.com/photo-1590103512987-09869199742e?auto=format&fit=crop&q=80&w=600"
  ]
};

const DEFAULT_PROOF_IMAGE = "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&q=80&w=600";

const CREW_OPTIONS = ["Crew Alpha", "Crew Beta", "Crew Delta", "Crew Sparky"];

export default function GovernmentPanel({
  issues,
  onUpdateStatus,
  onUpdateIssue,
  onSelectIssue,
  selectedIssueId
}: GovernmentPanelProps) {
  // Navigation & View Tabs
  const [activeTab, setActiveTab] = useState<"tickets" | "analytics" | "ai_query" | "dispatch" | "assets">("tickets");

  // Asset Management States
  const [assets, setAssets] = useState<InventoryAsset[]>([]);
  const [isAssetsLoading, setIsAssetsLoading] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [assetSearchTerm, setAssetSearchTerm] = useState("");
  const [assetCategoryFilter, setAssetCategoryFilter] = useState("All");

  // Allocate state
  const [allocateCrew, setAllocateCrew] = useState("Crew Alpha");
  const [allocateQty, setAllocateQty] = useState(1);
  const [allocateError, setAllocateError] = useState<string | null>(null);

  // Return state
  const [returnCrew, setReturnCrew] = useState("Crew Alpha");
  const [returnQty, setReturnQty] = useState(1);
  const [returnError, setReturnError] = useState<string | null>(null);

  // Stock management state
  const [stockUpdateVal, setStockUpdateVal] = useState<number | null>(null);

  // New Asset Form state
  const [showAddAssetModal, setShowAddAssetModal] = useState(false);
  const [newAssetName, setNewAssetName] = useState("");
  const [newAssetCategory, setNewAssetCategory] = useState("Roads");
  const [newAssetTotalStock, setNewAssetTotalStock] = useState(10);
  const [newAssetUnit, setNewAssetUnit] = useState("Units");
  const [assetActionSuccess, setAssetActionSuccess] = useState<string | null>(null);

  const fetchAssets = async () => {
    setIsAssetsLoading(true);
    try {
      const res = await fetch("/api/assets");
      if (res.ok) {
        const data = await res.json();
        setAssets(data);
      }
    } catch (err) {
      console.error("Error fetching assets:", err);
    } finally {
      setIsAssetsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  // Fetch whenever we switch to assets tab
  useEffect(() => {
    if (activeTab === "assets") {
      fetchAssets();
    }
  }, [activeTab]);

  // Filter and Search States
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  // Recalculating AI Priority Tracker
  const [recalculatingId, setRecalculatingId] = useState<string | null>(null);

  // Bulk Mode States
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedBulkIds, setSelectedBulkIds] = useState<string[]>([]);
  const [bulkAssignee, setBulkAssignee] = useState("");
  const [bulkStatus, setBulkStatus] = useState("");
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // AI Analytics Query Engine States
  const [aiQueryInput, setAiQueryInput] = useState("");
  const [aiQueryResult, setAiQueryResult] = useState<string | null>(null);
  const [aiQuerySources, setAiQuerySources] = useState<any[]>([]);
  const [isAiQueryLoading, setIsAiQueryLoading] = useState(false);

  // Crew Dispatch Sheet States
  const [selectedCrew, setSelectedCrew] = useState("Crew Alpha");
  const [printManifest, setPrintManifest] = useState(false);

  // Standard Resolution Proof Modal States
  const [assigneeName, setAssigneeName] = useState("");
  const [selectedProofUrl, setSelectedProofUrl] = useState("");
  const [customProofUpload, setCustomProofUpload] = useState("");
  const [showResolveModal, setShowResolveModal] = useState(false);

  // Active issue selected for detail modification in the control panel
  const activeIssue = issues.find((i) => i.id === selectedIssueId);

  // Filter logic for Grievance Queue
  const filteredIssues = issues.filter((issue) => {
    const matchesSearch = 
      issue.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (issue.address && issue.address.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = categoryFilter === "All" || issue.category === categoryFilter;
    const matchesStatus = statusFilter === "All" || issue.status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Filter logic for Asset Inventory
  const filteredAssets = assets.filter((asset) => {
    const matchesSearch = asset.name.toLowerCase().includes(assetSearchTerm.toLowerCase());
    const matchesCategory = assetCategoryFilter === "All" || asset.category.toLowerCase() === assetCategoryFilter.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  // Calculate stats for current filter dynamically
  const activeIssuesList = issues.filter((i) => i.status !== "Resolved");
  const inProgressList = issues.filter((i) => i.status === "In Progress");
  const resolvedList = issues.filter((i) => i.status === "Resolved");

  // Single Recalculate Priority Handler
  const handleRecalculatePriority = async (id: string) => {
    try {
      setRecalculatingId(id);
      const res = await fetch(`/api/issues/${id}/recalculate-priority`, {
        method: "POST"
      });
      if (res.ok && onUpdateIssue) {
        const updatedIssue = await res.json();
        onUpdateIssue(updatedIssue);
      }
    } catch (err) {
      console.error("Error recalculating priority score:", err);
    } finally {
      setRecalculatingId(null);
    }
  };

  const handleAssignWork = (id: string) => {
    if (!assigneeName.trim()) return;
    onUpdateStatus(id, {
      status: "In Progress",
      assignedTo: assigneeName
    });
    setAssigneeName("");
  };

  const handleResolveWork = (id: string) => {
    const proofUrl = customProofUpload || selectedProofUrl || MOCK_PROOF_IMAGES[activeIssue?.category || "Road"]?.[0] || DEFAULT_PROOF_IMAGE;
    
    onUpdateStatus(id, {
      status: "Resolved",
      resolvedImageUrl: proofUrl
    });
    
    setShowResolveModal(false);
    setSelectedProofUrl("");
    setCustomProofUpload("");
  };

  const handleCustomProofImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setCustomProofUpload(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Bulk actions handlers
  const handleToggleBulkSelect = (id: string) => {
    setSelectedBulkIds((prev) => 
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    const allFilteredIds = filteredIssues.map((i) => i.id);
    const hasAllSelected = allFilteredIds.every((id) => selectedBulkIds.includes(id));
    if (hasAllSelected) {
      setSelectedBulkIds((prev) => prev.filter((id) => !allFilteredIds.includes(id)));
    } else {
      setSelectedBulkIds((prev) => {
        const union = new Set([...prev, ...allFilteredIds]);
        return Array.from(union);
      });
    }
  };

  const handleBulkExecute = async () => {
    if (selectedBulkIds.length === 0) return;
    setIsBulkProcessing(true);
    try {
      const res = await fetch("/api/issues/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: selectedBulkIds,
          status: bulkStatus || undefined,
          assignedTo: bulkAssignee || undefined
        })
      });

      if (res.ok) {
        const data = await res.json();
        // Update client side states in bulk
        if (data.issues && onUpdateIssue) {
          const updatedSubset = data.issues.filter((i: any) => selectedBulkIds.includes(i.id));
          updatedSubset.forEach((updated: Issue) => {
            onUpdateIssue(updated);
          });
        }
        setSelectedBulkIds([]);
        setBulkStatus("");
        setBulkAssignee("");
        setBulkMode(false);
      }
    } catch (err) {
      console.error("Bulk update failed:", err);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkRecalculatePriority = async () => {
    if (selectedBulkIds.length === 0) return;
    setIsBulkProcessing(true);
    try {
      for (const id of selectedBulkIds) {
        const res = await fetch(`/api/issues/${id}/recalculate-priority`, {
          method: "POST"
        });
        if (res.ok && onUpdateIssue) {
          const updated = await res.json();
          onUpdateIssue(updated);
        }
      }
      setSelectedBulkIds([]);
      setBulkMode(false);
    } catch (err) {
      console.error("Bulk recalculation failed:", err);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // --- ASSET MANAGEMENT FRONTEND HANDLERS ---

  const triggerSuccessAlert = (msg: string) => {
    setAssetActionSuccess(msg);
    setTimeout(() => setAssetActionSuccess(null), 4000);
  };

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssetName.trim() || !newAssetCategory || newAssetTotalStock < 0) return;
    try {
      const res = await fetch("/api/assets/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newAssetName,
          category: newAssetCategory,
          totalStock: Number(newAssetTotalStock),
          unit: newAssetUnit
        })
      });
      if (res.ok) {
        triggerSuccessAlert(`Asset "${newAssetName}" registered successfully in Ward 5 inventory.`);
        setNewAssetName("");
        setNewAssetTotalStock(10);
        setShowAddAssetModal(false);
        fetchAssets();
      }
    } catch (err) {
      console.error("Failed to create asset:", err);
    }
  };

  const handleAssignAsset = async (assetId: string) => {
    setAllocateError(null);
    if (allocateQty <= 0) {
      setAllocateError("Quantity must be greater than 0");
      return;
    }
    try {
      const res = await fetch(`/api/assets/${assetId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          crewName: allocateCrew,
          allocatedQty: Number(allocateQty)
        })
      });
      if (res.ok) {
        triggerSuccessAlert(`Allocated ${allocateQty} units of equipment to ${allocateCrew}.`);
        setAllocateQty(1);
        fetchAssets();
      } else {
        const data = await res.json();
        setAllocateError(data.error || "Failed to allocate asset");
      }
    } catch (err) {
      console.error("Failed to assign asset:", err);
      setAllocateError("Server communication error.");
    }
  };

  const handleReturnAsset = async (assetId: string) => {
    setReturnError(null);
    if (returnQty <= 0) {
      setReturnError("Quantity must be greater than 0");
      return;
    }
    try {
      const res = await fetch(`/api/assets/${assetId}/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          crewName: returnCrew,
          returnQty: Number(returnQty)
        })
      });
      if (res.ok) {
        triggerSuccessAlert(`Successfully returned ${returnQty} units of equipment from ${returnCrew}.`);
        setReturnQty(1);
        fetchAssets();
      } else {
        const data = await res.json();
        setReturnError(data.error || "Failed to return asset");
      }
    } catch (err) {
      console.error("Failed to return asset:", err);
      setReturnError("Server communication error.");
    }
  };

  const handleUpdateStock = async (assetId: string) => {
    if (stockUpdateVal === null || stockUpdateVal < 0) return;
    try {
      const res = await fetch(`/api/assets/${assetId}/update-stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          totalStock: Number(stockUpdateVal)
        })
      });
      if (res.ok) {
        triggerSuccessAlert(`Asset total stock level updated successfully.`);
        setStockUpdateVal(null);
        fetchAssets();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update stock");
      }
    } catch (err) {
      console.error("Failed to update asset stock:", err);
    }
  };

  // Natural Language AI Auditing Query
  const handleAiQuerySubmit = async (customQuery?: string) => {
    const targetQuery = customQuery || aiQueryInput;
    if (!targetQuery.trim()) return;

    setIsAiQueryLoading(true);
    setAiQueryResult(null);
    setAiQuerySources([]);

    try {
      const res = await fetch("/api/gemini/municipal-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: targetQuery })
      });

      if (res.ok) {
        const data = await res.json();
        setAiQueryResult(data.text);
        setAiQuerySources(data.sources || []);
      } else {
        setAiQueryResult("Operational Command Error: Unable to query real-time data metrics.");
      }
    } catch (err) {
      console.error("AI query failed:", err);
      setAiQueryResult("Failure in municipal data processing engine.");
    } finally {
      setIsAiQueryLoading(false);
    }
  };

  // Recharts Data Processing
  const severityData = ["Critical", "High", "Medium", "Low"].map((sev) => ({
    name: sev,
    Active: issues.filter((i) => i.severity === sev && i.status !== "Resolved").length,
    Resolved: issues.filter((i) => i.severity === sev && i.status === "Resolved").length
  }));

  const categoryData = ["Road", "Waste", "Electricity", "Water", "Safety", "Traffic"].map((cat) => ({
    name: cat,
    Active: issues.filter((i) => i.category === cat && i.status !== "Resolved").length,
    Resolved: issues.filter((i) => i.category === cat && i.status === "Resolved").length
  }));

  const statusPieData = [
    { name: "Reported", value: issues.filter((i) => i.status === "Reported").length, color: "#f87171" },
    { name: "In Progress", value: issues.filter((i) => i.status === "In Progress").length, color: "#fbbf24" },
    { name: "Resolved", value: issues.filter((i) => i.status === "Resolved").length, color: "#34d399" }
  ];

  // CSV Downloader
  const handleDownloadCSV = () => {
    const headers = [
      "Ticket ID",
      "Title",
      "Category",
      "Specific Type",
      "Severity",
      "Priority Score",
      "Status",
      "Upvotes",
      "Reporter",
      "Address",
      "Created At",
      "Damage Estimation"
    ];

    const rows = filteredIssues.map((issue) => [
      issue.id,
      `"${(issue.title || "").replace(/"/g, '""')}"`,
      issue.category,
      issue.specificType || "Unspecified",
      issue.severity,
      issue.priorityScore || 50,
      issue.status,
      issue.upvotes || 0,
      `"${(issue.reporterName || "Anonymous").replace(/"/g, '""')}"`,
      `"${(issue.address || "Unknown").replace(/"/g, '""')}"`,
      issue.createdAt || "",
      issue.damageEstimation || "Not Appraised"
    ]);

    const csvString = [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ward_5_civic_issues_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Gather active crew issues sequenced by priority rank (highest first)
  const crewIssues = issues
    .filter((i) => i.assignedTo === selectedCrew && i.status !== "Resolved")
    .sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));

  return (
    <div id="government-panel-root" className="space-y-4">
      {/* SaaS Statistics Header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-900 text-white rounded-2xl p-5 shadow-lg border border-slate-800">
        <div className="space-y-1 md:col-span-1 border-r border-slate-800 pr-4 shrink-0 flex flex-col justify-center">
          <div className="flex items-center gap-1.5 text-teal-400">
            <Building2 className="w-4 h-4 text-teal-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Official Portal</span>
          </div>
          <h3 className="font-display font-bold text-base">Ward 5 Municipal Command</h3>
          <p className="text-[10px] text-slate-400 leading-normal">Operational control and ticket routing for city managers.</p>
        </div>

        <div className="grid grid-cols-3 md:col-span-3 gap-3">
          <div className="bg-slate-850 p-3.5 rounded-xl border border-slate-800">
            <TrendingUp className="w-4 h-4 text-emerald-400 mb-1" />
            <p className="text-[10px] text-slate-400 font-medium">Avg Resolution Time</p>
            <p className="text-xl font-display font-bold text-slate-100">1.8 Days</p>
            <p className="text-[8px] text-emerald-400 mt-1">▲ 14% faster than last month</p>
          </div>
          <div className="bg-slate-850 p-3.5 rounded-xl border border-slate-800">
            <Clock className="w-4 h-4 text-amber-400 mb-1" />
            <p className="text-[10px] text-slate-400 font-medium">Active Backlog</p>
            <p className="text-xl font-display font-bold text-slate-100">
              {activeIssuesList.length} Tickets
            </p>
            <p className="text-[8px] text-slate-400 mt-1">94% classified by Gemini AI</p>
          </div>
          <div className="bg-slate-850 p-3.5 rounded-xl border border-slate-800">
            <Users className="w-4 h-4 text-sky-400 mb-1" />
            <p className="text-[10px] text-slate-400 font-medium">Repair Crews Active</p>
            <p className="text-xl font-display font-bold text-slate-100">{CREW_OPTIONS.length} Squads</p>
            <p className="text-[8px] text-sky-400 mt-1">Alpha, Beta, Delta, Sparky</p>
          </div>
        </div>
      </div>

      {/* Primary Dashboard Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Main Work Area (Left 2 Columns) */}
        <div className="bg-white rounded-2xl border border-slate-150 p-4 shadow-sm lg:col-span-2 space-y-4">
          
          {/* Dashboard Module Tabs */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex gap-1.5 flex-wrap">
              <button
                onClick={() => { setActiveTab("tickets"); setBulkMode(false); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === "tickets"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-850 hover:bg-slate-50"
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Grievance Queue</span>
              </button>

              <button
                onClick={() => { setActiveTab("analytics"); setBulkMode(false); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === "analytics"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-850 hover:bg-slate-50"
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Analytics Hub</span>
              </button>

              <button
                onClick={() => { setActiveTab("ai_query"); setBulkMode(false); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === "ai_query"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-850 hover:bg-slate-50"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-teal-500 animate-pulse" />
                <span>AI Command Console</span>
              </button>

              <button
                onClick={() => { setActiveTab("dispatch"); setBulkMode(false); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === "dispatch"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-850 hover:bg-slate-50"
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Dispatch Sheets</span>
              </button>

              <button
                onClick={() => { setActiveTab("assets"); setBulkMode(false); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === "assets"
                    ? "bg-slate-900 text-white shadow-sm font-bold"
                    : "text-slate-500 hover:text-slate-850 hover:bg-slate-50"
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-indigo-500" />
                <span>Asset Management</span>
              </button>
            </div>

            {/* CSV Quick Export Button */}
            {activeTab === "tickets" && (
              <button
                onClick={handleDownloadCSV}
                className="text-[11px] font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
              >
                <Download className="w-3 h-3" />
                <span>CSV Export</span>
              </button>
            )}
          </div>

          {/* RENDERING ACTIVE VIEW */}

          {/* VIEW 1: TICKETS GRIEVANCE QUEUE */}
          {activeTab === "tickets" && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
                {/* Search Box */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search ID, title, landmark, or reporter..."
                    className="w-full bg-slate-50 border border-slate-250 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 outline-none focus:border-teal-500 focus:bg-white transition-all"
                  />
                </div>

                {/* Granular Filters row */}
                <div className="flex items-center gap-1.5 self-end sm:self-auto text-[11px]">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-200 px-2 py-1.5 rounded-xl outline-none text-slate-600"
                  >
                    <option value="All">All Categories</option>
                    <option value="Road">Road</option>
                    <option value="Waste">Waste</option>
                    <option value="Electricity">Electricity</option>
                    <option value="Water">Water</option>
                    <option value="Safety">Safety</option>
                    <option value="Traffic">Traffic</option>
                  </select>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-200 px-2 py-1.5 rounded-xl outline-none text-slate-600"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Reported">Reported</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                  </select>

                  <button
                    onClick={() => {
                      setBulkMode(!bulkMode);
                      setSelectedBulkIds([]);
                    }}
                    className={`px-3 py-1.5 rounded-xl font-semibold border transition-all cursor-pointer ${
                      bulkMode
                        ? "bg-rose-500 text-white border-rose-500 shadow-sm"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    Bulk Mode
                  </button>
                </div>
              </div>

              {/* Bulk operations bar */}
              {bulkMode && (
                <div className="bg-rose-50 border border-rose-150 rounded-xl p-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 animate-fade-in text-xs text-slate-700">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSelectAllFiltered}
                      className="bg-white border border-rose-200 text-rose-700 font-bold px-2.5 py-1 rounded-lg hover:bg-rose-100 transition-all cursor-pointer"
                    >
                      {filteredIssues.every((i) => selectedBulkIds.includes(i.id)) ? "Deselect All" : "Select All Filtered"}
                    </button>
                    <span className="font-semibold text-rose-950">
                      {selectedBulkIds.length} tickets selected
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={bulkAssignee}
                      onChange={(e) => setBulkAssignee(e.target.value)}
                      className="bg-white border border-rose-200 px-2.5 py-1.5 rounded-lg outline-none"
                    >
                      <option value="">-- Assign Crew --</option>
                      {CREW_OPTIONS.map((crew) => (
                        <option key={crew} value={crew}>{crew}</option>
                      ))}
                    </select>

                    <select
                      value={bulkStatus}
                      onChange={(e) => setBulkStatus(e.target.value)}
                      className="bg-white border border-rose-200 px-2.5 py-1.5 rounded-lg outline-none"
                    >
                      <option value="">-- Set Status --</option>
                      <option value="Reported">Reported</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                    </select>

                    <button
                      onClick={handleBulkExecute}
                      disabled={isBulkProcessing || (selectedBulkIds.length === 0) || (!bulkAssignee && !bulkStatus)}
                      className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-3 py-1.5 rounded-lg disabled:opacity-40 transition-all cursor-pointer shadow-sm"
                    >
                      Apply Updates
                    </button>

                    <button
                      onClick={handleBulkRecalculatePriority}
                      disabled={isBulkProcessing || (selectedBulkIds.length === 0)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-lg disabled:opacity-40 transition-all cursor-pointer shadow-sm flex items-center gap-1"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Bulk AI Prioritize
                    </button>
                  </div>
                </div>
              )}

              {/* Grid or Queue of Tickets */}
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {filteredIssues.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-150">
                    <CheckSquare className="w-9 h-9 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-600">No matching grievances registered</p>
                    <p className="text-[10px] text-slate-400 mt-1">Excellent! Filtered queue is completely cleared.</p>
                  </div>
                ) : (
                  filteredIssues.map((issue) => {
                    const isSelected = issue.id === selectedIssueId;
                    const isChecked = selectedBulkIds.includes(issue.id);
                    return (
                      <div
                        key={issue.id}
                        onClick={() => {
                          if (bulkMode) {
                            handleToggleBulkSelect(issue.id);
                          } else {
                            onSelectIssue(issue);
                          }
                        }}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                          isSelected && !bulkMode
                            ? "bg-teal-50/20 border-teal-500 shadow-sm"
                            : "bg-slate-50/40 hover:bg-slate-50 border-slate-150 hover:border-slate-250"
                        }`}
                      >
                        {bulkMode && (
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleBulkSelect(issue.id)}
                            className="w-4 h-4 rounded text-rose-500 focus:ring-rose-400 border-slate-300 shrink-0 cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}

                        <div className="flex-1 min-w-0 flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded ${
                                issue.status === "Resolved"
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                  : issue.status === "In Progress"
                                  ? "bg-amber-100 text-amber-800 border border-amber-200 animate-pulse"
                                  : "bg-rose-100 text-rose-800 border border-rose-200"
                              }`}>
                                {issue.status}
                              </span>
                              <span className="text-[9px] bg-slate-150 text-slate-600 font-bold px-1.5 py-0.5 rounded">
                                {issue.category}
                              </span>
                              <span className="text-[9px] text-slate-400 font-mono">ID: {issue.id}</span>
                              {issue.assignedTo && (
                                <span className="text-[9px] text-slate-500 font-medium bg-slate-100 px-1.5 rounded border border-slate-200 flex items-center gap-0.5">
                                  <Hammer className="w-2.5 h-2.5" /> {issue.assignedTo}
                                </span>
                              )}
                            </div>
                            <p className="font-semibold text-xs text-slate-800 leading-tight mt-1">{issue.title}</p>
                            <p className="text-[10px] text-slate-500 line-clamp-1 italic">{issue.address}</p>
                          </div>

                          {/* Priority Tag */}
                          <div className="text-right shrink-0">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                              issue.severity === "Critical"
                                ? "bg-red-500 text-white"
                                : issue.severity === "High"
                                ? "bg-orange-500 text-white"
                                : issue.severity === "Medium"
                                ? "bg-yellow-500 text-slate-900"
                                : "bg-slate-500 text-white"
                            }`}>
                              {issue.severity}
                            </span>
                            <p className="text-[10px] text-teal-700 font-bold mt-1.5 font-sans flex items-center gap-0.5 justify-end bg-teal-50 px-1.5 py-0.5 rounded-md border border-teal-100/50">
                              <Sparkles className="w-3 h-3 text-teal-500 shrink-0" />
                              Rank: {issue.priorityScore}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* VIEW 2: INTERACTIVE ANALYTICS HUB */}
          {activeTab === "analytics" && (
            <div className="space-y-4 animate-fade-in text-xs text-slate-600">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center gap-2">
                <Info className="w-4 h-4 text-teal-500 shrink-0" />
                <p><strong>Interactive Dashboard:</strong> Click any bar on the charts below to automatically filter the main Grievance Queue by that category or severity rank!</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Chart A: Grievances by Category */}
                <div className="bg-white border border-slate-150 rounded-xl p-3 shadow-xs space-y-2">
                  <h5 className="font-display font-bold text-slate-800 flex items-center gap-1">
                    <Layers className="w-4 h-4 text-teal-500" /> Issues by Functional Sector
                  </h5>
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={categoryData} onClick={(data) => {
                        if (data && data.activeLabel) {
                          setCategoryFilter(data.activeLabel);
                          setActiveTab("tickets");
                        }
                      }}>
                        <XAxis dataKey="name" stroke="#888888" fontSize={9} />
                        <YAxis stroke="#888888" fontSize={9} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: '9px' }} />
                        <Bar dataKey="Active" fill="#3b82f6" stackId="a" name="Active Backlog" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="Resolved" fill="#10b981" stackId="a" name="Resolved" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Chart B: Grievances by Severity */}
                <div className="bg-white border border-slate-150 rounded-xl p-3 shadow-xs space-y-2">
                  <h5 className="font-display font-bold text-slate-800 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4 text-amber-500" /> Active Backlog by Urgency Rank
                  </h5>
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={severityData} onClick={(data) => {
                        if (data && data.activeLabel) {
                          setActiveTab("tickets");
                        }
                      }}>
                        <XAxis dataKey="name" stroke="#888888" fontSize={9} />
                        <YAxis stroke="#888888" fontSize={9} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: '9px' }} />
                        <Bar dataKey="Active" fill="#fb923c" name="Active" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Status Breakdown Circle */}
              <div className="bg-white border border-slate-150 rounded-xl p-3.5 shadow-xs flex flex-col md:flex-row items-center gap-6">
                <div className="flex-1 space-y-1">
                  <h5 className="font-display font-bold text-slate-800">Total Resolution Lifecycle</h5>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Analyzing active reports in transition states. Live pipeline displays the percentage of tickets dispatched, waiting for crew routing, or fully validated as completed.
                  </p>
                </div>
                <div className="w-[200px] h-[150px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={55}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {statusPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  {statusPieData.map((entry, i) => (
                    <div key={i} className="flex items-center gap-2 text-[10px] font-semibold text-slate-700">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                      <span>{entry.name}: {entry.value} issues</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* VIEW 3: AI COMMAND CONSOLE */}
          {activeTab === "ai_query" && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-white space-y-3.5">
                <div className="flex items-center gap-2 text-teal-400">
                  <Sparkles className="w-4 h-4 text-teal-400" />
                  <span className="text-xs font-bold uppercase tracking-wider">AI Executive Audit Terminal</span>
                </div>
                
                <p className="text-xs text-slate-300 leading-normal">
                  Query our live database for analytical reports, budget projections, field sequence suggestions, or policy guidelines.
                </p>

                {/* Quick commands selector */}
                <div className="space-y-1.5 pt-1.5">
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Suggested Executive Audit Prompts</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                    {[
                      "Analyze budget and estimated cost breakdown of unresolved Road hazards",
                      "Create a strategic 3-day dispatch plan for Crew Beta with priority-based route order",
                      "Synthesize the social demand impact of Waste issues versus Water complaints",
                      "Generate an executive advisory note on safety rules and preventative guidelines for electric wires"
                    ].map((promptText, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setAiQueryInput(promptText);
                          handleAiQuerySubmit(promptText);
                        }}
                        className="text-[10px] text-left bg-slate-850 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 p-2 rounded-lg text-slate-300 transition-all cursor-pointer truncate"
                      >
                        {promptText}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <input
                    type="text"
                    value={aiQueryInput}
                    onChange={(e) => setAiQueryInput(e.target.value)}
                    placeholder="Enter custom municipal analytics query..."
                    className="flex-1 bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition-all"
                  />
                  <button
                    onClick={() => handleAiQuerySubmit()}
                    disabled={isAiQueryLoading || !aiQueryInput.trim()}
                    className="bg-teal-500 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl hover:bg-teal-400 disabled:opacity-40 transition-all cursor-pointer flex items-center gap-1"
                  >
                    {isAiQueryLoading ? "Processing..." : "Run AI Audit"}
                  </button>
                </div>
              </div>

              {/* Results display */}
              {isAiQueryLoading && (
                <div className="p-12 text-center bg-slate-50 rounded-2xl border border-slate-150 space-y-2">
                  <Clock className="w-8 h-8 text-teal-500 animate-spin mx-auto" />
                  <p className="text-xs font-semibold text-slate-600">Generating deep municipal data audit...</p>
                  <p className="text-[10px] text-slate-400">Consulting structural engineering databases &amp; GIS coordinates...</p>
                </div>
              )}

              {aiQueryResult && !isAiQueryLoading && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3.5 animate-fade-in text-xs leading-relaxed text-slate-800">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-teal-600" />
                      Generated Strategic Report
                    </span>
                    <button
                      onClick={() => window.print()}
                      className="text-[10px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2.5 py-1 rounded-lg cursor-pointer flex items-center gap-1"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Print
                    </button>
                  </div>

                  <div className="prose prose-sm max-w-none whitespace-pre-wrap font-sans text-slate-700">
                    {aiQueryResult}
                  </div>

                  {aiQuerySources.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-200 space-y-1.5">
                      <p className="font-bold text-[10px] text-teal-700 uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Checked Engineering Reference Sources:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {aiQuerySources.map((src, sIdx) => (
                          <a
                            key={sIdx}
                            href={src.uri}
                            target="_blank"
                            rel="noreferrer"
                            className="bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-850 px-2 py-1 rounded border border-slate-200 transition-colors inline-flex items-center gap-1 text-[10px] font-semibold"
                          >
                            <span>{src.title}</span>
                            <span>↗</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* VIEW 4: FIELD CREW DISPATCH PLANNER */}
          {activeTab === "dispatch" && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-slate-50 border border-slate-150 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <h5 className="font-display font-bold text-slate-850 flex items-center gap-1">
                    <Truck className="w-4 h-4 text-teal-500" /> Crew Operations Sequencer
                  </h5>
                  <p className="text-slate-500 text-[11px]">Select any specialized squad to view and generate their prioritized daily work dispatch routes.</p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedCrew}
                    onChange={(e) => setSelectedCrew(e.target.value)}
                    className="bg-white border border-slate-250 rounded-xl px-2.5 py-1.5 outline-none font-semibold text-slate-700 cursor-pointer"
                  >
                    {CREW_OPTIONS.map((crew) => (
                      <option key={crew} value={crew}>{crew}</option>
                    ))}
                  </select>

                  <button
                    onClick={() => setPrintManifest(true)}
                    disabled={crewIssues.length === 0}
                    className="bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40 font-bold px-3 py-1.5 rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Manifest</span>
                  </button>
                </div>
              </div>

              {/* Sequenced task list for selected crew */}
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {crewIssues.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 border border-slate-150 rounded-xl">
                    <CheckSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-600">No active work assigned to {selectedCrew}</p>
                    <p className="text-[10px] text-slate-400 mt-1">Assign Reported tickets to this crew from the Inspector on the right.</p>
                  </div>
                ) : (
                  crewIssues.map((issue, index) => (
                    <div key={issue.id} className="p-3 bg-white border border-slate-200 rounded-xl hover:border-teal-400 transition-all flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-teal-50 text-teal-600 border border-teal-100 flex items-center justify-center font-bold text-xs font-mono shrink-0">
                        {index + 1}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-1.5 rounded font-mono font-bold">Priority score: {issue.priorityScore}</span>
                          <span className="text-[9px] text-slate-400 font-mono">ID: {issue.id}</span>
                        </div>
                        <h6 className="font-bold text-xs text-slate-800 mt-0.5">{issue.title}</h6>
                        <p className="text-[10px] text-slate-500 line-clamp-1">{issue.address}</p>
                      </div>

                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                        issue.severity === "Critical" ? "bg-red-500 text-white" : "bg-slate-150 text-slate-600"
                      }`}>
                        {issue.severity}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>

        {/* Selected Complaint Control Panel / Inspector (Right 1 Column) */}
        <div className="bg-white rounded-2xl border border-slate-150 p-4 shadow-sm flex flex-col justify-between min-h-[420px]">
          {activeIssue ? (
            <div className="space-y-4 flex-1 flex flex-col justify-between">
              <div className="space-y-3.5">
                <div className="flex items-start justify-between border-b border-slate-100 pb-2.5">
                  <div className="min-w-0 flex-1">
                    <h5 className="font-display font-semibold text-xs text-slate-500 uppercase tracking-wider">Ticket Inspector</h5>
                    <p className="font-bold text-xs text-slate-800 mt-0.5 truncate">{activeIssue.title}</p>
                  </div>
                  <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-1 border border-teal-200 rounded-lg shrink-0 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-teal-600 animate-pulse" />
                    Priority: {activeIssue.priorityScore}
                  </span>
                </div>

                <div className="space-y-2.5 text-xs text-slate-600">
                  <p className="leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100 italic">
                    &ldquo;{activeIssue.description}&rdquo;
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-[11px] border-b border-slate-100 pb-2.5">
                    <div>
                      <p className="font-bold text-slate-400 uppercase tracking-wide text-[9px]">Reporter</p>
                      <p className="text-slate-800 font-semibold">{activeIssue.reporterName}</p>
                    </div>
                    <div>
                      <p className="font-bold text-slate-400 uppercase tracking-wide text-[9px]">Assigned Dept</p>
                      <p className="text-slate-800 font-semibold truncate">{activeIssue.department}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] border-b border-slate-100 pb-2.5">
                    <div>
                      <p className="font-bold text-slate-400 uppercase tracking-wide text-[9px]">Category</p>
                      <p className="text-slate-800 font-semibold">{activeIssue.category} • {activeIssue.specificType}</p>
                    </div>
                    <div>
                      <p className="font-bold text-slate-400 uppercase tracking-wide text-[9px]">Upvotes</p>
                      <p className="text-slate-800 font-semibold flex items-center gap-1">
                        <ArrowUpCircle className="w-3.5 h-3.5 text-teal-500 fill-teal-50" /> {activeIssue.upvotes} validations
                      </p>
                    </div>
                  </div>

                  {activeIssue.assignedTo && (
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-150 flex items-center gap-2 text-[11px]">
                      <Hammer className="w-3.5 h-3.5 text-slate-500" />
                      <span>Assigned repair crew: <strong className="text-slate-800">{activeIssue.assignedTo}</strong></span>
                    </div>
                  )}

                  {/* Damage Appraisal */}
                  {activeIssue.damageEstimation && (
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-150 space-y-1 text-[11px]">
                      <p className="font-bold text-slate-500 uppercase tracking-wide text-[9px]">Structural Damage Appraisal</p>
                      <p className="text-slate-700 italic leading-normal font-sans font-medium">&ldquo;{activeIssue.damageEstimation}&rdquo;</p>
                    </div>
                  )}

                  {/* AI Risk Analysis */}
                  {activeIssue.aiRiskAnalysis ? (
                    <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3 space-y-2 text-[11px] animate-fade-in">
                      <div className="flex items-center justify-between border-b border-indigo-100/50 pb-1.5">
                        <span className="font-bold text-indigo-900 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5" /> Gemini Risk Metrics
                        </span>
                        <button
                          type="button"
                          disabled={recalculatingId === activeIssue.id}
                          onClick={() => handleRecalculatePriority(activeIssue.id)}
                          className="text-[9px] font-bold text-indigo-600 hover:text-indigo-800 bg-white border border-indigo-200 px-2 py-0.5 rounded-lg cursor-pointer"
                        >
                          {recalculatingId === activeIssue.id ? "Analyzing..." : "↻ Recalculate"}
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-semibold">
                        <div className="bg-white p-1.5 rounded-lg border border-indigo-100">
                          <p className="text-slate-400 text-[8px] uppercase font-bold">Hazard Level</p>
                          <p className="text-rose-600 text-xs font-bold mt-0.5">{activeIssue.aiRiskAnalysis.hazardLevel}/100</p>
                        </div>
                        <div className="bg-white p-1.5 rounded-lg border border-indigo-100">
                          <p className="text-slate-400 text-[8px] uppercase font-bold">Social Demand</p>
                          <p className="text-indigo-600 text-xs font-bold mt-0.5">{activeIssue.aiRiskAnalysis.socialDemandScore}/100</p>
                        </div>
                        <div className="bg-white p-1.5 rounded-lg border border-indigo-100">
                          <p className="text-slate-400 text-[8px] uppercase font-bold">Propagation</p>
                          <p className="text-amber-600 text-xs font-bold mt-0.5">{activeIssue.aiRiskAnalysis.propagationRisk}/100</p>
                        </div>
                      </div>

                      {activeIssue.aiRiskAnalysis.safetyRecommendation && (
                        <p className="text-[10px] text-indigo-950 bg-white/80 p-2 rounded-lg border border-indigo-100/80 leading-normal font-sans font-medium">
                          ⚠️ <span className="font-bold text-indigo-900">Safety recommendation:</span> {activeIssue.aiRiskAnalysis.safetyRecommendation}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-slate-150 rounded-xl p-3 flex items-center justify-between gap-2">
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase">AI Safety Appraisal</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Calculate detailed hazard risk &amp; priority factors using Gemini</p>
                      </div>
                      <button
                        type="button"
                        disabled={recalculatingId === activeIssue.id}
                        onClick={() => handleRecalculatePriority(activeIssue.id)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg cursor-pointer shadow-xs disabled:opacity-50 shrink-0 transition-all"
                      >
                        {recalculatingId === activeIssue.id ? "Evaluating..." : "Evaluate Risk"}
                      </button>
                    </div>
                  )}

                  {/* Incident photo attachment */}
                  {activeIssue.imageUrl && (
                    <div className="rounded-xl overflow-hidden border border-slate-200 h-[100px] relative group">
                      <img 
                        src={activeIssue.imageUrl} 
                        alt="Incident Proof" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                          <Image className="w-3.5 h-3.5" /> Before Image
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Resolved work proof attachment */}
                  {activeIssue.resolvedImageUrl && (
                    <div className="rounded-xl overflow-hidden border border-emerald-200 h-[100px] relative group">
                      <img 
                        src={activeIssue.resolvedImageUrl} 
                        alt="Resolved Proof" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center opacity-100 transition-opacity">
                        <span className="text-emerald-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 bg-slate-950/80 px-2 py-1 rounded-lg">
                          <CheckCircle className="w-3.5 h-3.5" /> Resolution Proof Image
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Transition Action Buttons */}
              <div className="space-y-2 border-t border-slate-100 pt-4 mt-auto">
                {activeIssue.status === "Reported" && (
                  <div className="space-y-2 animate-fade-in">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Dispatch Crew</p>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={assigneeName}
                        onChange={(e) => setAssigneeName(e.target.value)}
                        placeholder="e.g. Crew Beta, Squad 5"
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-teal-500 focus:bg-white transition-all"
                      />
                      <button
                        onClick={() => handleAssignWork(activeIssue.id)}
                        disabled={!assigneeName.trim()}
                        className="bg-slate-900 text-white hover:bg-slate-800 px-3 py-1.5 rounded-xl font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                      >
                        <Hammer className="w-3.5 h-3.5" /> Assign
                      </button>
                    </div>
                  </div>
                )}

                {activeIssue.status === "In Progress" && (
                  <div className="animate-fade-in">
                    <button
                      onClick={() => {
                        const categoryImages = MOCK_PROOF_IMAGES[activeIssue.category] || [DEFAULT_PROOF_IMAGE];
                        setSelectedProofUrl(categoryImages[0]);
                        setShowResolveModal(true);
                      }}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Complete Work & Upload Proof</span>
                    </button>
                  </div>
                )}

                {activeIssue.status === "Resolved" && (
                  <div className="bg-emerald-50 text-emerald-800 p-3 rounded-xl border border-emerald-150 flex items-center gap-2.5 text-xs">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-semibold">Case Fully Solved & Verified</p>
                      <p className="text-[10px] opacity-90">Work proof photo published. Submitting citizen has received feedback.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-slate-50 border border-slate-150 rounded-2xl">
              <Building2 className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-xs font-semibold text-slate-600">No ticket selected</p>
              <p className="text-[10px] text-slate-400 mt-1 max-w-[200px]">
                Select any complaint from the left queue to dispatch crew, allocate departments, or resolve with after photos.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* Proof of Work Resolution Modal */}
      {showResolveModal && activeIssue && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 p-5 shadow-2xl space-y-4 animate-fade-in text-slate-700">
            <div className="flex items-center gap-2 text-emerald-600">
              <Sparkles className="w-4 h-4" />
              <h4 className="font-display font-semibold text-sm">Submit Resolution Proof</h4>
            </div>
            
            <p className="text-xs text-slate-600">
              To officially mark <strong className="text-slate-800">{activeIssue.title}</strong> as resolved, you must provide a completed work proof photograph.
            </p>

            {/* Choose Preloaded Unsplash Proof Photo or upload */}
            <div className="space-y-3">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Select Resolution Image</p>
                <div className="grid grid-cols-2 gap-2">
                  {(MOCK_PROOF_IMAGES[activeIssue.category] || [DEFAULT_PROOF_IMAGE]).map((img, i) => (
                    <div 
                      key={i} 
                      onClick={() => {
                        setSelectedProofUrl(img);
                        setCustomProofUpload("");
                      }}
                      className={`relative rounded-xl overflow-hidden h-[80px] cursor-pointer border-2 transition-all ${
                        selectedProofUrl === img && !customProofUpload
                          ? "border-emerald-500 scale-98 shadow-md" 
                          : "border-transparent opacity-70 hover:opacity-100"
                      }`}
                    >
                      <img src={img} alt={`Proof option ${i}`} className="w-full h-full object-cover" />
                      {selectedProofUrl === img && !customProofUpload && (
                        <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                          <CheckCircle className="w-5 h-5 text-emerald-600 fill-white" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Upload custom file option */}
              <div className="border-t border-slate-100 pt-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Or Upload Custom Proof Image</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCustomProofImageUpload}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[10px] file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 file:cursor-pointer cursor-pointer"
                />
              </div>

              {customProofUpload && (
                <div className="border border-emerald-200 rounded-xl overflow-hidden h-[100px]">
                  <img src={customProofUpload} alt="Custom upload" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end pt-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setShowResolveModal(false);
                  setSelectedProofUrl("");
                  setCustomProofUpload("");
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold px-4 py-2 rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleResolveWork(activeIssue.id)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-1 cursor-pointer shadow-md"
              >
                Publish Fix <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Work Dispatch Manifest Modal */}
      {printManifest && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 p-6 shadow-2xl space-y-4 text-slate-850">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2 text-slate-900">
                <Truck className="w-5 h-5 text-indigo-600" />
                <h4 className="font-display font-bold text-sm">Printable Field Dispatch Manifest - {selectedCrew}</h4>
              </div>
              <button
                onClick={() => setPrintManifest(false)}
                className="text-xs font-bold text-slate-400 hover:text-slate-600 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer"
              >
                Close Window
              </button>
            </div>

            {/* Print Content Container */}
            <div id="manifest-print-area" className="space-y-4 max-h-[450px] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-4 text-xs border-b border-slate-100 pb-3">
                <div>
                  <p className="font-bold text-slate-400 uppercase text-[9px]">Assigned Unit</p>
                  <p className="font-semibold text-slate-800">{selectedCrew}</p>
                </div>
                <div>
                  <p className="font-bold text-slate-400 uppercase text-[9px]">Date of Dispatch</p>
                  <p className="font-semibold text-slate-800">{new Date().toLocaleDateString()}</p>
                </div>
              </div>

              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[9px]">
                    <th className="py-2">Seq</th>
                    <th className="py-2">Issue Title</th>
                    <th className="py-2">Address / Landmark</th>
                    <th className="py-2">Severity</th>
                    <th className="py-2">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {crewIssues.map((issue, idx) => (
                    <tr key={issue.id} className="border-b border-slate-100 text-slate-700">
                      <td className="py-2.5 font-mono font-bold text-indigo-600">{idx + 1}</td>
                      <td className="py-2.5 font-semibold text-slate-900">{issue.title}</td>
                      <td className="py-2.5 text-slate-500 italic">{issue.address}</td>
                      <td className="py-2.5">
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-bold">
                          {issue.severity}
                        </span>
                      </td>
                      <td className="py-2.5 font-semibold font-mono text-slate-800">{issue.priorityScore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="pt-6 space-y-4 text-[11px] leading-relaxed text-slate-500 border-t border-slate-100">
                <p><strong>Crew Instructions:</strong> Check each incident location systematically. Follow standard safety protocols. Capture high-quality photograph confirmation after completion to register resolution proof onto the central ward command console.</p>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                  <div className="border-b border-slate-200 h-10 flex items-end">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Supervisor Signature</span>
                  </div>
                  <div className="border-b border-slate-200 h-10 flex items-end">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Dispatch Officer</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2 text-xs">
              <button
                type="button"
                onClick={() => setPrintManifest(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold px-4 py-2 rounded-xl transition-all cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => {
                  const printContents = document.getElementById("manifest-print-area")?.innerHTML;
                  const originalContents = document.body.innerHTML;
                  if (printContents) {
                    const printWindow = window.open("", "_blank");
                    if (printWindow) {
                      printWindow.document.write(`
                        <html>
                          <head>
                            <title>Dispatch Manifest - ${selectedCrew}</title>
                            <style>
                              body { font-family: sans-serif; padding: 20px; color: #333; }
                              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                              th, td { border-bottom: 1px solid #ddd; padding: 8px; text-align: left; }
                              th { background-color: #f5f5f5; font-size: 11px; }
                              .title { font-size: 18px; font-weight: bold; margin-bottom: 15px; }
                            </style>
                          </head>
                          <body>
                            <div class="title">Ward 5 Field Crew Dispatch Manifest</div>
                            ${printContents}
                          </body>
                        </html>
                      `);
                      printWindow.document.close();
                      printWindow.focus();
                      printWindow.print();
                    }
                  }
                }}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Launch Print Window</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

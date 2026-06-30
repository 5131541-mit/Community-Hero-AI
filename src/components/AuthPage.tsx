import React, { useState } from "react";
import { UserProfile } from "../types";
import { LogIn, UserPlus, Shield, User, Mail, UserCheck, Sparkles } from "lucide-react";

interface AuthPageProps {
  onLoginSuccess: (profile: UserProfile) => void;
}

export default function AuthPage({ onLoginSuccess }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"resident" | "official">("resident");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Email address is required.");
      return;
    }

    if (!isLogin && !name.trim()) {
      setError("Full name is required to register.");
      return;
    }

    // Standard client persistence & verification
    const mockProfile: UserProfile = {
      email: email.trim().toLowerCase(),
      name: isLogin ? (email.toLowerCase().includes("official") || role === "official" ? "Official Administrator" : "Active Resident") : name.trim(),
      role: role,
      points: role === "official" ? 500 : 120,
      level: role === "official" ? 3 : 1,
      badges: role === "official" ? ["badge-inspector"] : ["badge-road"]
    };

    localStorage.setItem("civic_user", JSON.stringify(mockProfile));
    onLoginSuccess(mockProfile);
  };

  const handleDemoLogin = (demoRole: "resident" | "official") => {
    const demoProfile: UserProfile = demoRole === "resident" 
      ? {
          email: "sam@stone.com",
          name: "Samuel Stone",
          role: "resident",
          points: 120,
          level: 1,
          badges: ["badge-road"]
        }
      : {
          email: "official.ward5@ci.gov",
          name: "Commander Henderson",
          role: "official",
          points: 850,
          level: 5,
          badges: ["badge-captain", "badge-inspector"]
        };

    localStorage.setItem("civic_user", JSON.stringify(demoProfile));
    onLoginSuccess(demoProfile);
  };

  return (
    <div id="auth-page-container" className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 md:p-10 font-sans">
      <div id="auth-box" className="w-full max-w-md bg-white rounded-3xl border border-slate-150 shadow-xl overflow-hidden transition-all duration-300">
        
        {/* Decorative Top Accent */}
        <div className="bg-slate-950 p-6 text-center text-white relative">
          <div className="absolute top-4 right-4 bg-teal-500/15 border border-teal-500/20 text-teal-400 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5" /> Civic Portal v1.4
          </div>
          <div className="w-12 h-12 rounded-2xl bg-teal-500 text-slate-950 mx-auto flex items-center justify-center shadow-lg font-black text-xl mb-3">
            CH
          </div>
          <h2 className="font-display font-bold text-lg tracking-tight text-white">Community Hero</h2>
          <p className="text-[11px] text-slate-400 mt-1">Smart Hyperlocal Municipal Service Platform</p>
        </div>

        {/* Auth Mode Toggle Tabs */}
        <div className="flex border-b border-slate-100 font-medium text-xs bg-slate-50/50">
          <button
            type="button"
            onClick={() => { setIsLogin(true); setError(null); }}
            className={`flex-1 py-3 text-center transition-all border-b-2 flex items-center justify-center gap-1.5 ${isLogin ? "border-slate-950 text-slate-950 font-bold" : "border-transparent text-slate-400 hover:text-slate-600"}`}
          >
            <LogIn className="w-3.5 h-3.5" />
            Sign In Account
          </button>
          <button
            type="button"
            onClick={() => { setIsLogin(false); setError(null); }}
            className={`flex-1 py-3 text-center transition-all border-b-2 flex items-center justify-center gap-1.5 ${!isLogin ? "border-slate-950 text-slate-950 font-bold" : "border-transparent text-slate-400 hover:text-slate-600"}`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Register Account
          </button>
        </div>

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 text-[11px] rounded-xl flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-rose-500 rounded-full shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Role selector card picker */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Access Permission Role</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole("resident")}
                className={`p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between h-[84px] ${role === "resident" ? "border-slate-950 bg-slate-950/5 shadow-xs" : "border-slate-200 hover:border-slate-300 bg-white"}`}
              >
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${role === "resident" ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-500"}`}>
                  <User className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-800">Citizen Resident</p>
                  <p className="text-[9px] text-slate-400">Report & validate ward issues</p>
                </div>
                {role === "resident" && <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-teal-500" />}
              </button>

              <button
                type="button"
                onClick={() => setRole("official")}
                className={`p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between h-[84px] ${role === "official" ? "border-slate-950 bg-slate-950/5 shadow-xs" : "border-slate-200 hover:border-slate-300 bg-white"}`}
              >
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${role === "official" ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-500"}`}>
                  <Shield className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-800">Municipal Official</p>
                  <p className="text-[9px] text-slate-400">Update status, routing & admin</p>
                </div>
                {role === "official" && <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-teal-500" />}
              </button>
            </div>
          </div>

          {!isLogin && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Your Full Name</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. Samuel Stone"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 focus:border-slate-950 focus:ring-1 focus:ring-slate-950 rounded-xl text-xs outline-none bg-slate-50 focus:bg-white transition-all"
                  required
                />
                <UserCheck className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Email Address</label>
            <div className="relative">
              <input
                type="email"
                placeholder="e.g. resident@ward5.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 focus:border-slate-950 focus:ring-1 focus:ring-slate-950 rounded-xl text-xs outline-none bg-slate-50 focus:bg-white transition-all"
                required
              />
              <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 focus:border-slate-950 focus:ring-1 focus:ring-slate-950 rounded-xl text-xs outline-none bg-slate-50 focus:bg-white transition-all"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-slate-950 hover:bg-slate-900 text-white font-semibold text-xs py-2.5 rounded-xl transition-colors shadow-md mt-4 cursor-pointer flex items-center justify-center gap-1.5"
          >
            {isLogin ? (
              <>
                <LogIn className="w-3.5 h-3.5" /> Sign In Securely
              </>
            ) : (
              <>
                <UserPlus className="w-3.5 h-3.5" /> Register Profile
              </>
            )}
          </button>
        </form>

        {/* Demo Fast Login Shortcuts */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 space-y-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Fast-Track Demo Accs</p>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => handleDemoLogin("resident")}
              className="p-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-[11px] font-semibold transition-all flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
            >
              <span>👤</span> Resident Demo
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin("official")}
              className="p-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-[11px] font-semibold transition-all flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
            >
              <span>🏢</span> Official Demo
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

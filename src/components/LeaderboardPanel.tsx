import { useState, useEffect } from "react";
import { UserProfile, Badge, Challenge } from "../types";
import { 
  Award, Trophy, CheckCircle, Zap, Shield, Sparkles, 
  ChevronRight, Calendar, User, Flame 
} from "lucide-react";

interface LeaderboardPanelProps {
  userProfile: UserProfile;
  onRefreshProfile?: () => void;
}

const BADGES: Badge[] = [
  {
    id: "badge-road",
    name: "Road Hero",
    description: "Reported or verified a major road hazard/pothole.",
    icon: "🛣️",
    color: "from-amber-400 to-orange-500"
  },
  {
    id: "badge-green",
    name: "Green Citizen",
    description: "Reported or verified a waste cleanup incident.",
    icon: "🗑️",
    color: "from-emerald-400 to-teal-500"
  },
  {
    id: "badge-light",
    name: "Light Keeper",
    description: "Reported or verified a streetlight hazard.",
    icon: "⚡",
    color: "from-yellow-400 to-amber-500"
  },
  {
    id: "badge-captain",
    name: "Ward Captain",
    description: "Earned more than 400 XP points in a single ward.",
    icon: "🎖️",
    color: "from-purple-500 to-indigo-600"
  },
  {
    id: "badge-comment",
    name: "Fixer-Upper",
    description: "Left helpful feedback comments on unresolved issues.",
    icon: "💬",
    color: "from-sky-400 to-blue-500"
  }
];

const INITIAL_CHALLENGES: Challenge[] = [
  {
    id: "ch-report",
    title: "Neighborhood Scout",
    description: "File a new hyperlocal complaint with a geotag.",
    rewardXp: 150,
    target: 1,
    current: 0,
    completed: false,
    category: "Report"
  },
  {
    id: "ch-upvote",
    title: "Citizen Verifier",
    description: "Upvote and verify 2 outstanding issues in your area.",
    rewardXp: 80,
    target: 2,
    current: 0,
    completed: false,
    category: "Upvote"
  },
  {
    id: "ch-comment",
    title: "Local Dialogue",
    description: "Leave a helpful comment feedback on any active report.",
    rewardXp: 60,
    target: 1,
    current: 0,
    completed: false,
    category: "Comment"
  }
];

const MOCK_LEADERBOARD = [
  { rank: 1, name: "Jane Doe", points: 420, level: 4, isMe: false, badge: "🛣️" },
  { rank: 2, name: "Alan Green", points: 310, level: 3, isMe: false, badge: "🗑️" },
  { rank: 3, name: "Samuel Stone", points: 290, level: 3, isMe: false, badge: "💧" },
  { rank: 4, name: "Robert Miller", points: 190, level: 2, isMe: false, badge: "⚡" }
];

export default function LeaderboardPanel({ userProfile }: LeaderboardPanelProps) {
  const [challenges, setChallenges] = useState<Challenge[]>(INITIAL_CHALLENGES);

  // Sync session metrics to challenges
  useEffect(() => {
    // We will dynamically read current user profile metrics and update challenge progression
    const reportCount = userProfile.points >= 150 ? 1 : 0; // reported issue gives 150 XP
    // Simple upvote/comment simulation checks from points increases:
    const upvotesCount = userProfile.points >= 50 ? (userProfile.points >= 100 ? 2 : 1) : 0;
    const commentsCount = userProfile.points % 30 === 0 && userProfile.points > 0 ? 1 : 0;

    setChallenges((prev) => 
      prev.map((ch) => {
        let current = ch.current;
        if (ch.id === "ch-report") current = reportCount;
        if (ch.id === "ch-upvote") current = Math.min(ch.target, upvotesCount);
        if (ch.id === "ch-comment") current = Math.min(ch.target, commentsCount);
        
        return {
          ...ch,
          current,
          completed: current >= ch.target
        };
      })
    );
  }, [userProfile.points]);

  // Filter out any mock leaderboard item that has the same name as the current logged in user
  const filteredMockLeaderboard = MOCK_LEADERBOARD.filter(
    (item) => item.name.toLowerCase() !== (userProfile.name || "").toLowerCase()
  );

  // Combine user with mock leaderboard for live sorting
  const fullLeaderboard = [
    ...filteredMockLeaderboard,
    {
      rank: 5, // placeholder
      name: userProfile.name || "You (Active)",
      points: userProfile.points,
      level: userProfile.level,
      isMe: true,
      badge: userProfile.points >= 400 ? "🎖️" : "🌱"
    }
  ].sort((a, b) => b.points - a.points);

  // Assign correct ranks after sorting
  const rankedLeaderboard = fullLeaderboard.map((item, idx) => ({
    ...item,
    rank: idx + 1
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      
      {/* Column 1: Active Citizen Profile card */}
      <div className="bg-white rounded-2xl border border-slate-150 p-5 shadow-sm flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 p-2 text-white flex items-center justify-center font-bold text-lg shadow-md shrink-0">
              {userProfile.name ? userProfile.name[0].toUpperCase() : "U"}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="font-display font-semibold text-sm text-slate-900">{userProfile.name || "Active Resident"}</h4>
                <span className="bg-teal-50 text-teal-700 border border-teal-100 text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                  Lvl {userProfile.level}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">{userProfile.email}</p>
            </div>
          </div>

          {/* XP Progress Bar */}
          <div className="space-y-1.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-600 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-yellow-500 fill-yellow-400" />
                <span>{userProfile.points} XP Points</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Next Lvl: {(userProfile.level + 1) * 200} XP</span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-teal-500 h-full transition-all duration-500"
                style={{ width: `${Math.min(100, (userProfile.points / ((userProfile.level + 1) * 200)) * 100)}%` }}
              />
            </div>
          </div>

          {/* Citizen Streak */}
          <div className="flex items-center gap-2.5 px-3 py-2 bg-amber-50/40 border border-amber-100/50 rounded-xl text-xs text-amber-800">
            <Flame className="w-4 h-4 text-amber-500 fill-amber-400 shrink-0" />
            <div>
              <span className="font-semibold">3-Day Activity Streak!</span>
              <span className="text-slate-500 text-[10px] block">Keep validating issues daily to maintain a multiplier.</span>
            </div>
          </div>
        </div>

        {/* Dynamic Rewards Card footer */}
        <div className="border-t border-slate-100 pt-4 mt-4 flex items-center justify-between text-xs">
          <span className="text-slate-400">Total Badges:</span>
          <span className="font-bold text-slate-700">{userProfile.badges.length} Unlocked</span>
        </div>
      </div>

      {/* Column 2: Weekly Challenges progression */}
      <div className="bg-white rounded-2xl border border-slate-150 p-5 shadow-sm space-y-3.5">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-display font-semibold text-sm text-slate-900">Weekly Citizen Goals</h4>
            <p className="text-[10px] text-slate-400">Complete quests to score large XP bonuses</p>
          </div>
          <Calendar className="w-4 h-4 text-slate-400" />
        </div>

        <div className="space-y-2.5">
          {challenges.map((ch) => (
            <div 
              key={ch.id} 
              className={`p-3 rounded-xl border transition-all ${
                ch.completed 
                  ? "bg-emerald-50/40 border-emerald-150" 
                  : "bg-slate-50/50 border-slate-150"
              }`}
            >
              <div className="flex items-start justify-between gap-2.5">
                <div className="space-y-1">
                  <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                    ch.completed ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
                  }`}>
                    {ch.completed ? "Goal Met" : ch.category}
                  </span>
                  <p className="font-semibold text-xs text-slate-800 leading-tight">{ch.title}</p>
                  <p className="text-[10px] text-slate-500 leading-normal">{ch.description}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-bold text-teal-600 flex items-center gap-0.5 justify-end">
                    <Zap className="w-3 h-3 text-teal-500" /> +{ch.rewardXp}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {ch.current}/{ch.target}
                  </span>
                </div>
              </div>
              <div className="w-full bg-slate-200 h-1 rounded-full mt-2 overflow-hidden">
                <div 
                  className={`h-full ${ch.completed ? "bg-emerald-500" : "bg-teal-500"}`}
                  style={{ width: `${(ch.current / ch.target) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Column 3: Badges Showcase & Leaderboard */}
      <div className="bg-white rounded-2xl border border-slate-150 p-5 shadow-sm flex flex-col justify-between">
        <div className="space-y-3.5">
          <div className="flex items-center justify-between">
            <h4 className="font-display font-semibold text-sm text-slate-900">Ward 5 Leaderboard</h4>
            <Trophy className="w-4 h-4 text-yellow-500" />
          </div>

          {/* Leaders List */}
          <div className="space-y-2 max-h-[160px] overflow-y-auto">
            {rankedLeaderboard.map((user) => (
              <div 
                key={`${user.name}-${user.isMe ? "me" : "mock"}`} 
                className={`flex items-center justify-between px-3 py-1.5 rounded-xl text-xs transition-all ${
                  user.isMe 
                    ? "bg-teal-500/10 border border-teal-500/20 font-semibold" 
                    : "border border-transparent"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-5 h-5 font-bold rounded-full flex items-center justify-center text-[10px] ${
                    user.rank === 1 ? "bg-amber-100 text-amber-800" : user.rank === 2 ? "bg-slate-100 text-slate-700" : "bg-slate-50 text-slate-400"
                  }`}>
                    {user.rank}
                  </span>
                  <span className="text-slate-400 text-sm">{user.badge}</span>
                  <span className="text-slate-700 truncate max-w-[100px]">{user.name}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 font-mono text-[11px] text-slate-500 font-medium">
                  <span className="text-slate-700 font-bold">{user.points} XP</span>
                  <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">Lvl {user.level}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Badges showcase bar */}
        <div className="border-t border-slate-100 pt-3 mt-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">My Unlocked Badges</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {BADGES.map((b) => {
              const isUnlocked = userProfile.badges.includes(b.id);
              return (
                <div 
                  key={b.id} 
                  className={`relative group shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm border shadow-xs transition-all ${
                    isUnlocked 
                      ? `bg-gradient-to-tr ${b.color} border-white text-white scale-100 cursor-help` 
                      : "bg-slate-100 border-slate-200 text-slate-300 scale-95 opacity-50 select-none"
                  }`}
                >
                  <span>{b.icon}</span>
                  
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center pointer-events-none z-50">
                    <div className="bg-slate-900 text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap leading-tight text-center">
                      <p className="font-bold">{b.name}</p>
                      <p className="opacity-80 text-[9px]">{b.description}</p>
                      <p className={`text-[8px] font-bold mt-1 ${isUnlocked ? "text-teal-400" : "text-slate-400"}`}>
                        {isUnlocked ? "UNLOCKED (+100 XP)" : "LOCKED"}
                      </p>
                    </div>
                    <div className="w-1.5 h-1.5 bg-slate-900 rotate-45 -mt-1"></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
}

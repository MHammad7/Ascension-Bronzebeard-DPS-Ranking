/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Trophy, 
  Users, 
  Activity, 
  ChevronRight, 
  RefreshCw, 
  AlertCircle,
  Filter,
  LayoutGrid,
  List as ListIcon,
  Swords,
  Shield,
  ExternalLink
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// WoW Class Colors
const CLASS_COLORS: Record<string, string> = {
  "Warrior": "#C79C6E",
  "Paladin": "#F58CBA",
  "Hunter": "#ABD473",
  "Rogue": "#FFF569",
  "Priest": "#A3A3A3",
  "Death Knight": "#C41F3B",
  "Shaman": "#0070DE",
  "Mage": "#69CCF0",
  "Warlock": "#9482C9",
  "Monk": "#00FF96",
  "Druid": "#FF7D0A",
  "Demon Hunter": "#A330C9",
  "Classless": "#808080",
};

const DIFFICULTIES = [
  { id: "overall", name: "Overall", color: "text-gray-300", bg: "bg-gray-800", border: "border-gray-600" },
  { id: "ascended", name: "Ascended", color: "text-purple-400", bg: "bg-purple-900/30", border: "border-purple-500/50" },
  { id: "mythic", name: "Mythic", color: "text-red-400", bg: "bg-red-900/30", border: "border-red-500/50" },
  { id: "heroic", name: "Heroic", color: "text-blue-400", bg: "bg-blue-900/30", border: "border-blue-500/50" },
  { id: "normal", name: "Normal", color: "text-green-400", bg: "bg-green-900/30", border: "border-green-500/50" },
];

interface ClassStats {
  className: string;
  avgDps: number;
  playerCount: number;
  maxDps: number;
  minDps: number;
  topPlayer: {
    name: string;
    score: number;
  };
}

const LOCATIONS = [
  { id: "Molten Core", name: "Molten Core" },
  { id: "Onyxia's Lair", name: "Onyxia's Lair" },
];

export default function App() {
  const [difficulty, setDifficulty] = useState("overall");
  const [location, setLocation] = useState("Molten Core");
  const [classStats, setClassStats] = useState<ClassStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fetchRankings = async () => {
    setLoading(true);
    setProgress(10);
    setError(null);
    setIsDemo(false);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // Increased to 60s for sequential scraping

    try {
      setProgress(30);
      const response = await fetch(`/api/rankings?difficulty=${difficulty}&location=${encodeURIComponent(location)}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      setProgress(60);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || `Failed to fetch rankings: ${response.statusText}`);
      }
      
      const data = await response.json();
      setProgress(80);
      
      // Handle potential different data structures from the API
      if (data && data.success && data.source === "LIVE_API") {
        setIsDemo(false);
        setClassStats(data.data);
      } else {
        let entries = [];
        if (Array.isArray(data)) {
          entries = data;
        } else if (data && typeof data === "object") {
          const rawEntries = data.rankings || data.data || data.rows || data;
          entries = Array.isArray(rawEntries) ? rawEntries : Object.values(rawEntries);
        }
        
        if (!Array.isArray(entries) || entries.length === 0) {
          throw new Error("API returned no data");
        }
        
        processEntries(entries);
      }
      setProgress(100);
    } catch (err: any) {
      console.error("Fetch error:", err);
      setError(err.message || "An unexpected error occurred");
      setIsDemo(true);
      
      // Fallback to STABLE mock data
      const mockEntries = generateMockEntries(difficulty);
      processEntries(mockEntries);
    } finally {
      setLoading(false);
      setTimeout(() => setProgress(0), 500);
    }
  };

  const processEntries = (entries: any[]) => {
    const classGroups: Record<string, any[]> = {};
    entries.forEach((entry: any) => {
      const className = entry.class || entry.className || "Unknown";
      if (!classGroups[className]) classGroups[className] = [];
      classGroups[className].push(entry);
    });

    const aggregated: ClassStats[] = Object.entries(classGroups).map(([className, players]) => {
      const dpsValues = players.map(p => p.avg_dps || p.dps || p.amount || 0);
      const totalDps = dpsValues.reduce((sum, val) => sum + val, 0);
      const maxPlayer = players.reduce((prev, curr) => {
        const prevDps = prev.avg_dps || prev.dps || prev.amount || 0;
        const currDps = curr.avg_dps || curr.dps || curr.amount || 0;
        return currDps > prevDps ? curr : prev;
      });
      
      return {
        className,
        avgDps: Math.round(totalDps / players.length),
        playerCount: players.length,
        maxDps: Math.round(Math.max(...dpsValues)),
        minDps: Math.round(Math.min(...dpsValues)),
        topPlayer: {
          name: maxPlayer.name || maxPlayer.characterName || "Unknown",
          score: Math.round(maxPlayer.avg_dps || maxPlayer.dps || maxPlayer.amount || 0)
        }
      };
    });

    aggregated.sort((a, b) => b.avgDps - a.avgDps);
    setClassStats(aggregated);
  };

  useEffect(() => {
    fetchRankings();
  }, [difficulty, location]);

  const [isDemo, setIsDemo] = useState(false);

  const generateMockEntries = (seed: string) => {
    const classes = ["Shaman", "Rogue", "Warlock", "Mage", "Paladin", "Warrior", "Hunter", "Druid", "Priest"];
    const entries: any[] = [];
    // Simple deterministic seed based on difficulty string
    const seedNum = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    classes.forEach((cls, clsIdx) => {
      const count = 80 + (seedNum + clsIdx) % 20;
      for (let i = 0; i < count; i++) {
        entries.push({
          name: `Player_${cls}_${i}`,
          className: cls,
          // Deterministic DPS based on class and difficulty
          dps: 400 + ((seedNum * (clsIdx + 1) + i * 13) % 500),
        });
      }
    });
    return entries;
  };

  return (
    <div className="min-h-screen bg-[#0f1115] text-gray-200 font-sans selection:bg-purple-500/30">
      {/* Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-900/20 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-900/10 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 mix-blend-overlay" />
      </div>

      {/* Progress Bar */}
      {progress > 0 && progress < 100 && (
        <div className="fixed top-0 left-0 w-full h-1 z-[60] bg-gray-800">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]"
          />
        </div>
      )}

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Header Section */}
        <header className="mb-12 text-center md:text-left flex flex-col md:flex-row md:items-end justify-between border-b border-gray-800 pb-8 gap-6">
          <div>
            <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
              <Swords className="w-8 h-8 text-purple-500" />
              <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white uppercase" style={{ fontFamily: "'Outfit', sans-serif" }}>
                Class Rankings
              </h1>
            </div>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-sm font-medium text-gray-400">
              <span className="px-3 py-1 bg-gray-800/80 rounded-md border border-gray-700/50 shadow-sm">
                Project Ascension
              </span>
              <span className="px-3 py-1 bg-amber-900/30 text-amber-400 rounded-md border border-amber-700/30 shadow-sm flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" /> Bronzebeard
              </span>
              <span className="px-3 py-1 bg-red-900/20 text-red-400 rounded-md border border-red-900/30 shadow-sm">
                {location} (Phase 2)
              </span>
            </div>
          </div>
          
          <div className="flex flex-col items-center md:items-end gap-2">
            <a 
              href="https://ascensionlogs.gg" 
              target="_blank" 
              rel="noopener noreferrer"
              className="group flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-purple-400 transition-colors bg-gray-900/50 px-4 py-2 rounded-lg border border-gray-800 hover:border-purple-500/30"
            >
              Data powered by <span className="text-gray-300 group-hover:text-purple-300 font-bold">ascensionlogs.gg</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </header>

        {/* Controls Section */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6 mb-10 bg-gray-900/40 p-4 rounded-2xl border border-gray-800/60 backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            {/* Location Selector */}
            <div className="flex bg-gray-800/50 rounded-xl p-1 border border-gray-700/50">
              {LOCATIONS.map((loc) => (
                <button
                  key={loc.id}
                  onClick={() => setLocation(loc.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${
                    location === loc.id
                      ? "bg-gray-700 text-white shadow-sm"
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  {loc.name}
                </button>
              ))}
            </div>

            {/* Difficulty Selector */}
            <div className="flex flex-wrap justify-center gap-2">
              {DIFFICULTIES.map((diff) => {
                const isActive = difficulty === diff.id;
                return (
                  <button
                    key={diff.id}
                    onClick={() => setDifficulty(diff.id)}
                    className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 border ${
                      isActive 
                        ? `${diff.bg} ${diff.border} ${diff.color} shadow-[0_0_15px_rgba(0,0,0,0.2)] scale-105` 
                        : "bg-gray-800/50 border-transparent text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                    }`}
                  >
                    {diff.name}
                  </button>
                );
              })}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {isDemo && (
              <div className="bg-amber-900/40 border border-amber-500/30 text-amber-300 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                DEMO DATA
              </div>
            )}
            <button 
              onClick={fetchRankings}
              disabled={loading}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(147,51,234,0.3)] hover:shadow-[0_0_20px_rgba(147,51,234,0.5)]"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Success Bar */}
        <AnimatePresence>
          {!loading && classStats.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              className="overflow-hidden"
            >
              <div className={`${isDemo ? 'bg-amber-900/20 border-amber-700/30 text-amber-400' : 'bg-emerald-900/20 border-emerald-700/30 text-emerald-400'} px-4 py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-medium border backdrop-blur-sm`}>
                <span className="text-lg">{isDemo ? '⚠' : '✓'}</span>
                Successfully loaded {classStats.length} class rankings {isDemo ? '(Deterministic Demo Mode)' : ''}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Grid */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
              key="loading"
              className="flex flex-col items-center justify-center py-32 text-gray-400"
            >
              <div className="relative">
                <div className="w-16 h-16 border-4 border-gray-800 rounded-full"></div>
                <div className="w-16 h-16 border-4 border-purple-500 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
              </div>
              <p className="mt-6 font-bold tracking-widest uppercase text-sm text-gray-500">Scraping Logs...</p>
            </motion.div>
          ) : error && classStats.length === 0 ? (
            <motion.div 
              key="error"
              className="bg-gray-900/50 backdrop-blur-md border border-red-900/30 rounded-2xl p-10 text-center max-w-lg mx-auto"
            >
              <AlertCircle className="w-16 h-16 mx-auto mb-6 text-red-500/80" />
              <h3 className="text-2xl font-bold mb-3 text-white">Data Retrieval Failed</h3>
              <p className="text-gray-400 mb-8 leading-relaxed">{error}</p>
              <button onClick={fetchRankings} className="bg-white text-gray-900 hover:bg-gray-200 px-8 py-3 rounded-xl font-bold transition-colors">
                Try Again
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
            >
              {classStats.map((stats, idx) => (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05, type: "spring", stiffness: 300, damping: 24 }}
                  key={stats.className}
                  className="group bg-gray-900/60 backdrop-blur-sm rounded-2xl overflow-hidden relative border border-gray-800 hover:border-gray-700 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)]"
                >
                  {/* Top Accent Line */}
                  <div 
                    className="absolute top-0 left-0 w-full h-1"
                    style={{ backgroundColor: CLASS_COLORS[stats.className] || "#808080" }}
                  />

                  {/* Rank Number Background Watermark */}
                  <div className="absolute -right-4 -top-6 text-[120px] font-black italic opacity-[0.03] pointer-events-none select-none text-white leading-none">
                    {idx + 1}
                  </div>

                  <div className="p-6 relative z-10">
                    {/* Header: Rank & Class */}
                    <div className="flex justify-between items-start mb-8">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-10 rounded-full"
                          style={{ backgroundColor: CLASS_COLORS[stats.className] || "#808080" }}
                        />
                        <div>
                          <h2 className="text-2xl font-bold text-white tracking-tight leading-none mb-1">
                            {stats.className}
                          </h2>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Rank #{idx + 1}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1.5 bg-gray-800/80 px-3 py-1.5 rounded-lg border border-gray-700/50">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-bold text-gray-300">{stats.playerCount}</span>
                      </div>
                    </div>

                    {/* Primary Stat: Avg Points */}
                    <div className="mb-8 bg-gray-950/50 rounded-xl p-4 border border-gray-800/80">
                      <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Average Points</div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-white tracking-tighter" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          {stats.avgDps.toLocaleString()}
                        </span>
                        <span className="text-sm font-medium text-gray-500">pts</span>
                      </div>
                    </div>

                    {/* Secondary Stats Grid */}
                    <div className="grid grid-cols-2 gap-4 mb-8">
                      <div>
                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Max Points</div>
                        <div className="text-lg font-bold text-gray-300" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          {stats.maxDps.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Min Points</div>
                        <div className="text-lg font-bold text-gray-300" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          {stats.minDps.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Top Player Footer */}
                    <div className="pt-4 border-t border-gray-800/80 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-amber-500" />
                        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Top Player</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-white truncate max-w-[120px]" title={stats.topPlayer.name}>
                          {stats.topPlayer.name}
                        </div>
                        <div className="text-xs font-medium" style={{ color: CLASS_COLORS[stats.className] || "#808080" }}>
                          {stats.topPlayer.score.toLocaleString()} pts
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}


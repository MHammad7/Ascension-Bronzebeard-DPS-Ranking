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
  List as ListIcon
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
  { id: "overall", name: "Overall", color: "text-gray-800" },
  { id: "ascended", name: "Ascended", color: "text-purple-400" },
  { id: "mythic", name: "Mythic", color: "text-red-400" },
  { id: "heroic", name: "Heroic", color: "text-blue-400" },
  { id: "normal", name: "Normal", color: "text-green-400" },
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

export default function App() {
  const [difficulty, setDifficulty] = useState("overall");
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
      const response = await fetch(`/api/rankings?difficulty=${difficulty}`, {
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
  }, [difficulty]);

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
    <div className="min-h-screen bg-[#7c3aed] text-[#1e293b] font-sans p-4 md:p-8">
      {/* Progress Bar */}
      {progress > 0 && progress < 100 && (
        <div className="fixed top-0 left-0 w-full h-1 z-[60]">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]"
          />
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        {/* Difficulty Selector */}
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="flex justify-center gap-2">
            {DIFFICULTIES.map((diff) => (
              <button
                key={diff.id}
                onClick={() => setDifficulty(diff.id)}
                className={`px-6 py-2 rounded-full text-sm font-bold transition-all shadow-md ${
                  difficulty === diff.id 
                    ? "bg-white text-[#7c3aed]" 
                    : "bg-[#6d28d9] text-white/80 hover:bg-[#5b21b6]"
                }`}
              >
                {diff.name}
              </button>
            ))}
          </div>
          
          {isDemo && (
            <div className="bg-amber-500/20 border border-amber-500/30 text-amber-200 px-4 py-1 rounded-full text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-3 h-3" />
              SHOWING DEMO DATA (API CONNECTION FAILED)
            </div>
          )}
        </div>

        {/* Success Bar */}
        <AnimatePresence>
          {!loading && classStats.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`${isDemo ? 'bg-amber-100 border-amber-200 text-amber-800' : 'bg-[#dcfce7] border-[#bbf7d0] text-[#166534]'} px-4 py-2 rounded-md mb-6 flex items-center gap-2 text-sm font-medium border`}
            >
              <span className="text-lg">{isDemo ? '⚠' : '✓'}</span>
              Loaded {classStats.length} classes {isDemo ? '(Deterministic Demo Mode)' : ''}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Grid */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
              key="loading"
              className="flex flex-col items-center justify-center py-32 text-white"
            >
              <RefreshCw className="w-12 h-12 animate-spin mb-4" />
              <p className="font-bold tracking-widest uppercase">Fetching Data...</p>
            </motion.div>
          ) : error && classStats.length === 0 ? (
            <motion.div 
              key="error"
              className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 text-center text-white"
            >
              <AlertCircle className="w-12 h-12 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Error Loading Data</h3>
              <p className="opacity-80 mb-6">{error}</p>
              <button onClick={fetchRankings} className="bg-white text-[#7c3aed] px-8 py-2 rounded-lg font-bold">Retry</button>
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
            >
              {classStats.map((stats, idx) => (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  key={stats.className}
                  className="bg-white rounded-xl shadow-lg overflow-hidden relative border-l-[6px]"
                  style={{ borderLeftColor: CLASS_COLORS[stats.className] || "#808080" }}
                >
                  {/* Rank Badge */}
                  <div className="absolute top-3 right-3 w-10 h-10 bg-[#fbbf24] rounded-full flex items-center justify-center font-bold text-lg shadow-sm">
                    #{idx + 1}
                  </div>

                  <div className="p-5">
                    {/* Class Badge */}
                    <div 
                      className="inline-block px-4 py-1 rounded-full text-white text-xs font-bold mb-6 shadow-sm"
                      style={{ backgroundColor: CLASS_COLORS[stats.className] || "#808080" }}
                    >
                      {stats.className}
                    </div>

                    {/* Stats List */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 font-medium">Avg Points</span>
                        <span className="text-[#3b82f6] font-bold text-lg">{stats.avgDps}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 font-medium">Players</span>
                        <span className="text-[#3b82f6] font-bold text-lg">{stats.playerCount}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 font-medium">Max Points</span>
                        <span className="text-[#3b82f6] font-bold text-lg">{stats.maxDps}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 font-medium">Min Points</span>
                        <span className="text-[#3b82f6] font-bold text-lg">{stats.minDps}</span>
                      </div>
                    </div>

                    {/* Top Player */}
                    <div className="mt-8 pt-4 border-t border-gray-100">
                      <p className="text-xs font-bold text-gray-800 truncate">
                        {stats.topPlayer.name}: <span className="text-[#3b82f6]">{stats.topPlayer.score} pts</span>
                      </p>
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


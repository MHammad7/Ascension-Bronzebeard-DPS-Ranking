import express from "express";
import { createServer as createViteServer } from "vite";
import axios from "axios";

const app = express();
const PORT = 3000;

// WoW Class colors for the dashboard
const CLASS_COLORS: Record<string, string> = {
  "Death Knight": "#C41F3B",
  "Druid": "#FF7D0A",
  "Hunter": "#ABD473",
  "Mage": "#69CCF0",
  "Paladin": "#F58CBA",
  "Priest": "#A3A3A3",
  "Rogue": "#FFF569",
  "Shaman": "#0070DE",
  "Warlock": "#9482C9",
  "Warrior": "#C79C6E"
};

const API_BASE_URL = "https://ascensionlogs.gg/api";

async function fetchOverallRankingsForClass(className: string, difficulty: string, phase: string, location: string) {
  const url = `${API_BASE_URL}/encounters/rankings/overall`;
  
  try {
    console.log(`Fetching API rankings for ${className} (${difficulty}), phase ${phase}, location ${location}...`);
    const response = await axios.get(url, {
      params: {
        difficulty,
        phase,
        location,
        class: className,
        page: '1'
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Referer': `https://ascensionlogs.gg/rankings/damage/overall?difficulty=${difficulty}&phase=${phase}&location=${encodeURIComponent(location)}&class=${className}&page=1`,
        'Origin': 'https://ascensionlogs.gg',
      },
      timeout: 30000
    });

    if (response.data && response.data.success && response.data.rankings) {
      const locData = response.data.rankings[location];
      if (locData && locData[difficulty]) {
         return locData[difficulty];
      }
    }
    
    console.warn(`API returned no rankings for ${className} (${difficulty})`);
    return [];
  } catch (error: any) {
    console.error(`API fetch error for ${className}:`, error.message);
    return [];
  }
}

app.get("/api/rankings", async (req, res) => {
  const { difficulty = "overall", phase = "2", location = "Molten Core" } = req.query;

  try {
    const classes = Object.keys(CLASS_COLORS);
    const diffsToFetch = difficulty === "overall" ? ["ascended", "mythic", "heroic", "normal"] : [difficulty as string];
    
    // Fetch all classes in parallel
    const classPromises = classes.map(async (className) => {
      // Fetch all required difficulties for this class
      const diffPromises = diffsToFetch.map(diff => 
        fetchOverallRankingsForClass(className, diff, phase as string, location as string)
      );
      
      const diffResults = await Promise.all(diffPromises);
      // Flatten the array of arrays
      const rawPlayers = diffResults.flat().filter(Boolean);
      
      if (!rawPlayers || rawPlayers.length === 0) {
        return null;
      }

      // Deduplicate players by character_id or name, taking their highest score
      const playerMap = new Map();
      rawPlayers.forEach((p: any) => {
        const id = p.character_id || p.name || p.character_name;
        const pts = p.total_points || 0;
        if (!playerMap.has(id) || playerMap.get(id).total_points < pts) {
          playerMap.set(id, { ...p, total_points: pts });
        }
      });

      const players = Array.from(playerMap.values());

      let totalPoints = 0;
      let maxPoints = 0;
      let minPoints = Infinity;
      let topPlayerName = "";

      players.forEach((p: any) => {
        const pts = p.total_points || 0;
        totalPoints += pts;
        if (pts > maxPoints) {
          maxPoints = pts;
          topPlayerName = p.name || p.character_name;
        }
        if (pts < minPoints) {
          minPoints = pts;
        }
      });

      const avgPoints = totalPoints / players.length;

      return {
        className,
        color: CLASS_COLORS[className],
        avgDps: Math.round(avgPoints), // Using avgDps as the key for frontend compatibility
        playerCount: players.length,
        maxDps: Math.round(maxPoints),
        minDps: minPoints === Infinity ? 0 : Math.round(minPoints),
        topPlayer: {
          name: topPlayerName || "Unknown",
          score: Math.round(maxPoints)
        }
      };
    });

    const classStats = (await Promise.all(classPromises)).filter(Boolean);

    // Sort by avgDps descending
    classStats.sort((a: any, b: any) => b.avgDps - a.avgDps);

    res.json({
      success: true,
      data: classStats,
      source: "LIVE_API",
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error("Dashboard error:", error.message);
    res.status(500).json({ error: "Failed to fetch dashboard data" });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

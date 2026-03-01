import axios from 'axios';

async function debug() {
  const url = 'https://ascensionlogs.gg/api/encounters/rankings/overall';
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Referer': 'https://ascensionlogs.gg/rankings/damage/overall?difficulty=ascended&phase=2&location=Onyxia%27s+Lair&class=Rogue&page=1',
    'Origin': 'https://ascensionlogs.gg',
  };
  
  try {
    const res = await axios.get(url, {
      params: {
        difficulty: 'ascended',
        phase: '2',
        location: "Onyxia's Lair",
        class: 'Rogue',
        page: '1'
      },
      headers
    });
    console.log("Response success:", res.data.success);
    console.log("Keys:", Object.keys(res.data));
    if (res.data.rankings) {
      console.log("Rankings keys:", Object.keys(res.data.rankings));
    }
  } catch (e) {
    console.error("API Error:", e.message);
  }
}

debug();

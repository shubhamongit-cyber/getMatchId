// Standalone 24x7 Live Stream Server
const http = require('http');
const https = require('https');
const os = require('os');

let PORT = parseInt(process.env.PORT, 10) || 3888;

function getLocalIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

function fetchLiveStreams() {
  return new Promise((resolve, reject) => {
    const postData = 'type=inplay&eventTs=-1&selectionTs=-1&marketTs=-1&eventType=-1';
    const req = https.request('https://saapipl.skyexch.biz/exchange/member/playerService/queryEvents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'source': '1',
        'Origin': 'https://www.skyexch.biz',
        'Referer': 'https://www.skyexch.biz/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const streams = (json.events || [])
            .filter(e => e.streamingChannel && e.streamingChannel !== '0' && e.streamingChannel !== 0)
            .map(e => {
              const sport = e.eventType === 4 ? 'Cricket' : e.eventType === 2 ? 'Tennis' : e.eventType === 1 ? 'Soccer' : 'Other';
              const icon = sport === 'Cricket' ? '🏏' : sport === 'Tennis' ? '🎾' : sport === 'Soccer' ? '⚽' : '🏆';
              return {
                matchName: e.name,
                competition: e.competitionName,
                sport: sport,
                icon: icon,
                matchId: String(e.streamingChannel),
                streamUrl: `https://glive.skyexchange.bet/stream?matchId=${e.streamingChannel}`,
                exchangeEventId: e.id
              };
            });
          resolve(streams);
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function getHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>24x7 Live Sports Streams - GLive</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { background-color: #0d1117; color: #c9d1d9; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  </style>
</head>
<body class="min-h-screen p-3 md:p-6 flex flex-col items-center">
  <div class="w-full max-w-4xl space-y-4">
    
    <!-- Header -->
    <header class="bg-[#161b22] border border-[#30363d] rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
      <div class="flex items-center gap-3">
        <span class="relative flex h-3 w-3">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
        </span>
        <div>
          <h1 class="text-lg font-bold text-white tracking-wide">Live Stream Directory (GLive)</h1>
          <p class="text-xs text-gray-400">24x7 Local Server &bull; Auto-refreshing direct stream links</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button id="refreshBtn" onclick="loadStreams()" class="px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition">
          <span id="spinner" class="inline-block">🔄</span> Refresh
        </button>
        <a href="/api/streams" target="_blank" class="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-semibold transition">
          JSON API
        </a>
      </div>
    </header>

    <!-- Filters & Search -->
    <div class="flex flex-col sm:flex-row gap-2 items-center justify-between">
      <div class="flex gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0" id="sportFilters">
        <button onclick="setSport('ALL')" class="sport-btn active px-3 py-1 rounded-lg text-xs font-semibold bg-blue-600 text-white" data-sport="ALL">All (<span id="allCount">0</span>)</button>
        <button onclick="setSport('Cricket')" class="sport-btn px-3 py-1 rounded-lg text-xs font-semibold bg-[#21262d] text-gray-300 hover:text-white" data-sport="Cricket">🏏 Cricket</button>
        <button onclick="setSport('Tennis')" class="sport-btn px-3 py-1 rounded-lg text-xs font-semibold bg-[#21262d] text-gray-300 hover:text-white" data-sport="Tennis">🎾 Tennis</button>
        <button onclick="setSport('Soccer')" class="sport-btn px-3 py-1 rounded-lg text-xs font-semibold bg-[#21262d] text-gray-300 hover:text-white" data-sport="Soccer">⚽ Soccer</button>
      </div>
      <input id="searchInput" type="text" placeholder="Search match name or ID..." oninput="filterMatches()" class="w-full sm:w-64 px-3 py-1.5 bg-[#161b22] border border-[#30363d] rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500">
    </div>

    <!-- Active Embedded Video Player (Optional preview inside page) -->
    <div id="playerSection" class="hidden bg-[#161b22] border border-blue-500/50 rounded-xl p-3 space-y-2 shadow-xl">
      <div class="flex items-center justify-between">
        <span id="playingTitle" class="text-xs font-semibold text-white truncate">Live Stream Preview</span>
        <button onclick="closePlayer()" class="text-xs text-gray-400 hover:text-white px-2 py-0.5 rounded bg-[#21262d]">✕ Close Player</button>
      </div>
      <div class="relative w-full aspect-video rounded-lg overflow-hidden bg-black">
        <iframe id="streamFrame" class="w-full h-full border-0" allow="autoplay; fullscreen" allowfullscreen></iframe>
      </div>
    </div>

    <!-- Matches Grid -->
    <main id="matchesGrid" class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div class="col-span-full py-12 text-center text-gray-400 text-sm">Loading active streams...</div>
    </main>

    <!-- Footer -->
    <footer class="pt-4 text-center text-xs text-gray-500 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-[#21262d]">
      <span>Running locally on your network</span>
      <span id="lastUpdated" class="text-gray-400">Updated: Just now</span>
    </footer>

  </div>

  <script>
    let allStreams = [];
    let currentSport = 'ALL';

    async function loadStreams() {
      const spinner = document.getElementById('spinner');
      spinner.classList.add('animate-spin');

      try {
        const res = await fetch('/api/streams');
        const data = await res.json();
        allStreams = data.streams || [];
        document.getElementById('allCount').innerText = allStreams.length;
        document.getElementById('lastUpdated').innerText = 'Updated: ' + new Date().toLocaleTimeString();
        filterMatches();
      } catch (err) {
        document.getElementById('matchesGrid').innerHTML = '<div class="col-span-full py-8 text-center text-red-400 text-xs">Failed to load live streams. Click refresh to retry.</div>';
      } finally {
        spinner.classList.remove('animate-spin');
      }
    }

    function setSport(sport) {
      currentSport = sport;
      document.querySelectorAll('.sport-btn').forEach(b => {
        if (b.dataset.sport === sport) {
          b.className = 'sport-btn px-3 py-1 rounded-lg text-xs font-semibold bg-blue-600 text-white';
        } else {
          b.className = 'sport-btn px-3 py-1 rounded-lg text-xs font-semibold bg-[#21262d] text-gray-300 hover:text-white';
        }
      });
      filterMatches();
    }

    function filterMatches() {
      const query = document.getElementById('searchInput').value.toLowerCase().trim();
      const filtered = allStreams.filter(m => {
        const matchesSport = (currentSport === 'ALL' || m.sport === currentSport);
        const matchesQuery = !query || m.matchName.toLowerCase().includes(query) || m.matchId.includes(query) || m.competition.toLowerCase().includes(query);
        return matchesSport && matchesQuery;
      });

      render(filtered);
    }

    function render(list) {
      const container = document.getElementById('matchesGrid');
      if (list.length === 0) {
        container.innerHTML = '<div class="col-span-full py-12 text-center text-gray-500 text-sm">No active live streams matching criteria.</div>';
        return;
      }

      container.innerHTML = list.map(m => \`
        <div class="bg-[#161b22] border border-[#30363d] hover:border-gray-600 rounded-xl p-3.5 flex flex-col justify-between gap-3 shadow transition">
          <div>
            <div class="flex items-center justify-between text-xs text-gray-400 mb-1.5">
              <span class="font-medium">\${m.icon} \${m.sport} &bull; \${m.competition}</span>
              <span class="font-mono px-2 py-0.5 rounded bg-[#21262d] text-gray-300 text-[11px]">ID: \${m.matchId}</span>
            </div>
            <h2 class="text-sm font-semibold text-white leading-snug">\${m.matchName}</h2>
          </div>
          <div class="flex items-center gap-1.5 pt-2 border-t border-[#21262d]">
            <a href="\${m.streamUrl}" target="_blank" rel="noopener noreferrer" class="flex-1 py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold text-center transition flex items-center justify-center gap-1">
              <span>▶ Open Stream</span>
            </a>
            <button onclick="playInline('\${m.streamUrl}', '\${m.matchName.replace(/'/g, "\\\\'")}')" class="py-1.5 px-2.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-blue-400 text-xs font-semibold transition" title="Preview inside this page">
              📺 Preview
            </button>
            <button onclick="copyUrl('\${m.streamUrl}', this)" class="py-1.5 px-2.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-gray-300 hover:text-white text-xs font-semibold transition" title="Copy stream URL">
              Copy
            </button>
          </div>
        </div>
      \`).join('');
    }

    function playInline(url, title) {
      const section = document.getElementById('playerSection');
      const frame = document.getElementById('streamFrame');
      const titleEl = document.getElementById('playingTitle');
      titleEl.innerText = 'Now Playing: ' + title;
      frame.src = url;
      section.classList.remove('hidden');
      section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function closePlayer() {
      const section = document.getElementById('playerSection');
      const frame = document.getElementById('streamFrame');
      frame.src = '';
      section.classList.add('hidden');
    }

    function copyUrl(url, btn) {
      navigator.clipboard.writeText(url).then(() => {
        const orig = btn.innerText;
        btn.innerText = 'Copied!';
        btn.classList.add('text-green-400');
        setTimeout(() => {
          btn.innerText = orig;
          btn.classList.remove('text-green-400');
        }, 1500);
      });
    }

    loadStreams();
    setInterval(loadStreams, 30000);
  </script>
</body>
</html>`;
}

function startServer(portToTry) {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // JSON API Endpoint: /api/streams
    if (url.pathname === '/api/streams' || url.searchParams.get('json') === 'true') {
      try {
        const streams = await fetchLiveStreams();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          count: streams.length,
          updatedAt: new Date().toISOString(),
          streams: streams
        }, null, 2));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
      return;
    }

    // HTML Dashboard
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(getHtml());
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${portToTry} in use, trying ${portToTry + 1}...`);
      startServer(portToTry + 1);
    } else {
      console.error('Server error:', err);
    }
  });

  server.listen(portToTry, '0.0.0.0', () => {
    const localIp = getLocalIp();
    console.log(`====================================================`);
    console.log(`🚀 Live Stream Server is running 24x7!`);
    console.log(`👉 Local URL:        http://localhost:${portToTry}`);
    console.log(`👉 Wi-Fi/Mobile URL: http://${localIp}:${portToTry}`);
    console.log(`👉 JSON API Feed:    http://localhost:${portToTry}/api/streams`);
    console.log(`====================================================`);
  });
}

startServer(PORT);

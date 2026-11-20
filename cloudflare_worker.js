// Cloudflare Worker / Serverless Script for 24x7 Live Streaming Dashboard
// Deployable to Cloudflare Workers (100% free forever) or Vercel Edge

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // API Endpoint: /api/streams or ?json=true
    if (url.pathname === '/api/streams' || url.searchParams.get('json') === 'true') {
      try {
        const streams = await fetchLiveStreams();
        return new Response(JSON.stringify({
          success: true,
          count: streams.length,
          updatedAt: new Date().toISOString(),
          streams: streams
        }, null, 2), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      } catch (err) {
        return new Response(JSON.stringify({ success: false, error: err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }

    // Web Dashboard (HTML)
    return new Response(renderHTML(), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
};

async function fetchLiveStreams() {
  const postData = 'type=inplay&eventTs=-1&selectionTs=-1&marketTs=-1&eventType=-1';
  const response = await fetch('https://saapipl.skyexch.biz/exchange/member/playerService/queryEvents', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'source': '1',
      'Origin': 'https://www.skyexch.biz',
      'Referer': 'https://www.skyexch.biz/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },
    body: postData
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch events: ${response.status}`);
  }

  const json = await response.json();
  const events = json.events || [];

  return events
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
}

function renderHTML() {
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
    
    <!-- Top Header Card -->
    <header class="bg-[#161b22] border border-[#30363d] rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
      <div class="flex items-center gap-3">
        <span class="relative flex h-3 w-3">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
        </span>
        <div>
          <h1 class="text-lg font-bold text-white tracking-wide">Live Stream Directory (GLive)</h1>
          <p class="text-xs text-gray-400">Auto-updating 24x7 with direct stream URLs</p>
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

    <!-- Matches Grid -->
    <main id="matchesGrid" class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div class="col-span-full py-12 text-center text-gray-400 text-sm">Loading active streams...</div>
    </main>

    <!-- Footer -->
    <footer class="pt-4 text-center text-xs text-gray-500">
      Auto-refreshes every 30 seconds &bull; Publicly sharable
    </footer>

  </div>

  <script>
    let allStreams = [];
    let currentSport = 'ALL';

    async function loadStreams() {
      const btn = document.getElementById('refreshBtn');
      const spinner = document.getElementById('spinner');
      spinner.classList.add('animate-spin');

      try {
        const res = await fetch('/api/streams');
        const data = await res.json();
        allStreams = data.streams || [];
        document.getElementById('allCount').innerText = allStreams.length;
        filterMatches();
      } catch (err) {
        document.getElementById('matchesGrid').innerHTML = '<div class=\"col-span-full py-8 text-center text-red-400 text-xs\">Failed to load live streams. Click refresh to retry.</div>';
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
        container.innerHTML = '<div class=\"col-span-full py-12 text-center text-gray-500 text-sm\">No active live streams matching criteria.</div>';
        return;
      }

      container.innerHTML = list.map(m => \`
        <div class=\"bg-[#161b22] border border-[#30363d] hover:border-gray-600 rounded-xl p-3.5 flex flex-col justify-between gap-3 shadow transition\">
          <div>
            <div class=\"flex items-center justify-between text-xs text-gray-400 mb-1.5\">
              <span class=\"font-medium\">\${m.icon} \${m.sport} &bull; \${m.competition}</span>
              <span class=\"font-mono px-2 py-0.5 rounded bg-[#21262d] text-gray-300 text-[11px]\">ID: \${m.matchId}</span>
            </div>
            <h2 class=\"text-sm font-semibold text-white leading-snug\">\${m.matchName}</h2>
          </div>
          <div class=\"flex items-center gap-2 pt-2 border-t border-[#21262d]\">
            <a href=\"\${m.streamUrl}\" target=\"_blank\" rel=\"noopener noreferrer\" class=\"flex-1 py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold text-center transition flex items-center justify-center gap-1.5\">
              <span>▶ Watch Stream</span>
            </a>
            <button onclick=\"copyUrl('\${m.streamUrl}', this)\" class=\"py-1.5 px-3 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-gray-300 hover:text-white text-xs font-semibold transition\">
              Copy
            </button>
          </div>
        </div>
      \`).join('');
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

    // Initial load
    loadStreams();

    // Auto-refresh every 30 seconds
    setInterval(loadStreams, 30000);
  </script>
</body>
</html>`;
}


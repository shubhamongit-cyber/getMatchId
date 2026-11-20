// Script to fetch current live streams and save to streams.json
const https = require('https');
const fs = require('fs');
const path = require('path');

function fetchStreams() {
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

(async () => {
  try {
    const streams = await fetchStreams();
    const payload = {
      success: true,
      count: streams.length,
      updatedAt: new Date().toISOString(),
      streams: streams
    };
    fs.writeFileSync(path.join(__dirname, 'streams.json'), JSON.stringify(payload, null, 2));
    console.log(`Saved ${streams.length} live streams to streams.json successfully at ${payload.updatedAt}`);
  } catch (err) {
    console.error('Failed to update streams:', err);
    process.exit(1);
  }
})();


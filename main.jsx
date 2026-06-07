import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const SHEET_ID = '1ih9-i3Bfd_N-gD1vBY88bu5c0lGaXT-c80ppXrU95Tw';
const CURRENT_YEAR_SHEET = '2026 Standings';

const HISTORY_SHEETS = [
  '2021 Standings',
  '2022 Standings',
  '2023 Standings',
  '2024 Standings',
  '2025 Standings'
];
const HOSTESS_SRC = '/44B7C86E-3315-4324-A8D9-B70002267AB4.png';

const fallbackData = {
  lastUpdated: 'Backup data',
  standings: [
    { rank: 1, name: 'Frank Rush', points: 2.1 },
    { rank: 2, name: 'Tim Perlick', points: 0.5 },
    { rank: 3, name: 'John Leitch', points: 0.3 },
    { rank: 3, name: 'Max Olson', points: 0.3 },
    { rank: 3, name: 'Nic Wendel', points: 0.3 }
  ],
  sidePots: { sandy: 268, eagle: 151, holeInOne: 268 },
  events: [
    { event: 1, course: 'Kelly Plantation', date: '4/2/26', time: '7:09 AM', tees: 'Plantation' },
    { event: 2, course: 'Edinburgh', date: '4/29/26', time: '4:27 & 4:36', tees: '' },
    { event: 3, course: 'Links at Northfork', date: '5/16/26', time: '6:58 AM', tees: 'Black' }
  ],
  redRounds: [
    { place: 1, player: 'Alex Pletsch', course: 'Eagle Valley', date: '6/3/21', score: '4 Thru 18', net: -10.3 },
    { place: 2, player: 'Max Olson', course: 'Royal', date: '9/3/23', score: '5 Thru 18', net: -7.8 },
    { place: 3, player: 'Nic Wendel', course: 'Dwan', date: '8/30/25', score: '21 Thru 18', net: -7.4 }
  ]
};

function csvUrl(sheetName) {
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}&cacheBust=${Date.now()}`;
}

function parseCSV(text) {
  const rows = [];
  let row = [];
  let value = '';
  let insideQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && insideQuotes && next === '"') {
      value += '"'; i++;
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === ',' && !insideQuotes) {
      row.push(value); value = '';
    } else if ((char === '\n' || char === '\r') && !insideQuotes) {
      if (value !== '' || row.length) { row.push(value); rows.push(row); }
      row = []; value = '';
      if (char === '\r' && next === '\n') i++;
    } else {
      value += char;
    }
  }
  if (value !== '' || row.length) { row.push(value); rows.push(row); }
  return rows;
}

function numberFromCell(value) {
  if (value === undefined || value === null) return 0;
  const n = Number(String(value).replace(/[$,]/g, '').trim());
  return Number.isFinite(n) ? n : 0;
}

function cleanName(value) {
  const name = String(value || '').replace(/\s{2,}.+$/g, '').replace(/\s+202\d.*$/g, '').trim();
  const aliases = {
    'Tim P.': 'Tim Perlick', 'Tim P': 'Tim Perlick',
    'Max': 'Max Olson', 'MAX': 'Max Olson',
    'Frank': 'Frank Rush', 'Nic': 'Nic Wendel',
    'Chris D': 'Chris Dingmann', 'Klappy': 'Grant Kleven'
  };
  return aliases[name] || name;
}

function findPot(sheet, label) {
  const target = label.toLowerCase();
  const row = sheet.find(r => r.some(cell => String(cell || '').toLowerCase().trim() === target));
  if (!row) return 0;
  const values = row.map(cell => numberFromCell(cell)).filter(value => value > 0);
  return values.length ? values[values.length - 1] : 0;
}

function parseLooseDate(value) {
  if (!value) return null;

  const raw = String(value).trim();

  const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);

  if (match) {
    let year = Number(match[3]);
    if (year < 100) year += 2000;

    return new Date(year, Number(match[1]) - 1, Number(match[2]));
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function decorateEvents(events) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return events.map(event => {
    const parsed = parseLooseDate(event.date);
    const isPast = parsed ? parsed < today : false;
    const daysAway = parsed ? Math.ceil((parsed.getTime() - today.getTime()) / 86400000) : null;
    return { ...event, status: isPast ? 'Past' : 'Upcoming', timestamp: parsed ? parsed.getTime() : Number.MAX_SAFE_INTEGER, daysAway };
  });
}

async function loadLiveData() {
  const [standingsText, redRoundsText, ...historyTexts] = await Promise.all([
  fetch(csvUrl(CURRENT_YEAR_SHEET)).then(r => {
    if (!r.ok) throw new Error('Unable to load standings');
    return r.text();
  }),
  fetch(csvUrl('Red Rounds')).then(r => {
    if (!r.ok) throw new Error('Unable to load Red Rounds');
    return r.text();
  }),
  ...HISTORY_SHEETS.map(sheet =>
    fetch(csvUrl(sheet)).then(r => (r.ok ? r.text() : ''))
  )
]);

  const sheet = parseCSV(standingsText);
  const redSheet = parseCSV(redRoundsText);

  const standings = [];
  for (let rowIndex = 6; rowIndex < 66; rowIndex += 3) {
    const name = cleanName(sheet[rowIndex]?.[0]);
    if (!name) continue;
    const points = numberFromCell(sheet[rowIndex + 2]?.[26]);
    const rank = numberFromCell(sheet[rowIndex + 2]?.[27]);
    if (!rank && !points) continue;
    standings.push({ rank: rank || 999, name, points: Math.round(points * 100) / 100 });
  }
  standings.sort((a, b) => a.rank - b.rank || b.points - a.points || a.name.localeCompare(b.name));

  const sidePots = {
    sandy: findPot(sheet, 'Sandy'),
    eagle: findPot(sheet, 'Eagle'),
    holeInOne: findPot(sheet, 'Hole in One')
  };

  const events = [];
  for (let col = 4; col <= 20; col++) {
    const eventNo = sheet[1]?.[col];
const date = sheet[2]?.[col];
const course = sheet[3]?.[col];
const tees = sheet[4]?.[col];
const time = sheet[5]?.[col];

if (!eventNo && !date && !course) continue;

events.push({
  event: eventNo || events.length + 1,
  date: date || '',
  course: course || 'Course TBD',
  tees: tees || '',
  time: time || ''
});

  const redRounds = [];
  for (let i = 1; i < redSheet.length; i++) {
    const row = redSheet[i];
    if (!row?.[1]) continue;
    redRounds.push({ place: row[0] || i, player: cleanName(row[1]), course: row[2] || '', date: row[3] || '', tees: row[4] || '', score: row[5] || '', net: row[6] || '' });
  }
const historyMoments = [];

historyTexts.forEach((text, sheetIndex) => {
  if (!text) return;

  const year = HISTORY_SHEETS[sheetIndex].replace(' Standings', '');
  const historySheet = parseCSV(text);

  for (let col = 4; col <= 20; col++) {
   const eventNo = historySheet[1]?.[col];
const date = historySheet[2]?.[col];
const course = historySheet[3]?.[col];
const tees = historySheet[4]?.[col];
const time = historySheet[5]?.[col];
    if (!date || !course) continue;

    const parsed = parseLooseDate(date);
    if (!parsed) continue;

    const monthDay = parsed.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric'
    });

    historyMoments.push({
      date: monthDay,
      year,
      type: '🏌️ Tour Stop',
      title: `DGL played ${course}`,
      body: `Event ${eventNo || ''}${tees ? ` • ${tees} tees` : ''}${time ? ` • ${time}` : ''}`.trim()
    });
  }
});
  return {
    lastUpdated: new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
    standings, sidePots, events: decorateEvents(events), redRounds: redRounds.slice(0, 50),
historyMoments
  };
}

function money(value) { return '$' + Number(value || 0).toLocaleString(); }
function medal(rank) { if (rank === 1) return '🥇'; if (rank === 2) return '🥈'; if (rank === 3) return '🥉'; return '#' + rank; }
function initials(name = '') { return name.split(' ').filter(Boolean).map(part => part[0]).slice(0, 2).join('').toUpperCase(); }
function netNumber(round) {
  const n = Number(String(round.net || '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function formatNet(value) {
  const n = typeof value === 'number' ? value : Number(String(value || '').replace(/[^\d.-]/g, ''));
  if (!Number.isFinite(n)) return value || '';
  return Number(n.toFixed(3)).toString();
}

function tierForNet(net) {
  if (net <= -6) return 'Elite Table';
  if (net <= -4) return 'Excellence Lounge';
  return 'Members Gallery';
}

function tierForRound(round) {
  return tierForNet(netNumber(round));
}

function ordinal(n) {
  const number = Number(n);
  if (!Number.isFinite(number)) return n;
  const v = number % 100;
  if (v >= 11 && v <= 13) return `${number}th`;
  switch (number % 10) {
    case 1: return `${number}st`;
    case 2: return `${number}nd`;
    case 3: return `${number}rd`;
    default: return `${number}th`;
  }
}

function rankedRedRounds(rounds) {
  const sorted = rounds
    .map((round, originalIndex) => ({ ...round, originalIndex, netValue: netNumber(round) }))
    .sort((a, b) => a.netValue - b.netValue || a.originalIndex - b.originalIndex);

  let previousNet = null;
  let previousRank = 0;

  return sorted.map((round, index) => {
    const rank = previousNet !== null && Math.abs(round.netValue - previousNet) < 0.0005
      ? previousRank
      : index + 1;

    previousNet = round.netValue;
    previousRank = rank;

    return {
      ...round,
      displayRank: rank,
      displayRankLabel: rank === index + 1 ? `#${ordinal(rank)}` : `T-#${ordinal(rank)}`,
      displayNet: formatNet(round.netValue),
      tier: tierForNet(round.netValue)
    };
  });
}

function EventCard({ event }) {
  const countdown = event.status === 'Upcoming' && typeof event.daysAway === 'number'
    ? event.daysAway === 0 ? 'Today' : `${event.daysAway} days away`
    : 'Result logged';
  return (
    <div className={'event ' + (event.status === 'Past' ? 'event-past' : 'event-upcoming')}>
      <span>{event.status === 'Past' ? 'Recent Result' : 'Upcoming'} • Event {event.event}</span>
      <strong>{event.course}</strong>
      <small>{event.date}{event.time ? ' • ' + event.time : ''}{event.tees ? ' • ' + event.tees : ''}</small>
      <em>{countdown}</em>
    </div>
  );
}
function ThisDayInDGLHistory({ moments = [] }) {
  

  const today = new Date();
  const monthDay = today.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric'
  });

  const matches = moments.filter(moment => moment.date === monthDay);
  const moment = matches[0] || {
  date: monthDay,
  year: 'DGL Archives',
  type: '📜 Annals of History',
  title: 'No official moment recorded for today yet',
  body: `Debug: ${moments.length} history moments loaded. Looking for ${monthDay}.`

  return (
    <article className="card history-card">
      <p className="eyebrow">📜 This Day in DGL History</p>
      <h2>{moment.date}</h2>
      <span className="history-year">{moment.year}</span>
      <strong>{moment.type}</strong>
      <h3>{moment.title}</h3>
      <p>{moment.body}</p>
      <button className="gold-button">ENTER THE ANNALS</button>
    </article>
  );
}
function HomePage({ data, syncStatus, goRedRoom }) {
  const top10 = data.standings.slice(0, 10);
  const leader = data.standings[0] || {};
  const second = top10[1] || {};
  const featuredRedRound = rankedRedRounds(data.redRounds)[0] || {};
  const upcomingEvents = data.events.filter(event => event.status !== 'Past').slice(0, 2);
  const pastEvents = data.events.filter(event => event.status === 'Past').slice().reverse().slice(0, 6);
  const featuredEvent = upcomingEvents[0] || data.events[data.events.length - 1] || {};
  const leaderMargin = leader.points != null && second.points != null ? Math.round((leader.points - second.points) * 100) / 100 : 0;

  return (
    <>
      <section className="hero">
        <div className="hero-glow"></div>
        <div className="hero-shell">
          <img src="/dgl-logo.jpeg" alt="DGL Tour Logo" className="logo" />
          <div className="badge">EST. 2021 • OFFICIAL HOME • BETA</div>
          <h1>DGL TOUR</h1>
          <p className="tagline">Where legends are made and Red Rounds live forever.</p>
        </div>
        <div className="hero-stats">
          <div className="hero-stat leader"><span>Current Leader</span><strong>{leader.name}</strong><em>{leader.points} pts • +{leaderMargin} lead</em></div>
          <div className="hero-stat"><span>Next Event</span><strong>{featuredEvent.course || 'Schedule TBD'}</strong><em>{featuredEvent.date || 'Coming soon'}</em></div>
          <div className="hero-stat"><span>Featured Red Round</span><strong>{featuredRedRound.player || 'Red Room'}</strong><em>{featuredRedRound.displayNet ? 'Net ' + featuredRedRound.displayNet : 'VIP only'}</em></div>
        </div>
      </section>

 <section className="ticker">
  <div className="ticker-track">
    <span><strong>{syncStatus}</strong></span>
    <span>Last updated: {data.lastUpdated}</span>
    <span>Scott Wishart claimed the 2025 Eagle Pot at Dutch 27 — Hole #5, 520-yard Par 5. Paid $117.50.</span>
    <span>Red Room is live.</span>
    <span>Standings update automatically from Google Sheets.</span>
  </div>
</section>

      <section className="grid">
        <article className="card wide standings-card" id="standings">
          <div className="section-head"><div><p className="eyebrow">Live Board</p><h2>2026 Standings</h2></div><span className="updated">{syncStatus}</span></div>
          <div className="podium pro-podium">
            {top10.slice(0, 3).map(player => (
              <div className={'podium-card rank-' + player.rank} key={player.name}><div className="avatar">{initials(player.name)}</div><span>{medal(player.rank)}</span><strong>{player.name}</strong><em>{player.points} pts</em></div>
            ))}
          </div>
          <div className="table">
            {top10.map(player => (
              <div className={'row ' + (player.rank <= 3 ? 'top-row' : '')} key={player.name}><strong>{medal(player.rank)}</strong><span>{player.name}</span><em>{player.points} pts</em></div>
            ))}
          </div>
        </article>

        <article className="card sidepots-card">
          <p className="eyebrow">Jackpot Watch</p><h2>Current Side Pots</h2>
          <div className="pots">
            <div className="pot"><span>🦅</span><small>Eagle Pot</small><strong>{money(data.sidePots.eagle)}</strong></div>
            <div className="pot"><span>🎯</span><small>Hole-in-One</small><strong>{money(data.sidePots.holeInOne)}</strong></div>
            <div className="pot"><span>🏖️</span><small>Sandy Pot</small><strong>{money(data.sidePots.sandy)}</strong></div>
          </div>
          <p className="note">Eagle Pot Last Hit<br/>Scott Wishart<br/>Dutch 27 (Red 9)<br/>Hole #5 • 520-yard Par 5<br/>9/26/25 • Paid $117.50</p>
        </article>
<ThisDayInDGLHistory moments={data.historyMoments} />
        <article className="card red-room-entry-card">
          <p className="eyebrow">Members May View. Legends Had To Earn It.</p>
          <h2>🔴 Red Room Entrance</h2>
          <p>The greatest net rounds in DGL history.</p>
          <p className="note">Entry is earned. History is forever.</p>
          <button onClick={goRedRoom} className="gold-button">ENTER THE RED ROOM</button>
        </article>

      <article className="card events-card" id="events">
  <p className="eyebrow">Tour Calendar</p>
  <h2>Event Schedule</h2>

  <h3>Upcoming</h3>

  <div className="event-list">
    {upcomingEvents.length ? upcomingEvents.map(event => (
      <EventCard event={event} key={'upcoming-' + event.event + event.course} />
    )) : (
      <p className="note">No future events currently entered.</p>
    )}
  </div>

  <p className="note event-note">
    Recent results will be added once winner and low-net fields are added to the Google Sheet.
  </p>
</article>

        <article className="card" id="sportsbook"><p className="eyebrow">For Entertainment Purposes</p><h2>Sportsbook</h2><p><strong>Championship favorite:</strong> {leader.name}</p><p className="note">Futures, matchups and DGL odds model coming next.</p></article>
        <article className="card"><p className="eyebrow">Coming Soon</p><h2>State Trophies</h2><p>Minnesota, Wisconsin and out-of-state trophy history will live here.</p></article>
      </section>
    </>
  );
}

function RedRoomPage({ data, goHome }) {
  const rankedRounds = rankedRedRounds(data.redRounds);
  const featuredRedRound = rankedRounds[0] || {};
  const elite = rankedRounds.filter(round => round.netValue <= -6);
  const excellence = rankedRounds.filter(round => round.netValue <= -4 && round.netValue > -6);
  const gallery = rankedRounds;

  let lastTier = '';

  return (
    <section className="red-room-page">
      <div className="red-page-bg"></div>
      <div className="red-page-vignette"></div>
      <button onClick={goHome} className="back-button">← Back to Home</button>

      <div className="red-page-hero">
        <div className="red-page-copy">
          <p className="eyebrow">Private Club • Public Record</p>
          <h1>Welcome to <span>The Red Room</span></h1>
          <p>The legends. The rounds. The history.</p>
          <p className="red-subline">Reserved for DGL's finest net performances.</p>
        </div>
        <img src={HOSTESS_SRC} alt="Red Room Hostess" className="red-page-hostess" onError={(event) => { event.currentTarget.style.display = 'none'; }} />
      </div>

      <div className="red-page-layout">
        <article className="royalty-card"><p className="eyebrow">👑 Red Room Royalty</p><h2>{featuredRedRound.player}</h2><strong>Net {featuredRedRound.displayNet}</strong><span>{featuredRedRound.course}</span><small>{featuredRedRound.date} • {featuredRedRound.score}</small></article>
        <article className="tier-card">
          <p className="eyebrow">Red Room Tiers</p>
          <div className="tier-row"><strong>🔴 Elite Table</strong><span>Net -6.0 or better</span><em>{elite.length}</em></div>
          <div className="tier-row"><strong>🥃 Excellence Lounge</strong><span>Net -4.0 to -5.99</span><em>{excellence.length}</em></div>
          <div className="tier-row"><strong>📖 Members Gallery</strong><span>Every Red Round ever recorded</span><em>{gallery.length}</em></div>
        </article>
        <article className="red-full-table">
          <div className="panel-head"><div><p className="eyebrow">All-Time Red Rounds</p><strong>Live Hall of Fame</strong></div><span>{rankedRounds.length} entries</span></div>
          <div className="red-table-full">
            {rankedRounds.map((round, index) => {
              const showDivider = round.tier !== lastTier;
              lastTier = round.tier;
              return (
                <React.Fragment key={round.player + round.course + round.date + index}>
                  {showDivider && <div className="tier-divider">{round.tier}</div>}
                  <div className="red-row-full">
                    <span>{round.displayRankLabel}</span>
                    <strong>{round.player}</strong>
                    <small>{round.course}</small>
                    <small>{round.date}</small>
                    <em>{round.displayNet}</em>
                    <b>{round.tier}</b>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </article>
      </div>
    </section>
  );
}

function App() {
  const [data, setData] = useState(fallbackData);
  const [syncStatus, setSyncStatus] = useState('Loading live Google Sheet…');
  const [page, setPage] = useState(window.location.hash === '#red-room' ? 'red-room' : 'home');

  useEffect(() => {
    const onHash = () => setPage(window.location.hash === '#red-room' ? 'red-room' : 'home');
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    loadLiveData().then(liveData => {
      setData(liveData);
      setSyncStatus('Live from Google Sheets');
    }).catch(error => {
      console.error(error);
      setSyncStatus('Using backup data');
    });
  }, []);

  const goRedRoom = () => { window.location.hash = 'red-room'; setPage('red-room'); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const goHome = () => { window.location.hash = ''; setPage('home'); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  return (
    <main className="page">
      {page === 'home' && (
        <>
          <nav className="nav"><span>DGL TOUR</span><div><a href="#standings">Standings</a><a href="#events">Events</a><button onClick={goRedRoom}>Red Room</button><a href="#sportsbook">Sportsbook</a></div></nav>
          <HomePage data={data} syncStatus={syncStatus} goRedRoom={goRedRoom} />
        </>
      )}
      {page === 'red-room' && <RedRoomPage data={data} goHome={goHome} />}
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);

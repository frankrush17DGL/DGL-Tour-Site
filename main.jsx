import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const SHEET_ID = '1ih9-i3Bfd_N-gD1vBY88bu5c0lGaXT-c80ppXrU95Tw';
const CURRENT_YEAR_SHEET = '2026 Standings';
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
    if (char === '"' && insideQuotes && next === '"') { value += '"'; i++; }
    else if (char === '"') insideQuotes = !insideQuotes;
    else if (char === ',' && !insideQuotes) { row.push(value); value = ''; }
    else if ((char === '\n' || char === '\r') && !insideQuotes) {
      if (value !== '' || row.length) { row.push(value); rows.push(row); }
      row = []; value = '';
      if (char === '\r' && next === '\n') i++;
    } else value += char;
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
    let y = Number(match[3]);
    if (y < 100) y += 2000;
    return new Date(y, Number(match[1]) - 1, Number(match[2]));
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
  const [standingsText, redRoundsText] = await Promise.all([
    fetch(csvUrl(CURRENT_YEAR_SHEET)).then(r => { if (!r.ok) throw new Error('Unable to load standings'); return r.text(); }),
    fetch(csvUrl('Red Rounds')).then(r => { if (!r.ok) throw new Error('Unable to load Red Rounds'); return r.text(); })
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

  const sidePots = { sandy: findPot(sheet, 'Sandy'), eagle: findPot(sheet, 'Eagle'), holeInOne: findPot(sheet, 'Hole in One') };

  const events = [];
  for (let col = 4; col <= 20; col++) {
    const eventNo = sheet[1]?.[col];
    const date = sheet[2]?.[col];
    const course = sheet[3]?.[col];
    const tees = sheet[4]?.[col];
    const time = sheet[5]?.[col];
    if (!course && !date) continue;
    events.push({ event: eventNo || events.length + 1, date: date || '', course: course || 'Course TBD', tees: tees || '', time: time || '' });
  }

  const redRounds = [];
  for (let i = 1; i < redSheet.length; i++) {
    const row = redSheet[i];
    if (!row?.[1]) continue;
    redRounds.push({ place: row[0] || i, player: cleanName(row[1]), course: row[2] || '', date: row[3] || '', tees: row[4] || '', score: row[5] || '', net: row[6] || '' });
  }

  return {
    lastUpdated: new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
    standings, sidePots, events: decorateEvents(events), redRounds: redRounds.slice(0, 14)
  };
}

function money(value) { return '$' + Number(value || 0).toLocaleString(); }
function medal(rank) { if (rank === 1) return '🥇'; if (rank === 2) return '🥈'; if (rank === 3) return '🥉'; return '#' + rank; }
function initials(name = '') { return name.split(' ').filter(Boolean).map(part => part[0]).slice(0, 2).join('').toUpperCase(); }

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

function App() {
  const [data, setData] = useState(fallbackData);
  const [syncStatus, setSyncStatus] = useState('Loading live Google Sheet…');

  useEffect(() => {
    loadLiveData()
      .then(liveData => { setData(liveData); setSyncStatus('Live from Google Sheets'); })
      .catch(error => { console.error(error); setSyncStatus('Using backup data'); });
  }, []);

  const top10 = useMemo(() => data.standings.slice(0, 10), [data]);
  const leader = data.standings[0] || {};
  const second = top10[1] || {};
  const third = top10[2] || {};
  const featuredRedRound = data.redRounds[0] || {};
  const upcomingEvents = data.events.filter(event => event.status !== 'Past').slice(0, 2);
  const pastEvents = data.events.filter(event => event.status === 'Past').slice().reverse().slice(0, 6);
  const featuredEvent = upcomingEvents[0] || data.events[data.events.length - 1] || {};
  const leaderMargin = leader.points != null && second.points != null ? Math.round((leader.points - second.points) * 100) / 100 : 0;

  return (
    <main className="page">
      <nav className="nav">
        <span>DGL TOUR</span>
        <div><a href="#standings">Standings</a><a href="#events">Events</a><a href="#red-room">Red Room</a><a href="#sportsbook">Sportsbook</a></div>
      </nav>

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
          <div className="hero-stat"><span>Featured Red Round</span><strong>{featuredRedRound.player || 'Red Room'}</strong><em>{featuredRedRound.net ? 'Net ' + featuredRedRound.net : 'VIP only'}</em></div>
        </div>
      </section>

      <section className="ticker"><strong>{syncStatus}</strong><span>•</span><span>Last updated: {data.lastUpdated}</span><span>•</span><span>Scott Wishart claimed the 2025 Eagle Pot at Dutch 27 (Red 9), Hole #5, 520-yard Par 5. Paid $117.50.</span></section>

      <section className="grid">
        <article className="card wide standings-card" id="standings">
          <div className="section-head"><div><p className="eyebrow">Live Board</p><h2>2026 Standings</h2></div><span className="updated">{syncStatus}</span></div>
          <div className="podium pro-podium">
            {[leader, second, third].filter(p => p && p.name).map(player => (
              <div className={'podium-card rank-' + player.rank} key={player.name}><div className="avatar">{initials(player.name)}</div><span>{medal(player.rank)}</span><strong>{player.name}</strong><em>{player.points} pts</em></div>
            ))}
          </div>
          <div className="table">
            {top10.map(player => (<div className={'row ' + (player.rank <= 3 ? 'top-row' : '')} key={player.name}><strong>{medal(player.rank)}</strong><span>{player.name}</span><em>{player.points} pts</em></div>))}
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

        <article className="card events-card" id="events">
          <p className="eyebrow">Tour Calendar</p><h2>Event Schedule</h2>
          <h3>Upcoming</h3>
          <div className="event-list">{upcomingEvents.length ? upcomingEvents.map(event => <EventCard event={event} key={'upcoming-' + event.event + event.course} />) : <p className="note">No future events currently entered.</p>}</div>
          <h3>Recent Results</h3>
          <div className="event-scroll">{pastEvents.length ? pastEvents.map(event => <EventCard event={event} key={'past-' + event.event + event.course} />) : <p className="note">Past results coming soon.</p>}</div>
        </article>

        <article className="card red-room-card wide" id="red-room">
          <div className="red-room-brandmark">DGL</div>
          <div className="red-room-copy"><p className="eyebrow">Velvet Rope Access</p><h2>Welcome to <span>The Red Room</span></h2><p className="red-copy">The legends. The rounds. The history. Entry reserved for DGL's finest.</p></div>
          <div className="red-room-stage">
            <div className="red-rounds-panel">
              <div className="panel-head"><p className="eyebrow">All-Time Red Rounds</p><strong>Live Hall of Fame</strong></div>
              <div className="red-table">{data.redRounds.slice(0, 8).map((round, index) => (<div className="red-row" key={round.player + round.course + round.date}><span>{index + 1}</span><strong>{round.player}</strong><small>{round.course}</small><em>{round.net}</em></div>))}</div>
            </div>
            <div className="record-card"><p className="eyebrow">Red Room Record</p><h3>Lowest Net Round</h3><strong>{featuredRedRound.net}</strong><span>{featuredRedRound.player}</span><small>{featuredRedRound.course} • {featuredRedRound.date}</small></div>
          </div>
          <div className="hostess-wrap"><img src={HOSTESS_SRC} alt="Red Room Hostess" className="hostess" onError={(event) => { event.currentTarget.style.display = 'none'; }} /></div>
        </article>

        <article className="card" id="sportsbook"><p className="eyebrow">For Entertainment Purposes</p><h2>Sportsbook</h2><p><strong>Championship favorite:</strong> {leader.name}</p><p className="note">Futures, matchups and DGL odds model coming next.</p></article>
        <article className="card"><p className="eyebrow">Coming Soon</p><h2>State Trophies</h2><p>Minnesota, Wisconsin and out-of-state trophy history will live here.</p></article>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);

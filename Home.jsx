import React, { useMemo, useState } from 'react';
import {
  fallbackData,
  PlayerPhoto,
  photoUrlFor,
  rankBadge,
  rankedRedRounds,
  money,
  sportsbookInsights,
  formatOdds
} from './core.jsx';
import TournamentCenter from './TournamentCenter.jsx';

function roundNet(round = {}) {
  const value = Number(round.netToPar ?? round.netDifferential ?? round.netVsPar ?? round.netScoreToPar ?? round.net);
  return Number.isFinite(value) ? value : null;
}

function roundPoints(round = {}) {
  const value = Number(round.dglPoints ?? round.points);
  return Number.isFinite(value) ? value : null;
}

function roundHandicap(round = {}) {
  const value = Number(round.ghin ?? round.handicapAtTime ?? round.handicap);
  return Number.isFinite(value) ? value : null;
}

function formatSigned(value) {
  if (!Number.isFinite(value)) return '—';
  if (value === 0) return 'E';
  return `${value > 0 ? '+' : '−'}${Math.abs(value).toFixed(1)}`;
}

function formatResultDate(value) {
  const raw = String(value || '').trim();
  if (!raw) return 'Date unavailable';
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T12:00:00` : raw);
  return Number.isNaN(date.getTime())
    ? raw
    : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function currentSeasonResults(rounds = []) {
  const currentYear = new Date().getFullYear();
  const events = new Map();

  rounds.forEach(round => {
    const year = Number(round.year || String(round.date || '').slice(0, 4));
    const net = roundNet(round);
    if (year !== currentYear || !round.player || !Number.isFinite(net)) return;

    const key = String(round.eventId || round.roundId || round.eventNumber || round.event || round.date || round.course || '');
    if (!key) return;
    if (!events.has(key)) {
      events.set(key, {
        key,
        event: round.eventNumber || round.event || '',
        date: round.date || round.eventDate || '',
        course: round.course || round.courseName || 'Course unavailable',
        host: round.host || '',
        players: []
      });
    }
    const event = events.get(key);
    if (!event.host && round.host) event.host = round.host;
    event.players.push({
      name: round.player,
      net,
      handicap: roundHandicap(round),
      points: roundPoints(round)
    });
  });

  return [...events.values()]
    .map(event => {
      const players = event.players.sort((a, b) => a.net - b.net || a.name.localeCompare(b.name));
      const winningNet = players[0]?.net;
      const winners = players.filter(player => Math.abs(player.net - winningNet) < 0.0005);
      return { ...event, players, winningNet, winners };
    })
    .sort((a, b) => {
      const dateDifference = new Date(b.date).getTime() - new Date(a.date).getTime();
      return (Number.isFinite(dateDifference) ? dateDifference : 0) || Number(b.event) - Number(a.event);
    });
}

function NevalaFiles({ rounds = [] }) {
  const [openEvent, setOpenEvent] = useState('');
  const season = new Date().getFullYear();
  const events = useMemo(() => currentSeasonResults(rounds), [rounds]);

  return (
    <article className="card wide nevala-files" id="nevala-files">
      <div className="section-head nevala-head">
        <div>
          <p className="eyebrow">{season} Results Archive</p>
          <h2>The Nevala Files</h2>
          <p className="nevala-tagline">Because Brian wanted receipts.</p>
        </div>
        <span className="updated">{events.length} completed round{events.length === 1 ? '' : 's'}</span>
      </div>

      {events.length ? (
        <div className="nevala-round-list">
          {events.map(event => {
            const isOpen = openEvent === event.key;
            const winnerNames = event.winners.map(winner => winner.name).join(' / ');
            const winnerPoints = event.winners
              .map(winner => Number.isFinite(winner.points) ? winner.points.toFixed(2).replace(/\.00$/, '') : '—')
              .join(' / ');

            return (
              <div className="nevala-round" key={event.key}>
                <button
                  type="button"
                  className="nevala-summary"
                  aria-expanded={isOpen}
                  onClick={() => setOpenEvent(isOpen ? '' : event.key)}
                >
                  <span className="nevala-event">
                    <small>Event {event.event || '—'} • {formatResultDate(event.date)}</small>
                    <strong>{event.course}</strong>
                  </span>
                  <span><small>Winner</small><b>{winnerNames}</b></span>
                  <span><small>Winning Net</small><b>{formatSigned(event.winningNet)}</b></span>
                  <span><small>DGL Points</small><b>{winnerPoints}</b></span>
                  <span><small>Host</small><b>{event.host || 'Not recorded'}</b></span>
                  <em aria-hidden="true">⌄</em>
                </button>

                {isOpen ? (
                  <div className="nevala-field">
                    <div className="nevala-field-head">
                      <span>Finish</span><span>Player</span><span>Net</span><span>Handicap Then</span><span>DGL Points</span>
                    </div>
                    {event.players.map((player, index) => (
                      <div className="nevala-field-row" key={`${event.key}-${player.name}`}>
                        <span>{index + 1}</span>
                        <strong>{player.name}</strong>
                        <b>{formatSigned(player.net)}</b>
                        <span>{Number.isFinite(player.handicap) ? player.handicap.toFixed(1) : '—'}</span>
                        <span>{Number.isFinite(player.points) ? player.points.toFixed(2).replace(/\.00$/, '') : '—'}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="nevala-empty">Completed {season} rounds will appear here automatically.</p>
      )}

      <style>{`
        .nevala-files{grid-column:1/-1;overflow:hidden}.nevala-head{align-items:flex-end}.nevala-head h2{margin-bottom:4px}.nevala-tagline{margin:0;color:#a99f8d;font-weight:700}.nevala-round-list{display:grid;gap:9px}.nevala-round{overflow:hidden;border:1px solid rgba(226,184,73,.2);border-radius:15px;background:rgba(0,0,0,.2)}.nevala-summary{width:100%;display:grid;grid-template-columns:minmax(170px,1.35fr) repeat(4,minmax(90px,1fr)) 24px;align-items:center;gap:12px;padding:15px;color:inherit;font:inherit;text-align:left;background:transparent;border:0;cursor:pointer}.nevala-summary:hover{background:rgba(226,184,73,.05)}.nevala-summary small{display:block;margin-bottom:4px;color:#9f9687;font-size:9px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}.nevala-summary strong,.nevala-summary b{font-size:13px}.nevala-summary>span:not(.nevala-event) b{color:#f0c75e}.nevala-summary em{color:#f0c75e;font-size:21px;font-style:normal;transition:transform .18s ease}.nevala-summary[aria-expanded=true] em{transform:rotate(180deg)}.nevala-field{padding:0 15px 14px;overflow-x:auto}.nevala-field-head,.nevala-field-row{min-width:580px;display:grid;grid-template-columns:58px minmax(160px,1.4fr) repeat(3,minmax(90px,.8fr));gap:12px;align-items:center;padding:9px 10px}.nevala-field-head{border-top:1px solid rgba(226,184,73,.16);color:#8f8575;font-size:9px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}.nevala-field-row{border-top:1px solid rgba(255,255,255,.05);font-size:12px}.nevala-field-head span:not(:nth-child(2)),.nevala-field-row>*:not(:nth-child(2)){text-align:right}.nevala-field-row b{color:#f0c75e}.nevala-empty{margin:0;color:#c8bfae}@media(max-width:760px){.nevala-head{align-items:flex-start}.nevala-summary{grid-template-columns:1fr 1fr 24px}.nevala-event{grid-column:1/3}.nevala-summary em{grid-column:3;grid-row:1/4}.nevala-summary>span:nth-child(5){grid-column:1/3}}
      `}</style>
    </article>
  );
}


function ThisDayInDGLHistory({ moments = [], goAnnals }) {
  const today = new Date();
  const monthDay = today.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric'
  });

  const matches = moments.filter(moment => moment.date === monthDay);
  const displayMoments = matches.length ? matches : [{
    date: monthDay,
    year: 'DGL Archives',
    type: '📜 Annals of History',
    title: 'No official moment recorded for today yet',
    body: 'The DGL archives are growing. Add a memory, round, or legendary moment for this date.'
  }];

  return (
    <article className="card history-card">
      <p className="eyebrow">📜 This Day in DGL History</p>
      <h2>{monthDay}</h2>

      <div className="history-entry-list">
        {displayMoments.map((moment, index) => (
          <div className="history-entry" key={`${moment.year}-${moment.title}-${index}`}>
            <span className="history-year">{moment.year}</span>
            <strong>{moment.type}</strong>
            <h3>{moment.title}</h3>
            {moment.photoUrl ? <img src={moment.photoUrl} alt="DGL history" className="history-photo" /> : null}
            <p>{moment.body}</p>
            {index < displayMoments.length - 1 ? <hr className="history-divider" /> : null}
          </div>
        ))}
      </div>

      <button onClick={goAnnals} className="gold-button">ENTER THE ANNALS</button>
    </article>
  );
}

export function NevalaFilesPage({ data, goHome }) {
  return (
    <section aria-label="The Nevala Files">
      <button type="button" onClick={goHome} className="gold-button" style={{ marginBottom: 20 }}>← BACK TO DGL TOUR</button>
      <NevalaFiles rounds={Array.isArray(data?.historicalRounds) ? data.historicalRounds : []} />
    </section>
  );
}

function HomePage({ data, syncStatus, goRedRoom, goAnnals, goStateTrophies, goSportsbook, goNevalaFiles, goPlayers, goFamilyScramble }) {
  data = {
    ...fallbackData,
    ...(data || {}),
    standings: Array.isArray(data?.standings) ? data.standings : [],
    events: Array.isArray(data?.events) ? data.events : [],
    redRounds: Array.isArray(data?.redRounds) ? data.redRounds : [],
    historyMoments: Array.isArray(data?.historyMoments) ? data.historyMoments : [],
    historicalRounds: Array.isArray(data?.historicalRounds) ? data.historicalRounds : [],
    sportsbook: Array.isArray(data?.sportsbook) ? data.sportsbook : [],
    sidePots: { ...fallbackData.sidePots, ...(data?.sidePots || {}) }
  };

  const top10 = data.standings.slice(0, 10);
  const leader = data.standings[0] || {};
  const second = top10[1] || {};
  const featuredRedRound = rankedRedRounds(data.redRounds)[0] || {};
  const upcomingEvents = (data.events || []).slice(0, 6);
  const featuredEvent = upcomingEvents[0] || data.events[0] || {};
  const sportsbookBoard = data.sportsbook || [];
  const insights = sportsbookInsights(sportsbookBoard);
  const leaderMargin = leader.points != null && second.points != null
    ? Math.round((leader.points - second.points) * 100) / 100
    : 0;

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
          <div className="hero-stat leader">
            <span>Current Leader</span>
            <strong>{leader.name}</strong>
            <em>{leader.points} pts • +{leaderMargin} lead</em>
          </div>
          <div className="hero-stat">
            <span>Next Event</span>
            <strong>{featuredEvent.course || 'Schedule TBD'}</strong>
            <em>{featuredEvent.date || 'Coming soon'}</em>
          </div>
          <div className="hero-stat">
            <span>Featured Red Round</span>
            <strong>{featuredRedRound.player || 'Red Room'}</strong>
            <em>{featuredRedRound.displayNet ? 'Net ' + featuredRedRound.displayNet : 'VIP only'}</em>
          </div>
        </div>
      </section>

      <section className="ticker">
        <div className="ticker-track">
          <span><strong>{syncStatus}</strong></span>
          <span>Last updated: {data.lastUpdated}</span>
          <span>Mitch O’Neill hit the Eagle Pot on 6/25/26 at Mammoth Dunes — Hole #14, 297 yards. Paid $44.25.</span>
          <span>Red Room is live.</span>
          <span>Standings update automatically from Google Sheets.</span>
        </div>
      </section>

      <section className="grid">
        <article className="card wide standings-card" id="standings">
          <div className="section-head">
            <div>
              <p className="eyebrow">Live Board</p>
              <h2>2026 Standings</h2>
            </div>
            <span className="updated">{syncStatus}</span>
          </div>

          <div className="podium pro-podium">
            {top10.slice(0, 3).map(player => (
              <div className={'podium-card rank-' + player.rank} key={player.name}>
                <PlayerPhoto name={player.name} src={photoUrlFor(data, player.name)} />
                <span>{rankBadge(player)}</span>
                <strong>{player.name}</strong>
                <em>{player.points} pts</em>
              </div>
            ))}
          </div>

          <div className="table">
            {top10.map(player => (
              <div className={'row ' + (player.rank <= 3 ? 'top-row' : '')} key={player.name}>
                <strong>{rankBadge(player)}</strong>
                <span className="row-player"><PlayerPhoto name={player.name} src={photoUrlFor(data, player.name)} />{player.name}</span>
                <em>{player.points} pts</em>
              </div>
            ))}
          </div>
        </article>

        <article className="card sidepots-card">
          <p className="eyebrow">Jackpot Watch</p>
          <h2>Current Side Pots</h2>
          <div className="pots">
            <div className="pot"><span>🦅</span><small>Eagle Pot</small><strong>{money(data.sidePots.eagle)}</strong></div>
            <div className="pot"><span>🎯</span><small>Hole-in-One</small><strong>{money(data.sidePots.holeInOne)}</strong></div>
            <div className="pot"><span>🏖️</span><small>Sandy Pot</small><strong>{money(data.sidePots.sandy)}</strong></div>
          </div>
          <div className="pot-winner-scroll" aria-label="Past Eagle Pot winners">
            <div className="pot-winner-track">
              <span><strong>Eagle Pot Last Hit</strong> Mitch O’Neill • Mammoth Dunes • Hole #14 • 297 yards • 6/25/26 • Paid $44.25</span>
              <span><strong>Previous Eagle Pot</strong> Scott Wishart • Edinburgh Golf Course • Hole #1 • 492-yard Par 5 • 6/18/26 • Paid $77.50</span>
              <span><strong>2025 Eagle Pot</strong> Scott Wishart • Dutch 27 Red 9 • Hole #5 • 520-yard Par 5 • 9/26/25 • Paid $117.50</span>
            </div>
          </div>
          <div className="fall-classic-pot" data-version="fall-classic-2026-09-21" style={{ marginTop: 20, paddingTop: 18, borderTop: '1px solid rgba(229,188,80,.3)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <strong style={{ color: '#f5d675', fontSize: 17 }}>DGL Fall Classic Pot</strong>
            <strong style={{ color: '#f5d675', fontSize: 30, fontVariantNumeric: 'tabular-nums' }}>
              {Number.isFinite(data.sidePots.fallClassic) ? money(data.sidePots.fallClassic) : '—'}
            </strong>
          </div>
        </article>

        <ThisDayInDGLHistory moments={data.historyMoments || []} goAnnals={goAnnals} />

        <article className="card red-room-entry-card">
          <p className="eyebrow">Members May View. Legends Had To Earn It.</p>
          <h2>🔴 Red Room Entrance</h2>
          <p>The greatest net rounds in DGL history.</p>
          <p className="note">Entry is earned. History is forever.</p>
          <button onClick={goRedRoom} className="gold-button">ENTER THE RED ROOM</button>
        </article>

        <article className="card history-card">
          <p className="eyebrow">📜 Archives</p>
          <h2>Annals of History</h2>
          <p>Year-by-year DGL standings, champions, awards, and legendary season records.</p>
          <button onClick={goAnnals} className="gold-button">ENTER THE ANNALS</button>
        </article>

        <TournamentCenter
          events={data.events}
          sportsbook={data.sportsbook}
          rounds={data.historicalRounds}
          historicalRounds={data.historicalRounds}
          leader={leader}
        />

        <article className="card">
          <p className="eyebrow">{new Date().getFullYear()} Results Archive</p>
          <h2>📂 The Nevala Files</h2>
          <p>Because Brian wanted receipts.</p>
          <p>Every round this season: winners, net scores, DGL points, and hosts. Open a round for the full field and handicaps at the time.</p>
          <button type="button" onClick={goNevalaFiles} className="gold-button">OPEN THE FILES</button>
        </article>

        <article className="card sportsbook-card" id="sportsbook">
          <p className="eyebrow">For Entertainment Purposes</p>
          <h2>🎰 DGL Sportsbook</h2>
          <p><strong>Favorite:</strong> {insights.favorite.player || leader.name} {insights.favorite.odds ? formatOdds(insights.favorite.odds) : ''}</p>
          <p><strong>Best Value:</strong> {insights.bestValue.player || 'Model loading'}</p>
          <p><strong>Highest Ceiling:</strong> {insights.highestCeiling.player || 'Model loading'}</p>
          <button onClick={goSportsbook} className="gold-button">VIEW FULL BOARD</button>
        </article>

        <article className="card">
          <p className="eyebrow">Trophy Case</p>
          <h2>State Trophies</h2>
          <p>Florida and Arizona trophy history, photos, and holders.</p>
          <button onClick={goStateTrophies} className="gold-button">VIEW STATE TROPHIES</button>
        </article>


        <article className="card family-scramble-entry-card">
          <p className="eyebrow">Family • Friends • Golf</p>
          <h2>4th Annual Dojo Family Scramble</h2>
          <p>September 13, 2026 at Gem Lake Hills. Tee times, rules, contests, past champions, and the full day schedule.</p>
          <button onClick={goFamilyScramble} className="gold-button">VIEW FAMILY SCRAMBLE</button>
        </article>

        <article className="card player-entry-card">
          <p className="eyebrow">Trading Cards</p>
          <h2>Player Profiles</h2>
          <p>Photos, nicknames, odds, Red Room appearances, DGLFC history, and state trophy résumés.</p>
          <button onClick={goPlayers} className="gold-button">VIEW PLAYERS</button>
        </article>
      </section>
    </>
  );
}


export default HomePage;

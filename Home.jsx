import React from 'react';
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

function HomePage({ data, syncStatus, goRedRoom, goAnnals, goStateTrophies, goSportsbook, goPlayers, goRules }) {
  data = {
    ...fallbackData,
    ...(data || {}),
    standings: Array.isArray(data?.standings) ? data.standings : [],
    events: Array.isArray(data?.events) ? data.events : [],
    redRounds: Array.isArray(data?.redRounds) ? data.redRounds : [],
    historyMoments: Array.isArray(data?.historyMoments) ? data.historyMoments : [],
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
          leader={leader}
        />

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

        <div
          className="wide home-bottom-card-row"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '20px',
            alignItems: 'stretch'
          }}
        >
          <article className="card player-entry-card">
            <p className="eyebrow">Trading Cards</p>
            <h2>Player Profiles</h2>
            <p>Photos, nicknames, odds, Red Room appearances, DGLFC history, and state trophy résumés.</p>
            <button onClick={goPlayers} className="gold-button">VIEW PLAYERS</button>
          </article>

          <article className="card rules-entry-card">
            <p className="eyebrow">League Law</p>
            <h2>📜 Official Rules</h2>
            <p>The governing rules of the DGL, presented exactly as recorded in the Official Rules sheet.</p>
            <button onClick={goRules} className="gold-button">READ THE OFFICIAL RULES</button>
          </article>
        </div>
      </section>
    </>
  );
}


export default HomePage;

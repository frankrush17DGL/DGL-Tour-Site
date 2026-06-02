import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const data = {
  "lastUpdated": "June 2026",
  "standings": [
    {
      "rank": 1,
      "name": "Frank Rush",
      "points": 2.1
    },
    {
      "rank": 2,
      "name": "Tim P.",
      "points": 0.5
    },
    {
      "rank": 3,
      "name": "John Leitch",
      "points": 0.3
    },
    {
      "rank": 3,
      "name": "Max Olson",
      "points": 0.3
    },
    {
      "rank": 3,
      "name": "Nic Wendel",
      "points": 0.3
    },
    {
      "rank": 6,
      "name": "Charles Kordonowy",
      "points": 0.15
    },
    {
      "rank": 6,
      "name": "Kyle Odegaard",
      "points": 0.15
    },
    {
      "rank": 8,
      "name": "Alex Pletsch",
      "points": 0.0
    },
    {
      "rank": 8,
      "name": "Alex Rogers",
      "points": 0.0
    },
    {
      "rank": 8,
      "name": "Anthony Gross",
      "points": 0.0
    },
    {
      "rank": 8,
      "name": "Ben Magnuson",
      "points": 0.0
    },
    {
      "rank": 8,
      "name": "Brian Nevala",
      "points": 0.0
    },
    {
      "rank": 8,
      "name": "Chris D",
      "points": 0.0
    },
    {
      "rank": 8,
      "name": "Joe Grannes",
      "points": 0.0
    },
    {
      "rank": 8,
      "name": "Keegan Anderson",
      "points": 0.0
    },
    {
      "rank": 8,
      "name": "Klappy",
      "points": 0.0
    },
    {
      "rank": 8,
      "name": "Scoot Wishart",
      "points": 0.0
    },
    {
      "rank": 8,
      "name": "Steven Mitchell",
      "points": 0.0
    }
  ],
  "sidePots": {
    "eagle": 151,
    "holeInOne": 268,
    "sandy": 268
  },
  "events": [
    {
      "event": 1,
      "date": "4/2/26",
      "course": "Kelly Plantation",
      "tees": "Plantation",
      "time": "7:09 AM"
    },
    {
      "event": 2,
      "date": "4/29/26",
      "course": "Edinburgh",
      "tees": "",
      "time": "4:27 & 4:36"
    },
    {
      "event": 3,
      "date": "5/16/26",
      "course": "Links at Northfork",
      "tees": "Black",
      "time": "6:58 AM"
    }
  ],
  "redRounds": [
    {
      "place": 1.0,
      "player": "Alex Pletsch",
      "course": "Eagle Valley",
      "date": "6/3/21",
      "tees": "Whites",
      "score": "4 Thru 18",
      "net": -10.3
    },
    {
      "place": 2.0,
      "player": "Max",
      "course": "Royal",
      "date": "9/3/23",
      "tees": "White",
      "score": "5 Thru 18",
      "net": -7.8
    },
    {
      "place": 3.0,
      "player": "Nic",
      "course": "Dwan",
      "date": "8/30/25",
      "tees": "Bluff",
      "score": "21 Thru 18",
      "net": -7.4
    },
    {
      "place": 4,
      "player": "Frank",
      "course": "Wild Marsh",
      "date": "8/6/23",
      "tees": "Blues",
      "score": "7 Thru 18",
      "net": -7.3
    },
    {
      "place": 5.0,
      "player": "Max",
      "course": "Columbia",
      "date": "9/13/25",
      "tees": "Black",
      "score": "3 Thru 18",
      "net": -6.3
    },
    {
      "place": 6,
      "player": "Frank",
      "course": "Columbia",
      "date": "6/23/21",
      "tees": "Blues",
      "score": "5 Thru 12",
      "net": -5.0
    },
    {
      "place": null,
      "player": "Frank",
      "course": "Gross",
      "date": "8/31/25",
      "tees": "Blues",
      "score": "9 Thru 18",
      "net": -5.0
    },
    {
      "place": 8.0,
      "player": "Frank",
      "course": "Edinburgh",
      "date": "4/29/26",
      "tees": "Blues",
      "score": "5 Thru 14",
      "net": -4.9
    },
    {
      "place": 9.0,
      "player": "Nic",
      "course": "Edinburgh",
      "date": "4/29/26",
      "tees": "Blues",
      "score": "16 Thru 14",
      "net": -4.6
    },
    {
      "place": 10,
      "player": "Frank",
      "course": "The Refuge",
      "date": "8/5/22",
      "tees": "Greens",
      "score": "10 Thru 18",
      "net": -4.2
    },
    {
      "place": 11,
      "player": "Keegan",
      "course": "Eagle Valley",
      "date": "6/3/21",
      "tees": "Whites",
      "score": "12 Thru 16",
      "net": -4.0
    },
    {
      "place": null,
      "player": "John",
      "course": "Les Bolstad",
      "date": "8/24/23",
      "tees": "Maroon",
      "score": "16 Thru 18",
      "net": -4.0
    }
  ]
};

function money(value) {
  return '$' + Number(value || 0).toLocaleString();
}

function medal(rank) {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return '#' + rank;
}

function App() {
  const top10 = data.standings.slice(0, 10);
  const leader = data.standings[0] || {};
  const nextEvent = data.events[data.events.length - 1] || {};
  const featuredRedRound = data.redRounds[0] || {};

  return (
    <main className="page">
      <nav className="nav">
        <span>DGL TOUR</span>
        <div>
          <a href="#standings">Standings</a>
          <a href="#events">Events</a>
          <a href="#red-room">Red Room</a>
          <a href="#sportsbook">Sportsbook</a>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-glow"></div>
        <img src="/dgl-logo.jpeg" alt="DGL Tour Logo" className="logo" />
        <div className="badge">EST. 2021 • OFFICIAL HOME</div>
        <h1>DGL TOUR</h1>
        <p className="tagline">Where legends are made and Red Rounds live forever.</p>

        <div className="hero-stats">
          <div className="hero-stat leader">
            <span>Current Leader</span>
            <strong>{leader.name}</strong>
            <em>{leader.points} pts</em>
          </div>
          <div className="hero-stat">
            <span>Next Event</span>
            <strong>{nextEvent.course || 'Schedule TBD'}</strong>
            <em>{nextEvent.date || 'Coming soon'}</em>
          </div>
          <div className="hero-stat">
            <span>Featured Entry</span>
            <strong>{featuredRedRound.player || 'Red Room'}</strong>
            <em>{featuredRedRound.net ? 'Net ' + featuredRedRound.net : 'VIP only'}</em>
          </div>
        </div>
      </section>

      <section className="ticker">
        <strong>Latest:</strong>
        <span>Scott Wishart claimed the 2025 Eagle Pot ($117.50).</span>
        <span>•</span>
        <span>Side pots are live.</span>
        <span>•</span>
        <span>The Red Room is now accepting only elite behavior.</span>
      </section>

      <section className="grid">
        <article className="card wide standings-card" id="standings">
          <div className="section-head">
            <div>
              <p className="eyebrow">Live Board</p>
              <h2>2026 Standings</h2>
            </div>
            <span className="updated">Updated: {data.lastUpdated}</span>
          </div>

          <div className="podium">
            {top10.slice(0, 3).map(player => (
              <div className={'podium-card rank-' + player.rank} key={player.name}>
                <span>{medal(player.rank)}</span>
                <strong>{player.name}</strong>
                <em>{player.points} pts</em>
              </div>
            ))}
          </div>

          <div className="table">
            {top10.map(player => (
              <div className={'row ' + (player.rank <= 3 ? 'top-row' : '')} key={player.name}>
                <strong>{medal(player.rank)}</strong>
                <span>{player.name}</span>
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
          <p className="note">Last hit: Scott Wishart — 2025 Eagle Pot ($117.50)</p>
        </article>

        <article className="card events-card" id="events">
          <p className="eyebrow">Tour Calendar</p>
          <h2>Event Schedule</h2>
          <div className="event-list">
            {data.events.slice(-5).map(event => (
              <div className="event" key={event.event + event.course}>
                <span>Event {event.event}</span>
                <strong>{event.course}</strong>
                <small>{event.date}{event.time ? ' • ' + event.time : ''}{event.tees ? ' • ' + event.tees : ''}</small>
              </div>
            ))}
          </div>
        </article>

        <article className="card red-room-card wide" id="red-room">
          <div className="rope rope-top"></div>
          <div className="red-room-content">
            <p className="eyebrow">Velvet Rope Access</p>
            <h2>🔴 The Red Room</h2>
            <p className="red-copy">Entry reserved for DGL's finest rounds. Not everyone gets in.</p>
            <div className="vip-grid">
              <div className="vip-feature">
                <span>VIP TABLE #1</span>
                <strong>{featuredRedRound.player}</strong>
                <em>{featuredRedRound.course}</em>
                <p>{featuredRedRound.score} • Net {featuredRedRound.net}</p>
                <small>{featuredRedRound.date}</small>
              </div>
              <div className="vip-list">
                {data.redRounds.slice(1, 6).map((round, index) => (
                  <div className="vip-row" key={round.player + round.course + round.date}>
                    <span>#{index + 2}</span>
                    <div>
                      <strong>{round.player}</strong>
                      <small>{round.course} • {round.score} • Net {round.net}</small>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="rope rope-bottom"></div>
        </article>

        <article className="card" id="sportsbook">
          <p className="eyebrow">For Entertainment Purposes</p>
          <h2>Sportsbook</h2>
          <p><strong>Championship favorite:</strong> {leader.name}</p>
          <p className="note">Futures, matchups and DGL odds model coming next.</p>
        </article>

        <article className="card">
          <p className="eyebrow">Coming Soon</p>
          <h2>State Trophies</h2>
          <p>Minnesota, Wisconsin and out-of-state trophy history will live here.</p>
        </article>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);

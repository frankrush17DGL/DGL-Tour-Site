import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const data = {
  "standings": [
    {
      "rank": 1,
      "name": "Frank Rush",
      "points": 2.1,
      "net": 7.2
    },
    {
      "rank": 2,
      "name": "Tim P.",
      "points": 0.5,
      "net": 6.7
    },
    {
      "rank": 3,
      "name": "John Leitch",
      "points": 0.3,
      "net": 16.6
    },
    {
      "rank": 3,
      "name": "Max Olson",
      "points": 0.3,
      "net": 15.1
    },
    {
      "rank": 3,
      "name": "Nic Wendel",
      "points": 0.3,
      "net": -0.3
    },
    {
      "rank": 6,
      "name": "Charles Kordonowy",
      "points": 0.15,
      "net": 7.8
    },
    {
      "rank": 6,
      "name": "Kyle Odegaard",
      "points": 0.15,
      "net": 8.4
    },
    {
      "rank": 8,
      "name": "Alex Pletsch",
      "points": 0.0,
      "net": 0.0
    },
    {
      "rank": 8,
      "name": "Alex Rogers",
      "points": 0.0,
      "net": 0.0
    },
    {
      "rank": 8,
      "name": "Anthony Gross",
      "points": 0.0,
      "net": 0.0
    },
    {
      "rank": 8,
      "name": "Ben Magnuson",
      "points": 0.0,
      "net": 0.0
    },
    {
      "rank": 8,
      "name": "Brian Nevala",
      "points": 0.0,
      "net": 0.0
    },
    {
      "rank": 8,
      "name": "Chris D",
      "points": 0.0,
      "net": 0.0
    },
    {
      "rank": 8,
      "name": "Joe Grannes",
      "points": 0.0,
      "net": 0.0
    },
    {
      "rank": 8,
      "name": "Keegan Anderson",
      "points": 0.0,
      "net": 0.0
    },
    {
      "rank": 8,
      "name": "Klappy",
      "points": 0.0,
      "net": 0.0
    },
    {
      "rank": 8,
      "name": "Scoot Wishart",
      "points": 0.0,
      "net": 0.0
    },
    {
      "rank": 8,
      "name": "Steven Mitchell",
      "points": 0.0,
      "net": 0.0
    }
  ],
  "sidePots": {
    "sandy": 268,
    "eagle": 151,
    "holeInOne": 268
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
      "score": "4 Thru 18",
      "net": -10.3
    },
    {
      "place": 2.0,
      "player": "Max",
      "course": "Royal",
      "date": "9/3/23",
      "score": "5 Thru 18",
      "net": -7.8
    },
    {
      "place": 3.0,
      "player": "Nic",
      "course": "Dwan",
      "date": "8/30/25",
      "score": "21 Thru 18",
      "net": -7.4
    },
    {
      "place": 4,
      "player": "Frank",
      "course": "Wild Marsh",
      "date": "8/6/23",
      "score": "7 Thru 18",
      "net": -7.3
    },
    {
      "place": 5.0,
      "player": "Max",
      "course": "Columbia",
      "date": "9/13/25",
      "score": "3 Thru 18",
      "net": -6.3
    },
    {
      "place": 6,
      "player": "Frank",
      "course": "Columbia",
      "date": "6/23/21",
      "score": "5 Thru 12",
      "net": -5.0
    },
    {
      "place": null,
      "player": "Frank",
      "course": "Gross",
      "date": "8/31/25",
      "score": "9 Thru 18",
      "net": -5.0
    },
    {
      "place": 8.0,
      "player": "Frank",
      "course": "Edinburgh",
      "date": "4/29/26",
      "score": "5 Thru 14",
      "net": -4.9
    }
  ]
};

function money(value) {
  return '$' + Number(value || 0).toLocaleString();
}

function App() {
  const top10 = data.standings.slice(0, 10);
  const leader = data.standings[0];
  const featuredRedRound = data.redRounds[0];

  return (
    <main className="page">
      <section className="hero">
        <img
          src="/dgl-logo.jpeg"
          alt="DGL Tour Logo"
          style={{
            width: '150px',
            maxWidth: '42vw',
            marginBottom: '18px',
            borderRadius: '18px'
          }}
        />

        <div className="badge">EST. 2021</div>
        <h1>DGL TOUR</h1>
        <p className="tagline">Official Home of the Dojo Golf League</p>
        <p className="subtag">Where legends are made and Red Rounds live forever.</p>
      </section>

      <section className="grid">
        <article className="card wide">
          <h2>Live 2026 Standings</h2>
          <p><strong>Current Leader:</strong> {leader?.name} — {leader?.points} points</p>
          <div className="table">
            {top10.map(player => (
              <div className="row" key={player.name}>
                <strong>#{player.rank}</strong>
                <span>{player.name}</span>
                <em>{player.points} pts</em>
              </div>
            ))}
          </div>
        </article>

        <article className="card">
          <h2>Current Side Pots</h2>
          <p><strong>Eagle:</strong> {money(data.sidePots.eagle)}</p>
          <p><strong>Hole-in-One:</strong> {money(data.sidePots.holeInOne)}</p>
          <p><strong>Sandy:</strong> {money(data.sidePots.sandy)}</p>
          <small>Historical note: Scott Wishart won the 2025 Eagle Pot ($117.50).</small>
        </article>

        <article className="card">
          <h2>Event Schedule</h2>
          {data.events.length ? data.events.map(event => (
            <p key={event.event}>
              <strong>Event {event.event}:</strong> {event.course}<br />
              <small>{event.date}{event.time ? ' • ' + event.time : ''}{event.tees ? ' • ' + event.tees : ''}</small>
            </p>
          )) : <p>No upcoming events entered yet.</p>}
        </article>

        <article className="card">
          <h2>Featured Red Round</h2>
          <p><strong>{featuredRedRound.player}</strong> at {featuredRedRound.course}</p>
          <p>{featuredRedRound.score} • Net {featuredRedRound.net}</p>
          <small>{featuredRedRound.date}</small>
        </article>

        <article className="card">
          <h2>Red Room</h2>
          {data.redRounds.slice(0, 5).map(round => (
            <p key={round.player + round.course + round.date}>
              <strong>{round.player}</strong> — {round.course}<br />
              <small>{round.score} • Net {round.net} • {round.date}</small>
            </p>
          ))}
        </article>

        <article className="card">
          <h2>Sportsbook</h2>
          <p><strong>Championship favorite:</strong> {leader?.name}</p>
          <p>Odds model coming next.</p>
        </article>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);

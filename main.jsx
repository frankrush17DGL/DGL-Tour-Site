import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const standings = [
  { rank: 1, name: 'DGL Leader', points: 'Update from Google Sheet' },
  { rank: 2, name: 'Second Place', points: 'Coming soon' },
  { rank: 3, name: 'Third Place', points: 'Coming soon' }
];

function App() {
  return (
    <main className="page">
      <section className="hero">
        <img
  src="./dgl-logo.jpeg"
  alt="DGL Tour Logo"
  style={{
    width: "140px",
    maxWidth: "40vw",
    marginBottom: "20px"
  }}
/>
        <div className="badge">EST. 2021</div>
        <h1>DGL TOUR</h1>
        <p className="tagline">Official Home of the Dojo Golf League</p>
        <p className="subtag">Where legends are made and Red Rounds live forever.</p>
      </section>

      <section className="grid">
        <article className="card wide">
          <h2>Live Standings</h2>
          <div className="table">
            {standings.map(player => (
              <div className="row" key={player.rank}>
                <strong>#{player.rank}</strong>
                <span>{player.name}</span>
                <em>{player.points}</em>
              </div>
            ))}
          </div>
        </article>

        <article className="card">
          <h2>Current Side Pots</h2>
          <p><strong>Eagle:</strong> Updating from 2026 Standings</p>
          <p><strong>Hole-in-One:</strong> Updating from 2026 Standings</p>
          <p><strong>Sandy:</strong> Updating from 2026 Standings</p>
          <small>Historical note: Scott Wishart won the 2025 Eagle Pot.</small>
        </article>

        <article className="card">
          <h2>Next Event</h2>
          <p>Event schedule connection coming next.</p>
        </article>

        <article className="card">
          <h2>Red Room</h2>
          <p>The Red Round Hall of Fame is coming next.</p>
        </article>

        <article className="card">
          <h2>Sportsbook</h2>
          <p>Championship odds and futures coming soon.</p>
        </article>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);

import React, { useEffect, useState } from 'react';
import { fallbackData, loadLiveData } from './core.jsx';
import HomePage from './Home.jsx';
import RedRoomPage from './RedRoom.jsx';
import AnnalsPage from './Annals.jsx';
import StateTrophiesPage from './StateTrophies.jsx';
import SportsbookPage from './Sportsbook.jsx';
import PlayersPage from './Players.jsx';

function App() {
  const [data, setData] = useState(fallbackData);
  const [syncStatus, setSyncStatus] = useState('Loading live Google Sheet…');
  const [page, setPage] = useState(() => {
    const hash = window.location.hash;
    if (hash === '#red-room') return 'red-room';
    if (hash === '#annals') return 'annals';
    if (hash === '#state-trophies') return 'state-trophies';
    if (hash === '#sportsbook') return 'sportsbook';
    if (hash === '#players') return 'players';
    return 'home';
  });

  useEffect(() => {
    const onHash = () => {
      const hash = window.location.hash;
      if (hash === '#red-room') setPage('red-room');
      else if (hash === '#annals') setPage('annals');
      else if (hash === '#state-trophies') setPage('state-trophies');
      else if (hash === '#sportsbook') setPage('sportsbook');
      else if (hash === '#players') setPage('players');
      else setPage('home');
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    loadLiveData()
      .then(liveData => {
        setData(liveData);
        setSyncStatus('Live from Google Sheets');
      })
      .catch(error => {
        console.error('DGL LIVE DATA FAILED', error);
        setSyncStatus('LIVE DATA ERROR: ' + (error?.message || String(error)));
        window.DGL_LAST_ERROR = error;
      });
  }, []);

  const goRedRoom = () => {
    window.location.hash = 'red-room';
    setPage('red-room');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goAnnals = () => {
    window.location.hash = 'annals';
    setPage('annals');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goStateTrophies = () => {
    window.location.hash = 'state-trophies';
    setPage('state-trophies');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goSportsbook = () => {
    window.location.hash = 'sportsbook';
    setPage('sportsbook');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goPlayers = () => {
    window.location.hash = 'players';
    setPage('players');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goHome = () => {
    window.location.hash = '';
    setPage('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <main className="page">
      {page === 'home' && (
        <>
          <nav className="nav">
            <span>DGL TOUR</span>
            <div>
              <a href="#standings">Standings</a>
              <a href="#events">Events</a>
              <button onClick={goRedRoom}>Red Room</button>
              <button onClick={goAnnals}>Annals</button>
              <button onClick={goStateTrophies}>Trophies</button>
              <button onClick={goSportsbook}>Sportsbook</button>
              <button onClick={goPlayers}>Players</button>
            </div>
          </nav>
          <HomePage
            data={data}
            syncStatus={syncStatus}
            goRedRoom={goRedRoom}
            goAnnals={goAnnals}
            goStateTrophies={goStateTrophies}
            goSportsbook={goSportsbook}
            goPlayers={goPlayers}
          />
        </>
      )}

      {page === 'red-room' && <RedRoomPage data={data} goHome={goHome} />}
      {page === 'annals' && <AnnalsPage data={data} goHome={goHome} />}
      {page === 'state-trophies' && <StateTrophiesPage data={data} goHome={goHome} />}
      {page === 'sportsbook' && <SportsbookPage data={data} goHome={goHome} />}
      {page === 'players' && <PlayersPage data={data} goHome={goHome} />}
    </main>
  );
}

export default App;

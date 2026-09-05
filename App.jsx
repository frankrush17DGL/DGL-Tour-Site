import React, { Component, useEffect, useMemo, useState } from 'react';
import { buildPlayerProfiles, canonicalName, fallbackData, loadLiveData } from './core.jsx';
import HomePage from './Home.jsx';
import RedRoomPage from './RedRoom.jsx';
import AnnalsPage from './Annals.jsx';
import StateTrophiesPage from './StateTrophies.jsx';
import SportsbookPage from './Sportsbook.jsx';
import PlayersPage, { PlayerCardModal } from './Players.jsx';
import RulesPage from './Rules.jsx';

class PageErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('DGL PAGE RENDER FAILED', error, info);
    window.DGL_LAST_RENDER_ERROR = { error, info };
  }

  componentDidUpdate(previousProps) {
    if (previousProps.pageKey !== this.props.pageKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <section className="card" style={{ margin: '24px auto', maxWidth: 760 }}>
          <p className="eyebrow">Page Error</p>
          <h2>This section could not be displayed.</h2>
          <p className="note">{this.state.error?.message || String(this.state.error)}</p>
          <button className="gold-button" onClick={() => { window.location.hash = ''; window.location.reload(); }}>
            RETURN HOME
          </button>
        </section>
      );
    }

    return this.props.children;
  }
}

function pageFromHash() {
  const hash = window.location.hash;
  if (hash === '#red-room') return 'red-room';
  if (hash === '#annals') return 'annals';
  if (hash === '#state-trophies') return 'state-trophies';
  if (hash === '#sportsbook') return 'sportsbook';
  if (hash === '#players' || hash.startsWith('#players/')) return 'players';
  if (hash === '#rules') return 'rules';
  return 'home';
}

function playerFromHash() {
  const match = window.location.hash.match(/^#players\/(.+)$/);
  if (!match) return '';
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function App() {
  const [data, setData] = useState(fallbackData);
  const [syncStatus, setSyncStatus] = useState('Loading live Google Sheets…');
  const [page, setPage] = useState(pageFromHash);
  const [selectedPlayer, setSelectedPlayer] = useState(playerFromHash);

  useEffect(() => {
    const onHash = () => {
      setPage(pageFromHash());
      setSelectedPlayer(playerFromHash());
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const liveData = await loadLiveData();
        if (cancelled) return;

        setData({ ...fallbackData, ...liveData });

        const statuses = Object.values(liveData?.sourceStatus || {});
        const liveCount = statuses.filter(Boolean).length;
        const totalCount = statuses.length;
        setSyncStatus(
          totalCount && liveCount < totalCount
            ? `Live Google Sheets • ${liveCount}/${totalCount} sources connected`
            : 'Live from Google Sheets'
        );
      } catch (error) {
        if (cancelled) return;
        console.error('DGL LIVE DATA FAILED', error);
        window.DGL_LAST_ERROR = error;
        setData(fallbackData);
        setSyncStatus(`Fallback mode • ${error?.message || String(error)}`);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const navigate = target => {
    window.location.hash = target === 'home' ? '' : target;
    setPage(target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goHome = () => navigate('home');
  const goRedRoom = () => navigate('red-room');
  const goAnnals = () => navigate('annals');
  const goStateTrophies = () => navigate('state-trophies');
  const goSportsbook = () => navigate('sportsbook');
  const goPlayers = () => {
    setSelectedPlayer('');
    navigate('players');
  };
  const goPlayerProfile = name => {
    if (!name) return;
    setSelectedPlayer(name);
  };
  const goRules = () => navigate('rules');
  const selectedProfile = useMemo(() => {
    if (!selectedPlayer) return null;
    const target = canonicalName(selectedPlayer);
    return buildPlayerProfiles(data).find(profile => canonicalName(profile.name) === target) || null;
  }, [data, selectedPlayer]);

  let content = null;

  if (page === 'home') {
    content = (
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
            <button onClick={goRules}>Rules</button>
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
          goPlayerProfile={goPlayerProfile}
          goRules={goRules}
        />
      </>
    );
  } else if (page === 'red-room') {
    content = <RedRoomPage data={data} goHome={goHome} goPlayerProfile={goPlayerProfile} />;
  } else if (page === 'annals') {
    content = <AnnalsPage data={data} goHome={goHome} goPlayerProfile={goPlayerProfile} />;
  } else if (page === 'state-trophies') {
    content = <StateTrophiesPage data={data} goHome={goHome} goPlayerProfile={goPlayerProfile} />;
  } else if (page === 'sportsbook') {
    content = <SportsbookPage data={data} goHome={goHome} goPlayerProfile={goPlayerProfile} />;
  } else if (page === 'players') {
    content = <PlayersPage data={data} goHome={goHome} selectedPlayer={selectedPlayer} />;
  } else if (page === 'rules') {
    content = <RulesPage goHome={goHome} />;
  }

  return (
    <main className="page">
      <style>{`
        .dgl-player-name-link {
          all: unset;
          font: inherit;
          color: inherit;
          font-size: inherit;
          font-weight: inherit;
          line-height: inherit;
          letter-spacing: inherit;
          text-transform: inherit;
          cursor: pointer;
          display: inline;
        }
        .dgl-player-name-link:hover { text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 3px; }
        .dgl-player-name-link:focus-visible { outline: 2px solid #f0c75e; outline-offset: 3px; border-radius: 2px; }
      `}</style>
      <PageErrorBoundary pageKey={page}>{content}</PageErrorBoundary>
      {selectedProfile ? <PlayerCardModal profile={selectedProfile} onClose={() => setSelectedPlayer('')} /> : null}
    </main>
  );
}

export default App;

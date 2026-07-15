import React, { useState } from 'react';
import { csvUrl, parseCSV, textCell, stripLabel, cleanEventNo, cleanDate, cleanCourse, cleanTees, cleanTime, yearFromSheetName, numberFromCell, cleanName, canonicalName, findHeaderIndex, findHeaderRow, headerIndex, parsePlayers, playerMeta, normalizeAssetUrl, photoUrlFor, headshotUrlFor, cardColorValue, cardHighlightColor, looksLikeDateText, looksLikeTimeText, parseFutureEvents, fetchFutureEventsSheet, parseThisDayHistory, parseStateTrophies, formatRank, rankBadge, findPot, parseLooseDate, monthDayFromDate, decorateEvents, parseEventColumns, rowHasLabel, numericValuesFromRow, extractPlayerBlocks, findRowInBlock, findRowInBlockAny, lastNumericValue, parseCurrentStandings, strictNumberFromCell, findHistoricalStandingsColumns, isHistoricalPlayerName, nearestHistoricalPlayerName, parseYearStandings, findSheetValueNearLabel, playerSlug, imageCandidates, PlayerPhoto, AssetPhoto, parseAnnalsRecords, buildAnnalsYearsFromRecords, buildAnnalsYears, buildHistoryMoments, fetchFirstAvailableSheet, normalizeHeader, parsePercentCell, parseSportsbook, formatOdds, formatPercent, sportsbookInsights, safeFetchText, safeParse, loadLiveData, money, medal, initials, netNumber, formatNet, tierForNet, ordinal, rankedRedRounds, formatCommitment, recordIsFirstPlace, buildPlayerProfiles, SHEET_ID, CURRENT_YEAR_SHEET, HISTORY_SHEETS, SPORTSBOOK_SHEETS, ANNALS_SHEETS, PLAYERS_SHEETS, STATE_TROPHY_SHEETS, THIS_DAY_SHEETS, FUTURE_EVENTS_SHEETS, HOSTESS_SOURCES, fallbackData } from './core.jsx';


function EventCard({ event }) {
  const countdown = event.status === 'Upcoming'
    ? typeof event.daysAway === 'number'
      ? event.daysAway === 0
        ? 'Today'
        : event.daysAway > 0
          ? `${event.daysAway} days away`
          : 'Scheduled'
      : 'Scheduled'
    : 'Completed';

  return (
  <div className={'event ' + (event.status === 'Past' ? 'event-past' : 'event-upcoming')}>
    <span>{event.status === 'Past' ? 'Recent Result' : 'Upcoming'} • Event {event.event}</span>

    <strong>{event.course}</strong>

    <small>
      {event.date}
      {event.time ? ' • ' + event.time : ''}
    </small>

    {formatCommitment(event.notes) ? <small className="commit-count">{formatCommitment(event.notes)}</small> : null}

    <em>{countdown}</em>
  </div>
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

function HomePage({ data, syncStatus, goRedRoom, goAnnals, goStateTrophies, goSportsbook, goPlayers }) {
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

        <article className="card events-card tournament-center-v106" id="events">
          <div className="section-head">
            <div>
              <p className="eyebrow">Tournament Center</p>
              <h2>{featuredEvent.course || 'Next Event TBD'}</h2>
            </div>
            {featuredEvent.event ? <span className="updated">EVENT {featuredEvent.event}</span> : null}
          </div>

          {featuredEvent.course ? (
            <>
              <div className="tournament-hero-v106">
                {featuredEvent.photoUrl ? (
                  <AssetPhoto src={featuredEvent.photoUrl} alt={featuredEvent.course} className="tournament-course-photo-v106" fallback="⛳" />
                ) : (
                  <div className="tournament-course-placeholder-v106"><span>⛳</span><strong>{featuredEvent.course}</strong></div>
                )}
                <div className="tournament-overlay-v106">
                  <span>{featuredEvent.date || 'Date TBD'}{featuredEvent.time ? ` • ${featuredEvent.time}` : ''}</span>
                  <strong>{typeof featuredEvent.daysAway === 'number' && featuredEvent.daysAway >= 0 ? (featuredEvent.daysAway === 0 ? 'TEEING OFF TODAY' : `${featuredEvent.daysAway} DAYS TO TEE OFF`) : 'SCHEDULED'}</strong>
                </div>
              </div>

              <div className="tournament-facts-v106">
                <div><span>Favorite</span><b>{insights.favorite.player || leader.name || 'TBD'}</b><em>{insights.favorite.odds ? formatOdds(insights.favorite.odds) : ''}</em></div>
                <div><span>Best Value</span><b>{insights.bestValue.player || 'TBD'}</b><em>{insights.bestValue.valueLabel || ''}</em></div>
                <div><span>Field</span><b>{formatCommitment(featuredEvent.notes) || 'TBD'}</b><em>committed</em></div>
              </div>

              {(featuredEvent.courseDetails || featuredEvent.courseWebsite || featuredEvent.googleMap) ? (
                <div className="tournament-extra-v107">
                  {featuredEvent.courseDetails ? (
                    <div className="tournament-course-details-v107">
                      <span>Course Details</span>
                      <strong>{featuredEvent.courseDetails}</strong>
                    </div>
                  ) : null}
                  <div className="tournament-actions-v107">
                    {featuredEvent.courseWebsite ? <a href={featuredEvent.courseWebsite} target="_blank" rel="noreferrer">Visit Course Website</a> : null}
                    {featuredEvent.googleMap ? <a href={featuredEvent.googleMap} target="_blank" rel="noreferrer">Open Google Maps</a> : null}
                  </div>
                </div>
              ) : null}

              {upcomingEvents.slice(1, 4).length ? (
                <div className="tournament-next-list-v106">
                  <p className="eyebrow">Also Upcoming</p>
                  {upcomingEvents.slice(1, 4).map(event => <EventCard event={event} key={'next-' + event.event + event.course} />)}
                </div>
              ) : null}
            </>
          ) : <p className="note">No future events currently entered.</p>}

          <style>{`
            .tournament-center-v106{grid-column:1/-1;padding:20px}
            .tournament-hero-v106{position:relative;min-height:280px;border-radius:20px;overflow:hidden;border:1px solid rgba(226,184,73,.3);background:#100b08}
            .tournament-course-photo-v106{display:block;width:100%;height:clamp(280px,42vw,480px);object-fit:cover}
            .tournament-course-placeholder-v106{height:clamp(280px,42vw,480px);display:grid;place-content:center;text-align:center;background:radial-gradient(circle at 50% 35%,rgba(172,129,39,.25),transparent 35%),linear-gradient(145deg,#21170d,#070605);color:#f5dfaa}
            .tournament-course-placeholder-v106 span{font-size:64px}.tournament-course-placeholder-v106 strong{font-size:clamp(24px,5vw,48px);margin-top:10px}
            .tournament-overlay-v106{position:absolute;inset:auto 0 0;padding:54px 18px 18px;background:linear-gradient(transparent,rgba(0,0,0,.9));display:flex;align-items:end;justify-content:space-between;gap:12px;color:#fff}
            .tournament-overlay-v106 span{font-weight:700}.tournament-overlay-v106 strong{color:#f0c75e;letter-spacing:.1em;font-size:12px}
            .tournament-facts-v106{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:12px}
            .tournament-facts-v106>div{padding:14px;border-radius:15px;border:1px solid rgba(226,184,73,.2);background:rgba(0,0,0,.28);display:grid;gap:3px}
            .tournament-facts-v106 span{font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:#d7ad50;font-weight:800}.tournament-facts-v106 b{font-size:18px}.tournament-facts-v106 em{font-style:normal;color:#c8bfae;font-size:12px}
            .tournament-extra-v107{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-top:12px;padding:14px;border-radius:15px;border:1px solid rgba(226,184,73,.2);background:rgba(0,0,0,.24)}
            .tournament-course-details-v107{display:grid;gap:3px}.tournament-course-details-v107 span{font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:#d7ad50;font-weight:800}.tournament-course-details-v107 strong{color:#fff;font-size:15px}
            .tournament-actions-v107{display:flex;flex-wrap:wrap;gap:8px}.tournament-actions-v107 a{display:inline-flex;align-items:center;justify-content:center;min-height:42px;padding:10px 14px;border-radius:999px;border:1px solid rgba(240,199,94,.5);background:linear-gradient(180deg,rgba(240,199,94,.2),rgba(111,73,12,.25));color:#ffe6a2;text-decoration:none;font-size:11px;font-weight:900;letter-spacing:.06em;text-transform:uppercase}
            .tournament-next-list-v106{margin-top:18px}.tournament-next-list-v106 .event-list{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
            @media(max-width:760px){.tournament-center-v106{padding:14px}.tournament-overlay-v106{align-items:start;flex-direction:column}.tournament-facts-v106{grid-template-columns:1fr}.tournament-extra-v107{align-items:stretch;flex-direction:column}.tournament-actions-v107 a{flex:1}.tournament-next-list-v106 .event-list{grid-template-columns:1fr}}
          `}</style>
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

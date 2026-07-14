import React, { useState } from 'react';
import { csvUrl, parseCSV, textCell, stripLabel, cleanEventNo, cleanDate, cleanCourse, cleanTees, cleanTime, yearFromSheetName, numberFromCell, cleanName, canonicalName, findHeaderIndex, findHeaderRow, headerIndex, parsePlayers, playerMeta, normalizeAssetUrl, photoUrlFor, headshotUrlFor, cardColorValue, cardHighlightColor, looksLikeDateText, looksLikeTimeText, parseFutureEvents, fetchFutureEventsSheet, parseThisDayHistory, parseStateTrophies, formatRank, rankBadge, findPot, parseLooseDate, monthDayFromDate, decorateEvents, parseEventColumns, rowHasLabel, numericValuesFromRow, extractPlayerBlocks, findRowInBlock, findRowInBlockAny, lastNumericValue, parseCurrentStandings, strictNumberFromCell, findHistoricalStandingsColumns, isHistoricalPlayerName, nearestHistoricalPlayerName, parseYearStandings, findSheetValueNearLabel, playerSlug, imageCandidates, PlayerPhoto, AssetPhoto, parseAnnalsRecords, buildAnnalsYearsFromRecords, buildAnnalsYears, buildHistoryMoments, fetchFirstAvailableSheet, normalizeHeader, parsePercentCell, parseSportsbook, formatOdds, formatPercent, sportsbookInsights, safeFetchText, safeParse, loadLiveData, money, medal, initials, netNumber, formatNet, tierForNet, ordinal, rankedRedRounds, formatCommitment, recordIsFirstPlace, buildPlayerProfiles, SHEET_ID, CURRENT_YEAR_SHEET, HISTORY_SHEETS, SPORTSBOOK_SHEETS, ANNALS_SHEETS, PLAYERS_SHEETS, STATE_TROPHY_SHEETS, THIS_DAY_SHEETS, FUTURE_EVENTS_SHEETS, HOSTESS_SOURCES, fallbackData } from './core.js';

function cardEdition(profile) {
  if (profile.bestFinish === 1) return { label: 'Gold Champion', className: 'champion' };
  if (profile.stateTrophyWins > 0) return { label: 'Trophy Foil', className: 'trophy' };
  if (profile.redRoomCount > 0) return { label: 'Red Parallel', className: 'redroom' };
  if (profile.isRookie) return { label: 'Rookie Issue', className: 'rookie' };
  return { label: 'Base Set', className: 'base' };
}

function splitCardName(name = '') {
  const parts = String(name).trim().split(/\s+/);
  if (parts.length <= 1) return [name, ''];
  return [parts[0], parts.slice(1).join(' ')];
}

function PlayerTradingCard({ profile }) {
  const [flipped, setFlipped] = useState(false);
  const [first, last] = splitCardName(profile.name || profile.fullName || 'DGL Player');
  const edition = cardEdition(profile);
  const title = profile.playerTitle || profile.nickname || edition.label || 'DGL Tour';
  const cardNo = String(profile.cardNumber || profile.rank || '1').replace(/^0+/, '').replace(/^#/, '') || '1';
  const cardColor = cardColorValue(profile.cardColor);
  const accent = cardHighlightColor(profile.cardColor);
  const rankDisplay = profile.rank ? `#${profile.rank}` : `#${cardNo}`;

  return (
    <button
      type="button"
      className={'dgl84-card ' + (flipped ? 'is-flipped ' : '') + edition.className}
      onClick={() => setFlipped(value => !value)}
      aria-label={`Flip ${profile.name} official DGL card`}
      style={{ '--card-color': cardColor, '--card-accent': accent }}
    >
      <div className="dgl84-card-rotor">
        <div className="dgl84-card-face dgl84-card-front">
          <div className="dgl84-card-paper">
            <div className="dgl84-top-ribbon">
              <span>DOJO GOLF LEAGUE</span>
              <b>{edition.label}</b>
            </div>

            <div className="dgl84-photo-box">
              <PlayerPhoto name={profile.name} src={profile.photoUrl || profile.headshotUrl} className="dgl84-action-photo" />
              <div className="dgl84-card-number">{rankDisplay}</div>
              <div className="dgl84-dgl-mark"><strong>DGL</strong><span>EST. 2021</span></div>
            </div>

            <div className="dgl84-name-banner">
              <div>
                <h2><span>{first}</span>{last ? <span>{last}</span> : null}</h2>
                <p>★ {String(title).toUpperCase()} ★</p>
              </div>
            </div>

            <div className="dgl84-mini-portrait">
              <PlayerPhoto name={profile.name} src={profile.headshotUrl || profile.photoUrl} className="dgl84-headshot" />
            </div>

            <div className="dgl84-stat-footer">
              <div><small>Rank</small><b>{profile.rank || '—'}</b></div>
              <div><small>Pts</small><b>{profile.points != null ? profile.points : '—'}</b></div>
              <div><small>Red</small><b>{profile.redRoomCount || 0}</b></div>
            </div>
          </div>
        </div>

        <div className="dgl84-card-face dgl84-card-back">
          <div className="dgl84-back-paper">
            <div className="dgl84-back-title">
              <div className="dgl84-back-logo">DGL</div>
              <div>
                <p>Official Player Record</p>
                <h3>{profile.fullName || profile.name}</h3>
                <span>{title} • Card #{cardNo}</span>
              </div>
            </div>

            <div className="dgl84-back-columns">
              <section>
                <h4>Career Stats</h4>
                <dl>
                  <div><dt>Current Rank</dt><dd>{profile.rank || '—'}</dd></div>
                  <div><dt>DGL Points</dt><dd>{profile.points != null ? profile.points : '—'}</dd></div>
                  <div><dt>DGLFC Apps</dt><dd>{profile.dglfcAppearances || 0}</dd></div>
                  <div><dt>Best DGLFC</dt><dd>{profile.bestFinish ? ordinal(profile.bestFinish) : '—'}</dd></div>
                  <div><dt>Red Rounds</dt><dd>{profile.redRoomCount || 0}</dd></div>
                  <div><dt>Best Net</dt><dd>{profile.bestNet ? formatNet(profile.bestNet) : '—'}</dd></div>
                  <div><dt>Trophies</dt><dd>{profile.stateTrophyWins || 0}</dd></div>
                  <div><dt>Odds</dt><dd>{profile.odds ? formatOdds(profile.odds) : '—'}</dd></div>
                </dl>
              </section>

              <section>
                <h4>Player Facts</h4>
                <dl>
                  <div><dt>DOB</dt><dd>{profile.dob || '—'}</dd></div>
                  <div><dt>Height</dt><dd>{profile.height || '—'}</dd></div>
                  <div><dt>Throws</dt><dd>{profile.handedness || '—'}</dd></div>
                  <div><dt>Home</dt><dd>{profile.hometown || '—'}</dd></div>
                  <div><dt>Job</dt><dd>{profile.occupation || '—'}</dd></div>
                  <div><dt>Course</dt><dd>{profile.favoriteCourse || '—'}</dd></div>
                  <div><dt>Walk-up</dt><dd>{profile.walkUpSong || '—'}</dd></div>
                  <div><dt>Joined</dt><dd>{profile.debutYear || '—'}</dd></div>
                </dl>
              </section>
            </div>

            <div className="dgl84-scouting">
              <h4>Scouting Report</h4>
              <p>{profile.bio || 'Bio pending. Add notes in the Players tab to complete the back of this card.'}</p>
            </div>

            <div className="dgl84-back-foot"><span>Dojo Golf League</span><span>Est. 2021</span></div>
          </div>
        </div>
      </div>
    </button>
  );
}


function PlayersPage({ data, goHome }) {
  const profiles = buildPlayerProfiles(data);

  return (
    <section className="red-room-page players-page card-gallery-page">
      <div className="red-page-bg"></div>
      <div className="red-page-vignette"></div>
      <button onClick={goHome} className="back-button">← Back to Home</button>

      <div className="players-card-set-title compact-card-title">
        <p className="eyebrow">DGL PLAYER SET</p>
        <h1>Tour <span>Cards</span></h1>
      </div>


      <div className="dgl84-card-grid">
        {profiles.length ? profiles.map(profile => (
          <PlayerTradingCard profile={profile} key={profile.name} />
        )) : (
          <article className="red-full-table"><p className="note">No player profiles found. Add players to the Players tab.</p></article>
        )}
      </div>
    </section>
  );
}



export default PlayersPage;

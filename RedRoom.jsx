import React, { useState } from 'react';
import { csvUrl, parseCSV, textCell, stripLabel, cleanEventNo, cleanDate, cleanCourse, cleanTees, cleanTime, yearFromSheetName, numberFromCell, cleanName, canonicalName, findHeaderIndex, findHeaderRow, headerIndex, parsePlayers, playerMeta, normalizeAssetUrl, photoUrlFor, headshotUrlFor, cardColorValue, cardHighlightColor, looksLikeDateText, looksLikeTimeText, parseFutureEvents, fetchFutureEventsSheet, parseThisDayHistory, parseStateTrophies, formatRank, rankBadge, findPot, parseLooseDate, monthDayFromDate, decorateEvents, parseEventColumns, rowHasLabel, numericValuesFromRow, extractPlayerBlocks, findRowInBlock, findRowInBlockAny, lastNumericValue, parseCurrentStandings, strictNumberFromCell, findHistoricalStandingsColumns, isHistoricalPlayerName, nearestHistoricalPlayerName, parseYearStandings, findSheetValueNearLabel, playerSlug, imageCandidates, PlayerPhoto, AssetPhoto, parseAnnalsRecords, buildAnnalsYearsFromRecords, buildAnnalsYears, buildHistoryMoments, fetchFirstAvailableSheet, normalizeHeader, parsePercentCell, parseSportsbook, formatOdds, formatPercent, sportsbookInsights, safeFetchText, safeParse, loadLiveData, money, medal, initials, netNumber, formatNet, tierForNet, ordinal, rankedRedRounds, formatCommitment, recordIsFirstPlace, buildPlayerProfiles, SHEET_ID, CURRENT_YEAR_SHEET, HISTORY_SHEETS, SPORTSBOOK_SHEETS, ANNALS_SHEETS, PLAYERS_SHEETS, STATE_TROPHY_SHEETS, THIS_DAY_SHEETS, FUTURE_EVENTS_SHEETS, HOSTESS_SOURCES, fallbackData } from '../lib/core.js';

function HostessImage({ className }) {
  const [sourceIndex, setSourceIndex] = useState(0);
  const src = HOSTESS_SOURCES[sourceIndex];

  if (!src) return null;

  return (
    <img
      src={src}
      alt="Red Room Hostess"
      className={className}
      onError={() => setSourceIndex(sourceIndex + 1)}
    />
  );
}


function RedRoomPage({ data, goHome }) {
  const rankedRounds = rankedRedRounds(data.redRounds);
  const featuredRedRound = rankedRounds[0] || {};
  const elite = rankedRounds.filter(round => round.netValue <= -6);
  const excellence = rankedRounds.filter(round => round.netValue <= -4 && round.netValue > -6);
  const gallery = rankedRounds;
  const [selectedRound, setSelectedRound] = useState(null);
  let lastTier = '';

  return (
    <section className="red-room-page">
      <div className="red-page-bg"></div>
      <div className="red-page-vignette"></div>
      <button onClick={goHome} className="back-button">← Back to Home</button>

      <div className="red-page-hero">
        <div className="red-page-copy">
          <p className="eyebrow">THE DGL HALL OF FAME</p>
          <h1>Red Room <span>Royalty</span></h1>
          <p>The greatest rounds in DGL history.</p>
          <p className="red-subline">Elite Table • Excellence Lounge • Members Gallery</p>
        </div>
        <HostessImage className="red-page-hostess" />
      </div>

      <div className="red-page-layout">
        <article className="royalty-card">
          <p className="eyebrow">👑 Red Room Royalty</p>
          <h2>{featuredRedRound.player}</h2>
          <strong>Net {featuredRedRound.displayNet}</strong>
          <span>{featuredRedRound.course}</span>
          <small>{featuredRedRound.date} • {featuredRedRound.score}</small>
        </article>

        <article className="tier-card">
          <p className="eyebrow">Red Room Tiers</p>
          <div className="tier-row"><strong>🔴 Elite Table</strong><span>Net -6.0 or better</span><em>{elite.length}</em></div>
          <div className="tier-row"><strong>🥃 Excellence Lounge</strong><span>Net -4.0 to -5.99</span><em>{excellence.length}</em></div>
          <div className="tier-row"><strong>📖 Members Gallery</strong><span>Every Red Round ever recorded</span><em>{gallery.length}</em></div>
        </article>

        <article className="red-full-table">
          <div className="panel-head">
            <div>
              <p className="eyebrow">All-Time Red Rounds</p>
              <strong>Live Hall of Fame</strong>
            </div>
            <span>{rankedRounds.length} entries</span>
          </div>

          <div className="red-table-full">
            {rankedRounds.map((round, index) => {
              const showDivider = round.tier !== lastTier;
              lastTier = round.tier;

              return (
                <React.Fragment key={round.player + round.course + round.date + index}>
                  {showDivider && <div className="tier-divider">{round.tier}</div>}
                  <button
                    type="button"
                    className={'red-row-full red-round-clickable ' + (round.photoUrl ? 'has-photo' : '')}
                    onClick={() => round.photoUrl ? setSelectedRound(round) : null}
                    aria-label={round.photoUrl ? `Open photo for ${round.player} ${round.displayNet}` : `${round.player} ${round.displayNet}`}
                  >
                    <span>{round.displayRankLabel}</span>
                    <strong>{round.player}</strong>
                    <small>{round.course}</small>
                    <small>{round.date}</small>
                    <em>{round.displayNet}</em>
                    <b>{round.tier}</b>
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        </article>
      </div>

      {selectedRound?.photoUrl ? (
        <div className="media-modal" role="dialog" aria-modal="true" onClick={() => setSelectedRound(null)}>
          <div className="media-modal-card" onClick={event => event.stopPropagation()}>
            <button type="button" className="media-modal-close" onClick={() => setSelectedRound(null)}>×</button>
            <img src={selectedRound.photoUrl} alt={`${selectedRound.player} red round`} />
            <div className="media-modal-caption">
              <strong>{selectedRound.player}</strong>
              <span>{selectedRound.course} • {selectedRound.date} • Net {selectedRound.displayNet}</span>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}



export default RedRoomPage;

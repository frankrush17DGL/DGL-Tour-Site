import React, { useState } from 'react';
import { csvUrl, parseCSV, textCell, stripLabel, cleanEventNo, cleanDate, cleanCourse, cleanTees, cleanTime, yearFromSheetName, numberFromCell, cleanName, canonicalName, findHeaderIndex, findHeaderRow, headerIndex, parsePlayers, playerMeta, normalizeAssetUrl, photoUrlFor, headshotUrlFor, cardColorValue, cardHighlightColor, looksLikeDateText, looksLikeTimeText, parseFutureEvents, fetchFutureEventsSheet, parseThisDayHistory, parseStateTrophies, formatRank, rankBadge, findPot, parseLooseDate, monthDayFromDate, decorateEvents, parseEventColumns, rowHasLabel, numericValuesFromRow, extractPlayerBlocks, findRowInBlock, findRowInBlockAny, lastNumericValue, parseCurrentStandings, strictNumberFromCell, findHistoricalStandingsColumns, isHistoricalPlayerName, nearestHistoricalPlayerName, parseYearStandings, findSheetValueNearLabel, playerSlug, imageCandidates, PlayerPhoto, AssetPhoto, parseAnnalsRecords, buildAnnalsYearsFromRecords, buildAnnalsYears, buildHistoryMoments, fetchFirstAvailableSheet, normalizeHeader, parsePercentCell, parseSportsbook, formatOdds, formatPercent, sportsbookInsights, safeFetchText, safeParse, loadLiveData, money, medal, initials, netNumber, formatNet, tierForNet, ordinal, rankedRedRounds, formatCommitment, recordIsFirstPlace, buildPlayerProfiles, SHEET_ID, CURRENT_YEAR_SHEET, HISTORY_SHEETS, SPORTSBOOK_SHEETS, ANNALS_SHEETS, PLAYERS_SHEETS, STATE_TROPHY_SHEETS, THIS_DAY_SHEETS, FUTURE_EVENTS_SHEETS, HOSTESS_SOURCES, fallbackData } from '../lib/core.js';

function AnnalsPage({ data, goHome }) {
  const years = data.annalsYears || [];
  const [selectedYear, setSelectedYear] = useState(years[0]?.year || '2025');
  const yearData = years.find(item => item.year === selectedYear) || years[0] || {
    year: selectedYear,
    standings: [],
    events: [],
    championship: [],
    champion: 'Add champion to Annals',
    topPointsPlayer: '—',
    topPoints: 0
  };

  const podium = (yearData.championship || []).slice(0, 3);
  const fullResults = yearData.championship || [];

  useEffect(() => {
    if (years.length && !years.some(item => item.year === selectedYear)) {
      setSelectedYear(years[0].year);
    }
  }, [years, selectedYear]);

  return (
    <section className="red-room-page annals-page annals-v2">
      <div className="red-page-bg"></div>
      <div className="red-page-vignette"></div>
      <button onClick={goHome} className="back-button">← Back to Home</button>

      <div className="red-page-hero annals-hero">
        <div className="red-page-copy">
          <p className="eyebrow">THE DGL ARCHIVES</p>
          <h1>Annals of <span>History</span></h1>
          <p>The official year-by-year record book of the Dojo Golf League.</p>
          <p className="red-subline">Fall Classic Results • Regular Season Points • Events • Pedigree</p>
        </div>
      </div>

      <div className="annals-year-strip">
        {years.map(year => (
          <button
            key={year.year}
            onClick={() => setSelectedYear(year.year)}
            className={'annals-year-pill ' + (year.year === yearData.year ? 'active' : '')}
          >
            {year.year}
          </button>
        ))}
      </div>

      <div className="annals-dashboard">
        <article className="annals-champion-card">
          <p className="eyebrow">{yearData.year} DGLFC</p>
          <h2>{yearData.champion}</h2>
          <span>Champion</span>
          <div className="annals-podium">
            {podium.map(result => (
              <div className="annals-podium-player" key={result.year + result.player}>
                <PlayerPhoto name={result.player} src={photoUrlFor(data, result.player)} />
                <strong>#{result.finish}</strong>
                <span>{result.player}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="annals-stat-card">
          <p className="eyebrow">Regular Season King</p>
          <h3>{yearData.topPointsPlayer}</h3>
          <strong>{yearData.topPoints} pts</strong>
          <small>Highest regular-season total pulled from the season standings tab.</small>
        </article>

        <article className="annals-stat-card">
          <p className="eyebrow">Events Logged</p>
          <h3>{yearData.events.length}</h3>
          <strong>Tour Stops</strong>
          <small>Built from the annual standings sheet schedule.</small>
        </article>
      </div>

      <div className="red-page-layout">
        <article className="red-full-table annals-results-card">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Dojo Golf League Fall Classic</p>
              <strong>{yearData.year} Final Results</strong>
            </div>
            <span>{fullResults.length} players</span>
          </div>

          <div className="red-table-full">
            {fullResults.length ? fullResults.map(result => (
              <div className="red-row-full annals-result-row" key={result.year + result.player}>
                <span>#{result.finish}</span>
                <strong>{result.player}</strong>
                <small>{result.firstCut ? `1st Cut: ${result.firstCut}` : '1st Cut: —'}</small>
                <small>{result.secondCut ? `2nd Cut: ${result.secondCut}` : '2nd Cut: —'}</small>
                <em>{result.weighted ? result.weighted.toFixed(1) : '—'}</em>
                <b>Pedigree</b>
              </div>
            )) : (
              <p className="note">No Annals records found for this year yet. Add Year, Player, Finish, Made 1st Cut, and Made 2nd Cut to the Annals tab.</p>
            )}
          </div>
        </article>

        <article className="red-full-table annals-results-card">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Regular Season Points</p>
              <strong>{yearData.year} Standings</strong>
            </div>
            <span>{yearData.standings.length} golfers</span>
          </div>

          <div className="red-table-full">
            {yearData.standings.length ? yearData.standings.slice(0, 12).map(player => (
              <div className="red-row-full" key={yearData.year + player.name}>
                <span>#{player.rank}</span>
                <strong>{player.name}</strong>
                <small>Regular Season</small>
                <small>{yearData.year}</small>
                <em>{player.points}</em>
                <b>PTS</b>
              </div>
            )) : (
              <p className="note">No standings found for this season yet.</p>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}


export default AnnalsPage;

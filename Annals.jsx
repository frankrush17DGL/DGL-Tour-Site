import React, { useEffect, useState } from 'react';
import { csvUrl, parseCSV, textCell, stripLabel, cleanEventNo, cleanDate, cleanCourse, cleanTees, cleanTime, yearFromSheetName, numberFromCell, cleanName, canonicalName, findHeaderIndex, findHeaderRow, headerIndex, parsePlayers, playerMeta, normalizeAssetUrl, photoUrlFor, headshotUrlFor, cardColorValue, cardHighlightColor, looksLikeDateText, looksLikeTimeText, parseFutureEvents, fetchFutureEventsSheet, parseThisDayHistory, parseStateTrophies, formatRank, rankBadge, findPot, parseLooseDate, monthDayFromDate, decorateEvents, parseEventColumns, rowHasLabel, numericValuesFromRow, extractPlayerBlocks, findRowInBlock, findRowInBlockAny, lastNumericValue, parseCurrentStandings, strictNumberFromCell, findHistoricalStandingsColumns, isHistoricalPlayerName, nearestHistoricalPlayerName, parseYearStandings, findSheetValueNearLabel, playerSlug, imageCandidates, PlayerPhoto, AssetPhoto, parseAnnalsRecords, buildAnnalsYearsFromRecords, buildAnnalsYears, buildHistoryMoments, fetchFirstAvailableSheet, normalizeHeader, parsePercentCell, parseSportsbook, formatOdds, formatPercent, sportsbookInsights, safeFetchText, safeParse, loadLiveData, money, medal, initials, netNumber, formatNet, tierForNet, ordinal, rankedRedRounds, formatCommitment, recordIsFirstPlace, buildPlayerProfiles, SHEET_ID, CURRENT_YEAR_SHEET, HISTORY_SHEETS, SPORTSBOOK_SHEETS, ANNALS_SHEETS, PLAYERS_SHEETS, STATE_TROPHY_SHEETS, THIS_DAY_SHEETS, FUTURE_EVENTS_SHEETS, HOSTESS_SOURCES, fallbackData } from './core.jsx';

const SEASON_TOTALS = {
  '2025': { tourStops: 19, regularSeasonRounds: 52, playoffRounds: 27, totalRounds: 79 },
  '2024': { tourStops: 25, regularSeasonRounds: 71, playoffRounds: 24, totalRounds: 95 },
  '2023': { tourStops: 34, regularSeasonRounds: 94, playoffRounds: 27, totalRounds: 121 },
  '2022': { tourStops: 25, regularSeasonRounds: 88, playoffRounds: 30, totalRounds: 118 },
  '2021': { tourStops: 32, regularSeasonRounds: 140, playoffRounds: 21, totalRounds: 161 }
};

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
  const seasonTotals = SEASON_TOTALS[yearData.year];

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

        <article className="annals-stat-card annals-volume-card">
          <p className="eyebrow">Season Volume</p>
          <div className="annals-volume-lead">
            <h3>{seasonTotals?.tourStops ?? yearData.events.length}</h3>
            <strong>Tour Stops</strong>
          </div>
          {seasonTotals ? (
            <div className="annals-volume-breakdown">
              <div><b>{seasonTotals.regularSeasonRounds}</b><span>Regular Season</span></div>
              <div><b>{seasonTotals.playoffRounds}</b><span>Playoffs</span></div>
              <div><b>{seasonTotals.totalRounds}</b><span>Total Rounds</span></div>
            </div>
          ) : (
            <small>Built from the annual standings sheet schedule.</small>
          )}
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
      <style>{`
        .annals-volume-card {
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .annals-volume-card::after {
          content: "";
          position: absolute;
          right: -54px;
          bottom: -74px;
          width: 180px;
          height: 180px;
          border: 1px solid rgba(216, 177, 92, .16);
          border-radius: 50%;
          box-shadow: 0 0 55px rgba(191, 133, 37, .08);
          pointer-events: none;
        }
        .annals-volume-lead {
          display: flex;
          align-items: baseline;
          flex-wrap: wrap;
          gap: 10px 14px;
        }
        .annals-volume-lead h3 {
          margin: 0;
          font-size: clamp(2.65rem, 8vw, 4.25rem);
          line-height: .92;
          letter-spacing: -.04em;
        }
        .annals-volume-lead strong {
          color: #f2cb72;
          font-size: clamp(1rem, 3.8vw, 1.35rem);
          line-height: 1.05;
          letter-spacing: .08em;
          text-transform: uppercase;
        }
        .annals-volume-breakdown {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
          margin-top: 2px;
        }
        .annals-volume-breakdown div {
          min-width: 0;
          padding: 11px 8px 10px;
          border: 1px solid rgba(220, 181, 96, .18);
          border-radius: 12px;
          background: rgba(255, 255, 255, .025);
        }
        .annals-volume-breakdown b,
        .annals-volume-breakdown span {
          display: block;
        }
        .annals-volume-breakdown b {
          color: #fff8e8;
          font-size: 1.15rem;
          line-height: 1;
          margin-bottom: 6px;
        }
        .annals-volume-breakdown span {
          color: rgba(255, 248, 232, .68);
          font-size: .68rem;
          line-height: 1.2;
          letter-spacing: .035em;
          text-transform: uppercase;
        }
        @media (max-width: 520px) {
          .annals-volume-card { gap: 12px; }
          .annals-volume-lead {
            align-items: center;
            gap: 10px;
          }
          .annals-volume-lead h3 { font-size: 3.1rem; }
          .annals-volume-lead strong { max-width: none; }
          .annals-volume-breakdown div { padding: 10px 6px 9px; }
          .annals-volume-breakdown span {
            font-size: .61rem;
            letter-spacing: .02em;
          }
        }
      `}</style>
    </section>
  );
}


export default AnnalsPage;

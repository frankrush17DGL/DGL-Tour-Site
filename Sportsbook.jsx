import React, { useState } from 'react';
import { csvUrl, parseCSV, textCell, stripLabel, cleanEventNo, cleanDate, cleanCourse, cleanTees, cleanTime, yearFromSheetName, numberFromCell, cleanName, canonicalName, findHeaderIndex, findHeaderRow, headerIndex, parsePlayers, playerMeta, normalizeAssetUrl, photoUrlFor, headshotUrlFor, cardColorValue, cardHighlightColor, looksLikeDateText, looksLikeTimeText, parseFutureEvents, fetchFutureEventsSheet, parseThisDayHistory, parseStateTrophies, formatRank, rankBadge, findPot, parseLooseDate, monthDayFromDate, decorateEvents, parseEventColumns, rowHasLabel, numericValuesFromRow, extractPlayerBlocks, findRowInBlock, findRowInBlockAny, lastNumericValue, parseCurrentStandings, strictNumberFromCell, findHistoricalStandingsColumns, isHistoricalPlayerName, nearestHistoricalPlayerName, parseYearStandings, findSheetValueNearLabel, playerSlug, imageCandidates, PlayerPhoto, AssetPhoto, parseAnnalsRecords, buildAnnalsYearsFromRecords, buildAnnalsYears, buildHistoryMoments, fetchFirstAvailableSheet, normalizeHeader, parsePercentCell, parseSportsbook, formatOdds, formatPercent, sportsbookInsights, safeFetchText, safeParse, loadLiveData, money, medal, initials, netNumber, formatNet, tierForNet, ordinal, rankedRedRounds, formatCommitment, recordIsFirstPlace, buildPlayerProfiles, SHEET_ID, CURRENT_YEAR_SHEET, HISTORY_SHEETS, SPORTSBOOK_SHEETS, ANNALS_SHEETS, PLAYERS_SHEETS, STATE_TROPHY_SHEETS, THIS_DAY_SHEETS, FUTURE_EVENTS_SHEETS, HOSTESS_SOURCES, fallbackData } from './core.jsx';

function valueTierLabel(value, player) {
  const raw = String(value || '').trim();
  if (raw) return raw.replace(/^[^A-Za-z]+\s*/, '').trim() || raw;
  const winPct = Number(player?.winPercent || player?.winPct || player?.win || 0);
  return winPct <= 0 ? 'Avoid' : 'Fair';
}


function movementDisplay(player) {
  const raw = String(player?.movement || '').trim();
  const current = numberFromCell(player?.odds);
  const previous = numberFromCell(player?.lastWeekOdds);

  let label = raw;
  let direction = '';

  if (!label && current && previous) {
    if (current < previous) label = `▲ ${previous - current}`;
    else if (current > previous) label = `▼ ${current - previous}`;
    else label = '—';
  }

  if (/▲|up|better|\+/i.test(label) && !/^\s*▼/.test(label)) direction = 'up';
  else if (/▼|down|worse/i.test(label)) direction = 'down';
  else direction = 'flat';

  const emoji = direction === 'up' ? '📈' : direction === 'down' ? '📉' : '➖';
  const text = label || '—';
  return `${emoji} ${text}`;
}

function movementClass(player) {
  const text = movementDisplay(player);
  if (text.includes('📈')) return 'move-up';
  if (text.includes('📉')) return 'move-down';
  return 'move-flat';
}

function movementDetails(player) {
  const raw = String(player?.movement || '').trim();
  const current = numberFromCell(player?.odds);
  const previous = numberFromCell(player?.lastWeekOdds);

  let numericMove = 0;
  let label = raw;

  if (current && previous) {
    numericMove = previous - current;
    if (!label) {
      if (numericMove > 0) label = `Shortened ${numericMove}`;
      else if (numericMove < 0) label = `Drifted ${Math.abs(numericMove)}`;
      else label = 'No change';
    }
  }

  if (!label) label = 'No change';

  const lower = label.toLowerCase();
  const isUp = numericMove > 0 || /▲|up|short|better|steam|\+/.test(lower);
  const isDown = numericMove < 0 || /▼|down|drift|worse/.test(lower);

  if (isUp && !isDown) return { label, emoji: '📈', className: 'up', word: 'Steam' };
  if (isDown) return { label, emoji: '📉', className: 'down', word: 'Drift' };
  return { label: label === '—' ? 'No change' : label, emoji: '➖', className: 'flat', word: 'Hold' };
}

function valueTierClass(value) {
  const label = String(value || '').toLowerCase();
  if (label.includes('best value')) return 'strong';
  if (label.includes('value')) return 'value';
  if (label.includes('overpriced')) return 'over';
  if (label.includes('avoid')) return 'avoid';
  return 'fair';
}


function SportsbookPage({ data, goHome }) {
  const board = data.sportsbook || [];
  const insights = sportsbookInsights(board);
  const favorite = insights.favorite || board[0] || {};
  const value = insights.bestValue || {};
  const ceiling = insights.highestCeiling || {};

  return (
    <section className="dgl84-book-page">
      <div className="dgl84-book-bg"></div>
      <button onClick={goHome} className="back-button dgl84-back">← Back to Home</button>

      <header className="dgl84-book-hero">
        <p>For entertainment purposes only</p>
        <h1>DGL <span>Sportsbook</span></h1>
        <strong>Championship futures • market movement • value tiers</strong>
      </header>

      <div className="dgl84-book-topgrid">
        <article className="dgl84-favorite-ticket">
          <span>Current Favorite</span>
          <h2>{favorite.player || 'Model Loading'}</h2>
          <b>{formatOdds(favorite.odds)}</b>
          <small>DGL Rating {favorite.rating ? Number(favorite.rating).toFixed(1) : '—'} • {formatPercent(favorite.winPercent)} implied</small>
        </article>

        <article className="dgl84-market-card">
          <div><span>🔥 Value Watch</span><b>{value.player || '—'}</b><em>{formatOdds(value.odds)}</em></div>
          <div><span>🚀 Ceiling</span><b>{ceiling.player || '—'}</b><em>{ceiling.ceiling ? Number(ceiling.ceiling).toFixed(1) : '—'}</em></div>
          <div><span>🎯 GHIN Threat</span><b>{insights.ghinMonster.player || '—'}</b><em>{insights.ghinMonster.ghin ? Number(insights.ghinMonster.ghin).toFixed(1) : '—'}</em></div>
        </article>
      </div>

      <article className="dgl84-odds-board">
        <div className="dgl84-board-head">
          <div>
            <p>Official Futures Board</p>
            <h2>Odds Board</h2>
          </div>
          <span>{board.length} players</span>
        </div>

        <div className="dgl84-odds-table">
          <div className="dgl84-odds-header">
            <span>Rank</span><span>Player</span><span>Rating</span><span>Win %</span><span>Odds</span><span>Movement</span><span>Value</span>
          </div>
          {board.length ? board.map((player, index) => {
            const move = movementDetails(player);
            const tier = valueTierLabel(player.valueLabel, player);
            const tierClass = valueTierClass(tier);
            return (
              <div className="dgl84-odds-row" key={player.player}>
                <span className="dgl84-rank">#{index + 1}</span>
                <strong>{player.player}</strong>
                <span>{player.rating ? Number(player.rating).toFixed(1) : '—'}</span>
                <span>{formatPercent(player.winPercent)}</span>
                <b className="dgl84-odds-price">{formatOdds(player.odds)}</b>
                <span className={'dgl84-move-pill ' + move.className}>{move.emoji} {move.label}</span>
                <span className={'dgl84-value-pill ' + tierClass}>{tier}</span>
              </div>
            );
          }) : (
            <p className="note">Sportsbook board not found yet. Make sure the Power Model tab has Player, DGL Rating, Win %, Odds, Movement, Last Week Odds, and Value Rating headers.</p>
          )}
        </div>
      </article>
    </section>
  );
}



export default SportsbookPage;

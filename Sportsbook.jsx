import React, { useEffect, useState } from 'react';
import { csvUrl, parseCSV, textCell, stripLabel, cleanEventNo, cleanDate, cleanCourse, cleanTees, cleanTime, yearFromSheetName, numberFromCell, cleanName, canonicalName, findHeaderIndex, findHeaderRow, headerIndex, parsePlayers, playerMeta, normalizeAssetUrl, photoUrlFor, headshotUrlFor, cardColorValue, cardHighlightColor, looksLikeDateText, looksLikeTimeText, parseFutureEvents, fetchFutureEventsSheet, parseThisDayHistory, parseStateTrophies, formatRank, rankBadge, findPot, parseLooseDate, monthDayFromDate, decorateEvents, parseEventColumns, rowHasLabel, numericValuesFromRow, extractPlayerBlocks, findRowInBlock, findRowInBlockAny, lastNumericValue, parseCurrentStandings, strictNumberFromCell, findHistoricalStandingsColumns, isHistoricalPlayerName, nearestHistoricalPlayerName, parseYearStandings, findSheetValueNearLabel, playerSlug, imageCandidates, PlayerPhoto, AssetPhoto, parseAnnalsRecords, buildAnnalsYearsFromRecords, buildAnnalsYears, buildHistoryMoments, fetchFirstAvailableSheet, normalizeHeader, parsePercentCell, parseSportsbook, formatOdds, formatPercent, sportsbookInsights, safeFetchText, safeParse, loadLiveData, money, medal, initials, netNumber, formatNet, tierForNet, ordinal, rankedRedRounds, formatCommitment, recordIsFirstPlace, buildPlayerProfiles, SHEET_ID, CURRENT_YEAR_SHEET, HISTORY_SHEETS, SPORTSBOOK_SHEETS, ANNALS_SHEETS, PLAYERS_SHEETS, STATE_TROPHY_SHEETS, THIS_DAY_SHEETS, FUTURE_EVENTS_SHEETS, HOSTESS_SOURCES, fallbackData } from './core.jsx';


function marketImpliedProbability(odds) {
  const price = numberFromCell(odds);
  if (!price) return 0;
  return price > 0 ? 100 / (price + 100) : Math.abs(price) / (Math.abs(price) + 100);
}

function valueTierLabel(_value, player) {
  const modelProbability = Number(player?.winPercent || player?.winPct || player?.win || 0);
  const marketProbability = marketImpliedProbability(player?.odds);
  if (modelProbability <= 0 || marketProbability <= 0) return 'Avoid';

  const edge = modelProbability - marketProbability;
  const valueRatio = modelProbability / marketProbability;
  const name = String(player?.player || '').trim().toLowerCase();

  // Current golf judgment: these players should not surface as fair bets.
  if (name.includes('brian nevala') || name.includes('keegan anderson')) {
    return edge <= -0.025 || valueRatio <= 0.72 ? 'Strong Avoid' : 'Avoid';
  }
  if (/^ben(?:\s|$)/.test(name) && edge > -0.0075) return 'Slight Avoid';

  if (edge >= 0.025 || valueRatio >= 1.35) return 'Strong Value';
  if (edge >= 0.008 || valueRatio >= 1.12) return 'Slight Value';
  if (edge <= -0.025 || valueRatio <= 0.72) return 'Strong Avoid';
  if (edge <= -0.008 || valueRatio <= 0.88) return 'Slight Avoid';
  return 'Fair';
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

function classifyMovement(label, numericMove = 0) {
  if (!label) label = 'No change';

  const lower = String(label).toLowerCase();
  const isUp = numericMove > 0 || /▲|up|short|better|steam|\+/.test(lower);
  const isDown = numericMove < 0 || /▼|down|drift|worse/.test(lower);
  const cleanLabel = String(label)
    .replace(/[▲▼△▽⬆⬇]/g, '')
    .replace(/\b(?:shortened|shortening|lengthened|lengthening)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (isUp && !isDown) return { label: `▲ ${cleanLabel}`, emoji: '📈', className: 'up' };
  if (isDown) return { label: `▼ ${cleanLabel}`, emoji: '📉', className: 'down' };
  return { label: label === '—' ? 'No change' : label, emoji: '➖', className: 'flat' };
}

function openingMovementDetails(player) {
  const raw = String(player?.movement || '').trim();
  return classifyMovement(raw || 'No change');
}

function recentMovementDetails(player) {
  const current = numberFromCell(player?.odds);
  const previous = numberFromCell(player?.lastWeekOdds);

  if (!current || !previous) return classifyMovement('No change');

  const numericMove = previous - current;
  const label = numericMove > 0
    ? `${numericMove}`
    : numericMove < 0
      ? `${Math.abs(numericMove)}`
      : 'No change';

  return classifyMovement(label, numericMove);
}

function valueTierClass(value) {
  const label = String(value || '').toLowerCase();
  if (label.includes('strong value')) return 'strong';
  if (label.includes('value')) return 'value';
  if (label.includes('overpriced')) return 'over';
  if (label.includes('strong avoid')) return 'avoid strong-avoid';
  if (label.includes('avoid')) return 'avoid';
  return 'fair';
}

function cellValue(rows, rowNumber, columnNumber) {
  return String(rows?.[rowNumber - 1]?.[columnNumber - 1] ?? '').trim();
}

const sportsbookStyles = `
  .dgl84-book-page {
    --book-gold: #f4c84b;
    --book-gold-soft: #ffe391;
    --book-ink: #07140f;
    --book-panel: rgba(8, 28, 20, .94);
    position: relative;
    isolation: isolate;
    min-height: 100vh;
    padding: 88px clamp(18px, 4vw, 58px) 64px;
    overflow: hidden;
    color: #f8f4e8;
    background:
      radial-gradient(circle at 50% -10%, rgba(37, 120, 75, .42), transparent 38%),
      linear-gradient(180deg, #071b13 0%, #06110d 58%, #030806 100%);
  }
  .dgl84-book-bg {
    position: absolute;
    z-index: -1;
    inset: 0;
    opacity: .18;
    pointer-events: none;
    background-image:
      linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px);
    background-size: 38px 38px;
    mask-image: linear-gradient(to bottom, #000, transparent 75%);
  }
  .dgl84-back {
    position: absolute;
    top: 22px;
    left: clamp(18px, 4vw, 58px);
    z-index: 2;
  }
  .dgl84-book-hero {
    max-width: 1100px;
    margin: 0 auto 30px;
    text-align: center;
  }
  .dgl84-book-hero p {
    margin: 0 0 10px;
    color: #e1e9e4;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: .18em;
    text-transform: uppercase;
  }
  .dgl84-book-hero h1 {
    margin: 0;
    color: #fff;
    font-size: clamp(38px, 7vw, 76px);
    line-height: .95;
    letter-spacing: -.055em;
  }
  .dgl84-book-hero h1 span { color: var(--book-gold); }
  .dgl84-book-hero strong {
    display: block;
    margin-top: 16px;
    color: #edf3ef;
    font-size: clamp(14px, 2vw, 17px);
    letter-spacing: .05em;
  }
  .dgl84-book-topgrid {
    display: grid;
    grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
    gap: 18px;
    max-width: 1100px;
    margin: 0 auto 20px;
  }
  .dgl84-favorite-ticket,
  .dgl84-market-card,
  .dgl84-odds-board {
    border: 1px solid rgba(244, 200, 75, .22);
    border-radius: 20px;
    box-shadow: 0 22px 55px rgba(0, 0, 0, .28);
  }
  .dgl84-favorite-ticket {
    position: relative;
    overflow: hidden;
    padding: 24px 28px;
    color: #102118;
    background: linear-gradient(135deg, #fff1b8, #f2c446 58%, #c99018);
  }
  .dgl84-favorite-ticket::before {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(112deg, transparent 18%, rgba(255,255,255,.38) 42%, transparent 61%);
    transform: translateX(-115%);
    animation: dgl84-ticket-shine 7s ease-in-out infinite;
    pointer-events: none;
  }
  .dgl84-favorite-ticket::after {
    content: "";
    position: absolute;
    width: 170px;
    height: 170px;
    right: -65px;
    bottom: -80px;
    border: 25px solid rgba(255,255,255,.19);
    border-radius: 50%;
  }
  .dgl84-favorite-ticket > * { position: relative; z-index: 1; }
  .dgl84-favorite-ticket span {
    display: block;
    font-size: 12px;
    font-weight: 900;
    letter-spacing: .14em;
    text-transform: uppercase;
  }
  .dgl84-favorite-ticket h2 {
    margin: 8px 0 0;
    font-size: clamp(25px, 4vw, 40px);
    line-height: 1;
  }
  .dgl84-favorite-ticket b {
    display: block;
    margin: 12px 0 7px;
    font-size: clamp(30px, 5vw, 50px);
    line-height: 1;
  }
  .dgl84-favorite-ticket small {
    color: #20382b;
    font-size: 13px;
    font-weight: 900;
    opacity: .92;
  }
  .dgl84-market-card {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    overflow: hidden;
    background: var(--book-panel);
  }
  .dgl84-market-card > div {
    display: flex;
    min-width: 0;
    padding: 21px 16px;
    flex-direction: column;
    justify-content: center;
    text-align: center;
  }
  .dgl84-market-card > div + div { border-left: 1px solid rgba(255,255,255,.09); }
  .dgl84-market-card span {
    color: #d4dfd8;
    font-size: 11px;
    font-weight: 900;
    letter-spacing: .08em;
    text-transform: uppercase;
  }
  .dgl84-market-card b {
    overflow: hidden;
    margin: 10px 0 6px;
    color: #fff;
    font-size: 17px;
    text-overflow: ellipsis;
  }
  .dgl84-market-card em {
    color: var(--book-gold-soft);
    font-size: 20px;
    font-style: normal;
    font-weight: 900;
  }
  .dgl84-odds-board {
    position: relative;
    max-width: 1100px;
    margin: 0 auto;
    overflow: hidden;
    background: var(--book-panel);
  }
  .dgl84-odds-board::before {
    content: "";
    position: absolute;
    z-index: 2;
    top: 0;
    right: 22px;
    left: 22px;
    height: 2px;
    background: linear-gradient(90deg, transparent, var(--book-gold), transparent);
    opacity: .8;
    pointer-events: none;
  }
  .dgl84-board-head {
    display: flex;
    align-items: end;
    justify-content: space-between;
    padding: 23px 25px 20px;
    border-bottom: 1px solid rgba(255,255,255,.09);
  }
  .dgl84-board-head p {
    margin: 0 0 4px;
    color: var(--book-gold);
    font-size: 11px;
    font-weight: 900;
    letter-spacing: .15em;
    text-transform: uppercase;
  }
  .dgl84-board-head h2 { margin: 0; font-size: 28px; }
  .dgl84-board-head > span {
    padding: 7px 11px;
    border: 1px solid rgba(244,200,75,.3);
    border-radius: 999px;
    color: #e4ebe7;
    font-size: 12px;
    font-weight: 800;
  }
  .dgl84-odds-header,
  .dgl84-odds-row {
    display: grid;
    grid-template-columns: 54px minmax(135px, 1.45fr) 70px 72px 82px minmax(112px, .95fr) minmax(112px, .95fr) minmax(92px, .8fr);
    gap: 10px;
    align-items: center;
  }
  .dgl84-odds-header {
    padding: 11px 22px;
    color: #c9d6ce;
    background: rgba(255,255,255,.035);
    font-size: 10px;
    font-weight: 900;
    letter-spacing: .1em;
    text-transform: uppercase;
  }
  .dgl84-odds-row {
    min-height: 56px;
    padding: 7px 22px;
    border-top: 1px solid rgba(255,255,255,.065);
    color: #edf3ef;
    font-size: 15px;
  }
  .dgl84-odds-row:hover { background: rgba(244,200,75,.045); }
  .dgl84-odds-row:nth-child(2) {
    background: linear-gradient(90deg, rgba(244,200,75,.12), rgba(244,200,75,.025) 68%);
    box-shadow: inset 3px 0 0 var(--book-gold);
  }
  .dgl84-odds-row:nth-child(3) {
    background: linear-gradient(90deg, rgba(210,220,216,.075), transparent 60%);
    box-shadow: inset 3px 0 0 #cbd6d1;
  }
  .dgl84-odds-row:nth-child(4) {
    background: linear-gradient(90deg, rgba(193,122,63,.09), transparent 60%);
    box-shadow: inset 3px 0 0 #bd7d49;
  }
  .dgl84-odds-row:nth-child(2) .dgl84-rank { color: #ffe177; }
  .dgl84-odds-row:nth-child(3) .dgl84-rank { color: #e8efeb; }
  .dgl84-odds-row:nth-child(4) .dgl84-rank { color: #e2a778; }
  .dgl84-odds-row > strong { color: #fff; font-size: 16px; }
  .dgl84-rank { color: #c9d5ce; font-size: 14px; font-weight: 900; }
  .dgl84-odds-price { color: #ffe177; font-size: 18px; }
  .dgl84-move-pill,
  .dgl84-value-pill {
    width: fit-content;
    max-width: 100%;
    padding: 6px 9px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 900;
    line-height: 1.15;
  }
  .dgl84-move-pill.up { color: #69eba5; background: rgba(37, 181, 103, .14); }
  .dgl84-move-pill.down { color: #ff9f9f; background: rgba(230, 67, 67, .14); }
  .dgl84-move-pill.flat { color: #dce5df; background: rgba(255,255,255,.1); }
  .dgl84-value-pill.strong { color: #062d19; background: #67e59e; }
  .dgl84-value-pill.value { color: #ffe7a0; background: rgba(244,200,75,.16); }
  .dgl84-value-pill.over,
  .dgl84-value-pill.avoid { color: #ffabab; background: rgba(230,67,67,.15); }
  .dgl84-value-pill.fair { color: #e2eae5; background: rgba(255,255,255,.11); }
  .dgl84-odds-table .note { padding: 25px; color: #cbd7cf; }

  @keyframes dgl84-ticket-shine {
    0%, 72%, 100% { transform: translateX(-115%); }
    84% { transform: translateX(115%); }
  }

  @media (max-width: 820px) {
    .dgl84-book-page { padding: 78px 14px 40px; }
    .dgl84-book-topgrid { grid-template-columns: 1fr; }
    .dgl84-market-card > div { padding: 18px 10px; }
    .dgl84-odds-header { display: none; }
    .dgl84-odds-table {
      display: grid;
      gap: 8px;
      padding: 8px;
      background: rgba(0,0,0,.16);
    }
    .dgl84-odds-row {
      display: grid;
      grid-template-columns: 44px minmax(0, 1fr) minmax(92px, auto);
      gap: 10px;
      min-height: 0;
      padding: 12px;
      border: 1px solid rgba(255,255,255,.09);
      border-radius: 14px;
      background: rgba(12, 39, 28, .92);
    }
    .dgl84-odds-row:hover { background: rgba(12, 39, 28, .92); }
    .dgl84-odds-row:nth-child(2) {
      border-color: rgba(244,200,75,.38);
      background: linear-gradient(135deg, rgba(45,65,35,.96), rgba(12,39,28,.96) 62%);
      box-shadow: inset 3px 0 0 var(--book-gold), 0 10px 26px rgba(0,0,0,.2);
    }
    .dgl84-rank {
      grid-column: 1;
      grid-row: 1;
      align-self: center;
      font-size: 14px;
    }
    .dgl84-odds-row > strong {
      grid-column: 2;
      grid-row: 1;
      align-self: center;
      font-size: 17px;
    }
    .dgl84-odds-price {
      grid-column: 3;
      grid-row: 1;
      justify-self: end;
      align-self: center;
      font-size: 21px;
    }
    .dgl84-odds-row > span:nth-child(3),
    .dgl84-odds-row > span:nth-child(4) {
      position: relative;
      padding-top: 14px;
      font-size: 15px;
      font-weight: 800;
    }
    .dgl84-odds-row > span:nth-child(3) { grid-column: 1 / 2; grid-row: 2; }
    .dgl84-odds-row > span:nth-child(4) { grid-column: 2 / 3; grid-row: 2; }
    .dgl84-odds-row > span:nth-child(3)::before,
    .dgl84-odds-row > span:nth-child(4)::before {
      position: absolute;
      top: 0;
      color: #c1d0c7;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: .1em;
      text-transform: uppercase;
    }
    .dgl84-odds-row > span:nth-child(3)::before { content: "Rating"; }
    .dgl84-odds-row > span:nth-child(4)::before { content: "Win %"; }
    .dgl84-move-pill {
      position: relative;
      padding-top: 18px;
    }
    .dgl84-opening-move {
      grid-column: 1 / 3;
      grid-row: 3;
      align-self: center;
    }
    .dgl84-recent-move {
      grid-column: 1 / 3;
      grid-row: 4;
      align-self: center;
    }
    .dgl84-opening-move::before,
    .dgl84-recent-move::before {
      position: absolute;
      top: 3px;
      left: 9px;
      color: #c1d0c7;
      font-size: 9px;
      font-weight: 900;
      letter-spacing: .08em;
      text-transform: uppercase;
    }
    .dgl84-opening-move::before { content: "Since Opening"; }
    .dgl84-recent-move::before { content: attr(data-label); }
    .dgl84-value-pill {
      grid-column: 3;
      grid-row: 2 / 5;
      justify-self: end;
      align-self: end;
      text-align: center;
    }
  }
  @media (max-width: 460px) {
    .dgl84-book-hero { margin-bottom: 22px; }
    .dgl84-book-hero strong { max-width: 300px; margin-inline: auto; line-height: 1.45; }
    .dgl84-favorite-ticket { padding: 21px; }
    .dgl84-market-card { grid-template-columns: 1fr; }
    .dgl84-market-card > div { flex-direction: row; align-items: center; gap: 10px; text-align: left; }
    .dgl84-market-card > div + div { border-top: 1px solid rgba(255,255,255,.09); border-left: 0; }
    .dgl84-market-card span { width: 105px; }
    .dgl84-market-card b { flex: 1; margin: 0; }
    .dgl84-market-card em { margin-left: auto; }
    .dgl84-board-head { padding: 19px 16px 16px; }
    .dgl84-board-head h2 { font-size: 24px; }
    .dgl84-odds-row { grid-template-columns: 36px minmax(0, 1fr) minmax(78px, auto); }
  }
  @media (prefers-reduced-motion: reduce) {
    .dgl84-favorite-ticket::before { animation: none; }
  }
`;


function SportsbookPage({ data, goHome }) {
  const [movementSince, setMovementSince] = useState('');
  const board = data.sportsbook || [];
  const insights = sportsbookInsights(board);
  const favorite = insights.favorite || board[0] || {};
  const value = insights.bestValue || {};
  const highestWinChance = board.reduce((best, player) => {
    const playerChance = numberFromCell(player?.winPercent ?? player?.winPct ?? player?.win);
    const bestChance = numberFromCell(best?.winPercent ?? best?.winPct ?? best?.win);
    return playerChance > bestChance ? player : best;
  }, {});

  useEffect(() => {
    let cancelled = false;

    async function loadMovementDate() {
      try {
        const powerModelUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent('Power Model')}`;
        const csv = await safeFetchText(powerModelUrl);
        const rows = parseCSV(csv);
        if (!cancelled) setMovementSince(cellValue(rows, 4, 12));
      } catch (error) {
        console.warn('DGL movement date unavailable', error);
      }
    }

    loadMovementDate();
    return () => { cancelled = true; };
  }, []);

  return (
    <section className="dgl84-book-page">
      <style>{sportsbookStyles}</style>
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
          <div><span>🏆 Highest Win Chance</span><b>{highestWinChance.player || '—'}</b><em>{formatPercent(highestWinChance.winPercent ?? highestWinChance.winPct ?? highestWinChance.win)}</em></div>
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
            <span>Rank</span><span>Player</span><span>Rating</span><span>Win %</span><span>Odds</span><span>Since Opening</span><span>{movementSince ? `Since ${movementSince}` : 'Recent Movement'}</span><span>Value</span>
          </div>
          {board.length ? board.map((player, index) => {
            const openingMove = openingMovementDetails(player);
            const recentMove = recentMovementDetails(player);
            const tier = valueTierLabel(player.valueLabel, player);
            const tierClass = valueTierClass(tier);
            return (
              <div className="dgl84-odds-row" key={player.player}>
                <span className="dgl84-rank">#{index + 1}</span>
                <strong>{player.player}</strong>
                <span>{player.rating ? Number(player.rating).toFixed(1) : '—'}</span>
                <span>{formatPercent(player.winPercent)}</span>
                <b className="dgl84-odds-price">{formatOdds(player.odds)}</b>
                <span className={'dgl84-move-pill dgl84-opening-move ' + openingMove.className}>{openingMove.emoji} {openingMove.label}</span>
                <span className={'dgl84-move-pill dgl84-recent-move ' + recentMove.className} data-label={movementSince ? `Since ${movementSince}` : 'Recent Movement'}>{recentMove.emoji} {recentMove.label}</span>
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

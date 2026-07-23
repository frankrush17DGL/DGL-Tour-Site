import React, { useState, useRef, useEffect } from 'react';
import { csvUrl, parseCSV, textCell, stripLabel, cleanEventNo, cleanDate, cleanCourse, cleanTees, cleanTime, yearFromSheetName, numberFromCell, cleanName, canonicalName, findHeaderIndex, findHeaderRow, headerIndex, parsePlayers, playerMeta, normalizeAssetUrl, photoUrlFor, headshotUrlFor, cardColorValue, cardHighlightColor, looksLikeDateText, looksLikeTimeText, parseFutureEvents, fetchFutureEventsSheet, parseThisDayHistory, parseStateTrophies, formatRank, rankBadge, findPot, parseLooseDate, monthDayFromDate, decorateEvents, parseEventColumns, rowHasLabel, numericValuesFromRow, extractPlayerBlocks, findRowInBlock, findRowInBlockAny, lastNumericValue, parseCurrentStandings, strictNumberFromCell, findHistoricalStandingsColumns, isHistoricalPlayerName, nearestHistoricalPlayerName, parseYearStandings, findSheetValueNearLabel, playerSlug, imageCandidates, PlayerPhoto, AssetPhoto, parseAnnalsRecords, buildAnnalsYearsFromRecords, buildAnnalsYears, buildHistoryMoments, fetchFirstAvailableSheet, normalizeHeader, parsePercentCell, parseSportsbook, formatOdds, formatPercent, sportsbookInsights, safeFetchText, safeParse, loadLiveData, money, medal, initials, netNumber, formatNet, tierForNet, ordinal, rankedRedRounds, formatCommitment, recordIsFirstPlace, buildPlayerProfiles, SHEET_ID, CURRENT_YEAR_SHEET, HISTORY_SHEETS, SPORTSBOOK_SHEETS, ANNALS_SHEETS, PLAYERS_SHEETS, STATE_TROPHY_SHEETS, THIS_DAY_SHEETS, FUTURE_EVENTS_SHEETS, HOSTESS_SOURCES, fallbackData } from './core.jsx';

// ---------- deterministic per-card wear ----------
function hashSeed(str) {
  let h = 2166136261;
  const s = String(str || 'dgl');
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// "well loved" baseline: cards vary roughly between lightly-played and heavily-worn,
// centered on well-loved rather than mint or destroyed.
function wearLevelFor(seed) {
  return 0.55 + ((seed % 100) / 100) * 0.23;
}

function drawCardWear(canvas, seed, level) {
  if (!canvas) return;
  const W = 400, H = 630;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, W, H);
  const rnd = mulberry32(seed * 9301 + 49297);
  const R = (a, b) => a + rnd() * (b - a);
  const L = level;

  ctx.lineCap = 'round';
  const crackleN = Math.round(60 + L * 220);
  for (let i = 0; i < crackleN; i++) {
    const x = R(0, W), y = R(0, H), len = R(3, 10), ang = R(0, Math.PI * 2);
    const dark = rnd() < 0.6;
    ctx.strokeStyle = dark ? `rgba(40,24,10,${R(0.06, 0.16) + L * 0.08})` : `rgba(255,246,224,${R(0.05, 0.12) + L * 0.06})`;
    ctx.lineWidth = R(0.5, 1.1);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len); ctx.stroke();
  }

  const stainSpots = Math.round(4 + L * 14);
  for (let i = 0; i < stainSpots; i++) {
    let x, y;
    if (rnd() < 0.7) {
      const edge = Math.floor(R(0, 4));
      if (edge === 0) { x = R(0, W); y = R(0, H * 0.22); }
      else if (edge === 1) { x = R(0, W); y = R(H * 0.78, H); }
      else if (edge === 2) { x = R(0, W * 0.18); y = R(0, H); }
      else { x = R(W * 0.82, W); y = R(0, H); }
    } else { x = R(0, W); y = R(0, H); }
    const r = R(12, 40);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const alpha = R(0.08, 0.2) + L * 0.1;
    g.addColorStop(0, `rgba(70,42,14,${alpha})`);
    g.addColorStop(0.6, `rgba(70,42,14,${alpha * 0.5})`);
    g.addColorStop(1, `rgba(70,42,14,0)`);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(x, y, r, r * R(0.6, 1), R(0, Math.PI), 0, Math.PI * 2); ctx.fill();
  }

  if (L > 0.45) {
    const x = R(W * 0.15, W * 0.85), y = R(H * 0.15, H * 0.85), r = R(18, 30);
    ctx.strokeStyle = `rgba(65,38,12,${R(0.12, 0.22)})`;
    ctx.lineWidth = R(1.5, 3);
    ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.94, 0, 0, Math.PI * 2); ctx.stroke();
  }

  const scuffN = Math.round(1 + L * 7);
  for (let i = 0; i < scuffN; i++) {
    const x = R(0, W * 0.7), y = R(0, H), len = R(30, 120), ang = R(-0.35, 0.35);
    const light = rnd() < 0.5;
    ctx.strokeStyle = light ? `rgba(255,248,228,${R(0.12, 0.28) + L * 0.1})` : `rgba(40,24,10,${R(0.12, 0.26) + L * 0.1})`;
    ctx.lineWidth = R(0.7, 1.6);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len); ctx.stroke();
  }

  function corner(cx, cy, dx, dy, size) {
    if (size < 3) return;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    const steps = 6;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const jag = R(-2, 2);
      ctx.lineTo(dx * size * t + (dy !== 0 ? jag : 0), dy * size * t + (dx !== 0 ? jag : 0));
    }
    ctx.lineTo(dx * size, dy * size * 0);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, 0, dx * size, dy * size);
    g.addColorStop(0, 'rgba(235,222,190,.75)');
    g.addColorStop(1, 'rgba(235,222,190,0)');
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(60,35,12,.25)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
  }
  const cs = L * 34;
  corner(6, 6, 1, 0, R(0.6, 1) * cs);
  corner(6, 6, 0, 1, R(0.6, 1) * cs);
  corner(W - 8, H - 8, -1, 0, R(0.5, 0.9) * cs);
  corner(W - 8, H - 8, 0, -1, R(0.5, 0.9) * cs);

  for (let i = 0; i < 4; i++) {
    const x = R(0, W), y = R(0, H), r = R(80, 150);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(120,80,30,${R(0.03, 0.07) + L * 0.03})`);
    g.addColorStop(1, 'rgba(120,80,30,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.fill();
  }

  function drawCrease(x1, y1, x2, y2, weight, alpha) {
    const steps = 90;
    const dx = (x2 - x1) / steps, dy = (y2 - y1) / steps;
    const nx = -dy, ny = dx; const nlen = Math.hypot(nx, ny) || 1; const ux = nx / nlen, uy = ny / nlen;

    ctx.save();
    ctx.strokeStyle = `rgba(35,20,8,${alpha * 0.55})`;
    ctx.lineWidth = weight + 0.8; ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const t = i / steps; const wob = Math.sin(t * Math.PI * 2.2) * R(1, 2);
      const px = x1 + dx * i + ux * wob, py = y1 + dy * i + uy * wob;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.stroke(); ctx.restore();

    ctx.save();
    ctx.strokeStyle = `rgba(248,240,220,${alpha})`;
    ctx.lineWidth = weight * 0.65; ctx.lineCap = 'round';
    let i = 0;
    while (i < steps) {
      const segLen = Math.floor(R(6, 14));
      const t0 = i / steps; const t1 = Math.min(steps, i + segLen) / steps;
      const wob0 = Math.sin(t0 * Math.PI * 2.2) * R(1, 2);
      const wob1 = Math.sin(t1 * Math.PI * 2.2) * R(1, 2);
      const p0x = x1 + dx * i + ux * wob0, p0y = y1 + dy * i + uy * wob0;
      const iEnd = Math.min(steps, i + segLen);
      const p1x = x1 + dx * iEnd + ux * wob1, p1y = y1 + dy * iEnd + uy * wob1;
      ctx.beginPath(); ctx.moveTo(p0x, p0y); ctx.lineTo(p1x, p1y); ctx.stroke();
      i += segLen + (rnd() < 0.3 ? Math.floor(R(1, 3)) : 0);
    }
    ctx.restore();
  }

  if (L > 0.55) {
    const creaseAlpha = 0.35 + (L - 0.55) * 0.7;
    const creaseWeight = 1.1 + L * 0.9;
    if (seed % 2 === 1) {
      drawCrease(W * 0.47, -4, W * 0.55, H + 4, creaseWeight, creaseAlpha);
    } else {
      drawCrease(W * 0.14, H * 0.08, W * 0.7, H * 0.96, creaseWeight, creaseAlpha);
      if (L > 0.8) drawCrease(W * 0.82, H * 0.12, W * 0.25, H * 0.6, creaseWeight * 0.7, creaseAlpha * 0.75);
    }
  }
}

function useCardWear(seedBase) {
  const frontRef = useRef(null);
  const backRef = useRef(null);
  useEffect(() => {
    const level = wearLevelFor(seedBase);
    drawCardWear(frontRef.current, seedBase, level);
    drawCardWear(backRef.current, seedBase + 7919, level);
  }, [seedBase]);
  return { frontRef, backRef };
}

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
  const seedBase = hashSeed(profile.name || profile.fullName || cardNo);
  const { frontRef, backRef } = useCardWear(seedBase);

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
            <div className="dgl84-photo-box">
              <PlayerPhoto name={profile.name} src={profile.photoUrl || profile.headshotUrl} className="dgl84-action-photo" />
              <div className="dgl84-dgl-mark"><strong>DGL</strong><span>EST. 2021</span></div>
              <div className="dgl84-card-number">{rankDisplay}</div>
            </div>

            <div className="dgl84-name-banner">
              <div>
                <h2><span>{first}</span>{last ? <span>{last}</span> : null}</h2>
                <p>★ {String(title).toUpperCase()} ★</p>
              </div>
              <div className="dgl84-mini-portrait">
                <PlayerPhoto name={profile.name} src={profile.headshotUrl || profile.photoUrl} className="dgl84-headshot" />
              </div>
            </div>

            <div className="dgl84-stat-footer">
              <div><small>Rank</small><b>{profile.rank || '—'}</b></div>
              <div><small>Pts</small><b>{profile.points != null ? profile.points : '—'}</b></div>
              <div><small>Red</small><b>{profile.redRoomCount || 0}</b></div>
            </div>
            <canvas className="dgl84-wear-canvas" ref={frontRef} aria-hidden="true" />
          </div>
        </div>

        <div className="dgl84-card-face dgl84-card-back">
          <div className="dgl84-back-paper">
            <div className="dgl84-back-title">
              <div>
                <p>Official Player Record</p>
                <h3>{profile.fullName || profile.name}</h3>
                <span>{title} • Card #{cardNo}</span>
              </div>
              <div className="dgl84-card-number">{rankDisplay}</div>
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
            <canvas className="dgl84-wear-canvas" ref={backRef} aria-hidden="true" />
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

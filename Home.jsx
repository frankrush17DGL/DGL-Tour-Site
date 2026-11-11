import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  fallbackData,
  PlayerPhoto,
  buildPlayerProfiles,
  photoUrlFor,
  rankBadge,
  rankedRedRounds,
  money,
  sportsbookInsights,
  formatOdds
} from './core.jsx';
import TournamentCenter from './TournamentCenter.jsx';

function leagueCalendarDay(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(now);
  const part = type => parts.find(item => item.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function birthdayMonthDay(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  let month, day;
  // Read calendar components directly so UTC parsing cannot shift a birthday.
  const iso = raw.match(/^\d{4}-(\d{1,2})-(\d{1,2})(?:T.*)?$/);
  const us = raw.match(/^(\d{1,2})[\/-](\d{1,2})(?:[\/-]\d{2,4})?$/);
  if (iso || us) {
    [, month, day] = iso || us;
  } else {
    const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    const named = raw.match(/^([a-z]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+\d{4})?$/i);
    const reversed = raw.match(/^(\d{1,2})\s+([a-z]+)\.?(?:\s+\d{4})?$/i);
    if (!named && !reversed) return null;
    month = months.indexOf((named ? named[1] : reversed[2]).slice(0, 3).toLowerCase()) + 1;
    day = named ? named[2] : reversed[1];
  }
  month = Number(month); day = Number(day);
  const days = [31,29,31,30,31,30,31,31,30,31,30,31];
  if (month < 1 || month > 12 || day < 1 || day > days[month - 1]) return null;
  return `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function birthdayPlayers(players, today) {
  const seen = new Set();
  return (Array.isArray(players) ? players : []).filter(player => {
    if (!player || !player.name || birthdayMonthDay(player.dob) !== today.slice(5)) return false;
    const key = player.name.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function BirthdayAtmosphere() {
  const ref = useRef(null);
  useEffect(() => {
    const node = ref.current;
    const resize = () => node.style.setProperty('--flight', `${node.clientHeight + 380}px`);
    resize();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    observer?.observe(node);
    window.addEventListener('resize', resize);
    return () => { observer?.disconnect(); window.removeEventListener('resize', resize); };
  }, []);
  const colors = [['#fff1b9','#dfb34d','#8b5415'],['#ffb1a5','#cb2940','#6d081d'],['#ffffff','#e9ddc5','#9c8864'],['#ffe1a2','#b88427','#634010']];
  return <div ref={ref} className="birthday-decoration birthday-atmosphere" aria-hidden="true">
    {Array.from({length:18}, (_,i) => {
      const color = colors[i % colors.length];
      return <div className="birthday-flight" key={i} style={{left:`${(i*41)%104-4}%`,width:`${66+(i*19)%64}px`,'--duration':`${12+i%7}s`,'--delay':`-${(i*2.73)%(12+i%7)}s`,'--drift':`${(i%2?1:-1)*(18+i%4*13)}px`,'--sway':`${3.6+i%4*.6}s`,opacity:.55+i%4*.12}}>
        <svg className="birthday-balloon-art" viewBox="0 0 120 240" focusable="false">
          <defs>
            <radialGradient id={`birthday-body-${i}`} cx="32%" cy="25%" r="78%"><stop offset="0" stopColor={color[0]}/><stop offset=".38" stopColor={color[1]}/><stop offset="1" stopColor={color[2]}/></radialGradient>
            <linearGradient id={`birthday-shine-${i}`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff" stopOpacity=".8"/><stop offset="1" stopColor="#fff" stopOpacity="0"/></linearGradient>
          </defs>
          <path d="M60 128 C40 157 78 170 54 194 S70 220 58 238" fill="none" stroke="#f2dfb7" strokeOpacity=".65" strokeWidth=".9"/>
          <path d="M60 10 C26 10 9 33 13 65 C16 93 43 119 60 127 C77 119 104 93 107 65 C111 33 94 10 60 10Z" fill={`url(#birthday-body-${i})`}/>
          <path d="M60 124 L54 133 Q60 136 66 133Z" fill={color[2]}/>
          <ellipse cx="34" cy="40" rx="10" ry="19" transform="rotate(28 34 40)" fill={`url(#birthday-shine-${i})`}/>
          <path d="M91 43 Q104 76 77 103" fill="none" stroke={color[0]} strokeOpacity=".25" strokeWidth="2"/>
        </svg>
      </div>;
    })}
    {Array.from({length:90}, (_,i) => <span className={`birthday-confetti-flight confetti-shape-${i%3}`} key={`c-${i}`} style={{left:`${(i*37)%100}%`,'--duration':`${6+i%7}s`,'--delay':`-${(i*.87)%(6+i%7)}s`,'--drift':`${(i%2?1:-1)*(15+i%9*6)}px`,'--twirl':`${1.3+i%5*.4}s`,'--confetti-color':['#f9d779','#d7384a','#fff4d8','#dd9d38','#f59b9e'][i%5]}}><i/></span>)}
  </div>;
}

function PlayerBirthdays({ data }) {
  const [paused, setPaused] = useState(false);
  const [today, setToday] = useState(() => leagueCalendarDay());
  useEffect(() => {
    const refresh = () => setToday(leagueCalendarDay());
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);
  const celebrating = birthdayPlayers(buildPlayerProfiles(data), today);
  if (!celebrating.length) return null;
  return (
    <section className={`dgl-birthdays${paused ? ' birthday-paused' : ''}`} aria-labelledby="dgl-birthday-title">
      <BirthdayAtmosphere />
      <header><p className="eyebrow">Celebrating the Dojo</p><h2 id="dgl-birthday-title">Happy Birthday! <span aria-hidden="true">🎂</span></h2></header>
      <div className="dgl-birthday-list">
        <button type="button" className="birthday-motion" aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? 'Play celebration' : 'Pause celebration'}</button>
        {celebrating.map(player => (
          <article className="dgl-birthday-player" key={player.name}>
            <PlayerPhoto name={player.name} src={player.headshotUrl || player.photoUrl || ''} className="dgl-birthday-photo" />
            <div className="dgl-birthday-copy">
              <h3>{player.name}</h3>
              {player.nickname ? <p className="dgl-birthday-nickname">“{player.nickname}”</p> : null}
              <p>Here’s to another year of great rounds and good company.</p>
              <dl>
                {player.debutYear ? <div><dt>DGL debut</dt><dd>{player.debutYear}</dd></div> : null}
                {player.dglfcAppearances > 0 ? <div><dt>Fall Classic appearances</dt><dd>{player.dglfcAppearances}</dd></div> : null}
                {player.redRoomCount > 0 ? <div><dt>Red Rounds</dt><dd>{player.redRoomCount}</dd></div> : null}
                {player.stateTrophyWins > 0 ? <div><dt>State trophy wins</dt><dd>{player.stateTrophyWins}</dd></div> : null}
                {Number.isFinite(player.bestNet) ? <div><dt>Best Red Round</dt><dd>{formatSigned(player.bestNet)} net</dd></div> : null}
                {player.hometown ? <div><dt>Hometown</dt><dd>{player.hometown}</dd></div> : null}
                {player.favoriteCourse ? <div><dt>Favorite course</dt><dd>{player.favoriteCourse}</dd></div> : null}
              </dl>
              {player.walkUpSong ? <p className="birthday-song">♫ Birthday soundtrack: {player.walkUpSong}</p> : null}
              {player.bio ? <p className="dgl-birthday-bio">{player.bio}</p> : null}
            </div>
          </article>
        ))}
      </div>
      <style>{`
        .dgl-birthdays{margin:22px 0;padding:28px;border:1px solid #9c7936;border-radius:22px;background:radial-gradient(ellipse at top right,#74501a55,transparent 65%),linear-gradient(125deg,#32100f,#15100c);color:#f5eee3}
        .dgl-birthdays header{margin-bottom:22px}.dgl-birthdays .eyebrow{color:#f0c75e}.dgl-birthdays h2{font-size:clamp(26px,4vw,38px);line-height:1.15;margin:0}.dgl-birthday-list{display:grid;gap:24px}.dgl-birthday-player{display:grid;grid-template-columns:150px minmax(0,1fr);gap:24px;align-items:start}.dgl-birthday-player+.dgl-birthday-player{border-top:1px solid #e6c47733;padding-top:24px}
        .dgl-birthdays .dgl-birthday-photo{width:150px;height:150px;max-width:100%;border-radius:18px;object-fit:cover;object-position:center 25%;border:2px solid #e6bd5b;flex-shrink:0}.dgl-birthday-copy{min-width:0;overflow-wrap:anywhere}.dgl-birthday-copy h3{font-size:clamp(23px,4vw,30px);margin:0 0 6px;line-height:1.2}.dgl-birthday-copy p{line-height:1.6;margin:8px 0;color:#ded2bd}.dgl-birthday-copy .dgl-birthday-nickname{color:#f0c75e;font-weight:700}.dgl-birthday-copy dl{display:flex;flex-wrap:wrap;gap:16px 28px;margin:18px 0 0}.dgl-birthday-copy dt{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#c6ac75}.dgl-birthday-copy dd{margin:4px 0 0;font-size:14px;font-weight:600}.dgl-birthday-copy .dgl-birthday-bio{white-space:pre-wrap;font-size:14px;margin-top:18px}
        @media(max-width:540px){.dgl-birthdays{padding:20px}.dgl-birthday-player{grid-template-columns:1fr;gap:16px}.dgl-birthdays .dgl-birthday-photo{width:120px;height:120px}}

        .dgl-birthdays{position:relative;isolation:isolate;overflow:hidden}.dgl-birthdays header,.dgl-birthday-list{position:relative;z-index:1}.birthday-decoration{position:absolute;inset:0;z-index:0;pointer-events:none;overflow:hidden;opacity:.65}.birthday-balloon{position:absolute;right:3%;top:48px;width:62px;height:77px;border-radius:50% 50% 46% 46%;background:radial-gradient(circle at 30% 25%,#ffeab3,#c49027 70%);box-shadow:inset -8px -10px 15px #0003;animation:birthday-float 6s ease-in-out infinite alternate}.birthday-balloon::after{content:'';position:absolute;top:100%;left:50%;height:95px;width:1px;background:#f4dc9b77}.birthday-balloon.balloon-1{right:12%;top:100px;background:radial-gradient(circle at 30% 25%,#ec7880,#a6192c 70%);animation-delay:-2s}.birthday-balloon.balloon-2{right:6%;top:210px;width:46px;height:59px;animation-delay:-4s}.birthday-balloon.balloon-3{right:20%;top:20px;width:36px;height:47px;background:radial-gradient(circle at 30% 25%,#fff,#dbccb1 70%);animation-delay:-3s}.birthday-confetti{position:absolute;top:-25px;width:6px;height:12px;animation:birthday-confetti-fall 9s linear infinite}.birthday-motion{justify-self:start;border:1px solid #e6bd5b55;border-radius:20px;padding:8px 12px;background:#21150ddd;color:#e5cc9a;font:inherit;font-size:12px;cursor:pointer}.birthday-motion:focus-visible{outline:2px solid #f4cd65;outline-offset:3px}.birthday-paused .birthday-decoration *{animation-play-state:paused}.dgl-birthday-copy dl>div{padding:12px 16px;border:1px solid #e6bd5b33;border-radius:10px;background:#120b08e8;min-width:100px}.dgl-birthday-copy .birthday-song{font-size:13px;color:#f4cd65}.dgl-birthday-player{background:#170c08c9;border-radius:16px;padding:20px}.dgl-birthdays .dgl-birthday-photo{width:180px;height:180px;box-shadow:0 0 0 6px #efc56715,0 12px 35px #0006}.dgl-birthdays .dgl-birthday-player{grid-template-columns:180px minmax(0,1fr)}
        @keyframes birthday-float{from{transform:translateY(0) rotate(-7deg)}to{transform:translateY(-24px) rotate(7deg)}}@keyframes birthday-confetti-fall{from{transform:translateY(-20px) rotate(0)}to{transform:translateY(1100px) rotate(540deg)}}@media(prefers-reduced-motion:reduce){.birthday-decoration *{animation:none!important}.birthday-confetti{top:12%;transform:rotate(25deg)}.birthday-motion{display:none}}@media(max-width:540px){.birthday-decoration{opacity:.35}.dgl-birthdays .dgl-birthday-player{grid-template-columns:1fr;padding:14px}.dgl-birthdays .dgl-birthday-photo{width:145px;height:145px}}
        .dgl-birthdays{padding:32px;border-color:#d7b466;background:radial-gradient(ellipse at 95% 0%,#b881254d,transparent 60%),radial-gradient(ellipse at 0% 100%,#9c162d55,transparent 55%),#170e0b;box-shadow:0 16px 55px #0005,inset 0 1px #fff2}
        .dgl-birthdays .birthday-atmosphere{opacity:1;--flight:1100px}.birthday-flight{position:absolute;bottom:-300px;height:auto;animation:birthday-rise var(--duration) linear infinite;animation-delay:var(--delay);will-change:transform}.birthday-balloon-art{display:block;width:100%;height:auto;overflow:visible;transform-origin:50% 55%;animation:birthday-sway var(--sway) ease-in-out infinite alternate}
        .birthday-confetti-flight{position:absolute;top:-24px;width:8px;height:13px;animation:birthday-rain var(--duration) linear infinite;animation-delay:var(--delay);opacity:.9}.birthday-confetti-flight i{display:block;width:100%;height:100%;background:var(--confetti-color);animation:birthday-twirl var(--twirl) ease-in-out infinite;box-shadow:inset 1px 1px #ffffff77}.confetti-shape-1{width:5px;height:18px}.confetti-shape-2{width:6px;height:6px}.confetti-shape-2 i{border-radius:50%}
        .dgl-birthdays header{width:fit-content;padding:10px 18px 12px 0;text-shadow:0 2px 12px #000;background:linear-gradient(90deg,#20100bf5,#20100b88,transparent)}.dgl-birthdays h2{font-size:clamp(30px,4.5vw,48px);letter-spacing:-.035em}.dgl-birthday-player{border:1px solid #f6d38b33;background:linear-gradient(115deg,#28150ff2,#160e0be8);box-shadow:0 10px 32px #0003}.dgl-birthday-copy dd{color:#fff0c6;font-size:18px}.birthday-paused .birthday-decoration *{animation-play-state:paused!important}
        @keyframes birthday-rise{from{transform:translate3d(0,0,0)}to{transform:translate3d(var(--drift),calc(-1 * var(--flight)),0)}}@keyframes birthday-sway{from{transform:rotate(-7deg)}to{transform:rotate(8deg)}}@keyframes birthday-rain{from{transform:translate3d(0,0,0)}to{transform:translate3d(var(--drift),var(--flight),0)}}@keyframes birthday-twirl{0%{transform:rotate(0) rotateY(0)}50%{transform:rotate(180deg) rotateY(80deg)}100%{transform:rotate(360deg) rotateY(180deg)}}
        @media(max-width:540px){.dgl-birthdays{padding:20px 14px}.birthday-flight:nth-child(n+13){display:none}.birthday-confetti-flight:nth-of-type(n+61){display:none}}
        @media(prefers-reduced-motion:reduce){.birthday-atmosphere *{animation:none!important}.birthday-flight{display:none}.birthday-confetti-flight{top:8%;opacity:.35}.birthday-motion{display:none}}
      `}</style>
    </section>
  );
}

function roundNet(round = {}) {
  const value = Number(round.netToPar ?? round.netDifferential ?? round.netVsPar ?? round.netScoreToPar ?? round.net);
  return Number.isFinite(value) ? value : null;
}

function roundPoints(round = {}) {
  const value = Number(round.dglPoints ?? round.points);
  return Number.isFinite(value) ? value : null;
}

function roundHandicap(round = {}) {
  const value = Number(round.ghin ?? round.handicapAtTime ?? round.handicap);
  return Number.isFinite(value) ? value : null;
}

function formatSigned(value) {
  if (!Number.isFinite(value)) return '—';
  if (value === 0) return 'E';
  return `${value > 0 ? '+' : '−'}${Math.abs(value).toFixed(1)}`;
}

function formatResultDate(value) {
  const raw = String(value || '').trim();
  if (!raw) return 'Date unavailable';
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T12:00:00` : raw);
  return Number.isNaN(date.getTime())
    ? raw
    : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function currentSeasonResults(rounds = []) {
  const currentYear = new Date().getFullYear();
  const events = new Map();

  rounds.forEach(round => {
    const year = Number(round.year || String(round.date || '').slice(0, 4));
    const net = roundNet(round);
    if (year !== currentYear || !round.player || !Number.isFinite(net)) return;

    const key = String(round.eventId || round.roundId || round.eventNumber || round.event || round.date || round.course || '');
    if (!key) return;
    if (!events.has(key)) {
      events.set(key, {
        key,
        year,
        event: round.eventNumber || round.event || '',
        date: round.date || round.eventDate || '',
        course: round.course || round.courseName || 'Course unavailable',
        host: round.host || '',
        players: []
      });
    }
    const event = events.get(key);
    if (!event.host && round.host) event.host = round.host;
    event.players.push({
      name: round.player,
      net,
      handicap: roundHandicap(round),
      points: roundPoints(round)
    });
  });

  return [...events.values()]
    .map(event => {
      const players = event.players.sort((a, b) => a.net - b.net || a.name.localeCompare(b.name));
      const winningNet = players[0]?.net;
      const winners = players.filter(player => Math.abs(player.net - winningNet) < 0.0005);
      return { ...event, players, winningNet, winners };
    })
    .sort((a, b) => {
      const dateDifference = new Date(b.date).getTime() - new Date(a.date).getTime();
      return (Number.isFinite(dateDifference) ? dateDifference : 0) || Number(b.event) - Number(a.event);
    });
}

function findRoundRecap(event, moments = []) {
  const eventNumber = value => String(value ?? '').trim().replace(/^event\s*#?\s*/i, '').replace(/^0+(?=\d)/, '').toLowerCase();
  const courseName = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const year = Number(event.year || String(event.date || '').slice(0, 4));
  const candidates = moments.filter(moment => Number(moment.year) === year &&
    moment.source === 'this-day-history' && String(moment.body || '').trim());
  const number = eventNumber(event.event);
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(event.date) ? `${event.date}T12:00:00` : event.date);
  if (Number.isNaN(date.getTime()) || !courseName(event.course)) return null;
  const monthDay = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  // Event numbering can differ between standings and history. Never let a
  // matching number override a conflicting date or course.
  const matches = candidates.filter(moment =>
    moment.date === monthDay && courseName(moment.course) === courseName(event.course));
  if (matches.length === 1) return matches[0];
  const exact = number ? matches.filter(moment => eventNumber(moment.event) === number) : [];
  return exact.length === 1 ? exact[0] : null;
}

function RoundRecapDialog({ recap, onClose }) {
  const dialogRef = useRef(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);
  const { event, moment } = recap;
  return (
    <dialog ref={dialogRef} className="nevala-recap-dialog" aria-labelledby="nevala-recap-title"
      onCancel={onClose} onClose={onClose} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="nevala-recap-content">
        <button type="button" className="nevala-recap-close" onClick={onClose} autoFocus aria-label="Close round recap">Close ×</button>
        <p className="eyebrow">Round Recap · Event {event.event || '—'}</p>
        <p className="nevala-recap-meta">{formatResultDate(event.date)}, {event.year} · {event.course}</p>
        <h2 id="nevala-recap-title">{moment.title}</h2>
        {moment.photoUrl ? <img key={moment.photoUrl} src={moment.photoUrl} alt={moment.title || 'Round recap'}
          onError={e => { e.currentTarget.hidden = true; }} /> : null}
        <div className="nevala-recap-story">{moment.body}</div>
        <p className="nevala-recap-source">From This Day in DGL History</p>
      </div>
    </dialog>
  );
}

function NevalaFiles({ rounds = [], moments = [] }) {
  const [openEvent, setOpenEvent] = useState('');
  const [recap, setRecap] = useState(null);
  const season = new Date().getFullYear();
  const events = useMemo(() => currentSeasonResults(rounds), [rounds]);

  return (
    <article className="card wide nevala-files" id="nevala-files">
      <div className="section-head nevala-head">
        <div>
          <p className="eyebrow">{season} Results Archive</p>
          <h2>The Nevala Files</h2>
          <p className="nevala-tagline">Because Brian wanted receipts.</p>
        </div>
        <span className="updated">{events.length} completed round{events.length === 1 ? '' : 's'}</span>
      </div>

      {events.length ? (
        <div className="nevala-round-list">
          {events.map(event => {
            const moment = findRoundRecap(event, moments);
            const isOpen = openEvent === event.key;
            const winnerNames = event.winners.map(winner => winner.name).join(' / ');
            const winnerPoints = event.winners
              .map(winner => Number.isFinite(winner.points) ? winner.points.toFixed(2).replace(/\.00$/, '') : '—')
              .join(' / ');

            return (
              <div className="nevala-round" key={event.key}>
                <button
                  type="button"
                  className="nevala-summary"
                  aria-expanded={isOpen}
                  onClick={() => setOpenEvent(isOpen ? '' : event.key)}
                >
                  <span className="nevala-event">
                    <small>Event {event.event || '—'} • {formatResultDate(event.date)}</small>
                    <strong>{event.course}</strong>
                  </span>
                  <span><small>Winner</small><b>{winnerNames}</b></span>
                  <span><small>Winning Net</small><b>{formatSigned(event.winningNet)}</b></span>
                  <span><small>DGL Points</small><b>{winnerPoints}</b></span>
                  <span><small>Host</small><b>{event.host || 'Not recorded'}</b></span>
                  <em aria-hidden="true">⌄</em>
                </button>

                {moment ? <div className="nevala-recap-actions">
                  <button type="button" className="nevala-recap-link" aria-haspopup="dialog"
                    aria-label={`Read round recap for Event ${event.event} at ${event.course}`}
                    onClick={() => setRecap({ event, moment })}>Read Round Recap →</button>
                </div> : null}

                {isOpen ? (
                  <div className="nevala-field">
                    <div className="nevala-field-head">
                      <span>Finish</span><span>Player</span><span>Net</span><span>Handicap Then</span><span>DGL Points</span>
                    </div>
                    {event.players.map((player, index) => (
                      <div className="nevala-field-row" key={`${event.key}-${player.name}`}>
                        <span>{index + 1}</span>
                        <strong>{player.name}</strong>
                        <b>{formatSigned(player.net)}</b>
                        <span>{Number.isFinite(player.handicap) ? player.handicap.toFixed(1) : '—'}</span>
                        <span>{Number.isFinite(player.points) ? player.points.toFixed(2).replace(/\.00$/, '') : '—'}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="nevala-empty">Completed {season} rounds will appear here automatically.</p>
      )}

      {recap ? <RoundRecapDialog recap={recap} onClose={() => setRecap(null)} /> : null}
      <style>{`
        .nevala-recap-actions{padding:0 15px 13px}.nevala-recap-link{background:none;border:0;padding:7px 0;color:#f0c75e;font:inherit;font-size:13px;font-weight:700;text-decoration:underline;text-underline-offset:4px;cursor:pointer}.nevala-recap-link:focus-visible,.nevala-recap-close:focus-visible{outline:2px solid #f0c75e;outline-offset:4px}.nevala-recap-dialog{box-sizing:border-box;width:calc(100% - 24px);max-width:720px;max-height:85vh;max-height:85dvh;padding:0;border:1px solid #80672e;border-radius:20px;background:#17120e;color:#f5efe5;overflow:auto;overscroll-behavior:contain;box-shadow:0 24px 90px #0009}.nevala-recap-dialog::backdrop{background:#000c}.nevala-recap-content{padding:24px}.nevala-recap-close{display:block;margin:0 0 18px auto;border:1px solid #80672e;border-radius:20px;padding:10px 16px;background:#241b11;color:#f0c75e;font:inherit;cursor:pointer}.nevala-recap-meta,.nevala-recap-source{color:#bdb3a3;font-size:13px}.nevala-recap-content h2{margin:10px 0 20px;font-size:clamp(24px,5vw,36px);line-height:1.15;overflow-wrap:anywhere}.nevala-recap-content img{display:block;width:100%;height:auto;max-height:55vh;object-fit:contain;background:#0c0907;border-radius:12px;margin-bottom:22px}.nevala-recap-story{white-space:pre-wrap;overflow-wrap:anywhere;font-size:16px;line-height:1.7}.nevala-recap-source{margin-top:26px;border-top:1px solid #ffffff18;padding-top:16px}@media(max-width:480px){.nevala-recap-content{padding:18px}}
        .nevala-files{grid-column:1/-1;overflow:hidden}.nevala-head{align-items:flex-end}.nevala-head h2{margin-bottom:4px}.nevala-tagline{margin:0;color:#a99f8d;font-weight:700}.nevala-round-list{display:grid;gap:9px}.nevala-round{overflow:hidden;border:1px solid rgba(226,184,73,.2);border-radius:15px;background:rgba(0,0,0,.2)}.nevala-summary{width:100%;display:grid;grid-template-columns:minmax(170px,1.35fr) repeat(4,minmax(90px,1fr)) 24px;align-items:center;gap:12px;padding:15px;color:inherit;font:inherit;text-align:left;background:transparent;border:0;cursor:pointer}.nevala-summary:hover{background:rgba(226,184,73,.05)}.nevala-summary small{display:block;margin-bottom:4px;color:#9f9687;font-size:9px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}.nevala-summary strong,.nevala-summary b{font-size:13px}.nevala-summary>span:not(.nevala-event) b{color:#f0c75e}.nevala-summary em{color:#f0c75e;font-size:21px;font-style:normal;transition:transform .18s ease}.nevala-summary[aria-expanded=true] em{transform:rotate(180deg)}.nevala-field{padding:0 15px 14px;overflow-x:auto}.nevala-field-head,.nevala-field-row{min-width:580px;display:grid;grid-template-columns:58px minmax(160px,1.4fr) repeat(3,minmax(90px,.8fr));gap:12px;align-items:center;padding:9px 10px}.nevala-field-head{border-top:1px solid rgba(226,184,73,.16);color:#8f8575;font-size:9px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}.nevala-field-row{border-top:1px solid rgba(255,255,255,.05);font-size:12px}.nevala-field-head span:not(:nth-child(2)),.nevala-field-row>*:not(:nth-child(2)){text-align:right}.nevala-field-row b{color:#f0c75e}.nevala-empty{margin:0;color:#c8bfae}@media(max-width:760px){.nevala-head{align-items:flex-start}.nevala-summary{grid-template-columns:1fr 1fr 24px}.nevala-event{grid-column:1/3}.nevala-summary em{grid-column:3;grid-row:1/4}.nevala-summary>span:nth-child(5){grid-column:1/3}}
      `}</style>
    </article>
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

export function NevalaFilesPage({ data, goHome }) {
  return (
    <section aria-label="The Nevala Files">
      <button type="button" onClick={goHome} className="gold-button" style={{ marginBottom: 20 }}>← BACK TO DGL TOUR</button>
      <NevalaFiles rounds={Array.isArray(data?.historicalRounds) ? data.historicalRounds : []}
        moments={Array.isArray(data?.historyMoments) ? data.historyMoments : []} />
    </section>
  );
}

function HomePage({ data, syncStatus, goRedRoom, goAnnals, goStateTrophies, goSportsbook, goNevalaFiles, goPlayers, goFamilyScramble }) {
  data = {
    ...fallbackData,
    ...(data || {}),
    standings: Array.isArray(data?.standings) ? data.standings : [],
    events: Array.isArray(data?.events) ? data.events : [],
    redRounds: Array.isArray(data?.redRounds) ? data.redRounds : [],
    historyMoments: Array.isArray(data?.historyMoments) ? data.historyMoments : [],
    historicalRounds: Array.isArray(data?.historicalRounds) ? data.historicalRounds : [],
    sportsbook: Array.isArray(data?.sportsbook) ? data.sportsbook : [],
    sidePots: { ...fallbackData.sidePots, ...(data?.sidePots || {}) }
  };

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

      <PlayerBirthdays data={data} />

      <section className="ticker">
        <div className="ticker-track">
          <span><strong>{syncStatus}</strong></span>
          <span>Last updated: {data.lastUpdated}</span>
          <span>Alex Rogers hit the Eagle Pot on 10/9/26 at The Lehman — Hole #5, 327-yard Par 4, scored 2. Paid $54.13.</span>
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
              <span data-payout="54.125"><strong>Eagle Pot Last Hit</strong> Alex Rogers • The Lehman • Hole #5 • 327-yard Par 4 • Scored 2 • 10/9/26 • Paid $54.13</span>
              <span><strong>Previous Eagle Pot</strong> Mitch O’Neill • Mammoth Dunes • Hole #14 • 297 yards • 6/25/26 • Paid $44.25</span>
              <span><strong>Previous Eagle Pot</strong> Scott Wishart • Edinburgh Golf Course • Hole #1 • 492-yard Par 5 • 6/18/26 • Paid $77.50</span>
              <span><strong>2025 Eagle Pot</strong> Scott Wishart • Dutch 27 Red 9 • Hole #5 • 520-yard Par 5 • 9/26/25 • Paid $117.50</span>
            </div>
          </div>
          <div className="fall-classic-pot" data-version="fall-classic-2026-09-21" style={{ marginTop: 20, paddingTop: 18, borderTop: '1px solid rgba(229,188,80,.3)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <strong style={{ color: '#f5d675', fontSize: 17 }}>DGL Fall Classic Pot</strong>
            <strong style={{ color: '#f5d675', fontSize: 30, fontVariantNumeric: 'tabular-nums' }}>
              {Number.isFinite(data.sidePots.fallClassic) ? money(data.sidePots.fallClassic) : '—'}
            </strong>
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

        <TournamentCenter
          events={data.events}
          sportsbook={data.sportsbook}
          rounds={data.historicalRounds}
          historicalRounds={data.historicalRounds}
          leader={leader}
        />

        <article className="card">
          <p className="eyebrow">{new Date().getFullYear()} Results Archive</p>
          <h2>📂 The Nevala Files</h2>
          <p>Because Brian wanted receipts.</p>
          <p>Every round this season: winners, net scores, DGL points, and hosts. Open a round for the full field and handicaps at the time.</p>
          <button type="button" onClick={goNevalaFiles} className="gold-button">OPEN THE FILES</button>
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


        <article className="card family-scramble-entry-card">
          <p className="eyebrow">Family • Friends • Golf</p>
          <h2>4th Annual Dojo Family Scramble</h2>
          <p>September 13, 2026 at Gem Lake Hills. Tee times, rules, contests, past champions, and the full day schedule.</p>
          <button onClick={goFamilyScramble} className="gold-button">VIEW FAMILY SCRAMBLE</button>
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

import React, { useEffect, useMemo, useState } from 'react';
import { AssetPhoto, formatCommitment, formatOdds, sportsbookInsights } from './core.jsx';

function useCountdown(event) {
  const target = useMemo(() => {
    if (!event?.date) return null;
    const raw = `${event.date}${event.time ? ` ${event.time}` : ''}`;
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }, [event?.date, event?.time]);

  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (!target) {
    return { label: 'SCHEDULED', days: null, hours: null, minutes: null };
  }

  const difference = target.getTime() - now.getTime();
  if (difference <= 0) {
    return { label: 'TEEING OFF', days: 0, hours: 0, minutes: 0 };
  }

  return {
    label: 'NEXT TEE TIME',
    days: Math.floor(difference / 86400000),
    hours: Math.floor((difference % 86400000) / 3600000),
    minutes: Math.floor((difference % 3600000) / 60000)
  };
}

function EventMiniCard({ event }) {
  return (
    <div className="tc-mini-card">
      <span>EVENT {event.event || '—'}</span>
      <strong>{event.course || 'Course TBD'}</strong>
      <small>{event.date || 'Date TBD'}{event.time ? ` • ${event.time}` : ''}</small>
    </div>
  );
}

function TournamentCenter({ events = [], sportsbook = [], leader = {} }) {
  const upcoming = Array.isArray(events) ? events : [];
  console.log("TOURNAMENT EVENTS", events);
  const featuredEvent = upcoming[0] || {};
  console.log("FEATURED EVENT", featuredEvent);
  const secondaryEvents = upcoming.slice(1, 4);
  const insights = sportsbookInsights(Array.isArray(sportsbook) ? sportsbook : []);
  const countdown = useCountdown(featuredEvent);

  if (!featuredEvent.course) {
    return (
      <article className="card tc-shell" id="events">
        <div className="tc-empty">
          <span>⛳</span>
          <p className="eyebrow">Tournament Center</p>
          <h2>Next Event Coming Soon</h2>
          <p>Add Event, Date, Course, Time, and optional course media to the Future Events sheet.</p>
        </div>
      </article>
    );
  }

  const darkHorse = (Array.isArray(sportsbook) ? sportsbook : [])
    .filter(player => player.player && player.player !== insights.favorite.player)
    .sort((a, b) => Number(b.odds || 0) - Number(a.odds || 0))[0] || {};

  return (
    <article className="card tc-shell" id="events">
      <div className="tc-kicker-row">
        <div>
          <p className="eyebrow">Tournament Center</p>
          <h2>{featuredEvent.course}</h2>
        </div>
        <span className="tc-event-pill">EVENT {featuredEvent.event || '—'}</span>
      </div>

      <div className="tc-hero">
        {featuredEvent.photoUrl ? (
          <AssetPhoto
            src={featuredEvent.photoUrl}
            alt={featuredEvent.course}
            className="tc-course-photo"
            fallback="⛳"
          />
        ) : (
          <div className="tc-course-placeholder">
            <span>⛳</span>
            <strong>{featuredEvent.course}</strong>
          </div>
        )}

        <div className="tc-hero-shade" />
        <div className="tc-hero-copy">
          {featuredEvent.courseLogo ? (
            <AssetPhoto src={featuredEvent.courseLogo} alt="Course logo" className="tc-course-logo" fallback="" />
          ) : null}
          <span>{featuredEvent.date || 'Date TBD'}{featuredEvent.time ? ` • ${featuredEvent.time}` : ''}</span>
          <strong>{featuredEvent.course}</strong>
          {featuredEvent.week ? <em>{featuredEvent.week}</em> : null}
        </div>

        <div className="tc-countdown">
          <small>{countdown.label}</small>
          {countdown.days === null ? (
            <strong>SCHEDULED</strong>
          ) : (
            <div>
              <b>{String(countdown.days).padStart(2, '0')}<span>DAYS</span></b>
              <b>{String(countdown.hours).padStart(2, '0')}<span>HRS</span></b>
              <b>{String(countdown.minutes).padStart(2, '0')}<span>MIN</span></b>
            </div>
          )}
        </div>
      </div>

      <div className="tc-market-grid">
        <div><span>Favorite</span><strong>{insights.favorite.player || leader.name || 'TBD'}</strong><em>{insights.favorite.odds ? formatOdds(insights.favorite.odds) : ''}</em></div>
        <div><span>Best Value</span><strong>{insights.bestValue.player || 'TBD'}</strong><em>{insights.bestValue.valueLabel || ''}</em></div>
        <div><span>Dark Horse</span><strong>{darkHorse.player || 'TBD'}</strong><em>{darkHorse.odds ? formatOdds(darkHorse.odds) : ''}</em></div>
        <div><span>Field</span><strong>{formatCommitment(featuredEvent.notes) || 'TBD'}</strong><em>committed</em></div>
      </div>

      {(featuredEvent.courseDetails || featuredEvent.courseWebsite || featuredEvent.googleMap || featuredEvent.scorecardUrl || featuredEvent.flyoverUrl) ? (
        <div className="tc-details">
          {featuredEvent.courseDetails ? (
            <div className="tc-course-details">
              <span>Course Details</span>
              <strong>{featuredEvent.courseDetails}</strong>
            </div>
          ) : null}
          <div className="tc-actions">
            {featuredEvent.courseWebsite ? <a href={featuredEvent.courseWebsite} target="_blank" rel="noreferrer">🌐 Course Website</a> : null}
            {featuredEvent.googleMap ? <a href={featuredEvent.googleMap} target="_blank" rel="noreferrer">📍 Google Maps</a> : null}
            {featuredEvent.scorecardUrl ? <a href={featuredEvent.scorecardUrl} target="_blank" rel="noreferrer">📄 Scorecard</a> : null}
            {featuredEvent.flyoverUrl ? <a href={featuredEvent.flyoverUrl} target="_blank" rel="noreferrer">🎥 Flyover</a> : null}
          </div>
        </div>
      ) : null}

      {secondaryEvents.length ? (
        <div className="tc-upcoming">
          <p className="eyebrow">Also Upcoming</p>
          <div className="tc-mini-grid">
            {secondaryEvents.map(event => <EventMiniCard event={event} key={`${event.event}-${event.course}`} />)}
          </div>
        </div>
      ) : null}

      <style>{`
        .tc-shell{grid-column:1/-1;padding:20px;overflow:hidden}
        .tc-kicker-row{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:14px}
        .tc-kicker-row h2{margin:2px 0 0;font-size:clamp(30px,5vw,54px)}
        .tc-event-pill{border:1px solid rgba(232,192,88,.48);border-radius:999px;padding:8px 12px;color:#f0c75e;font-size:11px;font-weight:900;letter-spacing:.12em}
        .tc-hero{position:relative;min-height:clamp(330px,50vw,560px);border-radius:24px;overflow:hidden;border:1px solid rgba(226,184,73,.32);background:#100b08;box-shadow:0 28px 70px rgba(0,0,0,.42)}
        .tc-course-photo{display:block;width:100%;height:clamp(330px,50vw,560px);object-fit:cover}
        .tc-course-placeholder{height:clamp(330px,50vw,560px);display:grid;place-content:center;text-align:center;background:radial-gradient(circle at 50% 30%,rgba(181,138,40,.28),transparent 38%),linear-gradient(145deg,#23180d,#070605);color:#f7dfa0}
        .tc-course-placeholder span{font-size:72px}.tc-course-placeholder strong{font-size:clamp(28px,6vw,58px);margin-top:8px}
        .tc-hero-shade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(0,0,0,.84),rgba(0,0,0,.14) 55%,rgba(0,0,0,.58)),linear-gradient(0deg,rgba(0,0,0,.88),transparent 54%)}
        .tc-hero-copy{position:absolute;left:clamp(18px,4vw,42px);bottom:clamp(22px,5vw,48px);max-width:65%;display:grid;gap:7px;color:#fff}
        .tc-course-logo{width:90px;max-height:70px;object-fit:contain;object-position:left center;margin-bottom:4px}
        .tc-hero-copy>span{color:#edca70;font-size:12px;font-weight:900;letter-spacing:.12em;text-transform:uppercase}
        .tc-hero-copy>strong{font-size:clamp(34px,7vw,72px);line-height:.94;text-shadow:0 4px 18px rgba(0,0,0,.75)}
        .tc-hero-copy>em{font-style:normal;color:#e6dece;font-weight:700}
        .tc-countdown{position:absolute;right:clamp(16px,4vw,38px);top:clamp(16px,4vw,34px);min-width:250px;padding:16px 18px;border-radius:18px;border:1px solid rgba(241,204,105,.38);background:rgba(8,6,4,.68);backdrop-filter:blur(12px);box-shadow:0 14px 40px rgba(0,0,0,.35)}
        .tc-countdown small{display:block;margin-bottom:10px;color:#f0c75e;font-size:10px;font-weight:900;letter-spacing:.18em;text-align:center}
        .tc-countdown>strong{display:block;text-align:center;font-size:24px;color:#fff}
        .tc-countdown>div{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
        .tc-countdown b{font-size:28px;text-align:center;color:#fff}.tc-countdown b span{display:block;color:#cdb57d;font-size:8px;letter-spacing:.15em}
        .tc-market-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:14px}
        .tc-market-grid>div{padding:15px;border-radius:16px;border:1px solid rgba(226,184,73,.2);background:linear-gradient(180deg,rgba(255,255,255,.055),rgba(0,0,0,.22));display:grid;gap:4px;min-height:104px}
        .tc-market-grid span,.tc-course-details span{color:#d7ad50;font-size:10px;font-weight:900;letter-spacing:.13em;text-transform:uppercase}
        .tc-market-grid strong{font-size:18px}.tc-market-grid em{font-style:normal;color:#c8bfae;font-size:12px}
        .tc-details{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:12px;padding:16px;border-radius:16px;border:1px solid rgba(226,184,73,.2);background:rgba(0,0,0,.24)}
        .tc-course-details{display:grid;gap:4px}.tc-course-details strong{font-size:15px;color:#fff}
        .tc-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px}
        .tc-actions a{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:10px 14px;border-radius:999px;border:1px solid rgba(240,199,94,.5);background:linear-gradient(180deg,rgba(240,199,94,.2),rgba(111,73,12,.24));color:#ffe6a2;text-decoration:none;font-size:10px;font-weight:900;letter-spacing:.06em;text-transform:uppercase}
        .tc-upcoming{margin-top:18px}.tc-mini-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
        .tc-mini-card{padding:14px;border-radius:15px;border:1px solid rgba(226,184,73,.18);background:rgba(0,0,0,.24);display:grid;gap:4px}
        .tc-mini-card span{color:#d7ad50;font-size:9px;font-weight:900;letter-spacing:.13em}.tc-mini-card strong{font-size:17px}.tc-mini-card small{color:#c8bfae}
        .tc-empty{text-align:center;padding:54px 18px}.tc-empty>span{font-size:58px}.tc-empty h2{font-size:36px;margin:6px 0}
        @media(max-width:840px){.tc-market-grid{grid-template-columns:repeat(2,1fr)}.tc-countdown{min-width:220px}.tc-hero-copy{max-width:72%}}
        @media(max-width:620px){.tc-shell{padding:14px}.tc-kicker-row{align-items:flex-start;flex-direction:column}.tc-hero{min-height:500px}.tc-course-photo,.tc-course-placeholder{height:500px}.tc-hero-copy{left:16px;right:16px;bottom:22px;max-width:none}.tc-countdown{left:14px;right:14px;top:14px;min-width:0}.tc-market-grid,.tc-mini-grid{grid-template-columns:1fr}.tc-details{align-items:stretch;flex-direction:column}.tc-actions{justify-content:stretch}.tc-actions a{flex:1}.tc-hero-copy>strong{font-size:42px}}
      `}</style>
    </article>
  );
}

export default TournamentCenter;

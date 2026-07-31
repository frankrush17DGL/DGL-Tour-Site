import React, { useEffect, useMemo, useState } from 'react';
import { AssetPhoto, canonicalName } from './core.jsx';

const EMPTY_WEATHER = Object.freeze([]);
const TOURNAMENT_CENTER_BUILD = 'TC 2026.07.31.3';

function parseCsvRows(text = '') {
  const rows = [];
  let row = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];
    if (character === '"' && quoted && next === '"') {
      value += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === ',' && !quoted) {
      row.push(value);
      value = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (value || row.length) {
        row.push(value);
        rows.push(row);
      }
      row = [];
      value = '';
      if (character === '\r' && next === '\n') index += 1;
    } else {
      value += character;
    }
  }
  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }
  return rows;
}

function roundYear(round = {}) {
  const direct = Number(round.year);
  if (direct >= 2020 && direct <= 2100) return direct;
  const eventIdYear = String(round.eventId || round.roundId || '').match(/^(20\d{2})[-_:]/);
  if (eventIdYear) return Number(eventIdYear[1]);
  const dateYear = String(round.date || round.eventDate || '').match(/(?:^|\/)(20\d{2}|\d{2})$/);
  if (!dateYear) return null;
  const year = Number(dateYear[1]);
  return year < 100 ? 2000 + year : year;
}

function roundEventNumber(round = {}) {
  const direct = String(round.eventNumber || round.event || '').match(/\d+/);
  if (direct) return direct[0];
  const eventId = String(round.eventId || round.roundId || '').match(/20\d{2}[-_:](\d+)/);
  return eventId ? eventId[1] : '';
}

function isoEventDate(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const match = raw.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2}|\d{4}))?$/);
  if (!match) return '';
  let year = match[3] ? Number(match[3]) : new Date().getFullYear();
  if (year < 100) year += 2000;
  return `${year}-${String(Number(match[1])).padStart(2, '0')}-${String(Number(match[2])).padStart(2, '0')}`;
}

function eventHour(value) {
  const match = String(value || '').trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  if (/pm/i.test(match[3] || '') && hour < 12) hour += 12;
  if (/am/i.test(match[3] || '') && hour === 12) hour = 0;
  return hour >= 0 && hour <= 23 ? hour : null;
}

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

  if (!target) return { label: 'SCHEDULED', days: null, hours: null, minutes: null };

  const difference = target.getTime() - now.getTime();
  if (difference <= 0) return { label: 'TEEING OFF', days: 0, hours: 0, minutes: 0 };

  return {
    label: 'NEXT TEE TIME',
    days: Math.floor(difference / 86400000),
    hours: Math.floor((difference % 86400000) / 3600000),
    minutes: Math.floor((difference % 3600000) / 60000)
  };
}

function committedNames(event = {}) {
  if (Array.isArray(event.committedPlayers) && event.committedPlayers.length) {
    return event.committedPlayers.filter(Boolean);
  }

  return String(event.notes || '')
    .split(/[,;|\n]+/)
    .map(name => name.trim())
    .filter(Boolean)
    .filter(name => !/^\d+\s*(players?|committed)?$/i.test(name));
}

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

function finiteCoordinate(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function coordinatesFromMapLink(link = '') {
  const value = String(link || '').trim();
  if (!value) return null;

  // Google Maps commonly stores coordinates after an @, in query, or in !3d/!4d.
  const googleAt = value.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  const googleData = value.match(/!3d(-?\d+(?:\.\d+))!4d(-?\d+(?:\.\d+))/);
  // Apple Maps commonly stores coordinates in ll=latitude,longitude.
  const queryCoordinates = value.match(/[?&](?:ll|q|query)=(-?\d+(?:\.\d+)?)(?:%2C|,)(-?\d+(?:\.\d+)?)/i);
  const match = googleAt || googleData || queryCoordinates;
  if (!match) return null;

  const latitude = finiteCoordinate(match[1]);
  const longitude = finiteCoordinate(match[2]);
  return latitude !== null && longitude !== null ? { latitude, longitude } : null;
}

function eventCoordinates(event = {}) {
  const latitude = finiteCoordinate(event.latitude ?? event.lat);
  const longitude = finiteCoordinate(event.longitude ?? event.lng ?? event.lon);
  if (latitude !== null && longitude !== null) return { latitude, longitude };

  const mapLinks = [
    event.googleMap,
    event.googleMaps,
    event.googleMapsUrl,
    event.appleMap,
    event.appleMaps,
    event.appleMapsUrl,
    event.mapUrl,
    event.mapsLink
  ];
  return mapLinks.map(coordinatesFromMapLink).find(Boolean) || null;
}

function roundRows(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];
  return [
    value.rounds,
    value.results,
    value.history,
    value.records,
    value.data
  ].find(Array.isArray) || [];
}

function roundDate(round = {}) {
  const value = round.date || round.eventDate || round.playedAt || '';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function roundPlayer(round = {}) {
  return round.player || round.playerName || round.name || round.golfer || '';
}

function roundEventKey(round = {}) {
  return String(round.eventId || round.event || round.eventNumber || round.date || round.eventDate || round.course || '');
}

function roundLabel(round = {}) {
  return round.eventName || round.event || round.course || `Event ${round.eventNumber || ''}`.trim() || 'DGL Round';
}

function netPerformance(round = {}) {
  const direct = [round.netToPar, round.netDifferential, round.netVsPar, round.netScoreToPar]
    .map(Number)
    .find(Number.isFinite);
  if (Number.isFinite(direct)) return direct;

  const netScore = Number(round.netScore ?? round.net);
  const par = Number(round.par ?? round.netPar);
  return Number.isFinite(netScore) && Number.isFinite(par) ? netScore - par : null;
}

function recentFormFor(playerName, rounds = [], referenceDate = new Date()) {
  const playerRounds = rounds
    .filter(round => canonicalName(roundPlayer(round)) === canonicalName(playerName))
    .map(round => ({ ...round, parsedDate: roundDate(round), performance: netPerformance(round) }))
    .filter(round => round.parsedDate && Number.isFinite(round.performance))
    .sort((a, b) => b.parsedDate - a.parsedDate);

  if (!playerRounds.length) return { value: null, rounds: 0, basis: 'No recent rounds' };

  const cutoff = new Date(referenceDate);
  cutoff.setDate(cutoff.getDate() - 30);
  const last30 = playerRounds.filter(round => round.parsedDate >= cutoff);
  const selected = last30.length >= 2 ? last30 : playerRounds.slice(0, 3);
  const weights = selected.length >= 3 ? [0.5, 0.3, 0.2] : selected.length === 2 ? [0.6, 0.4] : [1];
  const weightTotal = weights.slice(0, selected.length).reduce((sum, weight) => sum + weight, 0);
  const value = selected.reduce((sum, round, index) => sum + round.performance * weights[index], 0) / weightTotal;

  return {
    value,
    rounds: selected.length,
    basis: last30.length >= 2 ? 'Last 30 days' : `Last ${selected.length} DGL round${selected.length === 1 ? '' : 's'}`
  };
}

function headToHeadRecord(playerA, playerB, rounds = []) {
  const events = new Map();
  rounds.forEach(round => {
    const key = roundEventKey(round);
    const player = canonicalName(roundPlayer(round));
    const performance = netPerformance(round);
    if (!key || !player || !Number.isFinite(performance)) return;
    if (!events.has(key)) events.set(key, { results: new Map(), round });
    events.get(key).results.set(player, { performance, round });
  });

  let winsA = 0;
  let winsB = 0;
  let ties = 0;
  const meetings = [];
  events.forEach(({ results, round }) => {
    const resultA = results.get(canonicalName(playerA));
    const resultB = results.get(canonicalName(playerB));
    if (!Number.isFinite(resultA?.performance) || !Number.isFinite(resultB?.performance)) return;
    let winner = 'Tie';
    if (resultA.performance < resultB.performance) {
      winsA += 1;
      winner = playerA;
    } else if (resultB.performance < resultA.performance) {
      winsB += 1;
      winner = playerB;
    } else {
      ties += 1;
    }
    meetings.push({
      date: roundDate(round),
      dateLabel: round.date || round.eventDate || round.playedAt || 'Date unavailable',
      event: roundLabel(round),
      course: round.course || resultA.round?.course || resultB.round?.course || '',
      scoreA: resultA.performance,
      scoreB: resultB.performance,
      winner
    });
  });

  meetings.sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));
  return { playerA, playerB, winsA, winsB, ties, shared: winsA + winsB + ties, meetings };
}

function matchupSummary(playerName, fieldNames, rounds) {
  return fieldNames
    .filter(opponent => canonicalName(opponent) !== canonicalName(playerName))
    .reduce((summary, opponent) => {
      const record = headToHeadRecord(playerName, opponent, rounds);
      summary.wins += record.winsA;
      summary.losses += record.winsB;
      summary.ties += record.ties;
      summary.shared += record.shared;
      return summary;
    }, { wins: 0, losses: 0, ties: 0, shared: 0 });
}

function projectedField(event, sportsbook, rounds = []) {
  const names = committedNames(event);
  const board = Array.isArray(sportsbook) ? sportsbook : [];

  const matched = names.map(name => {
    const key = canonicalName(name);
    const model = board.find(player => canonicalName(player.player) === key);
    return { ...(model || {}), player: name };
  });

  if (!matched.length) return [];

  const eventDate = roundDate(event) || new Date();
  const enriched = matched.map(player => ({
    ...player,
    recentForm: recentFormFor(player.player, rounds, eventDate),
    matchup: matchupSummary(player.player, names, rounds)
  }));
  const validForms = enriched.map(player => player.recentForm.value).filter(Number.isFinite);
  const fieldForm = validForms.length
    ? validForms.reduce((sum, value) => sum + value, 0) / validForms.length
    : null;

  const weights = enriched.map(player => {
    // Accurate handicaps make the starting point equal. Form and matchup history
    // are deliberately capped so they can only create subtle movement.
    const formAdjustment = Number.isFinite(player.recentForm.value) && Number.isFinite(fieldForm)
      ? clamp((fieldForm - player.recentForm.value) / 12, -0.08, 0.08)
      : 0;
    const matchupRate = player.matchup.shared
      ? (player.matchup.wins + (player.matchup.ties * 0.5) + 5) / (player.matchup.shared + 10)
      : 0.5;
    const matchupAdjustment = clamp((matchupRate - 0.5) * 0.2, -0.04, 0.04);
    return 1 + formAdjustment + matchupAdjustment;
  });
  const total = weights.reduce((sum, value) => sum + value, 0);

  return enriched
    .map((player, index) => ({
      ...player,
      projectedWinPercent: total > 0 ? (weights[index] / total) * 100 : 0
    }))
    .sort((a, b) => b.projectedWinPercent - a.projectedWinPercent);
}

function weatherDescription(code) {
  if (code === 0) return 'Clear';
  if ([1, 2].includes(code)) return 'Mostly clear';
  if (code === 3) return 'Overcast';
  if ([45, 48].includes(code)) return 'Fog';
  if ([51, 53, 55, 56, 57].includes(code)) return 'Drizzle';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'Rain';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'Snow';
  if ([95, 96, 99].includes(code)) return 'Thunderstorms';
  return 'Forecast';
}

function weatherIcon(code) {
  if (code === 0) return '☀️';
  if ([1, 2].includes(code)) return '🌤️';
  if ([3, 45, 48].includes(code)) return '☁️';
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return '🌧️';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return '🌨️';
  if ([95, 96, 99].includes(code)) return '⛈️';
  return '⛅';
}

function useRoundWeather(event, suppliedWeather = EMPTY_WEATHER) {
  const [weather, setWeather] = useState(Array.isArray(suppliedWeather) ? suppliedWeather : []);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (Array.isArray(suppliedWeather) && suppliedWeather.length) {
      setWeather(suppliedWeather.slice(0, 4));
      setStatus('ready');
      setMessage('');
      return undefined;
    }
    if (!event?.course || !event?.date || !event?.time) {
      setStatus('unavailable');
      setMessage('Course, date, or tee time is missing.');
      return undefined;
    }

    const controller = new AbortController();
    async function loadForecast() {
      try {
        setStatus('loading');
        setMessage('');
        setWeather([]);
        const forecastDate = isoEventDate(event.date);
        if (!forecastDate) throw new Error(`Invalid event date: ${event.date}`);
        const linkedCoordinates = eventCoordinates(event);
        let latitude = linkedCoordinates?.latitude;
        let longitude = linkedCoordinates?.longitude;
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          const place = encodeURIComponent([event.course, event.city, event.state].filter(Boolean).join(', '));
          const geoResponse = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${place}&count=1&language=en&format=json`, { signal: controller.signal });
          const geo = await geoResponse.json();
          latitude = Number(geo?.results?.[0]?.latitude);
          longitude = Number(geo?.results?.[0]?.longitude);
        }
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) throw new Error('Course location unavailable');

        const params = new URLSearchParams({
          latitude: String(latitude),
          longitude: String(longitude),
          hourly: 'temperature_2m,apparent_temperature,precipitation_probability,weather_code,wind_speed_10m,wind_gusts_10m',
          temperature_unit: 'fahrenheit',
          wind_speed_unit: 'mph',
          timezone: 'auto',
          start_date: forecastDate,
          end_date: forecastDate
        });
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { signal: controller.signal });
        if (!response.ok) throw new Error(`Forecast service returned ${response.status}.`);
        const data = await response.json();
        const teeHour = eventHour(event.time);
        const hours = (data?.hourly?.time || []).map((time, index) => ({
          time,
          temperature: data.hourly.temperature_2m?.[index],
          feelsLike: data.hourly.apparent_temperature?.[index],
          rainChance: data.hourly.precipitation_probability?.[index],
          weatherCode: data.hourly.weather_code?.[index],
          wind: data.hourly.wind_speed_10m?.[index],
          gust: data.hourly.wind_gusts_10m?.[index]
        }));
        const prefix = `${forecastDate}T${String(teeHour ?? 0).padStart(2, '0')}:`;
        const matchIndex = teeHour === null ? 0 : hours.findIndex(hour => String(hour.time).startsWith(prefix));
        const firstIndex = matchIndex >= 0 ? matchIndex : 0;
        const roundHours = hours.slice(firstIndex, firstIndex + 4);
        if (!roundHours.length) throw new Error('No hourly forecast was returned for this date.');
        setWeather(roundHours);
        setStatus('ready');
      } catch (error) {
        if (error.name !== 'AbortError') {
          setStatus('unavailable');
          setMessage(error.message || 'Forecast unavailable.');
        }
      }
    }
    loadForecast();
    return () => controller.abort();
  }, [
    event?.course,
    event?.date,
    event?.time,
    event?.latitude,
    event?.longitude,
    event?.googleMap,
    event?.googleMaps,
    event?.appleMap,
    event?.appleMaps,
    event?.mapUrl,
    event?.mapsLink,
    suppliedWeather
  ]);

  return { weather, status, message };
}

function EventMiniCard({ event }) {
  const players = committedNames(event);

  return (
    <div className="tc-mini-card">
      <div className="tc-mini-topline">
        <span>EVENT {event.event || '—'}</span>
        <small>{event.date || 'Date TBD'}{event.time ? ` • ${event.time}` : ''}</small>
      </div>
      <strong>{event.course || 'Course TBD'}</strong>
      <p>{players.length ? players.join(', ') : 'Committed players TBD'}</p>
    </div>
  );
}

function TournamentCenter({
  events = [],
  sportsbook = [],
  rounds = [],
  historicalRounds = [],
  roundResults = [],
  results = [],
  weather = EMPTY_WEATHER
}) {
  const [selectedMatchup, setSelectedMatchup] = useState(null);
  const upcoming = Array.isArray(events) ? events : [];
  const featuredEvent = upcoming[0] || {};
  const secondaryEvents = upcoming.slice(1);
  const historyRows = useMemo(() => {
    const candidates = [rounds, historicalRounds, roundResults, results];
    return candidates.map(roundRows).find(rowsList => rowsList.length) || [];
  }, [rounds, historicalRounds, roundResults, results]);
  // Historical metadata must come from the central sheet loader. Tournament
  // Center deliberately makes no additional Google requests so it cannot
  // throttle or interrupt the site's primary live-data refresh.
  const historyRowsWithCourses = historyRows;
  const projections = useMemo(
    () => projectedField(featuredEvent, sportsbook, historyRowsWithCourses),
    [featuredEvent, sportsbook, historyRowsWithCourses]
  );
  const headToHead = useMemo(() => {
    const names = committedNames(featuredEvent);
    return names.flatMap((player, index) => (
      names.slice(index + 1).map(opponent => headToHeadRecord(player, opponent, historyRowsWithCourses))
    )).filter(record => record.shared);
  }, [featuredEvent, historyRowsWithCourses]);
  const roundWeather = useRoundWeather(featuredEvent, weather);
  const countdown = useCountdown(featuredEvent);
  const averageRating = projections.length
    ? projections.reduce((sum, player) => sum + (Number(player.rating) || 0), 0) / projections.length
    : null;

  useEffect(() => {
    if (!selectedMatchup) return undefined;
    const closeOnEscape = event => {
      if (event.key === 'Escape') setSelectedMatchup(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [selectedMatchup]);

  if (!featuredEvent.course) {
    return (
      <article className="card tc-shell" id="events">
        <div className="tc-empty">
          <span>⛳</span>
          <p className="eyebrow">Tournament Center</p>
          <h2>Next Event Coming Soon</h2>
          <p>Add event details to the Future Events sheet.</p>
        </div>
      </article>
    );
  }

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

      <div className="tc-projection-layout">
        <section className="tc-projections">
          <div className="tc-subhead">
            <div>
              <p className="eyebrow">Event Model</p>
              <h3>Projected Event Win Probability</h3>
            </div>
            <span>{projections.length} committed</span>
          </div>

          {projections.length ? (
            <div className="tc-projection-list">
              {projections.map(player => (
                <div className="tc-projection-row" key={player.player}>
                  <div className="tc-projection-label">
                    <div>
                      <strong>{player.player}</strong>
                      <small>
                        {Number.isFinite(player.recentForm?.value)
                          ? `${player.recentForm.value > 0 ? '+' : ''}${player.recentForm.value.toFixed(1)} net • ${player.recentForm.basis}`
                          : 'Equal handicap baseline • Recent form unavailable'}
                      </small>
                    </div>
                    <b>{player.projectedWinPercent.toFixed(1)}%</b>
                  </div>
                  <div className="tc-projection-track">
                    <span style={{ width: `${Math.max(2, player.projectedWinPercent)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="tc-no-projections">
              Add committed player names to display equal-baseline event projections.
            </p>
          )}
          <p className="tc-method-note">
            Starts equal with accurate GHIN handicaps, then moves subtly for recent net form and sample-adjusted shared-round history. Season points and championship odds are excluded.
          </p>
        </section>

        <aside className="tc-strength">
          <p className="eyebrow">Strength of Field</p>
          <strong>{averageRating === null ? '—' : averageRating.toFixed(1)}</strong>
          <span>Average DGL Rating</span>
          <small>{projections.length} matched player{projections.length === 1 ? '' : 's'}</small>
        </aside>
      </div>

      <div className="tc-intel-grid">
        <section className="tc-weather">
          <div className="tc-subhead">
            <div>
              <p className="eyebrow">Round Forecast</p>
              <h3>Weather During Play</h3>
            </div>
            <span>4-hour window</span>
          </div>
          {roundWeather.weather.length ? (
            <div className="tc-weather-hours">
              {roundWeather.weather.map((hour, index) => (
                <div className="tc-weather-hour" key={`${hour.time}-${index}`}>
                  <strong>{new Date(hour.time).toLocaleTimeString([], { hour: 'numeric' })}</strong>
                  <b>{weatherIcon(Number(hour.weatherCode))}</b>
                  <span>{Math.round(Number(hour.temperature))}°</span>
                  <small>{weatherDescription(Number(hour.weatherCode))}</small>
                  <em>{Math.round(Number(hour.rainChance) || 0)}% rain</em>
                  <em>{Math.round(Number(hour.wind) || 0)} mph wind{Number(hour.gust) ? ` • ${Math.round(Number(hour.gust))} gusts` : ''}</em>
                </div>
              ))}
            </div>
          ) : (
            <p className="tc-no-projections">
              {roundWeather.status === 'loading'
                ? 'Loading the course forecast…'
                : `Forecast unavailable. ${roundWeather.message || 'Confirm the event coordinates and forecast date.'}`}
            </p>
          )}
        </section>

        <section className="tc-matchups">
          <div className="tc-subhead">
            <div>
              <p className="eyebrow">Historical Matchups</p>
              <h3>Head-to-Head Records</h3>
            </div>
            <span>{headToHead.length} matchup{headToHead.length === 1 ? '' : 's'}</span>
          </div>
          {headToHead.length ? (
            <div className="tc-matchup-list">
              {headToHead.map(record => (
                <button
                  type="button"
                  className="tc-matchup-card"
                  key={`${record.playerA}-${record.playerB}`}
                  onClick={() => setSelectedMatchup(record)}
                  aria-label={`View all shared rounds for ${record.playerA} and ${record.playerB}`}
                >
                  <div>
                    <strong>{record.playerA}</strong>
                    <b>{record.winsA}–{record.winsB}–{record.ties}</b>
                  </div>
                  <span>vs.</span>
                  <div>
                    <strong>{record.playerB}</strong>
                    <b>{record.winsB}–{record.winsA}–{record.ties}</b>
                  </div>
                  <small>{record.shared} shared DGL round{record.shared === 1 ? '' : 's'}</small>
                  <em>View round history →</em>
                </button>
              ))}
            </div>
          ) : (
            <p className="tc-no-projections">
              {historyRows.length
                ? `No shared rounds matched the committed golfers in the ${historyRows.length} historical result rows supplied.`
                : 'Historical results are not connected. Pass them as rounds, historicalRounds, roundResults, or results.'}
            </p>
          )}
        </section>
      </div>

      {(featuredEvent.courseDetails || featuredEvent.tees || featuredEvent.courseWebsite || featuredEvent.googleMap || featuredEvent.scorecardUrl || featuredEvent.flyoverUrl) ? (
        <div className="tc-details">
          {(featuredEvent.courseDetails || featuredEvent.tees) ? (
            <div className="tc-course-details">
              <span>Course Details</span>
              <strong>
                {[featuredEvent.courseDetails, featuredEvent.tees ? `${featuredEvent.tees} tees` : ''].filter(Boolean).join(' • ')}
              </strong>
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
          <div className="tc-upcoming-head">
            <div>
              <p className="eyebrow">Tour Schedule</p>
              <h3>Future Events</h3>
            </div>
            <span>{secondaryEvents.length} upcoming</span>
          </div>
          <div className="tc-mini-grid">
            {secondaryEvents.map((event, index) => (
              <EventMiniCard event={event} key={`${event.event}-${event.course}-${index}`} />
            ))}
          </div>
        </div>
      ) : null}

      {selectedMatchup ? (
        <div className="tc-modal-backdrop" role="presentation" onMouseDown={() => setSelectedMatchup(null)}>
          <section
            className="tc-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`${selectedMatchup.playerA} versus ${selectedMatchup.playerB} round history`}
            onMouseDown={event => event.stopPropagation()}
          >
            <div className="tc-modal-head">
              <div>
                <p className="eyebrow">Head-to-Head History</p>
                <h3>{selectedMatchup.playerA} vs. {selectedMatchup.playerB}</h3>
                <strong>
                  {selectedMatchup.winsA}–{selectedMatchup.winsB}–{selectedMatchup.ties}
                  <span> • {selectedMatchup.shared} shared rounds</span>
                </strong>
              </div>
              <button type="button" onClick={() => setSelectedMatchup(null)} aria-label="Close matchup history">×</button>
            </div>
            <div className="tc-history-list">
              {selectedMatchup.meetings.map((meeting, index) => (
                <div className="tc-history-row" key={`${meeting.dateLabel}-${meeting.event}-${index}`}>
                  <div>
                    <strong>{meeting.dateLabel}</strong>
                    <span>{meeting.event}{meeting.course && meeting.course !== meeting.event ? ` • ${meeting.course}` : ''}</span>
                  </div>
                  <div>
                    <span>{selectedMatchup.playerA}</span>
                    <b>{meeting.scoreA.toFixed(1)} net</b>
                  </div>
                  <div>
                    <span>{selectedMatchup.playerB}</span>
                    <b>{meeting.scoreB.toFixed(1)} net</b>
                  </div>
                  <small>{meeting.winner === 'Tie' ? 'Tie' : `${meeting.winner} won matchup`}</small>
                </div>
              ))}
            </div>
          </section>
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
        .tc-projection-layout{display:grid;grid-template-columns:minmax(0,1fr) 230px;gap:12px;margin-top:14px}
        .tc-projections,.tc-strength{border:1px solid rgba(226,184,73,.2);background:linear-gradient(180deg,rgba(255,255,255,.05),rgba(0,0,0,.22));border-radius:18px;padding:18px}
        .tc-subhead,.tc-upcoming-head{display:flex;justify-content:space-between;align-items:flex-end;gap:14px;margin-bottom:16px}
        .tc-subhead h3,.tc-upcoming-head h3{margin:3px 0 0;font-size:24px}
        .tc-subhead>span,.tc-upcoming-head>span{color:#cdb57d;font-size:12px;font-weight:800}
        .tc-projection-list{display:grid;gap:14px}
        .tc-projection-row{display:grid;gap:7px}
        .tc-projection-label{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}.tc-projection-label>div{display:grid;gap:3px}.tc-projection-label strong{font-size:15px}.tc-projection-label small{color:#a99f8d;font-size:10px}.tc-projection-label b{color:#f0c75e}
        .tc-projection-track{height:10px;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden}.tc-projection-track span{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#8d681d,#f0c75e)}
        .tc-no-projections{margin:0;color:#c8bfae}
        .tc-method-note{margin:16px 0 0;padding-top:13px;border-top:1px solid rgba(226,184,73,.13);color:#948b7c;font-size:10px;line-height:1.5}
        .tc-strength{display:flex;flex-direction:column;justify-content:center;text-align:center;min-height:180px}
        .tc-strength>strong{font-size:54px;line-height:1;color:#f0c75e;margin:10px 0 6px}.tc-strength>span{font-weight:800}.tc-strength>small{margin-top:9px;color:#c8bfae}
        .tc-intel-grid{display:grid;grid-template-columns:1.15fr .85fr;gap:12px;margin-top:12px}
        .tc-weather,.tc-matchups{padding:18px;border-radius:18px;border:1px solid rgba(226,184,73,.2);background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(0,0,0,.22))}
        .tc-weather-hours{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
        .tc-weather-hour{display:flex;flex-direction:column;align-items:center;text-align:center;gap:5px;padding:13px 8px;border-radius:13px;background:rgba(0,0,0,.24);border:1px solid rgba(255,255,255,.06)}
        .tc-weather-hour>strong{color:#f0c75e;font-size:11px;text-transform:uppercase}.tc-weather-hour>b{font-size:25px}.tc-weather-hour>span{font-size:24px;font-weight:900}.tc-weather-hour>small{color:#d9d1c3;font-size:10px}.tc-weather-hour>em{font-style:normal;color:#9f9687;font-size:9px;line-height:1.3}
        .tc-matchup-list{display:grid;gap:9px}
        .tc-matchup-card{width:100%;color:inherit;font:inherit;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:9px;padding:13px;border-radius:13px;background:rgba(0,0,0,.24);border:1px solid rgba(255,255,255,.06);text-align:center;cursor:pointer;transition:border-color .18s ease,transform .18s ease}
        .tc-matchup-card:hover,.tc-matchup-card:focus-visible{border-color:rgba(240,199,94,.55);transform:translateY(-1px);outline:none}
        .tc-matchup-card>div{display:grid;gap:4px}.tc-matchup-card strong{font-size:12px}.tc-matchup-card b{color:#f0c75e;font-size:18px}.tc-matchup-card>span{color:#766e61;font-size:10px;font-weight:900}.tc-matchup-card>small{grid-column:1/-1;color:#9f9687;font-size:9px}
        .tc-matchup-card>em{grid-column:1/-1;color:#d7ad50;font-size:9px;font-style:normal;font-weight:900}
        .tc-modal-backdrop{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;padding:18px;background:rgba(0,0,0,.78);backdrop-filter:blur(5px)}
        .tc-modal{width:min(760px,100%);max-height:min(82vh,800px);overflow:hidden;display:flex;flex-direction:column;border:1px solid rgba(240,199,94,.42);border-radius:22px;background:#15110c;color:#fff;box-shadow:0 30px 90px rgba(0,0,0,.65)}
        .tc-modal-head{display:flex;justify-content:space-between;gap:18px;padding:20px;border-bottom:1px solid rgba(226,184,73,.18)}.tc-modal-head h3{margin:3px 0 8px;font-size:25px}.tc-modal-head strong{color:#f0c75e}.tc-modal-head strong span{color:#a99f8d;font-weight:700}.tc-modal-head>button{width:40px;height:40px;flex:0 0 auto;border-radius:50%;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);color:#fff;font-size:27px;cursor:pointer}
        .tc-history-list{overflow:auto;padding:10px 20px 20px;display:grid;gap:8px}.tc-history-row{display:grid;grid-template-columns:minmax(150px,1.4fr) 1fr 1fr auto;align-items:center;gap:12px;padding:13px;border-radius:13px;background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.06)}.tc-history-row>div{display:grid;gap:3px}.tc-history-row span{color:#a99f8d;font-size:10px}.tc-history-row b{font-size:13px}.tc-history-row small{color:#f0c75e;font-size:10px;font-weight:900;text-align:right}
        .tc-details{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:12px;padding:16px;border-radius:16px;border:1px solid rgba(226,184,73,.2);background:rgba(0,0,0,.24)}
        .tc-course-details{display:grid;gap:4px}.tc-course-details span{color:#d7ad50;font-size:10px;font-weight:900;letter-spacing:.13em;text-transform:uppercase}.tc-course-details strong{font-size:15px;color:#fff}
        .tc-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px}.tc-actions a{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:10px 14px;border-radius:999px;border:1px solid rgba(240,199,94,.5);color:#f7dfa0;text-decoration:none;font-size:12px;font-weight:900}
        .tc-upcoming{margin-top:22px;padding-top:20px;border-top:1px solid rgba(226,184,73,.18)}
        .tc-mini-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
        .tc-mini-card{padding:16px;border-radius:15px;border:1px solid rgba(226,184,73,.18);background:rgba(0,0,0,.24);display:grid;gap:8px}
        .tc-mini-topline{display:flex;justify-content:space-between;gap:12px}.tc-mini-topline span{color:#d7ad50;font-size:9px;font-weight:900;letter-spacing:.13em}.tc-mini-topline small{color:#c8bfae;text-align:right}
        .tc-mini-card>strong{font-size:19px}.tc-mini-card>p{margin:0;color:#c8bfae;font-size:13px;line-height:1.45}
        .tc-empty{text-align:center;padding:54px 18px}.tc-empty>span{font-size:58px}.tc-empty h2{font-size:36px;margin:6px 0}
        @media(max-width:840px){.tc-projection-layout,.tc-intel-grid{grid-template-columns:1fr}.tc-strength{min-height:150px}.tc-countdown{min-width:220px}}
        @media(max-width:620px){.tc-shell{padding:14px}.tc-kicker-row{align-items:flex-start;flex-direction:column}.tc-hero{min-height:500px}.tc-course-photo,.tc-course-placeholder{height:500px}.tc-hero-copy{left:16px;right:16px;bottom:22px;max-width:none}.tc-countdown{left:14px;right:14px;top:14px;min-width:0}.tc-details{align-items:stretch;flex-direction:column}.tc-actions{justify-content:stretch}.tc-actions a{flex:1}.tc-hero-copy>strong{font-size:42px}.tc-mini-grid{grid-template-columns:1fr}.tc-subhead,.tc-upcoming-head{align-items:flex-start;flex-direction:column}.tc-weather-hours{grid-template-columns:repeat(2,minmax(0,1fr))}.tc-history-row{grid-template-columns:1fr 1fr}.tc-history-row>div:first-child,.tc-history-row>small{grid-column:1/-1}.tc-history-row>small{text-align:left}}
        .tc-build-marker{display:block;margin-top:14px;text-align:right;color:#635b50;font-size:8px;letter-spacing:.08em}
      `}</style>
      <small className="tc-build-marker">{TOURNAMENT_CENTER_BUILD}</small>
    </article>
  );
}

export default TournamentCenter;

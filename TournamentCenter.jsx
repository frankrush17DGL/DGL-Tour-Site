import React, { useEffect, useMemo, useState } from 'react';
import { AssetPhoto, PlayerLink, canonicalName, fallbackData } from './core.jsx';

const EMPTY_WEATHER = Object.freeze([]);
const TOURNAMENT_CENTER_BUILD = 'TC 2026.09.02.3';
const DGL_SHEET_ID = '1ih9-i3Bfd_N-gD1vBY88bu5c0lGaXT-c80ppXrU95Tw';

function americanOddsFromProbability(probability) {
  const value = clamp(Number(probability), 0.0001, 0.9999);
  const odds = value >= 0.5
    ? -Math.round((100 * value) / (1 - value))
    : Math.round((100 * (1 - value)) / value);
  return odds > 0 ? `+${odds}` : String(odds);
}

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

function normalizedHistoryDate(value, yearHint = '') {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const iso = raw.match(/^(20\d{2})-(\d{1,2})-(\d{1,2})$/);
  if (iso) return `${iso[1]}-${String(Number(iso[2])).padStart(2, '0')}-${String(Number(iso[3])).padStart(2, '0')}`;
  const slash = raw.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2}|\d{4}))?$/);
  if (!slash) return '';
  let year = slash[3] ? Number(slash[3]) : Number(yearHint);
  if (year > 0 && year < 100) year += 2000;
  if (!year) return '';
  return `${year}-${String(Number(slash[1])).padStart(2, '0')}-${String(Number(slash[2])).padStart(2, '0')}`;
}

function historyMomentDate(moment = {}) {
  return normalizedHistoryDate(moment.rawDate || moment.date, moment.year);
}

function historyParticipants(moment = {}) {
  return [moment.winner, moment.second, moment.third, moment.fourth]
    .map(canonicalName)
    .filter(Boolean);
}

function buildRoundHistoryMatches(rounds = [], historyMoments = []) {
  const groups = new Map();
  rounds.forEach(round => {
    const year = roundYear(round);
    const eventNumber = roundEventNumber(round);
    const date = normalizedHistoryDate(round.date || round.eventDate || round.playedAt, year);
    const key = `${year || ''}|${eventNumber}|${date}`;
    if (!groups.has(key)) groups.set(key, { year, eventNumber, date, rounds: [] });
    groups.get(key).rounds.push(round);
  });

  const matches = {};
  groups.forEach((group, key) => {
    const players = new Set(group.rounds.map(round => canonicalName(roundPlayer(round))).filter(Boolean));
    let candidates = historyMoments.filter(moment => historyMomentDate(moment) === group.date);
    if (!candidates.length && group.year && group.eventNumber) {
      candidates = historyMoments.filter(moment => (
        String(moment.year) === String(group.year) &&
        String(moment.eventNumber || moment.event || '').match(/\d+/)?.[0] === group.eventNumber
      ));
    }
    if (!candidates.length) return;

    const ranked = candidates.map(moment => {
      const participantOverlap = historyParticipants(moment).filter(player => players.has(player)).length;
      const existingCourses = group.rounds
        .map(round => String(round.course || '').trim().toLowerCase())
        .filter(Boolean);
      const courseMatch = existingCourses.includes(String(moment.course || '').trim().toLowerCase()) ? 1 : 0;
      const momentEvent = Number(String(moment.eventNumber || moment.event || '').match(/\d+/)?.[0]);
      const eventDistance = Number.isFinite(momentEvent) && Number(group.eventNumber)
        ? Math.abs(momentEvent - Number(group.eventNumber))
        : 99;
      return { moment, participantOverlap, courseMatch, eventDistance };
    }).sort((a, b) => (
      b.participantOverlap - a.participantOverlap ||
      b.courseMatch - a.courseMatch ||
      a.eventDistance - b.eventDistance
    ));

    matches[key] = ranked[0].moment;
  });
  return matches;
}


function useHistoricalCourseMetadata(rounds = [], historyMoments = []) {
  const [courseMap, setCourseMap] = useState({});

  // DGL event numbers are league-wide and unique, so course metadata can be
  // resolved by event number even when a historical result row does not carry
  // a usable year/date. This is important because the H2H rows currently have
  // the event number but many do not include a year field.
  useEffect(() => {
    const controller = new AbortController();
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: Math.max(0, currentYear - 2021 + 1) }, (_, index) => 2021 + index);

    Promise.allSettled(years.map(async year => {
      const sheetName = `${year} Standings`;
      const url = `https://docs.google.com/spreadsheets/d/${DGL_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}&range=A2:AZ4&cacheBust=${Date.now()}`;
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`Course metadata request failed for ${year}`);

      const rows = parseCsvRows(await response.text());
      const eventRow = rows[0] || [];
      const courseRow = rows[2] || [];
      const entries = {};

      for (let column = 0; column < Math.max(eventRow.length, courseRow.length); column += 1) {
        const eventNumber = String(eventRow[column] || '').match(/\d+/)?.[0] || '';
        const course = String(courseRow[column] || '').replace(/^Course\s*:?\s*/i, '').trim();
        if (!eventNumber || !course) continue;
        entries[eventNumber] = course;
        entries[`${year}-${eventNumber}`] = course;
      }

      return entries;
    }))
      .then(results => {
        const maps = results
          .filter(result => result.status === 'fulfilled')
          .map(result => result.value);
        const merged = Object.assign({}, ...maps);
        setCourseMap(merged);
        if (!Object.keys(merged).length) {
          console.warn('Historical course metadata loaded but no event/course pairs were found.');
        }
      })
      .catch(error => {
        if (error.name !== 'AbortError') console.warn('Unable to load historical course metadata', error);
      });

    return () => controller.abort();
  }, []);

  const historyCourseMap = useMemo(() => {
    const mapped = {};
    historyMoments.forEach(moment => {
      const eventNumber = String(moment.eventNumber || moment.event || '').match(/\d+/)?.[0] || '';
      const year = String(moment.year || '').match(/20\d{2}/)?.[0] || '';
      const course = String(moment.course || '').trim();
      if (!eventNumber || !course) return;
      mapped[eventNumber] = course;
      if (year) mapped[`${year}-${eventNumber}`] = course;
    });
    return mapped;
  }, [historyMoments]);

  const roundHistoryMatches = useMemo(
    () => buildRoundHistoryMatches(rounds, historyMoments),
    [rounds, historyMoments]
  );

  return useMemo(() => rounds.map(round => {
    const year = roundYear(round);
    const eventNumber = roundEventNumber(round);
    const date = normalizedHistoryDate(round.date || round.eventDate || round.playedAt, year);
    const historyMoment = roundHistoryMatches[`${year || ''}|${eventNumber}|${date}`] || null;
    // The central history parser currently uses the literal placeholder
    // "Course unavailable" when it cannot read the course row. Do NOT treat
    // that placeholder as real metadata, otherwise it masks the event-number
    // lookup below and every H2H row keeps displaying the placeholder.
    const rawExistingCourse = round.course || round.courseName || round.golfCourse || round.venue || '';
    const existingCourse = /^(?:course\s+)?(?:unavailable|unknown|tbd|n\/?a)$/i.test(String(rawExistingCourse).trim())
      ? ''
      : String(rawExistingCourse).trim();
    const mappedCourse = historyMoment?.course || (eventNumber
      ? (courseMap[`${year}-${eventNumber}`] || courseMap[eventNumber] || historyCourseMap[`${year}-${eventNumber}`] || historyCourseMap[eventNumber] || '')
      : '');
    return (existingCourse || mappedCourse)
      ? { ...round, course: mappedCourse || existingCourse, historyMoment }
      : { ...round, historyMoment };
  }), [rounds, courseMap, historyCourseMap, roundHistoryMatches]);
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

function eventDateKey(event = {}) {
  const parsed = roundDate(event);
  if (!parsed) return '';
  return [
    parsed.getFullYear(),
    String(parsed.getMonth() + 1).padStart(2, '0'),
    String(parsed.getDate()).padStart(2, '0')
  ].join('-');
}

function usefulCourse(value) {
  const course = String(value || '').trim();
  return Boolean(course) && !/^(?:course\s+)?(?:tbd|unavailable|unknown|n\/?a)$/i.test(course);
}

function recoverEventDetails(event = {}) {
  const fallbackEvents = Array.isArray(fallbackData?.events) ? fallbackData.events : [];
  const dateKey = eventDateKey(event);
  const fallback = fallbackEvents.find(candidate => dateKey && eventDateKey(candidate) === dateKey);
  if (!fallback) return event;

  const merged = { ...fallback, ...event };
  const fillWhenBlank = field => {
    if (event[field] === undefined || event[field] === null || String(event[field]).trim() === '') {
      merged[field] = fallback[field];
    }
  };

  [
    'time', 'tees', 'photoUrl', 'courseWebsite', 'googleMap', 'latitude',
    'longitude', 'courseDetails', 'courseLogo', 'scorecardUrl', 'flyoverUrl'
  ].forEach(fillWhenBlank);

  if (!usefulCourse(event.course)) merged.course = fallback.course;
  if (!Array.isArray(event.committedPlayers) || !event.committedPlayers.length) {
    merged.committedPlayers = fallback.committedPlayers || [];
  }

  return merged;
}

function roundPlayer(round = {}) {
  return round.player || round.playerName || round.name || round.golfer || '';
}

function roundEventKey(round = {}) {
  return String(round.eventId || round.event || round.eventNumber || round.date || round.eventDate || round.course || '');
}

function roundLabel(round = {}) {
  if (round.eventName) return round.eventName;
  const eventNumber = roundEventNumber(round);
  if (eventNumber) return `Event ${eventNumber}`;
  return round.course || 'DGL Round';
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
  const seasonYear = referenceDate.getFullYear();
  const playerRounds = rounds
    .filter(round => canonicalName(roundPlayer(round)) === canonicalName(playerName))
    .map(round => ({ ...round, parsedDate: roundDate(round), performance: netPerformance(round) }))
    .filter(round => (
      round.parsedDate &&
      round.parsedDate <= referenceDate &&
      round.parsedDate.getFullYear() === seasonYear &&
      Number.isFinite(round.performance)
    ))
    .sort((a, b) => b.parsedDate - a.parsedDate);

  if (!playerRounds.length) {
    return { value: null, rounds: 0, basis: `No ${seasonYear} rounds`, limited: true, results: [] };
  }

  const selected = playerRounds.slice(0, 3);
  const value = selected.reduce((sum, round) => sum + round.performance, 0) / selected.length;

  return {
    value,
    rounds: selected.length,
    basis: `Last ${selected.length} ${seasonYear} DGL round${selected.length === 1 ? '' : 's'}`,
    limited: selected.length < 3,
    results: selected.map(round => round.performance)
  };
}

function headToHeadRecord(playerA, playerB, rounds = [], seasonYear = null, referenceDate = null) {
  const events = new Map();
  rounds.forEach(round => {
    const played = roundDate(round);
    if (seasonYear && (!played || played.getFullYear() !== seasonYear)) return;
    if (referenceDate && played && played > referenceDate) return;
    const key = roundEventKey(round);
    const player = canonicalName(roundPlayer(round));
    const performance = netPerformance(round);
    if (!key || !player || !Number.isFinite(performance)) return;
    if (!events.has(key)) events.set(key, { results: new Map(), round });
    events.get(key).results.set(player, { performance, round, playerName: roundPlayer(round) });
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
    const eventResults = [...results.entries()]
      .filter(([, result]) => Number.isFinite(result?.performance));
    const bestEventScore = eventResults.length
      ? Math.min(...eventResults.map(([, result]) => result.performance))
      : null;
    const eventWinners = Number.isFinite(bestEventScore)
      ? eventResults
        .filter(([, result]) => result.performance === bestEventScore)
        .map(([, result]) => result.playerName)
      : [];
    const historyMoment = round.historyMoment || resultA.round?.historyMoment || resultB.round?.historyMoment || null;
    const archiveEventNumber = String(historyMoment?.eventNumber || historyMoment?.event || '').match(/\d+/)?.[0] || '';
    const eventResultsForDisplay = eventResults
      .map(([, result]) => ({ player: result.playerName, net: result.performance }))
      .sort((a, b) => a.net - b.net || a.player.localeCompare(b.player));
    meetings.push({
      date: roundDate(round),
      dateLabel: round.date || round.eventDate || round.playedAt || 'Date unavailable',
      year: roundYear(round),
      eventNumber: archiveEventNumber || roundEventNumber(round),
      event: archiveEventNumber ? `Event ${archiveEventNumber}` : roundLabel(round),
      course: [historyMoment?.course, round.course, resultA.round?.course, resultB.round?.course]
        .map(value => String(value || '').trim())
        .find(value => value && !/^(?:course\s+)?(?:unavailable|unknown|tbd|n\/?a)$/i.test(value)) || '',
      scoreA: resultA.performance,
      scoreB: resultB.performance,
      winner,
      fieldSize: eventResults.length,
      eventWinner: historyMoment?.winner || (eventWinners.length ? eventWinners.join(' / ') : 'Unavailable'),
      eventResults: eventResultsForDisplay,
      historyMoment
    });
  });

  meetings.sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));
  return { playerA, playerB, winsA, winsB, ties, shared: winsA + winsB + ties, meetings };
}

function matchupSummary(playerName, fieldNames, rounds, referenceDate = new Date()) {
  const seasonYear = referenceDate.getFullYear();
  return fieldNames
    .filter(opponent => canonicalName(opponent) !== canonicalName(playerName))
    .reduce((summary, opponent) => {
      const record = headToHeadRecord(playerName, opponent, rounds, seasonYear, referenceDate);
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
    matchup: matchupSummary(player.player, names, rounds, eventDate)
  }));
  const validForms = enriched.map(player => player.recentForm.value).filter(Number.isFinite);
  const fieldForm = validForms.length
    ? validForms.reduce((sum, value) => sum + value, 0) / validForms.length
    : null;

  // Every committed golfer starts equal. The only differentiators are current-
  // season form (70%) and current-season head-to-head results (30%). Missing
  // sample weight returns to the equal baseline instead of using older seasons.
  const equalShare = 1 / enriched.length;
  const formSignals = enriched.map(player => (
    Number.isFinite(player.recentForm.value) && Number.isFinite(fieldForm)
      ? clamp(1 + ((fieldForm - player.recentForm.value) / 12), 0.5, 1.5)
      : 1
  ));
  const formSignalTotal = formSignals.reduce((sum, value) => sum + value, 0);
  const matchupSignals = enriched.map(player => (
    player.matchup.shared
      ? clamp((player.matchup.wins + (player.matchup.ties * 0.5) + 1.5) / (player.matchup.shared + 3), 0.25, 0.75)
      : 0.5
  ));
  const matchupSignalTotal = matchupSignals.reduce((sum, value) => sum + value, 0);

  const weights = enriched.map((player, index) => {
    const formWeight = 0.7 * clamp(player.recentForm.rounds / 3, 0, 1);
    const matchupWeight = 0.3 * clamp(player.matchup.shared / 3, 0, 1);
    const baselineWeight = 1 - formWeight - matchupWeight;
    const formShare = formSignalTotal > 0 ? formSignals[index] / formSignalTotal : equalShare;
    const matchupShare = matchupSignalTotal > 0 ? matchupSignals[index] / matchupSignalTotal : equalShare;
    return (baselineWeight * equalShare) + (formWeight * formShare) + (matchupWeight * matchupShare);
  });
  const total = weights.reduce((sum, value) => sum + value, 0);

  const vig = clamp(Number(board.find(player => Number.isFinite(Number(player.vig)))?.vig) || 0, 0, 0.5);

  return enriched
    .map((player, index) => {
      const projectedWinPercent = total > 0 ? (weights[index] / total) * 100 : 0;
      const viggedProbability = clamp((projectedWinPercent / 100) * (1 + vig), 0.0001, 0.9999);
      return {
        ...player,
        projectedWinPercent,
        americanOdds: americanOddsFromProbability(viggedProbability),
        marketVig: vig
      };
    })
    .sort((a, b) => b.projectedWinPercent - a.projectedWinPercent);
}

function fieldStrengthHistory(projections = [], sportsbook = [], rounds = []) {
  const currentRatings = projections
    .map(player => Number(player.rating))
    .filter(rating => Number.isFinite(rating) && rating > 0);
  const averageRating = currentRatings.length
    ? currentRatings.reduce((sum, rating) => sum + rating, 0) / currentRatings.length
    : null;

  const historicalEvents = new Map();
  rounds.forEach(round => {
    const eventKey = roundEventKey(round);
    if (!eventKey || !Number.isFinite(netPerformance(round))) return;
    const strength = Number(round.historicalFieldStrength);
    if (Number.isFinite(strength) && !historicalEvents.has(eventKey)) historicalEvents.set(eventKey, strength);
  });

  const historicalAverages = [...historicalEvents.values()].sort((a, b) => b - a);

  if (!Number.isFinite(averageRating) || !historicalAverages.length) {
    return { averageRating, rank: null, total: historicalAverages.length, percentile: null };
  }

  const rank = historicalAverages.filter(rating => rating > averageRating).length + 1;
  const total = historicalAverages.length + 1;
  const percentile = Math.max(1, Math.round((1 - (rank - 1) / total) * 100));
  return { averageRating, rank, total, percentile };
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

function TournamentEventPanel({
  featuredEvent = {},
  eventPosition = 1,
  eventCount = 1,
  sportsbook = [],
  rounds = [],
  historicalRounds = [],
  roundResults = [],
  results = [],
  weather = EMPTY_WEATHER,
  historyMoments = [],
  goPlayerProfile
}) {
  const [selectedMatchup, setSelectedMatchup] = useState(null);
  const [selectedEventHistory, setSelectedEventHistory] = useState(null);
  const historyRows = useMemo(() => {
    const candidates = [rounds, historicalRounds, roundResults, results];
    return candidates.map(roundRows).find(rowsList => rowsList.length) || [];
  }, [rounds, historicalRounds, roundResults, results]);
  // Enrich historical results with the course name from each year's Standings sheet.
  // The head-to-head data already carries year/event number, so this restores the
  // course label without hard-coding historical events.
  const historyRowsWithCourses = useHistoricalCourseMetadata(historyRows, historyMoments);

  const openEventHistory = meeting => {
    if (meeting.historyMoment) {
      setSelectedEventHistory({ meeting, moment: meeting.historyMoment });
      return;
    }
    const eventNumber = String(meeting.eventNumber || meeting.event || '').match(/\d+/)?.[0] || '';
    const year = String(meeting.year || '').match(/20\d{2}/)?.[0] || '';
    const date = normalizedHistoryDate(meeting.dateLabel, year);
    const byDate = historyMoments.find(moment => historyMomentDate(moment) === date);
    const exact = byDate || historyMoments.find(moment => {
      const momentEvent = String(moment.eventNumber || moment.event || '').match(/\d+/)?.[0] || '';
      return eventNumber && momentEvent === eventNumber && (!year || String(moment.year) === year);
    });
    const byEvent = exact || historyMoments.find(moment => {
      const momentEvent = String(moment.eventNumber || moment.event || '').match(/\d+/)?.[0] || '';
      return eventNumber && momentEvent === eventNumber;
    });
    setSelectedEventHistory({ meeting, moment: byEvent || null });
  };
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
  const fieldStrength = useMemo(
    () => fieldStrengthHistory(projections, sportsbook, historyRowsWithCourses),
    [projections, sportsbook, historyRowsWithCourses]
  );
  const averageRating = fieldStrength.averageRating;

  useEffect(() => {
    if (!selectedMatchup) return undefined;
    const closeOnEscape = event => {
      if (event.key === 'Escape') {
        if (selectedEventHistory) setSelectedEventHistory(null);
        else setSelectedMatchup(null);
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [selectedMatchup, selectedEventHistory]);

  if (!featuredEvent.course) {
    return (
      <article className="card tc-shell" id={eventPosition === 1 ? 'events' : undefined}>
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
    <article className="card tc-shell" id={eventPosition === 1 ? 'events' : undefined}>
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
          <div className="tc-hero-title-row">
            <strong>{featuredEvent.course}</strong>
            <b className="tc-event-number">EVENT {featuredEvent.event || '—'}</b>
          </div>
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
              <h3>Projected Event Win Chance</h3>
              <p className="tc-model-note">2026 only • 70% last-three average net • 30% head-to-head • Lower net is better</p>
            </div>
            <span>{projections.length} committed</span>
          </div>

          {projections.length ? (
            <div className="tc-projection-list">
              {projections.map(player => (
                <div className="tc-projection-row" key={player.player}>
                  <div className="tc-projection-label">
                    <div>
                      <strong><PlayerLink name={player.player} onSelect={goPlayerProfile} /></strong>
                      <small>
                        {Number.isFinite(player.recentForm?.value)
                          ? `${player.recentForm.value > 0 ? '+' : ''}${player.recentForm.value.toFixed(1)} avg net • ${player.recentForm.basis}${player.recentForm.limited ? ' • Limited sample' : ''}`
                          : 'Equal baseline • No 2026 form available'}
                      </small>
                    </div>
                    <div className="tc-projection-price">
                      <div>
                        <span>Win Probability</span>
                        <b>{player.projectedWinPercent.toFixed(1)}%</b>
                      </div>
                      <div>
                        <span>American Odds</span>
                        <b>{player.americanOdds}</b>
                      </div>
                    </div>
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
        </section>

        <aside className="tc-strength">
          <p className="eyebrow">Strength of Field</p>
          <strong>{averageRating === null ? '—' : averageRating.toFixed(1)}</strong>
          <span>Average DGL Rating</span>
          {fieldStrength.rank ? (
            <div className="tc-strength-history">
              <b>#{fieldStrength.rank} of {fieldStrength.total}</b>
              <small>{fieldStrength.percentile}th percentile historically</small>
            </div>
          ) : (
            <small>{projections.length} matched player{projections.length === 1 ? '' : 's'}</small>
          )}
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
                <div
                  role="button"
                  tabIndex={0}
                  className="tc-matchup-card"
                  key={`${record.playerA}-${record.playerB}`}
                  onClick={() => setSelectedMatchup(record)}
                  onKeyDown={event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setSelectedMatchup(record);
                    }
                  }}
                  aria-label={`View all shared rounds for ${record.playerA} and ${record.playerB}`}
                >
                  <div>
                    <strong><PlayerLink name={record.playerA} onSelect={goPlayerProfile} /></strong>
                    <b>{record.winsA}–{record.winsB}–{record.ties}</b>
                  </div>
                  <span>vs.</span>
                  <div>
                    <strong><PlayerLink name={record.playerB} onSelect={goPlayerProfile} /></strong>
                    <b>{record.winsB}–{record.winsA}–{record.ties}</b>
                  </div>
                  <small>{record.shared} shared DGL round{record.shared === 1 ? '' : 's'}</small>
                  <em>View round history →</em>
                </div>
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
                <h3><PlayerLink name={selectedMatchup.playerA} onSelect={goPlayerProfile} /> vs. <PlayerLink name={selectedMatchup.playerB} onSelect={goPlayerProfile} /></h3>
                <strong>
                  {selectedMatchup.winsA}–{selectedMatchup.winsB}–{selectedMatchup.ties}
                  <span> • {selectedMatchup.shared} shared rounds</span>
                </strong>
              </div>
              <button type="button" onClick={() => setSelectedMatchup(null)} aria-label="Close matchup history">×</button>
            </div>
            <div className="tc-history-list">
              <div className="tc-history-header" aria-hidden="true">
                <span>Event / Course</span>
                <span>{selectedMatchup.playerA}</span>
                <span>{selectedMatchup.playerB}</span>
                <span>Matchup</span>
                <span>Golfers</span>
                <span>Event Winner</span>
              </div>
              {selectedMatchup.meetings.map((meeting, index) => (
                <div className="tc-history-row" key={`${meeting.dateLabel}-${meeting.event}-${index}`}>
                  <button
                    type="button"
                    className="tc-history-event-link"
                    onClick={() => openEventHistory(meeting)}
                    aria-label={`Open ${meeting.event} history at ${meeting.course || 'this course'}`}
                  >
                    <strong>{meeting.dateLabel}</strong>
                    <span>{meeting.event}{meeting.course && meeting.course !== meeting.event ? ` • ${meeting.course}` : ''}</span>
                  </button>
                  <div>
                    <span><PlayerLink name={selectedMatchup.playerA} onSelect={goPlayerProfile} /></span>
                    <b>{meeting.scoreA.toFixed(1)} net</b>
                  </div>
                  <div>
                    <span><PlayerLink name={selectedMatchup.playerB} onSelect={goPlayerProfile} /></span>
                    <b>{meeting.scoreB.toFixed(1)} net</b>
                  </div>
                  <div className="tc-history-matchup">
                    <span>Matchup</span>
                    <b>{meeting.winner === 'Tie' ? 'Tie' : meeting.winner}</b>
                  </div>
                  <div className="tc-history-field">
                    <span>Golfers</span>
                    <b>{meeting.fieldSize}</b>
                  </div>
                  <div className="tc-history-winner">
                    <span>Event Winner</span>
                    <b>{meeting.eventWinner}</b>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {selectedEventHistory ? (() => {
        const { meeting, moment } = selectedEventHistory;
        const eventTitle = moment?.title && !/^DGL history recorded$/i.test(moment.title)
          ? moment.title
          : `${moment?.course || meeting.course || 'DGL Event'} — ${meeting.event}`;
        const story = moment?.body && !/^Event\s+\d+\.?$/i.test(moment.body.trim())
          ? moment.body
          : '';
        const eventResults = meeting.eventResults?.length
          ? meeting.eventResults
          : [
            { player: moment?.winner, net: moment?.net },
            { player: moment?.second, net: '' },
            { player: moment?.third, net: '' },
            { player: moment?.fourth, net: '' }
          ].filter(result => result.player);
        return (
          <div className="tc-modal-backdrop tc-event-modal-backdrop" role="presentation" onMouseDown={() => setSelectedEventHistory(null)}>
            <section className="tc-modal tc-event-modal" role="dialog" aria-modal="true" aria-label={`${meeting.event} history`} onMouseDown={event => event.stopPropagation()}>
              <div className="tc-modal-head">
                <div>
                  <p className="eyebrow">This Event in DGL History</p>
                  <h3>{eventTitle}</h3>
                  <strong>{[moment?.year || meeting.year, meeting.event, moment?.course || meeting.course].filter(Boolean).join(' • ')}</strong>
                </div>
                <button type="button" onClick={() => setSelectedEventHistory(null)} aria-label="Close event history">×</button>
              </div>
              <div className="tc-event-history-body">
                {moment?.photoUrl ? <img src={moment.photoUrl} alt={moment.title || moment.course || meeting.event} /> : null}
                <div className="tc-event-facts">
                  {(moment?.rawDate || meeting.dateLabel) ? <span><small>Date</small><strong>{moment?.rawDate || meeting.dateLabel}</strong></span> : null}
                  {moment?.time ? <span><small>Time</small><strong>{moment.time}</strong></span> : null}
                  {moment?.tees ? <span><small>Tees</small><strong>{moment.tees}</strong></span> : null}
                  {moment?.net ? <span><small>Winning Net</small><strong>{moment.net}</strong></span> : null}
                </div>
                {story ? (
                  <section className="tc-event-story-card">
                    <small>Event Recap</small>
                    <p className="tc-event-story">{story}</p>
                  </section>
                ) : null}
                {eventResults.length ? (
                  <section className="tc-event-leaderboard">
                    <div className="tc-event-section-title">
                      <small>Round Results</small>
                      <span>{eventResults.length} golfer{eventResults.length === 1 ? '' : 's'}</span>
                    </div>
                    <div className="tc-event-result-list">
                      {eventResults.map((result, index) => (
                        <div key={`${result.player}-${index}`}>
                          <b>#{index + 1}</b>
                          <strong><PlayerLink name={result.player} onSelect={goPlayerProfile} /></strong>
                          <span>{Number.isFinite(Number(result.net)) ? `${Number(result.net).toFixed(1)} net` : index === 0 && moment?.net ? `${moment.net} net` : '—'}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : (
                  <section className="tc-event-story-card">
                    <small>Archive Status</small>
                    <p className="tc-event-story">The course and event are recorded, but full results have not yet been added to the history sheet.</p>
                  </section>
                )}
                <section className="tc-event-matchup-summary">
                  <small>Head-to-Head That Day</small>
                  <div>
                    <strong><PlayerLink name={selectedMatchup?.playerA} onSelect={goPlayerProfile} /></strong>
                    <b>{meeting.scoreA.toFixed(1)} net</b>
                    <span>vs.</span>
                    <strong><PlayerLink name={selectedMatchup?.playerB} onSelect={goPlayerProfile} /></strong>
                    <b>{meeting.scoreB.toFixed(1)} net</b>
                  </div>
                </section>
              </div>
            </section>
          </div>
        );
      })() : null}

      <style>{`
        .tc-shell{grid-column:1/-1;padding:20px;overflow:hidden}
        .tc-hero{position:relative;min-height:clamp(330px,50vw,560px);border-radius:24px;overflow:hidden;border:1px solid rgba(226,184,73,.32);background:#100b08;box-shadow:0 28px 70px rgba(0,0,0,.42)}
        .tc-course-photo{display:block;width:100%;height:clamp(330px,50vw,560px);object-fit:cover}
        .tc-course-placeholder{height:clamp(330px,50vw,560px);display:grid;place-content:center;text-align:center;background:radial-gradient(circle at 50% 30%,rgba(181,138,40,.28),transparent 38%),linear-gradient(145deg,#23180d,#070605);color:#f7dfa0}
        .tc-course-placeholder span{font-size:72px}.tc-course-placeholder strong{font-size:clamp(28px,6vw,58px);margin-top:8px}
        .tc-hero-shade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(0,0,0,.84),rgba(0,0,0,.14) 55%,rgba(0,0,0,.58)),linear-gradient(0deg,rgba(0,0,0,.88),transparent 54%)}
        .tc-hero-copy{position:absolute;left:clamp(18px,4vw,42px);right:clamp(18px,4vw,42px);bottom:clamp(22px,5vw,48px);display:grid;gap:7px;color:#fff}
        .tc-course-logo{width:90px;max-height:70px;object-fit:contain;object-position:left center;margin-bottom:4px}
        .tc-hero-copy>span{color:#edca70;font-size:12px;font-weight:900;letter-spacing:.12em;text-transform:uppercase}
        .tc-hero-title-row{display:flex;align-items:flex-end;justify-content:space-between;gap:20px}
        .tc-hero-title-row>strong{min-width:0;font-size:clamp(34px,7vw,72px);line-height:.94;text-shadow:0 4px 18px rgba(0,0,0,.75)}
        .tc-event-number{flex:0 0 auto;margin-bottom:4px;padding:12px 18px;border:1px solid rgba(240,199,94,.62);border-radius:999px;background:rgba(8,6,4,.62);backdrop-filter:blur(10px);box-shadow:0 10px 28px rgba(0,0,0,.32);color:#f0c75e;font-size:clamp(16px,2.4vw,28px);line-height:1;font-weight:950;letter-spacing:.08em;white-space:nowrap}
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
        .tc-model-note{margin:6px 0 0;color:#a99f8d;font-size:10px;line-height:1.45}.tc-projection-label{display:flex;justify-content:space-between;align-items:center;gap:18px}.tc-projection-label>div{display:grid;gap:3px}.tc-projection-label strong{font-size:15px}.tc-projection-label small{color:#a99f8d;font-size:10px}.tc-projection-price{display:grid!important;grid-template-columns:repeat(2,minmax(96px,1fr));gap:10px;flex:0 0 212px;text-align:center}.tc-projection-price>div{display:grid;gap:3px;padding:7px 10px;border-radius:10px;background:rgba(0,0,0,.2);border:1px solid rgba(255,255,255,.05)}.tc-projection-price span{color:#9f9687;font-size:8px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;white-space:nowrap}.tc-projection-price b{color:#f0c75e;font-size:19px;line-height:1.1}.tc-projection-price>div:last-child b{color:#fff}
        .tc-projection-track{height:10px;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden}.tc-projection-track span{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#8d681d,#f0c75e)}
        .tc-no-projections{margin:0;color:#c8bfae}
        .tc-strength{display:flex;flex-direction:column;justify-content:center;text-align:center;min-height:180px}
        .tc-strength>strong{font-size:54px;line-height:1;color:#f0c75e;margin:10px 0 6px}.tc-strength>span{font-weight:800}.tc-strength>small{margin-top:9px;color:#c8bfae}.tc-strength-history{display:grid;gap:3px;margin-top:12px;padding-top:11px;border-top:1px solid rgba(226,184,73,.16)}.tc-strength-history b{color:#f0c75e;font-size:14px}.tc-strength-history small{color:#c8bfae;font-size:10px}
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
        .tc-modal{width:min(1060px,100%);max-height:min(82vh,800px);overflow:hidden;display:flex;flex-direction:column;border:1px solid rgba(240,199,94,.42);border-radius:22px;background:#15110c;color:#fff;box-shadow:0 30px 90px rgba(0,0,0,.65)}
        .tc-modal-head{display:flex;justify-content:space-between;gap:18px;padding:20px;border-bottom:1px solid rgba(226,184,73,.18)}.tc-modal-head h3{margin:3px 0 8px;font-size:25px}.tc-modal-head strong{color:#f0c75e}.tc-modal-head strong span{color:#a99f8d;font-weight:700}.tc-modal-head>button{width:40px;height:40px;flex:0 0 auto;border-radius:50%;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);color:#fff;font-size:27px;cursor:pointer}
        .tc-history-list{overflow:auto;padding:10px 20px 20px;display:grid;gap:8px}.tc-history-header,.tc-history-row{display:grid;grid-template-columns:minmax(175px,1.5fr) minmax(90px,.8fr) minmax(90px,.8fr) minmax(105px,.9fr) 64px minmax(120px,1fr);align-items:center;gap:12px}.tc-history-header{padding:4px 13px;color:#8f8575;font-size:9px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}.tc-history-row{padding:13px;border-radius:13px;background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.06)}.tc-history-row>div{display:grid;gap:3px;min-width:0}.tc-history-row span{color:#a99f8d;font-size:10px}.tc-history-row b{font-size:13px;overflow-wrap:anywhere}.tc-history-matchup b{color:#d8c08b}.tc-history-field{text-align:center}.tc-history-winner b{color:#f0c75e}
        .tc-history-event-link{all:unset;display:grid;gap:3px;min-width:0;cursor:pointer}.tc-history-event-link strong{color:#fff}.tc-history-event-link:hover strong,.tc-history-event-link:focus-visible strong{color:#f0c75e;text-decoration:underline;text-underline-offset:3px}.tc-history-event-link:focus-visible{outline:2px solid #f0c75e;outline-offset:5px;border-radius:4px}
        .tc-event-modal-backdrop{z-index:1100}.tc-event-modal{max-width:800px}.tc-event-history-body{overflow:auto;padding:20px;display:grid;gap:18px}.tc-event-history-body>img{width:100%;max-height:360px;object-fit:cover;border-radius:14px;border:1px solid rgba(240,199,94,.24)}.tc-event-facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:9px}.tc-event-facts span{display:grid;gap:4px;padding:12px;border-radius:11px;background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.06)}.tc-event-facts small,.tc-event-story-card>small,.tc-event-section-title>small,.tc-event-matchup-summary>small{color:#d7ad50;font-size:9px;font-weight:900;letter-spacing:.11em;text-transform:uppercase}.tc-event-story-card,.tc-event-leaderboard,.tc-event-matchup-summary{padding:15px;border-radius:13px;background:rgba(0,0,0,.24);border:1px solid rgba(255,255,255,.07)}.tc-event-story{margin:8px 0 0;color:#ddd2c1;line-height:1.65;white-space:pre-line}.tc-event-section-title{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px}.tc-event-section-title>span{color:#9f9687;font-size:10px}.tc-event-result-list{display:grid;gap:7px}.tc-event-result-list>div{display:grid;grid-template-columns:35px minmax(0,1fr) auto;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;background:rgba(255,255,255,.035)}.tc-event-result-list b{color:#f0c75e}.tc-event-result-list span{color:#c8bfae;font-size:12px}.tc-event-matchup-summary>div{display:grid;grid-template-columns:minmax(0,1fr) auto 30px minmax(0,1fr) auto;align-items:center;gap:8px;margin-top:10px}.tc-event-matchup-summary b{color:#f0c75e}.tc-event-matchup-summary span{color:#807769;text-align:center;font-size:10px}
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
        @media(max-width:760px){.tc-history-header{display:none}.tc-history-row{grid-template-columns:1fr 1fr}.tc-history-event-link,.tc-history-winner{grid-column:1/-1}.tc-history-field{text-align:left}.tc-history-row>div span{display:block}.tc-modal{max-height:90vh}.tc-modal-head{padding:16px}.tc-history-list{padding:10px 12px 16px}.tc-event-history-body{padding:14px}.tc-event-matchup-summary>div{grid-template-columns:1fr auto}.tc-event-matchup-summary>div>span{display:none}.tc-event-result-list>div{grid-template-columns:28px minmax(0,1fr) auto}}
        @media(max-width:620px){.tc-shell{padding:14px}.tc-hero{min-height:500px}.tc-course-photo,.tc-course-placeholder{height:500px}.tc-hero-copy{left:16px;right:16px;bottom:22px}.tc-hero-title-row{align-items:flex-start;flex-direction:column;gap:12px}.tc-hero-title-row>strong{font-size:42px}.tc-event-number{padding:10px 14px;font-size:18px}.tc-countdown{left:14px;right:14px;top:14px;min-width:0}.tc-details{align-items:stretch;flex-direction:column}.tc-actions{justify-content:stretch}.tc-actions a{flex:1}.tc-mini-grid{grid-template-columns:1fr}.tc-subhead,.tc-upcoming-head{align-items:flex-start;flex-direction:column}.tc-weather-hours{grid-template-columns:repeat(2,minmax(0,1fr))}.tc-projection-label{align-items:stretch;flex-direction:column}.tc-projection-price{width:100%;flex-basis:auto;grid-template-columns:repeat(2,minmax(0,1fr))}.tc-projection-price span{white-space:normal}}
        .tc-build-marker{display:block;margin-top:14px;text-align:right;color:#635b50;font-size:8px;letter-spacing:.08em}
      `}</style>
      <small className="tc-build-marker">{TOURNAMENT_CENTER_BUILD}</small>
    </article>
  );
}

function TournamentCenter({
  events = [],
  sportsbook = [],
  rounds = [],
  historicalRounds = [],
  roundResults = [],
  results = [],
  weather = EMPTY_WEATHER,
  historyMoments = [],
  goPlayerProfile
}) {
  const nextThreeEvents = (Array.isArray(events) ? events : [])
    .map(recoverEventDetails)
    .filter(event => event && (event.course || event.date || event.event))
    .slice(0, 3);

  if (!nextThreeEvents.length) {
    return (
      <TournamentEventPanel
        featuredEvent={{}}
        sportsbook={sportsbook}
        rounds={rounds}
        historicalRounds={historicalRounds}
        roundResults={roundResults}
        results={results}
        weather={weather}
        historyMoments={historyMoments}
        goPlayerProfile={goPlayerProfile}
      />
    );
  }

  return (
    <>
      {nextThreeEvents.map((event, index) => (
        <TournamentEventPanel
          key={`${event.event || 'event'}-${event.date || index}-${event.course || index}`}
          featuredEvent={event}
          eventPosition={index + 1}
          eventCount={nextThreeEvents.length}
          sportsbook={sportsbook}
          rounds={rounds}
          historicalRounds={historicalRounds}
          roundResults={roundResults}
          results={results}
          weather={index === 0 ? weather : EMPTY_WEATHER}
          historyMoments={historyMoments}
          goPlayerProfile={goPlayerProfile}
        />
      ))}
    </>
  );
}

export default TournamentCenter;

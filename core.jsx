import React, { useEffect, useState } from 'react';

const SHEET_ID = '1ih9-i3Bfd_N-gD1vBY88bu5c0lGaXT-c80ppXrU95Tw';
const CURRENT_YEAR_SHEET = '2026 Standings';

const HISTORY_SHEETS = [
  '2021 Standings',
  '2022 Standings',
  '2023 Standings',
  '2024 Standings',
  '2025 Standings'
];

const SPORTSBOOK_SHEETS = [
  'Power Model',
  'DGL Official Sportsbook',
  'DGL Sportsbook Engine'
];

const ANNALS_SHEETS = [
  'Annals',
  'Annals of History'
];

const PLAYERS_SHEETS = ['Players'];
const STATE_TROPHY_SHEETS = ['State Trophies', 'State Tropies'];
const THIS_DAY_SHEETS = ['This Day In DGL History', 'This Day in DGL History'];
const FUTURE_EVENTS_SHEETS = ['Future Events'];

const HOSTESS_SOURCES = [
  '/BB902404-53A2-4808-A930-773B9373AF93.png',
  '/red-room-hostess.png'
];

const fallbackData = {
  lastUpdated: 'Backup data',
  standings: [
    { rank: 1, name: 'Frank Rush', points: 2.1 },
    { rank: 2, name: 'Tim Perlick', points: 0.5 },
    { rank: 3, name: 'John Leitch', points: 0.3 },
    { rank: 3, name: 'Max Olson', points: 0.3 },
    { rank: 3, name: 'Nic Wendel', points: 0.3 }
  ],
  sidePots: { sandy: 268, eagle: 151, holeInOne: 268 },
  events: [
    {
      event: '148',
      week: '7/20-7/26',
      date: '7/21/26',
      course: 'Rush Creek GC',
      time: '4:40 PM',
      tees: '',
      notes: '2 committed',
      photoUrl: '/IMG_8339.jpeg',
      courseWebsite: 'https://www.rushcreek.com',
      googleMap: '',
      courseDetails: '',
      courseLogo: '',
      scorecardUrl: '',
      flyoverUrl: ''
    }
  ],
  redRounds: [
    { place: 1, player: 'Alex Pletsch', course: 'Eagle Valley', date: '6/3/21', score: '4 Thru 18', net: -10.3 },
    { place: 2, player: 'Max Olson', course: 'Royal', date: '9/3/23', score: '5 Thru 18', net: -7.8 },
    { place: 3, player: 'Nic Wendel', course: 'Dwan', date: '8/30/25', score: '21 Thru 18', net: -7.4 }
  ],
  historyMoments: [],
  annalsYears: [],
  sportsbook: [],
  annalsRecords: [],
  players: [],
  stateTrophies: []
};

function csvUrl(sheetName) {
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}&cacheBust=${Date.now()}`;
}

function parseCSV(text) {
  const rows = [];
  let row = [];
  let value = '';
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && insideQuotes && next === '"') {
      value += '"';
      i++;
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === ',' && !insideQuotes) {
      row.push(value);
      value = '';
    } else if ((char === '\n' || char === '\r') && !insideQuotes) {
      if (value !== '' || row.length) {
        row.push(value);
        rows.push(row);
      }
      row = [];
      value = '';
      if (char === '\r' && next === '\n') i++;
    } else {
      value += char;
    }
  }

  if (value !== '' || row.length) {
    row.push(value);
    rows.push(row);
  }

  return rows;
}

function textCell(value) {
  return String(value ?? '').trim();
}

function stripLabel(value, label) {
  return textCell(value).replace(new RegExp(`^${label}\\s*:?\\s*`, 'i'), '').trim();
}

function cleanEventNo(value) {
  const raw = stripLabel(value, 'Event');
  const match = raw.match(/\d+/);
  return match ? match[0] : raw;
}

function cleanDate(value) {
  return stripLabel(value, 'Date');
}

function cleanCourse(value) {
  return stripLabel(value, 'Course');
}

function cleanTees(value) {
  return stripLabel(value, 'Tees');
}

function cleanTime(value) {
  const raw = stripLabel(value, 'Time');
  if (!raw) return '';

  if (/^\d{1,2}:\d{2}$/.test(raw)) {
    return raw;
  }

  return raw;
}

function yearFromSheetName(sheetName, fallback = new Date().getFullYear()) {
  const match = String(sheetName).match(/20\d{2}/);
  return match ? Number(match[0]) : fallback;
}

function numberFromCell(value) {
  if (value === undefined || value === null) return 0;
  const n = Number(String(value).replace(/[$,]/g, '').trim());
  return Number.isFinite(n) ? n : 0;
}

function cleanName(value) {
  const name = String(value || '')
    .replace(/\s{2,}.+$/g, '')
    .replace(/\s+202\d.*$/g, '')
    .trim();

  const aliases = {
    'Scoot Wishart': 'Scott Wishart',
    'Tim P.': 'Tim Perlick',
    'Tim P': 'Tim Perlick',
    'Keegs': 'Keegan Anderson',
    'Pletsch': 'Alex Pletsch',
    'Jorgs': 'Jorgen Hoff',
    'Rogers': 'Alex Rogers',
    'J-Leitch': 'John Leitch',
    'BMags': 'Ben Magnuson',
    'Ben Mags': 'Ben Magnuson',
    'Wishart': 'Scott Wishart',
    'Nev': 'Brian Nevala',
    'Brian Nev': 'Brian Nevala',
    'Pat-e-o': 'Pat Sheehy',
    'SDM': 'Steven Mitchell',
    'Le Kleven': 'Grant Kleven',
    'Ramisch': 'Chris Ramisch',
    'Oppe': 'Justin Oppe',
    'Benson': 'Michael Benson',
    'Dingmann': 'Chris Dingmann',
    'Max': 'Max Olson',
    'MAX': 'Max Olson',
    'Frank': 'Frank Rush',
    'Francis Rush': 'Frank Rush',
    'Francis': 'Frank Rush',
    'Nic': 'Nic Wendel',
    'Chris D': 'Chris Dingmann',
    'Klappy': 'Grant Kleven'
  };

  return aliases[name] || name;
}


function canonicalName(value) {
  return cleanName(value).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function findHeaderIndex(rows, requiredHeaders = []) {
  return rows.findIndex(row => {
    const normalized = row.map(normalizeHeader);
    return requiredHeaders.every(required => normalized.includes(normalizeHeader(required)));
  });
}

function findHeaderRow(rows, terms = []) {
  const wanted = terms.map(normalizeHeader);
  return rows.findIndex(row => {
    const normalized = row.map(normalizeHeader);
    return wanted.every(term => normalized.includes(term));
  });
}

function headerIndex(headers, names = []) {
  const wanted = names.map(normalizeHeader);
  let exact = headers.findIndex(header => wanted.includes(header));
  if (exact >= 0) return exact;

  return headers.findIndex(header =>
    wanted.some(name => header.includes(name) || name.includes(header))
  );
}

function parsePlayers(text) {
  if (!text) return [];
  const rows = parseCSV(text);

  let playerHeaderRow = rows.findIndex(row => {
    const headers = row.map(normalizeHeader);
    return headers.includes('name') || headers.includes('player');
  });
  if (playerHeaderRow === -1) playerHeaderRow = 0;

  const headers = rows[playerHeaderRow].map(normalizeHeader);
  const indexes = {
    player: headerIndex(headers, ['Name', 'Player']),
    nickname: headerIndex(headers, ['Nickname']),
    playerTitle: headerIndex(headers, ['Player Title', 'Title', 'Card Title']),
    fullName: headerIndex(headers, ['Full Name', 'FullName']),
    dob: headerIndex(headers, ['DOB', 'Date of Birth', 'Birthdate']),
    debutYear: headerIndex(headers, ['Debut Year', 'Debut', 'DGL Debut']),
    height: headerIndex(headers, ['Height']),
    handedness: headerIndex(headers, ['Handedness', 'Hand', 'Throws', 'Bats Throws']),
    hometown: headerIndex(headers, ['Hometown', 'Home Town']),
    occupation: headerIndex(headers, ['Occupation', 'Job']),
    favoriteCourse: headerIndex(headers, ['Favorite Course', 'Favorite Track', 'Home Course']),
    walkUpSong: headerIndex(headers, ['Walk-Up Song', 'Walk Up Song', 'Walkup Song']),
    photoUrl: headerIndex(headers, ['Photo URL', 'Photo', 'Image URL', 'Image', 'Action Photo URL', 'Action Photo', 'Main Photo', 'Main Photo URL']),
    headshotUrl: headerIndex(headers, ['Headshot URL', 'Headshot', 'Head Shot URL', 'Portrait URL', 'Portrait', 'Player Headshot']),
    cardColor: headerIndex(headers, ['Card Color', 'Color', 'Team Color']),
    playerNumber: headerIndex(headers, ['Player Number', 'Card Number', 'Number']),
    bio: headerIndex(headers, ['Bio', 'Notes'])
  };

  const fallbackIndexes = {
    player: 0,
    nickname: 1,
    fullName: 2,
    debutYear: 3,
    photoUrl: 4,
    headshotUrl: 5,
    cardColor: 6,
    bio: 7,
    dob: 8,
    height: 9,
    handedness: 10,
    hometown: 11,
    occupation: 12,
    favoriteCourse: 13,
    playerTitle: 14,
    playerNumber: 15,
    walkUpSong: 16
  };
  const value = (row, key) => {
    if (indexes[key] >= 0) return textCell(row[indexes[key]]);
    const fallback = fallbackIndexes[key];
    return fallback !== undefined ? textCell(row[fallback]) : '';
  };

  return rows.slice(playerHeaderRow + 1).map(row => {
    const name = cleanName(value(row, 'player'));
    if (!name) return null;

    const photoUrl = normalizeAssetUrl(value(row, 'photoUrl'));
    const headshotUrl = normalizeAssetUrl(value(row, 'headshotUrl'));

    return {
      name,
      fullName: value(row, 'fullName') || name,
      nickname: value(row, 'nickname'),
      playerTitle: value(row, 'playerTitle'),
      dob: value(row, 'dob'),
      debutYear: value(row, 'debutYear'),
      height: value(row, 'height'),
      handedness: value(row, 'handedness'),
      hometown: value(row, 'hometown'),
      occupation: value(row, 'occupation'),
      favoriteCourse: value(row, 'favoriteCourse'),
      walkUpSong: value(row, 'walkUpSong'),
      photoUrl,
      headshotUrl,
      cardColor: value(row, 'cardColor'),
      playerNumber: value(row, 'playerNumber'),
      bio: value(row, 'bio')
    };
  }).filter(Boolean);
}
function playerMeta(data, name) {
  const key = canonicalName(name);
  const clean = cleanName(name);
  const players = data.players || [];
  return players.find(player => canonicalName(player.name) === key) ||
    players.find(player => canonicalName(player.fullName) === key) ||
    players.find(player => canonicalName(player.nickname) === key) ||
    players.find(player => canonicalName(player.name).includes(key) || key.includes(canonicalName(player.name))) ||
    players.find(player => canonicalName(player.fullName).includes(key) || key.includes(canonicalName(player.fullName))) ||
    {};
}

function normalizeAssetUrl(url = '') {
  const raw = textCell(url).replace(/^\"|\"$/g, '');
  if (!raw) return '';

  const githubBlob = raw.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/i);
  if (githubBlob) {
    return `https://raw.githubusercontent.com/${githubBlob[1]}/${githubBlob[2]}/${githubBlob[3]}/${githubBlob[4]}`;
  }

  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('/')) return raw;
  return '/' + raw.replace(/^public\//i, '');
}

function photoUrlFor(data, name) {
  return normalizeAssetUrl(playerMeta(data, name).photoUrl || '');
}


function headshotUrlFor(data, name) {
  return normalizeAssetUrl(playerMeta(data, name).headshotUrl || playerMeta(data, name).photoUrl || '');
}

function cardColorValue(color = '') {
  const key = String(color || '').trim().toLowerCase();
  const palette = {
    red: '#a51f2d',
    burgundy: '#7d1420',
    maroon: '#7a1f2b',
    crimson: '#a31324',
    blue: '#1c4f8c',
    navy: '#163b66',
    royal: '#245da8',
    green: '#245c3b',
    forest: '#1e5333',
    orange: '#bb5b22',
    gold: '#c89b2c',
    yellow: '#c89b2c',
    purple: '#563783',
    black: '#1d1b1a',
    copper: '#b46b37',
    silver: '#8f979c',
    gray: '#6e7477',
    grey: '#6e7477'
  };
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(key)) return key;
  return palette[key] || palette[key.split(/\s+/)[0]] || '#7d1420';
}

function cardHighlightColor(color = '') {
  const base = cardColorValue(color);
  if (['#1d1b1a', '#163b66', '#1e5333', '#563783'].includes(base)) return '#d6a73b';
  return '#f4e6bd';
}

function looksLikeDateText(value) {
  return /^\d{1,2}\/\d{1,2}(?:\/\d{2,4})?$/.test(textCell(value));
}

function looksLikeTimeText(value) {
  return /^(\d{1,2}:\d{2})(\s?[AP]M)?$/i.test(textCell(value));
}



function parseCommittedPlayers(value = '') {
  const seen = new Set();

  return String(value || '')
    .split(/[,;|\r\n]+/)
    .map(cleanName)
    .map(name => name.replace(/^[-•\s]+/, '').trim())
    .filter(Boolean)
    .filter(name => {
      const key = canonicalName(name);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function normalizeWinProbabilities(players = [], committedPlayers = []) {
  const committedKeys = new Set((committedPlayers || []).map(canonicalName).filter(Boolean));
  const pool = committedKeys.size
    ? (players || []).filter(player => committedKeys.has(canonicalName(player.player || player.name)))
    : [...(players || [])];

  const weighted = pool.map(player => {
    const explicit = Number(player.winPercent);
    const rating = Number(player.rating);
    const weight = Number.isFinite(explicit) && explicit > 0
      ? explicit
      : Number.isFinite(rating) && rating > 0
        ? Math.exp((rating - 75) / 12)
        : 1;

    return {
      ...player,
      player: player.player || player.name || '',
      probabilityWeight: weight
    };
  });

  const total = weighted.reduce((sum, player) => sum + player.probabilityWeight, 0) || 1;

  return weighted
    .map(player => ({
      ...player,
      projectedWinProbability: player.probabilityWeight / total
    }))
    .sort((a, b) => b.projectedWinProbability - a.projectedWinProbability);
}

function calculateFieldStrength(committedPlayers = [], sportsbook = [], historicalFields = []) {
  const committedKeys = new Set((committedPlayers || []).map(canonicalName).filter(Boolean));
  const field = committedKeys.size
    ? (sportsbook || []).filter(player => committedKeys.has(canonicalName(player.player || player.name)))
    : [];

  const ratings = field
    .map(player => Number(player.rating))
    .filter(value => Number.isFinite(value) && value > 0);

  const averageRating = ratings.length
    ? ratings.reduce((sum, value) => sum + value, 0) / ratings.length
    : null;

  const comparable = (historicalFields || [])
    .map(item => Number(item.averageRating ?? item.avgRating ?? item.strength))
    .filter(value => Number.isFinite(value) && value > 0)
    .sort((a, b) => b - a);

  if (!Number.isFinite(averageRating)) {
    return {
      averageRating: null,
      fieldSize: committedKeys.size,
      ratedPlayers: ratings.length,
      historicalRank: null,
      historicalEventCount: comparable.length,
      percentile: null,
      label: 'Rating unavailable'
    };
  }

  const historicalRank = comparable.filter(value => value > averageRating).length + 1;
  const historicalEventCount = comparable.length + 1;
  const percentile = historicalEventCount > 1
    ? Math.max(1, Math.round((1 - (historicalRank - 1) / historicalEventCount) * 100))
    : 100;

  return {
    averageRating,
    fieldSize: committedKeys.size,
    ratedPlayers: ratings.length,
    historicalRank,
    historicalEventCount,
    percentile,
    label: `${ordinal(historicalRank)} toughest field`
  };
}

function parseFutureEvents(text) {
  if (!text) return [];

  const rows = parseCSV(text).map(row => row || []);
  if (!rows.length) return [];

  const cleanLabel = value => normalizeHeader(String(value || '').replace(/:/g, ''));
  const labelRows = {};

  rows.forEach((row, rowIndex) => {
    const key = cleanLabel(row[0]);
    if (key) labelRows[key] = rowIndex;
  });

  // Dedicated Future Events sheet: labels in column A and one event per column.
  // This supports B, C, D, etc. as separate upcoming events.
  if (labelRows.course !== undefined || labelRows.event !== undefined || labelRows.date !== undefined) {
    const maxCol = Math.max(...rows.map(row => row.length), 2);
    const valueAt = (keys, col) => {
      for (const key of keys) {
        const rowIndex = labelRows[cleanLabel(key)];
        if (rowIndex !== undefined) return textCell(rows[rowIndex]?.[col]);
      }
      return '';
    };

    const events = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let col = 1; col < maxCol; col++) {
      const rawEvent = valueAt(['Event', 'Event Number', 'Event #'], col);
      const rawDate = valueAt(['Date'], col);
      const rawCourse = valueAt(['Course', 'Course Name'], col);

      if (!rawEvent && !rawDate && !rawCourse) continue;

      const parsed = parseLooseDate(rawDate, new Date().getFullYear());
      const committedPlayersRaw = valueAt([
        'Committed Players',
        'Players Committed',
        'Committed'
      ], col);
      const eventNotes = valueAt([
        'Notes',
        'Event Notes',
        'Description'
      ], col);
      const committedPlayers = parseCommittedPlayers(committedPlayersRaw);

      events.push({
        week: valueAt(['Week'], col),
        event: cleanEventNo(rawEvent || String(events.length + 1)),
        date: cleanDate(rawDate),
        course: cleanCourse(rawCourse),
        time: cleanTime(valueAt(['Time', 'Tee Time'], col)),
        notes: eventNotes,
        committedPlayers,
        photoUrl: normalizeAssetUrl(valueAt(['Photo of course', 'Course Photo', 'Photo'], col)),
        courseWebsite: valueAt(['Course website', 'Website'], col),
        googleMap: valueAt(['Google Maps', 'Map'], col),
        courseDetails: valueAt([
          'Yardage/slope/rating',
          'Yardage/rating/slope',
          'Course details'
        ], col),
        scorecardUrl: valueAt(['Scorecard'], col),
        flyoverUrl: valueAt(['Flyover'], col),
        courseLogo: normalizeAssetUrl(valueAt(['Course logo', 'Logo'], col)),
        tees: cleanTees(valueAt(['Tees'], col)),
        status: parsed && parsed < today ? 'Past' : 'Upcoming',
        daysAway: parsed ? Math.ceil((parsed.getTime() - today.getTime()) / 86400000) : null,
        timestamp: parsed ? parsed.getTime() : Number.MAX_SAFE_INTEGER,
        sortOrder: events.length
      });
    }

    return events
      .filter(event => event.status !== 'Past')
      .sort((a, b) => a.timestamp - b.timestamp || a.sortOrder - b.sortOrder);
  }

  // Legacy horizontal layout.
  const findPosition = labels => {
    const targets = labels.map(cleanLabel);
    for (let row = 0; row < Math.min(rows.length, 30); row++) {
      for (let col = 0; col < (rows[row] || []).length; col++) {
        if (targets.includes(cleanLabel(rows[row][col]))) return { row, col };
      }
    }
    return null;
  };

  const positions = {
    week: findPosition(['Week']),
    event: findPosition(['Event', 'Event Number', 'Event #']),
    date: findPosition(['Date']),
    course: findPosition(['Course', 'Course Name']),
    time: findPosition(['Time', 'Tee Time'])
  };

  if (!positions.event || !positions.date || !positions.course) return [];

  const startCol = Math.max(...Object.values(positions).filter(Boolean).map(position => position.col)) + 1;
  const maxCol = Math.max(...rows.map(row => row.length), startCol);
  const cellAt = (position, col) => position ? textCell(rows[position.row]?.[col]) : '';
  const events = [];

  for (let col = startCol; col < maxCol; col++) {
    const parsed = parseLooseDate(cellAt(positions.date, col), new Date().getFullYear());
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    events.push({
      week: cellAt(positions.week, col),
      event: cleanEventNo(cellAt(positions.event, col)),
      date: cleanDate(cellAt(positions.date, col)),
      course: cleanCourse(cellAt(positions.course, col)),
      time: cleanTime(cellAt(positions.time, col)),
      notes: '',
      committedPlayers: [],
      tees: '',
      status: parsed && parsed < today ? 'Past' : 'Upcoming',
      daysAway: parsed ? Math.ceil((parsed.getTime() - today.getTime()) / 86400000) : null,
      timestamp: parsed ? parsed.getTime() : Number.MAX_SAFE_INTEGER,
      sortOrder: events.length
    });
  }

  return events.filter(event => event.status !== 'Past').sort((a, b) => a.timestamp - b.timestamp);
}


async function fetchFutureEventsSheet() {
  // Use the GViz CSV endpoint directly. The generic /export endpoint can
  // return a nonempty response for the wrong tab and prevent the correct
  // Future Events CSV from being used.
  const url = csvUrl('Future Events');

  try {
    const response = await fetch(url);

    if (!response.ok) {
      console.warn(
        'Unable to load Future Events sheet:',
        response.status,
        response.statusText
      );
      return '';
    }

    const text = await response.text();

    if (!text || !text.trim()) {
      console.warn('Future Events sheet returned blank CSV');
      return '';
    }

    return text;
  } catch (error) {
    console.warn('Unable to load Future Events sheet', error);
    return '';
  }
}

function parseThisDayHistory(text) {
  if (!text) return [];
  const rows = parseCSV(text);
  const headerRow = findHeaderIndex(rows, ['Date']);
  if (headerRow === -1) return [];

  const headers = rows[headerRow].map(normalizeHeader);
  const indexOf = names => headerIndex(headers, names);

  const indexes = {
    date: indexOf(['Date']),
    year: indexOf(['Year']),
    time: indexOf(['Time']),
    event: indexOf(['Event']),
    course: indexOf(['Course']),
    tees: indexOf(['Tees']),
    winner: indexOf(['Winner', '1st', 'First']),
    second: indexOf(['Second', '2nd']),
    third: indexOf(['Third', '3rd']),
    fourth: indexOf(['Fourth', '4th']),
    net: indexOf(['Net Score', 'Net']),
    title: indexOf(['Title', 'Headline']),
    story: indexOf(['Story', 'Description', 'Body']),
    photoUrl: indexOf(['Photo URL', 'Photo', 'Image URL', 'History Photo', 'History Photo URL'])
  };

  return rows.slice(headerRow + 1).map(row => {
    const rawDate = indexes.date >= 0 ? textCell(row[indexes.date]) : '';
    if (!rawDate) return null;

    // This Day should match only month/day, not historical year.
    const date = monthDayFromDate(rawDate, new Date().getFullYear());
    if (!date) return null;

    const year = indexes.year >= 0 ? textCell(row[indexes.year]) : '';
    const time = indexes.time >= 0 ? textCell(row[indexes.time]) : '';
    const event = indexes.event >= 0 ? textCell(row[indexes.event]) : '';
    const course = indexes.course >= 0 ? textCell(row[indexes.course]) : '';
    const tees = indexes.tees >= 0 ? textCell(row[indexes.tees]) : '';
    const winner = indexes.winner >= 0 ? cleanName(row[indexes.winner]) : '';
    const second = indexes.second >= 0 ? cleanName(row[indexes.second]) : '';
    const third = indexes.third >= 0 ? cleanName(row[indexes.third]) : '';
    const fourth = indexes.fourth >= 0 ? cleanName(row[indexes.fourth]) : '';
    const net = indexes.net >= 0 ? textCell(row[indexes.net]) : '';
    const explicitTitle = indexes.title >= 0 ? textCell(row[indexes.title]) : '';
    const story = indexes.story >= 0 ? textCell(row[indexes.story]) : '';
    const photoUrl = indexes.photoUrl >= 0 ? normalizeAssetUrl(row[indexes.photoUrl]) : '';

    const title = explicitTitle || (winner && course
      ? `${winner} wins at ${course}`
      : winner
        ? `${winner} enters the archive`
        : 'DGL history recorded');

    const fallbackBody = [
      winner && course ? `${winner} won at ${course}${tees ? ` from the ${tees} tees` : ''}${net ? ` with a ${net} net` : ''}.` : '',
      time ? `Tee time: ${time}.` : '',
      event ? `Event ${event}.` : '',
      second ? `${second} finished second.` : '',
      third ? `${third} took third.` : '',
      fourth ? `${fourth} took fourth.` : ''
    ].filter(Boolean).join(' ');

    return {
      date,
      year: year || 'DGL Archives',
      type: '📜 This Day in DGL History',
      title,
      body: story || fallbackBody,
      photoUrl
    };
  }).filter(Boolean);
}

function parseStateTrophies(text) {
  if (!text) return [];
  const rows = parseCSV(text);
  const trophyHeaderRow = rows.findIndex(row => {
    const headers = row.map(normalizeHeader);
    return headers.includes('state') && (headers.includes('player') || headers.includes('winner'));
  });
  if (trophyHeaderRow === -1) return [];

  const headers = rows[trophyHeaderRow].map(normalizeHeader);
  const indexes = {
    state: headerIndex(headers, ['State']),
    trophy: headerIndex(headers, ['Trophy Name', 'Trophy']),
    year: headerIndex(headers, ['Year']),
    course: headerIndex(headers, ['Course']),
    finish: headerIndex(headers, ['Finish', 'Place']),
    player: headerIndex(headers, ['Player', 'Winner']),
    notes: headerIndex(headers, ['Notes']),
    photo1: headerIndex(headers, ['Photo 1']),
    photo2: headerIndex(headers, ['Photo 2']),
    photo3: headerIndex(headers, ['Photo 3']),
    photoTrophy: headerIndex(headers, ['Photo Trophy', 'Trophy Photo', 'Trophy Photo URL'])
  };

  return rows.slice(trophyHeaderRow + 1).map(row => {
    const state = textCell(row[indexes.state]);
    const player = cleanName(row[indexes.player]);
    if (!state || !player) return null;

    const photo1 = normalizeAssetUrl(indexes.photo1 >= 0 ? row[indexes.photo1] : '');
    const photo2 = normalizeAssetUrl(indexes.photo2 >= 0 ? row[indexes.photo2] : '');
    const photo3 = normalizeAssetUrl(indexes.photo3 >= 0 ? row[indexes.photo3] : '');
    const photoTrophy = normalizeAssetUrl(indexes.photoTrophy >= 0 ? row[indexes.photoTrophy] : '');

    return {
      state,
      trophy: indexes.trophy >= 0 ? textCell(row[indexes.trophy]) : state + ' Trophy',
      year: indexes.year >= 0 ? textCell(row[indexes.year]) : '',
      course: indexes.course >= 0 ? textCell(row[indexes.course]) : '',
      finish: indexes.finish >= 0 ? textCell(row[indexes.finish]) : '',
      player,
      notes: indexes.notes >= 0 ? textCell(row[indexes.notes]) : '',
      photo1,
      photo2,
      photo3,
      photoTrophy,
      galleryPhotos: [photo1, photo2, photo3].filter(Boolean),
      photoUrl: photoTrophy || photo1 || photo2 || photo3
    };
  }).filter(Boolean);
}

function formatRank(player) {
  return player?.rankLabel || (player?.rank ? String(player.rank) : '—');
}

function rankBadge(player) {
  if (!player) return '—';
  if (player.rankLabel) return player.rankLabel;
  return medal(player.rank);
}


function findPot(sheet, label) {
  const target = label.toLowerCase();
  const row = sheet.find(r => r.some(cell => String(cell || '').toLowerCase().trim() === target));

  if (!row) return 0;

  const values = row
    .map(cell => numberFromCell(cell))
    .filter(value => value > 0);

  return values.length ? values[values.length - 1] : 0;
}

function parseLooseDate(value, defaultYear = new Date().getFullYear()) {
  if (!value) return null;

  const raw = String(value).trim();
  const match = raw.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);

  if (match) {
    let year = match[3] ? Number(match[3]) : defaultYear;
    if (year < 100) year += 2000;
    return new Date(year, Number(match[1]) - 1, Number(match[2]));
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function monthDayFromDate(value, defaultYear) {
  const parsed = parseLooseDate(value, defaultYear);
  if (!parsed) return '';
  return parsed.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

function decorateEvents(events, defaultYear = yearFromSheetName(CURRENT_YEAR_SHEET)) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return events
    .map(event => {
      const parsed = parseLooseDate(event.date, defaultYear);
      const isPast = parsed ? parsed < today : false;
      const daysAway = parsed ? Math.ceil((parsed.getTime() - today.getTime()) / 86400000) : null;

      return {
        ...event,
        status: isPast ? 'Past' : 'Upcoming',
        timestamp: parsed ? parsed.getTime() : Number.MAX_SAFE_INTEGER,
        daysAway
      };
    })
    .sort((a, b) => a.timestamp - b.timestamp);
}

function parseEventColumns(sheet, sheetName = CURRENT_YEAR_SHEET) {
  const defaultYear = yearFromSheetName(sheetName);

  function findBestLabel(label, fallbackRow, fallbackCol = 0) {
    const target = label.toLowerCase();
    let best = null;

    for (let row = 0; row <= Math.min(sheet.length - 1, 12); row++) {
      const cells = sheet[row] || [];
      for (let col = 0; col < cells.length; col++) {
        const normalized = String(cells[col] || '').replace(':', '').trim().toLowerCase();
        if (normalized === target) {
          if (!best || col > best.col) best = { row, col };
        }
      }
    }

    return best || { row: fallbackRow, col: fallbackCol };
  }

  const eventPos = findBestLabel('Event', 1, 0);
  const datePos = findBestLabel('Date', 2, eventPos.col);
  const coursePos = findBestLabel('Course', 3, eventPos.col);
  const teesPos = findBestLabel('Tees', 4, eventPos.col);
  const timePos = findBestLabel('Time', 5, eventPos.col);
  const startCol = Math.max(eventPos.col, datePos.col, coursePos.col, teesPos.col, timePos.col) + 1;
  const maxCol = Math.max(
    sheet[eventPos.row]?.length || 0,
    sheet[datePos.row]?.length || 0,
    sheet[coursePos.row]?.length || 0,
    sheet[teesPos.row]?.length || 0,
    sheet[timePos.row]?.length || 0,
    40
  );

  const events = [];

  for (let col = startCol; col <= maxCol; col++) {
    const eventNo = cleanEventNo(sheet[eventPos.row]?.[col]);
    const date = cleanDate(sheet[datePos.row]?.[col]);
    const course = cleanCourse(sheet[coursePos.row]?.[col]);
    const tees = cleanTees(sheet[teesPos.row]?.[col]);
    const time = cleanTime(sheet[timePos.row]?.[col]);

    if (!eventNo && !date && !course && !tees && !time) continue;

    events.push({
      event: eventNo || events.length + 1,
      date: date || '',
      course: course || 'Course TBD',
      tees: tees || '',
      time: time || ''
    });
  }

  return decorateEvents(events, defaultYear);
}


function rowHasLabel(row = [], label) {
  const target = label.toLowerCase();
  return row.some(cell => String(cell || '').replace(':', '').trim().toLowerCase() === target);
}

function numericValuesFromRow(row = [], startCol = 0) {
  return row
    .slice(startCol)
    .map(cell => numberFromCell(cell))
    .filter(value => Number.isFinite(value) && value !== 0);
}

function extractPlayerBlocks(sheet) {
  const blocks = [];
  const playerNamePattern = /^[A-Z][A-Za-z.'-]*(?:\s+[A-Z][A-Za-z.'-]*|\s+T\.)?$/;

  for (let row = 0; row < sheet.length; row++) {
    const rawName = textCell(sheet[row]?.[0]);
    if (!rawName || !playerNamePattern.test(rawName)) continue;

    const blockRows = sheet.slice(row, Math.min(row + 6, sheet.length));
    const hasGolfLabels = blockRows.some(blockRow =>
      rowHasLabel(blockRow, 'DGLFC Points') ||
      rowHasLabel(blockRow, 'Total DGL Points') ||
      rowHasLabel(blockRow, 'Total Points') ||
      rowHasLabel(blockRow, 'Season Points') ||
      rowHasLabel(blockRow, 'Rank') ||
      rowHasLabel(blockRow, 'Finish') ||
      rowHasLabel(blockRow, 'GHIN') ||
      rowHasLabel(blockRow, 'NET')
    );

    if (!hasGolfLabels) continue;

    blocks.push({ name: cleanName(rawName), startRow: row, rows: blockRows });
  }

  return blocks;
}

function findRowInBlock(block, label) {
  return block.rows.find(row => rowHasLabel(row, label)) || [];
}

function findRowInBlockAny(block, labels = []) {
  return block.rows.find(row => labels.some(label => rowHasLabel(row, label))) || [];
}

function lastNumericValue(row = [], startCol = 1) {
  const values = row
    .slice(startCol)
    .map(cell => numberFromCell(cell))
    .filter(value => Number.isFinite(value) && value !== 0);

  return values.length ? values[values.length - 1] : 0;
}

function parseCurrentStandings(sheet) {
  const headerRows = sheet.slice(0, 14);
  let totalCol = -1;
  let rankCol = -1;

  headerRows.forEach(row => {
    row.forEach((cell, col) => {
      const h = normalizeHeader(cell);
      if (['totaldglpoints', 'totalpoints', 'seasonpoints'].includes(h) && col > 10) totalCol = col;
      if (h === 'rank' && col > 10) rankCol = col;
    });
  });

  const blocks = extractPlayerBlocks(sheet);
  const players = blocks.map(block => {
    const pointsRow = findRowInBlock(block, 'DGLFC Points');
    let points = 0;
    let sheetRank = 0;

    if (pointsRow.length) {
      points = totalCol >= 0 ? numberFromCell(pointsRow[totalCol]) : 0;
      sheetRank = rankCol >= 0 ? numberFromCell(pointsRow[rankCol]) : 0;
    }

    return {
      name: block.name,
      points: Math.round(points * 100) / 100,
      sheetRank
    };
  }).filter(player => player.name && (player.sheetRank || player.points > 0));

  players.sort((a, b) => {
    if (a.sheetRank && b.sheetRank) return a.sheetRank - b.sheetRank;
    if (a.sheetRank && !b.sheetRank) return -1;
    if (!a.sheetRank && b.sheetRank) return 1;
    return b.points - a.points || a.name.localeCompare(b.name);
  });

  let previousPoints = null;
  let previousRank = 0;
  const ranked = players.map((player, index) => {
    const rank = player.sheetRank || (previousPoints !== null && Math.abs(player.points - previousPoints) < 0.0001
      ? previousRank
      : index + 1);

    previousPoints = player.points;
    previousRank = rank;

    return { ...player, rank };
  });

  const counts = ranked.reduce((acc, player) => {
    acc[player.rank] = (acc[player.rank] || 0) + 1;
    return acc;
  }, {});

  return ranked.map(player => ({
    ...player,
    rankLabel: counts[player.rank] > 1 ? `T${player.rank}` : String(player.rank)
  }));
}
function strictNumberFromCell(value) {
  const raw = String(value ?? '').trim();
  if (!raw || raw === '-' || /^#(?:DIV\/0!|VALUE!|N\/A|REF!|NAME\?|NUM!|NULL!)$/i.test(raw)) {
    return null;
  }

  const cleaned = raw.replace(/[$,%\s,]/g, '');
  if (!cleaned || !/^-?\d+(?:\.\d+)?$/.test(cleaned)) return null;

  const number = Number(cleaned);
  return Number.isFinite(number) ? number : null;
}

function findHistoricalStandingsColumns(sheet) {
  let totalCol = -1;
  let rankCol = -1;
  let headerRow = -1;

  for (let row = 0; row < Math.min(sheet.length, 80); row++) {
    for (let col = 0; col < (sheet[row] || []).length; col++) {
      const header = normalizeHeader(sheet[row][col]);

      // Supports both "Total DGL Points" and the visually truncated
      // "Total DGL Point" seen in some historical sheets.
      if (
        header.startsWith('totaldglpoint') ||
        header === 'totalpoints' ||
        header === 'seasonpoints' ||
        header === 'regularseasonpoints'
      ) {
        totalCol = col;
        headerRow = row;
      }

      if (header === 'rank') {
        rankCol = col;
        if (headerRow < 0) headerRow = row;
      }
    }
  }

  return { totalCol, rankCol, headerRow };
}

function isHistoricalPlayerName(value) {
  const raw = textCell(value);
  if (!raw) return false;

  const normalized = normalizeHeader(raw);
  const rejected = [
    'event', 'date', 'course', 'tees', 'time', 'week',
    'dglfcincrease', 'dglfcpurse', 'winners', 'winner',
    'totaldglpoints', 'totaldglpoint', 'rank', 'ghin', 'net',
    'finish', 'championship', 'totalcost', 'sunset'
  ];

  if (rejected.some(label => normalized === label || normalized.startsWith(label))) return false;
  if (/^\d+(?:\.\d+)?$/.test(raw)) return false;
  if (/^[$#%]/.test(raw)) return false;

  return /[A-Za-z]/.test(raw);
}

function nearestHistoricalPlayerName(sheet, rowIndex, maxLookback = 4) {
  for (let row = rowIndex; row >= Math.max(0, rowIndex - maxLookback); row--) {
    const raw = textCell(sheet[row]?.[0]);
    if (isHistoricalPlayerName(raw)) return cleanName(raw);
  }
  return '';
}

function findHistoricalBlockStandingsColumns(sheet) {
  const pointsRows = sheet.filter(row => rowHasLabel(row, 'DGLFC Points'));
  if (pointsRows.length < 2) return { pointsCol: -1, rankCol: -1 };

  const maxCol = Math.max(...pointsRows.map(row => row.length), 0);
  let best = { pointsCol: -1, rankCol: -1, score: 0 };

  // In the 2021–2023 sheets, the season total and rank are adjacent cells on
  // every golfer's DGLFC Points row. Their columns move from year to year, so
  // detect the pair by looking for a numeric total followed by an integer rank
  // across the greatest number of player blocks.
  for (let pointsCol = 4; pointsCol < maxCol - 1; pointsCol++) {
    const rankCol = pointsCol + 1;
    let validPairs = 0;
    const ranks = [];

    pointsRows.forEach(row => {
      const points = strictNumberFromCell(row[pointsCol]);
      const rank = strictNumberFromCell(row[rankCol]);
      if (
        points !== null &&
        points >= 0 &&
        rank !== null &&
        Number.isInteger(rank) &&
        rank >= 1 &&
        rank <= pointsRows.length + 5
      ) {
        validPairs++;
        ranks.push(rank);
      }
    });

    const distinctRanks = new Set(ranks).size;
    const score = validPairs * 10 + distinctRanks;
    if (
      validPairs >= Math.max(3, Math.ceil(pointsRows.length * 0.45)) &&
      (score > best.score || (score === best.score && pointsCol > best.pointsCol))
    ) {
      best = { pointsCol, rankCol, score };
    }
  }

  return { pointsCol: best.pointsCol, rankCol: best.rankCol };
}

function parseYearStandings(sheet) {
  const { totalCol, rankCol, headerRow } = findHistoricalStandingsColumns(sheet);

  const players = [];
  const seen = new Set();

  const blockColumns = findHistoricalBlockStandingsColumns(sheet);
  if (blockColumns.pointsCol >= 0) {
    extractPlayerBlocks(sheet).forEach(block => {
      const pointsRow = findRowInBlock(block, 'DGLFC Points');
      if (!pointsRow.length) return;

      const points = strictNumberFromCell(pointsRow[blockColumns.pointsCol]);
      const sheetRank = strictNumberFromCell(pointsRow[blockColumns.rankCol]);
      if (points === null) return;

      const key = canonicalName(block.name);
      if (!key || seen.has(key)) return;
      seen.add(key);

      players.push({
        name: block.name,
        points: Math.round(points * 100) / 100,
        sheetRank: sheetRank && sheetRank > 0 ? sheetRank : null
      });
    });
  } else if (totalCol >= 0) {
    for (let row = Math.max(0, headerRow + 1); row < sheet.length; row++) {
      const points = strictNumberFromCell(sheet[row]?.[totalCol]);
      const rank = rankCol >= 0 ? strictNumberFromCell(sheet[row]?.[rankCol]) : null;

      // A valid standings row has a numeric season-points value. Zero is valid.
      if (points === null) continue;

      const name = nearestHistoricalPlayerName(sheet, row, 6);
      if (!name) continue;

      const key = canonicalName(name);
      if (!key || seen.has(key)) continue;
      seen.add(key);

      players.push({
        name,
        points: Math.round(points * 100) / 100,
        sheetRank: rank && rank > 0 ? rank : null
      });
    }
  }

  // Final fallback for an unrecognized labeled-block layout.
  if (!players.length) {
    extractPlayerBlocks(sheet).forEach(block => {
      const pointsRow = findRowInBlockAny(block, [
        'Total DGL Points',
        'Total Points',
        'Season Points',
        'Regular Season Points',
        'DGLFC Points'
      ]);
      if (!pointsRow.length) return;

      const points = lastNumericValue(pointsRow);
      const key = canonicalName(block.name);
      if (!key || seen.has(key)) return;
      seen.add(key);

      const rankRow = findRowInBlock(block, 'Rank');
      const sheetRank = rankRow.length ? lastNumericValue(rankRow) : null;
      players.push({
        name: block.name,
        points: Math.round(points * 100) / 100,
        sheetRank: sheetRank && sheetRank > 0 ? sheetRank : null
      });
    });
  }

  players.sort((a, b) =>
    b.points - a.points ||
    (a.sheetRank ?? 999) - (b.sheetRank ?? 999) ||
    a.name.localeCompare(b.name)
  );

  let previousPoints = null;
  let previousComputedRank = 0;

  const ranked = players.map((player, index) => {
    const computedRank = previousPoints !== null && Math.abs(player.points - previousPoints) < 0.0001
      ? previousComputedRank
      : index + 1;

    previousPoints = player.points;
    previousComputedRank = computedRank;

    // Points determine order. The sheet rank is retained only when it agrees
    // with that points-based order; otherwise use the computed rank.
    const rank = player.sheetRank === computedRank ? player.sheetRank : computedRank;
    return { ...player, rank };
  });

  const rankCounts = ranked.reduce((counts, player) => {
    counts[player.rank] = (counts[player.rank] || 0) + 1;
    return counts;
  }, {});

  return ranked.map(player => ({
    name: player.name,
    points: player.points,
    rank: player.rank,
    rankLabel: rankCounts[player.rank] > 1 ? `T${player.rank}` : String(player.rank)
  }));
}

function findSheetValueNearLabel(sheet, labels = []) {
  const normalizedLabels = labels.map(label => label.toLowerCase());

  for (let row = 0; row < sheet.length; row++) {
    for (let col = 0; col < (sheet[row] || []).length; col++) {
      const cell = String(sheet[row]?.[col] || '').trim();
      const lower = cell.toLowerCase();
      const matched = normalizedLabels.some(label => lower.includes(label));

      if (!matched) continue;

      const sameCellSplit = cell.split(':');
      if (sameCellSplit.length > 1 && sameCellSplit.slice(1).join(':').trim()) {
        return sameCellSplit.slice(1).join(':').trim();
      }

      const right = textCell(sheet[row]?.[col + 1]);
      const below = textCell(sheet[row + 1]?.[col]);

      return right || below || '';
    }
  }

  return '';
}


function playerSlug(name = '') {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function imageCandidates(primary = '', slug = '') {
  const clean = normalizeAssetUrl(primary);
  const raw = textCell(primary);
  const list = [];

  if (clean) list.push(clean);
  if (raw && raw !== clean) list.push(raw);
  if (raw && raw.startsWith('public/')) list.push('/' + raw.replace(/^public\//, ''));
  if (raw && !raw.startsWith('http') && !raw.startsWith('/')) list.push('/' + raw.replace(/^public\//, ''));

  if (slug) {
    list.push(`/players/${slug}.jpg`);
    list.push(`/players/${slug}.jpeg`);
    list.push(`/players/${slug}.png`);
    list.push(`/players/${slug}.webp`);
  }

  return Array.from(new Set(list.filter(Boolean)));
}

function PlayerPhoto({ name, src = '', className = '' }) {
  const slug = playerSlug(name);
  const candidates = imageCandidates(src, slug);
  const [sourceIndex, setSourceIndex] = useState(0);
  const source = candidates[sourceIndex];

  useEffect(() => {
    setSourceIndex(0);
  }, [src, name]);

  if (!name) return null;

  if (!source) {
    return <div className={'player-photo-fallback clown-avatar ' + className}>🤡⛳<small>{initials(name)}</small></div>;
  }

  return (
    <img
      src={source}
      alt={name}
      className={'player-photo ' + className}
      onError={() => setSourceIndex(index => index + 1)}
    />
  );
}

function AssetPhoto({ src = '', alt = '', className = '', fallback = '🏆', candidates = [] }) {
  const all = Array.from(new Set([normalizeAssetUrl(src), src, ...candidates.map(normalizeAssetUrl)].filter(Boolean)));
  const [sourceIndex, setSourceIndex] = useState(0);
  const source = all[sourceIndex];

  useEffect(() => {
    setSourceIndex(0);
  }, [src, candidates.join('|')]);

  if (!source) return <div className={className + ' placeholder'}>{fallback}</div>;

  return (
    <img
      src={source}
      alt={alt}
      className={className}
      onError={() => setSourceIndex(index => index + 1)}
    />
  );
}

function parseAnnalsRecords(text) {
  if (!text) return [];

  const rows = parseCSV(text);
  const headerIndex = rows.findIndex(row =>
    row.some(cell => normalizeHeader(cell) === 'year') &&
    row.some(cell => normalizeHeader(cell) === 'player')
  );

  if (headerIndex === -1) return [];

  const headers = rows[headerIndex].map(normalizeHeader);
  const indexOf = names => headers.findIndex(header => names.includes(header));

  const indexes = {
    year: indexOf(['year']),
    player: indexOf(['player', 'name']),
    finish: indexOf(['finish', 'place']),
    firstCut: indexOf(['made1stcut', 'firstcut']),
    secondCut: indexOf(['made2ndcut', 'secondcut']),
    pedigree: indexOf(['pedigree', 'pedigreebase']),
    weighted: indexOf(['weightedscore', 'weighted'])
  };

  return rows.slice(headerIndex + 1)
    .map(row => {
      const year = String(row[indexes.year] || '').trim();
      const player = cleanName(row[indexes.player]);
      const finishRaw = String(row[indexes.finish] || '').trim();
      if (!year || !player || !finishRaw) return null;

      return {
        year,
        player,
        finish: finishRaw,
        finishNumber: numberFromCell(finishRaw),
        firstCut: indexes.firstCut >= 0 ? String(row[indexes.firstCut] || '').trim() : '',
        secondCut: indexes.secondCut >= 0 ? String(row[indexes.secondCut] || '').trim() : '',
        pedigree: indexes.pedigree >= 0 ? numberFromCell(row[indexes.pedigree]) : 0,
        weighted: indexes.weighted >= 0 ? numberFromCell(row[indexes.weighted]) : 0
      };
    })
    .filter(Boolean)
    .sort((a, b) => Number(b.year) - Number(a.year) || a.finishNumber - b.finishNumber);
}

function buildAnnalsYearsFromRecords(records = [], historyTexts = []) {
  const recordsByYear = records.reduce((acc, record) => {
    acc[record.year] = acc[record.year] || [];
    acc[record.year].push(record);
    return acc;
  }, {});

  const years = new Set([
    ...HISTORY_SHEETS.map(sheetName => String(yearFromSheetName(sheetName))),
    ...records.map(record => record.year)
  ]);

  return Array.from(years).map(year => {
    const sheetIndex = HISTORY_SHEETS.findIndex(sheetName => String(yearFromSheetName(sheetName)) === year);
    const text = sheetIndex >= 0 ? historyTexts[sheetIndex] || '' : '';
    const sheet = text ? parseCSV(text) : [];
    const standings = parseYearStandings(sheet);
    const events = parseEventColumns(sheet, `${year} Standings`);
    const championship = (recordsByYear[year] || []).sort((a, b) => a.finishNumber - b.finishNumber);
    const championRows = championship.filter(record => record.finishNumber === 1);

    const topPoints = standings[0] || {};
    const eventLeaders = standings
      .map(player => ({ ...player, eventsPlayed: 0 }))
      .slice(0, 5);

    return {
      year,
      standings,
      events,
      championship,
      champion: championRows.length ? championRows.map(row => row.player).join(' & ') : 'Add champion to Annals',
      championWinnings: findSheetValueNearLabel(sheet, ['Won', 'Winnings', 'Payout']) || '',
      mostImproved: findSheetValueNearLabel(sheet, ['Most Improved', 'MIP']) || '',
      lowHandicap: findSheetValueNearLabel(sheet, ['Low Handicap', 'Low HC', 'Lowest Handicap']) || '',
      topPointsPlayer: topPoints.name || '—',
      topPoints: topPoints.points || 0,
      eventLeaders
    };
  }).sort((a, b) => Number(b.year) - Number(a.year));
}


function buildAnnalsYears(historyTexts) {
  return HISTORY_SHEETS.map((sheetName, sheetIndex) => {
    const year = String(yearFromSheetName(sheetName));
    const text = historyTexts[sheetIndex] || '';
    const sheet = text ? parseCSV(text) : [];
    const standings = parseYearStandings(sheet);
    const events = parseEventColumns(sheet, sheetName);

    const topPoints = standings[0] || {};

    return {
      year,
      standings,
      events,
      champion: findSheetValueNearLabel(sheet, ['DGLFC Champion', 'Champion']) || 'Add champion to sheet',
      championWinnings: findSheetValueNearLabel(sheet, ['Won', 'Winnings', 'Payout']) || 'Add winnings to sheet',
      mostImproved: findSheetValueNearLabel(sheet, ['Most Improved', 'MIP']) || 'Add most improved to sheet',
      lowHandicap: findSheetValueNearLabel(sheet, ['Low Handicap', 'Low HC', 'Lowest Handicap']) || 'Add low handicap to sheet',
      topPointsPlayer: topPoints.name || '—',
      topPoints: topPoints.points || 0
    };
  }).sort((a, b) => Number(b.year) - Number(a.year));
}


function buildHistoryMoments(historyTexts) {
  const historyMoments = [];

  historyTexts.forEach((text, sheetIndex) => {
    if (!text) return;

    const sheetName = HISTORY_SHEETS[sheetIndex];
    const year = String(yearFromSheetName(sheetName));
    const historySheet = parseCSV(text);
    const events = parseEventColumns(historySheet, sheetName);

    events.forEach(event => {
      if (!event.date || !event.course || event.course === 'Course TBD') return;

      const monthDay = monthDayFromDate(event.date, Number(year));
      if (!monthDay) return;

      historyMoments.push({
        date: monthDay,
        year,
        type: '🏌️ Tour Stop',
        title: `DGL played ${event.course}`,
        body: `Event ${event.event || ''}${event.tees ? ` • ${event.tees} tees` : ''}${event.time ? ` • ${event.time}` : ''}`.trim()
      });
    });
  });

  return historyMoments;
}


async function fetchFirstAvailableSheet(sheetNames) {
  for (const sheetName of sheetNames) {
    try {
      const response = await fetch(csvUrl(sheetName));
      if (response.ok) {
        const text = await response.text();
        if (text && text.trim()) return text;
      }
    } catch (error) {
      console.warn('Unable to load sheet', sheetName, error);
    }
  }
  return '';
}

function normalizeHeader(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function parsePercentCell(value) {
  const raw = String(value || '').trim();
  if (!raw) return 0;
  const number = Number(raw.replace('%', '').trim());
  if (!Number.isFinite(number)) return 0;
  return raw.includes('%') ? number / 100 : number;
}

function parseSportsbook(text) {
  if (!text) return [];
  const rows = parseCSV(text);

  const headerIndex = rows.findIndex(row =>
    row.some(cell => normalizeHeader(cell) === 'player')
  );

  if (headerIndex === -1) return [];

  const headers = rows[headerIndex].map(normalizeHeader);
  const indexOf = names => headers.findIndex(header => names.map(normalizeHeader).includes(header));

  // Power Model source of truth: A-J. Hard fallbacks prevent the insights from disappearing.
  const indexes = {
    player: indexOf(['Player', 'Name']),
    currentPts: indexOf(['Current Pts', 'Current Points']),
    recentForm: indexOf(['Recent Form', 'Form']),
    ceiling: indexOf(['Ceiling']),
    championshipEquity: indexOf(['Championship Equity']),
    pedigree: indexOf(['DGLFC Pedigree', 'Pedigree']),
    ghin: indexOf(['Current GHIN', 'GHIN']),
    rating: indexOf(['DGL Power Rating', 'DGL Rating', 'Power Rating', 'Rating']),
    winPercent: indexOf(['Win %', 'Win Percent', 'Implied Probability']),
    odds: indexOf(['Odds', 'Vegas Odds']),
    movement: indexOf(['Movement', 'Move']),
    lastWeekOdds: indexOf(['Last Week Odds', 'Last week odds', 'Prior Odds']),
    valueLabel: indexOf(['Value', 'Value Label', 'Value Tier'])
  };

  if (indexes.player === -1) indexes.player = 0;
  if (indexes.currentPts === -1) indexes.currentPts = 1;
  if (indexes.recentForm === -1) indexes.recentForm = 2;
  if (indexes.ceiling === -1) indexes.ceiling = 3;
  if (indexes.pedigree === -1) indexes.pedigree = 5;
  if (indexes.ghin === -1) indexes.ghin = 6;
  if (indexes.rating === -1) indexes.rating = 7;
  if (indexes.winPercent === -1) indexes.winPercent = 8;
  if (indexes.odds === -1) indexes.odds = 9;
  if (indexes.movement === -1) indexes.movement = 10;
  if (indexes.lastWeekOdds === -1) indexes.lastWeekOdds = 11;
  if (indexes.valueLabel === -1) indexes.valueLabel = 25;

  return rows.slice(headerIndex + 1)
    .map(row => {
      const player = cleanName(row[indexes.player]);
      if (!player) return null;

      const rating = numberFromCell(row[indexes.rating]);
      const winPercent = parsePercentCell(row[indexes.winPercent]);
      const odds = String(row[indexes.odds] || '').trim();

      return {
        player,
        currentPts: numberFromCell(row[indexes.currentPts]),
        recentForm: numberFromCell(row[indexes.recentForm]),
        ceiling: numberFromCell(row[indexes.ceiling]),
        attendance: 0,
        pedigree: numberFromCell(row[indexes.pedigree]),
        ghin: numberFromCell(row[indexes.ghin]),
        rating,
        winPercent,
        odds,
        movement: indexes.movement >= 0 ? String(row[indexes.movement] || '').trim() : '',
        lastWeekOdds: indexes.lastWeekOdds >= 0 ? String(row[indexes.lastWeekOdds] || '').trim() : '',
        valueLabel: indexes.valueLabel >= 0 ? textCell(row[indexes.valueLabel]) : ''
      };
    })
    .filter(Boolean)
    .filter(player => player.rating || player.winPercent || player.odds)
    .filter(player => !String(player.odds || '').includes('#DIV'))
    .sort((a, b) => b.rating - a.rating || a.player.localeCompare(b.player));
}
function formatOdds(value) {
  if (value === undefined || value === null || value === '') return '—';
  const raw = String(value).trim();
  if (raw.startsWith('+') || raw.startsWith('-')) return raw;
  const number = Number(raw);
  if (!Number.isFinite(number)) return raw;
  return number > 0 ? `+${number}` : String(number);
}

function formatPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  return (number * 100).toFixed(1) + '%';
}

function sportsbookInsights(board = []) {
  const sorted = [...board].sort((a, b) => b.rating - a.rating);
  const favorite = sorted[0] || {};
  const bestValue = sorted.find(player => Number(String(player.odds).replace('+', '')) >= 700) || sorted[1] || {};
  const highestCeiling = [...sorted]
    .filter(player => Number(player.ceiling) > 0)
    .sort((a, b) => Number(b.ceiling) - Number(a.ceiling))[0] || {};
  const ghinMonster = [...sorted]
    .filter(player => Number(player.ghin) > 0)
    .sort((a, b) => {
      // If the Power Model is feeding GHIN Score, higher is better.
      // If it is feeding raw GHIN, lower is better. Scores are typically 0-100; raw GHIN is usually under 40.
      const aVal = Number(a.ghin);
      const bVal = Number(b.ghin);
      const valuesLookLikeScores = sorted.some(p => Number(p.ghin) > 40);
      return valuesLookLikeScores ? bVal - aVal : aVal - bVal;
    })[0] || {};

  return {
    favorite,
    bestValue,
    highestCeiling,
    ghinMonster
  };
}


async function safeFetchText(url, label = 'sheet') {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`Unable to load ${label}`, response.status, response.statusText);
      return '';
    }
    return await response.text();
  } catch (error) {
    console.warn(`Unable to load ${label}`, error);
    return '';
  }
}

function safeParse(label, fallback, parser) {
  try {
    const result = parser();
    return result === undefined || result === null ? fallback : result;
  } catch (error) {
    console.error(`Unable to parse ${label}`, error);
    return fallback;
  }
}

async function loadLiveData() {
  // IMPORTANT: this function is intentionally fault-tolerant.
  // One bad optional Google tab should not force the entire site into backup mode.
  const standingsText = await safeFetchText(csvUrl(CURRENT_YEAR_SHEET), CURRENT_YEAR_SHEET);
  const redRoundsText = await safeFetchText(csvUrl('Red Rounds'), 'Red Rounds');
  const historyTexts = await Promise.all(
    HISTORY_SHEETS.map(sheet => safeFetchText(csvUrl(sheet), sheet))
  );

  const sportsbookText = await fetchFirstAvailableSheet(SPORTSBOOK_SHEETS).catch(error => {
    console.warn('Unable to load sportsbook sheets', error);
    return '';
  });
  const annalsText = await fetchFirstAvailableSheet(ANNALS_SHEETS).catch(error => {
    console.warn('Unable to load annals sheets', error);
    return '';
  });
  const playersText = await fetchFirstAvailableSheet(PLAYERS_SHEETS).catch(error => {
    console.warn('Unable to load players sheet', error);
    return '';
  });
  const stateTrophiesText = await fetchFirstAvailableSheet(STATE_TROPHY_SHEETS).catch(error => {
    console.warn('Unable to load state trophies sheet', error);
    return '';
  });
  const thisDayText = await fetchFirstAvailableSheet(THIS_DAY_SHEETS).catch(error => {
    console.warn('Unable to load this day sheet', error);
    return '';
  });
  const futureEventsText = await fetchFutureEventsSheet().catch(error => {
    console.warn('Unable to load future events sheet', error);
    return '';
  });

  const sheet = standingsText ? safeParse(CURRENT_YEAR_SHEET + ' CSV', [], () => parseCSV(standingsText)) : [];
  const redSheet = redRoundsText ? safeParse('Red Rounds CSV', [], () => parseCSV(redRoundsText)) : [];

  const standings = safeParse('current standings', fallbackData.standings, () => {
    const parsed = parseCurrentStandings(sheet);
    return parsed.length ? parsed : fallbackData.standings;
  });

  const sidePots = safeParse('side pots', fallbackData.sidePots, () => ({
    sandy: findPot(sheet, 'Sandy') || fallbackData.sidePots.sandy,
    eagle: findPot(sheet, 'Eagle') || fallbackData.sidePots.eagle,
    holeInOne: findPot(sheet, 'Hole in One') || fallbackData.sidePots.holeInOne
  }));

  const events = safeParse('future events', fallbackData.events, () => {
    // Primary source: the dedicated Future Events tab.
    const dedicatedEvents = parseFutureEvents(futureEventsText);
    if (Array.isArray(dedicatedEvents) && dedicatedEvents.length) {
      return dedicatedEvents;
    }

    // Secondary source: the event columns embedded in the current standings tab.
    // This keeps Tournament Center live if Google temporarily fails to export
    // the dedicated Future Events tab or its layout changes.
    const standingsEvents = parseEventColumns(sheet, CURRENT_YEAR_SHEET)
      .filter(event => event.status !== 'Past');
    if (standingsEvents.length) {
      return standingsEvents;
    }

    // Last-resort known event so the Tournament Center never collapses to TBD.
    return decorateEvents(fallbackData.events, yearFromSheetName(CURRENT_YEAR_SHEET))
      .filter(event => event.status !== 'Past');
  });

  const redRounds = safeParse('red rounds', fallbackData.redRounds, () => {
    const rounds = [];
    for (let i = 1; i < redSheet.length; i++) {
      const row = redSheet[i];
      if (!row?.[1]) continue;

      rounds.push({
        place: row[0] || i,
        player: cleanName(row[1]),
        course: row[2] || '',
        date: row[3] || '',
        tees: row[4] || '',
        score: row[5] || '',
        net: row[6] || '',
        photoUrl: normalizeAssetUrl(row[8] || '')
      });
    }
    return rounds.length ? rounds : fallbackData.redRounds;
  });

  const historyMoments = safeParse('This Day in DGL History', fallbackData.historyMoments, () => {
    const directHistoryMoments = parseThisDayHistory(thisDayText);
    const builtHistoryMoments = buildHistoryMoments(historyTexts);
    return directHistoryMoments.length ? directHistoryMoments : builtHistoryMoments;
  });

  const annalsRecords = safeParse('annals records', fallbackData.annalsRecords, () => parseAnnalsRecords(annalsText));
  const annalsYears = safeParse('annals years', fallbackData.annalsYears, () => {
    const parsed = annalsRecords.length ? buildAnnalsYearsFromRecords(annalsRecords, historyTexts) : buildAnnalsYears(historyTexts);
    return parsed.length ? parsed : fallbackData.annalsYears;
  });
  const sportsbook = safeParse('sportsbook', fallbackData.sportsbook, () => parseSportsbook(sportsbookText));
  const eventAnalytics = events.map(event => ({
    event: event.event,
    course: event.course,
    winProbabilities: normalizeWinProbabilities(sportsbook, event.committedPlayers),
    fieldStrength: calculateFieldStrength(event.committedPlayers, sportsbook)
  }));
  const players = safeParse('players', fallbackData.players, () => parsePlayers(playersText));
  const stateTrophies = safeParse('state trophies', fallbackData.stateTrophies, () => parseStateTrophies(stateTrophiesText));

  return {
    lastUpdated: new Date().toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }),
    standings,
    sidePots,
    events,
    redRounds,
    historyMoments,
    annalsYears,
    annalsRecords,
    sportsbook,
    eventAnalytics,
    players,
    stateTrophies,
    sourceStatus: {
      standings: Boolean(standingsText),
      redRounds: Boolean(redRoundsText),
      history: historyTexts.some(Boolean),
      sportsbook: Boolean(sportsbookText),
      annals: Boolean(annalsText),
      players: Boolean(playersText),
      stateTrophies: Boolean(stateTrophiesText),
      thisDay: Boolean(thisDayText),
      futureEvents: Boolean(futureEventsText) || events.length > 0
    },
    debug: {
      playersTextHead: playersText ? playersText.slice(0, 600) : '',
      playersParsed: players.slice(0, 8),
      stateTrophiesTextHead: stateTrophiesText ? stateTrophiesText.slice(0, 500) : '',
      stateTrophiesParsed: stateTrophies.slice(0, 6)
    }
  };
}

function money(value) {
  return '$' + Number(value || 0).toLocaleString();
}

function medal(rank) {
  if (typeof rank === 'string' && rank.startsWith('T')) return rank;
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return '#' + rank;
}

function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .map(part => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function netNumber(round) {
  const n = Number(String(round.net || '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function formatNet(value) {
  const n = typeof value === 'number' ? value : Number(String(value || '').replace(/[^\d.-]/g, ''));
  if (!Number.isFinite(n)) return value || '';
  return Number(n.toFixed(3)).toString();
}

function tierForNet(net) {
  if (net <= -6) return 'Elite Table';
  if (net <= -4) return 'Excellence Lounge';
  return 'Members Gallery';
}

function ordinal(n) {
  const number = Number(n);
  if (!Number.isFinite(number)) return n;
  const v = number % 100;

  if (v >= 11 && v <= 13) return `${number}th`;

  switch (number % 10) {
    case 1: return `${number}st`;
    case 2: return `${number}nd`;
    case 3: return `${number}rd`;
    default: return `${number}th`;
  }
}

function rankedRedRounds(rounds) {
  const sorted = rounds
    .map((round, originalIndex) => ({ ...round, originalIndex, netValue: netNumber(round) }))
    .sort((a, b) => a.netValue - b.netValue || a.originalIndex - b.originalIndex);

  let previousNet = null;
  let previousRank = 0;

  return sorted.map((round, index) => {
    const rank = previousNet !== null && Math.abs(round.netValue - previousNet) < 0.0005
      ? previousRank
      : index + 1;

    previousNet = round.netValue;
    previousRank = rank;

    return {
      ...round,
      displayRank: rank,
      displayRankLabel: rank === index + 1 && sorted.filter(r => Math.abs(r.netValue - round.netValue) < 0.0005).length === 1 ? `#${ordinal(rank)}` : `T${rank}`, 
      displayNet: formatNet(round.netValue),
      tier: tierForNet(round.netValue)
    };
  });
}


function formatCommitment(notes = '') {
  const raw = textCell(notes);
  if (!raw) return '';
  const number = raw.match(/\d+/)?.[0];
  if (number) return `👥 ${number} Player${number === '1' ? '' : 's'} Committed`;
  return raw;
}

function recordIsFirstPlace(record) {
  const raw = textCell(record?.finish).toLowerCase();
  return raw === '1' || raw === '#1' || raw === '1st' || raw === 't1' || raw === 't-1' || raw.includes('winner');
}

function buildPlayerProfiles(data) {
  const names = new Set();
  (data.players || []).forEach(player => player.name && names.add(cleanName(player.name)));
  (data.standings || []).forEach(player => player.name && names.add(cleanName(player.name)));
  (data.sportsbook || []).forEach(player => player.player && names.add(cleanName(player.player)));
  (data.annalsRecords || []).forEach(record => record.player && names.add(cleanName(record.player)));
  (data.redRounds || []).forEach(round => round.player && names.add(cleanName(round.player)));
  (data.stateTrophies || []).forEach(record => record.player && names.add(cleanName(record.player)));

  return Array.from(names).map((name, index) => {
    const meta = playerMeta(data, name);
    const standing = (data.standings || []).find(player => canonicalName(player.name) === canonicalName(name)) || {};
    const market = (data.sportsbook || []).find(player => canonicalName(player.player) === canonicalName(name)) || {};
    const annals = (data.annalsRecords || []).filter(record => canonicalName(record.player) === canonicalName(name));
    const redRounds = (data.redRounds || []).filter(round => canonicalName(round.player) === canonicalName(name));
    const trophies = (data.stateTrophies || []).filter(record => canonicalName(record.player) === canonicalName(name));
    const wins = trophies.filter(recordIsFirstPlace);
    const bestFinish = annals
      .map(record => Number(record.finishNumber || numberFromCell(record.finish)))
      .filter(value => Number.isFinite(value) && value > 0)
      .sort((a, b) => a - b)[0];
    const bestNet = redRounds
      .map(round => netNumber(round))
      .filter(value => Number.isFinite(value) && value !== 0)
      .sort((a, b) => a - b)[0];
    const dglfcYears = Array.from(new Set(annals.map(record => record.year).filter(Boolean)));
    const debut = meta.debutYear || (dglfcYears.length ? dglfcYears.sort()[0] : '');
    const currentYear = String(new Date().getFullYear());
    const isRookie = debut && String(debut) === currentYear;
    const cardNo = meta.playerNumber || String(index + 1).padStart(2, '0');

    return {
      name,
      nickname: meta.nickname || '',
      playerTitle: meta.playerTitle || meta.nickname || '',
      fullName: meta.fullName || name,
      dob: meta.dob || '',
      debutYear: debut,
      height: meta.height || '',
      handedness: meta.handedness || '',
      hometown: meta.hometown || '',
      occupation: meta.occupation || '',
      favoriteCourse: meta.favoriteCourse || '',
      walkUpSong: meta.walkUpSong || '',
      bio: meta.bio || '',
      photoUrl: photoUrlFor(data, name),
      headshotUrl: headshotUrlFor(data, name),
      cardColor: meta.cardColor || '',
      cardNumber: cardNo,
      rank: standing.rankLabel || standing.rank || '',
      points: standing.points,
      odds: market.odds || '',
      rating: market.rating || '',
      bestFinish,
      dglfcAppearances: dglfcYears.length,
      redRoomCount: redRounds.length,
      bestNet,
      stateTrophyWins: wins.length,
      stateTrophyCount: trophies.length,
      isRookie
    };
  }).sort((a, b) => {
    const aRank = Number(String(a.rank).replace(/[^0-9]/g, '')) || 999;
    const bRank = Number(String(b.rank).replace(/[^0-9]/g, '')) || 999;
    return aRank - bRank || Number(b.points || 0) - Number(a.points || 0) || a.name.localeCompare(b.name);
  });
}

export {
  csvUrl,
  parseCSV,
  textCell,
  stripLabel,
  cleanEventNo,
  cleanDate,
  cleanCourse,
  cleanTees,
  cleanTime,
  yearFromSheetName,
  numberFromCell,
  cleanName,
  canonicalName,
  findHeaderIndex,
  findHeaderRow,
  headerIndex,
  parsePlayers,
  playerMeta,
  normalizeAssetUrl,
  photoUrlFor,
  headshotUrlFor,
  cardColorValue,
  cardHighlightColor,
  looksLikeDateText,
  looksLikeTimeText,
  parseCommittedPlayers,
  normalizeWinProbabilities,
  calculateFieldStrength,
  parseFutureEvents,
  fetchFutureEventsSheet,
  parseThisDayHistory,
  parseStateTrophies,
  formatRank,
  rankBadge,
  findPot,
  parseLooseDate,
  monthDayFromDate,
  decorateEvents,
  parseEventColumns,
  rowHasLabel,
  numericValuesFromRow,
  extractPlayerBlocks,
  findRowInBlock,
  findRowInBlockAny,
  lastNumericValue,
  parseCurrentStandings,
  strictNumberFromCell,
  findHistoricalStandingsColumns,
  isHistoricalPlayerName,
  nearestHistoricalPlayerName,
  findHistoricalBlockStandingsColumns,
  parseYearStandings,
  findSheetValueNearLabel,
  playerSlug,
  imageCandidates,
  PlayerPhoto,
  AssetPhoto,
  parseAnnalsRecords,
  buildAnnalsYearsFromRecords,
  buildAnnalsYears,
  buildHistoryMoments,
  fetchFirstAvailableSheet,
  normalizeHeader,
  parsePercentCell,
  parseSportsbook,
  formatOdds,
  formatPercent,
  sportsbookInsights,
  safeFetchText,
  safeParse,
  loadLiveData,
  money,
  medal,
  initials,
  netNumber,
  formatNet,
  tierForNet,
  ordinal,
  rankedRedRounds,
  formatCommitment,
  recordIsFirstPlace,
  buildPlayerProfiles,
  SHEET_ID,
  CURRENT_YEAR_SHEET,
  HISTORY_SHEETS,
  SPORTSBOOK_SHEETS,
  ANNALS_SHEETS,
  PLAYERS_SHEETS,
  STATE_TROPHY_SHEETS,
  THIS_DAY_SHEETS,
  FUTURE_EVENTS_SHEETS,
  HOSTESS_SOURCES,
  fallbackData
};

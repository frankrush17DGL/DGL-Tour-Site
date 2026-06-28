import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

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
    { event: 5, course: 'Troy Burne', date: '6/20', time: '8:00 AM', tees: '', status: 'Upcoming' }
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

function parseFutureEvents(text) {
  if (!text) return [];

  const rows = parseCSV(text).map(row => row || []);
  if (!rows.length) return [];

  const cleanLabel = value => String(value || '')
    .replace(/:/g, '')
    .replace(/[^a-z0-9]/gi, '')
    .trim()
    .toLowerCase();

  const findRow = labels => {
    const targets = labels.map(cleanLabel);
    const index = rows.findIndex(row => targets.includes(cleanLabel(row[0])));
    return index >= 0 ? index : -1;
  };

  const eventRow = findRow(['Event']);
  const dateRow = findRow(['Date']);
  const timeRow = findRow(['Time']);
  const weekRow = findRow(['Week']);
  let courseRow = findRow(['Course']);
  let notesRow = findRow(['Notes', 'Notes Number of Commits', 'Number of Commits', 'Commits']);

  // If Google exports the Course label strangely, infer it as the row between Date and Time.
  if (courseRow < 0 && dateRow >= 0 && timeRow >= 0 && timeRow > dateRow + 1) {
    courseRow = dateRow + 1;
  }

  // Last-resort course-row inference: find the row with multiple text course-like values.
  if (courseRow < 0) {
    let best = -1;
    let bestScore = 0;
    rows.slice(0, 12).forEach((row, rowIndex) => {
      const score = row.slice(1).filter(cell => {
        const value = textCell(cell);
        if (!value) return false;
        if (looksLikeDateText(value) || looksLikeTimeText(value)) return false;
        if (/^\d+$/.test(value)) return false;
        if (/\d{1,2}\/\d{1,2}/.test(value)) return false;
        return /[a-zA-Z]/.test(value);
      }).length;
      if (score > bestScore) {
        best = rowIndex;
        bestScore = score;
      }
    });
    if (bestScore >= 2) courseRow = best;
  }

  if (notesRow < 0 && timeRow >= 0) notesRow = timeRow + 1;

  const rWeek = weekRow >= 0 ? weekRow : 0;
  const rEvent = eventRow >= 0 ? eventRow : 1;
  const rDate = dateRow >= 0 ? dateRow : 2;
  const rCourse = courseRow >= 0 ? courseRow : 3;
  const rTime = timeRow >= 0 ? timeRow : 4;
  const rNotes = notesRow >= 0 ? notesRow : 5;

  const maxCol = Math.max(
    rows[rWeek]?.length || 0,
    rows[rEvent]?.length || 0,
    rows[rDate]?.length || 0,
    rows[rCourse]?.length || 0,
    rows[rTime]?.length || 0,
    rows[rNotes]?.length || 0,
    1
  );

  const events = [];

  for (let col = 1; col < maxCol; col++) {
    const week = textCell(rows[rWeek]?.[col]);
    const eventNo = textCell(rows[rEvent]?.[col]);
    const date = textCell(rows[rDate]?.[col]);
    const course = textCell(rows[rCourse]?.[col]);
    const time = textCell(rows[rTime]?.[col]);
    const notes = textCell(rows[rNotes]?.[col]);

    if (!week && !eventNo && !date && !course && !time && !notes) continue;

    const parsed = parseLooseDate(date, new Date().getFullYear());
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysAway = parsed ? Math.ceil((parsed.getTime() - today.getTime()) / 86400000) : null;

    events.push({
      event: eventNo || events.length + 1,
      date,
      course: course || 'Course TBD',
      time,
      tees: '',
      notes,
      week,
      status: 'Upcoming',
      daysAway,
      sortOrder: events.length
    });
  }

  return events;
}

async function fetchFutureEventsSheet() {
  const urls = [
    `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&sheet=${encodeURIComponent('Future Events')}&cacheBust=${Date.now()}`,
    csvUrl('Future Events')
  ];

  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (!response.ok) continue;
      const text = await response.text();
      if (text && text.trim()) return text;
    } catch (error) {
      console.warn('Unable to load Future Events sheet', error);
    }
  }

  return '';
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
    photoUrl: headerIndex(headers, ['Photo URL', 'Photo', 'Image URL', 'Trophy Photo', 'Trophy Photo URL'])
  };

  return rows.slice(trophyHeaderRow + 1).map(row => {
    const state = textCell(row[indexes.state]);
    const player = cleanName(row[indexes.player]);
    if (!state || !player) return null;
    return {
      state,
      trophy: indexes.trophy >= 0 ? textCell(row[indexes.trophy]) : state + ' Trophy',
      year: indexes.year >= 0 ? textCell(row[indexes.year]) : '',
      course: indexes.course >= 0 ? textCell(row[indexes.course]) : '',
      finish: indexes.finish >= 0 ? textCell(row[indexes.finish]) : '',
      player,
      notes: indexes.notes >= 0 ? textCell(row[indexes.notes]) : '',
      photoUrl: normalizeAssetUrl(indexes.photoUrl >= 0 ? row[indexes.photoUrl] : '')
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
  const playerNamePattern = /^[A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+|\s+T\.)$/;

  for (let row = 0; row < sheet.length; row++) {
    const rawName = textCell(sheet[row]?.[0]);
    if (!rawName || !playerNamePattern.test(rawName)) continue;

    const blockRows = sheet.slice(row, Math.min(row + 6, sheet.length));
    const hasGolfLabels = blockRows.some(blockRow =>
      rowHasLabel(blockRow, 'DGLFC Points') ||
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
function parseYearStandings(sheet) {
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

  if (totalCol === -1) return [];

  const blocks = extractPlayerBlocks(sheet);
  return blocks.map(block => {
    const pointsRow = findRowInBlock(block, 'DGLFC Points');
    const points = pointsRow.length ? numberFromCell(pointsRow[totalCol]) : 0;
    const rank = pointsRow.length && rankCol >= 0 ? numberFromCell(pointsRow[rankCol]) : 0;
    return {
      rank: rank || 999,
      name: block.name,
      points: Math.round(points * 100) / 100
    };
  }).filter(player => player.name && player.points > 0)
    .sort((a, b) => a.rank - b.rank || b.points - a.points || a.name.localeCompare(b.name));
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

    return {
      year,
      standings,
      events,
      champion: findSheetValueNearLabel(sheet, ['DGLFC Champion', 'Champion']) || 'Add champion to sheet',
      championWinnings: findSheetValueNearLabel(sheet, ['Won', 'Winnings', 'Payout']) || 'Add winnings to sheet',
      mostImproved: findSheetValueNearLabel(sheet, ['Most Improved', 'MIP']) || 'Add most improved to sheet',
      lowHandicap: findSheetValueNearLabel(sheet, ['Low Handicap', 'Low HC', 'Lowest Handicap']) || 'Add low handicap to sheet'
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
    valueRating: indexOf(['Value Rating', 'Value rating', 'Value'])
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
  if (indexes.valueRating === -1) indexes.valueRating = 12;

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
        valueRating: indexes.valueRating >= 0 ? numberFromCell(row[indexes.valueRating]) : 0,
        valueTier: valueTier(numberFromCell(row[indexes.valueRating]))
      };
    })
    .filter(Boolean)
    .filter(player => player.rating || player.winPercent || player.odds)
    .filter(player => !String(player.odds || '').includes('#DIV'))
    .sort((a, b) => b.rating - a.rating || a.player.localeCompare(b.player));
}

function valueTier(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return '—';
  if (number > 1.20) return '🔥 Strong Value';
  if (number >= 1.05) return '✅ Value';
  if (number >= 0.95) return '⚖️ Fair';
  return '❌ Overpriced';
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
    console.warn(`Unable to parse ${label}`, error);
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
    const parsed = parseFutureEvents(futureEventsText);
    return parsed.length ? parsed : fallbackData.events;
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
    players,
    stateTrophies,
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
function HostessImage({ className }) {
  const [sourceIndex, setSourceIndex] = useState(0);
  const src = HOSTESS_SOURCES[sourceIndex];

  if (!src) return null;

  return (
    <img
      src={src}
      alt="Red Room Hostess"
      className={className}
      onError={() => setSourceIndex(sourceIndex + 1)}
    />
  );
}

function EventCard({ event }) {
  const countdown = event.status === 'Upcoming'
    ? typeof event.daysAway === 'number'
      ? event.daysAway === 0
        ? 'Today'
        : event.daysAway > 0
          ? `${event.daysAway} days away`
          : 'Scheduled'
      : 'Scheduled'
    : 'Completed';

  return (
  <div className={'event ' + (event.status === 'Past' ? 'event-past' : 'event-upcoming')}>
    <span>{event.status === 'Past' ? 'Recent Result' : 'Upcoming'} • Event {event.event}</span>

    <strong>{event.course}</strong>

    <small>
      {event.date}
      {event.time ? ' • ' + event.time : ''}
    </small>

    {formatCommitment(event.notes) ? <small className="commit-count">{formatCommitment(event.notes)}</small> : null}

    <em>{countdown}</em>
  </div>
);
}

function ThisDayInDGLHistory({ moments = [], goAnnals }) {
  const today = new Date();
  const monthDay = today.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric'
  });

  const matches = moments.filter(moment => moment.date === monthDay);
  const moment = matches[0] || {
    date: monthDay,
    year: 'DGL Archives',
    type: '📜 Annals of History',
    title: 'No official moment recorded for today yet',
    body: 'The DGL archives are growing. Add a memory, round, or legendary moment for this date.'
  };

  return (
    <article className="card history-card">
      <p className="eyebrow">📜 This Day in DGL History</p>
      <h2>{moment.date}</h2>
      <span className="history-year">{moment.year}</span>
      <strong>{moment.type}</strong>
      <h3>{moment.title}</h3>
      {moment.photoUrl ? <img src={moment.photoUrl} alt="DGL history" className="history-photo" /> : null}
      <p>{moment.body}</p>
      <button onClick={goAnnals} className="gold-button">ENTER THE ANNALS</button>
    </article>
  );
}

function HomePage({ data, syncStatus, goRedRoom, goAnnals, goStateTrophies, goSportsbook, goPlayers }) {
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

      <section className="ticker">
        <div className="ticker-track">
          <span><strong>{syncStatus}</strong></span>
          <span>Last updated: {data.lastUpdated}</span>
          <span>Scott Wishart hit the Eagle Pot on 6/18/26 at Edinburgh — Hole #1, 492-yard Par 5. Paid $77.50.</span>
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
              <span><strong>Eagle Pot Last Hit</strong> Scott Wishart • Edinburgh Golf Course • Hole #1 • 492-yard Par 5 • 6/18/26 • Paid $77.50</span>
              <span><strong>2025 Eagle Pot</strong> Scott Wishart • Dutch 27 Red 9 • Hole #5 • 520-yard Par 5 • 9/26/25 • Paid $117.50</span>
            </div>
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

        <article className="card events-card" id="events">
          <p className="eyebrow">Tour Calendar</p>
          <h2>Event Schedule</h2>

          <h3>Upcoming</h3>
          <div className="event-list">
            {upcomingEvents.length ? upcomingEvents.map(event => (
              <EventCard event={event} key={'upcoming-' + event.event + event.course} />
            )) : (
              <p className="note">No future events currently entered.</p>
            )}
          </div>

          <p className="note event-note">
            Recent results will be added once winner and low-net fields are added to the Google Sheet.
          </p>
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

function RedRoomPage({ data, goHome }) {
  const rankedRounds = rankedRedRounds(data.redRounds);
  const featuredRedRound = rankedRounds[0] || {};
  const elite = rankedRounds.filter(round => round.netValue <= -6);
  const excellence = rankedRounds.filter(round => round.netValue <= -4 && round.netValue > -6);
  const gallery = rankedRounds;
  const [selectedRound, setSelectedRound] = useState(null);
  let lastTier = '';

  return (
    <section className="red-room-page">
      <div className="red-page-bg"></div>
      <div className="red-page-vignette"></div>
      <button onClick={goHome} className="back-button">← Back to Home</button>

      <div className="red-page-hero">
        <div className="red-page-copy">
          <p className="eyebrow">THE DGL HALL OF FAME</p>
          <h1>Red Room <span>Royalty</span></h1>
          <p>The greatest rounds in DGL history.</p>
          <p className="red-subline">Elite Table • Excellence Lounge • Members Gallery</p>
        </div>
        <HostessImage className="red-page-hostess" />
      </div>

      <div className="red-page-layout">
        <article className="royalty-card">
          <p className="eyebrow">👑 Red Room Royalty</p>
          <h2>{featuredRedRound.player}</h2>
          <strong>Net {featuredRedRound.displayNet}</strong>
          <span>{featuredRedRound.course}</span>
          <small>{featuredRedRound.date} • {featuredRedRound.score}</small>
        </article>

        <article className="tier-card">
          <p className="eyebrow">Red Room Tiers</p>
          <div className="tier-row"><strong>🔴 Elite Table</strong><span>Net -6.0 or better</span><em>{elite.length}</em></div>
          <div className="tier-row"><strong>🥃 Excellence Lounge</strong><span>Net -4.0 to -5.99</span><em>{excellence.length}</em></div>
          <div className="tier-row"><strong>📖 Members Gallery</strong><span>Every Red Round ever recorded</span><em>{gallery.length}</em></div>
        </article>

        <article className="red-full-table">
          <div className="panel-head">
            <div>
              <p className="eyebrow">All-Time Red Rounds</p>
              <strong>Live Hall of Fame</strong>
            </div>
            <span>{rankedRounds.length} entries</span>
          </div>

          <div className="red-table-full">
            {rankedRounds.map((round, index) => {
              const showDivider = round.tier !== lastTier;
              lastTier = round.tier;

              return (
                <React.Fragment key={round.player + round.course + round.date + index}>
                  {showDivider && <div className="tier-divider">{round.tier}</div>}
                  <button
                    type="button"
                    className={'red-row-full red-round-clickable ' + (round.photoUrl ? 'has-photo' : '')}
                    onClick={() => round.photoUrl ? setSelectedRound(round) : null}
                    aria-label={round.photoUrl ? `Open photo for ${round.player} ${round.displayNet}` : `${round.player} ${round.displayNet}`}
                  >
                    <span>{round.displayRankLabel}</span>
                    <strong>{round.player}</strong>
                    <small>{round.course}</small>
                    <small>{round.date}</small>
                    <em>{round.displayNet}</em>
                    <b>{round.tier}</b>
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        </article>
      </div>

      {selectedRound?.photoUrl ? (
        <div className="media-modal" role="dialog" aria-modal="true" onClick={() => setSelectedRound(null)}>
          <div className="media-modal-card" onClick={event => event.stopPropagation()}>
            <button type="button" className="media-modal-close" onClick={() => setSelectedRound(null)}>×</button>
            <img src={selectedRound.photoUrl} alt={`${selectedRound.player} red round`} />
            <div className="media-modal-caption">
              <strong>{selectedRound.player}</strong>
              <span>{selectedRound.course} • {selectedRound.date} • Net {selectedRound.displayNet}</span>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}



function SportsbookPage({ data, goHome }) {
  const board = data.sportsbook || [];
  const insights = sportsbookInsights(board);

  return (
    <section className="red-room-page sportsbook-page">
      <div className="red-page-bg"></div>
      <div className="red-page-vignette"></div>
      <button onClick={goHome} className="back-button">← Back to Home</button>

      <div className="red-page-hero annals-hero">
        <div className="red-page-copy">
          <p className="eyebrow">FOR ENTERTAINMENT PURPOSES ONLY</p>
          <h1>DGL <span>Sportsbook</span></h1>
          <p>Championship futures powered by the official DGL Sportsbook Engine.</p>
          <p className="red-subline">DGL Rating • Implied Probability • Vegas Odds • Movement • Value Tier</p>
        </div>
      </div>

      <div className="red-page-layout">
        <article className="royalty-card">
          <p className="eyebrow">Favorite</p>
          <h2>{insights.favorite.player || 'Model Loading'}</h2>
          <strong>{formatOdds(insights.favorite.odds)}</strong>
          <span>DGL Rating {insights.favorite.rating || '—'}</span>
          <small>{formatPercent(insights.favorite.winPercent)} implied probability</small>
        </article>

        <article className="tier-card">
          <p className="eyebrow">Market Watch</p>
          <div className="tier-row"><strong>💰 Best Value</strong><span>{insights.bestValue.player || '—'}</span><em>{formatOdds(insights.bestValue.odds)}</em></div>
          <div className="tier-row"><strong>🚀 Highest Ceiling</strong><span>{insights.highestCeiling.player || '—'}</span><em>{insights.highestCeiling.ceiling ? Number(insights.highestCeiling.ceiling).toFixed(1) : '—'}</em></div>
          <div className="tier-row"><strong>🎯 Low GHIN Threat</strong><span>{insights.ghinMonster.player || '—'}</span><em>{insights.ghinMonster.ghin ? Number(insights.ghinMonster.ghin).toFixed(1) : '—'}</em></div>
        </article>

        <article className="red-full-table sportsbook-board">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Championship Futures</p>
              <strong>Official DGL Odds Board</strong>
            </div>
            <span>{board.length} players</span>
          </div>

          <div className="red-table-full">
            {board.length ? board.map((player, index) => (
              <div className="red-row-full sportsbook-row" key={player.player}>
                <span>#{index + 1}</span>
                <strong>{player.player}</strong>
                <small>Rating {player.rating}</small>
                <small>{formatPercent(player.winPercent)}</small>
                <em>{formatOdds(player.odds)}</em>
                <b>{player.valueTier || player.movement || '—'}</b>
              </div>
            )) : (
              <p className="note">Sportsbook board not found yet. Make sure the Power Model tab has Player, DGL Rating, Win %, and Vegas Odds headers.</p>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}


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

function StateTrophiesPage({ data, goHome }) {
  const records = data.stateTrophies || [];
  const grouped = records.reduce((acc, record) => {
    const key = record.state || 'Unknown';
    acc[key] = acc[key] || [];
    acc[key].push(record);
    return acc;
  }, {});

  const stateKeys = Object.keys(grouped).filter(state => !/kentucky/i.test(state));
  const displayStateKeys = stateKeys.length ? stateKeys : ['Arizona', 'Florida'];
  const [selectedState, setSelectedState] = useState(displayStateKeys[0] || 'Florida');
  const selectedRecords = grouped[selectedState] || [];
  const title = selectedRecords[0]?.trophy || selectedState;
  const featuredPhoto = selectedRecords.find(record => record.photoUrl)?.photoUrl || defaultTrophyPhoto(selectedState, title);
  const years = Array.from(new Set(selectedRecords.map(r => r.year))).sort((a, b) => Number(a) - Number(b));
  const latestYear = years[years.length - 1];
  const latestRecords = selectedRecords.filter(r => r.year === latestYear).sort((a, b) => numberFromCell(a.finish) - numberFromCell(b.finish));
  const latestWinner = latestRecords[0];

  useEffect(() => {
    if (displayStateKeys.length && !displayStateKeys.includes(selectedState)) setSelectedState(displayStateKeys[0]);
  }, [displayStateKeys.join('|'), selectedState]);

  function defaultTrophyPhoto(state = '', trophy = '') {
    const key = `${state} ${trophy}`.toLowerCase();
    if (key.includes('arizona') || key.includes('desert')) return '/trophies/arizona-desert-classic.jpg';
    if (key.includes('florida') || key.includes('swamp') || key.includes('shootout')) return '/trophies/shootout-swamp-trophy.jpg';
    return '';
  }

  function trophyPhoto(state) {
    const records = grouped[state] || [];
    return records.find(record => record.photoUrl)?.photoUrl || defaultTrophyPhoto(state, records[0]?.trophy || '');
  }

  function championLine(record) {
    if (!record) return 'Champion TBD';
    return record.player;
  }

  return (
    <section className="red-room-page trophies-page trophy-rooms-page">
      <div className="red-page-bg"></div>
      <div className="red-page-vignette"></div>
      <button onClick={goHome} className="back-button">← Back to Home</button>

      <div className="red-page-hero annals-hero trophy-room-hero">
        <div className="red-page-copy">
          <p className="eyebrow">DGL TROPHY CASE</p>
          <h1>State <span>Trophies</span></h1>
          <p>Trophy rooms, champions, photos, and full state-event histories.</p>
          <p className="red-subline">No map gimmicks. Just hardware.</p>
        </div>
      </div>

      <div className="trophy-room-tabs">
        {displayStateKeys.map(state => {
          const photo = trophyPhoto(state);
          const stateRecords = grouped[state] || [];
          const stateYears = Array.from(new Set(stateRecords.map(r => r.year))).sort((a, b) => Number(a) - Number(b));
          const latest = stateRecords.filter(r => r.year === stateYears[stateYears.length - 1]).sort((a, b) => numberFromCell(a.finish) - numberFromCell(b.finish))[0];
          return (
            <button key={state} className={state === selectedState ? 'active' : ''} onClick={() => setSelectedState(state)}>
              {photo ? <AssetPhoto src={photo} alt={state + ' trophy'} className="trophy-tab-photo" fallback="🏆" /> : <span>🏆</span>}
              <b>{state}</b>
              <small>{latest ? `${stateYears[stateYears.length - 1]} Champ: ${latest.player}` : 'Trophy Room'}</small>
            </button>
          );
        })}
      </div>

      <div className="trophy-room-layout">
        <article className="trophy-hero-card">
          <div className="trophy-hero-photo-wrap">
            <AssetPhoto src={featuredPhoto} alt={title} className="trophy-hero-photo" fallback="🏆" />
          </div>
          <div className="trophy-hero-copy">
            <p className="eyebrow">{selectedState} Trophy Room</p>
            <h2>{title}</h2>
            <strong>{years.length ? `${years[0]}–${years[years.length - 1]}` : 'Trophy History'}</strong>
            <p>{selectedRecords.length} recorded result{selectedRecords.length === 1 ? '' : 's'}.</p>
            <div className="current-champ-box">
              <span>Latest Champion</span>
              <b>{championLine(latestWinner)}</b>
              <small>{latestWinner?.year || ''}{latestWinner?.course ? ` • ${latestWinner.course}` : ''}</small>
            </div>
          </div>
        </article>

        <article className="trophy-timeline-card">
          <p className="eyebrow">Trophy Timeline</p>
          <div className="trophy-timeline-list">
            {years.map(year => {
              const yearRecords = selectedRecords
                .filter(record => record.year === year)
                .sort((a, b) => numberFromCell(a.finish) - numberFromCell(b.finish));
              const winner = yearRecords[0];
              return (
                <div className="trophy-timeline-year" key={selectedState + year}>
                  <div className="timeline-year-head">
                    <span>{year}</span>
                    <strong>{winner?.course || title}</strong>
                  </div>
                  <div className="timeline-results">
                    {yearRecords.map(record => (
                      <p key={record.player + record.finish}>
                        <b>{String(record.finish).startsWith('T') ? record.finish : '#' + record.finish}</b>
                        <span>{record.player}</span>
                      </p>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      </div>
    </section>
  );
}


function PlayerTradingCard({ profile }) {
  const [flipped, setFlipped] = useState(false);

  function headlineBadge(item) {
    if (item.bestFinish === 1) return 'DGLFC CHAMPION';
    if (item.stateTrophyWins > 0) return 'TROPHY WINNER';
    if (item.redRoomCount > 0) return 'RED ROOM';
    if (item.isRookie) return 'ROOKIE CARD';
    if (item.rank) return `RANK ${item.rank}`;
    return 'DGL TOUR';
  }

  function achievementLine(item) {
    if (item.bestFinish === 1) return 'DGLFC Champion Series';
    if (item.stateTrophyWins > 0) return `${item.stateTrophyWins} State Trophy Win${item.stateTrophyWins === 1 ? '' : 's'}`;
    if (item.redRoomCount > 0) return `${item.redRoomCount} Red Room Round${item.redRoomCount === 1 ? '' : 's'}`;
    if (item.isRookie) return 'Official Rookie Card';
    return 'Official DGL Tour Card';
  }

  const cardColor = cardColorValue(profile.cardColor);
  const title = profile.playerTitle || profile.nickname || headlineBadge(profile);
  const cardNo = String(profile.cardNumber || '').padStart(2, '0');

  return (
    <button
      className={'dgl70-card ' + (flipped ? 'is-flipped' : '')}
      aria-label={`Flip ${profile.name} trading card`}
      onClick={() => setFlipped(!flipped)}
      style={{ '--card-color': cardColor }}
      type="button"
    >
      <div className="dgl70-inner">
        <div className="dgl70-face dgl70-front">
          <div className="dgl70-front-stock">
            <div className="dgl70-topline">
              <img src="/dgl-logo.jpeg" alt="DGL" />
              <span>DOJO GOLF LEAGUE</span>
              <b>2026</b>
            </div>

            <div className="dgl70-photo-window">
              <PlayerPhoto name={profile.name} src={profile.photoUrl || profile.headshotUrl} className="dgl70-action-photo" />
              <div className="dgl70-photo-grain"></div>
              <div className="dgl70-headshot-medal">
                <PlayerPhoto name={profile.name} src={profile.headshotUrl || profile.photoUrl} className="dgl70-headshot-photo" />
              </div>
            </div>

            <div className="dgl70-name-band">
              <div className="dgl70-name-copy">
                <h2>{profile.name}</h2>
                <p>★ “{title}” ★</p>
              </div>
              <div className="dgl70-rank-puck">#{profile.rank || cardNo}</div>
              <img src="/dgl-logo.jpeg" alt="DGL" className="dgl70-shield" />
            </div>

            <div className="dgl70-stat-strip">
              <div><span>Rank</span><b>{profile.rank || '—'}</b></div>
              <div><span>Points</span><b>{profile.points != null ? profile.points : '—'}</b></div>
              <div><span>State Trophies</span><b>{profile.stateTrophyWins || 0} 🏆</b></div>
            </div>
          </div>
        </div>

        <div className="dgl70-face dgl70-back">
          <div className="dgl70-back-stock">
            <div className="dgl70-back-header">
              <img src="/dgl-logo.jpeg" alt="DGL" />
              <div>
                <h3>{profile.fullName || profile.name}</h3>
                <p>{profile.hometown || 'Hometown TBD'} • {profile.handedness || 'Hand TBD'} • Card #{cardNo}</p>
              </div>
              <b>#{profile.rank || cardNo}</b>
            </div>

            <div className="dgl70-back-grid">
              <section>
                <h4>Career Statistics</h4>
                <table>
                  <tbody>
                    <tr><th>Current Rank</th><td>{profile.rank || '—'}</td></tr>
                    <tr><th>Current Points</th><td>{profile.points != null ? profile.points : '—'}</td></tr>
                    <tr><th>DGLFC Apps</th><td>{profile.dglfcAppearances || 0}</td></tr>
                    <tr><th>Best DGLFC</th><td>{profile.bestFinish ? ordinal(profile.bestFinish) : '—'}</td></tr>
                    <tr><th>Red Rounds</th><td>{profile.redRoomCount || 0}</td></tr>
                    <tr><th>Best Net</th><td>{profile.bestNet ? formatNet(profile.bestNet) : '—'}</td></tr>
                    <tr><th>State Trophies</th><td>{profile.stateTrophyWins || 0}</td></tr>
                    <tr><th>Odds</th><td>{profile.odds ? formatOdds(profile.odds) : '—'}</td></tr>
                  </tbody>
                </table>
              </section>

              <section>
                <h4>Player Facts</h4>
                <table>
                  <tbody>
                    <tr><th>DOB</th><td>{profile.dob || '—'}</td></tr>
                    <tr><th>Height</th><td>{profile.height || '—'}</td></tr>
                    <tr><th>Debut</th><td>{profile.debutYear || '—'}</td></tr>
                    <tr><th>Occupation</th><td>{profile.occupation || '—'}</td></tr>
                    <tr><th>Favorite Course</th><td>{profile.favoriteCourse || '—'}</td></tr>
                    <tr><th>Walk-Up Song</th><td>{profile.walkUpSong || '—'}</td></tr>
                  </tbody>
                </table>
              </section>
            </div>

            <div className="dgl70-bio-box">
              <b>Bio</b>
              <p>{profile.bio || 'Bio pending. Add notes in the Players tab to complete the back of this card.'}</p>
            </div>

            <div className="dgl70-back-footer">
              <span>DGL Debut: {profile.debutYear || '—'}</span>
              <span>{achievementLine(profile)}</span>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}


function DebugDataPanel({ data }) {
  const enabled = typeof window !== 'undefined' && window.location.search.includes('debug=1');
  if (!enabled) return null;
  const players = data.debug?.playersParsed || [];
  const trophies = data.debug?.stateTrophiesParsed || [];
  return (
    <article className="debug-data-panel">
      <strong>DGL Debug: parsed live image data</strong>
      <p>Players parsed: {(data.players || []).length}</p>
      <pre>{JSON.stringify(players.map(p => ({ name: p.name, photoUrl: p.photoUrl, headshotUrl: p.headshotUrl, cardColor: p.cardColor })), null, 2)}</pre>
      <p>Trophies parsed: {(data.stateTrophies || []).length}</p>
      <pre>{JSON.stringify(trophies.map(t => ({ state: t.state, trophy: t.trophy, player: t.player, photoUrl: t.photoUrl })), null, 2)}</pre>
    </article>
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

      <DebugDataPanel data={data} />

      <div className="dgl70-grid">
        {profiles.length ? profiles.map(profile => (
          <PlayerTradingCard profile={profile} key={profile.name} />
        )) : (
          <article className="red-full-table"><p className="note">No player profiles found. Add players to the Players tab.</p></article>
        )}
      </div>
    </section>
  );
}


function App() {
  const [data, setData] = useState(fallbackData);
  const [syncStatus, setSyncStatus] = useState('Loading live Google Sheet…');
  const [page, setPage] = useState(() => {
    const hash = window.location.hash;
    if (hash === '#red-room') return 'red-room';
    if (hash === '#annals') return 'annals';
    if (hash === '#state-trophies') return 'state-trophies';
    if (hash === '#sportsbook') return 'sportsbook';
    if (hash === '#players') return 'players';
    return 'home';
  });

  useEffect(() => {
    const onHash = () => {
      const hash = window.location.hash;
      if (hash === '#red-room') setPage('red-room');
      else if (hash === '#annals') setPage('annals');
      else if (hash === '#state-trophies') setPage('state-trophies');
      else if (hash === '#sportsbook') setPage('sportsbook');
      else if (hash === '#players') setPage('players');
      else setPage('home');
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    loadLiveData()
      .then(liveData => {
        setData(liveData);
        setSyncStatus('Live from Google Sheets');
      })
      .catch(error => {
        console.error('DGL LIVE DATA FAILED', error);
        setSyncStatus('LIVE DATA ERROR: ' + (error?.message || String(error)));
        window.DGL_LAST_ERROR = error;
      });
  }, []);

  const goRedRoom = () => {
    window.location.hash = 'red-room';
    setPage('red-room');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goAnnals = () => {
    window.location.hash = 'annals';
    setPage('annals');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goStateTrophies = () => {
    window.location.hash = 'state-trophies';
    setPage('state-trophies');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goSportsbook = () => {
    window.location.hash = 'sportsbook';
    setPage('sportsbook');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goPlayers = () => {
    window.location.hash = 'players';
    setPage('players');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goHome = () => {
    window.location.hash = '';
    setPage('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <main className="page">
      {page === 'home' && (
        <>
          <nav className="nav">
            <span>DGL TOUR</span>
            <div>
              <a href="#standings">Standings</a>
              <a href="#events">Events</a>
              <button onClick={goRedRoom}>Red Room</button>
              <button onClick={goAnnals}>Annals</button>
              <button onClick={goStateTrophies}>Trophies</button>
              <button onClick={goSportsbook}>Sportsbook</button>
              <button onClick={goPlayers}>Players</button>
            </div>
          </nav>
          <HomePage data={data} syncStatus={syncStatus} goRedRoom={goRedRoom} goAnnals={goAnnals} goStateTrophies={goStateTrophies} goSportsbook={goSportsbook} goPlayers={goPlayers} />
        </>
      )}

      {page === 'red-room' && <RedRoomPage data={data} goHome={goHome} />}
      {page === 'annals' && <AnnalsPage data={data} goHome={goHome} />}
      {page === 'state-trophies' && <StateTrophiesPage data={data} goHome={goHome} />}
      {page === 'sportsbook' && <SportsbookPage data={data} goHome={goHome} />}
      {page === 'players' && <PlayersPage data={data} goHome={goHome} />}
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);

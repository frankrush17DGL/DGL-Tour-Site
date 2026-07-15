import React, { useState } from 'react';
import { csvUrl, parseCSV, textCell, stripLabel, cleanEventNo, cleanDate, cleanCourse, cleanTees, cleanTime, yearFromSheetName, numberFromCell, cleanName, canonicalName, findHeaderIndex, findHeaderRow, headerIndex, parsePlayers, playerMeta, normalizeAssetUrl, photoUrlFor, headshotUrlFor, cardColorValue, cardHighlightColor, looksLikeDateText, looksLikeTimeText, parseFutureEvents, fetchFutureEventsSheet, parseThisDayHistory, parseStateTrophies, formatRank, rankBadge, findPot, parseLooseDate, monthDayFromDate, decorateEvents, parseEventColumns, rowHasLabel, numericValuesFromRow, extractPlayerBlocks, findRowInBlock, findRowInBlockAny, lastNumericValue, parseCurrentStandings, strictNumberFromCell, findHistoricalStandingsColumns, isHistoricalPlayerName, nearestHistoricalPlayerName, parseYearStandings, findSheetValueNearLabel, playerSlug, imageCandidates, PlayerPhoto, AssetPhoto, parseAnnalsRecords, buildAnnalsYearsFromRecords, buildAnnalsYears, buildHistoryMoments, fetchFirstAvailableSheet, normalizeHeader, parsePercentCell, parseSportsbook, formatOdds, formatPercent, sportsbookInsights, safeFetchText, safeParse, loadLiveData, money, medal, initials, netNumber, formatNet, tierForNet, ordinal, rankedRedRounds, formatCommitment, recordIsFirstPlace, buildPlayerProfiles, SHEET_ID, CURRENT_YEAR_SHEET, HISTORY_SHEETS, SPORTSBOOK_SHEETS, ANNALS_SHEETS, PLAYERS_SHEETS, STATE_TROPHY_SHEETS, THIS_DAY_SHEETS, FUTURE_EVENTS_SHEETS, HOSTESS_SOURCES, fallbackData } from './core.jsx';


function trophyFinishLabel(record, yearRecords = []) {
  const raw = textCell(record?.finish).toUpperCase().replace(/\s+/g, '');

  if (/^T\d+$/.test(raw)) return raw;
  if (/^#?\d+$/.test(raw)) return `#${raw.replace('#', '')}`;

  // Older trophy rows sometimes contain only “#”. When multiple players are
  // recorded for that year, they are tied champions; a solo row is #1.
  if (!raw || raw === '#' || raw === 'T' || raw === '—' || raw === '-') {
    return yearRecords.length > 1 ? 'T1' : '#1';
  }

  return raw;
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
  const [lightboxPhoto, setLightboxPhoto] = useState('');
  const selectedRecords = grouped[selectedState] || [];
  const title = selectedRecords[0]?.trophy || selectedState;
  const featuredPhoto = selectedRecords.find(record => record.photoTrophy)?.photoTrophy || selectedRecords.find(record => record.photoUrl)?.photoUrl || defaultTrophyPhoto(selectedState, title);
  const galleryPhotos = Array.from(new Set(selectedRecords.flatMap(record => record.galleryPhotos || []).filter(Boolean)));
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
    return records.find(record => record.photoTrophy)?.photoTrophy || records.find(record => record.photoUrl)?.photoUrl || defaultTrophyPhoto(state, records[0]?.trophy || '');
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
                        <b>{trophyFinishLabel(record, yearRecords)}</b>
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

      {galleryPhotos.length ? (
        <article className="trophy-gallery-card trophy-gallery-v106">
          <div className="section-head">
            <div>
              <p className="eyebrow">Photo Gallery</p>
              <h2>{selectedState} Memories</h2>
            </div>
            <span>{galleryPhotos.length} photo{galleryPhotos.length === 1 ? '' : 's'}</span>
          </div>
          <div className="trophy-photo-gallery trophy-photo-grid-v106">
            {galleryPhotos.map((photo, index) => (
              <button
                type="button"
                className="trophy-photo-button-v106"
                key={photo + index}
                onClick={() => setLightboxPhoto(photo)}
                aria-label={`Open ${selectedState} trophy photo ${index + 1}`}
              >
                <AssetPhoto
                  src={photo}
                  alt={`${selectedState} trophy gallery ${index + 1}`}
                  className="trophy-gallery-photo trophy-gallery-photo-v106"
                  fallback="🏆"
                />
                <span>View Photo</span>
              </button>
            ))}
          </div>
        </article>
      ) : null}

      {lightboxPhoto ? (
        <div className="trophy-lightbox-v106" role="dialog" aria-modal="true" onClick={() => setLightboxPhoto('')}>
          <button type="button" className="trophy-lightbox-close-v106" onClick={() => setLightboxPhoto('')} aria-label="Close photo">×</button>
          <img src={lightboxPhoto} alt={`${selectedState} trophy enlarged`} onClick={event => event.stopPropagation()} />
        </div>
      ) : null}

      <style>{`
        .trophy-gallery-v106{margin-top:20px;padding:20px;border:1px solid rgba(226,184,73,.28);border-radius:22px;background:rgba(10,7,5,.78);overflow:hidden}
        .trophy-photo-grid-v106{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;align-items:stretch}
        .trophy-photo-button-v106{position:relative;display:block;width:100%;aspect-ratio:4/3;padding:0;border:1px solid rgba(245,220,160,.24);border-radius:16px;overflow:hidden;background:#120c08;cursor:pointer;box-shadow:0 10px 28px rgba(0,0,0,.28)}
        .trophy-gallery-photo-v106{display:block!important;width:100%!important;height:100%!important;min-height:0!important;max-height:none!important;object-fit:cover!important;object-position:center!important;transition:transform .25s ease,filter .25s ease}
        .trophy-photo-button-v106 span{position:absolute;left:10px;bottom:9px;padding:5px 9px;border-radius:999px;background:rgba(0,0,0,.72);color:#fff;font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;opacity:0;transform:translateY(4px);transition:.2s ease}
        .trophy-photo-button-v106:hover .trophy-gallery-photo-v106,.trophy-photo-button-v106:focus-visible .trophy-gallery-photo-v106{transform:scale(1.045);filter:brightness(.88)}
        .trophy-photo-button-v106:hover span,.trophy-photo-button-v106:focus-visible span{opacity:1;transform:none}
        .trophy-lightbox-v106{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;padding:24px;background:rgba(0,0,0,.92);backdrop-filter:blur(8px)}
        .trophy-lightbox-v106 img{display:block;max-width:min(1100px,94vw);max-height:88vh;object-fit:contain;border-radius:18px;border:2px solid rgba(244,212,126,.5);box-shadow:0 30px 90px rgba(0,0,0,.75)}
        .trophy-lightbox-close-v106{position:fixed;right:18px;top:18px;width:46px;height:46px;border-radius:50%;border:1px solid rgba(255,255,255,.35);background:rgba(20,14,10,.88);color:#fff;font-size:30px;line-height:1;cursor:pointer}
        @media(max-width:760px){.trophy-photo-grid-v106{grid-template-columns:repeat(2,minmax(0,1fr))}.trophy-gallery-v106{padding:14px}.trophy-photo-button-v106 span{opacity:1;transform:none}}
      `}</style>
    </section>
  );
}



export default StateTrophiesPage;

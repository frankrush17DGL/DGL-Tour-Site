import React, { useState } from 'react';

const miniGemTeeTimes = [
  ['9:00', 'Nick Mazzoni', 'Josie Mazzoni', 'Arti Mazzoni'],
  ['9:07', 'Ben Magnuson', 'Jake Cabak', 'Hannah Cabak', 'Emmett Cabak'],
  ['9:14', 'Nic Wendel', 'Ella Wendel', 'William Baartman'],
  ['9:21', 'Alex Rogers', 'Kala Pedersen', 'Jeff Rogers', 'Breanna Evans'],
  ['9:28', 'John Leitch', 'Callan Young', 'Heather Young', 'Jeff Young'],
  ['9:35', 'Brian Nevala', 'Megan Nevala', 'Lydia Nevala', 'Nolan Nevala'],
  ['9:42', 'Frank Rush', 'Natalie Rush', 'Fiia Rush', 'Pam Wendel']
];

const executiveTeeTimes = [
  ['10:04', 'Scott Wishart', 'Grant Wishart', 'Wes Wishart', 'Chris Wishart'],
  ['10:12', 'Ben Magnuson', 'Jake Cabak', 'Hannah Cabak', 'Emmett Cabak'],
  ['10:20', 'Nic Wendel', 'Ella Wendel', 'William Baartman'],
  ['10:28', 'Alex Rogers', 'Kala Pedersen', 'Jeff Rogers', 'Breanna Evans'],
  ['10:36', 'John Leitch', 'Callan Young', 'Heather Young', 'Jeff Young'],
  ['10:44', 'Brian Nevala', 'Megan Nevala', 'Lydia Nevala', 'Nolan Nevala'],
  ['10:52', 'Frank Rush', 'Natalie Rush', 'Fiia Rush', 'Pam Wendel']
];

const rules = [
  ['Format', 'All players tee off. Select the best shot and everyone plays from that spot. Continue until holed; record one team score per hole.'],
  ['Tees', 'Men: white tees. Women: red tees. Children: wherever appropriate.'],
  ['Selected Ball', 'Play from as close as reasonably possible to the selected spot, no closer to the hole and without materially improving the lie.'],
  ['OB / Lost Ball', 'Choose another teammate’s shot. If the team elects to use the lost/OB shot, the normal penalty applies.'],
  ['Mulligans', 'Under age 13 only. A parent may allow one for a whiff, duff or similar shot. No mulligans on the putting green.'],
  ['Tiebreaker', 'Start with the #1 handicap hole; if still tied, continue through the handicap-ranked holes until the tie is broken.']
];

const contests = [
  ['Most Holes-in-One', 'Mini Gem', 'Count every ace.'],
  ["Men's Long Drive", 'Hole 14', 'White tees.'],
  ["Women's Long Drive", 'Hole 14', 'Red tees.'],
  ['Closest to the Pin', 'Hole 18', 'Closest ball wins.'],
  ['Longest Putt', 'Every Hole', 'Measure made putts; each team submits its longest.']
];

// Event photos belong directly in public/ (filenames are case-sensitive).
const eventPhotos = [
  '0825', '0826', '0827', '0831', '0840', '0843', '0844',
  '0845', '0846', '0847', '0850', '0856', '0860'
].map(number => ({
  src: `/IMG_${number}.jpeg`,
  label: number === '0847' ? 'Team Wishart — 2026 Champions' : `2026 Family Scramble — photo ${number}`
}));
const winnersPhoto = eventPhotos.find(photo => photo.src.endsWith('IMG_0847.jpeg'));

const scrambleHistory = [
  {
    "year": "2025",
    "date": "September 21, 2025",
    "course": "Highland 9 Golf Course",
    "winner": "Team Sheehy",
    "score": "−1",
    "teams": [
      [
        "Max Olson, Erin Olson, Mark Revord, Kathy Revord & Eva Olson",
        "+1"
      ],
      [
        "Brian Nevala, Lydia Nevala, Nolan Nolan & Dave Chapdelaine",
        "+2"
      ],
      [
        "John Leitch, Callan Young, Heather Young & Jeff Young",
        "+2"
      ],
      [
        "Francis Rush, Natalie Rush & Pam Wendel",
        "+4"
      ],
      [
        "Scott Wishart",
        "+5"
      ],
      [
        "Alex Rogers & Kala Pederson",
        "+11"
      ],
      [
        "Keegan Anderson",
        "+16"
      ]
    ],
    "contests": [
      [
        "Long Putt",
        "Brian",
        "PGA tour hat"
      ],
      [
        "Closest to the Pin",
        "Mark Revord",
        "$50 WTP"
      ],
      [
        "Closest to the Pin",
        "Keegan",
        "Callaway hat"
      ],
      [
        "Long Drive — Women",
        "Kala",
        "2 wild tix"
      ],
      [
        "Long Drive — Men",
        "Keegan",
        "4 wild tix"
      ],
      [
        "Cutest Outfit",
        "Eva",
        "WTP gift card and shirt"
      ],
      [
        "Cutest Outfit",
        "Fiia",
        "Office putter"
      ]
    ]
  },
  {
    "year": "2024",
    "date": "September 8, 2024",
    "course": "Highland 9 Golf Course",
    "winner": "Team Leitch",
    "score": "−4",
    "teams": [
      [
        "Max, Erin & Eva",
        "+3"
      ],
      [
        "Frank & Natalie",
        "+4"
      ],
      [
        "Nic, Ella, Dave & William",
        "+7"
      ],
      [
        "Brian, Lydia & Nolan",
        null
      ],
      [
        "Alex R & Kala",
        null
      ],
      [
        "Jake P & Jon P",
        null
      ]
    ],
    "contests": [
      [
        "Long Putt",
        "Callan",
        "Two upper level wild tix"
      ],
      [
        "Closest to the Pin",
        "Jeff Young",
        "Top golf gift card"
      ],
      [
        "Closest to the Pin",
        "Max",
        "Baskin Robbin’s gift card"
      ],
      [
        "Long Drive",
        "Max",
        "Two lower level wild tix"
      ]
    ]
  },
  {
    "year": "2023",
    "date": "October 8, 2023",
    "course": "Columbia Golf Course",
    "winner": "Team Leitch",
    "score": null,
    "teams": [
      [
        "Nic, Ella, William & Dave",
        null
      ],
      [
        "Max & Erin",
        null
      ],
      [
        "Frank & Natalie",
        null
      ],
      [
        "Brian, Megan, Lydia & Nolan",
        null
      ]
    ],
    "contests": []
  }
];

function Photo({ photo, featured = false }) {
  const [failed, setFailed] = useState(false);
  return failed ? <div className="fs-photo-missing">{photo.label}<small>Photo unavailable</small></div> : (
    <a className={featured ? 'fs-feature-photo' : 'fs-photo'} href={photo.src} target="_blank" rel="noopener noreferrer" aria-label={`${photo.label} — open full-size photo in a new tab`}>
      <img src={photo.src} alt={photo.label} loading={featured ? 'eager' : 'lazy'} onError={() => setFailed(true)} />
    </a>
  );
}

function FamilyScramblePage({ goHome }) {
  const [allPhotos, setAllPhotos] = useState(false);
  return (
    <main className="fs-page">
      <button className="fs-back" onClick={goHome}>← Back to Home</button>
      <header className="fs-header">
        <p className="fs-kicker">Dojo Golf League • Est. 2023</p>
        <h1>Family <span>Scramble</span></h1>
        <p className="fs-tagline">Family. Friends. Golf.</p>
      </header>

      <section className="fs-feature" aria-labelledby="fs-winner">
        <Photo photo={winnersPhoto} featured />
        <div className="fs-feature-copy">
          <p className="fs-kicker">2026 Champions</p>
          <h2 id="fs-winner">Team Wishart</h2>
          <p className="fs-roster">Scott Wishart · Grant Wishart<br />Wes Wishart · Chris Wishart</p>
          <div className="fs-event-meta"><strong>4th Annual Family Scramble</strong><span>September 13, 2026</span><span>Gem Lake Hills</span></div>
          <a className="fs-button" href="#fs-photos">Photos from the day ↓</a>
        </div>
      </section>

      <section className="fs-section" id="fs-photos" aria-labelledby="fs-photos-title">
        <div className="fs-heading"><div><p className="fs-kicker">September 2026</p><h2 id="fs-photos-title">The day in photos</h2></div><span className="fs-count">13 photos</span></div>
        <div className="fs-gallery" id="fs-gallery">{(allPhotos ? eventPhotos : eventPhotos.slice(0,6)).map(photo => <Photo key={photo.src} photo={photo} />)}</div>
        <button className="fs-button fs-gallery-toggle" aria-expanded={allPhotos} aria-controls="fs-gallery" onClick={() => setAllPhotos(!allPhotos)}>{allPhotos ? 'Show fewer photos' : 'View all 13 photos'}</button>
      </section>

      <section className="fs-section" aria-labelledby="fs-history-title">
        <div className="fs-heading"><div><p className="fs-kicker">Since 2023</p><h2 id="fs-history-title">Through the years</h2></div></div>
        <p className="fs-muted">Open a year for team scores, contest winners and prizes.</p>
        {scrambleHistory.map(event => (
          <details className="fs-year" key={event.year}>
            <summary><span className="fs-year-number">{event.year}</span><span className="fs-year-info"><strong>{event.winner}{event.score && ` (${event.score})`}</strong><small>{event.course}</small></span><span className="fs-expand" aria-hidden="true">+</span></summary>
            <div className="fs-year-body">
              <p className="fs-muted">{event.date} • {event.course}</p>
              <h3>Team results</h3>
              <div className="fs-result fs-winning-result"><span>{event.winner}<small>Champions</small></span><strong>{event.score || '—'}</strong></div>
              {event.teams.map(([players,score]) => <div className="fs-result" key={players}><span>{players}</span><strong>{score || '—'}</strong></div>)}
              {(!event.score || event.teams.some(([,score]) => !score)) && <p className="fs-footnote">— Score not recorded.</p>}
              {event.contests.length > 0 && <><h3>Contest winners & prizes</h3><div className="fs-awards">{event.contests.map(([contest,winner,prize],i) => <div className="fs-award" key={i}><span>{contest}</span><strong>{winner}</strong><p>{prize}</p></div>)}</div></>}
            </div>
          </details>
        ))}
      </section>

      <section className="fs-section fs-archive" aria-label="2026 event details">
        <details className="fs-year">
          <summary><span className="fs-year-info"><strong>2026 event details</strong><small>Tee times, rules, contests & schedule</small></span><span className="fs-expand" aria-hidden="true">+</span></summary>
          <div className="fs-year-body">
            <h3>Original tee sheets</h3>
            <div className="fs-tee-grid">{[['Mini Gem',miniGemTeeTimes],['Executive Course',executiveTeeTimes]].map(([title,rows]) => <div key={title}><h4>{title}</h4>{rows.map(([time,...players]) => <div className="fs-tee" key={time}><strong>{time} a.m.</strong><span>{players.join(' · ')}</span></div>)}</div>)}</div>
            <h3>Scramble rules</h3>
            <dl className="fs-rules">{rules.map(([title,copy]) => <div key={title}><dt>{title}</dt><dd>{copy}</dd></div>)}</dl>
            <h3>On-course contests</h3>
            {contests.map(([title,location,copy]) => <div className="fs-result" key={title}><span>{title}<small>{copy}</small></span><strong>{location}</strong></div>)}
            <h3>Day schedule</h3>
            <p className="fs-muted">Mini Gem at 9:00 a.m. • Executive Course at 10:04 a.m.</p>
            <p className="fs-muted">Post-round lunch, beverages and awards on the Gem Lake Hills Deck.</p>
            <p className="fs-muted">3:30 p.m. • Vikings vs. Packers at the Rush household, 3408 36th Ave NE, Saint Anthony Village, MN 55418.</p>
            <p className="fs-muted">Dinner off the grill • Bouncy house (weather permitting) • Billiards + games</p>
          </div>
        </details>
      </section>
      <footer className="fs-footer">DOJO GOLF LEAGUE <span>Family. Friends. Golf.</span></footer>
      <style>{`
        .fs-page{max-width:1040px;width:100%;box-sizing:border-box;margin:0 auto;padding:24px 24px 40px;color:#f6f1e7;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;container-type:inline-size}
        .fs-page *{box-sizing:border-box}.fs-page button,.fs-page a{-webkit-tap-highlight-color:transparent}.fs-page button{font:inherit;cursor:pointer}
        .fs-back{border:0;background:transparent;color:#d6cbb8;padding:10px 0;font-size:14px!important}.fs-header{padding:24px 0 30px}.fs-kicker{color:#e4bc58;font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;margin:0 0 10px;line-height:1.5}
        .fs-header h1{font-size:clamp(36px,6vw,66px);line-height:1.02;letter-spacing:-.055em;margin:0;font-weight:850}.fs-header h1 span{color:#e4bc58}.fs-tagline{margin:14px 0 0;color:#bfb4a3;font-size:16px}
        .fs-feature{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);overflow:hidden;border:1px solid #493921;border-radius:20px;background:#171310}
        .fs-feature-photo{display:block;background:#0e0c0a}.fs-feature-photo img{display:block;width:100%;height:460px;object-fit:contain}.fs-feature-copy{padding:36px;align-self:center}.fs-feature h2{font-size:clamp(30px,4vw,46px);letter-spacing:-.045em;line-height:1.1;margin:0 0 18px}.fs-roster{color:#d6cbb8;line-height:1.8;font-size:15px;margin:0 0 24px}.fs-event-meta{display:grid;gap:5px;color:#bfb4a3;font-size:14px;line-height:1.5;margin-bottom:26px}.fs-event-meta strong{color:#f6f1e7;font-weight:600}
        .fs-button{display:inline-flex;justify-content:center;align-items:center;min-height:44px;padding:11px 18px;border:1px solid #a8863e;border-radius:8px;background:#e9c367;color:#19140c;text-decoration:none;font-size:13px;font-weight:800}.fs-section{margin-top:40px;scroll-margin-top:24px}.fs-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px}.fs-heading h2{font-size:28px;line-height:1.2;letter-spacing:-.035em;margin:0}.fs-heading .fs-kicker{margin-bottom:6px}.fs-count{color:#bfb4a3;font-size:12px;white-space:nowrap}
        .fs-gallery{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.fs-photo{display:block;overflow:hidden;border-radius:10px;background:#171310}.fs-photo img{display:block;width:100%;aspect-ratio:4/3;object-fit:cover;transition:transform .2s}.fs-photo:hover img{transform:scale(1.035)}.fs-gallery-toggle{display:flex;margin:18px auto 0;background:transparent;color:#e9c367}.fs-photo-missing{padding:24px;border:1px solid #493921;border-radius:10px;color:#d6cbb8;font-size:14px}.fs-photo-missing small{display:block;margin-top:8px}
        .fs-muted{color:#bfb4a3;font-size:14px;line-height:1.7;margin:0 0 18px}.fs-year{border:1px solid #3e3224;border-radius:12px;background:#15120f;margin-bottom:10px;overflow:hidden}.fs-year summary{list-style:none;display:flex;align-items:center;gap:22px;padding:22px;cursor:pointer;min-height:82px}.fs-year summary::-webkit-details-marker{display:none}.fs-year-number{color:#e9c367;font-size:28px;font-weight:800;letter-spacing:-.04em}.fs-year-info{display:grid;gap:6px;flex:1;min-width:0}.fs-year-info strong{font-size:17px}.fs-year-info small{color:#bfb4a3;font-size:13px;line-height:1.4}.fs-expand{font-size:26px;color:#e9c367;font-weight:400}.fs-year[open]>summary{border-bottom:1px solid #3e3224}.fs-year[open]>summary .fs-expand{transform:rotate(45deg)}.fs-year-body{padding:24px}.fs-year-body h3{font-size:18px;margin:28px 0 12px}.fs-year-body h3:first-child{margin-top:0}.fs-result{display:flex;justify-content:space-between;align-items:center;gap:20px;padding:14px 0;border-bottom:1px solid #30281e;font-size:14px;line-height:1.65}.fs-result>span{min-width:0}.fs-result strong{color:#e9c367;flex-shrink:0;font-variant-numeric:tabular-nums}.fs-result small{display:block;font-size:12px;color:#bfb4a3}.fs-winning-result{background:#241e12;border-radius:8px;padding:14px}.fs-footnote{font-size:12px;color:#bfb4a3}
        .fs-awards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.fs-award{padding:16px;border-radius:8px;background:#201a13}.fs-award>span{display:block;color:#d3b875;font-size:12px;margin-bottom:7px}.fs-award strong{font-size:16px}.fs-award p{margin:6px 0 0;font-size:13px;color:#bfb4a3;line-height:1.5}.fs-tee-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px}.fs-tee-grid h4{color:#e9c367;font-size:16px}.fs-tee{display:grid;grid-template-columns:88px 1fr;gap:10px;padding:12px 0;border-bottom:1px solid #30281e;font-size:13px;line-height:1.6}.fs-tee strong{color:#e9c367}.fs-rules{margin:0}.fs-rules>div{padding:12px 0;border-bottom:1px solid #30281e}.fs-rules dt{font-size:14px;font-weight:700;color:#e9c367}.fs-rules dd{margin:5px 0 0;font-size:14px;color:#bfb4a3;line-height:1.7}.fs-archive{margin-top:28px}.fs-footer{display:flex;justify-content:space-between;gap:12px;margin-top:32px;padding-top:22px;border-top:1px solid #3e3224;color:#c8ae75;font-size:11px;font-weight:750;letter-spacing:.1em}.fs-footer span{font-weight:400;letter-spacing:0;color:#bfb4a3}
        .fs-page :is(a,button,summary):focus-visible{outline:3px solid #e9c367;outline-offset:4px}
        @media(max-width:700px){.fs-page{padding:16px}.fs-feature{grid-template-columns:1fr}.fs-feature-photo img{height:auto;max-height:430px}.fs-feature-copy{padding:24px}.fs-gallery{grid-template-columns:repeat(2,minmax(0,1fr))}.fs-header{padding:18px 0 24px}.fs-section{margin-top:30px}.fs-awards,.fs-tee-grid{grid-template-columns:1fr}.fs-year summary{padding:18px;gap:16px}.fs-year-body{padding:18px}.fs-heading h2{font-size:25px}.fs-year-number{font-size:26px}.fs-footer{flex-wrap:wrap}}
        @container(max-width:600px){.fs-feature{grid-template-columns:1fr}.fs-feature-photo img{height:auto;max-height:430px}.fs-gallery{grid-template-columns:repeat(2,minmax(0,1fr))}.fs-awards,.fs-tee-grid{grid-template-columns:1fr}}
        @media(prefers-reduced-motion:reduce){.fs-photo img{transition:none}}
      `}</style>
    </main>
  );
}

export default FamilyScramblePage;

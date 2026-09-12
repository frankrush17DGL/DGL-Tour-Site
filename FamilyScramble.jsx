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

const champions = [
  { year: '2025', champion: "Pat Sheehy’s Squad", photo: '/family-scramble/2025.jpg' },
  { year: '2024', champion: "John Leitch’s Squad", photo: '/family-scramble/2024.jpg' },
  { year: '2023', champion: "John Leitch’s Squad", photo: '/family-scramble/2023.jpg' }
];

function TeeSheet({ title, subtitle, rows, red }) {
  return (
    <section className={'dfs-teesheet ' + (red ? 'dfs-teesheet-red' : '')}>
      <div className="dfs-teesheet-head">
        <div>
          <strong>{title}</strong>
          <span>{subtitle}</span>
        </div>
      </div>
      <div className="dfs-teesheet-body">
        {rows.map(([time, ...players]) => (
          <div className="dfs-tee-row" key={`${title}-${time}`}>
            <b>{time}</b>
            <span>{players.join(' • ')}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function ChampionCard({ item }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="dfs-champion-card">
      {!failed ? (
        <img src={item.photo} alt={`${item.year} Dojo Family Scramble`} onError={() => setFailed(true)} />
      ) : (
        <div className="dfs-champion-placeholder">
          <span>{item.year}</span>
          <strong>{item.champion}</strong>
          <small>Champion</small>
        </div>
      )}
      <div className="dfs-champion-copy">
        <span>{item.year}</span>
        <strong>{item.champion}</strong>
      </div>
    </div>
  );
}

function FamilyScramblePage({ goHome }) {
  return (
    <div className="dfs-page">
      <button className="dfs-back" onClick={goHome}>← Back to Home</button>

      <header className="dfs-hero">
        <img src="/family-scramble/2026-hero.jpg" alt="Dojo Family Scramble at Gem Lake Hills" className="dfs-hero-photo" />
        <div className="dfs-hero-overlay" />
        <img src="/dgl-logo.jpeg" alt="Dojo Golf League" className="dfs-logo" />
        <div className="dfs-hero-content">
          <p>4th Annual</p>
          <h1>Dojo Family<br /><span>Scramble</span></h1>
          <h2>Sunday • September 13, 2026</h2>
          <h3>Gem Lake Hills • Mini Gem + Executive Course</h3>
          <strong>FAMILY • FRIENDS • GOLF</strong>
        </div>
      </header>

      <section className="dfs-timeline">
        <div><strong>9:00</strong><span>Mini Gem</span></div>
        <div><strong>10:04</strong><span>Executive Course</span></div>
        <div><strong>Post-Round</strong><span>Lunch + Awards</span></div>
        <div><strong>3:30</strong><span>Vikings • Packers</span></div>
      </section>

      <section className="dfs-intro">
        <div>
          <p className="dfs-eyebrow">2026 Championship Day</p>
          <h2>Family. Friends. Golf.</h2>
          <p>Mini Gem is for fun. The Executive Course is for the championship. The day is built around the people who make the Dojo what it is.</p>
        </div>
        <div className="dfs-numbers">
          <div><strong>30</strong><span>Golfers</span></div>
          <div><strong>8</strong><span>Teams</span></div>
          <div><strong>4th</strong><span>Annual</span></div>
        </div>
      </section>

      <section className="dfs-section">
        <div className="dfs-section-heading">
          <p className="dfs-eyebrow">Sunday Morning</p>
          <h2>Tee Times</h2>
        </div>
        <div className="dfs-tee-grid">
          <TeeSheet title="Mini Gem" subtitle="Just for fun • Track holes-in-one only" rows={miniGemTeeTimes} red />
          <TeeSheet title="Executive Course" subtitle="Official team scramble scoring" rows={executiveTeeTimes} />
        </div>
      </section>

      <section className="dfs-section dfs-rules-wrap">
        <div className="dfs-section-heading">
          <p className="dfs-eyebrow">Rules • Contests • Tradition</p>
          <h2>Scramble Rules</h2>
        </div>
        <div className="dfs-rule-grid">
          {rules.map(([label, copy]) => (
            <div className="dfs-rule" key={label}>
              <strong>{label}</strong>
              <p>{copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="dfs-section">
        <div className="dfs-section-heading dfs-heading-row">
          <div>
            <p className="dfs-eyebrow">Contests & Prizes</p>
            <h2>On-Course Contests</h2>
          </div>
          <span className="dfs-prize-pill">Prizes TBD</span>
        </div>
        <div className="dfs-contest-grid">
          {contests.map(([title, location, copy]) => (
            <div className="dfs-contest" key={title}>
              <div><strong>{title}</strong><p>{copy}</p></div>
              <span>{location}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="dfs-section dfs-history-section">
        <div className="dfs-section-heading">
          <p className="dfs-eyebrow">The Tradition</p>
          <h2>Past Champions</h2>
        </div>
        <div className="dfs-champion-grid">
          {champions.map(item => <ChampionCard item={item} key={item.year} />)}
        </div>
      </section>

      <section className="dfs-section dfs-memory-section">
        <div className="dfs-memory-copy">
          <p className="dfs-eyebrow">Scramble Memories</p>
          <h2>More Than a Tournament</h2>
          <p>The Family Scramble brings generations of Dojo golfers together. Add prior-year photos as the archive grows and this page will become the permanent home for the event’s history.</p>
        </div>
        <div className="dfs-memory-gallery">
          <img src="/family-scramble/2026-hero.jpg" alt="2026 Dojo Family Scramble" />
          <img src="/family-scramble/2026-team.jpg" alt="Dojo Family Scramble team" />
        </div>
      </section>

      <section className="dfs-section dfs-after">
        <div className="dfs-after-photo">
          <img src="/family-scramble/2026-team.jpg" alt="Family Scramble foursome" />
          <span>FAMILY • FRIENDS • GOLF</span>
        </div>
        <div className="dfs-after-copy">
          <p className="dfs-eyebrow">After the Round</p>
          <h2>Keep the Day Going</h2>
          <div className="dfs-after-item"><strong>Gem Lake Hills Deck</strong><span>Post-round lunch, beverages & awards.</span></div>
          <div className="dfs-after-item"><strong>3:30 PM</strong><span>Vikings vs. Packers at the Rush household.</span></div>
          <div className="dfs-after-item"><strong>3408 36th Ave NE</strong><span>Saint Anthony Village, MN 55418</span></div>
          <p>Dinner off the grill • Bouncy house (weather permitting) • Billiards + games</p>
        </div>
      </section>

      <footer className="dfs-footer">
        <img src="/dgl-logo.jpeg" alt="DGL" />
        <span>DOJO GOLF LEAGUE</span>
        <strong>FAMILY • FRIENDS • GOLF</strong>
      </footer>

      <style>{`
        .dfs-page{max-width:1180px;margin:0 auto;padding:18px 14px 60px;color:#f7f0df;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
        .dfs-back{position:sticky;top:12px;z-index:50;border:1px solid rgba(255,220,120,.35);background:rgba(10,8,7,.78);backdrop-filter:blur(14px);color:#fff4cf;border-radius:999px;padding:10px 15px;font-weight:800;cursor:pointer;margin-bottom:14px}
        .dfs-hero{position:relative;min-height:520px;border-radius:30px;overflow:hidden;border:1px solid rgba(255,208,78,.28);box-shadow:0 30px 80px rgba(0,0,0,.48)}
        .dfs-hero-photo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
        .dfs-hero-overlay{position:absolute;inset:0;background:linear-gradient(90deg,rgba(4,4,4,.92) 0%,rgba(7,7,7,.78) 38%,rgba(7,7,7,.16) 70%),linear-gradient(0deg,rgba(0,0,0,.82),transparent 55%)}
        .dfs-logo{position:absolute;top:34px;left:38px;width:78px;height:78px;object-fit:cover;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.45)}
        .dfs-hero-content{position:absolute;left:38px;bottom:44px;max-width:660px}
        .dfs-hero-content p,.dfs-eyebrow{margin:0 0 8px;color:#f5bf2f;font-size:11px;font-weight:950;letter-spacing:.18em;text-transform:uppercase}
        .dfs-hero-content h1{margin:0;color:#fff;font-size:clamp(54px,8vw,98px);line-height:.82;letter-spacing:-.07em;text-transform:uppercase}
        .dfs-hero-content h1 span{color:#e30613}
        .dfs-hero-content h2{margin:24px 0 6px;font-size:clamp(18px,2.5vw,27px);color:#ffd766;text-transform:uppercase}
        .dfs-hero-content h3{margin:0 0 9px;font-size:17px;color:#fff}
        .dfs-hero-content>strong{font-size:12px;letter-spacing:.18em}
        .dfs-timeline{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;margin:16px 0 22px;background:#141210;border:1px solid rgba(255,216,103,.18);border-radius:18px;overflow:hidden}
        .dfs-timeline div{padding:18px;text-align:center;background:linear-gradient(180deg,#171513,#0d0c0b)}
        .dfs-timeline strong{display:block;color:#f4c43c;font-size:17px;text-transform:uppercase}.dfs-timeline span{display:block;margin-top:3px;color:#e8dfcd;font-size:10px;text-transform:uppercase;letter-spacing:.08em}
        .dfs-intro{display:grid;grid-template-columns:1.25fr .75fr;gap:18px;align-items:stretch;margin-bottom:24px}
        .dfs-intro>div:first-child,.dfs-numbers,.dfs-section{border:1px solid rgba(255,216,103,.18);background:linear-gradient(145deg,rgba(40,23,16,.94),rgba(10,8,7,.96));border-radius:24px}
        .dfs-intro>div:first-child{padding:28px}.dfs-intro h2,.dfs-section h2,.dfs-after h2{margin:0;color:#fff;font-size:clamp(32px,5vw,58px);letter-spacing:-.045em}.dfs-intro p:last-child{font-size:17px;line-height:1.55;color:#d8cebb;max-width:740px}
        .dfs-numbers{display:grid;grid-template-columns:repeat(3,1fr);align-items:center;padding:18px}.dfs-numbers div{text-align:center;border-right:1px solid rgba(255,255,255,.12)}.dfs-numbers div:last-child{border:0}.dfs-numbers strong{display:block;color:#ffcf43;font-size:38px}.dfs-numbers span{font-size:10px;text-transform:uppercase;letter-spacing:.12em}
        .dfs-section{padding:26px;margin:18px 0}.dfs-section-heading{margin-bottom:18px}.dfs-section-heading h2{font-size:clamp(30px,4.4vw,52px)}
        .dfs-tee-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.dfs-teesheet{overflow:hidden;border-radius:18px;border:1px solid rgba(255,255,255,.12);background:#f5efe2;color:#161412}.dfs-teesheet-head{padding:18px;background:#121212;color:#fff}.dfs-teesheet-red .dfs-teesheet-head{background:#c90815}.dfs-teesheet-head strong{display:block;font-size:22px;text-transform:uppercase}.dfs-teesheet-head span{font-size:11px;opacity:.78}.dfs-teesheet-body{display:grid}.dfs-tee-row{display:grid;grid-template-columns:70px 1fr;gap:12px;align-items:center;padding:13px 14px;border-top:1px solid rgba(0,0,0,.07)}.dfs-tee-row:nth-child(even){background:#eee6d6}.dfs-tee-row b{display:inline-flex;justify-content:center;background:#d10a18;color:white;border-radius:999px;padding:7px 8px;font-size:11px}.dfs-tee-row span{font-size:12px;font-weight:650}
        .dfs-rule-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.dfs-rule{padding:17px;border-radius:15px;background:rgba(255,255,255,.045);border:1px solid rgba(255,214,91,.12)}.dfs-rule strong{display:block;color:#efc34e;text-transform:uppercase;font-size:11px;letter-spacing:.1em}.dfs-rule p{margin:7px 0 0;color:#dbd2c0;font-size:13px;line-height:1.45}
        .dfs-heading-row{display:flex;align-items:end;justify-content:space-between;gap:16px}.dfs-prize-pill{background:#f3c137;color:#15110a;padding:9px 20px;border-radius:999px;font-size:10px;font-weight:950;text-transform:uppercase;letter-spacing:.12em}.dfs-contest-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.dfs-contest{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:17px;border-radius:16px;background:#f5efe2;color:#17130e}.dfs-contest strong{font-size:14px;text-transform:uppercase}.dfs-contest p{margin:4px 0 0;font-size:11px;color:#635b50}.dfs-contest>span{white-space:nowrap;background:#cb0715;color:#fff;border-radius:999px;padding:7px 13px;font-size:9px;font-weight:900;text-transform:uppercase}
        .dfs-champion-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.dfs-champion-card{position:relative;min-height:260px;border-radius:18px;overflow:hidden;background:#181310;border:1px solid rgba(255,220,110,.18)}.dfs-champion-card>img{width:100%;height:260px;object-fit:cover}.dfs-champion-placeholder{height:260px;display:grid;place-content:center;text-align:center;padding:20px;background:radial-gradient(circle at top,#5d3718,#170f0b 65%)}.dfs-champion-placeholder span{color:#f3c33e;font-size:42px;font-weight:950}.dfs-champion-placeholder strong{margin-top:8px;font-size:19px}.dfs-champion-placeholder small{margin-top:5px;text-transform:uppercase;letter-spacing:.13em;color:#c4b79f}.dfs-champion-copy{position:absolute;left:0;right:0;bottom:0;padding:16px;background:linear-gradient(0deg,rgba(0,0,0,.92),transparent);display:grid}.dfs-champion-copy span{color:#f5c441;font-weight:950}.dfs-champion-copy strong{font-size:16px}
        .dfs-memory-section{display:grid;grid-template-columns:.8fr 1.2fr;gap:18px;align-items:center}.dfs-memory-copy{padding:8px}.dfs-memory-copy p:last-child{color:#d8cebb;line-height:1.55}.dfs-memory-gallery{display:grid;grid-template-columns:1.4fr .8fr;gap:10px}.dfs-memory-gallery img{width:100%;height:280px;object-fit:cover;border-radius:18px}.dfs-memory-gallery img:last-child{object-position:center}
        .dfs-after{display:grid;grid-template-columns:1fr 1fr;gap:22px;align-items:stretch}.dfs-after-photo{position:relative;border-radius:18px;overflow:hidden;min-height:340px}.dfs-after-photo img{width:100%;height:100%;object-fit:cover}.dfs-after-photo span{position:absolute;left:18px;bottom:18px;background:rgba(0,0,0,.78);padding:9px 14px;border-radius:8px;font-size:10px;font-weight:900;letter-spacing:.12em}.dfs-after-copy{padding:12px 4px}.dfs-after-item{display:grid;grid-template-columns:150px 1fr;gap:14px;padding:13px 0;border-bottom:1px solid rgba(255,255,255,.1)}.dfs-after-item strong{color:#f4c23c}.dfs-after-copy>p:last-child{color:#d8cebb;line-height:1.5}
        .dfs-footer{display:flex;align-items:center;gap:12px;margin-top:24px;padding:18px 22px;border-radius:18px;background:#c70715}.dfs-footer img{width:38px;height:38px;border-radius:6px}.dfs-footer span{font-weight:900}.dfs-footer strong{margin-left:auto;font-size:10px;letter-spacing:.13em}
        @media(max-width:800px){.dfs-hero{min-height:560px}.dfs-logo{top:22px;left:22px;width:60px;height:60px}.dfs-hero-content{left:22px;right:20px;bottom:30px}.dfs-hero-content h1{font-size:58px}.dfs-timeline{grid-template-columns:repeat(2,1fr)}.dfs-intro,.dfs-tee-grid,.dfs-memory-section,.dfs-after{grid-template-columns:1fr}.dfs-rule-grid,.dfs-contest-grid{grid-template-columns:1fr}.dfs-champion-grid{grid-template-columns:1fr}.dfs-champion-card,.dfs-champion-card>img,.dfs-champion-placeholder{min-height:220px;height:220px}.dfs-memory-gallery{grid-template-columns:1fr 1fr}.dfs-memory-gallery img{height:200px}.dfs-after-photo{min-height:300px}}
        @media(max-width:520px){.dfs-page{padding:10px 8px 40px}.dfs-hero{border-radius:22px;min-height:525px}.dfs-hero-content h1{font-size:48px}.dfs-hero-content h2{font-size:17px}.dfs-timeline div{padding:13px 8px}.dfs-intro>div:first-child,.dfs-section{padding:18px}.dfs-numbers{padding:14px 6px}.dfs-numbers strong{font-size:28px}.dfs-tee-row{grid-template-columns:55px 1fr;padding:11px 10px}.dfs-tee-row span{font-size:10px}.dfs-heading-row{align-items:flex-start;flex-direction:column}.dfs-memory-gallery img{height:155px}.dfs-after-item{grid-template-columns:1fr;gap:4px}.dfs-footer{align-items:flex-start;flex-wrap:wrap}.dfs-footer strong{width:100%;margin:0}}
      `}</style>
    </div>
  );
}

export default FamilyScramblePage;

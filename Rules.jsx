import React from 'react';

// Static league text supplied October 6, 2026. Update here when amended.
const membership = 'First rule of the DGL: any new member must be nominated by a current (and in good standing) DGL member then seconded by at least one other DGL member.';
const conduct = 'Second rule of the DGL: cheating will not be tolerated. If any DGL member is accused in this chat of a rules infraction a 24 hour evidentiary period will commence where any DGL member, accuser or accused, may present any evidence, proof, witnesses or opinion. After the 24 hour evidentiary period closes a 24 hour voting period will commence where any DGL member may vote, up to one time, guilty or not guilty. At the end of the 24 hour period if the accused has more guilty votes than not guilty votes they will be issued a strike. Two strikes and you are ruled ineligible for the next Dojo Golf League Fall Classic, hereinafter referred to as the DGLFC.';
const originalEventRule = 'Third Rule: For an event to be officially recognized it must be posted in this message board minimum 72 hours prior to tee time so that all have a fair shot at joining. To be official it must have at least 3 golfers who all have paid the $10 entry fee prior to start to the league Commissioner. Each Golfer must have a GHIN handicap. Half of the event purse will go to the low net (or split if any ties). The other half of the purse will go towards the DGLFC 👛.';
const points = 'To be eligible for the DGLFC a member must participate in at least 4 regular season events (pretty low hurdle guys). During the regular season Golfers will accrue points for playing in an event (.15) and for winning an event (.1 multiplied by # of golfers that day). If there is a tie at a daily event the bonus points will be split evenly. Come the DGLFC your points total for the regular season will be added to your handicap for the weekend which will be fixed.';
const amendments = [
  ['2022 Motion #2 (passed)', 'the season will be divided into one week segments which will start Monday and end Sunday. If a golfer plays in multiple events in the same week only his top score will be counted towards the accumulated season points. This change would have no impact on the event entry fees or the event pots (a player could win two events in the same week and get both pots, but will only receive the DGL points for the event that had more players).'],
  ['2023 Motion #1', 'A minimum of two golfers will be needed to constitute an official DGL event'],
  ['2024 Motion #1', 'OG Rule #3 amended to be a minimum of 24 hours prior to tee time.']
];
const classic = [
  ['Round 1 · The cut', 'Round one of the DGLFC will be 18 holes with the cut line being top 40% (round up to whole golfer) plus any golfer within 0.99 strokes ater applying handicap and season DGL points'],
  ['Round 2 · The final pairing', 'Round two will be 18 holes plus playoff if necessary to establish the final championship pairing.'],
  ['Round 3 · The championship', 'Round 3 will be match play 18 hole showdown between the two remaining golfers using GHIN plus regular season points to determine any holes that the higher handicap would be given a stroke.'],
  ['Purse & expenses', 'Winner will take 70% of the DGLFC 👛 with second place receiving 30%. Each golfer, or their sponsor, is responsible for all greens fees/cart fees/beers & bratwurst etc.']
];

export default function RulesPage({ goHome }) {
  return (
    <section className="dgl-rules" aria-labelledby="dgl-rules-title">
      <button type="button" className="gold-button" onClick={goHome}>← Back to DGL Tour</button>
      <header className="dgl-rules-hero">
        <p className="eyebrow">Dojo Golf League · The rulebook</p>
        <h1 id="dgl-rules-title">DGL Rules</h1>
        <p>Membership, fair play, season points and the Fall Classic.</p>
        <small>Page last updated October 6, 2026 · Includes amendments through 2024</small>
      </header>
      <section className="dgl-rules-panel" aria-labelledby="rules-current">
        <h2 id="rules-current">At a glance · Current rules</h2>
        <dl className="dgl-rules-facts">
          {[
            ['24 hours', 'Minimum event notice · amended 2024'],
            ['2 golfers', 'Minimum field · amended 2023'],
            ['$10', 'Entry paid before play; GHIN required'],
            ['4 events', 'Regular-season minimum for DGLFC eligibility'],
            ['50 / 50', 'Event purse: low net / Fall Classic'],
            ['70 / 30', 'Fall Classic purse: winner / runner-up']
          ].map(([value, label]) => <div key={label}><dt>{value}</dt><dd>{label}</dd></div>)}
        </dl>
        <p className="dgl-rules-note">The amendments below replace the original three-golfer minimum and 72-hour notice. References to “this chat” or “this message board” mean the league message board.</p>
      </section>
      <section className="dgl-rules-panel">
        <h2>Membership & fair play</h2>
        <h3>01 · Joining the league</h3><p>{membership}</p>
        <h3>02 · Rules infractions</h3><p>{conduct}</p>
      </section>
      <section className="dgl-rules-panel">
        <h2>Official events</h2>
        <p>Under Rule 3 as amended, events must be posted on the league message board at least 24 hours before tee time and have at least two golfers. Each golfer must have a GHIN handicap and pay the $10 entry fee to the Commissioner before play.</p>
        <p>Half of the event purse goes to the low-net winner, split in the event of a tie. The other half goes toward the DGLFC purse.</p>
        <details><summary>Original Rule 3 · Historical wording</summary><p className="dgl-rules-note">The 72-hour notice and three-golfer minimum below have been superseded.</p><p>{originalEventRule}</p></details>
      </section>
      <section className="dgl-rules-panel">
        <h2>Season points & eligibility</h2><p>{points}</p>
        <div className="dgl-rules-callout"><strong>Weekly scoring · Monday–Sunday</strong><p>{amendments[0][1]}</p><small>2022 Motion #2 (passed)</small></div>
      </section>
      <section className="dgl-rules-panel">
        <p className="eyebrow">DGLFC</p><h2>The Fall Classic</h2>
        {classic.map(([title, body]) => <div key={title} className="dgl-rules-round"><h3>{title}</h3><p>{body}</p></div>)}
      </section>
      <section className="dgl-rules-panel">
        <h2>Amendment record</h2>
        {amendments.map(([title, body]) => <details key={title}><summary>{title}</summary><p>{body}</p></details>)}
      </section>
      <style>{`
        .dgl-rules{max-width:940px;margin:0 auto;padding:24px 16px 48px;color:#f5efe5;font-family:Inter,system-ui,sans-serif;box-sizing:border-box}
        .dgl-rules *{box-sizing:border-box}.dgl-rules-hero{padding:36px 0 24px}.dgl-rules h1{font-size:clamp(36px,7vw,64px);line-height:1.05;margin:8px 0 14px;letter-spacing:-.04em}.dgl-rules h2{font-size:clamp(23px,4vw,30px);margin:0 0 20px;line-height:1.2}.dgl-rules h3{font-size:17px;color:#f0c75e;margin:24px 0 8px}.dgl-rules p{font-size:16px;line-height:1.75;margin:0 0 16px;overflow-wrap:anywhere}.dgl-rules small,.dgl-rules-note{color:#c1b7a6}.dgl-rules .eyebrow{color:#f0c75e;font-size:11px;font-weight:800;letter-spacing:.16em;text-transform:uppercase}.dgl-rules-panel{padding:28px;margin:0 0 18px;border:1px solid #5a4728;border-radius:18px;background:linear-gradient(130deg,#24190f,#100d0a)}.dgl-rules-facts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:0 0 20px}.dgl-rules-facts>div{padding:18px 14px;border-radius:10px;background:#ffffff06;border:1px solid #ffffff12}.dgl-rules-facts dt{font-size:26px;color:#f0c75e;font-weight:800}.dgl-rules-facts dd{margin:7px 0 0;color:#cec3b2;font-size:13px;line-height:1.5}.dgl-rules .dgl-rules-note{font-size:13px}.dgl-rules-callout{border-left:3px solid #e6be58;background:#ffffff05;padding:18px;margin-top:24px}.dgl-rules-callout strong{color:#f0c75e}.dgl-rules-callout p{margin-top:10px}.dgl-rules-round+.dgl-rules-round{border-top:1px solid #ffffff12;margin-top:20px}.dgl-rules details{border-top:1px solid #ffffff18;padding:16px 0}.dgl-rules summary{cursor:pointer;font-weight:700;color:#f0c75e;line-height:1.5}.dgl-rules details[open] summary{margin-bottom:16px}.dgl-rules summary:focus-visible{outline:2px solid #f0c75e;outline-offset:5px}@media(max-width:600px){.dgl-rules{padding:18px 10px 36px}.dgl-rules-panel{padding:20px 16px}.dgl-rules-facts{grid-template-columns:repeat(2,minmax(0,1fr))}.dgl-rules-facts dt{font-size:23px}}@media print{.dgl-rules{color:#111;max-width:none}.dgl-rules>.gold-button{display:none}.dgl-rules-panel{background:white;border-color:#999}.dgl-rules h3,.dgl-rules .eyebrow,.dgl-rules-facts dt,.dgl-rules-facts dd,.dgl-rules small{color:#222}}
      `}</style>
    </section>
  );
}

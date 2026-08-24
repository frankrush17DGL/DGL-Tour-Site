import React, { useEffect, useMemo, useState } from 'react';
import { csvUrl, parseCSV, textCell } from './core.jsx';

function normalizeRuleRows(text) {
  if (!text) return [];

  const rows = parseCSV(text)
    .map(row => (row || []).map(textCell))
    .filter(row => row.some(Boolean));

  if (!rows.length) return [];

  const first = rows[0].map(value => value.toLowerCase());
  const looksLikeHeader = first.some(value =>
    ['rule', 'rules', 'section', 'title', 'description', 'official rules'].includes(value)
  );

  return (looksLikeHeader ? rows.slice(1) : rows).map((row, index) => {
    const cells = row.filter(Boolean);
    const firstCell = cells[0] || '';
    const remainder = cells.slice(1).join(' ').trim();
    const numericRule = /^(?:rule\s*)?(\d+|[ivxlcdm]+)[.)-]?\s*$/i.test(firstCell);
    const sectionLike = cells.length === 1 && firstCell.length <= 80;

    return {
      id: `rule-${index + 1}`,
      label: numericRule ? firstCell.replace(/[.)-]+$/, '').trim() : '',
      title: sectionLike ? firstCell : '',
      body: sectionLike ? '' : (remainder || firstCell)
    };
  });
}

function RomanNumeral({ index, label }) {
  if (label) return <span>{label}</span>;

  const romans = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX'];
  return <span>{romans[index] || index + 1}</span>;
}

function RulesPage({ goHome }) {
  const [status, setStatus] = useState('loading');
  const [rulesText, setRulesText] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadRules() {
      try {
        const response = await fetch(csvUrl('Official Rules'));
        if (!response.ok) throw new Error(`Google Sheets returned ${response.status}`);
        const text = await response.text();
        if (!text.trim()) throw new Error('Official Rules sheet returned no content');
        if (cancelled) return;
        setRulesText(text);
        setStatus('ready');
      } catch (err) {
        if (cancelled) return;
        console.error('DGL OFFICIAL RULES FAILED', err);
        setError(err?.message || String(err));
        setStatus('error');
      }
    }

    loadRules();
    return () => { cancelled = true; };
  }, []);

  const rules = useMemo(() => normalizeRuleRows(rulesText), [rulesText]);
  const bodyRules = rules.filter(rule => rule.body);

  return (
    <section className="rules-page">
      <div className="rules-night-sky" />

      <header className="rules-topbar">
        <button className="rules-back" onClick={goHome}>← DGL TOUR</button>
        <span>EST. 2021</span>
      </header>

      <div className="rules-stage">
        <div className="rules-tablets">
          <div className="rules-crown">⚜</div>
          <p className="rules-kicker">The Dojo Golf League</p>
          <h1>OFFICIAL RULES</h1>
          <div className="rules-divider"><span>◆</span></div>
          <p className="rules-decree">As recorded in the Official Rules ledger and binding upon all who enter the field.</p>

          {status === 'loading' ? (
            <div className="rules-message">Unrolling the official scroll…</div>
          ) : null}

          {status === 'error' ? (
            <div className="rules-message rules-error">
              <strong>THE SCROLL COULD NOT BE OPENED</strong>
              <span>{error}</span>
            </div>
          ) : null}

          {status === 'ready' && !rules.length ? (
            <div className="rules-message">No rules were found on the Official Rules sheet.</div>
          ) : null}

          {status === 'ready' && rules.length ? (
            <div className="rules-scroll">
              {rules.map((rule, index) => {
                if (rule.title) {
                  return (
                    <div className="rules-section-heading" key={rule.id}>
                      <span>✦</span>
                      <h2>{rule.title}</h2>
                      <span>✦</span>
                    </div>
                  );
                }

                const visibleIndex = bodyRules.findIndex(item => item.id === rule.id);
                return (
                  <article className="rules-commandment" key={rule.id}>
                    <div className="rules-number">
                      <RomanNumeral index={visibleIndex} label={rule.label} />
                    </div>
                    <p>{rule.body}</p>
                  </article>
                );
              })}
            </div>
          ) : null}

          <footer className="rules-seal">
            <div className="rules-seal-mark">DGL</div>
            <div>
              <strong>OFFICIAL LEAGUE LAW</strong>
              <span>Where legends are made and Red Rounds live forever.</span>
            </div>
          </footer>
        </div>
      </div>

      <style>{`
        .rules-page{position:relative;min-height:100vh;padding:0 18px 72px;overflow:hidden;background:radial-gradient(circle at 50% 0%,#302313 0,#120c08 38%,#050403 100%);color:#2b2116}
        .rules-night-sky{position:fixed;inset:0;pointer-events:none;opacity:.45;background-image:radial-gradient(circle at 12% 18%,rgba(240,207,125,.18) 0 1px,transparent 2px),radial-gradient(circle at 78% 26%,rgba(240,207,125,.12) 0 1px,transparent 2px),radial-gradient(circle at 36% 62%,rgba(240,207,125,.1) 0 1px,transparent 2px);background-size:70px 70px,110px 110px,130px 130px}
        .rules-topbar{position:relative;z-index:2;max-width:1040px;margin:0 auto;padding:20px 4px;display:flex;align-items:center;justify-content:space-between;color:#d6b76d;font-size:10px;font-weight:900;letter-spacing:.18em}
        .rules-back{border:1px solid rgba(225,188,94,.35);border-radius:999px;padding:9px 13px;background:rgba(0,0,0,.24);color:#f0cf7b;font:inherit;cursor:pointer}
        .rules-stage{position:relative;z-index:1;max-width:980px;margin:8px auto 0;padding:34px 24px;background:linear-gradient(90deg,rgba(52,34,16,.82),rgba(0,0,0,.14) 8%,rgba(0,0,0,.14) 92%,rgba(52,34,16,.82)),radial-gradient(circle at 50% 20%,rgba(255,220,139,.13),transparent 45%);border-radius:34px;box-shadow:0 45px 110px rgba(0,0,0,.58)}
        .rules-tablets{position:relative;padding:58px clamp(24px,7vw,82px) 42px;border:1px solid #9e7a3d;border-radius:26px 26px 18px 18px;background:linear-gradient(90deg,rgba(87,55,22,.09),transparent 8%,transparent 92%,rgba(87,55,22,.12)),linear-gradient(180deg,#eee0b8 0%,#dfca92 48%,#c9ab6c 100%);box-shadow:inset 0 0 0 5px rgba(105,73,31,.12),inset 0 0 70px rgba(73,46,19,.28),0 18px 40px rgba(0,0,0,.38);font-family:Georgia,'Times New Roman',serif}
        .rules-tablets:before,.rules-tablets:after{content:'';position:absolute;left:4%;right:4%;height:18px;border-radius:50%;background:linear-gradient(180deg,#aa884f,#725527);box-shadow:0 4px 12px rgba(0,0,0,.34)}
        .rules-tablets:before{top:-8px}.rules-tablets:after{bottom:-8px;transform:rotate(180deg)}
        .rules-crown{text-align:center;font-size:30px;color:#74551e;text-shadow:0 1px 0 #f7eac1}
        .rules-kicker{text-align:center;margin:6px 0 0;color:#725627;font-size:11px;font-weight:700;letter-spacing:.24em;text-transform:uppercase}
        .rules-tablets h1{text-align:center;margin:7px 0 0;color:#33220f;font-size:clamp(38px,8vw,76px);line-height:.9;letter-spacing:.02em;text-shadow:0 1px 0 #f7e8bd}
        .rules-divider{display:flex;align-items:center;gap:12px;margin:22px auto 12px;color:#6d501d}.rules-divider:before,.rules-divider:after{content:'';height:1px;flex:1;background:linear-gradient(90deg,transparent,#6d501d)}.rules-divider:after{background:linear-gradient(90deg,#6d501d,transparent)}
        .rules-decree{max-width:680px;margin:0 auto 30px;text-align:center;color:#6e5730;font-size:14px;font-style:italic;line-height:1.6}
        .rules-scroll{display:grid;gap:0}
        .rules-commandment{display:grid;grid-template-columns:64px 1fr;gap:18px;align-items:start;padding:20px 0;border-bottom:1px solid rgba(79,57,23,.24)}
        .rules-commandment:last-child{border-bottom:0}.rules-number{display:grid;place-items:center;width:56px;height:56px;border:1px solid rgba(80,57,20,.5);border-radius:50%;background:rgba(101,70,23,.08);color:#62430f;font-size:18px;font-weight:700;box-shadow:inset 0 0 0 4px rgba(255,244,202,.25)}
        .rules-commandment p{margin:3px 0 0;color:#352817;font-size:clamp(16px,2.2vw,20px);line-height:1.62;white-space:pre-wrap}
        .rules-section-heading{display:grid;grid-template-columns:1fr auto 1fr;gap:14px;align-items:center;padding:28px 0 7px;color:#6a4b18}.rules-section-heading span{text-align:center}.rules-section-heading h2{margin:0;text-align:center;color:#493313;font-size:20px;letter-spacing:.12em;text-transform:uppercase}.rules-section-heading:before,.rules-section-heading:after{content:'';height:1px;background:rgba(82,57,20,.35)}
        .rules-message{margin:28px 0;padding:22px;border:1px dashed rgba(77,54,18,.45);text-align:center;color:#674a1d;font-weight:700}.rules-error{display:grid;gap:8px;color:#7d2e1e}
        .rules-seal{display:flex;align-items:center;justify-content:center;gap:16px;margin-top:34px;padding-top:24px;border-top:1px solid rgba(78,55,21,.3);color:#624819}.rules-seal-mark{display:grid;place-items:center;width:64px;height:64px;border-radius:50%;border:3px double #6d4e1d;font-weight:900;letter-spacing:.08em;transform:rotate(-7deg)}.rules-seal div:last-child{display:grid;gap:3px}.rules-seal strong{font-size:11px;letter-spacing:.14em}.rules-seal span{font-size:12px;font-style:italic}
        @media(max-width:650px){.rules-page{padding-left:8px;padding-right:8px}.rules-stage{padding:24px 10px;border-radius:22px}.rules-tablets{padding:46px 18px 32px;border-radius:20px}.rules-commandment{grid-template-columns:44px 1fr;gap:12px;padding:16px 0}.rules-number{width:42px;height:42px;font-size:14px}.rules-commandment p{font-size:16px}.rules-seal{align-items:flex-start}.rules-seal-mark{width:52px;height:52px;flex:0 0 52px}}
      `}</style>
    </section>
  );
}

export default RulesPage;

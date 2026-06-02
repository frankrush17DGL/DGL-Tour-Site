import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Trophy, CalendarDays, Users, Flame, Landmark, BadgeDollarSign } from 'lucide-react';
import './styles.css';
import data from './dgl-data.json';

const money = v => v == null ? '—' : `$${Number(v).toLocaleString(undefined,{maximumFractionDigits:2})}`;

function App(){
  const [year,setYear]=useState('2026');
  const standings=data.standingsByYear[year]||[];
  const top10=standings.slice(0,10);
  const leader=standings[0];
  const nextEvent=data.events.find(e=>!e.completed)||data.events[0];
  const featured=data.redRounds[0];
  const players=data.players;

  return <>
    <header className="hero">
      <nav><img src="/dgl-logo.jpeg"/><div className="brand"><b>DGL TOUR</b><span>Dojo Golf League · Est. 2021</span></div><div className="links"><a href="#standings">Standings</a><a href="#events">Events</a><a href="#players">Players</a><a href="#redroom">Red Room</a></div></nav>
      <section className="heroGrid">
        <div className="headline"><p className="eyebrow">Official home of the Dojo Golf League</p><h1>Where legends are made and Red Rounds live forever.</h1><p>Live standings first, event schedule second, and enough odds-board energy to keep the group chat chirping all season.</p></div>
        <StatCard icon={<Trophy/>} label="Current Leader" value={leader?.player||'TBD'} sub={leader?`${leader.points} pts`:'Update 2026 standings'} />
        <StatCard icon={<CalendarDays/>} label="Next Event" value={nextEvent?.course||'TBD'} sub={nextEvent?.date||'Add event date'} />
        <SidePots pots={data.sidePots}/>
      </section>
    </header>

    <main>
      <section id="standings" className="panel"><SectionTitle icon={<Trophy/>} title="Live Standings" kicker="Homepage priority #1"/><div className="tabs">{Object.keys(data.standingsByYear).sort((a,b)=>b-a).map(y=><button className={y===year?'active':''} onClick={()=>setYear(y)} key={y}>{y}</button>)}</div><Table rows={top10} columns={[['rank','Rank'],['player','Player'],['points','Points'],['events','Events Played']]} /></section>

      <section id="events" className="panel"><SectionTitle icon={<CalendarDays/>} title="Event Schedule" kicker="Upcoming and past official events"/><div className="cards">{data.events.map((e,i)=><div className="card" key={i}><b>{e.course||e.name}</b><span>{e.date||'Date TBD'}</span><p>{e.name||'DGL Event'} · {e.time||'Time TBD'}</p></div>)}</div></section>

      <section id="players" className="panel"><SectionTitle icon={<Users/>} title="Player Pages" kicker="Powered by the Players tab"/><div className="playerGrid">{players.map(p=><div className="player" key={p.name}><div className="avatar">{p.name.split(' ').map(x=>x[0]).join('').slice(0,2)}</div><b>{p.name}</b><span>{p.nickname||'DGL Member'}</span><small>{p.bio||'Bio/photo can be added in Google Sheets.'}</small></div>)}</div></section>

      <section id="redroom" className="panel"><SectionTitle icon={<Flame/>} title="The Red Room" kicker="Historical Great Rounds Hall of Fame"/><Table rows={data.redRounds.slice(0,15)} columns={[['place','Place'],['player','Player'],['course','Course'],['date','Date'],['score','Score'],['net','Net'],['handicap','HCP']]} /></section>

      <section className="twoCol"><div className="panel"><SectionTitle icon={<BadgeDollarSign/>} title="Sportsbook" kicker="For entertainment only"/><Table rows={data.odds} columns={[['player','Player'],['championshipOdds','Title Odds'],['eventOdds','Next Event']]} /></div><div className="panel"><SectionTitle icon={<Landmark/>} title="State Trophies" kicker="Events outside MN/WI"/><Table rows={data.stateTrophies} columns={[['state','State'],['holder','Holder'],['course','Course'],['year','Year']]} /></div></section>
    </main>
  </>
}
function StatCard({icon,label,value,sub}){return <div className="stat">{icon}<span>{label}</span><b>{value}</b><small>{sub}</small></div>}
function SidePots({pots}){return <div className="stat side"><BadgeDollarSign/><span>Current Side Pots</span><div className="pot"><b>Eagle</b><em>{money(pots.eagle)}</em></div><div className="pot"><b>Hole-in-One</b><em>{money(pots.holeInOne)}</em></div><div className="pot"><b>Sandy</b><em>{money(pots.sandy)}</em></div><small>Historical: Scott Wishart won the 2025 Eagle Pot — $117.50.</small></div>}
function SectionTitle({icon,title,kicker}){return <div className="sectionTitle">{icon}<div><p>{kicker}</p><h2>{title}</h2></div></div>}
function Table({rows,columns}){return <div className="tableWrap"><table><thead><tr>{columns.map(c=><th key={c[0]}>{c[1]}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={i}>{columns.map(c=><td key={c[0]}>{r[c[0]] ?? '—'}</td>)}</tr>)}</tbody></table></div>}
createRoot(document.getElementById('root')).render(<App/>);

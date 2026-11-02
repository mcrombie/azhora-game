import fs from 'node:fs';
import {COMBAT_TRIALS} from '../src/gameplay/combat/combat-trials.js';
import {createLizeemEncounter} from '../src/gameplay/combat/lizeem-encounter.js';
import {encounterAutoplayInput} from '../src/gameplay/autoplay/encounter-input.js';
import {createTeresodSorcery} from '../src/app/exploration/teresod-fireball.js';

// Repeatable input-only probes, not a claim to replace human playtesting.
// No health edits, direct hits, attribute boosts, or enemy-specific damage cheats.
const styles=[
  {name:'rush',delay:.1,miss:0,spell:false},
  {name:'guard',delay:.1,miss:0,spell:false},
  {name:'learning counters',delay:.12,miss:.25,spell:false},
  {name:'practiced counters',delay:.05,miss:.08,spell:false},
  {name:'mixed staff and fire',delay:.07,miss:.12,spell:true},
];
function random(seed){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
function fight(id,style,seed){
  const rng=random(seed),distance=[3.5,6,9][seed%3],angle=seed*.7;
  const model=createLizeemEncounter({opponent:id,heroStart:{x:0,z:0},guardStarts:[{x:Math.sin(angle)*distance,z:Math.cos(angle)*distance}],move:(p,x,z)=>({x:p.x+x,z:p.z+z})});
  const magic=createTeresodSorcery(),queue=[];let s=model.snapshot(),input={},decision=0,castAt=0;
  for(let step=0;step<7200&&!s.outcome;step++){
    const h=s.hero,g=s.guards[0],dx=g.x-h.x,dz=g.z-h.z,d=Math.hypot(dx,dz)||1;
    if(s.time>=decision){
      let next;
      if(style.name==='rush')next={x:d>2.05?dx/d:0,z:d>2.05?dz/d:0,attack:true,focusId:0};
      else if(style.name==='guard')next={x:d>2.05?dx/d:0,z:d>2.05?dz/d:0,block:['windup','strike'].includes(g.phase),attack:true,focusId:0};
      else{next=encounterAutoplayInput(s);next.focusId=0;if(next.dodge&&rng()<style.miss)next={focusId:0};}
      queue.push({at:s.time+style.delay,input:next});decision=s.time+.07;
    }
    while(queue.length&&queue[0].at<=s.time)input=queue.shift().input;
    if(style.spell&&s.time>=castAt&&g.phase!=='veil'&&d<14&&d>3&&model.canCast()&&magic.state().mana>=20&&magic.state().cooldown===0){
      if(model.beginCast()){magic.cast({x:h.x,y:1,z:h.z},{x:dx,y:0,z:dz});castAt=s.time+2;}
    }
    s=model.tick(1/60,input);
    magic.tick(1/60,{targets:model.spellTargets().map(g=>({...g,y:1})),hit:model.fireballHit});s=model.snapshot();
  }
  return {won:s.outcome==='success',hp:s.hero.hp,time:+s.time.toFixed(2),enemyHp:s.guards[0].hp};
}
const selected=process.argv.slice(2);
if(selected.some(id=>!COMBAT_TRIALS.some(p=>p.id===id)))throw Error('Choose known trial IDs or omit arguments for the full roster.');
const roster=selected.length?COMBAT_TRIALS.filter(p=>selected.includes(p.id)):COMBAT_TRIALS;
const results=roster.map(p=>{
  const probes=styles.map(style=>{const runs=Array.from({length:12},(_,i)=>fight(p.id,style,i+1));return {style:style.name,runs,wins:runs.filter(r=>r.won).length,meanHealth:runs.reduce((n,r)=>n+r.hp,0)/runs.length,meanTime:runs.reduce((n,r)=>n+r.time,0)/runs.length};});
  const all=probes.flatMap(p=>p.runs),score=all.reduce((n,r)=>n+(r.won?0:65)+(100-r.hp)*.25+(r.won?Math.min(r.time,60):60-Math.min(r.time,60))/6,0)/all.length;
  return {id:p.id,name:p.name,score:+score.toFixed(2),wins:all.filter(r=>r.won).length,runs:all.length,probes};
}).sort((a,b)=>a.score-b.score||a.id.localeCompare(b.id));
const report={method:'60 deterministic input-only fights per opponent: five policies, twelve starting positions; starting player stats, normal collision and mana. Score weights losses, damage taken, then duration. Relative automated estimate, not a human difficulty guarantee.',results};
fs.mkdirSync('tests/artifacts',{recursive:true});fs.writeFileSync('tests/artifacts/'+(selected.length?'trial-difficulty-selected.json':'trial-difficulty.json'),JSON.stringify(report,null,2));
console.table(results.map((r,i)=>({rank:i+1,enemy:r.name,score:r.score,wins:r.wins+'/60'})));

import {createLizeemEncounter} from '../src/gameplay/combat/lizeem-encounter.js';
import {encounterAutoplayInput} from '../src/gameplay/autoplay/encounter-input.js';
import {ENCOUNTER_ATTACKS,MATCHED_ENCOUNTER_ATTACKS} from '../src/gameplay/combat/encounter-attacks.js';
const fixtures={
  thrust:{heroStart:{x:0,z:0},guardStarts:[{x:0,z:-1.9}],attackPattern:['thrust']},
  mixed:{heroStart:{x:0,z:0},guardStarts:[{x:0,z:-1.9}]},
  three:{heroStart:{x:0,z:0},guardStarts:[{x:-3,z:-3},{x:3,z:-3},{x:0,z:-5}]},
  allied:{heroStart:{x:0,z:3},guardStarts:[-4.05,-1.35,1.35,4.05].map(x=>({x,z:-8})),allyStarts:[-3,0,3].map(x=>({x,z:0})),rallyPoint:{x:0,z:-3}},
  champion:{heroStart:{x:0,z:0},guardStarts:[{x:0,z:-1.9}],duel:{name:'Test champion'}},
};
const results=[];
for(const tempo of ['classic','matched'])for(const [fixture,options] of Object.entries(fixtures))for(const delay of [-1,0,.15,.25]){
  const model=createLizeemEncounter({...options,tempo,move:(p,x,z)=>({x:p.x+x,z:p.z+z})});let s=model.snapshot();
  const queue=Array(Math.round(Math.max(0,delay)*60)).fill(s);
  for(let i=0;i<7500&&!s.outcome;i++){
    queue.push(s);const observed=queue.shift();
    s=model.tick(1/60,delay<0?{attack:true}:encounterAutoplayInput(observed));
  }
  results.push({tempo,fixture,policy:delay<0?'attack-spam':delay===0?'immediate-controller':`controller-delayed-${delay}s`,outcome:s.outcome,hp:s.hero.hp,seconds:+s.time.toFixed(2),counters:s.skill.dodgeCounters,
    enemiesDefeated:s.guards.filter(g=>!g.hp||g.routed).length,alliesLost:s.squad?.alliesLost??null});
}
const timings=Object.fromEntries(Object.entries({classic:ENCOUNTER_ATTACKS,matched:MATCHED_ENCOUNTER_ATTACKS}).map(([id,attacks])=>[id,Object.fromEntries(Object.entries(attacks).map(([id,a])=>[id,{contact:a.windup+a.contact,motion:a.windup+a.strike,recovery:a.recovery}]))]));
console.log(JSON.stringify({note:'Deterministic controller comparisons, not human playtests. Delays apply to observed state; no health, targeting or timing is patched.',timings,results},null,2));

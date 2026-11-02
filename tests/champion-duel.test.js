import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorldWar as createCurrentWorldWar,DUEL_WORLD_WAR_SCENARIO as WORLD_WAR_SCENARIO,RECOVERY_WORLD_WAR_SCENARIO} from '../src/app/exploration/world-war.js';
import {createCampaign,replayCampaign} from '../src/simulation/campaign.js';
import {createLizeemEncounter} from '../src/gameplay/combat/lizeem-encounter.js';
import {encounterAutoplayInput} from '../src/gameplay/autoplay/encounter-input.js';
import {championFor} from '../src/content/scenarios/lizeem-champions.js';
import {battleConsequence} from '../src/app/exploration/battle-consequences.js';
import {phaseDebrief} from '../src/app/exploration/battle-progress.js';
import {validateWorldWarSave,WORLD_WAR_KEY} from '../src/app/exploration/war-checkpoint.js';
import {deathReport} from '../src/app/exploration/afterlife-state.js';
import {campaignChronicle} from '../src/app/exploration/campaign-chronicle.js';

function opening(){const w=createWorldWar();w.advance(3);w.syncRegion('Caricas');const b=w.snapshot().engagements.find(b=>b.region==='caricas');assert(w.campaign.joinBattle(b.id,b.location).ok);return {w,b,c:w.campaign};}
const forces=s=>({armies:s.armies.map(a=>[a.id,a.strength]),garrison:s.regions.caricas.garrison});

const createWorldWar=saved=>createCurrentWorldWar(saved??{simulation:{scenario:WORLD_WAR_SCENARIO.id,seed:1731,day:0,commands:[]},fraction:0,speed:1});
test('opening Caricas offers one optional duel for either side; accepting locks the side',()=>{
  for(const side of ['east','west']){
    const {w,b,c}=opening();assert(w.snapshot().pending.duelAvailable);
    assert(c.chooseDuel(b.id,side).ok);assert(c.chooseDuel(b.id,side).ok);
    assert.equal(c.chooseDuel(b.id,side==='east'?'west':'east').ok,false);
    assert.equal(c.snapshot().commands.filter(c=>c.type==='champion-duel').length,1);
    assert(championFor(c.snapshot().pending).name.startsWith('Captain'));
    assert.deepEqual(replayCampaign(WORLD_WAR_SCENARIO,w.checkpoint().simulation).snapshot(),w.snapshot());
  }
});

test('duel victory lowers rally opposition by two, preserves allies and awards no casualties or ownership',()=>{
  for(const side of ['east','west']){
    const {w,b,c}=opening(),before=w.snapshot();assert(c.chooseDuel(b.id,side).ok);
    assert.equal(c.resolveEncounter(b.id,side,'success','champion-yielded',1).ok,false,'Cannot report a surrendered champion as a kill');
    assert(c.resolveEncounter(b.id,side,'success','champion-yielded',0).ok);
    const after=w.snapshot(),fight=after.engagements.find(e=>e.id===b.id);
    assert.equal(after.regions.caricas.owner,before.regions.caricas.owner);assert.deepEqual(forces(after),forces(before));
    assert.equal(fight.rally.totalGuards,3);assert.equal(fight.duel.moraleGuards,2);assert.equal(after.day,4);
    assert.equal(c.resolveEncounter(b.id,side,'success','champion-yielded',0).ok,false,'No repeated credit');
    assert(c.joinBattle(b.id,b.location).ok);const p=c.snapshot().pending;
    assert.equal(p.stage,'rally');assert.equal(p.rally.supportAllies,3);assert(c.chooseAssault(p.id,'allied').ok);
    assert(c.resolveEncounter(p.id,side,'success','rally-secured',3,{escaped:0,alliesLost:0,routed:1,allyDamage:75}).ok);
    assert.equal(w.snapshot().day,6);const done=w.snapshot().engagements.find(e=>e.id===b.id),receipt=battleConsequence(w.snapshot(),done);
    assert.equal(receipt.winner,side);assert.match(receipt.contribution,/champion yielded/i);assert.match(receipt.contribution,/no enemy soldiers died/i);
    const history=campaignChronicle(w.snapshot()).frames.map(f=>f.caption).join(' ');assert.match(history,/champion yielded/i);assert.match(history,/no enemy soldiers died/i);
    assert.match(deathReport(w.snapshot(),b.id,WORLD_WAR_SCENARIO),/You won the champion duel/,'Later recovery reports preserve the opening victory');
    assert.deepEqual(replayCampaign(WORLD_WAR_SCENARIO,w.checkpoint().simulation).snapshot(),w.snapshot());
  }
});

test('yield and defeat consume the challenge and permit normal allied assault, not a second interception',()=>{
  for(const [outcome,reason] of [['withdraw','withdrew'],['defeat','time-expired'],['defeat','driven-back']]){
    const {w,b,c}=opening();assert(c.chooseDuel(b.id,'west').ok);
    assert(c.resolveEncounter(b.id,'west',outcome,reason,0).ok);
    assert.equal(w.snapshot().engagements[0].duel.moraleGuards,0);assert(c.joinBattle(b.id,b.location).ok);
    assert.equal(c.snapshot().pending.stage,'rally');assert.equal(c.snapshot().pending.rally.guards,5);
    assert.equal(c.chooseDuel(c.snapshot().pending.id,'west').ok,false);
    assert(c.chooseAssault(c.snapshot().pending.id,'allied').ok);
  }
});

test('declining the invitation keeps the duel available; starting interception commits the ordinary route',()=>{
  const {w,b,c}=opening();assert(c.resolveEncounter(b.id,null,'withdraw','declined',0).ok);
  assert(c.joinBattle(b.id,b.location).ok);assert(c.snapshot().pending.duelAvailable);
  assert(c.resolveEncounter(b.id,'west','withdraw','withdrew',0).ok);assert(c.joinBattle(b.id,b.location).ok);
  assert(!c.snapshot().pending.duelAvailable);assert.equal(c.chooseDuel(b.id,'west').ok,false);
});

test('old v8 histories keep their original rules and ordinary fights',()=>{
  const c=createCampaign(RECOVERY_WORLD_WAR_SCENARIO);c.step(3);c.locateHero('caricas');const b=c.snapshot().engagements[0];c.joinBattle(b.id,b.location);
  assert(!c.snapshot().pending.duelAvailable);assert.equal(c.chooseDuel(b.id,'west').ok,false);
  assert(c.resolveEncounter(b.id,'west','success','vanguard-broken',3).ok);
  assert.deepEqual(replayCampaign(RECOVERY_WORLD_WAR_SCENARIO,c.snapshot()).snapshot(),c.snapshot());
});

test('duel can be won through ordinary dodge/counter inputs, with three readable attacks and a living yielding champion',()=>{
  const m=createLizeemEncounter({duel:{name:'Test captain'},heroStart:{x:0,z:0},guardStarts:[{x:0,z:-7}],move:(a,x,z)=>({x:a.x+x,z:a.z+z})});
  let s=m.snapshot();const attacks=new Set();
  for(let i=0;i<7200&&!s.outcome;i++){s=m.tick(1/60,encounterAutoplayInput(s));if(s.guards[0].phase==='windup')attacks.add(s.guards[0].attack);}
  assert.equal(s.outcome,'success');assert(s.hero.hp>0);assert(s.time<120);assert(s.time>15);
  assert.deepEqual([...attacks].sort(),['overhead','sweep','thrust']);assert(s.guards[0].yielded);assert.equal(s.objective.reason,'champion-yielded');
  assert.equal(m.fireballHit(0,26),false,'Cannot attack a yielded champion');
});

test('fireballs damage the champion without cancelling committed attacks; timeout and death terminate cleanly',()=>{
  const options={duel:{name:'Test captain'},heroStart:{x:0,z:0},guardStarts:[{x:0,z:-1.8}]};
  const m=createLizeemEncounter(options);let s=m.tick(.05);assert.equal(s.guards[0].phase,'windup');
  assert(m.fireballHit(0,26));s=m.snapshot();assert.equal(s.guards[0].hp,174);assert.equal(s.guards[0].phase,'windup');
  for(let i=0;i<3000&&!s.outcome;i++)s=m.tick(.05);assert.equal(s.hero.hp,0);assert.equal(s.objective.reason,'driven-back');
  const idle=createLizeemEncounter({...options,move:a=>a,guardStarts:[{x:0,z:-7}]});s=idle.snapshot();for(let i=0;i<2500&&!s.outcome;i++)s=idle.tick(.05);
  assert.equal(s.outcome,'defeat');assert.equal(s.objective.reason,'time-expired');
});

test('death checkpoint rewinds the challenge choice and saves without accumulating casualties',()=>{
  const {w,b,c}=opening(),exploration={version:1,character:'teresod',position:{...b.location,y:2},heading:0,camera:{yaw:0,pitch:.3,distance:8},elapsed:0,cells:[]};
  const save=()=>({format:WORLD_WAR_KEY,version:1,exploration,...w.checkpoint(),tower:{version:1,location:'world',briefed:true,running:false}});
  const before=save();c.chooseDuel(b.id,'west');c.resolveEncounter(b.id,'west','defeat','driven-back',0);w.advance(2);
  const data={...save(),afterlife:{version:1,form:'living',inLimbo:true,death:{battleId:b.id,stage:'intercept',approach:'duel',side:'west',previousForm:'living',fallen:exploration.position,before,report:'A duel death.'}}};
  assert.match(deathReport(w.snapshot(),b.id,WORLD_WAR_SCENARIO),/challenge ended without a morale advantage/);
  assert.doesNotMatch(deathReport(w.snapshot(),b.id,WORLD_WAR_SCENARIO),/Your interception/);
  assert(validateWorldWarSave(data));const rewind=createWorldWar(before);assert(!rewind.snapshot().pending.duel);assert(rewind.snapshot().pending.duelAvailable);
  assert(rewind.campaign.chooseDuel(b.id,'west').ok);assert.equal(rewind.snapshot().commands.filter(c=>c.type==='champion-duel').length,1);
  const p=rewind.snapshot().pending,debrief=phaseDebrief(p,{outcome:'success'},{regionName:'Caricas'});assert.match(debrief.detail,/lowers their weapon/);assert.match(debrief.facts[1][1],/two fell back/);
});

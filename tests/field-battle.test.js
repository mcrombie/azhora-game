import test from 'node:test';
import assert from 'node:assert/strict';
import {createAdventureWar} from '../src/experiments/day-night/opening-war.js';
import {createWorldWar,WORLD_WAR_SCENARIO,UNIFIED_WORLD_WAR_SCENARIO} from '../src/app/exploration/world-war.js';
import {replayCampaign} from '../src/simulation/campaign.js';
import {battleApproaches,fieldBattleBrief} from '../src/app/lizeem/battle-approach.js';
import {battlePhase,phaseDebrief} from '../src/app/exploration/battle-progress.js';
import {battleConsequence} from '../src/app/exploration/battle-consequences.js';
import {worldWarReports} from '../src/app/exploration/war-reports.js';
import {createLizeemEncounter} from '../src/gameplay/combat/lizeem-encounter.js';
import {assaultMorale,commanderReports} from '../src/gameplay/combat/commander-morale.js';
import {militiaWeapon} from '../src/gameplay/combat/combat-units.js';
import {encounterAutoplayInput} from '../src/gameplay/autoplay/encounter-input.js';
import {openingBattleTime} from '../src/experiments/day-night/opening-battle-time.js';
import {nextCampaignOpportunity} from '../src/app/exploration/campaign-opportunity.js';
import {campaignGuidance} from '../src/app/exploration/campaign-guidance.js';

function opening(region='caricas'){
  const war=createAdventureWar();if(region==='ovesos')war.advance(2);const c=war.campaign,b=war.snapshot().engagements.find(b=>b.region===region);
  c.locateHero(region);assert(c.joinBattle(b.id,b.location).ok);return {war,c,b,p:c.snapshot().pending};
}
const reports=(p,side,enemyOutcome='routed')=>Object.fromEntries(Object.entries(p.commanders??{}).filter(([,v])=>v.status==='active').map(([f,v])=>[f,{id:v.id,hp:f===side?v.hp:enemyOutcome==='slain'?0:enemyOutcome==='active'?75:1,outcome:f===side?'active':enemyOutcome}]));
const total=s=>s.armies.reduce((n,a)=>n+a.strength,0)+Object.values(s.regions).reduce((n,r)=>n+r.garrison,0);

test('either side joins either opening battlefield as one allied battle, with no fabricated interception',()=>{
  for(const region of ['caricas','ovesos'])for(const side of ['west','east']){
    const {war,c,b,p}=opening(region),before=c.snapshot();
    assert.equal(battleApproaches(p,side)[0],'field');assert(!battleApproaches(p,side).includes('intercept'));
    assert.equal(battlePhase(p).total,1);assert.match(fieldBattleBrief(p,side),/one continuous battle/);
    assert.doesNotMatch(openingBattleTime(p,b),/regroup|phase|assault/);
    assert(c.chooseFieldBattle(p.id,side).ok);let active=c.snapshot().pending;
    assert.equal(total(c.snapshot()),total(before));assert.equal(c.snapshot().engagements.find(e=>e.id===b.id).heroResult,null);
    assert.equal(active.rally.direct,true);assert(active.rally.guards>=4&&active.rally.guards<=12);
    assert(active.rally.supportAllies>=4&&active.rally.supportAllies<=12);
    assert(!c.chooseDuel(active.id,side).ok);assert(c.chooseAssault(active.id,'allied').ok);active=c.snapshot().pending;
    assert(c.resolveEncounter(active.id,side,'success','rally-secured',active.rally.guards,{escaped:0,alliesLost:1,routed:1,allyDamage:160,commanders:reports(active,side)}).ok);
    const state=war.snapshot(),battle=state.engagements.find(e=>e.id===b.id);
    assert.equal(state.regions[region].owner,side);assert.equal(battle.status,'resolved');assert.equal(war.clock().elapsedSeconds,b.endsAt);
    const other=state.engagements.find(e=>e.id!==b.id);assert(other);
    assert.equal(other.status,region==='ovesos'?'resolved':'active','The other front progresses during the completed battle');
    assert(!state.events.some(e=>e.type==='reinforcements-intercepted'));assert.equal(state.pending,null);
    assert.deepEqual(createAdventureWar(war.checkpoint()).snapshot(),state);
    assert.doesNotMatch(battleConsequence(state,battle).contribution,/intercept|reinforcement/i);
    assert.doesNotMatch(worldWarReports(state,UNIFIED_WORLD_WAR_SCENARIO,()=>true).find(r=>r.battleId===b.id).detail,/interception/i);
  }
});

test('declining commits nothing; withdrawal preserves casualties, allies and commander wounds through save and re-entry',()=>{
  const {war,c,b,p}=opening(),before=c.snapshot();
  assert(c.resolveEncounter(p.id,null,'withdraw','declined',0).ok);assert.deepEqual(c.snapshot().engagements,before.engagements);
  assert(c.joinBattle(b.id,b.location).ok);assert(c.chooseFieldBattle(p.id,'west').ok);
  let active=c.snapshot().pending;assert(c.chooseAssault(active.id,'allied').ok);active=c.snapshot().pending;
  const guards=active.rally.guards,allies=active.rally.allied.totalAllies;
  assert(c.resolveEncounter(active.id,'west','withdraw','withdrew',2,{escaped:0,alliesLost:1,routed:0,allyDamage:80,commanders:reports(active,'west','active')}).ok);
  const restored=createAdventureWar(war.checkpoint()),rc=restored.campaign;assert(rc.joinBattle(b.id,b.location).ok);active=rc.snapshot().pending;
  assert.equal(active.rally.guards,guards-2);assert.equal(active.rally.allied.totalAllies-active.rally.allied.lost,allies-1);assert.equal(active.commanders.east.hp,75);
  assert.equal(battlePhase(active).total,1);assert.deepEqual(battleApproaches(active,'west'),['field']);
  const next=nextCampaignOpportunity(rc.snapshot(),UNIFIED_WORLD_WAR_SCENARIO,[],()=>true,{side:'west'});
  assert.equal(next.direct,true);assert.match(campaignGuidance(next).title,/Rejoin the battle/);
  const snapshot=rc.snapshot();assert(!rc.chooseFieldBattle(active.id,'east').ok);assert(!rc.chooseDuel(active.id,'west').ok);assert.deepEqual(rc.snapshot(),snapshot);
});

test('optional champion belongs to the opposing army and a duel leads into the same larger battle',()=>{
  for(const outcome of ['success','withdraw']){
    const {war,c,b,p}=opening(),side='west';assert.deepEqual(battleApproaches(p,side),['field','duel']);
    assert(c.chooseDuel(p.id,side,true).ok);const duel=c.snapshot().pending,formation=duel.duel.fieldBattle;
    assert(formation.guards>=4);assert(c.resolveEncounter(p.id,side,outcome,outcome==='success'?'champion-yielded':'withdrew',0).ok);
    assert(c.joinBattle(b.id,b.location).ok);const next=c.snapshot().pending;
    assert.equal(next.rally.direct,true);assert.equal(next.rally.guards,formation.guards-(outcome==='success'?2:0));assert.equal(next.rally.supportAllies,formation.allies);
    assert.deepEqual(battleApproaches(next,side),['field']);assert.deepEqual(createAdventureWar(war.checkpoint()).snapshot(),war.snapshot());
  }
  const {p}=opening();for(const status of ['slain','captured','routed']){
    const missing=structuredClone(p);missing.commanders.east.status=status;
    assert.deepEqual(battleApproaches(missing,'west'),['field']);assert.deepEqual(battleApproaches(missing,'east'),['field','duel']);
  }
  const noCaptain=opening('ovesos').p;assert.deepEqual(battleApproaches(noCaptain,'west'),['field']);
});

test('old in-progress interception commands still replay, and roadside contact remains a separate encounter',()=>{
  const w=createWorldWar();w.advance(3);const c=w.campaign,b=c.snapshot().engagements[0];c.locateHero(b.region);assert(c.joinBattle(b.id,b.location).ok);
  assert(c.resolveEncounter(b.id,'west','withdraw','withdrew',1,{escaped:0}).ok);assert(c.joinBattle(b.id,b.location).ok);
  const p=c.snapshot().pending;assert.equal(p.fieldBattleAvailable,undefined);assert(!c.chooseFieldBattle(p.id,'west').ok);
  assert.deepEqual(replayCampaign(WORLD_WAR_SCENARIO,c.snapshot()).snapshot(),c.snapshot());
  assert.deepEqual(battleApproaches({kind:'roadside'},'west'),['intercept']);assert.equal(battlePhase({kind:'roadside'}).title,'Roadside interception');
});

test('a direct battle debrief never claims an earlier interception',()=>{
  const {c,p}=opening();assert(c.chooseFieldBattle(p.id,'west').ok);const active=c.snapshot().pending;
  const result=phaseDebrief(active,{guards:[],outcome:'success'},{regionName:'Caricas',allyName:'West Lizeem',clock:{sharedOpening:true,elapsedSeconds:0}});
  assert.equal(result.title,'Battle won / Caricas');assert.doesNotMatch(JSON.stringify(result),/interception/i);
});

test('full formations use real militia combat and their results can be recorded for either league at either front',()=>{
  for(const region of ['caricas','ovesos'])for(const side of ['west','east']){
    const {war,c,p}=opening(region);assert(c.chooseFieldBattle(p.id,side).ok);assert(c.chooseAssault(c.snapshot().pending.id,'allied').ok);
    const active=c.snapshot().pending,enemy=side===active.attacker?active.defender:active.attacker;
    const formation=(n,z,direction)=>Array.from({length:n},(_,i)=>({x:(i%6-(Math.min(6,n-Math.floor(i/6)*6)-1)/2)*3,z:z+Math.floor(i/6)*3.2*direction,unitType:'militiaman',weapon:militiaWeapon(i)}));
    const guards=formation(active.rally.guards,-8,-1),allies=formation(active.rally.allied.totalAllies,0,1);
    if(active.commanders[enemy]?.status==='active')guards.push({x:9,z:-10,commander:active.commanders[enemy]});
    if(active.commanders[side]?.status==='active')allies.push({x:9,z:0,commander:active.commanders[side]});
    const model=createLizeemEncounter({fieldBattle:true,guardStarts:guards,allyStarts:allies,heroStart:{x:0,z:8},rallyPoint:{x:0,z:-3},morale:assaultMorale(active,side),move:(p,x,z)=>({x:p.x+x,z:p.z+z})});
    let s=model.snapshot();for(let i=0;i<10900&&!s.outcome;i++)s=model.tick(1/60,encounterAutoplayInput(s));
    assert(s.outcome,`${region}/${side} reaches a result`);
    assert(c.resolveEncounter(active.id,side,s.outcome,s.objective.reason,s.guards.filter(g=>!g.commanderId&&(!g.hp||g.routed)).length,{escaped:0,alliesLost:s.squad.alliesLost,routed:s.squad.routed,allyDamage:s.squad.damageByAllies,commanders:commanderReports(s)}).ok);
    assert.equal(war.clock().elapsedSeconds,active.endsOn*60);assert.deepEqual(createAdventureWar(war.checkpoint()).snapshot(),war.snapshot());
  }
});

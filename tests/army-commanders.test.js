import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorldWar,WORLD_WAR_SCENARIO,DUEL_WORLD_WAR_SCENARIO} from '../src/app/exploration/world-war.js';
import {createCampaign,replayCampaign} from '../src/simulation/campaign.js';
import {createLizeemEncounter} from '../src/gameplay/combat/lizeem-encounter.js';
import {commanderReports,assaultMorale} from '../src/gameplay/combat/commander-morale.js';
import {encounterAutoplayInput} from '../src/gameplay/autoplay/encounter-input.js';
import {worldWarArmies} from '../src/app/exploration/war-armies.js';
import {sourceModule} from './module-loader.js';
import {militiaWeapon} from '../src/gameplay/combat/combat-units.js';
const opening=()=>{const w=createWorldWar();w.advance(3);w.syncRegion('Caricas');const b=w.snapshot().engagements[0];assert(w.campaign.joinBattle(b.id,b.location).ok);return {w,c:w.campaign,b};};
function assault(side='west'){const o=opening();assert(o.c.resolveEncounter(o.b.id,side,'success','vanguard-broken',3).ok);assert(o.c.joinBattle(o.b.id,o.b.location).ok);assert(o.c.chooseAssault(o.c.snapshot().pending.id,'allied').ok);return {...o,p:o.c.snapshot().pending};}
const reports=(p,side,enemy='routed')=>Object.fromEntries(Object.entries(p.commanders).filter(([,c])=>c.status==='active').map(([f,c])=>[f,{id:c.id,hp:f===side?c.hp:enemy==='slain'?0:1,outcome:f===side?'active':enemy}]));
const sum=s=>s.armies.reduce((n,a)=>n+a.strength,0)+Object.values(s.regions).reduce((n,r)=>n+r.garrison,0);
function arena(p,side){const enemy=side===p.attacker?p.defender:p.attacker;
  const guards=Array.from({length:p.rally.guards},(_,i)=>({x:(i-1)*3,z:-8,unitType:'militiaman',weapon:militiaWeapon(i)}));
  if(p.commanders[enemy]?.status==='active')guards.push({x:6,z:-9,commander:p.commanders[enemy]});
  const allies=Array.from({length:p.rally.allied.totalAllies},(_,i)=>({x:(i-1)*3,z:0,unitType:'militiaman',weapon:militiaWeapon(i)}));
  if(p.commanders[side]?.status==='active')allies.push({x:6,z:0,commander:p.commanders[side]});
  return createLizeemEncounter({guardStarts:guards,allyStarts:allies,heroStart:{x:0,z:4},rallyPoint:{x:0,z:0},morale:assaultMorale(p,side),move:(p,x,z)=>({x:p.x+x,z:p.z+z})});
}

test('withdrawal and Save/Continue do not replenish morale spent on regular casualties',()=>{
  for(const side of ['west','east']){
    const {c,b,p}=assault(side);
    assert(c.resolveEncounter(p.id,side,'withdraw','withdrew',2,{escaped:0,alliesLost:1,routed:1,allyDamage:40,commanders:reports(p,side,'active')}).ok);
    const restored=replayCampaign(WORLD_WAR_SCENARIO,c.snapshot());assert(restored.joinBattle(b.id,b.location).ok);
    const next=restored.snapshot().pending,modifiers=assaultMorale(next,side);
    assert.deepEqual(modifiers,{allies:-8,enemies:-8},'One killed soldier per side; the routed survivor is not another casualty');
    const s=arena(next,side).snapshot();assert.equal(s.morale.allies,57);assert.equal(s.morale.enemies,57,'Correct even before the first combat step');
  }
});

test('active support changes the commander-led opening from defeat to victory for either league',()=>{
  for(const side of ['west','east']){
    const {p}=assault(side),run=active=>{const m=arena(p,side);let s=m.snapshot();for(let i=0;i<7300&&!s.outcome;i++)s=m.tick(1/60,active?encounterAutoplayInput(s):{});return s;};
    const idle=run(false),active=run(true);
    assert.equal(idle.outcome,'defeat');assert.equal(active.outcome,'success');
    assert(active.squad.damageByHero>0&&active.squad.damageByAllies>0);
    // Inaction can now kill the hero before the 100-health militia fall. Compare
    // the battle outcome, not casualties at two different termination points.
    assert(active.allies.some(a=>a.hp>0&&!a.escaped),'Active play wins alongside surviving allies');
  }
});
test('opening commanders belong to two real armies; Dain holds Caricas and Voss marches there',()=>{
  const {w,b}=opening(),s=w.snapshot();assert.deepEqual(Object.keys(b.commanders).sort(),['east','west']);
  for(const [f,c] of Object.entries(b.commanders)){const army=s.armies.find(a=>a.id===c.armyId);assert.equal(army.commander.id,c.id);assert.equal(army.owner,f);assert.match(army.name,new RegExp(c.name));}
  const projected=worldWarArmies(s,WORLD_WAR_SCENARIO);assert.equal(projected.filter(a=>a.detail.includes('Commander:')).length,2);
  const old=createCampaign(DUEL_WORLD_WAR_SCENARIO);old.step(3);assert(old.snapshot().armies.every(a=>!a.commander));
});
test('either commander can be challenged in the first battle; winning routes that army commander and shifts both sides morale',()=>{
  for(const side of ['west','east']){const {c,b}=opening(),enemy=side==='west'?'east':'west';
    assert(c.chooseDuel(b.id,side).ok);assert(c.resolveEncounter(b.id,side,'success','champion-yielded',0).ok);
    const s=c.snapshot(),e=s.engagements[0];assert.equal(e.commanders[enemy].status,'routed');assert.deepEqual(e.morale,{west:side==='west'?20:-20,east:side==='east'?20:-20});
    assert.equal(s.armies.find(a=>a.id===e.commanders[enemy].armyId).commander.status,'routed');
    assert(c.joinBattle(b.id,b.location).ok);assert(!c.chooseDuel(c.snapshot().pending.id,side).ok);
    assert.deepEqual(replayCampaign(WORLD_WAR_SCENARIO,c.snapshot()).snapshot(),c.snapshot());
  }
});
test('a commander cannot be bypassed by claiming ordinary soldier kills or forged progress',()=>{
  const {c,p}=assault(),before=c.snapshot();
  for(const commanders of [undefined,{},reports(p,'west','active'),{...reports(p,'west'),east:{id:'wrong',hp:1,outcome:'routed'}}]){
    assert(!c.resolveEncounter(p.id,'west','success','rally-secured',p.rally.guards,{escaped:0,commanders}).ok);assert.deepEqual(c.snapshot(),before);
  }
});
test('withdrawal preserves commander wounds, a routed commander is not a kill, and a slain commander cannot respawn',()=>{
  for(const fate of ['routed','slain']){const {c,b,p}=assault();const wounded=reports(p,'west');wounded.east={id:p.commanders.east.id,hp:75,outcome:'active'};
    const before=sum(c.snapshot());assert(c.resolveEncounter(p.id,'west','withdraw','withdrew',1,{escaped:0,alliesLost:0,routed:0,allyDamage:30,commanders:wounded}).ok);
    assert.equal(sum(c.snapshot()),before-1);assert(c.joinBattle(b.id,b.location).ok);let next=c.snapshot().pending;assert.equal(next.commanders.east.hp,75);
    const final=reports(next,'west',fate);assert(c.resolveEncounter(next.id,'west','success','rally-secured',next.rally.guards,{escaped:0,alliesLost:0,routed:1,allyDamage:30,commanders:final}).ok);
    let s=c.snapshot();assert.equal(s.engagements[0].rally.removed,2,'Routed regular is not removed, commander is not charged as another soldier');assert.equal(s.engagements[0].commanders.east.status,fate);
    assert.deepEqual(replayCampaign(WORLD_WAR_SCENARIO,s).snapshot(),s);
    c.step(20);s=c.snapshot();assert.equal(s.armies.filter(a=>a.commander?.id===p.commanders.east.id).length,1,'No reincarnation in later levies');
    if(fate==='slain')assert.equal(s.armies.find(a=>a.commander?.id===p.commanders.east.id).commander.status,'slain');
  }
});
test('combined fights require a real captain fight and can be won with ordinary autoplay inputs for either side',()=>{
  for(const side of ['west','east']){const {c,p}=assault(side),m=arena(p,side);let s=m.snapshot();
    assert.equal(s.guards.filter(g=>g.commanderId).length,1);assert.equal(s.allies.filter(g=>g.commanderId).length,1);
    for(let i=0;i<7300&&!s.outcome;i++)s=m.tick(1/60,encounterAutoplayInput(s));
    assert.equal(s.outcome,'success',JSON.stringify({side,time:s.time,hp:s.hero.hp,guards:s.guards.map(g=>[g.name,g.hp,g.routed])}));
    const report=commanderReports(s),enemy=side==='west'?'east':'west';assert.notEqual(report[enemy].outcome,'active');
    assert(s.morale.notice.includes(p.commanders[enemy].name));
    assert(c.resolveEncounter(p.id,side,s.outcome,s.objective.reason,s.guards.filter(g=>!g.commanderId&&(!g.hp||g.routed)).length,{escaped:0,alliesLost:s.squad.alliesLost,routed:s.squad.routed,allyDamage:s.squad.damageByAllies,commanders:report}).ok);
    assert.equal(c.snapshot().regions.caricas.owner,side);assert.deepEqual(replayCampaign(WORLD_WAR_SCENARIO,c.snapshot()).snapshot(),c.snapshot());
  }
});
test('captain death swings morale, enables a rout, and routed captains finish evacuating even if blocked',()=>{
  const {p}=assault(),m=arena(p,'west');let s=m.snapshot(),captain=s.guards.find(g=>g.commanderId);
  m.fireballHit(captain.id,200);s=m.tick(.01);assert.equal(s.morale.enemies,45);assert.equal(s.morale.allies,85);assert.match(s.morale.notice,/Serevan Dain has fallen/);
  const ordinary=s.guards.filter(g=>!g.commanderId);for(const g of ordinary.slice(0,2))m.fireballHit(g.id,g.maxHp);s=m.tick(.01);assert(s.guards.some(g=>g.routed));
  const routed=arena(p,'west');s=routed.snapshot();for(const g of s.guards)routed.fireballHit(g.id,g.commanderId?145:g.maxHp);s=routed.tick(.01);assert(s.guards.find(g=>g.commanderId).routed);assert.equal(commanderReports(s).east.outcome,'routed');
  for(let i=0;i<400;i++){s=routed.tick(.1);if(s.outcome)s=routed.aftermath(.1);}assert(s.guards.find(g=>g.commanderId).departed);
});
test('captain appearances have different silhouettes and retain working articulated weapon rigs',async()=>{
  const {createLizeemCommander}=await sourceModule('../src/content/characters/lizeem-commanders.js');
  const {disposeCharacter}=await sourceModule('../src/content/characters/characters.js');
  for(const side of ['west','east']){const a=createLizeemCommander(side);assert(a.group.getObjectByName(side==='west'?'Oak leaf of Ovesos':'Ivory transverse crest'));a.animate(1,2,true,{action:'attack',progress:.5});assert(a.setWeapon('simple-sword'));let meshes=0;a.group.traverse(m=>{if(m.isMesh)meshes++;});assert(meshes<80,'Bounded captain geometry');disposeCharacter(a);}
});


test('refusing the invitation changes no commander; losing a duel leaves the captain in the combined fight',()=>{
  const {c,b}=opening(),before=c.snapshot();
  assert(c.resolveEncounter(b.id,null,'withdraw','declined',0).ok);
  assert.deepEqual(c.snapshot().armies,before.armies);assert.deepEqual(c.snapshot().engagements,before.engagements);
  assert(c.joinBattle(b.id,b.location).ok);assert(c.chooseDuel(b.id,'west').ok);
  assert(c.resolveEncounter(b.id,'west','withdraw','withdrew',0).ok);
  assert(c.joinBattle(b.id,b.location).ok);const p=c.snapshot().pending;
  assert.equal(p.stage,'rally');assert.equal(p.commanders.east.status,'active');assert.deepEqual(p.morale,{west:-10,east:10});
  assert(!c.chooseAssault(p.id,'solo').ok);assert(c.chooseAssault(p.id,'allied').ok);
  assert.deepEqual(replayCampaign(WORLD_WAR_SCENARIO,c.snapshot()).snapshot(),c.snapshot());
});

test('unattended war and interventions for either league finish with persistent, army-specific leaders',()=>{
  for(const side of [null,'west','east']){
    const c=createCampaign(WORLD_WAR_SCENARIO);let fights=0;
    while(!c.snapshot().winner&&c.snapshot().day<150){
      const s=c.snapshot(),b=s.engagements.find(b=>b.status==='active'&&!b.heroResult);
      if(side&&b){
        c.locateHero(b.region);assert(c.joinBattle(b.id,b.location).ok);
        assert(c.resolveEncounter(b.id,side,'success','vanguard-broken',3).ok);
        assert(c.joinBattle(b.id,b.location).ok);let p=c.snapshot().pending;
        assert(c.chooseAssault(p.id,'allied').ok);p=c.snapshot().pending;
        assert(c.resolveEncounter(p.id,side,'success','rally-secured',p.rally.guards,{commanders:reports(p,side)}).ok);fights++;
      }else c.step();
    }
    const s=c.snapshot();assert(s.winner,'Campaign reaches a settlement');if(side){assert.equal(s.winner,side);assert(fights>=2);}
    for(const id of ['meret-voss','serevan-dain'])assert.equal(s.armies.filter(a=>a.commander?.id===id).length,1);
    for(const a of s.armies.filter(a=>a.commander&&a.status==='destroyed'))assert(['captured','slain'].includes(a.commander.status));
    for(const b of s.engagements)for(const leader of Object.values(b.commanders??{})){
      assert(b.attackingIds.includes(leader.armyId)||s.events.find(e=>e.id===b.resultId)?.defendingIds.includes(leader.armyId),'Leader fights only with their actual army');
    }
    assert.deepEqual(replayCampaign(WORLD_WAR_SCENARIO,s).snapshot(),s);
  }
});

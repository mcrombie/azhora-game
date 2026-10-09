import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorldWar,WORLD_WAR_SCENARIO,worldWarProjection} from '../src/app/exploration/world-war.js';
import {campaignChronicle} from '../src/app/exploration/campaign-chronicle.js';
import {councilPeaceWords,residentPeaceWords} from '../src/app/exploration/league-settlement.js';
import {councilInfluence} from '../src/app/exploration/council-state.js';
import {RESIDENT_CONVERSATIONS} from '../src/content/regions/minora-frontier/resident-conversations.js';

test('actual interception and allied assault replay with original contributions and ownership',()=>{
  const w=createWorldWar();w.advance(3);w.syncRegion('Caricas');const b=w.snapshot().engagements.find(b=>b.region==='caricas');
  assert(w.campaign.joinBattle(b.id,b.location).ok);
  assert(w.campaign.resolveEncounter(b.id,'west','success','vanguard-broken',3).ok);
  assert(w.campaign.joinBattle(b.id,b.location).ok);assert(w.campaign.chooseAssault(w.snapshot().pending.id,'allied').ok);
  const p=w.snapshot().pending;
  assert(w.campaign.resolveEncounter(p.id,'west','success','rally-secured',p.rally.guards,{escaped:0,alliesLost:1,routed:1,allyDamage:30}).ok);
  const before=w.snapshot(),replay=campaignChronicle(before),text=replay.frames.map(f=>f.caption).join('\n');
  assert.match(text,/12 reinforcement strength removed/);assert.match(text,/1 allies lost; 1 enemies routed, not killed/);
  assert.match(text,/Your final assault decided this field/);
  assert.equal(replay.frames.find(f=>f.day===3).owners.caricas,'east');assert.equal(replay.frames.find(f=>f.day===6).owners.caricas,'west');
  assert(replay.frames.some(f=>f.routes.some(r=>r.from==='nethereum'&&r.to==='caricas')));
  assert(replay.frames.some(f=>f.battles.some(b=>b.region==='caricas')));
  assert.deepEqual(w.snapshot(),before);assert.deepEqual(campaignChronicle(createWorldWar(w.checkpoint()).snapshot()),replay);
  replay.frames[0].owners.caricas='invalid';assert.equal(before.regions.caricas.owner,'west');
});
test('either winner creates the same country with its colors and different council and resident memories',()=>{
  for(const side of ['east','west']){
    const w=createWorldWar();w.campaign.reinforce(side==='west'?'nethereum':'caricas',500);w.advance(200);
    const s=w.snapshot(),before=structuredClone(s);assert.equal(s.winner,side);
    const projection=worldWarProjection(s),f=projection.factions.find(f=>f.id===side);
    assert.equal(f.name,'Lizeemi League');assert.equal(f.short,'Lizeemi League');
    assert.equal(f.color,WORLD_WAR_SCENARIO.factions.find(f=>f.id===side).color);
    assert(Object.values(projection.regions).every(r=>r.owner===side));
    assert.equal(councilInfluence(s).leader,side==='west'?'mayor':'temple');
    for(const id of Object.keys(RESIDENT_CONVERSATIONS))assert.match(residentPeaceWords(id,s),/Lizeemi League/);
    assert.match(councilPeaceWords('mayor',s),side==='west'?/I lead this council/:/My friends in Ovesos lost/);
    assert.match(councilPeaceWords('temple',s),side==='east'?/I now lead/:/Nesdor mourns/);
    const replay=campaignChronicle(s);assert.match(replay.frames.at(-1).caption,/Lizeemi League/);
    assert(Object.values(replay.frames.at(-1).owners).every(o=>o===side));
    assert.equal(replay.frames[0].owners.isareos,'minora');assert.equal(replay.frames[0].owners.nethereum,'west');assert.equal(replay.frames[0].owners.caricas,'east');
    assert.match(replay.frames.map(f=>f.caption).join(' '),/testing intervention added 500/);
    assert.deepEqual(s,before);assert.deepEqual(campaignChronicle(createWorldWar(w.checkpoint()).snapshot()),replay);
  }
});
test('ongoing campaign review is honest about the present and does not invent a winner',()=>{
  const w=createWorldWar();w.advance(3);const before=w.checkpoint(),replay=campaignChronicle(w.snapshot());
  assert.equal(replay.frames.at(-1).day,3);assert.match(replay.frames.at(-1).caption,/still underway/);
  assert(replay.frames.every(f=>!f.winner&&f.day<=3));assert.equal(residentPeaceWords('portunus',w.snapshot()),null);
  assert.deepEqual(w.checkpoint(),before);
});

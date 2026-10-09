import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorldWar,WORLD_WAR_SCENARIO as scenario,ENTRY_WORLD_WAR_SCENARIO} from '../src/app/exploration/world-war.js';
import {createCampaign} from '../src/simulation/campaign.js';
import {availableBattleStage} from '../src/simulation/battle-stages.js';
import {nextCampaignOpportunity} from '../src/app/exploration/campaign-opportunity.js';
import {worldWarArmies} from '../src/app/exploration/war-armies.js';
import {talethLetters,talethFinale} from '../src/app/exploration/taleth-correspondence.js';
import {councilInfluence} from '../src/app/exploration/council-state.js';

const advice=(w,known=()=>true,armies=worldWarArmies(w.snapshot(),scenario))=>nextCampaignOpportunity(w.snapshot(),scenario,armies,known);
function finish(w,side){
  const s=w.snapshot(),b=s.engagements.find(b=>availableBattleStage(b));
  assert(b);w.campaign.locateHero(b.region);assert(w.campaign.joinBattle(b.id,b.location).ok);
  const p=w.snapshot().pending;assert(p);
  assert(w.campaign.resolveEncounter(p.id,side,'success',p.rally?'rally-secured':'vanguard-broken',p.rally?p.rally.guards:p.participation?.guards??3).ok);
  return b.region;
}

test('both allegiances can finish a complete four-province war with consistent results and replay',()=>{
  const visited=new Set();
  for(const side of ['west','east']){
    const w=createWorldWar();let phases=0,finalAssaults=0;
    while(!w.snapshot().winner&&w.snapshot().day<100){
      const before=w.snapshot();
      if(before.engagements.some(b=>availableBattleStage(b))){
        const region=finish(w,side);visited.add(region);phases++;
        const after=w.snapshot(),ended=after.events.slice(before.events.length).find(e=>e.type==='battle');
        if(ended){finalAssaults++;assert.equal(ended.resolution,'rally-rout');assert.equal(after.regions[region].owner,side);assert.equal(ended.day,after.day);}
      }else w.advance();
      assert.deepEqual(createWorldWar(w.checkpoint()).snapshot(),w.snapshot(),'Midwar/finished replay is exact');
    }
    const s=w.snapshot();assert.equal(s.winner,side);assert.equal(phases,finalAssaults*2);
    assert(s.day<=40&&finalAssaults<=8,'Active help ends this authored opening in a manageable number of battles');
    assert.equal(councilInfluence(s).faction,side);assert(talethLetters(s).at(-1).finale);assert.equal(advice(w).kind,'finale');
    assert(JSON.stringify(talethFinale(s)).includes(side==='west'?'West Lizeem':'East Lizeem'));
  }
  assert.deepEqual([...visited].sort(),['caricas','nesdor','nethereum','ovesos']);
});

test('existing v6 saves keep their original two-region battle rules and exact replay',()=>{
  const c=createCampaign(ENTRY_WORLD_WAR_SCENARIO);c.watchBattles(true);c.step(3);
  let b=c.snapshot().engagements.find(b=>b.status==='active');c.locateHero(b.region);assert(c.joinBattle(b.id,b.location).ok);assert(c.resolveEncounter(b.id,'west','success','vanguard-broken',3).ok);
  const w=createWorldWar({simulation:c.snapshot(),fraction:0,speed:1});assert.deepEqual(w.snapshot(),c.snapshot());
  assert.equal(w.snapshot().scenario,'lizeem-world-v6');
  assert(!ENTRY_WORLD_WAR_SCENARIO.regions.find(r=>r.id==='nesdor').rallyAssault);
  assert(!ENTRY_WORLD_WAR_SCENARIO.regions.find(r=>r.id==='nethereum').interceptionStrength);
  c.step(70);w.advance(70);assert.deepEqual(w.snapshot(),c.snapshot());
});

test('fresh assault support fits the opposition without changing old squads or replenishing a withdrawal',()=>{
  for(const definition of [scenario,ENTRY_WORLD_WAR_SCENARIO])for(const stopped of [2,3]){
    const c=createCampaign(definition);c.step(3);c.locateHero('caricas');const b=c.snapshot().engagements[0];
    assert(c.joinBattle(b.id,b.location).ok);
    assert(c.resolveEncounter(b.id,'west',stopped===3?'success':'defeat',stopped===3?'vanguard-broken':'runner-arrived',stopped,{escaped:3-stopped}).ok);
    assert(c.joinBattle(b.id,b.location).ok);let p=c.snapshot().pending;
    const expected=definition===scenario&&stopped===3?2:3;
    if(definition===scenario)assert.equal(p.rally.supportAllies,expected);else assert.equal(p.rally.supportAllies,undefined);
    assert(c.chooseAssault(p.id,'allied').ok);assert.equal(c.snapshot().pending.rally.allied.totalAllies,expected);
    assert(c.resolveEncounter(p.id,'west','withdraw','withdrew',1,{alliesLost:1}).ok);
    assert(c.joinBattle(b.id,b.location).ok);p=c.snapshot().pending;
    assert.equal(p.rally.allied.totalAllies-p.rally.allied.lost,expected-1);
    const w=createWorldWar({simulation:c.snapshot(),fraction:0,speed:1});assert.deepEqual(w.snapshot(),c.snapshot());
  }
});

test('live guidance preserves decisions, reflects a withdraw/re-entry, and never reveals hidden fronts',()=>{
  const w=createWorldWar();assert.equal(advice(w).kind,'briefing');w.advance(1);assert.equal(advice(w).kind,'army');
  assert.equal(advice(w,()=>false,[]).kind,'regroup');
  const physical=worldWarArmies(w.snapshot(),scenario).map(a=>({...a,route:null,physical:true}));assert.equal(advice(w,()=>true,physical).kind,'army','Visible road column remains trackable without a schematic route');
  assert.equal(advice(w,()=>false,physical.map(a=>({...a,arrives:null}))).kind,'regroup');
  const marks=worldWarArmies(w.snapshot(),scenario).map(a=>({...a,route:null,arrives:null}));assert.equal(advice(w,()=>false,marks).kind,'regroup');
  w.advance(2);const before=w.snapshot(),next=advice(w);assert.equal(next.kind,'battle');assert.equal(next.region,'caricas');assert.deepEqual(w.snapshot(),before);
  w.campaign.locateHero('caricas');const b=before.engagements.find(b=>b.id===next.target.id);w.campaign.joinBattle(b.id,b.location);assert(w.campaign.resolveEncounter(b.id,null,'withdraw','declined',0).ok);
  assert.equal(advice(w).target.id,b.id,'Declining does not remove the opportunity');finish(w,'east');
  assert.equal(advice(w).side,'east');assert.match(advice(w).detail,/Finish the assault/);assert.equal(advice(w,()=>false,[]).kind,'regroup');
  finish(w,'east');const originalLetters=talethLetters(w.snapshot());
  assert(!advice(w).target||advice(w).target.id!==b.id,'Resolved battle is not offered');
  for(let i=0;i<8&&advice(w).kind!=='battle';i++)w.advance();
  assert.equal(advice(w).side,'east','Live guidance remembers the player’s choice without automatically enlisting');
  assert.deepEqual(talethLetters(w.snapshot()).filter(l=>originalLetters.some(o=>o.id===l.id)),originalLetters,'Historical letters do not rewrite themselves to reflect a newer front');
});

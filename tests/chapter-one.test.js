import test from 'node:test';
import assert from 'node:assert/strict';
import {PLAYABLE,companyFor} from '../src/player-characters.js';
import {freshChapterOne,validChapterOne,chapterOneEncounter,chapterOneObjective,CHAPTER_ONE_REPORTS} from '../src/chapter-one.js';
import {createCombat} from '../src/combat.js';
import {createBorderChapter} from '../src/border-chapter.js';
import {chooseReply,planGoal} from '../src/autopilot.js';

function fixture(seed=0,side='empire'){
  const config=chapterOneEncounter('cromb',side,seed),position={x:config.center.x+60,z:config.center.z,y:2},events=[];
  const combat=createCombat({world:{bounds:{minX:-5000,maxX:5000,minZ:-5000,maxZ:5000},colliders:[],heightAt:()=>2},position,onEvent:e=>events.push(e)});
  assert.ok(combat.startEncounter(config));return {combat,position,events};
}
function finish(f){for(let i=0;i<100*60&&!f.events.some(e=>e.type==='army-result');i++)f.combat.update(1/60);return f.events.find(e=>e.type==='army-result');}
test('all eleven choices produce ten other mercenaries and ten legionaries versus twenty Coalition soldiers',()=>{
  for(const p of PLAYABLE)for(const side of ['empire','coalition']){
    const c=chapterOneEncounter(p.id,side),imperial=side==='empire'?c.allies:c.enemies;
    assert.equal(c.allies.length,20);assert.equal(c.enemies.length,20);
    assert.deepEqual(imperial.slice(0,10).map(a=>a.id),companyFor(p.id).map(a=>a.id));
    if(p.roster)assert.ok(!imperial.some(a=>a.id===p.roster));
  }
});
test('spectator battles have equal chances, one survivor, and no spectator teleport',()=>{
  const wins={allies:0,enemies:0};
  for(let seed=0;seed<8;seed++){const f=fixture(seed),before={...f.position},r=finish(f);assert.ok(r);wins[r.winner]++;assert.equal(r.allies+r.enemies,1);assert.deepEqual(f.position,before);assert.ok(f.events.some(e=>e.type==='hit'));}
  assert.deepEqual(wins,{allies:4,enemies:4});
});
test('intervening through real combat damage can reverse either seeded outcome',()=>{
  for(const side of ['empire','coalition']){const f=fixture(1,side);const target=f.combat.state.enemies[19];assert.ok(f.combat.spellHit(target.id,1000));const r=finish(f);assert.equal(r?.winner,'allies');}
});
test('the envoy choice and readiness precede the march; not yet cannot launch battle',()=>{
  for(const side of ['empire','coalition']){const b=createBorderChapter();b.start();assert.equal(b.act('march-out').ok,false);b.act('take-legate-terms');b.act('enter-solis');b.act('side-'+side);assert.equal(b.view().stage,'report');assert.equal(b.act('leave-border').ok,false);assert.equal(b.view().stage,'report');b.act('march-out');assert.equal(b.view().stage,'march');}
});
test('victory and commander report do not finish the chapter before the city representative',()=>{
  for(const side of ['empire','coalition']){const s=freshChapterOne();s.winner=side;assert.ok(!s.complete);s.reported=true;assert.deepEqual(chapterOneObjective(s,{side}).destinationIds,[CHAPTER_ONE_REPORTS[side]]);assert.ok(validChapterOne(s));s.complete=true;assert.ok(validChapterOne(s));}
  assert.equal(validChapterOne({...freshChapterOne(),complete:true}),false);
  assert.equal(validChapterOne({...freshChapterOne(),seed:NaN}),false);
});

test('autoplay follows the new chapter and chooses reports instead of falling back to the prologue',()=>{
  const position={x:0,z:0},world={npcPositions:{'post-camp-legate':position,'solis-captain':position,'ambron-legate':{x:50,z:0},'izol-quartermaster':{x:200,z:0}}};
  const c=freshChapterOne();c.winner='empire';
  const s={mode:'playing',questStage:0,position,combat:{phase:'peaceful'},chapterOne:{...c,objective:chapterOneObjective(c,{side:'empire'})},border:{side:'empire'}};
  assert.equal(planGoal(s,world).npcId,'post-camp-legate');
  assert.equal(chooseReply([{id:'chapter-report'},{id:'chapter-later'}],s),'chapter-report');
  c.reported=true;s.chapterOne={...c,objective:chapterOneObjective(c,s.border)};
  assert.equal(planGoal(s,world).npcId,'ambron-legate');
  s.chapterOne.complete=true;assert.equal(planGoal(s,world).kind,'done');
  c.winner='coalition';s.border.side='coalition';s.chapterOne={...c,objective:chapterOneObjective(c,s.border)};
  assert.equal(planGoal(s,world).npcId,'solis-captain');
  s.position={x:201,z:0};assert.equal(planGoal(s,world).npcId,'izol-quartermaster');
});

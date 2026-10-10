import test from 'node:test';
import assert from 'node:assert/strict';
import {planWarTravel} from '../src/gameplay/autoplay/war-travel.js';
import {createLizeemCampaignAutoplay,selectAutoplayBattle,resumeAfterBattleResult} from '../src/gameplay/autoplay/lizeem-campaign-autoplay.js';
import {createRehearsalStore,rehearsalSide} from '../src/app/exploration/rehearsal-store.js';
import {createWorldWar} from '../src/app/exploration/world-war.js';
import {WORLD_WAR_KEY} from '../src/app/exploration/war-checkpoint.js';
import {START} from '../src/app/exploration/checkpoint.js';
import {canStand} from '../src/gameplay/movement/locomotion.js';
import {TALETH_SPOT,TOWER_DOOR} from '../src/app/exploration/tower-state.js';
const world={bounds:{minX:-100,maxX:100,minZ:-100,maxZ:100},heightAt:()=>1,waterAt:()=>0,canExploreAt:()=>true,readyAt:()=>true,nearColliders:()=>[{x:0,z:0,hx:3,hz:12}]};

test('watch route goes around collision and never cuts a corner through it',async()=>{
  const from={x:-20,z:0},to={x:20,z:0},path=await planWarTravel(world,from,to);assert.ok(path?.length>1);
  let last=from;for(const p of path){const steps=Math.ceil(Math.hypot(p.x-last.x,p.z-last.z)/.2);for(let i=1;i<=steps;i++)assert.ok(canStand(last.x+(p.x-last.x)*i/steps,last.z+(p.z-last.z)*i/steps,world,.9));last=p;}
  assert.deepEqual(path.at(-1),to);
});
test('cancelled and forbidden routes yield no movement plan',async()=>{
  assert.equal(await planWarTravel(world,{x:-20,z:0},{x:20,z:0},{cancelled:()=>true}),null);
  assert.equal(await planWarTravel({...world,canExploreAt:()=>false},{x:-20,z:0},{x:20,z:0},{maxNodes:100}),null);
});
test('watch routes avoid soldiers and unrelated active battle areas',async()=>{
  const open={...world,nearColliders:()=>[]},from={x:-25,z:0},to={x:25,z:0},obstacles=[{x:0,z:0,r:8},{x:15,z:8,r:1.45}];
  const path=await planWarTravel(open,from,to,{obstacles});assert.ok(path?.length>1);
  let last=from;for(const p of path){const n=Math.ceil(Math.hypot(p.x-last.x,p.z-last.z)/.2);for(let i=1;i<=n;i++)for(const c of obstacles)assert.ok(Math.hypot(last.x+(p.x-last.x)*i/n-c.x,last.z+(p.z-last.z)*i/n-c.z)>c.r);last=p;}
  assert.deepEqual(await planWarTravel(open,{x:1,z:0},{x:10,z:0},{obstacles:[{x:0,z:0,r:1.45}]}),[{x:10,z:0}]);
});
test('autoplay chooses available battles without changing campaign or switching a committed side',()=>{
  const w=createWorldWar();w.advance(3);const c=w.snapshot(),before=JSON.stringify(c);
  assert.equal(selectAutoplayBattle(c,'east',{x:0,z:0}).region,'caricas');assert.equal(JSON.stringify(c),before);
  c.engagements[0].participation.faction='west';assert.equal(selectAutoplayBattle(c,'east',{x:0,z:0}),null);
});
test('P/takeover cancels movement, pauses campaign and cannot restart itself',()=>{
  let cleared=0,paused=0;const driver=createLizeemCampaignAutoplay({side:'west',war:{pause(){paused++;},setSpeed(){}},position:{x:0,z:0},clearInput(){cleared++;},status(){}});
  driver.start();driver.stop();driver.tick(10,true);assert.equal(driver.state().active,false);assert.equal(paused,2);assert.ok(cleared>=2);
});
test('explicit Resume restarts a stopped rehearsal without resetting its progress',()=>{
  const driver=createLizeemCampaignAutoplay({side:'west',war:{pause(){},setSpeed(){}},position:{x:0,z:0},mode:()=> 'playing',room:()=> 'tower',clearInput(){},status(){}});
  driver.start();const route=driver.state().route;driver.stop();assert.ok(driver.state().canResume);
  assert.ok(driver.resume());assert.ok(driver.state().active);assert.equal(driver.state().canResume,false);assert.deepEqual(driver.state().route,route);
});
test('stopping during the tower doorway and background preparation can resume at Bear',async()=>{
  let mode='playing',room='tower',prepared=0,finish;
  const position={x:TALETH_SPOT.x,z:TALETH_SPOT.z+2};
  const driver=createLizeemCampaignAutoplay({side:'west',war:{pause(){},setSpeed(){}},position,mode:()=>mode,room:()=>room,clearInput(){},status(){},
    interact(){mode=driver.state().stage==='talk'?'briefing':'loading';},click(){mode='playing';},
    prepareTravel(){prepared++;mode='loading';return new Promise(r=>{finish=()=>{mode='playing';r();};});}});
  driver.start();driver.tick(.1,true);driver.tick(.1,true);driver.tick(10,true);
  position.x=TOWER_DOOR.x;position.z=TOWER_DOOR.z-1.5;driver.tick(.1,true);driver.tick(.1,true);
  assert.equal(mode,'loading');driver.stop();room=null;mode='playing';assert.ok(driver.resume());
  driver.tick(.1,true);assert.equal(driver.state().stage,'prepare');driver.stop();finish();await Promise.resolve();
  assert.ok(driver.resume());driver.tick(.1,true);finish();await Promise.resolve();
  assert.equal(prepared,2);assert.ok(driver.state().active);assert.equal(driver.state().stage,'travel');assert.equal(driver.state().busy,false);
});
test('rehearsal F5/autosaves stay in memory, independently of another rehearsal',()=>{
  const a=createRehearsalStore(),b=createRehearsalStore(),w=createWorldWar();
  const data={format:WORLD_WAR_KEY,version:1,...w.checkpoint(),exploration:{version:1,character:'teresod',position:{...START,y:21.3},heading:0,camera:{yaw:0,pitch:.27,distance:8},elapsed:0,cells:[]}};
  assert.equal(a.save(data).ok,true);assert.deepEqual(a.read().data,data);assert.equal(b.read().data,null);
  assert.equal(a.save({}).ok,false);assert.deepEqual(a.read().data,data);
  assert.equal(rehearsalSide('?autoplay=west'),'west');assert.equal(rehearsalSide('?autoplay=east'),'east');assert.equal(rehearsalSide('?autoplay=other'),null);
});

test('manual result acknowledgement resumes from recorded progress for either allegiance',()=>{
  for(const side of ['west','east']){
    const w=createWorldWar();w.advance(3);w.syncRegion('Caricas');const b=w.snapshot().engagements.find(b=>b.region==='caricas');
    assert(w.campaign.joinBattle(b.id,b.location).ok);
    assert(w.campaign.resolveEncounter(b.id,side,'success','vanguard-broken',3).ok);
    let state=w.snapshot(),before=structuredClone(state);
    assert.equal(resumeAfterBattleResult('result','playing',state,b.id),'choose','Leaving after interception permits rejoining');
    assert.deepEqual(state,before);
    assert(w.campaign.joinBattle(b.id,b.location).ok);
    assert.equal(resumeAfterBattleResult('result','encounter',w.snapshot(),b.id),'brief');
    assert.equal(resumeAfterBattleResult('result','playing',w.snapshot(),b.id),null,'Never skip a pending choice');
    const pending=w.snapshot().pending;
    assert(w.campaign.resolveEncounter(pending.id,side,'success','rally-secured',pending.rally.guards).ok);
    state=w.snapshot();before=structuredClone(state);
    assert.equal(state.engagements.find(e=>e.id===b.id).status,'resolved');
    assert.equal(resumeAfterBattleResult('result','playing',state,b.id),'letter-wait','Final Continue resumes with the dispatch');
    for(const mode of ['map','pause','loading','limbo','reaper'])assert.equal(resumeAfterBattleResult('result',mode,state,b.id),null);
    assert.equal(resumeAfterBattleResult('result','playing',state,'unknown'),null);
    assert.equal(resumeAfterBattleResult('letter-wait','playing',state,b.id),null,'Do not acknowledge the same result twice');
    assert.deepEqual(state,before,'Resume only reads the authoritative record');
  }
});

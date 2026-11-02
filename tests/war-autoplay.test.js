import test from 'node:test';
import assert from 'node:assert/strict';
import {planWarTravel} from '../src/gameplay/autoplay/war-travel.js';
import {planWarEntry} from '../src/gameplay/autoplay/war-entry-route.js';
import {autoplayReadingTime} from '../src/gameplay/autoplay/reading-time.js';
import {createLizeemCampaignAutoplay,selectAutoplayBattle,resumeAfterBattleResult,autoplayLookoutStage} from '../src/gameplay/autoplay/lizeem-campaign-autoplay.js';
import {talethFinale} from '../src/app/exploration/taleth-correspondence.js';
import {createRehearsalStore,rehearsalSide} from '../src/app/exploration/rehearsal-store.js';
import {createWorldWar} from '../src/app/exploration/world-war.js';
import {WORLD_WAR_KEY} from '../src/app/exploration/war-checkpoint.js';
import {START} from '../src/app/exploration/checkpoint.js';
import {canStand} from '../src/gameplay/movement/locomotion.js';
import {TALETH_SPOT,TOWER_DOOR} from '../src/app/exploration/tower-state.js';
const world={bounds:{minX:-100,maxX:100,minZ:-100,maxZ:100},heightAt:()=>1,waterAt:()=>0,canExploreAt:()=>true,readyAt:()=>true,nearColliders:()=>[{x:0,z:0,hx:3,hz:12}]};

test('a wet battlefield approach routes around the dome to dry footing',async()=>{
  const wet={...world,nearColliders:()=>[],waterAt:(x,z)=>x<0&&Math.abs(z)<12?2:0};
  const battle={location:{x:0,z:0},entryRadius:20},from={x:-38,z:0};
  const path=await planWarEntry(wet,from,battle);assert.ok(path?.length>=2);
  let previous=from;
  for(const p of path.slice(0,-1)){
    const steps=Math.ceil(Math.hypot(p.x-previous.x,p.z-previous.z)/.2);
    for(let i=1;i<=steps;i++)assert.ok(Math.hypot(previous.x+(p.x-previous.x)*i/steps,previous.z+(p.z-previous.z)*i/steps)>=20,'Travel must not cross another part of the dome');
    previous=p;
  }
  const entry=path.at(-1);assert.ok(Math.hypot(entry.x,entry.z)<20);
  for(let t=0;t<=1;t+=.02)assert.ok(canStand(previous.x+(entry.x-previous.x)*t,previous.z+(entry.z-previous.z)*t,wet,.9),'Final lane is dry and clear');
  assert.equal(await planWarEntry({...wet,waterAt:()=>2},from,battle),null);
});

test('spectator reading time scales with the passage while keeping brief pages quick',()=>{
  assert.equal(autoplayReadingTime('A short report.',9),9);
  assert.ok(autoplayReadingTime('word '.repeat(150),10)>40);
  assert.ok(autoplayReadingTime('word '.repeat(1000),10)<=60);
});

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
test('resuming travel restores its previous clock state, even after dismounting',()=>{
  for(const initiallyRunning of [false,true]){
    let running=false;
    const stable={mounted:true},war={pause(){running=false;},run(){running=true;},setSpeed(){},state:()=>({clock:{running},campaign:{}})};
    const driver=createLizeemCampaignAutoplay({side:'west',war,stable,position:{x:0,z:0},mode:()=> 'playing',room:()=>null,clearInput(){},status(){}});
    driver.start();running=initiallyRunning;driver.stop();assert.equal(running,false);
    stable.mounted=false;assert.ok(driver.resume());assert.equal(running,initiallyRunning,'An on-foot traveller retains the same clock choice');
    driver.stop();stable.mounted=true;assert.ok(driver.resume());assert.equal(running,initiallyRunning,'Mounting does not start a deliberately paused clock');
  }
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
test('watch campaigns confirm their chosen league with Taleth before walking to the exit',()=>{
  for(const side of ['west','east']){
    let mode='playing',selected=null,briefed=false;const clicks=[];
    const driver=createLizeemCampaignAutoplay({side,war:{pause(){},setSpeed(){}},position:{x:TALETH_SPOT.x,z:TALETH_SPOT.z+2},mode:()=>mode,room:()=> 'tower',clearInput(){},status(){},
      towerProgress:()=>({briefed}),interact(){mode='briefing';},click(id){
        clicks.push(id);if(id==='tower-allegiance-'+side)selected=side;
        if(id==='tower-next'&&selected){briefed=true;mode='playing';}
      }});
    driver.start();driver.tick(.1,true);driver.tick(.1,true);driver.tick(10,true);
    assert.deepEqual(clicks,['tower-allegiance-'+side,'tower-next']);assert(briefed);
    assert.equal(driver.state().stage,'travel');assert(driver.state().active);
  }
});

async function bearDeparture({duringPreparation=false}={}){
  let mode='playing',room='tower';
  const position={x:TALETH_SPOT.x,z:TALETH_SPOT.z+2},calls={greetings:0,continues:0,mounts:0,moves:0};
  const state={bear:{x:-2425,z:61},approaching:true,offerOpen:false,horse:null};
  const stable={owned:false,mounted:false,state:()=>state,
    interact(){calls.greetings++;state.offerOpen=true;mode='briefing';},
    toggleMount(){calls.mounts++;if(state.horse&&Math.hypot(position.x-state.horse.x,position.z-state.horse.z)<=2.9)this.mounted=true;}};
  const war={pause(){},setSpeed(){},run(){},trackRoute(){},state:()=>({campaign:{engagements:[]},clock:{running:false}})};
  const driver=createLizeemCampaignAutoplay({side:'west',war,stable,position,mode:()=>mode,room:()=>room,clearInput(){},status(){},
    towerProgress:()=>({briefed:true}),steer(p){calls.moves++;Object.assign(position,p);},
    interact(){if(driver.state().stage==='door')room=null;else mode='briefing';},
    prepareTravel:async()=>{if(duringPreparation){state.offerOpen=true;state.approaching=false;mode='briefing';}},
    click(id){if(id==='stable-next'){calls.continues++;stable.owned=true;state.offerOpen=false;state.horse={x:position.x+2.4,z:position.z,yaw:0};}mode='playing';}});
  driver.start();driver.tick(.1,true);driver.tick(.1,true);driver.tick(10,true);
  Object.assign(position,{x:TOWER_DOOR.x,z:TOWER_DOOR.z-1.5});driver.tick(.1,true);driver.tick(.1,true);driver.tick(.1,true);
  await Promise.resolve();await Promise.resolve();
  return {driver,stable,state,calls,position,open(){state.approaching=false;state.offerOpen=true;mode='briefing';},acceptManually(horse){stable.owned=true;state.offerOpen=false;state.horse=horse;mode='playing';}};
}

test('autoplay waits for Bear to approach and accepts the automatic offer once, even during preparation',async()=>{
  for(const duringPreparation of [false,true]){
    const f=await bearDeparture({duringPreparation}),{driver,state,calls,stable,position}=f;
    if(!duringPreparation){
      assert.equal(driver.state().stage,'travel');const moves=calls.moves;
      driver.tick(1,true);assert.equal(calls.moves,moves,'Autoplay lets the approaching Bear reach the player');
      f.open();driver.tick(.1,true);
    }
    assert.equal(driver.state().stage,'horse-lesson');assert.equal(calls.greetings,0,'No second F interaction is needed');
    driver.tick(6,true);assert.equal(calls.continues,1);assert(stable.owned);assert(!stable.mounted);
    assert.deepEqual(driver.state().route[0],position,'A horse already in reach does not require walking to its former stable');
    assert(Math.hypot(state.horse.x-position.x,state.horse.z-position.z)<2.9);
    driver.tick(.1,true);driver.tick(.1,true);
    assert(stable.mounted);assert.equal(calls.mounts,1);assert.equal(calls.continues,1);assert.equal(driver.state().stage,'travel');
  }
});

test('resuming a manually accepted Bear offer approaches the saved horse at its actual position',async()=>{
  const f=await bearDeparture({duringPreparation:true}),{driver,position,calls,stable}=f;
  driver.stop();const horse={x:position.x+15,z:position.z+8,yaw:0};f.acceptManually(horse);
  assert(driver.resume());const target=driver.state().route[0];
  assert(Math.abs(Math.hypot(target.x-horse.x,target.z-horse.z)-1.7)<1e-8,'Approach remains outside the horse body and within mount reach');
  for(let i=0;i<4&&!stable.mounted;i++)driver.tick(.1,true);
  assert(stable.mounted);assert.equal(calls.continues,0,'A manually acknowledged offer is not clicked a second time');
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
    assert(w.campaign.resolveEncounter(pending.id,side,'success','rally-secured',pending.rally.guards,{escaped:0,commanders:Object.fromEntries(Object.entries(pending.commanders).filter(([,c])=>c.status==='active').map(([f,c])=>[f,{id:c.id,hp:side===f?c.hp:1,outcome:side===f?'active':'routed'}]))}).ok);
    state=w.snapshot();before=structuredClone(state);
    assert.equal(state.engagements.find(e=>e.id===b.id).status,'resolved');
    assert.equal(resumeAfterBattleResult('result','playing',state,b.id),'letter-wait','Final Continue resumes with the dispatch');
    for(const mode of ['map','pause','loading','limbo','reaper'])assert.equal(resumeAfterBattleResult('result',mode,state,b.id),null);
    assert.equal(resumeAfterBattleResult('result','playing',state,'unknown'),null);
    assert.equal(resumeAfterBattleResult('letter-wait','playing',state,b.id),null,'Do not acknowledge the same result twice');
    assert.deepEqual(state,before,'Resume only reads the authoritative record');
  }
});

// Exercise the watch driver's transitions with deterministic host responses;
// movement and combat are verified separately by the native rehearsal checks.
test('manual Corris acknowledgement or postponement can resume the same rehearsal',async()=>{
  for(const acknowledge of [true,false]){
    let currentMode='playing',currentRoom='tower',running=false,briefed=false;
    const position={x:TALETH_SPOT.x,z:TALETH_SPOT.z+2},battle={id:'first',status:'active',region:'caricas',location:{x:-2000,z:150},entryRadius:70,endsOn:6};
    const campaign={engagements:[battle],pending:null,winner:null},courier={delivery:null,conversation:false,landed:true,destination:position};
    const stable={owned:false,mounted:false,interact(){currentMode='briefing';},toggleMount(){this.mounted=!this.mounted;}};
    const war={pause(){running=false;},run(){running=true;},setSpeed(){},trackRoute(){},track(){},
      state:()=>({campaign,courier,clock:{running},soldiers:{people:[]},encounter:{encounter:{outcome:'victory'}}}),
      join(){currentMode='encounter';return {ok:true};},help(){currentMode='skirmish';},
      continue(){battle.status='resolved';courier.delivery='report';currentMode='playing';}};
    const driver=createLizeemCampaignAutoplay({side:'west',war,stable,position,world:{...world,bounds:{minX:-3000,maxX:0,minZ:-500,maxZ:500},nearColliders:()=>[]},
      mode:()=>currentMode,room:()=>currentRoom,towerProgress:()=>({briefed}),clearInput(){},status(){},steer:p=>Object.assign(position,p),prepareTravel:async()=>{},
      interact(){if(currentRoom==='tower'&&driver.state().stage==='door')currentRoom=null;else currentMode='briefing';},
      click(id){
        if(id==='corris-call'){courier.conversation=true;currentMode='briefing';return;}
        if(id==='stable-next')stable.owned=true;
        if(id==='tower-next')briefed=true;
        currentMode='playing';
      }});
    driver.start();
    const manual=new Set();
    for(let i=0;i<400&&driver.state().stage!=='letter';i++){
      driver.tick(1,true);await Promise.resolve();
      const stage=driver.state().stage;
      if(['intro','horse-lesson'].includes(stage)&&!manual.has(stage)){
        manual.add(stage);driver.stop();currentMode='playing';
        if(stage==='intro')briefed=acknowledge;else stable.owned=acknowledge;
        assert.ok(driver.resume(),'A manually closed introductory conversation can resume');
        assert.equal(driver.state().stage,acknowledge?'travel':stage==='intro'?'talk':'bear');
      }
    }
    assert.equal(driver.state().stage,'letter');assert.equal(currentMode,'briefing');driver.stop();
    courier.conversation=false;if(acknowledge)courier.delivery=null;currentMode='playing';
    const before=JSON.stringify(campaign),count=driver.state().battles;
    currentMode='map';assert.equal(driver.resume(),false,'A genuinely open map still needs closing');currentMode='playing';
    assert.ok(driver.resume(),'Closing Corris manually does not strand Resume');
    assert.equal(driver.state().stage,acknowledge?'choose':'letter-wait');
    driver.stop();assert.ok(driver.resume());
    assert.equal(driver.state().battles,count);assert.equal(JSON.stringify(campaign),before,'Resume cannot resolve a battle twice');
    if(!acknowledge){driver.tick(5,true);assert.equal(driver.state().stage,'letter','Unread news is still delivered');}
  }
});

test('resuming a manually advanced lookout uses the actual authored page',()=>{
  const w=createWorldWar();while(!w.snapshot().winner)w.advance();
  const pages=talethFinale(w.snapshot());
  for(const page of [0,1,2,3,4,5,6,7]){
    const stage=autoplayLookoutStage({page,menu:false});
    assert.equal(stage,page===1?'politics':pages[page].view,'The displayed country and watch stage agree');
    assert.equal(autoplayLookoutStage({page,menu:true}),'conclusion','The completion menu is not another country');
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { createHomeResidents, validateHomeResidents, HOME_PACE, HOME_FERRY_SECONDS } from '../src/home-residents.js';
import { createHomeResidentHost } from '../src/home-resident-host.js';
import { QUEST_HOMES, BEN_HOME, TROY_HOME, CAGNEY_RESIDENCE } from '../src/quest-homes.js';
import { FERRY_LANDINGS } from '../src/ferry.js';

const copy = value => JSON.parse(JSON.stringify(value));
const gap = (a,b) => Math.hypot(a.x-b.x,a.z-b.z);
const step = (id,from,to,amount) => {
  const distance=gap(from,to),scale=distance?Math.min(1,amount/distance):0;
  return {x:from.x+(to.x-from.x)*scale,z:from.z+(to.z-from.z)*scale};
};
const pure = options => createHomeResidents({move:step,...options});
const record = (home,phase='inside',position=home.door) => ({phase,leg:'home',position:{x:position.x,z:position.z},yaw:home.yaw,clock:0});
const snapshot = (id,state) => ({version:1,people:{[id]:state}});
const until = (residents,id,phase,options={}) => {
  for(let i=0;i<20000&&residents.get(id)?.phase!==phase;i++)residents.tick(.1,options);
  assert.equal(residents.get(id)?.phase,phase);
};

test('each returning resident walks independently at a bounded pace even far from the player',()=>{
  const residents=pure();
  for(const home of [BEN_HOME,CAGNEY_RESIDENCE])assert.equal(residents.begin(home.npcId,{x:home.door.x+80,z:home.door.z+20}),true);
  for(let i=0;i<20;i++){
    const before=residents.snapshot();
    residents.tick(.25,{player:{x:9000,z:9000}});
    for(const home of [BEN_HOME,CAGNEY_RESIDENCE]){
      const old=before.people[home.npcId].position,now=residents.get(home.npcId).position;
      assert.ok(gap(old,now)<=HOME_PACE*.25+1e-8);
      assert.ok(gap(now,home.door)<gap(old,home.door),'walking continues without a nearby player');
    }
  }
  const saved=residents.snapshot();residents.tick(10,{paused:true});assert.deepEqual(residents.snapshot(),saved);
});

test('a movement adapter cannot teleport a resident and blocked feet remain where they were',()=>{
  const residents=pure({move:(id,from,to)=>to});
  const start={x:BEN_HOME.door.x+200,z:BEN_HOME.door.z};residents.begin(BEN_HOME.npcId,start);
  residents.tick(.1);assert.deepEqual(residents.get(BEN_HOME.npcId).position,start);
  const blocked=pure({move:(id,from)=>from});blocked.begin(BEN_HOME.npcId,start);
  blocked.tick(20);assert.deepEqual(blocked.get(BEN_HOME.npcId).position,start);
});

test('Troy boards at Peblos and uses a separate saved ferry clock before continuing on land',()=>{
  const residents=pure(),id=TROY_HOME.npcId,board=FERRY_LANDINGS.peblos.ashore;
  residents.begin(id,board,{ferry:true});residents.tick(.1);
  assert.equal(residents.get(id).phase,'sailing');
  residents.tick(23);const saved=residents.snapshot();assert.equal(saved.people[id].clock,23);
  residents.tick(500,{paused:true});assert.deepEqual(residents.snapshot(),saved);
  const loaded=pure();assert.equal(loaded.restore(saved),true);
  const [mid]=loaded.tick(HOME_FERRY_SECONDS-23-.1);assert.equal(mid.hidden,true);assert.equal(mid.phase,'sailing');
  assert.deepEqual(mid.position,{x:board.x,z:board.z},'no walking across the sea');
  const [landed]=loaded.tick(.11);assert.equal(landed.phase,'walking');assert.equal(landed.hidden,false);
  assert.deepEqual(landed.position,{x:FERRY_LANDINGS['port-calos'].ashore.x,z:FERRY_LANDINGS['port-calos'].ashore.z});
  assert.equal(landed.leg,'home');
  const before=loaded.get(id).position;loaded.tick(.1);
  assert.ok(gap(loaded.get(id).position,before)<=HOME_PACE*.1+1e-8);
});

test('only an indoor living resident answers a knock and returns inside after the visitor leaves',()=>{
  const residents=pure(),id=BEN_HOME.npcId;
  residents.begin(id,{x:BEN_HOME.door.x+2,z:BEN_HOME.door.z});assert.equal(residents.knock(id),false);
  until(residents,id,'inside');assert.equal(residents.knock(id,{available:false}),false);
  assert.equal(residents.knock(id),true);assert.equal(residents.knock(id),false,'a second knock cannot restart coming out');
  until(residents,id,'outside',{player:BEN_HOME.porch});
  assert.ok(gap(residents.get(id).position,BEN_HOME.porch)<1.6);
  residents.tick(30,{player:BEN_HOME.porch});assert.equal(residents.get(id).phase,'outside');
  const away={x:BEN_HOME.porch.x+40,z:BEN_HOME.porch.z};
  residents.tick(4.9,{player:away});assert.equal(residents.get(id).phase,'outside');
  residents.tick(.11,{player:away});assert.equal(residents.get(id).phase,'walking');
  until(residents,id,'inside',{player:away});
});

test('a visitor occupying the porch does not trap a resident in the coming-out phase',()=>{
  const residents=pure({move:(id,from)=>from}),id=BEN_HOME.npcId;
  residents.restore(snapshot(id,record(BEN_HOME)));assert.equal(residents.knock(id),true);
  const [placement]=residents.tick(.1,{player:BEN_HOME.porch});
  assert.equal(placement.phase,'outside');assert.equal(placement.hidden,false);
  assert.deepEqual(placement.position,{x:BEN_HOME.door.x,z:BEN_HOME.door.z},'the blocked person does not snap through the visitor');
  assert.equal(validateHomeResidents(residents.snapshot()),true);
});

test('restoring an old save without residents starts empty and restored trips do not replay rewards or departure',()=>{
  const events=[],residents=pure({onEvent:e=>events.push(e.type)}),id=BEN_HOME.npcId;
  residents.begin(id,{x:BEN_HOME.door.x+25,z:BEN_HOME.door.z});residents.tick(1);
  const saved=residents.snapshot(),loaded=pure({onEvent:e=>events.push(e.type)}),priorEvents=[...events];
  assert.equal(loaded.restore(saved),true);assert.deepEqual(events,priorEvents);
  assert.deepEqual(loaded.snapshot(),saved);assert.equal(loaded.begin(id,BEN_HOME.door),false);
  until(loaded,id,'inside');assert.deepEqual(events,['departing','entering','inside']);
  assert.equal(loaded.restore(undefined),true);assert.deepEqual(loaded.snapshot(),{version:1,people:{}});
});

test('invalid or stale stationary home saves are rejected without disturbing the prior trip',()=>{
  const residents=pure();residents.begin(BEN_HOME.npcId,{x:BEN_HOME.door.x+30,z:BEN_HOME.door.z});
  const before=residents.snapshot(),far={x:0,z:0};
  for(const phase of ['inside','entering','outside']){
    const bad=snapshot(BEN_HOME.npcId,record(BEN_HOME,phase,far));
    assert.equal(validateHomeResidents(bad),false,phase);assert.equal(residents.restore(bad),false);
    assert.deepEqual(residents.snapshot(),before);
  }
  assert.equal(validateHomeResidents(snapshot(TROY_HOME.npcId,{...record(TROY_HOME,'inside'),leg:'quay'})),false);
  assert.equal(validateHomeResidents(snapshot(TROY_HOME.npcId,{...record(TROY_HOME,'sailing',far),leg:'quay'})),false);
  assert.equal(validateHomeResidents(snapshot(BEN_HOME.npcId,record(BEN_HOME,'walking',far))),true,'a journey may save anywhere along a land route');
});

test('unavailable residents freeze without producing a placement or answering a knock',()=>{
  const residents=pure(),id=BEN_HOME.npcId;residents.restore(snapshot(id,record(BEN_HOME)));
  const saved=residents.snapshot();assert.deepEqual(residents.tick(30,{available:()=>false}),[]);
  assert.deepEqual(residents.snapshot(),saved);assert.equal(residents.knock(id,{available:false}),false);
});

test('a fight that pulls someone off their porch resumes the walk home without creating an invalid outside save',()=>{
  const residents=pure(),id=BEN_HOME.npcId;residents.restore(snapshot(id,record(BEN_HOME,'outside',BEN_HOME.porch)));
  const combatFeet={x:BEN_HOME.porch.x+7,z:BEN_HOME.porch.z+4,busy:true};
  assert.deepEqual(residents.tick(.1,{readActor:()=>combatFeet}),[]);
  assert.deepEqual(residents.get(id).position,{x:combatFeet.x,z:combatFeet.z});
  assert.equal(residents.get(id).phase,'walking');assert.equal(validateHomeResidents(residents.snapshot()),true);
  residents.tick(.1);assert.ok(gap(residents.get(id).position,BEN_HOME.door)<gap(combatFeet,BEN_HOME.door));
});

function position(x=0,z=0){return{x,y:0,z,set(x,y,z){this.x=x;this.y=y;this.z=z;}};}
function fixture(){
  const completed=new Set(),down=new Set(),bodies=new Set(),controlled=new Set(),dialogs=[],messages=[];
  let saves=0;
  const npcById=new Map(Object.values(QUEST_HOMES).map(home=>[home.npcId,{id:home.npcId,name:home.name,
    actor:{group:{position:position(home.door.x+8,home.door.z),rotation:{y:0},visible:true}},marker:{visible:true},hidden:false}]));
  const world={heightAt:()=>0,paths:[],npcPositions:Object.fromEntries([...npcById].map(([id,n])=>[id,{x:n.actor.group.position.x,z:n.actor.group.position.z}]))};
  const player={group:{position:position(9000,9000)}},combat={state:{phase:'idle',enemies:[],allies:[]}},crime={isDown:id=>down.has(id),controlsNpc:id=>controlled.has(id)};
  const host=createHomeResidentHost({world,npcById,player,combat,crime,corpses:{ownsNpc:id=>bodies.has(id)},
    move:step,complete:id=>completed.has(id),toast:(...args)=>messages.push(args),save:()=>saves++,
    openDialogue:(...args)=>dialogs.push(args),closeDialogue:()=>{}});
  return{host,world,npcById,player,completed,down,bodies,controlled,dialogs,messages,saves:()=>saves};
}

test('host restores indoor visibility and knocking uses the same actor without rerunning reward dialogue',()=>{
  const f=fixture(),id=BEN_HOME.npcId,npc=f.npcById.get(id);
  assert.equal(f.host.restore(snapshot(id,record(BEN_HOME))),true);
  assert.equal(npc.hidden,true);assert.equal(npc.actor.group.visible,false);assert.equal(npc.marker.visible,false);
  assert.equal(f.dialogs.length,0);assert.equal(f.saves(),0);
  assert.equal(f.host.knock(BEN_HOME),true);assert.equal(f.dialogs.length,1);assert.equal(f.dialogs[0][0],npc);
  const choice=f.dialogs[0][4].choices.find(c=>c.id==='home-come-out');assert.ok(choice);choice.action();
  f.host.frame(.1);assert.equal(npc.hidden,false);assert.equal(npc.actor.group.visible,true);
  assert.equal(f.host.state(id).phase,'coming-out');
});

test('host does not move during pause and a quest reset affects only its own resident',()=>{
  const f=fixture();for(const home of [BEN_HOME,CAGNEY_RESIDENCE]){f.completed.add(home.npcId);assert.equal(f.host.begin(home.npcId),true);}
  const before=f.host.snapshot();f.host.frame(10,false);assert.deepEqual(f.host.snapshot(),before);
  f.completed.delete(BEN_HOME.npcId);f.host.reset(BEN_HOME.npcId);assert.equal(f.host.state(BEN_HOME.npcId),null);
  assert.deepEqual(f.host.state(CAGNEY_RESIDENCE.npcId),before.people[CAGNEY_RESIDENCE.npcId]);
  f.completed.add(BEN_HOME.npcId);assert.equal(f.host.begin(BEN_HOME.npcId),true,'the restarted quest can later send him home once');
});

test('host validates before changing actors and missing old saves never resurrect dead Troy',()=>{
  const f=fixture(),id=TROY_HOME.npcId,npc=f.npcById.get(id);
  npc.actor.group.position.set(123,4,456);npc.hidden=true;npc.actor.group.visible=false;
  const feet=copy(npc.actor.group.position),worldFeet=copy(f.world.npcPositions);
  assert.equal(f.host.restore({version:99,people:{}}),false);
  assert.deepEqual(copy(npc.actor.group.position),feet);assert.equal(npc.hidden,true);assert.equal(npc.actor.group.visible,false);
  assert.deepEqual(f.world.npcPositions,worldFeet);
  for(const condition of ['fallen','down','corpse']){
    npc.fallen=condition==='fallen';f.down.clear();f.bodies.clear();
    if(condition==='down')f.down.add(id);if(condition==='corpse')f.bodies.add(id);
    f.completed.add(id);assert.equal(f.host.restore(undefined),true);
    assert.deepEqual(copy(npc.actor.group.position),feet,condition);assert.equal(npc.hidden,true);assert.equal(npc.actor.group.visible,false);
    assert.equal(f.host.begin(id),false);f.host.frame(10);assert.equal(f.host.state(id),null);
    f.host.reset(id);assert.equal(npc.hidden,true,'reset cannot unhide a dead resident');
  }
});

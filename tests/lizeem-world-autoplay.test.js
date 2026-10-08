import {createCampaign} from '../src/simulation/campaign.js';
import {availableBattleStage} from '../src/simulation/battle-stages.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createLizeemWorldAutoplay} from '../src/gameplay/autoplay/lizeem-world-autoplay.js';
import {createWorldWar,RALLY_WORLD_WAR_SCENARIO} from '../src/app/exploration/world-war.js';

function fixture(prepare){
  const calls={prepare:0,join:0,clear:0,messages:[]};
  const campaign={day:10,engagements:[{id:1,region:'caricas',status:'active'}]};
  const driver=createLizeemWorldAutoplay({
    war:{state:()=>({campaign}),pause(){},setSpeed(){},join(){calls.join++;return {ok:true};}},
    mode:()=> 'playing',showMap(){},resume(){},attack(){},
    clearInput(){calls.clear++;},status:message=>calls.messages.push(message),
    prepare(){calls.prepare++;return prepare();},
  });
  driver.toggle();driver.tick(1.5,true);
  return {driver,calls};
}
const settle=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};

test('stopping before the queued transfer prevents it from starting',async()=>{
  const {driver,calls}=fixture(()=>true);
  driver.stop();await settle();
  assert.equal(calls.prepare,0);assert.equal(calls.join,0);
  assert.equal(driver.state().active,false);
});
test('a late terrain-load completion cannot restart a cancelled demonstration',async()=>{
  let finish;
  const {driver,calls}=fixture(()=>new Promise(resolve=>{finish=resolve;}));
  await settle();assert.equal(calls.prepare,1);
  driver.stop();const messages=calls.messages.length;
  finish(true);await settle();driver.tick(10,true);
  assert.equal(driver.state().active,false);assert.equal(calls.join,0);
  assert.equal(calls.messages.length,messages);assert.equal(calls.clear,2);
});
test('terrain failure stops autoplay with an actionable error',async()=>{
  const {driver,calls}=fixture(()=>Promise.reject(Error('Terrain unavailable')));
  await settle();
  assert.equal(driver.state().active,false);assert.equal(calls.join,0);
  assert.match(calls.messages.at(-1),/Terrain unavailable/);
});

for(const version of ['v5','v6'])test(`autoplay ${version} uses campaign phases, skips presentation waits and stops at the battle deadline`,async()=>{
  const session=version==='v6'?createWorldWar():createWorldWar({simulation:createCampaign(RALLY_WORLD_WAR_SCENARIO).snapshot(),fraction:0,speed:1});
  let mode='playing',encounter=null,joined=null,elapsed=0,arrivalTime=null,attempts=0;
  const war={state:()=>({campaign:session.snapshot(),clock:session.clock(),encounter:{encounter}}),
    pause:session.pause,setSpeed:session.setSpeed,advance:session.advance,
    join(id){joined=id;const b=session.snapshot().engagements.find(b=>b.id===id);const result=session.campaign.joinBattle(id,b.location);if(result.ok)mode='encounter';return result;},
    // Combat timing is external to this driver; supply each completed local phase.
    help(){attempts++;mode='skirmish';encounter={outcome:'success'};},
    continue(){
      const p=session.snapshot().pending,rally=p.stage==='rally';
      assert(session.campaign.resolveEncounter(p.id,'west','success',rally?'rally-secured':'vanguard-broken',rally?p.rally.guards:3).ok);
      encounter=null;mode='playing';
      const b=session.snapshot().engagements.find(b=>b.id===joined);
      if(availableBattleStage(b)==='rally')assert(war.join(joined).ok);
    },
  };
  const driver=createLizeemWorldAutoplay({war,mode:()=>mode,showMap:()=>{mode='map';},resume:()=>{mode='playing';},
    prepare:async()=>{arrivalTime=elapsed;session.syncRegion('Caricas');mode='playing';return true;},attack(){},clearInput(){},status(){}});
  driver.toggle();assert.equal(session.clock().speed,20);
  driver.tick(1,false);assert.equal(session.snapshot().day,0);
  for(let i=0;i<400&&driver.state().active;i++){elapsed+=.05;driver.tick(.05,true);await settle();if(elapsed<1.49)assert.equal(session.snapshot().day,0);}
  const expectedArrival=version==='v6'?4.5:15;
  assert(arrivalTime>=expectedArrival-1e-8&&arrivalTime<expectedArrival+.1,`arrival at ${arrivalTime}`);
  assert(elapsed<(version==='v6'?9:18.6),`unnecessary delay: ${elapsed}s`);
  assert.equal(driver.state().active,false);assert.equal(session.snapshot().day,version==='v6'?6:12);
  assert.equal(attempts,version==='v6'?2:1);assert.equal(session.snapshot().regions.caricas.owner,'west');assert.equal(mode,'map');
  assert.equal(session.clock().speed,20);assert.equal(session.clock().running,false);
});

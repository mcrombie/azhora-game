import test from 'node:test';
import assert from 'node:assert/strict';
import {createYunethreAutoplay} from '../src/gameplay/autoplay/yunethre-autoplay.js';
import {createYunethre,BATTLE_START,BATTLE_END} from '../src/content/chapters/yunethre/chapter.js';
import {CHAPTER_LOCATIONS as places,CANERD_ENTRY} from '../src/content/chapters/yunethre/locations.js';
import {TOWER_SPAWN,TOWER_EXIT,TOWER_DOOR,TALETH_SPOT,LOOKOUT_SPAWN,LOOKOUT_TALETH,LOOKOUT_DOOR} from '../src/app/exploration/tower-state.js';
import {createYunethreTravel,yunethreTravelAnchors} from '../src/gameplay/autoplay/yunethre-travel.js';

// The harness owns the real chapter reducer and exposes only conversation
// choices to the driver. Movement advances normally; no driver command API,
// reset, save writer, time skip, teleport or outcome shortcut is supplied.
function fixture({campaign=createYunethre(),room='tower',position=TOWER_SPAWN,region=38,planner}={}){
  const p={...position},ui={room,mode:'playing',region,conversation:null},log={choices:[],messages:[],plans:[],interactions:[],maps:0,steps:0};
  let input=null,allowed=true;
  const command=c=>assert.equal(campaign.command(c).ok,true,JSON.stringify(c));
  const close=()=>{ui.conversation=null;ui.mode='playing';};
  function show(id){
    const s=campaign.snapshot(),done=['averted','resolved'].includes(s.battle.status);let actions=[];
    switch(id){
      case 'taleth':actions=['accept',...(s.briefed?['depart']:[]),'close'];break;
      case 'town':actions=[...(done&&!s.aftermathVisited?[
        ...(!s.elfHostile&&s.battle.joined!=='celder'&&(s.battle.winner==='celder'||s.centaurProtection)?['join']:[]),'decline']:[]),'close'];break;
      case 'centaurs':actions=[...(s.battle.status==='pending'&&!s.compact.centaurs?['consent']:[]),
        ...(s.battle.winner==='centaurs'&&!s.centaurProtection?['protect']:[]),...(s.battle.status==='pending'?['travel-celder']:[]),'close'];break;
      case 'celder':actions=[...(s.battle.status==='pending'?['consent','offer']:[]),'return-yunethre','close'];break;
      case 'offer':actions=['back'];break;
      case 'road':actions=[s.aftermathVisited?'return':'visit-tower','close'];break;
      case 'messenger':actions=['map','menu','close'];break;
      default:assert.fail('Unexpected conversation '+id);
    }
    ui.mode='briefing';ui.conversation={id,text:id+' '+JSON.stringify({compact:s.compact,laketown:s.laketown,battle:s.battle.status,briefed:s.briefed}),actions};
  }
  function choose(id){
    const c=ui.conversation;assert.ok(c?.actions.includes(id),'Actual visible conversation action exists: '+id);log.choices.push(c.id+'/'+id);
    if(id==='close'){close();return true;}
    if(c.id==='taleth'&&id==='accept'){command({type:'brief'});close();}
    else if(c.id==='town'&&['join','decline'].includes(id)){command({type:'laketown-decision',decision:id});show('town');}
    else if(['centaurs','celder'].includes(c.id)&&id==='consent'){command({type:'compact',side:c.id});show(c.id);}
    else if(c.id==='centaurs'&&id==='protect'){command({type:'protect'});show('centaurs');}
    else if(id==='travel-celder'){close();ui.region=62;Object.assign(p,CANERD_ENTRY);campaign.advance(90);}
    else if(id==='return-yunethre'){close();ui.region=38;Object.assign(p,{x:places.centaurs.x-10,z:places.centaurs.z+5});if(campaign.snapshot().battle.status==='pending')campaign.advance(90);}
    else if(id==='offer')show('offer');else if(id==='back')show('celder');
    else if(c.id==='road'&&id==='return'){command({type:'return'});show('messenger');}
    else if(c.id==='messenger'&&id==='map'){close();ui.mode='map';log.maps++;}
    else assert.fail('Unused test action '+c.id+'/'+id);
    return true;
  }
  const near=(target,r=5)=>Math.hypot(p.x-target.x,p.z-target.z)<r;
  function interact(){
    assert.equal(ui.mode,'playing');let target;
    if(ui.room==='tower'){
      if(near(TALETH_SPOT)){show('taleth');target='taleth';}
      else if(near(TOWER_DOOR)){assert.ok(campaign.snapshot().briefed);if(!campaign.snapshot().departed)command({type:'depart'});ui.room=null;ui.region=16;Object.assign(p,TOWER_EXIT);target='leave';}
    }else if(ui.room==='lookout'){
      if(near(LOOKOUT_DOOR)){ui.room='tower';Object.assign(p,TOWER_SPAWN);target='chamber';}
      else if(near(LOOKOUT_TALETH)){show('taleth');target='taleth';}
    }else{
      const here=Object.values(places).find(place=>near(place,place.id==='departure'?12:5));
      if(here){target=here.id;if(target==='departure')show('road');else{command({type:'visit',place:target});show(target);}}
    }
    log.interactions.push(target??'missed');return !!target;
  }
  const autoplay=createYunethreAutoplay({chapter:{state:()=>campaign.snapshot(),conversation:()=>ui.conversation,choose},position:()=>p,room:()=>ui.room,
    region:()=>ui.region,mode:()=>ui.mode,plan:async(from,to,options)=>{log.plans.push({from,to,options});return planner?planner(from,to,options):[from,to];},
    steer:target=>{input=target;},clearInput:()=>{input=null;},interact,status:(text,active)=>log.messages.push({text,active}),
    showMap:()=>{ui.mode='map';log.maps++;},resumeWorld:()=>{ui.mode='playing';},canStart:()=>allowed});
  async function step(dt=.25,enabled=true){
    autoplay.tick(dt,enabled);await Promise.resolve();await Promise.resolve();await Promise.resolve();
    if(enabled&&ui.mode==='playing'){
      if(input){const dx=input.x-p.x,dz=input.z-p.z,d=Math.hypot(dx,dz),move=Math.min(d,4*dt);if(d){p.x+=dx/d*move;p.z+=dz/d*move;log.steps++;}}
      if(!ui.room)campaign.advance(dt);
    }
  }
  async function until(predicate,limit=9000){for(let i=0;i<limit&&!predicate();i++)await step();assert.ok(predicate(),JSON.stringify({auto:autoplay.state(),ui,chapter:campaign.snapshot()}));}
  return {autoplay,campaign,p,ui,log,show,step,until,setAllowed:value=>{allowed=value;}};
}

test('P-style toggle stops input and resumes from current progress without resetting the chapter',async()=>{
  const f=fixture();assert.equal(f.autoplay.start(),true);await f.until(()=>f.ui.conversation?.id==='taleth');
  const before=f.campaign.snapshot(),at={...f.p};f.autoplay.toggle();await f.step(100);
  assert.equal(f.autoplay.state().active,false);assert.deepEqual(f.p,at);assert.deepEqual(f.campaign.snapshot(),before);
  f.campaign.command({type:'brief'});f.ui.conversation=null;f.ui.mode='playing';
  assert.equal(f.autoplay.start(),true);await f.until(()=>f.campaign.snapshot().departed);
  assert.equal(f.log.choices.includes('taleth/accept'),false,'Resume uses the live briefing record');
});

test('peaceful main route walks to speakers, chooses visible dialogue and ends on the changed map',async()=>{
  const f=fixture({room:'lookout',position:LOOKOUT_SPAWN});f.autoplay.start();await f.until(()=>!f.autoplay.state().active);
  const s=f.campaign.snapshot();assert.equal(s.returned,true);assert.equal(s.battle.status,'averted');assert.equal(s.laketown,'league');
  assert.equal(s.celderAlliance,false);assert.equal(s.centaurProtection,true);assert.ok(s.elapsed<BATTLE_START);
  assert.equal(f.ui.mode,'map');assert.equal(f.log.maps,2);assert.ok(f.log.steps>200,'Walking input carries the hero through the route');
  assert.deepEqual(f.log.choices.filter(c=>/accept|consent|join|return$|map$/.test(c)),[
    'taleth/accept','centaurs/consent','celder/consent','town/join','road/return','messenger/map']);
  assert.ok(f.log.interactions.includes('chamber'));assert.ok(f.log.interactions.includes('leave'));
  const after=f.campaign.snapshot();assert.equal(f.autoplay.start(),false);assert.deepEqual(f.campaign.snapshot(),after,'Completed chapter is never reset');
});

test('the lookout speaker approach remains inside the parapet beside Taleth',async()=>{
  const position={x:LOOKOUT_TALETH.x-1,y:LOOKOUT_TALETH.y,z:LOOKOUT_TALETH.z-1};
  const f=fixture({room:'lookout',position});f.autoplay.start();await f.until(()=>f.ui.conversation?.id==='taleth');
  assert.equal(f.log.plans.length,0,'Already close enough to interact from the safe interior side');
  assert.deepEqual(f.p,position);
});

test('loading, inactive windows and pause menus do not consume passage reading time or movement',async()=>{
  const f=fixture();f.autoplay.start();await f.until(()=>f.ui.conversation?.id==='taleth');await f.step(2);
  const read=f.autoplay.state().readSeconds,at={...f.p};
  await f.step(100,false);assert.equal(f.autoplay.state().readSeconds,read);
  f.ui.mode='loading';await f.step(100);assert.equal(f.autoplay.state().readSeconds,read);
  f.ui.mode='pause';await f.step(100);assert.equal(f.autoplay.state().readSeconds,read);assert.deepEqual(f.p,at);
  f.ui.mode='briefing';await f.until(()=>f.campaign.snapshot().briefed);
  await f.until(()=>f.autoplay.state().stage==='walking');const stopped={...f.p};await f.step(100,false);assert.deepEqual(f.p,stopped);
});

test('stopping cancels outstanding route work and ignores its late result',async()=>{
  let release,cancelled;const f=fixture({planner:(from,to,options)=>{cancelled=options.cancelled;return new Promise(resolve=>{release=()=>resolve([from,to]);});}});
  f.autoplay.start();await f.step();assert.equal(f.autoplay.state().pending,true);assert.equal(cancelled(),false);
  const at={...f.p};f.autoplay.stop();assert.equal(cancelled(),true);release();await f.step();await f.step();
  assert.equal(f.autoplay.state().active,false);assert.equal(f.autoplay.state().pending,false);assert.deepEqual(f.p,at);
});

test('an existing centaur victory gets its protection agreement; elf hostility is respected',async()=>{
  for(const elfHostile of [false,true]){
    let campaign;for(let seed=1;seed<100;seed++){
      const candidate=createYunethre(null,{seed:Math.imul(seed,2654435761)>>>0});candidate.command({type:'brief'});candidate.command({type:'depart'});candidate.advance(BATTLE_END);
      if(candidate.snapshot().battle.winner==='centaurs'){campaign=candidate;break;}
    }
    assert.ok(campaign);if(elfHostile)campaign.command({type:'elf-hostility',value:true});
    const f=fixture({campaign,room:null,position:{x:places.town.x,z:places.town.z+2}});f.autoplay.start();await f.until(()=>!f.autoplay.state().active);
    const s=campaign.snapshot();assert.equal(s.returned,true);assert.equal(s.laketown,elfHostile?'declined':'league');assert.equal(s.battle.winner,'centaurs');
    assert.equal(f.log.choices.includes('centaurs/protect'),!elfHostile);
  }
});

test('a saved Celder visit returns through the envoy instead of walking across the transition gap',async()=>{
  const campaign=createYunethre();campaign.command({type:'brief'});campaign.command({type:'depart'});campaign.command({type:'visit',place:'celder'});
  const f=fixture({campaign,room:null,region:62,position:CANERD_ENTRY});f.autoplay.start();await f.until(()=>f.log.choices.includes('celder/return-yunethre'));
  assert.equal(campaign.snapshot().compact.celder,true);assert.equal(f.log.plans[0].to.x,places.celder.x);assert.equal(f.ui.region,38);
});

test('a missed diplomatic deadline waits for the real battle result instead of inventing peace',async()=>{
  const campaign=createYunethre();campaign.command({type:'brief'});campaign.command({type:'depart'});
  campaign.command({type:'visit',place:'town'});campaign.advance(BATTLE_START-.5);
  const f=fixture({campaign,room:null,position:{x:places.town.x,z:places.town.z+2}});f.autoplay.start();
  await f.until(()=>f.autoplay.state().stage==='waiting');
  assert.equal(campaign.snapshot().battle.status,'active');assert.equal(f.log.choices.some(c=>c.endsWith('/consent')),false);
  const before=campaign.snapshot().elapsed;await f.step(.25);assert.equal(campaign.snapshot().elapsed,before+.25);
  await f.until(()=>!f.autoplay.state().active);assert.equal(campaign.snapshot().battle.status,'resolved');
  assert.equal(campaign.snapshot().returned,true);assert.equal(campaign.snapshot().events.some(e=>e.type==='peace'),false);
});

test('a stuck walker attempts only two replans and hands control back',async()=>{
  const f=fixture();f.autoplay.start();
  // Call tick without the harness's movement integration to model a collider.
  for(let i=0;i<100&&f.autoplay.state().active;i++){f.autoplay.tick(.5,true);await Promise.resolve();await Promise.resolve();await Promise.resolve();}
  assert.equal(f.autoplay.state().active,false);assert.equal(f.log.plans.length,3);assert.equal(f.autoplay.state().replans,2);assert.match(f.autoplay.state().error,/blocked/);
});

test('autoplay cannot overwrite an already joined hero battle or a disallowed start',()=>{
  const f=fixture();f.setAllowed(false);assert.equal(f.autoplay.start(),false);
  f.setAllowed(true);f.campaign.command({type:'brief'});f.campaign.command({type:'depart'});f.campaign.advance(BATTLE_START);f.campaign.command({type:'join',side:'centaurs'});
  const before=f.campaign.snapshot();assert.equal(f.autoplay.start(),false);assert.deepEqual(f.campaign.snapshot(),before);
});

test('chapter travel follows the Muster Gate and resumes a partial route without returning to Minora',()=>{
  const to={x:places.town.x,z:places.town.z+2},route=yunethreTravelAnchors(TOWER_EXIT,to);
  assert.ok(route.some(p=>Math.abs(p.x+2438.547368)<.01&&p.z===148),'Uses the actual west gate');
  assert.ok(route.some(p=>p.x===-2404&&p.z===148),'Uses the interior market lane');
  const resumed=yunethreTravelAnchors({x:-2802,z:-160},to);
  assert.ok(resumed.every(p=>p.x<-2700),'Does not walk back to already passed city anchors');
  assert.deepEqual(resumed.at(-1),to);
  const camp=yunethreTravelAnchors(to,{x:places.centaurs.x,z:places.centaurs.z+2});
  assert.ok(camp.some(p=>Math.abs(p.x+2710)<.01&&Math.abs(p.z+322.41016)<.01),'Approaches outside the camp tent');
});

test('interior route search stays on the current floor instead of selecting a roof above it',async()=>{
  const seen=[],holds=[];
  const world={bounds:{minX:-20,maxX:20,minZ:-20,maxZ:20},heightAt:()=>21,waterAt:()=>-100,canExploreAt:()=>true,readyAt:()=>true,
    nearColliders:()=>[{x:2,z:0,hx:.5,hz:3,minY:40,maxY:42}],regionAt:()=>({id:16}),
    supportAt:(x,z,options)=>{seen.push(options.maxY);return {height:options.maxY>100?40:21};},state:()=>({bounds:{minX:-20,maxX:20,minZ:-20,maxZ:20}})};
  const plan=createYunethreTravel({world,room:()=>'tower',setPlanning:on=>holds.push(on)}),route=await plan({x:0,z:0},{x:5,z:0});
  assert.deepEqual(route,[{x:5,z:0}]);assert.ok(seen.length>0);assert.ok(seen.every(y=>y===21));assert.deepEqual(holds,[true,false]);
});

test('route preparation loads only the regions crossed by the planned walk',async()=>{
  const loaded=new Set(),prepared=[];
  const world={bounds:{minX:-4000,maxX:-2000,minZ:-2000,maxZ:500},heightAt:()=>21,waterAt:()=>-100,canExploreAt:()=>true,
    regionAt:x=>({id:x<-2700?38:16}),readyAt:x=>loaded.has(x<-2700?38:16),nearColliders:()=>[],supportAt:()=>({height:21})};
  const plan=createYunethreTravel({world,room:()=>null,prepare:async({x,z})=>{const id=world.regionAt(x,z).id;prepared.push(id);loaded.add(id);}});
  const route=await plan(TOWER_EXIT,{x:places.town.x,z:places.town.z+2});
  assert.ok(route.length>5);assert.deepEqual(prepared,[16,38]);
});

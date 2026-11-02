import {COMBAT_LESSONS} from '../../gameplay/combat/combat-tutorial.js';
// Review-only driver: ordinary movement, dialogue buttons and combat keys.
// No hero teleport, campaign restore, troop editing or forced battle results.
import {driveWorldEncounter,clearCombatKeys} from './encounter-controls.js';
import {planWarTravel} from '../../gameplay/autoplay/war-travel.js';
import {LIZEEM_PORTS} from '../../content/regions/minora-frontier/lizeem-passages.js';
import {TALETH_SPOT,TOWER_DOOR,TOWER_EXIT,LOOKOUT_TALETH} from '../../app/exploration/tower-state.js';
const $=id=>document.getElementById(id),frame=()=>new Promise(r=>requestAnimationFrame(r));
const check=(v,m)=>{if(!v)throw Error(m);};
const click=id=>{const el=$(id);check(el&&!el.disabled&&!el.hidden,'Unavailable control: '+id);el.click();};
const key=code=>{for(const type of ['keydown','keyup'])document.dispatchEvent(new KeyboardEvent(type,{code,bubbles:true,cancelable:true}));};
const focus=()=>window.dispatchEvent(new Event('focus'));
const host=()=>window.__EXPLORATION__??window.__STILLROOM__;
const pos=a=>{const p=a.state().position;return Array.isArray(p)?{x:p[0],y:p[1],z:p[2]}:p;};
let stage='launch',round=0,currentBattle=null,lastPort='minora',battleCount=0,retries=0;
const notes=[],fights=[];
function text(){return [...document.querySelectorAll('dialog[open],[role="dialog"],#opening-fronts,#taleth-campaign-now,#exploration-status')].filter(e=>e.getClientRects().length).map(e=>e.innerText).join('\n').slice(0,14000);}
async function wait(fn,label,seconds=180){const end=performance.now()+seconds*1000;while(!fn()){check(!window.__EXPLORATION_ERROR__,window.__EXPLORATION_ERROR__);check(performance.now()<end,label+' timed out');await frame();}}
async function ticks(a,n,dt=1/60){focus();for(let i=0;i<n;i++){a.step(dt);if(i%120===119)await frame();}}
async function walk(a,to,{planned=true,reach=1,allowEncounter=false}={}){
  focus();const horse=a.stable?.state().horse;
  if(planned){
    const p=pos(a),limit=a.stable?.mounted?1.5:1.05;
    const near=(a.war?.state().soldiers?.people??[]).filter(s=>Math.abs(s.y-p.y)<2.6).sort((s,t)=>Math.hypot(s.x-p.x,s.z-p.z)-Math.hypot(t.x-p.x,t.z-p.z))[0];
    const gap=near&&Math.hypot(near.x-p.x,near.z-p.z);
    if(near&&gap<limit&&gap>.01)await walk(a,{x:p.x+(p.x-near.x)/gap*1.4,z:p.z+(p.z-near.z)/gap*1.4},{planned:false,reach:.3});
  }
  const obstacles=[...(a.war?.state().soldiers?.people??[]).map(p=>({...p,r:1.6})),...(!a.stable?.mounted&&horse?[{...horse,r:1.8}]:[])];
  let route=planned&&a.testWorld?await planWarTravel(a.testWorld,pos(a),to,{radius:a.stable?.mounted?1.1:.65,spacing:2,obstacles}):[to];
  check(route,'No walkable route to '+JSON.stringify(to));
  let stopped=0,old=pos(a);
  try{for(let i=0;i<18000&&route.length;i++){
    const p=pos(a),d=Math.hypot(route[0].x-p.x,route[0].z-p.z);
    if(d<(route.length===1?reach:.28)){route.shift();continue;}
    if(allowEncounter&&a.state().mode==='encounter')return;
    if(a.state().mode==='briefing'&&a.stable?.state().offerOpen)return;
    a.look({yaw:Math.atan2(p.x-route[0].x,p.z-route[0].z),pitch:.3,distance:9});a.hold('KeyW',true);a.hold('ShiftLeft',true);a.step(d<1?.02:.04);
    const now=pos(a);stopped=Math.hypot(now.x-old.x,now.z-old.z)<.002?stopped+.04:0;old=now;
    check(stopped<3,'Walking blocked at '+JSON.stringify(now)+' toward '+JSON.stringify(route[0])+' / '+a.state().mode);
    if(i%60===59)await frame();
  }check(!route.length,'Walking exceeded review allowance');}finally{a.hold('KeyW',false);a.hold('ShiftLeft',false);}
}
async function fight(a,training=false){
  focus();const read=()=>training?a.state().encounter:a.war.state().encounter.encounter;
  const start=read();check(start,'Combat did not open');
  if(start.briefing)click('combat-trial-start');key('KeyT');
  let cast=false;
  for(let i=0;i<18000&&read()&&!read().outcome;i++){
    const s=read();
    if(s.tutorial?.id==='block')a.hold('KeyF',true);
    else if(s.tutorial?.id==='fireball'){if(i%60===1)key('KeyQ');}
    else driveWorldEncounter(a,s);
    if(!training&&!cast&&i>90){key('KeyQ');cast=true;}
    a.step(1/60);if(i%120===119)await frame();
    if(a.state().mode==='limbo')break;
  }
  clearCombatKeys(a);a.hold('KeyF',false);const s=read();
  const result={training,trial:s?.trial,battle:currentBattle?.region,outcome:s?.outcome??a.state().mode,seconds:s?.time,hp:s?.hero?.hp,enemies:start.guards?.length,allies:start.allies?.length,alliesLost:s?.squad?.alliesLost};fights.push(result);
  if(s?.outcome){await ticks(a,100);return result;}
  throw Error('Combat did not finish: '+JSON.stringify(result));
}
async function boat(a,destination){
  const nearest=[...LIZEEM_PORTS].sort((x,y)=>Math.hypot(x.keeper.x-pos(a).x,x.keeper.z-pos(a).z)-Math.hypot(y.keeper.x-pos(a).x,y.keeper.z-pos(a).z))[0];
  await walk(a,{x:nearest.keeper.x,z:nearest.keeper.z-1.6},{reach:.4});key('KeyF');
  check(a.harbor.state().speaking,'Reached boatkeeper but interaction did not open');
  const b=document.querySelector('#harbor-dialog [data-port="'+destination+'"]');check(b,'Destination not offered: '+destination);b.click();
  await wait(()=>!a.harbor.state().busy,'Boat passage');check(a.state().mode==='playing','Boat passage failed: '+document.querySelector('.harbor-error')?.textContent);lastPort=destination;
}
export async function next(){
  focus();const label=stage;let detail=null,a=host();
  if(stage==='launch'){await wait(()=>$('new-world-war'),'Main menu');click('new-world-war');await wait(()=>window.__STILLROOM__,'Opening');stage='introduction';}
  else if(stage==='introduction'){for(let i=0;i<900&&!a.state().dialogue;i++)a.step(1/60);check(a.state().dialogue,'Taleth did not approach');stage='uguth';}
  else if(stage==='uguth'){click('arrival-handoff');await walk(a,{x:-1,z:18},{planned:false});key('KeyF');check($('arrival-train'),'Uguth conversation missing');click('arrival-train');stage='training';}
  else if(stage==='training'){
    detail=await fight(a,true);check(detail.outcome==='success','Preparation defeat');round++;stage=round<COMBAT_LESSONS.length?'next-lesson':'approval';
  }
  else if(stage==='next-lesson'){click('world-skirmish-continue');stage='training';}
  else if(stage==='approval'){check(a.state().progress.approved,'Completed tutorial did not unlock Azhora');click('world-skirmish-continue');await walk(a,{x:0,z:38.5},{planned:false,reach:.3});key('KeyF');stage='portal';}
  else if(stage==='portal'){click('arrival-depart');await wait(()=>window.__EXPLORATION__,'Azhora');stage='taleth';}
  else if(stage==='taleth'){await walk(a,{x:TALETH_SPOT.x+1,z:TALETH_SPOT.z+2},{planned:false});key('KeyF');stage='allegiance';}
  else if(stage==='allegiance'){click('tower-allegiance-west');click('tower-next');await walk(a,{x:TOWER_DOOR.x,z:TOWER_DOOR.z-1},{planned:false,reach:.5});key('KeyF');await wait(()=>!a.tower.state().inside&&a.state().mode==='playing','First tower exit');stage='bear';}
  else if(stage==='bear'){
    for(let i=0;i<900&&!a.stable.state().offerOpen;i++)a.step(1/60);
    if(!a.stable.state().offerOpen)await walk(a,{x:-2424,z:65});
    for(let i=0;i<900&&!a.stable.state().offerOpen;i++)a.step(1/60);
    check(a.stable.state().offerOpen,'Bear did not offer the horse');stage='harbor';
  }
  else if(stage==='harbor'){
    click('stable-next');key('KeyG');check(a.stable.mounted,'Offered horse could not be mounted');
    for(const p of [{x:-2404,z:70},{x:-2328,z:70},{x:-2308,z:70},{x:-2308,z:135},{x:-2232,z:135},{x:-2232,z:159}])await walk(a,p);
    stage='first-passage';
  }
  else if(stage==='first-passage'){await boat(a,'caricas');currentBattle=a.war.state().campaign.engagements.find(b=>b.id===a.harbor.state().lastTrip.battleId);check(currentBattle,'Opening battle already ended before passage');stage='boundary';}
  else if(stage==='boundary'){
    const p=pos(a),horse=a.stable.state().horse,dx=currentBattle.location.x-p.x,dz=currentBattle.location.z-p.z,d=Math.hypot(dx,dz);
    if(horse&&Math.hypot(horse.x-p.x,horse.z-p.z)<5&&(horse.x-p.x)*dx+(horse.z-p.z)*dz>0){
      notes.push({kind:'horse-in-guided-approach',region:currentBattle.region,position:p,horse});
      await walk(a,{x:p.x-dz/d*3.5,z:p.z+dx/d*3.5},{planned:false,reach:.4});
    }
    await walk(a,currentBattle.location,{planned:false,allowEncounter:true});check(a.state().mode==='encounter','Boundary did not offer battle');stage='join';
  }
  else if(stage==='join'){
    const b=a.war.state().campaign.pending;click(b.attacker==='west'?'fight-attacker':'fight-defender');await wait(()=>['skirmish','encounter'].includes(a.state().mode),'Combat preparation');check(a.state().mode==='skirmish','Join button did not start battle');stage='battle';
  }
  else if(stage==='battle'){
    detail=await fight(a);stage=detail.outcome==='success'?'result':'defeat';
  }
  else if(stage==='defeat'){
    notes.push({kind:'combat-defeat',battle:currentBattle.region});check(retries++<3,'Repeated combat defeats');
    await wait(()=>a.state().mode==='limbo','Afterlife');await a.afterlife.choose('retry');stage='battle';
  }
  else if(stage==='result'){
    const before=a.war.clock().elapsedSeconds;click('world-skirmish-continue');await ticks(a,120);battleCount++;
    detail={clockBefore:before,clockAfter:a.war.clock().elapsedSeconds,running:a.war.clock().running,mode:a.state().mode};
    if(a.state().mode==='encounter'){notes.push({kind:'unexpected-second-stage',battle:currentBattle.region});stage='join';}else stage='choose';
  }
  else if(stage==='choose'){
    const c=a.war.state().campaign;
    if(c.winner){stage='return';detail={winner:c.winner};}
    else{
      const active=c.engagements.filter(b=>b.status==='active'&&!b.heroResult&&!b.participation?.result);
      currentBattle=active.sort((x,y)=>x.endsOn-y.endsOn)[0];
      if(currentBattle){
        // If already in the desired town, use its real walking routes.
        if(lastPort===currentBattle.region){const {planWarEntry}=await import('../../gameplay/autoplay/war-entry-route.js');const route=await planWarEntry(a.testWorld,pos(a),currentBattle,{radius:.65});check(route,'No battlefield approach');for(const p of route){await walk(a,p,{planned:false,allowEncounter:true});if(a.state().mode==='encounter')break;}stage=a.state().mode==='encounter'?'join':'boundary';}
        else{await boat(a,currentBattle.region);stage='boundary';}
      }else{a.openMap();const b=document.querySelector('#world-war-map-time [data-speed="20"]');check(b&&!b.disabled,'Map time unavailable');b.click();stage='wait-map';}
    }
  }
  else if(stage==='wait-map'){
    for(let i=0;i<15000;i++){
      const c=a.war.state().campaign;if(c.winner||c.engagements.some(b=>b.status==='active'&&!b.heroResult))break;
      a.step(.04);if(i%120===119)await frame();
    }
    document.querySelector('#world-war-map-time [data-speed="0"]').click();key('KeyM');check(a.state().mode==='playing','Map did not close');stage='choose';
  }
  else if(stage==='return'){
    await boat(a,'minora');
    for(const p of [{x:-2232,z:135},{x:-2308,z:135},{x:-2308,z:70},{x:-2404,z:70},TOWER_EXIT])await walk(a,p);
    key('KeyF');await wait(()=>a.tower.state().room==='tower'&&a.state().mode==='playing','Return to tower');stage='conclusion';
  }
  else if(stage==='conclusion'){await walk(a,{x:TALETH_SPOT.x,z:TALETH_SPOT.z+2},{planned:false});key('KeyF');stage='lookout';}
  else if(stage==='lookout'){click('tower-next');await wait(()=>a.tower.state().room==='lookout'&&a.state().mode==='playing','Lookout');await walk(a,{x:LOOKOUT_TALETH.x-1,z:LOOKOUT_TALETH.z-1},{planned:false});key('KeyF');stage='river-review';}
  else if(stage==='river-review'){click('tower-next');stage='political-review';}
  else if(stage==='political-review'){click('tower-next');check(a.tower.state().concluded,'Conclusion not recorded');stage='save-complete';}
  else if(stage==='save-complete'){
    click('tower-close');check(a.save().ok,'Completion failed to save');await a.loadSaved();check(a.tower.state().concluded,'Completion lost on reload');stage='complete';
  }
  a=host();window.dispatchEvent(new Event('blur'));await frame();await frame();
  const c=a?.war?.state().campaign;
  const checkpoint=c&&a.state().mode==='playing'&&a.save().ok?a.store.read().data:null;
  return {label,stage,done:stage==='complete',detail,position:a&&pos(a),clock:a?.war?.clock(),checkpoint,reviewState:{stage,round,currentBattle,lastPort,battleCount,retries,fights,notes},campaign:c?{scenario:c.scenario,day:c.day,winner:c.winner,hero:c.hero,regions:Object.fromEntries(Object.entries(c.regions).map(([id,r])=>[id,{owner:r.owner,garrison:r.garrison}])),battles:c.engagements.map(b=>({id:b.id,region:b.region,status:b.status,started:b.started,endsOn:b.endsOn,heroResult:b.heroResult,participation:b.participation}))}:null,text:text(),fights,notes,battleCount,frameErrors:a?.state().frameErrors??[],render:a?.renderStats()};
}
export async function resumeReview(s){
  await wait(()=>document.querySelector('[data-continue-mode="war"]'),'Continue menu');document.querySelector('[data-continue-mode="war"]').click();await wait(()=>window.__EXPLORATION__,'Saved review');
  ({stage,round,currentBattle,lastPort,battleCount,retries}=s);fights.push(...s.fights);notes.push(...s.notes);notes.push({kind:'review-resumed-from-real-save',stage});
}
export const diagnostic=()=>({stage,position:host()&&pos(host()),state:host()?.state(),war:host()?.war?.state(),text:text(),fights,notes});

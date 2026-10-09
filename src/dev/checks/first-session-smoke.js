import {TALETH_SPOT,TOWER_DOOR,TOWER_EXIT} from '../../app/exploration/tower-state.js';
import {MINORA_STABLE as STABLE} from '../../content/regions/minora-frontier/minora-stable.js';
import {driveWorldEncounter,clearCombatKeys} from './encounter-controls.js';
const assert=(v,m)=>{if(!v)throw Error(m);};
const frames=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
const key=code=>document.dispatchEvent(new KeyboardEvent('keydown',{code,bubbles:true}));
async function loaded(a){const end=performance.now()+300000;while(a.state().mode==='loading'&&performance.now()<end)await new Promise(r=>setTimeout(r,50));assert(a.state().mode!=='loading','Loading completes');}
async function travel(a,target,{entry=false,reach=1}={}){
  let stuck=0,seconds=0;
  try{for(let i=0;i<2400;i++){
    if(i%90===0)window.dispatchEvent(new Event('focus'));
    await loaded(a);const s=a.state(),p=s.position,d=Math.hypot(target.x-p[0],target.z-p[2]);
    if(entry&&s.mode==='encounter')return seconds;
    assert(s.mode==='playing','Travel stays in the world: '+s.mode);
    if(d<reach)return seconds;
    a.look({yaw:Math.atan2(p[0]-target.x,p[2]-target.z),pitch:.25,distance:10});a.hold('KeyW',true);a.hold('ShiftLeft',true);a.step(.04);seconds+=.04;
    const q=a.state().position;stuck=Math.hypot(q[0]-p[0],q[2]-p[2])<.001?stuck+1:0;
    assert(stuck<80,'Travel blocked: '+JSON.stringify({target,position:q,probe:a.groundProbe(q[0],q[2])}));
    if(i%90===89)await frames();
  }throw Error('Travel exceeded 96 active seconds');}finally{a.hold('KeyW',false);a.hold('ShiftLeft',false);}
}
let rideSeconds=0,arrivalDay=0;
export async function departure(a){
  window.dispatchEvent(new Event('focus'));
  await travel(a,{x:TALETH_SPOT.x,z:TALETH_SPOT.z+2},{reach:1.5});key('KeyF');
  assert(a.state().mode==='briefing','Ordinary walking reaches Taleth');document.getElementById('tower-next').click();
  await travel(a,{x:TOWER_DOOR.x,z:TOWER_DOOR.z-1.5});key('KeyF');await loaded(a);
  assert(!a.tower.state().inside,'Real tower door reaches Minora');
  await travel(a,{x:STABLE.bear.x+1,z:STABLE.bear.z-2},{reach:1.2});key('KeyF');
  assert(a.state().mode==='briefing','Ordinary walking reaches Bear');for(let i=0;i<3;i++)document.getElementById('stable-next').click();
  await travel(a,{x:STABLE.horse.x+1.3,z:STABLE.horse.z},{reach:.8});key('KeyG');
  assert(a.stable.mounted,'Bear’s horse mounts through G');a.war.trackRoute();
  return {checks:['Walk to Taleth, accept briefing, leave through actual door','Walk to Bear, receive horse and mount with normal controls']};
}
export async function ride(a){
  // Test driver follows existing streets, not player-facing route checkpoints.
  for(const [x,z] of [[-2404,70],[-2328,70],[-2308,70],[-2308,135],[-2150,135],[-2120,150]])rideSeconds+=await travel(a,{x,z});
  arrivalDay=a.war.state().campaign.day;assert(arrivalDay<=3,'Ordinary canter reaches the first battle in time');
  const destination=a.war.save(a.snapshot()).navigation;assert(a.save().ok,'Mounted approach can save');await a.loadSaved();
  assert(JSON.stringify(a.war.save(a.snapshot()).navigation)===JSON.stringify(destination),'Continue keeps the selected army');key('KeyG');assert(a.stable.mounted,'Saved horse can be remounted');
  for(let i=0;i<1800&&a.war.state().campaign.day<3;i++){a.step(.04);if(i%180===179)await frames();}
  assert(a.war.state().campaign.day===3,'First battle starts by ordinary elapsed time');
  await travel(a,{x:-2092,z:231},{entry:true});
  assert(a.war.state().campaign.pending?.region==='caricas'&&a.stable.mounted,'Normal ride enters Caricas battlefield decision');
  return {checks:['Ride the city streets and White Bridge without teleportation','Reach Caricas before the first battle closes','Mounted save/Continue retains army tracking and horse','Ordinary campaign time starts day-three battle; riding triggers entry'],rideSeconds,arrivalDay};
}
async function fight(a){
  for(let i=0;i<6600;i++){
    if(i%180===0)window.dispatchEvent(new Event('focus'));
    const s=a.war.state().encounter.encounter;if(s?.outcome){clearCombatKeys(a);return s;}
    assert(a.state().mode==='skirmish'&&s,'Battle remains playable');driveWorldEncounter(a,s);a.step(1/60);if(i%180===179)await frames();
  }throw Error('Battle did not finish');
}
export async function battle(a,side='west'){
  await a.war.help(side);const first=await fight(a);assert(first.hero.hp>0,'Interception can be completed with ordinary combat inputs');
  a.war.continue();assert(a.state().mode==='encounter'&&a.war.state().campaign.pending.rally,'Regroup opens final assault');
  document.getElementById('assault-with-allies').checked=true;await a.war.help(side);const final=await fight(a);assert(final.outcome==='success','Allied final assault is winnable');
  a.war.continue();a.war.pause();assert(a.war.state().campaign.day===6,'Final assault advances directly to result');
  assert(a.war.state().campaign.regions.caricas.owner===side,'Victory matches the actual controlling faction');
  assert(a.council.state().influence.leader===(side==='west'?'mayor':'temple'),'Council responds to the chosen side');
  assert(a.save().ok,'Completed session saves');assert(!a.state().frameErrors.length,'No first-session frame errors');
  return {checks:['Both battle phases complete through normal combat inputs','Allied victory resolves the field immediately on day six','Council leadership follows the chosen faction','Result and campaign save together'],side,first:{outcome:first.outcome,hp:first.hero.hp},final:{outcome:final.outcome,hp:final.hero.hp,squad:final.squad}};
}

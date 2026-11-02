import {menu} from './tower-floors-smoke.js';
import {TOWER,TOWER_DOOR,TALETH_SPOT} from '../../app/exploration/tower-state.js';
import {GUILD_EXPANSION} from '../../content/regions/minora-frontier/guild-expansion.js';
import {GUILD_EXHIBITS} from '../../content/regions/minora-frontier/guild-exhibits.js';
import {TOWER_FLOORS,towerStairPoint,towerFloorAt} from '../../content/regions/minora-frontier/tower-floor-layout.js';
import {validateWorldWarSave} from '../../app/exploration/war-checkpoint.js';
import {guildWizardPosition} from '../../app/exploration/tower-wizard-host.js';
export {menu};
const checks=[],$=id=>document.getElementById(id),frame=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
const assert=(value,label)=>{if(!value)throw Error(label);checks.push(label);console.log('EXPLORATION_CHECK '+label);};
const key=code=>{for(const type of ['keydown','keyup'])document.dispatchEvent(new KeyboardEvent(type,{code,bubbles:true,cancelable:true}));};
const point=a=>{const [x,y,z]=a.state().position;return {x,y,z};};
const time=a=>JSON.stringify({day:a.war.state().campaign.day,seconds:a.war.clock().elapsedSeconds,hour:a.dayNight?.state().hour});
const ticks=(a,n=50)=>{for(let i=0;i<n;i++)a.step(.04);};
let initialTime,progress=1,current='taleth',initialSave;
function report(a){return {checks:[...checks],state:a.state(),guild:a.testWorld.state().guild,render:a.renderStats()};}
function walk(a,target){
  a.hold('KeyW',true);try{for(let i=0;i<1000;i++){if(a.guildWizards.state().id==='bolbur'){a.guildWizards.close();a.hold('KeyW',true);}const p=point(a),d=Math.hypot(p.x-target.x,p.z-target.z);if(d<.05)return;a.look({yaw:Math.atan2(p.x-target.x,p.z-target.z),pitch:.2,distance:6});a.step(Math.min(.025,d/5));}throw Error('Blocked walking from '+JSON.stringify(point(a))+' to '+JSON.stringify(target));}finally{a.hold('KeyW',false);}
}
const local=(a,x,z)=>walk(a,{x:TOWER.x+x,z:TOWER.z+z});
async function floor(a,id){
  if(a.workshop.state().open)$('tower-workshop-close').click();if(a.guildWizards.state().open)$('guild-wizard-close').click();
  const p=point(a);local(a,4,p.z-TOWER.z);local(a,4,0);local(a,10,0);walk(a,towerStairPoint(progress));
  const def=GUILD_EXPANSION.find(w=>w.id===id),next=def.level+1,count=Math.round(Math.abs(next-progress)*96);let error=0;
  for(let i=1;i<=count;i++){const target=towerStairPoint(progress+(next-progress)*i/count);walk(a,target);error=Math.max(error,Math.abs(point(a).y-target.y));}
  progress=next;current=id;local(a,10,0);local(a,4,0);local(a,id==='bolbur'?8:-2,0);
  assert(error<.4,'Real walking reaches '+id+' with no stair teleport or fall');assert(towerFloorAt(point(a).y).id===id,id+' has its own physical landing');
  a.step(0);key('KeyF');assert(a.guildWizards.state().id===id,'F addresses '+def.name);
  assert($('guild-wizard-name').textContent===def.name&&$('guild-wizard-topic').textContent===def.title,'Correct identity and domain for '+id);
  $('guild-wizard-question').click();assert(a.guildWizards.state().topic==='work',id+' explains their work');ticks(a);
  $('guild-wizard-back').click();$('guild-wizard-question-future').click();assert(a.guildWizards.state().topic==='future',id+' explains future possibilities');key('Escape');
  assert(time(a)===initialTime,id+' exploration and conversation preserve all time');
  if(id==='helba'||id==='bolbur'){
    assert(a.save().ok,id+' can save');const saved=a.store.read().data;assert(validateWorldWarSave(saved,saved.format),id+' checkpoint validates');
    await a.loadSaved();a.resume();window.dispatchEvent(new Event('focus'));a.step(0);assert(towerFloorAt(point(a).y).id===id,id+' restores at the correct floor');
  }
  local(a,4,0);local(a,4,4);a.look({yaw:.45,pitch:.25,distance:11});await frame();return report(a);
}
export async function opening(a){
  window.dispatchEvent(new Event('focus'));a.step(0);initialTime=time(a);a.save();initialSave=structuredClone(a.store.read().data);
  const guild=a.testWorld.state().guild;assert(guild.floors.length===11,'All eleven agreed floors are present');assert(guild.floors.filter(f=>f.built).length===3,'The eight new furnished rooms are lazy at startup');assert(!guild.sanctuary,'The sanctuary does not load at startup');
  assert(!a.tower.state().briefed&&!a.war.state().campaignSide,'All rooms may be explored before choosing allegiance');return report(a);
}
export async function hairReview(a,{id,pitch=.35}){
  const at=guildWizardPosition(id);
  await a.visit({...at,x:at.x+1,z:at.z+2});a.look({yaw:.55,pitch,distance:4});a.step(0);await frame();
  assert(a.guildWizards.state().near===id,'Reviewing '+id+' at ordinary conversation distance');
  assert(a.state().heroVisible&&!a.state().frameErrors.length,'The '+id+' hairstyle renders in third-person exploration');
  assert(time(a)===initialTime&&!a.tower.state().exteriorLoaded,'Hair review keeps tower time frozen and exterior unloaded');
  return report(a);
}
export async function dreamRoom(a,view){
  const at=guildWizardPosition('nessa');
  await a.visit({x:TOWER.x,y:at.y,z:TOWER.z+4});
  a.look({yaw:0,pitch:view==='ceiling'?-.16:.25,distance:5});
  a.step(0);await frame();
  const before=a.testWorld.state().guild.floors.find(f=>f.id==='nessa').demonstration.atmosphere;
  ticks(a,45);await frame();
  const after=a.testWorld.state().guild.floors.find(f=>f.id==='nessa').demonstration.atmosphere;
  assert(after.time>before.time,'Dream mist moves while campaign time stands still');
  assert(after.drawCalls===2&&after.triangles<100,'Mist, dream lights and canopy stay within two small draw batches');
  assert(time(a)===initialTime&&!a.state().frameErrors.length,'Dream room preserves campaign time and renders without errors');
  return report(a);
}
export async function dreamLeave(a){
  const at=guildWizardPosition('veyra');await a.visit({...at,z:at.z+3});a.look({yaw:.6,pitch:.3,distance:6});a.step(0);await frame();
  const floors=a.testWorld.state().guild.floors;
  assert(!floors.find(f=>f.id==='nessa').visible&&floors.find(f=>f.id==='veyra').visible,'Nessa mist switches off when the player leaves her floor');
  assert(!floors.find(f=>f.id==='veyra').demonstration.atmosphere,'Veyra retains her own clear chamber');
  assert(!a.state().frameErrors.length&&time(a)===initialTime,'Leaving the dream chamber keeps time and rendering intact');
  return report(a);
}
export async function gardenRoom(a,view){
  if(a.workshop.state().open)key('Escape');if(a.guildWizards.state().open)key('Escape');
  const at=guildWizardPosition('helba');current='helba';
  const views={across:{x:0,z:4,yaw:0,pitch:.23,distance:5},beds:{x:2.7,z:3.2,yaw:-1.65,pitch:.4,distance:4},canopy:{x:0,z:1,yaw:0,pitch:-.19,distance:5},fungi:{x:-3,z:4,yaw:2,pitch:.35,distance:4}};
  const v=views[view];await a.visit({x:TOWER.x+v.x,y:at.y,z:TOWER.z+v.z});a.look(v);ticks(a,10);await frame();
  assert(time(a)===initialTime&&!a.state().frameErrors.length,'Living Tangle '+view+' renders with tower time frozen');
  return report(a);
}
export async function gardenPaths(a){
  if(a.workshop.state().open)key('Escape');
  const at=guildWizardPosition('helba');await a.visit({x:TOWER.x+13,y:at.y,z:TOWER.z});
  local(a,4,0);local(a,-2,0);a.step(0);key('KeyF');
  assert(a.guildWizards.state().id==='helba','The garden entrance has a walkable route to Helba');key('Escape');
  local(a,1,0);local(a,1,-5.3);local(a,0,-5.3);a.step(0);
  assert(a.workshop.state().near==='mycelium','The restoration bed remains reachable by walking');
  local(a,1,-5.3);local(a,1,3);local(a,1,9);local(a,1,0);local(a,13,0);
  assert(Math.abs(point(a).y-at.y)<.1,'Garden paths keep the visitor grounded');
  assert(time(a)===initialTime&&!a.state().frameErrors.length,'Garden exploration preserves frozen time without frame errors');
  a.look({yaw:Math.PI/2,pitch:.22,distance:3});await frame();return report(a);
}
export const veyra=a=>floor(a,'veyra'),nessa=a=>floor(a,'nessa'),odran=a=>floor(a,'odran'),helba=a=>floor(a,'helba'),neris=a=>floor(a,'neris'),oris=a=>floor(a,'oris'),maelon=a=>floor(a,'maelon'),bolbur=a=>floor(a,'bolbur');
export async function demonstration(a){
  const exhibits=GUILD_EXHIBITS.filter(e=>e.floor===current&&!e.travel);
  for(const e of exhibits){
    await a.visit({x:TOWER.x+e.x,y:TOWER.y+e.y,z:TOWER.z+e.z+e.front*2.7});a.step(0);
    assert(a.workshop.state().near===e.id,'The '+e.id+' demonstration has a reachable viewing position');key('KeyF');assert(a.workshop.state().id===e.id,'F observes '+e.name);
    const before=JSON.stringify(a.testWorld.state().guild.floors.find(f=>f.id===current).demonstration?.objects);
    $('tower-workshop-action').click();await Promise.resolve();ticks(a,55);await frame();
    assert(!$('tower-workshop-response').hidden,'The '+e.id+' demonstration gives a clear result');
    if(e.id==='borrow-face')assert(a.guildDisguise.active(),'The mirror changes the actual player model');
    else{const after=JSON.stringify(a.testWorld.state().guild.floors.find(f=>f.id===current).demonstration?.objects);assert(before!==after,'The '+e.id+' demonstration changes the visible scene');}
    for(const option of e.alternatives??[]){const button=document.querySelector('[data-action="'+option.id+'"]');button.click();await Promise.resolve();ticks(a,10);assert($('tower-workshop-response').textContent===option.response,option.id+' gives its own outcome');}
    if(e.id==='borrow-face')assert(!a.guildDisguise.active(),'The mirror can restore appearance immediately');
    assert(time(a)===initialTime,'Time remains frozen during '+e.id);
    const buttons=[...$('tower-workshop-dialog').querySelectorAll('button')].filter(b=>!b.hidden);for(const button of buttons){const r=button.getBoundingClientRect();assert(r.top>=0&&r.bottom<=innerHeight,'Demonstration controls remain in view: '+e.id);}
    if(e!==exhibits.at(-1))key('Escape');
  }
  await frame();return report(a);
}
export async function sanctuary(a){return (await import('./guild-sanctuary-smoke.js')).enter(a);}
export async function habitat(a,id){
  const m=await import('./guild-sanctuary-smoke.js'),r=a.testWorld.state().guild.sanctuary.roster.find(r=>r.habitat===id);
  return m.animal(a,r.species);
}
export async function finish(a){
  await (await import('./guild-sanctuary-smoke.js')).saveReturn(a);
  await a.visit({...TOWER_DOOR,y:TOWER.y,z:TOWER_DOOR.z-1});key('KeyF');assert(a.tower.state().inside&&!a.tower.state().briefed,'Sanctuary travel cannot bypass Taleth’s allegiance gate');
  await a.visit({...TALETH_SPOT,y:TOWER.y,z:TALETH_SPOT.z+2});key('KeyF');assert(!$('tower-briefing').hidden,'Taleth still gives the original opening');key('Escape');
  assert(a.store.save(initialSave).ok,'The original checkpoint remains valid');await a.loadSaved();a.resume();a.step(0);await frame();
  assert(!a.state().frameErrors.length,'No runtime frame errors during the full guild visit');assert(a.testWorld.state().guild.activeRoomLights===1,'Only the current chamber light is active');return report(a);
}

export async function sanctuarySetup(a){return (await import('./guild-sanctuary-smoke.js')).setup(a);}

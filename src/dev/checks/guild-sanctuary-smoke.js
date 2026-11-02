import {opening as towerOpening} from './guild-expansion-smoke.js';
import {TOWER} from '../../app/exploration/tower-state.js';
import {towerStairPoint} from '../../content/regions/minora-frontier/tower-floor-layout.js';
import {SANCTUARY as S,SANCTUARY_PATHS,sanctuaryContains} from '../../content/regions/minora-frontier/guild-sanctuary-layout.js';
import {validateWorldWarSave} from '../../app/exploration/war-checkpoint.js';
const checks=[],frame=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
const assert=(v,label)=>{if(!v)throw Error(label);checks.push(label);console.log('EXPLORATION_CHECK '+label);};
const point=a=>{const [x,y,z]=a.state().position;return {x,y,z};};
const clock=a=>JSON.stringify([a.war.clock().elapsedSeconds,a.war.state().campaign.day,a.dayNight.state().hour]);
let frozen,welcomed=false;
const state=a=>({checks:[...checks],position:point(a),guild:a.testWorld.state().guild,render:a.renderStats()});
function closeGreeting(a){if(a.guildWizards.state().open){assert(a.guildWizards.state().id==='bolbur','Bolbur personally welcomes the visitor at the doorway');welcomed=true;a.guildWizards.close();}}
async function walk(a,target){
  a.hold('KeyW',true);
  try{for(let i=0;i<12000;i++){
    closeGreeting(a);a.hold('KeyW',true);const p=point(a),d=Math.hypot(target.x-p.x,target.z-p.z);if(d<.08)return;
    a.look({yaw:Math.atan2(p.x-target.x,p.z-target.z),pitch:.18,distance:6});a.step(Math.min(.025,d/5));
    if(i%120===0||a.state().mode==='loading')await frame();
  }throw Error('Blocked walking from '+JSON.stringify(point(a))+' to '+JSON.stringify(target));}
  finally{a.hold('KeyW',false);}
}
export async function setup(a){await towerOpening(a);frozen=clock(a);return state(a);}
export async function enter(a){
  frozen??=clock(a);
  await a.visit(towerStairPoint(5));
  let error=0;
  for(let i=1;i<=96;i++){const next=towerStairPoint(5+i/96);await walk(a,next);error=Math.max(error,Math.abs(point(a).y-next.y));}
  assert(error<.4,'The final spiral flight is climbed with ordinary movement');
  await walk(a,{x:TOWER.x+9,z:TOWER.z});closeGreeting(a);
  assert(welcomed,'The first arrival opens Bolbur’s explanation without a teleport sign');
  await walk(a,{x:TOWER.x,z:TOWER.z});await frame();
  const s=a.testWorld.state().guild.sanctuary;
  assert(s.active&&s.species===12&&s.size>=1400,'The doorway leads directly into a region with twelve North American species');
  assert(!a.testWorld.guildGuides?.().length,'There are no climate teleport signs');
  a.minimap.update(.2,0);assert(a.minimap.state().draw.counts.paths>0,'The minimap shows the actual walking trails');
  assert(clock(a)===frozen&&!a.tower.state().exteriorLoaded,'The sanctuary freezes campaign time without loading the exterior');
  a.look({yaw:Math.PI/2,pitch:.10,distance:7});await frame();return state(a);
}
export async function trail(a,branch){
  const path=SANCTUARY_PATHS[branch];
  if(branch===1)for(const p of [...SANCTUARY_PATHS[0]].reverse())await walk(a,p);
  for(const p of path.slice(1))await walk(a,p);
  const p=point(a);assert(sanctuaryContains(p.x,p.z,p.y),'Trail '+branch+' stays on the continuous landscape');
  assert(clock(a)===frozen&&!a.state().frameErrors.length,'Walking trail '+branch+' preserves frozen time and has no frame errors');
  a.look({yaw:Math.PI/2,pitch:.16,distance:10});await frame();return state(a);
}
export async function animal(a,id){
  closeGreeting(a);const r=a.testWorld.state().guild.sanctuary.roster.find(r=>r.species===id);
  const ground=a.testWorld.heightAt(r.x,r.z);
  await a.visit({x:r.x+5,y:ground,z:r.z+10});for(let i=0;i<12;i++)a.step(.04);
  const s=a.testWorld.state().guild.sanctuary,animal=s.animals.find(an=>an.species===id&&!an.hidden);
  assert(animal,'A visible '+r.name+' is present at natural scale');
  // Developer-only close review; gameplay reaches these clearings on foot.
  const flying=id==='bald-eagle',size=/bison|moose|elk|bear/.test(id)?7:4;
  await a.visit({x:animal.x+size*.7,y:a.testWorld.heightAt(animal.x,animal.z),z:animal.z+size});
  a.look({yaw:.95,pitch:flying?-.35:.55,distance:flying?10:6});await frame();
  if(id==='north-american-beaver'){a.minimap.update(.2,0);assert(a.minimap.state().draw.counts.waterShapes>0,'The minimap shows the actual wetland pond');}
  assert(s.visuals.activeGroups<12&&s.visuals.drawCalls<=36,'Only nearby wildlife is active while viewing '+r.name);
  assert(clock(a)===frozen&&!a.state().frameErrors.length,r.name+' renders without advancing the campaign');return state(a);
}
export async function saveReturn(a){
  closeGreeting(a);await a.visit({x:TOWER.x-80,y:S.y+8,z:TOWER.z});a.step(0);
  const before=point(a);assert(a.save().ok,'The region supports saving');const saved=a.store.read().data;
  assert(validateWorldWarSave(saved,saved.format),'The sanctuary checkpoint validates');
  await a.loadSaved();a.resume();window.dispatchEvent(new Event('focus'));a.step(0);
  assert(Math.hypot(point(a).x-before.x,point(a).z-before.z)<.02,'Continue restores the actual sanctuary position');
  await walk(a,{x:TOWER.x-30,z:TOWER.z});await walk(a,{x:TOWER.x+4,z:TOWER.z});await walk(a,towerStairPoint(6));
  for(let i=1;i<=96;i++)await walk(a,towerStairPoint(6-i/96));
  assert(Math.abs(point(a).y-(TOWER.y+43.2))<.3,'The same doorway returns to the physical staircase');
  assert(!a.testWorld.state().guild.sanctuary.active,'Wildlife and landscape switch off below the sanctuary');
  assert(clock(a)===frozen&&!a.state().frameErrors.length,'Save, return and stairs preserve time without frame errors');
  a.look({yaw:Math.PI/2,pitch:.2,distance:4});await frame();return state(a);
}

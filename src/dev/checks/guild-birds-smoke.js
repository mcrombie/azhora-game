export {menu} from './guild-expansion-smoke.js';
import {TOWER} from '../../app/exploration/tower-state.js';
import {TOWER_BIRDS} from '../../content/regions/minora-frontier/tower-bird-roster.js';
import {TOWER_FLOORS} from '../../content/regions/minora-frontier/tower-floor-layout.js';
const checks=[],frame=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
const assert=(value,label)=>{if(!value)throw Error(label);checks.push(label);console.log('EXPLORATION_CHECK '+label);};
const floors=a=>a.testWorld.state().guild.floors;
const time=a=>JSON.stringify({seconds:a.war.clock().elapsedSeconds,hour:a.dayNight.state().hour});
let frozenTime;
const report=a=>({checks:[...checks],floors:floors(a).map(f=>({id:f.id,visible:f.visible,bird:f.bird})),render:a.renderStats()});
export async function opening(a){
  window.dispatchEvent(new Event('focus'));a.step(0);await frame();frozenTime=time(a);
  assert(floors(a).filter(f=>f.bird).length===3,'Only the original three floors construct birds at startup');
  assert(!a.testWorld.state().guild.sanctuary,'Birds do not load Bolbur landscape at startup');return report(a);
}
export async function review(a,id){
  const d=TOWER_BIRDS.find(b=>b.floor===id),f=TOWER_FLOORS.find(f=>f.id===id);
  a.guildWizards.close();a.workshop.close();
  await a.visit({x:TOWER.x+d.x+1.1,y:TOWER.y+f.y,z:TOWER.z+d.z-1.1});
  a.look({yaw:Math.PI,pitch:.18,distance:3.1});a.step(0);
  for(let i=0;i<5;i++){a.step(.04);await frame();}
  const bird=floors(a).find(f=>f.id===id).bird;
  assert(bird?.active&&bird.species===d.species,id+' has its own visible '+d.name);
  assert(floors(a).filter(f=>f.bird?.active).length===1,id+' only animates its own resident');
  assert(time(a)===frozenTime&&!a.state().frameErrors.length,id+' preserves frozen time and renders without errors');
  assert(a.state().heroVisible,id+' keeps the visitor in third person');return report(a);
}
export async function finish(a){
  const before=floors(a).filter(f=>f.id!=='taleth').map(f=>[f.id,f.bird.clock]);
  await a.visit({x:TOWER.x+4,y:TOWER.y,z:TOWER.z+3});
  for(let i=0;i<8;i++){a.step(.04);await frame();}
  for(const [id,t] of before)assert(floors(a).find(f=>f.id===id).bird.clock===t,id+' stops animating after leaving');
  assert(new Set(floors(a).map(f=>f.bird.species)).size===11,'All eleven residents are distinct species');
  assert(time(a)===frozenTime&&!a.state().frameErrors.length,'The full tower bird tour preserves the campaign and renders cleanly');return report(a);
}

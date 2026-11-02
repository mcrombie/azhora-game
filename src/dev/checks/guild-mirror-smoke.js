export {menu,opening} from './guild-expansion-smoke.js';
import {TOWER} from '../../app/exploration/tower-state.js';
const checks=[],frame=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
const assert=(value,label)=>{if(!value)throw Error(label);checks.push(label);console.log('EXPLORATION_CHECK '+label);};
const mirror=a=>a.testWorld.state().guild.floors.find(f=>f.id==='neris').demonstration.mirror;
const time=a=>JSON.stringify({day:a.war.state().campaign.day,seconds:a.war.clock().elapsedSeconds,hour:a.dayNight.state().hour});
let initialTime;
const report=a=>({checks:[...checks],mirror:mirror(a),appearance:a.guildDisguise.state(),state:a.state(),render:a.renderStats()});
export async function review(a,kind){
  if(kind==='plain'){
    initialTime=time(a);await a.visit({x:TOWER.x+8,y:TOWER.y+21.6,z:TOWER.z+3.3});
    a.look({yaw:Math.PI,pitch:.18,distance:4});a.step(0);
    assert(a.workshop.interact(),'The mirror can be reached and used in the actual room');
  }else{
    const id={elf:'borrow-elf',goblin:'borrow-goblin',mask:'borrow-face',restore:'restore-face'}[kind];
    const button=id==='borrow-face'?document.getElementById('tower-workshop-action'):document.querySelector('[data-action="'+id+'"]');
    button.click();await Promise.resolve();
    assert(a.guildDisguise.state().appearance===(kind==='restore'?null:kind),'The '+kind+' choice changes the actual player appearance');
    assert(!document.getElementById('tower-workshop-response').hidden,'The '+kind+' choice explains its result');
  }
  for(let i=0;i<8;i++){a.step(.04);await frame();}
  assert(mirror(a).frames>0&&mirror(a).active,'The '+kind+' view has a live reflected scene');
  assert(a.state().heroVisible,'The '+kind+' view keeps the visitor visible in third person');
  for(const button of document.querySelectorAll('#tower-workshop-dialog button'))if(!button.hidden){const r=button.getBoundingClientRect();assert(r.top>=0&&r.bottom<=innerHeight,'Mirror choice fits the viewport: '+button.textContent);}
  assert(time(a)===initialTime&&!a.state().frameErrors.length,'The '+kind+' appearance preserves frozen time and renders without errors');
  return report(a);
}
export async function walking(a){
  a.guildDisguise.borrow('goblin');a.workshop.close();a.look({yaw:Math.PI,pitch:.2,distance:4});
  const before=[...a.state().position],eye=mirror(a).eye;
  a.hold('KeyD',true);for(let i=0;i<15;i++)a.step(.04);a.hold('KeyD',false);
  for(let i=0;i<4;i++){a.step(.04);await frame();}
  assert(Math.hypot(a.state().position[0]-before[0],a.state().position[2]-before[2])>.8,'A borrowed body can walk around normally');
  assert(a.guildDisguise.state().appearance==='goblin','Closing the mirror keeps the chosen appearance for exploration');
  assert(JSON.stringify(mirror(a).eye)!==JSON.stringify(eye),'The reflected viewpoint follows the moving viewer');
  assert(time(a)===initialTime&&!a.state().frameErrors.length,'Walking as a goblin keeps time frozen with no frame errors');return report(a);
}
export async function leave(a){
  const before=mirror(a).frames;
  await a.visit({x:TOWER.x+4,y:TOWER.y+10.8,z:TOWER.z+3});a.look({yaw:0,pitch:.3,distance:6});
  for(let i=0;i<8;i++){a.step(.04);await frame();}
  assert(!a.guildDisguise.active(),'Leaving Neris restores Teresod automatically');
  assert(!mirror(a).active&&mirror(a).frames===before,'The mirror stops rendering outside its floor');
  assert(time(a)===initialTime&&!a.state().frameErrors.length,'Leaving the mirror preserves campaign time and rendering');return report(a);
}
export async function hidden(a){
  a.look({yaw:0,pitch:.2,distance:2});
  for(let i=0;i<4;i++){a.step(.04);await frame();}
  const before=mirror(a).frames;
  for(let i=0;i<4;i++){a.step(.04);await frame();}
  assert(!mirror(a).active&&mirror(a).frames===before,'Looking away stops reflection renders even on Neris floor');
  assert(a.guildDisguise.state().appearance==='goblin','Looking away does not cancel the chosen appearance');return report(a);
}

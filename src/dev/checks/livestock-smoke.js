import {prepareWarExterior} from './tower-smoke.js';
import {canStand,moveCharacter} from '../../gameplay/movement/locomotion.js';
const assert=(ok,label)=>{if(!ok)throw Error(label);return label;};
const animals=a=>a.testWorld.agricultureState().livestock.flatMap(f=>f.animals);
const frames=async()=>{for(let i=0;i<3;i++)await new Promise(requestAnimationFrame);};
let sheepId;
const sheep=a=>animals(a).find(s=>s.id===sheepId);
export async function prepare(a){
  await prepareWarExterior(a);
  for(let i=0;i<100&&document.getElementById('stable-lesson')?.hidden;i++)a.step(.04);
  if(!document.getElementById('stable-lesson')?.hidden)document.getElementById('stable-next').click();
  a.war.pause();const herd=animals(a),target=herd.filter(s=>s.id.startsWith('caricas')).sort((a,b)=>Math.hypot(a.x+2181,a.z-190)-Math.hypot(b.x+2181,b.z-190))[0];
  assert(target,'Caricas sheep loaded');sheepId=target.id;
  await a.visit({x:target.x,z:target.z+7});a.selectMount('foot');a.war.pause();a.look({yaw:.4,pitch:.3,distance:8});
  await frames();
  return {checks:[assert(herd.length>=60,'Living sheep loaded throughout the five regions'),assert(a.state().mode==='playing','Ordinary exploration active')],sheep:herd.length,target:sheep(a)};
}
export async function grazing(a){
  const before=animals(a);for(let i=0;i<400;i++)a.step(.04);const after=animals(a);
  const moved=after.filter((s,i)=>Math.hypot(s.x-before[i].x,s.z-before[i].z)>.2);
  const posed=after.filter((s,i)=>Math.abs(s.head-before[i].head)>.01);
  const target=sheep(a);a.look({yaw:.5,pitch:.32,distance:10});await frames();
  return {checks:[assert(moved.length>0,'Nearby sheep take short walks'),assert(posed.length>0,'Grazing head animation changes'),assert(!a.state().frameErrors.length,'No rendering errors')],moved:moved.length,posed:posed.length,target,render:a.renderStats()};
}
export async function collision(a){
  const checks=[],world=a.testWorld,herd=animals(a);
  for(const s of herd){
    for(const radius of [.34,.62])assert(!canStand(s.x,s.z,world,radius),'Sheep solid at current location: '+s.id);
    assert(world.nearColliders(s.x,s.z,1).some(c=>c.animalId===s.id),'Moving body present in world query: '+s.id);
  }
  checks.push('All sheep have current collision bodies in the live world query');
  const s=sheep(a);
  for(const radius of [.34,.62]){
    let probes=0;
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const p={x:s.x-dx*2.5,z:s.z-dz*2.5};p.y=world.heightAt(p.x,p.z);if(!canStand(p.x,p.z,world,radius))continue;
      moveCharacter(p,dx*5,dz*5,world,radius);assert((p.x-s.x)*dx+(p.z-s.z)*dz<0,'Cannot pass through sheep');probes++;
    }
    checks.push(assert(probes>0,(radius===.34?'Walker':'Horse')+' blocked by live sheep using ordinary swept movement'));
  }
  // Exercise actual held movement as the flock reacts, not just isolated probes.
  for(const mount of ['foot','horse']){
    const s=sheep(a);await a.visit({x:s.x,z:s.z+4});assert(a.selectMount(mount).ok,'Select '+mount);a.war.pause();a.look({yaw:0,pitch:.32,distance:9});
    const start=a.state().position;
    a.hold('KeyW',true);
    for(let i=0;i<80;i++){
      a.step(.04);const [x,y,z]=a.state().position;
      assert(canStand(x,z,world,mount==='foot'?.34:.62,y),'No overlap during '+mount+' movement');
    }
    a.hold('KeyW',false);const end=a.state().position;
    assert(Math.hypot(end[0]-start[0],end[2]-start[2])>.5,'Held '+mount+' movement actually advances');
    checks.push(mount+' movement stays separate while sheep give way');
  }
  await frames();return {checks,render:a.renderStats()};
}
export async function paused(a){
  a.pause();const before=animals(a);for(let i=0;i<100;i++)a.step(.04);
  assert(JSON.stringify(animals(a))===JSON.stringify(before),'Pause freezes flock');a.resume();a.war.pause();
  const s=sheep(a);await a.visit({x:s.x,z:s.z+5});a.selectMount('horse');a.look({yaw:.5,pitch:.28,distance:8});await frames();
  return {checks:[assert(!a.state().frameErrors.length,'Pause/resume without renderer errors'),'Pause freezes flock without teleporting on resume'],livestock:a.testWorld.agricultureState().livestock.map(f=>({animals:f.animals.length,flocks:f.flocks,batches:f.batches,active:f.active})),render:a.renderStats()};
}

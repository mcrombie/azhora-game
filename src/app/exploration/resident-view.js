import * as THREE from 'three';
import {createCharacter} from '../../content/characters/characters.js';
import {MINORA_RESIDENTS} from '../../content/regions/minora-frontier/minora-residents.js';
import {localSight} from './local-sight.js';
import {canStand} from '../../gameplay/movement/locomotion.js';

// Six local visual residents, at most one constructed per update. No simulation
// agents, schedules, pathfinding, merchants, quests, save records or terrain loads.
export function createMinoraResidents(parent,world){
  const root=new THREE.Group();root.name='Minora resident trial';parent.add(root);
  const records=MINORA_RESIDENTS.map(def=>({def,actor:null,distance:Infinity,clock:0,walkClock:0}));
  let speaking=null,speakerPosition=null;
  let enabled=true,scan=.25,animationUpdates=0,constructionMs=0,lastUpdateMs=0;
  const clear=(x,z)=>world.readyAt(x,z)&&canStand(x,z,world,.42,world.heightAt(x,z));
  function stand(def){
    for(const r of [0,1,2,3])for(let i=0;i<(r?12:1);i++){
      const x=def.x+Math.sin(i*Math.PI/6)*r,z=def.z+Math.cos(i*Math.PI/6)*r;
      if(clear(x,z))return {x,z};
    }return null;
  }
  function create(record){
    const p=stand(record.def);if(!p)return;
    const start=performance.now(),d=record.def,actor=createCharacter({role:d.role,look:d.look,tunic:d.tunic,...(d.skin?{skin:d.skin}:{}),hat:false,armed:false});
    actor.setArmed(false);actor.group.name=d.name+' / '+d.occupation;actor.group.rotation.y=d.yaw;
    actor.group.position.set(p.x,world.heightAt(p.x,p.z),p.z);actor.group.traverse(o=>{if(o.isMesh)o.castShadow=false;});root.add(actor.group);
    Object.assign(record,{actor,start:p,end:p});
    if(d.walk){const [dx,dz]=d.walk;let valid=true;
      for(let i=1;i<=12;i++){const x=p.x+dx*i/12,z=p.z+dz*i/12;if(!clear(x,z)||Math.abs(world.heightAt(x,z)-actor.group.position.y)>.25){valid=false;break;}}
      if(valid)record.end={x:p.x+dx,z:p.z+dz};
    }
    constructionMs+=performance.now()-start;
  }
  function update(time,dt,player,active=true){
    const began=performance.now();root.visible=enabled&&active;if(!root.visible){lastUpdateMs=performance.now()-began;return;}
    scan+=dt;
    if(scan>=.25){scan=0;for(const r of records){r.distance=Math.hypot(player.x-r.def.x,player.z-r.def.z);if(r.actor)r.actor.group.visible=r.distance<95;}}
    const pending=records.find(r=>!r.actor&&r.distance<80&&world.readyAt(r.def.x,r.def.z));if(pending)create(pending);
    for(const r of records){
      if(!r.actor||r.distance>=95)continue;
      const p=r.actor.group.position,interval=r.distance<28?1/12:.25;
      r.clock+=Math.min(dt,.1);if(r.clock<interval)continue;const elapsed=r.clock;r.clock=0;
      const near=Math.hypot(player.x-p.x,player.z-p.z)<2;let speed=0;
      if(r.def.id===speaking&&speakerPosition)r.actor.group.rotation.y=Math.atan2(speakerPosition.x-p.x,speakerPosition.z-p.z);
      if(r.def.id!==speaking&&!near&&r.def.walk){
        r.walkClock+=elapsed;const phase=r.walkClock%16,t=phase<4?0:phase<8?(phase-4)/4:phase<12?1:(16-phase)/4;
        const x=r.start.x+(r.end.x-r.start.x)*t,z=r.start.z+(r.end.z-r.start.z)*t,dx=x-p.x,dz=z-p.z;
        speed=Math.hypot(dx,dz)/elapsed;if(speed>.01)r.actor.group.rotation.y=Math.atan2(dx,dz);p.set(x,world.heightAt(x,z),z);
      }
      r.actor.animate(time,speed,true);animationUpdates++;
    }
    lastUpdateMs=performance.now()-began;
  }
  function target(player){
    if(!root.visible||!enabled)return null;
    const nearby=records.filter(r=>r.actor?.group.visible&&Math.abs(r.actor.group.position.y-player.y)<2&&Math.hypot(r.actor.group.position.x-player.x,r.actor.group.position.z-player.z)<3.7)
      .sort((a,b)=>a.actor.group.position.distanceToSquared(player)-b.actor.group.position.distanceToSquared(player));
    const r=nearby.find(r=>localSight(world,{x:player.x,z:player.z,y:player.y+1.5},{x:r.actor.group.position.x,z:r.actor.group.position.z,y:r.actor.group.position.y+1.5}));
    return r?{id:r.def.id,name:r.def.name,occupation:r.def.occupation}:null;
  }
  return {update,target,setTalking(id,player){speaking=id;speakerPosition=player?{x:player.x,z:player.z}:null;},setEnabled(value){enabled=!!value;root.visible=enabled;},
    state:()=>({enabled,speaking,limit:records.length,constructed:records.filter(r=>r.actor).length,visible:records.filter(r=>root.visible&&r.actor?.group.visible).length,animationUpdates,constructionMs,lastUpdateMs,
      people:records.filter(r=>r.actor).map(r=>({id:r.def.id,name:r.def.name,occupation:r.def.occupation,position:r.actor.group.position.toArray(),visible:root.visible&&r.actor.group.visible}))}),
    dispose(){root.removeFromParent();}};
}

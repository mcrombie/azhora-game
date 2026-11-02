import * as THREE from 'three';
import {createCharacter,disposeCharacter} from '../../characters/characters.js';
import {CANERD_RESIDENTS} from './canerd-residents.js';
import {CANERD} from './canerd-world.js';
import {canStand} from '../../../gameplay/movement/locomotion.js';
import {localSight} from '../../../app/exploration/local-sight.js';
import {residentWork} from '../../../app/exploration/resident-work.js';

const RADIUS=.42;
const angle=a=>Math.atan2(Math.sin(a),Math.cos(a));
const ground=(world,x,z)=>world.renderedGroundHeight?.(x,z)??world.heightAt(x,z);
const ready=(world,x,z)=>world.readyAt?.(x,z)??world.loading?.isReady(world.regionAt?.(x,z)?.id??CANERD.region)??true;

function walkingWorld(world){
  const walk=Object.create(world);walk.heightAt=(x,z)=>ground(world,x,z);
  return walk;
}

function clearSegment(world,a,b,radius=RADIUS){
  const count=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.2));let previous=world.heightAt(a.x,a.z);
  for(let i=0;i<=count;i++){
    const t=i/count,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t,y=world.heightAt(x,z);
    if(!ready(world,x,z)||!Number.isFinite(y)||Math.abs(y-previous)>.3||!canStand(x,z,world,radius,y))return false;
    previous=y;
  }
  return true;
}

export function canerdRouteClear(world,route,radius=RADIUS){
  const walk=walkingWorld(world);
  return route.length>1&&route.every((p,i)=>clearSegment(walk,p,route[(i+1)%route.length],radius));
}

// Six local civilians, built one per update, with short authored walking loops.
// Only elapsed active time advances them. Turns, work and conversations all use
// that same clock; a paused world never catches up or teleports a resident.
export function createCanerdPeople(parent,world){
  const root=new THREE.Group();root.name='Canerd / human household';parent.add(root);
  const walk=walkingWorld(world),records=CANERD_RESIDENTS.map((def,index)=>({def,index,actor:null,clock:0,time:index*.9,goal:1,stop:0,wait:def.routine[0].wait,routeClear:false,moved:0}));
  let speaking=null,speaker=null,cursor=0,animationUpdates=0;
  const turn=(r,yaw,dt)=>{r.actor.group.rotation.y+=Math.max(-dt*2.8,Math.min(dt*2.8,angle(yaw-r.actor.group.rotation.y)));};
  function create(r){
    const d=r.def,p=d.routine[0];if(!clearSegment(walk,p,p))return;
    const actor=createCharacter({role:d.role,tunic:d.tunic,skin:d.skin,look:d.look,hat:false,armed:false});
    actor.setArmed(false);actor.group.name=d.name+' / '+d.occupation;
    actor.group.position.set(p.x,walk.heightAt(p.x,p.z),p.z);actor.group.rotation.y=p.yaw;
    actor.group.traverse(o=>{if(o.isMesh)o.castShadow=false;});root.add(actor.group);
    Object.assign(r,{actor,work:residentWork(actor,d.id,d.workGesture),routeClear:canerdRouteClear(world,d.routine),activity:p.activity});
  }
  function people(){return records.filter(r=>r.actor?.group.visible).map(r=>{
    const p=r.actor.group.position;return {id:r.def.id,name:r.def.name,species:'human',faction:'celder',occupation:r.def.occupation,
      place:r.def.routine[r.stop].place,x:p.x,y:p.y,z:p.z};
  });}
  function move(r,dt,player){
    const p=r.actor.group.position,goal=r.def.routine[r.goal],dx=goal.x-p.x,dz=goal.z-p.z,d=Math.hypot(dx,dz);
    if(d<.015){r.stop=r.goal;r.goal=(r.goal+1)%r.def.routine.length;r.wait=goal.wait;r.activity=goal.activity;return 0;}
    const yaw=Math.atan2(dx,dz);turn(r,yaw,dt);
    // Turn before stepping out, so a reversal never snaps the body sideways.
    const alignment=Math.max(0,Math.cos(angle(yaw-r.actor.group.rotation.y))),amount=Math.min(d,dt*r.def.pace*alignment);
    if(amount<.001)return 0;
    const next={x:p.x+dx/d*amount,z:p.z+dz/d*amount};
    if(Math.hypot(player.x-next.x,player.z-next.z)<1.45||records.some(other=>other!==r&&other.actor?.group.visible&&Math.hypot(other.actor.group.position.x-next.x,other.actor.group.position.z-next.z)<RADIUS*2+.1)||!clearSegment(walk,p,next)){
      r.activity='waiting for a clear path';return 0;
    }
    p.set(next.x,walk.heightAt(next.x,next.z),next.z);r.moved+=amount;r.activity='walking';return amount/dt;
  }
  return {
    update(_time,dt,player){
      if(!player)return;const elapsed=Math.max(0,Math.min(.1,Number.isFinite(dt)?dt:0));
      // A blocked start does not starve the rest of the household.
      for(let i=0;i<records.length;i++){
        const index=(cursor+i)%records.length,r=records[index];
        if(!r.actor&&Math.hypot(player.x-r.def.x,player.z-r.def.z)<110&&ready(world,r.def.x,r.def.z)){
          create(r);cursor=(index+1)%records.length;break;
        }
      }
      for(const r of records){
        if(!r.actor)continue;const p=r.actor.group.position,distance=Math.hypot(player.x-p.x,player.z-p.z);
        r.actor.group.visible=distance<145&&ready(world,p.x,p.z);if(!r.actor.group.visible||elapsed===0)continue;
        r.clock+=elapsed;const interval=distance<40?1/15:1/5;if(r.clock<interval)continue;
        const step=r.clock;r.clock=0;r.time+=step;let speed=0;
        if(r.def.id===speaking&&speaker){turn(r,Math.atan2(speaker.x-p.x,speaker.z-p.z),step);r.activity='talking';}
        else if(r.wait>0||!r.routeClear){
          r.wait=Math.max(0,r.wait-step);const stop=r.def.routine[r.stop];r.activity=stop.activity;
          turn(r,stop.yaw+Math.sin(r.time*.4+r.index)*.23,step);
        }else speed=move(r,step,player);
        r.actor.animate(r.time,speed,true);
        const working=!['walking','resting','watching','waiting','talking','waiting for a clear path'].includes(r.activity);
        r.work(r.time,speed,working,step);r.speed=speed;animationUpdates++;
      }
    },
    target(player){
      const sightWorld=Object.create(walk);sightWorld.readyAt=(x,z)=>ready(world,x,z);sightWorld.nearColliders=world.nearColliders?.bind(world)??(()=>world.colliders??[]);
      return people().filter(p=>Math.abs(p.y-player.y)<2&&Math.hypot(p.x-player.x,p.z-player.z)<3.7)
        .sort((a,b)=>Math.hypot(a.x-player.x,a.z-player.z)-Math.hypot(b.x-player.x,b.z-player.z))
        .find(p=>localSight(sightWorld,{x:player.x,y:player.y+1.5,z:player.z},{x:p.x,y:p.y+1.5,z:p.z}))??null;
    },
    people,
    setTalking(id,point){speaking=id;speaker=point?{x:point.x,z:point.z}:null;},
    state:()=>({total:records.length,loaded:records.filter(r=>r.actor).length,speaking,animationUpdates,people:records.filter(r=>r.actor).map(r=>({
      id:r.def.id,name:r.def.name,species:'human',faction:'celder',occupation:r.def.occupation,place:r.def.routine[r.stop].place,
      x:r.actor.group.position.x,y:r.actor.group.position.y,z:r.actor.group.position.z,position:r.actor.group.position.toArray(),
      yaw:r.actor.group.rotation.y,visible:r.actor.group.visible,activity:r.activity,speed:r.speed??0,routeClear:r.routeClear,
      routineIndex:r.stop,nextStop:r.goal,wait:r.wait,distanceWalked:r.moved,animationTime:r.time,
    }))}),
    dispose(){for(const r of records)if(r.actor)disposeCharacter(r.actor);root.removeFromParent();},
  };
}

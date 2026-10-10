import * as THREE from 'three';
import {createCharacter,disposeCharacter} from '../../content/characters/characters.js';
import {LIZEEM_RESIDENTS} from '../../content/regions/minora-frontier/lizeem-residents.js';
import {residentThreat} from './resident-dialogue.js';
import {residentWork} from './resident-work.js';
import {localSight} from './local-sight.js';
import {canStand} from '../../gameplay/movement/locomotion.js';

export const RESIDENT_BUDGET=12;
// Local presentation, never campaign agents: one rig built per update, a bounded
// disposable cache, short validated routes, 12Hz near / 4Hz distant animation.
// Shelters are existing houses; no extra interiors or region loads are needed.
export function createMinoraResidents(parent,world){
  const root=new THREE.Group();root.name='Lizeem local residents';parent.add(root);
  const records=LIZEEM_RESIDENTS.map((def,index)=>({def,index,actor:null,distance:Infinity,clock:0,walkClock:index*1.7,phase:'working',returnWait:0}));
  let speaking=null,speakerPosition=null,campaign=null;
  let enabled=true,scan=.25,animationUpdates=0,constructionMs=0,lastUpdateMs=0,evictions=0;
  const clear=(x,z)=>world.readyAt(x,z)&&canStand(x,z,world,.42,world.heightAt(x,z));
  function stand(def){
    for(const r of [0,1,2,3])for(let i=0;i<(r?12:1);i++){
      const x=def.x+Math.sin(i*Math.PI/6)*r,z=def.z+Math.cos(i*Math.PI/6)*r;
      if(clear(x,z))return {x,z};
    }return null;
  }
  function validSegment(a,b){
    const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)*2));let y=world.heightAt(a.x,a.z);
    for(let i=1;i<=n;i++){const x=a.x+(b.x-a.x)*i/n,z=a.z+(b.z-a.z)*i/n,h=world.heightAt(x,z);if(!clear(x,z)||Math.abs(h-y)>.4)return false;y=h;}
    return true;
  }
  function release(r){disposeCharacter(r.actor);r.actor=null;evictions++;}
  function create(r){
    const p=stand(r.def);if(!p)return;
    const start=performance.now(),d=r.def,actor=createCharacter({role:d.role,look:d.look,tunic:d.tunic,...(d.skin?{skin:d.skin}:{}),hat:false,armed:false});
    actor.setArmed(false);actor.group.name=d.name+' / '+d.occupation;actor.group.rotation.y=d.yaw;
    actor.group.position.set(p.x,world.heightAt(p.x,p.z),p.z);actor.group.traverse(o=>{if(o.isMesh)o.castShadow=false;});root.add(actor.group);
    Object.assign(r,{actor,work:residentWork(actor,d.id),start:p,end:p,phase:'working',clock:0,route:[],routeIndex:0,returnWait:0});
    if(d.walk){const end={x:p.x+d.walk[0],z:p.z+d.walk[1]};if(validSegment(p,end))r.end=end;}
    r.shelter=d.shelter?.map(([x,z])=>({x,z}));
    r.shelterValid=!!r.shelter&&r.shelter.every((b,i)=>validSegment(i?r.shelter[i-1]:p,b));
    if(residentThreat(d,campaign)){
      r.phase=r.shelterValid?'sheltered':'watchful';
      if(r.shelterValid){const door=r.shelter.at(-1);actor.group.position.set(door.x,world.heightAt(door.x,door.z),door.z);actor.group.visible=false;}
    }
    constructionMs+=performance.now()-start;
  }
  function beginShelter(r){r.phase='seeking-shelter';r.route=[r.start,...r.shelter];r.routeIndex=0;}
  function move(r,goal,elapsed,player){
    const p=r.actor.group.position,dx=goal.x-p.x,dz=goal.z-p.z,d=Math.hypot(dx,dz),step=Math.min(d,elapsed*1.6);
    if(d<.025)return {arrived:true,speed:0};
    const x=p.x+dx/d*step,z=p.z+dz/d*step;
    // Let the player pass; never push a rider or walk through another resident.
    // The routine clock pauses too, so clearing the path cannot snap it ahead.
    if(Math.hypot(player.x-x,player.z-z)<2.1||records.some(other=>other!==r&&other.actor?.group.visible&&other.actor.group.position.distanceTo(p)<.9))return {arrived:false,speed:0};
    if(!clear(x,z))return {arrived:false,speed:0};
    r.actor.group.rotation.y=Math.atan2(dx,dz);p.set(x,world.heightAt(x,z),z);return {arrived:step===d,speed:step/elapsed};
  }
  function update(time,dt,player,active=true){
    const began=performance.now();root.visible=enabled&&active;if(!root.visible){lastUpdateMs=performance.now()-began;return;}
    scan+=dt;
    if(scan>=.25){scan=0;for(const r of records){r.distance=Math.hypot(player.x-r.def.x,player.z-r.def.z);if(r.actor&&r.distance>115&&r.def.id!==speaking)release(r);}}
    const pending=records.filter(r=>!r.actor&&r.distance<80&&world.readyAt(r.def.x,r.def.z)).sort((a,b)=>a.distance-b.distance)[0];
    if(pending){
      const live=records.filter(r=>r.actor);
      if(live.length>=RESIDENT_BUDGET){const far=live.filter(r=>r.def.id!==speaking).sort((a,b)=>b.distance-a.distance)[0];if(far&&far.distance>pending.distance+20)release(far);}
      if(records.filter(r=>r.actor).length<RESIDENT_BUDGET)create(pending);
    }
    for(const r of records){
      if(!r.actor)continue;
      r.actor.group.visible=r.distance<95&&r.phase!=='sheltered';
      if(r.distance>=95)continue;
      r.clock+=Math.min(dt,.1);const interval=r.distance<28?1/12:.25;
      if(r.clock<interval)continue;const elapsed=r.clock;r.clock=0;
      const p=r.actor.group.position,threat=residentThreat(r.def,campaign);let speed=0;
      const turnTo=yaw=>{const angle=yaw-r.actor.group.rotation.y;r.actor.group.rotation.y+=Math.atan2(Math.sin(angle),Math.cos(angle))*Math.min(1,elapsed*6);};
      if(r.def.id===speaking&&speakerPosition){turnTo(Math.atan2(speakerPosition.x-p.x,speakerPosition.z-p.z));}
      else{
        if(threat){
          r.returnWait=0;
          if(['working','returning','watchful'].includes(r.phase)&&r.shelterValid)beginShelter(r);
          else if(r.phase==='working')r.phase='watchful';
        }else if(r.phase==='sheltered'){
          r.returnWait+=elapsed;
          if(r.returnWait>4+r.index%5*1.5){r.phase='returning';r.route=[...r.shelter].reverse().concat(r.start);r.routeIndex=0;}
        }else if(r.phase==='watchful')r.phase='working';
        if(r.phase==='seeking-shelter'||r.phase==='returning'){
          const m=move(r,r.route[r.routeIndex],elapsed,player);speed=m.speed;
          if(m.arrived&&++r.routeIndex===r.route.length){r.phase=r.phase==='seeking-shelter'?'sheltered':'working';r.walkClock=0;}
        }else if(r.phase==='working'&&r.def.walk&&Math.hypot(player.x-p.x,player.z-p.z)>=2.1){
          const next=r.walkClock+elapsed,phase=next%16,t=phase<4?0:phase<8?(phase-4)/4:phase<12?1:(16-phase)/4;
          const goal={x:r.start.x+(r.end.x-r.start.x)*t,z:r.start.z+(r.end.z-r.start.z)*t},m=move(r,goal,elapsed,player);speed=m.speed;
          if(m.arrived)r.walkClock=next;
        }
      }
      if(r.def.id!==speaking&&r.phase==='working'&&!r.def.walk)turnTo(r.def.yaw);
      r.actor.group.visible=r.phase!=='sheltered';
      if(r.actor.group.visible){r.actor.animate(time+r.index*2.1,speed,true);r.work(time+r.index,speed,r.phase==='working'&&r.def.id!==speaking,elapsed);animationUpdates++;}
    }
    lastUpdateMs=performance.now()-began;
  }
  function people(){return !root.visible?[]:records.filter(r=>r.actor?.group.visible).map(r=>({id:r.def.id,x:r.actor.group.position.x,y:r.actor.group.position.y,z:r.actor.group.position.z}));}
  function target(player){
    if(!root.visible||!enabled)return null;
    const nearby=records.filter(r=>r.actor?.group.visible&&Math.abs(r.actor.group.position.y-player.y)<2&&Math.hypot(r.actor.group.position.x-player.x,r.actor.group.position.z-player.z)<3.7)
      .sort((a,b)=>a.actor.group.position.distanceToSquared(player)-b.actor.group.position.distanceToSquared(player));
    const r=nearby.find(r=>localSight(world,{x:player.x,z:player.z,y:player.y+1.5},{x:r.actor.group.position.x,z:r.actor.group.position.z,y:r.actor.group.position.y+1.5}));
    return r?{id:r.def.id,name:r.def.name,occupation:r.def.occupation,place:r.def.place}:null;
  }
  return {update,target,people,setCampaign(value){campaign=value;},setTalking(id,player){speaking=id;speakerPosition=player?{x:player.x,z:player.z}:null;},setEnabled(value){enabled=!!value;root.visible=enabled;},
    state:()=>({enabled,speaking,total:records.length,limit:RESIDENT_BUDGET,constructed:records.filter(r=>r.actor).length,visible:people().length,evictions,animationUpdates,constructionMs,lastUpdateMs,
      people:records.filter(r=>r.actor).map(r=>({id:r.def.id,name:r.def.name,occupation:r.def.occupation,phase:r.phase,shelterValid:r.shelterValid,walking:!!r.start&&(r.start.x!==r.end.x||r.start.z!==r.end.z),position:r.actor.group.position.toArray(),yaw:r.actor.group.rotation.y,visible:root.visible&&r.actor.group.visible}))}),
    dispose(){for(const r of records)if(r.actor)release(r);root.removeFromParent();}};
}

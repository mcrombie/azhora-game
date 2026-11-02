import * as THREE from 'three';
import {CENTAUR_CAMP_CAST} from './centaur-culture.js';
import {CAMP_WORKPLACES} from './centaur-camp-layout.js';
import {createCentaurCampResident} from './centaur-camp-characters.js';
import {canStand} from '../../../gameplay/movement/locomotion.js';
import {localSight} from '../../../app/exploration/local-sight.js';

export const CENTAUR_CAMP_RESIDENTS=Object.freeze(CENTAUR_CAMP_CAST.map(def=>Object.freeze({
  ...def,...CAMP_WORKPLACES[def.key],species:'centaur',place:'The Reed Kin / Bane\'s Camp',
})));

/** Presentation of six people carrying out ordinary local tasks. No population,
 * food production or campaign orders are inferred from these little routines. */
export function createCentaurCampPeople(parent,world,{createResident=createCentaurCampResident}={}){
  const root=new THREE.Group();root.name='The Reed Kin / working households';parent.add(root);
  const records=CENTAUR_CAMP_RESIDENTS.map((def,index)=>({def,index,actor:null,wait:4+index,goal:1,clock:0,working:true}));
  let active=true,disposed=false,speaking=null,speaker=null,time=0,creationCursor=0;
  const ready=(x,z)=>world.readyAt?.(x,z)??world.loading?.isReady(38)??false;
  const clear=(x,z)=>ready(x,z)&&canStand(x,z,world,1.1,world.heightAt(x,z));
  function segment(a,b){
    const count=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)*3));let y=world.heightAt(a.x,a.z);
    for(let i=1;i<=count;i++){
      const x=a.x+(b.x-a.x)*i/count,z=a.z+(b.z-a.z)*i/count,h=world.heightAt(x,z);
      if(!clear(x,z)||Math.abs(y-h)>.35)return false;y=h;
    }return true;
  }
  function create(record){
    const def=record.def;let site=null;
    for(const radius of [0,1.5,3]){for(let i=0;i<(radius?12:1);i++){
      const p={x:def.x+Math.sin(i*Math.PI/6)*radius,z:def.z+Math.cos(i*Math.PI/6)*radius};
      if(clear(p.x,p.z)&&!records.some(r=>r.actor&&Math.hypot(r.actor.group.position.x-p.x,r.actor.group.position.z-p.z)<2.3)){site=p;break;}
    }if(site)break;}
    if(!site)return;
    const actor=createResident(def);actor.group.position.set(site.x,world.heightAt(site.x,site.z),site.z);actor.group.rotation.y=def.yaw;
    actor.group.traverse(o=>{if(o.isMesh)o.castShadow=false;});root.add(actor.group);
    const end={x:site.x+def.walk[0],z:site.z+def.walk[1]};
    Object.assign(record,{actor,route:[site,segment(site,end)?end:site]});
  }
  function people(){return !active||disposed?[]:records.filter(r=>r.actor?.group.visible).map(r=>({
    id:r.def.id,name:r.def.name,species:'centaur',occupation:r.def.occupation,place:r.def.place,
    activity:r.working?r.def.action:'Moving between tasks',
    x:r.actor.group.position.x,y:r.actor.group.position.y,z:r.actor.group.position.z,
  }));}
  return {
    update(_displayTime,dt,player){
      if(disposed||!active||!player)return;
      const elapsed=Number.isFinite(dt)?Math.max(0,Math.min(.1,dt)):0;time+=elapsed;
      // Fair round-robin attempts: one obstructed workplace cannot starve the rest.
      for(let i=0;i<records.length;i++){
        const index=(creationCursor+i)%records.length,r=records[index];
        if(!r.actor&&Math.hypot(player.x-r.def.x,player.z-r.def.z)<115&&ready(r.def.x,r.def.z)){
          create(r);creationCursor=(index+1)%records.length;break;
        }
      }
      for(const r of records){
        if(!r.actor)continue;const p=r.actor.group.position,near=Math.hypot(player.x-p.x,player.z-p.z);
        r.actor.group.visible=near<150&&ready(p.x,p.z);if(!r.actor.group.visible)continue;
        r.clock+=elapsed;const interval=near<35?1/15:1/5;if(r.clock<interval)continue;
        const step=r.clock;r.clock=0;let speed=0;const talking=r.def.id===speaking&&speaker;
        if(talking){r.actor.group.rotation.y=Math.atan2(speaker.x-p.x,speaker.z-p.z);r.working=false;}
        else if(r.wait>0){r.wait=Math.max(0,r.wait-step);r.working=true;r.actor.group.rotation.y=r.def.yaw;}
        else{
          const goal=r.route[r.goal],dx=goal.x-p.x,dz=goal.z-p.z,d=Math.hypot(dx,dz);r.working=false;
          if(d<.03){r.goal=1-r.goal;r.wait=7+r.index%4;r.working=true;}
          else{
            const amount=Math.min(d,step*.72),next={x:p.x+dx/d*amount,z:p.z+dz/d*amount};
            if(Math.hypot(player.x-next.x,player.z-next.z)>2.5&&segment(p,next)
              &&!records.some(o=>o!==r&&o.actor?.group.visible&&Math.hypot(o.actor.group.position.x-next.x,o.actor.group.position.z-next.z)<2.3)){
              p.set(next.x,world.heightAt(next.x,next.z),next.z);r.actor.group.rotation.y=Math.atan2(dx,dz);speed=amount/step;
            }
          }
        }
        r.actor.animate(time+r.index*.8,speed,{working:r.working,talking:!!talking});
      }
    },
    target(player){
      if(!active||disposed)return null;
      const sight={...world,readyAt:ready,nearColliders:world.nearColliders??(()=>world.colliders??[])};
      const options=people().filter(p=>Math.abs(p.y-player.y)<2&&Math.hypot(p.x-player.x,p.z-player.z)<4.2)
        .sort((a,b)=>Math.hypot(a.x-player.x,a.z-player.z)-Math.hypot(b.x-player.x,b.z-player.z));
      return options.find(p=>localSight(sight,{x:player.x,y:player.y+1.5,z:player.z},{x:p.x,y:p.y+2.1,z:p.z}))??null;
    },
    people,
    setTalking(id,player){speaking=records.some(r=>r.def.id===id)?id:null;speaker=speaking&&player?{x:player.x,z:player.z}:null;},
    setActive(value){active=!!value;root.visible=active;if(!active){speaking=null;speaker=null;}},
    state:()=>({total:records.length,loaded:records.filter(r=>r.actor).length,active,people:people(),speaking}),
    dispose(){if(disposed)return;disposed=true;for(const r of records)r.actor?.dispose();root.removeFromParent();},
  };
}

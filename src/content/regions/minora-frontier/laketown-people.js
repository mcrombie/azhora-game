import * as THREE from 'three';
import {createLaketownResident} from './laketown-characters.js';
import {LAKETOWN_RESIDENTS} from './laketown-residents.js';
import {canStand} from '../../../gameplay/movement/locomotion.js';
import {localSight} from '../../../app/exploration/local-sight.js';

// Bounded local presentation. Short walks follow clear ground and stop for
// conversation or a passing player; no teleports, simulated population or jobs.
export function createLaketownPeople(parent,world){
  const root=new THREE.Group();root.name='Laketown / neighbours';parent.add(root);
  const records=LAKETOWN_RESIDENTS.map((def,index)=>({def,index,actor:null,wait:3+index,goal:1,clock:0}));
  let speaking=null,speaker=null,time=0,creationCursor=0;
  const ready=(x,z)=>world.readyAt?.(x,z)??world.loading.isReady(38);
  const clear=(x,z,radius=.42)=>ready(x,z)&&canStand(x,z,world,radius,world.heightAt(x,z));
  function segment(a,b,radius){
    const count=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)*3));let y=world.heightAt(a.x,a.z);
    for(let i=1;i<=count;i++){
      const x=a.x+(b.x-a.x)*i/count,z=a.z+(b.z-a.z)*i/count,h=world.heightAt(x,z);
      if(!clear(x,z,radius)||Math.abs(y-h)>.35)return false;y=h;
    }return true;
  }
  function create(record){
    const {def,index}=record,radius=def.species==='centaur'?.9:.42;
    let site=null;
    for(const r of [0,1.5,3]){for(let i=0;i<(r?12:1);i++){
      const p={x:def.x+Math.sin(i*Math.PI/6)*r,z:def.z+Math.cos(i*Math.PI/6)*r};
      if(clear(p.x,p.z,radius)){site=p;break;}
    }if(site)break;}
    if(!site)return;
    const actor=createLaketownResident({species:def.species,variant:index,gender:['mara','brunna','nessa'].some(id=>def.id.endsWith(id))?'female':'male',occupation:def.occupation});
    actor.group.name=def.name+' / '+def.occupation;actor.group.position.set(site.x,world.heightAt(site.x,site.z),site.z);actor.group.rotation.y=def.yaw;
    actor.group.traverse(o=>{if(o.isMesh)o.castShadow=false;});root.add(actor.group);
    const end={x:site.x+def.walk[0],z:site.z+def.walk[1]};
    Object.assign(record,{actor,radius,route:[site,segment(site,end,radius)?end:site]});
  }
  function people(){return records.filter(r=>r.actor?.group.visible).map(r=>({id:r.def.id,name:r.def.name,species:r.def.species,occupation:r.def.occupation,place:'Laketown',x:r.actor.group.position.x,y:r.actor.group.position.y,z:r.actor.group.position.z}));}
  return {
    update(_time,dt,player){
      const elapsed=Math.max(0,Math.min(.1,dt));time+=elapsed;
      // One rig per frame avoids a model-building hitch on arrival.
      for(let i=0;i<records.length;i++){
        const index=(creationCursor+i)%records.length,r=records[index];
        if(!r.actor&&Math.hypot(player.x-r.def.x,player.z-r.def.z)<110&&ready(r.def.x,r.def.z)){
          create(r);creationCursor=(index+1)%records.length;break;
        }
      }
      for(const r of records){
        if(!r.actor)continue;const p=r.actor.group.position,near=Math.hypot(player.x-p.x,player.z-p.z);
        r.actor.group.visible=near<145&&ready(p.x,p.z);if(!r.actor.group.visible)continue;
        r.clock+=elapsed;const interval=near<35?1/15:1/5;if(r.clock<interval)continue;
        const step=r.clock;r.clock=0;let pace=0;
        if(r.def.id===speaking&&speaker){r.actor.group.rotation.y=Math.atan2(speaker.x-p.x,speaker.z-p.z);}
        else if(r.wait>0)r.wait=Math.max(0,r.wait-step);
        else {
          const goal=r.route[r.goal],dx=goal.x-p.x,dz=goal.z-p.z,d=Math.hypot(dx,dz);
          if(d<.03){r.goal=1-r.goal;r.wait=5+r.index%4;}
          else {
            const amount=Math.min(d,step*.7),next={x:p.x+dx/d*amount,z:p.z+dz/d*amount};
            if(Math.hypot(player.x-next.x,player.z-next.z)>2&&segment(p,next,r.radius)&&!records.some(o=>o!==r&&o.actor?.group.visible&&Math.hypot(o.actor.group.position.x-next.x,o.actor.group.position.z-next.z)<r.radius+(o.radius??.42))){
              p.set(next.x,world.heightAt(next.x,next.z),next.z);r.actor.group.rotation.y=Math.atan2(dx,dz);pace=.7/2.1;
            }
          }
        }
        r.actor.animate(time+r.index*.8,pace);
      }
    },
    target(player){
      const options=people().filter(p=>Math.abs(p.y-player.y)<2&&Math.hypot(p.x-player.x,p.z-player.z)<3.7).sort((a,b)=>Math.hypot(a.x-player.x,a.z-player.z)-Math.hypot(b.x-player.x,b.z-player.z));
      return options.find(p=>localSight({...world,readyAt:ready,nearColliders:world.nearColliders??(()=>world.colliders??[])},{x:player.x,y:player.y+1.5,z:player.z},{x:p.x,y:p.y+1.5,z:p.z}))??null;
    },
    people,
    setTalking(id,player){speaking=id;speaker=player?{x:player.x,z:player.z}:null;},
    state:()=>({total:records.length,loaded:records.filter(r=>r.actor).length,people:people(),speaking}),
    dispose(){for(const r of records)r.actor?.dispose();root.removeFromParent();},
  };
}

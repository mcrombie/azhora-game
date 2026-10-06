import {createCharacter,setShadowCasting,groundShadow} from './characters.js';
import {stepToward} from './bodies.js';
import {canStand} from './game-state.js';
import {chapterOneEncounter,CHAPTER_ONE_ARENA} from './chapter-one.js';
import {OUTPOST_LAYOUT,gateRoadPoint} from './outpost.js';

/** The army walks on its own clock. No following-player leash or catch-up warp. */
export function createChapterOneColumn(scene,world){
  let units=[],marching=false,arrived=false,time=0;
  function clear(){for(const u of units){scene.remove(u.actor.group);u.actor.group.traverse(o=>{o.geometry?.dispose();});}units=[];marching=arrived=false;}
  function stage(player,side='empire',start=null){
    clear();const spec=chapterOneEncounter(player,side);
    const at=start??OUTPOST_LAYOUT.parade;
    units=spec.allies.map((person,i)=>{
      const actor=createCharacter({...person.model,armed:person.armed!==false});setShadowCasting(actor,false);actor.group.add(groundShadow());scene.add(actor.group);
      let p={x:at.x+(i%4-1.5)*2,z:at.z+Math.floor(i/4)*2};
      for(let r=0;!canStand(p.x,p.z,world,.4)&&r<40;r++)p={x:at.x+Math.cos(r*2.4)*(2+r*.3),z:at.z+Math.sin(r*2.4)*(2+r*.3)};
      actor.group.position.set(p.x,world.heightAt(p.x,p.z),p.z);
      const lane=i%2? .7:-.7,finish={x:CHAPTER_ONE_ARENA.checkpoint.x+lane,z:CHAPTER_ONE_ARENA.checkpoint.z+Math.floor(i/2)*1.5};
      const route=side==='empire'?[gateRoadPoint(8,lane),gateRoadPoint(20,lane),gateRoadPoint(34,lane),gateRoadPoint(55,lane),finish]:[finish];
      return {id:person.id,actor,route,index:0,delay:i*.28};
    });return units.map(u=>u.id);
  }
  function frame(dt,{playing=true,visible=true}={}){
    if(playing)time+=dt;
    let finished=0;
    for(const [index,u] of units.entries()){
      u.actor.group.visible=visible;if(!visible)continue;
      const p=u.actor.group.position,bx=p.x,bz=p.z;
      if(playing&&marching){u.delay-=dt;const target=u.route[u.index];
        if(target&&u.delay<=0){const ahead=units[index-2],gap=ahead?Math.hypot(p.x-ahead.actor.group.position.x,p.z-ahead.actor.group.position.z):Infinity;
          if(gap>1.4||ahead.index>=ahead.route.length)stepToward(p,target,Math.min(4.6*dt,Math.max(0,gap-1.25)),world,.34);p.y=world.heightAt(p.x,p.z);
          if(Math.hypot(p.x-target.x,p.z-target.z)<2)u.index++;}
      }
      if(u.index>=u.route.length)finished++;
      const speed=dt>0?Math.hypot(p.x-bx,p.z-bz)/dt:0;
      if(speed>.01)u.actor.group.rotation.y=Math.atan2(p.x-bx,p.z-bz);
      u.actor.animate(time,speed,true,{alert:marching});
    }
    arrived=units.length>0&&finished===units.length;
    return arrived;
  }
  return {stage,frame,clear,start(){marching=true;},get arrived(){return arrived;},get active(){return units.length>0;},positions:()=>units.map(u=>({id:u.id,x:u.actor.group.position.x,z:u.actor.group.position.z,leg:u.index}))};
}

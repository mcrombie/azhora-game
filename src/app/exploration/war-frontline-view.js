import * as THREE from 'three';
import {createCharacter,disposeCharacter} from '../../content/characters/characters.js';
import {LIZEEM_FIELD_SITES} from '../../content/scenarios/lizeem-field-sites.js';
import {createSkirmishGround} from './skirmish-ground.js';

// A small deployment of representatives. No cosmetic kills or second combat
// simulation: all casualties still come from the campaign or the playable fight.
export function createWarFrontline(scene,world){
  let stamp=null,troops=[],captains=[],ground=null,time=0,visible=false;
  const actors=new Map(); // Reuse the twelve representatives across retries.
  function clear(){for(const t of troops)scene.remove(t.actor.group);troops=[];captains=[];}
  function build(battle,scenario){
    ground=createSkirmishGround(world,battle.location,LIZEEM_FIELD_SITES[battle.region].regionId,battle.entryRadius??45);const used=[];
    function add(side,index,captain){
      const north=side===battle.attacker,at=battle.location;
      const desired=captain?{x:at.x-3,z:at.z+(north?-18:3)}:{x:at.x-12+index*2.6,z:at.z+(north?-14:-5)};
      let slot=null;
      for(const radius of [0,1,2,3,5])for(let j=0;j<12&&!slot;j++){
        const p={x:desired.x+Math.sin(j*Math.PI/6)*radius,z:desired.z+Math.cos(j*Math.PI/6)*radius};
        if(ground.clear(p.x,p.z,.65)&&used.every(q=>Math.hypot(p.x-q.x,p.z-q.z)>1.8))slot=p;
      }
      if(!slot)return;used.push(slot);
      const faction=scenario.factions.find(f=>f.id===side),key=`${side}:${captain}:${index}`;
      if(!actors.has(key))actors.set(key,createCharacter({role:captain?'legion-officer':'legion-soldier',tunic:new THREE.Color(faction.color).getHex(),armed:true}));
      const actor=actors.get(key);actor.group.visible=true;
      let start={x:slot.x,z:slot.z+(north?-3:3)};if(!ground.canHit(start,slot))start={...slot};
      actor.group.position.set(start.x,world.heightAt(start.x,start.z),start.z);actor.group.rotation.y=north?0:Math.PI;scene.add(actor.group);
      const t={actor,slot,start,side,captain,index,battle:battle.id,name:faction.short,age:0};troops.push(t);if(captain)captains.push(t);
    }
    // Captains get the clearest ground first and remain within the encounter radius.
    for(const side of [battle.defender,battle.attacker])add(side,0,true);
    for(const side of [battle.attacker,battle.defender])for(let i=0;i<5;i++)add(side,i,false);
  }
  function update(state,scenario,known,position,enabled,dt,running){
    const battle=state.engagements.filter(b=>LIZEEM_FIELD_SITES[b.region]&&b.status==='active').sort((a,b)=>Math.hypot(position.x-a.location.x,position.z-a.location.z)-Math.hypot(position.x-b.location.x,position.z-b.location.z))[0];
    if(stamp!==battle?.id){clear();stamp=battle?.id;}
    visible=!!(enabled&&battle&&known(battle.location)&&world.readyAt(battle.location.x,battle.location.z)&&Math.hypot(position.x-battle.location.x,position.z-battle.location.z)<160);
    if(visible&&!troops.length)build(battle,scenario);
    if(enabled&&running)time+=dt;
    for(const t of troops){
      t.actor.group.visible=visible;if(!visible)continue;
      const p=t.actor.group.position;t.age+=running?dt:0;
      // Deploy, then short clear steps and shield adjustments instead of a frozen row.
      const sway=t.captain?0:Math.sin(time*.65+t.index*1.8)*.45;
      const target={x:t.slot.x+sway,z:t.slot.z};
      const dx=target.x-p.x,dz=target.z-p.z,d=Math.hypot(dx,dz),step=Math.min(d,running?dt*1.2:0);
      const moved=d>.01?ground.move(p,dx/d*step,dz/d*step):p;
      const speed=Math.hypot(moved.x-p.x,moved.z-p.z)/Math.max(dt,.001);
      p.set(moved.x,world.heightAt(moved.x,moved.z),moved.z);
      if(t.captain&&Math.hypot(position.x-p.x,position.z-p.z)<7)t.actor.group.rotation.y=Math.atan2(position.x-p.x,position.z-p.z);
      else t.actor.group.rotation.y=t.side===battle.attacker?0:Math.PI;
      t.actor.animate(time+t.index*.7,speed,true,{action:'guard',progress:(Math.sin(time+t.index)+1)/2});
    }
  }
  return {update,
    nearby:position=>visible?captains.filter(t=>Math.hypot(position.x-t.actor.group.position.x,position.z-t.actor.group.position.z)<5).sort((a,b)=>a.actor.group.position.distanceTo(position)-b.actor.group.position.distanceTo(position))[0]??null:null,
    state:()=>({visible,troops:troops.filter(t=>t.actor.group.visible).map(t=>({side:t.side,captain:t.captain,position:t.actor.group.position.toArray()}))}),dispose(){clear();for(const actor of actors.values())disposeCharacter(actor);actors.clear();}};
}

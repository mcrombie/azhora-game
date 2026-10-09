import * as THREE from 'three';
import {createCharacter,disposeCharacter} from '../../content/characters/characters.js';
import {canStand} from '../../gameplay/movement/locomotion.js';
import {defendingStrength} from '../../simulation/forces.js';
import {LIZEEM_FIELD_SITES} from '../../content/scenarios/lizeem-field-sites.js';

// A few representatives of surviving forces; no new campaign soldiers are raised.
export function createBattleAftermath(scene,world){
  let stamp=null,actors=[],visible=false,time=0,identity=null;
  function clear(){for(const actor of actors)disposeCharacter(actor);actors=[];}
  function update(state,scenario,known,position,enabled,dt){
    const battle=state.engagements.filter(b=>LIZEEM_FIELD_SITES[b.region]&&b.status==='resolved'&&b===state.engagements.findLast(other=>other.region===b.region))
      .sort((a,b)=>Math.hypot(position.x-a.location.x,position.z-a.location.z)-Math.hypot(position.x-b.location.x,position.z-b.location.z))[0];
    const strength=battle?defendingStrength(state,battle.region):0;
    visible=!!(enabled&&battle?.rally&&battle.status==='resolved'&&strength&&known(battle.location)&&world.readyAt(battle.location.x,battle.location.z)&&Math.hypot(position.x-battle.location.x,position.z-battle.location.z)<150);
    const owner=battle?state.regions[battle.region].owner:null,key=battle?.id+'/'+owner+'/'+Math.min(3,strength);
    identity=battle?{owner,region:battle.region,battleId:battle.id,kind:'survivor'}:null;
    if(key!==stamp){clear();stamp=key;}
    if(visible&&!actors.length){
      const at=battle.location,color=scenario.factions.find(f=>f.id===owner).color;
      for(const [dx,dz] of [[-5,-5],[-3,-7],[-1,-5]]){
        if(actors.length>=Math.min(3,strength))break;
        const x=at.x+dx,z=at.z+dz,y=world.heightAt(x,z);
        if(!canStand(x,z,world,.45,y))continue;
        const actor=createCharacter({role:'legion-soldier',tunic:new THREE.Color(color).getHex(),armed:true});
        actor.group.position.set(x,y,z);actor.group.rotation.y=-Math.PI/2;scene.add(actor.group);actors.push(actor);
      }
    }
    if(visible)time+=dt;
    for(const actor of actors){actor.group.visible=visible;if(visible)actor.animate(time,0,true,{action:'idle',progress:0});}
  }
  return {update,people:()=>visible?actors.filter(a=>a.group.visible).map(a=>({...identity,x:a.group.position.x,y:a.group.position.y,z:a.group.position.z})):[],state:()=>({visible,survivors:actors.filter(a=>a.group.visible).map(a=>a.group.position.toArray())}),dispose:clear};
}

import * as THREE from 'three';
import {createCharacter} from '../../content/characters/characters.js';
import {CARICAS_GUARD_POSTS} from '../../content/regions/minora-frontier/caricas-settlement.js';
import {LIZEEM_BATTLEFIELDS} from '../../content/scenarios/lizeem-battlefields.js';
import {canStand} from '../../gameplay/movement/locomotion.js';

export function createSitePresence(scene,world){
  const at=LIZEEM_BATTLEFIELDS.caricas;
  let guards=[],owner=null,painted=null,color=null,visible=false,time=0;
  function clear(){for(const guard of guards)scene.remove(guard.group);guards=[];}
  function update(presence,known,position,dt=0,enabled=true){
    const standards=world.caricasStandards;
    if(standards&&(painted!==standards||color!==presence.color)){
      standards.setColor(presence.color);painted=standards;color=presence.color;
    }
    visible=enabled&&known(at)&&world.readyAt(at.x,at.z)&&Math.hypot(position.x-at.x,position.z-at.z)<180;
    if(owner!==presence.owner||!presence.guards){clear();owner=presence.owner;}
    if(visible&&guards.length!==presence.guards){
      clear();
      for(const post of CARICAS_GUARD_POSTS){
        if(guards.length>=presence.guards)break;
        if(!world.readyAt(post.x,post.z)||!canStand(post.x,post.z,world,.5,world.heightAt(post.x,post.z)))continue;
        const guard=createCharacter({role:'legion-soldier',tunic:new THREE.Color(presence.color).getHex(),armed:true});
        guard.group.position.set(post.x,world.heightAt(post.x,post.z),post.z);guard.group.rotation.y=Math.PI;
        scene.add(guard.group);guards.push(guard);
      }
    }
    time+=dt;
    for(const guard of guards){guard.group.visible=visible;guard.animate(time,0,true,{action:'idle',progress:0});}
    return visible&&Math.hypot(position.x-at.x,position.z-at.z)<36&&Math.abs(position.y-world.heightAt(position.x,position.z))<12;
  }
  return {update,state:()=>({owner,color,banner:painted?.state()??null,visible,
    guards:guards.filter(g=>g.group.visible).map(g=>({position:g.group.position.toArray(),ground:world.heightAt(g.group.position.x,g.group.position.z),clear:canStand(g.group.position.x,g.group.position.z,world,.5,g.group.position.y)}))}),
    dispose(){clear();painted?.setColor();painted=null;}};
}

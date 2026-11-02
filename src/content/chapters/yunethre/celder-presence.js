import * as THREE from 'three';
import {createCelderKnight} from '../../../world/actors/celder-knight.js';
import {CANERD} from '../../regions/canerd/canerd-world.js';

// Beside the open passage, inside the gate leaves. The road and envoy's
// interaction space remain clear; these sentries have no simulation authority.
export const CELDER_SENTRIES=Object.freeze([-1,1].map((side,i)=>Object.freeze({
  id:'canerd-gate-sentry-'+i,x:CANERD.gate.x+side*4.2,z:CANERD.gate.z-3.4,heading:0,
})));

export function createCelderPresence({parent,world}){
  const root=new THREE.Group();root.name='Celder gate household';parent.add(root);
  const actors=new Map();
  return {update(time,exterior=true){
    root.visible=exterior;if(!exterior)return;
    for(const site of CELDER_SENTRIES){
      const ready=world.readyAt(site.x,site.z);let actor=actors.get(site.id);
      if(!ready){if(actor)actor.group.visible=false;continue;}
      if(!actor){actor=createCelderKnight();actor.group.userData.sentry=site.id;actor.group.position.set(site.x,world.heightAt(site.x,site.z),site.z);actor.group.rotation.y=site.heading;actors.set(site.id,actor);root.add(actor.group);}
      actor.group.visible=true;actor.animate(time+(site.id.endsWith('1')?3.1:0),0,true);
    }
  },dispose(){for(const actor of actors.values())actor.dispose();actors.clear();root.removeFromParent();}};
}

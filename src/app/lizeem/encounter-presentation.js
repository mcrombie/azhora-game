import * as THREE from 'three';
import {encounterAttack,ENCOUNTER_ATTACKS} from '../../gameplay/combat/encounter-attacks.js';
import {isEncounterGuarding,ENCOUNTER_TIMING} from '../../gameplay/combat/lizeem-encounter.js';

export function encounterGuardPose(g,fall=1){
  const a=encounterAttack(g);
  return {attackStyle:g.attack,shieldRaised:isEncounterGuarding(g),
    action:!g.hp?'dead':g.phase==='windup'?'windup':g.phase==='strike'?'attack':g.hurt?'hurt':'idle',
    progress:!g.hp?fall:g.phase==='windup'?1-g.timer/a.windup:g.phase==='strike'?1-g.timer/a.strike:g.hurt?1-g.hurt/ENCOUNTER_TIMING.hurt:0};
}

// The complete danger footprint stays visible throughout the windup. Brightness
// marks commitment; collision uses these same reach and angle definitions.
export function createEncounterWarnings(scene,count){
  const shapes=Object.fromEntries(Object.entries(ENCOUNTER_ATTACKS).map(([name,a])=>[name,new THREE.RingGeometry(.2,a.reach,40,1,-a.halfAngle,a.halfAngle*2)]));
  const meshes=Array.from({length:count},()=>{
    const mesh=new THREE.Mesh(shapes.thrust,new THREE.MeshBasicMaterial({transparent:true,opacity:.35,side:THREE.DoubleSide,depthWrite:false}));
    mesh.rotation.x=-Math.PI/2;mesh.userData.combatWarning=true;scene.add(mesh);return mesh;
  });
  return {draw(guards,heightAt=()=>0){guards.forEach((g,i)=>{
    const mesh=meshes[i],a=encounterAttack(g);mesh.geometry=shapes[g.attack]??shapes.thrust;
    mesh.position.set(g.x,heightAt(g.x,g.z)+.08,g.z);mesh.rotation.z=g.heading-Math.PI/2;
    mesh.visible=g.hp>0&&!g.escaped&&(g.phase==='windup'||g.phase==='strike'&&!g.contactResolved);
    mesh.material.color.setHex(a.color);mesh.material.opacity=g.phase==='windup'?.18+.4*(1-g.timer/a.windup):.7;
    mesh.userData.attack=g.attack;
  });},dispose(){for(const mesh of meshes){scene.remove(mesh);mesh.material.dispose();}for(const shape of Object.values(shapes))shape.dispose();}};
}

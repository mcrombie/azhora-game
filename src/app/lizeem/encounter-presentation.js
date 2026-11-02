import * as THREE from 'three';
import {encounterCue} from '../../gameplay/combat/encounter-cue.js';
import {encounterAttack,ENCOUNTER_ATTACKS} from '../../gameplay/combat/encounter-attacks.js';
import {isEncounterGuarding,ENCOUNTER_TIMING} from '../../gameplay/combat/lizeem-encounter.js';
import {playerCombat} from '../../gameplay/combat/combat-stats.js';

export function encounterHeroPose(h,fall=1){
  const t=playerCombat(h).timing;
  return {staffGuard:!!h.hp&&h.blocking,blockImpact:h.blockImpact/t.hurt,action:!h.hp?'dead':h.dodge?'dodge':h.hurt?'hurt':h.swing?'attack':'idle',
    progress:!h.hp?fall:h.dodge?1-h.dodge/t.dodge:h.hurt?1-h.hurt/t.hurt:h.swing?1-h.swing/t.swing:0};
}

export function encounterGuardPose(g,fall=1){
  if(g.yielded)return {action:'idle',shieldRaised:false};
  const a=encounterAttack(g);
  return {submerged:g.phase==='submerged',offering:g.phase==='offering',venting:g.phase==='vent',stance:g.stance,flightHeight:g.flightHeight??0,veiled:g.phase==='veil',exposed:g.mechanic==='golem'&&g.phase==='recover',empowered:g.empowered,warded:g.warded,inscribing:g.phase==='inscribe',restoring:g.phase==='restore'&&g.hp>0,scorched:g.burnRemaining>0,attackStyle:a.style??g.attack,shieldRaised:g.defense?.type!=='weapon'&&g.phase!=='regroup'&&isEncounterGuarding(g),weaponGuard:g.defense?.type==='weapon'&&isEncounterGuarding(g),blockImpact:g.block/ENCOUNTER_TIMING.hurt,hitImpact:g.hurt/ENCOUNTER_TIMING.hurt,
    action:!g.hp?'dead':g.phase==='breaking'?'recover':g.phase==='windup'?'windup':g.phase==='strike'?'attack':g.hurt&&!g.staggerResistant?'hurt':g.open?'recover':'idle',
    progress:!g.hp?fall:g.phase==='breaking'?.5:g.phase==='windup'?1-g.timer/a.windup:g.phase==='strike'?1-g.timer/a.strike:g.hurt&&!g.staggerResistant?1-g.hurt/ENCOUNTER_TIMING.hurt:g.open?1-Math.max(0,g.timer)/a.recovery:0};
}

// The complete danger footprint stays visible throughout the windup. Brightness
// marks commitment; collision uses these same reach and angle definitions.
export function createEncounterWarnings(scene,count){
  // Cache the actual equipped move's footprint. Captains and older exercises
  // can share an attack name without sharing its reach or swing angle.
  const footprints=new Map();
  function footprint(a){
    const radius=a.reach+(a.lungeDistance??0),key=radius+':'+a.halfAngle;
    if(!footprints.has(key)){const shape=new THREE.RingGeometry(.2,radius,40,1,-a.halfAngle,a.halfAngle*2);footprints.set(key,{shape,outline:new THREE.EdgesGeometry(shape)});}
    return footprints.get(key);
  }
  const initial=footprint(ENCOUNTER_ATTACKS.thrust);
  const edges=[],openings=[];
  const meshes=Array.from({length:count},()=>{
    const mesh=new THREE.Mesh(initial.shape,new THREE.MeshBasicMaterial({transparent:true,opacity:.35,side:THREE.DoubleSide,depthWrite:false}));
    mesh.rotation.x=-Math.PI/2;mesh.userData.combatWarning=true;scene.add(mesh);
    const edge=new THREE.LineSegments(initial.outline,new THREE.LineBasicMaterial({color:0xffd09a,transparent:true,opacity:.9,depthWrite:false}));edge.rotation.x=-Math.PI/2;edge.userData.combatWarningEdge=true;scene.add(edge);edges.push(edge);
    const opening=new THREE.Mesh(new THREE.RingGeometry(.92,1.08,40),new THREE.MeshBasicMaterial({color:0xb7e88d,transparent:true,opacity:.85,side:THREE.DoubleSide,depthWrite:false}));opening.rotation.x=-Math.PI/2;opening.userData.counterOpening=true;scene.add(opening);openings.push(opening);
    return mesh;
  });
  return {draw(guards,heightAt=()=>0){guards.forEach((g,i)=>{
    const mesh=meshes[i],a=encounterAttack(g),shape=footprint(a);mesh.geometry=shape.shape;
    const origin=a.lungeDistance&&g.attackOrigin?g.attackOrigin:g;
    mesh.position.set(origin.x,heightAt(origin.x,origin.z)+.08,origin.z);mesh.rotation.z=g.heading+(a.headingOffset??0)-Math.PI/2;
    mesh.visible=g.hp>0&&!g.escaped&&(g.phase==='windup'||g.phase==='strike'&&!g.contactResolved);
    mesh.material.color.setHex(a.color);mesh.material.opacity=g.phase==='windup'?.18+.4*(1-g.timer/a.windup):.7;
    mesh.userData.attack=g.attack;
    const edge=edges[i];edge.geometry=shape.outline;edge.position.copy(mesh.position);edge.position.y+=.015;edge.rotation.z=mesh.rotation.z;edge.visible=mesh.visible;
    edge.material.color.setHex(g.phase==='strike'?0xffeee0:a.color);
    const cue=encounterCue(g),opening=openings[i];opening.visible=cue?.kind==='opening';opening.position.set(g.x,heightAt(g.x,g.z)+.09,g.z);
    if(opening.visible){opening.geometry.setDrawRange(0,Math.max(1,Math.ceil(cue.fraction*40))*6);opening.userData.remaining=cue.seconds;}

  });},dispose(){for(const mesh of meshes){scene.remove(mesh);mesh.material.dispose();}for(const edge of edges){scene.remove(edge);edge.material.dispose();}for(const opening of openings){scene.remove(opening);opening.geometry.dispose();opening.material.dispose();}for(const {shape,outline} of footprints.values()){shape.dispose();outline.dispose();}footprints.clear();}};
}

// Gold marks the model's selected opponent, not the nearest threat. The short
// pointer at Teresod's feet makes his committed facing visible while moving.
export function createEncounterTarget(scene){
  const material=new THREE.MeshBasicMaterial({color:0xffe7a0,transparent:true,opacity:.95,side:THREE.DoubleSide,depthWrite:false});
  const ring=new THREE.Mesh(new THREE.RingGeometry(.65,.75,40),material);
  const pointer=new THREE.Mesh(new THREE.RingGeometry(.82,1.08,3,1,-.22,.44),material);
  ring.rotation.x=pointer.rotation.x=-Math.PI/2;ring.userData.combatTarget=true;pointer.userData.combatFacing=true;scene.add(ring,pointer);
  return {draw(state,heightAt=()=>0){
    const h=state.hero,g=state.guards.find(g=>g.id===h.targetId&&g.hp>0&&!g.escaped);
    ring.visible=!state.outcome&&!!g;ring.userData.targetId=ring.visible?g.id:null;
    if(g){ring.position.set(g.x,heightAt(g.x,g.z)+.11,g.z);ring.scale.setScalar(Math.max(1,(g.bodyRadius??.55)/.55));}
    pointer.visible=!state.outcome;pointer.position.set(h.x,heightAt(h.x,h.z)+.12,h.z);pointer.rotation.z=h.heading-Math.PI/2;
  },dispose(){for(const mesh of [ring,pointer]){scene.remove(mesh);mesh.geometry.dispose();}material.dispose();}};
}

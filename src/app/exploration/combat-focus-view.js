import * as THREE from 'three';
import {focusCandidates,FOCUS_RANGE,aliveTarget} from '../../gameplay/combat/combat-focus.js';
import {writeHud} from './hud-write.js';

export function createCombatFocus({scene,world,yaw,canSee,snapshot}){
  const group=document.createElement('div');group.id='combat-focus';
  group.innerHTML='<div><button id="combat-focus-toggle" aria-pressed="false">Lock target (T)</button><button id="combat-focus-next">Next (E)</button></div><small></small>';
  document.getElementById('world-skirmish-actions').after(group);
  const toggle=group.querySelector('#combat-focus-toggle'),next=group.querySelector('#combat-focus-next'),label=group.querySelector('small');
  const geometry=new THREE.OctahedronGeometry(.21,0),material=new THREE.MeshBasicMaterial({color:0x9ff0ef,depthTest:true});
  const marker=new THREE.Mesh(geometry,material);marker.name='Combat focus';marker.visible=false;scene.add(marker);
  let id=null,manual=0,sightClock=0,status='',blocked=false;
  const target=s=>s.guards.find(g=>g.id===id);
  function choose(cycle=false){
    const s=snapshot();if(s.outcome)return;
    if(!cycle&&id!==null){id=null;status='Free aim';return;}
    const list=focusCandidates(s.hero,s.guards,yaw(),canSee);
    // Keep cycling stable as the camera turns toward each newly selected soldier.
    if(cycle)list.sort((a,b)=>a.id-b.id);
    const at=list.findIndex(g=>g.id===id);
    id=list.length?list[cycle?(at+1)%list.length:0].id:null;
    status=id===null?'No opponent in view':'Target locked';manual=0;sightClock=.25;
  }
  toggle.onclick=()=>choose();next.onclick=()=>choose(true);
  return {
    id:()=>id,
    manual(){manual=2;},
    cameraTarget(){const s=snapshot();return manual>0||s.outcome?null:target(s)??null;},
    keydown(e){if(!['KeyT','KeyE'].includes(e.code))return false;e.preventDefault();if(!e.repeat)choose(e.code==='KeyE');return true;},
    update(s,dt,paused=false){
      manual=Math.max(0,manual-dt);sightClock+=dt;let g=target(s);
      if(id!==null&&(!aliveTarget(g)||s.outcome||Math.hypot(g.x-s.hero.x,g.z-s.hero.z)>FOCUS_RANGE)){id=null;g=null;status='Target lost / T to choose another';}
      if(g&&sightClock>=.25){sightClock=0;blocked=!canSee(s.hero,g);}
      writeHud(group,'hidden',!!s.outcome||s.objective?.secured>0);writeHud(toggle,'disabled',paused);writeHud(next,'disabled',paused);
      const pressed=String(id!==null);if(toggle.getAttribute('aria-pressed')!==pressed)toggle.setAttribute('aria-pressed',pressed);
      writeHud(toggle,'textContent',id===null?'Lock target (T)':'Unlock (T)');
      const d=g?Math.hypot(g.x-s.hero.x,g.z-s.hero.z):0;
      const text=g?`${g.role==='runner'?'Runner':'Soldier '+(g.id+1)} / ${g.hp} health / ${Math.round(d)} m / ${blocked?'Obstructed':s.hero.targetId===id?'In strike range':d>18?'Beyond fireball range':'Close in to strike'}`:status||'Free aim / T locks the opponent nearest your view';
      if(label.textContent!==text)label.textContent=text;
      marker.visible=!!g&&!blocked;if(g)marker.position.set(g.x,world.heightAt(g.x,g.z)+2.65,g.z);
      marker.userData.focusId=id;
    },
    state:()=>({id,manual:manual>0,blocked}),
    dispose(){group.remove();marker.removeFromParent();geometry.dispose();material.dispose();}
  };
}

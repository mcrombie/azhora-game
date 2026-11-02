import * as THREE from 'three';
import {focusCandidates,FOCUS_RANGE,aliveTarget} from '../../gameplay/combat/combat-focus.js';
import {writeHud} from './hud-write.js';

export function createCombatFocus({scene,world,yaw,canSee,snapshot,controlsHost=null,onChoose=()=>{}}){
  const group=document.createElement('div');group.id='combat-focus';
  group.innerHTML='<div><button id="combat-focus-toggle" aria-pressed="false">Lock target (T)</button><button id="combat-focus-next">Next (E)</button><button id="combat-focus-commander" hidden>Target captain</button></div><small></small>';
  if(controlsHost)controlsHost.append(group);else document.getElementById('world-skirmish-actions').after(group);
  const toggle=group.querySelector('#combat-focus-toggle'),next=group.querySelector('#combat-focus-next'),label=group.querySelector('small');
  const captain=group.querySelector('#combat-focus-commander');
  const geometry=new THREE.OctahedronGeometry(.21,0),material=new THREE.MeshBasicMaterial({color:0x9ff0ef,depthTest:true});
  const marker=new THREE.Mesh(geometry,material);marker.name='Combat focus';marker.visible=false;scene.add(marker);
  let id=null,manual=0,sightClock=0,status='',blocked=false,captainClock=.25,captainId=null,captainAvailable=false;
  const target=s=>s.guards.find(g=>g.id===id);
  function choose(cycle=false){
    const s=snapshot();if(s.outcome)return;onChoose();
    if(!cycle&&id!==null){id=null;status='Free aim';return;}
    const list=focusCandidates(s.hero,s.guards,yaw(),canSee);
    // Keep cycling stable as the camera turns toward each newly selected soldier.
    if(cycle)list.sort((a,b)=>a.id-b.id);
    const at=list.findIndex(g=>g.id===id);
    id=list.length?list[cycle?(at+1)%list.length:0].id:null;
    status=id===null?'No opponent in view':'Target locked';manual=0;sightClock=.25;
  }
  toggle.onclick=()=>choose();next.onclick=()=>choose(true);
  captain.onclick=()=>{
    const s=snapshot();if(s.outcome||captain.disabled)return;
    const g=focusCandidates(s.hero,s.guards,yaw(),canSee).find(g=>g.commanderId||g.role==='champion');
    if(g){onChoose();id=g.id;status='Captain locked';manual=0;sightClock=.25;}
  };
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
      const commander=s.guards.find(g=>(g.commanderId||g.role==='champion')&&aliveTarget(g));
      writeHud(captain,'hidden',!commander);
      if(commander){
        captainClock+=dt;
        if(captainClock>=.25||captainId!==commander.id){captainClock=0;captainId=commander.id;captainAvailable=focusCandidates(s.hero,[commander],yaw(),canSee).length>0;}
        writeHud(captain,'disabled',paused||!captainAvailable);
        writeHud(captain,'textContent',id===commander.id?'Captain locked':'Target captain');
        writeHud(captain,'title',captainAvailable?`Lock onto ${commander.name}`:'Face the captain within 22 m with a clear view to lock on.');
      }
      const pressed=String(id!==null);if(toggle.getAttribute('aria-pressed')!==pressed)toggle.setAttribute('aria-pressed',pressed);
      writeHud(toggle,'textContent',id===null?'Lock target (T)':'Unlock (T)');
      const d=g?Math.hypot(g.x-s.hero.x,g.z-s.hero.z):0;
      const text=g?`${g.name??(g.role==='runner'?'Runner':'Soldier '+(g.id+1))} / ${g.hp} health / ${Math.round(d)} m / ${blocked?'Obstructed':s.hero.targetId===id?'In strike range':d>18?'Beyond fireball range':'Close in to strike'}`:status||'Free aim / T locks the opponent nearest your view';
      if(label.textContent!==text)label.textContent=text;
      marker.visible=!!g&&!blocked;if(g)marker.position.set(g.x,world.heightAt(g.x,g.z)+2.65,g.z);
      marker.userData.focusId=id;
    },
    state:()=>({id,manual:manual>0,blocked}),
    dispose(){group.remove();marker.removeFromParent();geometry.dispose();material.dispose();}
  };
}

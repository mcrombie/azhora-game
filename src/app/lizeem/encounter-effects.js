import * as THREE from 'three';
import {ENCOUNTER_BALANCE} from '../../gameplay/combat/encounter-balance.js';
import {encounterFeedback} from '../../gameplay/combat/encounter-feedback.js';
import {playImpactSound} from './impact-sound.js';

let soundEnabled=true;
// Local synthesized cues: no audio downloads, permissions, or remote services.
function createImpactSound(controls){
  let context=null,disposed=false,played=0,lastKind=null,lastPlayed=-Infinity;
  const button=document.createElement('button');button.className='combat-sound';
  const label=()=>{button.textContent=soundEnabled?'Sound: on':'Sound: off';button.setAttribute('aria-pressed',String(soundEnabled));};label();controls.append(button);
  function unlock(){
    if(disposed||!soundEnabled)return;
    try{context??=new (window.AudioContext||window.webkitAudioContext)();if(context.state==='suspended')context.resume().catch(()=>{});}catch{/* Visual feedback remains available without Web Audio. */}
  }
  button.onclick=()=>{soundEnabled=!soundEnabled;label();if(soundEnabled)unlock();};
  document.addEventListener('pointerdown',unlock);document.addEventListener('keydown',unlock);
  return {play(kind){
    if(!soundEnabled)return;
    globalThis.__AZHORA_DEMO_AUDIO__?.({kind:'impact',cue:kind});
    if(context?.state!=='running')return;
    if(context.currentTime-lastPlayed<.06)return;lastPlayed=context.currentTime;
    played++;lastKind=kind;
    playImpactSound(context,kind);
  },state:()=>({enabled:soundEnabled,state:context?.state??'locked',played,lastKind}),
  dispose(){disposed=true;document.removeEventListener('pointerdown',unlock);document.removeEventListener('keydown',unlock);button.remove();context?.close().catch(()=>{});}};
}

export function createEncounterEffects(scene,controls){
  const sound=createImpactSound(controls),seen={strike:null,defense:null,dodge:null};
  const labels=Array.from({length:3},()=>{
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;
    const texture=new THREE.CanvasTexture(canvas),material=new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:false,depthWrite:false});
    const sprite=new THREE.Sprite(material);sprite.visible=false;sprite.userData.combatImpact=true;scene.add(sprite);
    return {canvas,texture,material,sprite,at:-Infinity,duration:.7,x:0,z:0};
  });
  const recovery=new THREE.Mesh(new THREE.RingGeometry(.65,.84,40),new THREE.MeshBasicMaterial({color:0xffbb9e,transparent:true,opacity:.7,side:THREE.DoubleSide,depthWrite:false}));
  recovery.rotation.x=-Math.PI/2;recovery.visible=false;recovery.userData.hitRecovery=true;scene.add(recovery);
  let index=0;
  function show(event,point,text,color,time,duration=.7){
    const label=labels[index++%labels.length],c=label.canvas.getContext('2d');c.clearRect(0,0,512,128);c.textAlign='center';c.textBaseline='middle';c.font='bold 38px system-ui';
    c.lineWidth=8;c.strokeStyle='#17352dec';c.strokeText(text,256,64);c.fillStyle=color;c.fillText(text,256,64);label.texture.needsUpdate=true;
    Object.assign(label,{at:time,duration,x:point.x,z:point.z});label.sprite.scale.set(4,1,1);label.sprite.userData.kind=event;
  }
  return {draw(state,heightAt=()=>0,clock=performance.now()/1000){
    const h=state.hero;
    recovery.visible=h.hp>0&&h.hitGrace>0&&!state.outcome;recovery.position.set(h.x,heightAt(h.x,h.z)+.13,h.z);recovery.material.opacity=.7*(h.hitGrace??0)/ENCOUNTER_BALANCE.hitGrace;
    for(const [type,event] of [['strike',h.lastStrike],['defense',h.lastDefense],['dodge',h.lastDodge]]){
      if(!event||seen[type]===event.at)continue;seen[type]=event.at;
      if(state.time-event.at>.25)continue;
      const enemy=state.guards.find(g=>g.id===event.target);
      if(type==='strike'&&enemy&&['hit','counter','guarded','fireball'].includes(event.kind)){
        show(event.kind,enemy,event.kind==='guarded'?'SHIELD BLOCK':event.defense==='weapon'?`PARRY -${event.damage}`:event.kind==='counter'?`COUNTER -${event.damage??25}`:event.kind==='fireball'?`FIRE -${event.damage??26}`:`-${event.damage??25}`,event.kind==='guarded'?'#bbddf5':event.kind==='counter'?'#ffdb72':'#fff1cc',clock);sound.play(event.kind);
      }else if(type==='defense'&&event.kind==='blocked'){show('guarded',h,`STAFF BLOCK -${event.damage}`,'#bbddf5',clock);sound.play('guarded');}
      else if(type==='defense'&&event.kind==='hit'){show('hurt',h,`-${event.damage??ENCOUNTER_BALANCE.enemyDamage}`,'#ff9c89',clock);sound.play('hurt');}
      else if(type==='dodge'&&event.kind!=='started')show('dodge',h,event.kind==='cooldown'?'DODGE RECOVERING':event.kind==='release'?'RELEASE SPACE':event.kind==='body-blocked'?'PATH BLOCKED':'SCENERY BLOCKED','#ffe1a0',clock,1);
    }
    for(const label of labels){const age=clock-label.at;label.sprite.visible=age>=0&&age<label.duration;if(!label.sprite.visible)continue;
      label.sprite.position.set(label.x,heightAt(label.x,label.z)+1.8+age*.6,label.z);label.material.opacity=Math.min(1,(label.duration-age)*5);
    }
  },state:()=>sound.state(),feedback:encounterFeedback,dispose(){sound.dispose();recovery.removeFromParent();recovery.geometry.dispose();recovery.material.dispose();for(const label of labels){scene.remove(label.sprite);label.texture.dispose();label.material.dispose();}}};
}

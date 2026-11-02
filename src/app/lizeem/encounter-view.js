import {createArmyUnit} from '../../content/characters/army-unit-view.js';
import {militiaWeapon} from '../../gameplay/combat/combat-units.js';
import * as THREE from 'three';
import {createCharacter} from '../../content/characters/characters.js';
import {createEncounterWarnings,createEncounterTarget,encounterGuardPose,encounterHeroPose} from './encounter-presentation.js';
import {ROLLO_LOOK} from '../../content/characters/rollo-look.js';
import {createLizeemEncounter} from '../../gameplay/combat/lizeem-encounter.js';
import {createEncounterEffects} from './encounter-effects.js';

// Lazy-loaded only when the player joins. No whole-world loader or quest host.
export function openEncounter({canvas,hud,onEnd,enemyColor,guardCount=3}){
  const guardStarts=[{x:-3,z:-3},{x:3,z:-3},{x:0,z:-5}].slice(0,guardCount);
  const model=createLizeemEncounter({guardStarts:guardStarts.map((p,i)=>({...p,unitType:'militiaman',weapon:militiaWeapon(i)}))}),keys=new Set(),scene=new THREE.Scene();
  scene.background=new THREE.Color('#bbc7b4');scene.fog=new THREE.Fog('#bbc7b4',28,65);
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  const camera=new THREE.PerspectiveCamera(43,1,.1,90);camera.position.set(0,17,20);camera.lookAt(0,0,0);
  scene.add(new THREE.HemisphereLight(0xfff0d6,0x53624a,2));const sun=new THREE.DirectionalLight(0xffe8c2,2);sun.position.set(-8,16,4);scene.add(sun);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.MeshStandardMaterial({color:0x7b8963,roughness:1}));ground.rotation.x=-Math.PI/2;scene.add(ground);
  const edge=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([[-7,-7],[7,-7],[7,7],[-7,7]].map(([x,z])=>new THREE.Vector3(x,.025,z))),new THREE.LineBasicMaterial({color:0xd8c793}));scene.add(edge);
  const hero=createCharacter({role:'traveler',look:ROLLO_LOOK,armed:true,hat:false});hero.setWeapon('oak-staff');scene.add(hero.group);
  const guards=Array.from({length:guardCount},(_,i)=>{const actor=createArmyUnit({weapon:militiaWeapon(i),variant:i,tunic:new THREE.Color(enemyColor).getHex()});scene.add(actor.group);return actor;});
  const warnings=createEncounterWarnings(scene,guards.length),targetMarker=createEncounterTarget(scene),effects=createEncounterEffects(scene,canvas.parentElement);
  const feedback=document.createElement('p');feedback.setAttribute('role','status');canvas.parentElement.append(feedback);
  let frame,last=performance.now(),disposed=false,ended=false,paused=false,accumulator=0,clickAttack=false;
  const input=()=>({x:Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft')),z:Number(keys.has('KeyS')||keys.has('ArrowDown'))-Number(keys.has('KeyW')||keys.has('ArrowUp')),attack:keys.has('KeyX')||clickAttack,dodge:keys.has('Space')});
  const down=e=>{if(['KeyW','KeyA','KeyS','KeyD','KeyX','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)){e.preventDefault();e.stopPropagation();keys.add(e.code);}};
  const up=e=>keys.delete(e.code),clearKeys=()=>keys.clear(),blur=()=>{keys.clear();paused=true;},focus=()=>{paused=false;last=performance.now();};
  const attack=e=>{if(e.button===0){clickAttack=true;canvas.focus();}};
  canvas.addEventListener('keydown',down);canvas.addEventListener('keyup',up);canvas.addEventListener('pointerdown',attack);
  window.addEventListener('blur',blur);window.addEventListener('focus',focus);canvas.addEventListener('blur',clearKeys);
  function draw(s){
    const w=canvas.clientWidth,h=canvas.clientHeight;if(canvas.width!==Math.round(w*renderer.getPixelRatio())||canvas.height!==Math.round(h*renderer.getPixelRatio())){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
    hero.group.position.set(s.hero.x,0,s.hero.z);hero.group.rotation.y=s.hero.heading;
    hero.animate(s.time,Math.hypot(input().x,input().z)*s.hero.combat.moveSpeed,true,encounterHeroPose(s.hero));
    guards.forEach((actor,i)=>{const g=s.guards[i];actor.group.position.set(g.x,0,g.z);actor.group.rotation.y=g.heading;actor.group.visible=g.hp>0;actor.animate(s.time,g.speed,true,encounterGuardPose(g));});
    warnings.draw(s.guards);
    targetMarker.draw(s);
    effects.draw(s);feedback.textContent=effects.feedback(s)?.text??'';
    hud.textContent=`Health ${s.hero.hp}/${s.hero.maxHp} · Guards ${s.guards.filter(g=>!g.hp).length}/${guardCount} · ${Math.max(0,Math.ceil(90-s.time))}s · ${s.hero.dodgeCooldown?'Dodge recovering':'Dodge ready'}${paused?' · Paused while window is inactive':''}`;
    renderer.render(scene,camera);
  }
  function loop(now){
    if(disposed)return;accumulator+=paused||ended?0:Math.min(.1,(now-last)/1000);last=now;
    while(accumulator>=1/60&&!ended){const s=model.tick(1/60,input());clickAttack=false;accumulator-=1/60;if(s.outcome){ended=true;keys.clear();onEnd(s.outcome);}}
    if(disposed)return;
    draw(model.snapshot());frame=requestAnimationFrame(loop);
  }
  draw(model.snapshot());canvas.focus();frame=requestAnimationFrame(loop);
  return {snapshot:model.snapshot,dispose(){disposed=true;cancelAnimationFrame(frame);canvas.removeEventListener('keydown',down);canvas.removeEventListener('keyup',up);canvas.removeEventListener('pointerdown',attack);canvas.removeEventListener('blur',clearKeys);window.removeEventListener('blur',blur);window.removeEventListener('focus',focus);renderer.dispose();renderer.forceContextLoss();
    // Character meshes share cached geometry/materials across encounters. Only
    // dispose resources authored here; shared character resources remain reusable.
    ground.geometry.dispose();ground.material.dispose();edge.geometry.dispose();edge.material.dispose();warnings.dispose();targetMarker.dispose();effects.dispose();feedback.remove();
  }};
}

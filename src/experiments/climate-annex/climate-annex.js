import * as THREE from 'three';
import {createCharacter} from '../../content/characters/characters.js';
import {getMovementInput,moveCharacter,canStand} from '../../gameplay/movement/game-state.js';
import {buildClimateAnnex} from './climate-annex-world.js';
import {createAnnexState,ANNEX_SITES} from './climate-annex-state.js';
import {ANNEX_DIALOGUE} from './climate-annex-dialogue.js';

// Selected in boot before main.js is imported. The normal world, progression and
// checkpoint bridge are never constructed or called by this temporary scene.
export function startClimateAnnex(){
  document.body.className='annex-mode';
  document.body.innerHTML=`<canvas id="annex-canvas" tabindex="0" aria-label="Climate annex playable scene"></canvas>
    <style>
      .annex-mode{margin:0;overflow:hidden;background:#334d43;color:#f6e5ba;font-family:Georgia,serif}
      #annex-canvas{position:fixed;inset:0;width:100%;height:100%;outline:none}
      .annex-title{position:fixed;top:26px;left:32px;pointer-events:none;text-shadow:0 2px 8px #102822}
      .annex-title small{font:11px system-ui;letter-spacing:3px}.annex-title h1{font-size:28px;font-weight:400;margin:8px 0}
      .annex-tools{position:fixed;top:24px;right:24px;display:flex;gap:8px}
      .annex-mode button{font:14px system-ui;color:#f6e5ba;background:#173d34eb;border:1px solid #bdad7a;border-radius:3px;padding:12px 18px;cursor:pointer}
      .annex-mode button:focus-visible{outline:3px solid #ffe099;outline-offset:3px}
      #annex-prompt{position:fixed;bottom:94px;left:50%;transform:translateX(-50%);white-space:nowrap}
      #annex-speech{position:fixed;bottom:88px;left:50%;transform:translateX(-50%);width:min(620px,85vw);background:#15382feb;border:1px solid #a79b6e;padding:24px;box-sizing:border-box;box-shadow:0 12px 50px #0005}
      #annex-speech strong{font:12px system-ui;text-transform:uppercase;letter-spacing:2px;color:#e8c879}
      #annex-speech p{font-size:19px;line-height:1.5;margin:15px 0}
      #annex-help{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);font:13px system-ui;background:#163c32de;padding:12px 20px;white-space:nowrap}
      #annex-status{position:fixed;left:32px;top:115px;font:14px system-ui;background:#163c32cc;padding:10px 14px}
      .annex-mode [hidden]{display:none!important}
    </style>
    <header class="annex-title"><small>AZHORA / A PROVISIONAL ENCOUNTER</small><h1>A Waiting Room for Climates</h1></header>
    <nav class="annex-tools" aria-label="Prototype controls"><button id="annex-reset">Reset scene</button><button id="annex-exit">Exit to main menu</button></nav>
    <div id="annex-status" hidden></div>
    <button id="annex-prompt" hidden></button>
    <section id="annex-speech" role="dialog" aria-label="Conversation" hidden><strong></strong><p></p><button id="annex-next">Continue · F</button></section>
    <div id="annex-help">WASD walk · Shift / Tab run · Space jump · RMB drag to look · Wheel zoom · F interact · Esc close conversation</div>`;
  const canvas=document.getElementById('annex-canvas'),abort=new AbortController(),listen=(target,event,fn)=>target.addEventListener(event,fn,{signal:abort.signal});
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x8daca0);scene.fog=new THREE.Fog(0x8daca0,32,67);
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.07;
  const camera=new THREE.PerspectiveCamera(55,innerWidth/innerHeight,.1,100);
  scene.add(new THREE.HemisphereLight(0xe9f3d9,0x455b4b,1.25));
  const sun=new THREE.DirectionalLight(0xffe0ad,1.65);sun.position.set(-14,26,16);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-28,right:28,top:28,bottom:-28,near:.5,far:80});sun.shadow.bias=-.001;scene.add(sun);
  const built=buildClimateAnnex(scene),state=createAnnexState(),player=createCharacter({role:'traveler',armed:false});player.setArmed(false);scene.add(player.group);
  const keys=new Set(),ray=new THREE.Raycaster(),focus=new THREE.Vector3(),desired=new THREE.Vector3();
  let yaw=0,pitch=.3,distance=7,vertical=0,grounded=true,near=null,dialogue=null,elapsed=0,last=performance.now(),frameId=0,disposed=false,drag=false;
  const prompt=document.getElementById('annex-prompt'),speech=document.getElementById('annex-speech'),status=document.getElementById('annex-status');
  function clearLine(a,b){
    // Sample the same physical world used by movement; stop short of the NPC's footprint.
    const length=Math.hypot(a.x-b.x,a.z-b.z),n=Math.ceil(length/.2);
    for(let i=1;i<n-3;i++){const t=i/n;if(!canStand(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t,built.world,.04))return false;}return true;
  }
  function closeSpeech(){dialogue=null;speech.hidden=true;canvas.focus();}
  function say(title,lines){keys.clear();dialogue={title,lines,index:0};speech.hidden=false;prompt.hidden=true;speech.querySelector('strong').textContent=title;speech.querySelector('p').textContent=lines[0];document.getElementById('annex-next').focus();}
  function next(){if(!dialogue)return;if(++dialogue.index>=dialogue.lines.length){closeSpeech();return;}speech.querySelector('p').textContent=dialogue.lines[dialogue.index];}
  function interact(){
    if(dialogue){next();return;}near=state.nearest(player.group.position,clearLine);if(!near)return;
    const settled=state.phase==='settled';
    if(near.id==='exit'){exit();return;}
    if(near.id==='partition'){state.move();return;}
    const id=['attendant','emissary','heat','frost'].includes(near.id)?near.id+(settled?'After':'Before'):near.id;
    say(near.id==='attendant'?'Goblin attendant':near.id==='emissary'?'Hot-climate emissary':'A closer look',ANNEX_DIALOGUE[id]);
  }
  function reset(){state.reset();closeSpeech();keys.clear();player.group.position.set(0,1,12);player.group.rotation.y=Math.PI;yaw=0;pitch=.3;distance=7;vertical=0;grounded=true;status.hidden=true;updateCamera(true);}
  function updateCamera(snap=false){
    focus.copy(player.group.position).add(new THREE.Vector3(0,1.5,0));
    desired.set(focus.x+Math.sin(yaw)*Math.cos(pitch)*distance,focus.y+Math.sin(pitch)*distance,focus.z+Math.cos(yaw)*Math.cos(pitch)*distance);
    const direction=desired.clone().sub(focus);ray.set(focus,direction.clone().normalize());ray.far=direction.length();
    const hits=ray.intersectObjects(built.solids.filter(o=>o.visible),false);if(hits.length)desired.copy(focus).addScaledVector(direction.normalize(),Math.max(.6,hits[0].distance-.25));
    desired.y=Math.max(1.25,desired.y);if(snap)camera.position.copy(desired);else camera.position.lerp(desired,.2);camera.lookAt(focus);
  }
  function step(dt){
    dt=Math.max(0,dt);elapsed+=dt;
    if(!dialogue){
      const {forward,side}=getMovementInput(keys),speed=keys.has('Tab')||keys.has('ShiftLeft')||keys.has('ShiftRight')?7:4.5;
      const dx=(-Math.sin(yaw)*forward+Math.cos(yaw)*side)*speed*dt,dz=(-Math.cos(yaw)*forward-Math.sin(yaw)*side)*speed*dt;
      const before=player.group.position.clone();moveCharacter(player.group.position,dx,dz,built.world,.34);
      const travelled=player.group.position.distanceTo(before);if(travelled>.001)player.group.rotation.y=Math.atan2(dx,dz);
      const floor=built.world.heightAt(player.group.position.x,player.group.position.z);
      if(grounded)player.group.position.y=floor;
      else{vertical-=20*dt;player.group.position.y+=vertical*dt;if(player.group.position.y<=floor){player.group.position.y=floor;grounded=true;vertical=0;}}
      state.tick(dt);player.animate(elapsed,travelled/Math.max(.001,dt),grounded);
    }
    built.update(elapsed,player.group.position,state.progress,yaw);near=state.nearest(player.group.position,clearLine);
    prompt.hidden=!!dialogue||!near;if(near)prompt.textContent='F · '+near.name;
    status.hidden=state.phase==='leaking';status.textContent=state.phase==='moving'?'The heavy screen slides along its rail…':'The warmth stays. The dripping stops.';
    updateCamera();renderer.render(scene,camera);
  }
  function frame(now){if(disposed)return;step(Math.min(.04,(now-last)/1000));last=now;frameId=requestAnimationFrame(frame);}
  function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}
  function dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(frameId);abort.abort();keys.clear();built.dispose();scene.traverse(o=>{if(o.isMesh){o.geometry?.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m?.dispose();}});renderer.dispose();renderer.forceContextLoss();delete window.__CLIMATE_ANNEX__;}
  function exit(){dispose();const url=new URL(location.href);for(const k of ['scene','launch','test'])url.searchParams.delete(k);location.replace(url.href);}
  listen(window,'resize',resize);listen(window,'pagehide',dispose);listen(window,'blur',()=>{keys.clear();drag=false;});
  listen(document,'keydown',e=>{if(e.code==='Tab'||e.code==='Space')e.preventDefault();if(e.repeat)return;if(e.code==='Escape'){closeSpeech();return;}if(e.code==='KeyF'||e.code==='Enter'&&document.activeElement===canvas){interact();return;}if(e.code==='Space'&&grounded&&!dialogue){vertical=8.2;grounded=false;}keys.add(e.code);});
  listen(document,'keyup',e=>keys.delete(e.code));listen(canvas,'contextmenu',e=>e.preventDefault());
  listen(canvas,'pointerdown',e=>{canvas.focus();if(e.button===2){drag=true;canvas.setPointerCapture(e.pointerId);}});
  listen(canvas,'pointerup',()=>drag=false);listen(canvas,'pointermove',e=>{if(drag){yaw-=e.movementX*.006;pitch=Math.max(-.15,Math.min(1.12,pitch+e.movementY*.004));}});
  listen(canvas,'wheel',e=>{distance=Math.max(2.8,Math.min(12,distance+e.deltaY*.008));});
  listen(prompt,'click',interact);listen(document.getElementById('annex-next'),'click',next);listen(document.getElementById('annex-reset'),'click',reset);listen(document.getElementById('annex-exit'),'click',exit);
  resize();reset();frameId=requestAnimationFrame(frame);canvas.focus();
  if(new URLSearchParams(location.search).has('test'))window.__CLIMATE_ANNEX__={
    state:()=>({...state.view(),position:player.group.position.toArray(),near:near?.id,dialogue:dialogue?.title,partition:built.partition.position.x,entities:2,disposed,visual:built.visualState()}),
    reset,interact,next,dispose,step,clearLine,
    async walk(points){closeSpeech();for(const target of points){let attempts=0;while(Math.hypot(target.x-player.group.position.x,target.z-player.group.position.z)>.13){const p=player.group.position,dx=target.x-p.x,dz=target.z-p.z,len=Math.hypot(dx,dz);const old=p.clone();moveCharacter(p,dx/len*.085,dz/len*.085,built.world,.34);if(p.distanceTo(old)<.001||attempts++>1600)throw new Error('Blocked walk to '+JSON.stringify(target)+' at '+JSON.stringify(p.toArray()));if(attempts%20===0)await new Promise(requestAnimationFrame);}step(.016);}updateCamera(true);return this.state();},
    look(angle=0,elevation=.35,zoom=7){yaw=angle;pitch=elevation;distance=zoom;updateCamera(true);step(.001);},
    sites:ANNEX_SITES,
  };
  return {dispose,reset};
}

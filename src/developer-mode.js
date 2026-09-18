import * as THREE from 'three';
import { createCharacter } from './characters.js';
import { createGhostFlight } from './ghost-camera.js';
import { createThalmagarWorld } from './thalmagar-world.js';
import { createSurveyWorld } from './survey-world.js';
import { createDeveloperAtlasData, DEV_WORLD_DESTINATIONS, developerRegionSelection, developerAtlasMarkup, developerLocalRouteMarkup } from './developer-atlas.js';

/** A separate spectator scene/controller. It has no quest, inventory, or save APIs. */
export function createDeveloperMode({renderer,normalScene,world,player,onExit=()=>{}}) {
  const panel=document.createElement('section');panel.id='developer-mode';panel.hidden=true;
  panel.innerHTML=`<div class="ghost-toolbar"><div><span class="eyebrow">DEVELOPER · GHOST VIEW</span><h2 id="ghost-location">Azhora atlas</h2><p id="ghost-subtitle">Choose a region to inspect.</p></div><div class="ghost-tools"><button id="ghost-map-toggle">Atlas <kbd>M</kbd></button><button id="ghost-exit">Return to adventure <kbd>F8</kbd></button></div></div>
  <div id="ghost-atlas"><div class="ghost-map-column"><div class="ghost-atlas-tools"><button id="ghost-map-fit">Whole world</button><button id="ghost-map-home">Drent</button><button id="ghost-map-cape">Thalmagar</button><button id="ghost-map-minus" aria-label="Zoom out">−</button><button id="ghost-map-plus" aria-label="Zoom in">+</button></div><div id="ghost-map-viewport" tabindex="0" aria-label="Developer atlas. Click a region; scroll to zoom and drag to pan."><div id="ghost-map-content"></div></div><p class="ghost-map-hint">Click any named region · Scroll to zoom · Drag to pan · Gold pins mark authored scenes</p></div>
  <aside id="ghost-selection"><span class="eyebrow">WORLD BUILDER ATLAS</span><h3 id="ghost-region-name">Loading the atlas…</h3><p id="ghost-region-note"></p><div id="ghost-destinations"></div><div id="ghost-local-route"></div><p class="ghost-scope">Ghost view pauses your adventure. Flight, visits, and test scenes do not change your saved progress.</p></aside></div>
  <div id="ghost-flight-hud" hidden><p id="ghost-coordinates"></p><p>WASD / Q E · Fly &nbsp; Shift / Tab · Boost &nbsp; Space / Ctrl · Rise / Descend &nbsp; Right-drag · Look &nbsp; Scroll · Speed</p></div>`;
  document.body.append(panel);
  const $=id=>panel.querySelector(`#${id}`),viewport=$('ghost-map-viewport'),content=$('ghost-map-content');
  const pins=document.createElement('div');pins.id='ghost-map-pins';viewport.append(pins);
  for(const destination of [DEV_WORLD_DESTINATIONS[0],DEV_WORLD_DESTINATIONS[4]]){const pin=document.createElement('button');pin.className='ghost-pin';pin.dataset.regionPin=destination.regionId;pin.textContent=destination.region===1?'First shore · Drent':'Cape Thalmagar';pin.title='Show the authored scene locations in this region';pin.onclick=()=>focusRegion(destination.regionId);pins.append(pin);}
  const camera=new THREE.PerspectiveCamera(60,innerWidth/innerHeight,.1,4000);
  const avatar=createCharacter();avatar.setArmed(false);avatar.group.name='Developer ghost';avatar.group.scale.setScalar(.8);
  const ghostMaterials=new Set();avatar.group.traverse(object=>{if(!object.isMesh)return;const materials=Array.isArray(object.material)?object.material:[object.material];object.material=materials.map(material=>{const copy=material.clone();copy.transparent=true;copy.opacity=.23;copy.depthWrite=false;copy.color?.set(0xa2e6df);copy.emissive?.set(0x174a51);ghostMaterials.add(copy);return copy;});if(object.material.length===1)object.material=object.material[0];object.castShadow=false;});
  let active=false,atlasOpen=true,atlas=null,selection=null,current=null,flight=null,currentScene=normalScene,isolated=null,clock=0;
  let playerWasVisible=true,zoom=1,panX=0,panY=0,fitScale=1,viewWidth=0,viewHeight=0,drag=null,look=null;
  const held=new Set();
  const ready=Promise.all(['./assets/azhora-world-map.json','./assets/azhora-world-map.svg','./assets/azhora-dev-regions.json'].map(async(url,i)=>{const response=await fetch(url);if(!response.ok)throw new Error('A developer atlas asset is missing.');return i===1?response.text():response.json();}))
    .then(([meta,svg,survey])=>{atlas=createDeveloperAtlasData(meta,svg,survey);content.innerHTML=developerAtlasMarkup(atlas);selectRegion('Drent');fit();return atlas;})
    .catch(error=>{$('ghost-region-name').textContent='Atlas unavailable';$('ghost-region-note').textContent=error.message;return null;});

  function layout(){if(!atlas)return;const w=viewport.clientWidth,h=viewport.clientHeight;if(!w||!h)return;
    const oldScale=fitScale*zoom,cx=(viewWidth/2-panX)/oldScale,cy=(viewHeight/2-panY)/oldScale;
    fitScale=Math.min(w/atlas.width,h/atlas.height);const scale=fitScale*zoom;
    if(viewWidth&&viewHeight&&(w!==viewWidth||h!==viewHeight)){panX=w/2-cx*scale;panY=h/2-cy*scale;}viewWidth=w;viewHeight=h;
    const width=atlas.width*scale,height=atlas.height*scale;panX=width<w?(w-width)/2:Math.max(w-width,Math.min(0,panX));panY=height<h?(h-height)/2:Math.max(h-height,Math.min(0,panY));
    content.style.width=`${atlas.width}px`;content.style.height=`${atlas.height}px`;content.style.transform=`translate(${panX}px,${panY}px) scale(${scale})`;
    for(const pin of pins.children){const point=DEV_WORLD_DESTINATIONS.find(d=>d.regionId===pin.dataset.regionPin).atlas;pin.style.left=`${panX+point.x*scale}px`;pin.style.top=`${panY+point.y*scale}px`;}}
  function fit(){zoom=1;panX=panY=0;layout();}
  function zoomAt(factor,x=viewport.clientWidth/2,y=viewport.clientHeight/2){if(!atlas)return;const old=fitScale*zoom,mx=(x-panX)/old,my=(y-panY)/old;zoom=Math.max(1,Math.min(24,zoom*factor));panX=x-mx*fitScale*zoom;panY=y-my*fitScale*zoom;layout();}
  function focusRegion(id){if(!atlas)return;layout();selectRegion(id);const r=selection.region;zoom=Math.min(24,Math.max(1,Math.min(viewport.clientWidth/(r.width+110),viewport.clientHeight/(r.height+130))/fitScale));panX=viewport.clientWidth/2-r.centerX*fitScale*zoom;panY=viewport.clientHeight/2-r.centerY*fitScale*zoom;layout();}
  function selectRegion(id){
    selection=developerRegionSelection(atlas,id);if(!selection)return false;
    $('ghost-region-name').textContent=selection.name;$('ghost-region-note').textContent=selection.note;
    for(const node of content.querySelectorAll('[data-dev-region]')){const chosen=node.dataset.devRegion===id;node.classList.toggle('selected',chosen);node.setAttribute('aria-pressed',String(chosen));}
    $('ghost-destinations').replaceChildren();
    for(const destination of selection.destinations){const button=document.createElement('button');button.dataset.ghostVisit=destination.id;button.textContent=`Fly into ${destination.name}`;button.onclick=()=>visit(destination);$('ghost-destinations').append(button);}
    $('ghost-local-route').innerHTML=id==='Drent'?developerLocalRouteMarkup({selectedId:current?.id}):'';
    if(id==='Drent'){const text=document.createElement('p');text.className='ghost-map-hint';text.textContent='Local route · north at top · schematic';$('ghost-local-route').append(text);}
    return true;
  }
  function releaseScene(){avatar.group.removeFromParent();isolated?.world.dispose();isolated=null;currentScene=normalScene;}
  function lookFrom(start,target){const dx=target.x-start.x,dy=target.y-start.y,dz=target.z-start.z;return {yaw:Math.atan2(-dx,-dz),pitch:-Math.atan2(dy,Math.hypot(dx,dz))};}
  function makeScene(dark=false){const scene=new THREE.Scene();scene.background=new THREE.Color(dark?0x282d34:0x9bbcc1);scene.fog=new THREE.FogExp2(dark?0x34333a:0xadc4c2,dark?.0021:.00075);scene.add(new THREE.HemisphereLight(dark?0xa4b6d0:0xdde7dc,dark?0x3e2523:0x586c43,dark?1.65:2.2));const sun=new THREE.DirectionalLight(dark?0xe29f77:0xffe1b0,dark?2.8:3);sun.position.set(-160,250,80);scene.add(sun);return scene;}
  function visit(destination){
    if(!active||!destination)return false;held.clear();look=null;releaseScene();
    let start,bounds,target,subtitle;
    if(destination.scene==='playable-world'){
      const points={drent:{x:-15,z:29},luscia:{x:-386,z:183},moros:{x:-500,z:312},suval:{x:-56,z:636},'west-suval':{x:-530,z:875},pueth:{x:-110,z:-170},peblos:{x:334,z:428},'west-izol':{x:56,z:1725}};
      const p=points[destination.travelTarget]||points.drent;start={x:p.x,y:world.heightAt(p.x,p.z)+8,z:p.z};target={x:p.x,y:start.y-2,z:p.z-30};bounds={...world.bounds,minY:-20,maxY:350};subtitle='Playable region · ghost inspection';
    }else{
      const dark=destination.scene==='cape-thalmagar';currentScene=makeScene(dark);
      const area=dark?createThalmagarWorld(currentScene):createSurveyWorld(currentScene,atlas.regions.find(r=>r.id===destination.regionId));isolated={scene:currentScene,world:area};
      start=area.spawn;target=area.lookAt;bounds=area.bounds;subtitle=dark?'Fortress prototype · separate development scene':'Atlas terrain survey · gameplay not built';
    }
    current={...destination};flight=createGhostFlight({position:start,...lookFrom(start,target),bounds});currentScene.add(avatar.group);avatar.group.visible=true;
    $('ghost-location').textContent=destination.name;$('ghost-subtitle').textContent=subtitle;
    setAtlas(false);update(0);renderer.domElement.focus();return true;
  }
  function setAtlas(value){atlasOpen=!!value;held.clear();look=null;$('ghost-atlas').hidden=!atlasOpen;$('ghost-flight-hud').hidden=atlasOpen;$('ghost-map-toggle').textContent=atlasOpen&&current?'Resume flight · M':'Atlas · M';
    if(atlasOpen){requestAnimationFrame(layout);$('ghost-map-fit').focus();}else renderer.domElement.focus();}
  function open(){if(active)return;active=true;playerWasVisible=player.group.visible;player.group.visible=false;panel.hidden=false;document.body.classList.add('ghost-view');setAtlas(true);ready.then(()=>{if(active)layout();});}
  function close(){if(!active)return;active=false;held.clear();look=null;panel.hidden=true;document.body.classList.remove('ghost-view');player.group.visible=playerWasVisible;releaseScene();current=null;flight=null;onExit();}
  function update(dt){if(!active)return;clock+=dt;if(flight){const state=flight.update(dt,held,!atlasOpen);avatar.group.position.set(state.position.x,state.position.y,state.position.z);avatar.group.rotation.y=Math.PI+state.yaw;avatar.animate(clock,state.moving?2:0,false,{armed:false});
      const pose=flight.cameraPose({distance:8,targetHeight:1.1});camera.position.set(pose.position.x,pose.position.y,pose.position.z);camera.lookAt(pose.target.x,pose.target.y,pose.target.z);
      $('ghost-coordinates').textContent=`X ${state.position.x.toFixed(0)} · Y ${state.position.y.toFixed(0)} · Z ${state.position.z.toFixed(0)}   |   ${state.boosting?'BOOST ':''}${Math.round(state.boosting?state.boostSpeed:state.speed)} m/s`;
      if(!atlasOpen)isolated?.world.update(clock,dt);
    }else{camera.position.set(16,14,59);camera.lookAt(0,3,13);}camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}
  $('ghost-map-toggle').onclick=()=>setAtlas(!atlasOpen||!current);$('ghost-exit').onclick=close;$('ghost-map-fit').onclick=fit;$('ghost-map-home').onclick=()=>focusRegion('Drent');$('ghost-map-cape').onclick=()=>focusRegion('Cape Thalmagar');$('ghost-map-plus').onclick=()=>zoomAt(1.5);$('ghost-map-minus').onclick=()=>zoomAt(1/1.5);
  const chooseTarget=target=>{const region=target.closest('[data-dev-region]'),destination=target.closest('[data-dev-destination]');if(region)selectRegion(region.dataset.devRegion);if(destination)visit(DEV_WORLD_DESTINATIONS.find(d=>d.id===destination.dataset.devDestination));};
  content.addEventListener('click',event=>{if(event.detail===0&&!drag?.moved)chooseTarget(event.target);});$('ghost-local-route').addEventListener('click',event=>chooseTarget(event.target));
  panel.addEventListener('keydown',event=>{if(['Enter','Space'].includes(event.code)&&event.target.closest('[data-dev-region],[data-dev-destination]')){event.preventDefault();chooseTarget(event.target);}});
  viewport.addEventListener('wheel',event=>{event.preventDefault();const box=viewport.getBoundingClientRect();zoomAt(Math.exp(-event.deltaY*.0015),event.clientX-box.left,event.clientY-box.top);},{passive:false});
  viewport.addEventListener('pointerdown',event=>{if(event.button!==0||event.target.closest('.ghost-pin'))return;drag={id:event.pointerId,x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,moved:false};viewport.setPointerCapture(event.pointerId);});
  viewport.addEventListener('pointermove',event=>{if(!drag||drag.id!==event.pointerId)return;panX+=event.clientX-drag.x;panY+=event.clientY-drag.y;drag.x=event.clientX;drag.y=event.clientY;drag.moved||=Math.hypot(drag.x-drag.startX,drag.y-drag.startY)>4;layout();});
  viewport.addEventListener('pointerup',event=>{const moved=drag?.moved;if(!moved){const node=document.elementFromPoint(event.clientX,event.clientY);if(node)chooseTarget(node);}setTimeout(()=>drag=null,0);});
  viewport.addEventListener('pointercancel',()=>drag=null);viewport.addEventListener('lostpointercapture',()=>{if(drag)drag=null;});
  const keydown=event=>{if(!active)return;if(event.code==='F8'||event.code==='Escape'||event.code==='KeyM'){if(event.repeat)return;event.preventDefault();event.stopImmediatePropagation();if(event.code==='F8')close();else if(event.code==='Escape'){if(atlasOpen&&current)setAtlas(false);else if(atlasOpen)close();else setAtlas(true);}else setAtlas(!atlasOpen||!current);return;}if(atlasOpen)return;if(event.target.closest?.('button')&&['Enter','Space','Tab'].includes(event.code))return;event.preventDefault();event.stopImmediatePropagation();held.add(event.code);};
  document.addEventListener('keydown',keydown,true);document.addEventListener('keyup',event=>{if(active){held.delete(event.code);if(!atlasOpen&&!(event.target.closest?.('button')&&['Enter','Space','Tab'].includes(event.code))){event.preventDefault();event.stopImmediatePropagation();}}},true);
  const canvas=renderer.domElement;
  canvas.addEventListener('pointerdown',event=>{if(!active||atlasOpen||event.button!==2)return;event.preventDefault();look={x:event.clientX,y:event.clientY};canvas.setPointerCapture(event.pointerId);});
  canvas.addEventListener('pointermove',event=>{if(!active||!look)return;flight.rotate(event.clientX-look.x,event.clientY-look.y);look={x:event.clientX,y:event.clientY};});
  canvas.addEventListener('pointerup',()=>look=null);canvas.addEventListener('lostpointercapture',()=>look=null);
  canvas.addEventListener('wheel',event=>{if(active&&!atlasOpen){event.preventDefault();flight.speedScale(event.deltaY);}},{passive:false});
  window.addEventListener('blur',()=>{held.clear();look=null;});new ResizeObserver(layout).observe(viewport);
  return {open,close,update,ready,visit,selectRegion,focusRegion,setAtlas,get active(){return active;},get scene(){return currentScene;},camera,
    state:()=>({active,atlasOpen,destination:current?.id??null,scene:current?.scene??null,regionId:current?.regionId??null,flight:flight?.snapshot()??null,regionCount:atlas?.regions.length??0,selectedRegion:selection?.region.id??null,ghostOpacity:[...ghostMaterials][0]?.opacity,world:isolated?.world.metadata??null}),
    destination:id=>DEV_WORLD_DESTINATIONS.find(d=>d.id===id)||developerRegionSelection(atlas,id)?.destinations[0],
    setPosition:point=>flight?.setPosition(point),setView:view=>flight?.setView(view)};
}

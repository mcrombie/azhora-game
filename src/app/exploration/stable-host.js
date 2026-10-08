import * as THREE from 'three';
import {createCharacter,createHorse,groundShadow} from '../../content/characters/characters.js';
import {createRiding,RIDE} from '../../gameplay/movement/riding.js';
import {canStand,canSwim,waterAt} from '../../gameplay/movement/locomotion.js';
import {MINORA_STABLE as STABLE,BEAR_RIDING_LESSON} from '../../content/regions/minora-frontier/minora-stable.js';
import {writeHud} from './hud-write.js';

// Horses share the rider's reachable walking surface. Keep a parked horse's
// last physical elevation in-session, but do not invent a saved floor above a
// swimmer: a nearby restored rider supplies the only safe height hint.
export function createStableGrounding(world,position){
  let knownY=null;
  const support=(x,z,maxY=position.y)=>world.supportAt?.(x,z,{maxY,stepUp:.45,groundSlope:false})?.height??world.heightAt(x,z);
  const field=maxY=>({...world,heightAt:(x,z)=>support(x,z,maxY)});
  function at(x,z){
    const maxY=knownY??(Math.hypot(position.x-x,position.z-z)<=RIDE.reach?position.y:world.heightAt(x,z));
    const ground=support(x,z,maxY),water=waterAt(x,z,world),swimming=water-ground>RIDE.wadingDepth;
    return {ground,y:swimming?water-RIDE.floatOffset:ground,swimming,maxY};
  }
  function mountFloor(x,z){const floor=at(x,z);return !floor.swimming&&Math.abs(floor.y-position.y)<=1.5&&canStand(x,z,field(floor.maxY),RIDE.radius,floor.y)?floor:null;}
  return {support,field,at,mountFloor,remember:y=>{if(Number.isFinite(y))knownY=y;},reset:()=>{knownY=null;}};
}

export function createStableHost({scene,world,actor,position,mounts,movement,saved,inside,mode,setMode,notice,onChange}){
  const riding=createRiding({onEvent:onChange}),empty=riding.snapshot();
  if(saved)riding.restore(saved);
  const root=new THREE.Group();root.name='Bear and the Minora horse';scene.add(root);
  const bear=createCharacter({role:'villager',look:STABLE.look,skin:STABLE.skin,tunic:STABLE.tunic,armed:false});
  bear.group.scale.setScalar(STABLE.scale);bear.setArmed(false);root.add(bear.group);
  const horse=createHorse({saddled:true});root.add(horse.group);
  const horseShadow=groundShadow(.7),bearShadow=groundShadow(.16);root.add(horseShadow,bearShadow);
  const prompt=document.createElement('button');prompt.id='stable-interact';prompt.hidden=true;document.body.append(prompt);
  const dialog=document.createElement('section');dialog.id='stable-lesson';dialog.hidden=true;dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby','stable-speaker');
  dialog.innerHTML='<div class="tower-dialog-card"><span class="eyebrow">MINORA / THE STABLEBOY</span><h2 id="stable-speaker">Bear</h2><h3 id="stable-topic"></h3><p id="stable-words"></p><small id="stable-page"></small><div class="tower-dialog-actions"><button id="stable-next"></button><button id="stable-close">Not yet</button></div></div>';
  document.body.append(dialog);const $=id=>dialog.querySelector('#'+id);let page=0;
  const grounding=createStableGrounding(world,position);
  const footing=(x,z,r=.34)=>world.readyAt(x,z)&&world.canExploreAt(x,z)&&canStand(x,z,grounding.field(position.y),r,grounding.support(x,z));
  const horseAfloat=(x,z)=>grounding.at(x,z).swimming;
  const horseFooting=(x,z)=>{const at=grounding.at(x,z),field=grounding.field(at.maxY);return world.readyAt(x,z)&&world.canExploreAt(x,z)&&(canStand(x,z,field,RIDE.radius,at.y)||canSwim(x,z,field,RIDE.radius,at.y));};
  const playerAfloat=()=>waterAt(position.x,position.z,world)-grounding.support(position.x,position.z)>RIDE.wadingDepth;
  const outside=()=>!inside()&&mode()==='playing';
  const nearBear=()=>outside()&&Math.hypot(position.x-STABLE.bear.x,position.z-STABLE.bear.z)<3.4&&Math.abs(position.y-world.heightAt(STABLE.bear.x,STABLE.bear.z))<2.8;
  function close(){dialog.hidden=true;setMode('playing');update(0,0);}
  function paint(){
    const [topic,words]=BEAR_RIDING_LESSON[page];$('stable-topic').textContent=topic;$('stable-words').textContent=words;
    $('stable-page').textContent=`${page+1} / ${BEAR_RIDING_LESSON.length}`;
    $('stable-next').textContent=page<2?'Continue':riding.owned?'Thanks, Bear':'Take the reins';
    $('stable-close').textContent=riding.owned?'Close':'Not yet';$('stable-next').focus();
  }
  function interact(){
    if(!nearBear())return false;
    if(mounts.kind!=='foot'||!movement.state().grounded){notice('Dismount beside Bear to speak with him.');return true;}
    page=0;setMode('briefing');dialog.hidden=false;paint();return true;
  }
  $('stable-next').onclick=()=>{
    if(page<2){page++;paint();return;}
    if(!riding.owned){riding.grant(STABLE.horse,STABLE.horse.yaw);riding.teach();onChange();}
    close();notice('Your horse is ready. Stand beside him and press G to mount.');
  };
  $('stable-close').onclick=close;prompt.onclick=()=>nearBear()?interact():toggleMount();
  function setPosition(at,heading,height=grounding.support(at.x,at.z)){position.set(at.x,height,at.z);actor.group.rotation.y=heading;movement.reset(heading);actor.group.position.copy(position);}
  function park(){if(riding.mounted){grounding.remember(position.y);riding.ride(position,actor.group.rotation.y,0);riding.unseat();}}
  function toggleMount({forBattle=false,canDismountAt=()=>true}={}){
    if(!outside()&&!(forBattle&&!inside()&&riding.mounted))return false;
    if(riding.mounted){
      grounding.remember(position.y);
      riding.ride(position,actor.group.rotation.y,0);const result=riding.dismount((x,z)=>footing(x,z)&&canDismountAt(x,z));
      if(!result.ok){notice(horseAfloat(position.x,position.z)?'Ride to a clear bank before dismounting.':result.reason);return true;}
      mounts.reset();setPosition(result.position,result.yaw);onChange();return true;
    }
    if(mounts.kind!=='foot')return false; // Developer mounts retain their own landing behavior.
    if(!riding.owned){notice('Speak with Bear beside the tower to receive your horse.');return true;}
    if(!movement.state().grounded||movement.state().swimming){notice('Stand on dry ground before mounting.');return true;}
    const point=riding.horse,floor=grounding.mountFloor(point.x,point.z);
    if(!floor||!footing(point.x,point.z,RIDE.radius)){notice('Whistle your horse onto clear ground before mounting.');return true;}
    const result=riding.mount(position);if(!result.ok){notice(result.reason);return true;}
    setPosition(result.position,result.yaw,floor.y);grounding.remember(position.y);mounts.select('horse',{speedMultiplier:1});onChange();return true;
  }
  function whistle(){
    if(!outside())return;
    if(mounts.kind!=='foot'){notice('Dismount before calling your horse.');return;}
    const at=riding.horse,result=riding.whistle(position,{allowNear:!!at&&horseAfloat(at.x,at.z)&&!playerAfloat()});notice(result.ok?'You whistle for your horse.':result.reason);onChange();
  }
  function update(dt,time){
    const outdoors=!inside(),point=riding.horse??STABLE.horse;
    root.visible=outdoors;
    if(outdoors){
      if(riding.mounted){grounding.remember(position.y);riding.ride(position,actor.group.rotation.y,movement.state().speed??0);}
      else if(outside()&&dt>0&&riding.called){riding.update(dt,position,horseFooting,{speedAt:(x,z)=>horseAfloat(x,z)?RIDE.swim:RIDE.trot,canHaltAt:(x,z)=>!horseAfloat(x,z)||playerAfloat()});onChange();}
      const at=riding.horse??point;
      const visible=p=>world.readyAt(p.x,p.z)&&Math.hypot(position.x-p.x,position.z-p.z)<230;
      bear.group.visible=bearShadow.visible=visible(STABLE.bear);
      if(bear.group.visible){
        const y=world.heightAt(STABLE.bear.x,STABLE.bear.z);bear.group.position.set(STABLE.bear.x,y,STABLE.bear.z);
        bear.group.rotation.y=Math.hypot(position.x-STABLE.bear.x,position.z-STABLE.bear.z)<10?Math.atan2(position.x-STABLE.bear.x,position.z-STABLE.bear.z):-Math.PI/2;
        bear.animate(time,0,true);bearShadow.position.set(STABLE.bear.x,y+.025,STABLE.bear.z);
      }
      horse.group.visible=horseShadow.visible=!riding.mounted&&visible(at);
      if(horse.group.visible){
        const {swimming,y}=grounding.at(at.x,at.z);grounding.remember(y);
        horse.group.position.set(at.x,y+(swimming?Math.sin(time*2.7)*.035:0),at.z);horse.group.rotation.y=at.yaw;
        horse.animate(time,riding.pace,true,{swimming});horseShadow.visible=!swimming;horseShadow.position.set(at.x,y+.03,at.z);
      }
    }
    const bearNear=nearBear(),horseNear=outside()&&mounts.kind==='foot'&&riding.owned&&riding.distanceTo(position)<=RIDE.reach;
    writeHud(prompt,'hidden',!(bearNear||horseNear));writeHud(prompt,'textContent',bearNear?'F \u00b7 Talk to Bear \u00b7 Stableboy':'G \u00b7 Mount your horse');
  }
  function keydown(event){
    if(dialog.hidden)return false;
    if(event.code==='Escape'){event.preventDefault();close();}
    else if(event.code==='Tab'){event.preventDefault();(document.activeElement===$('stable-next')?$('stable-close'):$('stable-next')).focus();}
    return true;
  }
  return {interact,toggleMount,whistle,park,update,keydown,
    get mounted(){return riding.mounted;},get owned(){return riding.owned;},snapshot:riding.snapshot,
    restore(data){riding.restore(data??empty);grounding.reset();update(0,0);},
    marker:()=>inside()?null:!riding.owned?{...STABLE.bear,id:'bear',label:'Bear \u00b7 Horse ready'}:!riding.mounted?{...riding.horse,id:'horse',label:'Your horse \u00b7 H to call'}:null,
    state:()=>({...riding.snapshot(),mounted:riding.mounted,called:riding.called,bearVisible:root.visible&&bear.group.visible,horseVisible:root.visible&&horse.group.visible}),
    dispose(){prompt.remove();dialog.remove();root.removeFromParent();const geometries=new Set(),materials=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[])materials.add(m);});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();},
  };
}

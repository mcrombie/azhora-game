import {bearAfterWar} from './postwar-conversations.js';
import * as THREE from 'three';
import {createCharacter,createHorse,groundShadow} from '../../content/characters/characters.js';
import {createRiding,RIDE} from '../../gameplay/movement/riding.js';
import {stopAtHorse} from '../../gameplay/movement/horse-contact.js';
import {canStand,waterAt,moveCharacter} from '../../gameplay/movement/locomotion.js';
import {MINORA_STABLE as STABLE,BEAR_RIDING_LESSON,BEAR_RIDING_REMINDER} from '../../content/regions/minora-frontier/minora-stable.js';
import {writeHud} from './hud-write.js';
import {createBearArrival,offeredHorseSpot} from './bear-arrival.js';
import {BEAR_STABLE_ROUND} from '../../content/regions/minora-frontier/guild-stable-layout.js';
import {createStableYard,createBearCarePose} from './stable-yard.js';
import {horseSummonSpot} from './horse-summon.js';
import {createHorseSummonEffect} from './horse-summon-effect.js';

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
  function mountFloor(x,z){const floor=at(x,z);return !floor.swimming&&Math.abs(floor.y-position.y)<=1.5&&canStand(x,z,{...field(floor.maxY),bodyHeight:RIDE.bodyHeight},RIDE.radius,floor.y)?floor:null;}
  return {support,field,at,mountFloor,remember:y=>{if(Number.isFinite(y))knownY=y;},reset:()=>{knownY=null;}};
}

export function createStableHost({scene,world,actor,position,mounts,movement,saved,campaign=()=>null,campaignClock=()=>null,inside,mode,setMode,notice,onChange}){
  const riding=createRiding({onEvent:onChange}),empty=riding.snapshot();
  if(saved)riding.restore(saved);
  const root=new THREE.Group();root.name='Bear and the Minora horse';scene.add(root);
  const bear=createCharacter({role:'villager',look:STABLE.look,skin:STABLE.skin,tunic:STABLE.tunic,armed:false});
  bear.group.scale.setScalar(STABLE.scale);bear.setArmed(false);root.add(bear.group);
  const horse=createHorse({saddled:true});root.add(horse.group);
  const summonEffect=createHorseSummonEffect(root);
  const horseShadow=groundShadow(.7),bearShadow=groundShadow(.16);root.add(horseShadow,bearShadow);
  const yard=createStableYard(root,world),carePose=createBearCarePose(bear);
  const prompt=document.createElement('button');prompt.id='stable-interact';prompt.hidden=true;document.body.append(prompt);
  const dialog=document.createElement('section');dialog.id='stable-lesson';dialog.hidden=true;dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby','stable-speaker');
  dialog.innerHTML='<div class="tower-dialog-card"><span class="eyebrow">MINORA / THE STABLEBOY</span><h2 id="stable-speaker">Bear</h2><h3 id="stable-topic"></h3><p id="stable-words"></p><small id="stable-page"></small><div class="tower-dialog-actions"><button id="stable-next"></button><button id="stable-close">Not yet</button></div></div>';
  document.body.append(dialog);const $=id=>dialog.querySelector('#'+id);let page=0,retryAfter=0;
  const arrival=createBearArrival(STABLE.bear,{routine:BEAR_STABLE_ROUND});let bearTime=0;
  const grounding=createStableGrounding(world,position);
  const footing=(x,z,r=.34)=>world.readyAt(x,z)&&world.canExploreAt(x,z)&&yard.clearAt(x,z,r)&&canStand(x,z,grounding.field(position.y),r,grounding.support(x,z));
  const horseAfloat=(x,z)=>grounding.at(x,z).swimming;
  const outside=()=>!inside()&&mode()==='playing';
  const nearBear=()=>{const p=arrival.position;return outside()&&Math.hypot(position.x-p.x,position.z-p.z)<3.4&&Math.abs(position.y-p.y)<2.8;};
  const nearHorse=()=>outside()&&mounts.kind==='foot'&&riding.owned&&riding.distanceTo(position)<=RIDE.reach;
  const canReceive=()=>outside()&&mounts.kind==='foot'&&movement.state().grounded&&!movement.state().swimming;
  function horseGiftSpot(){
    const field={...grounding.field(position.y),bodyHeight:RIDE.bodyHeight},bearAt=arrival.position;
    return offeredHorseSpot(position,actor.group.rotation.y,p=>{
      if(!world.readyAt(p.x,p.z)||!world.canExploreAt(p.x,p.z)||!yard.clearAt(p.x,p.z,RIDE.radius)||Math.hypot(p.x-bearAt.x,p.z-bearAt.z)<1.6)return false;
      const y=field.heightAt(p.x,p.z);
      if(Math.abs(y-position.y)>.65||!canStand(p.x,p.z,field,RIDE.radius,y))return false;
      // The horse has a long body. Test both ends as well as its circular
      // movement footprint so the gift cannot protrude through a wall/rail.
      for(const offset of [-.65,.85]){
        const x=p.x+Math.sin(p.yaw)*offset,z=p.z+Math.cos(p.yaw)*offset,ground=field.heightAt(x,z);
        if(!world.readyAt(x,z)||!world.canExploreAt(x,z)||Math.abs(ground-y)>.35||!canStand(x,z,field,.42,ground))return false;
      }
      return true;
    });
  }
  function close(){dialog.hidden=true;setMode('playing');update(0,0);}
  function paint(){
    $('stable-close').hidden=page!==-1;
    if(page===-1){$('stable-topic').textContent='Home after the war';$('stable-words').textContent=bearAfterWar(campaign());$('stable-page').textContent='Your horse remains yours.';$('stable-next').textContent='Remind me how to ride';$('stable-close').textContent='Thanks, Bear';$('stable-close').focus();return;}
    const [topic,words]=riding.owned?BEAR_RIDING_REMINDER:BEAR_RIDING_LESSON[0];$('stable-topic').textContent=topic;$('stable-words').textContent=words;
    $('stable-page').textContent=riding.owned?'Ride when you like, or keep exploring on foot.':'The horse is yours whether you ride now or later.';
    $('stable-next').textContent='Continue';$('stable-next').focus();
  }
  function interact(){
    if(!nearBear())return false;
    if(mounts.kind!=='foot'||!movement.state().grounded){notice('Dismount beside Bear to speak with him.');return true;}
    page=riding.owned&&bearAfterWar(campaign())?-1:0;setMode('briefing');dialog.hidden=false;paint();return true;
  }
  function continueLesson(){
    if(dialog.hidden)return;
    if(page===-1){page=0;paint();return;}
    if(!riding.owned){
      const at=horseGiftSpot();
      if(!at){retryAfter=2;close();notice('Bear needs a little room for your horse. Step onto the open path beside the stable.');return;}
      riding.grant(at,at.yaw);riding.teach();grounding.reset();grounding.remember(grounding.support(at.x,at.z));onChange();
      close();notice('Your horse is ready. G mounts; H summons him beside you in blue light.');return;
    }
    close();
  }
  $('stable-next').onclick=continueLesson;
  $('stable-close').onclick=()=>{if(!dialog.hidden&&!$('stable-close').hidden)close();};prompt.onclick=()=>nearHorse()?toggleMount():interact();
  function setPosition(at,heading,height=grounding.support(at.x,at.z)){position.set(at.x,height,at.z);actor.group.rotation.y=heading;movement.reset(heading);actor.group.position.copy(position);}
  function park(){summonEffect.cancel();if(riding.mounted){grounding.remember(position.y);riding.ride(position,actor.group.rotation.y,0);riding.unseat();}}
  function toggleMount({forBattle=false,canDismountAt=()=>true}={}){
    if(!outside()&&!(forBattle&&!inside()&&riding.mounted))return false;
    if(riding.mounted){
      if(!movement.state().grounded){notice('Wait until your horse lands before dismounting.');return true;}
      if(movement.state().onObstacle){notice('Ride off the obstacle onto clear ground before dismounting.');return true;}
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
    if(!outside())return false;
    if(mounts.kind!=='foot'||riding.mounted){notice('Dismount before calling your horse.');return false;}
    if(!riding.owned){notice('You have no horse to call.');return false;}
    if(!movement.state().grounded||movement.state().swimming){notice('Stand on dry ground before summoning your horse.');return false;}
    const point=horseSummonSpot(position,actor.group.rotation.y,world,{clearAt:yard.clearAt,avoid:[arrival.position]});
    if(!point){notice('No clear, dry place for your horse. Move onto an open path and press H again.');return false;}
    const result=riding.summon(point,point.yaw);
    if(!result.ok){notice(result.reason);return false;}
    grounding.reset();grounding.remember(point.y);summonEffect.start(point);update(0,0);
    notice('Your horse appears beside you in blue light. Press G to mount.');return true;
  }
  function constrainTravel(previous,next=position){
    if(!outside())return null;
    if(mounts.kind==='foot'||mounts.kind==='horse'){
      const edge=yard.constrain(previous,next,mounts.kind==='horse'?RIDE.radius:.34);if(edge)return edge;
    }
    if(riding.mounted||mounts.kind!=='foot')return null;
    const at=riding.horse??STABLE.horse;
    // Avoid terrain/support queries while stationary or away from the horse.
    if(Math.hypot(next.x-previous.x,next.z-previous.z)<1e-6||at.x<Math.min(previous.x,next.x)-2||at.x>Math.max(previous.x,next.x)+2||at.z<Math.min(previous.z,next.z)-2||at.z>Math.max(previous.z,next.z)+2)return null;
    // Use the visibility conditions directly: the draw group still represents
    // the previous frame immediately after dismounting or leaving the tower.
    if(!world.readyAt(at.x,at.z)||Math.hypot(next.x-at.x,next.z-at.z)>=230)return null;
    return stopAtHorse(previous,next,{...at,y:grounding.at(at.x,at.z).y});
  }
  function moveBear(p,dx,dz){
    const support=(x,z)=>world.supportAt?.(x,z,{maxY:p.y,stepUp:.35,groundSlope:false})?.height??world.heightAt(x,z);
    const field={...world,heightAt:support},at=riding.horse??STABLE.horse;
    moveCharacter(p,dx,dz,field,.25,{canTraverse:(x,z,nx,nz)=>world.readyAt(nx,nz)&&world.canExploreAt(nx,nz)
      &&Math.abs(support(nx,nz)-p.y)<.4&&!yard.constrain({x,y:p.y,z},{x:nx,y:p.y,z:nz},.25)
      &&!stopAtHorse({x,y:p.y,z},{x:nx,y:p.y,z:nz},{...at,y:grounding.at(at.x,at.z).y},.25)});
    p.y=support(p.x,p.z);
  }
  function clearTalkPath(){
    const at=arrival.position,field=grounding.field(at.y),distance=Math.hypot(position.x-at.x,position.z-at.z),steps=Math.ceil(distance/.3);
    for(let i=1;i<steps;i++){
      const x=at.x+(position.x-at.x)*i/steps,z=at.z+(position.z-at.z)*i/steps;
      if(!world.readyAt(x,z)||!canStand(x,z,field,.2,field.heightAt(x,z)))return false;
    }
    return true;
  }
  function update(dt,time,presentationDt=dt){
    const outdoors=!inside(),point=riding.horse??STABLE.horse;
    root.visible=outdoors;
    if(!outdoors||riding.mounted)summonEffect.cancel();else summonEffect.update(outside()?dt:0);
    if(outdoors){
      if(riding.mounted){grounding.remember(position.y);riding.ride(position,actor.group.rotation.y,movement.state().speed??0);}
      const at=riding.horse??point;
      const visible=p=>world.readyAt(p.x,p.z)&&Math.hypot(position.x-p.x,position.z-p.z)<230;
      yard.update(outside()?dt:0,visible,arrival.work);
      bear.group.visible=bearShadow.visible=visible(arrival.position);
      if(bear.group.visible){
        const before=arrival.position;arrival.ground(world.supportAt?.(before.x,before.z,{maxY:world.heightAt(before.x,before.z),stepUp:.35,groundSlope:false})?.height??world.heightAt(before.x,before.z));
        retryAfter=Math.max(0,retryAfter-dt);
        const greet=arrival.update(outside()?dt:0,position,{offering:!riding.owned&&canReceive()&&retryAfter===0,working:riding.owned,move:moveBear});
        const p=arrival.position;bear.group.position.set(p.x,p.y,p.z);
        if(!dialog.hidden&&mode()==='briefing')arrival.face(position,presentationDt);
        bear.group.rotation.y=arrival.heading;
        // A conversation holds travel and campaign time, but Bear must still
        // finish his step and breathe. Keep this clock monotonic across the
        // zero-time refreshes on close/restore; true pause and blur freeze it.
        if(outside()||(!dialog.hidden&&mode()==='briefing'))bearTime+=Math.max(0,presentationDt);
        bear.animate(bearTime,dialog.hidden?arrival.pace:0,true);carePose(bearTime,dialog.hidden?arrival.work:null,outside()||!dialog.hidden?presentationDt:0);bearShadow.position.set(p.x,p.y+.025,p.z);
        if(greet&&clearTalkPath())interact();
      }
      horse.group.visible=horseShadow.visible=!riding.mounted&&visible(at);
      if(horse.group.visible){
        const {swimming,y}=grounding.at(at.x,at.z);grounding.remember(y);
        horse.group.position.set(at.x,y+(swimming?Math.sin(time*2.7)*.035:0),at.z);horse.group.rotation.y=at.yaw;
        horse.animate(time,riding.pace,true,{swimming});horseShadow.visible=!swimming;horseShadow.position.set(at.x,y+.03,at.z);
      }
    }
    const bearNear=nearBear(),horseNear=nearHorse();
    writeHud(prompt,'hidden',!(bearNear||horseNear));writeHud(prompt,'textContent',horseNear?'G \u00b7 Mount your horse':'F \u00b7 Talk to Bear \u00b7 Stableboy');
  }
  function keydown(event){
    if(dialog.hidden)return false;
    if(event.code==='Escape'){event.preventDefault();if(page===-1)close();else continueLesson();}
    else if(event.code==='Tab'){event.preventDefault();(page===-1&&document.activeElement===$('stable-next')?$('stable-close'):$('stable-next')).focus();}
    return true;
  }
  return {interact,toggleMount,whistle,park,update,keydown,constrainTravel,
    landFromBoat(point,heading){riding.place(point,heading);grounding.reset();update(0,0);onChange();},
    speaker:()=>dialog.hidden?null:arrival.position,
    get mounted(){return riding.mounted;},get owned(){return riding.owned;},snapshot:riding.snapshot,
    restore(data){summonEffect.cancel();riding.restore(data??empty);grounding.reset();arrival.reset();retryAfter=0;dialog.hidden=true;update(0,0);},
    marker:()=>inside()?null:!riding.owned?{...arrival.position,id:'bear',label:'Bear \u00b7 Horse ready'}:!riding.mounted?{...riding.horse,id:'horse',label:'Your horse \u00b7 H to summon'}:null,
    state:()=>({...riding.snapshot(),mounted:riding.mounted,called:riding.called,summoning:summonEffect.active,bear:arrival.position,bearHeading:arrival.heading,bearPace:arrival.pace,bearWork:arrival.work,bearStation:arrival.station,guildHorses:yard.state(),approaching:arrival.approaching,offerOpen:!dialog.hidden&&!riding.owned,bearVisible:root.visible&&bear.group.visible,horseVisible:root.visible&&horse.group.visible}),
    dispose(){summonEffect.dispose();prompt.remove();dialog.remove();root.removeFromParent();const geometries=new Set(),materials=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[])materials.add(m);});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();},
  };
}

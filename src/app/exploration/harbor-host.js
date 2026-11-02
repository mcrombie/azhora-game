import * as THREE from 'three';
import {createCharacter,disposeCharacter,groundShadow} from '../../content/characters/characters.js';
import {canStand} from '../../gameplay/movement/locomotion.js';
import {stopAtSoldier} from './soldier-contact.js';
import {localSight} from './local-sight.js';
import {passageBattle,passageArrival,passageHorseArrival} from '../../content/regions/minora-frontier/lizeem-passages.js';

import {downstreamPorts,passageRoute} from '../../content/regions/minora-frontier/river-passage.js';
import {createPassageBoat} from './passage-boat.js';
import {createRiverTrafficService} from '../../content/regions/minora-frontier/river-traffic-service.js';
const duration=s=>{const whole=Math.ceil(s);return `${Math.floor(whole/60)}:${String(whole%60).padStart(2,'0')}`;};
export function createHarborHost({scene,world,position,mode,setMode,available,battles,land,arrived,stable,notice,aboard,advanceTime,riverTime=()=>0,canSail=()=>true}){
  const traffic=createRiverTrafficService();scene.userData.lizeemRiverTraffic=traffic;
  const root=new THREE.Group();root.name='Lizeem boatkeepers';scene.add(root);
  const prompt=document.createElement('button'),dialog=document.createElement('section'),veil=document.createElement('section');
  prompt.id='harbor-interact';prompt.hidden=true;dialog.id='harbor-dialog';dialog.hidden=true;veil.id='harbor-passage';veil.hidden=true;
  dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby','harbor-name');
  veil.setAttribute('role','status');veil.setAttribute('aria-live','polite');
  dialog.innerHTML='<div class="tower-dialog-card"><span class="eyebrow">LIZEEM / RIVER PASSAGE</span><h2 id="harbor-name">The boatkeeper</h2><p>Welcome aboard. We serve both banks: Nethereum, Caricas, Ovesos and Nesdor. We sail downstream only. Where shall I take you?</p><label class="harbor-guide"><input type="checkbox" checked> Have a guide take me onward to an active battle’s approach.</label><div class="harbor-destinations"></div><p class="tower-dialog-note">Passage is free. The journey takes campaign time, even if you skip the voyage. Your horse can come too. You choose whether to join the fighting.</p><p class="harbor-error" role="alert"></p><div class="tower-dialog-actions"><button data-close>Stay here (Esc)</button></div></div>';
  document.body.append(prompt,dialog,veil);
  const list=dialog.querySelector('.harbor-destinations'),guide=dialog.querySelector('input'),error=dialog.querySelector('.harbor-error');
  const ride=document.createElement('section');ride.id='harbor-ride';ride.hidden=true;ride.innerHTML='<strong></strong><p></p><button>Skip voyage / arrive</button> <button data-pause>Pause voyage (Esc)</button>';document.body.append(ride);
  let voyage=null,boat=null,arriving=false,dockedPort=null,dockedPose=null;
  let current=null,actor=null,shadow=null,speaking=null,busy=false,disposed=false,lastTrip=null,animationTime=0;
  const ports=()=>world.passengerPorts??[];
  const point=p=>({...p,y:world.heightAt(p.x,p.z)});
  const clear=p=>world.readyAt(p.x,p.z)&&world.canExploreAt(p.x,p.z)&&canStand(p.x,p.z,world,.8,world.heightAt(p.x,p.z));
  function updateMoorings(){
    // The scenery boat and the sailing boat represent the same occupied berth.
    // Streamed-in scenery is checked too, so rebuilding a quay cannot duplicate it.
    scene.traverse(o=>{const port=o.userData.mooredPassengerPort;if(port)o.visible=port!==voyage?.from&&port!==dockedPort;});
  }
  function resetTimeline(){
    if(disposed||busy||voyage)return false;
    traffic.reset();boat?.dispose();boat=null;dockedPort=dockedPose=lastTrip=null;animationTime=0;
    updateMoorings();return true;
  }
  function approachable(p,battle){
    const dx=battle.location.x-p.x,dz=battle.location.z-p.z,distance=Math.hypot(dx,dz),walk=distance-(battle.entryRadius??70)+1,steps=Math.ceil(walk/.3);
    let last=world.heightAt(p.x,p.z);
    for(let i=1;i<=steps;i++){
      const at={x:p.x+dx/distance*walk*i/steps,z:p.z+dz/distance*walk*i/steps},height=world.heightAt(at.x,at.z);
      if(!clear(at)||Math.abs(height-last)>.35)return false;last=height;
    }
    return true;
  }
  function release(){if(actor)disposeCharacter(actor);shadow?.removeFromParent();shadow?.material?.dispose();actor=shadow=null;}
  function target(){
    if(mode()!=='playing'||!available()||!current||!actor)return null;
    const p=actor.group.position;
    return Math.hypot(p.x-position.x,p.z-position.z)<4.5&&Math.abs(p.y-position.y)<2&&localSight(world,{x:position.x,y:position.y+1.5,z:position.z},{x:p.x,y:p.y+1.5,z:p.z})?current:null;
  }
  function renderChoices(){
    list.replaceChildren();
    for(const port of downstreamPorts(speaking,ports())){
      const battle=passageBattle(port,battles()),button=document.createElement('button');button.dataset.port=port.id;
      const title=document.createElement('strong'),detail=document.createElement('span');title.textContent='Sail to '+port.name;
      detail.textContent=duration(passageRoute(speaking,port).duration)+' downstream, plus any wait for river traffic'+(battle?' / battle underway':' / town quay');
      button.append(title,detail);button.onclick=()=>sail(port.id);list.append(button);
    }
    if(!list.children.length)list.textContent='This is the last landing on this service. Return upstream by road or on horseback.';
  }
  function close(){if(busy||!speaking)return;dialog.hidden=true;speaking=null;setMode('playing');}
  function interact(){const port=target();if(!port)return false;speaking=port;error.textContent='';dialog.querySelector('h2').textContent=port.name+' boatkeeper';renderChoices();setMode('briefing');dialog.hidden=false;prompt.hidden=true;list.querySelector('button')?.focus();return true;}
  async function sail(id){
    const port=ports().find(p=>p.id===id);let route=port&&speaking?passageRoute(speaking,port):null;
    if(disposed||busy||!speaking||mode()!=='briefing'||!route)return false;
    if(!canSail()){error.textContent='Finish or leave your current encounter before boarding.';return false;}
    busy=true;error.textContent='';const from=speaking.id,guided=guide.checked;
    veil.textContent=`Boarding for ${port.name}...`;veil.hidden=false;dialog.hidden=true;setMode('crossing');
    try{
      // Prepare the actual river corridor once while boarding; loading never
      // spends time. Only visible sailing or its equivalent skip advances it.
      for(let t=0;t<route.duration;t+=12){const p=route.at(t);await world.prepare(p.x,p.z);}
      await world.prepare(port.arrival.x,port.arrival.z);
      if(disposed)return false;
      route=traffic.reserve(route,riverTime());
      if(!route)throw Error('The river traffic cannot safely clear this departure yet. Step ashore and try again shortly.');
      const complete=new Promise(resolve=>{voyage={from,port,route,guided,elapsed:0,skipped:0,resolve};});
      boat?.dispose();boat=createPassageBoat(scene,stable.owned);dockedPort=dockedPose=null;speaking=null;updateMoorings();
      ride.hidden=false;ride.querySelector('strong').textContent='Downriver to '+port.name;
      ride.querySelector('[data-pause]').textContent='Pause voyage (Esc)';
      ride.querySelector('button').disabled=false;
      const p=route.at(0);boat.update(p,0);aboard(p,true);setMode('sailing');veil.hidden=true;
      ride.querySelector('button').focus();updateRide();
      return await complete;
    }catch(e){
      if(disposed)return false;busy=false;veil.hidden=true;setMode('briefing');dialog.hidden=false;error.textContent=e.message;list.querySelector('button')?.focus();return false;
    }
  }
  function updateRide(){
    if(!voyage)return;
    const remaining=Math.max(0,voyage.route.duration-voyage.elapsed);
    const phase=voyage.route.at(voyage.elapsed).phase;
    const action=phase==='waiting'?'Waiting for river traffic':phase==='departing'?'Leaving the berth':phase==='arriving'?'Approaching the quay':phase==='moored'?'Securing the boat':'Sailing downstream';
    ride.querySelector('p').textContent=action+' / '+duration(remaining)+' remaining / Campaign time passes as you sail.';
    ride.querySelector('button').textContent='Skip voyage / advance '+duration(remaining);
  }
  function skip(){
    if(!voyage||arriving||!['sailing','sailing-paused'].includes(mode()))return false;
    if(mode()==='sailing-paused')setMode('sailing');
    const remaining=voyage.route.duration-voyage.elapsed;
    advanceTime(remaining);voyage.skipped+=remaining;voyage.elapsed=voyage.route.duration;
    const p=voyage.route.at(voyage.elapsed);boat.update(p,voyage.elapsed);aboard(p,false);finish();return true;
  }
  async function finish(){
    if(!voyage||arriving)return;arriving=true;ride.querySelector('button').disabled=true;
    const v=voyage,port=v.port;setMode('crossing');veil.hidden=false;veil.textContent='Landing at '+port.name+'...';
    try{
      // Resolve the guide after travel: a battle may have ended en route.
      const battle=v.guided?passageBattle(port,battles()):null;
      if(battle)await world.prepare(battle.location.x,battle.location.z);
      let at=passageArrival(port,{battle,battles:battles(),clear,approachable});
      if(!at)at=passageArrival(port,{battles:battles(),clear});
      if(!at)throw Error('The landing is obstructed.');
      const horse=stable.owned?passageHorseArrival(at,{clear,heightAt:(x,z)=>world.heightAt(x,z)}):null;
      if(stable.owned&&!horse)throw Error('There is no clear place to unload the horse.');
      if(disposed)return;
      land(at,at.heading);if(horse)stable.landFromBoat(horse,at.heading);
      lastTrip={from:v.from,to:port.id,seconds:v.elapsed,skippedSeconds:v.skipped,clearanceSeconds:v.route.clearanceSeconds??0,guided:!!at.battleId,battleId:at.battleId,arrival:{...at}};
      dockedPose={...v.route.at(v.route.duration),phase:'moored',speed:0,rowing:false};dockedPort=port.id;
      boat.dock();voyage=null;busy=false;arriving=false;ride.hidden=true;veil.hidden=true;updateMoorings();
      setMode('playing');arrived(port,at);
      notice(at.battleId?`${port.name}: your guide has brought you to the gold battlefield boundary. Approach to review the fight.`:`${port.name} quay. Return upstream by road or horse.`);
      v.resolve(true);
    }catch(e){
      // Keep the traveler safely aboard and permit a landing retry without
      // charging the voyage again; never teleport back upstream or into water.
      arriving=false;veil.hidden=true;setMode('sailing');ride.querySelector('p').textContent=e.message+' Retry landing below.';
      ride.querySelector('button').disabled=false;ride.querySelector('button').textContent='Retry landing';
    }
  }
  function update(dt=0){
    if(voyage){
      if(mode()==='sailing'&&!arriving&&voyage.elapsed<voyage.route.duration){
        const delta=Math.min(Math.max(0,dt),voyage.route.duration-voyage.elapsed);
        advanceTime(delta);voyage.elapsed+=delta;
        const p=voyage.route.at(voyage.elapsed);boat.update(p,voyage.elapsed);aboard(p,false);updateRide();
        if(voyage.elapsed>=voyage.route.duration)finish();
      }
      prompt.hidden=true;return;
    }
    if(['playing','briefing'].includes(mode()))animationTime+=dt;
    if(boat&&dockedPose){boat.root.visible=available()&&world.readyAt(dockedPose.x,dockedPose.z);if(boat.root.visible)boat.update(dockedPose,animationTime);}
    root.visible=available();
    const port=root.visible?ports().filter(p=>world.readyAt(p.keeper.x,p.keeper.z)).sort((a,b)=>Math.hypot(a.keeper.x-position.x,a.keeper.z-position.z)-Math.hypot(b.keeper.x-position.x,b.keeper.z-position.z))[0]:null;
    const near=port&&Math.hypot(port.keeper.x-position.x,port.keeper.z-position.z)<95?port:null;
    if(near?.id!==current?.id){release();current=near;
      if(current){actor=createCharacter({role:'harbormaster',hat:false,armed:false,tunic:0x356560,look:{hair:0x594635,beard:true}});actor.setArmed(false);root.add(actor.group);shadow=groundShadow(.23);root.add(shadow);}
      updateMoorings();
    }
    if(actor){const p=point(current.keeper);actor.group.position.set(p.x,p.y,p.z);shadow.position.set(p.x,p.y+.025,p.z);
      if(speaking||Math.hypot(p.x-position.x,p.z-position.z)<10)actor.group.rotation.y=Math.atan2(position.x-p.x,position.z-p.z);
      actor.animate(animationTime,0,true);
    }
    const p=target();prompt.hidden=!p;if(p)prompt.textContent=`F / Talk to the boatkeeper · ${p.name}`;
  }
  ride.querySelector('button').onclick=skip;
  const pauseRide=()=>{if(!voyage||arriving)return;const paused=mode()==='sailing';setMode(paused?'sailing-paused':'sailing');ride.querySelector('[data-pause]').textContent=paused?'Resume voyage (Esc)':'Pause voyage (Esc)';};
  ride.querySelector('[data-pause]').onclick=pauseRide;
  prompt.onclick=interact;dialog.querySelector('[data-close]').onclick=close;guide.onchange=renderChoices;
  return {interact,sail,skip,update,close,resetTimeline,speaker:()=>speaking&&actor?actor.group.position:null,
    constrain(previous){if(mode()!=='playing'||!actor||!root.visible)return null;return stopAtSoldier(previous,position,[{...point(current.keeper),radius:.4}],stable.mounted?1.2:.65);},
    keydown(e){if(voyage){if(e.code==='Escape'){e.preventDefault();pauseRide();}else if(e.code==='Tab'){e.preventDefault();const buttons=[...ride.querySelectorAll('button')];buttons[(buttons.indexOf(document.activeElement)+1)%buttons.length].focus();}else if(!['Enter','Space'].includes(e.code))e.preventDefault();return true;}if(!speaking&&!busy)return false;if(e.code==='Escape'){e.preventDefault();close();}else if(e.code==='Tab'){e.preventDefault();const buttons=[...dialog.querySelectorAll('button,input')],i=buttons.indexOf(document.activeElement);buttons[(i+(e.shiftKey?-1:1)+buttons.length)%buttons.length].focus();}else if(!['Enter','Space'].includes(e.code))e.preventDefault();return true;},
    state:()=>({port:current?.id??null,speaking:speaking?.id??null,busy,lastTrip,dockedPort,boat:boat?.state?.()??null,traffic:traffic.state(riverTime()),voyage:voyage?{from:voyage.from,to:voyage.port.id,elapsed: voyage.elapsed,duration:voyage.route.duration,clearanceSeconds:voyage.route.clearanceSeconds??0,position:voyage.route.at(voyage.elapsed)}:null,keeper:actor?{x:actor.group.position.x,y:actor.group.position.y,z:actor.group.position.z}:null}),
    dispose(){disposed=true;voyage?.resolve(false);boat?.dispose();voyage=null;dockedPort=null;updateMoorings();if(scene.userData.lizeemRiverTraffic===traffic)delete scene.userData.lizeemRiverTraffic;ride.remove();release();root.removeFromParent();prompt.remove();dialog.remove();veil.remove();}
  };
}

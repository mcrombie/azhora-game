import * as THREE from 'three';
import {createCharacter,createGoblin} from '../../characters/characters.js';
import {createElvenRanger} from '../ibenwood/ibenwood-defense-view.js';
import {createSevronState} from './sevron-state.js';
import {buildSevronInterior,createSevronWalk,SEVRON_STOPS} from './sevron-interiors.js';
import {SEVRON_ENTRANCES} from '../west-oremindi/west-oremindi-world.js';
const gap=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export const WEST_OREMINDI_ENCOUNTERS=Object.freeze([
 {id:'west-oremindi-pass-goblins',center:{x:-3480,z:-915},checkpoint:{x:-3510,z:-914},retreatAxis:'x',retreatSign:-1,retreatLine:-3525,level:7,
 enemies:[{id:'oremindi-pass-scout-a',kind:'goblin',name:'Mountain goblin',x:-3477,z:-916,hp:90,entry:.2},{id:'oremindi-pass-scout-b',kind:'goblin',name:'Mountain goblin',x:-3473,z:-914,hp:90,entry:1.1}]},
 {id:'west-oremindi-ruin-goblins',center:{x:-3690,z:-1370},checkpoint:{x:-3706,z:-1344},retreatAxis:'z',retreatLine:-1328,level:7,
 enemies:[{id:'oremindi-ruin-scout-a',kind:'goblin',name:'Mountain goblin',x:-3688,z:-1370,hp:95,entry:.2},{id:'oremindi-ruin-scout-b',kind:'goblin',name:'Mountain goblin',x:-3684,z:-1373,hp:95,entry:.8}]},
]);
const stories={
 watcher:['Stop there. If you came to take from the living, turn around. If you came without violence, you may walk our upper galleries. Keep to the railings. The sea owns the streets beneath them.'],
 keeper:['This is Sevron. We built our homes in a city that was already ancient when our forebears found it. Our settlement is small; most of those old doors remain closed.',
 'The greatest dwarf kingdom once lay within this mountain. After years of siege, human armies brought the sea into its depths. Its king and the people trapped inside were lost. We came centuries later.',
 'The upper galleries are dry. The terraces receive daylight; the spring above us brings fresh water. Salt water still fills the lower city. Do not confuse those two waters.'],
 resident:['We live among the old stones without pretending they were made for us. A repaired stair, a garden in a shaft of sunlight, a little warmth behind a screen: that is home.'],
 gardener:['These beds have soil and daylight. The channel beside them carries fresh spring water down from the upper rock. Nothing here grows by drinking the sea.'],
};
export function createSevronHost({scene,world,player,openDialogue,closeDialogue,toast,save=()=>{},transition=()=>{},available=()=>true,reward=()=>{},onThreat=()=>false,combatState=()=>null}){
 const model=createSevronState(),walk=createSevronWalk({secretOpen:()=>model.state().secretOpen});let interior=null,active=false,clock=0,lastEntrance=SEVRON_ENTRANCES[0],cooldown=0;
 const people=[],scouts=[];
 const place=(actor,p)=>actor.group.position.set(p.x,p.y,p.z);
 function prepare(){if(interior)return;interior=buildSevronInterior(scene,{walk});
  for(const stop of SEVRON_STOPS){const actor=stop.guard?createElvenRanger(1):createCharacter({role:'villager',hat:false,armed:false,tunic:stop.id==='keeper'?0x737b65:0x566c59,skin:0xc9af87,look:{hair:0x493c2c,hairStyle:'long',headgear:'bare',facialHair:'clean',elven:true}});actor.group.scale.set(.92,1.09,.92);place(actor,walk.toWorld(stop));interior.group.add(actor.group);people.push({...stop,actor});}
  refresh();
 }
 function refresh(){if(interior){interior.group.visible=active;interior.setSecretOpen(model.state().secretOpen);interior.setTaken(model.state().treasureTaken);}}
 const outside=e=>({x:e.x,z:e.z+4,y:world.heightAt(e.x,e.z+4)});
 function leave({relocate=true}={}){if(!active)return false;active=false;if(relocate){transition();place(player,outside(lastEntrance));}refresh();return true;}
 function enter(id='hidden-gallery'){const e=SEVRON_ENTRANCES.find(e=>e.id===id);if(!e||!available())return false;prepare();lastEntrance=e;transition();active=true;model.discoverEntrance();if(id==='inspection-passage')model.openSecret();place(player,walk.toWorld(e.local));refresh();save();toast('Old masonry encloses a deep saltwater hall. Repaired rails lead onward above the drowned streets.','THE OLD GALLERIES');return true;}
 function nearby(){const p=player.group.position;if(active){
   if(gap(p,walk.toWorld(lastEntrance.local))<2.1)return {kind:'exit',label:'Return to the mountains'};
   if(gap(p,walk.toWorld({x:38,z:10}))<3||gap(p,walk.toWorld({x:42,z:10}))<3)return {kind:'secret',label:model.state().secretOpen?'Examine the opened inspection passage':'Inspect the mismatched masonry'};
   if(gap(p,walk.toWorld({x:56,z:10}))<2.8)return {kind:'treasure',label:model.state().treasureTaken?'Examine the empty ancient store':'Recover the coins in the old store'};
   const person=people.find(n=>gap(n.actor.group.position,p)<2.7);return person?{kind:'person',person,label:`Speak with ${person.name.toLowerCase()}`}:null;
  }
  if(Math.abs(p.y-world.heightAt(p.x,p.z))>3)return null;
  const e=SEVRON_ENTRANCES.find(e=>gap(p,{x:e.x,z:e.z+2})<4.2);return e?{kind:'entrance',entrance:e,label:`Explore ${e.name.toLowerCase()}`}:null;
 }
 function interact(){const n=nearby();if(!n)return false;
  if(n.kind==='entrance'){if(!enter(n.entrance.id))toast('Approach on foot and at peace.','THE MOUNTAIN PASSAGE');return true;}
  if(n.kind==='exit'){leave();return true;}
  if(n.kind==='secret'){model.openSecret();refresh();save();toast('A repaired pivot shifts the old stone panel. An inspection corridor opens into a long-abandoned store.','HIDDEN ROOM');return true;}
  if(n.kind==='treasure'){const got=model.takeTreasure();if(got)reward(got);refresh();save();toast(got?'You recover 36 copper from the abandoned store. The tools and inscriptions remain in place.':'Only the old tools and inscriptions remain.','ANCIENT STORE');return true;}
  if(n.kind==='person'){openDialogue(n.person,stories[n.person.id],null,'Return to the galleries',{noWayfinding:true});return true;}return false;
 }
 function frame(dt){clock+=dt;cooldown=Math.max(0,cooldown-dt);const p=player.group.position;
  if(active&&(walk.floorAt(p.x,p.z)===null||Math.abs(p.y-(walk.floorAt(p.x,p.z)??0))>7))leave({relocate:false});
  if(active){if(p.z<walk.origin.z-51&&model.discoverCity()){save();toast('A living elven settlement occupies the upper galleries. You have found Sevron.','SEVRON');}for(const person of people)person.actor.animate(clock,0,true);}
  const combat=combatState();if(combat?.phase==='won'&&model.defeat(combat.encounterId)){save();cooldown=10;}
  for(const spec of WEST_OREMINDI_ENCOUNTERS){const done=model.state().defeatedThreats.includes(spec.id),near=!active&&gap(p,spec.center)<110;
   for(const [i,e] of spec.enemies.entries()){let scout=scouts.find(s=>s.id===e.id);if(!scout&&near&&!done){const actor=createGoblin({variant:i});scene.add(actor.group);scout={id:e.id,actor};scouts.push(scout);}if(scout){scout.actor.group.visible=near&&!done&&combat?.encounterId!==spec.id;if(scout.actor.group.visible){place(scout.actor,{...e,y:world.heightAt(e.x,e.z)});scout.actor.animate(clock,0,true);}}}
   if(near&&!done&&cooldown===0&&available()&&gap(p,spec.center)<12&&Math.abs(p.y-world.heightAt(p.x,p.z))<3){if(onThreat(spec)){cooldown=18;toast('Mountain goblins defend the broken traverse. Retreat along the path if you are not ready.','WEST OREMINDI');}}
  }
 }
 return {model,walk,people,enter,leave,nearby,interact,frame,
 get active(){return active;},get current(){return active?'sevron':null;},get interior(){return interior;},get safeEntrance(){return active?outside(lastEntrance):null;},
 floorAt:(x,z)=>active?walk.floorAt(x,z):null,camera:(...args)=>active?walk.camera(...args):null,
 move(p,dx,dz){if(!active)return null;const n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.18));for(let i=0;i<n;i++){
 const step=(sx,sz)=>{const next={x:p.x,y:p.y,z:p.z};walk.move(next,sx,sz);if(people.some(person=>Math.abs(person.actor.group.position.y-next.y)<2&&gap(next,person.actor.group.position)<.68&&gap(next,person.actor.group.position)<=gap(p,person.actor.group.position)))return false;Object.assign(p,{x:next.x,y:next.y,z:next.z});return true;};
 if(!step(dx/n,dz/n)){step(dx/n,0);step(0,dz/n);}}
 return p;},
 bodies:()=>active?people.map(n=>({id:`sevron-${n.id}`,x:n.actor.group.position.x,z:n.actor.group.position.z,r:.35,minY:n.actor.group.position.y,maxY:n.actor.group.position.y+2})):[],
 snapshot:()=>model.snapshot(),restore(data){const probe=createSevronState();if(!probe.restore(data))return false;leave();model.restore(data);refresh();return true;},
 };
}

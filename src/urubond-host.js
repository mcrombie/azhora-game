import {URUBOND} from './urubond-world.js';
import {buildUrubondInterior} from './urubond-interiors.js';
const gap=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
/** No NPCs, rewards or quest flags. A physical cleft is the only entry. */
export function createUrubondHost({scene,world,player,available=()=>true,transition=()=>{},toast=()=>{}}){
 let interior=null,active=false;
 const outside=()=>{const p=URUBOND.entrance;return {x:p.x,z:p.z+2,y:world.heightAt(p.x,p.z+2)};};
 function leave({relocate=true}={}){if(!active)return false;active=false;interior.group.visible=false;if(relocate){transition();const p=outside();player.group.position.set(p.x,p.y,p.z);}return true;}
 function nearby(){const p=player.group.position;
  if(active)return gap(p,interior.walk.exit)<2.5?{kind:'exit',label:'Climb the concealed passage to the crater'}:null;
  const e=outside();return gap(p,e)<3.3&&Math.abs(p.y-e.y)<2.8?{kind:'entrance',label:'Examine the narrow basalt cleft'}:null;
 }
 function interact(){const n=nearby();if(!n)return false;if(n.kind==='exit')return leave();if(!available())return false;
  if(!interior)interior=buildUrubondInterior(scene);
  transition();active=true;interior.group.visible=true;const p=interior.walk.spawn;player.group.position.set(p.x,p.y,p.z);interior.update(p);
  toast('Behind the basalt, a long concealed stair descends into silent halls beneath the island.','URUBOND');return true;
 }
 return {nearby,interact,leave,get active(){return active;},get interior(){return interior;},get safeEntrance(){return active?outside():null;},
  floorAt:(x,z)=>active?interior.walk.floorAt(x,z):null,
  move:(p,dx,dz)=>active?interior.walk.move(p,dx,dz):null,
  camera:(...args)=>active?interior.walk.camera(...args):null,
  frame(){if(!active)return;const p=player.group.position,floor=interior.walk.floorAt(p.x,p.z);if(floor===null||Math.abs(p.y-floor)>7){leave({relocate:false});return;}interior.update(p);},
 };
}

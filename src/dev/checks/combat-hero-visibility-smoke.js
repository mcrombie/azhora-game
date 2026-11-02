import * as THREE from 'three';
import {prepareWarExterior} from './tower-smoke.js';
import {createAdventureWar} from '../../experiments/day-night/opening-war.js';

const frames=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
function heroView(a){
  const root=a.testHero.group;root.updateWorldMatrix(true,true);
  const bounds=new THREE.Box3().setFromObject(root),up=new THREE.Vector3(0,1,0).applyQuaternion(root.quaternion);
  const ground=a.testWorld.renderedGroundHeight?.(root.position.x,root.position.z)??a.testWorld.heightAt(root.position.x,root.position.z);
  if(!root.visible||up.y<.9999)throw Error('Teresod is hidden or his root is tilted');
  if(bounds.max.y-ground<1.7||bounds.min.y<ground-.25)throw Error('Teresod is not standing above the ground: '+JSON.stringify({ground,min:bounds.min.y,max:bounds.max.y}));
  return {hero:a.state().position,visible:root.visible,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},ground,up:up.toArray()};
}
async function setup(a,{mounted=false}={}){
  window.dispatchEvent(new Event('focus'));await prepareWarExterior(a);
  const w=createAdventureWar();w.advance(3);const b=w.snapshot().engagements.find(b=>b.region==='caricas');
  a.war.restore(null);await a.visit(b.location);
  if(mounted){if(!a.selectMount('horse').ok)throw Error('Could not mount before battle');a.step(.04,0);}
  a.reveal(true);a.war.restore({...w.checkpoint(),campaignSide:'west'});a.war.pause();a.step(.04,0);
  await a.war.help('west','intercept');
  if(a.state().mode!=='skirmish')throw Error('First battle did not start');
}
export async function opening(a){
  await setup(a);
  const immediate=heroView(a);
  const s=a.war.state().encounter.encounter;
  a.look({yaw:Math.atan2(s.hero.x-s.guards[0].x,s.hero.z-s.guards[0].z),pitch:.35,distance:9});
  for(let i=0;i<20;i++)a.step(1/60);
  window.dispatchEvent(new Event('blur'));await frames();
  return {immediate,settled:heroView(a)};
}
export async function mounted(a){
  a.war.withdraw();await setup(a,{mounted:true});
  const immediate=heroView(a);
  const s=a.war.state().encounter.encounter;
  a.look({yaw:Math.atan2(s.hero.x-s.guards[0].x,s.hero.z-s.guards[0].z),pitch:.35,distance:9});
  for(let i=0;i<30;i++)a.step(1/60,0);
  window.dispatchEvent(new Event('blur'));await frames();return {immediate,settled:heroView(a)};
}
export async function reentry(a){
  window.dispatchEvent(new Event('focus'));a.war.withdraw();a.step(.04,0);
  const withdrawn=heroView(a);
  if(a.state().mode==='skirmish')throw Error('Withdrawal did not leave combat');
  if(!a.war.join().ok)throw Error('Could not reopen the battlefield invitation');
  await a.war.help('west','intercept');
  if(a.state().mode!=='skirmish')throw Error('Could not rejoin first battle');
  const reentered=heroView(a);
  for(let i=0;i<20;i++)a.step(1/60,0);
  window.dispatchEvent(new Event('blur'));await frames();
  return {withdrawn,reentered,settled:heroView(a)};
}

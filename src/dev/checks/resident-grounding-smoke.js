import * as THREE from 'three';
import {prepareWarExterior} from './tower-smoke.js';
import {LIZEEM_RESIDENTS} from '../../content/regions/minora-frontier/lizeem-residents.js';

const frame=()=>new Promise(requestAnimationFrame);
const tick=(a,n=20)=>{for(let i=0;i<n;i++)a.step(.04);};
const people=a=>a.tower.state().residents.people;
const checks=[];
const assert=(ok,message)=>{if(!ok)throw Error(message);checks.push(message);};
const key=code=>{for(const type of ['keydown','keyup'])document.dispatchEvent(new KeyboardEvent(type,{code,bubbles:true,cancelable:true}));};
function sceneOf(a){let root=a.testHero.group;while(root.parent)root=root.parent;return root;}
function measure(a,id){
  const person=people(a).find(p=>p.id===id);if(!person)throw Error('Resident missing: '+id);
  const [x,y,z]=person.position,world=a.testWorld,scene=sceneOf(a);
  scene.updateMatrixWorld(true);
  const terrain=scene.getObjectByName('The ground of Azhora');
  const hits=new THREE.Raycaster(new THREE.Vector3(x,10000,z),new THREE.Vector3(0,-1,0)).intersectObject(terrain,true)
    .filter(hit=>{for(let o=hit.object;o;o=o.parent)if(!o.visible)return false;return true;});
  const meshGround=hits[0]?.point.y??null,rendered=world.renderedGroundHeight(x,z),height=world.heightAt(x,z),support=world.supportAt?.(x,z,{maxY:y,stepUp:.45,groundSlope:false});
  const actor=scene.getObjectByName(person.name+' / '+person.occupation),bounds=actor?new THREE.Box3().setFromObject(actor):null;
  return {id,position:person.position,visible:person.visible,walking:person.walking,phase:person.phase,height,rendered,meshGround,
    groundMesh:hits[0]?.object.name??null,support,feet:bounds?.min.y??null,rootAboveRendered:y-rendered,rootAboveMesh:meshGround===null?null:y-meshGround,
    feetAboveMesh:bounds&&meshGround!==null?bounds.min.y-meshGround:null};
}
export async function survey(a){
  await prepareWarExterior(a);window.dispatchEvent(new Event('focus'));a.war.pause();
  const rows=[];
  for(const def of LIZEEM_RESIDENTS.filter(p=>p.region==='caricas')){
    await a.visit({x:def.x+5,z:def.z+5});tick(a);const row=measure(a,def.id);rows.push(row);
    console.log('EXPLORATION_GROUNDING '+JSON.stringify(row));
  }
  return {rows,checks:['Measured all Caricas residents against displayed terrain triangles'],state:a.tower.state().residents};
}
export async function view(a,id){
  const def=LIZEEM_RESIDENTS.find(p=>p.id===id);await a.visit({x:def.x-4,z:def.z-5});tick(a);
  const person=people(a).find(p=>p.id===id),[x,,z]=person.position;
  a.testWorld.setResidentTalking(id,{x:x-3,z:z-3});await a.visit({x:x-3,z:z-3});tick(a,5);
  a.look({yaw:-Math.PI*3/4,pitch:.17,distance:7});await frame();await frame();
  return {row:measure(a,id),errors:a.state().frameErrors};
}
export async function verify(a,rows){
  for(const row of rows){
    assert(Math.abs(row.rootAboveMesh)<.09,row.id+' stands on the visible ground');
    assert(Math.abs(row.rendered-row.meshGround)<.001,row.id+' rendered-height sampler matches real terrain mesh');
  }
  a.testWorld.setResidentTalking(null);await a.visit({x:-2105,z:307});tick(a);
  for(const id of ['egeria','consus','ilmarinen'])assert(people(a).find(p=>p.id===id)?.shelterValid,id+' retains a safe shelter route');
  const samples=[];
  for(let i=0;i<450;i++){a.step(.04);if(i%30===0)samples.push(measure(a,'ilmarinen'));}
  assert(Math.max(...samples.map(p=>p.position[2]))-Math.min(...samples.map(p=>p.position[2]))>.8,'Toolsmith walks his full local routine');
  assert(samples.every(p=>Math.abs(p.rootAboveMesh)<.09),'Toolsmith remains grounded throughout his walking routine');
  assert(a.tower.state().residents.constructed<=12,'Resident cache remains within the twelve-rig budget');
  const movement=[];
  for(const mounted of [false,true]){
    a.selectMount('foot');await a.visit({x:-2103,z:309});a.look({yaw:Math.PI,pitch:.22,distance:8});tick(a,5);
    if(mounted){a.stable.restore({owned:true,taught:true,horse:{x:-2103,z:309,yaw:0},version:1});a.stable.toggleMount();assert(a.stable.mounted,'Horse mounts beside the workshop');}
    const before=a.state().position,trace=[];a.hold('KeyW',true);
    try{for(let i=0;i<(mounted?16:30);i++){a.step(.04);const [x,y,z]=a.state().position;trace.push({x,y,z,ground:a.testWorld.renderedGroundHeight(x,z)});}}
    finally{a.hold('KeyW',false);}
    const after=a.state().position;
    assert(Math.hypot(after[0]-before[0],after[2]-before[2])>1,(mounted?'Rider':'Walker')+' can pass the workshop');
    assert(trace.every(p=>Math.abs(p.y-p.ground)<.15),(mounted?'Rider':'Walker')+' follows the visible workshop slope');
    movement.push({mounted,trace});
  }
  a.selectMount('foot');assert(Math.abs(a.testWorld.heightAt(-2210,135)-21.3)<.001,'White Bridge retains its raised walking deck');
  await view(a,'ilmarinen');let p=people(a).find(p=>p.id==='ilmarinen');const [x,,z]=p.position;
  await a.visit({x:x-2,z:z-2});a.look({yaw:-Math.PI*3/4,pitch:.17,distance:7});tick(a,5);key('KeyF');
  assert(a.residentHost.state().speaking==='ilmarinen','F opens conversation with the grounded toolsmith');
  const held=people(a).find(p=>p.id==='ilmarinen').position;tick(a,40);
  assert(JSON.stringify(people(a).find(p=>p.id==='ilmarinen').position)===JSON.stringify(held),'Toolsmith stays still while speaking');
  key('Escape');a.testWorld.setResidentTalking(null);assert(!a.state().frameErrors.length,'No rendering errors during grounding and interaction checks');
  await frame();return {checks,samples,movement};
}

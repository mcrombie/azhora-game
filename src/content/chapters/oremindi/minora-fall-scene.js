import * as THREE from 'three';
import {createSceneryBuilder} from '../../../world/scenery/scenery-builder.js';
import {menoraDeckHeight} from '../../regions/minora-frontier/menora-city.js';
import {menoraWallDatum} from '../../regions/minora-frontier/menora-river-walls.js';
import {createCourierPigeon} from '../../regions/minora-frontier/courier-pigeon.js';
import {MINORA_FALL_LAYOUT as L,MINORA_FALL_DURATION,minoraMarchPoint} from './minora-fall-layout.js';
import {createMinoraFallArmy} from './minora-fall-army.js';
import {createBloodPrinceStandard} from './minora-fall-standard.js';
export {MINORA_FALL_LAYOUT,MINORA_FALL_DURATION} from './minora-fall-layout.js';

const clamp=(v,min=0,max=1)=>Math.max(min,Math.min(max,v));
const smooth=t=>{t=clamp(t);return t*t*(3-2*t);};
const captions=t=>L.shots.find(s=>t<s.end)??L.shots.at(-1);

/** A bounded historical vignette and its persistent occupation tableau.
 * Lazy until Minora is ready; no world preparation, gameplay commands, clock
 * mutation, save writes, or hero teleportation. The host owns the camera/UI.
 * update receives active elapsed seconds. Holds never build or advance it.
 * Construct with phase:'occupied' to restore the aftermath without replaying.
 */
export function createMinoraFallScene({scene,world,phase='assault',elapsed=0,onComplete=()=>{},councilRoot=null}={}){
 if(!scene?.add||typeof world?.heightAt!=='function')throw new TypeError('Minora fall needs a scene and world.heightAt');
 const group=new THREE.Group();group.name='Chapter 3 / Minora’s fall';scene.add(group);
 let time=phase==='occupied'?MINORA_FALL_DURATION:clamp(Number(elapsed)||0,0,MINORA_FALL_DURATION),visualTime=time;
 let built=false,disposed=false,completed=phase==='occupied',army,bird,heads,perch,standards=[],fieldStandards=[],props=[],wisp;
 const hidden=new Map();let standardsConcealed=false;
 const ground=(x,z)=>Math.max(world.heightAt(x,z),menoraDeckHeight(x,z)??-Infinity);
 const ready=()=>!world.readyAt||[L.gate,L.perch,...L.march].every(p=>world.readyAt(p.x,p.z));
 function conceal(){
  if(standardsConcealed)return;
  // Minora is fully loaded before the tableau builds. Retire its old
  // standards once; occupation must not scan the entire world every frame.
  standardsConcealed=true;
  const hide=node=>{if(node&&!hidden.has(node)){hidden.set(node,node.visible);node.visible=false;}};
  if(councilRoot)hide(councilRoot);
  // Explicit feature roots only. Never hide city walls, decorations, actors,
  // other cities, or a broad parent just because it contains a banner.
  scene.traverse(node=>{if(['Minora Council standards','Minora legacy gate flags'].includes(node.name))hide(node);});
 }
 function builderProp(name,build){const holder=new THREE.Group();holder.name=name;group.add(holder);const b=createSceneryBuilder(name);build(b);
  const mesh=b.finish(holder);if(mesh){mesh.material=mesh.material.clone();props.push(mesh);}return holder;}
 function build(){
  if(built||disposed)return;built=true;army=createMinoraFallArmy(group,56);
  for(const gate of L.gates){
   const datum=menoraWallDatum(world.heightAt,gate.x,gate.z)+22;
   for(const side of [-1,0,1]){const standard=createBloodPrinceStandard(),x=side*4.8;
    standard.root.position.set(gate.x+x*Math.cos(gate.yaw),datum+(side===0?5:1.6),gate.z-x*Math.sin(gate.yaw));
    standard.root.rotation.y=gate.yaw;standard.root.scale.setScalar(1.5);group.add(standard.root);standards.push(standard);}
  }
  for(let i=0;i<3;i++){const standard=createBloodPrinceStandard();standard.root.scale.setScalar(.65);group.add(standard.root);fieldStandards.push(standard);}
  heads=builderProp('Muster road / occupation stakes',b=>{
   for(const [i,p]of L.heads.entries()){
    const y=ground(p.x,p.z),h=3.1+(i%2)*.3;
    b.stake('#524638',p.x,y-.2,p.z,.12,h+.2,.1,.22);
    b.frame(p.x,y+h-.09,p.z,i%2?-.6:.4,()=>{
     // Small, still, stylized trophies rather than an anatomical gore effect.
     b.rock(i%2?'#998575':'#b1a08c',0,0,0,.18,.23,.19);
     b.rock(i%2?'#4b433b':'#665340',0,.13,-.04,.19,.15,.18);
     b.box('#3d3633',0,.015,.17,.24,.035,.025);b.rock('#ad9882',0,-.04,.19,.045,.065,.045);
     b.box('#6e3c3c',0,-.20,0,.11,.055,.09);
    });
   }
  });
  perch=builderProp('Wizard courier / roadside perch',b=>{
   const p=L.perch,y=ground(p.x,p.z);b.stake('#79664b',p.x,y,p.z,.15,p.height-.18,0,.18);
   b.beam('#a38b64',[p.x-.38,y+p.height,p.z],[p.x+.38,y+p.height,p.z],.14);
   b.box('#50657d',p.x,y+p.height-.4,p.z+.09,.28,.3,.04);
   b.box('#c3c5ad',p.x,y+p.height-.4,p.z+.12,.035,.2,.025);
  });
  bird=createCourierPigeon(group);bird.root.name='Wizard Guild / speaking messenger';bird.root.scale.setScalar(1.55);
  const wispGeometry=new THREE.IcosahedronGeometry(.025,0),wispMaterial=new THREE.MeshBasicMaterial({color:'#8fb9d1',transparent:true,opacity:.65,depthWrite:false});
  wisp=new THREE.InstancedMesh(wispGeometry,wispMaterial,5);wisp.name='Courier / pale blue motes';wisp.frustumCulled=false;group.add(wisp);
  draw();
 }
 function draw(){
  if(!built)return;
  const march=time<12?95+time*3:time<28?131:131+(time-28)*2.35;
  for(let i=0;i<48;i++){
   const row=Math.floor(i/3),lane=i%3-1,p=minoraMarchPoint(march-row*3.0,lane*1.45);
   const clashing=i<3&&time>=12&&time<28;
   if(clashing){p.x=-2441.5;p.z=148+lane*2;p.heading=Math.PI/2;}
   const beat=(time-12+i*.65)%3.4,strike=clashing?smooth(beat/.8)*(1-smooth((beat-1.2)/.65)):0;
   army.set(i,{...p,y:ground(p.x,p.z),time:visualTime,walk:time>=12&&time<28?0:time<58?1:.08,strike});
  }
  for(let i=0;i<fieldStandards.length;i++){
   const p=minoraMarchPoint(march-9-i*15,0),s=fieldStandards[i];
   s.root.position.set(p.x,ground(p.x,p.z)+3.7,p.z);s.root.rotation.y=p.heading-.35;s.animate(visualTime,i);
  }
  for(let i=0;i<8;i++){
   const x=-2438.5+(i>=3?(i-2)*3.2:0),z=148+(i%3-1)*2,defeat=19+i*1.35;
   const fall=smooth((time-defeat)/1.15),beat=(time-12+i*.8)%3.8;
   army.set(48+i,{x,y:ground(x,z),z,heading:-Math.PI/2,time:visualTime,walk:0,
    strike:time>=12&&time<defeat?smooth(beat/.9)*(1-smooth((beat-1.5)/.7)):0,fall});
  }
  army.flush();
  const occupied=time>=28;
  if(occupied)conceal();heads.visible=occupied;
  for(let i=0;i<standards.length;i++){standards[i].root.visible=occupied;standards[i].animate(visualTime,i*.4);}
  const arriving=time>=43,flight=clamp((time-43)/8),p=L.perch,y=ground(p.x,p.z)+p.height;
  bird.root.visible=arriving;wisp.visible=arriving;
  if(arriving){
   const s=smooth(flight);bird.root.position.set(THREE.MathUtils.lerp(L.birdStart.x,p.x,s),THREE.MathUtils.lerp(L.birdStart.y,y,s)+Math.sin(flight*Math.PI)*6,THREE.MathUtils.lerp(L.birdStart.z,p.z,s));
   bird.root.rotation.y=flight<1?Math.atan2(L.birdStart.x-p.x,L.birdStart.z-p.z):-.8;
   if(flight<1)bird.flap(visualTime,true);else bird.idle(visualTime);
   const m=new THREE.Object3D();for(let i=0;i<5;i++){const a=visualTime*.6+i*Math.PI*.4;m.position.copy(bird.root.position).add(new THREE.Vector3(Math.cos(a)*.22,.15+Math.sin(a*1.3)*.1,Math.sin(a)*.22));m.updateMatrix();wisp.setMatrixAt(i,m.matrix);}wisp.instanceMatrix.needsUpdate=true;
  }
 }
 function state(){const shot=captions(time);return {phase:time>=MINORA_FALL_DURATION?'occupied':shot.id,elapsed:time,duration:MINORA_FALL_DURATION,ready:built,
  completed,disposed,caption:shot.caption,detail:shot.detail,actors:built?56:0,standards:built?standards.length:0,heads:built&&time>=28?L.heads.length:0,
  messenger:time<43?'absent':time<51?'arriving':'perched'};}
 return {group,
  update(dt,{active=true,loading=false}={}){
   if(disposed||!active||loading||!Number.isFinite(dt)||dt<=0||!ready())return state();
   build();const delta=Math.min(dt,1);time=Math.min(MINORA_FALL_DURATION,time+delta);visualTime+=delta;draw();
   if(time>=MINORA_FALL_DURATION&&!completed){completed=true;onComplete(state());}return state();
  },
  state,
  camera(){const shot=captions(time);return {id:shot.id,position:{...shot.position},target:{...shot.target},caption:shot.caption,detail:shot.detail,fov:shot.id==='messenger'?42:52};},
  // Hosts may offer a labelled skip after the opening beats. This completes
  // only the presentation and delivers the same once-only callback.
  finish(){if(disposed||!ready())return false;build();time=MINORA_FALL_DURATION;visualTime=time;draw();if(!completed){completed=true;onComplete(state());}return true;},
  dispose(){if(disposed)return;disposed=true;army?.dispose();bird?.dispose();for(const s of [...standards,...fieldStandards])s.dispose();
   for(const p of props){p.geometry.dispose();p.material.dispose();}if(wisp){wisp.geometry.dispose();wisp.material.dispose();}
   for(const [node,visible]of hidden)node.visible=visible;hidden.clear();group.removeFromParent();},
 };
}

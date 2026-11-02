import * as THREE from 'three';
import {createSceneryBuilder} from '../../../world/scenery/scenery-builder.js';

/** Articulated crowd geometry: a whole army is thirteen instanced draw calls.
 * The scene choreographs these figures; they have no combat or campaign state. */
export function createMinoraFallArmy(parent,count=56){
 const root=new THREE.Group();root.name='Wilhelm assault / articulated ranks';parent.add(root);
 const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.72,metalness:.18,flatShading:true});
 const parts={},owned=[],scratch=new THREE.Object3D(),base=new THREE.Matrix4(),joint=new THREE.Matrix4(),pose=new THREE.Object3D();
 function piece(name,build){
  const holder=new THREE.Group(),b=createSceneryBuilder(name);build(b);const built=b.finish(holder),geometry=built.geometry;
  const mesh=new THREE.InstancedMesh(geometry,material,count);mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;root.add(mesh);parts[name]=mesh;owned.push(geometry);
 }
 const iron='#767a78',dark='#333a3b',edge='#9b9c8e',cloth='#8b8b85',leather='#45403b',flesh='#b4ada0';
 piece('cuirass',b=>{b.rock(dark,0,.02,0,.32,.4,.21);b.block(iron,0,-.25,0,.52,.51,.36);
  for(let y=-.24;y<.28;y+=.10)b.box(edge,0,y,.194,.5,.026,.035);
  for(const x of [-.13,.13])b.box(dark,x,.02,.217,.045,.54,.03);b.box(cloth,0,.02,.242,.17,.53,.035);
  b.box(leather,0,-.29,0,.56,.08,.42);b.box(edge,0,-.29,.225,.09,.07,.035);
  b.rock(iron,-.35,.26,0,.17,.13,.23);b.rock(iron,.35,.26,0,.17,.13,.23);});
 piece('helm',b=>{b.rock(flesh,0,0,.035,.145,.19,.14);b.rock(iron,0,.08,0,.175,.18,.17);
  b.box(dark,0,.06,.151,.27,.06,.035);b.box(edge,0,0,.18,.032,.16,.04);
  for(const x of [-.13,.13])b.box(iron,x,-.07,.1,.045,.21,.13);b.box(cloth,0,.24,-.02,.07,.16,.16);});
 piece('cloak',b=>{b.sheet(cloth,[-.28,.33,-.19],[.28,.33,-.19],[.32,-.64,-.28],[-.32,-.64,-.28]);
  for(const x of [-.24,.24])b.beam(dark,[x,.24,-.2],[x*1.25,-.62,-.29],.025);});
 for(const name of ['left upper arm','right upper arm'])piece(name,b=>{b.block(iron,0,-.35,0,.19,.35,.21);b.box(edge,0,-.13,.115,.2,.06,.025);});
 for(const name of ['left forearm','right forearm'])piece(name,b=>{b.block(leather,0,-.29,0,.16,.29,.17);b.box(iron,0,-.13,.1,.17,.22,.035);b.rock(flesh,0,-.31,0,.085,.1,.08);});
 for(const name of ['left leg','right leg'])piece(name,b=>{b.block(dark,0,-.38,0,.18,.38,.21);b.box(iron,0,-.1,.12,.17,.17,.05);});
 for(const name of ['left boot','right boot'])piece(name,b=>{b.block(leather,0,-.36,0,.19,.36,.22);b.box(iron,0,-.15,.13,.18,.22,.04);b.box(leather,0,-.34,.09,.20,.13,.37);});
 piece('shield',b=>{b.sheet(cloth,[-.25,.34,0],[.25,.34,0],[.23,-.22,0],[0,-.48,0]);b.triangle(cloth,[-.25,.34,0],[0,-.48,0],[-.23,-.22,0]);
  for(const [a,c]of [[[-.25,.34,.025],[.25,.34,.025]],[[-.25,.34,.025],[-.23,-.22,.025]],[[.25,.34,.025],[.23,-.22,.025]],[[-.23,-.22,.025],[0,-.48,.025]],[[.23,-.22,.025],[0,-.48,.025]]])b.beam(edge,a,c,.045);
  b.box(edge,0,.04,.04,.06,.42,.025);b.rock(edge,0,.1,.075,.09,.09,.04);});
 piece('spear',b=>{b.beam(leather,[0,-.65,0],[0,1.7,0],.043);b.cone(edge,0,1.7,0,.06,.30,0,4);b.box(cloth,.06,1.49,0,.12,.27,.025);});
 const red=new THREE.Color('#71313e'),blue=new THREE.Color('#68868a'),silver=new THREE.Color('#ae9a83');
 for(let i=0;i<count;i++){const tint=i<48?red:blue;for(const [name,mesh]of Object.entries(parts))mesh.setColorAt(i,['cloak','shield','cuirass','helm'].includes(name)?tint:silver);}
 for(const m of Object.values(parts))m.instanceColor.needsUpdate=true;
 function put(name,i,x,y,z,rx=0,ry=0,rz=0,parent=base){scratch.position.set(x,y,z);scratch.rotation.set(rx,ry,rz);scratch.scale.set(1,1,1);scratch.updateMatrix();joint.multiplyMatrices(parent,scratch.matrix);parts[name].setMatrixAt(i,joint);return joint.clone();}
 function set(i,{x,y,z,heading=0,walk=0,time=0,strike=0,fall=0,kneel=0}){
  const sway=Math.sin(time*7+i*.6)*Math.min(1,walk)*.52;
  pose.position.set(x,y+.03,z);pose.rotation.set(0,heading,fall*Math.PI*.48);pose.scale.setScalar(i===0?1.12:1);pose.updateMatrix();base.copy(pose.matrix);
  const torsoY=1.13-kneel*.34;
  put('cuirass',i,0,torsoY+Math.abs(sway)*.025,0,fall*.2);put('helm',i,0,torsoY+.56,0,fall*.2,Math.sin(time*.7+i)*.03);
  put('cloak',i,0,torsoY,0,.09+Math.abs(sway)*.12);
  for(const [side,sign]of [['left',-1],['right',1]]){
   const arm=put(side+' upper arm',i,sign*.38,torsoY+.22,0,side==='right'?-strike*1.55-sway*.2:.15+sway*.15,0,sign*.13);
   const wrist=put(side+' forearm',i,0,-.35,0,side==='right'?-strike*.5:-.7,0,0,arm);
   if(side==='left')put('shield',i,-.02,-.20,.13,0,0,0,wrist);
   else put('spear',i,.40,torsoY-.08,.12+strike*.48,strike*1.5);
   const leg=put(side+' leg',i,sign*.15,.78-kneel*.25,0,sway*sign-kneel*.5);
   put(side+' boot',i,0,-.38,0,Math.max(0,-sway*sign)*.6+kneel*.65,0,0,leg);
  }
 }
 function flush(){for(const m of Object.values(parts))m.instanceMatrix.needsUpdate=true;}
 let disposed=false;return {group:root,count,set,flush,dispose(){if(disposed)return;disposed=true;root.removeFromParent();for(const g of owned)g.dispose();material.dispose();}};
}

import * as THREE from 'three';
import {createSceneryBuilder} from '../../../world/scenery/scenery-builder.js';

// A weatherproof stair pavilion: recessed oak doors, cut-stone arch and a
// leaded roof. Its hourglass is guild metalwork, not a floating label.
export function createLookoutDoor(parent){
  const b=createSceneryBuilder('Guild lookout / arched stair entrance');
  const stone='#c4c4ae',edge='#dfd6b5',wood='#443627',brass='#a89052',iron='#293e41';
  for(const x of [-2.15,2.15]){
    b.block(stone,x,0,8.25,1.05,3.5,2.8);
    b.block(edge,x,0,8.2,1.2,.24,2.95);
    for(const y of [.55,1.25,1.95,2.65])b.box('#abae99',x,y,6.835,1.05,.025,.025);
    b.block(edge,x,2.7,7.03,1.14,.22,.55);
  }
  b.block(stone,0,0,9.55,5.35,4.6,.4);
  const spring=2.8,r=1.65;
  for(let i=0;i<15;i++){
    const a=i*Math.PI/15,c=(i+1)*Math.PI/15;
    const at=(angle,radius,z)=>[Math.cos(angle)*radius,spring+Math.sin(angle)*radius,z];
    for(const z of [6.82,7.5])b.sheet(i%2?edge:stone,at(a,r,z),at(c,r,z),at(c,r+.52,z),at(a,r+.52,z));
    b.quad(stone,at(a,r,6.82),at(a,r,7.5),at(c,r,7.5),at(c,r,6.82));
  }
  b.roof('#394c50',0,4.25,8.3,5.9,3.7,1.05,0,'#58696a');
  b.beam(brass,[-2.95,4.3,6.45],[2.95,4.3,6.45],.09);
  // Shadowed recess, then two actual timber leaves with frame and iron straps.
  const shape=new THREE.Shape();shape.moveTo(-1.58,0);shape.lineTo(1.58,0);shape.lineTo(1.58,2.8);
  shape.absarc(0,2.8,1.58,0,Math.PI,false);shape.lineTo(-1.58,0);
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:.18,bevelEnabled:false,curveSegments:12});
  const material=new THREE.MeshStandardMaterial({color:wood,roughness:.8}),door=new THREE.Mesh(geometry,material);
  door.name='Oak double door to the guild stair';door.position.z=7.12;parent.add(door);
  for(const x of [-1.43,-.07,.07,1.43])b.block('#796341',x,.12,7.07,.09,2.64,.1);
  for(const y of [.18,1.1,2.55])for(const x of [-.75,.75])b.box('#796341',x,y,7.055,1.3,.09,.12);
  for(const x of [-1.25,-.95,-.55,-.25,.25,.55,.95,1.25])b.box('#302a21',x,1.38,7.018,.018,2.26,.018);
  for(const y of [.65,2.2])for(const s of [-1,1]){
    b.box(iron,s*.86,y,6.99,1.15,.11,.09);
    for(const x of [.35,.85,1.35])b.rock(brass,s*x,y,6.93,.045,.045,.025);
  }
  b.box(iron,0,1.9,7.005,.035,3.7,.04);
  const rings=[];
  for(const x of [-.27,.27]){
    b.box(brass,x,1.45,6.98,.18,.3,.08);
    const g=new THREE.TorusGeometry(.105,.022,5,12),m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:brass,metalness:.6,roughness:.4}));
    m.position.set(x,1.4,6.88);parent.add(m);rings.push(m);
  }
  b.beam(brass,[-.25,3.75,7.01],[.25,3.75,7.01],.05);b.beam(brass,[-.25,3.12,7.01],[.25,3.12,7.01],.05);
  b.beam(brass,[-.23,3.72,7.01],[.23,3.15,7.01],.045);b.beam(brass,[.23,3.72,7.01],[-.23,3.15,7.01],.045);
  for(const x of [-2.17,2.17]){
    b.beam(iron,[x,2.1,6.8],[x,2.1,6.35],.08);b.block(iron,x,1.65,6.35,.36,.68,.34);
    b.block('#e5cd89',x,1.74,6.16,.24,.46,.03);b.roof(iron,x,2.33,6.35,.48,.46,.24);
  }
  b.box(edge,0,.025,6.6,3.4,.05,1);b.box(brass,-1.7,.055,6.6,.045,.018,1);b.box(brass,1.7,.055,6.6,.045,.018,1);
  const mesh=b.finish(parent);
  return {dispose(){mesh.removeFromParent();mesh.geometry.dispose();geometry.dispose();material.dispose();door.removeFromParent();for(const r of rings){r.geometry.dispose();r.material.dispose();r.removeFromParent();}}};
}

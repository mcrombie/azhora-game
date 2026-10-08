import * as THREE from 'three';
import {MENORA_GATES,MENORA_OUTLINE} from './menora-city.js';
import {COUNCIL_ROOMS,MINORA_COUNCIL} from './minora-council.js';
import {councilBanner,disposeCouncilObject} from './council-banner.js';
export function createCouncilGates(parent,heightAt){
  // Swap only the two former gate standards in this scenario; ordinary city
  // scenery and the old adventure keep their existing flags.
  parent.traverse(o=>{if(o.name==='Minora legacy gate flags')o.visible=false;});
  const root=new THREE.Group();root.name='Minora Council standards';parent.add(root);let leader=null;
  const poleGeometry=new THREE.CylinderGeometry(.085,.12,1,6),poleMaterial=new THREE.MeshStandardMaterial({color:'#746048',roughness:.8});
  const gates=MENORA_GATES.map(g=>{
    const a=MENORA_OUTLINE[g.edge],b=MENORA_OUTLINE[(g.edge+1)%MENORA_OUTLINE.length],group=new THREE.Group();
    group.position.set(g.x,heightAt(g.x,g.z)+22,g.z);group.rotation.y=Math.atan2(b.x-a.x,b.z-a.z)-Math.PI/2;root.add(group);
    for(const [x,top] of [[-4.8,4.05],[0,7.45],[4.8,4.05]]){const pole=new THREE.Mesh(poleGeometry,poleMaterial);pole.scale.y=top+1.2;pole.position.set(x,(top-1.2)/2,-.16);group.add(pole);}
    const standards=['taleth','mayor','temple'].map(id=>{const cloth=councilBanner(id);cloth.scale.setScalar(1.5);group.add(cloth);return {id,cloth};});
    return {group,standards,id:g.id};
  });
  for(const id of COUNCIL_ROOMS){const r=MINORA_COUNCIL[id];for(const x of [-3.2,3.2]){const banner=councilBanner(id);banner.scale.setScalar(.65);banner.position.set(r.x+x,heightAt(r.exit.x,r.exit.z)+4.2,r.z+(id==='temple'?17:11)+.6);root.add(banner);}}
  function update(next){if(next===leader)return;leader=next;const order=['taleth','mayor','temple'].filter(id=>id!==leader);order.splice(1,0,leader);
    for(const g of gates)for(const s of g.standards){const n=order.indexOf(s.id);s.cloth.position.set((n-1)*4.8,n===1?5:1.6,0);}}
  update('taleth');
  return {update,state:()=>({leader,gates:gates.map(g=>({id:g.id,standards:g.standards.map(s=>({id:s.id,x:s.cloth.position.x,y:s.cloth.position.y}))}))}),dispose(){disposeCouncilObject(root);}};
}

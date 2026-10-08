import * as THREE from 'three';
import {MINORA_COUNCIL} from './minora-council.js';
import {createSceneryBuilder} from '../../../world/scenery/scenery-builder.js';
// Each complete standard is one mesh, including both faces of its emblem.
export function councilBanner(id){
  const info=MINORA_COUNCIL[id],root=new THREE.Group();root.name=info.banner;
  const b=createSceneryBuilder(info.banner),gold='#edd49a';
  b.box(info.color,0,0,0,2,3,.07);
  b.box(gold,0,1.58,0,2.3,.09,.12);
  for(const face of [-1,1]){
    const z=face*.1;
    for(const x of [-.93,.93])b.box(gold,x,0,face*.05,.05,2.9,.03);
    const box=(x,y,w,h,roll=0)=>b.box(gold,x,y,z,w,h,.04,0,0,roll);
    function ring(radius){for(let i=0;i<16;i++){const a=i*Math.PI/8,c=(i+1)*Math.PI/8,point=(r,t)=>[r*Math.sin(t),r*Math.cos(t),z];b.sheet(gold,point(radius-.055,a),point(radius+.055,a),point(radius+.055,c),point(radius-.055,c));}}
    if(info.emblem==='bridge'){
      for(const x of [-.53,0,.53])box(x,-.2,.14,.8);
      box(0,.24,1.45,.16);for(const y of [-.73,-.95])box(0,y,1.5,.045);
    }else if(info.emblem==='sun'){
      ring(.4);for(let i=0;i<8;i++){const a=i*Math.PI/4;box(Math.sin(a)*.65,Math.cos(a)*.65,.07,.28,-a);}
    }else{
      ring(.63);for(const a of [0,Math.PI/3,-Math.PI/3])box(0,0,.07,1.06,a);
    }
  }
  const mesh=b.finish(root);mesh.material=mesh.material.clone();return root;
}
export function disposeCouncilObject(root){const gs=new Set(),ms=new Set();root.traverse(o=>{if(o.geometry)gs.add(o.geometry);for(const m of [].concat(o.material??[]))ms.add(m);});for(const g of gs)g.dispose();for(const m of ms)m.dispose();root.removeFromParent();}

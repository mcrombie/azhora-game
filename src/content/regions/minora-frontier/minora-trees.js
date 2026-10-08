import * as THREE from 'three';
import {registerWorldTree} from '../../../world/scenery/tree-registry.js';

// Keep Claude's planted silhouettes, with individually removable instance slots.
// Three shared meshes instead of a draw call for every trunk and crown.
export function createMinoraTrees({root,trees,ground,push,colliders}){
  const parts={trunk:[],cone:[],crown:[]},records=[];
  const leaves=['#4f7748','#5b8550','#466a40','#537759'],flowers=['#ddc479','#b691bc'];
  for(const [i,t] of trees.entries()){
    const y=ground(t.x,t.z),s=t.size;
    const bottom=Math.min(y,...[0,1,2,3].map(k=>ground(t.x+Math.cos(k*Math.PI/2)*.45,t.z+Math.sin(k*Math.PI/2)*.45)))-.1;
    const handles=[];
    const part=(kind,color,x,cy,z,sx,sy,sz,angle=0)=>{const index=parts[kind].length;parts[kind].push({color,x,y:cy,z,sx,sy,sz,angle});handles.push({kind,index});};
    const trunk=t.kind==='cypress'?.9:t.kind==='fruit'?1.3:2.4*s;
    const top=y+trunk+(t.kind==='cypress'?0:t.kind==='fruit'?.1:.5),radius=t.kind==='cypress'?.14:t.kind==='fruit'?.13:.2*s;
    part('trunk','#634733',t.x,(bottom+top)/2,t.z,radius,top-bottom,radius);
    if(t.kind==='cypress')part('cone','#3e6142',t.x,y+.75+2.7*s,t.z,.95*s,5.4*s,.95*s,i);
    else if(t.kind==='fruit'){
      part('crown',t.tint,t.x,y+2.1,t.z,1.15,.95,1.15,i);
      for(let k=0;k<4;k++){const a=i+k*1.6;part('crown',flowers[0],t.x+Math.cos(a)*1.05,y+1.8+(k%2)*.3,t.z+Math.sin(a)*1.05,.17,.17,.17);}
    }else{
      part('crown',t.tint,t.x,y+trunk+1.1*s,t.z,1.75*s,1.35*s,1.75*s,i);
      part('crown',leaves[(i+1)%4],t.x+.7*s*Math.cos(i),y+trunk+1.75*s,t.z+.7*s*Math.sin(i),1.1*s,.95*s,1.1*s,i+1);
      if(t.kind==='blossom')for(let k=0;k<2;k++){const a=i+k*3;part('crown',flowers[k],t.x+Math.cos(a)*1.1*s,y+trunk+1.5*s,t.z+Math.sin(a)*1.1*s,.5*s,.4*s,.5*s);}
    }
    const collider={x:t.x,z:t.z,r:.35,minY:bottom,maxY:y+trunk+1,kind:'tree',id:`menora-polish-tree-${i}`};push(collider);
    records.push({tree:{id:collider.id,x:t.x,y,z:t.z,radius:.35,species:({cypress:'red-cedar',fruit:'apple',blossom:'dogwood',round:'holm-oak'})[t.kind]},handles,collider});
  }
  const geometry={trunk:new THREE.CylinderGeometry(1,1,1,4),cone:new THREE.ConeGeometry(1,1,6),crown:new THREE.IcosahedronGeometry(1,0)};
  const material=new THREE.MeshStandardMaterial({roughness:1,flatShading:true}),meshes={},dummy=new THREE.Object3D();let vertices=0,batches=0;
  for(const [kind,list] of Object.entries(parts)){
    if(!list.length){geometry[kind].dispose();continue;}
    const mesh=meshes[kind]=new THREE.InstancedMesh(geometry[kind],material,list.length);mesh.name=`Minora polish trees / ${kind}`;
    for(const [index,p] of list.entries()){
      dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,p.angle,0);dummy.scale.set(p.sx,p.sy,p.sz);dummy.updateMatrix();
      mesh.setMatrixAt(index,dummy.matrix);mesh.setColorAt(index,new THREE.Color(p.color));
    }
    mesh.instanceMatrix.needsUpdate=true;mesh.castShadow=true;mesh.receiveShadow=true;mesh.computeBoundingSphere();root.add(mesh);
    batches++;vertices+=mesh.geometry.attributes.position.count*list.length;
  }
  for(const record of records)registerWorldTree(colliders,record.tree,record.handles.map(h=>({mesh:meshes[h.kind],index:h.index})),record.collider);
  return {trees:records.length,batches,vertices};
}

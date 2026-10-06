import { forEachBuild } from '../../../world/loading/build-each.js';
import { finishBuild } from '../../../world/loading/build-steps.js';
import * as THREE from 'three';
import { createSceneryBuilder } from '../../../world/scenery/scenery-builder.js';
import { registerWorldTree, worldTreeId } from '../../../world/scenery/tree-registry.js';
import { treeGroundingOffset } from '../../../world/scenery/tree-grounding.js';
import { YUNETHRE, YUNETHRE_TOWN as T, YUNETHRE_CAMP as C, YUNETHRE_BOUNDS, YUNETHRE_PATHS, YUNETHRE_LAKE, yunethreFeatures, yunethreOwns } from './yunethre-world.js';

/** A small free town with human timberwork, elven pavilions and wide centaur
 * shelters, and a separate movable camp. No civilian identity is invented. */
export function createYunethreScenery(...args) { return finishBuild(createYunethreScenerySteps(...args)); }

export function* createYunethreScenerySteps({parent,heightAt,colliders}) {
  let buildWork = 0;
 const root=new THREE.Group();root.name='Yunethre free town and grasslands';parent.add(root);
 const metrics={buildings:0,tents:0,wagons:0,trees:0,grass:0,flowers:0,rocks:0};
 const buildings=[],walkSurfaces=[],batches=new Map(),trees=[],dummy=new THREE.Object3D(),colour=new THREE.Color();
 const foliageMaterial=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.98,flatShading:true});
 const geometries={trunk:new THREE.CylinderGeometry(.68,1,1,7),crown:new THREE.IcosahedronGeometry(1,1),grass:new THREE.ConeGeometry(1,1,3),rock:new THREE.IcosahedronGeometry(1,0)};
 let seed=381009;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;},range=(a,b)=>a+(b-a)*rand();
 function part(type,tint,x,y,z,sx,sy,sz,yaw=0){const key=`${Math.floor(x/100)},${Math.floor(z/100)}:${type}`;if(!batches.has(key))batches.set(key,{type,pieces:[]});dummy.position.set(x,y,z);dummy.scale.set(sx,sy,sz);dummy.rotation.set(0,yaw,0);dummy.updateMatrix();const piece={matrix:dummy.matrix.clone(),tint};batches.get(key).pieces.push(piece);return piece;}
 function tree(x,z,species,height){const y=heightAt(x,z),r=height*.033,pieces=[],bark=species==='silver-birch'?'#bdc2ae':'#776447',leaf=species==='silver-birch'?'#8a9c5c':species==='hawthorn'?'#6f8049':'#55714a';
  const trunk=part('trunk',bark,x,y+height*.33,z,r,height*.66,r);const offset=treeGroundingOffset(trunk.matrix,heightAt,{radius:1,segments:7,embed:.07});trunk.matrix.elements[13]+=offset;pieces.push(trunk);
  for(let i=0;i<3;i++){const a=i*2.094;pieces.push(part('crown',leaf,x+Math.cos(a)*height*.13,y+offset+height*(.69+i*.05),z+Math.sin(a)*height*.13,height*.25,height*(species==='hawthorn'?.18:.23),height*.24));}
  const collider={x,z,r,kind:'tree'};colliders.push(collider);trees.push({tree:{id:worldTreeId('yunethre-tree',x,z),region:YUNETHRE,species,x,z,y,height,radius:r},pieces,collider});
 }
 for(let z0=YUNETHRE_BOUNDS.minZ+3;z0<YUNETHRE_BOUNDS.maxZ;z0+=10){ if (++buildWork % 32 === 0) yield; for(let x0=YUNETHRE_BOUNDS.minX+3;x0<YUNETHRE_BOUNDS.maxX;x0+=10){ if (++buildWork % 32 === 0) yield;const x=x0+range(-4,4),z=z0+range(-4,4),f=yunethreFeatures(x,z);if(!f||f.reserved||f.grade>.8)continue;const y=heightAt(x,z);
  if(rand()<(f.grove?.65:.018)&&f.grade<.52)tree(x,z,rand()<.4?'silver-birch':rand()<.6?'hawthorn':'white-oak',range(5,12));
  if(rand()<.8){for(let i=0;i<4;i++){ if (++buildWork % 32 === 0) yield;const dx=x+range(-.5,.5),dz=z+range(-.5,.5),h=range(.3,.9);part('grass',rand()<.5?'#b0ae73':'#8d995c',dx,heightAt(dx,dz)+h/2-.03,dz,.11,h,.08,rand()*6);}metrics.grass++;}
  if(rand()<.11){part('rock','#a7a797',x,y+.15,z,range(.3,.85),.25,range(.25,.75),rand()*6);metrics.rocks++;}
  if(rand()<.12){part('crown',rand()<.5?'#d9ce89':'#a599ba',x,y+.2,z,.12,.08,.12);metrics.flowers++;}
 } }
 // Town trees are deliberate, typed and harvestable, clear of its common streets.
 for(const [dx,dz,s,h]of [[-21,-32,'silver-birch',13],[18,38,'white-oak',14],[-15,34,'silver-birch',12],[36,-33,'hawthorn',7]]){ if (++buildWork % 32 === 0) yield; tree(T.x+dx,T.z+dz,s,h); }
 for(const [key,batch]of batches){ if (++buildWork % 32 === 0) yield;const mesh=new THREE.InstancedMesh(geometries[batch.type],foliageMaterial,batch.pieces.length);mesh.name=`Yunethre ${key}`;yield* forEachBuild(batch.pieces, function* (v, i) {mesh.setMatrixAt(i,v.matrix);mesh.setColorAt(i,colour.set(v.tint));v.handle={mesh,index:i};});mesh.computeBoundingSphere();mesh.castShadow=batch.type!=='grass';mesh.receiveShadow=true;root.add(mesh);}
 const registeredTrees=trees.map(t=>registerWorldTree(colliders,t.tree,t.pieces.map(p=>p.handle),t.collider));metrics.trees=registeredTrees.length;
 const tracks=createSceneryBuilder('Yunethre worn grass tracks');
 for(const path of YUNETHRE_PATHS){ if (++buildWork % 32 === 0) yield; for(let k=1;k<path.points.length;k++){ if (++buildWork % 32 === 0) yield;const a=path.points[k-1],b=path.points[k],len=Math.hypot(b.x-a.x,b.z-a.z),n=Math.ceil(len/4),ux=(b.x-a.x)/len,uz=(b.z-a.z)/len;
  for(let i=0;i<n;i++){ if (++buildWork % 32 === 0) yield;const q0=i/n,q1=(i+1)/n,w=path.width/2;const at=(q,s)=>{const x=a.x+(b.x-a.x)*q-uz*w*s,z=a.z+(b.z-a.z)*q+ux*w*s;return[x,heightAt(x,z)+.06,z];};tracks.quad('#b8af81',at(q0,-1),at(q0,1),at(q1,1),at(q1,-1));}} }
 (yield* tracks.finishSteps(root,{castShadow:false}));
 const stone='#aaa78b',wood='#665039',timber='#453e30',roof='#5c6553',cream='#d1c8aa';
 const town=createSceneryBuilder('Yunethre lakeside common');
 town.patch('#a69b73',heightAt,T.x,T.z,38,19,0,.065,12);
 function house(id,dx,dz,w,d,h,yaw,style='human'){
  const x=T.x+dx,z=T.z+dz,y=heightAt(x,z);buildings.push({id,x,z,width:w,depth:d,yaw,style});metrics.buildings++;
  // Foundation extends down through the local slope, never floats above it.
  const low=Math.min(y,...[-1,1].flatMap(i=>[-1,1].map(j=>heightAt(x+i*w*.6,z+j*d*.6))))-.2;
  town.frame(x,y,z,yaw,()=>{town.block(stone,0,low-y,0,w+.4,y-low+.18,d+.4);
   if(style==='centaur'){
    for(const sx of [-1,1])for(const sz of [-1,1])town.block(wood,sx*(w/2-.25),0,sz*(d/2-.3),.4,h,.4);
    town.block('#c2b590',0,.2,-d/2,w,h-.2,.22);town.roof('#9f9677',0,h,0,w+1,d+1,h*.5,0,'#8c7f61');
    // Open front deliberately broad enough for a horse body.
    for(const sx of [-1,1])town.block('#ada384',sx*(w/2-.3),.2,0,.3,h-.2,d);
   }else{
    town.block(style==='elf'?'#8b8c69':cream,0,.1,0,w,h,d);town.roof(style==='elf'?'#456652':roof,0,h+.1,0,w+1,d+1,style==='elf'?h*.9:h*.55);
    town.block(timber,0,.1,d/2+.03,1.6,2.6,.10);town.block(wood,0,.15,d/2+.1,1.38,2.4,.1);
    for(const sx of [-1,1]){town.block(timber,sx*w*.29,1.4,d/2+.06,1.25,1.5,.14);town.block('#c9cdad',sx*w*.29,1.55,d/2+.15,1,1.17,.05);town.block(wood,sx*w*.29,1.35,d/2+.20,1.35,.12,.08);}
    for(const sx of [-1,1])town.block(timber,sx*(w/2-.12),.1,d/2+.06,.22,h,.18);
   }
  });
  if(style!=='centaur')colliders.push({x,z,r:Math.hypot(w,d)*.46,kind:'building'});
  else{const ca=Math.cos(yaw),sa=Math.sin(yaw);for(const sx of [-1,1]){const lx=sx*(w/2-.2);colliders.push({x:x+ca*lx,z:z-sa*lx,r:.4,kind:'post'});}}
 }
 house('yunethre-common-house',-7,-21,13,10,6.2,Math.PI);
 house('yunethre-timber-house',22,-21,8,7,4.2,Math.PI);
 house('yunethre-root-house',-20,19,8,8,4.7,.6,'elf');
 house('yunethre-centaur-house',8,26,14,10,4.6,Math.PI,'centaur');
 house('yunethre-small-house',33,18,7,7,4.3,-.6);
 house('yunethre-tall-eaves',-3,-41,7,8,5.2,0,'elf');
 // Communal market awnings and benches, no faction banners or ownership walls.
 for(const dx of [-10,10]){ if (++buildWork % 32 === 0) yield;const x=T.x+dx,z=T.z-8,y=heightAt(x,z);for(const sx of [-2,2]){ if (++buildWork % 32 === 0) yield; town.block(wood,x+sx,y,z,.16,2.6,.16); }town.roof('#d3bc86',x,y+2.5,z,5,3,1);town.block(wood,x,y+.75,z,4,.14,.8);}
 for(const dz of [-6,6]){ if (++buildWork % 32 === 0) yield;const x=T.x-22,z=T.z+dz,y=heightAt(x,z);town.block(wood,x,y+.65,z,3,.16,.7);for(const dx of [-1,1]){ if (++buildWork % 32 === 0) yield; town.block(wood,x+dx,y,z,.2,.65,.6); }}
 (yield* town.finishSteps(root));
 // A broad elevated promenade reaches the existing mountain tarn. Ground and
 // water stay exactly where the mountain module put them; support uses these
 // same deck planes, so the player can reach the lakeside without teleporting.
 const boardwalk=createSceneryBuilder('Yunethre tarn promenade');
 const endY=YUNETHRE_LAKE.surface+.8;
 const points=[{x:T.x-23,z:T.z,y:heightAt(T.x-23,T.z)+.10},{x:T.x-43,z:T.z+9,y:25},{x:T.x-62,z:T.z+9,y:endY},{x:T.x-86,z:T.z+9,y:endY}];
 for(let k=1;k<points.length;k++){ if (++buildWork % 32 === 0) yield;const a=points[k-1],b=points[k],len=Math.hypot(b.x-a.x,b.z-a.z),n=Math.ceil(len/.5),ux=(b.x-a.x)/len,uz=(b.z-a.z)/len;
  walkSurfaces.push({id:`yunethre-tarn-walk-${k}`,kind:a.y===b.y?'deck':'ramp',a,b,width:3.8});
  for(let i=0;i<n;i++){ if (++buildWork % 32 === 0) yield;const t=(i+.5)/n,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t,y=a.y+(b.y-a.y)*t;boardwalk.box('#a68b62',x,y-.1,z,3.8,.2,len/n+.035,Math.atan2(ux,uz));}
  for(const t of [0,.5,1]){ if (++buildWork % 32 === 0) yield;const x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t,y=a.y+(b.y-a.y)*t;for(const side of [-1,1]){ if (++buildWork % 32 === 0) yield;const px=x-uz*1.8*side,pz=z+ux*1.8*side,base=heightAt(px,pz);boardwalk.block(wood,px,base-.15,pz,.22,y-base+1.15,.22);}}
  for(const side of [-1,1]){ if (++buildWork % 32 === 0) yield; boardwalk.beam(wood,[a.x-uz*1.8*side,a.y+1,a.z+ux*1.8*side],[b.x-uz*1.8*side,b.y+1,b.z+ux*1.8*side],.12); }
 }
 (yield* boardwalk.finishSteps(root));
 const camp=createSceneryBuilder('Yunethre nomadic camp');camp.patch('#aa956d',heightAt,C.x,C.z,32,26,.2,.06,10);
 for(let i=0;i<7;i++){ if (++buildWork % 32 === 0) yield;const a=i*Math.PI*2/7+.18,x=C.x+Math.cos(a)*31,z=C.z+Math.sin(a)*31,y=heightAt(x,z),yaw=-a+Math.PI/2;
  camp.frame(x,y,z,yaw,()=>{camp.cylinder('#c3b18b',0,0,0,4.7,2.4);camp.cone(i%2?'#a68e6d':'#d4c7a1',0,2.4,0,5.15,2.7);camp.box('#5a4c38',0,1.25,4.55,3.1,2.5,.18);camp.box('#242a22',0,1.21,4.66,2.7,2.42,.1);for(const dx of [-4,4])camp.beam(wood,[dx*.8,3,0],[dx*1.55,0,0],.06);});
  colliders.push({x,z,r:4.25,kind:'tent'});metrics.tents++;
 }
 // Wagons carry poles, folded canvas and supplies. They are trailers for
 // centaurs, not wagons drawn by captive horse-shaped people.
 for(let i=0;i<3;i++){ if (++buildWork % 32 === 0) yield;const x=C.x+23+i*8,z=C.z+14,y=heightAt(x,z);camp.frame(x,y,z,.2,()=>{camp.block(wood,0,.7,0,4,.25,2.6);for(const dx of [-1.5,1.5])for(const dz of [-1.45,1.45]){camp.rock('#45463a',dx,.7,dz,.65,.65,.18);camp.rock('#9e875d',dx,.7,dz,.25,.25,.2);}camp.block('#b2a180',0,.95,0,3.6,.8,2);for(let j=0;j<4;j++)camp.beam('#786447',[-1.6,2+j*.12,-.8],[1.7,2+j*.12,.8],.09);camp.beam(wood,[0,1,1.5],[0,.5,4],.2);});colliders.push({x,z,r:2.4,kind:'cart'});metrics.wagons++;}
 // Training targets and recurved bows tie the camp to its mounted archers.
 for(let i=0;i<3;i++){ if (++buildWork % 32 === 0) yield;const x=C.x-17+i*7,z=C.z-43,y=heightAt(x,z);camp.block(wood,x,y,z,.12,2.4,.12);camp.rock('#b6a077',x,y+1.8,z,1,1,.25);camp.rock('#74543e',x,y+1.8,z+.25,.38,.38,.05);}
 const bx=C.x+15,bz=C.z-7,by=heightAt(bx,bz);camp.block(wood,bx,by,bz,3.8,1.6,.2);
 for(let i=0;i<4;i++){ if (++buildWork % 32 === 0) yield;const x=bx-1.3+i*.8,points=[[x-.2,by+.3,bz+.18],[x,by+.58,bz+.4],[x+.13,by+1.1,bz+.35],[x,by+1.6,bz+.4],[x-.2,by+1.88,bz+.18]];for(let j=1;j<points.length;j++){ if (++buildWork % 32 === 0) yield; camp.beam('#a38359',points[j-1],points[j],.045); }camp.beam('#d9ccab',points[0],points.at(-1),.014);}
 (yield* camp.finishSteps(root));
 return {root,metrics,buildings,trees:registeredTrees,walkSurfaces,paths:YUNETHRE_PATHS,landmarks:[T,C],update:()=>{}};
}

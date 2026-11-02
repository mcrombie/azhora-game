import { forEachBuild } from '../../../world/loading/build-each.js';
import { finishBuild } from '../../../world/loading/build-steps.js';
import {createYunethreLakeWater} from './yunethre-lake.js';
import * as THREE from 'three';
import { createSceneryBuilder } from '../../../world/scenery/scenery-builder.js';
import { worldTreeId } from '../../../world/scenery/tree-registry.js';
import { createSpeciesTreesSteps } from '../../../world/scenery/species-trees.js';
import {createLizeemCountrysideSteps} from './lizeem-countryside-scenery.js';
import {groundRibbon} from '../../../world/scenery/ground-ribbon.js';
import { YUNETHRE, YUNETHRE_TOWN as T, YUNETHRE_CAMP as C, YUNETHRE_BOUNDS, YUNETHRE_PATHS, YUNETHRE_LAKE, YUNETHRE_FIELDS, YUNETHRE_ORCHARD, yunethrePathDistance, yunethreFeatures, yunethreOwns } from './yunethre-world.js';

import {buildYunethreTown,buildYunethreFarms,buildYunethrePromenade,buildYunethreCamp} from './yunethre-polish.js';

/** A lakeside free town with human timberwork, elven pavilions and wide centaur
 * shelters, and a separate movable camp. No civilian identity is invented. */
export function createYunethreScenery(...args) { return finishBuild(createYunethreScenerySteps(...args)); }

export function* createYunethreScenerySteps({parent,heightAt,colliders,terrainSurface,includeLake=false}) {
  let buildWork = 0;
 const root=new THREE.Group();root.name='Yunethre free town and grasslands';parent.add(root);
 const metrics={buildings:0,tents:0,wagons:0,trees:0,grass:0,flowers:0,rocks:0};
 const buildings=[],walkSurfaces=[],batches=new Map(),trees=[],dummy=new THREE.Object3D(),colour=new THREE.Color();
 const foliageMaterial=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.98,flatShading:true});
 const geometries={trunk:new THREE.CylinderGeometry(.68,1,1,7),crown:new THREE.IcosahedronGeometry(1,1),grass:new THREE.ConeGeometry(1,1,3),rock:new THREE.IcosahedronGeometry(1,0)};
 let seed=381009;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;},range=(a,b)=>a+(b-a)*rand();
 function part(type,tint,x,y,z,sx,sy,sz,yaw=0){const key=`${Math.floor(x/100)},${Math.floor(z/100)}:${type}`;if(!batches.has(key))batches.set(key,{type,pieces:[]});dummy.position.set(x,y,z);dummy.scale.set(sx,sy,sz);dummy.rotation.set(0,yaw,0);dummy.updateMatrix();const piece={matrix:dummy.matrix.clone(),tint};batches.get(key).pieces.push(piece);return piece;}
 function tree(x,z,species,height){
  trees.push({id:worldTreeId('yunethre-tree',x,z),region:YUNETHRE,species,x,z,height,trunkRadius:height*.033});
 }

 for(let z0=YUNETHRE_BOUNDS.minZ+3;z0<YUNETHRE_BOUNDS.maxZ;z0+=10){ if (++buildWork % 32 === 0) yield; for(let x0=YUNETHRE_BOUNDS.minX+3;x0<YUNETHRE_BOUNDS.maxX;x0+=10){ if (++buildWork % 32 === 0) yield;const x=x0+range(-4,4),z=z0+range(-4,4),f=yunethreFeatures(x,z);if(!f||f.reserved||f.grade>.8)continue;const y=heightAt(x,z);
  if(rand()<(f.grove?.65:.018)&&f.grade<.52)tree(x,z,rand()<.4?'silver-birch':rand()<.6?'hawthorn':'white-oak',range(5,12));
  if(rand()<.8){for(let i=0;i<4;i++){ if (++buildWork % 32 === 0) yield;const dx=x+range(-.5,.5),dz=z+range(-.5,.5),h=range(.3,.9);part('grass',rand()<.5?'#b0ae73':'#8d995c',dx,heightAt(dx,dz)+h/2-.03,dz,.11,h,.08,rand()*6);}metrics.grass++;}
  if(rand()<.11){const yaw=rand()*6,sx=range(.3,.85),sz=range(.25,.75);part('rock','#a7a797',x,y+.15,z,sx,.25,sz,yaw);part('rock','#929d72',x+sx*.2,y+.32,z,.4*sx,.09,.5*sz,yaw);metrics.rocks++;}
  if(rand()<.2){const tint=rand()<.5?'#d9ce89':'#a599ba';for(let i=0;i<5;i++){const a=i*2.399,dx=x+Math.cos(a)*.25*i,dz=z+Math.sin(a)*.25*i,fy=heightAt(dx,dz);part('grass','#819459',dx,fy+.17,dz,.035,.34,.035);part('crown',tint,dx,fy+.35,dz,.13,.09,.13);}metrics.flowers++;}
 } }
 // Town trees are deliberate, typed and harvestable, clear of its common streets.
 for(const [dx,dz,s,h]of [[-21,-32,'silver-birch',13],[18,38,'white-oak',14],[-15,34,'silver-birch',12],[36,-31,'hawthorn',7],[-14,-60,'silver-birch',11],[4,-65,'silver-birch',13],[28,66,'silver-birch',12],[43,61,'silver-birch',10]]){ if (++buildWork % 32 === 0) yield; if(yunethreOwns(T.x+dx,T.z+dz))tree(T.x+dx,T.z+dz,s,h); }
 // Twelve productive-looking orchard trees are still ordinary authored scenery,
 // with real apple species and no implied campaign harvest/population numbers.
 for(let row=0;row<3;row++)for(let col=0;col<4;col++){yield;tree(YUNETHRE_ORCHARD.x-15+col*10,YUNETHRE_ORCHARD.z-11+row*11,'apple',5.3+(row+col)%3*.4);}
 metrics.orchardTrees=12;
 // Reed clumps mark the actual east shore of the high tarn; no full-size trees
 // grow in the water or on the narrow playable stair and pier.
 for(let i=0;i<19;i++){yield;const a=-.85+i*.075,x=YUNETHRE_LAKE.centre.x+33*Math.cos(a),z=YUNETHRE_LAKE.centre.z+33*Math.sin(a);if(Math.abs(z-(T.z+9))<4)continue;
  const y=heightAt(x,z);if(Math.abs(y-YUNETHRE_LAKE.surface)>1.8)continue;
  for(let j=0;j<5;j++){const dx=x+Math.sin(j*2)*.4,dz=z+Math.cos(j*2)*.4,h=1.1+j*.12;part('grass','#9a9868',dx,y+h/2,dz,.075,h,.075);part('trunk','#7d6b49',dx,y+h*.9,dz,.055,.27,.055);}
 }
 for(const [key,batch]of batches){ if (++buildWork % 32 === 0) yield;const mesh=new THREE.InstancedMesh(geometries[batch.type],foliageMaterial,batch.pieces.length);mesh.name=`Yunethre ${key}`;yield* forEachBuild(batch.pieces, function* (v, i) {mesh.setMatrixAt(i,v.matrix);mesh.setColorAt(i,colour.set(v.tint));v.handle={mesh,index:i};});mesh.computeBoundingSphere();mesh.castShadow=batch.type!=='grass';mesh.receiveShadow=true;root.add(mesh);}
 const fields=yield* createLizeemCountrysideSteps({parent:root,heightAt,terrainSurface,fields:YUNETHRE_FIELDS,canPlace:p=>yunethreOwns(p.x,p.z)&&yunethrePathDistance(p.x,p.z)>5});metrics.fields=fields.metrics;
 const forest=yield* createSpeciesTreesSteps({parent:root,colliders,trees,heightAt,name:'Yunethre trees'});
 const registeredTrees=forest.trees;metrics.trees=registeredTrees.length;
 const tracks=createSceneryBuilder('Yunethre worn grass tracks');
 for(const path of YUNETHRE_PATHS)yield* groundRibbon(tracks,path.points,path.width,'#b1a783',heightAt,terrainSurface);
 (yield* tracks.finishSteps(root,{castShadow:false}));
 const context={root,heightAt,terrainSurface,colliders,buildings,walkSurfaces,metrics};
 yield* buildYunethreTown(context);
 yield* buildYunethreFarms(context);
 yield* buildYunethrePromenade(context);
 yield* buildYunethreCamp(context);
 const lake=includeLake?createYunethreLakeWater(root):null;
 return {root,metrics,buildings,trees:registeredTrees,walkSurfaces,paths:YUNETHRE_PATHS,landmarks:[T,C],update:time=>lake?.update(time)};
}

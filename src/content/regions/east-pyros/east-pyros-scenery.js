import * as THREE from 'three';
import { pyraClear } from '../pyra/pyra-world.js';
import { createSceneryBuilder } from '../../../world/scenery/scenery-builder.js';
import { registerWorldTree, worldTreeId } from '../../../world/scenery/tree-registry.js';
import { treeGroundingOffset } from '../../../world/scenery/tree-grounding.js';
import { hexOwnerAt, landDistance } from '../../../world/terrain/region-world.js';
import { EAST_PYROS, EAST_PYROS_CELLS, EAST_PYROS_OUTCROPS, EAST_PYROS_POOLS,
  eastPyrosClear, eastPyrosHabitat, eastPyrosWaterAt } from './east-pyros-world.js';
import { eastPyrosWildlifeClear } from './east-pyros-wildlife.js';
import { telemoniaDrawsGround } from '../telemonia/telemonia-world.js';

const TAU=Math.PI*2;
const tones={
  'holm-oak':['#716346','#53623b'],
  'stone-pine':['#8a6e51','#526748'],
  'common-juniper':['#80715a','#627355'],
  olive:['#817661','#879071'],
  'white-poplar':['#b9bba3','#859772'],
  tamarisk:['#8b745d','#85947a'],
};
const geometry={trunk:new THREE.CylinderGeometry(.72,1,1,7),crown:new THREE.IcosahedronGeometry(1,0)};

/** Thirty-three independently culled ground batches and a few instanced tree
 * batches. Every trunk has a species, collider and harvestable mesh handles. */
export function* createEastPyrosScenerySteps({parent,heightAt,renderedGroundHeight:gridGround=heightAt,colliders}){
  // Along Telemonia's border its own ground is drawn over the world's sunk grid (src/content/regions/telemonia/telemonia-world.js).
  const renderedGroundHeight=(x,z)=>telemoniaDrawsGround(x,z)?heightAt(x,z):gridGround(x,z);
  const root=new THREE.Group();root.name='East Pyros volcanic grass country';parent.add(root);
  const material=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.97,flatShading:true});
  const batches=new Map(),pendingTrees=[],trees=[],wisps=[];
  const metrics={trees:0,rocks:0,shrubs:0,tufts:0,flowers:0,outcrops:0,pools:0,batches:0,vertices:0};
  let seed=570093,work=0;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const range=(a,b)=>a+random()*(b-a);
  const dummy=new THREE.Object3D(),color=new THREE.Color();
  const grade=(x,z)=>Math.hypot(heightAt(x+1,z)-heightAt(x-1,z),heightAt(x,z+1)-heightAt(x,z-1))/2;
  const blocked=(x,z,margin=0)=>pyraClear(x,z,margin)||eastPyrosClear(x,z,margin)||eastPyrosWildlifeClear(x,z,margin)
    ||EAST_PYROS_OUTCROPS.some(p=>Math.hypot(x-p.x,z-p.z)<p.radius+margin);
  function part(kind,tint,x,y,z,sx,sy,sz,yaw=0){
    const key=`${Math.floor(x/180)},${Math.floor(z/180)}:${kind}`;
    if(!batches.has(key))batches.set(key,{kind,pieces:[]});
    dummy.position.set(x,y,z);dummy.scale.set(sx,sy,sz);dummy.rotation.set(0,yaw,0);dummy.updateMatrix();
    const piece={matrix:dummy.matrix.clone(),tint};batches.get(key).pieces.push(piece);return piece;
  }
  function tree(x,z,species,height){
    const y=renderedGroundHeight(x,z),[bark,leaf]=tones[species],r=height*(species==='white-poplar'?.021:.034),bole=height*.7;
    const trunk=part('trunk',bark,x,y+bole/2,z,r,bole,r),pieces=[trunk];
    const offset=treeGroundingOffset(trunk.matrix,renderedGroundHeight,{radius:1,segments:7,embed:.06});
    trunk.matrix.elements[13]+=offset;
    const pine=species==='stone-pine',tall=species==='white-poplar',low=species==='common-juniper';
    for(let i=0;i<3;i++){
      const a=i*TAU/3+x*.04,spread=height*(pine?.2:tall?.045:.14);
      pieces.push(part('crown',leaf,x+Math.cos(a)*spread,y+offset+height*(low?.6:.74)+i*height*.053,
        z+Math.sin(a)*spread,height*(tall?.15:pine?.27:.25),height*(pine?.14:tall?.29:.22),height*(tall?.15:.22),a));
    }
    const collider={x,z,r,kind:'tree'};colliders.push(collider);
    pendingTrees.push({descriptor:{id:worldTreeId('east-pyros-tree',x,z),region:EAST_PYROS,species,x,z,y,height,radius:r,
      base:{x,y:y+offset,z}},pieces,collider});metrics.trees++;
  }

  for(const cell of EAST_PYROS_CELLS){
    const b=createSceneryBuilder(`East Pyros ground ${cell.q},${cell.r}`);
    for(let i=0;i<295;i++){
      if(++work%20===0)yield;
      const x=cell.x+range(-49,49),z=cell.z+range(-53,53);
      if(hexOwnerAt(x,z)!==EAST_PYROS||landDistance(x,z)<6||eastPyrosWaterAt(x,z)!==null)continue;
      const habitat=eastPyrosHabitat(x,z),y=renderedGroundHeight(x,z),g=grade(x,z);
      if(y<1.2||habitat.river<7||g>1.2||blocked(x,z,.4))continue;
      const p=random();
      if(i<17&&p<(habitat.moist>.5?.78:.20)&&g<.72){
        const species=habitat.river<28?(z>1400?'tamarisk':'white-poplar')
          :z>1390?(p<.42?'olive':'stone-pine'):habitat.moist>.5?(p<.45?'holm-oak':'stone-pine'):'common-juniper';
        tree(x,z,species,range(species==='common-juniper'?3.8:6,species==='common-juniper'?6.5:11.8));
      }else if(i<35){
        const size=range(.28,1.45),rockColor=habitat.dry>.6?(p<.5?'#756654':'#8b735a'):'#72786c';
        b.rock(rockColor,x,y+size*.16,z,size,size*.49,size*.76,range(0,TAU));metrics.rocks++;
        if(size>1.1)colliders.push({x,z,r:size*.63,kind:'rock'});
      }else if(i<63){
        const size=range(.38,1.05);b.rock(habitat.moist>.55?'#647443':'#828357',x,y+size*.36,z,size,size*.57,size*.72,range(0,TAU));metrics.shrubs++;
      }else{
        const h=range(.19,habitat.moist>.5?.72:.49),w=h*.16;
        for(let blade=0;blade<3;blade++){
          const a=blade*TAU/3,dx=Math.cos(a)*w,dz=Math.sin(a)*w;
          const shade=habitat.moist>.5?(blade%2?'#84915a':'#6f7d46'):(blade%2?'#c0b57c':'#9b9760');
          b.triangle(shade,[x-dz,y-.035,z+dx],[x+dz,y-.035,z-dx],[x+dx*1.3,y+h,z+dz*1.3]);
          b.triangle(shade,[x+dz,y-.035,z-dx],[x-dz,y-.035,z+dx],[x+dx*1.3,y+h,z+dz*1.3]);
        }metrics.tufts++;
        if(habitat.flower&&p<.065){b.rock(p<.026?'#ded9aa':'#b6a3b1',x,y+h*.9,z,.11,.085,.11);metrics.flowers++;}
      }
    }
    metrics.vertices+=b.vertexCount;
    const mesh=yield* b.finishSteps(root);if(mesh)metrics.batches++;
    yield;
  }

  for(const site of EAST_PYROS_OUTCROPS){
    const b=createSceneryBuilder(site.name);
    for(let i=0;i<24;i++){
      if(i%6===0)yield;
      const a=i*2.39996323,rad=site.radius*Math.sqrt(i/24)*.87,x=site.x+Math.cos(a)*rad,z=site.z+Math.sin(a)*rad;
      if(pyraClear(x,z,2)||eastPyrosClear(x,z,2)||eastPyrosWildlifeClear(x,z,2))continue;
      const y=renderedGroundHeight(x,z),s=range(1.2,2.9),h=site.kind==='basalt'?range(2.2,8.5):range(1.4,4.6);
      const base=Math.min(y,renderedGroundHeight(x+s,z),renderedGroundHeight(x-s,z),renderedGroundHeight(x,z+s),renderedGroundHeight(x,z-s))-.35;
      if(site.kind==='basalt'){
        b.cylinder(i%3?'#605e55':'#777567',x,base,z,s*.64,h,a,7);
        b.cylinder('#858071',x,base+h-.2,z,s*.63,.25,a,7);
      }else if(site.kind==='red-stone'){
        for(let j=0;j<3;j++)b.rock(j%2?'#ad8064':'#88654f',x+j*.22,base+h*(.12+j*.24),z,s*(1-j*.17),h*.26,s*.71,a);
      }else b.rock(i%2?'#b4ae96':'#d0c8ac',x,base+h*.39,z,s,h*.58,s*.8,a);
      colliders.push({x,z,r:s*.8,kind:'rock',id:`${site.id}-${i}`});metrics.rocks++;
    }
    metrics.vertices+=b.vertexCount;yield* b.finishSteps(root);metrics.outcrops++;metrics.batches++;
  }

  for(const [index,pool] of EAST_PYROS_POOLS.entries()){
    const b=createSceneryBuilder(`${pool.name} mineral rim`);
    for(let i=0;i<40;i++){
      if(i%10===0)yield;
      const a=i*TAU/40,r=pool.radius*range(1.2,1.55),x=pool.x+Math.cos(a)*r,z=pool.z+Math.sin(a)*r;
      b.rock(i%3?'#c3b798':'#b3ad8b',x,renderedGroundHeight(x,z)-.03,z,range(.2,.5),.2,range(.2,.5),a);
    }
    metrics.vertices+=b.vertexCount;yield* b.finishSteps(root);metrics.batches++;
    const water=new THREE.Mesh(new THREE.CircleGeometry(pool.radius*.73,32),
      new THREE.MeshStandardMaterial({color:index?'#799b83':'#789d98',roughness:.22,metalness:.1,transparent:true,opacity:.84}));
    water.name=pool.name;water.rotation.x=-Math.PI/2;water.position.set(pool.x,pool.surfaceY+.015,pool.z);root.add(water);
    metrics.pools++;metrics.batches++;
    const steamMaterial=new THREE.MeshBasicMaterial({color:'#dddcc9',transparent:true,opacity:.075,depthWrite:false});
    for(let i=0;i<3;i++){
      const mist=new THREE.Mesh(new THREE.IcosahedronGeometry(1,0),steamMaterial);mist.name='Faint thermal steam';
      mist.userData={x:pool.x+Math.cos(i*2.3)*1.9,z:pool.z+Math.sin(i*2.3)*1.9,y:pool.surfaceY+.7,phase:i*1.9+index};
      mist.position.set(mist.userData.x,mist.userData.y,mist.userData.z);mist.scale.set(1.1,.45,1.1);root.add(mist);wisps.push(mist);metrics.batches++;
    }
    yield;
  }

  for(const batch of batches.values()){
    const mesh=new THREE.InstancedMesh(geometry[batch.kind],material,batch.pieces.length);mesh.name=`East Pyros ${batch.kind}`;
    mesh.castShadow=true;mesh.receiveShadow=true;
    for(let i=0;i<batch.pieces.length;i++){
      if(++work%30===0)yield;
      const p=batch.pieces[i];mesh.setMatrixAt(i,p.matrix);mesh.setColorAt(i,color.set(p.tint));p.mesh=mesh;p.index=i;
    }
    mesh.computeBoundingSphere();root.add(mesh);metrics.batches++;
    metrics.vertices+=geometry[batch.kind].attributes.position.count*batch.pieces.length;
    yield;
  }
  for(const pending of pendingTrees){
    if(++work%20===0)yield;
    trees.push(registerWorldTree(colliders,pending.descriptor,pending.pieces.map(p=>({mesh:p.mesh,index:p.index})),pending.collider));
  }
  return {root,metrics:Object.freeze({...metrics}),trees:Object.freeze(trees),update(elapsed){
    for(const mist of wisps){
      const t=elapsed*.28+mist.userData.phase;
      mist.position.set(mist.userData.x+Math.sin(t)*.25,mist.userData.y+Math.sin(t*.8)*.3,mist.userData.z+Math.cos(t)*.2);
      mist.scale.set(1.05+Math.sin(t)*.13,.48+Math.cos(t)*.08,1.1);
    }
  }};
}

import * as THREE from 'three';
import { finishBuild } from '../../../world/loading/build-steps.js';
import { createSceneryBuilder } from '../../../world/scenery/scenery-builder.js';
import { registerWorldTree,worldTreeId } from '../../../world/scenery/tree-registry.js';
import { landDistance,SEA_LEVEL } from '../../../world/terrain/region-world.js';
import { LEGEMUM_CELLS,legemumOwns,legemumHabitat,legemumSlope,legemumClear } from './legemum-world.js';
import { legemumWildlifeClear } from './legemum-wildlife.js';
import { telemoniaDrawsGround } from '../telemonia/telemonia-world.js';
import { GALA_TELEMONIA_STREAM,GALA_TELEMONIA_MOUTH,courseDistance,trelossDrawsGround } from '../western-regions/west-regions.js';
import { courseSample } from '../western-regions/west-ground.js';

const TAU=Math.PI*2;
/** The Treloss runs down Legemum's border with Gala to the sea (src/content/regions/western-regions/west-regions.js), and since 2026-10-03 its
 * mouth is cut through to the shore. This country's cover is still decided where it was drawn, from the one
 * seeded stream, so not one thing in the other twenty-three cells moves; what would stand in the stream's water
 * is only drawn square off its line onto Legemum's own bank, `OFF_WATER` metres past its widest water. */
const TRELOSS=[GALA_TELEMONIA_STREAM,GALA_TELEMONIA_MOUTH],OFF_WATER=.8;
function offTreloss(p){
  let q=p;
  for(const course of TRELOSS){
    const reach=course.maxHalf+OFF_WATER;
    if(courseDistance(course,q.x,q.z,reach)>=reach)continue;
    const s=courseSample(course,q.x,q.z),across=(q.x-s.x)*s.nx+(q.z-s.z)*s.nz,to=(across<0?-1:1)*reach;
    const moved={x:q.x+s.nx*(to-across),z:q.z+s.nz*(to-across)};
    if(!legemumOwns(moved.x,moved.z))return p;
    q=moved;
  }
  return q===p?p:{...p,x:q.x,z:q.z};
}
export function createLegemumScenery(...args){return finishBuild(createLegemumScenerySteps(...args));}
/** Low, ocean-pruned cover outside two sheltered pockets. Trees use harvestable
 * instance handles, not untyped scenery; small flora is batched by atlas cell. */
export function* createLegemumScenerySteps({parent,heightAt,renderedGroundHeight:gridGround=heightAt,colliders}){
  // Along Telemonia's border its own ground is drawn over the world's sunk grid (src/content/regions/telemonia/telemonia-world.js), and so is the
  // Treloss's lower gully's, down this country's border with Gala to the sea (`TRELOSS_GULLY`, src/content/regions/western-regions/west-regions.js).
  const renderedGroundHeight=(x,z)=>telemoniaDrawsGround(x,z)||trelossDrawsGround(x,z)?heightAt(x,z):gridGround(x,z);
  const root=new THREE.Group();root.name='Legemum - wet headlands and tin country';parent.add(root);
  const metrics={offTreloss:0,cells:0,trees:0,rocks:0,tors:0,quartzVeins:0,grass:0,heath:0,bogPlants:0,ferns:0,batches:0,vertices:0};
  let seed=590431,work=0;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const range=(a,b)=>a+random()*(b-a),treePoints=[];
  const plantable=(x,z)=>legemumOwns(x,z)&&landDistance(x,z)>3.5&&heightAt(x,z)>SEA_LEVEL+.65;
  const clear=(x,z,margin=0)=>legemumClear(x,z,margin)||legemumWildlifeClear(x,z,margin);
  const sample=(cell,r=53)=>({x:cell.x+range(-r,r),z:cell.z+range(-r,r)});
  function grass(b,x,y,z,h,tint){
    const angle=random()*TAU;
    for(let i=0;i<3;i++){
      const a=angle+i*2.1,s=.16+random()*.12,dx=Math.cos(a)*s,dz=Math.sin(a)*s;
      b.triangle(tint,[x-dx,y,z-dz],[x+dx,y,z+dz],[x+Math.cos(a+.9)*h*.23,y+h,z+Math.sin(a+.9)*h*.23]);
    }
  }
  function fern(b,x,y,z,s){
    for(let j=0;j<5;j++){
      const a=j*TAU/5,dx=Math.cos(a),dz=Math.sin(a);
      for(let k=1;k<5;k++){
        const t=k/5,px=x+dx*t*s,pz=z+dz*t*s,yy=y+Math.sin(t*Math.PI)*s*.47;
        for(const side of [-1,1])b.triangle('#58764e',[px,yy,pz],[px+dx*s*.21-dz*side*s*.18,yy+.025,pz+dz*s*.21+dx*side*s*.18],[px+dx*s*.2,yy-.07,pz+dz*s*.2]);
      }
    }
  }
  for(const cell of LEGEMUM_CELLS){
    yield;metrics.cells++;
    const b=createSceneryBuilder(`Legemum groundcover ${cell.q},${cell.r}`);
    for(let i=0;i<90;i++){
      if(++work%24===0)yield;
      const p=sample(cell);if(!plantable(p.x,p.z))continue;
      const q=offTreloss(p);if(q!==p)metrics.offTreloss++;
      const habitat=legemumHabitat(p.x,p.z),y=renderedGroundHeight(q.x,q.z);
      grass(b,q.x,y-.04,q.z,range(.18,.63),habitat==='bog'?'#7d855c':habitat==='coast'?'#99a17a':'#81915d');metrics.grass++;
      if(habitat==='bog'&&i%3===0){
        b.rock('#66816a',q.x,y+.04,q.z,range(.5,1.1),.10,range(.5,1.1),random()*TAU);
        // Sphagnum hummocks, sedges, and low red sundew rosettes. These are
        // natural wet ground, not new deep lakes or hidden swimming blockers.
        for(let j=0;j<4;j++){
          const a=j*TAU/4;b.rock('#a36365',q.x+Math.cos(a)*.13,y+.14,q.z+Math.sin(a)*.13,.12,.035,.05,a);
          b.rock('#c4ae87',q.x+Math.cos(a)*.21,y+.17,q.z+Math.sin(a)*.21,.025,.025,.025);
        }
        metrics.bogPlants++;
      } else if(habitat==='wood'&&i%3===0){fern(b,q.x,y,q.z,range(.6,1.1));metrics.ferns++;}
      else if(i%7===0&&!clear(p.x,p.z,.4)){
        const s=range(.3,.85),heather=i%2===0;
        b.rock(heather?'#65715b':'#637753',q.x,y+s*.28,q.z,s,s*.43,s*.8,random()*TAU);
        for(let j=0;j<3;j++)b.rock(heather?'#a090a8':'#c1ad67',q.x+range(-s*.6,s*.6),y+s*.6,q.z+range(-s*.6,s*.6),.13,.09,.13);
        metrics.heath++;
      }
    }
    for(let i=0;i<10;i++){
      const p=sample(cell);if(!plantable(p.x,p.z)||clear(p.x,p.z,2))continue;
      const q=offTreloss(p);if(q!==p)metrics.offTreloss++;
      const y=renderedGroundHeight(q.x,q.z),s=range(.38,1.6),tint=i%3?'#81867d':'#b3b3a1';
      b.rock(tint,q.x,y+s*.19,q.z,s,s*.53,s*.82,random()*TAU);metrics.rocks++;
      if(s>1.1)colliders.push({x:q.x,z:q.z,r:s*.7,minY:y-.5,maxY:y+s*.8,kind:'rock',id:`legemum-stone-${cell.q}-${cell.r}-${i}`});
    }
    for(let i=0;i<28;i++){
      const p=sample(cell);if(!plantable(p.x,p.z)||clear(p.x,p.z,1.7)||landDistance(p.x,p.z)<18||legemumSlope(p.x,p.z,heightAt)>.6)continue;
      const habitat=legemumHabitat(p.x,p.z),chance=habitat==='wood'?.9:habitat==='bog'?.04:habitat==='heath'?.09:habitat==='meadow'?.04:0;
      if(random()>chance||treePoints.some(t=>Math.hypot(t.x-p.x,t.z-p.z)<4.8))continue;
      const species=habitat==='bog'?'black-alder':habitat==='wood'?(random()<.36?'silver-birch':random()<.7?'black-alder':'white-oak'):'hawthorn';
      treePoints.push({...p,species,height:species==='hawthorn'?range(3,5):range(6.5,10),radius:species==='hawthorn'?.2:range(.24,.4),yaw:random()*TAU});
    }
    metrics.vertices+=b.vertexCount;const mesh=yield* b.finishSteps(root,{castShadow:false});if(mesh)metrics.batches++;
  }
  // Tin-bearing tors are irregular natural outcrops with quartz ribs, not
  // excavated mine entries. The narrow mineral stripes do not become platforms.
  const tors=createSceneryBuilder('Legemum slate tors and quartz tin ribs');
  for(const [i,p]of [{x:-2085,z:1552},{x:-2180,z:1581},{x:-2370,z:1574},{x:-1874,z:1924},{x:-1902,z:1899}].entries()){
    yield;if(!plantable(p.x,p.z)||clear(p.x,p.z,4))continue;
    const s=4+i%2,y=Math.min(...[[0,0],[s,0],[-s,0],[0,s],[0,-s]].map(([dx,dz])=>renderedGroundHeight(p.x+dx,p.z+dz)))-.4;
    tors.rock('#717977',p.x,y+2.3,p.z,s,5.1,s*.8,i*.53);
    tors.rock('#858b7e',p.x+1.6,y+5.6,p.z-.5,s*.7,2.6,s*.59,i*.53+.2);
    for(let stripe=0;stripe<3;stripe++){
      tors.beam('#c2c3af',[p.x-s*.65,y+2+stripe*1.1,p.z+s*.52],[p.x+s*.55,y+3.1+stripe*1.1,p.z+s*.54],.22,.18);metrics.quartzVeins++;
    }
    colliders.push({x:p.x,z:p.z,r:s*.85,minY:y-2,maxY:y+8.2,kind:'rock',id:`legemum-tor-${i}`});metrics.tors++;
  }
  metrics.vertices+=tors.vertexCount;const torMesh=yield* tors.finishSteps(root);if(torMesh)metrics.batches++;
  if(treePoints.length){
    const material=new THREE.MeshStandardMaterial({vertexColors:false,roughness:1,flatShading:true});
    const trunk=new THREE.InstancedMesh(new THREE.CylinderGeometry(1,1.16,1,7),material,treePoints.length);
    const crowns=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1),material,treePoints.length*3);
    trunk.name='Legemum typed living trunks';crowns.name='Legemum wind-pruned crowns';
    root.add(trunk,crowns);trunk.castShadow=true;trunk.receiveShadow=true;crowns.castShadow=true;crowns.receiveShadow=true;
    const dummy=new THREE.Object3D(),color=new THREE.Color();
    for(const [i,laid]of treePoints.entries()){
      if(++work%12===0)yield;
      const t=offTreloss(laid);if(t!==laid){metrics.offTreloss++;treePoints[i]=t;}
      const y=renderedGroundHeight(t.x,t.z),h=t.height,r=t.radius;
      dummy.position.set(t.x,y+h*.46-.55,t.z);dummy.rotation.set(0,t.yaw,0);dummy.scale.set(r,h*.92+1.1,r);dummy.updateMatrix();trunk.setMatrixAt(i,dummy.matrix);
      trunk.setColorAt(i,color.set(t.species==='silver-birch'?'#b6b9a7':t.species==='black-alder'?'#65664e':'#776b50'));
      const handles=[{mesh:trunk,index:i}];
      for(let j=0;j<3;j++){
        const angle=t.yaw+j*TAU/3,spread=h*(t.species==='silver-birch'?.19:.27),offset=j===0?0:spread*.53;
        dummy.position.set(t.x+Math.cos(angle)*offset+h*.1,y+h*(.68+j*.085),t.z+Math.sin(angle)*offset);
        dummy.rotation.set(.05,t.yaw,0);dummy.scale.set(spread*(j===0?1.1:.86),h*(t.species==='silver-birch'?.22:.16),spread*.78);dummy.updateMatrix();
        crowns.setMatrixAt(i*3+j,dummy.matrix);crowns.setColorAt(i*3+j,color.set(t.species==='black-alder'?'#547357':t.species==='silver-birch'?'#81966e':t.species==='hawthorn'?'#75835a':'#648259').multiplyScalar(.91+j*.055));handles.push({mesh:crowns,index:i*3+j});
      }
      const id=worldTreeId('legemum',t.x,t.z),collider={x:t.x,z:t.z,r:r+.08,minY:y-.9,maxY:y+h,kind:'tree',id};colliders.push(collider);
      registerWorldTree(colliders,{id,...t,y,base:{x:t.x,y,z:t.z},harvestable:true},handles,collider);metrics.trees++;
    }
    trunk.computeBoundingSphere();crowns.computeBoundingSphere();metrics.batches+=2;
    metrics.vertices+=trunk.geometry.attributes.position.count*treePoints.length+crowns.geometry.attributes.position.count*treePoints.length*3;
  }
  return {root,metrics,trees:treePoints};
}

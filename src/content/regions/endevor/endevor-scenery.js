import * as THREE from 'three';
import {createSceneryBuilder} from '../../../world/scenery/scenery-builder.js';
import {createSpeciesTreesSteps} from '../../../world/scenery/species-trees.js';
import {worldTreeId} from '../../../world/scenery/tree-registry.js';
import {hexOwnerAt} from '../../../world/terrain/region-world.js';
import {finishBuild} from '../../../world/loading/build-steps.js';
import {acorTint} from '../acor/acor-world.js';
import {ENDEVOR_FINE,ENDEVOR_ROADS,ENDEVOR_BRIDGE,ENDEVOR_QUAYS,endevorQuayHeight,endevorDry} from './endevor-layout.js';
import {ENDEVOR_BUILDINGS,ENDEVOR_FIELDS,ENDEVOR_CROPS,endevorTownTint} from './endevor-country.js';
import {endevorHouse,ENDEVOR_PALETTE as P} from './endevor-architecture.js';
import {endevorWaterAt} from './endevor-river.js';

export const createEndevorScenery=options=>finishBuild(createEndevorScenerySteps(options));
export function* createEndevorScenerySteps({parent,heightAt,colliders=[],fieldHeightAt=heightAt}){
  const root=new THREE.Group();root.name='Endevor Town / river mouth';parent.add(root);
  const metrics={buildings:0,fields:0,bridges:1,quays:ENDEVOR_QUAYS.length,boats:0,batches:0};
  // A small fine ground skin makes the channel and the bank approaches readable
  // at walking height. The world lowers only its coarse terrain beneath this box.
  const fine=ENDEVOR_FINE,nx=112,nz=104,pos=[],colors=[],indices=[],color=new THREE.Color();
  for(let j=0;j<=nz;j++){
    for(let i=0;i<=nx;i++){
      const x=fine.x+i*fine.w/nx,z=fine.z+j*fine.d/nz;
      pos.push(x,heightAt(x,z)+.035,z);color.set(endevorTownTint(x,z)??acorTint(x,z)??'#8f9b75');colors.push(color.r,color.g,color.b);
      if(i&&j){const a=j*(nx+1)+i;indices.push(a,a-nx-2,a-1,a,a-nx-1,a-nx-2);}
    }yield;
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();
  const skin=new THREE.Mesh(g,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:true}));skin.name='Endevor banks and town ground';skin.receiveShadow=true;root.add(skin);metrics.batches++;
  // Paving samples the triangles actually drawn beneath it. Sampling the
  // analytic bank again on a different grid makes flickering triangular holes.
  function pavingHeight(x,z){
    const u=(x-fine.x)*nx/fine.w,v=(z-fine.z)*nz/fine.d;
    if(u<0||u>=nx||v<0||v>=nz)return heightAt(x,z);
    const i=Math.floor(u),j=Math.floor(v),tx=u-i,tz=v-j,k=j*(nx+1)+i;
    const a=pos[k*3+1],b=pos[(k+nx+1)*3+1],c=pos[(k+1)*3+1],d=pos[(k+nx+2)*3+1];
    return tx>tz?a+(c-a)*tx+(d-c)*tz:a+(d-b)*tx+(b-a)*tz;
  }
  const fields=new Map(),batch=(x,z)=>{const key=`${Math.floor(x/150)},${Math.floor(z/150)}`;if(!fields.has(key))fields.set(key,createSceneryBuilder('Endevor holdings / '+key));return fields.get(key);};
  for(const [i,f] of ENDEVOR_FIELDS.entries()){
    const b=batch(f.x,f.z),[soil,crop]=ENDEVOR_CROPS[f.crop];
    yield* b.patchSteps(soil,fieldHeightAt,f.x,f.z,f.w,f.d,0,.07,7);
    for(let u=-f.w/2+2;u<f.w/2-2;u+=3.2)yield* b.patchSteps(crop,fieldHeightAt,f.x+u,f.z,1.65,f.d-2,0,.13,5);
    for(const sign of [-1,1])for(let u=-f.w/2+1;u<f.w/2;u+=3.5){
      if(Math.abs(u)<3)continue;const x=f.x+u,z=f.z+sign*(f.d/2+1),y=fieldHeightAt(x,z);
      b.rock('#687951',x,y+.55,z,2,.65,.72);
    }
    if(i%7===0){
      const x=f.x-f.w/2+6,z=f.z-f.d/2+7;
      endevorHouse(b,{x,z,w:7,d:10,height:3.2,seed:.2,kind:'barn'},fieldHeightAt,colliders);metrics.buildings++;
      b.rock('#b5a067',x+9,fieldHeightAt(x+9,z)+1.6,z,2.7,2,2.4);
    }
    metrics.fields++;yield;
  }
  for(const b of fields.values()){yield* b.finishSteps(root);metrics.batches++;}
  const town=createSceneryBuilder('Endevor / market, houses and bell hall');
  for(const s of ENDEVOR_BUILDINGS){endevorHouse(town,s,heightAt,colliders);metrics.buildings++;yield;}
  for(const line of ENDEVOR_ROADS)for(let i=1;i<line.length;i++){
    const a=line[i-1],b=line[i],n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/2.8),yaw=Math.atan2(b.x-a.x,b.z-a.z);
    for(let j=0;j<n;j++){
      const x=a.x+(b.x-a.x)*(j+.5)/n,z=a.z+(b.z-a.z)*(j+.5)/n;if(!endevorDry(x,z,2)||heightAt(x,z)<1)continue;
      yield* town.patchSteps('#b5aa8f',pavingHeight,x,z,5.8,3.3,yaw,.16,4);
    }
  }
  yield* town.patchSteps('#b4b09c',pavingHeight,-2118,-3239,23,22,0,.26,22);
  // Market cross, well and uneven canvas stalls leave a generous central lane.
  const wellY=heightAt(-2120,-3239);town.cylinder(P.stone,-2120,wellY,-3239,1.6,.8);
  town.cylinder(P.dark,-2120,wellY+.81,-3239,1.15,.025);
  for(const dx of [-1.7,1.7])town.block(P.oak,-2120+dx,wellY,-3239,.18,3.5,.18);
  town.roof(P.slate,-2120,wellY+3.4,-3239,4.3,3,1.4);
  for(let i=0;i<5;i++){
    const x=-2125+i*4.4,z=-3229,y=heightAt(x,z),cloth=i%2?'#7b8a69':'#aa7454';
    town.block(P.oak,x,y,z,3.2,.85,1.6);
    for(const side of [-1,1])town.block(P.oak,x+side*1.7,y,z,.12,2.8,.12);
    town.roof(cloth,x,y+2.7,z,3.8,2.7,.6);
    for(let j=0;j<3;j++)town.rock(i%2?'#b29d55':'#89664c',x+(j-1)*.8,y+1,z,.35,.25,.3);
  }
  const trees=[];
  for(const [x,z] of [[-2205,-3224],[-2099,-3271],[-2060,-3225],[-2178,-3207]]){
    if(ENDEVOR_BUILDINGS.some(s=>Math.abs(x-s.x)<s.w/2+4&&Math.abs(z-s.z)<s.d/2+4))continue;
    const y=heightAt(x,z);trees.push({id:worldTreeId('endevor-town-oak',x,z),species:'white-oak',x,z,y,height:8.1,crownRadius:3.7,trunkRadius:.32,collisionRadius:.35,collisionMinY:y,collisionMaxY:y+4,
      region:hexOwnerAt(x,z),habitat:'town green',locationName:'Endevor Town',harvestable:false});
  }
  yield* town.finishSteps(root);metrics.batches++;
  const treeView=yield* createSpeciesTreesSteps({parent:root,colliders,trees,heightAt,chunkSize:1e6,name:'Endevor / town oaks'});metrics.trees=trees.length;metrics.batches+=treeView.batches;
  const waterfront=createSceneryBuilder('Endevor / bridge, working quays and boats'),b=ENDEVOR_BRIDGE;
  // One open timber span, raised above small river traffic, with solid parapets.
  waterfront.block('#9a8769',b.x,b.y-.35,b.z,b.length,.35,b.width);
  // Break the rails where the two quays join, and stop before the street
  // junctions on the banks. A continuous rail would trap the player below it.
  for(const side of [-1,1])for(const [lo,hi] of [[-23,-18.5],[-11.5,11.5],[18.5,23]]){
    waterfront.beam(P.oak,[b.x+lo,b.y+1.05,b.z+side*(b.width/2+.1)],[b.x+hi,b.y+1.05,b.z+side*(b.width/2+.1)],.17);
    const n=Math.ceil((hi-lo)/3);for(let i=0;i<=n;i++)waterfront.block(P.oak,b.x+lo+(hi-lo)*i/n,b.y,b.z+side*(b.width/2+.1),.22,1.2,.22);
    colliders.push({x:b.x+(lo+hi)/2,z:b.z+side*(b.width/2+.16),hx:(hi-lo)/2,hz:.15,minY:b.y,maxY:b.y+1.3,kind:'wall'});
  }
  for(const dx of [-16,16]){const y=heightAt(b.x+dx,b.z);waterfront.block(P.stone,b.x+dx,y,b.z,2.7,Math.max(.3,b.y-y-.35),b.width+.4);}
  for(let u=-b.length/2;u<b.length/2;u+=1.2)waterfront.block('#766b54',b.x+u,b.y+.004,b.z,.04,.008,b.width);
  for(const q of ENDEVOR_QUAYS){
    for(let v=-q.d/2;v<q.d/2;v+=1){
      const z=q.z+v,y=endevorQuayHeight(q,z),yy=endevorQuayHeight(q,z+1);
      waterfront.sheet('#91866f',[q.x-q.w/2,y,z],[q.x-q.w/2,yy,z+1],[q.x+q.w/2,yy,z+1],[q.x+q.w/2,y,z]);
      for(const side of [-1,1])waterfront.beam(P.oak,[q.x+side*q.w/2,y-.2,z],[q.x+side*q.w/2,yy-.2,z+1],.25,.4);
    }
    for(const sign of [-1,1])for(let v=-q.d/2+1;v<q.d/2;v+=4){
      const x=q.x+sign*(q.w/2-.4),z=q.z+v;waterfront.cylinder(P.oak,x,-2,z,.23,endevorQuayHeight(q,z)+2.5);
    }
    for(let j=0;j<3;j++){
      const x=q.x+(j-1)*.95,z=q.z+q.d/2-2,y=endevorQuayHeight(q,z);waterfront.cylinder('#927950',x,y,z,.4,.9);waterfront.cylinder(P.dark,x,y+.17,z,.415,.08);waterfront.cylinder(P.dark,x,y+.69,z,.415,.08);
    }
  }
  function boat(x,z,length,yaw,sail=false){
    const water=endevorWaterAt(x,z)??.06,w=length*.19;
    waterfront.frame(x,water+.05,z,yaw,()=>{
      waterfront.sheet('#594837',[-w*.7,0,-length*.4],[w*.7,0,-length*.4],[w*.7,0,length*.35],[-w*.7,0,length*.35]);
      for(const side of [-1,1]){
        waterfront.sheet('#7d5f3e',[side*w*.7,0,-length*.4],[side*w,1.2,-length*.42],[side*w,1.2,length*.3],[side*w*.7,0,length*.35]);
        waterfront.triangle('#927348',[side*w,1.2,length*.3],[0,1.55,length*.55],[side*w*.7,0,length*.35]);
        waterfront.beam(P.oak,[side*w,1.22,-length*.42],[side*w,1.22,length*.3],.16);
      }
      waterfront.sheet('#806545',[-w,1.2,-length*.42],[-w*.7,0,-length*.4],[w*.7,0,-length*.4],[w,1.2,-length*.42]);
      for(const v of [-.23,0,.22])waterfront.block('#a48e62',0,.72,length*v,w*1.7,.14,.55);
      if(sail){
        waterfront.cylinder(P.oak,0,0,0,.15,length*.85);
        waterfront.beam(P.oak,[-w*1.7,length*.7,0],[w*1.7,length*.7,0],.12);
        waterfront.sheet('#d2c6a3',[-w*1.6,length*.69,0],[w*1.6,length*.69,0],[w*1.3,length*.35,.7],[-w*1.3,length*.35,.7]);
        for(const side of [-1,1])waterfront.beam('#a19070',[0,length*.8,0],[side*w,1.2,-length*.38],.035);
      }
    });metrics.boats++;
  }
  boat(-2149,-3308,13,.12,true);boat(-2152,-3281,8,.04);boat(-2139,-3323,10,-.24,true);boat(-2143,-3247,5,.2);
  yield* waterfront.finishSteps(root);metrics.batches++;
  root.userData.endevor=metrics;return {root,metrics,update:()=>{}};
}

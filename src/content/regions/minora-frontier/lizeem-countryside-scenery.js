import * as THREE from 'three';
import {createSceneryBuilder} from '../../../world/scenery/scenery-builder.js';
import {groundFace} from '../../../world/scenery/ground-face.js';
import {LIZEEM_FIELDS,fieldPoint} from './lizeem-countryside.js';

const palettes={grain:['#ab9e69','#aca16e','#b2a571'],meadow:['#8e9f67','#96a56e','#9baa72'],fallow:['#a19773','#a59b77','#9c936d']};
const noise=(x,z)=>{const v=Math.sin(x*127.1+z*311.7)*43758.5453;return v-Math.floor(v);};
export function* createLizeemCountrysideSteps({parent,heightAt,terrainSurface,enabledRegion=()=>true,canPlace=()=>true,fields=LIZEEM_FIELDS}){
  const root=new THREE.Group();root.name='Lizeem working countryside';parent.add(root);
  const metrics={fields:0,triangles:0,batches:0,cropTufts:0};
  const batches=new Map();
  for(const f of fields){
    if(!enabledRegion(f.region))continue;
    if(!batches.has(f.region))batches.set(f.region,createSceneryBuilder(f.region+' / working fields'));
    const earth=batches.get(f.region),plants=earth;
    const nx=Math.ceil(f.w/5),nz=Math.ceil(f.d/5),point=(i,j)=>fieldPoint(f,-f.w/2+f.w*i/nx,-f.d/2+f.d*j/nz);
    for(let i=0;i<nx;i++)for(let j=0;j<nz;j++){
      yield;
      const corners=[point(i,j),point(i,j+1),point(i+1,j+1),point(i+1,j)];
      if(!corners.every(p=>canPlace(p,f)))continue;
      yield* groundFace(earth,palettes[f.kind][i%3],corners,heightAt,terrainSurface,.05);
    }
    // Sparse crossed blades read as crops at foot level; the broad soil strips
    // carry the pattern from the tower. No per-frame crop objects or shadows.
    for(let u=-f.w/2+2;u<f.w/2-2;u+=f.kind==='grain'?2.1:5.5){
      for(let v=-f.d/2+2;v<f.d/2-2;v+=f.kind==='grain'?2.2:7){
        yield;
        const jitter=noise(u+f.index,v),p=fieldPoint(f,u+(jitter-.5)*.9,v+(jitter-.5)*.7);
        if(!canPlace(p,f))continue;
        const y=heightAt(p.x,p.z)+.055;
        if(f.kind==='grain'){
          const h=.47+jitter*.3;
          for(let k=0;k<2;k++){
            const a=f.yaw+k*Math.PI/2,dx=Math.cos(a)*.31,dz=Math.sin(a)*.31;
            plants.sheet(jitter>.5?'#c3ae70':'#b4a061',[p.x-dx,y,p.z-dz],[p.x+dx,y,p.z+dz],
              [p.x+dx*.4,y+h,p.z+dz*.4],[p.x-dx*.4,y+h*.9,p.z-dz*.4]);
          }
          metrics.cropTufts++;
        }else if(f.kind==='meadow'&&jitter>.73)plants.rock('#b3a16d',p.x,y+.16,p.z,.65,.2,.32,f.yaw);
      }
    }
    // Low boundary hedge fragments, with broad gates at each end and breaks
    // along the side. They frame working land without blocking horse travel.
    for(const side of [-1,1])for(let v=-f.d/2+7;v<f.d/2-7;v+=6){
      yield;const p=fieldPoint(f,side*(f.w/2+.2),v);
      if(!canPlace(p,f))continue;
      plants.rock('#778651',p.x,heightAt(p.x,p.z)+.35,p.z,.72,.5,1.6,f.yaw);
    }
    metrics.fields++;
  }
  for(const b of batches.values()){const mesh=yield* b.finishSteps(root,{castShadow:false});if(mesh){metrics.batches++;metrics.triangles+=b.vertexCount/3;}}
  return {root,metrics};
}

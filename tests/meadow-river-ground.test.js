import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceModule} from './module-loader.js';
import {ISAREOS_BECKS,NETHEREUM_STREAMS,MENETH_BECKS,LIZEEM_HEAD} from '../src/content/regions/western-regions/west-regions.js';
import {WEST_PROFILES,westWaterSurface} from '../src/content/regions/western-regions/west-ground.js';
import {groundWithRiver} from '../src/world/terrain/world-terrain.js';
import {finishBuild} from '../src/world/loading/build-steps.js';

const THREE=await sourceModule('../vendor/three.module.js');
const {createMeadowRiverGroundSteps}=await sourceModule('../src/content/regions/western-regions/meadow-river-ground.js');

test('narrow meadow rivers are exposed by bounded terrain refinement, including the Meneth valleys',()=>{
  const courses=[...ISAREOS_BECKS,...NETHEREUM_STREAMS,...MENETH_BECKS,LIZEEM_HEAD],cells=new Set(),step=7.1;
  for(const c of courses){const b=c.bounds;
    for(let x=Math.floor((b.minX-18)/step);x<=Math.ceil((b.maxX+18)/step);x++)
      for(let z=Math.floor((b.minZ-18)/step);z<=Math.ceil((b.maxZ+18)/step);z++)cells.add(x+','+z);
  }
  const positions=[],indices=[];
  for(const cell of cells){const [i,j]=cell.split(',').map(Number),base=positions.length/3;
    for(const [a,b] of [[0,0],[0,1],[1,0],[1,1]]){const x=(i+a)*step,z=(j+b)*step;positions.push(x,groundWithRiver(x,z),z);}
    indices.push(base,base+1,base+2,base+2,base+1,base+3);
  }
  const root=new THREE.Group(),g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);
  const material=new THREE.MeshBasicMaterial();root.add(new THREE.Mesh(g,material));
  const result=finishBuild(createMeadowRiverGroundSteps({THREE,terrainRoot:root,heightAt:groundWithRiver,coarseHeightAt:groundWithRiver}));
  const hidden=[];let checked=0;
  for(const course of courses){const profile=WEST_PROFILES.get(course.id);
    for(let i=1;i<profile.length;i++){const a=profile[i-1],b=profile[i];
      if(Math.min(a.half,b.half)<.8||(course.fadeBed&&b.along>.65))continue;
      for(const t of [0,.25,.5,.75,1]){const x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t,water=westWaterSurface(x,z);
        if(water===null)continue;checked++;
        if(result.heightAt(x,z)>=water)hidden.push({id:course.id,x,z});
      }
    }
  }
  assert.ok(checked>500);assert.deepEqual(hidden,[],'wet stream centres remain visible between profile samples');
  assert.ok(result.metrics.triangles<300000,'local refinement stays below its geometry budget');
  root.traverse(m=>m.geometry?.dispose());material.dispose();
});

import { finishBuild } from '../../../world/loading/build-steps.js';
import * as THREE from 'three';
import { IBENWOOD } from './ibenwood-pilot.js';
import { drapeRoadOnTerrainSteps } from '../../../world/terrain/terrain-road.js';

export const GROVE_GROUND_RECT = { minX:IBENWOOD.x-88,maxX:IBENWOOD.x+88,minZ:IBENWOOD.z-88,maxZ:IBENWOOD.z+88 };
// Partition triangles at the patch boundary. Original vertices and remote faces
// retain their positions; interpolated cut vertices preserve the displayed plane.
export function cutGroveGround(...args) { return finishBuild(cutGroveGroundSteps(...args)); }

export function* cutGroveGroundSteps(geometry) {
  let buildWork = 0;
  const r=GROVE_GROUND_RECT,position=geometry.attributes.position;
  if(!geometry.boundingBox)geometry.computeBoundingBox();const b=geometry.boundingBox;
  if(b.max.x<=r.minX||b.min.x>=r.maxX||b.max.z<=r.minZ||b.min.z>=r.maxZ)return geometry;
  const names=Object.keys(geometry.attributes),data=Object.fromEntries(names.map(n=>[n,[]])),indices=[],remap=new Map();
  const vertex=i=>Object.fromEntries(names.map(n=>{const a=geometry.attributes[n];return [n,Array.from({length:a.itemSize},(_,k)=>a.array[i*a.itemSize+k])];}));
  function retain(i){if(remap.has(i))return remap.get(i);const at=data.position.length/3;for(const n of names){const a=geometry.attributes[n];for(let k=0;k<a.itemSize;k++)data[n].push(a.array[i*a.itemSize+k]);}remap.set(i,at);return at;}
  const planes=[[0,r.minX,1],[0,r.maxX,-1],[2,r.minZ,1],[2,r.maxZ,-1]];
  function split(poly,axis,edge,sign){
    const inside=[],outside=[];
    for(let i=0;i<poly.length;i++){
      const a=poly[i],b=poly[(i+1)%poly.length],da=(a.position[axis]-edge)*sign,db=(b.position[axis]-edge)*sign;
      (da>=0?inside:outside).push(a);
      if((da>=0)!==(db>=0)){const t=da/(da-db),v=Object.fromEntries(names.map(n=>[n,a[n].map((value,k)=>value+(b[n][k]-value)*t)]));inside.push(v);outside.push(v);}
    }return [inside,outside];
  }
  function emit(poly){if(poly.length<3)return;const first=data.position.length/3;for(const v of poly)for(const n of names)data[n].push(...v[n]);for(let k=1;k+1<poly.length;k++)indices.push(first,first+k,first+k+1);}
  const source=geometry.index.array;
  for(let i=0;i<source.length;i+=3){ if (++buildWork % 32 === 0) yield;
    const ids=[source[i],source[i+1],source[i+2]],poly=ids.map(vertex),xs=poly.map(v=>v.position[0]),zs=poly.map(v=>v.position[2]);
    if(Math.max(...xs)<=r.minX||Math.min(...xs)>=r.maxX||Math.max(...zs)<=r.minZ||Math.min(...zs)>=r.maxZ){indices.push(...ids.map(retain));continue;}
    let remaining=poly;for(const plane of planes){if(remaining.length<3)break;const [inside,outside]=split(remaining,...plane);emit(outside);remaining=inside;}
  }
  const result=new THREE.BufferGeometry();for(const n of names)result.setAttribute(n,new THREE.Float32BufferAttribute(data[n],geometry.attributes[n].itemSize));result.setIndex(indices);result.computeBoundingBox();result.computeBoundingSphere();return result;
}

export function createGroveGround(...args) { return finishBuild(createGroveGroundSteps(...args)); }

export function* createGroveGroundSteps({heightAt,terrain,terrainRoot}) {
  let buildWork = 0;
  const r=GROVE_GROUND_RECT,edge=terrain.xs[0],west=r.minX-80;
  const apronXs=[];for(let x=west;x<edge;x+=8)apronXs.push(x);apronXs.push(edge);
  const xs=[...apronXs.slice(0,-1),...terrain.xs.filter(x=>x>=Math.min(edge,r.minX-16)&&x<=r.maxX+16)],zs=terrain.zs.filter(z=>z>=r.minZ-16&&z<=r.maxZ+16),columns=xs.length;
  const positions=[],colors=[],indices=[];
  for(let j=0;j<zs.length;j++)for(let i=0;i<columns;i++){ if (++buildWork % 32 === 0) yield;
    const x=xs[i],z=zs[j],old=terrain.xs.indexOf(x),y=old<0?heightAt(x,z):terrain.positions[(terrain.zs.indexOf(z)*terrain.xs.length+old)*3+1];
    positions.push(x,y,z);const c=new THREE.Color('#718352');colors.push(c.r,c.g,c.b);
    if(i<apronXs.length-1&&j<zs.length-1){const k=j*columns+i;indices.push(k,k+columns,k+1,k+1,k+columns,k+columns+1);}
  }
  const base=new THREE.BufferGeometry();base.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));base.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));base.setIndex(indices);
  const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:true});
  const apron=new THREE.Mesh(yield* cutGroveGroundSteps(base),material);apron.name='Atlas terrain continuation behind grove pilot';apron.receiveShadow=true;
  // Clip only the intersecting renderer tiles; no change to terrain sampling phase.
  const terrainMeshes=[];terrainRoot?.traverse(mesh=>{if(mesh.isMesh)terrainMeshes.push(mesh);});
  for(const mesh of terrainMeshes){const old=mesh.geometry,next=yield* cutGroveGroundSteps(old);if(next!==old)mesh.geometry=next;}
  const finePositions=[],fineIndices=[],n=89;
  for(let j=0;j<n;j++)for(let i=0;i<n;i++){ if (++buildWork % 32 === 0) yield;
    const x=r.minX+i*2,z=r.minZ+j*2;finePositions.push(x,heightAt(x,z)+.025,z);
    if(i<n-1&&j<n-1){const k=j*n+i;fineIndices.push(k,k+n,k+1,k+1,k+n,k+n+1);}
  }
  // The outer 8m blends to the actual underlying triangle planes. Drape clipping
  // inserts their boundary intersections, so both sides share the same seam.
  const strength=(x,z)=>Math.max(0,1-Math.min(x-r.minX,r.maxX-x,z-r.minZ,r.maxZ-z)/8);
  const fine=yield* drapeRoadOnTerrainSteps(finePositions,fineIndices,xs,zs,positions,0,strength);
  const ground=new THREE.BufferGeometry();ground.setAttribute('position',new THREE.Float32BufferAttribute(fine.positions,3));ground.setIndex(fine.indices);
  ground.computeVertexNormals();
  return {floor:new THREE.Mesh(ground,material.clone()),apron,base:{xs,zs,positions},rect:r};
}

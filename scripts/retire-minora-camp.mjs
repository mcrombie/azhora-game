/** One-time removal of the retired Minora camp from an older prepared lookout.
 * The camp was spatially batched with the city. Keep every other index and all
 * original vertex data; append only the cleaned index buffer. No world build. */
import {registerHooks} from 'node:module';
import {readFile,writeFile} from 'node:fs/promises';
import {gunzipSync,gzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import * as THREE from '../vendor/three.module.js';
registerHooks({resolve(specifier,context,next){return next(specifier==='three'?new URL('../vendor/three.module.js',import.meta.url).href:specifier,context);}});
const {readLookoutAttribute}=await import('../src/content/regions/minora-frontier/lookout-scene.js');
const sourceName='The Blood Prince’s field army muster';
const colors=Object.fromEntries(['#b2ab86','#743c47','#9a7266','#726052','#385052','#852f3b','#c6ad6b'].map(c=>[c,new THREE.Color(c).toArray()]));
const tents=[[-2500,47,8,5],[-2483,43,8,5],[-2464,43,10,7],[-2500,111,8,5],[-2483,114,8,5],[-2464,114,8,5]];
export function isRetiredCampTriangle(positions,colors,indices){
 const points=indices.map(i=>({x:positions[i*3],y:positions[i*3+1],z:positions[i*3+2],i}));
 const tinted=(...hexes)=>hexes.some(hex=>points.every(p=>campColor(hex).every((v,k)=>Math.abs(v-colors[p.i*3+k])<.008)));
 const box=(x,z,hx,hz,minY=20.5,maxY=30)=>points.every(p=>Math.abs(p.x-x)<=hx+.15&&Math.abs(p.z-z)<=hz+.15&&p.y>=minY&&p.y<=maxY+.15);
 if(tinted('#b2ab86')&&box(-2474,83,33.5,47.5,21.15,21.45))return true;
 if(tinted('#743c47','#9a7266')&&tents.some(([x,z,w,h])=>box(x,z,w/2,5,21.15,21.3+h)))return true;
 if(tinted('#726052')&&tents.some(([x,z,w,h])=>box(x,z,w/2+2,.07,21.15,21.3+h)))return true;
 if(tinted('#726052','#852f3b','#c6ad6b')&&[[-2453,57],[-2498,63]].some(([x,z])=>box(x+1,z,1.15,.1,21.15,28.9)))return true;
 return tinted('#726052','#385052')&&[84,87,90,93,96].some(z=>box(-2453,z,.9,.9,21.15,22.7));
}
const campColor=hex=>colors[hex];
export function retireMinoraCamp(manifest,buffer){
 const out=structuredClone(manifest),pieces=[Buffer.from(buffer)],rows=[];let offset=buffer.byteLength,removed=0;
 const isCamp=s=>s.endsWith('/ '+sourceName)||s===sourceName;
 for(const part of out.meshes){
  if(!(part.sources??[part.name]).some(isCamp))continue;
  if(part.instances||part.matrix.some((v,i)=>Math.abs(v-(i%5===0?1:0))>1e-8))throw Error('Camp cleanup requires the existing world-coordinate static batch');
  if(out.meshes.filter(p=>p.geometry===part.geometry).length!==1)throw Error('Camp batch geometry is unexpectedly shared');
  const g=out.geometries[part.geometry],p=g.attributes.position,c=g.attributes.color;
  if(!g.index||!c)throw Error('Camp batch needs indexed colored geometry');
  const raw=readLookoutAttribute(buffer,p),positions=Float32Array.from(raw,(v,i)=>p.quantization?p.quantization.offset[i%3]+v*p.quantization.scale[i%3]:v);
  const colors=Float32Array.from(readLookoutAttribute(buffer,c),v=>c.normalized?v/255:v);
  const original=readLookoutAttribute(buffer,g.index),kept=[];let count=0;
  for(let i=0;i<original.length;i+=3){
   const triangle=[original[i],original[i+1],original[i+2]];
   if(isRetiredCampTriangle(positions,colors,triangle))count++;else kept.push(...triangle);
  }
  if(!count)throw Error('Camp source exists but no matching triangles were found; refusing an unverified edit');
  const padding=(4-offset%4)%4;if(padding){pieces.push(Buffer.alloc(padding));offset+=padding;}
  const index=new Uint32Array(kept),data=Buffer.from(index.buffer);
  g.index={offset,length:index.length,type:'Uint32Array',encodedBytes:data.length,codec:null,itemSize:1};
  pieces.push(data);offset+=data.length;removed+=count;
  part.sources=(part.sources??[part.name]).filter(s=>!isCamp(s));
  rows.push({geometry:part.geometry,removedTriangles:count,retainedTriangles:index.length/3});
 }
 if(removed){
  out.triangles-=removed;out.bytes=offset;
  out.retiredScenery=[...new Set([...(out.retiredScenery??[]),'minora-field-army'])];
 }
 return {manifest:out,buffer:Buffer.concat(pieces),removed,rows};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const directory=new URL('../assets/lookout/',import.meta.url),manifest=JSON.parse(await readFile(new URL('landscape.json',directory),'utf8'));
 const bytes=gunzipSync(await readFile(new URL('landscape.bin.gz',directory)));
 const result=retireMinoraCamp(manifest,bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
 if(result.removed&&!process.argv.includes('--check')){
  const compressed=gzipSync(result.buffer,{level:9});result.manifest.downloadBytes=compressed.length;
  await writeFile(new URL('landscape.bin.gz',directory),compressed);
  await writeFile(new URL('landscape.json',directory),JSON.stringify(result.manifest));
 }
 console.log(JSON.stringify({check:process.argv.includes('--check'),removed:result.removed,rows:result.rows}));
}

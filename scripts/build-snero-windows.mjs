// Prepare real 3D regional scenery, not photographs. Each region is built in a
// separate process so the offline world's terrain caches are released between it.
import {registerHooks} from 'node:module';
import {spawnSync} from 'node:child_process';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {SNERO_WINDOWS} from '../src/content/regions/minora-frontier/snero-window-views.js';
const id=process.argv.find(a=>a.startsWith('--region='))?.slice(9);
if(!id){
  for(const view of SNERO_WINDOWS){
    const run=spawnSync(process.execPath,[fileURLToPath(import.meta.url),'--region='+view.id],{stdio:'inherit',windowsHide:true});
    if(run.status!==0)process.exit(run.status??1);
  }
  const sources=[];
  for(const view of SNERO_WINDOWS){
    const manifest=JSON.parse(await readFile(new URL(`../assets/tower-windows/${view.id}/landscape.json`,import.meta.url),'utf8'));
    sources.push({id:view.id,region:view.region,place:view.place,geometry:`${view.id}/landscape.json`,bytes:manifest.downloadBytes,triangles:manifest.triangles});
  }
  await writeFile(new URL('../assets/tower-windows/sources.json',import.meta.url),JSON.stringify({purpose:'Live 3D regional windows with viewer-relative perspective',regenerate:'node scripts/build-snero-windows.mjs',sources},null,2)+'\n');
}else{
  const view=SNERO_WINDOWS.find(v=>v.id===id);if(!view)throw Error('Unknown window destination');
  registerHooks({resolve(s,c,n){return n(s==='three'?new URL('../vendor/three.module.js',import.meta.url).href:s,c);}});
  globalThis.requestAnimationFrame=cb=>setTimeout(()=>cb(performance.now()),0);globalThis.cancelAnimationFrame=clearTimeout;
  const THREE=await import('../vendor/three.module.js');
  const {createWorld}=await import('../src/world.js');
  const {snapshotLookoutScene}=await import('../src/dev/tools/lookout-scene-export.js');
  const {batchLookout}=await import('./batch-lookout.mjs');
  const {MeshoptEncoder}=await import('meshoptimizer');await MeshoptEncoder.ready;
  const scene=new THREE.Scene(),begun=performance.now();console.log('Building actual '+view.place+' geometry');
  const progress=setInterval(()=>console.log(view.place+': '+Math.round((performance.now()-begun)/1000)+'s'),30000);
  try{
    const world=createWorld(scene,{enabledRegions:[view.region],initialRegion:view.region,regionalFineGround:true});
    world.loading.setTravelBudget(32);await world.loading.ensureRegion(view.region);world.loading.stop();scene.updateMatrixWorld(true);
    const source=batchLookout(snapshotLookoutScene(scene,{center:{x:view.eye[0],z:view.eye[2]},maxDistance:2600}));
    const parts=[],used=new Map(),geometries=[];let offset=0;
    function pack(array,itemSize=1,mode='ATTRIBUTES'){
      const original=Buffer.from(array.buffer,array.byteOffset,array.byteLength),at=offset;
      const count=array.length/itemSize,elementBytes=itemSize*array.BYTES_PER_ELEMENT,stride=mode==='TRIANGLES'?array.BYTES_PER_ELEMENT:Math.ceil(elementBytes/4)*4;
      const padded=new Uint8Array(count*stride);
      for(let i=0;i<count;i++)padded.set(original.subarray(i*elementBytes,(i+1)*elementBytes),i*stride);
      const data=MeshoptEncoder.encodeGltfBuffer(padded,count,stride,mode);parts.push(data);offset+=data.length;
      const pad=(4-offset%4)%4;if(pad){parts.push(Buffer.alloc(pad));offset+=pad;}
      return {offset:at,length:array.length,type:array.constructor.name,itemSize,normalized:false,encodedBytes:data.length,codec:{mode,count,stride,elementBytes}};
    }
    function geometry(id){
      if(used.has(id))return used.get(id);const g=source.geometries[id],next=geometries.length;used.set(id,next);
      geometries.push({...g,attributes:Object.fromEntries(Object.entries(g.attributes).map(([k,a])=>[k,{...pack(a.array,a.itemSize),normalized:a.normalized}])),index:g.index?pack(g.index.array,1,'TRIANGLES'):null});return next;
    }
    const meshes=source.meshes.map(p=>({...p,geometry:geometry(p.geometry),instances:p.instances?pack(p.instances,16):null,instanceColors:p.instanceColors?pack(p.instanceColors,3):null}));
    const raw=Buffer.concat(parts),compressed=gzipSync(raw,{level:9}),sourceHash=createHash('sha256').update(raw).update(JSON.stringify(source.materials)).update(JSON.stringify(meshes)).digest('hex');
    const manifest={version:2,source:'actual regional world geometry',sourceHash,regions:[{id:view.region,name:view.place}],geometries,materials:source.materials,meshes,bytes:offset,downloadBytes:compressed.length,
      triangles:meshes.reduce((n,p)=>{const g=geometries[p.geometry];return n+(g.index?.length??g.attributes.position.length/3)/3*(p.instances?.length/16||1);},0)};
    const out=new URL(`../assets/tower-windows/${id}/`,import.meta.url);await mkdir(out,{recursive:true});await writeFile(new URL('landscape.json',out),JSON.stringify(manifest));await writeFile(new URL('landscape.bin.gz',out),compressed);
    console.log(JSON.stringify({id,seconds:Math.round((performance.now()-begun)/1000),meshes:meshes.length,triangles:manifest.triangles,bytes:offset,downloadBytes:compressed.length}));
  }finally{clearInterval(progress);}
}

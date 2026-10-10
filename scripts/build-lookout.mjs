import * as nodeModule from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {serialize,deserialize} from 'node:v8';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url)),out=path.join(root,'assets/lookout');
const sourceText=async name=>(await readFile(name,'utf8')).replace(/\r\n/g,'\n');
export async function lookoutFingerprint(){
  const hash=createHash('sha256');
  // Fingerprint only the public dependency graph actually used to build this
  // scene. Changing dialogue or the loader must not rebake the landscape.
  const sources=new Map();
  async function collect(name){
    if(sources.has(name))return;
    if(!/^(src|vendor)\//.test(name)||name.includes('..')||name.includes('reference-private'))throw Error('Nonpublic scene source');
    const data=await sourceText(path.join(root,name));sources.set(name,data);
    for(const match of data.matchAll(/(?:from\s*|import\s*(?:\(\s*)?)['"](\.[^'"]+)['"]/g)){
      const child=path.posix.normalize(path.posix.join(path.posix.dirname(name),match[1]));await collect(child);
    }
  }
  for(const name of ['src/dev/tools/lookout-landscape-bake.js','src/dev/tools/lookout-scene-export.js','vendor/three.module.js'])await collect(name);
  for(const [name,data]of [...sources].sort((a,b)=>a[0].localeCompare(b[0]))){hash.update(name);hash.update(data);}
  const sceneHash=hash.copy().digest('hex');hash.update(await sourceText(new URL('./build-lookout.mjs',import.meta.url)));hash.update(await sourceText(new URL('./optimize-lookout.mjs',import.meta.url)));hash.update(await sourceText(new URL('./batch-lookout.mjs',import.meta.url)));hash.update(JSON.parse(await readFile(new URL('../package.json',import.meta.url))).devDependencies.meshoptimizer);
  const sourceHash=hash.digest('hex');return {sceneHash,sourceHash};
}
export async function ensureLookoutLandscape({force=false}={}){
  const {sceneHash,sourceHash}=await lookoutFingerprint();let prior;
  try{prior=JSON.parse(await readFile(path.join(out,'landscape.json'),'utf8'));}catch{}
  if(prior?.sourceHash===sourceHash&&!force){try{await readFile(path.join(out,'landscape.bin.gz'));console.log('Lookout landscape is current.');return prior;}catch{}}
  const {MeshoptEncoder}=await import('meshoptimizer');const {simplifyLookout}=await import('./optimize-lookout.mjs');const {batchLookout}=await import('./batch-lookout.mjs');
  if(!nodeModule.registerHooks)throw Error('Rebuilding lookout scenery requires Node 22.15 or newer. Run npm install, then npm run build:lookout locally and include the updated assets.');
  nodeModule.registerHooks({resolve(specifier,context,next){return next(specifier==='three'?new URL('../vendor/three.module.js',import.meta.url).href:specifier,context);}});
  globalThis.requestAnimationFrame=callback=>setTimeout(()=>callback(performance.now()),0);
  globalThis.cancelAnimationFrame=clearTimeout;
  const {snapshotLookoutScene,optimizeLookoutSnapshot}=await import('../src/dev/tools/lookout-scene-export.js');
  const cache=path.join(root,'.tmpchk/lookout-source-'+sceneHash+'.bin');let source;
  try{source=deserialize(await readFile(cache));console.log('Using cached actual regional scene.');}catch{}
  if(!source){
    const {bakeLookoutLandscape}=await import('../src/dev/tools/lookout-landscape-bake.js');
    const begun=performance.now();
    const report=setInterval(()=>console.log('Offline regional preparation: '+Math.round((performance.now()-begun)/1000)+'s'),30000);
    try{
      const {scene,world,...summary}=await bakeLookoutLandscape(console.log);
      source={...snapshotLookoutScene(scene),...summary};
      await mkdir(path.dirname(cache),{recursive:true});await writeFile(cache,serialize(source));
    }finally{clearInterval(report);}
  }
  async function packScene(snapshot,destination,reference=false){
    const parts=[],geometryMap=new Map(),geometries=[];let offset=0;await MeshoptEncoder.ready;
    function pack(array,itemSize=1,mode='ATTRIBUTES'){
      const original=Buffer.from(array.buffer,array.byteOffset,array.byteLength),at=offset;
      let encoded=original,codec=null;
      if(!reference){
        const count=array.length/itemSize,elementBytes=itemSize*array.BYTES_PER_ELEMENT;
        const stride=mode==='TRIANGLES'?array.BYTES_PER_ELEMENT:Math.ceil(elementBytes/4)*4;
        const padded=new Uint8Array(count*stride);
        for(let i=0;i<count;i++)padded.set(original.subarray(i*elementBytes,(i+1)*elementBytes),i*stride);
        encoded=MeshoptEncoder.encodeGltfBuffer(padded,count,stride,mode);
        codec={mode,count,stride,elementBytes};
      }
      parts.push(encoded);offset+=encoded.length;const pad=(4-offset%4)%4;if(pad){parts.push(Buffer.alloc(pad));offset+=pad;}
      return {offset:at,length:array.length,type:array.constructor.name,encodedBytes:encoded.length,codec};
    }
    function geometry(id){
      if(geometryMap.has(id))return geometryMap.get(id);
      const g=snapshot.geometries[id],next=geometries.length;geometryMap.set(id,next);
      geometries.push({...g,attributes:Object.fromEntries(Object.entries(g.attributes).map(([k,a])=>{
        let array=a.array,normalized=a.normalized,quantization;
        if(!reference&&k==='position'){
          const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
          for(let i=0;i<array.length;i++){const axis=i%3;min[axis]=Math.min(min[axis],array[i]);max[axis]=Math.max(max[axis],array[i]);}
          const scale=max.map((v,i)=>(v-min[i])/65535||1),packed=new Uint16Array(array.length);
          for(let i=0;i<array.length;i++)packed[i]=Math.round((array[i]-min[i%3])/scale[i%3]);
          array=packed;quantization={offset:min,scale};
        }
        if(!reference&&k==='normal'){array=Int8Array.from(array,v=>Math.max(-127,Math.min(127,Math.round(v*127))));normalized=true;}
        if(!reference&&k==='color'){array=Uint8Array.from(array,v=>Math.max(0,Math.min(255,Math.round(v*255))));normalized=true;}
        return [k,{...pack(array,a.itemSize),itemSize:a.itemSize,normalized,quantization}];
      })),index:g.index?{...pack(g.index.array,1,'TRIANGLES'),itemSize:1}:null});return next;
    }
    const meshes=snapshot.meshes.map(p=>({...p,geometry:geometry(p.geometry),instances:p.instances?pack(p.instances,16):null,instanceColors:p.instanceColors?pack(p.instanceColors,3):null}));
    const triangles=meshes.reduce((n,m)=>{const g=geometries[m.geometry];return n+(g.index?.length??g.attributes.position.length/3)/3*(m.instances?.length/16||1);},0);
    const compressed=gzipSync(Buffer.concat(parts),{level:9});
    const manifest={version:2,sourceHash,sceneHash,reference,regions:source.regions,bounds:source.bounds,optimization:snapshot.optimization??null,
      geometries,materials:snapshot.materials,meshes,triangles,bytes:offset,downloadBytes:compressed.length};
    await mkdir(destination,{recursive:true});await writeFile(path.join(destination,'landscape.bin.gz'),compressed);await writeFile(path.join(destination,'landscape.json'),JSON.stringify(manifest));
    console.log(JSON.stringify({reference,meshes:meshes.length,geometries:geometries.length,triangles,bytes:offset,downloadBytes:compressed.length}));return manifest;
  }
  // Test-only unpruned rendering of the actual builders, never published.
  await packScene(source,path.join(root,'tests/artifacts/lookout-reference'),true);
  return packScene(batchLookout(await simplifyLookout(optimizeLookoutSnapshot(source))),out);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await ensureLookoutLandscape({force:process.argv.includes('--force')});

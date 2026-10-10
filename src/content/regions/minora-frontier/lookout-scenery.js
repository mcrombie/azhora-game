import {assembleLookoutScene} from './lookout-scene.js';
let prepared;
export async function fetchLookoutLandscape(url){
  const begun=performance.now(),response=await fetch(url);
  if(!response.ok)throw Error('The lookout landscape manifest could not load.');
  const manifest=await response.json();if(manifest.version!==2)throw Error('Unsupported lookout landscape.');
  const binary=await fetch(new URL('landscape.bin.gz?v='+manifest.sourceHash,url));
  if(!binary.ok)throw Error('The lookout landscape could not load.');
  const buffer=await new Response(binary.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  if(buffer.byteLength!==manifest.bytes)throw Error('The lookout landscape is incomplete.');
  return {manifest,buffer,loadMs:Math.round(performance.now()-begun)};
}
export function loadLookoutLandscape(){
  prepared??=fetchLookoutLandscape(new URL('../../../../assets/lookout/landscape.json',import.meta.url)).catch(error=>{prepared=null;throw error;});return prepared;
}
export async function createLookoutScenery(parent){
  const {manifest,buffer,loadMs}=await loadLookoutLandscape(),begun=performance.now();
  const built=assembleLookoutScene(manifest,buffer),{root,entries}=built;root.visible=false;
  parent.add(root);const assemblyMs=Math.round(performance.now()-begun);
  const details={prepared:true,sourceHash:manifest.sourceHash,sceneHash:manifest.sceneHash,
    triangles:entries.reduce((n,e)=>n+e.triangles,0),drawCalls:entries.length,
    totalTriangles:manifest.triangles,bytes:manifest.bytes,downloadBytes:manifest.downloadBytes,loadMs,assemblyMs,bounds:manifest.bounds,
    regions:manifest.regions,optimization:manifest.optimization,
    landmarks:['Pyra','Kethorn','Ambron','Ibenwood regional forest'].filter(name=>entries.some(e=>e.part.name.includes(name)))};
  return {...built,state:()=>({...details}),
    async reference(url){
      const data=await fetchLookoutLandscape(url),other=assembleLookoutScene(data.manifest,data.buffer);
      other.root.name='Lookout reference / actual regional builders';parent.add(other.root);root.visible=false;
      return {dispose(){other.dispose();root.visible=true;}};
    }};
}

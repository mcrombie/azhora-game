import * as THREE from 'three';
import {regionAt} from '../../world/terrain/region-world.js';
import {LOOKOUT} from '../../app/exploration/tower-state.js';

// Rendering data only: no actor, collider, script or saved state serialization.
// Geometries remain shared by tree instances.
export function snapshotLookoutScene(scene){
  const geometries=[],materials=[],meshes=[],geometryIds=new Map(),materialIds=new Map();
  const sphere=new THREE.Sphere();
  const attribute=a=>a?{array:a.array.slice(),itemSize:a.itemSize,normalized:a.normalized}:null;
  function geometry(g){
    if(geometryIds.has(g))return geometryIds.get(g);
    g.computeBoundingSphere();const id=geometries.length;geometryIds.set(g,id);
    geometries.push({attributes:Object.fromEntries(Object.entries(g.attributes).filter(([k])=>['position','normal','color','uv'].includes(k)).map(([k,a])=>[k,attribute(a)])),
      index:attribute(g.index),groups:g.groups,sphere:[...g.boundingSphere.center.toArray(),g.boundingSphere.radius]});return id;
  }
  function material(m){
    if(materialIds.has(m))return materialIds.get(m);
    const id=materials.length;materialIds.set(m,id);
    const data={type:m.isShaderMaterial?'shader':m.isMeshBasicMaterial?'basic':'standard'};
    for(const k of ['color','emissive'])if(m[k])data[k]=m[k].toArray();
    for(const k of ['roughness','metalness','emissiveIntensity','opacity','transparent','side','flatShading','vertexColors','depthWrite','depthTest','polygonOffset','polygonOffsetFactor','polygonOffsetUnits','fog'])if(m[k]!==undefined)data[k]=m[k];
    if(m.isShaderMaterial){
      data.vertexShader=m.vertexShader;data.fragmentShader=m.fragmentShader;data.uniforms={};
      for(const [k,{value:v}] of Object.entries(m.uniforms)){
        if(v===null||typeof v==='number'||typeof v==='boolean')data.uniforms[k]={value:v};
        else if(v.isColor)data.uniforms[k]={type:'color',value:v.toArray()};
        else if(v.toArray)data.uniforms[k]={type:v.isVector2?'v2':v.isVector3?'v3':'v4',value:v.toArray()};
        else throw Error('Unsupported lookout shader uniform: '+k);
      }
    }
    if(m.map)data.omittedTexture=true; // Tiny sign lettering only.
    materials.push(data);return id;
  }
  scene.traverseVisible(o=>{
    if(!o.isMesh||o.isSkinnedMesh)return;
    const lineage=[];for(let p=o;p&&p!==scene;p=p.parent)lineage.push(p.name);
    if(lineage.some(n=>/Tidehaven|Goblin camp site|arrival boat/i.test(n)))return;
    // Council standards are scenario state and are drawn by the lookout host.
    // Keep the old flags out of merged city batches so they cannot double up.
    if(lineage.includes('Minora legacy gate flags'))return;
    const g=o.geometry;if(!g.attributes.position)return;
    g.computeBoundingSphere();if(o.isInstancedMesh)o.computeBoundingSphere();
    sphere.copy(o.isInstancedMesh?o.boundingSphere:g.boundingSphere).applyMatrix4(o.matrixWorld);
    if(Math.hypot(sphere.center.x-LOOKOUT.x,sphere.center.z-LOOKOUT.z)-sphere.radius>3800)return;
    const part={name:lineage.filter(Boolean).reverse().join(' / '),geometry:geometry(g),material:Array.isArray(o.material)?o.material.map(material):material(o.material),
      matrix:o.matrixWorld.toArray(),region:o.userData.district??regionAt(sphere.center.x,sphere.center.z)?.id,
      sphere:[...sphere.center.toArray(),sphere.radius],instances:null,instanceColors:null};
    if(o.isInstancedMesh){part.instances=o.instanceMatrix.array.slice(0,o.count*16);part.instanceColors=o.instanceColor?.array.slice(0,o.count*3)??null;}
    meshes.push(part);
  });
  return {geometries,materials,meshes};
}

// Retain exact positions, shapes and distributions. Omit only instances whose
// entire bounding diameter is below 0.8 pixels at 720p and the narrowest FOV.
export function optimizeLookoutSnapshot(source){
  const matrix=new THREE.Matrix4(),local=new THREE.Matrix4(),sphere=new THREE.Sphere();let omittedInstances=0,omittedMeshes=0;
  const visible=s=>2*s.radius*869/Math.max(1,Math.hypot(s.center.x-LOOKOUT.x,s.center.y-LOOKOUT.y,s.center.z-LOOKOUT.z)-s.radius)>=.8;
  const meshes=[];
  for(const p of source.meshes){
    matrix.fromArray(p.matrix);const gs=source.geometries[p.geometry].sphere;
    if(p.instances){
      const instances=[],colors=[];
      for(let i=0;i<p.instances.length/16;i++){
        local.fromArray(p.instances,i*16).premultiply(matrix);
        sphere.center.set(...gs.slice(0,3));sphere.radius=gs[3];sphere.applyMatrix4(local);
        if(!visible(sphere)){omittedInstances++;continue;}
        instances.push(...p.instances.subarray(i*16,i*16+16));if(p.instanceColors)colors.push(...p.instanceColors.subarray(i*3,i*3+3));
      }
      if(instances.length)meshes.push({...p,instances:new Float32Array(instances),instanceColors:p.instanceColors?new Float32Array(colors):null});else omittedMeshes++;
    }else{sphere.center.set(...p.sphere.slice(0,3));sphere.radius=p.sphere[3];if(visible(sphere))meshes.push(p);else omittedMeshes++;}
  }
  return {...source,meshes,optimization:{omittedInstances,omittedMeshes,maxOmittedDiameterPixels:.8,referenceHeight:720,referenceFov:45}};
}

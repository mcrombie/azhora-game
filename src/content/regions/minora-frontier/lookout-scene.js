import * as THREE from 'three';
import {MeshoptDecoder} from '../../../../vendor/meshopt-decoder.js';
await MeshoptDecoder.ready;

const arrays={Float32Array,Float64Array,Uint32Array,Uint16Array,Uint8Array,Int8Array,Int16Array,Int32Array};
export function readLookoutAttribute(buffer,a){
    if(!a.codec)return new arrays[a.type](buffer,a.offset,a.length);
    const c=a.codec,target=new Uint8Array(c.count*c.stride);
    MeshoptDecoder.decodeGltfBuffer(target,c.count,c.stride,new Uint8Array(buffer,a.offset,a.encodedBytes),c.mode);
    if(c.stride===c.elementBytes)return new arrays[a.type](target.buffer);
    // Padded normals/positions can contain millions of rows. Copy bytes
    // directly instead of allocating a temporary typed-array view per row.
    const packed=new Uint8Array(c.count*c.elementBytes);
    for(let i=0,read=0,write=0;i<c.count;i++,read+=c.stride)for(let j=0;j<c.elementBytes;j++)packed[write++]=target[read+j];
    return new arrays[a.type](packed.buffer);
}
export function assembleLookoutScene(manifest,buffer){
  const root=new THREE.Group();root.name='Guild lookout / prepared surrounding landscape';
  const typed=a=>readLookoutAttribute(buffer,a);
  const geometryPool=manifest.geometries.map(g=>{
    const geometry=new THREE.BufferGeometry();
    for(const [k,a]of Object.entries(g.attributes)){
      let values=typed(a);
      if(a.quantization){const decoded=new Float32Array(values.length),q=a.quantization;for(let i=0;i<values.length;i+=3)for(let axis=0;axis<3;axis++)decoded[i+axis]=q.offset[axis]+values[i+axis]*q.scale[axis];values=decoded;}
      geometry.setAttribute(k,new THREE.BufferAttribute(values,a.itemSize,a.normalized));
    }
    if(g.index)geometry.setIndex(new THREE.BufferAttribute(typed(g.index),1));
    for(const group of g.groups)geometry.addGroup(group.start,group.count,group.materialIndex);
    geometry.boundingSphere=new THREE.Sphere(new THREE.Vector3(...g.sphere.slice(0,3)),g.sphere[3]);return geometry;
  });
  const materials=manifest.materials.map(({type,omittedTexture,...options})=>{
    for(const key of ['color','emissive'])if(options[key])options[key]=new THREE.Color(...options[key]);
    if(options.uniforms)options.uniforms=Object.fromEntries(Object.entries(options.uniforms).map(([k,u])=>[k,{value:u.type==='color'?new THREE.Color(...u.value):u.type==='v2'?new THREE.Vector2(...u.value):u.type==='v3'?new THREE.Vector3(...u.value):u.type==='v4'?new THREE.Vector4(...u.value):u.value}]));
    return type==='shader'?new THREE.ShaderMaterial(options):type==='basic'?new THREE.MeshBasicMaterial(options):new THREE.MeshStandardMaterial(options);
  });
  const entries=[];
  for(const part of manifest.meshes){
    const geometry=geometryPool[part.geometry],material=Array.isArray(part.material)?part.material.map(i=>materials[i]):materials[part.material];
    const mesh=part.instances?new THREE.InstancedMesh(geometry,material,part.instances.length/16):new THREE.Mesh(geometry,material);
    if(part.instances){mesh.instanceMatrix=new THREE.InstancedBufferAttribute(typed(part.instances),16);if(part.instanceColors)mesh.instanceColor=new THREE.InstancedBufferAttribute(typed(part.instanceColors),3);mesh.computeBoundingSphere();}
    mesh.matrix.fromArray(part.matrix);mesh.matrixAutoUpdate=false;mesh.name=part.name;mesh.userData.lookoutLandscape=true;
    const triangles=(geometry.index?.count??geometry.attributes.position.count)/3*(mesh.isInstancedMesh?mesh.count:1);
    root.add(mesh);entries.push({mesh,part,triangles});
  }
  // This scenery is complete, including Minora and the sea. Keep the authored
  // water moving without constructing or ticking the walkable exterior.
  const clocks=materials.flatMap(m=>m.uniforms?.time?[m.uniforms.time]:[]);
  return {root,entries,update(time){for(const clock of clocks)clock.value=time;},
    dispose(){for(const {mesh}of entries)if(mesh.isInstancedMesh)mesh.dispose();for(const g of geometryPool)g.dispose();for(const m of materials)m.dispose();root.removeFromParent();}};
}

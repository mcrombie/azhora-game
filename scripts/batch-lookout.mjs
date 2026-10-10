// Rendering-only batching of the simplified authored geometry. No placement edits.
import * as THREE from '../vendor/three.module.js';
import {createHash} from 'node:crypto';
export function batchLookout(source){
  const geometries=[...source.geometries],materials=[...source.materials],meshes=[],materialIds=new Map(),geometryIds=new Map(),canonical=new Map();
  const matrix=new THREE.Matrix4(),instance=new THREE.Matrix4(),normalMatrix=new THREE.Matrix3(),point=new THREE.Vector3(),normal=new THREE.Vector3();
  for(let i=0;i<geometries.length;i++){
    const g=geometries[i],h=createHash('sha256');
    for(const [k,a]of Object.entries(g.attributes)){h.update(k+':'+a.itemSize);h.update(new Uint8Array(a.array.buffer,a.array.byteOffset,a.array.byteLength));}
    if(g.index)h.update(new Uint8Array(g.index.array.buffer,g.index.array.byteOffset,g.index.array.byteLength));h.update(JSON.stringify(g.groups));
    const key=h.digest('hex');if(!geometryIds.has(key))geometryIds.set(key,i);canonical.set(i,geometryIds.get(key));
  }
  function white(m,vertexColors){
    const options={...m,color:[1,1,1],vertexColors};const key=JSON.stringify(options);
    if(!materialIds.has(key)){materialIds.set(key,materials.length);materials.push(options);}return materialIds.get(key);
  }
  const groups=new Map();
  const make=(key,part,geometry,material,instanced)=>{
    if(!groups.has(key))groups.set(key,{sources:new Set(),region:part.region,geometry,material,instanced,positions:[],normals:[],colors:[],indices:[],lookup:new Map(),instances:[],instanceColors:[]});
    const group=groups.get(key);group.sources.add(part.name);return group;
  };
  function bakedGeometry(group){
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(group.positions,3));
    geometry.setAttribute('normal',new THREE.Float32BufferAttribute(group.normals,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(group.colors,3));geometry.setIndex(group.indices);geometry.computeBoundingSphere();
    const sphere=[...geometry.boundingSphere.center.toArray(),geometry.boundingSphere.radius];
    const id=geometries.length;geometries.push({attributes:Object.fromEntries(Object.entries(geometry.attributes).map(([k,a])=>[k,{array:a.array,itemSize:a.itemSize,normalized:a.normalized}])),index:{array:geometry.index.array,itemSize:1,normalized:false},sphere,groups:[]});return {id,sphere};
  }
  for(const [partId,p]of source.meshes.entries()){
    const m=materials[p.material],g=geometries[p.geometry];
    if(!m||m.type==='shader'||m.transparent||(g.attributes.color&&g.attributes.color.itemSize!==3)||g.groups.length>1||!g.attributes.normal||/\/ (The Stills|Shore foam)$/.test(p.name)){meshes.push(p);continue;}
    const mat=white(m,p.instances?!!(m.vertexColors&&g.attributes.color):true),tint=m.color??[1,1,1],c=m.vertexColors?g.attributes.color?.array:null,n=g.attributes.normal.array,v=g.attributes.position.array;
    matrix.fromArray(p.matrix);normalMatrix.getNormalMatrix(matrix);
    if(p.instances){
      const geometry=canonical.get(p.geometry),gs=g.sphere;
      for(let i=0;i<p.instances.length/16;i++){
        instance.fromArray(p.instances,i*16).premultiply(matrix);point.set(...gs.slice(0,3)).applyMatrix4(instance);
        const key='i:'+geometry+':'+mat+':'+p.region+':'+Math.floor(point.x/384)+':'+Math.floor(point.z/384),group=make(key,p,geometry,mat,true);
        group.instances.push(...instance.elements);for(let j=0;j<3;j++)group.instanceColors.push(tint[j]*(p.instanceColors?.[i*3+j]??1));
      }
      continue;
    }
    // Transform each vertex once. Split the triangles, not the region identity,
    // into spatial batches so that distant buildings can still be frustum-culled.
    const positions=new Float32Array(v.length),normals=new Float32Array(n.length);
    for(let i=0;i<v.length/3;i++){
      point.fromArray(v,i*3).applyMatrix4(matrix).toArray(positions,i*3);
      normal.fromArray(n,i*3).applyMatrix3(normalMatrix).normalize().toArray(normals,i*3);
    }
    const indices=g.index?.array??Uint32Array.from({length:v.length/3},(_,i)=>i);
    for(let i=0;i<indices.length;i+=3){
      const a=indices[i]*3,b=indices[i+1]*3,d=indices[i+2]*3,x=(positions[a]+positions[b]+positions[d])/3,z=(positions[a+2]+positions[b+2]+positions[d+2])/3;
      const key='m:'+mat+':'+p.region+':'+Math.floor(x/384)+':'+Math.floor(z/384),group=make(key,p,null,mat,false);
      for(let j=0;j<3;j++){
        const index=indices[i+j],vertex=partId+':'+index;let target=group.lookup.get(vertex);
        if(target===undefined){target=group.positions.length/3;group.lookup.set(vertex,target);group.positions.push(...positions.subarray(index*3,index*3+3));group.normals.push(...normals.subarray(index*3,index*3+3));for(let k=0;k<3;k++)group.colors.push(tint[k]*(c?.[index*3+k]??1));}
        group.indices.push(target);
      }
    }
  }
  const identity=new THREE.Matrix4().toArray();
  for(const group of groups.values()){
    const sources=[...group.sources],part={name:'Authored landscape / '+sources[0],sources,region:group.region,material:group.material,matrix:identity,instances:null,instanceColors:null};
    if(group.instanced){
      part.geometry=group.geometry;part.instances=new Float32Array(group.instances);part.instanceColors=new Float32Array(group.instanceColors);
      const gs=geometries[part.geometry].sphere,bounds=new THREE.Box3();
      for(let i=0;i<part.instances.length/16;i++){instance.fromArray(part.instances,i*16);const s=new THREE.Sphere(new THREE.Vector3(...gs.slice(0,3)),gs[3]).applyMatrix4(instance);bounds.union(s.getBoundingBox(new THREE.Box3()));}
      const sphere=bounds.getBoundingSphere(new THREE.Sphere());part.sphere=[...sphere.center.toArray(),sphere.radius];
    }else{const g=bakedGeometry(group);part.geometry=g.id;part.sphere=g.sphere;}
    meshes.push(part);
  }
  console.log('Scenery batching: '+source.meshes.length+' -> '+meshes.length+' spatial batches');
  return {...source,geometries,materials,meshes,optimization:{...source.optimization,batchesBefore:source.meshes.length,batchesAfter:meshes.length}};
}

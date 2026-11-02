import * as THREE from 'three';
import {ENDEVOR_RIVERS} from './endevor-river.js';
/** A ribbon on the same surface used for wading/swimming. Each regional build
 * owns its segments; the town does not force all Endevor scenery to load. */
export function* createEndevorWaterSteps({parent,owns=()=>true}){
  const positions=[],colors=[],tint=new THREE.Color(),seaTint=new THREE.Color('#6b9ea4'),riverTint=new THREE.Color('#537e83');
  function emit(p,upstream){positions.push(...p);tint.copy(seaTint).lerp(riverTint,Math.min(1,upstream/70));colors.push(tint.r,tint.g,tint.b);}
  for(const c of ENDEVOR_RIVERS){
    const rails=c.points.map((p,i)=>{const a=c.points[Math.max(0,i-1)],b=c.points[Math.min(c.points.length-1,i+1)],len=Math.hypot(b.x-a.x,b.z-a.z)||1;
      return [-1,1].map(s=>[p.x+s*(b.z-a.z)/len*p.halfWidth,p.surface+.018,p.z-s*(b.x-a.x)/len*p.halfWidth]);});
    for(let i=1;i<c.points.length;i++){
      const a=c.points[i-1],b=c.points[i];if((a.upstream===0&&b.upstream===0)||!owns((a.x+b.x)/2,(a.z+b.z)/2))continue;
      const [l,r]=rails[i-1],[ll,rr]=rails[i];emit(l,a.upstream);emit(ll,b.upstream);emit(r,a.upstream);emit(r,a.upstream);emit(ll,b.upstream);emit(rr,b.upstream);
    }yield;
  }
  if(!positions.length)return null;
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.computeVertexNormals();
  const mesh=new THREE.Mesh(g,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.35,metalness:.12,side:THREE.DoubleSide}));
  mesh.name='Endevor River';parent.add(mesh);return mesh;
}

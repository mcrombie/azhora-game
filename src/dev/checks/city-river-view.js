import * as THREE from 'three';
import {WEST_PROFILES,westWaterSurface,braidThreadOffset} from '../../content/regions/western-regions/west-ground.js';
import {WEST_BRAIDS} from '../../content/regions/western-regions/west-regions.js';

// Review the authored water ribbons, rather than painting whole terrain cells
// blue. This shares the profiles and braid offsets with the exploration world.
export function cityRiverView(scene,courses,box,material){
  const [x,z,w,d]=box,vertices=[];
  const strip=points=>{
    for(let i=1;i<points.length;i++){
      const a=points[i-1],b=points[i];if(!a||!b)continue;
      if([a,b].some(p=>p.x<x||p.x>x+w||p.z<z||p.z>z+d))continue;
      const ay=westWaterSurface(a.x,a.z),by=westWaterSurface(b.x,b.z);if(ay===null||by===null)continue;
      const p=(s,y,k)=>[s.x+k*s.nx*s.half,y,s.z+k*s.nz*s.half];
      vertices.push(...p(a,ay,-1),...p(b,by,-1),...p(a,ay,1),...p(a,ay,1),...p(b,by,-1),...p(b,by,1));
    }
  };
  for(const course of courses){
    const profile=WEST_PROFILES.get(course.id);strip(profile);
    for(const braid of WEST_BRAIDS.filter(b=>b.course===course))for(const side of [-1,1])strip(profile.map(p=>{
      const offset=braidThreadOffset(braid,p.along);return offset===null?null:{...p,x:p.x+p.nx*offset*side,z:p.z+p.nz*offset*side,half:braid.half};
    }));
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.computeVertexNormals();
  const mesh=new THREE.Mesh(g,material);mesh.material.side=THREE.DoubleSide;scene.add(mesh);
}

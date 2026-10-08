import {WEST_RIVERS} from '../../content/regions/western-regions/west-regions.js';
import {WEST_PROFILES,westWaterSurface} from '../../content/regions/western-regions/west-ground.js';

// Reuse the water ribbon samples used by the scenery. Only project the sections
// around this local chart; do not sample a new terrain grid every frame.
const segments=new WeakMap();
export function localRivers(position,radius){
  const shapes=[];
  const overlaps=b=>b.minX<=position.x+radius&&b.maxX>=position.x-radius&&b.minZ<=position.z+radius&&b.maxZ>=position.z-radius;
  for(const river of WEST_RIVERS){
    if(!overlaps(river.bounds))continue;
    let parts=segments.get(river);
    if(!parts){
      const samples=WEST_PROFILES.get(river.id);parts=[];
      for(let i=1;i<samples.length;i++){
        const a=samples[i-1],b=samples[i];
        if(westWaterSurface(a.x,a.z)===null||westWaterSurface(b.x,b.z)===null)continue;
        const points=[{x:a.x-a.nx*a.half,z:a.z-a.nz*a.half},{x:b.x-b.nx*b.half,z:b.z-b.nz*b.half},{x:b.x+b.nx*b.half,z:b.z+b.nz*b.half},{x:a.x+a.nx*a.half,z:a.z+a.nz*a.half}];
        parts.push({kind:'polygon',points,bounds:{minX:Math.min(...points.map(p=>p.x)),maxX:Math.max(...points.map(p=>p.x)),minZ:Math.min(...points.map(p=>p.z)),maxZ:Math.max(...points.map(p=>p.z))}});
      }
      segments.set(river,parts);
    }
    let left=[],right=[],last=null;
    const flush=()=>{if(left.length>1)shapes.push({kind:'polygon',points:[...left,...right.reverse()]});left=[];right=[];};
    for(const part of parts){
      if(!overlaps(part.bounds)){flush();last=null;continue;}
      const [a,b,c,d]=part.points;
      if(!last||a.x!==last.x||a.z!==last.z){flush();left.push(a);right.push(d);}
      left.push(b);right.push(c);last=b;
    }
    flush();
  }
  return shapes;
}

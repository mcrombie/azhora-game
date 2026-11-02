import {drapeRoadOnTerrainSteps} from '../terrain/terrain-road.js';

export function* groundPatch(builder,surface,tint,heightAt,x,z,width,depth,yaw=0,lift=.055,cells=4){
  if(!surface){yield* builder.patchSteps(tint,heightAt,x,z,width,depth,yaw,lift,cells);return;}
  const c=Math.cos(yaw),s=Math.sin(yaw),at=(u,v)=>({x:x+u*c+v*s,z:z-u*s+v*c});
  yield* groundFace(builder,tint,[at(-width/2,-depth/2),at(-width/2,depth/2),at(width/2,depth/2),at(width/2,-depth/2)],heightAt,surface,lift);
}

/** Cut decals to the actual rendered ground, not just the analytic heightfield.
 * That distinction matters at the coarse terrain triangles on the approach. */
export function* groundFace(builder,tint,points,heightAt,surface,lift=.055){
  const positions=points.flatMap(p=>[p.x,heightAt(p.x,p.z)+lift,p.z]);
  const indices=[];for(let i=1;i<points.length-1;i++)indices.push(0,i,i+1);
  if(surface){
    surface.ensure?.(positions);
    const face=yield* drapeRoadOnTerrainSteps(positions,indices,surface.xs,surface.zs,surface.positions,lift);
    for(let i=0;i<face.indices.length;i+=3){
      if(i&&i%96===0)yield;
      builder.triangle(tint,...face.indices.slice(i,i+3).map(j=>face.positions.slice(j*3,j*3+3)));
    }
  }else{
    const p=points.map((_,i)=>positions.slice(i*3,i*3+3));
    for(let i=1;i<p.length-1;i++){
      const a=p[0],b=p[i],c=p[i+1],up=(b[2]-a[2])*(c[0]-a[0])-(b[0]-a[0])*(c[2]-a[2]);
      builder.triangle(tint,a,up>=0?b:c,up>=0?c:b);
    }
  }
}

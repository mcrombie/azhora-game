import { REGION_CELLS, REGION_TERRAIN, TRANSFORM, hexAtlasCorners, hexAt, hexCentre, METRES_PER_HEX, relief } from '../../../world/terrain/region-world.js';

// Three reproduced dry interpolation defects. Keep the atlas segments explicit:
// this is not a change to the world's terrain blend or the neighbouring peaks.
export const WESTERN_DRY_SEAM_CORE = 18;
export const WESTERN_DRY_SEAM_REACH = 36;
export const WESTERN_DRY_SEAMS = Object.freeze([
  { id:'isareos-internal', q:-8, r:104, edge:4 },
  { id:'meneth-lotharn', q:-5, r:102, edge:1 },
  { id:'elagos-nesdor', q:-3, r:110, edge:5 },
].map(spec=>{
  const loop=hexAtlasCorners(spec.q,spec.r).map(p=>TRANSFORM.atlasToWorld(p.x,p.y));
  const a=loop[spec.edge],b=loop[(spec.edge+1)%6],dx=b.x-a.x,dz=b.z-a.z;
  return Object.freeze({...spec,a,b,dx,dz,length2:dx*dx+dz*dz,
    minX:Math.min(a.x,b.x)-WESTERN_DRY_SEAM_REACH,maxX:Math.max(a.x,b.x)+WESTERN_DRY_SEAM_REACH,
    minZ:Math.min(a.z,b.z)-WESTERN_DRY_SEAM_REACH,maxZ:Math.max(a.z,b.z)+WESTERN_DRY_SEAM_REACH});
}));

export function nearWesternDrySeam(x,z,apron=0){
  return WESTERN_DRY_SEAMS.some(e=>x>=e.minX-apron&&x<=e.maxX+apron&&z>=e.minZ-apron&&z<=e.maxZ+apron);
}
export function westernDrySeamWeight(x,z){
  let distance2=WESTERN_DRY_SEAM_REACH**2;
  for(const e of WESTERN_DRY_SEAMS){
    if(x<e.minX||x>e.maxX||z<e.minZ||z>e.maxZ)continue;
    const t=Math.max(0,Math.min(1,((x-e.a.x)*e.dx+(z-e.a.z)*e.dz)/e.length2));
    distance2=Math.min(distance2,(x-e.a.x-e.dx*t)**2+(z-e.a.z-e.dz*t)**2);
  }
  if(distance2>=WESTERN_DRY_SEAM_REACH**2)return 0;
  if(distance2<=WESTERN_DRY_SEAM_CORE**2)return 1;
  const t=(Math.sqrt(distance2)-WESTERN_DRY_SEAM_CORE)/(WESTERN_DRY_SEAM_REACH-WESTERN_DRY_SEAM_CORE);
  return 1-t*t*(3-2*t);
}
const profiles=new Map();
for(const[name,cells]of Object.entries(REGION_CELLS))for(const c of cells)
  profiles.set(`${c.q},${c.r}`,REGION_TERRAIN[name]?.byTerrain?.[c.terrain]??REGION_TERRAIN[name]??REGION_TERRAIN.outland);
const offsets=[];
for(let q=-2;q<=2;q++)for(let r=-2;r<=2;r++)if(Math.max(Math.abs(q),Math.abs(r),Math.abs(q+r))<=2)offsets.push([q,r]);

/** Every contributing hex keeps its authored wavelength. Blending wavelengths
 * themselves creates steep phase changes far from the coordinate origin. */
export function westernDrySeamInland(x,z,original){
  const strength=westernDrySeamWeight(x,z);if(!strength)return original;
  const home=hexAt(x,z);let sum=0,total=0;
  for(const[dq,dr]of offsets){
    const q=home.q+dq,r=home.r+dr,c=hexCentre(q,r);
    const weight=Math.max(0,1-Math.hypot(x-c.x,z-c.z)/(METRES_PER_HEX*1.28));if(!weight)continue;
    const p=profiles.get(`${q},${r}`)??REGION_TERRAIN.outland;
    sum+=weight*(p.base+relief(x,z,p.amp,p.wave));total+=weight;
  }
  return total?original+(sum/total-original)*strength:original;
}

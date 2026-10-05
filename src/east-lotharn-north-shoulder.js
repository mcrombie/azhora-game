/** Bounded central north face rounding. Authored routes, caves and fort ground are reserved. */

export const CENTRAL_NORTH_PILOT = Object.freeze({ minX: -1280, maxX: -1175, minZ: -1045, maxZ: -977, feather: 10 });
export const CENTRAL_NORTH_LOBES = Object.freeze([
  Object.freeze({ x: -1254, z: -1000, width: 27, length: 37, yaw: -.25, strength: .99 }),
  Object.freeze({ x: -1203, z: -1009, width: 21, length: 30, yaw: .4, strength: .9 }),
]);
const smooth = (a,b,x) => { const t=Math.max(0,Math.min(1,(x-a)/(b-a))); return t*t*(3-2*t); };
function lineDistance(line,x,z) {
  let best=Infinity;
  for(let i=1;i<line.points.length;i++) {
    const a=line.points[i-1],b=line.points[i],dx=b.x-a.x,dz=b.z-a.z;
    const t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1)));
    best=Math.min(best,Math.hypot(x-a.x-dx*t,z-a.z-dz*t));
  }
  return best;
}
export function createCentralNorthShoulder({ peakUplift, terrace, onBald, PEAK_TOPS, RAMPS, edgeDistance, baseLandscapeDelta }) {
 return function centralNorthShoulderAddition(x,z) {
  const s=CENTRAL_NORTH_PILOT;
  if(x<=s.minX||x>=s.maxX||z<=s.minZ||z>=s.maxZ) return 0;
  // Explicit fort+6m rejection remains here even though this pilot's southern
  // edge is another eleven metres away. Never let a future box edit erase it.
  if(x>=-1566&&x<=-694&&z>=-966&&z<=-594) return 0;
  const u=peakUplift(x,z);
  if(u<=80||onBald(x,z,12)) return 0;
  const chimneyDistance=Math.max(-1250-x,x+1170,-1120-z,z+1057,0);
  if(chimneyDistance<=0) return 0;
  let pathDistance=Infinity;
  for(const ramp of RAMPS) {
    const b=ramp.line.bounds;
    if(x<b.minX-18||x>b.maxX+18||z<b.minZ-18||z>b.maxZ+18)continue;
    pathDistance=Math.min(pathDistance,lineDistance(ramp.line,x,z));
  }
  if(pathDistance<=7) return 0;
  const guard=smooth(0,s.feather,x-s.minX)*smooth(0,s.feather,s.maxX-x)
    *smooth(0,s.feather,z-s.minZ)*smooth(0,s.feather,s.maxZ-z)
    *smooth(80,100,u)*smooth(0,12,chimneyDistance)*smooth(7,18,pathDistance)*smooth(12,35,edgeDistance(x,z))
    // The hard bald reservation is approached continuously, so it cannot gain
    // a new step at its edge. Every point in this box belongs to this peak.
    *smooth(.5,2.5,PEAK_TOPS['central-peak']-u);
  let shoulder=0;
  for(const lobe of CENTRAL_NORTH_LOBES) {
    const dx=x-lobe.x,dz=z-lobe.z,c=Math.cos(lobe.yaw),sn=Math.sin(lobe.yaw);
    const across=(dx*c-dz*sn)/lobe.width,along=(dx*sn+dz*c)/lobe.length;
    shoulder=Math.max(shoulder,lobe.strength*(1-smooth(.12,1,across*across+along*along)));
  }
  // Raise toward a continuous shoulder only where it exceeds the existing
  // weathering field. The untouched higher rock remains an irregular rib.
  const target=Math.max(0,u-terrace(u))*guard*shoulder;
  return Math.max(0,target-baseLandscapeDelta(x,z));
}
}

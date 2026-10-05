/** Restore endpoint progress only on the central authored ways. The old
 * nearestOn station remains unchanged for rivers, valleys, roads and Varn. */
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
function station(line,x,z){let best=Infinity,along=0;for(let i=1;i<line.points.length;i++){
 const a=line.points[i-1],b=line.points[i],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz),t=clamp(((x-a.x)*dx+(z-a.z)*dz)/(len*len||1),0,1),d=Math.hypot(x-a.x-dx*t,z-a.z-dz*t);
 if(d<best){best=d;along=line.runs[i-1]+len*t;}}return along;}
export function createCentralRampJoinCorrection({ RAMPS, RAMP, nearestOn, lotharnShare, peakUplift, level }) {
 const ends=RAMPS.filter(r=>r.peak==='central-peak').flatMap(r=>[r.line.points[0],r.line.points.at(-1)]);
 const nearby=(x,z,margin=0)=>ends.some(p=>Math.abs(x-p.x)<11+margin&&Math.abs(z-p.z)<11+margin);
 function delta(x,z){
 if(!nearby(x,z)||peakUplift(x,z)<=0)return 0;
 const reach=RAMP.half+RAMP.edge;let best=null;
 for(const ramp of RAMPS){const b=ramp.line.bounds;if(x<b.minX-reach||x>b.maxX+reach||z<b.minZ-reach||z>b.maxZ+reach)continue;
 const near=nearestOn(ramp.line,x,z);if(near.distance<reach&&(!best||near.distance<best.near.distance))best={ramp,near};}
 if(!best||best.ramp.peak!=='central-peak')return 0;
 const{ramp,near}=best,exact=station(ramp.line,x,z),weight=1-smooth(2,6,Math.min(exact,ramp.line.length-exact));
 const corrected=near.along+(exact-near.along)*weight;
 return (level(ramp,corrected)-level(ramp,near.along))*(1-smooth(RAMP.half,reach,near.distance))*lotharnShare(x,z);
}
 return Object.freeze({delta,near:nearby});
}

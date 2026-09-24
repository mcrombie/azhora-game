/** Physical melee contact shared by encounters and ordinary world characters.
 * `arc` is a half-angle in radians; range is measured between actor centers.
 * Team membership never changes whether a body lies in the blade's sweep.
 */
const finite = point => point && Number.isFinite(point.x) && Number.isFinite(point.z);
const difference = (a,b) => Math.atan2(Math.sin(a-b),Math.cos(a-b));

export function meleeLineClear(from,to,world) {
  if(!world) return true;
  const dx=to.x-from.x,dz=to.z-from.z,length=Math.hypot(dx,dz);
  const shapes=world.nearColliders?.((from.x+to.x)/2,(from.z+to.z)/2,length/2+.1,[])??world.colliders??[];
  return !shapes.some(shape=>{
    if(['river-water','pond-water','body','person'].includes(shape.kind)||(to.id&&(shape.id===to.id||shape.npcId===to.id))) return false;
    if(Number.isFinite(shape.r)) {
      const t=Math.max(0,Math.min(1,((shape.x-from.x)*dx+(shape.z-from.z)*dz)/(length*length||1)));
      return t>.02&&t<.98&&Math.hypot(from.x+dx*t-shape.x,from.z+dz*t-shape.z)<shape.r;
    }
    let near=0,far=1;
    for(const [start,delta,center,half] of [[from.x,dx,shape.x,shape.hx],[from.z,dz,shape.z,shape.hz]]) {
      if(!Number.isFinite(half)) return false;
      if(Math.abs(delta)<1e-10) { if(start<=center-half||start>=center+half) return false; }
      else { const a=(center-half-start)/delta,b=(center+half-start)/delta; near=Math.max(near,Math.min(a,b));far=Math.min(far,Math.max(a,b)); }
    }
    return near<far&&far>.02&&near<.98;
  });
}

export function meleeContact(impact,target,world=null) {
  const origin=impact?.origin??impact;
  if(!finite(origin)||!finite(target)||!Number.isFinite(impact.yaw)||!(impact.range>0)||!(impact.arc>=0)) return false;
  if(target.active===false||target.dead||target.action==='dead'||(Number.isFinite(target.hp)&&target.hp<=0)) return false;
  if(impact.sourceId&&(target.id===impact.sourceId||target.npcId===impact.sourceId)) return false;
  const dx=target.x-origin.x,dz=target.z-origin.z;
  if(Math.hypot(dx,dz)>impact.range+1e-8||Math.abs(difference(Math.atan2(dx,dz),impact.yaw))>impact.arc+1e-8) return false;
  return target.kind==='dummy'||meleeLineClear(origin,target,world);
}

export function meleeContacts(impact,targets,world=null) {
  const seen=new Set();
  return (targets??[]).filter(target=>{
    const id=target?.npcId??target?.id;
    if(!id||seen.has(id)||!meleeContact(impact,target,world)) return false;
    seen.add(id); return true;
  });
}

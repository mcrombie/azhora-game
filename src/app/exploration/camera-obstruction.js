// Gather one conservative set for the camera segment, then test the same 24
// sample points. Terrain/material reads occur once per unique nearby collider.
export function createCameraObstruction(world){
  const seen=new Set(),candidates=[];
  return function clip(focus,desired){
    const dx=desired.x-focus.x,dy=desired.y-focus.y,dz=desired.z-focus.z;
    seen.clear();candidates.length=0;
    const nearby=world.nearColliders(focus.x+dx/2,focus.z+dz/2,Math.hypot(dx,dz)/2+.12);
    for(const c of nearby){
      if(seen.has(c)||c.kind==='river-water'||c.kind==='pond-water')continue;seen.add(c);
      const bottom=c.minY??world.heightAt(c.x,c.z);
      candidates.push({c,bottom,top:c.maxY??bottom+2});
    }
    for(let i=1;i<=24;i++){
      const t=i/24,x=focus.x+dx*t,y=focus.y+dy*t,z=focus.z+dz*t;
      for(const {c,bottom,top} of candidates){
        if(y<=bottom-.1||y>=top+.12)continue;
        if(c.r!==undefined?(x-c.x)**2+(z-c.z)**2<(c.r+.12)**2:Math.abs(x-c.x)<c.hx+.12&&Math.abs(z-c.z)<c.hz+.12)return Math.max(.12,(i-1)/24);
      }
    }
    return 1;
  };
}

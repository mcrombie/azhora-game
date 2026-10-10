/** The former decorative peaks become dry, terraced Ambroni strongholds. */
export const AMBRON_FORTRESSES=Object.freeze([
  {id:'crown-fortress',name:'The Crown Fortress',x:-1232,z:-279,w:36,d:30,level:44,height:22},
  {id:'thelas-fortress',name:'The Thelas Fortress',x:-1376,z:-94,w:40,d:34,level:35,height:25},
  {id:'ela-fortress',name:'The Ela Fortress',x:-1492,z:84,w:42,d:36,level:30,height:27},
].map(Object.freeze));

export function ambronFortressGround(x,z,natural,dryAt=()=>Infinity) {
  if(x< -1545||x> -1185||z< -325||z>132)return natural;
  if(dryAt(x,z)<0)return natural;
  for(const fort of AMBRON_FORTRESSES){
    const outside=Math.max(Math.abs(x-fort.x)-fort.w/2-3,Math.abs(z-fort.z)-fort.d/2-3,0);
    if(outside>=24)continue;
    const t=Math.min(1,outside/24),weight=1-t*t*(3-2*t);
    return natural+(fort.level-natural)*weight;
  }
  return natural;
}


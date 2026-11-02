// Shared exterior footprint; importing civic records does not load a renderer.
export const GUILD_STABLE=Object.freeze({x:-2426.5,z:60,width:11,depth:8});

// Three open stalls share a clear front aisle. These are Guild horses, separate
// from the saddled horse Bear gives the player.
export const GUILD_STALLS=Object.freeze([-3.5,0,3.5]);
export const GUILD_HORSES=Object.freeze(GUILD_STALLS.map((dx,i)=>Object.freeze({
  id:'guild-horse-'+i,x:GUILD_STABLE.x+dx,z:GUILD_STABLE.z,yaw:Math.PI,variant:i,
  care:Object.freeze({x:GUILD_STABLE.x+dx+.9,z:GUILD_STABLE.z+.1}),
})));
export const BEAR_STABLE_ROUND=Object.freeze([
  {x:-2419,z:65},
  ...[...GUILD_HORSES].reverse().flatMap((horse,i)=>[
    {x:horse.care.x,z:65},
    {...horse.care,face:horse,seconds:7+i*1.5,task:i===1?'feeding':'brushing',horse:horse.id},
    {x:horse.care.x,z:65},
  ]),
].map(Object.freeze));

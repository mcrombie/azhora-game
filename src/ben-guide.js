import { townPoint } from './region-world.js';
import { SPIDER_DEN } from './spider-quest.js';

// The north gate is the way out: aiming straight at the den cuts through
// Nothom's houses and palisade. The ordinary NPC navigator handles trees.
export const BEN_ROUTE = Object.freeze([
  townPoint(-14, -1.2), townPoint(-36, -1.2), townPoint(-46, -1.2),
  townPoint(-54, -1.2), {x:-739,z:316}, {x:-769,z:294},
  {x:SPIDER_DEN.center.x+8,z:SPIDER_DEN.center.z+4},
].map(Object.freeze));
export const BEN_GUIDE_PACE = 2.8;
export const BEN_GUIDE_START = Object.freeze(townPoint(-10,-2));

/** Legacy saves had no guide position. Migrate only while loading, never
 * relocate a guide during ordinary play. A nearby route stop keeps an old
 * den checkpoint usable; distant travelers will find him back in Nothom. */
export function restoreBenGuide(saved, player, clear = () => true) {
  if(saved&&clear(saved.x,saved.z))return {...saved};
  let nearest=null,distance=24;
  for(let waypoint=0;waypoint<BEN_ROUTE.length;waypoint++){
    const p=BEN_ROUTE[waypoint],gap=Math.hypot(p.x-player.x,p.z-player.z);
    if(gap<distance&&clear(p.x,p.z)){distance=gap;nearest={...p,waypoint,waiting:false};}
  }
  return nearest??{...BEN_GUIDE_START,waypoint:0,waiting:false};
}

/** A destination, never a position assignment. Ben waits without turning back. */
export function benGuideTarget(position, player, progress = null) {
  let waypoint=Math.min(BEN_ROUTE.length-1,Math.max(0,progress?.waypoint??0));
  while(waypoint<BEN_ROUTE.length-1&&Math.hypot(position.x-BEN_ROUTE[waypoint].x,position.z-BEN_ROUTE[waypoint].z)<.8)waypoint++;
  const gap=Math.hypot(position.x-player.x,position.z-player.z);
  const waiting=progress?.waiting?gap>7:gap>11;
  const goal=BEN_ROUTE[waypoint],arrived=waypoint===BEN_ROUTE.length-1&&Math.hypot(position.x-goal.x,position.z-goal.z)<.8;
  return {target:waiting||arrived?{x:position.x,z:position.z}:goal,pace:BEN_GUIDE_PACE,
    arrived,waiting,progress:{x:position.x,z:position.z,waypoint,waiting}};
}

import { canStand } from '../../gameplay/movement/game-state.js';

export const STRATEGIC_ENCOUNTER_PREFIX = 'strategy-';

/** The abstract armies lend generic detachments to one local fight. No named
 * resident, quest soldier or permanent casualty is borrowed by the experiment. */
export function strategicBattleEncounter(battle, world, { occupied = [] } = {}) {
  if (!battle?.id || !Number.isFinite(battle.at?.x) || !Number.isFinite(battle.at?.z)) return null;
  const offsets = [[0, 0], [-3, -7], [3, -9], [-3, 3], [3, 4], [0, 11]];
  let center = null;
  for (let radius = 0; radius <= 90 && !center; radius += 6) {
    const count = radius ? Math.max(8, Math.ceil(radius / 2)) : 1;
    for (let i = 0; i < count; i++) {
      const angle = i / count * Math.PI * 2;
      const point = { x: battle.at.x + Math.cos(angle) * radius, z: battle.at.z + Math.sin(angle) * radius };
      const points = offsets.map(([x,z]) => ({ x:point.x+x, z:point.z+z }));
      if (occupied.some(p => Math.hypot(p.x-point.x,p.z-point.z)<23)) continue;
      if (!points.every(p => canStand(p.x,p.z,world,1))) continue;
      const heights = points.map(p => world.heightAt(p.x,p.z));
      if (Math.max(...heights)-Math.min(...heights)>3) continue;
      // Keep the space between formations usable too, not just their spawn feet.
      if (![-8,-4,0,4,8,12,16,20,24,28].every(z => [-4,0,4].every(x => canStand(point.x+x,point.z+z,world,.8)))) continue;
      center=point;break;
    }
  }
  if (!center) return null;
  const at = (x,z) => ({x:center.x+x,z:center.z+z});
  return { id:`${STRATEGIC_ENCOUNTER_PREFIX}${battle.id}`, level:0, physicalCompany:true,
    center, checkpoint:at(0,11), retreatZ:center.z+27,
    enemies:[[-3,-7],[3,-9]].map(([x,z],i) => ({id:`strategy-centaur-${i+1}`,kind:'centaur',name:'Centaur raider',hp:80,entry:i*.5,...at(x,z)})),
    allies:[[-3,3],[3,4]].map(([x,z],i) => ({id:`strategy-imperial-${i+1}`,kind:'legionary',name:'Imperial soldier',hp:95,...at(x,z),model:{role:'legion-soldier',armed:true}})),
  };
}

export function strategicCombatOutcome(event, encounterId, pending) {
  if (!pending || encounterId !== `${STRATEGIC_ENCOUNTER_PREFIX}${pending.id}`) return null;
  return event.type === 'victory' ? 'imperial-victory' : event.type === 'defeat' ? 'centaur-victory' : event.type === 'retreat' ? 'retreat' : null;
}

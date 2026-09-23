import { WORD_SHIP, WORD_ASHORE, WORD_BEACH, WORD_TRACK } from './word-arrival.js';

// The shore watch remains available after the alarm; the scene borrows existing
// villagers without moving their quest destinations or changing their stories.
export const HARBOUR_WATCH = Object.freeze([
  { id: 'tidehaven-watch-north', name: 'Shore watchman', role: 'Tidehaven shore watch', modelRole: 'legion-soldier', color: 0x79483b, armed: true, x: -3, z: 46 },
  { id: 'tidehaven-watch-south', name: 'Shore watchwoman', role: 'Tidehaven shore watch', modelRole: 'legion-soldier', color: 0x79483b, armed: true, x: -4, z: 31 },
]);
export const HARBOUR_ALARM_END = WORD_ASHORE + 30;

/** Scene time is the arrival clock, independent of the traveler's location. */
export function createHarbourAlarm({ people = [], homes = {}, standable = () => true } = {}) {
  const members = new Map();
  const watch = new Set(HARBOUR_WATCH.map(npc => npc.id));
  const shore = (x, z) => {
    for (const dx of [0, -2, -4, -6]) for (const dz of [0, 2, -2])
      if (standable(x + dx, z + dz)) return { x: x + dx, z: z + dz };
    return null;
  };
  let civilian = 0;
  for (const npc of people) {
    const home = homes[npc.id];
    if (!home || npc.id === 'instructor' || npc.id.startsWith('merc-') || npc.dog || npc.cat || npc.horse || npc.hidden) continue;
    const guard = watch.has(npc.id), panic = npc.id === 'doomsayer';
    if (!guard && Math.hypot(home.x - WORD_BEACH.x, home.z - WORD_BEACH.z) > 90) continue;
    const target = guard ? shore(2, npc.id.endsWith('north') ? 43 : 34)
      : panic ? shore(-9, 40) : shore(-5 - Math.floor(civilian / 4) * 3, 29 + (civilian++ % 4) * 5);
    if (target) members.set(npc.id, { target, guard, panic });
  }
  return {
    ids: [...members.keys()],
    pose(id, clock) {
      if (!Number.isFinite(clock) || clock < WORD_SHIP.sighted || clock >= HARBOUR_ALARM_END) return null;
      const member = members.get(id);
      if (!member) return null;
      let target = member.target;
      if (member.panic) {
        const leg = Math.floor((clock - WORD_SHIP.sighted) / 3) % 4;
        target = shore(-9 - (leg % 2) * 5, 32 + Math.floor(leg / 2) * 13) ?? target;
      }
      return { target, pace: member.panic ? 4.8 : member.guard ? 3.4 : 2.8,
        panic: member.panic, alert: true, face: clock >= WORD_ASHORE ? WORD_BEACH : WORD_TRACK.standOff };
    },
  };
}

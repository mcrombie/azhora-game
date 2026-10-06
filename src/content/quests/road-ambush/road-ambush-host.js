import { AMBUSH } from './road-ambush.js';

/** Bridges the persistent roadside people and the temporary combat simulation.
 * A witness can watch Chris die without becoming a combat target forever. */
export function createRoadAmbushHost({ ambush, combat, encounter, position = () => null,
  move = null, onChange = () => {} } = {}) {
  let playerEngaged = false, parties = [];
  const belongs = () => combat.state.encounterId === encounter.id;
  const fighting = () => belongs() && combat.state.phase === 'active';
  const near = () => { const p = position(); return p && Math.hypot(p.x - AMBUSH.point.x, p.z - AMBUSH.point.z) < AMBUSH.reach; };
  function start({ player = false, allies = [], partyIds = [] } = {}) {
    if (!ambush.ready) return false;
    const spec = ambush.encounter({ ...encounter, independent: true, physicalCompany: true, allies });
    if (!spec.enemies.length || !combat.startEncounter(spec)) return false;
    playerEngaged = !!player; parties = [...partyIds]; ambush.sprang();
    ambush.remember(combat.state.enemies); onChange('engaged'); return true;
  }
  function remember() { if (belongs() && combat.state.enemies.length) ambush.remember(combat.state.enemies); }
  function combatEvent(event) {
    if ((event.encounterId ?? combat.state.encounterId) !== encounter.id) return false;
    const enemies = event.enemies ?? combat.state.enemies;
    ambush.remember(enemies);
    if (event.type === 'hit' && event.source !== 'enemy' && event.source !== 'ally') playerEngaged = true;
    if (event.type === 'ally-down') ambush.settleParties([], [event.id]);
    if (!['victory', 'retreat', 'defeat'].includes(event.type)) return true;
    const allies = event.allies ?? combat.state.allies;
    ambush.settleParties(parties, allies.filter(one => one.hp <= 0).map(one => one.id));
    // Victory is only a consequence of every persistent ambusher being dead.
    // A retreat or the death of their quarry never clears the road.
    if (ambush.alive) ambush.withdraw(enemies);
    parties = []; onChange(event.type); return true;
  }
  function update(dt) {
    remember();
    if (fighting()) {
      if (near()) playerEngaged = true;
      const liveTargets = combat.state.allies.some(one => one.hp > 0 && one.active && !one.escaped && !one.wounded);
      if (!playerEngaged && !liveTargets) {
        const enemies = combat.state.enemies.map(one => ({ ...one }));
        combat.disengage('quarry-gone'); ambush.withdraw(enemies);
      }
    }
    ambush.update(dt, { move });
  }
  return { start, remember, update, combatEvent,
    get active() { return fighting(); }, get playerEngaged() { return playerEngaged; },
    reset() { playerEngaged = false; parties = []; },
  };
}

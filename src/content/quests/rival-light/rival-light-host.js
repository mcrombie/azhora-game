import { insideRegion } from '../../../world/terrain/region-world.js';
import { createStealth, STEALTH } from '../../../gameplay/law/stealth.js';
import { guardLineOfSight } from '../../regions/drent/drent-host.js';
import { SUVAL_LIGHT } from '../lighthouse/lighthouse.js';
import { RIVAL_HEAD, SUBTRACTIDAUGHTER, SUBTRACTIDAUGHTER_STAND, BLOCKHOUSE_DOOR, SOVIK, SOVIK_ITEM, SOVIK_LANTERN, lanternHeight,
  TOWER_STEP, KEY_ITEM, PASSPORT_ITEM, SMUGGLERS_DOOR, WATCH_FIGHT_ID, LIGHT_FIGHT_ID, WATCH_ALARM, RIVAL_WAKES,
  RIVAL_YIELDS, SOVIK_MET, SOVIK_TAKEN, RIVAL_UNSEEN, watchesTraveler, watchFight } from './rival-light.js';

const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
/** Who speaks at the top of the stair: the fire, with a name and a line under it like anybody. */
const SOVIK_SPEAKER = Object.freeze({ id: 'sovik', name: SOVIK.name, role: 'The fire in the Elod Light' });
const FIGHTS = [WATCH_FIGHT_ID, LIGHT_FIGHT_ID];

/**
 * Addison's errand in the world (src/content/quests/rival-light/rival-light.js): the smugglers' door and its hatch, the Elodi
 * watch over a traveler who has no papers, the stair to the lantern and the fire at the top of it,
 * and the fight when the watch sees somebody it should not.
 *
 * **The watch** is the stealth module's (src/gameplay/law/stealth.js) with the Elodi as its guards: every
 * Elodi guard standing in East Suval near the traveler, with the vision the stealth module gives any
 * guard - farther by `SOVIK.glow` while the traveler carries a fire spirit. Seen without papers,
 * the traveler is attacked by the guards near enough to come, and at the light Subtractidaughter
 * comes out of her blockhouse after them with her clock. She yields rather than dies.
 *
 * `people()` is the host's NPC list (each {id, name, modelRole, hidden, fallen, actor.group}); `place`
 * moves the traveler (the door is a passage, not a walk); `showSovik(where)` is the picture's
 * business: 'lantern', 'carried', 'addison' or null.
 */
export function createRivalLightHost({ heist, world, player, combat, inventory, crime, corpses, people = () => [],
  sneaking = () => false, place = () => {}, toast = () => {}, openDialogue = () => {}, closeDialogue = () => {},
  refresh = () => {}, save = () => {}, audio = null, showSovik = () => {} }) {
  const stealth = createStealth({ lineOfSight: (guard, at) => guardLineOfSight(world, guard, at) });
  let nearby = null, watching = false, quiet = 0, yielded = false, fightOn = null;
  const position = () => player.group.position;
  const rival = () => people().find(npc => npc.id === SUBTRACTIDAUGHTER.id) ?? null;
  const up = npc => npc && !npc.hidden && !npc.fallen && !crime?.isDown?.(npc.id) && !corpses?.ownsNpc?.(npc.id);
  const asleep = () => heist.errand && !heist.alarm;
  const inEast = p => insideRegion('East Suval', p.x, p.z);
  const passport = () => (inventory?.count?.(PASSPORT_ITEM) ?? 0) > 0;
  /** Every Elodi guard on his feet in East Suval and near enough to matter. */
  function watchers(p) {
    const range = STEALTH.visionRange * (heist.carrying ? SOVIK.glow : 1);
    return people().filter(npc => npc.modelRole === 'elodi-guard' && up(npc)).map(npc => {
      const at = npc.combatPosition ?? npc.actor.group.position;
      return { id: npc.id, name: npc.name, x: at.x, z: at.z, yaw: npc.actor.group.rotation.y, range };
    }).filter(guard => inEast(guard) && gap(guard, p) < 48);
  }

  function placeRival() {
    const npc = rival();
    if (!npc) return;
    npc.hidden = asleep();
    const at = heist.alarm && !yielded && heist.errand ? BLOCKHOUSE_DOOR : SUBTRACTIDAUGHTER_STAND;
    world.npcPositions[npc.id] = { x: at.x, z: at.z };
  }
  function picture() {
    const s = heist.stage, ending = heist.ending;
    showSovik(s === 'taken' ? 'carried' : s === 'home' || (s === 'done' && ending === 'keep') ? 'addison'
      : s === 'done' && ending === 'free' ? null : 'lantern');
  }

  /** The watch has seen somebody where nobody may be. */
  function alarm(p, guards) {
    const near = guards.filter(guard => gap(guard, p) < 30);
    // At the light, asleep or not, she comes, unless she has already gone down on her knees tonight.
    const her = gap(p, RIVAL_HEAD) < 45 && heist.errand && !yielded && !crime?.isDown?.(SUBTRACTIDAUGHTER.id);
    const spec = watchFight({ traveler: p, guards: near, rival: her ? BLOCKHOUSE_DOOR : null });
    // A refusal is answered: the watch looks again, and nobody is left half-roused.
    if (!spec || !combat.startEncounter(spec)) { stealth.reset(p); quiet = 3; return false; }
    fightOn = spec.id; yielded = false;
    if (her) { heist.rouse(); placeRival(); }
    audio?.effect?.('alarm');
    toast(her ? `${WATCH_ALARM} ${RIVAL_WAKES}` : WATCH_ALARM, her ? 'THE ELOD LIGHT' : 'EAST SUVAL · NO PAPERS');
    refresh(); save();
    return true;
  }

  function frame(dt, { playing = true } = {}) {
    nearby = null;
    placeRival();
    picture();
    if (!playing) return;
    quiet = Math.max(0, quiet - dt);
    const p = position(), fighting = combat.state.phase === 'active';
    // The watch: only inside East Suval, only without papers, and not while a fight is already on.
    watching = watchesTraveler({ inside: inEast(p), passport: passport() }) && !fighting;
    if (watching) {
      const guards = watchers(p);
      const awareness = stealth.update({ dt, position: p, sneaking: sneaking(), taught: true, guards, paused: quiet > 0 });
      if (awareness.caught && !quiet && guards.length) alarm(p, guards);
    } else if (!fighting) stealth.reset(p);
    if (fighting) return;
    // What can be done here.
    if (gap(p, SMUGGLERS_DOOR.west) < SMUGGLERS_DOOR.reach) {
      nearby = (inventory?.count?.(KEY_ITEM) ?? 0) > 0
        ? { id: 'smugglers-door', prompt: 'Unlock the smugglers’ door and go through' }
        : { id: 'smugglers-door-locked', prompt: 'An iron door, low in the rock · locked' };
    } else if (gap(p, SMUGGLERS_DOOR.east) < SMUGGLERS_DOOR.reach) {
      nearby = { id: 'smugglers-hatch', prompt: 'Back through the smugglers’ door' };
    } else if (heist.stage === 'asked' && gap(p, TOWER_STEP) < 2.2) {
      nearby = { id: 'elod-stair', prompt: 'Climb the stair to the lantern' };
    }
  }

  function takeSovik() {
    const result = heist.take(inventory);
    if (!result.ok) return result;
    // **Dangerous to touch** (the user): lifting him burns, and it is never the whole of anybody.
    const hp = combat.state.player.hp, burn = Math.max(0, Math.min(SOVIK.burn, hp - 1));
    if (burn > 0) combat.exhaust(0, burn, { hold: false });
    inventory?.refresh?.();
    audio?.effect?.('success');
    const lines = [...SOVIK_TAKEN, ...(result.way === 'quiet' ? RIVAL_UNSEEN : [])];
    openDialogue(SOVIK_SPEAKER, lines, null, 'Down the stair', { onComplete: () => {} });
    toast(`Sovik is in your arms, and he glows: the watch will see you farther off. Your hands: −${burn} health.`, 'THE FIRE IN THE ELOD LIGHT');
    refresh(); save();
    return { ...result, burn };
  }

  function interact() {
    if (!nearby) return false;
    const { id } = nearby;
    if (id === 'smugglers-door-locked') { toast('Iron, set low in the rock, and locked. Somebody has the key to this.', 'THE SMUGGLERS’ DOOR'); return true; }
    if (id === 'smugglers-door' || id === 'smugglers-hatch') {
      const to = id === 'smugglers-door' ? SMUGGLERS_DOOR.east : SMUGGLERS_DOOR.west;
      place(to.x, to.z, to.yaw);
      stealth.reset(to); quiet = 1.5;
      toast(id === 'smugglers-door'
        ? 'Forty paces bent double in the wet dark under the ridge, and a hatch among the stones at the far end. East Suval. Nobody has papers here but the Elodi.'
        : 'Back under the ridge, and out into West Suval, where nobody is looking for papers.', 'THE SMUGGLERS’ DOOR');
      save();
      return true;
    }
    if (id === 'elod-stair') {
      openDialogue(SOVIK_SPEAKER, [...SOVIK_MET], null, 'At the top of the stair', { choices: [
        { id: 'lift-sovik', label: 'Lift him out of the dish.', action: () => { closeDialogue(); takeSovik(); } },
        { id: 'leave-sovik', label: 'Not yet.', action: closeDialogue },
      ] });
      return true;
    }
    return false;
  }

  function combatEvent(event) {
    if (!FIGHTS.includes(combat.state.encounterId ?? fightOn)) return;
    if (event.type === 'enemy-yielded' && event.npcId === SUBTRACTIDAUGHTER.id) {
      yielded = true;
      toast(RIVAL_YIELDS[0], 'SUBTRACTIDAUGHTER');
    }
    if (['victory', 'retreat', 'defeat'].includes(event.type)) {
      const won = event.type === 'victory', her = rival();
      fightOn = null; stealth.reset(position()); quiet = won ? 0 : 6;
      placeRival();
      if (won && yielded && her) openDialogue(her, [...RIVAL_YIELDS], null, 'The stair');
      else if (won) toast('Nobody is left standing between you and the stair.', 'THE ELOD LIGHT');
      refresh(); save();
    }
  }

  function restore() {
    // The errand's things are the errand's: a traveler who has agreed has the key, and one carrying
    // the fire has him (an old save held the stepped lens instead).
    if (heist.errand && !inventory?.count?.(KEY_ITEM)) inventory?.grant?.(KEY_ITEM);
    if (heist.stage === 'taken' && !inventory?.count?.(SOVIK_ITEM)) inventory?.grant?.(SOVIK_ITEM);
    if (inventory?.count?.('elodi-lens')) inventory.remove('elodi-lens', inventory.count('elodi-lens'));
    stealth.reset(position()); quiet = 1; yielded = false; fightOn = null; nearby = null;
    placeRival(); picture();
  }

  return { frame, interact, combatEvent, restore, takeSovik,
    get nearby() { return nearby; }, get watching() { return watching; }, get awareness() { return stealth.view(); },
    get asleep() { return asleep(); } };
}

/** Where Sovik is drawn: the Elod Light's lantern, or Addison's if she kept him. */
export const SOVIK_SPOTS = Object.freeze({
  lantern: SOVIK_LANTERN,
  addison: Object.freeze({ x: SUVAL_LIGHT.tower.x, z: SUVAL_LIGHT.tower.z, y: lanternHeight(SUVAL_LIGHT.tower) }),
});

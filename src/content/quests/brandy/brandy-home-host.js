import { BRANDY, BRANDY_STAND } from './brandy.js';
import { BRANDY_HOME } from './brandy-home-world.js';
import { JOHN, SALT_PORTS } from '../salt/salt-sultan.js';
import { createBrandyHome, createJonHomeVisit, brandyRoutineAt } from './brandy-home.js';
import { validateBrandyHousehold } from './brandy-home-state.js';
import { roadRoute } from '../../../gameplay/autoplay/autopilot.js';
import { createHomeReturnWalker } from '../homes/home-return-routes.js';

const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const point = p => ({ x: p.x, z: p.z });
function remainingRoute(from, line) {
  let best;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1], b = line[i], dx = b.x - a.x, dz = b.z - a.z;
    const t = Math.max(0, Math.min(1, ((from.x - a.x) * dx + (from.z - a.z) * dz) / (dx * dx + dz * dz || 1)));
    const at = { x: a.x + t * dx, z: a.z + t * dz }, gap = distance(from, at);
    if (!best || gap <= best.gap) best = { at, gap, index: i };
  }
  return best ? [best.at, ...line.slice(best.index)] : line;
}

/** Daily life owns actual feet, including offscreen walking, while the common
 * NPC loop owns rendering/animation. The ship remains moored until Jon returns. */
export function createBrandyHomeHost({ world, npcWorld, npcById, player, salt,
  combat, crime, corpses, now, toast, save, openDialogue, closeDialogue } = {}) {
  const home = BRANDY_HOME, pier = SALT_PORTS[0].stand;
  const move = createHomeReturnWalker(npcWorld);
  const available = id => {
    const npc = npcById.get(id);
    return !!npc && !npc.fallen && !crime.isDown(id) && !corpses.ownsNpc(id);
  };
  const status = id => {
    const npc = npcById.get(id), fighter = ['active', 'defeated'].includes(combat.state.phase)
      && [...combat.state.enemies, ...combat.state.allies].find(one => one.id === id || one.npcId === id);
    return { available: available(id), busy: !!fighter || crime.controlsNpc(id),
      position: fighter || npc?.combatPosition || npc?.actor.group.position };
  };
  const route = (id, from, residence, leg, target) => {
    if (id === BRANDY.id) {
      if (distance(from, target) < 3) return [target];
      const line = distance(target, BRANDY_STAND) < .5 ? [...home.route].reverse() : home.route;
      return [...remainingRoute(from, line), target];
    }
    if (leg === 'outbound') return [...(roadRoute(world.paths, from, home.entry) ?? []), home.entry, target];
    return [...remainingRoute(from, [home.visitor, home.entry, ...(roadRoute(world.paths, home.entry, pier) ?? []), target])];
  };
  let changed = false;
  const onEvent = () => { changed = true; };
  const brandy = createBrandyHome({ home, yard: BRANDY_STAND, move, route, onEvent });
  const jon = createJonHomeVisit({ home: { ...home, porch: home.visitor }, pier, move, route, onEvent });

  function apply(id, state) {
    const npc = npcById.get(id);
    if (!npc || !available(id) || status(id).busy) return;
    if (id === JOHN.id && !state.managed) {
      npc.residentMotion = undefined;
      return;
    }
    npc.residentMotion = state.pace; npc.hidden = !!state.hidden;
    world.npcPositions[id] = point(state.position);
    const p = state.position;
    npc.actor.group.position.set(p.x, world.heightAt(p.x, p.z), p.z);
    npc.actor.group.rotation.y = state.yaw;
    if (state.hidden) { npc.actor.group.visible = false; npc.marker.visible = false; }
  }

  function frame(dt, playing = true) {
    const playSeconds = now(), j = jon.tick(dt, { salt: salt.snapshot(), playing,
      homeSleeping: brandyRoutineAt(playSeconds) === 'sleeping', ...status(JOHN.id) });
    if (playing && j.managed && j.phase === 'visiting' && brandy.view().phase === 'inside')
      brandy.knock({ playSeconds, available: available(BRANDY.id) });
    const visitor = j.managed && j.phase === 'visiting' && available(JOHN.id)
      && distance(player.group.position, home.porch) > 8 ? j.position : player.group.position;
    const b = brandy.tick(dt, { playSeconds, playing, player: visitor, ...status(BRANDY.id) });
    apply(BRANDY.id, b); apply(JOHN.id, j);
    const brandyNpc = npcById.get(BRANDY.id), jonNpc = npcById.get(JOHN.id);
    if (j.managed && j.phase === 'visiting' && available(JOHN.id)) {
      jonNpc.face = b.hidden ? home.door : b.position;
      if (!b.hidden && b.pace < .1) brandyNpc.face = j.position;
    } else { if (brandyNpc) brandyNpc.face = undefined; if (jonNpc) jonNpc.face = undefined; }
    if (changed) { changed = false; save(); }
    return { brandy: b, jon: j };
  }

  function restore(data) {
    if (!validateBrandyHousehold(data)) return false;
    brandy.restore(data?.brandy, { playSeconds: now() }); jon.restore(data?.jon);
    changed = false;
    apply(BRANDY.id, brandy.view());
    apply(JOHN.id, jon.tick(0, { salt: salt.snapshot(), playing: false }));
    return true;
  }
  function nearby() {
    return distance(player.group.position, home.door) < 3.2 ? home : null;
  }
  function knock() {
    const b = brandy.view(), npc = npcById.get(BRANDY.id);
    if (!available(BRANDY.id)) { toast('No answer.', 'JON AND BRANDY'); return true; }
    if (b.sleeping) { toast('Brandy is asleep. Come back in the morning.', 'JON AND BRANDY'); return true; }
    if (b.phase !== 'inside') { toast('Brandy is outside, near her boards or the doorstep.', 'JON AND BRANDY'); return true; }
    openDialogue(npc, ['Brandy answers from behind the door. “Oh. Someone came all the way up here. That is rather nice.”'], null, 'At the door', {
      noWayfinding: true, choices: [
        { id: 'brandy-home-come-out', label: 'Ask Brandy to come outside', action: () => {
          closeDialogue(); const result = brandy.knock({ playSeconds: now(), available: available(BRANDY.id) });
          if (!result.ok) toast(result.reason, 'JON AND BRANDY');
          else { apply(BRANDY.id, brandy.view()); changed = false; save(); }
        } },
        { id: 'brandy-home-leave', label: 'Leave her in peace', action: closeDialogue },
      ],
    });
    return true;
  }
  return Object.freeze({ frame, restore, nearby, knock,
    state: () => ({ brandy: brandy.view(), jon: jon.view() }),
    snapshot: () => ({ version: 1, brandy: brandy.snapshot(), jon: jon.snapshot() }),
    get holdDeparture() { return jon.holdDeparture; },
    get ashorePosition() { return jon.view().managed ? jon.view().position : null; },
    get familyVisitor() { const j = jon.view(); return j.managed && j.phase === 'visiting' && available(JOHN.id) ? j.position : null; },
  });
}

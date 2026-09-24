/** The company's authored sea leg. A courier walks to a quay, boards, then
 * arrives at the other real quay after saved active time. No path spans the sea.
 * The host hides/transports the same rider, mount and optional passenger.
 */
import { FERRY_LANDINGS } from './ferry.js';
import { MAIN_ISLAND, islandAt } from './peblos-world.js';
import { roadRoute } from './autopilot.js';
import { COMPANY_FERRY_SECONDS, validCompanyTransit } from './company-transit-state.js';
export { COMPANY_FERRY_SECONDS, validCompanyTransit } from './company-transit-state.js';

const valid = p => Number.isFinite(p?.x) && Number.isFinite(p?.z);
const point = p => ({ x: p.x, z: p.z });
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

export function createCompanyTransport({ story, world, readActor, onEvent = () => {},
  landings = FERRY_LANDINGS, paths = world?.paths ?? [],
} = {}) {
  if (!story?.actor || !world || typeof readActor !== 'function')
    throw new TypeError('Company transport needs the shared story, world and real actor positions.');
  const sideOf = p => {
    if (!valid(p)) return null;
    // Quays can lie beyond a cartographic region edge; their authored footprint wins.
    if (distance(p, landings.peblos.ashore) < 32) return 'peblos';
    if (distance(p, landings.drent.ashore) < 32) return 'drent';
    const region = world.regionAt?.(p.x, p.z);
    if ((region?.name ?? region) === 'Peblos') {
      const island = islandAt(p.x, p.z);
      return island?.id === MAIN_ISLAND.id ? 'peblos' : 'unserved-island';
    }
    return 'drent';
  };
  function road(from, to) {
    const route = roadRoute(paths, from, to) ?? [];
    if (!route.length || distance(route.at(-1), to) > .1) route.push(point(to));
    // A disconnected road network must not produce a 200m beach-to-island chord.
    // Local collisions are the movement adapter's responsibility; this checks water.
    if (typeof world.heightAt === 'function' && typeof world.waterAt === 'function') {
      let previous = from, submerged = 0;
      for (const next of route) {
        const length = distance(previous, next), samples = Math.max(1, Math.ceil(length / 3));
        for (let i = 1; i <= samples; i++) {
          const t = i / samples, x = previous.x + (next.x - previous.x) * t, z = previous.z + (next.z - previous.z) * t;
          // Short river edges are handled by actual swimming/bridge tasks. Refuse
          // a sustained open-water route even if an unrelated path was nearest.
          submerged = world.heightAt(x, z) < world.waterAt(x, z) - .4 ? submerged + length / samples : 0;
          if (submerged > 18) return null;
        }
        previous = next;
      }
    }
    return route;
  }
  function chooseRoute(id, from, to, { purpose = 'company travel', mounted = false, passenger = false } = {}) {
    if (!valid(from) || !valid(to) || !story.actor(id)?.alive) return null;
    const saved = story.actor(id).route?.transit;
    if (validCompanyTransit(saved) && saved.status === 'sailing') return null;
    const origin = sideOf(from), destination = sideOf(to);
    if (origin === 'unserved-island' || destination === 'unserved-island') return null;
    if (origin === destination) {
      if (saved) story.observe(id, { route: { transit: null } });
      return road(from, to);
    }
    const transit = { status: 'approach', from: origin, to: destination, elapsed: 0,
      destination: point(to), purpose, mounted: !!mounted, passenger: !!passenger };
    story.observe(id, { route: { transit } });
    const approach = road(from, landings[origin].ashore);
    return approach ? { points: approach, terminal: true } : null;
  }
  function update(dt, { paused = false } = {}) {
    if (paused || !Number.isFinite(dt) || dt <= 0) return [];
    const emitted = [];
    const emit = event => { emitted.push(event); onEvent(event); };
    for (const actor of story.actors()) {
      const transit = actor.route?.transit;
      if (!validCompanyTransit(transit)) continue;
      if (!actor.alive) { story.observe(actor.id, { route: { transit: null } }); continue; }
      const actual = readActor(actor.id);
      if (transit.status === 'approach') {
        if (!valid(actual) || actual.busy || actor.detained || distance(actual, landings[transit.from].ashore) > 1.2) continue;
        story.observe(actor.id, { activity: 'crossing by ferry', route: { transit: { ...transit, status: 'sailing', elapsed: 0 } } });
        emit({ type: 'company-ferry-departed', id: actor.id, from: transit.from, to: transit.to,
          position: { ...landings[transit.from].ashore }, mounted: transit.mounted, passenger: transit.passenger, purpose: transit.purpose });
        continue;
      }
      const elapsed = Math.min(COMPANY_FERRY_SECONDS, transit.elapsed + dt);
      if (elapsed < COMPANY_FERRY_SECONDS) { story.observe(actor.id, { route: { transit: { ...transit, elapsed } } }); continue; }
      const ashore = landings[transit.to].ashore;
      story.observe(actor.id, { position: ashore, activity: 'leaving the ferry', route: { transit: null } });
      emit({ type: 'company-ferry-arrived', id: actor.id, from: transit.from, to: transit.to,
        position: { ...ashore }, destination: { ...transit.destination }, mounted: transit.mounted,
        passenger: transit.passenger, purpose: transit.purpose });
    }
    return emitted;
  }
  return Object.freeze({ chooseRoute, update, sideOf,
    isInTransit: id => { const a = story.actor(id), t = a?.route?.transit; return !!a?.alive && validCompanyTransit(t) && t.status === 'sailing'; } });
}

/**
 * Autoplay: the computer walks the main quest while the player watches.
 *
 * Pure planning and steering with no DOM or render dependencies. Each frame the
 * host hands over a snapshot of the game and receives a command: where to walk,
 * where to look, and which of the ordinary player actions to perform (talk,
 * continue dialogue, choose a reply, swing, dodge, open the satchel, mount,
 * dismount and whistle for the horse). Once the traveler has a horse, a long
 * leg is ridden: the autopilot whistles the horse up, mounts, canters, and
 * steps down a few strides short of where it is going. The
 * autopilot never teleports, edits quest state, or bypasses the game's own
 * rules; it presses the same buttons a person would. Any trusted input from the
 * person stops it (the host enforces that).
 */
import { canStand, QUEST_DONE } from './game-state.js';

export const AUTOPILOT_VERSION = 1;
export const AUTOPILOT_DEFAULTS = Object.freeze({
  dialoguePace: 2.2,      // seconds a line stays up before the autopilot continues
  choicePace: 1.4,        // seconds before a reply is chosen
  interactEvery: .8,      // seconds between F presses
  swingEvery: .3,         // seconds between swing attempts
  stuckAfter: 1.6,        // seconds without progress before a detour
  idleLimit: 260,         // seconds without quest progress before giving up: a 1.7 km road takes a while between steps
  side: 'empire',         // which way the fork at Solis is taken
  runBeyond: 3.2,         // metres from the goal beyond which the autopilot runs: it travels at a run and walks only the last stride up to someone
  rideBeyond: 60,         // metres from the goal beyond which a leg is worth the saddle
  dismountWithin: 9,      // metres from the goal at which the rider steps down
  fetchHorseWithin: 30,   // a horse this near is walked to; a farther one is whistled up
  whistleEvery: 8,        // seconds between whistles while the horse is on its way
  afootAfterStuck: 25,    // seconds on foot after a horse has been stuck, so a narrow gate is walked
  saddleRefused: 3,       // seconds of asking to mount or step down before trying something else
  fetchPatience: 5,       // seconds of walking to the horse without getting closer (a wall between) before going on foot
});

/** Quest replies the autopilot will pick, most important first. */
export const CHOICE_PRIORITY = Object.freeze([
  'meet-courier', 'return-courier', 'meet-crossing-keeper', 'return-crossing-keeper', 'meet-ridge-keeper', 'deliver-report',
  'accept-lauvel-search', 'return-courier-satchel', 'admit-to-camp', 'join-muster', 'take-legate-terms', 'enter-solis', 'side-empire', 'side-coalition', 'march-out', 'reach-line', 'sound-advance', 'begin-assault', 'close-aftermath',
  'hollis-repair-wood',
]);
const LEAVE_PATTERN = /^(leave|back|until|done|goodbye)/i;

const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const angleTo = (from, to) => Math.atan2(-(to.x - from.x), -(to.z - from.z)); // camera yaw that faces `to`
const wrap = angle => Math.atan2(Math.sin(angle), Math.cos(angle));

/**
 * What a straight walk to a point would cost: its distance, with ground that
 * cannot be walked counted dearly. The driftwood on the far bank of the Caloss is
 * nearer in a straight line than the pile on this side and a river away on foot.
 */
export function walkCost(from, to, world, radius = .4) {
  const gap = distance(from, to), steps = Math.max(1, Math.ceil(gap / 2.5));
  let blocked = 0;
  for (let step = 1; step <= steps; step++) {
    const t = step / steps;
    if (!canStand(from.x + (to.x - from.x) * t, from.z + (to.z - from.z) * t, world, radius)) blocked++;
  }
  return gap + blocked * 30;
}

/** The one of `places` that is easiest to walk to, water and walls counted. */
export function easiestOf(places, from, world) {
  let best = null, bestCost = Infinity;
  for (const place of places) {
    const cost = walkCost(from, place, world);
    if (cost < bestCost) { best = place; bestCost = cost; }
  }
  return best;
}

/** Camera-relative movement input that walks the character along a world direction. */
export function moveInput(yaw, dx, dz, run = false) {
  const length = Math.hypot(dx, dz);
  if (length < 1e-6) return { forward: 0, side: 0, run: false };
  const ux = dx / length, uz = dz / length;
  // Host movement: world = (-sin(yaw)*forward + cos(yaw)*side, -cos(yaw)*forward - sin(yaw)*side).
  const forward = -(ux * Math.sin(yaw) + uz * Math.cos(yaw));
  const side = ux * Math.cos(yaw) - uz * Math.sin(yaw);
  return { forward, side, run };
}

/** Index of the polyline vertex nearest a point. */
export function nearestVertex(path, point) {
  let best = 0, bestDistance = Infinity;
  for (let i = 0; i < path.length; i++) {
    const d = distance(path[i], point);
    if (d < bestDistance) { bestDistance = d; best = i; }
  }
  return { index: best, distance: bestDistance };
}

/**
 * The nearest point on a polyline: where it is, how far, which leg it sits on,
 * and how far along the whole line it lies. Road vertices are a hundred metres
 * and more apart, so "near the road" has to be measured against the road itself
 * and not against its corners.
 */
export function nearestOnPath(path, point) {
  let best = { index: 0, distance: Infinity, x: path[0]?.x ?? 0, z: path[0]?.z ?? 0, along: 0 }, travelled = 0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i], dx = b.x - a.x, dz = b.z - a.z, square = dx * dx + dz * dz;
    const length = Math.sqrt(square);
    const t = square ? Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.z - a.z) * dz) / square)) : 0;
    const x = a.x + dx * t, z = a.z + dz * t, gap = Math.hypot(point.x - x, point.z - z);
    if (gap < best.distance) best = { index: i - 1, distance: gap, x, z, along: travelled + length * t };
    travelled += length;
  }
  return best;
}

/** How far from the main road's own line a point still counts as being on it. */
export const ROAD_CORRIDOR = 14;

/**
 * Where to head next. Long trips follow the main trail (the first authored
 * path, which runs from the landing up the whole northern road); short hops and
 * the last stretch go straight, sliding around anything in the way.
 */
/**
 * The road that serves a walk to `target`: the one the destination itself stands
 * on, nearest first, and only then the one the traveler happens to be near. The
 * destination does not move, so the choice does not flicker as the traveler walks
 * — picking by both ends at once had it turning round between two roads that run
 * close together, and walking back and forth across a border.
 */
export function bestTrail(paths = [], position, target) {
  let best = paths?.[0] ?? [], bestTo = Infinity, bestFrom = Infinity;
  for (const path of paths ?? []) {
    if (!path || path.length < 2) continue;
    const to = nearestOnPath(path, target);
    if (to.distance >= ROAD_CORRIDOR) continue;
    const from = nearestOnPath(path, position);
    if (to.distance < bestTo - .5 || (Math.abs(to.distance - bestTo) <= .5 && from.distance < bestFrom)) {
      best = path; bestTo = to.distance; bestFrom = from.distance;
    }
  }
  return best;
}

/**
 * The roads as one network. `world.paths` are separate polylines — the main road,
 * the Solis road, the stockade spur — that meet where one starts on another, so a
 * journey like Solis to the Moros outpost runs along three of them. Vertices of
 * different roads within JOIN of each other are the same junction.
 */
const JOIN = 7;
const NETWORK_REACH = 60;
const roadNetworks = new WeakMap();
function roadNetwork(paths) {
  let network = roadNetworks.get(paths);
  if (network) return network;
  const nodes = [], edges = [], segments = [];
  const link = (a, b) => { const w = distance(nodes[a], nodes[b]); edges[a].push([b, w]); edges[b].push([a, w]); };
  for (const path of paths) {
    let previous = -1;
    for (const point of path) {
      const index = nodes.push({ x: point.x, z: point.z }) - 1; edges.push([]);
      if (previous >= 0) { link(previous, index); segments.push([previous, index]); }
      previous = index;
    }
  }
  for (let a = 0; a < nodes.length; a++) for (let b = a + 1; b < nodes.length; b++)
    if (distance(nodes[a], nodes[b]) < JOIN) link(a, b);
  network = { nodes, edges, segments };
  roadNetworks.set(paths, network);
  return network;
}

/**
 * The road vertices from near `from` to the reachable road point nearest `to`,
 * over every road, or null when `from` is far from any road or the network gets
 * no closer. A track that stops short of the destination (the outpost's own lanes
 * do not join the Moros road) still takes the traveler as near as the roads go.
 */
export function roadRoute(paths, from, to) {
  const { nodes, edges, segments } = roadNetwork(paths);
  // Join a road where we actually stand, even halfway along a 200 m stretch.
  // Routing from the nearest vertex sent travelers across the inside of bends.
  let entry = null;
  for (const [a, b] of segments) {
    const point = nearestOnPath([nodes[a], nodes[b]], from);
    if (!entry || point.distance < entry.point.distance) entry = { a, b, point };
  }
  if (!entry || entry.point.distance >= NETWORK_REACH) return null;
  const cost = new Float64Array(nodes.length).fill(Infinity), previous = new Int32Array(nodes.length).fill(-1), done = new Uint8Array(nodes.length);
  cost[entry.a] = distance(entry.point, nodes[entry.a]);
  cost[entry.b] = distance(entry.point, nodes[entry.b]);
  for (;;) {
    let current = -1;
    for (let i = 0; i < nodes.length; i++) if (!done[i] && cost[i] < Infinity && (current < 0 || cost[i] < cost[current])) current = i;
    if (current < 0) break;
    done[current] = 1;
    for (const [next, weight] of edges[current]) if (cost[current] + weight < cost[next]) { cost[next] = cost[current] + weight; previous[next] = current; }
  }
  let exit = null;
  for (const [a, b] of segments) {
    if (!Number.isFinite(cost[a])) continue;
    const point = nearestOnPath([nodes[a], nodes[b]], to);
    const viaA = cost[a] + distance(nodes[a], point), viaB = cost[b] + distance(nodes[b], point);
    const end = viaA <= viaB ? a : b;
    let travel = Math.min(viaA, viaB), direct = false;
    if (a === entry.a && b === entry.b) {
      travel = distance(entry.point, point); direct = true;
    }
    if (!exit || point.distance < exit.point.distance - .5 || (Math.abs(point.distance - exit.point.distance) <= .5 && travel < exit.travel))
      exit = { point, end, travel, direct };
  }
  if (!exit || exit.point.distance >= distance(from, to) - 3) return null;
  const route = [];
  if (!exit.direct) for (let i = exit.end; i >= 0; i = previous[i]) route.unshift(nodes[i]);
  route.unshift({ x: entry.point.x, z: entry.point.z });
  route.push({ x: exit.point.x, z: exit.point.z });
  return route.filter((point, index) => !index || distance(point, route[index - 1]) > .1);
}

/** The next route vertex to walk at: past the one we are beside, never one behind us. */
function stepAlong(route, position) {
  let index = 0, gap = Infinity;
  route.forEach((point, i) => { const d = distance(point, position); if (d < gap) { gap = d; index = i; } });
  if (index < route.length - 1 && (gap < 1.4 || isBehind(position, route[index], route[index + 1]))) index++;
  return route[index];
}

/** Past this, a walled place's gate is somewhere to get to by road, not a heading. */
const GATE_REACH = 45;

export function nextWaypoint(position, target, world, memory = {}) {
  const gateway = enclosureWaypoint(position, target, world);
  // Near a gate, walk at it and through it. A gate half a kilometre off (the outpost's,
  // seen from Solis) is a destination: take the road there, as for any other place.
  if (gateway && distance(position, gateway.point) > GATE_REACH) return nextWaypoint(position, gateway.point, world, memory);
  if (gateway) return gateway;
  const gap = distance(position, target);
  const trail = bestTrail(world.paths, position, target);
  const goal = nearestOnPath(trail, target);
  // Leave the road for a nearby person, parcel or workbench. A cart can be
  // walked around; water still requires the crossing, even on a short leg.
  const approach = gap <= NEAR_DETOUR && goal.distance > 2
    && clearLine(position, target, bareGround(world));
  if (gap > 6 && !approach) {
    const route = roadRoute(world.paths ?? [], position, target);
    if (route?.length > 1) {
      // Return to the centre before advancing along it. This is also how a
      // traveler beside a bridge gets back to its mouth instead of its water.
      if (distance(position, route[0]) > 2 && clearLine(position, route[0], world))
        return { point: route[0], onTrail: true };
      return { point: stepAlong(route, position), onTrail: true };
    }
  }
  return { point: target, onTrail: false };
}

/**
 * Walled places (`world.enclosures`, outermost first: Solis, then its Court of
 * Oaths) are entered and left by their gates. When the traveler and the
 * destination are on either side of a wall, leave the innermost place first or
 * enter the outermost first: make for the near end of the cheapest gate, then
 * walk its passage to the far end.
 */
export function enclosureWaypoint(position, target, world) {
  const places = world.enclosures ?? [];
  const leaving = [...places].reverse().find(place => place.contains(position.x, position.z) && !place.contains(target.x, target.z));
  const place = leaving ?? places.find(candidate => !candidate.contains(position.x, position.z) && candidate.contains(target.x, target.z));
  if (place) {
    const inside = place === leaving;
    let best = null, bestCost = Infinity;
    // A harbour gate is the way to the water, not the way inland: straight-line
    // distance would send a traveler bound for the Moros out onto Solis's quay.
    const outside = inside ? target : position;
    const landward = place.gates.filter(gate => !gate.harbour || distance(gate.outer, outside) < 80);
    for (const gate of landward.length ? landward : place.gates) {
      const near = inside ? gate.inner : gate.outer, far = inside ? gate.outer : gate.inner;
      const cost = distance(position, near) + distance(far, target);
      if (cost < bestCost) { bestCost = cost; best = { near, far }; }
    }
    // Already in the gate's corridor: keep going through. Otherwise head for its mouth.
    const dx = best.far.x - best.near.x, dz = best.far.z - best.near.z, length = dx * dx + dz * dz;
    const t = length ? Math.max(0, Math.min(1, ((position.x - best.near.x) * dx + (position.z - best.near.z) * dz) / length)) : 0;
    const corridor = Math.hypot(position.x - best.near.x - dx * t, position.z - best.near.z - dz * t);
    return { point: corridor < 1.6 ? best.far : best.near, onTrail: false, gate: true };
  }
  return null;
}

/** Whether a straight walk from `from` to `to` stays on standable ground. */
/** Within this, a line blocked only by things standing on the ground is walked round. */
const NEAR_DETOUR = 30;

/** The ground alone, without what stands on it: water shows, carts and posts do not. */
function bareGround(world) {
  return { bounds: world.bounds, colliders: [], heightAt: (x, z) => world.heightAt(x, z) };
}

export function clearLine(from, to, world, radius = .42) {
  const steps = Math.max(1, Math.ceil(distance(from, to) / .6));
  for (let step = 1; step <= steps; step++) {
    const t = step / steps;
    if (!canStand(from.x + (to.x - from.x) * t, from.z + (to.z - from.z) * t, world, radius)) return false;
  }
  return true;
}

function isBehind(position, vertex, next) {
  if (!next) return false;
  const ax = next.x - vertex.x, az = next.z - vertex.z, bx = position.x - vertex.x, bz = position.z - vertex.z;
  return ax * bx + az * bz > 0;
}

/** A free direction toward `point`, trying wider angles when the straight line is blocked. */
export function freeDirection(position, point, world, preferredSide = 1) {
  const dx = point.x - position.x, dz = point.z - position.z, length = Math.hypot(dx, dz);
  if (length < 1e-6) return { x: 0, z: 0 };
  const base = Math.atan2(dx, dz);
  const probe = 1.1;
  for (const offset of [0, .5, -.5, 1.0, -1.0, 1.5, -1.5, 2.1, -2.1]) {
    const angle = base + offset * preferredSide;
    const ux = Math.sin(angle), uz = Math.cos(angle);
    if (canStand(position.x + ux * probe, position.z + uz * probe, world) && canStand(position.x + ux * probe * .5, position.z + uz * probe * .5, world))
      return { x: ux, z: uz };
  }
  return { x: Math.sin(base), z: Math.cos(base) };
}

/** Which reply to give in the open conversation, if any. */
export function chooseReply(choices, snapshot, { side = 'empire' } = {}) {
  const enabled = choices.filter(choice => choice.enabled !== false);
  if (!enabled.length) return null;
  // Every chapter that can put a reply in front of the traveler, not just the
  // road and Luscia: without the Moros camp here the autopilot reaches the camp
  // gate, finds nothing it recognises, says goodbye and walks away again.
  const wanted = new Set([snapshot.journey, snapshot.luscia, snapshot.moros, snapshot.border, snapshot.aftermath]
    .flatMap(chapter => chapter?.actions ?? []).filter(action => action.enabled).map(action => action.id));
  // One side or the other, never both: the fork at Solis is the one reply that is a choice.
  const refused = side === 'coalition' ? 'side-empire' : 'side-coalition';
  for (const id of CHOICE_PRIORITY) {
    if (id === refused) continue;
    if (id === 'hollis-repair-wood' && (snapshot.inventory?.sticks ?? 0) >= 3) continue;
    if (enabled.some(choice => choice.id === id) && (wanted.has(id) || id === 'hollis-repair-wood')) return id;
  }
  return enabled.find(choice => LEAVE_PATTERN.test(choice.id) || LEAVE_PATTERN.test(choice.label ?? ''))?.id ?? enabled[enabled.length - 1].id;
}

/** The combat decision for one frame. */
export function fightCommand(snapshot) {
  const { position, combat } = snapshot;
  const enemies = combat.enemies.filter(enemy => enemy.active !== false && enemy.action !== 'dead');
  if (!enemies.length) return { intent: 'Catching a breath', move: null, yaw: null, actions: [] };
  enemies.sort((a, b) => distance(position, a) - distance(position, b));
  const nearest = enemies[0], gap = distance(position, nearest);
  const yaw = angleTo(position, nearest);
  const threat = enemies.find(enemy => (enemy.action === 'windup' && enemy.progress >= (combat.hasShield ? .18 : .45) && distance(position, enemy) < 3.4)
    || (enemy.action === 'attack' && enemy.progress < (combat.hasShield ? 1 : .45) && distance(position, enemy) < 2.9));
  if (threat && combat.hasShield && combat.action === 'idle' && combat.stamina >= (combat.guardCost ?? 18))
    return { intent: 'Catching the strike on the shield', move: null, yaw: angleTo(position, threat), guard: true, actions: [] };
  if (threat && combat.action !== 'dodge' && combat.stamina >= 25) {
    // Step aside, across the line of the strike.
    const tx = threat.x - position.x, tz = threat.z - position.z, length = Math.hypot(tx, tz) || 1;
    return { intent: 'Dodging a strike', move: null, yaw, actions: [{ type: 'dodge', x: -tz / length, z: tx / length }] };
  }
  // A soldier on guard turns a blade: strike whoever is open (swinging at an ally, or getting over a swing), or wait for it.
  const open = enemies.find(enemy => !enemy.guarded && distance(position, enemy) <= 2.3);
  if (combat.action === 'idle' && open && combat.stamina >= 6)
    return { intent: 'Striking', move: null, yaw: angleTo(position, open), actions: [{ type: 'attack', yaw: Math.atan2(open.x - position.x, open.z - position.z) }] };
  if (combat.action === 'idle' && gap <= 2.3 && nearest.guarded) return { intent: 'Waiting for him to swing', move: null, yaw, actions: [] };
  if (gap > 2.0 && combat.action === 'idle') {
    const dx = nearest.x - position.x, dz = nearest.z - position.z;
    return { intent: 'Closing on the enemy', move: moveInput(yaw, dx, dz, false), yaw, actions: [] };
  }
  return { intent: 'Waiting for an opening', move: null, yaw, actions: [] };
}

/** The current goal of the main quest, from the tutorial through the road out of Drent. */
export function planGoal(snapshot, world) {
  const { mode, questStage, journey } = snapshot;
  if (mode === 'opening') return { kind: 'begin', intent: 'Stepping ashore' };
  if (mode === 'arriving') return { kind: 'wait', intent: 'Coming ashore' };
  if (mode === 'defeated') return { kind: 'retry', intent: 'Getting back up' };
  if (mode === 'dialogue') return { kind: 'dialogue', intent: 'Talking' };
  if (mode === 'inventory') return { kind: 'close-inventory', intent: 'Closing the satchel' };
  // The map tutorial opens the journal; once a lesson is learned the journal is closed again.
  if (mode === 'journal') return snapshot.mapTutorial >= 1 ? { kind: 'close-journal', intent: 'Closing the journal' } : { kind: 'wait', intent: 'Paused' };
  if (mode !== 'playing') return { kind: 'wait', intent: 'Paused' };
  if (snapshot.combat.phase === 'active') {
    // A broken blade swings at nothing, and a fight with nothing to hurt never ends.
    // Take up a spare stick, or fall back out of the fight to have the blade mended:
    // the chapter waits, and the commander gives the word again.
    if (!snapshot.weapon.usable) {
      if ((snapshot.inventory.sticks ?? 0) > 0) return { kind: 'equip', item: 'forest-stick', intent: 'Readying a spare stick' };
      const bench = nearestOf(world.repairBenches ?? [], snapshot.position);
      if (bench) return { kind: 'use', target: bench, radius: 1.6, check: 'nearRepair', intent: 'Falling back to mend the blade' };
    }
    return { kind: 'fight', intent: 'Fighting' };
  }
  if (snapshot.mapTutorial === 1) return { kind: 'open-chart', intent: 'Reading the chart of Azhora' };
  if (snapshot.mapTutorial === 2) return { kind: 'open-trails', intent: 'Reading the local trails' };
  // Mend a broken weapon before any chapter sends the traveler into its next fight.
  if (!snapshot.weapon.usable) {
    if ((snapshot.inventory.sticks ?? 0) > 0) return { kind: 'equip', item: 'forest-stick', intent: 'Readying a spare stick' };
    const bench = nearestOf(world.repairBenches ?? [], snapshot.position);
    if (bench) return { kind: 'use', target: bench, radius: 1.6, check: 'nearRepair', intent: 'Finding a repair bench' };
  }
  // The campaign says which chapter the traveler is on. Follow it: a game begun at a
  // later chapter (the opening screen offers one) has no earlier chapter to finish.
  const chapter = snapshot.campaign?.chapterId;
  if (chapter && questStage >= QUEST_DONE) {
    if (snapshot.aftermath?.variant) return aftermathGoal(snapshot, world);
    // The envoy, the report, the march and the battle are one chapter of the border's.
    if ((chapter === 'suval-envoy' || chapter === 'border-battle') && snapshot.border) return borderGoal(snapshot, world);
    if (chapter === 'moros-camp' && snapshot.moros) return morosGoal(snapshot, world);
    if (chapter === 'luscia-aftermath' && snapshot.luscia) return lusciaGoal(snapshot, world);
  }
  if (snapshot.combat.hp < 40) {
    if (snapshot.inventory.cookedFish > 0) return { kind: 'eat', item: 'cooked-fish', intent: 'Eating' };
    if (snapshot.inventory.pawpaws > 0) return { kind: 'eat', item: 'pawpaw', intent: 'Eating' };
  }
  const npc = id => world.npcPositions[id];
  switch (questStage) {
    case 0: return { kind: 'talk', target: npc('harbormaster'), npcId: 'harbormaster', intent: 'Walking up the pier to Jojo' };
    case 1: return { kind: 'talk', target: npc('harbormaster'), npcId: 'harbormaster', intent: 'Speaking with Jojo' };
    // Officer Glun sets the lesson, and nothing at the straw counts until he has (src/instructor.js).
    case 2: return snapshot.lessonSet === false
      ? { kind: 'talk', target: npc('instructor'), npcId: 'instructor', intent: 'Reporting to Officer Glun' }
      : { kind: 'practice', target: world.training, intent: snapshot.practiceHits < 2 ? 'Practising at the straw post'
        : (snapshot.practiceGuards ?? 0) < 1 && snapshot.combat.hasShield ? 'Practising with the shield' : 'Practising a dodge' };
    // And the third subquest is the road west: out of the forest, over the Caloss, on to
    // Nothom, where Iven holds the assignment. The journey below takes it from the boundary.
    default: break;
  }
  if (!journey?.started) return { kind: 'walk', target: world.border, radius: 3.5, intent: 'Walking to the forest boundary' };
  if (journey.complete) return lusciaGoal(snapshot, world);
  /**
   * **The bridge first, because the planner cannot swim.** Six paces of the Caloss span are in
   * the river (src/world-regions.js), and everything over the water is on the far bank: Nothom,
   * Iven, and the rest of the road. A traveler can swim it; this walks, and it routes by ground
   * it can stand on, so it would walk to the near lip of the break and stop there for good.
   *
   * So the side errand becomes its route. It is the same three steps a player takes - ask
   * Chip, gather the driftwood, lash the span - and it is only taken while the crossing is
   * actually down: mended by anybody, by a player or by an earlier run, this falls straight
   * through to the road (`bridge`, src/journey.js).
   */
  const mending = journey.bridge && !['done', 'closed', 'on-the-road'].includes(journey.bridge);
  if (mending || journey.stage === 'repair-bridge') {
    if (journey.bridge === 'offered') return { kind: 'talk', target: npc('crossing-keeper'), npcId: 'crossing-keeper', intent: 'Asking Chip about the crossing' };
    if (journey.bridge === 'repaired') return { kind: 'talk', target: npc('crossing-keeper'), npcId: 'crossing-keeper', intent: 'Telling Chip the span is down again' };
    if ((snapshot.inventory.sticks ?? 0) < 3) {
      const site = easiestOf((world.stickSites ?? []).filter(site => !site.collected), snapshot.position, world);
      if (site) return { kind: 'use', target: site, radius: 1.5, siteId: site.id, intent: 'Gathering driftwood' };
      return { kind: 'talk', target: npc('crossing-keeper'), npcId: 'crossing-keeper', intent: 'Asking Chip for timber' };
    }
    if (world.journeySites?.['bridge-repair'])
      return { kind: 'use', target: world.journeySites['bridge-repair'], radius: 1.5, siteId: 'bridge-repair', intent: 'Laying the span back down' };
  }
  const id = journey.destinationIds?.[0];
  if (!id) return { kind: 'done', intent: 'Nothing left on the road' };
  if (world.npcPositions[id]) return { kind: 'talk', target: world.npcPositions[id], npcId: id, intent: `Speaking with ${world.npcNames?.[id] ?? id}` };
  if (world.journeySites?.[id]) return { kind: 'use', target: world.journeySites[id], radius: 1.5, siteId: id, intent: `Heading to ${world.journeySites[id].name ?? id}` };
  if (id === 'border') return { kind: 'walk', target: world.border, radius: 3.5, intent: 'Walking to the forest boundary' };
  return { kind: 'wait', intent: 'Looking for the next step' };
}

/**
 * The Luscia chapter, once the road out of Drent is filed: the clerk on Lumber
 * Town's square, the courier's satchel at the Lauvel, the wolves that come off
 * the burial line (the ordinary fight policy handles those), and back again.
 */
/** The army on the plain: the camp gate, the Marshal's muster, the horse line. */
/** The day after the battle: rally to the commander, fight (the ordinary fight policy handles it), and report. */
/**
 * Once the day after is done, the chapter closes on the traveler's own side's ground: the
 * place their side has just taken, which is where they stand after the report.
 */
export function homeGoal(snapshot, world) {
  const aftermath = snapshot.aftermath, seat = world.sideSeat?.(snapshot.campaign?.side, aftermath?.complete ? aftermath.variant : null);
  if (!seat) return { kind: 'done', intent: 'The war moves on', reason: 'The day after the border battle is done and you have your pay and your orders. What follows is the next chapter, and it is not built yet.' };
  const gap = distance(snapshot.position, seat);
  const named = seat.name.charAt(0).toUpperCase() + seat.name.slice(1);
  if (gap <= (seat.reach ?? 110) - 12) return { kind: 'done', intent: `Standing in ${seat.name}`,
    reason: `${seat.taken ? `${named} is your side’s now, and you are standing in it` : `You are back in ${seat.name}`} with your pay and your orders. What follows is the next chapter, and it is not built yet.` };
  return { kind: 'walk', target: seat, radius: Math.max(8, (seat.reach ?? 110) - 20), intent: `Making for ${seat.name}` };
}

export function aftermathGoal(snapshot, world) {
  const aftermath = snapshot.aftermath;
  if (aftermath.complete) return homeGoal(snapshot, world);
  if (!aftermath.built) return { kind: 'done', intent: 'The border battle is fought', reason: 'The border battle is fought and the war moves on. The ground for what follows is not built yet.' };
  const id = aftermath.destinationIds?.[0];
  if (id && world.npcPositions?.[id]) return { kind: 'talk', target: world.npcPositions[id], npcId: id, intent: `Going to ${world.npcNames?.[id] ?? id}` };
  return { kind: 'wait', intent: 'Holding with the company' };
}

/** The Marshal's terms, the gate and the envoy at Solis, the report and the march, and the line. The autopilot keeps the Empire's contract. */
export function borderGoal(snapshot, world) {
  const border = snapshot.border;
  if (border?.complete && snapshot.aftermath?.variant) return aftermathGoal(snapshot, world);
  if (border?.complete) return { kind: 'done', intent: 'The border battle is fought', reason: 'The border battle is fought and the war moves on. What follows is the next chapter, and it is not built yet.' };
  if (!border?.destinationIds?.length) return { kind: 'wait', intent: 'Waiting on the line' };
  const id = border.destinationIds[0];
  if (world.npcPositions?.[id]) return { kind: 'talk', target: world.npcPositions[id], npcId: id, intent: `Going to ${world.npcNames?.[id] ?? id}` };
  return { kind: 'wait', intent: 'Looking for the next step at the border' };
}

export function morosGoal(snapshot, world) {
  const moros = snapshot.moros;
  if (moros?.complete && snapshot.border) return borderGoal(snapshot, world);
  if (moros?.complete)
    return { kind: 'done', intent: 'On the Marshal’s muster', reason: 'You are on the Marshal’s muster with a horse on the line. The road to Solis is the next chapter, and it is not built yet.' };
  if (!moros?.destinationIds?.length) return { kind: 'wait', intent: 'Waiting for orders from the Moros' };
  const id = moros.destinationIds[0];
  if (world.npcPositions?.[id]) return { kind: 'talk', target: world.npcPositions[id], npcId: id, intent: `Reporting to ${world.npcNames?.[id] ?? id}` };
  const site = world.morosSites?.[id];
  if (site) return { kind: 'use', target: site, radius: 1.8, siteId: id, intent: `Going to ${site.name ?? id}` };
  return { kind: 'wait', intent: 'Looking for the next step on the Moros' };
}

export function lusciaGoal(snapshot, world) {
  const luscia = snapshot.luscia;
  if (luscia?.complete && snapshot.moros) return morosGoal(snapshot, world);
  if (!luscia?.destinationIds?.length || luscia.complete)
    return { kind: 'done', intent: luscia?.complete ? 'The field at the Lauvel is settled' : 'The road out of Drent is done',
      reason: luscia?.complete ? 'The field at the Lauvel is settled and the army owes you a horse. The Moros camp is the next chapter, and it is not built yet.' : null };
  const id = luscia.destinationIds[0];
  if (world.npcPositions?.[id])
    return { kind: 'talk', target: world.npcPositions[id], npcId: id, intent: `Speaking with ${world.npcNames?.[id] ?? id}` };
  const site = world.lusciaSites?.[id];
  if (site) return { kind: 'use', target: site, radius: 1.5, siteId: id, intent: `Searching ${site.name ?? id}` };
  return { kind: 'wait', intent: 'Looking for the next step in Luscia' };
}

function nearestOf(points, position) {
  let best = null, bestDistance = Infinity;
  for (const point of points) { const d = distance(point, position); if (d < bestDistance) { bestDistance = d; best = point; } }
  return best;
}

/**
 * The autopilot itself. `read()` returns the snapshot; `act` carries out
 * commands; `step(dt)` runs once per rendered frame while active.
 */
export function createAutopilot({ world, read, act, options = {} } = {}) {
  const config = { ...AUTOPILOT_DEFAULTS, ...options };
  let active = false, intent = '', reason = '', lastYaw = null, guard = false, walkPoint = null, move = { forward: 0, side: 0, run: false };
  let timers = { dialogue: 0, interact: 0, swing: 0, idle: 0, stuck: 0, whistle: 99, afoot: 0, saddleStuck: 0, mounting: 0, dismounting: 0, riding: 0, fetching: 0, fetchBest: Infinity };
  let progressKey = '', goalKey = '', bestDistance = Infinity, detour = 0, detourSide = 1, stopReason = '';
  const listeners = new Set();
  const notify = event => { for (const listener of listeners) listener(event); };

  function start() {
    if (active) return false;
    active = true; guard = false; walkPoint = null; stopReason = ''; timers = { dialogue: 0, interact: 0, swing: 0, idle: 0, stuck: 0, whistle: 99, afoot: 0, saddleStuck: 0, mounting: 0, dismounting: 0, riding: 0, fetching: 0, fetchBest: Infinity };
    progressKey = ''; goalKey = ''; bestDistance = Infinity; detour = 0; move = { forward: 0, side: 0, run: false }; lastYaw = null;
    notify({ type: 'start' });
    return true;
  }

  function stop(why = 'stopped') {
    if (!active) return false;
    active = false; guard = false; walkPoint = null; stopReason = why; move = { forward: 0, side: 0, run: false }; lastYaw = null; intent = '';
    notify({ type: 'stop', reason: why });
    return true;
  }

  function walkToward(snapshot, target, radius) {
    const position = snapshot.position;
    const gap = distance(position, target);
    if (gap <= radius) { move = { forward: 0, side: 0, run: false }; return true; }
    const waypoint = nextWaypoint(position, target, world);
    walkPoint = waypoint.point;
    let direction = freeDirection(position, waypoint.point, world, detourSide);
    if (detour > 0) {
      // Swap to a sidestep for a moment when progress has stalled.
      direction = { x: direction.z * detourSide, z: -direction.x * detourSide };
      if (!canStand(position.x + direction.x, position.z + direction.z, world)) direction = { x: -direction.x, z: -direction.z };
    }
    const yaw = Math.atan2(-direction.x, -direction.z);
    lastYaw = yaw;
    move = moveInput(yaw, direction.x, direction.z, gap > config.runBeyond);
    return false;
  }

  /**
   * The horse, for a leg toward `target`: an action to take instead of walking
   * ('mount', 'dismount', 'whistle'), or a walk to the horse, or null to go on
   * as before (on foot, or in the saddle at a canter).
   */
  function saddle(snapshot, target, dt) {
    const riding = snapshot.riding;
    if (!riding?.owned || !riding.horse || snapshot.combat?.phase === 'active') return null;
    const gap = distance(snapshot.position, target);
    timers.riding = Math.max(0, timers.riding - dt);
    if (riding.mounted) {
      timers.mounting = 0;
      timers.saddleStuck = timers.stuck > 0 ? timers.saddleStuck + dt : 0;
      if (timers.saddleStuck > config.stuckAfter * 2) { timers.saddleStuck = 0; timers.afoot = config.afootAfterStuck; return { type: 'dismount', intent: 'Stepping down: the horse cannot get through' }; }
      if (gap <= config.dismountWithin && timers.riding <= 0) {
        // No room to step down here: ride on a little and try again, rather than sit asking.
        if ((timers.dismounting += dt) > config.saddleRefused) { timers.dismounting = 0; timers.riding = 1.5; return null; }
        return { type: 'dismount', intent: 'Stepping down' };
      }
      timers.dismounting = 0;
      return null;
    }
    timers.dismounting = 0;
    if (timers.afoot > 0 || gap < config.rideBeyond || snapshot.combat?.action !== 'idle') { timers.mounting = 0; return null; }
    const toHorse = distance(snapshot.position, riding.horse);
    if (toHorse <= 2.4) {
      // The game will not let him up here (no room, or something in the way): go on foot for a while.
      if ((timers.mounting += dt) > config.saddleRefused) { timers.mounting = 0; timers.afoot = config.afootAfterStuck; return null; }
      return { type: 'mount', intent: 'Into the saddle' };
    }
    timers.mounting = 0;
    if (toHorse <= config.fetchHorseWithin) {
      // Near as the crow flies is not near with a wall between: give it up if the gap will not close.
      if (toHorse < timers.fetchBest - .3) { timers.fetchBest = toHorse; timers.fetching = 0; } else timers.fetching += dt;
      if (timers.fetching > config.fetchPatience) { timers.fetching = 0; timers.fetchBest = Infinity; timers.afoot = config.afootAfterStuck; return null; }
      return { type: 'fetch', intent: 'Going to the horse' };
    }
    timers.fetching = 0; timers.fetchBest = Infinity;
    if (timers.whistle >= config.whistleEvery) { timers.whistle = 0; return { type: 'whistle', intent: 'Whistling for the horse' }; }
    return null;
  }

  function trackProgress(snapshot, key, gap, dt) {
    // Progress toward the next road corner counts even when the road bends away
    // from the final destination. Otherwise every such bend triggers a sidestep.
    if (walkPoint) { key += `:${walkPoint.x.toFixed(1)},${walkPoint.z.toFixed(1)}`; gap = distance(snapshot.position, walkPoint); }
    if (key !== progressKey) { progressKey = key; bestDistance = gap; timers.stuck = 0; timers.idle = 0; detour = 0; return; }
    // Ground gained toward the goal is progress, however long the road: only standing still runs the idle clock.
    if (gap < bestDistance - .05) { bestDistance = gap; timers.stuck = 0; timers.idle = 0; }
    else timers.stuck += dt;
    if (detour > 0) detour -= dt;
    else if (timers.stuck > config.stuckAfter) { detour = .9; detourSide = -detourSide; timers.stuck = 0; }
  }

  function step(dt = 1 / 60) {
    if (!active) return null;
    guard = false; walkPoint = null;
    const snapshot = read();
    if (!snapshot) return null;
    timers.dialogue += dt; timers.interact += dt; timers.swing += dt; timers.idle += dt; timers.whistle += dt; timers.afoot = Math.max(0, timers.afoot - dt);
    const goal = planGoal(snapshot, world);
    intent = goal.intent;
    const actions = [];
    lastYaw = null; move = { forward: 0, side: 0, run: false };
    const key = `${snapshot.questStage}:${goal.kind}:${goal.npcId ?? goal.siteId ?? ''}:${snapshot.journey?.stage ?? ''}`;
    if (key !== goalKey) { goalKey = key; timers.idle = 0; }
    switch (goal.kind) {
      case 'begin': actions.push({ type: 'begin' }); timers.idle = 0; break;
      case 'retry': actions.push({ type: 'retry' }); timers.idle = 0; break;
      case 'wait': break;
      case 'done': stop(goal.reason || 'The road out of Drent is finished. Luscia is the next chapter, and it is not built yet.'); return null;
      case 'dialogue': {
        const dialogue = snapshot.dialogue;
        if (dialogue?.choices?.length) {
          if (timers.dialogue >= config.choicePace) { const id = chooseReply(dialogue.choices, snapshot, { side: config.side }); if (id) { actions.push({ type: 'choose', id }); timers.dialogue = 0; timers.idle = 0; } }
        } else if (timers.dialogue >= config.dialoguePace) { actions.push({ type: 'continue' }); timers.dialogue = 0; timers.idle = 0; }
        break;
      }
      case 'inspect-letter': if (timers.interact >= config.interactEvery) { actions.push({ type: 'select-item', id: 'harbor-letter' }); timers.interact = 0; } break;
      case 'open-inventory': if (timers.interact >= config.interactEvery) { actions.push({ type: 'open-inventory' }); timers.interact = 0; } break;
      case 'close-inventory': if (timers.interact >= config.interactEvery) { actions.push({ type: 'close-inventory' }); timers.interact = 0; } break;
      case 'open-chart': case 'open-trails': case 'close-journal': if (timers.interact >= config.interactEvery) { actions.push({ type: goal.kind }); timers.interact = 0; } break;
      case 'equip': actions.push({ type: 'equip', id: goal.item }); break;
      case 'eat': if (timers.interact >= config.interactEvery) { actions.push({ type: 'eat', id: goal.item }); timers.interact = 0; } break;
      case 'fight': {
        const command = fightCommand(snapshot);
        intent = command.intent; lastYaw = command.yaw; guard = !!command.guard; if (command.move) move = command.move;
        for (const action of command.actions) {
          if (action.type === 'attack') { if (timers.swing >= config.swingEvery) { actions.push(action); timers.swing = 0; } }
          else actions.push(action);
        }
        timers.idle = 0;
        break;
      }
      case 'walk': {
        const horse = saddle(snapshot, goal.target, dt);
        if (horse) {
          intent = horse.intent;
          if (horse.type === 'fetch') { walkToward(snapshot, snapshot.riding.horse, 2); break; }
          if (timers.interact >= config.interactEvery) { actions.push({ type: horse.type }); timers.interact = 0; }
          if (horse.type === 'whistle') walkToward(snapshot, goal.target, goal.radius ?? 2);
          break;
        }
        const arrived = walkToward(snapshot, goal.target, goal.radius ?? 2);
        trackProgress(snapshot, key, distance(snapshot.position, goal.target), dt);
        if (arrived && goal.radius) lastYaw = null;
        break;
      }
      case 'talk':
      case 'use': {
        const target = goal.target, gap = distance(snapshot.position, target);
        const horse = saddle(snapshot, target, dt);
        if (horse) {
          intent = horse.intent;
          if (horse.type === 'fetch') { walkToward(snapshot, snapshot.riding.horse, 2); trackProgress(snapshot, key, gap, dt); break; }
          if (timers.interact >= config.interactEvery) { actions.push({ type: horse.type }); timers.interact = 0; }
          if (horse.type === 'whistle') walkToward(snapshot, target, goal.radius ?? 1.9);
          trackProgress(snapshot, key, gap, dt);
          break;
        }
        const ready = goal.kind === 'talk' ? snapshot.interaction?.npcId === goal.npcId
          : goal.siteId ? snapshot.interaction?.siteId === goal.siteId : goal.check ? !!snapshot.interaction?.[goal.check] : gap <= (goal.radius ?? 1.5);
        if (ready && snapshot.combat.action === 'idle') {
          move = { forward: 0, side: 0, run: false }; lastYaw = angleTo(snapshot.position, target);
          if (timers.interact >= config.interactEvery) { actions.push({ type: 'interact' }); timers.interact = 0; }
        } else {
          // Approach until the game offers the F prompt; inch closer if it has not.
          const radius = gap <= (goal.radius ?? 1.9) && !ready ? Math.max(.6, (goal.radius ?? 1.9) - .8) : (goal.radius ?? 1.9);
          walkToward(snapshot, target, radius);
        }
        trackProgress(snapshot, key, gap, dt);
        break;
      }
      case 'practice': {
        const gap = distance(snapshot.position, goal.target);
        if (gap > 1.9) { walkToward(snapshot, goal.target, 1.9); trackProgress(snapshot, key, gap, dt); break; }
        lastYaw = angleTo(snapshot.position, goal.target);
        if (snapshot.practiceHits < 2) {
          if (snapshot.combat.action === 'idle' && snapshot.combat.stamina >= 6 && timers.swing >= config.swingEvery) {
            actions.push({ type: 'attack', yaw: Math.atan2(goal.target.x - snapshot.position.x, goal.target.z - snapshot.position.z) }); timers.swing = 0;
          }
        } else if ((snapshot.practiceGuards ?? 0) < 1 && snapshot.combat.hasShield) {
          guard = true;
        } else if (snapshot.practiceDodges < 1 && snapshot.combat.action === 'idle' && snapshot.combat.stamina >= 25) {
          const dx = goal.target.x - snapshot.position.x, dz = goal.target.z - snapshot.position.z, length = Math.hypot(dx, dz) || 1;
          actions.push({ type: 'dodge', x: -dz / length, z: dx / length });
        }
        timers.idle = 0;
        break;
      }
      default: break;
    }
    if (timers.idle > config.idleLimit) { stop('Autoplay could not find the way forward. You have control.'); return null; }
    for (const action of actions) act?.[action.type]?.(action);
    return { goal: goal.kind, intent, move, yaw: lastYaw, actions };
  }

  return {
    start, stop, step,
    configure(overrides = {}) { Object.assign(config, overrides); return { ...config }; },
    get active() { return active; },
    get intent() { return intent; },
    get move() { return move; },
    get yaw() { return lastYaw; },
    get guard() { return guard; },
    get stopReason() { return stopReason; },
    get reason() { return reason; },
    onEvent(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  };
}

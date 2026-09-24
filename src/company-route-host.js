/** Physical errands for the hired company. The shared story owns outcomes; this
 * driver owns destinations and work performed while somebody is actually there.
 * A placement is at most ONE collision-checked stride, never a timetable teleport.
 */
import { roadRoute } from './autopilot.js';
import { distanceAlongRoad, roadLengths } from './mercenaries.js';
import { LANDING_MATE_LESSON } from './landing-mate-quest.js';
import { MUS_ROUTE, WILD } from './wild-route.js';

const valid = p => Number.isFinite(p?.x) && Number.isFinite(p?.z);
const point = p => ({ x: p.x, z: p.z });
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const facing = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
const done = (a, task) => Object.hasOwn(a.tasks ?? {}, task);
const clone = value => JSON.parse(JSON.stringify(value));
const REACH = .85;

/** sites are clear standing points, not the centres of people/solid props.
 * move(id, from, target, maxDistance, {swimming,mounted}) must respect scenery.
 * travelRoute may explicitly return null when a ferry/other transport is needed.
 * readActor.busy suspends both movement and work during combat/other host scenes.
 */
export function createCompanyRouteDriver({
  story, roster = [], paths = [], sites = {}, readActor, move,
  travelRoute = null, onEvent = () => {}, ambushResolved = () => true,
  isAlive = () => true, collectMaterial = null, getMaterials = null,
} = {}) {
  if (!story?.actor || typeof readActor !== 'function' || typeof move !== 'function')
    throw new TypeError('The company route needs its shared story, real actors and collision-safe movement.');
  const road = paths[0] ?? [], spans = road.length > 1 ? roadLengths(road) : null;
  const caches = new Map(), notices = new Set();
  const formationTarget = (entry, side, kind = 'muster') => {
    const index = Math.max(0, roster.findIndex(a => a.id === entry.id));
    const authored = sites[kind === 'assault' ? 'assaultSpots' : 'musterSpots']?.[side];
    const named = authored?.[entry.id] ?? authored?.[index];
    if (valid(named)) return named;
    const centre = kind === 'assault'
      ? side === 'coalition' ? sites.republicanAssault : sites.imperialAssault
      : side === 'coalition' ? sites.republicanMuster : sites.imperialMuster;
    if (!valid(centre) || roster.length < 2) return centre;
    const width = Math.ceil(Math.sqrt(roster.length));
    return { x: centre.x + (index % width - (width - 1) / 2) * 3.2,
      z: centre.z + Math.floor(index / width) * 3.2 };
  };
  let output = [], courier = null, passenger = null, claimedHorses = new Set();
  const clear = () => { caches.clear(); notices.clear(); output = []; passenger = null; };
  const emit = (type, id, at, extra = {}, once = null) => {
    const key = once && `${id}:${once}`;
    if (key && notices.has(key)) return;
    if (key) notices.add(key);
    onEvent({ type, id, position: point(at), ...extra });
  };
  const observe = (id, value) => story.observe(id, value);
  const complete = (id, task, at) => {
    if (story.completeTask(id, task)) emit('npc-task-complete', id, at, { task });
  };
  function advance(id, stage, route = {}) {
    caches.delete(id);
    observe(id, { stage, route: { step: 0, work: 0, waypoint: 0, targetId: null, swimming: false, ...route } });
  }
  function setCourier(value) {
    const next = value?.id && ['seek', 'return', 'passenger'].includes(value.mode) ? { id: value.id, mode: value.mode } : null;
    if (courier?.id !== next?.id || courier?.mode !== next?.mode) {
      if (courier) caches.delete(courier.id);
      if (next) caches.delete(next.id);
      notices.delete(`${next?.id}:courier-arrived`);
      notices.delete(`${next?.id}:courier-returned`);
    }
    courier = next;
    if (!next || next.mode !== 'passenger') passenger = null;
  }
  function placement(entry, a, at, extra = {}) {
    return { id: entry.id, name: entry.name, phase: a.stage === 'mustered' ? 'mustered' : 'stopped',
      x: at.x, z: at.z, yaw: at.yaw ?? 0, distance: spans ? distanceAlongRoad(road, at, spans) : 0,
      walking: false, pace: entry.pace ?? 1.3, stopId: a.route?.targetId ?? a.stage,
      activity: a.activity, stage: a.stage, mounted: courier?.id === entry.id || mounted(entry.id),
      swimming: !!a.route?.swimming, inTransit: a.route?.transit?.status === 'sailing', ...extra };
  }
  function mounted(id) {
    return claimedHorses.has(id);
  }
  function navigate(entry, a, at, target, dt, options = {}) {
    if (!valid(target)) return placement(entry, a, at, { activity: 'waiting for a route' });
    const gap = distance(at, target), reach = options.reach ?? REACH;
    if (gap <= reach) return placement(entry, a, at, { reached: true,
      yaw: options.face && valid(options.face) ? facing(at, options.face) : at.yaw ?? 0 });
    const riding = options.mounted ?? mounted(entry.id), swimming = !!options.swimming;
    if (!!a.route?.swimming !== swimming) observe(entry.id, { route: { swimming } });
    let cache = caches.get(entry.id);
    if (!cache || cache.purpose !== options.purpose || distance(cache.target, target) > 3
      || distance(cache.last, at) > 9 || cache.swimming !== swimming) {
      let route;
      if (options.direct) route = [target];
      else if (travelRoute) route = travelRoute(entry.id, point(at), point(target), { purpose: options.purpose, mounted: riding, swimming,
        passenger: courier?.id === entry.id && courier.mode === 'passenger' });
      else route = roadRoute(paths, at, target) ?? [target];
      if (route === null) {
        emit('transport-needed', entry.id, at, { from: point(at), to: point(target), purpose: options.purpose }, `transport:${options.purpose}`);
        return placement(entry, a, at, { activity: 'waiting for transport', transportNeeded: true });
      }
      const terminal = !!route?.terminal;
      route = (Array.isArray(route) ? route : route?.points ?? []).filter(valid).map(point);
      if (!terminal && (!route.length || distance(route.at(-1), target) > .2)) route.push(point(target));
      if (!route.length) return placement(entry, a, at, { activity: 'waiting for transport', transportNeeded: true });
      cache = { purpose: options.purpose, target: point(target), last: point(at), route, index: 0, swimming };
      caches.set(entry.id, cache);
      notices.delete(`${entry.id}:transport:${options.purpose}`);
    }
    while (cache.index < cache.route.length - 1 && distance(at, cache.route[cache.index]) < .65) cache.index++;
    const next = cache.route[cache.index], pace = swimming ? 1.2 : riding ? 5.4 : entry.route === 'wild' ? WILD.pace : entry.pace ?? 1.3;
    const maxDistance = pace * dt;
    const moved = move(entry.id, at, next, maxDistance, { swimming, mounted: riding, purpose: options.purpose });
    cache.last = point(at);
    // A host refusal is stationary. Reject an accidental teleport from a bad adapter.
    const dest = valid(moved) && distance(at, moved) <= maxDistance + .01 ? moved : at;
    const walked = distance(at, dest) > .0001;
    return placement(entry, a, dest, { phase: walked ? 'walking' : 'stopped', walking: walked, pace,
      yaw: walked ? facing(at, dest) : at.yaw ?? 0, swimming, mounted: riding, activity: options.purpose,
      // Arrival/progress always belongs to the old, observed feet, not a promised next stride.
      distance: spans ? distanceAlongRoad(road, at, spans) : 0 });
  }
  function work(entry, a, at, target, duration, dt, purpose, options = {}) {
    const p = navigate(entry, a, at, target, dt, { ...options, purpose });
    if (!p.reached) return { placement: p, finished: false };
    const value = (a.route?.work ?? 0) + dt;
    observe(entry.id, { activity: purpose, route: { work: Math.min(duration, value) } });
    return { placement: { ...p, activity: purpose }, finished: value >= duration };
  }
  function stagePlacement(entry, a, at, dt, context) {
    const id = entry.id, route = a.route ?? {};
    if (courier?.id === id) {
      const seek = courier.mode === 'seek', target = seek ? context.player : sites.imperialMuster;
      const p = navigate(entry, a, at, target, dt, { purpose: seek ? 'courier-seek' : 'courier-return', mounted: true, reach: seek ? 2.8 : 1.8 });
      if (courier.mode === 'passenger') passenger = { id, x: at.x, z: at.z, yaw: p.yaw, swimming: p.swimming ?? false };
      if (p.reached && (!seek || context.playerSafe)) emit(seek ? 'courier-arrived' : 'courier-returned', id, at,
        { passenger: courier.mode === 'passenger' }, seek ? 'courier-arrived' : 'courier-returned');
      return p;
    }
    const q = story.satchel();
    // A reassigned carrier can be anywhere: find the real person, not their former cabin.
    if (q.handover?.to === id && q.assignee === id) {
      const holder = q.carrier === 'player' ? context.player : readActor(q.carrier);
      const p = navigate(entry, a, at, holder, dt, { purpose: 'satchel-handover', reach: 2.8 });
      if (p.reached && context.playerSafe) emit('npc-satchel-handover-arrived', id, at, { carrier: q.carrier }, `handover:${q.carrier}`);
      return p;
    }
    // The job may have been reassigned after this person had already left Nothom.
    if (q.assignee === id && q.status !== 'delivered' && q.carrier !== id && a.reportedAt !== null && a.stage !== 'relay') {
      advance(id, 'relay', { targetId: 'satchel' }); a = story.actor(id);
    }
    if (q.carrier === id && q.status !== 'delivered' && a.stage !== 'relay') {
      advance(id, 'relay', { targetId: 'satchel-return' }); a = story.actor(id);
    }
    if (a.stage === 'harbor') {
      const result = work(entry, a, at, sites.harbor, LANDING_MATE_LESSON.harborTalk, dt, 'reporting to Jojo');
      if (result.finished) { complete(id, 'harbor', at); advance(id, 'training'); }
      return result.placement;
    }
    if (a.stage === 'training') {
      const lessons = [
        { point: sites.instructor, duration: LANDING_MATE_LESSON.instructorTalk, name: 'listening to Glun' },
        { point: sites.training, duration: LANDING_MATE_LESSON.strikes, name: 'practising strikes', action: 'attack' },
        { point: sites.training, duration: LANDING_MATE_LESSON.guard, name: 'practising guard', action: 'idle', guarding: true },
        { point: sites.training, duration: LANDING_MATE_LESSON.dodge, name: 'practising dodge', action: 'dodge' },
        { point: sites.instructor, duration: LANDING_MATE_LESSON.report, name: 'reporting the drill' },
      ];
      const step = Math.min(lessons.length - 1, a.route.step ?? 0), lesson = lessons[step];
      const result = work(entry, a, at, lesson.point, lesson.duration, dt, lesson.name);
      if (result.placement.reached && lesson.action) result.placement.animation = {
        action: lesson.action, progress: ((a.route.work ?? 0) % 1.4) / 1.4, combo: 0, guarding: !!lesson.guarding,
      };
      if (result.finished) {
        if (step === lessons.length - 1) { complete(id, 'training', at); advance(id, 'road'); }
        else { caches.delete(id); observe(id, { route: { step: step + 1, work: 0 } }); }
      }
      return result.placement;
    }
    if (entry.route === 'wild' && a.stage === 'road') {
      const trail = sites.wildRoute ?? MUS_ROUTE, index = a.route.waypoint ?? 0;
      const p = navigate(entry, a, at, trail[index] ?? sites.imperialMuster, dt, { direct: true, purpose: `wild-${index}` });
      if (p.reached) {
        if (index < trail.length - 1) observe(id, { route: { waypoint: index + 1 } });
        else { story.decideAllegiance(id, 'wilderness-arrival'); advance(id, story.actor(id).allegiance === 'coalition' ? 'republican-muster' : 'imperial-muster'); }
      }
      return p;
    }
    if (a.stage === 'road' || a.stage === 'ambush') {
      const p = navigate(entry, a, at, sites.ambush, dt, { purpose: 'road ambush', reach: 2 });
      if (p.reached) {
        observe(id, { stage: 'ambush', activity: 'at the rebel ambush' });
        emit('npc-ambush-arrived', id, at, {}, 'ambush-arrived');
        if (ambushResolved(id)) { complete(id, 'ambush', at); advance(id, 'bridge'); }
      }
      return p;
    }
    if (a.stage === 'bridge') return bridgePlacement(entry, a, at, dt, context);
    if (a.stage === 'nothom') {
      const result = work(entry, a, at, sites.relay, 4, dt, 'reporting to Iven');
      if (result.finished) {
        const report = story.reportNothom(id);
        emit('npc-nothom-report', id, at, { report });
        advance(id, 'relay', { targetId: report.assignment?.ok ? 'satchel' : 'depart' });
      }
      return result.placement;
    }
    if (a.stage === 'relay') {
      const current = story.satchel();
      if (current.carrier === id && current.status !== 'delivered') {
        if (!a.allegianceDecided) {
          story.decideAllegiance(id, 'relay-soldier-encounter');
          // A local defection changes allegiance, but this carrier still has one
          // physical satchel to deliver before joining the appropriate muster.
          if (story.actor(id).stage !== 'relay') advance(id, 'relay', { targetId: 'satchel-return' });
          a = story.actor(id);
        }
        const side = story.actor(id).allegiance;
        const target = side === 'coalition' ? sites.republicanRelay ?? sites.relay : sites.returnRelay ?? sites.relay;
        const result = work(entry, a, at, target, 3, dt, 'returning the satchel');
        if (result.finished) {
          const delivered = story.deliverSatchel(id, { side });
          emit('npc-satchel-delivered', id, at, { side, delivered });
          advance(id, 'relay', { targetId: 'depart' });
        }
        return result.placement;
      }
      if (current.assignee === id && current.status !== 'delivered') {
        const dropped = !current.carrier && valid(current.position), target = dropped ? current.position : sites.hut;
        const p = navigate(entry, a, at, target, dt, { purpose: dropped ? 'finding the fallen satchel' : 'north relay cabin', reach: 1.8 });
        if (p.reached) {
          if (dropped) story.takeSatchel(id, { from: current.location });
          else if (!done(a, 'relay-soldier')) emit('npc-hut-arrived', id, at, {}, 'hut-arrived');
          else if (current.carrier === 'relay-republican') story.takeSatchel(id, { from: current.carrier });
        }
        return p;
      }
      if (story.horseFor(id) && !mounted(id) && valid(sites.ostler)) {
        const result = work(entry, a, at, sites.ostler, 3, dt, 'collecting the reserved horse');
        if (result.finished && story.claimHorse(id)) { claimedHorses.add(id); complete(id, 'horse', at); emit('npc-horse-claimed', id, at, { horse: story.horseFor(id) }); }
        return result.placement;
      }
      story.decideAllegiance(id);
      advance(id, story.actor(id).allegiance === 'coalition' ? 'republican-muster' : 'imperial-muster');
      return placement(entry, a, at);
    }
    if (a.stage === 'imperial-muster' || a.stage === 'republican-muster') {
      const side = a.stage === 'republican-muster' ? 'coalition' : 'empire';
      const p = navigate(entry, a, at, formationTarget(entry, side), dt, { purpose: `${side} muster`, reach: .7 });
      if (p.reached && story.arriveMuster(id, side)) emit('npc-muster-arrived', id, at, { side });
      return p;
    }
    if (a.stage === 'mustered' && story.muster(a.allegiance)?.status === 'departed') {
      const side = a.allegiance, target = formationTarget(entry, side, 'assault');
      // March to real authored ground. The host owns any battle that happens
      // there; arriving cannot invent a victory, casualty, or campaign step.
      if (valid(target)) {
        const task = `${side}-assault-ground`;
        const p = navigate(entry, a, at, target, dt, { purpose: `${side} advance`, reach: .7 });
        if (p.reached) {
          observe(id, { activity: 'holding at the battle assembly' });
          if (!done(a, task)) { complete(id, task, at); emit('npc-assault-arrived', id, at, { side }); }
          return { ...p, activity: 'holding at the battle assembly' };
        }
        observe(id, { activity: 'marching to the battle assembly' });
        return p;
      }
    }
    return placement(entry, a, at);
  }
  function bridgePlacement(entry, a, at, dt, context) {
    const id = entry.id, route = a.route;
    if (!done(a, 'chip')) {
      const result = work(entry, a, at, sites.chip, 4, dt, 'speaking with Chip');
      if (result.finished) {
        complete(id, 'chip', at);
        const together = roster.filter(other => other.id === id || (entry.group && other.group === entry.group))
          .filter(other => { const actor = story.actor(other.id), pos = readActor(other.id); return actor?.alive && !actor.withPlayer && valid(pos) && distance(pos, at) < 16; })
          .map(other => other.id);
        observe(id, { route: { work: 0, targetId: story.crossing(together), waypoint: 0 } });
      }
      return result.placement;
    }
    const bridge = story.bridge(), crossing = bridge.status === 'complete' ? 'bridge' : route.targetId;
    if (crossing === 'swim') {
      const swim = sites.swim ?? [], index = route.waypoint ?? 0;
      if (!swim.length) { emit('transport-needed', id, at, { from: point(at), to: sites.bridgeExit, purpose: 'river crossing' }, 'swim-route'); return placement(entry, a, at); }
      const p = navigate(entry, a, at, swim[index] ?? sites.bridgeExit, dt, { direct: true, swimming: true, mounted: false, purpose: `swimming-${index}` });
      if (p.reached) {
        if (index < swim.length - 1) observe(id, { route: { waypoint: index + 1, swimming: true } });
        else { complete(id, 'crossing', at); advance(id, 'nothom'); }
      }
      return p;
    }
    if (crossing === 'bridge') {
      const p = navigate(entry, a, at, sites.bridgeExit, dt, { purpose: 'crossing the repaired bridge' });
      if (p.reached) { complete(id, 'crossing', at); advance(id, 'nothom'); }
      return p;
    }
    if (bridge.materials < 3) {
      const used = route.materials ?? {};
      // Query the real pickups each frame: the traveler may collect one while a
      // builder approaches it. Never route to a spent pile or the far bank of a
      // broken crossing merely because a static list still contains that item.
      const sources = (getMaterials ? getMaterials(id) : sites.materials) ?? [];
      const available = sources.filter(m => valid(m) && !m.collected && (used[m.id] ?? 0) < (m.quantity ?? 1));
      available.sort((left, right) => distance(at, left) - distance(at, right));
      const reserve = sites.materialReserve;
      const material = available[0] ?? (valid(reserve) && (used[reserve.id] ?? 0) < (reserve.quantity ?? 3) ? reserve : null);
      if (!material) {
        // A host without a reserve must still leave the crossing repairable by
        // the player or another traveler. Preserve the intended repair choice.
        story.abandonBridge(id);
        emit('npc-bridge-materials-unavailable', id, at, {}, 'bridge-materials-unavailable');
        return placement(entry, a, at, { activity: 'looking for repair timber' });
      }
      if (!story.claimBridge(id).ok) return placement(entry, a, at, { activity: 'waiting for the bridge repair' });
      const requesting = material === reserve;
      const result = work(entry, a, at, material, requesting ? 3 : 1.2, dt,
        requesting ? 'requesting Chip\u2019s repair timber' : 'gathering bridge timber');
      if (result.finished) {
        const quantity = material.quantity ?? (requesting ? 3 : 1);
        const requested = Math.min(3 - bridge.materials, quantity - (used[material.id] ?? 0));
        const collected = collectMaterial ? collectMaterial(id, material.id, requested) : requested;
        const count = Math.max(0, Math.min(requested, Number.isFinite(collected) ? Math.floor(collected) : collected === true ? requested : 0));
        const attempted = count || quantity;
        observe(id, { route: { work: 0, materials: { ...used, [material.id]: (used[material.id] ?? 0) + attempted } } });
        if (count) { story.addBridgeMaterials(id, count); emit('npc-bridge-gather', id, at, { item: material.id, count, reserve: requesting }); }
      }
      return result.placement;
    }
    if (!story.claimBridge(id).ok) return placement(entry, a, at, { activity: 'waiting for the bridge repair' });
    const p = navigate(entry, a, at, sites.bridge, dt, { purpose: 'repairing the bridge' });
    if (p.reached) {
      story.workBridge(id, dt);
      if (story.completeBridge(id).ok) emit('npc-bridge-complete', id, at);
      return { ...p, animation: { action: 'attack', progress: (story.bridge().work % 2) / 2, combo: 0 }, activity: 'repairing the bridge' };
    }
    return p;
  }
  function update(dt, { paused = false, player = null, withPlayer = [], legacyPlacements = [], playerSafe = true, trainedIds = [] } = {}) {
    if (!Number.isFinite(dt) || dt < 0) return output;
    const following = new Set([...withPlayer, ...legacyPlacements.filter(p => p.phase === 'with-traveler').map(p => p.id)]);
    const trained = new Set(trainedIds), legacy = new Map(legacyPlacements.map(p => [p.id, p]));
    const context = { player, playerSafe, withPlayer: following };
    claimedHorses = new Set(story.snapshot().horses.filter(h => h.claimed).map(h => h.owner));
    output = []; passenger = null;
    for (const entry of roster) {
      let a = story.actor(entry.id), actual = readActor(entry.id), original = legacy.get(entry.id);
      if (!a || !a.alive || !isAlive(entry.id)) continue;
      if (a.stage === 'arrival' && original?.phase === 'coming') { output.push(original); continue; }
      if (!valid(actual)) { if (original?.phase === 'coming') output.push(original); continue; }
      observe(entry.id, { position: actual, withPlayer: following.has(entry.id), ...(Number.isFinite(actual.health) ? { health: actual.health } : {}) });
      a = story.actor(entry.id);
      if (following.has(entry.id) && courier?.id !== entry.id) {
        output.push(placement(entry, a, actual, { phase: 'with-traveler', x: null, z: null, walking: false })); continue;
      }
      if (a.stage === 'arrival' && original && (original.phase === 'landing'
        || entry.id === (sites.landingMateId ?? 'merc-gotwood') && !trained.has(entry.id)) && !actual.busy) {
        output.push(original); continue;
      }
      if (paused || dt === 0 || actual.busy || a.detained) { output.push(placement(entry, a, actual)); continue; }
      if (a.stage === 'arrival') {
        // Only the landing companion keeps the existing authored initial tutorial scene.
        // Its completed training is handed off once; releasing a companion never reruns it.
        if (entry.id === (sites.landingMateId ?? 'merc-gotwood') && !trained.has(entry.id)) {
          output.push(original ?? placement(entry, a, actual)); continue;
        }
        if (original?.phase === 'coming' || original?.phase === 'landing') { output.push(original); continue; }
        if (trained.has(entry.id)) { complete(entry.id, 'harbor', actual); complete(entry.id, 'training', actual); advance(entry.id, 'road'); }
        else advance(entry.id, entry.route === 'wild' ? 'road' : 'harbor');
        a = story.actor(entry.id);
      }
      output.push(stagePlacement(entry, a, actual, dt, context));
    }
    return output;
  }
  return Object.freeze({ update, placements: () => output.map(clone), clear, setCourier,
    passengerPose: () => passenger ? { ...passenger } : null });
}

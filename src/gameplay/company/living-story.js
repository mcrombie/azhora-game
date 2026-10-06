/** The shared, saved world behind the hired company's main story.
 *
 * Travel is deliberately NOT inferred from an absolute clock. The route driver reports
 * positions and completed work; this model owns the things nobody may do twice. Menus
 * stop tick(), loading does not advance it, and a companion remains where the host put him.
 */
import { MERCENARY_ROSTER } from './mercenaries.js';
import { validCompanyTransit } from './company-transit-state.js';

export const LIVING_STORY_VERSION = 1;
export const SATCHEL_DEADLINE = 600;
export const MUSTER_GRACE = 60;
export const BRIDGE_MATERIALS = 3;
export const BRIDGE_WORK = 20;
export const REMOUNT_COUNT = 4;
export const STORY_SIDES = Object.freeze(['empire', 'coalition']);
export const STORY_STAGES = Object.freeze(['arrival', 'harbor', 'training', 'road', 'ambush', 'bridge',
  'nothom', 'relay', 'imperial-muster', 'republican-muster', 'mustered', 'dead']);

const clone = value => JSON.parse(JSON.stringify(value));
const finite = value => Number.isFinite(value) && value >= 0;
const idOK = value => typeof value === 'string' && /^[a-z0-9][a-z0-9-]{0,79}$/.test(value);
const sideOf = value => value === 'republic' || value === 'republican' ? 'coalition' : value === 'imperial' ? 'empire' : value;
const pointOK = value => value === null || (value && Number.isFinite(value.x) && Number.isFinite(value.z));
const point = value => pointOK(value) && value ? { x: value.x, z: value.z } : null;
const timeOK = value => value === null || finite(value);
const emptyMuster = () => ({ arrivals: [], graceAt: null, status: 'gathering', playerArrivedAt: null, departedAt: null });

function validRoute(route) {
  if (!route || typeof route !== 'object' || Array.isArray(route)) return false;
  const optional = (key, accepts) => route[key] === undefined || accepts(route[key]);
  return optional('step', n => Number.isSafeInteger(n) && n >= 0)
    && optional('waypoint', n => Number.isSafeInteger(n) && n >= 0)
    && optional('work', finite)
    && optional('targetId', value => value === null || idOK(value))
    && optional('returnStage', value => value === null || STORY_STAGES.includes(value))
    && optional('swimming', value => typeof value === 'boolean')
    && optional('materials', value => value && typeof value === 'object' && !Array.isArray(value)
      && Object.entries(value).every(([id, amount]) => idOK(id) && Number.isSafeInteger(amount) && amount >= 0))
    && optional('transit', value => value === null || validCompanyTransit(value))
    && Object.keys(route).every(key => ['step', 'waypoint', 'work', 'targetId', 'returnStage', 'swimming', 'materials', 'transit'].includes(key));
}

/** Authored tendencies, not predetermined memberships. Events may overcome any tendency. */
export const MERCENARY_VALUES = Object.freeze({
  'merc-gotwood': -.65, 'merc-cromb': -.3, 'merc-word': .8, 'merc-jerry': .1,
  'merc-christin': .55, 'merc-ciaran': -.15, 'merc-lakota': .95,
  'merc-eliana': -.55, 'merc-matt': -1.25, 'merc-altun': .65, 'merc-mus': .7,
});
export const STORY_EXPERIENCES = Object.freeze({
  'imperial-cruelty': 2, 'imperial-aid': -1.5, 'republican-mercy': 1.8,
  'rebel-attack': -1.6, 'heard-republican-argument': .9, 'helped-civilians': .45,
  'paid-by-empire': -.6, 'comrade-betrayed': -1.2,
});

function stableNoise(seed, id) {
  let n = (2166136261 ^ seed) >>> 0;
  for (const c of id) n = Math.imul(n ^ c.charCodeAt(0), 16777619) >>> 0;
  return ((n >>> 8) % 1000) / 1000 - .5;
}

export function worldCalendar(seconds = 0) {
  // Date.UTC special-cases years 0..99. setUTCFullYear also makes the epoch explicit.
  const date = new Date(0); date.setUTCFullYear(980, 3, 1); date.setUTCHours(6, 0, 0, 0);
  date.setUTCMinutes(date.getUTCMinutes() + Math.floor(finite(seconds) ? seconds : 0));
  const month = date.getUTCMonth(), hour = date.getUTCHours(), minute = date.getUTCMinutes();
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const season = month < 2 || month === 11 ? 'Winter' : month < 5 ? 'Spring' : month < 8 ? 'Summer' : 'Autumn';
  const period = hour < 5 ? 'Night' : hour < 8 ? 'Dawn' : hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : hour < 20 ? 'Evening' : 'Night';
  return { year: date.getUTCFullYear(), month: month + 1, day: date.getUTCDate(), hour, minute, season, period,
    time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    label: `${date.getUTCDate()} ${months[month]} ${date.getUTCFullYear()} · ${season} · ${period}` };
}

export function bridgeChoice(ids = [], repaired = false) {
  if (repaired) return 'bridge';
  const present = new Set(ids);
  if (present.has('merc-ciaran')) return 'repair';
  if (present.has('merc-jerry') && present.has('merc-christin') && present.size === 2) return 'swim';
  if ([...present].some(id => ['merc-gotwood', 'merc-christin', 'merc-lakota', 'merc-matt', 'merc-altun', 'merc-cromb'].includes(id))) return 'repair';
  return 'swim'; // Ed, Eliana, Jerry alone, and Mus's wilderness crossing.
}

function newActor(entry) {
  return { id: entry.id, name: entry.name ?? entry.id, stage: 'arrival', position: null, activity: 'waiting',
    alive: true, detained: false, health: 100, withPlayer: false, allegiance: 'empire', allegianceDecided: false,
    allegianceEvent: null, experiences: [], tasks: {}, route: {}, horse: null, equipment: entry.weapon ?? 'sword',
    reportedAt: null, arrivedAt: null, deathAt: null };
}
function fresh(roster, seed) {
  return { version: LIVING_STORY_VERSION, seed: Number.isSafeInteger(seed) && seed >= 0 ? seed : 1, seconds: 0,
    actors: roster.map(newActor), player: { allegiance: 'empire', imperialRefused: false, horse: null, reportedAt: null },
    bridge: { status: 'available', owner: null, materials: 0, work: 0, completedBy: null, completedAt: null },
    satchel: { status: 'available', assignee: null, acceptedAt: null, deadlineAt: null, carrier: 'relay-republican',
      location: 'north-relay', position: null, warned: false, expired: [], completedBy: null, completedAt: null,
      rewardRecipient: null, deliveredSide: null, handover: null },
    reports: [], horses: [], muster: { empire: emptyMuster(), coalition: emptyMuster() },
    recall: { status: 'none', courier: null, attempts: 0, dispatchedAt: null, failed: [] },
    sequence: 0, history: [] };
}

export function validateLivingStorySnapshot(s) {
  if (!s || s.version !== LIVING_STORY_VERSION || !finite(s.seconds) || !Number.isSafeInteger(s.seed) || s.seed < 0
    || !Array.isArray(s.actors) || s.actors.length > 11 || new Set(s.actors.map(a => a?.id)).size !== s.actors.length) return false;
  const IDs = new Set(['player', ...s.actors.map(a => a?.id)]);
  const owner = value => value === null || IDs.has(value);
  for (const a of s.actors) if (!idOK(a.id) || typeof a.name !== 'string' || a.name.length > 120
    || !STORY_STAGES.includes(a.stage) || !pointOK(a.position) || typeof a.activity !== 'string'
    || !['alive', 'detained', 'withPlayer', 'allegianceDecided'].every(k => typeof a[k] === 'boolean')
    || !STORY_SIDES.includes(a.allegiance) || !finite(a.health) || a.health > 10000 || (a.alive ? a.health <= 0 : a.health !== 0)
    || !Array.isArray(a.experiences) || a.experiences.length > 100
    || a.experiences.some(e => !idOK(e?.key) || !finite(e.at) || !Number.isFinite(e.weight))
    || !a.tasks || typeof a.tasks !== 'object' || Object.entries(a.tasks).some(([key, value]) => !idOK(key) || !finite(value))
    || !validRoute(a.route) || JSON.stringify(a.route).length > 12000
    || ![a.reportedAt, a.arrivedAt, a.deathAt].every(timeOK)) return false;
  if (!s.player || !STORY_SIDES.includes(s.player.allegiance) || typeof s.player.imperialRefused !== 'boolean' || !timeOK(s.player.reportedAt)) return false;
  const b = s.bridge, q = s.satchel;
  if (!b || !['available', 'working', 'complete'].includes(b.status) || !owner(b.owner) || !owner(b.completedBy)
    || !finite(b.materials) || b.materials > BRIDGE_MATERIALS || !finite(b.work) || b.work > BRIDGE_WORK || !timeOK(b.completedAt)
    || (b.status === 'working' && !b.owner) || (b.status === 'complete' && b.completedAt === null)) return false;
  if (!q || !['available', 'assigned', 'handover', 'delivered'].includes(q.status) || !owner(q.assignee)
    || !(q.carrier === null || IDs.has(q.carrier) || q.carrier === 'relay-republican')
    || ![q.acceptedAt, q.deadlineAt, q.completedAt].every(timeOK) || !pointOK(q.position)
    || !Array.isArray(q.expired) || q.expired.some(id => !IDs.has(id)) || !owner(q.completedBy) || !owner(q.rewardRecipient)
    || typeof q.warned !== 'boolean' || (q.status === 'delivered' && (!q.completedBy || q.carrier !== null))
    || (q.deadlineAt !== null && q.deadlineAt < q.acceptedAt)
    || !(q.handover === null || (IDs.has(q.handover.to) && IDs.has(q.handover.from) && ['seeking', 'hostile'].includes(q.handover.status)))) return false;
  if (!Array.isArray(s.reports) || new Set(s.reports).size !== s.reports.length || s.reports.some(id => !IDs.has(id))
    || !Array.isArray(s.horses) || s.horses.length > REMOUNT_COUNT
    || new Set(s.horses.map(h => h?.id)).size !== s.horses.length || new Set(s.horses.map(h => h?.owner)).size !== s.horses.length
    || s.horses.some(h => !idOK(h.id) || !IDs.has(h.owner) || !finite(h.reservedAt) || typeof h.claimed !== 'boolean')) return false;
  for (const side of STORY_SIDES) {
    const m = s.muster?.[side];
    if (!m || !Array.isArray(m.arrivals) || new Set(m.arrivals).size !== m.arrivals.length || m.arrivals.some(id => !IDs.has(id) || id === 'player')
      || ![m.graceAt, m.playerArrivedAt, m.departedAt].every(timeOK) || !['gathering', 'ready', 'departed'].includes(m.status)) return false;
  }
  return !!s.recall && ['none', 'seeking', 'offered', 'passenger', 'returning', 'cancelled', 'refused', 'unavailable', 'complete'].includes(s.recall.status)
    && owner(s.recall.courier) && Number.isInteger(s.recall.attempts) && s.recall.attempts >= 0 && s.recall.attempts <= 2
    && timeOK(s.recall.dispatchedAt) && Array.isArray(s.recall.failed) && s.recall.failed.every(id => IDs.has(id))
    && Number.isSafeInteger(s.sequence) && s.sequence >= 0 && Array.isArray(s.history) && s.history.length <= 128;
}

/** `roster` is companyFor(playerId), so choosing another hero never creates their twin. */
export function createLivingStory({ roster = MERCENARY_ROSTER, seed = 1, saved = null, legacy = null } = {}) {
  let state = fresh(roster, seed), pending = [];
  const find = id => state.actors.find(a => a.id === id);
  const eligible = id => id === 'player' || !!(find(id)?.alive && !find(id).detained);
  const isWith = id => id !== 'player' && !!find(id)?.withPlayer;
  const side = id => id === 'player' ? state.player.allegiance : find(id)?.allegiance;
  const emit = (type, data = {}) => {
    const event = { id: ++state.sequence, at: state.seconds, type, ...data };
    pending.push(event); state.history.push(event); if (state.history.length > 128) state.history.shift();
    return event;
  };
  const snapshot = () => clone(state);
  function restore(value) {
    if (!validateLivingStorySnapshot(value)) return false;
    const expected = roster.map(a => a.id).sort().join('|'), supplied = value.actors.map(a => a.id).sort().join('|');
    if (expected !== supplied) return false;
    state = clone(value); pending = []; return true;
  }
  function cancelRecall(reason) {
    if (['seeking', 'offered', 'passenger'].includes(state.recall.status)) {
      state.recall.status = 'cancelled'; emit('recall-cancelled', { reason, courier: state.recall.courier });
    }
  }
  function reserveHorse(id) {
    const existing = state.horses.find(h => h.owner === id);
    if (existing) return existing.id;
    if (!eligible(id) || state.horses.length >= REMOUNT_COUNT) return null;
    const horse = { id: `army-remount-${state.horses.length + 1}`, owner: id, reservedAt: state.seconds, claimed: false };
    state.horses.push(horse); (id === 'player' ? state.player : find(id)).horse = horse.id;
    emit('horse-reserved', { owner: id, horse: horse.id, remaining: REMOUNT_COUNT - state.horses.length });
    return horse.id;
  }
  function assignSatchel(id) {
    const q = state.satchel;
    q.assignee = id; q.acceptedAt = state.seconds; q.deadlineAt = state.seconds + SATCHEL_DEADLINE; q.warned = false;
    q.handover = q.carrier && q.carrier !== 'relay-republican' && q.carrier !== id
      ? { from: q.carrier, to: id, status: 'seeking' } : null;
    q.status = q.handover ? 'handover' : 'assigned';
    emit('satchel-assigned', { assignee: id, deadlineAt: q.deadlineAt, handover: clone(q.handover) });
    return { ok: true, deadlineAt: q.deadlineAt };
  }
  function reassignSatchel(reason) {
    const q = state.satchel;
    if (q.status === 'delivered') return false;
    const previous = q.assignee;
    if (previous && !q.expired.includes(previous)) q.expired.push(previous);
    q.assignee = null; q.acceptedAt = null; q.deadlineAt = null; q.handover = null; q.status = 'available';
    emit('satchel-reassigned', { previous, reason });
    const next = state.reports.find(id => id !== 'player' && eligible(id) && !isWith(id) && side(id) === 'empire' && !q.expired.includes(id));
    if (next) assignSatchel(next);
    return true;
  }
  function acceptSatchel(id = 'player') {
    const q = state.satchel;
    if (!eligible(id) || !state.reports.includes(id)) return { ok: false, reason: 'report-first' };
    if (q.status === 'delivered') return { ok: false, reason: 'completed', completedBy: q.completedBy };
    if (q.assignee === id) return { ok: true, deadlineAt: q.deadlineAt, existing: true };
    if (q.assignee || q.expired.includes(id)) return { ok: false, reason: q.assignee ? 'assigned' : 'deadline-expired', assignee: q.assignee };
    return assignSatchel(id);
  }
  function reportNothom(id, { acceptJob = id !== 'player' } = {}) {
    if (!eligible(id)) return { ok: false, reason: 'unavailable' };
    if (!state.reports.includes(id)) {
      state.reports.push(id); (id === 'player' ? state.player : find(id)).reportedAt = state.seconds;
      if (id !== 'player') completeTask(id, 'nothom');
      emit('nothom-reported', { actor: id });
    }
    const horse = reserveHorse(id), assignment = acceptJob ? acceptSatchel(id) : null;
    return { ok: true, horse, horsesRemaining: REMOUNT_COUNT - state.horses.length, assignment, satchel: clone(state.satchel) };
  }
  function takeSatchel(id, { from = null } = {}) {
    const q = state.satchel;
    if (!eligible(id) || q.status === 'delivered') return { ok: false, reason: 'unavailable' };
    if (q.carrier === id) return { ok: true, existing: true };
    if (q.carrier && q.carrier !== 'relay-republican') return { ok: false, reason: 'held-by-another' };
    if (from !== null && from !== q.carrier && from !== q.location) return { ok: false, reason: 'wrong-source' };
    q.carrier = id; q.location = null; q.position = null;
    if (q.handover?.to === id) q.handover = null;
    emit('satchel-taken', { carrier: id }); return { ok: true };
  }
  function dropSatchel(id, { location = `remains-${id}`, position = null } = {}) {
    const q = state.satchel;
    if (q.carrier !== id || q.status === 'delivered') return false;
    q.carrier = null; q.location = location; q.position = point(position); q.handover = null;
    if (q.status === 'handover') q.status = 'assigned';
    emit('satchel-dropped', { carrier: id, location, position: q.position }); return true;
  }
  function handoverSatchel(replacement, { near = false, accept = true } = {}) {
    const q = state.satchel, h = q.handover;
    if (!near || !h || h.to !== replacement || q.assignee !== replacement || q.carrier !== h.from || !eligible(replacement)
      || q.status === 'delivered') return { ok: false, reason: !near ? 'approach-first' : 'stale-demand' };
    if (!accept) {
      if (h.status !== 'hostile') { h.status = 'hostile'; emit('satchel-handover-refused', { attacker: replacement, carrier: h.from }); }
      return { ok: true, fight: true };
    }
    const previous = q.carrier; q.carrier = replacement; q.location = null; q.position = null; q.handover = null; q.status = 'assigned';
    emit('satchel-handed-over', { from: previous, to: replacement }); return { ok: true };
  }
  function deliverSatchel(id, { side: deliverSide = side(id) ?? 'empire' } = {}) {
    const q = state.satchel;
    if (!eligible(id) || q.status === 'delivered' || q.carrier !== id) return { ok: false, reason: 'not-carrier' };
    q.status = 'delivered'; q.completedBy = id; q.rewardRecipient = id; q.completedAt = state.seconds;
    q.carrier = null; q.location = 'nothom'; q.position = null; q.deadlineAt = null; q.handover = null;
    q.deliveredSide = sideOf(deliverSide); emit('satchel-delivered', { actor: id, side: q.deliveredSide });
    if (id !== 'player') completeTask(id, 'satchel');
    return { ok: true, reward: true, completedBy: id };
  }
  function claimBridge(id) {
    const b = state.bridge;
    if (!eligible(id) || isWith(id) || b.status === 'complete' || (b.owner && b.owner !== id)) return { ok: false, reason: b.status };
    if (!b.owner) { b.owner = id; b.status = 'working'; emit('bridge-claimed', { owner: id }); }
    return { ok: true };
  }
  function abandonBridge(id) {
    const b = state.bridge;
    if (b.owner !== id || b.status === 'complete') return false;
    b.owner = null; b.status = 'available'; b.work = 0;
    emit('bridge-abandoned', { actor: id }); return true;
  }
  function addBridgeMaterials(id, count = 1) {
    const b = state.bridge;
    if (b.owner !== id || b.status !== 'working' || !Number.isSafeInteger(count) || count <= 0) return false;
    b.materials = Math.min(BRIDGE_MATERIALS, b.materials + count); return true;
  }
  function workBridge(id, seconds) {
    const b = state.bridge;
    if (b.owner !== id || b.status !== 'working' || b.materials < BRIDGE_MATERIALS || !finite(seconds) || !eligible(id) || isWith(id)) return false;
    b.work = Math.min(BRIDGE_WORK, b.work + seconds); return true;
  }
  function completeBridge(id, { playerRepair = false } = {}) {
    const b = state.bridge;
    if (b.status === 'complete') return { ok: false, reason: 'completed', completedBy: b.completedBy };
    if (!eligible(id) || (b.owner && b.owner !== id) || (!(playerRepair && id === 'player') && (b.owner !== id || b.materials < BRIDGE_MATERIALS || b.work < BRIDGE_WORK))) return { ok: false, reason: 'unfinished' };
    b.status = 'complete'; b.completedBy = id; b.completedAt = state.seconds; b.owner = null;
    b.materials = BRIDGE_MATERIALS; b.work = BRIDGE_WORK;
    if (id !== 'player') completeTask(id, 'bridge');
    emit('bridge-completed', { actor: id }); return { ok: true, reward: id === 'player' };
  }
  function completeTask(id, task) {
    const actor = find(id);
    if (!actor?.alive || !idOK(task) || Object.hasOwn(actor.tasks, task)) return false;
    actor.tasks[task] = state.seconds; emit('task-completed', { actor: id, task }); return true;
  }
  function observe(id, value = {}) {
    const a = find(id); if (!a) return false;
    if (value.health === 0 || value.alive === false) return setAlive(id, false, value);
    if (!a.alive) return false;
    if (STORY_STAGES.includes(value.stage) && value.stage !== 'dead') a.stage = value.stage;
    if (pointOK(value.position) && value.position) a.position = point(value.position);
    if (typeof value.activity === 'string') a.activity = value.activity.slice(0, 120);
    if (finite(value.health) && value.health > 0) a.health = Math.min(10000, value.health);
    if (typeof value.withPlayer === 'boolean') {
      a.withPlayer = value.withPlayer;
      if (a.withPlayer && state.bridge.owner === id) abandonBridge(id);
    }
    if (typeof value.detained === 'boolean') a.detained = value.detained;
    if (validRoute(value.route) && JSON.stringify(value.route).length <= 12000) a.route = { ...a.route, ...clone(value.route) };
    if (typeof value.equipment === 'string') a.equipment = value.equipment;
    return true;
  }
  function setAlive(id, alive, { position: at = null } = {}) {
    const a = find(id);
    if (!a || alive !== false || !a.alive) return false; // Explicit death; time can never resurrect somebody.
    a.alive = false; a.health = 0; a.stage = 'dead'; a.activity = 'dead'; a.withPlayer = false; a.deathAt = state.seconds;
    if (at) a.position = point(at);
    abandonBridge(id); dropSatchel(id, { location: `remains-${id}`, position: a.position });
    if (state.satchel.assignee === id) reassignSatchel('assignee-dead');
    if (state.recall.courier === id && ['seeking', 'offered', 'passenger'].includes(state.recall.status)) {
      state.recall.failed.push(id); state.recall.status = 'none';
      emit('courier-died', { actor: id });
    }
    emit('mercenary-died', { actor: id }); return true;
  }
  function experience(id, key, { weight = STORY_EXPERIENCES[key] ?? 0 } = {}) {
    const a = find(id);
    if (!a?.alive || !idOK(key) || !Number.isFinite(weight) || a.experiences.some(e => e.key === key)) return false;
    if (a.experiences.length >= 100) return false;
    a.experiences.push({ key, at: state.seconds, weight: Math.max(-10, Math.min(10, weight)) }); return true;
  }
  function chooseAllegiance(id, nextSide, reason = 'personal-choice') {
    const next = sideOf(nextSide);
    if (!STORY_SIDES.includes(next) || !eligible(id)) return false;
    if (id === 'player') {
      if (next === 'empire' && state.player.imperialRefused) return false;
      const changed = state.player.allegiance !== next;
      state.player.allegiance = next;
      if (next === 'coalition') cancelRecall('joined-republic');
      if (changed) emit('player-allegiance', { side: next, reason });
      return true;
    }
    const a = find(id), previous = a.allegiance;
    a.allegiance = next; a.allegianceDecided = true; a.allegianceEvent = { at: state.seconds, reason };
    if (previous !== next) {
      a.arrivedAt = null;
      a.stage = next === 'coalition' ? 'republican-muster' : 'imperial-muster';
      if (next === 'coalition' && state.satchel.assignee === id) reassignSatchel('assignee-defected');
      if (state.recall.courier === id && next === 'coalition' && ['seeking', 'offered', 'passenger'].includes(state.recall.status)) {
        cancelRecall('courier-defected'); state.recall.failed.push(id); state.recall.status = 'none';
      }
      emit('mercenary-allegiance', { actor: id, side: next, previous, reason });
    }
    return true;
  }
  function decideAllegiance(id, reason = 'nothom-decision') {
    const a = find(id);
    if (!a?.alive) return null;
    if (a.allegianceDecided) return a.allegiance;
    const score = (MERCENARY_VALUES[id] ?? 0) + stableNoise(state.seed, id) * .5 + a.experiences.reduce((n, e) => n + e.weight, 0);
    const chosen = score >= .7 ? 'coalition' : 'empire';
    chooseAllegiance(id, chosen, reason); return chosen;
  }
  function arriveMuster(id, which = side(id)) {
    const selected = sideOf(which), a = find(id), m = state.muster[selected];
    if (!a?.alive || a.detained || a.withPlayer || !m || a.allegiance !== selected) return false;
    if (!m.arrivals.includes(id)) { m.arrivals.push(id); emit('muster-arrival', { actor: id, side: selected }); }
    if (a.arrivedAt === null) a.arrivedAt = state.seconds;
    a.stage = 'mustered'; a.activity = 'waiting at muster'; completeTask(id, `${selected}-muster`); updateMuster();
    return true;
  }
  function arrivePlayerMuster(which = state.player.allegiance) {
    const selected = sideOf(which), m = state.muster[selected];
    if (!m || state.player.allegiance !== selected || (selected === 'empire' && state.player.imperialRefused)) return false;
    if (m.playerArrivedAt === null) { m.playerArrivedAt = state.seconds; emit('player-muster-arrival', { side: selected }); }
    if (selected === 'empire') {
      const carrying = state.recall.status === 'passenger';
      cancelRecall('player-arrived'); state.recall.status = carrying ? 'complete' : state.recall.status;
    }
    m.status = 'ready'; return true;
  }
  function dispatchRecall() {
    const r = state.recall, m = state.muster.empire;
    if (r.attempts >= 2) {
      if (r.status !== 'unavailable') { r.status = 'unavailable'; emit('recall-unavailable', { reason: 'no-more-couriers' }); }
      return false;
    }
    const id = m.arrivals.find(id => eligible(id) && side(id) === 'empire' && !isWith(id) && !r.failed.includes(id));
    if (!id) {
      if (r.status !== 'unavailable') { r.status = 'unavailable'; emit('recall-unavailable', { reason: 'no-loyal-courier' }); }
      return false;
    }
    r.courier = id; r.status = 'seeking'; r.dispatchedAt = state.seconds; r.attempts++;
    emit('recall-dispatched', { courier: id, horse: state.horses.find(h => h.owner === id)?.id ?? 'borrowed-camp-horse' });
    return true;
  }
  function updateMuster() {
    for (const selected of STORY_SIDES) {
      const m = state.muster[selected];
      if (m.status === 'departed') continue;
      const expected = state.actors.filter(a => a.alive && !a.detained && a.allegiance === selected && !a.withPlayer);
      const ready = expected.every(a => m.arrivals.includes(a.id));
      if (!ready) { m.graceAt = null; continue; }
      if (m.graceAt === null && (m.arrivals.length || m.playerArrivedAt !== null)) m.graceAt = state.seconds;
      if (m.playerArrivedAt !== null) m.status = 'ready';
      if (selected === 'empire' && m.graceAt !== null && state.seconds >= m.graceAt + MUSTER_GRACE
        && m.playerArrivedAt === null && state.player.allegiance === 'empire' && !state.player.imperialRefused
        && state.recall.status === 'none') dispatchRecall();
    }
  }
  function tick(seconds, { paused = false } = {}) {
    if (paused || !finite(seconds) || seconds === 0) return false;
    state.seconds += seconds;
    const q = state.satchel;
    if (q.assignee && q.status !== 'delivered' && q.deadlineAt !== null) {
      if (!q.warned && state.seconds >= q.deadlineAt - 120) { q.warned = true; emit('satchel-deadline-warning', { assignee: q.assignee, deadlineAt: q.deadlineAt }); }
      if (state.seconds >= q.deadlineAt) reassignSatchel('deadline');
    }
    updateMuster(); return true;
  }
  function refuseImperial() {
    if (state.player.imperialRefused) return false;
    state.player.imperialRefused = true; state.recall.status = 'refused';
    state.muster.empire.status = 'departed'; state.muster.empire.departedAt = state.seconds;
    emit('imperial-campaign-refused'); return true;
  }
  function recallArrived(id, { safe = true } = {}) {
    if (!safe || state.recall.status !== 'seeking' || state.recall.courier !== id || !eligible(id)
      || state.player.allegiance !== 'empire' || state.player.imperialRefused || state.muster.empire.playerArrivedAt !== null) return false;
    state.recall.status = 'offered'; emit('recall-offered', { courier: id }); return true;
  }
  function answerRecall(yes) {
    if (state.recall.status !== 'offered') return false;
    if (!yes) return refuseImperial();
    state.recall.status = 'passenger'; emit('recall-passenger', { courier: state.recall.courier }); return true;
  }
  function courierReturned(id) {
    if (state.recall.courier !== id || !['cancelled', 'refused', 'complete', 'unavailable'].includes(state.recall.status)) return false;
    state.recall.courier = null; emit('recall-returned', { courier: id }); return true;
  }
  function departMuster(which = state.player.allegiance) {
    const selected = sideOf(which), m = state.muster[selected];
    if (!m || m.status === 'departed') return false;
    m.status = 'departed'; m.departedAt = state.seconds; emit('muster-departed', { side: selected }); return true;
  }
  function migrate(value) {
    if (!value || typeof value !== 'object') return;
    if (finite(value.playSeconds)) state.seconds = value.playSeconds;
    if (finite(value.seconds)) state.seconds = value.seconds;
    if (value.playerSide) state.player.allegiance = sideOf(value.playerSide) === 'coalition' ? 'coalition' : 'empire';
    if (value.bridgeComplete) {
      Object.assign(state.bridge, { status: 'complete', completedBy: 'player', completedAt: state.seconds, materials: BRIDGE_MATERIALS, work: BRIDGE_WORK });
    }
    const dead = new Set(value.deadIds ?? value.fallen ?? []);
    for (const a of state.actors) {
      const prior = value.actors?.find?.(entry => entry.id === a.id);
      if (prior) {
        observe(a.id, prior);
        if (Array.isArray(prior.tasks) && prior.tasks.length <= 100) {
          for (const task of prior.tasks) if (idOK(task)) completeTask(a.id, task);
        }
        if (prior.reported === true) { a.reportedAt = state.seconds; state.reports.push(a.id); }
      }
      if (dead.has(a.id)) setAlive(a.id, false);
    }
    // Legacy route snapshots can already place a mercenary inside the muster.
    // Keep that arrival rather than leaving a permanently missing quorum member;
    // the grace period starts on migration, never retroactively during load.
    for (const a of state.actors) if (a.stage === 'mustered' && a.alive && !a.detained && !a.withPlayer) {
      arriveMuster(a.id, a.allegiance);
    }
    if (value.playerHorse || value.horseToken) { reserveHorse('player'); state.horses[0].claimed = !!value.playerHorse; }
    if (value.satchelComplete) {
      Object.assign(state.satchel, { status: 'delivered', completedBy: 'player', completedAt: state.seconds,
        rewardRecipient: 'player', carrier: null, location: 'nothom', deliveredSide: state.player.allegiance });
    } else if (value.satchelCarried) { state.satchel.carrier = 'player'; state.satchel.location = null; }
    if (value.playerMusterComplete) {
      // A pre-living-story campaign already beyond Moros must not summon its
      // traveler back to the chapter they completed before this feature existed.
      state.muster.empire.playerArrivedAt = state.seconds;
      state.muster.empire.status = 'departed'; state.muster.empire.departedAt = state.seconds;
    }
    pending = []; state.history = []; state.sequence = 0;
  }
  if (!saved || !restore(saved)) migrate(legacy);
  return Object.freeze({ snapshot, restore, tick, advance: seconds => tick(seconds),
    clock: () => state.seconds, calendar: () => worldCalendar(state.seconds), calendarAt: seconds => worldCalendar(seconds),
    actor: id => find(id) ? clone(find(id)) : null, actors: () => clone(state.actors),
    player: () => clone(state.player), bridge: () => clone(state.bridge), satchel: () => clone(state.satchel),
    muster: (which = 'empire') => clone(state.muster[sideOf(which)] ?? null), recall: () => clone(state.recall),
    horseFor: id => state.horses.find(h => h.owner === id)?.id ?? null,
    availableHorses: () => REMOUNT_COUNT - state.horses.length,
    claimHorse: id => { const h = state.horses.find(h => h.owner === id); if (!h || !eligible(id) || h.claimed) return false; h.claimed = true; return true; },
    drainEvents: () => { const events = pending.map(clone); pending = []; return events; },
    observe, completeTask, setAlive, experience, chooseAllegiance, decideAllegiance,
    setPlayerSide: (next, reason) => chooseAllegiance('player', next, reason),
    crossing: ids => bridgeChoice(ids.filter(id => eligible(id)), state.bridge.status === 'complete'),
    claimBridge, abandonBridge, addBridgeMaterials, workBridge, completeBridge,
    reportNothom, reportBatch: (ids, options) => [...new Set(ids)].sort().map(id => ({ id, ...reportNothom(id, options) })),
    acceptSatchel, takeSatchel, dropSatchel, handoverSatchel, deliverSatchel,
    soldierKilled: options => dropSatchel('relay-republican', { location: 'remains-relay-republican', ...options }),
    abandonSatchel: id => state.satchel.assignee === id && reassignSatchel('abandoned'),
    arriveMuster, arrivePlayerMuster, departMuster, recallArrived, answerRecall, refuseImperial, courierReturned,
    battleRoster: () => ({ empire: state.actors.filter(a => a.alive && a.allegiance === 'empire').map(a => a.id),
      coalition: state.actors.filter(a => a.alive && a.allegiance === 'coalition').map(a => a.id) }),
  });
}

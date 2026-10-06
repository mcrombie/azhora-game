/**
 * The Telemon watch: how the Telemon treat an outsider in Telemonia. Pure: no three, no DOM.
 *
 * The rule, in the user's words: "No gate at the border. Any Telemon who sees an outsider walks up, turns
 * him round and escorts him to the edge. Resist or come back, and it is a fight with everyone in earshot.
 * Reaching the city unseen is possible and hard." There are no designated guards: every Telemon, man or
 * woman, is a watcher. Field people (the unarmed farm workers) are not, and never notice.
 *
 *  - `unseen`    inside, and no watcher has noticed him. Noticing is the game's own awareness model
 *                (src/gameplay/law/stealth.js: range, cone, sneaking, lineOfSight), one meter per watcher.
 *  - `noticed`   the nearest watcher who has noticed him comes to him and calls out. Going further in
 *                now is already resisting. If every watcher loses him first, he is unseen again.
 *  - `escorting` the escort has reached him and turned him round: he walks to the nearest pass mouth with
 *                the escort behind him. At the mouth (`released`) the escort stops and he walks out alone.
 *                Standing still too long, going further in or a weapon in hand is resisting.
 *  - `hostile`   he resisted or struck a Telemon, or was seen inside again after being walked out or after
 *                a fight. Everyone in earshot joins, and anyone who comes within earshot while it lasts.
 *                It ends when he leaves the country, or when nobody is in earshot for WATCH.calmSeconds.
 *  - `outside`   not in Telemonia. The Telemon never pursue past their own border; his standing (walked
 *                out, fought) is remembered and saved, and makes the next sighting inside hostile at once.
 *
 * API (the host imports telemonia-world.js; this file does not, because loading it takes seconds):
 *   import { PASSES, borderDepth, inTelemoniaBox } from './telemonia-world.js';
 *   const watch = createTelemonWatch({ mouths: passMouths(PASSES, borderDepth),
 *     insideTelemonia: (x, z) => inTelemoniaBox(x, z) && borderDepth(x, z) > 0, lineOfSight });
 *   const r = watch.update(dt, { traveler, watchers, insideTelemonia?, lineOfSight?, paused? });  // every frame
 *     traveler  { x, z, sneaking, armed, attacking }: `sneaking` is stealth.view().sneaking (key held and the
 *               skill taught); `armed` a weapon in hand (body.armed); `attacking` he struck a Telemon this
 *               frame (an edge: hostile at once, in any phase, inside).
 *     watchers  [{ id, x, z, yaw, kind: 'man' | 'woman', range?, alive?, active? }]: every Telemon within
 *               WATCH.earshot at least; yaw as stealth.js. Any other kind (field people) is ignored. Keep
 *               fighters in the list during a fight, at their fighting positions.
 *     lineOfSight(watcher, traveler) -> boolean, as stealth.js. insideTelemonia: boolean or (x, z) -> boolean;
 *               absent means outside. Both default to the constructor's. paused: nothing advances.
 *   r = { phase, escortId, escortTo, mouth, released, line, fighters, joined, cause, suspicion, walkedOut, fights }
 *     escortId, escortTo  the watcher to walk (at WATCH.pace) and where, never outside; when the id changes or
 *               goes null, give that watcher back to his ordinary life. mouth { id, name, x, z, stand }: where
 *               the traveler is being taken; released: he is there and the escort holds at mouth.stand.
 *     line      { speaker, event, text } to say now (an edge, at most one a frame), or null.
 *     fighters  every id in the fight now; joined: the ids that joined this frame (start them fighting).
 *     cause     why it is hostile: 'stray' | 'dawdle' | 'armed' | 'attack' | 'returned'; suspicion 0..1.
 *   watch.ask(id) -> { speaker, event: 'answer', text } or null: the traveler speaks to watcher `id`. Only the escort
 *               answers, only while he is walking the traveler out, and only TELEMON_LINES.answer's few times a walk
 *               (who they are, then why he must go); anyone else, or the escort a third time, says nothing (null).
 *               Asking changes nothing else: it is not resisting, and the walk-out's clocks neither stop nor restart.
 *   watch.snapshot() -> { version: 1, walkedOut, fights }: save it. watch.restore(saved): a missing state is
 *   clean (true), a bad one is clean too (false); live phases are never saved. watch.reset(); watch.view().
 *   validTelemonWatchState(saved) checks a saved state.
 */
import { createStealth, STEALTH } from '../../../gameplay/law/stealth.js';
import { LAW } from '../../../gameplay/law/crime.js';

const freeze = Object.freeze;

/** Every number in the rule, each from its precedent where one exists. */
export const WATCH = freeze({
  earshot: LAW.noticeRadius, // 65 m: how far the Imperial watch answers trouble (crime-host's availableGuards)
  talkRange: LAW.talkRange, // 3.2 m: close enough to speak; the escort turns him round from here
  escortGap: 2.2, // crime-host: an arresting guard closes to 2.2 m of the traveler and stands
  pace: 3.2, // crime-host: a guard under the law's control walks at 3.2 m/s
  releaseRadius: LAW.talkRange, // he is at the mouth when he is within speaking distance of it
  dawdleSeconds: 8, // crime-host: a guard waits 8 s before asking a wanted traveler again
  strayMetres: STEALTH.visionRange, // 12 m further from the mouth than his best: out of a watcher's sight range
  progressMetres: 1, // no precedent: a stride nearer the mouth is progress, and resets the dawdle clock
  warnAt: .5, // no precedent: halfway to resisting, the escort warns him once
  calmSeconds: 10, // crime-host: after a fight the watch waits 10 s before it tries again
  maxStep: STEALTH.maxStep, // .25 s: a longer frame counts as this long, as in stealth.js
  mouthStep: .5, // metres: how finely passMouths walks a pass line to find the border
});

/** What the Telemon say. Very few words; no names. */
export const TELEMON_LINES = freeze({
  notice: freeze(['You. Stop.', 'Stand there.', 'Stop.']),
  turn: freeze(['Turn round. Walk.', 'Not here. Out.', 'This way. Walk.']),
  dawdle: freeze(['Walk.', 'Keep walking.']),
  stray: freeze(['Not that way.', 'Wrong way.']),
  release: freeze(['Go. Do not come back.', 'Go.', 'Out. Stay out.']),
  fight: freeze(['So be it.', 'Then fight.', 'To me!']),
  returned: freeze(['You were told.', 'Told once.']),
  // Spoken to on the walk out, the escort answers twice, in order - who they are, then why he must go - and no more.
  answer: freeze(['Telemon. Walk.', 'This is ours. Nobody comes in. Walk.']),
});

const KINDS = new Set(['man', 'woman']);
const validPoint = point => Number.isFinite(point?.x) && Number.isFinite(point?.z);
const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const nearest = (list, to) => list.reduce((best, item) => (!best || gap(item, to) < gap(best, to) ? item : best), null);
/** `metres` from `from` toward `to` (away from it when negative); `from` itself when they meet. */
const toward = (from, to, metres) => {
  const d = gap(from, to);
  return d > 1e-6 ? { x: from.x + (to.x - from.x) / d * metres, z: from.z + (to.z - from.z) / d * metres } : { x: from.x, z: from.z };
};
const count = value => Number.isSafeInteger(value) && value >= 0;
const fresh = () => ({ version: 1, walkedOut: 0, fights: 0 });

export function validTelemonWatchState(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value) && value.version === 1
    && count(value.walkedOut) && count(value.fights);
}

/**
 * The pass mouths, from telemonia-world's PASSES (each a line from outside the border in to the Galmeth):
 * the first point on the line inside the border, and `stand`, WATCH.escortGap further in, where the escort
 * stops. `depthAt(x, z)` is metres inside the border (telemonia-world's borderDepth).
 */
export function passMouths(passes, depthAt) {
  const mouths = [];
  for (const pass of Array.isArray(passes) ? passes : []) {
    const points = pass?.points;
    if (typeof depthAt !== 'function' || !Array.isArray(points) || points.length < 2 || !points.every(validPoint)) continue;
    const run = [0];
    for (let i = 1; i < points.length; i++) run.push(run[i - 1] + gap(points[i - 1], points[i]));
    const at = s => {
      let i = 1; while (i < points.length - 1 && run[i] < s) i++;
      const a = points[i - 1], b = points[i], t = Math.min(1, Math.max(0, (s - run[i - 1]) / ((run[i] - run[i - 1]) || 1)));
      return freeze({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
    };
    for (let s = 0; s <= run.at(-1); s += WATCH.mouthStep) {
      const p = at(s);
      if (!(depthAt(p.x, p.z) > 0)) continue;
      mouths.push(freeze({ id: String(pass.id ?? `pass-${mouths.length}`), name: String(pass.name ?? ''),
        x: p.x, z: p.z, stand: at(Math.min(run.at(-1), s + WATCH.escortGap)) }));
      break;
    }
  }
  return freeze(mouths);
}

/**
 * `mouthFor(traveler, mouths)`, if given, picks the mouth he is walked to - the host's is the nearest by the way a
 * body walks, which from the head of a pass is that pass and not one nearer as the crow flies over the rim. Without
 * it, or when it answers nothing, the nearest by straight line.
 */
export function createTelemonWatch({ mouths, insideTelemonia, lineOfSight = () => true, mouthFor = null } = {}) {
  const exits = (Array.isArray(mouths) ? mouths : []).filter(validPoint).map((m, i) => freeze({
    id: typeof m.id === 'string' ? m.id : `mouth-${i}`, name: typeof m.name === 'string' ? m.name : '', x: m.x, z: m.z,
    stand: freeze(validPoint(m.stand) ? { x: m.stand.x, z: m.stand.z } : { x: m.x, z: m.z }) }));
  if (!exits.length) throw new TypeError('createTelemonWatch needs the pass mouths: passMouths(PASSES, borderDepth)');
  const meters = new Map(), said = new Map();
  let standing = fresh(), live = null, last = null;

  function clear(phase) {
    live = { phase, escortId: null, mouth: null, best: 0, stall: 0, warned: false, released: false,
      fighters: new Set(), quiet: 0, cause: null, answered: 0 };
  }
  const result = ({ line = null, joined = [], escortTo = null, suspicion = 0 } = {}) => ({
    phase: live.phase, escortId: live.escortId, escortTo, mouth: live.mouth, released: live.released, line,
    fighters: [...live.fighters], joined, cause: live.cause, suspicion, walkedOut: standing.walkedOut, fights: standing.fights });
  const copy = r => ({ ...r, escortTo: r.escortTo && { ...r.escortTo }, line: r.line && { ...r.line },
    fighters: [...r.fighters], joined: [...r.joined] });

  function update(dt, { traveler, watchers = [], insideTelemonia: inside = insideTelemonia,
    lineOfSight: canSee = lineOfSight, paused = false } = {}) {
    if (paused || !validPoint(traveler)) return copy({ ...last, line: null, joined: [] });
    const elapsed = Number.isFinite(dt) ? Math.max(0, Math.min(WATCH.maxStep, dt)) : 0;
    const people = (Array.isArray(watchers) ? watchers : []).filter(w => w && typeof w.id === 'string'
      && KINDS.has(w.kind) && validPoint(w) && w.alive !== false && w.active !== false);
    const present = new Map(people.map(w => [w.id, w]));
    // Noticing is stealth.js's awareness, one meter per watcher, so that it is known who has noticed.
    for (const id of [...meters.keys()]) if (!present.has(id)) meters.delete(id);
    let suspicion = 0;
    const noticers = [];
    for (const w of people) {
      if (!meters.has(w.id)) meters.set(w.id, createStealth());
      const seen = meters.get(w.id).update({ dt, position: traveler, sneaking: !!traveler.sneaking, taught: true,
        guards: [w], lineOfSight: canSee });
      suspicion = Math.max(suspicion, seen.suspicion);
      if (seen.detected) noticers.push(w);
    }
    let line = null, escort = null;
    const joined = [];
    const say = (event, speaker, force = false) => {
      if (!speaker || (line && !force)) return;
      const lines = TELEMON_LINES[event], n = said.get(event) ?? 0;
      said.set(event, n + 1);
      line = { speaker: speaker.id, event, text: lines[n % lines.length] };
    };
    const join = () => {
      for (const w of people) if (!live.fighters.has(w.id) && gap(w, traveler) <= WATCH.earshot) { live.fighters.add(w.id); joined.push(w.id); }
    };
    const fight = (cause, speaker) => {
      clear('hostile'); live.cause = cause; standing.fights++;
      if (speaker) { live.fighters.add(speaker.id); joined.push(speaker.id); }
      join(); say(cause === 'returned' ? 'returned' : 'fight', speaker, true);
    };

    if (!(typeof inside === 'function' ? inside(traveler.x, traveler.z) : inside === true)) {
      // Nobody follows him out. Turned round and gone is remembered: the next sighting inside is a fight.
      if (live.phase === 'escorting') standing.walkedOut++;
      if (live.phase !== 'outside') clear('outside');
    } else {
      if (live.phase === 'outside') clear('unseen');
      if (traveler.attacking && live.phase !== 'hostile') fight('attack', nearest(people, traveler));
      if (live.phase === 'unseen' && noticers.length) {
        const first = nearest(noticers, traveler);
        if (standing.walkedOut || standing.fights) fight('returned', first);
        else {
          live.phase = 'noticed'; live.escortId = first.id;
          live.mouth = (typeof mouthFor === 'function' ? exits.find(m => m.id === mouthFor(traveler, exits)?.id) : null) ?? nearest(exits, traveler);
          live.best = gap(traveler, live.mouth); say('notice', first);
        }
      }
      if (live.phase === 'noticed' || live.phase === 'escorting') {
        // Before the escort has spoken, being lost by every watcher is getting away; after, only his going is.
        if (live.phase === 'noticed' && !noticers.length) escort = null;
        else escort = present.get(live.escortId) ?? nearest(noticers, traveler);
        if (!escort) clear('unseen');
        else {
          live.escortId = escort.id;
          const d = gap(traveler, live.mouth);
          if (live.phase === 'noticed' && gap(escort, traveler) <= WATCH.talkRange) {
            live.phase = 'escorting'; live.stall = 0; live.warned = false; say('turn', escort);
          }
          if (d < live.best - WATCH.progressMetres) { live.best = d; live.stall = 0; live.warned = false; }
          if (live.phase === 'escorting') live.stall += elapsed;
          if (d > live.best + WATCH.strayMetres) fight('stray', escort);
          else if (live.phase === 'escorting' && traveler.armed) fight('armed', escort);
          else if (live.stall >= WATCH.dawdleSeconds) fight('dawdle', escort);
          else if (live.phase === 'escorting' && !live.released && d <= WATCH.releaseRadius) { live.released = true; say('release', escort, true); }
          else if (!live.warned && d > live.best + WATCH.strayMetres * WATCH.warnAt) { live.warned = true; say('stray', escort); }
          else if (!live.warned && live.stall >= WATCH.dawdleSeconds * WATCH.warnAt) { live.warned = true; say('dawdle', escort); }
        }
      }
      if (live.phase === 'hostile') {
        for (const id of [...live.fighters]) if (!present.has(id)) live.fighters.delete(id);
        join();
        live.quiet = people.some(w => gap(w, traveler) <= WATCH.earshot) ? 0 : live.quiet + elapsed;
        if (live.quiet >= WATCH.calmSeconds) clear('unseen');
      }
    }

    let escortTo = null;
    if (escort && live.phase === 'noticed') {
      escortTo = gap(escort, traveler) > WATCH.escortGap ? toward(traveler, escort, WATCH.escortGap) : { x: escort.x, z: escort.z };
    } else if (escort && live.phase === 'escorting') {
      escortTo = live.released ? { ...live.mouth.stand } : toward(traveler, live.mouth, -WATCH.escortGap);
    }
    // Never past their own border: anywhere outside, the escort holds at the mouth instead.
    if (escortTo && typeof inside === 'function' && !inside(escortTo.x, escortTo.z)) escortTo = { ...live.mouth.stand };
    last = result({ line, joined, escortTo, suspicion });
    return copy(last);
  }

  /** Spoken to: the escort, on the walk out, answers in order while he has words; nobody else does. Touches no clock. */
  function ask(id) {
    if (live.phase !== 'escorting' || typeof id !== 'string' || id !== live.escortId || live.answered >= TELEMON_LINES.answer.length) return null;
    return { speaker: id, event: 'answer', text: TELEMON_LINES.answer[live.answered++] };
  }
  function wipe() { meters.clear(); said.clear(); clear('unseen'); last = result(); }
  function restore(value) {
    const ok = value === undefined || value === null || validTelemonWatchState(value);
    standing = ok && value ? { version: 1, walkedOut: value.walkedOut, fights: value.fights } : fresh();
    wipe();
    return ok;
  }
  wipe();
  return {
    update, restore, ask,
    reset() { standing = fresh(); wipe(); return copy(last); },
    snapshot: () => ({ ...standing }),
    view: () => copy(last),
  };
}

/**
 * The Telemon and an outsider, in the world. The rule is src/content/regions/telemonia/telemon-watch.js (seen, walked out, resisted,
 * seen again, earshot, never past the border, the saved standing); the people src/content/regions/telemonia/telemonia-people.js; the
 * ground src/content/regions/telemonia/telemonia-world.js and src/telemonia-ways.js. Wired into src/main.js as the crime host and the
 * Elod Light's watch are: a `frame` each frame, `converse` from the talk dispatch, `combatEvent` from the
 * combat dispatch, `struck` from the crime host's assaults, `snapshot`/`restore` with the save.
 *
 * What it does with what the rule says:
 *  - **noticed / escorting**: the one the rule names (`escortId`) walks where it says (`escortTo`), at its
 *    pace, by the ordinary collision-aware mover in main.js (`world.npcPositions` is where an NPC walks to);
 *    from one kind of ground to another - off the rock by the gate, off a terrace by a stair - he goes by the
 *    walked ways (src/content/regions/telemonia/telemonia-ways.js) rather than straight over a cliff;
 *  - **a line**: the Telemon's few words, and once, what they mean for the traveler;
 *  - **hostile**: every Telemon in earshot comes. Those already near enough start the fight, as the combat's
 *    own arena allows (`arenaAround`, src/content/quests/rival-light/rival-light.js); the rest run to it and join it as they arrive
 *    (`combat.joinEnemy`), up to the combat's cap. Each fights as himself (`npcId`) - a man with his spear
 *    and shield, a woman with her knife - and one who dies is a body that stays (src/gameplay/combat/corpse-host.js);
 *  - **outside**: the traveler is out of the country. A fight is broken off (`combat.disengage`) and
 *    everybody goes home: the Telemon never pursue past their own border.
 *
 * Losing the fight is the game's own defeat; nothing here changes it.
 */
import { createTelemonWatch, passMouths, WATCH } from './telemon-watch.js';
import { TELEMONIA_BOX, PASSES, borderDepth, inTelemoniaBox } from './telemonia-world.js';
import { walkedRoute, walkOutRoute, groundKind } from './telemonia-ways.js';
import { TELEMON_WORDS, TORETH_WORDS, TELEMONIA_PEOPLE_IDS, isTelemon } from './telemonia-people.js';
import { forestLineClear } from '../../../gameplay/combat/forest-sightline.js';
import { arenaAround } from '../../quests/rival-light/rival-light.js';
import { STEALTH } from '../../../gameplay/law/stealth.js';

export const TELEMON_FIGHT_ID = 'telemon-challenge';
const freeze = Object.freeze;
const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const TITLE = 'TELEMONIA';
/**
 * The numbers the wiring chooses, the rule's own being in `WATCH` (src/content/regions/telemonia/telemon-watch.js). Builder's choices:
 *  - `vision`: how far a Telemon sees. The stealth module's 12 m is a guard in a barracks yard; this is open
 *    highland, watched by people who know every fold of it.
 *  - `eye`, `standing`, `crouched`: the sightline's ends, his eye and the traveler's chest, lower to sneak.
 *  - `man`, `woman`: who they are in a fight at the country's level (3). A man with spear and shield is the
 *    game's trained soldier (a guard that turns blows, pressing in pairs); a woman with a knife the game's
 *    rebel (no shield, no armour), with less in her: "Men are hard opponents ... women are easier."
 *  - `start`: within this of the traveler a Telemon starts the fight or joins it; the rest run to it.
 *  - `run`: how fast they come to a fight (the harbour watch's alarm pace is 3.4).
 */
export const TELEMON_FIGHT = freeze({ vision: 40, eye: 1.6, standing: 1.3, crouched: .7, start: 14, run: 3.6,
  man: freeze({ kind: 'soldier', hp: 110 }), woman: freeze({ kind: 'rebel', hp: 70 }) });

/** In the Telemon's own country, as the rule's mouths are found (src/content/regions/telemonia/telemon-watch.js `passMouths`). */
export const inTelemonia = (x, z) => inTelemoniaBox(x, z) && borderDepth(x, z) > 0;
export const TELEMON_MOUTHS = passMouths(PASSES, borderDepth);

/**
 * **The sightline**: from a Telemon's eye to the traveler's chest (lower when he is crouched to sneak),
 * through the game's own swept cover query (src/gameplay/combat/forest-sightline.js) - the ground between them, every solid
 * thing with its height, the trees with theirs. The ground it asks is the world's, sampled once a metre
 * over the country and kept, because the cover query looks every twenty centimetres along a line and the
 * country's ground is not cheap to ask. Only a Telemon facing the traveler is asked at all: one looking the
 * other way cannot see him, and the stealth module's cone says so whatever this answers.
 */
export function telemonSightline(world, table = TELEMON_FIGHT) {
  const B = TELEMONIA_BOX, STEP = 1, cols = Math.floor((B.maxX - B.minX) / STEP) + 2, rows = Math.floor((B.maxZ - B.minZ) / STEP) + 2;
  const cache = new Float32Array(cols * rows).fill(NaN);
  const at = (i, j) => { const k = j * cols + i; if (Number.isNaN(cache[k])) cache[k] = world.heightAt(B.minX + i * STEP, B.minZ + j * STEP); return cache[k]; };
  const heightAt = (x, z) => {
    if (x <= B.minX || x >= B.maxX - STEP || z <= B.minZ || z >= B.maxZ - STEP) return world.heightAt(x, z);
    const fx = (x - B.minX) / STEP, fz = (z - B.minZ) / STEP, i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j;
    return (at(i, j) * (1 - u) + at(i + 1, j) * u) * (1 - v) + (at(i, j + 1) * (1 - u) + at(i + 1, j + 1) * u) * v;
  };
  const view = { heightAt, nearColliders: world.nearColliders ? (x, z, r, out) => world.nearColliders(x, z, r, out) : undefined, colliders: world.colliders,
    treeRegistry: world.treeRegistry, walkSurfaces: [] };
  const cone = Math.cos(STEALTH.coneDegrees * Math.PI / 360), memo = new Map();
  return function lineOfSight(guard, traveler, crouched = traveler?.sneaking) {
    const dx = traveler.x - guard.x, dz = traveler.z - guard.z, range = Math.hypot(dx, dz), sneaking = !!crouched;
    if (range > STEALTH.proximity && Number.isFinite(guard.yaw) && (dx * Math.sin(guard.yaw) + dz * Math.cos(guard.yaw)) / range < cone) return true;
    const key = guard.id ?? `${guard.x},${guard.z}`, now = memo.get(key);
    if (now && gap(now.from, guard) < .5 && gap(now.to, traveler) < .5 && now.sneaking === sneaking) return now.clear;
    const from = { x: guard.x, y: heightAt(guard.x, guard.z) + table.eye, z: guard.z };
    const to = { x: traveler.x, y: heightAt(traveler.x, traveler.z) + (sneaking ? table.crouched : table.standing), z: traveler.z };
    // Start a body's width out from his own eye, so his own door or hut is not in his way.
    const s = Math.min(.6, range / 2);
    const clear = range < .05 || forestLineClear(view, { x: from.x + dx / range * s, y: from.y + (to.y - from.y) * s / range, z: from.z + dz / range * s }, to, { radius: 0 });
    memo.set(key, { from: { x: guard.x, z: guard.z }, to: { x: traveler.x, z: traveler.z }, sneaking, clear });
    return clear;
  };
}

/** The rule bound to the Telemon's own ground and the world's sightlines. */
export const telemonWatchFor = world => createTelemonWatch({ mouths: TELEMON_MOUTHS, insideTelemonia: inTelemonia, lineOfSight: telemonSightline(world),
  // Walked out to the nearest mouth by the way a body walks (src/content/regions/telemonia/telemonia-ways.js), not as the crow flies over the rim: the
  // play-through found a traveler noticed at the head of the east pass being sent to the Tarnel, eighty metres of cliff away.
  mouthFor: traveler => { const route = walkOutRoute(traveler.x, traveler.z); return route ? { id: route.mouth.id } : null; } });
/** A Telemon as the combat's enemy: fighting as himself (`npcId`), at his own kind's numbers. */
export function fighterSpec(npc, at, model) {
  const side = npc.telemon === 'woman' ? TELEMON_FIGHT.woman : TELEMON_FIGHT.man;
  return { id: `${npc.id}-fight`, npcId: npc.id, name: npc.name, kind: side.kind, hp: side.hp, x: at.x, z: at.z, ...(model ? { model } : {}) };
}

/** At his station when within this of it (metres); turning back to his station's heading at this (radians a second). */
const STATION_REACH = .5, STATION_TURN = 2.5;
export function createTelemoniaHost({ world, npcData, combat, position, level = 3, sneaking = () => false, armed = () => false,
  isDown = () => false, openDialogue = () => {}, toast = () => {}, save = () => {},
  stopAutoplay = () => {}, modelOf = npc => ({ role: npc.modelRole, tunic: npc.color, skin: npc.skin, look: npc.look }) } = {}) {
  const watch = telemonWatchFor(world);
  const people = () => npcData.filter(npc => TELEMONIA_PEOPLE_IDS.has(npc.id));
  // Each one's station: where he stands and which way he faces there (his place in src/content/regions/telemonia/telemonia-people.js).
  const homes = new Map(people().map(npc => [npc.id, { x: world.npcPositions[npc.id]?.x ?? npc.x, z: world.npcPositions[npc.id]?.z ?? npc.z, pace: npc.pace, face: npc.face,
    yaw: Number.isFinite(npc.yaw) ? npc.yaw : npc.actor?.group?.rotation?.y }]));
  const controlled = new Set();
  let last = null, inside = false, view = watch.view(), struck = false;
  const byId = id => npcData.find(npc => npc.id === id) ?? null;
  const up = npc => !!npc && !npc.hidden && !npc.fallen && !isDown(npc.id) && !!npc.actor?.group;
  const at = npc => npc.combatPosition ?? npc.actor.group.position;
  /** Every Telemon on his feet: the watchers, at their fighting positions during a fight. */
  const watchers = () => people().filter(npc => isTelemon(npc) && up(npc)).map(npc => ({ id: npc.id, kind: npc.telemon,
    x: at(npc).x, z: at(npc).z, yaw: npc.combatPosition?.yaw ?? npc.actor.group.rotation.y, range: TELEMON_FIGHT.vision }));
  function control(npc, target, pace, face = null) {
    controlled.add(npc.id);
    world.npcPositions[npc.id] = { x: target.x, z: target.z };
    npc.pace = pace; npc.face = face ?? undefined; npc.telemonControlled = true;
  }
  function home(id) {
    const npc = byId(id), h = homes.get(id); controlled.delete(id);
    if (npc && h) { world.npcPositions[id] = { x: h.x, z: h.z }; npc.pace = h.pace; npc.face = h.face; npc.telemonControlled = false; }
  }
  const releaseAll = () => { for (const id of [...controlled]) home(id); };
  /**
   * **Back at his station, a Telemon faces the way he faced there.** Sent home after a walk out or a fight, he walks
   * back on main.js's mover (`home` gives him his station's place), which leaves him facing the way he walked; once he
   * is there this turns him back, at `STATION_TURN`, or at once while he is not drawn. Not one being walked by the rule,
   * in a fight, or turned to somebody talking to him (`lent`, src/gameplay/combat/bodies.js).
   */
  function keepStations(dt) {
    for (const npc of people()) {
      const h = homes.get(npc.id), g = npc.actor?.group;
      if (!isTelemon(npc) || !g || !h || !Number.isFinite(h.yaw) || controlled.has(npc.id) || npc.combatPosition || npc.lent !== undefined) continue;
      if (gap(g.position, h) > STATION_REACH) continue;
      const d = Math.atan2(Math.sin(h.yaw - g.rotation.y), Math.cos(h.yaw - g.rotation.y));
      if (d) g.rotation.y += g.visible === false ? d : Math.sign(d) * Math.min(Math.abs(d), STATION_TURN * dt);
    }
  }
  const ours = () => combat.state.encounterId === TELEMON_FIGHT_ID && combat.state.phase === 'active';
  /** Toward a target by the ways a body walks, when it is on other ground than he is. */
  function stepTarget(npc, target) {
    const from = at(npc);
    if (groundKind(from.x, from.z) === groundKind(target.x, target.z)) return target;
    const route = walkedRoute(from, target);
    return route?.find(p => gap(p, from) > 1.2) ?? target;
  }
  function fight(r) {
    const p = position(), list = r.fighters.map(byId).filter(up);
    if (ours()) {
      const inFight = new Set((combat.state.enemies ?? []).map(e => e.npcId));
      for (const npc of list) if (!inFight.has(npc.id)) {
        control(npc, stepTarget(npc, p), TELEMON_FIGHT.run);
        if (gap(at(npc), p) < TELEMON_FIGHT.start) combat.joinEnemy(fighterSpec(npc, at(npc), modelOf(npc)));
      }
      return;
    }
    if (combat.state.phase === 'active') return;
    for (const npc of list) control(npc, stepTarget(npc, p), TELEMON_FIGHT.run);
    // As many of the nearest as the combat's arena holds; the rest come in as they arrive.
    const near = list.filter(npc => gap(at(npc), p) < TELEMON_FIGHT.start).sort((a, b) => gap(at(a), p) - gap(at(b), p));
    for (let n = Math.min(near.length, 12); n >= 1; n--) {
      const enemies = near.slice(0, n).map(npc => fighterSpec(npc, at(npc), modelOf(npc))), arena = arenaAround(p, enemies);
      if (arena && combat.startEncounter({ id: TELEMON_FIGHT_ID, level, ...arena, enemies, allies: [] })) return;
    }
  }
  function say(r) {
    const line = r.line, npc = line ? byId(line.speaker) : null;
    if (!line) return;
    const who = npc?.telemon === 'woman' ? 'A Telemon woman' : 'A Telemon man', her = npc?.telemon === 'woman' ? 'her' : 'him';
    const mouth = r.mouth?.name ? r.mouth.name.replace(/^The /, 'the ') : 'the edge';
    const what = {
      notice: 'Seen. Whoever saw you is coming over.',
      turn: `You are being walked out, to ${mouth}, with ${her} behind you. Keep walking: stray, stand about, or raise a weapon, and it is a fight.`,
      release: 'This is the edge of their country. Walk on out of it.',
      fight: 'Every Telemon within call is coming.',
      returned: 'You were turned round once. Every Telemon within call is coming.',
    }[line.event];
    toast(`${who}: “${line.text}”${what ? ` ${what}` : ''}`, TITLE);
  }

  function frame(dt, { playing = true } = {}) {
    const p = position();
    inside = inTelemonia(p.x, p.z);
    const near = p.x > TELEMONIA_BOX.minX - 80 && p.x < TELEMONIA_BOX.maxX + 80 && p.z > TELEMONIA_BOX.minZ - 80 && p.z < TELEMONIA_BOX.maxZ + 80;
    if (!near && view.phase === 'outside' && !controlled.size) { last = { x: p.x, z: p.z }; return; }
    // Put somewhere without walking there (a load, the travel button): he is simply where he is, and
    // whoever was coming for him goes back to what he was doing. The standing is kept.
    if (last && gap(last, p) > 15 && !ours()) { watch.restore(watch.snapshot()); view = watch.view(); releaseAll(); }
    last = { x: p.x, z: p.z };
    const busy = combat.state.phase === 'active' && !ours();
    if (playing) keepStations(dt);
    const before = view;
    const r = watch.update(dt, { traveler: { x: p.x, z: p.z, sneaking: !!sneaking(), armed: !!armed(), attacking: struck }, watchers: watchers(), paused: !playing || busy });
    struck = false; view = r;
    if (!playing || busy) return;
    say(r);
    if (r.phase !== before.phase) {
      if (['noticed', 'hostile'].includes(r.phase)) stopAutoplay();
      if (r.phase === 'outside' && before.phase === 'hostile') {
        if (ours()) combat.disengage('not-pursued');
        toast('They stop at their border. Nobody follows you out.', TITLE);
      }
      if (r.phase === 'outside' && r.walkedOut > before.walkedOut) toast('You are out of their country. Whoever walked you here watches you go, and turns back.', TITLE);
      if (r.phase !== 'hostile' && before.phase === 'hostile' && ours()) combat.disengage('calm');
      if (['outside', 'unseen'].includes(r.phase)) releaseAll();
      if (r.walkedOut !== before.walkedOut || r.fights !== before.fights || r.phase === 'outside') save();
    }
    if (r.phase === 'hostile') { fight(r); return; }
    // The one the rule has sent: where it says, by the ways a body walks; everybody else goes home.
    const escort = r.escortId ? byId(r.escortId) : null;
    if (escort && r.escortTo) control(escort, stepTarget(escort, r.escortTo), WATCH.pace, r.released ? { x: p.x, z: p.z } : null);
    for (const id of [...controlled]) if (id !== r.escortId) home(id);
  }
  function combatEvent(event) {
    if (combat.state.encounterId !== TELEMON_FIGHT_ID && event.encounterId !== TELEMON_FIGHT_ID) return false;
    if (!['victory', 'retreat', 'defeat'].includes(event.type)) return true;
    if (event.type === 'victory' && inside) toast('Nobody near is standing. Others will have heard.', TITLE);
    save();
    return true;
  }
  function converse(npc) {
    if (!npc || !TELEMONIA_PEOPLE_IDS.has(npc.id)) return false;
    const p = position();
    if (isTelemon(npc)) {
      // Outside his country he has two words for the traveler; inside it, walking up to one is being seen by him.
      if (!inTelemonia(p.x, p.z)) { openDialogue(npc, [TELEMON_WORDS[npc.telemon].outside[0]], null, 'Go'); return true; }
      // The one walking him out answers, curtly and twice at most (the rule's `ask`): said as his other words on the
      // walk are, so nothing stops - the walk and its clocks go on, and speaking is not resisting.
      const answer = watch.ask(npc.id);
      if (answer) { toast(`${npc.telemon === 'woman' ? 'A Telemon woman' : 'A Telemon man'}: “${answer.text}”`, TITLE); return true; }
      toast(`${npc.telemon === 'woman' ? 'She' : 'He'} looks at you and does not answer.`, TITLE);
      return true;
    }
    // A field hand: in the old tongue, low, if nobody has the traveler in sight; otherwise eyes on the row.
    if (view.phase === 'unseen' && (view.suspicion ?? 0) <= STEALTH.clearAt) openDialogue(npc, [...npc.lines], null, 'Leave him to his work');
    else toast(TORETH_WORDS.watched, TITLE);
    return true;
  }
  return {
    frame, combatEvent, converse, watch,
    /** The traveler has struck a Telemon (the crime host reports every blow on anybody): resisting, in any phase. */
    struck() { struck = true; return true; },
    snapshot: () => watch.snapshot(),
    restore(value) { const ok = watch.restore(value); releaseAll(); view = watch.view(); last = null; return ok; },
    controlsNpc: id => controlled.has(id),
    get watching() { return inside; }, get inside() { return inside; },
    get awareness() {
      const s = view.suspicion ?? 0, seen = ['noticed', 'escorting', 'hostile'].includes(view.phase);
      return { suspicion: seen ? 1 : s, detected: seen, visible: seen || s > STEALTH.clearAt, danger: s > 0 || seen, sneaking: !!sneaking() };
    },
    view: () => view,
  };
}

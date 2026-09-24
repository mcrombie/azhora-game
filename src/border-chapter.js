/**
 * The envoy and the border battle: the fork of the main quest. The Marshal sends
 * the traveler with his terms south-east from the border stockade into West
 * Suval, to Solis: past the Coalition's watch at the Gate of Sun Horses, to the
 * envoy in the Court of Oaths. There the traveler chooses whose sellsword to be.
 * The Coalition's offer is the better one: coin on the table the moment you
 * sign. Then the battle begins with a report and a march. The Empire's
 * sellsword rides back to the Marshal at the army's outpost on the Moros; the
 * Republic's finds Captain Voss at the Gate of Sun Horses. Each is asked whether
 * they are ready, and on yes a column marches with them to the border, where
 * the fight begins when it comes up. The day goes to whoever holds that corner
 * of the field: win the fight and your side has won the battle; fall or fall
 * back, and the line waits until you sound the advance again. Pure: no DOM, no
 * three.
 */
import { toWorld, toWorldZIn } from './world-scale.js';
import { SOLIS_STANDS } from './west-suval.js';
import { MERCENARY_COMPANY_SIZE } from './mercenaries.js';

export const BORDER_VERSION = 1;
export const BORDER_ENVOY_CHAPTER = 'suval-envoy';
export const BORDER_BATTLE_CHAPTER = 'border-battle';
export const BORDER_ENCOUNTER_ID = 'border-battle-line';
export const BORDER_LEGATE_ID = 'post-camp-legate';
/** Sergeant Kell of the Coalition's watch reads the Marshal's seal at the Gate of Sun Horses (src/solis-town.js). */
export const BORDER_GATE_ID = 'solis-gate-captain';
export const BORDER_SIDES = Object.freeze(['empire', 'coalition']);
export const BORDER_OUTCOMES = Object.freeze(['victory', 'defeat']);
/** The Republic's coin on the table for a sellsword who signs: double the Marshal's muster pay of 25. */
export const COALITION_SIGNING = 50;
export const COPPER_ID = 'copper-piece';
/** How much killing a soldier on the field takes: mail and a shield, not a goblin's rags. */
export const SOLDIER_HP = 100;

const inSolis = id => ({ x: SOLIS_STANDS[id].x, z: SOLIS_STANDS[id].z, yaw: SOLIS_STANDS[id].yaw });
/** Where the army's column falls in, beside the Marshal's tent at the outpost. */
const OUTPOST_MUSTER = toWorld(-552, 356);

/** People the chapter brings on, each out only in its turn (`shows`, see `cast`). */
export const BORDER_NPCS = Object.freeze([
  Object.freeze({ id: 'coalition-envoy', name: 'Envoy Telis Orren', role: 'Envoy of the Republic and the Coalition', modelRole: 'rise-custodian', color: 0x3f5f86, ...inSolis('coalition-envoy'), shows: 'envoy' }),
  Object.freeze({ id: 'envoy-guard-north', name: 'Coalition spearman', role: 'Suvali company, the envoy’s escort', modelRole: 'suvali-guard', color: 0x55636f, ...inSolis('envoy-guard-north'), shows: 'envoy' }),
  Object.freeze({ id: 'envoy-guard-south', name: 'Coalition spearman', role: 'Izoli marine, the envoy’s escort', modelRole: 'suvali-guard', color: 0x4a5f7a, ...inSolis('envoy-guard-south'), shows: 'envoy' }),
  Object.freeze({ id: 'solis-captain', name: 'Captain Arlen Voss', role: 'Captain of the Lauvel companies', modelRole: 'suvali-guard', color: 0x3f5f86, ...inSolis('solis-captain'), shows: 'report-coalition' }),
  Object.freeze({ id: 'battle-tribune', name: 'Captain Oswin Brulan', role: 'Captain of the army’s left', modelRole: 'legion-officer', color: 0x832d2b, ...toWorld(-396, 325), yaw: 0, shows: 'line-empire' }),
  Object.freeze({ id: 'coalition-captain', name: 'Captain Arlen Voss', role: 'Captain of the Lauvel companies', modelRole: 'suvali-guard', color: 0x3f5f86, ...toWorld(-396, 325), yaw: 0, shows: 'line-coalition' }),
  // The columns that march with the traveler: a file of the army's left from the outpost, the valley companies from Solis.
  ...[1, 2].map(n => Object.freeze({ id: `march-legionary-${n}`, name: 'Soldier', role: 'A file of the army’s left, on the march', modelRole: 'legion-soldier', color: 0x8f3b30,
    x: OUTPOST_MUSTER.x + n * 1.6, z: OUTPOST_MUSTER.z, yaw: 0, shows: 'march-empire', marches: true })),
  ...[1, 2, 3, 4].map(n => Object.freeze({ id: `march-valley-${n}`, name: n === 1 ? 'Valley sergeant' : 'Valley company', role: 'Of the Lauvel companies, on the march', modelRole: 'suvali-guard', color: n % 2 ? 0x3f5f86 : 0x55636f,
    x: SOLIS_STANDS['solis-captain'].x + n * 1.6, z: SOLIS_STANDS['solis-captain'].z - 3, yaw: Math.PI, shows: 'march-coalition', marches: true })),
]);
export const BORDER_MARCHERS = Object.freeze(BORDER_NPCS.filter(npc => npc.marches).map(npc => npc.id));

/** The corner of the field the traveler fights for: open ground west of the stockade. */
export const BORDER_ARENA = Object.freeze({ center: Object.freeze(toWorld(-392, 308)), checkpoint: Object.freeze(toWorld(-392, 321)),
  retreatAxis: 'z', retreatLine: toWorldZIn('border-stockade', 329) });
/** The column is up when the traveler comes this near the line's checkpoint. */
export const BORDER_ARRIVAL_RADIUS = 16;

// The eight the other side always sent, in three waves: three, three, then two more up behind.
const ENEMY_SPOTS = [[-398, 296, .2], [-386, 295, .9], [-392, 292, 1.8], [-401, 291, 5.5], [-383, 290, 7], [-392, 288, 9], [-396, 290, 13], [-388, 289.5, 14.5]];
/**
 * **And four more, for a company big enough to be worth them** (`borderLine`). They are the same
 * soldiers at the same level - the user's ruling is *more men, never a higher level* - and they
 * come up behind, on the flanks and in the deepest rank the arena has, in the **third wave**: their
 * entries run 15.5 to 18.5 s, no more than two seconds apart from each other or from the eighth
 * man, so the line is still the three waves the captains promise however big it is (pinned in
 * tests/quest-directions.test.js). Every one of them stands at least 1.2 m from the authored eight
 * and from the others, inside the 21 m toward the enemy and the 12 m across that `encounterConfig`
 * accepts, and nowhere near the ground an ally may stand on: the whole of the traveler's side
 * forms up 10 to 18 m the other way (`ALLY_SPOTS`, `companionAllies`).
 */
const EXTRA_SPOTS = [[-403.5, 293.5, 15.5], [-380.5, 292.5, 16.5], [-398, 287, 17.5], [-386, 287, 18.5]];
const LINE_SPOTS = [...ENEMY_SPOTS, ...EXTRA_SPOTS]
  .map(([x, z, entry]) => { const p = toWorld(x, z); return [p.x, p.z, entry]; });
const ALLY_SPOTS = [[-398, 318], [-386, 318], [-401, 322], [-383, 322], [-392, 324]]
  .map(([x, z]) => { const p = toWorld(x, z); return [p.x, p.z]; });

/**
 * **The battle grows with the company** (the user, 2026-09-21, docs/design-answers.md): *the enemy
 * line grows with the size of the traveler's company - more soldiers, never a higher level - so
 * that ten companions meet a fight worth ten and a full company is still a climax.*
 *
 * One table, read straight: the index is how many companions are walking with him when the line is
 * laid, and the number is how many of the other side come on. Nothing else about the fight moves,
 * and nothing about it is saved - the line is decided when the encounter is built and forgotten
 * with the fight.
 *
 * **A short company meets exactly today's eight.** Rows 0 to 6 are all eight on purpose: below
 * `FILE_FLOOR` (six, src/file-fill.js) the army is making his numbers up for him, and a battle
 * that grew while his commander was handing him strangers would be taking back what it just gave.
 * So the fill's own measurement - a lone traveler at 32 of 40 - is untouched by any of this.
 *
 * **Above the floor, one more soldier a companion**, which is the plainest rule a player can feel:
 * bring a friend, meet a man. It runs out at twelve because twelve is every enemy `encounterConfig`
 * will accept in one fight (src/combat.js), so ten companions - the whole roster - meet the largest
 * line this fight can be given.
 */
export const BORDER_LINE = Object.freeze([8, 8, 8, 8, 8, 8, 8, 9, 10, 11, 12]);
/** How many come on against a company of this size, which is the table and nothing else. */
export function borderLine(company = 0) {
  const walking = Math.max(0, Math.floor(Number(company) || 0));
  return BORDER_LINE[Math.min(walking, BORDER_LINE.length - 1)];
}

const LINE_WORDS = Object.freeze({ 9: 'nine', 10: 'ten', 11: 'eleven', 12: 'twelve' });
/**
 * **What his captain says when the other side has counted his company**, in the voice of the man
 * who already gives him the word at the line - Captain Oswin Brulan of the army's left, or Captain
 * Arlen Voss of the Lauvel companies. Two short sentences, truthful about the number, and **nothing
 * at all** while the line is the eight it has always been, because a captain who remarks on eight
 * men every time is a captain nobody listens to.
 */
export function borderLineSaid(side, count) {
  const many = Math.max(0, Math.floor(Number(count) || 0));
  const word = LINE_WORDS[many];
  if (!word || many <= BORDER_LINE[0]) return Object.freeze([]);
  return side === 'coalition'
    ? Object.freeze([`They have counted your company and answered it: ${word} across from us, where there were eight.`,
      'It is the same corner of the same field. Hold it and the day is still ours.'])
    : Object.freeze([`Their scouts counted your company, so there are ${word} of them across from us now, not eight.`,
      'That is what a company is worth to them. Hold your corner and they can send fourteen.']);
}

/**
 * The encounter for a side: the other side's line in waves, and the allies who stand with the
 * traveler. `company` is how many companions are walking with him as the line is laid, and it
 * decides how many come on (`borderLine`); nothing else in the fight depends on it.
 *
 * **The hold is lifted** (the user, 2026-09-21: "Lift it to level 2"). These battles carried
 * `HELD_AT_TUNED_LEVEL = 0` while phase 3 and companions were unbuilt, because a traveler with no
 * armour and nobody beside him would have met them at their country's level and lost. Both are
 * built now, so the field is gone and this fight takes the level of the ground it is fought on
 * like every other fight in the game - which for the stockade is the Moros Plain, and **level 2**,
 * measured on the built world rather than assumed.
 *
 * What that is, driven at level 2 over forty seeds with the hunter's validated line driver, the
 * traveler as the arc leaves him (Blades 17, Toughness 12, no armour, no shield) and his side's own
 * four beside him (docs/known-issues.md):
 *
 * | walking with him | the line | won | health | seconds | dead on his side |
 * |---|---|---|---|---|---|
 * | nobody, and the six the army assigns | 8 | **32/40** | 59 % | 80 | 5.9 of the 6 assigned |
 * | six companions | 8 | 40/40 | 96 % | 41 | 2.2 of 6 |
 * | eight companions | 10 | 40/40 | 95 % | 49 | **3.5 of 8** |
 * | ten companions | 12 | 40/40 | 91 % | 56 | **4.8 of 10** |
 *
 * Against the eight alone, eight companions and ten both won 40 of 40 at 96 % in about 37 seconds
 * with **one** man down: a parade. What the line costs a full company now is half of it.
 *
 * **Twelve is the ceiling, and it is not this module's.** `encounterConfig` refuses any fight with
 * more than twelve enemies (src/combat.js), so twelve is the largest line the game will lay, and
 * a full company meets it. The traveler's own health barely moves at that size - with fourteen on
 * his side, one tell in ten is aimed at him - so what a big company buys is a longer battle that
 * kills its friends, not a harder one for him.
 */
export function borderEncounter(side, allies = [], company = 0) {
  const foe = side === 'empire' ? 'coalition' : 'legion';
  return { id: BORDER_ENCOUNTER_ID, center: { ...BORDER_ARENA.center }, checkpoint: { ...BORDER_ARENA.checkpoint },
    retreatAxis: BORDER_ARENA.retreatAxis, retreatLine: BORDER_ARENA.retreatLine,
    enemies: LINE_SPOTS.slice(0, borderLine(company)).map(([x, z, entry], index) => ({ id: `border-foe-${index + 1}`, x, z, entry, hp: SOLDIER_HP, kind: 'soldier', look: foe })),
    allies: allies.slice(0, ALLY_SPOTS.length).map((ally, index) => ({ ...ally, x: ALLY_SPOTS[index][0], z: ALLY_SPOTS[index][1] })) };
}

// The original four keep their ground. Further arrivals form a wider forward
// rank, clear of the traveler at +13 and the host's supporting file at +15.6/+18.
// These are metres relative to the arena, not positions stretched with the map.
const MUSTER_ALLY_OFFSETS=Object.freeze([
  [-6,10],[6,10],[-9,14],[9,14],[0,7],[-3,7],[3,7],[-9,7],[9,7],[0,10],
]);

/** Both living factions take the field as themselves. Nothing beyond the fourth
 * mercenary is discarded, and duplicate world/companion references remain one
 * person. Ordinary soldiers fill the other side's existing three waves. The
 * roster is the ten possible fellow recruits; the player's own slot is separate. */
export function borderMusterEncounter(side,{allies=[],opponents=[],company=0}={}){
  const seen=new Set();
  const unique=people=>people.filter(person=>{
    if(!person?.id||seen.has(person.id)||person.npcId&&seen.has(person.npcId))return false;
    seen.add(person.id);if(person.npcId)seen.add(person.npcId);return true;
  });
  const friends=unique(allies),foes=unique(opponents);
  if(friends.length>MUSTER_ALLY_OFFSETS.length||foes.length>MERCENARY_COMPANY_SIZE-1)
    throw new RangeError('The border muster has more mercenaries than the living roster.');
  const count=Math.max(borderLine(Math.max(Number(company)||0,friends.length)),foes.length);
  // The legacy builder authors all twelve valid enemy positions and entry times;
  // using its whole line avoids a second geometry or a new kind of reinforcement.
  const config=borderEncounter(side,[],10);
  config.enemies=config.enemies.slice(0,count).map((soldier,index)=>foes[index]
    ? {...soldier,...foes[index],kind:foes[index].kind==='legionary'?'soldier':foes[index].kind??'soldier',x:soldier.x,z:soldier.z,entry:soldier.entry}
    : soldier);
  config.allies=friends.map((person,index)=>({...person,
    x:config.center.x+MUSTER_ALLY_OFFSETS[index][0],z:config.center.z+MUSTER_ALLY_OFFSETS[index][1]}));
  return config;
}

/**
 * Where the n-th of a marching column wants to be: a loose file behind the
 * traveler. A man left further behind than `catchUp` metres is moved up to his
 * place rather than walked there, so a canter does not lose the column.
 */
export const MARCH = Object.freeze({ spacing: 2.2, pace: 4.6, jog: 7.6, catchUp: 30 });
export function marchSlot(index, traveler, heading) {
  const row = Math.floor(index / 2), side = index % 2 ? 1 : -1, back = 2.8 + row * MARCH.spacing;
  const bx = -Math.sin(heading), bz = -Math.cos(heading), sx = Math.cos(heading), sz = -Math.sin(heading);
  return { x: traveler.x + bx * back + sx * side * .9, z: traveler.z + bz * back + sz * side * .9 };
}

const fail = reason => ({ ok: false, reason });
const action = (id, label, objectiveId, reason = '') => ({ id, label, objectiveId, enabled: !reason, reason });
const initial = () => ({ version: BORDER_VERSION, revision: 0, started: false, ordered: false, entered: false, side: null, ready: false, marched: false, outcome: null, entryOrigin: null });
const KEYS = Object.freeze(['version', 'revision', 'started', 'ordered', 'entered', 'side', 'ready', 'marched', 'outcome', 'entryOrigin']);
/** Saves from before the parley moved to Solis carry none of these. */
const ADDED = Object.freeze(['entered', 'ready', 'marched']);
const progress = data => [data.started, data.ordered, data.entered, data.side !== null, data.ready, data.marched, data.outcome !== null].filter(Boolean).length;

export function validateBorderSnapshot(data, { allowMissing = true } = {}) {
  if (data === undefined) return allowMissing;
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.version !== BORDER_VERSION
    || Object.keys(data).some(key => !KEYS.includes(key))
    || !Number.isSafeInteger(data.revision) || data.revision < 0 || typeof data.started !== 'boolean' || typeof data.ordered !== 'boolean'
    || (data.side !== null && !BORDER_SIDES.includes(data.side)) || (data.outcome !== null && !BORDER_OUTCOMES.includes(data.outcome))) return false;
  const present = ADDED.filter(key => Object.hasOwn(data, key));
  if (present.length && present.length !== ADDED.length) return false;
  if (![undefined, null, 'solis', 'luscia'].includes(data.entryOrigin)) return false;
  const earlyRepublic = data.entryOrigin === 'luscia';
  if (earlyRepublic && (data.side !== 'coalition' || !data.started || !data.entered)) return false;
  if ((data.ordered && !data.started) || (data.side && !data.ordered && !earlyRepublic) || (data.outcome && !data.side)) return false;
  if (!present.length) return data.revision === Number(data.started) + Number(data.ordered) + Number(data.side !== null) + Number(data.outcome !== null);
  if (ADDED.some(key => typeof data[key] !== 'boolean')) return false;
  if ((data.entered && !data.ordered && !earlyRepublic) || (data.side && !data.entered) || (data.ready && !data.side) || (data.marched && !data.ready) || (data.outcome && !data.marched)) return false;
  return data.revision === progress(data);
}

export function createBorderChapter({ onEvent = () => {} } = {}) {
  let state = initial(), active = false;
  const snapshot = () => ({ ...state });
  const empire = () => state.side !== 'coalition';
  const commander = () => (state.side === 'coalition' ? 'coalition-captain' : 'battle-tribune');
  const reporter = () => (state.side === 'coalition' ? 'solis-captain' : BORDER_LEGATE_ID);

  function stage() {
    if (!state.started) return 'not-started';
    if (!state.ordered && state.entryOrigin !== 'luscia') return 'take-orders';
    if (!state.entered) return 'pass-gate';
    if (!state.side) return 'meet-envoy';
    if (!state.ready) return 'report';
    if (!state.marched) return active ? 'fighting' : 'march';
    if (!state.outcome) return active ? 'fighting' : 'join-line';
    return 'complete';
  }

  function view() {
    const current = stage();
    const won = state.outcome === 'victory';
    const views = {
      'not-started': [0, 'The Marshal’s terms', 'Finish your business at the army camp first.', 'MOROS PLAIN · THE BORDER', []],
      'take-orders': [1, 'The Marshal’s terms', 'The muster will not grow in time. Marshal Hadric Venmor has terms for the Coalition; take them from him at the command tent.', 'THE MOROS · 1 / 5 · A MESSAGE FOR THE COALITION', [BORDER_LEGATE_ID]],
      'pass-gate': [2, 'The Gate of Sun Horses', 'Carry the Marshal’s terms to Solis: south-east from the border stockade, over the downs of West Suval, to the Gate of Sun Horses. Show his seal to the Coalition’s watch at the gate.', 'WEST SUVAL · 2 / 5 · A MESSAGE FOR THE COALITION', [BORDER_GATE_ID]],
      'meet-envoy': [3, 'The Court of Oaths', 'Envoy Telis Orren waits in the Court of Oaths, up the main street of Solis past the market square. Give her the Marshal’s terms and hear what the Republic offers.', 'SOLIS · 3 / 5 · A MESSAGE FOR THE COALITION', ['coalition-envoy']],
      report: [4, empire() ? 'The envoy’s answer' : 'The valley companies', empire()
        ? 'You kept the Empire’s contract. Ride back to the army’s outpost on the Moros and give Marshal Venmor the envoy’s answer. The army marches when you tell him you are ready.'
        : 'You signed for the Republic. Captain Arlen Voss has the Lauvel companies at the Gate of Sun Horses. They march for the border when you tell him you are ready.', empire() ? 'THE MOROS · 4 / 5 · THE BORDER BATTLE' : 'SOLIS · 4 / 5 · THE BORDER BATTLE', [reporter()]],
      march: [5, 'The march to the border', empire()
        ? 'The hired company and a file of the army’s left march with you to the border stockade. Captain Oswin Brulan holds the line south-west of it; the fight begins when your column comes up.'
        : 'The valley companies march with you up the road from Solis to the border stockade. Captain Voss has ridden ahead to form the line south-west of it; the fight begins when your column comes up.', 'THE BORDER · 5 / 5 · THE BORDER BATTLE', [commander()]],
      'join-line': [5, empire() ? 'The army’s left' : 'The Republic’s right', empire()
        ? 'You kept the Empire’s contract. Captain Oswin Brulan commands the hired company on the army’s left, south-west of the stockade. Tell him when you are ready.'
        : 'You stand with the Republic. Captain Arlen Voss holds the Coalition’s right with the Lauvel companies, south-west of the stockade. Tell him when you are ready.', 'THE BORDER · 5 / 5 · THE BORDER BATTLE', [commander()]],
      // **No number in it.** The line is as big as the company he brought (`borderLine`), and the
      // panel is written once for every size of it; the captain is the one who says how many.
      fighting: [5, 'Hold your corner of the field', 'Their line comes on in three waves, shields up. Strike when they have swung; a soldier on guard turns a blade. Your allies fight beside you. Fall back south if you must; the line will wait.', 'THE BORDER BATTLE', []],
      complete: [6, won ? 'The field is yours' : 'The field is lost', (empire()
        ? (won ? 'The Coalition broke and fell back on Solis. The army rides after them into West Suval.' : 'The army lost the field and pulled back across the plain; the Coalition holds the stockade.')
        : (won ? 'The army broke. The Coalition holds the stockade and the road onto the Moros.' : 'The Coalition was thrown back toward Solis, and you with it.')), 'THE BORDER BATTLE · FOUGHT', []],
    };
    const [step, title, detail, kicker, destinations] = views[current];
    return { stage: current, step, steps: 5, title, detail, kicker, side: state.side, outcome: state.outcome, entryOrigin: state.entryOrigin,
      active: state.started && !state.outcome, complete: !!state.outcome, fighting: active, marching: current === 'march',
      objectiveId: destinations[0] ?? null, destinationIds: [...destinations] };
  }

  /** Which of the chapter's people are out right now. */
  function cast() {
    const current = stage(), side = state.side;
    const out = shows => (shows === 'envoy' && ['take-orders', 'pass-gate', 'meet-envoy'].includes(current))
      || (shows === `report-${side}` && current === 'report')
      || (shows === `line-${side}` && ['march', 'join-line', 'fighting'].includes(current))
      || (shows === `march-${side}` && current === 'march');
    return BORDER_NPCS.filter(npc => out(npc.shows)).map(npc => npc.id);
  }

  function availableActions() {
    switch (stage()) {
      case 'take-orders': return [action('take-legate-terms', 'Take the Marshal’s terms to Solis', BORDER_LEGATE_ID)];
      case 'pass-gate': return [action('enter-solis', 'Here is the Marshal’s seal. I carry his terms to your envoy.', BORDER_GATE_ID)];
      case 'meet-envoy': return [action('side-empire', 'I took the Empire’s coin. Give me your answer for the Marshal.', 'coalition-envoy'),
        action('side-coalition', `I will sign for the Republic. (${COALITION_SIGNING} copper)`, 'coalition-envoy')];
      case 'report': return [action('march-out', 'Yes.', reporter())];
      case 'march': return [action('reach-line', 'The column is up. We take the line.', commander())];
      case 'join-line': return [action('sound-advance', 'I am ready. Sound the advance.', commander())];
      default: return [];
    }
  }

  function emit(actionId, detail = {}) {
    state.revision++;
    const event = { type: 'border-progress', sequence: state.revision, actionId, stage: stage(), ...detail };
    onEvent(event);
    return { ok: true, reason: '', ...event };
  }

  function start() {
    if (state.started) return fail('The border is already your business.');
    state.started = true;
    return emit('start-chapter');
  }

  /** Hara's recruits report directly to Voss; no forged Marshal's seal or signing reward. */
  function joinRepublic() {
    if (state.outcome) return fail('The border battle has already been decided.');
    if (state.side === 'coalition') return { ok: true, first: false, side: state.side };
    state.started = true; state.entered = true; state.side = 'coalition'; state.entryOrigin = 'luscia';
    state.ready = false; state.marched = false; active = false;
    state.revision = progress(state) - 1;
    return emit('join-republic', { first: true, side: state.side, entryOrigin: state.entryOrigin });
  }

  function act(actionId) {
    const choice = availableActions().find(candidate => candidate.id === actionId);
    if (!choice) return fail(state.outcome ? 'The border battle is fought.' : !state.started ? 'Join the Marshal’s muster first.' : `Your current task: ${view().detail}`);
    const toast = (text, banner) => ({ objectiveId: choice.objectiveId, toast: [text, banner] });
    switch (actionId) {
      case 'take-legate-terms':
        state.ordered = true;
        return emit(actionId, toast('The Marshal’s terms, sealed. Carry them south-east over the border to Solis.', 'JOURNAL UPDATED'));
      case 'enter-solis':
        state.entered = true;
        return emit(actionId, toast('Sergeant Kell reads the seal and waves you through the Gate of Sun Horses. The envoy waits in the Court of Oaths.', 'SOLIS'));
      case 'side-empire':
        state.side = 'empire'; state.entryOrigin = 'solis';
        return emit(actionId, { side: state.side, ...toast('You keep the Empire’s contract. The envoy’s answer is no; carry it to the Marshal.', 'YOUR SIDE IS CHOSEN') });
      case 'side-coalition':
        state.side = 'coalition'; state.entryOrigin = 'solis';
        return emit(actionId, { side: state.side, reward: { id: COPPER_ID, quantity: COALITION_SIGNING },
          ...toast(`You sign for the Republic, and ${COALITION_SIGNING} copper goes into your purse. Captain Voss is at the Gate of Sun Horses.`, 'YOUR SIDE IS CHOSEN') });
      case 'march-out':
        state.ready = true;
        return emit(actionId, { ...toast(empire() ? 'The army marches. The hired company and a file of the left fall in behind you on the road to the border.'
          : 'The valley companies fall in behind you. The road runs north-west over the downs to the border.', 'THE MARCH') });
      case 'reach-line':
        // The column is up: the line is formed, and the fight begins.
        state.marched = true; active = true;
        return { ...emit(actionId, { objectiveId: choice.objectiveId }), startEncounter: BORDER_ENCOUNTER_ID, side: state.side };
      default:
        // Sounding the advance again starts a fight; it is not progress until the fight is decided.
        active = true;
        return { ok: true, reason: '', actionId, startEncounter: BORDER_ENCOUNTER_ID, side: state.side };
    }
  }

  /** Retreat or defeat in the skirmish: the line waits, and the advance can be sounded again. */
  function endEncounter(encounterId) {
    if (encounterId !== BORDER_ENCOUNTER_ID || !active) return fail('There is no fight on the border to end.');
    active = false;
    return { ok: true, reason: '' };
  }

  /** The traveler held their corner, and with it the day: their side has won the border battle. */
  function resolveBattle(encounterId) {
    if (encounterId !== BORDER_ENCOUNTER_ID || !active || !state.side || state.outcome) return fail('There is no border battle to decide.');
    active = false;
    state.outcome = 'victory';
    return emit('resolve-border-battle', { side: state.side, outcome: state.outcome });
  }

  function restore(data) {
    if (!validateBorderSnapshot(data, { allowMissing: false })) return false;
    // A save from before the parley moved to Solis keeps its side: past the envoy it has been through the gate,
    // and it reports and marches again unless the battle is already fought.
    const legacy = !Object.hasOwn(data, 'entered');
    // The day used to be rolled after the traveler had already won the fight, so a save can say 'defeat'
    // for a battle its traveler won. Every recorded outcome was a won fight: it is a victory.
    const outcome = data.outcome === null ? null : 'victory';
    state = { version: BORDER_VERSION, revision: 0, started: data.started, ordered: data.ordered,
      entered: legacy ? data.side !== null : data.entered, side: data.side,
      ready: legacy ? data.outcome !== null : data.ready, marched: legacy ? data.outcome !== null : data.marched, outcome,
      entryOrigin: data.entryOrigin ?? (data.side ? 'solis' : null) };
    state.revision = legacy ? progress(state) : data.revision;
    active = false;
    return true;
  }

  return { start, joinRepublic, act, endEncounter, resolveBattle, view, cast, availableActions, snapshot, restore,
    get state() { return { ...snapshot(), stage: stage(), fighting: active, complete: !!state.outcome }; } };
}

/** The Marshal, the envoy, Voss and the line commanders speak for the chapter while it is theirs. */
export function borderConversation(npc, context) {
  /**
   * `fill` is what his captain says about the ordinary soldiers the army is putting in beside
   * him, or nothing at all when it is not happening (`fillLines`, src/file-fill.js). The **host**
   * builds it, because only the host knows who is actually walking with him today - and because
   * `file-fill.js` reads this module's own encounter id, so it cannot be imported back into it.
   */
  const { border, openDialogue, closeDialogue, act, musterCount = 1, fill = [], line = [] } = context;
  const view = border.view(), current = view.stage;
  const option = id => { const found = border.availableActions().find(item => item.id === id); return found ? [{ ...found, action: () => { closeDialogue(); act(id); } }] : []; };
  const leave = { id: 'leave-border', label: 'Not yet.', action: closeDialogue };
  const moment = { id: 'leave-border', label: 'Give me a moment.', action: closeDialogue };
  if (npc.id === BORDER_LEGATE_ID && current === 'take-orders') {
    openDialogue(npc, [
      `The muster stands at ${Math.max(1, Math.min(MERCENARY_COMPANY_SIZE, Math.round(musterCount)))} of ${MERCENARY_COMPANY_SIZE}, and it will have to do. My scouts say the Coalition marches from Solis within days.`,
      'Their envoy sits in the Court of Oaths at Solis, south-east past the border stockade, over the downs. Carry my terms: they quit West Suval by the coast road, and the Emperor forgets the names on the Lauvel rolls. Show my seal at their gate; even rebels respect a sealed messenger.',
      'Bring me her answer, or bring me nothing and I will know it. Either way the hired company stands on my left when we march.',
    ], null, 'Back to the camp', { choices: [...option('take-legate-terms'), leave] });
    return true;
  }
  if (npc.id === BORDER_LEGATE_ID && current === 'report' && view.side === 'empire') {
    openDialogue(npc, [
      'You came back alone, so I know her answer before you give it. Let me hear it anyway.',
      'No. Of course no. Then we settle it at the border before their islanders learn to march in step. Captain Brulan has the line at the stockade. The hired company and a file of the left march with you.',
      'Are you ready?',
    ], null, 'Back to the camp', { choices: [...option('march-out'), moment] });
    return true;
  }
  if (npc.id === 'coalition-envoy' && current === 'meet-envoy') {
    openDialogue(npc, [
      'Telis Orren, for the Republic and for the Coalition in Solis. You carry Venmor’s terms. I could recite them: leave, and be forgiven. We have heard them since Ambron burned the first petition.',
      'Look at who stands with us: Izoli captains, the Suvali companies, Luscia’s own sons, a handful from Pyros, Selemis and Marosh, the island cities. Then look at who stands with Venmor: men paid by the day. Like you.',
      `So here is a better day’s pay. ${COALITION_SIGNING} copper on this table now, hard coin, for a sellsword who signs. Double the Marshal’s rate for every day after. Land when the Republic wins. Venmor paid you twenty-five to stand in his muster. Whose sellsword are you?`,
    ], null, 'Back to the street', { choices: [...option('side-empire'), ...option('side-coalition'), leave] });
    return true;
  }
  if (npc.id === 'solis-captain' && current === 'report') {
    openDialogue(npc, [
      view.entryOrigin === 'luscia'
        ? 'Arlen Voss. Hara sent word from Nothom. You chose the Republic without waiting for an Imperial messenger to ask the question. Welcome to the valley companies. Our hired swords gather here with the people they chose to defend.'
        : 'Arlen Voss. I farmed the Lauvel valley until the army made a battlefield of it. Orren says you signed. Then the valley companies march with you.',
      'Venmor will not wait for us to choose the ground. The border stockade is the ground. I ride ahead to form the line; the companies walk the road with you, north-west over the downs.',
      'Are you ready?',
    ], null, 'Back to the gate', { choices: [...option('march-out'), moment] });
    return true;
  }
  if ((npc.id === 'battle-tribune' || npc.id === 'coalition-captain') && current === 'march') {
    openDialogue(npc, [npc.id === 'battle-tribune'
      ? 'Your column is up. Good. Form them on the left, south-west of the stockade, and hold that corner.'
      : 'You brought them up the road. Good. Form them on the right, south-west of the stockade.',
      ...fill, ...line], null, 'Back to the line', { choices: [...option('reach-line'), leave] });
    return true;
  }
  if ((npc.id === 'battle-tribune' || npc.id === 'coalition-captain') && current === 'join-line') {
    openDialogue(npc, [...(npc.id === 'battle-tribune' ? [
      'Oswin Brulan, captain of the left. You are the hired sword who carried the terms to Solis and came back ours. Good. Your company holds this corner; whoever of the eleven has arrived stands with you.',
      'They will come in three waves across the open ground. Hold, kill what reaches you, and fall back south to me if you must. Say when.',
    ] : [
      'Arlen Voss. Orren says you are ours now. Then you stand here, on the right, with what is left of the valley companies.',
      'Their soldiers will come in three waves across the open ground. Hold, and fall back south to me if you must. Say when.',
    ]), ...line], null, 'Back to the line', { choices: [...option('sound-advance'), leave] });
    return true;
  }
  // Out of their turn, the chapter's people still answer.
  if (npc.id === 'coalition-envoy') { openDialogue(npc, [current === 'take-orders' || current === 'pass-gate' ? 'I wait for the Marshal’s messenger. He is late; they always are.' : 'The Republic’s offer stands until the battle. After that it is a different conversation.'], null, 'Back to the street'); return true; }
  if (BORDER_MARCHERS.includes(npc.id)) { openDialogue(npc, [npc.modelRole === 'legion-soldier' ? 'Keep the pace. The Captain does not wait for stragglers.' : 'Keep to the road. We are right behind you.'], null, 'Back to the road'); return true; }
  if (npc.id.startsWith('envoy-guard')) { openDialogue(npc, ['We keep this door for the envoy. Speak to her, not to us.'], null, 'Back to the street'); return true; }
  if (npc.id === 'solis-captain' || npc.id === 'coalition-captain') { openDialogue(npc, ['Not now. Stand with the companies.'], null, 'Step back'); return true; }
  if (npc.id === 'battle-tribune') { openDialogue(npc, ['Stand to your place in the line.'], null, 'Step back'); return true; }
  return false;
}

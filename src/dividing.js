/**
 * **The Dividing** (docs/lizeem-farmlands-design.md 5.5: "With all four leaves of the Measure full, Taleth holds the
 * Dividing on the forecourt"; the contract for Build 5; built 6 October 2026 under the user's "keep building
 * everything").
 *
 * The lore's Minora (geography/regions/minora.md) holds the Dividing once the river has settled into its channels:
 * it "celebrates neither abundance nor victory but the fact that the city and river have reached another workable
 * arrangement", and water from above the fork is poured into a bowl for each branch, "a ritual that is almost
 * embarrassingly literal and therefore perfectly Minoran". The old ritual speech says the river did not submit to
 * Minora: it agreed to be divided. The city's own dish is fork stew, grain and fish, made differently in every
 * district; the Old Island insists on three grains, which everyone mocks while eating.
 *
 * Here the Guild holds it on the tower's forecourt, once all four countries are restored (`ready()`: the hub's
 * Caricas stage and the three registered arcs all `done`). It goes in three steps:
 *
 *   `waiting`  the four countries restored; Taleth's locked topic "The Dividing" opens
 *   `told`     Taleth has told Rollo what the Dividing wants and taught him fork stew
 *   `done`     the stew served and the Dividing held: four bowls on a trestle, the four countries named, Seshat and
 *              Nepri a line each, and "Walker of the Measure" in the journal
 *
 * Fork stew is cooked at any lit fire from a bridge rye, a flood oats, a weir fish and a wheat from either bank:
 * floodwheat from Nesdor (`fork-stew`) or hard wheat from Ovesos (`fork-stew-oveth`). A recipe takes one list of
 * goods (src/cooking.js), so the two wheats are two recipes that make the same stew. It heals 60, the one food over
 * the larder's 50 (tests/foods.test.js).
 *
 * The Dividing registers with the hub as its fifth arc (src/lizeem-farmlands.js `registerArc('dividing', ...)`):
 * the hub nests its save, shows its card once it is ready, marks Taleth while it waits, and writes its journal entry.
 * Taleth's later charges change their reason once it is held (src/taleth.js, `context.dividing`).
 *
 * Pure: no DOM, no three. The props are src/dividing-scenery.js.
 */
import { TALETH } from './taleth.js';

const freeze = Object.freeze;

export const DIVIDING_ID = 'dividing';
export const DIVIDING_VERSION = 1;
/** The four countries whose arcs must be done: Caricas in the hub itself, the other three registered with it. */
export const DIVIDING_COUNTRIES = freeze(['caricas', 'nethereum', 'nesdor', 'ovesos']);
export const DIVIDING_STAGES = freeze(['waiting', 'told', 'done']);
/** The line the journal enters, and the Guild's ledger. */
export const DIVIDING_TITLE = 'Walker of the Measure';
/** The Farming lump for holding it, as each arc's end pays (first pass). */
export const DIVIDING_XP = 1000;

// ---------------------------------------------------------------------------
// Fork stew
// ---------------------------------------------------------------------------
export const FORK_STEW = 'fork-stew';
export const FORK_STEW_HEALING = 60;
const recipe = (id, entry) => freeze({ id, ...entry, needs: freeze(entry.needs) });
/** In src/cooking.js's shape; the kitchen spreads them in. */
export const DIVIDING_RECIPES = freeze({
  'fork-stew': recipe('fork-stew', { name: 'Fork stew', xp: 60, needs: { 'bridge-rye': 1, 'flood-oats': 1, floodwheat: 1, 'weir-fish': 1 }, makes: FORK_STEW,
    note: 'Minora’s own dish, the Old Island way: three grains and a fish, from both banks of the river. A sheaf of bridge rye, one of flood oats and one of floodwheat off the Nesdor bench, and a weir fish, simmered thick at a lit fire. Restores up to 60 health.' }),
  'fork-stew-oveth': recipe('fork-stew-oveth', { name: 'Fork stew with Ovesos wheat', xp: 60, needs: { 'bridge-rye': 1, 'flood-oats': 1, 'hard-wheat': 1, 'weir-fish': 1 }, makes: FORK_STEW,
    note: 'The same stew with its wheat from the other bank: hard wheat off the Ovesos canal in place of floodwheat. Restores up to 60 health.' }),
});
export const FORK_STEW_RECIPES = freeze(Object.keys(DIVIDING_RECIPES));
/** Satchel entries; src/inventory.js spreads them in. */
export const DIVIDING_ITEMS = freeze({
  'fork-stew': freeze({ name: 'Fork stew', type: 'Food', icon: 'bowl', stackable: true, eatName: 'bowl of fork stew',
    brief: 'Three grains and a fish, the Old Island way. Restores up to 60 health.',
    description: 'Restores up to 60 health. Minora’s own dish: rye from Caricas, oats from Nethereum, wheat from Nesdor or Ovesos and a fish from the Nethrani weirs, simmered thick. Every district of the city makes it differently and defends its way with irrational passion.' }),
});
/** In src/consumables.js's shape. */
export const DIVIDING_FOODS = freeze({
  'fork-stew': freeze({ healing: FORK_STEW_HEALING,
    missing: 'You have no fork stew. Cook it at a lit fire from a bridge rye, a flood oats, a floodwheat or hard wheat, and a weir fish, once Taleth has told you how.' }),
});

// ---------------------------------------------------------------------------
// Where the props stand (src/dividing-scenery.js draws them)
// ---------------------------------------------------------------------------
/**
 * The trestle stands on the west side of the forecourt, clear of the start (-2414, 63), of Taleth's stand and of the
 * way from the start to him; the four bowls on it run west to east, Caricas to Ovesos. Seshat and Nepri have places
 * on the tower side of it, facing the forecourt, for a host that walks them up from the Library and the storehouse.
 */
export const DIVIDING_PLACES = freeze({
  trestle: freeze({ id: 'dividing-trestle', x: -2420.5, z: 59.5, width: 2.6, depth: .9, height: .82, yaw: 0 }),
  bowls: freeze(DIVIDING_COUNTRIES.map((country, i) => freeze({ id: `dividing-bowl-${country}`, country, x: -2421.5 + i * .66, z: 59.45 }))),
  jug: freeze({ x: -2419.6, z: 59.75 }),
  guests: freeze({ 'lizeem-seshat': freeze({ x: -2422, z: 57.6, yaw: 0 }), 'lizeem-nepri': freeze({ x: -2419, z: 57.6, yaw: 0 }) }),
});

// ---------------------------------------------------------------------------
// The save
// ---------------------------------------------------------------------------
const fresh = () => ({ version: DIVIDING_VERSION, stage: 'waiting' });
const copy = value => JSON.parse(JSON.stringify(value));
const isObject = value => !!value && typeof value === 'object' && !Array.isArray(value);

/** Whether a saved section is one this module wrote. `undefined` is a save from before the Dividing. */
export function validateDividing(value) {
  if (value === undefined) return true;
  if (!isObject(value) || value.version !== DIVIDING_VERSION || !DIVIDING_STAGES.includes(value.stage)) return false;
  return Object.keys(value).every(key => ['version', 'stage'].includes(key));
}

/** Whether one country's arc is done, as the hub reports it: Caricas in the hub, the others by their registered arcs. */
export function countryRestored(farmlands, id) {
  try { return id === 'caricas' ? farmlands?.caricas?.stage === 'done' : farmlands?.arc?.(id)?.stage?.() === 'done'; } catch { return false; }
}

/**
 * The Dividing. `farmlands` is the hub (src/lizeem-farmlands.js), `inventory` the satchel, `cooking` the kitchen,
 * `skills` the skills (the Farming lump); any may be missing in a test. With no satchel to ask, the stew is served.
 */
export function createDividing({ farmlands = null, inventory = null, cooking = null, skills = null, onEvent = () => {} } = {}) {
  let state = fresh();
  const restored = () => DIVIDING_COUNTRIES.filter(id => countryRestored(farmlands, id));
  const accepted = () => { try { return !!farmlands?.accepted?.(); } catch { return false; } };
  /** All four countries restored, under Taleth's charge. */
  const ready = () => accepted() && restored().length === DIVIDING_COUNTRIES.length;
  const held = () => state.stage === 'done';
  const carrying = () => (inventory?.count ? inventory.count(FORK_STEW) > 0 : true);
  const knows = () => FORK_STEW_RECIPES.every(id => cooking?.knows ? cooking.knows(id) : true);

  /** Taleth tells Rollo what the Dividing wants. Once, and only when it is ready. */
  function tell() {
    if (!ready() || state.stage !== 'waiting') return false;
    state.stage = 'told';
    onEvent({ type: 'dividing-told' });
    return true;
  }
  /**
   * Fork stew, both ways, into the kitchen. A recipe the kitchen refuses (no Fire Making) is heard and not kept:
   * `{ ok, reason, learned }`, where `learned` lists what was taken now.
   */
  function teach() {
    if (!cooking?.learn) return { ok: true, reason: '', learned: [] };
    const learned = [];
    for (const id of FORK_STEW_RECIPES) {
      if (cooking.knows?.(id)) continue;
      const result = cooking.learn(id);
      if (result?.ok === false) return { ok: false, reason: result.reason || 'You cannot make fork stew yet.', learned };
      learned.push(id);
    }
    return { ok: true, reason: '', learned };
  }
  /** The stew served and the Dividing held: once. */
  function hold() {
    if (!ready()) return { ok: false, reason: 'Not while any country down the river is still to be restored.' };
    if (held()) return { ok: false, reason: 'The Dividing has been held.' };
    if (inventory?.count && inventory.count(FORK_STEW) < 1) return { ok: false, reason: 'You have no fork stew to serve.' };
    if (inventory?.remove && !inventory.remove(FORK_STEW, 1)) return { ok: false, reason: 'The stew could not be served.' };
    state.stage = 'done';
    if (skills?.known && !skills.known('farming')) skills.learn?.('farming', { announce: false });
    const gained = skills?.gain?.('farming', DIVIDING_XP) ?? null;
    onEvent({ type: 'dividing-held', title: DIVIDING_TITLE, xp: DIVIDING_XP, levelled: !!gained?.levelled });
    return { ok: true, title: DIVIDING_TITLE, xp: DIVIDING_XP };
  }

  /** Its card on the tracker, once it is ready (the hub adds its place in the slate). */
  function trackableView() {
    if (!ready()) return null;
    const at = state.stage, stew = at === 'told' && carrying();
    const detail = at === 'done' ? 'The Dividing has been held on the Guild forecourt.'
      : at === 'waiting' ? 'All four countries of the Lizeem are restored. Taleth is waiting on the Guild forecourt in Minora to hold the Dividing.'
        : stew ? 'Carry the fork stew to Taleth on the Guild forecourt and hold the Dividing.'
          : 'Cook fork stew at a lit fire: a bridge rye, a flood oats, a floodwheat or a hard wheat, and a weir fish. Then carry it to Taleth on the Guild forecourt.';
    return { title: 'The Farmlands of the Lizeem: the Dividing', kicker: 'The Dividing', region: 'Isareos', stage: at,
      active: at !== 'done', complete: at === 'done', detail, destinationIds: at === 'done' ? [] : [TALETH.id],
      target: { x: TALETH.x, z: TALETH.z, id: TALETH.id, name: 'The Guild forecourt' },
      steps: [
        { text: 'Hear Taleth on the Dividing.', done: at !== 'waiting' },
        { text: 'Cook fork stew.', done: at === 'done' || stew },
        { text: 'Hold the Dividing on the forecourt.', done: at === 'done' },
      ] };
  }
  const markerIds = () => (ready() && !held() ? [TALETH.id] : []);
  /** The journal's entry once it is held: the hub gives it its id. */
  function journal() {
    if (!held()) return [];
    return [{ title: DIVIDING_TITLE, region: 'Isareos', kicker: 'The Farmlands of the Lizeem · the Dividing',
      detail: 'You walked the Measure of the River down both banks of the Lizeem and brought the four countries back to work. On the Guild forecourt Taleth poured river water into four bowls and named Caricas, Nethereum, Nesdor and Ovesos; Seshat read the leaves and Nepri wrote “shared” in his book; you served the fork stew. The Guild has written you in its ledger as a Walker of the Measure.',
      rewards: [DIVIDING_TITLE, 'Farming experience'] }];
  }
  /** Whether the trestle and the bowls are out: from the day the river is whole, and left out after. */
  const propsVisible = () => held() || ready();
  function view() {
    return { ...copy(state), ready: ready(), held: held(), restored: restored(), carrying: carrying(), knows: knows(), props: propsVisible() };
  }
  const snapshot = () => copy(state);
  function restore(data) {
    if (data === undefined) { state = fresh(); return true; }
    if (!validateDividing(data)) return false;
    state = copy(data);
    return true;
  }

  return {
    id: DIVIDING_ID,
    stage: () => state.stage, ready, held, carrying, restored, tell, teach, hold, trackableView, markerIds, journal, propsVisible, view,
    snapshot, restore, validate: validateDividing,
    attach: () => {},
  };
}

// ---------------------------------------------------------------------------
// What is said
// ---------------------------------------------------------------------------
/** Taleth, the first time the topic opens: what the Dividing wants, and the stew. */
export const DIVIDING_CHARGE = freeze([
  'All four. Caricas, Nethereum, Nesdor and Ovesos, each brought back its own way and each carried up this hill. Then we hold the Dividing, here, whatever the prince thinks of crowds.',
  'It wants four bowls of river water and a pot of fork stew, and the stew is yours: a sheaf of bridge rye, one of flood oats, one of wheat from either bank, and a weir fish, at a lit fire. Three grains and a fish, the Old Island way. The rest of the city mocks it, with its mouth full.',
  'Bring it here. I will have the trestle out and the bowls on it, and Seshat and Nepri will come up the hill, because neither of them can bear to miss a thing being measured.',
]);
/** Taleth, after he has told it, while the stew is still to come. */
export const DIVIDING_WAITING = freeze([
  'The bowls are out and the trestle is up. The stew is yours: bridge rye, flood oats, floodwheat or hard wheat, and a weir fish, at a lit fire. I can wait. I have had a great deal of practice.',
]);
/** The feast: the pouring, in the lore's manner. */
export const DIVIDING_POURING = freeze([
  'Water from above the fork, drawn at dawn before the barges stirred it. This is the part of the Dividing that is almost embarrassingly literal, which is why Minora has never once left it out.',
  'He pours into the first bowl. “Caricas, over the White Bridge, which rests its ground in turn and asks the fox.”',
  'Into the second. “Nethereum, over the Pilgrims’ Bridge, which drowns its meadow on purpose and keeps its names in the water.”',
  'Into the third. “Nesdor, beyond Caricas, which plants by how high a strip stands above the river, and will tell you so.”',
  'Into the fourth. “Ovesos, beyond Nethereum, which shares its water out by turns and argues about it for eleven years at a time.”',
  'Four bowls, one water. The river did not submit to Minora. It agreed to be divided. Every year somebody has to say so out loud, and this year it is an old man on a step.',
]);
/** Seshat and Nepri, a line each; a host that can stand them up speaks them in their own voices. */
export const DIVIDING_SESHAT = 'Four leaves, sixteen lines, every one of them sealed. I have checked them twice. I will check them again tonight, because that is the job.';
export const DIVIDING_NEPRI = 'There is a column in my book that has said “requisitioned” for a year. Tonight I am writing “shared” in it, and the garrison may read it if they like.';
/** The stew, and Taleth's close. */
export const DIVIDING_FEAST = freeze([
  'You set the pot on the trestle beside the bowls: rye from Caricas, oats from Nethereum, wheat from the bank you chose, and a fish from the Nethrani weirs.',
  'Taleth eats standing, as the Old Island does. “Three grains and a fish. Every district in the city makes this and every district is sure the others are wrong. That is the whole of Minora in one pot.”',
  '“The Measure is walked, and the valley is alive on both banks. The Guild writes you in its ledger as a Walker of the Measure. It is not a rank. It is better than a rank: nobody can take it off you by outliving you.”',
  '“I had more to ask of you. I find I have not written it yet. Come back when I have.”',
]);
/** What he says about it afterwards. */
export const DIVIDING_AFTER = freeze([
  'The bowls are still on the trestle. Nobody has had the heart to empty them, and the water has not gone anywhere, which the Bowl-Keepers will tell you is the point.',
  'Walker of the Measure. Seshat has written it in gold, which she says she reserves for Prize. I did not argue.',
]);

/**
 * Taleth's half of the Dividing, for his conversation (src/taleth.js `extraChoices`): the topic "The Dividing", which
 * src/taleth.js shows locked until this returns it. `context` carries `dividing`, `openDialogue`, `closeDialogue`
 * and, optionally, `onComplete` (his topics), `notify`, `onChange` (refresh and save) and `speaker(id)`, which
 * answers the standing figure for 'lizeem-seshat' and 'lizeem-nepri' so each says their own line; without it, the
 * lines are told in Taleth's box.
 */
export function talethDividingChoices(npc, context) {
  const { dividing = null, openDialogue, closeDialogue, onComplete = null, notify = null, onChange = null, speaker = null } = context;
  if (npc?.id !== TALETH.id || !dividing) return [];
  const back = onComplete ?? closeDialogue;
  const tell = lines => openDialogue(npc, [...lines], null, 'Back to Taleth', { noWayfinding: true, onComplete: back });
  if (dividing.held()) return [{ id: 'taleth-dividing', label: 'About the Dividing', action: () => tell(DIVIDING_AFTER) }];
  if (!dividing.ready()) return [];
  const stew = dividing.stage() === 'told' && dividing.carrying();
  return [{ id: 'taleth-dividing', label: stew ? 'Serve the fork stew and hold the Dividing' : 'The Dividing', action: () => {
    if (stew) return feast(npc, context);
    const first = dividing.tell();
    const taught = dividing.teach();
    if (!taught.ok) notify?.(taught.reason, 'TALETH TRIED TO TEACH YOU A RECIPE');
    else if (taught.learned.length) notify?.('You can make fork stew now, with floodwheat or with hard wheat.', 'TALETH TAUGHT YOU A RECIPE');
    if (first || taught.learned.length) onChange?.();
    tell(first ? DIVIDING_CHARGE : DIVIDING_WAITING);
  } }];

  /** The feast, as a run of dialogue: Taleth pours, Seshat and Nepri speak, the stew is served, and he closes. */
  function feast(taleth, ctx) {
    const result = dividing.hold();
    if (!result.ok) { notify?.(result.reason, 'THE DIVIDING'); return back(); }
    ctx.onChange?.();
    const voice = id => { try { return speaker?.(id) ?? null; } catch { return null; } };
    const seshat = voice('lizeem-seshat'), nepri = voice('lizeem-nepri');
    const parts = [
      [taleth, [...DIVIDING_POURING]],
      seshat ? [seshat, [DIVIDING_SESHAT]] : [taleth, [`Seshat lays the Measure open on the trestle. “${DIVIDING_SESHAT}”`]],
      nepri ? [nepri, [DIVIDING_NEPRI]] : [taleth, [`Nepri, at the end of the trestle: “${DIVIDING_NEPRI}”`]],
      [taleth, [...DIVIDING_FEAST]],
    ].reduce((runs, [who, lines]) => {
      const last = runs.at(-1);
      if (last && last[0] === who) last[1].push(...lines); else runs.push([who, [...lines]]);
      return runs;
    }, []);
    const play = i => {
      const [who, lines] = parts[i], end = i === parts.length - 1;
      openDialogue(who, lines, null, end ? 'Back to Taleth' : 'Go on', { noWayfinding: true, onComplete: end ? back : () => play(i + 1) });
    };
    play(0);
    notify?.(`${DIVIDING_TITLE}: the Guild has written your name in its ledger.`, 'THE DIVIDING');
  }
}

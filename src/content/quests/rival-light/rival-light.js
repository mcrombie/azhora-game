/**
 * The Elod Light, the woman who keeps it, and the thing Addison wants taken off her.
 *
 * Elod tells every delegation to the Svaleen Conclave the same sentence: *we observe the
 * measures and we keep our lighthouse* (src/content/characters/elod-people.js). The lighthouse is real. It
 * stands on the head south of the city, seventeen metres up, black basalt out of the same
 * cliff, taller than anything Ambron ever built on this coast, and it is the one thing the
 * closed country is openly proud of.
 *
 * The woman Elod pays to keep it is Addison's twin sister. Her name is Meg. She has not
 * answered to it in eleven years; she calls herself SUBTRACTIDAUGHTER, which she thinks is
 * funny and which is, and she has made everyone on that coast say it, including the Elodi,
 * who say it with a completely straight face because they are polite.
 *
 * She is a wrecker, and a sorceress, and very strong (the user, 26 September 2026). Her light is
 * the best on this sea because of one thing in its lantern, and it is not the glass: it is
 * **Sovik**, a fire spirit (loosely after Calcifer, in Howl's Moving Castle, the user's word) - a
 * flame the size of a cabbage with a face in it, bound to her lamp by a bargain she made before
 * she ever kept a light, who burns hotter than oil ever burned and throws it twenty miles. Twice
 * a year, on a night with weather in it, she shows him from the wrong place, a master corrects
 * onto him, and by morning there is a ship on the ledge.
 *
 * Addison wants him out of that lantern. Not the tower, not the woman: the fire.
 *
 * **The way in** (the user): East Suval is shut (src/world/travel/closed-border.js), so Addison gives the
 * traveler the key to an old smugglers' door through the limestone ridge where West Suval meets
 * East Suval (`SMUGGLERS_DOOR`), and the Elodi guard their side of it. **Anybody they see without
 * a passport, they attack** (`PASSPORT_ITEM`; nobody has been issued one since the gate shut).
 * At the light the traveler can go quietly - round behind the landward guard, in at the postern,
 * up the stair - and lift Sovik, who is **dangerous to touch** (`SOVIK.burn`); or fight: the two
 * guards, and Subtractidaughter out of her blockhouse with a grandfather clock in her hand that she
 * swings like a mace and casts Time Sorcery through (src/gameplay/combat/combat.js `timekeeper`; src/gameplay/magic/sorcery.js
 * `slow`). Either way the fire has to be **smuggled** back to Addison across a country that is
 * watching for exactly that, and he glows (`SOVIK.glow`).
 *
 * Pure: no DOM, no three. The tower is src/content/quests/lighthouse/lighthouse-world.js; the door and the fire are drawn by
 * src/content/quests/roadside/smugglers-door-world.js and src/world/actors/sovik-model.js; src/content/quests/rival-light/rival-light-host.js puts it in the world.
 */
import { SUVAL_RIDGE_EDGES } from '../../regions/minora-frontier/frontier-ridges.js';

const freeze = Object.freeze;
const point = (x, z) => freeze({ x, z });

/** The head south of Elod, beyond the breakwater: seventeen metres, sea on the north and east. */
export const RIVAL_HEAD = point(22, 712);
const at = (dx, dz) => point(RIVAL_HEAD.x + dx, RIVAL_HEAD.z + dz);

export const ELOD_LIGHT = freeze({
  id: 'elod-light', name: 'The Elod Light', region: 'East Suval',
  head: freeze({ ...RIVAL_HEAD }),
  /** Taller than Addison's by half again, and black. It is meant to be looked at. */
  tower: freeze({ ...at(0, 0), base: 3.6, top: 2.5, height: 16.8, gallery: 1.2, lantern: 3.2 }),
  /** No cottage: a blockhouse with one window and a door that bars from inside. */
  cottage: freeze({ ...at(-6.4, -3.8), width: 6.6, depth: 4.8, eaves: 2.3, ridge: 3.4, yaw: -0.22 }),
  /**
   * The wall is higher than a wall needs to be. It is open where the winch is, to the sea, and at
   * one narrow postern on the land side that the keeper uses and the guards do not watch (`postern`,
   * an arc of the wall in radians, the same measure as the winch's opening).
   */
  yard: freeze({ ...at(-2.2, -1.4), radius: 9.2, height: 2.1, openFrom: 1.15, openTo: 2.05, postern: freeze([-.2, .2]) }),
  store: freeze({ ...at(-9.4, 1.8), width: 3.8, depth: 3.2, height: 2.3 }),
  bell: freeze({ ...at(4.2, 3.2), height: 2.8 }),
  staff: freeze({ ...at(-1.6, 4.6), height: 6.8 }),
  gate: freeze({ ...at(6.8, 5.6) }),
  /** The derrick over the cliff edge, for bringing up what the sea leaves on the ledge. */
  winch: freeze({ ...at(7.4, 2.2), height: 4.6, reach: 3.2 }),
  /** Where the salvage stands about the yard, because there is more of it than she can sell. */
  salvage: freeze([at(-5.2, 2.6), at(-3.4, 3.4), at(3.2, -4.2), at(5.6, -2.4), at(-7.2, -0.6)]),
});
export const rivalPoint = at;

// ---------------------------------------------------------------------------
// Subtractidaughter
// ---------------------------------------------------------------------------

/** By day, and after: at the tower door, between whoever is coming and her fire. */
export const SUBTRACTIDAUGHTER_STAND = freeze({ ...at(-5.6, 1.9), yaw: 0.6 });
/** By night she is asleep behind the blockhouse door, and this is where she comes out of it. */
export const BLOCKHOUSE_DOOR = freeze({ ...at(-9, -.6), yaw: 1.35 });

// Addison's face, eleven years of a different life on it: the same dirty blonde, cut short and
// square, and black oilskins instead of a jersey. Never the traveler's own model. And in her hand,
// held by the neck of its case, a grandfather clock the length of her forearm (`clock`).
export const SUBTRACTIDAUGHTER = freeze({
  id: 'rival-keeper', name: 'Subtractidaughter', given: 'Meg',
  role: 'Keeper of the Elod Light',
  modelRole: 'rival-keeper', color: 0x24262b, skin: 0xd9ae83,
  look: freeze({ clock: true }),
  /** Her own strength wherever she stands (`ENEMY_KINDS.timekeeper`): the strongest single person on this coast. */
  health: 420,
});

// ---------------------------------------------------------------------------
// Sovik
// ---------------------------------------------------------------------------

/**
 * The fire. `burn` is what lifting him out of his dish costs the traveler, and it is never the whole
 * of anybody (the host leaves one); `glow` is how much farther a guard can see a traveler carrying
 * him, because a fire spirit in your arms at night is the brightest thing on the downs.
 */
export const SOVIK_ITEM = 'sovik';
export const SOVIK = freeze({
  id: 'sovik', name: 'Sovik', item: SOVIK_ITEM, burn: 30, glow: 1.5,
  look: 'A fire the size of a cabbage with a face in it: two white-hot eyes, and a mouth mostly made of teeth that are also flame. He is orange at the edges and blue in the middle, and he never sits still.',
});
/** Where a lantern's fire sits, above the ground at the tower: over the gallery, in the dish (src/content/quests/lighthouse/lighthouse-world.js). */
export const lanternHeight = tower => tower.height + .9 + .63 + tower.lantern / 2 - .45;
/** Where he burns: in the dish in the lantern, nineteen metres up. */
export const SOVIK_LANTERN = freeze({ ...at(0, 0), y: lanternHeight(ELOD_LIGHT.tower) });
/** Where the stair is offered: the step at the tower door, round the west side. */
export const TOWER_STEP = freeze({ ...at(-5.5, 1.2), yaw: -1.35 });

// ---------------------------------------------------------------------------
// The way in: Addison's key, the smugglers' door, and the guards
// ---------------------------------------------------------------------------

export const KEY_ITEM = 'smugglers-key';
/** What would let the traveler be seen in East Suval and not attacked. Nobody issues them. */
export const PASSPORT_ITEM = 'elodi-passport';

/**
 * **The smugglers' door** (the user: "Addison will give you a key to get by a secret passage").
 * It goes through the limestone ridge at the stretch of the border nearest her light
 * (src/content/regions/minora-frontier/frontier-ridges.js), four hundred metres east of her yard: an iron door set low in the rock
 * on the West Suval side, and a hatch among the stones on the other. `west` and `east` are where
 * the traveler stands to use it; `door` and `hatch` where the iron is.
 */
export const SMUGGLERS_DOOR = (() => {
  const edge = SUVAL_RIDGE_EDGES.find(entry => entry.id === 'elodi-ridge-26');
  const mid = { x: (edge.a.x + edge.b.x) / 2, z: (edge.a.z + edge.b.z) / 2 }, n = edge.inward;
  const off = d => point(mid.x + n.x * d, mid.z + n.z * d);
  const outward = Math.atan2(-n.x, -n.z), inward = Math.atan2(n.x, n.z);
  return freeze({ id: 'smugglers-door', name: 'The smugglers’ door', edge: edge.id,
    // The ridge's rocks show their faces about seven metres out from the border at the ground
    // (src/content/regions/minora-frontier/frontier-ridge-works.js), well beyond what stops a traveler: the iron is set in that face.
    west: freeze({ ...off(-9), yaw: outward }), east: freeze({ ...off(9), yaw: inward }),
    door: freeze({ ...off(-7.2), yaw: outward }), hatch: freeze({ ...off(7.2), yaw: inward }), reach: 2.6 });
})();

/**
 * **The two who keep her yard at night.** One at the gap by the winch, looking out to sea, where a
 * wrecker's trouble comes from; one on the land side, looking out over the downs towards the ridge,
 * where anybody who has come over it without papers would come from. Neither looks at the postern.
 */
export const LIGHT_GUARDS = freeze([
  freeze({ id: 'elod-light-guard-gap', name: 'Elodi guard', role: 'Keeps the gap in the Elod Light’s wall', ...at(8.6, -6.2), yaw: 2.36 }),
  freeze({ id: 'elod-light-guard-land', name: 'Elodi guard', role: 'Watches the downs from the Elod Light', ...at(-14, 6), yaw: -0.96 }),
]);

/**
 * **The quiet way**, laid on the built world (tests/rival-light-world.test.js walks it): east from
 * Addison's gate along the downs to the door; from the hatch across East Suval, swinging south of
 * the landward guard's sight, to the postern; through the yard to the tower step. `ROUTE_OUT` is
 * the same ground the other way.
 */
export const ROUTE_TO_DOOR = freeze([point(-631, 882), point(-267, 885), point(SMUGGLERS_DOOR.west.x, SMUGGLERS_DOOR.west.z)]);
export const ROUTE_IN = freeze([point(SMUGGLERS_DOOR.east.x, SMUGGLERS_DOOR.east.z), point(-185, 893), point(-181, 889), point(-175, 889),
  point(-43, 757), point(-10, 752), point(15, 740), at(-1, 14), at(-1.4, 9), at(-1.6, 6.4), at(-3.4, 4), at(TOWER_STEP.x - RIVAL_HEAD.x, TOWER_STEP.z - RIVAL_HEAD.z)]);
export const ROUTE_OUT = freeze([...ROUTE_IN].reverse());

/**
 * **The watch's rule** (the user, 26 September 2026): the guards attack anybody they see who has no
 * passport. Inside East Suval that is everybody; outside it the Elodi are not the traveler's problem.
 */
export const watchesTraveler = ({ inside = false, passport = false } = {}) => inside && !passport;

/**
 * **A fight laid out round whoever is in it.** The combat's arena is a box along one axis
 * (src/gameplay/combat/combat.js `encounterConfig`): every enemy within twelve metres of the centre across it and
 * between twenty-one behind and eighteen ahead along it, and a retreat line on the traveler's side.
 * This finds the axis and side that fit the people actually standing there, with the traveler's way
 * out the way he is facing from the fight.
 */
export function arenaAround(traveler, people) {
  const options = [];
  for (const axis of ['x', 'z']) for (const sign of [1, -1]) {
    const across = axis === 'x' ? 'z' : 'x';
    // Across the arena: the middle of the enemies, and they must all fit in its width.
    const sides = people.map(p => p[across]), low = Math.min(...sides), high = Math.max(...sides);
    if (high - low > 22) continue;
    // Along it, measured the way the retreat runs: the centre may sit anywhere that keeps every
    // enemy between twenty behind it and seventeen ahead, and it sits as near the traveler as that allows.
    const ahead = people.map(p => sign * p[axis]), travelerAhead = sign * traveler[axis];
    const from = Math.max(...ahead) - 17, to = Math.min(...ahead) + 20;
    if (from > to) continue;
    const middle = Math.min(to, Math.max(from, travelerAhead));
    const line = Math.max(travelerAhead, ...ahead) + 8;
    const centre = axis === 'x' ? point(sign * middle, (low + high) / 2) : point((low + high) / 2, sign * middle);
    if (Math.hypot(traveler.x - centre.x, traveler.z - centre.z) > 38) continue;
    // The traveler's own side is ahead: his way out is past himself, never through them.
    options.push({ axis, sign, centre, line: sign * line, lead: travelerAhead - Math.max(...ahead) });
  }
  if (!options.length) return null;
  const best = options.sort((a, b) => b.lead - a.lead)[0];
  const checkpoint = best.axis === 'x' ? point(best.line - best.sign * 3, traveler.z) : point(traveler.x, best.line - best.sign * 3);
  return freeze({ center: best.centre, checkpoint, retreatAxis: best.axis, retreatLine: best.line, ...(best.sign < 0 ? { retreatSign: -1 } : {}) });
}

/** The Elodi guard's fighting numbers: a spear, a small shield, and East Suval's own level (the fight authors none). */
const GUARD_FIGHT = freeze({ kind: 'rebel', hp: 120 });
export const WATCH_FIGHT_ID = 'elodi-watch';
export const LIGHT_FIGHT_ID = 'elod-light-fight';
/**
 * The encounter when the watch has seen the traveler. `guards` are the ones near enough to come
 * (their world ids; each fights as himself, `npcId`); `rival` brings Subtractidaughter out of her
 * blockhouse, a few seconds behind them, with her clock. She yields rather than dies.
 */
export function watchFight({ traveler, guards = [], rival = null }) {
  const enemies = guards.map(guard => ({ id: `${guard.id}-fight`, npcId: guard.id, name: guard.name ?? 'Elodi guard',
    kind: GUARD_FIGHT.kind, hp: GUARD_FIGHT.hp, x: guard.x, z: guard.z, model: { role: 'elodi-guard' } }));
  if (rival) enemies.push({ id: 'subtractidaughter-fight', npcId: SUBTRACTIDAUGHTER.id, name: SUBTRACTIDAUGHTER.name,
    kind: 'timekeeper', hp: SUBTRACTIDAUGHTER.health, x: rival.x, z: rival.z, entry: 2.5, yields: true,
    model: { role: SUBTRACTIDAUGHTER.modelRole, tunic: SUBTRACTIDAUGHTER.color, skin: SUBTRACTIDAUGHTER.skin, look: { ...SUBTRACTIDAUGHTER.look } } });
  if (!enemies.length) return null;
  const arena = arenaAround(traveler, enemies);
  if (!arena) return null;
  return { id: rival ? LIGHT_FIGHT_ID : WATCH_FIGHT_ID, ...arena, enemies };
}

// ---------------------------------------------------------------------------
// The quest
// ---------------------------------------------------------------------------

export const HEIST_VERSION = 2;
/**
 * 'unknown' (Addison has not said); 'told' (the traveler knows what her sister does); 'asked' (they
 * have agreed, and have her key); 'taken' (Sovik is out of the lantern and in their arms); 'home'
 * (he is at the Suval Light, and nothing is decided); 'done' (Addison has let the traveler decide).
 * `alarm` is whether the Elod Light was ever roused; `way` how he came out of it: 'quiet' or 'fought'.
 */
export const HEIST_STAGES = freeze(['unknown', 'told', 'asked', 'taken', 'home', 'done']);
/** What becomes of a fire spirit nobody has asked. */
export const HEIST_ENDINGS = freeze({
  keep: freeze({ id: 'keep', name: 'Put him in the Suval Light',
    outcome: 'He goes up her stair in an iron coal-scuttle, complaining at every turn of it, and into the dish over her eleven wicks, and from the first night her light reaches places it has never reached and every master on this coast notices. He says the lamp is small and the oil is cheap and the view is worse. He has not once asked to leave.' }),
  conclave: freeze({ id: 'conclave', name: 'Give him to the Svaleen Conclave',
    outcome: 'He goes to the Conclave in an iron box, with the wreck book and a statement in Addison’s hand, and the Conclave does what bodies like that do: it takes nine months and never once uses the word wrecker, and at the end of it the Elod Light has a new keeper, Sovik goes back into the lantern he was made for on terms that are written down this time, and a woman who is not named in any of the papers is living quietly somewhere on the Peblos coast.' }),
  free: freeze({ id: 'free', name: 'Let him go',
    outcome: 'Addison takes him to the top of her own tower and opens the lantern and holds the scuttle out into the wind, and Sovik goes up out of it like a spark off a bonfire, and up, and is a star for a minute over the Suval hills, and is nothing. “Well,” she says. “Nobody will ever steer on him again.” The Elod Light burns oil now and reaches four miles, and so does hers, which she says is all a coast was ever owed.' }),
});
export const HEIST_ENDING_IDS = freeze(Object.keys(HEIST_ENDINGS));

/** The first saves had a boat and a lens. They keep their place: ashore is asked, the lens is Sovik. */
function upgrade(data) {
  if (!data || typeof data !== 'object' || data.version !== 1) return data;
  const stage = { unknown: 'unknown', told: 'told', asked: 'asked', landed: 'asked', met: 'asked', taken: 'taken', home: 'home', done: 'done' }[data.stage];
  if (!stage || typeof data.spoke !== 'boolean') return null;
  const ending = data.ending === 'sea' ? 'free' : data.ending;
  return { version: 2, stage, spoke: data.spoke, alarm: false, way: ['taken', 'home', 'done'].includes(stage) ? 'quiet' : null, ending };
}

export function validateHeistSnapshot(saved, { allowMissing = true } = {}) {
  if (saved === undefined) return allowMissing;
  const data = upgrade(saved);
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.version !== HEIST_VERSION) return false;
  if (!HEIST_STAGES.includes(data.stage) || typeof data.spoke !== 'boolean' || typeof data.alarm !== 'boolean') return false;
  if (data.way !== null && !['quiet', 'fought'].includes(data.way)) return false;
  if ((data.way === null) !== !['taken', 'home', 'done'].includes(data.stage)) return false;
  if (data.ending !== null && !HEIST_ENDING_IDS.includes(data.ending)) return false;
  return (data.ending === null) === (data.stage !== 'done');
}

export function createHeist({ onEvent = () => {} } = {}) {
  const state = { stage: 'unknown', spoke: false, alarm: false, way: null, ending: null };
  const at_ = (...stages) => stages.includes(state.stage);

  /** Addison says what her sister is, which she has not said out loud to anybody in six winters. */
  function tell() {
    if (!at_('unknown')) return { ok: false };
    state.stage = 'told';
    onEvent({ type: 'sister-told' });
    return { ok: true };
  }
  /** The traveler agrees to go through the ridge and bring the fire back; she gives them the key. */
  function accept(inventory = null) {
    if (!at_('told')) return { ok: false };
    state.stage = 'asked';
    inventory?.grant?.(KEY_ITEM);
    onEvent({ type: 'heist-accepted' });
    return { ok: true };
  }
  /** The light has been roused: the watch saw the traveler anywhere near it and came. */
  function rouse() {
    if (!at_('asked', 'taken') || state.alarm) return false;
    state.alarm = true;
    onEvent({ type: 'light-roused' });
    return true;
  }
  /** She was spoken to. */
  function meet() { const first = !state.spoke; state.spoke = true; return { first }; }
  /** Sovik comes out of his dish, into bare hands, burning. */
  function take(inventory = null) {
    if (!at_('asked')) return { ok: false };
    state.stage = 'taken';
    state.way = state.alarm ? 'fought' : 'quiet';
    inventory?.grant?.(SOVIK_ITEM);
    onEvent({ type: 'sovik-taken', way: state.way });
    return { ok: true, way: state.way, burn: SOVIK.burn };
  }
  /** Back at the Suval Light with him. He goes out of the traveler's arms and into her scuttle. */
  function deliver(inventory = null) {
    if (!at_('taken')) return { ok: false };
    state.stage = 'home';
    inventory?.remove?.(SOVIK_ITEM, 1);
    onEvent({ type: 'sovik-home' });
    return { ok: true };
  }
  /** And what she does with him, which she leaves to the traveler. */
  function finish(ending) {
    if (!at_('home') || !HEIST_ENDINGS[ending]) return { ok: false };
    state.stage = 'done';
    state.ending = ending;
    onEvent({ type: 'heist-finished', ending });
    return { ok: true, outcome: HEIST_ENDINGS[ending] };
  }

  function task() {
    if (at_('told')) return { title: 'Her sister', detail: 'Addison has told you what the Elod Light is for. She has not asked you for anything yet, and she is working up to it.' };
    if (at_('asked')) return { title: 'The fire in the Elod Light', detail: 'Addison’s key opens the smugglers’ door in the ridge east of her light. Across it, the Elodi attack anybody they see without papers. Her sister’s fire spirit, Sovik, burns in the lantern at the top of the Elod Light. Bring him to Addison.' };
    if (at_('taken')) return { title: 'The fire in the Elod Light', detail: 'Sovik is in your arms, burning, and he glows: the Elodi will see you farther off. Back through the smugglers’ door and along the downs to Addison.' };
    if (at_('home')) return { title: 'The fire in the Elod Light', detail: 'Sovik is at the Suval Light in an iron scuttle. Addison will not decide what happens to him. She says it is yours to decide, which is the most annoying thing she has ever done.' };
    return null;
  }

  const snapshot = () => ({ version: HEIST_VERSION, stage: state.stage, spoke: state.spoke, alarm: state.alarm, way: state.way, ending: state.ending });
  function restore(saved) {
    Object.assign(state, { stage: 'unknown', spoke: false, alarm: false, way: null, ending: null });
    if (!validateHeistSnapshot(saved, { allowMissing: false })) return false;
    const data = upgrade(saved);
    Object.assign(state, { stage: data.stage, spoke: data.spoke, alarm: data.alarm, way: data.way, ending: data.ending });
    return true;
  }

  return { tell, accept, rouse, meet, take, deliver, finish, task, snapshot, restore,
    get stage() { return state.stage; }, get ending() { return state.ending; }, get spoke() { return state.spoke; },
    get alarm() { return state.alarm; }, get way() { return state.way; },
    get carrying() { return at_('taken'); }, get errand() { return at_('asked', 'taken'); } };
}

// ---------------------------------------------------------------------------
// What Addison says about her sister
// ---------------------------------------------------------------------------

/** The first time she says it out loud, which is harder for her than the sailing. */
export const SISTER_TOLD = freeze([
  'She puts the line down, which she has not done once while you have been talking to her.',
  '"There is a light on the other side of the ridge. East Suval, the head south of Elod, seventeen metres up and black. It is the best light on this sea and I am not being modest about mine when I say that."',
  '"The woman who keeps it is my sister. Twin. Her name is Meg. She has not answered to it in eleven years — she calls herself Subtractidaughter, out loud, to people, and she has got the Elodi saying it, which if you knew the Elodi is the single most impressive thing she has ever done."',
  '"I am going to say the rest of it plainly because if I go carefully I will not get it out. Twice a year, in weather, she takes her light and she shows it from the wrong place. A master out there corrects onto it. In the morning there is a ship on the ledge and everything that floats off it belongs to whoever is on the tideline."',
  '"You have read the book. The trader with no name that went past me in the dark under full sail, six winters ago, and was never heard of after? It went past me because it was steering on her."',
]);

/** Why she has never done anything about it, and what she wants done now. */
export const SISTER_WHY = freeze([
  '"Why have I not said? I have said. I said it to the harbourman, and to a Conclave clerk, and once, stupidly, in a letter. It is my word against a woman with my face who keeps a public light for a country that does not let anybody in to look at it. Every single time it comes back the same: sisters fall out."',
  '"And she is careful. She does it twice a year and never in the same month, and the rest of the time she keeps the best light on this coast and everybody who sails past blesses her for it. That is the horrible part. Most nights she is saving people."',
  '"So: not the tower, not her. The fire."',
  '"People think the power of a light is the glass. I thought so myself, for eleven years, looking at hers across the water. It is not the glass. Hers is not a flame at all. It is a fire spirit — Sovik, she calls him — that she made some bargain with before she ever kept a light, and he sits in her lantern and burns hotter than oil ever burned and throws it twenty miles. There is one of him. There will not be another."',
  '"Take him off her and she has a lamp like everybody else, and a lamp cannot reach far enough to move anybody. The wrecking stops that night. Nobody has to be believed, and nobody has to be hanged, and my sister gets to keep being a woman who keeps a light."',
]);

/** The arrangement: a key, a door, and what is on the other side of it. */
export const CROSSING_PLAN = freeze([
  '"East Suval is shut, and I am not rowing you round the point under her nose. There is an older way. When Meg and I were girls there was a smugglers’ door through the limestone east of here, where the ridge runs between the two countries, and our father had the key to it."',
  'She takes a key off a nail inside the cottage door: iron, black, as long as your hand, on a tarred cord. "I have had it since he died. Walk east along the downs until the ridge stops you. The door is set low in the rock on this side, and nobody has oiled it since the gate shut."',
  '"The Elodi guard that side like it owes them money. If they see you without papers — and you have no papers; nobody has been given papers since the gate shut — they will not ask you twice. Keep out of their sight."',
  '"Her light is on the head south of Elod. Two of them keep her yard at night: one at the gap by the winch, watching the sea, one on the land side, watching the downs. There is a postern in the wall on the land side, behind him, that she uses and they do not watch. She sleeps in the blockhouse and she sleeps like the dead. That is the one thing about her that has not changed."',
  '"If she wakes, do not fight her. She is stronger than you, and she carries a clock, and do not ask me about the clock. And the fire: do not touch him if you can help it. You cannot help it. Bring him to me."',
]);

/** Talking to her about him afterward, before it is decided. */
export const ADDISON_AFTER = freeze([
  'Sovik sits in the iron scuttle on her table and looks at her, and she looks at him, for a long time. “So this is the sister,” he says. “Same face. Worse lamp.”',
  '"Eleven years I have looked at that light across the water and thought it was the glass." She does not touch him. "No. I am not deciding. I have decided about my sister every night for six winters and I am done with it. You carried him; you say."',
]);

// ---------------------------------------------------------------------------
// Sovik
// ---------------------------------------------------------------------------

/** At the top of the stair: what is in the lantern, and what he has to say about being stolen. */
export const SOVIK_MET = freeze([
  'Two hundred and forty steps in the dark, and at the top of them the lantern, and in the lantern, in an iron dish where the oil should be, a fire the size of a cabbage with a face in it.',
  'It looks at you. It has two white-hot eyes and a mouth that is mostly teeth, and the teeth are flame too. “Oh, good,” it says. “A burglar. Do you know how long it has been since anybody interesting came up those stairs?”',
  '“Sovik. I keep this light. She keeps me. We have an arrangement, which is to say she has a bucket of seawater and a very long memory, and I have not been outside this glass in eleven years.”',
  '“You want to carry me out of here? Wonderful. Marvellous. I should warn you that I am hot. Not hot like a stove. Hot like the inside of the sun on a bad day. Pick me up anyway, and hold on, and I will try not to.”',
]);
/** The lifting of him. The burn is the host's; this is what it is like. */
export const SOVIK_TAKEN = freeze([
  'It is like picking up a live coal the size of your head, because that is what it is. Your hands blister before you have got him clear of the dish, and he says “sorry, sorry, sorry” the whole way down the stair and does not stop being hot at all.',
  '“Down, out, and not the way you came in,” he says. “And keep me under your coat. I glow. I cannot help that either.”',
]);
/** Taken with nobody the wiser. */
export const RIVAL_UNSEEN = freeze([
  'Nobody comes. The blockhouse door stays barred, and the guard on the land side goes on looking at the downs, and the one at the gap goes on looking at the sea.',
  'At the postern, when you look back, the lantern at the top of the tower is dark for the first time in eleven years, and there is somebody standing at the gallery rail with no lamp, watching you go.',
]);

// ---------------------------------------------------------------------------
// Subtractidaughter, awake
// ---------------------------------------------------------------------------

/** What she shouts coming out of the blockhouse, which the host shows as she comes. */
export const RIVAL_WAKES = 'The blockhouse door bangs open and Subtractidaughter comes out with a grandfather clock in one hand, held by the neck of its case like a club, and it is ticking, loudly, and faster than a clock should.';
/** And what the watch shouts, seeing somebody where nobody may be. */
export const WATCH_ALARM = 'An Elodi guard’s spear comes level. “Papers!” Nobody has papers. He does not ask twice.';
/** On her knees, the clock across them, its pendulum still going. */
export const RIVAL_YIELDS = freeze([
  'She goes down on one knee with the clock across her lap and its pendulum still swinging, and holds up her free hand.',
  '“Enough,” she says. “Take him, then. He never liked me.” And, as you go past her to the stair: “Tell my sister the Marrow Girl was not me. I was nineteen and asleep in the next room, and she has never once asked.”',
]);

/** She comes out of the door before the traveler is halfway across the yard. */
export const RIVAL_FIRST = freeze([
  'She stands at the tower door with the clock hanging from one hand, and looks at you the way somebody looks who wants to see you and not be seen.',
  'It is Addison. It is not: it is Addison with eleven years of somebody else on her, hair cut square at the jaw, black oilskins, and a way of standing that is entirely still. The clock in her hand is ticking.',
  '"Well," she says, pleasantly. "You came through the ridge, which means somebody gave you our father’s key, which means my sister. How is she? She will not have asked."',
  '"Subtractidaughter. Say it properly, everybody does. She named herself Addison — Addi-son, our mother thought it was clever and it is — so when I stopped being what she was, I took the other one. I have never once regretted it. It is a tremendous name."',
]);

/** She knows exactly why you are there and makes the case anyway. */
export const RIVAL_CASE = freeze([
  '"You are here for Sovik. Of course you are. She has wanted him since she found out what he was, and she has never once come to ask me for him herself."',
  '"Let me put the whole thing to you honestly, because she will have put half of it. Ships come up this coast whether or not I am here. The ledge is there whether or not I am here. In a bad year this sea takes nine of them and gives them to nobody, and what comes ashore rots on a beach in a country that has shut its gate and has no money."',
  '"Twice a year I choose which one. Once. In weather, out of a season, from a ship that is insured in Ambron by men who will not miss it, and everything off it goes into a town that cannot buy grain. Now tell me you have never once decided that some people matter more than other people."',
  '"And the other three hundred and sixty-three nights I keep the best light on this water and nobody dies on my ledge. We are the same, she and I. The only difference is that she has never had to choose, and thinks that makes her better."',
]);

/** Afterward. She is unbothered, which is worse. */
export const RIVAL_AFTER = freeze([
  '"You again. There is a lamp up there now and it reaches about four miles, and I sit and watch it not reach anybody."',
  '"No, I am not coming for him. What would I do, come through the ridge and knock? She would give him back, that is the maddening thing. She would give him back and be gracious and I would have to live with that."',
  '"The clock? It keeps good time. Better than good. It is the only thing I own that I did not take off a beach, and no, you may not hold it."',
]);

/**
 * Subtractidaughter's conversation, when she is awake and standing there to have one. She does not
 * start fights in conversation; the watch starts them (src/content/quests/rival-light/rival-light-host.js).
 */
export function rivalConversation(npc, context) {
  const { heist, openDialogue, closeDialogue, visits = 0 } = context;
  if (npc?.id !== SUBTRACTIDAUGHTER.id) return false;
  const again = () => rivalConversation(npc, { ...context, visits: visits + 1 });
  const leave = { id: 'leave-rival', label: 'Say nothing.', action: closeDialogue };
  if (!heist.spoke) {
    heist.meet();
    openDialogue(npc, [...RIVAL_FIRST], null, 'Stand there', { choices: [
      { id: 'rival-case', label: 'I am here for Sovik.', action: () => openDialogue(npc, [...RIVAL_CASE], null, 'Back to her', { onComplete: again }) },
      leave,
    ] });
    return true;
  }
  if (heist.errand) {
    openDialogue(npc, ['"Still here. The stair is where it was, and so am I."'], null, 'Back to her', { choices: [
      { id: 'rival-case-again', label: 'Say that again about choosing.', action: () => openDialogue(npc, [...RIVAL_CASE], null, 'Back to her', { onComplete: again }) },
      leave,
    ] });
    return true;
  }
  openDialogue(npc, [RIVAL_AFTER[visits % RIVAL_AFTER.length]], null, 'Back to the head', { choices: [leave] });
  return true;
}

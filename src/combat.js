import { canStand, moveCharacter } from './game-state.js';
import { BODY, bodyWorld } from './bodies.js';
import { countryHealth, countryDamage, COUNTRY, allyHealthScale, allyDamageScale, maxHealth, TOP_LEVEL } from './combat-skills.js';
import { BOW, drawnBy, groundAt, inTheLine, shotAt, solidAt, survives } from './archery.js';
import { meleeContacts, meleeLineClear } from './melee-contact.js';
import { castWith } from './sorcery.js';

const TAU = Math.PI * 2;
const SWINGS = [
  { duration: .50, contact: .19, damage: 24, reach: 2.35 },
  { duration: .57, contact: .22, damage: 26, reach: 2.45 },
  { duration: .68, contact: .29, damage: 34, reach: 2.65 },
];
const DODGE_DURATION = .56;
const DODGE_TRAVEL_TIME = .40;
const DODGE_DISTANCE = 3.05;
const ENEMY_TELL = .94;
const ENEMY_ATTACK = .62;
const ENEMY_CONTACT = .27;
const ENEMY_RECOVERY = 1.35;
// Each enemy kind has its own pace. Goblins keep the original timings; wolves
// close faster, bite sooner and hit a little lighter.
export const ENEMY_KINDS = Object.freeze({
  goblin: Object.freeze({ tell: ENEMY_TELL, attack: ENEMY_ATTACK, contact: ENEMY_CONTACT, recovery: ENEMY_RECOVERY, damage: 17, speed: 1.8, engage: 2.12, reach: 2.15, lunge: 1.3 }),
  wolf: Object.freeze({ tell: .7, attack: .5, contact: .2, recovery: 1.05, damage: 14, speed: 2.9, engage: 2.35, reach: 2.4, lunge: 3.2 }),
  // A trained man with a blade and a shield, and nothing like a goblin. Four optional fields make the
  // difference, and every other kind goes on ignoring them:
  //   `guard`  idle and facing the blow, he turns that much of it on his shield;
  //            trained soldiers can cover their recovery, but a swing or recoil opens them;
  //   `armor`  mail takes that much off every blow that does land;
  //   `poise`  once his swing has begun, a hit does not stop it: trade blows and he trades back;
  //   `pack`   how many of them may be swinging at once: soldiers press together, goblins take turns.
  soldier: Object.freeze({ tell: .7, attack: .5, contact: .22, recovery: 1.0, damage: 24, speed: 2.35, engage: 2.15, reach: 2.25, lunge: 1.7,
    guard: .8, armor: .2, poise: true, pack: 2 }),
  officer: Object.freeze({ tell: .7, attack: .5, contact: .22, recovery: 1.0, damage: 32, speed: 2.5, engage: 2.15, reach: 2.25, lunge: 1.7,
    guard: .85, armor: .3, poise: true, pack: 2 }),
  // A friend standing up with you: sparring (docs/combat-brief.md, phase 7). He is a trained man
  // and fights like one, and the only things he does differently are that he pulls the blow and
  // that the encounter he stands in is a `bout` - nobody dies in one, on either side. His tell is
  // as long and as honest as anybody's, because **timing never scales** and a lesson least of all.
  sparring: Object.freeze({ tell: .7, attack: .5, contact: .22, recovery: 1.15, damage: 12, speed: 2.3, engage: 2.15, reach: 2.25, lunge: 1.5,
    guard: .5, pack: 1 }),
  // The rebels who lie up on the road out of Drent (src/road-ambush.js). Farmers, drovers and
  // market families who lost a battle at the Lauvel ten days ago and kept their swords.
  //
  // **`poise` is what makes this fight a fight**, and it is not the soldier's discipline: it is
  // that a man who has decided to kill you swings through a cut instead of flinching out of it.
  // Measured, 200 runs a setting against a dodging player: without it a traveler who simply keeps
  // swinging interrupts every windup and finishes all three untouched, at a hundred of a hundred
  // health. With it he finishes at forty, and twenty on a bad one, and a player slower than the
  // model dies. With somebody at his shoulder he finishes at eighty, because an enemy swings at
  // whoever is nearest and a friend halves what is coming at him (`enemyTarget`).
  //
  // They still have none of the army's answers - no shield to turn a blade, no mail to take the
  // edge off, and two of them at a time, not the soldiers' pressing three. The hundred and twenty
  // is raw: a soldier's hundred sits behind four fifths turned on a shield and a fifth of armour,
  // which is far more man to get through than this.
  rebel: Object.freeze({ tell: .72, attack: .5, contact: .22, recovery: 1.08, damage: 20, speed: 2.2,
    engage: 2.15, reach: 2.2, lunge: 1.5, poise: true, pack: 2 }),
  // **The giant spider in the thorns north-west of Nothom** (src/spider-quest.js). One creature
  // the size of a cart, built on Mallec's shape rather than on a goblin's: it hits hard, it can
  // be read a long way off, and a hit does not stop it - so there is no free second, and trading
  // blows with it is how Ben dies. It leaps, and a long lunge is what makes backing straight up
  // useless; you go sideways or you are under it. Harder than the rebels on the Drent road and a
  // long way short of the border battle, which is the user's own ruling of 22 September 2026.
  spider: Object.freeze({ tell: 1.0, attack: .46, contact: .22, recovery: 1.2, damage: 30, speed: 2.5,
    engage: 2.9, reach: 3.0, lunge: 6.4, arc: Math.PI * .34, stagger: false, pack: 1 }),
  // Mallec, the ogre on the Amod road (src/amod-ogre.js): a different order of
  // creature, not a large goblin. Three optional fields carry the difference and
  // every other kind goes on ignoring them:
  //   `arc`      how wide the strike lands, so backing straight up is not a defence
  //              and a dodge has to go sideways and be timed;
  //   `standoff` how far out he stops, so his bulk stays out of the traveler's lap;
  //   `stagger`  false, so a hit does not interrupt him. That is the single biggest
  //              change from every fight in the game so far: there is no free second
  //              bought with a swing, and the fight is lost to greed rather than to
  //              surprise. The long tell keeps him readable while it does it.
  // Half the size he was (src/characters.js `createOgre`), so the distances that describe his
  // size came down with him: his reach is now an arm and a beam rather than a giant's span.
  // The lunge went the other way. Backing straight up must not be a defence against him
  // (tests/amod-ogre.test.js), and a lighter ogre buys that by throwing himself further
  // instead of by standing further away. The timing is untouched: slow to start, slow to stop.
  ogre: Object.freeze({ tell: 1.18, attack: .44, contact: .2, recovery: 1.3, damage: 52, speed: 1.45, engage: 3.3, reach: 3.7, lunge: 8.6,
    arc: Math.PI * .4, aimLock: .55, standoff: 2.2, stagger: false, knockback: .2,
    /**
     * **A big slow creature charges** (the user, 2026-09-21). Kept out of reach for a few
     * seconds, it makes one short fast rush with a tell as clear as its own swing, which a step
     * aside beats. It keeps Mallec a timing fight instead of a creature you can simply walk
     * away from: his `speed` is 1.45 and a man walks backwards at 4.2, so without this a bow
     * took him 24 times in 24 without a blow landing (docs/known-issues.md, round 5).
     *
     * **It is a kind's property, not Mallec's**, so the next slow heavy thing gets it by
     * writing these numbers and nothing else. Every field is its own, because a charge is not
     * the creature's swing done faster:
     *   `from`     how far out the target counts as out of reach. Comfortably past `engage`, so
     *              a step back inside a melee is not a charge;
     *   `after`    how long it must stay there, unbroken. A dodge that opens the gap for half a
     *              second is not staying away;
     *   `tell`     the telegraph, which is the whole of the counter. `aimLock` still applies,
     *              so he follows a dodge thrown early and is beaten by one thrown late;
     *   `arc`      **narrow**, because the counter is a step aside. His swing takes seventy-two
     *              degrees; a rush in a straight line takes twenty-nine, and three metres of
     *              sidestep at the far end of it is outside that;
     *   `speed`    fast enough to catch a man who runs rather than steps aside, which is what
     *              makes it worth telegraphing at all.
     */
    charge: Object.freeze({ from: 5, after: 2.2, tell: .8, attack: .95, contact: .6, speed: 14,
      reach: 4.2, arc: Math.PI * .16, recovery: 1.8 }),
  }),
});
const SOLDIER_LOOKS = Object.freeze(['coalition', 'legion']);
const ALLY_FIREBALL = castWith('fireball', { weapon: 'wand' });
// Allied soldiers who fight beside the traveler. Officers hit harder and last longer.
/**
 * `level` is the kind's own, and today's numbers are that kind at level 1 - so nothing in Drent
 * and nothing at the border battle moves. A side's soldiers get better as the story does by
 * raising these, not by standing on harder ground: the country scales its dangers, never your
 * side (src/combat-skills.js).
 */
const ALLY_KINDS = Object.freeze({
  legionary: Object.freeze({ tell: .55, attack: .5, contact: .22, recovery: 1.9, damage: 18, speed: 2.1, engage: 1.95, reach: 2.2, hp: 90, level: 1 }),
  officer: Object.freeze({ tell: .5, attack: .48, contact: .2, recovery: 1.7, damage: 22, speed: 2.2, engage: 1.95, reach: 2.2, hp: 110, level: 1 }),
  /**
   * **Jerry** (src/archery.js). An ally with `bow` does not close: he stands off at thirty paces,
   * draws, and looses at whatever is nearest. His draw is his tell, and it is long, because
   * "thirty paces, one arrow, and then I do not have to think about it any more" is a slow thing
   * done once rather than a fast thing done often. He has no enemy counterpart: there are no
   * enemy archers yet, by the coordinator's ruling.
   */
  archer: Object.freeze({ tell: 1.05, attack: .3, contact: .12, recovery: 1.5, damage: 24, speed: 2.2,
    engage: 22, reach: 34, hp: 90, level: 1, bow: true, standoff: 9 }),
  sorcerer: Object.freeze({ tell: ALLY_FIREBALL.cast, attack: .35, contact: .08, recovery: 1.6,
    damage: ALLY_FIREBALL.damage, speed: 2.2, engage: ALLY_FIREBALL.range, reach: ALLY_FIREBALL.range,
    hp: 78, level: 1, spell: 'fireball', standoff: 7 }),
  // Villagers caught in a fight (src/bystanders.js). One who has a tool to hand fights, slower and
  // lighter than a soldier. One who has not freezes, then runs for its refuge, burdened, a little
  // slower than a goblin: without help it is caught.
  villager: Object.freeze({ tell: .62, attack: .5, contact: .22, recovery: 2.1, damage: 13, speed: 2.2, engage: 1.95, reach: 2.1, hp: 60, level: 1 }),
  bystander: Object.freeze({ flees: true, freeze: 7, speed: 1.3, hp: 45, level: 1 }),
});
/**
 * How many may stand with the traveler in one fight: the whole company, plus the largest side an
 * encounter authors, and room over.
 *
 * It was six, which was right when the only allies were the ones an encounter wrote down. Then
 * `getAllies` began adding whoever walks with the traveler to that list, and the cap counted the
 * sum: the border battle authors four, so the **third** companion made the encounter invalid and
 * `startEncounter` returned false. The border's caller answers a refusal by telling the traveler
 * to go and stand where he is already standing, so with three or more companions the main arc
 * could not be finished at all.
 *
 * Nothing may hand `encounterConfig` more than this - `companionAllies` in src/main.js takes only
 * the room that is left, and the rest hold - so the cap is a bound on work and never a reason a
 * fight does not happen.
 */
export const MAX_ALLIES = 16;

const DEFAULT_ENCOUNTER = Object.freeze({
  id: 'tidehaven-raiders', center: Object.freeze({ x: 0, z: -36 }),
  checkpoint: Object.freeze({ x: 0, z: -25 }), retreatZ: -16,
  enemies: Object.freeze([
    Object.freeze({ id: 'goblin-scout', x: -1.3, z: -36, hp: 75, entry: .2 }),
    Object.freeze({ id: 'goblin-scrapper', x: 1.3, z: -40, hp: 75, entry: 1.5 }),
    Object.freeze({ id: 'goblin-lookout', x: 0, z: -44, hp: 75, entry: 2.8 }),
  ]),
});

// Copy and validate the entire request before changing health, timers or enemies.
// Encounter bounds deliberately follow the same small arena as the first fight.
/**
 * The ground a fight's people may step on, as a box in world axes. A fight starts
 * its people within 12 m of the centre across the arena and from 21 m toward the
 * enemy's end to 18 m toward the way out along it, whichever axis it runs on and
 * whichever way its retreat lies; the box holds all of that. It also still holds
 * the old fixed ground (x ±12, z -21..+18 of the centre), which every fight before
 * the east-west assaults was tuned on, so none of those plays any differently.
 * (With the fixed ground alone, defenders set out along an east-west arena stood
 * outside it and could never take a step.)
 */
export function fightBox(encounter) {
  const axis = encounter.retreatAxis === 'x' ? 'x' : 'z', across = axis === 'x' ? 'z' : 'x', c = encounter.center;
  const sign = encounter.retreatSign === -1 ? -1 : 1;
  const [lo, hi] = sign > 0 ? [c[axis] - 21, c[axis] + 18] : [c[axis] - 18, c[axis] + 21];
  const box = { [`min${axis.toUpperCase()}`]: lo, [`max${axis.toUpperCase()}`]: hi, [`min${across.toUpperCase()}`]: c[across] - 12, [`max${across.toUpperCase()}`]: c[across] + 12 };
  return { minX: Math.min(box.minX, c.x - 12), maxX: Math.max(box.maxX, c.x + 12), minZ: Math.min(box.minZ, c.z - 21), maxZ: Math.max(box.maxZ, c.z + 18) };
}
const insideBox = (box, p) => p.x >= box.minX && p.x <= box.maxX && p.z >= box.minZ && p.z <= box.maxZ;

/**
 * **The fight's outer limit.** Forty-five metres from the centre is the leash a traveler who
 * walks out of a fight is caught by, and it has been that since the first encounter was written.
 * It is spelled here rather than typed twice because **the chase uses the same number**: enemies
 * that leave their own ground to come after an archer stop exactly where a retreat begins, and
 * there must not be a second radius for anybody to tune out of step with this one.
 */
const LEASH = 45;

function encounterConfig(config) {
  if (!config || typeof config !== 'object') return null;
  const point = value => value && Number.isFinite(value.x) && Number.isFinite(value.z);
  const identifier = value => typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(value);
  // The arena runs along one axis: -Z in Tidehaven's wood, -X once the road
  // turns west out of Drent. `retreatLine` is the far edge along that axis, and
  // `retreatSign` which way it lies from the centre: +1 (the usual) toward +axis,
  // -1 toward -axis, for a fight whose way out runs the other way (an assault on
  // a gate that faces north). `along` measures toward the enemy's end either way.
  const axis = config.retreatAxis === 'x' ? 'x' : 'z', across = axis === 'x' ? 'z' : 'x';
  const sign = config.retreatSign === -1 ? -1 : 1;
  const line = Number.isFinite(config.retreatLine) ? config.retreatLine : config.retreatZ;
  const along = p => sign * (p[axis] - config.center[axis]), beyond = p => sign * (p[axis] - line) >= 0;
  if (!identifier(config.id) || !point(config.center) || !point(config.checkpoint)
    || !Number.isFinite(line) || sign * (line - config.center[axis]) <= 0
    || beyond(config.checkpoint) || !Array.isArray(config.enemies)
    || !config.enemies.length || config.enemies.length > 12) return null;
  // The country's own level, which everything in the fight is measured against. An encounter
  // that does not say carries 0, and 0 is today's game to the digit.
  const level = Number.isFinite(config.level) ? Math.floor(config.level) : 0;
  if (level < 0 || level > COUNTRY.top) return null;
  // **A bout can kill nobody.** Sparring with a friend is a fight in every other respect - his
  // tell, your wind, the ground - but both sides stop at one and the loser yields.
  if (config.bout !== undefined && typeof config.bout !== 'boolean') return null;
  const bout = config.bout === true;
  // A fight between people already in the world does not disappear because the
  // traveler watches from outside its retreat line. Ordinary encounters and
  // training bouts retain their existing player-driven retreat rules.
  if (config.independent !== undefined && typeof config.independent !== 'boolean') return null;
  const independent = config.independent === true;
  const seen = new Set(), enemies = [];
  for (const enemy of config.enemies) {
    if (!enemy || !identifier(enemy.id) || seen.has(enemy.id) || (enemy.npcId && seen.has(enemy.npcId)) || !point(enemy)) return null;
    const kind = enemy.kind ?? 'goblin';
    if (!Object.hasOwn(ENEMY_KINDS, kind)) return null;
    if (enemy.look !== undefined && !SOLDIER_LOOKS.includes(enemy.look)) return null;
    // A named body on the other side of the fight, drawn as himself: the same two fields an ally
    // already carries, because a sparring partner is somebody the traveler knows by name.
    if (enemy.name !== undefined && typeof enemy.name !== 'string') return null;
    if (enemy.npcId !== undefined && !identifier(enemy.npcId)) return null;
    if (enemy.model !== undefined && (!enemy.model || typeof enemy.model !== 'object' || Array.isArray(enemy.model))) return null;
    if (enemy.currentHp !== undefined && (!Number.isFinite(enemy.currentHp) || enemy.currentHp < 0 || enemy.currentHp > 100000)) return null;
    const hp = enemy.hp ?? 75, entry = enemy.entry ?? 0;
    if (!Number.isFinite(hp) || hp <= 0 || hp > 10000 || !Number.isFinite(entry) || entry < 0 || entry > 60
      || Math.abs(enemy[across] - config.center[across]) > 12 || along(enemy) < -21
      || along(enemy) > 18 || beyond(enemy)) return null;
    // Keep authored health in the reusable encounter. Scale when making the actor,
    // so retrying a country-level encounter cannot multiply its health again.
    seen.add(enemy.id); if (enemy.npcId) seen.add(enemy.npcId);
    enemies.push({ id: enemy.id, x: enemy.x, z: enemy.z, hp, entry, kind, ...(enemy.currentHp !== undefined ? { currentHp: enemy.currentHp } : {}), ...(enemy.look ? { look: enemy.look } : {}),
      ...(enemy.name ? { name: enemy.name } : {}), ...(enemy.npcId ? { npcId: enemy.npcId } : {}), ...(enemy.model ? { model: { ...enemy.model } } : {}) });
  }
  const allies = [];
  if (config.allies !== undefined) {
    if (!Array.isArray(config.allies) || config.allies.length > MAX_ALLIES) return null;
    for (const ally of config.allies) {
      if (!ally || !identifier(ally.id) || seen.has(ally.id) || (ally.npcId && seen.has(ally.npcId)) || !point(ally) || !Object.hasOwn(ALLY_KINDS, ally.kind)
        || (ally.name !== undefined && typeof ally.name !== 'string')
        || (ally.npcId !== undefined && !identifier(ally.npcId))
        || (ally.model !== undefined && (!ally.model || typeof ally.model !== 'object' || Array.isArray(ally.model)))
        || (ally.hp !== undefined && (!Number.isFinite(ally.hp) || ally.hp <= 0 || ally.hp > 10000))
        || (ally.currentHp !== undefined && (!Number.isFinite(ally.currentHp) || ally.currentHp < 0 || ally.currentHp > 100000))
        || (ally.level !== undefined && (!Number.isInteger(ally.level) || ally.level < 1 || ally.level > TOP_LEVEL))
        || (ally.toughness !== undefined && (!Number.isInteger(ally.toughness) || ally.toughness < 1 || ally.toughness > TOP_LEVEL))
        || (ally.spared !== undefined && typeof ally.spared !== 'boolean') || (ally.capturable !== undefined && typeof ally.capturable !== 'boolean') || (ally.armed !== undefined && typeof ally.armed !== 'boolean')
        || (ALLY_KINDS[ally.kind].flees && !point(ally.refuge ?? null))
        || (ally.refuge !== undefined && (!point(ally.refuge) || !insideBox(fightBox({ ...config, retreatSign: sign }), ally.refuge)))
        || Math.abs(ally[across] - config.center[across]) > 12 || along(ally) < -21
        || along(ally) > 18 || beyond(ally)) return null;
      seen.add(ally.id); if (ally.npcId) seen.add(ally.npcId);
      allies.push({ id: ally.id, name: ally.name ?? 'Soldier', kind: ally.kind, x: ally.x, z: ally.z, ...(ally.hp !== undefined ? { hp: ally.hp } : {}), ...(ally.level !== undefined ? { level: ally.level } : {}), ...(ally.toughness !== undefined ? { toughness: ally.toughness } : {}), ...(ally.model ? { model: { ...ally.model } } : {}),
        ...(ally.currentHp !== undefined ? { currentHp: ally.currentHp } : {}),
        ...(ally.npcId ? { npcId: ally.npcId } : {}), ...(ally.refuge ? { refuge: { x: ally.refuge.x, z: ally.refuge.z } } : {}), ...(ally.spared ? { spared: true } : {}), ...(ally.capturable ? { capturable: true } : {}), ...(ally.armed !== undefined ? { armed: ally.armed } : {}) });
    }
  }
  return { id: config.id, center: { x: config.center.x, z: config.center.z },
    checkpoint: { x: config.checkpoint.x, z: config.checkpoint.z },
    retreatZ: line, retreatLine: line, retreatAxis: axis, retreatSign: sign, level, bout, independent, enemies, allies };
}

/**
 * **How a family feels, read off the weapon** (docs/combat-brief.md, phase 5). A weapon that
 * says nothing is the sword: tempo 1, today's arc, no room needed, nothing locked. That is what
 * keeps every fight already built exactly as it was, and what lets a test hand `combat` a bare
 * `{ id, damage, reach }` and get the game it has always got.
 */
const SWORD_ARC = Math.PI * .34, AIM_WIDER = .43 / .34;
const tempoOf = weapon => (Number.isFinite(weapon?.tempo) && weapon.tempo > 0 ? weapon.tempo : 1);
const arcOf = weapon => (Number.isFinite(weapon?.arc) && weapon.arc > 0 ? weapon.arc : SWORD_ARC);
/** The swing this weapon actually makes: the same three, taken at its own pace. */
const swingOf = (combo, weapon) => {
  const swing = SWINGS[combo], tempo = tempoOf(weapon);
  return { ...swing, duration: swing.duration * tempo, contact: swing.contact * tempo };
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const angleDifference = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const facing = (a, b, yaw, arc) => Math.abs(angleDifference(Math.atan2(b.x - a.x, b.z - a.z), yaw)) <= arc;

/** Small, deterministic combat simulation. Rendering and tutorial text live outside it. */
/**
 * The margins the traveler fights with. Toughness owns the first three and the weapon's own
 * family owns the last (src/combat-skills.js, docs/combat-brief.md); the defaults here are what
 * the game has always used, so a combat built without them is today's combat to the digit.
 */
const TODAY = Object.freeze({ maxHp: 100, maxStamina: 100, dodgeWindow: .37, swingCost: 6, armourTurns: 0, dodgeScale: 1,
  // The shield, at level 1 (ARMS.guard / ARMS.guardCost, src/combat-skills.js). `hasShield` is
  // false, so a combat wired to nothing has no guard at all and is today's game exactly.
  guardShare: .6, guardCost: 18, hasShield: false });
/**
 * How near his own facing a blow must come to meet the shield. The same sixty degrees the
 * soldiers' own guard uses, so what a legionary does with a shield and what the traveler does
 * with one are the same rule read from the two sides.
 */
export const GUARD_ARC = Math.PI / 3;

export function createCombat({ world, position, onEvent = () => {}, getWeapon, onWeaponContact = () => {}, getMargins = null, getLevel = null, getAllies = null, getArrows = null, getBodies = null, isFallen = null }) {
  const margins = () => ({ ...TODAY, ...(getMargins?.() ?? {}) });
  const first = margins();
  const state = {
    phase: 'peaceful',
    encounterId: null,
    player: {
      hp: first.maxHp, maxHp: first.maxHp, stamina: first.maxStamina, maxStamina: first.maxStamina,
      action: 'idle', progress: 0, combo: 0, yaw: 0, invulnerable: false,
    },
    enemies: [],
    allies: [],
    /** Arrows in the air. Nothing else in this game is anywhere but where its owner is standing. */
    arrows: [],
    fireballs: [],
  };
  const player = state.player;
  const enemyTimers = new Map();
  const allyTimers = new Map();
  let time = 0;
  let meleeSequence = 0;
  let allySpells = 0;
  let actionTime = 0;
  let hitApplied = false;
  let bufferedAttack = false;
  let comboUntil = -1;
  let comboNext = 0;
  let staminaDelay = 0;
  // Hold to guard. It is held rather than done: the host says every frame whether the key is
  // down and which way the traveler is facing, and nothing here remembers a press.
  let guardHeld = false, guardYaw = 0;
  /**
   * Hold to draw, release to loose - the same held verb, with the same rule: the host offers the
   * button and the facing every frame and nothing here remembers a press. `drawHeld` is this
   * frame's button, `drawTime` how long it has actually been drawing, and `loosed` counts the
   * arrows this traveler has ever sent, which is what decides which shafts break.
   *
   * **`loosed` is the traveler's alone.** An ally archer keeps his own tally (`allyShafts`), which
   * numbers nothing and only makes his arrows tell each other apart. They shared one counter until
   * the hunt found it: every arrow Jerry sent moved the traveler's next shaft along one, so the
   * rule `survives` states - exactly two in three, and the same two whatever happens - held only
   * when nobody was shooting beside him. Driven: thirty shots with Jerry at his shoulder came back
   * seventeen instead of twenty, and a reload that changed Jerry's cadence changed which of the
   * traveler's own shafts broke.
   */
  let drawHeld = false, drawYaw = 0, drawTime = 0, loosed = 0, allyShafts = 0;
  /**
   * Whether there is `metres` of clear ground all round him to swing a long weapon in. Only the
   * pike asks. A world with no colliders - a test's - is open ground, which is the right answer.
   */
  function roomToSwing(metres) {
    for (const collider of world.nearColliders?.(position.x, position.z, metres + 2, []) ?? []) {
      const radius = collider.r ?? Math.hypot(collider.hx ?? 0, collider.hz ?? 0);
      if (Math.hypot(collider.x - position.x, collider.z - position.z) - radius < metres) return false;
    }
    return true;
  }
  /** Past the fight's own line of retreat, along the axis it is laid on and the way it runs. */
  const beyondTheLine = p => (lastEncounter.retreatSign ?? 1) * (p[lastEncounter.retreatAxis] - lastEncounter.retreatLine) > 0;
  /**
   * **Outside the fight altogether**: past its line, or past the leash from its centre. It is
   * the traveler's own retreat test with the first encounter's exemption taken out, because that
   * exemption is about not ending Tidehaven's little fight by accident and has nothing to say
   * about how far a goblin will follow somebody.
   */
  const outsideTheFight = p => beyondTheLine(p) || distance(p, lastEncounter.center) > LEASH;
  const independentFightHeld = () => lastEncounter.independent && !lastEncounter.bout
    && state.allies.some(ally => ally.active && ally.hp > 0 && !ally.escaped && !ally.wounded && !outsideTheFight(ally));
  let hurtProtection = 0;
  let dodgeDirection = { x: 0, z: 1 };
  let nextAttackerAt = 0;
  let weaponReady = false;
  let attackWeapon = null;
  let lastEncounter = DEFAULT_ENCOUNTER;

  function currentWeapon() {
    return getWeapon ? getWeapon() : {
      id: 'walking-club', damage: SWINGS.map(swing => swing.damage), reachMultiplier: 1, usable: true,
    };
  }

  function usableWeapon() {
    const weapon = currentWeapon();
    if (weapon?.usable) return weapon;
    emit('weapon-blocked', { id: weapon?.id });
    return null;
  }

  function emit(type, detail = {}) { onEvent({ type, ...detail }); }

  function safePoint(x, z, bodyRadius = .45) {
    if (canStand(x, z, world, bodyRadius)) return { x, z };
    // A changed tree layout must not strand a combatant inside a trunk.
    for (let radius = .5; radius <= 7; radius += .5) {
      for (let i = 0; i < 16; i++) {
        const angle = i / 16 * TAU;
        const point = { x: x + Math.sin(angle) * radius, z: z + Math.cos(angle) * radius };
        if (canStand(point.x, point.z, world, bodyRadius)) return point;
      }
    }
    return canStand(0, z, world) ? { x: 0, z } : { x: position.x, z: position.z };
  }

  function restorePlayer({ preserveVitals = false } = {}) {
    const previousHp = player.hp, previousStamina = player.stamina;
    // Toughness may have grown since the last fight, so the ceilings are read afresh; the bars are
    // then filled to them, which is what restoring is.
    const { maxHp, maxStamina } = margins();
    player.maxHp = maxHp; player.maxStamina = maxStamina;
    player.hp = player.maxHp;
    player.stamina = player.maxStamina;
    player.action = 'idle';
    player.progress = 0;
    player.combo = 0;
    player.invulnerable = false;
    actionTime = 0;
    comboNext = 0;
    comboUntil = -1;
    hurtProtection = 0;
    staminaDelay = 0;
    bufferedAttack = false;
    hitApplied = false;
    attackWeapon = null;
    // Nothing is drawn and nothing is in the air. Arrows that were flying when a fight ended are
    // gone with it: an arrow belongs to the fight it was loosed in.
    drawTime = 0;
    player.drawing = false;
    player.draw = 0;
    state.arrows = [];
    state.fireballs = [];
    if (preserveVitals) {
      player.hp = Math.min(player.maxHp, previousHp);
      player.stamina = Math.min(player.maxStamina, previousStamina);
    }
  }

  function enemyOnGuard(enemy) {
    const profile=ENEMY_KINDS[enemy.kind],timers=enemyTimers.get(enemy.id);
    return !!(profile?.guard&&enemy.active!==false&&enemy.hp>0&&enemy.action==='idle'
      &&timers?.entry<=0&&(profile.poise||timers.cooldown<=0));
  }

  function makeEnemy(id, kind, point, entry = 0, hp = kind === 'dummy' ? 100 : 75) {
    const enemy = {
      id, kind, ...(kind === 'dummy' ? {x:point.x,z:point.z} : safePoint(point.x, point.z, kind === 'spider' ? BODY.spider : .45)), yaw: 0,
      ...(kind === 'spider' ? { r: BODY.spider } : {}),
      hp, maxHp: hp,
      action: 'idle', progress: 0, speed: 0, active: true,
      // Read from the same state as mitigation; the view and autopilot must never
      // see an old shield pose after an attack, recoil or recovery transition.
      get guarded() { return enemyOnGuard(this); },
    };
    enemyTimers.set(id, { actionTime: 0, cooldown: entry, hitApplied: false, entry, index: entry / 1.3 });
    return enemy;
  }

  function startPractice(point) {
    weaponReady = true;
    restorePlayer();
    enemyTimers.clear();
    clearAllies();
    state.enemies = [makeEnemy('practice-dummy', 'dummy', point)];
    state.phase = 'practice';
    state.encounterId = null;
  }

  function finishPractice() {
    if (state.phase !== 'practice') return;
    state.enemies = [];
    enemyTimers.clear();
    clearAllies();
    state.phase = 'peaceful';
    restorePlayer();
  }

  /**
   * `atCheckpoint` starts the traveler where the fight forms up, as a retry does.
   * A normal fight begun wherever the traveler happens to stand counts as a retreat
   * on its first step when that is past its retreat line, or 45 m from its centre.
   * Independent fights continue while a living ally still holds that ground.
   */
  function startEncounter(config, { atCheckpoint = false } = {}) {
    if (state.phase === 'active' || (state.phase === 'won' && config === undefined)) return false;
    // A fight takes the level of the country it happens in, unless it was authored with one of
    // its own. The host is the only one who knows which country that is, so it hands in a
    // `getLevel`; without one, or off the atlas, the level is 0 and the fight is today's fight.
    const asked = config === undefined ? DEFAULT_ENCOUNTER : config;
    const country = asked && typeof asked === 'object' && !Number.isFinite(asked.level) && getLevel
      ? { ...asked, level: getLevel(asked.center) } : asked;
    // Whoever is walking with the traveler is in this fight, at their own numbers. They are
    // added to whatever the encounter already authored - the border battle brings its side's four
    // soldiers, and the company stands *with* them - and a fight that wants to be fought alone
    // (Drent's three teaching fights) simply gets none.
    const friends = getAllies ? getAllies(country) : [];
    // The same named person can already be authored into a fight (or carried by
    // its retry). Their encounter ID and world NPC ID are aliases of one body.
    // Authored roles win, including an enemy/sparring role; never add a second
    // friendly copy from the following company. Malformed authored rosters are
    // still rejected by encounterConfig rather than silently rewritten.
    const identities = actor => [actor?.id, actor?.npcId].filter(Boolean);
    const occupied = new Set([...(Array.isArray(country?.enemies) ? country.enemies : []),
      ...(Array.isArray(country?.allies) ? country.allies : [])].flatMap(identities));
    const arriving = friends.filter(friend => {
      const ids = identities(friend);
      if (ids.some(id => occupied.has(id))) return false;
      ids.forEach(id => occupied.add(id)); return true;
    });
    const joined = arriving.length
      ? { ...country, allies: [...(country.allies ?? []), ...arriving] }
      : country;
    const next = encounterConfig(joined);
    if (!next) return false;
    if (atCheckpoint) {
      const checkpoint = safePoint(next.checkpoint.x, next.checkpoint.z);
      position.x = checkpoint.x; position.z = checkpoint.z; position.y = world.heightAt(position.x, position.z);
    }
    weaponReady = true;
    restorePlayer({ preserveVitals: !atCheckpoint && player.hp > 0 });
    enemyTimers.clear();
    lastEncounter = next;
    // Bodies persist independently of the current fight. A retry must not put
    // the same fighter back on his feet beside his own remains. Keep the full
    // authored encounter for validation/retries, but instantiate only survivors.
    // Lessons deliberately bypass this death-only host policy.
    const survives = actor => next.bout || !isFallen?.(next.id, actor.id, actor);
    state.enemies = next.enemies.filter(survives).map(enemy => withCurrentHealth(Object.assign(makeEnemy(enemy.id, enemy.kind ?? 'goblin', enemy, enemy.entry, Math.round(enemy.hp * countryHealth(next.level))), { ...(enemy.look ? { look: enemy.look } : {}),
      ...(enemy.name ? { name: enemy.name } : {}), ...(enemy.npcId ? { npcId: enemy.npcId } : {}), ...(enemy.model ? { model: enemy.model } : {}) }), enemy));
    allyTimers.clear();
    state.allies = next.allies.filter(survives).map((ally, index) => makeAlly(ally, index));
    state.phase = 'active';
    state.encounterId = next.id;
    state.center = { x: next.center.x, z: next.center.z };
    nextAttackerAt = time + .6;
    if (state.enemies.every(enemy => !enemy.active)) {
      state.phase = 'won';
      emit('victory', { encounterId: state.encounterId });
    }
    return true;
  }

  /** Start the last encounter over; `changes` replace parts of it (the raid's villagers are not caught twice). */
  function resetEncounter(changes = {}) {
    state.phase = 'peaceful';
    const checkpoint = safePoint(lastEncounter.checkpoint.x, lastEncounter.checkpoint.z);
    position.x = checkpoint.x;
    position.z = checkpoint.z;
    position.y = world.heightAt(position.x, position.z);
    return startEncounter({ ...lastEncounter,
      enemies: lastEncounter.enemies.map(({ currentHp, ...enemy }) => enemy),
      allies: (lastEncounter.allies ?? []).map(({ currentHp, ...ally }) => ally), ...changes }, { atCheckpoint: true });
  }

  /** Release a real-world fight when its targets have escaped or fallen. The
   * host receives the final bodies/health before this simulation lets them go. */
  function disengage(reason = 'retreat') {
    if (state.phase !== 'active' || lastEncounter.bout) return false;
    const copy = actor => ({ id: actor.id, hp: actor.hp, maxHp: actor.maxHp,
      x: actor.x, z: actor.z, yaw: actor.yaw, escaped: !!actor.escaped });
    const enemies = state.enemies.map(copy), allies = state.allies.map(copy);
    state.phase = 'peaceful'; state.enemies = []; enemyTimers.clear(); clearAllies();
    restorePlayer({ preserveVitals: true });
    emit('retreat', { encounterId: state.encounterId, reason, enemies, allies });
    return true;
  }

  /**
   * **Hold to guard**, the one new verb melee gets. It is there at level 1 with any shield in
   * hand and levels only make it better: the share caught rises from .6 to .9 and the wind it
   * costs falls from 18 to 8. **No parry and no riposte** - the margins are the whole of it.
   *
   * `held` is this frame's key, `yaw` this frame's facing. Returns whether the shield is
   * actually up, which is not the same question: it needs a shield in hand, an idle body (not
   * swinging, not getting over a swing, not rocked) and the wind to pay for a blow.
   */
  function guard(held, yaw = guardYaw) {
    guardHeld = !!held;
    if (Number.isFinite(yaw)) guardYaw = yaw;
    // The answer and the flag are set together, so nothing can ever read one and act on the
    // other: the picture of the guard is drawn from `player.guarding` and must not lag it.
    player.guarding = guarding();
    return player.guarding;
  }
  /**
   * **Hold to draw, release to loose** (docs/combat-brief.md, phase 6). The same shape as the
   * guard, and for the same reason: the host offers the button and the facing every frame and
   * this module latches nothing of its own.
   *
   * It returns how much of a draw is actually on, which is a different question from whether the
   * button is down: it needs a bow in hand, an arrow to put on it, an idle body, and the wind to
   * send it. Let go and whatever was drawn goes - below `BOW.least` that is nothing at all.
   */
  function draw(held, yaw = drawYaw) {
    const was = drawing();
    drawHeld = !!held;
    if (Number.isFinite(yaw)) drawYaw = yaw;
    const now = drawing();
    // Letting go is the shot. A draw that stops for any other reason - a blow, the wind going,
    // the last arrow leaving the quiver - is a draw that comes down, and sends nothing.
    if (was && !drawHeld) loose();
    if (!now) loseDraw();
    player.drawing = now;
    player.draw = now ? drawnBy(drawTime, margins().drawTime ?? 1) : 0;
    return player.draw;
  }
  /**
   * **The bow comes down and the arrow stays on the string** (the user's answers, 2026-09-21).
   *
   * Pausing, alt-tabbing, or a dialogue opening is not letting go of the button: it is the game
   * stopping. Until today the host answered all three with `draw(false)`, which is the loose - so
   * opening the pause menu spent an arrow and put it in the air to land while the game was paused
   * (docs/known-issues.md, round 5). **Only a release while the game is being played is a shot**;
   * everything else lowers the bow, and the arrow is still in the quiver afterwards.
   *
   * It emits nothing, because nothing happened: no arrow left and none was wasted.
   */
  function lowerBow() {
    const was = drawHeld || drawTime > 0;
    drawHeld = false;
    drawTime = 0;
    player.drawing = false;
    player.draw = 0;
    return was;
  }
  /**
   * **The draw is gone and no arrow left.** A blow that lands mid-draw takes the draw with it -
   * `drawing()` goes false, the pull is lost, and until today that happened in silence and the
   * player was told nothing at all (docs/known-issues.md, round 5). Now it says so, with the same
   * event a draw too short to be a shot uses, because they are the same thing from the player's
   * side: he held the button and no arrow came out.
   *
   * The wind going or the last shaft leaving the quiver is not a blow and is not reported: the
   * bar and the count are both already on the screen saying why.
   */
  function loseDraw() {
    if (!(drawTime > 0)) return false;
    const pull = drawnBy(drawTime, margins().drawTime ?? 1);
    drawTime = 0;
    if (player.action !== 'hurt' && player.action !== 'dead') return false;
    emit('draw-spent', { why: 'struck', pull, x: position.x, z: position.z });
    return true;
  }
  /** How many arrows there are to shoot. The host owns the satchel; this only ever asks. */
  const arrowsLeft = () => Math.max(0, Math.floor(Number(getArrows?.()) || 0));
  /**
   * When an arrow may be sent at all: in a fight, or **at a mark**. Practice is the phase the
   * straw post already runs in, and a shot at a target is the bow's straw post - the dummy takes
   * no damage, nothing shoots back, and no fight is won or lost by it (Jerry's mark,
   * docs/combat-brief.md). The swing has always worked in both; the draw now does too.
   */
  const shootable = () => state.phase === 'active' || state.phase === 'practice';
  /** Whether a draw is actually on right now, which is not the same as the button being down. */
  function drawing() {
    const weapon = currentWeapon();
    return !!drawHeld && !!weapon?.ranged && weapon.usable !== false && shootable()
      && player.action === 'idle' && player.hp > 0 && player.stamina >= BOW.wind && arrowsLeft() > 0;
  }
  /**
   * The arrow leaves. What it is worth and how far it carries both follow how far it was drawn,
   * so a snatched shot is a real arrow that falls short rather than a miss the player cannot read.
   * The weapon's own damage has already been through the traveler's skill in Bows (`profile()`),
   * so an arrow gets better in exactly the way every other weapon does.
   */
  function loose() {
    const weapon = currentWeapon();
    const pull = drawnBy(drawTime, margins().drawTime ?? 1);
    drawTime = 0;
    if (!weapon?.ranged || !shootable() || player.hp <= 0) return false;
    const shot = shotAt(pull, { damage: weapon.damage?.[0] ?? BOW.damage });
    if (!shot) { emit('draw-spent', { why: 'short', pull, x: position.x, z: position.z }); return false; }
    if (arrowsLeft() <= 0 || player.stamina < BOW.wind) return false;
    player.stamina -= BOW.wind;
    staminaDelay = Math.max(staminaDelay, .5);
    const n = ++loosed;
    state.arrows.push({ id: `arrow-${n}`, n, x: position.x, z: position.z, y: groundAt(world, position.x, position.z) + BOW.height,
      yaw: drawYaw, flown: 0, range: shot.range, damage: shot.damage, weaponId: weapon.id });
    emit('loose', { n, x: position.x, z: position.z, yaw: drawYaw, pull: shot.pull, weaponId: weapon.id });
    return true;
  }
  /**
   * An arrow stops, and that is the end of it. **About two in three can be picked up again**: one
   * shaft in three breaks where it lands, and which one is the arrow's own number rather than a
   * roll, so the rule holds exactly over any run and a reload cannot change what happened.
   */
  function landArrow(arrow, stopped, targetId = null) {
    state.arrows = state.arrows.filter(other => other !== arrow);
    // An ally's arrows are his own: the traveler does not walk the field gathering Jerry's.
    // `flown` is how far it actually went, which is the only honest measure of a long shot: a
    // mark pays by it (src/main.js), and nothing else has to remember where the shot was taken.
    emit('arrow-landed', { id: arrow.id, n: arrow.n, owner: arrow.owner ?? null, x: arrow.x, z: arrow.z,
      flown: arrow.flown, stopped, targetId, recovered: !arrow.owner && survives(arrow.n) });
  }
  /**
   * **Everybody in the world who is not in this fight**, for the one question an arrow asks of
   * them: are you in the way. Villagers on a street, horses on a picket line, the stock - none of
   * them is a combatant and none of them is hurt, but a shaft that meets one stops there (the
   * user, 2026-09-21).
   *
   * The host's list (`gatherBodies`, src/main.js) also supplies the standing bodies
   * that movement must stop against. Terrain remains separate from body contact.
   *
   * Gathered once per `update`, however many arrows are in the air.
   */
  let bodiesThisUpdate = null, worldBodiesThisUpdate = null;
  function standingBodies() {
    if (!worldBodiesThisUpdate) worldBodiesThisUpdate = (getBodies?.() ?? []).filter(body =>
      body && !body.dead && !body.fallen && !body.lying && body.action !== 'dead' && body.active !== false
      && !(Number.isFinite(body.hp) && body.hp <= 0) && Number.isFinite(body.x) && Number.isFinite(body.z));
    return worldBodiesThisUpdate;
  }
  function otherBodies() {
    if (bodiesThisUpdate) return bodiesThisUpdate;
    const mine = new Set(combatantIds());
    bodiesThisUpdate = standingBodies().filter(body => !mine.has(body.id) && !mine.has(body.npcId));
    return bodiesThisUpdate;
  }
  const motionWorld = bodyWorld(world), bodyViews = new WeakMap();
  let motionBodies = null, motionEnemies = null, motionAllies = null, motionPhase = null;
  const bodyRadius = actor => actor === position ? BODY.traveler : BODY[actor.kind] ?? BODY.person;
  function liveBody(actor) {
    if (!bodyViews.has(actor)) bodyViews.set(actor, {
      id: actor === position ? 'traveler' : actor.id, r: bodyRadius(actor), kind: 'body',
      get x() { return actor.x; }, get z() { return actor.z; },
      get active() { const status = actor === position ? player : actor;
        return status.active !== false && status.action !== 'dead' && status.hp > 0; },
    });
    return bodyViews.get(actor);
  }
  function moveCombatant(actor, dx, dz) {
    // Live coordinates matter: one actor may advance or be knocked back earlier
    // in the same substep. A snapshot lets the next actor cross its new position.
    if (!motionBodies || motionEnemies !== state.enemies || motionAllies !== state.allies || motionPhase !== state.phase) {
      motionEnemies = state.enemies; motionAllies = state.allies; motionPhase = state.phase;
      const fighting = state.phase === 'active' || state.phase === 'practice';
      const mine = new Set(fighting ? combatantIds() : ['traveler']);
      motionBodies = [...standingBodies().filter(body => !mine.has(body.id) && !mine.has(body.npcId)), liveBody(position),
        ...(fighting ? [...state.enemies, ...state.allies].map(liveBody) : [])];
      motionWorld.setBodies(motionBodies);
    }
    const radius = bodyRadius(actor), id = actor === position ? 'traveler' : actor.id;
    moveCharacter(actor, dx, dz, motionWorld.moving(actor, radius, id), radius);
  }
  // Personal space steers a crowd before contact, but an existing close overlap
  // must still be allowed to open rather than freezing both walkers in place.
  const closesGap = (actor, next, other, space) => distance(next, other) < Math.min(space, distance(actor, other) - 1e-8);
  /** Where the ground is here, asked of the same floor the whole fight is fought on. */
  const floorAt = (x, z) => groundAt(world, x, z);
  /**
   * **A bout can kill nobody, and neither can practice**: a sparring partner, the traveler and
   * anybody else in one stops at a single point of health and yields. One rule, in one place, so
   * that an arrow and a sword cannot disagree about it - Jerry's mark and Jojo's straw post both
   * run in the practice phase, and nothing shot at a lesson may take anyone below one.
   */
  const killFloor = () => (lastEncounter.bout || state.phase === 'practice' ? 1 : 0);
  /** Whether this body is near enough to the arrow to be the thing it stops on. */
  const inTheWay = (body, arrow, radius = BOW.body) => Math.hypot(body.x - arrow.x, body.z - arrow.z) <= radius;
  const combatantIds = () => [...new Set(['traveler', ...state.enemies.flatMap(actor => [actor.id, actor.npcId]),
    ...state.allies.flatMap(actor => [actor.id, actor.npcId])].filter(Boolean))];

  /** A shaft hurts the first body it reaches, including unarmed people outside an encounter.
   * Encounter health stays here. The host receives the same contact for its world NPC health.
   */
  function applyArrowHit(arrow, target, team) {
    const source = arrow.owner ? 'ally' : 'player', sourceId = arrow.owner ?? 'traveler';
    const sourceNpcId = state.allies.find(actor => actor.id === sourceId)?.npcId;
    const impact = { id: `impact-${arrow.id}`, source, sourceId, team: source, targetId: target.id ?? 'traveler',
      ...(sourceNpcId ? { sourceNpcId } : {}),
      ...(target.npcId ? { targetNpcId: target.npcId } : {}),
      origin: { x: arrow.x - Math.sin(arrow.yaw) * arrow.flown, z: arrow.z - Math.cos(arrow.yaw) * arrow.flown },
      x: arrow.x, z: arrow.z, y: arrow.y, yaw: arrow.yaw, damage: arrow.damage, weaponId: arrow.weaponId ?? BOW.id,
      practice: state.phase === 'practice', bout: state.phase === 'active' && !!lastEncounter.bout,
      encounterId: state.encounterId, combatantIds: combatantIds(), affectedIds: [], hits: [] };
    const before = target.hp;
    if (team === 'enemy') hurtEnemy(target, arrow.damage, arrow.yaw, { by: sourceId, source, arrow: true, impactId: impact.id });
    else if (team === 'ally') hurtAllyByArrow(target, arrow);
    else if (team === 'player') hurtPlayerByArrow(arrow);
    if (team !== 'world' && (target.hp < before || target.kind === 'dummy')) {
      impact.affectedIds.push(impact.targetId);
      impact.hits.push({ id: impact.targetId, ...(target.npcId ? { npcId: target.npcId } : {}), team,
        damage: Math.max(0, before - target.hp), hp: target.hp, maxHp: target.maxHp, killed: target.hp <= 0,
        ...(target.spared || target.wounded ? { spared: true } : {}), x: target.x ?? position.x, z: target.z ?? position.z });
    }
    emit('arrow-impact', impact);
  }
  /**
   * Every arrow in the air moves, and the first thing it meets is the last thing it meets:
   * **an enemy, a friend, a bystanding body, a tree, or ground that has risen above it.**
   */
  function updateArrows(dt) {
    if (!state.arrows.length) return;
    for (const arrow of [...state.arrows]) {
      const travel = Math.min(BOW.speed * dt, Math.max(0, arrow.range - arrow.flown));
      // Swept in short steps, so a fast arrow cannot pass through a thin tree between two frames.
      const steps = Math.max(1, Math.ceil(travel / BOW.radius));
      // Where it was loosed from, which is the only thing the archer's own body space can be
      // measured against: a companion keeps nine tenths of a metre off the traveler's elbow and
      // no further, so without this every shot in a file would end in the back of the man beside
      // him. It is people only - a tree at half a metre still stops the shot.
      const from = { x: arrow.x - Math.sin(arrow.yaw) * arrow.flown, z: arrow.z - Math.cos(arrow.yaw) * arrow.flown };
      const beside = one => Math.hypot(one.x - from.x, one.z - from.z) <= BOW.clearOfShooter;
      let hit = null, friend = null, struck = false, body = null, blocked = false, grounded = false;
      for (let i = 0; i < steps && !hit && !friend && !struck && !body && !blocked && !grounded; i++) {
        const step = travel / steps;
        arrow.x += Math.sin(arrow.yaw) * step;
        arrow.z += Math.cos(arrow.yaw) * step;
        arrow.flown += step;
        hit = state.enemies.find(enemy => enemy.active && enemy.action !== 'dead'
          && inTheWay(enemy, arrow)) ?? null;
        // **Arrows hurt whoever they hit** (the user, 2026-09-21). Past the archer's own body
        // space the next thing in the way is the next thing in the way, friend or not: an ally,
        // a companion, the traveler himself if the shaft is somebody else's.
        if (!hit) friend = state.allies.find(ally => ally.active && ally.action !== 'dead'
          && ally.id !== arrow.owner && !beside(ally) && inTheWay(ally, arrow)) ?? null;
        if (!hit && !friend && arrow.owner && player.hp > 0 && player.action !== 'dead'
          && !beside(position) && inTheWay(position, arrow)) struck = true;
        if (!hit && !friend && !struck)
          body = otherBodies().find(one => !beside(one) && inTheWay(one, arrow, BOW.radius + (one.r ?? .45))) ?? null;
        // **Trees and walls stop arrows.** "In woodland I am a man holding a stick."
        if (!hit && !friend && !struck && !body) blocked = !!solidAt(world, arrow.x, arrow.z);
        // **And so does ground that has risen above the flight**: a bank, a terrace, the near
        // side of a ravine. The arrow flies level at the height it left the bow at.
        if (!hit && !friend && !struck && !body && !blocked) grounded = floorAt(arrow.x, arrow.z) > arrow.y;
      }
      if (hit) { applyArrowHit(arrow, hit, 'enemy'); landArrow(arrow, 'target', hit.id); continue; }
      if (friend) {
        applyArrowHit(arrow, friend, 'ally');
        landArrow(arrow, 'friend', friend.id);
        continue;
      }
      if (struck) { applyArrowHit(arrow, player, 'player'); landArrow(arrow, 'friend', 'traveler'); continue; }
      if (body) { applyArrowHit(arrow, body, 'world'); landArrow(arrow, 'body', body.id); continue; }
      if (blocked) { landArrow(arrow, 'solid'); continue; }
      if (grounded) { landArrow(arrow, 'ground'); continue; }
      if (arrow.flown >= arrow.range - 1e-6) landArrow(arrow, 'spent');
    }
  }
  /**
   * Whether the shield is up and would catch something right now.
   *
   * The same held input works before, during and after a fight, including the practice post.
   * Raising the shield while the road is quiet costs no wind and absorbs no imaginary blow.
   * A dead or defeated traveler cannot guard; attacks, recovery and low stamina still lower it.
   */
  function guarding() {
    const { hasShield, guardCost } = margins();
    return !!guardHeld && !!hasShield && state.phase !== 'defeated'
      && player.action === 'idle' && player.hp > 0 && player.stamina >= (guardCost ?? 0);
  }

  function beginAttack(yaw) {
    // What a swing costs in wind: six today, four at the top of the weapon's own family.
    const cost = margins().swingCost;
    if (player.stamina < cost) return false;
    const weapon = usableWeapon();
    if (!weapon) { bufferedAttack = false; return false; }
    // A bow is not swung at anything. The host holds the same button to draw it, so this is the
    // belt to that brace: nothing can ever turn an arrow into a sword stroke.
    if (weapon.ranged) { bufferedAttack = false; return false; }
    // A pike is two and a half paces of ash: "in a doorway I am furniture". Within `room` of
    // anything solid it will not swing at all, and the traveler is told why rather than pressing
    // a key that quietly does nothing.
    if (weapon.room > 0 && !roomToSwing(weapon.room)) {
      emit('no-room', { weaponId: weapon.id, room: weapon.room, x: position.x, z: position.z });
      bufferedAttack = false;
      return false;
    }
    const candidates = state.enemies.filter(enemy => enemy.active && enemy.action !== 'dead'
      && distance(position, enemy) <= 3.2 * (weapon.reachMultiplier ?? 1)
      && facing(position, enemy, yaw, arcOf(weapon) * AIM_WIDER));
    candidates.sort((a, b) => distance(position, a) - distance(position, b));
    if (candidates.length) yaw = Math.atan2(candidates[0].x - position.x, candidates[0].z - position.z);
    player.yaw = yaw;
    player.combo = time <= comboUntil ? comboNext : 0;
    player.action = 'attack';
    player.progress = 0;
    player.stamina -= cost;
    staminaDelay = .65;
    actionTime = 0;
    hitApplied = false;
    bufferedAttack = false;
    attackWeapon = { ...weapon, damage: [...weapon.damage] };
    emit('swing', { combo: player.combo, x: position.x, z: position.z, weaponId: weapon.id });
    return true;
  }

  function attack(yaw) {
    if (!Number.isFinite(yaw) || state.phase === 'defeated' || player.action === 'dead') return false;
    if (!weaponReady) return false;
    if (player.action === 'attack') {
      // A single late press is remembered; holding the mouse cannot queue a whole combo.
      if (actionTime >= swingOf(player.combo, attackWeapon).duration * .55) {
        if (!usableWeapon()) return false;
        bufferedAttack = true;
        return true;
      }
      return false;
    }
    if (player.action !== 'idle') return false;
    return beginAttack(yaw);
  }

  function dodge(direction = {}) {
    if (!weaponReady || state.phase === 'defeated' || player.stamina < 25) return false;
    if (player.action === 'dead' || player.action === 'hurt' || player.action === 'dodge') return false;
    // Attacks can be cancelled after contact, so a committed swing still has a readable cost.
    // "It is slow to start and it cannot be stopped once it is going." The heavy families'
    // third swing commits: no stepping aside out of it, at any point in it.
    if (player.action === 'attack' && attackWeapon?.locked && player.combo === SWINGS.length - 1) return false;
    if (player.action === 'attack' && actionTime < swingOf(player.combo, attackWeapon).contact) return false;
    let x = Number.isFinite(direction.x) ? direction.x : 0;
    let z = Number.isFinite(direction.z) ? direction.z : 0;
    const length = Math.hypot(x, z);
    if (length < .001) { x = -Math.sin(player.yaw); z = -Math.cos(player.yaw); }
    else { x /= length; z /= length; }
    dodgeDirection = { x, z };
    player.yaw = Math.atan2(x, z);
    player.stamina -= 25;
    staminaDelay = .8;
    player.action = 'dodge';
    player.progress = 0;
    player.invulnerable = true;
    actionTime = 0;
    bufferedAttack = false;
    emit('dodge', { x: position.x, z: position.z });
    return true;
  }

  function hurtEnemy(enemy, damage, yaw, attribution = {}) {
    if (!enemy.active || enemy.action === 'dead') return;
    const timers = enemyTimers.get(enemy.id);
    if (enemy.kind === 'dummy') {
      enemy.action = 'hurt';
      enemy.progress = 0;
      timers.actionTime = 0;
      emit('practice-hit', { targetId: enemy.id, x: enemy.x, z: enemy.z });
      emit('hit', { targetId: enemy.id, x: enemy.x, z: enemy.z, damage: 0, ...attribution });
      return;
    }
    const profile = ENEMY_KINDS[enemy.kind] ?? ENEMY_KINDS.goblin;
    // A soldier on guard, facing the blow, turns most of it on his shield and is not rocked.
    const guarded = enemy.guarded
      && Math.abs(angleDifference(enemy.yaw ?? 0, yaw + Math.PI)) < Math.PI / 3;   // on guard, and the blow comes at his shield
    if (guarded) damage *= 1 - profile.guard;
    damage = Math.max(1, Math.round(damage * (1 - (profile.armor ?? 0))));
    // In a bout nobody's health goes below one: he is beaten, and he says so, and he gets up.
    const floor = killFloor();
    enemy.hp = Math.max(floor, enemy.hp - damage);
    enemy.active = enemy.hp > floor;
    // A blow he caught on his shield leaves him standing, and the fight goes on above this line.
    // **But the blow that beats him is never merely blocked**, because everything that ends a
    // fight is below here: the bout's yield, and the victory. This read `enemy.hp`, which in an
    // ordinary fight is the same question - a man at nought is a man who is not active - and in a
    // **bout** is not, because a bout's floor is one. So a guarded blow that put a sparring
    // partner on the floor set `active: false` and then returned: he was beaten, he could no
    // longer be a candidate for anything, and no `spar-over` was ever emitted. The bout ran for
    // ever, and with a bow - a man who cannot be reached is idle, and an idle man is always on
    // guard - that was every bout, every time (docs/known-issues.md).
    if (guarded && enemy.active) {
      emit('blocked', { targetId: enemy.id, x: enemy.x, z: enemy.z, damage, ...attribution });
      emit('hit', { targetId: enemy.id, x: enemy.x, z: enemy.z, damage, ...attribution });
      return;
    }
    // A kind marked `stagger: false` takes the hit and keeps swinging: its tell is
    // not interrupted, its recovery is not restarted and nothing here buys the
    // traveler a free second. Death still lands the same way for everyone. A kind
    // with `poise` does the same once its swing has begun.
    const committed = profile.poise && ['windup', 'attack'].includes(enemy.action);
    if ((profile.stagger !== false && !committed) || !enemy.active) {
      const alreadyRecoiling = enemy.action === 'hurt';
      enemy.action = enemy.hp ? 'hurt' : 'dead';
      enemy.speed = 0;
      // A trained fighter finishes the recovery already owed after his swing.
      // Replacing it with a fresh goblin recovery on every hit prevented both
      // his shield and his next attack forever under an ordinary sword combo.
      // Repeated contacts cannot restart that fighter's recoil animation either.
      if (!profile.poise || !alreadyRecoiling || !enemy.active) {
        enemy.progress = 0;
        timers.actionTime = 0;
      }
      if (!profile.poise) {
        timers.cooldown = ENEMY_RECOVERY;
        nextAttackerAt = Math.max(nextAttackerAt, time + .35);
      }
      moveCombatant(enemy, Math.sin(yaw) * (profile.knockback ?? .43), Math.cos(yaw) * (profile.knockback ?? .43));
    }
    emit('hit', { targetId: enemy.id, x: enemy.x, z: enemy.z, damage, weaponId: attackWeapon?.id ?? currentWeapon()?.id ?? null,
      killed: !enemy.hp, level: lastEncounter.level ?? 0, ...attribution });
    if (!enemy.hp) emit('enemy-defeated', { id: enemy.id, x: enemy.x, z: enemy.z, ...attribution });
    // **A bout never ends in a victory**, because nothing has been won and nobody is dead. It
    // ends in a yield, with its own event, so that not one of the host's victory branches - the
    // Greenway, the border, the toll stone - can ever fire on a lesson.
    if (lastEncounter.bout && !enemy.active) { endBout('traveler'); return; }
    if (state.phase === 'active' && state.enemies.every(target => !target.active)) {
      state.phase = 'won';
      emit('victory', { encounterId: state.encounterId });
    }
  }

  /**
   * Sparring is over: nobody is hurt, nobody is dead, and both of them are standing where they
   * stood. `winner` is `traveler`, `teacher`, or `walked-away` for a bout somebody left.
   */
  function endBout(winner) {
    const encounterId = state.encounterId;
    state.phase = 'peaceful';
    state.enemies = [];
    enemyTimers.clear();
    clearAllies();
    restorePlayer();
    emit('spar-over', { encounterId, winner });
  }

  /** One immutable contact-time footprint, shared with the host's ordinary NPC bodies.
   * Snapshot first: knockback, a death, or a victory callback must not move later contacts.
   * `combatantIds` includes aliases and dead actors so the host cannot hit a second rendering.
   */
  function applyMeleeStrike(source, team, { range, arc, damage, weaponId = null }) {
    const impact = { id: `melee-${++meleeSequence}`, source: team, sourceId: source.id,
      ...(source.npcId ? { sourceNpcId: source.npcId } : {}), team,
      origin: { x: source.x, z: source.z }, x: source.x, z: source.z, yaw: source.yaw,
      range, arc, damage, weaponId, practice: state.phase === 'practice', bout: state.phase === 'active' && !!lastEncounter.bout,
      encounterId: state.encounterId, affectedIds: [], hits: [] };
    const roster = [
      { ...player, x: position.x, z: position.z, id: 'traveler', team: 'player', actor: player },
      ...state.enemies.map(actor => ({ ...actor, team: 'enemy', actor })),
      ...state.allies.map(actor => ({ ...actor, team: 'ally', actor })),
    ];
    impact.combatantIds = combatantIds();
    const contacts = meleeContacts(impact, roster, world);
    const attribution = { by: source.id, source: team, melee: true, impactId: impact.id };
    for (const contact of contacts) {
      const target = contact.actor, before = target.hp;
      if (contact.team === 'enemy') hurtEnemy(target, damage, source.yaw, attribution);
      else if (contact.team === 'ally') hurtAlly(target, source, damage, attribution);
      else hurtPlayer(source, damage, attribution, true);
      const dealt = Math.max(0, before - target.hp);
      if (dealt || target.kind === 'dummy') {
        impact.affectedIds.push(target.id ?? 'traveler');
        impact.hits.push({ id: target.id ?? 'traveler', ...(target.npcId ? { npcId: target.npcId } : {}),
          team: contact.team, damage: dealt, hp: target.hp, maxHp: target.maxHp, killed: target.hp <= 0,
          ...(target.spared || target.wounded ? { spared: true } : {}), x: contact.x, z: contact.z });
      }
      if (impact.bout && state.phase !== 'active') break;
    }
    emit('melee-impact', impact);
    return impact;
  }

  function applyPlayerStrike() {
    const weapon = attackWeapon;
    if (!weapon) return;
    const swing = swingOf(player.combo, weapon);
    const impact = applyMeleeStrike({ id: 'traveler', x: position.x, z: position.z, yaw: player.yaw }, 'player', {
      range: swing.reach * (weapon.reachMultiplier ?? 1), arc: arcOf(weapon), damage: weapon.damage[player.combo], weaponId: weapon.id });
    if (impact.affectedIds.length) onWeaponContact(weapon.id);
  }

  /** Spell contact uses the same health, armour, victory and body lifecycle as a blade.
   * World NPCs are returned as unmanaged for the host's ordinary assault pipeline.
   */
  function spellHit(targetId, damage, { yaw = player.yaw, spellId = 'fireball', sourceId = 'traveler', source = 'player' } = {}) {
    if (!Number.isFinite(damage) || damage <= 0) return { handled: false, damage: 0 };
    const enemy = state.enemies.find(actor => actor.id === targetId || actor.npcId === targetId);
    const ally = state.allies.find(actor => actor.id === targetId || actor.npcId === targetId);
    const actor = enemy ?? ally;
    if (!actor) return { handled: false, damage: 0 };
    if (actor.hp <= 0 || actor.action === 'dead' || actor.active === false) return { handled: true, damage: 0 };
    const before = actor.hp;
    const attribution = { by: sourceId, source, spell: true, spellId };
    if (enemy) hurtEnemy(actor, damage, yaw, attribution);
    else hurtAlly(actor, { id: sourceId, x: position.x, z: position.z, yaw }, damage, attribution);
    return { handled: true, id: actor.id, npcId: actor.npcId, team: enemy ? 'enemy' : 'ally',
      damage: Math.max(0, before - actor.hp), hp: actor.hp, maxHp: actor.maxHp,
      killed: actor.hp <= 0, spared: !!(actor.spared || actor.wounded), x: actor.x, z: actor.z };
  }

  // Ally spells share the traveler's fireball numbers, but remain in the combat
  // roster so their view, damage attribution and interruption follow the caster.
  function launchFireball(ally, target) {
    const profile = { ...ALLY_FIREBALL, damage: Math.round(ALLY_FIREBALL.damage * allyDamageScale(ally.level ?? 1)) };
    const yaw = Math.atan2(target.x - ally.x, target.z - ally.z);
    ally.yaw = yaw;
    const ball = { id: `ally-fireball-${ally.id}-${++allySpells}`, owner: ally.id, targetId: target.id,
      x: ally.x, z: ally.z, y: floorAt(ally.x, ally.z) + 1.2, yaw, flown: 0,
      origin: { x: ally.x, z: ally.z }, profile };
    state.fireballs.push(ball);
    emit('ally-fireball', { ...ball, sourceId: ally.id });
  }

  function updateFireballs(dt) {
    if (state.phase !== 'active') { state.fireballs = []; return; }
    for (const ball of [...state.fireballs]) {
      const before = { x: ball.x, z: ball.z }, travel = Math.min(ball.profile.speed * dt, ball.profile.range - ball.flown);
      ball.x += Math.sin(ball.yaw) * travel; ball.z += Math.cos(ball.yaw) * travel; ball.flown += travel;
      let reason = !meleeLineClear(before, ball, world) ? 'solid' : floorAt(ball.x, ball.z) > ball.y ? 'ground' : null;
      let target = null;
      if (!reason) {
        const roster = [...state.enemies.map(actor => ({ ...actor, team: 'enemy', actor })),
          ...state.allies.map(actor => ({ ...actor, team: 'ally', actor })),
          { ...player, id: 'traveler', x: position.x, z: position.z, team: 'player', actor: player },
          ...otherBodies().map(actor => ({ ...actor, team: 'world' }))];
        target = roster.find(actor => actor.id !== ball.owner && actor.active !== false && actor.hp !== 0
          && actor.action !== 'dead' && distance(actor, ball) <= ball.profile.radius + (actor.r ?? BODY.person));
        if (target) {
          reason = 'target';
          const impact = { id: `impact-${ball.id}`, source: 'ally', sourceId: ball.owner, spell: true, spellId: 'fireball',
            weaponId: 'wand', targetId: target.id, ...(target.npcId ? { targetNpcId: target.npcId } : {}),
            origin: { ...ball.origin }, x: ball.x, y: ball.y, z: ball.z, yaw: ball.yaw, damage: ball.profile.damage,
            encounterId: state.encounterId, bout: !!lastEncounter.bout, combatantIds: combatantIds(), affectedIds: [], hits: [] };
          const beforeHp = target.actor?.hp;
          const attribution = { by: ball.owner, source: 'ally', spell: true, spellId: 'fireball', weaponId: 'wand', impactId: impact.id };
          if (target.team === 'enemy') hurtEnemy(target.actor, ball.profile.damage, ball.yaw, attribution);
          else if (target.team === 'ally') hurtAlly(target.actor, { ...ball.origin, yaw: ball.yaw }, ball.profile.damage, attribution);
          else if (target.team === 'player') hurtPlayer({ ...ball.origin, id: ball.owner, yaw: ball.yaw }, ball.profile.damage, attribution);
          if (target.actor && target.actor.hp < beforeHp) {
            impact.affectedIds.push(target.id);
            impact.hits.push({ id: target.id, ...(target.npcId ? { npcId: target.npcId } : {}), team: target.team,
              damage: beforeHp - target.actor.hp, hp: target.actor.hp, maxHp: target.actor.maxHp, killed: target.actor.hp <= 0,
              ...(target.actor.spared || target.actor.wounded ? { spared: true } : {}), x: target.actor.x ?? position.x, z: target.actor.z ?? position.z });
          }
          emit('spell-impact', impact);
        } else if (ball.flown >= ball.profile.range - 1e-6) reason = 'spent';
      }
      if (reason) {
        state.fireballs = state.fireballs.filter(other => other !== ball);
        emit('ally-fireball-ended', { id: ball.id, sourceId: ball.owner, x: ball.x, y: ball.y, z: ball.z, reason, targetId: target?.id ?? null });
      }
    }
  }

  function hurtPlayer(enemy, baseDamage, attribution = {}, atContact = false) {
    // A dodge that actually avoided a strike is the thing Toughness is paid for, and the engine
    // is the only one who knows it happened: the enemy's contact moment arrived and the traveler
    // was invulnerable for it. `hurtProtection` is the second and a bit after being hit, which is
    // mercy rather than skill, so it does not count.
    if (player.invulnerable && player.action === 'dodge' && state.phase === 'active' && player.hp > 0) {
      emit('dodged', { enemyId: enemy.id, x: position.x, z: position.z, level: lastEncounter.level ?? 0 });
    }
    if (player.invulnerable || (!atContact && state.phase !== 'active') || player.hp <= 0) return;
    // What he is wearing turns a share of it, and never all of one: at the very best - heavy,
    // tier 6, all three pieces - armour turns half (src/gear.js).
    const struck = baseDamage;
    const damage = Math.max(1, Math.round(struck * (1 - (margins().armourTurns ?? 0))));
    // A bout can kill nobody, the traveler included: his health stops at one and he yields.
    const floor = killFloor();
    const spent = () => {
      if (!player.hp) { fall(); return true; }
      if (floor && player.hp <= floor) { endBout('teacher'); return true; }
      return false;
    };
    // **The shield.** A blow that comes at his front while he is on guard is caught: the shield
    // takes its share, the rest of it costs him wind, and - the whole point of holding it - it
    // does not rock him, so the guard is still up for the next one. It buys no invulnerable
    // moment: a dodge is still the only thing that makes a blow miss, and a man who guards
    // everything runs out of wind and is rocked like anybody else.
    const fromBlow = Math.atan2(enemy.x - position.x, enemy.z - position.z);
    if (guarding() && Math.abs(angleDifference(guardYaw, fromBlow)) < GUARD_ARC) {
      const { guardShare = 0, guardCost = 0 } = margins();
      const absorbed = Math.round(damage * guardShare), through = Math.max(1, damage - absorbed);
      player.hp = Math.max(floor, player.hp - through);
      player.stamina = Math.max(0, player.stamina - guardCost);
      staminaDelay = Math.max(staminaDelay, .45);
      emit('caught', { enemyId: enemy.id, absorbed, damage: through, x: position.x, z: position.z, level: lastEncounter.level ?? 0 });
      emit('player-hit', { damage: through, caught: true, x: position.x, z: position.z, level: lastEncounter.level ?? 0, ...attribution });
      spent();
      return;
    }
    player.hp = Math.max(floor, player.hp - damage);
    player.action = player.hp ? 'hurt' : 'dead';
    player.progress = 0;
    actionTime = 0;
    bufferedAttack = false;
    hurtProtection = 1.15;
    player.invulnerable = true;
    moveCombatant(position, Math.sin(enemy.yaw) * .55, Math.cos(enemy.yaw) * .55);
    emit('player-hit', { damage, x: position.x, z: position.z, level: lastEncounter.level ?? 0, ...attribution });
    spent();
  }

  /**
   * **An arrow in the traveler's own back** (the user, 2026-09-21: real friendly fire, the
   * traveler's arrows and Jerry's alike). It is not a blow from an enemy and it does not come
   * through `hurtPlayer`: there is nobody standing there to take a knockback from, nothing to
   * dodge that was ever aimed at him, and no shield in the world is up against a shaft he never
   * saw. What it shares with a blow is everything after the damage - armour turns its share, the
   * bar, the rock, the defeat - so those are spelled the same way and nothing else is.
   */
  function hurtPlayerByArrow(arrow) {
    if (player.invulnerable || state.phase !== 'active' || player.hp <= 0) return;
    const damage = Math.max(1, Math.round(arrow.damage * (1 - (margins().armourTurns ?? 0))));
    const floor = killFloor();
    player.hp = Math.max(floor, player.hp - damage);
    // The floor is the bottom, so a man standing on it is hurt and not dead - spelled exactly as
    // `hurtPlayer` spells it, because a bout ends in a yield and never in a body.
    player.action = player.hp ? 'hurt' : 'dead';
    player.progress = 0;
    actionTime = 0;
    bufferedAttack = false;
    hurtProtection = 1.15;
    player.invulnerable = true;
    emit('player-hit', { damage, arrow: true, by: arrow.owner ?? 'traveler', source: arrow.owner ? 'ally' : 'player',
      impactId: `impact-${arrow.id}`, x: position.x, z: position.z, level: lastEncounter.level ?? 0 });
    if (!player.hp) fall();
    else if (floor && player.hp <= floor) endBout('teacher');
  }
  /**
   * **A friend struck by a shaft is hurt by it**, and the man who loosed it is named, because
   * everything the host has to do about it afterwards turns on whose arrow it was: a companion
   * killed by the traveler's own arrow is recorded as that and costs every living witness a rung
   * (src/companions.js), and one merely hit says a short word about it.
   *
   * Unarmed bystanders take the same physical hit. Ordinary world NPC health is owned by the
   * host and receives `arrow-impact` instead of being duplicated in this encounter.
   */
  function hurtAllyByArrow(ally, arrow) {
    if (!ally.active) return;
    const timers = allyTimers.get(ally.id);
    const floor = killFloor();
    const damage = Math.max(1, Math.round(arrow.damage));
    ally.hp = Math.max(floor, ally.hp - damage);
    // Spelled exactly as `hurtAlly` spells it: a man standing on the floor is hurt, not dead,
    // which is what makes a lesson a lesson.
    ally.action = ally.hp ? 'hurt' : 'dead';
    ally.active = ally.hp > 0;
    if (ally.frozen) ally.frozen = 0;
    if (!ally.active && ally.spared) ally.wounded = true;
    ally.progress = 0;
    ally.speed = 0;
    timers.actionTime = 0;
    timers.hitApplied = false;
    const by = arrow.owner ?? 'traveler';
    const attribution = { arrow: true, by, source: arrow.owner ? 'ally' : 'player', impactId: `impact-${arrow.id}` };
    emit('ally-hit', { id: ally.id, damage, x: ally.x, z: ally.z, ...attribution });
    if (!ally.active) emit(ally.spared ? 'ally-wounded' : 'ally-down', { id: ally.id, x: ally.x, z: ally.z, ...attribution });
  }

  /** The fight is over and he lost it. One place, so the shield's path cannot drift from the other. */
  function fall() {
    player.action = 'dead';
    state.phase = 'defeated';
    state.enemies.forEach(target => {
      if (target.active) { target.action = 'idle'; target.progress = 0; target.speed = 0; }
    });
    emit('defeat', { encounterId: state.encounterId });
  }

  function updatePlayer(dt) {
    staminaDelay = Math.max(0, staminaDelay - dt);
    hurtProtection = Math.max(0, hurtProtection - dt);
    // The part of a dodge that cannot be hurt. Toughness lengthens it, from .37 s to .48 s at
    // level 99 - forgiving, never automatic, and never long enough to make a dodge unnecessary.
    player.invulnerable = hurtProtection > 0 || (player.action === 'dodge' && actionTime < margins().dodgeWindow);
    // Read once a frame so the view, the HUD and the autopilot all see the same shield.
    player.guarding = guarding();
    // And the draw, which is the other held verb. It only ever grows while it is actually on:
    // a blow, an empty quiver or a spent bar all take the bow down without sending anything -
    // and a blow says so, which is what `loseDraw` is for.
    if (drawing()) drawTime += dt; else loseDraw();
    player.drawing = drawing();
    player.draw = player.drawing ? drawnBy(drawTime, margins().drawTime ?? 1) : 0;
    if (!staminaDelay && player.action !== 'dead') player.stamina = Math.min(player.maxStamina, player.stamina + 24 * dt);
    if (player.action === 'idle') { player.progress = 0; return; }
    const previousTime = actionTime;
    actionTime += dt;
    if (player.action === 'attack') {
      const swing = swingOf(player.combo, attackWeapon);
      player.progress = clamp(actionTime / swing.duration, 0, 1);
      const advanceTime = Math.max(0, Math.min(actionTime, swing.contact) - Math.min(previousTime, swing.contact));
      const lungeSpeed = player.combo === 2 ? 1.8 : 1.4;
      moveCombatant(position, Math.sin(player.yaw) * advanceTime * lungeSpeed, Math.cos(player.yaw) * advanceTime * lungeSpeed);
      if (!hitApplied && actionTime >= swing.contact) {
        hitApplied = true;
        applyPlayerStrike();
      }
      if (actionTime >= swing.duration) {
        comboNext = (player.combo + 1) % SWINGS.length;
        comboUntil = time + .85;
        player.action = 'idle';
        player.progress = 0;
        if (bufferedAttack) beginAttack(player.yaw);
      }
    } else if (player.action === 'dodge') {
      player.progress = clamp(actionTime / DODGE_DURATION, 0, 1);
      // Ease out the travel but retain a short recovery pose. Sweep through world collisions.
      const travel = t => 1 - (1 - clamp(t / DODGE_TRAVEL_TIME, 0, 1)) ** 2;
      // Mail and plate shorten the step aside: the timing is the same, the ground covered is not.
      const amount = (travel(actionTime) - travel(previousTime)) * DODGE_DISTANCE * (margins().dodgeScale ?? 1);
      moveCombatant(position, dodgeDirection.x * amount, dodgeDirection.z * amount);
      if (actionTime >= DODGE_DURATION) { player.action = 'idle'; player.progress = 0; }
    } else if (player.action === 'hurt') {
      player.progress = clamp(actionTime / .46, 0, 1);
      if (actionTime >= .46) { player.action = 'idle'; player.progress = 0; }
    } else if (player.action === 'dead') player.progress = clamp(actionTime / .8, 0, 1);
    // The part of a dodge that cannot be hurt. Toughness lengthens it, from .37 s to .48 s at
    // level 99 - forgiving, never automatic, and never long enough to make a dodge unnecessary.
    player.invulnerable = hurtProtection > 0 || (player.action === 'dodge' && actionTime < margins().dodgeWindow);
  }

  function steerEnemy(enemy, target, step, separation = true) {
    const yaw = Math.atan2(target.x - enemy.x, target.z - enemy.z);
    const offsets = [0, .45, -.45, .9, -.9, 1.4, -1.4];
    /**
     * **They leave their own ground to come after an archer** (the user, 2026-09-21), and never
     * further than the fight's own outer limit; past that it is a retreat, as it already is.
     *
     * The arena was drawn for men with swords and it bounded the enemy without bounding the
     * traveler, so a bow carrying thirty-four metres could be fired from twelve metres across a
     * box eight metres wide: the hunter won the border battle alone and untouched, 304 arrows in
     * seven minutes, with the nearest living soldier stuck 3.8 m away (docs/known-issues.md).
     *
     * **While what they are steering at is on the arena the bound is the arena**, to the metre -
     * which is what keeps every melee already measured the melee it was, and it is the whole of
     * the condition below.
     */
    const arena = fightBox(lastEncounter), loose = !insideBox(arena, target);
    for (const offset of offsets) {
      const x = enemy.x + Math.sin(yaw + offset) * step;
      const z = enemy.z + Math.cos(yaw + offset) * step;
      if (!(insideBox(arena, { x, z }) || (loose && !outsideTheFight({ x, z }))) || !canStand(x, z, world, .43)) continue;
      if (separation && state.enemies.some(other => {
        if (other === enemy || !other.active) return false;
        // A lunge can briefly overlap a neighbor: allow movement that opens that gap,
        // otherwise the whole group can become permanently stuck after a reaction.
        const minimum = Math.min(.93, distance(enemy, other) - .001);
        return Math.hypot(other.x - x, other.z - z) < minimum;
      })) continue;
      if (closesGap(enemy, { x, z }, position, 1.1)) continue;
      if (state.allies.some(ally => ally.active && closesGap(enemy, { x, z }, ally, .9))) continue;
      const before = { x: enemy.x, z: enemy.z };
      moveCombatant(enemy, x - enemy.x, z - enemy.z);
      const moved = distance(before, enemy); if (moved > 1e-8) return moved;
    }
    return 0;
  }

  function updateEnemy(enemy, dt) {
    const timers = enemyTimers.get(enemy.id);
    timers.actionTime += dt;
    timers.cooldown = Math.max(0, timers.cooldown - dt);
    enemy.speed = 0;
    if (enemy.action === 'dead') { enemy.progress = clamp(timers.actionTime / .85, 0, 1); return; }
    if (enemy.action === 'hurt') {
      const duration = enemy.kind === 'dummy' ? .32 : .44;
      enemy.progress = clamp(timers.actionTime / duration, 0, 1);
      if (timers.actionTime >= duration) { enemy.action = 'idle'; enemy.progress = 0; }
      return;
    }
    if (enemy.kind === 'dummy' || state.phase !== 'active') return;
    const profile = ENEMY_KINDS[enemy.kind] ?? ENEMY_KINDS.goblin;
    // A charge has its own tell, its own rush and its own narrow lane; everything else about it
    // is the kind's own swing, read from the same fields in the same order.
    const rush = enemy.charging ? profile.charge : null;
    if (enemy.action === 'windup') {
      const tell = rush ? rush.tell : profile.tell;
      enemy.progress = clamp(timers.actionTime / tell, 0, 1);
      // Aim is locked for the whole tell; a sidestep or dodge can beat the actual strike.
      // A kind with an `aimLock` instead keeps turning until that much of the tell has
      // gone by, and only then commits: a dodge thrown the moment the arc appears is
      // followed round, and the strike is beaten by waiting for the commitment and
      // moving late. A long tell is what makes that readable rather than unfair.
      if (profile.aimLock && enemy.progress < profile.aimLock) {
        const tracked = timers.targetId ? state.allies.find(ally => ally.id === timers.targetId && ally.active) : null;
        const aim = tracked ?? position;
        enemy.yaw += angleDifference(Math.atan2(aim.x - enemy.x, aim.z - enemy.z), enemy.yaw) * Math.min(1, dt * 5);
      }
      if (timers.actionTime >= tell) {
        enemy.action = 'attack';
        enemy.progress = 0;
        timers.actionTime -= tell;
        timers.hitApplied = false;
      }
      return;
    }
    if (enemy.action === 'attack') {
      const duration = rush ? rush.attack : profile.attack, contact = rush ? rush.contact : profile.contact;
      enemy.progress = clamp(timers.actionTime / duration, 0, 1);
      // A committed lunge carries the strike forward, but stops short of standing
      // inside whoever it is aimed at: a creature with reach does not need to. A rush is the
      // same movement with the charge's own speed under it, and it stops the same way.
      if (timers.actionTime <= contact && distance(enemy, position) > (profile.standoff ?? 0) * .85)
        moveCombatant(enemy, Math.sin(enemy.yaw) * dt * (rush ? rush.speed : profile.lunge), Math.cos(enemy.yaw) * dt * (rush ? rush.speed : profile.lunge));
      if (!timers.hitApplied && timers.actionTime >= contact) {
        timers.hitApplied = true;
        const reach = rush ? rush.reach : profile.reach, arc = rush ? rush.arc : (profile.arc ?? Math.PI * .25);
        applyMeleeStrike(enemy, 'enemy', { range: reach, arc, damage: Math.round(profile.damage * countryDamage(lastEncounter.level ?? 0)) });
      }
      if (timers.actionTime >= duration && state.phase === 'active') {
        enemy.action = 'idle';
        enemy.progress = 0;
        enemy.charging = false;
        timers.cooldown = rush ? rush.recovery : profile.recovery;
        nextAttackerAt = time + .55;
      }
      return;
    }
    if (timers.entry > 0) { timers.entry = Math.max(0, timers.entry - dt); return; }
    const focus = enemyTarget(enemy), aim = focus.point;
    const dist = distance(enemy, aim);
    const targetYaw = Math.atan2(aim.x - enemy.x, aim.z - enemy.z);
    enemy.yaw += angleDifference(targetYaw, enemy.yaw) * Math.min(1, dt * 7);
    const swinging = state.enemies.filter(other => other.active && ['windup', 'attack'].includes(other.action)).length;
    const someoneAttacking = swinging > 0;
    // Most kinds take turns; soldiers (`pack`) press two at a time.
    if (dist <= profile.engage && timers.cooldown <= 0 && swinging < (profile.pack ?? 1) && (time >= nextAttackerAt || swinging > 0)) {
      enemy.action = 'windup';
      enemy.charging = false;
      enemy.yaw = targetYaw;
      enemy.progress = 0;
      timers.actionTime = 0;
      timers.targetId = focus.ally?.id ?? null;
      emit('windup', { id: enemy.id, targetId: timers.targetId });
      return;
    }
    /**
     * **And a creature that charges, charges** (the user, 2026-09-21). The dwell is unbroken:
     * `awayFor` is counted only here, in the one branch where it is neither swinging nor getting
     * over a swing, and a single frame inside `from` puts it back to nought - so a step back in a
     * melee is not a charge and a man who walks away is.
     */
    if (profile.charge) {
      timers.awayFor = dist > profile.charge.from ? (timers.awayFor ?? 0) + dt : 0;
      if (timers.awayFor >= profile.charge.after && timers.cooldown <= 0 && !someoneAttacking) {
        timers.awayFor = 0;
        enemy.action = 'windup';
        enemy.charging = true;
        enemy.yaw = targetYaw;
        enemy.progress = 0;
        timers.actionTime = 0;
        timers.targetId = focus.ally?.id ?? null;
        emit('windup', { id: enemy.id, targetId: timers.targetId, charge: true });
        return;
      }
    }
    const desiredDistance = Math.max(someoneAttacking ? 2.7 : 1.8, profile.standoff ?? 0);
    if (dist > desiredDistance) {
      // After the traveler an enemy keeps to the middle of its ground (8 m across the arena, 16 m
      // along it, whichever way it runs); after a villager running for cover it follows as far as
      // the villager can go.
      const c = lastEncounter.center, wide = !!focus.ally?.refuge, alongX = lastEncounter.retreatAxis === 'x';
      const box = wide ? fightBox(lastEncounter)
        : { minX: c.x - (alongX ? 16 : 8), maxX: c.x + (alongX ? 16 : 8), minZ: c.z - (alongX ? 8 : 16), maxZ: c.z + (alongX ? 8 : 16) };
      /**
       * **Shot from where they cannot reach, they come after you** (the user, 2026-09-21).
       *
       * An enemy after the traveler steers at a point clamped into the middle of its ground, and
       * that clamp is the standoff: a man twelve metres across the arena was chased to a spot
       * eight metres across it and no further, so the hunter won the border battle alone and
       * untouched with 304 arrows over seven minutes and the nearest living soldier stuck 3.8 m
       * away, unable to close (docs/known-issues.md, round 5).
       *
       * The trigger is the user's own words, and it is **reach** and not a box: if standing on
       * the edge of its ground would still leave it out of reach of him, the ground is the wrong
       * bound and it leaves the ground. Where the clamp was doing its job - keeping a fight in
       * the middle of the arena while the traveler is somewhere a man can still be met - it is
       * untouched, and a point already inside the box clamps to itself, so a melee fought on the
       * fight's own ground does not move at all.
       *
       * Nothing bounds the chase but the fight's own outer limit, which `steerEnemy` applies and
       * which is the same line a traveler retreats over: no second radius, for nobody to tune out
       * of step with the first.
       */
      const clamped = { x: clamp(aim.x, box.minX, box.maxX), z: clamp(aim.z, box.minZ, box.maxZ) };
      const target = distance(clamped, aim) <= profile.engage ? clamped : { x: aim.x, z: aim.z };
      const speed = profile.speed + (enemy.id === 'goblin-scout' ? .15 : 0);
      const amount = steerEnemy(enemy, target, Math.min(speed * dt, Math.max(0, dist - desiredDistance)));
      enemy.speed = amount / dt;
    }
  }

  // Allies: Army soldiers who join an encounter, close on the nearest enemy and
  // strike with the same tell-then-swing rhythm. Enemies treat them as targets.
  function makeAlly(spec, index) {
    const profile = ALLY_KINDS[spec.kind];
    // His own level, and nothing of the country's. A companion is handed one from what he knows
    // (MERCENARY_ARMS in src/companions.js); a side's soldier has his kind's. Health is worked
    // out once, here, exactly as the enemy's is.
    const level = spec.level ?? profile.level ?? 1;
    // Two ways of being tough, because there are two kinds of ally. A **companion** is a person
    // with a Toughness of his own, and his health is that skill's own number, exactly as the
    // traveler's is - a mercenary at 42 stands anywhere with about 225. A **kind** - a
    // legionary, a villager - has no name and no skills, so his kind's health is what he has and
    // his kind's level scales it, which at level 1 is today's number untouched.
    const hp = Number.isFinite(spec.toughness)
      ? Math.round(maxHealth(spec.toughness))
      : Math.round((spec.hp ?? profile.hp) * allyHealthScale(level));
    const ally = { id: spec.id, name: spec.name, kind: spec.kind, level, ...(spec.npcId ? { npcId: spec.npcId } : {}), ...(spec.model ? { model: spec.model } : {}), ...safePoint(spec.x, spec.z), yaw: 0,
      hp, maxHp: hp, action: 'idle', progress: 0, speed: 0, active: true,
      ...(spec.refuge ? { refuge: { ...spec.refuge }, frozen: profile.freeze ?? 0, escaped: false } : {}),
      ...(spec.spared ? { spared: true } : {}), ...(spec.capturable ? { capturable: true } : {}), ...(spec.armed !== undefined ? { armed: spec.armed } : {}) };
    allyTimers.set(ally.id, { actionTime: 0, cooldown: .4 + index * .3, hitApplied: false, targetId: null });
    return withCurrentHealth(ally, spec);
  }

  function withCurrentHealth(actor, spec) {
    if (spec.currentHp !== undefined) {
      actor.hp = Math.min(actor.maxHp, spec.currentHp);
      actor.active = actor.hp > 0;
      if (!actor.active) { actor.action = 'dead'; actor.progress = 1; }
    }
    return actor;
  }

  function clearAllies() { state.allies = []; allyTimers.clear(); }

  /** The nearest standing target for an enemy: the traveler or a living ally. */
  function enemyTarget(enemy) {
    let best = { point: position, ally: null }, bestDistance = distance(enemy, position);
    for (const ally of state.allies) {
      if (!ally.active) continue;
      const d = distance(enemy, ally);
      if (d < bestDistance) { best = { point: ally, ally }; bestDistance = d; }
    }
    return best;
  }

  function hurtAlly(ally, enemy, baseDamage, attribution = {}) {
    if (!ally.active) return;
    const damage = Math.max(1, Math.round(baseDamage));
    const timers = allyTimers.get(ally.id);
    ally.hp = Math.max(killFloor(), ally.hp - damage);
    ally.action = ally.hp ? 'hurt' : 'dead';
    ally.active = ally.hp > 0;
    // Struck, a frozen villager stops freezing and runs.
    if (ally.frozen) ally.frozen = 0;
    // Captors take this person alive; friendly fire remains lethal. Unlike the
    // unconditional spared policy, capturable depends on who struck the blow.
    const spared = ally.spared || (ally.capturable && attribution.source === 'enemy');
    if (!ally.hp && spared) ally.wounded = true;
    ally.progress = 0;
    ally.speed = 0;
    timers.actionTime = 0;
    timers.hitApplied = false;
    moveCombatant(ally, Math.sin(enemy.yaw) * .4, Math.cos(enemy.yaw) * .4);
    emit('ally-hit', { id: ally.id, damage, x: ally.x, z: ally.z, ...attribution });
    if (!ally.hp) emit(spared ? 'ally-wounded' : 'ally-down', { id: ally.id, x: ally.x, z: ally.z,
      ...(spared ? { spared: true } : {}), ...attribution });
  }

  /**
   * **Who is between this archer and what he is aiming at.** The traveler, every other living
   * ally, and everybody in the world who is not in the fight - a villager crossing behind the
   * line, a horse on its picket - because an arrow now stops on all three and the man loosing it
   * can see them perfectly well.
   *
   * The corridor is a little wider than the width an arrow actually strikes a body at
   * (`BOW.corridor` against `BOW.body`), so the margin is his and not the shaft's.
   */
  function friendInLine(archer, target) {
    const friends = [{ id: 'traveler', x: position.x, z: position.z },
      ...state.allies.filter(one => one !== archer && one.active && one.action !== 'dead'),
      ...otherBodies()];
    return inTheLine(archer, target, friends, { far: BOW.body });
  }
  /** A step along the line rather than down it: the archer looking for a lane he can shoot in. */
  function shiftAlly(ally, target, profile, dt) {
    const yaw = Math.atan2(target.x - ally.x, target.z - ally.z);
    for (const side of [1, -1]) {
      const to = { x: ally.x + Math.cos(yaw) * side * 3, z: ally.z - Math.sin(yaw) * side * 3 };
      const moved = steerAlly(ally, to, Math.min(profile.speed * dt, 3));
      if (moved > 0) { ally.speed = moved / dt; return; }
    }
  }

  function steerAlly(ally, target, step) {
    const yaw = Math.atan2(target.x - ally.x, target.z - ally.z);
    for (const offset of [0, .45, -.45, .9, -.9, 1.4, -1.4]) {
      const x = ally.x + Math.sin(yaw + offset) * step;
      const z = ally.z + Math.cos(yaw + offset) * step;
      if (!insideBox(fightBox(lastEncounter), { x, z }) || !canStand(x, z, world, .43)) continue;
      if (closesGap(ally, { x, z }, position, .9)) continue;
      if (state.allies.some(other => other !== ally && other.active && closesGap(ally, { x, z }, other, .9))) continue;
      if (state.enemies.some(other => other.active && closesGap(ally, { x, z }, other, 1.0))) continue;
      const before = { x: ally.x, z: ally.z };
      moveCombatant(ally, x - ally.x, z - ally.z);
      const moved = distance(before, ally); if (moved > 1e-8) return moved;
    }
    return 0;
  }

  function updateAlly(ally, dt) {
    const timers = allyTimers.get(ally.id), profile = ALLY_KINDS[ally.kind];
    timers.actionTime += dt;
    timers.cooldown = Math.max(0, timers.cooldown - dt);
    ally.speed = 0;
    if (ally.action === 'dead') { ally.progress = clamp(timers.actionTime / .85, 0, 1); return; }
    if (ally.action === 'hurt') {
      ally.progress = clamp(timers.actionTime / .44, 0, 1);
      if (timers.actionTime >= .44) { ally.action = 'idle'; ally.progress = 0; }
      return;
    }
    if (state.phase !== 'active') { ally.action = 'idle'; ally.progress = 0; return; }
    const foes = state.enemies.filter(enemy => enemy.active && enemy.action !== 'dead');
    if (profile.flees) { fleeAlly(ally, foes, profile, dt); return; }
    if (!foes.length) { ally.action = 'idle'; ally.progress = 0; return; }
    if (ally.action === 'windup') {
      ally.progress = clamp(timers.actionTime / profile.tell, 0, 1);
      if (timers.actionTime >= profile.tell) { ally.action = 'attack'; ally.progress = 0; timers.actionTime -= profile.tell; timers.hitApplied = false; }
      return;
    }
    if (ally.action === 'attack') {
      ally.progress = clamp(timers.actionTime / profile.attack, 0, 1);
      if (!profile.bow && !profile.spell && timers.actionTime <= profile.contact) moveCombatant(ally, Math.sin(ally.yaw) * dt * 1.2, Math.cos(ally.yaw) * dt * 1.2);
      if (!timers.hitApplied && timers.actionTime >= profile.contact) {
        timers.hitApplied = true;
        // **An archer does not reach anybody: he sends something.** The arrow is the same arrow
        // the traveler's is, in the same list, travelling the same way and stopped by the same
        // trees - his own complaint about woodland is one rule, not two.
        if (profile.spell) {
          const aim = foes.filter(enemy => distance(ally, enemy) <= profile.reach && !friendInLine(ally, enemy)
            && meleeLineClear(ally, enemy, world)).sort((a, b) => distance(ally, a) - distance(ally, b))[0];
          if (aim) launchFireball(ally, aim);
        } else if (profile.bow) {
          // **He never shoots a friend on purpose** (the user, 2026-09-21). Asked again at the
          // moment the string goes, because the man he was aiming past may have stepped into it
          // while he was drawing: then he holds the shot and the cooldown is spent on nothing,
          // which is an archer waiting for a lane rather than an archer with a rule.
          const aim = foes.filter(enemy => distance(ally, enemy) <= profile.reach && !friendInLine(ally, enemy))
            .sort((a, b) => distance(ally, a) - distance(ally, b))[0];
          if (aim) {
            const yaw = Math.atan2(aim.x - ally.x, aim.z - ally.z);
            ally.yaw = yaw;
            state.arrows.push({ id: `ally-arrow-${ally.id}-${++allyShafts}`, n: 0, owner: ally.id,
              x: ally.x, z: ally.z, y: floorAt(ally.x, ally.z) + BOW.height, yaw, flown: 0, range: profile.reach,
              damage: Math.round(profile.damage * allyDamageScale(ally.level ?? 1)) });
          }
          emit('ally-strike', { id: ally.id, targetId: aim?.id ?? null, x: ally.x, z: ally.z, loosed: !!aim });
        } else {
          const impact = applyMeleeStrike(ally, 'ally', { range: profile.reach, arc: Math.PI * .3,
            damage: profile.damage * allyDamageScale(ally.level ?? 1) });
          emit('ally-strike', { id: ally.id, targetId: impact.hits.find(hit => hit.team === 'enemy')?.id ?? null, x: ally.x, z: ally.z });
        }
      }
      if (timers.actionTime >= profile.attack) { ally.action = 'idle'; ally.progress = 0; timers.cooldown = profile.recovery; }
      return;
    }
    foes.sort((a, b) => distance(ally, a) - distance(ally, b));
    const target = foes[0], dist = distance(ally, target);
    const targetYaw = Math.atan2(target.x - ally.x, target.z - ally.z);
    ally.yaw += angleDifference(targetYaw, ally.yaw) * Math.min(1, dt * 8);
    // A sorcerer needs room to finish his cast. He can still cast when backed
    // against a wall, but does not walk into sword range to land a spell.
    if (profile.spell && dist < profile.standoff) {
      const away = { x: ally.x - Math.sin(targetYaw) * (profile.standoff - dist), z: ally.z - Math.cos(targetYaw) * (profile.standoff - dist) };
      ally.speed = steerAlly(ally, away, Math.min(profile.speed * dt, profile.standoff - dist)) / dt;
      if (ally.speed > 0) return;
    }
    if (dist <= profile.engage && timers.cooldown <= 0) {
      // **An archer does not begin a draw down a lane with a friend in it.** He shifts along the
      // line until he has a clear one, which is what a man does, and it keeps the corridor rule
      // out of the part of the frame where the arrow is already gone.
      if ((profile.bow || profile.spell) && (friendInLine(ally, target) || (profile.spell && !meleeLineClear(ally, target, world)))) { shiftAlly(ally, target, profile, dt); return; }
      ally.action = 'windup'; ally.yaw = targetYaw; ally.progress = 0; timers.actionTime = 0;
      emit('ally-windup', { id: ally.id, targetId: target.id, ...(profile.spell ? { spellId: profile.spell } : {}) });
      return;
    }
    // An archer keeps his distance rather than closing to arm's length: he walks up to where he
    // can see, and backs off anything that gets inside his standoff.
    const keep = profile.bow || profile.spell ? (profile.standoff ?? 9) : 1.7;
    if (profile.bow && dist < keep) {
      const away = { x: ally.x - Math.sin(targetYaw) * (keep - dist), z: ally.z - Math.cos(targetYaw) * (keep - dist) };
      ally.speed = steerAlly(ally, away, Math.min(profile.speed * dt, keep - dist)) / dt;
      return;
    }
    if (dist > keep) ally.speed = steerAlly(ally, target, Math.min(profile.speed * dt, Math.max(0, dist - keep))) / dt;
  }

  /** A villager with nothing to fight with: frozen at first, then running for its refuge. */
  function fleeAlly(ally, foes, profile, dt) {
    ally.action = 'idle'; ally.progress = 0;
    if (ally.escaped) return;
    const foe = foes.slice().sort((a, b) => distance(ally, a) - distance(ally, b))[0];
    if (ally.frozen > 0) {
      // Rooted to the spot, watching the nearest of them, until struck, reached, or it breaks and runs.
      ally.frozen = distance(ally, position) < 5 ? 0 : ally.frozen - dt;
      if (foe) ally.yaw += angleDifference(Math.atan2(foe.x - ally.x, foe.z - ally.z), ally.yaw) * Math.min(1, dt * 6);
      return;
    }
    // A blade raised at it, close: it cowers instead of running, and the blow lands unless the traveler is there first.
    if (state.enemies.some(enemy => enemy.active && enemy.action === 'windup' && enemyTimers.get(enemy.id)?.targetId === ally.id && distance(enemy, ally) < 3.2)) return;
    const gap = distance(ally, ally.refuge);
    if (gap < 1) {
      ally.escaped = true; ally.active = false;
      emit('ally-escaped', { id: ally.id, x: ally.x, z: ally.z });
      return;
    }
    ally.yaw += angleDifference(Math.atan2(ally.refuge.x - ally.x, ally.refuge.z - ally.z), ally.yaw) * Math.min(1, dt * 10);
    ally.speed = steerAlly(ally, ally.refuge, Math.min(profile.speed * dt, gap)) / dt;
  }

  function update(dt) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    // The world's other bodies are the host's list and move with the frame, so they are asked for
    // once a frame rather than once a substep, however many arrows are in the air.
    bodiesThisUpdate = null;
    worldBodiesThisUpdate = null;
    motionBodies = null;
    // Substeps preserve contact windows and swept movement through occasional slow frames.
    let remaining = Math.min(dt, 10);
    while (remaining > 1e-9) {
      const step = Math.min(remaining, 1 / 120);
      remaining -= step;
      time += step;
      if (state.phase === 'active' && !independentFightHeld() && (beyondTheLine(position)
        || (lastEncounter.id !== DEFAULT_ENCOUNTER.id && distance(position, lastEncounter.center) > LEASH))) {
        // Walking out of a bout is not a retreat and must never be reported as one: there is
        // nothing to catch your breath from and nobody held the ground without you.
        if (lastEncounter.bout) endBout('walked-away');
        else {
          disengage();
        }
      }
      updatePlayer(step);
      updateArrows(step);
      updateFireballs(step);
      state.enemies.forEach(enemy => updateEnemy(enemy, step));
      state.allies.forEach(ally => updateAlly(ally, step));
    }
  }

  function pose() {
    const weapon = player.action === 'attack' && attackWeapon ? attackWeapon : currentWeapon();
    return {
      action: player.action, progress: player.progress, combo: player.combo,
      armed: weaponReady, alert: state.phase === 'active',
      weaponId: weapon?.id, weaponUsable: weapon?.usable ?? false,
    };
  }

  function movementScale() {
    if (['dodge', 'hurt', 'dead'].includes(player.action)) return 0;
    // A man at full draw is walking, not running. He can still move - a bow that rooted you would
    // be a trap rather than a weapon - but not away from anything.
    if (player.drawing) return .42;
    return player.action === 'attack' ? .45 : 1;
  }

  function heal(amount) {
    if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(player.hp)
      || !Number.isFinite(player.maxHp) || player.hp <= 0 || player.maxHp <= 0
      || state.phase === 'defeated' || player.action !== 'idle') return 0;
    const healed = Math.min(amount, Math.max(0, player.maxHp - player.hp));
    player.hp += healed;
    return healed;
  }

  /**
   * Wind and harm from something that is not a fight: swimming, for now (src/swimming.js). It goes
   * through combat because combat owns the bar, the blood and the defeat, and a man who drowns
   * should end the same way a man the goblins get ends - the same panel, the same checkpoint.
   *
   * `hold` keeps the bar from filling itself back up while the water still has him; without it the
   * 24-a-second recovery in `updatePlayer` would cancel most of the drain and nobody would ever
   * run out of wind.
   */
  function exhaust(wind = 0, harm = 0, { hold = true } = {}) {
    if (player.action === 'dead' || state.phase === 'defeated') return { stamina: player.stamina, hp: player.hp, defeated: true };
    if (wind > 0) player.stamina = Math.max(0, player.stamina - wind);
    if (hold) staminaDelay = Math.max(staminaDelay, .25);
    if (harm > 0) {
      player.hp = Math.max(0, player.hp - harm);
      if (!player.hp) {
        player.action = 'dead';
        player.progress = 0;
        state.phase = 'defeated';
        state.enemies.forEach(target => {
          if (target.active) { target.action = 'idle'; target.progress = 0; target.speed = 0; }
        });
        emit('defeat', { encounterId: state.encounterId, drowned: true });
      }
    }
    return { stamina: player.stamina, hp: player.hp, defeated: !player.hp };
  }

  /**
   * On your feet, whole, with nothing happening. The leash already does exactly this when a
   * traveler walks 45 m out of a fight; drowning needs the same thing and must not go through
   * `resetEncounter`, which restarts `lastEncounter` - and `lastEncounter` begins life as
   * DEFAULT_ENCOUNTER, so a man who had never drawn on anybody woke in a goblin raid a hundred
   * metres away.
   *
   * It moves nobody. The host puts the traveler back on the last dry ground he stood on
   * (src/main.js), because that is what drowning owes him and a fight's checkpoint is not it.
   */
  function revive() {
    state.phase = 'peaceful';
    state.enemies = [];
    enemyTimers.clear();
    clearAllies();
    restorePlayer();
    return { hp: player.hp, stamina: player.stamina };
  }

  return {
    state, startPractice, finishPractice, startEncounter, attack, dodge, guard, draw, lowerBow, update, resetEncounter, disengage, pose, movementScale, heal, exhaust, revive, spellHit,
    setWeaponReady(value) { weaponReady = Boolean(value); },
    /** How far the bow is drawn right now, 0 to 1, for the picture and the HUD. */
    get drawn() { return player.draw ?? 0; },
  };
}

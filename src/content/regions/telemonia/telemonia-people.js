/**
 * Telemonia, stage 2: the people (docs/telemonia-stage2-brief.md). Pure: no three, no DOM. Who stands
 * where, what they are, what they carry and the few words they have; `src/main.js` stands them up,
 * `src/content/regions/telemonia/telemonia-host.js` moves them when an outsider is in the country, and `src/content/characters/characters.js` builds
 * the three bodies (`telemon-man`, `telemon-woman`, `toreth`).
 *
 * **Nobody has a name, and nobody is a child.** People go by what they are - "Telemon warrior", "Telemon
 * woman", "Field hand" - and the lore's boys on a training run are left out, because a fight "with
 * everyone in earshot" must never take in a child (the brief). No king as a character, no quest, no
 * trade, no hiring.
 *
 * - **The Telemon men** (the user: "Their men are all great warriors ... The Telemon warriors should carry
 *   long spears and shield and knives in scabbards"; the lore: "compact, dark-complexioned"). Every one a
 *   warrior and every one carrying all three, at whatever he is doing: with the kingdom's horses and
 *   cattle by the heads of the passes, at the doors of the band halls, sparring in the yard inside the
 *   gate, at the door of the hall at the end of the street, and overseeing the field people at their rows
 *   ("allotted to the band halls and overseen by them"). **There are no guards** ("There are no designated
 *   guards. All the men basically function as the guards"): nobody stands anywhere only to watch it, and
 *   the three who face the western rim, where a climber comes in, are men of the bands like the rest.
 * - **The Telemon women** (the user: "The women also carry knives and are no strangers to combat"; the
 *   lore: "a woman with a knife at her belt and a water jar on her shoulder", "how to hold a gate, a
 *   terrace wall, a cistern, a stair"). The same people, a knife at the belt, at ordinary work: at the
 *   gate ("whoever is nearest the gate is the gate"), at the cisterns, a granary, on the spur with water,
 *   and dressing the terrace walls.
 * - **The field people** (*toreth*, "of the plain": "They carry no weapons"; the user: "the descendants
 *   of invaders who never got home"). Unarmed, in the fields and among the vines near their huts.
 *   Lowlanders by descent - East Pyros, Gala, the Mittoli interior - so they do not look like the Telemon:
 *   fairer and redder, browner hair, the lowland build. They are not watchers.
 *
 * **Real people and figures.** Everybody who can challenge an outsider is a real NPC: all the Telemon.
 * Field hands near their huts are NPCs too, so a traveler who reaches them unseen can be spoken to; the
 * ones working the far fields are **figures** (src/world/life/town-life.js): drawn, never spoken to, nobody's watcher.
 */
import { KETHORN_WALL, PASSES, PLAIN_MIDDLE, kethornPoint } from './telemonia-world.js';
import { HORSE_RANGE, CATTLE_RANGE, facing } from './telemonia-ways.js';
// The sites people stand at are the town's (src/content/regions/telemonia/telemonia-town.js): hall doors, the cisterns, a granary,
// the work spots in the fields and on the terraces, the rows of huts.
import { TELEMONIA_TOWN_SITES, HAMLETS } from './telemonia-town.js';

const freeze = Object.freeze;
/** Ambient people are drawn within this many metres, as the built places' people are (TOWN_LIFE_VIEW_RANGE). */
export const TELEMONIA_VIEW = 80;

/** Plain, undyed wool, and no colour of display: the Avites do display, the Telemon do not. */
export const TELEMON_CLOTH = freeze({ man: 0x7d6c52, woman: 0x86755a, toreth: 0x77705f });
/** "Compact, dark-complexioned": four skins of the one people, and black or near-black hair. */
const TELEMON_SKIN = freeze([0x8a5c3c, 0x7a5136, 0x93664a, 0x6e4a32]);
const TELEMON_HAIR = freeze([0x1c1612, 0x241b14, 0x15110e, 0x2c2017]);
/** The lowland skins and hair of men and women whose fathers' fathers came up the passes from the coast. */
const LOWLAND_SKIN = freeze([0xd7ad7e, 0xc89a72, 0xe2bb92, 0xbd8d66, 0xd9b089]);
const LOWLAND_HAIR = freeze([0x6b4a2c, 0x8a5a2a, 0x9c7a4a, 0x4a3524, 0x7c3a1e]);

/**
 * What a Telemon says to a traveler who speaks to him from the far side of the border. "They do not use
 * many words and are wary of people who do." What they say on the walk out and in a fight is the rule's
 * (src/content/regions/telemonia/telemon-watch.js `TELEMON_LINES`).
 */
export const TELEMON_WORDS = freeze({
  man: freeze({ outside: freeze(['Go.', 'The edge is here. Stay on that side of it.']) }),
  woman: freeze({ outside: freeze(['Go home.', 'You have been shown the way.']) }),
});
/**
 * What a field hand says to somebody who has reached the terraces unseen. The lore: "the field people
 * still speak the lowland tongues among themselves, generations on, and a traveler who could reach the
 * terraces unseen would be understood there" - so they answer in a tongue the traveler knows, low, and
 * briefly; and if the traveler has been seen, they keep their eyes on the row.
 */
export const TORETH_WORDS = freeze({
  unseen: freeze([
    freeze(['You are not one of them. Keep low. If one of them sees you, he walks you out. If one sees you twice, nobody walks.']),
    freeze(['My father’s father’s father came up the south pass with an army off the coast. Nobody went back down it.']),
    freeze(['We speak the old tongue among ourselves. They know. They do not care what we say, only what we do.']),
    freeze(['Do not ask me to come with you. There is nowhere to come to. Go, before they look this way.']),
  ]),
  watched: 'The field hand keeps his eyes on the row and does not answer.',
});

// ---------------------------------------------------------------------------
// Where everybody stands: at the town's own sites (src/content/regions/telemonia/telemonia-town.js `TELEMONIA_TOWN_SITES`), every one
// of them on ground a body stands on and walks off; and the few the town has no site for, at the heads of
// the passes and in the yard inside the gate.
// ---------------------------------------------------------------------------
const person = (id, kind, role, spot, yaw, extra = {}) => {
  const n = Number(id.match(/(\d+)$/)?.[1] ?? 0);
  const telemon = kind === 'man' || kind === 'woman';
  return freeze({
    id, kind, name: kind === 'man' ? 'Telemon warrior' : kind === 'woman' ? 'Telemon woman' : 'Field hand', role,
    modelRole: kind === 'man' ? 'telemon-man' : kind === 'woman' ? 'telemon-woman' : 'toreth',
    x: spot.x, z: spot.z, yaw, viewRange: TELEMONIA_VIEW,
    color: TELEMON_CLOTH[telemon ? kind : 'toreth'],
    skin: telemon ? TELEMON_SKIN[n % TELEMON_SKIN.length] : LOWLAND_SKIN[n % LOWLAND_SKIN.length],
    look: freeze({ hair: telemon ? TELEMON_HAIR[n % TELEMON_HAIR.length] : LOWLAND_HAIR[n % LOWLAND_HAIR.length],
      // The women: the slighter build, a dress to the calf and hair down the back; the men cropped close.
      ...(kind === 'woman' ? { slight: true, dress: true, hairStyle: 'long' } : kind === 'man' ? { hairStyle: 'short-cropped' } : {}), ...(extra.look ?? {}) }),
    telemon: telemon ? kind : null, toreth: !telemon,
    lines: freeze(kind === 'toreth' ? [...TORETH_WORDS.unseen[n % TORETH_WORDS.unseen.length]] : [...TELEMON_WORDS[kind].outside]),
    ...(extra.posture ? { posture: extra.posture } : {}),
  });
};
const S = TELEMONIA_TOWN_SITES;
const siteOf = (list, id) => { const s = list.find(one => one.id === id); if (!s) throw new Error(`No town site ${id}`); return s; };
const along = (p, d, toward) => { const n = Math.hypot(toward.x - p.x, toward.z - p.z) || 1; return { x: p.x + (toward.x - p.x) / n * d, z: p.z + (toward.z - p.z) / n * d }; };
const nearestOf = (list, to, taken) => list.filter(s => !taken.has(s.id)).sort((a, b) => Math.hypot(a.x - to.x, a.z - to.z) - Math.hypot(b.x - to.x, b.z - to.z))[0];
const pass = id => PASSES.find(p => p.id === id);
/** A point on the plain past a pass's head, `inward` metres on toward the plain's middle and `side` across. */
const passHead = (id, inward, side) => {
  const p = pass(id), head = p.points.at(-1), toward = along(head, inward, PLAIN_MIDDLE);
  const dx = PLAIN_MIDDLE.x - head.x, dz = PLAIN_MIDDLE.z - head.z, n = Math.hypot(dx, dz);
  return { x: toward.x - dz / n * side, z: toward.z + dx / n * side };
};
/** A point `metres` back up a pass's line from its head toward its mouth: what a man at its head watches. */
const upPass = (id, metres) => { const p = pass(id); let i = p.points.length - 1; let left = metres;
  while (i > 0) { const a = p.points[i], b = p.points[i - 1], l = Math.hypot(b.x - a.x, b.z - a.z); if (left <= l) return { x: a.x + (b.x - a.x) * left / l, z: a.z + (b.z - a.z) * left / l }; left -= l; i--; }
  return p.points[0]; };
const hamlet = id => HAMLETS.find(h => h.id === id);
const gate = KETHORN_WALL.gate.centre;

// --- The men ------------------------------------------------------------------------------------
/**
 * **The western rim** (the user, 2026-10-03: getting in unseen should be "possible and hard"). The rim on the East
 * Pyros side is two hexes thick and no pass goes through it, so a climber's way in is over it, down onto the
 * terraces and across the Galmeth; as first built nobody faced that way. Three men of the bands now do, the same
 * build as the rest and no more guards than they are: two on the western terraces, looking up at the inner cliff
 * they would come down - one under its north-western shoulder, one opposite the rock, where the straight way from
 * the west comes down - and one at the foot of the Rothkar way, looking up the way and along the terraces under it.
 * Each sees the stealth module's hundred degrees out to the country's forty metres (src/content/regions/telemonia/telemonia-host.js), so the
 * three do not close the rim: between and at the edges of their cones are gaps, and a body kept low and slow (stealth's
 * crouched sightline and slower noticing) gets through some that a man walking upright does not.
 * Places measured on the real ground (tests/telemonia-people.test.js): footing, no wash, walked out by the stairs.
 */
const WEST_WATCH = freeze([
  freeze({ role: 'On the north-western terraces, facing the rim', x: -2228, z: 1185, yaw: -112 * Math.PI / 180 }),
  freeze({ role: 'On the western terraces, facing the rim', x: -2256, z: 1255, yaw: -90 * Math.PI / 180 }),
  freeze({ role: 'At the foot of the Rothkar way, facing the rim', x: -2168, z: 1368, yaw: -105 * Math.PI / 180 }),
]);
const tarnelStand = passHead('telemonia-tarnel', 16, 12), eastStand = { x: HORSE_RANGE.x - 4, z: HORSE_RANGE.z - 12 }, southStand = { x: CATTLE_RANGE.x - 12, z: CATTLE_RANGE.z - 14 };
const yardA = kethornPoint(25, 3.2), yardB = kethornPoint(25, -3.2);
const overseer = (h, out = 3) => { const y = hamlet(h).yard; return along(y, out, PLAIN_MIDDLE); };
export const TELEMON_MEN = freeze([
  person('telemon-man-1', 'man', 'Back off the desert road, at the head of the Tarnel', tarnelStand, facing(tarnelStand, upPass('telemonia-tarnel', 28))),
  person('telemon-man-2', 'man', 'With the kingdom’s horses, by the head of the east pass', eastStand, facing(eastStand, upPass('telemonia-east-pass', 34))),
  person('telemon-man-3', 'man', 'With the kingdom’s cattle, by the head of the south pass', southStand, facing(southStand, upPass('telemonia-south-pass', 30))),
  person('telemon-man-4', 'man', 'Sparring in the yard inside the gate', yardA, facing(yardA, yardB)),
  person('telemon-man-5', 'man', 'Sparring in the yard inside the gate', yardB, facing(yardB, yardA)),
  ...[1, 2, 4, 5].map((h, i) => { const s = siteOf(S.hallDoors, `kethorn-band-hall-${h}-door`); return person(`telemon-man-${6 + i}`, 'man', 'At the door of his band’s hall', s, s.yaw); }),
  (s => person('telemon-man-10', 'man', 'At the door of the hall at the end of the street', s, s.yaw))(siteOf(S.hallDoors, 'kethorn-king-hall-door')),
  // Overseeing the field people: "allotted to the band halls and overseen by them".
  ...[['telemonia-north-huts', 11], ['telemonia-east-huts', 12], ['telemonia-west-huts', 13]].map(([h, n]) => {
    // Before his hall's row of huts, looking out over the rows its people work.
    const at = overseer(h); return person(`telemon-man-${n}`, 'man', 'Overseeing the field people of his hall', at, facing(at, PLAIN_MIDDLE));
  }),
  // Facing the western rim (`WEST_WATCH`): no pass comes in there, and a climber does.
  ...WEST_WATCH.map((s, i) => person(`telemon-man-${14 + i}`, 'man', s.role, s, s.yaw)),
]);

// --- The women ----------------------------------------------------------------------------------
const inGateA = kethornPoint(30.5, 3), inGateB = kethornPoint(30.5, -3), spurSpot = kethornPoint(62, 1.5);
const granary = siteOf(S.granaries, 'kethorn-granary-2-door');
/** Dressing the terrace walls - "how to hold ... a terrace wall": kneeling on the tread, facing the riser above. North, east and south; none under the Rothkar. */
const TERRACE_WOMEN = ['telemonia-terrace-work-4', 'telemonia-terrace-work-7', 'telemonia-terrace-work-8'].map(id => siteOf(S.terraceWork, id));
export const TELEMON_WOMEN = freeze([
  person('telemon-woman-1', 'woman', 'Inside the gate: whoever is nearest the gate is the gate', inGateA, facing(inGateA, gate)),
  person('telemon-woman-2', 'woman', 'Inside the gate, a water jar at her feet', inGateB, facing(inGateB, gate), { look: { jar: true } }),
  ...S.cisterns.map((s, i) => person(`telemon-woman-${3 + i}`, 'woman', 'Drawing water at a cistern', s, s.yaw, i ? { look: { jar: true } } : {})),
  person('telemon-woman-5', 'woman', 'At the door of a granary', granary, granary.yaw + Math.PI),
  person('telemon-woman-6', 'woman', 'On the spur with a water jar, going down', spurSpot, facing(spurSpot, kethornPoint(90, 0)), { look: { jar: true } }),
  ...TERRACE_WOMEN.map((s, i) => person(`telemon-woman-${7 + i}`, 'woman', 'Dressing a terrace wall', s, s.yaw, { posture: 'kneel' })),
  person('telemon-woman-10', 'woman', 'Bringing water to the field people’s huts', hamlet('telemonia-south-huts').yard, facing(hamlet('telemonia-south-huts').yard, PLAIN_MIDDLE), { look: { jar: true } }),
]);

// --- The field people ---------------------------------------------------------------------------
/**
 * Three to a row of huts: two at the town's work spots in the sown blocks nearest their huts, kneeling to
 * the rows, and one among the vines at the nearest terrace work spot. The rest of the plain's work spots
 * are the far fields' figures, below.
 */
const takenWork = new Set(TERRACE_WOMEN.map(s => s.id));
export const TORETH_HANDS = freeze(HAMLETS.flatMap((h, k) => {
  const a = nearestOf(S.plainWork, h.yard, takenWork); takenWork.add(a.id);
  const b = nearestOf(S.plainWork, h.yard, takenWork); takenWork.add(b.id);
  const vine = nearestOf(S.terraceWork, h.yard, takenWork); takenWork.add(vine.id);
  return [
    person(`toreth-${k * 3 + 1}`, 'toreth', 'Working the rows', a, a.yaw, { posture: 'kneel' }),
    person(`toreth-${k * 3 + 2}`, 'toreth', 'Working the rows', b, b.yaw + Math.PI, { posture: 'kneel' }),
    person(`toreth-${k * 3 + 3}`, 'toreth', 'Dressing the vines', vine, vine.yaw),
  ];
}));

/** Everybody who is a person in Telemonia. */
export const TELEMONIA_PEOPLE = freeze([...TELEMON_MEN, ...TELEMON_WOMEN, ...TORETH_HANDS]);
export const TELEMONIA_PEOPLE_IDS = freeze(new Set(TELEMONIA_PEOPLE.map(p => p.id)));
/** The watchers: every Telemon, man and woman, and nobody else. */
export const isTelemon = npc => npc?.telemon === 'man' || npc?.telemon === 'woman';

// ---------------------------------------------------------------------------
// The figures: field hands in the far fields
// ---------------------------------------------------------------------------
/**
 * Field hands working the fields away from the huts, as figures (src/world/life/town-life.js `WALL_FIGURES`): drawn
 * within ninety-five metres, never spoken to, nobody's watcher. On the ground (`lift` 0), at twelve of the
 * town's work spots in the sown blocks that nobody else is standing at.
 */
export const TELEMONIA_FIGURES = freeze(S.plainWork.filter(s => !takenWork.has(s.id)).slice(0, 12).map((s, i) =>
  freeze({ id: `toreth-figure-${i + 1}`, role: 'toreth', x: s.x, z: s.z, lift: 0, yaw: (s.yaw ?? 0) + (i % 2 ? Math.PI : 0), ground: true,
    tunic: TELEMON_CLOTH.toreth, look: freeze({ hair: LOWLAND_HAIR[i % LOWLAND_HAIR.length] }) })));

/** How many of each, and where: for the report and the tests. */
export function peopleSummary() {
  const where = list => list.reduce((out, p) => { out[p.role] = (out[p.role] ?? 0) + 1; return out; }, {});
  return { men: TELEMON_MEN.length, women: TELEMON_WOMEN.length, fieldHands: TORETH_HANDS.length, figures: TELEMONIA_FIGURES.length,
    menAt: where(TELEMON_MEN), womenAt: where(TELEMON_WOMEN) };
}

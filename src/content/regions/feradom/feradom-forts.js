/**
 * The pass castles of Feradom: where each stands, its walls, towers and gates, and what is inside.
 *
 * "A castle at the point where the valley behind a pass opens enough to permit a staging defense.
 * Cleared ground in front, walls at the back." Each castle fills its pass's basin from side to side
 * (`PASS.castle` in src/content/regions/feradom/feradom-world.js): a gate in the front wall facing the narrows, a gate in the
 * back wall toward the coast, and the long walls standing at the foot of the basin's sides, so the
 * valley is shut by stone and the only way on is through both gates. The Road Pass holds the great
 * castle - towers at every corner and a keep - because the Feradom road runs through it; the other
 * five hold smaller ones, a tower-house for a keep. Above each narrows, on the gorge's rim, a tower;
 * on the front summits between the passes, watchtowers with beacons (`TOWERS`).
 *
 * The stone is the hills' own, greyer and greener than the army's. Pure: no three, no DOM;
 * `src/content/regions/feradom/feradom-scenery.js` draws it all.
 */
import { fortCircuit, FORT_STANDARD } from '../../../world/scenery/fortification.js';
import { PASSES, PASS, TOWERS, passPoint, beltPoint } from './feradom-world.js';

const freeze = Object.freeze;
const faceToward = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);

/** The castles' own measures: a little taller than the army's standard, the hills' walls built to be looked up at. */
export const FERADOM_STANDARD = freeze({ ...FORT_STANDARD, wallHeight: 5.4, walkHeight: 3.8, towerPlatform: 7.4, gateWidth: 4.2 });

export const PASS_CASTLES = freeze(PASSES.map(pass => {
  const great = pass.castle === 'great';
  const corners = PASS.castle.map(([across, depth]) => passPoint(pass, across, depth));
  const edge = i => Math.hypot(corners[(i + 1) % corners.length].x - corners[i].x, corners[(i + 1) % corners.length].z - corners[i].z);
  const circuit = fortCircuit({
    id: `${pass.id}-castle`, kind: 'feradom-castle', corners,
    gates: [
      { id: `${pass.id}-front-gate`, edge: 0, at: edge(0) / 2 },
      { id: `${pass.id}-back-gate`, edge: 4, at: edge(4) / 2, towers: great },
    ],
    cornerTowers: great ? true : [2, 7],
    // The front wall faces the narrows across open ground and has its ditch; the rest stand against the slopes.
    ditchEdges: [0],
    standard: FERADOM_STANDARD,
  });
  // Inside: a keep to one side of the way through, and a hall on the other.
  const keepAt = passPoint(pass, great ? -9 : -9.5, great ? 61 : 60), hallAt = passPoint(pass, great ? 10.5 : 11, great ? 58 : 59);
  const forward = faceToward(passPoint(pass, 0, 40), passPoint(pass, 0, 71));
  return freeze({
    id: circuit.id, pass: pass.id, name: `${pass.name} castle`, great, circuit,
    keep: freeze({ x: keepAt.x, z: keepAt.z, yaw: forward, size: (great ? 9.5 : 7) * Math.max(.8, pass.k), height: great ? 15 : 11 }),
    hall: freeze({ x: hallAt.x, z: hallAt.z, yaw: forward, width: (great ? 7 : 5.5) * Math.max(.8, pass.k), length: (great ? 15 : 11) * Math.max(.8, pass.k) }),
    /** The way through: the front gate, the middle of the yard, the back gate. */
    way: freeze([passPoint(pass, 0, 34), passPoint(pass, 0, 40), passPoint(pass, 0, 55), passPoint(pass, 0, 71), passPoint(pass, 0, 80)]),
    forward,
  });
}));
export const castleFor = passId => PASS_CASTLES.find(castle => castle.pass === passId);

/** What each pass is, for the chart and the journal: across the border from what, and how it is held. */
const PASS_WORDS = freeze({
  'ordel-gap': 'The easternmost pass, above the Ordel’s valley: a gorge up through the hills, a tower on its rim, and a castle across the basin behind it. The river keeps the border below; the castle keeps the gap.',
  'road-pass': 'Where the Feradom road comes up from the army’s barrier in Pueth: a gorge between two wooded hills, a tower above the narrows, and the great castle of the passes across the basin behind, towered at every corner, with a keep and a hall. Its gate toward Pueth is shut.',
  'birch-pass': 'On the Amod border, west of the corner where Pueth’s border turns: a narrow gorge, a tower on its rim, and a small castle with a tower-house for its keep.',
  'amod-pass': 'Over against Amod: the gorge through the barrier hills, the tower above it, and a castle filling the basin behind.',
  'stone-pass': 'Under the East Lotharn, where the mountains’ foot comes down to the barrier hills: a castle in a basin cut from the foothills, and the grey slopes of the range above it.',
  'fir-pass': 'The westernmost pass, deep in the firs between the East Lotharn and the sea: a small castle and a tower above the narrows, the last of the duchy’s border.',
});
export const FERADOM_LANDMARKS = freeze([
  freeze({ id: 'barrier-hills', name: 'The barrier hills', ...beltPoint(470, 95), radius: 125,
    description: 'A band of steep forested hills along the duchy’s whole inland edge: not high, but faced toward the border with a band of bare rock nobody climbs, and crossed only by six passes. Oak and fir, old on the tops and cut in stands lower down; beacons on the summits between the passes, each in sight of the next.' }),
  ...PASSES.map(pass => freeze({ id: pass.id, name: pass.name, x: pass.yard.x, z: pass.yard.z, radius: 45, description: PASS_WORDS[pass.id] })),
]);

/** The towers above the narrows and the watchtowers, with the way each looks: out, over the border. */
export const FERADOM_TOWERS = freeze(TOWERS.map(tower => {
  const pass = PASSES.find(one => one.id === tower.pass);
  const outward = pass ? faceToward(pass.narrows, pass.mouth) : null;
  return freeze({ ...tower, looks: outward });
}));

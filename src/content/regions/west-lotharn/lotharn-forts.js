/**
 * The Empire's forts on the Lotharn passes: a wall across every other way a walker has south out of the
 * two ranges - as pure numbers. `src/content/regions/west-lotharn/lotharn-forts-scenery.js` draws them.
 *
 * The user, 2 October 2026: "Let's also add Ambron fortresses of smaller scale wherever else there are
 * strategic chokeholds that control entry south from the East Lotharn Mountains and the West Lotharn
 * Mountains."
 *
 * **Where they are was measured, not chosen** (docs/varn-report.md). The built ground was flooded with the
 * game's own walking rules from the valleys inside each range. Whatever a walker cannot be on is rock, in
 * islands - the massifs' courses of cliff - and every way south goes between two of them. One is the notch
 * above Amod, which is Varn's (src/content/regions/varn/varn-world.js). The others are these three:
 *
 *  - **the Vastos Gate**, across the mouth where the two ranges meet and open onto Vastos, between the
 *    West Lotharn's southern massif and the East Lotharn's south-west peak. Two valleys come out here: the
 *    saddle down from Kemrath and the long valley's eastern reach. Each has a narrower place further in
 *    (seventy-three and seventy-seven metres, against a hundred and seventy here), and a fort was first
 *    built at each - and then measured: the passage under the east arm (src/content/regions/west-lotharn/west-lotharn-caves.js) goes in
 *    on Kemrath's side and comes out between the two of them, so the one was walked round through the rock
 *    and the long valley was shut in with no way out but its gates. One wall across the mouth leaves the
 *    passage wholly inside the mountains, where it is the valley people's own way from one valley to the
 *    other, and nobody is shut in anywhere;
 *  - **the Meneth Gate**, between the south rampart and the spur, where the long valley's one break in its
 *    southern wall comes down into Meneth;
 *  - **the Reach Gate**, across the western reach, the way out of the long valley's west end round the
 *    rampart's foot into Isareos (and into Yunethre, which is not the Empire's). Not at the reach's
 *    narrowest place, seventy-five metres from cliff to cliff: the south rampart's own first ramp climbs
 *    the cliff there and would go over a wall's end, and the beck's river foxes live across that line.
 *    It stands ninety-three metres up the valley, where no way of the mountain's passes either end and
 *    the foxes' ground is all on one side.
 *
 * Nobody else holds any of them: Feradom's castles are on the East Lotharn's other side, shutting the
 * Duchy's own border (src/content/regions/feradom/feradom-forts.js).
 *
 * **What each is**: one straight curtain from cliff to cliff, both ends run a few metres into the rock;
 * a tower by each end and at every thirty metres between; one gate between two towers, in the wall's
 * face toward the mountains; and behind it, on the Empire's side, a keep and a barrack. The same hand as
 * Varn and a size smaller: a wall a storey lower, towers a storey lower, no ditch, no town. The Vastos
 * Gate is the longest of them, a hundred and seventy-eight metres, because the mouth is that wide.
 *
 * **The names are plain words**, as the West Lotharn's own places are (docs/west-lotharn-report.md): the
 * lore's Lotharn names are an older tongue than Mittoli and cannot be coined from it, and each of these
 * stands in the Lotharn. Each is named for what it shuts.
 *
 * Pure: no three, no DOM.
 */
import { fortCircuit, FORT_STANDARD } from '../../../world/scenery/fortification.js';
import { LOTHARN_PASSES_SHUT } from '../varn/varn-world.js';
import { firstCliff } from './lotharn-first-course.js';

const freeze = Object.freeze;
const point = (x, z) => freeze({ x, z });

/** A size under Varn's: the army's own fortification standard in stone, a little taller, without a ditch. */
export const PASS_FORT_STANDARD = freeze({
  ...FORT_STANDARD,
  wallHeight: 6.6, walkHeight: 4.7, wallThickness: 4.0,
  towerSize: 5.4, towerPlatform: 9.8, towerProjection: 1.2,
  towerSpacing: freeze({ min: 16, max: 32 }),
  gateWidth: 4.4, berm: 0, ditchWidth: 0, causewayHalf: 4.4,
});

/**
 * The three, west of Varn in order. `a` and `b` are the curtain's two ends, each in the first course of
 * cliff; `outside` is a point on the mountains' side of it, which is the side its merlons face; `gate`
 * is how far along from `a` the gate stands; `keep` and `barrack` are where those stand, as metres along
 * the wall from `a` and metres behind it; `water` is where a beck runs under the wall, through a grated
 * arch. Each was placed on the measured ground: on the floor, off the water, clear of the way through.
 */
const SPECS = freeze([
  { id: 'fort-vastos', name: 'The Vastos Gate', a: point(-1665, -586.5), b: point(-1504.5, -663.3), outside: point(-1620, -660), gate: 66, keep: [141, 11], barrack: [158, 11.5],
    stands: 'West Lotharn Mountains', shuts: 'the mouth where the Kemrath saddle and the long valley come out together', opens: 'Vastos',
    description: 'The Empire’s fort across the mouth where the two Lotharn ranges meet and open onto the tableland: a curtain a hundred and seventy-eight metres long from the cliff of the West Lotharn’s southern massif to the cliff of the East Lotharn’s south-west peak, eight towers on it, the gate at the low point of the floor and a keep at the wall’s eastern end. The saddle down from Kemrath and the long valley’s eastern reach are both on the far side of the gate; Vastos is behind.' },
  { id: 'fort-meneth', name: 'The Meneth Gate', a: point(-2053.6, -368.7), b: point(-1990, -427.3), outside: point(-2040, -430), gate: 40, keep: [55, 10.5], barrack: [22.5, 11.5],
    stands: 'West Lotharn Mountains', shuts: 'the break in the long valley’s southern wall', opens: 'Meneth',
    description: 'The Empire’s fort in the one break in the long valley’s southern wall, between the south rampart and the spur: a curtain across the gap from one cliff to the other, and the ridge country of Meneth falling away behind it.' },
  { id: 'fort-reach', name: 'The Reach Gate', a: point(-2212, -541.5), b: point(-2212, -398.5), outside: point(-2170, -470), gate: 58, keep: [108, 10.5], barrack: [125, 9.5], water: 75.5,
    stands: 'West Lotharn Mountains', shuts: 'the western reach of the long valley', opens: 'Isareos',
    description: 'The Empire’s westernmost fort on the Lotharn, across the long valley’s western reach: a hundred and forty metres of wall from the mountain’s foot to the south rampart’s, up the fallen rock at both ends and into the cliff, a grated arch in it where the west beck runs through, and the way down the reach and round the rampart’s end into Isareos behind.' },
]);

function passFort(spec) {
  const S = PASS_FORT_STANDARD, length = Math.hypot(spec.b.x - spec.a.x, spec.b.z - spec.a.z);
  // Towers: one a little in from each end, where the wall meets the rock, and the rest spaced between them and the gate's own pair.
  const half = S.gateWidth / 2 + S.towerSize / 2, ends = [7, length - 7], extra = [...ends];
  const fill = (from, to) => { const gap = to - from, n = Math.ceil(gap / 30); for (let i = 1; i < n; i++) extra.push(from + gap * i / n); };
  fill(ends[0], spec.gate - half); fill(spec.gate + half, ends[1]);
  const circuit = fortCircuit({
    id: spec.id, kind: 'pass-fort', standard: S, open: true, outside: spec.outside,
    corners: [{ x: spec.a.x, z: spec.a.z }, { x: spec.b.x, z: spec.b.z }],
    gates: [{ id: `${spec.id}-gate`, edge: 0, at: spec.gate }],
    cornerTowers: [], extraTowers: extra.sort((p, q) => p - q).map(at => ({ edge: 0, at })), ditchEdges: [],
  });
  const edge = circuit.edges[0], inward = point(-edge.out.x, -edge.out.z);
  /** A point `along` the wall from `a` and `depth` behind it, on the Empire's side. */
  const behind = (along, depth) => point(spec.a.x + edge.dir.x * along + inward.x * depth, spec.a.z + edge.dir.z * along + inward.z * depth);
  // The keep and the barrack, both square to the world.
  const keepAt = behind(...spec.keep), barrackAt = behind(...spec.barrack);
  const alongX = Math.abs(edge.dir.x) > Math.abs(edge.dir.z);
  const gate = circuit.gates[0];
  return freeze({
    ...spec, length, circuit, inward, behind,
    /** Where the beck goes under the wall, or null. */
    waterAt: spec.water === undefined ? null : point(spec.a.x + edge.dir.x * spec.water, spec.a.z + edge.dir.z * spec.water),
    gateId: gate.id, gateAt: point(gate.centre.x, gate.centre.z),
    keep: freeze({ id: `${spec.id}-keep`, x: keepAt.x, z: keepAt.z, size: 8.8, height: 15.5 }),
    barrack: freeze({ id: `${spec.id}-barrack`, x: barrackAt.x, z: barrackAt.z, width: alongX ? 15 : 6.4, depth: alongX ? 6.4 : 15, storeys: 2 }),
    /** The way through: from in front of the gate on the mountains' side to the yard behind it. */
    way: freeze([point(gate.centre.x - inward.x * 7.5, gate.centre.z - inward.z * 7.5), point(gate.centre.x, gate.centre.z), point(gate.centre.x + inward.x * 14, gate.centre.z + inward.z * 14)]),
    /** Seeds for the measurement: well clear of the wall on each side of it. */
    mountainSide: point(gate.centre.x - inward.x * 26, gate.centre.z - inward.z * 26),
    empireSide: point(gate.centre.x + inward.x * 30, gate.centre.z + inward.z * 30),
  });
}
export const LOTHARN_FORTS = freeze(SPECS.map(passFort));
export const fortById = id => LOTHARN_FORTS.find(fort => fort.id === id);
/** Whether a fort's gate is shut: the one flag, for every one of them (src/content/regions/varn/varn-world.js). */
export const fortGateShut = () => LOTHARN_PASSES_SHUT;

/**
 * **The rock a fort's wall dies into cannot be climbed**, for `NO_CLIMB_REACH` metres either side of the
 * wall along each face and as far back into the mountain: a climber cannot go over the curtain's end or
 * round it. One row of the game's table (src/gameplay/movement/no-climb-zones.js).
 *
 * It is the first cliff only, and off the peaks' own ways (src/content/regions/west-lotharn/lotharn-first-course.js): the ledge above it
 * and everything higher is the mountain's and is climbed as before, and a ramp keeps its hold. The
 * south-west peak's way up passes fifty metres behind the Vastos Gate's eastern end, two courses up. No
 * ramp passes a wall's end on the first cliff: the Reach Gate was moved off the one that would have
 * (the south rampart's first), and `tests/lotharn-forts.test.js` holds every fort to that.
 */
export const NO_CLIMB_REACH = 70;
export function fortUnclimbable(x, z) {
  for (const fort of LOTHARN_FORTS) {
    const edge = fort.circuit.edges[0], dx = x - fort.a.x, dz = z - fort.a.z;
    const along = dx * edge.dir.x + dz * edge.dir.z, across = Math.abs(dx * edge.out.x + dz * edge.out.z);
    if (across > NO_CLIMB_REACH) continue;
    // Beyond either end of the floor the wall crosses, and for the reach back into the mountain.
    if ((along < 12 && along > -NO_CLIMB_REACH) || (along > fort.length - 12 && along < fort.length + NO_CLIMB_REACH)) return firstCliff(x, z);
  }
  return false;
}

/** Ground the countries' scatter is lifted off again (src/world/scenery/scenery-clearing.js): the wall's own strip and the yard behind it. */
export function fortKeepsClear(x, z, margin = 0) {
  for (const fort of LOTHARN_FORTS) {
    const edge = fort.circuit.edges[0], dx = x - fort.a.x, dz = z - fort.a.z;
    const along = dx * edge.dir.x + dz * edge.dir.z, out = dx * edge.out.x + dz * edge.out.z;
    if (along < -2 || along > fort.length + 2) continue;
    if (out < 9 + margin && out > -24 - margin) return true;
  }
  return false;
}

/** The forts' places, for the chart and the journal. */
export const LOTHARN_FORT_LANDMARKS = freeze(LOTHARN_FORTS.map(fort => {
  const yard = fort.behind(fort.gate, 8);
  return freeze({ id: fort.id, name: fort.name, x: yard.x, z: yard.z, radius: 30, description: fort.description });
}));

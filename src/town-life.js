/**
 * The people of the built-up places: townsfolk and workers in Drent and Luscia,
 * the army's garrison of its outpost on the Moros (and the Coalition's, if it
 * falls), and Elod's frontier guard.
 *
 * Ground people are ordinary NPCs with two or more lines each. People on wall
 * walks and towers are figures: drawn and animated, never spoken to, shown only
 * when near. Garrison people and figures carry an occupation stake
 * (`holds` and `region`, see occupation.js) and are out only while their side
 * holds the Moros Plain. Pure: no three, no DOM; `createWallWatch` is handed the
 * character factory by its caller.
 */
import { PLACE_STANDS } from './places.js';
import { campPoint, gateRoadPoint, OUTPOST_CIRCUIT, OUTPOST_ROAD } from './outpost.js';
import { MOROS_WAYSIDE } from './wayside.js';
import { FRONTIER_CIRCUIT, frontierPoint, FRONTIER_GATE } from './frontier.js';
import { isOut } from './occupation.js';

const EMPIRE = Object.freeze({ holds: 'empire', region: 'Moros Plain' });
const COALITION = Object.freeze({ holds: 'coalition', region: 'Moros Plain' });
const faceToward = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);
/** Ambient people are drawn only within this many metres; quest people keep the game's own longer range. */
export const TOWN_LIFE_VIEW_RANGE = 80;
const person = (id, name, role, modelRole, spot, yaw, lines, extra = {}) => Object.freeze({
  id, name, role, modelRole, x: spot.x, z: spot.z, yaw, lines: Object.freeze(lines), viewRange: TOWN_LIFE_VIEW_RANGE, ...extra,
});
const RED = 0x8f3b30, COALITION_BLUE = 0x3f5f86, COALITION_SLATE = 0x55636f, ELODI = 0x2b2b2f;

const intoCamp = OUTPOST_ROAD.east, centre = campPoint(0, 0);
const picket = MOROS_WAYSIDE.find(p => p.id === 'legion-picket').frame;
const picketSpot = (along, across) => ({ x: picket.x + picket.dir.x * along + picket.left.x * across, z: picket.z + picket.dir.z * along + picket.left.z * across });
const toFrontier = Math.atan2(FRONTIER_GATE.u.x, FRONTIER_GATE.u.z);

export const TOWN_LIFE_NPCS = Object.freeze([
  // --- Drent and Luscia: townsfolk and workers. Locals speak plainly.
  person('life-avrel-farmer', 'Hild', 'Avrel farmer', 'commons-miller', PLACE_STANDS['life-avrel-farmer'], PLACE_STANDS['life-avrel-farmer'].yaw, [
    'The army buys our grain at its own price and calls it a kindness. Corvan is fair enough, for a quartermaster. The price is not his.',
    'The byre is new since the spring. The barn is older than my grandmother, and she would tell you so herself.',
  ], { color: 0x8a6f4a }),
  person('life-town-smith', 'Rook', 'Lumber Town smith', 'forest-woodcutter', PLACE_STANDS['life-town-smith'], PLACE_STANDS['life-town-smith'].yaw, [
    'Horseshoes, hinges, saw teeth and pots. I shoe the army’s horses too, and guess which of them pays on the day.',
    'Swords? Not here. There is a bench for that sort of thing at the army’s places, and they are welcome to it.',
  ], { color: 0x5f4a3a }),
  person('life-town-hall', 'Ceri', 'Keeper of the town hall', 'shelter-keeper', PLACE_STANDS['life-town-hall'], PLACE_STANDS['life-town-hall'].yaw, [
    'The hall is open to anyone with a quarrel or a prayer. Most people bring both.',
    'We buried nine from the Lauvel in the yard behind. Their families are still coming up the road to find them.',
  ], { color: 0x6f6a5c }),
  person('life-town-watch-north', 'Watchman Tobias', 'Town watch, north gate', 'bridge-keeper', PLACE_STANDS['life-town-watch-north'], PLACE_STANDS['life-town-watch-north'].yaw, [
    'Town watch. We have shut both gates at dark since the Lauvel, and nobody has argued.',
    'Travelers are welcome in Lumber Town. Armies go round it, if they know what is good for the timber.',
    'The road south goes out to the Moros. The army leaves by that gate in a column and comes back in ones and twos.',
  ], { color: 0x6b5d45 }),
  person('life-crossing-ferryman', 'Cade', 'Ferryman of the Caloss', 'reed-worker', PLACE_STANDS['life-crossing-ferryman'], PLACE_STANDS['life-crossing-ferryman'].yaw, [
    'Before the bridge there was me. When the bridge is down, there is still me.',
    'Hollis thinks timber solves everything. The river thinks otherwise, every spring.',
  ], { color: 0x4f6a66 }),
  person('life-lauvel-healer', 'Maud', 'Healer at the field hospital', 'shelter-keeper', PLACE_STANDS['life-lauvel-healer'], PLACE_STANDS['life-lauvel-healer'].yaw, [
    'Rebel, soldier, farmer: I stitch whoever is still breathing. There are fewer of them every day.',
    'The cairn is for the ones nobody came to name. Add a stone if you pass it. Everyone does.',
  ], { color: 0x8a8272 }),

  // --- The army's outpost. The army speaks in orders.
  person('life-outpost-rear-north', 'Footman Warin', 'Ambroni soldier', 'legion-soldier', campPoint(-54.5, .2), -Math.PI / 2, [
    'Rear gate. Wagons and the horse line use it. Hired swords use the main gate.',
    'The ditch is wider than a man can jump and deeper than he is tall. Use the causeway.',
    'Nobody goes up on the wall walk without an order. If you want to see the plain, look through the gate.',
  ], { ...EMPIRE, color: RED }),
  person('life-outpost-smith', 'Armourer Peder', 'Army armourer', 'forest-woodcutter', campPoint(-30.5, -8.3), .4, [
    'Mend your own blade at the bench. My anvil has forty spears waiting on it.',
    'The quartermaster counts the iron. I only beat it straight.',
  ], { ...EMPIRE, color: RED }),
  person('life-outpost-cook', 'Cook Hamo', 'Army cook', 'commons-miller', campPoint(-20.2, 14.8), 1.9, [
    'Bread at dawn, porridge at dusk, and the fire stays lit. Sit if you like. Do not touch the pot.',
    'Tell the quartermaster the salt pork is short. He will not hear it from me.',
  ], { ...EMPIRE, color: RED }),
  person('life-outpost-drill', 'Lieutenant Sewald Ruel', 'Lieutenant of the camp guard', 'legion-soldier', campPoint(-1.2, -16.5), faceToward(campPoint(-1.2, -16.5), gateRoadPoint(9)), [
    'Hired swords muster on the parade ground, in a line I can count.',
    'When the Marshal comes out, you stand still and you keep your mouth shut. Both, not one.',
  ], { ...EMPIRE, color: RED }),
  person('life-moros-picket-a', 'Footman Nevin', 'Army picket', 'legion-soldier', picketSpot(-2.5, 2.6), picket.yaw + Math.PI, [
    'Picket post. The camp is west along the road. Keep to it.',
    'We watch the road for the muster and for rebels. So far, sheep.',
  ], { ...EMPIRE, color: RED }),
  person('life-moros-picket-b', 'Footman Stavel', 'Army picket', 'legion-soldier', picketSpot(3.2, 2.2), picket.yaw, [
    'Stay off the fold wall. The shepherd sells to the army, and the army wants him selling.',
    'No fires here after dark. Orders.',
  ], { ...EMPIRE, color: RED }),

  // --- The Coalition's garrison, out only if the outpost falls. Plain speech, soldiers of the valley.
  person('life-outpost-valley-captain', 'Captain Tamar Venn', 'Captain of the valley companies', 'suvali-guard', campPoint(-3, 13.5), Math.PI, [
    'The Republic holds the Moros now. The army built a good fort. It will be harder to take back than it was to take.',
    'Water the horses, eat what the army left in the stores, and keep off the walls unless you are on the rota.',
  ], { ...COALITION, color: COALITION_BLUE }),
  person('life-outpost-coalition-gate-north', 'Coalition spearman', 'Valley company, at the main gate', 'suvali-guard', gateRoadPoint(26, -3.8), faceToward(centre, gateRoadPoint(40)), [
    'The outpost belongs to the Republic. Walk in if you have business; the army does not.',
    'It took a morning and a great many ladders. Mind the ditch.',
  ], { ...COALITION, color: COALITION_SLATE }),
  person('life-outpost-coalition-gate-south', 'Coalition spearman', 'Valley company, at the main gate', 'suvali-guard', gateRoadPoint(26, 3.8), faceToward(centre, gateRoadPoint(40)), [
    'We keep the gate the army kept. Same posts, better company.',
    'If you see a red cloak on the plain, shout. Loudly.',
  ], { ...COALITION, color: COALITION_BLUE }),
  person('life-outpost-coalition-rear', 'Coalition spearman', 'Valley company, at the rear gate', 'suvali-guard', campPoint(-50, 12), -Math.PI / 2, [
    'The stores are ours now, and the quartermaster’s ledgers with them. Somebody is enjoying those.',
    'The horse line is thin. The army rode out with most of it.',
  ], { ...COALITION, color: COALITION_SLATE }),

  // --- Elod's frontier guard: curt and correct. Nobody crosses; the order comes from Elod; the war is not theirs.
  person('life-elodi-captain', 'Captain Aveth Orun', 'Captain of the Elodi frontier', 'elodi-guard', frontierPoint(-9.5, -3.4), toFrontier + Math.PI, [
    'Stop there. This border is closed by order of Elod. Nobody crosses: not you, not the army, not the Republic.',
    'Elod keeps out of your war. Ambron wants our harbour and Solis wants our spears. Neither will have either while this gate stays shut.',
    'Why this border? Because it is the only one an army can march up to. The sea and the hills guard the rest of Elod, so we guard this.',
    'If you carry a letter for Elod, leave it with me. It will be read. You will not be answered here.',
  ], { color: ELODI, look: Object.freeze({ officer: true }) }),
  person('life-elodi-guard-a', 'Elodi guard', 'Frontier guard of Elod', 'elodi-guard', frontierPoint(-9.5, 3.4), toFrontier + Math.PI, [
    'No crossing. Turn back.',
    'The captain speaks for the gate. We do not.',
  ], { color: ELODI }),
  person('life-elodi-guard-b', 'Elodi guard', 'Frontier guard of Elod', 'elodi-guard', frontierPoint(-13.5, -4.6), toFrontier + Math.PI - .4, [
    'Keep to your side of the ditch.',
    'It is not our war. It will not become our war.',
  ], { color: ELODI, look: Object.freeze({ kit: 'bow' }) }),
  person('life-elodi-guard-c', 'Elodi guard', 'Frontier guard of Elod', 'elodi-guard', frontierPoint(-13.5, 4.6), toFrontier + Math.PI + .4, [
    'The border is closed. It was closed yesterday. It will be closed tomorrow.',
    'Move along. Slowly.',
  ], { color: ELODI }),
]);

export const TOWN_LIFE_IDS = Object.freeze(new Set(TOWN_LIFE_NPCS.map(npc => npc.id)));
export function townLifeLines(id) {
  const npc = TOWN_LIFE_NPCS.find(entry => entry.id === id);
  return npc ? [...npc.lines] : [];
}

// ---------------------------------------------------------------------------
// Figures on the walls
// ---------------------------------------------------------------------------
const walk = circuit => circuit.standard.walkHeight, platform = circuit => circuit.standard.towerPlatform;
const towerTop = (circuit, id) => { const t = circuit.towers.find(tower => tower.id === id); return { x: t.x, z: t.z, y: platform(circuit) + .12 }; };
/** A point on a circuit's wall walk: `along` an edge, a little inside the wall line. */
const onWalk = (circuit, edge, along) => { const e = circuit.edges[edge], p = circuit.pointOn(e, along, -.25); return { x: p.x, z: p.z, y: walk(circuit) + .07, yaw: Math.atan2(e.out.x, e.out.z) }; };
const figure = (id, role, spot, yaw, extra = {}) => Object.freeze({ id, role, x: spot.x, z: spot.z, lift: spot.y, yaw: spot.yaw ?? yaw, ...extra });
const outward = (circuit, towerId) => { const t = circuit.towers.find(tower => tower.id === towerId), e = circuit.edges[t.edge]; return Math.atan2(e.out.x, e.out.z); };

export const WALL_FIGURES = Object.freeze([
  // The army on its walls.
  figure('wall-legion-main-a', 'legion-soldier', towerTop(OUTPOST_CIRCUIT, 'outpost-main-gate-tower-a'), outward(OUTPOST_CIRCUIT, 'outpost-main-gate-tower-a'), EMPIRE),
  figure('wall-legion-main-b', 'legion-soldier', towerTop(OUTPOST_CIRCUIT, 'outpost-main-gate-tower-b'), outward(OUTPOST_CIRCUIT, 'outpost-main-gate-tower-b'), EMPIRE),
  figure('wall-legion-north', 'legion-soldier', onWalk(OUTPOST_CIRCUIT, 0, 16), 0, EMPIRE),
  // The Coalition, if the outpost falls.
  figure('wall-coalition-main-a', 'suvali-guard', towerTop(OUTPOST_CIRCUIT, 'outpost-main-gate-tower-a'), outward(OUTPOST_CIRCUIT, 'outpost-main-gate-tower-a'), { ...COALITION, tunic: COALITION_BLUE }),
  figure('wall-coalition-main-b', 'suvali-guard', towerTop(OUTPOST_CIRCUIT, 'outpost-main-gate-tower-b'), outward(OUTPOST_CIRCUIT, 'outpost-main-gate-tower-b'), { ...COALITION, tunic: COALITION_SLATE }),
  figure('wall-coalition-face', 'suvali-guard', onWalk(OUTPOST_CIRCUIT, 1, 14), 0, { ...COALITION, tunic: COALITION_BLUE }),
  // Elod on its frontier: towers and wall walk either side of the shut gate, and one on the gallery over it.
  figure('wall-elodi-gate-a', 'elodi-guard', towerTop(FRONTIER_CIRCUIT, 'frontier-gate-tower-a'), outward(FRONTIER_CIRCUIT, 'frontier-gate-tower-a'), { look: { kit: 'bow' } }),
  figure('wall-elodi-gate-b', 'elodi-guard', towerTop(FRONTIER_CIRCUIT, 'frontier-gate-tower-b'), outward(FRONTIER_CIRCUIT, 'frontier-gate-tower-b')),
  figure('wall-elodi-gallery', 'elodi-guard', { ...FRONTIER_CIRCUIT.gates[0].centre, y: walk(FRONTIER_CIRCUIT) + .15 }, toFrontier + Math.PI, { look: { kit: 'bow' } }),
  figure('wall-elodi-walk-south', 'elodi-guard', onWalk(FRONTIER_CIRCUIT, 3, 5), 0),
  figure('wall-elodi-walk-north', 'elodi-guard', onWalk(FRONTIER_CIRCUIT, 5, 12), 0),
  figure('wall-elodi-corner', 'elodi-guard', towerTop(FRONTIER_CIRCUIT, 'frontier-corner-2'), outward(FRONTIER_CIRCUIT, 'frontier-corner-2'), { look: { kit: 'bow' } }),
  figure('wall-elodi-behind', 'elodi-guard', { ...frontierPoint(8, -4), y: 0 }, toFrontier + Math.PI),
]);

/**
 * Draws and wakes the wall figures. `createCharacter` builds an actor,
 * `heightAt` is the world's ground; `update` takes the traveler's position, the
 * occupation control map and a clock, and shows only the figures that are out
 * and within `range`.
 */
export function createWallWatch({ scene, createCharacter, heightAt, range = 95 }) {
  const figures = WALL_FIGURES.map(entry => {
    const actor = createCharacter({ role: entry.role, tunic: entry.tunic, look: entry.look ?? null });
    actor.group.position.set(entry.x, heightAt(entry.x, entry.z) + entry.lift, entry.z);
    actor.group.rotation.y = entry.yaw; actor.group.visible = false; actor.group.name = `Wall figure ${entry.id}`;
    scene.add(actor.group);
    return { entry, actor };
  });
  return {
    figures,
    update(position, control, seconds) {
      for (const { entry, actor } of figures) {
        const near = Math.hypot(entry.x - position.x, entry.z - position.z) < range;
        const show = near && isOut(entry, control);
        actor.group.visible = show;
        if (show) actor.animate(seconds + entry.x * .01, 0, true, {});
      }
    },
  };
}

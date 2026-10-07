/**
 * The garrison of Feradom's border: the Duchy's own army, not the Empire's, in the pass castles and on
 * the towers (src/feradom-forts.js). The user, 27 September 2026: "fortresses occupied by soldiers from
 * the Duchy of Feradom's own independent army, which has its own distinct uniform" - the
 * `feradom-soldier` and `feradom-officer` builds in src/characters.js, mail to the knee under the duchy's
 * russet, the green of the hills, a nasal helm and a kite shield.
 *
 * On the ground, a captain and two spearmen at the Road Pass castle's shut gate and a spearman at the back
 * gate of each of the other five, who can be spoken to; on the towers and walls, sentries who are figures
 * (src/town-life.js): drawn and animated, never spoken to. Nobody has a name the lore has not given, so
 * they go by rank. Pure: no three, no DOM.
 */
import { PASSES, passPoint, midlineAt } from './feradom-world.js';
import { PASS_CASTLES, FERADOM_STANDARD, FERADOM_TOWERS } from './feradom-forts.js';

const freeze = Object.freeze;
const toward = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);
export const FERADOM_CLOTH = freeze({ soldier: 0x9a6f4f, officer: 0x8c5f41 });
/** Ambient soldiers are drawn within this many metres, like the rest of the built places' people. */
const VIEW = 80;
/**
 * `approach` is where anybody walks up to a stand from: the border is shut and every castle's gate
 * toward it too, so it is the valley behind the castle, inside the duchy.
 */
const person = (id, name, role, modelRole, spot, yaw, lines, approach) => freeze({
  id, name, role, modelRole, x: spot.x, z: spot.z, yaw, lines: freeze(lines), viewRange: VIEW, approach: freeze({ x: approach.x, z: approach.z }),
  color: modelRole === 'feradom-officer' ? FERADOM_CLOTH.officer : FERADOM_CLOTH.soldier,
});
const road = PASSES.find(pass => pass.id === 'road-pass');

export const FERADOM_GARRISON = freeze([
  // The Road Pass: the captain inside the shut front gate, a spearman either side of it.
  person('feradom-road-captain', 'Captain of the Road Pass', 'A pass-lord’s captain, the Road Pass castle', 'feradom-officer',
    passPoint(road, 3.5, 45), toward(passPoint(road, 0, 45), passPoint(road, 0, 30)), [
      'The Road Pass is shut, on the pass-lord’s word and the council’s. Nothing comes up from Pueth, and nothing goes down.',
      'Ambron has a barrier at its end of the road and we have a gate at ours. Theirs is a rope between two posts. Ours is not.',
      'Six passes, six castles, and a tower above every narrows. A small force stops a large one here. That is the whole of the art, and every man on these walls knows it by heart.',
      'Feradom has refused outside rule before, and some of the lords who did it lived to tell of it. We stand here so that it stays a thing a lord can do.',
    ], passPoint(road, 0, 100)),
  person('feradom-road-gate-a', 'Feradom spearman', 'Of the Road Pass garrison', 'feradom-soldier',
    passPoint(road, -3.2, 43), toward(passPoint(road, 0, 43), passPoint(road, 0, 30)), [
      'Gate’s shut. The captain speaks for it.',
      'Mail to the knee and a shield to the chin. The Crefs fought that way, and so do we.',
    ], passPoint(road, 0, 100)),
  person('feradom-road-gate-b', 'Feradom spearman', 'Of the Road Pass garrison', 'feradom-soldier',
    passPoint(road, 6.8, 43.5), toward(passPoint(road, 0, 43), passPoint(road, 0, 30)), [
      'In Pueth they call us the pass-lords’ men. The local lords coordinate our watch through their council.',
      'Winter shuts the high passes for us. It is the autumn that keeps us awake.',
    ], passPoint(road, 0, 100)),
  // The other five: a spearman at the open back gate, on the coast side, where anybody inside the duchy comes up.
  ...PASS_CASTLES.filter(castle => !castle.great).map(castle => {
    const pass = PASSES.find(one => one.id === castle.pass);
    const at = passPoint(pass, 3.6, 76);
    return person(`feradom-${pass.id}-gate`, 'Feradom spearman', `Of the ${pass.name.replace(/^The /, '')} garrison`, 'feradom-soldier',
      at, toward(at, passPoint(pass, 0, 100)), [
        `This is ${pass.name}. The castle keeps it, and the tower above the narrows keeps the castle’s eyes open.`,
        'The front gate stays shut while the council says so. You can go no further south than the wall.',
        'Fir on the tops and oak lower down, with the upper old growth kept and the lower stands managed by the local holdings. The shipwrights of Elagos would pay anything for it, and some years they do.',
      ], passPoint(pass, 0, 110));
  }),
]);
export const FERADOM_GARRISON_IDS = freeze(new Set(FERADOM_GARRISON.map(npc => npc.id)));

// ---------------------------------------------------------------------------
// Sentries on the towers and the walls
// ---------------------------------------------------------------------------
const figure = (id, role, spot, lift, yaw) => freeze({ id, role, x: spot.x, z: spot.z, lift, yaw });
const circuitTower = (castle, id) => castle.circuit.towers.find(tower => tower.id === id);
export const FERADOM_WALL_FIGURES = freeze([
  ...PASS_CASTLES.flatMap(castle => {
    const pass = PASSES.find(one => one.id === castle.pass), out = toward(pass.yard, pass.narrows), out2 = [];
    const front = castle.circuit.gates.find(gate => gate.id.endsWith('front-gate'));
    if (castle.great) {
      // The great castle: a sentry on each tower of the front gate, one on the front wall's walk, one on the keep.
      for (const side of ['a', 'b']) {
        const tower = circuitTower(castle, `${front.id}-tower-${side}`);
        out2.push(figure(`feradom-${pass.id}-gate-tower-${side}`, 'feradom-soldier', tower, FERADOM_STANDARD.towerPlatform + .12, out));
      }
      const edge = castle.circuit.edges[0], walk = castle.circuit.pointOn(edge, 3.2, -.25);
      out2.push(figure(`feradom-${pass.id}-front-walk`, 'feradom-soldier', walk, FERADOM_STANDARD.walkHeight + .07, Math.atan2(edge.out.x, edge.out.z)));
      out2.push(figure(`feradom-${pass.id}-keep`, 'feradom-officer', castle.keep, castle.keep.height + .25, out));
    } else {
      // A smaller castle: a sentry on the front shoulder tower on the tower-above-the-narrows' far side.
      const tower = castle.circuit.towers.find(one => one.kind === 'corner');
      out2.push(figure(`feradom-${pass.id}-shoulder`, 'feradom-soldier', tower, FERADOM_STANDARD.towerPlatform + .12, out));
    }
    return out2;
  }),
  // A sentry on top of every tower above a narrows, and on every watchtower, looking out over the border.
  ...FERADOM_TOWERS.map(tower => figure(`feradom-${tower.id}-sentry`, 'feradom-soldier', { x: tower.x + .8, z: tower.z + .8 }, tower.height + .25,
    tower.looks ?? Math.atan2(-midlineAt(tower.s).inward.x, -midlineAt(tower.s).inward.z))),
]);

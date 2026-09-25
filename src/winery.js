/**
 * Vaervelm Caelazh, the winery southeast of Port Calos in Luscia where Lakota
 * worked before he came to Tidehaven. The name is the Suval tongue, a coastal
 * Mittoli, for Paradise Springs, the Virginia winery it is drawn from: *vaer*
 * (good) + *velm* (green, fertile place), the good green place, which is what
 * "paradise" first meant, a walled garden; and *cael* (water, to flow) + *-azh*
 * (to endure), the water that endures, a spring that has never failed.
 *
 * An old log cabin that was the first house on the land and is now where the
 * wine is poured, a great timber hall on a stone foot where it is made, a
 * flagstone terrace, and the spring: water welling out of a limestone outcrop
 * on the rise, where the Svaleen say one of Thareth's tears fell on the stone,
 * into a stone basin, and away down the slope as a rill past the vines. Eight
 * varieties grow in blocks of two rows down the slope east of the hall.
 *
 * Laid out in world metres around WINERY.centre: `a` metres east, `b` metres
 * south (north is -z). Pure: no three, no DOM. `src/winery-world.js` builds it.
 */
import { REGION_CELLS } from './region-world.js';

const freeze = Object.freeze;
const point = (x, z) => freeze({ x, z });

/**
 * What grows here: real varieties the Virginia vineyards grow. `leaf` and `fruit`
 * tint the rows; `vine` is what the traveler sees reading the plate at the block's head.
 */
export const VARIETIES = freeze({
  viognier: freeze({ name: 'Viognier', colour: 'white', leaf: 0x6b9a3f, fruit: 0xcfc36a,
    vine: 'Small golden grapes in loose, uneven clusters, and fewer of them than the rows around it: a stingy vine that makes a generous wine.' }),
  chardonnay: freeze({ name: 'Chardonnay', colour: 'white', leaf: 0x67943c, fruit: 0xc7d07a,
    vine: 'Tight clusters of round green-gold berries. It buds first of anything in the vineyard, and Rob watches the spring frosts for it.' }),
  'vidal-blanc': freeze({ name: 'Vidal Blanc', colour: 'white', leaf: 0x729f45, fruit: 0xd9d488,
    vine: 'Big, heavy clusters of pale berries on a sturdy vine that shrugs off a hard winter. Some are left hanging late, to shrivel and sweeten.' }),
  'cabernet-franc': freeze({ name: 'Cabernet Franc', colour: 'red', leaf: 0x557f33, fruit: 0x4a2b56,
    vine: 'Small blue-black berries, and leaves that smell green when you brush them. It ripens before the autumn storms, which is why it suits this hill.' }),
  merlot: freeze({ name: 'Merlot', colour: 'red', leaf: 0x5a8535, fruit: 0x3f2552,
    vine: 'Loose clusters of thin-skinned dark berries, softer to the touch than their neighbours. The birds find these first.' }),
  'petit-verdot': freeze({ name: 'Petit Verdot', colour: 'red', leaf: 0x4f7a30, fruit: 0x2e1a3e,
    vine: 'Tiny, thick-skinned, almost black berries, the last to ripen on the hill. Crush one and your fingers are purple for a day.' }),
  tannat: freeze({ name: 'Tannat', colour: 'red', leaf: 0x4c7630, fruit: 0x2a1836,
    vine: 'Dense clusters of inky berries with thick skins and big seeds: all the grip of the wine is already in the fruit.' }),
  norton: freeze({ name: 'Norton', colour: 'red', leaf: 0x4a7a2d, fruit: 0x2b1b40,
    vine: 'Small dark berries on a rangy vine that climbs anything it can reach. The native grape: it grew wild up the trees here before anyone planted a row.' }),
});
export const VARIETY_IDS = Object.freeze(Object.keys(VARIETIES));

export const WINERY_CELL = REGION_CELLS.Luscia.find(cell => cell.q === 8 && cell.r === 110);
export const WINERY = freeze({ id: 'paradise-springs', name: 'Vaervelm Caelazh', meaning: 'Paradise Springs', region: 'Luscia', centre: point(WINERY_CELL.x, WINERY_CELL.z), radius: 46 });
export const wineryPoint = (a, b) => point(WINERY.centre.x + a, WINERY.centre.z + b);

export const WINERY_LAYOUT = freeze({
  /** The name board at the lane's end, facing the traveler coming up from the downs. */
  sign: freeze({ ...wineryPoint(-37.5, -16), facing: -Math.PI / 2 }),
  /** The log cabin: the first house on the land, now the tasting room. Porch on the south side, chimney at the west end. */
  cabin: freeze({ ...wineryPoint(-19, -12), width: 7.5, depth: 5.6, eaves: 3.1, ridge: 5.2, porch: 2.2 }),
  /** The hall: stone foot, timber above, a tall barn roof and a cupola; its great doors open south onto the terrace. */
  hall: freeze({ ...wineryPoint(4, -14), width: 19, depth: 11, stone: 1.3, eaves: 5.4, ridge: 9.4 }),
  /** The terrace in front of the hall, and its tables. */
  terrace: freeze({ ...wineryPoint(4, -1.5), width: 17, depth: 7 }),
  tables: freeze([wineryPoint(-2.5, -2), wineryPoint(2.5, -.8), wineryPoint(7.5, -2), wineryPoint(11.5, -.6)]),
  /** Barrels resting on their chocks at the hall's east end. */
  barrels: freeze([wineryPoint(15.5, -10), wineryPoint(15.5, -8.9), wineryPoint(15.5, -7.8), wineryPoint(16.6, -9.45), wineryPoint(16.6, -8.35)]),
  /**
   * The spring. Water wells up at the foot of a limestone outcrop on the rise west
   * of the cabin, into a stone basin, and runs off down the slope as a short rill
   * into the hollow below, where it stands as a reedy pool. Every step of it runs
   * downhill: the ground was measured for it.
   */
  spring: freeze({
    source: wineryPoint(-31.5, 10), basin: freeze({ ...wineryPoint(-28.6, 11.2), radius: 1.9 }),
    rill: freeze([wineryPoint(-26.2, 12.8), wineryPoint(-23.4, 14.6), wineryPoint(-20.8, 16.5), wineryPoint(-18.4, 18.5)]),
    pool: freeze({ ...wineryPoint(-15.8, 20.6), radius: 2.4 }),
  }),
  /** The vines: eight varietal blocks of two rows each down the slope east of the hall, in five-metre panels between posts. */
  rows: freeze(VARIETY_IDS.flatMap((variety, block) => [0, 1].map(k => freeze({ a: 20 + block * 2.8 + k * 1.15, from: -17, to: 19, variety })))),
  /** At the head of each block, a painted plate with the grape's name. */
  plates: freeze(VARIETY_IDS.map((variety, block) => freeze({ ...wineryPoint(20 + block * 2.8 + .575, -20), variety, facing: Math.PI }))),
  /** The short lane northwest to Port Calos's lower street. */
  lane: freeze([wineryPoint(-22, -2), wineryPoint(-34, -2), wineryPoint(-34, -16), point(-447, 345), point(-453, 328)]),
});

/** The vineyard's gentle bank stays inside its own hex, without filling the inlet. */
export function wineryGround(x, z, ground) {
  const dx=x-WINERY.centre.x,dz=z-WINERY.centre.z;
  const edge=Math.min(50-Math.abs(dx),(100-Math.abs(dx)-Math.sqrt(3)*Math.abs(dz))/2);
  if(edge<=0)return ground;
  const t=Math.min(1,edge/8),weight=t*t*(3-2*t);
  const terrace=6.5-dx*.012-dz*.035;
  return ground+(terrace-ground)*weight;
}

export const VINTNER = freeze({ id: 'vintner', name: 'Rob', role: 'Head winemaker and viticulture teacher', modelRole: 'wine-maker', color: 0x7d3a45, skin: 0xc79a74,
  look: freeze({hairStyle:'short-cropped',hair:0x999a94,beard:false,hat:false}) });
export const CELLAR_HAND = freeze({ id: 'cellar-hand', name: 'MAT', role: 'Winemaker and Wine teacher', modelRole: 'wine-maker', color: 0x6a5a44, skin: 0x895b3c,
  look: freeze({hairStyle:'cropped',hair:0x1d1815,beard:false,hat:false}) });
/** KAT keeps her original appearance; Rob and MAT join her as the three winemakers. */
export const WINEMAKER = freeze({ id: 'winemaker', name: 'KAT', role: 'Winemaker and Wine teacher', modelRole: 'wine-maker', color: 0x53657f, skin: 0xd8b48d });

export const WINERY_STANDS = freeze({
  vintner: freeze({ ...wineryPoint(-17.5, -4.6), yaw: 0 }),
  'cellar-hand': freeze({ ...wineryPoint(13.2, -7.4), yaw: -Math.PI / 2 }),
  // On the crush pad at the hall's great doors, where the fruit comes in and the ferments stand.
  winemaker: freeze({ ...wineryPoint(.5, -7.4), yaw: 0.22 }),
});

/** What Kat says over the ferments, one at a time. There is more of her to come. */
export const KAT_LINES = freeze([
  'Mind your feet, the pad is wet. It is always wet. I have not had a dry boot since the picking started.',
  'This one is three days in and talking to itself. You can hear it from the doors — a sound like rain on a roof, a long way off. When it stops, it is done, and not before.',
  'Punching down. The skins float up and dry out in a cap on top, and if you leave them there you get vinegar and a lecture from Rob, so: down they go, four times a day, arms in to the elbow.',
  'KAT, Rob and MAT. Three short names, and more work than three pairs of hands ought to manage.',
  'Rob decides what comes through those doors and I decide what happens to it afterward, and the truth is he has the harder half. I can rescue a middling grape. Nobody can rescue a bad one.',
]);

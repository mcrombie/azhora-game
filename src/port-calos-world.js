/** Port Calos: the Luscian trading town at the Caloss mouth, in world metres. */
import { SUVAL_ROAD, calossDistance, landDistance } from './region-world.js';
const freeze = Object.freeze;
const point = (x, z, extra = {}) => freeze({ x, z, ...extra });
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, value) => { const t = clamp((value - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

export const PORT_CALOS = point(-472, 293, { id: 'port-calos', name: 'Port Calos', radius: 84 });
export const PORT_CALOS_QUAY = freeze({ minX: -427, maxX: -364, minZ: 280, maxZ: 292, deckY: 3,
  root: point(-426, 286), head: point(-369, 286) });
export const PORT_CALOS_LANDING = point(-410, 286, { yaw: -Math.PI / 2 });
export const PORT_CALOS_JESS = point(-409, 288.5, { yaw: -Math.PI / 2 });
export const PORT_CALOS_MOORING = point(-389, 296, { yaw: Math.PI / 2 });
export const PORT_CALOS_SEA_APPROACH = point(-344, 296);

/** A westward street links directly to the existing Nothom / Elod road. */
export const PORT_CALOS_ROAD = freeze([
  SUVAL_ROAD[2], point(-566, 316), point(-548, 306), point(-529, 303),
  point(-505, 303), point(-480, 301), point(-460, 294), point(-441, 287), point(-427, 286),
  PORT_CALOS_LANDING, point(-369, 286),
]);
export const PORT_CALOS_PATHS = freeze([
  freeze({ id: 'port-calos-road', points: PORT_CALOS_ROAD, width: 4.8, kind: 'road' }),
  freeze({ id: 'port-calos-upper-street', points: freeze([point(-537,303),point(-537,276),point(-531,251),point(-505,253),point(-477,258),point(-455,263),point(-433,270),point(-426,286)]), width: 3.1, kind: 'trail' }),
  freeze({ id: 'port-calos-lower-street', points: freeze([point(-535,303),point(-535,329),point(-506,330),point(-479,330),point(-453,328),point(-453,310),point(-440,296),point(-426,286)]), width: 3.1, kind: 'trail' }),
  freeze({ id: 'port-calos-market-lane', points: freeze([point(-481,259),point(-482,275),point(-481,301),point(-481,316),point(-479,330)]), width: 2.7, kind: 'trail' }),
]);

const building = (id, x, z, width, depth, height, yaw, roof, wall) => freeze({ id, x, z, width, depth, height, yaw, roof, wall });
export const PORT_CALOS_BUILDINGS = freeze([
  building('port-calos-chandlery', -521,261,12,8,4.5,Math.PI,'#64766c','#d9d1b9'),
  building('port-calos-net-loft', -495,265,13,9,5.2,Math.PI,'#526c6b','#c9c9b3'),
  building('port-calos-river-house', -470,270,10,8,4.0,Math.PI,'#a87954','#e0d4b4'),
  building('port-calos-custom-house', -452,279,12,9,5.1,Math.PI,'#536575','#d4ceb5'),
  building('port-calos-west-house', -525,284,11,9,4.0,0,'#936b51','#d3c7a7'),
  building('port-calos-bakery', -503,285,11,10,4.2,0,'#9c7258','#dfcba9'),
  building('port-calos-market-house', -470,281,11,8,4.4,0,'#6c8068','#d1d5b9'),
  building('port-calos-boat-shed', -439,317,14,10,4.1,Math.PI/2,'#6d705e','#bebaa5'),
  building('port-calos-salt-store', -523,317,12,10,4.1,Math.PI,'#777b6c','#d4cbb3'),
  building('port-calos-cooper', -501,317,11,9,4.0,Math.PI,'#95775a','#d8cdb0'),
  building('port-calos-lower-house', -470,316,11,8,4.3,Math.PI,'#657a77','#d5d1b8'),
  building('port-calos-east-house', -444,338,10,8,4.0,-Math.PI/2,'#a57a54','#e0d2b1'),
  building('port-calos-south-house', -522,342,12,9,4.2,Math.PI,'#857154','#d3ceb3'),
  building('port-calos-garden-house', -496,343,11,8,4.0,Math.PI,'#697762','#dcd4b8'),
  building('port-calos-weaver', -470,342,12,9,4.0,Math.PI,'#7f7664','#cbd1b9'),
  building('port-calos-inn', -551,290,15,12,5.3,Math.PI/2,'#a0784f','#e0d3b2'),
]);

export const PORT_CALOS_NPC_POSITIONS = freeze({
  'port-calos-harbourmaster': point(-416,282.5,{yaw:Math.PI/2}),
  'port-calos-innkeeper': point(-535,307,{yaw:Math.PI/2}),
  'port-calos-fishmonger': point(-459,296,{yaw:-Math.PI/2}),
  'port-calos-netmaker': point(-450,272,{yaw:Math.PI/2}),
  'port-calos-shipwright': point(-428,298,{yaw:-Math.PI/2}),
  'port-calos-carter': point(-504,301,{yaw:Math.PI/2}),
  'port-calos-resident': point(-496,330,{yaw:Math.PI/2}),
  'port-calos-dockhand': point(-388,282.5,{yaw:-Math.PI/2}),
});
export const PORT_CALOS_LANDMARKS = freeze([
  freeze({ ...PORT_CALOS, radius: 72, description: 'A busy Luscian harbor at the Caloss mouth: timber houses above the river, fish stalls, net lofts and a stone quay reaching into the inlet. Jess sails from here to Tidewater Haven.' }),
]);

export function inPortCalos(x, z, padding = 0) {
  return x >= -563 - padding && x <= -355 + padding && z >= 247 - padding && z <= 352 + padding;
}
/** Clear natural scatter out of the built streets, yards and quay. */
export function portCalosClear(x, z, padding = 0) { return inPortCalos(x,z,padding); }
export function portCalosDeckHeight(x, z) {
  const q = PORT_CALOS_QUAY;
  return x >= q.minX && x <= q.maxX && z >= q.minZ && z <= q.maxZ ? q.deckY : null;
}

/**
 * The made town terrace slopes toward its quays. This is deliberately restricted
 * to existing dry bank: it cannot close the river or fill the harbor water.
 */
export function portCalosGround(x, z, ground) {
  // Cut the original bank beneath the quay before the coarse terrain is meshed.
  // A margin of one terrain cell keeps interpolated grass faces below its deck.
  // This only lowers earth; water is never displaced or raised.
  const q=PORT_CALOS_QUAY;
  const quayCut=smooth(q.minX-21,q.minX-3,x)*(1-smooth(q.maxX+2,q.maxX+7,x))
    *smooth(q.minZ-12,q.minZ-8,z)*(1-smooth(q.maxZ+8,q.maxZ+12,z));
  const cutQuay=value=>value+(Math.min(value,q.deckY-.06)-value)*quayCut;
  if (x < -579 || x > -424 || z < 231 || z > 368) return cutQuay(ground);
  if (calossDistance(x,z) < 16 || landDistance(x,z) < 15) return cutQuay(ground);
  const edge = Math.min(x + 579, -424 - x, z - 231, 368 - z);
  let weight = smooth(0, 14, edge);
  // Taper before the bank, independently of the rectangular town limits.
  weight *= smooth(16,24,calossDistance(x,z)) * smooth(15,25,landDistance(x,z));
  const terrace = 8.9 - clamp((x + 510) / 65, 0, 1) * 2.7;
  let target = terrace;
  // The broad cart ramp is one continuous slope, with a level quay at its foot.
  if (x > -454 && z > 277 && z < 296) {
    const ramp = 6.2 - clamp((x + 448) / 21, 0, 1) * 3.2;
    target += (ramp - target) * (1 - smooth(5,9.5,Math.abs(z - 286))) * smooth(-454,-448,x);
    weight = Math.max(weight, (1-smooth(5,9.5,Math.abs(z-286))) * smooth(-450,-445,x));
  }
  return cutQuay(ground + (target-ground) * weight);
}

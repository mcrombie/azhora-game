/** Nylon occupies Eer's dry eastern bank at the Lizeem mouth. Pure layout: the
 * river and coastline remain their authored shapes; nothing crosses to Gala. */
import { LIZEEM_REACH, EER_CHANNELS, courseDistance, coursePosition, courseHalfAt } from '../western-regions/west-regions.js';
import { hexOwnerAt, landDistance } from '../../../world/terrain/region-world.js';

const freeze = Object.freeze;
const point = (x, z) => freeze({ x, z });
const smooth = value => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };

export const NYLON = freeze({
  id: 'nylon', name: 'Nylon', region: 15, x: -1320, z: 1115,
  elevation: 7.5, wallHeight: 40, wallThickness: 8, towerHeight: 52,
  palaceHeight: 76, libraryHeight: 38, libraryCrownHeight: 62,
  arrival: point(-1308, 1048), plaza: point(-1320, 1115),
  harbor: point(-1302, 1191), mouth: point(LIZEEM_REACH.points.at(-1).x, LIZEEM_REACH.points.at(-1).z),
  bounds: freeze({ minX: -1376, maxX: -1262, minZ: 1066, maxZ: 1174 }),
  // Solis retains its authored 100 by 84 m wall circuit. Nylon is about 20% larger.
  referenceSolisArea: 100 * 84,
});

export const NYLON_OUTLINE = freeze([
  [-1376, 1066], [-1262, 1066], [-1262, 1152],
  [-1302, 1174], [-1338, 1163], [-1363, 1132],
].map(([x, z]) => point(x, z)));

export function nylonSegmentDistance(x, z, a, b) {
  const dx = b.x - a.x, dz = b.z - a.z, length2 = dx * dx + dz * dz;
  const t = length2 ? Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / length2)) : 0;
  return Math.hypot(x - a.x - dx * t, z - a.z - dz * t);
}
export function inNylon(x, z) {
  let inside = false;
  for (let i = 0, j = NYLON_OUTLINE.length - 1; i < NYLON_OUTLINE.length; j = i++) {
    const a = NYLON_OUTLINE[i], b = NYLON_OUTLINE[j];
    if ((a.z > z) !== (b.z > z) && x < (b.x - a.x) * (z - a.z) / (b.z - a.z) + a.x) inside = !inside;
  }
  return inside;
}
export const NYLON_AREA = Math.abs(NYLON_OUTLINE.reduce((sum, a, i) => {
  const b = NYLON_OUTLINE[(i + 1) % NYLON_OUTLINE.length];
  return sum + a.x * b.z - b.x * a.z;
}, 0)) / 2;
const boundaryDistance = (x, z) => Math.min(...NYLON_OUTLINE.map((a, i) => nylonSegmentDistance(x, z, a, NYLON_OUTLINE[(i + 1) % NYLON_OUTLINE.length])));

export const NYLON_GATES = freeze([
  freeze({ id: 'nylon-north-gate', name: 'The Gate of Inquiry', edge: 0, x: -1308, z: 1066, width: 12 }),
  freeze({ id: 'nylon-river-gate', name: 'The Lizeem Gate', edge: 4, x: -1350.5, z: 1147.5, width: 11 }),
]);
const path = (id, width, coordinates) => freeze({ id, width, points: freeze(coordinates.map(([x, z]) => point(x, z))) });
export const NYLON_PATHS = freeze([
  path('nylon-inquiry-way', 8, [[-1308, 1030], [-1308, 1066], [-1308, 1115], [-1308, 1135]]),
  path('nylon-salon-street', 7, [[-1356, 1115], [-1334, 1115], [-1320, 1115], [-1308, 1115], [-1280, 1115], [-1271, 1115]]),
  path('nylon-river-steps', 6, [[-1368, 1150], [-1364, 1157], [-1350.5, 1147.5], [-1337, 1135], [-1320, 1135], [-1320, 1115]]),
  path('nylon-library-approach', 5, [[-1334, 1115], [-1334, 1107]]),
  path('nylon-palace-approach', 5, [[-1284, 1115], [-1284, 1106]]),
  path('nylon-estuary-approach', 6, [[-1350.5,1147.5],[-1358,1155],[-1348,1168],[-1328,1191],[-1302,1191],[-1268,1191]]),
  path('nylon-west-pier-walk', 4, [[-1310,1191],[-1310,1257]]),
  path('nylon-middle-pier-walk', 4, [[-1289,1191],[-1289,1243]]),
  path('nylon-east-pier-walk', 4, [[-1269,1191],[-1269,1263]]),
]);

const building = (id, name, x, z, width, depth, height, kind = 'house', palette = 0) => freeze({ id, name, x, z, width, depth, height, kind, palette });
export const NYLON_BUILDINGS = freeze([
  building('nylon-library', 'The Great Library of Nylon', -1334, 1091, 32, 28, NYLON.libraryHeight, 'library'),
  building('nylon-palace', 'The Palace of the Civic Council', -1291, 1094, 18, 18, NYLON.palaceHeight, 'palace'),
  building('nylon-west-academy', 'The River Academy', -1360, 1086, 10, 18, 30, 'academy', 1),
  building('nylon-printers', 'The Printing House', -1357, 1102, 10, 10, 24, 'house', 2),
  building('nylon-north-salon', 'The Upper Salon', -1297, 1075, 12, 6, 28, 'salon', 3),
  building('nylon-river-exchange', 'The River Exchange', -1348, 1129, 11, 10, 29, 'exchange', 1),
  building('nylon-harbor-archive', 'The Tide Archive', -1330, 1150, 12, 13, 32, 'archive', 2),
  ...[
    [-1293,1127,10,13,33], [-1277,1127,12,13,27],
    [-1285,1145,15,12,31], [-1311,1155,14,12,35],
    [-1340,1073.5,14,5,26], [-1323,1073.5,12,5,31],
    [-1294,1157,10,8,25], [-1274,1104,6,6,29],
  ].map(([x,z,w,d,h], index) => building(`nylon-townhouse-${index + 1}`, ['Booksellers’ house', 'Salons above the quay', 'Nyloni terrace house', 'Scholars’ lodging'][index % 4], x, z, w, d, h, 'house', index % 4)),
]);

export const NYLON_HARBOR = freeze({
  name:'The Lizeem Sea Gate', x:-1288,z:1245, deckHeight:4.2,waterHeight:.45,
  entrance:point(-1288,1300),entranceWidth:36,
  bounds:freeze({minX:-1385,maxX:-1234,minZ:1120,maxZ:1312}),
});
export const NYLON_QUAYS = freeze([
  freeze({id:'nylon-estuary-quay',name:'The Estuary Provision Quay',x:-1296,z:1191,width:64,depth:10,elevation:NYLON_HARBOR.deckHeight}),
]);
/** The city's curtain is also the harbor's landward defense. Each mole starts
 * at an existing corner bastion, without a second wall behind the quays.
 * The river gate opens onto the protected provision approach; the original
 * Lizeem channel and the 36m gap between the sea tower centres stay open. */
export const NYLON_HARBOR_WALLS = freeze([
  freeze({id:'nylon-harbor-west',height:27,thickness:4,bastionIndex:4,points:freeze([
    NYLON_OUTLINE[5],point(-1376,1160),
    point(-1360,1175),point(-1340,1188),point(-1320,1200),point(-1324,1230),point(-1324,1286),point(-1306,1300),
  ])}),
  freeze({id:'nylon-harbor-east',height:27,thickness:4,bastionIndex:1,points:freeze([
    NYLON_OUTLINE[2],point(-1242,1245),point(-1246,1288),point(-1270,1300),
  ])}),
]);
export const NYLON_COLOSSUS = freeze({
  id:'nylon-colossus',name:'The Beacon of Inquiry',
  x:NYLON_HARBOR.entrance.x,z:NYLON_HARBOR.entrance.z,
  towerHeight:35,plinthHeight:1.6,baseY:NYLON_HARBOR.deckHeight+35+1.6,
  feet:freeze(NYLON_HARBOR_WALLS.map(wall=>wall.points.at(-1))),
});
const deck=(id,name,kind,a,b,width)=>freeze({id,name,kind,a:freeze({x:a[0],y:a[1],z:a[2]}),b:freeze({x:b[0],y:b[1],z:b[2]}),width});
export const NYLON_HARBOR_DECKS=freeze([
  deck('nylon-harbor-ramp','The Provision Ramp','ramp',[-1348,6.210923476416043,1168],[-1328,4.2,1191],7),
  deck('nylon-harbor-quay','The Estuary Provision Quay','deck',[-1328,4.2,1191],[-1264,4.2,1191],10),
  deck('nylon-west-pier','The Upriver Berths','deck',[-1310,4.2,1194],[-1310,4.2,1259],7),
  deck('nylon-middle-pier','The Scholars’ Berths','deck',[-1289,4.2,1194],[-1289,4.2,1245],7),
  deck('nylon-east-pier','The Sea Berths','deck',[-1269,4.2,1194],[-1269,4.2,1265],7),
]);
function deckSample(deck,x,z,margin=0){
  const dx=deck.b.x-deck.a.x,dz=deck.b.z-deck.a.z,len=Math.hypot(dx,dz),px=x-deck.a.x,pz=z-deck.a.z;
  const along=(px*dx+pz*dz)/len,across=(px*-dz+pz*dx)/len;
  if(along<-.001-margin||along>len+.001+margin||Math.abs(across)>deck.width/2+margin)return null;
  return deck.a.y+(deck.b.y-deck.a.y)*Math.max(0,Math.min(1,along/len));
}
/** Physical made surfaces, kept separate from the river/sea bed. Rendered deck
 * slabs and world.heightAt use this same query, including the gentle land ramp. */
export function nylonHarborDeckHeight(x,z){
  let top=null;
  for(const deck of NYLON_HARBOR_DECKS){const y=deckSample(deck,x,z);if(y!==null)top=top===null?y:Math.max(top,y);}
  return top;
}
export const NYLON_HARBOR_BOATS=freeze([
  freeze({id:'nylon-grain-barge',name:'The Upriver Grain Barge',x:-1299,z:1228,width:5.8,length:22,mast:16,sail:'#e3d2a4',hull:'#5b4635'}),
  freeze({id:'nylon-coastal-cutter',name:'The Iberos Coastal Cutter',x:-1279,z:1246,width:5.7,length:24,mast:22,sail:'#8eb6ac',hull:'#3b5558'}),
  freeze({id:'nylon-library-launch',name:'The Library Launch',x:-1299,z:1208,width:3.1,length:10,mast:0,sail:'#e3d2a4',hull:'#6a4d35'}),
]);
export const NYLON_LANDMARKS = freeze([
  freeze({ id: 'nylon', name: 'Nylon', region: 15, ...NYLON.plaza, radius: 80 }),
  freeze({ id: 'nylon-library', name: 'The Great Library of Nylon', region: 15, x: -1334, z: 1110, radius: 20 }),
  freeze({ id: 'nylon-palace', name: 'The Council Tower', region: 15, x: -1284, z: 1106, radius: 15 }),
  freeze({ id: 'nylon-harbor', name: 'The Fortified Estuary Harbor', region: 15, ...NYLON.harbor, radius: 75 }),
]);

const waters = [LIZEEM_REACH, ...EER_CHANNELS];
export function nylonRiverClearance(x, z) {
  return Math.min(...waters.map(river => courseDistance(river, x, z) - courseHalfAt(river, coursePosition(river, x, z))));
}
function nearby(x, z, margin = 0) {
  const b = {minX:Math.min(NYLON.bounds.minX,NYLON_HARBOR.bounds.minX),maxX:Math.max(NYLON.bounds.maxX,NYLON_HARBOR.bounds.maxX),minZ:NYLON.bounds.minZ,maxZ:NYLON_HARBOR.bounds.maxZ};
  return x > b.minX - 34 - margin && x < b.maxX + 24 + margin && z > b.minZ - 48 - margin && z < b.maxZ + 24 + margin;
}
/** A dry masonry platform, with a gently graded land approach. Never fills a channel,
 * raises the shore, or writes on the opposite bank, even within the blending skirt. */
export function nylonGround(x, z, base) {
  if (!nearby(x, z) || hexOwnerAt(x, z) !== 'Eer' || landDistance(x, z) < 12) return base;
  const clearance = nylonRiverClearance(x, z);
  if (clearance <= 8) return base;
  const weight = (inNylon(x, z) ? 1 : 1 - smooth(boundaryDistance(x, z) / 22)) * smooth((clearance - 8) / 10) * smooth((landDistance(x, z) - 12) / 12);
  return base + (NYLON.elevation - base) * weight;
}
/** Shared by all scenery and wildlife scatter, including subsequently streamed hexes. */
export function nylonReserved(x, z, margin = 0) {
  if (!nearby(x, z, margin)) return false;
  if (inNylon(x, z) || boundaryDistance(x, z) < 10 + margin) return true;
  if(NYLON_HARBOR_DECKS.some(d=>deckSample(d,x,z,3+margin)!==null))return true;
  return [...NYLON_PATHS, ...NYLON_HARBOR_WALLS].some(p => p.points.some((a, i) => i > 0 && nylonSegmentDistance(x, z, p.points[i - 1], a) < (p.width ?? p.thickness) / 2 + 3 + margin));
}

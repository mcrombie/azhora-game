/** Aevis: the Avite bronze city on the east-facing Southern Ascarth coast.
 * The user's chosen Southern Ascarth coast overrides the older northern-site lore.
 * Landward curtains protect a compact city; its eastern quays face an open sea. */
import { hexOwnerAt, landDistance } from '../../../world/terrain/region-world.js';

const freeze = Object.freeze;
const point = (x, z) => freeze({ x, z });
const clamp = value => Math.max(0, Math.min(1, value));
const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };

export const AEVIS = freeze({
  id: 'aevis', name: 'Aevis', region: 24, regionName: 'Southern Ascarth',
  hex: freeze({ q: -6, r: 128 }), x: -921, z: 1890, elevation: 11,
  wallHeight: 18, wallThickness: 4, towerHeight: 24,
  arrival: point(-987, 1864), plaza: point(-880, 1918), harbor: point(-906, 1864),
  drillCourt: freeze({x:-890,z:1908,width:18,depth:15}),
  bounds: freeze({ minX: -970, maxX: -842, minZ: 1830, maxZ: 1950 }),
  referenceSolisArea: 100 * 84,
});

export const AEVIS_OUTLINE = freeze([
  [-970,1830], [-892,1830], [-892,1870], [-842,1910],
  [-842,1950], [-920,1950], [-920,1910], [-970,1870],
].map(([x,z]) => point(x,z)));
/** A narrow strip follows the bend of the actual east coast. The complete
 * landward curtain terminates in saltwater at both ends; only sea is open. */
export const AEVIS_WALL_EDGES = freeze([0,4,5,6,7]);
export const AEVIS_COASTAL_DEFENSE_ENDS = freeze([
  freeze({edge:0,x:-892,z:1830}),freeze({edge:4,x:-842,z:1950}),
]);
export const AEVIS_AREA = Math.abs(AEVIS_OUTLINE.reduce((sum, a, i) => {
  const b = AEVIS_OUTLINE[(i + 1) % AEVIS_OUTLINE.length];
  return sum + a.x * b.z - b.x * a.z;
}, 0)) / 2;

export function aevisSegmentDistance(x, z, a, b) {
  const dx = b.x - a.x, dz = b.z - a.z, length2 = dx * dx + dz * dz;
  const t = length2 ? clamp(((x - a.x) * dx + (z - a.z) * dz) / length2) : 0;
  return Math.hypot(x - a.x - dx * t, z - a.z - dz * t);
}
export function inAevis(x, z) {
  let inside = false;
  for (let i = 0, j = AEVIS_OUTLINE.length - 1; i < AEVIS_OUTLINE.length; j = i++) {
    const a = AEVIS_OUTLINE[i], b = AEVIS_OUTLINE[j];
    if ((a.z > z) !== (b.z > z) && x < (b.x - a.x) * (z - a.z) / (b.z - a.z) + a.x) inside = !inside;
  }
  return inside;
}
const boundaryDistance = (x, z) => Math.min(...AEVIS_OUTLINE.map((a, i) => aevisSegmentDistance(x, z, a, AEVIS_OUTLINE[(i + 1) % AEVIS_OUTLINE.length])));
const nearby = (x,z,margin=0) => x>AEVIS.bounds.minX-50-margin && x<AEVIS.bounds.maxX+55+margin
  && z>AEVIS.bounds.minZ-45-margin && z<AEVIS.bounds.maxZ+45+margin;

export const AEVIS_GATES = freeze([
  freeze({id:'aevis-bronze-gate',name:'The Great Bronze Gate',edge:7,x:-970,z:1864,width:12}),
  freeze({id:'aevis-south-gate',name:'The Peninsula Gate',edge:4,x:-890,z:1950,width:10}),
]);
const path = (id,width,coordinates) => freeze({id,width,points:freeze(coordinates.map(([x,z])=>point(x,z)))});
export const AEVIS_PATHS = freeze([
  path('aevis-bronze-way',7,[[-996,1864],[-970,1864],[-948,1864],[-916,1864],[-904,1864]]),
  path('aevis-peninsula-way',5,[[-890,1974],[-890,1950],[-890,1943.5],[-857,1943.5],[-857,1918],[-879,1908],[-899,1890],[-916,1864]]),
  path('aevis-citadel-approach',5,[[-948,1864],[-948,1861]]),
  path('aevis-veth-approach',5,[[-857,1918],[-880,1918]]),
  path('aevis-drill-court',5,[[-879,1908],[-890,1908]]),
  path('aevis-quay-walk',4,[[-916,1864],[-904,1864],[-904,1845]]),
]);
export const AEVIS_DRILL_RACKS = freeze([
  freeze({id:'aevis-drill-rack-west',x:-897,z:1915}),
  freeze({id:'aevis-drill-rack-east',x:-883,z:1915}),
]);

const building = (id, name, x, z, width, depth, height, kind, palette = 0, facing = 0) => freeze({ id, name, x, z, width, depth, height, kind, palette, facing });
export const AEVIS_BUILDINGS = freeze([
  building('aevis-palace','The Bronze Citadel',-948,1846,32,26,26,'palace'),
  building('aevis-veth-archives','The House of the Veth',-880,1930.5,31,22,13,'archive',1,Math.PI),
  building('aevis-arsenal','The Bronze Arsenal',-908,1905,14,14,15,'arsenal'),
  building('aevis-lineage-house','Warrior Lineage House',-920,1845,10,16,13,'house',1),
  building('aevis-tin-house','The Tin Exchange',-914,1892,15,10,11,'warehouse',2),
  building('aevis-barracks','The Spear Court Barracks',-932,1876,20,20,15,'barracks',1,Math.PI),
  building('aevis-bronze-guild','The Avite Bronze Guild',-908,1925,18,14,12,'forge',0,Math.PI),
  building('aevis-bull-shrine','The Bull-Bronze Shrine',-906,1941,14,12,16,'temple',2),
  building('aevis-south-guardhouse','South Gate Guardhouse',-949,1874,12,8,10,'house',2),
  building('aevis-north-guardhouse','North Gate Guardhouse',-922,1859,12,6,10,'house'),
]);
export const AEVIS_QUAYS = freeze([
  freeze({id:'aevis-open-quay',name:'The Open Bronze Quay',x:-904,z:1850,width:7,depth:34,elevation:3.2}),
  freeze({id:'aevis-trade-pier',name:'The Tin Pier',x:-890,z:1864,width:26,depth:7,elevation:3.2}),
  freeze({id:'aevis-war-pier',name:'The Spear Pier',x:-891,z:1845,width:24,depth:6,elevation:3.2}),
]);
export const AEVIS_BOATS = freeze([
  freeze({id:'aevis-bronze-trader',x:-881,z:1875,yaw:Math.PI/2,length:24,width:7,kind:'trader'}),
  freeze({id:'aevis-war-galley',x:-882,z:1839,yaw:Math.PI/2,length:28,width:6,kind:'galley'}),
]);
export const AEVIS_SOLDIERS = freeze([
  freeze({id:'aevis-west-guard-north',name:'Avite bronze guard',x:-966,z:1861,yaw:-Math.PI/2,variant:0}),
  freeze({id:'aevis-west-guard-south',name:'Avite bronze guard',x:-964,z:1867,yaw:-Math.PI/2,variant:1}),
  freeze({id:'aevis-palace-guard',name:'Avite citadel guard',x:-942,z:1861,yaw:0,variant:2}),
  ...[[-897,1904],[-890,1904],[-883,1904],[-897,1910],[-890,1910],[-883,1910]].map(([x,z],i)=>freeze({id:`aevis-drill-${i+1}`,name:'Avite spearman',x,z,yaw:Math.PI/2,variant:i%3})),
  freeze({id:'aevis-quay-guard',name:'Avite harbor guard',x:-906,z:1858,yaw:Math.PI/2,variant:1}),
  freeze({id:'aevis-south-guard',name:'Avite bronze guard',x:-885,z:1945,yaw:0,variant:0}),
]);
export const AEVIS_LANDMARKS = freeze([
  freeze({id:'aevis',name:'Aevis',region:24,...AEVIS.plaza,radius:80}),
  freeze({id:'aevis-citadel',name:'The Bronze Citadel',region:24,x:-948,z:1861,radius:22}),
  freeze({id:'aevis-veth',name:'The House of the Veth',region:24,x:-880,z:1918,radius:18}),
  freeze({id:'aevis-harbor',name:'The Open Bronze Quay',region:24,...AEVIS.harbor,radius:18}),
]);

/** A continuous, walkable fall from the citadel ridge down to the quays.
 * No artificial shelf extends into saltwater and no neighbouring region changes. */
export function aevisGround(x, z, base) {
  if (!nearby(x, z) || hexOwnerAt(x, z) !== AEVIS.regionName) return base;
  const shore = landDistance(x, z);
  if (shore <= 3) return base;
  const distance = boundaryDistance(x, z);
  const weight = (inAevis(x, z) ? 1 : 1 - smooth(distance / 26)) * smooth((shore - 3) / 10);
  const target = Math.min(14,1.5+shore*.18);
  const town = base + (target - base) * weight;
  // A short continuous paved ramp meets the west edge of the raised quay.
  // Its seaward influence stops on dry land; the deck itself spans the water.
  const quay=AEVIS_QUAYS[0],west=quay.x-quay.width/2;
  const quayRamp=smooth((x-(west-10))/8)*smooth((quay.depth/2+3-Math.abs(z-quay.z))/3)
    *smooth((shore-3)/3);
  return town + (3.2 - town) * quayRamp;
}
/** Timber decks stand above the water rather than changing the shoreline. */
export function aevisDeckHeight(x, z) {
  for (const q of AEVIS_QUAYS) if (Math.abs(x-q.x) <= q.width/2 && Math.abs(z-q.z) <= q.depth/2) return q.elevation;
  return null;
}
export function aevisReserved(x, z, margin = 0) {
  if (!nearby(x, z, margin)) return false;
  if (inAevis(x, z) || boundaryDistance(x, z) < 8 + margin) return true;
  if (AEVIS_QUAYS.some(q => Math.abs(x-q.x) < q.width/2 + 4 + margin && Math.abs(z-q.z) < q.depth/2 + 4 + margin)) return true;
  return AEVIS_PATHS.some(p => p.points.some((a,i) => i > 0 && aevisSegmentDistance(x,z,p.points[i-1],a) < p.width/2 + 3 + margin));
}

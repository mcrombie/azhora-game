import * as THREE from 'three';
import { canStand } from './game-state.js';

/**
 * The animals of the four western regions.
 *
 * Built on the same plan as `road-life.js`: every kind's parts are merged once
 * into vertex-coloured geometry and then instanced, each herd or pair keeps a
 * range it will not leave, and the whole group is hidden past a hundred metres.
 * They are ambient: they cannot be attacked, collected, or asked anything.
 *
 * Every animal here is one the lore names, and the notes on each range say
 * which lore names it and where. Two are extensions from a neighbouring region
 * rather than a placement the lore makes, and they say so.
 */

const TAU = Math.PI * 2;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const angleDelta = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const sphere = new THREE.IcosahedronGeometry(1, 1);
const rough = new THREE.IcosahedronGeometry(1, 0);
const box = new THREE.BoxGeometry(1, 1, 1);
const cone = new THREE.ConeGeometry(1, 1, 5);
const cylinder = new THREE.CylinderGeometry(1, 1, 1, 6);
const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .94, flatShading: true });

/** Merge a kind's fixed pieces once; every animal of that kind shares the result. */
function geometry(pieces) {
  const positions = [], normals = [], colors = [];
  const matrix = new THREE.Matrix4(), normalMatrix = new THREE.Matrix3();
  const p = new THREE.Vector3(), n = new THREE.Vector3(), q = new THREE.Quaternion();
  for (const [source, tone, position, scale, rotation = [0, 0, 0]] of pieces) {
    q.setFromEuler(new THREE.Euler(...rotation));
    matrix.compose(new THREE.Vector3(...position), q, new THREE.Vector3(...scale));
    normalMatrix.getNormalMatrix(matrix);
    const data = source.index ? source.toNonIndexed() : source, tint = new THREE.Color(tone);
    for (let i = 0; i < data.attributes.position.count; i++) {
      p.fromBufferAttribute(data.attributes.position, i).applyMatrix4(matrix); positions.push(p.x, p.y, p.z);
      n.fromBufferAttribute(data.attributes.normal, i).applyMatrix3(normalMatrix).normalize(); normals.push(n.x, n.y, n.z);
      colors.push(tint.r, tint.g, tint.b);
    }
    if (data !== source) data.dispose();
  }
  const result = new THREE.BufferGeometry();
  result.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  result.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  result.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  result.computeBoundingSphere();
  return result;
}

const S = (tone, position, scale, rotation) => [sphere, tone, position, scale, rotation];
const R = (tone, position, scale, rotation) => [rough, tone, position, scale, rotation];
const B = (tone, position, scale, rotation) => [box, tone, position, scale, rotation];
const C = (tone, position, scale, rotation) => [cone, tone, position, scale, rotation];
const Y = (tone, position, scale, rotation) => [cylinder, tone, position, scale, rotation];
const both = build => [build(1), build(-1)];

function models() {
  const dark = 0x241f1a;
  return {
    /**
     * The Vastos longhorn: "a large, cold-tolerant breed with a constitution
     * suited to open upland grazing and severe winters". Deep-bodied, heavy in
     * the shoulder, dark red-brown with a paler winter ridge along the spine,
     * and horns that go out before they go up, because they are what the name
     * is about. Nesdor's cattle are the same animal drawn smaller: the lore
     * introduces them by saying they are not this one.
     */
    longhorn: {
      body: geometry([
        S(0x6d452c, [0, 1.06, -.04], [.42, .46, .84]),
        // The shoulder and the neck: a longhorn is heaviest in front, and its head
        // comes off the top of that mass rather than out of the middle of it.
        S(0x7a4f32, [0, 1.15, .44], [.39, .42, .32]),
        S(0x7a4f32, [0, 1.26, .66], [.24, .25, .22], [.30, 0, 0]),
        // The winter ridge the lore gives the breed: pale hair along the spine, not a plank.
        S(0xbda98d, [0, 1.45, -.14], [.15, .05, .62]),
        S(0x5b3924, [0, .88, .02], [.34, .27, .70]),
        Y(0x53341f, [0, .96, -.84], [.042, .66, .042], [.95, 0, 0]),
        S(0x2e211a, [0, .64, -1.02], [.05, .12, .055]),
      ]),
      head: geometry([
        S(0x6d452c, [0, .02, .06], [.20, .21, .30]),
        S(0x5b3924, [0, -.09, .30], [.15, .14, .17]),
        S(0xd6c5a8, [0, .18, -.01], [.21, .12, .20]),
        ...both(side => S(0x5b3924, [side * .22, .12, -.02], [.14, .07, .09])),
        ...both(side => S(dark, [side * .155, .04, .21], [.026, .03, .028])),
        // The horns: out, then forward and up, in three lengths of taper.
        ...both(side => Y(0xcfc2a2, [side * .26, .23, .01], [.044, .34, .044], [0, 0, side * 1.32])),
        ...both(side => Y(0xcfc2a2, [side * .42, .27, .04], [.036, .22, .036], [0, 0, side * .95])),
        ...both(side => C(0xe3dac0, [side * .52, .41, .06], [.030, .20, .030], [0, 0, side * .38])),
      ]),
      leg: geometry([Y(0x5b3924, [0, -.23, 0], [.09, .46, .092]), B(0x2e211a, [0, -.46, .03], [.15, .10, .20])]),
    },

    /**
     * Hill sheep for Meneth's ridge commons and Nesdor's margins: the lore of
     * both puts sheep on the open grazing and says nothing else about them, so
     * this is an upland sheep and not a breed.
     */
    'hill-sheep': {
      body: geometry([
        S(0xcfc6ab, [0, .60, 0], [.35, .35, .58]), S(0xbdb298, [-.16, .68, -.26], [.22, .23, .27]),
        S(0xbdb298, [.14, .67, .19], [.24, .24, .26]), S(0xd4ccb2, [0, .60, -.55], [.12, .12, .21]),
      ]),
      head: geometry([
        S(0x5a5145, [0, -.01, .05], [.17, .21, .24]), S(0x4c443a, [0, -.11, .22], [.12, .11, .16]),
        S(0xcfc6ab, [0, .14, -.01], [.20, .13, .19]),
        ...both(side => S(0x5a5145, [side * .22, .09, .01], [.16, .065, .085])),
        ...both(side => S(dark, [side * .145, .015, .175], [.02, .023, .023])),
      ]),
      leg: geometry([Y(0x6b6154, [0, -.18, 0], [.066, .36, .068]), B(0x4c443a, [0, -.35, .025], [.12, .11, .16])]),
    },

    /**
     * The *vel-caric*: "a small, semi-aquatic carnivore with a distinctive
     * dark-tipped tail and the narrow, mobile face of a creature that lives in
     * river margins". Long in the body and low to the ground, rust over cream,
     * with a full tail that ends in black.
     */
    'river-fox': {
      body: geometry([
        S(0x9a5c33, [0, .27, -.02], [.115, .125, .30]),
        S(0xc08a52, [0, .26, .21], [.098, .105, .11]),
        S(0xe0d3b6, [0, .195, .04], [.09, .07, .24]),
        S(0x8a5330, [0, .30, -.30], [.075, .075, .12]),
        S(0xa8663a, [0, .34, -.44], [.062, .065, .13], [.22, 0, 0]),
        S(0x1d1a17, [0, .40, -.57], [.05, .052, .075], [.22, 0, 0]),
      ]),
      head: geometry([
        S(0xa8663a, [0, .01, .03], [.082, .078, .10]),
        C(0xc08a52, [0, -.015, .135], [.05, .13, .045], [Math.PI / 2 + .12, 0, 0]),
        S(0x1d1a17, [0, -.03, .195], [.019, .017, .019]),
        ...both(side => C(0x8a5330, [side * .055, .085, -.01], [.042, .085, .028], [-.12, 0, side * .22])),
        ...both(side => S(0x0f0d0c, [side * .045, .022, .075], [.017, .018, .014])),
        ...both(side => S(0xe0d3b6, [side * .035, -.048, .10], [.028, .022, .03])),
      ]),
      leg: geometry([Y(0x8a5330, [0, -.075, 0], [.026, .155, .027]), B(0x1d1a17, [0, -.155, .012], [.05, .035, .07])]),
    },

    /** The Carica's otters, which the lore has sharing the corridor with the fox. */
    otter: {
      body: geometry([
        S(0x6b503a, [0, .21, 0], [.125, .115, .34]),
        S(0x8e7255, [0, .19, .25], [.10, .095, .11]),
        S(0xc4b195, [0, .17, .12], [.085, .065, .20]),
        S(0x5b4534, [0, .22, -.33], [.085, .075, .16], [.14, 0, 0]),
        C(0x4b382a, [0, .25, -.52], [.055, .22, .05], [-Math.PI / 2 + .2, 0, 0]),
      ]),
      head: geometry([S(0x7c5f45, [0, 0, .03], [.085, .075, .09]), S(0xc4b195, [0, -.035, .10], [.055, .045, .05]),
        ...both(side => S(0x0f0d0c, [side * .045, .03, .06], [.015, .016, .014])),
        ...both(side => S(0x5b4534, [side * .06, .06, -.005], [.028, .025, .018]))]),
      leg: geometry([Y(0x5b4534, [0, -.06, 0], [.028, .12, .028]), B(0x3a2d22, [0, -.12, .015], [.06, .03, .075])]),
    },

    /**
     * The upland hare. The fauna overview documents "upland hares" for the
     * Ganoss uplands in the north and nothing for Vastos or Meneth; this is that
     * animal carried south onto the nearest cold grassland, and is an extension
     * rather than a placement the lore makes.
     */
    'upland-hare': {
      body: geometry([
        S(0x9c8763, [0, .23, 0], [.16, .19, .30]), S(0xb6a079, [0, .21, .20], [.135, .155, .165]),
        S(0xe2dac0, [0, .23, -.28], [.072, .068, .082]),
        ...both(side => S(0x7f6c4f, [side * .145, .10, -.13], [.09, .08, .16])),
        ...both(side => S(0xc0ab86, [side * .09, .04, .21], [.05, .036, .11])),
      ]),
      head: geometry([S(0xa8936d, [0, 0, 0], [.13, .13, .155]), S(0xc6b48f, [0, -.038, .125], [.068, .058, .072]),
        ...both(side => S(0x131110, [side * .108, .02, .07], [.019, .026, .021])),
        S(0x6a5947, [0, -.018, .195], [.022, .017, .016])]),
      ear: geometry([S(0x86704f, [0, .12, 0], [.04, .17, .036]), S(0xbda88c, [0, .125, .024], [.019, .128, .012])]),
    },

    /**
     * The dry-plateau hawk, which the fauna overview places in East Pyros where
     * it "hunts the upland grasslands". Vastos's western margin is the Pyros
     * transition zone, so it is carried east onto the plain; an extension, and
     * noted as one. Drawn for the only way it is ever seen here: in the air.
     */
    'plateau-hawk': {
      body: geometry([
        S(0x7d6347, [0, 0, -.02], [.075, .075, .20]),
        S(0xd9cbab, [0, -.025, .05], [.062, .05, .13]),
        S(0x6a5340, [0, .01, -.22], [.06, .022, .13], [.06, 0, 0]),
        S(0x4c3d30, [0, .035, .16], [.055, .052, .06]),
        C(0xd8b464, [0, .015, .225], [.024, .07, .022], [Math.PI / 2 + .35, 0, 0]),
        ...both(side => S(0x141210, [side * .035, .048, .195], [.013, .013, .011])),
      ]),
      wing: geometry([
        S(0x715942, [.30, 0, .01], [.34, .022, .115]),
        S(0x8b7255, [.62, -.004, -.03], [.30, .017, .085]),
        S(0x4c3d30, [.88, -.006, -.07], [.13, .013, .05]),
      ]),
    },

    /**
     * A wading bird for the Lizeem's tributaries. The fauna overview calls the
     * Lizeem distributaries' assemblage "the richest avian assemblage documented
     * on the continent" and names herons and stilt-legged waders in it.
     */
    'wading-bird': {
      body: geometry([
        S(0x8c9aa0, [0, .78, 0], [.15, .17, .34]),
        S(0xb9c2bd, [0, .96, .11], [.075, .26, .085]),
        S(0xc9cfc6, [0, 1.26, .16], [.10, .10, .115]),
        C(0xd8c163, [0, 1.24, .38], [.038, .30, .034], [Math.PI / 2, 0, 0]),
        S(0x3a423f, [0, 1.33, .05], [.055, .05, .10]),
        S(0x5e6b6c, [0, .80, -.30], [.10, .07, .24]),
        ...both(side => S(0x141210, [side * .082, 1.28, .225], [.013, .015, .014])),
      ]),
      wing: geometry([S(0x67757a, [.24, 0, 0], [.32, .04, .24]), S(0x4e5b62, [.46, -.01, -.08], [.24, .03, .17])]),
      leg: geometry([Y(0x7c7448, [0, -.28, 0], [.018, .56, .018]), B(0x8a8154, [0, -.56, .04], [.055, .024, .11])]),
    },
  };
}

/**
 * Every range in the western regions. `species` picks the model, `sites` are the
 * animals' home spots in world metres, and the box is the ground that range's
 * animals will not walk out of. `note` says which lore puts them here.
 */
export const WEST_LIFE_ZONES = Object.freeze([
  Object.freeze({
    id: 'vastos-longhorns-west', species: 'longhorn', region: 'Vastos', radius: .95, scale: 1,
    minX: -1700, maxX: -1500, minZ: -520, maxZ: -380,
    sites: Object.freeze([[-1640, -470], [-1622, -452], [-1596, -474], [-1570, -448], [-1552, -470], [-1600, -430]]),
    note: 'vastos.md: "The Vastos longhorn ... is the foundation of the economy". Grazing loose on the open range; no fold, no fence, nobody with them.',
  }),
  Object.freeze({
    id: 'vastos-longhorns-east', species: 'longhorn', region: 'Vastos', radius: .95, scale: 1,
    minX: -1520, maxX: -1360, minZ: -380, maxZ: -240,
    sites: Object.freeze([[-1470, -320], [-1448, -300], [-1424, -326], [-1496, -298], [-1444, -348]]),
    note: 'vastos.md: the second band, watering at the eastern pans.',
  }),
  Object.freeze({
    id: 'vastos-hares', species: 'upland-hare', region: 'Vastos', radius: .3, scale: 1,
    minX: -1660, maxX: -1500, minZ: -340, maxZ: -200,
    sites: Object.freeze([[-1600, -280], [-1568, -248], [-1624, -238]]),
    note: 'Extension: the fauna overview documents upland hares for the Ganoss uplands, not for Vastos.',
  }),
  Object.freeze({
    id: 'vastos-hawks', species: 'plateau-hawk', region: 'Vastos', radius: .3, scale: 1, air: 34,
    minX: -1740, maxX: -1420, minZ: -520, maxZ: -160,
    sites: Object.freeze([[-1660, -400], [-1520, -280]]),
    note: 'Extension: the fauna overview puts the dry-plateau hawk in East Pyros, hunting the upland grasslands.',
  }),
  Object.freeze({
    id: 'meneth-ridge-sheep', species: 'hill-sheep', region: 'Meneth', radius: .55, scale: 1,
    minX: -1960, maxX: -1800, minZ: -300, maxZ: -170,
    sites: Object.freeze([[-1900, -240], [-1884, -226], [-1866, -248], [-1846, -230], [-1908, -212], [-1870, -206]]),
    note: 'meneth.md: "sheep and cattle on the ridgeline grazing". The ridge commons, with nobody on them.',
  }),
  Object.freeze({
    id: 'meneth-valley-sheep', species: 'hill-sheep', region: 'Meneth', radius: .55, scale: 1,
    minX: -1860, maxX: -1700, minZ: -130, maxZ: -20,
    sites: Object.freeze([[-1800, -80], [-1782, -62], [-1760, -88], [-1816, -56], [-1744, -66]]),
    note: 'meneth.md: the second valley’s grazing, above its beck.',
  }),
  Object.freeze({
    id: 'meneth-hares', species: 'upland-hare', region: 'Meneth', radius: .3, scale: 1,
    minX: -1900, maxX: -1760, minZ: -190, maxZ: -80,
    sites: Object.freeze([[-1850, -140], [-1812, -118]]),
    note: 'Extension: the same Ganoss upland hare as on the Vastos plain, on the same kind of ground.',
  }),
  // The Carica corridor. These are the animals the lore of Caricas is about, and
  // their spots are on the fox ground itself: the immediate bank of the middle reach.
  Object.freeze({
    id: 'carica-foxes-upper', species: 'river-fox', region: 'Caricas', radius: .32, scale: 1,
    minX: -1740, maxX: -1650, minZ: 390, maxZ: 500,
    sites: Object.freeze([[-1670, 400], [-1684, 409], [-1708, 436], [-1713, 469]]),
    note: 'caricas.md: the vel-caric, "found reliably only in the Carica corridor". It hunts the water’s edge and it does not run from you.',
  }),
  Object.freeze({
    id: 'carica-foxes-lower', species: 'river-fox', region: 'Caricas', radius: .32, scale: 1,
    minX: -1800, maxX: -1700, minZ: 475, maxZ: 600,
    sites: Object.freeze([[-1721, 486], [-1744, 502], [-1764, 538], [-1780, 578]]),
    note: 'caricas.md: the lower half of the six protected miles. Both ranges are on the western bank, because that is the bank that is in Caricas: the river runs the border.',
  }),
  Object.freeze({
    id: 'carica-otters', species: 'otter', region: 'Caricas', radius: .35, scale: 1,
    minX: -1800, maxX: -1690, minZ: 420, maxZ: 600,
    sites: Object.freeze([[-1708, 452], [-1756, 526]]),
    note: 'caricas.md: the fox "uses the same territory as the Carica’s otter population without competing with it".',
  }),
  Object.freeze({
    id: 'lizeem-waders', species: 'wading-bird', region: 'Caricas', radius: .4, scale: 1,
    minX: -2260, maxX: -2120, minZ: 120, maxZ: 300,
    sites: Object.freeze([[-2190, 190], [-2166, 236], [-2214, 252]]),
    note: 'The fauna overview calls the Lizeem’s assemblage "the richest avian assemblage documented on the continent" and names herons and stilt-legged waders in it.',
  }),
  // The Flats. The lore introduces Nesdor's cattle by saying what they are not:
  // "a hardy grassland breed, not the cultural center that the Vastos longhorn is
  // in Vastos, but a practical animal suited to the semi-open terrain". So: the
  // same animal at three quarters the size, which is what that sentence describes.
  Object.freeze({
    id: 'nesdor-cattle-west', species: 'longhorn', region: 'Nesdor', radius: .8, scale: .76,
    minX: -1560, maxX: -1400, minZ: 560, maxZ: 700,
    sites: Object.freeze([[-1500, 620], [-1478, 642], [-1522, 648], [-1456, 604], [-1492, 672]]),
    note: 'nesdor.md: the Nesdor cattle on the open grassland of the flats.',
  }),
  Object.freeze({
    id: 'nesdor-cattle-east', species: 'longhorn', region: 'Nesdor', radius: .8, scale: .76,
    minX: -1420, maxX: -1250, minZ: 720, maxZ: 860,
    sites: Object.freeze([[-1350, 790], [-1326, 812], [-1374, 816], [-1304, 772]]),
    note: 'nesdor.md: the second band, out where the Flats become the Moros approach.',
  }),
  Object.freeze({
    id: 'nesdor-sheep', species: 'hill-sheep', region: 'Nesdor', radius: .55, scale: 1,
    minX: -1640, maxX: -1500, minZ: 400, maxZ: 520,
    sites: Object.freeze([[-1580, 460], [-1558, 482], [-1602, 486], [-1546, 440]]),
    note: 'nesdor.md: "Sheep on the margins between the valley agriculture and the open grassland."',
  }),
  Object.freeze({
    id: 'nesdor-waders', species: 'wading-bird', region: 'Nesdor', radius: .4, scale: 1,
    minX: -1730, maxX: -1600, minZ: 600, maxZ: 780,
    sites: Object.freeze([[-1662, 664], [-1684, 722], [-1642, 700]]),
    note: 'The braided water: shallow, slow and exactly what a stilt-legged wader wants.',
  }),
]);

/**
 * A hawk does not stand about. It holds a slow circle over the grass at a fixed
 * height, which is the whole of its behaviour and the only way it is ever seen
 * from the ground on a plain with nothing to perch on.
 */
const CIRCLE_RADIUS = 46, CIRCLE_PERIOD = 27;

/** Ambient creatures only: they cannot be attacked, collected or block a quest. */
export function createWestLife(scene, world) {
  const shapes = models(), flocks = [], creatures = [];
  const dummy = new THREE.Object3D(), rootMatrix = new THREE.Matrix4(), resultMatrix = new THREE.Matrix4();
  const rotation = new THREE.Quaternion(), unit = new THREE.Vector3(1, 1, 1);
  let updates = 0, disposed = false;

  const inRange = (x, z, zone) => Number.isFinite(x) && Number.isFinite(z)
    && x >= zone.minX && x <= zone.maxX && z >= zone.minZ && z <= zone.maxZ;
  const valid = (x, z, zone) => inRange(x, z, zone) && canStand(x, z, world, zone.radius);
  function clearPoint(x, z, zone) {
    if (zone.air) return inRange(x, z, zone) ? { x, z } : null;   // nothing in the air needs footing
    if (valid(x, z, zone)) return { x, z };
    for (let radius = 1; radius <= 26; radius += 1) for (let i = 0; i < 16; i++) {
      const p = { x: x + Math.sin(i / 16 * TAU) * radius, z: z + Math.cos(i / 16 * TAU) * radius };
      if (valid(p.x, p.z, zone)) return p;
    }
    return null;
  }
  function instances(group, name, shape, count) {
    const batch = new THREE.InstancedMesh(shape, material, count);
    batch.name = name; batch.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    batch.castShadow = true; batch.receiveShadow = true;
    // The group supplies distance culling; dynamic instances must not keep a
    // stale bounding sphere at the spot they were first placed.
    batch.frustumCulled = false; group.add(batch); return batch;
  }

  for (const zone of WEST_LIFE_ZONES) {
    const group = new THREE.Group(); group.name = zone.id; group.visible = false; scene.add(group);
    const animals = [];
    for (let i = 0; i < zone.sites.length; i++) {
      const home = clearPoint(zone.sites[i][0], zone.sites[i][1], zone);
      if (!home) continue;
      const scale = zone.scale ?? 1;
      animals.push({
        id: `${zone.id}-${i + 1}`, species: zone.species, region: zone.region, zone, index: i, scale,
        ...home, y: world.heightAt(home.x, home.z) + (zone.air ?? 0), home: { ...home },
        yaw: (i * 1.83 + .5) % TAU, action: zone.air ? 'soar' : 'graze', timer: 1.4 + i * .71,
        clock: i * .43, speed: 0, lift: 0, watching: 0, detour: 0, blocked: 0, flight: 0, hidden: false, landing: null, homing: false, cornered: 0, breakYaw: 0, slip: 0, slipFrom: 0, slipTo: null,
      });
    }
    creatures.push(...animals);
    const shape = shapes[zone.species];
    const meshes = { body: instances(group, `${zone.species} bodies`, shape.body, animals.length) };
    if (shape.head) meshes.head = instances(group, `${zone.species} heads`, shape.head, animals.length);
    if (shape.leg) meshes.legs = instances(group, `${zone.species} legs`, shape.leg,
      animals.length * (zone.species === 'wading-bird' ? 2 : 4));
    if (shape.ear) meshes.ears = instances(group, `${zone.species} ears`, shape.ear, animals.length * 2);
    if (shape.wing) meshes.wings = instances(group, `${zone.species} wings`, shape.wing, animals.length * 2);
    flocks.push({ zone, group, animals, meshes, ticks: 0,
      centre: { x: (zone.minX + zone.maxX) / 2, z: (zone.minZ + zone.maxZ) / 2 } });
  }

  /**
   * One step along the animal's heading, or a little to either side of it if that is blocked.
   * `footing` says what it may stand on; a bird in the air needs only to stay over its own range.
   */
  function move(animal, step, { offsets = [0, .55, -.55, 1.1, -1.1], footing = valid } = {}) {
    const fromX = animal.x, fromZ = animal.z;
    for (const offset of offsets) {
      const yaw = animal.yaw + offset, dx = Math.sin(yaw) * step, dz = Math.cos(yaw) * step;
      const slices = Math.max(1, Math.ceil(step / .12));
      let clear = true;
      for (let i = 1; i <= slices; i++) {
        const x = animal.x + dx * i / slices, z = animal.z + dz * i / slices;
        if (!footing(x, z, animal.zone) || (footing === valid && Math.abs(world.heightAt(x, z) - animal.y) > .7)) { clear = false; break; }
      }
      if (clear) { animal.x += dx; animal.z += dz; animal.yaw = yaw; return Math.hypot(animal.x - fromX, animal.z - fromZ); }
    }
    animal.yaw += Math.PI * .71;
    return 0;
  }

  /**
   * Paces, in metres a second, set against the traveler's own: a walk is 4.2 and a run is 7.2
   * (src/main.js). The rule they are tuned to, and tests/west-life.test.js holds them to it:
   * nothing here can be walked down; the quick ones cannot be run down either - the hare on its
   * legs, the wader into the air, the otter into the water; sheep bunch and go, faster than a
   * walk, and somebody running can herd them; cattle are big and unhurried and do not bolt at
   * all. They turn to face you and give ground at about a walk, which is truer than fleeing and
   * keeps them from being chased to the horizon. The fox still never flees.
   */
  const FLEE_AT = { longhorn: 7.5, 'hill-sheep': 6.5, 'upland-hare': 9, otter: 8, 'wading-bird': 11, 'river-fox': 0 };
  const WALK = { longhorn: .42, 'hill-sheep': .48, 'upland-hare': 1.9, otter: 1.1, 'wading-bird': .5, 'river-fox': .9 };
  const RUN = { 'hill-sheep': 5.6, 'upland-hare': 9.6, otter: 8.2, 'wading-bird': 10 };
  /** Cattle giving ground: a shade over the traveler's walk, so a walker never closes and a runner does. */
  const GIVE = 4.5;
  /** The fox drifts back as fast as you come on, up to `cap`: only a flat run gains on it, and slowly. */
  const FOX = Object.freeze({ floor: 1, cap: 6.6, lead: 1.06, arm: 2.8, notice: 10 });
  /** Going home is a purposeful walk, not a graze: a band chased a hundred metres is back in a minute or two. */
  const RETURN = { longhorn: 1.3, 'hill-sheep': 1.5, 'upland-hare': 2.8, otter: 1.8, 'wading-bird': 1.4, 'river-fox': 1.5 };
  const HOME = 16, SETTLED = 6;
  const BACK = [0, .35, -.35, .7, -.7], ALONG = [1.05, -1.05, 1.4, -1.4, 1.75, -1.75, 2.1, -2.1];

  /**
   * Face whoever it is and step straight back from them. If what is behind it will not let it -
   * and the fox lives on a river bank too steep to stand beside - it goes along that instead,
   * and at `quick`, because going sideways opens no distance until it has got round.
   */
  function backOff(animal, player, speed, dt, quick = speed) {
    animal.yaw += angleDelta(Math.atan2(player.x - animal.x, player.z - animal.z), animal.yaw) * Math.min(1, dt * 3.5);
    const facing = animal.yaw, straight = Math.atan2(animal.x - player.x, animal.z - player.z);
    animal.yaw = straight;
    let moved = move(animal, speed * dt, { offsets: BACK });
    if (!moved) { animal.yaw = straight; moved = move(animal, quick * dt, { offsets: ALONG }); }
    animal.speed = moved / dt; animal.yaw = facing;
  }

  /** The water an otter can reach: the deep-water colliders in and about its range, found once. */
  const waterByZone = new Map();
  function waterOf(zone) {
    if (!waterByZone.has(zone.id)) waterByZone.set(zone.id, (world.colliders ?? []).filter(c => /water/.test(c.kind ?? '')
      && c.x > zone.minX - 30 && c.x < zone.maxX + 30 && c.z > zone.minZ - 30 && c.z < zone.maxZ + 30));
    return waterByZone.get(zone.id);
  }
  function nearestWater(animal) {
    let best = null;
    for (const c of waterOf(animal.zone)) {
      const edge = Math.hypot(c.x - animal.x, c.z - animal.z) - (c.r ?? Math.max(c.hx ?? 0, c.hz ?? 0));
      if (!best || edge < best.edge) best = { x: c.x, z: c.z, edge };
    }
    return best;
  }

  /** A wader put up off the water: up and away at a pace nobody on foot can match, and down again only when it is left alone. */
  function fly(animal, dt, player, near) {
    animal.flight += dt;
    const settle = animal.flight > 2.2 && near > 26;
    if (!settle) animal.landing = null;
    else if (!animal.landing) animal.landing = (animal.homing && Math.hypot(player.x - animal.home.x, player.z - animal.home.z) > 30)
      ? { ...animal.home } : clearPoint(animal.x, animal.z, animal.zone) ?? { ...animal.home };
    let heading = Math.atan2(animal.x - player.x, animal.z - player.z);
    if (animal.landing) heading = Math.atan2(animal.landing.x - animal.x, animal.landing.z - animal.z);
    else if (!inRange(animal.x + Math.sin(heading) * 14, animal.z + Math.cos(heading) * 14, animal.zone))
      heading = Math.atan2(animal.home.x - animal.x, animal.home.z - animal.z);   // round again over its own water
    animal.yaw += angleDelta(heading, animal.yaw) * Math.min(1, dt * 4);
    const left = animal.landing ? Math.hypot(animal.landing.x - animal.x, animal.landing.z - animal.z) : Infinity;
    if (left < .8) {
      animal.x = animal.landing.x; animal.z = animal.landing.z; animal.lift = 0; animal.flight = 0; animal.landing = null; animal.homing = false;
      animal.action = 'graze'; animal.timer = 3; animal.speed = 0;
    } else {
      animal.speed = move(animal, Math.min(RUN['wading-bird'] * dt, left), { footing: inRange }) / dt;
      const height = animal.landing ? Math.min(5.5, left * .8) : 5.5;
      animal.lift += Math.max(-dt * 6, Math.min(dt * 5, height - animal.lift));
    }
    animal.y = world.heightAt(animal.x, animal.z);
  }

  /** An otter gone into the water: under for a few seconds, and up again at whichever of its bank spots is furthest from the traveler. */
  const SLIP = Object.freeze({ seconds: .5, pace: 2.2, sink: .42 });
  function dive(animal, dt, player, flock) {
    if (animal.slip > 0) {
      // Going in: it turns to the water, slides the last of the bank and sinks, where you can see it do it.
      // Seen in the renderer before this, it simply was not there any more between one frame and the next.
      animal.slip = Math.max(0, animal.slip - dt);
      const to = animal.slipTo;
      if (to) {
        const yaw = Math.atan2(to.x - animal.x, to.z - animal.z);
        animal.yaw += angleDelta(yaw, animal.yaw) * Math.min(1, dt * 10);
        animal.speed = move(animal, SLIP.pace * dt, { offsets: [0], footing: inRange }) / dt;
      }
      // Its ground is whatever is under it, as for everything else here; what is seen goes down smoothly
      // from the bank it left, however far the bed falls away beneath it.
      animal.y = world.heightAt(animal.x, animal.z);
      animal.lift = animal.slipFrom - animal.y - SLIP.sink * (1 - animal.slip / SLIP.seconds);
      if (animal.slip > 0) return;
      animal.hidden = true;
    }
    animal.hidden = true; animal.lift = 0; animal.speed = 0;
    if (animal.timer > 0) return;
    let best = null;
    for (const mate of flock.animals) {
      const d = Math.hypot(mate.home.x - player.x, mate.home.z - player.z);
      if (!best || d > best.d) best = { ...mate.home, d };
    }
    if (!best || best.d < 14) { animal.timer = 2; return; }   // nowhere safe to come up yet
    animal.x = best.x; animal.z = best.z; animal.y = world.heightAt(best.x, best.z);
    animal.hidden = false; animal.lift = 0; animal.slip = 0; animal.action = 'graze'; animal.timer = 3;
  }

  /** Every way on is shut: of the ways that are open, the one that points least at whoever is coming. */
  function widestWayOut(animal, player) {
    const at = Math.atan2(player.x - animal.x, player.z - animal.z);
    let best = null;
    for (let k = 0; k < 24; k++) {
      const yaw = k / 24 * TAU; let open = true;
      for (let s = .25; s <= 2 && open; s += .25) open = valid(animal.x + Math.sin(yaw) * s, animal.z + Math.cos(yaw) * s, animal.zone);
      const wide = Math.abs(angleDelta(yaw, at));
      if (open && (!best || wide > best.wide)) best = { yaw, wide };
    }
    return best ? best.yaw : animal.yaw;
  }

  function tickGround(animal, dt, player, flock, motion) {
    animal.clock += dt; animal.timer -= dt; animal.speed = 0;
    const species = animal.species, near = Math.hypot(animal.x - player.x, animal.z - player.z);
    let wheeling = false;
    animal.cornered = Math.max(0, animal.cornered - dt);
    // In the air or under the water there is nowhere the traveler can follow.
    if (animal.action === 'fly') { fly(animal, dt, player, near); return; }
    if (animal.action === 'dive') { dive(animal, dt, player, flock); return; }
    animal.lift = 0;
    const away = Math.atan2(animal.x - player.x, animal.z - player.z);
    /**
     * The river fox is the one animal in Azhora that does not run from you.
     * "When approached, it does not flee unless directly threatened. It watches."
     * So: inside ten metres it stops whatever it was doing and turns to face the
     * traveler, and it keeps facing them. Just outside arm's length it gives way without ever
     * turning its back: it drifts off exactly as fast as you come on, so a walker
     * never gets nearer than that, and only somebody at a flat run gains on it.
     */
    if (species === 'river-fox') {
      if (near < FOX.notice) {
        animal.watching = Math.min(1, animal.watching + dt * 2);
        animal.action = near < FOX.arm ? 'withdraw' : 'watch';
        if (animal.action === 'withdraw') {
          const closing = Math.max(0, motion.vx * Math.sin(away) + motion.vz * Math.cos(away));
          backOff(animal, player, Math.min(FOX.cap, Math.max(FOX.floor, closing * FOX.lead)), dt, FOX.cap);
        } else animal.yaw += angleDelta(Math.atan2(player.x - animal.x, player.z - animal.z), animal.yaw) * Math.min(1, dt * 3.5);
        animal.y = world.heightAt(animal.x, animal.z);
        return;
      }
      animal.watching = Math.max(0, animal.watching - dt);
    } else if (species === 'longhorn' && near < FLEE_AT.longhorn) {
      // Cattle do not bolt. They put their heads up, turn to face you, and give ground.
      animal.action = 'yield'; animal.timer = 1.2;
      backOff(animal, player, GIVE, dt, GIVE * 1.3);
      animal.y = world.heightAt(animal.x, animal.z);
      return;
    } else if (near < FLEE_AT[species]) {
      if (species === 'wading-bird') { animal.action = 'fly'; animal.flight = 0; animal.landing = null; fly(animal, dt, player, near); return; }
      animal.action = 'flee'; animal.timer = 1.9;
      let heading = away;
      if (species === 'hill-sheep') {
        // Sheep bunch: away from you, and toward the rest of the band.
        const bx = flock.cx - animal.x, bz = flock.cz - animal.z, b = Math.hypot(bx, bz);
        if (b > 2.5 && bx / b * Math.sin(away) + bz / b * Math.cos(away) > -.3)
          heading = Math.atan2(Math.sin(away) + bx / b * .55, Math.cos(away) + bz / b * .55);
      } else if (species === 'otter') {
        const water = nearestWater(animal);
        if (water && water.edge < 1.6) {
          animal.action = 'dive'; animal.timer = 5 + SLIP.seconds; animal.slip = SLIP.seconds;
          animal.slipFrom = animal.y; animal.slipTo = { x: water.x, z: water.z };
          return;
        }
        if (water && water.edge < 40) {
          const to = Math.atan2(water.x - animal.x, water.z - animal.z);
          if (Math.abs(angleDelta(to, away)) < 1.75) heading = to;   // the water, unless you are standing in the way of it
        }
      }
      // Something standing that takes fright wheels first and then goes: it does not run at you while it turns.
      if (animal.cornered > 0) heading = animal.breakYaw;   // it has chosen its way out and is taking it
      const off = angleDelta(heading, animal.yaw);
      animal.yaw += off * Math.min(1, dt * (Math.abs(off) > 1.2 ? 18 : 6));
      wheeling = Math.abs(off) > 1.57;
    }
    const fromHome = Math.hypot(animal.x - animal.home.x, animal.z - animal.home.z);
    // Nothing sets off for home with the traveler still close, and nothing walks home at them:
    // it stands where it got to and waits for them to go.
    const wary = (FLEE_AT[species] || FOX.notice) + 12;
    if (animal.action !== 'flee' && animal.action !== 'return' && fromHome > HOME && near > wary) {
      // A wader does not walk home round a river. It gets up and flies there.
      if (species === 'wading-bird') { animal.action = 'fly'; animal.flight = 2.3; animal.landing = null; animal.homing = true; fly(animal, dt, player, near); return; }
      animal.action = 'return'; animal.detour = 0; animal.blocked = 0;
    }
    if (animal.action === 'return') {
      if (fromHome < SETTLED || near < wary - 8) { animal.action = 'graze'; animal.timer = 2 + (animal.index % 3) * .8; }
      else {
        // Straight for home; and when something is in the way, along it for a moment before trying again.
        animal.detour = Math.max(0, animal.detour - dt);
        if (!animal.detour) animal.yaw += angleDelta(Math.atan2(animal.home.x - animal.x, animal.home.z - animal.z), animal.yaw) * Math.min(1, dt * 4);
        animal.speed = move(animal, RETURN[species] * dt) / dt;
        if (!animal.speed) {
          animal.blocked++; animal.detour = Math.min(6, 1.4 * animal.blocked);
          animal.yaw = Math.atan2(animal.home.x - animal.x, animal.home.z - animal.z) + (animal.blocked % 2 ? 1.7 : -1.7);
        }
      }
    } else if (animal.timer <= 0) {
      if (['walk', 'flee', 'withdraw', 'yield'].includes(animal.action)) {
        animal.action = 'graze'; animal.timer = 2.4 + (animal.index % 3) * .8;
      } else {
        animal.action = 'walk'; animal.timer = 1.3 + (animal.index % 2) * .8;
        animal.yaw += Math.sin(animal.clock + animal.index) * 1.7;
      }
    }
    // Something running for its life tries every way round what is in front of it - the ridge faces
    // of Meneth are close-grown hardwood - before it gives up and turns, which is toward you.
    if (animal.action === 'flee' && !wheeling) {
      const kept = animal.yaw;
      animal.speed = move(animal, RUN[species] * dt, { offsets: [...BACK, ...ALONG] }) / dt;
      if (!animal.speed) {
        // Cornered against the edge of its range or the water. It does not stand and turn on the spot
        // while you walk up to it: it breaks back past you by the widest way open, and means it.
        animal.breakYaw = widestWayOut(animal, player); animal.cornered = 1.2; animal.yaw = animal.breakYaw;
        animal.speed = move(animal, RUN[species] * dt, { offsets: [0, .3, -.3] }) / dt;
        if (!animal.speed) animal.yaw = kept;
      }
    }
    else if (animal.action === 'walk') animal.speed = move(animal, WALK[species] * dt) / dt;
    if (species === 'upland-hare' && animal.speed > .1) {
      const quick = animal.action !== 'walk';
      animal.lift = Math.max(0, Math.sin(animal.clock * (quick ? 16 : 10))) * (quick ? .3 : .13);
    }
    animal.y = world.heightAt(animal.x, animal.z);
  }

  /**
   * A band nobody has been near is not frozen where it was left: when it is next looked at, each
   * of its animals has had that long to make its own way home, at the pace it goes home at.
   */
  function settle(flock, elapsed) {
    for (const animal of flock.animals) {
      if (flock.zone.air) continue;
      const dx = animal.home.x - animal.x, dz = animal.home.z - animal.z, d = Math.hypot(dx, dz);
      const aloft = animal.action === 'fly' || animal.action === 'dive';
      if (!aloft && d <= HOME / 2) continue;
      const reach = RETURN[animal.species] * elapsed;
      if (aloft || reach >= d) { animal.x = animal.home.x; animal.z = animal.home.z; }
      else for (let s = 1; s <= reach; s += 1) {
        const x = animal.x + dx / d * s, z = animal.z + dz / d * s;
        if (!valid(x, z, flock.zone)) break;
        if (s + 1 > reach) { animal.x = x; animal.z = z; }
      }
      animal.y = world.heightAt(animal.x, animal.z); animal.lift = 0; animal.flight = 0; animal.landing = null; animal.hidden = false;
      animal.speed = 0; animal.detour = 0; animal.blocked = 0; animal.cornered = 0; animal.homing = false; animal.slip = 0;
      animal.action = 'graze'; animal.timer = 1 + animal.index * .3;
    }
  }

  /** A hawk holds its circle whatever the traveler does; it is far too high to care. */
  function tickAir(animal, dt) {
    animal.clock += dt;
    const angle = animal.clock / CIRCLE_PERIOD * TAU + animal.index * 2.1;
    animal.x = animal.home.x + Math.sin(angle) * CIRCLE_RADIUS;
    animal.z = animal.home.z + Math.cos(angle) * CIRCLE_RADIUS;
    animal.y = world.heightAt(animal.home.x, animal.home.z) + animal.zone.air + Math.sin(animal.clock * .21) * 3;
    animal.yaw = angle + Math.PI / 2;
    animal.speed = CIRCLE_RADIUS * TAU / CIRCLE_PERIOD;
    animal.action = 'soar';
  }

  function place(mesh, index, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    dummy.position.set(x, y, z); dummy.rotation.set(rx, ry, rz); dummy.scale.set(sx, sy, sz); dummy.updateMatrix();
    resultMatrix.multiplyMatrices(rootMatrix, dummy.matrix); mesh.setMatrixAt(index, resultMatrix);
  }

  function render(flock) {
    const species = flock.zone.species;
    flock.animals.forEach((animal, i) => {
      rotation.setFromEuler(new THREE.Euler(0, animal.yaw, 0));
      unit.setScalar(animal.hidden ? 1e-4 : animal.scale);   // an otter under the water is not drawn
      rootMatrix.compose(new THREE.Vector3(animal.x, animal.y + animal.lift, animal.z), rotation, unit);
      const walking = animal.speed > .05, phase = animal.clock * (animal.action === 'flee' ? 13 : 7);
      const breath = Math.sin(animal.clock * 2.1) * .012;
      place(flock.meshes.body, i, 0, 0, 0, 0, 0, 0, 1, 1 + breath, 1);
      if (species === 'plateau-hawk') {
        // Wings held out and barely moving: a bird that is circling is not flapping.
        const tilt = Math.sin(animal.clock * .4) * .12;
        for (let side = 0; side < 2; side++) place(flock.meshes.wings, i * 2 + side,
          side ? -.06 : .06, .01, -.01, 0, side ? Math.PI : 0, (side ? -1 : 1) * (.16 + tilt));
        return;
      }
      if (species === 'longhorn' || species === 'hill-sheep') {
        // The head hangs off the end of the neck, so grazing swings it down and
        // forward together rather than sinking it back into the shoulder.
        const ox = species === 'longhorn' ? .86 : .43;
        const grazing = animal.action === 'graze';
        const high = species === 'longhorn' ? 1.38 : .84, low = species === 'longhorn' ? .62 : .48;
        place(flock.meshes.head, i, 0, grazing ? low : high, grazing ? ox + .22 : ox,
          grazing ? 1.15 + Math.sin(animal.clock * .8) * .06 : .10 + Math.sin(animal.clock * .8) * .07,
          Math.sin(animal.clock * .63) * .10);
        const hip = species === 'longhorn' ? .24 : .22, fore = species === 'longhorn' ? .50 : .34;
        for (let leg = 0; leg < 4; leg++) place(flock.meshes.legs, i * 4 + leg, leg % 2 ? hip : -hip,
          species === 'longhorn' ? .76 : .44, leg < 2 ? fore : -fore,
          walking ? Math.sin(phase + (leg === 0 || leg === 3 ? 0 : Math.PI)) * .42 : 0);
        return;
      }
      if (species === 'upland-hare') {
        place(flock.meshes.head, i, 0, .38, .25, walking ? -.14 : Math.sin(animal.clock * .95) * .07, Math.sin(animal.clock * .73) * .12);
        for (let side = 0; side < 2; side++) place(flock.meshes.ears, i * 2 + side, side ? .07 : -.07, .47, .20,
          walking ? -.4 : Math.sin(animal.clock * 1.5 + side) * .14, 0, (side ? 1 : -1) * .12);
        return;
      }
      if (species === 'wading-bird') {
        // Head, neck and bill are part of the body: a heron's neck is its posture,
        // not a joint, and the two instanced batches it needs are wings and legs.
        for (let side = 0; side < 2; side++) {
          // In the air the wings are out and beating and the legs trail; on the water's edge they are folded.
          const flying = animal.action === 'fly';
          place(flock.meshes.wings, i * 2 + side, side ? -.11 : .11, .84, -.02, 0, side ? Math.PI : 0,
            (side ? -1 : 1) * (flying ? 1.1 + Math.sin(animal.clock * 9) * .42 : .12));
          place(flock.meshes.legs, i * 2 + side, side ? .05 : -.05, .58, .02,
            flying ? 1.15 : walking ? Math.sin(phase + side * Math.PI) * .22 : 0);
        }
        return;
      }
      // The fox and the otter: a low head that lifts and holds when the fox watches.
      const watch = animal.watching ?? 0;
      place(flock.meshes.head, i, 0, .27 + watch * .06, species === 'river-fox' ? .29 : .32,
        walking ? -.1 : -.04 - watch * .12, Math.sin(animal.clock * (watch > .5 ? .35 : .8)) * (watch > .5 ? .05 : .14));
      for (let leg = 0; leg < 4; leg++) place(flock.meshes.legs, i * 4 + leg, leg % 2 ? .075 : -.075, .18,
        leg < 2 ? .17 : -.17, walking ? Math.sin(phase + (leg === 0 || leg === 3 ? 0 : Math.PI)) * .38 : 0);
    });
    for (const mesh of Object.values(flock.meshes)) mesh.instanceMatrix.needsUpdate = true;
  }

  for (const flock of flocks) render(flock);

  const REACH = 130;
  let clock = 0, lastPlayer = null;
  function update(dt, player, active = true) {
    if (disposed || !active || !Number.isFinite(dt) || dt <= 0 || !Number.isFinite(player?.x) || !Number.isFinite(player?.z)) return;
    const step = Math.min(dt, .25); updates++; clock += step;
    // How fast the traveler is coming on, which is what the fox paces itself against. A jump is not a stride.
    const strode = lastPlayer ? Math.hypot(player.x - lastPlayer.x, player.z - lastPlayer.z) : Infinity;
    const motion = strode < 6 ? { vx: (player.x - lastPlayer.x) / step, vz: (player.z - lastPlayer.z) / step } : { vx: 0, vz: 0 };
    lastPlayer = { x: player.x, z: player.z };
    for (const flock of flocks) {
      const near = Math.hypot(player.x - flock.centre.x, player.z - flock.centre.z) <= REACH + (flock.zone.air ? CIRCLE_RADIUS : 0);
      flock.group.visible = near;
      if (!near) continue;
      if (flock.seen !== undefined && clock - flock.seen > 1) settle(flock, clock - flock.seen);
      flock.seen = clock; flock.ticks++;
      flock.cx = flock.animals.reduce((sum, animal) => sum + animal.x, 0) / Math.max(1, flock.animals.length);
      flock.cz = flock.animals.reduce((sum, animal) => sum + animal.z, 0) / Math.max(1, flock.animals.length);
      for (const animal of flock.animals) flock.zone.air ? tickAir(animal, step) : tickGround(animal, step, player, flock, motion);
      render(flock);
    }
  }

  /** Developer flight looks at the same paused world from somewhere else. */
  function setObserver(position) {
    if (disposed || !Number.isFinite(position?.x) || !Number.isFinite(position?.z)) return false;
    for (const flock of flocks)
      flock.group.visible = Math.hypot(position.x - flock.centre.x, position.z - flock.centre.z) <= REACH;
    return true;
  }

  function snapshot() {
    return {
      updates,
      creatures: creatures.map(animal => ({ id: animal.id, species: animal.species, region: animal.region,
        x: animal.x, y: animal.y + animal.lift, groundY: animal.y, z: animal.z, yaw: animal.yaw,
        action: animal.action, speed: animal.speed, clock: animal.clock, watching: animal.watching,
        lift: animal.lift, hidden: !!animal.hidden })),
      groups: flocks.map(flock => ({ id: flock.zone.id, visible: flock.group.visible, ticks: flock.ticks, count: flock.animals.length })),
    };
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    for (const flock of flocks) {
      flock.group.removeFromParent();
      for (const mesh of Object.values(flock.meshes)) mesh.dispose();
    }
  }

  return { update, setObserver, snapshot, state: snapshot, dispose };
}

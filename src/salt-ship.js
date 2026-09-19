import * as THREE from 'three';
import { createCharacter } from './characters.js';
import { JOHN, HULL } from './salt-sultan.js';

/**
 * John, the Sultan of the Salt Trade (src/salt-sultan.js), and his ship the
 * Sultana. John is the game's own figure, big and bearded, with a turban as
 * white as a salt pan and a salt crystal set in gold at its front, an indigo
 * kaftan open over his tunic, a saffron sash with a pouch of the good salt at
 * it, gold rings, and slippers that curl up at the toe. The Sultana is a
 * deep-bellied coaster painted blue, crusted white at the waterline with the
 * salt she carries, gold along her rail, a gilt dome on her stern cabin, a
 * painted square sail, and a deck stacked with sacks.
 */
const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: .85, ...extra });
const ball = new THREE.IcosahedronGeometry(1, 1), tube = new THREE.CylinderGeometry(1, 1, 1, 12), cube = new THREE.BoxGeometry(1, 1, 1);
function add(parent, geometry, material, [x, y, z], [sx, sy, sz] = [1, 1, 1], [rx, ry, rz] = [0, 0, 0]) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.set(rx, ry, rz);
  m.castShadow = true; parent.add(m); return m;
}
const GOLD = mat(0xd2a843, { metalness: .6, roughness: .35 }), SALT = mat(0xf4f1ea, { roughness: .95 });
/** Hang a piece made in the figure's body frame onto one of its joints, keeping where it is. */
function hang(actor, jointName, build) {
  const body = actor.group.children[0], joint = jointName ? actor.group.getObjectByName(jointName) : body;
  actor.group.updateMatrixWorld(true);
  const at = name => body.worldToLocal(actor.group.getObjectByName(name).getWorldPosition(new THREE.Vector3()));
  const holder = new THREE.Group(); body.add(holder); build(holder, at);
  actor.group.updateMatrixWorld(true);
  for (const child of [...holder.children]) joint.attach(child);
  body.remove(holder);
}
/** A salt crystal: salt grows in cubes. */
function crystal(parent, [x, y, z], size) {
  const m = add(parent, cube, mat(0xf6eef2, { roughness: .2, metalness: .1, emissive: 0x3a3440, emissiveIntensity: .35 }), [x, y, z], [size, size, size], [.62, .78, .2]);
  return m;
}

export function createJohn() {
  const actor = createCharacter({ role: 'mercenary', tunic: 0xe6dcc4, skin: JOHN.skin,
    look: { build: 'heavy', hairStyle: 'cropped', facialHair: 'full', hair: 0x1f1813, headgear: 'bare', garment: 'plain' } });
  actor.group.name = 'John, Sultan of the Salt Trade';
  const indigo = mat(JOHN.color, { side: THREE.DoubleSide }), saffron = mat(0xe0a526), trim = GOLD;
  hang(actor, 'Chest', h => {
    // The kaftan: open down the front, to the ankles, with a gold hem and gold edges.
    const open = .5, top = .27, hem = .37, edge = .07;
    add(h, new THREE.CylinderGeometry(top, hem, 1.2, 18, 1, true, open / 2, Math.PI * 2 - open), indigo, [0, .74, -.01]);
    add(h, new THREE.TorusGeometry(hem, .018, 4, 28, Math.PI * 2 - open), trim, [0, .15, -.01], [1, 1, 1], [Math.PI / 2, 0, Math.PI / 2 + open / 2]);
    // Its gold edges, cut from the same cone so they lie on the cloth.
    for (const start of [open / 2, Math.PI * 2 - open / 2 - edge]) add(h, new THREE.CylinderGeometry(top + .004, hem + .004, 1.2, 2, 1, true, start, edge), trim, [0, .74, -.01]);
    // A standing gold collar.
    add(h, new THREE.CylinderGeometry(.15, .17, .07, 16, 1, true, open / 2, Math.PI * 2 - open), trim, [0, 1.35, 0]);
    // The saffron sash, knotted at the front, and a pouch of the good salt hanging from it.
    add(h, new THREE.TorusGeometry(.245, .05, 6, 22), saffron, [0, .96, .005], [1, 1, .78], [Math.PI / 2, 0, 0]);
    add(h, ball, saffron, [.07, .95, .2], [.07, .06, .05]);
    for (const s of [-1, 1]) add(h, cube, saffron, [.07 + s * .035, .84, .205], [.05, .2, .015], [0, 0, s * .12]);
    add(h, ball, mat(0xece6d8), [-.16, .86, .15], [.075, .09, .06]);
    add(h, tube, trim, [-.16, .945, .15], [.035, .02, .035]);
  });
  // Gold rings, and a heavy gold bracelet on the right.
  for (const side of ['Left', 'Right']) hang(actor, `${side} Wrist`, (h, at) => { const w = at(`${side} Wrist`);
    add(h, new THREE.TorusGeometry(.05, .014, 4, 12), GOLD, [w.x, w.y + .02, w.z], [1, 1, 1], [Math.PI / 2, 0, 0]);
    add(h, ball, GOLD, [w.x + (side === 'Left' ? .02 : -.02), w.y - .1, w.z + .05], [.018, .018, .018]); });
  // Slippers with toes that curl up.
  for (const side of ['Left', 'Right']) hang(actor, `${side} Ankle`, (h, at) => { const a = at(`${side} Ankle`);
    add(h, new THREE.ConeGeometry(.045, .2, 8), saffron, [a.x, a.y - .03, a.z + .19], [1, 1, .8], [Math.PI / 2 - .5, 0, 0]);
    add(h, ball, GOLD, [a.x, a.y + .03, a.z + .27], [.02, .02, .02]); });
  // The turban: as white as a salt pan, wound in five turns, with the crystal and a white aigrette.
  const head = actor.group.getObjectByName('Head'), cloth = mat(0xf7f5ef, { roughness: .95 }), fold = mat(0xe5e1d6, { roughness: .95 });
  add(head, ball, cloth, [0, .375, -.02], [.25, .17, .245]);
  for (let k = 0; k < 5; k++) add(head, new THREE.TorusGeometry(.2 - k * .012, .045, 6, 18), k % 2 ? fold : cloth, [0, .3 + k * .045, -.02], [1, 1, 1], [Math.PI / 2 + (k % 2 ? .18 : -.18), 0, k * .3]);
  add(head, ball, cloth, [0, .5, -.03], [.12, .07, .12]);
  add(head, tube, GOLD, [0, .38, .205], [.052, .02, .052], [Math.PI / 2, 0, 0]);
  crystal(head, [0, .38, .22], .06);
  for (let k = 0; k < 3; k++) add(head, ball, mat(0xffffff), [(k - 1) * .018, .47 + k * .01, .2 - k * .02], [.02, .1, .015], [-.35, 0, (k - 1) * .3]);
  return actor;
}

// ---------------------------------------------------------------------------
// The Sultana
// ---------------------------------------------------------------------------
function paint(width, height, draw, fallback) {
  if (typeof document === 'undefined') return mat(fallback, { side: THREE.DoubleSide });
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: texture, roughness: .9, side: THREE.DoubleSide });
}
/** The sail: cream canvas, a blue border, and a gold roundel with a salt crystal in it. */
const sailCloth = () => paint(256, 256, (g, w, h) => {
  g.fillStyle = '#f1e9d4'; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(160,140,100,.25)'; g.lineWidth = 2; for (let k = 1; k < 8; k++) { g.beginPath(); g.moveTo(k * w / 8, 0); g.lineTo(k * w / 8, h); g.stroke(); }
  g.fillStyle = '#27306e'; g.fillRect(0, 0, w, 14); g.fillRect(0, h - 14, w, 14); g.fillRect(0, 0, 10, h); g.fillRect(w - 10, 0, 10, h);
  const cx = w / 2, cy = h * .5, r = w * .27;
  g.fillStyle = '#d2a843'; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#27306e'; g.beginPath(); g.arc(cx, cy, r * .86, 0, Math.PI * 2); g.fill();
  // A cube, drawn the way a crystal of salt sits: three faces.
  const s = r * .5, top = [[cx, cy - s], [cx + s * .87, cy - s * .5], [cx, cy], [cx - s * .87, cy - s * .5]];
  const face = (points, color) => { g.fillStyle = color; g.beginPath(); points.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill(); };
  face(top, '#ffffff'); face([[cx - s * .87, cy - s * .5], [cx, cy], [cx, cy + s], [cx - s * .87, cy + s * .5]], '#d9dde8');
  face([[cx, cy], [cx + s * .87, cy - s * .5], [cx + s * .87, cy + s * .5], [cx, cy + s]], '#b9bfd4');
}, 0xf1e9d4);
const nameBoard = () => paint(256, 64, (g, w, h) => {
  g.fillStyle = '#27306e'; g.fillRect(0, 0, w, h); g.strokeStyle = '#d2a843'; g.lineWidth = 4; g.strokeRect(4, 4, w - 8, h - 8);
  g.fillStyle = '#e8c86a'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '600 34px Georgia, serif'; g.fillText('SULTANA', w / 2, h / 2 + 2);
}, 0x27306e);

/** A hull from an outline in plan, lofted through rings of [y, scale]. */
function lofted(outline, rings, material, parent) {
  const positions = [], indices = [], n = outline.length;
  for (const [y, sx, sz] of rings) for (const [bx, bz] of outline) positions.push(bx * sx, y, bz * sz);
  for (let r = 0; r < rings.length - 1; r++) for (let i = 0; i < n; i++) {
    const p = r * n + i, q = r * n + (i + 1) % n;
    indices.push(p, q, p + n, q, q + n, p + n);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setIndex(indices); geometry.computeVertexNormals();
  const m = new THREE.Mesh(geometry, material); m.castShadow = true; parent.add(m); return m;
}

/**
 * The Sultana, bow to +z. `update(time, pose)` rocks her, heels her under way,
 * sets or brails her sail (`pose.sail` 0 to 1) and flies her pennant.
 */
export function createSultana() {
  const group = new THREE.Group(); group.name = 'The Sultana';
  const ship = new THREE.Group(); group.add(ship);
  const L = HULL.length / 2, B = HULL.beam / 2, D = HULL.draft;
  const outline = [[0, -L * .92], [B * .8, -L * .78], [B, -L * .3], [B, L * .15], [B * .78, L * .6], [B * .35, L * .9], [0, L],
    [-B * .35, L * .9], [-B * .78, L * .6], [-B, L * .15], [-B, -L * .3], [-B * .8, -L * .78]];
  const blue = mat(0x1d3a66, { side: THREE.DoubleSide }), wood = mat(0x7a5638), dark = mat(0x4a3322), deckWood = mat(0xb08a5a);
  lofted(outline, [[1.55, 1.04, 1.02], [.5, 1, 1], [.1, .95, .98], [-D, .4, .82]], blue, ship);
  // The crust of salt along her waterline, and gold at her rail.
  lofted(outline, [[.48, 1.012, 1.008], [.02, .962, .988]], SALT, ship);
  for (let i = 0; i < outline.length; i++) {
    const [ax, az] = outline[i], [bx, bz] = outline[(i + 1) % outline.length];
    const len = Math.hypot(bx - ax, bz - az);
    add(ship, cube, GOLD, [(ax + bx) / 2 * 1.04, 1.5, (az + bz) / 2 * 1.02], [.1, .12, len + .06], [0, Math.atan2(bx - ax, bz - az), 0]);
  }
  // The deck, cut to her plan inside the bulwarks.
  const plan = new THREE.Shape(outline.map(([bx, bz]) => new THREE.Vector2(bx * .96, -bz * .96)));
  const deck = new THREE.Mesh(new THREE.ShapeGeometry(plan), deckWood); deck.rotation.x = -Math.PI / 2; deck.position.y = 1.16; deck.receiveShadow = true; ship.add(deck);
  // The stern cabin under a gilt dome, a lantern, the name board and the rudder.
  add(ship, cube, mat(0xe9dfc6), [0, 1.85, -L * .62], [B * 1.3, 1.3, L * .42]);
  add(ship, cube, blue, [0, 2.54, -L * .62], [B * 1.42, .1, L * .46]);
  add(ship, new THREE.SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), GOLD, [0, 2.58, -L * .62], [.62, .75, .62]);
  add(ship, new THREE.ConeGeometry(.08, .45, 8), GOLD, [0, 3.5, -L * .62]);
  for (const s of [-1, 1]) add(ship, cube, mat(0x3b2a1f), [s * B * .66, 1.95, -L * .5], [.02, .4, .5]);
  add(ship, cube, nameBoard(), [0, 1.35, -L * .93], [1.5, .38, .04]);
  add(ship, cube, dark, [0, .2, -L * .95], [.12, 1.9, .7]);
  add(ship, tube, GOLD, [0, 2.95, -L * .9], [.1, .25, .1]);
  add(ship, ball, mat(0xffd98a, { emissive: 0xffb040, emissiveIntensity: .8 }), [0, 2.95, -L * .9], [.07, .1, .07]);
  // The bowsprit, and a gilt figurehead: a crystal.
  add(ship, tube, wood, [0, 1.9, L * 1.05], [.08, 2.6, .08], [Math.PI / 2 - .3, 0, 0]);
  crystal(ship, [0, 1.62, L * 1.0], .28);
  // The cargo: sacks of salt, barrels, and an open crate heaped white.
  const sack = mat(0xe9e2cf), sackTie = mat(0x9b7b4b);
  const sacks = [[-.7, .3], [.7, .3], [-.7, 1.1], [.7, 1.1], [0, .7], [-.7, 1.9], [.7, 1.9], [0, 1.5], [-.55, -1.2], [.55, -1.2]];
  sacks.forEach(([x, z], k) => { const y = 1.4 + (k === 4 || k === 7 ? .34 : 0);
    add(ship, ball, sack, [x, y, z], [.34, .22, .28], [0, k * .7, 0]); add(ship, tube, sackTie, [x, y + .17, z], [.08, .08, .08]); });
  for (const [x, z] of [[-.9, -2.2], [-.4, -2.4], [.9, -2.2]]) { add(ship, tube, wood, [x, 1.55, z], [.26, .72, .26]); add(ship, tube, dark, [x, 1.55, z], [.27, .06, .27]); }
  add(ship, cube, wood, [.3, 1.4, 2.8], [1.1, .5, .8]);
  add(ship, ball, SALT, [.3, 1.66, 2.8], [.5, .2, .36]);
  crystal(ship, [.1, 1.8, 2.75], .09); crystal(ship, [.45, 1.78, 2.9], .07);
  // The mast, the yard and the sail. The sail hangs from the yard and is brailed up to it in port.
  const mastZ = L * .08, top = 9.4, yardY = 8.2, sailW = 5.8, sailH = 5.2;
  add(ship, tube, wood, [0, top / 2 + .6, mastZ], [.14, top, .14]);
  add(ship, tube, wood, [0, yardY, mastZ + .12], [.09, sailW + .9, .09], [0, 0, Math.PI / 2]);
  const sailGeometry = new THREE.PlaneGeometry(sailW, sailH, 8, 6);
  const flat = sailGeometry.attributes.position.array.slice();
  const sail = new THREE.Mesh(sailGeometry, sailCloth()); sail.castShadow = true; ship.add(sail);
  const furled = add(ship, tube, mat(0xe8dfc6), [0, yardY - .14, mastZ + .2], [.22, sailW, .22], [0, 0, Math.PI / 2]);
  /** Belly the sail out to `fill` (0 slack to 1 drawing) and set it `set` of the way down from the yard. */
  function trimSail(set, fill) {
    const p = sailGeometry.attributes.position.array;
    for (let i = 0; i < p.length; i += 3) {
      const u = flat[i] / sailW + .5, v = .5 - flat[i + 1] / sailH;
      p[i] = flat[i]; p[i + 1] = -v * sailH * set; p[i + 2] = Math.sin(Math.PI * u) * Math.sin(Math.PI * (.2 + .8 * v)) * (.25 + .9 * fill) * set;
    }
    sailGeometry.attributes.position.needsUpdate = true; sailGeometry.computeVertexNormals();
    sail.visible = set > .06; furled.visible = set < .5;
  }
  sail.position.set(0, yardY - .12, mastZ + .24);
  // Shrouds, a stay forward, and the pennant at the masthead.
  const cord = mat(0x6b5a44);
  const rope = (a, b) => { const d = new THREE.Vector3().subVectors(b, a), m = add(ship, tube, cord, [(a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2], [.025, d.length(), .025]);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); };
  for (const s of [-1, 1]) for (const dz of [-.9, .2]) rope(new THREE.Vector3(0, top, mastZ), new THREE.Vector3(s * B * 1.02, 1.55, mastZ + dz));
  rope(new THREE.Vector3(0, top, mastZ), new THREE.Vector3(0, 2.1, L * 1.5));
  const pennantGeometry = new THREE.PlaneGeometry(2.4, .3, 8, 1); pennantGeometry.translate(1.2, 0, 0);
  const pennantFlat = pennantGeometry.attributes.position.array.slice();
  const pennant = new THREE.Mesh(pennantGeometry, mat(0xe0a526, { side: THREE.DoubleSide })); pennant.position.set(0, top + .15, mastZ); ship.add(pennant);
  add(ship, ball, GOLD, [0, top + .12, mastZ], [.12, .12, .12]);
  trimSail(0, 0);

  let lastSet = -1;
  function update(time, pose) {
    const under = !!pose?.moving, set = pose?.sail ?? 0;
    ship.position.y = Math.sin(time * .7) * .08;
    ship.rotation.z = Math.sin(time * .55) * (under ? .035 : .018) + (under ? .06 * set : 0);
    ship.rotation.x = Math.sin(time * .43 + 1) * .012;
    if (Math.abs(set - lastSet) > .01) { trimSail(set, under ? 1 : .2); lastSet = set; }
    // The pennant streams astern, and waves.
    const p = pennantGeometry.attributes.position.array;
    for (let i = 0; i < p.length; i += 3) { const x = pennantFlat[i]; p[i + 2] = Math.sin(time * 5 - x * 2.2) * .12 * x / 2.4; }
    pennantGeometry.attributes.position.needsUpdate = true;
    pennant.rotation.y = Math.PI / 2 + Math.sin(time * .3) * .25;
  }
  return { group, update };
}

import * as THREE from 'three';
import { DRENT_SITES } from './drent-sites.js';

/** Small authored scenes, grounded independently so no flat decal buries a traveler on a slope. */
export function createDrentCivilWarScenery({ root, material, box, mesh, post, pebble, groundHeight, colliders, wornPatch, roofGeometry, movingGroups }) {
  const wood = material('#705339'), paleWood = material('#aa875c'), cloth = material('#80785b');
  const iron = material('#444c49'), stone = material('#7c8173'), red = material('#793d33');
  const group = new THREE.Group(); group.name = 'Drent civil war places'; root.add(group);
  const solidBox = (x, z, width, depth, height, mat, kind, parent = group) => {
    const y = groundHeight(x, z), object = box(mat, x, y + height / 2, z, width, height, depth, parent);
    object.userData.passable = true;
    colliders.push({ x, z, hx: width / 2, hz: depth / 2, height, kind, site: 'drent-civil-war' });
    return object;
  };
  const decorativeBox = (...args) => { const object = box(...args); object.userData.passable = true; return object; };
  const crate = (x, z, w = 1.1, d = .9, h = 1, parent = group) => {
    const body = solidBox(x, z, w, d, h, paleWood, 'drent-supply-crate', parent), y = groundHeight(x, z);
    for (const side of [-1, 1]) decorativeBox(iron, x + side * w * .32, y + h + .018, z, .07, .05, d + .035, parent);
    return body;
  };

  // Three empty bedrolls and abandoned cooking gear make the missing occupants legible.
  const camp = DRENT_SITES.camp;
  wornPatch(camp.x, camp.z, 7.2, '#8d8463', .85, group);
  for (const [dx, dz, yaw] of [[-3.8, 1, -.35], [2.8, 3, .3]]) {
    const x = camp.x + dx, z = camp.z + dz, y = groundHeight(x, z);
    const tent = new THREE.Group(); tent.name = 'Empty rebel tent'; tent.position.set(x, y, z); tent.rotation.y = yaw; group.add(tent);
    mesh(roofGeometry(3.7, 3.8, 2.1), cloth, 0, .12, 0, 1, 1, 1, tent).userData.passable = true;
    colliders.push({ x, z, r: 1.55, kind: 'rebel-tent', height: 2.2, site: 'drent-civil-war' });
    decorativeBox(wood, 0, 1.15, 1.7, .1, 2.2, .1, tent);
    decorativeBox(material('#72694f'), .15, .13, 2.25, .75, .12, 1.8, tent);
  }
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * Math.PI * 2, x = camp.x + Math.cos(a) * .85, z = camp.z + Math.sin(a) * .85;
    pebble(stone, x, groundHeight(x, z) + .16, z, .25, .2, .23, group).userData.passable = true;
  }
  decorativeBox(material('#343a30'), camp.x, groundHeight(camp.x, camp.z) + .04, camp.z, 1.15, .045, 1.15, group);
  const evidenceRoot = new THREE.Group(); evidenceRoot.name = 'Rebel dispatch chest'; group.add(evidenceRoot); movingGroups.add(evidenceRoot);
  const ex = DRENT_SITES.evidence.x, ez = DRENT_SITES.evidence.z - 1.15;
  crate(ex, ez, 1.25, .82, .64, evidenceRoot);
  const dispatch = decorativeBox(material('#dec994'), ex, groundHeight(ex, ez) + .69, ez, .51, .07, .35, evidenceRoot);
  const wax = decorativeBox(red, ex + .03, groundHeight(ex, ez) + .735, ez, .11, .025, .12, evidenceRoot);

  // A plain, larger soldier's lodging with an outside store: it is an actual solid building,
  // while the supplies can be reached through a covered back route instead of a fake door.
  const bx = -42, bz = 72, by = groundHeight(bx, bz);
  wornPatch(-36.5, 72.5, 10.2, '#a89a75', .86, group);
  solidBox(bx, bz, 5.4, 9.2, 3.45, material('#c9c2a0'), 'barracks-wall');
  // The map needs the lodging footprint, not a giant circle over the yard.
  Object.assign(colliders.at(-1), { width: 5.4, depth: 9.2, angle: 0, kind: 'house' });
  mesh(roofGeometry(6.4, 10.2, 1.8), material('#47574c'), bx, by + 3.4, bz, 1, 1, 1, group).userData.passable = true;
  for (const dx of [-2.64, 2.64]) for (const dz of [-4.52, 4.52]) decorativeBox(wood, bx + dx, by + 1.8, bz + dz, .17, 3.7, .17, group);
  decorativeBox(wood, bx + 2.78, by + 1.1, bz - 1, .12, 2.15, 1.2, group);
  for (const dz of [-3.05, 1.55, 3.3]) {
    decorativeBox(wood, bx + 2.78, by + 2.05, bz + dz, .12, .86, 1.0, group);
    decorativeBox(material('#c2b382'), bx + 2.85, by + 2.05, bz + dz, .045, .63, .76, group);
  }
  // Empire-red pennants distinguish the barracks without more directional signposts.
  for (const z of [68, 75.8]) {
    const x = -38.65, y = groundHeight(x, z);
    post(wood, x, y + 2.2, z, .07, 4.4, group).userData.passable = true;
    decorativeBox(red, x, y + 3.25, z + .35, .055, 1.2, .75, group);
  }
  // Cover blocks sight into the southern stores, but the six-metre path behind it is open.
  for (const [x, z, w, d, h] of [[-36.8, 76.7, 2.0, 1.2, 1.55], [-34.2, 76.7, 1.65, 1.2, 1.25], [-38.4, 79.3, 1.15, 2.1, 1.55]]) crate(x, z, w, d, h);
  const supplyRoot = new THREE.Group(); supplyRoot.name = 'Barracks supply chest'; group.add(supplyRoot); movingGroups.add(supplyRoot);
  crate(-36.15, 79, 1.2, 1.25, .85, supplyRoot);
  const bundle = decorativeBox(material('#a3a783'), -36.15, groundHeight(-36.15, 79) + .99, 79, .95, .26, 1.0, supplyRoot);
  const strap = decorativeBox(wood, -36.15, groundHeight(-36.15, 79) + 1.13, 79, .075, .035, 1.04, supplyRoot);
  // No roof above the interaction point: the camera can read the chest and the guards at once.
  for (const z of [71.8, 73.1, 74.4]) decorativeBox(iron, -38.2, groundHeight(-38.2, z) + 1.2, z, .08, 1.7, .06, group);
  wornPatch(DRENT_SITES.killian.x, DRENT_SITES.killian.z, 3.2, '#a89c7d', .85, group);

  return {
    ...DRENT_SITES,
    setEvidenceTaken(taken) { dispatch.visible = wax.visible = !taken; },
    setSuppliesTaken(taken) { bundle.visible = strap.visible = !taken; },
  };
}

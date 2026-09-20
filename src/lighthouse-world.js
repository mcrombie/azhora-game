import * as THREE from 'three';
import { SALTWIND_LIGHT, lightPoint } from './lighthouse.js';

/**
 * The Saltwind Light on its head, west of Tidehaven past Brandy's yard and the Lookout
 * (src/lighthouse.js): a round stone tower tapering to a corbelled gallery and a glazed
 * lantern, the keeper's cottage against its foot with its back to the weather, a drystone
 * yard wall open to landward, the oil store cut into the bank away from the cottage fire,
 * a fog bell on a frame, a flagstaff, and the gear of somebody who was fourteen years at
 * sea and never stopped keeping things coiled: pots, floats, a boat upturned on trestles,
 * and line on every hook.
 *
 * Everything but the tower, the cottage and the store is passable; those three carry
 * colliders of their own so the traveler walks round them and not through them.
 */
export function createLighthouse(kit) {
  const { parent, material, mesh, box, post, round, cylinder, heightAt, colliders, signs } = kit;
  const L = SALTWIND_LIGHT;
  const group = new THREE.Group(); group.name = 'The Saltwind Light'; parent.add(group);

  const stone = material('#8d8a82'), stoneDark = material('#6f6d67'), stoneLight = material('#a8a49a');
  const slate = material('#4f5257'), timber = material('#6b553c'), door = material('#40566b');
  const brass = material('#b8923e'), glass = new THREE.MeshStandardMaterial({ color: '#dfe7ea', roughness: .12, metalness: .2, transparent: true, opacity: .55 });
  const lit = material('#f2d9a0'), rope = material('#b5a179'), canvas = material('#cfc6ae');
  const paint = material('#b8443a'), weed = material('#6f7a4a');

  const groundAt = (x, z) => heightAt(x, z);

  // ---- the tower -----------------------------------------------------------------------
  const t = L.tower, ty = groundAt(t.x, t.z);
  // A skirt of rough stone where it is built into the rock, then the taper.
  mesh(new THREE.CylinderGeometry(t.base + .5, t.base + .8, .9, 16), stoneDark, t.x, ty + .45, t.z, 1, 1, 1, group);
  const shaft = mesh(new THREE.CylinderGeometry(t.top, t.base, t.height, 16), stone, t.x, ty + .9 + t.height / 2, t.z, 1, 1, 1, group);
  shaft.name = 'Saltwind Light tower';
  // Three courses of paler stone, the way a tower gets banded so it can be told at a distance.
  for (const level of [.28, .55, .82]) {
    const y = ty + .9 + t.height * level, radius = t.base + (t.top - t.base) * level;
    mesh(new THREE.CylinderGeometry(radius + .04, radius + .04, .5, 16), stoneLight, t.x, y, t.z, 1, 1, 1, group);
  }
  // The door, facing the cottage and out of the weather, with a stone lintel over it.
  mesh(new THREE.BoxGeometry(1.1, 1.9, .3), door, t.x - t.base * .95, ty + 1.85, t.z + .5, 1, 1, 1, group).rotation.y = -.28;
  mesh(new THREE.BoxGeometry(1.5, .28, .5), stoneLight, t.x - t.base * .92, ty + 2.9, t.z + .5, 1, 1, 1, group).rotation.y = -.28;
  // Slit windows up the stair, spiralling the way the stair does.
  for (let k = 0; k < 5; k++) {
    const level = .2 + k * .15, angle = -.4 + k * 1.15;
    const radius = t.base + (t.top - t.base) * level;
    mesh(new THREE.BoxGeometry(.28, .74, .3), slate,
      t.x + Math.sin(angle) * radius, ty + .9 + t.height * level, t.z + Math.cos(angle) * radius, 1, 1, 1, group).rotation.y = angle;
  }
  // The gallery: a corbel course, a deck, and an iron rail round it.
  const galleryY = ty + .9 + t.height;
  mesh(new THREE.CylinderGeometry(t.top + .95, t.top + .35, .5, 16), stoneDark, t.x, galleryY + .25, t.z, 1, 1, 1, group);
  mesh(new THREE.CylinderGeometry(t.top + 1, t.top + 1, .14, 16), stoneLight, t.x, galleryY + .56, t.z, 1, 1, 1, group);
  for (let k = 0; k < 16; k++) {
    const angle = k / 16 * Math.PI * 2;
    post(slate, t.x + Math.sin(angle) * (t.top + .92), galleryY + .95, t.z + Math.cos(angle) * (t.top + .92), .035, .76, group);
  }
  mesh(new THREE.TorusGeometry(t.top + .92, .045, 5, 20), slate, t.x, galleryY + 1.33, t.z, 1, 1, 1, group).rotation.x = Math.PI / 2;

  // ---- the lantern ---------------------------------------------------------------------
  const lanternY = galleryY + .63 + L.tower.lantern / 2;
  // Astragals: eight uprights of brass with the glass between them.
  mesh(new THREE.CylinderGeometry(t.top + .2, t.top + .2, L.tower.lantern, 8), glass, t.x, lanternY, t.z, 1, 1, 1, group);
  for (let k = 0; k < 8; k++) {
    const angle = k / 8 * Math.PI * 2 + Math.PI / 8;
    post(brass, t.x + Math.sin(angle) * (t.top + .2), lanternY, t.z + Math.cos(angle) * (t.top + .2), .045, L.tower.lantern, group);
  }
  mesh(new THREE.CylinderGeometry(t.top + .26, t.top + .26, .12, 8), brass, t.x, lanternY - L.tower.lantern / 2, t.z, 1, 1, 1, group);
  // The silvered dish, the size of a cartwheel, and the ring of wicks in front of it.
  const dish = mesh(new THREE.SphereGeometry(.92, 12, 8, 0, Math.PI, .2, Math.PI * .6), brass, t.x, lanternY, t.z, 1, 1, 1, group);
  dish.name = 'Saltwind Light reflector'; dish.rotation.y = 1.9;
  for (let k = 0; k < 11; k++) {
    const angle = k / 11 * Math.PI * 2;
    mesh(cylinder, lit, t.x + Math.sin(angle) * .34, lanternY - .1, t.z + Math.cos(angle) * .34, .035, .2, .035, group);
  }
  // The cap: a cone of slate, a vent, and the weather vane over it.
  mesh(new THREE.ConeGeometry(t.top + .44, 1.15, 8), slate, t.x, lanternY + L.tower.lantern / 2 + .55, t.z, 1, 1, 1, group);
  post(brass, t.x, lanternY + L.tower.lantern / 2 + 1.5, t.z, .06, 1.1, group);
  const vane = mesh(new THREE.BoxGeometry(.72, .3, .03), brass, t.x + .22, lanternY + L.tower.lantern / 2 + 1.95, t.z, 1, 1, 1, group);
  vane.name = 'Saltwind Light vane'; vane.rotation.y = .5;
  colliders.push({ x: t.x, z: t.z, r: t.base + .7, kind: 'lighthouse' });

  // ---- the cottage ---------------------------------------------------------------------
  const c = L.cottage, cy = groundAt(c.x, c.z);
  const house = new THREE.Group(); house.position.set(c.x, cy, c.z); house.rotation.y = c.yaw; group.add(house);
  box(stone, 0, c.eaves / 2, 0, c.width, c.eaves, c.depth, house);
  const roof = mesh(new THREE.CylinderGeometry(.01, (c.ridge - c.eaves) * 1.42, c.width + .5, 3, 1, false), slate, 0, c.eaves + (c.ridge - c.eaves) / 2, 0, 1, 1, 1, house);
  roof.rotation.set(0, 0, Math.PI / 2);
  roof.scale.set(1, 1, (c.depth + .6) / ((c.ridge - c.eaves) * 1.42 * 1.732));
  box(door, -1.4, .95, c.depth / 2 + .02, 1, 1.9, .12, house);
  for (const dx of [1.2, 2.9]) box(glass, dx, 1.4, c.depth / 2 + .02, .8, .7, .1, house);
  post(stoneDark, -c.width / 2 + .5, c.ridge + .5, 0, .42, 2.4, house);       // the chimney
  colliders.push({ x: c.x, z: c.z, r: Math.max(c.width, c.depth) * .48, kind: 'lighthouse-cottage' });

  // ---- the yard wall -------------------------------------------------------------------
  const y = L.yard;
  for (let k = 0; k < 44; k++) {
    const angle = k / 44 * Math.PI * 2;
    if (angle > y.openFrom && angle < y.openTo) continue;                      // the gate, to landward
    const x = y.x + Math.sin(angle) * y.radius, z = y.z + Math.cos(angle) * y.radius;
    const gy = groundAt(x, z), h = y.height * (.82 + ((k * 7) % 5) * .07);
    const stoneMat = k % 3 ? stone : stoneDark;
    box(stoneMat, x, gy + h / 2, z, .62, h, .62, group).rotation.y = angle + ((k % 3) - 1) * .12;
  }

  // ---- the oil store, dug into the bank ------------------------------------------------
  const s = L.store, sy = groundAt(s.x, s.z);
  box(stoneDark, s.x, sy + s.height / 2, s.z, s.width, s.height, s.depth, group);
  box(slate, s.x, sy + s.height + .12, s.z, s.width + .4, .24, s.depth + .4, group);
  box(door, s.x + s.width / 2 + .02, sy + .8, s.z, .1, 1.5, 1, group);
  for (const [dx, dz] of [[-2.2, 1.5], [-1.4, 1.9]]) {
    mesh(cylinder, timber, s.x + dx, sy + .34, s.z + dz, .34, .68, .34, group);  // oil cans, waiting to go up
  }
  colliders.push({ x: s.x, z: s.z, r: Math.max(s.width, s.depth) * .5, kind: 'lighthouse-store' });

  // ---- the bell, the staff, and a sailor's gear ----------------------------------------
  const b = L.bell, by = groundAt(b.x, b.z);
  for (const dx of [-.7, .7]) {
    const leg = post(timber, b.x + dx, by + b.height / 2, b.z, .09, b.height, group);
    leg.rotation.z = dx > 0 ? -.12 : .12;
  }
  box(timber, b.x, by + b.height, b.z, 1.9, .16, .16, group);
  const bell = mesh(new THREE.CylinderGeometry(.24, .38, .52, 10), brass, b.x, by + b.height - .34, b.z, 1, 1, 1, group);
  bell.name = 'Saltwind fog bell';
  mesh(cylinder, rope, b.x, by + b.height - .95, b.z, .02, .8, .02, group);

  const f = L.staff, fy = groundAt(f.x, f.z);
  post(timber, f.x, fy + f.height / 2, f.z, .11, f.height, group);
  mesh(new THREE.BoxGeometry(.9, .58, .04), canvas, f.x + .45, fy + f.height - .55, f.z, 1, 1, 1, group).rotation.y = .3;
  mesh(cylinder, rope, f.x + .13, fy + f.height / 2, f.z, .012, f.height * .92, .012, group);

  // The gear: pots stacked against the wall, floats on a line, a boat upturned on trestles,
  // and net drying over a frame. All of it passable; she keeps a clear yard.
  const gear = new THREE.Group(); gear.name = 'Saltwind Light gear'; group.add(gear);
  for (let k = 0; k < 5; k++) {
    const p = lightPoint(-7.4 + (k % 3) * .95, -2.6 + Math.floor(k / 3) * .95), py = groundAt(p.x, p.z);
    mesh(new THREE.CylinderGeometry(.42, .46, .38, 7), timber, p.x, py + .19 + (k % 2) * .4, p.z, 1, 1, 1, gear).rotation.y = k;
  }
  // Floats on a line along the cottage wall, where they are out of the way of the door and of
  // anybody standing in the yard.
  {
    const from = lightPoint(-9.2, 6.35), to = lightPoint(-4.6, 6.35);
    const hang = groundAt(from.x, from.z) + 1.5;
    mesh(cylinder, rope, (from.x + to.x) / 2, hang, from.z, .012, Math.abs(to.x - from.x), .012, gear).rotation.z = Math.PI / 2;
    for (let k = 0; k < 7; k++) {
      const p = lightPoint(-9 + k * .72, 6.35);
      mesh(round, k % 2 ? paint : canvas, p.x, hang - .2, p.z, .13, .15, .13, gear);
    }
  }
  const boatAt = lightPoint(-9.4, 3.2), boatY = groundAt(boatAt.x, boatAt.z);
  for (const dx of [-1.5, 1.5]) box(timber, boatAt.x + dx, boatY + .28, boatAt.z, .14, .56, 1.3, gear);
  const hull = mesh(new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), paint, boatAt.x, boatY + .62, boatAt.z, 2.6, .72, 1.05, gear);
  hull.name = 'Addison’s boat'; hull.rotation.z = Math.PI; hull.rotation.y = .42;
  for (let k = 0; k < 6; k++) {
    const p = lightPoint(-3 + k * .5, -5.4), py = groundAt(p.x, p.z);
    box(weed, p.x, py + .9, p.z, .42, .6, .06, gear).rotation.y = .3;
  }
  // Everything in the yard is scenery: the tower, the cottage and the store carry the colliders.
  gear.traverse(object => { if (object.isMesh) object.userData.passable = true; });

  signs?.place?.({ x: L.gate.x, z: L.gate.z, label: L.name, facing: 1.05, parent: group });
  return group;
}

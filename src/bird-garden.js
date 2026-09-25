/**
 * Jean's garden on the eastern side of Tidehaven: a hook for the hummingbird
 * feeder among red bee balm, a stone bird bath, and the bench she built for herself
 * that the birds have taken over. Authored in Tidehaven's local metres, like the rest of the village;
 * built from world.js's own helpers so it batches with the village. The feeder on
 * the hook is its own group, shown once the traveler has hung it.
 */
import * as THREE from 'three';
import { villageToWorld } from './region-world.js';

export const BIRD_GARDEN_LOCAL = Object.freeze({
  center: Object.freeze({ x: 26.5, z: -5.2 }), radius: 3.9,
  stand: Object.freeze({ x: 24.6, z: -4.4 }),
  hook: Object.freeze({ x: 27.7, z: -3.3 }), arm: .52,
  bath: Object.freeze({ x: 26.8, z: -7.9 }),
  bench: Object.freeze({ x: 24.1, z: -7.7 }),
  square: Object.freeze({ x: 0, z: 5 }),
});

/** Scatter (bushes, flowers, loose rocks) keeps out of the garden; given in village-local metres. */
export const inBirdGarden = (x, z) => Math.hypot(x - BIRD_GARDEN_LOCAL.center.x, z - BIRD_GARDEN_LOCAL.center.z) < BIRD_GARDEN_LOCAL.radius;

const FEEDER_DROP = .5;
// The feeder's flower ports sit just under the bottle, a little below the group's origin.
const PORT_Y = 2.02 - FEEDER_DROP - .08;

/** The garden's places in world metres. `ground(x, z)` is world ground height. */
export function birdGardenSites(ground) {
  const L = BIRD_GARDEN_LOCAL, w = p => villageToWorld(p.x, p.z);
  const stand = w(L.stand), square = w(L.square), hook = w(L.hook), bath = w(L.bath);
  // The arm points along the village's local +z, toward the shore; the feeder hangs from its end.
  const feeder = w({ x: L.hook.x, z: L.hook.z + L.arm });
  const baseY = ground(hook.x, hook.z);
  const port = { x: feeder.x, y: baseY + PORT_Y, z: feeder.z };
  // The hummingbird feeds from the port facing the garden, away from the post.
  const out = w({ x: L.hook.x - .17, z: L.hook.z + L.arm });
  return Object.freeze({
    center: Object.freeze(w(L.center)), radius: L.radius,
    stand: Object.freeze({ ...stand, yaw: Math.atan2(square.x - stand.x, square.z - stand.z) }),
    hook: Object.freeze({ ...hook, y: baseY }),
    feeder: Object.freeze(port),
    hover: Object.freeze({ x: out.x, y: port.y + .02, z: out.z, yaw: Math.atan2(port.x - out.x, port.z - out.z) }),
    bath: Object.freeze({ ...bath, y: ground(bath.x, bath.z) + .82 }),
  });
}

/**
 * Build the garden into Tidehaven. `h` is world.js's helper bundle, in village-local
 * metres under `h.root`. Returns the feeder group and a switch for it.
 */
export function buildBirdGarden(h) {
  const L = BIRD_GARDEN_LOCAL, { root, material, mesh, box, post, pebble, localGround, vpush, movingGroups } = h;
  const wood = material('#5c4432'), stone = material('#9c9686'), stoneDark = material('#827c6d'), water = material('#7f9fa6', { roughness: .25 });
  const stem = material('#4f7440'), leaf = material('#5f8a4b'), balm = material('#c3263b'), balmDeep = material('#9c1f36'), lilac = material('#9a78b4');
  const cream = material('#e9dfc4'), leather = material('#6e4b31');

  // The hook: a stout post with an arm, and a little iron hook at its end.
  const hy = localGround(L.hook.x, L.hook.z);
  post(wood, L.hook.x, hy + 1.0, L.hook.z, .055, 2.0);
  box(wood, L.hook.x, hy + 1.97, L.hook.z + L.arm / 2 - .02, .07, .07, L.arm + .1);
  post(material('#3a3834'), L.hook.x, hy + 1.9, L.hook.z + L.arm, .012, .12);
  vpush({ x: L.hook.x, z: L.hook.z, r: .16 });

  // Bee balm about the foot of the hook: green clumps under ragged red heads, and a few lilac ones.
  for (let i = 0; i < 14; i++) {
    const a = i * 2.39, r = .45 + (i % 4) * .22, x = L.hook.x + .35 + Math.cos(a) * r, z = L.hook.z + .25 + Math.sin(a) * r * .9;
    if (Math.hypot(x - L.hook.x, z - L.hook.z) < .28) continue;
    const y = localGround(x, z), tall = .55 + (i % 3) * .12;
    pebble(leaf, x, y + tall * .42, z, .16, tall * .42, .15);
    post(stem, x, y + tall * .75, z, .012, tall * .3);
    const head = i % 5 === 4 ? lilac : i % 2 ? balm : balmDeep;
    pebble(head, x, y + tall + .03, z, .075, .06, .075);
    for (let p = 0; p < 5; p++) pebble(head, x + Math.cos(p * 1.26) * .06, y + tall + .06, z + Math.sin(p * 1.26) * .06, .025, .045, .025);
  }

  // The bird bath: a pedestal, a shallow basin, water.
  const by = localGround(L.bath.x, L.bath.z);
  post(stoneDark, L.bath.x, by + .36, L.bath.z, .12, .72);
  post(stone, L.bath.x, by + .06, L.bath.z, .24, .12);
  post(stone, L.bath.x, by + .78, L.bath.z, .44, .1);
  post(water, L.bath.x, by + .835, L.bath.z, .37, .02);
  vpush({ x: L.bath.x, z: L.bath.z, r: .46 });

  // Lakota's bench, with his notebook and a pencil on it.
  const sy = localGround(L.bench.x, L.bench.z);
  box(wood, L.bench.x, sy + .46, L.bench.z, .42, .07, 1.5);
  for (const dz of [-.6, .6]) box(wood, L.bench.x, sy + .22, L.bench.z + dz, .36, .44, .08);
  box(leather, L.bench.x, sy + .515, L.bench.z + .25, .17, .03, .23);
  box(cream, L.bench.x + .005, sy + .532, L.bench.z + .25, .15, .006, .21);
  box(material('#3b3024'), L.bench.x + .03, sy + .54, L.bench.z - .02, .012, .012, .16);
  vpush({ x: L.bench.x, z: L.bench.z, hx: .24, hz: .78 });

  // The feeder itself: a cord from the hook, a pale glass bottle, and a red dish with yellow flower ports.
  const feeder = new THREE.Group();
  feeder.name = 'Lakota’s hummingbird feeder';
  feeder.position.set(L.hook.x, hy + 2.02 - FEEDER_DROP, L.hook.z + L.arm);
  root.add(feeder); movingGroups.add(feeder);
  const glass = material('#cfe3dc', { transparent: true, opacity: .55, roughness: .15 });
  const syrup = material('#e9d7c9', { transparent: true, opacity: .35, roughness: .2 });
  box(material('#3a3834'), 0, .31, 0, .012, .38, .012, feeder);
  post(glass, 0, .02, 0, .06, .2, feeder);
  post(syrup, 0, -.03, 0, .052, .09, feeder);
  post(glass, 0, .15, 0, .025, .06, feeder);
  post(material('#b31e2d'), 0, -.1, 0, .095, .04, feeder);
  post(material('#8c1623'), 0, -.125, 0, .07, .02, feeder);
  for (let p = 0; p < 4; p++) {
    const a = p * Math.PI / 2 + Math.PI / 4;
    pebble(material('#f1c93c'), Math.cos(a) * .075, -.078, Math.sin(a) * .075, .018, .01, .018, feeder);
  }
  feeder.visible = false;

  return { feeder, setFeederHung(hung) { feeder.visible = !!hung; } };
}

import { forEachBuild } from '../../../world/loading/build-each.js';
import { finishBuild } from '../../../world/loading/build-steps.js';
import * as THREE from 'three';
import { registerWorldTree, worldTreeId } from '../../../world/scenery/tree-registry.js';
import { hexOwnerAt, landDistance } from '../../../world/terrain/region-world.js';
import { ISCARE_REGION, ISCARE_ISLANDS, ZECRON, ZECRON_BUILDINGS, ISCARE_RUIN_SITES, ISCARE_WILDLIFE_ZONES, iscareClear } from './iscare-world.js';

export function createIscareScenery(...args) { return finishBuild(createIscareScenerySteps(...args)); }

export function* createIscareScenerySteps({ root, material, mesh, box, post, pebble, groundHeight, colliders, round, wornPatch }) {
  let buildWork = 0;
  const group = new THREE.Group(); group.name = 'Iscare Archipelago'; root.add(group);
  const stone = material('#9b9786'), pale = material('#c1b8a0'), ash = material('#625e55'), char = material('#353532');
  const scrub = material('#65704b'), trunk = material('#72624c');
  const metrics = { islands: ISCARE_ISLANDS.length, ruinedBuildings: 0, smallerSettlements: ISCARE_RUIN_SITES.length - 1, rocks: 0, scrub: 0, trees: 0 };
  let seed = 977;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  function ruin(h) {
    const g = new THREE.Group(); g.name = h.id; g.position.set(h.x, groundHeight(h.x, h.z), h.z); group.add(g);
    const w = h.width, d = h.depth;
    box(ash, 0, .045, 0, w, .1, d, g).userData.passable = true;
    // Three jagged, roofless sides leave a real entrance into the shell.
    for (const side of [-1, 1]) {
      box(side < 0 ? stone : ash, side * w / 2, h.height / 2, -.6, .65, h.height, d - 1.2, g);
      for (let z = -d / 2; z < d / 2 - 1; z += 1.1) colliders.push({ x: h.x + side * w / 2, z: h.z + z, r: .5, kind: 'iscare-ruin' });
    }
    box(stone, 0, h.height * .32, -d / 2, w, h.height * .64, .65, g);
    for (let x = -w / 2; x <= w / 2; x += 1.1) colliders.push({ x: h.x + x, z: h.z - d / 2, r: .5, kind: 'iscare-ruin' });
    for (let i = 0; i < 5; i++) {
      const x = (random() - .5) * w * .7, z = (random() - .5) * d * .7;
      const beam = box(char, x, .22, z, w * .6, .18, .2, g); beam.rotation.y = random() * Math.PI; beam.userData.passable = true;
      mesh(round, pale, x + .3, .3, z - .1, .5, .48, .45, g).userData.passable = true;
    }
    metrics.ruinedBuildings++;
  }
  ZECRON_BUILDINGS.forEach(ruin);
  for (const site of ISCARE_RUIN_SITES.slice(1)) { if (++buildWork % 32 === 0) yield;
    wornPatch(site.x, site.z, site.radius - 1, '#6f6858', .75, group);
    yield* forEachBuild([[-9, -4], [7, -6], [3, 8]], function* ([dx, dz], i) { return ruin({ id: `${site.id}-home-${i + 1}`, x: site.x + dx, z: site.z + dz, width: 5, depth: 5, height: 1 + i * .55 }); });
  }
  wornPatch(ZECRON.x, ZECRON.z, 34, '#8b806c', .6, group);
  // The old lighthouse survives as an unmistakable stump, with the lantern fallen alongside.
  const light = { x: ZECRON.x - 32, z: ZECRON.z + 5 }, ly = groundHeight(light.x, light.z);
  post(stone, light.x, ly + 3.4, light.z, 2.8, 6.8, group);
  post(ash, light.x, ly + 6.9, light.z, 2.25, .4, group);
  colliders.push({ ...light, r: 2.8, kind: 'zecron-lighthouse-stump' });
  const lamp = box(char, light.x + 5, groundHeight(light.x + 5, light.z) + .8, light.z, 2, 1.6, 2, group); lamp.rotation.z = .6;
  colliders.push({ x: light.x + 5, z: light.z, r: 1.4, kind: 'fallen-lantern' });
  // A burned quay ends in broken piles at the waterline; no surviving ferry or residents.
  for (let i = 0; i < 10; i++) { if (++buildWork % 32 === 0) yield; for (const side of [-1, 1]) { if (++buildWork % 32 === 0) yield;
    const x = ZECRON.x + side * 2, z = ZECRON.z + 30 + i * 2.2, gy = groundHeight(x, z);
    post(char, x, Math.max(gy, -1) + .7, z, .22, 1.4, group);
  } }
  for (const island of ISCARE_ISLANDS) { if (++buildWork % 32 === 0) yield;
    for (let i = 0; i < 150; i++) { if (++buildWork % 32 === 0) yield;
      const x = island.x + (random() - .5) * 101, z = island.z + (random() - .5) * 109;
      if (hexOwnerAt(x, z) !== ISCARE_REGION || landDistance(x, z) < 1 || iscareClear(x, z, 2)
        || ISCARE_WILDLIFE_ZONES.some(zone => zone.sites.some(([sx, sz]) => Math.hypot(x - sx, z - sz) < 3))) continue;
      const y = groundHeight(x, z), size = .3 + random() * 1.4;
      if (i % 4 === 0) {
        const rock = mesh(round, i % 3 ? stone : pale, x, y + size * .2, z, size, size * .65, size * .85, group); rock.rotation.y = random() * 6.28;
        if (size > 1.1) colliders.push({ x, z, r: size * .7, kind: 'iscare-rock' }); metrics.rocks++;
      } else {
        mesh(round, scrub, x, y + size * .19, z, size * .65, size * .35, size * .6, group); metrics.scrub++;
      }
      if (i % 39 === 0 && landDistance(x, z) > 20) {
        const stem = post(trunk, x, y + 1.4, z, .15, 2.8, group); stem.rotation.z = .2;
        const crown = mesh(round, scrub, x - .3, y + 2.9, z, 1.5, .7, 1.2, group); metrics.trees++;
        const collider = { x, z, r: .2, kind: 'iscare-tree' }; colliders.push(collider);
        registerWorldTree(colliders, { id: worldTreeId('iscare-tamarisk', x, z), x, z, y, species: 'tamarisk', radius: .2 }, [{ mesh: stem }, { mesh: crown }], collider);
      }
    }
  }
  return { group, metrics };
}

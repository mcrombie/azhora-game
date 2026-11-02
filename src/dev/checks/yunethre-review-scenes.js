import * as THREE from 'three';
import {createYunethreScenerySteps} from '../../content/regions/minora-frontier/yunethre-scenery.js';
import {createYunethreLife} from '../../content/regions/minora-frontier/yunethre-life.js';
import {YUNETHRE_TOWN as T, YUNETHRE_CAMP as C, yunethreTint} from '../../content/regions/minora-frontier/yunethre-world.js';
import {southOremindiWaterAt, southOremindiTint} from '../../content/regions/south-oremindi/south-oremindi-world.js';
import {groundWithRiver} from '../../world/terrain/world-terrain.js';
import {regionAt} from '../../world/terrain/region-world.js';
import {createCentaur} from '../../world/actors/centaur-model.js';
import {createCelderKnight} from '../../world/actors/celder-knight.js';

const view = (eye, target) => ({eye: {x: eye[0], y: eye[1], z: eye[2]}, target: {x: target[0], y: target[1], z: target[2]}});
const local = (p, x, y, z, tx = 0, ty = 3, tz = 0) => view([p.x + x, p.level + y, p.z + z], [p.x + tx, p.level + ty, p.z + tz]);
function actorScene(create, kind) {
  return {
    name: kind, box: [-8, -8, 16, 16],
    buildScene(scene) {
      const ground = new THREE.Mesh(new THREE.CylinderGeometry(5, 5.3, .2, 48), new THREE.MeshStandardMaterial({color: 0x858879, roughness: 1}));
      ground.position.y = -.12; ground.receiveShadow = true; scene.add(ground);
      const actor = create(); scene.add(actor.group); actor.animate(1, 0, true, {});
      return {metrics: {kind}, update: time => actor.animate(time, 0, true, {})};
    },
    views: {overview: view([3.7, 2.7, 5.2], [0, 1.2, 0]), face: view([1.2, 2.5, 3.1], [0, 1.95, .4]), profile: view([4.7, 2.3, .3], [0, 1.3, 0]), back: view([-2.3, 2.5, -4.3], [0, 1.25, 0])},
  };
}

export const YUNETHRE_REVIEW_CONFIGS = {
  yunethre: {
    name: 'Yunethre — Laketown & the grasslands', box: [T.x - 170, T.z - 155, 650, 390],
    ground: groundWithRiver, height: groundWithRiver,
    tint: (x, z) => yunethreTint(x, z) ?? southOremindiTint(x, z) ?? 0x8b9b70,
    water: () => null,
    *build(kit) {
      const scenery = yield* createYunethreScenerySteps({...kit, includeLake: true});
      const world = {heightAt: kit.heightAt, renderedGroundHeight: kit.heightAt, waterAt: (x, z) => southOremindiWaterAt(x, z) ?? -100,
        colliders: kit.colliders, bounds: {minX: -5000, maxX: 1000, minZ: -2000, maxZ: 2000}, regionAt, loading: {isReady: () => true},
        paths: scenery.paths.map(p => Object.assign([...p.points], {width: p.width})), enabledRegions: [38]};
      const life = createYunethreLife(kit.parent, world);
      const envoy = createCentaur({envoy: true}); envoy.group.position.set(C.x - 5, kit.heightAt(C.x - 5, C.z + 4), C.z + 4);
      kit.parent.add(envoy.group); let observer = T;
      return {...scenery, view: target => {observer = target; life.update(0, 0, observer);},
        update(time, dt) {scenery.update(time);life.update(time, dt, observer);envoy.animate(time, 0, true, {});},
        life: () => life.state()};
    },
    views: {
      overview: local(T, 133, 118, 156, 40, 3, 22),
      town: local(T, 29, 6, 34, -8, 4, -16),
      lake: local(T, -142, 50, 77, -27, 12, -2),
      fields: local(T, 154, 75, 176, 47, -1, 90),
      camp: local(C, 72, 54, 68),
      hearth: local(C, -9, 4, 25, 7, 1, 10),
      envoy: local(C, -1, 2.5, 9, -5, 1.6, 4),
    },
  },
  'yunethre-centaur': actorScene(() => createCentaur({envoy: true}), 'Yunethre — centaur envoy'),
  'celder-knight': actorScene(() => createCelderKnight({envoy: true}), 'Celder — knight of the court'),
};

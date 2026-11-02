import * as THREE from 'three';
import {createWestLife} from '../western-regions/west-regions-life.js';
import {createCentaurCampPeople} from './centaur-camp-people.js';
import {createLaketownPeople} from './laketown-people.js';
import {createLaketownFishing} from './laketown-fishing.js';
import {YUNETHRE_TOWN as T, YUNETHRE_CAMP as C, YUNETHRE_WILDLIFE_ZONES} from './yunethre-world.js';

const range = (id, species, x, z, sites, traits = {}) => Object.freeze({
  id, species, region: 'Yunethre', radius: .4, scale: 1, keepRegion: true,
  minX: x - 35, maxX: x + 35, minZ: z - 35, maxZ: z + 35,
  sites: Object.freeze(sites.map(([dx, dz]) => Object.freeze([x + dx, z + dz]))), ...traits,
});
// These are resident animals, not production units. Farm output remains owned
// by the campaign economy, never inferred from the number of decorative sheep.
export const YUNETHRE_AMBIENT_ZONES = Object.freeze([
  range('yunethre-laketown-sheep', 'hill-sheep', T.x + 80, T.z + 62, [[-8, -3], [0, 7], [9, 1], [4, -8]], {maxSlope: .65}),
  range('yunethre-grassland-hawk', 'plateau-hawk', C.x + 64, C.z - 40, [[0, 0]], {air: 23, circle: 31, period: 30}),
  range('yunethre-tarn-gulls', 'gull', T.x - 45, T.z + 7, [[0, 0], [6, 4]], {air: 32, circle: 23, period: 24, bob: 1.4}),
]);

export function createYunethreLife(parent, world) {
  let campActive = true;
  const root = new THREE.Group(); root.name = 'Yunethre resident life'; parent.add(root);
  const animals = createWestLife(root, world, {zones: [...YUNETHRE_WILDLIFE_ZONES, ...YUNETHRE_AMBIENT_ZONES]});
  const town = createLaketownPeople(root, world), fishing = createLaketownFishing(root, world);
  const camp = createCentaurCampPeople(root, world);
  return {
    update(time, dt, point) {
      town.update(time, dt, point); fishing.update(time, dt, point); camp.update(time, dt, point);
      animals.update(dt, point, dt > 0);
      if (dt <= 0) animals.setObserver(point);
    },
    setCampActive(value) {campActive = !!value; camp.setActive(campActive);},
    residentTarget: point => town.target(point)??camp.target(point), residentPeople: () => [...town.people(),...camp.people()],
    setResidentTalking: (id, point) => {town.setTalking(id, point);camp.setTalking(id, point);},
    state: () => ({animals: animals.snapshot(), visuals: animals.visualStats(), campResidents: campActive ? camp.state().loaded : 0, camp:camp.state(), town: town.state(), fishing: fishing.state()}),
    dispose() {
      town.dispose(); fishing.dispose(); animals.dispose(); camp.dispose(); root.removeFromParent();
    },
  };
}

import { REGION_CELLS } from './region-world.js';

/** Small authored flocks for regions that had scenery but no ambient animals.
 * Reuse the existing western animal rigs and distance culling. Hex anchors follow
 * the atlas; offsets choose meadow, scrub or shore rather than a town centre.
 */
function habitat(region, id, species, q, r, count, note, options = {}) {
  const cell = REGION_CELLS[region]?.find(cell => cell.q === q && cell.r === r);
  if (!cell) throw new Error(`Missing wildlife hex ${region} ${q},${r}`);
  const { dx = 0, dz = 0, halfX = 80, halfZ = 65, ...traits } = options;
  const x = cell.x + dx, z = cell.z + dz;
  const offsets = [[-10, -6], [8, 5], [0, 15], [15, -13], [-19, 11]];
  return Object.freeze({ id, species, region, radius: species === 'longhorn' ? .8 : species === 'red-deer' ? .55
    : species === 'boar' ? .7 : species === 'hill-sheep' ? .55 : .3, scale: 1, keepRegion: true,
    minX: x - halfX, maxX: x + halfX, minZ: z - halfZ, maxZ: z + halfZ,
    sites: Object.freeze(offsets.slice(0, count).map(([dx, dz]) => Object.freeze([x + dx, z + dz]))), note, ...traits });
}

export const REGIONAL_WILDLIFE_ZONES = Object.freeze([
  habitat('West Suval', 'suval-inland-sheep', 'hill-sheep', 3, 114, 4,
    'A small flock grazes inland from the abandoned Shepherds Fold, away from Solis and the armies.', { dx: 22, dz: -24 }),
  habitat('West Suval', 'suval-downs-hares', 'upland-hare', 4, 115, 3,
    'Hares work the long grass and thorn scrub beside the downland road.', { dx: -34, dz: -24 }),
  habitat('West Suval', 'suval-coast-gulls', 'gull', 4, 118, 3,
    'Gulls rest on the open turf above the white cliffs.', { dx: 10, dz: 4, halfX: 34, halfZ: 30 }),
  habitat('West Suval', 'suval-downs-hawk', 'plateau-hawk', 5, 114, 1,
    'One hawk circles the open downland; the same small raptor rig used on the western uplands.', { air: 28 }),

  habitat('Pueth', 'pueth-birch-deer', 'red-deer', 14, 103, 3,
    'A few hinds browse the southern birch edge.', { dx: -20, dz: 4, hornless: true }),
  habitat('Pueth', 'pueth-valley-hares', 'upland-hare', 13, 101, 3,
    'Hares live in the open valley grass between timber stands.', { dx: -18, dz: -20, halfX: 100, halfZ: 75 }),
  habitat('Pueth', 'pueth-hill-hawk', 'plateau-hawk', 15, 100, 1,
    'A hawk rides the air above the bare northern shoulders.', { air: 30 }),
  habitat('Pueth', 'pueth-wood-boar', 'boar', 15, 102, 2,
    'Two boar root under birch and fir, well away from the goblin camp.', { dx: 30, dz: 25 }),

  habitat('Peblos', 'peblos-cobble-gulls', 'gull', 13, 109, 4,
    'Gulls settle on the salt grass outside Cobble.', { dx: 0, dz: -8, halfX: 36, halfZ: 32 }),
  habitat('Peblos', 'peblos-scarp-waders', 'wading-bird', 15, 109, 2,
    'Wading birds rest along the low island margin at Gull Scarp.', { halfX: 35, halfZ: 30 }),
  habitat('Peblos', 'peblos-gorse-hares', 'upland-hare', 16, 110, 2,
    'A pair of hares shelters in the gorse on the higher eastern island.', { halfX: 35, halfZ: 32 }),
  habitat('Peblos', 'peblos-longstone-gulls', 'gull', 17, 107, 3,
    'Gulls occupy the grass below the old Longstone beacon.', { halfX: 34, halfZ: 30 }),

  habitat('West Izol', 'izol-headland-sheep', 'hill-sheep', 6, 125, 4,
    'A small flock crops the northern headland turf.', { halfX: 40, halfZ: 35 }),
  habitat('West Izol', 'izol-shore-gulls', 'gull', 3, 127, 3,
    'Gulls settle on the open western coastal grass.', { halfX: 40, halfZ: 35 }),
  habitat('West Izol', 'izol-gorse-hares', 'upland-hare', 6, 128, 3,
    'Hares keep to gorse and open turf behind the eastern headlands.', { halfX: 100, halfZ: 75 }),

  habitat('Elagos', 'elagos-wood-deer', 'red-deer', 1, 108, 3,
    'Hinds graze the edge of the lake timber, outside the settlements.', { dx: 28, dz: 5, hornless: true }),
  habitat('Elagos', 'elagos-meadow-cattle', 'longhorn', 4, 107, 4,
    'Small cattle graze the hay meadow on the eastern lake shelf.', { dx: -15, dz: -15, scale: .76 }),
  habitat('Elagos', 'elagos-margin-waders', 'wading-bird', 2, 106, 3,
    'Herons rest on the dry grass above the lake margin.', { dx: -12, dz: -3 }),
  habitat('Elagos', 'elagos-north-hares', 'upland-hare', 5, 102, 3,
    'Hares live along the northern barley and meadow margins.', { dz: 28 }),
  habitat('Elagos', 'elagos-meadow-hawk', 'plateau-hawk', 2, 108, 1,
    'A hawk circles the open lake-country meadows.', { air: 32 }),

  habitat('Amod', 'amod-terrace-sheep', 'hill-sheep', 9, 100, 4,
    'A few sheep graze the grass below the dry-stone terraces.', { dx: -30, dz: 24 }),
  habitat('Amod', 'amod-chestnut-deer', 'red-deer', 7, 99, 2,
    'Hinds browse under chestnut and oak on a lower ridge.', { dx: 12, dz: 8, hornless: true }),
  habitat('Amod', 'amod-orchard-boar', 'boar', 7, 101, 2,
    'Boar root along the wooded orchard margins.', { dx: 20, dz: -8 }),
  habitat('Amod', 'amod-ridge-hawk', 'plateau-hawk', 7, 98, 1,
    'A hawk hunts above the terrace ridges.', { air: 32 }),
]);

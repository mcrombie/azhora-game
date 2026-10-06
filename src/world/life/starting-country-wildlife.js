import { REGION_CELLS } from '../terrain/region-world.js';

// Small resident bands in the previously quiet western woods and open plain.
// Existing road flocks, discovery birds and Drent/Suval homes keep their IDs.
function band(region, id, species, q, r, habitat, note, options = {}) {
  const cell = REGION_CELLS[region].find(cell => cell.q === q && cell.r === r);
  if (!cell) throw new Error('Missing starting-country wildlife cell ' + id);
  const sites = options.air ? [[cell.x, cell.z]] : [[cell.x - 15, cell.z - 9], [cell.x + 14, cell.z + 11]];
  return Object.freeze({ id, species, region, habitat, keepRegion: true,
    radius: species === 'boar' ? .7 : species === 'red-deer' ? .55 : .3,
    scale: species === 'red-deer' ? .9 : 1, hornless: true,
    minX: cell.x - 74, maxX: cell.x + 74, minZ: cell.z - 65, maxZ: cell.z + 65,
    maxSlope: habitat === 'woodland' ? .8 : .45,
    sites: Object.freeze(sites.map(site => Object.freeze(site))), note, ...options });
}

export const STARTING_COUNTRY_WILDLIFE_ZONES = Object.freeze([
  band('Luscia', 'luscia-west-copse-deer', 'red-deer', 2, 110, 'woodland',
    'Two hinds browse the western copses, outside the town and main road.'),
  band('Luscia', 'luscia-north-copse-boar', 'boar', 3, 109, 'woodland',
    'A pair of boar roots in the northwestern woodland edge.'),
  band('Luscia', 'luscia-east-field-hares', 'upland-hare', 8, 110, 'countryside',
    'Two hares shelter in the open eastern grass between the Luscian copses.'),
  band('Moros Plain', 'moros-west-grass-hares', 'upland-hare', -1, 111, 'countryside',
    'A small hare pair uses the western grass well away from the army camp.'),
  band('Moros Plain', 'moros-south-grass-hares', 'upland-hare', -2, 115, 'countryside',
    'A second pair occupies the southwestern plain without adding woodland.'),
  band('Moros Plain', 'moros-west-hawk', 'plateau-hawk', -2, 112, 'countryside',
    'A hawk circles above the western open grass.', { air: 30, circle: 28 }),
]);

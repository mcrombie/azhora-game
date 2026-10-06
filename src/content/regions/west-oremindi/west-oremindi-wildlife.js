/** Persistent wild homes on the actual western Oremindi surface.
 * Snowgoats and mountain eagles are documented in the fauna overview. Deer,
 * boar and hares extend neighbouring woodland species; gulls use the coastal cliffs.
 * These are sparse ambient animals, never domestic stock or human residents.
 */
import { WEST_OREMINDI, WEST_OREMINDI_CELLS, westOremindiCellAt,
  westOremindiFeatures, westOremindiOwns } from './west-oremindi-world.js';

const freeze = Object.freeze, TAU = Math.PI * 2;
export const WEST_OREMINDI_HABITATS = freeze({
  'red-deer': freeze({ radius: .55, minHeight: 6, maxHeight: 270, maxSlope: .75 }),
  boar: freeze({ radius: .7, minHeight: 6, maxHeight: 215, maxSlope: .65 }),
  'upland-hare': freeze({ radius: .3, minHeight: 6, maxHeight: 490, maxSlope: .95 }),
  'oremindi-snowgoat': freeze({ radius: .6, minHeight: 80, maxHeight: 520, maxSlope: 1.55 }),
});

const zone = (cell, species, sites, traits = {}) => freeze({
  id: `west-oremindi-${cell.q}-${cell.r}-${species}`, species, region: WEST_OREMINDI,
  radius: .3, scale: 1, keepRegion: true, habitat: 'mountain',
  sourceCell: freeze([cell.q, cell.r]),
  minX: cell.x - 74, maxX: cell.x + 74, minZ: cell.z - 74, maxZ: cell.z + 74,
  ...WEST_OREMINDI_HABITATS[species],
  sites: freeze(sites.map(p => freeze([p.x, p.z]))), ...traits,
});

// The atlas cells have permanent identities. A fixed spiral finds real shelves
// instead of assuming that a mountain's centre is standable. Sampling is done
// once, not around the player and not on every animation frame.
function candidates(cell) {
  const result = [];
  const count = cell.terrain === 'high_mountain' ? 256 : 112;
  for (let i = 0; i < count; i++) {
    const angle = i * 2.3999632297 + cell.q * .57 + cell.r * .13;
    const radius = 68 * Math.sqrt(i / count);
    const x = cell.x + Math.cos(angle) * radius, z = cell.z + Math.sin(angle) * radius;
    const owner = westOremindiCellAt(x, z);
    if (owner?.q !== cell.q || owner?.r !== cell.r) continue;
    const f = westOremindiFeatures(x, z);
    if (f.water !== null || f.pathDistance < 5 || f.snow > .72) continue;
    result.push({ x, z, ...f });
  }
  return result;
}
function fits(p, species) {
  const h = WEST_OREMINDI_HABITATS[species];
  return p.height >= h.minHeight && p.height <= h.maxHeight && p.grade <= h.maxSlope * .96;
}
const result = [];
const cells = [...WEST_OREMINDI_CELLS].sort((a, b) => a.r - b.r || a.q - b.q);
for (const [index, cell] of cells.entries()) {
  // Hard ice is intentionally thinly inhabited. Nothing is seeded into the
  // artificial low edge where the mountain meets an unfinished neighbour.
  if (cell.climate === 'EF') continue;
  const points = candidates(cell);
  const alpine = cell.terrain === 'high_mountain'
    ? points.filter(p => p.height >= p.treeline - 30 && fits(p, 'upland-hare')).sort((a, b) => a.grade - b.grade)
    : [];
  const preferences = cell.climate === 'ET' ? ['oremindi-snowgoat', 'upland-hare'] : cell.terrain === 'high_mountain'
    ? ['oremindi-snowgoat', 'upland-hare', 'red-deer']
    : index % 4 === 0 ? ['boar', 'red-deer', 'upland-hare', 'oremindi-snowgoat']
      : index % 3 === 0 ? ['upland-hare', 'red-deer', 'boar', 'oremindi-snowgoat']
        : ['red-deer', 'boar', 'upland-hare', 'oremindi-snowgoat'];
  for (const species of preferences) {
    const suitable = points.filter(p => fits(p, species)
      && (species !== 'oremindi-snowgoat' || p.rock > .3)
      && (cell.climate !== 'ET' || p.height > 80));
    // Mountain animals favour the upper usable benches, woodland animals stay
    // near their cell's centre. This leaves the distant ice crowns unstocked.
    suitable.sort((a, b) => cell.terrain === 'high_mountain'
      ? b.height - a.height
      : Math.hypot(a.x - cell.x, a.z - cell.z) - Math.hypot(b.x - cell.x, b.z - cell.z));
    if (!suitable.length) continue;
    const sites = [suitable[0]];
    const companion = suitable.find(p => Math.hypot(p.x - sites[0].x, p.z - sites[0].z) > 9
      && Math.hypot(p.x - sites[0].x, p.z - sites[0].z) < 30);
    // Where a hare also has an upper turf home, leave one goat instead of
    // stacking a whole pair and a hare into every adjacent mountain cell.
    if (companion && (cell.terrain === 'hills' || species === 'oremindi-snowgoat' && !alpine.length)) sites.push(companion);
    result.push(zone(cell, species, sites, { hornless: species === 'red-deer' && index % 2 === 0,
      note: species === 'oremindi-snowgoat' ? 'Wild Oremindi snowgoats on rocky shelves below the ice.'
        : species === 'upland-hare' ? 'Resident hares in short turf and mountain-edge scrub.'
          : 'Neighbouring woodland fauna in the sheltered mountain feet.' }));
    break;
  }
  // Short turf on the scattered upper benches also supports solitary hares.
  // They have their own persistent homes rather than replacing every goat band.
  if (cell.terrain === 'high_mountain' && !result.some(z => z.sourceCell[0] === cell.q
    && z.sourceCell[1] === cell.r && z.species === 'upland-hare')) {
    if (alpine.length) result.push(zone(cell, 'upland-hare', [alpine[0]], { minHeight: alpine[0].treeline - 40,
      note: 'A solitary alpine hare on a patch of short turf between rock ribs.' }));
  }
}

// Three solitary eagles use wholly owned airspace and follow the real surface
// underneath the orbit, so neither the steep faces nor an elevated lake clips a bird.
for (const [q, r] of [[-15, 92], [-13, 90], [-17, 95]]) {
  const cell = cells.find(c => c.q === q && c.r === r);
  if (!cell) continue;
  const circle = 32;
  if (Array.from({ length: 48 }, (_, i) => i / 48 * TAU)
    .some(a => !westOremindiOwns(cell.x + Math.sin(a) * circle, cell.z + Math.cos(a) * circle))) continue;
  result.push(zone(cell, 'oremindi-mountain-eagle', [cell], { air: 42, circle,
    period: 24, follow: true, bob: 2, note: 'A solitary mountain eagle riding the range above its cliffs.' }));
}

for(const [q,r] of [[-16,92],[-15,90],[-17,94]]){
 const cell=cells.find(c=>c.q===q&&c.r===r);if(!cell)continue;
 result.push(zone(cell,'gull',[cell],{air:22,circle:19,period:19,follow:true,bob:1.3,note:'Coastal gulls patrol the sea-facing cliff shoulders.'}));
}
export const WEST_OREMINDI_WILDLIFE_ZONES = freeze(result);

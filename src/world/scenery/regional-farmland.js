/** Authored fields on Feradom's seaward plains and the first dry ground outside Ambron.
 * Coordinates only: no terrain, world, farming-model, or renderer dependency. Fields are
 * anonymous working places, not settlements and not invitations to invent residents. */
const freeze = Object.freeze;
const point = (x, z) => freeze({ x, z });
const local = (farm, x, z) => point(farm.x + x, farm.z + z);
const polygon = (farm, points) => freeze(points.map(([x, z]) => local(farm, x, z)));
const SPECS = [
  ['feradom-west-orchard', 'Western orchard plots', 'Feradom', -800, -1020, 'orchard', 'meadow', 2],
  ['feradom-shore-fields', 'Coastward field plots', 'Feradom', -610, -910, 'grain', 'meadow', 3],
  ['feradom-middle-fields', 'Middle plain plots', 'Feradom', -500, -810, 'grain', 'vegetable', 4],
  ['feradom-road-fields', 'Roadside field plots', 'Feradom', -380, -745, 'grain', 'orchard', 3],
  ['feradom-low-fields', 'Lower plain plots', 'Feradom', -255, -720, 'meadow', 'grain', 3],
  ['feradom-east-fields', 'Eastern field plots', 'Feradom', -100, -655, 'orchard', 'vegetable', 2],
  ['feradom-coast-orchard', 'Coastal orchard plots', 'Feradom', 74, -520, 'orchard', 'meadow', 2],
  ['ambron-west-allotments', 'West of the Plain Gate', 'Elagos', -1215, 235, 'grain', 'vegetable', 4],
  ['ambron-south-allotments', 'Ambron south allotments', 'Elagos', -1098, 232, 'vegetable', 'orchard', 4],
  ['ambron-ossen-fields', 'Ossen-side field plots', 'Elagos', -1035, 224, 'grain', 'meadow', 3],
  ['caricas-north-fields', 'Caricas north fields', 'Caricas', -2105, 159, 'grain', 'vegetable', 3],
  ['caricas-east-orchard', 'Caricas east orchard', 'Caricas', -2015, 300, 'orchard', 'grain', 4],
  ['caricas-lower-fields', 'Caricas lower fields', 'Caricas', -1920, 350, 'grain', 'meadow', 3],
  ['caricas-shelf-gardens', 'Caricas shelf gardens', 'Caricas', -1980, 381, 'vegetable', 'orchard', 4],
  ['caricas-upper-fields', 'Caricas upper fields', 'Caricas', -1890, 192, 'grain', 'vegetable', 3],
];
const cropFor = (kind, variant) => kind === 'grain' ? 'barley' : kind === 'vegetable' ? (variant % 2 ? 'beet' : 'carrot') : null;
export const FARMSTEADS = freeze(SPECS.map(([id, name, region, x, z, main, side, count], index) => {
  const farm = { id, name, region, x, z, yaw: 0, index };
  const shape = index % 3;
  const fields = [
    { id: `${id}-long-field`, kind: main, crop: cropFor(main, index), yaw: -.17 + shape * .16,
      polygon: polygon(farm, [[-18, -16], [-2, -17 + shape], [0, -5], [-3, 3], [-19, 1]]) },
    { id: `${id}-short-field`, kind: side, crop: cropFor(side, index + 1), yaw: .19 - shape * .1,
      polygon: polygon(farm, [[3, -16], [16, -13 - shape], [18, -2], [14, 2], [3, 1]]) },
    { id: `${id}-hay-close`, kind: 'meadow', crop: null, yaw: -.08,
      polygon: polygon(farm, [[-18, 7], [-5, 6], [-4, 16], [-17, 18]]) },
  ].map(freeze);
  // Four equally spaced beds at most. They stay aligned with the existing 2.8 x 3.1 m
  // crop renderer so interaction reach and the visible cultivated soil describe one place.
  const rows = Array.from({ length: count }, (_, n) => freeze({ id: `${id}-row-${n + 1}`,
    name: `${name}, bed ${n + 1}`, farmId: id, region, ...local(farm, 4.5 + (n % 2) * 4.2, 7 + Math.floor(n / 2) * 4.3) }));
  const orchardTrees = fields.filter(f => f.kind === 'orchard').flatMap((field, fieldIndex) => {
    const west = field.id.endsWith('long-field');
    return [[0, 0], [5.6, .5], [.7, 6.2], [6.3, 6.5]].map(([a, b], n) => freeze({
      id: `${id}-orchard-${fieldIndex}-${n}`, ...local(farm, (west ? -15.2 : 6.1) + a, -11 + b), height: 3.7 + ((index + n) % 3) * .3,
    }));
  });
  return freeze({ ...farm, fields: freeze(fields), rows: freeze(rows), orchardTrees: freeze(orchardTrees),
    boundary: polygon(farm, [[-20, -18], [-1, -19], [18, -16], [21, 4], [16, 19], [-18, 20], [-21, 3]]),
    seedStation: freeze({ id: `${id}-seed-station`, farmId: id, name: `${name} seed bench`, region, ...local(farm, 13.3, 11.5) }),
    approach: polygon(farm, [[19, 18], [13, 16], [2, 16], [1, 5], [1, -6], [1, -19]]),
    // An open tool shelter; its door side and seed bench remain clear of the footpath.
    shed: freeze({ ...local(farm, -1, 11), yaw: 0, w: 3.6, d: 4.2, height: 2.5 }),
    hedgeEdges: freeze([0, 1, 5]),
  });
}));
export const REGIONAL_FARM_ROWS = freeze(FARMSTEADS.flatMap(farm => farm.rows));
export const REGIONAL_SEED_STATIONS = freeze(FARMSTEADS.map(farm => farm.seedStation));
// Light, pedestrian access joins the pass floors and existing city approaches.
// The distant coastal orchard instead joins its neighbouring plain farm. These
// are field lanes, not new roads or shortcuts through the defended hill passes.
const lane = (id, port, points) => {
  const farm = FARMSTEADS.find(f => f.id === id);
  return freeze({ id: `${id}-lane`, farmId: id, region: farm.region,
    points: freeze([port === 'north' ? farm.approach.at(-1) : farm.approach[0], ...points.map(([x, z]) => point(x, z))]) });
};
export const FARM_LANES = freeze([
  lane('feradom-west-orchard', 'north', [[-804, -1044], [-811, -1053], [-821, -1061.6]]),
  lane('feradom-shore-fields', 'north', [[-623, -940], [-649, -940], [-672, -942], [-681.2, -945.2]]),
  lane('feradom-middle-fields', 'south', [[-479, -782], [-481.6, -772.1]]),
  lane('feradom-road-fields', 'south', [[-365, -720], [-389, -722], [-408, -726], [-412, -733.9]]),
  lane('feradom-low-fields', 'south', [[-216, -701], [-184, -690], [-161, -683], [-144, -679]]),
  lane('feradom-east-fields', 'north', [[-108, -680], [-127, -678], [-147, -665]]),
  lane('feradom-coast-orchard', 'north', [[68, -552], [46, -566], [14, -580], [-17, -600], [-49, -617], [-81, -637]]),
  lane('ambron-west-allotments', 'south', [[-1190, 252], [-1184, 246], [-1182.65, 238.5]]),
  lane('ambron-south-allotments', 'south', [[-1087, 259], [-1112, 259], [-1147, 252], [-1173, 244], [-1183, 239]]),
  lane('ambron-ossen-fields', 'north', [[-1027, 199], [-1014, 196], [-1002.5, 191.5]]),
  lane('caricas-north-fields', 'south', [[-2129, 194]]),
  lane('caricas-east-orchard', 'north', [[-2014, 262.05]]),
  lane('caricas-lower-fields', 'north', [[-1924, 324], [-1950, 315]]),
  lane('caricas-shelf-gardens', 'north', [[-1980, 349]]),
  lane('caricas-upper-fields', 'south', [[-1910, 220]]),
]);
/** Compact obstacles accepted by the existing resident-wildlife range controller. */
export const FARMLAND_WILDLIFE_EXCLUSIONS = freeze(FARMSTEADS.flatMap(farm => [
  ...farm.rows.map(row => freeze({ minX: row.x - 1.8, maxX: row.x + 1.8, minZ: row.z - 2, maxZ: row.z + 2 })),
  freeze({ minX: farm.shed.x - farm.shed.w / 2 - .4, maxX: farm.shed.x + farm.shed.w / 2 + .4,
    minZ: farm.shed.z - farm.shed.d / 2 - .4, maxZ: farm.shed.z + farm.shed.d / 2 + .4 }),
]));

export function inFarmPolygon(points, x, z) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i], b = points[j];
    if ((a.z > z) !== (b.z > z) && x < (b.x - a.x) * (z - a.z) / (b.z - a.z) + a.x) inside = !inside;
  }
  return inside;
}
function edgeDistance(points, x, z) {
  let distance = Infinity;
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length], dx = b.x - a.x, dz = b.z - a.z;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1)));
    distance = Math.min(distance, Math.hypot(x - a.x - t * dx, z - a.z - t * dz));
  }
  return distance;
}
/** Suppress incidental forest/rocks before their generation; never move an authored road. */
export function regionalFarmlandClear(x, z, margin = 0) {
  return FARMSTEADS.some(farm => Math.abs(x - farm.x) < 24 + margin && Math.abs(z - farm.z) < 24 + margin
    && (inFarmPolygon(farm.boundary, x, z) || (margin > 0 && edgeDistance(farm.boundary, x, z) < margin)))
    || FARM_LANES.some(lane => lane.points.slice(1).some((b, i) => {
      const a = lane.points[i];
      if (x < Math.min(a.x, b.x) - 1.7 - margin || x > Math.max(a.x, b.x) + 1.7 + margin
        || z < Math.min(a.z, b.z) - 1.7 - margin || z > Math.max(a.z, b.z) + 1.7 + margin) return false;
      return edgeDistance([a, b], x, z) < 1.7 + margin;
    }));
}
/** Wildlife may visit meadow margins, but its home must not occupy tilled soil or the shelter. */
export function regionalFarmlandWorked(x, z, margin = 0) {
  return FARMSTEADS.some(farm => Math.abs(x - farm.x) < 24 + margin && Math.abs(z - farm.z) < 24 + margin && (
    farm.fields.some(f => ['grain', 'vegetable'].includes(f.kind) && (inFarmPolygon(f.polygon, x, z) || edgeDistance(f.polygon, x, z) < margin))
    || farm.rows.some(row => Math.abs(x - row.x) < 1.6 + margin && Math.abs(z - row.z) < 1.75 + margin)
    || (Math.abs(x - farm.shed.x) < farm.shed.w / 2 + margin && Math.abs(z - farm.shed.z) < farm.shed.d / 2 + margin)));
}

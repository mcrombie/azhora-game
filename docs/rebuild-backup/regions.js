// Local districts of Drent and the Luscia border. These are playable slices of the
// canonical world-builder map, not substitutes for Azhora's distant countries.
export const regions = [
  { id: 2, name: 'Sunmeadow Plain', subtitle: 'The Avrel clearings of Drent', minZ: -330, maxZ: -162,
    description: 'Farm clearings in Drent’s forested upland, beyond Eastreena’s trees.', palette: { ground: '#a8ab77', accent: '#dfc77d', fog: '#bdc9b5' },
    spawn: { x: 0, z: -178 }, npcIds: ['meadow-courier', 'commons-miller'], landmarks: ['sunmeadow', 'fallen-cart', 'old-mill', 'mill-commons'] },
  { id: 3, name: 'Reedwater Crossing', subtitle: 'The Caloss, Drent’s southwestern edge', minZ: -500, maxZ: -330,
    description: 'The Caloss river hollow, timber footways, and the reedcutters’ camp. Luscia begins on the far bank.', palette: { ground: '#6d8871', accent: '#b9d1af', fog: '#a7c3bd' },
    spawn: { x: 0, z: -342 }, npcIds: ['crossing-keeper', 'reed-worker'], landmarks: ['reedwater', 'reed-bridge', 'reedwater-bank', 'river-camp', 'landing-workshop'] },
  { id: 4, name: 'Threefold Rise', subtitle: 'The Luscian Hills', minZ: -680, maxZ: -500,
    description: 'The first rolling hills of Luscia, and reflective waymarkers on the road southwest.', palette: { ground: '#9b9d83', accent: '#e1d1a7', fog: '#bbc6bf' },
    spawn: { x: 0, z: -516 }, npcIds: ['ridge-keeper', 'relay-clerk', 'shelter-keeper'], landmarks: ['threefold', 'old-waystation', 'beacon-ridge', 'north-relay', 'waystation-shelter'] },
];

export const regionNpcPositions = {
  'meadow-courier': { x: -7, z: -190 },
  'crossing-keeper': { x: -9, z: -352 },
  'ridge-keeper': { x: 8, z: -528 },
  'relay-clerk': { x: -5, z: -657 },
};

export const journeySites = {
  'cart-parcel-1': { id: 'cart-parcel-1', x: 15, z: -218, name: 'Cloth parcel', type: 'parcel', region: 2 },
  'cart-parcel-2': { id: 'cart-parcel-2', x: 21, z: -229, name: 'Provision parcel', type: 'parcel', region: 2 },
  'cart-parcel-3': { id: 'cart-parcel-3', x: 8, z: -244, name: 'Wax-sealed parcel', type: 'parcel', region: 2 },
  'bridge-repair': { id: 'bridge-repair', x: 0, z: -400, name: 'Reedwater bridge', type: 'bridge', region: 3 },
  'beacon-west': { id: 'beacon-west', x: -16, z: -556, name: 'First waymarker', type: 'beacon', region: 4 },
  'beacon-east': { id: 'beacon-east', x: 15, z: -590, name: 'Second waymarker', type: 'beacon', region: 4 },
  'beacon-north': { id: 'beacon-north', x: -6, z: -621, name: 'Third waymarker', type: 'beacon', region: 4 },
  'bridge-debris-1': { id: 'bridge-debris-1', x: -8, z: -383, name: 'Dry driftwood', type: 'sticks', quantity: 2, region: 3 },
  'bridge-debris-2': { id: 'bridge-debris-2', x: 8, z: -389, name: 'Fallen branches', type: 'sticks', quantity: 2, region: 3 },
  'meadow-fruit': { id: 'meadow-fruit', x: -5, z: -260, name: 'Pawpaw windfalls', type: 'fruit', quantity: 2, region: 2 },
  'river-fruit': { id: 'river-fruit', x: 8, z: -462, name: 'Riverside pawpaws', type: 'fruit', quantity: 2, region: 3 },
  'ridge-fruit': { id: 'ridge-fruit', x: -10, z: -605, name: 'Sheltered pawpaws', type: 'fruit', quantity: 2, region: 4 },
  'meadow-sticks': { id: 'meadow-sticks', x: 8, z: -299, name: 'Dry branches', type: 'sticks', quantity: 2, region: 2 },
  'ridge-sticks': { id: 'ridge-sticks', x: 10, z: -547, name: 'Wind-fallen branches', type: 'sticks', quantity: 2, region: 4 },
};

export const regionRepairBenches = [
  { id: 'meadow-repair', x: 3, z: -191, name: 'Sunmeadow repair bench' },
  { id: 'crossing-repair', x: -3, z: -350, name: 'Reedwater repair bench' },
  { id: 'ridge-repair', x: 14, z: -523, name: 'Threefold repair bench' },
];

export const regionFirePits = [
  { id: 'meadow-fire', x: -10, z: -198, fireX: -11.5, fireZ: -198 },
  { id: 'crossing-fire', x: -13, z: -358, fireX: -14.5, fireZ: -358 },
  { id: 'ridge-fire', x: 11, z: -534, fireX: 12.5, fireZ: -534 },
];

export const northernRoad = [
  { x: 0, z: -162 }, { x: 0, z: -184 }, { x: -4, z: -198 },
  { x: 6, z: -218 }, { x: 4, z: -249 }, { x: -10, z: -281 },
  { x: 0, z: -314 }, { x: 0, z: -340 }, { x: -2, z: -355 },
  { x: 0, z: -382 }, { x: 0, z: -400 }, { x: 0, z: -423 },
  { x: -4, z: -450 }, { x: 0, z: -482 }, { x: 0, z: -514 },
  { x: 4, z: -530 }, { x: -3, z: -552 }, { x: 4, z: -583 },
  { x: 0, z: -612 }, { x: 0, z: -642 }, { x: 0, z: -673 },
];

export const regionLandmarks = [
  { id: 'sunmeadow', name: 'Sunmeadow Plain', x: 0, z: -183, description: 'A broad sky, golden fields, and the first farms beyond the forest.' },
  { id: 'fallen-cart', name: 'The Tumbled Cart', x: 16, z: -226, description: 'A courier’s wheel gave way on the farm track. Scattered parcels lie nearby.' },
  { id: 'old-mill', name: 'Sunmeadow Windmill', x: -19, z: -281, description: 'Slow canvas sails turn over low fields and a stone-lined well.' },
  { id: 'reedwater', name: 'Reedwater Crossing', x: 0, z: -347, description: 'A sheltered river hollow, full of reeds and the sound of running water.' },
  { id: 'reed-bridge', name: 'Reedwater Bridge', x: 0, z: -405, description: 'An old timber bridge crosses the water. Its sound eastern walkway remains passable.' },
  { id: 'reedwater-bank', name: 'The Quiet Bank', x: 16, z: -398, description: 'A rod rest and a low stool mark a sheltered place to fish the slow water.' },
  { id: 'river-camp', name: 'The Reedcutters’ Camp', x: -9, z: -451, description: 'Drying reeds, tied boats, and a small raised shelter stand above the riverbank.' },
  { id: 'threefold', name: 'Threefold Rise', x: 0, z: -519, description: 'Open stone country rises gently toward three old road beacons.' },
  { id: 'old-waystation', name: 'The Roofless Waystation', x: -27, z: -577, description: 'A leaning stone arch and a few paving slabs outlast a forgotten roadside shelter.' },
  { id: 'beacon-ridge', name: 'The Three Waymarkers', x: 0, z: -588, description: 'Three reflective road stones once guided every traveler on this stretch of the road.' },
  { id: 'north-relay', name: 'North Relay', x: 0, z: -659, description: 'The relay clerk receives reports before the road turns southwest toward the Lauvel and the Moros.' },
];

const eastreena = { id: 1, name: 'Eastreena', subtitle: 'The landing on the Stills', minZ: -162, maxZ: 48, spawn: { x: 0, z: 43 } };
export function regionAt(x, z) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
  return regions.find(region => z <= region.maxZ && z > region.minZ) || (z > -162 ? eastreena : regions[2]);
}

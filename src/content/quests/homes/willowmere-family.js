import { villageToWorld } from '../../../world/terrain/region-world.js';

const pond = villageToWorld(27, -77), ryan = villageToWorld(20.4, -73.5), barrett = villageToWorld(16.5, -79);
export const RYAN = Object.freeze({ id: 'willowmere-ryan', name: 'Ryan', role: 'Fishing at Willowmere',
  modelRole: 'pond-fisher', color: 0x668274, skin: 0xc6a17b, x: ryan.x, z: ryan.z,
  yaw: Math.atan2(pond.x - ryan.x, pond.z - ryan.z), fishing: true,
  look: Object.freeze({ hair: 0x64452e, hairStyle: 'short-cropped', beard: false, hat: false, staff: false, cloak: false }) });
export const BARRETT = Object.freeze({ id: 'willowmere-barrett', name: 'Barrett', role: "Jess and Ryan's son · A head full of maps",
  modelRole: 'villager', scale: .68, color: 0xb29b58, skin: 0xc6a17b, x: barrett.x, z: barrett.z, yaw: -.9,
  look: Object.freeze({ hair: 0x68482f, hairStyle: 'short-cropped', child: true, beard: false, hat: false, staff: false, cloak: false }) });
export const WILLOWMERE_FAMILY = Object.freeze([RYAN, BARRETT]);

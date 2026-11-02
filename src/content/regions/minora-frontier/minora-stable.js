// Scenario staging only. The tutorial's family and quest placements stay intact.
import {BARRETT} from '../../quests/homes/willowmere-family.js';

export const MINORA_STABLE = Object.freeze({
  bear: Object.freeze({x:-2419,z:65}),
  horse: Object.freeze({x:-2422,z:65,yaw:0}),
  look: BARRETT.look, scale: BARRETT.scale, skin: BARRETT.skin, tunic: BARRETT.color,
});
export const BEAR_RIDING_LESSON = Object.freeze([
  ['A horse for the road', 'I am Bear—Taleth asked me to give you this horse: G mounts or dismounts, WASD rides, Shift canters, Space jumps, and H summons him beside you in blue light. Stand on an open, dry path when you call.'],
]);
export const BEAR_RIDING_REMINDER=Object.freeze(['Your horse is yours', 'G mounts or dismounts, WASD rides, Shift canters, Space jumps, and H summons your horse beside you in blue light. You need a clear, dry place for him to appear.']);

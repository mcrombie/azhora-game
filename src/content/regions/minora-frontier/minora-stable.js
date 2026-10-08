// Scenario staging only. The tutorial's family and quest placements stay intact.
import {BARRETT} from '../../quests/homes/willowmere-family.js';

export const MINORA_STABLE = Object.freeze({
  bear: Object.freeze({x:-2419,z:65}),
  horse: Object.freeze({x:-2422,z:65,yaw:0}),
  look: BARRETT.look, scale: BARRETT.scale, skin: BARRETT.skin, tunic: BARRETT.color,
});
export const BEAR_RIDING_LESSON = Object.freeze([
  ['A horse for the road', 'I am Bear. Taleth asked me to have this horse ready for you. Minora is neutral; taking the reins does not put you in either army.'],
  ['Into the saddle', 'Stand beside the horse and press G to mount. Use WASD or the arrow keys to ride, and hold Shift to canter. Right-drag to look around. He can wade and swim across rivers, though swimming is slower. Ride onto a clear bank before pressing G to dismount.'],
  ['He will wait for you', 'Your horse stays where you leave him. Press H to whistle him over when you are outside. Dismount before entering the tower. You can ride into a battlefield; accepting a fight dismounts you safely. The green ring on your minimap marks your horse. Choose Track the nearby army for a distant marker that follows the force toward Caricas. The first clash is expected on day 3. Pick your own route. When battle begins, the marker follows it to the battlefield; M opens the campaign map.'],
]);

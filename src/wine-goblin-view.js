import * as THREE from 'three';
import { createGoblin } from './characters.js';
import { createPuffs } from './chameleon-model.js';

/**
 * Puck in the world: the game's own goblin rig with `wine` set (src/characters.js) - a head
 * shorter than a bramble goblin, in dark glasses, with a long clay pipe in the corner of his mouth
 * and somebody else's bottle in his off hand - put at one of his haunts in Solis, and the purple
 * puff he leaves behind when somebody comes at him (src/wine-goblin.js).
 *
 * He used to be a chameleon and the body used to be `createEdModel`. The body went with Ed
 * (src/chameleon.js); the puff was the one thing worth keeping twice, so `createPuffs` is shared.
 */
export function createPuckView(scene, { heightAt }) {
  const goblin = createGoblin({ wine: true });
  goblin.group.name = 'Puck';
  scene.add(goblin.group);
  const puffs = createPuffs(scene);

  /** Put him at a haunt: `lift` raises him onto a perch (the ridge of Tharganhom's roof). */
  function place(haunt, lift = 0) {
    goblin.group.position.set(haunt.x, heightAt(haunt.x, haunt.z) + lift, haunt.z);
    goblin.group.rotation.y = haunt.yaw ?? 0;
  }

  /**
   * Drunk he sways on the spot and hiccups; sober he stands very still. The goblin rig animates
   * from a pace, so a pace of nothing is a man standing there, which is what he does.
   */
  function update(time, dt, { sober = false } = {}) {
    goblin.animate(time, dt, { pace: 0, moving: false });
    // The sway and the hiccup, which the rig has no idea about: a little lean, and now and then a jolt.
    const sway = sober ? 0 : Math.sin(time * 1.35) * .055 + Math.sin(time * 2.7) * .02;
    const hiccup = sober ? 0 : Math.max(0, Math.sin(time * .83) - .985) * 9;
    goblin.group.rotation.z = sway;
    goblin.group.position.y = goblin.group.userData.groundY ?? goblin.group.position.y;
    if (goblin.group.userData.groundY !== undefined) goblin.group.position.y += hiccup * .06;
    puffs.update(dt);
  }

  const originalPlace = place;
  const placeAndRemember = (haunt, lift = 0) => {
    originalPlace(haunt, lift);
    goblin.group.userData.groundY = goblin.group.position.y;
  };

  return { group: goblin.group, place: placeAndRemember, puff: (at = goblin.group.position) => puffs.puff(at),
    update, get puffing() { return puffs.puffing; } };
}

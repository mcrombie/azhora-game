import { createGoblin } from './characters.js';

/** Distant lookouts; the host hands them to combat when they spot an intruder. */
export function createForestHideoutWatch(scene, world, encounter) {
  const guards = encounter.enemies.map((home, index) => {
    const actor = createGoblin({ variant: index });
    actor.group.name = `Bramble camp lookout ${index + 1}`;
    actor.group.position.set(home.x, world.heightAt(home.x, home.z), home.z);
    // Each lookout faces the approach, a little off true so the pair does not stare in step.
    actor.group.rotation.y = Math.atan2(encounter.checkpoint.x - home.x, encounter.checkpoint.z - home.z) + (index ? .45 : -.35);
    scene.add(actor.group);
    return { actor, home, phase: index * 2.3 };
  });
  let clock = 0;
  function update(dt, position, { cleared = false, active = false, playing = false } = {}) {
    if (playing && !cleared && !active) clock += dt;
    const close = Math.hypot(position.x - encounter.center.x, position.z - encounter.center.z) < 85;
    for (const guard of guards) {
      guard.actor.group.visible = !cleared && !active && close;
      if (!guard.actor.group.visible) continue;
      guard.actor.animate(clock + guard.phase, 0, true, { action: 'idle', progress: 0, armed: true, alert: false });
    }
  }
  return { update, state: () => ({ visible: guards.filter(g => g.actor.group.visible).length, clock }) };
}

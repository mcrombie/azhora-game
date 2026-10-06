import * as THREE from 'three';

/** The teacher's own float and line; the player's fishing tackle remains separate. */
export function createFishingLessonVisual(scene) {
  const group = new THREE.Group(); group.name = 'Fishing demonstration'; group.visible = false; scene.add(group);
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
  const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0xddd5b6 })); group.add(line);
  const float = new THREE.Mesh(new THREE.SphereGeometry(.09, 6, 4), new THREE.MeshStandardMaterial({ color: 0xc76138, roughness: .9 })); group.add(float);
  return { update({ actor, spot, progress = 0, visible = false } = {}) {
    const tip = visible && actor?.fishingTip?.(); group.visible = !!tip && !!spot;
    if (!group.visible) return;
    const to = spot.castPoint, dipped = progress > .7;
    float.position.set(to.x, to.y + .09 + (dipped ? -.07 : Math.sin(progress * 12) * .015), to.z);
    geometry.attributes.position.setXYZ(0, tip.x, tip.y, tip.z);
    geometry.attributes.position.setXYZ(1, float.position.x, float.position.y, float.position.z);
    geometry.attributes.position.needsUpdate = true; geometry.computeBoundingSphere();
  }, dispose() { geometry.dispose(); line.material.dispose(); float.geometry.dispose(); float.material.dispose(); group.removeFromParent(); } };
}

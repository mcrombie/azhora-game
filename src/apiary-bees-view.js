import * as THREE from 'three';
import { createMagicView } from './magic-view.js';

/** Shares the striped bee bodies and fluttering wings with Summon Bees. */
export function createApiaryBeesView({ scene, bees }) {
  const group = new THREE.Group(); group.name = 'Liz’s defensive bees'; scene.add(group);
  const spells = createMagicView({ scene: group, magic: bees });
  const geometry = new THREE.TorusGeometry(.7, .018, 5, 32), material = new THREE.MeshBasicMaterial({ color: 0xffce6e, transparent: true, opacity: .7, depthWrite: false });
  const warning = new THREE.Mesh(geometry, material); warning.name = 'Liz gathering ten swarms'; warning.rotation.x = Math.PI / 2; warning.visible = false; group.add(warning);
  return { group,
    update(dt = 0) {
      spells.update(dt); const tell = bees.view().tell; warning.visible = !!tell;
      if (tell) { warning.position.set(tell.x, tell.y + .18 + tell.progress * .7, tell.z); warning.scale.setScalar(1 + tell.progress * .9); material.opacity = .5 + tell.progress * .4; }
    },
    dispose() { spells.dispose(); geometry.dispose(); material.dispose(); group.removeFromParent(); }
  };
}

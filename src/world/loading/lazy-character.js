import * as THREE from 'three';
import { createCharacter } from '../../content/characters/characters.js';

/**
 * A named human's position and presence exist before its detailed rig does.
 * Use this only for createCharacter options; custom makers and animal rigs have
 * their own properties and construction contracts.
 *
 * Object3D traversal and name lookup stay ordinary, read-only operations. A
 * caller needing a hand/head attachment must call ensureModel() explicitly.
 * Setters are commands while unloaded and return undefined; ensureModel() first
 * when the caller needs the underlying setter's synchronous success result.
 */
export function createLazyCharacter(options = {}, { onMaterialize } = {}) {
  const group = new THREE.Group(), pending = [];
  const blankSlate = options.look?.blankSlate === true;
  group.name = blankSlate ? 'character-blank-slate' : `character-${options.role ?? 'traveler'}`;
  if (blankSlate) group.userData.blankSlate = true;
  // createCharacter's only authored root scale. Set it now so a host's later
  // scale override has exactly the same effect before and after materializing.
  if (!blankSlate && options.look?.discoHead) group.scale.setScalar(.88);
  let model = null, lastHand = null, lastShield = null;

  function ensureModel() {
    if (model) return actor;
    const created = createCharacter(options);
    // The character animator owns the joints, not the temporary factory root.
    // Move those joints to the permanent logical root, preserving external
    // children such as stand-ins and all position/rotation/scale references.
    for (const child of [...created.group.children]) group.add(child);
    Object.assign(group.userData, created.group.userData);
    created.group = group;
    model = created;
    for (const { method, value } of pending) model[method](value);
    pending.length = 0; lastHand = lastShield = null;
    onMaterialize?.(actor);
    return actor;
  }

  function set(method, value) {
    if (model) return model[method](value);
    // Shields do not change the held weapon. The other three setters do:
    // retain their order, including rejected weapon changes. Ignore repeated
    // identical commands so an offscreen teacher's idle pose cannot grow a
    // queue every frame, even when it alternates weapon and shield commands.
    const previous = method === 'setShield' ? lastShield : lastHand;
    if (previous?.method === method && Object.is(previous.value, value)) return;
    const command = { method, value };
    pending.push(command);
    if (method === 'setShield') lastShield = command; else lastHand = command;
    // Unusual restored task combinations can keep alternating hand setters
    // while a person is offscreen. Bound that history without dropping an
    // operation: build this one rig and replay it, then use its live setters.
    if (pending.length >= 32) ensureModel();
  }

  const actor = {
    group,
    get materialized() { return model !== null; },
    ensureModel,
    animate(...args) {
      if (!group.visible) return;
      ensureModel();
      return model.animate(...args);
    },
    setArmed: value => set('setArmed', value),
    setShield: value => set('setShield', value),
    setWeapon: value => set('setWeapon', value),
    setFishing: value => set('setFishing', value),
    // Asking for an actual rendered endpoint is an explicit need for geometry,
    // even if a transition temporarily hides the logical actor root.
    fishingTip() { ensureModel(); return model.fishingTip(); },
    focusTip() { ensureModel(); return model.focusTip(); },
  };
  return actor;
}

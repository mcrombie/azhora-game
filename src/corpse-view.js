import * as THREE from 'three';
import { createCharacter, createGoblin, createWolf, createCat, createHorse, createOgre, createRockTroll, groundShadow, setShadowCasting } from './characters.js';
import { createEdModel } from './chameleon-model.js';
import { createBosco } from './bosco-model.js';
import { createBatman } from './batman-model.js';
import { createSpider } from './spider-model.js';
import { createKaylaBear, createBearCub } from './kayla-character.js';

const isBearCub = body => body.model?.cub === true || body.model?.role === 'bear-cub'
  || body.npcId === 'kayla-cub' || body.sourceId === 'kayla-cub';

function wrappedActor(actor) {
  const group = new THREE.Group(); group.name = 'Resting figure'; group.add(actor.group);
  return { ...actor, group };
}

/** Custom creatures have living-only animators. Freeze their own model on its
 * side and ground the visible shape; the wrapper preserves native scale. */
function restingActor(actor, scale = 1) {
  actor.group.scale.multiplyScalar(scale);
  actor.group.rotation.z = Math.PI * .49;
  actor.group.updateMatrixWorld(true);
  const bounds = new THREE.Box3();
  actor.group.traverseVisible(object => {
    if (!object.isMesh) return;
    object.geometry.computeBoundingBox();
    bounds.union(object.geometry.boundingBox.clone().applyMatrix4(object.matrixWorld));
  });
  if (!bounds.isEmpty()) actor.group.position.y -= bounds.min.y;
  return { ...wrappedActor(actor), animate() {} };
}

// A borrowed world actor arrives with a world position and heading. Reset those
// before the shared side-laying wrapper measures local bounds, and keep the
// ground shadow horizontal. Mutate the actor handle so ownership stays singular.
function restingBear(actor = createKaylaBear()) {
  if (actor.group.userData.restingBear) return actor;
  restoreFallenFigure(actor);
  const shadows = [];
  actor.group.traverse(object => { if (object.userData.groundShadow) shadows.push(object); });
  for (const shadow of shadows) shadow.removeFromParent();
  actor.group.removeFromParent(); actor.group.position.set(0, 0, 0); actor.group.rotation.set(0, 0, 0);
  const resting = restingActor(actor);
  resting.group.userData.restingBear = true;
  for (const shadow of shadows) resting.group.add(shadow);
  return Object.assign(actor, resting);
}

function burialCloth() {
  const positions = [], indices = [], lengths = [-.5, -.3, 0, .3, .5];
  for (let x = 0; x < lengths.length; x++) for (let z = 0; z < 3; z++) {
    const end = x === 0 || x === lengths.length - 1;
    positions.push(lengths[x], z === 1 ? end ? .03 : x === 2 ? 1 : .72 : 0, (z - 1) * (end ? .38 : .5));
  }
  for (let x = 0; x < 4; x++) for (let z = 0; z < 2; z++) {
    const a = x * 3 + z, b = a + 3; indices.push(a, a + 1, b, b, a + 1, b + 1);
  }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0x9a9584, roughness: 1, flatShading: true, side: THREE.DoubleSide, transparent: true }));
}

function coverBody(item, world) {
  const { actor, cover, figureMeshes } = item;
  actor.group.updateMatrixWorld(true);
  const inverse = actor.group.matrixWorld.clone().invert(), relative = new THREE.Matrix4(), bounds = new THREE.Box3();
  for (const object of figureMeshes) {
    let shown = true; for (let node = object; node && node !== actor.group; node = node.parent) if (!node.visible) { shown = false; break; }
    if (!shown) continue;
    object.geometry.computeBoundingBox(); relative.multiplyMatrices(inverse, object.matrixWorld);
    bounds.union(object.geometry.boundingBox.clone().applyMatrix4(relative));
  }
  if (bounds.isEmpty()) return;
  const center = bounds.getCenter(new THREE.Vector3()), size = bounds.getSize(new THREE.Vector3());
  // Local bounds follow the settled pose, including its sideways displacement
  // from the actor origin. The cloth has a low ridge and tapered loose ends.
  cover.position.set(center.x, Math.max(.015, bounds.min.y + .015), center.z);
  cover.rotation.y = size.z > size.x ? Math.PI / 2 : 0;
  cover.scale.set(Math.max(size.x, size.z) + .18, Math.max(.18, Math.min(.48, size.y * .55)), Math.min(size.x, size.z) + .2);
  // The fallen pose can extend up a slope from its original feet. Drape the
  // cloth over terrain at each corner instead of burying half of it in that slope.
  cover.updateWorldMatrix(true, false);
  const vertices = cover.geometry.attributes.position, point = new THREE.Vector3();
  for (let i = 0; i < vertices.count; i++) {
    const ridge = vertices.getY(i) * cover.scale.y;
    point.fromBufferAttribute(vertices, i).applyMatrix4(cover.matrixWorld);
    point.y = world.heightAt(point.x, point.z) + .025 + ridge;
    cover.worldToLocal(point); vertices.setXYZ(i, point.x, point.y, point.z);
  }
  vertices.needsUpdate = true; cover.geometry.computeVertexNormals(); cover.geometry.computeBoundingSphere();
  actor.group.traverse(object => {
    if (!object.userData.groundShadow) return;
    object.position.set(center.x, .012, center.z); object.scale.set((size.x + .12) / .84, (size.z + .12) / .84, 1);
  });
  for (const object of figureMeshes) object.visible = false;
  item.covered = true;
}

export function createCorpseActor(body) {
  if (body.kind === 'bear') return restingBear(isBearCub(body) ? createBearCub() : createKaylaBear());
  if (body.kind === 'puck') return wrappedActor(createGoblin({ wine: true }));
  if (body.kind === 'chameleon') { const actor = createEdModel(); actor.animate(0, 0, { sober: true }); return restingActor(actor, 1.35); }
  if (body.kind === 'bosco') return restingActor(createBosco({ dye: body.model.dye }));
  if (body.kind === 'batman') return restingActor(createBatman());
  if (body.kind === 'horse') return restingActor(createHorse({ variant: body.model.variant ?? body.variant, saddled: !!body.model.saddled, coat: body.model.coat ?? null }));
  if (body.kind === 'wolf' || body.kind === 'dog') return createWolf({ variant: body.variant, dog: body.kind === 'dog' });
  if (body.kind === 'goblin') return createGoblin({ variant: body.variant });
  if (body.kind === 'ogre') return createOgre();
  if (body.kind === 'troll') return createRockTroll();
  if (body.kind === 'spider') return createSpider();
  if (body.kind === 'cat') return restingActor(createCat({ variant: body.variant }));
  return createCharacter(body.model);
}

function restoreFallenFigure(actor) {
  const standIns = [];
  actor.group.traverse(object => {
    // Living distance LOD hides the articulated rig. Its separate upright
    // silhouette cannot take the death pose, or be used to fit a burial cloth.
    if (object.name === 'figure-stand-in') { standIns.push(object); return; }
    if (typeof object.userData.shownInFull === 'boolean') {
      object.visible = object.userData.shownInFull;
      delete object.userData.shownInFull;
    }
  });
  // Stand-ins share cached geometry/materials with living people: detach only.
  for (const standIn of standIns) standIn.removeFromParent();
}

/** Takes ownership of a fallen actor, or reconstructs its saved appearance. */
export function createCorpseView(scene, world) {
  const actors = new Map(), weather = new THREE.Color(0x847b65);
  function adopt(body, supplied = null) {
    if (!body || body.removed) { if (supplied) supplied.group.removeFromParent(); return false; }
    const previous = actors.get(body.id);
    if (previous && supplied && previous.actor !== supplied) release(body.id);
    else if (previous) return true;
    const actor = supplied ? body.kind === 'bear' ? restingBear(supplied) : supplied : createCorpseActor(body);
    restoreFallenFigure(actor);
    actor.group.scale.setScalar(1); actor.group.visible = true;
    actor.group.name = `corpse:${body.id}`;
    scene.add(actor.group); setShadowCasting(actor, false);
    if (!supplied) actor.group.add(groundShadow(body.kind === 'ogre' ? 1.4 : body.kind === 'bear' && !isBearCub(body) ? .8 : .45));
    // Character meshes share materials. Weathering one body must never fade a living NPC.
    const materials = [], figureMeshes = [];
    actor.group.traverse(object => {
      if (!object.isMesh) return;
      if (!object.userData.groundShadow) figureMeshes.push(object);
      const copy = material => { const m = material.clone(); materials.push({ material: m, color: m.color?.clone(), opacity: m.opacity, transparent: m.transparent }); return m; };
      object.material = Array.isArray(object.material) ? object.material.map(copy) : copy(object.material);
    });
    const cover = burialCloth();
    cover.name = 'Watch burial cloth'; cover.visible = false; actor.group.add(cover);
    const item = { actor, materials, cover, figureMeshes, covered: false, frames: 0, settled: !supplied || body.age > 2 }; actors.set(body.id, item);
    // A reload starts with a settled pose, not a standing person who falls again.
    if (!supplied || body.age > 2) for (let i = 0; i < 45; i++) actor.animate(i / 30, 0, true, { action: 'dead', progress: 1, armed: body.model.armed !== false });
    return true;
  }
  function release(id) {
    const item = actors.get(id); if (!item) return;
    item.actor.group.removeFromParent();
    for (const { material } of item.materials) material.dispose();
    item.cover.geometry.dispose(); item.cover.material.dispose(); actors.delete(id);
    // Character geometries belong to shared primitive/batching caches; do not dispose those.
  }
  function update(bodies, time = 0) {
    const present = new Set(bodies.map(body => body.id));
    for (const id of actors.keys()) if (!present.has(id)) release(id);
    for (const body of bodies) {
      if (!actors.has(body.id)) adopt(body);
      const item = actors.get(body.id); if (!item) continue;
      const { actor, cover } = item;
      actor.group.position.set(body.x, world.heightAt(body.x, body.z), body.z); actor.group.rotation.y = body.yaw;
      actor.group.visible = body.opacity > 0;
      if (!item.covered && item.frames++ < 60) actor.animate(time, 0, true, { action: 'dead', progress: item.settled ? 1 : Math.min(1, body.age / .55), armed: body.model.armed !== false });
      if (body.phase === 'covered' && !item.covered) coverBody(item, world);
      const tint = body.phase === 'remains' ? .75 : body.phase === 'weathered' ? .4 : 0;
      for (const original of item.materials) {
        const material = original.material;
        if (original.color) material.color.copy(original.color).lerp(weather, tint);
        const transparent = original.transparent || body.opacity < 1;
        if (material.transparent !== transparent) { material.transparent = transparent; material.needsUpdate = true; }
        material.opacity = original.opacity * body.opacity;
      }
      cover.visible = body.phase === 'covered'; cover.material.opacity = body.opacity;
      actor.group.userData.corpse = { id: body.id, phase: body.phase, lootable: body.lootable };
    }
  }
  return { adopt, update, release, clear() { for (const id of [...actors.keys()]) release(id); },
    actor: id => actors.get(id)?.actor ?? null, get count() { return actors.size; } };
}

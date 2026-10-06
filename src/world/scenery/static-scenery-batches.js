/** Merge only the static props belonging to this construction job. Full loading
 * passes the whole world; regional loading passes newly added roots and keeps
 * the same processed set so finished batches and collider props are not repeated.
 * Tree instances, animated props, coloured ground and shaders remain untouched. */
export function* batchStaticScenery({ THREE, world, roots = [world], movingGroups,
  spatialBatches = true, preserveDistricts = false, regionAt, solidProp, processed = new WeakSet() }) {
  const batches = new Map(), batchCenter = new THREE.Vector3(), seen = new WeakSet();
  let work = 0, sourceMeshes = 0, mergedBatches = 0;
  for (const root of roots) {
    // Ancestors establish the root's world transform; descendants are updated
    // during the resumable traversal instead of one large synchronous pass.
    root.updateWorldMatrix(true, false);
    const stack = [root];
    while (stack.length) {
      if ((++work & 63) === 0) yield;
      const object = stack.pop();
      if (seen.has(object)) continue;
      seen.add(object); object.updateWorldMatrix(false, false);
      for (let i = object.children.length - 1; i >= 0; i--) stack.push(object.children[i]);
      if (!object.isMesh || processed.has(object)) continue;
      processed.add(object);
      if (object.isInstancedMesh || object.userData.liveTree || object.material.isShaderMaterial
        || object.material.transparent || object.geometry.attributes.color) continue;
      let moving = false;
      for (let parent = object; parent && parent !== world; parent = parent.parent)
        if (movingGroups.has(parent)) { moving = true; break; }
      if (moving) continue;
      solidProp(object);
      if (!object.geometry.attributes.normal) continue;
      if (!object.geometry.boundingSphere) object.geometry.computeBoundingSphere();
      batchCenter.copy(object.geometry.boundingSphere.center).applyMatrix4(object.matrixWorld);
      const district = spatialBatches ? regionAt(batchCenter.x, batchCenter.z)?.id || 1 : 1;
      if (!batches.has(object.material)) batches.set(object.material, new Map());
      const districtBatches = batches.get(object.material);
      if (!districtBatches.has(district)) districtBatches.set(district, []);
      districtBatches.get(district).push(object); sourceMeshes++;
    }
  }
  // Full mode keeps the small-group shortcut. Regional visibility requires
  // district boundaries even when a material has very few triangles.
  for (const [mat, districtBatches] of batches) if (!preserveDistricts && districtBatches.size > 1) {
    const objects = []; let triangles = 0;
    for (const entries of districtBatches.values()) for (const object of entries) {
      if ((++work & 255) === 0) yield;
      objects.push(object);
      triangles += (object.geometry.index?.count || object.geometry.attributes.position.count) / 3;
    }
    if (triangles < 2400) batches.set(mat, new Map([[1, objects]]));
  }
  const positionVector = new THREE.Vector3(), normalVector = new THREE.Vector3(), normalMatrix = new THREE.Matrix3();
  for (const [mat, districtBatches] of batches) for (const [district, objects] of districtBatches) {
    if (objects.length < 2) continue;
    let vertexCount = 0, indexCount = 0;
    for (const object of objects) {
      if ((++work & 255) === 0) yield;
      vertexCount += object.geometry.attributes.position.count;
      indexCount += object.geometry.index?.count || object.geometry.attributes.position.count;
    }
    const positions = new Float32Array(vertexCount * 3), normals = new Float32Array(vertexCount * 3);
    const indices = new Uint32Array(indexCount), uvs = mat.map ? new Float32Array(vertexCount * 2) : null;
    let vertexOffset = 0, indexOffset = 0;
    for (const object of objects) {
      const geometry = object.geometry, p = geometry.attributes.position, n = geometry.attributes.normal;
      normalMatrix.getNormalMatrix(object.matrixWorld);
      for (let i = 0; i < p.count; i++) {
        if ((++work & 1023) === 0) yield;
        positionVector.fromBufferAttribute(p, i).applyMatrix4(object.matrixWorld);
        positionVector.toArray(positions, (vertexOffset + i) * 3);
        normalVector.fromBufferAttribute(n, i).applyMatrix3(normalMatrix).normalize();
        normalVector.toArray(normals, (vertexOffset + i) * 3);
        if (uvs && geometry.attributes.uv) {
          uvs[(vertexOffset + i) * 2] = geometry.attributes.uv.getX(i);
          uvs[(vertexOffset + i) * 2 + 1] = geometry.attributes.uv.getY(i);
        }
      }
      if (geometry.index) {
        for (let i = 0; i < geometry.index.count; i++) {
          if ((++work & 4095) === 0) yield;
          indices[indexOffset++] = vertexOffset + geometry.index.getX(i);
        }
      } else for (let i = 0; i < p.count; i++) {
        if ((++work & 4095) === 0) yield;
        indices[indexOffset++] = vertexOffset + i;
      }
      vertexOffset += p.count;
    }
    const geometry = new THREE.BufferGeometry();
    const attribute = new THREE.BufferAttribute(positions, 3);
    geometry.setAttribute('position', attribute);
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    if (uvs) geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    // The same box-centre sphere as BufferGeometry.computeBoundingSphere,
    // split into bounded passes for potentially large district batches.
    const bounds = new THREE.Box3().makeEmpty(), sphere = new THREE.Sphere();
    for (let i = 0; i < attribute.count; i++) {
      if ((++work & 1023) === 0) yield;
      bounds.expandByPoint(positionVector.fromBufferAttribute(attribute, i));
    }
    bounds.getCenter(sphere.center); let radiusSquared = 0;
    for (let i = 0; i < attribute.count; i++) {
      if ((++work & 1023) === 0) yield;
      positionVector.fromBufferAttribute(attribute, i);
      radiusSquared = Math.max(radiusSquared, sphere.center.distanceToSquared(positionVector));
    }
    sphere.radius = Math.sqrt(radiusSquared); geometry.boundingSphere = sphere;
    const batch = new THREE.Mesh(geometry, mat);
    batch.castShadow = objects.some(object => object.castShadow); batch.receiveShadow = true;
    batch.name = 'Static scenery batch'; batch.userData.district = district;
    // Swap complete meshes together: pausing a build never hides half a street.
    for (const object of objects) object.removeFromParent();
    processed.add(batch); world.add(batch); mergedBatches++;
    yield;
  }
  return { batches: mergedBatches, sourceMeshes };
}

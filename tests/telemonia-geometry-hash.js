import { createHash } from 'node:crypto';

/** Excludes Three's generated UUIDs; includes every displayed geometry byte. */
export function telemoniaGeometryHash(root, include = () => true) {
  const hash = createHash('sha256');
  root.updateMatrixWorld(true);
  root.traverse(mesh => {
    if (!mesh.isMesh || !include(mesh)) return;
    hash.update(JSON.stringify([mesh.name, mesh.count, mesh.matrixWorld.elements]));
    for (const [name, attribute] of Object.entries(mesh.geometry.attributes)) {
      hash.update(JSON.stringify([name, attribute.itemSize, attribute.normalized]));
      hash.update(Buffer.from(attribute.array.buffer, attribute.array.byteOffset, attribute.array.byteLength));
    }
    for (const attribute of [mesh.geometry.index, mesh.instanceMatrix, mesh.instanceColor]) {
      if (attribute) hash.update(Buffer.from(attribute.array.buffer, attribute.array.byteOffset, attribute.array.byteLength));
    }
  });
  return hash.digest('hex');
}

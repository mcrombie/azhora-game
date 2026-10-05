import { finishBuild } from './build-steps.js';
import { CANERD_GROUND_BOUNDS, canerdGroundPatchWeight, canerdTint } from './canerd-world.js';

/** The level castle grounds use a continuous fine surface so the court and
 * approach share their visible triangles with collision.
 * A local one-metre mesh covers the sunken coarse faces and joins their exact
 * planes beyond the sink. Its sampler uses the same FLOAT32 triangles as the
 * renderer, including the diagonal through every grid cell.
 */
export function refineCanerdGround(...args) { return finishBuild(refineCanerdGroundSteps(...args)); }
export function* refineCanerdGroundSteps({ THREE, terrainRoot, heightAt, coarseHeightAt, tintAt = canerdTint }) {
  if (!THREE || !terrainRoot?.add || typeof heightAt !== 'function' || typeof coarseHeightAt !== 'function')
    throw new TypeError('Canerd refinement requires THREE, terrainRoot, analytic heightAt and coarseHeightAt.');
  const B = CANERD_GROUND_BOUNDS, spacing = 1;
  const cols = Math.round((B.maxX - B.minX) / spacing), rows = Math.round((B.maxZ - B.minZ) / spacing), stride = cols + 1;
  const positions = [], colours = [], indices = [], ids = new Int32Array((cols + 1) * (rows + 1)).fill(-1);
  const levels = new Float32Array(ids.length), cells = new Uint8Array(cols * rows), colour = new THREE.Color();
  let work = 0;
  const vertex = (i, j) => {
    const key = j * stride + i;
    if (ids[key] >= 0) return ids[key];
    const x = Math.fround(B.minX + i * spacing), z = Math.fround(B.minZ + j * spacing);
    const strength = canerdGroundPatchWeight(x, z);
    const coarse = strength < 1 ? coarseHeightAt(x, z) : 0;
    const y = Math.fround(strength ? coarse + (heightAt(x, z) - coarse) * strength : coarse);
    levels[key] = y; ids[key] = positions.length / 3; positions.push(x, y, z);
    colour.set(tintAt?.(x, z, y) ?? 0x8e9a57); colours.push(colour.r, colour.g, colour.b);
    return ids[key];
  };
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    if ((++work & 63) === 0) yield;
    const x = B.minX + i * spacing, z = B.minZ + j * spacing;
    if (canerdGroundPatchWeight(x, z) <= 0 && canerdGroundPatchWeight(x + spacing, z) <= 0
      && canerdGroundPatchWeight(x, z + spacing) <= 0 && canerdGroundPatchWeight(x + spacing, z + spacing) <= 0) continue;
    cells[j * cols + i] = 1;
    const a = vertex(i, j), b = vertex(i + 1, j), c = vertex(i, j + 1), d = vertex(i + 1, j + 1);
    indices.push(a, c, b, b, c, d);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals(); geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 1, metalness: 0 });
  const patch = new THREE.Mesh(geometry, material);
  patch.name = 'Canerd: level grounds and castle approach'; patch.receiveShadow = true; patch.userData.canerdGround = true;
  terrainRoot.add(patch);
  const fineGroundHeight = (x, z) => {
    if (x < B.minX || x >= B.maxX || z < B.minZ || z >= B.maxZ) return null;
    const gx = (x - B.minX) / spacing, gz = (z - B.minZ) / spacing, i = Math.floor(gx), j = Math.floor(gz);
    if (!cells[j * cols + i]) return null;
    const u = gx - i, v = gz - j, key = j * stride + i;
    const a = levels[key], b = levels[key + 1], c = levels[key + stride], d = levels[key + stride + 1];
    return u + v <= 1 ? a + (b - a) * u + (c - a) * v : d + (c - d) * (1 - u) + (b - d) * (1 - v);
  };
  return { patches: [patch], fineGroundHeight, heightAt: (x, z) => fineGroundHeight(x, z) ?? coarseHeightAt(x, z),
    metrics: { patches: 1, vertices: positions.length / 3, triangles: indices.length / 3, spacing, columns: cols, rows } };
}

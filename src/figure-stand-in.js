import * as THREE from 'three';
import { standInLook } from './figure-lod.js';

/**
 * Somebody too far off to see properly, as one mesh (src/figure-lod.js says when, and what they
 * look like). Three boxes merged into a single vertex-coloured geometry: one draw call where the
 * full figure is fifteen to twenty-eight, and none at all in the shadow pass.
 *
 * Everybody's stand-in shares one material, and two people dressed alike share one geometry, so
 * a crowd at a distance costs the renderer a draw call each and nothing else.
 */
const box = new THREE.BoxGeometry(1, 1, 1).toNonIndexed();
const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .92, flatShading: true });
const geometries = new Map();

function geometryFor(look) {
  const key = look.pieces.map(piece => `${piece.colour}:${piece.size.join(',')}:${piece.y}`).join('|');
  if (geometries.has(key)) return geometries.get(key);
  const positions = [], normals = [], colours = [], point = new THREE.Vector3(), tint = new THREE.Color();
  for (const piece of look.pieces) {
    tint.set(piece.colour);
    for (let i = 0; i < box.attributes.position.count; i++) {
      point.fromBufferAttribute(box.attributes.position, i);
      positions.push(point.x * piece.size[0], point.y * piece.size[1] + piece.y, point.z * piece.size[2]);
      point.fromBufferAttribute(box.attributes.normal, i); normals.push(point.x, point.y, point.z);
      colours.push(tint.r, tint.g, tint.b);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
  geometry.computeBoundingSphere();
  geometries.set(key, geometry);
  return geometry;
}

/** @param figure { tunic, skin, hair?, height?, girth? } - the same colours the full figure was made from */
export function createStandIn(figure = {}) {
  const look = standInLook(figure), mesh = new THREE.Mesh(geometryFor(look), material);
  mesh.name = 'figure-stand-in';
  mesh.castShadow = look.castShadow; mesh.receiveShadow = false;
  return mesh;
}

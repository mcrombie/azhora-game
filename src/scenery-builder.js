import * as THREE from 'three';

/**
 * A merged, vertex-coloured scenery builder for the hand-built places.
 *
 * Each place (a fort, a hamlet, a wayside clearing) is gathered into one mesh
 * with one shared flat-shaded material, so a place is one draw call that the
 * renderer can cull as a whole, and its many timbers never become many
 * objects. World metres throughout; `frame()` gives a local, turned frame for a
 * building that faces a road.
 */
const SHARED = new Map();
function sharedMaterial() {
  if (!SHARED.has('scenery')) {
    // Front faces only: solid timbers and walls are closed, and the few thin
    // things seen from both sides (canvas, roofs over open sheds, flags) are
    // emitted with both windings by `sheet`. Culling the backs of thousands of
    // boxes is most of what keeps a fort cheap to draw.
    const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .92, metalness: 0, flatShading: true });
    SHARED.set('scenery', material);
  }
  return SHARED.get('scenery');
}

const TEMPLATES = (() => {
  const plain = geometry => (geometry.index ? geometry.toNonIndexed() : geometry);
  return {
    box: plain(new THREE.BoxGeometry(1, 1, 1)),
    cylinder: plain(new THREE.CylinderGeometry(1, 1, 1, 7)),
    cylinder4: plain(new THREE.CylinderGeometry(1, 1, 1, 4)),
    cone: plain(new THREE.ConeGeometry(1, 1, 6)),
    cone4: plain(new THREE.ConeGeometry(1, 1, 4)),
    // Open-ended pieces for things whose ends are never seen: a stake's buried foot and its covered top.
    shaft4: plain(new THREE.CylinderGeometry(1, 1, 1, 4, 1, true)),
    point4: plain(new THREE.ConeGeometry(1, 1, 4, 1, true)),
    rock: plain(new THREE.IcosahedronGeometry(1, 0)),
  };
})();

export function createSceneryBuilder(name = 'Hand-built place') {
  const positions = [], normals = [], colors = [];
  const color = new THREE.Color(), p = new THREE.Vector3(), n = new THREE.Vector3();
  const normalMatrix = new THREE.Matrix3(), local = new THREE.Matrix4(), work = new THREE.Matrix4();
  const stack = [new THREE.Matrix4()];
  const top = () => stack[stack.length - 1];
  const euler = new THREE.Euler(), quaternion = new THREE.Quaternion(), scale = new THREE.Vector3(), position = new THREE.Vector3();

  function append(template, matrix, tint) {
    const pos = template.attributes.position, norm = template.attributes.normal;
    normalMatrix.getNormalMatrix(matrix); color.set(tint);
    for (let i = 0; i < pos.count; i++) {
      p.fromBufferAttribute(pos, i).applyMatrix4(matrix); n.fromBufferAttribute(norm, i).applyMatrix3(normalMatrix).normalize();
      positions.push(p.x, p.y, p.z); normals.push(n.x, n.y, n.z); colors.push(color.r, color.g, color.b);
    }
  }
  function place(kind, tint, x, y, z, sx, sy, sz, yaw = 0, pitch = 0, roll = 0) {
    position.set(x, y, z); euler.set(pitch, yaw, roll, 'YXZ'); quaternion.setFromEuler(euler); scale.set(sx, sy, sz);
    local.compose(position, quaternion, scale); work.multiplyMatrices(top(), local);
    append(TEMPLATES[kind], work, tint);
  }
  const api = {
    name,
    /** Run `build` in a frame moved to (x, y, z) and turned by `yaw` about Y. */
    frame(x, y, z, yaw, build) {
      const m = new THREE.Matrix4().makeRotationY(yaw).setPosition(x, y, z);
      stack.push(new THREE.Matrix4().multiplyMatrices(top(), m));
      try { build(); } finally { stack.pop(); }
    },
    box(tint, x, y, z, sx, sy, sz, yaw = 0, pitch = 0, roll = 0) { place('box', tint, x, y, z, sx, sy, sz, yaw, pitch, roll); },
    /** A box standing on (x, y, z), `h` tall. */
    block(tint, x, y, z, sx, h, sz, yaw = 0) { place('box', tint, x, y + h / 2, z, sx, h, sz, yaw); },
    cylinder(tint, x, y, z, radius, h, yaw = 0, sides = 7) { place(sides === 4 ? 'cylinder4' : 'cylinder', tint, x, y + h / 2, z, radius, h, radius, yaw); },
    cone(tint, x, y, z, radius, h, yaw = 0, sides = 6) { place(sides === 4 ? 'cone4' : 'cone', tint, x, y + h / 2, z, radius, h, radius, yaw); },
    rock(tint, x, y, z, sx, sy, sz, yaw = 0) { place('rock', tint, x, y, z, sx, sy, sz, yaw); },
    /**
     * A squared, sharpened stake standing on (x, y, z): `width` across, `h` to the
     * shoulder, a four-sided point above. Twelve triangles, for palisades of hundreds.
     */
    stake(tint, x, y, z, width, h, yaw = 0, point = .42) {
      const r = width / Math.SQRT2;
      place('shaft4', tint, x, y + h / 2, z, r, h, r, yaw + Math.PI / 4);
      place('point4', tint, x, y + h + point / 2, z, r * 1.02, point, r * 1.02, yaw + Math.PI / 4);
    },
    /** A square timber from a to b ([x, y, z]), `w` thick. */
    beam(tint, a, b, w = .16, h = w) {
      const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], length = Math.hypot(dx, dy, dz);
      if (length < 1e-4) return;
      const yaw = Math.atan2(dx, dz), pitch = -Math.atan2(dy, Math.hypot(dx, dz));
      place('box', tint, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, w, h, length, yaw, pitch, 0);
    },
    triangle(tint, a, b, c) {
      const m = top();
      const va = new THREE.Vector3(...a).applyMatrix4(m), vb = new THREE.Vector3(...b).applyMatrix4(m), vc = new THREE.Vector3(...c).applyMatrix4(m);
      n.crossVectors(vb.clone().sub(va), vc.clone().sub(va)).normalize(); color.set(tint);
      for (const v of [va, vb, vc]) { positions.push(v.x, v.y, v.z); normals.push(n.x, n.y, n.z); colors.push(color.r, color.g, color.b); }
    },
    quad(tint, a, b, c, d) { api.triangle(tint, a, b, c); api.triangle(tint, a, c, d); },
    /** A thin sheet seen from both sides: canvas, flags, a roof over an open shed. Both windings are emitted. */
    sheet(tint, a, b, c, d) { api.quad(tint, a, b, c, d); api.quad(tint, a, d, c, b); },
    /**
     * A gable roof over a `width` by `depth` rectangle centred at (x, y, z), its
     * ridge running along local z. Its slopes and gables show from beneath too,
     * so it serves an open shed as well as a closed house.
     */
    roof(tint, x, y, z, width, depth, rise, yaw = 0, gable = tint) {
      api.frame(x, y, z, yaw, () => {
        const w = width / 2, d = depth / 2;
        api.sheet(tint, [-w, 0, -d], [-w, 0, d], [0, rise, d], [0, rise, -d]);
        api.sheet(tint, [w, 0, d], [w, 0, -d], [0, rise, -d], [0, rise, d]);
        api.quad(tint, [-w, -.12, -d], [-w, -.12, d], [-w, 0, d], [-w, 0, -d]);
        api.quad(tint, [w, -.12, d], [w, -.12, -d], [w, 0, -d], [w, 0, d]);
        for (const [a, b, c] of [[[-w, 0, d], [w, 0, d], [0, rise, d]], [[w, 0, -d], [-w, 0, -d], [0, rise, -d]]]) { api.triangle(gable, a, b, c); api.triangle(gable, a, c, b); }
      });
    },
    /** A ridge tent: canvas to the ground on both sides, closed ends. */
    tent(tint, x, y, z, width, depth, rise, yaw = 0, ends = tint) {
      api.frame(x, y, z, yaw, () => {
        const w = width / 2, d = depth / 2;
        api.quad(tint, [-w, 0, -d], [-w, 0, d], [0, rise, d], [0, rise, -d]);
        api.quad(tint, [w, 0, d], [w, 0, -d], [0, rise, -d], [0, rise, d]);
        api.triangle(ends, [-w, 0, d], [w, 0, d], [0, rise, d]);
        api.triangle(ends, [w, 0, -d], [-w, 0, -d], [0, rise, -d]);
      });
    },
    /** A ground-hugging patch following the terrain: worn earth, a ditch floor, a paved court. */
    patch(tint, heightAt, x, z, width, depth, yaw = 0, lift = .035, cells = 4) {
      const c = Math.cos(yaw), s = Math.sin(yaw);
      const at = (u, v) => { const px = x + u * c + v * s, pz = z - u * s + v * c; return [px, heightAt(px, pz) + lift, pz]; };
      for (let i = 0; i < cells; i++) for (let j = 0; j < cells; j++) {
        const u0 = -width / 2 + width * i / cells, u1 = -width / 2 + width * (i + 1) / cells;
        const v0 = -depth / 2 + depth * j / cells, v1 = -depth / 2 + depth * (j + 1) / cells;
        const a = at(u0, v0), b = at(u0, v1), c2 = at(u1, v1), d = at(u1, v0);
        stack.push(new THREE.Matrix4()); api.quad(tint, a, b, c2, d); stack.pop();
      }
    },
    get vertexCount() { return positions.length / 3; },
    /** Adds the merged mesh to `parent` and returns it, or null when nothing was built. */
    finish(parent, { castShadow = true } = {}) {
      if (!positions.length) return null;
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      geometry.computeBoundingSphere();
      const mesh = new THREE.Mesh(geometry, sharedMaterial());
      mesh.name = name; mesh.castShadow = castShadow; mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    },
  };
  return api;
}

import * as THREE from 'three';

const point = (x, z) => Object.freeze({ x, z });
export const FOREST_HIDEOUT = Object.freeze({
  id: 'bramble-scout-camp', name: 'Bramble Scout Camp', x: 60, z: -118, radius: 9, clearingRadius: 12.5,
  center: point(60, -118), approach: point(45, -109), checkpoint: point(45, -109), supplies: point(70, -123),
  description: 'Torn blue village pennants lead to a shabby raiders’ camp beyond the eastern trees.',
  trail: Object.freeze([point(1, -117), point(14, -112), point(29, -111), point(45, -109), point(53, -111), point(60, -118)]),
  enemies: Object.freeze([point(57, -121), point(63, -124)]),
  retreatZ: -101,
});
const propAnchors = Object.freeze([point(60, -130), point(72.4, -124.8), point(69.4, -113)]);

function segmentDistance(x, z, a, b) {
  const dx = b.x - a.x, dz = b.z - a.z;
  const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(x - a.x - dx * t, z - a.z - dz * t);
}

export function forestHideoutClear(x, z, tree = false, canopyRadius = 0) {
  const canopy = tree && Number.isFinite(canopyRadius) ? Math.max(0, canopyRadius) : 0;
  if (x < -4 - canopy || x > 83 + canopy || z < -142 - canopy || z > -98 + canopy) return false;
  if (Math.hypot(x - 60, z + 118) < (tree ? 12.5 + canopy : 10.5)) return true;
  if (propAnchors.some(p => Math.hypot(x - p.x, z - p.z) < (tree ? 4 + canopy : 2.6))) return true;
  if (Math.hypot(x - 70, z + 123) < (tree ? 4.5 : 2.4)) return true;
  return FOREST_HIDEOUT.trail.some((b, i, path) => i && segmentDistance(x, z, path[i - 1], b) < (tree ? 3.2 : 1.3));
}

const trampled = new THREE.Color('#969164'), charcoal = new THREE.Color('#6b734f');
export function tintForestHideoutGround(color, x, z) {
  const dx = x - 60, dz = z + 118, angle = Math.atan2(dz, dx), radius = 10.5 + Math.sin(angle * 4) * .65;
  const wear = Math.max(0, 1 - Math.hypot(dx, dz) / radius);
  if (wear) color.lerp(trampled, wear * .46);
  const ash = Math.max(0, 1 - Math.hypot(x - 51.2, z + 124.8) / 2);
  if (ash) color.lerp(charcoal, ash * .56);
}

/** Small, authored scenery only. Quest decisions and both goblins belong to gameplay. */
export function createForestHideout(scene, world) {
  const root = new THREE.Group(); root.name = 'Bramble Scout Camp'; scene.add(root);
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .97, flatShading: true, side: THREE.DoubleSide });
  // Solid cloth has a thin underside. Casting its back faces keeps the upper
  // fabric surface from striping itself with coplanar shadow-map acne.
  material.shadowSide = THREE.BackSide;
  const shapes = { box: new THREE.BoxGeometry(1, 1, 1), log: new THREE.CylinderGeometry(.78, 1, 1, 7),
    stone: new THREE.IcosahedronGeometry(1, 0), sack: new THREE.IcosahedronGeometry(1, 1) };
  const transform = new THREE.Object3D(), p = new THREE.Vector3(), n = new THREE.Vector3(), normalMatrix = new THREE.Matrix3(), color = new THREE.Color();
  const axis = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), ownedColliders = new Set(), meshes = [];
  const h = (x, z) => world.heightAt(x, z);
  let disposed = false;
  function collider(x, z, r) {
    const value = { x, z, r, kind: 'forest-hideout-prop', site: FOREST_HIDEOUT.id };
    world.colliders.push(value); ownedColliders.add(value);
  }
  function builder(name) {
    const positions = [], normals = [], colors = [];
    function append(geometry, tint) {
      const pos = geometry.attributes.position, norm = geometry.attributes.normal, count = geometry.index?.count || pos.count;
      normalMatrix.getNormalMatrix(transform.matrix); color.set(tint);
      for (let i = 0; i < count; i++) {
        const index = geometry.index ? geometry.index.getX(i) : i;
        p.fromBufferAttribute(pos, index).applyMatrix4(transform.matrix); n.fromBufferAttribute(norm, index).applyMatrix3(normalMatrix).normalize();
        positions.push(p.x, p.y, p.z); normals.push(n.x, n.y, n.z); colors.push(color.r, color.g, color.b);
      }
    }
    function shape(kind, tint, x, y, z, sx, sy, sz, rotation = [0, 0, 0]) {
      transform.position.set(x, y, z); transform.rotation.set(...rotation); transform.scale.set(sx, sy, sz); transform.updateMatrix(); append(shapes[kind], tint);
    }
    function branch(a, b, radius = .09, tint = '#735a3d') {
      transform.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
      axis.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); const length = axis.length();
      transform.quaternion.setFromUnitVectors(up, axis.normalize()); transform.scale.set(radius, length, radius); transform.updateMatrix(); append(shapes.log, tint);
    }
    function triangle(a, b, c, tint) {
      const ab = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), ac = new THREE.Vector3(c[0] - a[0], c[1] - a[1], c[2] - a[2]);
      n.crossVectors(ab, ac).normalize(); color.set(tint);
      for (const pos of [a, b, c]) { positions.push(...pos); normals.push(n.x, n.y, n.z); colors.push(color.r, color.g, color.b); }
    }
    function cloth(points, tint, thickness = .065) {
      const center = points.reduce((sum, point) => sum.map((value, i) => value + point[i] / points.length), [0, 0, 0]);
      const below = p => [p[0], p[1] - thickness, p[2]], base = below(center);
      // Author polygons run clockwise in X/Z; reversing their top triangles
      // makes the visible cloth surface face up, with a closed underside.
      for (let i = 0; i < points.length; i++) {
        const a = points[i], b = points[(i + 1) % points.length], ba = below(a), bb = below(b);
        triangle(center, b, a, tint); triangle(base, ba, bb, '#5e5742');
        triangle(a, b, ba, '#6c6249'); triangle(b, bb, ba, '#6c6249');
      }
    }
    function pennant(x, z, height, width = 1.0, ground = h(x, z)) {
      branch([x, ground, z], [x + .13, ground + height, z], .065);
      branch([x + .13, ground + height - .12, z], [x + width + .13, ground + height - .12, z], .04);
      const a = [x + .15, ground + height - .2, z + .035], b = [x + width + .1, ground + height - .12, z + .035];
      const notch = [x + width * .67, ground + height - .72, z + .05], tail = [x + .16, ground + height - 1.13, z + .04];
      triangle(a, notch, b, '#548ca2'); triangle(a, tail, notch, '#3d708b');
      // The pale patch is Tidehaven cloth, visibly stolen rather than a newly
      // invented goblin insignia. Split tails make it readable from the road.
      triangle([x + .28, ground + height - .33, z + .07], [x + .58, ground + height - .32, z + .07], [x + .40, ground + height - .64, z + .07], '#d5c18b');
    }
    function finish() {
      const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3)); geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      geometry.computeBoundingSphere(); geometry.computeBoundingBox();
      const mesh = new THREE.Mesh(geometry, material); mesh.name = name; mesh.castShadow = true; mesh.receiveShadow = true; root.add(mesh); meshes.push(mesh); return mesh;
    }
    return { shape, branch, triangle, cloth, pennant, finish };
  }

  const props = builder('Bramble camp shelter and trail signs'), timber = '#725239', paleWood = '#ae9362';
  // A cramped, badly patched lean-to sits behind the battle circle. It reads
  // as a raiding party's temporary shelter, not another permanent village.
  const roofY = h(60, -130) + 1.85;
  const roofAt = (x, z) => roofY + (-127.4 - z) / 4.8 * 1.04 + (x - 60) * .026 + Math.sin(x * 1.8) * .045;
  for (const x of [57.2, 62.8]) for (const z of [-132, -127.5]) {
    const y = h(x, z), top = roofAt(x, z), lean = x < 60 ? -.27 : .21;
    const middle = [x + lean * .32, y + (top - y) * .48, z + .08];
    props.branch([x, y, z], middle, .14, timber);
    props.branch(middle, [x + lean, top + .11, z + (z < -130 ? -.13 : .16)], .105, timber);
    props.branch([x + lean * .8, top - .18, z], [x + lean + .27, top + .19, z - .12], .045, '#806146');
    collider(x, z, .15);
  }
  props.branch([57.0, roofAt(57, -132.1) - .10, -132.1], [63.05, roofAt(63.05, -132.1) - .10, -132.1], .13);
  props.branch([56.95, roofAt(56.95, -127.35) - .10, -127.35], [63.15, roofAt(63.15, -127.35) - .10, -127.35], .105);
  for (const x of [57.1, 58.4, 59.85, 61.1, 62.95]) {
    props.branch([x, roofAt(x, -132.2) - .11, -132.2], [x + .13, roofAt(x + .13, -127.3) - .11, -127.3], .065);
  }
  const roofEdge = [[-3.10,-4.88],[-1.28,-5.02],[.66,-4.75],[3.16,-4.9],[3.24,-3.28],[2.94,-1.05],[3.03,.10],
    [2.18,-.09],[1.35,-.37],[.73,.02],[.07,-.40],[-.61,-.11],[-1.18,-.43],[-2.17,.08],[-2.91,-.08],[-3.16,-2.12]];
  props.cloth(roofEdge.map(([dx,dz]) => { const x = 60 + dx, z = -127.4 + dz; return [x, roofAt(x,z), z]; }), '#766d53', .075);
  for (const [cx,cz,width,length,tint] of [[58.55,-130.4,1.42,1.7,'#777767'],[61.42,-129.35,1.10,1.9,'#958269']]) {
    const corners = [[-.52,-.51],[.50,-.47],[.46,.52],[-.44,.45]];
    props.cloth(corners.map(([dx,dz]) => { const x=cx+dx*width,z=cz+dz*length;return[x,roofAt(x,z)+.135,z]; }),tint,.035);
    for (let stitch=0;stitch<5;stitch++) {
      const x=cx-width*.48,z=cz-length*.4+stitch*length*.19;
      props.branch([x-.085,roofAt(x-.085,z)+.18,z-.02],[x+.085,roofAt(x+.085,z)+.18,z+.05],.018,'#b09a70');
    }
  }
  for (const [cx,cz,yaw,width,length,tint] of [[58.12,-130.18,-.22,1.01,1.90,'#817358'],[59.98,-130.36,.16,.92,2.26,'#777565'],[61.68,-130.00,-.10,1.14,1.74,'#918166']]) {
    const floor=h(cx,cz)+.17,cos=Math.cos(yaw),sin=Math.sin(yaw);
    const transformPoint=(x,z,lift=0)=>[cx+x*cos+z*sin,floor+lift,cz+z*cos-x*sin];
    const edge=[[-.5,-.5],[.5,-.48],[.48,.5],[.32,.46],[.21,.57],[.05,.47],[-.08,.55],[-.26,.45],[-.40,.53],[-.51,.39]];
    props.cloth(edge.map(([x,z],i)=>transformPoint(x*width,z*length,i<2?.035:0)),tint,.09);
    props.branch(transformPoint(-width*.39,-length*.34,.16),transformPoint(width*.39,-length*.34,.16),.135,tint);
  }
  // One leaning scrap of wattle closes the exposed side; it is a small piece
  // of salvage rather than a straight, finished wall around the camp.
  for (let i=0;i<5;i++) {
    const z=-132.1+i*.54,x=63.45+i*.035,y=h(x,z);
    props.branch([x,y,z],[x+.29,y+1.37+(i%3)*.13,z+.09],.055,'#69513a');
  }
  for (let row=0;row<4;row++) {
    const y=h(63.6,-131.1)+.28+row*.28;
    props.branch([63.48+row*.042,y,-132.2],[63.69+row*.055,y+.10,-129.87],.033,row%2?'#92754e':'#755d3e');
  }
  collider(63.6,-131.1,.94);
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4, x = 51.2 + Math.sin(angle) * .86, z = -124.8 + Math.cos(angle) * .86;
    props.shape('stone', '#859077', x, h(x, z) + .12, z, .29, .18, .24);
  }
  for (let i = 0; i < 4; i++) props.branch([50.5 + i * .28, h(51.2, -124.8) + .1, -125.25], [51.15 + i * .20, h(51.2, -124.8) + .1, -124.4], .055, '#494d36');
  // Broken sticks and small junk stay outside the fighting/retreat corridor.
  for (let i = 0; i < 4; i++) props.branch([67.3 + i * .36, h(68, -128) + .15, -128.6], [67.7 + i * .4, h(68, -128) + .16, -127.2], .075);
  for (const [x, z] of [[7, -118], [32, -107.7], [46.6, -112.6]]) {
    props.pennant(x, z, 2.45, 1.08); collider(x, z, .12);
  }
  props.finish();

  const suppliesBuilder = builder('Stolen Tidehaven supplies'), sx = 72.4, sz = -124.8, sy = h(sx, sz);
  suppliesBuilder.shape('box', timber, sx, sy + .6, sz, 1.48, 1.2, 1.18, [0, -.18, 0]);
  for (const side of [-1, 1]) suppliesBuilder.shape('box', paleWood, sx + side * .58, sy + .61, sz + .61, .095, 1.15, .065);
  for (const level of [.12, 1.05]) suppliesBuilder.shape('box', paleWood, sx, sy + level, sz + .61, 1.3, .10, .075);
  suppliesBuilder.shape('box', '#497d97', sx, sy + .65, sz + .64, .47, .40, .035);
  suppliesBuilder.triangle([sx - .14, sy + .61, sz + .665], [sx + .13, sy + .61, sz + .665], [sx + .02, sy + .80, sz + .665], '#ead6a3');
  for (let i = 0; i < 3; i++) {
    const x = 70.9 + i * .68, z = -126.6 + i % 2 * .27, y = h(x, z);
    suppliesBuilder.shape('sack', i % 2 ? '#b6a17b' : '#c1ad82', x, y + .46, z, .46, .63, .36, [.07, i, -.08]);
    suppliesBuilder.shape('log', '#9b8a60', x, y + .98, z, .16, .18, .16);
    suppliesBuilder.shape('box', '#487c92', x, y + .55, z + .35, .30, .27, .035);
  }
  const suppliesMesh = suppliesBuilder.finish();
  const supplyCollider = { x: sx, z: sz, r: .99, kind: 'forest-hideout-supplies', site: FOREST_HIDEOUT.id };
  world.colliders.push(supplyCollider); ownedColliders.add(supplyCollider);

  const flagBuilder = builder('Lowered raider pennant');
  flagBuilder.pennant(0, 0, 3.25, 1.35, 0);
  const flag = flagBuilder.finish(); flag.position.set(69.4, h(69.4, -113), -113); collider(69.4, -113, .12);
  let state = { cleared: false, recovered: false };
  function setState(next = {}) {
    if (disposed) return { ...state };
    for (const key of ['cleared', 'recovered']) if (typeof next[key] === 'boolean') state[key] = next[key];
    suppliesMesh.visible = !state.recovered;
    const index = world.colliders.indexOf(supplyCollider);
    if (state.recovered && index >= 0) world.colliders.splice(index, 1);
    if (!state.recovered && index < 0) world.colliders.push(supplyCollider);
    flag.rotation.z = state.cleared ? -.95 : -.09;
    return { ...state };
  }
  setState();
  for (const shape of Object.values(shapes)) shape.dispose();
  function dispose() {
    if (disposed) return; disposed = true;
    for (let i = world.colliders.length - 1; i >= 0; i--) if (ownedColliders.has(world.colliders[i])) world.colliders.splice(i, 1);
    for (const mesh of meshes) mesh.geometry.dispose(); material.dispose(); root.removeFromParent();
  }
  return { root, sites: FOREST_HIDEOUT, state: () => ({ ...state }), setState, dispose,
    metrics: () => ({ meshes: meshes.length, triangles: meshes.reduce((sum, mesh) => sum + mesh.geometry.attributes.position.count / 3, 0), colliders: ownedColliders.size }),
    visuals: { supplies: suppliesMesh, pennant: flag } };
}

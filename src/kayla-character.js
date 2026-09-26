import * as THREE from 'three';

// Kayla is a bear, with a bear's broad shoulders, short tail and planted feet.
// Forward is +Z; the standing paws touch y=0. The host owns world transforms.
const ROUND = new THREE.SphereGeometry(1, 8, 6);
const CLAW = new THREE.ConeGeometry(1, 1, 5);
const FUR = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: .94, metalness: 0, flatShading: true });
const PALETTE = Object.freeze({ coat: 0x705036, light: 0x866344, dark: 0x503923, muzzle: 0xb4936b, nose: 0x28231f, eye: 0x332419, glint: 0xe1cda3, claw: 0xb29e7c });

/** Bake all of a joint's matte parts into one colored mesh. */
function modelBuilder() {
  const batches = new Map(), matrix = new THREE.Matrix4(), normalMatrix = new THREE.Matrix3();
  const rotation = new THREE.Quaternion(), euler = new THREE.Euler(), point = new THREE.Vector3(), normal = new THREE.Vector3();
  const color = new THREE.Color();
  function part(parent, tint, position, scale, angles = [0, 0, 0], source = ROUND) {
    if (!batches.has(parent)) batches.set(parent, { positions: [], normals: [], colors: [], indices: [] });
    const batch = batches.get(parent), offset = batch.positions.length / 3;
    rotation.setFromEuler(euler.set(...angles));
    matrix.compose(new THREE.Vector3(...position), rotation, new THREE.Vector3(...scale));
    normalMatrix.getNormalMatrix(matrix); color.setHex(tint);
    for (let i = 0; i < source.attributes.position.count; i++) {
      point.fromBufferAttribute(source.attributes.position, i).applyMatrix4(matrix);
      normal.fromBufferAttribute(source.attributes.normal, i).applyMatrix3(normalMatrix).normalize();
      batch.positions.push(point.x, point.y, point.z);
      batch.normals.push(normal.x, normal.y, normal.z);
      batch.colors.push(color.r, color.g, color.b);
    }
    const count = source.index?.count ?? source.attributes.position.count;
    for (let i = 0; i < count; i++) batch.indices.push(offset + (source.index ? source.index.getX(i) : i));
  }
  function finish() {
    for (const [parent, batch] of batches) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(batch.positions, 3));
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(batch.normals, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(batch.colors, 3));
      geometry.setIndex(batch.indices); geometry.computeBoundingSphere();
      const mesh = new THREE.Mesh(geometry, FUR);
      mesh.name = 'Kayla rigid fur batch'; mesh.castShadow = true; mesh.receiveShadow = true;
      parent.add(mesh);
    }
  }
  return { part, finish };
}

function joint(parent, name, x = 0, y = 0, z = 0) {
  const group = new THREE.Group(); group.name = name; group.position.set(x, y, z); parent.add(group); return group;
}

const clamp = THREE.MathUtils.clamp;
const lerp = THREE.MathUtils.lerp;
function envelope(progress, points) {
  for (let i = 1; i < points.length; i++) {
    if (progress > points[i][0]) continue;
    const [a, av] = points[i - 1], [b, bv] = points[i];
    return lerp(av, bv, THREE.MathUtils.smoothstep(progress, a, b));
  }
  return points.at(-1)[1];
}

export function createKaylaBear({ cub = false } = {}) {
  const group = new THREE.Group(); group.name = cub ? 'Kayla’s cub' : 'Kayla the bear';
  if (cub) group.scale.setScalar(.58);
  const { part, finish } = modelBuilder(), c = PALETTE;
  const body = joint(group, 'Weight and hips');
  const spine = joint(body, 'Spine', 0, .96, 0);
  part(spine, c.coat, [0, -.015, -.1], [.48, .39, .79]);
  part(spine, c.coat, [0, -.035, -.51], [.49, .39, .47]);
  part(spine, c.dark, [0, -.18, -.12], [.42, .24, .65]);
  part(spine, c.coat, [0, .015, .42], [.49, .405, .45]);
  part(spine, c.light, [0, .17, .3], [.39, .26, .45]); // the powerful shoulder hump
  const neck = joint(spine, 'Neck', 0, .06, .62);
  part(neck, c.coat, [0, -.01, .05], [.35, .31, .34]);
  part(neck, c.light, [0, -.16, .14], [.26, .2, .22]);
  const head = joint(neck, 'Head', 0, .12, .25);
  if (cub) { head.scale.setScalar(1.12); head.position.y += .025; }
  part(head, c.coat, [0, .01, .015], [.305, .27, .31]);
  part(head, c.light, [0, .035, .125], [.255, .215, .235]);
  // The light, wide muzzle and rounded cheek pads keep her expression open.
  part(head, c.muzzle, [0, -.08, .3], [.21, .135, .24]);
  part(head, c.nose, [0, -.02, .505], [.105, .072, .061]);
  const jaw = joint(head, 'Jaw', 0, -.15, .19);
  part(jaw, c.dark, [0, .005, .13], [.16, .026, .157]);
  part(jaw, c.muzzle, [0, -.037, .12], [.165, .061, .166]);
  for (const side of [-1, 1]) {
    part(head, c.coat, [side * .237, .247, -.055], [.126, .142, .094], [0, 0, side * -.13]);
    part(head, c.dark, [side * .237, .258, .024], [.074, .085, .025]);
    part(head, c.coat, [side * .245, -.073, .155], [.107, .135, .16]);
    part(head, c.dark, [side * .147, .07, .321], [.046, .04, .026]);
    part(head, c.eye, [side * .147, .07, .342], [.027, .029, .016]);
    part(head, c.glint, [side * .142, .079, .356], [.009, .01, .006]);
    // A relaxed brow follows the eye; no scowl, eyelashes or human accessories.
    part(head, c.light, [side * .155, .119, .315], [.062, .027, .039], [0, 0, side * -.12]);
  }
  const tail = joint(spine, 'Tail', 0, -.04, -.94);
  part(tail, c.coat, [0, 0, -.045], [.13, .115, .145]);
  const legs = [], knees = [], paws = [];
  for (const [name, side, z] of [['Left Fore', -1, .47], ['Right Fore', 1, .47], ['Left Hind', -1, -.56], ['Right Hind', 1, -.56]]) {
    const fore = z > 0;
    const hip = joint(body, `${name} Hip`, side * (fore ? .36 : .375), .91, z);
    const knee = joint(hip, `${name} Knee`, 0, -.4, 0);
    const paw = joint(knee, `${name} Paw`, 0, -.4, 0);
    legs.push(hip); knees.push(knee); paws.push(paw);
    part(hip, c.coat, [0, -.14, 0], [fore ? .205 : .24, .28, .245]);
    part(knee, c.coat, [0, -.16, .018], [.147, .255, .164]);
    part(paw, c.dark, [0, -.025, .055], [.16, .085, .23]);
    part(paw, c.coat, [0, .008, .06], [.174, .091, .228]);
    for (const toe of [-.096, -.032, .032, .096]) {
      part(paw, c.light, [toe, -.001, .209], [.044, .055, .067]);
      part(paw, c.claw, [toe, -.016, .276], [.014, .065, .014], [Math.PI / 2, 0, 0], CLAW);
    }
  }
  finish();
  // A contact anchor follows the actual broad back, including its small gait sway.
  // It carries no saddle; the player sits astride Kayla's fur for the race.
  const seat = joint(spine, 'Bear rider seat', 0, .345, -.17);

  let lastTime, stride = .7, movement = 0;
  function animate(time, speed = 0, grounded = true, pose = {}) {
    const seconds = Number.isFinite(time) ? time : 0;
    const dt = lastTime === undefined ? 1 / 60 : clamp(seconds - lastTime, 0, .1); lastTime = seconds;
    const pace = Math.max(0, Number.isFinite(speed) ? speed : 0);
    const action = pose.action || 'idle', progress = clamp(Number.isFinite(pose.progress) ? pose.progress : 0, 0, 1);
    const fallen = action === 'dead' || action === 'down';
    movement = lerp(movement, grounded && !fallen ? clamp(pace / 1.2, 0, 1) : 0, 1 - Math.exp(-9 * dt));
    stride += dt * Math.min(9, 2.6 + pace * 2.5);
    const breath = Math.sin(seconds * 1.7), still = 1 - movement, alert = pose.alert ? 1 : 0;
    let spineX = 0, spineY = Math.sin(stride) * .024 * movement, spineZ = Math.sin(stride) * .024 * movement;
    let headX = breath * .012, headY = Math.sin(seconds * .38) * .15 * still * (1 - alert), headZ = Math.sin(seconds * .61) * .025 * still;
    let neckX = -.06 - alert * .07, bodyY = Math.abs(Math.sin(stride)) * .009 * movement, jawX = 0;
    let swipeLift = 0, swipeReach = 0, swipeAcross = 0, crouch = 0;
    if (action === 'windup') {
      const ready = THREE.MathUtils.smoothstep(progress, 0, 1);
      swipeLift = ready * .25; swipeReach = -.1 * ready; swipeAcross = .24 * ready;
      spineY = -.11 * ready; spineX = -.07 * ready; headY = 0;
    } else if (action === 'attack') {
      const strength = envelope(progress, [[0, .5], [.27, 1], [.56, .9], [1, 0]]);
      swipeLift = .59 * strength;
      swipeReach = envelope(progress, [[0, -.1], [.28, .62], [.6, .53], [1, 0]]);
      swipeAcross = envelope(progress, [[0, .24], [.3, -.45], [.65, -.3], [1, 0]]);
      bodyY += .08 * strength; spineX = -.11 * strength; spineY = .15 * strength;
      neckX = -.08; headX = .05; headY = 0;
    } else if (action === 'hurt' || action === 'stagger') {
      const recoil = Math.sin(Math.PI * Math.min(1, progress * 1.3));
      spineX = -.12 * recoil; spineZ = -.13 * recoil; headX = -.13 * recoil; headY = .18 * recoil;
    } else if (action === 'dodge') {
      crouch = Math.sin(Math.PI * progress) * .16; spineZ = .08; neckX = .1;
    } else if (fallen) {
      // The corpse host lays the whole animal on her side and grounds its bounds.
      // Keeping that transform outside this rig also preserves her natural size.
      movement = 0; spineX = .04; spineY = 0; spineZ = 0; neckX = .24; headX = .13; headY = .12; headZ = 0; bodyY = 0;
    } else if (pose.posture === 'sniff' || pose.posture === 'eat') {
      neckX = .43; headX = .12 + breath * .025; headY *= .35;
      if (pose.posture === 'eat') jawX = Math.max(0, Math.sin(seconds * 5)) * .09;
    }
    bodyY -= crouch;
    const damping = 1 - Math.exp(-(action === 'attack' || action === 'hurt' || action === 'stagger' ? 26 : 13) * dt);
    function rotate(object, x, y = 0, z = 0) {
      object.rotation.x = lerp(object.rotation.x, x, damping);
      object.rotation.y = lerp(object.rotation.y, y, damping);
      object.rotation.z = lerp(object.rotation.z, z, damping);
    }
    body.position.y = lerp(body.position.y, bodyY, damping);
    rotate(spine, spineX, spineY, spineZ); rotate(neck, neckX + breath * .006, 0, -spineZ * .4);
    rotate(head, headX, headY, headZ); rotate(jaw, jawX); rotate(tail, 0, Math.sin(seconds * .7) * .08 * still);
    // A slow four-beat walk, with a short lifted swing and a long planted stance.
    // Solve each two-segment leg toward its paw so the heavy body does not skate
    // above stiff legs, and both ordinary breathing and a crouch retain contact.
    for (let i = 0; i < 4; i++) {
      const cycle = ((stride / (Math.PI * 2) + [0, .5, .2, .7][i]) % 1 + 1) % 1;
      const swing = cycle < .35, fraction = swing ? cycle / .35 : (cycle - .35) / .65;
      let z = (swing ? lerp(-.23, .23, fraction) : lerp(.23, -.23, fraction)) * movement;
      let lift = (swing ? Math.sin(fraction * Math.PI) * .12 : 0) * movement;
      if (i === 1 && (action === 'attack' || action === 'windup')) { z = swipeReach; lift = swipeLift; }
      if (fallen) { rotate(legs[i], i < 2 ? -.52 : .43); rotate(knees[i], i < 2 ? .83 : -.72); rotate(paws[i], -.15); continue; }
      const targetY = .11 + lift - .91 - body.position.y;
      const distance = clamp(Math.hypot(targetY, z), .08, .7999);
      const bend = Math.acos(distance / .8), direction = Math.atan2(-z, -targetY), fore = i < 2;
      const upper = direction + (fore ? bend : -bend), lower = (fore ? -2 : 2) * bend;
      rotate(legs[i], upper, 0, i === 1 ? swipeAcross : 0); rotate(knees[i], lower); rotate(paws[i], -upper - lower);
    }
  }
  animate(0);
  return { group, animate, seat,
    seatPosition(target = new THREE.Vector3()) { return seat.getWorldPosition(target); },
    riderPosition(target = new THREE.Vector3()) { seat.getWorldPosition(target); target.y -= .58; return target; },
    setWeapon: () => false, setShield: () => {}, setArmed: () => {} };
}

/** The unnamed cub has a larger head in proportion and the same grounded bear rig. */
export function createBearCub() { return createKaylaBear({ cub: true }); }

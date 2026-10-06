import * as THREE from 'three';

// Kayla is a bear, with a bear's broad shoulders, short tail and planted feet.
// Forward is +Z; the standing paws touch y=0. The host owns world transforms.
const ROUND = new THREE.SphereGeometry(1, 8, 6);
const CLAW = new THREE.ConeGeometry(1, 1, 5);
const CONE = new THREE.ConeGeometry(1, 1, 8);
const CYLINDER = new THREE.CylinderGeometry(1, 1, 1, 10);
const FUR = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: .94, metalness: 0, flatShading: true });
const PALETTE = Object.freeze({ coat: 0x705036, light: 0x866344, dark: 0x503923, muzzle: 0xb4936b, nose: 0x28231f, eye: 0x332419, glint: 0xe1cda3, claw: 0xb29e7c });
const coat = (coat, light, dark, muzzle) => Object.freeze({ ...PALETTE, coat, light, dark, muzzle });
const TRIM = Object.freeze({ red: 0xb3262e, gold: 0xd9a93a, white: 0xf1ebdc, black: 0x1f1b1d, pink: 0xe0729f, rose: 0xf6bdd0,
  blue: 0x3d68c0, sky: 0xa2c6ee, silver: 0xd9dde6, green: 0x3f9a58, yellow: 0xf2cf45, iron: 0x3a3c41 });

/**
 * **The circus family's looks** (the user, 26 September 2026: "Can we make Kayla's bear family a
 * circus family? Michael is her husband. Ava is a daughter. Elle is her other daughter."; the acts
 * and who does which are src/content/quests/bear-family/bear-circus.js). A coat, a size, a costume sewn into the fur batches so
 * it costs no draw calls, and the props of the act, shown only while it is being performed.
 */
export const CIRCUS_BEAR_LOOKS = Object.freeze({
  kayla: Object.freeze({ size: 1, palette: PALETTE, costume: 'strongbear', act: 'lift', seed: 0 }),
  michael: Object.freeze({ size: 1.1, palette: coat(0x54402f, 0x66503d, 0x3b2c20, 0xb3a58e), costume: 'ringmaster', act: 'juggle', seed: 1.7 }),
  ava: Object.freeze({ size: .78, young: true, palette: coat(0x8c633d, 0xa2774c, 0x654629, 0xcaa77c), costume: 'ball', act: 'ball', seed: 3.1 }),
  elle: Object.freeze({ size: .72, young: true, palette: coat(0x7b4a32, 0x94603f, 0x573424, 0xc19872), costume: 'dancer', act: 'dance', seed: 4.4 }),
  bodhi: Object.freeze({ size: .58, cub: true, palette: PALETTE, costume: 'clown', act: 'tumble', seed: 5.9 }),
});

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

/** A pleated collar just in front of the shoulders, in two colours. */
function ruff(part, neck, colors) {
  for (let i = 0; i < 14; i++) {
    const a = i / 14 * Math.PI * 2;
    part(neck, colors[i % 2], [Math.cos(a) * .37, -.02 + Math.sin(a) * .33, .17], [.13, .12, .045], [0, 0, a]);
  }
}
/** A frilled skirt round the middle, flaring out. */
function tutu(part, spine, colors) {
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * Math.PI * 2;
    part(spine, colors[i % 2], [Math.cos(a) * .52, -.03 + Math.sin(a) * .43, -.3], [.17, .15, .05], [.35 * Math.sin(a), -.35 * Math.cos(a), a]);
  }
}
/** A pointed party hat, tipped a little to one side, with a pompom; a cub's is a small one. */
function coneHat(part, head, color, pompom, tall = .28) {
  part(head, color, [.04, .3 + tall / 2, .03], [.105, tall, .105], [0, 0, -.2], CONE);
  part(head, pompom, [.04 + tall * .2, .3 + tall, .03], [.045, .045, .045]);
}

function dress(part, { spine, neck, head }, costume) {
  if (costume === 'strongbear') {
    ruff(part, neck, [TRIM.red, TRIM.gold]);
    // A strongbear's wide belt, with a buckle on each side.
    part(spine, TRIM.red, [0, -.015, -.12], [.505, .415, .12]);
    for (const side of [-1, 1]) part(spine, TRIM.gold, [side * .5, -.02, -.12], [.035, .1, .085]);
  } else if (costume === 'ringmaster') {
    ruff(part, neck, [TRIM.white, TRIM.white]);
    // The red coat over the forequarters and the hump, gold on the shoulders and down the front.
    part(spine, TRIM.red, [0, .02, .42], [.505, .415, .46]);
    part(spine, TRIM.red, [0, .175, .3], [.4, .27, .46]);
    for (const side of [-1, 1]) part(spine, TRIM.gold, [side * .41, .3, .5], [.14, .05, .16], [0, 0, side * -.5]);
    part(spine, TRIM.gold, [0, -.18, .835], [.045, .045, .03]);
    part(spine, TRIM.gold, [0, -.3, .73], [.045, .045, .03]);
    // The top hat, between the ears.
    part(head, TRIM.black, [0, .29, .07], [.2, .018, .2], [-.1, 0, 0], CYLINDER);
    part(head, TRIM.red, [0, .325, .073], [.128, .05, .128], [-.1, 0, 0], CYLINDER);
    part(head, TRIM.black, [0, .43, .085], [.12, .26, .12], [-.1, 0, 0], CYLINDER);
  } else if (costume === 'ball') {
    ruff(part, neck, [TRIM.pink, TRIM.rose]);
    tutu(part, spine, [TRIM.pink, TRIM.rose]);
    coneHat(part, head, TRIM.pink, TRIM.white);
  } else if (costume === 'dancer') {
    ruff(part, neck, [TRIM.blue, TRIM.silver]);
    tutu(part, spine, [TRIM.sky, TRIM.blue]);
    // A gold band round the brow and a white plume standing out of it.
    part(head, TRIM.gold, [0, .15, .02], [.3, .045, .31]);
    part(head, TRIM.white, [0, .38, -.03], [.04, .17, .06], [-.3, 0, 0]);
  } else if (costume === 'clown') {
    ruff(part, neck, [TRIM.yellow, TRIM.green]);
    coneHat(part, head, TRIM.green, TRIM.yellow, .17);
  }
}

/** The big striped ball Ava stands on: one mesh, coloured in segments round its middle. */
function circusBall(parent, radius) {
  const geometry = new THREE.SphereGeometry(radius, 16, 12).toNonIndexed(), colors = [];
  const stripes = [TRIM.red, TRIM.yellow, TRIM.blue, TRIM.white].map(hex => new THREE.Color(hex));
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i += 3) {
    const x = (position.getX(i) + position.getX(i + 1) + position.getX(i + 2)) / 3, z = (position.getZ(i) + position.getZ(i + 1) + position.getZ(i + 2)) / 3;
    const color = stripes[Math.floor(((Math.atan2(z, x) / (Math.PI * 2) + 1) % 1) * 8) % 4];
    for (let v = 0; v < 3; v++) colors.push(color.r, color.g, color.b);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const mesh = new THREE.Mesh(geometry, FUR); mesh.name = 'Circus ball stripes'; mesh.castShadow = true;
  parent.add(mesh);
}

/**
 * A bear of Kayla's family. With no `look` it is Kayla as she always was (and `cub` her cub);
 * with a look from CIRCUS_BEAR_LOOKS it is that member of the circus, in costume, and it performs
 * its act when the pose asks for it (`pose.act`) and it is standing still, unhurt and not talking.
 */
export function createKaylaBear({ cub = false, look = null, props: withProps = true } = {}) {
  const circus = look ? CIRCUS_BEAR_LOOKS[look] : null;
  const small = cub || !!circus?.cub, young = small || !!circus?.young;
  // Kayla and Bodhi keep the names the combat and corpse views look them up by.
  const group = new THREE.Group(); group.name = small ? 'Kayla’s cub' : !circus || look === 'kayla' ? 'Kayla the bear' : `Circus bear (${look})`;
  const size = circus?.size ?? (small ? .58 : 1);
  if (size !== 1) group.scale.setScalar(size);
  const { part, finish } = modelBuilder(), c = circus?.palette ?? PALETTE;
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
  if (small) { head.scale.setScalar(1.12); head.position.y += .025; }
  else if (young) { head.scale.setScalar(1.06); head.position.y += .012; }
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
    // A relaxed brow follows the eye; no scowl or eyelashes.
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
  // The act's props hang off the whole bear, not a joint, and are shown only while it performs.
  const act = circus?.act ?? null, props = [];
  let barbell = null, ball = null;
  const juggled = [];
  if (circus) {
    dress(part, { spine, neck, head }, circus.costume);
    if (!withProps) { /* a body laid down carries no barbell, balls or ball */ }
    else if (act === 'lift') {
      barbell = joint(group, 'Circus barbell');
      part(barbell, TRIM.iron, [0, 0, 0], [.035, 1.3, .035], [0, 0, Math.PI / 2], CYLINDER);
      for (const side of [-1, 1]) { part(barbell, TRIM.iron, [side * .62, 0, 0], [.19, .19, .19]); part(barbell, TRIM.gold, [side * .47, 0, 0], [.05, .09, .09]); }
      props.push(barbell);
    } else if (act === 'juggle') {
      for (const tint of [TRIM.red, TRIM.yellow, TRIM.blue]) { const one = joint(group, 'Juggling ball'); part(one, tint, [0, 0, 0], [.085, .085, .085]); juggled.push(one); props.push(one); }
    } else if (act === 'ball') {
      ball = joint(group, 'Circus ball'); circusBall(ball, 1); props.push(ball);
    }
    for (const prop of props) prop.visible = false;
  }
  finish();
  // A contact anchor follows the actual broad back, including its small gait sway.
  // It carries no saddle; the player sits astride Kayla's fur for the race.
  const seat = joint(spine, 'Bear rider seat', 0, .345, -.17);

  // The acts, all in the body's own frame. `show` eases in and out so a bear rises into its act and
  // settles out of it; `spin` is Elle's twirl, which unwinds to the nearest whole turn when she stops.
  const BALL = .45, REAR_PIVOT = new THREE.Vector3(0, .91, -.56), ROLL_PIVOT = new THREE.Vector3(0, .62, -.05);
  const X_AXIS = new THREE.Vector3(1, 0, 0), aim = new THREE.Vector3(), pivot = new THREE.Vector3(), offset = new THREE.Vector3();
  const tucked = new THREE.Vector3(), leftPaw = new THREE.Vector3(), rightPaw = new THREE.Vector3(), arm = new THREE.Vector3();
  let show = 0, spin = 0;

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
    const performing = !!act && pose.act === act && !pose.conversing && action === 'idle' && grounded && pace < .15;
    if (!performing && (fallen || action !== 'idle')) show = 0;
    else show = lerp(show, performing ? 1 : 0, 1 - Math.exp(-3.2 * dt));
    if (show < .002 && !performing) show = 0;
    if (show > 0) { performAct(seconds + (circus?.seed ?? 0), dt, damping, rotate, { neckX, headX, jawX, breath, performing }); return; }
    if (body.rotation.x || body.rotation.y || body.position.x || body.position.z) { body.rotation.set(0, 0, 0); body.position.x = body.position.z = 0; spin = 0; }
    for (const prop of props) prop.visible = false;
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

  /**
   * One frame of the act. Ringed acts (lift, juggle, dance) rear up on the haunches round the hind
   * hips; the ball act stands on the ball; the tumble rolls round the middle. Every paw is solved
   * toward a target given either on the ground in the bear's facing frame, which is carried into the
   * tilted body, or in the body's own frame for an arm in the air or a leg tucked in for the roll.
   */
  function performAct(t, dt, damping, rotate, { neckX, headX, jawX, breath, performing }) {
    const w = show;
    let rear = 0, lift = 0, swayX = 0, swayZ = 0, lean = 0, tuck = 0, look = 0;
    pivot.copy(REAR_PIVOT);
    if (act === 'lift' || act === 'juggle' || act === 'dance') {
      rear = w * (act === 'dance' ? 1.12 : 1.02); lift = -.24 * w; look = rear * (act === 'juggle' ? .62 : .78);
    } else if (act === 'ball') {
      lift = (.84 - .1) * w; swayZ = Math.sin(t * 1.6) * .04 * w; swayX = Math.sin(t * 1.1 + 1) * .03 * w; lean = Math.sin(t * 1.6 + 1) * .05 * w;
    } else if (act === 'tumble') {
      // A forward roll every three seconds or so, with a hop at the top of it.
      const s = clamp((((t % 2.8) + 2.8) % 2.8) / 1.05, 0, 1), turning = s < 1;
      pivot.copy(ROLL_PIVOT);
      rear = -Math.PI * 2 * THREE.MathUtils.smoothstep(s, 0, 1) * w; lift = Math.sin(Math.PI * s) * .2 * w;
      tuck = turning ? Math.sqrt(Math.sin(Math.PI * s)) * w : 0;
    }
    // Elle turns while she dances and, when she stops, finishes the turn she is in (or goes back to
    // the start of it, whichever is nearer) rather than unwinding every turn she made.
    if (act === 'dance' && performing) spin = (spin + dt * 1.3) % (Math.PI * 2);
    else spin = lerp(spin, spin > Math.PI ? Math.PI * 2 : 0, 1 - Math.exp(-4 * dt));
    body.rotation.order = 'YXZ';
    body.rotation.set(-rear, act === 'dance' ? spin : 0, 0);
    offset.copy(pivot).applyEuler(body.rotation);
    body.position.set(pivot.x - offset.x + swayX, pivot.y - offset.y + lift, pivot.z - offset.z + swayZ);
    rotate(spine, 0, 0, lean); rotate(neck, neckX * (1 - w) + look + breath * .006, 0, 0);
    rotate(head, headX * (1 - w) + (act === 'juggle' ? -.18 * w : 0), 0, 0); rotate(jaw, act === 'dance' || act === 'juggle' ? .05 * w : jawX);
    rotate(tail, 0, Math.sin(t * 3) * .12 * w);
    for (let i = 0; i < 4; i++) {
      const fore = i < 2, side = i % 2 ? 1 : -1, hip = legs[i].position;
      // The paw's place on the ground (or on the ball) in the facing frame, then into the tilted body.
      const step = act === 'ball' ? Math.max(0, Math.sin(t * 3.2 + i * 1.7)) * .06 * w
        : act === 'dance' && !fore ? Math.max(0, Math.sin(t * 4 + i * Math.PI)) * .05 * w : 0;
      const groundX = act === 'ball' ? side * .2 : hip.x, floor = act === 'ball' ? .84 * w : 0;
      const groundZ = act === 'ball' ? (fore ? .12 : -.2) : hip.z + (!fore && rear > 0 ? .1 * w : 0);
      aim.set(groundX - pivot.x - swayX, .11 + step + floor - pivot.y - lift, groundZ - pivot.z - swayZ).applyAxisAngle(X_AXIS, rear).add(pivot);
      let raised = 0;
      if (fore && (act === 'lift' || act === 'juggle' || act === 'dance')) {
        if (act === 'lift') {
          const press = (1 - Math.cos(t * 2.4)) / 2;
          arm.set(side * lerp(.48, .3, press), lerp(1.17, 1.38, press), lerp(.9, 1.24, press));
        } else if (act === 'juggle') {
          const bob = Math.sin(t * Math.PI * 2 / .75 + (side > 0 ? Math.PI : 0)) * .07;
          arm.set(side * .28, .3 + .52 * bob, .8 + .85 * bob);
        } else arm.set(side * (.73 + Math.sin(t * 2 + i) * .05), 1.09 + Math.sin(t * 2.6) * .06, 1.09);
        aim.lerp(arm, w); raised = w;
      }
      if (tuck > 0) { tucked.set(side * .3, .55, fore ? .38 : -.35); aim.lerp(tucked, tuck); }
      const targetY = aim.y - hip.y, z = aim.z - hip.z;
      const distance = clamp(Math.hypot(targetY, z), .08, .7999);
      const bend = Math.acos(distance / .8), direction = Math.atan2(-z, -targetY);
      const upper = direction + (fore ? bend : -bend), lower = (fore ? -2 : 2) * bend;
      // Ball feet come in under the body; a hand in the air is spread a little for balance.
      const splay = act === 'ball' ? -side * .2 * w : raised ? Math.atan2(aim.x - hip.x, 1) * .5 : 0;
      rotate(legs[i], upper, 0, splay); rotate(knees[i], lower);
      // A paw on the ground stays flat to it however far the body has reared; the roll leaves them tucked.
      const flat = act === 'tumble' ? 0 : rear;
      rotate(paws[i], (-upper - lower + flat) * (1 - raised) + (-upper - lower) * .4 * raised);
    }
    const shown = w > .6;
    for (const prop of props) prop.visible = shown;
    if (ball) {
      ball.visible = w > .01; ball.scale.setScalar(BALL * w); ball.position.set(0, BALL * w, 0);
      ball.rotation.x = Math.sin(t * 1.6) * .6; ball.rotation.z = Math.sin(t * 1.1) * .2;
    }
    if (shown && (barbell || juggled.length)) {
      // The props go where the front paws actually are this frame.
      group.updateMatrixWorld(true);
      group.worldToLocal(paws[0].getWorldPosition(leftPaw)); group.worldToLocal(paws[1].getWorldPosition(rightPaw));
      if (barbell) {
        barbell.position.copy(leftPaw).add(rightPaw).multiplyScalar(.5); barbell.position.y += .06;
        barbell.rotation.set(0, -Math.atan2(rightPaw.z - leftPaw.z, rightPaw.x - leftPaw.x), Math.atan2(rightPaw.y - leftPaw.y, rightPaw.x - leftPaw.x));
      }
      juggled.forEach((one, k) => {
        const u = ((t / 1.5 + k / 3) % 1 + 1) % 1, across = u < .5, s = across ? u / .5 : (u - .5) / .5;
        const from = across ? leftPaw : rightPaw, to = across ? rightPaw : leftPaw;
        one.position.copy(from).lerp(to, s); one.position.y += .1 + 4 * (across ? .78 : .3) * s * (1 - s);
      });
    }
  }
  animate(0);
  return { group, animate, seat, act,
    /** How far into its act the bear is, 0 to 1 (for tests and reviews). A function, not a getter: the
     * corpse view copies an actor's fields onto the one it lays down. */
    performance: () => show,
    seatPosition(target = new THREE.Vector3()) { return seat.getWorldPosition(target); },
    riderPosition(target = new THREE.Vector3()) { seat.getWorldPosition(target); target.y -= .58; return target; },
    setWeapon: () => false, setShield: () => {}, setArmed: () => {} };
}

/** Bodhi as the Stealth lesson first drew the cub: a larger head in proportion and the same grounded bear rig. */
export function createBearCub() { return createKaylaBear({ cub: true }); }

/** A member of the circus family by look: kayla, michael, ava, elle or bodhi. `props: false` for one who will not perform. */
export function createCircusBear(look, { props = true } = {}) {
  if (!CIRCUS_BEAR_LOOKS[look]) throw new Error(`No circus bear called ${look}`);
  return createKaylaBear({ look, props });
}

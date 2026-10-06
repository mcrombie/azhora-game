import * as THREE from 'three';

// A six-limbed dragon, built in the same faceted, metre-scale language as the
// countryside. +Z is forward; the origin is the ground beneath its shoulders.
const sphere = new THREE.IcosahedronGeometry(1, 1);
const cylinder = new THREE.CylinderGeometry(1, 1, 1, 7);
const taper = new THREE.CylinderGeometry(.52, 1, 1, 7);
const cone = new THREE.ConeGeometry(1, 1, 7);
const box = new THREE.BoxGeometry(1, 1, 1);
const up = new THREE.Vector3(0, 1, 0);
const material = (color, extra = {}) => new THREE.MeshStandardMaterial({
  color, roughness: .82, flatShading: true, ...extra,
});

function mesh(parent, geometry, surface, position, scale = [1, 1, 1], name = '') {
  const object = new THREE.Mesh(geometry, surface);
  object.position.fromArray(position); object.scale.fromArray(scale);
  object.name = name; object.castShadow = true; object.receiveShadow = true;
  parent.add(object); return object;
}

function bone(parent, from, to, width, surface, geometry = taper, name = '') {
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
  const object = mesh(parent, geometry, surface, a.clone().add(b).multiplyScalar(.5).toArray(), [width, a.distanceTo(b), width], name);
  object.quaternion.setFromUnitVectors(up, b.sub(a).normalize()); return object;
}

// Actual triangular membrane panels, with a shallow ridge catching the light.
// The edge follows the fingers and dips between them rather than filling a box.
function web(parent, surface, hub, edge, name) {
  const positions = [];
  for (let i = 0; i < edge.length - 1; i++) {
    const a = edge[i], b = edge[i + 1];
    const hubVector = new THREE.Vector3(...hub);
    if (new THREE.Vector3(...a).sub(hubVector).cross(new THREE.Vector3(...b).sub(hubVector)).lengthSq() < 1e-10) continue;
    const ridge = [(hub[0] + a[0] + b[0]) / 3, (hub[1] + a[1] + b[1]) / 3 + .045, (hub[2] + a[2] + b[2]) / 3];
    for (const [p, q] of [[hub, a], [a, b], [b, hub]]) positions.push(...p, ...q, ...ridge);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return mesh(parent, geometry, surface, [0, 0, 0], [1, 1, 1], name);
}

// Elliptical rings make a continuous neck and torso, with pale ventral scales.
function hideGeometry(rings, green, belly) {
  const vertices = [], colors = [], indices = [], sides = 10;
  for (const [z, y, rx, ry] of rings) {
    for (let i = 0; i < sides; i++) {
      const angle = i * Math.PI * 2 / sides, vertical = Math.cos(angle);
      vertices.push(Math.sin(angle) * rx, y + vertical * ry, z);
      const tint = green.clone().lerp(belly, vertical < -.3 ? .94 : vertical < .2 ? .14 : 0);
      colors.push(tint.r, tint.g, tint.b);
    }
  }
  for (let r = 0; r < rings.length - 1; r++) {
    for (let i = 0; i < sides; i++) {
      const a = r * sides + i, b = r * sides + (i + 1) % sides;
      indices.push(a, a + sides, b, b, a + sides, b + sides);
    }
  }
  // Both ends are closed, including the narrow nose.
  for (let i = 1; i < sides - 1; i++) {
    indices.push(0, i, i + 1);
    const last = (rings.length - 1) * sides;
    indices.push(last, last + i + 1, last + i);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals(); return geometry;
}

export const DEVELOPER_DRAGON_SEAT_HEIGHT = 1.93;
export const DEVELOPER_DRAGON_WINGSPAN = 8.16;

/** Pure Three.js: a green flying mount, including the seated player's feet origin. */
export function createDeveloperDragon() {
  const group = new THREE.Group(); group.name = 'Developer green dragon';
  const rig = new THREE.Group(); rig.name = 'Dragon body rig'; group.add(rig);
  const emerald = material(0x39895a), jade = material(0x65a96a), dark = material(0x245c40);
  const belly = material(0xb8ca80), horn = material(0xdad6ab), mouth = material(0x23332a);
  const wingSurface = material(0x83bd70, { side: THREE.DoubleSide, roughness: .91 });
  const wingInner = material(0x68aa63, { side: THREE.DoubleSide, roughness: .91 });
  const leather = material(0x67432b), leatherEdge = material(0xa87945), buckle = material(0xc4b079, { metalness: .2 });
  const amber = material(0xf3bd4f, { roughness: .36, emissive: 0x69400c, emissiveIntensity: .22 });
  const black = material(0x162820, { roughness: .3 });
  const paintedHide = material(0xffffff, { vertexColors: true });
  const torso = mesh(rig, hideGeometry([
    [-1.43, 1.1, .22, .27], [-1.1, 1.19, .4, .41], [-.65, 1.28, .55, .53],
    [.04, 1.34, .56, .55], [.62, 1.4, .41, .46], [.93, 1.52, .29, .33],
    [1.23, 1.72, .23, .28], [1.51, 1.83, .22, .25],
  ], new THREE.Color(0x39895a), new THREE.Color(0xb8ca80)), paintedHide, [0, 0, 0], [1, 1, 1], 'Emerald body and pale belly');

  // Overlapping plates along the throat make its upward sweep readable in profile.
  for (let i = 0; i < 4; i++) {
    const plate = mesh(rig, sphere, belly, [0, 1.01 + i * .155, .63 + i * .20], [.29 - i * .027, .10, .16]);
    plate.rotation.x = -.45;
  }
  for (const side of [-1, 1]) {
    mesh(rig, sphere, jade, [side * .45, 1.46, .41], [.20, .26, .32], 'Shoulder scales');
    mesh(rig, sphere, emerald, [side * .37, 1.21, -.92], [.26, .29, .36], 'Hind haunch');
  }
  for (const [z, y, height] of [[-1.23, 1.46, .19], [-.94, 1.66, .2], [.87, 1.83, .22], [1.13, 1.98, .23]]) {
    const spine = mesh(rig, cone, jade, [0, y + height / 2, z], [.105, height, .15], 'Dorsal crest');
    spine.rotation.x = -.35;
  }

  const head = new THREE.Group(); head.name = 'Dragon head'; head.position.set(0, 1.87, 1.5); rig.add(head);
  mesh(head, hideGeometry([
    [-.31, 0, .23, .24], [-.04, .065, .32, .28], [.22, -.01, .275, .20],
    [.56, -.055, .21, .145], [.79, -.04, .17, .12],
  ], new THREE.Color(0x4b9c63), new THREE.Color(0xb8ca80)), paintedHide, [0, 0, 0], [1, 1, 1], 'Long dragon snout');
  mesh(head, sphere, mouth, [0, -.166, .43], [.207, .058, .33], 'Dark upper palate');
  const jaw = new THREE.Group(); jaw.name = 'Articulated dragon jaw';
  jaw.position.set(0,-.145,.08); head.add(jaw);
  mesh(jaw,sphere,belly,[0,-.036,.32],[.207,.058,.36],'Lower jaw');
  mesh(jaw,sphere,mouth,[0,.006,.33],[.184,.020,.30],'Lower mouth interior');
  const fireSurface = new THREE.MeshBasicMaterial({color:0xff9b20,transparent:true,opacity:0,
    blending:THREE.AdditiveBlending,depthWrite:false});
  const throatGlow=mesh(head,sphere,fireSurface,[0,-.205,.51],[.174,.086,.23],'Dragon mouth fire glow');
  throatGlow.castShadow=false; throatGlow.receiveShadow=false; throatGlow.visible=false;
  const mouthAnchor=new THREE.Group(); mouthAnchor.name='Dragon fire mouth';
  mouthAnchor.position.set(0,-.20,.84); head.add(mouthAnchor);
  for (const side of [-1, 1]) {
    mesh(head, sphere, dark, [side * .264, .1, .13], [.068, .10, .12], 'Eye socket');
    mesh(head, sphere, amber, [side * .294, .111, .155], [.038, .073, .08], 'Amber eye');
    mesh(head, sphere, black, [side * .325, .116, .177], [.011, .057, .025], 'Slit pupil');
    const brow = mesh(head, sphere, jade, [side * .266, .188, .145], [.072, .044, .137], 'Heavy brow');
    brow.rotation.x = -.2;
    mesh(head, sphere, dark, [side * .135, .025, .729], [.033, .027, .048], 'Nostril');
    bone(head, [side * .22, .22, -.14], [side * .33, .49, -.32], .102, dark, taper, 'Horn root');
    bone(head, [side * .33, .47, -.3], [side * .37, .73, -.65], .075, horn, cone, 'Swept ivory horn');
    bone(head, [side * .26, -.08, -.05], [side * .49, .01, -.38], .09, jade, cone, 'Cheek spike');
    bone(head, [side * .174, -.126, .48], [side * .178, -.206, .49], .023, horn, cone, 'Small fang');
  }
  mesh(head, sphere, jade, [0, .218, -.026], [.09, .063, .23], 'Brow ridge');

  const wings = [], wingTips = [], wingMembranes = [], wingFingerBones = [];
  for (const side of [-1, 1]) {
    const label = side < 0 ? 'Left' : 'Right';
    const shoulder = new THREE.Group(); shoulder.name = `${label} wing shoulder`;
    shoulder.position.set(side * .48, 1.64, .47); rig.add(shoulder); wings.push(shoulder);
    const mirror = ([x, y, z]) => [side * x, y, z];
    const elbow = mirror([.91, .09, .12]), wristPosition = mirror([1.62, .15, .39]);
    mesh(shoulder, sphere, emerald, [0, 0, 0], [.18, .18, .23]);
    bone(shoulder, [0, 0, 0], elbow, .115, emerald, taper, `${label} wing upper arm`);
    mesh(shoulder, sphere, jade, elbow, [.115, .115, .115]);
    bone(shoulder, elbow, wristPosition, .076, emerald, taper, `${label} wing forearm`);
    wingMembranes.push(web(shoulder, wingInner, mirror([.91, .08, -.31]), [
      [0, -.06, -.07], elbow, wristPosition, mirror([.82, .02, -1.24]), [0, -.18, -1.07], [0, -.06, -.07],
    ], `${label} inner wing membrane`));

    const wrist = new THREE.Group(); wrist.name = `${label} articulated wing wrist`;
    wrist.position.fromArray(wristPosition); shoulder.add(wrist); wingTips.push(wrist);
    mesh(wrist, sphere, jade, [0, 0, 0], [.092, .092, .092]);
    bone(wrist, [0, 0, .01], mirror([.10, .15, .19]), .043, horn, cone, `${label} thumb claw`);
    const tips = [[1.98, -.015, -.41], [1.60, -.08, -1.15], [.98, -.13, -1.74], [.18, -.17, -1.85]];
    const edge = [[0, 0, 0], [.96, .04, -.035], tips[0], [1.55, -.095, -.68], tips[1],
      [1.03, -.15, -1.25], tips[2], [.41, -.20, -1.43], tips[3], [-.32, -.21, -1.35], [-.80, -.13, -1.63]];
    wingMembranes.push(web(wrist, wingSurface, [0, 0, 0], edge.map(mirror), `${label} scalloped flight membrane`));
    for (const [i, tip] of tips.entries()) {
      const knuckle = [tip[0] * .52, .06 + tip[1] * .35, tip[2] * .43];
      wingFingerBones.push(bone(wrist, [0, 0, 0], mirror(knuckle), i ? .031 : .049, emerald, taper, `${label} wing finger ${i + 1}`));
      wingFingerBones.push(bone(wrist, mirror(knuckle), mirror(tip), i ? .022 : .033, jade, taper, `${label} wing fingertip ${i + 1}`));
    }
  }

  const legs = [], legJoints = [];
  for (const front of [true, false]) {
    for (const side of [-1, 1]) {
      const leg = new THREE.Group(); leg.name = `${side < 0 ? 'Left' : 'Right'} ${front ? 'foreleg' : 'hind leg'}`;
      leg.position.set(side * (front ? .43 : .38), front ? 1.23 : 1.11, front ? .60 : -.95); rig.add(leg); legs.push(leg);
      const kneePosition = [side * .10, front ? -.48 : -.39, front ? .025 : -.17];
      bone(leg, [0, 0, 0], kneePosition, front ? .135 : .175, emerald);
      const knee = new THREE.Group(); knee.position.fromArray(kneePosition); leg.add(knee); legJoints.push(knee);
      mesh(knee, sphere, jade, [0, 0, 0], [.115, .13, .12]);
      const ankle = [side * .005, front ? -.55 : -.52, front ? .13 : .25];
      bone(knee, [0, 0, 0], ankle, .092, emerald);
      mesh(knee, sphere, dark, [ankle[0], ankle[1] - .065, ankle[2] + .065], [.135, .09, .19], 'Dragon foot');
      for (const toe of [-1, 0, 1]) {
        bone(knee, [toe * .077, ankle[1] - .045, ankle[2] + .15], [toe * .085, ankle[1] - .095, ankle[2] + .29], .032, horn, cone, 'Ivory talon');
      }
    }
  }

  const tail = [];
  let tailParent = rig;
  const tailLengths = [.52, .48, .43, .38, .33, .28];
  for (const [i, length] of tailLengths.entries()) {
    const joint = new THREE.Group(); joint.name = `Tail joint ${i + 1}`;
    joint.position.set(0, i ? -.026 : 1.12, i ? -tailLengths[i - 1] : -1.32);
    tailParent.add(joint); tail.push(joint); tailParent = joint;
    const radius = .22 * (1 - i / 6) + .018;
    bone(joint, [0, 0, .04], [0, -.026, -length], radius, i % 2 ? jade : emerald, taper, 'Tapered tail');
    const spine = mesh(joint, cone, jade, [0, radius + .035, -length * .46], [.063 * (1 - i / 8), .14 - i * .012, .11]);
    spine.rotation.x = -.3;
  }
  web(tailParent, wingInner, [0, .015, -.24], [[0, .015, -.09], [-.23, .015, -.35], [0, .07, -.58], [.23, .015, -.35], [0, .015, -.09]], 'Leaf-shaped tail tip');

  const passengerSeat = new THREE.Group(); passengerSeat.name = 'Dragon saddle contact';
  passengerSeat.position.set(0, DEVELOPER_DRAGON_SEAT_HEIGHT, .16); rig.add(passengerSeat);
  mesh(passengerSeat, sphere, leatherEdge, [0, -.078, 0], [.385, .088, .42], 'Saddle blanket');
  mesh(passengerSeat, sphere, leather, [0, -.038, 0], [.31, .043, .34], 'Leather saddle');
  mesh(passengerSeat, sphere, leatherEdge, [0, .037, -.3], [.31, .092, .065], 'Saddle cantle');
  mesh(passengerSeat, sphere, leatherEdge, [0, .035, .285], [.23, .07, .057], 'Saddle pommel');
  for (const side of [-1, 1]) {
    bone(passengerSeat, [side * .29, -.035, .12], [side * .44, -.49, .1], .023, leather, cylinder, 'Stirrup leather');
    mesh(passengerSeat, box, buckle, [side * .44, -.5, .1], [.13, .028, .115], 'Stirrup');
    bone(rig, [side * .34, 1.85, -.16], [side * .565, 1.16, -.16], .032, leather, cylinder, 'Saddle girth');
  }
  const passengerAnchor = new THREE.Group(); passengerAnchor.name = 'Dragon passenger feet origin';
  // The character's riding animation puts the hips .566m above its feet-root.
  passengerAnchor.position.y = -.57; passengerSeat.add(passengerAnchor);

  function update(seconds, { flying = false, speed = 0, bank = 0,
    breathing = false, breathIntensity = 1, breathPitch = .28 } = {}) {
    const fire=breathing?THREE.MathUtils.clamp(Number.isFinite(breathIntensity)?breathIntensity:0,0,1):0;
    const phase = seconds * (3.2 + THREE.MathUtils.clamp(speed, 0, 35) * .018);
    const stroke = Math.sin(phase), breath = Math.sin(seconds * 1.15);
    rig.position.y = flying ? Math.sin(phase - .6) * .025 : breath * .008;
    rig.rotation.set(flying ? -.035 + stroke * .012 : 0, 0, flying ? THREE.MathUtils.clamp(bank, -.34, .34) : 0);
    passengerSeat.quaternion.copy(rig.quaternion).invert();
    const restingPitch=flying?-.025+Math.sin(phase-.8)*.015:breath*.018;
    head.rotation.set(restingPitch*(1-fire)+THREE.MathUtils.clamp(Number.isFinite(breathPitch)?breathPitch:.28,0,1.1)*fire,
      (flying?0:Math.sin(seconds*.39)*.055)*(1-fire),0);
    jaw.rotation.x=fire*(.72+Math.sin(seconds*13)*.035);
    mouthAnchor.position.y=-.20-fire*.065;
    throatGlow.visible=fire>0;
    fireSurface.opacity=fire*(.78+Math.sin(seconds*21)*.12);
    throatGlow.scale.set(.174*(1+fire*.12),.086+fire*.062,.23);
    amber.emissiveIntensity=.22+fire*.8;
    for (let i = 0; i < wings.length; i++) {
      const side = i ? 1 : -1;
      wings[i].rotation.set(flying ? -.035 : -.06, side * (flying ? -.025 : .87), side * (flying ? .09 + stroke * .36 : .91));
      wingTips[i].rotation.set(flying ? Math.cos(phase - .5) * .045 : -.07, side * (flying ? -.03 : 1.26), side * (flying ? .015 + Math.sin(phase - .65) * .14 : -.40));
    }
    for (let i = 0; i < tail.length; i++) {
      tail[i].rotation.y = Math.sin(seconds * 1.55 - i * .55) * (flying ? .075 : .045) + (flying ? bank * -.09 : 0);
      tail[i].rotation.x = (flying ? -.026 : .018) + Math.sin(seconds * 1.8 - i * .52) * .016;
    }
    for (let i = 0; i < legs.length; i++) {
      const front = i < 2;
      legs[i].rotation.x = flying ? (front ? .94 : .61) + Math.sin(phase - .2) * .022 : 0;
      legJoints[i].rotation.x = flying ? (front ? -1.42 : -1.20) : 0;
    }
  }
  function animate(seconds, speed = 0, grounded = true, pose = {}) {
    update(seconds, { ...pose, flying: pose.flying ?? !grounded, speed, bank: pose.bank ?? 0 });
  }
  function mouthWorldPosition(out=new THREE.Vector3()) {
    mouthAnchor.updateWorldMatrix(true,false); return out.setFromMatrixPosition(mouthAnchor.matrixWorld);
  }
  function mouthWorldDirection(out=new THREE.Vector3()) {
    mouthAnchor.updateWorldMatrix(true,false); return out.set(0,0,1).transformDirection(mouthAnchor.matrixWorld);
  }
  update(0);
  return { group, rig, torso, head, jaw, throatGlow, mouthAnchor, mouthWorldPosition, mouthWorldDirection,
    wings, wingTips, wingMembranes, wingFingerBones, tail, legs, legJoints, passengerSeat, passengerAnchor, update, animate };
}
